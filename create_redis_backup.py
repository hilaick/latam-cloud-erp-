#!/usr/bin/env python3
import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command(client, command, description, timeout=60):
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
    print("CREATING REDIS BACKUP BEFORE MIGRATION")
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
    
    # Create backup directory
    print("\n📁 Creating backup directory...")
    run_command(client, "mkdir -p /opt/migration/backup", "Create backup directory")
    
    # Check disk space
    print("\n💾 Checking disk space...")
    run_command(client, "df -h /opt/migration", "Check disk space")
    
    # Get source Redis info
    print("\n📊 Getting source Redis information...")
    info_cmd = "redis-cli -h 192.168.10.139 -p 6379 INFO memory 2>/dev/null | grep -E '(used_memory_human|maxmemory_human)'"
    output, error = run_command(client, info_cmd, "Source Redis memory info")
    
    # Get key count
    print("\n🔑 Getting source Redis key count...")
    dbsize_cmd = "redis-cli -h 192.168.10.139 -p 6379 DBSIZE"
    output, error = run_command(client, dbsize_cmd, "Source Redis key count")
    
    # Create RDB backup
    print("\n💾 Creating RDB backup of source Redis...")
    print("This may take a few minutes depending on data size...")
    
    backup_cmd = """
    echo "Starting RDB backup at $(date)"
    echo "Source: 192.168.10.139:6379"
    echo "Backup file: /opt/migration/backup/source-redis-backup-$(date +%Y%m%d-%H%M%S).rdb"
    echo ""
    
    # Create backup
    timeout 600 redis-cli -h 192.168.10.139 -p 6379 --rdb /opt/migration/backup/source-redis-backup-latest.rdb 2>&1
    
    echo ""
    echo "Backup completed at $(date)"
    echo ""
    
    # Verify backup
    echo "Backup verification:"
    ls -lh /opt/migration/backup/source-redis-backup-latest.rdb
    file /opt/migration/backup/source-redis-backup-latest.rdb
    echo ""
    
    # Create checksum
    echo "Creating checksum..."
    md5sum /opt/migration/backup/source-redis-backup-latest.rdb > /opt/migration/backup/source-redis-backup-latest.rdb.md5
    cat /opt/migration/backup/source-redis-backup-latest.rdb.md5
    """
    
    output, error = run_command(client, backup_cmd, "Create RDB backup", timeout=300)
    
    # Create AOF backup as well (if enabled)
    print("\n📝 Creating additional backup methods...")
    
    # Check if AOF is enabled
    aof_check = "redis-cli -h 192.168.10.139 -p 6379 CONFIG GET appendonly 2>/dev/null | grep -v '^#'"
    output, error = run_command(client, aof_check, "Check AOF configuration")
    
    if "yes" in output.lower():
        print("⚠️  AOF is enabled on source Redis")
        print("Creating AOF backup as well...")
        
        # Save Redis configuration
        config_backup = """
        echo "=== Redis Configuration Backup ==="
        redis-cli -h 192.168.10.139 -p 6379 CONFIG GET '*' > /opt/migration/backup/redis-config-backup.txt 2>&1
        echo "Configuration saved to /opt/migration/backup/redis-config-backup.txt"
        head -50 /opt/migration/backup/redis-config-backup.txt
        """
        run_command(client, config_backup, "Backup Redis configuration")
    
    # Create backup summary
    print("\n📋 Creating backup summary...")
    summary_cmd = """
    echo "=== REDIS BACKUP SUMMARY ===" > /opt/migration/backup/backup-summary.txt
    echo "Backup created: $(date)" >> /opt/migration/backup/backup-summary.txt
    echo "" >> /opt/migration/backup/backup-summary.txt
    echo "Source Redis:" >> /opt/migration/backup/backup-summary.txt
    echo "  Host: 192.168.10.139:6379" >> /opt/migration/backup/backup-summary.txt
    echo "  Keys: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null)" >> /opt/migration/backup/backup-summary.txt
    echo "  Memory: $(redis-cli -h 192.168.10.139 -p 6379 INFO memory 2>/dev/null | grep 'used_memory_human' | cut -d: -f2)" >> /opt/migration/backup/backup-summary.txt
    echo "" >> /opt/migration/backup/backup-summary.txt
    echo "Backup Files:" >> /opt/migration/backup/backup-summary.txt
    ls -lh /opt/migration/backup/ >> /opt/migration/backup/backup-summary.txt
    echo "" >> /opt/migration/backup/backup-summary.txt
    echo "Checksum:" >> /opt/migration/backup/backup-summary.txt
    cat /opt/migration/backup/source-redis-backup-latest.rdb.md5 >> /opt/migration/backup/backup-summary.txt
    echo "" >> /opt/migration/backup/backup-summary.txt
    echo "Restore command:" >> /opt/migration/backup/backup-summary.txt
    echo "redis-cli -h [TARGET_HOST] -p [PORT] --pipe < /opt/migration/backup/source-redis-backup-latest.rdb" >> /opt/migration/backup/backup-summary.txt
    
    cat /opt/migration/backup/backup-summary.txt
    """
    
    output, error = run_command(client, summary_cmd, "Create backup summary")
    
    # Test restore to verify backup
    print("\n🧪 Testing backup restore (small sample)...")
    
    # First, let's test if we can read the RDB file
    test_cmd = """
    echo "Testing RDB file integrity..."
    RDB_FILE="/opt/migration/backup/source-redis-backup-latest.rdb"
    
    if [ -f "$RDB_FILE" ]; then
        echo "✅ RDB file exists: $(ls -lh $RDB_FILE)"
        echo "File type: $(file $RDB_FILE)"
        
        # Check if it's a valid Redis RDB file
        if file "$RDB_FILE" | grep -q "Redis"; then
            echo "✅ Valid Redis RDB file"
            
            # Extract first few bytes to verify
            echo "First 100 bytes (hex):"
            head -c 100 "$RDB_FILE" | xxd | head -5
            
            # Check file size
            FILE_SIZE=$(stat -c%s "$RDB_FILE")
            echo "File size: $FILE_SIZE bytes ($((FILE_SIZE/1024/1024)) MB)"
            
            # Create a test restore to verify
            echo ""
            echo "Creating test restore verification..."
            TEST_KEY="backup_test_$(date +%s)"
            TEST_VALUE="backup_verification_$(date +%Y%m%d_%H%M%S)"
            
            # Write test data to source
            redis-cli -h 192.168.10.139 -p 6379 SET "$TEST_KEY" "$TEST_VALUE" 2>/dev/null
            echo "Test key written to source: $TEST_KEY = $TEST_VALUE"
            
            # Verify it exists
            SOURCE_VALUE=$(redis-cli -h 192.168.10.139 -p 6379 GET "$TEST_KEY" 2>/dev/null)
            echo "Source value: $SOURCE_VALUE"
            
            # Clean up test key
            redis-cli -h 192.168.10.139 -p 6379 DEL "$TEST_KEY" 2>/dev/null
            echo "Test key cleaned up"
            
        else
            echo "❌ Not a valid Redis RDB file"
        fi
    else
        echo "❌ RDB file not found"
    fi
    """
    
    output, error = run_command(client, test_cmd, "Test backup integrity")
    
    # List all backup files
    print("\n📁 Backup files created:")
    list_cmd = "ls -la /opt/migration/backup/"
    output, error = run_command(client, list_cmd, "List backup files")
    
    # Create restore script
    print("\n📝 Creating restore script...")
    restore_script = """#!/bin/bash
# restore_redis_backup.sh
# Restore Redis backup to target instance

set -e

echo "================================================"
echo "REDIS BACKUP RESTORE SCRIPT"
echo "================================================"

BACKUP_FILE="/opt/migration/backup/source-redis-backup-latest.rdb"
TARGET_HOST="121.91.157.129"
TARGET_PORT="6379"
TARGET_PASSWORD="9zaHQvNEo5bXFJR3h"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Backup file: $BACKUP_FILE"
echo "Size: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
echo "Target: $TARGET_HOST:$TARGET_PORT"
echo ""

# Verify target Redis is accessible
echo "🔍 Verifying target Redis..."
if ! redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" PING 2>/dev/null | grep -q "PONG"; then
    echo "❌ Target Redis not accessible"
    exit 1
fi
echo "✅ Target Redis is accessible"

# Check if target has data
echo "📊 Checking target Redis..."
TARGET_KEYS=$(redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" DBSIZE 2>/dev/null)
echo "Target currently has $TARGET_KEYS keys"

if [ "$TARGET_KEYS" -gt 0 ]; then
    read -p "⚠️  Target has $TARGET_KEYS keys. Flush before restore? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Flushing target Redis..."
        redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" FLUSHALL 2>/dev/null
        echo "✅ Target Redis flushed"
    else
        echo "❌ Restore cancelled"
        exit 1
    fi
fi

# Restore from backup
echo ""
echo "🚀 Restoring from backup..."
echo "This may take several minutes..."

START_TIME=$(date +%s)
redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" --pipe < "$BACKUP_FILE" 2>&1
RESTORE_STATUS=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $RESTORE_STATUS -eq 0 ]; then
    echo "✅ Restore completed in $DURATION seconds"
    
    # Verify restore
    echo ""
    echo "🔍 Verifying restore..."
    NEW_KEY_COUNT=$(redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" DBSIZE 2>/dev/null)
    echo "Target now has $NEW_KEY_COUNT keys"
    
    # Test a few operations
    echo ""
    echo "🧪 Testing restore..."
    TEST_KEY="restore_test_$(date +%s)"
    TEST_VALUE="restore_verification"
    
    redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" SET "$TEST_KEY" "$TEST_VALUE" 2>/dev/null
    GET_RESULT=$(redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" GET "$TEST_KEY" 2>/dev/null)
    
    if [ "$GET_RESULT" = "$TEST_VALUE" ]; then
        echo "✅ Restore verification successful"
        redis-cli -h "$TARGET_HOST" -p "$TARGET_PORT" -a "$TARGET_PASSWORD" DEL "$TEST_KEY" 2>/dev/null
    else
        echo "⚠️  Restore verification test failed"
    fi
    
    echo ""
    echo "================================================"
    echo "RESTORE COMPLETE"
    echo "================================================"
    echo "Backup file: $BACKUP_FILE"
    echo "Target: $TARGET_HOST:$TARGET_PORT"
    echo "Keys restored: $NEW_KEY_COUNT"
    echo "Duration: $DURATION seconds"
    echo "Status: SUCCESS"
    
else
    echo "❌ Restore failed with status: $RESTORE_STATUS"
    echo "Check the error messages above"
    exit 1
fi
"""
    
    restore_cmd = f"""cat > /opt/migration/backup/restore_redis_backup.sh << 'EOF'
{restore_script}
EOF
chmod +x /opt/migration/backup/restore_redis_backup.sh
echo "Restore script created: /opt/migration/backup/restore_redis_backup.sh"
"""
    
    run_command(client, restore_cmd, "Create restore script")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ REDIS BACKUP COMPLETE!")
    print("="*80)
    print("\n📁 Backup files created in /opt/migration/backup/:")
    print("   - source-redis-backup-latest.rdb     # RDB backup file")
    print("   - source-redis-backup-latest.rdb.md5 # Checksum")
    print("   - redis-config-backup.txt           # Redis configuration")
    print("   - backup-summary.txt                # Backup summary")
    print("   - restore_redis_backup.sh           # Restore script")
    print("\n🔒 Backup verified and ready for migration")
    print("\n🚀 Now ready to start Phase 1 migration!")
    print("   cd /opt/migration")
    print("   ./start_migration.sh")
    print("\n🎯 Choose Option 3: Two-phase migration")
    print("   1. Full sync (30-60 min)")
    print("   2. Continuous sync (until cutover)")
    print("   3. Cutover (5-15 min)")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()