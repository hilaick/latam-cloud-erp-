#!/usr/bin/env python3
"""
Alternative approach to find Redis instance
Check all regions and list instances
"""

import os
import sys
import json
import logging
from datetime import datetime

# Add current directory to path
sys.path.append('.')

# Set up logging
logging.basicConfig(level=logging.WARNING)  # Reduce noise
logger = logging.getLogger(__name__)

def find_redis_instance():
    """Search for Redis instance across regions"""
    
    print("="*70)
    print("SEARCHING FOR REDIS INSTANCE")
    print("="*70)
    print(f"Instance ID: e0b18a26-385a-44c6-8bba-8cdf7b6533f1")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Get credentials from database
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
                
            print(f"✅ Customer: {customer.name}")
            
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
                    print(f"✅ Decrypted credentials successfully")
                except Exception as e:
                    print(f"❌ Failed to decrypt credentials: {e}")
                    return None
            else:
                raw_ak = ak_data
                raw_sk = sk_data
            
            # Try Huawei Cloud CLI instead of SDK
            print("\n🔍 Checking with Huawei Cloud CLI...")
            
            # Regions to check (common Huawei Cloud regions)
            regions_to_check = [
                "af-south-1",      # Africa
                "ap-southeast-3",  # Singapore
                "la-south-2",      # Chile
                "cn-north-4",      # Beijing
                "cn-east-3",       # Shanghai
            ]
            
            found_instance = None
            
            for region in regions_to_check:
                print(f"\nChecking region: {region}")
                
                # Try hcloud CLI
                import subprocess
                
                # Set environment with credentials
                env = os.environ.copy()
                env['HUAWEICLOUD_SDK_AK'] = raw_ak
                env['HUAWEICLOUD_SDK_SK'] = raw_sk
                env['HUAWEICLOUD_SDK_REGION'] = region
                
                try:
                    # List DCS instances
                    cmd = ['hcloud', 'dcs', 'instance', 'list', '--region', region]
                    result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=10)
                    
                    if result.returncode == 0:
                        print(f"✅ CLI accessible in {region}")
                        
                        # Try to parse output (could be JSON or table)
                        if 'instance_id' in result.stdout.lower() or 'e0b18a26' in result.stdout:
                            print(f"📋 Found instances in {region}")
                            print(f"Output preview: {result.stdout[:200]}...")
                            
                            # Try to get specific instance
                            cmd = ['hcloud', 'dcs', 'instance', 'show', 
                                   '--instance-id', 'e0b18a26-385a-44c6-8bba-8cdf7b6533f1',
                                   '--region', region]
                            show_result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=10)
                            
                            if show_result.returncode == 0:
                                print(f"🎯 Found instance in {region}!")
                                print(f"Details: {show_result.stdout[:500]}...")
                                found_instance = region
                                break
                            else:
                                print(f"❌ Instance not found in {region}: {show_result.stderr}")
                    else:
                        print(f"❌ CLI error in {region}: {result.stderr[:100]}")
                        
                except subprocess.TimeoutExpired:
                    print(f"⏱️  Timeout checking {region}")
                except Exception as e:
                    print(f"⚠️  Error checking {region}: {e}")
            
            if not found_instance:
                print("\n" + "="*70)
                print("❌ INSTANCE NOT FOUND VIA CLI")
                print("="*70)
                print("Possible reasons:")
                print("1. Instance ID is incorrect")
                print("2. Instance is in a different region")
                print("3. Instance has been deleted")
                print("4. Credentials don't have DCS permissions")
                print("5. Instance belongs to different project")
                
                # Try to get project ID
                print(f"\n🔑 Using AK: {raw_ak[:10]}...")
                print(f"🔑 Using SK: {raw_sk[:10]}...")
                
                # Try to get IAM project list
                try:
                    from huaweicloudsdkcore.auth.credentials import BasicCredentials
                    from huaweicloudsdkiam.v3 import IamClient
                    from huaweicloudsdkiam.v3.region.iam_region import IamRegion
                    from huaweicloudsdkiam.v3.model import KeystoneListProjectsRequest
                    
                    credentials = BasicCredentials(raw_ak, raw_sk)
                    iam_client = IamClient.new_builder() \
                        .with_credentials(credentials) \
                        .with_region(IamRegion.value_of("ap-southeast-1")) \
                        .build()
                    
                    request = KeystoneListProjectsRequest()
                    response = iam_client.keystone_list_projects(request)
                    
                    if response and response.projects:
                        print(f"\n📋 Available projects for these credentials:")
                        for project in response.projects[:5]:  # Show first 5
                            print(f"  • {project.name} ({project.id})")
                except Exception as e:
                    print(f"\n⚠️  Could not list projects: {e}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*70)
    print("NEXT STEPS")
    print("="*70)
    print("Since automated methods failed, please check manually:")
    print()
    print("1. Login to Huawei Cloud Console")
    print("2. Go to DCS (Distributed Cache Service)")
    print("3. Check ALL regions (not just af-south-1)")
    print("4. Look for instance with ID: e0b18a26-385a-44c6-8bba-8cdf7b6533f1")
    print()
    print("OR provide these details manually:")
    print("• Redis instance name")
    print("• Region where it's located")
    print("• Instance type (Single/Cluster)")
    print("• Capacity (GB)")
    print("• Redis version")
    print("• VPC/Subnet details")
    
    return None

if __name__ == "__main__":
    find_redis_instance()