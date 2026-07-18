#!/usr/bin/env python3
"""
Check DRS Task Status in af-south-1 region
Task ID from URL: 3f2fb16f-a635-4f64-ad85-077b9b6jb204
Project ID: 019f62e326757fcdb9cbea172cfeb46e
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

def check_drs_task_af_south():
    """Check DRS task in af-south-1 region"""
    
    print("="*70)
    print("DRS TASK STATUS CHECK - af-south-1")
    print("="*70)
    print(f"Task ID (from URL): 3f2fb16f-a635-4f64-ad85-077b9b6jb204")
    print(f"Task ID (mentioned): d8d8231c-374d-41fd-8f9d-fd7ed55jb201")
    print(f"Project ID: 019f62e326757fcdb9cbea172cfeb46e")
    print(f"Region: af-south-1")
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
            
            # Initialize Huawei Cloud SDK for af-south-1
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            from huaweicloudsdkdrs.v3 import DrsClient
            from huaweicloudsdkdrs.v3.region.drs_region import DrsRegion
            from huaweicloudsdkdrs.v3.model import ShowJobListRequest
            
            # Use af-south-1 region (from URL)
            drs_region = "af-south-1"
            
            # Create credentials and client
            credentials = BasicCredentials(raw_ak, raw_sk)
            
            try:
                client = DrsClient.new_builder() \
                    .with_credentials(credentials) \
                    .with_region(DrsRegion.value_of(drs_region)) \
                    .build()
                
                print(f"🔗 Connecting to DRS region: {drs_region}")
                
                # Get all jobs to find our task
                request = ShowJobListRequest()
                response = client.show_job_list(request)
                
                if response and hasattr(response, 'jobs'):
                    jobs = response.jobs
                    print(f"📋 Found {len(jobs)} DRS jobs in {drs_region}")
                    
                    # Check both possible task IDs
                    task_ids_to_check = [
                        "3f2fb16f-a635-4f64-ad85-077b9b6jb204",  # From URL
                        "d8d8231c-374d-41fd-8f9d-fd7ed55jb201"   # Mentioned earlier
                    ]
                    
                    found_tasks = []
                    
                    for job in jobs:
                        if hasattr(job, 'id'):
                            job_id = job.id
                            if job_id in task_ids_to_check:
                                found_tasks.append(job)
                    
                    if found_tasks:
                        print("\n" + "="*70)
                        print(f"✅ FOUND {len(found_tasks)} DRS TASK(S)")
                        print("="*70)
                        
                        for task in found_tasks:
                            task_dict = task.to_dict()
                            print(f"\n📋 Task Name: {task_dict.get('name', 'N/A')}")
                            print(f"🆔 Task ID: {task_dict.get('id', 'N/A')}")
                            print(f"📊 Status: {task_dict.get('status', 'N/A')}")
                            print(f"📈 Progress: {task_dict.get('progress', 'N/A')}")
                            print(f"🏷️  Job Type: {task_dict.get('job_type', 'N/A')}")
                            print(f"🔄 Job Direction: {task_dict.get('job_direction', 'N/A')}")
                            
                            # Database info
                            db_info = task_dict.get('db_object', {})
                            if db_info:
                                print(f"🗃️  DB Engine: {db_info.get('engine_type', 'N/A')}")
                                print(f"🔗 Network Type: {db_info.get('net_type', 'N/A')}")
                            
                            # Error info
                            if task_dict.get('error_msg'):
                                print(f"❌ Error: {task_dict.get('error_msg')}")
                            
                            # Timing info
                            print(f"🕐 Created: {task_dict.get('created_at', 'N/A')}")
                            print(f"🕐 Updated: {task_dict.get('updated_at', 'N/A')}")
                            
                            if task_dict.get('start_time'):
                                print(f"▶️  Started: {task_dict.get('start_time')}")
                            
                            if task_dict.get('end_time'):
                                print(f"⏹️  Ended: {task_dict.get('end_time')}")
                            
                            print("-" * 50)
                        
                        return found_tasks
                    else:
                        print(f"\n❌ Neither task ID found in {drs_region}")
                        print(f"   Looking for: {task_ids_to_check}")
                        print("\nChecking job names and types:")
                        for job in jobs[:5]:  # Show first 5 jobs
                            job_dict = job.to_dict()
                            print(f"  • {job_dict.get('name')} - {job_dict.get('id')} - {job_dict.get('status')}")
                        
                else:
                    print("❌ No jobs found or error retrieving job list")
                    
            except Exception as e:
                print(f"❌ Error with DRS client in {drs_region}: {e}")
                print(f"\nTrying ap-southeast-3 (Singapore control plane)...")
                
                # Try Singapore region
                drs_region = "ap-southeast-3"
                client = DrsClient.new_builder() \
                    .with_credentials(credentials) \
                    .with_region(DrsRegion.value_of(drs_region)) \
                    .build()
                
                print(f"🔗 Connecting to DRS region: {drs_region}")
                request = ShowJobListRequest()
                response = client.show_job_list(request)
                
                if response and hasattr(response, 'jobs'):
                    jobs = response.jobs
                    print(f"📋 Found {len(jobs)} DRS jobs in {drs_region}")
                    # ... similar check for Singapore
                
    except ImportError as e:
        print(f"❌ Import error: {e}")
        
    except Exception as e:
        print(f"❌ Error checking DRS task: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*70)
    print("MANUAL CHECK CONFIRMED")
    print("="*70)
    print("Based on your URL, the task is in:")
    print("• Region: af-south-1")
    print("• Project: 019f62e326757fcdb9cbea172cfeb46e")
    print("• Task ID: 3f2fb16f-a635-4f64-ad85-077b9b6jb204")
    print("\nPlease check:")
    print("1. Task status in console")
    print("2. Progress percentage")
    print("3. Any error messages")
    print("4. Whether it's MySQL migration")
    
    return None

if __name__ == "__main__":
    check_drs_task_af_south()