"""
Agentic Execution Simulator — Full Operational Dry-Run Engine
==============================================================
Models every command, decision, and fallback path in a migration wave.
Based on UCE-2 manual migration patterns, now automated through the
Hermes agentic orchestrator.

DRY-RUN ONLY: No cloud APIs are called. No Postgres writes occur.
All credentials are simulated. All timings are physics-based estimates.
"""

import json
import logging
import random
import time
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

# ── Local imports ──
from services.knowledge_provider import (
    ExternalKnowledgeStore, KnowledgeProvider, EXTERNAL_REPO_URL
)
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# Data Classes
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationConfig:
    """Physics constants and timing models."""
    # ── Timing (seconds) ──
    STEP_TIMINGS: Dict[str, int] = field(default_factory=lambda: {
        "agent_spawn": 30,
        "network_provision": 180,       # RFS/Terraform apply
        "source_registration": 60,
        "agent_install_check": 15,
        "agent_install_push": 45,
        "agent_install_customer": 300,   # wait for customer action
        "initial_sync_start": 120,
        "delta_sync_cycle": 90,
        "final_sync_cutover": 180,
        "cutover_stop_source": 30,
        "cutover_start_target": 60,
        "verification_smoke": 120,
        "verification_service": 60,
        "troubleshoot_log_analysis": 45,
        "troubleshoot_agent_restart": 30,
        "troubleshoot_connectivity": 60,
        "retry_delay": 120,
        "image_export_source": 300,
        "image_download_mig_worker": 600,
        "image_upload_obs": 300,
        "image_convert_qemu": 180,
        "image_ims_register": 120,
        "instance_launch": 90,
        "boot_fix_linux": 120,
        "boot_fix_windows": 180,
        "partition_fix": 90,
        "hss_install": 45,
        "uniagent_install": 45,
        "lts_install": 30,
        "handoff": 60,
        "post_validation": 120,
        "garbage_collection": 90,
        "decision_point": 10,
    })

    # ── Network defaults ──
    DEFAULT_VPC_CIDR: str = "172.16.0.0/16"
    DEFAULT_MGMT_SUBNET: str = "172.16.0.0/24"
    DEFAULT_APP_SUBNET: str = "172.16.1.0/24"
    DEFAULT_DATA_SUBNET: str = "172.16.2.0/24"

    # ── Security group rules ──
    DEFAULT_SG_RULES: List[Dict] = field(default_factory=lambda: [
        {"direction": "ingress", "protocol": "tcp", "port": "22", "source": "0.0.0.0/0", "description": "SSH management"},
        {"direction": "ingress", "protocol": "tcp", "port": "443", "source": "0.0.0.0/0", "description": "HTTPS"},
        {"direction": "ingress", "protocol": "tcp", "port": "3389", "source": "0.0.0.0/0", "description": "RDP (Windows)"},
        {"direction": "ingress", "protocol": "tcp", "port": "8080-8090", "source": "172.16.0.0/16", "description": "App internal"},
        {"direction": "ingress", "protocol": "tcp", "port": "3306", "source": "172.16.0.0/16", "description": "MySQL"},
        {"direction": "ingress", "protocol": "tcp", "port": "5432", "source": "172.16.0.0/16", "description": "PostgreSQL"},
        {"direction": "ingress", "protocol": "tcp", "port": "1433", "source": "172.16.0.0/16", "description": "SQL Server"},
    ])

    # ── Migration tools ──
    SMS_TOOLS: List[str] = field(default_factory=lambda: ["SMS", "SMS Agent"])
    IMAGE_TOOLS: List[str] = field(default_factory=lambda: ["IMS", "Image Import", "qemu-img"])

    # ── Retry / troubleshooting config ──
    MAX_SMS_RETRIES: int = 3
    TROUBLESHOOTING_STEPS: List[str] = field(default_factory=lambda: [
        "analyze_sms_agent_logs",
        "check_source_network_connectivity",
        "restart_sms_agent_service",
        "verify_huawei_sms_endpoint_reachable",
        "check_disk_space_on_source",
    ])

    # ── Post-migration agent stack ──
    POST_MIGRATION_AGENTS: List[str] = field(default_factory=lambda: [
        "HSS", "UniAgent", "LTS"
    ])

    # ── Smoke test checks ──
    SMOKE_TESTS: List[str] = field(default_factory=lambda: [
        "ping_target_instance",
        "ssh_connectivity",
        "systemctl_status_critical_services",
        "disk_mount_check",
        "application_port_listen",
    ])


# ═══════════════════════════════════════════════════════════════════════════════
# Skill Registry — Catalog of available migration capabilities
# ═══════════════════════════════════════════════════════════════════════════════

class SkillRegistry:
    """
    Project-agnostic catalog of all migration skills.
    Each skill declares: what it does, prerequisites, OS support, failure modes,
    and the commands it would execute. This drives the simulation dynamically.
    
    Skills are discovered from the Hermes skills directory and can be extended
    per-project as new skills are developed or learned from history.
    """
    
    # Registry: skill_name → capability descriptor
    SKILLS: Dict[str, dict] = {
        "image_conversion": {
            "name": "image-conversion",
            "category": "migration",
            "description": "Convert VM images between formats for IMS compatibility",
            "applies_to": ["linux", "windows"],
            "prerequisites": ["source_image_accessible", "mig_worker_available", "obs_bucket_exists"],
            "commands": {
                "qemu_convert_linux": (
                    "qemu-img convert -f {source_format} -O zvhd "
                    "-o subformat=zvhd2,adapter_type=ide {input_path} {output_path}"
                ),
                "qemu_convert_windows": (
                    "qemu-img convert -f {source_format} -O zvhd "
                    "-o subformat=zvhd2,adapter_type=ide,os_type=windows {input_path} {output_path}"
                ),
                "verify_conversion": "qemu-img info {output_path} | grep -E 'file format|virtual size'",
                "install_qemu": "apt-get install -y qemu-utils 2>/dev/null || yum install -y qemu-img 2>/dev/null",
            },
            "failure_modes": [
                "unsupported_source_format",
                "disk_too_large_for_conversion",
                "qemu_not_installed_on_mig_worker",
                "output_format_incompatible_with_ims",
            ],
            "avg_duration_minutes": 5,
            "skill_file": "skills/image-conversion/SKILL.md",
        },
        "obs_migration": {
            "name": "obs-migration",
            "category": "storage",
            "description": "Migrate objects/files from external cloud storage to Huawei OBS",
            "applies_to": ["linux", "windows"],
            "prerequisites": ["source_storage_accessible", "obs_bucket_created", "obsutil_installed"],
            "commands": {
                "obsutil_download": (
                    "obsutil cp {source_url} obs://{bucket}/{prefix}/ "
                    "--parallel {jobs} --threshold {threshold} --acl=private"
                ),
                "obsutil_upload": (
                    "obsutil cp {local_path} obs://{bucket}/{prefix}/ "
                    "--parallel {jobs} --part-size={part_size}"
                ),
                "verify_upload": "obsutil ls obs://{bucket}/{prefix}/ --count",
                "install_obsutil": (
                    "wget -N https://obs-community.obs.{region}.myhuaweicloud.com/obsutil/current/obsutil_linux_amd64.tar.gz "
                    "&& tar xzf obsutil_linux_amd64.tar.gz && chmod +x obsutil_linux_amd64_*/obsutil"
                ),
            },
            "failure_modes": [
                "network_bandwidth_insufficient",
                "source_authentication_failed",
                "obs_bucket_quota_exceeded",
                "large_file_transfer_interrupted",
            ],
            "avg_duration_minutes": 15,
            "skill_file": "skills/obs-migration/SKILL.md",
        },
        "boot_fixes": {
            "name": "boot-fixes",
            "category": "post_migration",
            "description": "Fix boot failures on migrated VMs (GRUB, initramfs, BCD)",
            "applies_to": ["linux", "windows"],
            "prerequisites": ["target_instance_reachable", "rescue_mode_possible"],
            "commands": {
                "grub_reinstall_linux": (
                    "mount /dev/{root_disk}1 /mnt && "
                    "mount --bind /dev /mnt/dev && mount --bind /proc /mnt/proc && "
                    "chroot /mnt grub-install /dev/{root_disk} && "
                    "chroot /mnt update-grub"
                ),
                "initramfs_regenerate": (
                    "chroot /mnt update-initramfs -u -k all"
                ),
                "bcd_repair_windows": (
                    "bcdedit /store {bcd_path} /set {{default}} device partition={partition} && "
                    "bcdedit /store {bcd_path} /set {{default}} osdevice partition={partition}"
                ),
                "verify_boot": "ssh {target_ip} 'uptime' || echo 'BOOT_FAILED'",
            },
            "failure_modes": [
                "grub_config_corrupted",
                "initramfs_missing_drivers",
                "windows_bcd_corrupted",
                "disk_uuid_mismatch",
            ],
            "avg_duration_minutes": 3,
            "skill_file": "skills/boot-fixes/SKILL.md",
        },
        "partition_fixes": {
            "name": "partition-fixes",
            "category": "post_migration",
            "description": "Fix disk partition issues (growpart, LVM, Windows partition online)",
            "applies_to": ["linux", "windows"],
            "prerequisites": ["target_instance_running", "root_access"],
            "commands": {
                "growpart_linux": (
                    "growpart /dev/{root_disk} {partition_number} && "
                    "resize2fs /dev/{root_disk}{partition_number}"
                ),
                "lvm_extend": (
                    "pvresize /dev/{pv_device} && "
                    "lvextend -l +100%FREE /dev/{vg_name}/{lv_name} && "
                    "resize2fs /dev/{vg_name}/{lv_name}"
                ),
                "windows_partition_online": (
                    "diskpart /s {script_file}  # script: select disk 0 → select partition N → online disk → extend"
                ),
                "verify_partition": "df -h / | tail -1",
            },
            "failure_modes": [
                "partition_table_corrupted",
                "lvm_metadata_missing",
                "filesystem_not_resizable",
                "windows_dynamic_disk",
            ],
            "avg_duration_minutes": 2,
            "skill_file": "skills/partition-fixes/SKILL.md",
        },
        "data_plane_sync": {
            "name": "data-plane-sync",
            "category": "migration",
            "description": "File-level sync for application data (rsync/robocopy)",
            "applies_to": ["linux", "windows"],
            "prerequisites": ["source_accessible", "target_accessible", "network_connectivity"],
            "commands": {
                "rsync_linux": (
                    "rsync -avz --progress --partial "
                    "--bwlimit={bandwidth_limit} "
                    "-e 'ssh -p {ssh_port}' "
                    "{source_path}/ {target_user}@{target_ip}:{target_path}/"
                ),
                "robocopy_windows": (
                    "robocopy {source_path} \\\\{target_ip}\\{share} "
                    "/MIR /Z /R:3 /W:10 /MT:{threads} /LOG:{log_file}"
                ),
                "verify_sync": "diff -r {source_path} {target_path} --brief 2>&1 || echo 'DIFFERENCES_FOUND'",
            },
            "failure_modes": [
                "network_timeout",
                "permission_denied",
                "disk_full_on_target",
                "file_locked_on_source",
            ],
            "avg_duration_minutes": 30,
            "skill_file": "skills/data-plane-sync/SKILL.md",
        },
        "mig_worker_framework": {
            "name": "mig-worker-framework",
            "category": "infrastructure",
            "description": "Manage transient worker servers for migration operations",
            "applies_to": ["linux"],
            "prerequisites": ["target_vpc_exists", "eip_available"],
            "commands": {
                "deploy_worker": (
                    "hcloud ecs create --flavor {flavor} --image {image_id} "
                    "--vpc {vpc} --subnet {subnet} --eip --name mig-worker-{id}"
                ),
                "register_worker": (
                    "curl -X POST https://{api_host}/api/workers/register "
                    "-H 'Content-Type: application/json' "
                    "-d '{{\"worker_id\":\"{worker_id}\",\"capabilities\":{capabilities}}}'"
                ),
                "poll_task": (
                    "curl https://{api_host}/api/workers/{worker_id}/tasks/pending"
                ),
                "report_result": (
                    "curl -X POST https://{api_host}/api/workers/{worker_id}/tasks/{task_id}/complete "
                    "-H 'Content-Type: application/json' "
                    "-d '{{\"status\":\"{status}\",\"output\":\"{output}\"}}'"
                ),
                "terminate_worker": "hcloud ecs terminate --instance-ids {worker_id} --force",
            },
            "failure_modes": [
                "worker_registration_failed",
                "task_timeout",
                "worker_crash_during_operation",
                "api_unreachable_from_worker",
            ],
            "avg_duration_minutes": 5,
            "skill_file": "skills/mig-worker-framework/SKILL.md",
        },
        "sms_handler": {
            "name": "sms-handler",
            "category": "migration",
            "description": "Server Migration Service — agent-based block-level replication",
            "applies_to": ["linux", "windows"],
            "prerequisites": ["sms_agent_installed", "sms_endpoint_reachable", "valid_huawei_credentials"],
            "commands": {
                "agent_install_linux": (
                    "wget -N https://sms.{region}.myhuaweicloud.com/sms_agent/sms_agent_linux.tar.gz && "
                    "tar xzf sms_agent_linux.tar.gz && cd SMS-Agent && "
                    "./install.sh --ak {ak} --sk {sk} --quiet"
                ),
                "agent_install_windows": (
                    "Invoke-WebRequest -Uri 'https://sms.{region}.myhuaweicloud.com/sms_agent/sms_agent_windows.zip' "
                    "-OutFile 'C:\\sms_agent.zip'; Expand-Archive -Path 'C:\\sms_agent.zip' "
                    "-DestinationPath 'C:\\SMS-Agent' -Force; "
                    "cd C:\\SMS-Agent; .\\install.bat -ak {ak} -sk {sk} -quiet"
                ),
                "agent_check": "ps aux | grep sms_agent | grep -v grep || sc query SMSAgent | findstr RUNNING",
                "trigger_sync": "SMS Console → Start Full Replication for server {server_id}",
                "query_progress": "hcloud sms query-task --server-id {server_id}",
            },
            "failure_modes": [
                "agent_install_failed",
                "agent_not_reporting",
                "sync_stalled",
                "source_disk_full",
                "network_congestion",
            ],
            "avg_duration_minutes": 120,
            "skill_file": "skills/huawei-sms-migration/SKILL.md",
        },
        "agent_orchestrator": {
            "name": "agent-orchestrator",
            "category": "migration",
            "description": "Generate and deploy monitoring/security agents (HSS, UniAgent, LTS)",
            "applies_to": ["linux", "windows"],
            "prerequisites": ["target_instance_running", "agent_install_credentials"],
            "commands": {
                "hss_install_linux": (
                    "wget -N https://hss.{region}.myhuaweicloud.com/agent/linux/hss_agent_install.sh && "
                    "bash hss_agent_install.sh --ak {ak} --sk {sk} --region {region} --quiet"
                ),
                "hss_install_windows": (
                    "Invoke-WebRequest -Uri 'https://hss.{region}.myhuaweicloud.com/agent/windows/hss_agent_install.ps1' "
                    "-OutFile 'C:\\hss_install.ps1'; "
                    "powershell -File C:\\hss_install.ps1 -ak {ak} -sk {sk} -region {region}"
                ),
                "uniagent_install": (
                    "wget -N https://uniagent.{region}.myhuaweicloud.com/uniagent/install.sh && "
                    "bash install.sh --region {region} --project_id {project_id}"
                ),
                "lts_install": (
                    "wget -N https://lts.{region}.myhuaweicloud.com/lts-agent/install.sh && "
                    "bash install.sh --region {region} --group_id {group_id}"
                ),
                "verify_agents": "ps aux | grep -E 'hss|uniagent|lts' | grep -v grep",
            },
            "failure_modes": [
                "agent_download_blocked_by_firewall",
                "invalid_credentials",
                "agent_conflict_with_existing_software",
                "os_not_supported",
            ],
            "avg_duration_minutes": 3,
            "skill_file": "services/agent_orchestrator.py",
        },
    }
    
    @classmethod
    def get_skills_for_server(cls, profile: dict, mapper_node: dict) -> List[dict]:
        """
        Return all skills applicable to a specific server, ordered by migration phase.
        This is the core of project-agnostic simulation — skills are matched
        based on server characteristics, not hardcoded paths.
        """
        applicable = []
        os_family = profile.get("os_family", "linux")
        role = profile.get("role", "app")
        strategy = profile.get("strategy", "manual_agent_required")
        
        # Migration path skills
        if strategy in ("sms_primary", "sms_with_agent_push"):
            applicable.append(cls.SKILLS["sms_handler"])
        if strategy == "image_primary" or strategy == "manual_agent_required":
            applicable.append(cls.SKILLS["image_conversion"])
            applicable.append(cls.SKILLS["obs_migration"])
        
        # Infrastructure
        if strategy in ("sms_with_agent_push", "image_primary"):
            applicable.append(cls.SKILLS["mig_worker_framework"])
        
        # Data sync (for app servers with file-based data)
        if role in ("web", "app") and strategy != "manual_agent_required":
            applicable.append(cls.SKILLS["data_plane_sync"])
        
        # Post-migration — always applicable
        applicable.append(cls.SKILLS["agent_orchestrator"])
        applicable.append(cls.SKILLS["boot_fixes"])
        applicable.append(cls.SKILLS["partition_fixes"])
        
        return applicable
    
    @classmethod
    def get_skill(cls, name: str) -> Optional[dict]:
        """Retrieve a skill descriptor by name."""
        for skill in cls.SKILLS.values():
            if skill["name"] == name:
                return skill
        return None
    
    @classmethod
    def list_all(cls) -> List[dict]:
        """Return all registered skills."""
        return list(cls.SKILLS.values())
    
    @classmethod
    def enrich_from_history(cls, learning: dict):
        """
        Accept learning deltas from completed simulations and enrich skill
        descriptors. This is the self-learning feedback loop.
        """
        skill_name = learning.get("skill_name")
        learned_pattern = learning.get("pattern")
        if skill_name and skill_name in cls.SKILLS:
            if "commands" in learned_pattern:
                cls.SKILLS[skill_name]["commands"].update(learned_pattern["commands"])
            if "failure_modes" in learned_pattern:
                existing = set(cls.SKILLS[skill_name]["failure_modes"])
                new_modes = set(learned_pattern["failure_modes"])
                cls.SKILLS[skill_name]["failure_modes"] = list(existing | new_modes)


# ═══════════════════════════════════════════════════════════════════════════════
# Execution History Store — Cross-project learning from past runs
# ═══════════════════════════════════════════════════════════════════════════════

class ExecutionHistoryStore:
    """
    Stores execution traces from past projects and enables querying for
    similar server profiles to inform current simulation decisions.
    
    In production, this would read from a Postgres table of execution records.
    For the dry-run simulator, we maintain an in-memory store seeded with
    patterns derived from manual migration experience (UCE-2 etc.).
    """
    
    # In-memory history: list of execution records
    _history: List[dict] = []
    _initialized: bool = False
    
    @classmethod
    def initialize(cls):
        """Seed the store with known patterns from past manual migrations."""
        if cls._initialized:
            return
        
        # Pattern 1: Ubuntu 22.04 on AWS EC2 → SMS with agent push
        cls._history.append({
            "project": "UCE-2",
            "server_name": "alucemood02",
            "os": "ubuntu",
            "os_version": "22.04",
            "source_cloud": "aws",
            "role": "web",
            "disk_gb": 512,
            "strategy_used": "sms_with_agent_push",
            "outcome": "success",
            "sync_hours": 4.2,
            "issues_encountered": ["agent_download_timeout_on_first_attempt"],
            "resolutions": ["retry_agent_download_with_wget_resume"],
            "commands_used": [
                "wget -c https://sms.la-south-2.myhuaweicloud.com/sms_agent/sms_agent_linux.tar.gz",
                "tar xzf sms_agent_linux.tar.gz && cd SMS-Agent && ./install.sh --quiet",
            ],
            "learnings": {
                "use_wget_resume_flag": True,
                "agent_install_timeout_buffer": 60,
            },
        })
        
        # Pattern 2: Debian 11 on-prem VMware → image import via OBS
        cls._history.append({
            "project": "UCE-2",
            "server_name": "egresadosmau02",
            "os": "debian",
            "os_version": "11",
            "source_cloud": "vmware",
            "role": "app",
            "disk_gb": 100,
            "strategy_used": "image_primary",
            "outcome": "success",
            "sync_hours": 0.0,
            "issues_encountered": [
                "vmware_export_tool_incompatible",
                "converted_image_boot_failure_on_huawei",
            ],
            "resolutions": [
                "use_qemu-img_direct_conversion_instead_of_vmware_ovf",
                "apply_initramfs_regeneration_after_boot_fix",
            ],
            "commands_used": [
                "qemu-img convert -f vmdk -O zvhd -o subformat=zvhd2,adapter_type=ide /data/export/server.vmdk /data/staging/server.zvhd",
                "obsutil cp /data/staging/server.zvhd obs://latam-migration-la-south-2/images/ --parallel 4",
                "grub-install /dev/vda && update-grub && update-initramfs -u -k all",
            ],
            "learnings": {
                "prefer_qemu_direct_conversion": True,
                "always_regenerate_initramfs_after_debian_migration": True,
                "obs_upload_parallel_jobs_optimal": 4,
            },
        })
        
        # Pattern 3: Windows Server 2019 on Azure → image import with BCD repair
        cls._history.append({
            "project": "UCE-2",
            "server_name": "iis-web-01",
            "os": "windows",
            "os_version": "2019",
            "source_cloud": "azure",
            "role": "web",
            "disk_gb": 256,
            "strategy_used": "image_primary",
            "outcome": "success",
            "sync_hours": 0.0,
            "issues_encountered": [
                "azure_disk_export_format_not_directly_ims_compatible",
                "windows_bcd_corrupted_after_conversion",
                "hss_agent_blocked_by_windows_defender",
            ],
            "resolutions": [
                "use_azcopy_to_export_vhd_then_qemu_convert_to_zvhd",
                "offline_bcd_repair_via_rescue_instance",
                "add_hss_exclusion_to_windows_defender_before_install",
            ],
            "commands_used": [
                "azcopy copy 'https://<storage>.blob.core.windows.net/vhds/<disk>.vhd?<SAS>' /data/staging/disk.vhd",
                "qemu-img convert -f vpc -O zvhd -o subformat=zvhd2,adapter_type=ide,os_type=windows /data/staging/disk.vhd server.zvhd",
                "bcdedit /store E:\\EFI\\Microsoft\\Boot\\BCD /set {default} device partition=C:",
            ],
            "learnings": {
                "azure_disk_export_requires_azcopy_with_sas_token": True,
                "always_run_bcd_repair_after_windows_image_migration": True,
                "pre_install_windows_defender_exclusions": True,
            },
        })
        
        # Pattern 4: CentOS 7 with LVM → partition fix needed after SMS
        cls._history.append({
            "project": "UCE-2",
            "server_name": "mysql-db-01",
            "os": "centos",
            "os_version": "7",
            "source_cloud": "aws",
            "role": "database",
            "disk_gb": 1024,
            "strategy_used": "sms_primary",
            "outcome": "success_with_post_fixes",
            "sync_hours": 8.5,
            "issues_encountered": [
                "lvm_volume_not_detected_after_migration",
                "mysql_service_failed_to_start_due_to_uuid_change",
            ],
            "resolutions": [
                "pvresize + lvextend + resize2fs post-migration",
                "update_mysql_config_with_new_disk_uuids",
            ],
            "commands_used": [
                "pvresize /dev/vdb && lvextend -l +100%FREE /dev/mysql_vg/mysql_lv && resize2fs /dev/mysql_vg/mysql_lv",
                "sed -i 's/OLD_UUID/NEW_UUID/g' /etc/mysql/my.cnf && systemctl restart mysql",
            ],
            "learnings": {
                "lvm_requires_post_migration_resize": True,
                "database_uuids_change_after_migration": True,
                "always_verify_service_start_after_migration": True,
            },
        })
        
        cls._initialized = True
    
    @classmethod
    def query_similar(cls, profile: dict, mapper_node: dict) -> List[dict]:
        """
        Find historical executions that match the current server profile.
        Returns matches ranked by similarity score.
        """
        cls.initialize()
        matches = []
        
        server_os = profile.get("os", "").lower()
        server_role = profile.get("role", "")
        server_cloud = mapper_node.get("sourceCloud", "").lower()
        server_disk = float(mapper_node.get("storage", mapper_node.get("diskGB", 100)))
        
        for record in cls._history:
            score = 0
            record_os = record.get("os", "").lower()
            # OS match = high weight
            if record_os and (record_os in server_os or server_os in record_os):
                score += 3
            # Role match
            if record.get("role") == server_role:
                score += 2
            # Cloud match
            record_cloud = record.get("source_cloud", "").lower()
            if record_cloud and (record_cloud in server_cloud or server_cloud in record_cloud):
                score += 2
            # Similar disk size (±50%)
            record_disk = float(record.get("disk_gb", 100))
            if record_disk > 0 and abs(record_disk - server_disk) / record_disk < 0.5:
                score += 1
            
            if score >= 3:  # threshold for a meaningful match
                matches.append({**record, "similarity_score": score})
        
        matches.sort(key=lambda r: r["similarity_score"], reverse=True)
        return matches
    
    @classmethod
    def ingest(cls, simulation_result: dict):
        """
        After a simulation completes, ingest the outcome into the history store.
        This is the self-learning feedback loop — each project makes the
        system smarter for the next.
        """
        summary = simulation_result.get("summary", {})
        trace = simulation_result.get("trace", [])
        
        # Extract per-server outcomes
        for entry in trace:
            if entry.get("action") in ("HANDOFF", "COMPLETE", "SMS_SUCCESS"):
                outcome_info = entry.get("outcome", entry.get("result", "unknown"))
                server_name = entry.get("target", "unknown")
                
                record = {
                    "project": summary.get("project", "unknown"),
                    "server_name": server_name,
                    "os": entry.get("os", entry.get("profile", {}).get("os", "unknown")),
                    "role": entry.get("role", entry.get("profile", {}).get("role", "unknown")),
                    "strategy_used": entry.get("path_taken", "unknown"),
                    "outcome": outcome_info,
                    "sync_hours": entry.get("metrics", {}).get("sync_hours", 0),
                    "issues_encountered": entry.get("issues", []),
                    "resolutions": entry.get("resolutions", []),
                    "commands_used": [c.get("cmd", "") for c in entry.get("commands", [])],
                    "learnings": entry.get("learnings", {}),
                }
                cls._history.append(record)
        
        logger.info(f"Ingested {len(cls._history)} total execution records into history store")
    
    @classmethod
    def get_stats(cls) -> dict:
        """Return aggregate statistics for the learning system."""
        cls.initialize()
        total = len(cls._history)
        successes = sum(1 for r in cls._history if "success" in str(r.get("outcome", "")))
        strategies = {}
        for r in cls._history:
            s = r.get("strategy_used", "unknown")
            strategies[s] = strategies.get(s, 0) + 1
        return {
            "total_records": total,
            "success_rate": f"{successes}/{total}" if total > 0 else "0/0",
            "strategy_distribution": strategies,
            "unique_projects": len(set(r.get("project") for r in cls._history)),
        }


class ServerProfiler:
    """Classify servers by OS, role, and migration strategy."""

    @staticmethod
    def classify(server: dict) -> dict:
        """Determine OS type, role, and migration path from server metadata."""
        name = str(server.get("name", server.get("hostname", ""))).lower()
        os_type = str(server.get("os", server.get("osType", server.get("os_type", "")))).lower()
        tags = server.get("tags", [])
        tags_lower = [str(t).lower() for t in tags]
        hostname = str(server.get("hostname", "")).lower()

        # OS detection
        if not os_type or os_type == "unknown":
            if "win" in name or "win" in hostname or "iis" in name:
                os_type = "windows"
            elif any(hint in " ".join(tags_lower) for hint in ["windows", "win"]):
                os_type = "windows"
            else:
                os_type = "linux"

        # Role detection
        role = "app"
        db_hints = ["db", "sql", "mysql", "oracle", "postgres", "mongo", "redis", "cache"]
        web_hints = ["web", "iis", "nginx", "apache", "frontend", "portal"]
        infra_hints = ["ad", "dc", "dns", "dhcp", "vpn", "fw", "proxy"]

        if any(h in name for h in db_hints) or any(h in " ".join(tags_lower) for h in db_hints):
            role = "database"
        elif any(h in name for h in web_hints) or any(h in " ".join(tags_lower) for h in web_hints):
            role = "web"
        elif any(h in name for h in infra_hints) or any(h in " ".join(tags_lower) for h in infra_hints):
            role = "infrastructure"

        # Determine migration strategy based on characteristics
        is_windows = os_type == "windows"
        has_source_access = server.get("hasSourceAccess", False)
        has_data_plane_admin = server.get("hasDataPlaneAdmin", False)
        agent_preinstalled = server.get("agentPreinstalled", False)

        strategy = ServerProfiler._determine_strategy(
            is_windows, has_source_access, has_data_plane_admin,
            agent_preinstalled, role
        )

        return {
            "os": os_type,
            "os_family": "windows" if is_windows else "linux",
            "role": role,
            "is_windows": is_windows,
            "has_source_access": has_source_access,
            "has_data_plane_admin": has_data_plane_admin,
            "agent_preinstalled": agent_preinstalled,
            "strategy": strategy,
            "source_ip": server.get("sourceIp", server.get("source_ip", "unknown")),
        }

    @staticmethod
    def _determine_strategy(
        is_windows: bool,
        has_source_access: bool,
        has_data_plane_admin: bool,
        agent_preinstalled: bool,
        role: str
    ) -> str:
        """Determine the optimal migration strategy."""
        if agent_preinstalled:
            return "sms_primary"
        if has_data_plane_admin or has_source_access:
            return "sms_with_agent_push"
        # For critical databases, prefer image-based for consistency
        if role == "database":
            return "image_primary"
        return "manual_agent_required"

    @staticmethod
    def enrich_with_history(profile: dict, mapper_node: dict) -> dict:
        """
        Augment server profile with insights from past executions.
        This is the project-agnostic learning layer — every server
        benefits from accumulated cross-project experience.
        """
        matches = ExecutionHistoryStore.query_similar(profile, mapper_node)
        if not matches:
            return profile  # No history → no enrichment
        
        best = matches[0]  # Highest similarity score
        enriched = dict(profile)
        enriched["history_matches"] = len(matches)
        enriched["best_match_score"] = best["similarity_score"]
        enriched["best_match_project"] = best.get("project")
        
        # Apply learnings from the best match
        learnings = best.get("learnings", {})
        if learnings:
            enriched["history_learnings"] = learnings
            
            # If history shows SMS is risky for this config, suggest image fallback
            if (learnings.get("prefer_qemu_direct_conversion") and 
                profile.get("strategy") in ("sms_primary", "sms_with_agent_push")):
                enriched["suggested_strategy"] = "image_primary"
                enriched["suggestion_reason"] = (
                    f"Past project '{best.get('project')}' found image-based migration "
                    f"more reliable for similar {profile.get('os')} {profile.get('role')} servers."
                )
            
            # If history shows boot fix is always needed, flag it
            if learnings.get("always_regenerate_initramfs_after_debian_migration"):
                if "debian" in profile.get("os", ""):
                    enriched["expected_post_migration_actions"] = (
                        enriched.get("expected_post_migration_actions", []) + 
                        ["initramfs_regeneration"]
                    )
            
            if learnings.get("always_run_bcd_repair_after_windows_image_migration"):
                if profile.get("is_windows"):
                    enriched["expected_post_migration_actions"] = (
                        enriched.get("expected_post_migration_actions", []) + 
                        ["bcd_repair"]
                    )
            
            if learnings.get("lvm_requires_post_migration_resize"):
                enriched["expected_post_migration_actions"] = (
                    enriched.get("expected_post_migration_actions", []) + 
                    ["lvm_resize"]
                )
        
        enriched["history_issues"] = best.get("issues_encountered", [])
        enriched["history_resolutions"] = best.get("resolutions", [])
        enriched["history_commands"] = best.get("commands_used", [])
        
        return enriched


# ═══════════════════════════════════════════════════════════════════════════════
# Network Template Builder
# ═══════════════════════════════════════════════════════════════════════════════

class NetworkTemplateBuilder:
    """Build VPC/subnet/SG specifications from topology + BoM."""

    @staticmethod
    def build_from_topology(
        mapper_nodes: List[dict],
        region: str,
        config: SimulationConfig
    ) -> dict:
        """
        Generate network blueprint.
        In production, this reads from Phase 2.4 Topology Mapper output.
        """
        # Count servers by tier for subnet sizing
        tier_counts = {"web": 0, "app": 0, "db": 0, "cache": 0, "infra": 0}
        for node in mapper_nodes:
            profile = ServerProfiler.classify(node)
            role = profile["role"]
            tier_counts[role] = tier_counts.get(role, 0) + 1

        total_servers = len(mapper_nodes)

        # Calculate CIDR size (at least /24, scale up for large deployments)
        if total_servers <= 50:
            vpc_cidr = "172.16.0.0/16"
            mgmt_cidr = "172.16.0.0/24"
            app_cidr = "172.16.1.0/24"
            data_cidr = "172.16.2.0/24"
        elif total_servers <= 200:
            vpc_cidr = "10.0.0.0/14"
            mgmt_cidr = "10.0.0.0/22"
            app_cidr = "10.0.4.0/22"
            data_cidr = "10.0.8.0/22"
        else:
            vpc_cidr = "10.0.0.0/12"
            mgmt_cidr = "10.0.0.0/20"
            app_cidr = "10.0.16.0/20"
            data_cidr = "10.0.32.0/20"

        # Security groups
        sg_rules = list(config.DEFAULT_SG_RULES)

        # Add database-specific rules
        if tier_counts.get("db", 0) > 0:
            sg_rules.append({
                "direction": "ingress", "protocol": "tcp",
                "port": "1521", "source": app_cidr,
                "description": "Oracle listener"
            })
        if tier_counts.get("cache", 0) > 0:
            sg_rules.append({
                "direction": "ingress", "protocol": "tcp",
                "port": "6379", "source": app_cidr,
                "description": "Redis"
            })

        return {
            "vpc_name": f"latam-erp-{region}-vpc",
            "vpc_cidr": vpc_cidr,
            "subnets": [
                {"name": "management", "cidr": mgmt_cidr, "az": f"{region}-1a", "gateway": mgmt_cidr.replace(".0/24", ".1").replace(".0/22", ".1")},
                {"name": "application", "cidr": app_cidr, "az": f"{region}-1a", "gateway": app_cidr.replace(".0/24", ".1").replace(".0/22", ".1")},
                {"name": "data", "cidr": data_cidr, "az": f"{region}-1b", "gateway": data_cidr.replace(".0/24", ".1").replace(".0/22", ".1")},
            ],
            "security_groups": [
                {"name": "sg-mgmt", "rules": [r for r in sg_rules if r["port"] in ["22", "3389", "443"]]},
                {"name": "sg-app", "rules": [r for r in sg_rules if r["port"] in ["8080-8090", "443"]]},
                {"name": "sg-data", "rules": [r for r in sg_rules if r["port"] in ["3306", "5432", "1433", "1521", "6379"]]},
            ],
            "nat_gateway": {
                "name": f"nat-{region}",
                "eip_required": True,
                "subnet": mgmt_cidr,
            },
            "deployment_tool": "Huawei RFS (Resource Formation Service)",
            "deployment_template": "latam-erp-landing-zone-v3",
            "tier_summary": tier_counts,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SMS Migration Path Simulator
# ═══════════════════════════════════════════════════════════════════════════════

class SmsMigrationSimulator:
    """Simulate the full SMS migration pipeline with troubleshooting."""

    @staticmethod
    def simulate(
        server: dict,
        profile: dict,
        physics: dict,
        step_id: int,
        offset: float,
        region: str,
        config: SimulationConfig,
    ) -> dict:
        """Run SMS migration path. Returns trace entries + outcome."""
        server_name = server.get("name", server.get("hostname", server.get("id", "unknown")))
        trace: List[dict] = []
        total_offset = offset
        sid = step_id
        outcome = "UNKNOWN"
        sync_hours = 0.0
        path_taken = "sms_primary"

        # ── Step 1: Source Registration ──
        sid += 1
        is_linux = profile["os_family"] == "linux"
        sms_domain = f"sms.{region}.myhuaweicloud.com"
        install_cmd = SmsMigrationSimulator._agent_install_cmd(server_name, is_linux, sms_domain, region)
        check_cmd = SmsMigrationSimulator._agent_check_cmd(is_linux)

        trace.append({
            "id": sid, "phase": "PHASE_4_2a", "agent": f"Agent-{server_name}",
            "action": "SOURCE_REGISTRATION",
            "target": server_name,
            "message": f"Registering '{server_name}' in Huawei SMS Console. "
                       f"OS: {profile['os']}, Source IP: {profile['source_ip']}.",
            "commands": [
                {"desc": "Check if SMS agent already installed", "cmd": check_cmd},
                {"desc": "If not, install SMS agent", "cmd": install_cmd},
            ],
            "timestamp_offset_seconds": total_offset,
            "result": "registered",
        })
        total_offset += config.STEP_TIMINGS["source_registration"]

        # ── Step 2: Agent Availability ──
        sid += 1
        agent_status = SmsMigrationSimulator._agent_availability(profile)
        trace.append({
            "id": sid, "phase": "PHASE_4_2a", "agent": f"Agent-{server_name}",
            "action": "AGENT_AVAILABILITY_CHECK",
            "target": server_name,
            "message": agent_status["message"],
            "commands": agent_status["commands"],
            "timestamp_offset_seconds": total_offset,
            "decision": agent_status["decision"],
            "result": agent_status["result"],
        })
        total_offset += agent_status["time_cost"]

        # If manual agent required, we can't proceed
        if agent_status["result"] == "blocked_manual_required":
            outcome = "BLOCKED_MANUAL_AGENT_REQUIRED"
            return {
                "trace": trace,
                "final_step_id": sid,
                "final_offset": total_offset,
                "outcome": outcome,
                "sync_hours": 0.0,
                "server_name": server_name,
                "path_taken": "blocked",
            }

        # ── Step 3: Initial Full Sync ──
        sid += 1
        disk_gb = float(server.get("diskGB", server.get("disk_gb", server.get("specs", {}).get("disk", 100))))
        effective_mbps = SmsMigrationSimulator._simulate_throughput(physics)
        initial_sync_hours = (disk_gb * 8000) / (effective_mbps * 3600)  # GB→Mb / Mbps→hours
        initial_sync_hours = max(initial_sync_hours, 0.5)

        trace.append({
            "id": sid, "phase": "PHASE_4_2b", "agent": f"Agent-{server_name}",
            "action": "INITIAL_SYNC_START",
            "target": server_name,
            "message": f"Starting full disk sync: {disk_gb:.0f} GB @ {effective_mbps:.0f} Mbps effective throughput. "
                       f"Estimated: {initial_sync_hours:.1f}h.",
            "commands": [
                {"desc": "Trigger SMS full replication", "cmd": "SMS Console → Start Full Replication"},
                {"desc": "Monitor progress", "cmd": f"hcloud SMS Query-Task --server-id {server.get('id','')}"},
            ],
            "metrics": {"disk_gb": disk_gb, "effective_mbps": effective_mbps, "est_hours": initial_sync_hours},
            "timestamp_offset_seconds": total_offset,
            "result": "syncing",
        })
        total_offset += config.STEP_TIMINGS["initial_sync_start"]

        # ── Step 4: Delta Sync Cycles ──
        num_deltas = max(2, int(initial_sync_hours / 2))  # delta every ~2h of sync
        for d in range(num_deltas):
            sid += 1
            change_rate = 0.03 + random.uniform(-0.01, 0.02)  # 2-5% change rate
            delta_gb = disk_gb * change_rate
            delta_hours = (delta_gb * 8000) / (effective_mbps * 3600)
            delta_hours = max(delta_hours, 0.05)

            trace.append({
                "id": sid, "phase": "PHASE_4_2b", "agent": f"Agent-{server_name}",
                "action": f"DELTA_SYNC_{d+1}",
                "target": server_name,
                "message": f"Delta sync #{d+1}: {delta_gb:.1f} GB changed ({change_rate*100:.0f}% churn). "
                           f"Sync time: {delta_hours:.2f}h.",
                "metrics": {"delta_gb": round(delta_gb, 2), "change_rate_pct": round(change_rate*100, 1)},
                "timestamp_offset_seconds": total_offset,
                "result": "delta_complete",
            })
            total_offset += config.STEP_TIMINGS["delta_sync_cycle"]
            sync_hours += delta_hours

        sync_hours += initial_sync_hours

        # ── Step 5: Cutover ──
        sid += 1
        trace.append({
            "id": sid, "phase": "PHASE_4_2c", "agent": f"Agent-{server_name}",
            "action": "CUTOVER_STOP_SOURCE",
            "target": server_name,
            "message": f"Stopping source services on '{server_name}'. Final sync in progress.",
            "commands": [
                {"desc": "Stop application services on source", "cmd": "systemctl stop <app-service> || service <app> stop"},
                {"desc": "Trigger final SMS sync", "cmd": "SMS Console → Final Sync"},
            ],
            "timestamp_offset_seconds": total_offset,
            "result": "source_stopped",
        })
        total_offset += config.STEP_TIMINGS["cutover_stop_source"]

        sid += 1
        target_flavor = server.get("targetFlavor", server.get("flavor", "s6.large.2"))
        target_ip = "172.16.1." + str(10 + int(server.get("id", "00")[-2:]) if len(server.get("id", "")) >= 2 else 10)

        trace.append({
            "id": sid, "phase": "PHASE_4_2c", "agent": f"Agent-{server_name}",
            "action": "CUTOVER_START_TARGET",
            "target": server_name,
            "message": f"Launching target ECS '{server_name}' on flavor '{target_flavor}' "
                       f"with IP {target_ip}. Subnet: application.",
            "commands": [
                {"desc": "Create ECS from SMS target image", "cmd": f"hcloud ecs create --flavor {target_flavor} --vpc latam-erp-{region}-vpc --subnet application --ip {target_ip}"},
                {"desc": "Verify ECS status RUNNING", "cmd": f"hcloud ecs describe --instance-id <new-id>"},
            ],
            "timestamp_offset_seconds": total_offset,
            "result": "target_launched",
        })
        total_offset += config.STEP_TIMINGS["cutover_start_target"]
        outcome = "SMS_SUCCESS"

        # ── Step 6: Post-Migration ──
        post_trace, sid, total_offset = PostMigrationSimulator.simulate(
            server, profile, sid, total_offset, region, config
        )
        trace.extend(post_trace)

        return {
            "trace": trace,
            "final_step_id": sid,
            "final_offset": total_offset,
            "outcome": outcome,
            "sync_hours": sync_hours,
            "server_name": server_name,
            "path_taken": path_taken,
        }

    @staticmethod
    def _agent_availability(profile: dict) -> dict:
        """Check if agent is available and how to get it installed."""
        if profile["agent_preinstalled"]:
            return {
                "message": "SMS agent already installed on source. Validating connectivity.",
                "commands": [
                    {"desc": "Verify agent status", "cmd": "ps aux | grep sms_agent || sc query SMSAgent"},
                    {"desc": "Test SMS endpoint connectivity", "cmd": "curl -I https://sms.la-south-2.myhuaweicloud.com"},
                ],
                "decision": "proceed_with_sms",
                "result": "agent_validated",
                "time_cost": 15,
            }
        elif profile["has_data_plane_admin"]:
            return {
                "message": "Data plane admin access available. Orchestrator will push SMS agent via SSH.",
                "commands": [
                    {"desc": "SSH into source server", "cmd": f"ssh root@{profile['source_ip']} '<install_script>'"},
                    {"desc": "Download and install SMS agent", "cmd": "wget -N https://sms.la-south-2.myhuaweicloud.com/sms_agent/sms_agent_linux.tar.gz && tar xzf sms_agent_linux.tar.gz && cd SMS-Agent && ./install.sh --ak <TIER1_AK> --sk <TIER1_SK> --quiet"},
                ],
                "decision": "push_agent_via_ssh",
                "result": "agent_installed_by_orchestrator",
                "time_cost": 45,
            }
        elif profile["has_source_access"]:
            return {
                "message": "Source access available (read-only). Orchestrator provides agent install script to customer for manual execution.",
                "commands": [
                    {"desc": "Send agent install script to customer", "cmd": "Email/Teams: 'Please execute attached install_sms.sh on server <name>'"},
                ],
                "decision": "customer_must_install_agent",
                "result": "agent_installed_by_customer",
                "time_cost": 300,  # wait for customer
            }
        else:
            return {
                "message": "No data plane access or source credentials. Manual agent installation required. This wave will be BLOCKED until customer installs SMS agent.",
                "commands": [],
                "decision": "block_wave",
                "result": "blocked_manual_required",
                "time_cost": 10,
            }

    @staticmethod
    def _agent_install_cmd(server_name: str, is_linux: bool, sms_domain: str, region: str) -> str:
        if is_linux:
            return (
                f"wget -N https://{sms_domain}/sms_agent/sms_agent_linux.tar.gz && "
                f"tar -zxvf sms_agent_linux.tar.gz && cd SMS-Agent && "
                f"./install.sh --ak $HCLOUD_AK --sk $HCLOUD_SK --quiet"
            )
        else:
            return (
                f"Invoke-WebRequest -Uri 'https://{sms_domain}/sms_agent/sms_agent_windows.zip' "
                f"-OutFile 'C:\\sms_agent.zip'; Expand-Archive -Path 'C:\\sms_agent.zip' "
                f"-DestinationPath 'C:\\SMS-Agent' -Force; cd C:\\SMS-Agent; "
                f".\\install.bat -ak $env:HCLOUD_AK -sk $env:HCLOUD_SK -quiet"
            )

    @staticmethod
    def _agent_check_cmd(is_linux: bool) -> str:
        if is_linux:
            return "ps aux | grep sms_agent | grep -v grep && echo 'AGENT_RUNNING' || echo 'AGENT_NOT_FOUND'"
        else:
            return "sc query SMSAgent | findstr RUNNING && echo AGENT_RUNNING || echo AGENT_NOT_FOUND"

    @staticmethod
    def _simulate_throughput(physics: dict) -> float:
        """Extract effective throughput from physics data with jitter."""
        base_mbps = float(physics.get("bandwidthMbps", physics.get("effective_throughput_mbps", 500)))
        # Add realistic jitter and overhead
        overhead_factor = random.uniform(0.7, 0.95)
        return base_mbps * overhead_factor


# ═══════════════════════════════════════════════════════════════════════════════
# SMS Troubleshooting Simulator
# ═══════════════════════════════════════════════════════════════════════════════

class SmsTroubleshootingSimulator:
    """When SMS fails, this simulates the diagnostic and remediation workflow."""

    @staticmethod
    def simulate(
        server: dict,
        profile: dict,
        failure_reason: str,
        step_id: int,
        offset: float,
        config: SimulationConfig,
    ) -> dict:
        """Run troubleshooting steps. Returns trace + whether resolved."""
        server_name = server.get("name", "unknown")
        trace: List[dict] = []
        total_offset = offset
        sid = step_id
        resolved = False
        attempts = 0

        troubleshooting_cmds = {
            "analyze_sms_agent_logs": {
                "linux": "tail -100 /var/log/sms_agent/sms_agent.log | grep -E 'ERROR|WARN|FAIL'",
                "windows": "Get-Content 'C:\\SMS-Agent\\logs\\agent.log' -Tail 100 | Select-String 'ERROR|WARN|FAIL'",
            },
            "check_source_network_connectivity": {
                "linux": "curl -Iv https://sms.la-south-2.myhuaweicloud.com --connect-timeout 10 2>&1 | head -5",
                "windows": "Test-NetConnection sms.la-south-2.myhuaweicloud.com -Port 443",
            },
            "restart_sms_agent_service": {
                "linux": "systemctl restart sms-agent || service sms-agent restart",
                "windows": "Restart-Service SMSAgent -Force",
            },
            "verify_huawei_sms_endpoint_reachable": {
                "linux": "ping -c 4 sms.la-south-2.myhuaweicloud.com && echo 'REACHABLE' || echo 'UNREACHABLE'",
                "windows": "Test-Connection sms.la-south-2.myhuaweicloud.com -Count 4",
            },
            "check_disk_space_on_source": {
                "linux": "df -h / | tail -1",
                "windows": "Get-PSDrive C | Select-Object Used,Free",
            },
        }

        is_linux = profile["os_family"] == "linux"

        for i, step_name in enumerate(config.TROUBLESHOOTING_STEPS):
            attempts += 1
            sid += 1
            cmds = troubleshooting_cmds.get(step_name, {})
            cmd = cmds.get("linux" if is_linux else "windows", "echo 'unknown platform'")

            # Simulate that some troubleshooting steps might resolve the issue
            # In reality, this would be based on actual log/diagnostic analysis
            resolved_now = False
            if i >= 2 and attempts >= 2:
                # Bias: 60% chance troubleshooting succeeds after 2+ steps
                resolved_now = random.random() < 0.6
            if resolved_now:
                resolved = True

            trace.append({
                "id": sid, "phase": "PHASE_4_2d_TROUBLESHOOT",
                "agent": f"Agent-{server_name}",
                "action": f"TROUBLESHOOT_{step_name.upper()}",
                "target": server_name,
                "message": f"Troubleshooting step {i+1}/{len(config.TROUBLESHOOTING_STEPS)}: {step_name}. "
                           f"Failure reason: {failure_reason}. "
                           + ("Issue RESOLVED." if resolved_now else "Issue persists."),
                "commands": [{"cmd": cmd, "desc": step_name.replace('_', ' ')}],
                "timestamp_offset_seconds": total_offset,
                "decision": {"resolved": resolved_now, "next": "retry_sms" if resolved_now else "continue_troubleshooting"},
                "result": "resolved" if resolved_now else "unresolved",
            })
            total_offset += config.STEP_TIMINGS.get(f"troubleshoot_{step_name.split('_')[1]}" if '_' in step_name else "agent_spawn", 45)

            if resolved:
                break

        # If still unresolved, flag for image-based fallback
        if not resolved:
            sid += 1
            trace.append({
                "id": sid, "phase": "PHASE_4_2d_FAIL",
                "agent": f"Agent-{server_name}",
                "action": "SMS_TROUBLESHOOTING_EXHAUSTED",
                "target": server_name,
                "message": f"All {attempts} troubleshooting steps exhausted. SMS migration FAILED for '{server_name}'. "
                           f"Escalating to Image-Based Migration fallback path.",
                "commands": [],
                "timestamp_offset_seconds": total_offset,
                "decision": {"fallback": "image_based_migration"},
                "result": "escalated_to_image_fallback",
            })
            total_offset += 10

        return {
            "trace": trace,
            "final_step_id": sid,
            "final_offset": total_offset,
            "resolved": resolved,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Image-Based Migration Fallback Simulator
# ═══════════════════════════════════════════════════════════════════════════════

class ImageMigrationSimulator:
    """Simulate image-based migration when SMS fails or for image-primary strategy."""

    @staticmethod
    def simulate(
        server: dict,
        profile: dict,
        physics: dict,
        step_id: int,
        offset: float,
        region: str,
        config: SimulationConfig,
        reason: str = "sms_failure_fallback",
    ) -> dict:
        """Full image export → download → convert → upload → IMS → launch pipeline."""
        server_name = server.get("name", server.get("hostname", "unknown"))
        trace: List[dict] = []
        total_offset = offset
        sid = step_id
        is_linux = profile["os_family"] == "linux"
        source_cloud = server.get("sourceCloud", "AWS")  # AWS, Azure, VMware
        disk_gb = float(server.get("diskGB", server.get("disk_gb", server.get("specs", {}).get("disk", 100))))

        # ── Step 1: Export source image ──
        sid += 1
        export_cmds = ImageMigrationSimulator._export_commands(source_cloud, server_name, is_linux)
        trace.append({
            "id": sid, "phase": "PHASE_4_2e_IMAGE", "agent": f"Agent-{server_name}",
            "action": "IMAGE_EXPORT_SOURCE",
            "target": server_name,
            "message": f"Exporting '{server_name}' from {source_cloud} as disk image. "
                       f"Disk size: {disk_gb:.0f} GB. Reason: {reason}.",
            "commands": export_cmds,
            "timestamp_offset_seconds": total_offset,
            "result": "image_exported",
        })
        total_offset += config.STEP_TIMINGS["image_export_source"]

        # ── Step 2: Download to mig_worker ──
        sid += 1
        worker_ip = "172.16.0.100"  # mig_worker management IP
        eff_mbps = SmsMigrationSimulator._simulate_throughput(physics)
        download_hours = (disk_gb * 8000) / (eff_mbps * 3600)
        download_hours = max(download_hours, 0.2)

        trace.append({
            "id": sid, "phase": "PHASE_4_2e_IMAGE", "agent": f"Agent-{server_name} → mig_worker",
            "action": "IMAGE_DOWNLOAD_TO_MIG_WORKER",
            "target": f"mig_worker ({worker_ip})",
            "message": f"Downloading exported image ({disk_gb:.0f} GB) to mig_worker server at {worker_ip}. "
                       f"Estimated: {download_hours:.1f}h @ {eff_mbps:.0f} Mbps.",
            "commands": [
                {"desc": "Create mig_worker if not exists", "cmd": f"hcloud ecs create --flavor s6.large.2 --subnet management --ip {worker_ip}"},
                {"desc": "Download from external source", "cmd": ImageMigrationSimulator._download_command(source_cloud, disk_gb)},
            ],
            "metrics": {"download_gb": disk_gb, "effective_mbps": eff_mbps, "est_hours": download_hours},
            "timestamp_offset_seconds": total_offset,
            "result": "downloaded_to_worker",
        })
        total_offset += config.STEP_TIMINGS["image_download_mig_worker"]

        # ── Step 3: Upload to Huawei OBS via obsutil ──
        sid += 1
        obs_bucket = f"latam-migration-{region}"
        image_file = f"{server_name}_{'qcow2' if is_linux else 'vhd'}"

        trace.append({
            "id": sid, "phase": "PHASE_4_2e_IMAGE", "agent": f"Agent-{server_name} → obsutil",
            "action": "IMAGE_UPLOAD_TO_OBS",
            "target": f"obs://{obs_bucket}/{image_file}",
            "message": f"Uploading image to Huawei OBS bucket '{obs_bucket}' via obsutil from mig_worker.",
            "commands": [
                {"desc": "Configure obsutil", "cmd": "obsutil config -i <TIER2_AK> -k <TIER2_SK> -e obs.la-south-2.myhuaweicloud.com"},
                {"desc": "Upload image file", "cmd": f"obsutil cp /tmp/{image_file} obs://{obs_bucket}/{image_file} --parallel=10 --resumable --bigfile-threshold=100M"},
                {"desc": "Verify upload", "cmd": f"obsutil stat obs://{obs_bucket}/{image_file}"},
            ],
            "metrics": {"bucket": obs_bucket, "file": image_file},
            "timestamp_offset_seconds": total_offset,
            "result": "uploaded_to_obs",
        })
        total_offset += config.STEP_TIMINGS["image_upload_obs"]

        # ── Step 4: Image Conversion (if needed) ──
        sid += 1
        needs_conversion = source_cloud in ["Azure", "VMware", "Hyper-V"]
        convert_cmd = ""
        if needs_conversion:
            convert_cmd = ImageMigrationSimulator._conversion_command(source_cloud)

        trace.append({
            "id": sid, "phase": "PHASE_4_2e_IMAGE", "agent": f"Agent-{server_name} → qemu-img",
            "action": "IMAGE_CONVERSION",
            "target": server_name,
            "message": f"Converting image format for Huawei IMS compatibility. "
                       + (f"Source format: {source_cloud} native → Target: QCOW2/ZVHD." if needs_conversion
                          else "No conversion needed — format already compatible."),
            "commands": [
                {"desc": "Run qemu-img convert on mig_worker", "cmd": convert_cmd},
            ] if needs_conversion else [],
            "timestamp_offset_seconds": total_offset,
            "result": "converted" if needs_conversion else "skipped_no_conversion_needed",
        })
        if needs_conversion:
            total_offset += config.STEP_TIMINGS["image_convert_qemu"]

        # ── Step 5: Register with IMS ──
        sid += 1
        trace.append({
            "id": sid, "phase": "PHASE_4_2e_IMAGE", "agent": f"Agent-{server_name} → IMS",
            "action": "IMS_REGISTER_IMAGE",
            "target": server_name,
            "message": f"Registering image '{server_name}' in Huawei IMS from "
                       f"obs://{obs_bucket}/{image_file}. OS: {profile['os']}.",
            "commands": [
                {"desc": "IMS import API call", "cmd": f"curl -X POST 'https://ims.{region}.myhuaweicloud.com/v2/cloudimages/action' "
                         f"-H 'X-Auth-Token: <TOKEN>' -d '{{\"name\":\"{server_name}\","
                         f"\"image_url\":\"{obs_bucket}:{image_file}\",\"os_type\":\"{'Linux' if is_linux else 'Windows'}\","
                         f"\"min_disk\":{int(disk_gb)}}}'"},
                {"desc": "Wait for image status ACTIVE", "cmd": f"hcloud ims describe --image-name {server_name}"},
            ],
            "timestamp_offset_seconds": total_offset,
            "result": "image_registered",
        })
        total_offset += config.STEP_TIMINGS["image_ims_register"]

        # ── Step 6: Launch Instance ──
        sid += 1
        target_flavor = server.get("targetFlavor", server.get("flavor", "s6.large.2"))
        trace.append({
            "id": sid, "phase": "PHASE_4_2e_IMAGE", "agent": f"Agent-{server_name}",
            "action": "INSTANCE_LAUNCH_FROM_IMAGE",
            "target": server_name,
            "message": f"Launching ECS instance '{server_name}' from registered IMS image "
                       f"on flavor {target_flavor}.",
            "commands": [
                {"desc": "Create ECS from custom image", "cmd": f"hcloud ecs create --image-id <ims-image-id> --flavor {target_flavor} "
                         f"--vpc latam-erp-{region}-vpc --subnet application --security-group sg-app"},
                {"desc": "Assign EIP for management", "cmd": "hcloud eip create --bandwidth 100 && hcloud eip bind --instance-id <id>"},
            ],
            "timestamp_offset_seconds": total_offset,
            "result": "instance_launched",
        })
        total_offset += config.STEP_TIMINGS["instance_launch"]

        # ── Step 7: Post-Migration (boot fix + agents) ──
        post_trace, sid, total_offset = PostMigrationSimulator.simulate(
            server, profile, sid, total_offset, region, config, is_image_based=True
        )
        trace.extend(post_trace)

        return {
            "trace": trace,
            "final_step_id": sid,
            "final_offset": total_offset,
            "outcome": "IMAGE_MIGRATION_SUCCESS",
            "sync_hours": download_hours,
            "server_name": server_name,
            "path_taken": "image_fallback",
        }

    @staticmethod
    def _export_commands(source_cloud: str, server_name: str, is_linux: bool) -> list:
        if source_cloud == "AWS":
            return [
                {"desc": "Create AMI from running instance", "cmd": f"aws ec2 create-image --instance-id <source-id> --name '{server_name}_migration'"},
                {"desc": "Export AMI to S3", "cmd": f"aws ec2 create-instance-export-task --instance-id <id> --target-environment vmware --export-to-s3-task file://export-spec.json"},
            ]
        elif source_cloud == "Azure":
            return [
                {"desc": "Create managed snapshot", "cmd": f"az snapshot create -g <rg> -n {server_name}_snap --source <disk-id>"},
                {"desc": "Generate SAS URL for download", "cmd": f"az snapshot grant-access -g <rg> -n {server_name}_snap --duration-in-seconds 86400 --query accessSas"},
            ]
        else:  # VMware / generic
            return [
                {"desc": "Export VM as OVF/OVA from vCenter", "cmd": f"ovftool vi://<vcenter>/<dc>/vm/{server_name} /tmp/{server_name}.ova"},
            ]

    @staticmethod
    def _download_command(source_cloud: str, disk_gb: float) -> str:
        if source_cloud == "AWS":
            return f"aws s3 cp s3://export-bucket/{disk_gb:.0f}g-image.raw /tmp/src.img --region us-east-1"
        elif source_cloud == "Azure":
            return f"azcopy copy '<SAS_URL>' /tmp/src.vhd --block-size-mb 100"
        else:
            return f"scp /tmp/src.qcow2 root@mig_worker:/tmp/"

    @staticmethod
    def _conversion_command(source_cloud: str) -> str:
        if source_cloud == "Azure":
            return "qemu-img convert -f vpc -O qcow2 /tmp/src.vhd /tmp/out.qcow2 && qemu-img convert -c -O qcow2 /tmp/out.qcow2 /tmp/final.qcow2"
        elif source_cloud == "VMware":
            return "qemu-img convert -f vmdk -O qcow2 /tmp/src.vmdk /tmp/out.qcow2"
        else:
            return "qemu-img convert -f raw -O qcow2 /tmp/src.img /tmp/out.qcow2"


# ═══════════════════════════════════════════════════════════════════════════════
# Post-Migration Simulator (Boot Fix, Partition, HSS, UniAgent, LTS, Smoke)
# ═══════════════════════════════════════════════════════════════════════════════

class PostMigrationSimulator:
    """Simulate all post-migration steps: boot fix, partition fix, agent installs, smoke tests."""

    @staticmethod
    def simulate(
        server: dict,
        profile: dict,
        step_id: int,
        offset: float,
        region: str,
        config: SimulationConfig,
        is_image_based: bool = False,
    ) -> Tuple[List[dict], int, float]:
        """Run post-migration workflow. Returns (trace, final_step_id, final_offset)."""
        server_name = server.get("name", server.get("hostname", "unknown"))
        trace: List[dict] = []
        total_offset = offset
        sid = step_id
        is_linux = profile["os_family"] == "linux"

        # ── Boot Fix (more critical for image-based migration) ──
        if is_image_based:
            sid += 1
            boot_fix_cmd = PostMigrationSimulator._boot_fix_command(is_linux, server_name)
            trace.append({
                "id": sid, "phase": "PHASE_4_2f_POST", "agent": f"Agent-{server_name}",
                "action": "BOOT_FIX",
                "target": server_name,
                "message": f"Running boot fix on '{server_name}'. "
                           f"{'Linux: regenerate initramfs + GRUB reinstall.' if is_linux else 'Windows: BCD repair + virtIO driver injection.'}",
                "commands": [{"desc": "Boot fix script", "cmd": boot_fix_cmd}],
                "timestamp_offset_seconds": total_offset,
                "result": "boot_fix_applied",
            })
            total_offset += config.STEP_TIMINGS["boot_fix_linux" if is_linux else "boot_fix_windows"]

        # ── Verify Boot ──
        sid += 1
        trace.append({
            "id": sid, "phase": "PHASE_4_2f_POST", "agent": f"Agent-{server_name}",
            "action": "VERIFY_BOOT",
            "target": server_name,
            "message": f"Rebooting '{server_name}' and verifying successful boot via serial console.",
            "commands": [
                {"desc": "Reboot instance", "cmd": "hcloud ecs reboot --instance-id <id>"},
                {"desc": "Check serial console output", "cmd": "hcloud ecs get-console-output --instance-id <id> --tail 50"},
            ],
            "timestamp_offset_seconds": total_offset,
            "result": "boot_verified",
        })
        total_offset += 60

        # ── Partition Fix ──
        sid += 1
        part_fix_cmd = PostMigrationSimulator._partition_fix_command(is_linux)
        trace.append({
            "id": sid, "phase": "PHASE_4_2f_POST", "agent": f"Agent-{server_name}",
            "action": "PARTITION_FIX",
            "target": server_name,
            "message": f"Checking and expanding disk partitions for '{server_name}'. "
                       f"{'growpart + resize2fs/xfs_growfs' if is_linux else 'Set-Disk + Resize-Partition'}.",
            "commands": [{"desc": "Partition expansion script", "cmd": part_fix_cmd}],
            "timestamp_offset_seconds": total_offset,
            "result": "partitions_expanded",
        })
        total_offset += config.STEP_TIMINGS["partition_fix"]

        # ── HSS Agent Install ──
        sid += 1
        hss_cmd = PostMigrationSimulator._hss_install_command(is_linux)
        trace.append({
            "id": sid, "phase": "PHASE_4_2f_POST", "agent": f"Agent-{server_name} → HSS",
            "action": "HSS_INSTALL",
            "target": server_name,
            "message": f"Installing Host Security Service (HSS) agent on '{server_name}' "
                       f"for endpoint protection and ransomware defense.",
            "commands": [{"desc": "Install HSS agent", "cmd": hss_cmd}],
            "timestamp_offset_seconds": total_offset,
            "result": "hss_installed",
        })
        total_offset += config.STEP_TIMINGS["hss_install"]

        # ── UniAgent Install (CES Monitoring) ──
        sid += 1
        uni_cmd = PostMigrationSimulator._uniagent_install_command(is_linux)
        trace.append({
            "id": sid, "phase": "PHASE_4_2f_POST", "agent": f"Agent-{server_name} → UniAgent",
            "action": "UNIAGENT_INSTALL",
            "target": server_name,
            "message": f"Installing UniAgent (CES monitoring) for RAM/Disk/CPU observability on '{server_name}'.",
            "commands": [{"desc": "Install UniAgent", "cmd": uni_cmd}],
            "timestamp_offset_seconds": total_offset,
            "result": "uniagent_installed",
        })
        total_offset += config.STEP_TIMINGS["uniagent_install"]

        # ── LTS Log Agent Install ──
        sid += 1
        lts_cmd = PostMigrationSimulator._lts_install_command(is_linux, region)
        trace.append({
            "id": sid, "phase": "PHASE_4_2f_POST", "agent": f"Agent-{server_name} → LTS",
            "action": "LTS_INSTALL",
            "target": server_name,
            "message": f"Installing Log Tank Service (LTS) ICAgent for centralized logging on '{server_name}'.",
            "commands": [{"desc": "Install LTS ICAgent", "cmd": lts_cmd}],
            "timestamp_offset_seconds": total_offset,
            "result": "lts_installed",
        })
        total_offset += config.STEP_TIMINGS["lts_install"]

        # ── Smoke Tests ──
        sid += 1
        smoke_cmds = PostMigrationSimulator._smoke_test_commands(is_linux, server_name)
        trace.append({
            "id": sid, "phase": "PHASE_4_2f_POST", "agent": f"Agent-{server_name}",
            "action": "SMOKE_TESTS",
            "target": server_name,
            "message": f"Running smoke tests: ping, SSH, service status, disk mounts, port checks.",
            "commands": smoke_cmds,
            "timestamp_offset_seconds": total_offset,
            "result": "smoke_tests_passed",
        })
        total_offset += config.STEP_TIMINGS["verification_smoke"]

        return trace, sid, total_offset

    @staticmethod
    def _boot_fix_command(is_linux: bool, server_name: str) -> str:
        if is_linux:
            return (
                f"ssh root@{server_name} 'echo -e \"virtio_blk\\nvirtio_net\\nvirtio_scsi\" >> /etc/initramfs-tools/modules; "
                f"update-initramfs -u -k all; grub-install /dev/vda; update-grub; echo BOOT_FIX_OK'"
            )
        else:
            return (
                f"ssh administrator@{server_name} 'bcdedit /set {{default}} ems on; "
                f"bcdboot C:\\Windows /s C: /f ALL; echo BOOT_FIX_OK'"
            )

    @staticmethod
    def _partition_fix_command(is_linux: bool) -> str:
        if is_linux:
            return (
                "growpart /dev/vda 1 2>/dev/null; "
                "resize2fs /dev/vda1 2>/dev/null || xfs_growfs / 2>/dev/null; "
                "pvscan --cache; vgchange -ay; "
                "for lv in $(lvs --noheadings -o lv_path 2>/dev/null); do lvextend -l +100%FREE $lv 2>/dev/null; done; "
                "echo PARTITION_FIX_OK"
            )
        else:
            return (
                "Get-Disk | Where OperationalStatus -eq 'Offline' | Set-Disk -IsOffline $false; "
                "$disk = Get-Disk | Where IsSystem -eq $true; "
                "$part = Get-Partition -DiskNumber $disk.Number | Sort PartitionNumber | Select -Last 1; "
                "$size = Get-PartitionSupportedSize -DiskNumber $disk.Number -PartitionNumber $part.PartitionNumber; "
                "Resize-Partition -DiskNumber $disk.Number -PartitionNumber $part.PartitionNumber -Size $size.SizeMax; "
                "Write-Host PARTITION_FIX_OK"
            )

    @staticmethod
    def _hss_install_command(is_linux: bool) -> str:
        if is_linux:
            return (
                "wget -t 3 -T 15 https://hss-agent.obs.myhuaweicloud.com/linux/install_hss.sh && "
                "bash install_hss.sh && echo HSS_INSTALL_OK"
            )
        else:
            return (
                "Invoke-WebRequest -Uri 'https://hss-agent.obs.myhuaweicloud.com/windows/install_hss.bat' "
                "-OutFile 'C:\\install_hss.bat'; Start-Process -FilePath 'C:\\install_hss.bat' -Wait -NoNewWindow; "
                "Write-Host HSS_INSTALL_OK"
            )

    @staticmethod
    def _uniagent_install_command(is_linux: bool) -> str:
        if is_linux:
            return (
                "cd /usr/local && wget https://uniagent-cn-north-4.obs.cn-north-4.myhuaweicloud.com/package/telescope_linux_amd64.tar.gz && "
                "tar -zxvf telescope_linux_amd64.tar.gz && /usr/local/telescope/install.sh && echo UNIAGENT_INSTALL_OK"
            )
        else:
            return (
                "Invoke-WebRequest -Uri 'https://uniagent-cn-north-4.obs.cn-north-4.myhuaweicloud.com/package/telescope_windows_amd64.zip' "
                "-OutFile 'C:\\telescope_windows.zip'; Expand-Archive -Path 'C:\\telescope_windows.zip' "
                "-DestinationPath 'C:\\Telescope' -Force; cd C:\\Telescope; .\\install.bat; Write-Host UNIAGENT_INSTALL_OK"
            )

    @staticmethod
    def _lts_install_command(is_linux: bool, region: str) -> str:
        if is_linux:
            return (
                f"wget https://icagent-{region}.obs.{region}.myhuaweicloud.com/ICAgent_linux/install.sh && "
                f"bash install.sh && echo LTS_INSTALL_OK"
            )
        else:
            return (
                f"Invoke-WebRequest -Uri 'https://icagent-{region}.obs.{region}.myhuaweicloud.com/ICAgent_windows/install.bat' "
                f"-OutFile 'C:\\install_icagent.bat'; Start-Process -FilePath 'C:\\install_icagent.bat' -Wait -NoNewWindow; "
                f"Write-Host LTS_INSTALL_OK"
            )

    @staticmethod
    def _smoke_test_commands(is_linux: bool, server_name: str) -> list:
        if is_linux:
            return [
                {"desc": "Ping target instance", "cmd": f"ping -c 4 {server_name} && echo PING_OK"},
                {"desc": "SSH connectivity", "cmd": f"ssh -o ConnectTimeout=10 root@{server_name} 'echo SSH_OK'"},
                {"desc": "Check critical services", "cmd": "systemctl list-units --state=running --type=service | grep -E 'ssh|nginx|apache|mysql|postgres'"},
                {"desc": "Check disk mounts", "cmd": "df -h && mount | grep -E '/dev/vd|/dev/sd'"},
                {"desc": "Check listening ports", "cmd": "ss -tlnp | grep -E 'LISTEN'"},
            ]
        else:
            return [
                {"desc": "Ping target instance", "cmd": f"Test-Connection {server_name} -Count 4"},
                {"desc": "RDP connectivity", "cmd": f"Test-NetConnection {server_name} -Port 3389"},
                {"desc": "Check Windows services", "cmd": "Get-Service | Where Status -eq 'Running' | Select Name,Status"},
                {"desc": "Check disk volumes", "cmd": "Get-Volume | Select DriveLetter,SizeRemaining,Size"},
                {"desc": "Check listening ports", "cmd": "netstat -an | findstr LISTENING"},
            ]


# ═══════════════════════════════════════════════════════════════════════════════
# Main Orchestration Simulator
# ═══════════════════════════════════════════════════════════════════════════════

class AgenticExecutionSimulator:
    """Top-level orchestrator: runs full dry-run simulation for a project."""

    @staticmethod
    def simulate(project: dict) -> dict:
        """
        Run the full agentic orchestration dry-run simulation.
        
        Args:
            project: dict with keys — mapperNodes, waves, physics, finops,
                     toolAssignments, executionMode, projectName, region
        
        Returns:
            dict with trace, resource_usage, summary
        """
        config = SimulationConfig()
        mapper_nodes = project.get("mapperNodes", [])
        waves = project.get("waves", [])
        physics = project.get("physics", {})
        finops = project.get("finops", {})
        tool_assignments = project.get("toolAssignments", {})
        region = project.get("region", "la-south-2")
        project_name = project.get("projectName", "UNNAMED")
        concurrency = int(physics.get("concurrency", 5)) if physics else 5

        # Auto-group waves if needed
        if not waves and mapper_nodes:
            waves = AgenticExecutionSimulator._auto_group_waves(mapper_nodes, concurrency)

        trace: List[dict] = []
        resource_usage = {
            "agents_spawned": 0,
            "eips_consumed": 0,
            "vpcs_created": 0,
            "subnets_created": 0,
            "security_groups_created": 0,
            "instances_provisioned": 0,
            "cbr_vaults_used": 0,
            "obs_buckets_created": 0,
            "mig_workers_deployed": 0,
            "images_registered_ims": 0,
            "peak_parallel_agents": 0,
            "sms_migrations_attempted": 0,
            "sms_migrations_succeeded": 0,
            "image_migrations_performed": 0,
            "troubleshooting_incidents": 0,
        }
        total_simulated_seconds = 0
        step_id = 0
        wave_timeline = []
        all_server_outcomes = {}

        # ═══ PHASE 4.0: Orchestrator Initialization ═══
        step_id += 1
        trace.append({
            "id": step_id, "phase": "PHASE_4_0", "agent": "Orchestrator",
            "action": "INIT",
            "message": (
                f"Agentic Orchestrator initialized for project '{project_name}' in {region}. "
                f"Concurrency limit: {concurrency} parallel agents. "
                f"Mode: DRY-RUN (simulation only — NO cloud resources modified). "
                f"Servers in topology: {len(mapper_nodes)}. Waves defined: {len(waves)}. "
                f"Physics: {physics.get('bandwidthMbps', 'N/A')} Mbps, "
                f"Budget: ${finops.get('budget', 'N/A')}. "
                f"This simulation models the EXACT command sequences, decision trees, "
                f"and fallback paths that would execute in a live agentic run."
            ),
            "timestamp_offset_seconds": 0,
            "decision": None,
        })
        total_simulated_seconds += config.STEP_TIMINGS["agent_spawn"]

        # ═══ PHASE 4.1: Network Provisioning ═══
        step_id += 1
        network = NetworkTemplateBuilder.build_from_topology(mapper_nodes, region, config)

        trace.append({
            "id": step_id, "phase": "PHASE_4_1", "agent": "Orchestrator → RFS Agent",
            "action": "NETWORK_PROVISION",
            "message": (
                f"Deploying landing zone via {network['deployment_tool']} using template "
                f"'{network['deployment_template']}'. VPC: {network['vpc_cidr']} ({network['vpc_name']}). "
                f"Subnets: management {network['subnets'][0]['cidr']}, "
                f"application {network['subnets'][1]['cidr']}, "
                f"data {network['subnets'][2]['cidr']}. "
                f"Security Groups: sg-mgmt (SSH/RDP/HTTPS), sg-app (app ports), sg-data (DB ports). "
                f"NAT Gateway: {network['nat_gateway']['name']} with EIP. "
                f"Tier distribution: {network['tier_summary']}."
            ),
            "commands": [
                {"desc": "Apply RFS template", "cmd": f"hcloud rfs apply-template --name latam-erp-landing-zone-v3 --region {region} --params vpc_cidr={network['vpc_cidr']}"},
                {"desc": "Verify VPC created", "cmd": f"hcloud vpc describe --name {network['vpc_name']}"},
                {"desc": "Verify subnets", "cmd": f"hcloud vpc subnets --vpc {network['vpc_name']}"},
                {"desc": "Create security groups", "cmd": "hcloud vpc security-group create --name sg-mgmt && hcloud vpc security-group create --name sg-app && hcloud vpc security-group create --name sg-data"},
                {"desc": "Apply SG rules", "cmd": "for sg in sg-mgmt sg-app sg-data; do hcloud vpc security-group-rule import --file $sg-rules.json; done"},
                {"desc": "Create NAT Gateway + EIP", "cmd": f"hcloud nat create --vpc {network['vpc_name']} --subnet management && hcloud eip create --bandwidth 100 && hcloud nat bind-eip --nat {network['nat_gateway']['name']}"},
            ],
            "network_spec": network,
            "timestamp_offset_seconds": total_simulated_seconds,
            "decision": {"tool": network["deployment_tool"], "template": network["deployment_template"]},
        })
        total_simulated_seconds += config.STEP_TIMINGS["network_provision"]
        resource_usage["vpcs_created"] += 1
        resource_usage["subnets_created"] += 3
        resource_usage["security_groups_created"] += 3
        resource_usage["eips_consumed"] += 1  # NAT gateway

        # ═══ PHASE 4.2: Wave Processing ═══
        servers_processed = 0
        for wave_idx, wave in enumerate(waves):
            wave_name = wave.get("name", f"Wave-{wave_idx + 1}")
            wave_servers_raw = wave.get("servers", [])

            # Resolve server IDs to full objects
            wave_servers = []
            for s in wave_servers_raw:
                if isinstance(s, str):
                    resolved = next((n for n in mapper_nodes if n.get("id") == s or n.get("name") == s), None)
                    if resolved:
                        wave_servers.append(resolved)
                    else:
                        wave_servers.append({"id": s, "name": s})
                else:
                    wave_servers.append(s)

            if not wave_servers:
                continue

            step_id += 1
            trace.append({
                "id": step_id, "phase": "PHASE_4_2", "agent": "Orchestrator",
                "action": "WAVE_START",
                "message": (
                    f"▶️ Starting {wave_name}: {len(wave_servers)} servers. "
                    f"Based on Physics Engine estimates: ~{len(wave_servers) * 2:.0f}h-{len(wave_servers) * 4:.0f}h window. "
                    f"Servers: {[s.get('name',s.get('id','?')) for s in wave_servers]}."
                ),
                "timestamp_offset_seconds": total_simulated_seconds,
                "decision": {"wave": wave_name, "server_count": len(wave_servers)},
            })
            total_simulated_seconds += config.STEP_TIMINGS["agent_spawn"]

            # Process in batches respecting concurrency
            for batch_start in range(0, len(wave_servers), concurrency):
                batch = wave_servers[batch_start:batch_start + concurrency]
                batch_agents = len(batch)
                resource_usage["agents_spawned"] += batch_agents
                resource_usage["peak_parallel_agents"] = max(
                    resource_usage["peak_parallel_agents"], batch_agents
                )

                batch_results = []
                for server in batch:
                    # ── Project-agnostic enrichment: classify + history + skills ──
                    profile = ServerProfiler.classify(server)
                    enriched_profile = ServerProfiler.enrich_with_history(profile, server)
                    applicable_skills = SkillRegistry.get_skills_for_server(enriched_profile, server)
                    history_matches = ExecutionHistoryStore.query_similar(enriched_profile, server)
                    # ── Federated knowledge: query all 3 sources ──
                    knowledge = KnowledgeProvider.query(
                        enriched_profile, server,
                        skill_matches=applicable_skills,
                        history_matches=history_matches
                    )
                    # Inject knowledge trace enrichment into trace
                    enrichment = KnowledgeProvider.generate_trace_enrichment(
                        enriched_profile, server, step_id
                    )
                    trace.extend(enrichment["trace_entries"])
                    step_id += len(enrichment["trace_entries"])
                    
                    server_result = AgenticExecutionSimulator._process_single_server(
                        server, physics, tool_assignments, step_id,
                        total_simulated_seconds, region, config,
                        enriched_profile=enriched_profile,
                        applicable_skills=applicable_skills,
                        history_matches=history_matches,
                        knowledge=knowledge
                    )
                    step_id = server_result["final_step_id"]
                    total_simulated_seconds = server_result["final_offset"]
                    # ── CRITICAL: Ingest per-server command-level trace into main trace ──
                    trace.extend(server_result["trace"])
                    batch_results.append(server_result)
                    servers_processed += 1
                    all_server_outcomes[server_result["server_name"]] = {
                        "outcome": server_result["outcome"],
                        "path_taken": server_result["path_taken"],
                        "sync_hours": server_result["sync_hours"],
                    }

                # Batch handoff — agents report back to Orchestrator
                for idx, result in enumerate(batch_results):
                    step_id += 1
                    # Get the server node for OS/role info
                    server_node = batch[idx] if idx < len(batch) else {}
                    hook_server_name = result['server_name']
                    trace.append({
                        "id": step_id, "phase": "PHASE_4_2", "agent": f"Agent-{hook_server_name}",
                        "action": "HANDOFF",
                        "target": hook_server_name,
                        "os": server_node.get("os", profile.get("os", "unknown") if 'profile' in dir() else "unknown"),
                        "role": profile.get("role", "unknown") if 'profile' in dir() else "unknown",
                        "path_taken": result["path_taken"],
                        "outcome": result["outcome"],
                        "message": (
                            f"Agent for '{hook_server_name}' reports: {result['outcome']}. "
                            f"Path: {result['path_taken']}. Sync time: {result['sync_hours']:.1f}h."
                        ),
                        "timestamp_offset_seconds": total_simulated_seconds,
                        "metrics": {"sync_hours": result['sync_hours']},
                        "decision": {"outcome": result["outcome"], "sync_hours": result["sync_hours"]},
                    })
                    total_simulated_seconds += config.STEP_TIMINGS["handoff"]

            # Wave completion
            wave_start_time = total_simulated_seconds - len(wave_servers) * 1000  # approximate
            wave_end_time = total_simulated_seconds
            wave_duration_min = (total_simulated_seconds - wave_start_time) / 60 if wave_start_time > 0 else 0

            step_id += 1
            trace.append({
                "id": step_id, "phase": "PHASE_4_2", "agent": "Orchestrator",
                "action": "WAVE_COMPLETE",
                "message": (
                    f"🏁 {wave_name} complete. {len(wave_servers)} servers migrated. "
                    f"Outcomes: {[all_server_outcomes.get(s.get('name',s.get('id','?')),{}).get('outcome','?') for s in wave_servers]}. "
                    f"Advancing to post-validation."
                ),
                "timestamp_offset_seconds": total_simulated_seconds,
                "decision": None,
            })

            wave_timeline.append({
                "wave": wave_name,
                "servers": len(wave_servers),
                "duration_minutes": round(total_simulated_seconds / 60, 1),
                "server_outcomes": [all_server_outcomes.get(s.get("name", s.get("id", "?")), {}) for s in wave_servers],
            })
            total_simulated_seconds += config.STEP_TIMINGS["post_validation"]

        # ═══ PHASE 4.7: Garbage Collection ═══
        step_id += 1
        trace.append({
            "id": step_id, "phase": "PHASE_4_7", "agent": "Orchestrator → GC Agent",
            "action": "GARBAGE_COLLECTION",
            "message": (
                "Cleaning up transient resources: "
                "terminating mig_worker servers, releasing temp EIPs, "
                "deleting OBS migration buckets, purging intermediate images from IMS."
            ),
            "commands": [
                {"desc": "Terminate mig_worker instances", "cmd": "hcloud ecs terminate --instance-ids mig_worker_ids.txt --force"},
                {"desc": "Release temp EIPs", "cmd": "hcloud eip release --eip-ids temp_eip_ids.txt"},
                {"desc": "Delete OBS migration bucket", "cmd": "obsutil rm obs://latam-migration-<region> -r -f"},
                {"desc": "Deregister intermediate IMS images", "cmd": "hcloud ims delete --image-ids intermediate_image_ids.txt"},
            ],
            "timestamp_offset_seconds": total_simulated_seconds,
            "decision": {"cleanup_mode": "full"},
        })
        total_simulated_seconds += config.STEP_TIMINGS["garbage_collection"]

        # ═══ Phase 4.8: Finalize ═══
        step_id += 1
        total_hours = total_simulated_seconds / 3600
        try:
            budget_raw = finops.get("budget")
            budget = float(budget_raw if budget_raw is not None else 10000)
        except Exception:
            logger.error(f"Budget parse failed: finops={finops}", exc_info=True)
            budget = 10000.0
        estimated_cost = AgenticExecutionSimulator._estimate_cost(
            resource_usage, total_hours, physics
        )
        cost_efficiency = "UNDER_BUDGET" if estimated_cost <= budget else "OVER_BUDGET"

        sms_ok = resource_usage["sms_migrations_succeeded"]
        sms_total = resource_usage["sms_migrations_attempted"]
        image_count = resource_usage["image_migrations_performed"]

        trace.append({
            "id": step_id, "phase": "PHASE_4_8", "agent": "Orchestrator",
            "action": "FINALIZE",
            "message": (
                f"🎉 AGENTIC ORCHESTRATION COMPLETE. "
                f"Total simulated time: {total_hours:.1f} hours ({total_hours/24:.1f} days). "
                f"Servers: {servers_processed}/{len(mapper_nodes)} processed. "
                f"SMS migrations: {sms_ok}/{sms_total} succeeded. "
                f"Image-based migrations: {image_count} performed. "
                f"Troubleshooting incidents: {resource_usage['troubleshooting_incidents']}. "
                f"Estimated cost: ${estimated_cost:.0f} / ${budget:.0f} budget → {cost_efficiency}. "
                f"All transient resources cleaned up. Target environment ready for handoff."
            ),
            "timestamp_offset_seconds": total_simulated_seconds,
            "decision": {"cost_efficiency": cost_efficiency},
        })

        # ── Build summary ──
        summary = {
            "project": project_name,
            "mode": "agentic",
            "dry_run": True,
            "note": "DRY-RUN — no cloud resources were provisioned or modified.",
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "servers_total": len(mapper_nodes),
            "servers_processed": servers_processed,
            "waves_count": len(waves),
            "total_simulated_hours": round(total_hours, 2),
            "estimated_wall_clock_days": round(total_hours / 24, 1),
            "peak_parallel_agents": resource_usage["peak_parallel_agents"],
            "effective_throughput_mbps": SmsMigrationSimulator._simulate_throughput(physics),
            "cost_estimate_usd": round(estimated_cost, 0),
            "budget_usd": budget,
            "cost_efficiency": cost_efficiency,
            "migration_paths": {
                "sms_primary": sms_ok,
                "sms_total_attempted": sms_total,
                "image_fallback": image_count,
            },
            "troubleshooting_incidents": resource_usage["troubleshooting_incidents"],
            "resource_usage": {
                k: v for k, v in resource_usage.items()
                if not k.startswith("_")
            },
        }

        # ── Learning Feedback Loop: ingest this simulation's outcomes ──
        # Every simulated server becomes a data point for future projects.
        # The system gets smarter with each run.
        simulation_result_for_history = {
            "trace": trace,
            "summary": summary,
        }
        ExecutionHistoryStore.ingest(simulation_result_for_history)
        history_stats = ExecutionHistoryStore.get_stats()
        
        summary["learning_system"] = {
            "records_ingested": len(trace),
            "total_history_records": history_stats["total_records"],
            "success_rate": history_stats["success_rate"],
            "strategy_distribution": history_stats["strategy_distribution"],
            "unique_projects": history_stats["unique_projects"],
            "note": (
                "This simulation's outcomes have been ingested into the cross-project "
                "learning store. Future simulations for other projects will query this "
                "data and apply relevant learnings, making the system progressively "
                "smarter with each execution."
            ),
        }

        # ── External knowledge stats ──
        try:
            ext_stats = ExternalKnowledgeStore.get_stats()
            summary["external_knowledge"] = {
                "source": EXTERNAL_REPO_URL,
                "total_skills": ext_stats["total_entries"],
                "last_sync": ext_stats["last_sync"],
                "categories": ext_stats["categories"],
                "migration_types": ext_stats["migration_types"],
                "note": (
                    "External skills imported from binrogithub/1-3-Cloud-Adoption-Skills. "
                    "Auto-synced every 6 hours via git pull."
                ),
            }
        except Exception:
            summary["external_knowledge"] = {"status": "unavailable", "source": EXTERNAL_REPO_URL}

        return {
            "success": True,
            "trace": trace,
            "resource_usage": resource_usage,
            "timeline": wave_timeline,
            "summary": summary,
        }

    @staticmethod
    def _process_single_server(
        server: dict,
        physics: dict,
        tool_assignments: dict,
        step_id: int,
        offset: float,
        region: str,
        config: SimulationConfig,
        enriched_profile: dict = None,
        applicable_skills: list = None,
        history_matches: list = None,
        knowledge: dict = None,
    ) -> dict:
        """Process one server through the complete migration decision tree.
        
        Now project-agnostic: enriched_profile carries history-informed strategy,
        applicable_skills are dynamically matched from SkillRegistry,
        history_matches provide cross-project learnings,
        and knowledge provides federated recommendation from all 3 sources.
        """
        server_name = server.get("name", server.get("hostname", server.get("id", "unknown")))
        profile = enriched_profile if enriched_profile else ServerProfiler.classify(server)
        skills = applicable_skills or SkillRegistry.get_skills_for_server(profile, server)

        strategy = profile.get("suggested_strategy", profile["strategy"])
        # ── Knowledge-informed strategy override ──
        if knowledge and knowledge.get("top_recommendation"):
            rec = knowledge["top_recommendation"]
            if rec["confidence"] > 0.8 and rec["source"] in ("skill", "external"):
                old_strategy = strategy
                strategy_map = {
                    "sms": "agentic_blended",
                    "image": "image_primary",
                    "drs": "drs_migration",
                    "mgc": "agentic_blended",
                }
                mapped = strategy_map.get(rec["strategy"])
                if mapped and mapped != strategy and "blocked" not in (strategy, mapped):
                    logger.info(
                        "[Knowledge] Overriding strategy for '%s': %s → %s "
                        "(source: %s, confidence: %.0f%%)",
                        server_name, strategy, mapped, rec["source"], rec["confidence"] * 100
                    )
                    strategy = mapped
        
        all_trace: List[dict] = []
        current_offset = offset
        sid = step_id
        final_outcome = "UNKNOWN"
        final_sync_hours = 0.0
        path_taken = "unknown"

        # ── History-informed pre-flight annotations ──
        history_note = ""
        if profile.get("best_match_project"):
            history_note = (
                f" [📚 Learned from {profile['best_match_project']}: "
                f"similar {profile.get('os')} {profile.get('role')} server — "
                f"strategy suggests '{strategy}']"
            )
        if profile.get("suggestion_reason"):
            history_note += f" [💡 {profile['suggestion_reason']}]"

        # ── Pre-flight: Flavor capacity check ──
        sid += 1
        flavor = server.get("targetFlavor", server.get("flavor", "s6.large.2"))
        capacity_ok = AgenticExecutionSimulator._check_flavor(flavor)
        all_trace.append({
            "id": sid, "phase": "PHASE_4_2_PREFLIGHT",
            "agent": f"Agent-{server_name}",
            "action": "FLAVOR_CAPACITY_CHECK",
            "target": server_name,
            "message": (
                f"Checking flavor '{flavor}' availability in {region}. "
                f"Result: {'AVAILABLE' if capacity_ok else 'RETIRED/OUT_OF_STOCK'}.{history_note}"
            ),
            "history_sourced": bool(history_note),
            "learnings_applied": profile.get("history_learnings", {}),
            "commands": [
                {"desc": "Query ECS flavor availability", "cmd": f"hcloud ecs flavor-describe --flavor {flavor} --region {region}"},
            ],
            "timestamp_offset_seconds": current_offset,
            "decision": {"proceed": capacity_ok, "fallback": "s6.large.2" if not capacity_ok else None},
            "result": "capacity_ok" if capacity_ok else "capacity_flagged",
        })
        current_offset += 10

        # ── Main execution path ──
        if strategy == "sms_primary" or strategy == "sms_with_agent_push":
            # Try SMS path first
            resource_usage_local = {"sms_attempted": 1, "sms_succeeded": 0, "image_performed": 0, "troubleshoots": 0}
            sms_result = SmsMigrationSimulator.simulate(
                server, profile, physics, sid, current_offset, region, config
            )
            all_trace.extend(sms_result["trace"])
            sid = sms_result["final_step_id"]
            current_offset = sms_result["final_offset"]

            if sms_result["outcome"] == "SMS_SUCCESS":
                final_outcome = "SMS_MIGRATION_SUCCESS"
                final_sync_hours = sms_result["sync_hours"]
                path_taken = "sms_primary"
                resource_usage_local["sms_succeeded"] = 1
            elif sms_result["outcome"] == "BLOCKED_MANUAL_AGENT_REQUIRED":
                final_outcome = "BLOCKED"
                path_taken = "blocked_no_agent"
            else:
                # SMS failed — attempt troubleshooting
                resource_usage_local["troubleshoots"] = 1
                ts_result = SmsTroubleshootingSimulator.simulate(
                    server, profile, sms_result["outcome"], sid, current_offset, config
                )
                all_trace.extend(ts_result["trace"])
                sid = ts_result["final_step_id"]
                current_offset = ts_result["final_offset"]

                if ts_result["resolved"]:
                    # Retry SMS after fix
                    sid += 1
                    all_trace.append({
                        "id": sid, "phase": "PHASE_4_2d_RETRY",
                        "agent": f"Agent-{server_name}",
                        "action": "SMS_RETRY_AFTER_FIX",
                        "target": server_name,
                        "message": "Troubleshooting resolved the issue. Retrying SMS migration.",
                        "timestamp_offset_seconds": current_offset,
                        "result": "retrying",
                    })
                    current_offset += config.STEP_TIMINGS["retry_delay"]
                    # Simulate retry success (simplified — would go through full SMS path again)
                    final_outcome = "SMS_MIGRATION_SUCCESS_AFTER_TROUBLESHOOTING"
                    final_sync_hours = sms_result["sync_hours"]
                    path_taken = "sms_after_troubleshooting"
                    resource_usage_local["sms_succeeded"] = 1
                else:
                    # Troubleshooting failed — escalate to image-based
                    sid += 1
                    all_trace.append({
                        "id": sid, "phase": "PHASE_4_2d_TO_4_2e",
                        "agent": f"Agent-{server_name}",
                        "action": "ESCALATE_TO_IMAGE_MIGRATION",
                        "target": server_name,
                        "message": "SMS path exhausted after troubleshooting. Switching to Image-Based Migration.",
                        "timestamp_offset_seconds": current_offset,
                        "decision": {"reason": "sms_troubleshooting_exhausted"},
                        "result": "escalating",
                    })
                    current_offset += 10

                    img_result = ImageMigrationSimulator.simulate(
                        server, profile, physics, sid, current_offset, region, config,
                        reason="sms_troubleshooting_exhausted"
                    )
                    all_trace.extend(img_result["trace"])
                    sid = img_result["final_step_id"]
                    current_offset = img_result["final_offset"]
                    final_outcome = img_result["outcome"]
                    final_sync_hours = img_result["sync_hours"]
                    path_taken = "image_fallback_after_sms_failure"
                    resource_usage_local["image_performed"] = 1

        elif strategy == "image_primary":
            # Start with image-based migration (e.g., for critical DBs)
            img_result = ImageMigrationSimulator.simulate(
                server, profile, physics, sid, current_offset, region, config,
                reason="image_primary_strategy_for_database"
            )
            all_trace.extend(img_result["trace"])
            sid = img_result["final_step_id"]
            current_offset = img_result["final_offset"]
            final_outcome = img_result["outcome"]
            final_sync_hours = img_result["sync_hours"]
            path_taken = "image_primary"

        elif strategy == "manual_agent_required":
            # ── BLOCKED: Full decision tree visibility even when blocked ──
            sid += 1
            all_trace.append({
                "id": sid, "phase": "PHASE_4_2a_BLOCKED", "agent": f"Agent-{server_name}",
                "action": "BLOCKED_STRATEGY_ANALYSIS",
                "target": server_name,
                "message": (
                    f"⛔ Server '{server_name}' is BLOCKED — missing metadata for agentic path. "
                    f"Reason: No data-plane admin access ({profile.get('has_data_plane_admin', False)}), "
                    f"no agent preinstalled ({profile.get('agent_preinstalled', False)}), "
                    f"no source access ({profile.get('has_source_access', False)})."
                ),
                "decision": {"recommended_action": "manual_agent_install_or_image_upload"},
                "result": "blocked",
            })
            current_offset += 5

            # Show what WOULD happen if metadata were provided
            sid += 1
            all_trace.append({
                "id": sid, "phase": "PHASE_4_2a_BLOCKED", "agent": f"Agent-{server_name}",
                "action": "HYPOTHETICAL_PATH_WITH_METADATA",
                "target": server_name,
                "message": (
                    f"💡 If metadata were enriched (e.g., has_data_plane_admin=true), this server would follow: "
                    f"SMS Agent Install via SSH → Full Disk Sync → Delta Syncs → Cutover → Post-Migration Hardening. "
                    f"Applicable skills: {[s['name'] for s in skills]}. "
                    f"History shows {len(history_matches or [])} similar past migrations."
                ),
                "dependencies": [
                    {"name": "metadata_enrichment", "desc": "Run source discovery or add fields to mapperNode", "status": "needed"},
                    {"name": "sms_agent_install", "desc": "Orchestrator pushes agent via SSH with Tier1 credentials", "status": "blocked_on_metadata"},
                    {"name": "network_path", "desc": "VPC/subnet must be provisioned (Phase 4.1)", "status": "ok"},
                ],
                "commands": [
                    {"desc": "If metadata were present, agent install command", "cmd": f"ssh root@<source_ip> 'wget https://sms.{region}.myhuaweicloud.com/sms_agent/sms_agent_linux.tar.gz && tar xzf sms_agent_linux.tar.gz && cd SMS-Agent && ./install.sh --ak <HCLOUD_AK> --sk <HCLOUD_SK> --quiet'"},
                ],
                "timestamp_offset_seconds": current_offset,
                "result": "hypothetical_path_displayed",
            })
            current_offset += 5

            final_outcome = "BLOCKED_MANUAL_AGENT_REQUIRED"
            path_taken = "blocked"

        # Aggregate resource usage (handled by caller)
        return {
            "trace": all_trace,
            "final_step_id": sid,
            "final_offset": current_offset,
            "outcome": final_outcome,
            "sync_hours": final_sync_hours,
            "server_name": server_name,
            "path_taken": path_taken,
            "profile": profile,
        }

    @staticmethod
    def _check_flavor(flavor: str) -> bool:
        """Check if flavor is retired/out-of-stock."""
        retired = ["s3.", "c3.", "m3.", "s2.", "c2."]
        return not any(r in str(flavor).lower() for r in retired)

    @staticmethod
    def _auto_group_waves(mapper_nodes: list, max_per_wave: int) -> list:
        """Auto-group servers into waves by role priority."""
        groups = {"database": [], "web": [], "infrastructure": [], "app": [], "cache": []}
        for node in mapper_nodes:
            profile = ServerProfiler.classify(node)
            role = profile["role"]
            groups.setdefault(role, []).append(node)

        waves = []
        for group_name in ["database", "web", "app", "infrastructure", "cache"]:
            group = groups.get(group_name, [])
            if not group:
                continue
            for i in range(0, len(group), max_per_wave):
                batch = group[i:i + max_per_wave]
                label = group_name if len(group) <= max_per_wave else f"{group_name} batch {i//max_per_wave+1}"
                waves.append({
                    "name": label.capitalize(),
                    "servers": batch,
                    "serverNames": [n.get("name", n.get("id", "?")) for n in batch],
                })
        return waves

    @staticmethod
    def _estimate_cost(resource_usage: dict, total_hours: float, physics: dict) -> float:
        """Estimate cloud cost based on resources provisioned + time."""
        # Rough cost model (USD)
        cost = 0.0
        cost += resource_usage.get("eips_consumed", 0) * total_hours * 0.02  # EIP hourly
        cost += resource_usage.get("vpcs_created", 0) * 0.0  # VPC free
        cost += resource_usage.get("instances_provisioned", 0) * total_hours * 0.25  # ECS hourly avg
        cost += resource_usage.get("mig_workers_deployed", 0) * total_hours * 0.15
        cost += resource_usage.get("obs_buckets_created", 0) * 5.0  # bucket + storage
        cost += resource_usage.get("images_registered_ims", 0) * 2.0  # IMS registration fee
        cost += resource_usage.get("cbr_vaults_used", 0) * 10.0
        return max(cost, 100)


# ═══════════════════════════════════════════════════════════════════════════════
# Flask Route Registration
# ═══════════════════════════════════════════════════════════════════════════════

def register_agentic_dry_run_routes(execution_bp):
    """Register the agentic dry-run endpoint on the execution blueprint.
    
    Endpoints:
      POST /api/projects/<project_id>/simulate-orchestration  (legacy, project-agnostic)
      POST /api/projects/<project_id>/agentic-dry-run          (new, same handler)
    
    Both endpoints are idempotent dry-run operations — no JWT required
    since they only simulate and do not modify cloud resources.
    """
    from flask import request, jsonify
    from models import ProjectData

    def _handle_dry_run(project_id):
        """Shared handler for all dry-run endpoints."""
        try:
            project_record = ProjectData.query.get(project_id)
            if not project_record:
                return jsonify({"success": False, "error": "Project not found"}), 404

            project_data = json.loads(project_record.data) if isinstance(project_record.data, str) else project_record.data
            # Handle double-serialization edge case
            if isinstance(project_data, str):
                project_data = json.loads(project_data)

            # Build execution contract from ANY project's data
            contract = {
                "projectName": project_data.get("name", "UNNAMED"),
                "region": project_data.get("region", "la-south-2"),
                "mapperNodes": project_data.get("mapperNodes", []),
                "waves": project_data.get("waves", []),
                "physics": project_data.get("physics") or {},
                "finops": {
                    "budget": project_data.get("budget") or project_data.get("financials", {}).get("budget") if project_data.get("financials") else 10000,
                    "financials": project_data.get("financials") or {},
                },
                "toolAssignments": project_data.get("toolAssignments", project_data.get("recommendations", [])),
                "executionMode": "agentic",
            }

            result = AgenticExecutionSimulator.simulate(contract)
            return jsonify(result), 200

        except Exception as e:
            import traceback
            logger.exception(f"Agentic dry-run failed for project {project_id}")
            return jsonify({
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc()
            }), 500

    # Register BOTH paths — legacy + new — using the same handler
    execution_bp.route("/api/projects/<project_id>/simulate-orchestration", methods=["POST"])(_handle_dry_run)
    execution_bp.route("/api/projects/<project_id>/agentic-dry-run", methods=["POST"])(_handle_dry_run)
