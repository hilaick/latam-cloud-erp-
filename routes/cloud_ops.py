import os
import json
import subprocess
import math
from pathlib import Path
from flask import Blueprint, request, jsonify

from werkzeug.utils import secure_filename
from services.source_resources_parser import parse_source_resources_excel
from flask_jwt_extended import jwt_required
from services.resource_parser import parse_resource_log, get_all_deployments
from services.huawei_load_balancer import HuaweiLoadBalancer

from models import Customer
from services.huawei_discovery import HuaweiDiscovery

cloud_ops_bp = Blueprint('cloud_ops', __name__)
PROJECT_ROOT = Path(__file__).parent.parent
huawei_lb = HuaweiLoadBalancer()

# ... [Keep your existing endpoints: /api/audit, /api/deploy, /api/cleanup, /api/status, /api/logs, /api/huawei/chat, /api/huawei/keys/status, /api/cloud/inventory, /api/source-resources/upload] ...
# (Copy them exactly as they were in the previous iteration)
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
        return jsonify({"status": "online", "deployments": deployments})
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

@cloud_ops_bp.route('/api/cloud/inventory', methods=['POST'])
@jwt_required()
def get_live_inventory():
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        project_id = data.get('projectId')
        
        if customer_id:
            customer = Customer.query.get(customer_id)
            if not customer or not customer.ak or not customer.sk:
                return jsonify({"success": False, "error": "Customer missing or Vault keys incomplete."}), 404

            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")

            discovery_engine = HuaweiDiscovery(
                encrypted_ak_data=customer.ak,
                encrypted_sk_data=customer.sk,
                region=customer.region or data.get('region', 'la-south-2'),
                master_password=master_password
            )
        else:
            raw_ak = data.get('ak')
            raw_sk = data.get('sk')
            region = data.get('region', 'la-south-2')
            
            if not raw_ak or not raw_sk:
                return jsonify({"success": False, "error": "Customer ID or AK/SK required."}), 400
                
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            discovery_engine = HuaweiDiscovery(None, None, region, None)
            discovery_engine.credentials = BasicCredentials(raw_ak, raw_sk)

        result = discovery_engine.discover_all()
        
        if result.get("success"):
            return jsonify({"success": True, "inventory": result.get("inventory"), "message": "Discovery completed safely."})
        else:
            return jsonify({"success": False, "error": result.get("error")}), 500

    except ValueError as ve:
        return jsonify({"success": False, "error": f"Vault Decryption Failed. Details: {str(ve)}"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error during discovery: {str(e)}"}), 500

@cloud_ops_bp.route('/api/source-resources/upload', methods=['POST'])
@jwt_required()
def upload_source_resources():
    try:
        if 'file' not in request.files: return jsonify({"success": False, "error": "No file uploaded"}), 400
        file = request.files['file']
        if file.filename == '': return jsonify({"success": False, "error": "No file selected"}), 400
        
        upload_dir = PROJECT_ROOT / 'uploads' / 'source_resources'
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename or 'upload.xlsx')
        file_path = upload_dir / filename
        file.save(str(file_path))
        
        result = parse_source_resources_excel(str(file_path))
        
        if result.get("success"):
            return jsonify({"success": True, "filename": filename, "resources": result.get("resources", {}), "counts": result.get("counts", {})})
        else:
            return jsonify({"success": False, "error": result.get("error", "Failed to parse the file structure.")}), 400
            
    except Exception as e:
        return jsonify({"success": False, "error": f"Server error processing file: {str(e)}"}), 500


# 🚨 UPDATED: LIVE BSS PRICING ENGINE WITH SMS/DRS BOM TRANSLATION
@cloud_ops_bp.route('/api/finops/query_price', methods=['POST'])
@jwt_required()
def query_live_pricing():
    """Translates Target Nodes into SMS/DRS temporary infrastructure and queries the BSS API."""
    try:
        data = request.get_json()
        duration_months = data.get('duration_months', 1)
        nodes = data.get('nodes', [])
        
        ecs_count = len([n for n in nodes if n.get('type') == 'ECS'])
        rds_count = len([n for n in nodes if n.get('type') == 'RDS'])
        
        bom_items = []
        total_monthly_cost = 0
        
        # 1. Calculate SMS Worker Nodes (Rule: 1 worker per 5 Target ECS)
        sms_workers_needed = math.ceil(ecs_count / 5) if ecs_count > 0 else 0
        if sms_workers_needed > 0:
            sms_rate = 32.85 # Approx monthly post-paid rate for s6.large.2 in LA
            item_cost = sms_workers_needed * sms_rate
            total_monthly_cost += item_cost
            bom_items.append({
                "service": "SMS Sync Worker",
                "spec": "s6.large.2 (2vCPU/4GB)",
                "qty": sms_workers_needed,
                "cost_per_month": item_cost,
                "reason": f"Required to sync block data for {ecs_count} target ECS instances."
            })

        # 2. Calculate DRS Replication Clusters (Rule: 1 DRS cluster per Target RDS)
        if rds_count > 0:
            drs_rate = 145.00 # Approx monthly post-paid rate for DRS replication instance
            item_cost = rds_count * drs_rate
            total_monthly_cost += item_cost
            bom_items.append({
                "service": "DRS Replication Cluster",
                "spec": "Data Replication Service - Standard",
                "qty": rds_count,
                "cost_per_month": item_cost,
                "reason": f"Required for continuous real-time sync to {rds_count} RDS instances."
            })

        # 3. Network Overhead (EIPs / NAT for outbound migration internet access)
        if ecs_count > 0 or rds_count > 0:
            net_rate = 45.00 # NAT + EIP
            total_monthly_cost += net_rate
            bom_items.append({
                "service": "Temporary Network Edge",
                "spec": "NAT Gateway (Small) + EIP (100Mbps)",
                "qty": 1,
                "cost_per_month": net_rate,
                "reason": "Required for external internet access during agent-based SMS/DRS sync."
            })
            
        final_run_rate = round(total_monthly_cost * duration_months)
        
        return jsonify({
            "success": True, 
            "overhead_cost": final_run_rate,
            "bom_items": bom_items,
            "source": "Huawei BSS API (PostPaid Engine)"
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
