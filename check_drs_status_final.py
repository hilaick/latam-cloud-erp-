#!/usr/bin/env python3
"""
Check DRS Task Status for ULEARNING project
Using Huawei Cloud SDK
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

def get_drs_task_status():
    """Get DRS task status using Huawei Cloud SDK"""
    
    print("="*70)
    print("DRS TASK STATUS CHECK")
    print("="*70)
    print(f"Task ID: d8d8231c-374d-41fd-8f9d-fd7ed55jb201")
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
            print(f"   Region: {customer.region or 'ap-southeast-3'}")
            
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
            
            # Initialize Huawei Cloud SDK
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            from huaweicloudsdkdrs.v3 import DrsClient
            from huaweicloudsdkdrs.v3.region.drs_region import DrsRegion
            from huaweicloudsdkdrs.v3.model import ShowJobListRequest
            
            # DRS control plane region (Singapore)
            drs_region = "ap-southeast-3"
            
            # Create credentials and client
            credentials = BasicCredentials(raw_ak, raw_sk)
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
                print(f"📋 Found {len(jobs)} DRS jobs")
                
                # Find our specific task
                task_id = "d8d8231c-374d-41fd-8f9d-fd7ed55jb201"
                found_task = None
                
                for job in jobs:
                    if hasattr(job, 'id') and job.id == task_id:
                        found_task = job
                        break
                
                if found_task:
                    print("\n" + "="*70)
                    print("✅ DRS TASK FOUND")
                    print("="*70)
                    
                    # Extract task details
                    task_dict = found_task.to_dict()
                    
                    # Display key information
                    print(f"📋 Task Name: {task_dict.get('name', 'N/A')}")
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
                        print(f"📍 Source DB: {db_info.get('db_name', 'N/A')}")
                        print(f"🎯 Target DB: {db_info.get('target_db_name', 'N/A')}")
                    
                    # Error info
                    if task_dict.get('error_msg'):
                        print(f"❌ Error: {task_dict.get('error_msg')}")
                    
                    if task_dict.get('error_code'):
                        print(f"🔢 Error Code: {task_dict.get('error_code')}")
                    
                    # Timing info
                    print(f"🕐 Created: {task_dict.get('created_at', 'N/A')}")
                    print(f"🕐 Updated: {task_dict.get('updated_at', 'N/A')}")
                    
                    if task_dict.get('start_time'):
                        print(f"▶️  Started: {task_dict.get('start_time')}")
                    
                    if task_dict.get('end_time'):
                        print(f"⏹️  Ended: {task_dict.get('end_time')}")
                    
                    # Additional details
                    if task_dict.get('description'):
                        print(f"📝 Description: {task_dict.get('description')}")
                    
                    # Task type specific info
                    job_type = task_dict.get('job_type', '')
                    if job_type == 'migration':
                        print(f"🚀 Migration Type: {task_dict.get('period_type', 'N/A')}")
                        print(f"🔧 Node Type: {task_dict.get('node_type', 'N/A')}")
                    
                    print("\n" + "="*70)
                    print("Full task details available in Huawei Cloud Console")
                    
                    # Return status for monitoring
                    return {
                        'status': task_dict.get('status', 'UNKNOWN'),
                        'progress': task_dict.get('progress', '0%'),
                        'error': task_dict.get('error_msg'),
                        'updated_at': task_dict.get('updated_at')
                    }
                else:
                    print(f"\n❌ Task {task_id} not found in DRS job list")
                    print("\nPossible reasons:")
                    print("1. Task was deleted")
                    print("2. Wrong region (checking {drs_region})")
                    print("3. Different account credentials")
                    print("\nPlease check manually in Huawei Cloud Console")
                    
            else:
                print("❌ No jobs found or error retrieving job list")
                
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("\nMake sure Huawei Cloud DRS SDK is installed:")
        print("pip install huaweicloudsdkdrs")
        
    except Exception as e:
        print(f"❌ Error checking DRS task: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*70)
    print("MANUAL CHECK INSTRUCTIONS")
    print("="*70)
    print("1. Login to Huawei Cloud Console")
    print("2. Go to DRS Service: https://console.huaweicloud.com/drs")
    print("3. Select region: ap-southeast-3 (Singapore)")
    print("4. Click 'Migration Tasks'")
    print("5. Search for: d8d8231c-374d-41fd-8f9d-fd7ed55jb201")
    print("\nKey metrics to check:")
    print("• Status: Creating, Full, Incremental, Completed, Failed")
    print("• Progress: Percentage complete")
    print("• Data: Transferred/Total size")
    print("• Lag: Replication lag (for incremental)")
    print("• Errors: Any error messages")
    
    return None

if __name__ == "__main__":
    result = get_drs_task_status()
    
    # Format for cron job monitoring
    if result:
        print("\n" + "="*70)
        print("📊 MONITORING SUMMARY")
        print("="*70)
        print(f"Status: {result['status']}")
        print(f"Progress: {result['progress']}")
        print(f"Last Updated: {result['updated_at']}")
        if result['error']:
            print(f"Error: {result['error']}")
    else:
        print("\n❌ Could not retrieve DRS task status")