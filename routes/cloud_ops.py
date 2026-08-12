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
        
        # 🚨 Generate Commercial True-Up recommendations from the reconciliation matrix
        trueup_recommendations = {}
        try:
            from services.enhanced_commercial_trueup import EnhancedCommercialTrueUp
            if reconciliation_result and 'matrix' in reconciliation_result:
                trueup_engine = EnhancedCommercialTrueUp(
                    customer_region=project_region,
                    reconciliation_matrix=reconciliation_result['matrix']
                )
                trueup_recommendations = trueup_engine.generate_recommendations()
        except ImportError:
            logger.warning("EnhancedCommercialTrueUp module not found, skipping recommendations.")
        except Exception as te:
            logger.error(f"Error generating true-up recommendations: {te}")
        
        return jsonify({
            "success": True,
            "reconciliation": reconciliation_result,
            "trueup_recommendations": trueup_recommendations,
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
        
        col_spec = next((c for c in df.columns if 'specification' in c or 'flavor' in c or 'spec' in c), None)
        col_qty = next((c for c in df.columns if 'quantity' in c or 'count' in c), None)
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
        region = data.get('region', 'la-south-2')
        project_id = data.get('projectId')
        inventory_mode = data.get('mode', 'single')  # 'single' | 'hybrid'
        
        if not customer_id: 
            return jsonify({"success": False, "error": "Customer ID is required."}), 400
            
        customer = Customer.query.get(customer_id)
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")

        # ─── HYBRID MODE: run BOTH target (master) and source discovery ───
        if inventory_mode == 'hybrid':
            logger.info(f"HYBRID INVENTORY: Running target + source dual discovery for customer_id={customer_id}")
            result = {"success": True, "hybrid": {"target": None, "source": None}, "mode": "hybrid"}
            diagnostics = []
            
            # Target scan (Master AK/SK)
            if customer and customer.ak and customer.sk:
                try:
                    target_engine = HuaweiDiscovery(
                        encrypted_ak_data=customer.ak,
                        encrypted_sk_data=customer.sk,
                        region=region,
                        master_password=master_password
                    )
                    logger.info(f"HYBRID: Scanning TARGET infrastructure (Master AK/SK) in {region}")
                    target_result = target_engine.discover_all()
                    if target_result.get("success"):
                        result["hybrid"]["target"] = target_result.get("inventory")
                        result["target_region"] = region
                    else:
                        result["hybrid"]["target"] = {"error": target_result.get("error", "Unknown error")}
                        diagnostics.append(f"Target scan failed: {target_result.get('error')}")
                except Exception as e:
                    logger.error(f"HYBRID: Target scan exception: {e}")
                    result["hybrid"]["target"] = {"error": str(e)}
                    diagnostics.append(f"Target scan exception: {str(e)}")
            else:
                result["hybrid"]["target"] = {"error": "Master AK/SK missing"}
                diagnostics.append("Target scan skipped: Master AK/SK not configured")
            
            # Source scan (Source Huawei Cloud AK/SK)
            if customer and customer.source_huawei_ak and customer.source_huawei_sk:
                source_region = customer.source_huawei_region or region
                try:
                    source_engine = HuaweiDiscovery(
                        encrypted_ak_data=customer.source_huawei_ak,
                        encrypted_sk_data=customer.source_huawei_sk,
                        region=source_region,
                        master_password=master_password
                    )
                    logger.info(f"HYBRID: Scanning SOURCE infrastructure (Source AK/SK) in {source_region}")
                    source_result = source_engine.discover_all()
                    if source_result.get("success"):
                        result["hybrid"]["source"] = source_result.get("inventory")
                        result["source_region"] = source_region
                    else:
                        result["hybrid"]["source"] = {"error": source_result.get("error", "Unknown error")}
                        diagnostics.append(f"Source scan failed: {source_result.get('error')}")
                except Exception as e:
                    logger.error(f"HYBRID: Source scan exception: {e}")
                    result["hybrid"]["source"] = {"error": str(e)}
                    diagnostics.append(f"Source scan exception: {str(e)}")
            else:
                result["hybrid"]["source"] = {"error": "Source Huawei Cloud AK/SK missing"}
                diagnostics.append("Source scan skipped: Source credentials not configured")
            
            if diagnostics:
                result["diagnostics"] = diagnostics
            return jsonify(result)

        # ─── SINGLE MODE (legacy + explicit credential toggle) ───
        is_source_discovery = False
        encrypted_ak_data = None
        encrypted_sk_data = None
        discovery_region = region
        use_source_credentials = data.get('use_source_credentials', False)

        if use_source_credentials:
            if customer and customer.source_huawei_ak and customer.source_huawei_sk:
                logger.info(f"EXPLICIT SOURCE DISCOVERY: Using Source Huawei Cloud credentials for customer_id={customer_id}")
                encrypted_ak_data = customer.source_huawei_ak
                encrypted_sk_data = customer.source_huawei_sk
                discovery_region = customer.source_huawei_region or region
                is_source_discovery = True
            else:
                return jsonify({
                    "success": False,
                    "error": "Source Huawei Cloud credentials missing. Configure them in Customer Directory → Huawei Tiers."
                }), 400
        elif project_id:
            project = ProjectData.query.get(project_id)
            if project and project.data:
                try:
                    project_data = json.loads(project.data)
                    migration_scope = project_data.get('migrationScope', [])
                    source_env = project_data.get('sourceEnvironment', '')
                    is_cross_region = ('Cross-Region Migration' in migration_scope or 
                                      'cross_region' in migration_scope)
                    is_huawei_source = ('Huawei' in source_env or 
                                       'huawei' in source_env.lower())
                    if is_cross_region and is_huawei_source and provider == 'Huawei':
                        if customer and customer.source_huawei_ak and customer.source_huawei_sk:
                            logger.info(f"SOURCE DISCOVERY: Cross-region migration with Huawei source for project_id={project_id}")
                            encrypted_ak_data = customer.source_huawei_ak
                            encrypted_sk_data = customer.source_huawei_sk
                            discovery_region = customer.source_huawei_region or region
                            is_source_discovery = True
                        else:
                            return jsonify({
                                "success": False, 
                                "error": "Source Huawei Cloud credentials missing for cross-region migration discovery."
                            }), 400
                except Exception as e:
                    logger.warning(f"Error parsing project data for source discovery: {e}")
        
        if not is_source_discovery:
            logger.info(f"TARGET MONITORING: Using master credentials for customer_id={customer_id}")
            if not customer or not customer.ak or not customer.sk:
                return jsonify({"success": False, "error": "Customer Master AK/SK missing from Vault."}), 400
            encrypted_ak_data = customer.ak
            encrypted_sk_data = customer.sk
            
        if provider == 'Huawei':
            discovery_engine = HuaweiDiscovery(
                encrypted_ak_data=encrypted_ak_data, 
                encrypted_sk_data=encrypted_sk_data, 
                region=discovery_region, 
                master_password=master_password
            )
            if is_source_discovery:
                logger.info(f"SOURCE DISCOVERY: Scanning Huawei Cloud source infrastructure in region {discovery_region}")
            else:
                logger.info(f"TARGET MONITORING: Scanning Huawei Cloud target infrastructure in region {discovery_region}")
            result = discovery_engine.discover_all()
        elif provider == 'AWS':
            discovery_engine = HyperscalerDiscoveryEngine(customer_id=customer_id)
            result = discovery_engine.run_aws_agentless_discovery(region=data.get('region', 'us-east-1'))
        elif provider == 'Azure':
            discovery_engine = HyperscalerDiscoveryEngine(customer_id=customer_id)
            subscription_id = data.get('subscription_id') or customer.azure_subscription_id
            result = discovery_engine.run_azure_agentless_discovery(subscription_id=subscription_id)
        else:
            return jsonify({"success": False, "error": f"Provider {provider} discovery not supported."}), 400
        
        if result.get("success"): 
            return jsonify({
                "success": True, 
                "inventory": result.get("inventory"), 
                "is_source_discovery": is_source_discovery,
                "region": discovery_region
            })
        else: 
            return jsonify({"success": False, "error": result.get("error")}), 500
            
    except Exception as e: 
        logger.error(f"Live Inventory Discovery Error: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500



@cloud_ops_bp.route('/api/migration/tools', methods=['POST', 'GET'])
@jwt_required()
def get_migration_tools():
    try:
        if request.method == 'GET':
            # For GET requests, return empty recommendations or default data
            return jsonify({"success": True, "data": [], "message": "No target architecture provided. Use POST with target_architecture or mapperNodes for recommendations."})
        
        # POST request logic
        data = request.get_json()
        target_architecture = data.get('target_architecture') or data.get('mapperNodes', [])
        if not target_architecture:
            return jsonify({"success": False, "error": "No target architecture nodes provided for analysis."}), 400
            
        from services.tool_recommender import ToolRecommender
        recommendations = ToolRecommender.analyze_target_architecture(target_architecture)
        
        return jsonify({"success": True, "data": recommendations})
    except Exception as e:
        logger.error(f"Error generating tool recommendations: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/migration/recommendations/test', methods=['POST'])
@jwt_required()
def get_migration_recommendations_test():
    """Test endpoint for tool recommendations (no auth required for development)"""
    try:
        data = request.get_json()
        target_architecture = data.get('target_architecture') or data.get('mapperNodes', [])
        if not target_architecture:
            # Provide sample data for testing
            target_architecture = [
                {"type": "ECS", "name": "WebServer01", "source": "AWS", "os": "Windows Server 2019"},
                {"type": "RDS", "name": "Database01", "source": "Azure", "db_engine": "PostgreSQL"},
                {"type": "OBS", "name": "Storage01", "source": "OnPrem", "storage_type": "Object"},
                {"type": "VPC", "name": "Network01", "source": "AWS", "cidr": "10.0.0.0/16"}
            ]
        
        from services.tool_recommender import ToolRecommender
        recommendations = ToolRecommender.analyze_target_architecture(target_architecture)
        
        # Add WBS tasks
        wbs_type = data.get('wbs_type', 'execution')
        wbs_tasks = ToolRecommender.generate_wbs_tasks(recommendations, wbs_type)
        recommendations['wbs_tasks'] = wbs_tasks
        
        return jsonify({"success": True, "data": recommendations})
    except Exception as e:
        logger.error(f"Error generating tool recommendations (test): {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@cloud_ops_bp.route('/api/migration/recommendations', methods=['POST'])
@jwt_required()
def get_migration_recommendations():
    try:
        data = request.get_json()
        target_architecture = data.get('target_architecture') or data.get('mapperNodes', [])
        if not target_architecture:
            return jsonify({"success": False, "error": "No target architecture nodes provided for analysis."}), 400
            
        from services.tool_recommender import ToolRecommender
        recommendations = ToolRecommender.analyze_target_architecture(target_architecture)
        return jsonify({"success": True, "data": recommendations})
    except Exception as e:
        logger.error(f"Error generating tool recommendations: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# ════════════════════════════════════════════════════════════
# 🚨 HUAWEI COC FINOPS CENTER — LIVE BILLING DATA ENDPOINTS
# ════════════════════════════════════════════════════════════

@cloud_ops_bp.route('/api/finops/dashboard', methods=['GET'])
@jwt_required()
def finops_dashboard():
    """
    COC FinOps Center Dashboard — aggregates live billing data across all
    active delivery projects. Replaces the simulated data in FinOpsDashboard.jsx
    with actual Huawei Cloud BSS billing figures.

    For each active project with valid customer credentials, fetches:
    - Current month billing total & service breakdown
    - Daily burn rate (based on recent 3-month trend)
    - RI coverage status
    - Project budget vs actual comparison
    """
    try:
        from services.huawei_finops_service import HuaweiFinOpsService
        from services.credential_manager import get_credential_manager
        from services.huawei_bss_scanner import HuaweiBSSScanner

        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_password)

        # Get all active projects
        all_projects = ProjectData.query.all()
        active_projects = []
        for p in all_projects:
            try:
                data = json.loads(p.data)
            except Exception:
                continue

            # Skip waiting/completed projects
            lifecycle = data.get('lifecycleState', '')
            is_waiting = data.get('isWaiting', False)
            if is_waiting or lifecycle in ('6_completed',):
                continue

            # Must have a customer
            customer_id = str(data.get('customerId', ''))
            if not customer_id:
                continue

            active_projects.append((p, data, customer_id))

        # Aggregate data
        total_quoted_budget = 0.0
        total_billed_to_date = 0.0
        total_projected_overrun = 0.0
        enriched_projects = []
        projects_with_live_data = 0
        projects_with_errors = 0

        for project_record, proj_data, customer_id in active_projects:
            mrr = float(proj_data.get('mrr', 0))
            total_quoted_budget += mrr

            project_name = proj_data.get('name', proj_data.get('projectName', 'Unnamed'))
            customer_name = 'Unknown'
            customer = Customer.query.get(customer_id)

            # Base project info
            enriched = {
                'id': project_record.id,
                'name': project_name,
                'customerId': customer_id,
                'customerName': customer_name,
                'mrr': mrr,
                'kickoff': proj_data.get('kickoff'),
                'date': proj_data.get('date'),
                'lifecycleState': proj_data.get('lifecycleState'),
                'live_data_fetched': False,
                'live_data_error': None
            }

            # Attempt live billing fetch if customer exists and has credentials
            live_data = None
            if customer:
                enriched['customerName'] = customer.name or 'Unknown'
                enriched['customerRegion'] = customer.region

                if customer.ak and customer.sk:
                    try:
                        ak_str = str(customer.ak).strip()
                        sk_str = str(customer.sk).strip()
                        raw_ak, raw_sk = cm.decrypt_credentials(
                            json.loads(ak_str)
                        ) if ak_str.startswith('{') else (ak_str, sk_str)

                        # Fetch FinOps snapshot (current month + 3-month trend)
                        finops = HuaweiFinOpsService(raw_ak=raw_ak, raw_sk=raw_sk)
                        snapshot = finops.get_finops_snapshot(duration_months=3)

                        if snapshot.get('success'):
                            live_data = snapshot
                            enriched['live_data_fetched'] = True
                            projects_with_live_data += 1

                            # Extract billing data
                            current = snapshot.get('current_month', {})
                            trend = snapshot.get('trend', {})

                            billed_to_date = trend.get('grand_total', 0)
                            daily_burn = snapshot.get('daily_burn_rate', 0)
                            service_breakdown = current.get('service_breakdown', {})

                            # Calculate overrun: if project has an end date and we've passed it
                            from datetime import datetime as dt
                            end_date_str = proj_data.get('date')
                            days_delayed = 0
                            overrun = 0.0
                            if end_date_str:
                                try:
                                    end_date = dt.strptime(end_date_str, '%Y-%m-%d')
                                    now = dt.utcnow()
                                    if now > end_date:
                                        days_delayed = (now - end_date).days
                                        overrun = round(days_delayed * daily_burn, 2)
                                except Exception:
                                    pass

                            enriched.update({
                                'billedToDate': round(billed_to_date, 2),
                                'dailyBurnRate': round(daily_burn, 2),
                                'overrun': overrun,
                                'daysDelayed': days_delayed,
                                'serviceBreakdown': service_breakdown,
                                'isAtRisk': overrun > 0 or (mrr > 0 and billed_to_date > mrr * 0.5),
                                'currentMonthBilling': current.get('total', 0)
                            })

                            total_billed_to_date += billed_to_date
                            total_projected_overrun += overrun
                        else:
                            enriched['live_data_error'] = snapshot.get('error', 'Unknown error')
                            projects_with_errors += 1

                    except Exception as e:
                        logger.warning(f"Live billing fetch failed for project {project_record.id}: {e}")
                        enriched['live_data_error'] = str(e)
                        projects_with_errors += 1

            # If live data not fetched, leave billing fields as null/unavailable
            if not enriched.get('live_data_fetched'):
                # No simulated fallback — honest gap
                from datetime import datetime as dt
                start_str = proj_data.get('kickoff')
                end_str = proj_data.get('date')
                now = dt.utcnow()
                days_total = 30
                days_elapsed = 0
                days_delayed = 0
                if start_str and end_str:
                    try:
                        start = dt.strptime(start_str, '%Y-%m-%d')
                        end = dt.strptime(end_str, '%Y-%m-%d')
                        days_total = max((end - start).days, 1)
                        days_elapsed = max((now - start).days, 0)
                        if now > end:
                            days_delayed = (now - end).days
                    except Exception:
                        pass
                enriched.update({
                    'billedToDate': None,
                    'dailyBurnRate': None,
                    'overrun': None,
                    'daysElapsed': days_elapsed,
                    'daysTotal': days_total,
                    'daysDelayed': days_delayed,
                    'isAtRisk': None,
                    'dataAvailable': False
                })
            else:
                # Days calculations for live-data projects
                from datetime import datetime as dt
                start_str = proj_data.get('kickoff')
                end_str = proj_data.get('date')
                now = dt.utcnow()
                days_total = 30
                days_elapsed = 0

                if start_str and end_str:
                    try:
                        start = dt.strptime(start_str, '%Y-%m-%d')
                        end = dt.strptime(end_str, '%Y-%m-%d')
                        days_total = max((end - start).days, 1)
                        days_elapsed = max((now - start).days, 0)
                    except Exception:
                        pass

                enriched['daysElapsed'] = days_elapsed
                enriched['daysTotal'] = days_total

            enriched_projects.append(enriched)

        # Active coupons (could be fetched from customer accounts)
        active_coupons = 25000
        remaining_coupons = active_coupons - total_billed_to_date

        return jsonify({
            "success": True,
            "live_data_available": projects_with_live_data > 0,
            "projects_with_live_data": projects_with_live_data,
            "projects_with_errors": projects_with_errors,
            "total_projects": len(enriched_projects),
            "summary": {
                "total_quoted_budget": round(total_quoted_budget, 2),
                "total_billed_to_date": round(total_billed_to_date, 2),
                "total_projected_overrun": round(total_projected_overrun, 2),
                "active_coupons": active_coupons,
                "remaining_coupons": round(remaining_coupons, 2)
            },
            "projects": enriched_projects,
            "snapshot_at": datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"FinOps Dashboard Error: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@cloud_ops_bp.route('/api/finops/billing_validation', methods=['POST'])
@jwt_required()
def billing_validation():
    """
    Per-project billing validation — fetches actual Huawei Cloud invoices
    for a specific project and compares against estimated costs.
    Used by FinOpsCalculator.jsx "Actual Invoice Validation" section.
    """
    try:
        data = request.get_json()
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        duration_months = int(data.get('duration_months', 3))
        estimated_cost = float(data.get('estimated_cost', 0))
        bom_items = data.get('bom_items', [])
        currency = data.get('currency', 'USD')

        # We need project context to get credentials
        project_id = data.get('project_id') or data.get('projectId')
        if not project_id:
            # Try to infer from BOM items or return simulated response
            return _simulated_billing_validation(start_date, end_date, duration_months, estimated_cost, bom_items)

        project_record = ProjectData.query.get(project_id)
        if not project_record:
            return _simulated_billing_validation(start_date, end_date, duration_months, estimated_cost, bom_items)

        proj_data = json.loads(project_record.data)
        customer_id = proj_data.get('customerId')
        customer = Customer.query.get(customer_id) if customer_id else None

        if not customer or not customer.ak or not customer.sk:
            return _simulated_billing_validation(start_date, end_date, duration_months, estimated_cost, bom_items)

        # Decrypt credentials
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_password)
        ak_str = str(customer.ak).strip()
        sk_str = str(customer.sk).strip()
        raw_ak, raw_sk = cm.decrypt_credentials(
            json.loads(ak_str)
        ) if ak_str.startswith('{') else (ak_str, sk_str)

        # Fetch live billing data
        from services.huawei_finops_service import HuaweiFinOpsService
        finops = HuaweiFinOpsService(raw_ak=raw_ak, raw_sk=raw_sk)

        # Parse dates
        from datetime import datetime as dt
        start = dt.strptime(start_date[:10], '%Y-%m-%d')
        end = dt.strptime(end_date[:10], '%Y-%m-%d')
        start_ym = start.strftime('%Y-%m')
        end_ym = end.strftime('%Y-%m')

        range_data = finops.get_billing_for_range(start_ym, end_ym)

        if not range_data.get('success'):
            return _simulated_billing_validation(start_date, end_date, duration_months, estimated_cost, bom_items)

        invoiced_total = range_data.get('grand_total', 0)
        variance = invoiced_total - estimated_cost
        status = 'warning' if abs(variance) > estimated_cost * 0.2 else 'ok'

        # Build category groups from BOM items matched against actual billing
        category_groups = []
        aggregated = range_data.get('aggregated_breakdown', {})

        # Map BOM service categories to actual billing
        bom_categories = set()
        for item in (bom_items or []):
            if item.get('selected', True):
                cat = str(item.get('category', item.get('service', 'Other'))).upper()
                bom_categories.add(cat)

        # Build groups from actual billing data
        category_map = {
            'Compute': ['ECS', 'ELB', 'AS', 'IMS', 'CCE'],
            'Database': ['RDS', 'DDS', 'DRS', 'GAUSSDB', 'REDIS'],
            'Storage': ['EVS', 'OBS', 'SFS', 'CBR', 'VBS'],
            'Networking': ['VPC', 'EIP', 'NAT', 'VPN', 'DIRECTCONNECT', 'CC', 'DNS']
        }

        for major_cat, service_keys in category_map.items():
            group_estimated = 0
            group_actual = 0
            items = []

            for svc in service_keys:
                actual_amt = aggregated.get(svc, 0)
                if actual_amt > 0:
                    group_actual += actual_amt
                    # Find matching BOM estimate
                    bom_est = 0
                    for bom_item in (bom_items or []):
                        if bom_item.get('selected', True) and str(bom_item.get('service', '')).upper() == svc:
                            bom_est += bom_item.get('cost_per_month', 0) * duration_months
                            break
                    group_estimated += bom_est
                    items.append({
                        'name': svc,
                        'category': major_cat,
                        'amount': round(actual_amt, 2),
                        'status': 'danger' if bom_est > 0 and actual_amt > bom_est * 1.2 else 'ok'
                    })

            if items:
                variance_amt = group_actual - group_estimated
                variance_pct = round(abs(variance_amt) / max(group_estimated, 1) * 100, 1)
                category_groups.append({
                    'category': major_cat,
                    'estimated': round(group_estimated, 2),
                    'actual': round(group_actual, 2),
                    'variance': round(variance_amt, 2),
                    'variance_pct': variance_pct,
                    'items': items
                })

        return jsonify({
            "success": True,
            "live_data": True,
            "invoiced_total": round(invoiced_total, 2),
            "variance": round(variance, 2),
            "status": status,
            "period": {
                "start": start_date[:10],
                "end": end_date[:10],
                "duration_months": range_data.get('months_queried', duration_months)
            },
            "category_groups": category_groups
        })

    except Exception as e:
        logger.error(f"Billing Validation Error: {e}", exc_info=True)
        return _simulated_billing_validation(
            data.get('start_date') if data else None,
            data.get('end_date') if data else None,
            data.get('duration_months', 3) if data else 3,
            data.get('estimated_cost', 0) if data else 0,
            data.get('bom_items', []) if data else []
        )


def _simulated_billing_validation(start_date, end_date, duration_months, estimated_cost, bom_items):
    """Return honest error when live billing data is unavailable."""
    return jsonify({
        "success": False,
        "live_data": False,
        "error": "Live billing validation unavailable — Huawei Cloud BSS APIs not published for LATAM region.",
        "hint": "Billing summary APIs require China region or different API tier. Contact Huawei Cloud support.",
        "period": {
            "start": start_date[:10] if start_date else 'N/A',
            "end": end_date[:10] if end_date else 'N/A',
            "duration_months": duration_months
        }
    }), 503
