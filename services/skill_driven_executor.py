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
        Install SMS agent by delegating to the ERP's Hermes agent with
        the huawei-cloud-sms-migration skill loaded.
        
        The agent has the skill's exact commands, can handle interactive
        prompts (EULA, AK/SK), and can use SSH/terminal/hcloud/MCP.
        
        Tool order: Hermes agent (with skill loaded)
        """
        logger.info(f"[SKILL-EXEC] Delegating SMS agent install on {source_ip} to Hermes agent")

        prompt = (
            f"Install the Huawei Cloud SMS migration agent on source server {source_ip}.\n"
            f"SSH credentials: user={os_user}, password={os_password}\n"
            f"Use the TARGET account AK/SK for SMS registration:\n"
            f"  AK={target_ak}\n"
            f"  SK={target_sk}\n"
            f"Target region: {target_region}\n"
            f"Source region: {source_region}\n\n"
            f"Follow the huawei-cloud-sms-migration skill exactly.\n"
            f"The agent startup.sh is interactive — it asks for EULA agreement (y), "
            f"AK, SK, and possibly region. Handle all prompts.\n"
            f"After install, verify the source server appears in SMS console by running: "
            f"hcloud SMS ListServers --cli-region={source_region}\n"
            f"Return: whether the source server is registered in SMS."
        )

        result = cls.try_hermes_agent(
            task_description=prompt,
            skill_name="huawei-cloud-sms-migration",
            timeout=300,
        )

        if result["success"]:
            return {
                "success": True,
                "message": f"SMS agent installed on {source_ip} via Hermes agent (skill: huawei-cloud-sms-migration)",
                "tool": "hermes_agent",
                "skill": "huawei-cloud-sms-migration",
                "agent_output": result.get("output", "")[:500],
            }
        return {
            "success": False,
            "message": f"SMS agent install failed on {source_ip}: {result.get('error', '')}",
            "error": result.get("error", ""),
            "tool": "hermes_agent",
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

        # Build the prompt with skill context
        full_prompt = task_description
        if skill_name:
            full_prompt = f"Use skill: {skill_name}\n\n{task_description}"

        cmd = [
            binary, "chat", "-q",
            full_prompt,
            "--profile", "default",
            "--model", "glm-5.2",
            "--yolo",
        ]
        try:
            result = _sp.run(cmd, capture_output=True, text=True, timeout=timeout)
            success = result.returncode == 0
            output = result.stdout.strip()
            logger.info(f"[SKILL-EXEC] Hermes agent delegation {'succeeded' if success else 'failed'} (skill={skill_name}, exit={result.returncode})")
            if not success and result.stderr:
                logger.warning(f"[SKILL-EXEC] Hermes stderr: {result.stderr[:300]}")
            return {"success": success, "output": output[:2000], "error": result.stderr[:500] if not success else None, "tool": "hermes_agent"}
        except _sp.TimeoutExpired:
            return {"success": False, "error": f"Hermes agent timed out ({timeout}s)", "tool": "hermes_agent"}
        except Exception as e:
            return {"success": False, "error": str(e), "tool": "hermes_agent"}

    @classmethod
    def verify_sg_preflight(
        cls,
        target_server_id: str,
        target_region: str,
        target_ak: str,
        target_sk: str,
        os_type: str = "Linux",
    ) -> dict:
        """
        BLOCKING preflight: Verify target ECS has SG with correct ports (22, 8900, 8899).
        
        Returns {"success": True} if SG is properly configured.
        Returns {"success": False, "error": "..."} if SG is missing/misconfigured.
        """
        import subprocess as _sp
        
        is_linux = os_type.lower() == "linux"
        required_ports = [22, 8900] if is_linux else [22, 8899, 8900]
        
        try:
            # 1. Get ECS port IDs
            port_cmd = (
                f"hcloud VPC ListPorts --cli-region={target_region} --cli-profile=erp-target 2>&1"
            )
            port_result = _sp.run(port_cmd, shell=True, capture_output=True, text=True, timeout=30)
            import json as _json
            port_out = port_result.stdout
            idx = port_out.find("{")
            if idx < 0:
                return {"success": False, "error": "VPC ListPorts returned no JSON", "tool": "hcloud"}
            
            ports_data = _json.loads(port_out[idx:])
            compute_ports = [
                p for p in ports_data.get("ports", [])
                if "compute" in p.get("device_owner", "") and p.get("device_id") == target_server_id
            ]
            
            if not compute_ports:
                return {
                    "success": False,
                    "error": f"No compute port found for ECS {target_server_id}. ECS may not exist or has no network interface.",
                    "tool": "hcloud",
                }
            
            # 2. Check SG associations on the port
            port = compute_ports[0]
            port_id = port.get("id", "")
            sgs = port.get("security_groups", [])
            sg_ids = [s.get("id", "") for s in sgs]
            
            if not sg_ids:
                return {
                    "success": False,
                    "error": f"ECS {target_server_id} has NO security groups associated. "
                             f"Create SG with ports {required_ports} and associate via "
                             f"hcloud VPC UpdatePort --port_id={port_id} --port.security_groups.1=<sg_id>",
                    "tool": "hcloud",
                }
            
            # 3. Check SG rules for required ports
            sg_id = sg_ids[0]
            rules_cmd = (
                f"hcloud VPC ShowSecurityGroup --security_group_id={sg_id} "
                f"--cli-region={target_region} --cli-profile=erp-target 2>&1"
            )
            rules_result = _sp.run(rules_cmd, shell=True, capture_output=True, text=True, timeout=30)
            rules_out = rules_result.stdout
            idx2 = rules_out.find("{")
            if idx2 < 0:
                return {
                    "success": False,
                    "error": f"Cannot read SG {sg_id} rules",
                    "tool": "hcloud",
                }
            
            sg_data = _json.loads(rules_out[idx2:])
            sg = sg_data.get("security_group", {})
            rules = sg.get("security_group_rules", [])
            
            # Find ingress TCP rules with required ports
            open_ports = set()
            for rule in rules:
                if rule.get("direction") == "ingress" and rule.get("protocol") == "tcp":
                    multiport = rule.get("multiport", "")
                    pmin = rule.get("port_range_min")
                    pmax = rule.get("port_range_max")
                    if multiport:
                        # Parse multiport (e.g. "22" or "22,8900" or "1-65535")
                        for part in multiport.split(","):
                            part = part.strip()
                            if "-" in part:
                                lo, hi = part.split("-")
                                for p in range(int(lo), int(hi) + 1):
                                    open_ports.add(p)
                            elif part.isdigit():
                                open_ports.add(int(part))
                    elif pmin and pmax:
                        for p in range(pmin, pmax + 1):
                            open_ports.add(p)
            
            missing_ports = [p for p in required_ports if p not in open_ports]
            
            if missing_ports:
                return {
                    "success": False,
                    "error": f"SG {sg_id} missing ingress TCP ports {missing_ports}. "
                             f"Open ports: {sorted(open_ports)}. Required: {required_ports}. "
                             f"Add rules: hcloud VPC CreateSecurityGroupRule "
                             f"--security_group_rule.direction=ingress "
                             f"--security_group_rule.security_group_id={sg_id} "
                             f"--security_group_rule.protocol=tcp "
                             f"--security_group_rule.multiport={','.join(str(p) for p in missing_ports)} "
                             f"--security_group_rule.remote_ip_prefix=0.0.0.0/0",
                    "tool": "hcloud",
                    "sg_id": sg_id,
                    "missing_ports": missing_ports,
                }
            
            return {
                "success": True,
                "message": f"SG {sg_id} OK — ports {required_ports} open, associated with ECS {target_server_id}",
                "tool": "hcloud",
                "sg_id": sg_id,
                "open_ports": sorted(open_ports),
            }
            
        except Exception as e:
            return {"success": False, "error": f"SG preflight error: {e}", "tool": "hcloud"}

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

            # Step 3.5: PREFLIGHT — Verify SG rules on target ECS (SMS.3805 prevention)
            # This is a BLOCKING check — if SG is missing or not associated, migration WILL fail
            sg_result = cls.verify_sg_preflight(
                target_server_id=target_id,
                target_region=target_region,
                target_ak=target_ak,
                target_sk=target_sk,
                os_type=src.get("os_type", "Linux"),
            )
            results.append({
                "source": src_name, "operation": "PREFLIGHT_SG_VERIFY",
                "status": "success" if sg_result["success"] else "BLOCKING",
                "message": sg_result.get("message", ""),
                "error": sg_result.get("error"),
                "tool": sg_result.get("tool", "hcloud"),
                "blocking": not sg_result["success"],
            })
            if not sg_result["success"]:
                logger.error(f"[SKILL-EXEC] BLOCKING: SG preflight failed for {src_name} — {sg_result.get('error')}")
                results.append({
                    "source": src_name, "operation": "SMS_TASK_CREATE",
                    "status": "skipped (SG preflight failed)",
                    "message": "Cannot create SMS task — target SG missing or not associated",
                })
                continue

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
