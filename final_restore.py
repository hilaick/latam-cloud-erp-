#!/usr/bin/env python3
"""
Final Redis restore with proper authentication
"""

import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command_with_output(client, command, description, timeout=600):
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
    print("FINAL REDIS RESTORE WITH PROPER AUTHENTICATION")
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
    
    # Step 1: Use the CORRECT restore command
    print("\n" + "="*80)
    print("STEP 1: RUNNING CORRECT RESTORE COMMAND")
    print("="*80)
    
    restore_cmd = """
    cd /opt/migration
    
    echo "=== FINAL RESTORE ATTEMPT ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Use the smaller 175MB backup file
    BACKUP_FILE="source_backup_20260718_034825.rdb"
    echo "Using backup: $BACKUP_FILE"
    echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo ""
    
    # First, flush target Redis
    echo "1. Flushing target Redis..."
    redis-cli -h 121.91.157.129 -p 6379 << 'FLUSH'
AUTH 9zaHQvNEo5bXFJR3h
FLUSHALL
QUIT
FLUSH
    
    echo "✅ Target flushed"
    echo ""
    
    # Get initial key counts
    echo "2. Initial key counts:"
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE)
    echo "   Source: $SOURCE_KEYS keys"
    
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 << 'KEYS'
AUTH 9zaHQvNEo5bXFJR3h
DBSIZE
QUIT
KEYS | tail -1)
    echo "   Target: $TARGET_KEYS keys"
    echo ""
    
    # Start the restore with proper authentication
    echo "3. Starting restore with explicit AUTH..."
    echo "   Command: (echo 'AUTH 9zaHQvNEo5bXFJR3h'; cat \"$BACKUP_FILE\") | redis-cli -h 121.91.157.129 -p 6379 --pipe"
    echo "   This may take 5-10 minutes for 175MB..."
    echo ""
    
    # Start restore in background
    (
        echo "AUTH 9zaHQvNEo5bXFJR3h"
        cat "$BACKUP_FILE"
    ) | redis-cli -h 121.91.157.129 -p 6379 --pipe > /tmp/final_restore.log 2>&1 &
    RESTORE_PID=$!
    
    echo "Restore PID: $RESTORE_PID"
    echo "Log file: /tmp/final_restore.log"
    echo "$RESTORE_PID" > /opt/migration/final_restore.pid
    
    # Wait and check if it's running
    sleep 10
    
    if ps -p $RESTORE_PID > /dev/null; then
        echo "✅ Restore process started successfully!"
        echo "   PID: $RESTORE_PID"
        echo "   Runtime: $(ps -p $RESTORE_PID -o etime=)"
        echo ""
        echo "=== Initial log output ==="
        tail -5 /tmp/final_restore.log
    else
        echo "❌ Restore process failed to start"
        echo "=== Error log ==="
        cat /tmp/final_restore.log
        wait $RESTORE_PID 2>/dev/null
        EXIT_CODE=$?
        echo "Exit code: $EXIT_CODE"
    fi
    """
    
    output, error, exit_code = run_command_with_output(client, restore_cmd, "Start final restore", timeout=30)
    
    # Step 2: Monitor progress
    print("\n" + "="*80)
    print("STEP 2: MONITORING RESTORE PROGRESS")
    print("="*80)
    
    print("Waiting 30 seconds to check progress...")
    time.sleep(30)
    
    monitor_cmd = """
    echo "=== Restore Progress Check ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Check if restore is still running
    if [ -f /opt/migration/final_restore.pid ]; then
        RESTORE_PID=$(cat /opt/migration/final_restore.pid)
        if ps -p $RESTORE_PID > /dev/null; then
            echo "✅ Restore is running (PID: $RESTORE_PID)"
            echo "   Runtime: $(ps -p $RESTORE_PID -o etime=)"
            echo "   CPU: $(ps -p $RESTORE_PID -o %cpu=)"
            echo "   Memory: $(ps -p $RESTORE_PID -o %mem=)"
            echo ""
            echo "=== Recent log output ==="
            tail -10 /tmp/final_restore.log 2>/dev/null || echo "No log output yet"
        else
            echo "❌ Restore process completed"
            wait $RESTORE_PID 2>/dev/null
            EXIT_CODE=$?
            echo "   Exit code: $EXIT_CODE"
            echo ""
            echo "=== Final log output ==="
            tail -20 /tmp/final_restore.log 2>/dev/null || echo "No log file"
        fi
    else
        echo "⚠️  No restore PID file found"
    fi
    
    echo ""
    echo "=== Current key counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    echo "Source: $SOURCE_KEYS keys"
    
    echo "Target:"
    redis-cli -h 121.91.157.129 -p 6379 << 'TARGET_CHECK'
AUTH 9zaHQvNEo5bXFJR3h
DBSIZE
QUIT
TARGET_CHECK
    
    echo ""
    echo "=== Target Redis memory ==="
    redis-cli -h 121.91.157.129 -p 6379 << 'MEMORY_CHECK'
AUTH 9zaHQvNEo5bXFJR3h
INFO memory | grep -E "(used_memory_human|maxmemory_human)"
QUIT
MEMORY_CHECK
    """
    
    output, error, exit_code = run_command_with_output(client, monitor_cmd, "Monitor restore progress")
    
    # Step 3: Create monitoring script
    print("\n" + "="*80)
    print("STEP 3: CREATING FINAL MONITORING SCRIPT")
    print("="*80)
    
    final_monitor = """#!/bin/bash
# monitor_final_restore.sh

echo "================================================"
echo "REDIS RESTORE MONITOR - $(date)"
echo "================================================"

# Check restore process
if [ -f /opt/migration/final_restore.pid ]; then
    RESTORE_PID=$(cat /opt/migration/final_restore.pid)
    if ps -p $RESTORE_PID > /dev/null; then
        echo "🔄 RESTORE IN PROGRESS"
        echo "   PID: $RESTORE_PID"
        echo "   Runtime: $(ps -p $RESTORE_PID -o etime=)"
        echo "   Log: /tmp/final_restore.log"
        echo ""
        echo "=== Recent log ==="
        tail -5 /tmp/final_restore.log 2>/dev/null || echo "No log output"
    else
        echo "✅ RESTORE COMPLETED"
        wait $RESTORE_PID 2>/dev/null
        EXIT_CODE=$?
        echo "   Exit code: $EXIT_CODE"
        if [ $EXIT_CODE -eq 0 ]; then
            echo "   Status: SUCCESS"
        else
            echo "   Status: FAILED (code: $EXIT_CODE)"
            echo ""
            echo "=== Error log ==="
            tail -20 /tmp/final_restore.log 2>/dev/null || echo "No log file"
        fi
    fi
else
    echo "⚠️  No restore process found"
fi

echo ""
echo "=== Key Counts ==="
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
echo "Source Redis: $SOURCE_KEYS keys"

TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 << 'KEYS_QUERY'
AUTH 9zaHQvNEo5bXFJR3h
DBSIZE
QUIT
KEYS_QUERY | tail -1)

echo "Target Redis: $TARGET_KEYS keys"

if [ "$SOURCE_KEYS" != "ERROR" ] && [ -n "$TARGET_KEYS" ] && [ "$TARGET_KEYS" != "OK" ]; then
    if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
        echo ""
        echo "🎉 MIGRATION SUCCESSFUL!"
        echo "   All $SOURCE_KEYS keys migrated"
    elif [ "$TARGET_KEYS" -gt 0 ]; then
        PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
        REMAINING=$((SOURCE_KEYS - TARGET_KEYS))
        echo ""
        echo "📈 Progress: $PERCENTAGE% complete"
        echo "   Migrated: $TARGET_KEYS/$SOURCE_KEYS keys"
        echo "   Remaining: $REMAINING keys"
    else
        echo ""
        echo "❌ No keys migrated yet"
    fi
fi

echo ""
echo "=== Quick Test ==="
echo "Setting test key..."
redis-cli -h 121.91.157.129 -p 6379 << 'TEST'
AUTH 9zaHQvNEo5bXFJR3h
SET migration_test_final "success"
GET migration_test_final
QUIT
TEST

echo ""
echo "=== Commands ==="
echo "1. Monitor restore: tail -f /tmp/final_restore.log"
echo "2. Check process: ps aux | grep redis-cli"
echo "3. Check keys: ./monitor_final_restore.sh"
echo "4. Kill restore: kill \$(cat /opt/migration/final_restore.pid)"
"""
    
    create_monitor = f"""cat > /opt/migration/monitor_final_restore.sh << 'EOF'
{final_monitor}
EOF
chmod +x /opt/migration/monitor_final_restore.sh
echo "Monitoring script created: /opt/migration/monitor_final_restore.sh"
echo ""
echo "Run: ./monitor_final_restore.sh"
"""
    
    output, error, exit_code = run_command_with_output(client, create_monitor, "Create final monitor script")
    
    # Step 4: Wait and check final status
    print("\n" + "="*80)
    print("STEP 4: FINAL STATUS CHECK")
    print("="*80)
    
    print("Waiting 60 seconds for restore to make progress...")
    time.sleep(60)
    
    final_check = """
    echo "=== Final Status Check ==="
    echo "Timestamp: $(date)"
    echo ""
    
    ./monitor_final_restore.sh
    
    echo ""
    echo "=== Backup files ==="
    ls -lh /opt/migration/*.rdb 2>/dev/null | head -5
    
    echo ""
    echo "=== Next steps ==="
    echo "If restore is complete and keys match:"
    echo "1. Verify data integrity with sample checks"
    echo "2. Test application connectivity"
    echo "3. Schedule cutover to target Redis"
    echo ""
    echo "If restore failed or incomplete:"
    echo "1. Check /tmp/final_restore.log for errors"
    echo "2. Try with the larger 325MB backup"
    echo "3. Use redis-dump-load alternative"
    """
    
    output, error, exit_code = run_command_with_output(client, final_check, "Final status check")
    
    client.close()
    
    print("\n" + "="*80)
    print("🎯 FINAL RESTORE INITIATED!")
    print("="*80)
    
    print("\n📊 Current Status:")
    print("   - ✅ Using 175MB backup file")
    print("   - ✅ Proper authentication: AUTH command before RDB data")
    print("   - ✅ Target Redis flushed")
    print("   - 🔄 Restore process started")
    print("   - 📈 Monitoring script created")
    
    print("\n🔧 Command used:")
    print("   (echo 'AUTH 9zaHQvNEo5bXFJR3h'; cat backup.rdb) | redis-cli -h target --pipe")
    
    print("\n📈 To monitor progress:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./monitor_final_restore.sh")
    print("   tail -f /tmp/final_restore.log")
    
    print("\n⏱️  Estimated timeline:")
    print("   - 175MB RDB file")
    print("   - ~101,397 keys (from RDB check)")
    print("   - Estimated: 3-5 minutes")
    
    print("\n🎯 Expected outcome:")
    print("   Target should have ~339,812 keys when complete")
    
    print("\n⚠️  IMPORTANT:")
    print("   1. Do NOT interrupt the restore process")
    print("   2. Monitor with ./monitor_final_restore.sh")
    print("   3. Verify key counts match after completion")
    
    print("\n🔧 If this fails:")
    print("   1. Check /tmp/final_restore.log for errors")
    print("   2. Try the 325MB backup file")
    print("   3. Use redis-dump-load: pip3 install redis-dump-load")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()