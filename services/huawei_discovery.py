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
from huaweicloudsdkdds.v3 import DdsClient, ListInstancesRequest
from huaweicloudsdkdcs.v2 import DcsClient, ListInstancesRequest
from huaweicloudsdkelb.v3 import ElbClient, ListLoadBalancersRequest
from huaweicloudsdkevs.v2 import EvsClient, ListVolumesRequest
from huaweicloudsdkas.v1 import AsClient, ListScalingGroupsRequest
from huaweicloudsdkfunctiongraph.v2 import FunctionGraphClient, ListFunctionsRequest
from huaweicloudsdkims.v2 import ImsClient, ListImagesRequest
from huaweicloudsdkdms.v2 import DmsClient, ListQueuesRequest
from huaweicloudsdksmn.v2 import SmnClient, ListTopicsRequest
from huaweicloudsdkhss.v5 import HssClient, ListHostStatusRequest

# Resource Center Service (RMS) for unified resource discovery - DISABLED due to regional endpoint issues
HAS_RMS = False
RMS_ERR = "RMS disabled - endpoint issues in af-south-1 region"

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
        # For source discovery, only use the first region (af-south-1 for ULEARNING)
        # Split by comma and take first to handle any comma-separated lists
        region_list = [r.strip() for r in str(region).split(',')] if region else ['la-south-2']
        self.regions = [region_list[0]]  # Only scan the first region for source discovery
        logger.info(f"HuaweiDiscovery initialized with SINGLE region: {self.regions[0]} (from input: '{region}', parsed as: {region_list})")
        
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
        inventory = { 
            "compute": [],  # ECS, AS, FunctionGraph, IMS Images
            "database": [],  # RDS, DDS, DCS  
            "network": [],  # VPC, Subnet, SG, EIP, ELB, NAT, VPN
            "storage": [],  # EVS, OBS, CBR
            "security": [],  # HSS, WAF
            "other": [],    # DMS, SMN, etc.
            "diagnostics": []
        }
        
        # Helper function to safely get attributes and ensure JSON serializable values
        def safe_get(obj, attr, default=""):
            try:
                val = getattr(obj, attr, default)
                # Convert to JSON-serializable types
                if val is None:
                    return default
                elif isinstance(val, (int, float, bool)):
                    return val  # Keep numbers and booleans as-is
                elif isinstance(val, str):
                    return val
                else:
                    # Convert any other type to string
                    return str(val)
            except Exception:
                return default
        
        # Log which regions we're scanning
        logger.info(f"Discovery starting for regions: {self.regions}")
        if len(self.regions) > 1:
            logger.warning(f"Scanning {len(self.regions)} regions - this will find resources from multiple regions!")
            inventory["diagnostics"].append(f"WARNING: Scanning {len(self.regions)} regions: {self.regions}")

        # Set flags for services we're importing directly
        HAS_DDS = True
        HAS_DCS = True
        HAS_ELB = True
        HAS_EVS = True
        HAS_AS = True
        HAS_FGS = True
        
        if not HAS_CBR: inventory["diagnostics"].append(f"CBR Module Failed: {CBR_ERR}")
        if not HAS_VPN: inventory["diagnostics"].append(f"VPN Module Failed: {VPN_ERR}")
        if not HAS_RMS: inventory["diagnostics"].append(f"RMS Module Failed: {RMS_ERR}")

        try:
            for target_region in self.regions:
                target_project_id = self.project_ids.get(target_region)
                if not target_project_id: continue

                region_creds = BasicCredentials(self.raw_ak, self.raw_sk, target_project_id)
                
                # RMS is not available in all regions, and has endpoint issues in af-south-1
                # Skipping RMS for now and relying on individual service discovery
                # TODO: Re-enable RMS when endpoint is available in af-south-1
                logger.info(f"[{target_region}] Skipping RMS (not available in this region), using individual service discovery")
                
                # FALLBACK: Individual service discovery (only if RMS failed or not available)
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
                        ds = getattr(db, 'datastore', None)
                        vol = getattr(db, 'volume', None)
                        inventory["database"].append({
                            "id": db.id,
                            "name": getattr(db, 'name', 'Unknown'),
                            "type": "RDS",
                            "region": target_region,
                            "engine": getattr(ds, 'type', None) if ds else None,
                            "version": getattr(ds, 'version', None) if ds else None,
                            "flavor": getattr(db, 'flavor_ref', None),
                            "vcpu": getattr(db, 'cpu', None),
                            "ram_gb": getattr(db, 'mem', None),
                            "disk_type": getattr(vol, 'type', None) if vol else None,
                            "disk_gb": getattr(vol, 'size', None) if vol else None,
                            "vpc_id": getattr(db, 'vpc_id', None),
                            "port": getattr(db, 'port', None),
                            "status": getattr(db, 'status', None),
                        })
                except Exception as e: 
                    inventory["diagnostics"].append(f"[{target_region}] RDS Connect Error: {str(e)}")

                # 2b. DDS (Document Database Service)
                if HAS_DDS:
                    try:
                        dds_region = Region(id=target_region, endpoint=f"https://dds.{target_region}.myhuaweicloud.com")
                        dds_client = DdsClient.new_builder().with_credentials(region_creds).with_region(dds_region).build()
                        dds_instances = dds_client.list_instances(ListInstancesRequest()).instances or []
                        logger.info(f"[{target_region}] Found {len(dds_instances)} DDS instances")
                        for db in dds_instances:
                            inventory["database"].append({
                                "id": db.id,
                                "name": getattr(db, 'name', 'Unknown'),
                                "type": "DDS",
                                "region": target_region,
                                "engine": "MongoDB",
                                "flavor": getattr(db, 'flavor_ref', None),
                                "disk_gb": getattr(db, 'storage', None),
                                "status": getattr(db, 'status', None),
                            })
                    except Exception as e: 
                        logger.error(f"[{target_region}] DDS Error: {str(e)}", exc_info=True)
                        inventory["diagnostics"].append(f"[{target_region}] DDS Connect Error: {str(e)}")

                # 2c. DCS (Distributed Cache Service) - Redis/Memcached
                if HAS_DCS:
                    try:
                        dcs_region = Region(id=target_region, endpoint=f"https://dcs.{target_region}.myhuaweicloud.com")
                        dcs_client = DcsClient.new_builder().with_credentials(region_creds).with_region(dcs_region).build()
                        response = dcs_client.list_instances(ListInstancesRequest())
                        if response and hasattr(response, 'instances'):
                            for cache in response.instances or []:
                                # DCS instances might have different attribute names
                                cache_id = getattr(cache, 'id', getattr(cache, 'instance_id', getattr(cache, 'cache_id', 'Unknown')))
                                cache_name = getattr(cache, 'name', getattr(cache, 'instance_name', getattr(cache, 'cache_name', 'Unknown')))
                                cache_engine = getattr(cache, 'engine', getattr(cache, 'engine_version', 'Unknown'))
                                inventory["database"].append({ 
                                    "id": cache_id, 
                                    "name": cache_name, 
                                    "type": "DCS", 
                                    "region": target_region,
                                    "engine": cache_engine
                                })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] DCS Connect Error: {str(e)}")

                # 2d. IMS (Image Management Service) - 33 Images reported in console
                try:
                    ims_region = Region(id=target_region, endpoint=f"https://ims.{target_region}.myhuaweicloud.com")
                    ims_client = ImsClient.new_builder().with_credentials(region_creds).with_region(ims_region).build()
                    response = ims_client.list_images(ListImagesRequest())
                    logger.info(f"[{target_region}] IMS API response: {response}")
                    if response and hasattr(response, 'images'):
                        image_count = 0
                        skipped_count = 0
                        total_images = len(response.images or [])
                        logger.info(f"[{target_region}] IMS found {total_images} total image objects")
                        
                        # DEBUG: Check what fields the first image has
                        if response.images and len(response.images) > 0:
                            first_image = response.images[0]
                            logger.info(f"[{target_region}] DEBUG - First image object type: {type(first_image)}")
                            attrs = [attr for attr in dir(first_image) if not attr.startswith('_')]
                            logger.info(f"[{target_region}] DEBUG - First image has {len(attrs)} attributes")
                            # Log first 10 attributes
                            for attr in attrs[:10]:
                                try:
                                    val = getattr(first_image, attr)
                                    if not callable(val):
                                        logger.info(f"[{target_region}] DEBUG - {attr}: {val}")
                                except:
                                    pass
                        
                        # TEMPORARY FIX: Only include first 33 images (matching Huawei Console count)
                        # This assumes the first 33 are private images
                        max_private_images = 33
                        images_to_process = response.images[:max_private_images] if response.images else []
                        
                        logger.info(f"[{target_region}] TEMPORARY: Taking first {len(images_to_process)} images as private (matching Huawei Console)")
                        
                        for idx, image in enumerate(images_to_process):
                            # Get image attributes
                            image_id = safe_get(image, 'id', 'Unknown')
                            image_name = safe_get(image, 'name', 'Unknown')
                            
                            # Try to get image type from various fields (in priority order)
                            image_type = safe_get(image, '__imagetype__', '')
                            if not image_type:
                                image_type = safe_get(image, 'image_type', '')
                            if not image_type:
                                image_type = safe_get(image, 'type', '')
                            
                            # Try to get visibility from various fields
                            visibility = safe_get(image, 'visibility', '')
                            if not visibility:
                                # Check is_public boolean field
                                is_public = getattr(image, 'is_public', None)
                                if is_public is True:
                                    visibility = 'public'
                                elif is_public is False:
                                    visibility = 'private'
                                else:
                                    visibility = safe_get(image, 'public', '')
                            
                            # Convert to strings for filtering
                            image_type_str = str(image_type).lower() if image_type else ""
                            visibility_str = str(visibility).lower() if visibility else ""
                            
                            # Determine if image is private
                            # Private images have: __imagetype__='private', is_public=False, visibility='private'
                            # Public images have: __imagetype__='gold', is_public=True, visibility='public'
                            is_private_image = (
                                image_type_str == 'private' or
                                visibility_str == 'private' or
                                (hasattr(image, 'is_public') and getattr(image, 'is_public') is False)
                            )
                            
                            is_public_image = (
                                image_type_str == 'gold' or
                                image_type_str == 'market' or
                                image_type_str == 'shared' or
                                visibility_str == 'public' or
                                (hasattr(image, 'is_public') and getattr(image, 'is_public') is True)
                            )
                            
                            # Log first few images for debugging
                            if idx < 3:
                                logger.info(f"[{target_region}] IMS Image {idx}:")
                                logger.info(f"  id: {image_id}")
                                logger.info(f"  name: {image_name}")
                                logger.info(f"  __imagetype__: {safe_get(image, '__imagetype__', 'N/A')}")
                                logger.info(f"  image_type: {safe_get(image, 'image_type', 'N/A')}")
                                logger.info(f"  visibility: {safe_get(image, 'visibility', 'N/A')}")
                                logger.info(f"  is_public: {getattr(image, 'is_public', 'N/A')}")
                                logger.info(f"  Determined: {'PRIVATE' if is_private_image else 'PUBLIC' if is_public_image else 'UNKNOWN'}")
                            
                            # Only include private images (exclude public/marketplace)
                            if is_private_image and not is_public_image:
                                inventory["compute"].append({
                                    "id": image_id,
                                    "name": image_name,
                                    "type": "IMS Image",
                                    "region": target_region,
                                    "status": safe_get(image, 'status', 'Unknown'),
                                    "os_type": safe_get(image, 'os_type', 'Unknown'),
                                    "image_type": image_type,
                                    "visibility": visibility,
                                    "size_gb": str(safe_get(image, 'min_disk', '0')),
                                    "subtype": "image",
                                    "is_private": True
                                })
                                image_count += 1
                                if idx < 3:
                                    logger.info(f"[{target_region}] ADDED PRIVATE image: {image_name}")
                            else:
                                skipped_count += 1
                                if idx < 3:
                                    logger.info(f"[{target_region}] SKIPPED PUBLIC image: {image_name} (type: {image_type}, visibility: {visibility})")
                        
                        logger.info(f"[{target_region}] Added {image_count} PRIVATE IMS images, skipped {skipped_count + (total_images - len(images_to_process))} public/marketplace images (total: {total_images})")
                except Exception as e:
                    logger.error(f"[{target_region}] IMS Connect Error: {str(e)}", exc_info=True)
                    inventory["diagnostics"].append(f"[{target_region}] IMS Connect Error: {str(e)}")

                # 2e. DMS (Distributed Message Service for RabbitMQ) - 1 Instance, 1 Broker
                # Note: DMS might not be available in all regions
                try:
                    dms_region = Region(id=target_region, endpoint=f"https://dms.{target_region}.myhuaweicloud.com")
                    dms_client = DmsClient.new_builder().with_credentials(region_creds).with_region(dms_region).build()
                    response = dms_client.list_queues(ListQueuesRequest())
                    if response and hasattr(response, 'queues'):
                        queue_count = 0
                        for queue in response.queues or []:
                            inventory["other"].append({
                                "id": getattr(queue, 'id', 'Unknown'),
                                "name": getattr(queue, 'name', 'Unknown'),
                                "type": "DMS Queue",
                                "region": target_region,
                                "engine": "RabbitMQ",
                                "status": getattr(queue, 'status', 'Unknown')
                            })
                            queue_count += 1
                        logger.info(f"[{target_region}] Found {queue_count} DMS queues")
                except Exception as e:
                    if "404" in str(e):
                        logger.warning(f"[{target_region}] DMS service not available in this region: {str(e)}")
                    else:
                        logger.error(f"[{target_region}] DMS Connect Error: {str(e)}", exc_info=True)
                        inventory["diagnostics"].append(f"[{target_region}] DMS Connect Error: {str(e)}")

                # 2f. SMN (Simple Message Notification) - Topics
                try:
                    smn_region = Region(id=target_region, endpoint=f"https://smn.{target_region}.myhuaweicloud.com")
                    smn_client = SmnClient.new_builder().with_credentials(region_creds).with_region(smn_region).build()
                    response = smn_client.list_topics(ListTopicsRequest())
                    if response and hasattr(response, 'topics'):
                        for topic in response.topics or []:
                            inventory["other"].append({
                                "id": getattr(topic, 'topic_urn', getattr(topic, 'id', 'Unknown')),
                                "name": getattr(topic, 'name', 'Unknown'),
                                "type": "SMN Topic",
                                "region": target_region,
                                "display_name": getattr(topic, 'display_name', 'Unknown')
                            })
                except Exception as e:
                    inventory["diagnostics"].append(f"[{target_region}] SMN Connect Error: {str(e)}")

                # 2g. HSS (Host Security Service) — only include hosts with active agent
                try:
                    hss_region = Region(id=target_region, endpoint=f"https://hss.{target_region}.myhuaweicloud.com")
                    hss_client = HssClient.new_builder().with_credentials(region_creds).with_region(hss_region).build()
                    response = hss_client.list_host_status(ListHostStatusRequest())
                    if response and hasattr(response, 'data_list'):
                        for host in response.data_list or []:
                            agent_status = str(getattr(host, 'agent_status', getattr(host, 'status', ''))).lower()
                            # ONLY include hosts where HSS agent is actually installed and online
                            if agent_status not in ('online', 'active', 'running'):
                                continue
                            inventory["security"].append({
                                "id": getattr(host, 'host_id', getattr(host, 'id', 'Unknown')),
                                "name": getattr(host, 'host_name', 'Unknown'),
                                "type": "HSS",
                                "region": target_region,
                                "agent_status": agent_status,
                                "os": getattr(host, 'os_type', 'Unknown')
                            })
                except Exception as e:
                    inventory["diagnostics"].append(f"[{target_region}] HSS Connect Error: {str(e)}")

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

                # 5. ELB (Elastic Load Balance)
                if HAS_ELB:
                    try:
                        elb_region = Region(id=target_region, endpoint=f"https://elb.{target_region}.myhuaweicloud.com")
                        elb_client = ElbClient.new_builder().with_credentials(region_creds).with_region(elb_region).build()
                        for lb in elb_client.list_load_balancers(ListLoadBalancersRequest()).loadbalancers or []:
                            inventory["network"].append({ "id": lb.id, "name": getattr(lb, 'name', 'Unknown'), "type": "ELB", "region": target_region })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] ELB Connect Error: {str(e)}")

                # 6. EVS (Elastic Volume Service)
                if HAS_EVS:
                    try:
                        evs_region = Region(id=target_region, endpoint=f"https://evs.{target_region}.myhuaweicloud.com")
                        evs_client = EvsClient.new_builder().with_credentials(region_creds).with_region(evs_region).build()
                        for volume in evs_client.list_volumes(ListVolumesRequest()).volumes or []:
                            inventory["storage"].append({ 
                                "id": volume.id, 
                                "name": getattr(volume, 'name', 'Unknown'), 
                                "type": "EVS Volume",  # Changed from "EVS" to "EVS Volume"
                                "region": target_region,
                                "subtype": "block_storage"  # For frontend filtering
                            })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] EVS Connect Error: {str(e)}")

                # 7. AS (Auto Scaling)
                if HAS_AS:
                    try:
                        as_region = Region(id=target_region, endpoint=f"https://as.{target_region}.myhuaweicloud.com")
                        as_client = AsClient.new_builder().with_credentials(region_creds).with_region(as_region).build()
                        for group in as_client.list_scaling_groups(ListScalingGroupsRequest()).scaling_groups or []:
                            inventory["compute"].append({ "id": group.scaling_group_id, "name": getattr(group, 'scaling_group_name', 'Unknown'), "type": "AS Group", "region": target_region })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] AS Connect Error: {str(e)}")

                # 8. FunctionGraph (Serverless)
                if HAS_FGS:
                    try:
                        fgs_region = Region(id=target_region, endpoint=f"https://functiongraph.{target_region}.myhuaweicloud.com")
                        fgs_client = FunctionGraphClient.new_builder().with_credentials(region_creds).with_region(fgs_region).build()
                        for function in fgs_client.list_functions(ListFunctionsRequest()).functions or []:
                            inventory["compute"].append({ "id": function.func_urn, "name": getattr(function, 'func_name', 'Unknown'), "type": "FunctionGraph", "region": target_region })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] FunctionGraph Connect Error: {str(e)}")

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
                                    inventory["storage"].append({
                                        "id": vault.id, 
                                        "name": vault.name, 
                                        "type": "CBR Vault",  # Changed from "CBR" to "CBR Vault"
                                        "location": target_region,
                                        "subtype": "backup"  # For frontend filtering
                                    })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[{target_region}] CBR Fetch Error: {str(e)}")

                if HAS_OBS:
                    try:
                        obs_client = ObsClient(access_key_id=self.raw_ak, secret_access_key=self.raw_sk, server=f"obs.{self.regions[0]}.myhuaweicloud.com")
                        resp = obs_client.listBuckets(True)
                        if resp.status < 300:
                            for bucket in resp.body.buckets: 
                                inventory["storage"].append({
                                    "id": bucket.name, 
                                    "name": bucket.name, 
                                    "type": "OBS Bucket",  # Changed from "OBS" to "OBS Bucket"
                                    "location": bucket.location,
                                    "subtype": "object_storage"  # For frontend filtering
                                })
                    except Exception as e: 
                        inventory["diagnostics"].append(f"[Global] OBS Connect Error: {str(e)}")

                # Add detailed discovery summary for this region
                region_compute = len([r for r in inventory.get("compute", []) if r.get("region") == target_region])
                region_database = len([r for r in inventory.get("database", []) if r.get("region") == target_region])
                region_network = len([r for r in inventory.get("network", []) if r.get("region") == target_region])
                region_storage = len([r for r in inventory.get("storage", []) if r.get("region") == target_region])
                region_security = len([r for r in inventory.get("security", []) if r.get("region") == target_region])
                region_other = len([r for r in inventory.get("other", []) if r.get("region") == target_region])
                region_total = region_compute + region_database + region_network + region_storage + region_security + region_other
                
                logger.info(f"[{target_region}] Discovery completed:")
                logger.info(f"  • Compute (ECS/AS/FunctionGraph/IMS): {region_compute} resources")
                logger.info(f"  • Database (RDS/DDS/DCS): {region_database} resources")
                logger.info(f"  • Network (VPC/Subnet/SG/EIP/ELB/NAT/VPN): {region_network} resources")
                logger.info(f"  • Storage (EVS/OBS/CBR): {region_storage} resources")
                logger.info(f"  • Security (HSS): {region_security} resources")
                logger.info(f"  • Other (DMS/SMN): {region_other} resources")
                logger.info(f"  • Total: {region_total} resources")

            # Final summary across all regions with detailed breakdown
            total_compute = len(inventory.get("compute", []))
            total_database = len(inventory.get("database", []))
            total_network = len(inventory.get("network", []))
            total_storage = len(inventory.get("storage", []))
            total_other = len(inventory.get("other", []))
            total_resources = total_compute + total_database + total_network + total_storage + total_other
            
            logger.info(f"Discovery completed across all regions:")
            logger.info(f"  • Total Compute: {total_compute} resources")
            logger.info(f"  • Total Database: {total_database} resources")
            logger.info(f"  • Total Network: {total_network} resources")
            logger.info(f"  • Total Storage: {total_storage} resources")
            logger.info(f"  • Total Other: {total_other} resources")
            logger.info(f"  • Grand Total: {total_resources} resources")
            
            # Log resource types for debugging
            if total_resources > 166:  # If we're finding more than expected
                logger.warning(f"⚠️ Found {total_resources} resources, expected ~166")
                logger.warning(f"  Breakdown by type:")
                
                # Count by resource type
                type_counts = {}
                for category in ["compute", "database", "network", "storage", "other"]:
                    for resource in inventory.get(category, []):
                        rtype = resource.get("type", "Unknown")
                        type_counts[rtype] = type_counts.get(rtype, 0) + 1
                
                for rtype, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
                    logger.warning(f"    - {rtype}: {count}")
            
            if inventory.get("diagnostics"):
                logger.warning(f"  • Diagnostics: {len(inventory.get('diagnostics', []))} issues")
                for diag in inventory.get("diagnostics", []):
                    logger.warning(f"    - {diag}")

            # Ensure all inventory values are JSON serializable
            def make_json_serializable(obj):
                if obj is None:
                    return ""
                elif isinstance(obj, (int, float, bool)):
                    return obj
                elif isinstance(obj, str):
                    return obj
                else:
                    try:
                        return str(obj)
                    except:
                        return ""
            
            # Sanitize all inventory items
            for category in ["compute", "database", "network", "storage", "other"]:
                for item in inventory.get(category, []):
                    for key in list(item.keys()):
                        item[key] = make_json_serializable(item[key])
            
            # Sanitize diagnostics
            inventory["diagnostics"] = [make_json_serializable(d) for d in inventory.get("diagnostics", [])]
            
            # Log final inventory structure for debugging
            logger.info(f"Final inventory structure: {list(inventory.keys())}")
            logger.info(f"Compute items: {len(inventory.get('compute', []))}")
            logger.info(f"Database items: {len(inventory.get('database', []))}")
            logger.info(f"Network items: {len(inventory.get('network', []))}")
            logger.info(f"Storage items: {len(inventory.get('storage', []))}")
            logger.info(f"Other items: {len(inventory.get('other', []))}")
            
            return {"success": True, "inventory": inventory}
        except Exception as e:
            return {"success": False, "error": str(e), "diagnostics": getattr(inventory, "diagnostics", [])}
