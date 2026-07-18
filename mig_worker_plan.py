#!/usr/bin/env python3
"""
Deploy mig_worker server in the same subnet as Redis/Memcached
"""

import os
import json
import subprocess
import time

print('='*80)
print('MIG_WORKER DEPLOYMENT PLAN')
print('='*80)

# Source account credentials
SOURCE_AK = 'HPUAHMQ1ANAV4VJGYXSX'
SOURCE_SK = 'd0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi'
PROJECT_ID = '08720a7af300f48a2f48c00622277d5d'
REGION = 'af-south-1'

print(f'Source Account: {SOURCE_AK[:10]}...')
print(f'Project ID: {PROJECT_ID}')
print(f'Region: {REGION}')
print()

# Instance information from console
REDIS_INSTANCE = {
    'name': 'dcs-r0il',
    'id': 'e0b18a26-385a-44c6-8bba-8cdf7b6533f1',
    'endpoint': 'redis-e0b18a2-dcs-r0il.dcs.huaweicloud.com:6379',
    'type': 'Redis'
}

MEMCACHED_INSTANCE = {
    'name': 'dcs-ibu2',
    'id': '4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2',
    'endpoint': 'memcached-4e64b6b-dcs-ibu2.dcs.huaweicloud.com:11211',
    'type': 'Memcached'
}

print('📋 INSTANCE INFORMATION:')
print(f'1. Redis: {REDIS_INSTANCE["name"]}')
print(f'   ID: {REDIS_INSTANCE["id"]}')
print(f'   Endpoint: {REDIS_INSTANCE["endpoint"]}')
print()
print(f'2. Memcached: {MEMCACHED_INSTANCE["name"]}')
print(f'   ID: {MEMCACHED_INSTANCE["id"]}')
print(f'   Endpoint: {MEMCACHED_INSTANCE["endpoint"]}')
print()

# We need these specifications from console
print('🚨 MISSING INFORMATION (Need from Console):')
print('1. VPC Name: _______________')
print('2. Subnet Name: _______________')
print('3. Security Group Name: _______________')
print('4. Availability Zone: _______________')
print('5. Instance Specifications:')
print('   - Redis: _______________ (e.g., redis.ha.xu1.large.4)')
print('   - Memcached: _______________ (e.g., memcached.ha.xu1.large.8)')
print('6. Capacity (GB):')
print('   - Redis: _______________ GB')
print('   - Memcached: _______________ GB')
print('7. Private IPs:')
print('   - Redis: _______________')
print('   - Memcached: _______________')
print()

print('='*80)
print('MIG_WORKER DEPLOYMENT STEPS')
print('='*80)

print('''
📦 STEP 1: GET NETWORK INFORMATION FROM CONSOLE
------------------------------------------------
1. Login to Huawei Cloud Console
2. Go to DCS → Redis → dcs-r0il
3. Note down:
   - VPC Name
   - Subnet Name  
   - Security Group
   - Availability Zone
   - Private IP
   - Specification (e.g., redis.ha.xu1.large.4)
   - Capacity (GB)

4. Go to DCS → Memcached → dcs-ibu2
5. Note down same information

📦 STEP 2: CREATE MIG_WORKER EC2 INSTANCE
------------------------------------------------
We need to launch an EC2 in the SAME subnet as Redis/Memcached.

Required specifications:
- Region: af-south-1
- VPC: [From console]
- Subnet: [From console]
- Security Group: Allow SSH (22), Redis (6379), Memcached (11211)
- Instance Type: c6.large.2 (2vCPU, 4GB RAM) or larger
- OS: Ubuntu 22.04
- Disk: 50GB SSD

📦 STEP 3: INSTALL MIGRATION TOOLS
------------------------------------------------
On mig_worker server:
1. Install Redis tools:
   sudo apt update
   sudo apt install -y redis-tools

2. Install Memcached tools:
   sudo apt install -y libmemcached-tools netcat

3. Install RedisShake (for Redis migration):
   wget https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz
   tar -xzf redis-shake-linux-amd64.tar.gz
   chmod +x redis-shake

4. Install monitoring tools:
   sudo apt install -y htop iotop iftop

📦 STEP 4: CONFIGURE NETWORK ACCESS
------------------------------------------------
1. Update Security Group:
   - Allow mig_worker → Redis (6379)
   - Allow mig_worker → Memcached (11211)
   - Allow SSH from your IP

2. Test connectivity:
   redis-cli -h [redis_private_ip] -p 6379 PING
   echo "stats" | nc [memcached_private_ip] 11211

📦 STEP 5: GET INSTANCE SPECIFICATIONS
------------------------------------------------
From mig_worker, we can get detailed specs:

For Redis:
   redis-cli -h [private_ip] -p 6379 INFO
   # Shows: version, memory, replication, persistence, stats

For Memcached:
   echo "stats" | nc [private_ip] 11211
   # Shows: version, connections, memory, items

📦 STEP 6: CREATE TARGET INSTANCES
------------------------------------------------
Based on specs from mig_worker, create identical instances in target account.

📦 STEP 7: START MIGRATION
------------------------------------------------
1. Redis: Use RedisShake for sync
2. Memcached: Use custom script or memdump/memload
3. Validate data consistency
4. Cutover

''')

print('='*80)
print('IMMEDIATE ACTION REQUIRED')
print('='*80)
print('Please provide the missing network information from console:')
print()
print('1. VPC Name:')
print('2. Subnet Name:')
print('3. Security Group Name:')
print('4. Availability Zone:')
print('5. Private IPs:')
print('   - Redis:')
print('   - Memcached:')
print()
print('Once you provide these, I\'ll create the exact mig_worker deployment script!')