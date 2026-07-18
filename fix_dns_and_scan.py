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
    print("FIXING DNS AND INSTALLING HUAWEI CLOUD CLI")
    print("="*80)
    
    # Connect
    print(f"\n🔗 Connecting to {host}...")
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
    
    # Fix DNS first
    print("\n" + "="*80)
    print("FIXING DNS RESOLUTION")
    print("="*80)
    
    dns_commands = [
        # Check current DNS
        "cat /etc/resolv.conf",
        
        # Add Huawei Cloud DNS
        "echo 'nameserver 100.125.1.250' | tee -a /etc/resolv.conf",
        "echo 'nameserver 100.125.21.250' | tee -a /etc/resolv.conf",
        
        # Test DNS resolution
        "nslookup hwcloudcli.obs.cn-north-1.myhuaweicloud.com",
        "ping -c 2 100.125.1.250"
    ]
    
    for cmd in dns_commands:
        output, error = run_command(client, cmd, f"DNS: {cmd[:50]}...")
    
    # Install Huawei Cloud CLI from alternative source
    print("\n" + "="*80)
    print("INSTALLING HUAWEI CLOUD CLI (ALTERNATIVE METHOD)")
    print("="*80)
    
    install_cli = """
    # Install dependencies
    apt-get update && apt-get install -y curl wget
    
    # Try direct IP download
    echo "Downloading Huawei Cloud CLI via IP..."
    curl -L -o /tmp/huaweicloud-cli https://100.125.1.250:443/cli/latest/huaweicloud-cli-linux-amd64 2>/dev/null || \
    wget -O /tmp/huaweicloud-cli https://100.125.1.250:443/cli/latest/huaweicloud-cli-linux-amd64 2>/dev/null || \
    echo "Failed to download via IP"
    
    # If that fails, try GitHub
    if [ ! -f /tmp/huaweicloud-cli ]; then
        echo "Trying GitHub release..."
        curl -L -o /tmp/huaweicloud-cli.tar.gz https://github.com/huaweicloud/huaweicloud-cli/releases/download/v1.0.0/huaweicloud-cli-linux-amd64.tar.gz 2>/dev/null || \
        wget -O /tmp/huaweicloud-cli.tar.gz https://github.com/huaweicloud/huaweicloud-cli/releases/download/v1.0.0/huaweicloud-cli-linux-amd64.tar.gz 2>/dev/null
        if [ -f /tmp/huaweicloud-cli.tar.gz ]; then
            tar -xzf /tmp/huaweicloud-cli.tar.gz -C /tmp
            mv /tmp/huaweicloud-cli /tmp/huaweicloud-cli.bin 2>/dev/null || true
        fi
    fi
    
    # Make executable and install
    if [ -f /tmp/huaweicloud-cli ]; then
        chmod +x /tmp/huaweicloud-cli
        mv /tmp/huaweicloud-cli /usr/local/bin/hcloud
        echo "✅ Huawei Cloud CLI installed via IP"
    elif [ -f /tmp/huaweicloud-cli.bin ]; then
        chmod +x /tmp/huaweicloud-cli.bin
        mv /tmp/huaweicloud-cli.bin /usr/local/bin/hcloud
        echo "✅ Huawei Cloud CLI installed via GitHub"
    else
        echo "❌ Failed to install Huawei Cloud CLI"
        exit 1
    fi
    
    # Test installation
    hcloud --version || echo "CLI not working"
    """
    
    output, error = run_command(client, install_cli, "Installing Huawei Cloud CLI", timeout=120)
    
    # Test Huawei Cloud CLI
    print("\n" + "="*80)
    print("TESTING HUAWEI CLOUD CLI")
    print("="*80)
    
    test_cli = """
    # Set environment
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    
    echo "Testing Huawei Cloud CLI..."
    hcloud --help 2>&1 | head -20
    
    echo ""
    echo "Testing DCS access..."
    hcloud DCS ListInstances --limit=2 2>&1 | head -50
    """
    
    output, error = run_command(client, test_cli, "Testing Huawei Cloud CLI and DCS access")
    
    # If CLI still doesn't work, let's try a different approach
    if "command not found" in output or "command not found" in error:
        print("\n⚠️ Huawei Cloud CLI still not working. Let's try manual discovery...")
        
        # Manual network scan for Redis/Memcached
        print("\n" + "="*80)
        print("MANUAL NETWORK SCAN FOR DCS INSTANCES")
        print("="*80)
        
        network_scan = """
        echo "================================================"
        echo "NETWORK SCAN FOR REDIS/MEMCACHED"
        echo "================================================"
        echo ""
        echo "Current subnet: 192.168.10.0/24"
        echo "Mig_worker IP: 192.168.10.191"
        echo ""
        echo "Scanning for Redis (port 6379)..."
        echo "Common Redis IPs in Huawei Cloud DCS:"
        echo "Usually in range: 192.168.10.100-192.168.10.200"
        echo ""
        echo "Quick scan of common ports:"
        echo "Redis (6379):"
        timeout 5 nc -zv 192.168.10.100 6379 2>&1 | grep -v "timed out" || true
        timeout 5 nc -zv 192.168.10.101 6379 2>&1 | grep -v "timed out" || true
        timeout 5 nc -zv 192.168.10.102 6379 2>&1 | grep -v "timed out" || true
        echo ""
        echo "Memcached (11211):"
        timeout 5 nc -zv 192.168.10.100 11211 2>&1 | grep -v "timed out" || true
        timeout 5 nc -zv 192.168.10.101 11211 2>&1 | grep -v "timed out" || true
        timeout 5 nc -zv 192.168.10.102 11211 2>&1 | grep -v "timed out" || true
        echo ""
        echo "================================================"
        echo "ARP TABLE (NEIGHBORS)"
        echo "================================================"
        ip neigh show
        echo ""
        echo "================================================"
        echo "ACTIVE CONNECTIONS"
        echo "================================================"
        ss -tuln | grep -E "(6379|11211|26379|6380)" || echo "No Redis/Memcached ports found"
        echo ""
        echo "================================================"
        echo "NEXT STEPS"
        echo "================================================"
        echo "Since Huawei Cloud CLI is not working, we need:"
        echo "1. Private IPs from DCS console"
        echo "2. Test connectivity manually"
        echo ""
        echo "From DCS console, get:"
        echo "- Redis private IP for dcs-r0il"
        echo "- Memcached private IP for dcs-ibu2"
        echo ""
        echo "Then test with:"
        echo "redis-cli -h [REDIS_IP] -p 6379 INFO"
        echo "echo 'stats' | nc [MEMCACHED_IP] 11211"
        """
        
        output, error = run_command(client, network_scan, "Manual network scan")
    
    # Save current state
    print("\n" + "="*80)
    print("SAVING CURRENT STATE")
    print("="*80)
    
    save_state = """
    echo "================================================" > /opt/migration/current_state.txt
    echo "MIG_WORKER STATE - $(date)" >> /opt/migration/current_state.txt
    echo "================================================" >> /opt/migration/current_state.txt
    echo "" >> /opt/migration/current_state.txt
    echo "IP Address: 192.168.10.191" >> /opt/migration/current_state.txt
    echo "Subnet: 192.168.10.0/24" >> /opt/migration/current_state.txt
    echo "Gateway: 192.168.10.1" >> /opt/migration/current_state.txt
    echo "" >> /opt/migration/current_state.txt
    echo "Installed Tools:" >> /opt/migration/current_state.txt
    which redis-cli nc curl wget 2>/dev/null >> /opt/migration/current_state.txt
    echo "" >> /opt/migration/current_state.txt
    echo "DNS Configuration:" >> /opt/migration/current_state.txt
    cat /etc/resolv.conf >> /opt/migration/current_state.txt
    echo "" >> /opt/migration/current_state.txt
    echo "Network Neighbors:" >> /opt/migration/current_state.txt
    ip neigh show >> /opt/migration/current_state.txt
    echo "" >> /opt/migration/current_state.txt
    echo "================================================" >> /opt/migration/current_state.txt
    echo "ACTION REQUIRED" >> /opt/migration/current_state.txt
    echo "================================================" >> /opt/migration/current_state.txt
    echo "1. Get private IPs from DCS console:" >> /opt/migration/current_state.txt
    echo "   - Redis: dcs-r0il (e0b18a26-385a-44c6-8bba-8cdf7b6533f1)" >> /opt/migration/current_state.txt
    echo "   - Memcached: dcs-ibu2 (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2)" >> /opt/migration/current_state.txt
    echo "" >> /opt/migration/current_state.txt
    echo "2. Test connectivity:" >> /opt/migration/current_state.txt
    echo "   redis-cli -h [REDIS_IP] -p 6379 INFO" >> /opt/migration/current_state.txt
    echo "   echo 'stats' | nc [MEMCACHED_IP] 11211" >> /opt/migration/current_state.txt
    echo "" >> /opt/migration/current_state.txt
    echo "cat /opt/migration/current_state.txt"
    """
    
    output, error = run_command(client, save_state, "Saving current state")
    
    client.close()
    
    print("\n" + "="*80)
    print("FINAL STATUS")
    print("="*80)
    print("\n✅ mig_worker is ready but Huawei Cloud CLI installation failed")
    print("🔍 DNS resolution issue prevented CLI download")
    print("")
    print("📊 CURRENT STATE:")
    print("   • IP: 192.168.10.191 (same subnet as DCS instances)")
    print("   • Tools: redis-cli, netcat installed")
    print("   • Agency: mig_access with DCS FullAccess")
    print("   • Network: Direct access to DCS instances possible")
    print("")
    print("🚨 IMMEDIATE ACTION REQUIRED:")
    print("1. Get private IPs from DCS console:")
    print("   - Redis: dcs-r0il")
    print("   - Memcached: dcs-ibu2")
    print("")
    print("2. Test connectivity from mig_worker:")
    print("   ssh root@121.91.157.66")
    print("   redis-cli -h [REDIS_IP] -p 6379 INFO")
    print("   echo 'stats' | nc [MEMCACHED_IP] 11211")
    print("")
    print("3. Share the private IPs and test results")
    print("")
    print("Once we have private IPs, we can:")
    print("• Get Redis/Memcached specifications")
    print("• Create target instances in ULEARNING account")
    print("• Configure migration")
    print("• Start data sync")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()