from flask import Flask, send_file, jsonify, request, send_from_directory
import subprocess
import json
import os
from pathlib import Path
from services.huawei_load_balancer import HuaweiLoadBalancer
from services.resource_parser import parse_resource_log, get_all_deployments

app = Flask(__name__)

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent

# Initialize Huawei Load Balancer
huawei_lb = HuaweiLoadBalancer()

# 1. Serve the Enterprise HTML Frontend
@app.route('/')
def serve_html():
    return send_file(str(PROJECT_ROOT / 'templates' / 'index.html'))

# 2. Serve static files (JS modules)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# 3. Receive Blueprint from the UI
@app.route('/api/blueprint', methods=['POST'])
def update_blueprint():
    data = request.json
    blueprint_path = PROJECT_ROOT / 'config' / 'blueprint.json'
    with open(blueprint_path, 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True})

# 4. Trigger Deployment
@app.route('/api/deploy', methods=['POST'])
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

# 5. Trigger Teardown
@app.route('/api/cleanup', methods=['POST'])
def cleanup():
    try:
        cleanup_script = PROJECT_ROOT / 'scripts' / 'cleanup_resources.sh'
        result = subprocess.run(['bash', str(cleanup_script), '--force'], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        return jsonify({'success': result.returncode == 0, 'output': result.stdout, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 6. Check deployment status
@app.route('/api/status', methods=['GET'])
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

# 7. Get deployment logs
@app.route('/api/logs', methods=['GET'])
def get_logs():
    try:
        deployments_dir = str(PROJECT_ROOT / 'deployments')
        deployments = get_all_deployments(deployments_dir)
        return jsonify({'success': True, 'deployments': deployments})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 8. Huawei ModelArts API endpoints
@app.route('/api/huawei/chat', methods=['POST'])
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
def huawei_keys_status():
    """Get status of Huawei API keys"""
    try:
        return jsonify(huawei_lb.get_status())
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    print("🚀 Huawei Cloud Infrastructure API Active. Serving dashboard on port 9119...")
    print(f"📁 Project root: {PROJECT_ROOT}")
    print(f"📊 Dashboard: http://localhost:9119")
    print(f"📈 API Status: http://localhost:9119/api/status")
    print(f"🤖 Huawei Chat API: http://localhost:9119/api/huawei/chat")
    print(f"🔑 Huawei Keys Status: http://localhost:9119/api/huawei/keys/status")
    app.run(host='0.0.0.0', port=9119, debug=True)