"""
Cloud State Detector — queries Huawei Cloud APIs to detect actual migration progress.

Instead of tracking processes (which may run locally or in bursts), this reads
the REAL cloud state: SMS tasks, ECS instances, source server registration, VPCs.
From the cloud resources that exist, it infers which migration phase is active.

Called by: GET /api/execution/<id>/cloud-state
Polled by: frontend every 5s alongside /orchestrate/status
"""
import json, os, subprocess, time, hashlib, hmac, base64, datetime
import urllib.request, urllib.error

def _sign_request(method, url, ak, sk, body=''):
    """Sign a Huawei Cloud API request using AK/SW SHA256 signing."""
    # Parse URL
    from urllib.parse import urlparse, urlencode
    parsed = urlparse(url)
    host = parsed.hostname
    path = parsed.path
    query = parsed.query
    
    # Canonical request
    t = datetime.datetime.utcnow()
    sdk_date = t.strftime('%Y%m%dT%H%M%SZ')
    content_sha = hashlib.sha256(body.encode()).hexdigest()
    
    canonical_headers = f'content-type:application/json\nhost:{host}\nx-sdk-date:{sdk_date}\n'
    signed_headers = 'content-type;host;x-sdk-date'
    
    canonical_request = f'{method}\n{path}\n{query}\n{canonical_headers}\n{signed_headers}\n{content_sha}'
    
    # String to sign
    hash_cr = hashlib.sha256(canonical_request.encode()).hexdigest()
    string_to_sign = f'SDK-HMAC-SHA256\n{sdk_date}\n{hash_cr}'
    
    # Sign
    signature = hmac.new(sk.encode(), string_to_sign.encode(), hashlib.sha256).hexdigest()
    
    return {
        'Authorization': f'SDK-HMAC-SHA256 Access={ak}, SignedHeaders={signed_headers}, Signature={signature}',
        'X-Sdk-Date': sdk_date,
        'Content-Type': 'application/json',
    }


def _api_call(method, url, ak, sk, timeout=10):
    """Make a signed Huawei Cloud API call and return JSON."""
    headers = _sign_request(method, url, ak, sk)
    req = urllib.request.Request(url, method=method, headers=headers, data=b'' if method == 'POST' else None)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except:
            return {'_error': f'HTTP {e.code}'}
    except Exception as e:
        return {'_error': str(e)[:200]}


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
        vpc_url = f'https://vpc.{target_region}.myhuaweicloud.com/v1/{target_project_id or ""}/vpcs?limit=50'
        if not target_project_id:
            # Try without project_id in path (use query param)
            vpc_url = f'https://vpc.{target_region}.myhuaweicloud.com/v1/vpcs?limit=50'
        vpc_data = _api_call('GET', vpc_url, ak, sk)
        vpcs = vpc_data.get('vpcs', [])
        result['resources']['vpcs'] = [{'name': v.get('name'), 'id': v.get('id', '')[:12], 'status': v.get('status')} for v in vpcs[:10]]
        result['vpc_count'] = len(vpcs)
    except Exception as e:
        result['resources']['vpcs'] = []
        result['vpc_count'] = 0
    
    # 2. Check ECS instances in target region (Phase 4.3 — Target)
    try:
        ecs_url = f'https://ecs.{target_region}.myhuaweicloud.com/v1/{target_project_id or ""}/cloudservers?limit=50'
        if not target_project_id:
            ecs_url = f'https://ecs.{target_region}.myhuaweicloud.com/v1/cloudservers/detail?limit=50'
        ecs_data = _api_call('GET', ecs_url, ak, sk)
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
    
    # 3. Check SMS source servers (Phase 4.2 — Source Prep)
    try:
        sms_url = f'https://sms.{source_region}.myhuaweicloud.com/v3/sources?limit=50'
        sms_data = _api_call('GET', sms_url, ak, sk)
        sources = sms_data.get('sources', [])
        result['resources']['sms_sources'] = [
            {'name': s.get('name', ''), 'id': s.get('id', '')[:12], 'ip': s.get('ip', ''),
             'state': s.get('state', ''), 'connected': s.get('connected', False)}
            for s in sources[:10]
        ]
        result['sms_source_count'] = len(sources)
        result['sms_sources_connected'] = sum(1 for s in sources if s.get('connected'))
    except Exception as e:
        result['resources']['sms_sources'] = []
        result['sms_source_count'] = 0
    
    # 4. Check SMS tasks (Phase 4.4/4.5 — Data Sync/Monitor)
    try:
        task_url = f'https://sms.{source_region}.myhuaweicloud.com/v1/{source_project_id or target_project_id or ""}/tasks?limit=50'
        task_data = _api_call('GET', task_url, ak, sk)
        tasks = task_data.get('tasks', [])
        result['resources']['sms_tasks'] = [
            {'name': t.get('name', ''), 'id': t.get('id', '')[:12], 'state': t.get('state', ''),
             'priority': t.get('priority', ''), 'type': t.get('type', '')}
            for t in tasks[:10]
        ]
        
        # Count by state
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
    except Exception as e:
        result['resources']['sms_tasks'] = []
        result['sms_progress'] = {}
    
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
    elif has_tasks:
        result['inferred_phase'] = 'PHASE_4_4'
        result['phase_reason'] = f'{has_tasks} SMS tasks created — data sync starting'
    elif has_ecs and sources_connected:
        result['inferred_phase'] = 'PHASE_4_4'
        result['phase_reason'] = f'{result.get("ecs_count",0)} target ECS + {sources_connected} sources connected — ready for task creation'
    elif has_ecs:
        result['inferred_phase'] = 'PHASE_4_3'
        result['phase_reason'] = f'{result.get("ecs_count",0)} target ECS created — source agents not yet connected'
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
