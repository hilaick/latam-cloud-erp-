# services/hermes_executor.py
import json
import logging
import paramiko
import os
from services.agent_orchestrator import AgentOrchestrator

logger = logging.getLogger(__name__)

class HermesExecutor:
    """Registry of tools available to the Hermes AI Agent."""
    
    @staticmethod
    def get_tools_schema():
        """Returns the JSON schema of available tools for the DeepSeek Prompt."""
        return [
            {
                "name": "run_anticipation",
                "description": "Runs the Phase 1 anticipation engine to check flavor capacity and EIP quotas.",
                "parameters": {"project_id": "string"}
            },
            {
                "name": "ssh_execute",
                "description": "Execute a bash command on a remote server to troubleshoot, pull logs, or deploy agents.",
                "parameters": {"ip": "string", "command": "string"}
            },
            {
                "name": "read_erp_code",
                "description": "Reads a local file from the ERP source code to help improve or debug the system.",
                "parameters": {"filepath": "string"}
            }
        ]

    @staticmethod
    def execute_tool(tool_name: str, params: dict, erp_context: dict) -> str:
        """Routes the tool call to the actual python implementation."""
        try:
            if tool_name == "run_anticipation":
                mapper_nodes = erp_context.get('phase_2_assets', [])
                insights = AgentOrchestrator.run_anticipation_engine(
                    mapper_nodes=mapper_nodes, 
                    blueprint_data={'topology': {'compute': mapper_nodes}},
                    current_eip_quota=10
                )
                return f"Anticipation Engine Results: {json.dumps(insights, indent=2)}"

            elif tool_name == "ssh_execute":
                ip = params.get("ip")
                command = params.get("command")
                
                # Setup SSH Client
                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                
                # NOTE: Update key_filename to your actual worker pem key path
                key_path = os.environ.get('WORKER_SSH_KEY', '/root/.ssh/id_rsa') 
                try:
                    ssh.connect(ip, username='root', key_filename=key_path, timeout=10)
                    stdin, stdout, stderr = ssh.exec_command(command)
                    out = stdout.read().decode('utf-8')
                    err = stderr.read().decode('utf-8')
                    ssh.close()
                    return f"Execution successful.\nSTDOUT:\n{out}\nSTDERR:\n{err}"
                except Exception as ssh_e:
                    return f"SSH Connection Failed to {ip}: {str(ssh_e)}"

            elif tool_name == "read_erp_code":
                filepath = params.get("filepath")
                # Security: Prevent directory traversal outside the ERP
                if ".." in filepath or filepath.startswith("/"):
                    return "Error: Directory traversal blocked. Use relative paths."
                
                if not os.path.exists(filepath):
                    return f"Error: File '{filepath}' does not exist."
                    
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Truncate if too large to prevent blowing up the context window
                    if len(content) > 15000:
                        return content[:15000] + "\n...[TRUNCATED]"
                    return content

            else:
                return f"Error: Tool '{tool_name}' not found."
                
        except Exception as e:
            logger.error(f"Tool execution failed: {str(e)}", exc_info=True)
            return f"Execution Error: {str(e)}"
