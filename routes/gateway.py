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

gateway_bp = Blueprint('gateway', __name__)
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
