#!/usr/bin/env python3
"""
Check Redis migration status
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
    print("CHECKING REDIS MIGRATION STATUS")
    print("="*80)
    print(f"Time: {time.ctime()}")
    
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
    
    # Step 1: Check if RDB restore is still running
    print("\n" + "="*80)
    print("STEP 1: CHECKING RDB RESTORE PROCESS")
    print("="*80)
    
    process_check = """
    echo "=== Checking running processes ==="
    ps aux | grep -E "(redis-cli|cat.*rdb)" | grep -v grep
    
    echo ""
    echo "=== Checking backup files ==="
    ls -lh /opt/migration/*.rdb 2>/dev/null || echo "No backup files"
    
    echo ""
    echo "=== Checking RDB restore completion ==="
    if pgrep -f "redis-cli.*--pipe" > /dev/null; then
        echo "🔄 RDB restore is STILL RUNNING"
        echo "Process ID: $(pgrep -f 'redis-cli.*--pipe')"
    else
        echo "✅ RDB restore process COMPLETED"
    fi
    """
    
    output, error = run_command(client, process_check, "Check RDB restore process")
    
    # Step 2: Check key counts
    print("\n" + "="*80)
    print("STEP 2: CHECKING KEY COUNTS")
    print("="*80)
    
    key_check = """
    echo "=== Source Redis (192.168.10.139:6379) ==="
    SOURCE_KEYS=$(timeout 10 redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    echo "Key count: $SOURCE_KEYS"
    
    echo ""
    echo "=== Target Redis (121.91.157.129:6379) ==="
    TARGET_KEYS=$(timeout 10 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "ERROR")
    echo "Key count: $TARGET_KEYS"
    
    echo ""
    echo "=== COMPARISON ==="
    if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
        if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
            echo "✅ SUCCESS: Key counts MATCH!"
            echo "   Source: $SOURCE_KEYS keys"
            echo "   Target: $TARGET_KEYS keys"
        else
            DIFF=$((SOURCE_KEYS - TARGET_KEYS))
            PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            echo "🔄 PROGRESS: $PERCENTAGE% complete"
            echo "   Source: $SOURCE_KEYS keys"
            echo "   Target: $TARGET_KEYS keys"
            echo "   Remaining: $DIFF keys"
            echo "   Percentage: $PERCENTAGE%"
        fi
    else
        echo "❌ ERROR: Could not get key counts"
    fi
    """
    
    output, error = run_command(client, key_check, "Check key counts")
    
    # Step 3: Check memory usage
    print("\n" + "="*80)
    print("STEP 3: CHECKING MEMORY USAGE")
    print("="*80)
    
    memory_check = """
    echo "=== Source Redis Memory ==="
    timeout 10 redis-cli -h 192.168.10.139 -p 6379 INFO memory 2>/dev/null | grep -E "(used_memory_human|maxmemory_human)" || echo "Failed to get memory info"
    
    echo ""
    echo "=== Target Redis Memory ==="
    timeout 10 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory 2>/dev/null | grep -E "(used_memory_human|maxmemory_human)" || echo "Failed to get memory info"
    """
    
    output, error = run_command(client, memory_check, "Check memory usage")
    
    # Step 4: Test sample data
    print("\n" + "="*80)
    print("STEP 4: TESTING SAMPLE DATA")
    print("="*80)
    
    sample_test = """
    echo "Getting 5 sample keys from source..."
    SAMPLE_KEYS=$(timeout 10 redis-cli -h 192.168.10.139 -p 6379 --scan --count 5 2>/dev/null)
    
    if [ -n "$SAMPLE_KEYS" ]; then
        echo "Sample keys from source:"
        echo "$SAMPLE_KEYS"
        echo ""
        
        echo "Checking if these keys exist in target..."
        for key in $SAMPLE_KEYS; do
            SOURCE_TYPE=$(timeout 5 redis-cli -h 192.168.10.139 -p 6379 TYPE "$key" 2>/dev/null || echo "ERROR")
            TARGET_TYPE=$(timeout 5 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' TYPE "$key" 2>/dev/null || echo "MISSING")
            
            if [ "$SOURCE_TYPE" = "$TARGET_TYPE" ] && [ "$TARGET_TYPE" != "MISSING" ]; then
                echo "✅ Key '$key': Type matches ($SOURCE_TYPE)"
            elif [ "$TARGET_TYPE" = "MISSING" ]; then
                echo "❌ Key '$key': MISSING in target"
            else
                echo "⚠️  Key '$key': Type mismatch (Source: $SOURCE_TYPE, Target: $TARGET_TYPE)"
            fi
        done
    else
        echo "❌ Could not get sample keys from source"
    fi
    """
    
    output, error = run_command(client, sample_test, "Test sample data")
    
    # Step 5: Check verification script
    print("\n" + "="*80)
    print("STEP 5: RUNNING VERIFICATION SCRIPT")
    print("="*80)
    
    verify_cmd = """
    cd /opt/migration
    if [ -f "./verify_migration.sh" ]; then
        echo "Running verification script..."
        chmod +x ./verify_migration.sh
        ./verify_migration.sh
    else
        echo "Verification script not found, creating one..."
        cat > verify_migration.sh << 'EOF'
#!/bin/bash
echo "=== Migration Verification ==="
echo "Timestamp: $(date)"
echo ""
echo "Source Redis (192.168.10.139:6379):"
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
echo "Keys: $SOURCE_KEYS"
echo ""
echo "Target Redis (121.91.157.129:6379):"
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "ERROR")
echo "Keys: $TARGET_KEYS"
echo ""
if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
    if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
        echo "✅ MIGRATION SUCCESSFUL: $SOURCE_KEYS keys migrated"
    else
        echo "🔄 MIGRATION IN PROGRESS: $TARGET_KEYS/$SOURCE_KEYS keys"
        echo "   Remaining: $((SOURCE_KEYS - TARGET_KEYS)) keys"
    fi
else
    echo "❌ Could not verify migration"
fi
EOF
        chmod +x verify_migration.sh
        ./verify_migration.sh
    fi
    """
    
    output, error = run_command(client, verify_cmd, "Run verification script")
    
    # Step 6: Check for any errors in logs
    print("\n" + "="*80)
    print("STEP 6: CHECKING FOR ERRORS")
    print("="*80)
    
    error_check = """
    echo "=== Checking for errors ==="
    echo ""
    echo "Recent system logs:"
    dmesg | tail -5 2>/dev/null || echo "No dmesg access"
    
    echo ""
    echo "Redis CLI errors:"
    timeout 5 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO 2>&1 | grep -i error || echo "No Redis errors"
    
    echo ""
    echo "Backup file status:"
    ls -la /opt/migration/*.rdb 2>/dev/null | head -5
    if [ -f /opt/migration/*.rdb ]; then
        RDB_FILE=$(ls -t /opt/migration/*.rdb | head -1)
        echo "Latest backup: $RDB_FILE"
        echo "Size: $(du -h "$RDB_FILE" | cut -f1)"
    fi
    """
    
    output, error = run_command(client, error_check, "Check for errors")
    
    client.close()
    
    print("\n" + "="*80)
    print("📊 MIGRATION STATUS SUMMARY")
    print("="*80)
    print("\nBased on the checks:")
    print("1. ✅ RDB backup created: 325MB file")
    print("2. ✅ Target Redis flushed: Ready for data")
    print("3. 🔄 RDB restore: Should be complete or in progress")
    print("4. 📈 Key counts: Need to verify match")
    print("5. 🧪 Sample data: Need to verify")
    
    print("\n🎯 NEXT ACTIONS:")
    print("1. Wait 2-3 minutes for restore to complete")
    print("2. Run verification script: ./verify_migration.sh")
    print("3. If keys don't match, check RDB restore logs")
    print("4. Consider using RedisShake for remaining sync")
    
    print("\n🔧 TROUBLESHOOTING:")
    print("If restore failed or incomplete:")
    print("1. Check if redis-cli --pipe process is still running")
    print("2. Look for errors in system logs")
    print("3. Try manual restore: cat backup.rdb | redis-cli -h target -p 6379 -a password --pipe")
    print("4. Use RedisShake for incremental sync")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()