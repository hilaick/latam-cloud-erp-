import os
import json
import subprocess
from pathlib import Path
from flask import Blueprint, request, jsonify

# 🚨 UPDATED: Using JWT instead of Basic Auth
from flask_jwt_extended import jwt_required
from services.resource_parser import parse_resource_log, get_all_deployments
from services.huawei_load_balancer import HuaweiLoadBalancer

# 🚨 NEW IMPORTS for Safe Read-Only Discovery
from models import Customer
from services.huawei_discovery import HuaweiDiscovery

cloud_ops_bp = Blueprint('cloud_ops', __name__)
PROJECT_ROOT = Path(__file__).parent.parent

# Initialize load balancer globally to prevent memory leaks
huawei_lb = HuaweiLoadBalancer()

@cloud_ops_bp.route('/api/audit', methods=['POST'])
@jwt_required()
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
@jwt_required()
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
@jwt_required()
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
@jwt_required()
def get_logs():
    try:
        log_file = PROJECT_ROOT / 'deployments' / 'huawei_resources.log'
        if log_file.exists():
            with open(log_file, 'r') as f: return jsonify({"logs": f.read()})
        return jsonify({"message": "No logs found"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cloud_ops_bp.route('/api/huawei/chat', methods=['POST'])
@jwt_required()
def huawei_chat():
    try:
        message = request.get_json().get('message', '')
        if not message: return jsonify({"error": "Message is required"}), 400
        return jsonify({"response": huawei_lb.chat(message), "key_used": huawei_lb.current_key_index, "total_keys": len(huawei_lb.api_keys)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cloud_ops_bp.route('/api/huawei/keys/status', methods=['GET'])
@jwt_required()
def huawei_keys_status():
    try:
        return jsonify({
            "total_keys": len(huawei_lb.api_keys),
            "active_keys": huawei_lb.get_active_key_count(),
            "keys": [{"index": i, "is_active": k.get('is_active', True)} for i, k in enumerate(huawei_lb.api_keys)]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🚨 NEW: SECURE DISCOVERY ROUTE
@cloud_ops_bp.route('/api/cloud/inventory', methods=['POST'])
@jwt_required()
def get_live_inventory():
    """
    Safely discovers live infrastructure on Huawei Cloud using Read-Only credentials.
    Triggered by the 'Live Cloud NOC' or 'Pre-Sales Radar' in the frontend.
    """
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        project_id = data.get('projectId') # Huawei specific project ID
        
        # NOTE: Frontend currently sends ak/sk directly in LiveCloudNOC, 
        # but relying on customer_id + DB lookup is vastly more secure. 
        # We will attempt DB lookup first, fallback to passed keys for testing.
        
        if customer_id:
            # 1. Fetch the customer's encrypted Vault from Postgres
            customer = Customer.query.get(customer_id)
            if not customer or not customer.ak or not customer.sk:
                return jsonify({"success": False, "error": "Customer missing or Vault keys incomplete."}), 404

            # 2. Get the Master Password (in a real app, this comes from the user's session/JWT)
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")

            # 3. Initialize the Read-Only Discovery Engine
            discovery_engine = HuaweiDiscovery(
                encrypted_ak_data=customer.ak,
                encrypted_sk_data=customer.sk,
                region=customer.region or data.get('region', 'la-south-2'),
                master_password=master_password
            )
        else:
            # Fallback for frontend test mode (where raw AK/SK are passed directly)
            raw_ak = data.get('ak')
            raw_sk = data.get('sk')
            region = data.get('region', 'la-south-2')
            
            if not raw_ak or not raw_sk:
                return jsonify({"success": False, "error": "Customer ID or AK/SK required."}), 400
                
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            discovery_engine = HuaweiDiscovery(None, None, region, None)
            discovery_engine.credentials = BasicCredentials(raw_ak, raw_sk)

        # 4. Execute the safe scan
        result = discovery_engine.discover_all()
        
        if result.get("success"):
            return jsonify({
                "success": True, 
                "inventory": result.get("inventory"),
                "message": "Discovery completed safely."
            })
        else:
            return jsonify({"success": False, "error": result.get("error")}), 500

    except ValueError as ve:
        # Catches decryption errors (e.g., wrong master password or tampered keys)
        return jsonify({"success": False, "error": str(ve)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error during discovery: {str(e)}"}), 500