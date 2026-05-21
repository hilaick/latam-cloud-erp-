from flask import Blueprint, request, jsonify
from models import db, ProjectData, Customer, HuaweiAccount, MigrationTask, WBSTask, AdHocMigrationLog, GlobalPlaybooks
import json
from datetime import datetime

crm_bp = Blueprint('crm', __name__)

@crm_bp.route('/api/erp/state', methods=['GET'])
def get_state():
    try:
        projects = ProjectData.query.all()
        customers = Customer.query.all()
        accounts = HuaweiAccount.query.all()
        
        # Convert projects data from JSON strings
        project_list = []
        for p in projects:
            try:
                data = json.loads(p.data)
                project_list.append(data)
            except:
                project_list.append({"id": p.id, "error": "Invalid JSON"})
        
        # Convert customers to dict
        customer_list = [{
            "id": c.id,
            "name": c.name,
            "ak": c.ak,
            "sk": c.sk,
            "region": c.region,
            "cio": c.cio,
            "it_lead": c.it_lead,
            "architect": c.architect
        } for c in customers]
        
        # Convert accounts to dict (without sensitive data)
        account_list = [{
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "default_region": a.default_region,
            "is_active": a.is_active,
            "last_used": a.last_used.isoformat() if a.last_used else None,
            "created_at": a.created_at.isoformat() if a.created_at else None
        } for a in accounts]
        
        return jsonify({
            "projects": project_list,
            "customers": customer_list,
            "accounts": account_list
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@crm_bp.route('/api/erp/projects', methods=['POST'])
def save_project():
    try:
        req = request.json
        project_id = str(req.get('id'))
        proj = ProjectData.query.get(project_id)
        if not proj:
            proj = ProjectData(id=project_id)
        proj.data = json.dumps(req)
        db.session.add(proj)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/playbooks', methods=['POST'])
def save_playbooks():
    try:
        req = request.json
        playbook_id = str(req.get('id', 'master'))
        playbook = GlobalPlaybooks.query.get(playbook_id)
        if not playbook:
            playbook = GlobalPlaybooks(id=playbook_id)
        playbook.data = json.dumps(req)
        db.session.add(playbook)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/customers', methods=['POST'])
def save_customer():
    try:
        req = request.json
        customer_id = str(req.get('id'))
        customer = Customer.query.get(customer_id)
        if not customer:
            customer = Customer(id=customer_id)
        customer.name = req.get('name', customer.name)
        customer.ak = req.get('ak', customer.ak)
        customer.sk = req.get('sk', customer.sk)
        customer.region = req.get('region', customer.region)
        customer.cio = req.get('cio', customer.cio)
        customer.it_lead = req.get('it_lead', customer.it_lead)
        customer.architect = req.get('architect', customer.architect)
        db.session.add(customer)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/customers/<c_id>', methods=['DELETE'])
def delete_customer(c_id):
    try:
        customer = Customer.query.get(c_id)
        if not customer:
            return jsonify({"success": False, "error": "Customer not found"}), 404
        db.session.delete(customer)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/wbs/task', methods=['POST'])
def save_wbs_task():
    try:
        req = request.json
        task = WBSTask(
            project_id=req.get('project_id'),
            wbs_id=req.get('wbs_id'),
            name=req.get('name'),
            progress=req.get('progress', '0%'),
            raci=req.get('raci'),
            start_date=req.get('start_date'),
            end_date=req.get('end_date'),
            is_parent=req.get('is_parent', False)
        )
        db.session.add(task)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/sms/log', methods=['POST'])
def log_adhoc_migration():
    try:
        req = request.json
        log_entry = AdHocMigrationLog(
            task_id=req.get('task_id'),
            region=req.get('region'),
            source_os=req.get('source_os'),
            target_flavor=req.get('target_flavor'),
            target_subnet=req.get('target_subnet'),
            status=req.get('status', 'Initiated')
        )
        db.session.add(log_entry)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/reset', methods=['POST'])
def reset_all():
    try:
        # Clear all tables
        ProjectData.query.delete()
        Customer.query.delete()
        HuaweiAccount.query.delete()
        MigrationTask.query.delete()
        WBSTask.query.delete()
        AdHocMigrationLog.query.delete()
        GlobalPlaybooks.query.delete()
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500