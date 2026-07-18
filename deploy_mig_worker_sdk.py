#!/usr/bin/env python3
"""
Deploy mig_worker using Huawei Cloud Python SDK
"""

import os
import sys
import json
import subprocess
import time

print("="*80)
print("MIG_WORKER DEPLOYMENT - PYTHON SDK")
print("="*80)

# Source credentials
SOURCE_AK = "HPUAHMQ1ANAV4VJGYXSX"
SOURCE_SK = "d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
REGION = "af-south-1"

print(f"Using AK: {SOURCE_AK[:10]}...")
print(f"Region: {REGION}")
print()

# Try to use Huawei Cloud SDK
try:
    from huaweicloudsdkcore.auth.credentials import BasicCredentials
    from huaweicloudsdkecs.v2 import EcsClient
    from huaweicloudsdkecs.v2.region.ecs_region import EcsRegion
    from huaweicloudsdkecs.v2.model import *
    from huaweicloudsdkvpc.v2 import VpcClient
    from huaweicloudsdkvpc.v2.region.vpc_region import VpcRegion
    from huaweicloudsdkvpc.v2.model import *
    
    print("✅ Huawei Cloud SDK imported successfully")
    
    # Create credentials
    credentials = BasicCredentials(SOURCE_AK, SOURCE_SK)
    
    # Create ECS client
    ecs_client = EcsClient.new_builder() \
        .with_credentials(credentials) \
        .with_region(EcsRegion.value_of(REGION)) \
        .build()
    
    # Create VPC client
    vpc_client = VpcClient.new_builder() \
        .with_credentials(credentials) \
        .with_region(VpcRegion.value_of(REGION)) \
        .build()
    
    print("✅ Clients created successfully")
    
    # List VPCs to find UMOOC_FA_VPC
    print("\n🔍 Searching for VPC: UMOOC_FA_VPC")
    try:
        list_vpcs_request = ListVpcsRequest()
        vpcs_response = vpc_client.list_vpcs(list_vpcs_request)
        
        vpc_id = None
        for vpc in vpcs_response.vpcs:
            if vpc.name == "UMOOC_FA_VPC":
                vpc_id = vpc.id
                print(f"✅ Found VPC: {vpc.name} (ID: {vpc_id})")
                print(f"   CIDR: {vpc.cidr}")
                break
        
        if not vpc_id:
            print("❌ VPC 'UMOOC_FA_VPC' not found")
            print("Available VPCs:")
            for vpc in vpcs_response.vpcs[:5]:
                print(f"  • {vpc.name} ({vpc.id})")
            print("\nPlease create mig_worker manually with VPC: UMOOC_FA_VPC")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error listing VPCs: {e}")
        print("\nPlease create mig_worker manually with VPC: UMOOC_FA_VPC")
        sys.exit(1)
    
    # List subnets in the VPC
    print("\n🔍 Searching for subnet: ummoc_10")
    try:
        list_subnets_request = ListSubnetsRequest(vpc_id=vpc_id)
        subnets_response = vpc_client.list_subnets(list_subnets_request)
        
        subnet_id = None
        for subnet in subnets_response.subnets:
            if subnet.name == "ummoc_10":
                subnet_id = subnet.id
                print(f"✅ Found subnet: {subnet.name} (ID: {subnet_id})")
                print(f"   CIDR: {subnet.cidr}")
                print(f"   AZ: {subnet.availability_zone}")
                break
        
        if not subnet_id:
            print("❌ Subnet 'ummoc_10' not found in VPC")
            print("Available subnets:")
            for subnet in subnets_response.subnets:
                print(f"  • {subnet.name} ({subnet.id}) - {subnet.cidr}")
            print("\nPlease create mig_worker manually with subnet: ummoc_10")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error listing subnets: {e}")
        print("\nPlease create mig_worker manually with subnet: ummoc_10")
        sys.exit(1)
    
    # List security groups
    print("\n🔍 Searching for security group: UMOOC_AF")
    try:
        list_sg_request = ListSecurityGroupsRequest()
        sgs_response = vpc_client.list_security_groups(list_sg_request)
        
        sg_id = None
        for sg in sgs_response.security_groups:
            if sg.name == "UMOOC_AF":
                sg_id = sg.id
                print(f"✅ Found security group: {sg.name} (ID: {sg_id})")
                break
        
        if not sg_id:
            print("❌ Security group 'UMOOC_AF' not found")
            print("Available security groups:")
            for sg in sgs_response.security_groups[:5]:
                print(f"  • {sg.name} ({sg.id})")
            print("\nPlease create mig_worker manually with SG: UMOOC_AF")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error listing security groups: {e}")
        print("\nPlease create mig_worker manually with SG: UMOOC_AF")
        sys.exit(1)
    
    # List flavors
    print("\n🔍 Checking available flavors...")
    try:
        list_flavors_request = ListFlavorsRequest()
        flavors_response = ecs_client.list_flavors(list_flavors_request)
        
        flavor_id = None
        for flavor in flavors_response.flavors:
            if flavor.name == "c6.large.2":
                flavor_id = flavor.id
                print(f"✅ Found flavor: {flavor.name} (ID: {flavor_id})")
                print(f"   vCPUs: {flavor.vcpus}, RAM: {flavor.ram}MB")
                break
        
        if not flavor_id:
            print("❌ Flavor 'c6.large.2' not found")
            print("Available flavors:")
            for flavor in flavors_response.flavors[:10]:
                if "c6" in flavor.name:
                    print(f"  • {flavor.name} - {flavor.vcpus}vCPU, {flavor.ram}MB RAM")
            print("\nUsing alternative flavor...")
            # Use first available c6 flavor
            for flavor in flavors_response.flavors:
                if "c6" in flavor.name:
                    flavor_id = flavor.id
                    print(f"Using alternative: {flavor.name} (ID: {flavor_id})")
                    break
    
    except Exception as e:
        print(f"❌ Error listing flavors: {e}")
        print("\nPlease specify flavor manually")
        sys.exit(1)
    
    # List images (Ubuntu 22.04)
    print("\n🔍 Searching for Ubuntu 22.04 image...")
    try:
        from huaweicloudsdkims.v2 import ImsClient
        from huaweicloudsdkims.v2.region.ims_region import ImsRegion
        from huaweicloudsdkims.v2.model import ListImagesRequest
        
        ims_client = ImsClient.new_builder() \
            .with_credentials(credentials) \
            .with_region(ImsRegion.value_of(REGION)) \
            .build()
        
        list_images_request = ListImagesRequest(
            os_type="Linux",
            platform="Ubuntu"
        )
        images_response = ims_client.list_images(list_images_request)
        
        image_id = None
        for image in images_response.images:
            if "22.04" in image.name and "server" in image.name.lower():
                image_id = image.id
                print(f"✅ Found image: {image.name} (ID: {image_id})")
                print(f"   Min Disk: {image.min_disk}GB, Min RAM: {image.min_ram}MB")
                break
        
        if not image_id:
            print("❌ Ubuntu 22.04 image not found")
            print("Available Ubuntu images:")
            for image in images_response.images[:5]:
                if "ubuntu" in image.name.lower():
                    print(f"  • {image.name} ({image.id})")
            print("\nPlease specify image manually")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error listing images: {e}")
        print("\nPlease specify image manually")
        sys.exit(1)
    
    print("\n" + "="*80)
    print("READY TO CREATE MIG_WORKER")
    print("="*80)
    print("\nConfiguration:")
    print(f"  Name: mig-worker-ulearning")
    print(f"  Region: {REGION}")
    print(f"  AZ: AZ1")
    print(f"  Flavor: c6.large.2 (ID: {flavor_id})")
    print(f"  Image: Ubuntu 22.04 (ID: {image_id})")
    print(f"  VPC: UMOOC_FA_VPC (ID: {vpc_id})")
    print(f"  Subnet: ummoc_10 (ID: {subnet_id})")
    print(f"  Security Group: UMOOC_AF (ID: {sg_id})")
    print(f"  Disk: 50GB SSD")
    print()
    
    # Ask for confirmation
    confirm = input("Create mig_worker instance? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Cancelled.")
        sys.exit(0)
    
    print("\n🚀 Creating mig_worker instance...")
    
    # Create the instance
    try:
        # Create NIC
        nic = Nic(
            subnet_id=subnet_id,
            ip_address=None,  # Auto-assign IP
            security_groups=[ServerSecurityGroup(id=sg_id)]
        )
        
        # Create root volume
        root_volume = RootVolume(
            volumetype="SSD",
            size=50
        )
        
        # Create server
        server = PrePaidServer(
            name="mig-worker-ulearning",
            image_ref=image_id,
            flavor_ref=flavor_id,
            vpcid=vpc_id,
            nics=[nic],
            availability_zone="AZ1",
            root_volume=root_volume,
            key_name="mig-worker-key",
            count=1
        )
        
        # Create request
        create_request = CreateServersRequest(
            body=CreateServersRequestBody(server=server)
        )
        
        # Create instance
        response = ecs_client.create_servers(create_request)
        
        if response.job_id:
            print(f"✅ Instance creation job started: {response.job_id}")
            print(f"   Server IDs: {response.server_ids}")
            
            # Wait and check status
            print("\n⏳ Waiting for instance to be created...")
            time.sleep(30)
            
            # Get instance details
            if response.server_ids and len(response.server_ids) > 0:
                server_id = response.server_ids[0]
                print(f"✅ Instance created with ID: {server_id}")
                
                # Get instance details
                show_request = ShowServerRequest(server_id=server_id)
                server_details = ecs_client.show_server(show_request)
                
                print(f"\n📋 Instance Details:")
                print(f"  Name: {server_details.server.name}")
                print(f"  Status: {server_details.server.status}")
                print(f"  Created: {server_details.server.created}")
                
                # Get IP address
                addresses = server_details.server.addresses
                for network_name, ip_list in addresses.items():
                    for ip_info in ip_list:
                        if ip_info.get('OS-EXT-IPS:type') == 'fixed':
                            private_ip = ip_info.get('addr')
                            print(f"  Private IP: {private_ip}")
                            print(f"  Network: {network_name}")
                
                print("\n🎯 MIG_WORKER DEPLOYED SUCCESSFULLY!")
                print("="*80)
                print("\nNext steps:")
                print("1. Attach agency 'mig-worker-agency' with DCS permissions")
                print("2. SSH to instance:")
                print(f"   ssh -i ~/.ssh/mig-worker-key.pem ubuntu@{private_ip}")
                print("3. Install tools:")
                print("   sudo apt update && sudo apt install -y redis-tools libmemcached-tools")
                print("4. Discover DCS instances:")
                print("   cd /opt/migration && ./discover_instances.sh")
                
        else:
            print("❌ Failed to create instance")
            print(f"Response: {response}")
    
    except Exception as e:
        print(f"❌ Error creating instance: {e}")
        import traceback
        traceback.print_exc()
        
except ImportError as e:
    print(f"❌ Huawei Cloud SDK not available: {e}")
    print("\nPlease install with: pip install huaweicloudsdkecs huaweicloudsdkvpc huaweicloudsdkims")
    print("\nOr deploy mig_worker manually via Console:")
    print("1. Go to: https://console.huaweicloud.com/ecs")
    print("2. Create instance with:")
    print("   - Name: mig-worker-ulearning")
    print("   - AZ: AZ1")
    print("   - Flavor: c6.large.2")
    print("   - Image: Ubuntu 22.04")
    print("   - VPC: UMOOC_FA_VPC")
    print("   - Subnet: ummoc_10")
    print("   - Security Group: UMOOC_AF")
    print("   - Key Pair: mig-worker-key")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("ALTERNATIVE: MANUAL DEPLOYMENT INSTRUCTIONS")
print("="*80)
print("\nIf SDK deployment fails, deploy manually:")
print()
print("1. Login to Huawei Cloud Console")
print("   https://console.huaweicloud.com/ecs")
print()
print("2. Create ECS Instance:")
print("   - Project: 08720a7af300f48a2f48c00622277d5d")
print("   - Region: af-south-1")
print("   - Name: mig-worker-ulearning")
print("   - AZ: AZ1")
print("   - Flavor: c6.large.2 (2vCPU, 4GB RAM)")
print("   - Image: Ubuntu 22.04 server 64bit")
print("   - Disk: 50GB SSD")
print("   - VPC: UMOOC_FA_VPC")
print("   - Subnet: ummoc_10")
print("   - Security Group: UMOOC_AF")
print("   - Key Pair: Create new 'mig-worker-key'")
print()
print("3. Advanced Settings → User Data (paste):")
print('''#!/bin/bash
apt-get update
apt-get install -y redis-tools libmemcached-tools netcat-openbsd
wget -q https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz -O /tmp/redis-shake.tar.gz
tar -xzf /tmp/redis-shake.tar.gz -C /usr/local/bin/
chmod +x /usr/local/bin/redis-shake
mkdir -p /opt/migration
echo "MIG_WORKER READY" > /opt/migration/READY.txt''')
print()
print("4. Create instance and note Private IP")
print("5. Attach agency 'mig-worker-agency' with DCS permissions")
print("6. SSH: ssh -i mig-worker-key.pem ubuntu@[PRIVATE_IP]")
print("7. Run: cd /opt/migration && ./discover_instances.sh")