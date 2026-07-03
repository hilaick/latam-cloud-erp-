import json
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
    HAS_NAT = True
    NAT_ERR = ""
except Exception as e:
    HAS_NAT = False
    NAT_ERR = str(e)

try:
    from huaweicloudsdkcbr.v3 import CbrClient, ListVaultsRequest
    import huaweicloudsdkcbr.v3 as cbr_module
    HAS_CBR = True
    CBR_ERR = ""
except Exception as e:
    try:
        from huaweicloudsdkcbr.v2 import CbrClient, ListVaultsRequest
        import huaweicloudsdkcbr.v2 as cbr_module
        HAS_CBR = True
        CBR_ERR = ""
    except Exception as e2:
        try:
            from huaweicloudsdkcbr.v1 import CbrClient, ListVaultRequest
            import huaweicloudsdkcbr.v1 as cbr_module
            HAS_CBR = True
            CBR_ERR = ""
        except Exception as e3:
            HAS_CBR = False
            CBR_ERR = str(e)

try:
    from huaweicloudsdkvpn.v5 import VpnClient
    import huaweicloudsdkvpn.v5 as vpn_module
    HAS_VPN = True
    VPN_ERR = ""
except Exception as e:
    HAS_VPN = False
    VPN_ERR = str(e)

try:
    from huaweicloudsdkeip.v2 import EipClient, ListPublicipsRequest
    HAS_EIP = True
    EIP_ERR = ""
except Exception as e:
    HAS_EIP = False
    EIP_ERR = str(e)

try:
    from obs import ObsClient
    HAS_OBS = True
    OBS_ERR = ""
except Exception as e:
    HAS_OBS = False
    OBS_ERR = str(e)

logger = logging.getLogger(__name__)

class HuaweiDiscovery:
    def __init__(self, encrypted_ak_data: Any, encrypted_sk_data: Any, region: str, master_password: str):
        self.regions = [r.strip() for r in str(region).split(',')] if region else ['la-south-2']
        if encrypted_ak_data is None or encrypted_sk_data is None: 
            raise ValueError("AK/SK credentials are missing")
            
        ak_str = str(encrypted_ak_data).strip()
        sk_str = str(encrypted_sk_data).strip()
        
        if ak_str == 'None' or sk_str == 'None' or not ak_str or not sk_str: 
            raise ValueError("AK/SK credentials are empty")
        
        if ak_str.startswith('{') and len(ak_str) > 10:
            try:
                from services.credential_manager import get_credential_manager
                encrypted_data = json.loads(ak_str)
                self.raw_ak, self.raw_sk = get_credential_manager(master_password).decrypt_credentials(encrypted_data)
            except Exception as e:
                logger.error(f"Failed to decrypt vault: {str(e)}")
                raise ValueError(f"Invalid vault credentials format: {str(e)}")
        else:
            self.raw_ak = ak_str
            self.raw_sk = sk_str

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
                if not target_project_id: continue

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
                        
                        billing_mode = 'Unknown'
                        charging_mode = 'Unknown'
                        
                        if hasattr(s, 'metadata') and s.metadata:
                            try:
                                m = s.metadata if isinstance(s.metadata, dict) else s.metadata.__dict__
                                billing_mode = m.get('billing_mode', m.get('metering.billing_mode', m.get('metering.billingMode', 'Unknown')))
                                charging_mode = m.get('charging_mode', m.get('metering.charging_mode', m.get('metering.chargingMode', 'Unknown')))
                            except Exception:
                                pass
                        
                        is_reserved = False
                        if str(billing_mode) == '1' or str(charging_mode) == '1' or 'prepaid' in str(charging_mode).lower() or 'reserved' in str(billing_mode).lower() or 'reserved' in str(charging_mode).lower():
                            is_reserved = True
                            
                        flavor_id = 'Unknown'
                        if hasattr(s, 'flavor') and s.flavor:
                            if hasattr(s.flavor, 'id'): flavor_id = s.flavor.id
                            elif isinstance(s.flavor, dict): flavor_id = s.flavor.get('id', 'Unknown')
                        
                        # 🚨 FIX: Aggressively pull and parse tags for the FinOps Matrix
                        server_tags = {}
                        for tag_src in ['tags', 'sys_tags']:
                            tags_list = getattr(s, tag_src, [])
                            if not tags_list: continue
                            
                            for t in tags_list:
                                if isinstance(t, str):
                                    # Formats like "marked_for_deletion=true"
                                    if '=' in t:
                                        k, v = t.split('=', 1)
                                        server_tags[k.strip()] = v.strip()
                                    else:
                                        server_tags[t.strip()] = "true"
                                elif hasattr(t, 'key') and hasattr(t, 'value'):
                                    server_tags[str(t.key)] = str(t.value)
                                elif isinstance(t, dict):
                                    server_tags[str(t.get('key', ''))] = str(t.get('value', ''))
                        
                        inventory["compute"].append({ 
                            "id": s.id, 
                            "name": s.name, 
                            "type": "ECS", 
                            "private_ip_address": private_ip, 
                            "region": target_region,
                            "billing_mode": billing_mode,
                            "charging_mode": charging_mode,
                            "is_reserved_instance": is_reserved,
                            "flavor": flavor_id,
                            "tags": server_tags
                        })
                except Exception as e: 
                    inventory["diagnostics"].append(f"[{target_region}] ECS Connect Error: {str(e)}")

                # 2. DATABASES
                try:
                    rds_region = Region(id=target_region, endpoint=f"https://rds.{target_region}.myhuaweicloud.com")
                    rds_client = RdsClient.new_builder().with_credentials(region_creds).with_region(rds_region).build()
                    for db in rds_client.list_instances(ListInstancesRequest()).instances or []:
                        inventory["databases"].append({ "id": db.id, "name": getattr(db, 'name', 'Unknown'), "type": "RDS", "region": target_region })
                except Exception as e: 
                    inventory["diagnostics"].append(f"[{target_region}] RDS Connect Error: {str(e)}")

                # 3. NETWORK CORE
                try:
                    vpc_region = Region(id=target_region, endpoint=f"https://vpc.{target_region}.myhuaweicloud.com")
                    vpc_client = VpcClient.new_builder().with_credentials(region_creds).with_region(vpc_region).build()
                    for vpc in vpc_client.list_vpcs(ListVpcsRequest(limit=100)).vpcs or []: 
                        inventory["network"].append({"id": vpc.id, "name": vpc.name, "type": "VPC", "cidr": vpc.cidr, "status": vpc.status, "region": target_region})
                    for sub in vpc_client.list_subnets(ListSubnetsRequest(limit=100)).subnets or []: 
                        inventory["network"].append({"id": sub.id, "name": sub.name, "type": "Subnet", "cidr": sub.cidr, "status": sub.status, "region": target_region})
                    for sg in vpc_client.list_security_groups(ListSecurityGroupsRequest(limit=100)).security_groups or []: 
                        inventory["network"].append({"id": sg.id, "name": sg.name, "type": "SG", "region": target_region})
                except Exception as e: 
                    inventory["diagnostics"].append(f"[{target_region}] VPC Connect Error: {str(e)}")

                # 4. EDGE GATEWAYS
                if HAS_NAT:
                    try:
                        nat_region = Region(id=target_region, endpoint=f"https://nat.{target_region}.myhuaweicloud.com")
                        nat_client = NatClient.new_builder().with_credentials(region_creds).with_region(nat_region).build()
                        for nat in nat_client.list_nat_gateways(ListNatGatewaysRequest(limit=100)).nat_gateways or []: 
                            inventory["network"].append({"id": nat.id, "name": nat.name, "type": "NAT Gateway", "region": target_region})
                    except Exception as e: 
                        pass

                if HAS_EIP:
                    try:
                        eip_region = Region(id=target_region, endpoint=f"https://vpc.{target_region}.myhuaweicloud.com")
                        eip_client = EipClient.new_builder().with_credentials(region_creds).with_region(eip_region).build()
                        for eip in eip_client.list_publicips(ListPublicipsRequest(limit=100)).publicips or []: 
                            # Capture EIP binding status
                            port_id = getattr(eip, 'port_id', None)
                            is_bound = bool(port_id)
                            bound_to = None
                            bound_resource_id = None
                            bound_resource_name = None
                            
                            if is_bound:
                                # Try to determine what it's bound to
                                # Check if it's bound to an ECS
                                for server in inventory["compute"]:
                                    if server.get("private_ip_address") and hasattr(eip, 'private_ip_address'):
                                        if server["private_ip_address"] == eip.private_ip_address:
                                            bound_to = "ECS"
                                            bound_resource_id = server.get("id")
                                            bound_resource_name = server.get("name")
                                            break
                                # If not ECS, check other resources
                                if not bound_to:
                                    bound_to = "ELB/NAT/Gateway"
                            
                            # Calculate monthly cost estimate (approximate)
                            bandwidth_size = getattr(eip, 'bandwidth_size', 0)
                            monthly_cost_estimate = bandwidth_size * 0.1  # Approx $0.10 per Mbps/month
                            
                            inventory["network"].append({
                                "id": eip.id, 
                                "name": eip.alias or eip.public_ip_address, 
                                "type": "EIP", 
                                "public_ip_address": eip.public_ip_address, 
                                "region": target_region,
                                "port_id": port_id,
                                "is_bound": is_bound,
                                "bound_to": bound_to,
                                "bound_resource_id": bound_resource_id,
                                "bound_resource_name": bound_resource_name,
                                "status": getattr(eip, 'status', 'Unknown'),
                                "bandwidth_size": bandwidth_size,
                                "bandwidth_name": getattr(eip, 'bandwidth_name', 'Unknown'),
                                "created_at": getattr(eip, 'create_time', 'Unknown'),
                                "monthly_cost_estimate": round(monthly_cost_estimate, 2),
                                "is_unbound_risk": not is_bound and bandwidth_size > 0,
                                "risk_level": "HIGH" if not is_bound and bandwidth_size >= 100 else "MEDIUM" if not is_bound and bandwidth_size >= 50 else "LOW" if not is_bound else "NONE"
                            })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] EIP Error: {str(e)}")

                if HAS_VPN:
                    try:
                        vpn_region = Region(id=target_region, endpoint=f"https://vpn.{target_region}.myhuaweicloud.com")
                        vpn_client_class = getattr(vpn_module, 'VpnClient', None)
                        if vpn_client_class:
                            vpn_client = vpn_client_class.new_builder().with_credentials(region_creds).with_region(vpn_region).build()
                            vgw_class = getattr(vpn_module, 'ListVpnGatewaysRequest', getattr(vpn_module, 'ListVgwsRequest', None))
                            vgw_method = getattr(vpn_client, 'list_vpn_gateways', getattr(vpn_client, 'list_vgws', None))
                            if vgw_class and vgw_method:
                                res = vgw_method(vgw_class())
                                items = getattr(res, 'vpn_gateways', getattr(res, 'vgws', [])) or []
                                for v in items: 
                                    inventory["network"].append({"id": v.id, "name": v.name, "type": "Enterprise VPN Gateway", "region": target_region})
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] VPN Error: {str(e)}")

                if HAS_CBR:
                    try:
                        cbr_region = Region(id=target_region, endpoint=f"https://cbr.{target_region}.myhuaweicloud.com")
                        cbr_client_class = getattr(cbr_module, 'CbrClient', None)
                        if cbr_client_class:
                            cbr_client = cbr_client_class.new_builder().with_credentials(region_creds).with_region(cbr_region).build()
                            vaults_class = getattr(cbr_module, 'ListVaultsRequest', getattr(cbr_module, 'ListVaultRequest', None))
                            vaults_method = getattr(cbr_client, 'list_vaults', getattr(cbr_client, 'list_vault', None))
                            if vaults_class and vaults_method:
                                res = vaults_method(vaults_class())
                                items = getattr(res, 'vaults', getattr(res, 'vault', [])) or []
                                for vault in items: 
                                    inventory["storage"].append({"id": vault.id, "name": vault.name, "type": "CBR", "location": target_region })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] CBR Fetch Error: {str(e)}")

            if HAS_OBS:
                try:
                    obs_client = ObsClient(access_key_id=self.raw_ak, secret_access_key=self.raw_sk, server=f"obs.{self.regions[0]}.myhuaweicloud.com")
                    resp = obs_client.listBuckets(True)
                    if resp.status < 300:
                        for bucket in resp.body.buckets: 
                            inventory["storage"].append({"id": bucket.name, "name": bucket.name, "type": "OBS", "location": bucket.location })
                except Exception as e: 
                    inventory["diagnostics"].append(f"[Global] OBS Connect Error: {str(e)}")

            return {"success": True, "inventory": inventory}
        except Exception as e:
            return {"success": False, "error": str(e), "diagnostics": getattr(inventory, "diagnostics", [])}
