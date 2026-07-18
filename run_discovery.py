#!/usr/bin/env python3
import paramiko
import sys

host = "121.91.157.66"
username = "root"
password = "17c10af29A3"

try:
    print("="*80)
    print("RUNNING DCS DISCOVERY ON MIG_WORKER")
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
    
    # First, let's check if Huawei Cloud CLI is installed
    print("\n🔍 Checking Huawei Cloud CLI installation...")
    stdin, stdout, stderr = client.exec_command("which hcloud || echo 'hcloud not found'")
    hcloud_path = stdout.read().decode().strip()
    
    if "not found" in hcloud_path:
        print("❌ Huawei Cloud CLI not installed. Installing now...")
        
        # Install Huawei Cloud CLI
        install_cmd = """
        cd /tmp && \
        wget -q https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/huaweicloud-cli-linux-amd64.tar.gz && \
        tar -xzf huaweicloud-cli-linux-amd64.tar.gz && \
        chmod +x huaweicloud-cli && \
        mv huaweicloud-cli /usr/local/bin/hcloud && \
        rm huaweicloud-cli-linux-amd64.tar.gz && \
        hcloud --version
        """
        
        stdin, stdout, stderr = client.exec_command(install_cmd, timeout=60)
        output = stdout.read().decode().strip()
        error = stderr.read().decode().strip()
        
        if output:
            print(f"✅ Huawei Cloud CLI installed: {output[:100]}...")
        elif error:
            print(f"⚠️  Installation error: {error[:200]}")
    else:
        print(f"✅ Huawei Cloud CLI found at: {hcloud_path}")
    
    # Check if we have credentials configured
    print("\n🔍 Checking Huawei Cloud credentials...")
    stdin, stdout, stderr = client.exec_command("env | grep -i huawei || echo 'No Huawei credentials found'")
    credentials = stdout.read().decode().strip()
    print(f"Credentials: {credentials}")
    
    # Set environment variables for DCS access
    print("\n🔧 Setting up environment for DCS access...")
    
    # We need to set the AK/SK from the source account
    setup_env = """
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX"
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    export HUAWEICLOUD_SDK_REGION="af-south-1"
    export HUAWEICLOUD_SDK_PROJECT_ID="08720a7af300f48a2f48c00622277d5d"
    
    echo "Testing DCS access..."
    hcloud DCS ListInstances --limit=5 2>&1 | head -50
    """
    
    stdin, stdout, stderr = client.exec_command(setup_env, timeout=30)
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    
    print("DCS test output:")
    print(output[:500])
    if error:
        print(f"Error: {error[:200]}")
    
    # Now run the discovery script
    print("\n" + "="*80)
    print("RUNNING DISCOVERY SCRIPT")
    print("="*80)
    
    discovery_cmd = """
    cd /opt/migration && \
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX" && \
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi" && \
    export HUAWEICLOUD_SDK_REGION="af-south-1" && \
    ./discover.sh
    """
    
    print("Running discovery script (this may take a minute)...")
    stdin, stdout, stderr = client.exec_command(discovery_cmd, timeout=120, get_pty=True)
    
    # Read output in chunks
    print("\n" + "="*80)
    print("DISCOVERY RESULTS")
    print("="*80)
    
    # Read first 2000 characters of output
    output = ""
    while True:
        chunk = stdout.read(1024).decode()
        if not chunk:
            break
        output += chunk
        if len(output) > 4000:  # Limit output for display
            output += "\n... (output truncated)"
            break
    
    print(output)
    
    # Check for errors
    error = stderr.read().decode().strip()
    if error:
        print(f"\n❌ Errors during discovery:")
        print(error[:500])
    
    # Save full output to file
    print(f"\n💾 Saving full output to /opt/migration/discovery_output.txt")
    save_cmd = """
    cd /opt/migration && \
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX" && \
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi" && \
    export HUAWEICLOUD_SDK_REGION="af-south-1" && \
    ./discover.sh > discovery_output.txt 2>&1
    """
    
    stdin, stdout, stderr = client.exec_command(save_cmd, timeout=120)
    
    # Get the saved output
    stdin, stdout, stderr = client.exec_command("cat /opt/migration/discovery_output.txt | tail -1000")
    saved_output = stdout.read().decode().strip()
    
    print("\n" + "="*80)
    print("KEY FINDINGS (last 1000 chars)")
    print("="*80)
    print(saved_output[-1000:] if len(saved_output) > 1000 else saved_output)
    
    # Check for target instances
    print("\n" + "="*80)
    print("CHECKING FOR TARGET INSTANCES")
    print("="*80)
    
    check_targets = """
    echo "Looking for target instances..."
    echo ""
    echo "Redis instance (e0b18a26-385a-44c6-8bba-8cdf7b6533f1):"
    hcloud DCS ShowInstance --instance_id=e0b18a26-385a-44c6-8bba-8cdf7b6533f1 2>&1 | grep -E '(name|engine|specification|capacity|status|ip|port)' || echo "Not found"
    echo ""
    echo "Memcached instance (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2):"
    hcloud DCS ShowInstance --instance_id=4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2 2>&1 | grep -E '(name|engine|specification|capacity|status|ip|port)' || echo "Not found"
    """
    
    stdin, stdout, stderr = client.exec_command(f"""
    export HUAWEICLOUD_SDK_AK="HPUAHMQ1ANAV4VJGYXSX" && \
    export HUAWEICLOUD_SDK_SK="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi" && \
    export HUAWEICLOUD_SDK_REGION="af-south-1" && \
    {check_targets}
    """, timeout=60)
    
    target_output = stdout.read().decode().strip()
    target_error = stderr.read().decode().strip()
    
    print(target_output)
    if target_error:
        print(f"Errors: {target_error[:200]}")
    
    client.close()
    print("\n✅ Discovery complete!")
    print("📄 Full output saved to: /opt/migration/discovery_output.txt")
    print("📋 Check the output above for Redis/Memcached instance details")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)