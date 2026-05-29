import logging
from typing import Dict, Any

from huaweicloudsdkcore.auth.credentials import BasicCredentials, GlobalCredentials
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkiam.v3 import IamClient, KeystoneListProjectsRequest
from huaweicloudsdkiam.v3.region.iam_region import IamRegion

from huaweicloudsdkecs.v2 import EcsClient, ListServersDetailsRequest
from huaweicloudsdkvpc.v2 import VpcClient, ListVpcsRequest, ListSubnetsRequest, ListSecurityGroupsRequest
from huaweicloudsdkrds.v3 import RdsClient, ListInstancesRequest

try:
    from huaweicloudsdknat.v2 import NatClient, ListNatGatewaysRequest
    from huaweicloudsdknat.v2.region.nat_region import NatRegion
    HAS_NAT = True
except ImportError:
    HAS_NAT = False

try:
    from huaweicloudsdkcbr.v3 import CbrClient, ListVaultsRequest
    from huaweicloudsdkcbr.v3.region.cbr_region import CbrRegion
    HAS_CBR = True
except ImportError:
    HAS_CBR = False

try:
    from huaweicloudsdkvpn.v5 import VpnClient, ListVpnGatewaysRequest, ListCustomerGatewaysRequest, ListVpnConnectionsRequest
    from huaweicloudsdkvpn.v5.region.vpn_region import VpnRegion
    HAS_VPN = True
except ImportError:
    HAS_VPN = False

try:
    from huaweicloudsdkeip.v2 import EipClient, ListPublicipsRequest
    from huaweicloudsdkeip.v2.region.eip_region import EipRegion
    HAS_EIP = True
except ImportError:
    HAS_EIP = False

try:
    from obs import ObsClient
    HAS_OBS = True
except ImportError:
    HAS_OBS = False

logger = logging.getLogger(__name__)

class HuaweiDiscovery:
    def __init__(self, encrypted_ak_data: Any, encrypted_sk_data: Any, region: str, master_password: str):
        self.regions = [r.strip() for r in str(region).split(',')] if region else ['la-south-2']
        ak_str = str(encrypted_ak_data).strip()
        sk_str = str(encrypted_sk_data).strip()

        if not ak_str.startswith('{') and len(ak_str) > 5:
            self.raw_ak = ak_str; self.raw_sk = sk_str
        else:
            try:
                from services.credential_manager import get_credential_manager
                self.raw_ak, self.raw_sk = get_credential_manager(master_password).decrypt_credentials({
                    'encrypted_ak': encrypted_ak_data, 'encrypted_sk': encrypted_sk_data
                })
            except Exception as e:
                logger.error(f"Failed to decrypt vault: {str(e)}")
                raise ValueError("Invalid vault credentials format.")

        self.project_ids = {}
        try:
            global_creds = GlobalCredentials(self.raw_ak, self.raw_sk)
            iam_client = IamClient.new_builder().with_credentials(global_creds).with_region(IamRegion.value_of("ap-southeast-1")).build()
            projects_res = iam_client.keystone_list_projects(KeystoneListProjectsRequest())
            if projects_res.projects:
                for p in projects_res.projects:
                    self.project_ids[p.name] = p.id
            logger.info(f"Successfully mapped {len(self.project_ids)} Project IDs from IAM.")
        except Exception as e:
            logger.warning(f"Failed to auto-resolve Project IDs via IAM: {str(e)}")

    def discover_all(self) -> Dict[str, Any]:
        inventory = { "compute": [], "network": [], "databases": [], "storage": [], "summary": {"total_vcpus": 0, "total_ram_gb": 0} }

        try:
            for target_region in self.regions:
                target_project_id = self.project_ids.get(target_region)
                if not target_project_id: continue

                region_creds = BasicCredentials(self.raw_ak, self.raw_sk, target_project_id)
                
                # 1. COMPUTE
                from huaweicloudsdkecs.v2.region.ecs_region import EcsRegion
                ecs_client = EcsClient.new_builder().with_credentials(region_creds).with_region(EcsRegion.value_of(target_region)).build()
                ecs_res = ecs_client.list_servers_details(ListServersDetailsRequest(limit=100))
                if ecs_res.servers:
                    for s in ecs_res.servers:
                        inventory["compute"].append({ "id": s.id, "name": s.name, "type": "ECS", "status": s.status, "flavor": s.flavor.name, "vcpus": int(s.flavor.vcpus), "ram_gb": int(s.flavor.ram)/1024, "os_type": s.metadata.get('os_type', 'Unknown'), "region": target_region })

                # 2. DATABASES
                from huaweicloudsdkrds.v3.region.rds_region import RdsRegion
                rds_client = RdsClient.new_builder().with_credentials(region_creds).with_region(RdsRegion.value_of(target_region)).build()
                rds_res = rds_client.list_instances(ListInstancesRequest())
                if rds_res.instances:
                    for db in rds_res.instances:
                        inventory["databases"].append({ "id": db.id, "name": db.name, "type": "RDS", "engine": db.datastore.type, "version": db.datastore.version, "status": db.status, "volume_gb": db.volume.size, "region": target_region })

                # 3. NETWORK CORE (VPC, Subnets, SG)
                from huaweicloudsdkvpc.v2.region.vpc_region import VpcRegion
                vpc_client = VpcClient.new_builder().with_credentials(region_creds).with_region(VpcRegion.value_of(target_region)).build()
                
                for vpc in vpc_client.list_vpcs(ListVpcsRequest(limit=100)).vpcs or []:
                    inventory["network"].append({"id": vpc.id, "name": vpc.name, "type": "VPC", "cidr": vpc.cidr, "status": vpc.status, "region": target_region})
                for sub in vpc_client.list_subnets(ListSubnetsRequest(limit=100)).subnets or []:
                    inventory["network"].append({"id": sub.id, "name": sub.name, "type": "Subnet", "cidr": sub.cidr, "status": sub.status, "region": target_region})
                for sg in vpc_client.list_security_groups(ListSecurityGroupsRequest(limit=100)).security_groups or []:
                    inventory["network"].append({"id": sg.id, "name": sg.name, "type": "SG", "cidr": "N/A", "status": "Active", "region": target_region})

                # 4. EDGE GATEWAYS (NAT, EIP, VPN, Customer Gateways)
                if HAS_NAT:
                    nat_client = NatClient.new_builder().with_credentials(region_creds).with_region(NatRegion.value_of(target_region)).build()
                    for nat in nat_client.list_nat_gateways(ListNatGatewaysRequest(limit=100)).nat_gateways or []:
                        inventory["network"].append({"id": nat.id, "name": nat.name, "type": "NAT Gateway", "cidr": "N/A", "status": nat.status, "region": target_region})

                if HAS_EIP:
                    eip_client = EipClient.new_builder().with_credentials(region_creds).with_region(EipRegion.value_of(target_region)).build()
                    for eip in eip_client.list_publicips(ListPublicipsRequest(limit=100)).publicips or []:
                        inventory["network"].append({"id": eip.id, "name": eip.alias or eip.public_ip_address, "type": "EIP", "cidr": eip.public_ip_address, "status": eip.status, "region": target_region})

                if HAS_VPN:
                    vpn_client = VpnClient.new_builder().with_credentials(region_creds).with_region(VpnRegion.value_of(target_region)).build()
                    for vpn in vpn_client.list_vpn_gateways(ListVpnGatewaysRequest(limit=100)).vpn_gateways or []:
                        inventory["network"].append({"id": vpn.id, "name": vpn.name, "type": "Enterprise VPN Gateway", "cidr": "N/A", "status": vpn.status, "region": target_region})
                    for cgw in vpn_client.list_customer_gateways(ListCustomerGatewaysRequest(limit=100)).customer_gateways or []:
                        inventory["network"].append({"id": cgw.id, "name": cgw.name, "type": "Customer Gateway", "cidr": cgw.bgp_asn or 'N/A', "status": "Active", "region": target_region})
                    for conn in vpn_client.list_vpn_connections(ListVpnConnectionsRequest(limit=100)).vpn_connections or []:
                        inventory["network"].append({"id": conn.id, "name": conn.name, "type": "VPN Connection", "cidr": "N/A", "status": conn.status, "region": target_region})

                # 5. STORAGE & BACKUP (OBS & CBR)
                if HAS_CBR:
                    cbr_client = CbrClient.new_builder().with_credentials(region_creds).with_region(CbrRegion.value_of(target_region)).build()
                    for vault in cbr_client.list_vaults(ListVaultsRequest(limit=100)).vaults or []:
                        allocated = vault.billing.size if hasattr(vault, 'billing') and vault.billing else vault.size if hasattr(vault, 'size') else 0
                        used = vault.billing.used if hasattr(vault, 'billing') and vault.billing else vault.used if hasattr(vault, 'used') else 0
                        inventory["storage"].append({"id": vault.id, "name": vault.name, "type": "CBR", "location": target_region, "status": "Active", "size": allocated, "used": used})

            if HAS_OBS:
                obs_client = ObsClient(access_key_id=self.raw_ak, secret_access_key=self.raw_sk, server=f"obs.{self.regions[0]}.myhuaweicloud.com")
                resp = obs_client.listBuckets(True)
                if resp.status < 300:
                    for bucket in resp.body.buckets:
                        inventory["storage"].append({"id": bucket.name, "name": bucket.name, "type": "OBS", "location": bucket.location, "status": "Active", "size": "Dynamic"})

            return {"success": True, "inventory": inventory}
        except Exception as e:
            return {"success": False, "error": str(e)}
