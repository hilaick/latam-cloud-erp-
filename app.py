import os
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import json
from pathlib import Path
from models import setup_db, db
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from services.excel_ingestor import process_huawei_quotation as process_quotation
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from datetime import timedelta, datetime
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

# 🚨 FIX: Global Error Handler to guarantee JSON on API crashes
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

from routes.crm import crm_bp
from routes.cloud_ops import cloud_ops_bp
from routes.sms_migrations import sms_bp
from routes.auth import auth_bp
from routes.master_pipeline import master_pipeline_bp

app.register_blueprint(crm_bp)
app.register_blueprint(cloud_ops_bp)
app.register_blueprint(sms_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(master_pipeline_bp) 

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
        project_id = request.form.get('project_id')
        if not project_id:
            return jsonify({'success': False, 'error': 'Project ID is required for quotation versioning'})
        
        # Get current user for audit trail
        current_user = get_jwt_identity()
        
        # Save file permanently with versioning
        from services.quotation_versioning import save_quotation_file, create_quotation_version
        filename = file.filename if file.filename else 'quotation.xlsx'
        file_path = save_quotation_file(project_id, file, filename)
        
        # Process the quotation
        upload_dir = PROJECT_ROOT / 'uploads'
        upload_dir.mkdir(exist_ok=True)
        safe_name = secure_filename(file.filename)
        temp_path = upload_dir / safe_name
        file.save(str(temp_path))
        
        blueprint = process_quotation(str(temp_path), customer_name)
        
        # Create version record
        version = create_quotation_version(
            project_id=project_id,
            filename=file.filename,
            file_path=file_path,
            uploaded_by=current_user,
            blueprint_data=blueprint,
            cr_id=request.form.get('cr_id')  # Optional: link to CR if this is a CR-triggered update
        )
        
        # Update project's blueprintData
        from models import ProjectData
        import json as json_module
        project = ProjectData.query.get(project_id)
        if project:
            project_data = json_module.loads(project.data)
            project_data['blueprintData'] = blueprint
            project.data = json_module.dumps(project_data)
            project.updated_at = datetime.utcnow()
            db.session.commit()
        
        # Also save to config/blueprint.json for backward compatibility
        os.makedirs('config', exist_ok=True)
        with open('config/blueprint.json', 'w') as f: json.dump(blueprint, f, indent=2)
        
        # Clean up temp file
        temp_path.unlink(missing_ok=True)
        
        return jsonify({
            'success': True, 
            'blueprint': blueprint, 
            'stats': {'total_servers': len(blueprint['topology']['compute'])},
            'version_id': version.id,
            'version_number': version.version_number,
            'change_summary': version.change_summary
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/quotation/versions/<project_id>', methods=['GET'])
@jwt_required()
def get_quotation_versions(project_id):
    """Get all quotation versions for a project"""
    try:
        from services.quotation_versioning import get_quotation_versions as get_versions
        versions = get_versions(project_id)
        return jsonify({'success': True, 'versions': versions})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quotation/version/<version_id>', methods=['GET'])
@jwt_required()
def get_quotation_version(version_id):
    """Get a specific quotation version"""
    try:
        from services.quotation_versioning import get_quotation_version as get_version
        version = get_version(version_id)
        if not version:
            return jsonify({'success': False, 'error': 'Version not found'}), 404
        return jsonify({'success': True, 'version': version})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quotation/revert/<version_id>', methods=['POST'])
@jwt_required()
def revert_quotation_version(version_id):
    """Revert project blueprint to a specific quotation version"""
    try:
        from services.quotation_versioning import revert_to_version
        blueprint = revert_to_version(version_id)
        if not blueprint:
            return jsonify({'success': False, 'error': 'Failed to revert version'}), 400
        
        # Also update config/blueprint.json for backward compatibility
        os.makedirs('config', exist_ok=True)
        with open('config/blueprint.json', 'w') as f: json.dump(blueprint, f, indent=2)
        
        return jsonify({'success': True, 'blueprint': blueprint})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quotation/link-cr', methods=['POST'])
@jwt_required()
def link_quotation_to_cr():
    """Link a quotation version to a Change Request"""
    try:
        data = request.get_json()
        version_id = data.get('version_id')
        cr_id = data.get('cr_id')
        
        if not version_id or not cr_id:
            return jsonify({'success': False, 'error': 'Missing version_id or cr_id'}), 400
        
        from services.quotation_versioning import link_cr_to_quotation_version
        success = link_cr_to_quotation_version(cr_id, version_id)
        
        if success:
            return jsonify({'success': True, 'message': 'CR linked to quotation version'})
        else:
            return jsonify({'success': False, 'error': 'Version not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
