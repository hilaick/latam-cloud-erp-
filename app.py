from flask import Flask, send_file, jsonify, request, send_from_directory
from flask_cors import CORS
import subprocess
import json
import os
import time
import random
from pathlib import Path
from services.huawei_load_balancer import HuaweiLoadBalancer
from services.resource_parser import parse_resource_log, get_all_deployments
from services.excel_ingestor import process_quotation
from services.wbs_ingestor import parse_wbs_csv
from models import db, setup_db, ProjectData, GlobalPlaybooks, AdHocMigrationLog, Customer, WBSTask
from functools import wraps
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdksms.v3 import SmsClient
from huaweicloudsdksms.v3 import ListServersRequest, ListTasksRequest

app = Flask(__name__)
# Enable CORS for all routes with more permissive settings
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Increase file upload size limit to 50MB
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# Setup SQLite database
setup_db(app)

# Basic Authentication Configuration
# IMPORTANT: Set these environment variables for production:
# export DASHBOARD_USERNAME="your_secure_username"
# export DASHBOARD_PASSWORD="strong_random_password_here"
USERNAME = os.environ.get('DASHBOARD_USERNAME', 'admin')
PASSWORD = os.environ.get('DASHBOARD_PASSWORD', 'changeme123')

# Allowed IPs (no authentication required for these)
# Add your team's IPs, VPN IPs, or trusted networks here
ALLOWED_IPS = [
    '127.0.0.1',      # localhost
    'localhost',       # localhost hostname
    '::1',             # IPv6 localhost
    '159.138.148.45',  # Your current IP
    '154.47.28.240'    # IP you want to allow (previously blocked)
]

# Denied IPs (blocked immediately)
DENIED_IPS = [
    '1.94.223.28'      # Suspicious Chinese IP from security alert
]

def check_auth(username, password):
    """Check if username/password combination is valid."""
    return username == USERNAME and password == PASSWORD

def authenticate():
    """Send 401 response to enable basic auth."""
    return jsonify({
        'success': False,
        'error': 'Authentication required',
        'message': 'Please provide valid credentials'
    }), 401, {'WWW-Authenticate': 'Basic realm="Dashboard Access"'}

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Get client IP, checking X-Forwarded-For for proxy scenarios
        client_ip = request.remote_addr
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            # Take the first IP in X-Forwarded-For chain
            client_ip = forwarded_for.split(',')[0].strip()
        
        # Check if IP is in denied list
        if client_ip in DENIED_IPS:
            return jsonify({
                'success': False,
                'error': 'Access denied',
                'message': 'Your IP has been blocked due to suspicious activity'
            }), 403
        
        # Check if IP is in allowed list
        if client_ip in ALLOWED_IPS:
            return f(*args, **kwargs)
        
        # Check for basic auth
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent

# Initialize Huawei Load Balancer
huawei_lb = HuaweiLoadBalancer()

# 0. Test endpoint for CORS
@app.route('/api/test-cors', methods=['GET', 'OPTIONS'])
def test_cors():
    """Test endpoint to verify CORS is working"""
    if request.method == 'OPTIONS':
        return '', 200
    return jsonify({'success': True, 'message': 'CORS test successful', 'timestamp': time.time()})

# 1. Serve the Enterprise HTML Frontend
@app.route('/')
@requires_auth
def serve_html():
    return send_file(str(PROJECT_ROOT / 'templates' / 'index.html'))

# 2. Serve static files (JS modules)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# 3. Receive Blueprint from the UI
@app.route('/api/blueprint', methods=['POST'])
@requires_auth
def update_blueprint():
    data = request.json
    blueprint_path = PROJECT_ROOT / 'config' / 'blueprint.json'
    with open(blueprint_path, 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True})

# 4. Run Environment Audit
@app.route('/api/audit', methods=['POST'])
@requires_auth
def run_audit():
    try:
        audit_script = PROJECT_ROOT / 'scripts' / 'audit_quick.sh'
        result = subprocess.run(['bash', str(audit_script)], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        return jsonify({
            'success': result.returncode == 0,
            'output': result.stdout,
            'error': result.stderr,
            'exit_code': result.returncode
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 5. Trigger Deployment
@app.route('/api/deploy', methods=['POST'])
@requires_auth
def deploy():
    try:
        # Run the self-healing audit first
        audit_script = PROJECT_ROOT / 'scripts' / 'audit_quick.sh'
        deploy_script = PROJECT_ROOT / 'scripts' / 'deploy_real_tagged.sh'
        
        subprocess.run(['bash', str(audit_script)], check=True, cwd=str(PROJECT_ROOT))
        result = subprocess.run(['bash', str(deploy_script)], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        return jsonify({'success': result.returncode == 0, 'output': result.stdout, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 6. Trigger Teardown
@app.route('/api/cleanup', methods=['POST'])
@requires_auth
def cleanup():
    try:
        cleanup_script = PROJECT_ROOT / 'scripts' / 'cleanup_resources.sh'
        result = subprocess.run(['bash', str(cleanup_script), '--force'], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        return jsonify({'success': result.returncode == 0, 'output': result.stdout, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 7. Check deployment status
@app.route('/api/status', methods=['GET'])
@requires_auth
def status():
    try:
        # Check if we have resource logs
        deployments_dir = PROJECT_ROOT / 'deployments'
        deployments_dir.mkdir(exist_ok=True)
        
        resource_logs = sorted([f for f in os.listdir(str(deployments_dir)) 
                              if f.startswith('huawei_resources_') and f.endswith('.log')])
        
        if not resource_logs:
            return jsonify({'status': 'no_deployments', 'message': 'No deployments found'})
        
        # Read and parse the latest log
        latest_log = resource_logs[-1]
        log_path = deployments_dir / latest_log
        
        resources = parse_resource_log(str(log_path))
        
        return jsonify({
            'status': 'deployed',
            'latest_log': latest_log,
            'resources': resources,
            'total_deployments': len(resource_logs)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 8. Get deployment logs
@app.route('/api/logs', methods=['GET'])
@requires_auth
def get_logs():
    try:
        deployments_dir = str(PROJECT_ROOT / 'deployments')
        deployments = get_all_deployments(deployments_dir)
        return jsonify({'success': True, 'deployments': deployments})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 9. Huawei ModelArts API endpoints
@app.route('/api/huawei/chat', methods=['POST'])
@requires_auth
def huawei_chat():
    """Proxy to Huawei ModelArts chat completion with load balancing"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'})
        
        response = huawei_lb.chat_completion(data)
        return jsonify(response)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/huawei/keys/status', methods=['GET'])
@requires_auth
def huawei_keys_status():
    """Get status of Huawei API keys"""
    try:
        return jsonify(huawei_lb.get_status())
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 10. Upload and process quotation files
@app.route('/api/upload_quotation', methods=['POST', 'OPTIONS'])
@requires_auth
def upload_quotation():
    """Upload Excel/CSV quotation and normalize to blueprint.json"""
    if request.method == 'OPTIONS':
        # Handle preflight request
        return '', 200
    
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'})
        
        file = request.files['file']
        
        # Check if file has a name
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        # Check file extension
        allowed_extensions = {'csv', 'xlsx', 'xls'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                'success': False, 
                'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'
            })
        
        # Get customer name from form data
        customer_name = request.form.get('customer_name', 'Unknown Customer')
        
        # Save file temporarily
        upload_dir = PROJECT_ROOT / 'uploads'
        upload_dir.mkdir(exist_ok=True)
        
        temp_path = upload_dir / f'temp_quotation.{file_ext}'
        file.save(str(temp_path))
        
        # Process the quotation
        blueprint = process_quotation(str(temp_path), customer_name)
        
        # Save to blueprint.json
        blueprint_path = PROJECT_ROOT / 'config' / 'blueprint.json'
        with open(blueprint_path, 'w') as f:
            json.dump(blueprint, f, indent=2)
        
        # Clean up temp file
        temp_path.unlink(missing_ok=True)
        
        return jsonify({
            'success': True,
            'message': f'Quotation processed successfully. Generated blueprint for {customer_name}',
            'blueprint': blueprint,
            'stats': {
                'total_servers': len(blueprint['topology']['compute']),
                'warnings': len([s for s in blueprint['topology']['compute'] if s['status'] == 'WARNING'])
            }
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Error processing quotation: {str(e)}")
        print(f"📋 Traceback: {error_trace}")
        return jsonify({'success': False, 'error': str(e), 'trace': error_trace})

# 11. Database-backed ERP state management
@app.route('/api/erp/state', methods=['GET'])
@requires_auth
def get_state():
    projects = ProjectData.query.all()
    playbooks = GlobalPlaybooks.query.filter_by(id="master").first()
    customers = Customer.query.all()
    return jsonify({
        "projects": [json.loads(p.data) for p in projects],
        "playbooks": json.loads(playbooks.data) if playbooks else None,
        "customers": [{"id": c.id, "name": c.name, "ak": c.ak, "sk": c.sk, "region": c.region, "cio": c.cio, "it_lead": c.it_lead, "architect": c.architect} for c in customers]
    })

@app.route('/api/erp/projects', methods=['POST'])
@requires_auth
def save_project():
    req = request.json
    project_id = str(req.get('id'))
    proj = ProjectData.query.get(project_id)
    if not proj:
        proj = ProjectData(id=project_id)
        db.session.add(proj)
    proj.data = json.dumps(req)
    db.session.commit()
    return jsonify({"success": True})

@app.route('/api/erp/playbooks', methods=['POST'])
@requires_auth
def save_playbooks():
    pb = GlobalPlaybooks.query.filter_by(id="master").first()
    if not pb:
        pb = GlobalPlaybooks(id="master")
        db.session.add(pb)
    pb.data = json.dumps(request.json)
    db.session.commit()
    return jsonify({"success": True})

@app.route('/api/erp/customers', methods=['GET', 'POST'])
@requires_auth
def handle_customers():
    try:
        if request.method == 'GET':
            customers = Customer.query.all()
            return jsonify({
                "success": True, 
                "customers": [{"id": c.id, "name": c.name, "ak": c.ak, "sk": c.sk, "region": c.region, "cio": c.cio, "it_lead": c.it_lead, "architect": c.architect} for c in customers]
            })
        else:
            req = request.json
            c_id = str(req.get('id'))
            customer = Customer.query.get(c_id)
            if not customer:
                customer = Customer(id=c_id)
                db.session.add(customer)
            
            customer.name = req.get('name', customer.name)
            customer.ak = req.get('ak', customer.ak)
            customer.sk = req.get('sk', customer.sk)
            customer.region = req.get('region', customer.region)
            customer.cio = req.get('cio', customer.cio)
            customer.it_lead = req.get('it_lead', customer.it_lead)
            customer.architect = req.get('architect', customer.architect)
            db.session.commit()
            return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# 12. Ad-Hoc SMS Migration endpoints
@app.route('/api/sms/log', methods=['POST'])
@requires_auth
def log_adhoc_migration():
    req = request.json
    log_entry = AdHocMigrationLog(
        task_id=req.get('task_id'), region=req.get('region'),
        source_os=req.get('source_os'), target_flavor=req.get('target_flavor'), target_subnet=req.get('target_subnet')
    )
    db.session.add(log_entry)
    db.session.commit()
    return jsonify({"success": True})

@app.route('/test-sms')
def test_sms():
    return send_from_directory('templates', 'test_sms.html')

# SMS Demo Mocks
@app.route('/api/sms/discover', methods=['POST'])
def sms_discover():
    req = request.json
    time.sleep(2)
    return jsonify({"success": True, "server": {"id": "src-live-99", "hostname": "live-legacy-web", "cpu": 4, "ram": 8, "disk": 120, "os": req.get('osType', 'linux')}})

@app.route('/api/sms/discover/public', methods=['POST'])
def sms_discover_public():
    try:
        req = request.json
        ak = req.get('ak')
        sk = req.get('sk')
        project_id = req.get('projectId', '').strip()
        region = req.get('region', 'la-south-2').strip()
        os_type = req.get('osType', 'linux')
        
        if not ak or not sk or not project_id:
            return jsonify({"success": False, "error": "AK, SK, and Project ID are required"}), 400
            
        import requests
        from huaweicloudsdkcore.signer.signer import Signer
        from huaweicloudsdkcore.sdk_request import SdkRequest
        from urllib.parse import urlparse
        
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
                "X-Project-Id": project_id
            }
        )
        
        # 3. Create credentials and cryptographically sign the request using Huawei's V4 Signer
        credentials = BasicCredentials(ak, sk, project_id)
        signer = Signer(credentials)
        signed_request = signer.sign(sdk_request)
        
        # 4. BYPASS THE SDK: Execute natively via the requests library
        url = f"{endpoint}/v3/sources?limit=50&offset=0"
        response = requests.get(url, headers=signed_request.header_params)
        
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
            "servers": servers,
            "message": f"Found {len(servers)} servers." if servers else "No source servers found with SMS agents."
        })
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Huawei Cloud SMS HTTP Bypass Error: {error_msg}")
        print(traceback.format_exc())
        
        return jsonify({
            "success": False, 
            "error": error_msg
        }), 500
        def patched_value_of(region_id):
            if region_id == region:
                return custom_region
            return SmsRegion._original_value_of(region_id)
            
        SmsRegion.value_of = staticmethod(patched_value_of)
        
        # 3. Proceed as normal - The SDK will now accept our LATAM region natively
        credentials = BasicCredentials(ak, sk, project_id)
        
        client = SmsClient.new_builder() \
            .with_credentials(credentials) \
            .with_region(SmsRegion.value_of(region)) \
            .build()
        
        servers = []
        
        # Pull servers strictly from the live Huawei Console API
        servers_request = ListServersRequest()
        servers_request.limit = 50
        servers_request.offset = 0
        
        servers_response = client.list_servers(servers_request)
        
        if hasattr(servers_response, 'servers') and servers_response.servers:
            for server in servers_response.servers:
                server_info = {
                    "id": getattr(server, 'id', ""),
                    "hostname": getattr(server, 'name', getattr(server, 'ip', "Unknown")),
                    "cpu": getattr(server, 'cpu_quantity', 0),
                    "ram": getattr(server, 'memory', 0),
                    "disk": sum(getattr(vol, 'size', 0) for vol in getattr(server, 'volumes', [])) if hasattr(server, 'volumes') else 0,
                    "os": getattr(server, 'os_type', os_type),
                    "status": getattr(server, 'state', 'unknown'),
                    "agent_version": getattr(server, 'agent_version', 'unknown'),
                    "ip": getattr(server, 'ip', ''),
                    "agent_status": 'connected' if getattr(server, 'connected', False) else 'disconnected',
                    "sync_status": 'idle', 
                    "last_heartbeat": getattr(server, 'updated', '')
                }
                servers.append(server_info)
        
        return jsonify({
            "success": True, 
            "servers": servers,
            "message": f"Found {len(servers)} servers." if servers else "No source servers found with SMS agents."
        })
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Huawei Cloud SMS API Error: {error_msg}")
        print(traceback.format_exc())
        
        return jsonify({
            "success": False, 
            "error": error_msg
        }), 500

@app.route('/api/sms/monitor', methods=['POST'])
def sms_monitor_public():
    try:
        req = request.json
        ak = req.get('ak')
        sk = req.get('sk')
        project_id = req.get('projectId', '').strip()
        region = req.get('region', 'la-south-2').strip()
        
        if not ak or not sk or not project_id:
            return jsonify({"success": False, "error": "AK, SK, and Project ID are required"}), 400
            
        import requests
        from huaweicloudsdkcore.signer.signer import Signer
        from huaweicloudsdkcore.sdk_request import SdkRequest
        from huaweicloudsdkcore.auth.credentials import BasicCredentials
        from urllib.parse import urlparse
        
        # Handle LATAM → Singapore routing
        if region in ['la-north-2', 'la-south-2', 'sa-brazil-1']:
            # LATAM regions route through Singapore SMS control plane
            endpoint = "https://sms.ap-southeast-3.myhuaweicloud.com"
        else:
            # Use the region directly for supported regions
            endpoint = f"https://sms.{region}.myhuaweicloud.com"
        
        # Create credentials for signing
        credentials = BasicCredentials(ak, sk, project_id)
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
                "X-Project-Id": project_id
            }
        )
        signed_request_sources = signer.sign(sdk_request_sources)
        url_sources = f"{endpoint}/v3/sources?limit=100&offset=0"
        res_sources = requests.get(url_sources, headers=signed_request_sources.header_params)
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
                "X-Project-Id": project_id
            }
        )
        signed_request_tasks = signer.sign(sdk_request_tasks)
        url_tasks = f"{endpoint}/v3/tasks?limit=100&offset=0"
        res_tasks = requests.get(url_tasks, headers=signed_request_tasks.header_params)
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
                "ram": int(s.get('memory', 0) or 0) // (1024**3), # Convert Bytes to GB
                "state": s.get('state', "Unknown"),
                "connected": s.get('connected', False),
                "agent_version": s.get('agent_version', "Unknown")
            })
            
        # 4. Format Tasks
        formatted_tasks = []
        for t in tasks_data:
            formatted_tasks.append({
                "id": t.get('id', ""),
                "name": t.get('name', ""),
                "state": t.get('state', "Unknown"),
                "progress": t.get('progress', 0),
                "migration_type": t.get('type', "SERVER"),
                "start_date": t.get('start_date', 0),
                "target_flavor": t.get('target_server', {}).get('flavor', 'Unknown') if t.get('target_server') else 'Unknown'
            })
            
        return jsonify({
            "success": True, 
            "servers": formatted_servers,
            "tasks": formatted_tasks
        })
        
    except Exception as e:
        import traceback
        return jsonify({"success": False, "error": str(e), "trace": traceback.format_exc()}), 500

@app.route('/api/cloud/inventory', methods=['POST'])
def cloud_inventory():
    try:
        req = request.json
        ak, sk = req.get('ak'), req.get('sk')
        project_id = req.get('projectId', '').strip()
        region = req.get('region', 'la-south-2').strip()
        
        if not ak or not sk or not project_id:
            return jsonify({"success": False, "error": "AK, SK, and Project ID required"}), 400
            
        import requests
        from huaweicloudsdkcore.signer.signer import Signer
        from huaweicloudsdkcore.sdk_request import SdkRequest
        from huaweicloudsdkcore.auth.credentials import BasicCredentials
        from urllib.parse import urlparse
        
        # Create credentials for signing
        credentials = BasicCredentials(ak, sk, project_id)
        signer = Signer(credentials)
        inventory = {"ecs": [], "vpc": [], "rds": []}
        
        # 1. Fetch ECS Servers
        ecs_url = f"https://ecs.{region}.myhuaweicloud.com/v1/{project_id}/cloudservers"
        parsed_ecs_url = urlparse(ecs_url)
        sdk_request_ecs = SdkRequest(
            method="GET",
            schema=parsed_ecs_url.scheme,
            host=parsed_ecs_url.netloc,
            resource_path=parsed_ecs_url.path,
            header_params={
                "Content-Type": "application/json",
                "X-Project-Id": project_id
            }
        )
        signed_request_ecs = signer.sign(sdk_request_ecs)
        res_ecs = requests.get(ecs_url, headers=signed_request_ecs.header_params)
        if res_ecs.status_code < 400:
            inventory['ecs'] = res_ecs.json().get('servers', [])

        # 2. Fetch VPCs & Subnets
        vpc_url = f"https://vpc.{region}.myhuaweicloud.com/v1/{project_id}/vpcs"
        parsed_vpc_url = urlparse(vpc_url)
        sdk_request_vpc = SdkRequest(
            method="GET",
            schema=parsed_vpc_url.scheme,
            host=parsed_vpc_url.netloc,
            resource_path=parsed_vpc_url.path,
            header_params={
                "Content-Type": "application/json",
                "X-Project-Id": project_id
            }
        )
        signed_request_vpc = signer.sign(sdk_request_vpc)
        res_vpc = requests.get(vpc_url, headers=signed_request_vpc.header_params)
        if res_vpc.status_code < 400:
            inventory['vpc'] = res_vpc.json().get('vpcs', [])
            
        # 3. Fetch RDS Databases
        rds_url = f"https://rds.{region}.myhuaweicloud.com/v3/{project_id}/instances"
        parsed_rds_url = urlparse(rds_url)
        sdk_request_rds = SdkRequest(
            method="GET",
            schema=parsed_rds_url.scheme,
            host=parsed_rds_url.netloc,
            resource_path=parsed_rds_url.path,
            header_params={
                "Content-Type": "application/json",
                "X-Project-Id": project_id
            }
        )
        signed_request_rds = signer.sign(sdk_request_rds)
        res_rds = requests.get(rds_url, headers=signed_request_rds.header_params)
        if res_rds.status_code < 400:
            inventory['rds'] = res_rds.json().get('instances', [])

        return jsonify({"success": True, "inventory": inventory})
        
    except Exception as e:
        import traceback
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/sms/sync', methods=['POST'])
@requires_auth
def sms_sync():
    return jsonify({"success": True, "task_id": "task-sms-8821"})

@app.route('/api/sms/status', methods=['GET'])
@requires_auth
def sms_status():
    return jsonify({"success": True, "progress": random.randint(10, 100), "status_name": "Copying Disk Volumes..."})

# 12. WBS and MgC Endpoints
@app.route('/api/wbs/upload', methods=['POST'])
@requires_auth
def upload_wbs():
    project_id = request.form.get('project_id')
    file = request.files.get('file')
    if not file or not project_id: 
        return jsonify({"success": False, "error": "Missing file or project ID"})
    
    tasks = parse_wbs_csv(file.read())
    # Delete old tasks for this project
    WBSTask.query.filter_by(project_id=project_id).delete()
    
    for t in tasks:
        db.session.add(WBSTask(
            project_id=project_id, wbs_id=t['wbs_id'], name=t['name'],
            progress=t['progress'], raci=t['raci'], start_date=t['start_date'], 
            end_date=t['end_date'], is_parent=t['is_parent']
        ))
    db.session.commit()
    return jsonify({"success": True, "tasks": tasks})

@app.route('/api/wbs/global', methods=['GET'])
@requires_auth
def get_global_wbs():
    tasks = WBSTask.query.all()
    out = [{
        "id": t.id, 
        "project_id": t.project_id, 
        "wbs_id": t.wbs_id, 
        "name": t.name, 
        "progress": t.progress, 
        "raci": t.raci, 
        "start_date": t.start_date, 
        "end_date": t.end_date, 
        "is_parent": t.is_parent
    } for t in tasks]
    return jsonify({"success": True, "tasks": out})

@app.route('/api/mgc/discover', methods=['POST'])
@requires_auth
def mgc_discover():
    # In a real environment, this polls Huawei MgC API. For MVP, we return a mock diff payload.
    import time
    time.sleep(2)
    return jsonify({"success": True, "servers": [
        {"hostname": "web-server-1", "cpu": 4, "ram": 8, "disk": 100},
        {"hostname": "db-server-1", "cpu": 16, "ram": 64, "disk": 500}, # Intentional Sizing Creep
        {"hostname": "legacy-ad-01", "cpu": 2, "ram": 4, "disk": 50}    # Intentional Unquoted Server
    ]})

if __name__ == '__main__':
    print("🚀 Huawei Cloud Infrastructure API Active. Serving dashboard on port 9119...")
    print(f"📁 Project root: {PROJECT_ROOT}")
    print(f"📊 Dashboard: http://0.0.0.0:9119")
    print(f"🔍 Environment Audit: http://0.0.0.0:9119/api/audit")
    print(f"📈 API Status: http://0.0.0.0:9119/api/status")
    print(f"📤 Upload Quotation: http://0.0.0.0:9119/api/upload_quotation")
    print(f"🤖 Huawei Chat API: http://0.0.0.0:9119/api/huawei/chat")
    print(f"🔑 Huawei Keys Status: http://0.0.0.0:9119/api/huawei/keys/status")
    
    # Run without debug mode to prevent redirect issues
    app.run(host='0.0.0.0', port=9119, debug=False)