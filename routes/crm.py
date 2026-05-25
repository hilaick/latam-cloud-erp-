from flask import Blueprint, request, jsonify
# 🚨 FIX 1: Make sure GlobalPlaybooks is imported here!
from models import db, ProjectData, Customer, GlobalPlaybooks
import json

from flask_jwt_extended import jwt_required, get_jwt_identity

crm_bp = Blueprint('crm', __name__)

# ==========================================
# STATE & PROJECT MANAGEMENT
# ==========================================

@crm_bp.route('/api/erp/state', methods=['GET'])
@jwt_required()
def get_state():
    """Returns the full master state of the ERP (All Projects)"""
    try:
        projects = ProjectData.query.all()
        return jsonify({
            "success": True, 
            "projects": [json.loads(p.data) for p in projects]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/projects', methods=['POST'])
@jwt_required()
def update_project():
    """Creates or Updates a Project's JSON Blob (WBS, Runbook, State)"""
    try:
        data = request.json
        project_id = str(data.get('id'))
        
        # Check if project exists
        project = ProjectData.query.get(project_id)
        if project:
            project.data = json.dumps(data)
        else:
            project = ProjectData(id=project_id, data=json.dumps(data))
            db.session.add(project)
            
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback() # Prevent SQLite/Postgres DB Locking
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# CUSTOMER VAULT MANAGEMENT (AK/SK)
# ==========================================

@crm_bp.route('/api/erp/customers', methods=['GET', 'POST'])
@jwt_required()
def manage_customers():
    """Handles fetching and creating new Customer profiles"""
    if request.method == 'GET':
        try:
            customers = Customer.query.all()
            return jsonify({
                "success": True,
                "customers": [{"id": c.id, "name": c.name, "ak": c.ak, "sk": c.sk, "region": c.region} for c in customers]
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            customer = Customer(
                id=str(data.get('id')), 
                name=data.get('name', 'Unknown'), 
                ak=data.get('ak', ''), 
                sk=data.get('sk', ''), 
                region=data.get('region', 'la-south-2')
            )
            db.session.add(customer)
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/customers/<c_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def update_delete_customer(c_id):
    """Updates Vault Keys or Deletes Customer"""
    try:
        customer = Customer.query.get(c_id)
        if not customer:
            return jsonify({"success": False, "error": "Customer not found"}), 404
            
        if request.method == 'DELETE':
            db.session.delete(customer)
        
        elif request.method == 'PUT':
            data = request.json
            customer.ak = data.get('ak', customer.ak)
            customer.sk = data.get('sk', customer.sk)
            customer.region = data.get('region', customer.region)
            
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/reset', methods=['POST'])
@jwt_required()
def hard_reset():
    """Wipes the database for Demo resets"""
    try:
        ProjectData.query.delete()
        Customer.query.delete()
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# 🚨 FIX 2: GLOBAL PLAYBOOK STUDIO MANAGEMENT
# ==========================================

@crm_bp.route('/api/erp/playbooks', methods=['GET', 'POST'])
@jwt_required()
def manage_playbooks():
    """Handles fetching and updating the Master Playbook templates"""
    if request.method == 'GET':
        try:
            pb = GlobalPlaybooks.query.get("master")
            if pb:
                return jsonify({"success": True, "playbooks": json.loads(pb.data)})
            return jsonify({"success": True, "playbooks": None})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            pb = GlobalPlaybooks.query.get("master")
            if pb:
                pb.data = json.dumps(data)
            else:
                pb = GlobalPlaybooks(id="master", data=json.dumps(data))
                db.session.add(pb)
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": str(e)}), 500
