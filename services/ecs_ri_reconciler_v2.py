import logging
from typing import Dict, List, Any
from services.huawei_discovery import HuaweiDiscovery
from services.huawei_bss_scanner import HuaweiBSSScanner
from services.enhanced_commercial_trueup import _parse_flavor_specs
from datetime import datetime

logger = logging.getLogger(__name__)

class ECSRIReconciler:
    def __init__(self, raw_ak: str, raw_sk: str, region: str = 'la-north-2'):
        self.raw_ak = raw_ak
        self.raw_sk = raw_sk
        self.region = region
        self.diagnostics = []
        
        self.discovery = HuaweiDiscovery(
            encrypted_ak_data=self.raw_ak,
            encrypted_sk_data=self.raw_sk,
            region=self.region,
            master_password="" 
        )
        self.bss_scanner = HuaweiBSSScanner(raw_ak=self.raw_ak, raw_sk=self.raw_sk, region=self.region)
        
    def get_live_ecs_servers(self) -> List[Dict]:
        try:
            self.diagnostics.append(f"Scanning Nova/ECS for live servers in {self.region}...")
            response = self.discovery.discover_all()
            inventory = response.get('inventory', {}) if isinstance(response, dict) else {}
            
            live_ecs_servers = []
            for server in inventory.get('compute', []):
                if server.get('type') == 'ECS':
                    live_ecs_servers.append({
                        'id': server.get('id', 'N/A'),
                        'name': server.get('name', 'Unknown Node'),
                        'specification': server.get('flavor', server.get('specification', 'Unknown')),
                        'status': server.get('status', 'Unknown'),
                        'billing_mode': server.get('billing_mode'),
                        'charging_mode': server.get('charging_mode'),
                        'tags': server.get('tags', {}),
                        'created_at': server.get('created_at'),
                        'is_reserved_instance': server.get('is_reserved_instance', False)
                    })
            self.diagnostics.append(f"Found {len(live_ecs_servers)} Live ECS servers.")
            return live_ecs_servers
        except Exception as e:
            self.diagnostics.append(f"Nova/ECS Scan Failed: {str(e)}")
            return []
    
    def get_bought_ris(self, console_ris: List[Dict]) -> List[Dict]:
        bought_ris = []
        
        # 1. Floating RIs from BSS API
        floating_ris, bss_logs = self.bss_scanner.get_active_ris()
        self.diagnostics.extend(bss_logs)
        bought_ris.extend(floating_ris)

        # 2. Console Upload CSV
        for ri in console_ris:
            qty = ri.get('quantity', 1)
            for _ in range(qty):
                bought_ris.append({
                    'id': f"CONSOLE_RI_{len(bought_ris)}",
                    'name': ri.get('name', 'Console Exported RI'),
                    'specification': ri.get('specification', 'Unknown'),
                    'billing_mode': 'Reserved',
                    'charging_mode': '1',
                    'tags': {},
                    'created_at': datetime.now().isoformat(),
                    'status': 'Active'
                })

        # 3. Node-level Prepaid ECS (Fallback from Nova)
        try:
            response = self.discovery.discover_all()
            inventory = response.get('inventory', {}) if isinstance(response, dict) else {}
            prepaid_nodes = 0
            for server in inventory.get('compute', []):
                if server.get('type') == 'ECS' and server.get('is_reserved_instance') == True:
                    prepaid_nodes += 1
                    bought_ris.append({
                        'id': server.get('id', 'N/A'),
                        'name': server.get('name', 'Unknown Node') + " (Prepaid Node)",
                        'specification': server.get('flavor', server.get('specification', 'Unknown')),
                        'billing_mode': 'Prepaid',
                        'charging_mode': '1',
                        'tags': server.get('tags', {}),
                        'status': server.get('status', 'Active')
                    })
            self.diagnostics.append(f"Found {prepaid_nodes} Node-Level Prepaid ECS servers.")
        except Exception as e: 
            self.diagnostics.append(f"Prepaid Node Scan Failed: {str(e)}")

        unique_bought = {ri['id']: ri for ri in bought_ris}.values()
        return list(unique_bought)
    
    def _normalize_spec_name(self, spec: str) -> str:
        if not spec: return 'Unknown'
        base_spec = spec.split(' ')[0].lower() 
        prefixes = ['general.', 's2.', 'c3.', 'c6.', 'c7.', 'm2.', 'm3.', 'm6.', 'm7.', 'd2.', 'h3.']
        for prefix in prefixes:
            if base_spec.startswith(prefix):
                base_spec = base_spec[len(prefix):]
                break
        return base_spec

    def reconcile_ecs_ris(self, quoted_ecs_ris: List[Dict], console_ris: List[Dict] = None) -> Dict:
        try:
            self.diagnostics = [] # Reset logs
            live_ecs_servers = self.get_live_ecs_servers()
            bought_ris = self.get_bought_ris(console_ris or [])
            
            original_display_names = {}
            
            quoted_by_spec = {}
            for quoted in quoted_ecs_ris:
                spec = quoted.get('specification', 'Unknown')
                norm = self._normalize_spec_name(spec)
                if norm not in original_display_names or len(spec) > len(original_display_names[norm]):
                    original_display_names[norm] = spec 
                
                if norm not in quoted_by_spec: quoted_by_spec[norm] = {'count': 0, 'servers': []}
                quoted_by_spec[norm]['count'] += quoted.get('quantity', 1)
                quoted_by_spec[norm]['servers'].append({
                    'name': quoted.get('name', ''),
                    'id': 'N/A',
                    'status': 'Quoted Baseline',
                    'original_spec': spec
                })
            
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
                display_spec = original_display_names.get(norm_spec, norm_spec)
                
                # Ensure Tags are passed to the frontend for Technical Category grouping
                # Also include quoted_specs for the 3-Way Diff Detailed Report
                quoted_servers_for_spec = quoted_by_spec.get(norm_spec, {}).get('servers', [])
                quoted_specs = {}
                if quoted_servers_for_spec:
                    first_quoted = quoted_servers_for_spec[0]
                    quoted_spec_name = first_quoted.get('specification', first_quoted.get('name', display_spec))
                    quoted_specs = _parse_flavor_specs(quoted_spec_name)
                
                item = {
                    'specification': display_spec,
                    'quoted_count': quoted_count,
                    'quoted_specs': quoted_specs,
                    'live_count': live_count,
                    'bought_count': bought_count,
                    'missing_ris': max(0, quoted_count - bought_count),
                    'quoted_servers': [
                        {
                            'name': s.get('name', 'Unknown'),
                            'id': s.get('id', 'N/A'),
                            'status': 'Quoted Baseline',
                            'spec': s.get('specification', display_spec),
                            'resource_specs': _parse_flavor_specs(s.get('specification', display_spec))
                        }
                        for s in quoted_servers_for_spec
                    ],
                    'live_servers': [
                        {
                            'name': s['name'],
                            'id': s.get('id', 'N/A'),
                            'status': s.get('status', 'Unknown'),
                            'spec': display_spec,
                            'tags': s.get('tags', {}),
                            'resource_specs': _parse_flavor_specs(s.get('specification', display_spec))
                        }
                        for s in live_by_spec.get(norm_spec, [])
                    ],
                    'bought_ris': [
                        {
                            'name': s['name'],
                            'id': s.get('id', 'N/A'),
                            'status': 'Prepaid / RI',
                            'spec': display_spec,
                            'resource_specs': _parse_flavor_specs(s.get('specification', display_spec))
                        }
                        for s in bought_by_spec.get(norm_spec, [])
                    ]
                }
                
                if quoted_count > 0: reconciliation_matrix.append(item)
                elif live_count > 0: unquoted_matrix.append(item)
            
            self.diagnostics.append("Matrix construction complete.")
            
            return {
                'summary': { 
                    'total_quoted': sum(i['quoted_count'] for i in reconciliation_matrix), 
                    'total_live': sum(i['live_count'] for i in reconciliation_matrix + unquoted_matrix), 
                    'total_bought': sum(i['bought_count'] for i in reconciliation_matrix + unquoted_matrix), 
                    'total_missing': sum(i['missing_ris'] for i in reconciliation_matrix)
                },
                'matrix': reconciliation_matrix,
                'unquoted_matrix': unquoted_matrix,
                'diagnostics': self.diagnostics
            }
            
        except Exception as e:
            self.diagnostics.append(f"Fatal Matrix Error: {str(e)}")
            logger.error(f"Error in ECS RI reconciliation: {e}", exc_info=True)
            return {'summary': {}, 'matrix': [], 'unquoted_matrix': [], 'diagnostics': self.diagnostics, 'error': str(e)}
