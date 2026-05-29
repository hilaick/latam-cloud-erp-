import logging
from typing import Dict, Any

from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkecs.v2 import EcsClient, ListServersDetailsRequest
from huaweicloudsdkvpc.v2 import VpcClient, ListVpcsRequest, ListSubnetsRequest, ListSecurityGroupsRequest
from huaweicloudsdkrds.v3 import RdsClient, ListInstancesRequest

# Dynamic Imports for Deep Infrastructure
try:
    from huaweicloudsdknat.v2 import NatClient, ListNatGatewaysRequest
    from huaweicloudsdknat.v2.region.nat_region import NatRegion
    HAS_NAT = True
except ImportError:
    HAS_NAT = False

try:
    from obs import ObsClient
    HAS_OBS = True
except ImportError:
    HAS_OBS = False

logger = logging.getLogger(__name__)

class HuaweiDiscovery:
    """
    Strictly Read-Only Discovery Engine for Huawei Cloud.
    Now includes Deep Networking (Subnets, SG, NAT) and Object Storage (OBS).
    """
    
    def __init__(self, encrypted_ak_data: Any, encrypted_sk_data: Any, region: str, master_password: str):
        self.region = region
        
        ak_str = str(encrypted_ak_data).strip()
        sk_str = str(encrypted_sk_data).strip()

        if not ak_str.startswith('{') and len(ak_str) > 5:
            self.raw_ak = ak_str
            self.raw_sk = sk_str
        else:
            try:
                from services.credential_manager import get_credential_manager
                cred_manager = get_credential_manager(master_password)
                self.raw_ak, self.raw_sk = cred_manager.decrypt_credentials({
                    'encrypted_ak': encrypted_ak_data,
                    'encrypted_sk': encrypted_sk_data,
                })
            except Exception as e:
                logger.error(f"Failed to decrypt customer vault credentials: {str(e)}")
                raise ValueError(f"Invalid vault credentials format. Details: {str(e)}")

        self.credentials = BasicCredentials(self.raw_ak, self.raw_sk)

    def _get_ecs_client(self):
        from huaweicloudsdkecs.v2.region.ecs_region import EcsRegion
        return EcsClient.new_builder().with_credentials(self.credentials).with_region(EcsRegion.value_of(self.region)).build()

    def _get_vpc_client(self):
        from huaweicloudsdkvpc.v2.region.vpc_region import VpcRegion
        return VpcClient.new_builder().with_credentials(self.credentials).with_region(VpcRegion.value_of(self.region)).build()

    def _get_rds_client(self):
        from huaweicloudsdkrds.v3.region.rds_region import RdsRegion
        return RdsClient.new_builder().with_credentials(self.credentials).with_region(RdsRegion.value_of(self.region)).build()

    def _get_nat_client(self):
        if not HAS_NAT: return None
        return NatClient.new_builder().with_credentials(self.credentials).with_region(NatRegion.value_of(self.region)).build()

    def discover_all(self) -> Dict[str, Any]:
        inventory = {
            "compute": [],
            "network": [],
            "databases": [],
            "storage": [],
            "summary": {"total_vcpus": 0, "total_ram_gb": 0}
        }

        try:
            # 1. COMPUTE (ECS)
            ecs_res = self._get_ecs_client().list_servers_details(ListServersDetailsRequest(limit=100))
            if ecs_res.servers:
                for server in ecs_res.servers:
                    inventory["compute"].append({
                        "id": server.id, "name": server.name, "type": "ECS", "status": server.status, 
                        "flavor": server.flavor.name, "vcpus": int(server.flavor.vcpus), 
                        "ram_gb": int(server.flavor.ram) / 1024, "os_type": server.metadata.get('os_type', 'Unknown')
                    })
                    inventory["summary"]["total_vcpus"] += int(server.flavor.vcpus)
                    inventory["summary"]["total_ram_gb"] += (int(server.flavor.ram) / 1024)

            # 2. DATABASES (RDS)
            rds_res = self._get_rds_client().list_instances(ListInstancesRequest())
            if rds_res.instances:
                for db in rds_res.instances:
                    inventory["databases"].append({
                        "id": db.id, "name": db.name, "type": "RDS", "engine": db.datastore.type, 
                        "version": db.datastore.version, "status": db.status, "volume_gb": db.volume.size
                    })

            # 3. DEEP NETWORKING (VPC, Subnets, SG, NAT)
            vpc_client = self._get_vpc_client()
            
            # VPCs
            vpc_res = vpc_client.list_vpcs(ListVpcsRequest(limit=100))
            if vpc_res.vpcs:
                for vpc in vpc_res.vpcs:
                    inventory["network"].append({"id": vpc.id, "name": vpc.name, "type": "VPC", "cidr": vpc.cidr, "status": vpc.status})

            # Subnets
            sub_res = vpc_client.list_subnets(ListSubnetsRequest(limit=100))
            if sub_res.subnets:
                for sub in sub_res.subnets:
                    inventory["network"].append({"id": sub.id, "name": sub.name, "type": "Subnet", "cidr": sub.cidr, "status": sub.status})

            # Security Groups
            sg_res = vpc_client.list_security_groups(ListSecurityGroupsRequest(limit=100))
            if sg_res.security_groups:
                for sg in sg_res.security_groups:
                    inventory["network"].append({"id": sg.id, "name": sg.name, "type": "Security Group", "cidr": "N/A", "status": "Active"})

            # NAT Gateways
            if HAS_NAT:
                nat_client = self._get_nat_client()
                nat_res = nat_client.list_nat_gateways(ListNatGatewaysRequest(limit=100))
                if nat_res.nat_gateways:
                    for nat in nat_res.nat_gateways:
                        inventory["network"].append({"id": nat.id, "name": nat.name, "type": "NAT Gateway", "cidr": "N/A", "status": nat.status})

            # 4. OBJECT STORAGE (OBS)
            if HAS_OBS:
                obs_client = ObsClient(access_key_id=self.raw_ak, secret_access_key=self.raw_sk, server=f"obs.{self.region}.myhuaweicloud.com")
                resp = obs_client.listBuckets(True)
                if resp.status < 300:
                    for bucket in resp.body.buckets:
                        inventory["storage"].append({"id": bucket.name, "name": bucket.name, "type": "OBS Bucket", "location": bucket.location})

            return {"success": True, "inventory": inventory}

        except exceptions.ClientRequestException as e:
            logger.error(f"Huawei API Request Error: {e.status_code} - {e.error_msg}")
            return {"success": False, "error": f"API Error: {e.error_msg}"}
        except Exception as e:
            logger.error(f"Unexpected Discovery Error: {str(e)}")
            return {"success": False, "error": "Internal discovery engine failure."}
