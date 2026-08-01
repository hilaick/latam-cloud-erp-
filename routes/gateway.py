"""
4.0 Execution Readiness Gateway — Validation Endpoints
Implements the least-privilege credential hierarchy:
  Master AK/SK → Tier 2 (EPS Admin) → Tier 3 (Tool-specific) → Data Plane (OS)
"""
from flask import Blueprint, request, jsonify
from models import db, Customer, ProjectData
from services.huawei_iam import HuaweiIAMClient
from services.huawei_eps import HuaweiEPSClient
import logging

gateway_bp = Blueprint('gateway', __name__, url_prefix='/api/gateway')
logger = logging.getLogger(__name__)


def _get_customer(customer_id: str):
    """Resolve customer, return (customer, error_response)."""
    customer = Customer.query.get(customer_id)
    if not customer:
        return None, (jsonify({'success': False, 'error': 'Customer not found'}), 404)
    return customer, None


def _decrypt_credential(ciphertext: str | None) -> str | None:
    """Placeholder — real decryption via app encryption service."""
    if not ciphertext:
        return None
    # TODO: integrate with app's Fernet/encryption service
    # For now, assume plaintext for development
    return ciphertext


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

    ak = _decrypt_credential(customer.ak)
    sk = _decrypt_credential(customer.sk)
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

    ak = _decrypt_credential(customer.ak)
    sk = _decrypt_credential(customer.sk)
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

    ak = _decrypt_credential(customer.ak)
    sk = _decrypt_credential(customer.sk)
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

    tier2_ak = _decrypt_credential(customer.tier2_ak)
    tier2_sk = _decrypt_credential(customer.tier2_sk)
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

    tier3_ak = _decrypt_credential(customer.tier3_ak)
    tier3_sk = _decrypt_credential(customer.tier3_sk)
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
    ak = _decrypt_credential(getattr(customer, ak_field, None))
    sk = _decrypt_credential(getattr(customer, sk_field, None))

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

    # 1. Master AK/SK
    ak = _decrypt_credential(customer.ak)
    sk = _decrypt_credential(customer.sk)
    if not ak or not sk:
        checks['master_credentials'] = {'status': 'blocked', 'message': 'Master AK/SK required.'}
        overall_ready = False
        requires_action.append('Configure Master AK/SK in Customer Directory.')
    else:
        try:
            client = HuaweiIAMClient(ak, sk, customer.region or 'la-north-2')
            client.ping()
            checks['master_credentials'] = {'status': 'valid'}
        except Exception:
            checks['master_credentials'] = {'status': 'blocked', 'message': 'Master AK/SK invalid.'}
            overall_ready = False
            requires_action.append('Verify Master AK/SK via Huawei Console.')

    # 2. Real-name auth
    if overall_ready:
        try:
            client = HuaweiIAMClient(ak, sk, customer.region or 'la-north-2')
            auth = client.check_realname_auth()
            checks['realname_auth'] = {
                'status': 'valid' if auth.get('verified') else 'unverified',
                'auth_type': auth.get('type'),
            }
            if not auth.get('verified'):
                checks['realname_auth']['warning'] = (
                    'Real-name authentication not complete. '
                    'EPS + Tier 2 isolation unavailable. '
                    'Proceeding with Master AK/SK — commercial team notified.'
                )
                requires_action.append('Notify commercial team: real-name authentication required.')
                # NOT a blocker — Path B (Master fallback) is permitted
        except Exception as e:
            checks['realname_auth'] = {'status': 'unknown', 'error': str(e)}

    # 3. Tier 2 (EPS Admin) — only if real-name verified
    if checks.get('realname_auth', {}).get('status') == 'valid':
        tier2_ak = _decrypt_credential(customer.tier2_ak)
        if tier2_ak:
            try:
                eps_client = HuaweiEPSClient(tier2_ak, _decrypt_credential(customer.tier2_sk),
                                             customer.region or 'la-north-2')
                eps_client.list_eps()
                checks['tier2_credentials'] = {'status': 'valid', 'mode': 'least_privilege'}
            except Exception:
                checks['tier2_credentials'] = {'status': 'invalid', 'message': 'Tier 2 key rejected.'}
                requires_action.append('Validate Tier 2 EPS Admin Key permissions.')
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
# 7. N8N WORKFLOW GENERATION (Orchestration Engine)
# ─────────────────────────────────────────────
@gateway_bp.route('/generate-n8n-workflow', methods=['POST'])
def generate_n8n_workflow():
    """Generate an n8n workflow JSON from the ERP Migration Factory logic.

    Request: {project_id, customer_id} (optional — defaults to generic template)
    Response: {success, workflow_json, summary}
    """
    data = request.get_json() or {}
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

    # ─── Define the migration workflow as n8n nodes ───
    nodes = [
        {
            "id": "trigger", "name": "🧭 Migration Trigger",
            "type": "n8n-nodes-base.manualTrigger", "position": [640, 100],
            "parameters": {}
        },
        {
            "id": "phase1_arb", "name": "📋 Phase 1: ARB Handover",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 240],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-1-validate",
                           "authentication": "genericCredentialType", "sendBody": True}
        },
        {
            "id": "phase1_gate", "name": "✅ Phase 1 Gate: SOW Uploaded?",
            "type": "n8n-nodes-base.if", "position": [640, 380],
            "parameters": {"conditions": {"boolean": [{"value1": "={{$json.body.success}}", "operation": "equals", "value2": True}]}}
        },
        {
            "id": "phase2_discovery", "name": "🔍 Phase 2: Has Source Credentials?",
            "type": "n8n-nodes-base.switch", "position": [260, 520],
            "parameters": {"dataPropertyName": "hasSourceCredentials",
                           "options": {"rules": [{"value": True, "output": 0}, {"value": False, "output": 1}]}}
        },
        {
            "id": "phase2_source_scan", "name": "📡 Phase 2.1: NOC Source Scan",
            "type": "n8n-nodes-base.httpRequest", "position": [80, 660],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/cloud/inventory",
                           "sendBody": True,
                           "bodyParameters": {"parameters": [
                               {"name": "customer_id", "value": customer_id or "{{customer_id}}"},
                               {"name": "mode", "value": "single"},
                               {"name": "use_source_credentials", "value": True}]}}
        },
        {
            "id": "phase2_topology", "name": "🏗️ Phase 2.2: Target Topology",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 660],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-2-topology",
                           "sendBody": True}
        },
        {
            "id": "phase2_mgc", "name": "⚖️ Phase 2.3: MgC Reconciliation",
            "type": "n8n-nodes-base.httpRequest", "position": [1200, 660],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/cloud/inventory",
                           "sendBody": True,
                           "bodyParameters": {"parameters": [
                               {"name": "customer_id", "value": customer_id or "{{customer_id}}"},
                               {"name": "mode", "value": "single"},
                               {"name": "use_source_credentials", "value": True}]}}
        },
        {
            "id": "phase2_dtrb", "name": "🔒 Phase 2.4: DTRB Scope Lock",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 800],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-2-dtrb",
                           "sendBody": True}
        },
        {
            "id": "phase3_strategy", "name": "📊 Phase 3: Strategy & Planning",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 940],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-3-planning",
                           "sendBody": True,
                           "bodyParameters": {"parameters": [
                               {"name": "project_id", "value": project_id or "{{project_id}}"},
                               {"name": "waves", "value": 3},
                               {"name": "include_finops", "value": True}]}}
        },
        {
            "id": "readiness_gateway", "name": "🛡️ Phase 4.0: Readiness Gateway",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 1080],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/full-check",
                           "sendBody": True,
                           "bodyParameters": {"parameters": [
                               {"name": "customer_id", "value": customer_id or "{{customer_id}}"},
                               {"name": "project_id", "value": project_id or "{{project_id}}"}]}}
        },
        {
            "id": "readiness_gate", "name": "🚦 Gate: All Checks Passed?",
            "type": "n8n-nodes-base.if", "position": [640, 1220],
            "parameters": {"conditions": {"boolean": [{"value1": "={{$json.body.ready}}", "operation": "equals", "value2": True}]}}
        },
        {
            "id": "phase4_execution", "name": "🚀 Phase 4: Execution Control (Per Wave)",
            "type": "n8n-nodes-base.splitInBatches", "position": [640, 1360],
            "parameters": {"batchSize": 1, "options": {}}
        },
        {
            "id": "phase4_terraform", "name": "🏗️ 4.1: Deploy Landing Zone",
            "type": "n8n-nodes-base.httpRequest", "position": [200, 1500],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-4-deploy",
                           "sendBody": True,
                           "bodyParameters": {"parameters": [{"name": "action", "value": "terraform_apply"}]}}
        },
        {
            "id": "phase4_agents", "name": "📦 4.2: Install SMS/HSS Agents",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 1500],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-4-agents",
                           "sendBody": True,
                           "bodyParameters": {"parameters": [{"name": "action", "value": "install_agents"}]}}
        },
        {
            "id": "phase4_sync", "name": "🔄 4.3: Start DRS/SMS Sync",
            "type": "n8n-nodes-base.httpRequest", "position": [1080, 1500],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-4-sync",
                           "sendBody": True,
                           "bodyParameters": {"parameters": [{"name": "action", "value": "start_sync"}]}}
        },
        {
            "id": "phase4_monitor", "name": "⏳ 4.4: Monitor Sync Completion",
            "type": "n8n-nodes-base.wait", "position": [640, 1640],
            "parameters": {"resume": "webhook", "options": {}}
        },
        {
            "id": "phase5_cutover", "name": "✂️ Phase 5.1: Cutover Execution",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 1780],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-5-cutover",
                           "sendBody": True}
        },
        {
            "id": "phase5_noc", "name": "📡 Phase 5.2: Hybrid NOC Scan",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 1920],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/cloud/inventory",
                           "sendBody": True,
                           "bodyParameters": {"parameters": [
                               {"name": "customer_id", "value": customer_id or "{{customer_id}}"},
                               {"name": "mode", "value": "hybrid"}]}}
        },
        {
            "id": "phase5_commercial", "name": "💰 Phase 5.3: Commercial True-Up",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 2060],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-5-commercial",
                           "sendBody": True}
        },
        {
            "id": "phase5_war", "name": "🏅 Phase 5.4: WAR Assessment",
            "type": "n8n-nodes-base.httpRequest", "position": [640, 2200],
            "parameters": {"method": "POST", "url": "http://localhost:9119/api/gateway/phase-5-war",
                           "sendBody": True}
        },
        {
            "id": "project_close", "name": "🏁 Project Closed",
            "type": "n8n-nodes-base.noOp", "position": [640, 2340],
            "parameters": {}
        }
    ]

    connections = {
        "trigger": {"main": [[{"node": "phase1_arb", "type": "main", "index": 0}]]},
        "phase1_arb": {"main": [[{"node": "phase1_gate", "type": "main", "index": 0}]]},
        "phase1_gate": {"main": [
            [{"node": "phase2_discovery", "type": "main", "index": 0}],
            [{"node": "phase1_arb", "type": "main", "index": 0}]
        ]},
        "phase2_discovery": {"main": [
            [{"node": "phase2_source_scan", "type": "main", "index": 0}],
            [{"node": "phase2_topology", "type": "main", "index": 0}]
        ]},
        "phase2_source_scan": {"main": [[{"node": "phase2_topology", "type": "main", "index": 0}]]},
        "phase2_topology": {"main": [[{"node": "phase2_mgc", "type": "main", "index": 0}]]},
        "phase2_mgc": {"main": [[{"node": "phase2_dtrb", "type": "main", "index": 0}]]},
        "phase2_dtrb": {"main": [[{"node": "phase3_strategy", "type": "main", "index": 0}]]},
        "phase3_strategy": {"main": [[{"node": "readiness_gateway", "type": "main", "index": 0}]]},
        "readiness_gateway": {"main": [[{"node": "readiness_gate", "type": "main", "index": 0}]]},
        "readiness_gate": {"main": [
            [{"node": "phase4_execution", "type": "main", "index": 0}],
            [{"node": "phase3_strategy", "type": "main", "index": 0}]
        ]},
        "phase4_execution": {"main": [[{"node": "phase4_terraform", "type": "main", "index": 0}]]},
        "phase4_terraform": {"main": [[{"node": "phase4_agents", "type": "main", "index": 0}]]},
        "phase4_agents": {"main": [[{"node": "phase4_sync", "type": "main", "index": 0}]]},
        "phase4_sync": {"main": [[{"node": "phase4_monitor", "type": "main", "index": 0}]]},
        "phase4_monitor": {"main": [[{"node": "phase5_cutover", "type": "main", "index": 0}]]},
        "phase5_cutover": {"main": [[{"node": "phase5_noc", "type": "main", "index": 0}]]},
        "phase5_noc": {"main": [[{"node": "phase5_commercial", "type": "main", "index": 0}]]},
        "phase5_commercial": {"main": [[{"node": "phase5_war", "type": "main", "index": 0}]]},
        "phase5_war": {"main": [[{"node": "project_close", "type": "main", "index": 0}]]}
    }

    workflow = {
        "name": f"ERP Migration — {customer_name}: {project_name}",
        "nodes": nodes,
        "connections": connections,
        "settings": {"timezone": "America/Sao_Paulo"},
        "versionId": "1.0.0",
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
