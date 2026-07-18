#!/usr/bin/env python3
"""
Get Redis and Memcached instance details using Huawei Cloud SDK with Master AK/SK
"""

import os
import sys
import json
from datetime import datetime

# Add current directory to path
sys.path.append('.')

print("="*80)
print("GETTING DCS INSTANCE DETAILS USING SDK")
print("="*80)
print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Project ID: 08720a7af300f48a2f48c00622277d5d")
print(f"Region: af-south-1")
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
            sys.exit(1)
            
        print(f"✅ Customer: {customer.name}")
        print(f"📧 Email/Username: {customer.email or 'N/A'}")
        print(f"📍 Region: {customer.region or 'af-south-1'}")
        
        # Decrypt credentials
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        
        if not customer.ak or not customer.sk:
            print("❌ Customer AK/SK not found in database")
            sys.exit(1)
            
        print(f"🔑 AK available: {'Yes' if customer.ak else 'No'}")
        print(f"🔑 SK available: {'Yes' if customer.sk else 'No'}")
        
        # Check if credentials are encrypted
        ak_data = customer.ak
        sk_data = customer.sk
        
        if ak_data.startswith('{'):
            try:
                print("🔐 Decrypting encrypted credentials...")
                encrypted_data = json.loads(ak_data)
                credential_manager = get_credential_manager(master_password)
                raw_ak, raw_sk = credential_manager.decrypt_credentials(encrypted_data)
                print(f"✅ Decrypted credentials successfully")
                print(f"   AK (first 16 chars): {raw_ak[:16]}...")
                print(f"   SK (first 16 chars): {raw_sk[:16]}...")
            except Exception as e:
                print(f"❌ Failed to decrypt credentials: {e}")
                print(f"   Raw AK data: {ak_data[:50]}...")
                sys.exit(1)
        else:
            raw_ak = ak_data
            raw_sk = sk_data
            print(f"✅ Using plaintext credentials")
            print(f"   AK (first 16 chars): {raw_ak[:16]}...")
            print(f"   SK (first 16 chars): {raw_sk[:16]}...")
        
        # Now try with Huawei Cloud SDK
        print("\n" + "="*80)
        print("INITIALIZING HUAWEI CLOUD SDK")
        print("="*80)
        
        try:
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            from huaweicloudsdkdcs.v2 import DcsClient
            from huaweicloudsdkdcs.v2.region.dcs_region import DcsRegion
            from huaweicloudsdkdcs.v2.model import ShowInstanceRequest, ListInstancesRequest
            
            print("✅ SDK imports successful")
            
            # Create credentials
            credentials = BasicCredentials(raw_ak, raw_sk)
            
            # Try with project ID in endpoint
            print(f"\n🔧 Creating client for region: af-south-1")
            print(f"   Using Project ID: 08720a7af300f48a2f48c00622277d5d")
            
            # Method 1: Try with project ID in client config
            try:
                client = DcsClient.new_builder() \
                    .with_credentials(credentials) \
                    .with_region(DcsRegion.value_of("af-south-1")) \
                    .build()
                
                print("✅ DCS client created successfully")
                
                # First, list all instances to see what's available
                print("\n" + "="*80)
                print("LISTING ALL DCS INSTANCES")
                print("="*80)
                
                list_request = ListInstancesRequest()
                list_response = client.list_instances(list_request)
                
                if list_response:
                    instances = list_response.to_dict().get('instances', [])
                    print(f"📊 Found {len(instances)} DCS instances")
                    
                    if instances:
                        for i, inst in enumerate(instances, 1):
                            inst_id = inst.get('instance_id', 'N/A')
                            inst_name = inst.get('name', 'N/A')
                            inst_engine = inst.get('engine', 'N/A')
                            inst_spec = inst.get('specification', 'N/A')
                            inst_status = inst.get('status', 'N/A')
                            inst_capacity = inst.get('capacity', 'N/A')
                            
                            print(f"\n{i}. {inst_name}")
                            print(f"   ID: {inst_id}")
                            print(f"   Engine: {inst_engine}")
                            print(f"   Spec: {inst_spec}")
                            print(f"   Status: {inst_status}")
                            print(f"   Capacity: {inst_capacity}GB")
                            
                            # Check if this is one of our target instances
                            target_ids = [
                                'e0b18a26-385a-44c6-8bba-8cdf7b6533f1',
                                '4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2'
                            ]
                            
                            if inst_id in target_ids:
                                print(f"   🎯 TARGET INSTANCE FOUND!")
                                
                                # Get detailed info
                                print(f"\n   📋 DETAILED SPECIFICATIONS:")
                                for key, value in inst.items():
                                    if value and key not in ['created_at', 'updated_at', 'error_code', 'error_msg']:
                                        print(f"      {key}: {value}")
                                
                    else:
                        print("❌ No instances found in this project/region")
                else:
                    print("❌ No response from list_instances API")
                
                # Now try to get specific instances
                print("\n" + "="*80)
                print("GETTING SPECIFIC INSTANCE DETAILS")
                print("="*80)
                
                instance_ids = [
                    'e0b18a26-385a-44c6-8bba-8cdf7b6533f1',  # Redis
                    '4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2'   # Memcached
                ]
                
                for inst_id in instance_ids:
                    print(f"\n🔍 Getting details for instance: {inst_id}")
                    
                    try:
                        show_request = ShowInstanceRequest(instance_id=inst_id)
                        show_response = client.show_instance(show_request)
                        
                        if show_response:
                            instance = show_response.to_dict()
                            print(f"✅ Instance found!")
                            
                            # Extract key specifications
                            print(f"\n📋 INSTANCE SPECIFICATIONS:")
                            print(f"   Name: {instance.get('name', 'N/A')}")
                            print(f"   ID: {instance.get('instance_id', 'N/A')}")
                            print(f"   Engine: {instance.get('engine', 'N/A')}")
                            print(f"   Engine Version: {instance.get('engine_version', 'N/A')}")
                            print(f"   Specification: {instance.get('specification', 'N/A')}")
                            print(f"   Capacity: {instance.get('capacity', 'N/A')} GB")
                            print(f"   Status: {instance.get('status', 'N/A')}")
                            print(f"   Port: {instance.get('port', 'N/A')}")
                            print(f"   IP: {instance.get('ip', 'N/A')}")
                            print(f"   VPC Name: {instance.get('vpc_name', 'N/A')}")
                            print(f"   Subnet Name: {instance.get('subnet_name', 'N/A')}")
                            print(f"   Security Group: {instance.get('security_group_name', 'N/A')}")
                            print(f"   Charging Mode: {instance.get('charging_mode', 'N/A')}")
                            print(f"   Created At: {instance.get('created_at', 'N/A')}")
                            print(f"   Updated At: {instance.get('updated_at', 'N/A')}")
                            
                            # Parse specification for details
                            spec = instance.get('specification', '')
                            if spec:
                                parts = spec.split('.')
                                if len(parts) >= 5:
                                    print(f"\n🔧 SPECIFICATION DETAILS:")
                                    print(f"   Product: {parts[0] if len(parts) > 0 else 'N/A'}")
                                    print(f"   Architecture: {parts[1] if len(parts) > 1 else 'N/A'}")
                                    print(f"   Flavor: {parts[2] if len(parts) > 2 else 'N/A'}")
                                    print(f"   CPU: {parts[3] if len(parts) > 3 else 'N/A'} cores")
                                    print(f"   Memory: {parts[4] if len(parts) > 4 else 'N/A'} GB")
                            
                            # Check if it's cluster or standalone
                            if 'cluster' in spec.lower():
                                print(f"   Type: Cluster")
                                # Get cluster details
                                try:
                                    from huaweicloudsdkdcs.v2.model import ListGroupReplicationInfoRequest
                                    cluster_request = ListGroupReplicationInfoRequest(instance_id=inst_id)
                                    cluster_response = client.list_group_replication_info(cluster_request)
                                    if cluster_response:
                                        clusters = cluster_response.to_dict().get('group_list', [])
                                        print(f"   Cluster Nodes: {len(clusters)}")
                                except:
                                    print(f"   Cluster details not available")
                            else:
                                print(f"   Type: Standalone")
                            
                            # Get backup info
                            try:
                                from huaweicloudsdkdcs.v2.model import ListBackupRecordsRequest
                                backup_request = ListBackupRecordsRequest(instance_id=inst_id, limit=1)
                                backup_response = client.list_backup_records(backup_request)
                                if backup_response:
                                    backups = backup_response.to_dict().get('backup_record_response', [])
                                    if backups:
                                        latest = backups[0]
                                        print(f"\n💾 LATEST BACKUP:")
                                        print(f"   Backup ID: {latest.get('backup_id', 'N/A')}")
                                        print(f"   Time: {latest.get('created_at', 'N/A')}")
                                        print(f"   Size: {latest.get('size', 'N/A')} KB")
                                        print(f"   Type: {latest.get('backup_type', 'N/A')}")
                            except:
                                print(f"\n💾 Backup info not available")
                                
                        else:
                            print(f"❌ No instance found with ID: {inst_id}")
                            
                    except Exception as e:
                        print(f"❌ Error getting instance {inst_id}: {str(e)[:200]}")
                        
            except Exception as e:
                print(f"❌ Error creating DCS client: {str(e)[:200]}")
                print(f"\nTrying alternative approach...")
                
                # Method 2: Try with explicit endpoint
                try:
                    from huaweicloudsdkcore.http.http_config import HttpConfig
                    
                    # Create client with explicit endpoint
                    config = HttpConfig.get_default_config()
                    config.ignore_ssl_verification = True
                    
                    client = DcsClient.new_builder() \
                        .with_credentials(credentials) \
                        .with_http_config(config) \
                        .with_endpoint("https://dcs.af-south-1.myhuaweicloud.com") \
                        .build()
                    
                    print("✅ Created client with explicit endpoint")
                    
                    # Try listing instances again
                    list_request = ListInstancesRequest()
                    list_response = client.list_instances(list_request)
                    
                    if list_response:
                        instances = list_response.to_dict().get('instances', [])
                        print(f"📊 Found {len(instances)} instances via explicit endpoint")
                    else:
                        print("❌ No instances via explicit endpoint")
                        
                except Exception as e2:
                    print(f"❌ Explicit endpoint also failed: {str(e2)[:200]}")
                    
        except ImportError as e:
            print(f"❌ SDK import error: {e}")
            print("\nTrying to install missing SDK...")
            
            # Try to install DCS SDK
            import subprocess
            try:
                result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", "huaweicloudsdkdcs"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    print("✅ Installed huaweicloudsdkdcs")
                    print("Please run the script again")
                else:
                    print(f"❌ Failed to install: {result.stderr}")
            except Exception as install_error:
                print(f"❌ Installation error: {install_error}")
                
        except Exception as e:
            print(f"❌ SDK initialization error: {e}")
            import traceback
            traceback.print_exc()
            
except ImportError as e:
    print(f"❌ Database import error: {e}")
    print("\nMake sure you're in the correct directory with the Flask app")
    
except Exception as e:
    print(f"❌ General error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*80)
print("NEXT STEPS IF SDK FAILS")
print("="*80)
print("If SDK fails, please provide these details MANUALLY from DCS console:")
print()
print("1. Login to: https://console.huaweicloud.com/dcs")
print("2. Select Project: 08720a7af300f48a2f48c00622277d5d")
print("3. Select Region: af-south-1")
print("4. Find instances and provide:")
print()
print("REDIS (e0b18a26-385a-44c6-8bba-8cdf7b6533f1):")
print("   • Instance Name")
print("   • Specification (e.g., redis.ha.xu1.large.4)")
print("   • Capacity (GB)")
print("   • Engine Version")
print("   • Architecture (Single/HA/Cluster/Proxy)")
print("   • VPC/Subnet/Security Group")
print("   • Private IP & Port")
print()
print("MEMCACHED (4e64b6bb-43c6-4b31-b2ff-eb70e7ab6ad2):")
print("   • Instance Name")
print("   • Specification (e.g., memcached.ha.xu1.large.8)")
print("   • Capacity (GB)")
print("   • Architecture (Single/HA)")
print("   • VPC/Subnet/Security Group")
print("   • Private IP & Port")