import logging
from typing import Dict, List
from services.huawei_discovery import HuaweiDiscovery
from services.huawei_bss_scanner import HuaweiBSSScanner

logger = logging.getLogger(__name__)

class ECSRIReconciler:
    """
    ECS-specific Reserved Instance reconciler.
    Compares:
    1. Quoted RIs (from Price Calculator Upload)
    2. Live ECS servers (from Huawei Cloud discovery API)
    3. Bought RIs (Prepaid ECS Nodes + BSS Floating RIs)
    """
    
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-south-2'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region
        
        # Initialize Discovery (Technical) and BSS Scanner (Commercial)
        self.discovery = HuaweiDiscovery(
            encrypted_ak_data=self.raw_ak,
            encrypted_sk_data=self.raw_sk,
            region=self.region,
            master_password="" # Empty password bypasses decryption since we pass raw keys
        )
        self.bss_scanner = HuaweiBSSScanner(raw_ak=self.raw_ak, raw_sk=self.raw_sk, region=self.region)
        
    def get_live_ecs_servers(self) -> List[Dict]:
        try:
            logger.info(f"Reconciler: Getting live ECS servers from {self.region}")
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
            logger.error(f"Reconciler Error (Live ECS): {e}")
            return []
    
    def get_bought_ris(self) -> List[Dict]:
        """
        Gets bought RIs from two definitive sources:
        1. BSS API (Floating RIs applied to the Tenant)
        2. Live ECS servers explicitly marked as Prepaid (Node-Level)
        """
        try:
            bought_ris = []
            
            # 1. Fetch Floating RIs from the Global BSS Broker
            floating_ris = self.bss_scanner.get_active_ris()
            bought_ris.extend(floating_ris)

            # 2. Add Prepaid ECS servers (Node-level RIs)
            try:
                response = self.discovery.discover_all()
                inventory = response.get('inventory', {}) if isinstance(response, dict) else {}
                for server in inventory.get('compute', []):
                    if server.get('type') == 'ECS' and server.get('is_reserved_instance') == True:
                        bought_ris.append({
                            'id': server.get('id'),
                            'name': server.get('name') + " (Prepaid ECS)",
                            'specification': server.get('flavor', server.get('specification', 'Unknown')),
                            'billing_mode': 'Prepaid',
                            'charging_mode': '1',
                            'tags': server.get('tags', {}),
                            'created_at': server.get('created_at', '')
                        })
            except Exception:
                pass

            # Filter distinct by ID
            unique_bought = {ri['id']: ri for ri in bought_ris}.values()
            logger.info(f"Reconciler: Found {len(unique_bought)} Total Bought RIs (Floating + Node-Level)")
            return list(unique_bought)
            
        except Exception as e:
            logger.error(f"Reconciler Error (Bought RIs): {e}")
            return []
    
    def reconcile_ecs_ris(self, quoted_ecs_ris: List[Dict]) -> Dict:
        try:
            live_ecs_servers = self.get_live_ecs_servers()
            bought_ris = self.get_bought_ris()
            
            # Process quoted RIs
            quoted_by_spec = {}
            for quoted in quoted_ecs_ris:
                spec = quoted.get('specification', 'Unknown')
                if spec not in quoted_by_spec:
                    quoted_by_spec[spec] = {'quoted_count': 0, 'quoted_servers': []}
                quoted_by_spec[spec]['quoted_count'] += quoted.get('quantity', 1)
                quoted_by_spec[spec]['quoted_servers'].append({
                    'name': quoted.get('name', ''),
                    'description': quoted.get('description', ''),
                    'quantity': quoted.get('quantity', 1),
                    'region': quoted.get('region', ''),
                    'billing_mode': quoted.get('billing_mode', 'RI')
                })
            
            # Process live ECS servers with details
            live_by_spec = {}
            for server in live_ecs_servers:
                spec = server.get('specification', 'Unknown')
                if spec not in live_by_spec: 
                    live_by_spec[spec] = []
                # Add server details including state
                live_by_spec[spec].append({
                    'id': server.get('id', ''),
                    'name': server.get('name', ''),
                    'status': server.get('status', 'unknown'),
                    'is_reserved_instance': server.get('is_reserved_instance', False),
                    'private_ip': server.get('private_ip_address', ''),
                    'region': server.get('region', ''),
                    'billing_mode': server.get('billing_mode', '')
                })
            
            # Process bought RIs (inventory)
            bought_by_spec = {}
            for ri in bought_ris:
                spec = ri.get('specification', 'Unknown')
                if spec not in bought_by_spec: 
                    bought_by_spec[spec] = []
                bought_by_spec[spec].append({
                    'id': ri.get('id', ''),
                    'name': ri.get('name', ''),
                    'quantity': ri.get('quantity', 1),
                    'billing_mode': ri.get('billing_mode', 'Floating Reserved'),
                    'order_type': ri.get('order_type', 'inventory'),
                    'created_at': ri.get('created_at', '')
                })
            
            # Normalize spec names
            normalized_quoted_by_spec = {}
            original_spec_by_normalized = {}  # Map normalized -> original spec
            
            for spec, data in quoted_by_spec.items():
                normalized_spec = self._normalize_spec_name(spec)
                if normalized_spec not in normalized_quoted_by_spec:
                    normalized_quoted_by_spec[normalized_spec] = {'quoted_count': 0, 'quoted_servers': []}
                    original_spec_by_normalized[normalized_spec] = spec  # Store original spec
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
            
            all_specs = set(list(normalized_quoted_by_spec.keys()) + list(normalized_live_by_spec.keys()) + list(normalized_bought_by_spec.keys()))
            
            reconciliation_matrix = []
            for spec in sorted(all_specs):
                quoted_data = normalized_quoted_by_spec.get(spec, {'quoted_count': 0, 'quoted_servers': []})
                live_servers = normalized_live_by_spec.get(spec, [])
                bought_servers = normalized_bought_by_spec.get(spec, [])
                
                quoted_count = quoted_data['quoted_count']
                live_count = len(live_servers)
                bought_count = sum(ri.get('quantity', 1) for ri in bought_servers)  # Sum quantities
                missing_ris = max(0, quoted_count - bought_count)
                
                # Only include specs that are either:
                # 1. Quoted (quoted_count > 0) - REQUIRED
                # 2. Have live instances (live_count > 0) - CURRENTLY RUNNING  
                # 3. Have bought RIs (bought_count > 0) - ALREADY PURCHASED
                if quoted_count == 0 and live_count == 0 and bought_count == 0:
                    continue  # Skip specs that are not relevant
                
                # Get server names for display
                quoted_server_names = [s['name'] for s in quoted_data['quoted_servers']]
                live_server_details = [
                    f"{s['name']} ({s['status']})" + (" [RI]" if s.get('is_reserved_instance') else "")
                    for s in live_servers
                ]
                bought_ri_details = [
                    f"{ri['name']} (x{ri.get('quantity', 1)})" 
                    for ri in bought_servers
                ]
                
                # Use original spec if available, otherwise use normalized
                display_spec = original_spec_by_normalized.get(spec, spec)
                
                reconciliation_matrix.append({
                    'specification': display_spec,  # Use original spec for display
                    'normalized_spec': spec,  # Keep normalized for internal use
                    'quoted_count': quoted_count,
                    'live_count': live_count,
                    'bought_count': bought_count,
                    'missing_ris': missing_ris,
                    'status': self._get_spec_status(quoted_count, live_count, bought_count),
                    'quoted_servers': quoted_server_names,
                    'live_servers': live_server_details,
                    'bought_ris': bought_ri_details
                })
            
            total_quoted = sum(item['quoted_count'] for item in reconciliation_matrix)
            total_live = sum(item['live_count'] for item in reconciliation_matrix)
            total_bought = sum(item['bought_count'] for item in reconciliation_matrix)
            total_missing = sum(item['missing_ris'] for item in reconciliation_matrix)
            
            by_specification = {}
            for item in reconciliation_matrix:
                by_specification[item['specification']] = {
                    'quoted': item['quoted_count'],
                    'live': item['live_count'],
                    'bought': item['bought_count'],
                    'missing': item['missing_ris'],
                    'status': item['status'],
                    'filter_category': self._get_filter_category(item['status']),
                    'quoted_servers': item['quoted_servers'],
                    'live_servers': item['live_servers'],
                    'bought_ris': item['bought_ris']
                }
            
            filter_counts = { 'pending_ri': total_missing, 'not_migrated': 0, 'marked_for_deletion': 0, 'pending_config': 0 }
            
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
                'detailed': {
                    'quoted_by_spec': normalized_quoted_by_spec,
                    'live_by_spec': normalized_live_by_spec,
                    'bought_by_spec': normalized_bought_by_spec
                }
            }
            
        except Exception as e:
            logger.error(f"Error in ECS RI reconciliation: {e}", exc_info=True)
            return {
                'summary': { 'total_quoted': len(quoted_ecs_ris), 'total_live': 0, 'total_bought': 0, 'total_missing': len(quoted_ecs_ris), 'by_specification': {} },
                'matrix': [],
                'filter_counts': { 'pending_ri': len(quoted_ecs_ris), 'not_migrated': 0, 'marked_for_deletion': 0, 'pending_config': 0 },
                'detailed': {}
            }
    
    def _normalize_spec_name(self, spec: str) -> str:
        if not spec: return 'Unknown'
        # Remove common prefixes
        prefixes = ['general.', 's2.', 'c3.', 'c6.', 'c7.', 'm2.', 'm3.', 'm6.', 'm7.', 'd2.', 'h3.', 's6.', 'c6a.', 'c6e.', 'm6a.', 'm6e.']
        normalized = spec.lower()
        
        # Special handling for x-series specs (x0.8u.16g, x0.4u.6g, etc.)
        if normalized.startswith('x'):
            # Keep x-series as-is (x0.8u.16g)
            pass
        elif normalized.startswith('ac'):
            # Keep ac-series as-is (ac8.xlarge.4)
            pass
        else:
            # Remove prefixes for other specs
            for prefix in prefixes:
                if normalized.startswith(prefix):
                    normalized = normalized[len(prefix):]
                    break
        
        return normalized
    
    def _get_filter_category(self, status: str) -> str:
        if status == 'NO_RI': return 'pending_ri'
        elif status == 'NOT_MIGRATED': return 'not_migrated'
        elif status == 'PARTIAL_RI': return 'pending_ri'  
        elif status == 'FULL_RI': return 'covered'
        elif status == 'NOT_QUOTED': return 'not_required'
        else: return 'not_required'
    
    def _get_spec_status(self, quoted: int, live: int, bought: int) -> str:
        if quoted == 0: return 'NOT_QUOTED'
        elif live == 0: return 'NOT_MIGRATED'
        elif bought == 0: return 'NO_RI'
        elif bought < quoted: return 'PARTIAL_RI'
        elif bought >= quoted: return 'FULL_RI'
        else: return 'UNKNOWN'
