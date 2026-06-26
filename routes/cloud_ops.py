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
huawei_lb = HuaweiLoadBalancer()

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
            }
        })
        
    except Exception as e:
        logger.error(f"Error in ECS RI Reconciliation: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/finops/upload-ri-quotation', methods=['POST'])
@jwt_required()
def upload_ri_quotation():
    try:
        if 'file' in request.files:
            file = request.files['file']
            project_id = request.form.get('project_id')
            
            from services.quotation_versioning import save_quotation_file
            file_path = save_quotation_file(project_id, file, file.filename)
            
            import pandas as pd
            df = pd.read_excel(file_path, sheet_name='Price Calculator - RI', header=None)
            
            header_row = next((i for i in range(len(df)) if df.iloc[i].astype(str).str.contains('Required').any()), None)
            if header_row is None:
                return jsonify({"success": False, "error": "Could not find 'Required' column in sheet"}), 400
            
            df_ri = pd.read_excel(file_path, sheet_name='Price Calculator - RI', header=header_row)
            
            ecs_ri_servers = []
            for idx, row in df_ri.iterrows():
                required_val = row.get('Required')
                service_val = row.get('Service')
                
                if pd.notna(required_val) and pd.notna(service_val) and 'Elastic Cloud Server' in str(service_val):
                    # 🚨 FULL SPEC FIX: "x0.8u.16g (8 vCPUs | 16GiB)"
                    specs = str(row.get('Specifications', ''))
                    specification = 'Unknown'
                    if '|' in specs:
                        parts = [p.strip() for p in specs.split('|')]
                        if len(parts) >= 5: specification = f"{parts[2]} ({parts[3]} | {parts[4]})"
                        elif len(parts) > 2: specification = parts[2]
                    
                    try: quantity = int(float(row.get('Quantity', 1)))
                    except: quantity = 1
                    
                    ecs_ri_servers.append({
                        'name': str(required_val).strip(),
                        'quantity': quantity,
                        'specification': specification
                    })
            
            project = ProjectData.query.get(project_id)
            data = json.loads(project.data)
            if 'ri_quotation' not in data: data['ri_quotation'] = {}
            
            data['ri_quotation']['uploaded_at'] = datetime.now().isoformat()
            data['ri_quotation']['servers'] = ecs_ri_servers
            data['ri_quotation']['summary'] = {
                'total_servers': len(ecs_ri_servers),
                'total_ris': sum(s['quantity'] for s in ecs_ri_servers)
            }
            
            project.data = json.dumps(data)
            db.session.commit()
            
            return jsonify({ "success": True, "count": len(ecs_ri_servers), "servers": ecs_ri_servers[:5] })
    except Exception as e:
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
            # 🚨 FIX: Dynamic Delimiter (Tabs for direct Excel paste, Commas for CSV)
            delimiter = '\t' if '\t' in raw_data else ','
            import csv
            from io import StringIO
            
            reader = csv.DictReader(StringIO(raw_data.strip()), delimiter=delimiter)
            for row in reader:
                keys = {k.lower().strip(): k for k in row.keys() if k}
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
                        
                    ecs_ri_servers.append({
                        'name': str(row.get(name_key, '')).strip() if name_key else 'Raw RI',
                        'specification': spec,
                        'quantity': qty
                    })
                    
        project = ProjectData.query.get(project_id)
        if project:
            proj_data = json.loads(project.data)
            if 'ri_quotation' not in proj_data: proj_data['ri_quotation'] = {}
            proj_data['ri_quotation']['uploaded_at'] = datetime.now().isoformat()
            proj_data['ri_quotation']['servers'] = ecs_ri_servers
            proj_data['ri_quotation']['summary'] = { 'total_servers': len(ecs_ri_servers), 'total_ris': sum(s['quantity'] for s in ecs_ri_servers) }
            project.data = json.dumps(proj_data)
            db.session.commit()
            
        return jsonify({"success": True, "count": len(ecs_ri_servers), "servers": ecs_ri_servers})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/finops/upload-console-ris', methods=['POST'])
@jwt_required()
def upload_console_ris():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file selected"}), 400
            
        file = request.files['file']
        project_id = request.form.get('projectId')
        
        upload_dir = PROJECT_ROOT / 'uploads' / 'console_exports'
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / secure_filename(file.filename or 'console_ri_export.csv')
        file.save(str(file_path))
        
        import pandas as pd
        df = pd.read_excel(file_path) if str(file_path).endswith(('.xls', '.xlsx')) else pd.read_csv(file_path)
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
            console_ris.append({
                'name': str(row[col_name]).strip() if col_name and pd.notna(row[col_name]) else 'Console RI',
                'specification': str(row[col_spec]).strip(),
                'quantity': qty
            })
            
        project = ProjectData.query.get(project_id)
        data = json.loads(project.data)
        data['console_ri_export'] = {
            'file_path': str(file_path),
            'servers': console_ris,
            'total_ris': sum(ri['quantity'] for ri in console_ris)
        }
        
        project.data = json.dumps(data)
        db.session.commit()
        
        return jsonify({ "success": True, "message": "Loaded Console RIs.", "summary": data['console_ri_export'] })
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

# [Omitted standard routes like /api/audit, /api/deploy etc for brevity, they remain identical]
