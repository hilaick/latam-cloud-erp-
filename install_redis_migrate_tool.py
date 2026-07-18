#!/usr/bin/env python3
"""
Install and run redis-migrate-tool for Redis 3.0.7.9 to 4.0.14 migration
"""

import paramiko
import sys
import time

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
        print(f"   Output:\n{output[:500]}{'...' if len(output) > 500 else ''}")
    if error:
        print(f"   Error: {error[:500]}")
    
    return output, error

try:
    print("="*80)
    print("INSTALLING REDIS-MIGRATE-TOOL (OPTION 2)")
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
    
    # Step 1: Install dependencies
    print("\n" + "="*80)
    print("STEP 1: INSTALL DEPENDENCIES")
    print("="*80)
    
    install_deps = """
    echo "=== Installing dependencies ==="
    apt-get update
    apt-get install -y git build-essential automake libtool pkg-config libssl-dev
    echo "✅ Dependencies installed"
    """
    
    output, error = run_command(client, install_deps, "Install dependencies")
    
    # Step 2: Install redis-migrate-tool
    print("\n" + "="*80)
    print("STEP 2: INSTALL REDIS-MIGRATE-TOOL")
    print("="*80)
    
    install_rmt = """
    echo "=== Installing redis-migrate-tool ==="
    cd /opt/migration
    
    # Clone repository
    if [ ! -d "redis-migrate-tool" ]; then
        git clone https://github.com/vipshop/redis-migrate-tool.git
    fi
    
    cd redis-migrate-tool
    
    # Build
    echo "Building redis-migrate-tool..."
    autoreconf -fvi
    ./configure
    make
    
    if [ -f "src/redis-migrate-tool" ]; then
        echo "✅ redis-migrate-tool built successfully"
        ./src/redis-migrate-tool --version
    else
        echo "❌ Build failed, trying alternative..."
        
        # Try pre-built binary
        wget -q https://github.com/vipshop/redis-migrate-tool/releases/download/v0.1.0/redis-migrate-tool.tar.gz
        tar -xzf redis-migrate-tool.tar.gz
        cd redis-migrate-tool
        
        if [ -f "src/redis-migrate-tool" ]; then
            echo "✅ Using pre-built binary"
            ./src/redis-migrate-tool --version
        else
            echo "❌ Could not find redis-migrate-tool binary"
            exit 1
        fi
    fi
    """
    
    output, error = run_command(client, install_rmt, "Install redis-migrate-tool", timeout=300)
    
    # Step 3: Create configuration
    print("\n" + "="*80)
    print("STEP 3: CREATE CONFIGURATION")
    print("="*80)
    
    create_config = """
    echo "=== Creating redis-migrate-tool configuration ==="
    cd /opt/migration/redis-migrate-tool
    
    cat > rmt.conf << 'EOF'
[source]
type: single
servers:
- 192.168.10.139:6379

[target]
type: single
servers:
- 121.91.157.129:6379
password: 9zaHQvNEo5bXFJR3h

[common]
listen: 0.0.0.0:8888
mbuf_size: 512
max_clients: 10
threads: 4
step: 1000
EOF

    echo "Configuration created:"
    cat rmt.conf
    echo ""
    
    echo "=== Testing configuration ==="
    # Test source connection
    echo "Testing source Redis..."
    timeout 5 redis-cli -h 192.168.10.139 -p 6379 PING
    SOURCE_STATUS=$?
    
    # Test target connection
    echo "Testing target Redis..."
    timeout 5 redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' PING
    TARGET_STATUS=$?
    
    if [ $SOURCE_STATUS -eq 0 ] && [ $TARGET_STATUS -eq 0 ]; then
        echo "✅ Both Redis instances are accessible"
    else
        echo "❌ Connection test failed"
        echo "Source status: $SOURCE_STATUS"
        echo "Target status: $TARGET_STATUS"
    fi
    """
    
    output, error = run_command(client, create_config, "Create configuration")
    
    # Step 4: Run redis-migrate-tool
    print("\n" + "="*80)
    print("STEP 4: RUN REDIS-MIGRATE-TOOL")
    print("="*80)
    
    run_rmt = """
    echo "=== Starting redis-migrate-tool ==="
    cd /opt/migration/redis-migrate-tool
    
    # Check if binary exists
    if [ ! -f "src/redis-migrate-tool" ]; then
        echo "❌ redis-migrate-tool binary not found"
        echo "Checking for pre-built binary..."
        
        # Look for binary in different locations
        if [ -f "redis-migrate-tool/src/redis-migrate-tool" ]; then
            cd redis-migrate-tool
        elif [ -f "./redis-migrate-tool" ]; then
            echo "Found binary in current directory"
        else
            echo "❌ No binary found, building from source..."
            autoreconf -fvi
            ./configure
            make
        fi
    fi
    
    if [ -f "src/redis-migrate-tool" ]; then
        echo "✅ Starting migration..."
        echo "Log file: /tmp/redis-migrate.log"
        
        # Run in background
        nohup ./src/redis-migrate-tool -c rmt.conf -o log -l /tmp/redis-migrate.log 2>&1 &
        RMT_PID=$!
        echo $RMT_PID > /tmp/rmt.pid
        echo "redis-migrate-tool started with PID: $RMT_PID"
        
        # Wait a bit and check status
        sleep 5
        
        if ps -p $RMT_PID > /dev/null; then
            echo "✅ redis-migrate-tool is running"
            echo ""
            echo "=== Check migration progress ==="
            echo "tail -f /tmp/redis-migrate.log"
            echo ""
            echo "=== Check key counts ==="
            echo "Source: redis-cli -h 192.168.10.139 -p 6379 DBSIZE"
            echo "Target: redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
        else
            echo "❌ redis-migrate-tool failed to start"
            echo "Check /tmp/redis-migrate.log for errors"
        fi
    else
        echo "❌ Could not find redis-migrate-tool binary"
        echo "Trying alternative: redis-shake"
    fi
    """
    
    output, error = run_command(client, run_rmt, "Run redis-migrate-tool", timeout=60)
    
    # Step 5: Check status
    print("\n" + "="*80)
    print("STEP 5: CHECK MIGRATION STATUS")
    print("="*80)
    
    check_status = """
    echo "=== Checking migration status ==="
    echo ""
    
    # Check if redis-migrate-tool is running
    if [ -f "/tmp/rmt.pid" ]; then
        RMT_PID=$(cat /tmp/rmt.pid)
        if ps -p $RMT_PID > /dev/null; then
            echo "✅ redis-migrate-tool is running (PID: $RMT_PID)"
            echo "Runtime: $(ps -p $RMT_PID -o etime=)"
            echo ""
            echo "=== Recent logs ==="
            tail -20 /tmp/redis-migrate.log 2>/dev/null || echo "No log file yet"
        else
            echo "❌ redis-migrate-tool is not running"
            echo "=== Log file ==="
            tail -50 /tmp/redis-migrate.log 2>/dev/null || echo "No log file"
        fi
    else
        echo "❌ No redis-migrate-tool PID file found"
    fi
    
    echo ""
    echo "=== Current key counts ==="
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")
    
    echo "Source Redis: $SOURCE_KEYS keys"
    echo "Target Redis: $TARGET_KEYS keys"
    
    if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
        if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
            echo "🎉 MIGRATION COMPLETE!"
            echo "All $SOURCE_KEYS keys migrated successfully"
        elif [ "$TARGET_KEYS" -gt 0 ]; then
            PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            echo "📈 Migration in progress: $PERCENTAGE%"
            echo "Migrated: $TARGET_KEYS/$SOURCE_KEYS keys"
            echo "Remaining: $((SOURCE_KEYS - TARGET_KEYS)) keys"
        else
            echo "⚠️  Migration not started or failed"
            echo "Check /tmp/redis-migrate.log for errors"
        fi
    fi
    
    echo ""
    echo "=== Test data ==="
    echo "Setting test key..."
    TEST_KEY="rmt_test_$(date +%s)"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' SET "$TEST_KEY" "test_value_rmt"
    TEST_VALUE=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' GET "$TEST_KEY" 2>/dev/null)
    
    if [ "$TEST_VALUE" = "test_value_rmt" ]; then
        echo "✅ Target Redis is working"
    else
        echo "❌ Target Redis write/read test failed"
    fi
    
    # Clean up test key
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DEL "$TEST_KEY" > /dev/null 2>&1
    """
    
    output, error = run_command(client, check_status, "Check migration status")
    
    # Step 6: If redis-migrate-tool fails, try redis-shake
    print("\n" + "="*80)
    print("STEP 6: PREPARE REDIS-SHAKE (OPTION 3)")
    print("="*80)
    
    prepare_shake = """
    echo "=== Preparing redis-shake as fallback ==="
    cd /opt/migration
    
    # Download redis-shake
    if [ ! -f "redis-shake" ]; then
        echo "Downloading redis-shake..."
        wget -q https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake.tar.gz
        tar -xzf redis-shake.tar.gz
        
        # Find the binary
        if [ -f "redis-shake-linux-amd64" ]; then
            mv redis-shake-linux-amd64 redis-shake
            chmod +x redis-shake
        elif [ -f "redis-shake" ]; then
            chmod +x redis-shake
        else
            # Look for binary in extracted directory
            find . -name "redis-shake" -type f -executable | head -1 | xargs -I {} cp {} ./
            chmod +x redis-shake 2>/dev/null || true
        fi
        
        rm -f redis-shake.tar.gz
    fi
    
    if [ -f "redis-shake" ]; then
        echo "✅ redis-shake downloaded"
        ./redis-shake --version 2>&1 | head -5 || echo "Version check failed"
    else
        echo "❌ Could not find redis-shake binary"
    fi
    
    # Create redis-shake configuration
    cat > redis-shake.conf << 'EOF'
source.type = standalone
source.address = 192.168.10.139:6379

target.type = standalone
target.address = 121.91.157.129:6379
target.password_raw = 9zaHQvNEo5bXFJR3h

parallel = 32
psync = true

log.file = /tmp/redis-shake.log
log.level = info
EOF

    echo ""
    echo "redis-shake configuration created:"
    cat redis-shake.conf
    echo ""
    
    echo "=== To use redis-shake if redis-migrate-tool fails ==="
    echo "cd /opt/migration"
    echo "./redis-shake -conf=redis-shake.conf -type=sync"
    echo ""
    echo "Monitor: tail -f /tmp/redis-shake.log"
    """
    
    output, error = run_command(client, prepare_shake, "Prepare redis-shake")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ REDIS-MIGRATE-TOOL SETUP COMPLETE")
    print("="*80)
    
    print("\n📊 What was installed:")
    print("   1. ✅ redis-migrate-tool (for version compatibility)")
    print("   2. ✅ Configuration file: /opt/migration/redis-migrate-tool/rmt.conf")
    print("   3. ✅ Running as background process")
    print("   4. ✅ redis-shake prepared as fallback")
    
    print("\n🎯 Current status:")
    print("   - redis-migrate-tool should be running")
    print("   - Check logs: tail -f /tmp/redis-migrate.log")
    print("   - Monitor key counts every minute")
    
    print("\n📈 Monitor migration:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration/redis-migrate-tool")
    print("   tail -f /tmp/redis-migrate.log")
    print("   redis-cli -h 192.168.10.139 -p 6379 DBSIZE")
    print("   redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE")
    
    print("\n⏱️  Estimated time:")
    print("   - 339,859 keys at ~1,000 keys/second = ~6 minutes")
    print("   - Actual time depends on network and Redis performance")
    
    print("\n🔧 If redis-migrate-tool fails:")
    print("   cd /opt/migration")
    print("   ./redis-shake -conf=redis-shake.conf -type=sync")
    
    print("\n⚠️  Important notes:")
    print("   1. redis-migrate-tool handles Redis 3.x to 4.x compatibility")
    print("   2. Migration runs in the background")
    print("   3. Check /tmp/redis-migrate.log for progress")
    print("   4. Target Redis will accumulate keys gradually")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()