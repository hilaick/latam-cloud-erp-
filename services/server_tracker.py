"""Server Migration State Tracker

Manages per-server lifecycle state and step-level status writeback.
Enables surgical resume, selective execution, and target requirements compliance.
"""
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


# ── Server lifecycle states ──
# planned -> running -> agent_installed -> syncing -> synced -> cut_over -> completed
# planned -> failed (at failed_step_id)
# planned -> skipped
SERVER_LIFECYCLE = {
    'planned':         {'next': ['running', 'skipped'], 'label': 'Planned', 'color': 'slate'},
    'running':         {'next': ['agent_installed', 'syncing', 'failed'], 'label': 'Running', 'color': 'blue'},
    'agent_installed': {'next': ['syncing', 'failed'], 'label': 'Agent Installed', 'color': 'amber'},
    'syncing':         {'next': ['synced', 'failed'], 'label': 'Syncing', 'color': 'indigo'},
    'synced':          {'next': ['cut_over', 'failed'], 'label': 'Synced', 'color': 'emerald'},
    'cut_over':        {'next': ['completed', 'failed'], 'label': 'Cut Over', 'color': 'violet'},
    'completed':       {'next': [], 'label': 'Completed', 'color': 'green'},
    'failed':          {'next': ['running', 'planned'], 'label': 'Failed', 'color': 'red'},
    'skipped':         {'next': ['planned'], 'label': 'Skipped', 'color': 'gray'},
}

# Map step actions to server lifecycle transitions
ACTION_LIFECYCLE_MAP = {
    'CREATE_TARGET_ECS':       'running',
    'SMS_AGENT_INSTALL':       'agent_installed',
    'SMS_TASK_CREATE':         'syncing',
    'SMS_TASK_START':          'syncing',
    'SMS_SUBTASK_MONITOR':     'syncing',
    'SMS_CONTINUOUS_SYNC_READY': 'synced',
    'SMS_CUTOVER_TARGET_TEST': 'cut_over',
    'SMS_CUTOVER_INCREMENTAL_SYNC': 'cut_over',
    'SMS_CUTOVER_PROMOTE':     'completed',
}


def get_server_name_from_step(step):
    """Extract the server name from a step's target_resource field.

    Server-specific steps have target_resource like 'ecs-49be-e903-20d3-12d0-0001'.
    Global steps have 'all', 'account', or infrastructure names.
    """
    tr = step.get('target_resource', '')
    if not tr or tr in ('all', 'account', 'unknown') or tr.startswith('erp-migration-'):
        return None
    if tr.startswith(('subnet-', 'vpc-', 'enterprise-project:')):
        return None
    return tr


def is_server_step(step):
    """Check if a step belongs to a specific server (vs global/infrastructure)."""
    return get_server_name_from_step(step) is not None


def init_server_states(project_id, execution_state_id,
                       execution_plan, execution_context,
                       db_module):
    """Initialize ServerMigrationState rows from the execution plan.

    Called after build_plan to create per-server tracking rows.
    Idempotent - skips servers that already have rows.

    Returns: number of new rows created.
    """
    from models import ServerMigrationState

    steps = execution_plan.get('steps', [])
    source_servers = execution_context.get('source_servers', [])

    # Collect unique server names from steps
    server_names = set()
    for step in steps:
        name = get_server_name_from_step(step)
        if name:
            server_names.add(name)

    # Also add from source_servers if not already covered
    for srv in source_servers:
        name = srv.get('name', '')
        if name and name not in server_names:
            server_names.add(name)

    created = 0
    for name in sorted(server_names):
        existing = ServerMigrationState.query.filter_by(
            project_id=project_id, source_server_name=name
        ).first()
        if existing:
            continue

        # Find matching source_server_id
        src_id = ''
        for srv in source_servers:
            if srv.get('name') == name:
                src_id = srv.get('id', srv.get('sms_id', ''))
                break

        state = ServerMigrationState(
            execution_state_id=execution_state_id,
            project_id=project_id,
            source_server_id=src_id,
            source_server_name=name,
            status='planned',
        )
        db_module.session.add(state)
        created += 1

    if created:
        db_module.session.commit()
        logger.info(f"[server_tracker] Initialized {created} server states for project {project_id}")

    return created


def update_step_status(project_id, step_entry, execution_plan,
                       db_module):
    """Write step-level status back to the executionPlan in project JSON.

    Called after each step executes (success or failure).
    Also updates ServerMigrationState if the step belongs to a server.
    """
    from models import ServerMigrationState

    step_id = step_entry.get('step_id')
    status = step_entry.get('status', 'unknown')
    server_name = None

    plan = execution_plan
    if not plan:
        return

    for step in (plan.get('steps') or []):
        if step.get('step_id') == step_id:
            step['status'] = status
            step['status_updated_at'] = datetime.utcnow().isoformat()
            if status == 'success':
                step['completed_at'] = datetime.utcnow().isoformat()
            elif status == 'failed':
                step['failed_at'] = datetime.utcnow().isoformat()
                results = step_entry.get('results', [{}])
                step['error_message'] = results[-1].get('error', '') if results else ''
            server_name = get_server_name_from_step(step)
            break

    # Update ServerMigrationState if this is a server step
    if server_name and status == 'success':
        srv_state = ServerMigrationState.query.filter_by(
            project_id=project_id, source_server_name=server_name
        ).first()
        if srv_state:
            action = step_entry.get('action', '')
            new_status = ACTION_LIFECYCLE_MAP.get(action)
            if new_status:
                current_info = SERVER_LIFECYCLE.get(srv_state.status, {})
                allowed_next = current_info.get('next', [])
                if new_status in allowed_next or srv_state.status in ('failed', 'planned'):
                    srv_state.status = new_status
                    srv_state.current_step_id = step_id
                    srv_state.updated_at = datetime.utcnow()
                    if new_status == 'completed':
                        srv_state.completed_at = datetime.utcnow()
                    if not srv_state.started_at:
                        srv_state.started_at = datetime.utcnow()
                    db_module.session.commit()
    elif server_name and status == 'failed':
        srv_state = ServerMigrationState.query.filter_by(
            project_id=project_id, source_server_name=server_name
        ).first()
        if srv_state:
            srv_state.status = 'failed'
            srv_state.failed_step_id = step_id
            results = step_entry.get('results', [{}])
            srv_state.error_message = results[-1].get('error', 'Unknown error') if results else 'Unknown error'
            srv_state.updated_at = datetime.utcnow()
            db_module.session.commit()


def update_server_from_step(project_id, step, step_result, db_module):
    """Convenience: update both step status and server state from a run_step result.

    Args:
        project_id: project ID
        step: the original step dict from the plan
        step_result: the result dict from run_step()
        db_module: Flask db object
    """
    server_name = get_server_name_from_step(step)
    if not server_name:
        return

    from models import ServerMigrationState
    srv = ServerMigrationState.query.filter_by(
        project_id=project_id, source_server_name=server_name
    ).first()
    if not srv:
        return

    status = step_result.get('status', 'unknown')
    action = step.get('action', '')

    if status == 'success':
        new_status = ACTION_LIFECYCLE_MAP.get(action)
        if new_status:
            current_info = SERVER_LIFECYCLE.get(srv.status, {})
            allowed_next = current_info.get('next', [])
            if new_status in allowed_next or srv.status in ('failed', 'planned'):
                srv.status = new_status
                srv.current_step_id = step.get('step_id')
                srv.updated_at = datetime.utcnow()
                if new_status == 'completed':
                    srv.completed_at = datetime.utcnow()
                if not srv.started_at:
                    srv.started_at = datetime.utcnow()
                db_module.session.commit()

        # Track target ECS ID from CREATE_TARGET_ECS
        if action == 'CREATE_TARGET_ECS':
            results = step_result.get('results', [])
            for r in results:
                out = r.get('output', '')
                import re
                id_m = re.search(r'"id"\s*:\s*"([0-9a-f-]{36})"', out)
                if id_m:
                    srv.target_ecs_id = id_m.group(1)
                    db_module.session.commit()
                name_m = re.search(r'"name"\s*:\s*"([^"]+)"', out)
                if name_m:
                    srv.target_ecs_name = name_m.group(1)
                    db_module.session.commit()

        # Track SMS task ID
        if action in ('SMS_TASK_CREATE',):
            results = step_result.get('results', [])
            for r in results:
                out = r.get('output', '')
                import re
                id_m = re.search(r'"id"\s*:\s*"([0-9a-f-]{36})"', out)
                if id_m:
                    srv.sms_task_id = id_m.group(1)
                    db_module.session.commit()

    elif status == 'failed':
        srv.status = 'failed'
        srv.failed_step_id = step.get('step_id')
        results = step_result.get('results', [{}])
        srv.error_message = results[-1].get('error', 'Unknown error') if results else 'Unknown error'
        srv.updated_at = datetime.utcnow()
        db_module.session.commit()


def mark_server_failed(project_id, server_name, step_id, error, db_module):
    """Mark a server as failed at a specific step."""
    from models import ServerMigrationState
    srv = ServerMigrationState.query.filter_by(
        project_id=project_id, source_server_name=server_name
    ).first()
    if srv:
        srv.status = 'failed'
        srv.failed_step_id = step_id
        srv.error_message = error
        srv.updated_at = datetime.utcnow()
        db_module.session.commit()


def reset_server_for_resume(project_id, server_name, from_step_id, db_module):
    """Reset a server's state for resume from a specific step."""
    from models import ServerMigrationState
    srv = ServerMigrationState.query.filter_by(
        project_id=project_id, source_server_name=server_name
    ).first()
    if srv:
        srv.status = 'planned'
        srv.failed_step_id = None
        srv.error_message = None
        srv.current_step_id = from_step_id
        srv.updated_at = datetime.utcnow()
        db_module.session.commit()


def skip_server(project_id, server_name, db_module):
    """Mark a server as skipped."""
    from models import ServerMigrationState
    srv = ServerMigrationState.query.filter_by(
        project_id=project_id, source_server_name=server_name
    ).first()
    if srv:
        srv.status = 'skipped'
        srv.updated_at = datetime.utcnow()
        db_module.session.commit()


def get_server_states(project_id):
    """Get all server states for a project (for API/frontend)."""
    from models import ServerMigrationState
    states = ServerMigrationState.query.filter_by(project_id=project_id).all()
    return [s.to_dict() for s in states]


def get_servers_by_status(project_id, status):
    """Get server names matching a status."""
    from models import ServerMigrationState
    states = ServerMigrationState.query.filter_by(
        project_id=project_id, status=status
    ).all()
    return [s.source_server_name for s in states]


def validate_target_requirements(source_flavor, resolved_flavor,
                                  flavor_source, target_region,
                                  source_vcpus=0, source_ram_mb=0,
                                  required_min_vcpus=0,
                                  required_min_ram_mb=0):
    """Validate that the resolved target flavor meets requirements.

    Returns: {
        'compliant': bool,
        'flavor': str,
        'flavor_source': str,
        'issues': list[str],
        'checks': dict
    }
    """
    issues = []
    checks = {}

    # Check 1: No placeholder leak-through
    if resolved_flavor in ('<DISCOVERED_FLAVOR>', '<FLAVOR_REF>', ''):
        issues.append(f"Flavor not resolved - placeholder '{resolved_flavor}' will fail at runtime")
        checks['flavor_resolved'] = False
    else:
        checks['flavor_resolved'] = True

    # Check 2: Minimum vCPU requirement
    if required_min_vcpus > 0:
        flavor_vcpus = _estimate_vcpus_from_flavor(resolved_flavor)
        checks['min_vcpus'] = {
            'required': required_min_vcpus,
            'actual': flavor_vcpus,
            'met': flavor_vcpus >= required_min_vcpus
        }
        if flavor_vcpus < required_min_vcpus:
            issues.append(f"vCPU: {flavor_vcpus} < required {required_min_vcpus}")

    # Check 3: Minimum RAM requirement
    if required_min_ram_mb > 0:
        flavor_ram = _estimate_ram_from_flavor(resolved_flavor)
        checks['min_ram_mb'] = {
            'required': required_min_ram_mb,
            'actual': flavor_ram,
            'met': flavor_ram >= required_min_ram_mb
        }
        if flavor_ram < required_min_ram_mb:
            issues.append(f"RAM: {flavor_ram}MB < required {required_min_ram_mb}MB")

    # Check 4: Flavor match quality
    if flavor_source != 'exact':
        checks['flavor_match'] = {
            'source': source_flavor,
            'resolved': resolved_flavor,
            'exact': flavor_source == 'exact'
        }
        if flavor_source == 'placeholder':
            issues.append(f"Flavor is placeholder - source '{source_flavor}' not available in {target_region}")

    compliant = len(issues) == 0
    return {
        'compliant': compliant,
        'flavor': resolved_flavor,
        'flavor_source': flavor_source,
        'issues': issues,
        'checks': checks,
    }


def _estimate_vcpus_from_flavor(flavor_name):
    """Rough vCPU estimate from Huawei flavor naming conventions.

    t6.large.1 -> 2, t6.xlarge.1 -> 4, t6.2xlarge.1 -> 8
    s6.large.2 -> 2, s6.xlarge.2 -> 4, s6.2xlarge.2 -> 8
    c6.large.2 -> 2, c6.xlarge.2 -> 4, c6.2xlarge.2 -> 8
    """
    if not flavor_name or '.' not in flavor_name:
        return 0
    parts = flavor_name.lower().split('.')
    if len(parts) < 2:
        return 0
    name = parts[1]
    vcpu_map = {
        'micro': 1, 'small': 1, 'medium': 1,
        'large': 2, 'xlarge': 4, '2xlarge': 8,
        '3xlarge': 12, '4xlarge': 16,
    }
    return vcpu_map.get(name, 0)


def _estimate_ram_from_flavor(flavor_name):
    """Rough RAM estimate in MB from Huawei flavor naming.

    General-purpose (t6): 2GB per vCPU
    Compute-optimized (c6): 1GB per vCPU
    Memory-optimized (m6): 4GB per vCPU
    """
    if not flavor_name or '.' not in flavor_name:
        return 0
    parts = flavor_name.lower().split('.')
    vcpus = _estimate_vcpus_from_flavor(flavor_name)
    family = parts[0] if parts else ''
    if family.startswith('c'):
        return vcpus * 1024
    elif family.startswith('m'):
        return vcpus * 4096
    else:  # t, s, general
        return vcpus * 2048
