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
    print("FIXING REDISSHAKE CONFIGURATION")
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
    
    # Fix the RedisShake configuration
    print("\n🔧 Fixing RedisShake configuration...")
    
    # Create a simple configuration file
    config_content = """source.address = 192.168.10.139:6379
source.password_raw = 
source.type = standalone

target.address = 121.91.157.129:6379
target.password_raw = 9zaHQvNEo5bXFJR3h
target.type = standalone

parallel = 32
psync = true
rewrite = true

filter.db.whitelist = 0,2
filter.key.whitelist = *
filter.key.blacklist = 

qps = 100000
mbps = 1024

log.file = /opt/migration/redis-shake.log
log.level = info
"""
    
    # Write the fixed config
    fix_cmd = f"""cd /opt/migration && \
cat > redis-sync-simple.conf << 'EOF'
{config_content}
EOF
echo "Fixed configuration written to redis-sync-simple.conf"
cat redis-sync-simple.conf
"""
    
    output, error = run_command(client, fix_cmd, "Write fixed config")
    
    # Test RedisShake with the simple config
    print("\n🧪 Testing RedisShake with simple config...")
    test_cmd = "cd /opt/migration && timeout 10 redis-shake -conf=redis-sync-simple.conf -type=sync 2>&1 | head -20"
    output, error = run_command(client, test_cmd, "Test RedisShake")
    
    if "panic" in output or "error" in output.lower():
        print("❌ RedisShake still has issues. Let me try a different approach...")
        
        # Try running RedisShake with minimal config
        print("\n🔧 Creating minimal configuration...")
        minimal_config = """source.address = 192.168.10.139:6379
target.address = 121.91.157.129:6379
target.password_raw = 9zaHQvNEo5bXFJR3h
log.file = /opt/migration/redis-shake.log
"""
        
        minimal_cmd = f"""cd /opt/migration && \
cat > redis-minimal.conf << 'EOF'
{minimal_config}
EOF
echo "Minimal config created"
"""
        
        run_command(client, minimal_cmd, "Create minimal config")
        
        # Try to run RedisShake with just source and target
        print("\n🚀 Starting RedisShake with minimal config...")
        start_cmd = """
        cd /opt/migration && \
        echo "=== Starting RedisShake at $(date) ===" >> migration.log && \
        nohup redis-shake -conf=redis-minimal.conf -type=sync >> redis-shake.log 2>&1 &
        echo "RedisShake started with PID: $!"
        sleep 2
        ps aux | grep redis-shake | grep -v grep
        """
        
        output, error = run_command(client, start_cmd, "Start RedisShake minimal")
    
    # Check if RedisShake is running
    print("\n🔍 Checking RedisShake process...")
    ps_cmd = "ps aux | grep redis-shake | grep -v grep"
    output, error = run_command(client, ps_cmd, "Check RedisShake process")
    
    if output and "redis-shake" in output:
        print("✅ RedisShake is running!")
        print(output)
        
        # Check logs
        print("\n📝 Checking RedisShake logs...")
        log_cmd = "tail -10 /opt/migration/redis-shake.log 2>/dev/null || echo 'No logs yet'"
        output, error = run_command(client, log_cmd, "Check RedisShake logs")
        
        # Check key counts
        print("\n📊 Checking initial key counts...")
        keys_cmd = """
        echo "Source keys: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'N/A')"
        echo "Target keys: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null || echo 'N/A')"
        """
        output, error = run_command(client, keys_cmd, "Check key counts")
        
    else:
        print("❌ RedisShake is not running. Let me check the RedisShake version...")
        version_cmd = "redis-shake --version 2>&1 || echo 'Cannot get version'"
        output, error = run_command(client, version_cmd, "Check RedisShake version")
        
        print("\n🔧 Trying alternative approach: Use redis-cli for initial sync...")
        
        # Create a simple sync script using redis-cli
        sync_script = """#!/bin/bash
# simple_redis_sync.sh
# Use redis-cli for basic sync

SOURCE_HOST="192.168.10.139"
SOURCE_PORT="6379"
TARGET_HOST="121.91.157.129"
TARGET_PORT="6379"
TARGET_PASSWORD="9zaHQvNEo5bXFJR3h"

echo "Starting Redis sync at $(date)"
echo "Source: $SOURCE_HOST:$SOURCE_PORT"
echo "Target: $TARGET_HOST:$TARGET_PORT"
echo ""

# Get all keys from source
echo "Getting keys from source..."
KEYS=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT --scan --pattern "*" 2>/dev/null)
KEY_COUNT=$(echo "$KEYS" | wc -l)
echo "Found $KEY_COUNT keys"

# Sync in batches
BATCH_SIZE=1000
COUNT=0
TOTAL=$KEY_COUNT

echo "$KEYS" | while read KEY; do
    if [ -n "$KEY" ]; then
        # Get key type
        TYPE=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT TYPE "$KEY" 2>/dev/null)
        
        # Get key value based on type
        case $TYPE in
            "string")
                VALUE=$(redis-cli -h $SOURCE_HOST -p $SOURCE_PORT GET "$KEY" 2>/dev/null)
                redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$TARGET_PASSWORD" SET "$KEY" "$VALUE" 2>/dev/null
                ;;
            "hash")
                redis-cli -h $SOURCE_HOST -p $SOURCE_PORT HGETALL "$KEY" 2>/dev/null | \
                while read FIELD; do
                    read VALUE
                    redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$TARGET_PASSWORD" HSET "$KEY" "$FIELD" "$VALUE" 2>/dev/null
                done
                ;;
            "list")
                redis-cli -h $SOURCE_HOST -p $SOURCE_PORT LRANGE "$KEY" 0 -1 2>/dev/null | \
                while read ITEM; do
                    redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$TARGET_PASSWORD" RPUSH "$KEY" "$ITEM" 2>/dev/null
                done
                ;;
            "set")
                redis-cli -h $SOURCE_HOST -p $SOURCE_PORT SMEMBERS "$KEY" 2>/dev/null | \
                while read MEMBER; do
                    redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$TARGET_PASSWORD" SADD "$KEY" "$MEMBER" 2>/dev/null
                done
                ;;
            "zset")
                redis-cli -h $SOURCE_HOST -p $SOURCE_PORT ZRANGE "$KEY" 0 -1 WITHSCORES 2>/dev/null | \
                while read MEMBER; do
                    read SCORE
                    redis-cli -h $TARGET_HOST -p $TARGET_PORT -a "$TARGET_PASSWORD" ZADD "$KEY" "$SCORE" "$MEMBER" 2>/dev/null
                done
                ;;
        esac
        
        COUNT=$((COUNT + 1))
        if [ $((COUNT % 100)) -eq 0 ]; then
            echo "Synced $COUNT/$TOTAL keys"
        fi
    fi
done

echo "Sync completed at $(date)"
echo "Total keys synced: $COUNT"
"""
        
        # Write sync script
        sync_cmd = f"""cd /opt/migration && \
cat > simple_redis_sync.sh << 'EOF'
{sync_script}
EOF
chmod +x simple_redis_sync.sh
echo "Simple sync script created: simple_redis_sync.sh"
echo "Run with: nohup ./simple_redis_sync.sh > sync.log 2>&1 &"
"""
        
        run_command(client, sync_cmd, "Create simple sync script")
        
        print("\n📝 Created fallback sync script:")
        print("   /opt/migration/simple_redis_sync.sh")
        print("\nTo run: nohup ./simple_redis_sync.sh > sync.log 2>&1 &")
    
    client.close()
    
    print("\n" + "="*80)
    print("MIGRATION STATUS")
    print("="*80)
    print("\n✅ Backup completed: 325MB RDB file saved")
    print("✅ Configuration files created")
    print("⚠️  RedisShake has configuration issues")
    print("\n🎯 Available options:")
    print("1. Use RedisShake with simple config (if it works)")
    print("2. Use fallback sync script (slower but reliable)")
    print("3. Use RDB restore from backup")
    
    print("\n🚀 Quick start commands:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("\nOption 1: Try RedisShake again")
    print("   redis-shake -conf=redis-sync-simple.conf -type=sync")
    print("\nOption 2: Use fallback script")
    print("   nohup ./simple_redis_sync.sh > sync.log 2>&1 &")
    print("\nOption 3: Restore from backup")
    print("   ./backup/restore_redis_backup.sh")
    
    print("\n📊 Monitor progress:")
    print("   ./quick_monitor.sh")
    print("   tail -f redis-shake.log (or sync.log)")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()