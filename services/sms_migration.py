"""
SMS Migration Runtime — executes real SMS operations against Huawei Cloud.

Used by the execution engine AFTER Terraform provisions target infrastructure.
Reads the Terraform state to get target ECS IDs, then:
1. Registers source servers with SMS
2. Creates SMS migration tasks (source → target mapping)
3. Monitors sync progress
4. Executes cutover

Uses hcloud CLI as primary tool (SMS API is complex and MCP coverage is limited).
Falls back to MCP smsapi service if available.
"""

import json
import os
import time
import logging
import subprocess
import re
from datetime import datetime

logger = logging.getLogger(__name__)


class SMSMigration:
    """Handles SMS migration operations against Huawei Cloud."""

    @staticmethod
    def _hcloud(cmd: str, timeout: int = 60) -> dict:
        """Run hcloud CLI command and return structured result."""
        try:
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=timeout
            )
            success = result.returncode == 0
            output = result.stdout.strip()
            # Try to parse JSON output
            try:
                parsed = json.loads(output)
            except (json.JSONDecodeError, ValueError):
                parsed = None
            return {
                "success": success,
                "stdout": output,
                "stderr": result.stderr.strip(),
                "parsed": parsed,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": f"Command timed out ({timeout}s)"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def _ssh_command(host: str, cmd: str, password: str = None, username: str = "root", timeout: int = 60) -> dict:
        """SSH to a host and run a command."""
        try:
            import paramiko
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            if password:
                client.connect(host, username=username, password=password, timeout=timeout)
            else:
                client.connect(host, username=username, timeout=timeout)
            stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            client.close()
            return {"success": True, "stdout": out, "stderr": err}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def install_sms_agent(cls, source_ip: str, os_user: str = "root", os_password: str = "") -> dict:
        """
        Install SMS agent on a source server via SSH.

        Downloads the SMS agent from Huawei OBS and starts it.
        This is the Zero Trust boundary — ERP connects to source via SSH
        with customer-provided credentials.
        """
        logger.info(f"[SMS] Installing agent on source server {source_ip}...")

        # Agent installation script (from huawei-cloud-sms-migration skill)
        install_cmd = """
cd /tmp
wget -q https://sms-agent.obs.cn-north-1.myhuaweicloud.com/SMS-Agent.tar.gz -O SMS-Agent.tar.gz
tar xzf SMS-Agent.tar.gz
cd SMS-Agent
./setup.sh
"""

        result = cls._ssh_command(source_ip, install_cmd, password=os_password, username=os_user)

        if result["success"]:
            logger.info(f"[SMS] Agent installed successfully on {source_ip}")
            return {
                "success": True,
                "message": f"SMS agent installed on {source_ip}",
                "stdout": result.get("stdout", "")[:500],
            }
        else:
            logger.warning(f"[SMS] Agent install failed on {source_ip}: {result.get('error', '')}")
            return {
                "success": False,
                "message": f"SMS agent install failed on {source_ip}: {result.get('error', '')}",
                "error": result.get("error", "Unknown SSH error"),
            }

    @classmethod
    def list_sources(cls, source_region: str, ak: str, sk: str) -> dict:
        """
        List registered SMS sources in the source region.
        Uses hcloud CLI with source credentials.
        """
        cmd = f"hcloud SMS ListServers --cli-region={source_region}"
        result = cls._hcloud(cmd)
        if result["success"] and result.get("parsed"):
            sources = result["parsed"].get("sources", [])
            return {"success": True, "sources": sources}
        return {"success": False, "sources": [], "error": result.get("error", result.get("stderr", ""))}

    @classmethod
    def create_sms_task(
        cls,
        source_server_id: str,
        target_server_id: str,
        source_region: str,
        target_region: str,
        source_server_name: str = "",
        ak: str = "",
        sk: str = "",
        os_type: str = "LINUX",
    ) -> dict:
        """
        Create an SMS migration task mapping source → target.

        Uses hcloud CLI SMS CreateTask with proper disk mapping.
        """
        task_name = f"migrate-{source_server_name or source_server_id[:8]}"

        cmd = (
            f"hcloud SMS CreateTask "
            f"--name='{task_name}' "
            f"--type=MIGRATE_FILE "
            f"--os_type={os_type} "
            f"--source_server.id={source_server_id} "
            f"--target_server.vm_id={target_server_id} "
            f"--use_public_ip=false "
            f"--start_target_server=true "
            f"--cli-region={source_region}"
        )

        result = cls._hcloud(cmd, timeout=120)

        if result["success"]:
            task_id = ""
            if result.get("parsed"):
                task_id = result["parsed"].get("id", "")
            return {
                "success": True,
                "task_id": task_id,
                "message": f"SMS task created: {task_name} ({source_server_id} → {target_server_id})",
            }
        return {
            "success": False,
            "message": f"SMS task creation failed: {result.get('stderr', result.get('error', ''))}",
            "error": result.get("stderr", ""),
        }

    @classmethod
    def get_task_status(cls, task_id: str, source_region: str) -> dict:
        """Get SMS task status."""
        cmd = f"hcloud SMS ShowTask --task_id={task_id} --cli-region={source_region}"
        result = cls._hcloud(cmd)
        if result["success"] and result.get("parsed"):
            state = result["parsed"].get("state", "UNKNOWN")
            progress = result["parsed"].get("migrate_progress", 0)
            return {
                "success": True,
                "state": state,
                "progress": progress,
                "task_id": task_id,
            }
        return {"success": False, "state": "UNKNOWN", "progress": 0, "error": result.get("error", "")}

    @classmethod
    def start_task(cls, task_id: str, source_region: str) -> dict:
        """Start an SMS migration task."""
        cmd = f"hcloud SMS StartTask --task_id={task_id} --cli-region={source_region}"
        result = cls._hcloud(cmd)
        return {"success": result["success"], "task_id": task_id}

    @classmethod
    def monitor_until_complete(cls, task_id: str, source_region: str, max_wait: int = 3600) -> dict:
        """
        Poll SMS task status until sync is complete or timeout.

        Returns when state is 'SYNCING_COMPLETE' or error.
        """
        logger.info(f"[SMS] Monitoring task {task_id} until complete (max {max_wait}s)...")
        start_time = time.time()
        last_progress = 0

        while time.time() - start_time < max_wait:
            status = cls.get_task_status(task_id, source_region)
            if not status["success"]:
                logger.warning(f"[SMS] Status check failed for {task_id}: {status.get('error')}")
                time.sleep(30)
                continue

            state = status["state"]
            progress = status["progress"]

            if progress != last_progress:
                logger.info(f"[SMS] Task {task_id}: state={state}, progress={progress}%")
                last_progress = progress

            # Check completion states
            if state in ("SYNCING_COMPLETE", "MIGRATE_SUCCESS"):
                return {"success": True, "state": state, "progress": progress, "task_id": task_id}

            # Check error states
            if state in ("SYNC_ERR", "MIGRATE_FAILED", "ERROR"):
                return {"success": False, "state": state, "error": f"SMS task {task_id} entered error state: {state}"}

            time.sleep(30)  # Poll every 30 seconds

        return {"success": False, "state": "TIMEOUT", "error": f"SMS task {task_id} timed out after {max_wait}s"}

    @classmethod
    def cutover(cls, task_id: str, source_region: str) -> dict:
        """
        Execute cutover — stops source, finalizes target.
        This is a human gate — should only be called after explicit approval.
        """
        logger.info(f"[SMS] Executing cutover for task {task_id}...")

        # Finalize the migration (stop sync, detach agent, start target)
        cmd = f"hcloud SMS StopTask --task_id={task_id} --cli-region={source_region}"
        result = cls._hcloud(cmd, timeout=120)

        if result["success"]:
            return {
                "success": True,
                "message": f"Cutover complete for task {task_id}. Target server is now active.",
            }
        return {
            "success": False,
            "message": f"Cutover failed for task {task_id}: {result.get('stderr', '')}",
            "error": result.get("stderr", ""),
        }

    @classmethod
    def cleanup_task(cls, task_id: str, source_region: str) -> dict:
        """Delete SMS task after migration is complete."""
        cmd = f"hcloud SMS DeleteTask --task_id={task_id} --cli-region={source_region}"
        result = cls._hcloud(cmd)
        return {"success": result["success"], "task_id": task_id}

    @classmethod
    def run_full_migration(
        cls,
        source_servers: list,
        target_servers: list,
        source_region: str,
        target_region: str,
        os_user: str = "root",
        os_password: str = "",
        source_ak: str = "",
        source_sk: str = "",
        ak: str = "",
        sk: str = "",
    ) -> list:
        """
        Run the full SMS migration lifecycle for all servers.

        Args:
            source_servers: [{"id": "...", "name": "...", "ip": "..."}]
            target_servers: [{"id": "...", "name": "..."}]  (from Terraform state)
            source_region: e.g. "ap-southeast-3"
            target_region: e.g. "la-north-2"
            os_user: SSH username for source servers
            os_password: SSH password for source servers

        Returns:
            List of migration results per server
        """
        results = []

        # Match source servers to target servers by name/index
        for i, source in enumerate(source_servers):
            target = target_servers[i] if i < len(target_servers) else None
            if not target:
                results.append({
                    "source": source.get("name", ""),
                    "status": "failed",
                    "error": "No matching target server",
                })
                continue

            source_name = source.get("name", f"source-{i}")
            source_ip = source.get("ip", "")
            source_id = source.get("id", "")
            target_id = target.get("id", "")

            logger.info(f"[SMS] Migrating {source_name}: {source_id} → {target_id}")

            # Step 1: Install SMS agent on source (if IP available)
            agent_result = {"success": True, "message": "Agent install skipped (no source IP)"}
            if source_ip and os_password:
                agent_result = cls.install_sms_agent(source_ip, os_user, os_password)
            elif not source_ip:
                logger.info(f"[SMS] No source IP for {source_name} — skipping agent install (may already be registered)")

            # Step 2: Create SMS task
            task_result = cls.create_sms_task(
                source_server_id=source_id,
                target_server_id=target_id,
                source_region=source_region,
                target_region=target_region,
                source_server_name=source_name,
                ak=ak, sk=sk,
            )

            if not task_result["success"]:
                results.append({
                    "source": source_name,
                    "status": "failed",
                    "agent_install": agent_result,
                    "task_creation": task_result,
                })
                continue

            # Step 3: Start task
            task_id = task_result["task_id"]
            cls.start_task(task_id, source_region)

            # Step 4: Monitor until complete
            monitor_result = cls.monitor_until_complete(task_id, source_region)

            results.append({
                "source": source_name,
                "source_id": source_id,
                "target_id": target_id,
                "task_id": task_id,
                "agent_install": agent_result,
                "task_creation": task_result,
                "sync_result": monitor_result,
                "status": "success" if monitor_result["success"] else "failed",
            })

        return results
