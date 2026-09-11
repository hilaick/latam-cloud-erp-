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
    def __init__(self, project_data, project_id, phase_key, target_region='la-north-2'):
        self.pdata = project_data or {}
        self.project_id = project_id
        self.phase_key = phase_key
        self.target_region = target_region

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
        # PRIMARY: executionContext.source_servers — enriched by agent after phase 4.2
        # (has EIP, private_ip, sms_id, disk info per source server)
        ec = p.get('executionContext', {}) or {}
        if isinstance(ec, dict):
            for s in (ec.get('source_servers') or []):
                name = s.get('name') or ''
                ip = s.get('eip') or s.get('public_ip_address') or s.get('public_ip') or ''
                if name:
                    source_names[name] = ip
                if ip and ip not in source_ips:
                    source_ips.append(ip)
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

        return {
            'source_ip': source_ips[0] if source_ips else '',
            'source_ips': source_ips,
            'source_names': source_names,
            'mig_project_id': mig_project_id,
            'region': self.target_region,
            'profile': f"erp-{self.project_id[:8]}" if self.project_id else '',
            'ak': ak,
            'sk': sk,
            'ak_sk': f"{ak}:{sk}",
        }

    def resolve_cmd(self, cmd, ctx=None):
        ctx = ctx or self._resolve_ctx()
        out = cmd
        for pattern, key in PLACEHOLDER_PATTERNS:
            val = ctx.get(key, '')
            if val:
                out = re.sub(pattern, str(val), out)
        # <source_ip> per named target: replace name-keyed tokens
        for name, ip in ctx.get('source_names', {}).items():
            out = out.replace(f'<ip_{name}>', ip)
        return out

    # ── step execution ────────────────────────────────────────────────────
    def run_step(self, step, ctx=None, log=None):
        """Execute a single plan step deterministically. Returns result dict."""
        ctx = ctx or self._resolve_ctx()
        action = step.get('action', 'UNKNOWN')
        target = step.get('target_resource', 'N/A')
        cmds = step.get('commands') or []
        results = []
        for c in cmds:
            cmd = c.get('cmd') if isinstance(c, dict) else str(c)
            if not cmd:
                continue
            if '<' in cmd and '>' in cmd:
                resolved = self.resolve_cmd(cmd, ctx)
                if '<' in resolved and '>' in resolved:
                    # still has unresolved placeholders — cannot run deterministically
                    results.append({'cmd': cmd[:120], 'status': 'blocked',
                                    'error': 'Unresolved placeholders — needs discovery/agent lane'})
                    continue
            else:
                resolved = cmd
            rc, out, err = _run_shell(resolved)
            ok = rc == 0 and 'USE_ERROR' not in out and '[USE_ERROR]' not in out
            results.append({
                'cmd': resolved[:160],
                'status': 'success' if ok else 'failed',
                'rc': rc,
                'output': (out or err)[:400],
            })
        all_ok = all(r.get('status') == 'success' for r in results)
        entry = {
            'step_id': step.get('step_id'),
            'action': action,
            'target_resource': target,
            'status': 'success' if all_ok else 'failed',
            'results': results,
        }
        if log:
            log(f'[det] {action} on {target}: {"✓" if all_ok else "✗"}')
        return entry

    def run_phase(self, plan, log=None):
        """Run ALL plan steps for this phase. Returns (success, entries, failures)."""
        steps = [s for s in (plan.get('steps') or []) if s.get('phase') == self.phase_key]
        if not steps:
            return False, [], 'no-steps'
        ctx = self._resolve_ctx()
        entries = []
        failures = []
        for s in steps:
            e = self.run_step(s, ctx, log)
            entries.append(e)
            if e['status'] != 'success':
                failures.append(e)
        success = len(failures) == 0
        return success, entries, failures
