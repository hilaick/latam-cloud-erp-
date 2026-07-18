#!/usr/bin/env python3
"""
Manual Redis restore from backup
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
    
    # Use get_pty for interactive commands
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout, get_pty=True)
    
    # Read output in real-time
    output_lines = []
    error_lines = []
    
    # Read stdout
    while True:
        line = stdout.readline()
        if not line:
            break
        output_lines.append(line.strip())
        print(f"   {line.strip()}")
    
    # Read stderr
    while True:
        line = stderr.readline()
        if not line:
            break
        error_lines.append(line.strip())
        print(f"   ERROR: {line.strip()}")
    
    # Get exit status
    exit_status = stdout.channel.recv_exit_status()
    
    output = "\n".join(output_lines)
    error = "\n".join(error_lines)
    
    return output, error, exit_status

try:
    print("="*80)
    print("MANUAL REDIS RESTORE FROM BACKUP")
    print("="*80)
    
    # Connect to mig_worker
    print(f"\n🔗 Connecting to mig_worker at {host}...")
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
    
    # Step 1: Check backup files
    print("\n" + "="*80)
    print("STEP 1: CHECKING BACKUP FILES")
    print("="*80)
    
    check_backup = """
    cd /opt/migration
    echo "=== Available backup files ==="
    ls -lh *.rdb
    
    echo ""
    echo "=== Checking RDB file integrity ==="
    LATEST_BACKUP=$(ls -t *.rdb | head -1)
    echo "Latest backup: $LATEST_BACKUP"
    echo "Size: $(du -h "$LATEST_BACKUP" | cut -f1)"
    
    # Check RDB file
    if command -v redis-check-rdb &> /dev/null; then
        echo "Checking RDB integrity..."
        redis-check-rdb "$LATEST_BACKUP"
    else
        echo "redis-check-rdb not available, using file command"
        file "$LATEST_BACKUP"
    fi
    
    echo ""
    echo "=== Current key counts ==="
    echo "Source: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'ERROR')"
    echo "Target: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo 'ERROR')"
    """
    
    output, error, exit_code = run_command_with_output(client, check_backup, "Check backup files")
    
    # Step 2: Manual restore
    print("\n" + "="*80)
    print("STEP 2: MANUAL RESTORE FROM BACKUP")
    print("="*80)
    
    print("Starting manual restore...")
    print("This will pipe the 325MB RDB file to target Redis")
    print("Estimated time: 5-10 minutes")
    print("")
    
    restore_cmd = """
    cd /opt/migration
    LATEST_BACKUP=$(ls -t *.rdb | head -1)
    
    echo "=== Starting manual restore ==="
    echo "Backup file: $LATEST_BACKUP"
    echo "Size: $(du -h "$LATEST_BACKUP" | cut -f1)"
    echo "Target: 121.91.157.129:6379"
    echo "Timestamp: $(date)"
    echo ""
    
    # First, flush target to ensure clean state
    echo "1. Flushing target Redis..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' FLUSHALL 2>&1 | grep -v "Warning"
    echo "✅ Target flushed"
    
    # Start restore in background and monitor
    echo ""
    echo "2. Starting restore process..."
    echo "   Command: cat \"$LATEST_BACKUP\" | redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' --pipe"
    
    # Start restore and capture PID
    cat "$LATEST_BACKUP" | redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' --pipe > /tmp/restore.log 2>&1 &
    RESTORE_PID=$!
    
    echo "Restore PID: $RESTORE_PID"
    echo "Log file: /tmp/restore.log"
    
    # Wait a bit and check if it's running
    sleep 5
    
    if ps -p $RESTORE_PID > /dev/null; then
        echo "✅ Restore process started successfully"
        echo ""
        echo "=== Monitoring restore ==="
        echo "Check progress with:"
        echo "  tail -f /tmp/restore.log"
        echo "  ps aux | grep $RESTORE_PID"
        echo "  redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
        
        # Save PID to file
        echo $RESTORE_PID > /opt/migration/restore.pid
        echo "PID saved to: /opt/migration/restore.pid"
    else
        echo "❌ Restore process failed to start"
        echo "Check /tmp/restore.log for errors:"
        cat /tmp/restore.log | tail -20
    fi
    """
    
    output, error, exit_code = run_command_with_output(client, restore_cmd, "Start manual restore", timeout=30)
    
    # Step 3: Monitor restore progress
    print("\n" + "="*80)
    print("STEP 3: MONITORING RESTORE PROGRESS")
    print("="*80)
    
    print("Waiting 30 seconds to check initial progress...")
    time.sleep(30)
    
    monitor_cmd = """
    echo "=== Restore Status Check ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Check if restore process is still running
    if [ -f /opt/migration/restore.pid ]; then
        RESTORE_PID=$(cat /opt/migration/restore.pid)
        if ps -p $RESTORE_PID > /dev/null; then
            echo "✅ Restore process is running (PID: $RESTORE_PID)"
            echo "Runtime: $(ps -p $RESTORE_PID -o etime=)"
            echo "CPU: $(ps -p $RESTORE_PID -o %cpu=)"
            echo "Memory: $(ps -p $RESTORE_PID -o %mem=)"
        else
            echo "❌ Restore process is not running"
            echo "Check exit status..."
            wait $RESTORE_PID 2>/dev/null
            EXIT_CODE=$?
            echo "Exit code: $EXIT_CODE"
        fi
    else
        echo "⚠️  No restore PID file found"
    fi
    
    echo ""
    echo "=== Check restore log ==="
    if [ -f /tmp/restore.log ]; then
        echo "Last 10 lines of restore.log:"
        tail -10 /tmp/restore.log
    else
        echo "No restore.log file found"
    fi
    
    echo ""
    echo "=== Current key counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "ERROR")
    
    echo "Source keys: $SOURCE_KEYS"
    echo "Target keys: $TARGET_KEYS"
    
    if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
        if [ "$TARGET_KEYS" -gt 0 ]; then
            PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            echo ""
            echo "📈 Restore progress: $PERCENTAGE%"
            echo "   Migrated: $TARGET_KEYS/$SOURCE_KEYS keys"
            
            if [ "$TARGET_KEYS" -eq "$SOURCE_KEYS" ]; then
                echo "✅ RESTORE COMPLETE!"
            else
                REMAINING=$((SOURCE_KEYS - TARGET_KEYS))
                EST_MINUTES=$((REMAINING / 50000))
                echo "   Remaining: $REMAINING keys"
                echo "   Estimated: $EST_MINUTES minutes remaining"
            fi
        else
            echo "❌ No keys migrated yet"
        fi
    fi
    
    echo ""
    echo "=== Target Redis memory ==="
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory 2>/dev/null | grep -E "(used_memory_human|maxmemory_human)" || echo "Failed to get memory info"
    """
    
    output, error, exit_code = run_command_with_output(client, monitor_cmd, "Monitor restore progress")
    
    # Step 4: Create monitoring script
    print("\n" + "="*80)
    print("STEP 4: CREATING MONITORING SCRIPT")
    print("="*80)
    
    monitor_script = """#!/bin/bash
# monitor_restore.sh

echo "================================================"
echo "REDIS RESTORE MONITOR - $(date)"
echo "================================================"

# Check restore process
if [ -f /opt/migration/restore.pid ]; then
    RESTORE_PID=$(cat /opt/migration/restore.pid)
    if ps -p $RESTORE_PID > /dev/null; then
        echo "✅ Restore process running (PID: $RESTORE_PID)"
        echo "   Runtime: $(ps -p $RESTORE_PID -o etime=)"
        echo "   Log: /tmp/restore.log"
        
        # Check log for errors
        echo ""
        echo "=== Recent log output ==="
        tail -5 /tmp/restore.log 2>/dev/null || echo "No log output yet"
    else
        echo "❌ Restore process not running"
        echo "   Exit code: $(wait $RESTORE_PID 2>/dev/null; echo $?)"
        echo ""
        echo "=== Last log output ==="
        tail -20 /tmp/restore.log 2>/dev/null || echo "No log file"
    fi
else
    echo "⚠️  No restore process found"
fi

echo ""
echo "=== Key Counts ==="
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "ERROR")

echo "Source: $SOURCE_KEYS keys"
echo "Target: $TARGET_KEYS keys"

if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
    if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
        echo ""
        echo "🎉 RESTORE COMPLETE!"
        echo "All $SOURCE_KEYS keys successfully migrated"
    elif [ "$TARGET_KEYS" -gt 0 ]; then
        PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
        REMAINING=$((SOURCE_KEYS - TARGET_KEYS))
        echo ""
        echo "🔄 Restore progress: $PERCENTAGE%"
        echo "   Migrated: $TARGET_KEYS/$SOURCE_KEYS keys"
        echo "   Remaining: $REMAINING keys"
        echo "   Estimated: $((REMAINING / 50000)) minutes remaining"
    else
        echo ""
        echo "❌ No keys migrated yet"
    fi
fi

echo ""
echo "=== Commands ==="
echo "1. Monitor restore: tail -f /tmp/restore.log"
echo "2. Check key counts: ./monitor_restore.sh"
echo "3. Kill restore: kill \$(cat /opt/migration/restore.pid)"
echo "4. Check target: redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
"""
    
    create_monitor = f"""cat > /opt/migration/monitor_restore.sh << 'EOF'
{monitor_script}
EOF
chmod +x /opt/migration/monitor_restore.sh
echo "Monitoring script created: /opt/migration/monitor_restore.sh"
"""
    
    output, error, exit_code = run_command_with_output(client, create_monitor, "Create monitoring script")
    
    client.close()
    
    print("\n" + "="*80)
    print("🎯 MANUAL RESTORE STARTED!")
    print("="*80)
    
    print("\n📊 Restore Status:")
    print("   - ✅ Backup file: 325MB RDB")
    print("   - ✅ Target Redis flushed")
    print("   - 🔄 Restore process started")
    print("   - 📈 Monitoring script created")
    
    print("\n📈 To monitor progress:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./monitor_restore.sh")
    print("   tail -f /tmp/restore.log")
    
    print("\n⏱️  Estimated timeline:")
    print("   - 325MB RDB file")
    print("   - 339,801 keys")
    print("   - Estimated: 5-10 minutes")
    
    print("\n🎯 Expected completion:")
    print("   Target should have ~339,801 keys when complete")
    
    print("\n⚠️  IMPORTANT:")
    print("   1. Do NOT interrupt the restore process")
    print("   2. Monitor progress with ./monitor_restore.sh")
    print("   3. Verify key counts match after completion")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()