"""
Intelligent Migration Tool Recommendation Engine
Analyzes discovered infrastructure and recommends optimal Huawei Cloud migration tools
"""

from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class ToolRecommender:
    """Recommends migration tools based on discovered infrastructure"""
    
    @staticmethod
    def analyze_discovery_data(discovery_data: Dict, is_blueprint: bool = False) -> Dict:
        """Analyze discovered infrastructure and return tool recommendations"""
        recommendations = []
        
        # Analyze compute resources
        for server in discovery_data.get("compute", []):
            rec = ToolRecommender._recommend_for_server(server)
            if rec:
                recommendations.append(rec)
        
        # Analyze database resources
        for db in discovery_data.get("databases", []):
            rec = ToolRecommender._recommend_for_database(db)
            if rec:
                recommendations.append(rec)
        
        # Analyze storage resources
        for storage in discovery_data.get("storage", []):
            rec = ToolRecommender._recommend_for_storage(storage)
            if rec:
                recommendations.append(rec)
        
        # Analyze network resources
        for network in discovery_data.get("network", []):
            rec = ToolRecommender._recommend_for_network(network)
            if rec:
                recommendations.append(rec)
        
        summary = ToolRecommender._generate_summary(recommendations, discovery_data)
        summary["source_type"] = "blueprint" if is_blueprint else "discovery"
        summary["is_blueprint"] = is_blueprint
        
        return {
            "recommendations": recommendations,
            "summary": summary
        }
    
    @staticmethod
    def _recommend_for_server(server: Dict) -> Dict:
        """Recommend migration tool for a compute server"""
        os_type = server.get("os", "").lower()
        hypervisor = server.get("hypervisor", "").lower()
        source = server.get("source", "").lower()
        
        # Huawei Cloud Best Practices
        if "windows" in os_type:
            return {
                "resource_type": "compute",
                "resource_name": server.get("name", "unknown"),
                "primary_tool": "sms",
                "primary_reason": "Windows OS requires SMS for consistent state migration",
                "fallback_tool": "ssh_disk_copy",
                "fallback_reason": "If SMS agent fails, use SSH disk copy with Volume Shadow Copy",
                "confidence": 0.9,
                "estimated_duration": "4-8 hours",
                "prerequisites": ["SMS agent installation", "TCP ports 8900, 8935 open"]
            }
        elif "vmware" in hypervisor or "esxi" in hypervisor:
            return {
                "resource_type": "compute",
                "resource_name": server.get("name", "unknown"),
                "primary_tool": "mgc",
                "primary_reason": "VMware environment - MgC for agentless migration at scale",
                "fallback_tool": "sms",
                "fallback_reason": "If vCenter access restricted, use SMS per-VM",
                "confidence": 0.85,
                "estimated_duration": "2-6 hours",
                "prerequisites": ["vCenter credentials", "Network connectivity to vCenter"]
            }
        elif "aws" in source or "ec2" in source:
            return {
                "resource_type": "compute",
                "resource_name": server.get("name", "unknown"),
                "primary_tool": "sms",
                "primary_reason": "AWS EC2 - SMS supports cross-cloud migration with AMI conversion",
                "fallback_tool": "ssh_disk_copy",
                "fallback_reason": "If SMS incompatible, use SSH with EBS snapshot export",
                "confidence": 0.8,
                "estimated_duration": "3-6 hours",
                "prerequisites": ["AWS credentials", "SMS agent installation"]
            }
        elif "azure" in source:
            return {
                "resource_type": "compute",
                "resource_name": server.get("name", "unknown"),
                "primary_tool": "sms",
                "primary_reason": "Azure VM - SMS supports Azure to Huawei Cloud with VHD conversion",
                "fallback_tool": "ssh_disk_copy",
                "fallback_reason": "If SMS fails, use SSH with Azure Disk export",
                "confidence": 0.8,
                "estimated_duration": "3-6 hours",
                "prerequisites": ["Azure credentials", "SMS agent installation"]
            }
        else:
            # Generic Linux/Unix - Huawei best practice: SMS first, SSH fallback
            return {
                "resource_type": "compute",
                "resource_name": server.get("name", "unknown"),
                "primary_tool": "sms",
                "primary_reason": "Huawei SMS preferred for Linux (block-level replication)",
                "fallback_tool": "ssh_disk_copy",
                "fallback_reason": "SSH disk copy if SMS agent installation fails",
                "confidence": 0.7,
                "estimated_duration": "2-4 hours",
                "prerequisites": ["Root/Administrator access", "Network connectivity"]
            }
    
    @staticmethod
    def _recommend_for_database(db: Dict) -> Dict:
        """Recommend migration tool for a database - Huawei best practices"""
        db_engine = db.get("engine", "").lower()
        db_type = db.get("type", "").lower()
        
        # Huawei Cloud database migration best practices
        if "oracle" in db_engine or "oracle" in db_type:
            return {
                "resource_type": "database",
                "resource_name": db.get("name", "unknown"),
                "primary_tool": "ugo",
                "primary_reason": "Oracle → GaussDB requires UGO for schema conversion",
                "fallback_tool": "drs",
                "fallback_reason": "DRS for data replication after schema conversion",
                "confidence": 0.95,
                "estimated_duration": "1-3 days",
                "prerequisites": ["Database credentials", "Network connectivity", "Schema assessment"]
            }
        elif any(x in db_engine for x in ["mysql", "mariadb"]):
            return {
                "resource_type": "database",
                "resource_name": db.get("name", "unknown"),
                "primary_tool": "drs",
                "primary_reason": "MySQL/MariaDB → RDS MySQL online migration",
                "fallback_tool": "manual",
                "fallback_reason": "mysqldump if DRS not available",
                "confidence": 0.9,
                "estimated_duration": "4-8 hours",
                "prerequisites": ["Binary logging enabled", "Network connectivity"]
            }
        elif "postgres" in db_engine:
            return {
                "resource_type": "database",
                "resource_name": db.get("name", "unknown"),
                "primary_tool": "drs",
                "primary_reason": "PostgreSQL → RDS PostgreSQL online migration",
                "fallback_tool": "pg_dump",
                "fallback_reason": "pg_dump/pg_restore if DRS unavailable",
                "confidence": 0.9,
                "estimated_duration": "4-8 hours",
                "prerequisites": ["WAL archiving enabled", "Network connectivity"]
            }
        elif "sqlserver" in db_engine or "mssql" in db_engine:
            return {
                "resource_type": "database",
                "resource_name": db.get("name", "unknown"),
                "primary_tool": "drs",
                "primary_reason": "SQL Server → RDS SQL Server online migration",
                "fallback_tool": "backup_restore",
                "fallback_reason": "Backup/restore if DRS unavailable",
                "confidence": 0.85,
                "estimated_duration": "6-12 hours",
                "prerequisites": ["Backup permissions", "Network connectivity"]
            }
        else:
            return {
                "resource_type": "database",
                "resource_name": db.get("name", "unknown"),
                "primary_tool": "drs",
                "primary_reason": "Generic database - DRS recommended",
                "fallback_tool": "manual",
                "fallback_reason": "Manual export/import",
                "confidence": 0.7,
                "estimated_duration": "6-24 hours",
                "prerequisites": ["Database assessment required"]
            }
    
    @staticmethod
    def _recommend_for_storage(storage: Dict) -> Dict:
        """Recommend migration tool for storage resources"""
        storage_type = storage.get("type", "").lower()
        size_gb = storage.get("size_gb", 0)
        
        # Huawei storage migration best practices
        if any(x in storage_type for x in ["s3", "oss", "blob", "object"]):
            return {
                "resource_type": "storage",
                "resource_name": storage.get("name", "unknown"),
                "primary_tool": "oms",
                "primary_reason": "Object storage cross-cloud migration",
                "fallback_tool": "rclone",
                "fallback_reason": "rclone for smaller datasets",
                "confidence": 0.9,
                "estimated_duration": "Varies by data volume",
                "prerequisites": ["Source cloud credentials", "OBS bucket created"]
            }
        elif any(x in storage_type for x in ["hadoop", "hdfs", "datawarehouse"]):
            return {
                "resource_type": "storage",
                "resource_name": storage.get("name", "unknown"),
                "primary_tool": "cdm",
                "primary_reason": "Big data batch migration",
                "fallback_tool": "distcp",
                "fallback_reason": "Hadoop distcp for HDFS migration",
                "confidence": 0.85,
                "estimated_duration": "Varies by data volume",
                "prerequisites": ["Cluster credentials", "Network assessment"]
            }
        elif size_gb > 100000:  # > 100TB
            return {
                "resource_type": "storage",
                "resource_name": storage.get("name", "unknown"),
                "primary_tool": "des",
                "primary_reason": "Petabyte-scale data requires physical transfer",
                "fallback_tool": "cdm",
                "fallback_reason": "CDM for online migration if timeline allows",
                "confidence": 0.95,
                "estimated_duration": "Weeks (physical shipping)",
                "prerequisites": ["Data assessment", "Shipping logistics"]
            }
        
        # Default for other storage types
        return {
            "resource_type": "storage",
            "resource_name": storage.get("name", "unknown"),
            "primary_tool": "manual",
            "primary_reason": "Standard storage migration",
            "fallback_tool": "rsync",
            "fallback_reason": "rsync for file-level copy",
            "confidence": 0.7,
            "estimated_duration": "Varies by data volume",
            "prerequisites": ["Storage assessment"]
        }
    
    @staticmethod
    def _recommend_for_network(network: Dict) -> Dict:
        """Network resources - Huawei Cloud networking best practices"""
        return {
            "resource_type": "network",
            "resource_name": network.get("name", "unknown"),
            "primary_tool": "manual",
            "primary_reason": "VPC/Subnet/Security Group manual configuration",
            "fallback_tool": "terraform",
            "fallback_reason": "Terraform for infrastructure-as-code",
            "confidence": 1.0,
            "estimated_duration": "1-2 hours",
            "prerequisites": ["Network design document", "IP addressing plan"]
        }
    
    @staticmethod
    def _generate_summary(recommendations: List[Dict], discovery_data: Dict) -> Dict:
        """Generate summary with Huawei Cloud migration insights"""
        tool_counts = {}
        for rec in recommendations:
            primary = rec.get("primary_tool")
            tool_counts[primary] = tool_counts.get(primary, 0) + 1
        
        total_resources = sum(len(discovery_data.get(category, [])) 
                            for category in ["compute", "databases", "storage", "network"])
        
        # Huawei migration complexity assessment
        complexity_factors = {
            "ugo": 3,  # High complexity (schema conversion)
            "des": 3,  # High complexity (physical shipping)
            "cdm": 2,  # Medium complexity (big data)
            "drs": 2,  # Medium complexity (database)
            "sms": 1,  # Low complexity
            "mgc": 1,  # Low complexity
            "oms": 1,  # Low complexity
            "manual": 1,  # Low complexity
            "ssh_disk_copy": 2  # Medium complexity (manual intervention)
        }
        
        complexity_score = sum(complexity_factors.get(rec.get("primary_tool", ""), 1) 
                            for rec in recommendations)
        avg_complexity = complexity_score / len(recommendations) if recommendations else 0
        
        # Determine complexity and risk levels
        if avg_complexity >= 2.5:
            complexity = "High"
            risk = "Medium-High"
        elif avg_complexity >= 1.5:
            complexity = "Medium"
            risk = "Medium"
        else:
            complexity = "Low"
            risk = "Low"
        
        # Find primary tool (most frequent)
        primary_tool = "unknown"
        if tool_counts:
            primary_tool = max(tool_counts.items(), key=lambda x: x[1])[0]
        
        return {
            "total_resources": total_resources,
            "recommended_tools": tool_counts,
            "estimated_timeline": ToolRecommender._estimate_timeline(recommendations),
            "risk_assessment": risk,
            "migration_complexity": complexity,
            "primary_tool": primary_tool,
            "huawei_best_practices": [
                "Start with non-production workloads",
                "Perform pilot migration first",
                "Validate network connectivity before migration",
                "Schedule maintenance windows for database migration",
                "Use SMS for OS consistency, DRS for database zero-downtime"
            ]
        }
    
    @staticmethod
    def _estimate_timeline(recommendations: List[Dict]) -> str:
        """Huawei Cloud migration timeline estimation"""
        if not recommendations:
            return "Unknown"
        
        resource_count = len(recommendations)
        has_database = any(r["resource_type"] == "database" for r in recommendations)
        has_large_storage = any(r["resource_type"] == "storage" and "des" in r.get("primary_tool", "") 
                              for r in recommendations)
        
        if has_large_storage:
            return "4-8 weeks (DES physical shipping)"
        elif has_database:
            if resource_count <= 10:
                return "1-2 weeks"
            elif resource_count <= 30:
                return "2-4 weeks"
            else:
                return "4-6 weeks"
        else:  # Compute-only migration
            if resource_count <= 20:
                return "3-5 days"
            elif resource_count <= 50:
                return "1-2 weeks"
            else:
                return "2-3 weeks"
    
    @staticmethod
    def generate_wbs_tasks(recommendations: Dict, project_type: str = "execution") -> List[Dict]:
        """
        Generate WBS tasks from recommendations
        project_type: "execution" (engineering) or "proposal" (high-level)
        """
        wbs_tasks = []
        rec_list = recommendations.get("recommendations", [])
        tool_summary = recommendations.get("summary", {}).get("recommended_tools", {})
        
        if project_type == "proposal":
            # High-level WBS for ARB Intake (separate from execution WBS)
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
                    "notes": f"Tool: {tool_id}, Count: {count}"
                })
                task_id += 1
            
            # Add planning tasks
            wbs_tasks.extend([
                {
                    "id": "PLAN",
                    "name": "Migration Planning & Design",
                    "prog": "0%",
                    "resp": "Solution Architect",
                    "start": "",
                    "end": "",
                    "isParent": True,
                    "notes": "High-level design and planning"
                },
                {
                    "id": "EXEC",
                    "name": "Migration Execution",
                    "prog": "0%",
                    "resp": "Migration Team",
                    "start": "",
                    "end": "",
                    "isParent": True,
                    "notes": "Technical implementation"
                },
                {
                    "id": "VALID",
                    "name": "Validation & Cutover",
                    "prog": "0%",
                    "resp": "QA Team",
                    "start": "",
                    "end": "",
                    "isParent": True,
                    "notes": "Testing and go-live"
                }
            ])
        else:
            # Execution WBS for migration planning (detailed tasks)
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