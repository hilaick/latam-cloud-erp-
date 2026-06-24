import logging
from typing import Dict, List, Any, Optional
from services.huawei_discovery import HuaweiDiscovery

logger = logging.getLogger(__name__)

class ECSRIReconciler:
    """
    ECS-specific RI Reconciliation with 4 filter categories.
    Focuses only on ECS servers (since only ECS can have RIs).
    """
    def __init__(self, encrypted_ak_data: Any, encrypted_sk_data: Any, region: str, master_password: str):
        self.discovery = HuaweiDiscovery(encrypted_ak_data, encrypted_sk_data, region, master_password)
    
    def get_ecs_servers_with_ri_status(self) -> List[Dict]:
        """
        Get all ECS servers with RI status.
        Returns list of servers with: id, name, flavor, billing_mode, is_reserved_instance, tags
        """
        try:
            inventory = self.discovery.discover_all()
            ecs_servers = []
            
            for server in inventory.get("compute", []):
                # Only include ECS servers
                if server.get("type") == "ECS":
                    ecs_servers.append({
                        "id": server.get("id"),
                        "name": server.get("name"),
                        "flavor": server.get("flavor", "Unknown"),
                        "billing_mode": server.get("billing_mode", "Unknown"),
                        "charging_mode": server.get("charging_mode", "Unknown"),
                        "is_reserved_instance": server.get("is_reserved_instance", False),
                        "region": server.get("region", "Unknown"),
                        "private_ip": server.get("private_ip_address", "N/A"),
                        # Tags would come from server metadata or a separate tags API
                        "tags": self._extract_tags_from_server(server)
                    })
            
            return ecs_servers
            
        except Exception as e:
            logger.error(f"Error getting ECS servers: {e}", exc_info=True)
            return []
    
    def _extract_tags_from_server(self, server: Dict) -> Dict:
        """
        Extract tags from server metadata.
        In production, this would call Huawei Cloud API to get server tags.
        """
        tags = {}
        
        # Check if server has metadata with tags
        metadata = server.get("metadata")
        if metadata:
            if isinstance(metadata, dict):
                # Extract tags from metadata
                for key, value in metadata.items():
                    if isinstance(value, str) and ('tag' in key.lower() or 'label' in key.lower()):
                        tags[key] = value
        
        return tags
    
    def reconcile_ecs_ris(
        self, 
        quoted_ecs_ris: List[Dict],  # From Price Calculator RI upload
        live_ecs_servers: Optional[List[Dict]] = None
    ) -> Dict:
        """
        3-Way Reconciliation for ECS RIs with 4 filter categories.
        
        Args:
            quoted_ecs_ris: List of quoted ECS RIs with:
                - specification (flavor)
                - quantity
                - name
                - tags: {marked_for_deletion: bool, pending_config: bool, pending_license: bool}
            live_ecs_servers: Optional pre-fetched live ECS servers
        
        Returns:
            {
                "summary": {
                    "total_quoted": X,
                    "total_live": Y,
                    "total_with_ri": Z,
                    "by_specification": {...}
                },
                "filter_counts": {
                    "pending_ri": A,      # Quoted but not bought
                    "not_migrated": B,     # Quoted, not migrated at all
                    "marked_for_deletion": C,  # Quoted, migrated, tagged for deletion
                    "pending_config": D    # Quoted, migrated, needs config/license
                },
                "detailed_results": [...]
            }
        """
        if live_ecs_servers is None:
            live_ecs_servers = self.get_ecs_servers_with_ri_status()
        
        # Group live servers by specification
        live_by_spec = {}
        for server in live_ecs_servers:
            spec = server.get("flavor", "Unknown")
            if spec not in live_by_spec:
                live_by_spec[spec] = []
            live_by_spec[spec].append(server)
        
        # Group live servers with RI by specification
        ri_by_spec = {}
        for server in live_ecs_servers:
            if server.get("is_reserved_instance", False):
                spec = server.get("flavor", "Unknown")
                if spec not in ri_by_spec:
                    ri_by_spec[spec] = []
                ri_by_spec[spec].append(server)
        
        results = {
            "summary": {
                "total_quoted": len(quoted_ecs_ris),
                "total_live": len(live_ecs_servers),
                "total_with_ri": sum(1 for s in live_ecs_servers if s.get("is_reserved_instance", False)),
                "by_specification": {}
            },
            "filter_counts": {
                "pending_ri": 0,
                "not_migrated": 0,
                "marked_for_deletion": 0,
                "pending_config": 0
            },
            "detailed_results": []
        }
        
        # Process each quoted ECS RI
        for quoted in quoted_ecs_ris:
            spec = quoted.get("specification", "Unknown")
            quoted_qty = quoted.get("quantity", 1)
            quoted_name = quoted.get("name", "")
            quoted_tags = quoted.get("tags", {})
            
            # Get live servers with this specification
            live_servers = live_by_spec.get(spec, [])
            live_count = len(live_servers)
            
            # Get RIs with this specification
            ri_servers = ri_by_spec.get(spec, [])
            ri_count = len(ri_servers)
            
            # Determine filter category
            filter_category = self._determine_filter_category(
                quoted_qty, live_count, ri_count, quoted_tags
            )
            
            # Update filter counts
            if filter_category == "pending_ri":
                shortage = max(0, quoted_qty - ri_count)
                results["filter_counts"]["pending_ri"] += shortage
            elif filter_category == "not_migrated":
                results["filter_counts"]["not_migrated"] += quoted_qty
            elif filter_category == "marked_for_deletion":
                results["filter_counts"]["marked_for_deletion"] += live_count
            elif filter_category == "pending_config":
                results["filter_counts"]["pending_config"] += live_count
            
            # Store detailed result
            detailed = {
                "specification": spec,
                "quoted_name": quoted_name,
                "quoted_qty": quoted_qty,
                "live_qty": live_count,
                "ri_qty": ri_count,
                "shortage": max(0, quoted_qty - ri_count),
                "filter_category": filter_category,
                "tags": quoted_tags,
                "live_servers": [
                    {
                        "id": s.get("id"),
                        "name": s.get("name"),
                        "has_ri": s.get("is_reserved_instance", False),
                        "billing_mode": s.get("billing_mode")
                    }
                    for s in live_servers
                ],
                "ri_servers": [
                    {
                        "id": r.get("id"),
                        "name": r.get("name"),
                        "billing_mode": r.get("billing_mode")
                    }
                    for r in ri_servers
                ]
            }
            
            results["detailed_results"].append(detailed)
            
            # Update summary by specification
            if spec not in results["summary"]["by_specification"]:
                results["summary"]["by_specification"][spec] = {
                    "quoted": 0,
                    "live": 0,
                    "with_ri": 0,
                    "shortage": 0,
                    "filter_category": filter_category
                }
            
            results["summary"]["by_specification"][spec]["quoted"] += quoted_qty
            results["summary"]["by_specification"][spec]["live"] += live_count
            results["summary"]["by_specification"][spec]["with_ri"] += ri_count
            results["summary"]["by_specification"][spec]["shortage"] += max(0, quoted_qty - ri_count)
            # Update filter category if more severe
            current_cat = results["summary"]["by_specification"][spec]["filter_category"]
            severity = {"pending_ri": 3, "not_migrated": 2, "marked_for_deletion": 1, "pending_config": 0}
            if severity.get(filter_category, 0) > severity.get(current_cat, 0):
                results["summary"]["by_specification"][spec]["filter_category"] = filter_category
        
        return results
    
    def _determine_filter_category(
        self, 
        quoted_qty: int, 
        live_count: int, 
        ri_count: int, 
        tags: Dict
    ) -> str:
        """
        Determine which of the 4 filter categories applies.
        
        Priority:
        1. not_migrated - quoted but no live servers at all
        2. marked_for_deletion - quoted, migrated, but tagged for deletion
        3. pending_config - quoted, migrated, needs config/license
        4. pending_ri - quoted, migrated, but missing RIs
        """
        if live_count == 0:
            return "not_migrated"
        
        if tags.get("marked_for_deletion") == True or tags.get("marked_for_deletion") == "true":
            return "marked_for_deletion"
        
        if (tags.get("pending_config") == True or tags.get("pending_config") == "true" or 
            tags.get("pending_license") == True or tags.get("pending_license") == "true"):
            return "pending_config"
        
        if ri_count < quoted_qty:
            return "pending_ri"
        
        # If all RIs are covered, return "covered" (not a filter category)
        return "covered"
    
    def get_console_ri_specifications(self) -> Dict[str, int]:
        """
        Get RI specifications from Huawei Cloud Console.
        Returns dict of {specification: count}
        """
        # This would call Huawei Cloud API to get RI list
        # For now, return empty dict
        return {}
    
    def parse_ri_quotation(self, quotation_data: Dict) -> List[Dict]:
        """
        Parse Price Calculator RI quotation data.
        Expected format: List of ECS RI items with specification, quantity, name, tags
        """
        ri_items = []
        
        # Extract ECS RI items from quotation data
        # This would parse the actual Price Calculator Excel/CSV format
        # For now, return empty list
        return ri_items