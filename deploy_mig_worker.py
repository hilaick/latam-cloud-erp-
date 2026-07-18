#!/usr/bin/env python3
"""
Deploy mig_worker with agency permissions
"""

import os
import json
import subprocess
import time

print("="*80)
print("DEPLOY MIG_WORKER WITH AGENCY PERMISSIONS")
print("="*80)

# Source credentials
SOURCE_AK = "HPUAHMQ1ANAV4VJGYXSX"
SOURCE_SK = "d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
REGION = "af-south-1"
PROJECT_ID = "08720a7af300f48a2f48c00622277d5d"

# Network configuration
VPC_NAME = "UMOOC_FA_VPC"
SUBNET_NAME = "ummoc_10"
SECURITY_GROUP = "UMOOC_AF"
AVAILABILITY_ZONE = "AZ1"

print(f"🔧 Configuration:")
print(f"  Region: {REGION}")
print(f"  Project: {PROJECT_ID}")
print(f"  VPC: {VPC_NAME}")
print(f"  Subnet: {SUBNET_NAME}")
print(f"  Security Group: {SECURITY_GROUP}")
print(f"  AZ: {AVAILABILITY_ZONE}")
print()

# Set environment
env = os.environ.copy()
env['HUAWEICLOUD_SDK_AK'] = SOURCE_AK
env['HUAWEICLOUD_SDK_SK'] = SOURCE_SK
env['HUAWEICLOUD_SDK_REGION'] = REGION

def run_command(cmd, description):
    """Run a command and handle output"""
    print(f"\n🔧 {description}")
    print(f"   Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=30)
        
        if result.returncode == 0:
            print(f"   ✅ Success")
            if result.stdout.strip():
                try:
                    return json.loads(result.stdout)
                except:
                    return result.stdout
            return True
        else:
            print(f"   ❌ Failed (exit code: {result.returncode})")
            if result.stderr:
                print(f"   Error: {result.stderr[:200]}")
            if result.stdout:
                print(f"   Output: {result.stdout[:200]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"   ⏱️  Timeout")
        return False
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return False

print("="*80)
print("STEP 1: GET NETWORK INFORMATION")
print("="*80)

# Get VPC ID
print("\n🔍 Getting VPC ID...")
vpc_cmd = ['hcloud', 'VPC', 'ListVpcs']
result = run_command(vpc_cmd, "List VPCs")

if result and isinstance(result, dict):
    vpcs = result.get('vpcs', [])
    vpc_id = None
    for vpc in vpcs:
        if vpc.get('name') == VPC_NAME:
            vpc_id = vpc.get('id')
            print(f"   ✅ Found VPC: {VPC_NAME} (ID: {vpc_id})")
            break
    
    if not vpc_id:
        print(f"   ❌ VPC '{VPC_NAME}' not found")
        print(f"   Available VPCs:")
        for vpc in vpcs[:5]:
            print(f"     • {vpc.get('name')} ({vpc.get('id')})")
        exit(1)
else:
    # Try raw output
    print("   Trying alternative VPC listing...")
    vpc_cmd = ['hcloud', 'VPC', 'ListVpcs', '--cli-region', REGION]
    result = subprocess.run(vpc_cmd, capture_output=True, text=True, env=env)
    print(f"   Raw output: {result.stdout[:500]}")

print("\n🔍 Getting Subnet ID...")
if vpc_id:
    subnet_cmd = ['hcloud', 'VPC', 'ListSubnets', '--vpc_id', vpc_id]
    result = run_command(subnet_cmd, "List Subnets")
    
    if result and isinstance(result, dict):
        subnets = result.get('subnets', [])
        subnet_id = None
        for subnet in subnets:
            if subnet.get('name') == SUBNET_NAME:
                subnet_id = subnet.get('id')
                print(f"   ✅ Found Subnet: {SUBNET_NAME} (ID: {subnet_id})")
                print(f"   CIDR: {subnet.get('cidr')}")
                break
        
        if not subnet_id:
            print(f"   ❌ Subnet '{SUBNET_NAME}' not found in VPC {vpc_id}")
            print(f"   Available subnets:")
            for subnet in subnets:
                print(f"     • {subnet.get('name')} ({subnet.get('id')}) - {subnet.get('cidr')}")
            exit(1)

print("\n🔍 Getting Security Group ID...")
sg_cmd = ['hcloud', 'VPC', 'ListSecurityGroups']
result = run_command(sg_cmd, "List Security Groups")

if result and isinstance(result, dict):
    sgs = result.get('security_groups', [])
    sg_id = None
    for sg in sgs:
        if sg.get('name') == SECURITY_GROUP:
            sg_id = sg.get('id')
            print(f"   ✅ Found Security Group: {SECURITY_GROUP} (ID: {sg_id})")
            break
    
    if not sg_id:
        print(f"   ❌ Security Group '{SECURITY_GROUP}' not found")
        print(f"   Available Security Groups:")
        for sg in sgs[:5]:
            print(f"     • {sg.get('name')} ({sg.get('id')})")
        exit(1)

print("\n" + "="*80)
print("STEP 2: CHECK EXISTING MIG_WORKER")
print("="*80)

# Check for existing mig_worker
print("\n🔍 Checking for existing mig_worker instances...")
ecs_cmd = ['hcloud', 'ECS', 'NovaListServers']
result = run_command(ecs_cmd, "List ECS instances")

if result and isinstance(result, dict):
    servers = result.get('servers', [])
    mig_worker = None
    for server in servers:
        name = server.get('name', '')
        if 'mig' in name.lower() or 'worker' in name.lower():
            mig_worker = server
            print(f"   ✅ Found existing mig_worker: {name} ({server.get('id')})")
            print(f"   Status: {server.get('status')}")
            
            # Get IP address
            addresses = server.get('addresses', {})
            for network, ips in addresses.items():
                for ip in ips:
                    if ip.get('OS-EXT-IPS:type') == 'fixed':
                        print(f"   Private IP: {ip.get('addr')}")
                        print(f"   Network: {network}")
            
            use_existing = input("\n   Use existing mig_worker? (y/n): ").strip().lower()
            if use_existing == 'y':
                print("\n🎯 USING EXISTING MIG_WORKER")
                print("="*80)
                print("\nSSH to mig_worker:")
                print(f"ssh -i ~/.ssh/mig-worker-key.pem ubuntu@[PRIVATE_IP]")
                print("\nInstall tools:")
                print("sudo apt update && sudo apt upgrade -y")
                print("sudo apt install -y redis-tools libmemcached-tools netcat-openbsd")
                print("wget https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz")
                print("tar -xzf redis-shake-linux-amd64.tar.gz")
                print("chmod +x redis-shake")
                print("sudo mv redis-shake /usr/local/bin/")
                exit(0)
            break

print("\n" + "="*80)
print("STEP 3: CREATE MIG_WORKER INSTANCE")
print("="*80)

print("\n🚨 MANUAL DEPLOYMENT REQUIRED")
print("="*80)
print("\nSince the Huawei Cloud CLI is having issues with JSON parsing,")
print("please deploy the mig_worker MANUALLY via Console:")
print()
print("1. Login to Huawei Cloud Console:")
print("   https://console.huaweicloud.com/ecs")
print()
print("2. Select:")
print("   - Region: af-south-1")
print("   - Project: 08720a7af300f48a2f48c00622277d5d")
print()
print("3. Create ECS Instance:")
print("   - Name: mig-worker-ulearning")
print("   - AZ: AZ1")
print("   - Flavor: c6.large.2 (2vCPU, 4GB RAM)")
print("   - Image: Ubuntu 22.04 server 64bit")
print("   - Disk: 50GB SSD")
print()
print("4. Network:")
print("   - VPC: UMOOC_FA_VPC")
print("   - Subnet: ummoc_10 (192.168.10.0/24)")
print("   - Security Group: UMOOC_AF")
print()
print("5. Advanced Settings:")
print("   - Agency: Attach agency with DCS permissions")
print("   - Key Pair: Create new 'mig-worker-key'")
print()
print("6. After creation:")
print("   - Note Private IP")
print("   - SSH to instance")
print()
print("7. Install tools:")
print("   sudo apt update && sudo apt upgrade -y")
print("   sudo apt install -y redis-tools libmemcached-tools netcat-openbsd")
print("   wget https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz")
print("   tar -xzf redis-shake-linux-amd64.tar.gz")
print("   chmod +x redis-shake")
print("   sudo mv redis-shake /usr/local/bin/")
print()
print("8. Test connectivity:")
print("   redis-cli -h [REDIS_PRIVATE_IP] -p 6379 PING")
print("   echo \"stats\" | nc [MEMCACHED_PRIVATE_IP] 11211")

print("\n" + "="*80)
print("ALTERNATIVE: USE HUAWEI CLOUD SDK")
print("="*80)

print("\nIf manual deployment fails, use Huawei Cloud SDK in Python:")

sdk_code = '''
import os
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkecs.v2 import EcsClient
from huaweicloudsdkecs.v2.region.ecs_region import EcsRegion
from huaweicloudsdkecs.v2.model import *

# Credentials
credentials = BasicCredentials(
    ak="HPUAHMQ1ANAV4VJGYXSX",
    sk="d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
)

# Create client
client = EcsClient.new_builder() \\
    .with_credentials(credentials) \\
    .with_region(EcsRegion.value_of("af-south-1")) \\
    .build()

# Create server request
request = CreateServersRequest()
server = PrePaidServer(
    name="mig-worker-ulearning",
    image_ref="[UBUNTU_22_04_IMAGE_ID]",
    flavor_ref="c6.large.2",
    vpcid="[VPC_ID]",
    nics=[Nic(subnet_id="[SUBNET_ID]")],
    availability_zone="AZ1",
    root_volume=RootVolume(volumetype="SSD", size=50),
    key_name="mig-worker-key"
)

request.body = CreateServersRequestBody(server=server)
response = client.create_servers(request)
print(f"Instance created: {response.server_ids}")
'''

print(sdk_code)

print("\n" + "="*80)
print("NEXT STEPS AFTER DEPLOYMENT")
print("="*80)
print("\n1. Deploy mig_worker (manual or SDK)")
print("2. Attach agency with DCS permissions")
print("3. SSH to mig_worker")
print("4. Install migration tools")
print("5. Discover Redis/Memcached instances")
print("6. Get specifications")
print("7. Create target instances")
print("8. Start migration")