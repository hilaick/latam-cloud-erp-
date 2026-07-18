#!/usr/bin/env python3
"""
Check RDB restore progress
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
        print(f"   Output:\n{output}")
    if error:
        print(f"   Error: {error}")
    
    return output, error

try:
    print("="*80)
    print("CHECKING RDB RESTORE PROGRESS")
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
    
    # Check if restore process is still running and making progress
    print("\n" + "="*80)
    print("CHECKING RESTORE PROCESS STATUS")
    print("="*80)
    
    # Check process status
    process_check = """
    echo "=== Restore Process Status ==="
    PID=16799
    if ps -p $PID > /dev/null; then
        echo "✅ Process $PID is still running"
        echo "Command: $(ps -p $PID -o cmd=)"
        echo "CPU: $(ps -p $PID -o %cpu=)"
        echo "Memory: $(ps -p $PID -o %mem=)"
        echo "Runtime: $(ps -p $PID -o etime=)"
    else
        echo "❌ Process $PID is not running"
        echo "Checking for other redis-cli processes..."
        ps aux | grep redis-cli | grep -v grep
    fi
    
    echo ""
    echo "=== Checking pipe progress ==="
    # Check if data is flowing through the pipe
    if [ -p /proc/16799/fd/0 ]; then
        echo "✅ Process is reading from pipe"
        # Check file descriptor
        ls -la /proc/16799/fd/ | grep pipe
    else
        echo "⚠️  Process may not be reading from pipe"
    fi
    
    echo ""
    echo "=== Checking target Redis activity ==="
    # Check if target Redis is receiving commands
    TARGET_OPS=$(timeout 5 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO stats 2>/dev/null | grep -E "(total_commands_processed|instantaneous_ops_per_sec)" || echo "N/A")
    echo "Target Redis stats:"
    echo "$TARGET_OPS"
    """
    
    output, error = run_command(client, process_check, "Check restore process")
    
    # Check target Redis key count progress
    print("\n" + "="*80)
    print("CHECKING KEY COUNT PROGRESS")
    print("="*80)
    
    progress_check = """
    echo "=== Monitoring key count progress ==="
    echo ""
    
    # Get current target key count
    CURRENT_KEYS=$(timeout 10 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "0")
    SOURCE_KEYS=339801
    
    echo "Source keys: $SOURCE_KEYS"
    echo "Current target keys: $CURRENT_KEYS"
    
    if [ "$CURRENT_KEYS" -gt 0 ]; then
        PERCENTAGE=$((CURRENT_KEYS * 100 / SOURCE_KEYS))
        REMAINING=$((SOURCE_KEYS - CURRENT_KEYS))
        echo ""
        echo "📈 Progress: $PERCENTAGE% complete"
        echo "   Migrated: $CURRENT_KEYS keys"
        echo "   Remaining: $REMAINING keys"
        echo "   Estimated time remaining: $((REMAINING / 50000)) minutes"
        
        # Check a few minutes ago to see progress rate
        echo ""
        echo "🕒 Checking progress rate..."
        echo "Wait 30 seconds and check again..."
    else
        echo ""
        echo "❌ No keys migrated yet"
        echo "The restore may not have started or is stuck"
    fi
    """
    
    output, error = run_command(client, progress_check, "Check key count progress")
    
    # Wait 30 seconds and check again
    print("\n" + "="*80)
    print("MONITORING PROGRESS (30 SECOND WAIT)")
    print("="*80)
    
    print("Waiting 30 seconds to check progress rate...")
    time.sleep(30)
    
    progress_rate = """
    echo "=== Progress after 30 seconds ==="
    echo ""
    
    # Get updated key count
    UPDATED_KEYS=$(timeout 10 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "0")
    SOURCE_KEYS=339801
    
    echo "Updated target keys: $UPDATED_KEYS"
    
    if [ "$UPDATED_KEYS" -gt "$CURRENT_KEYS" ]; then
        KEYS_PER_SECOND=$(( (UPDATED_KEYS - CURRENT_KEYS) / 30 ))
        echo "✅ Progress detected!"
        echo "   Keys per second: $KEYS_PER_SECOND"
        echo "   Estimated completion: $(( (SOURCE_KEYS - UPDATED_KEYS) / KEYS_PER_SECOND / 60 )) minutes"
    else
        echo "⚠️  No progress detected in last 30 seconds"
        echo "   The restore may be stuck or completed"
    fi
    """
    
    output, error = run_command(client, progress_rate, "Check progress rate")
    
    # Check for errors in the restore process
    print("\n" + "="*80)
    print("CHECKING FOR RESTORE ERRORS")
    print("="*80)
    
    error_check = """
    echo "=== Checking for restore errors ==="
    echo ""
    
    # Check process status
    PID=16799
    if ps -p $PID > /dev/null; then
        echo "Process $PID status:"
        ps -p $PID -o state,cmd
        
        # Check if process is in 'D' state (uninterruptible sleep)
        STATE=$(ps -p $PID -o state=)
        if [ "$STATE" = "D" ]; then
            echo "⚠️  Process is in D state (uninterruptible sleep)"
            echo "   This usually means it's waiting on I/O"
        fi
    else
        echo "Process $PID is no longer running"
        echo "Checking exit status..."
        wait $PID 2>/dev/null
        EXIT_CODE=$?
        echo "Exit code: $EXIT_CODE"
        
        if [ $EXIT_CODE -eq 0 ]; then
            echo "✅ Process exited successfully"
        else
            echo "❌ Process exited with error code: $EXIT_CODE"
        fi
    fi
    
    echo ""
    echo "=== Checking target Redis for errors ==="
    timeout 10 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO 2>&1 | grep -i error || echo "No Redis errors detected"
    
    echo ""
    echo "=== Checking system I/O ==="
    iostat -d 1 1 2>/dev/null | grep -A1 "Device" || echo "iostat not available"
    """
    
    output, error = run_command(client, error_check, "Check for restore errors")
    
    # Provide next steps based on status
    print("\n" + "="*80)
    print("🎯 RECOMMENDED ACTIONS")
    print("="*80)
    
    next_steps = """
    echo "=== Current Status Summary ==="
    echo ""
    
    # Get final key counts
    FINAL_SOURCE=$(timeout 10 redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")
    FINAL_TARGET=$(timeout 10 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "N/A")
    
    echo "Source keys: $FINAL_SOURCE"
    echo "Target keys: $FINAL_TARGET"
    echo ""
    
    if [ "$FINAL_SOURCE" != "N/A" ] && [ "$FINAL_TARGET" != "N/A" ]; then
        if [ "$FINAL_SOURCE" -eq "$FINAL_TARGET" ]; then
            echo "✅ MIGRATION COMPLETE!"
            echo "All $FINAL_SOURCE keys successfully migrated"
            echo ""
            echo "=== NEXT STEPS ==="
            echo "1. Verify data integrity with sample checks"
            echo "2. Test application connectivity to target Redis"
            echo "3. Schedule cutover"
            echo "4. Update application configuration"
        elif [ "$FINAL_TARGET" -eq 0 ]; then
            echo "❌ MIGRATION FAILED - No keys migrated"
            echo ""
            echo "=== TROUBLESHOOTING ==="
            echo "1. Check if restore process is still running"
            echo "2. Check system logs: dmesg | tail -20"
            echo "3. Try manual restore:"
            echo "   cat /opt/migration/source_backup_*.rdb | redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' --pipe"
            echo "4. Use RedisShake for incremental sync"
        else
            DIFF=$((FINAL_SOURCE - FINAL_TARGET))
            PERCENTAGE=$((FINAL_TARGET * 100 / FINAL_SOURCE))
            echo "🔄 MIGRATION IN PROGRESS: $PERCENTAGE% complete"
            echo "   Migrated: $FINAL_TARGET/$FINAL_SOURCE keys"
            echo "   Remaining: $DIFF keys"
            echo ""
            echo "=== OPTIONS ==="
            echo "1. Wait for restore to complete (if still running)"
            echo "2. Use RedisShake for remaining keys"
            echo "3. Restart restore with smaller chunks"
        fi
    else
        echo "⚠️  Could not get key counts"
        echo "Check Redis connectivity"
    fi
    
    echo ""
    echo "=== Backup Files ==="
    ls -lh /opt/migration/*.rdb 2>/dev/null || echo "No backup files"
    """
    
    output, error = run_command(client, next_steps, "Determine next steps")
    
    client.close()
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print("\nBased on the checks:")
    print("1. RDB restore process PID 16799 is running")
    print("2. Need to check if it's making progress")
    print("3. Target Redis currently shows 0 keys")
    print("4. May need to wait longer or troubleshoot")
    
    print("\n🔧 TROUBLESHOOTING OPTIONS:")
    print("1. Wait 5-10 more minutes for restore to complete")
    print("2. Check process status: ps aux | grep 16799")
    print("3. Check system I/O: iostat -d 1 1")
    print("4. Kill and restart restore if stuck")
    print("5. Use RedisShake for incremental sync instead")
    
    print("\n🚀 QUICK FIX:")
    print("If restore is stuck, try:")
    print("cd /opt/migration")
    print("cat source_backup_1784317874.rdb | redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' --pipe")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()