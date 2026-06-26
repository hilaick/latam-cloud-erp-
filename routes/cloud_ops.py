import os
import json
import subprocess
import math
import logging
from pathlib import Path
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required
from services.resource_parser import parse_resource_log, get_all_deployments
from services.huawei_load_balancer import HuaweiLoadBalancer
from models import Customer, ProjectData, db
from services.huawei_discovery import HuaweiDiscovery
from services.source_resources_parser import parse_source_resources_excel
from services.hyperscaler_discovery import HyperscalerDiscoveryEngine
from services.tool_recommender import ToolRecommender
from services.credential_manager import get_credential_manager
from datetime import datetime

logger = logging.getLogger(__name__)

cloud_ops_bp = Blueprint('cloud_ops', __name__)
PROJECT_ROOT = Path(__file__).parent.parent

@cloud_ops_bp.route('/api/finops/ecs-ri-reconciliation', methods=['POST'])
@jwt_required()
def ecs_ri_reconciliation():
    try:
        data = request.get_json()
        project_id = data.get('projectId')
        
        project_record = ProjectData.query.get(project_id)
        if not project_record: return jsonify({"success": False, "error": "Project not found"}), 404
        
        project_data = json.loads(project_record.data)
        customer_id = project_data.get('customerId')
        
        customer = Customer.query.get(customer_id)
        if not customer or not customer.ak or not customer.sk:
            return jsonify({"success": False, "error": "Customer Master AK/SK missing from Vault."}), 400
        
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_password)
        ak_str, sk_str = str(customer.ak).strip(), str(customer.sk).strip()
        
        raw_ak, raw_sk = cm.decrypt_credentials(json.loads(ak_str)) if ak_str.startswith('{') else (ak_str, sk_str)
        
        quoted_ecs_ris = []
        if 'ri_quotation' in project_data and 'servers' in project_data['ri_quotation']:
            for server in project_data['ri_quotation']['servers']:
                quoted_ecs_ris.append({
                    "name": server.get('name', ''),
                    "specification": server.get('specification', 'Unknown'),
                    "quantity": server.get('quantity', 1)
                })
        
        console_ris = []
        if 'console_ri_export' in project_data and 'servers' in project_data['console_ri_export']:
            console_ris = project_data['console_ri_export']['servers']
        
        project_region = project_data.get('region') or getattr(customer, 'region', 'la-north-2')
        
        from services.ecs_ri_reconciler_v2 import ECSRIReconciler
        reconciler = ECSRIReconciler(raw_ak=raw_ak, raw_sk=raw_sk, region=project_region)
        
        reconciliation_result = reconciler.reconcile_ecs_ris(quoted_ecs_ris, console_ris)
        
        return jsonify({
            "success": True,
            "reconciliation": reconciliation_result,
            "active_subs_status": {
                "total_quoted": reconciliation_result["summary"].get("total_quoted", 0),
                "total_live": reconciliation_result["summary"].get("total_live", 0),
                "total_bought": reconciliation_result["summary"].get("total_bought", 0),
                "total_missing": reconciliation_result["summary"].get("total_missing", 0)
            },
            "diagnostics": reconciliation_result.get("diagnostics", [])
        })
        
    except Exception as e:
        logger.error(f"Error in ECS RI Reconciliation: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/finops/upload-ri-quotation', methods=['POST'])
@jwt_required()
def upload_ri_quotation():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400
            
        file = request.files['file']
        project_id = request.form.get('project_id') or request.form.get('projectId')
        
        from services.quotation_versioning import save_quotation_file
        file_path = save_quotation_file(project_id, file, file.filename)
        
        import pandas as pd
        if str(file_path).lower().endswith('.csv'): df = pd.read_csv(file_path, header=None)
        else:
            try: df = pd.read_excel(file_path, sheet_name='Price Calculator - RI', header=None)
            except: df = pd.read_excel(file_path, header=None)
        
        header_row = 0
        for i in range(min(50, len(df))):
            row_str = df.iloc[i].astype(str).str.lower()
            if row_str.str.contains('required|service|product|name').any():
                header_row = i
                break
                
        if str(file_path).lower().endswith('.csv'): df_ri = pd.read_csv(file_path, header=header_row)
        else:
            try: df_ri = pd.read_excel(file_path, sheet_name='Price Calculator - RI', header=header_row)
            except: df_ri = pd.read_excel(file_path, header=header_row)
        
        df_ri.columns = [str(c).strip().lower() for c in df_ri.columns]
        
        col_req = next((c for c in df_ri.columns if 'required' in c or 'name' in c or 'server' in c), None)
        col_svc = next((c for c in df_ri.columns if 'service' in c or 'product' in c), None)
        col_spec = next((c for c in df_ri.columns if 'specification' in c or 'flavor' in c), None)
        col_qty = next((c for c in df_ri.columns if 'quantity' in c or 'count' in c), None)
        
        if not col_req or not col_spec:
            return jsonify({"success": False, "error": "Could not identify Name/Specification columns in file."}), 400
            
        ecs_ri_servers = []
        for _, row in df_ri.iterrows():
            # 🚨 STRICT FILTER: Only allow ECS. Ignore EIPs, NATs, Backup Vaults.
            if col_svc:
                service_val = str(row.get(col_svc, '')).lower()
                if 'elastic cloud server' not in service_val and 'ecs' not in service_val:
                    continue
            
            req_val = str(row.get(col_req, '')).strip()
            if not req_val or req_val == 'nan': continue
                
            specs = str(row.get(col_spec, '')).strip()
            specification = specs
            if '|' in specs:
                parts = [p.strip() for p in specs.split('|')]
                if len(parts) >= 5: specification = f"{parts[2]} ({parts[3]} | {parts[4]})"
                elif len(parts) > 2: specification = parts[2]
                
            qty = 1
            if col_qty and pd.notna(row.get(col_qty)):
                try: qty = int(float(row.get(col_qty)))
                except: pass
                
            ecs_ri_servers.append({
                'name': req_val,
                'specification': specification,
                'quantity': qty
            })
                
        project = ProjectData.query.get(project_id)
        data = json.loads(project.data)
        if 'ri_quotation' not in data: data['ri_quotation'] = {}
        
        summary = {
            'total_servers': len(ecs_ri_servers),
            'total_ris': sum(s['quantity'] for s in ecs_ri_servers)
        }
        
        data['ri_quotation']['uploaded_at'] = datetime.now().isoformat()
        data['ri_quotation']['servers'] = ecs_ri_servers
        data['ri_quotation']['summary'] = summary
        
        project.data = json.dumps(data)
        db.session.commit()
        
        return jsonify({ 
            "success": True, 
            "message": f"Successfully parsed {summary['total_ris']} Quoted ECS RIs.",
            "summary": summary
        })
        
    except Exception as e:
        logger.error(f"Upload Quoted RI Error: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/finops/upload-ecs-ri-raw', methods=['POST'])
@jwt_required()
def upload_ecs_ri_raw():
    try:
        data = request.get_json()
        project_id = data.get('project_id')
        raw_data = data.get('data', '')
        fmt = data.get('format', 'csv')
        
        ecs_ri_servers = []
        if fmt == 'csv':
            delimiter = '\t' if '\t' in raw_data else ','
            import csv
            from io import StringIO
            
            reader = csv.DictReader(StringIO(raw_data.strip()), delimiter=delimiter)
            for row in reader:
                keys = {str(k).lower().strip(): k for k in row.keys() if k}
                name_key = next((keys[k] for k in keys if 'name' in k or 'server' in k or 'host' in k or 'required' in k), None)
                spec_key = next((keys[k] for k in keys if 'spec' in k or 'flavor' in k or 'type' in k), None)
                qty_key = next((keys[k] for k in keys if 'qty' in k or 'quantity' in k or 'count' in k), None)
                
                if spec_key and row.get(spec_key):
                    spec_raw = str(row[spec_key]).strip()
                    spec = spec_raw
                    if '|' in spec_raw:
                        parts = [p.strip() for p in spec_raw.split('|')]
                        if len(parts) >= 5: spec = f"{parts[2]} ({parts[3]} | {parts[4]})"
                        elif len(parts) > 2: spec = parts[2]
                            
                    qty = 1
                    if qty_key and row.get(qty_key):
                        try: qty = int(float(row[qty_key]))
                        except: pass
                        
                    ecs_ri_servers.append({'name': str(row.get(name_key, '')).strip() if name_key else 'Raw RI', 'specification': spec, 'quantity': qty})
        elif fmt == 'json':
            try:
                parsed_json = json.loads(raw_data)
                if isinstance(parsed_json, list):
                    for item in parsed_json:
                        ecs_ri_servers.append({
                            'name': str(item.get('name', item.get('server', 'Raw RI'))),
                            'specification': str(item.get('specification', item.get('spec', item.get('flavor', 'Unknown')))),
                            'quantity': int(item.get('quantity', item.get('qty', 1)))
                        })
            except: pass
                    
        project = ProjectData.query.get(project_id)
        summary = { 'total_servers': len(ecs_ri_servers), 'total_ris': sum(s['quantity'] for s in ecs_ri_servers) }
        
        if project:
            proj_data = json.loads(project.data)
            if 'ri_quotation' not in proj_data: proj_data['ri_quotation'] = {}
            proj_data['ri_quotation']['uploaded_at'] = datetime.now().isoformat()
            proj_data['ri_quotation']['servers'] = ecs_ri_servers
            proj_data['ri_quotation']['summary'] = summary
            project.data = json.dumps(proj_data)
            db.session.commit()
            
        return jsonify({"success": True, "count": len(ecs_ri_servers), "summary": summary})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/finops/upload-console-ris', methods=['POST'])
@jwt_required()
def upload_console_ris():
    try:
        if 'file' not in request.files: return jsonify({"success": False, "error": "No file selected"}), 400
        file = request.files['file']
        project_id = request.form.get('projectId') or request.form.get('project_id')
        
        upload_dir = PROJECT_ROOT / 'uploads' / 'console_exports'
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / secure_filename(file.filename or 'console_ri_export.csv')
        file.save(str(file_path))
        
        import pandas as pd
        if str(file_path).lower().endswith('.csv'): df = pd.read_csv(file_path)
        else: df = pd.read_excel(file_path)
            
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        col_spec = next((c for c in df.columns if 'flavor' in c or 'specification' in c or 'instance type' in c), None)
        col_qty = next((c for c in df.columns if 'quantity' in c or 'count' in c or 'instance count' in c), None)
        col_name = next((c for c in df.columns if 'name' in c or 'id' in c), None)
        
        console_ris = []
        for _, row in df.iterrows():
            qty = 1
            if col_qty and pd.notna(row[col_qty]):
                try: qty = int(float(row[col_qty]))
                except: pass
            
            spec_raw = str(row[col_spec]).strip() if col_spec else 'Unknown'
            if '|' in spec_raw:
                parts = [p.strip() for p in spec_raw.split('|')]
                if len(parts) == 3 and ('vcpu' in parts[0].lower() or 'cpu' in parts[0].lower()):
                    spec_raw = f"{parts[2]} ({parts[0]} | {parts[1]})"
                elif len(parts) >= 5:
                    spec_raw = f"{parts[2]} ({parts[3]} | {parts[4]})"
                
            console_ris.append({
                'name': str(row[col_name]).strip() if col_name and pd.notna(row[col_name]) else 'Console RI',
                'specification': spec_raw,
                'quantity': qty
            })
            
        project = ProjectData.query.get(project_id)
        data = json.loads(project.data)
        summary = {
            'file_path': str(file_path),
            'servers': console_ris,
            'total_ris': sum(ri['quantity'] for ri in console_ris)
        }
        data['console_ri_export'] = summary
        
        project.data = json.dumps(data)
        db.session.commit()
        return jsonify({ "success": True, "message": f"Loaded {summary['total_ris']} Console RIs.", "summary": summary })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/finops/clear-ecs-ri-quotation', methods=['POST'])
@jwt_required()
def clear_ecs_ri_quotation():
    try:
        project_id = request.get_json().get('project_id')
        project = ProjectData.query.get(project_id)
        if project:
            data = json.loads(project.data)
            if 'ri_quotation' in data: del data['ri_quotation']
            if 'finops_matrix' in data: del data['finops_matrix']
            if 'console_ri_export' in data: del data['console_ri_export']
            project.data = json.dumps(data)
            db.session.commit()
        return jsonify({"success": True})
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/cloud/inventory', methods=['POST'])
@jwt_required()
def get_live_inventory():
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        provider = data.get('provider', 'Huawei')
        
        if not customer_id: return jsonify({"success": False, "error": "Customer ID is required."}), 400
        customer = Customer.query.get(customer_id)
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")

        if provider == 'Huawei':
            discovery_engine = HuaweiDiscovery(encrypted_ak_data=customer.ak, encrypted_sk_data=customer.sk, region=data.get('region', 'la-south-2'), master_password=master_password)
            result = discovery_engine.discover_all()
        
        if result.get("success"): return jsonify({"success": True, "inventory": result.get("inventory")})
        else: return jsonify({"success": False, "error": result.get("error")}), 500
    except Exception as e: return jsonify({"success": False, "error": str(e)}), 500
