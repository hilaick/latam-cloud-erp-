"""
Terraform-first execution engine for ERP Migration Factory.

Provisioning: Terraform (stateful, idempotent, rollback-capable)
Runtime ops:   MCP (SMS, HSS, monitoring, queries)
Fallback:      hcloud CLI

Generates .tf files from target architecture, runs terraform init/apply,
tracks state, and provides rollback via terraform destroy.
"""

import json
import os
import time
import logging
import subprocess
import re
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

# Base directory for Terraform workspaces (one per project)
TF_BASE_DIR = "/tmp/erp-terraform"


class TerraformExecutor:
    """Manages Terraform workspaces for ERP migration projects."""

    @staticmethod
    def _workspace_dir(project_id: str) -> str:
        """Get the Terraform workspace directory for a project."""
        d = os.path.join(TF_BASE_DIR, project_id)
        os.makedirs(d, exist_ok=True)
        return d

    @staticmethod
    def _generate_provider_tf(region: str) -> str:
        """Generate the Terraform provider configuration."""
        return f"""terraform {{
  required_providers {{
    huaweicloud = {{
      source  = "huaweicloud/huaweicloud"
      version = ">= 1.60.0"
    }}
  }}
}}

provider "huaweicloud" {{
  region = "{region}"
}}
"""

    @staticmethod
    def _generate_network_tf(project_id: str, resources: list, target_region: str) -> str:
        """Generate network resources (VPC, subnets, SGs, EIPs) as HCL."""
        lines = []
        base_tags = f"""tags = {{
    erp_project_id = "{project_id}"
    erp_managed    = "true"
  }}"""

        vpc_count = 0
        subnet_count = 0
        sg_count = 0
        eip_count = 0

        for r in resources:
            rtype = (r.get("type") or "").upper()
            name = r.get("name") or r.get("source_name") or f"resource-{r.get('id', 'unknown')}"
            # Prefix with project ID + unique suffix to avoid naming conflicts
            # (Huawei VPC v1 API has stale router name cache — same name fails on retry)
            import time as _tf_time
            _suffix = str(int(_tf_time.time()))[-4:]
            safe_name = f"erp-{project_id[-6:]}-{name}-{_suffix}"

            if rtype in ("VPC", "VIRTUAL_PRIVATE_CLOUD"):
                # Skip if this is actually a subnet (name contains 'subnet' or CIDR is /24)
                cidr = r.get("ip") or r.get("cidr") or "192.168.0.0/16"
                if "subnet" in name.lower() or "/24" in cidr:
                    subnet_count += 1
                    lines.append(f"""
resource "huaweicloud_vpc_subnet" "subnet_{subnet_count}" {{
  name       = "{safe_name}"
  cidr       = "{cidr}"
  gateway_ip = "{cidr.split('/')[0].rsplit('.', 1)[0]}.1"
  vpc_id     = huaweicloud_vpc.vpc_1.id
  {base_tags}
}}
""")
                    continue
                vpc_count += 1
                cidr = r.get("cidr") or "192.168.0.0/16"
                lines.append(f"""
resource "huaweicloud_vpc" "vpc_{vpc_count}" {{
  name = "{safe_name}"
  cidr = "{cidr}"
  {base_tags}
}}
""")

            elif rtype in ("SUBNET",):
                subnet_count += 1
                cidr = r.get("cidr") or "192.168.1.0/24"
                gateway = cidr.replace(".0/24", ".1")
                vpc_ref = f"huaweicloud_vpc.vpc_{vpc_count}.id" if vpc_count else '"${{huaweicloud_vpc.vpc_1.id}}"'
                lines.append(f"""
resource "huaweicloud_vpc_subnet" "subnet_{subnet_count}" {{
  name       = "{safe_name}"
  cidr       = "{cidr}"
  gateway_ip = "{gateway}"
  vpc_id     = "${{huaweicloud_vpc.vpc_1.id}}"
  {base_tags}
}}
""")

            elif rtype in ("SG", "SECURITY_GROUP"):
                sg_count += 1
                lines.append(f"""
resource "huaweicloud_networking_secgroup" "sg_{sg_count}" {{
  name        = "{safe_name}"
  description = "Security group for ERP migration project {project_id}"
}}
""")

            elif rtype in ("EIP", "ELASTIC_IP", "PUBLIC_IP"):
                eip_count += 1
                bandwidth = r.get("bandwidth") or 100
                lines.append(f"""
resource "huaweicloud_vpc_eip" "eip_{eip_count}" {{
  publicip {{
    type = "5_bgp"
  }}
  bandwidth {{
    name        = "erp-bw-{eip_count}"
    size        = {bandwidth}
    share_type  = "PER"
    charge_mode = "traffic"
  }}
  tags = {{
    erp_project_id = "{project_id}"
    erp_managed    = "true"
    erp_transient  = "true"
  }}
}}
""")

        # Always ensure a default VPC, subnet, and SG exist (compute.tf references them)
        if vpc_count == 0:
            vpc_count += 1
            lines.append(f"""
resource "huaweicloud_vpc" "vpc_{vpc_count}" {{
  name = "erp-vpc-{project_id[-6:]}"
  cidr = "192.168.0.0/16"
  {base_tags}
}}
""")

        if subnet_count == 0:
            subnet_count += 1
            lines.append(f"""
resource "huaweicloud_vpc_subnet" "subnet_{subnet_count}" {{
  name       = "erp-subnet-{project_id[-6:]}"
  cidr       = "192.168.1.0/24"
  gateway_ip = "192.168.1.1"
  vpc_id     = huaweicloud_vpc.vpc_1.id
  {base_tags}
}}
""")

        if sg_count == 0:
            sg_count += 1
            lines.append(f"""
resource "huaweicloud_networking_secgroup" "sg_{sg_count}" {{
  name        = "erp-sg-{project_id[-6:]}"
  description = "Default security group for ERP migration"
}}
""")

        return "\n".join(lines)

    @staticmethod
    def _generate_compute_tf(project_id: str, resources: list, target_region: str = "la-north-2") -> str:
        """Generate compute resources (ECS instances, EVS disks) as HCL."""
        lines = []
        base_tags = f"""tags = {{
    erp_project_id = "{project_id}"
    erp_managed    = "true"
  }}"""

        ecs_count = 0
        eip_count = 0
        evs_count = 0

        for r in resources:
            rtype = (r.get("type") or "").upper()
            name = r.get("name") or r.get("source_name") or f"server-{r.get('id', 'unknown')}"
            safe_name = f"erp-{project_id[-6:]}-{name}" if not name.startswith("erp-") else name

            if rtype in ("ECS", "COMPUTE", "SERVER", "APP", "WEB"):
                ecs_count += 1
                flavor = r.get("flavor") or r.get("specification") or "s6.large.2"
                image_name = r.get("os_image") or r.get("image_id") or "Ubuntu 22.04 server 64bit"
                disk_size = int(r.get("disk_size") or r.get("size") or 40)

                # Use image name — Terraform data source will resolve it
                # If image_name looks like a UUID, use it directly; otherwise use data source
                if len(image_name) == 36 and "-" in image_name:
                    image_ref = f'"{image_name}"'
                else:
                    image_ref = "${data.huaweicloud_images_image.selected.id}"

                lines.append(f"""
data "huaweicloud_images_image" "img_{ecs_count}" {{
  name        = "{image_name}"
  most_recent = true
}}

resource "huaweicloud_compute_instance" "ecs_{ecs_count}" {{
  name              = "{safe_name}"
  image_id          = data.huaweicloud_images_image.img_{ecs_count}.id
  flavor_id         = "{flavor}"
  system_disk_type  = "SAS"
  system_disk_size  = {disk_size}
  security_group_ids = [huaweicloud_networking_secgroup.sg_1.id]
  network {{
    uuid = huaweicloud_vpc_subnet.subnet_1.id
  }}
  {base_tags}
}}
""")

                # Associate an EIP with this ECS
                eip_count += 1
                lines.append(f"""
resource "huaweicloud_vpc_eip" "eip_ecs_{ecs_count}" {{
  publicip {{
    type = "5_bgp"
  }}
  bandwidth {{
    name        = "erp-ecs-bw-{ecs_count}"
    size        = 100
    share_type  = "PER"
    charge_mode = "traffic"
  }}
  tags = {{
    erp_project_id = "{project_id}"
    erp_transient  = "true"
  }}
}}

resource "huaweicloud_compute_eip_associate" "bind_ecs_{ecs_count}" {{
  public_ip   = huaweicloud_vpc_eip.eip_ecs_{ecs_count}.address
  instance_id = huaweicloud_compute_instance.ecs_{ecs_count}.id
}}
""")

            elif rtype in ("EVS", "DISK", "VOLUME"):
                evs_count += 1
                disk_size = int(r.get("size") or r.get("disk_size") or 100)
                lines.append(f"""
resource "huaweicloud_evs_volume" "disk_{evs_count}" {{
  name              = "{name}"
  volume_type       = "SAS"
  size              = {disk_size}
  availability_zone = "{target_region}a"
  {base_tags}
}}
""")

        return "\n".join(lines)

    @staticmethod
    def _generate_variables_tf(ak: str, sk: str) -> str:
        """Generate variables.tf with credentials (passed via env vars)."""
        return """variable "access_key" {
  type = string
  sensitive = true
}

variable "secret_key" {
  type = string
  sensitive = true
}
"""

    @staticmethod
    def _generate_tfvars(ak: str, sk: str) -> str:
        """Generate terraform.tfvars with credentials."""
        return f'access_key = "{ak}"\nsecret_key = "{sk}"\n'

    @classmethod
    def generate_tf_files(cls, project_id: str, resources: list, target_region: str,
                          ak: str, sk: str) -> dict:
        """
        Generate all Terraform files for a project.

        Returns dict with file paths and resource counts.
        """
        ws_dir = cls._workspace_dir(project_id)

        # Separate resources by type for network vs compute
        network_types = ("VPC", "SUBNET", "SG", "SECURITY_GROUP", "EIP", "ELASTIC_IP")
        compute_types = ("ECS", "COMPUTE", "SERVER", "APP", "WEB", "EVS", "DISK", "VOLUME")

        network_resources = [r for r in resources if (r.get("type") or "").upper() in network_types]
        compute_resources = [r for r in resources if (r.get("type") or "").upper() in compute_types]

        # Generate files
        files = {}

        # provider.tf
        provider_path = os.path.join(ws_dir, "provider.tf")
        with open(provider_path, "w") as f:
            f.write(cls._generate_provider_tf(target_region))
        files["provider"] = provider_path

        # variables.tf
        vars_path = os.path.join(ws_dir, "variables.tf")
        with open(vars_path, "w") as f:
            f.write(cls._generate_variables_tf(ak, sk))
        files["variables"] = vars_path

        # network.tf
        network_path = os.path.join(ws_dir, "network.tf")
        with open(network_path, "w") as f:
            f.write(cls._generate_network_tf(project_id, network_resources, target_region))
        files["network"] = network_path

        # compute.tf
        compute_path = os.path.join(ws_dir, "compute.tf")
        with open(compute_path, "w") as f:
            f.write(cls._generate_compute_tf(project_id, compute_resources, target_region))
        files["compute"] = compute_path

        # terraform.tfvars (credentials — NOT committed to git)
        tfvars_path = os.path.join(ws_dir, "terraform.tfvars")
        with open(tfvars_path, "w") as f:
            f.write(cls._generate_tfvars(ak, sk))
        files["tfvars"] = tfvars_path

        # Update provider to use variables
        provider_with_vars = f"""terraform {{
  required_providers {{
    huaweicloud = {{
      source  = "huaweicloud/huaweicloud"
      version = ">= 1.60.0"
    }}
  }}
}}

provider "huaweicloud" {{
  region     = "{target_region}"
  access_key = var.access_key
  secret_key = var.secret_key
}}
"""
        with open(provider_path, "w") as f:
            f.write(provider_with_vars)

        # Count resources
        resource_count = {
            "vpc": len([r for r in network_resources if (r.get("type") or "").upper() in ("VPC", "VIRTUAL_PRIVATE_CLOUD")]) or 1,
            "subnet": len([r for r in network_resources if (r.get("type") or "").upper() == "SUBNET"]) or 1,
            "sg": len([r for r in network_resources if (r.get("type") or "").upper() in ("SG", "SECURITY_GROUP")]) or 1,
            "eip": len([r for r in network_resources if (r.get("type") or "").upper() in ("EIP", "ELASTIC_IP")]),
            "ecs": len([r for r in compute_resources if (r.get("type") or "").upper() in ("ECS", "COMPUTE", "SERVER", "APP", "WEB")]),
            "evs": len([r for r in compute_resources if (r.get("type") or "").upper() in ("EVS", "DISK", "VOLUME")]),
        }
        resource_count["total"] = sum(resource_count.values())

        logger.info(f"Generated Terraform files for project {project_id}: {resource_count}")
        return {"files": files, "resources": resource_count, "workspace": ws_dir}

    @classmethod
    def terraform_init(cls, project_id: str) -> dict:
        """Run terraform init in the project workspace."""
        ws_dir = cls._workspace_dir(project_id)
        try:
            result = subprocess.run(
                ["terraform", "init"],
                cwd=ws_dir,
                capture_output=True,
                text=True,
                timeout=120,
            )
            success = result.returncode == 0
            return {
                "success": success,
                "stdout": result.stdout[-500:] if len(result.stdout) > 500 else result.stdout,
                "stderr": result.stderr[-500:] if len(result.stderr) > 500 else result.stderr,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "terraform init timed out (120s)"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def terraform_plan(cls, project_id: str) -> dict:
        """Run terraform plan to preview changes."""
        ws_dir = cls._workspace_dir(project_id)
        try:
            result = subprocess.run(
                ["terraform", "plan", "-no-color", "-input=false"],
                cwd=ws_dir,
                capture_output=True,
                text=True,
                timeout=300,
            )
            success = result.returncode == 0
            # Parse plan summary
            plan_summary = ""
            for line in result.stdout.split("\n"):
                if "Plan:" in line or "will be" in line or "No changes" in line:
                    plan_summary += line + " "

            return {
                "success": success,
                "plan_summary": plan_summary.strip() or "No summary available",
                "stdout": result.stdout[-1000:] if len(result.stdout) > 1000 else result.stdout,
                "stderr": result.stderr[-500:] if len(result.stderr) > 500 else result.stderr,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "terraform plan timed out (300s)"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def terraform_apply(cls, project_id: str, auto_approve: bool = True) -> dict:
        """Run terraform apply to provision resources."""
        ws_dir = cls._workspace_dir(project_id)
        cmd = ["terraform", "apply", "-no-color", "-input=false"]
        if auto_approve:
            cmd.append("-auto-approve")

        try:
            result = subprocess.run(
                cmd,
                cwd=ws_dir,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minutes for apply
            )
            success = result.returncode == 0

            # Parse apply summary
            apply_summary = ""
            for line in result.stdout.split("\n"):
                if "Apply complete!" in line or "Resources:" in line or "added," in line:
                    apply_summary += line + " "

            # Read state file to get created resource IDs
            state_path = os.path.join(ws_dir, "terraform.tfstate")
            created_resources = []
            if os.path.exists(state_path):
                try:
                    with open(state_path) as f:
                        state = json.load(f)
                    for res in state.get("resources", []):
                        for inst in res.get("instances", []):
                            attrs = inst.get("attributes", {})
                            created_resources.append({
                                "type": res.get("type", ""),
                                "name": res.get("name", ""),
                                "id": attrs.get("id", ""),
                                "ip": attrs.get("access_ip_v4") or attrs.get("public_ip") or "",
                            })
                except Exception:
                    pass

            return {
                "success": success,
                "apply_summary": apply_summary.strip() or "No summary",
                "created_resources": created_resources,
                "stdout": result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout,
                "stderr": result.stderr[-1000:] if len(result.stderr) > 1000 else result.stderr,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "terraform apply timed out (600s)"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def terraform_destroy(cls, project_id: str, auto_approve: bool = True) -> dict:
        """Run terraform destroy to rollback all resources."""
        ws_dir = cls._workspace_dir(project_id)
        cmd = ["terraform", "destroy", "-no-color", "-input=false"]
        if auto_approve:
            cmd.append("-auto-approve")

        try:
            result = subprocess.run(
                cmd,
                cwd=ws_dir,
                capture_output=True,
                text=True,
                timeout=600,
            )
            success = result.returncode == 0
            return {
                "success": success,
                "stdout": result.stdout[-1000:] if len(result.stdout) > 1000 else result.stdout,
                "stderr": result.stderr[-500:] if len(result.stderr) > 500 else result.stderr,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "terraform destroy timed out (600s)"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def get_state(cls, project_id: str) -> dict:
        """Read the Terraform state file for a project."""
        state_path = os.path.join(cls._workspace_dir(project_id), "terraform.tfstate")
        if not os.path.exists(state_path):
            return {"exists": False, "resources": []}
        try:
            with open(state_path) as f:
                state = json.load(f)
            resources = []
            for res in state.get("resources", []):
                for inst in res.get("instances", []):
                    attrs = inst.get("attributes", {})
                    resources.append({
                        "type": res.get("type", ""),
                        "name": res.get("name", ""),
                        "id": attrs.get("id", ""),
                        "status": attrs.get("status", ""),
                        "ip": attrs.get("access_ip_v4") or attrs.get("public_ip") or "",
                    })
            return {"exists": True, "resources": resources}
        except Exception as e:
            return {"exists": False, "error": str(e), "resources": []}
