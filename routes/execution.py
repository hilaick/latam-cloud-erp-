import os
import json
import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, ProjectData, Customer, GlobalPlaybooks
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
        from services.knowledge_provider import KnowledgeProvider, ExternalKnowledgeStore
        # Ensure external knowledge is initialized (lazy-load)
        ExternalKnowledgeStore.initialize()
        result = KnowledgeProvider.query_all()
        entries = result["entries"]
        tree = build_knowledge_tree(entries)
        metrics = {
            "total": result["total"],
            "sourceBreakdown": result["source_breakdown"],
            "usedCount": sum(1 for e in entries if e.get("usage_count", 0) > 0),
            "fedCount": result["total"],
        }
        return jsonify({"success": True, "tree": tree, "metrics": metrics})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/knowledge/sync', methods=['POST'])
@jwt_required()
def sync_knowledge():
    """Force sync external knowledge from GitHub and return before/after counts."""
    try:
        from services.knowledge_provider import ExternalKnowledgeStore
        import os, json
        
        # Get before count
        before_count = 0
        cache_file = ExternalKnowledgeStore._entries
        if hasattr(ExternalKnowledgeStore, '_entries') and ExternalKnowledgeStore._entries:
            before_count = len(ExternalKnowledgeStore._entries)
        else:
            # Try to read from cache file directly
            cache_path = os.path.expanduser("~/.hermes/knowledge-cache/1-3-Cloud-Adoption-Skills/.entries.json")
            if os.path.exists(cache_path):
                with open(cache_path, 'r') as f:
                    before_count = len(json.load(f))
        
        # Force sync
        ExternalKnowledgeStore.initialize(force_sync=True)
        
        # Get after count
        after_count = len(ExternalKnowledgeStore._entries)
        last_sync = ExternalKnowledgeStore._last_sync
        
        return jsonify({
            "success": True,
            "before": before_count,
            "after": after_count,
            "last_sync": last_sync,
            "message": f"Synced: {before_count} → {after_count} entries"
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def build_knowledge_tree(entries):
    """Build hierarchical tree from flat knowledge dict entries."""
    categories = {}
    for entry in entries:
        cat = entry.get("category") or entry.get("migration_type") or entry.get("strategy") or "General"
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            "id": entry.get("id") or entry.get("name") or f"entry-{hash(str(entry))%10000}",
            "name": entry.get("trigger") or entry.get("name") or entry.get("server_name") or "Unknown",
            "source": entry.get("source", "unknown"),
            "usedCount": entry.get("usage_count", 0),
            "confidence": entry.get("confidence", 0.5),
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
    """Aggregate usage stats across sources (dict-safe)."""
    by_source = {}
    for e in entries:
        src = e.get("source", "unknown") if isinstance(e, dict) else getattr(e, "source", "unknown")
        by_source[src] = by_source.get(src, 0) + 1
    return {
        "total": len(entries),
        "used": sum(1 for e in entries if (e.get("usage_count", 0) if isinstance(e, dict) else getattr(e, "usage_count", 0)) > 0),
        "fed": sum(1 for e in entries if (e.get("fed_count", 0) if isinstance(e, dict) else getattr(e, "fed_count", 0)) > 0),
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
        # Actually validate the STS token against Huawei Cloud IAM
        from services.identity_provisioner import IdentityProvisioner
        try:
            valid = IdentityProvisioner.validate_token(
                ak=ephemeral_keys.get('ak'),
                sk=ephemeral_keys.get('sk'),
                security_token=ephemeral_keys.get('security_token'),
                region=project_data.get('targetRegion', project_data.get('region', 'la-south-2'))
            )
            return jsonify({
                "success": True,
                "valid": valid,
                "message": "STS token is valid" if valid else "STS token has expired or is invalid",
                "expires": ephemeral_keys.get('expires')
            })
        except Exception as validation_err:
            return jsonify({"success": True, "valid": False, "message": f"Validation attempted but failed: {str(validation_err)}", "expires": ephemeral_keys.get('expires')})
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
        else: return jsonify({"success": False, "error": "Landing Zone deployment failed via Huawei RFS.", "detail": rfs_result.get('error', 'No error detail provided'), "stack_id": rfs_result.get('stack_id')}), 500
        
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

@execution_bp.route('/api/executions/<project_id>/command', methods=['POST'])
@jwt_required()
def execute_delivery_command(project_id):
    """Delivery Command Interface — execute slash commands and operations."""
    data = request.json or {}
    cmd_raw = (data.get('command') or '').strip()
    context_phase = data.get('contextPhase', 'global')

    if not cmd_raw:
        return jsonify({"success": False, "error": "No command provided."}), 400

    # Load project data
    project = ProjectData.query.filter_by(id=project_id).first()
    if not project:
        return jsonify({"success": False, "error": "Project not found."}), 404

    project_dict = json.loads(project.data) if project.data else {}
    mapper_nodes = project_dict.get('mapperNodes', [])
    blueprint = project_dict.get('blueprintData', {})
    simulation = project_dict.get('simulationResult', {})

    handler = DeliveryCommandHandler(project_id, project_dict, mapper_nodes, blueprint, simulation)

    try:
        if cmd_raw == '/status':
            result = handler.cmd_status(context_phase)
        elif cmd_raw == '/preflight':
            result = handler.cmd_preflight()
        elif cmd_raw.startswith('/deploy-wave'):
            wave = cmd_raw.replace('/deploy-wave', '').strip() or '0'
            result = handler.cmd_deploy_wave(wave)
        elif cmd_raw == '/health':
            result = handler.cmd_health()
        elif cmd_raw == '/help':
            result = handler.cmd_help()
        elif cmd_raw.startswith('/simulate'):
            result = handler.cmd_simulate()
        elif cmd_raw == '/validate':
            result = handler.cmd_validate()
        else:
            result = f"[error] Unknown command: {cmd_raw}. Type /help for available commands."
    except Exception as e:
        logger.error(f"Command '{cmd_raw}' failed: {e}")
        result = f"[error] Command execution failed: {str(e)}"

    return jsonify({"success": True, "output": result})

class DeliveryCommandHandler:
    """Handles slash-commands for the Delivery Command Interface."""

    def __init__(self, project_id, project_dict, mapper_nodes, blueprint, simulation):
        self.project_id = project_id
        self.project_dict = project_dict
        self.mapper_nodes = mapper_nodes
        self.blueprint = blueprint
        self.simulation = simulation
        self.project_name = project_dict.get('name', project_id)

    def cmd_help(self):
        return (
            "Available commands:\n"
            "  /status        — Show current project state\n"
            "  /preflight     — Run Phase 4.2a preflight checks\n"
            "  /deploy-wave N — Deploy wave N (0-9)\n"
            "  /simulate      — Run agentic dry-run simulation\n"
            "  /health        — System health check\n"
            "  /validate      — Validate topology & SOW alignment\n"
            "  /help          — This help"
        )

    def cmd_status(self, phase):
        state = self.project_dict.get('lifecycleState', 'unknown')
        status = self.project_dict.get('status', 'unknown')
        mapper_count = len(self.mapper_nodes)
        sow = self.blueprint.get('topology', {})
        compute_count = len(sow.get('compute', []))
        database_count = len(sow.get('database', []))
        network_count = len(sow.get('network', []))

        sim_trace_count = len(self.simulation.get('trace', [])) if isinstance(self.simulation, dict) else 0

        return (
            f"Project: {self.project_name}\n"
            f"Lifecycle State: {state} | Status: {status}\n"
            f"Context Phase: {phase}\n"
            f"Target Resources: {mapper_count} total\n"
            f"  — Compute: {compute_count} | Databases: {database_count} | Network: {network_count}\n"
            f"Simulation Trace Entries: {sim_trace_count}"
        )

    def cmd_preflight(self):
        from services.agentic_simulator import ServerProfiler, ResourceTypeRouter
        classified = [ResourceTypeRouter.classify(n) for n in self.mapper_nodes]
        server_count = sum(1 for c in classified if c.get('resource_class') == 'SERVER')
        blocked_count = sum(1 for c in classified if c.get('resource_class') == 'UNKNOWN')
        net_count = sum(1 for c in classified if c.get('resource_class') == 'NETWORK')
        other_count = sum(1 for c in classified if c.get('resource_class') not in ('SERVER', 'NETWORK', 'UNKNOWN'))

        return (
            f"PREFLIGHT CHECK — Phase 4.2a\n"
            f"Total target resources: {len(classified)}\n"
            f"  Servers (migratable): {server_count}\n"
            f"  Network resources: {net_count}\n"
            f"  Other (CBR/HSS/DB): {other_count}\n"
            f"  Unknown (needs review): {blocked_count}\n\n"
            f"Ready to deploy? Use /deploy-wave N to start migration waves."
        )

    def cmd_deploy_wave(self, wave):
        from services.agentic_simulator import ResourceTypeRouter
        classified = [ResourceTypeRouter.classify(n) for n in self.mapper_nodes]
        servers = [n for n, c in zip(self.mapper_nodes, classified) if c.get('resource_class') == 'SERVER']

        try:
            wave_idx = int(wave)
        except:
            return f"[error] Invalid wave index: {wave}. Use /deploy-wave 0"

        wave_size = max(1, min(3, len(servers)))
        start = wave_idx * wave_size
        end = min(start + wave_size, len(servers))

        if start >= len(servers):
            return f"[error] Wave {wave_idx} is beyond available servers ({len(servers)} servers total)."

        wave_servers = servers[start:end]
        names = [s.get('name', s.get('id', '?')) for s in wave_servers]

        return (
            f"DEPLOYING WAVE {wave_idx}\n"
            f"Servers ({start+1}–{end} of {len(servers)}):\n"
            + '\n'.join(f"  — {n}" for n in names) +
            f"\n\nDeployment initiated. Monitor with /status."
        )

    def cmd_health(self):
        import os
        meminfo = {}
        try:
            with open('/proc/meminfo') as f:
                for line in f:
                    if 'MemTotal' in line or 'MemAvailable' in line or 'MemFree' in line:
                        parts = line.split()
                        meminfo[parts[0].rstrip(':')] = int(parts[1]) // 1024
        except:
            meminfo = {'MemTotal': '?', 'MemAvailable': '?'}

        avail_mb = meminfo.get('MemAvailable', '?')
        total_mb = meminfo.get('MemTotal', '?')
        pct = round((1 - avail_mb / total_mb) * 100) if isinstance(total_mb, int) and isinstance(avail_mb, int) and total_mb > 0 else '?'

        try:
            import shutil
            du = shutil.disk_usage('/')
            disk_pct = du.used / du.total * 100
            disk_free = du.free // (1024**3)
        except:
            disk_pct = '?'
            disk_free = '?'

        return (
            "SYSTEM HEALTH\n"
            f"  Memory: {pct}% used ({avail_mb} MB free)\n"
            f"  Disk: {disk_pct:.1f}% used ({disk_free} GB free)\n"
            f"  Flask PID: active"
        )

    def cmd_simulate(self):
        """Trigger a dry-run simulation and return summary."""
        from services.agentic_simulator import AgenticExecutionSimulator
        try:
            result = AgenticExecutionSimulator.simulate({
                'project_id': self.project_id,
                'mapper_nodes': self.mapper_nodes,
                'blueprint_data': self.blueprint,
                'region': self.project_dict.get('targetRegion', 'ap-southeast-3'),
            })
            trace_count = len(result.get('trace', []))
            waves = result.get('waves_count', 'N/A')
            return (
                "DRY-RUN SIMULATION COMPLETE\n"
                f"Trace entries generated: {trace_count}\n"
                f"Waves processed: {waves}\n"
                f"Check the Execution Dashboard for full trace."
            )
        except Exception as e:
            return f"[error] Simulation failed: {str(e)}"

    def cmd_validate(self):
        sow_compute = self.blueprint.get('topology', {}).get('compute', [])
        sow_db = self.blueprint.get('topology', {}).get('database', [])

        issues = []
        for node in self.mapper_nodes:
            name = node.get('name', '?')
            status = node.get('status', '')
            if status == 'Quoted Only':
                issues.append(f"  ⚠ {name} is in SOW but not in discovery (Missing SOW)")
            elif status == 'Live Only':
                issues.append(f"  ⚠ {name} is in discovery but not in SOW (Scope Creep)")

        if not issues:
            return "VALIDATION PASSED: All target resources aligned with SOW."
        return "VALIDATION ISSUES:\n" + '\n'.join(issues)


# ═══════════════════════════════════════════════════════════════════════════════
# Execution Engine API — generic, skills-and-MCP-driven execution
# Integrates with Phase 4: 4.0 (build_plan) → 4.1-4.7 (execute) → 4.8 (templates)
# ═══════════════════════════════════════════════════════════════════════════════

@execution_bp.route('/api/execution/<project_id>/build-plan', methods=['POST'])
def build_execution_plan(project_id):
    """Build execution plan from ALL previous phases (Phase 4.0 Readiness Gateway)."""
    try:
        from services.execution_engine import ExecutionEngine
        from models import ProjectData, Customer
        from routes.gateway import _decrypt_credential_pair, _decrypt_credential

        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404

        pd = json.loads(project.data or '{}') if isinstance(project.data, str) else (project.data or {})
        mapper_nodes = pd.get("mapperNodes", [])
        project_dict = {
            "id": project_id,
            "projectName": pd.get("projectName", pd.get("name", "UNNAMED")),
            "mapperNodes": mapper_nodes,
            "targetArchitecture": pd.get("targetArchitecture", {}),
            "physics": pd.get("physics", {}),
            "feasibilityAssessment": pd.get("feasibilityAssessment", {}),
            "executionMode": pd.get("executionMode", "agentic"),
            "sourceRegion": pd.get("sourceRegion", pd.get("source_region", "")),
            "region": pd.get("region", pd.get("targetRegion", "la-north-2")),
            "sourceEnvironment": pd.get("sourceEnvironment", pd.get("presales", {}).get("sourceEnvironment", "")),
            "authLevel": pd.get("authLevel", pd.get("presales", {}).get("authLevel", "")),
            "project_type": pd.get("project_type", project.project_type if hasattr(project, 'project_type') else ""),
            "manualMigWorker": pd.get("manualMigWorker", False),
            "presales": pd.get("presales", {}),
            "accountId": pd.get("accountId", ""),
            "huaweiAccountName": pd.get("huaweiAccountName", ""),
            "enterpriseProject": pd.get("enterpriseProject", ""),
            "realNameVerification": pd.get("realNameVerification", ""),
            "isPartner": pd.get("isPartner", ""),
            "mgcData": pd.get("mgcData", {}),
        }

        customer = None
        customer_id = pd.get("customerId")
        if customer_id:
            customer = Customer.query.get(customer_id)

        customer_dict = {}
        if customer:
            customer_dict = {
                "authLevel": getattr(customer, "auth_level", "") or "",
            }

        plan = ExecutionEngine.build_plan(project_dict, customer_dict)

        # Save plan to project
        pd["executionPlan"] = plan
        project.data = json.dumps(pd)
        from app import db
        db.session.commit()

        return jsonify({"success": True, "plan": plan})
    except Exception as e:
        logging.error(f"build-plan failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/execution/<project_id>/execute', methods=['POST'])
def execute_plan(project_id):
    """Execute the plan (Phase 4.1-4.7 Execution Pipeline)."""
    try:
        from services.execution_engine import ExecutionEngine
        from models import ProjectData, Customer
        from routes.gateway import _decrypt_credential_pair, _decrypt_credential

        data = request.get_json(silent=True) or {}
        dry_run = data.get("dry_run", False)

        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404

        pd = json.loads(project.data or '{}') if isinstance(project.data, str) else (project.data or {})
        plan = pd.get("executionPlan")
        if not plan:
            return jsonify({"success": False, "error": "No execution plan found. Run build-plan first."}), 400

        # Get credentials from customer
        customer_id = pd.get("customerId")
        if not customer_id:
            return jsonify({"success": False, "error": "No customer linked to project"}), 400

        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({"success": False, "error": "Customer not found"}), 404

        ak, sk = _decrypt_credential_pair(customer.ak, customer.sk)
        source_ak, source_sk = _decrypt_credential_pair(
            getattr(customer, "source_huawei_ak", None),
            getattr(customer, "source_huawei_sk", None)
        )

        credentials = {
            "ak": ak or "",
            "sk": sk or "",
            "source_ak": source_ak or ak or "",
            "source_sk": source_sk or sk or "",
            "os_user": getattr(customer, "os_user", "root") or "root",
            "os_password": _decrypt_credential(getattr(customer, "os_password", "") or "") or "",
            "source_region": getattr(customer, "source_huawei_region", "") or pd.get("sourceRegion", pd.get("source_region", "")),
            "source_project_id": getattr(customer, "source_huawei_project_id", "") or "",
        }

        result = ExecutionEngine.execute(plan, credentials, dry_run=dry_run)

        # Save execution result
        pd["executionResult"] = result
        project.data = json.dumps(pd)
        from app import db
        db.session.commit()

        # Auto-save as template if successful
        if result.get("success") and not dry_run:
            ExecutionEngine.save_template(project_id, result)

        return jsonify({"success": True, "result": result})
    except Exception as e:
        logging.error(f"execute failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/execution/<project_id>/progress', methods=['GET'])
def get_execution_progress(project_id):
    """Get live execution progress including spawn tree for GUI visualization. No JWT — GUI polls this."""
    project = ProjectData.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    data = project.data if isinstance(project.data, dict) else json.loads(project.data or "{}")
    progress = data.get("executionProgress", {"operations": [], "spawnTree": {"nodes": [], "edges": []}})
    return jsonify({"progress": progress})

@execution_bp.route('/api/execution/<project_id>/progress', methods=['POST'])
def post_execution_progress(project_id):
    """Push execution progress from external scripts (SSH-spawned agents, etc). No JWT — internal API."""
    project = ProjectData.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    data = project.data if isinstance(project.data, dict) else json.loads(project.data or "{}")
    progress = data.get("executionProgress", {"operations": [], "spawnTree": {"nodes": [], "edges": []}})
    
    # Append operation
    if body.get("operation"):
        progress["operations"].append({
            "operation": body.get("operation"),
            "status": body.get("status", "started"),
            "server": body.get("server", ""),
            "detail": body.get("detail", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    
    # Update spawn tree
    if body.get("agent_id"):
        node_id = body["agent_id"]
        existing = [n for n in progress["spawnTree"]["nodes"] if n.get("id") == node_id]
        if existing:
            existing[0]["status"] = body.get("status", "running")
        else:
            if not any(n.get("id") == "main" for n in progress["spawnTree"]["nodes"]):
                progress["spawnTree"]["nodes"].insert(0, {
                    "id": "main", "label": "Main Orchestrator", "status": "running",
                    "type": "orchestrator", "model": "glm-5.2",
                })
            progress["spawnTree"]["nodes"].append({
                "id": node_id,
                "label": body.get("label", body.get("operation", "")),
                "status": body.get("status", "started"),
                "type": body.get("type", "hermes_agent"),
                "model": body.get("model", "glm-5.2"),
                "server": body.get("server", ""),
            })
            parent = body.get("parent", "main")
            progress["spawnTree"]["edges"].append({"from": parent, "to": node_id})
    
    data["executionProgress"] = progress
    project.data = json.dumps(data)
    db.session.commit()
    return jsonify({"success": True, "progress": progress})


@execution_bp.route('/api/execution/templates', methods=['GET'])
def list_execution_templates():
    """List saved execution templates (Phase 4.8 Workbench)."""
    try:
        from services.execution_engine import ExecutionEngine
        return jsonify(ExecutionEngine.list_templates())
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/execution/templates/<template_id>', methods=['GET'])
def get_execution_template(template_id):
    """Load a saved execution template."""
    try:
        from services.execution_engine import ExecutionEngine
        return jsonify(ExecutionEngine.load_template(template_id))
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/execution/templates/<template_id>/adapt', methods=['POST'])
def adapt_execution_template(template_id):
    """Adapt a template for a new project."""
    try:
        from services.execution_engine import ExecutionEngine
        data = request.get_json(silent=True) or {}
        new_project = data.get("project", {})
        return jsonify(ExecutionEngine.adapt_template(template_id, new_project))
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# Background Orchestration Engine — fire-and-poll 7-phase pipeline
# ═══════════════════════════════════════════════════════════════════════════════

@execution_bp.route('/api/execution/<project_id>/orchestrate', methods=['POST'])
@jwt_required()
def start_orchestration(project_id):
    """Start the 7-phase migration pipeline in a background thread.

    Returns immediately with initial status. Frontend polls /orchestrate/status.
    Per-project lock prevents duplicate concurrent runs.
    """
    from services.orchestration_engine import start_pipeline, is_pipeline_running, get_pipeline_status

    if is_pipeline_running(project_id):
        return jsonify({
            'success': False,
            'error': 'Pipeline already running for this project.',
            'status': get_pipeline_status(project_id),
        }), 409

    data = request.get_json(silent=True) or {}
    start_from = data.get('start_from', 0)

    result = start_pipeline(project_id, start_from=start_from)
    code = 200 if result.get('success') else 409
    return jsonify(result), code


@execution_bp.route('/api/execution/<project_id>/orchestrate/status', methods=['GET'])
@jwt_required()
def orchestration_status(project_id):
    """Poll live pipeline status for a project. No side effects.

    Checks two sources:
    1. The orchestration engine's in-memory registry (pipelines started via /orchestrate)
    2. Running Hermes CLI processes + active Hermes sessions (external executions)
    """
    from services.orchestration_engine import get_pipeline_status
    import subprocess as _sp, re as _re, os as _os

    status = get_pipeline_status(project_id)

    # ── Also detect external Hermes processes running for this project ──
    try:
        ps = _sp.run(['ps', 'aux'], capture_output=True, text=True, timeout=10)
        external_procs = []
        for line in ps.stdout.split('\n'):
            if 'hermes' not in line or 'chat' not in line or 'grep' in line:
                continue
            parts = line.split(None, 10)
            if len(parts) < 11:
                continue
            pid = parts[1]
            cmd = parts[10]
            started = parts[8] if len(parts) > 8 else '?'

            # Match to this project: look for project_id, server names, or IPs in the command
            project = ProjectData.query.get(project_id)
            matched = False
            match_reason = ''
            if project_id in cmd:
                matched = True
                match_reason = 'project_id in command'
            elif project:
                import json as _json
                pdata = _json.loads(project.data) if isinstance(project.data, str) else (project.data or {})

                # Check server names from targetArchitecture
                ta = pdata.get('targetArchitecture', {})
                for s in (ta.get('compute', []) + ta.get('database', [])):
                    sname = s.get('name', s.get('source_name', ''))
                    if sname and sname in cmd:
                        matched = True
                        match_reason = f'server {sname} in command'
                        break

                # Check IPs from mapperNodes
                if not matched:
                    for mn in pdata.get('mapperNodes', []):
                        mn_ip = mn.get('ip', '')
                        mn_name = mn.get('name', '')
                        if mn_ip and mn_ip in cmd:
                            matched = True
                            match_reason = f'mapperNode IP {mn_ip} in command'
                            break
                        if mn_name and mn_name in cmd:
                            matched = True
                            match_reason = f'mapperNode name {mn_name} in command'
                            break

                # Check target_resource from executionPlan steps
                if not matched:
                    plan = pdata.get('executionPlan', {})
                    for step in (plan.get('steps', []) if isinstance(plan, dict) else []):
                        tr = step.get('target_resource', '')
                        if tr and tr in cmd:
                            matched = True
                            match_reason = f'execution step target {tr} in command'
                            break

                # Check source IPs from raw_inventory
                if not matched:
                    mgc = pdata.get('mgcData', {}).get('raw_inventory', {})
                    for n in mgc.get('network', []):
                        pub_ip = n.get('public_ip_address', '')
                        if pub_ip and pub_ip in cmd:
                            matched = True
                            match_reason = f'source EIP {pub_ip} in command'
                            break

                # Check source_name from targetArchitecture compute (source server IDs)
                if not matched:
                    for s in ta.get('compute', []):
                        sid = s.get('source_id', '')
                        if sid and sid in cmd:
                            matched = True
                            match_reason = f'source_id {sid} in command'
                            break

            if matched:
                external_procs.append({
                    'pid': int(pid),
                    'cmd_preview': cmd[:200],
                    'started': started,
                    'match_reason': match_reason,
                })

        # Query active Hermes sessions from state.db
        active_sessions = []
        try:
            hermes_db = _os.path.expanduser('~/.hermes/state.db')
            if _os.path.exists(hermes_db):
                sess_result = _sp.run(
                    ['sqlite3', hermes_db,
                     "SELECT id, title, message_count, tool_call_count FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 10;"],
                    capture_output=True, text=True, timeout=5
                )
                for line in sess_result.stdout.strip().split('\n'):
                    if not line:
                        continue
                    cols = line.split('|')
                    if len(cols) >= 4:
                        active_sessions.append({
                            'session_id': cols[0],
                            'title': cols[1],
                            'messages': int(cols[2]) if cols[2].isdigit() else 0,
                            'tool_calls': int(cols[3]) if cols[3].isdigit() else 0,
                        })
        except Exception:
            pass

        # ── Pull live data from Hermes sessions (running or orphaned) ──
        def _pull_session_data(sid, sessions_list):
            """Pull live feed, inferred phase, and last tool call from a Hermes session."""
            hermes_db = _os.path.expanduser('~/.hermes/state.db')
            if not _os.path.exists(hermes_db):
                return
            msg_result = _sp.run(
                ['sqlite3', hermes_db,
                 f"SELECT role, tool_name, substr(content, 1, 300) FROM messages WHERE session_id = '{sid}' ORDER BY id DESC LIMIT 15;"],
                capture_output=True, text=True, timeout=5
            )
            live_feed = []
            phase_inferred = 'PHASE_4_1'
            all_text = msg_result.stdout
            if 'SUCCESS' in all_text and ('ShowTask' in all_text or 'cutover' in all_text.lower()):
                phase_inferred = 'PHASE_4_6'
            elif 'ShowTask' in all_text or 'UpdateTaskStatus' in all_text:
                phase_inferred = 'PHASE_4_5'
            elif 'CreateTask' in all_text:
                phase_inferred = 'PHASE_4_4'
            elif 'CreateTemplate' in all_text or 'CreateServers' in all_text:
                phase_inferred = 'PHASE_4_3'
            elif 'ListServers' in all_text or 'agent' in all_text.lower() or 'linuxmain' in all_text:
                phase_inferred = 'PHASE_4_2'
            elif 'ListVpcs' in all_text or 'CreateVpc' in all_text or 'Subnet' in all_text:
                phase_inferred = 'PHASE_4_1'
            for line in msg_result.stdout.strip().split('\n'):
                if not line:
                    continue
                cols = line.split('|', 2)
                if len(cols) >= 3:
                    role = cols[0]
                    tool_name = cols[1] if cols[1] else None
                    content = cols[2]
                    msg_type = 'info'
                    if role == 'tool':
                        msg_type = 'tool'
                        if '"exit_code": 255' in content or '"error":' in content:
                            msg_type = 'error'
                        elif '"exit_code": 0' in content:
                            msg_type = 'success'
                    elif role == 'assistant':
                        msg_type = 'agent'
                    live_feed.append({'role': role, 'tool': tool_name, 'content': content[:200], 'type': msg_type})
            live_feed.reverse()
            tool_detail_result = _sp.run(
                ['sqlite3', hermes_db,
                 f"SELECT tool_name, substr(content, 1, 500) FROM messages WHERE session_id = '{sid}' AND role = 'tool' ORDER BY id DESC LIMIT 1;"],
                capture_output=True, text=True, timeout=5
            )
            last_tool = None
            if tool_detail_result.stdout.strip():
                tcols = tool_detail_result.stdout.strip().split('|', 1)
                last_tool = {'name': tcols[0] if tcols[0] else 'unknown', 'output': tcols[1][:300] if len(tcols) > 1 else ''}
            best = next((s for s in sessions_list if s['session_id'] == sid), {})
            status['live_feed'] = live_feed
            status['inferred_phase'] = phase_inferred
            status['last_tool_call'] = last_tool
            status['session_stats'] = {
                'messages': best.get('messages', 0), 'tool_calls': best.get('tool_calls', 0),
                'title': best.get('title', ''), 'session_id': sid,
            }

        def _match_project_in_text(text, pdata):
            """Check if any project data (server names, IPs, source IDs) appears in text."""
            ta = pdata.get('targetArchitecture', {})
            for s in (ta.get('compute', []) + ta.get('database', [])):
                sname = s.get('name', s.get('source_name', ''))
                if sname and sname in text:
                    return f'server {sname}'
            for mn in pdata.get('mapperNodes', []):
                mn_ip = mn.get('ip', '')
                mn_name = mn.get('name', '')
                if mn_ip and mn_ip in text:
                    return f'mapperNode IP {mn_ip}'
                if mn_name and mn_name in text:
                    return f'mapperNode name {mn_name}'
            plan = pdata.get('executionPlan', {})
            for step in (plan.get('steps', []) if isinstance(plan, dict) else []):
                tr = step.get('target_resource', '')
                if tr and tr in text:
                    return f'exec step {tr}'
            mgc = pdata.get('mgcData', {}).get('raw_inventory', {})
            for n in mgc.get('network', []):
                pub_ip = n.get('public_ip_address', '')
                if pub_ip and pub_ip in text:
                    return f'source EIP {pub_ip}'
            for s in ta.get('compute', []):
                sid = s.get('source_id', '')
                if sid and sid in text:
                    return f'source_id {sid}'
            return None

        if external_procs:
            status['external_executions'] = external_procs
            status['active_hermes_sessions'] = active_sessions
            if status.get('status') in ('idle', None):
                status['status'] = 'running_external'
            try:
                if active_sessions:
                    best_session = max(active_sessions, key=lambda s: s.get('messages', 0))
                    _pull_session_data(best_session['session_id'], active_sessions)
            except Exception as e:
                logger.warning(f"Failed to pull live session data: {e}")

        else:
            # No running process — check for orphaned sessions (process died, session has no ended_at)
            try:
                hermes_db = _os.path.expanduser('~/.hermes/state.db')
                if _os.path.exists(hermes_db):
                    orphan_result = _sp.run(
                        ['sqlite3', hermes_db,
                         "SELECT id, title, message_count, tool_call_count FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 10;"],
                        capture_output=True, text=True, timeout=5
                    )
                    orphan_sessions = []
                    for line in orphan_result.stdout.strip().split('\n'):
                        if not line:
                            continue
                        cols = line.split('|')
                        if len(cols) >= 4:
                            orphan_sessions.append({
                                'session_id': cols[0], 'title': cols[1],
                                'messages': int(cols[2]) if cols[2].isdigit() else 0,
                                'tool_calls': int(cols[3]) if cols[3].isdigit() else 0,
                            })

                    if orphan_sessions and status.get('status') in ('idle', None):
                        project = ProjectData.query.get(project_id)
                        if project:
                            import json as _json
                            pdata = _json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
                            for sess in orphan_sessions:
                                sid = sess['session_id']
                                # Check early messages for project data
                                early_msgs = _sp.run(
                                    ['sqlite3', hermes_db,
                                     f"SELECT substr(content, 1, 500) FROM messages WHERE session_id = '{sid}' ORDER BY id LIMIT 10;"],
                                    capture_output=True, text=True, timeout=5
                                )
                                reason = _match_project_in_text(early_msgs.stdout, pdata)
                                if reason:
                                    # Found an orphaned session for this project
                                    status['status'] = 'orphaned_external'
                                    status['external_executions'] = [{
                                        'pid': 0,
                                        'cmd_preview': f'Process ended. Session: {sess["title"]}',
                                        'started': 'orphaned',
                                        'match_reason': f'{reason} (process ended)',
                                    }]
                                    status['active_hermes_sessions'] = [sess]
                                    _pull_session_data(sid, [sess])
                                    logger.info(f"Found orphaned session {sid} for project {project_id}: {reason}")
                                    break
            except Exception as e:
                logger.warning(f"Failed to check orphaned sessions: {e}")

    except Exception as e:
        logger.warning(f"Failed to detect external processes: {e}")

    return jsonify({'success': True, 'status': status})


@execution_bp.route('/api/execution/<project_id>/orchestrate/resume', methods=['POST'])
@jwt_required()
def orchestration_resume(project_id):
    """Resume pipeline from the failed phase."""
    from services.orchestration_engine import resume_pipeline, is_pipeline_running

    if is_pipeline_running(project_id):
        return jsonify({'success': False, 'error': 'Pipeline already running.'}), 409

    result = resume_pipeline(project_id)
    code = 200 if result.get('success') else 400
    return jsonify(result), code


@execution_bp.route('/api/execution/<project_id>/orchestrate/rollback', methods=['POST'])
@jwt_required()
def orchestration_rollback(project_id):
    """Rollback: destroy provisioned infrastructure and reset pipeline state."""
    from services.orchestration_engine import _running_pipelines, get_pipeline_status
    from models import ExecutionState

    # Don't rollback while pipeline is running
    if get_pipeline_status(project_id).get('status') == 'running':
        return jsonify({'success': False, 'error': 'Cannot rollback while pipeline is running.'}), 409

    # Call existing rollback endpoint logic
    try:
        project_record = ProjectData.query.get(project_id)
        if not project_record:
            return jsonify({"success": False, "error": "Project not found"}), 404

        try:
            ephemeral_keys = ensure_valid_sts_token(project_record)
        except Exception as auth_err:
            return jsonify({"success": False, "error": str(auth_err)}), 403

        project_data = json.loads(project_record.data)
        region = project_data.get('region', 'la-south-2')

        rfs_result = ExecutionOrchestrator.rollback_rfs_stack(
            ak=ephemeral_keys.get('ak'), sk=ephemeral_keys.get('sk'),
            security_token=ephemeral_keys.get('security_token'),
            region=region, project_id=project_id
        )

        if rfs_result.get("success"):
            # Reset execution state
            ExecutionState.query.filter_by(project_id=project_id).update({
                'current_phase': 'PHASE_4_0', 'status': 'PENDING'
            })
            project_record.delegate_tasks = '[]'
            db.session.commit()

            # Clear in-memory pipeline state
            if project_id in _running_pipelines:
                _running_pipelines[project_id] = {
                    'status': 'idle', 'completed_phases': [], 'failed_phase': None,
                    'log': [], 'phase_status': {},
                }

        return jsonify(rfs_result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Playbook Suggestion: query past learnings for similar resource profiles ──
@execution_bp.route('/api/playbooks/suggest', methods=['POST'])
@jwt_required()
def suggest_playbook_route():
    """Suggest the best-matching playbook based on the project's resource profile.
    Queries CognitiveLearningLog for past migration patterns and returns
    the best-matching playbook template with a confidence score."""
    try:
        data = request.get_json(silent=True) or {}
        project_id = data.get('project_id')

        if project_id:
            project = ProjectData.query.filter_by(id=project_id).first()
            if not project:
                return jsonify({"success": False, "error": "Project not found"}), 404
            pdata = json.loads(project.data) if project.data else {}
            mapper_nodes = pdata.get('mapperNodes', [])
        else:
            mapper_nodes = data.get('mapperNodes', [])

        if not mapper_nodes:
            return jsonify({"success": False, "error": "No resources found. Complete Step 2 (Architecture & Scope) first."}), 400

        from services.playbook_learner import suggest_playbook
        suggestion = suggest_playbook(mapper_nodes)

        if not suggestion:
            return jsonify({"success": False, "error": "No suitable playbook found."}), 404

        return jsonify({"success": True, "suggestion": suggestion})
    except Exception as e:
        logger.error(f"Playbook suggestion failed: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# ── Playbook Learning Stats: show what the system has learned ──
@execution_bp.route('/api/playbooks/learning-stats', methods=['GET'])
@jwt_required()
def playbook_learning_stats():
    """Get statistics about auto-learned playbooks and cognitive learning logs."""
    try:
        from models import CognitiveLearningLog as CLL
        total_logs = CLL.query.count()
        success_logs = CLL.query.filter_by(success=True).count()
        pattern_logs = CLL.query.filter(CLL.error_signature.like("migration_pattern:%")).count()

        # Get strategy distribution
        from sqlalchemy import func
        strategy_rows = db.session.query(
            CLL.error_signature, func.count(CLL.id)
        ).filter(CLL.error_signature.like("migration_pattern:%")).group_by(CLL.error_signature).all()

        strategies = {}
        for sig, count in strategy_rows:
            parts = sig.split(":")
            if len(parts) >= 2:
                strategy = parts[1]
                strategies[strategy] = strategies.get(strategy, 0) + count

        # Count auto-generated playbooks
        master = GlobalPlaybooks.query.get("master")
        auto_count = 0
        total_pb = 0
        if master:
            pbs = json.loads(master.data) if isinstance(master.data, str) else master.data
            total_pb = len(pbs)
            auto_count = sum(1 for pb in pbs.values() if isinstance(pb, dict) and pb.get("auto_generated"))

        return jsonify({
            "success": True,
            "total_learnings": total_logs,
            "success_rate": round(success_logs / total_logs, 2) if total_logs > 0 else 0,
            "pattern_records": pattern_logs,
            "strategy_distribution": strategies,
            "total_playbooks": total_pb,
            "auto_learned_playbooks": auto_count,
            "manual_playbooks": total_pb - auto_count,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
