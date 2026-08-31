"""
Migration Operation Executor — task-descriptive delegation to Hermes agent.

Each operation prompt includes:
1. OBJECTIVE — what success looks like (verifiable)
2. APPROACH — try in order, with alternatives
3. TROUBLESHOOTING — known error codes, log locations, alternative methods
4. VERIFICATION — how to confirm success
5. PERSISTENCE — do NOT stop until verified or all options exhausted

The agent is warmed up with every scenario from the skills + MCPs.
"""

import json
import os
import time
import logging
import subprocess

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# OPERATION DEFINITIONS — warmed-up prompts with full troubleshooting
# ═══════════════════════════════════════════════════════════════════════════

MIGRATION_OPERATIONS = {
    "SMS_AGENT_INSTALL": {
        "objective": "The source server MUST appear in `hcloud SMS ListServers --cli-region={source_region} --cli-profile=erp-target` output as a registered source with state=waiting or state=active.",
        "approach": [
            "Read the huawei-cloud-sms-migration skill from the knowledge tree (68 skills available)",
            "SSH to the source server at {source_ip} (user={os_user}, password={os_password})",
            "Check if /tmp/SMS-Agent/ already exists from previous attempts",
            "If not: download SMS-Agent.tar.gz from https://sms-agent.obs.cn-north-1.myhuaweicloud.com/SMS-Agent.tar.gz",
            "Extract and run startup.sh — it's INTERACTIVE and asks for: EULA (y), AK, SK, sms_domain, rsync install (y), warnings (y)",
            "The AK/SK must be the TARGET account's MASTER AK/SK: AK={target_ak} SK={target_sk}",
            "The sms_domain is: sms.{source_region}.myhuaweicloud.com",
        ],
        "troubleshooting": [
            "If startup.sh interactive prompts fail with printf piping: run linuxmain directly with: cd /tmp/SMS-Agent/agent && nohup ./linuxmain <<< '{target_ak} {target_sk} sms.{source_region}.myhuaweicloud.com' > /dev/null 2>&1 &",
            "If SMS.0306 (GET /v3/config failed): agent can't reach SMS API — verify AK/SK are correct (AK must be 20 chars, SK must be 40 chars), verify network connectivity to sms.{source_region}.myhuaweicloud.com",
            "If SMS.0202 (AK/SK auth failed): the SMS agent MUST use the TARGET account's MASTER AK/SK, not source account. The Master AK/SK has full IAM permissions across all regions including the target region.",
            "If SMS.0515: disk info mismatch — run hcloud SMS ShowServer to get disk IDs, update with hcloud SMS UpdateDiskInfo",
            "If agent process (linuxmain) not running: check /tmp/SMS-Agent/agent/Logs/startup.log and /tmp/SMS-Agent/agent/Logs/check.log for errors",
            "If auth.cfg has no AK/SK: write directly: echo '[auth]\\nak = {target_ak}\\nsk = {target_sk}' >> /tmp/SMS-Agent/agent/config/auth.cfg",
            "If screen sessions stuck from previous attempts: kill them with 'screen -ls | grep sms_agent | cut -d. -f1 | xargs -I{} screen -S {} -X quit' and 'pkill -f startup.sh; pkill -f linuxmain'",
            "If startup.sh keeps failing: bypass it entirely — write auth.cfg manually, then run: cd /tmp/SMS-Agent/agent && nohup ./linuxmain <<< '{target_ak} {target_sk} sms.{source_region}.myhuaweicloud.com' &",
            "Check enterprise project selection — if prompted, enter 0 (default)",
        ],
        "verification": [
            "Run: hcloud SMS ListServers --cli-region={source_region} --cli-profile=erp-target",
            "The source server must appear in the list with a valid ID",
            "If not listed: check if linuxmain is running (ps aux | grep linuxmain), check logs, try alternative approach",
            "Do NOT report success until the source appears in SMS console",
        ],
        "context_fields": ["source_ip", "os_user", "os_password", "target_ak", "target_sk", 
                          "source_region", "target_region", "source_server_name"],
        "skill_hints": ["huawei-cloud-sms-migration", "huawei-cloud-sms-migration-exact-disk-config", "huawei-cloud-sms-0515-fix"],
    },
    "SMS_SOURCE_LIST": {
        "objective": "Return the list of all source servers registered in SMS, with their IDs, names, states, and connection status.",
        "approach": [
            "Try MCP: search the 173 MCP servers for an SMS-related service (smsapi) that has a ListServers tool",
            "Try hcloud: hcloud SMS ListServers --cli-region={source_region} --cli-profile=erp-target (uses TARGET account AK/SK, NOT source)",
            "Parse the JSON response for: id, name, state, connected fields",
        ],
        "troubleshooting": [
            "If MCP fails: check if the smsapi MCP server is started, try starting it",
            "If hcloud returns empty: verify using TARGET account profile (erp-target), NOT source profile (erp-source). SMS API uses target account credentials.",
            "If hcloud returns error: check --cli-profile and --cli-region are correct",
        ],
        "verification": ["The output must contain a JSON array of source servers"],
        "context_fields": ["source_region", "target_ak", "target_sk"],
        "skill_hints": ["huawei-cloud-sms-migration"],
    },
    "SMS_DISK_MAPPING": {
        "objective": "Return the disk configuration of the source server from SMS, mapping each disk's ID, size, device_use (OS/DATA), and physical volumes.",
        "approach": [
            "Run: hcloud SMS ShowServer --source_id={source_server_id} --cli-region={source_region} --cli-profile=erp-source",
            "Parse the 'disks' array from the response",
            "Map: disk.id = SMS disk ID, disk.size = bytes, disk.device_use = BOOT/OS/DATA",
            "For each disk, note physical_volumes (partition info)",
        ],
        "troubleshooting": [
            "If source_id not found: source not registered in SMS — run SMS_AGENT_INSTALL first",
            "If disks empty: agent hasn't finished collecting disk info — wait 2-3 minutes and retry",
            "SMS.0515 fix: use EVS Volume ID (from target ECS) as disk_id, NOT SMS disk ID",
        ],
        "verification": ["The output must contain disk array with at least 1 disk (system disk with device_use=OS)"],
        "context_fields": ["source_server_id", "source_region", "target_ak", "target_sk"],
        "skill_hints": ["huawei-cloud-sms-migration-exact-disk-config", "huawei-cloud-sms-0515-fix"],
    },
    "SMS_TASK_CREATE": {
        "objective": "Create an SMS migration task and return the task_id. The task maps source server to target ECS with correct disk configuration.",
        "approach": [
            "Search /root/.hermes/skills/ for 'SMS CreateTask' and read sms-api-cli-reference + huawei-cloud-sms-migration skills",
            "Read /root/.hermes/skills/devops/huawei-cloud-sms-migration/scripts/configure_sms_target.py — shows correct REST API approach with HMAC-SHA256",
            "IMPORTANT: Disk size in SMS API must be in GB (integer 80), NOT bytes (85899345920)",
            "IMPORTANT: If a server template exists, use vm_template_id instead of manual disk config",
            "Get source server ID from SMS: hcloud SMS ListServers --cli-region={source_region} --cli-profile=erp-target (key=source_servers)",
            "Get target ECS EVS volume ID: hcloud ECS NovaShowServer → os-extended-volumes:volumes_attached[0].id",
            "Get target EIP: hcloud EIP ListPublicips → match by device_id",
            "Create task: hcloud SMS CreateTask --cli-region={source_region} --cli-profile=erp-target",
            "  --source_server.id={source_server_id} --target_server.vm_id={target_server_id}",
            "  --use_public_ip=true --migration_ip=<EIP> --type=MIGRATE_BLOCK --os_type=LINUX",
            "  --target_server.disks.1.name=/dev/vda --target_server.disks.1.device_use=BOOT",
            "  --target_server.disks.1.disk_id=<EVS_volume_id> --target_server.disks.1.size=80",
            "  --target_server.disks.1.physical_volumes.1.name=/dev/vda1 --target_server.disks.1.physical_volumes.1.device_use=OS",
            "  --target_server.disks.1.physical_volumes.1.mount_point=/ --target_server.disks.1.physical_volumes.1.file_system=ext4",
            "  --auto_start=false --start_target_server=true",
        ],
        "troubleshooting": [
            "SMS.0202 (AK/SK auth failed): the SMS task uses the TARGET account's MASTER AK/SK. The source server's migproject must target the destination region. Update with: hcloud SMS UpdateServerName --source_id={source_server_id} --migprojectid=<migproject_id> --cli-region={source_region} --cli-profile=erp-target",
            "SMS.3805 (connection timeout): target SG must have TCP 22+8900+8899 ingress AND be associated with the ECS. Verify SG association with hcloud ECS ShowServer. Use hcloud VPC UpdatePort to associate SG with ECS port.",
            "SMS.3803 (public key verification): target OS was changed → restart SMS agent on source to clear cached host keys. Do NOT change target OS.",
            "SMS.0806 at MIGRATE_LINUX_FILE (partition sync failed): The SMS temp staging area (/mnt/vdb1) overflows. Even with MIGRATE_BLOCK, Linux still uses file_migrate internally. FIXES: (1) Enable Partition Resize in target config so target disk ≥ source disk. (2) SSH to source, edit /tmp/SMS-Agent/agent/config/check-property.cfg — set exclude.item.before=/proc,/sys,/dev,/run,/tmp,/var/tmp in ALL subtask sections. The /proc/kcore file is 128TB virtual and MUST be excluded. (3) Restart SMS agent after editing config.",
            "SMS.0806 at ATTACH_AGENT_IMAGE 80%: Pre-provisioned ECS fails at 80%. FIX: Let SMS create the target server itself (CREATE_CLOUD_SERVER subtask) instead of pre-provisioning. This means NOT passing target_server.vm_id — let SMS auto-create. Alternatively, ensure EVS quota is sufficient (delete orphaned volumes).",
            "SMS.0515: disk mismatch — delete task, run hcloud SMS UpdateDiskInfo with exact source disk config, recreate task",
            "SMS.6602: invalid floating IP — use --use_public_ip=true and --migration_ip=<EIP> (NOT private IP)",
            "SMS.6103: wrong disk ID type — use EVS Volume ID from target ECS (os-extended-volumes:volumes_attached[0].id), not SMS disk ID",
            "SMS.6517: rsync not installed — install on source: apt-get install rsync",
            "SMS.6520: source not available — UpdateDiskInfo, restart SMS agent, wait for state=waiting",
            "SMS.7711: illegal task name — use simple alphanumeric name like MigrationTask01 (no hyphens/special chars)",
            "SMS.7605: target server already in another task — delete existing task first: hcloud SMS DeleteTask --task_id=<existing>",
            "ATTACH_AGENT_IMAGE 80% barrier: Pre-provisioned ECS consistently fails at 80%. SOLUTION: Let SMS create target server (no vm_id in CreateTask) OR ensure target ECS has correct SG + sufficient EVS quota + target disk ≥ source disk (80GB). When SMS creates ECS itself (CREATE_CLOUD_SERVER subtask), ATTACH_AGENT_IMAGE passes 100%.",
            "SSL_CONFIG fails at 50%: source migproject must target destination region. Check with hcloud SMS ListMigprojects.",
            "If MCP smsapi available: try CreateTask via MCP first, fall back to hcloud",
        ],
        "verification": ["hcloud SMS ShowTask --task_id=<task_id> must return the task with state=READY or state=NOT_STARTED"],
        "context_fields": ["source_server_id", "target_server_id", "source_region", "target_region",
                          "source_server_name", "target_ak", "target_sk", "os_type"],
        "skill_hints": ["huawei-cloud-sms-migration-exact-disk-config", "huawei-cloud-sms-0515-fix", "huawei-cloud-sms-migration"],
    },
    "SMS_TASK_START": {
        "objective": "Start the SMS migration task. Task state must change from NOT_STARTED to RUNNING or SYNCING.",
        "approach": [
            "Run: hcloud SMS UpdateTaskStatus --task_id={task_id} --operation=start --cli-region={source_region} --cli-profile=erp-source",
        ],
        "troubleshooting": [
            "If task already running: check state with hcloud SMS ShowTask, may already be started",
            "If task in error state: check error_code and error_msg, may need to delete and recreate",
        ],
        "verification": ["hcloud SMS ShowTask --task_id={task_id} must show state=RUNNING or state=SYNCING"],
        "context_fields": ["task_id", "source_region", "target_ak", "target_sk"],
        "skill_hints": ["huawei-cloud-sms-migration"],
    },
    "SMS_SYNC_MONITOR": {
        "objective": "Monitor the SMS migration task until it reaches SUCCESS or FAILED. Report progress percentage and state changes.",
        "approach": [
            "Poll: hcloud SMS ShowTask --task_id={task_id} --cli-region={source_region} --cli-profile=erp-target",
            "States: waiting → setting → READY → RUNNING → SUCCESS (or FAILED/MIGRATE_FAIL/ABORT)",
            "Track: state, migrate_progress, sub_tasks progress",
            "Poll every 30 seconds until terminal state",
            "Subtask progression for Linux: CREATE_CLOUD_SERVER → SSL_CONFIG → ATTACH_AGENT_IMAGE → FORMAT_DISK_LINUX_FILE → MIGRATE_LINUX_FILE",
            "If CREATE_CLOUD_SERVER subtask exists: SMS is creating the target ECS itself (preferred — bypasses ATTACH_AGENT_IMAGE 80% barrier)",
        ],
        "troubleshooting": [
            "SMS.3805: connection timeout — check SG rules allow port 22+8900 on target, check source agent is running",
            "SMS.0515: disk mismatch during sync — may need to delete task, UpdateDiskInfo, recreate",
            "ATTACH_AGENT_IMAGE stuck at 80%: if using pre-provisioned ECS, this is the known barrier. Delete task, recreate WITHOUT target_server.vm_id to let SMS create ECS itself.",
            "MIGRATE_LINUX_FILE fails at 0% (SMS.0806): temp disk /mnt/vdb1 overflows. SSH to source, edit /tmp/SMS-Agent/agent/config/check-property.cfg, set exclude.item.before=/proc,/sys,/dev,/run,/tmp,/var/tmp in all sections, restart agent, restart task.",
            "If progress stuck at 0% for >10min: check source agent connectivity (ps aux | grep linuxmain on source)",
            "If state=FAILED or MIGRATE_FAIL: read error_json field for details, report error_code and error_msg",
            "If state=ABORT/ABORTING: task was stopped or errored — check error log, fix root cause, restart with hcloud SMS UpdateTaskStatus --operation=restart",
        ],
        "verification": ["Task must reach state=SUCCESS (migration complete) or state=FAILED (with error details)"],
        "context_fields": ["task_id", "source_region", "target_ak", "target_sk", "max_wait"],
        "skill_hints": ["huawei-cloud-sms-migration", "huawei-cloud-sms-0515-fix", "sms-error-codes-troubleshooting"],
    },
    "SMS_CUTOVER": {
        "objective": "Execute cutover: stop source, start target, verify target is running with migrated data.",
        "approach": [
            "Verify task state=SUCCESS (sync complete)",
            "Stop source server: hcloud ECS StopServers --servers.1.id={source_server_id} --cli-region={source_region}",
            "Start target server: hcloud ECS StartServers --servers.1.id={target_server_id} --cli-region={target_region}",
            "Wait for target to be ACTIVE",
            "SSH to target and verify data integrity",
        ],
        "troubleshooting": [
            "Boot failure: check GRUB, fstab, network config — use boot-fixes skill",
            "Network issues: check VPC/subnet/SG configuration on target",
            "If target won't boot: may need to detach and reattach system disk",
        ],
        "verification": ["Target ECS must be ACTIVE and SSH-accessible with migrated data present"],
        "context_fields": ["task_id", "source_server_id", "target_server_id", "source_region", "target_region"],
        "skill_hints": ["huawei-cloud-sms-migration", "boot-fixes", "partition-fixes"],
    },
    "BOOT_FIX": {
        "objective": "Fix boot issues on a migrated server so it boots successfully and is SSH-accessible.",
        "approach": [
            "Read the boot-fixes skill from the knowledge tree",
            "SSH to the target server (or use console access if SSH not available)",
            "Check: GRUB configuration (root device, kernel params)",
            "Check: /etc/fstab (correct UUIDs for mounted disks)",
            "Check: network interfaces (eth0 config, default route)",
            "Check: initramfs (contains necessary drivers)",
        ],
        "troubleshooting": [
            "Wrong root device: update GRUB_CMDLINE_LINUX with correct root=UUID=",
            "Missing drivers: rebuild initramfs with mkinitrd",
            "fstab UUIDs: run blkid to get correct UUIDs, update /etc/fstab",
            "Network: configure DHCP or static IP on eth0",
        ],
        "verification": ["Server reboots successfully and is SSH-accessible"],
        "context_fields": ["target_server_ip", "os_user", "os_password", "os_type"],
        "skill_hints": ["boot-fixes", "partition-fixes"],
    },
    "DATA_PLANE_SYNC": {
        "objective": "Synchronize data between source and target servers using rsync or DRS.",
        "approach": [
            "Read the data-plane-sync skill",
            "For file sync: rsync -avz --progress source_user@source_ip:/path/ target_path/",
            "For database: use Huawei DRS (Data Replication Service) API",
            "Run initial full sync, then incremental syncs until cutover",
        ],
        "troubleshooting": [
            "rsync permission denied: check SSH key access between source and target",
            "DRS connection failed: check VPC peering or Direct Connect between source and target VPCs",
            "Sync timeout: check bandwidth, use --bwlimit if needed",
        ],
        "verification": ["Data on target matches source (file count, sizes, checksums)"],
        "context_fields": ["source_ip", "target_ip", "os_user", "os_password", "sync_type"],
        "skill_hints": ["data-plane-sync", "huawei-drs-sync"],
    },
}


class MigrationOperationExecutor:
    """
    Executes migration operations using warmed-up task-descriptive delegation.
    
    Each prompt includes objective, approach, troubleshooting, verification,
    and persistence instructions so the agent doesn't give up at first failure.
    """

    @staticmethod
    def build_prompt(operation: str, context: dict) -> str:
        """Build a prompt with ENFORCED SKILL-FIRST TROUBLESHOOTING LOOP."""
        op_def = MIGRATION_OPERATIONS.get(operation, {})
        
        # Format text with context values
        def fmt(text):
            for field, val in context.items():
                text = text.replace("{" + field + "}", str(val))
            return text
        
        objective = fmt(op_def.get("objective", ""))
        
        prompt_parts = [
            f"TASK: {operation}",
            f"OBJECTIVE: {objective}",
            "",
            "═══════════════════════════════════════════════════════════",
            "═══ MANDATORY: SKILL KNOWLEDGE TREE REVISION ═══",
            "═══════════════════════════════════════════════════════════",
            "",
            "Before executing ANY operation, you MUST systematically revise",
            "ALL knowledge sources in the Skills Knowledge Tree:",
            "",
            "SOURCE 1 — Skill Registry (/root/.hermes/skills/):",
            "  ls /root/.hermes/skills/devops/ | grep -i sms",
            "  Read EVERY SMS-related SKILL.md file completely:",
            "  - huawei-cloud-sms-migration/SKILL.md (2448+ lines — PRIMARY)",
            "  - huawei-cloud-sms-migration-exact-disk-config/SKILL.md",
            "  - sms-migration-complete-reference/SKILL.md",
            "  - sms-error-codes-troubleshooting/SKILL.md",
            "  - sms-api-cli-reference/SKILL.md",
            "  - sms-migration-best-practices/SKILL.md",
            "  - sms-migration-execution-learned/SKILL.md",
            "  Read ALL scripts referenced in these skills:",
            "  - scripts/configure_sms_target.py",
            "  - scripts/create_ecs_and_sms_task.py",
            "  - scripts/complete_migration_workflow.py",
            "  - templates/codelpa-sms-migration.py",
            "",
            "SOURCE 2 — MCP Servers:",
            "  Check if any MCP server provides SMS operations:",
            "  Search for 'sms' in available MCP services",
            "  Try MCP first, fall back to hcloud CLI",
            "",
            "SOURCE 3 — Execution History (CRITICAL — LEARNED FROM LIVE EXECUTION):",
            "  The following patterns were learned from LIVE execution attempts",
            "  on this exact project (CR-3). Each pattern encodes a failure → fix.",
            "  Review these BEFORE acting to AVOID repeating the same mistakes:",
            "",
            "  PATTERN A: ATTACH_AGENT_IMAGE 80% = SG NOT ASSOCIATED WITH ECS",
            "    Root cause: SG rules exist but aren't bound to ECS network port",
            "    Symptom: BrokenPipeError in scapy sr1() during _connect_target_test",
            "    Fix: hcloud ECS NovaAssociateSecurityGroup --server_id=<ecs_id> --security_group.1.id=<sg_id>",
            "    Do NOT use VPC UpdatePort — wrong parameter format for V3 API",
            "    Verify: nc -zv -w5 <target_eip> 22 && nc -zv -w5 <target_eip> 8900",
            "",
            "  PATTERN B: SMS.0806 MIGRATE_LINUX_FILE = /proc/kcore 128TB VIRTUAL FILE",
            "    Root cause: /proc/kcore is 128TB, overflows 2-4GB temp staging",
            "    Fix: sed -i 's/exclude.item.before =$/exclude.item.before = /proc,/sys,/dev,/run,/tmp,/var/tmp/g' /tmp/SMS-Agent/agent/config/check-property.cfg",
            "    MIGRATE_BLOCK does NOT bypass this — Linux still uses file_migrate.py",
            "",
            "  PATTERN C: EIP MUST BE BOUND BEFORE TASK CREATION",
            "    Root cause: ECS without EIP → agent can't reach target → BrokenPipeError",
            "    Fix: Create ECS WITH --server.publicip.eip.iptype=5_bgp from start",
            "    migration_ip must be EIP (public), NOT private IP",
            "    Verify: hcloud EIP ListPublicips --cli-region=<region> --cli-profile=erp-target",
            "",
            "  PATTERN D: DISK SIZE IN GB NOT BYTES, NAME /dev/vda NOT /dev/sda",
            "    Root cause: SMS API expects GB integer (80), not bytes (85899345920)",
            "    Fix: --target_server.disks.1.size=80 --target_server.disks.1.name=/dev/vda",
            "    Always include physical_volumes: /dev/vda1, device_use=OS, mount=/, fs=ext4",
            "",
            "  PATTERN E: SMS AGENT INSTALL — CORRECT BINARY PATH",
            "    Binary at /tmp/SMS-Agent/agent/x64/linuxmain (NOT /tmp/SMS-Agent/agent/linuxmain)",
            "    Use TARGET MASTER AK/SK (not source)",
            "    Start: echo 'AK SK sms.ap-southeast-3.myhuaweicloud.com' | ./x64/linuxmain &",
            "",
            "═══ SKILL-FIRST LOOP (AFTER EVERY ERROR) ═══",
            "If you encounter ANY error:",
            "  1. STOP. Do NOT improvise or guess.",
            "  2. Search /root/.hermes/skills/ for the error code (e.g., 'SMS.0806')",
            "  3. Read the SKILL.md section that covers this error",
            "  4. Read the Execution History patterns above — has this happened before?",
            "  5. Apply the skill's fix EXACTLY as written",
            "  6. If no skill covers it, try the tool chain: MCP → hcloud → SSH → Hermes",
            "  7. Report the learning so it can be added to the skill tree",
            "═══════════════════════════════════════════════════════════",
            "",
        ]
        
        prompt_parts.append("APPROACH (follow in order, check skills at EACH step):")
        
        for i, step in enumerate(op_def.get("approach", []), 1):
            prompt_parts.append(f"  {i}. {fmt(step)}")
        
        trouble = op_def.get("troubleshooting", [])
        if trouble:
            prompt_parts.extend([
                "",
                "TROUBLESHOOTING (search skills FIRST for each error code, then apply):",
            ])
            for item in trouble:
                prompt_parts.append(f"  - {fmt(item)}")
        
        verify = op_def.get("verification", [])
        if verify:
            prompt_parts.extend(["", "VERIFICATION (must pass before reporting success):"])
            for item in verify:
                prompt_parts.append(f"  - {fmt(item)}")
        
        prompt_parts.extend([
            "",
            "PERSISTENCE: Do NOT stop until the objective is verified or ALL skill-recommended approaches exhausted.",
            "If an error occurs, go back to the SKILL-FIRST LOOP before trying anything else.",
            "",
            "CONTEXT:",
        ])
        
        for field in op_def.get("context_fields", []):
            val = context.get(field, "")
            if field in ("os_password", "target_sk", "source_sk"):
                val = "***" if val else "<not provided>"
            if val:
                prompt_parts.append(f"  {field}: {val}")
        
        skill_hints = op_def.get("skill_hints", [])
        if skill_hints:
            prompt_parts.extend(["", "SKILL HINTS (search these in /root/.hermes/skills/):"])
            for hint in skill_hints:
                prompt_parts.append(f"  - {hint}")
        
        prompt_parts.extend([
            "",
            "ALWAYS ALSO SEARCH: sms-migration-complete-reference, sms-error-codes-troubleshooting,",
            "sms-migration-best-practices, sms-api-cli-reference, sms-migration-execution-learned",
            "These contain ALL learned patterns from live execution. Read them BEFORE starting",
            "AND re-read them when troubleshooting any error.",
            "",
            "TOOL CHAIN: Skills Knowledge Tree → MCP → hcloud CLI → SSH → Hermes agent delegation",
            "If a tool fails, go to the next in the chain. If ALL fail, go back to SKILL-FIRST LOOP.",
        ])
        
        return "\n".join(prompt_parts)

    @staticmethod
    def simulate_operation(operation: str, context: dict) -> dict:
        """Simulate an operation — show what WOULD happen without real calls."""
        op_def = MIGRATION_OPERATIONS.get(operation, {})
        objective = op_def.get("objective", "")
        for field, val in context.items():
            objective = objective.replace("{" + field + "}", str(val))
        
        return {
            "operation": operation,
            "objective": objective,
            "skill_hints": op_def.get("skill_hints", []),
            "troubleshooting_count": len(op_def.get("troubleshooting", [])),
            "simulated": True,
            "message": (f"📋 SIMULATED: {operation} would be delegated to Hermes agent with SKILL-FIRST LOOP prompt. "
                       f"Agent MUST search /root/.hermes/skills/ before AND after any error. "
                       f"Objective: {objective[:100]}... "
                       f"Skills: {', '.join(op_def.get('skill_hints', [])[:3])}. "
                       f"Troubleshooting scenarios: {len(op_def.get('troubleshooting', []))}. "
                       f"Agent will not stop until objective is verified or all {len(op_def.get('approach', []))} approaches exhausted."),
        }

    @staticmethod
    def execute_operation(operation: str, context: dict, timeout: int = 600) -> dict:
        """Execute an operation by delegating to the ERP's Hermes agent with warmed-up prompt."""
        prompt = MigrationOperationExecutor.build_prompt(operation, context)
        logger.info(f"[OP-EXEC] Delegating {operation} to Hermes agent (prompt: {len(prompt)} chars)")
        
        # Emit progress to project data for GUI
        MigrationOperationExecutor._emit_progress(operation, "started", context)
        
        binary = "/usr/local/lib/hermes-agent/venv/bin/hermes"
        if not os.path.isfile(binary):
            return {"success": False, "error": "Hermes binary not found", "operation": operation}
        
        cmd = [
            binary, "chat", "-q",
            prompt,
            "--profile", "default",
            "--model", "glm-5.2",
            "--yolo",
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            success = result.returncode == 0
            output = result.stdout.strip()
            logger.info(f"[OP-EXEC] {operation}: {'succeeded' if success else 'failed'} (exit={result.returncode})")
            if not success and result.stderr:
                logger.warning(f"[OP-EXEC] {operation} stderr: {result.stderr[:300]}")
            
            MigrationOperationExecutor._emit_progress(operation, "succeeded" if success else "failed", context, output[:200])
            
            return {
                "success": success,
                "operation": operation,
                "output": output[:2000],
                "error": result.stderr[:500] if not success else None,
                "tool": "hermes_agent",
            }
        except subprocess.TimeoutExpired:
            MigrationOperationExecutor._emit_progress(operation, "timeout", context)
            return {"success": False, "error": f"Timed out ({timeout}s)", "operation": operation, "tool": "hermes_agent"}
        except Exception as e:
            MigrationOperationExecutor._emit_progress(operation, "error", context, str(e)[:200])
            return {"success": False, "error": str(e), "operation": operation, "tool": "hermes_agent"}

    @staticmethod
    def _emit_progress(operation: str, status: str, context: dict, detail: str = ""):
        """Write progress to project data so GUI can show live status."""
        try:
            import json as _json
            from models import ProjectData
            from app import db
            project_id = context.get("project_id", "1787958983942")
            project = ProjectData.query.get(project_id)
            if not project:
                return
            progress = project.data.get("executionProgress", {"operations": [], "spawnTree": {"nodes": [], "edges": []}})
            
            # Add operation to progress
            progress["operations"].append({
                "operation": operation,
                "status": status,
                "server": context.get("source_server_name", ""),
                "detail": detail,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
            
            # Update spawn tree
            node_id = f"agent_{operation}_{context.get('source_server_name', 'main')}"
            existing = [n for n in progress["spawnTree"]["nodes"] if n.get("id") == node_id]
            if existing:
                existing[0]["status"] = status
            else:
                progress["spawnTree"]["nodes"].append({
                    "id": node_id,
                    "label": f"{operation}",
                    "status": status,
                    "type": "hermes_agent",
                    "model": "glm-5.2",
                    "server": context.get("source_server_name", ""),
                })
                progress["spawnTree"]["edges"].append({
                    "from": "main",
                    "to": node_id,
                })
            
            project.data["executionProgress"] = progress
            db.session.commit()
        except Exception:
            pass  # Don't let progress tracking break execution

    @classmethod
    def run_sms_migration_lifecycle(cls, source_servers: list, target_servers: list,
                                     source_region: str, target_region: str,
                                     os_user: str = "root", os_password: str = "",
                                     target_ak: str = "", target_sk: str = "",
                                     source_ak: str = "", source_sk: str = "") -> list:
        """Run the full SMS migration lifecycle with parallel agent install."""
        import threading
        
        results = []
        
        # Resolve EIPs first
        source_eip_map = {}
        try:
            from services.sms_migration import SMSMigration
            source_eip_map = SMSMigration.resolve_source_eips(source_region, source_ak, source_sk)
            logger.info(f"[OP-EXEC] Resolved {len(source_eip_map)} source EIPs via hcloud API")
        except Exception as e:
            logger.warning(f"[OP-EXEC] EIP resolution failed: {e}")
        
        # Build context for each source
        source_contexts = []
        for i, src in enumerate(source_servers):
            target = target_servers[i] if i < len(target_servers) else None
            if not target:
                results.append({"source": src.get("name", ""), "operation": "SKIP", "status": "failed",
                               "error": "No matching target"})
                continue
            
            src_name = src.get("name", f"source-{i}")
            src_id = src.get("id", "")
            ssh_ip = source_eip_map.get(src_id, "") or src.get("public_ip", "") or src.get("ip", "")
            target_id = target.get("id", "")
            
            ctx = {
                "source_ip": ssh_ip,
                "os_user": os_user,
                "os_password": os_password,
                "target_ak": target_ak,
                "target_sk": target_sk,
                "source_ak": source_ak,
                "source_sk": source_sk,
                "source_region": source_region,
                "target_region": target_region,
                "source_server_name": src_name,
                "source_server_id": src_id,
                "target_server_id": target_id,
                "os_type": "LINUX",
                "project_id": "1787958983942",
            }
            source_contexts.append((src_name, ctx))
        
        # PHASE 1: Install SMS agents IN PARALLEL on all sources
        logger.info(f"[OP-EXEC] Phase 1: Parallel SMS agent install on {len(source_contexts)} sources")
        install_results = {}
        threads = []
        
        def install_worker(name, ctx):
            logger.info(f"[OP-EXEC] {name}: SMS_AGENT_INSTALL (parallel)")
            r = cls.execute_operation("SMS_AGENT_INSTALL", ctx, timeout=600)
            logger.info(f"[OP-EXEC] {name}: SMS_AGENT_INSTALL {'succeeded' if r['success'] else 'failed'}: {r.get('output', '')[:200]}")
            install_results[name] = r
        
        for name, ctx in source_contexts:
            t = threading.Thread(target=install_worker, args=(name, ctx))
            t.start()
            threads.append(t)
        
        # Wait for all installs
        for t in threads:
            t.join(timeout=660)
        
        # Record install results
        for name, r in install_results.items():
            results.append({"source": name, "operation": "SMS_AGENT_INSTALL",
                           "status": "success" if r["success"] else "failed",
                           "message": r.get("output", "")[:300], "error": r.get("error"),
                           "tool": r.get("tool", "hermes_agent")})
        
        # PHASE 2: Per-source operations (sequential — each needs the agent installed)
        for name, ctx in source_contexts:
            r = install_results.get(name, {})
            if not r.get("success"):
                logger.warning(f"[OP-EXEC] {name}: Skipping — agent install failed")
                continue
            
            # Wait for agent to register
            time.sleep(30)
            
            # SMS_SOURCE_LIST
            logger.info(f"[OP-EXEC] {name}: SMS_SOURCE_LIST")
            r2 = cls.execute_operation("SMS_SOURCE_LIST", ctx, timeout=120)
            results.append({"source": name, "operation": "SMS_SOURCE_LIST",
                           "status": "success" if r2["success"] else "warning",
                           "message": r2.get("output", "")[:300], "tool": r2.get("tool", "hermes_agent")})
            
            # SMS_DISK_MAPPING
            logger.info(f"[OP-EXEC] {name}: SMS_DISK_MAPPING")
            r3 = cls.execute_operation("SMS_DISK_MAPPING", ctx, timeout=120)
            results.append({"source": name, "operation": "SMS_DISK_MAPPING",
                           "status": "success" if r3["success"] else "warning",
                           "message": r3.get("output", "")[:300], "tool": r3.get("tool", "hermes_agent")})
            
            # SMS_TASK_CREATE
            logger.info(f"[OP-EXEC] {name}: SMS_TASK_CREATE")
            r4 = cls.execute_operation("SMS_TASK_CREATE", ctx, timeout=180)
            results.append({"source": name, "operation": "SMS_TASK_CREATE",
                           "status": "success" if r4["success"] else "failed",
                           "message": r4.get("output", "")[:300], "error": r4.get("error"),
                           "tool": r4.get("tool", "hermes_agent")})
            
            # SMS_TASK_START
            if r4.get("success"):
                logger.info(f"[OP-EXEC] {name}: SMS_TASK_START")
                r5 = cls.execute_operation("SMS_TASK_START", ctx, timeout=60)
                results.append({"source": name, "operation": "SMS_TASK_START",
                               "status": "success" if r5["success"] else "failed",
                               "message": r5.get("output", "")[:300], "tool": r5.get("tool", "hermes_agent")})
                
                # SMS_SYNC_MONITOR
                if r5.get("success"):
                    logger.info(f"[OP-EXEC] {name}: SMS_SYNC_MONITOR")
                    r6 = cls.execute_operation("SMS_SYNC_MONITOR", {**ctx, "max_wait": 3600}, timeout=3600)
                    results.append({"source": name, "operation": "SMS_SYNC_MONITOR",
                                   "status": "success" if r6["success"] else "failed",
                                   "message": r6.get("output", "")[:300], "tool": r6.get("tool", "hermes_agent")})
        
        return results
