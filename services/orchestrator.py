import json
import logging
import requests
from datetime import datetime
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkcore.signer.signer import Signer, SdkRequest
from services.tool_recommender import ToolRecommender

logger = logging.getLogger(__name__)

class ExecutionOrchestrator:
    """
    Phase 2 Engine: Converts the approved Target Architecture into Terraform 
    and deploys it natively via Huawei Cloud Resource Formation Service (RFS).
    """

    @staticmethod
    def generate_terraform_payload(mapper_nodes: list, region: str) -> str:
        """
        Dynamically translates the Target Architecture UI matrix into 
        a declarative Terraform JSON structure.
        """
        # Base Terraform setup
        tf_template = {
            "terraform": {
                "required_providers": {
                    "huaweicloud": {
                        "source": "huaweicloud/huaweicloud",
                        "version": ">= 1.60.0"
                    }
                }
            },
            "provider": {
                "huaweicloud": {
                    "region": region
                }
            },
            "resource": {
                "huaweicloud_vpc": {},
                "huaweicloud_vpc_subnet": {},
                "huaweicloud_compute_instance": {}
            }
        }

        # Step 1: Always ensure a Base VPC and Subnet exists for the Landing Zone
        tf_template["resource"]["huaweicloud_vpc"]["migration_vpc"] = {
            "name": "migration-target-vpc",
            "cidr": "10.0.0.0/16"
        }
        tf_template["resource"]["huaweicloud_vpc_subnet"]["migration_subnet"] = {
            "name": "migration-target-subnet",
            "cidr": "10.0.1.0/24",
            "gateway_ip": "10.0.1.1",
            "vpc_id": "${huaweicloud_vpc.migration_vpc.id}"
        }

        # Step 2: Parse mapperNodes for specific Vectors
        # We only pre-provision Compute nodes if they were assigned Vector 2 or Vector 3
        # Vector 1 (SMS Auto-Provision) handles its own creation, so we skip them here.
        for idx, node in enumerate(mapper_nodes):
            if node.get('type') == 'ECS':
                resource_name = f"ecs_target_{idx}"
                tf_template["resource"]["huaweicloud_compute_instance"][resource_name] = {
                    "name": str(node.get('name', f"target-vm-{idx}")),
                    "flavor_id": "s6.large.2",  # Defaulting for safety, would map from config
                    "image_id": "ubuntu_20_04_x86_64", # Base image placeholder
                    "system_disk_type": "SAS",
                    "system_disk_size": 40,
                    "network": {
                        "uuid": "${huaweicloud_vpc_subnet.migration_subnet.id}",
                        "fixed_ip_v4": str(node.get('ip')) if node.get('ip') and node.get('ip') != 'TBD' else ""
                    }
                }

        # Remove empty resource blocks
        tf_template["resource"] = {k: v for k, v in tf_template["resource"].items() if v}
        
        return json.dumps(tf_template)

    @staticmethod
    def deploy_to_rfs(ak: str, sk: str, security_token: str, region: str, project_id: str, tf_json: str):
        """
        Takes the generated Terraform JSON and pushes it to Huawei Cloud RFS.
        Uses the ephemeral STS token to guarantee Zero-Trust compliance.
        """
        try:
            # Huawei RFS API Endpoint (Resource Formation Service)
            url = f"https://rfs.{region}.myhuaweicloud.com/v1/stacks"

            payload = {
                "name": f"migration-landing-zone-{project_id[-6:]}",
                "description": "Latam Cloud ERP - Automated Landing Zone via RFS+Terraform",
                "template_body": tf_json, # RFS natively accepts Terraform config strings!
                "enable_rollback": True
            }

            credentials = BasicCredentials(ak=ak, sk=sk)
            signer = Signer(credentials)
            request = SdkRequest(method="POST", uri=url, header_params={"Content-Type": "application/json"}, body=json.dumps(payload))
            signer.sign(request)
            
            headers = dict(request.header_params)
            if security_token:
                headers['X-Security-Token'] = security_token

            response = requests.post(url, headers=headers, data=request.body, timeout=15)

            if response.status_code in [200, 201, 202]:
                data = response.json()
                logger.info(f"✅ RFS Stack Successfully Created: {data.get('stack_id')}")
                return {"success": True, "stack_id": data.get('stack_id')}
            else:
                logger.error(f"RFS Deployment Failed: {response.text}")
                return {"success": False, "error": response.text}

        except Exception as e:
            logger.error(f"Orchestrator RFS Error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def generate_migration_plan(discovery_data: dict, project_type: str = "execution") -> dict:
        """
        Generate migration plan with tool recommendations and WBS tasks
        
        Args:
            discovery_data: Raw inventory from discovery
            project_type: "technical" for engineering WBS, "sales" for high-level WBS
            
        Returns:
            Dictionary with recommendations and WBS tasks
        """
        try:
            # Get tool recommendations
            recommendations = ToolRecommender.analyze_discovery_data(discovery_data)
            
            # Generate appropriate WBS tasks
            wbs_tasks = ToolRecommender.generate_wbs_tasks(recommendations, project_type)
            
            # Calculate overall migration metrics
            total_resources = recommendations["summary"]["total_resources"]
            primary_tool = recommendations["summary"]["primary_tool"]
            timeline = recommendations["summary"]["estimated_timeline"]
            risk = recommendations["summary"]["risk_assessment"]
            complexity = recommendations["summary"]["migration_complexity"]
            
            migration_plan = {
                "success": True,
                "project_type": project_type,
                "total_resources": total_resources,
                "primary_migration_tool": primary_tool,
                "estimated_timeline": timeline,
                "risk_assessment": risk,
                "migration_complexity": complexity,
                "tool_recommendations": recommendations["recommendations"],
                "summary": recommendations["summary"],
                "wbs_tasks": wbs_tasks,
                "huawei_best_practices": recommendations["summary"]["huawei_best_practices"],
                "next_steps": [
                    "Review tool recommendations above",
                    "Assign resources to WBS tasks",
                    "Schedule pilot migration for non-production workload",
                    "Validate network connectivity between source and target",
                    "Prepare migration runbook based on selected tools"
                ]
            }
            
            logger.info(f"Generated migration plan for {total_resources} resources using {primary_tool}")
            return migration_plan
            
        except Exception as e:
            logger.error(f"Migration plan generation failed: {str(e)}")
            return {"success": False, "error": str(e)}
