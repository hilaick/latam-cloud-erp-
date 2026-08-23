"""
MCP Server management routes for the ERP.
Provides endpoints to list, sync, start, and stop MCP servers.
"""
import os
import subprocess
import json
from flask import Blueprint, jsonify, request

mcp_bp = Blueprint('mcp', __name__, url_prefix='/api/mcp')

MCP_BASE_PATH = '/home/huawei-cloud/iaas-mcp-server'
MCP_REPO_URL = 'https://github.com/huaweicloud-samples/iaas-mcp-server'


def _get_mcp_dirs():
    """List MCP server directories."""
    dirs = []
    if not os.path.exists(MCP_BASE_PATH):
        return dirs
    for entry in sorted(os.listdir(MCP_BASE_PATH)):
        full = os.path.join(MCP_BASE_PATH, entry)
        if os.path.isdir(full) and not entry.startswith('.') and entry != '__pycache__':
            # Check if it has a pyproject.toml or setup.py or run.py
            has_entry = any(
                os.path.exists(os.path.join(full, f))
                for f in ['pyproject.toml', 'setup.py', 'run.py', 'main.py', '__init__.py']
            )
            dirs.append({
                'name': entry,
                'path': full,
                'has_entry_point': has_entry,
            })
    return dirs


def _is_server_running(name):
    """Check if an MCP server process is running."""
    try:
        result = subprocess.run(
            ['pgrep', '-af', f'iaas-mcp-server.*{name}'],
            capture_output=True, text=True, timeout=5
        )
        return bool(result.stdout.strip())
    except Exception:
        return False


@mcp_bp.route('/servers', methods=['GET'])
def list_servers():
    """List all MCP servers with their status."""
    dirs = _get_mcp_dirs()
    servers = []
    for d in dirs:
        # Count Python files as a rough measure of available tools
        py_count = 0
        for root, _dirs, files in os.walk(d['path']):
            py_count += sum(1 for f in files if f.endswith('.py'))
        servers.append({
            'name': d['name'],
            'running': _is_server_running(d['name']),
            'has_entry_point': d['has_entry_point'],
            'python_files': py_count,
            'path': d['path'],
        })
    return jsonify({
        'success': True,
        'servers': servers,
        'total': len(servers),
        'base_path': MCP_BASE_PATH,
    })


@mcp_bp.route('/sync', methods=['POST'])
def sync_from_github():
    """Git pull the latest from the MCP server repository."""
    try:
        if not os.path.exists(MCP_BASE_PATH):
            return jsonify({'success': False, 'error': f'MCP server directory not found at {MCP_BASE_PATH}'}), 404

        result = subprocess.run(
            ['git', 'pull', 'origin', 'main'],
            cwd=MCP_BASE_PATH,
            capture_output=True, text=True, timeout=60
        )
        # Get latest commit
        log_result = subprocess.run(
            ['git', 'log', '--oneline', '-3'],
            cwd=MCP_BASE_PATH,
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


@mcp_bp.route('/servers/<name>/status', methods=['GET'])
def server_status(name):
    """Get detailed status of a specific MCP server."""
    running = _is_server_running(name)
    return jsonify({
        'name': name,
        'running': running,
    })


@mcp_bp.route('/servers/<name>/tools', methods=['GET'])
def list_tools(name):
    """List available tools (Python modules) in a specific MCP server."""
    server_path = os.path.join(MCP_BASE_PATH, name)
    if not os.path.exists(server_path):
        return jsonify({'success': False, 'error': 'Server not found'}), 404

    tools = []
    for root, dirs, files in os.walk(server_path):
        for f in files:
            if f.endswith('.py') and f not in ['__init__.py', 'setup.py', 'conftest.py']:
                rel_path = os.path.relpath(os.path.join(root, f), server_path)
                tools.append(rel_path)

    return jsonify({
        'success': True,
        'name': name,
        'tools': sorted(tools)[:50],  # Limit to 50
        'total': len(tools),
    })
