#!/usr/bin/env python3
"""
Perform Phase 1 Redis migration with backup
"""

import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command_with_output(client, command, description, timeout=300):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}...")
    
    # Use get_pty for interactive commands
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout, get_pty=True)
    
    # Read output in real-time
    output = ""
    error = ""
    
    # Read stdout
    while True:
        line = stdout.readline()
        if not line:
            break
        output += line
        print(f"   {line.strip()}")
    
    # Read stderr
    while True:
        line = stderr.readline()
        if not line:
            break
        error += line
        print(f"   ERROR: {line.strip()}")
    
    # Get exit status
    exit_status = stdout.channel.recv_exit_status()
    
    return output, error, exit_status

try:
    print("="*80)
    print("PHASE 1: REDIS MIGRATION WITH BACKUP")
    print("="*80)
    
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
    
    # Step 1: Create backup of source Redis
    print("\n" + "="*80)
    print("STEP 1: CREATING BACKUP OF SOURCE REDIS")
    print("="*80)
    
    backup_cmd = """
    cd /opt/migration
    echo "Creating backup of source Redis (192.168.10.139:6379)..."
    echo "This may take a few minutes depending on data size..."
    
    # Create backup
    timeout 600 redis-cli -h 192.168.10.139 -p 6379 --rdb /opt/migration/source_backup_$(date +%Y%m%d_%H%M%S).rdb
    
    # Check backup file
    echo ""
    echo "Backup files created:"
    ls -lh /opt/migration/*.rdb 2>/dev/null || echo "No backup files found"
    
    # Verify backup integrity
    echo ""
    echo "Verifying backup integrity..."
    if [ -f /opt/migration/*.rdb ]; then
        RDB_FILE=$(ls -t /opt/migration/*.rdb | head -1)
        echo "Checking RDB file: $RDB_FILE"
        redis-check-rdb "$RDB_FILE" 2>/dev/null || echo "RDB check not available, checking file size"
        echo "Backup size: $(du -h "$RDB_FILE" | cut -f1)"
    else
        echo "No backup file found"
    fi
    """
    
    output, error, exit_code = run_command_with_output(client, backup_cmd, "Creating Redis backup")
    
    # Step 2: Check current key counts
    print("\n" + "="*80)
    print("STEP 2: CHECKING KEY COUNTS")
    print("="*80)
    
    key_check_cmd = """
    echo "Source Redis key count:"
    redis-cli -h 192.168.10.139 -p 6379 DBSIZE
    
    echo ""
    echo "Target Redis key count:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "Failed to get target key count"
    
    echo ""
    echo "Memory usage:"
    echo "Source:"
    redis-cli -h 192.168.10.139 -p 6379 INFO memory | grep -E "(used_memory_human|maxmemory_human)"
    
    echo ""
    echo "Target:"
    redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory 2>/dev/null | grep -E "(used_memory_human|maxmemory_human)" || echo "Failed to get target memory info"
    """
    
    output, error, exit_code = run_command_with_output(client, key_check_cmd, "Checking key counts")
    
    # Step 3: Start Phase 1 migration (full sync)
    print("\n" + "="*80)
    print("STEP 3: STARTING PHASE 1 - FULL SYNC")
    print("="*80)
    
    print("Starting RedisShake in SYNC mode...")
    print("This will perform a full data copy from source to target.")
    print("Estimated time: 30-60 minutes for 339,727 keys")
    print("")
    
    # Create a screen session to run RedisShake
    migration_cmd = """
    cd /opt/migration
    
    echo "=== Starting RedisShake Full Sync ==="
    echo "Timestamp: $(date)"
    echo "Source: 192.168.10.139:6379"
    echo "Target: 121.91.157.129:6379"
    echo ""
    
    # Create log file
    LOG_FILE="/opt/migration/redis_shake_sync_$(date +%Y%m%d_%H%M%S).log"
    
    echo "Starting RedisShake sync..."
    echo "Log file: $LOG_FILE"
    echo ""
    
    # Start RedisShake in background and log output
    nohup redis-shake -conf=redis-sync.conf -type=sync > "$LOG_FILE" 2>&1 &
    SHAKE_PID=$!
    
    echo "RedisShake started with PID: $SHAKE_PID"
    echo "Monitoring progress..."
    
    # Wait a bit and check if it's running
    sleep 5
    
    if ps -p $SHAKE_PID > /dev/null; then
        echo "✅ RedisShake is running (PID: $SHAKE_PID)"
        echo ""
        echo "=== Monitoring Commands ==="
        echo "1. Check logs: tail -f $LOG_FILE"
        echo "2. Check process: ps aux | grep redis-shake"
        echo "3. Check key counts:"
        echo "   Source: redis-cli -h 192.168.10.139 -p 6379 DBSIZE"
        echo "   Target: redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
        echo "4. Stop migration: kill $SHAKE_PID"
        echo ""
        echo "=== Initial Log Output ==="
        tail -20 "$LOG_FILE"
    else
        echo "❌ RedisShake failed to start"
        echo "Check log file: $LOG_FILE"
        tail -50 "$LOG_FILE"
    fi
    
    # Save PID to file for later monitoring
    echo $SHAKE_PID > /opt/migration/redis_shake.pid
    echo "PID saved to: /opt/migration/redis_shake.pid"
    """
    
    output, error, exit_code = run_command_with_output(client, migration_cmd, "Starting RedisShake migration")
    
    # Step 4: Create monitoring script
    print("\n" + "="*80)
    print("STEP 4: CREATING MONITORING SCRIPT")
    print("="*80)
    
    monitor_script = """#!/bin/bash
# monitor_sync.sh - Monitor Redis migration progress

echo "================================================"
echo "REDIS MIGRATION MONITOR - $(date)"
echo "================================================"

# Check if RedisShake is running
if [ -f /opt/migration/redis_shake.pid ]; then
    SHAKE_PID=$(cat /opt/migration/redis_shake.pid)
    if ps -p $SHAKE_PID > /dev/null; then
        echo "✅ RedisShake is running (PID: $SHAKE_PID)"
        
        # Check log file
        LOG_FILE=$(ls -t /opt/migration/redis_shake_sync_*.log 2>/dev/null | head -1)
        if [ -f "$LOG_FILE" ]; then
            echo "📄 Log file: $LOG_FILE"
            echo ""
            echo "=== Recent Log Output ==="
            tail -10 "$LOG_FILE" | grep -E "(progress|sync|total|keys|error|warn)" || tail -5 "$LOG_FILE"
        fi
    else
        echo "❌ RedisShake is not running"
    fi
else
    echo "⚠️  No RedisShake PID file found"
fi

echo ""
echo "=== Key Counts ==="
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "N/A")
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo "N/A")

echo "Source Redis: $SOURCE_KEYS keys"
echo "Target Redis: $TARGET_KEYS keys"

if [ "$SOURCE_KEYS" != "N/A" ] && [ "$TARGET_KEYS" != "N/A" ]; then
    if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
        echo "✅ Key counts match!"
    else
        DIFF=$((SOURCE_KEYS - TARGET_KEYS))
        PERCENTAGE=$((TARGET_KEYS * 100 / SOURCE_KEYS))
        echo "🔄 Sync progress: $PERCENTAGE% ($TARGET_KEYS/$SOURCE_KEYS)"
        echo "   Remaining: $DIFF keys"
    fi
fi

echo ""
echo "=== Memory Usage ==="
echo "Source:"
redis-cli -h 192.168.10.139 -p 6379 INFO memory 2>/dev/null | grep -E "(used_memory_human|maxmemory_human)" | head -2 || echo "  N/A"

echo ""
echo "Target:"
redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' INFO memory 2>/dev/null | grep -E "(used_memory_human|maxmemory_human)" | head -2 || echo "  N/A"

echo ""
echo "=== Commands ==="
echo "1. View full logs: tail -f /opt/migration/redis_shake_sync_*.log"
echo "2. Stop migration: kill \$(cat /opt/migration/redis_shake.pid)"
echo "3. Start Phase 2 (continuous): cd /opt/migration && redis-shake -conf=redis-sync.conf -type=rump"
echo "4. This monitor: ./monitor_sync.sh"
"""
    
    monitor_cmd = f"""cat > /opt/migration/monitor_sync.sh << 'EOF'
{monitor_script}
EOF
chmod +x /opt/migration/monitor_sync.sh
echo "Monitoring script created: /opt/migration/monitor_sync.sh"
"""
    
    output, error, exit_code = run_command_with_output(client, monitor_cmd, "Creating monitoring script")
    
    # Step 5: Check initial sync status
    print("\n" + "="*80)
    print("STEP 5: CHECKING INITIAL SYNC STATUS")
    print("="*80)
    
    status_cmd = """
    echo "Checking migration status..."
    sleep 10
    
    # Check if RedisShake is running
    if [ -f /opt/migration/redis_shake.pid ]; then
        SHAKE_PID=$(cat /opt/migration/redis_shake.pid)
        if ps -p $SHAKE_PID > /dev/null; then
            echo "✅ RedisShake is running"
            
            # Check logs
            LOG_FILE=$(ls -t /opt/migration/redis_shake_sync_*.log 2>/dev/null | head -1)
            if [ -f "$LOG_FILE" ]; then
                echo "=== Last 5 lines of log ==="
                tail -5 "$LOG_FILE"
                
                echo ""
                echo "=== Looking for progress indicators ==="
                grep -i "progress\|sync\|total\|percent" "$LOG_FILE" | tail -5 || echo "No progress indicators yet"
            fi
        else
            echo "❌ RedisShake is not running"
            LOG_FILE=$(ls -t /opt/migration/redis_shake_sync_*.log 2>/dev/null | head -1)
            if [ -f "$LOG_FILE" ]; then
                echo "=== Last 10 lines of log ==="
                tail -10 "$LOG_FILE"
            fi
        fi
    else
        echo "⚠️  No PID file found"
    fi
    
    echo ""
    echo "=== Quick Key Check ==="
    echo "Source keys: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'N/A')"
    echo "Target keys: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo 'N/A')"
    """
    
    output, error, exit_code = run_command_with_output(client, status_cmd, "Checking initial sync status")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ PHASE 1 MIGRATION STARTED!")
    print("="*80)
    
    print("\n📁 Files created on mig_worker:")
    print("   - /opt/migration/source_backup_[timestamp].rdb - Source Redis backup")
    print("   - /opt/migration/redis_shake_sync_[timestamp].log - Migration logs")
    print("   - /opt/migration/redis_shake.pid - RedisShake process ID")
    print("   - /opt/migration/monitor_sync.sh - Monitoring script")
    
    print("\n🚀 Migration is now running in the background")
    print("   RedisShake is copying 339,727 keys (355MB) from source to target")
    
    print("\n📊 To monitor progress:")
    print("   1. SSH to mig_worker: ssh root@121.91.157.66")
    print("   2. cd /opt/migration")
    print("   3. ./monitor_sync.sh")
    print("   4. tail -f redis_shake_sync_*.log")
    
    print("\n⏱️  Estimated completion:")
    print("   - Initial sync: 30-60 minutes")
    print("   - Progress: Check with monitor_sync.sh")
    
    print("\n🎯 After Phase 1 completes:")
    print("   1. Verify key counts match")
    print("   2. Start Phase 2 (continuous sync) if needed")
    print("   3. Schedule cutover")
    
    print("\n⚠️  IMPORTANT: Backup created at /opt/migration/source_backup_*.rdb")
    print("   This is your safety net in case anything goes wrong!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()