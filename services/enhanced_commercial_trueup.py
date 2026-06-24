#!/usr/bin/env python3
"""
Enhanced Commercial True-Up with Three-Way Comparison:
1. Quoted (Excel/Blueprint)
2. Live Environment (NOC Scan)
3. RI Required (Based on quotation specifications)
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class EnhancedCommercialTrueUp:
    """
    Three-way reconciliation for Commercial True-Up.
    Works for all regions (including LATAM where BSS API is unavailable).
    """
    
    def __init__(self, customer_region: str):
        self.customer_region = customer_region
        self.is_latam = customer_region.startswith('la-') if customer_region else False
        
    def get_live_inventory(self, customer_id: str) -> Dict[str, Any]:
        """
        Get live inventory from NOC scan for the customer.
        This should be called from the NOC scan endpoint.
        """
        # This would integrate with the existing NOC scan
        # For now, returns mock data structure
        return {
            "compute": [],
            "databases": [],
            "storage": [],
            "network": [],
            "security": []
        }
    
    def reconcile_three_way(self, 
                           commercial_intent: Dict[str, Any], 
                           live_inventory: Optional[Dict[str, Any]] = None,
                           bss_orders: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Three-way reconciliation:
        1. Quoted (commercial_intent)
        2. Live (live_inventory from NOC scan)
        3. RI Required (Based on quotation specifications)
        """
        
        # Get or simulate BSS orders
        if not bss_orders:
            if self.is_latam:
                # LATAM: No BSS API available, return empty orders
                bss_orders = {
                    "order_infos": [],
                    "total_count": 0,
                    "region": self.customer_region,
                    "note": "BSS API unavailable for LATAM regions. Manual verification required."
                }
            else:
                # China: Try real BSS API (will fail for LATAM)
                from services.huawei_bss_scanner import HuaweiBSSScanner
                # Note: This would need AK/SK, but we're just getting structure
                bss_orders = {"order_infos": [], "total_count": 0, "error": "BSS API unavailable"}
        
        # Get live inventory if not provided
        if not live_inventory:
            live_inventory = self.get_live_inventory("")  # Would need customer_id
        
        # Extract RI information from live inventory
        live_ri_orders = self.get_ri_from_live_inventory(live_inventory) if live_inventory else {"order_infos": [], "total_count": 0}
        
        # For LATAM regions, use live RI detection instead of BSS
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
                "live_ri_detection": self.is_latam,  # For LATAM, we use live RI detection
                "note": "BSS API only available for China regions. LATAM uses live RI detection from billing_mode field."
            }
        }
        
        # Process deployable assets
        for asset in commercial_intent.get('deployable_assets', []):
            # Extract commercial details
            billing_mode = asset.get('billing_mode', 'Pay-per-use')
            pricing_type = asset.get('pricing_type', 'PPU')
            quantity = asset.get('quantity', 1)
            unit_price = asset.get('unit_price', 0.0)
            total_price = asset.get('total_price', 0.0)
            
            # Determine if requires RI purchase
            requires_ri = pricing_type == 'RI' and billing_mode in ['Yearly', 'Monthly']
            
            # Find matching live resource
            live_match = self._find_live_match(asset, live_inventory) if live_inventory else None
            
            # Check if covered by BSS orders (only for China regions) OR live RI
            is_covered = False
            bss_match = None
            bss_verified = False
            
            # Check if live resource is a Reserved Instance
            live_is_ri = False
            if live_match and live_match.get('is_reserved_instance'):
                live_is_ri = True
                bss_verified = True  # Mark as verified if live resource is RI
                bss_match = {
                    "order_id": "LIVE_RI",
                    "product_name": live_match.get('name', 'Unknown'),
                    "resource_type": live_match.get('type', 'ECS'),
                    "quantity": 1,
                    "term": "Live RI",
                    "amount": 0,  # Unknown from live scan
                    "status": "Active",
                    "region": self.customer_region,
                    "source": "live_inventory"
                }
            
            if self.is_latam:
                # LATAM: Use live RI detection or manual verification
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
            
            # Determine status
            if requires_ri:
                if bss_verified:
                    status = 'COVERED'
                else:
                    status = 'MISSING_RI'
            else:
                status = 'PPU'
            
            # Calculate monthly gap cost
            monthly_gap_cost = 0.0
            if requires_ri and not bss_verified:
                # Estimate monthly cost for missing RI
                if billing_mode == 'Yearly':
                    monthly_gap_cost = total_price / 12
                elif billing_mode == 'Monthly':
                    monthly_gap_cost = total_price
            
            # Determine financial risk
            financial_risk = 'LOW'
            if monthly_gap_cost > 1000:
                financial_risk = 'HIGH'
            elif monthly_gap_cost > 100:
                financial_risk = 'MEDIUM'
            
            asset_result = {
                'id': asset.get('id'),
                'name': asset.get('name', 'Unknown'),
                'type': asset.get('type', 'Unknown'),
                'specification': asset.get('specification', ''),
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
            
            # Update summary
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
            
            # Track quoted but not deployed
            if not live_match:
                reconciliation_matrix['summary']['quoted_but_not_deployed'] += 1
        
        # Process account assets (support plans, security services)
        for asset in commercial_intent.get('account_assets', []):
            # Similar logic for account assets
            asset_result = {
                'id': asset.get('id'),
                'name': asset.get('name', 'Unknown'),
                'type': asset.get('type', 'Unknown'),
                'total_price': asset.get('total_price', 0.0),
                'currency': asset.get('currency', 'USD'),
                'status': 'MISSING_ACCOUNT_SERVICE',  # Default, would need actual verification
                'pending_configuration': asset.get('pending_configuration', False)
            }
            
            reconciliation_matrix['account_assets'].append(asset_result)
            reconciliation_matrix['summary']['missing_account_services'] += 1
        
        # Track deployed but not quoted (shadow IT)
        if live_inventory:
            quoted_names = [a.get('name', '').lower() for a in commercial_intent.get('deployable_assets', [])]
            for resource_type in ['compute', 'databases', 'storage', 'network', 'security']:
                for resource in live_inventory.get(resource_type, []):
                    resource_name = resource.get('name', '').lower()
                    if resource_name not in quoted_names:
                        reconciliation_matrix["summary"]["deployed_but_not_quoted"] += 1
        
        return reconciliation_matrix
    
    def _matches_bss_order(self, asset: Dict[str, Any], bss_order: Dict[str, Any]) -> bool:
        """Check if asset matches a BSS order."""
        asset_name = asset.get('name', '').lower()
        asset_type = asset.get('type', '').lower()
        
        # Check order string representation
        order_str = str(bss_order).lower()
        
        # Simple matching logic
        if asset_name in order_str:
            return True
        if asset_type in order_str:
            return True
        
        # Check for SKU patterns
        sku_keywords = ['ecs', 'rds', 'evs', 'eip', 'vpc', 'hss', 'waf']
        for keyword in sku_keywords:
            if keyword in asset_type and keyword in order_str:
                return True
        
        return False
    
    def _find_live_match(self, asset: Dict[str, Any], live_inventory: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find matching resource in live inventory."""
        asset_name = asset.get('name', '').lower()
        asset_type = asset.get('type', '').lower()
        asset_spec = asset.get('specification', '').lower()
        
        # Map asset types to inventory categories
        type_map = {
            'ecs': 'compute',
            'elastic cloud server': 'compute',
            'rds': 'databases',
            'gaussdb': 'databases',
            'evs': 'storage',
            'obs': 'storage',
            'eip': 'network',
            'vpc': 'network',
            'nat': 'network',
            'hss': 'security',
            'waf': 'security'
        }
        
        category = 'compute'  # default
        for key, value in type_map.items():
            if key in asset_type:
                category = value
                break
        
        # Search in the appropriate category
        for resource in live_inventory.get(category, []):
            resource_name = resource.get('name', '').lower()
            resource_flavor = resource.get('flavor', '').lower()
            
            # Match by name or flavor/specification
            if (asset_name in resource_name or resource_name in asset_name or
                asset_spec and asset_spec in resource_flavor):
                return resource
        
        return None
    
    def get_ri_from_live_inventory(self, live_inventory: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract Reserved Instance information from live inventory.
        Returns a structure similar to BSS orders for consistency.
        """
        ri_orders = {
            "order_infos": [],
            "total_count": 0,
            "region": self.customer_region,
            "source": "live_inventory",
            "note": "RI detection from live environment (billing_mode field)"
        }
        
        # Check compute resources for RIs
        for resource in live_inventory.get('compute', []):
            if resource.get('is_reserved_instance'):
                ri_orders["order_infos"].append({
                    "order_id": f"LIVE_RI_{resource.get('id', 'unknown')}",
                    "product_name": resource.get('name', 'Unknown'),
                    "resource_type": resource.get('type', 'ECS'),
                    "quantity": 1,
                    "term": "Live RI",
                    "amount": 0,  # Unknown from live scan
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
        """
        Apply filters to the reconciliation matrix.
        
        Filter types:
        1. 'pending_ri' - Specifications Pending RIs buy
        2. 'not_migrated' - Servers not migrated/provisioned at all
        3. 'marked_for_deletion' - Servers migrated but will not be kept
        4. 'pending_config' - Servers pending customer side configuration
        """
        filtered_matrix = reconciliation_matrix.copy()
        
        if filter_type == 'pending_ri':
            # Filter: Specifications Pending RIs buy
            filtered_assets = []
            for asset in reconciliation_matrix.get('deployable_assets', []):
                if asset.get('requires_ri') and not asset.get('bss_verified'):
                    filtered_assets.append(asset)
            filtered_matrix['deployable_assets'] = filtered_assets
            
        elif filter_type == 'not_migrated':
            # Filter: Servers not migrated/provisioned at all
            filtered_assets = []
            for asset in reconciliation_matrix.get('deployable_assets', []):
                if not asset.get('live_match'):
                    filtered_assets.append(asset)
            filtered_matrix['deployable_assets'] = filtered_assets
            
        elif filter_type == 'marked_for_deletion':
            # Filter: Servers migrated but will not be kept (in live but not quoted)
            # This requires checking live inventory against quoted assets
            # For now, we'll filter assets that are in live but have status indicating deletion
            filtered_assets = []
            for asset in reconciliation_matrix.get('deployable_assets', []):
                if asset.get('live_match') and asset.get('status') == 'DEPLOYED_BUT_NOT_QUOTED':
                    filtered_assets.append(asset)
            filtered_matrix['deployable_assets'] = filtered_assets
            
        elif filter_type == 'pending_config':
            # Filter: Servers pending customer side configuration
            # This would require additional metadata about configuration status
            # For now, filter assets that are deployed but have pending configurations
            filtered_assets = []
            for asset in reconciliation_matrix.get('deployable_assets', []):
                if asset.get('live_match') and asset.get('pending_configuration'):
                    filtered_assets.append(asset)
            filtered_matrix['deployable_assets'] = filtered_assets
        
        # Recalculate summary for filtered view
        if filter_type != 'all':
            filtered_matrix['summary'] = self._calculate_filtered_summary(filtered_matrix)
        
        filtered_matrix['active_filter'] = filter_type
        return filtered_matrix
    
    def _calculate_filtered_summary(self, filtered_matrix: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate summary for filtered view."""
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
        
        # Also filter account assets if needed
        account_assets = []
        for asset in filtered_matrix.get('account_assets', []):
            if asset.get('status') == 'MISSING_ACCOUNT_SERVICE':
                account_assets.append(asset)
                summary['missing_account_services'] += 1
        
        filtered_matrix['account_assets'] = account_assets
        
        return summary
    
    def get_filter_counts(self, reconciliation_matrix: Dict[str, Any]) -> Dict[str, int]:
        """Get counts for each filter category."""
        counts = {
            'pending_ri': 0,
            'not_migrated': 0,
            'marked_for_deletion': 0,
            'pending_config': 0,
            'all': len(reconciliation_matrix.get('deployable_assets', []))
        }
        
        for asset in reconciliation_matrix.get('deployable_assets', []):
            # Pending RI: requires RI but not verified
            if asset.get('requires_ri') and not asset.get('bss_verified'):
                counts['pending_ri'] += 1
            
            # Not migrated: quoted but not in live
            if not asset.get('live_match'):
                counts['not_migrated'] += 1
            
            # Marked for deletion: in live but not quoted
            if asset.get('live_match') and asset.get('status') == 'DEPLOYED_BUT_NOT_QUOTED':
                counts['marked_for_deletion'] += 1
            
            # Pending config: requires customer configuration
            if asset.get('pending_configuration'):
                counts['pending_config'] += 1
        
        return counts