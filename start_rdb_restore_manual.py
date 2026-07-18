#!/usr/bin/env python3
import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command(client, command, description, timeout=30):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}...")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    
    if output:
        print(f"   Output:\n{output}")
    if error:
        print(f"   Error: {error}")
    
    return output, error

try:
    print("="*80)
    print("MANUALLY STARTING RDB RESTORE")
    print("="*80)
    
    # Connect to mig_worker
    print(f"\n🔗 Connecting to mig_worker at {host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=username,
        password=password,
        timeout=15,
        allow_agent=False,
        look_for_keys=False
    )
    
    print("✅ Connected to mig_worker")
    
    # Check what happened with the restore script
    print("\n🔍 Checking restore script status...")
    check_script = """
    cd /opt/migration && \
    echo "=== Restore script status ==="
    ls -la restore_rdb_fast.sh
    echo ""
    echo "=== Check if script ran ==="
    if [ -f restore.log ]; then
        echo "Restore log exists:"
        cat restore.log
    else
        echo "No restore.log file found"
    fi
    echo ""
    echo "=== Check background processes ==="
    ps aux | grep -E "(restore|redis)" | grep -v grep
    """
    
    output, error = run_command(client, check_script, "Check restore script")
    
    # Let's run the restore script directly in foreground
    print("\n🚀 Starting RDB restore in foreground...")
    print("This will take 5-10 minutes for 325MB RDB file")
    print("")
    
    restore_cmd = """
    cd /opt/migration && \
    echo "=== Starting RDB restore at $(date) ==="
    echo "Backup file: /opt/migration/backup/source-redis-backup-latest.rdb"
    echo "Size: $(ls -lh /opt/migration/backup/source-redis-backup-latest.rdb | awk '{print $5}')"
    echo "Target: 121.91.157.129:6379"
    echo ""
    
    # First, flush target Redis
    echo "🗑️  Flushing target Redis..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' FLUSHALL 2>&1
    echo "✅ Target Redis flushed"
    echo ""
    
    # Get source key count
    echo "📊 Source key count:"
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE)
    echo "$SOURCE_KEYS keys"
    echo ""
    
    # Start restore
    echo "🚀 Starting RDB restore..."
    START_TIME=$(date +%s)
    
    # Use redis-cli --pipe for fast restore
    cat /opt/migration/backup/source-redis-backup-latest.rdb | \
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' --pipe 2>&1
    
    RESTORE_STATUS=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    echo "=== Restore completed ==="
    echo "Exit code: $RESTORE_STATUS"
    echo "Duration: $DURATION seconds"
    echo ""
    
    if [ $RESTORE_STATUS -eq 0 ]; then
        echo "✅ Restore completed successfully"
        
        # Check target key count
        echo ""
        echo "🔍 Verifying restore..."
        sleep 2
        TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "0")
        echo "Target key count: $TARGET_KEYS"
        echo "Source key count: $SOURCE_KEYS"
        
        if [ "$TARGET_KEYS" -eq "$SOURCE_KEYS" ]; then
            echo "🎉 SUCCESS: Key counts match!"
        else
            echo "⚠️  Key counts don't match: Source=$SOURCE_KEYS, Target=$TARGET_KEYS"
            DIFF=$((SOURCE_KEYS - TARGET_KEYS))
            PERCENT=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            echo "Progress: $PERCENT% ($TARGET_KEYS/$SOURCE_KEYS)"
            echo "Difference: $DIFF keys"
        fi
        
        # Test a sample key
        echo ""
        echo "🧪 Testing sample data..."
        TEST_KEY="migration_test_$(date +%s)"
        TEST_VALUE="test_value_$(date +%Y%m%d_%H%M%S)"
        
        # Write to source
        redis-cli -h 192.168.10.139 -p 6379 SET "$TEST_KEY" "$TEST_VALUE" 2>/dev/null
        echo "Set test key on source: $TEST_KEY = $TEST_VALUE"
        
        # Read from target
        TARGET_VALUE=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' GET "$TEST_KEY" 2>/dev/null)
        echo "Got from target: $TARGET_VALUE"
        
        if [ "$TARGET_VALUE" = "$TEST_VALUE" ]; then
            echo "✅ Data integrity test passed"
        else
            echo "⚠️  Data integrity test failed"
        fi
        
        # Clean up test key
        redis-cli -h 192.168.10.139 -p 6379 DEL "$TEST_KEY" 2>/dev/null
        redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DEL "$TEST_KEY" 2>/dev/null
        echo "Test key cleaned up"
        
    else
        echo "❌ Restore failed with exit code: $RESTORE_STATUS"
    fi
    
    echo ""
    echo "=== Restore finished at $(date) ==="
    """
    
    # Run the restore command with a longer timeout (10 minutes)
    print("Starting restore... This will take several minutes.")
    print("Please wait...")
    
    # We'll run it in background and monitor
    bg_cmd = """
    cd /opt/migration && \
    nohup bash -c '
    echo "=== Starting RDB restore at $(date) ===" > restore.log
    echo "Flushing target Redis..." >> restore.log
    redis-cli -h 121.91.157.129 -p 6379 -a "9zaHQvNEo5bXFJR3h" FLUSHALL >> restore.log 2>&1
    
    echo "Starting restore..." >> restore.log
    START_TIME=$(date +%s)
    cat /opt/migration/backup/source-redis-backup-latest.rdb | \
    redis-cli -h 121.91.157.129 -p 6379 -a "9zaHQvNEo5bXFJR3h" --pipe >> restore.log 2>&1
    RESTORE_STATUS=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo "Restore completed with status: $RESTORE_STATUS" >> restore.log
    echo "Duration: $DURATION seconds" >> restore.log
    
    if [ $RESTORE_STATUS -eq 0 ]; then
        echo "SUCCESS: Restore completed" >> restore.log
        TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a "9zaHQvNEo5bXFJR3h" DBSIZE 2>/dev/null)
        echo "Target keys: $TARGET_KEYS" >> restore.log
    else
        echo "ERROR: Restore failed" >> restore.log
    fi
    
    echo "=== Restore finished at $(date) ===" >> restore.log
    ' > /dev/null 2>&1 &
    
    RESTORE_PID=$!
    echo "Restore started with PID: $RESTORE_PID"
    echo "Check logs: tail -f /opt/migration/restore.log"
    echo "Check progress: redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
    """
    
    output, error = run_command(client, bg_cmd, "Start RDB restore in background")
    
    # Wait a moment and check
    time.sleep(5)
    
    print("\n⏳ Checking restore progress...")
    progress_cmd = """
    echo "=== Restore Status ==="
    echo "Time: $(date)"
    echo ""
    
    # Check if restore process is running
    if ps aux | grep "redis-cli.*--pipe" | grep -v grep > /dev/null; then
        echo "✅ Restore is running"
        echo "Process:"
        ps aux | grep "redis-cli.*--pipe" | grep -v grep
    else
        echo "❌ Restore process not found"
    fi
    
    echo ""
    echo "=== Logs ==="
    tail -5 /opt/migration/restore.log 2>/dev/null || echo "No logs yet"
    
    echo ""
    echo "=== Key Counts ==="
    echo "Source: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'N/A')"
    echo "Target: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo 'N/A')"
    """
    
    output, error = run_command(client, progress_cmd, "Check restore progress")
    
    # Create a simple monitoring command
    print("\n📈 Create monitoring command...")
    monitor_cmd = """
    cd /opt/migration && \
    cat > monitor_restore.sh << 'EOF'
#!/bin/bash
# monitor_restore.sh

while true; do
    clear
    echo "================================================"
    echo "RDB RESTORE MONITOR - $(date)"
    echo "================================================"
    echo ""
    
    # Check process
    echo "🔍 Restore Process:"
    if ps aux | grep "redis-cli.*--pipe" | grep -v grep > /dev/null; then
        echo "✅ Running"
        ps aux | grep "redis-cli.*--pipe" | grep -v grep | head -1
    else
        echo "❌ Not running"
    fi
    
    echo ""
    
    # Key counts
    echo "📊 Key Counts:"
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "N/A")
    
    echo "   Source: $SOURCE_KEYS keys"
    echo "   Target: $TARGET_KEYS keys"
    
    if [[ "$SOURCE_KEYS" =~ ^[0-9]+$ ]] && [[ "$TARGET_KEYS" =~ ^[0-9]+$ ]]; then
        if [ "$TARGET_KEYS" -gt 0 ]; then
            PERCENT=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            REMAINING=$((SOURCE_KEYS - TARGET_KEYS))
            echo "   Progress: $PERCENT% ($TARGET_KEYS/$SOURCE_KEYS)"
            echo "   Remaining: $REMAINING keys"
            
            # Progress bar
            BAR_WIDTH=50
            FILLED=$((PERCENT * BAR_WIDTH / 100))
            EMPTY=$((BAR_WIDTH - FILLED))
            printf "   ["
            for ((i=0; i<FILLED; i++)); do printf "█"; done
            for ((i=0; i<EMPTY; i++)); do printf " "; done
            printf "] %d%%\\n" $PERCENT
            
            # Estimate time
            if [ "$TARGET_KEYS" -gt 1000 ]; then
                # Rough estimate: 1000 keys/second
                EST_SECONDS=$((REMAINING / 1000))
                EST_MINUTES=$((EST_SECONDS / 60))
                echo "   Est. time remaining: ~$EST_MINUTES minutes"
            fi
        fi
    fi
    
    echo ""
    echo "📝 Recent Logs:"
    tail -3 /opt/migration/restore.log 2>/dev/null | while read line; do
        echo "   $line"
    done
    
    echo ""
    echo "================================================"
    echo "Press Ctrl+C to exit | Auto-refresh every 5 seconds"
    echo "================================================"
    
    sleep 5
done
EOF

chmod +x monitor_restore.sh
echo "Monitor script created: /opt/migration/monitor_restore.sh"
echo "Run with: ./monitor_restore.sh"
"""
    
    output, error = run_command(client, monitor_cmd, "Create monitor script")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ RDB RESTORE STARTED!")
    print("="*80)
    print("\n📊 Restore Details:")
    print("   Method: Direct RDB restore via redis-cli --pipe")
    print("   Backup: 325MB RDB file (339,787 keys)")
    print("   Target: 121.91.157.129:6379")
    print("   Status: Running in background")
    
    print("\n🎯 To monitor progress:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./monitor_restore.sh                    # Real-time monitor")
    print("   tail -f restore.log                     # View restore logs")
    print("   ./quick_monitor.sh                      # Quick status")
    
    print("\n⏱️  Estimated timeline:")
    print("   - RDB transfer: 2-3 minutes (325MB @ ~100MB/min)")
    print("   - Redis processing: 3-5 minutes")
    print("   - Total: 5-10 minutes")
    
    print("\n📈 Progress indicators:")
    print("   1. Target key count should increase from 0 to ~339,787")
    print("   2. Check logs: tail -f restore.log")
    print("   3. Monitor with: ./monitor_restore.sh")
    
    print("\n🚀 After restore completes:")
    print("   1. Verify key counts match")
    print("   2. Test data integrity")
    print("   3. Update application configuration")
    print("   4. Switch traffic to target Redis")
    
    print("\n🔧 If restore fails:")
    print("   1. Check logs: tail -f restore.log")
    print("   2. Retry: ./restore_rdb_fast.sh")
    print("   3. Alternative: Use RedisShake if installed")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()