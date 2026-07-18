#!/usr/bin/env python3
"""
Get Redis instance specifications for ULEARNING project
Instance ID: e0b18a26-385a-44c6-8bba-8cdf7b6533f1
"""

import os
import sys
import json
import logging
from datetime import datetime

# Add current directory to path
sys.path.append('.')

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_redis_specs():
    """Get Redis instance specifications"""
    
    print("="*70)
    print("REDIS INSTANCE SPECIFICATIONS - ULEARNING PROJECT")
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
            print(f"   Region: {customer.region or 'af-south-1'}")
            
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
            
            # Initialize Huawei Cloud DCS (Redis) SDK
            try:
                from huaweicloudsdkcore.auth.credentials import BasicCredentials
                from huaweicloudsdkdcs.v2 import DcsClient
                from huaweicloudsdkdcs.v2.region.dcs_region import DcsRegion
                from huaweicloudsdkdcs.v2.model import ShowInstanceRequest
                
                # Use af-south-1 region (ULEARNING region)
                dcs_region = "af-south-1"
                
                # Create credentials and client
                credentials = BasicCredentials(raw_ak, raw_sk)
                client = DcsClient.new_builder() \
                    .with_credentials(credentials) \
                    .with_region(DcsRegion.value_of(dcs_region)) \
                    .build()
                
                print(f"🔗 Connecting to DCS (Redis) region: {dcs_region}")
                
                # Get Redis instance details
                instance_id = "e0b18a26-385a-44c6-8bba-8cdf7b6533f1"
                request = ShowInstanceRequest(instance_id=instance_id)
                
                try:
                    response = client.show_instance(request)
                    
                    if response:
                        instance = response.to_dict()
                        print("\n" + "="*70)
                        print("✅ REDIS INSTANCE FOUND")
                        print("="*70)
                        
                        # Extract key specifications
                        specs = instance.get('specification', 'N/A')
                        name = instance.get('name', 'N/A')
                        status = instance.get('status', 'N/A')
                        engine = instance.get('engine', 'N/A')
                        engine_version = instance.get('engine_version', 'N/A')
                        capacity = instance.get('capacity', 'N/A')
                        vpc_name = instance.get('vpc_name', 'N/A')
                        subnet_name = instance.get('subnet_name', 'N/A')
                        security_group_name = instance.get('security_group_name', 'N/A')
                        private_ip = instance.get('ip', 'N/A')
                        port = instance.get('port', 'N/A')
                        created_at = instance.get('created_at', 'N/A')
                        updated_at = instance.get('updated_at', 'N/A')
                        
                        # Display specifications
                        print(f"📋 Instance Name: {name}")
                        print(f"🆔 Instance ID: {instance_id}")
                        print(f"📊 Status: {status}")
                        print(f"⚙️  Engine: {engine} {engine_version}")
                        print(f"💾 Capacity: {capacity} GB")
                        print(f"🔧 Specification: {specs}")
                        print(f"🌐 Network: {vpc_name} / {subnet_name}")
                        print(f"🔐 Security Group: {security_group_name}")
                        print(f"📍 Private IP: {private_ip}")
                        print(f"🔌 Port: {port}")
                        print(f"🕐 Created: {created_at}")
                        print(f"🕐 Updated: {updated_at}")
                        
                        # Parse specification details
                        if specs and isinstance(specs, str):
                            print(f"\n📈 Specification Details:")
                            # Common Huawei Redis specs format: "redis.ha.xu1.large.4"
                            # Format: product.architecture.flavor.cpu.memory
                            parts = specs.split('.')
                            if len(parts) >= 5:
                                print(f"   Product: {parts[0]}")
                                print(f"   Architecture: {parts[1]}")  # ha=High Availability, single=Single Node
                                print(f"   Flavor: {parts[2]}")
                                print(f"   CPU: {parts[3]} cores")
                                print(f"   Memory: {parts[4]} GB")
                        
                        # Check if it's cluster or standalone
                        if 'cluster' in specs.lower():
                            print(f"🏗️  Type: Redis Cluster")
                            # Get cluster details
                            try:
                                from huaweicloudsdkdcs.v2.model import ListGroupReplicationInfoRequest
                                cluster_request = ListGroupReplicationInfoRequest(instance_id=instance_id)
                                cluster_response = client.list_group_replication_info(cluster_request)
                                if cluster_response:
                                    clusters = cluster_response.to_dict().get('group_list', [])
                                    print(f"   Cluster Nodes: {len(clusters)}")
                                    for cluster in clusters[:3]:  # Show first 3 nodes
                                        print(f"   - Node: {cluster.get('node_id', 'N/A')}, Role: {cluster.get('role', 'N/A')}")
                            except:
                                print(f"   Cluster details not available")
                        else:
                            print(f"🏗️  Type: Redis Standalone")
                        
                        # Check backup configuration
                        try:
                            from huaweicloudsdkdcs.v2.model import ListBackupRecordsRequest
                            backup_request = ListBackupRecordsRequest(instance_id=instance_id, limit=1)
                            backup_response = client.list_backup_records(backup_request)
                            if backup_response:
                                backups = backup_response.to_dict().get('backup_record_response', [])
                                if backups:
                                    latest_backup = backups[0]
                                    print(f"\n💾 Latest Backup: {latest_backup.get('backup_id', 'N/A')}")
                                    print(f"   Backup Time: {latest_backup.get('created_at', 'N/A')}")
                                    print(f"   Backup Size: {latest_backup.get('size', 'N/A')} KB")
                                else:
                                    print(f"\n💾 No backups found")
                        except:
                            print(f"\n💾 Backup info not available")
                        
                        # Get instance metrics if available
                        try:
                            from huaweicloudsdkces.v1 import CesClient
                            from huaweicloudsdkces.v1.region.ces_region import CesRegion
                            from huaweicloudsdkces.v1.model import BatchListMetricDataRequest, MetricInfo, DatapointForBatchMetric
                            
                            ces_client = CesClient.new_builder() \
                                .with_credentials(credentials) \
                                .with_region(CesRegion.value_of(dcs_region)) \
                                .build()
                            
                            # Get CPU usage
                            metric_info = MetricInfo(
                                namespace="SYS.DCS",
                                metric_name="cpu_usage",
                                dimensions=[{"name": "dcs_instance_id", "value": instance_id}]
                            )
                            
                            print(f"\n📊 Recent Metrics (last 1 hour):")
                            print(f"   (Metric queries would go here)")
                            
                        except:
                            print(f"\n📊 Metrics not available")
                        
                        print("\n" + "="*70)
                        print("MIGRATION RECOMMENDATIONS")
                        print("="*70)
                        
                        # Migration recommendations based on specs
                        if 'ha' in specs.lower():
                            print("✅ High Availability instance - Use RedisShake for migration")
                            print("   Recommended: redis-shake with RDB backup/restore")
                        else:
                            print("✅ Single node instance - Simple migration possible")
                            print("   Options: redis-cli sync, redis-shake, or RDB transfer")
                        
                        if capacity and int(capacity) > 10:
                            print(f"⚠️  Large instance ({capacity}GB) - Plan for downtime")
                            print("   Estimate: 1-2 hours for {capacity}GB")
                        else:
                            print(f"✅ Small instance ({capacity}GB) - Minimal downtime expected")
                        
                        print(f"\n🔧 Migration Tool: redis-shake (recommended)")
                        print(f"📦 Data Transfer: ~{capacity}GB via OBS or direct")
                        print(f"⏱️  Estimated Downtime: {int(capacity) * 2} minutes")
                        
                        return instance
                        
                    else:
                        print(f"❌ No instance found with ID: {instance_id}")
                        
                except Exception as e:
                    print(f"❌ Error getting instance details: {e}")
                    print(f"\nTrying to list all instances to find it...")
                    
                    # List all instances to find ours
                    from huaweicloudsdkdcs.v2.model import ListInstancesRequest
                    list_request = ListInstancesRequest()
                    list_response = client.list_instances(list_request)
                    
                    if list_response:
                        instances = list_response.to_dict().get('instances', [])
                        print(f"📋 Found {len(instances)} Redis instances in {dcs_region}")
                        
                        found = False
                        for inst in instances:
                            if inst.get('instance_id') == instance_id:
                                found = True
                                print(f"\n✅ Found instance in list:")
                                print(f"   Name: {inst.get('name')}")
                                print(f"   Status: {inst.get('status')}")
                                print(f"   Spec: {inst.get('specification')}")
                                print(f"   Capacity: {inst.get('capacity')}GB")
                                break
                        
                        if not found:
                            print(f"\n❌ Instance {instance_id} not found in instance list")
                            print("\nAvailable instances:")
                            for inst in instances[:5]:  # Show first 5
                                print(f"  • {inst.get('name')} - {inst.get('instance_id')} - {inst.get('specification')}")
                    
            except ImportError as e:
                print(f"❌ DCS SDK import error: {e}")
                print("Try: pip install huaweicloudsdkdcs")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*70)
    print("MANUAL CHECK INSTRUCTIONS")
    print("="*70)
    print("If API fails, check manually in Huawei Cloud Console:")
    print()
    print("1. Login to: https://console.huaweicloud.com/dcs")
    print("2. Select region: af-south-1")
    print("3. Find instance: e0b18a26-385a-44c6-8bba-8cdf7b6533f1")
    print("4. Check Specifications tab")
    print()
    print("Key specs to note:")
    print("• Instance Type (Single/Cluster/Proxy)")
    print("• Capacity (GB)")
    print("• Flavor (e.g., redis.ha.xu1.large.4)")
    print("• Engine Version (Redis 5.0/6.0)")
    print("• VPC/Subnet/Security Group")
    print("• Private IP and Port")
    
    return None

if __name__ == "__main__":
    get_redis_specs()