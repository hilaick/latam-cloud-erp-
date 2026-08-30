"""
Skill-driven execution engine — uses the Skills Knowledge Tree to determine
HOW to execute each migration operation, then tries tools in order:
1. Skills Knowledge Tree (68 skills) → find applicable skill, read commands
2. MCP → try via MCP server
3. hcloud CLI → fallback
4. SSH → OS-level operations
5. Hermes agent delegation → last resort
"""

import json
import os
import time
import logging
import subprocess

logger = logging.getLogger(__name__)


class SkillDrivenExecutor:
    """Executes migration operations using the Skills Knowledge Tree."""

    @staticmethod
    def get_applicable_skills(source_servers: list, target_region: str, source_region: str) -> list:
        """
        Query the Skills Knowledge Tree (same as simulation) to find
        applicable skills for each source server.
        """
        try:
            from services.agentic_simulator import SkillRegistry, ServerProfiler
            skills = []
            for server in source_servers:
                profile = ServerProfiler.classify(server)
                applicable = SkillRegistry.get_skills_for_server(profile, server)
                for skill in applicable:
                    if skill and skill.get("name"):
                        skills.append({
                            "name": skill["name"],
                            "description": skill.get("description", ""),
                            "server": server.get("name", ""),
                            "confidence": skill.get("confidence", 0),
                        })
            # Deduplicate by name
            seen = set()
            unique = []
            for s in skills:
                if s["name"] not in seen:
                    seen.add(s["name"])
                    unique.append(s)
            logger.info(f"[SKILL-EXEC] Found {len(unique)} applicable skills from Knowledge Tree")
            return unique
        except Exception as e:
            logger.warning(f"[SKILL-EXEC] Skill query failed: {e}")
            return []

    @staticmethod
    def query_federated_knowledge(source_servers: list) -> dict:
        """
        Query all 3 knowledge sources (SkillRegistry, ExternalKnowledge, 
        ExecutionHistory) — same as simulation.
        """
        try:
            from services.agentic_simulator import SkillRegistry, ServerProfiler, ExecutionHistoryStore
            from services.knowledge_provider import KnowledgeProvider
            knowledge = {}
            for server in source_servers:
                profile = ServerProfiler.classify(server)
                enriched = ServerProfiler.enrich_with_history(profile, server)
                skills = SkillRegistry.get_skills_for_server(enriched, server)
                history = ExecutionHistoryStore.query_similar(enriched, server)
                result = KnowledgeProvider.query(enriched, server, skill_matches=skills, history_matches=history)
                knowledge[server.get("name", "")] = {
                    "skills": skills,
                    "history": history,
                    "knowledge": result,
                }
            return knowledge
        except Exception as e:
            logger.warning(f"[SKILL-EXEC] Knowledge query failed: {e}")
            return {}

    @staticmethod
    def try_mcp(service: str, operation: str, arguments: dict, credentials: dict) -> dict:
        """Try operation via MCP server."""
        try:
            from services.mcp_inventory import MCPInventory
            result = MCPInventory.call_tool(
                service_name=service,
                operation=operation,
                arguments=arguments,
                credentials={"ak": credentials.get("ak", ""), "sk": credentials.get("sk", "")},
            )
            if result.get("success"):
                logger.info(f"[SKILL-EXEC] MCP {service}.{operation} succeeded")
            return result
        except Exception as e:
            logger.warning(f"[SKILL-EXEC] MCP {service}.{operation} failed: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def try_hcloud(cmd: str, timeout: int = 60) -> dict:
        """Try operation via hcloud CLI."""
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
            success = result.returncode == 0
            stdout = result.stdout.strip()
            try:
                parsed = json.loads(stdout[stdout.find("{"):]) if "{" in stdout else None
            except (json.JSONDecodeError, ValueError):
                parsed = None
            if success:
                logger.info(f"[SKILL-EXEC] hcloud command succeeded")
            else:
                logger.warning(f"[SKILL-EXEC] hcloud command failed: {result.stderr[:200]}")
            return {"success": success, "stdout": stdout, "stderr": result.stderr.strip(), "parsed": parsed}
        except subprocess.TimeoutExpired:
            return {"success": False, "error": f"Command timed out ({timeout}s)"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def try_ssh(host: str, cmd: str, username: str = "root", password: str = "", timeout: int = 120) -> dict:
        """Try operation via SSH."""
        try:
            import paramiko
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(host, username=username, password=password, timeout=timeout)
            stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            client.close()
            logger.info(f"[SKILL-EXEC] SSH command succeeded on {host}")
            return {"success": True, "stdout": out, "stderr": err}
        except Exception as e:
            logger.warning(f"[SKILL-EXEC] SSH failed on {host}: {e}")
            return {"success": False, "error": str(e)}

    @classmethod
    def install_sms_agent_skill_driven(
        cls,
        source_ip: str,
        target_ak: str,
        target_sk: str,
        os_user: str = "root",
        os_password: str = "",
        source_region: str = "",
        target_region: str = "",
    ) -> dict:
        """
        Install SMS agent using the skill's exact commands.
        
        From huawei-cloud-sms-migration skill:
        - Download SMS agent from OBS
        - Extract and run setup with AK/SK passed via printf
        - The agent uses the TARGET account's Master AK/SK
        
        Tool order: SSH (agent install is OS-level, can't be done via MCP/hcloud)
        """
        logger.info(f"[SKILL-EXEC] Installing SMS agent on {source_ip} using skill commands")

        # Skill command: download, extract, and configure agent with AK/SK
        # The SMS agent startup.sh is interactive — it asks for:
        # 1. EULA agreement (y/n)
        # 2. AK (target account access key)
        # 3. SK (target account secret key)
        # 4. Region (optional, may auto-detect)
        # Use printf to pipe all inputs non-interactively
        install_cmd = f"""
cd /tmp
wget -q https://sms-agent.obs.cn-north-1.myhuaweicloud.com/SMS-Agent.tar.gz -O SMS-Agent.tar.gz 2>/dev/null
tar xzf SMS-Agent.tar.gz 2>/dev/null
cd SMS-Agent
# Kill any existing screen sessions from previous attempts
screen -ls 2>/dev/null | grep sms_agent | cut -d. -f1 | awk '{{print $1}}' | xargs -I{{}} screen -S {{}} -X quit 2>/dev/null
# Feed all interactive inputs: y (EULA) + AK + SK + region
printf 'y\\n{target_ak}\\n{target_sk}\\n{target_region}\\n' | ./startup.sh
echo "SMS_AGENT_INSTALL_EXIT=$?"
"""

        result = cls.try_ssh(source_ip, install_cmd, username=os_user, password=os_password, timeout=120)
        
        if result["success"] and "SMS_AGENT_INSTALL_EXIT=" in result.get("stdout", ""):
            exit_code = result["stdout"].split("SMS_AGENT_INSTALL_EXIT=")[-1].split("\n")[0].strip()
            if exit_code == "0":
                return {
                    "success": True,
                    "message": f"SMS agent installed on {source_ip} with target AK/SK (EULA accepted)",
                    "tool": "ssh",
                    "skill": "huawei-cloud-sms-migration",
                }
            else:
                return {
                    "success": False,
                    "message": f"SMS agent install exited with code {exit_code} on {source_ip}",
                    "error": f"Exit code: {exit_code}",
                    "tool": "ssh",
                }
        return {
            "success": False,
            "message": f"SMS agent install failed on {source_ip}: {result.get('error', result.get('stderr', ''))}",
            "error": result.get("error", ""),
            "tool": "ssh",
        }

    @classmethod
    def list_sms_sources_skill_driven(
        cls,
        source_region: str,
        target_ak: str = "",
        target_sk: str = "",
    ) -> dict:
        """
        List registered SMS sources using the skill's commands.
        
        Tool order: MCP → hcloud CLI
        """
        # Try MCP first
        mcp_result = cls.try_mcp(
            "smsapi", "ListServers",
            {"region": source_region},
            {"ak": target_ak, "sk": target_sk},
        )
        if mcp_result.get("success"):
            return {"success": True, "sources": mcp_result.get("result", {}).get("sources", []), "tool": "mcp"}

        # Fallback: hcloud CLI
        cmd = f"hcloud SMS ListServers --cli-region={source_region}"
        hcloud_result = cls.try_hcloud(cmd)
        if hcloud_result["success"] and hcloud_result.get("parsed"):
            sources = hcloud_result["parsed"].get("sources", [])
            return {"success": True, "sources": sources, "tool": "hcloud"}
        
        return {"success": False, "sources": [], "error": hcloud_result.get("error", ""), "tool": "hcloud"}

    @classmethod
    def create_sms_task_skill_driven(
        cls,
        source_server_id: str,
        target_server_id: str,
        source_region: str,
        target_region: str,
        source_server_name: str = "",
        target_ak: str = "",
        target_sk: str = "",
        os_type: str = "LINUX",
    ) -> dict:
        """
        Create SMS migration task using the skill's commands.
        
        From huawei-cloud-sms-migration-exact-disk-config skill:
        - Use hcloud SMS CreateTask with proper disk mapping
        - Must use EVS Volume ID (not SMS Disk ID) — SMS.0515 fix
        - Use private IP with use_public_ip=true — SMS.6602 fix
        
        Tool order: MCP → hcloud CLI
        """
        task_name = f"migrate-{source_server_name or source_server_id[:8]}"

        # Try MCP first
        mcp_result = cls.try_mcp(
            "smsapi", "CreateTask",
            {
                "name": task_name,
                "type": "MIGRATE_FILE",
                "os_type": os_type,
                "source_server_id": source_server_id,
                "target_server_id": target_server_id,
                "use_public_ip": True,
                "region": source_region,
            },
            {"ak": target_ak, "sk": target_sk},
        )
        if mcp_result.get("success"):
            task_id = mcp_result.get("result", {}).get("id", "")
            return {"success": True, "task_id": task_id, "tool": "mcp"}

        # Fallback: hcloud CLI
        cmd = (
            f"hcloud SMS CreateTask "
            f"--name='{task_name}' "
            f"--type=MIGRATE_FILE "
            f"--os_type={os_type} "
            f"--source_server.id={source_server_id} "
            f"--target_server.vm_id={target_server_id} "
            f"--use_public_ip=true "
            f"--cli-region={source_region}"
        )
        hcloud_result = cls.try_hcloud(cmd, timeout=120)
        if hcloud_result["success"]:
            task_id = ""
            if hcloud_result.get("parsed"):
                task_id = hcloud_result["parsed"].get("id", "")
            return {"success": True, "task_id": task_id, "tool": "hcloud"}

        return {
            "success": False,
            "message": f"SMS task creation failed: {hcloud_result.get('stderr', hcloud_result.get('error', ''))}",
            "error": hcloud_result.get("stderr", ""),
            "tool": "hcloud",
        }

    @classmethod
    def monitor_sms_task_skill_driven(
        cls,
        task_id: str,
        source_region: str,
        target_ak: str = "",
        target_sk: str = "",
        max_wait: int = 3600,
    ) -> dict:
        """
        Monitor SMS task using the skill's monitoring patterns.
        
        From huawei-cloud-sms-migration skill:
        - state=READY with syncing=true = agent installing
        - state=RUNNING = migration in progress
        - state=SUCCESS = completed
        - state=FAILED = check error_json
        
        Tool order: MCP → hcloud CLI
        """
        logger.info(f"[SKILL-EXEC] Monitoring task {task_id} (max {max_wait}s)")
        start_time = time.time()
        last_progress = -1

        while time.time() - start_time < max_wait:
            # Try MCP first
            mcp_result = cls.try_mcp(
                "smsapi", "ShowTask",
                {"task_id": task_id, "region": source_region},
                {"ak": target_ak, "sk": target_sk},
            )
            if mcp_result.get("success"):
                result_data = mcp_result.get("result", {})
                state = result_data.get("state", "UNKNOWN")
                progress = result_data.get("migrate_progress", 0)
                if progress != last_progress:
                    logger.info(f"[SKILL-EXEC] Task {task_id}: state={state}, progress={progress}%")
                    last_progress = progress
                if state in ("SUCCESS", "MIGRATE_SUCCESS"):
                    return {"success": True, "state": state, "progress": progress, "tool": "mcp"}
                if state in ("FAILED", "SYNC_ERR", "MIGRATE_FAILED", "ERROR"):
                    return {"success": False, "state": state, "error": f"Task entered error state: {state}", "tool": "mcp"}
            else:
                # Fallback: hcloud CLI
                cmd = f"hcloud SMS ShowTask --task_id={task_id} --cli-region={source_region}"
                hcloud_result = cls.try_hcloud(cmd)
                if hcloud_result["success"] and hcloud_result.get("parsed"):
                    state = hcloud_result["parsed"].get("state", "UNKNOWN")
                    progress = hcloud_result["parsed"].get("migrate_progress", 0)
                    if progress != last_progress:
                        logger.info(f"[SKILL-EXEC] Task {task_id}: state={state}, progress={progress}%")
                        last_progress = progress
                    if state in ("SUCCESS", "MIGRATE_SUCCESS"):
                        return {"success": True, "state": state, "progress": progress, "tool": "hcloud"}
                    if state in ("FAILED", "SYNC_ERR", "MIGRATE_FAILED", "ERROR"):
                        return {"success": False, "state": state, "error": f"Task entered error state: {state}", "tool": "hcloud"}
                else:
                    logger.warning(f"[SKILL-EXEC] Status check failed for {task_id}")

            time.sleep(30)

        return {"success": False, "state": "TIMEOUT", "error": f"Task {task_id} timed out after {max_wait}s"}

    @staticmethod
    def try_hermes_agent(task_description: str, skill_name: str = "", timeout: int = 300) -> dict:
        """
        Last resort: delegate to Hermes agent with skill loaded.
        The agent has access to all tools (terminal, SSH, MCP, hcloud) and
        can handle edge cases that hardcoded commands can't.
        """
        import subprocess as _sp
        binary = "/usr/local/lib/hermes-agent/venv/bin/hermes"
        if not os.path.isfile(binary):
            return {"success": False, "error": "Hermes binary not found"}

        cmd = [
            binary, "chat", "-q",
            f"Execute: {task_description}",
            "--profile", "default",
            "--yolo",
        ]
        try:
            result = _sp.run(cmd, capture_output=True, text=True, timeout=timeout)
            success = result.returncode == 0
            output = result.stdout.strip()
            logger.info(f"[SKILL-EXEC] Hermes agent delegation {'succeeded' if success else 'failed'} (skill={skill_name})")
            return {"success": success, "output": output[:1000], "error": result.stderr[:500] if not success else None, "tool": "hermes_agent"}
        except _sp.TimeoutExpired:
            return {"success": False, "error": f"Hermes agent timed out ({timeout}s)", "tool": "hermes_agent"}
        except Exception as e:
            return {"success": False, "error": str(e), "tool": "hermes_agent"}

    @classmethod
    def run_full_migration_skill_driven(
        cls,
        source_servers: list,
        target_servers: list,
        source_region: str,
        target_region: str,
        os_user: str = "root",
        os_password: str = "",
        target_ak: str = "",
        target_sk: str = "",
        source_ak: str = "",
        source_sk: str = "",
    ) -> list:
        """
        Run the full SMS migration lifecycle using the Skills Knowledge Tree.
        
        Order for each operation:
        1. Query Skills Knowledge Tree for applicable skills
        2. Try MCP
        3. Try hcloud CLI
        4. Try SSH (for OS-level operations)
        """
        results = []

        # Step 1: Query Skills Knowledge Tree
        applicable_skills = cls.get_applicable_skills(source_servers, target_region, source_region)
        knowledge = cls.query_federated_knowledge(source_servers)
        logger.info(f"[SKILL-EXEC] Skills: {[s['name'] for s in applicable_skills]}")

        # Resolve source EIPs via hcloud API (source region)
        source_eip_map = {}
        try:
            from services.sms_migration import SMSMigration
            source_eip_map = SMSMigration.resolve_source_eips(source_region, source_ak, source_sk)
            logger.info(f"[SKILL-EXEC] Resolved {len(source_eip_map)} source EIPs via hcloud API")
        except Exception as e:
            logger.warning(f"[SKILL-EXEC] EIP resolution failed: {e}")

        for i, src in enumerate(source_servers):
            target = target_servers[i] if i < len(target_servers) else None
            if not target:
                results.append({"source": src.get("name", ""), "status": "failed", "error": "No matching target"})
                continue

            src_name = src.get("name", f"source-{i}")
            src_id = src.get("id", "")
            ssh_ip = source_eip_map.get(src_id, "") or src.get("public_ip", "") or src.get("ip", "")
            target_id = target.get("id", "")

            logger.info(f"[SKILL-EXEC] Migrating {src_name}: {src_id} → {target_id}")

            # Step 2: Install SMS agent (SSH — needed for ALL source types)
            # The SMS migration agent registers the source server with SMS service
            # Uses target account's AK/SK to authenticate with SMS
            agent_result = {"success": True, "message": "Skipped (no IP or password)"}
            if ssh_ip and os_password:
                agent_result = cls.install_sms_agent_skill_driven(
                    source_ip=ssh_ip,
                    target_ak=target_ak,
                    target_sk=target_sk,
                    os_user=os_user,
                    os_password=os_password,
                    source_region=source_region,
                    target_region=target_region,
                )
            results.append({
                "source": src_name, "operation": "SMS_AGENT_INSTALL",
                "status": "success" if agent_result["success"] else "failed",
                "message": agent_result.get("message", ""),
                "error": agent_result.get("error"),
                "tool": agent_result.get("tool", "ssh"),
                "skill": "huawei-cloud-sms-migration",
            })

            # Step 3: Wait for agent to register, then list sources
            time.sleep(30)  # Give agent time to register
            sources_result = cls.list_sms_sources_skill_driven(source_region, target_ak, target_sk)
            results.append({
                "source": src_name, "operation": "SMS_LIST_SOURCES",
                "status": "success" if sources_result["success"] else "warning",
                "message": f"Found {len(sources_result.get('sources', []))} registered sources",
                "tool": sources_result.get("tool", "hcloud"),
            })

            # Step 4: Create SMS task (MCP → hcloud → Hermes agent)
            registered_source = None
            for rs in sources_result.get("sources", []):
                if src_name in rs.get("name", "") or rs.get("name", "") in src_name:
                    registered_source = rs
                    break
            source_id_for_task = registered_source.get("id", src_id) if registered_source else src_id

            task_result = cls.create_sms_task_skill_driven(
                source_server_id=source_id_for_task,
                target_server_id=target_id,
                source_region=source_region,
                target_region=target_region,
                source_server_name=src_name,
                target_ak=target_ak,
                target_sk=target_sk,
            )

            # If MCP and hcloud both failed, try Hermes agent delegation
            if not task_result["success"]:
                logger.info(f"[SKILL-EXEC] MCP and hcloud failed for task creation — delegating to Hermes agent")
                hermes_result = cls.try_hermes_agent(
                    f"Create SMS migration task: source_server_id={source_id_for_task}, "
                    f"target_server_id={target_id}, source_region={source_region}, "
                    f"target_region={target_region}, name={src_name}. "
                    f"Use hcloud SMS CreateTask with --source_server.id={source_id_for_task} "
                    f"--target_server.vm_id={target_id} --use_public_ip=true "
                    f"--cli-region={source_region}",
                    skill_name="huawei-cloud-sms-migration",
                )
                if hermes_result["success"]:
                    task_result = {"success": True, "task_id": "hermes_managed", "tool": "hermes_agent"}
            results.append({
                "source": src_name, "operation": "SMS_TASK_CREATE",
                "status": "success" if task_result["success"] else "failed",
                "message": task_result.get("message", ""),
                "error": task_result.get("error"),
                "task_id": task_result.get("task_id", ""),
                "tool": task_result.get("tool", "hcloud"),
                "skill": "huawei-cloud-sms-migration-exact-disk-config",
            })

            # Step 5: Monitor sync (MCP → hcloud)
            task_id = task_result.get("task_id", "")
            if task_id:
                monitor_result = cls.monitor_sms_task_skill_driven(
                    task_id=task_id,
                    source_region=source_region,
                    target_ak=target_ak,
                    target_sk=target_sk,
                )
                results.append({
                    "source": src_name, "operation": "SMS_SYNC_MONITOR",
                    "status": "success" if monitor_result["success"] else "failed",
                    "message": f"Task {task_id}: state={monitor_result.get('state')}, progress={monitor_result.get('progress', 0)}%",
                    "error": monitor_result.get("error"),
                    "tool": monitor_result.get("tool", "hcloud"),
                })

        return results
