from flask import Flask, send_file, jsonify, request, send_from_directory
import subprocess
import json
import os
import time
import random
from pathlib import Path
from services.huawei_load_balancer import HuaweiLoadBalancer
from services.resource_parser import parse_resource_log, get_all_deployments
from services.excel_ingestor import process_quotation
from models import db, setup_db, ProjectData, GlobalPlaybooks, AdHocMigrationLog
from functools import wraps

app = Flask(__name__)

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
@app.route('/api/upload_quotation', methods=['POST'])
@requires_auth
def upload_quotation():
    """Upload Excel/CSV quotation and normalize to blueprint.json"""
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
        return jsonify({'success': False, 'error': str(e)})

# 11. Database-backed ERP state management
@app.route('/api/erp/state', methods=['GET'])
@requires_auth
def get_state():
    projects = ProjectData.query.all()
    playbooks = GlobalPlaybooks.query.filter_by(id="master").first()
    return jsonify({
        "projects": [json.loads(p.data) for p in projects],
        "playbooks": json.loads(playbooks.data) if playbooks else None
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

# SMS Demo Mocks
@app.route('/api/sms/discover', methods=['POST'])
@requires_auth
def sms_discover():
    req = request.json
    time.sleep(2)
    return jsonify({"success": True, "server": {"id": "src-live-99", "hostname": "live-legacy-web", "cpu": 4, "ram": 8, "disk": 120, "os": req.get('osType', 'linux')}})

@app.route('/api/sms/sync', methods=['POST'])
@requires_auth
def sms_sync():
    return jsonify({"success": True, "task_id": "task-sms-8821"})

@app.route('/api/sms/status', methods=['GET'])
@requires_auth
def sms_status():
    return jsonify({"success": True, "progress": random.randint(10, 100), "status_name": "Copying Disk Volumes..."})

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