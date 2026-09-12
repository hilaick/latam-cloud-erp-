"""
Cloud State Detector — queries Huawei Cloud APIs to detect actual migration progress.

Instead of tracking processes (which may run locally or in bursts), this reads
the REAL cloud state: SMS tasks, ECS instances, source server registration, VPCs.
From the cloud resources that exist, it infers which migration phase is active.

Called by: GET /api/execution/<id>/cloud-state
Polled by: frontend every 5s alongside /orchestrate/status
"""
import json, os, subprocess, time, sys, datetime


def _api_call(method, url, ak, sk, timeout=10, project_id=None):
    """Make a signed Huawei Cloud API call and return JSON.

    Uses the WORKING HuaweiCloudClient from /root/huawei_hmac_auth.py
    (same client the sms_migration_engine.py uses successfully).
    """
    try:
        sys.path.insert(0, '/root')
        from huawei_hmac_auth import HuaweiCloudClient
        client = HuaweiCloudClient(ak, sk)
        return client.request(method, url)
    except Exception as e:
        return {'_error': str(e)[:300]}


def detect_cloud_state(project_data, customer_data=None):
    """
    Query Huawei Cloud APIs to detect actual migration progress.
    
    Returns:
    {
        'inferred_phase': 'PHASE_4_X',
        'phase_reason': 'why we think this',
        'resources': {
            'vpcs': [...],
            'ecs_instances': [...],
            'sms_sources': [...],
            'sms_tasks': [...],
        },
        'sms_progress': { 'total': N, 'running': N, 'success': N, 'failed': N },
        'timestamp': '...'
    }
    """
    # Extract credentials from project/customer data
    ak = None
    sk = None
    source_region = None
    target_region = None
    source_project_id = None
    target_project_id = None
    
    # Try customer data first, then project data
    cred_sources = [customer_data or {}, project_data]
    for src in cred_sources:
        if not ak:
            ak = src.get('accessKey') or src.get('access_key') or src.get('ak')
        if not sk:
            sk = src.get('secretKey') or src.get('secret_key') or src.get('sk')
        if not source_region:
            source_region = src.get('sourceRegion') or src.get('source_region')
        if not target_region:
            target_region = src.get('region') or src.get('targetRegion') or src.get('target_region')
        if not source_project_id:
            source_project_id = src.get('sourceProjectId') or src.get('source_project_id')
        if not target_project_id:
            target_project_id = src.get('targetProjectId') or src.get('target_project_id') or src.get('projectId')
    
    # Also check mgcData for project IDs
    mgc = project_data.get('mgcData', {})
    raw_inv = mgc.get('raw_inventory', {})
    if not source_project_id and raw_inv:
        # Try to extract from raw inventory
        for srv in (raw_inv.get('compute', []) or []):
            pid = srv.get('enterprise_project_id', '')
            if pid and len(pid) > 20:
                source_project_id = pid
                break
    
    if not target_region:
        target_region = 'la-north-2'
    if not source_region:
        source_region = 'ap-southeast-3'
    
    # If no project IDs found, try extracting from mgcData raw_inventory
    if not source_project_id and raw_inv:
        for srv in (raw_inv.get('compute', []) or []):
            pid = srv.get('enterprise_project_id', '') or srv.get('project_id', '')
            if pid and len(pid) > 20:
                source_project_id = pid
                break
    # Known fallback for INTERNAL_ACCOUNT (from sms_migration_engine.py)
    if not source_project_id:
        source_project_id = '2413708833e14626b37a8da5edf92d8f'
    # Target project ID is often the same account (cross-region migration)
    if not target_project_id:
        target_project_id = source_project_id
    
    result = {
        'inferred_phase': 'PHASE_4_1',
        'phase_reason': 'No cloud resources detected yet',
        'resources': {},
        'sms_progress': {},
        'timestamp': datetime.datetime.utcnow().strftime('%m-%d %H:%M:%S UTC'),
        'credentials_found': bool(ak and sk),
    }
    
    if not ak or not sk:
        result['phase_reason'] = 'No Huawei Cloud credentials found in project/customer data'
        return result
    
    # 1. Check VPCs in target region (Phase 4.1 — Network)
    try:
        vpc_url = f'https://vpc.{target_region}.myhuaweicloud.com/v3/{target_project_id}/vpcs?limit=50' if target_project_id else None
        vpcs = []
        if vpc_url:
            vpc_data = _api_call('GET', vpc_url, ak, sk, project_id=target_project_id)
            vpcs = vpc_data.get('vpcs', []) or []
        if not vpcs:
            # v3 needs project_id in path; fall back to the hcloud CLI which
            # resolves the project automatically (proven working path).
            import subprocess, json as _j
            _env = os.environ.copy()
            _env.update({'HW_ACCESS_KEY': ak or '', 'HW_SECRET_KEY': sk or ''})
            _r = subprocess.run(['hcloud', 'VPC', 'ListVpcs/v3', '--cli-region=' + target_region],
                                capture_output=True, text=True, timeout=25, env=_env)
            _idx = _r.stdout.find('{')
            if _idx >= 0:
                try:
                    _parsed, _ = _j.JSONDecoder().raw_decode(_r.stdout[_idx:])
                    vpcs = _parsed.get('vpcs', []) or []
                except Exception:
                    vpcs = []
        result['resources']['vpcs'] = [{'name': v.get('name'), 'id': v.get('id', '')[:12],
                                        'status': v.get('status')} for v in vpcs[:10]]
        result['vpc_count'] = len(vpcs)
    except Exception as e:
        result['resources']['vpcs'] = []
        result['vpc_count'] = 0
    
    # 2. Check ECS instances in target region (Phase 4.3 — Target)
    try:
        ecs_url = f'https://ecs.{target_region}.myhuaweicloud.com/v1/{target_project_id}/cloudservers/detail?limit=50'
        ecs_data = _api_call('GET', ecs_url, ak, sk, project_id=target_project_id)
        servers = ecs_data.get('servers', [])
        result['resources']['ecs_instances'] = [
            {'name': s.get('name'), 'id': s.get('id', '')[:12], 'status': s.get('status'),
             'flavor': s.get('flavor', {}).get('name', ''), 'ip': (s.get('addresses', {}).get('la-north-2') or [{}])[0].get('addr', '') if s.get('addresses') else ''}
            for s in servers[:10]
        ]
        result['ecs_count'] = len(servers)
    except Exception as e:
        result['resources']['ecs_instances'] = []
        result['ecs_count'] = 0
    
    # 3. Check SMS source servers AND tasks in source region
    # (la-north-2 doesn't have SMS service — DNS resolution fails)
    # SMS Sources
    try:
        sms_url = f'https://sms.{source_region}.myhuaweicloud.com/v3/sources?limit=50'
        sms_data = _api_call('GET', sms_url, ak, sk, project_id=source_project_id)
        sources = sms_data.get('sources', sms_data.get('source_servers', []))
        if sources:
            result['resources']['sms_sources'] = [
                {'name': s.get('name', ''), 'id': s.get('id', '')[:12], 'ip': s.get('ip', ''),
                 'state': s.get('state', ''), 'connected': s.get('connected', False), 'region': source_region}
                for s in sources[:10]
            ]
            result['sms_source_count'] = len(sources)
            result['sms_sources_connected'] = sum(1 for s in sources if s.get('connected'))
    except Exception:
        pass
    
    # SMS Tasks
    try:
        task_url = f'https://sms.{source_region}.myhuaweicloud.com/v3/tasks?limit=50'
        task_data = _api_call('GET', task_url, ak, sk, project_id=source_project_id)
        tasks = task_data.get('tasks', [])
        if tasks:
            result['resources']['sms_tasks'] = [
                {
                    'name': t.get('name', ''),
                    'id': t.get('id', '')[:12],
                    'state': t.get('state', ''),
                    'priority': t.get('priority', ''),
                    'type': t.get('type', ''),
                    'os_type': t.get('os_type', ''),
                    'source_server_id': t.get('source_server', {}).get('id', '') if isinstance(t.get('source_server'), dict) else '',
                    'source_server_name': t.get('source_server', {}).get('name', '') if isinstance(t.get('source_server'), dict) else '',
                    'source_server_ip': t.get('source_server', {}).get('ip', '') if isinstance(t.get('source_server'), dict) else '',
                    'target_server_name': t.get('target_server', {}).get('name', '') if isinstance(t.get('target_server'), dict) else '',
                    'target_server_id': t.get('target_server', {}).get('vm_id', t.get('target_server', {}).get('id', '')) if isinstance(t.get('target_server'), dict) else '',
                    'migration_ip': t.get('migration_ip', ''),
                    'syncing': t.get('syncing', False),
                    'subtask_info': t.get('subtask_info', ''),
                    # SMS API does NOT expose a top-level percentage — progress lives in
                    # sub_tasks[].progress. The active data-migration subtask (e.g.
                    # MIGRATE_WINDOWS_BLOCK / MIGRATE_LINUX_FILE) carries the real %.
                    'migration_percent': max(
                        [st.get('progress', 0) for st in (t.get('sub_tasks') or [])
                         if str(st.get('name', '')).startswith('MIGRATE_')] or [0]
                    ),
                    'subtask_progress': {
                        st.get('name', ''): st.get('progress', 0)
                        for st in (t.get('sub_tasks') or [])
                    },
                    'start_time': t.get('create_date', ''),
                    'finish_time': t.get('estimate_complete_time', ''),
                }
                for t in tasks[:10]
            ]
            states = {}
            for t in tasks:
                st = t.get('state', 'unknown')
                states[st] = states.get(st, 0) + 1
            result['sms_progress'] = {
                'total': len(tasks),
                'by_state': states,
                'running': states.get('RUNNING', 0) + states.get('SYNCING', 0),
                'success': states.get('SUCCESS', 0),
                'failed': states.get('FAIL', 0) + states.get('ERROR', 0),
                'waiting': states.get('WAITING', 0) + states.get('READY', 0),
            }
    except Exception:
        pass
    
    # ── Infer current phase from cloud state ──
    has_vpcs = result.get('vpc_count', 0) > 0
    has_sources = result.get('sms_source_count', 0) > 0
    sources_connected = result.get('sms_sources_connected', 0) > 0
    has_ecs = result.get('ecs_count', 0) > 0
    has_tasks = result['sms_progress'].get('total', 0) > 0
    tasks_running = result['sms_progress'].get('running', 0) > 0
    tasks_success = result['sms_progress'].get('success', 0) > 0
    tasks_failed = result['sms_progress'].get('failed', 0) > 0
    
    if tasks_success > 0 and tasks_running == 0:
        result['inferred_phase'] = 'PHASE_4_6'
        result['phase_reason'] = f'{tasks_success} SMS tasks completed — ready for cutover'
    elif tasks_running > 0:
        result['inferred_phase'] = 'PHASE_4_5'
        result['phase_reason'] = f'{tasks_running} SMS tasks syncing — monitoring progress'
    elif has_tasks and has_ecs:
        # Tasks exist AND target ECS exist → data sync phase is genuinely reached.
        # (Leftover waiting tasks with NO target ECS are aborted 4.3 artifacts —
        #  a fresh 4.3 must run first; don't skip to 4.4.)
        result['inferred_phase'] = 'PHASE_4_4'
        result['phase_reason'] = f'{result.get("ecs_count",0)} target ECS + {has_tasks} SMS tasks — data sync starting'
    elif has_ecs and sources_connected:
        result['inferred_phase'] = 'PHASE_4_4'
        result['phase_reason'] = f'{result.get("ecs_count",0)} target ECS + {sources_connected} sources connected — ready for task creation'
    elif has_ecs:
        result['inferred_phase'] = 'PHASE_4_3'
        result['phase_reason'] = f'{result.get("ecs_count",0)} target ECS created — source agents not yet connected'
    elif has_tasks:
        # Tasks without target ECS = leftovers from an aborted/partial 4.3.
        # Pipeline is still at Target provisioning — flag it.
        result['inferred_phase'] = 'PHASE_4_3'
        result['phase_reason'] = f'{has_tasks} SMS task(s) present but 0 target ECS — aborted 4.3 artifacts; re-run Target phase'
    elif sources_connected:
        result['inferred_phase'] = 'PHASE_4_2'
        result['phase_reason'] = f'{sources_connected} source servers connected to SMS — target not yet provisioned'
    elif has_sources:
        result['inferred_phase'] = 'PHASE_4_2'
        result['phase_reason'] = f'{result.get("sms_source_count",0)} source servers registered — agents not connected'
    elif has_vpcs:
        result['inferred_phase'] = 'PHASE_4_1'
        result['phase_reason'] = f'{result.get("vpc_count",0)} VPCs provisioned — network ready, awaiting source prep'
    else:
        result['inferred_phase'] = 'PHASE_4_1'
        result['phase_reason'] = 'No cloud resources detected — pipeline not started'
    
    return result


def reconcile_execution_plan(plan, cloud_state):
    """
    Reconcile the execution plan's step statuses against LIVE cloud state.

    The plan's status field tracks "has the ERP engine dispatched this step".
    When the migration ran OUTSIDE the ERP (console / agent / manual), the cloud
    already contains the artifacts — the plan still shows 'pending'. This maps
    cloud evidence → plan steps and marks them 'completed_by_cloud'.

    Evidence sources (from detect_cloud_state):
      resources.sms_sources   — [{name, id, connected, state, os}]
      resources.sms_tasks     — [{name, source_server_name, target_server_name,
                                  state, migration_percent, ...}]
      resources.ecs_instances — [{name, id, status, ...}]  (may be absent)
      resources.vpcs          — [{name, id}]

    Returns a dict {step_id: 'completed_by_cloud'} for steps with cloud proof.
    """
    if not isinstance(plan, dict):
        return {}
    steps = plan.get('steps', [])
    if not isinstance(steps, list):
        return {}
    resources = cloud_state.get('resources', {}) if isinstance(cloud_state, dict) else {}
    sms_sources = resources.get('sms_sources') or []
    sms_tasks = resources.get('sms_tasks') or []
    ecs_instances = resources.get('ecs_instances') or []
    vpcs = resources.get('vpcs') or []

    # Indexes by lowercase name
    src_by_name = {}
    for s in sms_sources:
        n = (s.get('name') or '').lower()
        if n:
            src_by_name[n] = s
    ecs_names = set((e.get('name') or '').lower() for e in ecs_instances)
    # SMS sources often carry the source server's IP; also index tasks by source + target
    task_by_src = {}
    task_by_tgt = {}
    task_success = set()
    any_task_running = False
    for t in sms_tasks:
        sn = (t.get('source_server_name') or '').lower()
        tn = (t.get('target_server_name') or '').lower()
        if sn:
            task_by_src.setdefault(sn, t)
        if tn:
            task_by_tgt.setdefault(tn, t)
        st = (t.get('state') or '').upper()
        if st in ('SUCCESS', 'FINISHED', 'COMPLETED'):
            task_success.add(sn)
        if st in ('RUNNING', 'SYNCING', 'READY', 'WAITING'):
            any_task_running = True

    has_network = bool(vpcs) or bool(resources.get('eips')) or bool(resources.get('nat_gateways'))

    reconciled = {}
    for step in steps:
        step_id = step.get('step_id')
        if step_id is None:
            continue
        action = (step.get('action') or '').upper()
        target = (step.get('target_resource') or '').lower()
        if not target or target in ('n/a', 'account', 'global'):
            # Global steps: network fabric evidence marks Wave 0 provisioning done
            if has_network and action in ('PROVISION_VPN', 'CREATE_NAT', 'CREATE_EIP', 'VPC_QUOTA', 'NETWORK_FABRIC'):
                reconciled[step_id] = 'completed_by_cloud'
            continue
        # Per-server evidence
        src = src_by_name.get(target)
        task_for_src = task_by_src.get(target)
        task_for_tgt = task_by_tgt.get(target)
        target_ecs = target in ecs_names or target in task_by_tgt
        if action == 'SMS_AGENT_INSTALL' and (src and src.get('connected')):
            reconciled[step_id] = 'completed_by_cloud'
        elif action == 'MIGRATION_PROJECT_CONFIG' and src:
            reconciled[step_id] = 'completed_by_cloud'
        elif action in ('CREATE_TARGET_ECS', 'CREATE_TARGET_RDS') and (target_ecs or task_for_tgt or task_for_src):
            reconciled[step_id] = 'completed_by_cloud'
        elif action in ('SMS_TASK_CREATE', 'OMS_SYNC_START') and (task_for_src or task_for_tgt or target_ecs):
            reconciled[step_id] = 'completed_by_cloud'
        elif action in ('SMS_SUBTASK_MONITOR', 'DRS_START_SYNC') and (task_for_src or task_for_tgt):
            reconciled[step_id] = 'completed_by_cloud' if (target in task_success) else 'running_in_cloud' if any_task_running else 'completed_by_cloud'
        elif action in ('SMS_CUTOVER', 'CUTOVER', 'SMOKE_TESTS') and target in task_success:
            reconciled[step_id] = 'completed_by_cloud'
    return reconciled
