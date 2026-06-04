from flask import Blueprint, request, jsonify, Response
import json
from flask_jwt_extended import jwt_required

from models import db, Customer 
from services.identity_provisioner import LeastPrivilegeProvisioner
from services.agent_orchestrator import ProprietaryCognitiveEngine

execution_bp = Blueprint('execution', __name__)

@execution_bp.route('/api/projects/<project_id>/initialize-vault', methods=['POST'])
@jwt_required()
def initialize_vault_identities(project_id):
    try:
        data = request.json or {}
        customer_id = data.get('customer_id')
        customer = Customer.query.get(customer_id)
        
        if not customer or not customer.ak:
            return jsonify({"success": False, "error": "Customer Master Key not found in Vault."}), 404

        sandbox_eps = f"eps-sandbox-{project_id}"
        
        provisioner = LeastPrivilegeProvisioner(customer.ak, customer.sk, "customer-domain")
        tier2_ak, tier2_sk = provisioner.provision_sandbox_identity(project_id, sandbox_eps)
        
        customer.tier2_ak = tier2_ak
        customer.tier2_sk = tier2_sk
        db.session.commit()
        
        return jsonify({"success": True, "message": "Least privilege IAM profiles generated.", "vault_status": "Tier 2 Activated"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/projects/<project_id>/execute-agent-stream', methods=['POST'])
@jwt_required()
def execute_agent_stream(project_id):
    data = request.json or {}
    customer_id = data.get('customer_id')
    customer = Customer.query.get(customer_id)

    if not customer or not customer.tier2_ak:
        return jsonify({"success": False, "error": "Tier 2 Execution keys missing. Initialize Vault first."}), 400

    safe_vault = {
        "tier2_ak": customer.tier2_ak, "tier2_sk": customer.tier2_sk,
        "aws_ak": customer.aws_ak, "aws_sk": customer.aws_sk,
        "azure_tenant_id": customer.azure_tenant_id,
        "os_user": customer.os_user, "os_password": customer.os_password
    }
    
    try:
        with open('config/blueprint.json', 'r') as f:
            blueprint = json.load(f)
    except Exception:
        blueprint = {"region": customer.region, "infrastructure": {"vpc_cidr": "10.0.0.0/16"}}
    
    engine = ProprietaryCognitiveEngine(project_id, safe_vault, blueprint)

    def generate():
        try:
            for payload in engine.orchestrate_streaming_pipeline():
                yield f"data: {json.dumps(payload)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'log', 'content': f'❌ [SERVER ERROR] {str(e)}'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(generate(), mimetype='text/event-stream')
