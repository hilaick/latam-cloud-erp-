from flask import Blueprint, request, jsonify
from models import db, ProjectData, Customer, GlobalPlaybooks
import json
from flask_jwt_extended import jwt_required, get_jwt_identity

crm_bp = Blueprint('crm', __name__)

@crm_bp.route('/api/erp/state', methods=['GET'])
@jwt_required()
def get_state():
    """Returns the full master state of the ERP (All Projects)"""
    try:
        projects = ProjectData.query.all()
        valid_projects = []
        
        # 🚨 FIX: Safely parse JSON and skip corrupted database rows!
        for p in projects:
            try:
                valid_projects.append(json.loads(p.data))
            except json.JSONDecodeError:
                print(f"Warning: Skipped corrupted JSON in project {p.id}")
                continue
                
        return jsonify({
            "success": True, 
            "projects": valid_projects
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/projects', methods=['POST'])
@jwt_required()
def update_project():
    try:
        data = request.json
        project_id = str(data.get('id'))
        project = ProjectData.query.get(project_id)
        if project:
            project.data = json.dumps(data)
        else:
            project = ProjectData(id=project_id, data=json.dumps(data))
            db.session.add(project)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/customers', methods=['GET', 'POST'])
@jwt_required()
def manage_customers():
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
    try:
        ProjectData.query.delete()
        Customer.query.delete()
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/playbooks', methods=['GET', 'POST'])
@jwt_required()
def manage_playbooks():
    if request.method == 'GET':
        try:
            pb = GlobalPlaybooks.query.get("master")
            if pb:
                try:
                    return jsonify({"success": True, "playbooks": json.loads(pb.data)})
                except json.JSONDecodeError:
                    return jsonify({"success": True, "playbooks": None})
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
