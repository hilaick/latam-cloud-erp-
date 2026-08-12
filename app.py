import os
import time
import hashlib
from flask import Flask, send_from_directory, request, jsonify, render_template_string
from flask_cors import CORS
import json
from pathlib import Path
from models import setup_db, db
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from services.quotation_router import process_quotation
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from datetime import timedelta, datetime
import mimetypes
import io
from werkzeug.datastructures import FileStorage

# Route imports
from routes.crm import crm_bp
from routes.cloud_ops import cloud_ops_bp
from routes.sms_migrations import sms_bp
from routes.auth import auth_bp
from routes.master_pipeline import master_pipeline_bp
from routes.execution import execution_bp
from routes.war_evaluation import war_bp
from routes.hermes import hermes_bp
from routes.hermes_cli_api import hermes_cli_bp
from routes.gateway import gateway_bp
from routes.resource_discovery import resource_discovery_bp
from routes.projects import projects_bp

load_dotenv()

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

basedir = os.path.abspath(os.path.dirname(__file__))
dist_folder = os.path.join(basedir, 'frontend', 'dist')  # point to Vite output dir
app = Flask(__name__, static_folder=dist_folder)

# Initialize Model Configuration Store (API keys for AI loadbalancer)
from services.model_config import ModelConfigStore
ModelConfigStore().init_app(app)

# Load n8n API key for workflow deployment (stored server-side to avoid CORS)
_n8n_key_path = '/etc/hermes_n8n_api_key'
if os.path.exists(_n8n_key_path):
    with open(_n8n_key_path) as _f:
        _n8n_key = _f.read().strip()
        if _n8n_key:
            os.environ['N8N_API_KEY'] = _n8n_key
            app.config['N8N_API_KEY'] = _n8n_key

# Initialize SocketIO explicitly with full CORS and Threading support
from flask_socketio import SocketIO

socketio = SocketIO(
    app, 
    cors_allowed_origins="*",      # Crucial: Unblocks the WebSocket handshake
    async_mode='threading',        # Crucial: Allows Werkzeug dev server to process WS
    ping_timeout=120,              # Keeps connection alive during heavy DeepSeek loads
    ping_interval=25
)

# Safely register Hermes real-time stream sockets
from routes.hermes import register_hermes_sockets
register_hermes_sockets(socketio)
# -------------------------------------------------------------
# Safely register Hermes real-time stream sockets here 
# to explicitly bypass circular imports
# -------------------------------------------------------------
from routes.hermes import register_hermes_sockets
register_hermes_sockets(socketio)


# Cache busting version
def get_js_version():
    # Dynamically find the JS file in assets folder
    if dist_folder and os.path.exists(dist_folder):
        assets_dir = os.path.join(dist_folder, 'assets')
        if os.path.exists(assets_dir):
            js_files = [f for f in os.listdir(assets_dir) if f.startswith('index-') and f.endswith('.js')]
            if js_files:
                js_path = os.path.join(assets_dir, js_files[0])
                if os.path.exists(js_path):
                    with open(js_path, 'rb') as f:
                        return hashlib.md5(f.read()).hexdigest()[:8]
    return str(int(time.time()))

@app.after_request
def add_header(response):
    if 'text/html' in response.headers.get('Content-Type', ''):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
    elif response.headers.get('Content-Type', '').startswith('application/javascript'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    if request.path.startswith('/api/'):
        return jsonify({"success": False, "error": "Server Exception", "details": str(e)}), 500
    return send_from_directory(app.static_folder, 'index.html')

CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "super-secret-latam-erp-key-2026!")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
jwt = JWTManager(app)

setup_db(app)
PROJECT_ROOT = Path(__file__).parent

@app.route('/api/diagnostic')
def diagnostic():
    js_path = os.path.join(dist_folder, 'assets', 'index-CB_R2RlF.js')
    js_exists = os.path.exists(js_path)
    js_size = os.path.getsize(js_path) if js_exists else 0
    js_mtime = os.path.getmtime(js_path) if js_exists else 0
    
    def check_js_for_fullscreen(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read(50000)  # Read first 50KB
                return any(keyword in content for keyword in [
                    'requestFullscreen', 'exitFullscreen', 'fullscreenElement', 
                    'fullscreenchange', 'toggleFullscreen', 'isMobile'
                ])
        except:
            return False
    
    return jsonify({
        'timestamp': time.time(),
        'server_time': time.strftime('%Y-%m-%d %H:%M:%S GMT', time.gmtime()),
        'js_file': {
            'exists': js_exists,
            'path': js_path,
            'size': js_size,
            'modified': time.strftime('%Y-%m-%d %H:%M:%S GMT', time.gmtime(js_mtime)) if js_mtime else None,
            'contains_fullscreen': check_js_for_fullscreen(js_path) if js_exists else False
        },
        'headers': dict(request.headers),
        'cache_control': 'no-store, no-cache, must-revalidate, max-age=0',
        'build_info': {
            'build_time': '2026-06-12 02:52:28 GMT',
            'features': ['architecture-canvas-container', 'fullscreen-api', 'mobile-detection']
        }
    })

@app.route('/api/debug/customers-test')
def debug_customers_test():
    """Debug endpoint to check customer data without auth"""
    try:
        from models import Customer
        customers = Customer.query.all()
        result = []
        for c in customers:
            result.append({
                "id": c.id,
                "name": c.name,
                "has_ak": bool(c.ak),
                "has_sk": bool(c.sk),
                "has_source_ak": bool(c.source_huawei_ak),
                "has_source_sk": bool(c.source_huawei_sk),
                "has_tier1_ak": bool(c.tier1_ak),
                "has_tier1_sk": bool(c.tier1_sk),
                "has_tier2_ak": bool(c.tier2_ak),
                "has_tier2_sk": bool(c.tier2_sk),
                "has_tier3_ak": bool(c.tier3_ak),
                "has_tier3_sk": bool(c.tier3_sk),
                "has_aws_ak": bool(c.aws_ak),
                "has_aws_sk": bool(c.aws_sk),
                "has_azure_client_id": bool(c.azure_client_id),
                "has_azure_client_secret": bool(c.azure_client_secret),
            })
        return jsonify({
            "success": True,
            "count": len(result),
            "customers": result
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': time.time()})

app.register_blueprint(crm_bp)
app.register_blueprint(cloud_ops_bp)
app.register_blueprint(sms_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(master_pipeline_bp)
app.register_blueprint(execution_bp)
app.register_blueprint(war_bp)
app.register_blueprint(hermes_bp)
app.register_blueprint(hermes_cli_bp) 
app.register_blueprint(gateway_bp)
app.register_blueprint(resource_discovery_bp)
app.register_blueprint(projects_bp)

# ── Help Documentation API ──
@app.route('/api/docs/<doc_name>', methods=['GET'])
@jwt_required()
def get_doc(doc_name):
    """Serve markdown documentation from the docs/ folder."""
    safe_name = os.path.basename(doc_name)  # prevent path traversal
    doc_path = os.path.join(basedir, 'docs', f'{safe_name}.md')
    if not os.path.exists(doc_path):
        return jsonify({'success': False, 'error': f'Document not found: {safe_name}'}), 404
    with open(doc_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return jsonify({'success': True, 'content': content, 'name': safe_name})

@app.route('/api/docs', methods=['GET'])
@jwt_required()
def list_docs():
    """List available documentation files."""
    docs_dir = os.path.join(basedir, 'docs')
    if not os.path.exists(docs_dir):
        return jsonify({'success': True, 'docs': []})
    files = [f.replace('.md', '') for f in os.listdir(docs_dir) if f.endswith('.md')]
    return jsonify({'success': True, 'docs': files})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api/'):
        return jsonify({"success": False, "error": f"API Route Not Found: {path}"}), 404
    if path != "" and os.path.exists(os.path.join(app.static_folder, str(path))):
        return send_from_directory(app.static_folder, path)
    
    # Serve index.html with cache-busting version
    index_path = os.path.join(app.static_folder, 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
            # Dynamically find and add version parameter to JS file
            if app.static_folder:
                assets_dir = os.path.join(app.static_folder, 'assets')
                if os.path.exists(assets_dir):
                    js_files = [f for f in os.listdir(assets_dir) if f.startswith('index-') and f.endswith('.js')]
                    if js_files:
                        # Pick the newest JS file by modification time
                        js_files.sort(key=lambda f: os.path.getmtime(os.path.join(assets_dir, f)), reverse=True)
                        actual_js_file = js_files[0]
                        # Find and replace the JS file reference in the HTML
                        import re
                        pattern = r'src=\"/assets/index-[^"]+\.js\"'
                        replacement = f'src=\"/assets/{actual_js_file}?v={get_js_version()}\"'
                        html_content = re.sub(pattern, replacement, html_content)
            return html_content
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/upload_quotation', methods=['POST', 'OPTIONS'])
@jwt_required() 
def upload_quotation():
    if request.method == 'OPTIONS': return '', 200
    try:
        raw_text = request.form.get('raw_text')
        file = request.files.get('file')
        
        if not file and not raw_text: 
            return jsonify({'success': False, 'error': 'No file or pasted data provided'})
        
        customer_name = request.form.get('customer_name', 'Unknown Customer')
        project_id = request.form.get('project_id')
        if not project_id:
            return jsonify({'success': False, 'error': 'Project ID is required for quotation versioning'})
        
        current_user = get_jwt_identity()
        
        if raw_text:
            text_bytes = raw_text.encode('utf-8')
            filename = f"pasted_data_{int(datetime.utcnow().timestamp())}.csv"
            file = FileStorage(stream=io.BytesIO(text_bytes), filename=filename, content_type='text/csv')
        else:
            filename = file.filename if file.filename else 'quotation.xlsx'
            
        from services.quotation_versioning import save_quotation_file, create_quotation_version
        file_path = save_quotation_file(project_id, file, filename)
        
        file.stream.seek(0)
        
        upload_dir = PROJECT_ROOT / 'uploads'
        upload_dir.mkdir(exist_ok=True)
        safe_name = secure_filename(filename)
        temp_path = upload_dir / safe_name
        file.save(str(temp_path))
        
        blueprint = process_quotation(str(temp_path), customer_name)
        
        version = create_quotation_version(
            project_id=project_id,
            filename=filename,
            file_path=file_path,
            uploaded_by=current_user,
            blueprint_data=blueprint,
            cr_id=request.form.get('cr_id')
        )
        
        from models import ProjectData
        import json as json_module
        project = ProjectData.query.get(project_id)
        if project:
            project_data = json_module.loads(project.data)
            project_data['blueprintData'] = blueprint
            project.data = json_module.dumps(project_data)
            project.updated_at = datetime.utcnow()
            db.session.commit()
        
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
    try:
        from services.quotation_versioning import get_quotation_versions as get_versions
        versions = get_versions(project_id)
        return jsonify({'success': True, 'versions': versions})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quotation/import-from-url', methods=['POST', 'OPTIONS'])
@jwt_required()
def import_quotation_from_url():
    """Import quotation from a Huawei Cloud Pricing Calculator share URL."""
    if request.method == 'OPTIONS': return '', 200
    try:
        data = request.get_json(silent=True) or {}
        url = data.get('url', '').strip()
        customer_name = data.get('customer_name', 'Unknown Customer')
        project_id = data.get('project_id')
        
        if not url:
            return jsonify({'success': False, 'error': 'URL is required'})
        if not project_id:
            return jsonify({'success': False, 'error': 'Project ID is required'})
        
        from services.pricing_calculator_parser import is_pricing_calculator_url, parse_from_share_url
        if not is_pricing_calculator_url(url):
            return jsonify({'success': False, 'error': 'URL is not a valid Huawei Cloud Pricing Calculator share link. Expected format: https://www.huaweicloud.com/intl/en-us/pricing/calculator.html?shareListId=...'})
        
        blueprint = parse_from_share_url(url, customer_name)
        
        # Save the blueprint JSON as a placeholder file for URL imports
        import json as json_module
        placeholder_path = PROJECT_ROOT / 'uploads' / 'quotations' / project_id
        placeholder_path.mkdir(parents=True, exist_ok=True)
        placeholder_file = placeholder_path / f"shared_link_{int(datetime.utcnow().timestamp())}.json"
        with open(placeholder_file, 'w') as f:
            json_module.dump(blueprint, f, indent=2)
        
        # Create a version record for the URL import
        from services.quotation_versioning import create_quotation_version
        current_user = get_jwt_identity()
        version = create_quotation_version(
            project_id=project_id,
            filename=f"shared_link_{int(datetime.utcnow().timestamp())}.json",
            file_path=str(placeholder_file),
            uploaded_by=current_user,
            blueprint_data=blueprint,
            cr_id=data.get('cr_id')
        )
        
        # Update project data
        from models import ProjectData
        import json as json_module
        project = ProjectData.query.get(project_id)
        if project:
            project_data = json_module.loads(project.data)
            project_data['blueprintData'] = blueprint
            project.data = json_module.dumps(project_data)
            project.updated_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({
            'success': True,
            'blueprint': blueprint,
            'message': 'Pricing Calculator share link imported. Download and upload the .xlsx file for complete resource-level parsing.',
            'version_id': version.id if version else None,
            'note': blueprint.get('note', '')
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/finops/upload-ecs-ri-quotation', methods=['POST', 'OPTIONS'])
@jwt_required()
def upload_ecs_ri_quotation():
    """Upload ECS RI quotation specifically for Commercial True-Up phase"""
    if request.method == 'OPTIONS': return '', 200
    try:
        file = request.files.get('file')
        project_id = request.form.get('project_id')
        
        if not file:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        if not project_id:
            return jsonify({'success': False, 'error': 'Project ID is required'}), 400
        
        current_user = get_jwt_identity()
        
        # Save uploaded file
        upload_dir = PROJECT_ROOT / 'uploads' / 'ecs_ri_quotations'
        upload_dir.mkdir(exist_ok=True, parents=True)
        
        filename = secure_filename(file.filename) if file.filename else 'ecs_ri_quotation.xlsx'
        file_path = upload_dir / filename
        file.save(str(file_path))
        
        import pandas as pd
        import logging
        logger = logging.getLogger(__name__)
        
        file_ext = filename.lower()
        if file_ext.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_ext.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path, header=None)
        else:
            return jsonify({'success': False, 'error': 'Unsupported file format.'}), 400
        
        ecs_ri_servers = []
        servers_parsed = 0
        servers_skipped = 0
        
        for idx, row in df.iterrows():
            if idx < 3:
                continue
                
            first_cell = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
            if not first_cell or first_cell == 'Required':
                servers_skipped += 1
                continue
            
            footer_keywords = ['total', 'monthly', 'price', 'discount', 'implementation', 'fee', 'iaas']
            if any(keyword in first_cell.lower() for keyword in footer_keywords):
                break
                
            server_name = first_cell
            
            service_col = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else ''
            if not service_col or 'elastic cloud server' not in service_col.lower():
                servers_skipped += 1
                continue
            
            spec_raw = str(row.iloc[9]) if len(row) > 9 and pd.notna(row.iloc[9]) else ''
            specification = 'Unknown'
            
            if spec_raw:
                parts = spec_raw.split('|')
                for part in parts:
                    part = part.strip()
                    import re
                    flavor_pattern = r'^[a-z][a-z0-9]*(\.[a-z0-9]+)+$'
                    if re.match(flavor_pattern, part.lower()):
                        specification = part
                        break
                    if '.' in part and any(c.isdigit() for c in part) and any(c.isalpha() for c in part):
                        if not any(os_word in part.lower() for os_word in ['linux', 'centos', 'ubuntu', 'windows', 'alma', 'redhat', 'debian']):
                            specification = part
                            break
            
            quantity_val = row.iloc[8] if len(row) > 8 else 1
            try:
                quantity = int(float(quantity_val)) if pd.notna(quantity_val) else 1
            except:
                quantity = 1
            
            description = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else server_name
            region = str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else 'la-south-2'
            billing_mode = str(row.iloc[5]).strip() if len(row) > 5 and pd.notna(row.iloc[5]) else 'RI'
            
            ecs_ri_servers.append({
                "name": server_name,
                "specification": specification,
                "quantity": quantity,
                "description": description,
                "region": region,
                "billing_mode": billing_mode,
                "raw_spec": spec_raw[:50] + '...' if len(spec_raw) > 50 else spec_raw
            })
            servers_parsed += 1
        
        from models import ProjectData
        import json as json_module
        
        project = ProjectData.query.get(project_id)
        if not project:
            project = ProjectData(id=project_id, project_type='migration', data=json_module.dumps({}))
            db.session.add(project)
        
        project_data = json_module.loads(project.data) if project.data else {}
        project_data['ri_quotation'] = {
            'filename': filename,
            'file_path': str(file_path),
            'uploaded_at': datetime.utcnow().isoformat(),
            'uploaded_by': current_user,
            'servers': ecs_ri_servers
        }
        project.data = json_module.dumps(project_data)
        project.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'ECS RI quotation uploaded successfully',
            'count': len(ecs_ri_servers),
            'filename': filename,
            'servers': ecs_ri_servers,
            'preview': ecs_ri_servers[:10]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finops/clear-ecs-ri-quotation', methods=['POST'])
@jwt_required()
def clear_ecs_ri_quotation():
    try:
        project_id = request.json.get('project_id')
        if not project_id:
            return jsonify({'success': False, 'error': 'Project ID is required'}), 400
        
        current_user = get_jwt_identity()
        from models import ProjectData
        import json as json_module
        
        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        project_data = json_module.loads(project.data) if project.data else {}
        if 'ri_quotation' in project_data:
            del project_data['ri_quotation']
            project.data = json_module.dumps(project_data)
            project.updated_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'ECS RI quotation cleared successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quotation/version/<version_id>', methods=['GET'])
@jwt_required()
def get_quotation_version(version_id):
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
    try:
        from services.quotation_versioning import revert_to_version
        blueprint = revert_to_version(version_id)
        if not blueprint:
            return jsonify({'success': False, 'error': 'Failed to revert version'}), 400
        
        return jsonify({'success': True, 'blueprint': blueprint})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finops/query_price', methods=['POST'])
@jwt_required()
def finops_query_price():
    """Mock endpoint for live pricing - returns estimated costs based on nodes"""
    try:
        data = request.get_json()
        duration_months = data.get('duration_months', 3)
        nodes = data.get('nodes', [])
        
        # Calculate estimated overhead cost based on nodes
        total_cost = 0
        bom_items = []
        
        for i, node in enumerate(nodes):
            node_type = str(node.get('type', '')).upper()
            storage = float(node.get('storage', 0))
            
            # Estimate costs based on node type
            if 'ECS' in node_type:
                base_cost = 100 * duration_months  # $100/month per ECS
                storage_cost = storage * 0.10 * duration_months  # $0.10/GB/month
                item_cost = base_cost + storage_cost
                
                bom_items.append({
                    'id': f'ecs-{i}',
                    'name': node.get('name', f'ECS-{i}'),
                    'type': 'ECS',
                    'spec': f'{storage}GB Storage',
                    'cost_per_month': round(base_cost + storage_cost, 2),
                    'selected': True
                })
                total_cost += item_cost
                
            elif 'RDS' in node_type:
                base_cost = 200 * duration_months  # $200/month per RDS
                storage_cost = storage * 0.15 * duration_months  # $0.15/GB/month
                item_cost = base_cost + storage_cost
                
                bom_items.append({
                    'id': f'rds-{i}',
                    'name': node.get('name', f'RDS-{i}'),
                    'type': 'RDS',
                    'spec': f'{storage}GB Storage',
                    'cost_per_month': round(base_cost + storage_cost, 2),
                    'selected': True
                })
                total_cost += item_cost
                
            elif 'OBS' in node_type:
                cost = storage * 0.03 * duration_months  # $0.03/GB/month
                
                bom_items.append({
                    'id': f'obs-{i}',
                    'name': node.get('name', f'OBS-{i}'),
                    'type': 'OBS',
                    'spec': f'{storage}GB Storage',
                    'cost_per_month': round(cost, 2),
                    'selected': True
                })
                total_cost += cost
        
        # Add migration service overhead (20% of infrastructure cost)
        migration_overhead = total_cost * 0.20
        
        return jsonify({
            'success': True,
            'overhead_cost': round(migration_overhead, 2),
            'bom_items': bom_items
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finops/billing_validation', methods=['POST'])
@jwt_required()
def finops_billing_validation():
    """Fetch actual Huawei Cloud billing data and compare against estimated BOM costs.
    
    In production, this queries Huawei Cloud BSS API (Pay-Per-Use billing endpoint).
    For demo/PoC, generates realistic comparison data based on project parameters.
    """
    try:
        data = request.get_json()
        start_date = data.get('start_date', '')
        end_date = data.get('end_date', '')
        estimated_cost = float(data.get('estimated_cost', 0))
        bom_items = data.get('bom_items', [])
        currency = data.get('currency', 'USD')
        project_id = data.get('project_id', '')
        
        # Parse dates, fall back to duration_months for backward compat
        from datetime import datetime
        if start_date and end_date:
            start_dt = datetime.strptime(start_date[:10], '%Y-%m-%d')
            end_dt = datetime.strptime(end_date[:10], '%Y-%m-%d')
            duration_months = max(1, round((end_dt - start_dt).days / 30.44, 1))
        else:
            duration_months = int(data.get('duration_months', 3))
            start_dt = None
            end_dt = None
        
        # Regional pricing multipliers (LATAM)
        region_multipliers = {
            'la-santiago-1': 1.12, 'la-sao-paulo-1': 1.08, 'la-mexico-city-1': 1.05,
            'la-bogota-1': 1.06, 'la-lima-1': 1.10, 'la-buenos-aires-1': 0.95
        }
        
        # Simulate actual invoiced amounts (in production: Huawei Cloud BSS API call)
        # BOM items map to real cloud services with actual consumption
        line_items = []
        total_invoiced = 0
        
        for item in bom_items:
            cat = str(item.get('category', item.get('type', 'ECS'))).upper()
            
            # Simulate real usage patterns: actual costs are typically 85-115% of estimated
            import random, hashlib
            seed = hashlib.md5((item.get('id','') + str(duration_months)).encode()).hexdigest()
            rng = random.Random(int(seed[:8], 16))
            variance_factor = rng.uniform(0.82, 1.18)
            
            estimated_item = float(item.get('cost_per_month', 0))
            actual_amount = round(estimated_item * variance_factor * duration_months, 2)
            total_invoiced += actual_amount
            
            variance = actual_amount - (estimated_item * duration_months)
            variance_pct = abs(variance / (estimated_item * duration_months)) * 100 if estimated_item > 0 else 0
            
            if variance_pct > 20:
                status = 'danger'
                note = f'Significant overrun: +{variance_pct:.0f}% vs estimate. Check for unexpected scaling or unused resources.'
            elif variance_pct > 10:
                status = 'warning'
                note = f'Moderate variance: {variance_pct:.0f}% deviation. Consider RI purchase to stabilize costs.'
            else:
                status = 'ok'
                note = 'Within expected range.'
            
            line_items.append({
                'id': item.get('id'),
                'category': cat,
                'name': item.get('name', cat),
                'estimated': round(estimated_item * duration_months, 2),
                'amount': actual_amount,
                'variance': round(variance, 2),
                'variance_pct': round(variance_pct, 1),
                'status': status,
                'note': note,
                'currency': currency
            })
        
        variance = round(total_invoiced - estimated_cost, 2)
        variance_pct = abs(variance / estimated_cost * 100) if estimated_cost > 0 else 0

        # Compute category groups for major resource classes
        CATEGORY_MAP = {
            'ECS': 'Compute', 'ELB': 'Compute', 'AS': 'Compute',
            'RDS': 'Database', 'DDS': 'Database', 'DRS': 'Database', 'GAUSSDB': 'Database',
            'EVS': 'Storage', 'OBS': 'Storage', 'SFS': 'Storage', 'CBR': 'Storage',
            'VPC': 'Networking', 'EIP': 'Networking', 'NAT': 'Networking', 'VPN': 'Networking',
            'DIRECTCONNECT': 'Networking', 'CC': 'Networking', 'DNS': 'Networking'
        }
        category_groups = {}
        for item in line_items:
            cat = str(item['category']).upper()
            major_cat = CATEGORY_MAP.get(cat, 'Other')
            if major_cat not in category_groups:
                category_groups[major_cat] = {'category': major_cat, 'estimated': 0, 'actual': 0, 'variance': 0, 'items': []}
            category_groups[major_cat]['estimated'] += item['estimated']
            category_groups[major_cat]['actual'] += item['amount']
            category_groups[major_cat]['variance'] += item['variance']
            category_groups[major_cat]['items'].append(item)
        # Calculate variance percentages
        for g in category_groups.values():
            g['variance_pct'] = round(abs(g['variance']) / g['estimated'] * 100, 1) if g['estimated'] > 0 else 0
        category_groups_list = sorted(category_groups.values(), key=lambda x: x['actual'], reverse=True)
        
        if variance_pct > 20:
            overall_status = 'warning'
            recommendation = 'Budget overrun critical. Immediate RI purchase recommended. Review unused resources for termination.'
        elif variance_pct > 10:
            overall_status = 'warning'
            recommendation = 'Budget trending over estimate. Consider 1-year RI commitment for core workloads.'
        elif variance < 0 and abs(variance_pct) > 5:
            overall_status = 'ok'
            recommendation = 'Under budget — good execution discipline. Consider applying surplus to next wave.'
        else:
            overall_status = 'ok'
            recommendation = 'Budget on track. Continue monitoring.'
        
        # RI recommendation engine
        ri_recommendations = []
        for item in bom_items:
            cat = str(item.get('category', item.get('type', ''))).upper()
            monthly = float(item.get('cost_per_month', 0))
            
            if cat == 'ECS' and monthly > 50:
                # Suggest RI for ECS instances running > 1 month
                ri_1yr_savings = round(monthly * 12 * 0.35, 2)  # ~35% savings with 1yr RI
                ri_3yr_savings = round(monthly * 36 * 0.55, 2)  # ~55% savings with 3yr RI
                ri_recommendations.append({
                    'id': item.get('id'),
                    'name': item.get('name', cat),
                    'type': 'ECS Reserved Instance',
                    'current_monthly': monthly,
                    'ri_1yr_monthly': round(monthly * 0.65, 2),
                    'ri_1yr_total_savings': ri_1yr_savings,
                    'ri_3yr_monthly': round(monthly * 0.45, 2),
                    'ri_3yr_total_savings': ri_3yr_savings,
                    'break_even_months': 8,
                    'action': 'Purchase 1-year RI' if duration_months >= 8 else 'Consider on-demand (migration < 8 months)'
                })
            elif cat == 'RDS' and monthly > 80:
                ri_1yr_savings = round(monthly * 12 * 0.30, 2)
                ri_recommendations.append({
                    'id': item.get('id'),
                    'name': item.get('name', cat),
                    'type': 'RDS Reserved Instance',
                    'current_monthly': monthly,
                    'ri_1yr_monthly': round(monthly * 0.70, 2),
                    'ri_1yr_total_savings': ri_1yr_savings,
                    'break_even_months': 9,
                    'action': 'Purchase 1-year RDS RI' if duration_months >= 9 else 'Consider on-demand'
                })
        
        # Time-series budget snapshots (simulated weekly burn)
        import math
        budget_snapshots = []
        weekly_burn = estimated_cost / (duration_months * 4.33) if duration_months > 0 else 0
        for week in range(1, int(duration_months * 4.33) + 1):
            cumulative_actual = round(weekly_burn * week * rng.uniform(0.90, 1.10), 2)
            budget_snapshots.append({
                'week': week,
                'label': f'Week {week}',
                'cumulative_estimated': round(weekly_burn * week, 2),
                'cumulative_actual': cumulative_actual,
                'variance': round(cumulative_actual - weekly_burn * week, 2)
            })
        
        result = {
            'success': True,
            'invoiced_total': round(total_invoiced, 2),
            'estimated_total': round(estimated_cost, 2),
            'variance': variance,
            'variance_pct': round(variance_pct, 1),
            'status': overall_status,
            'recommendation': recommendation,
            'currency': currency,
            'line_items': line_items,
            'category_groups': category_groups_list,
            'ri_recommendations': ri_recommendations,
            'budget_snapshots': budget_snapshots,
            'fetched_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finops/upload-ecs-ri-raw', methods=['POST'])
@jwt_required()
def upload_ecs_ri_raw():
    try:
        data = request.get_json()
        project_id = data.get('project_id')
        raw_data = data.get('data')
        format_type = data.get('format', 'csv')
        
        if not project_id or not raw_data:
            return jsonify({'success': False, 'error': 'Missing data'}), 400
        
        current_user = get_jwt_identity()
        import pandas as pd
        import json as json_module
        
        ecs_ri_servers = []
        
        if format_type == 'csv':
            import io
            sample = raw_data[:500]
            has_headers = 'Required,Service,Description,Region,AZ,Billing Mode,Purchase Amount,Unit,Quantity,Specifications' in sample
            
            if has_headers:
                df = pd.read_csv(io.StringIO(raw_data))
                expected_columns = ['Required', 'Service', 'Description', 'Region', 'AZ', 'Billing Mode', 'Purchase Amount', 'Unit', 'Quantity', 'Specifications']
                missing_cols = [col for col in expected_columns if col not in df.columns]
                if missing_cols:
                    df = pd.read_csv(io.StringIO(raw_data), header=None)
            else:
                df = pd.read_csv(io.StringIO(raw_data), header=None)
            
            start_row = 0
            if has_headers and 'Required' in df.columns:
                start_row = 0
            elif len(df) > 0 and str(df.iloc[0, 0]).strip() == 'Required':
                start_row = 1
            
            for idx, row in df.iterrows():
                if idx < start_row: continue
                first_cell = str(row.iloc[0]).strip() if len(row) > 0 and pd.notna(row.iloc[0]) else ''
                if not first_cell: continue
                
                footer_keywords = ['total', 'monthly', 'price', 'discount', 'implementation', 'fee', 'iaas']
                if any(keyword in first_cell.lower() for keyword in footer_keywords): break
                    
                server_name = first_cell
                service_col = str(row['Service']).strip() if has_headers and 'Service' in df.columns and pd.notna(row['Service']) else (str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else '')
                
                if not service_col or 'elastic cloud server' not in service_col.lower(): continue
                
                spec_raw = str(row['Specifications']).strip() if has_headers and 'Specifications' in df.columns and pd.notna(row['Specifications']) else (str(row.iloc[9]).strip() if len(row) > 9 and pd.notna(row.iloc[9]) else '')
                specification = 'Unknown'
                
                if spec_raw:
                    parts = spec_raw.split('|')
                    for part in parts:
                        part = part.strip()
                        import re
                        if re.match(r'^[a-z][a-z0-9]*(\.[a-z0-9]+)+$', part.lower()):
                            specification = part
                            break
                        if '.' in part and any(c.isdigit() for c in part) and any(c.isalpha() for c in part):
                            if not any(os_word in part.lower() for os_word in ['linux', 'centos', 'ubuntu', 'windows', 'alma', 'redhat', 'debian']):
                                specification = part
                                break
                
                quantity = 1
                try:
                    q_val = row['Quantity'] if has_headers and 'Quantity' in df.columns else (row.iloc[8] if len(row) > 8 else 1)
                    quantity = int(float(q_val)) if pd.notna(q_val) else 1
                except: pass
                
                description = str(row['Description']).strip() if has_headers and 'Description' in df.columns and pd.notna(row['Description']) else (str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else server_name)
                region = str(row['Region']).strip() if has_headers and 'Region' in df.columns and pd.notna(row['Region']) else (str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else 'la-south-2')
                billing_mode = str(row['Billing Mode']).strip() if has_headers and 'Billing Mode' in df.columns and pd.notna(row['Billing Mode']) else (str(row.iloc[5]).strip() if len(row) > 5 and pd.notna(row.iloc[5]) else 'RI')
                
                ecs_ri_servers.append({
                    "name": server_name,
                    "specification": specification,
                    "quantity": quantity,
                    "description": description,
                    "region": region,
                    "billing_mode": billing_mode,
                    "raw_spec": spec_raw[:50] + '...' if len(spec_raw) > 50 else spec_raw
                })
            
        elif format_type == 'json':
            servers = json_module.loads(raw_data)
            if isinstance(servers, list):
                for server in servers:
                    if isinstance(server, dict):
                        ecs_ri_servers.append({
                            "name": server.get('name', ''),
                            "specification": server.get('specification', 'Unknown'),
                            "quantity": server.get('quantity', 1),
                            "description": server.get('description', server.get('name', '')),
                            "region": server.get('region', 'la-south-2'),
                            "billing_mode": server.get('billing_mode', 'RI')
                        })
        
        from models import ProjectData
        project = ProjectData.query.get(project_id)
        if not project:
            project = ProjectData(id=project_id, project_type='migration', data=json_module.dumps({}))
            db.session.add(project)
        
        project_data = json_module.loads(project.data) if project.data else {}
        project_data['ri_quotation'] = {
            'filename': f'raw_upload_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.{format_type}',
            'uploaded_at': datetime.utcnow().isoformat(),
            'uploaded_by': current_user,
            'servers': ecs_ri_servers,
            'source': 'raw_upload',
            'format': format_type
        }
        project.data = json_module.dumps(project_data)
        project.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'ECS RI quotation uploaded successfully',
            'count': len(ecs_ri_servers),
            'servers': ecs_ri_servers
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quotation/link-cr', methods=['POST'])
@jwt_required()
def link_quotation_to_cr():
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

if __name__ == '__main__':
    # Run with SocketIO support
    socketio.run(app, host='0.0.0.0', port=9119, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)
