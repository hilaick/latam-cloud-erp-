"""
Orchestration Engine — Background 8-phase migration pipeline.

Runs the full agentic pipeline in a background thread so:
- The HTTP request returns immediately (fire-and-poll)
- Users can switch projects / navigate away — execution continues server-side
- Multiple projects execute in parallel (each in its own thread)
- Per-project lock prevents duplicate concurrent runs
- No hard phase timeouts — phases run as long as progressing
- Pipeline continues on failure (resilient mode)
- Engine minions: pre-warming, cloud cache, concurrent phases

API contract:
  POST /api/execution/<project_id>/orchestrate   → starts pipeline, returns immediately
  GET  /api/execution/<project_id>/orchestrate/status → polls live status
  POST /api/execution/<project_id>/orchestrate/resume → resume from failed phase
  POST /api/execution/<project_id>/orchestrate/rollback → destroy infra, reset state
"""

import json
import os
import re
import sys
import time
import logging
import threading
import subprocess
from datetime import datetime, timezone
from services.engine_minions import (
    get_cloud_cache, PhasePreWarmer, ConcurrentPhaseRunner,
    get_concurrent_group, CONCURRENT_PHASE_GROUPS, PHASE_PREWARM_MAP,
)

logger = logging.getLogger(__name__)

# ── Per-project lock registry ──
# Maps project_id → threading.Lock() so only one pipeline runs per project
_project_locks = {}
_project_locks_guard = threading.Lock()

# ── Running pipeline registry ──
# Maps project_id → { phase, status, log, started_at, thread }
_running_pipelines = {}

PIPELINE_TIMEOUT_SECONDS = 7200  # 2h hard ceiling per phase (safety net only; phases self-complete or continue on failure)


def _get_project_lock(project_id):
    """Get or create a per-project lock."""
    with _project_locks_guard:
        if project_id not in _project_locks:
            _project_locks[project_id] = threading.Lock()
        return _project_locks[project_id]


def is_pipeline_running(project_id):
    """Check if a pipeline is currently running for this project."""
    info = _running_pipelines.get(project_id)
    if not info:
        return False
    return info.get('status') == 'running'


def get_pipeline_status(project_id):
    """Get the current status of a pipeline for a project."""
    return _running_pipelines.get(project_id, {
        'status': 'idle',
        'completed_phases': [],
        'failed_phase': None,
        'log': [],
        'phase_status': {},
    })


# ── The 7-phase chain definition ──

PIPELINE_PHASES = [
    {
        'phase': 'PHASE_4_1',
        'label': 'Wave 0: Network & Identity Foundation',
        'goal': 'Validate and prepare the Wave 0 network fabric: provision isolated Transit VPC, subnets, security groups, and identity foundation via Terraform. Confirm all prerequisites for the migration landing zone.',
    },
    {
        'phase': 'PHASE_4_2',
        'label': 'Vector-Aware OS Pre-Flight',
        'goal': 'Run OS pre-flight diagnostics: validate source OS constraints against target cloud availability. Check that quoted flavors are in stock and flag any mismatches requiring Change Requests.',
    },
    {
        'phase': 'PHASE_4_3',
        'label': 'Build App Landing Zone',
        'goal': 'Provision the application landing zone: deploy target VPC, ECS instances, and empty PaaS databases. Confirm infrastructure matches the approved Target Architecture from Phase 2.4.',
    },
    {
        'phase': 'PHASE_4_4',
        'label': 'Deploy Data Plane Agents',
        'goal': 'Deploy SMS and DRS migration agents across the established Wave 0 network. Verify agent health, connectivity to source and target, and prepare for data synchronization.',
    },
    {
        'phase': 'PHASE_4_5',
        'label': 'Continuous Sync Monitor',
        'goal': 'Monitor data synchronization progress. Confirm byte-by-byte replication is complete for all volumes. Report sync percentages and estimated time to cutover readiness.',
    },
    {
        'phase': 'PHASE_4_6',
        'label': 'Cold Cutover & VPC Promotion',
        'goal': 'Execute cold cutover procedure: sever on-premises connections, promote target VPC bindings, and validate application reachability on the new infrastructure.',
    },
    {
        'phase': 'PHASE_4_7',
        'label': 'Teardown & Garbage Collection',
        'goal': 'Destroy transient migration resources: factory VMs, staging EIPs, and temporary disks. Confirm PPU costs drop to quoted baseline. Verify no orphaned resources remain.',
    },
]


REDACT_PATTERNS = [
    # Huawei Cloud AK/SK pairs + source credentials (exact known prefixes)
    (r'(HPUAQH|AKIA|LTAI|DWO)[A-Za-z0-9]{10,}', '<AK>'),
    (r'(?i)\b(?:ak|sk|access[_-]?key|secret[_-]?key)\b\s*[=:]\s*\S+', '<KEY_ASSIGNMENT>'),
    # The source SK pattern is distinctive (32-char lowercase alnum after the AK)
    (r'\bHPUAQH\w*\s+[a-z0-9]{32}\b', '<AK> <SK>'),
    # Long mixed-case secrets only if they look like keys (no hyphens/name chars)
    (r'\b[A-Za-z0-9]{32,40}\b(?![\w\-]*\-(?:TARGET|REFRESH))', '<SECRET>'),
]
def redact_secrets(text: str) -> str:
    """Redact cloud credentials and long secrets from any log/streamed line.

    Deliberately conservative: does NOT redact UUIDs, server names
    (ecs-...-0001), paths, or task ids — only tokens that look like
    credentials (AK/SK pairs, long mixed-case alnum keys).
    """
    if not text:
        return text
    out = text
    for pat, repl in REDACT_PATTERNS:
        out = re.sub(pat, repl, out)
    return out


def _simulate_with_failure(project_id, pdata, phase_key, error_text):
    """Re-run the simulation with the failure injected as context.

    Returns a short string of alternative approaches mined from the
    skill registry + execution history (the same sources the simulator
    uses), scoped to the failed phase. This is the 'pause and go back
    to simulation' piece of the troubleshoot loop.
    """
    import json
    result_parts = []
    try:
        # 1. Query execution history for similar failures
        from services.agentic_simulator import ExecutionHistoryStore
        hist = list(getattr(ExecutionHistoryStore, '_history', []) or [])
        relevant = [h for h in hist[-50:] if any(t in str(h).lower() for t in [
            '0515', 'blocker', 'fail', phase_key.lower().replace('phase_4_', ''),
            error_text and error_text[:30].lower() or ''
        ])]
        if relevant:
            result_parts.append(f"Relevant past outcomes ({len(relevant)}):")
            for h in relevant[-5:]:
                result_parts.append(f"  - {h.get('project','?')}/{h.get('server_name','?')}: "
                                    f"{h.get('outcome','?')} [{str(h.get('error',''))[:100]}]")
    except Exception:
        pass
    try:
        # 2. Read the skill commands relevant to this phase
        from services.agentic_simulator import SkillRegistry
        sr = SkillRegistry.get_instance() if hasattr(SkillRegistry, 'get_instance') else SkillRegistry()
        skills = sr.get_skills_for_server('generic', phase_key) if hasattr(sr, 'get_skills_for_server') else []
        if not skills:
            skills = sr.list_skills() if hasattr(sr, 'list_skills') else []
        if skills:
            result_parts.append(f"\nRelevant skills ({min(len(skills),3)} shown):")
            for sk in skills[:3]:
                cmds = sk.get('commands', []) if isinstance(sk, dict) else []
                if cmds:
                    result_parts.append(f"  - {sk.get('name','skill')}: {cmds[0][:120]}")
    except Exception:
        pass
    return '\n'.join(result_parts) if result_parts else ''


# ═══════════════════════════════════════════════════════════════════
#  PHASE OUTPUTS — Checkpoint-Resilience Layer
#  Each phase persists its outputs to the PhaseState table on completion.
#  The next phase reads these outputs from DB instead of in-memory state.
#  Resume sweep reads the last completed phase and starts from the next.
# ═══════════════════════════════════════════════════════════════════

def _extract_phase_outputs(phase_key, agent_response, enriched_context, project_id):
    """Extract structured outputs from a completed phase.
    
    Parses the agent response and enriched context to capture resource IDs,
    specs, and other outputs that the next phase needs.
    """
    outputs = {'phase': phase_key}
    resp = (agent_response or '').lower()
    
    try:
        ec = enriched_context or {}
        # enriched_context may be a string (not a dict) — handle gracefully
        if isinstance(ec, str):
            ec = {}
        
        if phase_key == 'PHASE_4_1':
            # Network: VPC, Subnet, SG, EIPs — extract from agent response
            import re as _re
            _resp = agent_response or ''
            vpc_ids = _re.findall(r'vpc[_\s-]?id[:\s]*([0-9a-f]{8}-[0-9a-f]{4}[0-9a-f-]+)', _resp, _re.IGNORECASE)
            if not vpc_ids:
                vpc_ids = _re.findall(r'VPC[:\s]*([0-9a-f]{8}-[0-9a-f]{4}[0-9a-f-]+)', _resp, _re.IGNORECASE)
            if vpc_ids:
                outputs['vpc_id'] = vpc_ids[0]
            subnet_ids = _re.findall(r'subnet[_\s-]?id[:\s]*([0-9a-f]{8}-[0-9a-f]{4}[0-9a-f-]+)', _resp, _re.IGNORECASE)
            if subnet_ids:
                outputs['subnet_id'] = subnet_ids[0]
            sg_ids = _re.findall(r'(?:security[_\s]?group|sg)[_\s-]?id[:\s]*([0-9a-f]{8}-[0-9a-f]{4}[0-9a-f-]+)', _resp, _re.IGNORECASE)
            if sg_ids:
                outputs['sg_id'] = sg_ids[0]
            # Also extract from ec dict if available
            outputs['vpc_id'] = outputs.get('vpc_id') or ec.get('vpc_id', '')
            outputs['subnet_id'] = outputs.get('subnet_id') or ec.get('subnet_id', '')
            outputs['sg_id'] = outputs.get('sg_id') or ec.get('sg_id', '')
            outputs['eip_ids'] = ec.get('eip_ids', [])
            outputs['eip_addresses'] = ec.get('eip_addresses', [])
            
        elif phase_key == 'PHASE_4_2':
            # Source Prep: SMS source servers, migration project
            outputs['source_servers'] = ec.get('source_servers', [])
            outputs['sms_migration_project_id'] = ec.get('sms_migration_project_id', '')
            # Extract SMS IDs from agent response
            import re as _re
            sms_ids = _re.findall(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', agent_response or '')
            if sms_ids:
                outputs['sms_source_ids'] = sms_ids
                
        elif phase_key == 'PHASE_4_3':
            # Target ECS: server IDs, flavors, EIPs
            outputs['target_servers'] = ec.get('target_servers', [])
            outputs['target_ecs_ids'] = ec.get('target_ecs_ids', [])
            outputs['target_eip_ids'] = ec.get('target_eip_ids', [])
            
        elif phase_key == 'PHASE_4_4':
            # Data Sync: SMS task IDs
            outputs['sms_tasks'] = ec.get('sms_tasks', [])
            import re as _re
            task_ids = _re.findall(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', agent_response or '')
            if task_ids:
                outputs['sms_task_ids'] = task_ids
                
        elif phase_key == 'PHASE_4_5':
            # Monitor: final sync status
            outputs['sync_complete'] = 'migrate_success' in resp or 'replications complete' in resp
            outputs['final_sync_status'] = ec.get('sms_sync_status', {})
            
        elif phase_key == 'PHASE_4_6':
            # Cutover: target server status
            outputs['cutover_complete'] = 'cutover' in resp and ('success' in resp or 'complete' in resp)
            
        elif phase_key == 'PHASE_4_7':
            # Reconciliation: spec comparison results
            outputs['reconciliation'] = ec.get('reconciliation_results', {})
            
        elif phase_key == 'PHASE_4_8':
            # Teardown: resources cleaned
            outputs['teardown_complete'] = True
            
    except Exception as e:
        outputs['_extraction_error'] = str(e)
    
    return outputs


def _load_phase_outputs(project_id, phase_key):
    """Load persisted outputs for a specific phase from DB."""
    try:
        from models import PhaseState
        ps = PhaseState.query.filter_by(
            project_id=project_id, phase=phase_key
        ).first()
        if ps and ps.status == 'completed':
            return ps.get_outputs()
    except Exception:
        pass
    return {}


def _load_all_phase_outputs(project_id):
    """Load ALL persisted phase outputs for a project from DB.
    Returns dict of phase_key → outputs_dict.
    """
    result = {}
    try:
        from models import PhaseState
        for ps in PhaseState.query.filter_by(
            project_id=project_id
        ).all():
            if ps.status == 'completed':
                result[ps.phase] = ps.get_outputs()
    except Exception:
        pass
    return result


def _get_last_completed_phase(project_id):
    """Find the last completed phase for a project from DB.
    Returns (last_phase_key, all_completed_phases_list).
    """
    completed = []
    last = None
    try:
        from models import PhaseState
        for ps in PhaseState.query.filter_by(
            project_id=project_id, status='completed'
        ).order_by(PhaseState.completed_at).all():
            completed.append(ps.phase)
            last = ps.phase
    except Exception:
        pass
    return last, completed


def _build_resume_context(project_id, from_phase):
    """Build enriched context for resume by loading all previous phase outputs.
    This replaces in-memory pipeline_info with DB-persisted state.
    """
    all_outputs = _load_all_phase_outputs(project_id)
    ctx_lines = ['## RESUME CONTEXT — Previous Phase Outputs (from DB)']
    for pk in sorted(all_outputs.keys()):
        outs = all_outputs[pk]
        ctx_lines.append(f'\n### {pk} outputs:')
        # Summarize key fields (don't dump entire JSON)
        for k, v in outs.items():
            if k == 'phase':
                continue
            if isinstance(v, list) and len(v) > 5:
                ctx_lines.append(f'- {k}: [{len(v)} items] first={v[0]}')
            elif isinstance(v, dict) and len(str(v)) > 200:
                ctx_lines.append(f'- {k}: {{...}} ({len(v)} keys)')
            else:
                ctx_lines.append(f'- {k}: {v}')
    ctx_lines.append(f'\n--- Resume from {from_phase} ---')
    return '\n'.join(ctx_lines)


def _spawn_hermes_agent(goal, context, project_id, phase, log_cb=None, prewarmer=None, prewarm_skills=None):
    """Spawn a Hermes agent for a single phase via the delegate-task API.

    This calls the same backend logic as /api/hermes-cli/delegate-task
    but directly as a function call to avoid HTTP self-referencing.
    Returns (success: bool, response: str, error: str)

    log_cb: optional callable(str) — receives live agent output lines so the
            GUI shows progress during the agent boot window.
    prewarmer: optional PhasePreWarmer — triggers next-phase pre-warm at 70% output
    prewarm_skills: list of skills for the next phase (for prewarmer)
    """
    if log_cb:
        import sys
        sys._orchestration_log_cb = log_cb
    from models import db, ProjectData, Customer, HermesConfig
    from services.credential_manager import get_credential_manager
    from services.agentic_simulator import SkillRegistry

    try:
        hc = HermesConfig.get_config()
    except Exception:
        hc = None

    # ── Decrypt customer credentials ──
    decrypted_creds = {}
    try:
        project = ProjectData.query.get(project_id)
        if project:
            pdata = json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
            customer_id = pdata.get('customerId')
            if customer_id:
                customer = Customer.query.get(customer_id)
                if customer and customer.ak and customer.sk:
                    try:
                        master_pw = os.environ.get('VAULT_MASTER_PASSWORD', 'LatamCloudAdmin2026!')
                        cm = get_credential_manager(master_pw)
                        enc_ak = json.loads(customer.ak) if isinstance(customer.ak, str) and customer.ak.startswith('{') else None
                        if enc_ak and 'encrypted_ak' in enc_ak:
                            d_ak, d_sk = cm.decrypt_credentials(enc_ak)
                            decrypted_creds['ak'] = d_ak
                            decrypted_creds['sk'] = d_sk
                    except Exception as dec_err:
                        logger.warning(f"Credential decryption failed: {dec_err}")
                if customer and getattr(customer, 'source_huawei_ak', None):
                    decrypted_creds['source_ak'] = customer.source_huawei_ak
                    decrypted_creds['source_sk'] = getattr(customer, 'source_huawei_sk', '') or ''
    except Exception as cred_ex:
        logger.warning(f"Failed to load credentials for project {project_id}: {cred_ex}")

    # ── Source OS access (dataPlaneAccess) — preflight-injected ──
    # The wizard collects OS data-plane user/password during intake. Source Prep
    # (SMS agent install) NEEDS these to SSH into source servers. If missing,
    # the agent MUST NOT trial-and-error — it reports a blocker for human input.
    data_plane_ctx = ""
    source_os_user = ""
    source_os_password = ""
    try:
        pd = pdata
        dpa = pd.get('dataPlaneAccess') or {}
        if isinstance(dpa, dict):
            source_os_user = dpa.get('user') or dpa.get('os_user') or 'root'
            source_os_password = dpa.get('password') or ''
        # fallback keys
        if not source_os_password:
            source_os_password = pd.get('source_ssh_password') or ''
        if not source_os_user:
            source_os_user = 'root'
        dpa_ready = bool(source_os_password)
        data_plane_ctx = (
            f"=== SOURCE OS ACCESS (preflight) ===\n"
            f"Source SSH user: {source_os_user}\n"
            f"Source SSH password: {'SET (use it for agent install SSH)' if dpa_ready else 'MISSING — DO NOT guess. Report as BLOCKER for human intervention.'}\n"
            f"Usage: ssh {source_os_user}@<source_ip> for SMS agent install.\n\n"
        )
    except Exception as dpx:
        logger.warning(f"dataPlaneAccess injection failed: {dpx}")

    # ── Build skill context ──
    skill_context = ""
    num_skills = 0
    try:
        skills = SkillRegistry.list_all()
        num_skills = len(skills)
        skill_context = "\n".join([
            f"- {s['name']}: {s.get('description', '')} (commands: {len(s.get('commands', []))})"
            for s in skills
        ])
    except Exception:
        pass

    # ── Inject full context: session lessons + resources kit inventory + recent outcomes ──
    session_context = ""
    try:
        sl_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', 'SESSION-LESSONS.md')
        if os.path.exists(sl_path):
            with open(sl_path) as _f:
                session_context = _f.read()[:6000]  # keep bounded
    except Exception:
        pass

    kit_context = ""
    try:
        inv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', 'RESOURCES-KIT-INVENTORY.md')
        if os.path.exists(inv_path):
            with open(inv_path) as _f:
                kit_context = _f.read()[:3000]
    except Exception:
        pass

    # Recent outcomes from Postgres (last 10) as context
    outcomes_context = ""
    try:
        from services.agentic_simulator import ExecutionHistoryStore
        hist = ExecutionHistoryStore._history[-10:] if ExecutionHistoryStore._history else []
        if hist:
            outcomes_context = "\n".join([
                f"- {r.get('project','?')} / {r.get('server_name','?')} / {r.get('outcome','?')}"
                f"{': ' + str(r.get('error',''))[:120] if r.get('error') else ''}"
                for r in hist
            ])
    except Exception:
        pass

    tool_manifest = """You have access to the following tools via the terminal:
- hcloud CLI: Huawei Cloud API calls (ECS, VPC, EIP, SMS, IMS, OBS)
- SSH: Connect to source/target VMs via ssh/paramiko
- Python: Run migration scripts from /root/.hermes/skills/
- MCP: iaas-mcp-server at /home/huawei-cloud/iaas-mcp-server/ (175+ IaaS tools)
- Skills Knowledge Tree: /root/.hermes/skills/ (migration skills with proven runbooks)

CRITICAL: You are executing REAL cloud operations. Use the terminal to run hcloud commands.
When done, report what you actually executed and the results."""

    system_prompt = f"""You are a Huawei Cloud migration execution agent running on the ERP live server.
You have FULL tool access via Hermes CLI — terminal, file operations, browser, and code execution.

{tool_manifest}

Skills Knowledge Tree ({num_skills} skills available):
{skill_context}

=== SESSION LESSONS (recent, highest priority) ===
{session_context}

=== RESOURCES KIT INVENTORY ===
{kit_context}

=== RECENT EXECUTION OUTCOMES ===
{outcomes_context}

{data_plane_ctx}EXECUTION DISCIPLINE — ABSOLUTE RULES (source order matters — follow this EVERY time):
0. RESOURCE KIT FIRST — for EVERY action and EVERY value you need (image IDs, flavors, API operations, parameter syntax, error handling):
   a. READ the preloaded SKILLS in your context (they contain exact proven commands — image IDs, disk mapping, syncing=false, error fixes). Your session has them preloaded — use them before anything.
   b. If a skill lacks the answer, READ /tmp/erp_project_context_*.json — it has the full project context including targetArchitecture, executionContext, source passwords, and the execution plan. Use `cat /tmp/erp_project_context_<project_id>.json` to access it. This is the PROJECT DATA SOURCE OF TRUTH — the ERP data comes from here, NOT from the database.
   c. If the JSON file is missing, read the execution plan / simulated commands in your context.
   d. Use MCP tools (iaas-mcp-server) for API operations.
   e. ONLY THEN, if the kit genuinely lacks it, use hcloud --help / self-discovery.
   NEVER touch the ERP database (erp_prod_db / postgresql://). The .env file is blocked. Do NOT grep for database passwords. Do NOT write Python scripts to query the database. The project data file (/tmp/erp_project_context_*) has everything you need. NEVER treat a missing value as a reason to guess or DB-hunt: search the kit first.
1. PHASE SCOPE: Execute ONLY the steps listed in the Task for your assigned phase. NEVER provision, create, register, or modify ANY resource outside this list. Do NOT start later phases, do NOT revisit earlier phases. If a step seems to require something outside your phase, report it as a blocker instead of doing it.
2. VERIFY BEFORE REPORTING: Never claim a resource was created or a step completed unless you ran the cloud command AND saw the success output. For every provisioned resource (VPC, SG, EIP, ECS, SMS task), run the corresponding read/Show command afterwards and include its actual output in your report.
3. EXACT PARAMETERS — READ THE PLAN: The executionPlan in the project data contains the exact commands for every step. Your SOLE job is to execute those steps in order using the exact commands listed there. Do NOT run --help as a first move, do NOT self-discover, do NOT improvise — ANY deviation from the plan is a bug. Use the exact parameters from the plan/simulation verbatim. Example: EIPs MUST be --bandwidth.size=300 --bandwidth.share_type=PER --bandwidth.charge_mode=traffic. SMS tasks MUST use --syncing=false with speed_limit=0.
4. HONESTY: If a command fails, report the failure with the exact error output. Do NOT summarize, sugarcoat, or declare partial success. A failed step is a failed step.
5. TONE: Report factually and concisely. No celebratory language, no kaomoji, no personality flourishes. State what you did, the verification output, and the result.

When done, report what you actually executed, the verification commands you ran, and their outputs."""

    full_prompt = goal
    if context:
        full_prompt = f"{goal}\n\nContext:\n{context}"

    # ── Build env with credentials ──
    env = os.environ.copy()
    if decrypted_creds.get('ak'):
        env['HW_ACCESS_KEY'] = decrypted_creds['ak']
        env['HW_SECRET_KEY'] = decrypted_creds['sk']
    if decrypted_creds.get('source_ak'):
        env['HW_SOURCE_AK'] = decrypted_creds['source_ak']
        env['HW_SOURCE_SK'] = decrypted_creds['source_sk']

    # ── Spawn Hermes CLI subprocess ──
    binary = (hc.hermes_binary_path if hc else None) or 'hermes'
    delegation_model = (hc.delegation_model if hc else None) or 'deepseek-v4-pro'
    delegation_provider = (hc.delegation_provider if hc else None) or 'zai'
    profile = 'exec'

    # Check if profile exists, fall back to default
    try:
        profile_check = subprocess.run(
            [binary, 'profile', 'list'],
            capture_output=True, text=True, timeout=10
        )
        if profile_check.returncode == 0:
            available = re.findall(r'(\S+)\s+\S+\s+(?:running|stopped)', profile_check.stdout)
            if profile not in available:
                profile = 'default'
    except Exception:
        profile = 'default'

    # Toolsets pruned to terminal+file only — agent only needs hcloud CLI + SSH + file ops.
    # Full toolset adds ~7K tokens/turn from unused tool schemas (browser, session, vision...).
    # The LB tool_calls chunk filter is now fixed — this is safe.
    cmd = [
        binary, 'chat', '-q',
        f"{system_prompt}\n\n---\nTask: {full_prompt}",
        '--profile', profile,
        '--quiet',
        '--model', delegation_model,
        '--provider', 'custom',
        '--toolsets', 'terminal,file,web,mcp',
        '--reasoning', 'medium',
    ]
    # ── SKILL PRELOAD (phase-specific) ──
    # The toolsets filter (terminal,file) removes the skill_view tool, so without
    # explicit --skills the agent sees only skill NAME+description in its prompt
    # and cannot load the actual runbook commands. Preload relevant skills here.
    from services.skill_preload import skills_for_phase
    preload_skills = skills_for_phase(phase)
    for sk in preload_skills:
        cmd.extend(['--skills', sk])


    logger.info(f"[orchestration] Spawning Hermes agent for {phase}: {goal[:100]}...")

    # ── Auto-heal: retry on transient LLM failures (LB 502 key-cooldown, 429 rate limit) ──
    max_spawn_retries = 2  # was 3 — transient detection fixed, fewer retries needed
    last_error = None
    for attempt in range(max_spawn_retries + 1):
        try:
            # Stream the agent's output live to the pipeline log so the GUI shows
            # progress during the boot window instead of 60-90s of silence.
            results_buf = []
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
                stdin=subprocess.DEVNULL,
                preexec_fn=os.setsid,
                bufsize=1,
            )
            emitted_activity = False
            _output_len = 0  # Track output length for pre-warm trigger
            try:
                for line in proc.stdout:
                    if not line.strip():
                        continue
                    results_buf.append(line)
                    _output_len += len(line)
                    # ── Pre-warm next phase at 70% of estimated output ──
                    if prewarmer and prewarm_skills and _output_len % 500 < 50:
                        try:
                            prewarmer.check_and_prewarm(phase, _output_len, prewarm_skills)
                        except Exception:
                            pass
                    combined_l = line.lower()
                    # Stream meaningful progress lines only (agent actions, tool calls,
                    # phase markers) — not filler. Show at most one line per burst.
                    if any(tok in combined_l for tok in [
                        'provision', 'creat', 'verif', 'complete', 'agent', 'execut',
                        'run', 'ssh', 'hcloud', 'task', 'sync', 'cutover', 'eip',
                        'ecs', 'vpc', 'sms', 'migration', 'installing', 'agent',
                        'start', 'done', '[tool', 'tool call', 'resolv',
                    ]):
                        log_stream = getattr(sys, '_orchestration_log_cb', None)
                        if log_stream:
                            try:
                                log_stream(f"[agent] {redact_secrets(line.strip()[:120])}")
                            except Exception:
                                pass
                        emitted_activity = True
            except Exception as _se:
                last_error = f"stream read: {_se}"
            proc.wait(timeout=PIPELINE_TIMEOUT_SECONDS)
            result_rc = proc.returncode
            result_stdout = ''.join(results_buf)
            result_stderr = ''
            result = type('R', (), {
                'returncode': result_rc,
                'stdout': result_stdout,
                'stderr': result_stderr,
            })()
            combined = f"{result_stdout[:2000]}\n{result_stderr[:1000]}"
            if emitted_activity is False and result_stdout.strip():
                log_stream = getattr(sys, '_orchestration_log_cb', None)
                if log_stream:
                    try:
                        log_stream(f"[agent] run finished ({len(result_stdout)} chars of output)")
                    except Exception:
                        pass
            # Transient-failure detection: LB key exhaustion / rate limit / 502
            # NOTE: Only check stdout for transient markers, NOT stderr.
            # hermes chat -q outputs LB routing noise (502/429 retries) to stderr
            # even when the agent completed its task successfully. A completed
            # task with LB noise is still a completed task.
            out_l = (result.stdout or '')
            transient = any(tok in out_l.lower() for tok in [
                'all key allocation routing attempts failed',
                '502', '503', 'rate limit', '429',
                'max_retries_exhausted', 'internal server error',
                'no available channel', 'modelarts',
            ])
            # Substantive-completion detection: the agent actually did the work.
            # hermes chat exits rc!=0 on 'max iterations reached' even after a
            # fully successful provision/verify run, and a successful idempotent
            # re-run reports 'already exists / verified'. Both ARE success.
            failure_markers = ['❌', 'blocker', 'cannot create', 'consistently fails',
                               'all failed', 'exhausted', 'unable to', 'no success',
                               'failed to create', 'FAILED:', 'ERROR:']
            explicit_failure = any(fm in out_l.lower() for fm in failure_markers)
            substantive = len(out_l.strip()) > 200 and any(tok in out_l.lower() for tok in [
                'provisioned', 'created', 'verified', 'complete', 'completed',
                'already exist', 'exists', 'success', 'active',
                'all verified', 'ready', 'finished', 'done',
                'provisioning complete', 'migration complete',
                'already provisioned', 'no new creation needed', 'already exists',
            ]) and not explicit_failure
            # If the agent produced substantive success output, that OVERRIDES
            # any transient LB noise in stderr. The task is done.
            if substantive:
                logger.info(f"[orchestration:{project_id}] {phase} agent reported substantive completion (rc={result.returncode}, transient_stderr={transient}) — treating as success regardless of LB noise.")
                return True, result.stdout.strip(), None
            # rc!=0 with substantive output is still success — hermes chat often
            # exits non-zero on 'max iterations reached' AFTER finishing the work.
            # Verification reports ("All infrastructure is verified", "already exist",
            # full ShowServer/volume/EIP dumps) prove the phase completed.
            # BUT: an explicit blocker/failure in the report MUST override this —
            # the agent saying "❌ BLOCKER: API cannot..." is NOT success.
            if len(out_l.strip()) > 500 and not explicit_failure:
                logger.info(f"[orchestration:{project_id}] {phase} agent completed with rc={result.returncode} but has substantive verification output — treating as success.")
                return True, result.stdout.strip(), None
            if result.returncode == 0 and not transient:
                return True, result.stdout.strip(), None
            if result.returncode == 0 and transient:
                # 0 exit but LB error in stdout — treat as retryable
                last_error = f"LB transient error: {combined[:300]}"
                if attempt < max_spawn_retries:
                    logger.warning(f"[orchestration:{project_id}] {phase} spawn attempt {attempt+1} hit transient LLM error, retrying...")
                    time.sleep(15 * (attempt + 1))  # backoff: 15s, 30s, 45s
                    continue
                return False, None, f"Hermes failed: {combined[:500]}"
            # Non-zero exit (NOT substantive — real failure)
            if result.returncode != 0:
                err_text = result.stderr.strip()[:500]
                if attempt < max_spawn_retries:
                    logger.warning(f"[orchestration:{project_id}] {phase} spawn attempt {attempt+1} rc={result.returncode}, retrying...")
                    time.sleep(8 * (attempt + 1))
                    continue
                return False, None, f"Hermes failed: {err_text}"
        except subprocess.TimeoutExpired:
            last_error = f"Phase timed out after {PIPELINE_TIMEOUT_SECONDS}s"
            if attempt < max_spawn_retries:
                logger.warning(f"[orchestration:{project_id}] {phase} spawn attempt {attempt+1} timed out, retrying...")
                time.sleep(8 * (attempt + 1))
                continue
            return False, None, last_error
        except Exception as e:
            last_error = str(e)
            if attempt < max_spawn_retries:
                logger.warning(f"[orchestration:{project_id}] {phase} spawn attempt {attempt+1} exception, retrying...")
                time.sleep(8 * (attempt + 1))
                continue
            return False, None, last_error
    return False, None, last_error


def _run_pipeline_thread(project_id, start_from, app, restart_phase=None):
    """Background thread that runs the 7-phase pipeline.

    Uses its own app context for DB access.
    """
    from models import db, ProjectData, ExecutionState, ExecutionLog

    with app.app_context():
        lock = _get_project_lock(project_id)

        if not lock.acquire(blocking=False):
            # Another pipeline is already running for this project
            _running_pipelines[project_id] = {
                **_running_pipelines.get(project_id, {}),
                'status': 'rejected',
                'log': ['[lock] Pipeline already running for this project. Skipped.'],
            }
            return

        try:
            # ── Initialize pipeline state ──
            # Seed completed_phases from persisted delegate_tasks so a resumed
            # chain (after Flask restart/crash) knows which phases already ran
            # and skips them — but only if the CLOUD has the resources to prove
            # it. Cloud evidence wins over run artifacts (prevents phantom
            # completion like "7/7 done" on an empty cloud).
            completed_seed = []
            try:
                # ── PRIMARY: Read persisted completed_phases from ExecutionState ──
                # This survives Flask restarts (written on each phase completion)
                _es_seed = ExecutionState.query.filter_by(project_id=project_id).first()
                if _es_seed and _es_seed.completed_phases:
                    _candidate_seed = json.loads(_es_seed.completed_phases)
                    if _candidate_seed:
                        log(f'[resume] Found persisted completed_phases: {_candidate_seed}')
                else:
                    # ── FALLBACK: Read from delegate_tasks (legacy) ──
                    _proj_seed = ProjectData.query.get(project_id)
                    if _proj_seed:
                        _dt_seed = json.loads(_proj_seed.delegate_tasks or "[]")
                        _candidate_seed = [t.get("phase") for t in _dt_seed
                                           if t.get("status") == "COMPLETED" and t.get("phase")]
                    else:
                        _candidate_seed = []
                    # Validate candidate seed against live cloud evidence.
                    # If the cloud has zero migrated resources, nothing is done.
                    _has_cloud = False
                    try:
                        import subprocess as _sp
                        _x = _sp.run(['hcloud','SMS','ListServers','--cli-region=ap-southeast-3','--cli-profile=erp-source'],
                                     capture_output=True, text=True, timeout=20)
                        _d = json.loads(_x.stdout) if _x.stdout else {}
                        _srcs = _d.get('source_servers') or []
                        _has_sms = len(_srcs) > 0
                        _x2 = _sp.run(['hcloud','VPC','ListVpcs','--cli-region=la-north-2','--cli-profile=internal'],
                                     capture_output=True, text=True, timeout=20)
                        _d2 = json.loads(_x2.stdout) if _x2.stdout else {}
                        _vpcs = _d2.get('vpcs') or _d2.get('vpc') or _d2.get('Vpcs') or []
                        # hcloud VPC ListVpcs may return array directly (not wrapped in dict)
                        if not _vpcs and isinstance(_d2, list):
                            _vpcs = _d2
                        # Check for migration VPC — tagged with erp-migration OR non-default name
                        # (vpc-default IS the migration VPC if it has erp-migration tag)
                        _migration_vpc = any(
                            v.get('name') != 'default' or 
                            any(t.get('key','').startswith('erp-migration') for t in (v.get('tags') or []))
                            for v in _vpcs
                        )
                        _has_vpc = len(_vpcs) > 0 and _migration_vpc
                        # Also check target ECS as stronger evidence of completion
                        _x3 = _sp.run(['hcloud','ECS','NovaListServers','--cli-region=la-north-2','--cli-profile=internal','--limit=5'],
                                     capture_output=True, text=True, timeout=20)
                        _d3 = json.loads(_x3.stdout) if _x3.stdout else {}
                        _srvs = _d3.get('servers') or []
                        _has_target_ecs = any('TARGET' in s.get('name','') for s in _srvs)
                        _has_cloud = _has_sms and (_has_vpc or _has_target_ecs)
                    except Exception:
                        pass
                    if _has_cloud:
                        completed_seed = _candidate_seed
                    else:
                        # Cloud is empty — no phase can be legitimately completed.
                        # Clear the old delegate markers so they don't flood future
                        # pipelines with phantom seeds.
                        try:
                            if _proj_seed and _proj_seed.delegate_tasks:
                                _proj_seed.delegate_tasks = '[]'
                                from models import db as _db
                                _db.session.commit()
                        except Exception:
                            pass
            except Exception:
                completed_seed = []
            
            # ── RESUME FROM CHECKPOINT ──
            # Read persisted phase outputs from DB. If previous phases completed,
            # resume from the NEXT phase (not PHASE_4_1). The agent receives
            # previous phase outputs as context so it doesn't re-create resources.
            _resume_from = None
            _resume_context = ''
            try:
                _last_phase, _completed_from_db = _get_last_completed_phase(project_id)
                if _completed_from_db and _last_phase:
                    # Find the next phase after the last completed one
                    _phase_keys = [s['key'] for s in MIG_PHASES]
                    _last_idx = _phase_keys.index(_last_phase) if _last_phase in _phase_keys else -1
                    if _last_idx >= 0 and _last_idx < len(_phase_keys) - 1:
                        _resume_from = _phase_keys[_last_idx + 1]
                        completed_seed = _completed_from_db
                        _resume_context = _build_resume_context(project_id, _resume_from)
                        log(f'[resume] Checkpoint found: {_completed_from_db} — resuming from {_resume_from}')
                    elif _last_idx == len(_phase_keys) - 1:
                        # All phases completed
                        log(f'[resume] All phases completed — pipeline done')
                        completed_seed = _completed_from_db
                        _resume_from = None  # will hit completion check below
            except Exception as _re_err:
                logger.warning(f'Resume from checkpoint failed: {_re_err}')
            
            pipeline_info = {
                'status': 'running',
                'completed_phases': completed_seed,
                'failed_phase': None,
                'current_phase': None,
                'log': [],
                'phase_status': {pk: 'completed' for pk in completed_seed},
                'started_at': datetime.now(timezone.utc).isoformat(),
                'thread_alive': True,
                'stop_requested': False,   # GUI Stop button -> graceful stop after current phase
                'pause_requested': False,  # GUI Pause button -> suspend before next phase
                'paused_at_phase': None,   # phase where it paused (for resume)
                '_resume_from': _resume_from,
                '_resume_context': _resume_context,
            }
            _running_pipelines[project_id] = pipeline_info

            def log(msg):
                redacted = redact_secrets(str(msg))
                pipeline_info['log'].append(redacted)
                logger.info(f"[orchestration:{project_id}] {redacted}")

            # ── Load project data for context ──
            project = ProjectData.query.get(project_id)
            if not project:
                log('[error] Project not found.')
                pipeline_info['status'] = 'failed'
                return

            pdata = json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
            sim_result = pdata.get('agenticDryRun', {})
            sim_trace = sim_result.get('trace', [])
            sim_summary = sim_result.get('summary', {})

            # ── Load existing completed phases from delegate tasks ──
            try:
                existing_tasks = json.loads(project.delegate_tasks or '[]')
                for t in existing_tasks:
                    if t.get('status') == 'COMPLETED':
                        pipeline_info['completed_phases'].append(t.get('phase', ''))
            except Exception:
                pass

            # ── Get or create execution state ──
            state = ExecutionState.query.filter_by(project_id=project_id).first()
            if not state:
                state = ExecutionState(project_id=project_id, current_phase='PHASE_4_0', status='PENDING')
                db.session.add(state)
                db.session.commit()

            # ── Build phase context from THE EXECUTION PLAN (source of truth) ──
            # The plan steps carry the PROVEN, exact hcloud commands (dot-notation).
            # The dry-run simulation trace is derived data and may carry stale/flat
            # syntax — it must never override plan steps. The agent executes these
            # commands VERBATIM; no --help, no self-discovery.
            NETWORK_ACTIONS = {'CREATE_VPC', 'CREATE_SUBNET', 'CREATE_SG', 'CREATE_EIP',
                               'ADD_SG_RULES_SMS', 'ASSOC_SG', 'CREATE_VPC_PEERING', 'CREATE_NAT'}

            def build_phase_context(phase_key):
                plan_steps = (plan.get('steps') or []) if isinstance(plan, dict) else []
                phase_plan_steps = [s for s in plan_steps if s.get('phase') == phase_key]
                if phase_key == 'PHASE_4_1':
                    # Network phase: keep ONLY network-pillar steps. The plan
                    # generator mis-buckets ECS/OBS steps under 4.1 — exclude
                    # any action outside the Wave-0 network fabric.
                    phase_plan_steps = [s for s in phase_plan_steps
                                        if s.get('action') in NETWORK_ACTIONS]
                if not phase_plan_steps:
                    return None
                commands = []
                for s in phase_plan_steps:
                    cmds = s.get('commands') or []
                    if isinstance(cmds, list):
                        for c in cmds:
                            if isinstance(c, dict):
                                cmd = c.get('cmd') or c.get('command') or ''
                                desc = c.get('desc', '')
                                commands.append((f"# {desc}: " if desc else "# step: ") + cmd)
                            elif isinstance(c, str):
                                commands.append(c)
                commands = [c for c in commands if c][:25]
                server_names = list(set([
                    (s.get('target_resource') or '') for s in phase_plan_steps
                    if isinstance(s, dict) and s.get('target_resource')
                ]))[:10]
                return {
                    'commands': commands,
                    'servers': server_names,
                    'estimated_days': sim_summary.get('estimated_wall_clock_days'),
                    'source': 'executionPlan',
                }

            if sim_trace:
                log(f'[simulator] Using dry-run simulation ({len(sim_trace)} trace entries) as context.')

            # ── Build dynamic pipeline from execution plan ──
            from services.phase_content_generator import generate_phase_content
            plan = pdata.get('executionPlan', {})
            dynamic_phases = generate_phase_content(plan)

            if dynamic_phases:
                # Use dynamic phases from the execution plan
                pipeline = []
                for phase_key in ['PHASE_4_1', 'PHASE_4_2', 'PHASE_4_3', 'PHASE_4_4', 'PHASE_4_5', 'PHASE_4_6', 'PHASE_4_7', 'PHASE_4_8']:
                    content = dynamic_phases.get(phase_key)
                    if content:
                        pipeline.append({
                            'phase': phase_key,
                            'label': content['label'],
                            'goal': content['goal'],
                        })
                log(f'[plan] Dynamic pipeline: {len(pipeline)} phases from execution plan ({len(plan.get("steps", []))} steps).')
            else:
                # Fallback to hardcoded phases
                pipeline = PIPELINE_PHASES
                log('[plan] No execution plan found — using default 8-phase pipeline.')

            # ── Initialize engine minions ──
            cloud_cache = get_cloud_cache()
            prewarmer = PhasePreWarmer(log_cb=log)
            log(f'[minion] Cloud cache: {cloud_cache.summary()}')
            log(f'[minion] Pre-warmer: active for phases {list(PHASE_PREWARM_MAP.keys())}')
            log(f'[minion] Concurrent groups: {[list(g) for g in CONCURRENT_PHASE_GROUPS]}')

            # ── Run each phase ──
            _phases_already_ran = set()  # Track phases run by concurrent runner
            _resume_from = pipeline_info.pop('_resume_from', None)
            _resume_context = pipeline_info.pop('_resume_context', '')
            for i in range(start_from, len(pipeline)):
                step = pipeline[i]
                phase_key = step['phase']

                # ── RESUME: Skip phases that are already completed (from checkpoint) ──
                if _resume_from and phase_key != _resume_from and phase_key in pipeline_info['completed_phases']:
                    log(f'[resume] {phase_key} already completed (checkpoint) — skipping')
                    continue
                if _resume_from and phase_key == _resume_from:
                    log(f'[resume] Resuming from {phase_key} with persisted context')
                    _resume_from = None  # Clear so we don't skip further

                # Skip if already ran via concurrent group
                if phase_key in _phases_already_ran:
                    continue

                # ── CONCURRENT PHASE GROUP ──
                # If this phase is part of a concurrent group, run all members
                # in parallel, then advance past them.
                _concurrent_group = get_concurrent_group(phase_key)
                if _concurrent_group and phase_key not in _phases_already_ran:
                    # Check which group members haven't completed yet
                    _pending = [pk for pk in _concurrent_group
                                if pk not in pipeline_info['completed_phases']
                                and pk not in _phases_already_ran]
                    if len(_pending) > 1:
                        log(f'[concurrent] Running {len(_pending)} phases in parallel: {_pending}')
                        _runner = ConcurrentPhaseRunner(
                            spawn_fn=lambda goal, ctx, pid, pk, log_cb=None: _spawn_hermes_agent(goal, ctx, pid, pk, log_cb=log_cb, prewarmer=prewarmer),
                            log_cb=log,
                        )
                        _cresults = _runner.run_group(
                            _pending, pipeline, project_id, {},  # enriched_context not needed — runner finds steps from pipeline
                            pipeline_info['phase_status'],
                        )
                        # Process results
                        for _pk, (_succ, _resp, _err) in _cresults.items():
                            _phases_already_ran.add(_pk)
                            if _succ:
                                pipeline_info['completed_phases'].append(_pk)
                                pipeline_info['phase_status'][_pk] = 'completed'
                                log(f'[concurrent] {_pk} completed ✓')
                            else:
                                pipeline_info['phase_status'][_pk] = 'failed'
                                log(f'[concurrent] {_pk} failed — pipeline continues (resilient)')
                        # Invalidate cache after concurrent ops
                        cloud_cache.invalidate()
                        continue  # All group members done, advance past them

                # ── STOP REQUESTED: halt gracefully at the phase boundary ──
                if pipeline_info.get('stop_requested'):
                    log(f'[stop] Stop requested — halting after {pipeline_info.get("current_phase") or "start"}.')
                    pipeline_info['status'] = 'stopped'
                    state.status = 'STOPPED'
                    state.last_active_at = datetime.utcnow()
                    db.session.commit()
                    break

                # ── PAUSE REQUESTED: suspend BEFORE this phase until resumed ──
                if pipeline_info.get('pause_requested'):
                    log(f'[pause] Pause requested — suspending before {phase_key}.')
                    pipeline_info['status'] = 'paused'
                    pipeline_info['paused_at_phase'] = phase_key
                    state.status = 'PAUSED'
                    state.last_active_at = datetime.utcnow()
                    db.session.commit()
                    # Wait until resumed (poll 3s) — stop also honored while paused
                    while pipeline_info.get('pause_requested') and not pipeline_info.get('stop_requested'):
                        time.sleep(3)
                    if pipeline_info.get('stop_requested'):
                        log('[stop] Stop requested while paused — halting.')
                        pipeline_info['status'] = 'stopped'
                        state.status = 'STOPPED'
                        db.session.commit()
                        break
                    log(f'[resume] Resumed — continuing with {phase_key}.')
                    pipeline_info['status'] = 'running'
                    state.status = 'IN_PROGRESS'
                    db.session.commit()

                # ── NO PHASE SKIPPING — sequential phases have dependencies ──
                # A later phase CANNOT run if an earlier phase hasn't completed.
                # On restart (Flask crash, server reboot), the pipeline MUST start
                # from PHASE_4_1 with a clean slate. The caller is responsible for
                # rolling back any partial resources before restarting.
                # restart_phase is kept for manual single-phase re-run only.
                if restart_phase and restart_phase != phase_key:
                    log(f'[skip] {step["label"]} — not the requested restart phase ({restart_phase}).')
                    continue
                if restart_phase == phase_key:
                    log(f'[restart] {step["label"]} — forced re-run by user request.')

                log(f'[phase] {phase_key}: {step["label"]} — spawning agent...')
                pipeline_info['current_phase'] = phase_key
                pipeline_info['phase_status'][phase_key] = 'running'

                # Update DB state
                state.current_phase = phase_key
                state.status = 'IN_PROGRESS'
                state.last_active_at = datetime.utcnow()
                
                # Mark PhaseState as running (for accurate elapsed timer)
                try:
                    from models import PhaseState
                    ps = PhaseState.query.filter_by(
                        project_id=project_id, phase=phase_key
                    ).first()
                    if not ps:
                        ps = PhaseState(
                            execution_state_id=state.id,
                            project_id=project_id,
                            phase=phase_key,
                        )
                        db.session.add(ps)
                    ps.status = 'running'
                    ps.started_at = datetime.utcnow()
                    db.session.commit()
                except Exception:
                    pass
                db.session.commit()

                # Build enriched context
                phase_ctx = build_phase_context(phase_key)
                enriched = f"ERP Migration Project ID: {project_id}. Current pipeline phase: {phase_key}. Customer: {pdata.get('customerName', 'N/A')}. Target region: {pdata.get('region', 'la-south-2')}. Execution mode: agentic orchestration."
                
                # ── Inject resume context (previous phase outputs from DB) ──
                if _resume_context:
                    enriched = _resume_context + '\n\n' + enriched

                # ── Compute next-phase skills for pre-warming during streaming ──
                _next_skills = []
                try:
                    from services.skill_preload import skills_for_phase
                    _next_phases = PHASE_PREWARM_MAP.get(phase_key, [])
                    for _npk in _next_phases:
                        _next_skills.extend(skills_for_phase(_npk))
                except Exception:
                    pass

                # ── Inject cached cloud state (avoids redundant hcloud calls by agent) ──
                _cached_state = cloud_cache.prefetch_for_phase(phase_key)
                if _cached_state:
                    enriched += f"\n\n{_cached_state}"

                # ── Enriched execution context (injected, so the agent does NOT need to read the DB) ──
                # The 4.2 agent persisted source_servers (EIPs, SMS IDs, disk), mig project id etc.
                # to executionContext. Later phases need these values — provide them directly.
                ec = pdata.get('executionContext') or {}
                if isinstance(ec, dict):
                    src_servers = ec.get('source_servers') or []
                    if src_servers:
                        enriched += "\n\n=== SOURCE SERVERS (from executionContext — authoritative) ==="
                        for srv in src_servers:
                            enriched += ("\n- {name}: eip={eip} private={private_ip} sms_id={sms_id} "
                                         "state={state} agent={agent_version} disk={disk_name} {disk_size}B"
                                         " flavor={flavor} vcpus={vcpus} ram_mb={ram_mb}").format(
                                name=srv.get('name','?'),
                                eip=srv.get('eip',''),
                                private_ip=srv.get('private_ip',''),
                                sms_id=srv.get('sms_id',''),
                                state=srv.get('state',''),
                                agent_version=srv.get('agent_version',''),
                                disk_name=srv.get('disk_name',''),
                                disk_size=srv.get('disk_size',''),
                                flavor=srv.get('flavor', srv.get('source_flavor','')),
                                vcpus=srv.get('vcpus',''),
                                ram_mb=srv.get('ram',''))
                        enriched += "\n=== END SOURCE SERVERS ==="
                    mp_id = ec.get('sms_migration_project_id') or ec.get('mig_project_id') or ''
                    if mp_id:
                        enriched += f"\nMigration project ID: {mp_id} (SMS)"
                    if ec.get('phase_4_2_complete'):
                        enriched += "\nPhase 4.2 status: COMPLETE (SMS agents installed + verified)"

                # Target architecture summary (compute / database / storage)
                ta = pdata.get('targetArchitecture') or {}
                if isinstance(ta, dict):
                    parts = []
                    for grp, label in (('compute','ECS'), ('database','DB'), ('storage','Storage')):
                        items = ta.get(grp) or []
                        if items:
                            names = ", ".join(str((x.get('name') or x.get('source_name') or '?')) for x in items[:5])
                            parts.append(f"{label}: {names}")
                    if parts:
                        enriched += "\n=== TARGET ARCHITECTURE ===\n" + "\n".join(parts) + "\n=== END TARGET ARCHITECTURE ==="

                if phase_ctx:
                    enriched += f"\n\n=== SIMULATION CONTEXT for {phase_key} ==="
                    enriched += f"\nSimulated steps in this phase: {len(sim_trace)}"
                    if phase_ctx['commands']:
                        enriched += "\nSimulated CLI commands:\n  " + "\n  ".join(phase_ctx['commands'])
                    if phase_ctx['servers']:
                        enriched += f"\nTarget servers: {', '.join(phase_ctx['servers'])}"
                    enriched += "\n=== END SIMULATION CONTEXT ==="

                # ── DETERMINISTIC FIRST (Phase 4.0 pre-tasks skip this) ──
                # Execute plan steps for this phase via subprocess (NO LLM).
                # Fall through to agent spawn only if deterministic steps fail ×2.
                success = True
                response = ""
                error = ""
                if phase_key.startswith('PHASE_4_') and phase_key != 'PHASE_4_0':
                    try:
                        from services.deterministic_executor import DeterministicExecutor
                        det = DeterministicExecutor(pdata, project_id, phase_key,
                                                     target_region=pdata.get('region', 'la-north-2'))
                        det_ok, entries, failures = det.run_phase(plan, log=log)
                        if det_ok:
                            response = f"Deterministic: {len(entries)} steps succeeded."
                            try:
                                _hs2 = ExecutionState.query.filter_by(project_id=project_id).first()
                                if _hs2:
                                    _hs2.last_active_at = datetime.utcnow()
                                    db.session.commit()
                            except Exception:
                                pass
                            log(f'[det] {phase_key}: all {len(entries)} steps completed deterministically ✓')
                        else:
                            log(f'[det] {phase_key}: {len(failures)}/{len(entries)} steps failed — falling directly to agent lane (deterministic is pure-function; same input = same result, retry is useless)')
                            success = False
                            error = f"Deterministic: {len(failures)} steps failed"
                            # Fall through to agent spawn below
                    except Exception as det_err:
                        log(f'[det] {phase_key}: deterministic executor error: {det_err}')
                        success = False
                        error = str(det_err)
                        # Fall through to agent spawn
                # ── Write project context file (durable, for both lanes) ──
                # $ERP_HOME/project_data/context_<project_id>.json — persists across
                # reboots. Agent reads it via cat; never touches erp_prod_db.
                try:
                    _ctx_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'project_data')
                    if not os.path.exists(_ctx_dir):
                        os.makedirs(_ctx_dir, exist_ok=True)
                    _ctx_file = os.path.join(_ctx_dir, f"context_{project_id[:12]}.json")
                    _ep_for_ctx = plan if isinstance(plan, dict) else {}
                    _ep_steps_ctx = []
                    _ep_res_ctx = _ep_for_ctx.get('resources', [])
                    for _ps in (_ep_for_ctx.get('steps') or []):
                        _pc_clean = []
                        for _pc in (_ps.get('commands') or []):
                            if isinstance(_pc, dict):
                                _ap = _pc.get('cmd', '')
                                _pc_clean.append({**_pc, 'cmd': _ap.replace('--cli-ak=', '--cli-ak=HIDDEN').replace('--cli-sk=', '--cli-sk=HIDDEN')})
                        _ep_steps_ctx.append({**_ps, 'commands': _pc_clean})
                    _safe_ctx = {
                        'projectId': project_id,
                        'executionContext': pdata.get('executionContext', {}),
                        'targetArchitecture': pdata.get('targetArchitecture', {}),
                        'source_ssh_password': (pdata.get('dataPlaneAccess') or {}).get('password', ''),
                        'executionPlan': {'steps': _ep_steps_ctx, 'resources': _ep_res_ctx},
                    }
                    import json as _js
                    with open(_ctx_file, 'w') as _fw:
                        _js.dump(_safe_ctx, _fw, indent=1, default=str)
                    log(f'[ctx] context file written: {_ctx_file}')
                except Exception as _ce:
                    log(f'[ctx] context file write failed: {_ce}')

                # ── Write project context file (durable, for both lanes) ──
                # $ERP_HOME/project_data/context_<project_id>.json — persists across
                # reboots. Agent reads it via cat; never touches erp_prod_db.
                try:
                    _ctx_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'project_data')
                    if not os.path.exists(_ctx_dir):
                        os.makedirs(_ctx_dir, exist_ok=True)
                    _ctx_file = os.path.join(_ctx_dir, f"context_{project_id[:12]}.json")
                    _ep_for_ctx = plan if isinstance(plan, dict) else {}
                    _ep_steps_ctx = []
                    _ep_res_ctx = _ep_for_ctx.get('resources', [])
                    for _ps in (_ep_for_ctx.get('steps') or []):
                        _pc_clean = []
                        for _pc in (_ps.get('commands') or []):
                            if isinstance(_pc, dict):
                                _ap = _pc.get('cmd', '')
                                _pc_clean.append({**_pc, 'cmd': _ap.replace('--cli-ak=', '--cli-ak=HIDDEN').replace('--cli-sk=', '--cli-sk=HIDDEN')})
                        _ep_steps_ctx.append({**_ps, 'commands': _pc_clean})
                    _safe_ctx = {
                        'projectId': project_id,
                        'executionContext': pdata.get('executionContext', {}),
                        'targetArchitecture': pdata.get('targetArchitecture', {}),
                        'source_ssh_password': (pdata.get('dataPlaneAccess') or {}).get('password', ''),
                        'executionPlan': {'steps': _ep_steps_ctx, 'resources': _ep_res_ctx},
                    }
                    import json as _js
                    with open(_ctx_file, 'w') as _fw:
                        _js.dump(_safe_ctx, _fw, indent=1, default=str)
                    log(f'[ctx] context file written: {_ctx_file}')
                except Exception as _ce:
                    log(f'[ctx] context file write failed: {_ce}')

                # ── CLOUD EVIDENCE GATE: verify phase actually did something ──
                # Phase completion MUST be validated against live cloud state, NOT
                # just agent text. This prevents the "SMS.0515 reported as resolved"
                # class of failure: pipeline advances to cutover on 0% replication.
                if success and phase_key in ('PHASE_4_4', 'PHASE_4_5', 'PHASE_4_6'):
                    try:
                        import subprocess as _sp
                        # Quick SMS task check: any task with progress > 0?
                        _sr = _sp.run(['hcloud','SMS','ListTasks','--cli-region=' + pdata.get('sourceRegion','ap-southeast-3'), '--cli-profile=erp-src'],
                                       capture_output=True, text=True, timeout=30)
                        _st = _sr.stdout.lower()
                        _has_progress = 'migrate_speed' in _st and 'total_time' in _st
                        _all_failed = _st.count('migrate_fail') >= 2
                        if _all_failed and phase_key != 'PHASE_4_4':
                            # All tasks failed — nothing was replicated. Halt.
                            log(f'[gate] {phase_key}: all SMS tasks in MIGRATE_FAIL state — nothing was replicated. Halting.')
                            success = False
                            error = 'Cloud evidence gate: all SMS tasks failed (MIGRATE_FAIL). No replication occurred.'
                    except Exception as _ge:
                        log(f'[gate] cloud evidence check failed: {_ge}')
                        # Don't block on check failure — let it continue
                        pass

                if not success:
                    # ── Agent lane (deterministic failed or not applicable) ──
                    # Failure-type arbitration: classify the deterministic failure,
                    # retry per policy (transient/idempotent/learning), and for
                    # blockers run the bounded troubleshoot loop (simulate-with-error
                    # -> agent-with-context -> resume or halt for human).
                    log(f'[phase] {phase_key}: {step["label"]} — spawning agent...')
                    from services.failure_arbitration import (
                        classify_failure, should_retry, new_information,
                        run_troubleshoot_loop,
                    )
                    failure_class = classify_failure(error or '')
                    log(f'[arbitration] failure class: {failure_class} — {str(error)[:100]}')

                    # Blocker or unknown: troubleshoot loop (bounded) directly.
                    if failure_class in ('blocker', 'unknown'):
                        log(f'[arbitration] {failure_class} — entering troubleshoot loop (simulate-with-error → agent)')
                        success, response, error = run_troubleshoot_loop(
                            project_id, phase_key, step, error or 'last attempt failed', log,
                            pdata,
                            spawn_agent_fn=lambda goal, pk: _spawn_hermes_agent(goal, enriched, project_id, pk, log_cb=log),
                            simulate_fn=_simulate_with_failure,
                        )
                    else:
                        # transient / idempotent / learning — retry per policy with backoff
                        attempt = 1
                        prev_err = error or ''
                        while True:
                            # Agent attempt (bounded by phase-scoped retries)
                            _ok, _resp, _err = _spawn_hermes_agent(
                                step['goal'], enriched, project_id, phase_key, log_cb=log,
                                prewarmer=prewarmer, prewarm_skills=_next_skills)
                            if _ok:
                                success, response, error = True, _resp, _err
                                log(f'[arbitration] agent resolved {phase_key} (attempt {attempt})')
                                break
                            # classify the agent failure this round
                            _cls = classify_failure(_err or '')
                            retry, delay, reason = should_retry(_cls, attempt, new_information(prev_err, _err or ''))
                            log(f'[arbitration] attempt {attempt} failed [{_cls}] — {reason}')
                            if not retry:
                                if _cls in ('blocker', 'unknown'):
                                    log(f'[arbitration] attempt {attempt} turned blocker — troubleshoot loop')
                                    success, response, error = run_troubleshoot_loop(
                                        project_id, phase_key, step, _err or 'agent failed', log,
                                        pdata,
                                        spawn_agent_fn=lambda goal, pk: _spawn_hermes_agent(goal, enriched, project_id, pk, log_cb=log),
                                        simulate_fn=_simulate_with_failure,
                                    )
                                else:
                                    success, response, error = False, _resp, _err
                                break
                            prev_err = _err or prev_err
                            attempt += 1
                            time.sleep(delay)

                # ── SPAWN TREE RECORDING: persist agent node (in project data) ──
                # So the SpawnTreeVisualizer poll shows real spawns (one agent per
                # phase, sequential) instead of empty/phantom state.
                try:
                    _sp = pdata.get('executionProgress') or {}
                    if not isinstance(_sp, dict):
                        _sp = {}
                    if 'spawnTree' not in _sp or not isinstance(_sp.get('spawnTree'), dict):
                        _sp['spawnTree'] = {"nodes": [], "edges": []}
                    if 'operations' not in _sp or not isinstance(_sp.get('operations'), list):
                        _sp['operations'] = []
                    _node_id = f"agent_{phase_key.lower()}"
                    if not any(n.get("id") == _node_id for n in _sp['spawnTree'].get("nodes", [])):
                        _sp['spawnTree']["nodes"].append({
                            "id": _node_id, "label": phase_key.replace("PHASE_4_", "4.") + f" ({step.get('label','')})",
                            "status": "running", "model": delegation_model,
                        })
                        if not any(n.get("id") == "main" for n in _sp['spawnTree'].get("nodes", [])):
                            _sp['spawnTree']["nodes"].insert(0, {"id": "main", "label": "Main Orchestrator", "status": "running", "model": delegation_model})
                        _sp['spawnTree']["edges"].append({"from": "main", "to": _node_id})
                    if success:
                        for n in _sp['spawnTree'].get("nodes", []):
                            if n.get("id") == _node_id:
                                n["status"] = "succeeded"
                    _sp['operations'].append({
                        "operation": phase_key.replace("PHASE_4_", "4.") + " agent",
                        "status": "succeeded" if success else "failed",
                        "server": step.get('target_resource', ''),
                        "detail": (response or error or '')[:100],
                    })
                    pdata['executionProgress'] = _sp
                    _proj_sp = ProjectData.query.get(project_id)
                    if _proj_sp:
                        _proj_sp.data = json.dumps(pdata, ensure_ascii=False)
                        db.session.commit()
                except Exception as _ste:
                    pass

                # ── FEEDBACK LOOP: agent resolutions -> plan updates ──
                # When the agent lane resolved placeholders (discovered IDs,
                # picked flavors, found the mig project), write those values
                # into the plan so FUTURE deterministic runs of ANY project
                # inherit them. Self-healing convergence.
                try:
                    if success:
                        from services.feedback_loop import apply_agent_resolutions
                        n = apply_agent_resolutions(project_id, pdata, response or "")
                        if n:
                            # Persist the updated plan back to the DB immediately
                            try:
                                _proj = ProjectData.query.get(project_id)
                                if _proj:
                                    _proj.data = json.dumps(pdata, ensure_ascii=False)
                                    db.session.commit()
                            except Exception as _pe:
                                log(f"[feedback] persist failed: {_pe}")
                            log(f"[feedback] {n} agent resolutions applied to plan (deterministic coverage +{n})")
                except Exception as fb_err:
                    log(f"[feedback] loop failed: {fb_err}")

                # ── CLOUD-BACKED ID WRITEBACK ──
                # After agent succeeds, query live cloud for target ECS IDs and
                # SMS source IDs. Persist to executionContext so downstream
                # deterministic phases (4.4, 4.5, 4.6) can resolve <ecs_id>,
                # <src_id>, <target_eip> without falling to agent lane.
                if success:
                    try:
                        from services.cloud_resolver import list_ecs, list_sms_servers
                        ctx = pdata.get('executionContext') or {}
                        if not isinstance(ctx, dict):
                            ctx = {}
                        updated = False

                        # Target ECS IDs
                        _ecs_list = list_ecs()
                        _target_map = ctx.get('target_ecs_map') or []
                        _existing_names = {e.get('source_name', '') for e in _target_map if isinstance(e, dict)}
                        for _e in _ecs_list:
                            _nm = _e.get('name', '')
                            _eid = _e.get('id', '')
                            if _nm and _eid and _nm not in _existing_names:
                                _target_map.append({
                                    'source_name': _nm.replace('-TARGET', ''),
                                    'ecs_name': _nm,
                                    'ecs_id': _eid,
                                    'status': _e.get('status', 'UNKNOWN'),
                                })
                                updated = True
                        ctx['target_ecs_map'] = _target_map

                        # Target servers (for deterministic <ecs_id> resolution)
                        _target_srv = ctx.get('target_servers') or []
                        _existing_srv = {t.get('name', '') for t in _target_srv if isinstance(t, dict)}
                        for _e in _ecs_list:
                            _nm = _e.get('name', '')
                            _eid = _e.get('id', '')
                            if _nm and _eid and _nm not in _existing_srv:
                                _addrs = _e.get('addresses', {}) or {}
                                _vpc_ips = [a.get('addr', '') for a in (_addrs.get('vpc', []) or []) if a.get('addr')]
                                _target_srv.append({
                                    'name': _nm,
                                    'id': _eid,
                                    'status': _e.get('status', 'UNKNOWN'),
                                    'vpc_ip': _vpc_ips[0] if _vpc_ips else '',
                                })
                                updated = True
                        ctx['target_servers'] = _target_srv

                        # Source SMS IDs (if source_servers is empty)
                        _src_srv = ctx.get('source_servers') or []
                        if not _src_srv:
                            _sms_list = list_sms_servers()
                            for _s in _sms_list:
                                _nm = _s.get('name', '')
                                _sid = _s.get('id', '')
                                _ip = _s.get('ip', '') or _s.get('ipv4', '')
                                if _nm and _sid:
                                    _src_srv.append({
                                        'name': _nm,
                                        'id': _sid,       # Alias for deterministic path compatibility
                                        'sms_id': _sid,
                                        'eip': _ip,
                                        'public_ip_address': _ip,
                                    })
                                    updated = True
                            ctx['source_servers'] = _src_srv

                        # Write target_ecs_id back to targetArchitecture.compute[]
                        _compute = (pdata.get('targetArchitecture') or {}).get('compute') or []
                        if isinstance(_compute, list):
                            for _c in _compute:
                                if not _c.get('target_ecs_id'):
                                    _src_nm = _c.get('source_name', '')
                                    for _tm in _target_map:
                                        if isinstance(_tm, dict) and _tm.get('source_name', '') == _src_nm:
                                            _c['target_ecs_id'] = _tm.get('ecs_id', '')
                                            updated = True
                                            break

                        if updated:
                            pdata['executionContext'] = ctx
                            try:
                                _proj_wb = ProjectData.query.get(project_id)
                                if _proj_wb:
                                    _proj_wb.data = json.dumps(pdata, ensure_ascii=False)
                                    db.session.commit()
                                    log(f"[cloud-writeback] persisted {len(_target_map)} target ECS, {len(_src_srv)} source SMS to executionContext")
                            except Exception as _wbe:
                                log(f"[cloud-writeback] persist failed: {_wbe}")
                    except Exception as _cwb_err:
                        log(f"[cloud-writeback] failed: {_cwb_err}")

                # ── Create delegate task record ──
                # Persist success outcome to Postgres
                if success:
                    try:
                        from services.agentic_simulator import ExecutionHistoryStore
                        ExecutionHistoryStore._pg_save({
                            "project": project_id,
                            "server_name": phase_key,
                            "strategy": "auto-heal",
                            "outcome": "success",
                            "error": "",
                            "root_cause": "",
                            "fix": "",
                            "lesson": f"Hermes agent completed {phase_key} successfully",
                        })
                    except Exception:
                        pass

                # ── EXECUTION WRITEBACK: actual outcome -> simulation artifact ──
                # Each phase's real result (timing, error, resolution) lands in
                # simulationResult.trace so the dry-run becomes a living record and
                # post-lifecycle re-runs show sim-vs-actual side by side.
                try:
                    from services.feedback_loop import apply_execution_writeback
                    _phase_start = pipeline_info.get('_phase_started_at', {}).get(phase_key)
                    _dur = 0
                    if _phase_start:
                        try:
                            _dur = max(0, int((datetime.utcnow() - _phase_start).total_seconds()))
                        except Exception:
                            _dur = 0
                    apply_execution_writeback(
                        pdata, phase_key,
                        outcome='completed' if success else 'failed',
                        error='' if success else str(error or '')[:300],
                        resolution=response if success else '',
                        duration_s=_dur,
                        agent_report=response or '',
                    )
                    _proj_wb = ProjectData.query.get(project_id)
                    if _proj_wb:
                        _proj_wb.data = json.dumps(pdata, ensure_ascii=False)
                        db.session.commit()
                    log(f'[writeback] {phase_key} outcome written to simulation artifact ({_dur}s)')
                except Exception as wb_err:
                    log(f'[writeback] failed: {wb_err}')
                task_record = {
                    'goal': step['goal'][:200],
                    'phase': phase_key,
                    'status': 'COMPLETED' if success else 'FAILED',
                    'profile': 'exec',
                    'model': 'glm-5.2',
                    'started_at': datetime.utcnow().isoformat(),
                    'completed_at': datetime.utcnow().isoformat(),
                    'error': error[:500] if error else None,
                }
                try:
                    tasks = json.loads(project.delegate_tasks or '[]')
                    tasks.append(task_record)
                    project.delegate_tasks = json.dumps(tasks)
                    db.session.commit()
                except Exception:
                    pass

                # ── Write execution log ──
                log_entry = ExecutionLog(
                    execution_state_id=state.id,
                    project_id=project_id,
                    phase=phase_key,
                    event_type='SUCCESS' if success else 'ERROR',
                    message=f"Phase {phase_key}: {step['label']}",
                    agent_name='Orchestration Engine',
                    metadata_json=json.dumps({'response': (response or error or '')[:500]}),
                )
                db.session.add(log_entry)
                db.session.commit()

                # ── Heartbeat: checkpoint resilience (survives Flask crash) ──
                try:
                    _hs = ExecutionState.query.filter_by(project_id=project_id).first()
                    if _hs:
                        _hs.last_active_at = datetime.utcnow()
                        db.session.commit()
                except Exception:
                    pass

                if success:
                    log(f'[done] {step["label"]} — agent completed.')
                    if response:
                        log(f'[output] {redact_secrets(response[:200] if response else "")}...' if response and len(response) > 200 else f'[output] {redact_secrets(response or "")}')
                    pipeline_info['completed_phases'].append(phase_key)
                    pipeline_info['phase_status'][phase_key] = 'completed'
                    
                    # ── Persist completed_phases to DB (survives Flask restart) ──
                    try:
                        state.completed_phases = json.dumps(pipeline_info['completed_phases'])
                        state.phase_status_map = json.dumps(pipeline_info['phase_status'])
                        db.session.commit()
                    except Exception:
                        pass
                    
                    # ── Persist phase_outputs to PhaseState table (checkpoint-resilience) ──
                    # Each phase's outputs are stored so the next phase can read them
                    # from DB instead of in-memory state. This makes the pipeline
                    # resumable without re-running completed phases.
                    try:
                        from models import PhaseState
                        ps = PhaseState.query.filter_by(
                            project_id=project_id, phase=phase_key
                        ).first()
                        if not ps:
                            ps = PhaseState(
                                execution_state_id=state.id,
                                project_id=project_id,
                                phase=phase_key,
                            )
                            db.session.add(ps)
                        ps.status = 'completed'
                        ps.completed_at = datetime.utcnow()
                        # Extract outputs from agent response + execution context
                        _phase_out = _extract_phase_outputs(
                            phase_key, response, enriched, project_id
                        )
                        ps.set_outputs(_phase_out)
                        db.session.commit()
                        log(f'[checkpoint] {phase_key} outputs persisted ({len(json.dumps(_phase_out))} chars)')
                    except Exception as _cp_err:
                        logger.warning(f'Phase outputs persist failed: {_cp_err}')
                    
                    # ── Pre-warm next phase (engine minion) ──
                    try:
                        from services.skill_preload import skills_for_phase
                        _next_skills = []
                        for _npk in PHASE_PREWARM_MAP.get(phase_key, []):
                            _next_skills.extend(skills_for_phase(_npk))
                        if _next_skills:
                            prewarmer.check_and_prewarm(phase_key, 999999, _next_skills)  # Force pre-warm (phase done = 100%)
                    except Exception as _pw_err:
                        log(f'[minion:prewarm] failed: {_pw_err}')
                    
                    # ── Cloud cache stats ──
                    log(f'[minion:cache] {cloud_cache.summary()}')
                    
                    # Persist log for post-restart hydration
                    try:
                        from models import ExecutionState as _ES
                        st2 = _ES.query.filter_by(project_id=project_id).first()
                        if st2:
                            st2.last_pipeline_log = json.dumps(pipeline_info.get('log', []))
                            db.session.commit()
                    except Exception:
                        pass

                    # ── INDIVIDUAL RUN: stop after forced phase (no forward continuation) ──
                    # IMPORTANT: an individual phase run must NOT set the global
                    # execution_states row to COMPLETED/DONE — that state belongs
                    # ONLY to the full 7-phase completion branch below. Otherwise
                    # the GUI shows the "Pipeline Completed / Post-Live" banner
                    # after a single phase. Here we persist per-phase completion
                    # and leave the pipeline status as running (the thread stops).
                    if restart_phase is not None:
                        state.current_phase = phase_key
                        state.status = 'RUNNING'
                        state.last_active_at = datetime.utcnow()
                        db.session.commit()
                        log(f'[stop] Individual run: {restart_phase} done. Pipeline stopped (not continuing to later phases).')
                        try:
                            from models import ExecutionState as _ES
                            st4 = _ES.query.filter_by(project_id=project_id).first()
                            if st4:
                                st4.last_pipeline_log = json.dumps(pipeline_info.get('log', []))
                                db.session.commit()
                        except Exception:
                            pass
                        pipeline_info['status'] = 'completed'
                        pipeline_info['current_phase'] = None
                        return
                    else:
                        state.current_phase = phase_key
                        state.status = 'COMPLETED'
                        state.last_active_at = datetime.utcnow()
                        db.session.commit()
                else:
                    log(f'[fail] {step["label"]} — {error}')
                    pipeline_info['failed_phase'] = i
                    pipeline_info['phase_status'][phase_key] = 'failed'
                    # Postgres persist: failure outcome (auto-heal feedback)
                    try:
                        from services.agentic_simulator import ExecutionHistoryStore
                        ExecutionHistoryStore._pg_save({
                            'project': project_id, 'server_name': phase_key,
                            'strategy': 'auto-heal', 'outcome': 'failed',
                            'error': str(error)[:500], 'root_cause': 'orchestrator_delegation',
                            'fix': '', 'lesson': f'Hermes agent failed for {phase_key}: {str(error)[:200]}',
                        })
                    except Exception:
                        pass
                    pipeline_info['status'] = 'phase_failed'
                    pipeline_info['phase_status'][phase_key] = 'failed'
                    # Don't halt the pipeline — continue to next phase.
                    # A failed phase may be retried later or its work may be
                    # completed by a downstream phase. The pipeline is resilient.
                    log(f'[continue] {phase_key} failed but pipeline continues to next phase (resilient mode)')
                    state.status = 'IN_PROGRESS'
                    state.last_active_at = datetime.utcnow()
                    db.session.commit()

            # ── All phases completed ──
            log('[complete] All 8 phases completed. Pipeline finished.')
            try:
                from models import ExecutionState as _ES
                st3 = _ES.query.filter_by(project_id=project_id).first()
                if st3:
                    st3.last_pipeline_log = json.dumps(pipeline_info.get('log', []))
                    db.session.commit()
            except Exception:
                pass
            pipeline_info['status'] = 'completed'
            pipeline_info['current_phase'] = None
            state.current_phase = 'COMPLETED'
            state.status = 'DONE'
            state.last_active_at = datetime.utcnow()
            db.session.commit()

            # ── EXEMPLAR PROMOTION: successful lifecycle -> resource kit ──
            # A completed 7-phase run is the highest-value learning artifact.
            # Promote the per-phase resolutions + outcomes into the skill registry
            # (cross-project), so future simulations & executions start from
            # "known to work" patterns instead of rediscovering them.
            try:
                from services.feedback_loop import record_learning
                from services.agentic_simulator import SkillRegistry
                _pc = 0
                for _ph in pipeline_info.get('completed_phases', []):
                    if isinstance(_ph, str) and _ph.startswith('PHASE_4_'):
                        _pc += 1
                record_learning(
                    skill_name='erp-execution-orchestration',
                    pattern=f"Full lifecycle success exemplar (project {project_id[:8]}, {_pc} phases): "
                            f"deterministic-first → agent lane healed placeholders → feedback persisted "
                            f"resolutions → phases completed in sequence. Reuse this pattern for similar "
                            f"cross-region projects (source {pdata.get('sourceRegion','?')} → "
                            f"{pdata.get('region','?')}).",
                    failure_modes=["SMS.0515 → disk overrides or console path", "API tasks require explicit start"],
                )
                logger.info(f"[exemplar] lifecycle success +{_pc} phases promoted to resource kit")
            except Exception as ex_ex:
                logger.warning(f"[exemplar] promotion failed: {ex_ex}")

        except Exception as e:
            logger.error(f"[orchestration:{project_id}] Pipeline thread crashed: {e}", exc_info=True)
            pipeline_info = _running_pipelines.get(project_id, {})
            pipeline_info['status'] = 'crashed'
            pipeline_info['log'].append(f'[crash] {str(e)}')
        finally:
            if project_id in _running_pipelines:
                _running_pipelines[project_id]['thread_alive'] = False
            lock.release()


def start_pipeline(project_id, start_from=0, restart_phase=None):
    """Start the 7-phase pipeline in a background thread.

    Returns immediately with status. The actual execution runs in a daemon thread.
    """
    from app import app

    # Check if already running
    if is_pipeline_running(project_id):
        return {
            'success': False,
            'error': 'Pipeline already running for this project.',
            'status': get_pipeline_status(project_id),
        }

    # Clear any persisted log/status from a PREVIOUS run so the first status poll
    # reports this run as in-progress (not stale 'completed' from the last one).
    try:
        from models import db as _db, ExecutionState as _ES2
        st_prev = _ES2.query.filter_by(project_id=project_id).first()
        if st_prev:
            st_prev.last_pipeline_log = None
            st_prev.status = 'PENDING'
            _db.session.commit()
    except Exception:
        pass

    # Start background thread with its own app context
    thread = threading.Thread(
        target=_run_pipeline_thread,
        args=(project_id, start_from, app, restart_phase),
        daemon=True,
        name=f'orchestrate-{project_id}',
    )
    thread.start()

    return {
        'success': True,
        'message': f'Pipeline started for project {project_id}',
        'status': get_pipeline_status(project_id),
    }


def resume_pipeline(project_id):
    """Resume pipeline from the failed phase."""
    info = _running_pipelines.get(project_id, {})
    failed_idx = info.get('failed_phase')
    if failed_idx is None:
        # Check delegate tasks in DB for last failed phase
        from models import db, ProjectData
        try:
            project = ProjectData.query.get(project_id)
            if project:
                tasks = json.loads(project.delegate_tasks or '[]')
                for i, t in enumerate(tasks):
                    if t.get('status') == 'FAILED':
                        # Find which phase index this corresponds to
                        phase = t.get('phase', '')
                        for idx, p in enumerate(PIPELINE_PHASES):
                            if p['phase'] == phase:
                                failed_idx = idx
                                break
                        if failed_idx is not None:
                            break
        except Exception:
            pass

    if failed_idx is None:
        return {'success': False, 'error': 'No failed phase found to resume from.'}

    return start_pipeline(project_id, start_from=failed_idx)


def stop_pipeline(project_id):
    """Request a graceful stop of a running pipeline.

    Flags the running thread: it halts at the next phase boundary (or now if
    paused). Does NOT kill the thread — the current phase completes naturally
    so we never leave half-created resources. Kills any live agent subprocess
    (it would otherwise keep running to completion).
    """
    info = _running_pipelines.get(project_id, {})
    if not info:
        # Nothing in-memory — but there may be an orphaned agent process.
        try:
            import subprocess
            subprocess.run("pkill -f 'hermes.*chat' 2>/dev/null; true", shell=True)
        except Exception:
            pass
        return {'success': True, 'message': 'No running pipeline found; killed any orphaned agents.', 'status': 'stopped'}

    info['stop_requested'] = True
    info['pause_requested'] = False  # stop overrides pause
    # Kill any live agent subprocess so we don't wait for it
    try:
        import subprocess
        subprocess.run("pkill -f 'hermes.*chat' 2>/dev/null; true", shell=True)
    except Exception:
        pass
    # Persist the stopped state immediately (visible even before thread notices)
    try:
        from models import db, ExecutionState
        st = ExecutionState.query.filter_by(project_id=project_id).first()
        if st:
            st.status = 'STOPPED'
            db.session.commit()
    except Exception:
        pass
    return {'success': True, 'message': 'Stop requested — pipeline will halt at the next phase boundary.', 'status': info.get('status', 'stopping')}


def pause_pipeline(project_id):
    """Request a pause: suspend BEFORE the next phase (current one finishes)."""
    info = _running_pipelines.get(project_id, {})
    if not info:
        return {'success': False, 'error': 'No running pipeline to pause.', 'status': 'idle'}
    if info.get('pause_requested'):
        return {'success': False, 'error': 'Pipeline already paused.', 'status': 'paused'}
    info['pause_requested'] = True
    try:
        from models import db, ExecutionState
        st = ExecutionState.query.filter_by(project_id=project_id).first()
        if st:
            st.status = 'PAUSED'
            db.session.commit()
    except Exception:
        pass
    return {'success': True, 'message': 'Pause requested — suspending before the next phase.', 'status': 'pausing'}


def resume_pipeline_after_pause(project_id):
    """Resume a paused pipeline (clears the pause flag)."""
    info = _running_pipelines.get(project_id, {})
    if not info:
        return {'success': False, 'error': 'No pipeline in memory to resume.', 'status': 'idle'}
    info['pause_requested'] = False
    info['paused_at_phase'] = None
    try:
        from models import db, ExecutionState
        st = ExecutionState.query.filter_by(project_id=project_id).first()
        if st:
            st.status = 'IN_PROGRESS'
            db.session.commit()
    except Exception:
        pass
    return {'success': True, 'message': 'Resumed.', 'status': 'running'}
