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
        
        if not project_id: return jsonify({"success": False, "error": "Project ID is required"}), 400
        
        project_record = ProjectData.query.get(project_id)
        if not project_record: return jsonify({"success": False, "error": "Project not found"}), 404
        
        project_data = json.loads(project_record.data)
        customer_id = project_data.get('customerId')
        
        if not customer_id: return jsonify({"success": False, "error": "No Customer linked to this project."}), 400
        
        customer = Customer.query.get(customer_id)
        if not customer or not customer.ak or not customer.sk:
            return jsonify({"success": False, "error": "Customer Master AK/SK missing from Vault."}), 400
        
        # 🚨 FINOPS BROKER: Securely pull Master Vault credentials
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_password)
        
        ak_str = str(customer.ak).strip()
        sk_str = str(customer.sk).strip()
        
        if ak_str.startswith('{'):
            raw_ak, raw_sk = cm.decrypt_credentials(json.loads(ak_str))
        else:
            raw_ak, raw_sk = ak_str, sk_str
        
        # Extract Quoted RIs
        quoted_ecs_ris = []
        if 'ri_quotation' in project_data and 'servers' in project_data['ri_quotation']:
            for server in project_data['ri_quotation']['servers']:
                quoted_ecs_ris.append({
                    "name": server.get('name', ''),
                    "specification": server.get('specification', 'Unknown'),
                    "quantity": server.get('quantity', 1),
                    "description": server.get('description', ''),
                    "region": server.get('region', ''),
                    "billing_mode": server.get('billing_mode', 'RI')
                })
        
        project_region = project_data.get('region') or getattr(customer, 'region', 'la-south-2')
        
        # 🚨 FinOps Broker: Pass RAW decrypted keys to the Reconciler
        from services.ecs_ri_reconciler_v2 import ECSRIReconciler
        reconciler = ECSRIReconciler(
            raw_ak=raw_ak,
            raw_sk=raw_sk,
            region=project_region
        )
        
        reconciliation_result = reconciler.reconcile_ecs_ris(quoted_ecs_ris)
        
        active_subs_status = {
            "status": "ECS_RI_RECONCILIATION_ACTIVE",
            "total_quoted": reconciliation_result["summary"]["total_quoted"],
            "total_live": reconciliation_result["summary"]["total_live"],
            "total_bought": reconciliation_result["summary"]["total_bought"],
            "total_missing": reconciliation_result["summary"]["total_missing"],
            "by_specification": reconciliation_result["summary"]["by_specification"],
            "filter_counts": reconciliation_result["filter_counts"]
        }
        
        return jsonify({
            "success": True,
            "reconciliation": reconciliation_result,
            "active_subs_status": active_subs_status,
            "filters": reconciliation_result["filter_counts"]
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
            project_id = request.form.get('projectId')
            
            from services.quotation_versioning import save_quotation_file
            file_path = save_quotation_file(project_id, file, file.filename)
            
            import pandas as pd
            from datetime import datetime
            
            df = pd.read_excel(file_path, sheet_name='Price Calculator - RI', header=None)
            
            header_row = None
            for i in range(len(df)):
                row_contains_required = False
                try: row_contains_required = df.iloc[i].astype(str).str.contains('Required').any()
                except: pass
                if row_contains_required:
                    header_row = i
                    break
            
            if header_row is None:
                return jsonify({"success": False, "error": "Could not find 'Required' column in Price Calculator - RI sheet"}), 400
            
            df_ri = pd.read_excel(file_path, sheet_name='Price Calculator - RI', header=header_row)
            
            ecs_ri_servers = []
            for idx, row in df_ri.iterrows():
                required_val = row.get('Required')
                service_val = row.get('Service')
                
                if pd.notna(required_val) and pd.notna(service_val) and 'Elastic Cloud Server' in str(service_val):
                    specs = str(row.get('Specifications', ''))
                    specification = 'Unknown'
                    if '|' in specs:
                        parts = [p.strip() for p in specs.split('|')]
                        if len(parts) > 2: specification = parts[2] 
                    
                    try: quantity = int(float(row.get('Quantity', 1)))
                    except: quantity = 1
                    
                    ecs_ri_servers.append({
                        'name': str(required_val).strip(),
                        'service': str(service_val).strip(),
                        'quantity': quantity,
                        'specification': specification
                    })
            
            project = ProjectData.query.get(project_id)
            data = json.loads(project.data)
            if 'ri_quotation' not in data: data['ri_quotation'] = {}
            
            data['ri_quotation']['uploaded_at'] = datetime.now().isoformat()
            data['ri_quotation']['servers'] = ecs_ri_servers
            
            spec_counts = {}
            for server in ecs_ri_servers:
                spec = server['specification']
                spec_counts[spec] = spec_counts.get(spec, 0) + server['quantity']
            
            data['ri_quotation']['summary'] = {
                'total_servers': len(ecs_ri_servers),
                'total_ris': sum(spec_counts.values()),
                'unique_specifications': len(spec_counts),
                'by_specification': spec_counts
            }
            
            project.data = json.dumps(data)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": f"RI quotation uploaded successfully.",
                "summary": data['ri_quotation']['summary']
            })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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

        elif provider == 'AWS':
            engine = HyperscalerDiscoveryEngine(customer_id)
            result = engine.run_aws_agentless_discovery()

        elif provider == 'Azure':
            engine = HyperscalerDiscoveryEngine(customer_id)
            result = engine.run_azure_agentless_discovery()
        
        if result.get("success"): return jsonify({"success": True, "inventory": result.get("inventory")})
        else: return jsonify({"success": False, "error": result.get("error")}), 500

    except Exception as e: return jsonify({"success": False, "error": str(e)}), 500

# [Omitted standard routes like /api/audit, /api/deploy etc for brevity, they remain identical]
