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
from services.agentic_simulator import register_agentic_dry_run_routes

from services.model_config import ModelConfigStore, PROVIDER_REGISTRY

logger = logging.getLogger(__name__)
execution_bp = Blueprint('execution', __name__)

# Register agentic orchestration dry-run endpoint
register_agentic_dry_run_routes(execution_bp)

# ── Model Configuration API ── (API keys for AI loadbalancer)

@execution_bp.route('/api/model-config', methods=['GET'])
@jwt_required()
def get_model_config():
    """Get full model config — API keys are masked."""
    try:
        cfg = ModelConfigStore().get_public_config()
        cfg["providers_registry"] = {
            pid: {"name": info["name"], "models": info["models"], "auth_type": info["auth_type"]}
            for pid, info in PROVIDER_REGISTRY.items()
        }
        return jsonify({"success": True, "config": cfg})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/model-config/api-key', methods=['POST'])
@jwt_required()
def set_model_api_key():
    """Store an API key for a provider."""
    try:
        data = request.get_json()
        provider = data.get("provider", "").strip().lower()
        key = data.get("key", "").strip()
        if not provider or not key:
            return jsonify({"success": False, "error": "provider + key required"}), 400
        if provider not in PROVIDER_REGISTRY:
            return jsonify({"success": False, "error": f"Unknown provider: {provider}"}), 400
        ModelConfigStore().set_api_key(provider, key)
        return jsonify({"success": True, "message": f"API key saved for {PROVIDER_REGISTRY[provider]['name']}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/model-config/primary', methods=['POST'])
@jwt_required()
def set_primary_model():
    """Set primary orchestrator model."""
    try:
        data = request.get_json()
        model = data.get("model", "").strip()
        provider = data.get("provider", "").strip().lower()
        if not model or not provider:
            return jsonify({"success": False, "error": "model + provider required"}), 400
        ModelConfigStore().set_primary_model(model, provider)
        return jsonify({"success": True, "message": f"Primary: {model} via {provider}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/model-config/delegation', methods=['POST'])
@jwt_required()
def set_delegation_model():
    """Set delegation (sub-agent) model."""
    try:
        data = request.get_json()
        model = data.get("model", "").strip()
        provider = data.get("provider", "").strip().lower()
        if not model or not provider:
            return jsonify({"success": False, "error": "model + provider required"}), 400
        ModelConfigStore().set_delegation_model(model, provider)
        return jsonify({"success": True, "message": f"Delegation: {model} via {provider}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/model-config/fallback', methods=['POST'])
@jwt_required()
def set_fallback_order():
    """Set provider fallback priority order."""
    try:
        data = request.get_json()
        order = data.get("order", [])
        if not order or not isinstance(order, list):
            return jsonify({"success": False, "error": "order (list) required"}), 400
        valid = [p for p in order if p in PROVIDER_REGISTRY]
        if len(valid) < 2 and len(order) > 1:
            return jsonify({"success": False, "error": f"Unknown providers in order. Valid: {list(PROVIDER_REGISTRY.keys())}"}), 400
        ModelConfigStore().set_fallback_order(valid)
        return jsonify({"success": True, "message": f"Fallback: {' → '.join(valid)}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/model-config/provider/<provider_id>', methods=['POST'])
@jwt_required()
def update_provider_config(provider_id):
    """Update provider settings (enabled, weight, concurrency, etc.)."""
    try:
        if provider_id not in PROVIDER_REGISTRY:
            return jsonify({"success": False, "error": f"Unknown provider: {provider_id}"}), 400
        data = request.get_json()
        allowed = {"enabled", "weight", "max_concurrency", "timeout_seconds", "retry_count", "preferred_model"}
        updates = {k: v for k, v in data.items() if k in allowed}
        if not updates:
            return jsonify({"success": False, "error": "No valid fields"}), 400
        ModelConfigStore().set_provider_config(provider_id, **updates)
        return jsonify({"success": True, "message": f"Updated {provider_id}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Loadbalancer Key Management (Huawei ModelArts API keys) ──

from services.lb_key_store import LoadbalancerKeyStore

@execution_bp.route('/api/loadbalancer/keys', methods=['GET'])
@jwt_required()
def get_lb_keys():
    try:
        slots = LoadbalancerKeyStore().get_public_slots()
        return jsonify({"success": True, "slots": slots, "max_slots": LoadbalancerKeyStore.MAX_SLOTS})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/loadbalancer/keys/<int:slot>', methods=['POST'])
@jwt_required()
def set_lb_key(slot):
    try:
        data = request.get_json()
        key = data.get("key", "").strip()
        label = data.get("label", "").strip()
        if not key:
            return jsonify({"success": False, "error": "key required"}), 400
        LoadbalancerKeyStore().set_key(slot, key, label)
        return jsonify({"success": True, "message": f"Key saved for slot {slot}"})
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@execution_bp.route('/api/loadbalancer/keys/<int:slot>', methods=['DELETE'])
@jwt_required()
def delete_lb_key(slot):
    try:
        LoadbalancerKeyStore().delete_key(slot)
        return jsonify({"success": True, "message": f"Key deleted from slot {slot}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/knowledge/tree', methods=['GET'])
@jwt_required()
def get_knowledge_tree():
    """Return hierarchical skill tree with usage metrics from all 3 sources."""
    try:
        from services.knowledge_provider import KnowledgeProvider
        provider = KnowledgeProvider()
        entries = provider.query_all()
        tree = build_knowledge_tree(entries)
        metrics = compute_knowledge_metrics(entries)
        return jsonify({"success": True, "tree": tree, "metrics": metrics})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def build_knowledge_tree(entries):
    """Build hierarchical tree from flat knowledge entries."""
    categories = {}
    for entry in entries:
        cat = entry.migration_type or "General"
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            "id": entry.id,
            "name": entry.trigger or entry.id,
            "source": entry.source,     # skill | external | history
            "usedCount": entry.usage_count or 0,
            "confidence": entry.confidence or 0.5,
            "children": [],
        })

    tree = []
    for cat_name, children in sorted(categories.items()):
        tree.append({
            "id": f"cat-{cat_name}",
            "name": cat_name,
            "source": "category",
            "children": sorted(children, key=lambda c: -(c["confidence"] or 0)),
        })
    return tree


def compute_knowledge_metrics(entries):
    """Aggregate usage stats across sources."""
    used = sum(1 for e in entries if getattr(e, 'usage_count', 0) > 0)
    fed = sum(1 for e in entries if getattr(e, 'fed_count', 0) > 0)
    by_source = {}
    for e in entries:
        src = e.source or 'unknown'
        by_source[src] = by_source.get(src, 0) + 1
    return {
        "total": len(entries),
        "used": used,
        "fed": fed,
        "bySource": by_source,
    }


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
        dry_run = (request.get_json() or {}).get('dryRun', False)

        # 🚨 FIX: Now passing project_id to inject automated tags
        tf_payload = ExecutionOrchestrator.generate_terraform_payload(
            mapper_nodes, region, project_id, require_factory=True, network_config=network_config 
        )
        
        # 🚨 DRY-RUN: Return generated payload + resource inventory, skip deployment
        if dry_run:
            tf_obj = json.loads(tf_payload)
            inventory = {"vpcs": [], "subnets": [], "instances": [], "eips": [], "cbr_vaults": []}
            for res_type, res_map in tf_obj.get("resource", {}).items():
                if not res_map: continue
                for name, cfg in res_map.items():
                    entry = {"name": name, "kind": res_type.replace("huaweicloud_", ""), "tags": cfg.get("tags", {})}
                    if "vpc" in res_type: inventory["vpcs"].append(entry)
                    elif "subnet" in res_type: inventory["subnets"].append(entry)
                    elif "compute_instance" in res_type: inventory["instances"].append(entry)
                    elif "eip" in res_type: inventory["eips"].append(entry)
                    elif "cbr" in res_type: inventory["cbr_vaults"].append(entry)
            transient_count = sum(1 for tag in [r.get("tags", {}) for typ in ["instances", "eips"] for r in inventory[typ]] if tag.get("erp_transient") == "true")
            inventory["_summary"] = {
                "total_resources": sum(len(v) for v in inventory.values() if isinstance(v, list)),
                "transient_resources": transient_count,
                "note": "Transient resources are destroyed in Phase 4.7 Garbage Collection. PPU cost applies until then."
            }
            return jsonify({"success": True, "dry_run": True, "terraform_json": tf_obj, "resource_inventory": inventory})
        
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

@execution_bp.route('/api/projects/<project_id>/rollback', methods=['POST'])
@jwt_required()
def rollback_project(project_id):
    """🚨 Fix #5: Rollback/destroy RFS stack and tear down all provisioned infrastructure."""
    try:
        project_record = ProjectData.query.get(project_id)
        if not project_record: return jsonify({"success": False, "error": "Project not found"}), 404
        
        try: ephemeral_keys = ensure_valid_sts_token(project_record)
        except Exception as auth_err: return jsonify({"success": False, "error": str(auth_err)}), 403

        project_data = json.loads(project_record.data)
        region = project_data.get('region', 'la-south-2')

        rfs_result = ExecutionOrchestrator.rollback_rfs_stack(
            ak=ephemeral_keys.get('ak'), sk=ephemeral_keys.get('sk'),
            security_token=ephemeral_keys.get('security_token'),
            region=region, project_id=project_id
        )
        
        if rfs_result.get("success"):
            # Reset execution state on successful rollback
            ExecutionState.query.filter_by(project_id=project_id).update({
                'current_phase': 'PHASE_4_0', 'status': 'PENDING'
            })
            # Clear delegate tasks
            project_record.delegate_tasks = '[]'
            db.session.commit()
        
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

@execution_bp.route('/api/executions/<project_id>/logs', methods=['GET'])
@jwt_required()
def get_execution_logs(project_id):
    """🚨 Fix #7: Query structured execution logs for a project."""
    from models import ExecutionState, ExecutionLog
    state = ExecutionState.query.filter_by(project_id=project_id).first()
    if not state:
        return jsonify({"success": True, "logs": []})
    
    # Optional filters
    phase = request.args.get('phase')
    event_type = request.args.get('type')
    limit = int(request.args.get('limit', 100))
    
    q = ExecutionLog.query.filter_by(execution_state_id=state.id)
    if phase: q = q.filter_by(phase=phase)
    if event_type: q = q.filter_by(event_type=event_type)
    q = q.order_by(ExecutionLog.timestamp.desc()).limit(limit)
    
    logs = [{
        'id': l.id, 'phase': l.phase, 'event_type': l.event_type,
        'message': l.message, 'agent_name': l.agent_name,
        'metadata': json.loads(l.metadata_json) if l.metadata_json else None,
        'timestamp': l.timestamp.isoformat()
    } for l in q.all()]
    
    return jsonify({"success": True, "logs": logs})

@execution_bp.route('/api/executions/<project_id>/logs', methods=['POST'])
@jwt_required()
def create_execution_log(project_id):
    """🚨 Fix #7: Append a structured log entry."""
    from models import ExecutionState, ExecutionLog
    state = ExecutionState.query.filter_by(project_id=project_id).first()
    if not state:
        return jsonify({"success": False, "error": "Execution state not found"}), 404
    
    data = request.get_json() or {}
    entry = ExecutionLog(
        execution_state_id=state.id,
        project_id=project_id,
        phase=data.get('phase', state.current_phase),
        event_type=data.get('event_type', 'INFO'),
        message=data.get('message', ''),
        agent_name=data.get('agent_name'),
        metadata_json=json.dumps(data.get('metadata')) if data.get('metadata') else None
    )
    db.session.add(entry)
    db.session.commit()
    
    return jsonify({"success": True, "log_id": entry.id})

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
