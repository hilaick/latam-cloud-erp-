"""
Migration Operation Executor — task-descriptive delegation to Hermes agent.

For each migration operation:
1. Describe the TASK (not the skill) — the agent searches the 68 skills + 173 MCPs
2. Tier chain: Skills → MCP → hcloud → SSH → Hermes agent
3. The agent decides which tools to use based on the knowledge tree

The prompt tells the agent WHAT to achieve, not HOW. The agent finds the
right skills and MCPs from the knowledge tree.
"""

import json
import os
import time
import logging
import subprocess

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# OPERATION DEFINITIONS — each migration operation with its task description
# The Hermes agent receives this and searches the knowledge tree itself.
# ═══════════════════════════════════════════════════════════════════════════

MIGRATION_OPERATIONS = {
    "SMS_AGENT_INSTALL": {
        "task": "Install and register the Huawei Cloud SMS migration agent on a Linux source server. "
                "The agent must connect to the SMS service using the target account's AK/SK. "
                "Handle the interactive EULA prompt, AK/SK input, and region selection. "
                "After installation, verify the source server appears in the SMS console.",
        "context_fields": ["source_ip", "os_user", "os_password", "target_ak", "target_sk", 
                          "source_region", "target_region", "source_server_name"],
        "tier_chain": "Skills (huawei-cloud-sms-migration) → SSH → hcloud SMS ListServers (verify)",
        "skill_hints": ["huawei-cloud-sms-migration", "huawei-cloud-sms-migration-exact-disk-config"],
    },
    "SMS_SOURCE_LIST": {
        "task": "List all source servers registered in the Huawei Cloud SMS service for a given region. "
                "Return each source server's ID, name, state, and connection status.",
        "context_fields": ["source_region", "target_ak", "target_sk"],
        "tier_chain": "MCP (smsapi ListServers) → hcloud SMS ListServers",
        "skill_hints": ["huawei-cloud-sms-migration"],
    },
    "SMS_DISK_MAPPING": {
        "task": "Query the source server's disk configuration from SMS service. "
                "Map source disks to target ECS disks: system disk (device_use=OS) → root_volume, "
                "data disks → EVS volumes. Include disk sizes, types, and physical volumes.",
        "context_fields": ["source_server_id", "source_region", "target_ak", "target_sk"],
        "tier_chain": "Skills (huawei-cloud-sms-migration-exact-disk-config) → hcloud SMS ShowServer",
        "skill_hints": ["huawei-cloud-sms-migration-exact-disk-config", "huawei-cloud-sms-0515-fix"],
    },
    "SMS_TASK_CREATE": {
        "task": "Create an SMS migration task mapping a source server to a target ECS. "
                "Configure: source_server.id, target_server.vm_id, use_public_ip=true, "
                "os_type, disk mapping with device_use and disk_id, auto_start=false. "
                "Use the exact disk configuration to prevent SMS.0515.",
        "context_fields": ["source_server_id", "target_server_id", "source_region", "target_region",
                          "source_server_name", "target_ak", "target_sk", "os_type"],
        "tier_chain": "Skills (huawei-cloud-sms-migration-exact-disk-config) → MCP (smsapi CreateTask) → hcloud SMS CreateTask",
        "skill_hints": ["huawei-cloud-sms-migration-exact-disk-config", "huawei-cloud-sms-0515-fix"],
    },
    "SMS_TASK_START": {
        "task": "Start an SMS migration task that was created with auto_start=false. "
                "Use hcloud SMS UpdateTaskStatus with operation=start.",
        "context_fields": ["task_id", "source_region", "target_ak", "target_sk"],
        "tier_chain": "hcloud SMS UpdateTaskStatus",
        "skill_hints": ["huawei-cloud-sms-migration"],
    },
    "SMS_SYNC_MONITOR": {
        "task": "Monitor an SMS migration task until it reaches SUCCESS or FAILED state. "
                "Track: state (waiting → setting → READY → RUNNING → SUCCESS), progress percentage, "
                "sub-task completion. Handle SMS error codes (0515, 6602, 3805, 6103, 7711, 7605).",
        "context_fields": ["task_id", "source_region", "target_ak", "target_sk", "max_wait"],
        "tier_chain": "Skills (huawei-cloud-sms-migration) → MCP (smsapi ShowTask) → hcloud SMS ShowTask",
        "skill_hints": ["huawei-cloud-sms-migration", "huawei-cloud-sms-0515-fix"],
    },
    "SMS_CUTOVER": {
        "task": "Execute cutover for a completed SMS migration task. "
                "Stop the source server, start the target server, verify the target is running "
                "with the migrated data. Update DNS if needed.",
        "context_fields": ["task_id", "source_server_id", "target_server_id", "source_region", "target_region"],
        "tier_chain": "Skills (huawei-cloud-sms-migration) → hcloud SMS ShowTask → hcloud ECS StartServers",
        "skill_hints": ["huawei-cloud-sms-migration", "boot-fixes"],
    },
    "BOOT_FIX": {
        "task": "Fix boot issues on a migrated server. Check GRUB configuration, fstab entries, "
                "network interfaces, and kernel parameters. Common issues: wrong root device, "
                "missing drivers, incorrect fstab UUIDs.",
        "context_fields": ["target_server_ip", "os_user", "os_password", "os_type"],
        "tier_chain": "Skills (boot-fixes) → SSH → hcloud ECS ShowServer",
        "skill_hints": ["boot-fixes", "partition-fixes"],
    },
    "DATA_PLANE_SYNC": {
        "task": "Synchronize data between source and target servers. "
                "Use rsync for file-level sync, or DRS for database replication. "
                "Configure initial sync and incremental sync until cutover.",
        "context_fields": ["source_ip", "target_ip", "os_user", "os_password", "sync_type"],
        "tier_chain": "Skills (data-plane-sync) → SSH → rsync/DRS API",
        "skill_hints": ["data-plane-sync", "huawei-drs-sync"],
    },
}


class MigrationOperationExecutor:
    """
    Executes migration operations using task-descriptive delegation.
    
    For each operation:
    1. Build a task prompt (WHAT to do, not HOW)
    2. Add context (server IPs, credentials, regions)
    3. Add skill hints (which skills MIGHT help — agent searches knowledge tree)
    4. Delegate to Hermes agent OR try the tier chain directly
    """

    @staticmethod
    def build_prompt(operation: str, context: dict) -> str:
        """Build a task-descriptive prompt for the Hermes agent."""
        op_def = MIGRATION_OPERATIONS.get(operation, {})
        task = op_def.get("task", operation)
        skill_hints = op_def.get("skill_hints", [])
        tier_chain = op_def.get("tier_chain", "Skills → MCP → hcloud → SSH")
        
        prompt_parts = [
            f"TASK: {task}",
            f"",
            f"CONTEXT:",
        ]
        
        for field in op_def.get("context_fields", []):
            val = context.get(field, "")
            if val:
                # Mask sensitive fields in logs but pass full value to agent
                prompt_parts.append(f"  {field}: {val}")
        
        prompt_parts.extend([
            f"",
            f"TOOL CHAIN (try in order): {tier_chain}",
            f"",
            f"SKILL HINTS (search the knowledge tree for these and related skills):",
        ])
        for hint in skill_hints:
            prompt_parts.append(f"  - {hint}")
        
        prompt_parts.extend([
            f"",
            f"Search the 68 skills in the knowledge tree and 173 MCP servers (3552 endpoints) "
            f"for the best tools to accomplish this task. Use the skill commands exactly as documented. "
            f"Try MCP first, then hcloud CLI, then SSH. Report what you did and the result.",
        ])
        
        return "\n".join(prompt_parts)

    @staticmethod
    def simulate_operation(operation: str, context: dict) -> dict:
        """
        Simulate an operation — show what WOULD happen without real calls.
        Returns trace info for the simulation engine.
        """
        op_def = MIGRATION_OPERATIONS.get(operation, {})
        prompt = MigrationOperationExecutor.build_prompt(operation, context)
        
        return {
            "operation": operation,
            "task": op_def.get("task", ""),
            "tier_chain": op_def.get("tier_chain", ""),
            "skill_hints": op_def.get("skill_hints", []),
            "prompt_preview": prompt[:300] + "..." if len(prompt) > 300 else prompt,
            "simulated": True,
            "message": f"📋 SIMULATED: {operation} would be delegated to Hermes agent. "
                      f"Agent searches knowledge tree for skills: {', '.join(op_def.get('skill_hints', []))}. "
                      f"Tier chain: {op_def.get('tier_chain', '')}",
        }

    @staticmethod
    def execute_operation(operation: str, context: dict, timeout: int = 300) -> dict:
        """
        Execute an operation by delegating to the ERP's Hermes agent.
        The agent searches the knowledge tree and uses the tier chain.
        """
        prompt = MigrationOperationExecutor.build_prompt(operation, context)
        logger.info(f"[OP-EXEC] Delegating {operation} to Hermes agent (prompt: {len(prompt)} chars)")
        
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
            return {
                "success": success,
                "operation": operation,
                "output": output[:2000],
                "error": result.stderr[:500] if not success else None,
                "tool": "hermes_agent",
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": f"Timed out ({timeout}s)", "operation": operation, "tool": "hermes_agent"}
        except Exception as e:
            return {"success": False, "error": str(e), "operation": operation, "tool": "hermes_agent"}

    @classmethod
    def run_sms_migration_lifecycle(cls, source_servers: list, target_servers: list,
                                     source_region: str, target_region: str,
                                     os_user: str = "root", os_password: str = "",
                                     target_ak: str = "", target_sk: str = "",
                                     source_ak: str = "", source_sk: str = "") -> list:
        """
        Run the full SMS migration lifecycle using task-descriptive delegation.
        Each operation is delegated to the Hermes agent with skill hints.
        """
        results = []
        
        # Resolve EIPs first (direct hcloud call — no agent needed)
        source_eip_map = {}
        try:
            from services.sms_migration import SMSMigration
            source_eip_map = SMSMigration.resolve_source_eips(source_region, source_ak, source_sk)
            logger.info(f"[OP-EXEC] Resolved {len(source_eip_map)} source EIPs via hcloud API")
        except Exception as e:
            logger.warning(f"[OP-EXEC] EIP resolution failed: {e}")
        
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
            
            # Build shared context
            base_ctx = {
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
            }
            
            # Operation 1: SMS Agent Install
            logger.info(f"[OP-EXEC] {src_name}: SMS_AGENT_INSTALL")
            r1 = cls.execute_operation("SMS_AGENT_INSTALL", base_ctx, timeout=300)
            results.append({"source": src_name, "operation": "SMS_AGENT_INSTALL",
                           "status": "success" if r1["success"] else "failed",
                           "message": r1.get("output", "")[:300], "error": r1.get("error"),
                           "tool": r1.get("tool", "hermes_agent")})
            if not r1["success"]:
                continue  # Can't proceed without agent
            
            # Operation 2: SMS Source List (verify registration)
            time.sleep(30)  # Wait for agent to register
            logger.info(f"[OP-EXEC] {src_name}: SMS_SOURCE_LIST")
            r2 = cls.execute_operation("SMS_SOURCE_LIST", base_ctx, timeout=60)
            results.append({"source": src_name, "operation": "SMS_SOURCE_LIST",
                           "status": "success" if r2["success"] else "warning",
                           "message": r2.get("output", "")[:300], "tool": r2.get("tool", "hermes_agent")})
            
            # Operation 3: SMS Disk Mapping
            logger.info(f"[OP-EXEC] {src_name}: SMS_DISK_MAPPING")
            r3 = cls.execute_operation("SMS_DISK_MAPPING", base_ctx, timeout=60)
            results.append({"source": src_name, "operation": "SMS_DISK_MAPPING",
                           "status": "success" if r3["success"] else "warning",
                           "message": r3.get("output", "")[:300], "tool": r3.get("tool", "hermes_agent")})
            
            # Operation 4: SMS Task Create
            logger.info(f"[OP-EXEC] {src_name}: SMS_TASK_CREATE")
            r4 = cls.execute_operation("SMS_TASK_CREATE", base_ctx, timeout=120)
            results.append({"source": src_name, "operation": "SMS_TASK_CREATE",
                           "status": "success" if r4["success"] else "failed",
                           "message": r4.get("output", "")[:300], "error": r4.get("error"),
                           "tool": r4.get("tool", "hermes_agent")})
            
            # Operation 5: SMS Task Start
            if r4["success"]:
                logger.info(f"[OP-EXEC] {src_name}: SMS_TASK_START")
                r5 = cls.execute_operation("SMS_TASK_START", base_ctx, timeout=60)
                results.append({"source": src_name, "operation": "SMS_TASK_START",
                               "status": "success" if r5["success"] else "failed",
                               "message": r5.get("output", "")[:300], "tool": r5.get("tool", "hermes_agent")})
                
                # Operation 6: SMS Sync Monitor
                if r5["success"]:
                    logger.info(f"[OP-EXEC] {src_name}: SMS_SYNC_MONITOR")
                    r6 = cls.execute_operation("SMS_SYNC_MONITOR", {**base_ctx, "max_wait": 3600}, timeout=3600)
                    results.append({"source": src_name, "operation": "SMS_SYNC_MONITOR",
                                   "status": "success" if r6["success"] else "failed",
                                   "message": r6.get("output", "")[:300], "tool": r6.get("tool", "hermes_agent")})
        
        return results
