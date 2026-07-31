#!/usr/bin/env python3
"""
Enhanced Commercial True-Up with Three-Way Comparison and Resource Specifications.
1. Quoted (Excel/Blueprint / RI Quotation)
2. Live Environment (NOC Scan / Live Discovery)
3. Delivered (What was actually provisioned vs what was quoted)

ALWAYS runs comparison — even without technical tags or active Reserved Instances.
Core purpose: validate what was DELIVERED against what was originally QUOTED.
"""

import logging
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Huawei ECS Flavor → Resource Specifications Lookup
# Maps flavor family patterns to approximate vCPU/RAM. Extended as needed.
# Approximate RAM based on flavor size class (general-purpose ratio: 1 vCPU ≈ 2 GB RAM)
ram_mapping = {
    'micro':    {'vcpu': 1,  'ram': 2},
    'small':    {'vcpu': 1,  'ram': 2},
    'medium':   {'vcpu': 2,  'ram': 4},
    'large':    {'vcpu': 2,  'ram': 4},
    'xlarge':   {'vcpu': 4,  'ram': 8},
    '2xlarge':  {'vcpu': 8,  'ram': 16},
    '3xlarge':  {'vcpu': 12, 'ram': 24},
    '4xlarge':  {'vcpu': 16, 'ram': 32},
    '6xlarge':  {'vcpu': 24, 'ram': 48},
    '8xlarge':  {'vcpu': 32, 'ram': 64},
    '12xlarge': {'vcpu': 48, 'ram': 96},
    '16xlarge': {'vcpu': 64, 'ram': 128},
}


def _parse_flavor_specs(flavor: str) -> Dict[str, Any]:
    """
    Parse a Huawei ECS flavor string into structured resource specifications.
    Uses ram_mapping (vcpu→RAM ratio approx 1:2 for general-purpose families).
    
    Returns dict with: vcpu, ram_gb, flavor_family, flavor_raw
    """
    if not flavor:
        return {'vcpu': None, 'ram_gb': None, 'flavor_raw': ''}
    
    flavor_clean = flavor.strip().lower()
    
    # 1. Try to match flavor size from ram_mapping (e.g., "large", "xlarge")
    #    Iterate longer keys first to avoid substring false-matches (xlarge before large)
    for size_key in sorted(ram_mapping.keys(), key=len, reverse=True):
        if size_key in flavor_clean:
            specs = ram_mapping[size_key]
            result = {'vcpu': specs['vcpu'], 'ram_gb': specs['ram']}
            result['flavor_family'] = flavor_clean.split('.')[0] if '.' in flavor_clean else flavor_clean
            result['flavor_raw'] = flavor
            return result
    
    # 2. Regex fallback: try to extract vCPU/RAM from naming convention
    vcpu_match = re.search(r'(\d+)\s*[v]?cpus?', flavor_clean)
    ram_match = re.search(r'(\d+)\s*[g]b', flavor_clean)
    
    if vcpu_match or ram_match:
        return {
            'vcpu': int(vcpu_match.group(1)) if vcpu_match else None,
            'ram_gb': int(ram_match.group(1)) if ram_match else None,
            'flavor_family': 'unknown',
            'flavor_raw': flavor
        }
    
    return {'vcpu': None, 'ram_gb': None, 'flavor_family': 'unrecognized', 'flavor_raw': flavor}


class EnhancedCommercialTrueUp:
    """
    Three-way reconciliation for Commercial True-Up.
    Works for all regions (including LATAM where BSS API is unavailable).
    
    Constructor supports two modes:
    - Legacy: EnhancedCommercialTrueUp(customer_region='la-north-2')
    - Matrix:  EnhancedCommercialTrueUp(customer_region='la-north-2', reconciliation_matrix=matrix)
    """
    
    def __init__(self, customer_region: str, reconciliation_matrix: Optional[List[Dict]] = None):
        self.customer_region = customer_region
        self.is_latam = customer_region.startswith('la-') if customer_region else False
        self.reconciliation_matrix = reconciliation_matrix or []
        
    def get_live_inventory(self, customer_id: str) -> Dict[str, Any]:
        """Get live inventory from NOC scan for the customer."""
        return {
            "compute": [],
            "databases": [],
            "storage": [],
            "network": [],
            "security": []
        }
    
    # =========================================================================
    # NEW: generate_recommendations() — the missing method the route calls
    # =========================================================================
    def generate_recommendations(self) -> Dict[str, Any]:
        """
        Generate actionable Commercial True-Up recommendations from the
        reconciliation matrix. ALWAYS runs — even without tags or active RIs.
        
        Returns a dict with:
        - three_way_diff: matrix enriched with resource specifications
        - commercial_trueup: quoted-vs-delivered comparison
        - procurement_actions: recommended procurement / PO actions
        - summary: executive summary counts & gaps
        """
        matrix = self.reconciliation_matrix
        
        # 1. Build 3-Way Diff with resource specifications
        three_way_diff = self._build_three_way_diff_with_specs(matrix)
        
        # 2. Build Commercial True-Up (Quoted vs Delivered) — ALWAYS runs
        commercial_trueup = self._build_commercial_trueup(matrix)
        
        # 3. Derive procurement actions
        procurement_actions = self._derive_procurement_actions(three_way_diff, commercial_trueup)
        
        # 4. Build executive summary
        summary = self._build_trueup_summary(three_way_diff, commercial_trueup)
        
        return {
            'three_way_diff': three_way_diff,
            'commercial_trueup': commercial_trueup,
            'procurement_actions': procurement_actions,
            'summary': summary,
            'generated_at': datetime.utcnow().isoformat(),
            'note': 'Always compares Quoted Baseline vs Delivered — even without Tags or Active RIs.'
        }
    
    # =========================================================================
    # 3-Way Diff Matrix with Resource Specifications
    # =========================================================================
    def _build_three_way_diff_with_specs(self, matrix: List[Dict]) -> List[Dict]:
        """
        Enrich the reconciliation matrix with detailed resource specifications.
        
        For each spec row in the matrix, adds:
        - quoted_specs: parsed vCPU, RAM, disk from quoted flavor
        - live_specs: parsed vCPU, RAM, disk from live/discovered servers
        - bought_specs: parsed vCPU, RAM, disk from bought RIs
        - spec_match: whether quoted and live specs align
        """
        enriched_rows = []
        
        for row in matrix:
            quoted_spec = row.get('specification', '')
            quoted_servers = row.get('quoted_servers', [])
            live_servers = row.get('live_servers', [])
            bought_ris = row.get('bought_ris', [])
            
            # Parse specs for each dimension
            quoted_parsed = _parse_flavor_specs(quoted_spec)
            
            live_parsed_list = []
            for srv in live_servers:
                live_flavor = srv.get('spec', srv.get('flavor', srv.get('specification', '')))
                live_parsed_list.append({
                    'server_name': srv.get('name', 'Unknown'),
                    'server_id': srv.get('id', 'N/A'),
                    'status': srv.get('status', 'Unknown'),
                    'tags': srv.get('tags', {}),
                    'specs': _parse_flavor_specs(live_flavor)
                })
            
            bought_parsed_list = []
            for ri in bought_ris:
                ri_flavor = ri.get('spec', ri.get('specification', ''))
                bought_parsed_list.append({
                    'ri_name': ri.get('name', 'Unknown'),
                    'ri_id': ri.get('id', 'N/A'),
                    'status': ri.get('status', 'Active'),
                    'specs': _parse_flavor_specs(ri_flavor)
                })
            
            # Determine spec match quality
            spec_match = self._evaluate_spec_match(quoted_parsed, live_parsed_list)
            
            enriched_rows.append({
                **row,
                'quoted_specs': quoted_parsed,
                'live_servers_detailed': live_parsed_list,
                'bought_ris_detailed': bought_parsed_list,
                'spec_match': spec_match,
            })
        
        return enriched_rows
    
    def _evaluate_spec_match(self, quoted: Dict, live_list: List[Dict]) -> str:
        """
        Evaluate whether delivered resources match quoted specifications.
        Returns: 'MATCH', 'PARTIAL', 'MISMATCH', or 'NO_LIVE_DATA'
        """
        if not live_list:
            return 'NO_LIVE_DATA'
        
        if quoted.get('vcpu') is None and quoted.get('ram_gb') is None:
            return 'UNKNOWN'  # Cannot evaluate without quoted specs
        
        vcpu_match = False
        ram_match = False
        
        for live in live_list:
            live_specs = live.get('specs', {})
            if quoted.get('vcpu') and live_specs.get('vcpu'):
                if quoted['vcpu'] == live_specs['vcpu']:
                    vcpu_match = True
            if quoted.get('ram_gb') and live_specs.get('ram_gb'):
                if quoted['ram_gb'] == live_specs['ram_gb']:
                    ram_match = True
        
        if vcpu_match and ram_match:
            return 'MATCH'
        elif vcpu_match or ram_match:
            return 'PARTIAL'
        elif quoted.get('vcpu') or quoted.get('ram_gb'):
            return 'MISMATCH'
        return 'UNKNOWN'
    
    # =========================================================================
    # Commercial True-Up — Quoted vs Delivered (ALWAYS runs)
    # =========================================================================
    def _build_commercial_trueup(self, matrix: List[Dict]) -> Dict[str, Any]:
        """
        Compare Quoted ECS Baseline against what was actually Delivered.
        
        This ALWAYS runs, even when:
        - No Technical Tags exist on resources
        - No Active Reserved Instances exist
        - No BSS data available (LATAM)
        
        The purpose is to validate: "Did we get what we paid for?"
        """
        total_quoted_count = 0
        total_live_count = 0
        total_bought_count = 0
        delivered_matches = []
        undelivered = []
        overdelivered = []
        
        for row in matrix:
            quoted_count = row.get('quoted_count', 0)
            live_count = row.get('live_count', 0)
            bought_count = row.get('bought_count', 0)
            specification = row.get('specification', 'Unknown')
            
            total_quoted_count += quoted_count
            total_live_count += live_count
            total_bought_count += bought_count
            
            # Determine delivery status per spec
            if quoted_count > 0:
                if live_count >= quoted_count:
                    delivered_matches.append({
                        'specification': specification,
                        'quoted': quoted_count,
                        'delivered': live_count,
                        'surplus': live_count - quoted_count,
                        'status': 'FULLY_DELIVERED'
                    })
                elif live_count > 0:
                    delivered_matches.append({
                        'specification': specification,
                        'quoted': quoted_count,
                        'delivered': live_count,
                        'shortfall': quoted_count - live_count,
                        'status': 'PARTIALLY_DELIVERED'
                    })
                else:
                    undelivered.append({
                        'specification': specification,
                        'quoted': quoted_count,
                        'delivered': 0,
                        'shortfall': quoted_count,
                        'status': 'NOT_DELIVERED'
                    })
            
            # Track resources present in live but NOT quoted (shadow IT / scope creep)
            if live_count > quoted_count and quoted_count > 0:
                overdelivered.append({
                    'specification': specification,
                    'quoted': quoted_count,
                    'delivered': live_count,
                    'overdelivered': live_count - quoted_count,
                    'status': 'OVER_DELIVERED'
                })
        
        # Calculate delivery percentages
        delivery_pct = round((total_live_count / total_quoted_count * 100), 1) if total_quoted_count > 0 else 0
        ri_coverage_pct = round((total_bought_count / total_quoted_count * 100), 1) if total_quoted_count > 0 else 0
        
        return {
            'quoted_baseline': {
                'total_resources': total_quoted_count,
                'description': 'Resources quoted in SOW / BoM'
            },
            'delivered_actual': {
                'total_resources': total_live_count,
                'delivery_pct': delivery_pct,
                'description': 'Resources discovered live in target environment'
            },
            'ri_coverage': {
                'total_ris': total_bought_count,
                'coverage_pct': ri_coverage_pct,
                'description': 'Active Reserved Instances covering quoted resources'
            },
            'delivery_status': {
                'fully_delivered': len(delivered_matches),
                'partially_delivered': len([d for d in delivered_matches if d.get('status') == 'PARTIALLY_DELIVERED']),
                'not_delivered': len(undelivered),
                'over_delivered': len(overdelivered)
            },
            'items': {
                'delivered': delivered_matches,
                'undelivered': undelivered,
                'overdelivered': overdelivered
            },
            'validation_note': (
                'This comparison runs regardless of Technical Tags or Active RI status. '
                'It validates the fundamental question: "Was what we quoted actually delivered?"'
            ),
            'no_tags_ri_fallback': True  # Signal to frontend that this is the unconditional comparison
        }
    
    # =========================================================================
    # Procurement Actions derived from the True-Up
    # =========================================================================
    def _derive_procurement_actions(self, three_way_diff: List[Dict], commercial_trueup: Dict[str, Any]) -> List[Dict]:
        """
        Derive recommended Procurement & PO Handover actions from the gap analysis.
        """
        actions = []
        
        items = commercial_trueup.get('items', {})
        
        # 1. Missing resources → Open PO / procurement ticket
        for item in items.get('undelivered', []):
            actions.append({
                'action': 'PROCURE_MISSING',
                'priority': 'HIGH',
                'specification': item.get('specification', 'Unknown'),
                'quantity': item.get('shortfall', 0),
                'description': (
                    f"Quoted {item.get('quoted')} units of {item.get('specification')}, "
                    f"but NONE found in live environment. Open procurement ticket or verify "
                    f"with deployment team."
                ),
                'suggested_step': 'Create PO for missing resources or confirm they were intentionally descoped.'
            })
        
        # 2. Partial delivery → Follow up with partner/deployment team
        for item in items.get('delivered', []):
            if item.get('status') == 'PARTIALLY_DELIVERED':
                actions.append({
                    'action': 'FOLLOW_UP_PARTIAL',
                    'priority': 'MEDIUM',
                    'specification': item.get('specification', 'Unknown'),
                    'quantity': item.get('shortfall', 0),
                    'description': (
                        f"Quoted {item.get('quoted')} units, only {item.get('delivered')} delivered. "
                        f"Shortfall of {item.get('shortfall')} units."
                    ),
                    'suggested_step': 'Contact deployment partner to confirm ETA for remaining resources.'
                })
        
        # 3. Over-delivery → Scope creep / CR needed
        for item in items.get('overdelivered', []):
            actions.append({
                'action': 'SCOPE_CREEP_ALERT',
                'priority': 'HIGH',
                'specification': item.get('specification', 'Unknown'),
                'quantity': item.get('overdelivered', 0),
                'description': (
                    f"{item.get('overdelivered')} extra {item.get('specification')} instances "
                    f"found in live environment beyond quoted quantity. This may require a "
                    f"Change Request (CR) for billing true-up."
                ),
                'suggested_step': 'Initiate Change Request process with customer to true-up billing.'
            })
        
        # 4. RI gap recommendations
        for row in three_way_diff:
            missing_ris = row.get('missing_ris', 0)
            if missing_ris > 0:
                actions.append({
                    'action': 'PURCHASE_RI',
                    'priority': 'MEDIUM',
                    'specification': row.get('specification', 'Unknown'),
                    'quantity': missing_ris,
                    'description': (
                        f"{missing_ris} Reserved Instance(s) needed for {row.get('specification')} "
                        f"to optimize costs vs pay-per-use pricing."
                    ),
                    'suggested_step': 'Submit RI purchase order through Huawei Cloud procurement portal.'
                })
        
        return actions
    
    def _build_trueup_summary(self, three_way_diff: List[Dict], commercial_trueup: Dict[str, Any]) -> Dict[str, Any]:
        """Build executive summary for the True-Up report."""
        ct = commercial_trueup
        delivery_status = ct.get('delivery_status', {})
        
        spec_match_counts = {'MATCH': 0, 'PARTIAL': 0, 'MISMATCH': 0, 'NO_LIVE_DATA': 0, 'UNKNOWN': 0}
        for row in three_way_diff:
            match = row.get('spec_match', 'UNKNOWN')
            spec_match_counts[match] = spec_match_counts.get(match, 0) + 1
        
        return {
            'total_spec_groups': len(three_way_diff),
            'delivery_summary': {
                'quoted': ct.get('quoted_baseline', {}).get('total_resources', 0),
                'delivered': ct.get('delivered_actual', {}).get('total_resources', 0),
                'delivery_pct': ct.get('delivered_actual', {}).get('delivery_pct', 0),
                'ri_coverage_pct': ct.get('ri_coverage', {}).get('coverage_pct', 0),
                'fully_delivered': delivery_status.get('fully_delivered', 0),
                'partially_delivered': delivery_status.get('partially_delivered', 0),
                'not_delivered': delivery_status.get('not_delivered', 0),
                'over_delivered': delivery_status.get('over_delivered', 0),
            },
            'spec_accuracy': spec_match_counts,
            'requires_attention': (
                delivery_status.get('not_delivered', 0) > 0 or
                delivery_status.get('over_delivered', 0) > 0 or
                delivery_status.get('partially_delivered', 0) > 0
            ),
            'run_unconditionally': True
        }
    
    # =========================================================================
    # Legacy methods (preserved for backward compatibility)
    # =========================================================================
    def reconcile_three_way(self, 
                           commercial_intent: Dict[str, Any], 
                           live_inventory: Optional[Dict[str, Any]] = None,
                           bss_orders: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Three-way reconciliation (legacy)."""
        if not bss_orders:
            if self.is_latam:
                bss_orders = {
                    "order_infos": [],
                    "total_count": 0,
                    "region": self.customer_region,
                    "note": "BSS API unavailable for LATAM regions. Manual verification required."
                }
            else:
                bss_orders = {"order_infos": [], "total_count": 0, "error": "BSS API unavailable"}
        
        if not live_inventory:
            live_inventory = self.get_live_inventory("")
        
        live_ri_orders = self.get_ri_from_live_inventory(live_inventory) if live_inventory else {"order_infos": [], "total_count": 0}
        
        if self.is_latam and not bss_orders:
            bss_orders = live_ri_orders
        
        reconciliation_matrix = {
            "deployable_assets": [],
            "account_assets": [],
            "summary": {
                "covered": 0,
                "missing_ri": 0,
                "missing_account_services": 0,
                "deployed_but_not_quoted": 0,
                "quoted_but_not_deployed": 0,
                "ppu_total": 0.0,
                "ri_total": 0.0,
                "total_quoted": 0.0,
                "monthly_gap_cost": 0.0
            },
            "region_info": {
                "customer_region": self.customer_region,
                "bss_available": not self.is_latam,
                "bss_simulated": False,
                "live_ri_detection": self.is_latam,
                "note": "BSS API only available for China regions. LATAM uses live RI detection from billing_mode field."
            }
        }
        
        for asset in commercial_intent.get('deployable_assets', []):
            billing_mode = asset.get('billing_mode', 'Pay-per-use')
            pricing_type = asset.get('pricing_type', 'PPU')
            quantity = asset.get('quantity', 1)
            unit_price = asset.get('unit_price', 0.0)
            total_price = asset.get('total_price', 0.0)
            
            requires_ri = pricing_type == 'RI' and billing_mode in ['Yearly', 'Monthly']
            live_match = self._find_live_match(asset, live_inventory) if live_inventory else None
            
            is_covered = False
            bss_match = None
            bss_verified = False
            live_is_ri = False
            
            if live_match and live_match.get('is_reserved_instance'):
                live_is_ri = True
                bss_verified = True
                bss_match = {
                    "order_id": "LIVE_RI",
                    "product_name": live_match.get('name', 'Unknown'),
                    "resource_type": live_match.get('type', 'ECS'),
                    "quantity": 1,
                    "term": "Live RI",
                    "amount": 0,
                    "status": "Active",
                    "region": self.customer_region,
                    "source": "live_inventory"
                }
            
            if self.is_latam:
                if not live_is_ri:
                    bss_verified = False
                    bss_match = None
            elif bss_orders and 'order_infos' in bss_orders:
                for order in bss_orders['order_infos']:
                    if self._matches_bss_order(asset, order):
                        is_covered = True
                        bss_match = order
                        bss_verified = True
                        break
            
            if requires_ri:
                status = 'COVERED' if bss_verified else 'MISSING_RI'
            else:
                status = 'PPU'
            
            monthly_gap_cost = 0.0
            if requires_ri and not bss_verified:
                if billing_mode == 'Yearly':
                    monthly_gap_cost = total_price / 12
                elif billing_mode == 'Monthly':
                    monthly_gap_cost = total_price
            
            financial_risk = 'LOW'
            if monthly_gap_cost > 1000:
                financial_risk = 'HIGH'
            elif monthly_gap_cost > 100:
                financial_risk = 'MEDIUM'
            
            # Include parsed resource specs
            parsed_specs = _parse_flavor_specs(asset.get('specification', ''))
            
            asset_result = {
                'id': asset.get('id'),
                'name': asset.get('name', 'Unknown'),
                'type': asset.get('type', 'Unknown'),
                'specification': asset.get('specification', ''),
                'resource_specs': parsed_specs,  # NEW: parsed vCPU, RAM, etc.
                'quantity': quantity,
                'unit_price': unit_price,
                'total_price': total_price,
                'currency': asset.get('currency', 'USD'),
                'billing_mode': billing_mode,
                'pricing_type': pricing_type,
                'requires_ri': requires_ri,
                'live_match': live_match,
                'bss_match': bss_match,
                'bss_verified': bss_verified,
                'status': status,
                'monthly_gap_cost': monthly_gap_cost,
                'financial_risk': financial_risk,
                'pending_configuration': asset.get('pending_configuration', False)
            }
            
            reconciliation_matrix['deployable_assets'].append(asset_result)
            
            if status == 'COVERED':
                reconciliation_matrix['summary']['covered'] += 1
                reconciliation_matrix['summary']['ri_total'] += total_price
            elif status == 'MISSING_RI':
                reconciliation_matrix['summary']['missing_ri'] += 1
                reconciliation_matrix['summary']['ri_total'] += total_price
                reconciliation_matrix['summary']['monthly_gap_cost'] += monthly_gap_cost
            elif status == 'PPU':
                reconciliation_matrix['summary']['ppu_total'] += total_price
            
            reconciliation_matrix['summary']['total_quoted'] += total_price
            
            if not live_match:
                reconciliation_matrix['summary']['quoted_but_not_deployed'] += 1
        
        for asset in commercial_intent.get('account_assets', []):
            asset_result = {
                'id': asset.get('id'),
                'name': asset.get('name', 'Unknown'),
                'type': asset.get('type', 'Unknown'),
                'total_price': asset.get('total_price', 0.0),
                'currency': asset.get('currency', 'USD'),
                'status': 'MISSING_ACCOUNT_SERVICE',
                'pending_configuration': asset.get('pending_configuration', False)
            }
            reconciliation_matrix['account_assets'].append(asset_result)
            reconciliation_matrix['summary']['missing_account_services'] += 1
        
        if live_inventory:
            quoted_names = [a.get('name', '').lower() for a in commercial_intent.get('deployable_assets', [])]
            for resource_type in ['compute', 'databases', 'storage', 'network', 'security']:
                for resource in live_inventory.get(resource_type, []):
                    resource_name = resource.get('name', '').lower()
                    if resource_name not in quoted_names:
                        reconciliation_matrix["summary"]["deployed_but_not_quoted"] += 1
        
        return reconciliation_matrix
    
    def _matches_bss_order(self, asset: Dict[str, Any], bss_order: Dict[str, Any]) -> bool:
        asset_name = asset.get('name', '').lower()
        asset_type = asset.get('type', '').lower()
        order_str = str(bss_order).lower()
        if asset_name in order_str:
            return True
        if asset_type in order_str:
            return True
        sku_keywords = ['ecs', 'rds', 'evs', 'eip', 'vpc', 'hss', 'waf']
        for keyword in sku_keywords:
            if keyword in asset_type and keyword in order_str:
                return True
        return False
    
    def _find_live_match(self, asset: Dict[str, Any], live_inventory: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        asset_name = asset.get('name', '').lower()
        asset_type = asset.get('type', '').lower()
        asset_spec = asset.get('specification', '').lower()
        
        type_map = {
            'ecs': 'compute', 'elastic cloud server': 'compute',
            'rds': 'databases', 'gaussdb': 'databases',
            'evs': 'storage', 'obs': 'storage',
            'eip': 'network', 'vpc': 'network', 'nat': 'network',
            'hss': 'security', 'waf': 'security'
        }
        
        category = 'compute'
        for key, value in type_map.items():
            if key in asset_type:
                category = value
                break
        
        for resource in live_inventory.get(category, []):
            resource_name = resource.get('name', '').lower()
            resource_flavor = resource.get('flavor', '').lower()
            if (asset_name in resource_name or resource_name in asset_name or
                asset_spec and asset_spec in resource_flavor):
                return resource
        
        return None
    
    def get_ri_from_live_inventory(self, live_inventory: Dict[str, Any]) -> Dict[str, Any]:
        ri_orders = {
            "order_infos": [],
            "total_count": 0,
            "region": self.customer_region,
            "source": "live_inventory",
            "note": "RI detection from live environment (billing_mode field)"
        }
        for resource in live_inventory.get('compute', []):
            if resource.get('is_reserved_instance'):
                ri_orders["order_infos"].append({
                    "order_id": f"LIVE_RI_{resource.get('id', 'unknown')}",
                    "product_name": resource.get('name', 'Unknown'),
                    "resource_type": resource.get('type', 'ECS'),
                    "quantity": 1,
                    "term": "Live RI",
                    "amount": 0,
                    "status": "Active",
                    "region": self.customer_region,
                    "source": "live_inventory",
                    "resource_id": resource.get('id'),
                    "billing_mode": resource.get('billing_mode', 'Unknown'),
                    "charging_mode": resource.get('charging_mode', 'Unknown')
                })
        ri_orders["total_count"] = len(ri_orders["order_infos"])
        return ri_orders
    
    def apply_filters(self, reconciliation_matrix: Dict[str, Any], filter_type: str) -> Dict[str, Any]:
        filtered_matrix = reconciliation_matrix.copy()
        
        if filter_type == 'pending_ri':
            filtered_assets = []
            for asset in reconciliation_matrix.get('deployable_assets', []):
                if asset.get('requires_ri') and not asset.get('bss_verified'):
                    filtered_assets.append(asset)
            filtered_matrix['deployable_assets'] = filtered_assets
        elif filter_type == 'not_migrated':
            filtered_assets = []
            for asset in reconciliation_matrix.get('deployable_assets', []):
                if not asset.get('live_match'):
                    filtered_assets.append(asset)
            filtered_matrix['deployable_assets'] = filtered_assets
        elif filter_type == 'marked_for_deletion':
            filtered_assets = []
            for asset in reconciliation_matrix.get('deployable_assets', []):
                if asset.get('live_match') and asset.get('status') == 'DEPLOYED_BUT_NOT_QUOTED':
                    filtered_assets.append(asset)
            filtered_matrix['deployable_assets'] = filtered_assets
        elif filter_type == 'pending_config':
            filtered_assets = []
            for asset in reconciliation_matrix.get('deployable_assets', []):
                if asset.get('live_match') and asset.get('pending_configuration'):
                    filtered_assets.append(asset)
            filtered_matrix['deployable_assets'] = filtered_assets
        
        if filter_type != 'all':
            filtered_matrix['summary'] = self._calculate_filtered_summary(filtered_matrix)
        
        filtered_matrix['active_filter'] = filter_type
        return filtered_matrix
    
    def _calculate_filtered_summary(self, filtered_matrix: Dict[str, Any]) -> Dict[str, Any]:
        summary = {
            'covered': 0,
            'missing_ri': 0,
            'missing_account_services': 0,
            'deployed_but_not_quoted': 0,
            'quoted_but_not_deployed': 0,
            'ppu_total': 0.0,
            'ri_total': 0.0,
            'total_quoted': 0.0,
            'monthly_gap_cost': 0.0,
            'filtered_count': len(filtered_matrix.get('deployable_assets', []))
        }
        
        for asset in filtered_matrix.get('deployable_assets', []):
            if asset.get('status') == 'COVERED':
                summary['covered'] += 1
            elif asset.get('status') == 'MISSING_RI':
                summary['missing_ri'] += 1
                summary['monthly_gap_cost'] += asset.get('monthly_gap_cost', 0)
            elif asset.get('status') == 'PPU':
                summary['ppu_total'] += asset.get('total_price', 0)
            summary['total_quoted'] += asset.get('total_price', 0)
        
        account_assets = []
        for asset in filtered_matrix.get('account_assets', []):
            if asset.get('status') == 'MISSING_ACCOUNT_SERVICE':
                account_assets.append(asset)
                summary['missing_account_services'] += 1
        filtered_matrix['account_assets'] = account_assets
        
        return summary
    
    def get_filter_counts(self, reconciliation_matrix: Dict[str, Any]) -> Dict[str, int]:
        counts = {
            'pending_ri': 0,
            'not_migrated': 0,
            'marked_for_deletion': 0,
            'pending_config': 0,
            'all': len(reconciliation_matrix.get('deployable_assets', []))
        }
        
        for asset in reconciliation_matrix.get('deployable_assets', []):
            if asset.get('requires_ri') and not asset.get('bss_verified'):
                counts['pending_ri'] += 1
            if not asset.get('live_match'):
                counts['not_migrated'] += 1
            if asset.get('live_match') and asset.get('status') == 'DEPLOYED_BUT_NOT_QUOTED':
                counts['marked_for_deletion'] += 1
            if asset.get('pending_configuration'):
                counts['pending_config'] += 1
        
        return counts
