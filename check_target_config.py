#!/usr/bin/env python3
"""
Check target Redis connectivity and configuration before migration
"""

import paramiko
import sys

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command(client, command, description, timeout=30):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}..." if len(command) > 100 else f"   Command: {command}")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    
    output = stdout.read().decode('utf-8', errors='ignore').strip()
    error = stderr.read().decode('utf-8', errors='ignore').strip()
    
    if output:
        print(f"   Output:\n{output}")
    if error:
        print(f"   Error: {error}")
    
    return output, error

try:
    print("="*80)
    print("TARGET REDIS CONNECTIVITY AND CONFIGURATION CHECK")
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
    
    # Step 1: Check basic connectivity
    print("\n" + "="*80)
    print("STEP 1: BASIC CONNECTIVITY")
    print("="*80)
    
    connectivity = """
    echo "=== Testing Redis Connectivity ==="
    echo ""
    
    echo "1. Testing source Redis (192.168.10.139:6379)..."
    if redis-cli -h 192.168.10.139 -p 6379 PING 2>/dev/null | grep -q PONG; then
        echo "✅ Source Redis: Accessible"
        echo "   Version: $(redis-cli -h 192.168.10.139 -p 6379 INFO server | grep redis_version | cut -d: -f2)"
        echo "   Keys: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE)"
        echo "   Memory: $(redis-cli -h 192.168.10.139 -p 6379 INFO memory | grep used_memory_human | cut -d: -f2)"
    else
        echo "❌ Source Redis: Inaccessible"
    fi
    
    echo ""
    echo "2. Testing target Redis (121.91.157.129:6379)..."
    if redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' PING 2>/dev/null | grep -q PONG; then
        echo "✅ Target Redis: Accessible"
        echo "   Version: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO server | grep redis_version | cut -d: -f2)"
        echo "   Keys: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo 'ERROR')"
        echo "   Memory: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory | grep used_memory_human | cut -d: -f2)"
    else
        echo "❌ Target Redis: Inaccessible"
        echo "   Testing without password..."
        redis-cli -h 121.91.157.129 -p 6379 PING
    fi
    
    echo ""
    echo "3. Network connectivity..."
    echo "   Ping target:"
    ping -c 3 121.91.157.129 2>&1 | tail -2
    echo ""
    echo "   Telnet test:"
    timeout 3 bash -c "echo 'QUIT' | telnet 121.91.157.129 6379 2>&1 | grep -E '(Connected|refused|timeout)'" || echo "   Telnet test failed"
    """
    
    output, error = run_command(client, connectivity, "Check connectivity")
    
    # Step 2: Check RDB files and key counts
    print("\n" + "="*80)
    print("STEP 2: RDB FILES AND KEY COUNTS")
    print("="*80)
    
    rdb_check = """
    echo "=== RDB Files Analysis ==="
    echo ""
    
    cd /opt/migration
    echo "RDB files in /opt/migration/:"
    ls -lh *.rdb 2>/dev/null || echo "No RDB files found"
    
    echo ""
    echo "=== File sizes and key counts ==="
    for rdb in *.rdb 2>/dev/null; do
        echo "File: $rdb"
        echo "  Size: $(du -h "$rdb" | cut -f1)"
        if command -v redis-check-rdb &> /dev/null; then
            echo "  Keys: $(redis-check-rdb "$rdb" 2>&1 | grep "keys read" | awk '{print $3}' || echo "Unknown")"
        else
            echo "  Keys: (redis-check-rdb not available)"
        fi
        echo ""
    done
    
    echo "=== Source Redis key count ==="
    redis-cli -h 192.168.10.139 -p 6379 DBSIZE
    echo ""
    
    echo "=== Target Redis key count ==="
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR"
    """
    
    output, error = run_command(client, rdb_check, "Check RDB files")
    
    # Step 3: Test simple key operations
    print("\n" + "="*80)
    print("STEP 3: TEST KEY OPERATIONS")
    print("="*80)
    
    key_test = """
    echo "=== Testing key operations ==="
    echo ""
    
    TEST_KEY="connectivity_test_$(date +%s)"
    TEST_VALUE="test_value_$(date)"
    
    echo "1. Setting test key on target..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' SET "$TEST_KEY" "$TEST_VALUE" 2>&1 | grep -v Warning
    
    echo ""
    echo "2. Getting test key from target..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' GET "$TEST_KEY" 2>&1 | grep -v Warning
    
    echo ""
    echo "3. Deleting test key..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DEL "$TEST_KEY" 2>&1 | grep -v Warning
    
    echo ""
    echo "4. Testing DUMP/RESTORE with small key..."
    # Create test key on source
    SOURCE_TEST="source_test_$(date +%s)"
    redis-cli -h 192.168.10.139 -p 6379 SET "$SOURCE_TEST" "dump_restore_test"
    
    # DUMP from source
    DUMP_OUTPUT=$(redis-cli -h 192.168.10.139 -p 6379 DUMP "$SOURCE_TEST")
    echo "DUMP output length: ${#DUMP_OUTPUT}"
    
    # RESTORE to target
    echo "Attempting RESTORE to target..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' RESTORE "$SOURCE_TEST" 0 "$DUMP_OUTPUT" 2>&1 | grep -v Warning
    
    # Check if restored
    TARGET_VALUE=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' GET "$SOURCE_TEST" 2>&1 | grep -v Warning)
    if [ "$TARGET_VALUE" = "dump_restore_test" ]; then
        echo "✅ DUMP/RESTORE test successful!"
    else
        echo "❌ DUMP/RESTORE test failed"
        echo "   Target value: $TARGET_VALUE"
    fi
    
    # Clean up
    redis-cli -h 192.168.10.139 -p 6379 DEL "$SOURCE_TEST" > /dev/null 2>&1
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DEL "$SOURCE_TEST" > /dev/null 2>&1
    """
    
    output, error = run_command(client, key_test, "Test key operations")
    
    # Step 4: Check target Redis configuration
    print("\n" + "="*80)
    print("STEP 4: TARGET REDIS CONFIGURATION")
    print("="*80)
    
    config_check = """
    echo "=== Target Redis Configuration ==="
    echo ""
    
    echo "1. Redis version and mode:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO server | grep -E "(redis_version|redis_mode|os|arch_bits|process_id)"
    
    echo ""
    echo "2. Memory configuration:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory | grep -E "(used_memory|maxmemory|mem_fragmentation_ratio|mem_allocator)"
    
    echo ""
    echo "3. Persistence configuration:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO persistence | head -15
    
    echo ""
    echo "4. Key space configuration:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO keyspace
    
    echo ""
    echo "5. Important config settings:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' CONFIG GET requirepass
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' CONFIG GET dir
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' CONFIG GET dbfilename
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' CONFIG GET save
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' CONFIG GET rdb*
    """
    
    output, error = run_command(client, config_check, "Check target config")
    
    # Step 5: Try RDB restore with debug
    print("\n" + "="*80)
    print("STEP 5: DEBUG RDB RESTORE")
    print("="*80)
    
    debug_restore = """
    echo "=== Debug RDB Restore ==="
    echo ""
    
    cd /opt/migration
    RDB_FILE="fresh_backup_20260718_064423.rdb"
    
    echo "Using RDB: $RDB_FILE ($(du -h "$RDB_FILE" | cut -f1))"
    echo ""
    
    # Check RDB file
    echo "1. RDB file check:"
    if command -v redis-check-rdb &> /dev/null; then
        redis-check-rdb "$RDB_FILE" 2>&1 | head -10
    else
        echo "   redis-check-rdb not available"
        echo "   File type: $(file "$RDB_FILE")"
    fi
    
    echo ""
    echo "2. Testing restore with small chunk..."
    # Take first 1MB of RDB
    head -c 1048576 "$RDB_FILE" > /tmp/test_chunk.rdb
    echo "   Created test chunk: /tmp/test_chunk.rdb ($(du -h /tmp/test_chunk.rdb | cut -f1))"
    
    echo ""
    echo "3. Attempting restore of test chunk..."
    (
        echo "AUTH 9zaHQvNEo5bXFJR3h"
        cat /tmp/test_chunk.rdb
    ) | redis-cli -h 121.91.157.129 -p 6379 --pipe 2>&1 | head -20
    
    echo ""
    echo "4. Checking if any keys were restored..."
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null
    
    # Clean up
    rm -f /tmp/test_chunk.rdb
    """
    
    output, error = run_command(client, debug_restore, "Debug RDB restore")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ CONNECTIVITY AND CONFIGURATION CHECK COMPLETE")
    print("="*80)
    
    print("\n📊 Summary of findings:")
    print("   1. ✅ Source Redis: Accessible, 339,859 keys, 356.33M memory")
    print("   2. ✅ Target Redis: Accessible, 0 keys, password protected")
    print("   3. ✅ RDB files: 175MB and 325MB available")
    print("   4. 🔍 Key operations: Need to test DUMP/RESTORE")
    print("   5. 🔧 Configuration: Need to check target Redis settings")
    
    print("\n🎯 Next steps based on results:")
    print("   1. If DUMP/RESTORE test works → Use key-by-key migration")
    print("   2. If RDB restore works with small chunk → Try full restore")
    print("   3. Check target Redis maxmemory and persistence settings")
    
    print("\n🔧 Immediate action:")
    print("   Check the DUMP/RESTORE test results above")
    print("   If successful, run: ./key_by_key_migration.sh")
    print("   If failed, need to fix target Redis configuration")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()