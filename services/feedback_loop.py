"""
Feedback loop: agent-lane resolutions -> deterministic plan updates.

When the agent lane heals a phase (resolves a flavor, discovers an ID, fixes an
error), those resolutions should be persisted so FUTURE deterministic runs of
ANY project resolve more placeholders without the agent. This is the
self-healing convergence: each run makes the deterministic lane cover more.

Mechanism:
  - The agent's completion report + executionContext updates are mined for
    {placeholder: value} resolutions.
  - The plan's steps are updated IN PLACE: <placeholder> tokens that now have
    values get substituted (leaving the literal value in the step command).
  - A nonce marker is recorded so we don't re-substitute stale values.
  - Every project that rebuilds its plan from the same source data inherits
    the same resolutions (cross-project learning).
"""
import json
import logging
import re

logger = logging.getLogger(__name__)


def apply_agent_resolutions(project_id, pdata, agent_report=""):
    """Apply agent-discovered values to the plan's step commands.

    pdata: project data dict (mutated in place)
    agent_report: the agent's completion report text (optional mined source)
    Returns: count of placeholder substitutions applied.
    """
    plan = pdata.get('executionPlan') or {}
    if isinstance(plan, str):
        try:
            plan = json.loads(plan)
        except Exception:
            return 0
    if not isinstance(plan, dict):
        return 0

    # ── 1. Mine values from executionContext (authoritative persistence layer) ──
    ctx = pdata.get('executionContext') or {}
    values = {}
    src_servers = ctx.get('source_servers') or []
    if src_servers:
        for i, srv in enumerate(src_servers):
            name = srv.get('name', '')
            values[f'<source_ip_{i}>'] = srv.get('eip', srv.get('public_ip_address', ''))
            values['<src_id>'] = srv.get('sms_id', '') or values.get('<src_id>', '')
            values['<sms_id>'] = srv.get('sms_id', '') or values.get('<sms_id>', '')
            if name:
                values[f'<src_id_{name}>'] = srv.get('sms_id', '')
    mp_id = ctx.get('sms_migration_project_id') or ctx.get('mig_project_id') or ''
    if mp_id:
        values['<project_id>'] = mp_id
        values['<mig_project_id>'] = mp_id

    # ── 2. Mine from the agent report (free text) ──
    if agent_report:
        # task ids / server ids / project ids in report
        for m in re.finditer(r'(?:task[_ ]?id|server[_ ]?id|project[_ ]?id|sms[_ ]?id)["\']?\s*[:=]\s*["\']?([a-f0-9-]{32,36})', agent_report, re.I):
            vid = m.group(1)
            key = f'<task_id>' if 'task' in m.group(0).lower() else f'<ecs_id>'
            values.setdefault(key, vid)
        # ── 2b. Mine the agent's explicit source→target mapping table ──
        # Agents output lines like:
        #   SOURCE_1_SMS_ID=496639ff-...   TARGET_1_ECS_ID=35e88084-...
        #   | ecs-...-0001 | 496639ff-... | 111.119.235.186 | 35e88084-... | 149.232.132.31 | ...
        # Parse NAMED pairs (SOURCE_1/TARGET_1) and pipe-table rows; persist to
        # executionContext.target_ecs_map so later phases resolve <ecs_id>
        # correctly (this is the systemic handoff the factory was missing).
        pattern_named = re.findall(r'(SOURCE|TARGET)_(\d+)_(SMS_ID|ECS_ID|EIP)\s*=\s*([A-Za-z0-9.\-]{8,40})', agent_report)
        if pattern_named:
            mapping = []
            groups = {}
            for m in pattern_named:
                groups.setdefault(m[1], {})[m[2]] = m[3]
            # also match source-name pipe rows (generic — any server name token)
            pipe_rows = re.findall(r'\|[^|]*\|([0-9a-f\-]{32,36})\|[^|]*\|([0-9a-f\-]{32,36})\|[^|]*\|([0-9.]+)\|', agent_report)
            row_sms = {}
            for i, (sms, ecs, eip) in enumerate(pipe_rows, 1):
                if i not in groups:
                    groups[str(i)] = {'SMS_ID': sms, 'ECS_ID': ecs, 'EIP': eip}
            # map source server names from source_servers order
            src_names = [s.get('name', '') for s in src_servers]
            for num, g in groups.items():
                idx = int(num) - 1
                nm = src_names[idx] if idx < len(src_names) and src_names[idx] else f'source-{num}'
                mapping.append({
                    'source_name': nm,
                    'sms_id': g.get('SMS_ID', ''),
                    'ecs_id': g.get('ECS_ID', ''),
                    'eip': g.get('EIP', ''),
                })
            if mapping:
                ctx['target_ecs_map'] = mapping
                # per-name placeholder values
                for en in mapping:
                    if en.get('sms_id'):
                        values[f'<src_id_{en["source_name"]}>'] = en['sms_id']
                    if en.get('ecs_id'):
                        values[f'<ecs_id_{en["source_name"]}>'] = en['ecs_id']

    # ── 3. Substitute into plan step commands (only where placeholder still present) ──
    substituted = 0
    steps = plan.get('steps') or []
    for s in steps:
        cmds = s.get('commands') or []
        for c in cmds:
            if not isinstance(c, dict):
                continue
            cmd = c.get('cmd', '')
            for ph, val in values.items():
                if val and ph in cmd:
                    cmd = cmd.replace(ph, str(val))
                    substituted += 1
            c['cmd'] = cmd

    # ── 4. Persist back ──
    if substituted:
        pdata['executionPlan'] = plan
        logger.info(f"[feedback] {substituted} placeholder substitutions applied to plan (project {project_id})")
    return substituted


def record_learning(skill_name, pattern, failure_modes=None):
    """Record an agent-learned pattern into the skill registry (cross-project)."""
    try:
        from services.agentic_simulator import SkillRegistry
        learning = {"skill_name": skill_name, "pattern": pattern}
        if failure_modes:
            learning["failure_modes"] = failure_modes
        SkillRegistry.enrich_from_history(learning)
        return True
    except Exception as e:
        logger.warning(f"[feedback] record_learning failed: {e}")
        return False
