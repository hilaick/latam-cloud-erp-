from flask import Flask, send_file, jsonify, request
import subprocess
import json
import os
from pathlib import Path

app = Flask(__name__)

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# 1. Serve the Enterprise HTML Frontend
@app.route('/')
def serve_html():
    html_path = PROJECT_ROOT / 'templates' / 'regional_delivery-17.html'
    return send_file(str(html_path))

# 2. Receive Blueprint from the UI
@app.route('/api/blueprint', methods=['POST'])
def update_blueprint():
    data = request.json
    blueprint_path = PROJECT_ROOT / 'config' / 'blueprint.json'
    with open(blueprint_path, 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True})

# 3. Trigger Deployment
@app.route('/api/deploy', methods=['POST'])
def deploy():
    try:
        # We run the self-healing audit first!
        audit_script = PROJECT_ROOT / 'scripts' / 'audit.sh'
        deploy_script = PROJECT_ROOT / 'scripts' / 'deploy_real.sh'
        
        subprocess.run(['bash', str(audit_script)], check=True, cwd=str(PROJECT_ROOT))
        result = subprocess.run(['bash', str(deploy_script)], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        return jsonify({'success': result.returncode == 0, 'output': result.stdout, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 4. Trigger Teardown
@app.route('/api/destroy', methods=['POST'])
def destroy():
    try:
        cleanup_script = PROJECT_ROOT / 'scripts' / 'cleanup_resources.sh'
        result = subprocess.run(['bash', str(cleanup_script), '--force'], capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        return jsonify({'success': result.returncode == 0, 'output': result.stdout, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 5. Check deployment status
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
        
        # Read the latest log
        latest_log = resource_logs[-1]
        log_path = deployments_dir / latest_log
        with open(log_path, 'r') as f:
            content = f.read()
        
        # Parse basic info
        resources = {}
        for line in content.strip().split('\n'):
            if '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"\'')
                resources[key] = value
        
        return jsonify({
            'status': 'deployed',
            'latest_log': latest_log,
            'resources': resources,
            'total_deployments': len(resource_logs)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    print("🚀 Huawei Cloud Infrastructure API Active. Serving dashboard on port 9119...")
    print(f"📁 Project root: {PROJECT_ROOT}")
    print(f"📊 Dashboard: http://localhost:9119")
    print(f"📈 API Status: http://localhost:9119/api/status")
    app.run(host='0.0.0.0', port=9119, debug=True)