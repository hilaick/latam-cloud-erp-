from flask import Blueprint, request, jsonify
from models import db, ProjectData, AdHocMigrationLog, WBSTask
import json
import requests
from huaweicloudsdkcore.signer.signer import Signer
from huaweicloudsdkcore.sdk_request import SdkRequest
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from urllib.parse import urlparse
from services.auth import requires_auth  # CRITICAL FIX

sms_bp = Blueprint('sms_migrations', __name__)

@sms_bp.route('/api/sms/discover/public', methods=['POST'])
def sms_discover_public():
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
            
        os_type = req.get('osType', 'linux')
        
        # 1. Construct the raw HTTP Request to the native endpoint
        # Handle LATAM → Singapore routing
        if region in ['la-north-2', 'la-south-2', 'sa-brazil-1']:
            # LATAM regions route through Singapore SMS control plane
            endpoint = "https://sms.ap-southeast-3.myhuaweicloud.com"
        else:
            # Use the region directly for supported regions
            endpoint = f"https://sms.{region}.myhuaweicloud.com"
        
        # Parse the URL
        parsed_url = urlparse(f"{endpoint}/v3/sources")
        
        # 2. Create SdkRequest for Huawei Cloud V4 signing
        sdk_request = SdkRequest(
            method="GET",
            schema=parsed_url.scheme,
            host=parsed_url.netloc,
            resource_path=parsed_url.path,  # Use resource_path instead of uri
            query_params=[("limit", "50"), ("offset", "0")],
            header_params={
                "Content-Type": "application/json",
                "X-Project-Id": hw_project_id
            }
        )
        
        # 3. Create credentials and cryptographically sign the request using Huawei's V4 Signer
        credentials = BasicCredentials(ak, sk, hw_project_id)
        signer = Signer(credentials)
        signed_request = signer.sign(sdk_request)
        
        # 4. BYPASS THE SDK: Execute natively via the requests library
        url = f"{endpoint}/v3/sources?limit=50&offset=0"
        response = requests.get(url, headers=signed_request.header_params, timeout=15)
        
        if response.status_code >= 400:
            return jsonify({
                "success": False, 
                "error": f"Huawei Cloud API Error {response.status_code}: {response.text}"
            }), response.status_code
            
        data = response.json()
        servers_list = data.get('source_servers', [])
        
        servers = []
        for server in servers_list:
            server_info = {
                "id": server.get('id', ""),
                "hostname": server.get('name', server.get('ip', "Unknown")),
                "cpu": server.get('cpu_quantity', 0),
                "ram": server.get('memory', 0),
                "disk": sum(vol.get('size', 0) for vol in server.get('volumes', [])) if server.get('volumes') else 0,
                "os": server.get('os_type', os_type),
                "status": server.get('state', 'unknown'),
                "agent_version": server.get('agent_version', 'unknown'),
                "ip": server.get('ip', ''),
                "agent_status": 'connected' if server.get('connected', False) else 'disconnected',
                "sync_status": 'idle', 
                "last_heartbeat": server.get('updated', '')
            }
            servers.append(server_info)
        
        return jsonify({
            "success": True,
            "servers": servers
        })
        
    except Exception as e:
        db.session.rollback()  # PR #25 FIX: Prevent SQLite locking
        import traceback
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()}), 500

@sms_bp.route('/api/sms/monitor', methods=['POST'])
def sms_monitor_public():
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
        
        # Handle LATAM → Singapore routing
        if region in ['la-north-2', 'la-south-2', 'sa-brazil-1']:
            # LATAM regions route through Singapore SMS control plane
            endpoint = "https://sms.ap-southeast-3.myhuaweicloud.com"
        else:
            # Use the region directly for supported regions
            endpoint = f"https://sms.{region}.myhuaweicloud.com"
        
        # Create credentials for signing
        credentials = BasicCredentials(ak, sk, hw_project_id)
        signer = Signer(credentials)
        
        # 1. Fetch Registered Source Servers
        parsed_url_sources = urlparse(f"{endpoint}/v3/sources")
        sdk_request_sources = SdkRequest(
            method="GET",
            schema=parsed_url_sources.scheme,
            host=parsed_url_sources.netloc,
            resource_path=parsed_url_sources.path,
            query_params=[("limit", "100"), ("offset", "0")],
            header_params={
                "Content-Type": "application/json",
                "X-Project-Id": hw_project_id
            }
        )
        signed_request_sources = signer.sign(sdk_request_sources)
        url_sources = f"{endpoint}/v3/sources?limit=100&offset=0"
        res_sources = requests.get(url_sources, headers=signed_request_sources.header_params, timeout=15)
        servers_data = res_sources.json().get('source_servers', []) if res_sources.status_code < 400 else []
        
        # 2. Fetch Active and Historic Migration Tasks
        parsed_url_tasks = urlparse(f"{endpoint}/v3/tasks")
        sdk_request_tasks = SdkRequest(
            method="GET",
            schema=parsed_url_tasks.scheme,
            host=parsed_url_tasks.netloc,
            resource_path=parsed_url_tasks.path,
            query_params=[("limit", "100"), ("offset", "0")],
            header_params={
                "Content-Type": "application/json",
                "X-Project-Id": hw_project_id
            }
        )
        signed_request_tasks = signer.sign(sdk_request_tasks)
        url_tasks = f"{endpoint}/v3/tasks?limit=100&offset=0"
        res_tasks = requests.get(url_tasks, headers=signed_request_tasks.header_params, timeout=15)
        tasks_data = res_tasks.json().get('tasks', []) if res_tasks.status_code < 400 else []
        
        # 3. Format Servers (Fixing the Bytes to GB bug)
        formatted_servers = []
        for s in servers_data:
            formatted_servers.append({
                "id": s.get('id', ""),
                "name": s.get('name', s.get('ip', "Unknown")),
                "ip": s.get('ip', ""),
                "os": s.get('os_type', "Unknown"),
                "cpu": s.get('cpu_quantity', 0),
                "ram": int(s.get('memory', 0) or 0) // (1024**3),  # Convert Bytes to GB
                "disk": sum(vol.get('size', 0) for vol in s.get('volumes', [])) if s.get('volumes') else 0,
                "agent_version": s.get('agent_version', "unknown"),
                "connected": s.get('connected', False),
                "state": s.get('state', "unknown"),
                "last_heartbeat": s.get('updated', "")
            })
        
        # 4. Format Tasks
        formatted_tasks = []
        for t in tasks_data:
            formatted_tasks.append({
                "id": t.get('id', ""),
                "name": t.get('name', ""),
                "type": t.get('type', ""),
                "state": t.get('state', ""),
                "progress": t.get('progress', 0),
                "start_time": t.get('start_time', ""),
                "end_time": t.get('end_time', ""),
                "source_server": t.get('source_server', {}).get('name', ""),
                "target_server": t.get('target_server', {}).get('name', "")
            })
        
        return jsonify({
            "success": True,
            "servers": formatted_servers,
            "tasks": formatted_tasks,
            "server_count": len(formatted_servers),
            "task_count": len(formatted_tasks)
        })
        
    except Exception as e:
        db.session.rollback()  # PR #25 FIX: Prevent SQLite locking
        import traceback
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()}), 500

@sms_bp.route('/api/wbs/task', methods=['POST'])
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

@sms_bp.route('/api/sms/log', methods=['POST'])
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