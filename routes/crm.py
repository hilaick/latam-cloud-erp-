import os
import json
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, ProjectData, Customer, QuotationVersion
from services.credential_manager import get_credential_manager

crm_bp = Blueprint('crm', __name__)

@crm_bp.route('/api/vault/validate', methods=['POST'])
@jwt_required()
def validate_vault_keys():
    data = request.json
    provider = data.get('provider')
    # Custom validation logic
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
    """Legacy Full-Update Endpoint"""
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

@crm_bp.route('/api/erp/projects/<project_id>/partial', methods=['PATCH'])
@jwt_required()
def partial_update_project(project_id):
    """Atomic Partial Update"""
    try:
        data_updates = request.json
        project = ProjectData.query.get(project_id)
        
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
            
        current_data = json.loads(project.data)
        for key, value in data_updates.items():
            current_data[key] = value
            
        project.data = json.dumps(current_data, ensure_ascii=False)
        db.session.commit()
        return jsonify({"success": True})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/projects/<project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Delete a project permanently"""
    try:
        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
        
        QuotationVersion.query.filter_by(project_id=project_id).delete()
        db.session.delete(project)
        db.session.commit()
        return jsonify({"success": True, "message": f"Project {project_id} deleted"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

# 🚨 SECURE CUSTOMER DIRECTORY LOGIC
@crm_bp.route('/api/erp/customers', methods=['GET', 'POST'])
@jwt_required()
def manage_customers():
    try:
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_password)

        if request.method == 'GET':
            customers = Customer.query.all()
            result = []
            for c in customers:
                result.append({
                    "id": c.id, "name": c.name, "region": c.region,
                    "cio": c.cio, "it_lead": c.it_lead, "architect": c.architect,
                    
                    # We are intentionally NOT sending keys to the frontend.
                    # We only send boolean indicators so the UI knows if a key exists.
                    "ak": True if c.ak else False, 
                    "awsAK": True if c.aws_ak else False,
                    "azureTenant": True if c.azure_tenant_id else False,
                    
                    "os_domain": c.os_domain, 
                    "os_user": c.os_user, 
                    # 🚨 MASK THE PASSWORD - NEVER SEND IT TO FRONTEND IN PLAIN TEXT
                    "os_password": "********" if c.os_password else ""
                })
            return jsonify({"success": True, "customers": result})
        
        elif request.method == 'POST':
            data = request.json
            new_id = data.get('id', str(uuid.uuid4()))
            
            # 🚨 ENCRYPT THE OS PASSWORD BEFORE SAVING
            os_pass_raw = data.get('os_password')
            encrypted_os_pass = None
            if os_pass_raw and os_pass_raw != "********":
                # We package it as a dict to use your existing credential manager
                enc_dict = cm.encrypt_credentials({"os_pass": os_pass_raw})
                encrypted_os_pass = json.dumps(enc_dict)

            c = Customer(
                id=new_id,
                name=data.get('name'), region=data.get('region'), cio=data.get('cio'),
                it_lead=data.get('it_lead'), architect=data.get('architect'),
                
                # Note: To fully secure your vault, the AK/SKs should also be encrypted via cm.encrypt_credentials
                ak=data.get('ak'), sk=data.get('sk'),
                tier1_ak=data.get('tier1_ak'), tier1_sk=data.get('tier1_sk'),
                tier2_ak=data.get('tier2_ak'), tier2_sk=data.get('tier2_sk'),
                tier3_ak=data.get('tier3_ak'), tier3_sk=data.get('tier3_sk'),
                aws_ak=data.get('aws_ak'), aws_sk=data.get('aws_sk'),
                azure_tenant_id=data.get('azure_tenant_id'), azure_client_id=data.get('azure_client_id'),
                azure_client_secret=data.get('azure_client_secret'), azure_subscription_id=data.get('azure_subscription_id'),
                vcenter_host=data.get('vcenter_host'),
                
                os_domain=data.get('os_domain'), 
                os_user=data.get('os_user'), 
                os_password=encrypted_os_pass # 🚨 SECURE CIPHERTEXT SAVED
            )
            db.session.add(c)
            db.session.commit()
            return jsonify({"success": True, "customer": {"id": c.id, "name": c.name}})
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/customers/<c_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def update_delete_customer(c_id):
    try:
        customer = Customer.query.get(c_id)
        if not customer:
            return jsonify({"success": False, "error": "Not found"}), 404
            
        if request.method == 'DELETE':
            db.session.delete(customer)
            db.session.commit()
            return jsonify({"success": True})
            
        if request.method == 'PUT':
            data = request.json
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            cm = get_credential_manager(master_password)

            # 🚨 INTERCEPT AND ENCRYPT OS PASSWORD IF IT WAS CHANGED
            if 'os_password' in data:
                if data['os_password'] and data['os_password'] != "********":
                    enc_dict = cm.encrypt_credentials({"os_pass": data['os_password']})
                    customer.os_password = json.dumps(enc_dict)
                # Remove it from data so the generic loop doesn't overwrite it with plaintext
                del data['os_password'] 

            # Generic update for remaining fields
            for key in data:
                if hasattr(customer, key):
                    setattr(customer, key, data[key])
                    
            db.session.commit()
            return jsonify({"success": True})
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/wbs/global', methods=['GET'])
@jwt_required()
def get_global_wbs():
    return jsonify({"success": True, "tasks": []})

@crm_bp.route('/api/erp/playbooks', methods=['GET', 'POST'])
@jwt_required()
def manage_playbooks():
    return jsonify({"success": True})
