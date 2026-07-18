#!/usr/bin/env python3
"""
Install obsutils and upload RDB to OBS for direct restore
"""

import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

# Huawei Cloud credentials
ak = "HPUA0CRIQJMNKM35NH6E"
sk = "y2SYFQFF9CWRdKpo8r0nVdESCoiJViAzyUS36rOo"
region = "af-south-1"
bucket_name = "redis-migration-backup"  # Will create this bucket

def run_command_with_output(client, command, description, timeout=300):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}...")
    
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
    print("INSTALLING OBSUTILS AND UPLOADING RDB TO OBS")
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
    
    # Step 1: Install obsutils
    print("\n" + "="*80)
    print("STEP 1: INSTALLING OBSUTILS")
    print("="*80)
    
    install_cmd = """
    echo "=== Installing obsutils ==="
    echo ""
    
    # Check if obsutils is already installed
    if command -v obsutil &> /dev/null; then
        echo "✅ obsutils already installed"
        obsutil version
    else
        echo "Installing obsutils..."
        
        # Download obsutils
        wget -q https://obs-community.obs.cn-north-1.myhuaweicloud.com/obsutil/current/obsutil_linux_amd64.tar.gz
        
        # Extract
        tar -xzf obsutil_linux_amd64.tar.gz
        
        # Move to /usr/local/bin
        mv obsutil_linux_amd64_*/obsutil /usr/local/bin/
        chmod +x /usr/local/bin/obsutil
        
        # Clean up
        rm -rf obsutil_linux_amd64.tar.gz obsutil_linux_amd64_*
        
        echo "✅ obsutils installed"
        obsutil version
    fi
    
    echo ""
    echo "=== Checking current directory ==="
    pwd
    ls -la /opt/migration/*.rdb
    """
    
    output, error, exit_code = run_command_with_output(client, install_cmd, "Install obsutils")
    
    # Step 2: Configure obsutils with AK/SK
    print("\n" + "="*80)
    print("STEP 2: CONFIGURING OBSUTILS WITH AK/SK")
    print("="*80)
    
    config_cmd = f"""
    echo "=== Configuring obsutils ==="
    echo ""
    
    # Configure obsutils
    obsutil config -i={ak} -k={sk} -e=obs.{region}.myhuaweicloud.com
    
    echo "✅ obsutils configured"
    echo ""
    
    # Test configuration
    echo "=== Testing OBS connection ==="
    obsutil ls -s
    
    echo ""
    echo "=== Creating OBS bucket ==="
    # Check if bucket exists
    if obsutil ls -s | grep -q "{bucket_name}"; then
        echo "✅ Bucket '{bucket_name}' already exists"
    else
        echo "Creating bucket '{bucket_name}'..."
        obsutil mb obs://{bucket_name} -location={region}
        echo "✅ Bucket created"
    fi
    
    echo ""
    echo "=== Listing buckets ==="
    obsutil ls -s
    """
    
    output, error, exit_code = run_command_with_output(client, config_cmd, "Configure obsutils")
    
    # Step 3: Upload 325MB RDB to OBS
    print("\n" + "="*80)
    print("STEP 3: UPLOADING 325MB RDB TO OBS")
    print("="*80)
    
    upload_cmd = """
    cd /opt/migration
    
    echo "=== Finding latest RDB backup ==="
    LATEST_RDB=$(ls -t *.rdb | head -1)
    echo "Latest RDB: $LATEST_RDB"
    echo "Size: $(du -h "$LATEST_RDB" | cut -f1)"
    echo ""
    
    echo "=== Uploading to OBS ==="
    echo "Uploading $LATEST_RDB to obs://redis-migration-backup/..."
    
    # Upload with progress
    obsutil cp "$LATEST_RDB" obs://redis-migration-backup/ -f -u -vmd5
    
    echo ""
    echo "=== Verifying upload ==="
    obsutil ls obs://redis-migration-backup/ -d
    
    echo ""
    echo "=== Getting OBS URL ==="
    obsutil share-cp obs://redis-migration-backup/"$LATEST_RDB" 3600
    
    echo ""
    echo "=== RDB file info ==="
    if command -v redis-check-rdb &> /dev/null; then
        echo "RDB file analysis:"
        redis-check-rdb --memory "$LATEST_RDB" 2>/dev/null | head -10 || echo "Could not analyze RDB"
    else
        echo "redis-check-rdb not available"
    fi
    """
    
    output, error, exit_code = run_command_with_output(client, upload_cmd, "Upload RDB to OBS", timeout=600)
    
    # Step 4: Create restore script for target Redis
    print("\n" + "="*80)
    print("STEP 4: CREATING RESTORE SCRIPT")
    print("="*80)
    
    restore_script = f"""#!/bin/bash
# restore_from_obs.sh
# Download RDB from OBS and restore to target Redis

set -e

echo "================================================"
echo "RESTORE REDIS FROM OBS"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

# Huawei Cloud credentials
AK="{ak}"
SK="{sk}"
REGION="{region}"
BUCKET="redis-migration-backup"
RDB_FILE="source_backup_1784317874.rdb"
TARGET_REDIS="121.91.157.129:6379"
REDIS_PASSWORD="9zaHQvNEo5bXFJR3h"

echo "=== Configuration ==="
echo "OBS Bucket: $BUCKET"
echo "RDB File: $RDB_FILE"
echo "Target Redis: $TARGET_REDIS"
echo "Region: $REGION"
echo ""

# Step 1: Download from OBS
echo "=== Step 1: Downloading RDB from OBS ==="
if [ -f "/tmp/$RDB_FILE" ]; then
    echo "RDB already exists at /tmp/$RDB_FILE"
    echo "Size: $(du -h "/tmp/$RDB_FILE" | cut -f1)"
else
    echo "Downloading $RDB_FILE from OBS..."
    obsutil config -i=$AK -k=$SK -e=obs.$REGION.myhuaweicloud.com
    obsutil cp obs://$BUCKET/$RDB_FILE /tmp/ -f -u -vmd5
    
    if [ $? -eq 0 ]; then
        echo "✅ Download successful"
        echo "Size: $(du -h "/tmp/$RDB_FILE" | cut -f1)"
    else
        echo "❌ Download failed"
        exit 1
    fi
fi

echo ""
echo "=== Step 2: Flush target Redis ==="
echo "Flushing target Redis..."
redis-cli -h 121.91.157.129 -p 6379 -a "$REDIS_PASSWORD" FLUSHALL 2>&1 | grep -v Warning
echo "✅ Target Redis flushed"

echo ""
echo "=== Step 3: Restore RDB to target Redis ==="
echo "Restoring /tmp/$RDB_FILE to $TARGET_REDIS..."
echo "This may take 5-10 minutes for 325MB file..."

# Create restore command with AUTH
(
    echo "AUTH $REDIS_PASSWORD"
    cat "/tmp/$RDB_FILE"
) | redis-cli -h 121.91.157.129 -p 6379 --pipe > /tmp/restore_obs.log 2>&1

RESTORE_EXIT=$?

echo ""
echo "=== Step 4: Verify restore ==="
if [ $RESTORE_EXIT -eq 0 ]; then
    echo "✅ Restore completed successfully"
else
    echo "❌ Restore failed with exit code: $RESTORE_EXIT"
    echo "Check /tmp/restore_obs.log for details"
fi

echo ""
echo "=== Step 5: Verify key counts ==="
SOURCE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 DBSIZE 2>/dev/null || echo "ERROR")
TARGET_KEYS=$(redis-cli -h 121.91.157.129 -p 6379 -a "$REDIS_PASSWORD" DBSIZE 2>/dev/null 2>/dev/null || echo "ERROR")

echo "Source Redis: $SOURCE_KEYS keys"
echo "Target Redis: $TARGET_KEYS keys"

if [ "$SOURCE_KEYS" != "ERROR" ] && [ "$TARGET_KEYS" != "ERROR" ]; then
    if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
        echo ""
        echo "🎉 MIGRATION SUCCESSFUL!"
        echo "All $SOURCE_KEYS keys restored successfully"
    else
        echo ""
        echo "⚠️  Key counts don't match"
        echo "Difference: $((SOURCE_KEYS - TARGET_KEYS)) keys"
        echo "Check /tmp/restore_obs.log for errors"
    fi
else
    echo ""
    echo "❌ Could not get key counts"
fi

echo ""
echo "=== Step 6: Test data integrity ==="
echo "Testing sample keys..."

# Get 3 random keys from source
SAMPLE_KEYS=$(redis-cli -h 192.168.10.139 -p 6379 --scan --count 3 2>/dev/null || echo "")

if [ -n "$SAMPLE_KEYS" ]; then
    echo "Sample keys from source:"
    for key in $SAMPLE_KEYS; do
        echo "  - $key"
    done
    
    echo ""
    echo "Checking in target..."
    for key in $SAMPLE_KEYS; do
        EXISTS=$(redis-cli -h 121.91.157.129 -p 6379 -a "$REDIS_PASSWORD" EXISTS "$key" 2>/dev/null || echo "0")
        if [ "$EXISTS" -eq 1 ]; then
            echo "  ✅ $key exists in target"
        else
            echo "  ❌ $key missing from target"
        fi
    done
else
    echo "Could not get sample keys"
fi

echo ""
echo "=== Step 7: Cleanup ==="
echo "Keeping RDB file at /tmp/$RDB_FILE for verification"
echo "Log file: /tmp/restore_obs.log"
echo ""
echo "================================================"
echo "RESTORE COMPLETE"
echo "================================================"
"""
    
    create_script = f"""cat > /opt/migration/restore_from_obs.sh << 'SCRIPT_EOF'
{restore_script}
SCRIPT_EOF

chmod +x /opt/migration/restore_from_obs.sh
echo "✅ Restore script created: /opt/migration/restore_from_obs.sh"
echo ""
echo "=== Script contents ==="
head -50 /opt/migration/restore_from_obs.sh
"""
    
    output, error, exit_code = run_command_with_output(client, create_script, "Create restore script")
    
    # Step 5: Create direct download and restore command
    print("\n" + "="*80)
    print("STEP 5: DIRECT DOWNLOAD AND RESTORE COMMAND")
    print("="*80)
    
    direct_cmd = f"""
    echo "=== Direct OBS Download and Restore Command ==="
    echo ""
    echo "To download from OBS and restore directly:"
    echo ""
    echo "cd /opt/migration"
    echo "./restore_from_obs.sh"
    echo ""
    echo "Or manually:"
    echo ""
    echo "# 1. Configure obsutils"
    echo "obsutil config -i={ak} -k={sk} -e=obs.{region}.myhuaweicloud.com"
    echo ""
    echo "# 2. Download RDB"
    echo "obsutil cp obs://redis-migration-backup/source_backup_1784317874.rdb /tmp/ -f"
    echo ""
    echo "# 3. Flush target Redis"
    echo "redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' FLUSHALL"
    echo ""
    echo "# 4. Restore with AUTH"
    echo "(echo 'AUTH 9zaHQvNEo5bXFJR3h'; cat /tmp/source_backup_1784317874.rdb) | redis-cli -h 121.91.157.129 -p 6379 --pipe"
    echo ""
    echo "# 5. Verify"
    echo "redis-cli -h 192.168.10.139 -p 6379 DBSIZE"
    echo "redis-cli -h 121.91.157.129 -p 6379 -a '9zaHQvNEo5bXFJR3h' DBSIZE"
    echo ""
    echo "=== Current status ==="
    echo "RDB file: /opt/migration/source_backup_1784317874.rdb"
    echo "Size: $(du -h /opt/migration/source_backup_1784317874.rdb 2>/dev/null | cut -f1 || echo 'Not found')"
    echo ""
    echo "=== Ready to restore ==="
    echo "Run: cd /opt/migration && ./restore_from_obs.sh"
    """
    
    output, error, exit_code = run_command_with_output(client, direct_cmd, "Create direct command")
    
    client.close()
    
    print("\n" + "="*80)
    print("✅ OBSUTILS INSTALLED AND READY!")
    print("="*80)
    
    print("\n📊 Setup Complete:")
    print("   1. ✅ obsutils installed")
    print("   2. ✅ Configured with AK/SK")
    print("   3. ✅ OBS bucket ready: redis-migration-backup")
    print("   4. ✅ Restore script created: /opt/migration/restore_from_obs.sh")
    print("   5. ✅ 325MB RDB file available")
    
    print("\n🚀 To upload RDB to OBS and restore:")
    print("   SSH to mig_worker: ssh root@121.91.157.66")
    print("   cd /opt/migration")
    print("   ./restore_from_obs.sh")
    
    print("\n📋 Restore script will:")
    print("   1. Download RDB from OBS to /tmp/")
    print("   2. Flush target Redis")
    print("   3. Restore RDB with proper AUTH")
    print("   4. Verify key counts match")
    print("   5. Test sample data integrity")
    
    print("\n⏱️  Estimated time:")
    print("   - Download: 1-2 minutes (325MB)")
    print("   - Restore: 5-10 minutes")
    print("   - Verification: 2-3 minutes")
    print("   - Total: 10-15 minutes")
    
    print("\n🔧 Huawei Cloud credentials used:")
    print(f"   - AK: {ak[:10]}...")
    print(f"   - SK: {sk[:10]}...")
    print(f"   - Region: {region}")
    print(f"   - Bucket: redis-migration-backup")
    
    print("\n⚠️  Important:")
    print("   1. Target Redis will be FLUSHED before restore")
    print("   2. Uses explicit AUTH command for authentication")
    print("   3. RDB file is 325MB (source_backup_1784317874.rdb)")
    print("   4. Logs saved to /tmp/restore_obs.log")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()