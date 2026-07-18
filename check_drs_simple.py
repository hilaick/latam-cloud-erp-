#!/usr/bin/env python3
"""
Simple DRS Task Status Check
Using existing HuaweiDiscovery infrastructure
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

def get_ulearning_credentials():
    """Get ULEARNING customer credentials from database"""
    try:
        from app import app, db
        from models import Customer
        
        with app.app_context():
            # Find ULEARNING customer
            customers = Customer.query.filter(
                Customer.name.ilike('%ulearning%') | 
                Customer.name.ilike('%UTISA%')
            ).all()
            
            if not customers:
                logger.error("No ULEARNING customer found in database")
                return None
                
            customer = customers[0]
            logger.info(f"Found customer: {customer.name}")
            
            return {
                'ak': customer.ak,
                'sk': customer.sk,
                'region': customer.region or 'ap-southeast-3',
                'name': customer.name
            }
            
    except Exception as e:
        logger.error(f"Error getting credentials: {e}")
        return None

def check_drs_status_simple():
    """Simple DRS status check using Huawei Cloud CLI or API"""
    
    print("="*60)
    print("DRS TASK STATUS CHECK")
    print("="*60)
    print(f"Task ID: d8d8231c-374d-41fd-8f9d-fd7ed55jb201")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Get credentials
    creds = get_ulearning_credentials()
    if not creds:
        print("❌ Could not retrieve ULEARNING credentials")
        print("\nPlease check manually in Huawei Cloud Console:")
        print("1. Login to https://console.huaweicloud.com/drs")
        print("2. Go to 'Data Replication Service'")
        print("3. Find task: d8d8231c-374d-41fd-8f9d-fd7ed55jb201")
        print("4. Check status in 'Migration Tasks'")
        return
    
    print(f"✅ Found customer: {creds['name']}")
    print(f"   Region: {creds['region']}")
    print(f"   AK available: {'Yes' if creds['ak'] else 'No'}")
    print(f"   SK available: {'Yes' if creds['sk'] else 'No'}")
    print()
    
    # Try to use hcloud CLI if available
    print("Attempting to check DRS status via Huawei Cloud CLI...")
    
    # Method 1: Try hcloud CLI
    try:
        import subprocess
        print("\nMethod 1: Huawei Cloud CLI (hcloud)")
        
        # Set credentials in environment
        env = os.environ.copy()
        env['HUAWEICLOUD_SDK_AK'] = creds['ak']
        env['HUAWEICLOUD_SDK_SK'] = creds['sk']
        env['HUAWEICLOUD_SDK_REGION'] = creds['region']
        
        # Try to get DRS task list
        cmd = [
            'hcloud', 'drs', 'job', 'list',
            '--limit', '10',
            '--region', creds['region']
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        
        if result.returncode == 0:
            print("✅ Huawei Cloud CLI accessible")
            print(f"Output: {result.stdout[:200]}...")
            
            # Try to get specific task
            cmd = [
                'hcloud', 'drs', 'job', 'show',
                '--job-id', 'd8d8231c-374d-41fd-8f9d-fd7ed55jb201',
                '--region', creds['region']
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, env=env)
            if result.returncode == 0:
                print("\n✅ DRS Task Details:")
                print(result.stdout)
            else:
                print(f"\n❌ Could not get task details: {result.stderr}")
        else:
            print(f"❌ Huawei Cloud CLI not available or error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ CLI method failed: {e}")
    
    # Method 2: Direct API call with SDK
    print("\n" + "="*60)
    print("Method 2: Direct API Call")
    print("="*60)
    
    try:
        from huaweicloudsdkcore.auth.credentials import BasicCredentials
        from huaweicloudsdkdrs.v3 import DrsClient
        from huaweicloudsdkdrs.v3.region.drs_region import DrsRegion
        from huaweicloudsdkdrs.v3.model import ShowJobDetailRequest
        
        # Decrypt credentials
        from services.credential_manager import get_credential_manager
        
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        
        # Check if credentials are encrypted
        ak_data = creds['ak']
        sk_data = creds['sk']
        
        if ak_data and ak_data.startswith('{'):
            try:
                encrypted_data = json.loads(ak_data)
                credential_manager = get_credential_manager(master_password)
                raw_ak, raw_sk = credential_manager.decrypt_credentials(encrypted_data)
                print(f"✅ Decrypted credentials successfully")
                print(f"   AK (first 8 chars): {raw_ak[:8]}...")
                print(f"   SK (first 8 chars): {raw_sk[:8]}...")
            except Exception as e:
                print(f"❌ Failed to decrypt credentials: {e}")
                raw_ak = ak_data
                raw_sk = sk_data
        else:
            raw_ak = ak_data
            raw_sk = sk_data
            
        # Initialize DRS client
        credentials = BasicCredentials(raw_ak, raw_sk)
        
        # DRS control plane region (usually ap-southeast-3 for Singapore)
        drs_region = "ap-southeast-3"
        client = DrsClient.new_builder() \
            .with_credentials(credentials) \
            .with_region(DrsRegion.value_of(drs_region)) \
            .build()
        
        # Get task details
        request = ShowJobDetailRequest(
            job_id="d8d8231c-374d-41fd-8f9d-fd7ed55jb201"
        )
        
        print(f"\nQuerying DRS API in region: {drs_region}")
        response = client.show_job_detail(request)
        
        if response:
            task = response.to_dict()
            print("\n" + "="*60)
            print("DRS TASK STATUS")
            print("="*60)
            
            job = task.get('job', {})
            
            # Basic info
            print(f"📋 Task Name: {job.get('name', 'N/A')}")
            print(f"🆔 Task ID: {job.get('id', 'N/A')}")
            print(f"📊 Status: {job.get('status', 'N/A')}")
            print(f"📈 Progress: {job.get('progress', 'N/A')}")
            print(f"🏷️  Job Type: {job.get('job_type', 'N/A')}")
            print(f"🔄 Job Direction: {job.get('job_direction', 'N/A')}")
            
            # Database info
            db_info = job.get('db_object', {})
            if db_info:
                print(f"🗃️  DB Engine: {db_info.get('engine_type', 'N/A')}")
                print(f"🔗 Network Type: {db_info.get('net_type', 'N/A')}")
            
            # Task info
            task_info = job.get('tasks', [])
            if task_info:
                print(f"📋 Total Tasks: {len(task_info)}")
                for i, task in enumerate(task_info[:3]):  # Show first 3 tasks
                    print(f"  Task {i+1}: {task.get('name', 'N/A')} - {task.get('status', 'N/A')}")
            
            # Error info
            if job.get('alarm_notify'):
                print(f"⚠️  Alarm: {job.get('alarm_notify', {}).get('status', 'N/A')}")
            
            if job.get('error_msg'):
                print(f"❌ Error: {job.get('error_msg')}")
            
            # Timing info
            print(f"🕐 Created: {job.get('created_at', 'N/A')}")
            print(f"🕐 Updated: {job.get('updated_at', 'N/A')}")
            
            if job.get('start_time'):
                print(f"▶️  Started: {job.get('start_time')}")
            
            if job.get('end_time'):
                print(f"⏹️  Ended: {job.get('end_time')}")
            
            print("\n" + "="*60)
            print("Full response available in detailed view")
            
        else:
            print("❌ No response from DRS API")
            
    except ImportError as e:
        print(f"❌ DRS SDK import error: {e}")
        print("Try: pip install huaweicloudsdkdrs")
    except Exception as e:
        print(f"❌ API call failed: {e}")
    
    # Method 3: Manual instructions
    print("\n" + "="*60)
    print("MANUAL CHECK INSTRUCTIONS")
    print("="*60)
    print("If automated methods fail, check manually:")
    print()
    print("1. Login to Huawei Cloud Console")
    print("2. Go to DRS Service: https://console.huaweicloud.com/drs")
    print("3. Select region: ap-southeast-3 (Singapore)")
    print("4. Click 'Migration Tasks'")
    print("5. Search for task ID: d8d8231c-374d-41fd-8f9d-fd7ed55jb201")
    print()
    print("Key things to check:")
    print("• Task Status (Creating, Full, Incremental, Completed, Failed)")
    print("• Progress Percentage")
    print("• Any error messages")
    print("• Data transferred vs total")
    print("• Replication lag (if incremental)")
    print()

if __name__ == "__main__":
    check_drs_status_simple()