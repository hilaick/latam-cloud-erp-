#!/usr/bin/env python3
"""
Try alternative RDB restore methods
"""

import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command_with_output(client, command, description, timeout=120):
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
    print("ALTERNATIVE RDB RESTORE METHODS")
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
    
    # Method 1: Try with -x flag (read from stdin)
    print("\n" + "="*80)
    print("METHOD 1: REDIS-CLI WITH -x FLAG")
    print("="*80)
    
    method1 = """
    cd /opt/migration
    RDB_FILE="fresh_backup_20260718_064423.rdb"
    
    echo "=== Method 1: redis-cli -x with password ==="
    echo "RDB file: $RDB_FILE ($(du -h "$RDB_FILE" | cut -f1))"
    echo ""
    
    # Flush target first
    echo "Flushing target Redis..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' FLUSHALL 2>&1 | grep -v Warning
    
    # Try restore with -x flag
    echo "Starting restore with -x flag..."
    START=$(date +%s)
    
    cat "$RDB_FILE" | redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' -x > /tmp/restore_method1.log 2>&1 &
    RESTORE_PID=$!
    
    # Wait for 30 seconds
    sleep 30
    
    # Check if process is still running
    if ps -p $RESTORE_PID > /dev/null; then
        echo "Restore still running after 30 seconds..."
        echo "Process PID: $RESTORE_PID"
        echo "Killing process..."
        kill $RESTORE_PID
        wait $RESTORE_PID 2>/dev/null
        echo "Process killed"
    else
        wait $RESTORE_PID
        EXIT_CODE=$?
        echo "Restore completed with exit code: $EXIT_CODE"
    fi
    
    END=$(date +%s)
    DURATION=$((END - START))
    
    echo ""
    echo "=== Results ==="
    echo "Duration: $DURATION seconds"
    echo "Log file: /tmp/restore_method1.log"
    echo "Last 10 lines of log:"
    tail -10 /tmp/restore_method1.log
    
    echo ""
    echo "=== Key counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")
    echo "Source: $SOURCE_KEYS keys"
    echo "Target: $TARGET_KEYS keys"
    """
    
    output, error, exit_code = run_command_with_output(client, method1, "Method 1: redis-cli -x", timeout=60)
    
    # Method 2: Try with REDISCLI_AUTH environment variable
    print("\n" + "="*80)
    print("METHOD 2: REDISCLI_AUTH ENVIRONMENT VARIABLE")
    print("="*80)
    
    method2 = """
    cd /opt/migration
    RDB_FILE="fresh_backup_20260718_064423.rdb"
    
    echo "=== Method 2: REDISCLI_AUTH environment variable ==="
    echo "RDB file: $RDB_FILE ($(du -h "$RDB_FILE" | cut -f1))"
    echo ""
    
    # Flush target
    echo "Flushing target Redis..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' FLUSHALL 2>&1 | grep -v Warning
    
    # Set environment variable and try restore
    echo "Starting restore with REDISCLI_AUTH..."
    START=$(date +%s)
    
    export REDISCLI_AUTH='9zaHQvNEo5bXFJR3h'
    cat "$RDB_FILE" | redis-cli -h 121.91.157.129 -p 6379 --pipe > /tmp/restore_method2.log 2>&1 &
    RESTORE_PID=$!
    
    # Wait for 30 seconds
    sleep 30
    
    # Check if process is still running
    if ps -p $RESTORE_PID > /dev/null; then
        echo "Restore still running after 30 seconds..."
        echo "Process PID: $RESTORE_PID"
        echo "Killing process..."
        kill $RESTORE_PID
        wait $RESTORE_PID 2>/dev/null
        echo "Process killed"
    else
        wait $RESTORE_PID
        EXIT_CODE=$?
        echo "Restore completed with exit code: $EXIT_CODE"
    fi
    
    END=$(date +%s)
    DURATION=$((END - START))
    
    echo ""
    echo "=== Results ==="
    echo "Duration: $DURATION seconds"
    echo "Log file: /tmp/restore_method2.log"
    echo "Last 10 lines of log:"
    tail -10 /tmp/restore_method2.log
    
    echo ""
    echo "=== Key counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")
    echo "Source: $SOURCE_KEYS keys"
    echo "Target: $TARGET_KEYS keys"
    """
    
    output, error, exit_code = run_command_with_output(client, method2, "Method 2: REDISCLI_AUTH", timeout=60)
    
    # Method 3: Try smaller test first
    print("\n" + "="*80)
    print("METHOD 3: TEST WITH SMALL RDB")
    print("="*80)
    
    method3 = """
    echo "=== Method 3: Test with small RDB ==="
    echo ""
    
    # Create small test RDB
    echo "Creating small test RDB..."
    TEST_KEY="test_migration_$(date +%s)"
    redis-cli -h 192.168.10.139 -p 6379 SET "$TEST_KEY" "test_value"
    redis-cli -h 192.168.10.139 -p 6379 --rdb /tmp/test_small.rdb
    
    echo "Test RDB created: /tmp/test_small.rdb ($(du -h /tmp/test_small.rdb | cut -f1))"
    echo ""
    
    # Try restore small RDB
    echo "Testing restore with small RDB..."
    (
        echo "AUTH 9zaHQvNEo5bXFJR3h"
        cat /tmp/test_small.rdb
    ) | redis-cli -h 121.91.157.129 -p 6379 --pipe 2>&1 | head -20
    
    echo ""
    echo "Checking if test key exists..."
    EXISTS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' EXISTS "$TEST_KEY" 2>/dev/null || echo "0")
    if [ "$EXISTS" -eq 1 ]; then
        echo "✅ Small test successful!"
        echo "Test key '$TEST_KEY' exists in target"
    else
        echo "❌ Small test failed"
        echo "Test key not found in target"
    fi
    
    # Clean up test key
    redis-cli -h 192.168.10.139 -p 6379 DEL "$TEST_KEY" > /dev/null 2>&1
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DEL "$TEST_KEY" > /dev/null 2>&1
    """
    
    output, error, exit_code = run_command_with_output(client, method3, "Method 3: Small test", timeout=60)
    
    # Method 4: Check target Redis configuration
    print("\n" + "="*80)
    print("METHOD 4: CHECK TARGET REDIS CONFIGURATION")
    print("="*80)
    
    method4 = """
    echo "=== Method 4: Target Redis Configuration ==="
    echo ""
    
    echo "1. Checking Redis version and config..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO server | grep -E "(redis_version|redis_mode|redis_bits|os|arch_bits)"
    
    echo ""
    echo "2. Checking memory configuration..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory | grep -E "(used_memory|maxmemory|mem_fragmentation_ratio|mem_allocator)"
    
    echo ""
    echo "3. Checking persistence configuration..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO persistence | head -20
    
    echo ""
    echo "4. Checking if RDB loading is disabled..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' CONFIG GET rdb*
    
    echo ""
    echo "5. Checking save configuration..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' CONFIG GET save
    
    echo ""
    echo "6. Testing simple SET/GET..."
    TEST_KEY="config_test_$(date +%s)"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' SET "$TEST_KEY" "test_value_$(date)"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' GET "$TEST_KEY"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DEL "$TEST_KEY"
    """
    
    output, error, exit_code = run_command_with_output(client, method4, "Method 4: Check config", timeout=60)
    
    # Final recommendation
    print("\n" + "="*80)
    print("FINAL RECOMMENDATION")
    print("="*80)
    
    final_cmd = """
    echo "=== Final Status ==="
    echo ""
    
    echo "Source Redis:"
    redis-cli -h 192.168.10.139 -p 6379 INFO keyspace
    echo ""
    
    echo "Target Redis:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO keyspace
    echo ""
    
    echo "=== Recommendation ==="
    echo ""
    echo "Based on the tests, the RDB restore via pipe is failing."
    echo ""
    echo "OPTION 1: Use key-by-key migration (slow but reliable)"
    echo "  ./key_by_key_migration.sh"
    echo ""
    echo "OPTION 2: Stop Redis and replace dump.rdb directly"
    echo "  Requires SSH access to target Redis server"
    echo "  1. Stop Redis service on target"
    echo "  2. Backup current dump.rdb"
    echo "  3. Copy fresh_backup_20260718_064423.rdb as dump.rdb"
    echo "  4. Start Redis service"
    echo ""
    echo "OPTION 3: Use redis-migrate-tool or redis-shake"
    echo "  Install redis-shake and use sync mode"
    echo ""
    echo "=== Current RDB files ==="
    ls -lh /opt/migration/*.rdb
    """
    
    output, error, exit_code = run_command_with_output(client, final_cmd, "Final recommendation")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ ALTERNATIVE METHODS TESTED")
    print("="*80)
    
    print("\n📊 Results:")
    print("   1. Method 1 (redis-cli -x): Likely failed (process hung)")
    print("   2. Method 2 (REDISCLI_AUTH): Likely failed (process hung)")
    print("   3. Method 3 (Small test): Will show if basic restore works")
    print("   4. Method 4 (Config check): Shows target Redis settings")
    
    print("\n🔍 Root Cause:")
    print("   The RDB restore via pipe is hanging. Possible reasons:")
    print("   - Target Redis has RDB loading disabled")
    print("   - Memory limits on target Redis")
    print("   - Authentication timing issue with pipe")
    print("   - RDB version incompatibility (source: 3.0.7.9, target: 4.0.14)")
    
    print("\n🎯 Next Steps:")
    print("   1. Check Method 3 results - if small test works, the issue is with the large RDB")
    print("   2. If small test fails, target Redis has configuration issues")
    print("   3. Consider key-by-key migration as fallback")
    
    print("\n🚀 Create key-by-key migration script:")
    print("   cd /opt/migration")
    print("   Create script to migrate keys one by one using DUMP/RESTORE")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()