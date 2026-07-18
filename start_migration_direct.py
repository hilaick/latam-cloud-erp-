#!/usr/bin/env python3
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
        print(f"   Output:\n{output}")
    if error:
        print(f"   Error: {error}")
    
    return output, error

try:
    print("="*80)
    print("MANUALLY STARTING REDIS MIGRATION")
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
    
    # First, let's start RedisShake directly
    print("\n🚀 Starting RedisShake migration...")
    
    # Check if RedisShake is installed
    check_cmd = "which redis-shake || echo 'RedisShake not found'"
    output, error = run_command(client, check_cmd, "Check RedisShake installation")
    
    if "not found" in output:
        print("❌ RedisShake not installed. Installing...")
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
    
    # Create RedisShake config if not exists
    print("\n📝 Checking RedisShake configuration...")
    config_check = """
    cd /opt/migration && \
    if [ ! -f redis-sync.conf ]; then
        echo "Creating redis-sync.conf..."
        cat > redis-sync.conf << 'EOF'
# Source Redis (UTISA - no password)
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
EOF
        echo "Configuration created"
    else
        echo "Configuration already exists"
        cat redis-sync.conf
    fi
    """
    
    output, error = run_command(client, config_check, "Check/create config")
    
    # Start RedisShake in background
    print("\n🎯 Starting RedisShake in sync mode (full sync)...")
    start_cmd = """
    cd /opt/migration && \
    echo "Starting RedisShake at $(date)" >> migration.log && \
    nohup redis-shake -conf=redis-sync.conf -type=sync >> redis-shake.log 2>&1 &
    echo "RedisShake started in background"
    echo "Process ID: $!"
    echo "Check logs: tail -f redis-shake.log"
    """
    
    output, error = run_command(client, start_cmd, "Start RedisShake")
    
    # Wait a moment for process to start
    time.sleep(2)
    
    # Check if RedisShake is running
    print("\n🔍 Checking RedisShake process...")
    ps_cmd = "ps aux | grep redis-shake | grep -v grep"
    output, error = run_command(client, ps_cmd, "Check RedisShake process")
    
    if "redis-shake" in output:
        print("✅ RedisShake is running!")
        print(output)
    else:
        print("❌ RedisShake not running. Checking logs...")
        log_cmd = "tail -20 /opt/migration/redis-shake.log 2>/dev/null || echo 'No log file'"
        output, error = run_command(client, log_cmd, "Check RedisShake logs")
    
    # Check initial sync status
    print("\n📊 Checking initial sync status...")
    status_cmd = """
    echo "=== Initial Sync Status ==="
    echo "Source keys: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'N/A')"
    echo "Target keys: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo 'N/A')"
    echo ""
    echo "=== Recent Logs ==="
    tail -5 /opt/migration/redis-shake.log 2>/dev/null || echo "No logs yet"
    echo ""
    echo "=== Migration Progress ==="
    echo "Run this command to monitor:"
    echo "cd /opt/migration && ./quick_monitor.sh"
    """
    
    output, error = run_command(client, status_cmd, "Check sync status")
    
    # Create a simple monitoring loop script
    print("\n📈 Creating monitoring script...")
    monitor_loop = """#!/bin/bash
# monitor_loop.sh - Monitor Redis migration progress

echo "================================================"
echo "REDIS MIGRATION MONITOR"
echo "================================================"
echo "Starting at: $(date)"
echo ""

while true; do
    clear
    echo "================================================"
    echo "REDIS MIGRATION PROGRESS - $(date)"
    echo "================================================"
    echo ""
    
    # Check process
    echo "🔍 RedisShake Process:"
    if pgrep -x "redis-shake" > /dev/null; then
        PID=$(pgrep -x redis-shake)
        echo "✅ Running (PID: $PID)"
        echo "   Uptime: $(ps -p $PID -o etime= 2>/dev/null || echo "N/A")"
    else
        echo "❌ Not running"
    fi
    
    echo ""
    
    # Key counts
    echo "📊 Key Counts:"
    SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")
    TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "N/A")
    
    echo "   Source: $SOURCE_KEYS keys"
    echo "   Target: $TARGET_KEYS keys"
    
    if [[ "$SOURCE_KEYS" =~ ^[0-9]+$ ]] && [[ "$TARGET_KEYS" =~ ^[0-9]+$ ]]; then
        if [ "$SOURCE_KEYS" -gt 0 ]; then
            PROGRESS=$((TARGET_KEYS * 100 / SOURCE_KEYS))
            REMAINING=$((SOURCE_KEYS - TARGET_KEYS))
            echo "   Progress: $PROGRESS% ($TARGET_KEYS/$SOURCE_KEYS)"
            echo "   Remaining: $REMAINING keys"
            
            # Estimate time remaining (assuming ~1000 keys/second)
            if [ "$TARGET_KEYS" -gt 0 ] && [ "$REMAINING" -gt 0 ]; then
                EST_SECONDS=$((REMAINING / 1000))
                EST_MINUTES=$((EST_SECONDS / 60))
                echo "   Est. time remaining: ~$EST_MINUTES minutes"
            fi
        fi
    fi
    
    echo ""
    
    # Memory usage
    echo "💾 Memory Usage:"
    SOURCE_MEM=$(redis-cli -h 192.168.10.139 -p 6379 INFO memory 2>/dev/null | grep 'used_memory_human' | cut -d: -f2 | tr -d '\r' || echo 'N/A')
    TARGET_MEM=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory 2>/dev/null | grep 'used_memory_human' | cut -d: -f2 | tr -d '\r' || echo 'N/A')
    echo "   Source: $SOURCE_MEM"
    echo "   Target: $TARGET_MEM"
    
    echo ""
    
    # Recent logs
    echo "📝 Recent Logs (last 3 lines):"
    tail -3 /opt/migration/redis-shake.log 2>/dev/null | while read line; do
        echo "   $line"
    done
    
    echo ""
    echo "================================================"
    echo "Commands: [q]uit | [s]top migration | [r]efresh"
    echo "================================================"
    
    # Wait for input
    read -t 10 -n 1 -p "Waiting 10 seconds (press any key to refresh now)... " input
    echo ""
    
    if [[ $input == "q" ]] || [[ $input == "Q" ]]; then
        echo "Exiting monitor..."
        break
    elif [[ $input == "s" ]] || [[ $input == "S" ]]; then
        echo "Stopping migration..."
        pkill redis-shake
        echo "Migration stopped"
        break
    fi
done
"""
    
    # Write monitoring script
    monitor_cmd = f"""cat > /opt/migration/monitor_loop.sh << 'EOF'
{monitor_loop}
EOF
chmod +x /opt/migration/monitor_loop.sh
echo "Monitoring loop script created: /opt/migration/monitor_loop.sh"
"""
    
    run_command(client, monitor_cmd, "Create monitoring loop script")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ REDIS MIGRATION STARTED!")
    print("="*80)
    print("\n📊 Migration Details:")
    print("   Source: 192.168.10.139:6379 (339,780 keys, 325MB)")
    print("   Target: 121.91.157.129:6379 (0 keys, empty)")
    print("   Mode: Full sync (sync)")
    print("   Estimated time: 30-60 minutes")
    
    print("\n🎯 To monitor progress:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./monitor_loop.sh")
    
    print("\n📈 Real-time monitoring commands:")
    print("   Watch key counts: ./quick_monitor.sh")
    print("   View logs: tail -f redis-shake.log")
    print("   Stop migration: pkill redis-shake")
    
    print("\n⏱️  Progress indicators:")
    print("   1. Check target key count increasing")
    print("   2. Monitor logs for sync progress")
    print("   3. When target keys ≈ source keys, sync is complete")
    
    print("\n🚀 Next steps after full sync:")
    print("   1. Switch to continuous sync (rump mode)")
    print("   2. Monitor replication lag")
    print("   3. Schedule cutover window")
    print("   4. Stop application writes")
    print("   5. Final sync catch-up")
    print("   6. Switch application config")
    
    print("\n🔧 To switch to continuous sync after full sync:")
    print("   pkill redis-shake")
    print("   redis-shake -conf=redis-sync.conf -type=rump")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()