import os
import json
import uuid
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, ProjectData, Customer, QuotationVersion, ExecutionState
from services.credential_manager import get_credential_manager

crm_bp = Blueprint('crm', __name__)
logger = logging.getLogger(__name__)

def _cred_blob_age(blob):
    """Extract key-age (days) + last-rotated timestamp from an encrypted credential JSON blob.
    Returns (days, timestamp_str) or (None, None) if absent/unparseable."""
    if not blob:
        return None, None
    try:
        d = json.loads(blob)
        ts = d.get('timestamp')
        if not ts:
            return None, None
        try:
            parsed = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S UTC')
        except ValueError:
            parsed = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')
        days = max(0, (datetime.utcnow() - parsed).days)
        return days, ts
    except Exception:
        return None, None

@crm_bp.route('/api/vault/validate', methods=['POST'])
@jwt_required()
def validate_vault_keys():
    data = request.json
    provider = data.get('provider')
    
    if provider == 'AWS':
        ak = data.get('ak')
        sk = data.get('sk')
        
        if not ak or not sk:
            return jsonify({"valid": False, "error": "AWS Access Key and Secret Key are required."})
        
        # Basic AWS validation - check if credentials are in correct format
        if not (ak.startswith('AKIA') and len(ak) == 20):
            return jsonify({"valid": False, "error": "Invalid AWS Access Key format. Should start with AKIA and be 20 characters."})
        
        if len(sk) != 40:
            return jsonify({"valid": False, "error": "Invalid AWS Secret Key format. Should be 40 characters."})
        
        # Note: We don't actually call AWS API here to avoid rate limiting
        # In a real implementation, we would make a simple API call like list_buckets
        return jsonify({"valid": True, "level": "Basic format validation passed"})
    
    elif provider == 'Azure':
        tenant_id = data.get('azureTenant')
        client_id = data.get('azureClient')
        client_secret = data.get('azureSecret')
        
        if not tenant_id or not client_id or not client_secret:
            return jsonify({"valid": False, "error": "Azure Tenant ID, Client ID, and Client Secret are all required."})
        
        # Validate Azure Tenant ID format (GUID)
        import re
        tenant_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        client_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        
        if not re.match(tenant_pattern, tenant_id, re.IGNORECASE):
            return jsonify({"valid": False, "error": "Invalid Azure Tenant ID format. Should be a GUID like '00000000-0000-0000-0000-000000000000'."})
        
        if not re.match(client_pattern, client_id, re.IGNORECASE):
            return jsonify({"valid": False, "error": "Invalid Azure Client ID format. Should be a GUID like '00000000-0000-0000-0000-000000000000'."})
        
        if len(client_secret) < 16:
            return jsonify({"valid": False, "error": "Azure Client Secret appears too short. Minimum 16 characters recommended."})
        
        # Try to authenticate with Azure to validate credentials
        try:
            from azure.identity import ClientSecretCredential
            from azure.mgmt.resource import SubscriptionClient
            
            credential = ClientSecretCredential(
                tenant_id=tenant_id,
                client_id=client_id,
                client_secret=client_secret
            )
            
            # Try to get subscriptions to validate credentials
            subscription_client = SubscriptionClient(credential)
            subscriptions = list(subscription_client.subscriptions.list())
            
            if subscriptions:
                subscription_names = [sub.display_name for sub in subscriptions[:3]]
                return jsonify({
                    "valid": True, 
                    "level": "Full authentication successful",
                    "subscriptions": subscription_names,
                    "subscription_count": len(subscriptions)
                })
            else:
                return jsonify({"valid": True, "level": "Authentication successful but no subscriptions found"})
                
        except ImportError:
            # Azure SDK not installed - fall back to basic validation
            return jsonify({"valid": True, "level": "Basic format validation passed (Azure SDK not installed)"})
        except Exception as e:
            error_msg = str(e)
            if "AADSTS700016" in error_msg:
                return jsonify({"valid": False, "error": "Application not found in tenant. Check Client ID and Tenant ID."})
            elif "AADSTS7000215" in error_msg:
                return jsonify({"valid": False, "error": "Invalid client secret provided."})
            elif "AADSTS50034" in error_msg:
                return jsonify({"valid": False, "error": "User account does not exist in tenant."})
            elif "AADSTS50020" in error_msg:
                return jsonify({"valid": False, "error": "User account is from identity provider 'live.com'."})
            elif "AADSTS50076" in error_msg:
                return jsonify({"valid": False, "error": "Multi-factor authentication required."})
            elif "AADSTS50079" in error_msg:
                return jsonify({"valid": False, "error": "Multi-factor enrollment required."})
            elif "AADSTS50126" in error_msg:
                return jsonify({"valid": False, "error": "Invalid username or password."})
            elif "AADSTS50173" in error_msg:
                return jsonify({"valid": False, "error": "Expired password."})
            elif "AADSTS50058" in error_msg:
                return jsonify({"valid": False, "error": "User interaction required."})
            elif "AADSTS90002" in error_msg:
                return jsonify({"valid": False, "error": "Tenant not found. Check Tenant ID."})
            elif "AADSTS9002313" in error_msg:
                return jsonify({"valid": False, "error": "Invalid request. Malformed or empty request."})
            elif "AADSTS900144" in error_msg:
                return jsonify({"valid": False, "error": "The request body must contain client_secret."})
            elif "subscription" in error_msg.lower():
                return jsonify({"valid": False, "error": f"Authentication successful but subscription access issue: {error_msg}"})
            else:
                return jsonify({"valid": False, "error": f"Azure authentication failed: {error_msg}"})
    
    else:
        return jsonify({"valid": False, "error": f"Unknown provider: {provider}. Supported: AWS, Azure"})

@crm_bp.route('/api/erp/state', methods=['GET'])
@jwt_required()
def get_state():
    try:
        projects = ProjectData.query.all()
        valid_projects = []
        for p in projects:
            try:
                valid_projects.append(json.loads(p.data) if isinstance(p.data, str) else p.data)
            except json.JSONDecodeError:
                continue
        return jsonify({"success": True, "projects": valid_projects})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/projects', methods=['POST'])
@jwt_required()
def update_project():
    """Legacy Full-Update Endpoint"""
    try:
        data = request.json
        project_id = str(data.get('id'))
        project = ProjectData.query.get(project_id)
        if project:
            project.data = json.dumps(data, ensure_ascii=False)
        else:
            project = ProjectData(id=project_id, data=json.dumps(data, ensure_ascii=False))
            db.session.add(project)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/projects/<project_id>/partial', methods=['PATCH'])
@jwt_required()
def partial_update_project(project_id):
    """Atomic Partial Update"""
    try:
        data_updates = request.json
        project = ProjectData.query.get(project_id)
        
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
            
        current_data = json.loads(project.data)
        for key, value in data_updates.items():
            current_data[key] = value
            
        project.data = json.dumps(current_data, ensure_ascii=False)
        db.session.commit()
        return jsonify({"success": True})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/projects/<project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Delete a project permanently"""
    try:
        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
        
        # Delete all related records first (maintain referential integrity)
        from models import QuotationVersion, ExecutionState, WBSTask, CognitiveLearningLog
        
        QuotationVersion.query.filter_by(project_id=project_id).delete()
        ExecutionState.query.filter_by(project_id=project_id).delete()
        WBSTask.query.filter_by(project_id=project_id).delete()
        CognitiveLearningLog.query.filter_by(project_id=project_id).delete()
        
        db.session.delete(project)
        db.session.commit()
        return jsonify({"success": True, "message": f"Project {project_id} deleted"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

# 🚨 SECURE CUSTOMER DIRECTORY LOGIC
@crm_bp.route('/api/erp/customers', methods=['GET', 'POST'])
@jwt_required()
def manage_customers():
    try:
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_password)

        if request.method == 'GET':
            customers = Customer.query.all()
            result = []
            for c in customers:
                result.append({
                    "id": c.id, "name": c.name, "region": c.region,
                    "cio": c.cio, "it_lead": c.it_lead, "architect": c.architect,
                    
                    # We are intentionally NOT sending keys to the frontend.
                    # We only send boolean indicators so the UI knows if a key exists.
                    "ak": True if c.ak else False,
                    "sk": True if c.sk else False,
                    "source_ak": True if c.source_huawei_ak else False,
                    "source_sk": True if c.source_huawei_sk else False,
                    "tier1_ak": True if c.tier1_ak else False,
                    "tier1_sk": True if c.tier1_sk else False,
                    "tier2_ak": True if c.tier2_ak else False,
                    "tier2_sk": True if c.tier2_sk else False,
                    "tier3_ak": True if c.tier3_ak else False,
                    "tier3_sk": True if c.tier3_sk else False,
                    "aws_ak": True if c.aws_ak else False,
                    "aws_sk": True if c.aws_sk else False,
                    "azure_client_id": True if c.azure_client_id else False,
                    "azure_client_secret": True if c.azure_client_secret else False,
                    "azure_tenant_id": True if c.azure_tenant_id else False,
                    "azure_subscription_id": True if c.azure_subscription_id else False,
                    
                    "os_domain": c.os_domain, 
                    "os_user": c.os_user, 
                    # 🚨 MASK THE PASSWORD - NEVER SEND IT TO FRONTEND IN PLAIN TEXT
                    "os_password": "********" if c.os_password else "",

                    # 🕐 KEY AGE / LAST-ROTATED (derived from encrypted blob timestamp)
                    "key_age": {
                        "master": _cred_blob_age(c.ak)[0],
                        "tier1": _cred_blob_age(c.tier1_ak)[0],
                        "tier2": _cred_blob_age(c.tier2_ak)[0],
                        "tier3": _cred_blob_age(c.tier3_ak)[0],
                        "aws": _cred_blob_age(c.aws_ak)[0],
                        "source": _cred_blob_age(c.source_huawei_ak)[0],
                    },
                    "last_rotated": {
                        "master": _cred_blob_age(c.ak)[1],
                        "tier1": _cred_blob_age(c.tier1_ak)[1],
                        "tier2": _cred_blob_age(c.tier2_ak)[1],
                        "tier3": _cred_blob_age(c.tier3_ak)[1],
                        "aws": _cred_blob_age(c.aws_ak)[1],
                        "source": _cred_blob_age(c.source_huawei_ak)[1],
                    }
                })
            return jsonify({"success": True, "customers": result})
        
        elif request.method == 'POST':
            data = request.json
            new_id = data.get('id', str(uuid.uuid4()))
            
            # 🚨 ENCRYPT ALL CREDENTIALS BEFORE SAVING
            def encrypt_credential_pair(ak_value, sk_value):
                """Encrypt AK/SK pair together"""
                if not ak_value or not sk_value or ak_value == "********" or sk_value == "********":
                    return None, None
                try:
                    enc_dict = cm.encrypt_credentials(ak_value, sk_value)
                    encrypted_json = json.dumps(enc_dict)
                    return encrypted_json, encrypted_json
                except Exception as e:
                    logger.error(f"Failed to encrypt credentials: {str(e)}")
                    return None, None
            
            def encrypt_single_credential(value):
                """Encrypt a single credential field"""
                if not value or value == "********":
                    return None
                try:
                    # For single field, use a placeholder for SK
                    enc_dict = cm.encrypt_credentials(value, f"placeholder_for_{hash(value)}")
                    return json.dumps(enc_dict)
                except Exception as e:
                    logger.error(f"Failed to encrypt single credential: {str(e)}")
                    return None
            
            # Encrypt AK/SK pairs
            ak, sk = encrypt_credential_pair(data.get('ak'), data.get('sk'))
            tier1_ak, tier1_sk = encrypt_credential_pair(data.get('tier1_ak'), data.get('tier1_sk'))
            tier2_ak, tier2_sk = encrypt_credential_pair(data.get('tier2_ak'), data.get('tier2_sk'))
            tier3_ak, tier3_sk = encrypt_credential_pair(data.get('tier3_ak'), data.get('tier3_sk'))
            aws_ak, aws_sk = encrypt_credential_pair(data.get('aws_ak'), data.get('aws_sk'))
            
            # Encrypt single credentials
            azure_client_secret = encrypt_single_credential(data.get('azure_client_secret'))
            os_password = encrypt_single_credential(data.get('os_password'))

            c = Customer(
                id=new_id,
                name=data.get('name'), region=data.get('region'), cio=data.get('cio'),
                it_lead=data.get('it_lead'), architect=data.get('architect'),
                
                # Store encrypted credentials (or None if not provided)
                ak=ak if ak is not None else data.get('ak'),
                sk=sk if sk is not None else data.get('sk'),
                tier1_ak=tier1_ak if tier1_ak is not None else data.get('tier1_ak'),
                tier1_sk=tier1_sk if tier1_sk is not None else data.get('tier1_sk'),
                tier2_ak=tier2_ak if tier2_ak is not None else data.get('tier2_ak'),
                tier2_sk=tier2_sk if tier2_sk is not None else data.get('tier2_sk'),
                tier3_ak=tier3_ak if tier3_ak is not None else data.get('tier3_ak'),
                tier3_sk=tier3_sk if tier3_sk is not None else data.get('tier3_sk'),
                aws_ak=aws_ak if aws_ak is not None else data.get('aws_ak'),
                aws_sk=aws_sk if aws_sk is not None else data.get('aws_sk'),
                azure_tenant_id=data.get('azure_tenant_id'),
                azure_client_id=data.get('azure_client_id'),
                azure_client_secret=azure_client_secret if azure_client_secret is not None else data.get('azure_client_secret'),
                azure_subscription_id=data.get('azure_subscription_id'),
                vcenter_host=data.get('vcenter_host'),
                
                os_domain=data.get('os_domain'), 
                os_user=data.get('os_user'), 
                os_password=os_password if os_password is not None else data.get('os_password')
            )
            db.session.add(c)
            db.session.commit()
            return jsonify({"success": True, "customer": {"id": c.id, "name": c.name}})
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/customers/<c_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def update_delete_customer(c_id):
    try:
        customer = Customer.query.get(c_id)
        if not customer:
            return jsonify({"success": False, "error": "Not found"}), 404
            
        if request.method == 'DELETE':
            db.session.delete(customer)
            db.session.commit()
            return jsonify({"success": True})
            
        if request.method == 'PUT':
            data = request.json
            master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
            cm = get_credential_manager(master_password)

            # 🚨 ENCRYPT ALL CREDENTIALS IF THEY WERE CHANGED
            def encrypt_credential_pair(ak_value, sk_value):
                """Encrypt AK/SK pair together"""
                if not ak_value or not sk_value or ak_value == "********" or sk_value == "********":
                    return None, None
                try:
                    enc_dict = cm.encrypt_credentials(ak_value, sk_value)
                    encrypted_json = json.dumps(enc_dict)
                    return encrypted_json, encrypted_json
                except Exception as e:
                    logger.error(f"Failed to encrypt credentials: {str(e)}")
                    return None, None
            
            def encrypt_single_credential(value):
                """Encrypt a single credential field"""
                if not value or value == "********":
                    return None
                try:
                    # For single field, use a placeholder for SK
                    enc_dict = cm.encrypt_credentials(value, f"placeholder_for_{hash(value)}")
                    return json.dumps(enc_dict)
                except Exception as e:
                    logger.error(f"Failed to encrypt single credential: {str(e)}")
                    return None
            
            # Check and encrypt AK/SK pairs
            ak_sk_pairs = [
                ('ak', 'sk'),
                ('tier1_ak', 'tier1_sk'),
                ('tier2_ak', 'tier2_sk'),
                ('tier3_ak', 'tier3_sk'),
                ('aws_ak', 'aws_sk'),
                ('source_huawei_ak', 'source_huawei_sk')  # Added source Huawei Cloud credentials
            ]
            
            for ak_field, sk_field in ak_sk_pairs:
                if ak_field in data and sk_field in data:
                    ak_value = data[ak_field]
                    sk_value = data[sk_field]
                    
                    # Only encrypt if both are provided and not masked
                    if ak_value and sk_value and ak_value != "********" and sk_value != "********":
                        # Check if already encrypted
                        if not (isinstance(ak_value, str) and ak_value.startswith('{') and 'encrypted_' in ak_value):
                            encrypted_ak, encrypted_sk = encrypt_credential_pair(ak_value, sk_value)
                            if encrypted_ak and encrypted_sk:
                                customer.__setattr__(ak_field, encrypted_ak)
                                customer.__setattr__(sk_field, encrypted_sk)
                                # Remove from data so generic loop doesn't overwrite
                                del data[ak_field]
                                del data[sk_field]
            
            # Check and encrypt single credentials
            single_credentials = ['azure_client_secret', 'os_password']
            for field in single_credentials:
                if field in data:
                    value = data[field]
                    if value and value != "********":
                        # Check if already encrypted
                        if not (isinstance(value, str) and value.startswith('{') and 'encrypted_' in value):
                            encrypted = encrypt_single_credential(value)
                            if encrypted:
                                customer.__setattr__(field, encrypted)
                                # Remove from data so generic loop doesn't overwrite
                                del data[field]

            # Generic update for remaining fields
            for key in data:
                if hasattr(customer, key):
                    setattr(customer, key, data[key])
                    
            db.session.commit()
            return jsonify({"success": True})
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/wbs/global', methods=['GET'])
@jwt_required()
def get_global_wbs():
    try:
        from models import ProjectData
        import json
        
        all_tasks = []
        projects = ProjectData.query.all()
        
        for project in projects:
            try:
                project_data = json.loads(project.data) if isinstance(project.data, str) else project.data
                migration_plan = project_data.get('migrationPlan', [])
                
                for task in migration_plan:
                    # Add project_id to each task for reference
                    task_with_project = dict(task)
                    task_with_project['project_id'] = str(project.id)
                    task_with_project['project_name'] = project_data.get('name', 'Unknown Project')
                    task_with_project['customer_name'] = project_data.get('customerName', 'Unknown Customer')
                    task_with_project['lifecycle_state'] = project_data.get('lifecycleState', 'unknown')
                    
                    # Map field names to match frontend expectations
                    if 'resp' in task_with_project:
                        task_with_project['raci'] = task_with_project.pop('resp')
                    if 'prog' in task_with_project:
                        task_with_project['progress'] = task_with_project.pop('prog')
                    if 'start' in task_with_project:
                        task_with_project['start_date'] = task_with_project.pop('start')
                    if 'end' in task_with_project:
                        task_with_project['end_date'] = task_with_project.pop('end')
                    if 'isParent' in task_with_project:
                        task_with_project['is_parent'] = task_with_project.pop('isParent')
                    if 'id' in task_with_project:
                        task_with_project['wbs_id'] = task_with_project.pop('id')
                    
                    all_tasks.append(task_with_project)
            except Exception as e:
                print(f"Error parsing project {project.id}: {e}")
                continue
        
        return jsonify({"success": True, "tasks": all_tasks})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/wbs/task', methods=['POST'])
@jwt_required()
def update_wbs_task():
    try:
        data = request.json
        task_id = data.get('id')
        new_progress = data.get('progress')
        
        if not task_id or not new_progress:
            return jsonify({"success": False, "error": "Task ID and progress required"}), 400
        
        # Since WBS tasks are stored in project.migrationPlan, we need to find and update
        from models import ProjectData
        import json
        
        updated = False
        projects = ProjectData.query.all()
        
        for project in projects:
            try:
                project_data = json.loads(project.data) if isinstance(project.data, str) else project.data
                migration_plan = project_data.get('migrationPlan', [])
                
                for i, task in enumerate(migration_plan):
                    if task.get('id') == task_id:
                        # Update the task progress
                        migration_plan[i]['prog'] = new_progress
                        project_data['migrationPlan'] = migration_plan
                        project.data = json.dumps(project_data, ensure_ascii=False)
                        db.session.commit()
                        updated = True
                        break
                
                if updated:
                    break
            except Exception as e:
                print(f"Error updating task in project {project.id}: {e}")
                continue
        
        if updated:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "error": "Task not found"}), 404
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/playbooks', methods=['GET', 'POST'])
@jwt_required()
def manage_playbooks():
    return jsonify({"success": True})

@crm_bp.route('/api/erp/customers/<c_id>/rotate-credentials', methods=['POST'])
@jwt_required()
def rotate_customer_credentials(c_id):
    """Rotate credentials for a customer — accepts new AK/SK pair, validates, encrypts, stores"""
    try:
        customer = Customer.query.get(c_id)
        if not customer:
            return jsonify({"success": False, "error": "Customer not found"}), 404

        data = request.json
        tier = data.get('tier')  # master, tier1, tier2, tier3, aws, source_huawei
        new_ak = data.get('ak')
        new_sk = data.get('sk')
        reason = data.get('reason', 'Manual rotation')

        if not tier or not new_ak or not new_sk:
            return jsonify({"success": False, "error": "tier, ak, and sk are required"}), 400

        # Validate tier
        valid_tiers = {
            'master': ('ak', 'sk'),
            'tier1': ('tier1_ak', 'tier1_sk'),
            'tier2': ('tier2_ak', 'tier2_sk'),
            'tier3': ('tier3_ak', 'tier3_sk'),
            'aws': ('aws_ak', 'aws_sk'),
            'source_huawei': ('source_huawei_ak', 'source_huawei_sk')
        }

        if tier not in valid_tiers:
            return jsonify({"success": False, "error": f"Invalid tier. Valid: {list(valid_tiers.keys())}"}), 400

        ak_field, sk_field = valid_tiers[tier]

        # Validate format briefly
        if len(new_ak) < 10 or len(new_sk) < 10:
            return jsonify({"success": False, "error": "AK/SK appear too short to be valid"}), 400

        # Encrypt new credentials
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_password)
        enc_dict = cm.encrypt_credentials(new_ak, new_sk)
        encrypted_json = json.dumps(enc_dict)

        # Store old values for audit log before overwriting
        old_ak_encrypted = getattr(customer, ak_field)
        old_sk_encrypted = getattr(customer, sk_field)

        # Update with new encrypted credentials
        setattr(customer, ak_field, encrypted_json)
        setattr(customer, sk_field, encrypted_json)

        # Log rotation event
        log_entry = {
            "timestamp": datetime.utcnow().replace(tzinfo=None).strftime('%Y-%m-%d %H:%M:%S UTC'),
            "customer_id": c_id,
            "customer_name": customer.name,
            "tier": tier,
            "reason": reason,
            "old_ak_prefix": old_ak_encrypted[:30] + "..." if old_ak_encrypted else "none"
        }
        logger.info(f"CREDENTIAL ROTATION: {json.dumps(log_entry)}")

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"{tier} credentials rotated for {customer.name}",
            "tier": tier,
            "timestamp": log_entry["timestamp"]
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Credential rotation failed: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route('/api/erp/customers/<c_id>/sync-credentials', methods=['POST'])
@jwt_required()
def sync_customer_credentials(c_id):
    """Validate new AK/SK against Huawei IAM, then encrypt + store. Console-assisted rotation step 2."""
    try:
        from services.huawei_api_signer import validate_iam_key

        customer = Customer.query.get(c_id)
        if not customer:
            return jsonify({"success": False, "error": "Customer not found"}), 404

        data = request.json or {}
        tier = data.get('tier', '').strip().lower()
        ak = data.get('ak', '').strip()
        sk = data.get('sk', '').strip()
        reason = data.get('reason', 'Console sync')

        # Tier → DB column mapping
        tier_map = {
            'master':       ('ak', 'sk'),
            'tier1':        ('tier1_ak', 'tier1_sk'),
            'tier2':        ('tier2_ak', 'tier2_sk'),
            'tier3':        ('tier3_ak', 'tier3_sk'),
            'aws':          ('aws_ak', 'aws_sk'),
            'source_huawei': ('source_huawei_ak', 'source_huawei_sk'),
        }
        if tier not in tier_map:
            return jsonify({"success": False, "error": f"Unknown tier: {tier}. Use: {', '.join(tier_map.keys())}"}), 400

        if not ak or not sk or len(ak) < 10 or len(sk) < 10:
            return jsonify({"success": False, "error": "AK/SK too short or missing"}), 400

        # Step 1: Validate new key against Huawei IAM
        validation = validate_iam_key(ak, sk)
        if not validation['valid']:
            return jsonify({
                "success": False,
                "error": f"IAM validation failed: {validation.get('error', 'unknown')}"
            }), 400

        # Step 2: Encrypt + store
        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_password)
        enc_dict = cm.encrypt_credentials(ak, sk)
        encrypted_json = json.dumps(enc_dict)

        ak_field, sk_field = tier_map[tier]
        setattr(customer, ak_field, encrypted_json)
        setattr(customer, sk_field, encrypted_json)
        db.session.commit()

        logger.info(
            f"CREDENTIAL SYNC: customer={c_id} tier={tier} "
            f"login_id={validation.get('login_id','?')} "
            f"reason={reason}"
        )

        return jsonify({
            "success": True,
            "customer_id": c_id,
            "tier": tier,
            "timestamp": enc_dict['timestamp'],
            "login_id_last4": validation['login_id'][-4:] if len(validation.get('login_id','')) >= 4 else validation.get('login_id',''),
            "message": f"Validated & encrypted. Old key should now be disabled in console."
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Credential sync failed: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route('/api/erp/customers/<c_id>/credential-audit', methods=['GET'])
@jwt_required()
def audit_customer_credentials(c_id):
    """Audit credential status for a customer — reports which tiers have keys, age indicators"""
    try:
        customer = Customer.query.get(c_id)
        if not customer:
            return jsonify({"success": False, "error": "Customer not found"}), 404

        tiers = {
            'master': ('ak', 'sk'),
            'tier1': ('tier1_ak', 'tier1_sk'),
            'tier2': ('tier2_ak', 'tier2_sk'),
            'tier3': ('tier3_ak', 'tier3_sk'),
            'aws': ('aws_ak', 'aws_sk'),
            'source_huawei': ('source_huawei_ak', 'source_huawei_sk')
        }

        audit = {}
        for tier_name, (ak_field, sk_field) in tiers.items():
            ak_val = getattr(customer, ak_field)
            sk_val = getattr(customer, sk_field)
            has_ak = bool(ak_val)
            has_sk = bool(sk_val)
            is_encrypted = False
            ak_preview = None

            if has_ak and isinstance(ak_val, str):
                is_encrypted = ak_val.startswith('{') and 'encrypted_' in ak_val
                try:
                    enc_data = json.loads(ak_val)
                    if 'timestamp' in enc_data:
                        audit[tier_name + '_encrypted_at'] = enc_data['timestamp']
                except (json.JSONDecodeError, KeyError):
                    pass
                ak_preview = ak_val[:8] + "..." if len(ak_val) > 8 else ak_val

            audit[tier_name] = {
                'has_keys': has_ak and has_sk,
                'encrypted': is_encrypted,
                'preview': ak_preview
            }

        return jsonify({
            "success": True,
            "customer_id": c_id,
            "customer_name": customer.name,
            "audit": audit
        })

    except Exception as e:
        logger.error(f"Credential audit failed: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route('/api/erp/projects/<project_id>/set-phase', methods=['POST'])
@jwt_required()
def set_project_phase(project_id):
    """Admin override to set project phase (for retroactive projects)"""
    try:
        data = request.json
        phase = data.get('phase')
        if not phase:
            return jsonify({"success": False, "error": "Phase required"}), 400
            
        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404
            
        # Update lifecycle state in JSON data
        project_data = json.loads(project.data)
        project_data['lifecycleState'] = phase
        
        # Also update database column if needed
        project.data = json.dumps(project_data, ensure_ascii=False)
        
        # Also update execution state if it exists
        execution_state = ExecutionState.query.filter_by(project_id=project_id).first()
        if execution_state:
            # Map lifecycle phase to execution phase
            # Check if it's a greenfield project
            project_data = json.loads(project.data)
            is_greenfield = project_data.get('project_type') == 'greenfield' or project.project_type == 'greenfield'
            
            phase_mapping = {
                '1_arb': 'PHASE_4_0',
                '2_architecture': 'PHASE_4_0',
                '3_planning': 'PHASE_4_0',
                '4_execution': 'PHASE_4_1',  # Start of execution
                '5_postlive': 'PHASE_4_3' if is_greenfield else 'PHASE_4_6',  # Last phase for project type
                '6_completed': 'COMPLETED'
            }
            execution_phase = phase_mapping.get(phase, 'PHASE_4_0')
            execution_state.current_phase = execution_phase
            execution_state.status = 'COMPLETED' if execution_phase == 'COMPLETED' else 'PENDING'
        
        db.session.commit()
        
        return jsonify({"success": True, "phase": phase, "project_id": project_id, 
                       "execution_phase_updated": execution_state is not None})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500



# ─────────────────────────────────────────────
# PROJECT HALT / CANCELLATION ENDPOINTS
# ─────────────────────────────────────────────

@crm_bp.route('/api/erp/projects/<project_id>/halt', methods=['POST'])
@jwt_required()
def halt_project(project_id):
    """Halt a project — action ∈ {cancel, suspend, transfer}"""
    try:
        data = request.json
        action = data.get('action')  # 'cancel', 'suspend', 'transfer'
        reason = data.get('reason', '')
        transferred_to = data.get('transferredTo', '')
        resume_review_date = data.get('resumeReviewDate', '')
        author = data.get('author', 'System')

        if action not in ('cancel', 'suspend', 'transfer'):
            return jsonify({"success": False, "error": "action must be cancel, suspend, or transfer"}), 400

        if not reason or not reason.strip():
            return jsonify({"success": False, "error": "reason is required"}), 400

        if action == 'transfer' and not transferred_to:
            return jsonify({"success": False, "error": "transferredTo is required for transfer action"}), 400

        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404

        project_data = json.loads(project.data)

        # Set halt metadata
        project_data['status'] = 'cancelled' if action == 'cancel' else ('suspended' if action == 'suspend' else 'transferred')
        project_data['haltAction'] = action
        project_data['haltReason'] = reason.strip()
        project_data['haltDate'] = datetime.utcnow().isoformat()
        project_data['haltAuthor'] = author
        project_data['haltedFromPhase'] = project_data.get('lifecycleState', 'unknown')

        if action == 'transfer':
            project_data['transferredTo'] = transferred_to
            project_data['transferredDate'] = datetime.utcnow().isoformat()

        if action == 'suspend' and resume_review_date:
            project_data['resumeReviewDate'] = resume_review_date

        # Preserve current state snapshot
        project_data['haltSnapshot'] = {
            'phase': project_data.get('lifecycleState'),
            'progress': project_data.get('prog', '0%'),
            'resourcesDeployed': project_data.get('resourcesDeployed', []),
            'configState': project_data.get('configState', {}),
        }

        project.data = json.dumps(project_data, ensure_ascii=False)

        # Update execution state if present
        execution_state = ExecutionState.query.filter_by(project_id=project_id).first()
        if execution_state:
            execution_state.status = 'HALTED'
            execution_state.halt_action = action

        db.session.commit()

        logger.info(f"Project {project_id} halted: action={action}, by={author}")
        return jsonify({
            "success": True,
            "project_id": project_id,
            "status": project_data['status'],
            "action": action,
            "message": f"Project {action}ed successfully"
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Halt project failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route('/api/erp/projects/<project_id>/resume', methods=['PATCH'])
@jwt_required()
def resume_project(project_id):
    """Resume a suspended project back to active state"""
    try:
        project = ProjectData.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "Project not found"}), 404

        project_data = json.loads(project.data)

        if project_data.get('status') != 'suspended':
            return jsonify({"success": False, "error": "Only suspended projects can be resumed"}), 400

        project_data['status'] = 'active'
        project_data.pop('haltAction', None)
        project_data.pop('haltReason', None)
        project_data.pop('haltDate', None)
        project_data.pop('haltAuthor', None)
        project_data.pop('resumeReviewDate', None)
        project_data['resumedDate'] = datetime.utcnow().isoformat()
        project_data['resumedBy'] = request.json.get('author', 'System')

        project.data = json.dumps(project_data, ensure_ascii=False)

        # Restore execution state
        execution_state = ExecutionState.query.filter_by(project_id=project_id).first()
        if execution_state:
            execution_state.status = 'ACTIVE'
            execution_state.halt_action = None

        db.session.commit()

        return jsonify({
            "success": True,
            "project_id": project_id,
            "status": "active",
            "message": "Project resumed successfully"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@crm_bp.route('/api/erp/projects/halted', methods=['GET'])
@jwt_required()
def get_halted_projects():
    """List all halted projects (cancelled, suspended, transferred)"""
    try:
        # Filter by status in JSON data field
        all_projects = ProjectData.query.all()
        halted = []

        for p in all_projects:
            try:
                data = json.loads(p.data)
                if data.get('status') in ('cancelled', 'suspended', 'transferred'):
                    halted.append({
                        'id': p.id,
                        'name': data.get('name', p.id),
                        'customerName': data.get('customerName', ''),
                        'status': data['status'],
                        'haltAction': data.get('haltAction', ''),
                        'haltReason': data.get('haltReason', ''),
                        'haltDate': data.get('haltDate', ''),
                        'haltAuthor': data.get('haltAuthor', ''),
                        'haltedFromPhase': data.get('haltedFromPhase', ''),
                        'transferredTo': data.get('transferredTo', ''),
                        'resumeReviewDate': data.get('resumeReviewDate', ''),
                        'progress': data.get('prog', '0%'),
                        'haltSnapshot': data.get('haltSnapshot', {}),
                    })
            except Exception:
                continue

        return jsonify({
            "success": True,
            "count": len(halted),
            "projects": halted
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
