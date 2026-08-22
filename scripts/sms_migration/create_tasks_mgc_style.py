#!/usr/bin/env python3
"""
MGC-style SMS cross-region task creation.
Maps source disks from SMS API to target ECS attached disks.

Usage: python3 create_tasks_mgc_style.py

Requires: mgc_migrate.py in /root/ulearning-migration/scripts/
Environment: Run on the live server with hcloud agent-test profile configured.
"""
import sys, json, time, os
sys.path.insert(0, '/root/ulearning-migration/scripts')
from mgc_migrate import HcApiClient, get_sms_source_detail, get_server_attached_disks, get_server_fixed_and_floating_ip
from copy import deepcopy

# Configuration — update these for each project
AK = os.environ.get('SOURCE_AK', '')
SK = os.environ.get('SOURCE_SK', '')
SMS_ENDPOINT = 'https://sms.ap-southeast-3.myhuaweicloud.com'
TARGET_REGION = os.environ.get('TARGET_REGION', 'la-north-2')
TARGET_PROJECT_ID = os.environ.get('TARGET_PROJECT_ID', '2413708833e14626b37a8da5edf92d8f')
TARGET_REGION_NAME = 'LA-Mexico City2'
TARGET_PROJECT_NAME = 'la-north-2'

# Source-to-target VM mapping
# Format: [{'source_name': '20d3', 'target_vm_id': 'b05b9af3-...'}]
TARGETS = json.loads(os.environ.get('TARGETS', '[]'))

if not AK or not SK:
    print('ERROR: Set SOURCE_AK and SOURCE_SK environment variables')
    sys.exit(1)

client = HcApiClient(AK, SK)

# Get fresh source server IDs from SMS
rsp = client.request_json('GET', SMS_ENDPOINT + '/v3/sources?limit=100&offset=0')
servers = rsp.get('source_servers', [])
id_map = {}
for s in servers:
    name = s.get('name', '')
    sid = s.get('id', '')
    for tgt in TARGETS:
        if tgt['source_name'] in name:
            id_map[tgt['source_name']] = sid
    print(f'  Source: {name} -> {sid[:12]}... connected={s.get("connected")} state={s.get("state")}')

for tgt in TARGETS:
    sms_id = id_map.get(tgt['source_name'], '')
    vm_id = tgt['target_vm_id']
    if not sms_id:
        print(f'Skip {tgt["source_name"]} - no source ID')
        continue

    print(f'\n=== Task for {tgt["source_name"]} -> {vm_id} ===')

    # 1. Get source server detail from SMS API
    source_detail = get_sms_source_detail(client, SMS_ENDPOINT, sms_id)
    source_disks = (source_detail.get('init_target_server') or {}).get('disks') or source_detail.get('disks') or []
    print(f'  Source disks: {len(source_disks)}')

    # 2. Get target attached disks
    attached = get_server_attached_disks(client=client, region=TARGET_REGION, project_id=TARGET_PROJECT_ID, server_id=vm_id)
    print(f'  Target attached: {len(attached)}')

    # 3. Map source disks to target disks by device name
    by_device = {}
    boot_disk_id = ''
    for a in attached:
        dev = str(a.get('device') or '').strip()
        did = str(a.get('id') or '').strip()
        if dev and did:
            by_device[dev] = did
        if str(a.get('boot_index', '')) == '0' and did:
            boot_disk_id = did

    target_disks = []
    for d in deepcopy(source_disks):
        dev = str(d.get('name') or '').strip()
        did = by_device.get(dev, '')
        if not did and str(d.get('device_use') or '').upper() == 'BOOT':
            did = boot_disk_id
        if did:
            d['disk_id'] = did
        target_disks.append(d)

    # 4. Normalize disks for API
    normalized_disks = []
    for d in target_disks:
        did = str(d.get('disk_id') or '').strip()
        name = str(d.get('name') or '').strip()
        if not did:
            continue
        item = {'name': name, 'disk_id': did, 'device_use': str(d.get('device_use') or 'NORMAL')}
        if d.get('size') is not None: item['size'] = int(d['size'])
        if d.get('used_size') is not None: item['used_size'] = int(d['used_size'])
        pvs = []
        for pv in d.get('physical_volumes') or []:
            pv_item = {}
            for k in ('uuid', 'index', 'name', 'device_use', 'file_system', 'mount_point', 'size', 'used_size'):
                if pv.get(k) is not None: pv_item[k] = pv[k]
            if pv_item: pvs.append(pv_item)
        if pvs: item['physical_volumes'] = pvs
        normalized_disks.append(item)

    # 5. Get target IPs
    fixed_ip, floating_ip = get_server_fixed_and_floating_ip(client=client, region=TARGET_REGION, project_id=TARGET_PROJECT_ID, server_id=vm_id)
    migration_ip = floating_ip if floating_ip else fixed_ip
    use_pub = True if floating_ip else False
    print(f'  fixed={fixed_ip} floating={floating_ip} migration_ip={migration_ip} use_pub={use_pub}')

    # 6. Create task
    ts = str(int(time.time()))[-6:]
    task_name = f'mxp-{tgt["source_name"]}-{ts}'
    body = {
        'name': task_name, 'type': 'MIGRATE_FILE', 'os_type': 'LINUX',
        'start_target_server': True, 'syncing': False, 'use_public_ip': use_pub,
        'region_name': TARGET_REGION_NAME, 'region_id': TARGET_REGION,
        'project_name': TARGET_PROJECT_NAME, 'project_id': TARGET_PROJECT_ID,
        'source_server': {'id': sms_id},
        'target_server': {
            'vm_id': vm_id, 'name': f'{task_name}-tgt', 'ip': migration_ip,
            'disks': normalized_disks,
            'volume_groups': (source_detail.get('init_target_server') or {}).get('volume_groups') or [],
            'btrfs_list': source_detail.get('btrfs_list') or [],
        },
        'migration_ip': migration_ip, 'exist_server': True, 'is_need_consistency_check': False,
    }
    try:
        rsp = client.request_json('POST', SMS_ENDPOINT + '/v3/tasks', body=body)
        task_id = rsp.get('id', '')
        print(f'  Task created! ID: {task_id}')
        client.request_json('POST', f'{SMS_ENDPOINT}/v3/tasks/{task_id}/action', body={'operation': 'start'})
        print('  Task STARTED!')
    except Exception as e:
        print(f'  Error: {str(e)[:500]}')

print('\n=== DONE ===')
