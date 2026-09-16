"""
Deterministic-first phase executor for the ERP Migration Factory.

Architecture (self-healing loop):
  Phase run = deterministic plan-step execution (NO LLM) → verify
             → on failure: retry ×2
             → still failing: agent lane (full resource kit) heals
             → record outcome → next run learns via ExecutionHistoryStore

The plan steps carry exact hcloud/ssh commands with <placeholder> tokens.
This module resolves them from project data + live discovery, runs them,
verifies, and reports per-step results. No model calls.
"""
import json
import logging
import subprocess
import re
import time

from services.placeholder_registry import (
    classify_placeholder, extract_chained_values, PLACEHOLDER_REGISTRY,
)

logger = logging.getLogger(__name__)

PLACEHOLDER_PATTERNS = [
    # (regex, resolver-key)
    (r'<source_ip>', 'source_ip'),
    (r'<project_id>', 'mig_project_id'),
    (r'<mig_project_id>', 'mig_project_id'),
    (r'<REGION>', 'region'),
    (r'<region>', 'region'),
    (r'<profile>', 'profile'),
    (r'<AK>', 'ak'),
    (r'<SK>', 'sk'),
    (r'<AK_SK>', 'ak_sk'),
]

def _run_shell(cmd, timeout=180, env_extra=None):
    """Run a shell command; return (rc, stdout, stderr)."""
    try:
        import os
        env = dict(os.environ)
        if env_extra:
            env.update(env_extra)
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                           timeout=timeout, env=env)
        return r.returncode, (r.stdout or ''), (r.stderr or '')
    except subprocess.TimeoutExpired:
        return 124, '', 'TIMEOUT after {}s'.format(timeout)
    except Exception as e:
        return 500, '', str(e)


class DeterministicExecutor:
    def __init__(self, project_data, project_id, phase_key, target_region=None, source_region=None):
        self.pdata = project_data or {}
        self.project_id = project_id
        self.phase_key = phase_key
        # ── Derive EVERYTHING from raw project data — independent of build_plan ──
        # build_plan is a plan builder, not a runtime dependency.
        # The executor reads the same source (project_data) directly.
        proj = self.pdata if isinstance(self.pdata, dict) else {}
        # Regions: from project data, with sensible defaults
        self.source_region = source_region or proj.get('sourceRegion', proj.get('source_region', 'ap-southeast-3'))
        self.target_region = target_region or proj.get('region', proj.get('targetRegion', proj.get('target_region', 'la-north-2')))
        # CLI profiles: one hcloud profile per customer project (carries AK/SK from vault)
        # NOT derived from region name — each customer has their own credentials per region
        self.source_profile = proj.get('sourceProfile', proj.get('source_profile', 'erp-source'))
        self.target_profile = proj.get('targetProfile', proj.get('target_profile', 'internal'))
        # Target naming convention — configurable per project
        self.target_suffix = proj.get('targetSuffix', proj.get('target_suffix', '-TARGET'))

    # ── placeholder resolution ────────────────────────────────────────────
    def _resolve_ctx(self):
        """Build a resolution context from project data (already-enriched data ONLY).

        Discovery (finding IPs, project IDs) is the AGENT lane's job — it has the
        full resource kit and just proved it can do it (4.2 run: discovered EIPs,
        reset passwords, installed agents, persisted everything back). The
        deterministic lane consumes what discovery persisted:
          - targetArchitecture compute[].public_ip_address
          - mgcData.raw_inventory (source servers + IPs)
          - migProjectId / mig_project_id
        If those are missing, run_step reports 'blocked' → the phase falls to the
        agent lane. We do NOT do raw API discovery here (hcloud --cli-ak flags are
        unreliable; that's what the agent lane is for).
        """
        p = self.pdata
        source_ips = []
        source_names = {}
        source_sms_ids = {}   # name -> SMS source id (for <src_id>)
        source_sms_disk_ids = {}  # name -> SMS disk id (for <sms_disk_id>)
        target_ecs_ids = {}   # name -> target ECS id (for <ecs_id>)
        target_eips = {}      # name -> target EIP
        # PRIMARY: executionContext.source_servers — enriched by agent after phase 4.2
        # (has EIP, private_ip, sms_id, disk info per source server)
        ec = p.get('executionContext', {}) or {}
        if isinstance(ec, dict):
            for s in (ec.get('source_servers') or []):
                name = s.get('name') or ''
                ip = s.get('eip') or s.get('public_ip_address') or s.get('public_ip') or ''
                sms_id = s.get('sms_id') or s.get('smsId') or ''
                t_ecs = s.get('target_ecs_id') or s.get('targetEcsId') or s.get('vm_id') or ''
                t_eip = s.get('target_eip') or ''
                sms_disk = s.get('sms_disk_id') or s.get('sms_diskid') or ''
                if name:
                    source_names[name] = ip
                if sms_id:
                    source_sms_ids[name] = sms_id
                if sms_disk:
                    source_sms_disk_ids[name] = sms_disk
                if t_ecs:
                    target_ecs_ids[name] = t_ecs
                if t_eip:
                    target_eips[name] = t_eip
                if ip and ip not in source_ips:
                    source_ips.append(ip)
        # executionContext.target_servers / target_ecs_map — the 4.3 agent's
        # authoritative source->target mapping (persisted by the feedback loop)
        for t in (ec.get('target_servers') or ec.get('target_ecs_map') or []):
            if not isinstance(t, dict):
                continue
            nm = t.get('source_name') or t.get('name') or t.get('source') or ''
            t_id = t.get('id') or t.get('target_id') or t.get('ecs_id') or t.get('vm_id') or ''
            t_eip = t.get('eip') or t.get('public_ip') or ''
            s_id = t.get('sms_id') or t.get('source_sms_id') or ''
            d_id = t.get('sms_disk_id') or t.get('disk_id') or ''
            if nm:
                if t_id:
                    target_ecs_ids.setdefault(nm, t_id)
                if t_eip:
                    target_eips.setdefault(nm, t_eip)
                if s_id:
                    source_sms_ids.setdefault(nm, s_id)
                if d_id:
                    source_sms_disk_ids.setdefault(nm, d_id)
        ta = p.get('targetArchitecture', {}) or {}
        for s in (ta.get('compute', []) or []):
            name = s.get('name') or s.get('source_name') or ''
            ip = (s.get('public_ip_address') or s.get('public_ip') or
                  s.get('ip_address') or '')
            if name:
                source_names.setdefault(name, ip)
            if ip and ip not in source_ips:
                source_ips.append(ip)
        mgc = p.get('mgcData', {}) or {}
        for srv in ((mgc.get('raw_inventory') or {}).get('compute', []) or []):
            ip = srv.get('public_ip_address') or ''
            if ip and ip not in source_ips:
                source_ips.append(ip)
            nm = srv.get('name', '')
            if nm:
                source_names.setdefault(nm, ip)

        # Source ECS UUIDs from plan's source_resource_map (resolved at build time from live discovery)
        source_ecs_ids = {}  # name -> source ECS UUID (for DISCOVER_SOURCE_SPECS)
        srm = p.get('source_resource_map') or {}
        for _sn, _sd in srm.items():
            if _sd.get('id'):
                source_ecs_ids[_sn] = _sd['id']
                source_names.setdefault(_sn, _sd.get('ips', [''])[0] if _sd.get('ips') else '')
        # Also enrich from executionContext if agent already discovered
        for s in (ec.get('source_servers') or []):
            name = s.get('name') or ''
            src_ecs = s.get('source_ecs_id') or s.get('ecs_id') or ''
            if name and src_ecs:
                source_ecs_ids.setdefault(name, src_ecs)

        mig_project_id = (p.get('migProjectId') or p.get('mig_project_id') or
                          (ec.get('sms_migration_project_id') if isinstance(ec, dict) else '') or
                          (ec.get('mig_project_id') if isinstance(ec, dict) else '') or '')

        ak = p.get('target_huawei_ak') or p.get('source_huawei_ak') or ''
        sk = p.get('target_huawei_sk') or p.get('source_huawei_sk') or ''
        if str(ak).startswith('{'):
            try:
                from services.credential_manager import get_credential_manager
                import os
                mp = os.environ.get('VAULT_MASTER_PASSWORD', 'LatamCloudAdmin2026!')
                ak, sk = get_credential_manager(mp).decrypt_credentials(json.loads(ak))
            except Exception as e:
                logger.warning(f"[det-exec] cred decrypt failed: {e}")

        # ── CLOUD-BACKED FALLBACK (durable resolver) ──
        # If context is missing values (e.g. source_servers=[] after a reset, or a
        # fresh project), the live cloud is the authoritative answer. Query
        # SMS ListServers / ListTasks / ECS ListServersDetails / VPC ListVpcs and
        # populate the same maps. This closes the phase-output-persistence gap:
        # placeholders are resolved from reality, not from agent text formats.
        if not source_sms_ids or not source_ips or not target_ecs_ids or not target_eips:
            try:
                from services.cloud_resolver import (
                    list_sms_servers, list_ecs, list_vpcs,
                    resolve_placeholders_from_cloud,
                )
                _values = {}
                resolve_placeholders_from_cloud(p, _values)
                # Merge cloud-discovered values into the per-name maps
                for srv_c in list_sms_servers():
                    nm_c = srv_c.get('name', '')
                    if nm_c:
                        if srv_c.get('id') and nm_c not in source_sms_ids:
                            source_sms_ids[nm_c] = srv_c['id']
                            source_sms_ids.setdefault(nm_c, srv_c['id'])
                        ip_c = srv_c.get('ip', '') or srv_c.get('ipv4', '')
                        if ip_c and ip_c not in source_ips:
                            source_ips.append(ip_c)
                        if ip_c:
                            source_names.setdefault(nm_c, ip_c)
                        for d in (srv_c.get('disks') or []):
                            if d.get('id') and nm_c not in source_sms_disk_ids:
                                source_sms_disk_ids[nm_c] = str(d['id'])
                for e_c in list_ecs():
                    nm_e = e_c.get('name', '')
                    if nm_e and 'TARGET' in nm_e.upper():
                        if e_c.get('id'):
                            target_ecs_ids.setdefault(nm_e, e_c['id'])
                        for a in ((e_c.get('addresses') or {}).get('vpc', []) or []):
                            if a.get('addr'):
                                target_eips.setdefault(nm_e, a['addr'])
                if _values.get('<vpc_id>') and '<vpc_id>' not in p.get('executionContext', {}):
                    pass  # vpc id used at command level; chain_vals handles it
                logger.info(f"[det-exec] cloud-backed resolution filled "
                            f"{len(source_sms_ids)} src_ids, {len(target_ecs_ids)} target_ecs, "
                            f"{len(source_ips)} source_ips")
            except Exception as cbr_err:
                logger.warning(f"[det-exec] cloud-backed resolution failed: {cbr_err}")

        return {
            'source_ip': source_ips[0] if source_ips else '',
            'source_ips': source_ips,
            'source_names': source_names,
            'source_sms_ids': source_sms_ids,   # for <src_id>
            'source_sms_disk_ids': source_sms_disk_ids,  # for <sms_disk_id>
            'source_ecs_ids': source_ecs_ids,    # for <source_ecs_id> (source UUID)
            'target_ecs_ids': target_ecs_ids,   # for <ecs_id>
            'target_eips': target_eips,          # for <target_eip>
            'mig_project_id': mig_project_id,
            'region': self.target_region,
            'profile': f"erp-{self.project_id[:8]}" if self.project_id else '',
            'ak': ak,
            'sk': sk,
            'ak_sk': f"{ak}:{sk}",
        }

    def _resolve_flavor_from_cloud(self, target_name: str) -> str:
        """Query target region flavors and pick best match for the source server."""
        try:
            import subprocess as _sp
            _cmd = ['hcloud', 'ECS', 'ListFlavors', '--cli-region', self.target_region,
                    '--cli-profile', self.target_profile, '--limit', '200']
            _r = _sp.run(_cmd, capture_output=True, text=True, timeout=15)
            if _r.returncode != 0 or not _r.stdout:
                return ''
            _data = json.loads(_r.stdout)
            _flavors = _data.get('flavors', [])
            # Get source vCPU/RAM from plan or executionContext
            _src_vcpus = 0
            _src_ram_mb = 0
            _ec = (self.plan or {}).get('executionContext') or {}
            for _srv in (_ec.get('source_servers') or []):
                if _srv.get('name') == target_name:
                    _src_vcpus = int(_srv.get('vcpus', 0) or 0)
                    _src_ram_mb = int(_srv.get('ram', 0) or 0)
                    break
            if not _src_vcpus:
                return ''
            # Find matching flavor (same vCPU, >= RAM, not abandoned/deprecated)
            _candidates = []
            for _f in _flavors:
                _fv = int(_f.get('vcpus', 0) or 0)
                _fr = int(_f.get('ram', 0) or 0)
                _fn = _f.get('id', '')
                _fos = _f.get('os_extra_specs', {})
                if _fv == _src_vcpus and _fr >= _src_ram_mb:
                    if 'deprecated' not in _fn.lower() and 'abandoned' not in _fn.lower():
                        _candidates.append((_fn, _fr))
            if _candidates:
                # Sort by RAM (closest match first)
                _candidates.sort(key=lambda x: x[1])
                logger.info(f"[det-exec] flavor resolved: {_candidates[0][0]} (vCPU={_src_vcpus} RAM={_src_ram_mb}MB)")
                return _candidates[0][0]
        except Exception as e:
            logger.warning(f"[det-exec] flavor resolution failed: {e}")
        return ''

    def resolve_cmd(self, cmd, ctx=None, target_override=None):
        ctx = ctx or self._resolve_ctx()
        out = cmd
        # Determine WHICH source server this command targets — the plan's
        # target_resource (source server name) or the task name embedded in the cmd.
        target_name = target_override or ''
        if not target_name:
            for _tn in list(ctx.get('source_names', {}).keys()):
                if _tn in cmd or f"migrate-{_tn}" in cmd:
                    target_name = _tn
                    break
        for pattern, key in PLACEHOLDER_PATTERNS:
            val = ctx.get(key, '')
            if val:
                out = re.sub(pattern, str(val), out)
        # Per-target resolution: <src_id> = source's SMS id, <ecs_id> = the
        # TARGET ECS id, <target_eip> = target EIP, <sms_disk_id> = source disk
        # id — keyed by the source name.
        if target_name:
            sid = (ctx.get('source_sms_ids') or {}).get(target_name, '')
            tid = (ctx.get('target_ecs_ids') or {}).get(target_name, '')
            teip = (ctx.get('target_eips') or {}).get(target_name, '')
            sdid = (ctx.get('source_sms_disk_ids') or {}).get(target_name, '')
            src_ecs = (ctx.get('source_ecs_ids') or {}).get(target_name, '')
            if sid:
                out = out.replace('<src_id>', sid)
            if tid:
                out = out.replace('<ecs_id>', tid)
            if teip:
                out = out.replace('<target_eip>', teip)
            if sdid:
                out = out.replace('<sms_disk_id>', sdid)
            if src_ecs:
                out = out.replace('<source_ecs_id>', src_ecs)
                # Also resolve <ecs_id> for DISCOVER steps that need source UUID
                if '<ecs_id>' in out and not tid:
                    out = out.replace('<ecs_id>', src_ecs)
        # <source_ip> per named target: replace name-keyed tokens
        for name, ip in ctx.get('source_names', {}).items():
            out = out.replace(f'<ip_{name}>', ip)
        # <DISCOVERED_FLAVOR> — resolve by querying target region flavors
        if '<DISCOVERED_FLAVOR>' in out:
            _resolved_flavor = self._resolve_flavor_from_cloud(target_name)
            if _resolved_flavor:
                out = out.replace('<DISCOVERED_FLAVOR>', _resolved_flavor)
        return out

    # ── step execution ────────────────────────────────────────────────────
    def run_step(self, step, ctx=None, log=None, chain_vals=None):
        """Execute a single plan step deterministically. Returns result dict.

        chain_vals: dict of chained values from previous steps ({action: value})
        — substituted into placeholders that reference prior-step output.
        """
        ctx = ctx or self._resolve_ctx()
        chain_vals = chain_vals or {}
        action = step.get('action', 'UNKNOWN')
        target = step.get('target_resource', 'N/A')
        if not target or target == 'unknown' or str(target).lower() == 'n/a':
            # plan artifact without a real target (stale/empty data) — the agent
            # lane handles these; do not waste a deterministic attempt + retry.
            return {'step_id': step.get('step_id'), 'action': action,
                    'target_resource': target, 'status': 'blocked',
                    'results': [{'cmd': '', 'status': 'blocked',
                                 'error': 'No target resource (unknown) — agent lane discovers this'}]}
        cmds = step.get('commands') or []
        results = []
        for c in cmds:
            cmd = c.get('cmd') if isinstance(c, dict) else str(c)
            if not cmd:
                continue
            # Pre-flight idempotent check: if resource already exists, skip creation
            # CREATE_TARGET_ECS: check if {name}-TARGET exists in target region
            # SMS_TASK_CREATE: check if SMS task already exists for this server
            _preflight_skip = False
            if action == 'CREATE_TARGET_ECS' and cmd.startswith('hcloud'):
                _target_name = f"{target}{self.target_suffix}"
                _pf_region = self.target_region
                _pf_profile = self.target_profile
                _pf = _run_shell(f"hcloud ECS ListServersDetails --cli-region={_pf_region} --cli-profile={_pf_profile} --limit=100")
                if _pf[0] == 0:
                    import json as _json
                    try:
                        _pf_data = _json.loads(_pf[1])
                        for _s in _pf_data.get('servers', []):
                            if _s.get('name') == _target_name and _s.get('status') in ('ACTIVE', 'BUILD'):
                                _lookup_id = _s.get('id', '')
                                results.append({
                                    'cmd': f'[idempotent] {target} already exists as {_target_name}',
                                    'status': 'success',
                                    'rc': 0,
                                    'output': f'{{"id": "{_lookup_id}", "name": "{_target_name}"}}',
                                    'error': None,
                                })
                                _preflight_skip = True
                                break
                    except Exception:
                        pass  # Fall through to normal execution
            elif action == 'SMS_TASK_CREATE':
                # Check if SMS tasks already exist for this source server
                _pf = _run_shell(f"hcloud SMS ListTasks --cli-region={self.source_region} --cli-profile={self.source_profile} --limit=50")
                if _pf[0] == 0:
                    import json as _json
                    try:
                        _pf_data = _json.loads(_pf[1])
                        _existing_tasks = _pf_data.get('tasks', [])
                        # Match by source server name in task — NOT just any running task
                        for _t in _existing_tasks:
                            _t_state = _t.get('state', '')
                            _t_src = _t.get('source_server_name', '') or _t.get('name', '')
                            # Must match THIS source server name AND be in a valid state
                            if (target in _t_src or target.replace('ecs-','') in _t_src) and _t_state not in ('MIGRATE_FAIL', 'DELETED', 'ERROR'):
                                _task_id = _t.get('id', '')
                                results.append({
                                    'cmd': f'[idempotent] SMS task already exists for {target}: {_task_id[:20]} state={_t_state}',
                                    'status': 'success',
                                    'rc': 0,
                                    'output': f'{{"id": "{_task_id}", "state": "{_t_state}"}}',
                                    'error': None,
                                })
                                chain_vals['task_id'] = _task_id
                                _preflight_skip = True
                                break
                    except Exception:
                        pass
            elif action == 'SMS_TASK_START':
                # Check if SMS task for THIS server is already running/succeeded
                _pf = _run_shell(f"hcloud SMS ListTasks --cli-region={self.source_region} --cli-profile={self.source_profile} --limit=50")
                if _pf[0] == 0:
                    import json as _json
                    try:
                        _pf_data = _json.loads(_pf[1])
                        for _t in _pf_data.get('tasks', []):
                            _t_state = _t.get('state', '')
                            _t_src = _t.get('source_server_name', '') or _t.get('name', '')
                            # Must match THIS source server AND be in a running/success state
                            if (target in _t_src or target.replace('ecs-','') in _t_src) and _t_state in ('RUNNING', 'MIGRATE_SUCCESS', 'SYNCING', 'READY'):
                                _task_id = _t.get('id', '')
                                results.append({
                                    'cmd': f'[idempotent] SMS task for {target} already {_t_state}: {_task_id[:20]}',
                                    'status': 'success',
                                    'rc': 0,
                                    'output': f'{{"id": "{_task_id}", "state": "{_t_state}"}}',
                                    'error': None,
                                })
                                chain_vals['task_id'] = _task_id
                                _preflight_skip = True
                                break
                    except Exception:
                        pass
            if _preflight_skip:
                continue  # Skip the actual creation command
            if cmd.startswith('hcloud') and '--cli-profile' not in cmd:
                # Derive profile from region using project config, not hardcoded mapping
                if f'--cli-region={self.target_region}' in cmd:
                    cmd = cmd.replace('hcloud', f'hcloud --cli-profile={self.target_profile}', 1)
                elif f'--cli-region={self.source_region}' in cmd:
                    cmd = cmd.replace('hcloud', f'hcloud --cli-profile={self.source_profile}', 1)
                else:
                    # Fallback: unknown region → use target profile
                    cmd = cmd.replace('hcloud', f'hcloud --cli-profile={self.target_profile}', 1)
            if '<' in cmd and '>' in cmd:
                resolved = cmd
                # First substitute chained values from prior steps
                for ph in re.findall(r'<[^>]+>', resolved):
                    strat, source = classify_placeholder(ph)
                    if strat == 'chain':
                        val = chain_vals.get(source, '')
                        if val:
                            resolved = resolved.replace(ph, val)
                # Then context-based substitution
                resolved = self.resolve_cmd(resolved, ctx, target_override=target)
                # Classify any remaining placeholders — secrets/env NEVER run
                remaining = re.findall(r'<[^>]+>', resolved)
                blocked_reason = None
                for ph in remaining:
                    strat, source = classify_placeholder(ph)
                    if strat == 'env':
                        blocked_reason = f'SECRET placeholder {ph} in command — inject via env/auth.cfg, never inline'
                        break
                    elif strat == 'chain':
                        blocked_reason = f'Chained placeholder {ph} unresolved (prior step output missing)'
                        break
                    elif strat == 'plan':
                        blocked_reason = f'Plan placeholder {ph} needs plan/agent data'
                        break
                if blocked_reason:
                    results.append({'cmd': resolved[:120], 'status': 'blocked',
                                    'error': blocked_reason})
                    continue
            else:
                resolved = cmd
            rc, out, err = _run_shell(resolved)
            # hcloud CLI returns rc=0 even on API errors — check output for error markers
            _combined = out + err
            _api_error = any(marker in _combined for marker in 
                ['APIGW.', 'USE_ERROR', '[USE_ERROR]', 'IAM.0'])
            # Idempotent success: resource already exists — treat as success, capture ID
            _idempotent_hit = any(marker in _combined for marker in
                ['already exist', 'already Exist', 'VPC.9902', 'ECS.0004'])
            if _idempotent_hit and rc == 0:
                ok = True
                # For "already exists", query the resource to get its ID for chain extraction
                _lookup_id = ''
                _region = (resolved.split('--cli-region=')[1].split()[0] if '--cli-region=' in resolved else self.target_region)
                if 'CREATE_SG' in action or 'CreateSecurityGroup' in resolved:
                    # Find the migration SG by name (sg-migration), not the default SG
                    _lr = _run_shell(f'hcloud VPC ListSecurityGroups --cli-region={_region} --cli-profile={self.target_profile} --limit=50')
                    if _lr[0] == 0:
                        import re as _re
                        # Look for sg-migration specifically
                        for _m in _re.finditer(r'"name"\s*:\s*"([^"]+)"[^}]*?"id"\s*:\s*"([0-9a-f-]{36})"', _lr[1]):
                            if 'migration' in _m.group(1).lower():
                                _lookup_id = _m.group(2); break
                        if not _lookup_id:
                            # Fallback: first non-default SG
                            for _m in _re.finditer(r'"name"\s*:\s*"([^"]+)"[^}]*?"id"\s*:\s*"([0-9a-f-]{36})"', _lr[1]):
                                if _m.group(1) != 'default':
                                    _lookup_id = _m.group(2); break
                elif 'CREATE_VPC' in action:
                    _lr = _run_shell(f'hcloud VPC ListVpcs --cli-region={_region} --cli-profile={self.target_profile} --limit=50')
                    if _lr[0] == 0:
                        import re as _re
                        _m = _re.search(r'"id"\s*:\s*"([0-9a-f-]{36})"', _lr[1])
                        if _m: _lookup_id = _m.group(1)
                elif 'CREATE_EIP' in action:
                    _lr = _run_shell(f'hcloud EIP ListPublicips --cli-region={_region} --cli-profile={self.target_profile} --limit=50')
                    if _lr[0] == 0:
                        import re as _re
                        _m = _re.search(r'"id"\s*:\s*"([0-9a-f-]{36})"', _lr[1])
                        if _m: _lookup_id = _m.group(1)
                if _lookup_id:
                    out = f'{{"id": "{_lookup_id}"}}'  # Inject ID for chain extraction
            else:
                # Non-idempotent API errors (error_msg without already-exists)
                _api_error = _api_error or ('error_msg' in _combined and not _idempotent_hit)
                ok = rc == 0 and not _api_error
            results.append({
                'cmd': resolved[:160],
                'status': 'success' if ok else 'failed',
                'rc': rc,
                'output': (out or err)[:400],
                'error': ('API error: ' + _combined[:80]) if (not ok and _api_error) else None,
            })

        # ── SMS-specific post-validation ──
        # SMS_AGENT_INSTALL: verify agent connected + checks OK from ListServers output
        if action == 'SMS_AGENT_INSTALL' and results and results[-1].get('status') == 'success':
            _sms_out = results[-1].get('output', '')
            _server_name = target
            try:
                import json as _json
                _data = _json.loads(_sms_out) if _sms_out.strip().startswith('{') else None
                if _data and 'source_servers' in _data:
                    _srv = next((s for s in _data['source_servers'] if s.get('name') == _server_name), None)
                    if _srv:
                        _connected = _srv.get('connected', False)
                        _checks_ok = all(c.get('result') == 'OK' for c in _srv.get('checks', []))
                        if _connected and _checks_ok:
                            results[-1]['output'] = f"Agent OK: connected={_connected}, {len(_srv.get('checks',[]))} checks OK"
                            # Store SMS server ID for chain
                            _sms_id = _srv.get('id', '')
                            if _sms_id:
                                chain_vals[f'sms_id:{_server_name}'] = _sms_id
                        else:
                            results[-1]['status'] = 'failed'
                            results[-1]['error'] = f"Agent not ready: connected={_connected}, checks_ok={_checks_ok}"
            except Exception:
                pass  # Fall through to agent lane if parse fails

        # MIGRATION_PROJECT_CONFIG: verify project settings from ListMigprojects output
        if action == 'MIGRATION_PROJECT_CONFIG' and results and results[-1].get('status') == 'success':
            _mp_out = results[-1].get('output', '')
            try:
                import json as _json
                _data = _json.loads(_mp_out) if _mp_out.strip().startswith('{') else None
                if _data and 'migprojects' in _data:
                    _proj = _data['migprojects'][0] if _data['migprojects'] else None
                    if _proj:
                        _syncing = _proj.get('syncing', True)
                        _public_ip = _proj.get('use_public_ip', False)
                        _exist_srv = _proj.get('exist_server', False)
                        if not _syncing and _public_ip and _exist_srv:
                            results[-1]['output'] = f"Project OK: syncing={_syncing}, use_public_ip={_public_ip}, exist_server={_exist_srv}"
                            _mp_id = _proj.get('id', '')
                            if _mp_id:
                                chain_vals['mig_project_id'] = _mp_id
                        else:
                            results[-1]['status'] = 'failed'
                            results[-1]['error'] = f"Project config wrong: syncing={_syncing}, use_public_ip={_public_ip}, exist_server={_exist_srv}"
            except Exception:
                pass
        all_ok = all(r.get('status') == 'success' for r in results)
        entry = {
            'step_id': step.get('step_id'),
            'action': action,
            'target_resource': target,
            'status': 'success' if all_ok else 'failed',
            'results': results,
        }
        if log:
            if all_ok:
                log(f'[det] {action} on {target}: ✓')
            else:
                # Show first meaningful error (skip "blocked" which is expected)
                first_err = None
                for r in results:
                    err = r.get('error', '') or ''
                    if err and 'blocked' not in err.lower() and 'placeholder' not in err.lower():
                        first_err = err[:60]
                        break
                if not first_err:
                    for r in results:
                        err = r.get('error', '') or ''
                        if err:
                            first_err = err[:40]
                            break
                if first_err:
                    log(f'[det] {action} on {target}: ✗ ({first_err})')
                else:
                    log(f'[det] {action} on {target}: ✗')
        return entry

    def run_phase(self, plan, log=None):
        """Run ALL plan steps for this phase. Returns (success, entries, failures).

        Chain-aware: runs steps in order; captures output values from each step
        (vpc_id, sg_id, ecs_id, task_id...) and substitutes them into later
        steps' <placeholders>. Secret placeholders (<AK>, <SK>...) are NEVER
        substituted — they mark 'env' strategy and report blocked to force the
        agent lane to use auth.cfg / env injection instead.

        Optimization: after VPC completes, runs independent steps (Subnet, SG, EIP)
        in parallel using ThreadPoolExecutor since they only need vpc_id.
        """
        steps = [s for s in (plan.get('steps') or []) if s.get('phase') == self.phase_key]
        if not steps:
            return False, [], 'no-steps'
        ctx = self._resolve_ctx()
        chain_vals = {}   # {action: value} — from previous step outputs
        entries = []
        failures = []
        resources_deployed = []  # [{type, name, id, status, details}] for UI rendering
        
        # Phase 1: Run VPC step first (everything depends on it)
        # Phase 2: Run independent steps in parallel (Subnet, SG, EIPs)
        # Phase 3: Run dependent steps sequentially (SG rules need sg_id)
        _vpc_done = False
        _parallel_batch = []
        _sequential_rest = []
        
        for s in steps:
            action = s.get('action', '')
            if not _vpc_done and action == 'CREATE_VPC':
                # Must run first
                e = self.run_step(s, ctx, log, chain_vals)
                entries.append(e)
                if e.get('results'):
                    for r in e['results']:
                        if r.get('output'):
                            cv = extract_chained_values(action, r['output'])
                            if cv: chain_vals.update(cv)
                if e['status'] != 'success': failures.append(e)
                _vpc_done = True
            elif _vpc_done and action in ('CREATE_SUBNET', 'CREATE_SG', 'CREATE_EIP'):
                _parallel_batch.append(s)
            else:
                _sequential_rest.append(s)
        
        # Phase 2: Parallel execution of independent steps
        if _parallel_batch:
            from concurrent.futures import ThreadPoolExecutor, as_completed
            _par_results = {}
            with ThreadPoolExecutor(max_workers=min(len(_parallel_batch), 4)) as pool:
                futures = {pool.submit(self.run_step, s, ctx, log, dict(chain_vals)): s 
                           for s in _parallel_batch}
                for fut in as_completed(futures):
                    s = futures[fut]
                    e = fut.result()
                    _par_results[id(s)] = e
            # Collect in original order
            for s in _parallel_batch:
                e = _par_results.get(id(s))
                if e:
                    entries.append(e)
                    if e.get('results'):
                        for r in e['results']:
                            if r.get('output'):
                                cv = extract_chained_values(s.get('action', ''), r['output'])
                                if cv: chain_vals.update(cv)
                    if e['status'] != 'success': failures.append(e)
        
        # Phase 3: Sequential dependent steps (SG rules, etc.)
        for s in _sequential_rest:
            e = self.run_step(s, ctx, log, chain_vals)
            entries.append(e)
            if e.get('results'):
                for r in e['results']:
                    if r.get('output'):
                        cv = extract_chained_values(s.get('action', ''), r['output'])
                        if cv: chain_vals.update(cv)
            if e['status'] != 'success': failures.append(e)
            else:
                # Collect deployed resources for UI rendering
                _action = s.get('action', '')
                _target = s.get('target_resource', '')
                _out = e.get('results', [{}])[-1].get('output', '') if e.get('results') else ''
                _res = {'type': _action, 'name': _target, 'id': '', 'status': 'deployed', 'details': ''}
                # Extract ID from output
                import re as _re_id
                _id_m = _re_id.search(r'"id"\s*:\s*"([0-9a-f-]{36})"', _out)
                if _id_m:
                    _res['id'] = _id_m.group(1)
                # Extract additional details
                _ip_m = _re_id.search(r'"public_ip"\s*:\s*"([\d.]+)"', _out)
                _priv_m = _re_id.search(r'"private_ip"\s*:\s*"([\d.]+)"', _out)
                _state_m = _re_id.search(r'"state"\s*:\s*"(\w+)"', _out)
                if _ip_m: _res['details'] += f"pub={_ip_m.group(1)} "
                if _priv_m: _res['details'] += f"priv={_priv_m.group(1)} "
                if _state_m: _res['details'] += f"state={_state_m.group(1)}"
                _res['details'] = _res['details'].strip()
                resources_deployed.append(_res)
        
        success = len(failures) == 0
        return success, entries, failures, resources_deployed
