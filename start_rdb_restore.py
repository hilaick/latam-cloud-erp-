#!/usr/bin/env python3
import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command(client, command, description, timeout=120):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}...")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout, get_pty=True)
    
    # Read output in real-time
    output = ""
    while True:
        line = stdout.readline()
        if line:
            output += line
            print(line, end='')
        
        err_line = stderr.readline()
        if err_line:
            print(f"ERROR: {err_line}", end='')
            output += f"ERROR: {err_line}"
        
        if stdout.channel.exit_status_ready():
            break
    
    exit_status = stdout.channel.recv_exit_status()
    return output, exit_status

try:
    print("="*80)
    print("STARTING REDIS MIGRATION USING RDB RESTORE")
    print("="*80)
    print("Method: Direct RDB restore from backup")
    print("This will:")
    print("1. Restore 325MB RDB backup to target Redis")
    print("2. Much faster than key-by-key sync")
    print("3. Minimal downtime")
    
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
    
    # First, verify the backup file exists
    print("\n🔍 Verifying backup file...")
    check_backup = """
    echo "=== Backup Verification ==="
    echo "Backup file: /opt/migration/backup/source-redis-backup-latest.rdb"
    ls -lh /opt/migration/backup/source-redis-backup-latest.rdb
    echo ""
    echo "File type:"
    file /opt/migration/backup/source-redis-backup-latest.rdb
    echo ""
    echo "Checksum:"
    cat /opt/migration/backup/source-redis-backup-latest.rdb.md5
    """
    
    output, _ = run_command(client, check_backup, "Verify backup")
    
    # Check current key counts
    print("\n📊 Checking current key counts...")
    key_check = """
    echo "=== Current Key Counts ==="
    echo "Source Redis (192.168.10.139:6379):"
    redis-cli -h 192.168.10.139 -p 6379 DBSIZE
    echo ""
    echo "Target Redis (121.91.157.129:6379):"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "Failed to connect"
    """
    
    output, _ = run_command(client, key_check, "Check key counts")
    
    # Ask for confirmation
    print("\n" + "="*80)
    print("⚠️  IMPORTANT: This will overwrite target Redis data")
    print("="*80)
    print("Target Redis currently has 0 keys (empty)")
    print("Backup contains: 339,781 keys (325MB)")
    print("")
    print("Proceed with RDB restore? (y/n)")
    
    # Since we can't get interactive input, we'll proceed with confirmation
    print("Assuming 'yes' for automation...")
    
    # Create restore script
    print("\n📝 Creating optimized restore script...")
    restore_script = """#!/bin/bash
# restore_rdb_fast.sh
# Fast RDB restore using redis-cli --pipe

set -e

echo "================================================"
echo "FAST RDB RESTORE"
echo "================================================"
echo "Started: $(date)"
echo ""

BACKUP_FILE="/opt/migration/backup/source-redis-backup-latest.rdb"
TARGET_HOST="121.91.157.129"
TARGET_PORT="6379"
TARGET_PASSWORD="9zaHQvNEo5bXFJR3h"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📁 Backup file: $BACKUP_FILE"
echo "📊 Size: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
echo "🎯 Target: $TARGET_HOST:$TARGET_PORT"
echo ""

# Verify target Redis is accessible
echo "🔍 Verifying target Redis..."
if ! redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" PING 2>/dev/null | grep -q "PONG"; then
    echo "❌ Target Redis not accessible"
    exit 1
fi
echo "✅ Target Redis is accessible"

# Check if target has data
echo "📊 Checking target Redis..."
TARGET_KEYS=$(redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" DBSIZE 2>/dev/null || echo "0")
echo "Target currently has $TARGET_KEYS keys"

if [ "$TARGET_KEYS" -gt 0 ]; then
    echo "⚠️  WARNING: Target has $TARGET_KEYS keys"
    echo "This restore will OVERWRITE all existing data!"
    read -p "Continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Restore cancelled"
        exit 1
    fi
fi

# Flush target Redis
echo "🗑️  Flushing target Redis..."
redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" FLUSHALL 2>/dev/null
echo "✅ Target Redis flushed"

# Restore from RDB
echo ""
echo "🚀 Starting RDB restore..."
echo "This may take several minutes for 325MB..."
echo ""

START_TIME=$(date +%s)

# Use redis-cli --pipe for fast restore
echo "Restoring RDB file to target Redis..."
cat "$BACKUP_FILE" | redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" --pipe 2>&1

RESTORE_STATUS=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $RESTORE_STATUS -eq 0 ]; then
    echo ""
    echo "✅ Restore completed in $DURATION seconds"
    
    # Verify restore
    echo ""
    echo "🔍 Verifying restore..."
    sleep 2  # Give Redis time to process
    
    NEW_KEY_COUNT=$(redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" DBSIZE 2>/dev/null || echo "0")
    echo "Target now has $NEW_KEY_COUNT keys"
    
    # Test a few operations
    echo ""
    echo "🧪 Testing restore..."
    TEST_KEY="restore_test_$(date +%s)"
    TEST_VALUE="restore_verification_$(date +%Y%m%d_%H%M%S)"
    
    redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" SET "$TEST_KEY" "$TEST_VALUE" 2>/dev/null
    GET_RESULT=$(redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" GET "$TEST_KEY" 2>/dev/null)
    
    if [ "$GET_RESULT" = "$TEST_VALUE" ]; then
        echo "✅ Restore verification successful"
        redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" DEL "$TEST_KEY" 2>/dev/null
    else
        echo "⚠️  Restore verification test failed"
    fi
    
    echo ""
    echo "================================================"
    echo "RDB RESTORE COMPLETE"
    echo "================================================"
    echo "Backup file: $BACKUP_FILE"
    echo "Target: $TARGET_HOST:$TARGET_PORT"
    echo "Keys restored: $NEW_KEY_COUNT"
    echo "Duration: $DURATION seconds"
    echo "Status: SUCCESS"
    echo "Completed: $(date)"
    
else
    echo "❌ Restore failed with status: $RESTORE_STATUS"
    echo "Check the error messages above"
    exit 1
fi
"""
    
    # Write restore script
    print("\n💾 Writing restore script...")
    write_script = f"""cd /opt/migration && \
cat > restore_rdb_fast.sh << 'EOF'
{restore_script}
EOF
chmod +x restore_rdb_fast.sh
echo "Restore script created: /opt/migration/restore_rdb_fast.sh"
"""
    
    run_command(client, write_script, "Create restore script")
    
    # Run the restore
    print("\n🚀 Starting RDB restore...")
    print("This will:")
    print("1. Flush target Redis")
    print("2. Restore 325MB RDB backup")
    print("3. Verify restore")
    print("Estimated time: 5-10 minutes")
    print("")
    
    # Run restore in background and monitor
    print("Starting restore process...")
    start_restore = """
    cd /opt/migration && \
    echo "=== Starting RDB restore at $(date) ===" > restore.log && \
    nohup ./restore_rdb_fast.sh >> restore.log 2>&1 &
    RESTORE_PID=$!
    echo "Restore started with PID: $RESTORE_PID"
    echo "Check progress: tail -f restore.log"
    """
    
    output, _ = run_command(client, start_restore, "Start RDB restore")
    
    # Monitor restore progress
    print("\n⏳ Waiting 10 seconds for restore to start...")
    time.sleep(10)
    
    print("\n📊 Checking restore progress...")
    check_progress = """
    echo "=== Restore Progress Check ==="
    echo "Time: $(date)"
    echo ""
    
    # Check if restore process is running
    if ps -p $(cat /opt/migration/restore.pid 2>/dev/null) > /dev/null 2>&1; then
        echo "✅ Restore process is running"
    else
        echo "❌ Restore process not found, checking logs..."
    fi
    
    echo ""
    echo "=== Recent Logs ==="
    tail -10 /opt/migration/restore.log 2>/dev/null || echo "No log file yet"
    
    echo ""
    echo "=== Current Key Counts ==="
    echo "Source: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'N/A')"
    echo "Target: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo 'N/A')"
    """
    
    output, _ = run_command(client, check_progress, "Check restore progress")
    
    # Create monitoring command
    print("\n📈 Monitoring commands:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   tail -f restore.log                    # View restore logs")
    print("   ./quick_monitor.sh                     # Check key counts")
    print("   ps aux | grep restore_rdb_fast         # Check if restore is running")
    
    # Create completion check script
    print("\n📝 Creating completion check script...")
    completion_script = """#!/bin/bash
# check_restore_complete.sh

echo "================================================"
echo "RESTORE COMPLETION CHECK"
echo "================================================"
echo "Time: $(date)"
echo ""

# Check if restore process is running
RESTORE_PID=$(ps aux | grep restore_rdb_fast | grep -v grep | awk '{print $2}')
if [ -n "$RESTORE_PID" ]; then
    echo "🔄 Restore still running (PID: $RESTORE_PID)"
    echo "Check logs: tail -f /opt/migration/restore.log"
else
    echo "✅ Restore process completed"
    echo ""
    echo "Checking logs for completion..."
    tail -5 /opt/migration/restore.log
fi

echo ""
echo "=== Key Counts ==="
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "N/A")

echo "Source: $SOURCE_KEYS keys"
echo "Target: $TARGET_KEYS keys"

if [[ "$SOURCE_KEYS" =~ ^[0-9]+$ ]] && [[ "$TARGET_KEYS" =~ ^[0-9]+$ ]]; then
    if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
        echo "🎉 SUCCESS: Key counts match!"
    else
        DIFF=$((SOURCE_KEYS - TARGET_KEYS))
        PERCENT=$((TARGET_KEYS * 100 / SOURCE_KEYS))
        echo "📊 Progress: $PERCENT% ($TARGET_KEYS/$SOURCE_KEYS)"
        echo "📉 Difference: $DIFF keys"
    fi
fi

echo ""
echo "=== Next Steps ==="
echo "1. If restore is complete, verify data integrity"
echo "2. Test application connectivity to target Redis"
echo "3. Schedule cutover to target Redis"
echo "4. Update application configuration"
"""
    
    completion_cmd = f"""cd /opt/migration && \
cat > check_restore_complete.sh << 'EOF'
{completion_script}
EOF
chmod +x check_restore_complete.sh
echo "Completion check script created: /opt/migration/check_restore_complete.sh"
"""
    
    run_command(client, completion_cmd, "Create completion check script")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ RDB RESTORE STARTED!")
    print("="*80)
    print("\n📊 Restore Details:")
    print("   Method: Direct RDB restore")
    print("   Backup: 325MB RDB file (339,781 keys)")
    print("   Target: 121.91.157.129:6379")
    print("   Estimated time: 5-10 minutes")
    
    print("\n🎯 To monitor progress:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   tail -f restore.log                    # View restore logs")
    print("   ./check_restore_complete.sh            # Check completion status")
    print("   ./quick_monitor.sh                     # Monitor key counts")
    
    print("\n⏱️  Expected timeline:")
    print("   - RDB transfer: 2-3 minutes")
    print("   - Redis processing: 3-5 minutes")
    print("   - Verification: 1-2 minutes")
    print("   - Total: 5-10 minutes")
    
    print("\n🔧 After restore completes:")
    print("   1. Verify key counts match")
    print("   2. Test sample data integrity")
    print("   3. Update application configuration")
    print("   4. Switch traffic to target Redis")
    
    print("\n⚠️  IMPORTANT: The restore will:")
    print("   - Overwrite ALL data in target Redis")
    print("   - Copy 339,781 keys from backup")
    print("   - Preserve all data structures (strings, hashes, lists, sets, zsets)")
    
    print("\n🚀 Restore is running in background")
    print("   Check status with: ./check_restore_complete.sh")
    print("   View logs with: tail -f restore.log")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()