import os
import json
import subprocess
from pathlib import Path
from flask import Blueprint, request, jsonify
from services.auth import requires_auth
from services.resource_parser import parse_resource_log, get_all_deployments
from services.huawei_load_balancer import HuaweiLoadBalancer

cloud_ops_bp = Blueprint('cloud_ops', __name__)
PROJECT_ROOT = Path(__file__).parent.parent

# Initialize load balancer globally to prevent memory leaks
huawei_lb = HuaweiLoadBalancer()

@cloud_ops_bp.route('/api/audit', methods=['POST'])
@requires_auth
def run_audit():
    try:
        data = request.get_json()
        ak, sk, region = data.get('ak'), data.get('sk'), data.get('region', 'ap-southeast-3')
        if not ak or not sk: return jsonify({"error": "AK and SK are required"}), 400
        
        result = subprocess.run(['bash', 'scripts/audit_quick.sh', ak, sk, region], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        if result.returncode != 0: return jsonify({"error": result.stderr}), 500
        
        audit_file = PROJECT_ROOT / 'deployments' / 'huawei_resources.log'
        if audit_file.exists():
            with open(audit_file, 'r') as f: content = f.read()
            return jsonify({"message": "Audit completed", "resources": parse_resource_log(content), "raw_output": result.stdout})
        return jsonify({"message": "Audit completed but no resources file found", "raw_output": result.stdout})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cloud_ops_bp.route('/api/deploy', methods=['POST'])
@requires_auth
def deploy():
    try:
        data = request.get_json()
        ak, sk, resources = data.get('ak'), data.get('sk'), data.get('resources', [])
        if not ak or not sk: return jsonify({"error": "AK and SK are required"}), 400
        
        from datetime import datetime
        deployment_log = {
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "region": data.get('region', 'ap-southeast-3'),
            "resources": resources,
            "status": "requested"
        }
        
        log_file = PROJECT_ROOT / 'deployments' / f"deployment_{int(datetime.now().timestamp())}.json"
        os.makedirs(PROJECT_ROOT / 'deployments', exist_ok=True)
        with open(log_file, 'w') as f: json.dump(deployment_log, f, indent=2)
        
        return jsonify({"message": "Deployment request received", "log_file": str(log_file), "deployment": deployment_log})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cloud_ops_bp.route('/api/cleanup', methods=['POST'])
@requires_auth
def cleanup():
    try:
        data = request.get_json()
        from datetime import datetime
        cleanup_log = {
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "region": data.get('region', 'ap-southeast-3'),
            "resource_ids": data.get('resource_ids', []),
            "status": "requested"
        }
        log_file = PROJECT_ROOT / 'deployments' / f"cleanup_{int(datetime.now().timestamp())}.json"
        os.makedirs(PROJECT_ROOT / 'deployments', exist_ok=True)
        with open(log_file, 'w') as f: json.dump(cleanup_log, f, indent=2)
        return jsonify({"message": "Cleanup request received", "log_file": str(log_file), "cleanup": cleanup_log})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cloud_ops_bp.route('/api/status', methods=['GET'])
def status():
    try:
        deployments = get_all_deployments(str(PROJECT_ROOT / 'deployments'))
        return jsonify({
            "status": "online",
            "deployments": deployments,
            "message": f"Found {len(deployments)} deployments" if deployments else "No deployments found"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cloud_ops_bp.route('/api/logs', methods=['GET'])
@requires_auth
def get_logs():
    try:
        log_file = PROJECT_ROOT / 'deployments' / 'huawei_resources.log'
        if log_file.exists():
            with open(log_file, 'r') as f: return jsonify({"logs": f.read()})
        return jsonify({"message": "No logs found"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cloud_ops_bp.route('/api/huawei/chat', methods=['POST'])
@requires_auth
def huawei_chat():
    try:
        message = request.get_json().get('message', '')
        if not message: return jsonify({"error": "Message is required"}), 400
        return jsonify({"response": huawei_lb.chat(message), "key_used": huawei_lb.current_key_index, "total_keys": len(huawei_lb.api_keys)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cloud_ops_bp.route('/api/huawei/keys/status', methods=['GET'])
@requires_auth
def huawei_keys_status():
    try:
        return jsonify({
            "total_keys": len(huawei_lb.api_keys),
            "active_keys": huawei_lb.get_active_key_count(),
            "keys": [{"index": i, "is_active": k.get('is_active', True)} for i, k in enumerate(huawei_lb.api_keys)]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500