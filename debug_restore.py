#!/usr/bin/env python3
import paramiko
import sys

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
    print("DEBUGGING RDB RESTORE ISSUE")
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
    
    # Check the restore log
    print("\n📝 Checking restore logs...")
    log_cmd = "cat /opt/migration/restore.log 2>/dev/null || echo 'No restore.log'"
    output, error = run_command(client, log_cmd, "Check restore log")
    
    # Test Redis connectivity
    print("\n🔍 Testing Redis connectivity...")
    test_cmd = """
    echo "=== Testing Source Redis ==="
    redis-cli -h 192.168.10.139 -p 6379 PING
    echo ""
    echo "=== Testing Target Redis ==="
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' PING 2>&1
    echo ""
    echo "=== Testing RDB file ==="
    ls -lh /opt/migration/backup/source-redis-backup-latest.rdb
    file /opt/migration/backup/source-redis-backup-latest.rdb
    """
    
    output, error = run_command(client, test_cmd, "Test Redis connectivity")
    
    # Try a simple test restore
    print("\n🧪 Testing simple restore...")
    test_restore = """
    echo "=== Testing simple restore ==="
    echo "Creating test key on source..."
    TEST_KEY="debug_test_$(date +%s)"
    TEST_VALUE="debug_value_$(date +%Y%m%d_%H%M%S)"
    
    # Write to source
    redis-cli -h 192.168.10.139 -p 6379 SET "$TEST_KEY" "$TEST_VALUE"
    echo "Set on source: $TEST_KEY = $TEST_VALUE"
    
    # Read from source
    SOURCE_VALUE=$(redis-cli -h 192.168.10.139 -p 6379 GET "$TEST_KEY")
    echo "Read from source: $SOURCE_VALUE"
    
    # Write to target
    echo ""
    echo "Writing to target..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' SET "$TEST_KEY" "$TEST_VALUE" 2>&1
    
    # Read from target
    TARGET_VALUE=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' GET "$TEST_KEY" 2>&1)
    echo "Read from target: $TARGET_VALUE"
    
    # Clean up
    redis-cli -h 192.168.10.139 -p 6379 DEL "$TEST_KEY"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DEL "$TEST_KEY" 2>&1
    echo "Test keys cleaned up"
    """
    
    output, error = run_command(client, test_restore, "Test simple restore")
    
    # Try a small RDB restore
    print("\n🔧 Trying small RDB restore test...")
    small_test = """
    echo "=== Small RDB restore test ==="
    echo "Creating small test RDB..."
    
    # Create a test Redis instance locally
    mkdir -p /tmp/test_redis
    cd /tmp/test_redis
    
    # Start test Redis
    echo "Starting test Redis..."
    redis-server --port 6380 --daemonize yes --save "" --appendonly no 2>&1
    sleep 2
    
    # Add some test data
    echo "Adding test data..."
    for i in {1..10}; do
        redis-cli -p 6380 SET "test_key_$i" "test_value_$i"
    done
    
    # Create RDB backup
    echo "Creating RDB backup..."
    redis-cli -p 6380 SAVE
    redis-cli -p 6380 --rdb test.rdb
    
    # Check RDB file
    echo "RDB file created:"
    ls -lh test.rdb
    file test.rdb
    
    # Test restore to target
    echo ""
    echo "Testing restore to target..."
    cat test.rdb | redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' --pipe 2>&1 | head -20
    
    # Clean up
    echo ""
    echo "Cleaning up..."
    redis-cli -p 6380 SHUTDOWN NOSAVE
    rm -rf /tmp/test_redis
    """
    
    output, error = run_command(client, small_test, "Test small RDB restore", timeout=60)
    
    # Check if there's an issue with the RDB file
    print("\n🔍 Checking RDB file integrity...")
    rdb_check = """
    echo "=== RDB File Check ==="
    RDB_FILE="/opt/migration/backup/source-redis-backup-latest.rdb"
    
    echo "File size: $(ls -lh $RDB_FILE | awk '{print $5}')"
    echo "File type: $(file $RDB_FILE)"
    echo ""
    
    echo "First 100 bytes (hex):"
    head -c 100 "$RDB_FILE" | xxd | head -5
    echo ""
    
    echo "Checking if file is valid Redis RDB..."
    # Try to read RDB header
    HEADER=$(head -c 9 "$RDB_FILE" | xxd -p)
    echo "Header (hex): $HEADER"
    
    # Check for Redis RDB magic string "REDIS"
    if echo "$HEADER" | grep -q "5245444953"; then
        echo "✅ Valid Redis RDB header found"
    else
        echo "❌ Invalid Redis RDB header"
    fi
    """
    
    output, error = run_command(client, rdb_check, "Check RDB file integrity")
    
    # Try alternative restore method using redis-cli directly
    print("\n🔄 Trying alternative restore method...")
    alt_restore = """
    echo "=== Alternative restore method ==="
    
    # First, let's check if we can use redis-cli --pipe with the RDB file
    echo "Testing redis-cli --pipe with RDB file..."
    
    # Check file size
    FILE_SIZE=$(stat -c%s /opt/migration/backup/source-redis-backup-latest.rdb)
    echo "RDB file size: $FILE_SIZE bytes"
    
    # Try a small chunk first
    echo ""
    echo "Testing with first 1MB of RDB file..."
    head -c 1048576 /opt/migration/backup/source-redis-backup-latest.rdb | \
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' --pipe 2>&1 | head -10
    
    echo ""
    echo "If above works, we can try the full restore..."
    """
    
    output, error = run_command(client, alt_restore, "Try alternative restore")
    
    # Create a simpler restore script
    print("\n📝 Creating simpler restore script...")
    simple_script = """#!/bin/bash
# simple_restore.sh
# Simple RDB restore using dd for progress

set -e

echo "================================================"
echo "SIMPLE RDB RESTORE"
echo "================================================"
echo "Started: $(date)"
echo ""

SOURCE_RDB="/opt/migration/backup/source-redis-backup-latest.rdb"
TARGET_HOST="121.91.157.129"
TARGET_PORT="6379"
TARGET_PASSWORD="9zaHQvNEo5bXFJR3h"

if [ ! -f "$SOURCE_RDB" ]; then
    echo "❌ RDB file not found: $SOURCE_RDB"
    exit 1
fi

echo "📁 RDB file: $SOURCE_RDB"
FILE_SIZE=$(stat -c%s "$SOURCE_RDB")
echo "📊 Size: $((FILE_SIZE / 1024 / 1024)) MB"
echo "🎯 Target: $TARGET_HOST:$TARGET_PORT"
echo ""

# Verify target Redis
echo "🔍 Verifying target Redis..."
if ! redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" PING 2>/dev/null | grep -q "PONG"; then
    echo "❌ Target Redis not accessible"
    exit 1
fi
echo "✅ Target Redis is accessible"

# Flush target
echo "🗑️  Flushing target Redis..."
redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" FLUSHALL 2>&1
echo "✅ Target flushed"

# Get source key count
echo "📊 Source key count:"
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE)
echo "$SOURCE_KEYS keys"
echo ""

# Restore with progress
echo "🚀 Starting restore..."
echo "This will take several minutes..."
echo ""

START_TIME=$(date +%s)

# Use dd to show progress
dd if="$SOURCE_RDB" bs=1M 2>/dev/null | \
redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" --pipe 2>&1

RESTORE_STATUS=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "================================================"
echo "RESTORE COMPLETED"
echo "================================================"
echo "Exit code: $RESTORE_STATUS"
echo "Duration: $DURATION seconds"
echo ""

if [ $RESTORE_STATUS -eq 0 ]; then
    echo "✅ Restore completed successfully"
    
    # Verify
    echo ""
    echo "🔍 Verifying restore..."
    sleep 3
    
    TARGET_KEYS=$(redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" DBSIZE 2>/dev/null || echo "0")
    echo "Target keys: $TARGET_KEYS"
    echo "Source keys: $SOURCE_KEYS"
    
    if [ "$TARGET_KEYS" -eq "$SOURCE_KEYS" ]; then
        echo "🎉 SUCCESS: Key counts match!"
    else
        echo "⚠️  Key counts don't match"
        echo "Difference: $((SOURCE_KEYS - TARGET_KEYS)) keys"
    fi
    
else
    echo "❌ Restore failed with exit code: $RESTORE_STATUS"
    echo "Check error messages above"
fi

echo ""
echo "Finished at: $(date)"
"""
    
    write_script = f"""cd /opt/migration && \
cat > simple_restore.sh << 'EOF'
{simple_script}
EOF
chmod +x simple_restore.sh
echo "Simple restore script created: /opt/migration/simple_restore.sh"
echo "Run with: ./simple_restore.sh"
"""
    
    output, error = run_command(client, write_script, "Create simple restore script")
    
    client.close()
    
    print("\n" + "="*80)
    print("🔧 DEBUGGING COMPLETE")
    print("="*80)
    print("\n🎯 Issues found:")
    print("   1. RDB restore via --pipe is failing immediately")
    print("   2. Need to test connectivity and RDB file integrity")
    
    print("\n🚀 Next steps:")
    print("   1. Test Redis connectivity")
    print("   2. Verify RDB file is valid")
    print("   3. Try smaller restore test")
    print("   4. Use alternative method if needed")
    
    print("\n📋 Available scripts on mig_worker:")
    print("   /opt/migration/simple_restore.sh      # New simple restore")
    print("   /opt/migration/restore_rdb_fast.sh    # Original restore")
    print("   /opt/migration/monitor_restore.sh     # Monitor progress")
    print("   /opt/migration/quick_monitor.sh       # Quick status")
    
    print("\n🔧 To try restore again:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./simple_restore.sh")
    
    print("\n⚠️  If restore continues to fail:")
    print("   1. Check Redis password is correct")
    print("   2. Verify network connectivity")
    print("   3. Test with smaller RDB file")
    print("   4. Consider using RedisShake instead")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()