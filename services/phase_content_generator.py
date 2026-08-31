"""
Dynamic phase content generator — builds phase labels, descriptions, and
agent goals from the project's execution plan instead of hardcoding them.

The 7-phase framework stays universal:
  4.1 Network, 4.2 Source Prep, 4.3 Target, 4.4 Data Sync,
  4.5 Monitor, 4.6 Cutover, 4.7 Teardown

But the content of each phase is generated from the actual actions in
the execution plan (SMS, DRS, OMS, RDS, ECS, HSS, WAF, etc.)
"""

import json
from collections import defaultdict

# Action → human-readable label mapping
ACTION_LABELS = {
    'CREDENTIAL_VALIDATION': 'credential validation',
    'PROJECT_ID_DISCOVERY': 'project ID discovery',
    'MIG_WORKER_DEPLOY': 'mig_worker deployment',
    'MIGRATION_PROJECT_CONFIG': 'SMS migration project config',
    'CREATE_VPC': 'VPC + subnets',
    'CREATE_SG': 'security groups',
    'CREATE_EIP': 'EIPs',
    'ADD_SG_RULES_SMS': 'SMS security group rules',
    'ECS_QUOTA': 'ECS quota check',
    'EVS_QUOTA': 'EVS quota check',
    'VPC_QUOTA': 'VPC quota check',
    'CREATE_TARGET_ECS': 'target ECS instances',
    'CREATE_TARGET_RDS': 'target RDS databases',
    'CREATE_TARGET_OBS': 'target OBS buckets',
    'PROVISION_HSS': 'HSS (Host Security)',
    'PROVISION_WAF': 'WAF (Web Application Firewall)',
    'SMS_AGENT_INSTALL': 'SMS agent installation',
    'SMS_TASK_CREATE': 'SMS migration tasks',
    'SMS_SUBTASK_MONITOR': 'SMS sync monitoring',
    'DRS_JOB_CREATE': 'DRS replication jobs',
    'DRS_START_SYNC': 'DRS sync start',
    'OMS_SYNC_START': 'OMS object storage sync',
    'SMOKE_TESTS': 'smoke tests',
}

# Phase → default label/icon
PHASE_DEFAULTS = {
    'PHASE_4_0': {'label': 'Readiness', 'icon': 'fa-shield-check', 'color': '#64748b'},
    'PHASE_4_1': {'label': 'Network', 'icon': 'fa-network-wired', 'color': '#3b82f6'},
    'PHASE_4_2': {'label': 'Source Prep', 'icon': 'fa-download', 'color': '#f59e0b'},
    'PHASE_4_3': {'label': 'Target', 'icon': 'fa-server', 'color': '#8b5cf6'},
    'PHASE_4_4': {'label': 'Data Sync', 'icon': 'fa-sync-alt', 'color': '#10b981'},
    'PHASE_4_5': {'label': 'Monitor', 'icon': 'fa-chart-line', 'color': '#06b6d4'},
    'PHASE_4_6': {'label': 'Cutover', 'icon': 'fa-exchange-alt', 'color': '#ef4444'},
    'PHASE_4_7': {'label': 'Teardown', 'icon': 'fa-trash-alt', 'color': '#84cc16'},
}


def generate_phase_content(execution_plan):
    """Generate dynamic phase labels, descriptions, and goals from the execution plan.

    Args:
        execution_plan: dict with 'steps' list, each step has 'phase', 'action', 'target_resource', 'tool_source'

    Returns:
        dict mapping PHASE_4_X → {label, icon, color, desc, goal, actions, resource_count}
    """
    if not execution_plan or not isinstance(execution_plan, dict):
        return None

    steps = execution_plan.get('steps', [])
    if not steps:
        return None

    # Group actions by phase
    phase_actions = defaultdict(list)
    phase_resources = defaultdict(set)
    phase_tools = defaultdict(set)

    for step in steps:
        phase = step.get('phase', 'PHASE_4_0')
        action = step.get('action', '')
        resource = step.get('target_resource', '')
        tool = step.get('tool_source', '')

        if action:
            phase_actions[phase].append(action)
        if resource:
            phase_resources[phase].add(resource)
        if tool:
            phase_tools[phase].add(tool)

    # Build content for each phase
    result = {}
    for phase_key in ['PHASE_4_1', 'PHASE_4_2', 'PHASE_4_3', 'PHASE_4_4', 'PHASE_4_5', 'PHASE_4_6', 'PHASE_4_7']:
        defaults = PHASE_DEFAULTS.get(phase_key, {})
        actions = phase_actions.get(phase_key, [])
        resources = phase_resources.get(phase_key, set())
        tools = phase_tools.get(phase_key, set())

        if not actions:
            # No actions in this phase — use minimal default
            result[phase_key] = {
                'label': defaults.get('label', phase_key),
                'icon': defaults.get('icon', 'fa-circle'),
                'color': defaults.get('color', '#64748b'),
                'desc': f'No specific actions planned for this phase.',
                'goal': f'Execute phase {phase_key.replace("PHASE_4_", "4.")}.',
                'actions': [],
                'resource_count': 0,
            }
            continue

        # Generate human-readable action list
        action_labels = []
        for a in sorted(set(actions)):
            label = ACTION_LABELS.get(a, a.lower().replace('_', ' '))
            action_labels.append(label)

        # Build description
        unique_actions = sorted(set(actions))
        has_sms = any('SMS' in a for a in unique_actions)
        has_drs = any('DRS' in a for a in unique_actions)
        has_oms = any('OMS' in a for a in unique_actions)
        has_rds = any('RDS' in a for a in unique_actions)
        has_ecs = any('ECS' in a for a in unique_actions)
        has_hss = any('HSS' in a for a in unique_actions)
        has_waf = any('WAF' in a for a in unique_actions)

        # Phase-specific descriptions
        if phase_key == 'PHASE_4_1':
            parts = []
            if 'CREATE_VPC' in unique_actions: parts.append('VPC, subnets')
            if 'CREATE_SG' in unique_actions: parts.append('security groups')
            if 'CREATE_EIP' in unique_actions: parts.append(f'{len([a for a in actions if a == "CREATE_EIP"])} EIPs')
            if has_hss: parts.append('HSS')
            if has_waf: parts.append('WAF')
            if 'ADD_SG_RULES_SMS' in unique_actions: parts.append('SMS ingress rules')
            desc = f"Provision: {', '.join(parts)}." if parts else "Network fabric setup."
            goal = f"Provision the Wave 0 network fabric: {', '.join(parts)}. Confirm all prerequisites for the migration landing zone."

        elif phase_key == 'PHASE_4_2':
            parts = []
            if 'SMS_AGENT_INSTALL' in unique_actions: parts.append('SMS agents on source servers')
            if 'CREDENTIAL_VALIDATION' in unique_actions: parts.append('credential validation')
            if 'MIGRATION_PROJECT_CONFIG' in unique_actions: parts.append('SMS migration project config')
            if 'MIG_WORKER_DEPLOY' in unique_actions: parts.append('mig_worker deployment')
            quota_parts = [a.replace('_QUOTA', '').lower() for a in unique_actions if 'QUOTA' in a]
            if quota_parts: parts.append(f"quota checks ({', '.join(quota_parts)})")
            desc = f"Source preparation: {', '.join(parts)}." if parts else "OS pre-flight and agent setup."
            goal = f"Run source preparation: {', '.join(parts)}. Verify agents are connected and healthy."

        elif phase_key == 'PHASE_4_3':
            parts = []
            if has_ecs: parts.append(f'{len([a for a in actions if a == "CREATE_TARGET_ECS"])} ECS instances')
            if has_rds: parts.append(f'{len([a for a in actions if a == "CREATE_TARGET_RDS"])} RDS databases')
            if 'CREATE_TARGET_OBS' in unique_actions: parts.append(f'{len([a for a in actions if a == "CREATE_TARGET_OBS"])} OBS buckets')
            desc = f"Build target: {', '.join(parts)}." if parts else "Provision target infrastructure."
            goal = f"Provision the application landing zone: {', '.join(parts)}. Confirm infrastructure matches the approved Target Architecture."

        elif phase_key == 'PHASE_4_4':
            parts = []
            if 'SMS_TASK_CREATE' in unique_actions: parts.append(f'{len([a for a in actions if a == "SMS_TASK_CREATE"])} SMS migration tasks')
            if 'DRS_JOB_CREATE' in unique_actions: parts.append(f'{len([a for a in actions if a == "DRS_JOB_CREATE"])} DRS replication jobs')
            if 'DRS_START_SYNC' in unique_actions: parts.append('start DRS sync')
            if 'OMS_SYNC_START' in unique_actions: parts.append(f'{len([a for a in actions if a == "OMS_SYNC_START"])} OMS storage syncs')
            services = []
            if has_sms: services.append('SMS')
            if has_drs: services.append('DRS')
            if has_oms: services.append('OMS')
            desc = f"Data sync via {', '.join(services)}: {', '.join(parts)}." if parts else "Start data synchronization."
            goal = f"Deploy data plane and start synchronization: {', '.join(parts)}. Verify connectivity between source and target."

        elif phase_key == 'PHASE_4_5':
            parts = []
            if 'SMS_SUBTASK_MONITOR' in unique_actions: parts.append('SMS replication progress')
            if has_drs: parts.append('DRS sync lag')
            if has_oms: parts.append('OMS sync completion')
            desc = f"Monitor: {', '.join(parts)}." if parts else "Monitor data synchronization until complete."
            goal = f"Monitor data synchronization: {', '.join(parts)}. Confirm replication is complete for all resources. Report sync percentages and ETA."

        elif phase_key == 'PHASE_4_6':
            desc = "Cold cutover: sever source connections, promote target resources, validate reachability."
            goal = "Execute cold cutover procedure: sever on-premises connections, promote target VPC bindings, and validate application reachability on the new infrastructure."

        elif phase_key == 'PHASE_4_7':
            parts = []
            if 'SMOKE_TESTS' in unique_actions: parts.append('smoke tests')
            parts.append('destroy transient resources')
            desc = f"Teardown: {', '.join(parts)}. Confirm PPU costs drop to baseline."
            goal = f"Destroy transient migration resources and run {', '.join(parts)}. Confirm no orphaned resources remain."

        else:
            desc = f"{len(actions)} actions planned."
            goal = f"Execute {len(actions)} actions for phase {phase_key}."

        result[phase_key] = {
            'label': defaults.get('label', phase_key),
            'icon': defaults.get('icon', 'fa-circle'),
            'color': defaults.get('color', '#64748b'),
            'desc': desc,
            'goal': goal,
            'actions': sorted(set(actions)),
            'resource_count': len(resources),
        }

    return result
