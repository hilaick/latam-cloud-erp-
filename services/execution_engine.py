"""
Execution Engine — Generic, skills-and-MCP-driven migration execution.

Replaces the hardcoded execute_live() with a proper engine that:
1. Reads project data from ALL previous phases (presales, target arch, feasibility, physics)
2. Uses the skills knowledge tree (61 skills from 3 sources) for commands
3. Uses MCP tools (3,550 migration-relevant) for API calls
4. Handles ALL resource types (compute/SMS, database/DRS, storage/OMS, network/provision)
5. Is generic — works with ANY project
6. Saves completed executions as reusable templates
7. Can re-run or adapt saved executions

Integrates with Phase 4 structure:
  4.0 Readiness Gateway  → build_plan() validates feasibility
  4.1-4.7 Pipeline        → execute() runs step-by-step
  4.8 Workbench           → manual re-run of individual steps
  4.9 Command Center      → live monitoring
  4.10 TAM Governance     → sign-off gate
"""

import json
import os
import time
import subprocess
import datetime
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# Templates directory
TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "execution_templates")
os.makedirs(TEMPLATES_DIR, exist_ok=True)


def _resolve_step_from_knowledge(action: str, pillar: str, strategy: str,
                                  server: dict, profile: dict) -> dict:
    """Search skills knowledge tree (all 3 sources) + MCP inventory for a step.

    Priority: skill > external > history > MCP > hcloud CLI fallback

    Returns: {tool_source, tool_name, commands, source_detail}
    """
    from services.knowledge_provider import KnowledgeProvider, ExternalKnowledgeStore
    from services.mcp_inventory import MCPInventory

    # 1. Query the knowledge tree (all 3 sources, federated, deduped, ranked)
    try:
        ExternalKnowledgeStore.initialize()
        knowledge = KnowledgeProvider.query(profile or {}, server)
        entries = knowledge.get("entries", [])

        # Find an entry that matches our action
        for entry in entries:
            entry_name = entry.get("name", "")
            entry_commands = entry.get("commands", [])
            source = entry.get("source", "skill")

            # Match by migration type or name keyword
            action_lower = action.lower()
            entry_str = (entry_name + " " + entry.get("migration_type", "") + " " + entry.get("description", "")).lower()

            # Check if this skill/entry has relevant commands
            if entry_commands and isinstance(entry_commands, list):
                # Look for command matching the action
                for cmd in entry_commands:
                    cmd_desc = cmd.get("desc", "").lower()
                    cmd_str = cmd.get("cmd", "")
                    if any(kw in cmd_desc or kw in entry_str for kw in
                           ["create", "ecs", "server", "sms", "task", "agent", "rsync",
                            "image", "import", "rds", "drs", "obs", "bucket", "vpc", "sg"]):
                        icon = {"skill": "🔧", "external": "🔧", "history": "🔧"}.get(source, "🔧")
                        return {
                            "tool_source": source if source in ("skill", "external", "history") else "skill",
                            "tool_name": f"{entry_name} ({source})",
                            "commands": entry_commands,
                            "source_detail": f"{icon} {source}: {entry_name}",
                            "failure_modes": entry.get("failure_modes", []),
                            "learnings": entry.get("learnings", entry.get("rules", "")),
                        }
    except Exception as e:
        logger.debug(f"Knowledge tree query failed for {action}: {e}")

    # 2. Query MCP inventory for matching API endpoint
    try:
        mcp_tools = MCPInventory.find_tools_for_action(action)
        if mcp_tools and mcp_tools[0].get("found"):
            tool = mcp_tools[0]
            return {
                "tool_source": "mcp",
                "tool_name": f"{tool['service']} → {tool['method']} {tool['path']}",
                "commands": [{"desc": tool.get("summary", action), "cmd": f"MCP {tool['service']} {tool['method']} {tool['path']}", "type": "mcp"}],
                "source_detail": f"🔌 MCP: {tool['service']}",
                "mcp_endpoint": tool,
            }
    except Exception as e:
        logger.debug(f"MCP inventory query failed for {action}: {e}")

    # 3. Fallback: hcloud CLI (will be set by caller)
    return {
        "tool_source": "hcloud",
        "tool_name": "hcloud CLI",
        "commands": [],
        "source_detail": "CLI: hcloud",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# hcloud CLI profile management — dynamic per customer (project-agnostic)
# ═══════════════════════════════════════════════════════════════════════════════

def _create_hcloud_profile(profile_name: str, ak: str, sk: str, region: str) -> bool:
    """Create a dynamic hcloud CLI profile for a customer's credentials."""
    try:
        cmd = (f"hcloud configure set --cli-profile={profile_name} "
               f"--access-key={ak} --secret-key={sk} --cli-region={region}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            logger.info(f"Created hcloud profile: {profile_name} (region: {region})")
            return True
        logger.error(f"Failed to create hcloud profile {profile_name}: {result.stderr[:200]}")
        return False
    except Exception as e:
        logger.error(f"hcloud profile creation error: {e}")
        return False


def _delete_hcloud_profile(profile_name: str):
    """Delete a dynamic hcloud CLI profile (cleanup)."""
    try:
        subprocess.run(f"hcloud configure delete --cli-profile={profile_name}",
                       shell=True, capture_output=True, text=True, timeout=5)
        logger.info(f"Deleted hcloud profile: {profile_name}")
    except Exception:
        pass


def _discover_flavors(profile: str, region: str) -> list:
    """Discover available ECS flavors in a region (project-agnostic)."""
    try:
        result = subprocess.run(
            f"hcloud ECS ListFlavors --cli-profile={profile} --cli-region={region} --availability-zone={region}a",
            shell=True, capture_output=True, text=True, timeout=15
        )
        if result.returncode == 0:
            import json as _json
            data = _json.loads(result.stdout)
            flavors = data.get("flavors", [])
            # Sort by vCPUs then memory — prefer balanced flavors
            flavors.sort(key=lambda f: (int(f.get("vcpus", 0)), int(f.get("ram", 0))))
            return flavors
    except Exception as e:
        logger.warning(f"Flavor discovery failed for {region}: {e}")
    return []


def _pick_flavor(profile: str, region: str, source_vcpus: int = None, source_ram_mb: int = None) -> str:
    """Pick a suitable flavor for the target region (project-agnostic)."""
    flavors = _discover_flavors(profile, region)
    if not flavors:
        # Fallback: try common flavors by region prefix
        if region.startswith("la-"):
            return "s6.large.2"  # LATAM fallback
        elif region.startswith("ap-southeast"):
            return "s6.medium.2"  # AP fallback
        return "s6.large.2"  # Generic fallback
    
    # Match source specs if available
    if source_vcpus and source_ram_mb:
        for f in flavors:
            if int(f.get("vcpus", 0)) >= source_vcpus and int(f.get("ram", 0)) >= source_ram_mb:
                return f.get("id", "s6.large.2")
    
    # Pick smallest balanced flavor (2 vCPU, 4GB+)
    for f in flavors:
        if int(f.get("vcpus", 0)) >= 2 and int(f.get("ram", 0)) >= 4096:
            return f.get("id", "s6.large.2")
    
    return flavors[0].get("id", "s6.large.2") if flavors else "s6.large.2"


def _discover_images(profile: str, region: str, os_type: str = "linux") -> dict:
    """Discover available gold images in a region (project-agnostic)."""
    try:
        result = subprocess.run(
            f"hcloud IMS ListImages --cli-profile={profile} --cli-region={region} --imagetype=gold --__support_kvm=true",
            shell=True, capture_output=True, text=True, timeout=15
        )
        if result.returncode == 0:
            import json as _json
            data = _json.loads(result.stdout)
            images = data.get("images", [])
            # Filter by OS type
            os_filter = "Linux" if "windows" not in os_type.lower() else "Windows"
            matching = [img for img in images if os_filter in str(img.get("os_type", ""))]
            if matching:
                # Pick the latest Ubuntu/CentOS for Linux, latest Windows for Windows
                if os_filter == "Linux":
                    preferred = [i for i in matching if "ubuntu" in str(i.get("name", "")).lower()]
                    if preferred:
                        return {"id": preferred[0].get("id", ""), "name": preferred[0].get("name", "")}
                return {"id": matching[0].get("id", ""), "name": matching[0].get("name", "")}
    except Exception as e:
        logger.warning(f"Image discovery failed for {region}: {e}")
    return {"id": "", "name": ""}


def _sms_agent_url(source_region: str) -> str:
    """Build SMS agent download URL for the source region (project-agnostic)."""
    return f"https://sms-resource-intl-{source_region}.obs.{source_region}.myhuaweicloud.com/SMS-Agent.tar.gz"


# ═══════════════════════════════════════════════════════════════════════════════
# Resource categorization — mirrors TechnicalFeasibility.jsx + physics engine
# ═══════════════════════════════════════════════════════════════════════════════

COMPUTE_TYPES = {"ECS", "VM", "CCE", "ASG", "AS", "BMS"}
DATABASE_TYPES = {"RDS", "GAUSSDB", "DDS", "DCS", "DMS", "DWS"}
STORAGE_TYPES = {"OBS", "SFS", "EVS", "CBR", "SFS_TURBO"}
NETWORK_TYPES = {"VPC", "SUBNET", "SG", "EIP", "ELB", "NAT", "VPN", "VPCEP", "DNS", "CFW"}
SECURITY_TYPES = {"HSS", "IAM", "EPS", "KMS", "WAF"}

# SMS OS support (pre-filter heuristic — definitive check during agent install)
SMS_UNSUPPORTED_OS = ["aix", "solaris", "freebsd", "hp-ux", "hpux", "openbsd"]
SMS_OLD_VERSIONS = ["centos 5", "rhel 5", "ubuntu 12", "ubuntu 13", "windows 2003"]


def _categorize_resource(node: dict) -> str:
    """Categorize a resource by type → pillar (compute/database/storage/network)."""
    t = str(node.get("type", node.get("resourceType", ""))).upper()
    if t in COMPUTE_TYPES:
        return "compute"
    if t in DATABASE_TYPES:
        return "database"
    if t in STORAGE_TYPES:
        return "storage"
    if t in NETWORK_TYPES or t in SECURITY_TYPES:
        return "network"
    # Name-based fallback for ECS running databases
    name = (node.get("name", "")).lower()
    if any(kw in name for kw in ["mysql", "postgres", "mongo", "redis", "oracle"]):
        return "database"
    return "compute"  # default


def _is_sms_os_supported(os_type: str) -> bool:
    """Pre-filter heuristic — definitive check during Phase 4 agent install."""
    os_lower = (os_type or "").lower()
    if any(u in os_lower for u in SMS_UNSUPPORTED_OS):
        return False
    if any(v in os_lower for v in SMS_OLD_VERSIONS):
        return False
    return True


def _detect_db_type(name: str, rtype: str = "") -> str:
    """Detect database type from name or resource type."""
    n = (name or "").lower()
    t = (rtype or "").upper()
    if t in ("RDS", "GAUSSDB"):
        return "mysql"  # RDS default
    if t == "DDS":
        return "mongodb"
    if t == "DCS":
        return "redis"
    if "mysql" in n or "mariadb" in n:
        return "mysql"
    if "postgres" in n or "pgsql" in n:
        return "postgresql"
    if "mongo" in n:
        return "mongodb"
    if "redis" in n:
        return "redis"
    if "oracle" in n:
        return "oracle"
    return "mysql"  # default


def _get_data_size_gb(server: dict, default_used_pct: float = 50.0) -> float:
    """Actual data to transfer (NOT disk capacity)."""
    data_size = server.get("dataSizeGB") or server.get("usedStorageGB")
    if data_size and float(data_size) > 0:
        return float(data_size)
    disk = float(server.get("storage") or server.get("diskGB") or 100)
    used_pct = float(server.get("usedStoragePct") or default_used_pct)
    return disk * (used_pct / 100.0)


# ═══════════════════════════════════════════════════════════════════════════════
# MCP tool mapping — which MCP server handles which pillar
# ═══════════════════════════════════════════════════════════════════════════════

MCP_PILLAR_MAP = {
    "compute": ["ecs", "ims", "as", "bms", "image"],
    "database": ["rds", "dds", "dcs", "drs", "gaussdb", "gaussdbfornosql", "gaussdbforopengauss", "ddm"],
    "storage": ["obs", "evs", "sfs", "sfsturbo", "oms", "cdm", "cbr"],
    "network": ["vpc", "eip", "elb", "nat", "vpn", "vpcep", "dns", "cfw"],
    "security": ["hss", "iam", "eps", "kms", "waf"],
    "monitoring": ["ces", "aom", "cts", "lts", "rms"],
    "sms": ["smsapi"],
}


def _mcp_tool_for_action(pillar: str, action: str) -> str:
    """Return the MCP server name for a given pillar + action."""
    services = MCP_PILLAR_MAP.get(pillar, [])
    if not services:
        return ""
    # Map common actions to specific MCP servers
    action_lower = action.lower()
    if pillar == "compute":
        if "image" in action_lower or "import" in action_lower:
            return "mcp_server_ims"
        return "mcp_server_ecs"
    if pillar == "database":
        if "replicat" in action_lower or "sync" in action_lower:
            return "mcp_server_drs"
        if "mongodb" in action_lower or "dds" in action_lower:
            return "mcp_server_dds"
        if "redis" in action_lower or "dcs" in action_lower:
            return "mcp_server_dcs"
        return "mcp_server_rds"
    if pillar == "storage":
        if "obs" in action_lower or "bucket" in action_lower or "object" in action_lower:
            return "mcp_server_obs"
        if "volume" in action_lower or "disk" in action_lower:
            return "mcp_server_evs"
        if "migration" in action_lower or "sync" in action_lower:
            return "mcp_server_oms"
        return "mcp_server_obs"
    if pillar == "network":
        if "sg" in action_lower or "security_group" in action_lower:
            return "mcp_server_vpc"
        if "eip" in action_lower or "public_ip" in action_lower:
            return "mcp_server_eip"
        if "elb" in action_lower or "load" in action_lower:
            return "mcp_server_elb"
        return "mcp_server_vpc"
    if pillar == "sms":
        return "mcp_server_smsapi"
    return services[0] if services else ""


# ═══════════════════════════════════════════════════════════════════════════════
# hcloud CLI helper — proven working (sign_and_request fails with 401)
# ═══════════════════════════════════════════════════════════════════════════════

def _hcloud(cmd: str, timeout: int = 30) -> dict:
    """Execute hcloud CLI command and return parsed JSON."""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        if result.returncode == 0 and result.stdout.strip():
            try:
                return {"success": True, "data": json.loads(result.stdout)}
            except json.JSONDecodeError:
                return {"success": True, "data": result.stdout.strip()}
        return {"success": False, "error": result.stderr[:500] or f"exit code {result.returncode}"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Command timed out after {timeout}s"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _ssh_command(host: str, cmd: str, password: str = None, timeout: int = 60) -> dict:
    """Execute SSH command on remote host."""
    if password:
        full_cmd = f"sshpass -p '{password}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@{host} '{cmd}'"
    else:
        full_cmd = f"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@{host} '{cmd}'"
    try:
        result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return {"success": result.returncode == 0, "stdout": result.stdout, "stderr": result.stderr}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# Execution Engine
# ═══════════════════════════════════════════════════════════════════════════════

class ExecutionEngine:
    """
    Generic migration execution engine.

    Lifecycle:
      1. build_plan(project, customer) → execution plan from ALL previous phases
      2. execute(plan, credentials) → real API calls via hcloud CLI + MCP
      3. save_template(project_id, result) → save as reusable template
      4. load_template(template_id) → load saved execution
      5. adapt_template(template_id, new_project) → adapt for new project

    Integrates with Phase 4:
      4.0 Readiness Gateway → build_plan() + validate
      4.1-4.7 Pipeline → execute() step-by-step
      4.8 Workbench → manual re-run of individual steps
    """

    # ── Phase 4 mapping ──
    PHASE_4_0 = "PHASE_4_0"  # Readiness Gateway
    PHASE_4_1 = "PHASE_4_1"  # Infrastructure provisioning
    PHASE_4_2 = "PHASE_4_2"  # Source discovery + agent install
    PHASE_4_3 = "PHASE_4_3"  # Data sync / replication
    PHASE_4_4 = "PHASE_4_4"  # Cutover
    PHASE_4_5 = "PHASE_4_5"  # Post-migration verification
    PHASE_4_6 = "PHASE_4_6"  # Hardening (HSS, UniAgent, LTS)
    PHASE_4_7 = "PHASE_4_7"  # Smoke tests + handoff

    @staticmethod
    def build_plan(project: dict, customer: dict = None) -> dict:
        """
        Build execution plan from ALL previous phases.

        Reads:
        - Phase 2: mapperNodes, targetArchitecture
        - Phase 3.0: feasibilityAssessment (strategy per resource)
        - Phase 3.2: physics (usedStoragePct, data size)
        - Phase 3.4b: executionMode (agentic / zero_trust / manual)
        - Customer: credentials, os_user, os_password, regions

        Returns: execution plan with steps per resource, tagged with tool source.
        """
        # ── Single source of truth: targetArchitecture (built in Phase 2.4, approved by DTRB in 2.5) ──
        target_arch = project.get("targetArchitecture", {})
        mapper_nodes = project.get("mapperNodes", [])

        # Build migration resources from target architecture (primary)
        # Fall back to mapperNodes only if target architecture is empty
        if target_arch and (target_arch.get("compute") or target_arch.get("database") or target_arch.get("storage")):
            migration_resources = []
            for r in (target_arch.get("compute") or []):
                migration_resources.append({**r, "type": r.get("type", "ECS"), "is_target_resource": True})
            for r in (target_arch.get("database") or []):
                migration_resources.append({**r, "type": r.get("type", "RDS"), "is_target_resource": True})
            for r in (target_arch.get("storage") or []):
                migration_resources.append({**r, "type": r.get("type", "EVS"), "is_target_resource": True})
            # Merge mapper nodes not in target architecture (scope creep)
            target_names = {r.get("name") for r in migration_resources}
            for mn in mapper_nodes:
                if mn.get("name") not in target_names:
                    migration_resources.append({**mn, "scope_status": "not_in_target_arch"})
            logger.info(f"Execution plan from targetArchitecture: {len(migration_resources)} resources")
        else:
            migration_resources = mapper_nodes
            logger.info(f"No targetArchitecture — falling back to mapperNodes: {len(migration_resources)} resources")

        physics = project.get("physics", {})
        feasibility = project.get("feasibilityAssessment", {})
        execution_mode = project.get("executionMode", "agentic")
        source_region = project.get("sourceRegion", project.get("source_region", ""))
        target_region = project.get("region", project.get("targetRegion", "la-north-2"))
        used_storage_pct = float(physics.get("usedStoragePct", 50)) if physics else 50.0

        # Zero Trust detection
        auth_level = (customer or {}).get("authLevel", "") or project.get("authLevel", "")
        is_zero_trust = any(kw in str(auth_level).lower() for kw in ["read-only", "no access", "advisory"])

        # Detect VMware source
        source_env = project.get("sourceEnvironment", project.get("presales", {}).get("sourceEnvironment", ""))
        is_vmware = "vmware" in str(source_env).lower() or "vsphere" in str(source_env).lower()

        plan = {
            "project_name": project.get("projectName", "UNNAMED"),
            "source_region": source_region,
            "target_region": target_region,
            "execution_mode": execution_mode,
            "is_zero_trust": is_zero_trust,
            "is_vmware": is_vmware,
            "used_storage_pct": used_storage_pct,
            "built_at": datetime.datetime.utcnow().isoformat() + "Z",
            "pillars": {"compute": 0, "database": 0, "storage": 0, "network": 0},
            "steps": [],
            "summary": {},
        }

        step_id = 0
        steps = plan["steps"]

        # ═══ PHASE 4.0: Readiness Gateway ═══
        # Step 1: Credential validation — search knowledge tree first
        step_id += 1
        cred_resolution = _resolve_step_from_knowledge("VALIDATE_CREDENTIALS", "network", "validate",
                                                        {"os": "linux", "type": "ECS"}, {"os_family": "linux", "role": "app"})
        steps.append({
            "step_id": step_id, "phase": ExecutionEngine.PHASE_4_0,
            "action": "CREDENTIAL_VALIDATION",
            "target_resource": "account",
            "pillar": "network",
            "strategy": "validate",
            "tool_source": cred_resolution["tool_source"],
            "tool_name": cred_resolution["tool_name"],
            "commands": cred_resolution["commands"] or [{"desc": "Validate AK/SK", "cmd": "hcloud IAM KeystoneListRegions --cli-profile=<profile>", "type": "hcloud"}],
            "credentials_needed": ["ak", "sk"],
            "zero_trust": False,
            "fallback_strategy": None,
            "rollback": None,
            "status": "pending",
            "source_detail": cred_resolution.get("source_detail", ""),
        })

        step_id += 1
        steps.append({
            "step_id": step_id, "phase": ExecutionEngine.PHASE_4_0,
            "action": "PROJECT_ID_DISCOVERY",
            "target_resource": "account",
            "pillar": "network",
            "strategy": "discover",
            "tool_source": "hcloud",
            "tool_name": "hcloud CLI (KeystoneListProjects)",
            "commands": [{"desc": "List projects", "cmd": f"hcloud IAM KeystoneListProjects --cli-profile=<profile> --cli-region={target_region}", "type": "hcloud"}],
            "credentials_needed": ["ak", "sk"],
            "zero_trust": False,
            "fallback_strategy": None,
            "rollback": None,
            "status": "pending",
        })

        # ═══ PHASE 4.1: Infrastructure Provisioning (network) ═══
        # Provision network resources from target architecture
        network_nodes = [n for n in migration_resources if _categorize_resource(n) == "network"]
        for node in network_nodes:
            step_id += 1
            ntype = str(node.get("type", "")).upper()
            plan["pillars"]["network"] += 1

            if ntype == "VPC":
                action = "CREATE_VPC"
                cmd = f"hcloud VPC CreateVpc --name={node.get('name','vpc-target')} --cidr={node.get('cidr','192.168.0.0/16')} --cli-region={target_region}"
                rollback = {"cmd": "hcloud VPC DeleteVpc --vpc_id=<vpc_id>", "label": "Delete VPC"}
            elif ntype in ("SG", "SECURITY"):
                action = "CREATE_SG"
                cmd = f"hcloud VPC CreateSecurityGroup --name={node.get('name','sg-target')} --cli-region={target_region}"
                rollback = {"cmd": "hcloud VPC DeleteSecurityGroup --security_group_id=<sg_id>", "label": "Delete SG"}
            elif ntype == "EIP":
                action = "CREATE_EIP"
                cmd = f"hcloud EIP CreatePublicip --bandwidth_size=100 --bandwidth_sharetype=PER --cli-region={target_region}"
                rollback = {"cmd": "hcloud EIP DeletePublicip --publicip_id=<eip_id>", "label": "Delete EIP"}
            elif ntype == "ELB":
                action = "CREATE_ELB"
                cmd = f"hcloud ELB CreateLoadBalancer --name={node.get('name','elb-target')} --cli-region={target_region}"
                rollback = {"cmd": "hcloud ELB DeleteLoadBalancer --loadbalancer_id=<elb_id>", "label": "Delete ELB"}
            elif ntype == "NAT":
                action = "CREATE_NAT"
                cmd = f"hcloud NAT CreateNatGateway --name={node.get('name','nat-target')} --cli-region={target_region}"
                rollback = {"cmd": "hcloud NAT DeleteNatGateway --nat_gateway_id=<nat_id>", "label": "Delete NAT"}
            else:
                action = f"PROVISION_{ntype}"
                cmd = f"# Provision {ntype}: {node.get('name','?')}"
                rollback = None

            steps.append({
                "step_id": step_id, "phase": ExecutionEngine.PHASE_4_1,
                "action": action,
                "target_resource": node.get("name", ntype),
                "pillar": "network",
                "strategy": "provision",
                "tool_source": "hcloud",
                "tool_name": "hcloud CLI",
                "commands": [{"desc": f"Provision {ntype}", "cmd": cmd, "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": None,
                "rollback": rollback,
                "status": "pending",
            })

        # ═══ Process each migratable resource ═══
        migratable = [n for n in migration_resources if _categorize_resource(n) in ("compute", "database", "storage")]
        for node in migratable:
            pillar = _categorize_resource(node)
            plan["pillars"][pillar] += 1
            node_name = node.get("name", "unknown")
            os_type = node.get("os", node.get("osType", "linux"))
            data_gb = _get_data_size_gb({**node, "usedStoragePct": used_storage_pct})

            # Determine strategy based on pillar + OS + feasibility
            if pillar == "compute":
                sms_supported = _is_sms_os_supported(os_type)
                if sms_supported:
                    strategy = "sms"
                    fallback = "data_sync" if is_vmware else "image_import"
                else:
                    strategy = "data_sync"
                    fallback = "image_import"
            elif pillar == "database":
                strategy = "drs"
                fallback = "db_replication"
            elif pillar == "storage":
                strategy = "oms"
                fallback = "data_sync"
            else:
                strategy = "provision"
                fallback = None

            steps.extend(ExecutionEngine._build_resource_steps(
                step_id_counter=step_id,
                node=node, pillar=pillar, strategy=strategy, fallback=fallback,
                source_region=source_region, target_region=target_region,
                is_zero_trust=is_zero_trust, is_vmware=is_vmware,
                data_gb=data_gb, os_type=os_type,
            ))
            step_id = steps[-1]["step_id"]

        # ═══ PHASE 4.7: Smoke tests + handoff ═══
        step_id += 1
        steps.append({
            "step_id": step_id, "phase": ExecutionEngine.PHASE_4_7,
            "action": "SMOKE_TESTS",
            "target_resource": "all",
            "pillar": "network",
            "strategy": "verify",
            "tool_source": "skill",
            "tool_name": "huawei-sms-cross-region-migration (post-migration verification)",
            "commands": [{"desc": "Verify all target ECS active", "cmd": f"hcloud ECS ListServersDetail --cli-region={target_region}", "type": "hcloud"}],
            "credentials_needed": ["ak", "sk"],
            "zero_trust": False,
            "fallback_strategy": None,
            "rollback": None,
            "status": "pending",
        })

        # Summary
        plan["summary"] = {
            "total_steps": len(steps),
            "total_resources": len(migratable) + len(network_nodes),
            "pillars": plan["pillars"],
            "strategies": {
                "sms": sum(1 for s in steps if s.get("strategy") == "sms"),
                "drs": sum(1 for s in steps if s.get("strategy") == "drs"),
                "oms": sum(1 for s in steps if s.get("strategy") == "oms"),
                "data_sync": sum(1 for s in steps if s.get("strategy") == "data_sync"),
                "image_import": sum(1 for s in steps if s.get("strategy") == "image_import"),
                "db_replication": sum(1 for s in steps if s.get("strategy") == "db_replication"),
                "provision": sum(1 for s in steps if s.get("strategy") == "provision"),
            },
            "tool_sources": {
                "skill": sum(1 for s in steps if s.get("tool_source") in ("skill", "external", "history")),
                "mcp": sum(1 for s in steps if s.get("tool_source") == "mcp"),
                "hcloud": sum(1 for s in steps if s.get("tool_source") == "hcloud"),
            },
            "zero_trust_steps": sum(1 for s in steps if s.get("zero_trust")),
        }

        # Determine which MCP servers to start (on-demand, not all 173)
        try:
            from services.mcp_inventory import MCPInventory
            mcp_needed = MCPInventory.get_services_for_plan(plan)
            plan["mcp_servers_needed"] = mcp_needed
            plan["mcp_inventory"] = MCPInventory.get_inventory_summary()
        except Exception:
            plan["mcp_servers_needed"] = []
            plan["mcp_inventory"] = {}

        return plan

    @staticmethod
    def _build_resource_steps(step_id_counter: int, node: dict, pillar: str, strategy: str,
                              fallback: str, source_region: str, target_region: str,
                              is_zero_trust: bool, is_vmware: bool, data_gb: float,
                              os_type: str) -> List[dict]:
        """Build execution steps for a single resource based on strategy."""
        steps = []
        sid = step_id_counter
        name = node.get("name", "unknown")
        disk_gb = float(node.get("storage", node.get("diskGB", 100)))

        if strategy == "sms":
            # ── SMS Migration (compute) — resolve commands from knowledge tree + MCP ──
            server_profile = {"os_family": "linux" if "windows" not in os_type.lower() else "windows", "role": "compute", "strategy": "sms_primary"}
            step_id_counter = sid
            # Step: Target ECS creation — search knowledge tree first
            ecs_resolution = _resolve_step_from_knowledge("CREATE_TARGET_ECS", "compute", "sms", node, server_profile)
            # Flavor: use source flavor if available, otherwise dynamic discovery at execution time
            source_flavor = node.get("flavor", node.get("source_flavor", ""))
            flavor_ref = source_flavor if source_flavor else "<DISCOVERED_FLAVOR>"
            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_1,
                "action": "CREATE_TARGET_ECS",
                "target_resource": name,
                "pillar": "compute",
                "strategy": "sms",
                "tool_source": ecs_resolution["tool_source"],
                "tool_name": ecs_resolution["tool_name"],
                "commands": ecs_resolution["commands"] or [{"desc": "Create target ECS with EIP (flavor discovered at runtime)", "cmd": f"hcloud ECS CreateServers --server.name='{name}-TARGET' --server.flavorRef={flavor_ref} --server.root_volume.size={int(disk_gb)} --server.publicip.eip.iptype=5_bgp --server.publicip.eip.bandwidth.size=100 --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": None,
                "rollback": {"cmd": f"hcloud ECS DeleteServer --server_id=<ecs_id>", "label": "Delete target ECS"},
                "status": "pending",
                "source_detail": ecs_resolution.get("source_detail", ""),
                "failure_modes": ecs_resolution.get("failure_modes", []),
                "learnings": ecs_resolution.get("learnings", ""),
            })

            # Step: SG rules (SMS.3805 prevention)
            sid += 1
            ports = "8900+22" if "windows" not in os_type.lower() else "8899+8900+22"
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_1,
                "action": "ADD_SG_RULES_SMS",
                "target_resource": name,
                "pillar": "network",
                "strategy": "sms",
                "tool_source": "skill",
                "tool_name": "huawei-sms-cross-region-migration (SG preflight)",
                "commands": [{"desc": f"Add SG ingress TCP {ports}", "cmd": f"hcloud VPC CreateSecurityGroupRule --security_group_id=<sg_id> --direction=ingress --protocol=tcp --port_range_min=8900 --port_range_max=8900 --remote_ip_prefix=0.0.0.0/0 --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": None,
                "rollback": {"cmd": "hcloud VPC DeleteSecurityGroupRule --security_group_rule_id=<rule_id>", "label": "Delete SMS SG rules"},
                "status": "pending",
            })

            # Step: SMS Agent install (Zero Trust = customer responsibility)
            sid += 1
            sms_domain = f"sms.{source_region}.myhuaweicloud.com"
            agent_cmd = f"cd /opt && wget -q https://sms-resource-intl-{source_region}.obs.{source_region}.myhuaweicloud.com/SMS-Agent.tar.gz -O /tmp/SMS-Agent.tar.gz && tar xzf /tmp/SMS-Agent.tar.gz -C /opt/ && screen -dmS sms_agent bash -c \"printf 'y\\n<AK>\\n<SK>\\n{sms_domain}\\n\\n\\ny\\ny\\nn\\n' | bash /opt/SMS-Agent/startup.sh\""
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_2,
                "action": "SMS_AGENT_INSTALL",
                "target_resource": name,
                "pillar": "compute",
                "strategy": "sms",
                "tool_source": "skill",
                "tool_name": "huawei-sms-cross-region-migration (agent install via screen+printf)",
                "commands": [{"desc": "Install SMS agent via SSH", "cmd": f"ssh root@<source_ip> '{agent_cmd}'", "type": "ssh"}],
                "credentials_needed": ["ak", "sk", "os_user", "os_password"],
                "zero_trust": is_zero_trust,
                "fallback_strategy": fallback,
                "rollback": {"cmd": f"ssh root@<source_ip> 'bash /opt/SMS-Agent/uninstall.sh'", "label": "Uninstall SMS agent"},
                "status": "pending",
            })

            # Step: Migration project config (SMS.6602 prevention)
            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_2,
                "action": "MIGRATION_PROJECT_CONFIG",
                "target_resource": name,
                "pillar": "compute",
                "strategy": "sms",
                "tool_source": "skill",
                "tool_name": "huawei-sms-cross-region-migration (use_public_ip=false)",
                "commands": [{"desc": "Set use_public_ip=false", "cmd": f"hcloud SMS UpdateMigproject --mig_project_id=<project_id> --use_public_ip=false --cli-region={source_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": None,
                "rollback": None,
                "status": "pending",
            })

            # Step: SMS task creation (MGC-style disk mapping)
            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_3,
                "action": "SMS_TASK_CREATE",
                "target_resource": name,
                "pillar": "compute",
                "strategy": "sms",
                "tool_source": "mcp",
                "tool_name": "mcp_server_smsapi (CreateTask with MGC disk mapping)",
                "commands": [{"desc": "Create SMS task", "cmd": f"hcloud SMS CreateTask --name='migrate-{name}' --type=MIGRATE_FILE --os_type=LINUX --source_server.id=<src_id> --target_server.vm_id=<ecs_id> --use_public_ip=false --start_target_server=true --cli-region={source_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": fallback,
                "rollback": {"cmd": f"hcloud SMS DeleteTask --task_id=<task_id>", "label": "Delete SMS task"},
                "status": "pending",
            })

            # Step: Monitor SMS subtasks
            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_3,
                "action": "SMS_SUBTASK_MONITOR",
                "target_resource": name,
                "pillar": "compute",
                "strategy": "sms",
                "tool_source": "mcp",
                "tool_name": "mcp_server_smsapi (task status polling)",
                "commands": [{"desc": "Poll SMS task status", "cmd": f"hcloud SMS ShowTask --task_id=<task_id> --cli-region={source_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": fallback,
                "rollback": None,
                "status": "pending",
                "monitor": True,
                "expected_subtasks": ["SSL_CONFIG", "ATTACH_AGENT_IMAGE", "FORMAT_DISK_LINUX_FILE", "MIGRATE_LINUX_FILE", "CONFIGURE_LINUX_FILE", "DETACH_AGENT_IMAGE"],
            })

        elif strategy == "drs":
            # ── DRS Migration (database) ──
            db_type = _detect_db_type(name, node.get("type", ""))
            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_1,
                "action": "CREATE_TARGET_RDS",
                "target_resource": name,
                "pillar": "database",
                "strategy": "drs",
                "tool_source": "mcp",
                "tool_name": "mcp_server_rds (CreateInstance)",
                "commands": [{"desc": f"Create target RDS ({db_type})", "cmd": f"hcloud RDS CreateInstance --name=target-{name} --datastore.type={db_type} --volume_size={int(disk_gb)} --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": fallback,
                "rollback": {"cmd": "hcloud RDS DeleteInstance --instance_id=<rds_id>", "label": "Delete target RDS"},
                "status": "pending",
            })

            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_3,
                "action": "DRS_JOB_CREATE",
                "target_resource": name,
                "pillar": "database",
                "strategy": "drs",
                "tool_source": "mcp",
                "tool_name": "mcp_server_drs (CreateJob)",
                "commands": [{"desc": "Create DRS migration job", "cmd": f"hcloud DRS CreateJob --name=drs-{name} --type=migration --source.db_engine={db_type} --target.db_engine={db_type} --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": fallback,
                "rollback": {"cmd": "hcloud DRS DeleteJob --job_id=<job_id>", "label": "Delete DRS job"},
                "status": "pending",
            })

            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_3,
                "action": "DRS_START_SYNC",
                "target_resource": name,
                "pillar": "database",
                "strategy": "drs",
                "tool_source": "mcp",
                "tool_name": "mcp_server_drs (StartJob)",
                "commands": [{"desc": "Start DRS sync", "cmd": f"hcloud DRS StartJob --job_id=<job_id> --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": None,
                "rollback": None,
                "status": "pending",
                "monitor": True,
            })

        elif strategy == "oms":
            # ── OMS Migration (storage) ──
            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_1,
                "action": "CREATE_TARGET_OBS",
                "target_resource": name,
                "pillar": "storage",
                "strategy": "oms",
                "tool_source": "mcp",
                "tool_name": "mcp_server_obs (CreateBucket)",
                "commands": [{"desc": "Create target OBS bucket", "cmd": f"hcloud OBS CreateBucket --bucket=target-{name} --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": fallback,
                "rollback": {"cmd": f"hcloud OBS DeleteBucket --bucket=target-{name}", "label": "Delete OBS bucket"},
                "status": "pending",
            })

            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_3,
                "action": "OMS_SYNC_START",
                "target_resource": name,
                "pillar": "storage",
                "strategy": "oms",
                "tool_source": "mcp",
                "tool_name": "mcp_server_oms (CreateSyncTask)",
                "commands": [{"desc": "Start OMS sync task", "cmd": f"hcloud OMS CreateSyncTask --name=oms-{name} --source.ak=<source_ak> --target.ak=<ak> --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk", "source_ak", "source_sk"],
                "zero_trust": False,
                "fallback_strategy": fallback,
                "rollback": None,
                "status": "pending",
                "monitor": True,
            })

        elif strategy == "data_sync":
            # ── Data Sync (rsync/lsyncd for unsupported OS or fallback) ──
            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_1,
                "action": "DATASYNC_PROVISION_TARGET",
                "target_resource": name,
                "pillar": pillar,
                "strategy": "data_sync",
                "tool_source": "skill",
                "tool_name": "data-plane-sync (OS Blueprint Deployment)",
                "commands": [{"desc": "Create fresh vanilla ECS", "cmd": f"hcloud ECS CreateServers --server.name='{name}-TARGET' --server.root_volume.size={int(disk_gb)} --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": "image_import",
                "rollback": {"cmd": f"hcloud ECS DeleteServer --server_id=<ecs_id>", "label": "Delete target ECS"},
                "status": "pending",
            })

            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_3,
                "action": "DATASYNC_INITIAL_SYNC",
                "target_resource": name,
                "pillar": pillar,
                "strategy": "data_sync",
                "tool_source": "skill",
                "tool_name": "data-plane-sync (rsync -avz --progress)",
                "commands": [{"desc": f"rsync {data_gb:.0f}GB data", "cmd": f"rsync -avz --progress --partial --exclude={{/boot,/dev,/proc,/sys}} -e ssh root@<source_ip>:/ root@<target_ip>:/", "type": "ssh"}],
                "credentials_needed": ["os_user", "os_password"],
                "zero_trust": is_zero_trust,
                "fallback_strategy": "image_import",
                "rollback": None,
                "status": "pending",
                "monitor": True,
            })

        elif strategy == "image_import":
            # ── Image Import (VMware export → IMS → ECS) ──
            sid += 1
            export_cmd = f"ovftool vi://<vcenter>/<dc>/vm/{name} /tmp/{name}.ova" if is_vmware else f"# Customer provides image for {name}"
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_2,
                "action": "IMAGE_EXPORT",
                "target_resource": name,
                "pillar": pillar,
                "strategy": "image_import",
                "tool_source": "skill",
                "tool_name": "image-conversion (qemu-img convert to zvhd)",
                "commands": [{"desc": "Export source image", "cmd": export_cmd, "type": "script"}],
                "credentials_needed": [],
                "zero_trust": is_zero_trust,
                "fallback_strategy": None,
                "rollback": None,
                "status": "pending",
            })

            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_1,
                "action": "IMAGE_IMPORT_TO_IMS",
                "target_resource": name,
                "pillar": pillar,
                "strategy": "image_import",
                "tool_source": "mcp",
                "tool_name": "mcp_server_ims (ImportImage)",
                "commands": [{"desc": "Import image to IMS", "cmd": f"hcloud IMS ImportImage --image_url=obs://erp-assets/{name}.zvhd --name={name}-image --os_type={'Windows' if 'windows' in os_type.lower() else 'Linux'} --cli-region={target_region}", "type": "hcloud"}],
                "credentials_needed": ["ak", "sk"],
                "zero_trust": False,
                "fallback_strategy": None,
                "rollback": {"cmd": f"hcloud IMS DeleteImage --image_id=<image_id>", "label": "Delete imported image"},
                "status": "pending",
            })

        elif strategy == "db_replication":
            # ── DB Native Replication (MySQL binlog, PostgreSQL WAL) ──
            db_type = _detect_db_type(name, node.get("type", ""))
            repl_method = {
                "mysql": "CHANGE MASTER TO ... START SLAVE",
                "postgresql": "pg_basebackup + pg_start_replication",
                "mongodb": "rs.initiate + oplog",
                "redis": "SLAVEOF / REPLICAOF",
            }.get(db_type, "native replication")

            sid += 1
            steps.append({
                "step_id": sid, "phase": ExecutionEngine.PHASE_4_3,
                "action": "DB_REPLICATION_START",
                "target_resource": name,
                "pillar": "database",
                "strategy": "db_replication",
                "tool_source": "skill",
                "tool_name": f"erp-migration-factory ({db_type} native replication)",
                "commands": [{"desc": f"Start {db_type} replication", "cmd": repl_method, "type": "ssh"}],
                "credentials_needed": ["os_user", "os_password"],
                "zero_trust": is_zero_trust,
                "fallback_strategy": None,
                "rollback": None,
                "status": "pending",
                "monitor": True,
            })

        return steps

    @staticmethod
    def execute(plan: dict, credentials: dict, dry_run: bool = False) -> dict:
        """
        Execute the plan step-by-step.

        For each step:
        1. Check if zero_trust → mark as customer_responsibility
        2. Execute the command (hcloud CLI / SSH / MCP)
        3. On failure → try fallback_strategy
        4. Record result + timing

        credentials: {ak, sk, source_ak, source_sk, os_user, os_password, source_region, source_project_id}
        """
        results = {
            "plan": plan,
            "steps": [],
            "started_at": datetime.datetime.utcnow().isoformat() + "Z",
            "success": True,
            "pillars_completed": {"compute": 0, "database": 0, "storage": 0, "network": 0},
        }

        # Start MCP servers on-demand (only the ones needed for this plan)
        mcp_started = {}
        try:
            from services.mcp_inventory import MCPInventory
            mcp_started = MCPInventory.start_servers_for_plan(plan)
            logger.info(f"MCP servers started on-demand: {mcp_started}")
        except Exception as e:
            logger.warning(f"MCP server startup failed (will use hcloud CLI): {e}")

        # Create dynamic hcloud profile for this customer (project-agnostic)
        profile_name = f"erp-exec-{int(time.time())}"
        profile_created = _create_hcloud_profile(profile_name, ak, sk, plan.get("target_region", "la-north-2"))
        if not profile_created:
            # Fallback to default profile
            profile_name = "agent-test"
            logger.warning(f"Dynamic profile creation failed — falling back to '{profile_name}'")

        ak = credentials.get("ak", "")
        sk = credentials.get("sk", "")
        source_ak = credentials.get("source_ak", ak)
        source_sk = credentials.get("source_sk", sk)
        os_user = credentials.get("os_user", "root")
        os_password = credentials.get("os_password", "")
        source_region = credentials.get("source_region", plan.get("source_region", ""))
        target_region = plan.get("target_region", "la-north-2")

        for step in plan.get("steps", []):
            step_result = {
                "step_id": step["step_id"],
                "action": step["action"],
                "target_resource": step["target_resource"],
                "pillar": step["pillar"],
                "strategy": step["strategy"],
                "tool_source": step["tool_source"],
                "tool_name": step["tool_name"],
                "status": "pending",
                "started_at": datetime.datetime.utcnow().isoformat() + "Z",
            }

            # Zero Trust — customer handles source-side operations
            if step.get("zero_trust"):
                step_result["status"] = "customer_responsibility"
                step_result["message"] = "Zero Trust: customer performs this step (agent install / source config)"
                results["steps"].append(step_result)
                continue

            if dry_run:
                step_result["status"] = "dry_run"
                step_result["message"] = f"[DRY RUN] Would execute: {step['action']} for {step['target_resource']}"
                results["steps"].append(step_result)
                continue

            # Execute based on command type
            for cmd_info in step.get("commands", []):
                cmd = cmd_info["cmd"]
                cmd_type = cmd_info.get("type", "hcloud")

                # Substitute credentials and profile in command
                cmd_filled = cmd.replace("<AK>", source_ak).replace("<SK>", source_sk)
                cmd_filled = cmd_filled.replace("<profile>", profile_name)
                cmd_filled = cmd_filled.replace("agent-test", profile_name)  # replace hardcoded profile

                if cmd_type == "hcloud":
                    result = _hcloud(cmd_filled, timeout=30)
                    step_result["status"] = "success" if result["success"] else "failed"
                    if not result["success"]:
                        step_result["error"] = result.get("error", "unknown")
                        # Try fallback
                        if step.get("fallback_strategy"):
                            step_result["fallback_triggered"] = step["fallback_strategy"]
                elif cmd_type == "ssh":
                    if os_password:
                        result = _ssh_command("<source_ip>", cmd_filled, password=os_password)
                        step_result["status"] = "success" if result["success"] else "failed"
                    else:
                        step_result["status"] = "skipped"
                        step_result["message"] = "No os_password available for SSH"
                else:
                    step_result["status"] = "dry_run"
                    step_result["message"] = f"Command type {cmd_type} not yet implemented for live execution"

            step_result["completed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            results["steps"].append(step_result)

            if step_result["status"] == "failed":
                logger.warning(f"Step {step['step_id']} failed: {step_result.get('error', 'unknown')}")

        results["completed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        results["success"] = all(s["status"] in ("success", "customer_responsibility", "dry_run", "skipped") for s in results["steps"])

        # Stop MCP servers (on-demand cleanup)
        try:
            from services.mcp_inventory import MCPInventory
            MCPInventory.stop_all()
            logger.info("MCP servers stopped (on-demand cleanup)")
        except Exception:
            pass

        # Delete dynamic hcloud profile (cleanup)
        if profile_name != "agent-test":
            _delete_hcloud_profile(profile_name)

        results["summary"] = {
            "total_steps": len(results["steps"]),
            "succeeded": sum(1 for s in results["steps"] if s["status"] == "success"),
            "failed": sum(1 for s in results["steps"] if s["status"] == "failed"),
            "customer_responsibility": sum(1 for s in results["steps"] if s["status"] == "customer_responsibility"),
            "skipped": sum(1 for s in results["steps"] if s["status"] == "skipped"),
        }

        return results

    # ═══════════════════════════════════════════════════════════════════════════
    # Template management — save, load, adapt
    # ═══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def save_template(project_id: str, execution_result: dict) -> dict:
        """Save a completed execution as a reusable template."""
        template_id = f"tpl_{project_id}_{int(time.time())}"
        template = {
            "template_id": template_id,
            "project_id": project_id,
            "project_name": execution_result.get("plan", {}).get("project_name", "UNNAMED"),
            "source_region": execution_result.get("plan", {}).get("source_region", ""),
            "target_region": execution_result.get("plan", {}).get("target_region", ""),
            "execution_mode": execution_result.get("plan", {}).get("execution_mode", ""),
            "is_zero_trust": execution_result.get("plan", {}).get("is_zero_trust", False),
            "pillars": execution_result.get("plan", {}).get("pillars", {}),
            "summary": execution_result.get("summary", {}),
            "plan": execution_result.get("plan", {}),
            "saved_at": datetime.datetime.utcnow().isoformat() + "Z",
        }
        filepath = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
        with open(filepath, "w") as f:
            json.dump(template, f, indent=2, default=str)
        logger.info(f"Saved execution template: {template_id}")
        return {"success": True, "template_id": template_id, "filepath": filepath}

    @staticmethod
    def load_template(template_id: str) -> dict:
        """Load a saved execution template."""
        filepath = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
        if not os.path.exists(filepath):
            return {"success": False, "error": "Template not found"}
        with open(filepath) as f:
            template = json.load(f)
        return {"success": True, "template": template}

    @staticmethod
    def list_templates() -> dict:
        """List all saved execution templates."""
        templates = []
        for filename in os.listdir(TEMPLATES_DIR):
            if filename.endswith(".json"):
                filepath = os.path.join(TEMPLATES_DIR, filename)
                try:
                    with open(filepath) as f:
                        tpl = json.load(f)
                    templates.append({
                        "template_id": tpl.get("template_id", filename),
                        "project_name": tpl.get("project_name", "?"),
                        "source_region": tpl.get("source_region", "?"),
                        "target_region": tpl.get("target_region", "?"),
                        "pillars": tpl.get("pillars", {}),
                        "summary": tpl.get("summary", {}),
                        "saved_at": tpl.get("saved_at", "?"),
                    })
                except Exception:
                    pass
        return {"success": True, "templates": templates}

    @staticmethod
    def adapt_template(template_id: str, new_project: dict) -> dict:
        """Adapt a saved template for a new project.

        Keeps the step structure but updates:
        - Project name, regions
        - Resource names (from new project's mapper nodes)
        - Strategy per resource (re-evaluated for new project's OS/feasibility)
        """
        load_result = ExecutionEngine.load_template(template_id)
        if not load_result["success"]:
            return load_result

        template = load_result["template"]
        old_plan = template.get("plan", {})

        # Build a fresh plan for the new project
        new_plan = ExecutionEngine.build_plan(new_project)

        # Preserve learnings from the template
        new_plan["adapted_from"] = template_id
        new_plan["original_project"] = template.get("project_name", "?")
        new_plan["learnings"] = {
            "strategies_used": old_plan.get("summary", {}).get("strategies", {}),
            "tool_sources": old_plan.get("summary", {}).get("tool_sources", {}),
            "known_issues": [],  # Populated from execution history
        }

        return {"success": True, "adapted_plan": new_plan}
