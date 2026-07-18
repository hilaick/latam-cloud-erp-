#!/usr/bin/env python3
"""
Check DRS Task Status for ULEARNING project
Task ID: d8d8231c-374d-41fd-8f9d-fd7ed55jb201
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

def check_drs_task_status():
    """Check DRS task status using ULEARNING credentials"""
    
    try:
        # Import Flask app to access database
        from app import app, db
        from models import Customer
        from services.huawei_discovery import HuaweiDiscovery
        
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
            logger.info(f"Found customer: {customer.name} (ID: {customer.id})")
            
            # Check if we have credentials
            if not customer.ak or not customer.sk:
                logger.error("Customer AK/SK not found")
                return None
                
            # Get master password from environment
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            
            # Create HuaweiDiscovery instance to decrypt credentials
            # Note: This uses the target monitoring credentials (master AK/SK)
            discovery = HuaweiDiscovery(
                encrypted_ak_data=customer.ak,
                encrypted_sk_data=customer.sk,
                region=customer.region or "ap-southeast-3",
                master_password=master_password
            )
            
            # Get decrypted credentials
            credentials = discovery.get_credentials()
            if not credentials:
                logger.error("Failed to decrypt credentials")
                return None
                
            ak = credentials.get('ak')
            sk = credentials.get('sk')
            region = customer.region or "ap-southeast-3"
            
            logger.info(f"Using region: {region}")
            logger.info(f"AK (first 10 chars): {ak[:10]}...")
            logger.info(f"SK (first 10 chars): {sk[:10]}...")
            
            # Now use DRS SDK to check task status
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            from huaweicloudsdkdrs.v3 import DrsClient
            from huaweicloudsdkdrs.v3.region.drs_region import DrsRegion
            from huaweicloudsdkdrs.v3.model import ShowJobDetailRequest
            
            # Initialize credentials
            credentials = BasicCredentials(ak, sk)
            
            # Get DRS client for the region
            # DRS control plane is usually in ap-southeast-3 (Singapore)
            drs_region = "ap-southeast-3"
            client = DrsClient.new_builder() \
                .with_credentials(credentials) \
                .with_region(DrsRegion.value_of(drs_region)) \
                .build()
            
            # Get task details
            task_id = "d8d8231c-374d-41fd-8f9d-fd7ed55jb201"
            request = ShowJobDetailRequest(job_id=task_id)
            
            logger.info(f"Checking DRS task: {task_id}")
            response = client.show_job_detail(request)
            
            if response:
                task_info = response.to_dict()
                logger.info("DRS Task Details:")
                logger.info(json.dumps(task_info, indent=2, default=str))
                
                # Extract key information
                status = task_info.get('job', {}).get('status', 'UNKNOWN')
                progress = task_info.get('job', {}).get('progress', '0%')
                description = task_info.get('job', {}).get('description', '')
                created_at = task_info.get('job', {}).get('created_at')
                updated_at = task_info.get('job', {}).get('updated_at')
                
                print("\n" + "="*60)
                print("DRS TASK STATUS REPORT")
                print("="*60)
                print(f"Task ID: {task_id}")
                print(f"Status: {status}")
                print(f"Progress: {progress}")
                print(f"Description: {description}")
                print(f"Created: {created_at}")
                print(f"Updated: {updated_at}")
                
                # Check for errors
                if 'error_msg' in task_info.get('job', {}):
                    error_msg = task_info['job']['error_msg']
                    print(f"Error: {error_msg}")
                    
                # Check subtasks if available
                if 'sub_tasks' in task_info.get('job', {}):
                    print("\nSubtasks:")
                    for subtask in task_info['job']['sub_tasks']:
                        print(f"  - {subtask.get('task_name')}: {subtask.get('status')}")
                        
                return task_info
            else:
                logger.error("No response from DRS API")
                return None
                
    except Exception as e:
        logger.error(f"Error checking DRS task: {e}", exc_info=True)
        return None

def main():
    """Main function"""
    print("Checking DRS Task Status for ULEARNING...")
    print("="*60)
    
    result = check_drs_task_status()
    
    if result:
        print("\n✅ DRS task status retrieved successfully")
    else:
        print("\n❌ Failed to retrieve DRS task status")
        print("\nAlternative: Check manually in Huawei Cloud Console:")
        print("1. Login to Huawei Cloud Console")
        print("2. Go to DRS Service")
        print("3. Search for task ID: d8d8231c-374d-41fd-8f9d-fd7ed55jb201")
        print("4. Check status, progress, and any errors")

if __name__ == "__main__":
    main()