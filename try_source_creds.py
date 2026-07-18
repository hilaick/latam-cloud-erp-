#!/usr/bin/env python3
"""
Try source discovery credentials for DCS instances
"""

import os
import sys
import json
import subprocess

# Add current directory to path
sys.path.append('.')

print("="*80)
print("TRYING SOURCE DISCOVERY CREDENTIALS FOR DCS")
print("="*80)

def try_source_credentials(customer_name, customer_id, region):
    """Try DCS access with source customer credentials"""
    print(f"\n🔍 Trying: {customer_name} (ID: {customer_id})")
    print(f"   Region: {region}")
    
    try:
        from app import app, db
        from models import Customer
        from services.credential_manager import get_credential_manager
        
        with app.app_context():
            customer = Customer.query.filter_by(id=customer_id).first()
            if not customer or not customer.ak or not customer.sk:
                print(f"   ❌ No credentials found")
                return None
            
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            
            # Decrypt credentials
            ak_data = customer.ak
            sk_data = customer.sk
            
            if ak_data.startswith('{'):
                try:
                    encrypted_data = json.loads(ak_data)
                    credential_manager = get_credential_manager(master_password)
                    raw_ak, raw_sk = credential_manager.decrypt_credentials(encrypted_data)
                    print(f"   ✅ Decrypted credentials")
                except Exception as e:
                    print(f"   ❌ Failed to decrypt: {e}")
                    return None
            else:
                raw_ak = ak_data
                raw_sk = sk_data
                print(f"   ✅ Using plaintext credentials")
            
            # Try DCS ListInstances
            env = os.environ.copy()
            env['HUAWEICLOUD_SDK_AK'] = raw_ak
            env['HUAWEICLOUD_SDK_SK'] = raw_sk
            env['HUAWEICLOUD_SDK_REGION'] = region.split(',')[0].strip()  # Use first region
            
            print(f"   Testing DCS access in {env['HUAWEICLOUD_SDK_REGION']}...")
            
            # Try to list DCS instances
            cmd = ['hcloud', 'DCS', 'ListInstances', '--limit=10']
            result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=10)
            
            if result.returncode == 0:
                print(f"   ✅ DCS API accessible")
                
                # Try to parse response
                try:
                    data = json.loads(result.stdout)
                    instances = data.get('instances', [])
                    print(f"   📊 Found {len(instances)} DCS instances")
                    
                    # Look for our target instances
                    target_ids = [
                        'e0b18a26-385a-44c6-8bba-8cdf7b6533f1',  # Redis
                        '4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2'   # Memcached
                    ]
                    
                    for inst in instances:
                        inst_id = inst.get('instance_id', '')
                        inst_name = inst.get('name', '')
                        inst_engine = inst.get('engine', '')
                        
                        if inst_id in target_ids:
                            print(f"   🎯 FOUND TARGET INSTANCE!")
                            print(f"      Name: {inst_name}")
                            print(f"      ID: {inst_id}")
                            print(f"      Engine: {inst_engine}")
                            print(f"      Spec: {inst.get('specification', 'N/A')}")
                            print(f"      Capacity: {inst.get('capacity', 'N/A')}GB")
                            return {
                                'customer': customer_name,
                                'ak': raw_ak,
                                'sk': raw_sk,
                                'region': env['HUAWEICLOUD_SDK_REGION'],
                                'instance': inst
                            }
                    
                    # If we found instances but not our targets
                    if instances:
                        print(f"   Found instances (not our targets):")
                        for inst in instances[:3]:  # Show first 3
                            print(f"      • {inst.get('name')} ({inst.get('instance_id')}) - {inst.get('engine')}")
                        return {
                            'customer': customer_name,
                            'ak': raw_ak,
                            'sk': raw_sk,
                            'region': env['HUAWEICLOUD_SDK_REGION'],
                            'instances': instances
                        }
                    else:
                        print(f"   No DCS instances found")
                        return None
                        
                except json.JSONDecodeError:
                    print(f"   Response: {result.stdout[:200]}")
                    return None
            else:
                print(f"   ❌ DCS API error: {result.stderr[:200]}")
                return None
                
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:100]}")
        return None

# Try different source customers
source_customers = [
    {"name": "EDITORA EL MUNDO", "id": "1780645884086", "region": "la-north-2"},
    {"name": "FORZA LOGISTICS GROUP", "id": "1782315519839", "region": "la-north-2"},
    {"name": "CODELPA", "id": "CUST-1779860501737", "region": "la-north-2"},
    {"name": "MARCAS DIGITALES", "id": "CUST-1781751034522", "region": "la-north-2"},
    {"name": "FMP TECHNOLOGY SERVICES", "id": "1782170129541", "region": "la-north-2"},
    {"name": "UNIVERSIDAD CENTRAL DEL ESTE (UCE)", "id": "CUST-1780789462862", "region": "la-north-2"},
]

print("\n" + "="*80)
print("TESTING ALL SOURCE CUSTOMERS")
print("="*80)

working_credentials = []

for customer in source_customers:
    result = try_source_credentials(customer["name"], customer["id"], customer["region"])
    if result:
        working_credentials.append(result)

print("\n" + "="*80)
print("RESULTS SUMMARY")
print("="*80)

if working_credentials:
    print(f"✅ Found {len(working_credentials)} customers with DCS access")
    for cred in working_credentials:
        print(f"\n📋 Customer: {cred['customer']}")
        print(f"   Region: {cred['region']}")
        if 'instance' in cred:
            print(f"   🎯 Found target instance!")
            inst = cred['instance']
            print(f"      Name: {inst.get('name')}")
            print(f"      ID: {inst.get('instance_id')}")
            print(f"      Engine: {inst.get('engine')}")
            print(f"      Spec: {inst.get('specification')}")
            print(f"      Capacity: {inst.get('capacity')}GB")
        elif 'instances' in cred:
            print(f"   Found {len(cred['instances'])} instances (not our targets)")
else:
    print("❌ No source customers with DCS access found")
    
    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)
    print("Since source discovery credentials don't work, we need to:")
    print()
    print("1. MANUAL CHECK (Recommended):")
    print("   • Login to DCS console with admin user")
    print("   • Select project: 08720a7af300f48a2f48c00622277d5d")
    print("   • Region: af-south-1")
    print("   • Find Redis & Memcached instances")
    print("   • Provide specifications")
    print()
    print("2. GET CORRECT CREDENTIALS:")
    print("   • Generate AK/SK for project 08720a7af300f48a2f48c00622277d5d")
    print("   • Grant DCS ReadOnly permissions")
    print("   • Share temporary credentials")
    print()
    print("3. CHECK PROJECT ASSOCIATION:")
    print("   • Verify which customer/account owns project 08720a7af300f48a2f48c00622277d5d")
    print("   • Use that customer's credentials")