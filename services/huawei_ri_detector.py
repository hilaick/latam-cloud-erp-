import logging
from typing import Dict, List, Any
from services.huawei_discovery import HuaweiDiscovery

logger = logging.getLogger(__name__)

class HuaweiRIDetector:
    """
    Detects Reserved Instances (RIs) from live Huawei Cloud resources.
    Uses HuaweiDiscovery to get live inventory and identifies RIs by billing_mode='1' or charging_mode='prePaid'.
    """
    def __init__(self, encrypted_ak_data: Any, encrypted_sk_data: Any, region: str, master_password: str):
        self.discovery = HuaweiDiscovery(encrypted_ak_data, encrypted_sk_data, region, master_password)
    
    def get_live_ri_inventory(self) -> Dict[str, List[Dict]]:
        """
        Get live inventory and filter for Reserved Instances only.
        Returns aggregated RIs by specification.
        """
        try:
            # Get full live inventory
            inventory = self.discovery.discover_all()
            
            # Filter for Reserved Instances
            ri_inventory = {
                "compute_ris": [],
                "summary": {
                    "total_ris": 0,
                    "by_specification": {},
                    "by_region": {}
                }
            }
            
            # Process compute resources
            for server in inventory.get("compute", []):
                if server.get("is_reserved_instance", False):
                    ri_inventory["compute_ris"].append(server)
                    
                    # Aggregate by specification
                    spec = server.get("flavor", "Unknown")
                    ri_inventory["summary"]["by_specification"][spec] = ri_inventory["summary"]["by_specification"].get(spec, 0) + 1
                    
                    # Aggregate by region
                    region = server.get("region", "Unknown")
                    ri_inventory["summary"]["by_region"][region] = ri_inventory["summary"]["by_region"].get(region, 0) + 1
            
            ri_inventory["summary"]["total_ris"] = len(ri_inventory["compute_ris"])
            
            return ri_inventory
            
        except Exception as e:
            logger.error(f"Error getting live RI inventory: {e}", exc_info=True)
            return {"compute_ris": [], "summary": {"total_ris": 0, "by_specification": {}, "by_region": {}}}
    
    def reconcile_live_ris_with_intent(self, commercial_intent: dict, live_inventory: dict = None) -> dict:
        """
        3-Way Reconciliation: Quoted RIs vs Live Servers vs Actual RIs
        
        Args:
            commercial_intent: Blueprint commercial intent with deployable_assets
            live_inventory: Optional pre-fetched live inventory (will fetch if None)
        
        Returns:
            Reconciliation matrix with filter counts for 4 categories
        """
        if live_inventory is None:
            live_inventory = self.discovery.discover_all()
        
        # Get live RIs
        ri_inventory = self.get_live_ri_inventory()
        
        # Get all live servers (including non-RI)
        live_servers = live_inventory.get("compute", [])
        
        reconciliation_matrix = {
            "aggregated_deployable": [],
            "account_assets": [],
            "summary": {
                "covered": 0,
                "missing_ri": 0,
                "missing_account_services": 0,
                "pending_ri": 0,
                "not_migrated": 0,
                "marked_for_deletion": 0,
                "pending_config": 0
            },
            "filter_counts": {
                "pending_ri": 0,
                "not_migrated": 0,
                "marked_for_deletion": 0,
                "pending_config": 0
            },
            "three_way_comparison": {
                "quoted_ris": [],
                "live_servers": [],
                "actual_ris": []
            }
        }
        
        # 1. AGGREGATE QUOTED DEPLOYABLE ASSETS
        aggregation = {}
        for asset in commercial_intent.get('deployable_assets', []):
            intent_mode = str(asset.get('billing_mode', 'Pay-per-use')).lower()
            requires_ri = 'year' in intent_mode or 'month' in intent_mode or 'pre-paid' in intent_mode
            spec = asset.get('specification', 'Standard')
            cat_type = asset.get('type', 'Unknown')
            
            # Create a unique key for grouping
            key = f"{cat_type}_{spec}_{intent_mode}"
            
            if key not in aggregation:
                aggregation[key] = {
                    "type": cat_type,
                    "specification": spec,
                    "billing_mode": asset.get('billing_mode', 'Pay-per-use'),
                    "requires_ri": requires_ri,
                    "required_qty": 0,
                    "live_qty": 0,  # Actually deployed servers
                    "ri_qty": 0,    # Servers with RI
                    "status": "pending_ri",  # Default status
                    "filter_category": "pending_ri"
                }
            aggregation[key]["required_qty"] += 1
        
        # 2. COUNT LIVE SERVERS BY SPECIFICATION
        live_counts = {}
        for server in live_servers:
            spec = server.get("flavor", "Unknown")
            live_counts[spec] = live_counts.get(spec, 0) + 1
            
            # Add to three-way comparison
            reconciliation_matrix["three_way_comparison"]["live_servers"].append({
                "id": server.get("id"),
                "name": server.get("name"),
                "specification": spec,
                "billing_mode": server.get("billing_mode"),
                "is_ri": server.get("is_reserved_instance", False),
                "region": server.get("region")
            })
        
        # 3. COUNT ACTUAL RIs BY SPECIFICATION
        ri_counts = {}
        for ri in ri_inventory["compute_ris"]:
            spec = ri.get("flavor", "Unknown")
            ri_counts[spec] = ri_counts.get(spec, 0) + 1
            
            # Add to three-way comparison
            reconciliation_matrix["three_way_comparison"]["actual_ris"].append({
                "id": ri.get("id"),
                "name": ri.get("name"),
                "specification": spec,
                "billing_mode": ri.get("billing_mode"),
                "region": ri.get("region")
            })
        
        # 4. RECONCILE QUOTED vs LIVE vs RI
        for key, data in aggregation.items():
            spec = data["specification"]
            
            # Count live servers with this specification
            data["live_qty"] = live_counts.get(spec, 0)
            
            # Count RIs with this specification
            data["ri_qty"] = ri_counts.get(spec, 0)
            
            # Determine status and filter category
            if data["requires_ri"]:
                if data["ri_qty"] >= data["required_qty"]:
                    data["status"] = "COVERED"
                    data["filter_category"] = "covered"
                    reconciliation_matrix["summary"]["covered"] += data["required_qty"]
                else:
                    missing = data["required_qty"] - data["ri_qty"]
                    data["status"] = "MISSING_RI"
                    data["filter_category"] = "pending_ri"
                    reconciliation_matrix["summary"]["missing_ri"] += missing
                    reconciliation_matrix["filter_counts"]["pending_ri"] += missing
                    
                    # Check if deployed but not RI
                    if data["live_qty"] > data["ri_qty"]:
                        not_migrated = min(data["live_qty"] - data["ri_qty"], missing)
                        reconciliation_matrix["filter_counts"]["not_migrated"] += not_migrated
            else:
                # Pay-per-use doesn't need RI
                data["status"] = "COVERED"
                data["filter_category"] = "covered"
                reconciliation_matrix["summary"]["covered"] += data["required_qty"]
            
            # Add to three-way comparison for quoted
            reconciliation_matrix["three_way_comparison"]["quoted_ris"].append({
                "specification": spec,
                "required_qty": data["required_qty"],
                "type": data["type"],
                "billing_mode": data["billing_mode"]
            })
            
            reconciliation_matrix["aggregated_deployable"].append(data)
        
        # 5. PROCESS ACCOUNT ASSETS (Support Plans, etc.)
        for asset in commercial_intent.get('account_assets', []):
            intent_mode = str(asset.get('billing_mode', 'Pay-per-use')).lower()
            requires_ri = 'year' in intent_mode or 'month' in intent_mode or 'pre-paid' in intent_mode
            
            # For now, mark all account assets as pending_config
            status = "PENDING_CONFIG" if requires_ri else "COVERED"
            filter_cat = "pending_config" if requires_ri else "covered"
            
            if requires_ri and status == "PENDING_CONFIG":
                reconciliation_matrix["filter_counts"]["pending_config"] += 1
            
            reconciliation_matrix["account_assets"].append({
                **asset,
                "requires_ri": requires_ri,
                "status": status,
                "filter_category": filter_cat
            })
        
        return reconciliation_matrix