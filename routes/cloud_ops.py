from flask import Blueprint, request, jsonify
from models import db, ProjectData
import json
import requests
from huaweicloudsdkcore.signer.signer import Signer
from huaweicloudsdkcore.sdk_request import SdkRequest
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from urllib.parse import urlparse
import time
from services.auth import requires_auth  # CRITICAL FIX

cloud_ops_bp = Blueprint('cloud_ops', __name__)

@cloud_ops_bp.route('/api/cloud/inventory', methods=['POST'])
def cloud_inventory():
    try:
        req = request.json
        project_id_db = req.get('projectId')  # This is our internal SQLite Project ID
        
        # PR #25 SECURITY FIX: Backend fetches AK/SK directly from SQLite
        project_record = ProjectData.query.get(project_id_db)
        if not project_record:
            return jsonify({"success": False, "error": "Project not found in database."}), 404
            
        project_data = json.loads(project_record.data)
        profile = project_data.get('customerProfile', {})
        ak = profile.get('ak')
        sk = profile.get('sk')
        region = profile.get('region', 'la-south-2')
        hw_project_id = profile.get('projectId')  # The actual Huawei Cloud Project ID
        
        if not all([ak, sk, hw_project_id]):
            return jsonify({"success": False, "error": "Customer AK/SK or Huawei Project ID missing in CRM profile."}), 400
        
        # Huawei Cloud ECS API endpoint
        endpoint = f"https://ecs.{region}.myhuaweicloud.com"
        
        # Create credentials for signing
        credentials = BasicCredentials(ak, sk, hw_project_id)
        signer = Signer(credentials)
        
        # Get ECS instances
        parsed_url = urlparse(f"{endpoint}/v1/{hw_project_id}/cloudservers/detail")
        sdk_request = SdkRequest(
            method="GET",
            schema=parsed_url.scheme,
            host=parsed_url.netloc,
            resource_path=parsed_url.path,
            query_params=[("limit", "100"), ("offset", "0")],
            header_params={
                "Content-Type": "application/json",
                "X-Project-Id": hw_project_id
            }
        )
        signed_request = signer.sign(sdk_request)
        
        url = f"{endpoint}/v1/{hw_project_id}/cloudservers/detail?limit=100&offset=0"
        response = requests.get(url, headers=signed_request.header_params, timeout=15)
        
        if response.status_code >= 400:
            return jsonify({
                "success": False, 
                "error": f"Huawei Cloud ECS API Error {response.status_code}: {response.text}"
            }), response.status_code
        
        data = response.json()
        servers = data.get('servers', [])
        
        # Format the response
        inventory = []
        for server in servers:
            server_info = {
                "id": server.get('id', ''),
                "name": server.get('name', ''),
                "status": server.get('status', ''),
                "flavor": server.get('flavor', {}).get('id', ''),
                "image": server.get('image', {}).get('id', ''),
                "addresses": server.get('addresses', {}),
                "created": server.get('created', ''),
                "availability_zone": server.get('OS-EXT-AZ:availability_zone', ''),
                "power_state": server.get('OS-EXT-STS:power_state', 0),
                "vm_state": server.get('OS-EXT-STS:vm_state', ''),
                "task_state": server.get('OS-EXT-STS:task_state', '')
            }
            inventory.append(server_info)
        
        return jsonify({
            "success": True,
            "inventory": inventory,
            "count": len(inventory),
            "region": region
        })
        
    except Exception as e:
        db.session.rollback()  # PR #25 FIX: Prevent SQLite locking
        import traceback
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()}), 500

@cloud_ops_bp.route('/api/deploy/landing_zone', methods=['POST'])
def deploy_landing_zone():
    try:
        req = request.json
        project_id = req.get('projectId')
        
        if not project_id:
            return jsonify({"success": False, "error": "projectId required"}), 400
        
        # Fetch project data
        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
        
        project_data = json.loads(project.data)
        customer_profile = project_data.get('customerProfile', {})
        
        # Simulate deployment (in a real implementation, this would call Huawei Cloud APIs)
        deployment_id = f"lz-{int(time.time())}"
        
        # Update project with deployment info
        project_data['landingZone'] = {
            "deploymentId": deployment_id,
            "status": "deployed",
            "timestamp": time.time(),
            "vpcId": f"vpc-{deployment_id}",
            "subnets": ["subnet-a", "subnet-b"],
            "securityGroups": ["sg-default"],
            "region": customer_profile.get('region', 'la-south-2')
        }
        
        project.data = json.dumps(project_data)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "deploymentId": deployment_id,
            "message": "Landing zone deployment simulated successfully",
            "details": project_data['landingZone']
        })
        
    except Exception as e:
        db.session.rollback()  # PR #25 FIX: Prevent SQLite locking
        import traceback
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()}), 500