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
            
            # Filter for Reserved Instances (ECS only)
            ri_inventory = {
                "compute_ris": [],
                "summary": {
                    "total_ris": 0,
                    "by_specification": {},
                    "by_region": {}
                }
            }
            
            # Process compute resources (only ECS servers can have RIs)
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
    
    def reconcile_ri_quotation_vs_live_vs_bought(
        self, 
        quotation_ris: List[Dict],  # From Price Calculator RI upload
        live_inventory: dict = None
    ) -> dict:
        """
        3-Way Reconciliation: Quoted RIs vs Live Servers vs Actual RIs
        with 4 filter categories.
        
        Args:
            quotation_ris: List of RI items from Price Calculator
                Each item should have: specification, quantity, billing_mode, name, tags
            live_inventory: Optional pre-fetched live inventory
        
        Returns:
            Reconciliation matrix with 4 filter categories
        """
        if live_inventory is None:
            live_inventory = self.discovery.discover_all()
        
        # Get live RIs (bought RIs)
        bought_ris = self.get_live_ri_inventory()
        
        # Get all live servers
        live_servers = live_inventory.get("compute", [])
        
        # Filter quotation_ris to only include ECS resources
        # Remove VPN, NAT Gateway, and other non-ECS resources
        ecs_quotation_ris = []
        non_ecs_count = 0
        
        for quoted in quotation_ris:
            resource_type = str(quoted.get("type", "") or "").lower()
            resource_name = str(quoted.get("name", "") or "").lower()
            resource_spec = str(quoted.get("specification", "") or "").lower()
            
            # Skip non-ECS resources
            if resource_type and any(non_ecs in resource_type for non_ecs in ["vpn", "nat gateway", "nat", "gateway", "elastic ip", "eip", "vpc", "direct connect", "cdn", "waf", "firewall", "security", "storage", "database", "rds", "redis", "dcs"]):
                non_ecs_count += quoted.get("quantity", 1)
                continue
            if resource_name and any(non_ecs in resource_name for non_ecs in ["vpn", "nat gateway", "nat", "gateway", "elastic ip", "eip", "vpc", "direct connect", "cdn", "waf", "firewall", "security", "storage", "database", "rds", "redis", "dcs"]):
                non_ecs_count += quoted.get("quantity", 1)
                continue
            if resource_spec and any(non_ecs in resource_spec for non_ecs in ["vpn", "nat gateway", "nat", "gateway", "elastic ip", "eip", "vpc", "direct connect", "cdn", "waf", "firewall", "security", "storage", "database", "rds", "redis", "dcs"]):
                non_ecs_count += quoted.get("quantity", 1)
                continue
                
            # Include ECS resources
            ecs_quotation_ris.append(quoted)
        
        if non_ecs_count > 0:
            logger.info(f"Filtered out {non_ecs_count} non-ECS resources from quoted RIs")
        
        # Initialize results
        results = {
            "quoted_ris": ecs_quotation_ris,
            "live_servers": [],
            "bought_ris": bought_ris["compute_ris"],
            "reconciliation": [],
            "filter_counts": {
                "pending_ri": 0,           # Quoted but not bought
                "not_migrated": 0,         # Quoted, not migrated (no live server)
                "marked_for_deletion": 0,   # Quoted, migrated, but tagged for deletion
                "pending_config": 0         # Quoted, migrated, needs config/license
            },
            "summary": {
                "total_quoted": len(ecs_quotation_ris),
                "total_live": len(live_servers),
                "total_bought": len(bought_ris["compute_ris"]),
                "by_specification": {}
            }
        }
        
        # Process each quoted ECS RI
        for quoted in ecs_quotation_ris:
            spec = quoted.get("specification", "Unknown")
            quoted_qty = quoted.get("quantity", 1)
            quoted_name = quoted.get("name", "")
            quoted_tags = quoted.get("tags", {})
            
            # Count live servers with this specification
            live_count = 0
            live_servers_for_spec = []
            for server in live_servers:
                if server.get("flavor", "Unknown") == spec:
                    live_count += 1
                    live_servers_for_spec.append(server)
            
            # Count bought RIs with this specification
            bought_count = 0
            bought_ris_for_spec = []
            for ri in bought_ris["compute_ris"]:
                if ri.get("flavor", "Unknown") == spec:
                    bought_count += 1
                    bought_ris_for_spec.append(ri)
            
            # Determine filter category
            filter_category = "pending_ri"  # Default
            
            if live_count == 0:
                # Not migrated at all
                filter_category = "not_migrated"
            elif quoted_tags.get("marked_for_deletion") == "true":
                # Marked for deletion
                filter_category = "marked_for_deletion"
            elif quoted_tags.get("pending_config") == "true" or quoted_tags.get("pending_license") == "true":
                # Needs configuration or license
                filter_category = "pending_config"
            elif bought_count < quoted_qty:
                # Has RIs but not enough
                filter_category = "pending_ri"
            
            # Update filter counts
            if filter_category == "pending_ri":
                results["filter_counts"]["pending_ri"] += max(0, quoted_qty - bought_count)
            elif filter_category == "not_migrated":
                results["filter_counts"]["not_migrated"] += quoted_qty
            elif filter_category == "marked_for_deletion":
                results["filter_counts"]["marked_for_deletion"] += live_count
            elif filter_category == "pending_config":
                results["filter_counts"]["pending_config"] += live_count
            
            # Store reconciliation result
            reconciliation_item = {
                "specification": spec,
                "quoted_name": quoted_name,
                "quoted_qty": quoted_qty,
                "live_qty": live_count,
                "bought_qty": bought_count,
                "shortage": max(0, quoted_qty - bought_count),
                "filter_category": filter_category,
                "tags": quoted_tags,
                "live_servers": [{"id": s.get("id"), "name": s.get("name"), "is_ri": s.get("is_reserved_instance", False)} 
                                 for s in live_servers_for_spec],
                "bought_ris": [{"id": r.get("id"), "name": r.get("name")} for r in bought_ris_for_spec]
            }
            
            results["reconciliation"].append(reconciliation_item)
            
            # Update summary by specification
            if spec not in results["summary"]["by_specification"]:
                results["summary"]["by_specification"][spec] = {
                    "quoted": 0,
                    "live": 0,
                    "bought": 0,
                    "shortage": 0
                }
            
            results["summary"]["by_specification"][spec]["quoted"] += quoted_qty
            results["summary"]["by_specification"][spec]["live"] += live_count
            results["summary"]["by_specification"][spec]["bought"] += bought_count
            results["summary"]["by_specification"][spec]["shortage"] += max(0, quoted_qty - bought_count)
        
        return results
    
    def get_ri_specifications_from_console(self) -> List[Dict]:
        """
        Simulates getting RI specifications from Huawei Cloud Console.
        In production, this would call Huawei Cloud API to get RI list.
        """
        # This is a placeholder - in production, call Huawei Cloud API
        # For now, return empty list
        return []
    
    def get_quotation_ris(self, project_id: str) -> List[Dict]:
        """
        Get RI items from Price Calculator quotation for a project.
        This should extract RI items (not PPU) from the quotation.
        """
        # TODO: Implement this to parse Price Calculator RI data
        # For now, return empty list
        return []