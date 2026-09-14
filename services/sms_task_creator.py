"""
Deterministic SMS Task Creator — builds exact disk config from live cloud state.

Prevents SMS.0515 by:
1. Querying source server disks via SMS ShowServer (gets physical_volumes)
2. Querying target ECS volumes via ECS ShowServer (gets EVS volume IDs)
3. Building the exact CreateTask payload with 1:1 disk mirror
4. Setting --syncing=false (mandatory for no-LVM Linux with agent 26.6.0)
5. Setting --use_public_ip=true --migration_ip=<EIP> for cross-region

This is the PROVEN pattern from skills:
- huawei-cloud-sms-migration-exact-disk-config
- sms-migration-complete-reference
- sms-migration-execution-learned
"""
import json
import logging
import subprocess
import time

logger = logging.getLogger(__name__)

# ── hcloud helpers ──────────────────────────────────────────────────────

def _hcloud(args, region, profile='erp-src'):
    """Run hcloud CLI, return stdout or ''."""
    try:
        r = subprocess.run(
            ['hcloud'] + args + [f'--cli-region={region}', f'--cli-profile={profile}'],
            capture_output=True, text=True, timeout=45,
        )
        return r.stdout.strip() if r.returncode == 0 else ''
    except Exception:
        return ''


def _hcloud_json(args, region, profile='erp-src'):
    """Run hcloud, parse JSON response."""
    raw = _hcloud(args, region, profile)
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


# ── Source server disk discovery ────────────────────────────────────────

def get_source_server_disks(source_sms_id, source_region='ap-southeast-3',
                            profile='erp-src'):
    """Query SMS ShowServer to get exact disk/partition layout.

    Returns list of dicts:
      [{name, device_use, size, used_size, physical_volumes: [{name, device_use, size, used_size, file_system, index, mount_point, uuid}]}]

    This is the 1:1 mirror that SMS.0515 validation requires.
    """
    d = _hcloud_json(['SMS', 'ShowServer', f'--source_id={source_sms_id}'],
                     source_region, profile)
    server = d.get('source_server') or d
    disks = server.get('disks') or []
    result = []
    for disk in disks:
        entry = {
            'name': disk.get('name', ''),
            'device_use': disk.get('device_use', 'BOOT'),
            'size': disk.get('size', 0),
            'used_size': disk.get('used_size', 0),
            'os_disk': disk.get('os_disk', False),
            'physical_volumes': [],
        }
        for pv in (disk.get('physical_volumes') or []):
            entry['physical_volumes'].append({
                'name': pv.get('name', ''),
                'device_use': pv.get('device_use', 'OS'),
                'size': pv.get('size', 0),
                'used_size': pv.get('used_size', 0),
                'file_system': pv.get('file_system', 'ext4'),
                'index': pv.get('index', 1),
                'mount_point': pv.get('mount_point', '/'),
                'uuid': pv.get('uuid', ''),
            })
        result.append(entry)
    return result


def get_target_ecs_volumes(target_ecs_id, target_region='la-north-2',
                           profile='erp-tgt'):
    """Query ECS ShowServer to get EVS volume IDs attached to target.

    Returns list of {volume_id, device, size_gb}.
    """
    d = _hcloud_json(['ECS', 'ShowServer', f'--server_id={target_ecs_id}'],
                     target_region, profile)
    server = d.get('server') or d
    vols = server.get('os-extended-volumes:volumes_attached') or []
    result = []
    for v in vols:
        result.append({
            'volume_id': v.get('id', ''),
            'device': v.get('device', ''),
        })
    # Enrich with EVS volume details (size)
    for vol in result:
        if vol['volume_id']:
            evs = _hcloud_json(['EVS', 'ShowVolume', f'--volume_id={vol["volume_id"]}'],
                               target_region, profile)
            vdata = evs.get('volume') or evs
            vol['size_gb'] = vdata.get('size', 0)
            vol['name'] = vdata.get('name', '')
    return result


def get_target_eip(target_ecs_id, target_region='la-north-2',
                   profile='erp-tgt'):
    """Get the EIP bound to a target ECS."""
    d = _hcloud_json(['EIP', 'ListPublicips', '--limit=50'],
                     target_region, profile)
    for ip in (d.get('publicips') or []):
        # Check if this EIP is bound to our ECS
        port_id = ip.get('port_id', '')
        if not port_id:
            continue
        # device_id in the EIP response matches the ECS ID
        if ip.get('device_id', '') == target_ecs_id:
            return ip.get('public_ip_address', '')
    return ''


# ── Task creation ───────────────────────────────────────────────────────

def build_create_task_args(source_sms_id, target_ecs_id, target_eip,
                           source_disks, target_vols,
                           source_region='ap-southeast-3',
                           target_region='la-north-2',
                           task_name='MigrationTask01',
                           mig_project_id='', mig_project_name='',
                           os_type='LINUX', migrate_type='MIGRATE_FILE'):
    """Build the exact hcloud SMS CreateTask argument list.

    KEY FIXES vs what the agent was doing:
    1. Includes physical_volumes[] with ALL partitions (1:1 mirror from source)
    2. Sets --syncing=false (mandatory for no-LVM Linux with agent 26.6.0)
    3. Sets --use_public_ip=true --migration_ip=<EIP> for cross-region
    4. Uses EVS Volume ID as disk_id (not SMS disk ID)
    5. Preserves exact device_use from source (BOOT stays BOOT, OS stays OS)
    6. Includes mount_point, uuid, index in physical_volumes

    Returns: list of hcloud CLI args (without --cli-region/--cli-profile)
    """
    args = [
        'SMS', 'CreateTask',
        f'--name={task_name}',
        f'--type={migrate_type}',
        f'--os_type={os_type}',
        f'--source_server.id={source_sms_id}',
        f'--target_server.vm_id={target_ecs_id}',
        '--use_public_ip=true',
        f'--migration_ip={target_eip}',
        '--exist_server=true',
        '--start_target_server=true',
        '--auto_start=false',
        '--syncing=false',  # CRITICAL: mandatory for no-LVM Linux
    ]

    if mig_project_id:
        args.append(f'--project_id={mig_project_id}')
    if mig_project_name:
        args.append(f'--project_name={mig_project_name}')

    # Region fields
    args.extend([
        f'--region_id={target_region}',
        f'--region_name={target_region}',
    ])

    # ── Disk configuration (1:1 mirror from source) ──
    # Map source disks to target volumes
    for disk_idx, src_disk in enumerate(source_disks, 1):
        # Get the corresponding target volume
        tgt_vol = target_vols[disk_idx - 1] if disk_idx - 1 < len(target_vols) else {}
        evs_id = tgt_vol.get('volume_id', '')

        disk_prefix = f'--target_server.disks.{disk_idx}'
        args.extend([
            f'{disk_prefix}.name={src_disk["name"]}',
            f'{disk_prefix}.device_use={src_disk["device_use"]}',
            f'{disk_prefix}.size={src_disk["size"]}',
        ])
        if evs_id:
            args.append(f'{disk_prefix}.disk_id={evs_id}')

        # Physical volumes (ALL partitions — prevents SMS.0515)
        for pv_idx, pv in enumerate(src_disk.get('physical_volumes', []), 1):
            pv_prefix = f'{disk_prefix}.physical_volumes.{pv_idx}'
            args.extend([
                f'{pv_prefix}.name={pv["name"]}',
                f'{pv_prefix}.device_use={pv["device_use"]}',
                f'{pv_prefix}.size={pv["size"]}',
            ])
            if pv.get('used_size'):
                args.append(f'{pv_prefix}.used_size={pv["used_size"]}')
            if pv.get('file_system'):
                args.append(f'{pv_prefix}.file_system={pv["file_system"]}')
            if pv.get('mount_point'):
                args.append(f'{pv_prefix}.mount_point={pv["mount_point"]}')
            if pv.get('index'):
                args.append(f'{pv_prefix}.index={pv["index"]}')
            if pv.get('uuid'):
                args.append(f'{pv_prefix}.uuid={pv["uuid"]}')

    return args


def create_sms_task(source_sms_id, target_ecs_id,
                    source_region='ap-southeast-3',
                    target_region='la-north-2',
                    task_name='MigrationTask01',
                    mig_project_id='', mig_project_name='',
                    os_type='LINUX', migrate_type='MIGRATE_FILE',
                    sms_profile='erp-src',
                    timeout=180):
    """Deterministic SMS task creation with exact disk config.

    Returns dict: {success, task_id, error, command}
    """
    logger.info(f"[sms-task] Creating task: src={source_sms_id[:12]}... "
                f"tgt={target_ecs_id[:12]}... name={task_name}")

    # 1. Get source server disks
    source_disks = get_source_server_disks(source_sms_id, source_region, sms_profile)
    if not source_disks:
        return {
            'success': False,
            'error': 'No disks found on source server — agent may not be registered or disk collection not complete. Wait 2-3 min and retry.',
            'command': '',
        }
    logger.info(f"[sms-task] Source disks: {len(source_disks)} "
                f"disks, {sum(len(d.get('physical_volumes',[])) for d in source_disks)} total PVs")

    # 2. Get target ECS volumes
    target_vols = get_target_ecs_volumes(target_ecs_id, target_region)
    if not target_vols:
        return {
            'success': False,
            'error': 'No volumes found on target ECS — check ECS exists and has volumes attached.',
            'command': '',
        }
    logger.info(f"[sms-task] Target volumes: {len(target_vols)}")

    # 3. Get target EIP
    target_eip = get_target_eip(target_ecs_id, target_region)
    if not target_eip:
        # Fallback: try to get from ECS addresses (private IP for same-region)
        d = _hcloud_json(['ECS', 'ShowServer', f'--server_id={target_ecs_id}'],
                         target_region)
        server = d.get('server') or d
        for net_name, addrs in (server.get('addresses') or {}).items():
            for a in (addrs or []):
                if a.get('OS-EXT-IPS:type') == 'floating':
                    target_eip = a.get('addr', '')
                    break
        if not target_eip:
            return {
                'success': False,
                'error': 'No EIP found on target ECS — cross-region migration requires a public EIP. Bind an EIP to the target ECS first.',
                'command': '',
            }
    logger.info(f"[sms-task] Target EIP: {target_eip}")

    # 4. Build and execute CreateTask
    args = build_create_task_args(
        source_sms_id, target_ecs_id, target_eip,
        source_disks, target_vols,
        source_region, target_region,
        task_name, mig_project_id, mig_project_name,
        os_type, migrate_type,
    )

    # Add region and profile
    full_cmd = args + [f'--cli-region={source_region}', f'--cli-profile={sms_profile}']
    cmd_str = 'hcloud ' + ' '.join(full_cmd)
    logger.info(f"[sms-task] Command: {cmd_str[:300]}...")

    try:
        result = subprocess.run(
            ['hcloud'] + full_cmd,
            capture_output=True, text=True, timeout=timeout,
        )
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()

        if result.returncode != 0 or 'USE_ERROR' in stdout or 'error_code' in stdout:
            # Parse error
            try:
                err_d = json.loads(stdout)
                err_code = err_d.get('error_code', 'UNKNOWN')
                err_msg = err_d.get('error_msg', stdout[:200])
            except json.JSONDecodeError:
                err_code = 'CLI_ERROR'
                err_msg = (stdout or stderr)[:200]
            logger.error(f"[sms-task] CreateTask failed: {err_code} — {err_msg}")
            return {
                'success': False,
                'error': f'{err_code}: {err_msg}',
                'command': cmd_str,
            }

        # Parse task ID from response
        try:
            resp = json.loads(stdout)
            task_id = resp.get('id', '')
        except json.JSONDecodeError:
            task_id = ''

        if not task_id:
            logger.error(f"[sms-task] No task_id in response: {stdout[:200]}")
            return {
                'success': False,
                'error': f'No task_id in response: {stdout[:200]}',
                'command': cmd_str,
            }

        # 5. Verify --syncing=false landed (API may override defaults)
        time.sleep(3)
        verify = _hcloud_json(['SMS', 'ShowTask', f'--task_id={task_id}'],
                              source_region, sms_profile)
        syncing = verify.get('syncing', None)
        if syncing is True:
            logger.warning(f"[sms-task] syncing=true in API response — "
                          f"this will crash on no-LVM sources! Attempting update...")
            # Can't update syncing after creation — must delete and recreate
            _hcloud(['SMS', 'DeleteTask', f'--task_id={task_id}'],
                    source_region, sms_profile)
            return {
                'success': False,
                'error': 'API set syncing=true despite --syncing=false. Deleted task. Will retry.',
                'command': cmd_str,
            }

        logger.info(f"[sms-task] Task created: {task_id} (syncing={syncing})")
        return {
            'success': True,
            'task_id': task_id,
            'command': cmd_str,
            'source_disks': source_disks,
            'target_vols': target_vols,
            'target_eip': target_eip,
        }

    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': f'Timed out ({timeout}s)',
            'command': cmd_str,
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'command': cmd_str,
        }


def start_sms_task(task_id, source_region='ap-southeast-3',
                   profile='erp-src'):
    """Start an SMS migration task."""
    logger.info(f"[sms-task] Starting task {task_id[:12]}...")
    result = _hcloud(['SMS', 'UpdateTaskStatus', f'--task_id={task_id}',
                      '--operation=start'],
                     source_region, profile)
    if result:
        logger.info(f"[sms-task] Start result: {result[:200]}")
        return {'success': True, 'task_id': task_id}
    return {'success': False, 'error': 'Start command returned empty'}


def monitor_sms_task(task_id, source_region='ap-southeast-3',
                     profile='erp-src', max_wait=3600, poll_interval=30):
    """Monitor SMS task until terminal state.

    Returns dict: {success, state, progress, subtasks, error}
    """
    start = time.time()
    while time.time() - start < max_wait:
        d = _hcloud_json(['SMS', 'ShowTask', f'--task_id={task_id}'],
                         source_region, profile)
        state = d.get('state', 'UNKNOWN')
        progress = d.get('migrate_progress', 0)
        error_code = d.get('error_code', '')
        error_msg = d.get('error_msg', '')

        # Log subtask progress
        subtasks = d.get('sub_tasks') or []
        subtask_summary = []
        for st in subtasks:
            subtask_summary.append(
                f"{st.get('name','?')}: {st.get('progress',0)}%"
            )

        logger.info(f"[sms-task] {task_id[:12]}: state={state} "
                    f"progress={progress}% subtasks=[{', '.join(subtask_summary)}]")

        if state in ('MIGRATE_SUCCESS', 'SUCCESS', 'finished'):
            return {
                'success': True,
                'state': state,
                'progress': progress,
                'subtasks': subtasks,
            }
        if state in ('MIGRATE_FAIL', 'FAIL', 'FAILED', 'ABORT', 'ABORTING'):
            return {
                'success': False,
                'state': state,
                'progress': progress,
                'error': f'{error_code}: {error_msg}',
                'subtasks': subtasks,
            }

        time.sleep(poll_interval)

    return {
        'success': False,
        'state': 'TIMEOUT',
        'error': f'Monitoring timed out after {max_wait}s',
    }
