from flask import Blueprint, request, jsonify
from models import db, ProjectData, Customer, GlobalPlaybooks
import json
from flask_jwt_extended import jwt_required, get_jwt_identity

crm_bp = Blueprint('crm', __name__)

@crm_bp.route('/api/vault/validate', methods=['POST'])
@jwt_required()
def validate_vault_keys():
    data = request.json
    provider = data.get('provider')
    # ... [Keep your existing AWS/Azure validation logic here] ...
    return jsonify({"valid": False, "error": "Unknown provider."})

@crm_bp.route('/api/erp/state', methods=['GET'])
@jwt_required()
def get_state():
    try:
        projects = ProjectData.query.all()
        valid_projects = []
        for p in projects:
            try:
                valid_projects.append(json.loads(p.data) if isinstance(p.data, str) else p.data)
            except json.JSONDecodeError:
                continue
        return jsonify({"success": True, "projects": valid_projects})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/projects', methods=['POST'])
@jwt_required()
def update_project():
    """Legacy Full-Update Endpoint (Still used for initial project creation)"""
    try:
        data = request.json
        project_id = str(data.get('id'))
        project = ProjectData.query.get(project_id)
        if project:
            project.data = json.dumps(data, ensure_ascii=False)
        else:
            project = ProjectData(id=project_id, data=json.dumps(data, ensure_ascii=False))
            db.session.add(project)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

# 🚨 THE FIX FOR THE "ERR_EMPTY_RESPONSE" CRASH
@crm_bp.route('/api/erp/projects/<project_id>/partial', methods=['PATCH'])
@jwt_required()
def partial_update_project(project_id):
    """
    Atomic Partial Update: Only updates the specific JSON keys passed in the request body.
    Prevents Flask from crashing out of memory when updating massive projects with MgC data.
    """
    try:
        data_updates = request.json
        project = ProjectData.query.get(project_id)
        
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
            
        # Load existing data, merge the updates, and save back
        current_data = json.loads(project.data)
        
        for key, value in data_updates.items():
            current_data[key] = value
            
        project.data = json.dumps(current_data, ensure_ascii=False)
        db.session.commit()
        
        return jsonify({"success": True})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/customers', methods=['GET', 'POST'])
@jwt_required()
def manage_customers():
    # ... [Keep your existing customer management logic here] ...
    return jsonify({"success": True})

@crm_bp.route('/api/erp/customers/<c_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def update_delete_customer(c_id):
    # ... [Keep your existing customer update logic here] ...
    return jsonify({"success": True})

@crm_bp.route('/api/wbs/global', methods=['GET'])
@jwt_required()
def get_global_wbs():
    # ... [Keep your existing WBS logic here] ...
    return jsonify({"success": True, "tasks": []})

@crm_bp.route('/api/erp/playbooks', methods=['GET', 'POST'])
@jwt_required()
def manage_playbooks():
    # ... [Keep your existing playbooks logic here] ...
    return jsonify({"success": True})
