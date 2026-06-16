"""
Intelligent Migration Tool Recommendation Engine
Analyzes Target Architecture (mapperNodes) and recommends optimal Huawei Cloud migration tools
"""

from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

# Identifiers matching the frontend Dropdown options
COMPUTE_TYPES = ['ECS', 'BMS', 'VM', 'CCE', 'SERVER']
DB_TYPES = ['RDS', 'GAUSSDB', 'DB', 'DATABASE', 'DCS']
STORAGE_TYPES = ['OBS', 'SFS', 'EVS', 'CBR', 'STORAGE']
NETWORK_TYPES = ['VPC', 'SUBNET', 'EIP', 'NAT', 'VPN', 'CGW', 'VPN-CONN', 'ELB', 'CDN']
SECURITY_TYPES = ['SG', 'WAF', 'HSS', 'ANTI-DDOS']

class ToolRecommender:
    """Recommends migration tools based on finalized Target Architecture"""
    
    @staticmethod
    def analyze_target_architecture(target_architecture: List[Dict]) -> Dict:
        """Analyze the array of reconciled nodes from Topology Mapper"""
        recommendations = []
        
        for node in target_architecture:
            node_type = str(node.get("type", "")).upper()
            
            if any(c in node_type for c in COMPUTE_TYPES):
                rec = ToolRecommender._recommend_for_server(node)
            elif any(d in node_type for d in DB_TYPES):
                rec = ToolRecommender._recommend_for_database(node)
            elif any(s in node_type for s in STORAGE_TYPES):
                rec = ToolRecommender._recommend_for_storage(node)
            elif any(n in node_type for n in NETWORK_TYPES) or any(sec in node_type for sec in SECURITY_TYPES):
                rec = ToolRecommender._recommend_for_network_security(node)
            else:
                rec = ToolRecommender._recommend_for_generic(node)
            
            if rec:
                recommendations.append(rec)
        
        summary = ToolRecommender._generate_summary(recommendations, len(target_architecture))
        
        return {
            "recommendations": recommendations,
            "summary": summary
        }
    
    @staticmethod
    def _recommend_for_server(server: Dict) -> Dict:
        """Recommend migration tool for a compute server"""
        os_type = str(server.get("os", "")).lower()
        name = server.get("name", "Unknown Compute Node")
        
        if "win" in os_type:
            return {
                "resource_type": server.get("type", "Compute"),
                "resource_name": name,
                "primary_tool": "sms",
                "primary_reason": "Windows OS strictly requires SMS Block-Level agent for VSS/Registry state consistency.",
                "fallback_tool": "ssh_disk_copy",
                "fallback_reason": "If SMS network check fails, use manual VHD export to OBS.",
                "confidence": 0.95,
                "estimated_duration": "4-8 hours",
                "prerequisites": ["SMS agent installation", "TCP port 8900 open outbound"]
            }
        else:
            return {
                "resource_type": server.get("type", "Compute"),
                "resource_name": name,
                "primary_tool": "sms",
                "primary_reason": "Huawei SMS preferred for Linux block-level replication and automated driver injection.",
                "fallback_tool": "manual",
                "fallback_reason": "If SMS is incompatible, deploy blank ECS and perform File-level Rsync.",
                "confidence": 0.85,
                "estimated_duration": "2-4 hours",
                "prerequisites": ["Root access", "Network connectivity to Huawei Cloud"]
            }
    
    @staticmethod
    def _recommend_for_database(db: Dict) -> Dict:
        """Recommend migration tool for a database"""
        name = db.get("name", "Unknown Database")
        db_type = str(db.get("type", "")).upper()
        
        if "GAUSS" in db_type:
            return {
                "resource_type": db.get("type", "Database"),
                "resource_name": name,
                "primary_tool": "ugo",
                "primary_reason": "Targeting GaussDB requires UGO for syntax translation and DRS for payload sync.",
                "fallback_tool": "drs",
                "fallback_reason": "DRS alone if migrating between identical engine versions.",
                "confidence": 0.95,
                "estimated_duration": "1-3 days",
                "prerequisites": ["UGO Assessment Report", "Network connectivity"]
            }
        elif "DCS" in db_type:
            return {
                "resource_type": db.get("type", "Cache"),
                "resource_name": name,
                "primary_tool": "drs",
                "primary_reason": "DCS (Redis/Memcached) utilizes native DRS synchronization.",
                "fallback_tool": "manual",
                "fallback_reason": "Manual RDB dump and restore.",
                "confidence": 0.90,
                "estimated_duration": "1-3 hours",
                "prerequisites": []
            }
        else:
            return {
                "resource_type": db.get("type", "Database"),
                "resource_name": name,
                "primary_tool": "drs",
                "primary_reason": "RDS databases require logical Data Replication Service (DRS) to ensure Zero-Downtime cutover.",
                "fallback_tool": "manual",
                "fallback_reason": "Native DB dump (e.g. pg_dump / mysqldump) via OBS.",
                "confidence": 0.95,
                "estimated_duration": "4-12 hours",
                "prerequisites": ["Enable Logical Decoding / BinLogs"]
            }
    
    @staticmethod
    def _recommend_for_storage(storage: Dict) -> Dict:
        """Recommend migration tool for storage resources"""
        name = storage.get("name", "Unknown Storage")
        storage_type = str(storage.get("type", "")).upper()
        
        if "OBS" in storage_type:
            return {
                "resource_type": storage.get("type", "Storage"),
                "resource_name": name,
                "primary_tool": "oms",
                "primary_reason": "Object Migration Service (OMS) provides high-speed API replication for S3/Blob to OBS.",
                "fallback_tool": "cdm",
                "fallback_reason": "Use CDM for highly complex data transformations.",
                "confidence": 0.95,
                "estimated_duration": "Depends on network limits",
                "prerequisites": ["Source API Keys (AK/SK)"]
            }
        else:
            return {
                "resource_type": storage.get("type", "Storage"),
                "resource_name": name,
                "primary_tool": "manual",
                "primary_reason": "File Shares (SFS) or Block Volumes (EVS) require OS-level sync (rsync) or physical disk import.",
                "fallback_tool": "des",
                "fallback_reason": "Data Express Service (DES) for petabyte-scale physical transfer.",
                "confidence": 0.80,
                "estimated_duration": "Depends on network limits",
                "prerequisites": ["Mount points accessible"]
            }
    
    @staticmethod
    def _recommend_for_network_security(network: Dict) -> Dict:
        """Network and Security resources"""
        return {
            "resource_type": network.get("type", "Network/Security"),
            "resource_name": network.get("name", "Unknown Resource"),
            "primary_tool": "manual",
            "primary_reason": "Infrastructure configuration to be provisioned via IaC (Terraform) or console.",
            "fallback_tool": "manual",
            "fallback_reason": "",
            "confidence": 1.0,
            "estimated_duration": "1 hour",
            "prerequisites": ["Landing Zone deployment"]
        }

    @staticmethod
    def _recommend_for_generic(resource: Dict) -> Dict:
        """Catch-all for support plans, functions, etc."""
        return {
            "resource_type": resource.get("type", "Other"),
            "resource_name": resource.get("name", "Unknown Resource"),
            "primary_tool": "manual",
            "primary_reason": "Platform-specific resource requiring manual configuration or recreation.",
            "fallback_tool": "manual",
            "fallback_reason": "",
            "confidence": 1.0,
            "estimated_duration": "TBD",
            "prerequisites": []
        }
    
    @staticmethod
    def _generate_summary(recommendations: List[Dict], total_resources: int) -> Dict:
        """Generate summary with Huawei Cloud migration insights"""
        tool_counts = {}
        for rec in recommendations:
            primary = rec.get("primary_tool")
            tool_counts[primary] = tool_counts.get(primary, 0) + 1
        
        complexity_factors = {
            "ugo": 3, "des": 3, "cdm": 2, "drs": 2, "ssh_disk_copy": 2,
            "sms": 1, "mgc": 1, "oms": 1, "manual": 1
        }
        
        complexity_score = sum(complexity_factors.get(rec.get("primary_tool", ""), 1) for rec in recommendations)
        avg_complexity = complexity_score / len(recommendations) if recommendations else 0
        
        if avg_complexity >= 2.0:
            complexity = "High"
            risk = "Medium-High"
        elif avg_complexity >= 1.3:
            complexity = "Medium"
            risk = "Medium"
        else:
            complexity = "Low"
            risk = "Low"
        
        primary_tool = "manual"
        if tool_counts:
            primary_tool = max(tool_counts.items(), key=lambda x: x[1])[0]
        
        return {
            "total_resources": total_resources,
            "recommended_tools": tool_counts,
            "estimated_timeline": "1 - 3 Weeks", 
            "risk_assessment": risk,
            "migration_complexity": complexity,
            "primary_tool": primary_tool,
            "huawei_best_practices": [
                "Deploy network and security Landing Zone BEFORE initiating sync.",
                "Use SMS for OS consistency, DRS for database zero-downtime.",
                "Utilize OMS for serverless object transfer to bypass VPN limits."
            ]
        }
    
    @staticmethod
    def generate_wbs_tasks(recommendations: Dict, project_type: str = "execution") -> List[Dict]:
        """Generate WBS tasks from recommendations"""
        wbs_tasks = []
        rec_list = recommendations.get("recommendations", [])
        tool_summary = recommendations.get("summary", {}).get("recommended_tools", {})
        
        if project_type == "proposal":
            task_id = 1
            for tool_id, count in tool_summary.items():
                wbs_tasks.append({
                    "id": f"{task_id}",
                    "name": f"Migrate {count} resources using {tool_id.upper()}",
                    "prog": "0%",
                    "resp": "Migration Team",
                    "start": "",
                    "end": "",
                    "isParent": False,
                    "notes": f"Tooling: {tool_id.upper()}"
                })
                task_id += 1
            
            wbs_tasks.extend([
                {"id": "PLAN", "name": "Migration Planning & Design", "prog": "0%", "resp": "Solution Architect", "start": "", "end": "", "isParent": True, "notes": "High-level design and planning"},
                {"id": "EXEC", "name": "Migration Execution", "prog": "0%", "resp": "Migration Team", "start": "", "end": "", "isParent": True, "notes": "Technical implementation"},
                {"id": "VALID", "name": "Validation & Cutover", "prog": "0%", "resp": "QA Team", "start": "", "end": "", "isParent": True, "notes": "Testing and go-live"}
            ])
        else:
            task_counter = 1
            for rec in rec_list:
                wbs_tasks.append({
                    "id": f"T{task_counter:03d}",
                    "name": f"Migrate {rec['resource_name']} ({rec['resource_type']})",
                    "prog": "0%",
                    "resp": "Migration Engineer",
                    "start": "",
                    "end": "",
                    "isParent": False,
                    "notes": f"Primary: {rec['primary_tool']}, Fallback: {rec.get('fallback_tool', 'N/A')}. {rec['primary_reason']}",
                    "tool_id": rec["primary_tool"],
                    "resource_type": rec["resource_type"],
                    "estimated_duration": rec["estimated_duration"]
                })
                task_counter += 1
        
        return wbs_tasks
