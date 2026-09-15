import os
import json
import re
import logging
import time
import subprocess
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


@execution_bp.route('/api/knowledge/search', methods=['GET'])
def search_knowledge():
    """Search knowledge entries by name, description, and tags (case-insensitive substring).
    Returns matching entries from all 3 sources.
    """
    try:
        from services.knowledge_provider import KnowledgeProvider, ExternalKnowledgeStore

        q = (request.args.get('q') or '').strip()
        if not q:
            return jsonify({"success": True, "results": [], "count": 0})

        ExternalKnowledgeStore.initialize()
        result = KnowledgeProvider.query_all()
        entries = result["entries"]
        q_lower = q.lower()

        matched = []
        for entry in entries:
            name = (entry.get("trigger") or entry.get("name") or entry.get("server_name") or "").lower()
            desc = (entry.get("description") or entry.get("purpose") or "").lower()
            tags = " ".join(entry.get("tags", []) or []).lower()
            strategy = (entry.get("strategy") or "").lower()
            service = (entry.get("service") or "").lower()
            if q_lower in name or q_lower in desc or q_lower in tags or q_lower in strategy or q_lower in service:
                matched.append({
                    "id": entry.get("id") or entry.get("name") or f"e-{hash(str(entry)) % 10000}",
                    "name": entry.get("trigger") or entry.get("name") or entry.get("server_name") or "Unknown",
                    "description": entry.get("description") or entry.get("purpose") or "",
                    "source": entry.get("source", "unknown"),
                    "category": entry.get("category") or entry.get("migration_type") or entry.get("strategy") or "General",
                    "confidence": entry.get("confidence", 0.5),
                    "usage_count": entry.get("usage_count", 0),
                    "tags": entry.get("tags", []) or [],
                })

        matched.sort(key=lambda e: -(e.get("confidence") or 0))
        return jsonify({"success": True, "results": matched, "count": len(matched)})
    except Exception as e:
        import traceback; traceback.print_exc()
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
            "enterpriseProjectId": pd.get("enterpriseProjectId", pd.get("enterprise_project_id", "")),
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
        step_id = data.get("step_id")  # Individual step execution

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

        result = ExecutionEngine.execute(plan, credentials, dry_run=dry_run, step_id=step_id)

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


@execution_bp.route('/api/execution/<project_id>/individual/action', methods=['POST'])
@jwt_required()
def individual_server_action(project_id):
    """Per-server actions for Individual Tasks mode.

    Body: {"server": "<source-server-name>", "mode": "re_deploy"|"new_target"|"rerun_steps",
           "step_ids": [..]}   (step_ids only used by rerun_steps)

    Modes:
      re_deploy   — delete ALL target ECS instances for this source server
                    ({server}-TARGET or {server}-TARGET-N), release their EIPs,
                    then reset that server's plan steps to pending so the user
                    can re-run Create ECS → SMS from scratch with the SAME config.
      new_target  — create a NEW target ECS ({server}-TARGET-N, N = next free)
                    SIDE BY SIDE with the existing one, using the same mapperNode
                    config (flavor/disk from the plan or discovered from the live
                    source). The existing target is left untouched (it may be in
                    production). Also clones the server's plan steps with
                    deployment suffix N so the user can drive SMS against the new
                    ECS without touching the old deployment.
      rerun_steps — re-execute the given step_ids for this server (or all its
                    failed/pending steps if step_ids omitted) without any teardown.
    """
    try:
        from services.execution_engine import ExecutionEngine
        from models import ProjectData, Customer
        from routes.gateway import _decrypt_credential_pair, _decrypt_credential

        data = request.get_json(silent=True) or {}
        server = (data.get("server") or "").strip()
        mode = (data.get("mode") or "").strip().lower()
        step_ids = data.get("step_ids") or []
        dry_run = data.get("dry_run", False)
        # Execute Live may ship the simulation-resolved payload so we skip re-resolving
        sim_resolved = data.get("sim_resolved") or None
        sim_target = (data.get("sim_target") or "").strip() or None
        sim_deployment = data.get("sim_deployment")
        if not server:
            return jsonify({"success": False, "error": "server required"}), 400
        if mode not in ("re_deploy", "new_target", "rerun_steps"):
            return jsonify({"success": False, "error": f"mode must be re_deploy|new_target|rerun_steps, got {mode}"}), 400

        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
        pd = json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
        plan = pd.get("executionPlan")
        if not plan:
            return jsonify({"success": False, "error": "No execution plan found. Run build-plan first."}), 400

        # ── Credentials (Customer vault, same pattern as /execute) ──
        customer_id = pd.get("customerId")
        customer = Customer.query.get(customer_id) if customer_id else None
        if not customer:
            return jsonify({"success": False, "error": "No customer linked to project"}), 400
        ak, sk = _decrypt_credential_pair(getattr(customer, "ak", None), getattr(customer, "sk", None))
        if not ak:
            return jsonify({"success": False, "error": "No target credentials for this customer"}), 400

        target_region = (pd.get("region") or pd.get("targetRegion")
                         or (plan.get("target_region") if isinstance(plan, dict) else None)
                         or "la-north-2")

        env = os.environ.copy()
        hcloud_auth_flags = ['--cli-access-key=' + ak.strip(), '--cli-secret-key=' + (sk or '').strip()]

        def hh(cmd, timeout=60, return_rc=False):
            """hcloud wrapper with per-customer auth flags (env vars are IGNORED by the CLI)."""
            full = ['hcloud'] + cmd + hcloud_auth_flags
            r = subprocess.run(full, capture_output=True, text=True, timeout=timeout, env=env)
            parsed = {}
            idx = r.stdout.find('{')
            if idx >= 0:
                try:
                    parsed = json.JSONDecoder().raw_decode(r.stdout[idx:])[0]
                except Exception:
                    try:
                        parsed = json.loads(r.stdout[idx:r.stdout.rfind('}')+1])
                    except Exception:
                        parsed = {}
            err = (r.stdout or '') + '\n' + (r.stderr or '')
            err_markers = ('[USE_ERROR]', '[CLI_ERROR]', 'error_code', 'not supported', 'InvalidParameter', 'Unauthorized')
            code = str(parsed.get('code') or parsed.get('error_code') or '')
            has_hw_err = bool(code and ('.' in code or code.upper().startswith('ERR')))
            if r.returncode != 0 or any(m in err for m in err_markers) or has_hw_err:
                parsed['_hcloud_error'] = str(parsed.get('message') or r.stderr or r.stdout)[:200]
            if return_rc:
                return parsed, r.returncode
            return parsed

        def list_ecs():
            res = hh(['ECS', 'ListServersDetails', '--cli-region=' + target_region])
            return res.get('servers') or []

        def plan_steps():
            if isinstance(plan, dict):
                return plan.get('steps') or []
            return plan if isinstance(plan, list) else []

        def server_steps(srv=None):
            srv = srv or server
            return [s for s in plan_steps() if s.get('target_resource') == srv]

        def log_activity(kind, summary, detail=None, ok=True):
            """Persist a per-server action into project.data['server_action_log'].
            Survives reloads — this is the ERP-app-visible deployment log."""
            try:
                log = pd.get('server_action_log') or []
                if not isinstance(log, list):
                    log = []
                import datetime as _dt
                entry = {
                    'ts': _dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'server': server,
                    'kind': kind,
                    'summary': summary[:400],
                    'ok': bool(ok),
                    'mode': mode,
                    'dry_run': bool(dry_run),
                }
                if detail:
                    entry['detail'] = str(detail)[:800]
                log.append(entry)
                # keep last 100 entries
                pd['server_action_log'] = log[-100:]
                if isinstance(plan, dict):
                    plan['steps'] = plan_steps()
                pd['executionPlan'] = plan
                project.data = json.dumps(pd)
                db.session.commit()
            except Exception as le:
                try:
                    logging.error(f"log_activity failed: {le}")
                except Exception:
                    pass

        # ═══════════════════════════════════════════════════════════════════
        # MODE: re_deploy — tear down this server's target(s), reset steps
        # ═══════════════════════════════════════════════════════════════════
        if mode == "re_deploy":
            deleted_ecs = []
            deleted_eips = []
            errs = []
            servers_cloud = list_ecs()
            target_prefixes = (server.upper() + '-TARGET', server + '-TARGET')
            candidates = [sv for sv in servers_cloud
                          if (sv.get('name') or '').upper().startswith(target_prefixes)]
            if not candidates:
                return jsonify({"success": True, "deleted_ecs": [], "message":
                                f"No target ECS found for '{server}' in {target_region} — nothing to tear down. Steps were reset to pending anyway."}), 200

            # ── SIMULATION: list what WOULD be deleted, make zero changes ──
            if dry_run:
                # also scan matching EIPs for the preview
                sim_eips = []
                try:
                    eips_res = hh(['EIP', 'ListPublicips/v3', '--cli-region=' + target_region])
                    for e in (eips_res.get('publicips') or []):
                        bw = (e.get('bandwidth') or {}).get('name') or ''
                        if server.lower() in bw.lower() or f"{server.lower()}-eip" == bw.lower():
                            sim_eips.append(e.get('public_ip_address'))
                except Exception:
                    pass
                steps_to_reset = len(server_steps())
                log_activity('re_deploy',
                             f"SIMULATION: Re-deploy would delete {len(candidates)} ECS "
                             f"({', '.join(sv.get('name', '?') for sv in candidates) or 'none'})"
                             + (f" + {len(sim_eips)} EIP" if sim_eips else "")
                             + f", reset {steps_to_reset} steps for '{server}' (no changes made).",
                             detail={'candidates': [sv.get('name') for sv in candidates],
                                     'eips': sim_eips, 'reset_steps': steps_to_reset},
                             ok=True)
                return jsonify({
                    "success": True,
                    "mode": "simulation",
                    "deleted_ecs": [sv.get('name') for sv in candidates],
                    "deleted_eips": sim_eips,
                    "reset_steps": steps_to_reset,
                    "message": (
                        f"✅ SIMULATION: Re-deploy would delete {len(candidates)} target ECS "
                        f"({', '.join(sv.get('name', '?') for sv in candidates)})"
                        + (f" + {len(sim_eips)} EIP" if sim_eips else "")
                        + f" and reset {steps_to_reset} plan steps for '{server}' to pending. "
                          f"Click '▶ Execute Live' to perform the teardown or cancel."
                    ),
                }), 200

            for sv in candidates:
                sv_id = sv.get('id')
                nm = sv.get('name')
                if not sv_id:
                    continue
                res = hh(['ECS', 'DeleteServers', f'--servers.1.id={sv_id}',
                          '--delete_publicip=true', '--cli-region=' + target_region])
                if res.get('_hcloud_error'):
                    errs.append(f"{nm}: {res['_hcloud_error'][:120]}")
                else:
                    deleted_ecs.append(nm)
                    # EIP bound to this ECS is auto-released; also release any
                    # standalone erp EIP whose name matches the server.
            # Release project EIPs matching this server (in case they were unbound)
            eips_res = hh(['EIP', 'ListPublicips/v3', '--cli-region=' + target_region])
            for e in (eips_res.get('publicips') or []):
                bw = (e.get('bandwidth') or {}).get('name') or ''
                if server.lower() in bw.lower() or f"{server.lower()}-eip" == bw.lower():
                    rid = e.get('id')
                    if rid:
                        rr = hh(['EIP', 'DeletePublicip', f'--publicip_id={rid}', '--cli-region=' + target_region])
                        if not rr.get('_hcloud_error'):
                            deleted_eips.append(e.get('public_ip_address'))

            # Reset this server's plan steps to pending (keeps config, clears completion)
            steps = plan_steps()
            reset_count = 0
            for s in steps:
                if s.get('target_resource') == server:
                    s['status'] = 'pending'
                    s.pop('completed_at', None)
                    s.pop('stdout', None)
                    s.pop('stderr', None)
                    reset_count += 1
            if isinstance(plan, dict):
                plan['steps'] = steps
            pd['executionPlan'] = plan
            project.data = json.dumps(pd)
            db.session.commit()

            msg = f"Re-deploy: deleted {len(deleted_ecs)} target ECS ({', '.join(deleted_ecs) or 'none'})"
            if deleted_eips:
                msg += f", released {len(deleted_eips)} EIPs ({', '.join(deleted_eips)})"
            msg += f", reset {reset_count} plan steps for '{server}' to pending."
            if errs:
                msg += f" Failures: {'; '.join(errs[:3])}"
            log_activity('re_deploy', msg,
                         detail={'deleted_ecs': deleted_ecs, 'deleted_eips': deleted_eips,
                                 'reset_steps': reset_count, 'errors': errs},
                         ok=not errs)
            return jsonify({"success": not errs, "deleted_ecs": deleted_ecs,
                            "deleted_eips": deleted_eips, "reset_steps": reset_count,
                            "message": msg}), (200 if not errs else 207)

        # ═══════════════════════════════════════════════════════════════════
        # MODE: new_target — create {server}-TARGET-{N} side by side; clone steps
        # ═══════════════════════════════════════════════════════════════════
        if mode == "new_target":
            servers_cloud = list_ecs()
            existing = [sv for sv in servers_cloud
                        if (sv.get('name') or '').upper().startswith((server.upper() + '-TARGET', server + '-TARGET'))]
            # Also count cloned plan deployments to avoid name collisions
            base_target_name = server + '-TARGET'
            used_names = {(sv.get('name') or '') for sv in existing}
            for s in server_steps():
                cmds = s.get('commands') or []
                for c in cmds if isinstance(cmds, list) else []:
                    m = re.search(r"--server\.name='([^']+TARGET[^']*)'", str(c.get('cmd', '')) if isinstance(c, dict) else '')
                    if m:
                        used_names.add(m.group(1))
            # next free N
            n = 2
            while f"{base_target_name}-{n}".upper() in {u.upper() for u in used_names}:
                n += 1
            new_target_name = f"{base_target_name}-{n}"
            # Execute Live ships the sim-resolved deployment — honor it verbatim
            # (avoids drift if the plan was rebuilt between simulate and execute).
            if sim_target and not dry_run:
                new_target_name = sim_target
            if sim_deployment and not dry_run:
                try:
                    n = int(sim_deployment)
                except Exception:
                    pass

            # Spec: from the plan's CREATE_TARGET_ECS step for this server (same config)
            step_specs = {s.get('action'): s for s in server_steps()}
            ecs_step = step_specs.get('CREATE_TARGET_ECS') or {}
            cmds0 = ecs_step.get('commands') or []
            base_cmd = ''
            if isinstance(cmds0, list) and cmds0:
                base_cmd = cmds0[0].get('cmd', '') if isinstance(cmds0[0], dict) else ''
            disk_gb = 100
            m_disk = re.search(r'--server\.root_volume\.size=(\d+)', base_cmd)
            if m_disk:
                disk_gb = int(m_disk.group(1))

            # Flavor: existing target's flavor if known, else <DISCOVERED_FLAVOR>
            # NOTE: Huawei ListServersDetails returns 'flavor' as an OBJECT
            # {id, name, vcpus, ram} — string-concat crashes if we take it raw.
            flavor_ref = '<DISCOVERED_FLAVOR>'
            for sv in existing:
                flav = sv.get('flavor') or sv.get('flavorRef') or ''
                if isinstance(flav, dict):
                    flav = flav.get('id') or flav.get('name') or ''
                if flav:
                    flavor_ref = str(flav)
                    break
            # Prefer a concrete flavor from the plan command if it was resolved
            m_flav = re.search(r'--server\.flavorRef=([^\s]+)', base_cmd)
            if m_flav and '<' not in m_flav.group(1):
                flavor_ref = m_flav.group(1)

            # Network: the SMS flow rebinds the ECS to the mig project; use the
            # same shape as the plan's base CreateServers (VPC/subnet resolved by
            # the SMS agent lane). Enterprise project: if project has one configured,
            # pin the new ECS to it. NOTE: hcloud ECS CreateServers uses
            # --server.extendparam.enterprise_project_id (NOT --server.enterprise_project_id
            # which returns [USE_ERROR]Invalid parameter).
            ep_id = pd.get('enterpriseProjectId') or pd.get('enterprise_project_id') or ''
            ep_opt = f" --server.extendparam.enterprise_project_id={ep_id}" if ep_id else ''

            tag_q = ''
            erp_tag_value = (plan.get('erp_tag_value') if isinstance(plan, dict) else None) or ''
            if erp_tag_value:
                tag_q = f"'erp-migration*{erp_tag_value}'"

            # ── RESOLVE REQUIRED PARAMS FROM LIVE CLOUD (simulate → execute) ──
            # ECS CreateServers REQUIRES: imageRef, root_volume.volumetype, vpcid.
            # Derive each from the existing target ECS + the account, so the command
            # is complete BEFORE executing — same data the agent lane would discover.
            def _ecs_detail(ecs_id):
                det = hh(['ECS', 'ShowServer', f'--server_id={ecs_id}', '--cli-region=' + target_region])
                return det.get('server') or det

            image_ref = ''
            vpc_id_res = ''
            subnet_id_res = ''
            vol_type = 'SAS'
            for sv in existing:
                sid = sv.get('id')
                if not sid:
                    continue
                det = _ecs_detail(sid)
                img = det.get('image') or {}
                if isinstance(img, dict):
                    image_ref = img.get('id') or img.get('image_id') or ''
                md = det.get('metadata') or {}
                vpc_id_res = md.get('vpc_id') or det.get('vpc_id') or ''
                if image_ref and vpc_id_res:
                    break
            # Execute Live ships the simulation-resolved params — prefer them verbatim
            # (they were verified against live cloud moments earlier and the plan may
            # have been rebuilt since; re-resolving could select a different VPC).
            if sim_resolved and not dry_run and isinstance(sim_resolved, dict):
                image_ref = sim_resolved.get('imageRef') or image_ref
                vpc_id_res = sim_resolved.get('vpcid') or vpc_id_res
                subnet_id_res = sim_resolved.get('subnet_id') or subnet_id_res
                vol_type = sim_resolved.get('volumetype') or vol_type
                if sim_resolved.get('flavor'):
                    flavor_ref = sim_resolved.get('flavor')
                if sim_resolved.get('disk_gb'):
                    try:
                        disk_gb = int(sim_resolved.get('disk_gb'))
                    except Exception:
                        pass
            # Fallbacks: image from list, vpc from account (project's own vpc or default)
            if not image_ref:
                imgs = hh(['IMS', 'ListImages', '--cli-region=' + target_region])
                for im in (imgs.get('images') or [])[:1]:
                    image_ref = im.get('id', '')
            if not vpc_id_res:
                vpcs_r = hh(['VPC', 'ListVpcs/v3', '--cli-region=' + target_region])
                vpcs_list = vpcs_r.get('vpcs') or []
                # prefer a project-named vpc, else first
                for v in vpcs_list:
                    if 'codelpa' in (v.get('name') or '').lower() or 'erp' in (v.get('name') or '').lower():
                        vpc_id_res = v.get('id', '')
                        break
                if not vpc_id_res and vpcs_list:
                    vpc_id_res = vpcs_list[0].get('id', '')
            if vpc_id_res and not subnet_id_res:
                subs_r = hh(['VPC', 'ListSubnets', '--cli-region=' + target_region])
                for s in (subs_r.get('subnets') or []):
                    if s.get('vpc_id') == vpc_id_res:
                        subnet_id_res = s.get('id', '')
                        break
            # Volume type from the existing boot volume (else default SAS)
            if existing:
                det = _ecs_detail(existing[0].get('id', ''))
                vols = det.get('os-extended-volumes:volumes_attached') or []
                if vols:
                    vid = vols[0].get('id', '')
                    if vid:
                        vr = hh(['EVS', 'ShowVolume', f'--volume_id={vid}', '--cli-region=' + target_region])
                        vol = vr.get('volume') or vr
                        vt = vol.get('volume_type') or vol.get('volumetype')
                        if vt:
                            vol_type = vt

            missing = [k for k, v in (('imageRef', image_ref), ('vpcid', vpc_id_res),
                                      ('root_volume.volumetype', vol_type)) if not v]
            if missing:
                return jsonify({
                    "success": False,
                    "error": f"Cannot build complete CreateServers command — missing required params (resolved from live cloud): {', '.join(missing)}. Check the account has an existing target ECS or image to clone from (project VPC + image).",
                    "target_name": new_target_name,
                    "resolved": {"imageRef": image_ref or None, "vpcid": vpc_id_res or None,
                                 "subnet_id": subnet_id_res or None, "volumetype": vol_type},
                }), 502

            create_cmd = (f"hcloud ECS CreateServers --server.name='{new_target_name}' "
                          f"--server.imageRef={image_ref} --server.flavorRef={flavor_ref} "
                          f"--server.vpcid={vpc_id_res} "
                          f"--server.root_volume.volumetype={vol_type} --server.root_volume.size={disk_gb} "
                          f"{('--server.nics.1.subnet_id=' + subnet_id_res + ' ') if subnet_id_res else ''}"
                          f"--server.publicip.eip.iptype=5_bgp --server.publicip.eip.bandwidth.size=100 "
                          f"{('--server.tags.1=' + tag_q + ' ') if tag_q else ''}"
                          f"--server.count=1{ep_opt} --cli-region={target_region}")

            # ── SIMULATION MODE (dry_run=true): resolve everything, return preview, NO changes ──
            if dry_run:
                # Clone plan steps into simulation preview without executing anything
                steps = plan_steps()
                max_sid = max((int(s.get('step_id') or 0) for s in steps), default=0)
                sim_clones = []
                for s in server_steps():
                    new_s = dict(s)
                    max_sid += 1
                    new_s['step_id'] = max_sid
                    new_s['deployment'] = n
                    new_s['target_ecs_name'] = new_target_name
                    new_s['status'] = 'simulated'
                    cmds = new_s.get('commands')
                    if isinstance(cmds, list):
                        for c in cmds:
                            if isinstance(c, dict) and c.get('cmd'):
                                c['cmd'] = c['cmd'].replace(base_target_name, new_target_name)
                                c['cmd'] = c['cmd'].replace(f"migrate-{server}", f"migrate-{server}-{n}")
                    sim_clones.append({'step_id': new_s['step_id'], 'action': new_s.get('action')})
                log_activity('new_target',
                             f"SIMULATION: New target {new_target_name} resolved — {flavor_ref}, {disk_gb}GB, "
                             f"image={image_ref[:12]}..., vpc={vpc_id_res[:12]}..., vol={vol_type}. "
                             f"{len(sim_clones)} steps staged for deployment #{n} (no resources created).",
                             detail={'resolved': {'imageRef': image_ref, 'flavor': flavor_ref,
                                                  'vpcid': vpc_id_res, 'subnet_id': subnet_id_res,
                                                  'volumetype': vol_type, 'disk_gb': disk_gb},
                                     'cmd': create_cmd, 'deployment': n},
                             ok=True)
                return jsonify({
                    "success": True,
                    "mode": "simulation",
                    "target_name": new_target_name,
                    "deployment": n,
                    "resolved": {"imageRef": image_ref, "flavor": flavor_ref, "vpcid": vpc_id_res,
                                 "subnet_id": subnet_id_res, "volumetype": vol_type, "disk_gb": disk_gb},
                    "cmd": create_cmd,
                    "cloned_steps": sim_clones,
                    "message": (
                        f"✅ SIMULATION: New target {new_target_name} resolved successfully. "
                        f"Params: {flavor_ref}, {disk_gb}GB, image={image_ref[:12]}..., "
                        f"vpc={vpc_id_res[:12]}..., subnet={subnet_id_res[:12]}..., vol={vol_type}. "
                        f"{len(sim_clones)} plan steps ready for deployment #{n}. "
                        f"Click '▶ Execute Live' to provision or cancel."
                    ),
                }), 200

            # ── EXECUTION MODE (default): actually create the ECS ──
            res = hh(['ECS', 'CreateServers', '--server.name=' + new_target_name,
                      '--server.imageRef=' + image_ref,
                      '--server.flavorRef=' + flavor_ref,
                      '--server.vpcid=' + vpc_id_res,
                      '--server.root_volume.volumetype=' + vol_type,
                      f'--server.root_volume.size={disk_gb}',
                      *((['--server.nics.1.subnet_id=' + subnet_id_res]) if subnet_id_res else []),
                      '--server.publicip.eip.iptype=5_bgp',
                      '--server.publicip.eip.bandwidth.size=100',
                      *((['--server.tags.1=' + tag_q]) if tag_q else []),
                      *((['--server.extendparam.enterprise_project_id=' + ep_id]) if ep_id else []),
                      '--server.count=1',
                      '--cli-region=' + target_region])
            err = res.get('_hcloud_error') or ''
            if err:
                return jsonify({"success": False, "error": f"CreateServers failed: {err[:300]}",
                                "target_name": new_target_name, "cmd": create_cmd,
                                "resolved": {"imageRef": image_ref, "vpcid": vpc_id_res,
                                             "subnet_id": subnet_id_res, "volumetype": vol_type}}), 502

            # Verify creation by name (ListServersDetails may lag; poll up to ~60s).
            # Compare case-insensitively — Huawei may normalize the ECS name casing.
            new_ecs_id = ''
            wanted_upper = (new_target_name or '').upper()
            for _ in range(12):
                time.sleep(5)
                for sv in list_ecs():
                    if (sv.get('name') or '').upper() == wanted_upper:
                        new_ecs_id = sv.get('id', '')
                        break
                if new_ecs_id:
                    break

            # Clone the server's plan steps → deployment suffix N, appended to plan
            steps = plan_steps()
            max_sid = max((int(s.get('step_id') or 0) for s in steps), default=0)
            clones = []
            for s in server_steps():
                new_s = {k: (v[:200] if isinstance(v, str) else v) for k, v in s.items()}
                max_sid += 1
                new_s['step_id'] = max_sid
                new_s['status'] = 'pending'
                new_s['deployment'] = n
                new_s['target_ecs_name'] = new_target_name
                # rewrite ECS name + task names in commands to the new deployment
                cmds = new_s.get('commands')
                if isinstance(cmds, list):
                    for c in cmds:
                        if isinstance(c, dict) and c.get('cmd'):
                            c['cmd'] = c['cmd'].replace(base_target_name, new_target_name)
                            c['cmd'] = c['cmd'].replace(f"migrate-{server}", f"migrate-{server}-{n}")
                new_s['source_detail'] = f"🔁 Deployment #{n} (new target {new_target_name}) — " + str(s.get('source_detail', ''))[:120]
                clones.append(new_s)
            steps.extend(clones)
            if isinstance(plan, dict):
                plan['steps'] = steps
            pd['executionPlan'] = plan
            project.data = json.dumps(pd)
            db.session.commit()

            log_activity('new_target',
                         f"New target {new_target_name} created ({flavor_ref}, {disk_gb}GB)"
                         + (f", id {new_ecs_id}" if new_ecs_id else ", id pending (creation accepted)")
                         + f". {len(clones)} steps cloned as deployment #{n}.",
                         detail={'target_name': new_target_name, 'ecs_id': new_ecs_id,
                                 'flavor': flavor_ref, 'disk_gb': disk_gb,
                                 'resolved': {'imageRef': image_ref, 'vpcid': vpc_id_res,
                                              'subnet_id': subnet_id_res, 'volumetype': vol_type},
                                 'deployment': n, 'cloned_steps': len(clones)})

            return jsonify({
                "success": True,
                "mode": "new_target",
                "target_name": new_target_name,
                "ecs_id": new_ecs_id,
                "flavor": flavor_ref,
                "disk_gb": disk_gb,
                "deployment": n,
                "cloned_steps": [{"step_id": c['step_id'], "action": c.get('action')} for c in clones],
                "message": (f"New target {new_target_name} created ({flavor_ref}, {disk_gb}GB)"
                            + (f", id {new_ecs_id}" if new_ecs_id else ", id pending (creation accepted)")
                            + f". {len(clones)} steps cloned as deployment #{n} — run Start SMS against the new ECS; the original deployment is untouched."),
            }), 200

        # ═══════════════════════════════════════════════════════════════════
        # MODE: rerun_steps — re-execute failed/pending/selected steps, no teardown
        # ═══════════════════════════════════════════════════════════════════
        if mode == "rerun_steps":
            steps = plan_steps()
            if step_ids:
                targets = [s for s in steps if str(s.get('step_id')) in {str(x) for x in step_ids}]
            else:
                # all steps for this server that are not completed_by_cloud
                targets = [s for s in server_steps()
                           if s.get('status') in ('failed', 'pending', None, 'skipped')]
            if not targets:
                return jsonify({"success": True, "reran": [], "message": f"No steps to re-run for '{server}'."}), 200

            # ── SIMULATION: list which steps would re-run, execute nothing ──
            if dry_run:
                preview = []
                for s in targets:
                    cmds = s.get('commands') or []
                    cmd = ''
                    if isinstance(cmds, list) and cmds:
                        first = cmds[0]
                        cmd = first.get('cmd', '') if isinstance(first, dict) else str(first)
                    if not cmd:
                        cmd = s.get('command') or s.get('cmd') or ''
                    templated = ('<' in cmd and '>' in cmd)
                    preview.append({
                        'step_id': s.get('step_id'),
                        'action': s.get('action'),
                        'phase': s.get('phase'),
                        'status': s.get('status'),
                        'would_run': bool(cmd and not templated),
                        'blocked_templated': templated,
                    })
                n_run = sum(1 for p in preview if p['would_run'])
                n_block = sum(1 for p in preview if p['blocked_templated'])
                log_activity('rerun_steps',
                             f"SIMULATION: {len(preview)} steps queued for '{server}' "
                             f"({n_run} would execute, {n_block} templated→agent lane, no changes made).",
                             detail={'preview': preview}, ok=True)
                return jsonify({
                    "success": True,
                    "mode": "simulation",
                    "reran_preview": preview,
                    "message": (
                        f"✅ SIMULATION: Re-run Steps for '{server}' — {len(preview)} steps queued "
                        f"({n_run} would execute, {n_block} templated→agent lane). Click '▶ Execute Live' to run them or cancel."
                    ),
                }), 200

            results_ran = []
            for s in targets:
                sid = s.get('step_id')
                cmds = s.get('commands') or []
                cmd = ''
                if isinstance(cmds, list) and cmds:
                    first = cmds[0]
                    cmd = first.get('cmd', '') if isinstance(first, dict) else str(first)
                if not cmd:
                    cmd = s.get('command') or s.get('cmd') or ''
                if not cmd:
                    results_ran.append({"step_id": sid, "action": s.get('action'), "status": "skipped", "error": "no command"})
                    continue
                # Substitute live ids where possible: target ECS id from cloud for CREATE_TARGET_ECS-less steps
                full = cmd
                if '<' in full and '>' in full:
                    # Templated — leave to agent lane; mark blocked (not failed)
                    results_ran.append({"step_id": sid, "action": s.get('action'),
                                        "status": "blocked", "error": "templated placeholders (<id>) — run via agent lane or after Create ECS"})
                    continue
                r = subprocess.run(full, shell=True, capture_output=True, text=True, timeout=120,
                                   env={**os.environ.copy(), 'HW_ACCESS_KEY': ak, 'HW_SECRET_KEY': sk or ''})
                ok = r.returncode == 0
                results_ran.append({"step_id": sid, "action": s.get('action'),
                                    "status": "success" if ok else "failed",
                                    "stdout": r.stdout[:300], "stderr": r.stderr[:300] if r.stderr else ''})
                s['status'] = 'success' if ok else 'failed'
            if isinstance(plan, dict):
                plan['steps'] = steps
            pd['executionPlan'] = plan
            project.data = json.dumps(pd)
            db.session.commit()

            ok_count = sum(1 for r in results_ran if r.get('status') == 'success')
            log_activity('rerun_steps',
                         f"Re-ran {len(results_ran)} steps for '{server}' ({ok_count} ok).",
                         detail={'results': results_ran, 'ok': ok_count, 'total': len(results_ran)})
            return jsonify({"success": True, "reran": results_ran,
                            "message": f"Re-ran {len(results_ran)} steps for '{server}' ({ok_count} ok)."}), 200

    except Exception as e:
        logging.error(f"individual action failed: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/execution/<project_id>/action-log', methods=['GET'])
@jwt_required()
def get_server_action_log(project_id):
    """Return the persistent server action log for this project."""
    project = ProjectData.query.get(project_id)
    if not project:
        return jsonify({'success': False, 'error': 'Project not found'}), 404
    pd = json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
    log = pd.get('server_action_log') or []
    server = request.args.get('server')
    if server:
        log = [e for e in log if e.get('server', '').lower() == server.lower()]
    return jsonify({'success': True, 'log': log[-100:]})


@execution_bp.route('/api/execution/<project_id>/progress', methods=['GET'])
def get_execution_progress(project_id):
    """Get live execution progress including spawn tree for GUI visualization.

    AUTHORITATIVE SOURCE: the orchestration engine's in-memory pipeline state
    (phase_status / current_phase / completed_phases) — one agent node per phase,
    real status. This is NOT stored in project data because the GUI autosave
    (POST /api/erp/projects) overwrites the whole data blob with a stale copy,
    silently erasing engine-written fields like executionProgress.
    """
    try:
        from services.orchestration_engine import get_pipeline_status
        status = get_pipeline_status(project_id) or {}
        import re as _re
        # ── DB HYDRATION: if in-memory registry is empty (Flask restarted or
        # page refreshed mid-run), fall back to the persisted ExecutionState +
        # last_pipeline_log so the spawn tree still shows real progress.
        if not status.get('log') and not (status.get('completed_phases') or []):
            try:
                import json as _pj
                from models import ExecutionState
                _row = ExecutionState.query.filter_by(project_id=project_id).first()
                if _row:
                    status['current_phase'] = _row.current_phase
                    if _row.current_phase and _row.status in ('IN_PROGRESS', 'RUNNING', 'PAUSED'):
                        status['status'] = 'running' if _row.status != 'PAUSED' else 'paused'
                    db_status = (getattr(_row, 'status', '') or '').upper()
                    if db_status == 'PAUSED':
                        status['status'] = 'paused'
                    if _row.last_pipeline_log:
                        try:
                            _plog = _pj.loads(_row.last_pipeline_log)
                            if isinstance(_plog, list):
                                status['log'] = _plog
                                # derive completed phases from [done] lines
                                _done = set()
                                for _l in _plog:
                                    _s = str(_l)
                                    if '[done]' in _s:
                                        for _n in range(1, 8):
                                            if f'PHASE_4_{_n}' in _s or f'4.{_n}' in _s:
                                                _done.add(f'PHASE_4_{_n}')
                                if _done:
                                    status['completed_phases'] = sorted(_done, key=lambda p: int(p.split('_')[-1]))
                        except Exception:
                            pass
            except Exception:
                pass
        # Build spawn tree from real pipeline state: main -> one node per phase
        phases = []
        for n in range(1, 8):
            pk = f'PHASE_4_{n}'
            ps = (status.get('phase_status') or {}).get(pk)
            st = (status.get('completed_phases') or [])
            if pk in st:
                st_ = 'succeeded'
            elif ps == 'failed' or pk == status.get('failed_phase'):
                st_ = 'failed'
            elif pk == status.get('current_phase') and status.get('status') in ('running', 'running_external'):
                st_ = 'running'
            else:
                st_ = 'pending'
            phases.append({'id': f'agent_{pk.lower()}', 'label': f'4.{n}', 'status': st_})
        nodes = [{'id': 'main', 'label': 'Main Orchestrator', 'status': 'running', 'model': 'glm-5.1'}]
        edges = []
        for ph in phases:
            nodes.append({**ph, 'model': 'glm-5.1'})
            edges.append({'from': 'main', 'to': ph['id']})
        # Operations from the live log (last 20 entries, tagged)
        ops = []
        for l in (status.get('log') or [])[-20:]:
            s = str(l)
            tag = 'started'
            if '[done]' in s:
                tag = 'succeeded'
            elif '[fail]' in s or '[gate]' in s:
                tag = 'failed'
            elif '[det]' in s:
                tag = 'info'
            ops.append({'operation': s[:90], 'status': tag, 'server': '', 'detail': ''})
        return jsonify({"progress": {"spawnTree": {"nodes": nodes, "edges": edges}, "operations": ops}})
    except Exception as e:
        logger.warning(f"progress endpoint failed: {e}")
        return jsonify({"progress": {"spawnTree": {"nodes": [], "edges": []}, "operations": []}})

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
    restart_phase = data.get('restart_phase')  # e.g. 'PHASE_4_1' forces re-run of that phase

    result = start_pipeline(project_id, start_from=start_from, restart_phase=restart_phase)
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

    # ── DB HYDRATION: if in-memory has no log (Flask restarted or page refreshed),
    # load the persisted pipeline log blob saved by the engine at run end.
    if not status.get('log'):
        try:
            import json as _j
            from models import ExecutionState
            st_row = ExecutionState.query.filter_by(project_id=project_id).first()
            if st_row:
                status['current_phase'] = st_row.current_phase
                if st_row.last_pipeline_log:
                    try:
                        plog = _j.loads(st_row.last_pipeline_log)
                        if isinstance(plog, list):
                            status['log'] = plog
                            # Expose the latest [output] line as the agent report
                            for _e in reversed(plog):
                                if _e.startswith('[output] '):
                                    status['agent_report'] = _e[9:]
                                    break
                    except Exception:
                        status['log'] = []
                completed = set()
                for l in status.get('log', []):
                    if l.startswith('[done]'):
                        # Match phase by label or fallback key
                        for n in range(1, 8):
                            pk = f'PHASE_4_{n}'
                            if pk in l or f'4.{n}' in l:
                                completed.add(pk)
                        if 'Network' in l:
                            completed.add('PHASE_4_1')
                        elif 'Source Prep' in l:
                            completed.add('PHASE_4_2')
                        elif 'Target' in l and 'PHASE_4_3' not in str(completed):
                            completed.add('PHASE_4_3')
                        elif 'Data Sync' in l:
                            completed.add('PHASE_4_4')
                        elif 'Monitor' in l or 'Sync Monitor' in l:
                            completed.add('PHASE_4_5')
                        elif 'Cutover' in l or 'Cold Cutover' in l:
                            completed.add('PHASE_4_6')
                        elif 'Teardown' in l or 'Garbage' in l or 'Trace Preservation' in l:
                            completed.add('PHASE_4_8')
                        elif 'Reconcil' in l:
                            completed.add('PHASE_4_7')
                if completed:
                    status['completed_phases'] = sorted(completed, key=lambda p: int(p.split('_')[-1]))
                    status['phase_status'] = {p: 'completed' for p in completed}
                    status['status'] = 'completed'
                elif not status.get('status') or status.get('status') in ('idle', None):
                    status['status'] = 'idle'
        except Exception as e:
            logger.warning(f"DB hydration failed: {e}")

    # ── Also detect external execution processes running for this project ──
    # Catches: hermes chat, sms_migration_engine.py, hcloud SMS, any migration script
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

    try:
        ps = _sp.run(['ps', 'aux'], capture_output=True, text=True, timeout=10)
        external_procs = []
        for line in ps.stdout.split('\n'):
            if 'grep' in line:
                continue
            # Match hermes chat OR migration-related Python scripts OR hcloud SMS
            is_hermes = 'hermes' in line and 'chat' in line
            is_migration_script = 'migration' in line.lower() and 'python' in line and 'app.py' not in line
            is_hcloud_sms = 'hcloud' in line and 'SMS' in line
            if not (is_hermes or is_migration_script or is_hcloud_sms):
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

                # For migration scripts, also try reading the script file for project data
                if not matched and 'migration' in cmd.lower():
                    try:
                        # Extract script path from command
                        script_path = None
                        for part in cmd.split():
                            if part.endswith('.py') and os.path.exists(part):
                                script_path = part
                                break
                        if script_path:
                            with open(script_path, 'r') as f:
                                script_content = f.read()[:5000]
                            # Check if project data appears in the script
                            reason = _match_project_in_text(script_content, pdata)
                            if reason:
                                matched = True
                                match_reason = f'{reason} in script file'
                    except Exception:
                        pass

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
                 f"SELECT role, tool_name, substr(content, 1, 300), printf('%.0f', timestamp) FROM messages WHERE session_id = '{sid}' ORDER BY id DESC LIMIT 15;"],
                capture_output=True, text=True, timeout=5
            )
            live_feed = []
            phase_inferred = 'PHASE_4_1'
            all_text = msg_result.stdout
            # IMPORTANT: the word 'agent' ALWAYS appears in every spawn's system
            # prompt ('migration execution agent', 'SMS agent install') — so it
            # must NOT be used alone to infer PHASE_4_2. Only real SMS-side tool
            # activity counts: linuxmain process, SMS-Agent path, ListServers API.
            # Network patterns (4.1) are checked FIRST because a 4.1 agent's
            # survey commands (ListVpcs/Subnet) are the ground truth of its phase.
            if 'SUCCESS' in all_text and ('ShowTask' in all_text or 'cutover' in all_text.lower()):
                phase_inferred = 'PHASE_4_6'
            elif 'ShowTask' in all_text or 'UpdateTaskStatus' in all_text:
                phase_inferred = 'PHASE_4_5'
            elif 'CreateTask' in all_text:
                phase_inferred = 'PHASE_4_4'
            elif 'CreateTemplate' in all_text or 'CreateServers' in all_text:
                phase_inferred = 'PHASE_4_3'
            elif 'linuxmain' in all_text or 'SMS-Agent' in all_text or 'ListServers' in all_text:
                phase_inferred = 'PHASE_4_2'
            elif 'ListVpcs' in all_text or 'CreateVpc' in all_text or 'Subnet' in all_text:
                phase_inferred = 'PHASE_4_1'
            for line in msg_result.stdout.strip().split('\n'):
                if not line:
                    continue
                cols = line.split('|', 3)
                if len(cols) >= 3:
                    role = cols[0]
                    tool_name = cols[1] if cols[1] else None
                    content = cols[2]
                    ts_raw = cols[3] if len(cols) > 3 else ''
                    # Convert epoch seconds to ISO format for the frontend
                    msg_ts = ''
                    if ts_raw and ts_raw.replace('.', '').isdigit():
                        try:
                            from datetime import datetime as _dt, timezone as _tz
                            msg_ts = _dt.fromtimestamp(float(ts_raw), tz=_tz.utc).strftime('%m-%d %H:%M:%S')
                        except Exception:
                            msg_ts = ''
                    msg_type = 'info'
                    if role == 'tool':
                        msg_type = 'tool'
                        if '"exit_code": 255' in content or '"error":' in content:
                            msg_type = 'error'
                        elif '"exit_code": 0' in content:
                            msg_type = 'success'
                    elif role == 'assistant':
                        msg_type = 'agent'
                    live_feed.append({'role': role, 'tool': tool_name, 'content': content[:200], 'type': msg_type, 'ts': msg_ts})
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
            # Get last message timestamp from the feed
            last_msg_ts = live_feed[-1]['ts'] if live_feed else ''
            status['session_stats'] = {
                'messages': best.get('messages', 0), 'tool_calls': best.get('tool_calls', 0),
                'title': best.get('title', ''), 'session_id': sid,
                'last_activity': last_msg_ts,
            }
            # Add current poll time so frontend knows data is fresh
            from datetime import datetime as _dt, timezone as _tz
            status['polled_at'] = _dt.now(_tz.utc).strftime('%m-%d %H:%M:%S')

        # ── STALENESS FILTER: only show external execution if activity is RECENT (< 3 min) ──
        # Historical sessions (from previous runs) must NOT render as "live" — confusing in the terminal panel.
        import time as _time_mod
        _now_epoch = _time_mod.time()
        _recent_external = []
        _recent_sessions = []
        for _proc in (external_procs or []):
            _pid = _proc.get('pid') or 0
            if _pid <= 0:
                continue  # ended process — not live
            _recent_external.append(_proc)
        for _sess in (active_sessions or []):
            _sid = _sess.get('session_id', '')
            if not _sid:
                continue
            try:
                _sess_db = _os.path.expanduser('~/.hermes/state.db')
                _r = _sp.run(
                    ['sqlite3', _sess_db,
                     f"SELECT printf('%.0f', MAX(timestamp)) FROM messages WHERE session_id = '{_sid}';"],
                    capture_output=True, text=True, timeout=5
                )
                _last_ts = _r.stdout.strip()
                if _last_ts.isdigit():
                    _age = _now_epoch - float(_last_ts)
                    if _age <= 180:  # < 3 minutes = active
                        _recent_sessions.append(_sess)
            except Exception:
                pass
        external_procs = _recent_external
        active_sessions = _recent_sessions

        if external_procs:
            status['external_executions'] = external_procs
            status['active_hermes_sessions'] = active_sessions
            if status.get('status') in ('idle', None):
                status['status'] = 'running_external'
            # Only emit inferred_phase if we actually collected session data (not the default)
            if not (status.get('inferred_phase') and len(status.get('live_feed', [])) > 0):
                status['inferred_phase'] = None
                status['live_feed'] = []
                status['session_stats'] = None
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
                         "SELECT s.id, s.title, s.message_count, s.tool_call_count, CAST(MAX(m.timestamp) AS INTEGER) as last_msg FROM sessions s LEFT JOIN messages m ON m.session_id = s.id WHERE s.ended_at IS NULL GROUP BY s.id HAVING last_msg > CAST(strftime('%s','now') AS INTEGER) - 7200 ORDER BY last_msg DESC LIMIT 10;"],
                        capture_output=True, text=True, timeout=5
                    )
                    orphan_sessions = []
                    for line in orphan_result.stdout.strip().split('\n'):
                        if not line:
                            continue
                        cols = line.split('|')
                        if len(cols) >= 4:
                            sess = {
                                'session_id': cols[0], 'title': cols[1],
                                'messages': int(cols[2]) if cols[2].isdigit() else 0,
                                'tool_calls': int(cols[3]) if cols[3].isdigit() else 0,
                            }
                            # Parse last message timestamp if present (5th column)
                            if len(cols) > 4 and cols[4].replace('.', '').isdigit():
                                try:
                                    from datetime import datetime as _dt, timezone as _tz
                                    sess['last_msg_ts'] = _dt.fromtimestamp(float(cols[4]), tz=_tz.utc).strftime('%m-%d %H:%M:%S')
                                except Exception:
                                    pass
                            orphan_sessions.append(sess)

                    if orphan_sessions and status.get('status') in ('idle', None):
                        project = ProjectData.query.get(project_id)
                        if project:
                            import json as _json
                            pdata = _json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
                            import time as _tmod
                            _now_orphan = _tmod.time()
                            for sess in orphan_sessions:
                                sid = sess['session_id']
                                # ── STALENESS FILTER: skip orphan sessions with no recent activity (> 3 min) ──
                                try:
                                    _sess_db = _os.path.expanduser('~/.hermes/state.db')
                                    _r = _sp.run(
                                        ['sqlite3', _sess_db,
                                         f"SELECT printf('%.0f', MAX(timestamp)) FROM messages WHERE session_id = '{sid}';"],
                                        capture_output=True, text=True, timeout=5
                                    )
                                    _last_ts = _r.stdout.strip()
                                    if _last_ts.isdigit() and (_now_orphan - float(_last_ts)) > 180:
                                        continue  # stale session > 3 min old — skip
                                except Exception:
                                    pass
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

    # ── Add started_at timestamp for elapsed timer ──
    try:
        _es = ExecutionState.query.filter_by(project_id=project_id).first()
        if _es and _es.last_active_at:
            status['started_at'] = _es.last_active_at.isoformat()
            # Elapsed time
            from datetime import datetime, timezone
            _started = _es.last_active_at
            if _started.tzinfo is None:
                _started = _started.replace(tzinfo=timezone.utc)
            _elapsed = (datetime.now(timezone.utc) - _started).total_seconds()
            status['elapsed_seconds'] = round(_elapsed, 1)
            status['elapsed_display'] = f"{int(_elapsed//60)}m {int(_elapsed%60)}s"
    except Exception:
        pass

    # ── Progress bar ──
    try:
        _completed = len(status.get('completed_phases', []))
        _total = 8  # 8 phases in the pipeline
        status['progress_pct'] = round(_completed / _total * 100, 1)
        status['completed_count'] = _completed
        status['total_phases'] = _total
    except Exception:
        pass

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
    """Rollback: enumerate selectively delete, and reset.

    Accepts optional body: {"resources": "all"} or {"resources": [id,...]}.
    Without body, previews resources found. Deletes in dependency order:
      subnets → SGs → VPC → EIPs. Resets execution state + delegate_tasks.
    """
    from services.orchestration_engine import _running_pipelines, get_pipeline_status
    from models import ExecutionState
    import subprocess as _sp, json as _json, os as _os

    if get_pipeline_status(project_id).get('status') == 'running':
        return jsonify({'success': False, 'error': 'Cannot rollback while pipeline is running.'}), 409

    try:
        project_record = ProjectData.query.get(project_id)
        if not project_record:
            return jsonify({'success': False, 'error': 'Project not found'}), 404

        project_data = _json.loads(project_record.data) if isinstance(project_record.data, str) else (project_record.data or {})
        target_region = project_data.get('region') or project_data.get('targetRegion') or 'la-north-2'

        # Decrypt credentials from customer vault
        from models import Customer
        customer_id = project_data.get('customerId')
        target_ak = target_sk = None
        if customer_id:
            cust = Customer.query.get(customer_id)
            if cust and cust.ak:
                try:
                    from services.credential_manager import get_credential_manager
                    cm = get_credential_manager(_os.environ.get('VAULT_MASTER_PASSWORD', 'LatamCloudAdmin2026!'))
                    enc = _json.loads(cust.ak) if isinstance(cust.ak, str) and cust.ak.startswith('{') else None
                    if enc and 'encrypted_ak' in enc:
                        target_ak, target_sk = cm.decrypt_credentials(enc)
                except Exception:
                    pass
                if not target_ak:
                    target_ak, target_sk = cust.ak, cust.sk
        if not target_ak:
            return jsonify({'success': False, 'error': 'No credentials for rollback'}), 400

        env = _os.environ.copy()
        # NOTE: hcloud CLI ignores HW_ACCESS_KEY/HW_SECRET_KEY env vars. It uses
        # only its own ~/.hcloud/config.json profile. The only way to bind a
        # per-customer credential is the --cli-access-key and --cli-secret-key flags.
        # We inject them into every hcloud call via the h() helper.
        ak_flag = target_ak.split()[0].strip() if target_ak else ''
        sk_flag = (target_sk or '').split()[0].strip() if target_sk else ''
        hcloud_auth_flags = []
        if ak_flag and sk_flag:
            hcloud_auth_flags = ['--cli-access-key=' + ak_flag, '--cli-secret-key=' + sk_flag]

        def h(cmd, timeout=30, return_rc=False):
            try:
                full_cmd = ['hcloud'] + cmd + hcloud_auth_flags
                r = _sp.run(full_cmd, capture_output=True, text=True, timeout=timeout, env=env)
                parsed = {}
                idx = r.stdout.find('{')
                if idx >= 0:
                    try:
                        dec = _json.JSONDecoder()
                        parsed, _ = dec.raw_decode(r.stdout[idx:])
                    except Exception:
                        try:
                            parsed = _json.loads(r.stdout[idx:r.stdout.rfind('}')+1])
                        except Exception:
                            parsed = {}
                # Robust error detection — hcloud CLI quirks:
                #  * [USE_ERROR]Operation not supported prints to stdout with EXIT 0
                #  * Some APIs return {error_code: ERR.XXX} with rc 0
                #  * Huawei error JSON: {"code": "VPC.0112", "message": "..."} with rc 0
                #  * stderr may carry the real error even when rc==0
                err_markers = ('[USE_ERROR]', '[CLI_ERROR]', 'error_code', '"error"', '"error_msg"',
                               'not supported', 'is not supported', 'InvalidParameter', 'Unauthorized')
                combined_out = (r.stdout or '') + '\n' + (r.stderr or '')
                # Huawei error JSON detection: code like "XXX.NNNN" + message
                has_hw_error = False
                if isinstance(parsed, dict):
                    code = str(parsed.get('code') or parsed.get('error_code') or '')
                    has_hw_error = bool(code and ('.' in code or code.upper().startswith('ERR')))
                if r.returncode != 0 or any(m in combined_out for m in err_markers) or has_hw_error:
                    if not parsed.get('code') and not parsed.get('error_code'):
                        parsed.setdefault('_hcloud_error', (r.stderr or r.stdout)[:200] or 'hcloud error')
                    elif has_hw_error:
                        parsed.setdefault('_hcloud_error', str(parsed.get('message') or parsed)[:200])
                if return_rc:
                    return parsed, r.returncode
                return parsed, ''
            except Exception as e:
                return {}, str(e)

        data = request.get_json(silent=True) or {}
        resources = data.get('resources', [])
        phase_filter = data.get('phase')   # optional: 'PHASE_4_1'..'PHASE_4_7' → per-phase rollback
        # For per-phase rollback, collect that phase's target resource names from the plan
        phase_resources = []
        phase_actions = set()
        if phase_filter:
            try:
                _saved_plan = project_data.get('executionPlan') or {}
                if isinstance(_saved_plan, dict):
                    _steps = _saved_plan.get('steps') or []
                elif isinstance(_saved_plan, list):
                    _steps = _saved_plan
                else:
                    _steps = []
                for _s in _steps:
                    if isinstance(_s, dict) and _s.get('phase') == phase_filter:
                        _tr = _s.get('target_resource')
                        if _tr and _tr not in ('all', 'unknown', 'kms-key', 'mig-worker-target'):
                            phase_resources.append(_tr)
                        phase_actions.add(_s.get('action', ''))
            except Exception:
                pass
            # If phase resources resolved, restrict deletion to them
            if phase_resources:
                # Store for should_del but do NOT set resources here — the preview/execute
                # decision at 'if not resources:' must use the ORIGINAL resources value,
                # not phase-derived. User must explicitly send resources: 'all' to execute
                # a phase rollback (preview is automatic with just phase=).
                pass

        found = {'vpcs': [], 'subnets': [], 'security_groups': [], 'eips': [], 'ecs': []}
        # Load the unique per-build tag value from the saved execution plan
        # (set by build_plan: erp-migration-<project8>-<timestamp>). Only
        # resources carrying THIS tag value are candidates for rollback.
        erp_tag_value = None
        try:
            saved_plan = _json.loads(project_record.execution_plan) if getattr(project_record, 'execution_plan', None) else (project_data.get('executionPlan') or {})
            if isinstance(saved_plan, dict):
                erp_tag_value = saved_plan.get('erp_tag_value')
            elif isinstance(saved_plan, list):
                for s in saved_plan:
                    if isinstance(s, dict) and s.get('erp_tag_value'):
                        erp_tag_value = s['erp_tag_value']
                        break
        except Exception:
            pass
        def has_erp_tag(resource):
            tags = resource.get('tags')
            if isinstance(tags, list):
                for t in tags:
                    if isinstance(t, dict) and t.get('key') == 'erp-migration':
                        val = str(t.get('value', ''))
                        # Exact match on stored unique value, or any erp-migration
                        # value (defensive) — the key alone is already our marker.
                        if val.startswith('erp-migration-'):
                            return True
                    if isinstance(t, str) and 'erp-migration-*' in t:
                        return True
            if isinstance(tags, dict) and str(tags.get('erp-migration', '')).startswith('erp-migration-'):
                return True
            return False
        def erp_named(resource):
            n = (resource.get('name') or '').lower()
            return n.startswith('erp-sms') or n.startswith('latam-erp') or n in ('vpc-default', 'subnet-default', 'default')
        for v in (h(['VPC','ListVpcs/v3','--cli-region='+target_region])[0].get('vpcs') or []):
            if has_erp_tag(v) or erp_named(v):
                found['vpcs'].append({'id': v['id'], 'name': v.get('name')})
        for s in (h(['VPC','ListSubnets','--cli-region='+target_region])[0].get('subnets') or []):
            # Subnets inherit VPC — only include if parent VPC is ERP-tagged
            # But VPC isn't included until after we enumerate all. Track VPC IDs.
            found['subnets'].append({'id': s['id'], 'name': s.get('name'), 'vpc_id': s.get('vpc_id')})
        # Filter subnets to only those whose VPC is in found['vpcs']
        vpc_ids = {v['id'] for v in found['vpcs']}
        found['subnets'] = [s for s in found['subnets'] if s['vpc_id'] in vpc_ids]
        for sg in (h(['VPC','ListSecurityGroups/v3','--cli-region='+target_region])[0].get('security_groups') or []):
            if has_erp_tag(sg) or sg.get('name', '').startswith('erp-') or sg.get('name', '').startswith('latam-erp'):
                found['security_groups'].append({'id': sg['id'], 'name': sg.get('name')})
        for e in (h(['EIP','ListPublicips/v3','--cli-region='+target_region])[0].get('publicips') or []):
            # Tagged, OR carries our naming signature: bandwidth named '<ip>-eip'
            # (the agent's create pattern), OR has erp-* name. Unbound EIPs with
            # the -eip name suffix are overwhelmingly ours.
            bw = (e.get('bandwidth') or {}).get('name') or ''
            if has_erp_tag(e) or (bw.endswith('-eip') and '-' in bw and not str(e.get('public_ip_address','')).startswith('124.243')):
                found['eips'].append({'id': e['id'], 'ip': e.get('public_ip_address')})

        # Enumerate ECS instances (target servers) for phase scoping
        try:
            for sv in (h(['ECS','ListServersDetails','--cli-region='+target_region])[0].get('servers') or []):
                sname = sv.get('name') or ''
                if has_erp_tag(sv) or '-TARGET' in sname.upper() or 'target' in sname.lower():
                    found['ecs'].append({'id': sv.get('id'), 'name': sname,
                                         'status': sv.get('status'), 'ip': ''})
        except Exception:
            pass

        # ── Manifest-driven rollback (if project has a recorded manifest) ──
        # The execution engine records every created resource ID in
        # project.data['rollback_manifest'] = [{kind, id, name, ts}].
        manifest = []
        try:
            man = project_data.get('rollback_manifest') or []
            if isinstance(man, list) and man:
                manifest = man
        except Exception:
            pass

        if phase_filter and not phase_resources:
            # Phase rollback with no named target resources (e.g. 4.5/4.6/4.7 whose
            # steps target 'all' / no-op actions). Nothing specific to this phase —
            # return clean preview WITHOUT falling into the full-enumeration path.
            return jsonify({'success': True, 'found': {'vpcs': [], 'subnets': [], 'security_groups': [], 'eips': [], 'ecs': []},
                            'message': f'Phase {phase_filter} has no named resources to roll back (nothing created by this phase).',
                            'clean': True})
        if phase_filter and not resources:
            # Phase-aware preview: ONLY show resources matching this phase's targets.
            # A phase rollback must never display (or later destroy) another phase's
            # resources — e.g. 4.3 must show only its target ECS, not the 4.1 network.
            _filtered = {k: [] for k in found}
            for _kind in ('vpcs', 'subnets', 'security_groups', 'eips', 'ecs'):
                for _item in found.get(_kind, []):
                    _nm = (_item.get('name') or '').lower()
                    _ip = str(_item.get('ip') or '').lower()
                    for _tr in phase_resources:
                        _trl = str(_tr).lower().strip()
                        if not _trl or _trl in ('all','unknown','kms-key','mig-worker-target'):
                            continue
                        if _nm == _trl or _nm.endswith('-'+_trl) or _nm.startswith(_trl+'-') or \
                           f'{_trl}-target' in _nm or f'{_trl}-eip' in _nm or _trl in _ip:
                            _filtered[_kind].append(_item)
                            break
            found = _filtered
        if not resources:
            # Preview: show manifest items (if any) merged with cloud-found
            if manifest:
                return jsonify({'success': True, 'found': found, 'manifest': manifest,
                                'message': f"Preview: {len(manifest)} manifest items + {sum(len(v) for v in found.values())} cloud resources found"})
            return jsonify({'success': True, 'found': found, 'message': f"Preview: {sum(len(v) for v in found.values())} resources found"})

        def should_del(item):
            if resources == 'all' and not phase_resources:
                return True
            if phase_filter:
                # Phase rollback: delete the EXPLICITLY SELECTED resources (their
                # IDs came from the phase preview) — this takes priority. Only when
                # sending resources:'all' do we fall back to name-matching phase targets.
                if isinstance(resources, list):
                    return (item.get('id') in resources or item.get('name') in resources
                            or item.get('ip') in resources)
                if not phase_resources:
                    return False
                nm = (item.get('name') or '').lower()
                ip = str(item.get('ip') or '').lower()
                for _tr in phase_resources:
                    _trl = str(_tr).lower().strip()
                    if not _trl or _trl in ('all', 'unknown', 'kms-key', 'mig-worker-target'):
                        continue
                    if nm == _trl or nm.endswith('-' + _trl) or nm.startswith(_trl + '-'):
                        return True
                    if f'{_trl}-target' in nm or f'{_trl}-eip' in nm or _trl in ip:
                        return True
                return False
            return item.get('id') in resources or item.get('name') in resources or item.get('ip') in resources

        deleted = {'vpcs': [], 'subnets': [], 'security_groups': [], 'eips': [], 'ecs': []}
        attempted = {'vpcs': 0, 'subnets': 0, 'security_groups': 0, 'eips': 0, 'ecs': 0}
        failed = []

        def do_del(cmd_list, label):
            attempted[cmd_list[0].split(None,1)[0].lower() + 's'] = attempted.get(cmd_list[0].split(None,1)[0].lower() + 's', 0) + 1
            res, err = h(cmd_list)
            if res.get('_hcloud_error') or err:
                msg = (res.get('message') or res.get('_hcloud_error') or err)[:90]
                failed.append(f"{label}: {msg}")
                return False
            return True

        # Manifest-first: delete recorded resources in reverse creation order
        for item in reversed(manifest):
            kind = (item.get('kind') or '').lower()
            rid = item.get('id')
            rname = item.get('name') or rid
            if not rid:
                continue
            if kind in ('vpc', 'vpc-default') or 'vpc' in kind:
                if do_del(['VPC','DeleteVpc',f'--vpc_id={rid}','--cli-region='+target_region], f"VPC {rname}"):
                    deleted['vpcs'].append(rname)
            elif kind in ('subnet',):
                if do_del(['VPC','DeleteSubnet',f'--subnet_id={rid}','--cli-region='+target_region], f"Subnet {rname}"):
                    deleted['subnets'].append(rname)
            elif kind in ('sg', 'security_group'):
                if do_del(['VPC','DeleteSecurityGroup',f'--security_group_id={rid}','--cli-region='+target_region], f"SG {rname}"):
                    deleted['security_groups'].append(rname)
            elif kind in ('eip', 'publicip'):
                if do_del(['EIP','DeletePublicip',f'--publicip_id={rid}','--cli-region='+target_region], f"EIP {rname}"):
                    deleted['eips'].append(rname)
            elif kind in ('ecs', 'server'):
                if do_del(['ECS','DeleteServers',f'--servers.1.id={rid}','--delete_publicip=true','--cli-region='+target_region], f"ECS {rname}"):
                    deleted['ecs'].append(rname)

        # Then cloud-enumeration fallback (existing logic) for untracked leftovers
        # ── Plan-driven rollback (tool-agnostic) ──
        # Read the saved execution plan and execute rollback commands in reverse step order
        plan_rollback_done = set()
        try:
            saved_plan = project_data.get('executionPlan') or {}
            if isinstance(saved_plan, dict):
                steps = saved_plan.get('steps') or []
            elif isinstance(saved_plan, list):
                steps = saved_plan
            else:
                steps = []
            if isinstance(steps, list) and len(steps) > 0:
                for step in reversed(steps):
                    if phase_filter and step.get('phase') != phase_filter:
                        continue  # per-phase rollback: only this phase's steps
                    rb = step.get('rollback')
                    if rb and isinstance(rb, dict) and rb.get('cmd'):
                        label = rb.get('label', step.get('action', '?'))
                        plan_rollback_done.add(label)
                        # Execute the rollback command (hcloud CLI style)
                        rb_cmd = rb['cmd']
                        # Skip templated commands that were never ID-substituted
                        # (e.g. --vpc_id=<vpc_id>) — executing them just fails.
                        if '<' in rb_cmd and '>' in rb_cmd:
                            continue
                        # ONLY run rollback for resource types that actually exist
                        # in the cloud enumeration. OBS/ECS/SMS steps in the plan
                        # (junk under 4.1) have no matching found resources -> skip.
                        type_ok = False
                        for tkey, tlist in (('vpc','vpcs'), ('subnet','subnets'),
                                            ('securitygroup','security_groups'), ('eip','eips')):
                            if ('--' + tkey + '_id' in rb_cmd or tkey in rb_cmd.lower()) and found[tlist]:
                                type_ok = True
                                break
                        if not type_ok:
                            continue
                        if rb_cmd.startswith('hcloud '):
                            parts = rb_cmd.split()
                            svc_idx = 1  # index of service name (e.g. "VPC", "ECS", "EIP")
                            if len(parts) >= 4:
                                svc, operation = parts[1], parts[2]
                                do_del([svc, operation] + parts[3:], f"Plan rollback: {label}")
        except Exception as e:
            pass

        # Fall back to cloud enumeration for anything the plan didn't cover
        # ── ECS FIRST (real dependency order) ──
        # Target ECS must go BEFORE subnets/SGs/VPC: its NICs occupy the subnet,
        # its bound EIPs block EIP release, and its SG memberships block SG delete.
        # hcloud ECS DeleteServers (plural) — DeleteServer does NOT exist and
        # returns exit 0 with [USE_ERROR], causing silent false-success.
        # Use the batch delete API with delete_publicip so bound EIPs go too.
        for sv in found['ecs']:
            if should_del(sv):
                sv_id = sv.get('id')
                if sv_id:
                    ok = do_del(['ECS','DeleteServers',f'--servers.1.id={sv_id}','--delete_publicip=true','--cli-region='+target_region], f"ECS {sv.get('name')}")
                    if ok:
                        deleted['ecs'].append(sv.get('name'))
                        # If this ECS held one of our EIPs, its EIP is auto-released;
                        # remove it from the eips list so the later loop skips it.
                        found['eips'] = [e for e in found['eips'] if str(e.get('id')) != str(sv_id)]

        # Then the network teardown (subnets → SGs → VPC)
        for sub in found['subnets']:
            if should_del(sub):
                do_del(['VPC','DeleteSubnet',f'--subnet_id={sub["id"]}',f'--vpc_id={sub["vpc_id"]}','--cli-region='+target_region], f"Subnet {sub['name']}")

        # SG deletion: first ERP-tagged, then default SGs that still exist (block VPC deletion)
        for sg in found['security_groups']:
            if should_del(sg):
                do_del(['VPC','DeleteSecurityGroup',f'--security_group_id={sg["id"]}','--cli-region='+target_region], f"SG {sg['name']}")

        # ── SDK-BASED VPC/SG/SUBNET DELETION (resource-kit pattern: huawei_discovery.py) ──
        # The hcloud CLI prints errors as tables on stderr (no JSON) which made failure
        # detection unreliable. The official SDK raises typed exceptions with the exact
        # Huawei error code — deletion either works or reports the real reason.
        sdk_deleted = {'vpcs': [], 'security_groups': [], 'subnets': []}
        try:
            from huaweicloudsdkcore.auth.credentials import BasicCredentials
            from huaweicloudsdkcore.region.region import Region
            from huaweicloudsdkvpc.v3 import VpcClient as VpcClientV3, ListVpcsRequest, DeleteVpcRequest
            from huaweicloudsdkvpc.v3 import ListSecurityGroupsRequest, DeleteSecurityGroupRequest
            from huaweicloudsdkvpc.v2 import VpcClient as VpcClientV2, ListSubnetsRequest, DeleteSubnetRequest
            from services.credential_manager import get_credential_manager
            import json as _json2
            proj = project_record
            raw_data = proj.data
            if isinstance(raw_data, str):
                try:
                    pdata = _json2.loads(raw_data) if raw_data else {}
                except Exception:
                    pdata = {}
            else:
                pdata = raw_data or {}
            encrypted_ak = None
            encrypted_sk = None
            if isinstance(pdata, dict):
                encrypted_ak = pdata.get('target_huawei_ak') or pdata.get('source_huawei_ak')
                encrypted_sk = pdata.get('target_huawei_sk') or pdata.get('source_huawei_sk')
            # Fallback: use the already-decrypted Customer-model creds from the
            # top of this function (project.data usually has NO ak/sk keys —
            # they live in the Customer vault row, which is where target_ak came from).
            if not encrypted_ak:
                encrypted_ak, encrypted_sk = target_ak, target_sk
            master_pw = os.environ.get('VAULT_MASTER_PASSWORD', '')
            if not master_pw:
                master_pw = getattr(request, 'vault_password', '') or 'LatamCloudAdmin2026!'
            if encrypted_ak and encrypted_sk:
                ak, sk = encrypted_ak, encrypted_sk
                if str(ak).startswith('{'):
                    from services.credential_manager import get_credential_manager as _gcm
                    ed = _json2.loads(ak)
                    ak, sk = _gcm(master_pw).decrypt_credentials(ed)
                else:
                    ak, sk = str(ak).strip(), str(sk).strip()
                region_id = target_region or 'la-north-2'
                creds = BasicCredentials(ak, sk, None)
                vpc_region = Region(id=region_id, endpoint=f"https://vpc.{region_id}.myhuaweicloud.com")
                vclient = VpcClientV3.new_builder().with_credentials(creds).with_region(vpc_region).build()
                # 1) Subnets first (v2 client — v3 has no subnet delete)
                vclient2 = VpcClientV2.new_builder().with_credentials(creds).with_region(vpc_region).build()
                for sub in found['subnets']:
                    if should_del(sub):
                        try:
                            vclient2.delete_subnet(DeleteSubnetRequest(vpc_id=sub.get('vpc_id'), subnet_id=sub['id']))
                            sdk_deleted['subnets'].append(sub.get('name'))
                        except Exception as e:
                            failed.append(f"SDK Subnet {sub.get('name')}: {str(e)[:150]}")
                # 2) SGs — list ALL in region, delete the ones tied to our VPCs or ERP-marked
                sgs_resp = vclient.list_security_groups(ListSecurityGroupsRequest(limit=200))
                vpc_ids = {v['id'] for v in found['vpcs']}
                for sg in (sgs_resp.security_groups or []):
                    sg_id = getattr(sg, 'id', '')
                    # include ERP-tagged SGs + any SG in the target VPC
                    if not sg_id:
                        continue
                    if should_del({'id': sg_id, 'name': getattr(sg, 'name', '')}):
                        try:
                            vclient.delete_security_group(DeleteSecurityGroupRequest(security_group_id=sg_id))
                            sdk_deleted['security_groups'].append(getattr(sg, 'name', '?'))
                        except Exception as e:
                            failed.append(f"SDK SG {getattr(sg, 'name', '?')}: {str(e)[:150]}")
                # 3) VPCs — SDK raises the exact error if SGs still block; catch + report
                for v in found['vpcs']:
                    if should_del(v):
                        try:
                            vclient.delete_vpc(DeleteVpcRequest(vpc_id=v['id']))
                            sdk_deleted['vpcs'].append(v.get('name'))
                        except Exception as e:
                            failed.append(f"SDK VPC {v.get('name')}: {str(e)[:150]}")
                # VERIFY SDK deletions actually took (SDK can return 200 with an
                # error body for async deletes, e.g. VPC.0112 router-in-use).
                # Re-list and reconcile: anything still present goes to failed,
                # so the hcloud fallback below is NOT skipped.
                try:
                    _vlist = vclient.list_vpcs(ListVpcsRequest(limit=200))
                    _still_here = {v['id'] for v in found['vpcs'] if should_del(v)}
                    for _vv in (_vlist.vpcs or []):
                        _vv_id = getattr(_vv, 'id', '')
                        if _vv_id in _still_here:
                            _vv_name = getattr(_vv, 'name', '?')
                            if _vv_name in sdk_deleted['vpcs']:
                                sdk_deleted['vpcs'].remove(_vv_name)
                            failed.append(f"SDK VPC {_vv_name}: delete did not stick (VPC.0112 router/SG dependency?)")
                    _sglist = vclient.list_security_groups(ListSecurityGroupsRequest(limit=200))
                    for _sg2 in (_sglist.security_groups or []):
                        _sn = getattr(_sg2, 'name', '')
                        if _sn and _sn != 'default' and _sn in sdk_deleted.get('security_groups', []):
                            sdk_deleted['security_groups'].remove(_sn)
                            failed.append(f"SDK SG {_sn}: delete did not stick")
                except Exception:
                    pass
        except Exception as sdk_err:
            failed.append(f"SDK init: {str(sdk_err)[:200]}")

        # ── hcloud fallback: if SDK didn't delete the VPC, try direct CLI ──
        # The SDK init may fail silently (missing creds, network, region). The hcloud
        # CLI is always available as a fallback, and works when called from Flask.
        # NOTE: the fallback must NOT be gated on `not failed` — a subnet/EIP failure
        # earlier must not block the VPC.0112 SG-block retry here; each resource's
        # failure is reported individually via `failed`.
        if found['vpcs'] and not deleted['vpcs']:
            for v in found['vpcs']:
                if should_del(v):
                    for attempt in range(3):
                        r, rc = h(['VPC','DeleteVpc',f'--vpc_id={v["id"]}','--cli-region='+target_region], return_rc=True)
                        # rc==0 is NOT proof of success: hcloud prints Huawei error
                        # JSON ({"code":"VPC.0112",...}) with exit 0. Check body too.
                        err = r.get('_hcloud_error') or ''
                        vpc0112 = '0112' in err or 'router' in err.lower() or 'securitygroup first' in err.lower()
                        if rc == 0 and not err:
                            deleted['vpcs'].append(v.get('name'))
                            logger.warning(f"[rollback] hcloud fallback VPC {v['name']} deleted (SDK path returned 0 deleted)")
                            break
                        # SG-block (VPC.0112 "delete the securitygroup first"):
                        # list and delete non-system SGs, then retry the VPC delete.
                        sgs2, _ = h(['VPC','ListSecurityGroups/v3','--cli-region='+target_region])
                        for dsg in (sgs2.get('security_groups') or []):
                            if dsg.get('name') != 'default':
                                do_del(['VPC','DeleteSecurityGroup',f'--security_group_id={dsg["id"]}','--cli-region='+target_region], f"SG {dsg.get('name','?')}")
                        time.sleep(4)
                    if v.get('name') not in deleted['vpcs']:
                        failed.append(f"VPC {v['name']}: all attempts failed")

        # Merge SDK results into the response
        for k in ('vpcs', 'security_groups', 'subnets'):
            for n in sdk_deleted.get(k, []):
                if n not in deleted[k]:
                    deleted[k].append(n)

        for e in found['eips']:
            if should_del(e):
                do_del(['EIP','DeletePublicip',f'--publicip_id={e["id"]}','--cli-region='+target_region], f"EIP {e['ip']}")

        # Verify final state — check VPCs, subnets, SGs AND EIPs (network resources
        # are exactly what the old code missed; a surviving subnet/SG must surface).
        remaining = []
        try:
            final_vpcs, _ = h(['VPC','ListVpcs/v3','--cli-region='+target_region])
            final_subnets, _ = h(['VPC','ListSubnets','--cli-region='+target_region])
            final_sgs, _ = h(['VPC','ListSecurityGroups/v3','--cli-region='+target_region])
            final_eips, _ = h(['EIP','ListPublicips/v3','--cli-region='+target_region])
            # Only report remaining resources that are OUR target-scope ones
            # (match the same heuristics used for enumeration: erp tag, erp names,
            #  or -TARGET ECS). Default SG is system — exclude it.
            target_vpc_ids = {v['id'] for v in found['vpcs']}
            for v in final_vpcs.get('vpcs', []):
                if v['id'] in target_vpc_ids or has_erp_tag(v) or erp_named(v):
                    remaining.append(f"vpc:{v.get('name')}")
            for s in final_subnets.get('subnets', []):
                if s.get('vpc_id') in target_vpc_ids:
                    remaining.append(f"subnet:{s.get('name')}")
            for sg in final_sgs.get('security_groups', []):
                if sg.get('name') != 'default' and (has_erp_tag(sg) or str(sg.get('name','')).startswith(('erp-','latam-erp'))):
                    remaining.append(f"sg:{sg.get('name')}")
            for e in final_eips.get('publicips', []):
                bw = (e.get('bandwidth') or {}).get('name') or ''
                if has_erp_tag(e) or (bw.endswith('-eip') and '-' in bw):
                    remaining.append(f"eip:{e.get('public_ip_address')}")
        except Exception as _re:
            failed.append(f"final verify: {str(_re)[:120]}")

        # Reset state only when the rollback ACTUALLY cleaned the cloud.
        # If resources remain (network leftovers the user can see in the account),
        # DO NOT wipe ExecutionState/delegate_tasks — the GUI must keep showing
        # the live truth instead of a falsely-clean frontend.
        if not remaining and not failed:
            if not phase_filter:
                ExecutionState.query.filter_by(project_id=project_id).update({'current_phase': None, 'status': 'PENDING', 'last_pipeline_log': None})
                project_record.delegate_tasks = '[]'
                db.session.commit()
            else:
                # Phase-scoped: remove only this phase's delegate_task markers
                try:
                    import json as _jj
                    remaining_tasks = _jj.loads(project_record.delegate_tasks or '[]')
                    remaining_tasks = [t for t in remaining_tasks if t.get('phase') != phase_filter]
                    project_record.delegate_tasks = _jj.dumps(remaining_tasks, ensure_ascii=False)
                    db.session.commit()
                except Exception:
                    pass
        elif remaining:
            logger.warning(f"[rollback] {project_id}: resources remain after rollback — state NOT reset: {remaining}")
        if project_id in _running_pipelines:
            _running_pipelines[project_id] = {'status':'idle','completed_phases':[],'failed_phase':None,'log':[],'phase_status':{}}

        msg = f"Rollback: {sum(len(v) for v in deleted.values())} resources removed"
        if remaining:
            msg += f". {len(remaining)} resource(s) remain: {', '.join(remaining)}"
        if failed:
            msg += f". Failures: {'; '.join(failed[:3])}"
        return jsonify({'success': True, 'found': found, 'deleted': deleted, 'remaining': remaining, 'failed': failed[:5],
                        'message': msg})

    except Exception as e:
        logger.error(f"Rollback failed: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@execution_bp.route('/api/execution/<project_id>/orchestrate/report', methods=['GET'])
@jwt_required()
def orchestration_report(project_id):
    """Return the full agent completion report for the latest pipeline run phase."""
    import subprocess as _sp, os as _os, json as _j
    try:
        # Latest session for this project (by recency)
        hermes_db = _os.path.expanduser('~/.hermes/state.db')
        if not _os.path.exists(hermes_db):
            return jsonify({'success': False, 'error': 'no hermes db'}), 404
        sess = _sp.run(['sqlite3', hermes_db,
            "SELECT id FROM sessions WHERE id NOT LIKE 'cron%' ORDER BY started_at DESC LIMIT 3;"],
            capture_output=True, text=True, timeout=5)
        session_ids = [s for s in sess.stdout.strip().split('\n') if s]
        report = None
        phase = None
        for sid in session_ids:
            # find last assistant message mentioning PHASE_4_
            res = _sp.run(['sqlite3', hermes_db,
                f"SELECT content FROM messages WHERE session_id='{sid}' AND role='assistant' AND content LIKE '%PHASE_4_%' AND (content LIKE '%COMPLETE%' OR content LIKE '%report%' OR content LIKE '%| Resource |%') ORDER BY id DESC LIMIT 1;"],
                capture_output=True, text=True, timeout=5)
            content = res.stdout.strip()
            if content:
                # extract phase key
                import re as _re
                m = _re.search(r'PHASE_4_\d', content)
                phase = m.group(0) if m else None
                report = content[:8000]
                break
        if not report:
            return jsonify({'success': False, 'error': 'no report found'}), 404
        return jsonify({'success': True, 'phase': phase, 'report': report})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@execution_bp.route('/api/execution/<project_id>/reconciliation', methods=['GET'])
@jwt_required()
def reconciliation_report(project_id):
    """Source vs target spec comparison. Returns per-server deltas and cost flags.
    
    Project-agnostic: reads source_servers and target_ecs_map from executionContext,
    queries live cloud for actual specs, compares and flags over-provisioned.
    """
    import subprocess as _sp, json as _j
    try:
        pdata = ProjectData.query.get(project_id)
        if not pdata:
            return jsonify({'success': False, 'error': 'project not found'}), 404
        d = _j.loads(pdata.data) if isinstance(pdata.data, str) else pdata.data
        ctx = d.get('executionContext', {})
        
        # Get source servers from executionContext
        source_servers = ctx.get('source_servers', [])
        target_map = ctx.get('target_ecs_map', [])
        
        # Query live specs for each target
        comparisons = []
        for tgt in target_map:
            src_name = tgt.get('source_name', '')
            ecs_id = tgt.get('ecs_id', '')
            ecs_name = tgt.get('ecs_name', '')
            
            # Query target ECS specs
            tgt_spec = {'vcpus': '?', 'ram_mb': '?', 'flavor': '?', 'disks': []}
            try:
                r = _sp.run(['hcloud', 'ECS', 'ShowServer', '--cli-region=la-north-2',
                            '--cli-profile=internal', f'--server_id={ecs_id}'],
                           capture_output=True, text=True, timeout=20)
                raw = r.stdout or ''
                start = raw.find('{')
                if start >= 0:
                    depth = 0; end = start
                    for i in range(start, len(raw)):
                        if raw[i] == '{': depth += 1
                        elif raw[i] == '}': depth -= 1
                        if depth == 0: end = i+1; break
                    srv = _j.loads(raw[start:end]).get('server', {})
                    flv = srv.get('flavor', {})
                    tgt_spec['vcpus'] = int(flv.get('vcpus', 0))
                    tgt_spec['ram_mb'] = int(flv.get('ram', 0))
                    tgt_spec['flavor'] = flv.get('name', '?')
                    for vol in srv.get('os-extended-volumes:volumes_attached', []):
                        tgt_spec['disks'].append(vol.get('id', '?'))
            except Exception:
                pass
            
            # Find matching source
            src_spec = {'vcpus': '?', 'ram_mb': '?', 'flavor': '?', 'disks': []}
            for src in source_servers:
                if src.get('name', '').replace('-SOURCE', '') == src_name or src.get('name') == src_name:
                    src_spec['vcpus'] = src.get('vcpus', '?')
                    src_spec['ram_mb'] = src.get('ram_mb', '?')
                    src_spec['flavor'] = src.get('flavor', '?')
                    break
            
            # Calculate deltas
            deltas = {}
            for dim in ['vcpus', 'ram_mb']:
                sv, tv = src_spec.get(dim, '?'), tgt_spec.get(dim, '?')
                if isinstance(sv, (int, float)) and isinstance(tv, (int, float)) and sv > 0:
                    pct = ((tv - sv) / sv) * 100
                    deltas[dim] = {'source': sv, 'target': tv, 'delta_pct': round(pct, 1), 'flag': 'over-provisioned' if pct > 20 else 'ok'}
                else:
                    deltas[dim] = {'source': sv, 'target': tv, 'delta_pct': '?', 'flag': 'unknown'}
            
            comparisons.append({
                'source_name': src_name,
                'target_name': ecs_name,
                'target_id': ecs_id,
                'source_spec': src_spec,
                'target_spec': tgt_spec,
                'deltas': deltas,
                'cost_risk': any(d.get('flag') == 'over-provisioned' for d in deltas.values()),
            })
        
        # SMS task trace
        sms_tasks = []
        try:
            r = _sp.run(['hcloud', 'SMS', 'ListTasks', '--cli-region=ap-southeast-3',
                        '--cli-profile=erp-source', '--limit=20'],
                       capture_output=True, text=True, timeout=20)
            raw = r.stdout or ''
            start = raw.find('{')
            if start >= 0:
                depth = 0; end = start
                for i in range(start, len(raw)):
                    if raw[i] == '{': depth += 1
                    elif raw[i] == '}': depth -= 1
                    if depth == 0: end = i+1; break
                td = _j.loads(raw[start:end])
                for t in td.get('tasks', []):
                    sms_tasks.append({
                        'id': t.get('id'),
                        'name': t.get('name', ''),
                        'state': t.get('state', ''),
                        'source_server': t.get('source_server', ''),
                        'target%target_server': t.get('target_server', ''),
                        'create_time': t.get('create_time', ''),
                    })
        except Exception:
            pass
        
        return jsonify({
            'success': True,
            'comparisons': comparisons,
            'sms_tasks': sms_tasks,
            'sms_task_count': len(sms_tasks),
            'over_provisioned_count': sum(1 for c in comparisons if c.get('cost_risk')),
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@execution_bp.route('/api/execution/<project_id>/phase-content', methods=['GET'])
@jwt_required()
def get_phase_content(project_id):
    """Return dynamic phase labels, descriptions, and goals generated from the execution plan."""
    try:
        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404

        import json as _json
        pdata = _json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
        plan = pdata.get('executionPlan', {})

        from services.phase_content_generator import generate_phase_content
        content = generate_phase_content(plan)

        if not content:
            # Return defaults
            return jsonify({"success": True, "phases": None})

        return jsonify({"success": True, "phases": content})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Cloud State Detection: query actual Huawei Cloud resources to infer migration phase ──

@execution_bp.route('/api/execution/<project_id>/cloud-state', methods=['GET'])
@jwt_required()
def get_cloud_state(project_id):
    """Query Huawei Cloud APIs to detect actual migration progress from cloud resources."""
    try:
        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
        
        import json as _json
        pdata = _json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
        
        # Try to get customer credentials from the Customer model (encrypted vault)
        customer_data = {}
        customer_id = pdata.get('customerId') or pdata.get('customer_id')
        if customer_id:
            try:
                from models import Customer
                customer = Customer.query.get(customer_id)
                if customer:
                    # Decrypt credentials using the same logic as Readiness Gateway
                    import os as _os
                    master_pw = _os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
                    try:
                        from services.credential_manager import CredentialManager
                        cm = CredentialManager(master_pw)
                        
                        # Decrypt source Huawei credentials (for SMS API calls)
                        def _dec_pair(ak_field, sk_field):
                            """Decrypt a credential pair from Customer model."""
                            ak_raw = getattr(customer, ak_field, None)
                            sk_raw = getattr(customer, sk_field, None)
                            if not ak_raw:
                                return None, None
                            # If it's encrypted JSON
                            if isinstance(ak_raw, str) and ak_raw.startswith('{'):
                                import json as _j
                                enc = _j.loads(ak_raw)
                                if 'encrypted_ak' in enc:
                                    return cm.decrypt_credentials(enc)
                            # If it's a plain string (boolean True means "set but use same as ak")
                            if ak_raw is True or ak_raw == 'true':
                                return None, None
                            return ak_raw, sk_raw
                        
                        # Try source Huawei credentials first (for SMS API in source region)
                        src_ak, src_sk = _dec_pair('source_huawei_ak', 'source_huawei_sk')
                        if src_ak and src_sk:
                            customer_data['accessKey'] = src_ak
                            customer_data['secretKey'] = src_sk
                            customer_data['source_region'] = getattr(customer, 'source_huawei_region', None) or 'ap-southeast-3'
                            customer_data['source_project_id'] = getattr(customer, 'source_huawei_project_id', None)
                        
                        # Fall back to main AK/SK
                        if not customer_data.get('accessKey'):
                            main_ak, main_sk = _dec_pair('ak', 'sk')
                            if main_ak and main_sk:
                                customer_data['accessKey'] = main_ak
                                customer_data['secretKey'] = main_sk
                        
                        customer_data['region'] = customer.region or 'la-north-2'
                    except Exception as e:
                        # If decryption fails, try raw fields
                        pass
            except Exception:
                pass
        
        from services.cloud_state_detector import detect_cloud_state, reconcile_execution_plan
        result = detect_cloud_state(pdata, customer_data)
        
        # Reconcile the project's execution plan against real cloud evidence so
        # steps already done outside the ERP show 'completed_by_cloud' instead of 'pending'
        try:
            plan = pdata.get('executionPlan') or {}
            result['reconciled_steps'] = reconcile_execution_plan(plan, result)
        except Exception as _re:
            result['reconciled_steps'] = {}
            result['reconcile_error'] = str(_re)[:200]
        
        return jsonify({"success": True, **result})
    except Exception as e:
        import traceback
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()[-200:]}), 500


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
