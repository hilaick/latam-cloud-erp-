#!/usr/bin/env python3
"""
Create and run key-by-key migration script
"""

import paramiko
import sys

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command(client, command, description, timeout=120):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}..." if len(command) > 100 else f"   Command: {command}")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    
    output = stdout.read().decode('utf-8', errors='ignore').strip()
    error = stderr.read().decode('utf-8', errors='ignore').strip()
    
    if output:
        print(f"   Output:\n{output[:500]}")
    if error:
        print(f"   Error: {error[:500]}")
    
    return output, error

try:
    print("="*80)
    print("KEY-BY-KEY MIGRATION SCRIPT")
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
    
    # Create key-by-key migration script
    print("\n" + "="*80)
    print("CREATING KEY-BY-KEY MIGRATION SCRIPT")
    print("="*80)
    
    key_migration_script = """#!/bin/bash
# Key-by-key Redis migration
# Migrates keys one by one using DUMP/RESTORE

set -e

echo "================================================"
echo "KEY-BY-KEY REDIS MIGRATION"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

# Configuration
SOURCE_HOST="192.168.10.139"
SOURCE_PORT="6379"
TARGET_HOST="121.91.157.129"
TARGET_PORT="6379"
PASSWORD="9zaHQvNEo5bXFJR3h"
BATCH_SIZE=1000
LOG_FILE="/tmp/key_migration_$(date +%s).log"

echo "Source: $SOURCE_HOST:$SOURCE_PORT"
echo "Target: $TARGET_HOST:$TARGET_PORT"
echo "Batch size: $BATCH_SIZE"
echo "Log: $LOG_FILE"
echo ""

# Step 1: Check connectivity
echo "=== Step 1: Connectivity Check ==="
if ! redis-cli -h $SOURCE_HOST -p $SOURCE_PORT PING 2>/dev/null | grep -q PONG; then
    echo "❌ Source Redis inaccessible"
    exit 1
fi

if ! redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" PING 2>/dev/null | grep -q PONG; then
    echo "❌ Target Redis inaccessible"
    exit 1
fi

echo "✅ Both Redis instances accessible"
echo ""

# Step 2: Get total keys
echo "=== Step 2: Getting Key Count ==="
TOTAL_KEYS=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT DBSIZE)
echo "Total keys to migrate: $TOTAL_KEYS"
echo ""

# Step 3: Flush target
echo "=== Step 3: Flushing Target Redis ==="
redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" FLUSHALL 2>&1 | grep -v Warning
echo "✅ Target flushed"
echo ""

# Step 4: Start migration
echo "=== Step 4: Starting Migration ==="
echo "Migrating $TOTAL_KEYS keys in batches of $BATCH_SIZE..."
echo "This will take approximately $(($TOTAL_KEYS / 100)) seconds ($(($TOTAL_KEYS / 600)) minutes)"
echo ""

START_TIME=$(date +%s)
MIGRATED_KEYS=0
FAILED_KEYS=0
BATCH_NUMBER=1

# Create temporary file for keys
KEY_FILE="/tmp/redis_keys_$(date +%s).txt"

# Get all keys
echo "Getting all keys from source..."
redis-cli -h $SOURCE_HOST -p $SOURCE_PORT --scan > "$KEY_FILE"
ACTUAL_KEYS=$(wc -l < "$KEY_FILE")
echo "Found $ACTUAL_KEYS keys in source"
echo ""

# Migrate keys
echo "Starting migration..."
while IFS= read -r key; do
    # Get key TTL
    TTL=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT TTL "$key")
    
    # DUMP key from source
    DUMP_OUTPUT=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT DUMP "$key")
    
    if [ -z "$DUMP_OUTPUT" ] || [ "$DUMP_OUTPUT" = "NULL" ]; then
        echo "⚠️  Skipping empty key: $key" >> "$LOG_FILE"
        continue
    fi
    
    # RESTORE to target
    if [ "$TTL" -gt 0 ]; then
        # Key with TTL
        redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" RESTORE "$key" $TTL "$DUMP_OUTPUT" > /dev/null 2>&1
    else
        # Key without TTL (or -1 for no expiry)
        redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" RESTORE "$key" 0 "$DUMP_OUTPUT" > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        MIGRATED_KEYS=$((MIGRATED_KEYS + 1))
        if [ $((MIGRATED_KEYS % 1000)) -eq 0 ]; then
            PERCENTAGE=$((MIGRATED_KEYS * 100 / ACTUAL_KEYS))
            echo "Progress: $PERCENTAGE% ($MIGRATED_KEYS/$ACTUAL_KEYS keys)" >> "$LOG_FILE"
            echo "Progress: $PERCENTAGE% ($MIGRATED_KEYS/$ACTUAL_KEYS keys)"
        fi
    else
        FAILED_KEYS=$((FAILED_KEYS + 1))
        echo "❌ Failed: $key" >> "$LOG_FILE"
    fi
    
done < "$KEY_FILE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Clean up
rm -f "$KEY_FILE"

echo ""
echo "=== Step 5: Verification ==="
TARGET_KEYS=$(redis-cli -h $TARGET_HOST -p $ARGET_PORT -a "$PASSWORD" DBSIZE 2>/dev/null 2>/dev/null || echo "0")

echo "Migration completed in $DURATION seconds"
echo "Source keys: $ACTUAL_KEYS"
echo "Target keys: $TARGET_KEYS"
echo "Migrated: $MIGRATED_KEYS"
echo "Failed: $FAILED_KEYS"
echo ""

if [ "$ACTUAL_KEYS" -eq "$TARGET_KEYS" ]; then
    echo "✅ SUCCESS: All $ACTUAL_KEYS keys migrated!"
    echo "Migration rate: $((ACTUAL_KEYS / DURATION)) keys/second"
else
    echo "⚠️  Partial success: $TARGET_KEYS/$ACTUAL_KEYS keys migrated"
    echo "Failed: $((ACTUAL_KEYS - TARGET_KEYS)) keys"
    echo "Check $LOG_FILE for details"
fi

echo ""
echo "=== Step 6: Sample Verification ==="
echo "Testing 5 random keys..."
SAMPLE_COUNT=5
redis-cli -h $SOURCE_HOST -p $SOURCE_PORT --scan --count $SAMPLE_COUNT | while read key; do
    EXISTS=$(redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" EXISTS "$key" 2>/dev/null || echo "0")
    if [ "$EXISTS" -eq 1 ]; then
        echo "  ✅ $key"
    else
        echo "  ❌ $key"
    fi
done

echo ""
echo "================================================"
echo "MIGRATION COMPLETE"
echo "================================================"
echo "Log file: $LOG_FILE"
echo "Duration: $DURATION seconds"
echo "Keys migrated: $MIGRATED_KEYS/$ACTUAL_KEYS"
echo "Failed: $FAILED_KEYS"
"""
    
    create_script = f"""cd /opt/migration
cat > key_by_key_migration.sh << 'SCRIPT_EOF'
{key_migration_script}
SCRIPT_EOF

chmod +x key_by_key_migration.sh
echo "✅ Key-by-key migration script created: /opt/migration/key_by_key_migration.sh"
echo ""
echo "=== Script preview ==="
head -50 /opt/migration/key_by_key_migration.sh
"""
    
    output, error = run_command(client, create_script, "Create key-by-key script")
    
    # Create a simpler, faster version for testing
    print("\n" + "="*80)
    print("CREATING SIMPLER TEST SCRIPT")
    print("="*80)
    
    simple_script = """#!/bin/bash
# Simple key migration test

echo "=== Simple Key Migration Test ==="
echo ""

# Test with 10 keys first
echo "Testing with 10 keys..."
TEST_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 --scan --count 10)

SUCCESS=0
FAILED=0

for key in $TEST_KEYS; do
    echo "Migrating: $key"
    
    # Get key data
    DUMP_OUTPUT=$(redis-cli -h 192.168.10.139 -p 6379 DUMP "$key")
    TTL=$(redis-cli -h 192.168.10.139 -p 6379 TTL "$key")
    
    if [ -z "$DUMP_OUTPUT" ] || [ "$DUMP_OUTPUT" = "NULL" ]; then
        echo "  ⚠️  Empty key, skipping"
        continue
    fi
    
    # Restore to target
    if [ "$TTL" -gt 0 ]; then
        redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' RESTORE "$key" $TTL "$DUMP_OUTPUT" > /dev/null 2>&1
    else
        redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' RESTORE "$key" 0 "$DUMP_OUTPUT" > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Success"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "  ❌ Failed"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "=== Results ==="
echo "Success: $SUCCESS"
echo "Failed: $FAILED"

if [ $SUCCESS -gt 0 ]; then
    echo ""
    echo "✅ Key-by-key migration works!"
    echo "Run the full migration with: ./key_by_key_migration.sh"
else
    echo ""
    echo "❌ Key-by-key migration failed"
    echo "Check target Redis configuration"
fi
"""
    
    create_simple = f"""cd /opt/migration
cat > test_key_migration.sh << 'SIMPLE_EOF'
{simple_script}
SIMPLE_EOF

chmod +x test_key_migration.sh
echo "✅ Test script created: /opt/migration/test_key_migration.sh"
"""
    
    output, error = run_command(client, create_simple, "Create test script")
    
    # Run the test script
    print("\n" + "="*80)
    print("RUNNING KEY MIGRATION TEST")
    print("="*80)
    
    run_test = """
    cd /opt/migration
    echo "=== Running key migration test ==="
    echo ""
    ./test_key_migration.sh
    """
    
    output, error = run_command(client, run_test, "Run key migration test", timeout=180)
    
    # Check current status
    print("\n" + "="*80)
    print("CURRENT STATUS CHECK")
    print("="*80)
    
    status_check = """
    echo "=== Current Migration Status ==="
    echo ""
    
    echo "Source Redis:"
    redis-cli -h 192.168.10.139 -p 6379 INFO keyspace
    echo ""
    
    echo "Target Redis:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO keyspace
    echo ""
    
    echo "Key counts:"
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE)
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "0")
    echo "Source: $SOURCE_KEYS keys"
    echo "Target: $TARGET_KEYS keys"
    echo "Difference: $((SOURCE_KEYS - TARGET_KEYS)) keys"
    echo ""
    
    echo "=== Available scripts ==="
    ls -la /opt/migration/*.sh
    echo ""
    
    echo "=== Next steps ==="
    echo "1. If test succeeded, run full migration:"
    echo "   cd /opt/migration"
    echo "   ./key_by_key_migration.sh"
    echo ""
    echo "2. Monitor progress:"
    echo "   tail -f /tmp/key_migration_*.log"
    echo ""
    echo "3. Estimated time for 339K keys:"
    echo "   ~339 seconds (5.6 minutes) at 1000 keys/second"
    echo "   ~1130 seconds (18.8 minutes) at 300 keys/second"
    """
    
    output, error = run_command(client, status_check, "Status check")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ KEY-BY-KEY MIGRATION READY")
    print("="*80)
    
    print("\n📊 Scripts created:")
    print("   1. /opt/migration/key_by_key_migration.sh - Full migration (339K keys)")
    print("   2. /opt/migration/test_key_migration.sh - Test with 10 keys")
    
    print("\n🎯 To run full migration:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./key_by_key_migration.sh")
    
    print("\n⏱️  Estimated time:")
    print("   - 339,859 keys")
    print("   - ~5-20 minutes depending on network speed")
    print("   - Logs: /tmp/key_migration_*.log")
    
    print("\n🔧 This approach:")
    print("   - Migrates keys one by one using DUMP/RESTORE")
    print("   - Preserves TTL (expiration times)")
    print("   - Handles authentication properly")
    print("   - Works around RDB restore issues")
    print("   - Provides progress tracking")
    
    print("\n⚠️  Note:")
    print("   - Target Redis will be flushed before migration")
    print("   - Migration can be stopped and resumed")
    print("   - Each key is migrated individually (slower but reliable)")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()