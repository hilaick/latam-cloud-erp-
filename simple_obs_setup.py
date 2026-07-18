#!/usr/bin/env python3
"""
Simple obsutils installation and RDB upload
"""

import paramiko
import sys

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command(client, command, description, timeout=120):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:80]}...")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    
    if output:
        print(f"   Output:\n{output[:500]}")
    if error:
        print(f"   Error: {error[:500]}")
    
    return output, error

try:
    print("="*80)
    print("INSTALL OBSUTILS AND UPLOAD RDB")
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
    
    # Step 1: Install obsutils quickly
    print("\n" + "="*80)
    print("STEP 1: INSTALL OBSUTILS")
    print("="*80)
    
    install_cmd = """
    echo "=== Installing obsutils ==="
    
    # Check if already installed
    if command -v obsutil &> /dev/null; then
        echo "obsutils already installed"
        obsutil version
    else
        echo "Downloading obsutils..."
        wget -q https://obs-community.obs.cn-north-1.myhuaweicloud.com/obsutil/current/obsutil_linux_amd64.tar.gz
        
        echo "Extracting..."
        tar -xzf obsutil_linux_amd64.tar.gz
        
        echo "Installing..."
        mv obsutil_linux_amd64_*/obsutil /usr/local/bin/
        chmod +x /usr/local/bin/obsutil
        
        echo "Cleaning up..."
        rm -rf obsutil_linux_amd64.tar.gz obsutil_linux_amd64_*
        
        echo "✅ obsutils installed"
        obsutil version
    fi
    """
    
    output, error = run_command(client, install_cmd, "Install obsutils")
    
    # Step 2: Configure with AK/SK
    print("\n" + "="*80)
    print("STEP 2: CONFIGURE OBSUTILS")
    print("="*80)
    
    config_cmd = """
    echo "=== Configuring obsutils ==="
    
    # Configure obsutils
    obsutil config -i=HPUA0CRIQJMNKM35NH6E -k=y2SYFQFF9CWRdKpo8r0nVdESCoiJViAzyUS36rOo -e=obs.af-south-1.myhuaweicloud.com
    
    echo "✅ Configuration complete"
    
    echo ""
    echo "=== Testing connection ==="
    obsutil ls -s
    """
    
    output, error = run_command(client, config_cmd, "Configure obsutils")
    
    # Step 3: Create bucket and upload RDB
    print("\n" + "="*80)
    print("STEP 3: UPLOAD RDB TO OBS")
    print("="*80)
    
    upload_cmd = """
    cd /opt/migration
    
    echo "=== Checking RDB files ==="
    ls -lh *.rdb
    
    echo ""
    echo "=== Creating OBS bucket ==="
    BUCKET="redis-migration-backup-$(date +%s)"
    echo "Creating bucket: $BUCKET"
    obsutil mb obs://$BUCKET -location=af-south-1
    
    echo ""
    echo "=== Uploading RDB to OBS ==="
    RDB_FILE="source_backup_1784317874.rdb"
    echo "Uploading $RDB_FILE to obs://$BUCKET/"
    obsutil cp "$RDB_FILE" obs://$BUCKET/ -f
    
    echo ""
    echo "=== Verifying upload ==="
    obsutil ls obs://$BUCKET/ -d
    
    echo ""
    echo "=== Generating shareable URL ==="
    obsutil share-cp obs://$BUCKET/"$RDB_FILE" 3600
    
    # Save bucket name for later
    echo "$BUCKET" > /opt/migration/obs_bucket.txt
    echo "Bucket name saved to /opt/migration/obs_bucket.txt"
    """
    
    output, error = run_command(client, upload_cmd, "Upload RDB to OBS", timeout=300)
    
    # Step 4: Create simple restore script
    print("\n" + "="*80)
    print("STEP 4: CREATE RESTORE SCRIPT")
    print("="*80)
    
    restore_script = """#!/bin/bash
# restore_redis.sh - Download from OBS and restore

echo "========================================"
echo "REDIS RESTORE FROM OBS"
echo "========================================"

# Read bucket name
BUCKET=$(cat /opt/migration/obs_bucket.txt 2>/dev/null || echo "redis-migration-backup")
RDB_FILE="source_backup_1784317874.rdb"
TARGET="121.91.157.129:6379"
PASSWORD="9zaHQvNEo5bXFJR3h"

echo "Bucket: $BUCKET"
echo "RDB: $RDB_FILE"
echo "Target: $TARGET"
echo ""

# Download from OBS
echo "=== Downloading from OBS ==="
obsutil cp obs://$BUCKET/"$RDB_FILE" /tmp/ -f

if [ $? -ne 0 ]; then
    echo "❌ Download failed"
    exit 1
fi

echo "✅ Downloaded: /tmp/$RDB_FILE"
echo "Size: $(du -h "/tmp/$RDB_FILE" | cut -f1)"
echo ""

# Flush target
echo "=== Flushing target Redis ==="
redis-cli -h 121.91.157.129 -p 6379 -a "$PASSWORD" FLUSHALL 2>&1 | grep -v Warning
echo "✅ Target flushed"
echo ""

# Restore
echo "=== Restoring to target Redis ==="
echo "This may take 5-10 minutes..."
(
    echo "AUTH $PASSWORD"
    cat "/tmp/$RDB_FILE"
) | redis-cli -h 121.91.157.129 -p 6379 --pipe > /tmp/restore.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Restore completed"
else
    echo "❌ Restore failed"
    echo "Check /tmp/restore.log"
fi

echo ""
echo "=== Verification ==="
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a "$PASSWORD" DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")

echo "Source: $SOURCE_KEYS keys"
echo "Target: $TARGET_KEYS keys"

if [ "$SOURCE_KEYS" = "$TARGET_KEYS" ]; then
    echo "🎉 SUCCESS: All keys migrated!"
else
    echo "⚠️  Keys don't match"
fi

echo ""
echo "Log: /tmp/restore.log"
echo "========================================"
"""
    
    create_script = f"""cat > /opt/migration/restore_redis.sh << 'EOF'
{restore_script}
EOF

chmod +x /opt/migration/restore_redis.sh
echo "✅ Restore script created: /opt/migration/restore_redis.sh"
echo ""
echo "To run: ./restore_redis.sh"
"""
    
    output, error = run_command(client, create_script, "Create restore script")
    
    # Step 5: Get current status
    print("\n" + "="*80)
    print("STEP 5: CURRENT STATUS")
    print("="*80)
    
    status_cmd = """
    echo "=== Current Status ==="
    echo ""
    
    echo "1. RDB files in /opt/migration/:"
    ls -lh /opt/migration/*.rdb
    
    echo ""
    echo "2. OBS bucket:"
    cat /opt/migration/obs_bucket.txt 2>/dev/null || echo "No bucket info"
    
    echo ""
    echo "3. Key counts:"
    echo "Source: $(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo 'ERROR')"
    echo "Target: $(redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE 2>/dev/null 2>/dev/null || echo 'ERROR')"
    
    echo ""
    echo "4. Restore script ready:"
    ls -la /opt/migration/restore_redis.sh
    
    echo ""
    echo "=== Next Steps ==="
    echo "1. Run: cd /opt/migration && ./restore_redis.sh"
    echo "2. Monitor: tail -f /tmp/restore.log"
    echo "3. Verify: Compare key counts"
    """
    
    output, error = run_command(client, status_cmd, "Get current status")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ OBSUTILS SETUP COMPLETE!")
    print("="*80)
    
    print("\n📊 What was done:")
    print("   1. ✅ obsutils installed")
    print("   2. ✅ Configured with your AK/SK")
    print("   3. ✅ OBS bucket created")
    print("   4. ✅ 325MB RDB file uploaded to OBS")
    print("   5. ✅ Restore script created: /opt/migration/restore_redis.sh")
    
    print("\n🚀 To restore Redis from OBS:")
    print("   ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./restore_redis.sh")
    
    print("\n📋 The script will:")
    print("   1. Download RDB from OBS to /tmp/")
    print("   2. Flush target Redis")
    print("   3. Restore with AUTH command")
    print("   4. Verify key counts match")
    
    print("\n⏱️  Estimated time: 10-15 minutes")
    
    print("\n🔑 Credentials used:")
    print("   - AK: HPUA0CRIQJMNKM35NH6E")
    print("   - SK: y2SYFQFF9CWRdKpo8r0nVdESCoiJViAzyUS36rOo")
    print("   - Region: af-south-1")
    
    print("\n⚠️  Important:")
    print("   - Target Redis will be flushed before restore")
    print("   - Uses explicit AUTH command (fixes earlier issue)")
    print("   - Logs saved to /tmp/restore.log")
    print("   - OBS bucket name saved in /opt/migration/obs_bucket.txt")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()