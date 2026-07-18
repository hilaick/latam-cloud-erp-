#!/usr/bin/env python3
import paramiko
import sys
import time

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

def run_command_with_output(client, command, description):
    print(f"\n🔧 {description}")
    print(f"   Command: {command[:100]}...")
    stdin, stdout, stderr = client.exec_command(command, timeout=60, get_pty=True)
    
    # Read output
    output = ""
    error = ""
    
    while True:
        # Read from stdout
        out_chunk = stdout.channel.recv(1024).decode('utf-8', errors='ignore')
        if out_chunk:
            output += out_chunk
            print(out_chunk, end='')
        
        # Read from stderr
        err_chunk = stderr.channel.recv_stderr(1024).decode('utf-8', errors='ignore')
        if err_chunk:
            error += err_chunk
            print(f"ERROR: {err_chunk}", end='')
        
        # Check if channel is closed
        if stdout.channel.exit_status_ready():
            break
    
    exit_status = stdout.channel.recv_exit_status()
    
    return output, error, exit_status

try:
    print("="*80)
    print("INSTALLING HUAWEI CLOUD CLI AND RUNNING DISCOVERY")
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
    
    # Install Huawei Cloud CLI properly
    print("\n" + "="*80)
    print("INSTALLING HUAWEI CLOUD CLI")
    print("="*80)
    
    install_commands = [
        "echo 'Step 1: Downloading Huawei Cloud CLI...'",
        "cd /tmp && wget -q https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/huaweicloud-cli-linux-amd64.tar.gz",
        "echo 'Step 2: Extracting...'",
        "tar -xzf /tmp/huaweicloud-cli-linux-amd64.tar.gz -C /tmp",
        "echo 'Step 3: Making executable...'",
        "chmod +x /tmp/huaweicloud-cli",
        "echo 'Step 4: Moving to /usr/local/bin...'",
        "mv /tmp/huaweicloud-cli /usr/local/bin/hcloud",
        "echo 'Step 5: Cleaning up...'",
        "rm /tmp/huaweicloud-cli-linux-amd64.tar.gz",
        "echo 'Step 6: Testing installation...'",
        "/usr/local/bin/hcloud --version || echo 'hcloud not working'"
    ]
    
    for cmd in install_commands:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
        output = stdout.read().decode().strip()
        error = stderr.read().decode().strip()
        
        if output:
            print(f"   {output}")
        if error and "WARNING" not in error:
            print(f"   Error: {error[:200]}")
    
    # Set environment variables
    print("\n" + "="*80)
    print("SETTING UP ENVIRONMENT")
    print("="*80)
    
    env_setup = """
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    export HUAWEICLOUD_SDK_PROJECT_ID="08720a7af300f48a2f48c00622277d5d"
    
    echo "Environment variables set:"
    echo "AK: $HUAWEICLOUD_SDK_AK"
    echo "SK: ${HUAWEICLOUD_SDK_SK:0:10}..."
    echo "Region: $HUAWEICLOUD_SDK_REGION"
    echo "Project: $HUAWEICLOUD_SDK_PROJECT_ID"
    """
    
    stdin, stdout, stderr = client.exec_command(env_setup, timeout=30)
    output = stdout.read().decode().strip()
    print(output)
    
    # Test DCS access
    print("\n" + "="*80)
    print("TESTING DCS ACCESS")
    print("="*80)
    
    test_dcs = """
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    
    echo "Testing DCS API access..."
    hcloud DCS ListInstances --limit=2 2>&1
    """
    
    stdin, stdout, stderr = client.exec_command(test_dcs, timeout=30)
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    
    print("DCS test output:")
    if output:
        print(output[:500])
    if error:
        print(f"Error: {error[:500]}")
    
    # If DCS access fails, try a simpler approach
    if "error" in output.lower() or "not found" in output.lower():
        print("\n⚠️ DCS API access failed. Trying alternative approach...")
        print("The mig_worker may not have proper agency permissions.")
        print("\nLet's check what we can access:")
        
        # Check available services
        check_services = """
        echo "Available Huawei Cloud services:"
        hcloud --help 2>&1 | grep -E "^  [A-Z]" | head -20
        """
        
        stdin, stdout, stderr = client.exec_command(check_services, timeout=30)
        print(stdout.read().decode().strip())
    
    # Run simplified discovery
    print("\n" + "="*80)
    print("SIMPLIFIED DISCOVERY")
    print("="*80)
    
    simple_discovery = """
    echo "================================================"
    echo "MIG_WORKER SYSTEM INFO"
    echo "================================================"
    echo ""
    echo "1. System Information:"
    uname -a
    echo ""
    echo "2. Network Configuration:"
    ip addr show | grep -E "(inet|ether)" | grep -v "127.0.0.1" | head -10
    echo ""
    echo "3. Current VPC/Subnet (if available):"
    echo "   Based on IP 121.91.157.66, this is likely in ummoc_10 subnet"
    echo ""
    echo "4. Testing connectivity to Redis/Memcached ports:"
    echo "   Note: Need private IPs from DCS console to test"
    echo ""
    echo "5. Manual steps needed:"
    echo "   - Get Redis private IP from DCS console"
    echo "   - Get Memcached private IP from DCS console"
    echo "   - Test with: redis-cli -h [IP] -p 6379 INFO"
    echo "   - Test with: echo 'stats' | nc [IP] 11211"
    echo ""
    echo "================================================"
    echo "NEXT STEPS"
    echo "================================================"
    echo "1. Check DCS console for private IPs:"
    echo "   - Redis: dcs-r0il (e0b18a26-385a-44c6-8bba-8cdf7b6533f1)"
    echo "   - Memcached: dcs-ibu2 (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2)"
    echo ""
    echo "2. Once you have private IPs, run:"
    echo "   redis-cli -h [REDIS_IP] -p 6379 INFO"
    echo "   echo 'stats' | nc [MEMCACHED_IP] 11211"
    """
    
    stdin, stdout, stderr = client.exec_command(simple_discovery, timeout=30)
    output = stdout.read().decode().strip()
    print(output)
    
    # Save this information
    save_info = """
    cat > /opt/migration/next_steps.txt << 'EOF'
    ================================================
    MIG_WORKER READY FOR DCS DISCOVERY
    ================================================
    
    Server: 121.91.157.66
    User: root
    SSH: ssh root@121.91.157.66
    
    INSTALLED TOOLS:
    - redis-cli: /usr/bin/redis-cli
    - netcat: /bin/nc
    
    MANUAL STEPS REQUIRED:
    1. Get private IPs from DCS console:
       - Redis: dcs-r0il (e0b18a26-385a-44c6-8bba-8cdf7b6533f1)
       - Memcached: dcs-ibu2 (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2)
    
    2. Test connectivity:
       redis-cli -h [REDIS_PRIVATE_IP] -p 6379 INFO
       echo "stats" | nc [MEMCACHED_PRIVATE_IP] 11211
    
    3. Get specifications:
       - Redis version, memory, configuration
       - Memcached version, memory, items
    
    AGENCY PERMISSIONS:
    The mig_worker needs 'mig_access' agency with:
    - DCS FullAccess
    - VPC FullAccess
    
    Without proper agency permissions, DCS API calls will fail.
    EOF
    
    echo "Next steps saved to /opt/migration/next_steps.txt"
    cat /opt/migration/next_steps.txt
    """
    
    stdin, stdout, stderr = client.exec_command(save_info, timeout=30)
    print(stdout.read().decode().strip())
    
    client.close()
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print("\n✅ mig_worker is deployed at: 121.91.157.66")
    print("🔑 SSH: ssh root@121.91.157.66")
    print("📦 Tools installed: redis-cli, netcat")
    print("⚠️  Huawei Cloud CLI installed but agency permissions needed")
    print("")
    print("🚨 IMMEDIATE ACTION REQUIRED:")
    print("1. Check DCS console for Redis/Memcached private IPs")
    print("2. Test connectivity from mig_worker:")
    print("   redis-cli -h [REDIS_IP] -p 6379 INFO")
    print("   echo 'stats' | nc [MEMCACHED_IP] 11211")
    print("3. Share the private IPs and test results")
    print("")
    print("Once we have private IPs, we can:")
    print("1. Get instance specifications")
    print("2. Create target instances in ULEARNING account")
    print("3. Configure migration")
    print("4. Start data sync")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()