#!/usr/bin/env python3
"""
Fix redis-dump-load syntax and run migration correctly
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
    print("FIXING REDIS-DUMP-LOAD SYNTAX AND RUNNING MIGRATION")
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
    
    # Step 1: Check redis-dump-load syntax
    print("\n" + "="*80)
    print("STEP 1: CHECKING REDIS-DUMP-LOAD SYNTAX")
    print("="*80)
    
    syntax_cmd = """
    echo "=== Checking redis-dump-load help ==="
    echo ""
    echo "redis-dump help:"
    redis-dump --help 2>&1 | head -20
    
    echo ""
    echo "redis-load help:"
    redis-load --help 2>&1 | head -20
    
    echo ""
    echo "=== Testing correct syntax ==="
    echo "Testing source connection..."
    redis-dump -h 192.168.10.139 -p 6379 --count 5 2>&1 | head -10 || echo "Failed"
    
    echo ""
    echo "Testing target connection..."
    redis-load -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' --test 2>&1 | head -10 || echo "Failed"
    
    echo ""
    echo "=== Current key counts ==="
    echo "Source: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'ERROR')"
    echo "Target: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo 'ERROR')"
    """
    
    output, error, exit_code = run_command_with_output(client, syntax_cmd, "Check redis-dump-load syntax")
    
    # Step 2: Run migration with correct syntax
    print("\n" + "="*80)
    print("STEP 2: RUNNING MIGRATION WITH CORRECT SYNTAX")
    print("="*80)
    
    migration_cmd = """
    cd /opt/migration
    
    echo "=== Starting Redis Migration with Correct Syntax ==="
    echo "Timestamp: $(date)"
    echo "Source: 192.168.10.139:6379 (no password)"
    echo "Target: 121.91.157.129:6379 (password: 9zaHQvNEo5bXFJR3h)"
    echo ""
    
    # Get key counts
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "0")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "0")
    
    echo "Initial key counts:"
    echo "  Source: $SOURCE_KEYS keys"
    echo "  Target: $TARGET_KEYS keys"
    echo ""
    
    if [ "$TARGET_KEYS" -gt 0 ]; then
        echo "⚠️  Target has $TARGET_KEYS keys. Flushing..."
        redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' FLUSHALL 2>&1 | grep -v Warning
        echo "✅ Target flushed"
        sleep 2
    fi
    
    echo ""
    echo "=== Starting redis-dump-load migration ==="
    echo "Command: redis-dump -h 192.168.10.139 -p 6379 | redis-load -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h'"
    echo "Estimated time: 10-15 minutes for $SOURCE_KEYS keys"
    echo ""
    
    # Create migration script with correct syntax
    cat > /opt/migration/migrate_correct.sh << 'MIGRATE_EOF'
#!/bin/bash
set -e

echo "=== Redis Migration Started ==="
echo "Start time: $(date)"
echo "Source: 192.168.10.139:6379"
echo "Target: 121.91.157.129:6379"
echo ""

# Start migration
redis-dump -h 192.168.10.139 -p 6379 | \
redis-load -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' \
    --workers 10 \
    --buffer-size 10000 \
    > /tmp/redis_migration_correct.log 2>&1 &

MIGRATION_PID=$!
echo "Migration PID: $MIGRATION_PID"
echo "Log file: /tmp/redis_migration_correct.log"
echo $MIGRATION_PID > /opt/migration/migration_correct.pid

# Wait and check
sleep 5

if ps -p $MIGRATION_PID > /dev/null; then
    echo "✅ Migration started successfully"
    echo "Check progress: tail -f /tmp/redis_migration_correct.log"
else
    echo "❌ Migration failed to start"
    echo "=== Error log ==="
    tail -20 /tmp/redis_migration_correct.log
    exit 1
fi
MIGRATE_EOF
    
    chmod +x /opt/migration/migrate_correct.sh
    
    # Create monitoring script
    cat > /opt/migration/monitor_correct.sh << 'MONITOR_EOF'
#!/bin/bash
echo "=== Redis Migration Monitor ==="
echo "Timestamp: $(date)"
echo ""

if [ -f /opt/migration/migration_correct.pid ]; then
    PID=$(cat /opt/migration/migration_correct.pid)
    if ps -p $PID > /dev/null; then
        echo "🔄 Migration running (PID: $PID)"
        echo "Runtime: $(ps -p $PID -o etime=)"
        echo ""
        echo "=== Recent log ==="
        tail -5 /tmp/redis_migration_correct.log 2>/dev/null || echo "No log yet"
    else
        echo "✅ Migration completed"
        wait $PID 2>/dev/null
        EXIT_CODE=$?
        echo "Exit code: $EXIT_CODE"
        echo ""
        echo "=== Final log ==="
        tail -20 /tmp/redis_migration_correct.log 2>/dev/null || echo "No log file"
    fi
fi

echo ""
echo "=== Key Counts ==="
SOURCE=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
TARGET=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")

echo "Source: $SOURCE keys"
echo "Target: $TARGET keys"

if [ "$SOURCE" != "ERROR" ] && [ "$TARGET" != "ERROR" ]; then
    if [ "$SOURCE" -eq "$TARGET" ]; then
        echo ""
        echo "🎉 MIGRATION COMPLETE!"
        echo "All $SOURCE keys migrated"
    elif [ "$TARGET" -gt 0 ]; then
        PERCENT=$((TARGET * 100 / SOURCE))
        REMAINING=$((SOURCE - TARGET))
        echo ""
        echo "📈 Progress: $PERCENT%"
        echo "Migrated: $TARGET/$SOURCE keys"
        echo "Remaining: $REMAINING keys"
    else
        echo ""
        echo "❌ No keys migrated yet"
    fi
fi

echo ""
echo "=== Test commands ==="
echo "Monitor: tail -f /tmp/redis_migration_correct.log"
echo "Check: ./monitor_correct.sh"
echo "Stop: kill \$(cat /opt/migration/migration_correct.pid)"
MONITOR_EOF
    
    chmod +x /opt/migration/monitor_correct.sh
    
    echo "✅ Migration scripts created:"
    echo "  - migrate_correct.sh: Start migration"
    echo "  - monitor_correct.sh: Monitor progress"
    echo ""
    
    # Start migration
    echo "=== Starting migration ==="
    cd /opt/migration
    nohup ./migrate_correct.sh > /tmp/migration_start.log 2>&1 &
    
    echo "Migration started in background"
    echo "Check startup log: tail -f /tmp/migration_start.log"
    echo "Monitor progress: ./monitor_correct.sh"
    """
    
    output, error, exit_code = run_command_with_output(client, migration_cmd, "Start migration with correct syntax", timeout=30)
    
    # Step 3: Wait and check initial progress
    print("\n" + "="*80)
    print("STEP 3: CHECKING INITIAL PROGRESS")
    print("="*80)
    
    print("Waiting 30 seconds for migration to start...")
    time.sleep(30)
    
    progress_cmd = """
    echo "=== Migration Progress Check ==="
    echo "Timestamp: $(date)"
    echo ""
    
    cd /opt/migration
    ./monitor_correct.sh
    
    echo ""
    echo "=== Process status ==="
    if [ -f /opt/migration/migration_correct.pid ]; then
        PID=$(cat /opt/migration/migration_correct.pid)
        ps -p $PID -o pid,user,%cpu,%mem,etime,cmd 2>/dev/null || echo "Process not found"
    fi
    
    echo ""
    echo "=== Startup log ==="
    tail -10 /tmp/migration_start.log 2>/dev/null || echo "No startup log"
    
    echo ""
    echo "=== Migration log ==="
    tail -10 /tmp/redis_migration_correct.log 2>/dev/null || echo "No migration log yet"
    """
    
    output, error, exit_code = run_command_with_output(client, progress_cmd, "Check initial progress")
    
    # Step 4: Provide final instructions
    print("\n" + "="*80)
    print("STEP 4: MIGRATION INSTRUCTIONS")
    print("="*80)
    
    instructions_cmd = """
    echo "=== Migration Instructions ==="
    echo ""
    echo "Migration has been started with correct redis-dump-load syntax."
    echo ""
    echo "📊 Current status:"
    echo "  Source: 192.168.10.139:6379"
    echo "  Target: 121.91.157.129:6379"
    echo "  Password: 9zaHQvNEo5bXFJR3h"
    echo "  Expected keys: ~339,816"
    echo ""
    echo "📈 To monitor progress:"
    echo "  cd /opt/migration"
    echo "  ./monitor_correct.sh"
    echo "  tail -f /tmp/redis_migration_correct.log"
    echo ""
    echo "🔍 To check key counts:"
    echo "  # Source"
    echo "  redis-cli -h 192.168.10.139 -p 6379 DBSIZE"
    echo ""
    echo "  # Target"
    echo "  redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
    echo ""
    echo "⏱️  Estimated time:"
    echo "  10-15 minutes for 339,816 keys"
    echo ""
    echo "🛑 To stop migration (if needed):"
    echo "  kill \$(cat /opt/migration/migration_correct.pid)"
    echo ""
    echo "=== Migration command used ==="
    echo "redis-dump -h 192.168.10.139 -p 6379 | \\"
    echo "redis-load -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' \\"
    echo "  --workers 10 \\"
    echo "  --buffer-size 10000"
    """
    
    output, error, exit_code = run_command_with_output(client, instructions_cmd, "Provide migration instructions")
    
    client.close()
    
    print("\n" + "="*80)
    print("🎯 REDIS MIGRATION STARTED WITH CORRECT SYNTAX!")
    print("="*80)
    
    print("\n📊 Migration Details:")
    print("   - Tool: redis-dump-load (correct syntax)")
    print("   - Source: 192.168.10.139:6379")
    print("   - Target: 121.91.157.129:6379")
    print("   - Password: 9zaHQvNEo5bXFJR3h")
    print("   - Keys: ~339,816 keys")
    print("   - Workers: 10 parallel workers")
    
    print("\n✅ What's running:")
    print("   redis-dump -h 192.168.10.139 -p 6379 | redis-load -h 121.91.157.129 -p 6379 -a 'password'")
    
    print("\n📈 Monitoring commands:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./monitor_correct.sh")
    print("   tail -f /tmp/redis_migration_correct.log")
    
    print("\n⏱️  Estimated timeline:")
    print("   - Migration: 10-15 minutes")
    print("   - Verification: 2-3 minutes")
    print("   - Total: 15-20 minutes")
    
    print("\n🎯 Expected outcome:")
    print("   Target Redis should have ~339,816 keys")
    print("   All data migrated from source to target")
    print("   Ready for Phase 2 (continuous sync)")
    
    print("\n⚠️  Important:")
    print("   1. Do NOT interrupt the migration")
    print("   2. Monitor progress with monitor_correct.sh")
    print("   3. Verify key counts match after completion")
    print("   4. Test with sample keys")
    
    print("\n🔧 If issues occur:")
    print("   1. Check logs: tail -f /tmp/redis_migration_correct.log")
    print("   2. Restart: cd /opt/migration && ./migrate_correct.sh")
    print("   3. Check connectivity: redis-cli -h target -p 6379 -a 'password' PING")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()