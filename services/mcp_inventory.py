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
MCP_BASE = "/home/huawei-cloud/iaas-mcp-server/huaweicloud_services_server"

# Pillar → MCP service mapping (which services handle which migration pillar)
PILLAR_SERVICES = {
    "compute": ["ecs", "ims", "as", "bms", "image"],
    "database": ["rds", "dds", "dcs", "drs", "gaussdb", "gaussdbfornosql", "gaussdbforopengauss", "ddm", "dws"],
    "storage": ["obs", "evs", "sfs", "sfsturbo", "oms", "cdm", "cbr"],
    "network": ["vpc", "eip", "elb", "nat", "vpn", "vpcep", "dns", "cfw"],
    "security": ["hss", "iam", "eps", "kms", "waf"],
    "monitoring": ["ces", "aom", "cts", "lts", "rms"],
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

    @classmethod
    def start_server(cls, service_name: str) -> bool:
        """Start a single MCP server on-demand.

        Only starts if not already running.
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

        try:
            proc = subprocess.Popen(
                ["python3", run_file],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=server_dir,
            )
            cls._running_servers[service_name] = proc
            logger.info(f"MCP server {service_name} started (PID: {proc.pid})")
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
        """Call an MCP tool (API endpoint) with real credentials.

        Falls back to hcloud CLI if MCP server is not running.
        """
        # Try MCP server first
        if service_name not in cls._running_servers:
            started = cls.start_server(service_name)
            if not started:
                # Fallback: use hcloud CLI
                return {
                    "success": False,
                    "fallback": "hcloud",
                    "message": f"MCP server {service_name} not available — use hcloud CLI",
                }

        # In a full implementation, this would call the MCP server's HTTP/stdio API
        # For now, fall back to hcloud CLI (proven working)
        return {
            "success": False,
            "fallback": "hcloud",
            "message": f"MCP call not yet implemented for {service_name} — use hcloud CLI",
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
