#!/usr/bin/env python3
"""
Get Redis and Memcached instance details using Huawei Cloud SDK
"""

import os
import sys
import json
from datetime import datetime

# Add current directory to path
sys.path.append('.')

def get_dcs_details_sdk():
    """Get DCS instance details using SDK"""
    
    print("="*80)
    print("GETTING DCS INSTANCE DETAILS USING SDK")
    print("="*80)
    
    try:
        # Get credentials
        from app import app, db
        from models import Customer
        from services.credential_manager import get_credential_manager
        
        with app.app_context():
            customer = Customer.query.filter(
                Customer.name.ilike('%ulearning%') | 
                Customer.name.ilike('%UTISA%')
            ).first()
            
            if not customer:
                print("❌ No ULEARNING customer found")
                return
            
            print(f"✅ Customer: {customer.name}")
            
            # Decrypt credentials
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            
            if not customer.ak or not customer.sk:
                print("❌ Customer AK/SK not found")
                return
            
            ak_data = customer.ak
            sk_data = customer.sk
            
            if ak_data.startswith('{'):
                try:
                    encrypted_data = json.loads(ak_data)
                    credential_manager = get_credential_manager(master_password)
                    raw_ak, raw_sk = credential_manager.decrypt_credentials(encrypted_data)
                    print(f"✅ Decrypted credentials")
                except Exception as e:
                    print(f"❌ Failed to decrypt: {e}")
                    return
            else:
                raw_ak = ak_data
                raw_sk = sk_data
            
            # Try to use SDK
            try:
                from huaweicloudsdkcore.auth.credentials import BasicCredentials
                from huaweicloudsdkdcs.v2 import DcsClient
                from huaweicloudsdkdcs.v2.region.dcs_region import DcsRegion
                from huaweicloudsdkdcs.v2.model import ShowInstanceRequest
                
                # Try multiple regions
                regions = ['af-south-1', 'ap-southeast-3', 'la-south-2']
                
                for region in regions:
                    print(f"\n🔍 Checking region: {region}")
                    
                    try:
                        credentials = BasicCredentials(raw_ak, raw_sk)
                        client = DcsClient.new_builder() \
                            .with_credentials(credentials) \
                            .with_region(DcsRegion.value_of(region)) \
                            .build()
                        
                        # Check Redis instance
                        print(f"\n📊 Redis Instance: e0b18a26-385a-44c6-8bba-8cdf7b6533f1")
                        redis_request = ShowInstanceRequest(
                            instance_id="e0b18a26-385a-44c6-8bba-8cdf7b6533f1"
                        )
                        
                        redis_response = client.show_instance(redis_request)
                        if redis_response:
                            redis_data = redis_response.to_dict()
                            print(f"✅ Found Redis instance in {region}")
                            print(json.dumps(redis_data, indent=2, ensure_ascii=False))
                            break
                        else:
                            print(f"❌ Redis instance not found in {region}")
                            
                    except Exception as e:
                        print(f"⚠️  Error in {region}: {str(e)[:200]}")
                        
            except ImportError as e:
                print(f"❌ SDK import error: {e}")
                print("\nTrying alternative methods...")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def try_cli_with_correct_syntax():
    """Try CLI with correct parameter syntax"""
    
    print("\n" + "="*80)
    print("TRYING CLI WITH CORRECT SYNTAX")
    print("="*80)
    
    # Get credentials
    creds = get_credentials()
    if not creds:
        return
    
    # Try different CLI syntax variations
    syntax_variations = [
        ["hcloud", "dcs", "instance", "show", "--instance-id=e0b18a26-385a-44c6-8bba-8cdf7b6533f1"],
        ["hcloud", "dcs", "show-instance", "--instance-id=e0b18a26-385a-44c6-8bba-8cdf7b6533f1"],
        ["hcloud", "dcs", "instance", "list"],
        ["hcloud", "dcs", "list-instances"]
    ]
    
    for region in ['af-south-1', 'ap-southeast-3']:
        print(f"\n🌍 Region: {region}")
        
        env = os.environ.copy()
        env['HUAWEICLOUD_SDK_AK'] = creds['ak']
        env['HUAWEICLOUD_SDK_SK'] = creds['sk']
        env['HUAWEICLOUD_SDK_REGION'] = region
        
        for cmd in syntax_variations:
            cmd_with_region = cmd + ['--region', region]
            print(f"\n  Trying: {' '.join(cmd_with_region)}")
            
            try:
                result = subprocess.run(cmd_with_region, capture_output=True, text=True, env=env, timeout=10)
                if result.returncode == 0:
                    print(f"  ✅ Command succeeded")
                    print(f"  Output: {result.stdout[:200]}...")
                    
                    # Try to parse as JSON
                    try:
                        data = json.loads(result.stdout)
                        print(f"  JSON parsed successfully")
                        if isinstance(data, dict) and 'instance' in data:
                            print(f"  Instance found!")
                            return data
                    except json.JSONDecodeError:
                        print(f"  Output is not JSON")
                else:
                    print(f"  ❌ Failed: {result.stderr[:100]}")
            except Exception as e:
                print(f"  ⚠️  Error: {e}")

def get_credentials():
    """Get credentials helper function"""
    try:
        from app import app, db
        from models import Customer
        from services.credential_manager import get_credential_manager
        
        with app.app_context():
            customer = Customer.query.filter(
                Customer.name.ilike('%ulearning%') | 
                Customer.name.ilike('%UTISA%')
            ).first()
            
            if not customer:
                return None
            
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            
            if not customer.ak or not customer.sk:
                return None
            
            ak_data = customer.ak
            sk_data = customer.sk
            
            if ak_data.startswith('{'):
                try:
                    encrypted_data = json.loads(ak_data)
                    credential_manager = get_credential_manager(master_password)
                    raw_ak, raw_sk = credential_manager.decrypt_credentials(encrypted_data)
                    return {'ak': raw_ak, 'sk': raw_sk, 'name': customer.name}
                except:
                    return None
            else:
                return {'ak': ak_data, 'sk': sk_data, 'name': customer.name}
                
    except Exception:
        return None

def provide_manual_check_instructions():
    """Provide detailed manual check instructions"""
    
    print("\n" + "="*80)
    print("MANUAL CHECK REQUIRED - CRITICAL SPECIFICATIONS NEEDED")
    print("="*80)
    
    print("\n📋 PLEASE CHECK THESE IN HUAWEI CLOUD CONSOLE:")
    
    print("\n1. REDIS INSTANCE (e0b18a26-385a-44c6-8bba-8cdf7b6533f1):")
    print("   a. Go to DCS → Redis → Find instance")
    print("   b. Click on instance name")
    print("   c. Note these SPECIFICATIONS:")
    print("      • Instance Name:")
    print("      • Specification: (e.g., redis.ha.xu1.large.4)")
    print("      • Engine Version: (Redis 5.0/6.0/7.0)")
    print("      • Capacity: (GB)")
    print("      • Architecture: (Single/HA/Cluster/Proxy)")
    print("      • VPC Name:")
    print("      • Subnet Name:")
    print("      • Security Group:")
    print("      • Private IP:")
    print("      • Port: (default 6379)")
    print("      • Password: (Enabled/Disabled)")
    print("      • SSL: (Enabled/Disabled)")
    print("      • Backup Policy:")
    print("      • Maintenance Window:")
    
    print("\n2. MEMCACHED INSTANCE (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2):")
    print("   a. Go to DCS → Memcached → Find instance")
    print("   b. Click on instance name")
    print("   c. Note these SPECIFICATIONS:")
    print("      • Instance Name:")
    print("      • Specification: (e.g., memcached.ha.xu1.large.8)")
    print("      • Engine Version:")
    print("      • Capacity: (GB)")
    print("      • Architecture: (Single/HA)")
    print("      • VPC Name:")
    print("      • Subnet Name:")
    print("      • Security Group:")
    print("      • Private IP:")
    print("      • Port: (default 11211)")
    print("      • Password: (Enabled/Disabled)")
    
    print("\n3. NETWORK CONFIGURATION:")
    print("   a. VPC ID: (for both instances)")
    print("   b. Subnet ID: (for both instances)")
    print("   c. Security Group Rules: (inbound/outbound)")
    print("   d. Peering Connections: (if any)")
    print("   e. NAT Gateway: (if needed for migration)")
    
    print("\n4. PERFORMANCE METRICS (Optional but helpful):")
    print("   a. Current connections:")
    print("   b. Memory usage:")
    print("   c. QPS (Queries per second):")
    print("   d. CPU utilization:")
    
    print("\n🎯 WHY THESE SPECS ARE CRITICAL:")
    print("   • To launch IDENTICAL instances in target account")
    print("   • To ensure application compatibility")
    print("   • To maintain performance SLAs")
    print("   • To configure proper security groups")
    print("   • To estimate migration time")

if __name__ == "__main__":
    import subprocess
    
    print("="*80)
    print("REDIS & MEMCACHED INSTANCE SPECIFICATION RETRIEVAL")
    print("="*80)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Try SDK method
    get_dcs_details_sdk()
    
    # Try CLI with correct syntax
    try_cli_with_correct_syntax()
    
    # Provide manual instructions
    provide_manual_check_instructions()
    
    print("\n" + "="*80)
    print("IMMEDIATE NEXT STEPS")
    print("="*80)
    print("1. Please check Huawei Cloud Console manually")
    print("2. Provide the specifications listed above")
    print("3. I'll create migration plan based on exact specs")
    print("4. We'll launch identical instances in target account")
    print("\n⏱️  This is URGENT for migration planning!")