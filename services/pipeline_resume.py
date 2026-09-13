"""
Checkpointed pipeline auto-resume — systemd-startup sweep.

On Flask boot (after any crash/restart/reboot):
  1. Find ExecutionState rows where status = IN_PROGRESS and
     last_active_at > 3 min ago (stale heartbeat).
  2. Mark them as status = INTERRUPTED.
  3. Find the last completed phase from delegate_tasks.
  4. Auto-start the pipeline from the next uncompleted phase.

This makes the ERP factory survive server reboots, Flask crashes,
and systemd restarts without manual intervention.
"""
import json
import logging
import time as _time

logger = logging.getLogger(__name__)

# Threshold: if pipeline was marked IN_PROGRESS but last_active_at is
# older than this, consider it stale and auto-resume.
STALE_THRESHOLD_SECONDS = 180  # 3 minutes — longer than any normal Flaks restart


def resume_stale_pipelines(app):
    """Called by app factory / on Flask startup. Scans and resumes stale pipelines."""
    from models import db, ExecutionState, ProjectData, User
    from services.orchestration_engine import start_pipeline, is_pipeline_running
    from flask_jwt_extended import create_access_token
    import requests

    resumed = []
    try:
        with app.app_context():
            stale = ExecutionState.query.filter(
                ExecutionState.status.in_(["IN_PROGRESS", "RUNNING"]),
                ExecutionState.last_active_at.isnot(None),
            ).all()
            now = _time.time()
            for st in stale:
                age = now - st.last_active_at.timestamp()
                if age > STALE_THRESHOLD_SECONDS:
                    logger.info(f"[resume] Found stale pipeline for project {st.project_id}: "
                                f"phase={st.current_phase}, last_active={age:.0f}s ago")

                    # Mark as interrupted
                    old_status = st.status
                    st.status = "INTERRUPTED"
                    db.session.commit()

                    # Determine resume starting point from delegate_tasks
                    proj = ProjectData.query.get(st.project_id)
                    if not proj:
                        continue
                    completed_phases = set()
                    try:
                        dt = json.loads(proj.delegate_tasks or "[]")
                        for t in dt:
                            if t.get("status") == "COMPLETED" and t.get("phase"):
                                completed_phases.add(t["phase"])
                    except Exception:
                        pass

                    # Phase order
                    all_phases = [f"PHASE_4_{n}" for n in range(1, 8)]
                    start_from = 0
                    for i, ph in enumerate(all_phases):
                        if ph not in completed_phases:
                            start_from = i
                            break
                    else:
                        # All phases completed — nothing to resume
                        st.status = "COMPLETED"
                        db.session.commit()
                        logger.info(f"[resume] Project {st.project_id}: all phases complete, skipping")
                        continue

                    # Auto-resume via HTTP (reuse the orchestration endpoint)
                    try:
                        token = create_access_token(identity=str(User.query.first().id))
                        resp = requests.post(
                            f"http://127.0.0.1:9119/api/execution/{st.project_id}/orchestrate",
                            json={"start_from": start_from},
                            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                            timeout=10,
                        )
                        ok = resp.status_code == 200 and resp.json().get("success")
                        logger.info(f"[resume] Auto-resume {st.project_id}: {'OK' if ok else 'FAIL'} "
                                    f"(from phase index {start_from})")
                        if ok:
                            resumed.append(st.project_id)
                    except Exception as req_e:
                        logger.warning(f"[resume] HTTP request failed for {st.project_id}: {req_e}")

                    # Update heartbeat after resume
                    from datetime import datetime
                    st.last_active_at = datetime.utcnow()
                    db.session.commit()

        logger.info(f"[resume] Sweep complete. Resumed {len(resumed)} pipelines: {resumed}")
    except Exception as e:
        logger.error(f"[resume] Sweep failed: {e}")

    return resumed
