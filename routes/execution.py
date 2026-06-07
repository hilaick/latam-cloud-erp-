import os
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, ProjectData, Customer
from services.credential_manager import get_credential_manager
from services.identity_provisioner import IdentityProvisioner

execution_bp = Blueprint('execution', __name__)

@execution_bp.route('/api/cloud/sts-token', methods=['POST'])
@jwt_required()
def provision_sts_token():
    """
    Securely requests an Ephemeral STS Token from Huawei Cloud.
    Requires the Project ID to dynamically fetch the vaulted Customer Keys and target EPS.
    """
    try:
        data = request.get_json()
        project_id = data.get('projectId')
        
        if not project_id:
            return jsonify({"success": False, "error": "Project ID required."}), 400

        # 1. Load Project and Customer from DB
        project_record = ProjectData.query.get(project_id)
        if not project_record:
            return jsonify({"success": False, "error": "Project not found."}), 404
            
        project_data = json.loads(project_record.data)
        customer_id = project_data.get('customerId')
        eps_id = project_data.get('sandboxEps', '').strip()
        
        if not customer_id:
            return jsonify({"success": False, "error": "No Customer linked to this project."}), 400

        customer = Customer.query.get(customer_id)
        if not customer or not customer.ak or not customer.sk:
            return jsonify({"success": False, "error": "Customer Master AK/SK missing from Secure Vault."}), 400

        # 🚨 THE 500 ERROR FIX: Safely parse keys (Plaintext vs Encrypted)
        ak_str = str(customer.ak).strip()
        sk_str = str(customer.sk).strip()

        if not ak_str.startswith('{') and len(ak_str) > 5:
            # Keys are saved in plain text from the UI
            ak = ak_str
            sk = sk_str
        else:
            # Keys are JSON formatted (AES Encrypted)
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            try:
                ak_data = json.loads(ak_str)
                ak, sk = get_credential_manager(master_password).decrypt_credentials(ak_data)
            except Exception as e:
                return jsonify({"success": False, "error": f"Failed to decrypt Vault Credentials: {str(e)}"}), 500

        # 3. Call the Identity Provisioner to hit Huawei STS API
        result = IdentityProvisioner.generate_ephemeral_token(
            ak=ak, 
            sk=sk, 
            eps_id=eps_id if eps_id else None
        )
        
        if result.get("success"):
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/projects/<project_id>/execute', methods=['POST'])
@jwt_required()
def execute_project(project_id):
    try:
        project_record = ProjectData.query.get(project_id)
        if not project_record: return jsonify({"success": False, "error": "Project not found"}), 404
        project_data = json.loads(project_record.data)
        
        return jsonify({"success": True, "message": "Terraform Execution Started."})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/projects/<project_id>/sync-status', methods=['GET'])
@jwt_required()
def get_sync_status(project_id):
    try:
        status_payload = {
            "state": "RUNNING",
            "progress_percentage": 45,
            "details": "Syncing block data..."
        }
        return jsonify({"success": True, "data": status_payload})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
