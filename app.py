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
from services.excel_ingestor import process_huawei_quotation as process_quotation
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

load_dotenv()

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

basedir = os.path.abspath(os.path.dirname(__file__))
dist_folder = os.path.join(basedir, 'frontend', 'dist')
app = Flask(__name__, static_folder=dist_folder)

# Cache busting version
def get_js_version():
    js_path = os.path.join(dist_folder, 'assets', 'index-CB_R2RlF.js')
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
            # Add version parameter to JS file
            version = get_js_version()
            html_content = html_content.replace(
                'src=\"/assets/index-BJU6pUef.js\"',
                f'src=\"/assets/index-CB_R2RlF.js?v={version}\"'
            )
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
        
        # 🚨 Removed the `config/blueprint.json` writing logic here to prevent Flask Hot-Reload crashes!
        
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
        
        # Process Excel/CSV file to extract ECS RI data
        import pandas as pd
        import logging
        logger = logging.getLogger(__name__)
        
        # Read the file based on extension
        file_ext = filename.lower()
        if file_ext.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_ext.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path, header=None)  # Read without headers since they're in row 1
        else:
            return jsonify({'success': False, 'error': 'Unsupported file format. Please upload .csv, .xlsx, or .xls'}), 400
        
        logger.info(f"Uploaded file: {filename}, shape: {df.shape}")
        logger.info(f"Columns: {df.columns.tolist() if hasattr(df, 'columns') else 'No columns'}")
        logger.info(f"First 5 rows preview:")
        for i in range(min(5, len(df))):
            logger.info(f"Row {i}: {list(df.iloc[i].fillna('').astype(str).values)}")
        
        # Parse ECS RI data from Excel - Huawei Price Calculator format
        ecs_ri_servers = []
        servers_parsed = 0
        servers_skipped = 0
        
        # Skip first 3 rows (empty row 0, title row 1, and header row 2)
        for idx, row in df.iterrows():
            if idx < 3:  # Skip empty row (0), title row (1), and header row (2)
                continue
                
            # Check if row has data (first column not empty and not "Required" header)
            # Also stop parsing when we hit footer rows like "Total Price", "Monthly Price", etc.
            first_cell = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
            if not first_cell or first_cell == 'Required':
                servers_skipped += 1
                continue
            
            # Stop parsing when we hit footer rows
            footer_keywords = ['total', 'monthly', 'price', 'discount', 'implementation', 'fee', 'iaas']
            if any(keyword in first_cell.lower() for keyword in footer_keywords):
                logger.info(f"Stopping parsing at row {idx} (footer row: '{first_cell}')")
                break
                
            server_name = first_cell
            
            # Check if this is an ECS server (Service column should contain "Elastic Cloud Server")
            service_col = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else ''
            if not service_col or 'elastic cloud server' not in service_col.lower():
                servers_skipped += 1
                logger.info(f"Skipping row {idx}: Not an ECS server (Service: '{service_col}')")
                continue
            
            # Extract specification from column 9 (Specifications)
            spec_raw = str(row.iloc[9]) if len(row) > 9 and pd.notna(row.iloc[9]) else ''
            specification = 'Unknown'
            
            # Try to extract flavor from specifications string
            # Format examples:
            # "BYOL | General computing | x0.8u.16g | 8 vCPUs | 16GiB | No Upfront | 3 Years; General Purpose SSD | 280GB;"
            # "BYOL | General computing-plus | ac8.xlarge.4 | 4 vCPUs | 16GiB | No Upfront | 3 Years; General Purpose SSD | 280GB;"
            if spec_raw:
                # Split by pipe and look for flavor patterns
                parts = spec_raw.split('|')
                for part in parts:
                    part = part.strip()
                    # Look for patterns like x0.8u.16g, ac8.xlarge.4, m7n.16xlarge.8, etc.
                    # Pattern: starts with letter, has digits and dots, ends with letter/digit
                    import re
                    # Match patterns like: x0.8u.16g, ac8.xlarge.4, m7n.16xlarge.8, c7.2xlarge.4
                    flavor_pattern = r'^[a-z][a-z0-9]*(\.[a-z0-9]+)+$'
                    if re.match(flavor_pattern, part.lower()):
                        specification = part
                        break
                    # Also check for patterns with version numbers: x0.8u.16g, x0.4u.6g
                    if '.' in part and any(c.isdigit() for c in part) and any(c.isalpha() for c in part):
                        # Check if it looks like a flavor (not an OS description)
                        if not any(os_word in part.lower() for os_word in ['linux', 'centos', 'ubuntu', 'windows', 'alma', 'redhat', 'debian']):
                            specification = part
                            break
            
            # Get quantity (column 8)
            quantity_val = row.iloc[8] if len(row) > 8 else 1
            try:
                quantity = int(float(quantity_val)) if pd.notna(quantity_val) else 1
            except:
                quantity = 1
            
            # Get description (column 2)
            description = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else server_name
            
            # Get region (column 3)
            region = str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else 'la-south-2'
            
            # Get billing mode (column 5)
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
        
        logger.info(f"Parsed {servers_parsed} servers, skipped {servers_skipped} rows")
        if ecs_ri_servers:
            logger.info(f"First server: {ecs_ri_servers[0]}")
            logger.info(f"Last server: {ecs_ri_servers[-1]}")
        else:
            logger.warning("No servers parsed from Excel!")
            logger.warning(f"DataFrame shape: {df.shape}")
            logger.warning("First 10 rows after skipping headers:")
            for i in range(3, min(13, len(df))):
                logger.warning(f"Row {i}: {list(df.iloc[i].fillna('').astype(str).values)}")
        
        # Store in database
        from models import ProjectData
        import json as json_module
        
        project = ProjectData.query.get(project_id)
        if not project:
            # Create new project if it doesn't exist
            project = ProjectData(id=project_id, project_type='migration', data=json_module.dumps({}))
            db.session.add(project)
        
        # Update project data with ECS RI quotation (separate from main blueprint)
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
            'servers': ecs_ri_servers,  # Include servers in response
            'preview': ecs_ri_servers[:10]  # First 10 for preview
        })
        
    except Exception as e:
        logger.error(f"Error uploading ECS RI quotation: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finops/clear-ecs-ri-quotation', methods=['POST'])
@jwt_required()
def clear_ecs_ri_quotation():
    """Clear ECS RI quotation data for a project"""
    import logging
    logger = logging.getLogger(__name__)
    
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
        
        # Update project data, removing ri_quotation
        project_data = json_module.loads(project.data) if project.data else {}
        if 'ri_quotation' in project_data:
            del project_data['ri_quotation']
            project.data = json_module.dumps(project_data)
            project.updated_at = datetime.utcnow()
            db.session.commit()
            logger.info(f"User {current_user} cleared RI quotation for project {project_id}")
        
        return jsonify({
            'success': True,
            'message': 'ECS RI quotation cleared successfully'
        })
        
    except Exception as e:
        logger.error(f"Error clearing ECS RI quotation: {str(e)}", exc_info=True)
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
        
        # 🚨 Removed the `config/blueprint.json` writing logic here as well
        
        return jsonify({'success': True, 'blueprint': blueprint})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finops/upload-ecs-ri-raw', methods=['POST'])
@jwt_required()
def upload_ecs_ri_raw():
    """Upload ECS RI quotation via raw CSV/JSON data"""
    try:
        data = request.get_json()
        project_id = data.get('project_id')
        raw_data = data.get('data')
        format_type = data.get('format', 'csv')  # 'csv' or 'json'
        
        if not project_id:
            return jsonify({'success': False, 'error': 'Project ID is required'}), 400
        if not raw_data:
            return jsonify({'success': False, 'error': 'Raw data is required'}), 400
        
        current_user = get_jwt_identity()
        import pandas as pd
        import json as json_module
        import logging
        logger = logging.getLogger(__name__)
        
        ecs_ri_servers = []
        
        if format_type == 'csv':
            # Parse CSV data - Huawei Price Calculator format
            import io
            import csv
            
            # First, try to detect if it has headers
            sample = raw_data[:500]  # Check first 500 chars
            has_headers = 'Required,Service,Description,Region,AZ,Billing Mode,Purchase Amount,Unit,Quantity,Specifications' in sample
            
            if has_headers:
                # Has Huawei format headers - parse with header detection
                df = pd.read_csv(io.StringIO(raw_data))
                logger.info(f"Parsing raw CSV data with headers, shape: {df.shape}")
                
                # Check if we have the expected columns
                expected_columns = ['Required', 'Service', 'Description', 'Region', 'AZ', 'Billing Mode', 'Purchase Amount', 'Unit', 'Quantity', 'Specifications']
                missing_cols = [col for col in expected_columns if col not in df.columns]
                
                if missing_cols:
                    logger.warning(f"Missing expected columns in CSV: {missing_cols}")
                    # Try to parse without headers
                    df = pd.read_csv(io.StringIO(raw_data), header=None)
                    logger.info(f"Retrying without headers, shape: {df.shape}")
                else:
                    logger.info(f"Found Huawei format headers, columns: {list(df.columns)}")
            else:
                # No headers detected, read without headers
                df = pd.read_csv(io.StringIO(raw_data), header=None)
                logger.info(f"Parsing raw CSV data without headers, shape: {df.shape}")
            
            # Parse ECS RI data from CSV - Huawei Price Calculator format
            servers_parsed = 0
            servers_skipped = 0
            
            # Determine starting row based on header detection
            start_row = 0
            if has_headers and 'Required' in df.columns:
                # Already has headers in first row, no need to skip
                start_row = 0
            elif len(df) > 0 and str(df.iloc[0, 0]).strip() == 'Required':
                # Headers in first row of data
                start_row = 1
            else:
                # No headers found, start from row 0
                start_row = 0
            
            for idx, row in df.iterrows():
                if idx < start_row:
                    continue  # Skip header rows
                    
                # Check if row has data (first column not empty)
                first_cell = ''
                if len(row) > 0:
                    first_cell = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
                
                if not first_cell:
                    servers_skipped += 1
                    continue
                
                # Stop parsing when we hit footer rows
                footer_keywords = ['total', 'monthly', 'price', 'discount', 'implementation', 'fee', 'iaas']
                if any(keyword in first_cell.lower() for keyword in footer_keywords):
                    logger.info(f"Stopping parsing at row {idx} (footer row: '{first_cell}')")
                    break
                    
                server_name = first_cell
                
                # Check if this is an ECS server (Service column should contain "Elastic Cloud Server")
                service_col = ''
                if has_headers and 'Service' in df.columns:
                    service_col = str(row['Service']).strip() if pd.notna(row['Service']) else ''
                elif len(row) > 1:
                    service_col = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
                
                if not service_col or 'elastic cloud server' not in service_col.lower():
                    servers_skipped += 1
                    logger.info(f"Skipping row {idx}: Not an ECS server (Service: '{service_col}')")
                    continue
                
                # Extract specification from Specifications column
                spec_raw = ''
                if has_headers and 'Specifications' in df.columns:
                    spec_raw = str(row['Specifications']).strip() if pd.notna(row['Specifications']) else ''
                elif len(row) > 9:
                    spec_raw = str(row.iloc[9]).strip() if pd.notna(row.iloc[9]) else ''
                
                specification = 'Unknown'
                
                # Try to extract flavor from specifications string
                if spec_raw:
                    # Split by pipe and look for flavor patterns
                    parts = spec_raw.split('|')
                    for part in parts:
                        part = part.strip()
                        # Look for patterns like x0.8u.16g, ac8.xlarge.4, m7n.16xlarge.8, etc.
                        # Pattern: starts with letter, has digits and dots, ends with letter/digit
                        import re
                        # Match patterns like: x0.8u.16g, ac8.xlarge.4, m7n.16xlarge.8, c7.2xlarge.4
                        flavor_pattern = r'^[a-z][a-z0-9]*(\.[a-z0-9]+)+$'
                        if re.match(flavor_pattern, part.lower()):
                            specification = part
                            break
                        # Also check for patterns with version numbers: x0.8u.16g, x0.4u.6g
                        if '.' in part and any(c.isdigit() for c in part) and any(c.isalpha() for c in part):
                            # Check if it looks like a flavor (not an OS description)
                            if not any(os_word in part.lower() for os_word in ['linux', 'centos', 'ubuntu', 'windows', 'alma', 'redhat', 'debian']):
                                specification = part
                                break
                
                # Get quantity
                quantity = 1
                if has_headers and 'Quantity' in df.columns:
                    quantity_val = row['Quantity'] if pd.notna(row['Quantity']) else 1
                elif len(row) > 8:
                    quantity_val = row.iloc[8] if pd.notna(row.iloc[8]) else 1
                else:
                    quantity_val = 1
                
                try:
                    quantity = int(float(quantity_val)) if pd.notna(quantity_val) else 1
                except:
                    quantity = 1
                
                # Get description
                description = server_name
                if has_headers and 'Description' in df.columns:
                    desc_val = row['Description']
                    if pd.notna(desc_val):
                        description = str(desc_val).strip()
                elif len(row) > 2:
                    desc_val = row.iloc[2]
                    if pd.notna(desc_val):
                        description = str(desc_val).strip()
                
                # Get region
                region = 'la-south-2'
                if has_headers and 'Region' in df.columns:
                    region_val = row['Region']
                    if pd.notna(region_val):
                        region = str(region_val).strip()
                elif len(row) > 3:
                    region_val = row.iloc[3]
                    if pd.notna(region_val):
                        region = str(region_val).strip()
                
                # Get billing mode
                billing_mode = 'RI'
                if has_headers and 'Billing Mode' in df.columns:
                    billing_val = row['Billing Mode']
                    if pd.notna(billing_val):
                        billing_mode = str(billing_val).strip()
                elif len(row) > 5:
                    billing_val = row.iloc[5]
                    if pd.notna(billing_val):
                        billing_mode = str(billing_val).strip()
                
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
            
            logger.info(f"Parsed {servers_parsed} servers from raw CSV, skipped {servers_skipped} rows")
            
        elif format_type == 'json':
            # Parse JSON data
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
            else:
                return jsonify({'success': False, 'error': 'JSON data must be an array of servers'}), 400
        else:
            return jsonify({'success': False, 'error': f' unsupported format: {format_type}'}), 400
        
        logger.info(f"Parsed {len(ecs_ri_servers)} from raw {format_type.upper()} data")
        
        # Store in database
        from models import ProjectData
        from datetime import datetime
        
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
            'message': f'ECS RI quotation uploaded successfully from raw {format_type.upper()} data',
            'count': len(ecs_ri_servers),
            'servers': ecs_ri_servers,
            'preview': [f"{s['name']}: {s['specification']} (x{s['quantity']})" for s in ecs_ri_servers[:10]]
        })
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error uploading raw ECS RI data: {str(e)}", exc_info=True)
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
    app.run(host='0.0.0.0', port=9119, debug=True, use_reloader=False)
