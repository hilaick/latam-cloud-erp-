"""
MCP Server management routes for the ERP.
Provides endpoints to list, sync, start, stop, and call MCP servers.

MCP servers run locally on ports 8800-8999 (one per Huawei Cloud service).
Credentials flow:
  1. ERP default AK/SK → stored in HermesConfig → used for inventory/system ops
  2. Per-customer AK/SK → from Customer model → override default during execution
"""
import os
import subprocess
import json
import logging
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)
mcp_bp = Blueprint('mcp', __name__, url_prefix='/api/mcp')

# MCP server base path — matches mcp_inventory.py
MCP_BASE_PATH = '/tmp/mcp-update/iaas-mcp-server-main/huaweicloud_services_server'
MCP_REPO_URL = 'https://github.com/huaweicloud-samples/iaas-mcp-server'


def _get_mcp_dirs():
    """List MCP server directories (only those with run.py)."""
    dirs = []
    if not os.path.exists(MCP_BASE_PATH):
        return dirs
    for entry in sorted(os.listdir(MCP_BASE_PATH)):
        if not entry.startswith('mcp_server_'):
            continue
        full = os.path.join(MCP_BASE_PATH, entry)
        if not os.path.isdir(full):
            continue
        # Extract service name from mcp_server_<service>
        service_name = entry.replace('mcp_server_', '')
        run_file = os.path.join(full, 'src', entry, 'run.py')
        has_run = os.path.exists(run_file)
        dirs.append({
            'name': entry,
            'service': service_name,
            'path': full,
            'has_run_py': has_run,
        })
    return dirs


def _is_server_running(name):
    """Check if an MCP server process is running."""
    try:
        from services.mcp_inventory import MCPInventory
        service = name.replace('mcp_server_', '') if name.startswith('mcp_server_') else name
        return service in MCPInventory._running_servers and \
               MCPInventory._running_servers[service].poll() is None
    except Exception:
        return False


def _get_default_credentials():
    """Get ERP-level default credentials from HermesConfig."""
    try:
        from models import HermesConfig
        hc = HermesConfig.get_config()
        return {
            'ak': hc.mcp_default_ak or os.environ.get('HUAWEI_ACCESS_KEY', ''),
            'sk': hc.mcp_default_sk or os.environ.get('HUAWEI_SECRET_KEY', ''),
        }
    except Exception as e:
        logger.warning(f"Failed to get default credentials: {e}")
        return {'ak': '', 'sk': ''}


@mcp_bp.route('/servers', methods=['GET'])
def list_servers():
    """List all MCP servers with their status and tool counts."""
    from services.mcp_inventory import MCPInventory, PILLAR_SERVICES
    dirs = _get_mcp_dirs()
    servers = []
    for d in dirs:
        svc = d['service']
        # Load OpenAPI spec to count endpoints
        spec = MCPInventory._load_service_spec(svc)
        endpoint_count = len(spec.get('paths', {})) if spec else 0
        # Determine pillar
        pillar = None
        for p, svcs in PILLAR_SERVICES.items():
            if svc in svcs:
                pillar = p
                break
        servers.append({
            'name': d['name'],
            'service': svc,
            'running': _is_server_running(d['name']),
            'has_run_py': d['has_run_py'],
            'endpoints': endpoint_count,
            'pillar': pillar,
            'available': spec is not None,
        })
    return jsonify({
        'success': True,
        'servers': servers,
        'total': len(servers),
        'base_path': MCP_BASE_PATH,
    })


@mcp_bp.route('/inventory', methods=['GET'])
def inventory_summary():
    """Get MCP inventory summary — total services, endpoints, running count."""
    from services.mcp_inventory import MCPInventory
    summary = MCPInventory.get_inventory_summary()
    return jsonify({'success': True, **summary})


@mcp_bp.route('/sync', methods=['POST'])
def sync_from_github():
    """Git pull the latest from the MCP server repository."""
    try:
        repo_root = '/tmp/mcp-update/iaas-mcp-server-main'
        if not os.path.exists(repo_root):
            return jsonify({'success': False, 'error': f'MCP repo not found at {repo_root}'}), 404

        result = subprocess.run(
            ['git', 'pull', 'origin', 'main'],
            cwd=repo_root,
            capture_output=True, text=True, timeout=60
        )
        log_result = subprocess.run(
            ['git', 'log', '--oneline', '-3'],
            cwd=repo_root,
            capture_output=True, text=True, timeout=10
        )
        return jsonify({
            'success': True,
            'output': result.stdout,
            'error': result.stderr if result.returncode != 0 else None,
            'latest_commits': log_result.stdout.strip().split('\n'),
        })
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Git pull timed out'}), 504
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@mcp_bp.route('/servers/<service>/start', methods=['POST'])
def start_server(service):
    """Start a specific MCP server with HTTP transport.

    Uses ERP default credentials from HermesConfig unless 'ak'/'sk' provided in body.
    """
    from services.mcp_inventory import MCPInventory

    data = request.get_json(silent=True) or {}
    ak = data.get('ak')
    sk = data.get('sk')

    # Fall back to ERP default credentials
    if not ak or not sk:
        defaults = _get_default_credentials()
        ak = ak or defaults['ak']
        sk = sk or defaults['sk']

    started = MCPInventory.start_server(service, ak=ak, sk=sk)
    port = MCPInventory._get_port(service)
    return jsonify({
        'success': started,
        'service': service,
        'running': started,
        'port': port,
        'message': f'MCP server {service} started on port {port}' if started
                   else f'Failed to start MCP server {service}',
    })


@mcp_bp.route('/servers/<service>/stop', methods=['POST'])
def stop_server(service):
    """Stop a running MCP server."""
    from services.mcp_inventory import MCPInventory
    MCPInventory.stop_server(service)
    return jsonify({
        'success': True,
        'service': service,
        'running': False,
    })


@mcp_bp.route('/servers/<service>/status', methods=['GET'])
def server_status(service):
    """Get detailed status of a specific MCP server."""
    running = _is_server_running(service)
    from services.mcp_inventory import MCPInventory
    port = MCPInventory._get_port(service) if running else None
    return jsonify({
        'service': service,
        'running': running,
        'port': port,
    })


@mcp_bp.route('/servers/<service>/tools', methods=['GET'])
def list_tools(service):
    """List available MCP tools (from OpenAPI spec) for a specific server."""
    from services.mcp_inventory import MCPInventory
    spec = MCPInventory._load_service_spec(service)
    if not spec:
        return jsonify({'success': False, 'error': f'No OpenAPI spec found for {service}'}), 404

    tools = []
    for path, methods in spec.get('paths', {}).items():
        for method, detail in methods.items():
            if method.upper() in ('GET', 'POST', 'PUT', 'DELETE', 'PATCH'):
                tools.append({
                    'operation_id': detail.get('operationId', ''),
                    'method': method.upper(),
                    'path': path,
                    'summary': detail.get('summary', ''),
                })

    return jsonify({
        'success': True,
        'service': service,
        'tools': sorted(tools, key=lambda t: t['operation_id']),
        'total': len(tools),
    })


@mcp_bp.route('/servers/<service>/call', methods=['POST'])
def call_tool(service):
    """Call an MCP tool on a specific server.

    Body:
    {
        "method": "POST",           // HTTP method from OpenAPI spec
        "path": "/v1/{project_id}/cloudservers",  // API path
        "params": {...},             // Arguments for the tool
        "ak": "optional",            // Override credentials (per-customer)
        "sk": "optional"
    }

    Falls back to hcloud CLI if MCP server unavailable.
    """
    from services.mcp_inventory import MCPInventory

    data = request.get_json(silent=True) or {}
    method = data.get('method', 'GET')
    path = data.get('path', '')
    params = data.get('params', {})
    ak = data.get('ak')
    sk = data.get('sk')

    # Fall back to ERP default credentials
    if not ak or not sk:
        defaults = _get_default_credentials()
        ak = ak or defaults['ak']
        sk = sk or defaults['sk']

    result = MCPInventory.call_tool(
        service_name=service,
        method=method,
        path=path,
        params=params,
        credentials={'ak': ak, 'sk': sk} if ak and sk else None,
    )
    return jsonify({
        'success': result.get('success', False),
        'data': result.get('data'),
        'tool_name': result.get('tool_name'),
        'source': result.get('source', 'mcp'),
        'fallback': result.get('fallback'),
        'message': result.get('message', ''),
    })


@mcp_bp.route('/credentials', methods=['GET', 'PUT'])
def mcp_credentials():
    """Get or update ERP-level default MCP credentials (stored in HermesConfig)."""
    from models import HermesConfig, db

    if request.method == 'GET':
        creds = _get_default_credentials()
        # Mask SK for security
        return jsonify({
            'success': True,
            'ak': creds['ak'],
            'sk_configured': bool(creds['sk']),
            'sk_masked': (creds['sk'][:4] + '****') if creds['sk'] else '',
        })

    elif request.method == 'PUT':
        try:
            data = request.get_json(silent=True) or {}
            hc = HermesConfig.get_config()
            if 'ak' in data:
                hc.mcp_default_ak = data['ak']
            if 'sk' in data:
                hc.mcp_default_sk = data['sk']
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'MCP default credentials updated',
                'ak': hc.mcp_default_ak,
                'sk_configured': bool(hc.mcp_default_sk),
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
