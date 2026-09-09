#!/usr/bin/env python3
"""
Check Huawei Cloud SMS migration task status using Python SDK
This demonstrates the authentication context issue vs console access
"""

import os
import sys
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdksms.v3 import SmsClient
from huaweicloudsdksms.v3.region.sms_region import SmsRegion
from huaweicloudsdksms.v3.model import ShowTaskRequest

def check_migration_task_with_sdk():
    """Check migration task using Python SDK with ERP credentials"""
    
    # ERP credentials from deploy_mig_worker_sdk.py
    ak = "HPUAHMQ1ANAV4VJGYXSX"
    sk = "d0rzkbZafoKnuH6CtsW905HjrLprP06TJEVofnLi"
    project_id = "c5354feed62946958b9554cffb70a13c"
    task_id = "acc70035-ddf9-44a3-aad0-cf5392ff5a77"
    
    print("=" * 80)
    print("Checking Migration Task with Python SDK")
    print("=" * 80)
    print(f"Task ID: {task_id}")
    print(f"Project ID: {project_id}")
    print(f"Region: ap-southeast-3 (SMS orchestration region)")
    print(f"Credentials: {ak[:10]}...")
    print()
    
    try:
        # Create credentials
        credentials = BasicCredentials(ak, sk, project_id=project_id)
        
        # Create SMS client for ap-southeast-3
        client = SmsClient.new_builder() \
            .with_credentials(credentials) \
            .with_region(SmsRegion.AP_SOUTHEAST_3) \
            .build()
        
        # Create request
        request = ShowTaskRequest()
        request.task_id = task_id
        
        print("Attempting to fetch task details...")
        response = client.show_task(request)
        
        print("\n✅ SUCCESS: Task details retrieved!")
        print(f"Task State: {response.state}")
        print(f"Task Status: {response.status}")
        print(f"Progress: {getattr(response, 'progress', 'N/A')}")
        print(f"Estimated Finish Time: {getattr(response, 'estimated_finish_time', 'N/A')}")
        print(f"Source Server: {getattr(response, 'source_server_id', 'N/A')}")
        print(f"Target Server: {getattr(response, 'target_server_id', 'N/A')}")
        
    except Exception as e:
        print(f"\n❌ ERROR with SDK: {type(e).__name__}: {e}")
        
        # Check specific error types
        error_str = str(e)
        if "SMS.6527" in error_str:
            print("\n🔍 ANALYSIS: SMS.6527 - 'the resource in the task does not belong to you!'")
            print("This means:")
            print("1. The task EXISTS in ap-southeast-3 SMS region")
            print("2. But your AK/SK credentials don't have permission to view it")
            print("3. The task was created with DIFFERENT credentials")
            print("\n📊 Console vs API Difference:")
            print("- Console (Browser): Uses IAM user token with ENTERPRISE-WIDE permissions")
            print("- API/SDK (AK/SK): Uses project-scoped credentials")
            print("\n💡 Possible reasons:")
            print("• Task created by different IAM user")
            print("• Task in different project within same enterprise")
            print("• Task created via console with broader permissions")
            print("• Your AK/SK lacks 'SMS ReadOnly' or 'SMS FullAccess' role")
            print("\n✅ Console can see it because:")
            print("• IAM user has enterprise project admin role")
            print("• Cross-project visibility enabled in console")
            print("• Console uses different authentication context")
        
        elif "SMS.7703" in error_str:
            print("\n🔍 ANALYSIS: SMS.7703 - 'Task doesn't exist'")
            print("Task not found in ap-southeast-3 region")
            
        elif "APIGW.0301" in error_str:
            print("\n🔍 ANALYSIS: APIGW.0301 - Authentication error")
            print("Invalid AK/SK or project ID")
            
        else:
            print(f"\n🔍 Generic error: {e}")

def check_with_different_contexts():
    """Demonstrate different authentication contexts"""
    
    print("\n" + "=" * 80)
    print("Authentication Context Analysis")
    print("=" * 80)
    
    print("\n1. CONSOLE ACCESS (Browser):")
    print("   • IAM User Token (X-Auth-Token)")
    print("   • Enterprise Project: 6a586d63-10d9-4287-be7e-3860d6694696")
    print("   • Cross-project visibility: ENABLED")
    print("   • Can see ALL resources in enterprise")
    
    print("\n2. API/SDK ACCESS (Current AK/SK):")
    print("   • AK/SK: HPUAHMQ1ANAV4VJGYXSX")
    print("   • Project ID: c5354feed62946958b9554cffb70a13c")
    print("   • Scope: SINGLE PROJECT ONLY")
    print("   • Cannot see resources in other projects")
    
    print("\n3. MIGRATION TASK CONTEXT:")
    print("   • Created in: ap-southeast-3 (SMS region)")
    print("   • Target in: la-north-2 (CODELPA project)")
    print("   • Likely created with: Different IAM user or project")
    
    print("\n4. SOLUTIONS:")
    print("   a) Use IAM user token instead of AK/SK")
    print("   b) Get AK/SK for the project where task was created")
    print("   c) Add 'SMS ReadOnly' role to current AK/SK")
    print("   d) Use console (already works)")

if __name__ == "__main__":
    check_migration_task_with_sdk()
    check_with_different_contexts()