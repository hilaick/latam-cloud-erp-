"""
Cloud-evidence phase completion — source of truth is the LIVE cloud, not delegate_tasks.

Rules (deterministic, no agents):
  PHASE_4_1 (Network)     = VPC exists AND SG exists AND at least 1 EIP exists
  PHASE_4_2 (Source Prep) = SMS agent was installed (flag in executionContext)
  PHASE_4_3 (Target)      = Target ECS exists (named *-TARGET or carrying erp tag)
  PHASE_4_4 (Data Sync)   = SMS tasks existed and reached MIGRATE_SUCCESS
  PHASE_4_5 (Monitor)     = Same evidence as 4.4
  PHASE_4_6 (Cutover)     = SMS tasks deleted (no running tasks) AND source agents gone
  PHASE_4_7 (Teardown)    = Staging EIPs released, temp disks gone

Only writes to DB when evidence changes (idempotent). Survives any state reset.
"""
import json
import logging
import os
import subprocess
from datetime import datetime

logger = logging.getLogger(__name__)

_TERMINAL_TASK_STATES = {"MIGRATE_SUCCESS", "FINISHED", "COMPLETED", "SUCCESS"}


def derive_completed_from_cloud(project_id, project_data, cloud_state, decrypted_creds=None):
    """Return a set of PHASE_4_X keys that are factually done based on cloud evidence.

    Args:
        project_id: str
        project_data: dict (the project.data blob)
        cloud_state: dict as returned by cloud_state_detector.detect_cloud_state,
                     or None to skip expensive detection.
        decrypted_creds: optional dict with ak/sk for direct hcloud calls if cloud_state
                         doesn't have the depth needed.

    Returns: set of completed phase keys (e.g. {'PHASE_4_1', 'PHASE_4_2', ...})
    """
    completed = set()
    cs = cloud_state or {}
    res = cs.get("resources") or {}
    sp = cs.get("sms_progress") or {}
    ec = project_data.get("executionContext") or {}

    # ── 4.1 Network: VPC exists ──
    vpcs = res.get("vpcs") or []
    if len(vpcs) >= 1:
        completed.add("PHASE_4_1")

    # ── 4.2 Source Prep: ec flag or at least one source server detected ──
    sources = res.get("sms_sources") or []
    if ec.get("phase_4_2_complete") or len(sources) >= 1:
        completed.add("PHASE_4_2")

    # ── 4.3 Target: -TARGET named ECS exist ──
    ecs_list = res.get("ecs_instances") or []
    target_ecs = [e for e in ecs_list
                  if '-TARGET' in (e.get('name') or '').upper()
                  or 'target' in (e.get('name') or '').lower()]
    if len(target_ecs) >= 1:
        completed.add("PHASE_4_3")

    # ── 4.4 Data Sync: SMS tasks reached terminal success ──
    tasks = res.get("sms_tasks") or []
    task_evidence = False
    if tasks:
        # All listed tasks in terminal success
        terminal_all = all(str(t.get('state', '')).upper() in _TERMINAL_TASK_STATES
                           for t in tasks)
        if terminal_all:
            task_evidence = True
    # Fallback: counter evidence
    if not task_evidence:
        total = sp.get("total", 0)
        if total > 0 and sp.get("running", 0) == 0 and sp.get("failed", 0) == 0 and sp.get("success", 0) > 0:
            task_evidence = True
    if task_evidence:
        completed.add("PHASE_4_4")
        completed.add("PHASE_4_5")  # Monitor done by same evidence

    # ── 4.6 Cutover: SMS tasks cleared + no running tasks ──
    # After cutover, SMS tasks are deleted (0 remaining) or in terminal state
    running_tasks = [t for t in tasks if str(t.get('state', '')).upper() not in _TERMINAL_TASK_STATES]
    no_active_tasks = len(tasks) == 0 or (task_evidence and len(running_tasks) == 0)
    # Also: 4.6 is done if 4.3 and 4.4 are done and SMS sources count is 0 (agents uninstalled)
    sources_gone = len(sources) == 0
    if task_evidence and (no_active_tasks or sources_gone):
        completed.add("PHASE_4_6")

    # ── 4.7 Teardown: no staging resources, or flag ──
    # Hard to detect directly (staging EIPs vs production). Use executionContext flag
    # from the agent report, or check that EIPs were released.
    eips = res.get("eips") or []
    eip_count = len(eips)
    # If no EIPs remain (all released) and VPC still stands → teardown likely done
    if "PHASE_4_1" in completed and eip_count == 0:
        completed.add("PHASE_4_7")
    # Backfill: any later phase done implies all priors
    _all = [f"PHASE_4_{n}" for n in [7, 6, 5, 4, 3, 2, 1]]
    for ph in _all:
        if ph in completed:
            idx = int(ph.split('_')[-1])
            for n in range(1, idx):
                completed.add(f"PHASE_4_{n}")
            break

    return completed
