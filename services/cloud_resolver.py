"""Cloud-backed placeholder resolution — the DURABLE fix for phase-output
persistence gaps.

Every plan placeholder (<vpc_id>, <src_id>, <ecs_id>, <task_id>, <sms_disk_id>,
<target_eip>, <source_ip>) has a canonical `hcloud List*` query that returns the
real resource. Instead of depending on agents to persist outputs in a specific
text format (which keeps failing — source_servers=[], source_ips=NONE), resolve
placeholders AGAINST THE CLOUD when context is empty/missing.

This combines with executionContext (fast path) + feedback_loop mining (text
path) as the THIRD, authoritative resolver:

    context -> agent-report mining -> CLOUD (always the truth)

It also heals the SMS.0515 chain: <src_id> + <sms_disk_id> now come from the
live SMS registration (ListServers → disks), and <source_ip> from either the
project data source IPs or the SMS registration's ip field.
"""
import json
import logging
import re
import subprocess

logger = logging.getLogger(__name__)

SOURCE_REGION = 'ap-southeast-3'
TARGET_REGION = 'la-north-2'
PROFILE = 'erp-src'


def _hcloud(args, region=SOURCE_REGION):
    """Run hcloud, return stdout as text (or '' on failure)."""
    try:
        r = subprocess.run(
            ['hcloud'] + args + ['--cli-region=' + region, '--cli-profile=' + PROFILE],
            capture_output=True, text=True, timeout=45,
        )
        return r.stdout
    except Exception:
        return ''


def _to_json(text):
    """hcloud outputs JSON — parse the first top-level object/array."""
    try:
        return json.loads(text)
    except Exception:
        return None


def list_sms_servers():
    d = _to_json(_hcloud(['SMS', 'ListServers']))
    return d.get('source_servers', []) if isinstance(d, dict) else []


def list_sms_tasks():
    d = _to_json(_hcloud(['SMS', 'ListTasks']))
    return d.get('tasks', []) if isinstance(d, dict) else []


def list_vpcs():
    d = _to_json(_hcloud(['VPC', 'ListVpcs'], region=TARGET_REGION))
    if isinstance(d, dict):
        return d.get('vpcs') or d.get('vpc') or []
    return []


def list_subnets():
    d = _to_json(_hcloud(['VPC', 'ListSubnets'], region=TARGET_REGION))
    if isinstance(d, dict):
        return d.get('subnets') or []
    return []


def list_sgs():
    d = _to_json(_hcloud(['VPC', 'ListSecurityGroups'], region=TARGET_REGION))
    if isinstance(d, dict):
        return d.get('security_groups') or d.get('securityGroups') or []
    return []


def list_ecs():
    d = _to_json(_hcloud(['ECS', 'ListServersDetails'], region=TARGET_REGION))
    if isinstance(d, dict):
        return d.get('servers') or d.get('servers_detail') or []
    return []


def resolve_placeholders_from_cloud(pdata, values):
    """Fill values[<placeholder>] from live cloud state. Mutates values dict.
    Returns count of new resolutions.
    """
    count = 0

    # ── <src_id>, <sms_disk_id>, <source_ip> from SMS registration ──
    srcs = list_sms_servers()
    if srcs:
        for srv in srcs:
            name = srv.get('name', '')
            sid = srv.get('id', '')
            ip = srv.get('ip', '') or srv.get('ipv4', '')
            # disk id: SMS may not list it here; try ShowServer for disks
            disks = srv.get('disks') or []
            disk_id = ''
            if disks:
                disk_id = str(disks[0].get('id', ''))
            if sid and '<src_id>' not in values or count == 0:
                values['<src_id>'] = sid
            if name:
                values[f'<src_id_{name}>'] = sid
            if disk_id:
                values['<sms_disk_id>'] = disk_id
                values[f'<sms_disk_id_{name}>'] = disk_id
            if ip:
                if '<source_ip>' not in values:
                    values['<source_ip>'] = ip
                values[f'<source_ip_{name}>'] = ip
                pdata.setdefault('executionContext', {})['source_ips'] = {
                    name: ip, '_last_sms_resolve': True,
                }
                count += 1
            count += 1

    # ── <vpc_id> from VPC list (match our naming pattern erp-project-*) ──
    vpcs = list_vpcs()
    for v in vpcs:
        vname = v.get('name', '')
        if vname and ('erp' in vname.lower() or 'migr' in vname.lower()):
            values['<vpc_id>'] = v.get('id', '')
            count += 1
            break

    # ── <sg_id> from SG list ──
    sgs = list_sgs()
    for sg in sgs:
        sname = sg.get('name', '')
        if sname and sname not in ('default',) and ('erp' in sname.lower() or 'migr' in sname.lower()):
            values['<sg_id>'] = sg.get('id', '')
            count += 1
            break

    # ── <ecs_id>, <target_eip> from target ECS list ──
    ecs = list_ecs()
    for e in ecs:
        ename = e.get('name', '')
        if ename and ('TARGET' in ename.upper()):
            eid = e.get('id', '')
            eip = ''
            for a in (e.get('addresses') or {}).get('vpc', []):
                if a.get('addr'):
                    eip = a['addr']
                    break
            if not eip:
                pub_ip = (e.get('public_ip') or '')
                eip = pub_ip.get('public_ip_address', '') if isinstance(pub_ip, dict) else str(pub_ip)
            if eid:
                if '<ecs_id>' not in values:
                    values['<ecs_id>'] = eid
                values[f'<ecs_id_{ename}>'] = eid
                count += 1
            if eip:
                if '<target_eip>' not in values:
                    values['<target_eip>'] = eip
                values[f'<target_eip_{ename}>'] = eip
                count += 1

    # ── <task_id> from SMS task list (match migrate-* names) ──
    tasks = list_sms_tasks()
    for t in tasks:
        tname = t.get('name', '')
        if tname and tname.lower().startswith('migrate'):
            if '<task_id>' not in values:
                values['<task_id>'] = t.get('id', '')
            values[f'<task_id_{tname}>'] = t.get('id', '')
            count += 1

    return count


def resolve_command(cmd, values):
    """Final substitution pass — replace any remaining <placeholder>."""
    for ph, val in values.items():
        if val and ph in cmd:
            cmd = cmd.replace(ph, str(val))
    return cmd


def enrich_source_servers_specs(source_servers, src_region=SOURCE_REGION, src_profile='erp-src'):
    """Enrich source_servers with vcpus, ram, flavor from live source ECS.
    
    Queries hcloud ECS ShowServer for each source server to get vcpus/ram/flavor.
    Returns the enriched list (mutates in-place too).
    This is needed so _resolve_flavor_from_cloud can work deterministically
    in PHASE_4_3 without deferring to the agent lane.
    """
    if not source_servers:
        return source_servers
    for srv in source_servers:
        if not isinstance(srv, dict):
            continue
        # Skip if already enriched
        if srv.get('vcpus') and srv.get('ram'):
            continue
        _sid = srv.get('ecs_id') or srv.get('id') or ''
        if not _sid:
            continue
        try:
            r = subprocess.run(
                ['hcloud', 'ECS', 'ShowServer', '--server_id=' + str(_sid),
                 '--cli-region=' + src_region, '--cli-profile=' + src_profile],
                capture_output=True, text=True, timeout=20,
            )
            if r.returncode != 0 or not r.stdout:
                continue
            d = json.loads(r.stdout)
            _server = d.get('server', d)
            _flavor = _server.get('flavor', {})
            if isinstance(_flavor, dict):
                srv['vcpus'] = int(_flavor.get('vcpus', 0) or 0)
                srv['ram'] = int(_flavor.get('ram', 0) or 0)
                srv['flavor_id'] = _flavor.get('id', '')
            _image = _server.get('image', {})
            if isinstance(_image, dict):
                srv['os_type'] = _image.get('os_type', '')
                srv['image_id'] = _image.get('id', '')
            logger.info(f"[cloud-resolver] enriched {srv.get('name','?')}: "
                        f"vcpus={srv.get('vcpus')}, ram={srv.get('ram')}, "
                        f"flavor={srv.get('flavor_id')}")
        except Exception as e:
            logger.warning(f"[cloud-resolver] enrich failed for {_sid}: {e}")
    return source_servers
