import json
import logging
import requests
import base64
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
    def _generate_factory_cloud_init() -> str:
        """
        Vector 3 Offline Image Processing Worker.
        (Removed SNAT. This is strictly an offline VHD converter).
        """
        script = """#!/bin/bash
set -e
exec > >(tee /var/log/migration-factory-install.log|logger -t user-data -s 2>/dev/console) 2>&1
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y wget curl unzip tar jq build-essential libguestfs-tools guestfsd

wget https://obs-iso.obs.cn-north-1.myhwclouds.com/qemu-img-hw.zip -O /tmp/qemu-img-hw.zip
unzip /tmp/qemu-img-hw.zip -d /usr/local/bin/
chmod +x /usr/local/bin/qemu-img-hw

wget https://obs-community.obs.cn-north-1.myhuaweicloud.com/obsutil/current/obsutil_linux_amd64.tar.gz -O /tmp/obsutil.tar.gz
tar -xzf /tmp/obsutil.tar.gz -C /opt/
find /opt -name "obsutil" -type f -exec ln -s {} /usr/local/bin/obsutil \;

mkdir -p /mnt/migration-data
if lsblk | grep -q "vdb"; then
    mkfs.ext4 /dev/vdb
    mount /dev/vdb /mnt/migration-data
    echo "/dev/vdb /mnt/migration-data ext4 defaults 0 2" >> /etc/fstab
fi
echo "Migration Image Factory Ready."
"""
        return base64.b64encode(script.encode('utf-8')).decode('utf-8')

    @staticmethod
    def generate_terraform_payload(mapper_nodes: list, region: str, require_factory: bool = True) -> str:
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
                "huaweicloud_vpc_eip": {},
                "huaweicloud_compute_instance": {},
                "huaweicloud_compute_eip_associate": {},
                "huaweicloud_cbr_vault": {},
                "huaweicloud_cbr_policy": {}
            }
        }

        # Step 1: Base VPC and Subnet
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

        # Step 2: CBR (Cloud Backup and Recovery) - Deployed EMPTY
        # Vault is created now, but resources are NOT attached to prevent backing up corrupted/half-migrated data.
        cbr_nodes = [n for n in mapper_nodes if str(n.get('type')).upper() in ['CBR', 'BACKUP']]
        if cbr_nodes:
            cbr_size = sum([int(n.get('size', 0) or n.get('volume_size', 0) or 1000) for n in cbr_nodes]) or 1000
            tf_template["resource"]["huaweicloud_cbr_policy"]["daily_backup"] = {
                "name": "erp-daily-backup-policy",
                "type": "backup",
                "time_period": 24,
                "retention_day_count": 7,
                "scheduling_pattern": "TZ=+00:00 00:00"
            }
            tf_template["resource"]["huaweicloud_cbr_vault"]["server_vault"] = {
                "name": "erp-production-server-vault",
                "type": "server",
                "protection_type": "backup",
                "size": cbr_size,
                "policy_id": "${huaweicloud_cbr_policy.daily_backup.id}"
            }

        # Step 3: Target ECS Instances and FinOps EIP Generation
        for idx, node in enumerate(mapper_nodes):
            
            # 🚨 VECTOR CHECK: Only pre-provision if NOT using standard SMS Auto-Provision
            vector_assignment = str(node.get('vector', 'Vector 1'))
            if 'Vector 1' in vector_assignment:
                continue # Skip Terraform provisioning, SMS handles its own server creation.

            if node.get('type') == 'ECS':
                resource_name = f"ecs_target_{idx}"
                eip_name = f"eip_target_{idx}"
                
                # Dynamic Specs (Fallback to s6.large.2 for quota safety)
                target_flavor = node.get('flavor', node.get('specification', 's6.large.2'))
                target_image = node.get('os_image', 'ubuntu_22_04_x86_64')
                target_disk_size = int(node.get('disk_size', node.get('size', 40)))
                
                tf_template["resource"]["huaweicloud_compute_instance"][resource_name] = {
                    "name": str(node.get('name', f"target-vm-{idx}")),
                    "flavor_id": target_flavor,  
                    "image_id": target_image, 
                    "system_disk_type": "SAS",
                    "system_disk_size": target_disk_size,
                    "network": {
                        "uuid": "${huaweicloud_vpc_subnet.migration_subnet.id}",
                        "fixed_ip_v4": str(node.get('ip')) if node.get('ip') and node.get('ip') != 'TBD' else ""
                    }
                }
                
                # FINOPS OPTIMIZED: Dedicated EIP, Billed by Outbound Traffic (Inbound SMS is Free)
                # Cap set to 300 Mbps, but costs nothing extra.
                tf_template["resource"]["huaweicloud_vpc_eip"][eip_name] = {
                    "publicip": { "type": "5_bgp" },
                    "bandwidth": { "name": f"mig-bw-{idx}", "size": 300, "share_type": "PER", "charge_mode": "traffic" }
                }
                
                tf_template["resource"]["huaweicloud_compute_eip_associate"][f"bind_{idx}"] = {
                    "public_ip": f"${{huaweicloud_vpc_eip.{eip_name}.address}}",
                    "instance_id": f"${{huaweicloud_compute_instance.{resource_name}.id}}"
                }

        # Step 4: Vector 3 Offline Image Processing Worker
        if require_factory:
            tf_template["resource"]["huaweicloud_vpc_eip"]["factory_eip"] = {
                "publicip": { "type": "5_bgp" },
                "bandwidth": { "name": "factory-bw", "size": 300, "share_type": "PER", "charge_mode": "traffic" }
            }
            tf_template["resource"]["huaweicloud_compute_instance"]["migration_factory"] = {
                "name": "erp-migration-factory-worker",
                "flavor_id": "s6.large.2", # Kept s6.large.2 to prevent quota limits
                "image_id": "ubuntu_22_04_x86_64",
                "system_disk_type": "SAS",
                "system_disk_size": 40,
                "user_data": ExecutionOrchestrator._generate_factory_cloud_init(),
                "network": { "uuid": "${huaweicloud_vpc_subnet.migration_subnet.id}" }
            }
            tf_template["resource"]["huaweicloud_compute_eip_associate"]["bind_factory"] = {
                "public_ip": "${huaweicloud_vpc_eip.factory_eip.address}",
                "instance_id": "${huaweicloud_compute_instance.migration_factory.id}"
            }

        # Remove empty resource blocks cleanly
        tf_template["resource"] = {k: v for k, v in tf_template["resource"].items() if v}
        
        return json.dumps(tf_template)

    @staticmethod
    def deploy_to_rfs(ak: str, sk: str, security_token: str, region: str, project_id: str, tf_json: str):
        """
        Takes the generated Terraform JSON and pushes it to Huawei Cloud RFS.
        Uses the ephemeral STS token to guarantee Zero-Trust compliance.
        """
        try:
            url = f"https://rfs.{region}.myhuaweicloud.com/v1/stacks"

            payload = {
                "name": f"migration-landing-zone-{project_id[-6:]}",
                "description": "Latam Cloud ERP - Automated Landing Zone via RFS+Terraform",
                "template_body": tf_json, 
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
        """
        try:
            recommendations = ToolRecommender.analyze_discovery_data(discovery_data)
            wbs_tasks = ToolRecommender.generate_wbs_tasks(recommendations, project_type)
            
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
