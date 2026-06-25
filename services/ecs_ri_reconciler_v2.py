import logging
from typing import Dict, List, Any, Optional
from services.huawei_discovery import HuaweiDiscovery
from datetime import datetime

logger = logging.getLogger(__name__)

class ECSRIReconciler:
    """
    ECS-specific Reserved Instance reconciler.
    Compares three data sources:
    1. Quoted RIs (from Price Calculator)
    2. Live ECS servers (from Huawei Cloud discovery)
    3. Bought RIs (from Huawei Console BSS API + Prepaid ECS nodes)
    """
    
    def __init__(self, encrypted_ak_data: str, encrypted_sk_data: str, 
                 region: str = 'la-south-2', master_password: str = 'LatamCloudAdmin2026!'):
        self.discovery = HuaweiDiscovery(
            encrypted_ak_data=encrypted_ak_data,
            encrypted_sk_data=encrypted_sk_data,
            region=region,
            master_password=master_password
        )
        self.region = region
        
    def get_live_ecs_servers(self) -> List[Dict]:
        try:
            logger.info(f"Getting live ECS servers from region {self.region}")
            response = self.discovery.discover_all()
            inventory = response.get('inventory', {}) if isinstance(response, dict) else {}
            
            live_ecs_servers = []
            for server in inventory.get('compute', []):
                if server.get('type') == 'ECS':
                    live_ecs_servers.append({
                        'id': server.get('id'),
                        'name': server.get('name'),
                        'specification': server.get('flavor', server.get('specification', 'Unknown')),
                        'status': server.get('status'),
                        'billing_mode': server.get('billing_mode'),
                        'charging_mode': server.get('charging_mode'),
                        'tags': server.get('tags', {}),
                        'created_at': server.get('created_at'),
                        'az': server.get('az'),
                        'flavor': server.get('flavor')
                    })
            
            return live_ecs_servers
        except Exception as e:
            logger.error(f"Error getting live ECS servers: {e}", exc_info=True)
            return []
    
    def get_bought_ris(self) -> List[Dict]:
        """
        Gets bought RIs from two places:
        1. Prepaid ECS nodes (chargingMode = 1)
        2. Floating RIs from the BSS Orders API
        """
        try:
            logger.info(f"Getting bought RIs for region {self.region}")
            bought_ris = []
            
            # 1. Fetch Prepaid ECS (Node-level RIs)
            response = self.discovery.discover_all()
            inventory = response.get('inventory', {}) if isinstance(response, dict) else {}
            
            for server in inventory.get('compute', []):
                if server.get('type') == 'ECS':
                    if server.get('is_reserved_instance') == True:
                        bought_ris.append({
                            'id': server.get('id'),
                            'name': server.get('name') + " (Prepaid ECS Node)",
                            'specification': server.get('flavor', server.get('specification', 'Unknown')),
                            'billing_mode': 'Prepaid',
                            'charging_mode': '1',
                            'tags': server.get('tags', {}),
                            'created_at': server.get('created_at', '')
                        })

            # 2. Fetch Floating RIs from BSS API
            try:
                from huaweicloudsdkcore.auth.credentials import GlobalCredentials
                from huaweicloudsdkbss.v2.region.bss_region import BssRegion
                from huaweicloudsdkbss.v2.bss_client import BssClient
                from huaweicloudsdkbss.v2.model.list_customer_orders_request import ListCustomerOrdersRequest
                
                credentials = GlobalCredentials(self.discovery.raw_ak, self.discovery.raw_sk)
                client = BssClient.new_builder() \
                    .with_credentials(credentials) \
                    .with_region(BssRegion.value_of("ap-southeast-3")) \
                    .build()
                
                # Fetch completed orders
                request = ListCustomerOrdersRequest(status=3) 
                bss_resp = client.list_customer_orders(request)
                
                if getattr(bss_resp, 'order_infos', None):
                    for order in bss_resp.order_infos:
                        order_dict = order.to_dict() if hasattr(order, 'to_dict') else order.__dict__
                        details = str(order_dict).lower()
                        if 'reserved' in details or 'ri ' in details:
                            # Safely extract common flavors
                            spec = 'Unknown'
                            for s in ['s6.large.2', 'c7.xlarge.2', 's6.xlarge.2', 'c6.large.2', 'c6.xlarge.2', 's6.medium.2', 'c7.large.2']:
                                if s in details:
                                    spec = s
                                    break
                                    
                            bought_ris.append({
                                'id': order_dict.get('order_id', 'BSS_RI'),
                                'name': f"Floating RI (Order {order_dict.get('order_id', '')})",
                                'specification': spec,
                                'billing_mode': 'Floating Reserved',
                                'charging_mode': '1',
                                'tags': {},
                                'created_at': order_dict.get('create_time', '')
                            })
            except Exception as bss_err:
                logger.warning(f"BSS API fetch skipped/failed (expected if missing IAM rights): {bss_err}")

            # Filter duplicates to prevent double-counting
            unique_bought = {ri['id']: ri for ri in bought_ris}.values()
            
            logger.info(f"Found {len(unique_bought)} Total Bought RIs")
            return list(unique_bought)
            
        except Exception as e:
            logger.error(f"Error getting bought RIs: {e}", exc_info=True)
            return []
    
    def reconcile_ecs_ris(self, quoted_ecs_ris: List[Dict]) -> Dict:
        """
        Perform 3-way reconciliation:
        1. Quoted RIs (from Price Calculator)
        2. Live ECS servers (from Huawei Cloud)
        3. Bought RIs (from Huawei Console)
        """
        try:
            # Get live data
            live_ecs_servers = self.get_live_ecs_servers()
            bought_ris = self.get_bought_ris()
            
            # Group quoted RIs by specification
            quoted_by_spec = {}
            for quoted in quoted_ecs_ris:
                spec = quoted.get('specification', 'Unknown')
                if spec not in quoted_by_spec:
                    quoted_by_spec[spec] = {
                        'quoted_count': 0,
                        'live_count': 0,
                        'bought_count': 0,
                        'quoted_servers': [],
                        'live_servers': [],
                        'bought_servers': []
                    }
                quoted_by_spec[spec]['quoted_count'] += quoted.get('quantity', 1)
                quoted_by_spec[spec]['quoted_servers'].append({
                    'name': quoted.get('name', ''),
                    'description': quoted.get('description', ''),
                    'quantity': quoted.get('quantity', 1)
                })
            
            # Group live ECS by specification
            live_by_spec = {}
            for server in live_ecs_servers:
                spec = server.get('specification', 'Unknown')
                if spec not in live_by_spec:
                    live_by_spec[spec] = []
                live_by_spec[spec].append(server)
            
            # Group bought RIs by specification
            bought_by_spec = {}
            for ri in bought_ris:
                spec = ri.get('specification', 'Unknown')
                if spec not in bought_by_spec:
                    bought_by_spec[spec] = []
                bought_by_spec[spec].append(ri)
            
            # Normalize spec names for comparison
            normalized_quoted_by_spec = {}
            for spec, data in quoted_by_spec.items():
                normalized_spec = self._normalize_spec_name(spec)
                if normalized_spec not in normalized_quoted_by_spec:
                    normalized_quoted_by_spec[normalized_spec] = {'quoted_count': 0, 'quoted_servers': []}
                normalized_quoted_by_spec[normalized_spec]['quoted_count'] += data['quoted_count']
                normalized_quoted_by_spec[normalized_spec]['quoted_servers'].extend(data['quoted_servers'])
            
            normalized_live_by_spec = {}
            for spec, servers in live_by_spec.items():
                normalized_spec = self._normalize_spec_name(spec)
                if normalized_spec not in normalized_live_by_spec:
                    normalized_live_by_spec[normalized_spec] = []
                normalized_live_by_spec[normalized_spec].extend(servers)
            
            normalized_bought_by_spec = {}
            for spec, servers in bought_by_spec.items():
                normalized_spec = self._normalize_spec_name(spec)
                if normalized_spec not in normalized_bought_by_spec:
                    normalized_bought_by_spec[normalized_spec] = []
                normalized_bought_by_spec[normalized_spec].extend(servers)
            
            # Merge all normalized specifications
            all_specs = set(list(normalized_quoted_by_spec.keys()) + list(normalized_live_by_spec.keys()) + list(normalized_bought_by_spec.keys()))
            
            # Build reconciliation matrix
            reconciliation_matrix = []
            for spec in sorted(all_specs):
                quoted_data = normalized_quoted_by_spec.get(spec, {'quoted_count': 0, 'quoted_servers': []})
                live_servers = normalized_live_by_spec.get(spec, [])
                bought_servers = normalized_bought_by_spec.get(spec, [])
                
                # Calculate missing RIs
                quoted_count = quoted_data['quoted_count']
                live_count = len(live_servers)
                bought_count = len(bought_servers)
                missing_ris = max(0, quoted_count - bought_count)
                
                reconciliation_matrix.append({
                    'specification': spec,
                    'quoted_count': quoted_count,
                    'live_count': live_count,
                    'bought_count': bought_count,
                    'missing_ris': missing_ris,
                    'quoted_servers': quoted_data['quoted_servers'],
                    'live_servers': live_servers,
                    'bought_servers': bought_servers,
                    'status': self._get_spec_status(quoted_count, live_count, bought_count)
                })
            
            # Calculate summary
            total_quoted = sum(item['quoted_count'] for item in reconciliation_matrix)
            total_live = sum(item['live_count'] for item in reconciliation_matrix)
            total_bought = sum(item['bought_count'] for item in reconciliation_matrix)
            total_missing = sum(item['missing_ris'] for item in reconciliation_matrix)
            
            # Build by_specification summary
            by_specification = {}
            for item in reconciliation_matrix:
                by_specification[item['specification']] = {
                    'quoted': item['quoted_count'],
                    'live': item['live_count'],
                    'bought': item['bought_count'],
                    'missing': item['missing_ris'],
                    'status': item['status'],
                    'filter_category': self._get_filter_category(item['status'])
                }
            
            # Calculate filter counts (simplified for now)
            filter_counts = {
                'pending_ri': total_missing,
                'not_migrated': 0,  
                'marked_for_deletion': 0,  
                'pending_config': 0  
            }
            
            return {
                'summary': {
                    'total_quoted': total_quoted,
                    'total_live': total_live,
                    'total_bought': total_bought,
                    'total_missing': total_missing,
                    'by_specification': by_specification
                },
                'matrix': reconciliation_matrix,
                'filter_counts': filter_counts,
                'detailed_results': {
                    'quoted_ris': quoted_ecs_ris,
                    'live_ecs_servers': live_ecs_servers,
                    'bought_ris': bought_ris
                }
            }
            
        except Exception as e:
            logger.error(f"Error in ECS RI reconciliation: {e}", exc_info=True)
            return {
                'summary': {
                    'total_quoted': len(quoted_ecs_ris),
                    'total_live': 0,
                    'total_bought': 0,
                    'total_missing': len(quoted_ecs_ris),
                    'by_specification': {}
                },
                'matrix': [],
                'filter_counts': {
                    'pending_ri': len(quoted_ecs_ris),
                    'not_migrated': 0,
                    'marked_for_deletion': 0,
                    'pending_config': 0
                },
                'detailed_results': {
                    'quoted_ris': quoted_ecs_ris,
                    'live_ecs_servers': [],
                    'bought_ris': []
                },
                'error': str(e)
            }
    
    def _normalize_spec_name(self, spec: str) -> str:
        if not spec:
            return 'Unknown'
        
        # Remove common prefixes
        prefixes = ['general.', 's2.', 'c3.', 'c6.', 'c7.', 'm2.', 'm3.', 'm6.', 'm7.', 'd2.', 'h3.']
        normalized = spec.lower()
        for prefix in prefixes:
            if normalized.startswith(prefix):
                normalized = normalized[len(prefix):]
                break
        
        return normalized
    
    def _get_filter_category(self, status: str) -> str:
        if status == 'NO_RI':
            return 'pending_ri'
        elif status == 'NOT_MIGRATED':
            return 'not_migrated'
        elif status == 'PARTIAL_RI':
            return 'pending_ri'  
        elif status == 'FULL_RI':
            return 'covered'
        else:
            return 'covered'
    
    def _get_spec_status(self, quoted: int, live: int, bought: int) -> str:
        if quoted == 0:
            return 'NOT_QUOTED'
        elif live == 0:
            return 'NOT_MIGRATED'
        elif bought == 0:
            return 'NO_RI'
        elif bought < quoted:
            return 'PARTIAL_RI'
        elif bought >= quoted:
            return 'FULL_RI'
        else:
            return 'UNKNOWN'
