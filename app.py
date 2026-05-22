import os
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import subprocess
import json
from pathlib import Path
from services.huawei_load_balancer import HuaweiLoadBalancer
from services.resource_parser import parse_resource_log, get_all_deployments
from services.excel_ingestor import process_quotation
from models import setup_db
from dotenv import load_dotenv

load_dotenv()

# Add this near the top where app is initialized:
basedir = os.path.abspath(os.path.dirname(__file__))
dist_folder = os.path.join(basedir, 'frontend', 'dist')
app = Flask(__name__, static_folder=dist_folder)

# Enable CORS for all routes with more permissive settings
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Increase file upload size limit to 50MB
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# Setup database (PostgreSQL from env, fallback to SQLite)
setup_db(app)

# Register Blueprint after setup_db(app):
from routes.crm import crm_bp
app.register_blueprint(crm_bp)

# Basic Authentication Configuration
# IMPORTANT: Set these environment variables for production:
# export DASHBOARD_USERNAME="your_secure_username"
# export DASHBOARD_PASSWORD="strong...here"
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
    """Sends a 401 response that enables basic auth."""
    return jsonify({
        "error": "Authentication required",
        "authenticate": "Basic realm=\"Huawei Cloud ERP Dashboard\""
    }), 401, {'WWW-Authenticate': 'Basic realm="Huawei Cloud ERP Dashboard"'}

def requires_auth(f):
    """Decorator to require authentication for a route."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        # Skip auth for allowed IPs
        client_ip = request.remote_addr
        if client_ip in ALLOWED_IPS:
            return f(*args, **kwargs)
        
        # Block denied IPs immediately
        if client_ip in DENIED_IPS:
            return jsonify({"error": "Access denied"}), 403
        
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve the React app for any route not explicitly defined."""
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files from the static directory."""
    return send_from_directory('static', filename)

@app.route('/api/blueprint', methods=['POST'])
@requires_auth
def update_blueprint():
    """Update the blueprint configuration."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Save to blueprint.json
        with open('config/blueprint.json', 'w') as f:
            json.dump(data, f, indent=2)
        
        return jsonify({"message": "Blueprint updated successfully", "data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/audit', methods=['POST'])
@requires_auth
def run_audit():
    """Run the Huawei Cloud resource audit."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        ak = data.get('ak')
        sk = data.get('sk')
        region = data.get('region', 'ap-southeast-3')
        
        if not ak or not sk:
            return jsonify({"error": "AK and SK are required"}), 400
        
        # Run the audit script
        result = subprocess.run(
            ['python3', 'scripts/audit_quick.sh', ak, sk, region],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode != 0:
            return jsonify({"error": result.stderr}), 500
        
        # Parse the audit results
        audit_file = 'deployments/huawei_resources.log'
        if os.path.exists(audit_file):
            with open(audit_file, 'r') as f:
                content = f.read()
            resources = parse_resource_log(content)
            return jsonify({
                "message": "Audit completed successfully",
                "resources": resources,
                "raw_output": result.stdout
            })
        else:
            return jsonify({
                "message": "Audit completed but no resources file found",
                "raw_output": result.stdout
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deploy', methods=['POST'])
@requires_auth
def deploy():
    """Deploy resources based on blueprint."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        ak = data.get('ak')
        sk = data.get('sk')
        region = data.get('region', 'ap-southeast-3')
        resources = data.get('resources', [])
        
        if not ak or not sk:
            return jsonify({"error": "AK and SK are required"}), 400
        
        if not resources:
            return jsonify({"error": "No resources to deploy"}), 400
        
        # For now, just log the deployment request
        # In a real implementation, this would call Huawei Cloud APIs
        deployment_log = {
            "timestamp": subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S']).decode().strip(),
            "region": region,
            "resources": resources,
            "status": "requested"
        }
        
        # Save deployment log
        log_file = f"deployments/deployment_{int(subprocess.check_output(['date', '+%s']).decode().strip())}.json"
        os.makedirs('deployments', exist_ok=True)
        with open(log_file, 'w') as f:
            json.dump(deployment_log, f, indent=2)
        
        return jsonify({
            "message": "Deployment request received",
            "log_file": log_file,
            "deployment": deployment_log
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cleanup', methods=['POST'])
@requires_auth
def cleanup():
    """Clean up deployed resources."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        ak = data.get('ak')
        sk = data.get('sk')
        region = data.get('region', 'ap-southeast-3')
        resource_ids = data.get('resource_ids', [])
        
        if not ak or not sk:
            return jsonify({"error": "AK and SK are required"}), 400
        
        # For now, just log the cleanup request
        cleanup_log = {
            "timestamp": subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S']).decode().strip(),
            "region": region,
            "resource_ids": resource_ids,
            "status": "requested"
        }
        
        # Save cleanup log
        log_file = f"deployments/cleanup_{int(subprocess.check_output(['date', '+%s']).decode().strip())}.json"
        os.makedirs('deployments', exist_ok=True)
        with open(log_file, 'w') as f:
            json.dump(cleanup_log, f, indent=2)
        
        return jsonify({
            "message": "Cleanup request received",
            "log_file": log_file,
            "cleanup": cleanup_log
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/status', methods=['GET'])
def status():
    """Get API status and list all deployments."""
    try:
        deployments = get_all_deployments()
        return jsonify({
            "status": "online",
            "deployments": deployments,
            "message": "No deployments found" if not deployments else f"Found {len(deployments)} deployments"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs', methods=['GET'])
@requires_auth
def get_logs():
    """Get the latest audit logs."""
    try:
        log_file = 'deployments/huawei_resources.log'
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                content = f.read()
            return jsonify({"logs": content})
        else:
            return jsonify({"message": "No logs found"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/huawei/chat', methods=['POST'])
@requires_auth
def huawei_chat():
    """Chat with Huawei Cloud API using load balancer."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        message = data.get('message', '')
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        # Initialize load balancer
        lb = HuaweiLoadBalancer()
        
        # Get response from Huawei Cloud
        response = lb.chat(message)
        
        return jsonify({
            "response": response,
            "key_used": lb.current_key_index,
            "total_keys": len(lb.api_keys)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/huawei/keys/status', methods=['GET'])
@requires_auth
def huawei_keys_status():
    """Get status of Huawei Cloud API keys."""
    try:
        lb = HuaweiLoadBalancer()
        return jsonify({
            "total_keys": len(lb.api_keys),
            "active_keys": lb.get_active_key_count(),
            "keys": [
                {
                    "index": i,
                    "last_used": key.get('last_used'),
                    "error_count": key.get('error_count', 0),
                    "is_active": key.get('is_active', True)
                }
                for i, key in enumerate(lb.api_keys)
            ]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload_quotation', methods=['POST', 'OPTIONS'])
@requires_auth
def upload_quotation():
    """Upload and process Excel quotation file."""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if file and file.filename.endswith(('.xlsx', '.xls', '.csv')):
            # Save the file temporarily
            filename = os.path.join('uploads', file.filename)
            os.makedirs('uploads', exist_ok=True)
            file.save(filename)
            
            # Process the quotation
            result = process_quotation(filename)
            
            return jsonify({
                "message": "File uploaded and processed successfully",
                "filename": file.filename,
                "result": result
            })
        else:
            return jsonify({"error": "Invalid file type. Please upload Excel or CSV file."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sms/discover', methods=['POST'])
@requires_auth
def sms_discover():
    """Discover SMS servers with Huawei Cloud SDK."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        ak = data.get('ak')
        sk = data.get('sk')
        region = data.get('region', 'ap-southeast-3')
        
        if not ak or not sk:
            return jsonify({"error": "AK and SK are required"}), 400
        
        # Import here to avoid circular imports
        from services.sms_handler import discover_servers
        
        servers = discover_servers(ak, sk, region)
        return jsonify({
            "message": "SMS discovery completed",
            "servers": servers,
            "count": len(servers)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/test-sms')
def test_sms():
    """Test SMS discovery page."""
    return send_from_directory('templates', 'test_sms.html')

if __name__ == '__main__':
    print("🚀 Huawei Cloud Infrastructure API Active. Serving dashboard on port 9119...")
    print(f"📁 Project root: {os.path.abspath(os.path.dirname(__file__))}")
    print(f"📊 Dashboard: http://0.0.0.0:9119")
    print(f"🔍 Environment Audit: http://0.0.0.0:9119/api/audit")
    print(f"📈 API Status: http://0.0.0.0:9119/api/status")
    print(f"📤 Upload Quotation: http://0.0.0.0:9119/api/upload_quotation")
    print(f"🤖 Huawei Chat API: http://0.0.0.0:9119/api/huawei/chat")
    print(f"🔑 Huawei Keys Status: http://0.0.0.0:9119/api/huawei/keys/status")
    
    # Run without debug mode to prevent redirect issues
    app.run(host='0.0.0.0', port=9119, debug=False)
