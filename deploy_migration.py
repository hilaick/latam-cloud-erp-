#!/usr/bin/env python3
"""
Deploy and run Redis migration on mig_worker
"""

import paramiko
import sys
import time

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
        print(f"   Output:\n{output[:500]}...")
    if error:
        print(f"   Error: {error[:500]}")
    
    return output, error

try:
    print("="*80)
    print("DEPLOYING REDIS MIGRATION TO MIG_WORKER")
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
    
    # Install RedisShake
    print("\n📦 Installing RedisShake...")
    install_cmd = """
    cd /tmp && \
    wget -q https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake.tar.gz && \
    tar -xzf redis-shake.tar.gz && \
    chmod +x redis-shake && \
    mv redis-shake /usr/local/bin/ && \
    rm redis-shake.tar.gz && \
    redis-shake --version 2>&1 | head -5
    """
    
    output, error = run_command(client, install_cmd, "Install RedisShake", timeout=60)
    
    # Create migration directory
    print("\n📁 Setting up migration directory...")
    setup_cmd = """
    mkdir -p /opt/migration && \
    cd /opt/migration && \
    echo "Migration directory ready" > READY.txt
    """
    run_command(client, setup_cmd, "Create migration directory")
    
    # Create RedisShake configuration
    print("\n📝 Creating RedisShake configuration...")
    config_content = """# Source Redis (UTISA - no password)
source.type = standalone
source.address = 192.168.10.139:6379
source.password_raw = 

# Target Redis (ULEARNING - with password)
target.type = standalone
target.address = 121.91.157.129:6379
target.password_raw = 9zaHQvNEo5bXFJR3h

# Sync configuration
parallel = 32
psync = true
rewrite = true

# Filter configuration (sync only db0 and db2 from source)
filter.db.whitelist = 0,2
filter.key.whitelist = *
filter.key.blacklist = 

# Performance tuning
qps = 100000
mbps = 1024

# Logging
log.file = /opt/migration/redis-shake.log
log.level = info

# Metrics (optional)
metrics.port = 9320
metrics.address = 0.0.0.0
"""
    
    # Write config file
    config_cmd = f"""cat > /opt/migration/redis-sync.conf << 'EOF'
{config_content}
EOF
echo "Configuration written to /opt/migration/redis-sync.conf"
cat /opt/migration/redis-sync.conf
"""
    
    output, error = run_command(client, config_cmd, "Write RedisShake config")
    
    # Create monitoring script
    print("\n📊 Creating monitoring script...")
    monitor_script = """#!/bin/bash
# monitor_migration.sh

echo "================================================"
echo "REDIS MIGRATION MONITOR"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

echo "🔍 Source Redis (192.168.10.139:6379):"
echo "Keys: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")"
echo "Memory: $(redis-cli -h 192.168.10.139 -p 6379 INFO memory 2>/dev/null | grep -E '(used_memory_human|maxmemory_human)' | head -2)"
echo ""

echo "🎯 Target Redis (121.91.157.129:6379):"
echo "Keys: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "N/A")"
echo "Memory: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory 2>/dev/null | grep -E '(used_memory_human|maxmemory_human)' | head -2)"
echo ""

echo "📈 RedisShake Status:"
if pgrep -x "redis-shake" > /dev/null; then
    echo "✅ RedisShake is running (PID: $(pgrep -x redis-shake))"
    echo "Log tail (last 5 lines):"
    tail -5 /opt/migration/redis-shake.log 2>/dev/null || echo "No log file yet"
else
    echo "❌ RedisShake is not running"
fi

echo ""
echo "🔄 Sync Progress:"
echo "Source keys: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")"
echo "Target keys: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "N/A")"
echo ""

echo "📋 Commands:"
echo "1. Start sync: cd /opt/migration && redis-shake -conf=redis-sync.conf -type=sync"
echo "2. Start continuous: cd /opt/migration && redis-shake -conf=redis-sync.conf -type=rump"
echo "3. Stop: pkill redis-shake"
echo "4. View logs: tail -f /opt/migration/redis-shake.log"
echo "5. This monitor: ./monitor_migration.sh"
"""
    
    monitor_cmd = f"""cat > /opt/migration/monitor_migration.sh << 'EOF'
{monitor_script}
EOF
chmod +x /opt/migration/monitor_migration.sh
echo "Monitoring script created: /opt/migration/monitor_migration.sh"
"""
    
    run_command(client, monitor_cmd, "Create monitoring script")
    
    # Create start migration script
    print("\n🚀 Creating migration start script...")
    start_script = """#!/bin/bash
# start_migration.sh

echo "================================================"
echo "STARTING REDIS MIGRATION"
echo "================================================"
echo "Source: 192.168.10.139:6379 (no password)"
echo "Target: 121.91.157.129:6379 (password protected)"
echo ""

cd /opt/migration

echo "🔍 Checking connectivity..."
if ! redis-cli -h 192.168.10.139 -p 6379 PING | grep -q "PONG"; then
    echo "❌ Source Redis not accessible"
    exit 1
fi

if ! redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' PING 2>/dev/null | grep -q "PONG"; then
    echo "❌ Target Redis not accessible"
    exit 1
fi

echo "✅ Both Redis instances accessible"
echo ""

echo "📊 Initial key counts:"
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE)
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null)
echo "Source: $SOURCE_KEYS keys"
echo "Target: $TARGET_KEYS keys"
echo ""

if [ "$TARGET_KEYS" -gt 0 ]; then
    read -p "⚠️  Target has $TARGET_KEYS keys. Flush before migration? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Flushing target Redis..."
        redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' FLUSHALL 2>/dev/null
        echo "✅ Target flushed"
    fi
fi

echo ""
echo "🔄 Choose sync mode:"
echo "1. One-time full sync (sync)"
echo "2. Continuous real-time sync (rump)"
echo "3. Two-phase: Full sync then continuous"
echo ""
read -p "Enter choice (1/2/3): " -n 1 -r
echo

case $REPLY in
    1)
        echo "🚀 Starting one-time full sync..."
        echo "Logs: /opt/migration/redis-shake.log"
        nohup redis-shake -conf=redis-sync.conf -type=sync > /opt/migration/migration.out 2>&1 &
        echo "✅ Sync started in background"
        echo "Check progress: tail -f /opt/migration/redis-shake.log"
        ;;
    2)
        echo "🔄 Starting continuous real-time sync..."
        echo "Logs: /opt/migration/redis-shake.log"
        nohup redis-shake -conf=redis-sync.conf -type=rump > /opt/migration/migration.out 2>&1 &
        echo "✅ Continuous sync started in background"
        echo "Check progress: tail -f /opt/migration/redis-shake.log"
        echo "Stop with: pkill redis-shake"
        ;;
    3)
        echo "📦 Starting two-phase migration..."
        echo "Phase 1: Full sync..."
        redis-shake -conf=redis-sync.conf -type=sync
        
        if [ $? -eq 0 ]; then
            echo "✅ Phase 1 completed"
            echo ""
            echo "Phase 2: Continuous sync..."
            echo "Starting real-time replication..."
            nohup redis-shake -conf=redis-sync.conf -type=rump > /opt/migration/migration.out 2>&1 &
            echo "✅ Continuous sync started"
            echo "Run until cutover, then stop with: pkill redis-shake"
        else
            echo "❌ Phase 1 failed, check logs"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📈 Monitor with: ./monitor_migration.sh"
echo "📋 Logs: tail -f /opt/migration/redis-shake.log"
echo "🛑 Stop: pkill redis-shake"
"""
    
    start_cmd = f"""cat > /opt/migration/start_migration.sh << 'EOF'
{start_script}
EOF
chmod +x /opt/migration/start_migration.sh
echo "Start script created: /opt/migration/start_migration.sh"
"""
    
    run_command(client, start_cmd, "Create start migration script")
    
    # Test the setup
    print("\n🧪 Testing migration setup...")
    test_cmd = """
    cd /opt/migration && \
    echo "=== Migration Setup Test ===" && \
    echo "1. RedisShake: $(which redis-shake)" && \
    echo "2. Config file: $(ls -la redis-sync.conf)" && \
    echo "3. Scripts: $(ls -la *.sh)" && \
    echo "4. Source Redis test: $(redis-cli -h 192.168.10.139 -p 6379 PING 2>/dev/null || echo 'Failed')" && \
    echo "5. Target Redis test: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' PING 2>/dev/null | grep -v Warning || echo 'Failed')"
    """
    
    output, error = run_command(client, test_cmd, "Test migration setup")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ MIGRATION SETUP COMPLETE!")
    print("="*80)
    print("\n📁 Migration files created in /opt/migration/:")
    print("   - redis-sync.conf          # RedisShake configuration")
    print("   - start_migration.sh       # Start migration script")
    print("   - monitor_migration.sh     # Monitor progress script")
    print("\n🚀 To start migration:")
    print("   1. SSH to mig_worker: ssh root@121.91.157.66")
    print("   2. cd /opt/migration")
    print("   3. ./start_migration.sh")
    print("\n📊 To monitor progress:")
    print("   ./monitor_migration.sh")
    print("   tail -f redis-shake.log")
    print("\n⏱️  Estimated sync time: 30-60 minutes for 355MB, 339K keys")
    print("\n🔧 Migration modes:")
    print("   1. One-time full sync (sync) - for scheduled downtime")
    print("   2. Continuous sync (rump) - for minimal downtime")
    print("   3. Two-phase - Full sync + continuous (recommended)")
    print("\n🎯 Recommended: Option 3 (Two-phase)")
    print("   - Phase 1: Full sync (30-60 min)")
    print("   - Phase 2: Continuous sync until cutover")
    print("   - Cutover: Stop app, final sync, switch config")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()