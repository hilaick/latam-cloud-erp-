"""
Evidence-based phase completion.

Cloud state is the source of truth for what actually happened. When the SMS
console shows all migration tasks MIGRATE_SUCCESS (100%, Finished), the ERP
GUI should reflect that Data Sync (4.4) and Monitor (4.5) are complete —
the replication already ran to completion, whether or not the pipeline
explicitly executed those phases.

Rules:
  - PHASE_4_4 (Data Sync)  auto-completes when ALL project SMS tasks reached a
    terminal success state (MIGRATE_SUCCESS / FINISHED / COMPLETED).
  - PHASE_4_5 (Monitor)    auto-completes alongside 4.4 (replication done =
                            monitoring done).
  - PHASE_4_6 (Cutover)    NEVER auto-completes — it is a real manual gate
                            (verify target, incremental catch-up, promote).
  - Idempotent: only writes rows that are not already COMPLETED.
"""
import json
import logging

logger = logging.getLogger(__name__)

TERMINAL_SUCCESS_STATES = {"MIGRATE_SUCCESS", "FINISHED", "COMPLETED", "SUCCESS"}


def auto_complete_sync_phases(project_id, cloud_state, persist=True):
    """Mark 4.4/4.5 complete when cloud evidence shows replication finished.

    Args:
        project_id: str
        cloud_state: dict as returned by cloud_state_detector.detect_cloud_state
        persist: if False, only return what WOULD be marked (dry check)

    Returns: list of phases marked complete this call (empty if nothing new).
    """
    if not cloud_state:
        return []

    # ── Gather SMS task states from cloud state ──
    tasks = []
    try:
        tasks = cloud_state.get('resources', {}).get('sms_tasks') or []
    except Exception:
        tasks = []
    sp = cloud_state.get('sms_progress') or {}
    total = sp.get('total', 0)

    # Task-level evidence (best): every listed task in a terminal success state
    task_list_ok = bool(tasks) and all(
        str(t.get('state', '')).upper() in TERMINAL_SUCCESS_STATES for t in tasks
    )
    # Counter-level fallback: tasks exist, none running/failed, at least one success
    counter_ok = (
        total > 0
        and sp.get('success', 0) > 0
        and sp.get('running', 0) == 0
        and sp.get('failed', 0) == 0
    )
    replication_done = task_list_ok or counter_ok
    if not replication_done:
        return []

    # ── Determine what to mark ──
    to_mark = ["PHASE_4_4", "PHASE_4_5"]  # 4.6 cutover is NEVER auto-completed
    newly_marked = []

    if not persist:
        return to_mark

    try:
        from app import db
        from models import ProjectData

        proj = ProjectData.query.get(project_id)
        if not proj:
            return []

        try:
            dt_list = json.loads(proj.delegate_tasks or '[]')
        except Exception:
            dt_list = []
        existing = {t.get('phase') for t in dt_list if t.get('status') == 'COMPLETED'}

        changed = False
        for ph in to_mark:
            if ph not in existing:
                dt_list.append({
                    'goal': f'[auto] Cloud evidence: SMS replication completed (100%)',
                    'phase': ph,
                    'status': 'COMPLETED',
                    'profile': 'evidence',
                    'model': 'cloud-state',
                    'started_at': None,
                    'completed_at': None,
                    'error': None,
                })
                existing.add(ph)
                newly_marked.append(ph)
                changed = True

        if changed:
            proj.delegate_tasks = json.dumps(dt_list, ensure_ascii=False)
            db.session.commit()
            logger.info(f"[evidence] Auto-completed {newly_marked} for {project_id} "
                        f"(all SMS tasks terminal success)")
    except Exception as e:
        logger.warning(f"[evidence] auto-complete failed for {project_id}: {e}")

    return newly_marked
