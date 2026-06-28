import logging
from typing import Dict, List, Any
from services.huawei_discovery import HuaweiDiscovery
from services.huawei_bss_scanner import HuaweiBSSScanner
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
        """Normalize specification name for matching"""
        if not spec:
            return 'Unknown'
        
        # Convert to lowercase and strip
        spec = str(spec).lower().strip()
        
        import re
        
        # First, extract any flavor pattern from the string
        flavor_patterns = [
            # Pattern: m7n.16xlarge.8, ac8.xlarge.4, e7.12xlarge.20
            r'([a-z][a-z0-9]*\.[a-z0-9]+\.[a-z0-9]+)',
            # Pattern: x0.8u.16g, x1e.4u.8g
            r'(x[0-9](?:e?)\.[0-9]+u\.[0-9]+g)',
            # Pattern: 8u.16g, 4u.6g
            r'([0-9]+u\.[0-9]+g)',
        ]
        
        for pattern in flavor_patterns:
            match = re.search(pattern, spec)
            if match:
                return match.group(1)
        
        # If no flavor pattern found, try to clean up
        # Remove anything in parentheses
        spec = re.sub(r'\([^)]*\)', '', spec).strip()
        
        # Try to extract from pipe format: "xxx | xxx | flavor"
        parts = [p.strip() for p in spec.split('|')]
        if len(parts) >= 3:
            last_part = parts[-1].strip()
            if '.' in last_part and any(c.isdigit() for c in last_part):
                return last_part
        
        # Remove common prefixes
        prefixes = ['general.', 's2.', 'c3.', 'c6.', 'c7.', 'm2.', 'm3.', 'm6.', 'm7.', 'd2.', 'h3.', 
                   'ac8.', 'x0.', 'x1e.', 'm7n.', 'e7.', 'memory-optimized', 'large-memory', 
                   'general computing', 'general computing-plus', 'general computing ', 'general ']
        for prefix in prefixes:
            if spec.startswith(prefix):
                spec = spec[len(prefix):].strip()
                break
        
        # Remove any non-alphanumeric characters at start/end
        spec = re.sub(r'^[^a-z0-9\.]+|[^a-z0-9\.]+$', '', spec)
        
        # Try flavor patterns again after cleaning
        for pattern in flavor_patterns:
            match = re.search(pattern, spec)
            if match:
                return match.group(1)
        
        # If still no match, return the cleaned spec or 'Unknown'
        return spec if spec else 'Unknown'

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
                
                # Analyze live servers for technical categories
                live_servers = live_by_spec.get(norm_spec, [])
                marked_for_deletion_count = 0
                pending_config_count = 0
                pending_license_count = 0
                not_migrated_count = quoted_count - live_count if quoted_count > live_count else 0
                
                for server in live_servers:
                    tags = server.get('tags', {})
                    if isinstance(tags, dict):
                        if tags.get('marked_for_deletion') == True:
                            marked_for_deletion_count += 1
                        if tags.get('pending_config') == True:
                            pending_config_count += 1
                        if tags.get('pending_license') == True:
                            pending_license_count += 1
                
                # Calculate billing focus: Live servers that need RI purchases
                # This is live servers minus already bought RIs for this spec
                live_need_ri_count = max(0, live_count - bought_count)
                
                item = {
                    'specification': display_spec,
                    'quoted_count': quoted_count,
                    'live_count': live_count,
                    'bought_count': bought_count,
                    'missing_ris': max(0, quoted_count - bought_count),
                    'live_need_ri_count': live_need_ri_count,  # Billing focus
                    'technical_categories': {
                        'not_migrated_provisioned': max(0, not_migrated_count),
                        'marked_for_deletion': marked_for_deletion_count,
                        'pending_config': pending_config_count,
                        'pending_license': pending_license_count
                    },
                    'quoted_servers': quoted_by_spec.get(norm_spec, {}).get('servers', []),
                    'live_servers': [{
                        'name': s['name'], 
                        'id': s.get('id', 'N/A'), 
                        'status': s.get('status', 'Unknown'), 
                        'spec': display_spec,
                        'tags': s.get('tags', {}),
                        'marked_for_deletion': s.get('tags', {}).get('marked_for_deletion', False),
                        'pending_config': s.get('tags', {}).get('pending_config', False),
                        'pending_license': s.get('tags', {}).get('pending_license', False)
                    } for s in live_by_spec.get(norm_spec, [])],
                    'bought_ris': [{'name': s['name'], 'id': s.get('id', 'N/A'), 'status': 'Prepaid / RI', 'spec': display_spec} for s in bought_by_spec.get(norm_spec, [])]
                }
                
                if quoted_count > 0: reconciliation_matrix.append(item)
                elif live_count > 0: unquoted_matrix.append(item)
            
            # Log detailed information for debugging
            self.diagnostics.append(f"Reconciliation matrix: {len(reconciliation_matrix)} specs with quoted RIs")
            self.diagnostics.append(f"Unquoted matrix: {len(unquoted_matrix)} specs without quoted RIs")
            
            # Log bought RIs details
            bought_specs = {}
            for ri in bought_ris:
                spec = ri.get('specification', 'Unknown')
                norm = self._normalize_spec_name(spec)
                bought_specs[norm] = bought_specs.get(norm, 0) + 1
            
            self.diagnostics.append(f"Bought RIs by normalized spec: {bought_specs}")
            
            # Log quoted specs for comparison
            quoted_specs = {}
            for quoted in quoted_ecs_ris:
                spec = quoted.get('specification', 'Unknown')
                norm = self._normalize_spec_name(spec)
                quoted_specs[norm] = quoted_specs.get(norm, 0) + quoted.get('quantity', 1)
            
            self.diagnostics.append(f"Quoted RIs by normalized spec: {quoted_specs}")
            
            # Calculate totals for technical categories
            total_not_migrated = sum(i['technical_categories']['not_migrated_provisioned'] for i in reconciliation_matrix)
            total_marked_for_deletion = sum(i['technical_categories']['marked_for_deletion'] for i in reconciliation_matrix)
            total_pending_config = sum(i['technical_categories']['pending_config'] for i in reconciliation_matrix)
            total_pending_license = sum(i['technical_categories']['pending_license'] for i in reconciliation_matrix)
            total_live_need_ri = sum(i['live_need_ri_count'] for i in reconciliation_matrix + unquoted_matrix)
            
            self.diagnostics.append("Matrix construction complete.")
            
            return {
                'summary': { 
                    'total_quoted': sum(i['quoted_count'] for i in reconciliation_matrix), 
                    'total_live': sum(i['live_count'] for i in reconciliation_matrix + unquoted_matrix), 
                    'total_bought': sum(i['bought_count'] for i in reconciliation_matrix + unquoted_matrix), 
                    'total_missing': sum(i['missing_ris'] for i in reconciliation_matrix),
                    'total_live_need_ri': total_live_need_ri,  # Billing focus
                    'technical_categories': {
                        'not_migrated_provisioned': total_not_migrated,
                        'marked_for_deletion': total_marked_for_deletion,
                        'pending_config': total_pending_config,
                        'pending_license': total_pending_license
                    }
                },
                'matrix': reconciliation_matrix,
                'unquoted_matrix': unquoted_matrix,
                'diagnostics': self.diagnostics
            }
            
        except Exception as e:
            self.diagnostics.append(f"Fatal Matrix Error: {str(e)}")
            logger.error(f"Error in ECS RI reconciliation: {e}", exc_info=True)
            return {'summary': {}, 'matrix': [], 'unquoted_matrix': [], 'diagnostics': self.diagnostics, 'error': str(e)}
