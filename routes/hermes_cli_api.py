"""
Hermes CLI API - Full Unrestricted Engine Room Endpoint

This module establishes a local loopback Inter-Process Communication (IPC) link to the 
high-privilege background Hermes daemon, granting the Web UI un-sandboxed terminal 
access, file system control, and direct database execution capabilities.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import json
import logging
import socket
import subprocess
import os
import sys
import requests as http_requests
from datetime import datetime
from models import db, Customer, ProjectData, HuaweiAccount, MigrationTask, WBSTask, User, CognitiveLearningLog, QuotationVersion, ExecutionState, AdHocMigrationLog, GlobalPlaybooks, HermesConfig

logger = logging.getLogger(__name__)
hermes_cli_bp = Blueprint('hermes_cli_api', __name__)

def _get_hc():
    """Shorthand to get the singleton HermesConfig."""
    return HermesConfig.get_config()

def execute_privileged_engine_command(query, project_id="global"):
    """
    Communicates with the background root daemon or falls back to direct binary execution
    using the configured HermesConfig settings.
    """
    hc = _get_hc()
    
    try:
        # Attempt connection to the persistent high-privilege daemon layer
        client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client_socket.settimeout(15)
        client_socket.connect(("127.0.0.1", 5005))
        
        payload = {
            "query": query,
            "projectId": project_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        client_socket.sendall(json.dumps(payload).encode('utf-8') + b"\n")
        
        response_data = b""
        while True:
            chunk = client_socket.recv(4096)
            if not chunk:
                break
            response_data += chunk
            
        client_socket.close()
        
        # Safely parse the daemon's un-sandboxed response
        parsed_response = json.loads(response_data.decode('utf-8'))
        return parsed_response.get("response", str(parsed_response))
        
    except Exception as daemon_err:
        logger.warning(f"Local daemon socket unreachable ({str(daemon_err)}). Falling back to direct elevated binary fork.")
        
        # Fallback: use the configured CLI binary with configured global model
        binary = hc.hermes_binary_path or 'hermes'
        model = hc.global_model or 'deepseek-v4-pro'
        provider = hc.global_provider or 'deepseek'
        
        cmd = [
            binary,
            'chat',
            '-q', query,
            '--model', model,
            '--provider', provider,
            '--quiet'
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                return f"Kernel Terminal Error:\n{result.stderr.strip()}"
        except subprocess.TimeoutExpired:
            return "Kernel Terminal Error: The execution process timed out after 120 seconds."
        except Exception as fallback_err:
            return f"Kernel Terminal Error: Failed to execute underlying binary - {str(fallback_err)}"

@hermes_cli_bp.route('/api/hermes-cli/query', methods=['POST'])
# @jwt_required()
def hermes_cli_query():
    """
    Main endpoint for Web UI queries. All hardcoded keyword blocks have been purged.
    100% of prompts flow straight to the real AI logic and system tools.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400
            
        query = data.get('query', '').strip()
        project_id = data.get('projectId', 'global')
        
        if not query:
            return jsonify({'success': False, 'error': 'Query expression required'}), 400
            
        logger.info(f"Forwarding raw natural language instruction to Hermes Core: {query[:100]}...")
        
        # Direct un-hindered execution via the privileged daemon bridge
        response_text = execute_privileged_engine_command(query, project_id)
        
        return jsonify({
            'success': True,
            'response': response_text,
            'projectId': project_id,
            'source': 'hermes-core-daemon'
        })
        
    except Exception as e:
        logger.error(f"Hermes Engine Room Endpoint Error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False, 
            'error': f"Internal Core Error: {str(e)}"
        }), 500

@hermes_cli_bp.route('/api/hermes-cli/system-info', methods=['GET'])
def system_info():
    """Get comprehensive system information (Preserved for Web UI Dashboards)"""
    try:
        db_counts = {
            'customers': Customer.query.count(),
            'projects': ProjectData.query.count(),
            'huawei_accounts': HuaweiAccount.query.count(),
            'migration_tasks': MigrationTask.query.count()
        }
        
        return jsonify({
            'success': True,
            'system': 'Huawei Cloud ERP with Hermes Daemon Bridge',
            'status': {
                'flask_app': 'running',
                'hermes_daemon_bridge': 'active',
                'total_records': sum(db_counts.values())
            },
            'database_counts': db_counts,
            'capabilities': {
                'unrestricted_execution': True,
                'daemon_ipc_socket': True
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@hermes_cli_bp.route('/api/hermes-cli/delegate-task', methods=['POST'])
# @jwt_required()
def hermes_delegate_task():
    """
    Agentic Orchestration endpoint: spawns a Hermes agent with the configured
    execution profile to autonomously handle a migration workload.
    
    Reads from HermesConfig for mode (cli/http), model selection, and connection params.
    Supports per-call model/profile overrides from the frontend.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400
            
        goal = data.get('goal', '').strip()
        context = data.get('context', '')
        profile = data.get('profile', 'exec')
        model_override = data.get('model')
        provider_override = data.get('provider')
        
        if not goal:
            return jsonify({'success': False, 'error': 'Task goal required'}), 400
            
        # Build a self-contained prompt for the subagent
        full_prompt = goal
        if context:
            full_prompt = f"{goal}\n\nContext:\n{context}"
            
        logger.info(f"Spawning Hermes agent via profile '{profile}' for goal: {goal[:100]}...")
        
        hc = _get_hc()
        
        # ── HTTP / Loadbalancer mode ──
        if hc.mode == 'http':
            lb_url = hc.lb_url or 'http://localhost:8666/v1/chat/completions'
            lb_auth = hc.lb_auth or ''
            delegation_model = model_override or hc.delegation_model or hc.global_model or 'deepseek-v4-pro'
            
            headers = {
                'Content-Type': 'application/json'
            }
            if lb_auth:
                headers['Authorization'] = lb_auth
            
            llm_payload = {
                'model': delegation_model,
                'messages': [
                    {'role': 'system', 'content': f'You are a migration execution agent running under Hermes profile {profile}. Complete the assigned task using available tools.'},
                    {'role': 'user', 'content': full_prompt}
                ],
                'temperature': 0.1,
                'stream': False
            }
            
            try:
                resp = http_requests.post(lb_url, headers=headers, json=llm_payload, timeout=180)
                if resp.status_code == 200:
                    body = resp.json()
                    content = body.get('choices', [{}])[0].get('message', {}).get('content', str(body))
                    return jsonify({
                        'success': True,
                        'response': content,
                        'profile': profile,
                        'mode': 'http',
                        'goal': goal[:200]
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': f'Loadbalancer returned HTTP {resp.status_code}: {resp.text[:300]}'
                    }), 500
            except Exception as http_err:
                return jsonify({
                    'success': False,
                    'error': f'Loadbalancer connection failed: {str(http_err)}'
                }), 500
        
        # ── CLI mode (default) ──
        binary = hc.hermes_binary_path or 'hermes'
        cmd = [binary, 'chat', '-q', full_prompt, '--profile', profile, '--quiet']
        
        if model_override:
            cmd.extend(['--model', model_override])
        if provider_override:
            cmd.extend(['--provider', provider_override])
            
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180
        )
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'response': result.stdout.strip(),
                'profile': profile,
                'mode': 'cli',
                'goal': goal[:200]
            })
        else:
            return jsonify({
                'success': False,
                'error': f"Hermes execution failed: {result.stderr.strip()}"
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Task timed out after 180 seconds. Consider splitting into smaller workloads.'
        }), 504
    except Exception as e:
        logger.error(f"Delegate Task Error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f"Orchestration error: {str(e)}"
        }), 500

@hermes_cli_bp.route('/api/hermes-cli/health', methods=['GET'])
def health():
    """Health check endpoint"""
    hc = _get_hc()
    mode = hc.mode if hc else 'cli'
    return jsonify({
        'status': 'healthy',
        'service': 'Hermes CLI API Bridge',
        'timestamp': datetime.utcnow().isoformat(),
        'mode': mode,
        'capabilities': {
            'model': f'{hc.global_provider}/{hc.global_model}' if hc else 'unconfigured',
            'delegation': f'{hc.delegation_provider}/{hc.delegation_model}' if hc else 'unconfigured'
        }
    })

# ── Hermes Configuration Management ──

@hermes_cli_bp.route('/api/hermes-config', methods=['GET'])
def get_hermes_config():
    """Get the current Hermes AI configuration."""
    try:
        hc = _get_hc()
        return jsonify({
            'success': True,
            'config': hc.to_dict(),
            'updated_at': hc.updated_at.isoformat() if hc.updated_at else None
        })
    except Exception as e:
        logger.error(f"Error reading Hermes config: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@hermes_cli_bp.route('/api/hermes-config', methods=['PUT'])
def update_hermes_config():
    """Update the Hermes AI configuration."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400
        
        hc = _get_hc()
        allowed_fields = [
            'mode', 'hermes_binary_path', 'lb_url', 'lb_auth',
            'global_provider', 'global_model',
            'delegation_provider', 'delegation_model'
        ]
        
        for field in allowed_fields:
            if field in data:
                setattr(hc, field, data[field])
        
        hc.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Hermes config updated: mode={hc.mode}, global={hc.global_provider}/{hc.global_model}, delegation={hc.delegation_provider}/{hc.delegation_model}")
        
        return jsonify({
            'success': True,
            'config': hc.to_dict(),
            'message': 'Configuration saved. Restart may be required for all changes to take effect.'
        })
    except Exception as e:
        logger.error(f"Error updating Hermes config: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
