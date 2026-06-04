import os
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import json
from pathlib import Path
from models import setup_db
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from services.excel_ingestor import process_quotation
from flask_jwt_extended import JWTManager, jwt_required
from datetime import timedelta
import mimetypes

load_dotenv()

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

basedir = os.path.abspath(os.path.dirname(__file__))
dist_folder = os.path.join(basedir, 'frontend', 'dist')
app = Flask(__name__, static_folder=dist_folder)

@app.after_request
def add_header(response):
    if 'text/html' in response.headers.get('Content-Type', ''):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
    return response

# Global Error Handler to guarantee JSON on API crashes
@app.errorhandler(Exception)
def handle_exception(e):
    if request.path.startswith('/api/'):
        return jsonify({"success": False, "error": "Server Exception", "details": str(e)}), 500
    return send_from_directory(app.static_folder, 'index.html')

CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "super-secret-latam-erp-key-2026")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
jwt = JWTManager(app)

setup_db(app)
PROJECT_ROOT = Path(__file__).parent

# ==========================================
# BLUEPRINT REGISTRATIONS
# ==========================================
from routes.crm import crm_bp
from routes.cloud_ops import cloud_ops_bp
from routes.sms_migrations import sms_bp
from routes.auth import auth_bp
from routes.master_pipeline import master_pipeline_bp
from routes.execution import execution_bp # 🚨 The new Cognitive Agent Blueprint

app.register_blueprint(crm_bp)
app.register_blueprint(cloud_ops_bp)
app.register_blueprint(sms_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(master_pipeline_bp) 
app.register_blueprint(execution_bp) # 🚨 Registered to fix the 404 errors
# ==========================================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api/'):
        return jsonify({"success": False, "error": f"API Route Not Found: {path}"}), 404
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/upload_quotation', methods=['POST', 'OPTIONS'])
@jwt_required() 
def upload_quotation():
    if request.method == 'OPTIONS': return '', 200
    try:
        if 'file' not in request.files: return jsonify({'success': False, 'error': 'No file uploaded'})
        file = request.files['file']
        if file.filename == '': return jsonify({'success': False, 'error': 'No file selected'})
        
        customer_name = request.form.get('customer_name', 'Unknown Customer')
        upload_dir = PROJECT_ROOT / 'uploads'
        upload_dir.mkdir(exist_ok=True)
        safe_name = secure_filename(file.filename)
        temp_path = upload_dir / safe_name
        file.save(str(temp_path))
        
        blueprint = process_quotation(str(temp_path), customer_name)
        os.makedirs('config', exist_ok=True)
        with open('config/blueprint.json', 'w') as f: json.dump(blueprint, f, indent=2)
        temp_path.unlink(missing_ok=True)
        return jsonify({'success': True, 'blueprint': blueprint, 'stats': {'total_servers': len(blueprint['topology']['compute'])}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9119, debug=False)
