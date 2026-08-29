"""
MCP Inventory Scanner — on-demand tool discovery from Huawei Cloud MCP servers.

Scans OpenAPI specs from the MCP server directory to find available API endpoints
(tool definitions) per pillar. Used by both simulation and execution engines to:

1. Discover which MCP tools are available for a given action
2. Start ONLY the needed MCP servers (on-demand, not all 173)
3. Call the actual API endpoint with real credentials

The MCP servers are NOT started all at once — they're started on-demand
based on what the migration plan requires.
"""

import os
import json
import glob
import logging
import subprocess
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# MCP server base directory
MCP_BASE = "/tmp/mcp-update/iaas-mcp-server-main/huaweicloud_services_server"

# Pillar → MCP service mapping (which services handle which migration pillar)
PILLAR_SERVICES = {
    "compute": ["ecs", "ims", "as", "bms", "image"],
    "database": ["rds", "dds", "dcs", "drs", "gaussdb", "gaussdbfornosql", "gaussdbforopengauss", "ddm", "dws"],
    "storage": ["obs", "evs", "sfs", "sfsturbo", "oms", "cdm", "cbr"],
    "network": ["vpc", "eip", "elb", "nat", "vpn", "vpcep", "dns", "cfw"],
    "security": ["hss", "iam", "eps", "kms", "waf"],
    "monitoring": ["ces", "aom", "cts", "lts", "rms"],
    "billing": ["bss"],
    "tagging": ["tms"],
    "sms": ["smsapi"],
}

# Action → MCP service + endpoint keyword mapping
ACTION_MAP = {
    "CREATE_TARGET_ECS": {"service": "ecs", "method": "POST", "path_kw": "cloudservers"},
    "SHOW_ECS": {"service": "ecs", "method": "GET", "path_kw": "cloudservers"},
    "LIST_ECS": {"service": "ecs", "method": "GET", "path_kw": "cloudservers/detail"},
    "CREATE_VPC": {"service": "vpc", "method": "POST", "path_kw": "vpcs"},
    "CREATE_SUBNET": {"service": "vpc", "method": "POST", "path_kw": "subnets"},
    "CREATE_SG": {"service": "vpc", "method": "POST", "path_kw": "security-groups"},
    "CREATE_SG_RULE": {"service": "vpc", "method": "POST", "path_kw": "security-group-rules"},
    "CREATE_EIP": {"service": "eip", "method": "POST", "path_kw": "publicips"},
    "CREATE_ELB": {"service": "elb", "method": "POST", "path_kw": "loadbalancers"},
    "CREATE_NAT": {"service": "nat", "method": "POST", "path_kw": "nat_gateways"},
    "CREATE_RDS": {"service": "rds", "method": "POST", "path_kw": "instances"},
    "CREATE_DRS_JOB": {"service": "drs", "method": "POST", "path_kw": "jobs"},
    "START_DRS_JOB": {"service": "drs", "method": "POST", "path_kw": "action"},
    "CREATE_OBS_BUCKET": {"service": "obs", "method": "PUT", "path_kw": "/"},
    "CREATE_OMS_TASK": {"service": "oms", "method": "POST", "path_kw": "tasks"},
    "IMPORT_IMAGE": {"service": "ims", "method": "POST", "path_kw": "images"},
    "LIST_IMAGES": {"service": "ims", "method": "GET", "path_kw": "images"},
    "SMS_LIST_SOURCES": {"service": "smsapi", "method": "GET", "path_kw": "sources"},
    "SMS_SHOW_SOURCE": {"service": "smsapi", "method": "GET", "path_kw": "sources"},
    "SMS_CREATE_TASK": {"service": "smsapi", "method": "POST", "path_kw": "tasks"},
    "SMS_SHOW_TASK": {"service": "smsapi", "method": "GET", "path_kw": "tasks"},
    "SMS_UPDATE_MIGPROJECT": {"service": "smsapi", "method": "PUT", "path_kw": "migprojects"},
    "VALIDATE_CREDENTIALS": {"service": "iam", "method": "GET", "path_kw": "regions"},
    "LIST_PROJECTS": {"service": "iam", "method": "GET", "path_kw": "projects"},
    "HSS_LIST_HOSTS": {"service": "hss", "method": "GET", "path_kw": "hosts"},
    "EPS_CREATE": {"service": "eps", "method": "POST", "path_kw": "enterprises"},
    # Discovery (Phase 2)
    "LIST_FLAVORS": {"service": "ecs", "method": "GET", "path_kw": "flavors"},
    "LIST_IMAGES": {"service": "ims", "method": "GET", "path_kw": "images"},
    # Quota checks (Phase 4.0)
    "ECS_QUOTA": {"service": "ecs", "method": "GET", "path_kw": "limits"},
    "EVS_QUOTA": {"service": "evs", "method": "GET", "path_kw": "limits"},
    "VPC_QUOTA": {"service": "vpc", "method": "GET", "path_kw": "quotas"},
    # Security (Phase 4.3-4.4)
    "KMS_CREATE_KEY": {"service": "kms", "method": "POST", "path_kw": "create-key"},
    "CBR_CREATE_POLICY": {"service": "cbr", "method": "POST", "path_kw": "policies"},
    # Post-live (Phase 5)
    "CES_CREATE_ALARM": {"service": "ces", "method": "POST", "path_kw": "alarms"},
    "BSS_LIST_ORDERS": {"service": "bss", "method": "GET", "path_kw": "orders"},
    "TMS_TAG_RESOURCES": {"service": "tms", "method": "POST", "path_kw": "predefine-tags"},
}


class MCPInventory:
    """
    On-demand MCP tool discovery and server management.

    Usage:
        # Discover tools for a compute migration
        tools = MCPInventory.find_tools_for_action("CREATE_TARGET_ECS")
        # → [{"service": "ecs", "method": "POST", "path": "/v1/{project_id}/cloudservers", ...}]

        # Start only the needed MCP server
        MCPInventory.start_server("ecs")
        # → subprocess started, MCP server ready to receive calls

        # Call the MCP tool
        result = MCPInventory.call_tool("ecs", "POST", "/v1/{project_id}/cloudservers", params)
    """

    _cache: dict = {}  # path → parsed OpenAPI spec
    _running_servers: dict = {}  # service_name → process

    @classmethod
    def find_tools_for_action(cls, action: str) -> List[dict]:
        """Find MCP API endpoints that match a migration action.

        Returns list of matching endpoints with method, path, params.
        """
        mapping = ACTION_MAP.get(action)
        if not mapping:
            return []

        service = mapping["service"]
        method = mapping["method"]
        path_kw = mapping["path_kw"]

        spec = cls._load_service_spec(service)
        if not spec:
            return [{
                "service": f"mcp_server_{service}",
                "method": method,
                "path": None,
                "found": False,
                "note": f"MCP spec for {service} not loaded — using hcloud CLI fallback",
            }]

        # Search paths for matching endpoint
        matches = []
        for path, methods in spec.get("paths", {}).items():
            if path_kw in path:
                for m, detail in methods.items():
                    if m.upper() == method:
                        # Extract parameters
                        params = []
                        for p in detail.get("parameters", []):
                            params.append({
                                "name": p.get("name", ""),
                                "in": p.get("in", "path"),
                                "required": p.get("required", False),
                                "type": p.get("schema", {}).get("type", "string"),
                            })
                        matches.append({
                            "service": f"mcp_server_{service}",
                            "method": m.upper(),
                            "path": path,
                            "params": params,
                            "operation_id": detail.get("operationId", ""),
                            "summary": detail.get("summary", ""),
                            "found": True,
                        })

        if not matches:
            return [{
                "service": f"mcp_server_{service}",
                "method": method,
                "path": None,
                "found": False,
                "note": f"No matching endpoint for {action} in {service} spec",
            }]

        return matches

    @classmethod
    def find_tools_for_pillar(cls, pillar: str) -> List[dict]:
        """Find all MCP tools available for a migration pillar.

        Returns list of services + endpoint counts.
        """
        services = PILLAR_SERVICES.get(pillar, [])
        results = []
        for svc in services:
            spec = cls._load_service_spec(svc)
            if spec:
                path_count = len(spec.get("paths", {}))
                results.append({
                    "service": f"mcp_server_{svc}",
                    "endpoints": path_count,
                    "available": True,
                })
            else:
                results.append({
                    "service": f"mcp_server_{svc}",
                    "endpoints": 0,
                    "available": False,
                })
        return results

    @classmethod
    def get_services_for_plan(cls, plan: dict) -> List[str]:
        """Determine which MCP services are needed for an execution plan.

        Scans all steps in the plan and returns the unique set of
        MCP services that need to be started.
        """
        needed = set()
        for step in plan.get("steps", []):
            action = step.get("action", "")
            mapping = ACTION_MAP.get(action)
            if mapping:
                needed.add(mapping["service"])
            # Also check pillar
            pillar = step.get("pillar", "")
            if pillar in PILLAR_SERVICES:
                # Don't add ALL services for a pillar — only the one needed for the action
                pass
        return sorted(needed)

    # Port allocation for MCP servers (each service gets a unique port)
    _PORT_BASE = 8800
    _port_map: dict = {}  # service_name → port

    @classmethod
    def _get_port(cls, service_name: str) -> int:
        """Get or assign a port for an MCP service."""
        if service_name not in cls._port_map:
            # Hash the service name to a stable port in range 8800-8999
            port = cls._PORT_BASE + (hash(service_name) % 200)
            cls._port_map[service_name] = port
        return cls._port_map[service_name]

    @classmethod
    def start_server(cls, service_name: str, ak: str = None, sk: str = None) -> bool:
        """Start a single MCP server on-demand with HTTP transport.

        Credential resolution order:
          1. Explicitly passed ak/sk (per-customer)
          2. HermesConfig.mcp_default_ak/sk (ERP default)
          3. HUAWEI_ACCESS_KEY/HUAWEI_SECRET_KEY env vars

        Args:
            service_name: e.g. 'ecs', 'vpc', 'rds'
            ak: Huawei Cloud Access Key (optional)
            sk: Huawei Cloud Secret Key (optional)
        """
        if service_name in cls._running_servers:
            proc = cls._running_servers[service_name]
            if proc.poll() is None:  # still running
                return True

        server_dir = os.path.join(MCP_BASE, f"mcp_server_{service_name}")
        run_file = os.path.join(server_dir, "src", f"mcp_server_{service_name}", "run.py")
        if not os.path.exists(run_file):
            logger.warning(f"MCP server {service_name}: no run.py found at {run_file}")
            return False

        port = cls._get_port(service_name)

        # Credential resolution: explicit → HermesConfig → env vars
        if not ak or not sk:
            try:
                from models import HermesConfig
                hc = HermesConfig.get_config()
                ak = ak or hc.mcp_default_ak or os.environ.get("HUAWEI_ACCESS_KEY", "")
                sk = sk or hc.mcp_default_sk or os.environ.get("HUAWEI_SECRET_KEY", "")
            except Exception:
                ak = ak or os.environ.get("HUAWEI_ACCESS_KEY", "")
                sk = sk or os.environ.get("HUAWEI_SECRET_KEY", "")

        # Build environment with credentials
        env = os.environ.copy()
        if ak:
            env["HUAWEI_ACCESS_KEY"] = ak
        if sk:
            env["HUAWEI_SECRET_KEY"] = sk
        # Set PYTHONPATH so run.py can import from assets/utils
        # assets/ is at the MCP repo root (parent of huaweicloud_services_server/)
        mcp_repo_root = os.path.dirname(MCP_BASE)  # .../iaas-mcp-server-main/
        assets_dir = os.path.join(mcp_repo_root, "assets")
        src_dir = os.path.join(server_dir, "src")
        env["PYTHONPATH"] = f"{assets_dir}:{src_dir}:{env.get('PYTHONPATH', '')}"

        try:
            # Start with HTTP transport on the assigned port
            # The run.py accepts -t (transport) and -p (port) args
            proc = subprocess.Popen(
                ["python3", run_file, "-t", "http", "-p", str(port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=server_dir,
                env=env,
            )
            cls._running_servers[service_name] = proc

            # Wait briefly for startup
            import time
            time.sleep(2)

            if proc.poll() is not None:
                # Process exited immediately — read stderr
                stderr = proc.stderr.read().decode()[:500]
                logger.error(f"MCP server {service_name} exited immediately: {stderr}")
                return False

            logger.info(f"MCP server {service_name} started on port {port} (PID: {proc.pid})")
            return True
        except Exception as e:
            logger.error(f"Failed to start MCP server {service_name}: {e}")
            return False

    @classmethod
    def start_servers_for_plan(cls, plan: dict) -> dict:
        """Start all MCP servers needed for a plan (on-demand)."""
        needed = cls.get_services_for_plan(plan)
        results = {}
        for svc in needed:
            results[svc] = cls.start_server(svc)
        return results

    @classmethod
    def stop_server(cls, service_name: str):
        """Stop a running MCP server."""
        if service_name in cls._running_servers:
            proc = cls._running_servers[service_name]
            proc.terminate()
            proc.wait(timeout=5)
            del cls._running_servers[service_name]
            logger.info(f"MCP server {service_name} stopped")

    @classmethod
    def stop_all(cls):
        """Stop all running MCP servers."""
        for svc in list(cls._running_servers.keys()):
            cls.stop_server(svc)

    @classmethod
    def call_tool(cls, service_name: str, method: str, path: str,
                  params: dict = None, credentials: dict = None) -> dict:
        """Call an MCP tool (API endpoint) via the MCP HTTP protocol.

        Starts the MCP server on-demand if not running, then sends a
        JSON-RPC tools/call request to the server's /mcp endpoint.

        Args:
            service_name: e.g. 'ecs', 'vpc', 'rds'
            method: HTTP method (GET, POST, PUT, DELETE) — used for logging
            path: API path from the OpenAPI spec (e.g. '/v1/{project_id}/cloudservers')
            params: dict of parameters to pass to the tool
            credentials: dict with 'ak' and 'sk' keys

        Returns:
            dict with 'success', 'data', 'fallback' fields
        """
        import urllib.request
        import urllib.error

        # Start server if not running
        ak = (credentials or {}).get("ak") if isinstance(credentials, dict) else None
        sk = (credentials or {}).get("sk") if isinstance(credentials, dict) else None
        if service_name not in cls._running_servers:
            started = cls.start_server(service_name, ak=ak, sk=sk)
            if not started:
                logger.warning(f"MCP server {service_name} unavailable — falling back to hcloud CLI")
                return {
                    "success": False,
                    "fallback": "hcloud",
                    "message": f"MCP server {service_name} could not start — use hcloud CLI",
                }

        port = cls._get_port(service_name)
        url = f"http://localhost:{port}/mcp"

        # MCP protocol: JSON-RPC 2.0 tools/call
        # The tool name is the operationId from the OpenAPI spec
        # We need to find the operationId for this path+method
        spec = cls._load_service_spec(service_name)
        if not spec or not isinstance(spec, dict):
            return {
                "success": False,
                "fallback": "hcloud",
                "message": f"MCP spec not found for {service_name} — use hcloud CLI",
            }
        tool_name = None
        if spec:
            for spec_path, methods in spec.get("paths", {}).items():
                if path and path in spec_path:
                    for m, detail in methods.items():
                        if m.upper() == method.upper():
                            tool_name = detail.get("operationId", "")
                            break
                    if tool_name:
                        break
            # If no operationId found, try matching by path keyword
            if not tool_name and path:
                for spec_path, methods in spec.get("paths", {}).items():
                    for m, detail in methods.items():
                        if m.upper() == method.upper():
                            # Check if the spec path contains a keyword from our path
                            if any(kw in spec_path for kw in path.split("/")[1:3] if kw):
                                tool_name = detail.get("operationId", "")
                                break
                    if tool_name:
                        break

        if not tool_name:
            logger.warning(f"No MCP tool found for {service_name} {method} {path}")
            return {
                "success": False,
                "fallback": "hcloud",
                "message": f"No MCP tool match for {method} {path} — use hcloud CLI",
            }

        # Build MCP tools/call request (JSON-RPC 2.0)
        rpc_payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": params or {},
            },
        }

        try:
            req_data = json.dumps(rpc_payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))

            if "error" in resp_data:
                logger.error(f"MCP call error for {tool_name}: {resp_data['error']}")
                return {
                    "success": False,
                    "fallback": "hcloud",
                    "message": f"MCP tool {tool_name} returned error: {resp_data['error']}",
                    "tool_name": tool_name,
                }

            # Extract result content
            result = resp_data.get("result", {})
            content = result.get("content", [])
            if content and isinstance(content, list):
                text = content[0].get("text", "") if isinstance(content[0], dict) else str(content[0])
                try:
                    parsed = json.loads(text)
                    return {"success": True, "data": parsed, "tool_name": tool_name, "source": "mcp"}
                except json.JSONDecodeError:
                    return {"success": True, "data": {"raw": text}, "tool_name": tool_name, "source": "mcp"}

            return {"success": True, "data": result, "tool_name": tool_name, "source": "mcp"}

        except urllib.error.URLError as e:
            logger.error(f"MCP HTTP call failed for {service_name}: {e}")
            return {
                "success": False,
                "fallback": "hcloud",
                "message": f"MCP server {service_name} not reachable on port {port}: {e}",
            }
        except Exception as e:
            logger.error(f"MCP call_tool unexpected error: {e}")
            return {
                "success": False,
                "fallback": "hcloud",
                "message": f"MCP call failed: {e}",
            }

    @classmethod
    def _load_service_spec(cls, service: str) -> Optional[dict]:
        """Load and cache the OpenAPI spec for a service."""
        cache_key = service
        if cache_key in cls._cache:
            return cls._cache[cache_key]

        config_dir = os.path.join(MCP_BASE, f"mcp_server_{service}", "src", f"mcp_server_{service}", "config")
        json_files = glob.glob(os.path.join(config_dir, "*.json"))
        for jf in json_files:
            try:
                with open(jf) as f:
                    spec = json.load(f)
                    if "paths" in spec:
                        cls._cache[cache_key] = spec
                        return spec
            except Exception:
                pass
        return None

    @classmethod
    def get_inventory_summary(cls) -> dict:
        """Get summary of all MCP services and their tool counts."""
        services = []
        total_endpoints = 0
        for pillar, svc_list in PILLAR_SERVICES.items():
            for svc in svc_list:
                spec = cls._load_service_spec(svc)
                count = len(spec.get("paths", {})) if spec else 0
                total_endpoints += count
                services.append({
                    "service": svc,
                    "pillar": pillar,
                    "endpoints": count,
                    "running": svc in cls._running_servers,
                    "available": spec is not None,
                })
        return {
            "total_services": len(services),
            "total_endpoints": total_endpoints,
            "running": len(cls._running_servers),
            "services": services,
        }
