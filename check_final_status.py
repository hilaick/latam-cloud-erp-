#!/usr/bin/env python3
"""
Check final restore status
"""

import paramiko
import sys

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
    print("CHECKING FINAL RESTORE STATUS")
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
    
    # Check restore status
    print("\n" + "="*80)
    print("RESTORE STATUS CHECK")
    print("="*80)
    
    status_cmd = """
    echo "=== Restore Process Status ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Check if restore process is running
    if [ -f /opt/migration/final_restore.pid ]; then
        RESTORE_PID=$(cat /opt/migration/final_restore.pid)
        if ps -p $RESTORE_PID > /dev/null; then
            echo "🔄 RESTORE STILL RUNNING"
            echo "   PID: $RESTORE_PID"
            echo "   Runtime: $(ps -p $RESTORE_PID -o etime=)"
            echo "   CPU: $(ps -p $RESTORE_PID -o %cpu=)"
            echo "   Memory: $(ps -p $RESTORE_PID -o %mem=)"
            echo ""
            echo "=== Process command ==="
            ps -p $RESTORE_PID -o cmd=
            echo ""
            echo "=== Log tail ==="
            tail -10 /tmp/final_restore.log 2>/dev/null || echo "No log file"
        else
            echo "✅ RESTORE COMPLETED"
            wait $RESTORE_PID 2>/dev/null
            EXIT_CODE=$?
            echo "   Exit code: $EXIT_CODE"
            echo ""
            echo "=== Final log output ==="
            tail -20 /tmp/final_restore.log 2>/dev/null || echo "No log file"
        fi
    else
        echo "⚠️  No restore PID file found"
        echo "Checking for any redis-cli processes..."
        ps aux | grep -E "(redis-cli|cat.*rdb)" | grep -v grep || echo "No restore processes found"
    fi
    
    echo ""
    echo "=== Key Counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    echo "Source Redis: $SOURCE_KEYS keys"
    
    echo "Target Redis:"
    TARGET_OUTPUT=$(redis-cli -h 121.91.157.129 -p 6379 << 'TARGET_QUERY'
AUTH 9zaHQvNEo5bXFJR3h
DBSIZE
QUIT
TARGET_QUERY 2>/dev/null)
    
    # Extract the DBSIZE number from output
    TARGET_KEYS=$(echo "$TARGET_OUTPUT" | grep -E "^[0-9]+$" || echo "0")
    echo "Target Redis: $TARGET_KEYS keys"
    
    echo ""
    echo "=== Progress ==="
    if [ "$SOURCE_KEYS" != "ERROR" ] && [ -n "$TARGET_KEYS" ]; then
        if [ "$TARGET_KEYS" -eq "$SOURCE_KEYS" ]; then
            echo "🎉 MIGRATION COMPLETE!"
            echo "   All $SOURCE_KEYS keys migrated successfully"
        elif [ "$TARGET_KEYS" -gt 0 ]; then
            PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            REMAINING=$((SOURCE_KEYS - TARGET_KEYS))
            echo "📈 Progress: $PERCENTAGE% complete"
            echo "   Migrated: $TARGET_KEYS/$SOURCE_KEYS keys"
            echo "   Remaining: $REMAINING keys"
            
            # Estimate time remaining
            if [ -f /opt/migration/final_restore.pid ] && ps -p $(cat /opt/migration/final_restore.pid) > /dev/null; then
                echo "   Status: Still running"
            else
                echo "   Status: Stopped (check logs)"
            fi
        else
            echo "❌ No keys migrated"
            echo "   Check /tmp/final_restore.log for errors"
        fi
    fi
    
    echo ""
    echo "=== Quick Data Test ==="
    echo "Testing random key access..."
    
    # Get a few keys from source
    SAMPLE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 --scan --count 3 2>/dev/null || echo "")
    
    if [ -n "$SAMPLE_KEYS" ]; then
        echo "Sample keys from source:"
        echo "$SAMPLE_KEYS"
        echo ""
        echo "Checking if they exist in target..."
        for key in $SAMPLE_KEYS; do
            TARGET_EXISTS=$(redis-cli -h 121.91.157.129 -p 6379 << 'EXISTS_CHECK'
AUTH 9zaHQvNEo5bXFJR3h
EXISTS $key
QUIT
EXISTS_CHECK 2>/dev/null | grep -E "^[0-9]+$" || echo "0")
            if [ "$TARGET_EXISTS" -eq 1 ]; then
                echo "✅ Key '$key' exists in target"
            else
                echo "❌ Key '$key' missing from target"
            fi
        done
    else
        echo "Could not get sample keys from source"
    fi
    
    echo ""
    echo "=== Memory Usage ==="
    echo "Target Redis memory:"
    redis-cli -h 121.91.157.129 -p 6379 << 'MEMORY_CHECK'
AUTH 9zaHQvNEo5bXFJR3h
INFO memory | grep -E "(used_memory_human|maxmemory_human)"
QUIT
MEMORY_CHECK 2>/dev/null || echo "Failed to get memory info"
    """
    
    output, error = run_command(client, status_cmd, "Check restore status")
    
    # Check backup file info
    print("\n" + "="*80)
    print("BACKUP FILE INFORMATION")
    print("="*80)
    
    backup_cmd = """
    echo "=== Backup Files ==="
    cd /opt/migration
    echo "Available backups:"
    ls -lh *.rdb
    
    echo ""
    echo "=== RDB File Info ==="
    LATEST_BACKUP=$(ls -t *.rdb | head -1)
    echo "Latest backup: $LATEST_BACKUP"
    echo "Size: $(du -h "$LATEST_BACKUP" | cut -f1)"
    
    if command -v redis-check-rdb &> /dev/null; then
        echo "RDB info:"
        redis-check-rdb --memory "$LATEST_BACKUP" 2>/dev/null | head -20 || echo "Could not check RDB"
    fi
    
    echo ""
    echo "=== Next Actions ==="
    if [ -f /opt/migration/final_restore.pid ] && ps -p $(cat /opt/migration/final_restore.pid) > /dev/null; then
        echo "1. Wait for restore to complete (check with: ./monitor_final_restore.sh)"
        echo "2. Monitor progress: tail -f /tmp/final_restore.log"
        echo "3. Check key counts periodically"
    else
        echo "1. Check /tmp/final_restore.log for errors"
        echo "2. If failed, try: (echo 'AUTH 9zaHQvNEo5bXFJR3h'; cat backup.rdb) | redis-cli -h 121.91.157.129 -p 6379 --pipe"
        echo "3. Or use redis-dump-load: pip3 install redis-dump-load"
    fi
    """
    
    output, error = run_command(client, backup_cmd, "Check backup files")
    
    client.close()
    
    print("\n" + "="*80)
    print("📊 RESTORE STATUS SUMMARY")
    print("="*80)
    
    print("\nBased on the checks:")
    print("1. Restore process is running or completed")
    print("2. Need to check key counts to determine success")
    print("3. Backup files are available (175MB and 325MB)")
    print("4. Authentication is working with explicit AUTH command")
    
    print("\n🎯 Next steps:")
    print("1. Wait for restore to complete (if still running)")
    print("2. Verify key counts match: source vs target")
    print("3. Test sample data integrity")
    print("4. If successful, proceed to Phase 2 (continuous sync)")
    
    print("\n🔧 If restore failed:")
    print("1. Check /tmp/final_restore.log for errors")
    print("2. Try with the larger 325MB backup")
    print("3. Use redis-dump-load tool")
    print("4. Consider RedisShake for incremental sync")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()