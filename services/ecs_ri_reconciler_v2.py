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
    3. Bought RIs (from Huawei Console RI list)
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
        """
        Get live ECS servers from Huawei Cloud.
        """
        try:
            logger.info(f"Getting live ECS servers from region {self.region}")
            inventory = self.discovery.discover_all()
            
            live_ecs_servers = []
            for server in inventory.get('compute', []):
                # Only include ECS servers
                if server.get('resource_type') == 'ECS':
                    live_ecs_servers.append({
                        'id': server.get('id'),
                        'name': server.get('name'),
                        'specification': server.get('specification', 'Unknown'),
                        'status': server.get('status'),
                        'billing_mode': server.get('billing_mode'),
                        'charging_mode': server.get('charging_mode'),
                        'tags': server.get('tags', {}),
                        'created_at': server.get('created_at'),
                        'az': server.get('az'),
                        'flavor': server.get('flavor')
                    })
            
            logger.info(f"Found {len(live_ecs_servers)} live ECS servers")
            return live_ecs_servers
            
        except Exception as e:
            logger.error(f"Error getting live ECS servers: {e}", exc_info=True)
            return []
    
    def get_bought_ris(self) -> List[Dict]:
        """
        Get bought RIs from Huawei Console.
        This would normally call the Huawei Cloud BSS API for Reserved Instances.
        For now, we'll simulate by checking billing_mode='1' or charging_mode='prePaid'
        """
        try:
            logger.info(f"Getting bought RIs from region {self.region}")
            inventory = self.discovery.discover_all()
            
            bought_ris = []
            for server in inventory.get('compute', []):
                # Check if server has Reserved Instance
                if server.get('resource_type') == 'ECS':
                    billing_mode = server.get('billing_mode')
                    charging_mode = server.get('charging_mode')
                    
                    # Huawei Cloud uses billing_mode='1' or charging_mode='prePaid' for RIs
                    is_reserved = (
                        billing_mode == '1' or 
                        charging_mode == 'prePaid' or
                        (billing_mode and 'reserved' in str(billing_mode).lower()) or
                        (charging_mode and 'reserved' in str(charging_mode).lower())
                    )
                    
                    if is_reserved:
                        bought_ris.append({
                            'id': server.get('id'),
                            'name': server.get('name'),
                            'specification': server.get('specification', 'Unknown'),
                            'billing_mode': billing_mode,
                            'charging_mode': charging_mode,
                            'tags': server.get('tags', {}),
                            'created_at': server.get('created_at')
                        })
            
            logger.info(f"Found {len(bought_ris)} bought RIs")
            return bought_ris
            
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
            
            # Merge all specifications
            all_specs = set(list(quoted_by_spec.keys()) + list(live_by_spec.keys()) + list(bought_by_spec.keys()))
            
            # Build reconciliation matrix
            reconciliation_matrix = []
            for spec in sorted(all_specs):
                quoted_data = quoted_by_spec.get(spec, {'quoted_count': 0, 'quoted_servers': []})
                live_servers = live_by_spec.get(spec, [])
                bought_servers = bought_by_spec.get(spec, [])
                
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
                    'status': item['status']
                }
            
            # Calculate filter counts (simplified for now)
            filter_counts = {
                'pending_ri': total_missing,
                'not_migrated': 0,  # Will be populated when we have migration status
                'marked_for_deletion': 0,  # Will be populated from tags
                'pending_config': 0  # Will be populated from tags
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
    
    def _get_spec_status(self, quoted: int, live: int, bought: int) -> str:
        """Get status for a specification based on quoted/live/bought counts."""
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