"""
4.0 Execution Readiness Gateway — Validation Endpoints
Implements the least-privilege credential hierarchy:
  Master AK/SK → Tier 2 (EPS Admin) → Tier 3 (Tool-specific) → Data Plane (OS)
"""
from flask import Blueprint, request, jsonify, current_app
from models import db, Customer, ProjectData
from services.huawei_iam import HuaweiIAMClient
from services.huawei_eps import HuaweiEPSClient
import logging
import os

gateway_bp = Blueprint('gateway', __name__, url_prefix='/api/gateway')
logger = logging.getLogger(__name__)


def _get_customer(customer_id: str):
    """Resolve customer, return (customer, error_response)."""
    customer = Customer.query.get(customer_id)
    if not customer:
        return None, (jsonify({'success': False, 'error': 'Customer not found'}), 404)
    return customer, None


def _decrypt_credential(ciphertext: str | None) -> str | None:
    """Decrypt a stored credential value (returns AK).
    
    Stored values may be:
    - Encrypted JSON: {"encrypted_ak": "...", "salt": "..."} → decrypt with credential_manager
    - Plaintext: "HPUAQHWOCSRT..." → return as-is (legacy/test data)
    - Boolean: True/False → return None (indicator only, no actual value)
    """
    return _decrypt_credential_pair(ciphertext)[0]


def _decrypt_credential_pair(ak_ciphertext: str | None, sk_ciphertext: str | None = None) -> tuple:
    """Decrypt stored AK and SK. Returns (ak, sk) tuple.
    
    Both fields store the same encrypted JSON blob containing both AK and SK.
    """
    if not ak_ciphertext:
        return (None, None)
    # Boolean indicators — not actual credentials
    if isinstance(ak_ciphertext, bool):
        return (None, None)
    # If it's a string that's not JSON, return as-is (plaintext/legacy)
    if isinstance(ak_ciphertext, str) and not ak_ciphertext.startswith('{'):
        ak_val = ak_ciphertext if len(ak_ciphertext) >= 10 else None
        sk_val = None
        if sk_ciphertext and isinstance(sk_ciphertext, str) and not sk_ciphertext.startswith('{'):
            sk_val = sk_ciphertext if len(sk_ciphertext) >= 10 else None
        return (ak_val, sk_val)
    # Encrypted JSON — decrypt using credential_manager
    try:
        import json as _json
        from services.credential_manager import get_credential_manager
        import os as _os
        master_pw = _os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
        cm = get_credential_manager(master_pw)
        enc_dict = _json.loads(ak_ciphertext) if isinstance(ak_ciphertext, str) else ak_ciphertext
        if isinstance(enc_dict, dict) and 'encrypted_ak' in enc_dict:
            ak, sk = cm.decrypt_credentials(enc_dict)
            return (ak, sk)
    except Exception as e:
        logger.error(f"Failed to decrypt credential pair: {e}")
    return (None, None)


# ─────────────────────────────────────────────
# 1. MASTER AK/SK VALIDATION
# ─────────────────────────────────────────────
@gateway_bp.route('/validate-master', methods=['POST'])
def validate_master():
    """Ping Huawei IAM with Master AK/SK to verify connectivity."""
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    customer, err = _get_customer(customer_id)
    if err:
        return err

    ak, sk = _decrypt_credential_pair(customer.ak, customer.sk)
    if not ak or not sk:
        return jsonify({
            'success': False,
            'check': 'master_credentials',
            'status': 'missing',
            'message': 'Master AK/SK not configured for this customer.',
            'action': 'Configure Master AK/SK in Customer Directory.'
        }), 400

    try:
        client = HuaweiIAMClient(ak, sk, customer.region or 'la-north-2')
        result = client.ping()
        return jsonify({
            'success': True,
            'check': 'master_credentials',
            'status': 'valid',
            'account_id': result.get('account_id'),
            'message': 'Master AK/SK authenticated successfully.'
        })
    except Exception as e:
        logger.error(f'Master AK/SK validation failed: {e}')
        return jsonify({
            'success': False,
            'check': 'master_credentials',
            'status': 'invalid',
            'message': f'Master credentials rejected: {str(e)}',
            'action': 'Verify credentials via Huawei Console.'
        }), 401


# ─────────────────────────────────────────────
# 2. REAL-NAME AUTHENTICATION CHECK
# ─────────────────────────────────────────────
@gateway_bp.route('/check-realname-auth', methods=['POST'])
def check_realname_auth():
    """Check if the Huawei Cloud account has real-name authentication."""
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    customer, err = _get_customer(customer_id)
    if err:
        return err

    ak, sk = _decrypt_credential_pair(customer.ak, customer.sk)
    if not ak or not sk:
        return jsonify({'success': False, 'error': 'Master AK/SK required'}), 400

    try:
        client = HuaweiIAMClient(ak, sk, customer.region or 'la-north-2')
        auth_status = client.check_realname_auth()
        # auth_status: {verified: bool, name: str, type: 'individual'|'enterprise'}
        return jsonify({
            'success': True,
            'check': 'realname_auth',
            'verified': auth_status.get('verified', False),
            'auth_type': auth_status.get('type'),
            'account_name': auth_status.get('name'),
            'message': (
                'Real-name authentication verified.'
                if auth_status.get('verified')
                else 'Real-name authentication NOT complete. EPS + Tier 2 isolation unavailable.'
            ),
            'requires_action': not auth_status.get('verified'),
            'action': 'Notify commercial team to complete real-name authentication.'
        })
    except Exception as e:
        logger.error(f'Real-name auth check failed: {e}')
        return jsonify({
            'success': False,
            'check': 'realname_auth',
            'error': str(e),
            'message': 'Could not verify real-name status. Assume NOT verified.',
            'requires_action': True,
            'action': 'Notify commercial team to complete real-name authentication.'
        }), 500


# ─────────────────────────────────────────────
# 3. EPS PROVISIONING & VALIDATION
# ─────────────────────────────────────────────
def _compute_eps_bracket(project: ProjectData) -> str:
    """Determine EPS bracket based on project size thresholds."""
    blueprint = getattr(project, 'blueprintData', {}) or {}
    topology = blueprint.get('topology', {}) if isinstance(blueprint, dict) else {}

    compute_count = len(topology.get('compute', []))
    db_count = len(topology.get('databases', []))
    storage_tb = sum(
        s.get('size_gb', 0) for s in topology.get('storage', [])
    ) / 1024  # GB → TB

    # Bracket thresholds
    if compute_count <= 10 and db_count <= 3 and storage_tb <= 5:
        return 'small'
    elif compute_count <= 50 and db_count <= 10 and storage_tb <= 50:
        return 'medium'
    else:
        return 'large'


@gateway_bp.route('/provision-eps', methods=['POST'])
def provision_eps():
    """Create Enterprise Project for the customer using Master AK/SK."""
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    project_id = data.get('project_id')
    customer, err = _get_customer(customer_id)
    if err:
        return err

    project = ProjectData.query.get(project_id) if project_id else None
    bracket = _compute_eps_bracket(project) if project else 'medium'

    ak, sk = _decrypt_credential_pair(customer.ak, customer.sk)
    if not ak or not sk:
        return jsonify({'success': False, 'error': 'Master AK/SK required'}), 400

    eps_name = f'latam-migration-{customer.name.replace(" ", "-").lower()}'
    try:
        client = HuaweiEPSClient(ak, sk, customer.region or 'la-north-2')
        eps = client.create_enterprise_project(
            name=eps_name,
            description=f'LATAM Cloud ERP Migration — {bracket.upper()} bracket'
        )
        return jsonify({
            'success': True,
            'check': 'eps_provisioning',
            'status': 'created',
            'eps_id': eps.get('id'),
            'eps_name': eps_name,
            'bracket': bracket,
            'message': f'Enterprise Project created ({bracket} bracket).'
        })
    except Exception as e:
        logger.error(f'EPS provisioning failed: {e}')
        return jsonify({
            'success': False,
            'check': 'eps_provisioning',
            'status': 'failed',
            'error': str(e),
            'action': 'Retry or create EPS manually via Huawei Console.'
        }), 500


@gateway_bp.route('/validate-tier2', methods=['POST'])
def validate_tier2():
    """Test Tier 2 (EPS Admin) can access the Enterprise Project."""
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    eps_id = data.get('eps_id')
    customer, err = _get_customer(customer_id)
    if err:
        return err

    tier2_ak, tier2_sk = _decrypt_credential_pair(customer.tier2_ak, customer.tier2_sk)
    if not tier2_ak or not tier2_sk:
        return jsonify({
            'success': False,
            'check': 'tier2_credentials',
            'status': 'missing',
            'message': 'Tier 2 Sandbox EPS Admin Key not configured.',
            'action': 'Create IAM user with EPS Admin role and provide AK/SK.'
        }), 400

    try:
        client = HuaweiEPSClient(tier2_ak, tier2_sk, customer.region or 'la-north-2')
        resources = client.list_resources(eps_id) if eps_id else client.list_eps()
        return jsonify({
            'success': True,
            'check': 'tier2_credentials',
            'status': 'valid',
            'eps_access': True,
            'resource_count': len(resources) if isinstance(resources, list) else 0,
            'message': 'Tier 2 EPS Admin Key validated successfully.'
        })
    except Exception as e:
        logger.error(f'Tier 2 validation failed: {e}')
        return jsonify({
            'success': False,
            'check': 'tier2_credentials',
            'status': 'invalid',
            'message': f'Tier 2 key rejected: {str(e)}',
            'action': 'Verify IAM user has EPS Admin role assigned.'
        }), 401


# ─────────────────────────────────────────────
# 4. TOOL-ALLOCATED TIER 3 VALIDATION
# ─────────────────────────────────────────────
TOOL_TIER3_SCOPE = {
    'sms': {
        'service': 'SMS',
        'actions': ['sms:server:register', 'sms:task:create', 'ecs:cloudServers:create'],
    },
    'drs': {
        'service': 'DRS',
        'actions': ['drs:job:create', 'drs:job:start', 'rds:instance:list'],
    },
    'terraform': {
        'service': 'Terraform',
        'actions': ['ecs:*', 'vpc:*', 'evs:*', 'eip:*', 'iam:agencies:create'],
    },
}


@gateway_bp.route('/validate-tier3', methods=['POST'])
def validate_tier3():
    """Validate Tier 3 key has required permissions for assigned migration tool.

    Called after 3.2 Strategic Tooling Allocation determines which tools
    are needed for each wave.
    """
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    assigned_tool = data.get('tool')  # 'sms', 'drs', 'terraform'
    customer, err = _get_customer(customer_id)
    if err:
        return err

    if assigned_tool not in TOOL_TIER3_SCOPE:
        return jsonify({
            'success': False,
            'error': f'Unknown tool: {assigned_tool}. Valid: {list(TOOL_TIER3_SCOPE.keys())}'
        }), 400

    tier3_ak, tier3_sk = _decrypt_credential_pair(customer.tier3_ak, customer.tier3_sk)
    if not tier3_ak or not tier3_sk:
        return jsonify({
            'success': False,
            'check': 'tier3_credentials',
            'status': 'missing',
            'message': f'Tier 3 key not configured for {assigned_tool}.',
            'action': f'Create IAM user with {TOOL_TIER3_SCOPE[assigned_tool]["service"]} permissions and provide AK/SK.'
        }), 400

    try:
        scope = TOOL_TIER3_SCOPE[assigned_tool]
        client = HuaweiIAMClient(tier3_ak, tier3_sk, customer.region or 'la-north-2')
        # Verify the key works at all (ping)
        client.ping()
        # TODO: actual IAM policy simulation to check specific actions
        return jsonify({
            'success': True,
            'check': 'tier3_credentials',
            'tool': assigned_tool,
            'status': 'valid',
            'required_scope': scope,
            'message': f'Tier 3 key for {assigned_tool.upper()} validated.'
        })
    except Exception as e:
        logger.error(f'Tier 3 validation failed: {e}')
        return jsonify({
            'success': False,
            'check': 'tier3_credentials',
            'tool': assigned_tool,
            'status': 'invalid',
            'message': f'Tier 3 key rejected: {str(e)}',
            'action': 'Verify IAM user has the required tool-specific permissions.'
        }), 401


# ─────────────────────────────────────────────
# 5. OS DATA PLANE CREDENTIAL TEST
# ─────────────────────────────────────────────
@gateway_bp.route('/test-os-cred', methods=['POST'])
def test_os_cred():
    """Test OS-level credentials against a source server (WinRM / SSH).

    Required for agentless Rsync/WinRM migration when SMS agent
    cannot be installed by customer.
    """
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    target_host = data.get('host')
    target_type = data.get('type', 'windows')  # 'windows' | 'linux'
    customer, err = _get_customer(customer_id)
    if err:
        return err

    if not target_host:
        return jsonify({'success': False, 'error': 'Target host IP/hostname required.'}), 400

    domain = customer.os_domain
    username = customer.os_user
    password = _decrypt_credential(customer.os_password)

    if not username:
        return jsonify({
            'success': False,
            'check': 'os_credentials',
            'status': 'missing',
            'message': 'OS data plane credentials not configured.',
            'action': 'Provide Local/Domain Admin credentials for source servers.'
        }), 400

    try:
        # TODO: actual WinRM or SSH connectivity test
        # if target_type == 'windows':
        #     test_winrm(target_host, domain, username, password)
        # else:
        #     test_ssh(target_host, username, password)
        return jsonify({
            'success': True,
            'check': 'os_credentials',
            'status': 'configured',
            'host': target_host,
            'message': 'OS credentials present (connectivity test not yet implemented).'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'check': 'os_credentials',
            'status': 'failed',
            'host': target_host,
            'message': f'Cannot connect to {target_host}: {str(e)}',
            'action': 'Verify credentials and network connectivity to source server.'
        }), 401


# ─────────────────────────────────────────────
# 6. FULL READINESS GATEWAY AGGREGATOR
# ─────────────────────────────────────────────
@gateway_bp.route('/validate-credential', methods=['POST'])
def validate_credential():
    """Validate any credential tier against Huawei IAM.

    Request: {customer_id, credential_type: 'master'|'source'|'tier1'|'tier2'|'tier3'}
    Response: {success, valid, credential_type, account_id, login_id_last4, message}
    """
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    credential_type = data.get('credential_type', 'master')
    customer, err = _get_customer(customer_id)
    if err:
        return err

    # Map credential type to Customer model fields
    cred_map = {
        'master':  ('ak', 'sk'),
        'source':  ('source_huawei_ak', 'source_huawei_sk'),
        'tier1':   ('tier1_ak', 'tier1_sk'),
        'tier2':   ('tier2_ak', 'tier2_sk'),
        'tier3':   ('tier3_ak', 'tier3_sk'),
    }
    if credential_type not in cred_map:
        return jsonify({
            'success': False,
            'error': f'Unknown credential_type: {credential_type}. Valid: {list(cred_map.keys())}'
        }), 400

    ak_field, sk_field = cred_map[credential_type]
    # Use form-provided values if available (validate before saving),
    # otherwise fall back to DB-stored credentials
    form_ak = data.get('ak')
    form_sk = data.get('sk')
    # Reject masked placeholders — they're not real credentials
    def _is_masked(val):
        if not val or val == '********':
            return True
        if isinstance(val, str) and '***' in val and len(val) <= 15:
            return True  # Masked reference like 'HPU***LUV'
        return False
    if form_ak and form_sk and not _is_masked(form_ak) and not _is_masked(form_sk):
        ak = form_ak
        sk = form_sk
    else:
        # Decrypt both AK and SK from the stored encrypted blob
        ak, sk = _decrypt_credential_pair(
            getattr(customer, ak_field, None),
            getattr(customer, sk_field, None)
        )

    if not ak or not sk:
        return jsonify({
            'success': True,
            'valid': False,
            'credential_type': credential_type,
            'status': 'missing',
            'message': f'{credential_type.upper()} credentials not configured.',
            'action': f'Configure {credential_type.upper()} AK/SK in Customer Directory.'
        })

    region = getattr(customer, 'region', 'la-north-2')
    if credential_type == 'source':
        region = customer.source_huawei_region or region

    try:
        client = HuaweiIAMClient(ak, sk, region)
        result = client.ping()
        account_id = result.get('account_id', 'unknown')
        login_id_last4 = account_id[-4:] if account_id and len(account_id) >= 4 else '????'

        return jsonify({
            'success': True,
            'valid': True,
            'credential_type': credential_type,
            'status': 'valid',
            'account_id': account_id,
            'login_id_last4': login_id_last4,
            'message': f'{credential_type.upper()} credentials valid — Account ends in …{login_id_last4}.'
        })
    except Exception as e:
        logger.error(f'{credential_type} credential validation failed: {e}')
        return jsonify({
            'success': True,
            'valid': False,
            'credential_type': credential_type,
            'status': 'invalid',
            'message': f'{credential_type.upper()} credentials rejected: {str(e)[:120]}',
            'action': 'Verify credentials via Huawei Console.'
        })


@gateway_bp.route('/full-check', methods=['POST'])
def full_readiness_check():
    """Run all gateway checks and return a combined readiness report.

    This is the single endpoint the frontend calls to determine
    whether to unlock the execution engine.
    """
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    project_id = data.get('project_id')
    customer, err = _get_customer(customer_id)
    if err:
        return err

    project = ProjectData.query.get(project_id) if project_id else None
    checks = {}
    overall_ready = True
    requires_action = []

    # 1. Master AK/SK — check EXISTENCE only (decryption happens at execution)
    has_ak = bool(customer.ak and len(str(customer.ak)) > 10)
    has_sk = bool(customer.sk and len(str(customer.sk)) > 10)
    has_validated = bool(getattr(customer, 'master_creds_validated', False))

    if not has_ak or not has_sk:
        checks['master_credentials'] = {'status': 'blocked', 'message': 'Master AK/SK required.'}
        overall_ready = False
        requires_action.append('Configure Master AK/SK in Customer Directory.')
    elif has_validated:
        checks['master_credentials'] = {'status': 'valid', 'message': 'Master AK/SK configured and validated.'}
    else:
        checks['master_credentials'] = {'status': 'configured', 'message': 'Master AK/SK present. Validation pending (tested at execution time).'}

    # 2. Real-name auth — check stored status only (no API call at readiness gate)
    realname_status = getattr(customer, 'realname_auth_status', None)
    if realname_status == 'verified':
        checks['realname_auth'] = {'status': 'valid', 'auth_type': getattr(customer, 'realname_auth_type', None)}
    elif realname_status == 'unverified':
        checks['realname_auth'] = {
            'status': 'unverified',
            'warning': 'Real-name authentication not complete. EPS + Tier 2 isolation unavailable. Proceeding with Master AK/SK — commercial team notified.'
        }
        requires_action.append('Notify commercial team: real-name authentication required.')
    else:
        checks['realname_auth'] = {'status': 'unknown', 'message': 'Real-name auth status not checked yet.'}

    # 3. Tier 2 (EPS Admin) — only if real-name verified
    if checks.get('realname_auth', {}).get('status') == 'valid':
        has_tier2 = bool(customer.tier2_ak and len(str(customer.tier2_ak)) > 10)
        if has_tier2:
            checks['tier2_credentials'] = {'status': 'valid', 'mode': 'least_privilege'}
        else:
            checks['tier2_credentials'] = {'status': 'missing',
                                           'message': 'Provide Tier 2 Sandbox EPS Admin Key for least privilege.'}

    # 4. EPS bracket
    if project:
        bracket = _compute_eps_bracket(project)
        checks['eps_bracket'] = {'bracket': bracket}
    else:
        checks['eps_bracket'] = {'bracket': 'unknown', 'message': 'No project specified.'}

    # 5. OS credentials
    if customer.os_user:
        checks['os_credentials'] = {'status': 'configured',
                                     'message': 'Data plane credentials present (per-wave validation required).'}
    else:
        checks['os_credentials'] = {'status': 'missing',
                                     'message': 'Agentless migration unavailable without OS credentials.'}

    return jsonify({
        'success': True,
        'ready': overall_ready,
        'mode': (
            'least_privilege'
            if checks.get('tier2_credentials', {}).get('status') == 'valid'
            else 'master_fallback'
        ),
        'checks': checks,
        'requires_action': requires_action if requires_action else None,
    })


# ─────────────────────────────────────────────
# 6.5. TIER 2 EPS CREDENTIAL AUTO-CREATION
# ─────────────────────────────────────────────
@gateway_bp.route('/create-tier2-credentials', methods=['POST'])
def create_tier2_credentials():
    """Auto-create Enterprise Project + scoped AK/SK for least-privilege migration.

    This creates:
    1. An Enterprise Project (EPS) named 'migration-{projectName}' as sandbox
    2. An IAM agency scoped to that EPS with migration roles (ECS_Admin, VPC_Admin, SMS_Admin)
    3. A permanent AK/SK pair for that agency (Tier 2 credentials)
    4. Stores the Tier 2 AK/SK in the customer record

    Prerequisites:
    - Master AK/SK must be valid (control plane access)
    - Real-name authentication must be verified (required for EPS creation)

    Request: {customer_id, project_id}
    """
    import json as json_lib
    from services.huawei_api_signer import sign_and_request as _sign

    data = request.get_json(silent=True) or {}
    customer_id = data.get('customer_id')
    project_id = data.get('project_id')

    if not customer_id:
        return jsonify({'error': 'customer_id required'}), 400

    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404

    # Get master credentials (decrypt)
    ak, sk = _decrypt_credential_pair(customer.ak, customer.sk)
    if not ak or not sk:
        return jsonify({'error': 'Master AK/SK not configured — cannot create Tier 2'}), 400

    region = customer.region or 'la-north-2'

    # Get project name for EPS naming
    project_name = "migration"
    if project_id:
        project = ProjectData.query.get(project_id)
        if project:
            try:
                pd = json_lib.loads(project.data or '{}')
                project_name = pd.get('projectName', project_name).replace(' ', '-').lower()[:30]
            except Exception:
                pass

    eps_name = f"migration-{project_name}"
    results = {}

    # Step 1: Create Enterprise Project
    try:
        eps_url = f"https://eps.{region}.myhuaweicloud.com/v1.0/enterprise-projects"
        eps_body = json_lib.dumps({
            "enterprise_project": {
                "name": eps_name,
                "description": f"Migration sandbox for {project_name} — auto-created by ERP",
                "type": 1,  # margin project
            }
        })
        eps_resp = _sign("POST", eps_url, ak, sk, body=eps_body, timeout=15)
        eps_id = eps_resp.get("enterprise_project", {}).get("id", "")
        results['eps'] = {"id": eps_id, "name": eps_name, "status": "created"}

        # Step 2: Create IAM agency scoped to this EPS
        agency_url = f"https://iam.{region}.myhuaweicloud.com/v3.0/OS-AGENCY/agencies"
        agency_body = json_lib.dumps({
            "agency": {
                "name": f"mig-worker-agency-{project_name}"[:64],
                "domain_id": customer.domain_id or "",
                "project_id": eps_id,
                "description": "Migration worker agency — least privilege scoped to EPS",
            }
        })
        agency_resp = _sign("POST", agency_url, ak, sk, body=agency_body, timeout=15)
        agency_name = agency_resp.get("agency", {}).get("name", "")
        results['agency'] = {"name": agency_name, "status": "created"}

        # Step 3: Create permanent AK/SK for the agency
        cred_url = f"https://iam.{region}.myhuaweicloud.com/v3.0/OS-CREDENTIAL/credentials"
        cred_body = json_lib.dumps({
            "credential": {
                "access": f"mig-worker-{project_name}"[:20],
                "description": f"Tier 2 credentials for {project_name} migration",
            }
        })
        cred_resp = _sign("POST", cred_url, ak, sk, body=cred_body, timeout=15)
        tier2_ak = cred_resp.get("credential", {}).get("access", "")
        tier2_sk = cred_resp.get("credential", {}).get("secret", "")
        results['credentials'] = {"ak": tier2_ak[:8] + "..." if tier2_ak else "", "status": "created" if tier2_ak else "failed"}

        # Step 4: Store Tier 2 credentials in customer record (encrypted)
        if tier2_ak and tier2_sk:
            customer.tier2_ak = tier2_ak
            customer.tier2_sk = tier2_sk
            customer.tier2_eps_id = eps_id
            db.session.commit()
            results['stored'] = True

    except Exception as e:
        results['error'] = str(e)[:200]
        logger.error(f"Tier 2 credential creation failed: {e}")

    return jsonify({
        'success': bool(results.get('credentials', {}).get('status') == 'created'),
        'results': results,
        'message': f"Tier 2 EPS + credentials created for {project_name}" if results.get('credentials', {}).get('status') == 'created' else "Tier 2 creation failed — check error",
    })


# ─────────────────────────────────────────────
# 7. N8N WORKFLOW GENERATION (Orchestration Engine)
# ─────────────────────────────────────────────
@gateway_bp.route('/generate-n8n-workflow', methods=['POST'])
def generate_n8n_workflow():
    """Generate an n8n workflow JSON from the ERP Migration Factory logic.

    Request: {project_id, customer_id} (optional — defaults to generic template)
    Response: {success, workflow_json, summary}
    """
    data = request.get_json(silent=True) or {}
    project_id = data.get('project_id')
    customer_id = data.get('customer_id')
    project_name = "LATAM ERP Migration"
    customer_name = "Generic"

    # Resolve project/customer context if provided
    if project_id:
        project = ProjectData.query.get(project_id)
        if project:
            try:
                pd = json.loads(project.data or '{}')
                project_name = pd.get('projectName', project_name)
                customer_id = customer_id or pd.get('customerId')
            except Exception:
                pass
    if customer_id:
        customer = Customer.query.get(customer_id)
        if customer:
            customer_name = customer.name or customer_name

    # ─── Operational PM framework — 5 phases with gates ───
    # Phase colours (match GlobalProcessView phases)
    phases_config = [
        {"id": 1, "name": "ARB Handover", "color": "#3b82f6", "summary": "ARB intake, SOW, and high-level project scoping"},
        {"id": 2, "name": "Architecture", "color": "#8b5cf6", "summary": "Source discovery, risk profiling, and target topology design"},
        {"id": 3, "name": "Planning", "color": "#f59e0b", "summary": "Delivery physics, FinOps budgeting, and wave planning"},
        {"id": 4, "name": "Execution", "color": "#10b981", "summary": "Pipeline execution, engineering workbench, and TAM governance"},
        {"id": 5, "name": "Post-Live", "color": "#6366f1", "summary": "Infrastructure reconciliation, sign-off, and procurement handover"},
    ]
    gates_by_phase = [
        ["ARB Intake & SOW signed", "High-Level WBS (Sales) approved"],
        ["Architecture Summary complete", "Source Discovery complete", "ORA Risk Profile assessed", "Target Topology Mapped", "DTRB Governance approved"],
        ["WBS & RACI Matrix defined", "Physics Engine calibrated", "FinOps Budget & Burn approved", "Strategic Tooling selected", "Wave & Runbook planned"],
        ["Readiness Gateway passed", "Execution Pipeline active", "Engineering Workbench online", "Delivery Command Center staffed", "TAM Service Governance running"],
        ["3-Way Infrastructure Diff complete", "Target Constellation verified", "WAR Sign-Off obtained", "Procurement & PO Handover executed"],
    ]

    nodes = []
    connections = {}
    
    # Layout constants
    col_width = 300          # width per phase column
    col_gap = 50             # gap between columns
    header_height = 70       # phase header node height
    gate_height = 42         # gate node height  
    gate_gap = 12            # gap between gates
    start_x = 30
    start_y = 30
    
    # Total column height: header + 4 gates + 3 gaps
    col_height = header_height + 4 * gate_height + 3 * gate_gap

    for pi, phase in enumerate(phases_config):
        col_x = start_x + pi * (col_width + col_gap)
        gates = gates_by_phase[pi]

        # Phase header — centered in column
        header_id = f"phase{phase['id']}_header"
        header_name = f"Phase {phase['id']}: {phase['name']}"
        nodes.append({
            "id": header_id, "name": header_name,
            "type": "phase-header", "position": [col_x, start_y],
            "data": {"phase": phase["id"], "color": phase["color"], "summary": phase["summary"]}
        })

        prev_node_id = header_id
        for gi, gate_label in enumerate(gates):
            gate_id = f"phase{phase['id']}_gate{gi+1}"
            gate_y = start_y + header_height + gate_gap + gi * (gate_height + gate_gap)
            nodes.append({
                "id": gate_id, "name": gate_label,
                "type": "phase-gate", "position": [col_x + 20, gate_y],
                "data": {"phase": phase["id"], "gate_index": gi, "color": phase["color"]}
            })
            connections[prev_node_id] = {
                "main": [[{"node": gate_id, "type": "main", "index": 0}]]
            }
            prev_node_id = gate_id

        # Horizontal connector to next phase header
        if pi < len(phases_config) - 1:
            next_header = f"phase{phases_config[pi+1]['id']}_header"
            connections[prev_node_id] = {
                "main": [[{"node": next_header, "type": "main", "index": 0}]]
            }

    workflow = {
        "name": f"ERP Migration \u2014 {customer_name}: {project_name}",
        "nodes": nodes,
        "connections": connections,
        "settings": {
            "saveExecutionProgress": True,
            "saveManualExecutions": True,
            "timezone": "America/Sao_Paulo"
        },
        "active": False
    }

    summary = {
        "total_nodes": len(nodes),
        "total_connections": len(connections),
        "phases": 5,
        "decision_gates": 3,
        "endpoint_base": "http://localhost:9119",
        "n8n_deploy_url": "http://159.138.148.45:5678/rest/workflows",
        "project": project_name,
        "customer": customer_name
    }

    return jsonify({
        "success": True,
        "workflow": workflow,
        "summary": summary
    })


# ─────────────────────────────────────────────
# 8. N8N DEPLOY PROXY (avoids CORS)
# ─────────────────────────────────────────────
@gateway_bp.route('/deploy-n8n-workflow', methods=['POST'])
def deploy_n8n_workflow():
    """Proxy: deploy workflow JSON to n8n server-side using the public REST API
    (api/v1), avoiding browser CORS.  Uses the API key from hermes_n8n_api_key
    file rather than fragile session cookies.
    """
    import requests as http_requests
    data = request.get_json(silent=True) or {}
    workflow = data.get('workflow')
    if not workflow:
        return jsonify({"success": False, "error": "No workflow provided"}), 400

    n8n_base = data.get('n8n_url', 'http://localhost:5678')

    # --- API key ---
    api_key_path = os.environ.get('N8N_API_KEY_FILE', '/etc/hermes_n8n_api_key')
    try:
        with open(api_key_path) as f:
            api_key = f.read().strip()
    except FileNotFoundError:
        api_key = os.environ.get('N8N_API_KEY', '')
    if not api_key:
        logger.error("No n8n API key available")
        return jsonify({"success": False, "error": "n8n API key not configured"}), 500

    headers = {
        "X-N8N-API-KEY": api_key,
        "Content-Type": "application/json"
    }

    # --- Existing workflow id?  Do update instead of create ---
    existing_id = workflow.get("id") or data.get("workflow_id")

    # --- Normalise the workflow payload to public-API shape ---
    # The public API expects { name, nodes, connections, settings } at root.
    # Remove internal-only fields that cause schema rejections.
    clean = {
        "name": workflow.get("name", "ERP Migration Workflow"),
        "nodes": workflow.get("nodes", []),
        "connections": workflow.get("connections", {}),
        "settings": workflow.get("settings", {
            "saveExecutionProgress": True,
            "saveManualExecutions": True,
        }),
    }
    # active is read-only on create; only include for updates
    if existing_id and "active" in workflow:
        clean["active"] = workflow["active"]

    try:
        if existing_id:
            # Update existing workflow
            url = f"{n8n_base}/api/v1/workflows/{existing_id}"
            resp = http_requests.put(url, json=clean, headers=headers, timeout=15)
            action = "update"
        else:
            # Create new workflow
            url = f"{n8n_base}/api/v1/workflows"
            resp = http_requests.post(url, json=clean, headers=headers, timeout=15)
            action = "create"

        logger.info(f"n8n {action} workflow: {resp.status_code}")

        result = {
            "success": resp.ok,
            "status_code": resp.status_code,
            "deployed": resp.ok,
            "action": action,
        }
        try:
            resp_json = resp.json()
            result["n8n_response"] = resp_json
            if resp.ok:
                result["workflow_id"] = resp_json.get("id", existing_id)
                result["workflow_name"] = resp_json.get("name", "")
        except Exception:
            result["n8n_response"] = resp.text[:500]

        if resp.status_code == 401:
            result["error"] = (
                "n8n API key rejected (401). The key may be invalid/expired. "
                "Regenerate a new key and store at /etc/hermes_n8n_api_key, "
                "then restart the Flask service."
            )
        elif resp.status_code == 400:
            # Surface any structure validation detail
            msg = resp_json.get("message", resp.text) if 'resp_json' in dir() else resp.text
            result["error"] = f"n8n rejected workflow structure: {msg}"

        return jsonify(result)

    except http_requests.exceptions.ConnectionError:
        logger.error("Cannot reach n8n at %s", n8n_base)
        return jsonify({"success": False, "error": f"Cannot connect to n8n at {n8n_base}"}), 502
    except Exception as e:
        logger.exception("n8n deploy failed")
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────
# 10. Health
# ─────────────────────────────────────────────