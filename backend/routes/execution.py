from flask import Blueprint, request, jsonify
# from models import db, Project, Customer
from services.orchestrator import ExecutionOrchestrator

execution_bp = Blueprint('execution', __name__)

@execution_bp.route('/api/projects/<int:project_id>/execute', methods=['POST'])
def execute_project(project_id):
    """
    Triggers Phase 1: RFS Landing Zone & Agent Deployment.
    Maps to the "Execute RFS" button in React.
    """
    # project = Project.query.get_or_404(project_id)
    # customer = Customer.query.get(project.customer_id)
    
    # MOCK DATA FOR DEMONSTRATION (Remove when connecting to DB)
    project = type('obj', (object,), {'id': project_id, 'sandbox_eps': 'eps-sandbox-123', 'auth_level': 'Local OS Admin', 'source_region': 'la-north-2', 'target_region': 'la-south-2', 'mapper_nodes': [
        {'type': 'ECS', 'source_id': '66d564f2-5991-4f42-97cd-66d1da6feb39', 'name': 'target-web-01', 'eip_bandwidth': 100},
        {'type': 'VPC', 'name': 'vpc-migration', 'cidr': '10.250.0.0/16'}
    ]})
    customer = type('obj', (object,), {'name': 'Corp', 'domain_name': 'corp.local', 'ak': 'MOCK_AK', 'sk': 'MOCK_SK', 'tier2_ak': None, 'tier2_sk': None, 'os_user': 'root', 'os_password': 'password123', 'os_domain': ''})
    
    try:
        # 1. Translate Blueprint into Terraform .tfvars
        workspace_dir = ExecutionOrchestrator.prepare_workspace(project, customer)
        
        # 2. Trigger Local Terraform Worker (Background)
        ExecutionOrchestrator.run_terraform_async(workspace_dir, project.id)
        
        # 3. Update DB State
        # project.exec_status = 'sandbox_built'
        # db.session.commit()
        
        return jsonify({
            "success": True, 
            "message": "Terraform Execution Started. Landing Zone provisioning initiated."
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@execution_bp.route('/api/projects/<int:project_id>/sync-status', methods=['GET'])
def get_sync_status(project_id):
    """
    Called by React every 5 seconds during the 'Syncing' phase.
    Reads the local task_poll_latest.json file for real-time progress.
    """
    try:
        status = ExecutionOrchestrator.get_live_status(project_id)
        
        # Optional: Auto-update the project status in DB if sync is fully complete
        # if status['state'] == 'MIGRATE_SUCCESS':
        #    project = Project.query.get(project_id)
        #    project.exec_status = 'cutover_ready'
        #    db.session.commit()
            
        return jsonify({"success": True, "data": status})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
