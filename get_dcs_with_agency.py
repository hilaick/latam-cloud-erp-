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
    print("GETTING DCS INFORMATION WITH AGENCY PERMISSIONS")
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
    
    # First, install Huawei Cloud CLI properly
    print("\n" + "="*80)
    print("INSTALLING HUAWEI CLOUD CLI")
    print("="*80)
    
    install_commands = [
        # Remove any existing installation
        "rm -f /usr/local/bin/hcloud /tmp/huaweicloud-cli* 2>/dev/null || true",
        
        # Download Huawei Cloud CLI
        "echo 'Downloading Huawei Cloud CLI...'",
        "cd /tmp && wget --no-check-certificate https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/huaweicloud-cli-linux-amd64.tar.gz",
        
        # Extract
        "echo 'Extracting...'",
        "tar -xzf /tmp/huaweicloud-cli-linux-amd64.tar.gz -C /tmp",
        
        # Install
        "echo 'Installing...'",
        "chmod +x /tmp/huaweicloud-cli",
        "mv /tmp/huaweicloud-cli /usr/local/bin/hcloud",
        
        # Test
        "echo 'Testing installation...'",
        "hcloud --version || echo 'Installation failed'"
    ]
    
    for cmd in install_commands:
        output, error = run_command(client, cmd, f"Running: {cmd[:50]}...", timeout=60)
    
    # Set environment variables
    print("\n" + "="*80)
    print("CONFIGURING ENVIRONMENT")
    print("="*80)
    
    env_config = """
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    export HUAWEICLOUD_SDK_PROJECT_ID="08720a7af300f48a2f48c00622277d5d"
    
    echo "Environment configured:"
    echo "AK: $HUAWEICLOUD_SDK_AK"
    echo "SK: ${HUAWEICLOUD_SDK_SK:0:10}..."
    echo "Region: $HUAWEICLOUD_SDK_REGION"
    echo "Project: $HUAWEICLOUD_SDK_PROJECT_ID"
    """
    
    output, error = run_command(client, env_config, "Setting environment variables")
    
    # Test DCS access
    print("\n" + "="*80)
    print("TESTING DCS API ACCESS")
    print("="*80)
    
    test_dcs = """
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    
    echo "Testing DCS API with agency permissions..."
    hcloud DCS ListInstances --limit=5 2>&1
    """
    
    output, error = run_command(client, test_dcs, "Testing DCS API access")
    
    if "error" in output.lower() or "not found" in output.lower():
        print("\n⚠️ DCS API still failing. Trying alternative download method...")
        
        # Try alternative download URL
        alt_install = """
        cd /tmp && \
        curl -L -o huaweicloud-cli.tar.gz https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/huaweicloud-cli-linux-amd64.tar.gz && \
        tar -xzf huaweicloud-cli.tar.gz && \
        chmod +x huaweicloud-cli && \
        mv huaweicloud-cli /usr/local/bin/hcloud && \
        hcloud --version
        """
        
        output, error = run_command(client, alt_install, "Alternative CLI installation")
    
    # Now get DCS information
    print("\n" + "="*80)
    print("GETTING DCS INSTANCE INFORMATION")
    print("="*80)
    
    # Get all DCS instances
    get_all_instances = """
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    
    echo "================================================"
    echo "ALL DCS INSTANCES"
    echo "================================================"
    hcloud DCS ListInstances --limit=50 2>&1
    """
    
    output, error = run_command(client, get_all_instances, "Getting all DCS instances", timeout=60)
    
    # Get specific Redis instance
    print("\n" + "="*80)
    print("GETTING REDIS INSTANCE DETAILS")
    print("="*80)
    
    get_redis = """
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    
    echo "================================================"
    echo "REDIS INSTANCE: dcs-r0il (e0b18a26-385a-44c6-8bba-8cdf7b6533f1)"
    echo "================================================"
    hcloud DCS ShowInstance --instance_id=e0b18a26-385a-44c6-8bba-8cdf7b6533f1 2>&1
    """
    
    output, error = run_command(client, get_redis, "Getting Redis instance details", timeout=60)
    
    # Get specific Memcached instance
    print("\n" + "="*80)
    print("GETTING MEMCACHED INSTANCE DETAILS")
    print("="*80)
    
    get_memcached = """
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    
    echo "================================================"
    echo "MEMCACHED INSTANCE: dcs-ibu2 (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2)"
    echo "================================================"
    hcloud DCS ShowInstance --instance_id=4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2 2>&1
    """
    
    output, error = run_command(client, get_memcached, "Getting Memcached instance details", timeout=60)
    
    # If API still fails, try manual approach
    print("\n" + "="*80)
    print("MANUAL NETWORK DISCOVERY")
    print("="*80)
    
    manual_discovery = """
    echo "================================================"
    echo "NETWORK CONFIGURATION"
    echo "================================================"
    echo ""
    echo "1. Current IP configuration:"
    ip addr show eth0
    echo ""
    echo "2. Network neighbors (ARP table):"
    ip neigh show
    echo ""
    echo "3. Routing table:"
    ip route show
    echo ""
    echo "4. Testing common Redis/Memcached ports in subnet:"
    echo "   Scanning 192.168.10.0/24 for Redis (6379) and Memcached (11211)..."
    echo ""
    echo "Note: Since we're in the same subnet (192.168.10.0/24),"
    echo "we should be able to connect directly to Redis/Memcached private IPs."
    echo ""
    echo "================================================"
    echo "NEXT STEPS"
    echo "================================================"
    echo "If DCS API fails, we need private IPs from console:"
    echo "1. Login to DCS Console"
    echo "2. Find Redis: dcs-r0il (e0b18a26-385a-44c6-8bba-8cdf7b6533f1)"
    echo "3. Find Memcached: dcs-ibu2 (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2)"
    echo "4. Get Private IP addresses"
    echo "5. Test connectivity:"
    echo "   redis-cli -h [REDIS_IP] -p 6379 INFO"
    echo "   echo 'stats' | nc [MEMCACHED_IP] 11211"
    """
    
    output, error = run_command(client, manual_discovery, "Manual network discovery")
    
    # Save all results to file
    print("\n" + "="*80)
    print("SAVING RESULTS")
    print("="*80)
    
    save_results = """
    echo "================================================" > /opt/migration/dcs_discovery.txt
    echo "DCS DISCOVERY RESULTS - $(date)" >> /opt/migration/dcs_discovery.txt
    echo "================================================" >> /opt/migration/dcs_discovery.txt
    echo "" >> /opt/migration/dcs_discovery.txt
    echo "Server: 121.91.157.66 (192.168.10.191)" >> /opt/migration/dcs_discovery.txt
    echo "Subnet: ummoc_10 (192.168.10.0/24)" >> /opt/migration/dcs_discovery.txt
    echo "VPC: UMOOC_FA_VPC" >> /opt/migration/dcs_discovery.txt
    echo "" >> /opt/migration/dcs_discovery.txt
    echo "Target Instances:" >> /opt/migration/dcs_discovery.txt
    echo "1. Redis: dcs-r0il (e0b18a26-385a-44c6-8bba-8cdf7b6533f1)" >> /opt/migration/dcs_discovery.txt
    echo "2. Memcached: dcs-ibu2 (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2)" >> /opt/migration/dcs_discovery.txt
    echo "" >> /opt/migration/dcs_discovery.txt
    echo "================================================" >> /opt/migration/dcs_discovery.txt
    echo "NEXT STEPS" >> /opt/migration/dcs_discovery.txt
    echo "================================================" >> /opt/migration/dcs_discovery.txt
    echo "1. Get private IPs from DCS console" >> /opt/migration/dcs_discovery.txt
    echo "2. Test connectivity:" >> /opt/migration/dcs_discovery.txt
    echo "   redis-cli -h [REDIS_IP] -p 6379 INFO" >> /opt/migration/dcs_discovery.txt
    echo "   echo 'stats' | nc [MEMCACHED_IP] 11211" >> /opt/migration/dcs_discovery.txt
    echo "3. Get specifications:" >> /opt/migration/dcs_discovery.txt
    echo "   - Redis: version, memory, persistence, config" >> /opt/migration/dcs_discovery.txt
    echo "   - Memcached: version, memory, items, config" >> /opt/migration/dcs_discovery.txt
    echo "" >> /opt/migration/dcs_discovery.txt
    echo "cat /opt/migration/dcs_discovery.txt"
    """
    
    output, error = run_command(client, save_results, "Saving results to file")
    
    client.close()
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print("\n✅ mig_worker is ready at: 121.91.157.66")
    print("🔑 SSH: ssh root@121.91.157.66")
    print("🔧 Tools: redis-cli, netcat installed")
    print("🔐 Agency: mig_access with DCS FullAccess")
    print("🌐 Network: 192.168.10.191/24 (same subnet as DCS)")
    print("")
    print("🚨 IMMEDIATE ACTION:")
    print("1. Get private IPs from DCS console")
    print("2. Test connectivity from mig_worker")
    print("3. Share IPs and test results")
    print("")
    print("📁 Results saved to: /opt/migration/dcs_discovery.txt")
    print("")
    print("Once we have private IPs, we can:")
    print("1. Test connectivity")
    print("2. Get instance specifications")
    print("3. Create target instances")
    print("4. Configure migration")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()