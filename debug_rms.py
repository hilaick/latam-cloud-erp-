#!/usr/bin/env python3
"""
Debug RMS (Resource Center Service) connectivity and permissions
"""

import sys
sys.path.append('.')

from huaweicloudsdkcore.auth.credentials import GlobalCredentials
from huaweicloudsdkcore.region.region import Region
from huaweicloudsdkrms.v1 import RmsClient, ListAllResourcesRequest
from huaweicloudsdkiam.v3 import IamClient, KeystoneListProjectsRequest
from huaweicloudsdkiam.v3.region.iam_region import IamRegion
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_rms_connection(ak, sk, region="af-south-1"):
    """Test RMS API connection with GlobalCredentials"""
    print(f"Testing RMS API connection to region: {region}")
    print("=" * 60)
    
    try:
        # Test IAM first to get project IDs
        print("1. Testing IAM connection...")
        iam_creds = GlobalCredentials(ak, sk)
        iam_client = IamClient.new_builder().with_credentials(iam_creds).with_region(IamRegion.value_of("ap-southeast-1")).build()
        
        projects_res = iam_client.keystone_list_projects(KeystoneListProjectsRequest())
        project_ids = {p.name: p.id for p in projects_res.projects} if projects_res.projects else {}
        print(f"   ✓ Found {len(project_ids)} projects")
        
        # Get project ID for the region
        target_project_id = project_ids.get(region)
        if not target_project_id:
            print(f"   ✗ No project ID found for region {region}")
            print(f"   Available projects: {list(project_ids.keys())}")
            return False
        
        print(f"   ✓ Project ID for {region}: {target_project_id}")
        
        # Test RMS with GlobalCredentials
        print(f"\n2. Testing RMS connection to {region}...")
        rms_region = Region(id=region, endpoint=f"https://rms.{region}.myhuaweicloud.com")
        rms_client = RmsClient.new_builder().with_credentials(iam_creds).with_region(rms_region).build()
        
        # Try to list resources
        request = ListAllResourcesRequest(
            region_id=region,
            limit=10  # Small limit for testing
        )
        
        print(f"   Sending request: region_id={region}, limit=10")
        response = rms_client.list_all_resources(request)
        
        if response and hasattr(response, 'resources'):
            resources = response.resources or []
            print(f"   ✓ RMS API successful! Found {len(resources)} resources")
            
            if resources:
                print(f"\n   Sample resources:")
                for i, resource in enumerate(resources[:5]):  # Show first 5
                    resource_type = getattr(resource, 'resource_type', 'Unknown')
                    resource_name = getattr(resource, 'resource_name', 'Unknown')
                    print(f"   {i+1}. {resource_type}: {resource_name}")
            
            return True
        else:
            print(f"   ✗ No resources in response")
            return False
            
    except Exception as e:
        print(f"   ✗ RMS API error: {type(e).__name__}: {str(e)}")
        
        # Check specific error types
        if "credential type error" in str(e):
            print(f"\n   ⚠️  CREDENTIAL ISSUE: RMS requires GlobalCredentials")
            print(f"   Current credentials type: {type(iam_creds).__name__}")
        elif "permission" in str(e).lower() or "unauthorized" in str(e).lower():
            print(f"\n   ⚠️  PERMISSION ISSUE: AK/SK may not have RMS permissions")
            print(f"   Required IAM policy: RMS ReadOnlyAccess or RMS FullAccess")
        elif "endpoint" in str(e).lower():
            print(f"\n   ⚠️  ENDPOINT ISSUE: RMS may not be available in region {region}")
            print(f"   Try different region or check service availability")
        
        return False

def test_basic_credentials(ak, sk, region="af-south-1"):
    """Test if BasicCredentials work for regular services"""
    print(f"\n3. Testing BasicCredentials for regular services...")
    
    from huaweicloudsdkcore.auth.credentials import BasicCredentials
    from huaweicloudsdkecs.v2 import EcsClient, ListServersDetailsRequest
    
    try:
        # Need a project ID for BasicCredentials
        # First get project ID from IAM
        iam_creds = GlobalCredentials(ak, sk)
        iam_client = IamClient.new_builder().with_credentials(iam_creds).with_region(IamRegion.value_of("ap-southeast-1")).build()
        projects_res = iam_client.keystone_list_projects(KeystoneListProjectsRequest())
        project_ids = {p.name: p.id for p in projects_res.projects} if projects_res.projects else {}
        target_project_id = project_ids.get(region)
        
        if not target_project_id:
            print(f"   ✗ No project ID for region {region}")
            return False
        
        # Test ECS with BasicCredentials
        ecs_creds = BasicCredentials(ak, sk, target_project_id)
        ecs_region = Region(id=region, endpoint=f"https://ecs.{region}.myhuaweicloud.com")
        ecs_client = EcsClient.new_builder().with_credentials(ecs_creds).with_region(ecs_region).build()
        
        response = ecs_client.list_servers_details(ListServersDetailsRequest(limit=1))
        print(f"   ✓ ECS API works with BasicCredentials")
        print(f"   Found {len(response.servers or [])} servers")
        return True
        
    except Exception as e:
        print(f"   ✗ BasicCredentials test failed: {type(e).__name__}: {str(e)}")
        return False

if __name__ == "__main__":
    print("RMS DEBUG TEST")
    print("=" * 60)
    
    # You'll need to provide AK/SK for testing
    # For now, just show the test structure
    print("To run this test, you need to:")
    print("1. Provide valid Huawei Cloud AK/SK")
    print("2. Ensure IAM user has RMS permissions")
    print("3. Check if RMS service is available in the region")
    print("\nCommon RMS permission policies:")
    print("  • RMS ReadOnlyAccess")
    print("  • RMS FullAccess")
    print("  • Tenant Administrator")
    print("\nWithout RMS, we fall back to individual service APIs (42% coverage)")