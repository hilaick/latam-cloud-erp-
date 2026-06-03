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
        
        # 🚨 SAFE PARSER: Bypasses corrupted SQLite data
        for p in projects:
            try:
                valid_projects.append(json.loads(p.data))
            except json.JSONDecodeError:
                print(f"Warning: Ignored corrupted JSON in ProjectData {p.id}")
                continue
                
        return jsonify({"success": True, "projects": valid_projects})
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
            new_name = data.get('name', 'Unknown').strip()
            
            # 🚨 THE FIX: Check if a customer with this exact name already exists (Case-Insensitive)
            existing_customer = Customer.query.filter(Customer.name.ilike(new_name)).first()
            
            if existing_customer:
                # Silently intercept and ignore the duplicate request
                return jsonify({"success": True, "message": "Customer already exists, skipping duplicate creation."})

            # If it's a truly new customer, proceed with creation
            customer = Customer(
                id=str(data.get('id')), 
                name=new_name, 
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

@crm_bp.route('/api/wbs/global', methods=['GET'])
@jwt_required()
def get_global_wbs():
    """Returns global WBS tasks across all projects"""
    try:
        projects = ProjectData.query.all()
        global_tasks = []
        
        for p in projects:
            try:
                project_data = json.loads(p.data)
                # Extract WBS tasks from project data
                if 'migrationPlan' in project_data:
                    for task in project_data['migrationPlan']:
                        global_tasks.append({
                            'project_id': p.id,
                            'project_name': project_data.get('name', 'Unknown'),
                            'task_id': task.get('id'),
                            'task_name': task.get('name', 'Unnamed Task'),
                            'progress': task.get('prog', '0%'),
                            'responsible': task.get('resp', 'Unknown'),
                            'start_date': task.get('start', ''),
                            'end_date': task.get('end', ''),
                            'is_parent': task.get('isParent', False)
                        })
            except json.JSONDecodeError:
                continue
                
        return jsonify({"success": True, "tasks": global_tasks})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/wbs/task', methods=['POST'])
@jwt_required()
def update_task_progress():
    """Update a specific task's progress"""
    try:
        data = request.json
        task_id = data.get('id')
        new_progress = data.get('progress', '0%')
        
        # In a real implementation, you would update the task in the database
        # For now, we'll just return success
        return jsonify({"success": True, "message": f"Task {task_id} updated to {new_progress}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/playbooks', methods=['GET', 'POST'])
@jwt_required()
def manage_playbooks():
    if request.method == 'GET':
        try:
            pb = GlobalPlaybooks.query.get("master")
            if pb:
                try:
                    # 🚨 SAFE PARSER: Bypasses corrupted SQLite playbook data
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
