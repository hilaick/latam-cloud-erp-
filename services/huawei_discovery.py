import logging
from typing import Dict, Any

from huaweicloudsdkcore.auth.credentials import BasicCredentials, GlobalCredentials
from huaweicloudsdkcore.region.region import Region
from huaweicloudsdkiam.v3 import IamClient, KeystoneListProjectsRequest
from huaweicloudsdkiam.v3.region.iam_region import IamRegion

from huaweicloudsdkecs.v2 import EcsClient, ListServersDetailsRequest
from huaweicloudsdkvpc.v2 import VpcClient, ListVpcsRequest, ListSubnetsRequest, ListSecurityGroupsRequest
from huaweicloudsdkrds.v3 import RdsClient, ListInstancesRequest

try:
    from huaweicloudsdknat.v2 import NatClient, ListNatGatewaysRequest
    HAS_NAT = True; NAT_ERR = ""
except Exception as e:
    HAS_NAT = False; NAT_ERR = str(e)

try:
    from huaweicloudsdkeip.v2 import EipClient, ListPublicipsRequest
    HAS_EIP = True; EIP_ERR = ""
except Exception as e:
    HAS_EIP = False; EIP_ERR = str(e)

try:
    from obs import ObsClient
    HAS_OBS = True; OBS_ERR = ""
except Exception as e:
    HAS_OBS = False; OBS_ERR = str(e)

# 🚨 DYNAMIC CBR REFLECTION (Hunts for v3, v2, or v1)
HAS_CBR = False; CBR_ERR = ""; cbr_version = None; cbr_module = None
for v in ['v3', 'v2', 'v1']:
    try:
        cbr_module = __import__(f"huaweicloudsdkcbr.{v}", fromlist=['*'])
        cbr_version = v
        HAS_CBR = True
        break
    except ImportError as e:
        CBR_ERR = str(e)

# 🚨 DYNAMIC VPN REFLECTION (Extracts module without strict class names)
HAS_VPN = False; VPN_ERR = ""; vpn_module = None
try:
    vpn_module = __import__(f"huaweicloudsdkvpn.v5", fromlist=['*'])
    HAS_VPN = True
except ImportError as e:
    VPN_ERR = str(e)


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
        except Exception as e:
            logger.warning(f"Failed to auto-resolve Project IDs via IAM: {str(e)}")

    def discover_all(self) -> Dict[str, Any]:
        inventory = { "compute": [], "network": [], "databases": [], "storage": [], "diagnostics": [] }

        if not HAS_CBR: inventory["diagnostics"].append(f"CBR Module Failed: {CBR_ERR}")
        if not HAS_VPN: inventory["diagnostics"].append(f"VPN Module Failed: {VPN_ERR}")

        try:
            for target_region in self.regions:
                target_project_id = self.project_ids.get(target_region)
                if not target_project_id: 
                    inventory["diagnostics"].append(f"No IAM Project ID mapped for region: {target_region}")
                    continue

                region_creds = BasicCredentials(self.raw_ak, self.raw_sk, target_project_id)
                
                # 1. COMPUTE
                try:
                    ecs_region = Region(id=target_region, endpoint=f"https://ecs.{target_region}.myhuaweicloud.com")
                    ecs_client = EcsClient.new_builder().with_credentials(region_creds).with_region(ecs_region).build()
                    for s in ecs_client.list_servers_details(ListServersDetailsRequest(limit=100)).servers or []:
                        private_ip = 'N/A'
                        if getattr(s, 'addresses', None):
                            vals = list(s.addresses.values())
                            if vals and len(vals) > 0 and len(vals[0]) > 0:
                                private_ip = vals[0][0].get('addr', 'N/A') if isinstance(vals[0][0], dict) else getattr(vals[0][0], 'addr', 'N/A')
                        
                        f_name = s.flavor.name if getattr(s, 'flavor', None) else 'Unknown'
                        f_vcpus = int(s.flavor.vcpus) if getattr(s, 'flavor', None) and getattr(s.flavor, 'vcpus', None) else 0
                        f_ram = int(s.flavor.ram)/1024 if getattr(s, 'flavor', None) and getattr(s.flavor, 'ram', None) else 0
                        os_type = s.metadata.get('os_type', 'Unknown') if getattr(s, 'metadata', None) and isinstance(s.metadata, dict) else 'Unknown'
                        inventory["compute"].append({ "id": s.id, "name": s.name, "type": "ECS", "status": s.status, "flavor": f_name, "vcpus": f_vcpus, "ram_gb": f_ram, "os_type": os_type, "private_ip_address": private_ip, "region": target_region })
                except Exception as e: inventory["diagnostics"].append(f"[{target_region}] ECS Connect Error: {str(e)}")

                # 2. DATABASES
                try:
                    rds_region = Region(id=target_region, endpoint=f"https://rds.{target_region}.myhuaweicloud.com")
                    rds_client = RdsClient.new_builder().with_credentials(region_creds).with_region(rds_region).build()
                    for db in rds_client.list_instances(ListInstancesRequest()).instances or []:
                        private_ip = db.private_ips[0] if getattr(db, 'private_ips', None) and len(db.private_ips) > 0 else 'N/A'
                        d_type = db.datastore.type if getattr(db, 'datastore', None) else 'Unknown'
                        d_ver = db.datastore.version if getattr(db, 'datastore', None) else 'Unknown'
                        v_size = db.volume.size if getattr(db, 'volume', None) else 0
                        inventory["databases"].append({ "id": db.id, "name": db.name, "type": "RDS", "engine": d_type, "version": d_ver, "status": db.status, "private_ip_address": private_ip, "volume_gb": v_size, "region": target_region })
                except Exception as e: inventory["diagnostics"].append(f"[{target_region}] RDS Connect Error: {str(e)}")

                # 3. NETWORK CORE
                try:
                    vpc_region = Region(id=target_region, endpoint=f"https://vpc.{target_region}.myhuaweicloud.com")
                    vpc_client = VpcClient.new_builder().with_credentials(region_creds).with_region(vpc_region).build()
                    for vpc in vpc_client.list_vpcs(ListVpcsRequest(limit=100)).vpcs or []: inventory["network"].append({"id": vpc.id, "name": vpc.name, "type": "VPC", "cidr": vpc.cidr, "status": vpc.status, "region": target_region})
                    for sub in vpc_client.list_subnets(ListSubnetsRequest(limit=100)).subnets or []: inventory["network"].append({"id": sub.id, "name": sub.name, "type": "Subnet", "cidr": sub.cidr, "vpc_id": getattr(sub, 'vpc_id', ''), "status": sub.status, "region": target_region})
                    for sg in vpc_client.list_security_groups(ListSecurityGroupsRequest(limit=100)).security_groups or []: inventory["network"].append({"id": sg.id, "name": sg.name, "type": "SG", "cidr": "N/A", "status": "Active", "region": target_region})
                except Exception as e: inventory["diagnostics"].append(f"[{target_region}] VPC Connect Error: {str(e)}")

                # 4. EDGE GATEWAYS
                if HAS_NAT:
                    try:
                        nat_region = Region(id=target_region, endpoint=f"https://nat.{target_region}.myhuaweicloud.com")
                        nat_client = NatClient.new_builder().with_credentials(region_creds).with_region(nat_region).build()
                        for nat in nat_client.list_nat_gateways(ListNatGatewaysRequest(limit=100)).nat_gateways or []: inventory["network"].append({"id": nat.id, "name": nat.name, "type": "NAT Gateway", "cidr": "N/A", "status": nat.status, "region": target_region})
                    except Exception as e: pass

                if HAS_EIP:
                    try:
                        eip_region = Region(id=target_region, endpoint=f"https://vpc.{target_region}.myhuaweicloud.com")
                        eip_client = EipClient.new_builder().with_credentials(region_creds).with_region(eip_region).build()
                        for eip in eip_client.list_publicips(ListPublicipsRequest(limit=100)).publicips or []: inventory["network"].append({"id": eip.id, "name": eip.alias or eip.public_ip_address, "type": "EIP", "public_ip_address": eip.public_ip_address, "status": eip.status, "region": target_region})
                    except Exception as e: pass

                # 🚨 DEEP REFLECTION FOR VPN
                if HAS_VPN:
                    try:
                        vpn_region = Region(id=target_region, endpoint=f"https://vpn.{target_region}.myhuaweicloud.com")
                        vpn_client_class = getattr(vpn_module, 'VpnClient', None)
                        if vpn_client_class:
                            vpn_client = vpn_client_class.new_builder().with_credentials(region_creds).with_region(vpn_region).build()
                            
                            vgw_class = getattr(vpn_module, 'ListVpnGatewaysRequest', getattr(vpn_module, 'ListVgwsRequest', None))
                            vgw_method = getattr(vpn_client, 'list_vpn_gateways', getattr(vpn_client, 'list_vgws', None))
                            if vgw_class and vgw_method:
                                try:
                                    res = vgw_method(vgw_class())
                                    items = getattr(res, 'vpn_gateways', getattr(res, 'vgws', [])) or []
                                    for v in items: inventory["network"].append({"id": v.id, "name": v.name, "type": "Enterprise VPN Gateway", "cidr": "N/A", "status": v.status, "region": target_region})
                                except Exception as e: inventory["diagnostics"].append(f"[{target_region}] VPN Gateway Fetch Error: {str(e)}")

                            cgw_class = getattr(vpn_module, 'ListCustomerGatewaysRequest', getattr(vpn_module, 'ListCgwsRequest', None))
                            cgw_method = getattr(vpn_client, 'list_customer_gateways', getattr(vpn_client, 'list_cgws', None))
                            if cgw_class and cgw_method:
                                try:
                                    res = cgw_method(cgw_class())
                                    items = getattr(res, 'customer_gateways', getattr(res, 'cgws', [])) or []
                                    for c in items: inventory["network"].append({"id": c.id, "name": c.name, "type": "Customer Gateway", "cidr": getattr(c, 'bgp_asn', 'N/A') or 'N/A', "status": "Active", "region": target_region})
                                except Exception as e: inventory["diagnostics"].append(f"[{target_region}] CGW Fetch Error: {str(e)}")

                            conn_class = getattr(vpn_module, 'ListVpnConnectionsRequest', getattr(vpn_module, 'ListIpsecConnectionsRequest', None))
                            conn_method = getattr(vpn_client, 'list_vpn_connections', getattr(vpn_client, 'list_ipsec_connections', None))
                            if conn_class and conn_method:
                                try:
                                    res = conn_method(conn_class())
                                    items = getattr(res, 'vpn_connections', getattr(res, 'ipsec_connections', [])) or []
                                    for conn in items: inventory["network"].append({"id": conn.id, "name": conn.name, "type": "VPN Connection", "cidr": "N/A", "status": conn.status, "region": target_region})
                                except Exception as e: inventory["diagnostics"].append(f"[{target_region}] VPN Conn Fetch Error: {str(e)}")
                    except Exception as e: inventory["diagnostics"].append(f"[{target_region}] VPN Client Build Error: {str(e)}")

                # 🚨 DEEP REFLECTION FOR CBR (USING THE V1 DIAGNOSTIC CLUE)
                if HAS_CBR:
                    try:
                        cbr_region = Region(id=target_region, endpoint=f"https://cbr.{target_region}.myhuaweicloud.com")
                        cbr_client_class = getattr(cbr_module, 'CbrClient', None)
                        if cbr_client_class:
                            cbr_client = cbr_client_class.new_builder().with_credentials(region_creds).with_region(cbr_region).build()
                            
                            # Specifically hunt for the singular ListVaultRequest as logged by the UI
                            vaults_class = getattr(cbr_module, 'ListVaultsRequest', getattr(cbr_module, 'ListVaultRequest', None))
                            vaults_method = getattr(cbr_client, 'list_vaults', getattr(cbr_client, 'list_vault', None))
                            
                            if vaults_class and vaults_method:
                                try:
                                    res = vaults_method(vaults_class())
                                    # Handle both singular and plural response arrays
                                    items = getattr(res, 'vaults', getattr(res, 'vault', [])) or []
                                    for vault in items:
                                        allocated = vault.billing.size if hasattr(vault, 'billing') and vault.billing else getattr(vault, 'size', 0)
                                        used = vault.billing.used if hasattr(vault, 'billing') and vault.billing else getattr(vault, 'used', 0)
                                        inventory["storage"].append({"id": vault.id, "name": vault.name, "type": "CBR", "location": target_region, "status": "Active", "size": allocated, "used": used})
                                except Exception as e: inventory["diagnostics"].append(f"[{target_region}] CBR Fetch Error: {str(e)}")
                            else:
                                inventory["diagnostics"].append(f"Could not find ListVaultsRequest/ListVaultRequest in {cbr_version}")
                    except Exception as e: inventory["diagnostics"].append(f"[{target_region}] CBR Client Build Error: {str(e)}")

            if HAS_OBS:
                try:
                    obs_client = ObsClient(access_key_id=self.raw_ak, secret_access_key=self.raw_sk, server=f"obs.{self.regions[0]}.myhuaweicloud.com")
                    resp = obs_client.listBuckets(True)
                    if resp.status < 300:
                        for bucket in resp.body.buckets: inventory["storage"].append({"id": bucket.name, "name": bucket.name, "type": "OBS", "location": bucket.location, "status": "Active", "size": "Dynamic"})
                except Exception as e: inventory["diagnostics"].append(f"[Global] OBS Connect Error: {str(e)}")

            return {"success": True, "inventory": inventory}
        except Exception as e:
            return {"success": False, "error": str(e), "diagnostics": getattr(inventory, "diagnostics", [])}
