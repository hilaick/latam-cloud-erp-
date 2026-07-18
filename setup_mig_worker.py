#!/usr/bin/env python3
import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command(client, command, description):
    print(f"\n🔧 {description}")
    print(f"   Command: {command}")
    stdin, stdout, stderr = client.exec_command(command, timeout=30)
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    
    if output:
        print(f"   Output: {output[:500]}{'...' if len(output) > 500 else ''}")
    if error:
        print(f"   Error: {error[:500]}{'...' if len(error) > 500 else ''}")
    
    return output, error

try:
    print("="*80)
    print("MIG_WORKER SETUP AND DISCOVERY")
    print("="*80)
    
    # Connect
    print(f"\n🔗 Connecting to {host}...")
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
    
    # Check system info
    run_command(client, "uname -a", "System information")
    run_command(client, "cat /etc/os-release | grep PRETTY_NAME", "OS version")
    run_command(client, "df -h /", "Disk usage")
    run_command(client, "free -h", "Memory usage")
    
    # Install migration tools
    print("\n" + "="*80)
    print("INSTALLING MIGRATION TOOLS")
    print("="*80)
    
    # Update system
    run_command(client, "apt-get update", "Updating package lists")
    
    # Install Redis tools
    run_command(client, "apt-get install -y redis-tools", "Installing Redis tools")
    
    # Install Memcached tools
    run_command(client, "apt-get install -y libmemcached-tools netcat-openbsd", "Installing Memcached tools")
    
    # Install monitoring tools
    run_command(client, "apt-get install -y curl wget git htop iotop iftop nload", "Installing monitoring tools")
    
    # Install Huawei Cloud CLI
    print("\n📦 Installing Huawei Cloud CLI...")
    hcloud_cmd = """
    wget -q https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/huaweicloud-cli-linux-amd64.tar.gz -O /tmp/huaweicloud-cli.tar.gz && \
    tar -xzf /tmp/huaweicloud-cli.tar.gz -C /tmp && \
    chmod +x /tmp/huaweicloud-cli && \
    mv /tmp/huaweicloud-cli /usr/local/bin/hcloud && \
    rm /tmp/huaweicloud-cli.tar.gz && \
    hcloud --version
    """
    run_command(client, hcloud_cmd, "Installing Huawei Cloud CLI")
    
    # Create migration directory
    run_command(client, "mkdir -p /opt/migration", "Creating migration directory")
    
    # Copy discovery script
    print("\n📄 Copying discovery script...")
    with open('/home/huawei-cloud/latam-cloud-erp-/discover.sh', 'r') as f:
        discover_script = f.read()
    
    # Upload discovery script
    sftp = client.open_sftp()
    remote_file = sftp.file('/opt/migration/discover.sh', 'w')
    remote_file.write(discover_script)
    remote_file.close()
    
    run_command(client, "chmod +x /opt/migration/discover.sh", "Making discovery script executable")
    
    # Create test scripts
    test_redis = '''#!/bin/bash
REDIS_HOST="${1:-localhost}"
REDIS_PORT="${2:-6379}"
echo "Testing Redis at $REDIS_HOST:$REDIS_PORT..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING
if [ $? -eq 0 ]; then
    echo "✅ Redis connected"
    echo ""
    echo "Redis INFO:"
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO | grep -E "(redis_version|used_memory_human|connected_clients|role|master|slave)"
else
    echo "❌ Redis connection failed"
fi
'''
    
    test_memcached = '''#!/bin/bash
MEMCACHED_HOST="${1:-localhost}"
MEMCACHED_PORT="${2:-11211}"
echo "Testing Memcached at $MEMCACHED_HOST:$MEMCACHED_PORT..."
echo "stats" | timeout 5 nc "$MEMCACHED_HOST" "$MEMCACHED_PORT" | head -20
if [ $? -eq 0 ]; then
    echo "✅ Memcached connected"
else
    echo "❌ Memcached connection failed"
fi
'''
    
    remote_file = sftp.file('/opt/migration/test_redis.sh', 'w')
    remote_file.write(test_redis)
    remote_file.close()
    
    remote_file = sftp.file('/opt/migration/test_memcached.sh', 'w')
    remote_file.write(test_memcached)
    remote_file.close()
    
    run_command(client, "chmod +x /opt/migration/test_redis.sh /opt/migration/test_memcached.sh", "Making test scripts executable")
    
    sftp.close()
    
    print("\n" + "="*80)
    print("MIG_WORKER SETUP COMPLETE")
    print("="*80)
    
    # Check what's installed
    run_command(client, "ls -la /opt/migration", "Migration directory contents")
    run_command(client, "which redis-cli memcat hcloud", "Installed tools check")
    
    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)
    print("\nTo discover DCS instances, run:")
    print("  cd /opt/migration")
    print("  ./discover.sh")
    print("\nThis will:")
    print("  1. List all DCS instances")
    print("  2. Find Redis and Memcached instances")
    print("  3. Get specifications and private IPs")
    print("  4. Test connectivity")
    
    # Test Huawei Cloud CLI connectivity
    print("\n🔍 Testing Huawei Cloud CLI connectivity...")
    run_command(client, "hcloud --version", "Huawei Cloud CLI version")
    
    client.close()
    print("\n✅ mig_worker setup complete!")
    print("📁 Discovery script: /opt/migration/discover.sh")
    print("🔧 Test scripts: /opt/migration/test_redis.sh, /opt/migration/test_memcached.sh")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)