#!/bin/bash
# redis_migration.sh
# Complete Redis migration from source to target

set -e

echo "================================================"
echo "REDIS MIGRATION SCRIPT"
echo "================================================"

# Configuration
SOURCE_REDIS="192.168.10.139:6379"
TARGET_REDIS="121.91.157.129:6379"
TARGET_PASSWORD="9zaHQvNEo5bXFJR3h"
MIGRATION_DIR="/opt/migration"
LOG_FILE="$MIGRATION_DIR/redis_migration.log"

echo "Source: $SOURCE_REDIS (no password)"
echo "Target: $TARGET_REDIS (password protected)"
echo ""

# Create migration directory
mkdir -p $MIGRATION_DIR
cd $MIGRATION_DIR

# Install RedisShake if not installed
echo "🔧 Checking RedisShake installation..."
if ! command -v redis-shake &> /dev/null; then
    echo "Installing RedisShake..."
    cd /tmp
    wget -q https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake.tar.gz
    tar -xzf redis-shake.tar.gz
    chmod +x redis-shake
    mv redis-shake /usr/local/bin/
    rm redis-shake.tar.gz
    echo "✅ RedisShake installed"
else
    echo "✅ RedisShake already installed"
fi

# Create RedisShake configuration
echo "📝 Creating RedisShake configuration..."
cat > redis-sync.conf << EOF
# Source Redis (UTISA)
source.type = standalone
source.address = $SOURCE_REDIS
source.password_raw = 

# Target Redis (ULEARNING)
target.type = standalone
target.address = $TARGET_REDIS
target.password_raw = $TARGET_PASSWORD

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
log.file = $MIGRATION_DIR/redis-shake.log
log.level = info
EOF

echo "✅ Configuration created: $MIGRATION_DIR/redis-sync.conf"

# Verify connectivity
echo "🔍 Verifying connectivity..."
echo "Testing source Redis..."
if redis-cli -h 192.168.10.139 -p 6379 PING | grep -q "PONG"; then
    echo "✅ Source Redis is accessible"
else
    echo "❌ Source Redis not accessible"
    exit 1
fi

echo "Testing target Redis..."
if redis-cli -h 121.91.157.129 -p 6379 -a "$TARGET_PASSWORD" PING 2>/dev/null | grep -q "PONG"; then
    echo "✅ Target Redis is accessible"
else
    echo "❌ Target Redis not accessible"
    exit 1
fi

# Get initial key counts
echo "📊 Getting initial key counts..."
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE)
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a "$TARGET_PASSWORD" DBSIZE 2>/dev/null)

echo "Source Redis keys: $SOURCE_KEYS"
echo "Target Redis keys: $TARGET_KEYS"

if [ "$TARGET_KEYS" -gt 0 ]; then
    echo "⚠️  WARNING: Target Redis has $TARGET_KEYS keys"
    read -p "Do you want to flush target Redis before migration? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Flushing target Redis..."
        redis-cli -h 121.91.157.129 -p 6379 -a "$TARGET_PASSWORD" FLUSHALL 2>/dev/null
        echo "✅ Target Redis flushed"
    fi
fi

echo ""
echo "================================================"
echo "MIGRATION OPTIONS"
echo "================================================"
echo "1. One-time full sync (sync mode)"
echo "2. Continuous real-time sync (rump mode)"
echo "3. Two-phase: Full sync + continuous sync"
echo ""
read -p "Choose option (1/2/3): " -n 1 -r
echo

case $REPLY in
    1)
        echo "🚀 Starting one-time full sync..."
        echo "This will copy all data and then stop."
        echo "Logs: $MIGRATION_DIR/redis-shake.log"
        redis-shake -conf=redis-sync.conf -type=sync
        ;;
    2)
        echo "🔄 Starting continuous real-time sync..."
        echo "This will keep target in sync with source until stopped."
        echo "Press Ctrl+C to stop when ready for cutover."
        echo "Logs: $MIGRATION_DIR/redis-shake.log"
        redis-shake -conf=redis-sync.conf -type=rump
        ;;
    3)
        echo "📦 Starting two-phase migration..."
        
        # Phase 1: Full sync
        echo "Phase 1: Full sync (initial copy)..."
        redis-shake -conf=redis-sync.conf -type=sync
        
        # Check if sync completed
        if [ $? -eq 0 ]; then
            echo "✅ Phase 1 completed"
            
            # Get key counts after sync
            SOURCE_KEYS_AFTER=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE)
            TARGET_KEYS_AFTER=$(redis-cli -h 121.91.157.129 -p 6379 -a "$TARGET_PASSWORD" DBSIZE 2>/dev/null)
            
            echo "Source keys: $SOURCE_KEYS_AFTER"
            echo "Target keys: $TARGET_KEYS_AFTER"
            
            if [ "$SOURCE_KEYS_AFTER" -eq "$TARGET_KEYS_AFTER" ]; then
                echo "✅ Key counts match!"
            else
                echo "⚠️  Key counts don't match: Source=$SOURCE_KEYS_AFTER, Target=$TARGET_KEYS_AFTER"
            fi
            
            # Phase 2: Continuous sync
            echo ""
            echo "Phase 2: Continuous sync (real-time replication)..."
            echo "This will capture ongoing changes until cutover."
            echo "Press Ctrl+C when ready to switch applications."
            redis-shake -conf=redis-sync.conf -type=rump
        else
            echo "❌ Phase 1 failed, check logs: $MIGRATION_DIR/redis-shake.log"
            exit 1
        fi
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

# Monitor function
monitor_sync() {
    echo ""
    echo "================================================"
    echo "MONITORING MIGRATION PROGRESS"
    echo "================================================"
    echo "1. Tail logs: tail -f $MIGRATION_DIR/redis-shake.log"
    echo "2. Check key counts:"
    echo "   Source: redis-cli -h 192.168.10.139 -p 6379 DBSIZE"
    echo "   Target: redis-cli -h 121.91.157.129 -p 6379 -a '$TARGET_PASSWORD' DBSIZE"
    echo "3. Check sync status in logs:"
    echo "   grep -E '(progress|sync|rump)' $MIGRATION_DIR/redis-shake.log"
    echo ""
    echo "To stop migration: Press Ctrl+C"
}

# Run monitor in background
monitor_sync

echo ""
echo "================================================"
echo "CUTOVER INSTRUCTIONS"
echo "================================================"
echo "When migration is complete:"
echo "1. Stop writes to source Redis (temporarily)"
echo "2. Let RedisShake catch up final changes"
echo "3. Update application configuration:"
echo "   - Change Redis host to: 121.91.157.129"
echo "   - Set password to: $TARGET_PASSWORD"
echo "4. Test application with target Redis"
echo "5. If successful, stop source Redis"
echo "6. Monitor target Redis performance"
echo ""
echo "Migration configuration saved to: $MIGRATION_DIR/redis-sync.conf"
echo "Logs: $MIGRATION_DIR/redis-shake.log"
echo "Progress monitoring: $MIGRATION_DIR/redis_migration.log"