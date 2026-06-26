import logging
from typing import Dict, List, Any
from services.huawei_discovery import HuaweiDiscovery
from services.huawei_bss_scanner import HuaweiBSSScanner

logger = logging.getLogger(__name__)

class ECSRIReconciler:
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-south-2'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region
        
        self.discovery = HuaweiDiscovery(
            encrypted_ak_data=self.raw_ak,
            encrypted_sk_data=self.raw_sk,
            region=self.region,
            master_password="" 
        )
        self.bss_scanner = HuaweiBSSScanner(raw_ak=self.raw_ak, raw_sk=self.raw_sk, region=self.region)
        
    def get_live_ecs_servers(self) -> List[Dict]:
        try:
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
                        'is_reserved_instance': server.get('is_reserved_instance', False)
                    })
            return live_ecs_servers
        except Exception as e:
            logger.error(f"Reconciler Error (Live ECS): {e}")
            return []
    
    def get_bought_ris(self) -> List[Dict]:
        try:
            bought_ris = []
            # 1. Floating RIs
            floating_ris = self.bss_scanner.get_active_ris()
            bought_ris.extend(floating_ris)

            # 2. Node-level Prepaid ECS
            try:
                response = self.discovery.discover_all()
                inventory = response.get('inventory', {}) if isinstance(response, dict) else {}
                for server in inventory.get('compute', []):
                    if server.get('type') == 'ECS' and server.get('is_reserved_instance') == True:
                        bought_ris.append({
                            'id': server.get('id'),
                            'name': server.get('name') + " (Prepaid Node)",
                            'specification': server.get('flavor', server.get('specification', 'Unknown')),
                            'billing_mode': 'Prepaid',
                            'charging_mode': '1',
                            'tags': server.get('tags', {})
                        })
            except Exception: pass

            unique_bought = {ri['id']: ri for ri in bought_ris}.values()
            return list(unique_bought)
        except Exception as e:
            logger.error(f"Reconciler Error (Bought RIs): {e}")
            return []
    
    def _normalize_spec_name(self, spec: str) -> str:
        """
        Strips away beautiful text formatting: 'x0.8u.16g (8 vCPUs | 16GiB)' -> 'x0.8u.16g'
        This guarantees perfect programmatic matching with Huawei API payload.
        """
        if not spec: return 'Unknown'
        base_spec = spec.split(' ')[0].lower() # Grab everything before the first space
        prefixes = ['general.', 's2.', 'c3.', 'c6.', 'c7.', 'm2.', 'm3.', 'm6.', 'm7.', 'd2.', 'h3.']
        for prefix in prefixes:
            if base_spec.startswith(prefix):
                base_spec = base_spec[len(prefix):]
                break
        return base_spec

    def reconcile_ecs_ris(self, quoted_ecs_ris: List[Dict]) -> Dict:
        try:
            live_ecs_servers = self.get_live_ecs_servers()
            bought_ris = self.get_bought_ris()
            
            # Use original full string for UI presentation
            original_display_names = {}
            
            quoted_by_spec = {}
            for quoted in quoted_ecs_ris:
                spec = quoted.get('specification', 'Unknown')
                norm = self._normalize_spec_name(spec)
                original_display_names[norm] = spec 
                
                if norm not in quoted_by_spec: quoted_by_spec[norm] = {'count': 0, 'servers': []}
                quoted_by_spec[norm]['count'] += quoted.get('quantity', 1)
                quoted_by_spec[norm]['servers'].append(quoted.get('name', ''))
            
            live_by_spec = {}
            for server in live_ecs_servers:
                norm = self._normalize_spec_name(server.get('specification', 'Unknown'))
                if norm not in original_display_names: original_display_names[norm] = server.get('specification', 'Unknown')
                if norm not in live_by_spec: live_by_spec[norm] = []
                live_by_spec[norm].append(server)
            
            bought_by_spec = {}
            for ri in bought_ris:
                norm = self._normalize_spec_name(ri.get('specification', 'Unknown'))
                if norm not in bought_by_spec: bought_by_spec[norm] = []
                bought_by_spec[norm].append(ri)
            
            all_specs = set(list(quoted_by_spec.keys()) + list(live_by_spec.keys()) + list(bought_by_spec.keys()))
            
            reconciliation_matrix = []
            unquoted_matrix = []
            
            for norm_spec in sorted(all_specs):
                quoted_count = quoted_by_spec.get(norm_spec, {}).get('count', 0)
                live_count = len(live_by_spec.get(norm_spec, []))
                bought_count = len(bought_by_spec.get(norm_spec, []))
                
                item = {
                    'specification': original_display_names.get(norm_spec, norm_spec),
                    'quoted_count': quoted_count,
                    'live_count': live_count,
                    'bought_count': bought_count,
                    'missing_ris': max(0, quoted_count - bought_count),
                    'quoted_servers': quoted_by_spec.get(norm_spec, {}).get('servers', []),
                    'live_servers': [s['name'] for s in live_by_spec.get(norm_spec, [])],
                    'bought_ris': [s['name'] for s in bought_by_spec.get(norm_spec, [])]
                }
                
                # 🚨 CORE FIX: Anchor main table to Quoted. Push rest to Scope Creep.
                if quoted_count > 0:
                    reconciliation_matrix.append(item)
                else:
                    unquoted_matrix.append(item)
            
            return {
                'summary': { 
                    'total_quoted': sum(i['quoted_count'] for i in reconciliation_matrix), 
                    'total_live': sum(i['live_count'] for i in reconciliation_matrix + unquoted_matrix), 
                    'total_bought': sum(i['bought_count'] for i in reconciliation_matrix + unquoted_matrix), 
                    'total_missing': sum(i['missing_ris'] for i in reconciliation_matrix)
                },
                'matrix': reconciliation_matrix,
                'unquoted_matrix': unquoted_matrix
            }
            
        except Exception as e:
            logger.error(f"Error in ECS RI reconciliation: {e}", exc_info=True)
            return {'summary': {}, 'matrix': [], 'unquoted_matrix': [], 'error': str(e)}
