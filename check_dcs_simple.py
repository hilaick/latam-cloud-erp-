#!/usr/bin/env python3
"""
Simple DCS instance check using Huawei Cloud SDK
"""

import os
import sys
import json

# Add current directory to path
sys.path.append('.')

print("="*80)
print("DCS INSTANCE CHECK - SIMPLE SDK APPROACH")
print("="*80)

try:
    # Get credentials directly
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
            sys.exit(1)
            
        print(f"✅ Customer: {customer.name}")
        
        # Decrypt credentials
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        
        if not customer.ak or not customer.sk:
            print("❌ Customer AK/SK not found")
            sys.exit(1)
        
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
                sys.exit(1)
        else:
            raw_ak = ak_data
            raw_sk = sk_data
            print(f"✅ Using plaintext credentials")
        
        print(f"🔑 AK: {raw_ak[:20]}...")
        print(f"🔑 SK: {raw_sk[:20]}...")
        
        # Try SDK
        print("\n" + "="*80)
        print("TRYING HUAWEI CLOUD SDK")
        print("="*80)
        
        try:
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            from huaweicloudsdkdcs.v2 import DcsClient
            from huaweicloudsdkdcs.v2.region.dcs_region import DcsRegion
            from huaweicloudsdkdcs.v2.model import ShowInstanceRequest, ListInstancesRequest
            
            print("✅ SDK imports successful")
            
            # Create credentials
            credentials = BasicCredentials(raw_ak, raw_sk)
            
            # Try different regions
            regions = ['af-south-1', 'ap-southeast-3', 'la-south-2']
            
            for region in regions:
                print(f"\n🔍 Trying region: {region}")
                
                try:
                    client = DcsClient.new_builder() \
                        .with_credentials(credentials) \
                        .with_region(DcsRegion.value_of(region)) \
                        .build()
                    
                    print(f"✅ Client created for {region}")
                    
                    # Try to list instances
                    try:
                        request = ListInstancesRequest()
                        response = client.list_instances(request)
                        
                        if response:
                            instances = response.to_dict().get('instances', [])
                            print(f"📊 Found {len(instances)} instances in {region}")
                            
                            if instances:
                                for inst in instances:
                                    inst_id = inst.get('instance_id', '')
                                    inst_name = inst.get('name', '')
                                    inst_engine = inst.get('engine', '')
                                    
                                    print(f"   • {inst_name} ({inst_id}) - {inst_engine}")
                                    
                                    # Check if it's our target
                                    if inst_id in ['e0b18a26-385a-44c6-8bba-8cdf7b6533f1', '4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2']:
                                        print(f"     🎯 TARGET FOUND!")
                                        print(f"     Spec: {inst.get('specification', 'N/A')}")
                                        print(f"     Capacity: {inst.get('capacity', 'N/A')}GB")
                                        print(f"     Status: {inst.get('status', 'N/A')}")
                                        print(f"     IP: {inst.get('ip', 'N/A')}")
                                        print(f"     Port: {inst.get('port', 'N/A')}")
                            else:
                                print(f"   No instances in {region}")
                        else:
                            print(f"❌ No response from list_instances")
                            
                    except Exception as e:
                        print(f"❌ Error listing instances: {str(e)[:100]}")
                    
                    # Try to get specific instances
                    instance_ids = [
                        'e0b18a26-385a-44c6-8bba-8cdf7b6533f1',
                        '4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2'
                    ]
                    
                    for inst_id in instance_ids:
                        print(f"\n   🔎 Looking for instance: {inst_id}")
                        try:
                            show_request = ShowInstanceRequest(instance_id=inst_id)
                            show_response = client.show_instance(show_request)
                            
                            if show_response:
                                instance = show_response.to_dict()
                                print(f"   ✅ Found!")
                                print(f"     Name: {instance.get('name', 'N/A')}")
                                print(f"     Engine: {instance.get('engine', 'N/A')}")
                                print(f"     Spec: {instance.get('specification', 'N/A')}")
                                print(f"     Capacity: {instance.get('capacity', 'N/A')}GB")
                                print(f"     Status: {instance.get('status', 'N/A')}")
                            else:
                                print(f"   ❌ Not found in {region}")
                                
                        except Exception as e:
                            error_msg = str(e)
                            if 'DCS.3022' in error_msg:
                                print(f"   ❌ Instance does not exist in {region}")
                            else:
                                print(f"   ❌ Error: {error_msg[:100]}")
                    
                except Exception as e:
                    print(f"❌ Error creating client for {region}: {str(e)[:100]}")
            
        except ImportError as e:
            print(f"❌ SDK import error: {e}")
            print("\nChecking SDK installation...")
            import pkg_resources
            try:
                dist = pkg_resources.get_distribution("huaweicloudsdkdcs")
                print(f"✅ DCS SDK installed: {dist.version}")
            except:
                print("❌ DCS SDK not installed")
                
        except Exception as e:
            print(f"❌ SDK error: {e}")
            import traceback
            traceback.print_exc()
            
except Exception as e:
    print(f"❌ General error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("ALTERNATIVE: TRY DIFFERENT AUTH METHOD")
print("="*80)

# Try with project ID in request
print("\nTrying with project ID in request...")
try:
    from huaweicloudsdkcore.auth.credentials import BasicCredentials
    from huaweicloudsdkdcs.v2 import DcsClient
    from huaweicloudsdkdcs.v2.region.dcs_region import DcsRegion
    from huaweicloudsdkdcs.v2.model import ShowInstanceRequest
    
    credentials = BasicCredentials(raw_ak, raw_sk)
    
    # Try with project ID header
    print("Creating client with project ID...")
    client = DcsClient.new_builder() \
        .with_credentials(credentials) \
        .with_region(DcsRegion.value_of("af-south-1")) \
        .build()
    
    # Try to add project ID to headers
    print("Attempting to add project ID to request...")
    
    # Try to get instance with project ID
    inst_id = 'e0b18a26-385a-44c6-8bba-8cdf7b6533f1'
    show_request = ShowInstanceRequest(instance_id=inst_id)
    
    # Add project ID to headers if possible
    try:
        response = client.show_instance(show_request)
        if response:
            print(f"✅ Got response for {inst_id}")
            instance = response.to_dict()
            print(json.dumps(instance, indent=2, ensure_ascii=False))
        else:
            print("❌ No response")
    except Exception as e:
        print(f"❌ Request failed: {str(e)[:200]}")
        
except Exception as e:
    print(f"❌ Alternative method failed: {e}")

print("\n" + "="*80)
print("MANUAL CHECK REQUIRED")
print("="*80)
print("Since automated methods are failing, please check manually:")
print()
print("1. Login to Huawei Cloud Console")
print("2. Select Project: 08720a7af300f48a2f48c00622277d5d")
print("3. Select Region: af-south-1")
print("4. Go to DCS → Redis/Memcached")
print("5. Find instances and provide specifications")
print()
print("The SDK authentication is failing, likely due to:")
print("• Cross-project permissions issue")
print("• IAM role doesn't have DCS access")
print("• Project 08720a7af300f48a2f48c00622277d5d requires different credentials")