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
from models import db, Customer, ProjectData, HuaweiAccount, MigrationTask, WBSTask, User, CognitiveLearningLog, QuotationVersion, ExecutionState, ExecutionLog, AdHocMigrationLog, GlobalPlaybooks, HermesConfig

logger = logging.getLogger(__name__)
hermes_cli_bp = Blueprint('hermes_cli_api', __name__)

def _get_hc():
    """Shorthand to get the singleton HermesConfig."""
    return HermesConfig.get_config()

def _update_delegate_task_status(project_id, task_index, status, error=None):
    """Update a delegate task's status in the project record."""
    if not project_id:
        return
    try:
        project = ProjectData.query.get(project_id)
        if not project:
            return
        tasks = json.loads(project.delegate_tasks or '[]')
        if task_index < len(tasks):
            tasks[task_index]['status'] = status
            tasks[task_index]['completed_at'] = datetime.utcnow().isoformat()
            if error:
                tasks[task_index]['error'] = str(error)[:500]
            project.delegate_tasks = json.dumps(tasks)
            db.session.commit()
            logger.info(f"Delegate task #{task_index} for project {project_id} → {status}")
            
            # 🚨 Fix #7: Auto-log to structured execution_logs table
            task = tasks[task_index]
            state = ExecutionState.query.filter_by(project_id=project_id).first()
            if state:
                log_entry = ExecutionLog(
                    execution_state_id=state.id,
                    project_id=project_id,
                    phase=task.get('phase', ''),
                    event_type='SUCCESS' if status == 'COMPLETED' else 'ERROR',
                    message=f"Phase {task.get('phase', '?')}: {task.get('goal', '')[:200]}",
                    agent_name='Hermes Delegate',
                    metadata_json=json.dumps({'task_id': task.get('id'), 'goal': task.get('goal', '')[:100]})
                )
                db.session.add(log_entry)
                db.session.commit()
    except Exception as e:
        logger.error(f"Failed to update delegate task status: {e}")

def execute_privileged_engine_command(query, project_id="global"):
    """
    Communicates with the background root daemon or falls back to direct binary execution
    using the configured HermesConfig settings.
    
    Tier 1 (primary):   socket → 127.0.0.1:5005  (no DB dependency)
    Tier 2 (fallback):  subprocess → hermes chat  (reads HermesConfig from Postgres)
    """
    try:
        # ── Tier 1: persistent high-privilege daemon layer ──
        # No database dependency — daemon is self-contained
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
        
        # ── Tier 2: fallback — read config from Postgres, spawn subprocess ──
        # HermesConfig is a singleton row in the Postgres database
        hc = HermesConfig.get_config()
        
        binary = hc.hermes_binary_path if hc and hc.hermes_binary_path else 'hermes'
        model = hc.global_model if hc else 'deepseek-v4-pro'
        provider = hc.global_provider if hc else 'deepseek'
        
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
@jwt_required()
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
@jwt_required()
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
@jwt_required()
def hermes_delegate_task():
    """
    Agentic Orchestration endpoint: spawns a Hermes agent with the configured
    execution profile to autonomously handle a migration workload.
    
    Reads from HermesConfig for mode (cli/http), model selection, and connection params.
    Supports per-call model/profile overrides from the frontend.
    
    Auto-creates delegate task records in the project for CommandCenter telemetry.
    """
    # Track these for status updates at exit
    project_id = None
    task_index = None
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400
            
        goal = data.get('goal', '').strip()
        context = data.get('context', '')
        profile = data.get('profile', 'exec')
        model_override = data.get('model')
        provider_override = data.get('provider')
        project_id = data.get('project_id', '').strip()
        
        if not goal:
            return jsonify({'success': False, 'error': 'Task goal required'}), 400
        
        hc = _get_hc()
        
        # ── Create delegate task record ──
        task_record = {
            'goal': goal[:200],
            'phase': 'PHASE_4_0',
            'status': 'RUNNING',
            'profile': profile,
            'model': model_override or hc.delegation_model or 'exec',
            'started_at': datetime.utcnow().isoformat(),
            'error': None
        }
        # Infer phase from goal text
        import re
        phase_match = re.search(r'Phase (\d+(?:\.\d+)?)', goal)
        if phase_match:
            task_record['phase'] = f'PHASE_4_{phase_match.group(1).replace(".", "_")}'
        
        if project_id:
            project = ProjectData.query.get(project_id)
            if project:
                try:
                    existing = json.loads(project.delegate_tasks or '[]')
                except (json.JSONDecodeError, TypeError):
                    existing = []
                existing.append(task_record)
                project.delegate_tasks = json.dumps(existing)
                db.session.commit()
                task_index = len(existing) - 1
                logger.info(f"Created delegate task #{task_index} for project {project_id}: {goal[:80]}")
        
        # Build a self-contained prompt for the subagent
        full_prompt = goal
        if context:
            full_prompt = f"{goal}\n\nContext:\n{context}"
            
        logger.info(f"Spawning Hermes agent via profile '{profile}' for goal: {goal[:100]}...")
        
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
                    _update_delegate_task_status(project_id, task_index, 'COMPLETED')
                    return jsonify({
                        'success': True,
                        'response': content,
                        'profile': profile,
                        'mode': 'http',
                        'goal': goal[:200]
                    })
                else:
                    err_msg = f'Loadbalancer returned HTTP {resp.status_code}: {resp.text[:300]}'
                    _update_delegate_task_status(project_id, task_index, 'FAILED', err_msg)
                    return jsonify({
                        'success': False,
                        'error': err_msg
                    }), 500
            except Exception as http_err:
                err_msg = f'Loadbalancer connection failed: {str(http_err)}'
                _update_delegate_task_status(project_id, task_index, 'FAILED', err_msg)
                return jsonify({
                    'success': False,
                    'error': err_msg
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
            _update_delegate_task_status(project_id, task_index, 'COMPLETED')
            return jsonify({
                'success': True,
                'response': result.stdout.strip(),
                'profile': profile,
                'mode': 'cli',
                'goal': goal[:200]
            })
        else:
            err_msg = f"Hermes execution failed: {result.stderr.strip()}"
            _update_delegate_task_status(project_id, task_index, 'FAILED', err_msg)
            return jsonify({
                'success': False,
                'error': err_msg
            }), 500
            
    except subprocess.TimeoutExpired:
        err_msg = 'Task timed out after 180 seconds. Consider splitting into smaller workloads.'
        _update_delegate_task_status(project_id, task_index, 'FAILED', err_msg)
        return jsonify({
            'success': False,
            'error': err_msg
        }), 504
    except Exception as e:
        logger.error(f"Delegate Task Error: {str(e)}", exc_info=True)
        _update_delegate_task_status(project_id, task_index, 'FAILED', str(e))
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
@jwt_required()
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
@jwt_required()
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

# ══════════════════════════════════════════════════════════════
# Internal Deploy Endpoint (browser-accessible self-update)
# ══════════════════════════════════════════════════════════════
import subprocess as _sp, os as _os, threading as _th, time as _time

@hermes_cli_bp.route('/api/deploy/self-update', methods=['GET', 'POST'])
def deploy_self_update():
    """Pull latest from git, rebuild frontend, restart Flask. Browser-accessible."""
    proj_dir = '/home/huawei-cloud/latam-cloud-erp-'
    output_lines = []
    
    if request.method == 'GET':
        return '''<!DOCTYPE html><html><head><title>ERP Deploy</title>
<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:40px;text-align:center}
button{padding:16px 48px;font-size:18px;font-weight:bold;background:#7c3aed;color:#fff;border:none;border-radius:12px;cursor:pointer;margin:10px}
button:hover{background:#6d28d9}
pre{background:#0d0d1a;padding:20px;border-radius:8px;text-align:left;max-width:800px;margin:20px auto;overflow-x:auto;font-size:12px}
.success{color:#4ade80}.error{color:#f87171}</style></head><body>
<h1>ERP Migration Factory - Self Deploy</h1>
<p>Click to pull latest code, rebuild frontend, and restart.</p>
<form method="POST">
<button type="submit" name="action" value="pull_build">Pull + Build + Restart</button>
<button type="submit" name="action" value="restart_only">Restart Only</button>
</form></body></html>'''
    
    def run(cmd, cwd=proj_dir):
        output_lines.append('$ ' + cmd)
        try:
            r = _sp.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True, timeout=120)
            if r.stdout.strip(): output_lines.append(r.stdout.strip())
            if r.stderr.strip(): output_lines.append(r.stderr.strip())
            output_lines.append('(exit=' + str(r.returncode) + ')')
            return r.returncode == 0
        except Exception as e:
            output_lines.append('ERROR: ' + str(e))
            return False
    
    action = request.form.get('action', 'pull_build')
    if action == 'pull_build':
        run('git fetch origin feature-migration-lifecycle-2')
        run('git reset --hard origin/feature-migration-lifecycle-2')
        run('cd frontend && npm run build')
    
    def _bg_restart():
        _time.sleep(0.5)
        _sp.run("screen -ls 2>/dev/null | grep flask | cut -d. -f1 | tr -d '\\\\t' | xargs -r kill 2>/dev/null; screen -wipe 2>/dev/null; kill $(lsof -ti:9119) 2>/dev/null; sleep 0.5; cd /home/huawei-cloud/latam-cloud-erp- && screen -dmS flask bash -c 'venv/bin/python3 app.py'", shell=True)
    _th.Thread(target=_bg_restart, daemon=True).start()
    output_lines.append('>>> Restart triggered - server back in ~3s.')
    
    return '<!DOCTYPE html><html><head><title>Deploy Result</title><style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:40px}pre{background:#0d0d1a;padding:20px;border-radius:8px;font-size:12px}.success{color:#4ade80}</style></head><body><h1 class="success">Deploy Complete</h1><pre>' + '\\n'.join(output_lines) + '</pre><p><a href="/">Back to ERP</a> | <a href="/api/hermes-cli/api/deploy/self-update">Deploy again</a></p></body></html>'
