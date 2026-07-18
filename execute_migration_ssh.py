#!/usr/bin/env python3
"""
SSH to mig_worker and execute manual migration script
"""

import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command_with_output(client, command, description, timeout=300):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:80]}..." if len(command) > 80 else f"   Command: {command}")
    
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
    print("SSH TO MIG_WORKER AND EXECUTE MANUAL MIGRATION")
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
    
    # Step 1: Create the fixed migration script
    print("\n" + "="*80)
    print("STEP 1: CREATE MANUAL MIGRATION SCRIPT")
    print("="*80)
    
    script_content = """#!/bin/bash
# Manual Redis migration - FIXED VERSION

set -e

echo "================================================"
echo "MANUAL REDIS MIGRATION (FIXED)"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

# Configuration
SOURCE_HOST="192.168.10.139"
SOURCE_PORT="6379"
TARGET_HOST="121.91.157.129"
TARGET_PORT="6379"
PASSWORD="9zaHQvNEo5bXFJR3h"
LOG_FILE="/tmp/manual_migration_fixed_$(date +%s).log"

echo "Source: $SOURCE_HOST:$SOURCE_PORT"
echo "Target: $TARGET_HOST:$TARGET_PORT"
echo "Log: $LOG_FILE"
echo ""

# Step 1: Check connectivity
echo "=== Step 1: Connectivity Check ==="
echo "Checking source Redis..."
if redis-cli -h $SOURCE_HOST -p $SOURCE_PORT PING 2>/dev/null | grep -q PONG; then
    echo "✅ Source Redis accessible"
else
    echo "❌ Source Redis inaccessible"
    exit 1
fi

echo "Checking target Redis..."
if redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" PING 2>/dev/null | grep -q PONG; then
    echo "✅ Target Redis accessible"
else
    echo "❌ Target Redis inaccessible"
    exit 1
fi
echo ""

# Step 2: Check Redis versions and memory
echo "=== Step 2: Redis Info ==="
SOURCE_VERSION=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT INFO server | grep redis_version | cut -d: -f2)
TARGET_VERSION=$(redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" INFO server | grep redis_version | cut -d: -f2)
echo "Source Redis: $SOURCE_VERSION"
echo "Target Redis: $TARGET_VERSION"
echo ""

SOURCE_KEYS=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT DBSIZE)
SOURCE_MEMORY=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT INFO memory | grep used_memory_human | cut -d: -f2)
echo "Source keys: $SOURCE_KEYS"
echo "Source memory: $SOURCE_MEMORY"
echo ""

# Step 3: Check for existing RDB files
echo "=== Step 3: Checking for existing RDB files ==="
cd /opt/migration
RDB_FILES=$(ls -t *.rdb 2>/dev/null | head -5)

if [ -n "$RDB_FILES" ]; then
    echo "Found RDB files:"
    for file in $RDB_FILES; do
        SIZE=$(du -h "$file" | cut -f1)
        echo "  - $file ($SIZE)"
    done
    
    LATEST_RDB=$(ls -t *.rdb | head -1)
    echo ""
    echo "Using latest RDB: $LATEST_RDB ($(du -h "$LATEST_RDB" | cut -f1))"
    
    # Verify RDB
    if command -v redis-check-rdb &> /dev/null; then
        echo "Verifying RDB..."
        redis-check-rdb "$LATEST_RDB" 2>&1 | head -5
    fi
    RDB_FILE="$LATEST_RDB"
else
    echo "❌ No RDB files found in /opt/migration/"
    echo "Creating new RDB backup..."
    
    # Create RDB backup
    RDB_FILE="fresh_backup_$(date +%Y%m%d_%H%M%S).rdb"
    echo "Creating RDB: $RDB_FILE"
    redis-cli -h $SOURCE_HOST -p $SOURCE_PORT --rdb "/tmp/$RDB_FILE"
    
    if [ $? -eq 0 ] && [ -f "/tmp/$RDB_FILE" ]; then
        echo "✅ RDB created: /tmp/$RDB_FILE ($(du -h "/tmp/$RDB_FILE" | cut -f1))"
        # Move to migration directory
        mv "/tmp/$RDB_FILE" "/opt/migration/"
        RDB_FILE="/opt/migration/$RDB_FILE"
    else
        echo "❌ Failed to create RDB"
        exit 1
    fi
fi
echo ""

# Step 4: Flush target Redis
echo "=== Step 4: Flushing Target Redis ==="
echo "Flushing target Redis..."
redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" FLUSHALL 2>&1 | grep -v Warning
echo "✅ Target flushed"
echo ""

# Step 5: Restore RDB to target
echo "=== Step 5: Restoring RDB to Target ==="
echo "RDB file: $RDB_FILE"
echo "Size: $(du -h "$RDB_FILE" | cut -f1)"
echo "Estimated time: 5-10 minutes..."
echo ""

START_TIME=$(date +%s)
echo "Restore started at: $(date)"

# Method 1: Direct pipe with AUTH
echo "Starting restore..."
(
    echo "AUTH $PASSWORD"
    cat "$RDB_FILE"
) | redis-cli -h $TARGET_HOST -p $TARGET_PORT --pipe > "$LOG_FILE" 2>&1

RESTORE_EXIT=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Restore completed in $DURATION seconds"
echo "Exit code: $RESTORE_EXIT"
echo ""

# Step 6: Verification
echo "=== Step 6: Verification ==="
TARGET_KEYS=$(redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")

echo "Source keys: $SOURCE_KEYS"
echo "Target keys: $TARGET_KEYS"

if [ "$SOURCE_KEYS" = "$TARGET_KEYS" ]; then
    echo "✅ SUCCESS: All $SOURCE_KEYS keys migrated!"
    
    # Test sample keys
    echo ""
    echo "=== Testing sample data ==="
    SAMPLE_KEYS=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT --scan --count 3 2>/dev/null)
    
    if [ -n "$SAMPLE_KEYS" ]; then
        echo "Sample keys from source:"
        for key in $SAMPLE_KEYS; do
            EXISTS=$(redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$PASSWORD" EXISTS "$key" 2>/dev/null || echo "0")
            if [ "$EXISTS" -eq 1 ]; then
                echo "  ✅ $key"
            else
                echo "  ❌ $key"
            fi
        done
    fi
else
    echo "❌ FAILED: Key mismatch"
    echo "Difference: $((SOURCE_KEYS - TARGET_KEYS)) keys"
    echo ""
    echo "=== Error log (last 30 lines) ==="
    tail -30 "$LOG_FILE"
    
    # Try alternative method if pipe failed
    if [ $RESTORE_EXIT -ne 0 ]; then
        echo ""
        echo "=== Trying alternative restore method ==="
        echo "Using redis-cli with --rdb flag..."
        
        # Copy RDB to target Redis data directory method
        echo "This method requires SSH access to target Redis server"
        echo "Manual steps required:"
        echo "1. SSH to target Redis server"
        echo "2. Stop Redis service"
        echo "3. Replace dump.rdb with $RDB_FILE"
        echo "4. Start Redis service"
    fi
fi

echo ""
echo "=== Summary ==="
echo "RDB file: $RDB_FILE"
echo "Log file: $LOG_FILE"
echo "Duration: $DURATION seconds"
echo "Restore exit code: $RESTORE_EXIT"
echo "Source keys: $SOURCE_KEYS"
echo "Target keys: $TARGET_KEYS"

if [ $RESTORE_EXIT -eq 0 ] && [ "$SOURCE_KEYS" = "$TARGET_KEYS" ]; then
    echo "🎉 MIGRATION SUCCESSFUL!"
else
    echo "⚠️  Migration issues detected"
    echo "Check $LOG_FILE for details"
fi

echo "================================================"
"""
    
    create_script = f"""cd /opt/migration
cat > manual_migrate_fixed.sh << 'SCRIPT_EOF'
{script_content}
SCRIPT_EOF

chmod +x manual_migrate_fixed.sh
echo "✅ Script created: /opt/migration/manual_migrate_fixed.sh"
ls -la manual_migrate_fixed.sh
"""
    
    output, error, exit_code = run_command_with_output(client, create_script, "Create migration script")
    
    # Step 2: Run the migration script
    print("\n" + "="*80)
    print("STEP 2: EXECUTE MIGRATION SCRIPT")
    print("="*80)
    
    run_script = """
    cd /opt/migration
    echo "=== Starting manual migration ==="
    echo ""
    ./manual_migrate_fixed.sh
    """
    
    # Run with longer timeout since migration takes time
    output, error, exit_code = run_command_with_output(client, run_script, "Execute migration script", timeout=600)
    
    # Step 3: Check results
    print("\n" + "="*80)
    print("STEP 3: CHECK MIGRATION RESULTS")
    print("="*80)
    
    check_results = """
    echo "=== Checking migration results ==="
    echo ""
    
    # Check for log files
    echo "Log files:"
    ls -la /tmp/manual_migration_*.log 2>/dev/null | head -5
    
    echo ""
    echo "=== Latest log ==="
    LATEST_LOG=$(ls -t /tmp/manual_migration_*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "Last 20 lines of $LATEST_LOG:"
        tail -20 "$LATEST_LOG"
    else
        echo "No log files found"
    fi
    
    echo ""
    echo "=== Current key counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")
    
    echo "Source Redis: $SOURCE_KEYS keys"
    echo "Target Redis: $TARGET_KEYS keys"
    
    if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
        if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
            echo "✅ MIGRATION SUCCESSFUL!"
            echo "All $SOURCE_KEYS keys migrated"
        else
            echo "⚠️  Partial migration"
            echo "Difference: $((SOURCE_KEYS - TARGET_KEYS)) keys"
        fi
    fi
    
    echo ""
    echo "=== Test write/read ==="
    TEST_KEY="migration_test_$(date +%s)"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' SET "$TEST_KEY" "test_value_$(date)" 2>/dev/null
    TEST_VALUE=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' GET "$TEST_KEY" 2>/dev/null)
    
    if [ -n "$TEST_VALUE" ]; then
        echo "✅ Target Redis is working"
        echo "Test key: $TEST_KEY = $TEST_VALUE"
    else
        echo "❌ Target Redis may have issues"
    fi
    
    echo ""
    echo "=== RDB files ==="
    ls -lh /opt/migration/*.rdb 2>/dev/null || echo "No RDB files"
    """
    
    output, error, exit_code = run_command_with_output(client, check_results, "Check migration results")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ MIGRATION EXECUTION COMPLETE")
    print("="*80)
    
    print("\n📊 Summary:")
    print("   1. ✅ Migration script created: /opt/migration/manual_migrate_fixed.sh")
    print("   2. ✅ Script executed with timeout of 10 minutes")
    print("   3. ✅ Results checked")
    
    print("\n🎯 Next steps:")
    print("   1. Check the output above for success/failure")
    print("   2. If migration failed, check /tmp/manual_migration_*.log")
    print("   3. Verify key counts match")
    print("   4. Test application connectivity to target Redis")
    
    print("\n🔧 If migration failed:")
    print("   - Check authentication: redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' PING")
    print("   - Check RDB file: redis-check-rdb /opt/migration/*.rdb")
    print("   - Try alternative method with key-by-key migration")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()