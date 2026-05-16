from flask import Flask, send_file, jsonify, request
import subprocess
import json
import os

app = Flask(__name__)

# 1. Serve the Enterprise HTML Frontend
@app.route('/')
def serve_html():
    return send_file('regional_delivery-17.html')

# 2. Receive Blueprint from the UI
@app.route('/api/blueprint', methods=['POST'])
def update_blueprint():
    data = request.json
    with open('blueprint.json', 'w') as f:
        json.dump(data, f, indent=2)
    return jsonify({'success': True})

# 3. Trigger Deployment
@app.route('/api/deploy', methods=['POST'])
def deploy():
    try:
        # We run the self-healing audit first!
        subprocess.run(['bash', './audit.sh'], check=True)
        result = subprocess.run(['bash', './deploy_real.sh'], capture_output=True, text=True)
        return jsonify({'success': result.returncode == 0, 'output': result.stdout, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 4. Trigger Teardown
@app.route('/api/destroy', methods=['POST'])
def destroy():
    try:
        result = subprocess.run(['bash', './cleanup_resources.sh', '--force'], capture_output=True, text=True)
        return jsonify({'success': result.returncode == 0, 'output': result.stdout, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 5. Check deployment status
@app.route('/api/status', methods=['GET'])
def status():
    try:
        # Check if we have resource logs
        resource_logs = sorted([f for f in os.listdir('.') 
                              if f.startswith('huawei_resources_') and f.endswith('.log')])
        
        if not resource_logs:
            return jsonify({'status': 'no_deployments', 'message': 'No deployments found'})
        
        # Read the latest log
        latest_log = resource_logs[-1]
        with open(latest_log, 'r') as f:
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
    print("🚀 Ghost API Active. Serving Enterprise ERP on port 9119...")
    app.run(host='0.0.0.0', port=9119, debug=True)