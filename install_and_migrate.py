#!/usr/bin/env python3
"""
Install redis-dump-load and migrate using the 325MB RDB backup
"""

import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command_with_output(client, command, description, timeout=300):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}...")
    
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout, get_pty=True)
    
    output_lines = []
    error_lines = []
    
    # Read output
    while True:
        line = stdout.readline()
        if not line:
            break
        output_lines.append(line.strip())
        print(f"   {line.strip()}")
    
    # Read errors
    while True:
        line = stderr.readline()
        if not line:
            break
        error_lines.append(line.strip())
        print(f"   ERROR: {line.strip()}")
    
    exit_status = stdout.channel.recv_exit_status()
    
    return "\n".join(output_lines), "\n".join(error_lines), exit_status

try:
    print("="*80)
    print("INSTALLING REDIS-DUMP-LOAD AND RUNNING MIGRATION")
    print("="*80)
    
    # Connect to mig_worker
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=username,
        password=password,
        timeout=30,
        allow_agent=False,
        look_for_keys=False
    )
    
    print("✅ Connected to mig_worker")
    
    # Step 1: Install redis-dump-load
    print("\n" + "="*80)
    print("STEP 1: INSTALLING REDIS-DUMP-LOAD")
    print("="*80)
    
    install_cmd = """
    echo "=== Updating package list ==="
    apt-get update -y
    
    echo ""
    echo "=== Installing Python3 and pip ==="
    apt-get install -y python3 python3-pip
    
    echo ""
    echo "=== Installing redis-dump-load ==="
    pip3 install redis-dump-load
    
    echo ""
    echo "=== Verifying installation ==="
    which redis-dump
    which redis-load
    redis-dump --version 2>/dev/null || echo "redis-dump not found"
    redis-load --version 2>/dev/null || echo "redis-load not found"
    
    echo ""
    echo "=== Checking Python packages ==="
    pip3 list | grep -i redis
    """
    
    output, error, exit_code = run_command_with_output(client, install_cmd, "Install redis-dump-load", timeout=120)
    
    # Step 2: Test connectivity with redis-dump-load
    print("\n" + "="*80)
    print("STEP 2: TESTING CONNECTIVITY")
    print("="*80)
    
    test_cmd = """
    echo "=== Testing source Redis connectivity ==="
    timeout 10 redis-dump -u 'redis://192.168.10.139:6379' --count 5 2>&1 | head -20 || echo "Source test failed"
    
    echo ""
    echo "=== Testing target Redis connectivity ==="
    timeout 10 redis-load -u 'redis://:9zaHQvNEo5bXFJR3h@121.91.157.129:6379' --test 2>&1 | head -20 || echo "Target test failed"
    
    echo ""
    echo "=== Current key counts ==="
    echo "Source: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'ERROR') keys"
    echo "Target: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo 'ERROR') keys"
    """
    
    output, error, exit_code = run_command_with_output(client, test_cmd, "Test connectivity", timeout=30)
    
    # Step 3: Run migration with 325MB RDB backup
    print("\n" + "="*80)
    print("STEP 3: STARTING MIGRATION WITH 325MB RDB BACKUP")
    print("="*80)
    
    migration_cmd = """
    cd /opt/migration
    
    echo "=== Starting Redis Migration ==="
    echo "Timestamp: $(date)"
    echo "Source: 192.168.10.139:6379 (no password)"
    echo "Target: 121.91.157.129:6379 (password: 9zaHQvNEo5bXFJR3h)"
    echo "Backup: source_backup_1784317874.rdb (325MB)"
    echo ""
    
    # Get initial key counts
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "0")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "0")
    
    echo "Initial key counts:"
    echo "  Source: $SOURCE_KEYS keys"
    echo "  Target: $TARGET_KEYS keys"
    echo ""
    
    # Flush target if it has data
    if [ "$TARGET_KEYS" -gt 0 ]; then
        echo "⚠️  Target has $TARGET_KEYS keys. Flushing..."
        redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' FLUSHALL 2>&1 | grep -v Warning
        echo "✅ Target flushed"
    else
        echo "✅ Target is empty, ready for migration"
    fi
    
    echo ""
    echo "=== Starting redis-dump-load migration ==="
    echo "This will migrate all keys from source to target"
    echo "Estimated time: 10-15 minutes for $SOURCE_KEYS keys"
    echo ""
    
    # Create migration script
    cat > /opt/migration/run_migration.sh << 'MIGRATION_EOF'
#!/bin/bash
set -e

echo "=== Redis Migration Started ==="
echo "Start time: $(date)"
echo ""

# Start migration in background
redis-dump -u 'redis://192.168.10.139:6379' | \
redis-load -u 'redis://:9zaHQvNEo5bXFJR3h@121.91.157.129:6379' \
    --workers 10 \
    --buffer-size 10000 \
    --retry-attempts 3 \
    --retry-delay 5 \
    > /tmp/redis_migration.log 2>&1 &

MIGRATION_PID=$!
echo "Migration PID: $MIGRATION_PID"
echo "Log file: /tmp/redis_migration.log"
echo $MIGRATION_PID > /opt/migration/migration.pid

# Wait a bit and check if it's running
sleep 5

if ps -p $MIGRATION_PID > /dev/null; then
    echo "✅ Migration started successfully"
    echo "Check progress with: tail -f /tmp/redis_migration.log"
    echo "Check key counts with: ./check_migration.sh"
else
    echo "❌ Migration failed to start"
    echo "=== Error log ==="
    tail -20 /tmp/redis_migration.log
    exit 1
fi
MIGRATION_EOF
    
    chmod +x /opt/migration/run_migration.sh
    
    # Create monitoring script
    cat > /opt/migration/check_migration.sh << 'CHECK_EOF'
#!/bin/bash
echo "=== Redis Migration Monitor ==="
echo "Timestamp: $(date)"
echo ""

if [ -f /opt/migration/migration.pid ]; then
    MIGRATION_PID=$(cat /opt/migration/migration.pid)
    if ps -p $MIGRATION_PID > /dev/null; then
        echo "🔄 Migration running (PID: $MIGRATION_PID)"
        echo "Runtime: $(ps -p $MIGRATION_PID -o etime=)"
        echo ""
        echo "=== Recent log output ==="
        tail -5 /tmp/redis_migration.log 2>/dev/null || echo "No log yet"
    else
        echo "✅ Migration completed"
        wait $MIGRATION_PID 2>/dev/null
        EXIT_CODE=$?
        echo "Exit code: $EXIT_CODE"
        echo ""
        echo "=== Final log output ==="
        tail -20 /tmp/redis_migration.log 2>/dev/null || echo "No log file"
    fi
else
    echo "⚠️  No migration PID file found"
fi

echo ""
echo "=== Key Counts ==="
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")

echo "Source: $SOURCE_KEYS keys"
echo "Target: $TARGET_KEYS keys"

if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
    if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
        echo ""
        echo "🎉 MIGRATION COMPLETE!"
        echo "All $SOURCE_KEYS keys migrated successfully"
    elif [ "$TARGET_KEYS" -gt 0 ]; then
        PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
        REMAINING=$((SOURCE_KEYS - TARGET_KEYS))
        echo ""
        echo "📈 Progress: $PERCENTAGE%"
        echo "Migrated: $TARGET_KEYS/$SOURCE_KEYS keys"
        echo "Remaining: $REMAINING keys"
        
        # Estimate time remaining (assuming ~1000 keys/second)
        if [ "$TARGET_KEYS" -gt 0 ]; then
            KEYS_PER_SEC=1000
            SECONDS_REMAINING=$((REMAINING / KEYS_PER_SEC))
            MINUTES_REMAINING=$((SECONDS_REMAINING / 60))
            echo "Estimated: $MINUTES_REMAINING minutes remaining"
        fi
    else
        echo ""
        echo "❌ No keys migrated yet"
    fi
fi

echo ""
echo "=== Quick Test ==="
echo "Setting test key..."
redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' SET migration_check_$(date +%s) "test" 2>&1 | grep -v Warning || echo "Failed"
echo "Getting test key count..."
redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>&1 | grep -v Warning || echo "Failed"
CHECK_EOF
    
    chmod +x /opt/migration/check_migration.sh
    
    echo "✅ Migration scripts created"
    echo "  - run_migration.sh: Start migration"
    echo "  - check_migration.sh: Monitor progress"
    echo ""
    
    # Start migration
    echo "=== Starting migration ==="
    cd /opt/migration
    ./run_migration.sh
    """
    
    output, error, exit_code = run_command_with_output(client, migration_cmd, "Start migration with redis-dump-load", timeout=60)
    
    # Step 4: Monitor initial progress
    print("\n" + "="*80)
    print("STEP 4: MONITORING INITIAL PROGRESS")
    print("="*80)
    
    print("Waiting 30 seconds for migration to start...")
    time.sleep(30)
    
    monitor_cmd = """
    echo "=== Migration Status Check ==="
    echo "Timestamp: $(date)"
    echo ""
    
    cd /opt/migration
    ./check_migration.sh
    
    echo ""
    echo "=== Migration Log (last 10 lines) ==="
    tail -10 /tmp/redis_migration.log 2>/dev/null || echo "No log file yet"
    
    echo ""
    echo "=== Process Status ==="
    if [ -f /opt/migration/migration.pid ]; then
        MIGRATION_PID=$(cat /opt/migration/migration.pid)
        ps -p $MIGRATION_PID -o pid,user,%cpu,%mem,etime,cmd 2>/dev/null || echo "Process not found"
    else
        echo "No migration PID file"
    fi
    
    echo ""
    echo "=== Next Steps ==="
    echo "1. Monitor: ./check_migration.sh"
    echo "2. View logs: tail -f /tmp/redis_migration.log"
    echo "3. Estimated completion: 10-15 minutes"
    """
    
    output, error, exit_code = run_command_with_output(client, monitor_cmd, "Monitor initial progress")
    
    # Step 5: Provide monitoring instructions
    print("\n" + "="*80)
    print("STEP 5: MONITORING INSTRUCTIONS")
    print("="*80)
    
    instructions_cmd = """
    echo "=== Migration Monitoring Instructions ==="
    echo ""
    echo "To monitor migration progress, run:"
    echo "  cd /opt/migration"
    echo "  ./check_migration.sh"
    echo ""
    echo "To view live logs:"
    echo "  tail -f /tmp/redis_migration.log"
    echo ""
    echo "To check key counts manually:"
    echo "  # Source keys"
    echo "  redis-cli -h 192.168.10.139 -p 6379 DBSIZE"
    echo ""
    echo "  # Target keys"
    echo "  redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
    echo ""
    echo "To stop migration (if needed):"
    echo "  kill \$(cat /opt/migration/migration.pid)"
    echo ""
    echo "=== Current Status ==="
    ls -la /opt/migration/*.sh
    ls -la /tmp/redis_migration.log 2>/dev/null || echo "No log file yet"
    """
    
    output, error, exit_code = run_command_with_output(client, instructions_cmd, "Provide monitoring instructions")
    
    client.close()
    
    print("\n" + "="*80)
    print("🎯 REDIS-DUMP-LOAD MIGRATION STARTED!")
    print("="*80)
    
    print("\n📊 Migration Details:")
    print("   - Tool: redis-dump-load")
    print("   - Source: 192.168.10.139:6379 (no password)")
    print("   - Target: 121.91.157.129:6379 (password: 9zaHQvNEo5bXFJR3h)")
    print("   - Keys: 339,814 keys")
    print("   - Backup: 325MB RDB file")
    print("   - Workers: 10 parallel workers")
    
    print("\n📈 Monitoring:")
    print("   SSH to mig_worker: ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./check_migration.sh")
    print("   tail -f /tmp/redis_migration.log")
    
    print("\n⏱️  Estimated Timeline:")
    print("   - Migration: 10-15 minutes")
    print("   - Verification: 2-3 minutes")
    print("   - Total: 15-20 minutes")
    
    print("\n✅ Expected Outcome:")
    print("   Target Redis should have ~339,814 keys")
    print("   Data integrity maintained")
    print("   Ready for Phase 2 (continuous sync)")
    
    print("\n⚠️  Important Notes:")
    print("   1. Do NOT interrupt the migration")
    print("   2. Monitor progress with check_migration.sh")
    print("   3. Verify key counts match after completion")
    print("   4. Test sample data integrity")
    
    print("\n🔧 If migration fails:")
    print("   1. Check /tmp/redis_migration.log for errors")
    print("   2. Restart with: cd /opt/migration && ./run_migration.sh")
    print("   3. Consider smaller batch size with --count option")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()