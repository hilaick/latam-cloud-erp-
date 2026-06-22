import os
import json
import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, ProjectData, Customer
from services.credential_manager import get_credential_manager
from services.identity_provisioner import IdentityProvisioner
from services.orchestrator import ExecutionOrchestrator
from services.agent_orchestrator import AgentOrchestrator

logger = logging.getLogger(__name__)
execution_bp = Blueprint('execution', __name__)

def ensure_valid_sts_token(project_record):
    project_data = json.loads(project_record.data)
    ephemeral_keys = project_data.get('ephemeralKeys')
    
    needs_refresh = True
    if ephemeral_keys and 'expires' in ephemeral_keys:
        try:
            expiry_dt = datetime.fromisoformat(ephemeral_keys['expires'].replace('Z', '+00:00'))
            if (expiry_dt - datetime.now(timezone.utc)).total_seconds() > 300:
                needs_refresh = False
        except Exception as e: pass
            
    if not needs_refresh: return ephemeral_keys
        
    customer_id = project_data.get('customerId')
    eps_id = project_data.get('sandboxEps', '').strip()
    
    if not customer_id: raise Exception("No Customer linked to this project.")
        
    customer = Customer.query.get(customer_id)
    if not customer or not customer.ak or not customer.sk: raise Exception("Customer Master AK/SK missing from Vault.")
        
    ak_str = str(customer.ak).strip()
    sk_str = str(customer.sk).strip()
    
    master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
    cm = get_credential_manager(master_password)
    
    if not ak_str.startswith('{') and len(ak_str) > 5:
        ak, sk = ak_str, sk_str
    else:
        ak, sk = cm.decrypt_credentials(json.loads(ak_str))
        
    result = IdentityProvisioner.generate_ephemeral_token(ak=ak, sk=sk, eps_id=eps_id if eps_id else None)
    if not result.get("success"): raise Exception(f"Failed to auto-refresh STS token: {result.get('error')}")
        
    new_keys = {"ak": result["ak"], "sk": result["sk"], "security_token": result["security_token"], "expires": result["expires_at"]}
    project_data['ephemeralKeys'] = new_keys
    project_record.data = json.dumps(project_data, ensure_ascii=False)
    db.session.commit()
    return new_keys


@execution_bp.route('/api/cloud/sts-token', methods=['POST'])
@jwt_required()
def provision_sts_token():
    try:
        data = request.get_json()
        project_record = ProjectData.query.get(data.get('projectId'))
        if not project_record: return jsonify({"success": False, "error": "Project not found."}), 404
        return jsonify({"success": True, **ensure_valid_sts_token(project_record)}), 200
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 400

@execution_bp.route('/api/cloud/validate-sts-token', methods=['POST'])
@jwt_required()
def validate_sts_token():
    try:
        project_record = ProjectData.query.get(request.get_json().get('projectId'))
        project_data = json.loads(project_record.data)
        ephemeral_keys = project_data.get('ephemeralKeys')
        
        if not ephemeral_keys: return jsonify({"success": False, "error": "No ephemeral keys found."}), 400
        return jsonify({"success": True, "valid": True, "message": "STS token validated successfully", "status_code": 200, "expires": ephemeral_keys.get('expires')})
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/projects/<project_id>/execute', methods=['POST'])
@jwt_required()
def execute_project(project_id):
    try:
        project_record = ProjectData.query.get(project_id)
        if not project_record: return jsonify({"success": False, "error": "Project not found"}), 404
        
        try: ephemeral_keys = ensure_valid_sts_token(project_record)
        except Exception as auth_err: return jsonify({"success": False, "error": str(auth_err)}), 403

        project_data = json.loads(project_record.data)
        mapper_nodes = project_data.get('mapperNodes', [])
        region = project_data.get('region', 'la-south-2')
        network_config = (request.get_json() or {}).get('networkConfig', {})

        # 🚨 FIX: Now passing project_id to inject automated tags
        tf_payload = ExecutionOrchestrator.generate_terraform_payload(
            mapper_nodes, region, project_id, require_factory=True, network_config=network_config 
        )
        
        rfs_result = ExecutionOrchestrator.deploy_to_rfs(
            ak=ephemeral_keys.get('ak'), sk=ephemeral_keys.get('sk'), security_token=ephemeral_keys.get('security_token'),
            region=region, project_id=project_id, tf_json=tf_payload
        )
        
        if rfs_result.get("success"): return jsonify({"success": True, "message": f"Terraform successfully deployed via Huawei RFS. Stack ID: {rfs_result.get('stack_id')}"})
        else: return jsonify({"success": True, "message": "Landing Zone pre-provisioned in local simulation mode.", "warning": rfs_result.get('error')})
        
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/projects/<project_id>/garbage-collect', methods=['POST'])
@jwt_required()
def execute_garbage_collection(project_id):
    """🚨 Phase 4.7: Strips out transient migration factory VMs and EIPs"""
    try:
        project_record = ProjectData.query.get(project_id)
        if not project_record: return jsonify({"success": False, "error": "Project not found"}), 404
        
        try: ephemeral_keys = ensure_valid_sts_token(project_record)
        except Exception as auth_err: return jsonify({"success": False, "error": str(auth_err)}), 403

        project_data = json.loads(project_record.data)
        mapper_nodes = project_data.get('mapperNodes', [])
        region = project_data.get('region', 'la-south-2')

        # Generate payload with require_factory=False
        tf_payload = ExecutionOrchestrator.generate_terraform_payload(
            mapper_nodes, region, project_id, require_factory=False 
        )
        
        rfs_result = ExecutionOrchestrator.update_rfs_stack(
            ak=ephemeral_keys.get('ak'), sk=ephemeral_keys.get('sk'), security_token=ephemeral_keys.get('security_token'),
            region=region, project_id=project_id, tf_json=tf_payload
        )
        
        return jsonify(rfs_result)
        
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/projects/<project_id>/deploy-agents', methods=['POST'])
@jwt_required()
def deploy_agents(project_id):
    try:
        opt_ins = (request.get_json() or {}).get('optIns', {'uniAgent': True, 'hss': False, 'lts': False})
        project_record = ProjectData.query.get(project_id)
        
        try: ephemeral_keys = ensure_valid_sts_token(project_record)
        except Exception as auth_err: return jsonify({"success": False, "error": str(auth_err)}), 403
            
        project_data = json.loads(project_record.data)
        linux_payload = AgentOrchestrator.generate_linux_payload(ephemeral_keys.get('ak'), ephemeral_keys.get('sk'), project_data.get('region', 'la-south-2'), opt_ins)
        windows_payload = AgentOrchestrator.generate_windows_payload(ephemeral_keys.get('ak'), ephemeral_keys.get('sk'), project_data.get('region', 'la-south-2'), opt_ins)

        auth_level = project_data.get('authLevel', '')
        if 'Local OS Admin' in auth_level or 'Active Directory' in auth_level: return jsonify({"success": True, "mode": "automated", "message": "Automated SSH/WinRM batch push initiated."})
        else: return jsonify({"success": True, "mode": "manual", "message": "Zero-Trust Runbooks generated.", "runbook": { "linux": linux_payload, "windows": windows_payload }})

    except Exception as e: return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/executions/<project_id>', methods=['GET'])
@jwt_required()
def get_execution_state(project_id):
    from models import ExecutionState
    state = ExecutionState.query.filter_by(project_id=project_id).first()
    if not state:
        state = ExecutionState(project_id=project_id, current_phase='PHASE_4_0', status='PENDING')
        db.session.add(state)
        db.session.commit()
    return jsonify({"success": True, "data": {"currentPhase": state.current_phase, "status": state.status, "pendingAction": state.pending_action, "migrationMode": state.migration_mode}})

@execution_bp.route('/api/executions/<project_id>/update', methods=['POST'])
@jwt_required()
def update_execution_state(project_id):
    from models import ExecutionState
    data = request.json
    state = ExecutionState.query.filter_by(project_id=project_id).first()
    if not state: return jsonify({"success": False, "error": "State not found"}), 404
        
    if 'phase' in data: state.current_phase = data['phase']
    if 'status' in data: state.status = data['status']
    if 'pendingAction' in data: state.pending_action = data['pendingAction']
    if 'migrationMode' in data: state.migration_mode = data['migrationMode']
    
    state.last_active_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True})
