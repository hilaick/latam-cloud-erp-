"""Failure-type arbitration for the ERP orchestration engine.

Decides what to do after a phase attempt fails, based on the FAILURE CLASS
rather than a fixed retry count:

- TRANSIENT   (502/503/429/rate-limit/LB key cooldown/network blip)
              -> retry with backoff; the failure is noise, not signal.
- IDEMPOTENT  (resource already exists / placeholder unresolved / re-run safe)
              -> retry a bounded number of times; a clean re-run usually fixes it.
- BLOCKER     (SMS.0515 with stale mapping, missing credentials, API limitation,
              structural mismatch) -> do NOT burn attempts; go to the
              troubleshoot loop (simulate-with-error -> agent-with-context),
              bounded, then halt for human if unresolved.
- LEARNING    (each new attempt surfaced NEW information — different error code,
              new context, state change) -> keep going, it's converging.
"""
import re
import time
import logging

logger = logging.getLogger(__name__)

# ── Classification ────────────────────────────────────────────────────────────

TRANSIENT_TOKENS = [
    '502', '503', '429', 'rate limit', 'rate_limit', 'max_retries_exhausted',
    'internal server error', 'no available channel', 'modelarts',
    'all key allocation routing attempts failed', 'connection timed out',
    'temporarily unavailable', 'throttl', 'LB ', 'load balancer',
]

IDEMPOTENT_TOKENS = [
    'already exists', 'already exist', 'already provisioned', 'already created',
    'placeholder', 'blocked', '<ecs_id>', '<src_id>', '<task_id>', '<sms_disk_id>',
    'resource already', 'duplicate name', 'already bound', 'already registered',
    'no new creation needed', 'SMS.7605',
]

BLOCKER_TOKENS = [
    'SMS.0515', 'SMS.0202', 'SMS.6602', 'SMS.0806', 'SMS.6617', 'SMS.6000',
    'cannot create', 'unable to', 'permission denied', 'unauthorized',
    'invalid credential', 'authentication failed', 'ak/sk', 'no credentials',
    'missing credential', 'not supported', 'refused', 'blocked by',
    'consistently fails', 'exhausted all', 'all 3 strategies failed',
    'structural mismatch', 'console only', 'console-only',
]

LEARNING_TOKENS = [
    'error_code changed', 'progress changed', 'state changed',
    'different error', 'new error', 'retry after', 'attempted',
]


def classify_failure(error_text: str) -> str:
    """Classify a failure/error string as one of:
    'transient' | 'idempotent' | 'blocker' | 'learning' | 'unknown'."""
    if not error_text:
        return 'unknown'
    low = error_text.lower()
    # Learning must win if explicitly signaled (new info surfaced)
    if any(t in low for t in LEARNING_TOKENS):
        return 'learning'
    if any(t in low for t in BLOCKER_TOKENS):
        return 'blocker'
    if any(t in low for t in IDEMPOTENT_TOKENS):
        return 'idempotent'
    if any(t in low for t in TRANSIENT_TOKENS):
        return 'transient'
    return 'unknown'


# ── Retry policies ────────────────────────────────────────────────────────────

RETRY_POLICY = {
    'transient':  {'max_attempts': 5, 'base_delay': 15, 'backoff': 2.0, 'log': 'transient — retrying with backoff'},
    'idempotent': {'max_attempts': 3, 'base_delay': 5,  'backoff': 1.5, 'log': 'idempotent — clean re-run may fix'},
    'learning':   {'max_attempts': 4, 'base_delay': 8,  'backoff': 1.5, 'log': 'new information surfaced — converging'},
    'unknown':    {'max_attempts': 2, 'base_delay': 20, 'backoff': 2.0, 'log': 'unclassified failure — bounded retry'},
    'blocker':    {'max_attempts': 1, 'base_delay': 0,  'backoff': 1.0, 'log': 'BLOCKER — not burning attempts'},
}


def should_retry(failure_class: str, attempt: int, error_since_last: bool = False) -> tuple:
    """Given a failure class and the 1-based attempt index, decide:
    (should_retry: bool, delay_seconds: int, reason: str)."""
    policy = RETRY_POLICY.get(failure_class, RETRY_POLICY['unknown'])
    if attempt >= policy['max_attempts']:
        return False, 0, f"max attempts for {failure_class} reached ({policy['max_attempts']})"
    # Blocker: single attempt only, straight to troubleshoot loop
    if failure_class == 'blocker':
        return False, 0, 'blocker classified — go to troubleshoot loop'
    delay = int(policy['base_delay'] * (policy['backoff'] ** (attempt - 1)))
    return True, delay, policy['log']


def new_information(prev_error: str, new_error: str) -> bool:
    """True if the new attempt surfaced material new info (not the same failure)."""
    if not prev_error or not new_error:
        return False
    p = re.sub(r'[a-f0-9\-]{20,}', '<id>', prev_error.lower())[:120]
    n = re.sub(r'[a-f0-9\-]{20,}', '<id>', new_error.lower())[:120]
    return p != n


# ── Troubleshoot loop (pause -> simulate-with-error -> agent -> resume/halt) ──

TROUBLESHOOT_MAX_ROUNDS = 3


def run_troubleshoot_loop(project_id, phase_key, step, error_text, log,
                          pdata, spawn_agent_fn,
                          simulate_fn=None, round_limit=TROUBLESHOOT_MAX_ROUNDS):
    """Pause-and-troubleshoot: re-run the simulation with the failure as
    context, spawn an agent armed with that simulated context, and if it
    resolves, return success. Bounded rounds; halts for human after.

    Returns (success: bool, response: str, error: str).
    """
    prev_error = ''
    for rnd in range(1, round_limit + 1):
        log(f'[troubleshoot] round {rnd}/{round_limit} — modeling failure: {error_text[:120]}')
        # 1. Simulate with failure context (if a simulate fn is available)
        sim_context = ''
        try:
            if simulate_fn is not None:
                sim_context = simulate_fn(project_id, pdata, phase_key, error_text)
                if sim_context:
                    log(f'[troubleshoot] simulation produced {len(str(sim_context))} chars of alternative context')
        except Exception as se:
            log(f'[troubleshoot] simulate step failed: {se}')

        # 2. Spawn troubleshoot agent WITH the simulated alternatives
        goal = step.get('goal') or (step.get('label') or f'Resolve {phase_key}')
        goal += f"\n\nPREVIOUS ATTEMPT FAILED with: {error_text[:400]}\n"
        if sim_context:
            goal += f"\nSIMULATED ALTERNATIVE CONTEXT (from dry-run with your failure injected):\n{str(sim_context)[:3000]}\n"
        goal += "\nResolve the failure using the resource kit + this context. If genuinely impossible via API, report the exact blocker with evidence."

        try:
            ok, resp, err = spawn_agent_fn(goal, phase_key)
        except Exception as ae:
            ok, resp, err = False, '', f'troubleshoot spawn crashed: {ae}'
        if ok:
            # Agent returned success — but did it ACTUALLY resolve the phase?
            # The agent may admit "blocked, console required, 0% transferred" and
            # STILL return ok (because it successfully reported). Check for
            # explicit blocker markers in the agent output.
            # Hard blockers: agent explicitly says it cannot proceed.
            # Only match these in the LAST 300 chars (the conclusion),
            # not in diagnostic context that references past errors.
            HARD_BLOCKERS = ['cannot resolve', 'impossible via api', 'only proven path',
                             'console only', 'console-only', 'no credentials',
                             'missing credential', 'authentication failed']
            # Soft markers that appear in diagnostic context (past tense)
            # and should NOT trigger a halt if the conclusion shows success.
            SOFT_MARKERS = ['❌', 'blocked', 'no data transferred', '0%',
                            'Check failed', 'Not ready', 'SMS.0515',
                            'consistently fails', 'impossible via API']
            # Success override signals — if ANY of these appear in the
            # conclusion, soft markers are ignored (they're just context).
            SUCCESS_OVERRIDES = ['✅', 'complete', 'completed', 'success',
                                 'provisioned', 'created successfully', 'verified',
                                 'all.*ok', 'all.*check', 'no orphaned', 'all clean',
                                 'ready for next', 'no new creation needed',
                                 'already exist', 'already provisioned']
            tail = str(resp[-300:]).lower() if resp else ''
            # 1. Hard blockers in conclusion → halt immediately
            if tail and any(t in tail for t in HARD_BLOCKERS):
                # But even hard blockers can be overridden by explicit success
                if not any(re.search(pat, tail) for pat in SUCCESS_OVERRIDES if any(c in pat for c in ['.', '*'])):
                    if not any(t in tail for t in ['✅', 'complete', 'verified', 'success', 'provisioned']):
                        log(f'[troubleshoot] round {rnd} agent admits hard blocker — halting for human review')
                        return False, resp, 'troubleshoot agent reported blocker: ' + str(resp)[:200]
            # 2. Soft markers in conclusion → halt ONLY if no success override
            if tail and any(t in tail for t in SOFT_MARKERS):
                has_override = False
                for pat in SUCCESS_OVERRIDES:
                    if any(c in pat for c in ['.', '*']):
                        if re.search(pat, tail):
                            has_override = True
                            break
                    else:
                        if pat in tail:
                            has_override = True
                            break
                if not has_override:
                    log(f'[troubleshoot] round {rnd} agent output has failure markers in conclusion — halting for human review')
                    return False, resp, 'troubleshoot agent reported unresolved failure: ' + str(resp)[:200]
            log(f'[troubleshoot] round {rnd} RESOLVED by troubleshoot agent')
            return True, resp or '', err or ''
        # not resolved — did we learn anything new?
        if new_information(prev_error, err or error_text):
            log(f'[troubleshoot] round {rnd} surfaced new information — continuing')
            prev_error = err or error_text
            continue
        log(f'[troubleshoot] round {rnd} no new information — halting for human review')
        return False, '', err or error_text
    log(f'[troubleshoot] {round_limit} rounds exhausted — halting for human review')
    return False, '', error_text
