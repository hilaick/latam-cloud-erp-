#!/usr/bin/env python3
"""
Get complete Redis and Memcached instance specifications from Huawei Cloud
"""

import os
import sys
import json
import subprocess
from datetime import datetime

# Add current directory to path
sys.path.append('.')

def get_credentials():
    """Get ULEARNING credentials from database"""
    try:
        from app import app, db
        from models import Customer
        from services.credential_manager import get_credential_manager
        
        with app.app_context():
            # Find ULEARNING customer
            customer = Customer.query.filter(
                Customer.name.ilike('%ulearning%') | 
                Customer.name.ilike('%UTISA%')
            ).first()
            
            if not customer:
                print("❌ No ULEARNING customer found in database")
                return None
                
            # Decrypt credentials
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            
            if not customer.ak or not customer.sk:
                print("❌ Customer AK/SK not found")
                return None
                
            # Check if credentials are encrypted
            ak_data = customer.ak
            sk_data = customer.sk
            
            if ak_data.startswith('{'):
                try:
                    encrypted_data = json.loads(ak_data)
                    credential_manager = get_credential_manager(master_password)
                    raw_ak, raw_sk = credential_manager.decrypt_credentials(encrypted_data)
                    return {
                        'ak': raw_ak,
                        'sk': raw_sk,
                        'region': customer.region or 'af-south-1',
                        'name': customer.name
                    }
                except Exception as e:
                    print(f"❌ Failed to decrypt credentials: {e}")
                    return None
            else:
                return {
                    'ak': ak_data,
                    'sk': sk_data,
                    'region': customer.region or 'af-south-1',
                    'name': customer.name
                }
                
    except Exception as e:
        print(f"❌ Error getting credentials: {e}")
        return None

def get_instance_details(instance_id, instance_type='redis'):
    """Get instance details using Huawei Cloud CLI"""
    
    creds = get_credentials()
    if not creds:
        return None
    
    print(f"\n{'='*80}")
    print(f"GETTING {instance_type.upper()} INSTANCE DETAILS")
    print(f"{'='*80}")
    print(f"Instance ID: {instance_id}")
    print(f"Customer: {creds['name']}")
    print(f"Region: {creds['region']}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Try multiple regions
    regions_to_check = [
        creds['region'],  # Primary region from customer
        'af-south-1',     # Africa
        'ap-southeast-3', # Singapore
        'la-south-2',     # Chile
        'cn-north-4',     # Beijing
        'cn-east-3'       # Shanghai
    ]
    
    for region in regions_to_check:
        print(f"\n🔍 Checking region: {region}")
        
        # Set environment with credentials
        env = os.environ.copy()
        env['HUAWEICLOUD_SDK_AK'] = creds['ak']
        env['HUAWEICLOUD_SDK_SK'] = creds['sk']
        env['HUAWEICLOUD_SDK_REGION'] = region
        
        try:
            # Try to get instance details
            cmd = [
                'hcloud', 'dcs', 'instance', 'show',
                '--instance-id', instance_id,
                '--region', region
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=30)
            
            if result.returncode == 0:
                print(f"✅ Found instance in region: {region}")
                
                # Try to parse JSON output
                try:
                    instance_data = json.loads(result.stdout)
                    return {
                        'region': region,
                        'data': instance_data,
                        'raw_output': result.stdout[:1000]  # First 1000 chars
                    }
                except json.JSONDecodeError:
                    # Output might be table format, return raw
                    return {
                        'region': region,
                        'data': None,
                        'raw_output': result.stdout
                    }
            else:
                print(f"❌ Not found in {region}: {result.stderr[:100]}")
                
        except subprocess.TimeoutExpired:
            print(f"⏱️  Timeout checking {region}")
        except Exception as e:
            print(f"⚠️  Error checking {region}: {e}")
    
    print(f"\n❌ Instance {instance_id} not found in any checked region")
    return None

def list_all_instances():
    """List all DCS instances to find ours"""
    
    creds = get_credentials()
    if not creds:
        return None
    
    print(f"\n{'='*80}")
    print("LISTING ALL DCS INSTANCES")
    print(f"{'='*80}")
    
    regions_to_check = ['af-south-1', 'ap-southeast-3', 'la-south-2']
    
    for region in regions_to_check:
        print(f"\n📋 Region: {region}")
        
        env = os.environ.copy()
        env['HUAWEICLOUD_SDK_AK'] = creds['ak']
        env['HUAWEICLOUD_SDK_SK'] = creds['sk']
        env['HUAWEICLOUD_SDK_REGION'] = region
        
        try:
            cmd = ['hcloud', 'dcs', 'instance', 'list', '--region', region, '--limit', '50']
            result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=30)
            
            if result.returncode == 0:
                print(f"✅ CLI accessible")
                
                # Try to parse as JSON
                try:
                    data = json.loads(result.stdout)
                    if 'instances' in data and data['instances']:
                        print(f"Found {len(data['instances'])} instances:")
                        for inst in data['instances'][:10]:  # Show first 10
                            inst_id = inst.get('instance_id', 'N/A')
                            inst_name = inst.get('name', 'N/A')
                            inst_type = inst.get('engine', 'N/A')
                            inst_status = inst.get('status', 'N/A')
                            print(f"  • {inst_name} ({inst_id}) - {inst_type} - {inst_status}")
                    else:
                        print("No instances found or invalid response format")
                except json.JSONDecodeError:
                    # Output is not JSON, show raw
                    print(f"Raw output (first 500 chars):")
                    print(result.stdout[:500])
            else:
                print(f"❌ CLI error: {result.stderr[:100]}")
                
        except Exception as e:
            print(f"⚠️  Error: {e}")
    
    return None

def get_instance_specs_hardcoded():
    """Provide hardcoded specs based on common Huawei Cloud configurations"""
    
    print(f"\n{'='*80}")
    print("HUAWEI CLOUD DCS INSTANCE SPECIFICATIONS")
    print(f"{'='*80}")
    
    # Common Redis specifications
    redis_specs = {
        "instance_id": "e0b18a26-385a-44c6-8bba-8cdf7b6533f1",
        "type": "Redis",
        "common_configs": [
            {
                "name": "redis.ha.xu1.tiny.2",
                "description": "High Availability, 2GB RAM, 1 vCPU",
                "architecture": "Master-Standby",
                "capacity_gb": 2,
                "cpu_cores": 1,
                "connections": 10000,
                "qps": 100000,
                "suitable_for": "Development/Test"
            },
            {
                "name": "redis.ha.xu1.small.4", 
                "description": "High Availability, 4GB RAM, 1 vCPU",
                "architecture": "Master-Standby",
                "capacity_gb": 4,
                "cpu_cores": 1,
                "connections": 20000,
                "qps": 150000,
                "suitable_for": "Small Production"
            },
            {
                "name": "redis.ha.xu1.large.8",
                "description": "High Availability, 8GB RAM, 2 vCPU",
                "architecture": "Master-Standby",
                "capacity_gb": 8,
                "cpu_cores": 2,
                "connections": 40000,
                "qps": 200000,
                "suitable_for": "Medium Production"
            },
            {
                "name": "redis.cluster.xu1.medium.16",
                "description": "Cluster, 16GB RAM, 4 vCPU (3 shards)",
                "architecture": "Cluster",
                "capacity_gb": 16,
                "cpu_cores": 4,
                "connections": 60000,
                "qps": 300000,
                "suitable_for": "Large Production"
            }
        ]
    }
    
    # Common Memcached specifications
    memcached_specs = {
        "instance_id": "4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2",
        "type": "Memcached",
        "common_configs": [
            {
                "name": "memcached.ha.xu1.tiny.2",
                "description": "High Availability, 2GB RAM, 1 vCPU",
                "architecture": "Master-Standby",
                "capacity_gb": 2,
                "cpu_cores": 1,
                "connections": 10000,
                "qps": 50000,
                "suitable_for": "Development/Test"
            },
            {
                "name": "memcached.ha.xu1.small.4",
                "description": "High Availability, 4GB RAM, 1 vCPU",
                "architecture": "Master-Standby",
                "capacity_gb": 4,
                "cpu_cores": 1,
                "connections": 20000,
                "qps": 100000,
                "suitable_for": "Small Production"
            },
            {
                "name": "memcached.ha.xu1.large.8",
                "description": "High Availability, 8GB RAM, 2 vCPU",
                "architecture": "Master-Standby",
                "capacity_gb": 8,
                "cpu_cores": 2,
                "connections": 40000,
                "qps": 200000,
                "suitable_for": "Medium Production"
            }
        ]
    }
    
    return redis_specs, memcached_specs

def main():
    """Main function to get instance specifications"""
    
    print("="*80)
    print("HUAWEI CLOUD DCS INSTANCE SPECIFICATION CHECK")
    print("="*80)
    
    # Get credentials first
    creds = get_credentials()
    if not creds:
        print("❌ Cannot proceed without credentials")
        return
    
    print(f"\n🔑 Using credentials for: {creds['name']}")
    print(f"🌍 Primary region: {creds['region']}")
    
    # Instance IDs
    redis_id = "e0b18a26-385a-44c6-8bba-8cdf7b6533f1"
    memcached_id = "4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2"
    
    # Try to get Redis instance details
    print(f"\n{'='*80}")
    print("ATTEMPTING TO RETRIEVE REDIS INSTANCE")
    print(f"{'='*80}")
    redis_details = get_instance_details(redis_id, 'redis')
    
    if redis_details:
        print(f"\n✅ Redis instance found in region: {redis_details['region']}")
        if redis_details['data']:
            print(f"\n📊 Redis Details:")
            print(json.dumps(redis_details['data'], indent=2, ensure_ascii=False))
        else:
            print(f"\n📋 Raw output:")
            print(redis_details['raw_output'])
    else:
        print(f"\n❌ Redis instance not found via CLI")
    
    # Try to get Memcached instance details
    print(f"\n{'='*80}")
    print("ATTEMPTING TO RETRIEVE MEMCACHED INSTANCE")
    print(f"{'='*80}")
    memcached_details = get_instance_details(memcached_id, 'memcached')
    
    if memcached_details:
        print(f"\n✅ Memcached instance found in region: {memcached_details['region']}")
        if memcached_details['data']:
            print(f"\n📊 Memcached Details:")
            print(json.dumps(memcached_details['data'], indent=2, ensure_ascii=False))
        else:
            print(f"\n📋 Raw output:")
            print(memcached_details['raw_output'])
    else:
        print(f"\n❌ Memcached instance not found via CLI")
    
    # List all instances to see what's available
    print(f"\n{'='*80}")
    print("CHECKING ALL AVAILABLE INSTANCES")
    print(f"{'='*80}")
    list_all_instances()
    
    # Provide hardcoded specifications as fallback
    print(f"\n{'='*80}")
    print("COMMON HUAWEI CLOUD DCS SPECIFICATIONS (Fallback)")
    print(f"{'='*80}")
    
    redis_specs, memcached_specs = get_instance_specs_hardcoded()
    
    print(f"\n📊 COMMON REDIS CONFIGURATIONS:")
    for spec in redis_specs['common_configs']:
        print(f"\n  🔧 {spec['name']}")
        print(f"     Description: {spec['description']}")
        print(f"     Architecture: {spec['architecture']}")
        print(f"     Capacity: {spec['capacity_gb']}GB")
        print(f"     CPU: {spec['cpu_cores']} vCPU")
        print(f"     Connections: {spec['connections']:,}")
        print(f"     QPS: {spec['qps']:,}")
        print(f"     Suitable for: {spec['suitable_for']}")
    
    print(f"\n📊 COMMON MEMCACHED CONFIGURATIONS:")
    for spec in memcached_specs['common_configs']:
        print(f"\n  🔧 {spec['name']}")
        print(f"     Description: {spec['description']}")
        print(f"     Architecture: {spec['architecture']}")
        print(f"     Capacity: {spec['capacity_gb']}GB")
        print(f"     CPU: {spec['cpu_cores']} vCPU")
        print(f"     Connections: {spec['connections']:,}")
        print(f"     QPS: {spec['qps']:,}")
        print(f"     Suitable for: {spec['suitable_for']}")
    
    print(f"\n{'='*80}")
    print("MANUAL CHECK INSTRUCTIONS")
    print(f"{'='*80}")
    print("If automated methods fail, check manually in Huawei Cloud Console:")
    print()
    print("1. Login to: https://console.huaweicloud.com/dcs")
    print("2. Check each region:")
    print("   - af-south-1 (Africa)")
    print("   - ap-southeast-3 (Singapore)")
    print("   - la-south-2 (Chile)")
    print("3. For each instance, note:")
    print("   • Instance Name")
    print("   • Instance Type (Redis/Memcached)")
    print("   • Specification (e.g., redis.ha.xu1.large.4)")
    print("   • Capacity (GB)")
    print("   • Engine Version (Redis 5.0/6.0)")
    print("   • Architecture (Single/HA/Cluster/Proxy)")
    print("   • VPC/Subnet/Security Group")
    print("   • Private IP and Port")
    print("   • Backup Policy")
    print("   • Maintenance Window")

if __name__ == "__main__":
    main()