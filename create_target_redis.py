#!/usr/bin/env python3
"""
Create target Redis instance in ULEARNING account matching source specs
"""

import os
import json
import subprocess
import time

print('='*80)
print('CREATING TARGET REDIS INSTANCE FOR MIGRATION')
print('='*80)

# ULEARNING master credentials
MASTER_AK = 'HPUA0CRIQJMNKM35NH6E'
MASTER_SK = 'y2SYFQFF9CWRdKpo8r0nVdESCoiJViAzyUS36rOo'
REGION = 'af-south-1'

env = os.environ.copy()
env['HUAWEICLOUD_SDK_AK'] = MASTER_AK
env['HUAWEICLOUD_SDK_SK'] = MASTER_SK
env['HUAWEICLOUD_SDK_REGION'] = REGION

# Source Redis specifications (from our discovery)
SOURCE_SPECS = {
    'engine': 'redis',
    'engine_version': '3.0.7.9',
    'capacity': 4,  # GB (rounded up from 3.2GB)
    'specification': 'redis.ha.xu1.large.4',  # 4GB standalone
    'port': 6379,
    'no_password_access': 'false',  # Enable password for security
    'password': 'TempRedisMig@2024!Secure#Password$ForSync',  # Strong temporary password
    'name': 'ulearning-redis-target',
    'description': 'Target Redis for migration from UTISA',
    'vpc_name': 'ULEARNING_VPC',  # Need to get actual VPC name
    'subnet_name': 'ulearning_subnet',  # Need to get actual subnet
    'security_group_name': 'default',  # Will modify to allow mig_worker IP
    'enable_publicip': True,
    'publicip_id': '',  # Auto-assign
}

print('\n📊 SOURCE REDIS SPECIFICATIONS:')
print(f'  Engine: {SOURCE_SPECS["engine"]}')
print(f'  Version: {SOURCE_SPECS["engine_version"]}')
print(f'  Capacity: {SOURCE_SPECS["capacity"]} GB')
print(f'  Specification: {SOURCE_SPECS["specification"]}')
print(f'  Public Access: Enabled')
print(f'  Password: {SOURCE_SPECS["password"][:10]}...')

print('\n🔍 First, let me check available VPCs and subnets...')

# Get available VPCs
print('\n📡 Checking available VPCs...')
vpc_cmd = ['hcloud', 'VPC', 'ListVpcs', f'--cli-region={REGION}', '--limit=10']
vpc_result = subprocess.run(vpc_cmd, capture_output=True, text=True, env=env)

if vpc_result.returncode == 0:
    try:
        vpc_data = json.loads(vpc_result.stdout)
        vpcs = vpc_data.get('vpcs', [])
        
        if vpcs:
            print(f'✅ Found {len(vpcs)} VPCs:')
            for vpc in vpcs[:3]:  # Show first 3
                print(f'  - {vpc.get("name")} (ID: {vpc.get("id")}, CIDR: {vpc.get("cidr")})')
            
            # Use first VPC
            TARGET_VPC_ID = vpcs[0].get('id')
            TARGET_VPC_NAME = vpcs[0].get('name')
            print(f'\n🎯 Using VPC: {TARGET_VPC_NAME} ({TARGET_VPC_ID})')
            
            # Get subnets in this VPC
            print(f'\n📡 Checking subnets in {TARGET_VPC_NAME}...')
            subnet_cmd = ['hcloud', 'VPC', 'ListSubnets', f'--cli-region={REGION}', f'--vpc_id={TARGET_VPC_ID}']
            subnet_result = subprocess.run(subnet_cmd, capture_output=True, text=True, env=env)
            
            if subnet_result.returncode == 0:
                subnet_data = json.loads(subnet_result.stdout)
                subnets = subnet_data.get('subnets', [])
                
                if subnets:
                    print(f'✅ Found {len(subnets)} subnets:')
                    for subnet in subnets[:3]:
                        print(f'  - {subnet.get("name")} (ID: {subnet.get("id")}, CIDR: {subnet.get("cidr")}, AZ: {subnet.get("availability_zone")})')
                    
                    # Use first subnet
                    TARGET_SUBNET_ID = subnets[0].get('id')
                    TARGET_SUBNET_NAME = subnets[0].get('name')
                    TARGET_AZ = subnets[0].get('availability_zone')
                    print(f'\n🎯 Using subnet: {TARGET_SUBNET_NAME} ({TARGET_SUBNET_ID}) in {TARGET_AZ}')
                    
                    # Get security groups
                    print(f'\n🛡️ Checking security groups...')
                    sg_cmd = ['hcloud', 'VPC', 'ListSecurityGroups', f'--cli-region={REGION}']
                    sg_result = subprocess.run(sg_cmd, capture_output=True, text=True, env=env)
                    
                    if sg_result.returncode == 0:
                        sg_data = json.loads(sg_result.stdout)
                        sgs = sg_data.get('security_groups', [])
                        
                        if sgs:
                            # Find default security group
                            default_sg = None
                            for sg in sgs:
                                if sg.get('name') == 'default' or 'default' in sg.get('name', '').lower():
                                    default_sg = sg
                                    break
                            
                            if default_sg:
                                TARGET_SG_ID = default_sg.get('id')
                                TARGET_SG_NAME = default_sg.get('name')
                                print(f'✅ Using security group: {TARGET_SG_NAME} ({TARGET_SG_ID})')
                            else:
                                # Use first security group
                                TARGET_SG_ID = sgs[0].get('id')
                                TARGET_SG_NAME = sgs[0].get('name')
                                print(f'✅ Using security group: {TARGET_SG_NAME} ({TARGET_SG_ID})')
                            
                            # Now create the Redis instance
                            print('\n' + '='*80)
                            print('CREATING TARGET REDIS INSTANCE')
                            print('='*80)
                            
                            create_cmd = [
                                'hcloud', 'DCS', 'CreateInstance',
                                f'--cli-region={REGION}',
                                f'--name={SOURCE_SPECS["name"]}',
                                f'--description={SOURCE_SPECS["description"]}',
                                f'--engine={SOURCE_SPECS["engine"]}',
                                f'--engine_version={SOURCE_SPECS["engine_version"]}',
                                f'--capacity={SOURCE_SPECS["capacity"]}',
                                f'--spec_code={SOURCE_SPECS["specification"]}',
                                f'--vpc_id={TARGET_VPC_ID}',
                                f'--subnet_id={TARGET_SUBNET_ID}',
                                f'--security_group_id={TARGET_SG_ID}',
                                f'--availability_zone={TARGET_AZ}',
                                '--no_password_access=false',
                                f'--password={SOURCE_SPECS["password"]}',
                                '--enable_publicip=true',
                                '--maintain_begin=02:00',
                                '--maintain_end=06:00'
                            ]
                            
                            print(f'\n🚀 Creating Redis instance with command:')
                            print(' '.join(create_cmd[:10]) + ' ... [password hidden]')
                            
                            # Uncomment to actually create the instance
                            # result = subprocess.run(create_cmd, capture_output=True, text=True, env=env)
                            # if result.returncode == 0:
                            #     print(f'✅ Redis instance creation initiated successfully!')
                            #     print(f'Response: {result.stdout[:500]}')
                            # else:
                            #     print(f'❌ Failed to create Redis instance: {result.stderr[:500]}')
                            
                            print('\n⚠️  COMMAND COMMENTED OUT FOR SAFETY')
                            print('   Uncomment the create_cmd execution to actually create the instance')
                            
                        else:
                            print('❌ No security groups found')
                    else:
                        print(f'❌ Failed to get security groups: {sg_result.stderr[:200]}')
                else:
                    print('❌ No subnets found in VPC')
            else:
                print(f'❌ Failed to get subnets: {subnet_result.stderr[:200]}')
        else:
            print('❌ No VPCs found in target account')
    except json.JSONDecodeError:
        print(f'❌ Failed to parse VPC data: {vpc_result.stdout[:200]}')
else:
    print(f'❌ Failed to get VPCs: {vpc_result.stderr[:200]}')

print('\n' + '='*80)
print('MANUAL CREATION INSTRUCTIONS')
print('='*80)
print('\nSince automated creation requires specific parameters, here are manual steps:')
print('\n1. Go to: https://console.huaweicloud.com/dcs')
print('2. Select: ULEARNING project, af-south-1 region')
print('3. Click "Create Cache Instance"')
print('\n4. Configure:')
print('   - Name: ulearning-redis-target')
print('   - Engine: Redis')
print('   - Version: 3.0.7.9')
print('   - Specification: redis.ha.xu1.large.4 (4GB)')
print('   - Capacity: 4GB')
print('   - Architecture: Standalone')
print('   - VPC: Select existing ULEARNING VPC')
print('   - Subnet: Select subnet in same AZ as mig_worker (AZ1)')
print('   - Security Group: default (will modify later)')
print('\n5. Network & Security:')
print('   - Enable Public Access: YES')
print('   - Password: TempRedisMig@2024!Secure#Password$ForSync')
print('   - Confirm Password: Same as above')
print('\n6. Advanced Settings:')
print('   - Maintenance Window: 02:00-06:00')
print('   - Description: Target Redis for migration from UTISA')
print('\n7. Create instance (takes 5-10 minutes)')
print('\n8. After creation, modify security group:')
print('   - Add rule: Allow TCP 6379 from 121.91.157.66/32 (mig_worker IP)')
print('   - Remove default 0.0.0.0/0 rule if exists')
print('\n9. Get connection details:')
print('   - Public IP')
print('   - Port: 6379')
print('   - Password: TempRedisMig@2024!Secure#Password$ForSync')

print('\n' + '='*80)
print('REDISSHAKE CONFIGURATION')
print('='*80)
print('\nOnce target Redis is created, configure RedisShake on mig_worker:')
print('\ncat > /opt/migration/redis-sync.conf << EOF')
print('source.type = standalone')
print('source.address = 192.168.10.139:6379')
print('source.password_raw = ')
print('')
print('target.type = standalone')
print('target.address = [TARGET_PUBLIC_IP]:6379')
print('target.password_raw = TempRedisMig@2024!Secure#Password$ForSync')
print('')
print('parallel = 32')
print('psync = true')
print('rewrite = true')
print('filter.db.whitelist = 0,2')
print('filter.key.whitelist = *')
print('filter.key.blacklist = ')
print('')
print('qps = 100000')
print('mbps = 1024')
print('EOF')

print('\n' + '='*80)
print('MIGRATION STEPS')
print('='*80)
print('\n1. Create target Redis (manual steps above)')
print('2. Modify security group to allow mig_worker IP')
print('3. Test connectivity: redis-cli -h [PUBLIC_IP] -p 6379 -a [PASSWORD] PING')
print('4. Configure RedisShake on mig_worker')
print('5. Start initial sync: ./redis-shake -conf=redis-sync.conf -type=sync')
print('6. Monitor progress')
print('7. During cutover: Stop writes, final sync, switch application')
print('8. Disable public access after migration')

print('\n⏱️  Estimated timeline:')
print('   - Redis creation: 10 minutes')
print('   - Security group: 2 minutes')
print('   - Initial sync: 1-2 hours (355MB)')
print('   - Cutover: 15-30 minutes')
print('   - Total: ~3 hours')