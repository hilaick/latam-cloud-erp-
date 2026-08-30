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
            "Get source server ID from SMS (hcloud SMS ListServers)",
            "Get target ECS ID from Terraform state or hcloud ECS ListServersDetails",
            "Get target disk ID: hcloud ECS ShowServer --server_id={target_server_id} | grep volumes_attached | get first volume ID",
            "Create task with hcloud SMS CreateTask:",
            "  --source_server.id={source_server_id} --target_server.vm_id={target_server_id}",
            "  --use_public_ip=true --type=MIGRATE_BLOCK --os_type=LINUX",
            "  --target_server.disks.1.name='System Disk' --target_server.disks.1.device_use='OS'",
            "  --target_server.disks.1.disk_id=<EVS_volume_id> --target_server.disks.1.size=<bytes>",
            "  --auto_start=false --start_target_server=true",
            "  --cli-region={source_region} --cli-profile=erp-source",
        ],
        "troubleshooting": [
            "SMS.0202 (AK/SK auth failed): the SMS task uses the TARGET account's MASTER AK/SK. The source server's migproject must target the destination region. Update with: hcloud SMS UpdateServerName --source_id={source_server_id} --migprojectid=<migproject_id> --cli-region={source_region} --cli-profile=erp-target",
            "SMS.3805 (connection timeout): target SG must have TCP 1-65535 ingress open. Verify with: hcloud VPC ShowSecurityGroup. Use hcloud VPC CreateSecurityGroupRule/v2 with --security_group_rule.* prefix.",
            "SMS.0515: disk mismatch — delete task, run hcloud SMS UpdateDiskInfo with exact source disk config, recreate task",
            "SMS.6602: invalid floating IP — use --use_public_ip=true and --migration_ip=<target_private_ip>",
            "SMS.6103: wrong disk ID type — use EVS Volume ID from target ECS, not SMS Disk ID from source",
            "SMS.7711: illegal task name — use simple alphanumeric name like 'MigrationTask' (no hyphens)",
            "SMS.7605: target server already in another task — delete existing task first: hcloud SMS DeleteTask --task_id=<existing>",
            "SSL_CONFIG fails at 50%: the source server's migproject must be set to one that targets the destination region. Check with: hcloud SMS ListMigprojects --cli-region={source_region} --cli-profile=erp-target. Update source with: hcloud SMS UpdateServerName --source_id={source_server_id} --migprojectid=<correct_migproject_id>",
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
            "Poll: hcloud SMS ShowTask --task_id={task_id} --cli-region={source_region} --cli-profile=erp-source",
            "States: waiting → setting → READY → RUNNING → SUCCESS (or FAILED)",
            "Track: state, migrate_progress, sub_tasks progress",
            "Poll every 30 seconds until terminal state",
        ],
        "troubleshooting": [
            "SMS.3805: connection timeout — check SG rules allow port 8900 on target, check source agent is running",
            "SMS.0515: disk mismatch during sync — may need to delete task, UpdateDiskInfo, recreate",
            "If progress stuck at 0% for >10min: check source agent connectivity (ps aux | grep linuxmain on source)",
            "If state=FAILED: read error_json field for details, report error_code and error_msg",
        ],
        "verification": ["Task must reach state=SUCCESS (migration complete) or state=FAILED (with error details)"],
        "context_fields": ["task_id", "source_region", "target_ak", "target_sk", "max_wait"],
        "skill_hints": ["huawei-cloud-sms-migration", "huawei-cloud-sms-0515-fix"],
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
        """Build a warmed-up prompt with full troubleshooting methodology."""
        op_def = MIGRATION_OPERATIONS.get(operation, {})
        
        # Format objective with context values
        objective = op_def.get("objective", "")
        for field, val in context.items():
            objective = objective.replace("{" + field + "}", str(val))
        
        # Format approach steps with context values
        approach_lines = []
        for step in op_def.get("approach", []):
            formatted = step
            for field, val in context.items():
                formatted = formatted.replace("{" + field + "}", str(val))
            approach_lines.append(f"  {len(approach_lines)+1}. {formatted}")
        
        # Format troubleshooting with context values
        trouble_lines = []
        for item in op_def.get("troubleshooting", []):
            formatted = item
            for field, val in context.items():
                formatted = formatted.replace("{" + field + "}", str(val))
            trouble_lines.append(f"  - {formatted}")
        
        # Format verification with context values
        verify_lines = []
        for item in op_def.get("verification", []):
            formatted = item
            for field, val in context.items():
                formatted = formatted.replace("{" + field + "}", str(val))
            verify_lines.append(f"  - {formatted}")
        
        skill_hints = op_def.get("skill_hints", [])
        
        prompt_parts = [
            f"OBJECTIVE: {objective}",
            f"",
            f"Do NOT stop until the objective is verified or ALL approaches are exhausted.",
            f"You have SSH, hcloud CLI, 68 skills, and 173 MCP servers (3552 endpoints). Use them all.",
            f"",
            f"APPROACH (try in order):",
        ]
        prompt_parts.extend(approach_lines)
        
        prompt_parts.append(f"")
        prompt_parts.append(f"TROUBLESHOOTING (if any step fails, try these before giving up):")
        prompt_parts.extend(trouble_lines)
        
        prompt_parts.append(f"")
        prompt_parts.append(f"VERIFICATION (must confirm success):")
        prompt_parts.extend(verify_lines)
        
        prompt_parts.append(f"")
        prompt_parts.append(f"SKILL HINTS (search the knowledge tree for these and related skills):")
        for hint in skill_hints:
            prompt_parts.append(f"  - {hint}")
        
        prompt_parts.append(f"")
        prompt_parts.append(f"CONTEXT:")
        for field in op_def.get("context_fields", []):
            val = context.get(field, "")
            if val:
                prompt_parts.append(f"  {field}: {val}")
        
        prompt_parts.append(f"")
        prompt_parts.append(f"CRITICAL: Be proactive. If something fails, read logs, diagnose, try alternatives. "
                           f"Do NOT report failure without trying ALL troubleshooting steps. "
                           f"Keep working until the objective is verified.")
        
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
            "message": (f"📋 SIMULATED: {operation} would be delegated to Hermes agent with warmed-up prompt. "
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
