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
                valid_projects.append(json.loads(p.data) if isinstance(p.data, str) else p.data)
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
            project.data = json.dumps(data, ensure_ascii=False)
        else:
            project = ProjectData(id=project_id, data=json.dumps(data, ensure_ascii=False))
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
                "customers": [{
                    "id": c.id, 
                    "name": c.name, 
                    "region": c.region,
                    "cio": c.cio, 
                    "itLead": c.it_lead, 
                    "architect": c.architect,
                    "ak": c.ak, 
                    "sk": c.sk,
                    "tier1AK": c.tier1_ak, "tier1SK": c.tier1_sk,
                    "tier2AK": c.tier2_ak, "tier2SK": c.tier2_sk,
                    "tier3AK": c.tier3_ak, "tier3SK": c.tier3_sk,
                    "awsAK": c.aws_ak, "awsSK": c.aws_sk,
                    "azureTenant": c.azure_tenant_id, "azureClient": c.azure_client_id, "azureSecret": c.azure_client_secret,
                    "vCenterHost": c.vcenter_host,
                    "osDomain": c.os_domain, "osUser": c.os_user, "osPassword": c.os_password
                } for c in customers]
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            new_name = data.get('name', 'Unknown').strip()
            
            # Check if a customer with this exact name already exists (Case-Insensitive)
            existing_customer = Customer.query.filter(Customer.name.ilike(new_name)).first()
            
            if existing_customer:
                return jsonify({"success": True, "message": "Customer already exists, skipping duplicate creation."})

            customer = Customer(
                id=str(data.get('id')), 
                name=new_name, 
                region=data.get('region', 'la-south-2'),
                cio=data.get('cio'), 
                it_lead=data.get('itLead'), 
                architect=data.get('architect'),
                ak=data.get('ak', ''), sk=data.get('sk', ''),
                tier1_ak=data.get('tier1AK'), tier1_sk=data.get('tier1SK'),
                tier2_ak=data.get('tier2AK'), tier2_sk=data.get('tier2SK'),
                tier3_ak=data.get('tier3AK'), tier3_sk=data.get('tier3SK'),
                aws_ak=data.get('awsAK'), aws_sk=data.get('awsSK'),
                azure_tenant_id=data.get('azureTenant'), azure_client_id=data.get('azureClient'), azure_client_secret=data.get('azureSecret'),
                vcenter_host=data.get('vCenterHost'),
                os_domain=data.get('osDomain'), os_user=data.get('osUser'), os_password=data.get('osPassword')
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
            customer.name = data.get('name', customer.name)
            customer.region = data.get('region', customer.region)
            customer.cio = data.get('cio', customer.cio)
            customer.it_lead = data.get('itLead', customer.it_lead)
            customer.architect = data.get('architect', customer.architect)
            customer.ak = data.get('ak', customer.ak)
            customer.sk = data.get('sk', customer.sk)
            customer.tier1_ak = data.get('tier1AK', customer.tier1_ak)
            customer.tier1_sk = data.get('tier1SK', customer.tier1_sk)
            customer.tier2_ak = data.get('tier2AK', customer.tier2_ak)
            customer.tier2_sk = data.get('tier2SK', customer.tier2_sk)
            customer.tier3_ak = data.get('tier3AK', customer.tier3_ak)
            customer.tier3_sk = data.get('tier3SK', customer.tier3_sk)
            customer.aws_ak = data.get('awsAK', customer.aws_ak)
            customer.aws_sk = data.get('awsSK', customer.aws_sk)
            customer.azure_tenant_id = data.get('azureTenant', customer.azure_tenant_id)
            customer.azure_client_id = data.get('azureClient', customer.azure_client_id)
            customer.azure_client_secret = data.get('azureSecret', customer.azure_client_secret)
            customer.vcenter_host = data.get('vCenterHost', customer.vcenter_host)
            customer.os_domain = data.get('osDomain', customer.os_domain)
            customer.os_user = data.get('osUser', customer.os_user)
            customer.os_password = data.get('osPassword', customer.os_password)
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
                project_data = json.loads(p.data) if isinstance(p.data, str) else p.data
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
            except Exception:
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
        
        projects = ProjectData.query.all()
        updated = False
        for p in projects:
            try:
                project_data = json.loads(p.data) if isinstance(p.data, str) else p.data
                if 'migrationPlan' in project_data:
                    for task in project_data['migrationPlan']:
                        if task.get('id') == task_id:
                            task['prog'] = new_progress
                            p.data = json.dumps(project_data, ensure_ascii=False)
                            db.session.commit()
                            updated = True
                            break
                if updated:
                    break
            except Exception:
                continue
                
        if updated:
            return jsonify({"success": True, "message": f"Task {task_id} updated to {new_progress}"})
        return jsonify({"success": False, "error": "Task not found"}), 404
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
                    return jsonify({"success": True, "playbooks": json.loads(pb.data) if isinstance(pb.data, str) else pb.data})
                except Exception:
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
