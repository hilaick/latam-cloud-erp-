import logging
from typing import Dict, Any, List
from services.credential_manager import get_credential_manager

# Huawei Cloud SDK Imports
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkecs.v2 import EcsClient, ListServersDetailsRequest
from huaweicloudsdkvpc.v2 import VpcClient, ListVpcsRequest
from huaweicloudsdkrds.v3 import RdsClient, ListInstancesRequest

logger = logging.getLogger(__name__)

class HuaweiDiscovery:
    """
    Strictly Read-Only Discovery Engine for Huawei Cloud.
    Maps customer source environments safely to reduce discovery from 5 days to 15 minutes.
    """
    
    def __init__(self, encrypted_ak_data: dict, encrypted_sk_data: dict, region: str, master_password: str):
        self.region = region
        
        # 1. Safely decrypt credentials in memory
        cred_manager = get_credential_manager(master_password)
        
        # Assuming your credential manager returns the raw strings
        # Adjust this slightly based on your exact credential_manager.py decrypt method signature
        try:
            self.raw_ak, self.raw_sk = cred_manager.decrypt_credentials({
                'encrypted_ak': encrypted_ak_data,
                'encrypted_sk': encrypted_sk_data,
                # Include salt/nonce here depending on your exact AES-GCM implementation
            })
        except Exception as e:
            logger.error(f"Failed to decrypt customer vault credentials: {str(e)}")
            raise ValueError("Unauthorized: Invalid vault credentials.")

        # 2. Initialize strict Read-Only Credentials
        self.credentials = BasicCredentials(self.raw_ak, self.raw_sk)

    def _get_ecs_client(self):
        from huaweicloudsdkecs.v2.region.ecs_region import EcsRegion
        return EcsClient.new_builder() \
            .with_credentials(self.credentials) \
            .with_region(EcsRegion.value_of(self.region)) \
            .build()

    def _get_vpc_client(self):
        from huaweicloudsdkvpc.v2.region.vpc_region import VpcRegion
        return VpcClient.new_builder() \
            .with_credentials(self.credentials) \
            .with_region(VpcRegion.value_of(self.region)) \
            .build()

    def _get_rds_client(self):
        from huaweicloudsdkrds.v3.region.rds_region import RdsRegion
        return RdsClient.new_builder() \
            .with_credentials(self.credentials) \
            .with_region(RdsRegion.value_of(self.region)) \
            .build()

    def discover_all(self) -> Dict[str, Any]:
        """
        Executes the 15-minute automated discovery.
        Returns a structured inventory of Compute, Network, and Databases.
        """
        inventory = {
            "compute": [],
            "network": [],
            "databases": [],
            "summary": {"total_vcpus": 0, "total_ram_gb": 0}
        }

        try:
            # --- 1. DISCOVER COMPUTE (ECS) ---
            ecs_client = self._get_ecs_client()
            ecs_req = ListServersDetailsRequest(limit=100) # Pagination limit for safety
            ecs_res = ecs_client.list_servers_details(ecs_req)
            
            if ecs_res.servers:
                for server in ecs_res.servers:
                    inventory["compute"].append({
                        "id": server.id,
                        "name": server.name,
                        "status": server.status,
                        "flavor": server.flavor.name,
                        "vcpus": int(server.flavor.vcpus),
                        "ram_gb": int(server.flavor.ram) / 1024,
                        "os_type": server.metadata.get('os_type', 'Unknown')
                    })
                    inventory["summary"]["total_vcpus"] += int(server.flavor.vcpus)
                    inventory["summary"]["total_ram_gb"] += (int(server.flavor.ram) / 1024)

            # --- 2. DISCOVER NETWORK (VPC) ---
            vpc_client = self._get_vpc_client()
            vpc_req = ListVpcsRequest(limit=100)
            vpc_res = vpc_client.list_vpcs(vpc_req)
            
            if vpc_res.vpcs:
                for vpc in vpc_res.vpcs:
                    inventory["network"].append({
                        "id": vpc.id,
                        "name": vpc.name,
                        "cidr": vpc.cidr,
                        "status": vpc.status
                    })

            # --- 3. DISCOVER DATABASES (RDS) ---
            rds_client = self._get_rds_client()
            rds_req = ListInstancesRequest()
            rds_res = rds_client.list_instances(rds_req)
            
            if rds_res.instances:
                for db in rds_res.instances:
                    inventory["databases"].append({
                        "id": db.id,
                        "name": db.name,
                        "engine": db.datastore.type,
                        "version": db.datastore.version,
                        "status": db.status,
                        "volume_gb": db.volume.size
                    })

            return {"success": True, "inventory": inventory}

        except exceptions.ClientRequestException as e:
            logger.error(f"Huawei API Request Error: {e.status_code} - {e.error_msg}")
            return {"success": False, "error": f"API Error: {e.error_msg}"}
        except Exception as e:
            logger.error(f"Unexpected Discovery Error: {str(e)}")
            return {"success": False, "error": "Internal discovery engine failure."}