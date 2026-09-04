"""
Orchestration Engine — Background 7-phase migration pipeline.

Runs the full agentic pipeline in a background thread so:
- The HTTP request returns immediately (fire-and-poll)
- Users can switch projects / navigate away — execution continues server-side
- Multiple projects execute in parallel (each in its own thread)
- Per-project lock prevents duplicate concurrent runs
- 1800s timeout per phase (not per entire pipeline)

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

logger = logging.getLogger(__name__)

# ── Per-project lock registry ──
# Maps project_id → threading.Lock() so only one pipeline runs per project
_project_locks = {}
_project_locks_guard = threading.Lock()

# ── Running pipeline registry ──
# Maps project_id → { phase, status, log, started_at, thread }
_running_pipelines = {}

PIPELINE_TIMEOUT_SECONDS = 1800  # 30 minutes per phase


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


def _spawn_hermes_agent(goal, context, project_id, phase):
    """Spawn a Hermes agent for a single phase via the delegate-task API.

    This calls the same backend logic as /api/hermes-cli/delegate-task
    but directly as a function call to avoid HTTP self-referencing.
    Returns (success: bool, response: str, error: str)
    """
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

EXECUTION DISCIPLINE — ABSOLUTE RULES:
1. PHASE SCOPE: Execute ONLY the steps listed in the Task for your assigned phase. NEVER provision, create, register, or modify ANY resource outside this list. Do NOT start later phases, do NOT revisit earlier phases. If a step seems to require something outside your phase, report it as a blocker instead of doing it.
2. VERIFY BEFORE REPORTING: Never claim a resource was created or a step completed unless you ran the cloud command AND saw the success output. For every provisioned resource (VPC, SG, EIP, ECS, SMS task), run the corresponding read/Show command afterwards and include its actual output in your report.
3. EXACT PARAMETERS: Use the exact command parameters from the plan/simulation. Do not invent or "improve" them. Example: EIPs MUST be created with 300 Mbit/s traffic billing (charge_mode=traffic, size=300). SMS tasks MUST use --syncing=false with speed_limit=0.
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

    cmd = [
        binary, 'chat', '-q',
        f"{system_prompt}\n\n---\nTask: {full_prompt}",
        '--profile', profile,
        '--quiet',
        '--model', delegation_model,
        '--reasoning', 'medium',
    ]  # No --provider flag — use Hermes config default (custom LB on localhost:8666)
    # Auto-heal: if provider = 'custom' (the LB), don't force a provider flag.
    # The Hermes config.yaml already points to the LB via provider: custom + base_url


    logger.info(f"[orchestration] Spawning Hermes agent for {phase}: {goal[:100]}...")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=PIPELINE_TIMEOUT_SECONDS,
            env=env,
        )
        if result.returncode == 0:
            return True, result.stdout.strip(), None
        else:
            return False, None, f"Hermes failed: {result.stderr.strip()[:500]}"
    except subprocess.TimeoutExpired:
        return False, None, f"Phase timed out after {PIPELINE_TIMEOUT_SECONDS}s"
    except Exception as e:
        return False, None, str(e)


def _run_pipeline_thread(project_id, start_from, app):
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
            pipeline_info = {
                'status': 'running',
                'completed_phases': [],
                'failed_phase': None,
                'current_phase': None,
                'log': [],
                'phase_status': {},
                'started_at': datetime.now(timezone.utc).isoformat(),
                'thread_alive': True,
            }
            _running_pipelines[project_id] = pipeline_info

            def log(msg):
                pipeline_info['log'].append(msg)
                logger.info(f"[orchestration:{project_id}] {msg}")

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

            # ── Build phase context from simulation traces ──
            def build_phase_context(phase_key):
                if not sim_trace:
                    return None
                phase_steps = [t for t in sim_trace if t.get('phase') == phase_key or t.get('phase_group') == phase_key]
                if not phase_steps:
                    return None
                commands = []
                for t in phase_steps:
                    cmds = t.get('commands') or []
                    if isinstance(cmds, list):
                        for c in cmds:
                            if isinstance(c, dict):
                                commands.append(c.get('cmd') or c.get('command') or '')
                            elif isinstance(c, str):
                                commands.append(c)
                commands = [c for c in commands if c][:20]
                server_names = list(set([
                    (t.get('target') or '') if not isinstance(t, dict) or not t.get('decision')
                    else (t.get('target') or t['decision'].get('server_name', ''))
                    for t in phase_steps if isinstance(t, dict)
                ]))[:10]
                return {
                    'commands': commands,
                    'servers': server_names,
                    'estimated_days': sim_summary.get('estimated_wall_clock_days'),
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
                for phase_key in ['PHASE_4_1', 'PHASE_4_2', 'PHASE_4_3', 'PHASE_4_4', 'PHASE_4_5', 'PHASE_4_6', 'PHASE_4_7']:
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
                log('[plan] No execution plan found — using default 7-phase pipeline.')

            # ── Run each phase ──
            for i in range(start_from, len(pipeline)):
                step = pipeline[i]
                phase_key = step['phase']

                # Skip already completed
                if phase_key in pipeline_info['completed_phases']:
                    log(f'[skip] {step["label"]} — already completed.')
                    continue

                log(f'[phase] {phase_key}: {step["label"]} — spawning agent...')
                pipeline_info['current_phase'] = phase_key
                pipeline_info['phase_status'][phase_key] = 'running'

                # Update DB state
                state.current_phase = phase_key
                state.status = 'IN_PROGRESS'
                state.last_active_at = datetime.utcnow()
                db.session.commit()

                # Build enriched context
                phase_ctx = build_phase_context(phase_key)
                enriched = f"ERP Migration Project ID: {project_id}. Current pipeline phase: {phase_key}. Customer: {pdata.get('customerName', 'N/A')}. Target region: {pdata.get('region', 'la-south-2')}. Execution mode: agentic orchestration."
                if phase_ctx:
                    enriched += f"\n\n=== SIMULATION CONTEXT for {phase_key} ==="
                    enriched += f"\nSimulated steps in this phase: {len(sim_trace)}"
                    if phase_ctx['commands']:
                        enriched += "\nSimulated CLI commands:\n  " + "\n  ".join(phase_ctx['commands'])
                    if phase_ctx['servers']:
                        enriched += f"\nTarget servers: {', '.join(phase_ctx['servers'])}"
                    enriched += "\n=== END SIMULATION CONTEXT ==="

                # ── Spawn the Hermes agent ──
                success, response, error = _spawn_hermes_agent(
                    step['goal'], enriched, project_id, phase_key
                )

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

                if success:
                    log(f'[done] {step["label"]} — agent completed.')
                    if response:
                        log(f'[output] {response[:200]}...' if len(response) > 200 else f'[output] {response}')
                    pipeline_info['completed_phases'].append(phase_key)
                    pipeline_info['phase_status'][phase_key] = 'completed'
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
                    pipeline_info['status'] = 'halted'
                    state.status = 'FAILED'
                    state.last_active_at = datetime.utcnow()
                    db.session.commit()
                    return  # Stop the chain on failure

            # ── All phases completed ──
            log('[complete] All 7 phases completed. Pipeline finished.')
            pipeline_info['status'] = 'completed'
            pipeline_info['current_phase'] = None
            state.current_phase = 'COMPLETED'
            state.status = 'DONE'
            state.last_active_at = datetime.utcnow()
            db.session.commit()

        except Exception as e:
            logger.error(f"[orchestration:{project_id}] Pipeline thread crashed: {e}", exc_info=True)
            pipeline_info = _running_pipelines.get(project_id, {})
            pipeline_info['status'] = 'crashed'
            pipeline_info['log'].append(f'[crash] {str(e)}')
        finally:
            if project_id in _running_pipelines:
                _running_pipelines[project_id]['thread_alive'] = False
            lock.release()


def start_pipeline(project_id, start_from=0):
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

    # Start background thread with its own app context
    thread = threading.Thread(
        target=_run_pipeline_thread,
        args=(project_id, start_from, app),
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
