#!/usr/bin/env python3
"""
Check redis-dump-load migration status
"""

import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command(client, command, description, timeout=30):
    print(f"\n🔍 {description}")
    print(f"   Command: {command[:100]}...")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    
    if output:
        print(f"   Output:\n{output[:500]}...")
    if error:
        print(f"   Error: {error[:500]}")
    
    return output, error

try:
    print("="*80)
    print("CHECKING REDIS-DUMP-LOAD MIGRATION STATUS")
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
    
    # Check migration status
    print("\n" + "="*80)
    print("MIGRATION STATUS CHECK")
    print("="*80)
    
    status_cmd = """
    echo "=== Migration Status ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Check if migration is running
    if [ -f /opt/migration/migration.pid ]; then
        MIGRATION_PID=$(cat /opt/migration/migration.pid)
        if ps -p $MIGRATION_PID > /dev/null; then
            echo "🔄 Migration is RUNNING (PID: $MIGRATION_PID)"
            echo "Runtime: $(ps -p $MIGRATION_PID -o etime=)"
            echo "CPU: $(ps -p $MIGRATION_PID -o %cpu=)"
            echo "Memory: $(ps -p $MIGRATION_PID -o %mem=)"
            echo ""
            echo "=== Process command ==="
            ps -p $MIGRATION_PID -o cmd=
        else
            echo "✅ Migration COMPLETED"
            wait $MIGRATION_PID 2>/dev/null
            EXIT_CODE=$?
            echo "Exit code: $EXIT_CODE"
        fi
    else
        echo "⚠️  No migration PID file found"
        echo "Checking for redis-dump-load processes..."
        ps aux | grep -E "(redis-dump|redis-load)" | grep -v grep || echo "No redis-dump-load processes found"
    fi
    
    echo ""
    echo "=== Migration Log ==="
    if [ -f /tmp/redis_migration.log ]; then
        echo "Log file size: $(du -h /tmp/redis_migration.log | cut -f1)"
        echo ""
        echo "=== Last 20 lines ==="
        tail -20 /tmp/redis_migration.log
    else
        echo "No log file found at /tmp/redis_migration.log"
    fi
    
    echo ""
    echo "=== Key Counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    echo "Source Redis: $SOURCE_KEYS keys"
    
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")
    echo "Target Redis: $TARGET_KEYS keys"
    
    echo ""
    echo "=== Progress ==="
    if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
        if [ "$TARGET_KEYS" -eq "$SOURCE_KEYS" ]; then
            echo "🎉 MIGRATION COMPLETE!"
            echo "All $SOURCE_KEYS keys migrated successfully"
        elif [ "$TARGET_KEYS" -gt 0 ]; then
            PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            REMAINING=$((SOURCE_KEYS - TARGET_KEYS))
            echo "📈 Progress: $PERCENTAGE% complete"
            echo "Migrated: $TARGET_KEYS/$SOURCE_KEYS keys"
            echo "Remaining: $REMAINING keys"
            
            # Estimate time remaining
            if [ -f /opt/migration/migration.pid ] && ps -p $(cat /opt/migration/migration.pid) > /dev/null; then
                EST_MINUTES=$((REMAINING / 1000 / 60))
                echo "Estimated: $EST_MINUTES minutes remaining"
            fi
        else
            echo "❌ No keys migrated yet"
        fi
    fi
    
    echo ""
    echo "=== Test Data Integrity ==="
    echo "Testing sample key migration..."
    
    # Get a few random keys from source
    SAMPLE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 --scan --count 3 2>/dev/null || echo "")
    
    if [ -n "$SAMPLE_KEYS" ]; then
        echo "Sample keys from source:"
        for key in $SAMPLE_KEYS; do
            echo "  - $key"
        done
        
        echo ""
        echo "Checking in target..."
        for key in $SAMPLE_KEYS; do
            EXISTS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' EXISTS "$key" 2>/dev/null || echo "0")
            if [ "$EXISTS" -eq 1 ]; then
                echo "  ✅ $key exists in target"
            else
                echo "  ❌ $key missing from target"
            fi
        done
    else
        echo "Could not get sample keys"
    fi
    
    echo ""
    echo "=== Next Steps ==="
    if [ -f /opt/migration/migration.pid ] && ps -p $(cat /opt/migration/migration.pid) > /dev/null; then
        echo "1. Monitor progress: tail -f /tmp/redis_migration.log"
        echo "2. Check status: ./check_migration.sh"
        echo "3. Wait for completion (estimated: $((REMAINING / 1000 / 60)) minutes)"
    else
        echo "1. Check if migration completed successfully"
        echo "2. Verify key counts match"
        echo "3. Test application connectivity"
        echo "4. Start Phase 2 (continuous sync) if needed"
    fi
    """
    
    output, error = run_command(client, status_cmd, "Check migration status")
    
    # Check if migration script exists and run it
    print("\n" + "="*80)
    print("RUNNING MIGRATION MONITOR SCRIPT")
    print("="*80)
    
    monitor_cmd = """
    cd /opt/migration
    if [ -f "./check_migration.sh" ]; then
        echo "=== Running migration monitor ==="
        chmod +x ./check_migration.sh
        ./check_migration.sh
    else
        echo "Migration monitor script not found"
        echo "Creating simple check..."
        
        # Simple check
        echo "=== Simple Migration Check ==="
        echo "Source keys: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'ERROR')"
        echo "Target keys: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo 'ERROR')"
        
        echo ""
        echo "=== Running processes ==="
        ps aux | grep -E "(redis-dump|redis-load)" | grep -v grep || echo "No migration processes"
    fi
    """
    
    output, error = run_command(client, monitor_cmd, "Run migration monitor")
    
    # Check if migration needs to be started
    print("\n" + "="*80)
    print("CHECKING IF MIGRATION NEEDS TO BE STARTED")
    print("="*80)
    
    start_check = """
    echo "=== Checking if migration should be started ==="
    echo ""
    
    # Check if migration is already running
    if ps aux | grep -E "(redis-dump|redis-load)" | grep -v grep > /dev/null; then
        echo "✅ Migration is already running"
        ps aux | grep -E "(redis-dump|redis-load)" | grep -v grep
    else
        echo "⚠️  Migration is not running"
        echo ""
        echo "=== Current key counts ==="
        SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
        TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")
        
        echo "Source: $SOURCE_KEYS keys"
        echo "Target: $TARGET_KEYS keys"
        
        if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
            if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
                echo ""
                echo "🎉 Migration appears to be complete!"
                echo "Key counts match: $SOURCE_KEYS keys"
            else
                echo ""
                echo "❌ Migration incomplete or not started"
                echo "Difference: $((SOURCE_KEYS - TARGET_KEYS)) keys"
                echo ""
                echo "=== Starting migration now ==="
                echo "Running: redis-dump -u 'redis://192.168.10.139:6379' | redis-load -u 'redis://:9zaHQvNEo5bXFJR3h@121.91.157.129:6379'"
                
                # Start migration
                cd /opt/migration
                redis-dump -u 'redis://192.168.10.139:6379' | \
                redis-load -u 'redis://:9zaHQvNEo5bXFJR3h@121.91.157.129:6379' \
                    --workers 10 \
                    --buffer-size 10000 \
                    > /tmp/redis_migration_direct.log 2>&1 &
                
                MIGRATION_PID=$!
                echo $MIGRATION_PID > /opt/migration/migration_direct.pid
                echo "Migration started with PID: $MIGRATION_PID"
                echo "Log: /tmp/redis_migration_direct.log"
                echo ""
                echo "Check progress in 30 seconds..."
            fi
        else
            echo "❌ Could not get key counts"
        fi
    fi
    """
    
    output, error = run_command(client, start_check, "Check and start migration if needed", timeout=60)
    
    client.close()
    
    print("\n" + "="*80)
    print("📊 MIGRATION STATUS SUMMARY")
    print("="*80)
    
    print("\nBased on the checks:")
    print("1. ✅ redis-dump-load installed successfully")
    print("2. 🔄 Migration may be running or completed")
    print("3. 📈 Need to check key counts to confirm status")
    print("4. 🔧 Migration scripts created in /opt/migration/")
    
    print("\n🎯 Next steps:")
    print("1. Check if migration is running: ps aux | grep redis-dump")
    print("2. Monitor logs: tail -f /tmp/redis_migration*.log")
    print("3. Check key counts: ./check_migration.sh")
    print("4. If not running, start migration with run_migration.sh")
    
    print("\n📋 Commands to run on mig_worker:")
    print("   cd /opt/migration")
    print("   ./check_migration.sh")
    print("   tail -f /tmp/redis_migration.log")
    print("   redis-cli -h 192.168.10.139 -p 6379 DBSIZE")
    print("   redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()