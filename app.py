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
from models import db, setup_db
from functools import wraps
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdksms.v3 import SmsClient
from huaweicloudsdksms.v3 import ListServersRequest, ListTasksRequest
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='frontend/dist')  # Pointing to new Vite build output
# Enable CORS for all routes with more permissive settings
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Increase file upload size limit to 50MB
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# Setup database (PostgreSQL from env, fallback to SQLite)
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

# Import and register Blueprints
from routes.crm import crm_bp
# from routes.cloud_ops import cloud_ops_bp  # You will move Cloud APIs here next
# from routes.sms_migrations import sms_bp # You will move SMS APIs here next

app.register_blueprint(crm_bp)
# app.register_blueprint(cloud_ops_bp)
# app.register_blueprint(sms_bp)

# Serve the React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
@requires_auth
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Serve static files (JS modules) - fallback for old static files
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

# SMS Demo Mocks
@app.route('/api/sms/discover', methods=['POST'])
def sms_discover():
    req = request.json
    time.sleep(2)
    return jsonify({"success": True, "server": {"id": "src-live-99", "hostname": "live-legacy-web", "cpu": 4, "ram": 8, "disk": 120, "os": req.get('osType', 'linux')}})

@app.route('/test-sms')
def test_sms():
    return send_from_directory('templates', 'test_sms.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)