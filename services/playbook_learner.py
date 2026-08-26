"""
Playbook Learning Engine — Self-improving migration playbooks.

When a simulation completes, this module:
1. Extracts migration patterns from the trace (strategy, OS, timing, issues)
2. Persists learnings to CognitiveLearningLog (DB, not in-memory)
3. Auto-generates/updates playbook entries in GlobalPlaybooks
4. Auto-generates a runbook from the simulation trace

When planning a new migration, suggest_playbook() queries past learnings
and returns the best-matching playbook template based on resource profile similarity.
"""

import json
import logging
from datetime import datetime
from collections import Counter
from models import db, CognitiveLearningLog, GlobalPlaybooks, ProjectData

logger = logging.getLogger(__name__)


def learn_from_simulation(project_id, trace, summary, resource_usage=None):
    """
    Called after a simulation completes. Extracts patterns and persists learnings.

    Args:
        project_id: The project ID
        trace: List of trace step dicts from the simulation
        summary: Summary dict from the simulation
        resource_usage: Optional resource_usage dict
    """
    try:
        project = ProjectData.query.get(project_id)
        if not project:
            return

        pdata = json.loads(project.data) if isinstance(project.data, str) else (project.data or {})
        project_name = pdata.get("name", "unnamed")
        mapper_nodes = pdata.get("mapperNodes", [])

        # ── 1. Extract per-server patterns from trace ──
        server_patterns = {}  # server_name -> pattern
        for step in trace:
            target = step.get("target", "") or (step.get("decision", {}) or {}).get("server_name", "")
            if not target:
                continue
            if target not in server_patterns:
                # Find resource info
                res = next((r for r in mapper_nodes if r.get("name") == target or r.get("id") == target), {})
                server_patterns[target] = {
                    "server_name": target,
                    "os": res.get("os", "unknown"),
                    "type": res.get("type", "ECS"),
                    "disk_gb": res.get("diskGB", res.get("storage", 0)),
                    "phases_seen": [],
                    "actions": [],
                    "result": "unknown",
                    "strategy": "unknown",
                    "issues": [],
                    "source_label": step.get("source_label", ""),
                }
            sp = server_patterns[target]
            ph = step.get("phase", "")
            if ph and ph not in sp["phases_seen"]:
                sp["phases_seen"].append(ph)
            action = step.get("action", "")
            if action:
                sp["actions"].append(action)
            result = (step.get("result", "") + step.get("outcome", "")).lower()
            if "error" in result or "fail" in result or "blocked" in result:
                sp["issues"].append({"action": action, "result": step.get("result", ""), "phase": ph})
            elif "success" in result or "complete" in result:
                sp["result"] = "success"
            elif "sync" in result or "progress" in result:
                if sp["result"] != "success":
                    sp["result"] = "running"

        # Determine strategy from trace
        for step in trace:
            msg = (step.get("message", "") or "").upper()
            if "SMS" in msg and "AGENT" in msg:
                for sn in server_patterns:
                    if "sms" not in server_patterns[sn]["strategy"]:
                        server_patterns[sn]["strategy"] = "sms_primary"
            elif "IMAGE" in msg and "IMPORT" in msg:
                for sn in server_patterns:
                    if server_patterns[sn]["strategy"] == "unknown":
                        server_patterns[sn]["strategy"] = "image_primary"
            elif "RSYNC" in msg or "DATA_SYNC" in msg:
                for sn in server_patterns:
                    if server_patterns[sn]["strategy"] == "unknown":
                        server_patterns[sn]["strategy"] = "data_sync"

        # ── 2. Persist each pattern to CognitiveLearningLog ──
        for server_name, pattern in server_patterns.items():
            log_entry = CognitiveLearningLog(
                project_id=project_id,
                error_signature=f"migration_pattern:{pattern['strategy']}:{pattern['os']}:{pattern['type']}",
                context_snapshot=json.dumps({
                    "server_name": server_name,
                    "os": pattern["os"],
                    "type": pattern["type"],
                    "disk_gb": pattern["disk_gb"],
                    "strategy": pattern["strategy"],
                    "phases": pattern["phases_seen"],
                    "project_name": project_name,
                }),
                ai_remediation_applied=json.dumps({
                    "result": pattern["result"],
                    "actions_count": len(pattern["actions"]),
                    "issues": pattern["issues"],
                    "source_label": pattern["source_label"],
                }),
                success=(pattern["result"] == "success"),
                timestamp=datetime.utcnow(),
            )
            db.session.add(log_entry)

        db.session.commit()
        logger.info(f"🧠 Playbook Learner: ingested {len(server_patterns)} server patterns from project {project_name} ({project_id})")

        # ── 3. Auto-generate or update playbook ──
        _auto_generate_playbook(project_id, project_name, server_patterns, summary)

        # ── 4. Auto-generate runbook from trace ──
        _auto_generate_runbook(project_id, trace, mapper_nodes, pdata)

        return {
            "patterns_learned": len(server_patterns),
            "strategies": list(set(p["strategy"] for p in server_patterns.values())),
            "issues_found": sum(len(p["issues"]) for p in server_patterns.values()),
        }

    except Exception as e:
        logger.error(f"Playbook learning failed: {str(e)}", exc_info=True)
        db.session.rollback()
        return None


def _auto_generate_playbook(project_id, project_name, server_patterns, summary):
    """Create or update an auto-learned playbook entry in GlobalPlaybooks."""

    # Build a playbook from the patterns
    strategy_counts = Counter(p["strategy"] for p in server_patterns.values())
    dominant_strategy = strategy_counts.most_common(1)[0][0] if strategy_counts else "unknown"

    os_types = list(set(p["os"] for p in server_patterns.values()))
    server_count = len(server_patterns)

    # Build WBS tasks from the phase sequence
    phase_labels = {
        "PHASE_4_0": "Phase 1: Initialization & Triage",
        "PHASE_4_1": "Phase 2: Network Verification",
        "PHASE_4_2b_PREFLIGHT": "Phase 3: Source & Agent Preparation",
        "PHASE_4_2c_TARGET": "Phase 4: Target Provisioning",
        "PHASE_4_2d_SYNC": "Phase 5: Data Synchronization",
        "PHASE_4_2f_POST": "Phase 6: Smoke Tests",
        "PHASE_4_3": "Phase 7: Landing Zone",
        "PHASE_4_6": "Phase 8: Cutover",
        "PHASE_4_7": "Phase 9: Cleanup",
        "PHASE_4_8": "Phase 10: Finalize",
    }

    # Get unique phases in order
    all_phases = []
    for p in server_patterns.values():
        for ph in p["phases_seen"]:
            if ph not in all_phases:
                all_phases.append(ph)

    tasks = []
    for i, ph in enumerate(all_phases, 1):
        tasks.append({
            "id": str(i),
            "name": phase_labels.get(ph, ph),
            "isParent": True,
            "resp": "Partner",
            "prog": "0%",
            "start": "",
            "end": "",
        })
        # Add sub-tasks from actions
        sample_pattern = next((p for p in server_patterns.values() if ph in p["phases_seen"]), None)
        if sample_pattern:
            phase_actions = [a for a in sample_pattern["actions"][:3]]  # Top 3 actions
            for j, action in enumerate(phase_actions, 1):
                tasks.append({
                    "id": f"{i}.{j}",
                    "name": action.replace("_", " ").title(),
                    "isParent": False,
                    "resp": "Migration Engineer",
                    "prog": "0%",
                    "start": "",
                    "end": "",
                })

    playbook_key = f"auto_{dominant_strategy}_{server_count}srv"
    playbook_name = f"Auto-Learned: {dominant_strategy.replace('_', ' ').title()} ({server_count} servers, {', '.join(os_types)})"

    playbook_entry = {
        "name": playbook_name,
        "tasks": tasks,
        "auto_generated": True,
        "source_project": project_name,
        "source_project_id": project_id,
        "learned_at": datetime.utcnow().isoformat(),
        "migration_count": 1,
    }

    # Load existing playbooks
    master = GlobalPlaybooks.query.get("master")
    if master:
        playbooks = json.loads(master.data) if isinstance(master.data, str) else master.data
    else:
        playbooks = {}

    # Check if we already have an auto-learned playbook for this pattern
    if playbook_key in playbooks:
        existing = playbooks[playbook_key]
        if existing.get("auto_generated"):
            # Increment migration count, merge new learnings
            existing["migration_count"] = existing.get("migration_count", 1) + 1
            existing["last_learned_at"] = datetime.utcnow().isoformat()
            existing["source_projects"] = list(set(
                existing.get("source_projects", []) + [project_name]
            ))
            # Keep the most detailed task list
            if len(tasks) > len(existing.get("tasks", [])):
                existing["tasks"] = tasks
            playbooks[playbook_key] = existing
            logger.info(f"🧠 Playbook Learner: updated existing playbook '{playbook_name}' (now {existing['migration_count']} migrations)")
        else:
            # Don't overwrite a manually-created playbook
            playbook_key = f"{playbook_key}_v2"
            playbooks[playbook_key] = playbook_entry
    else:
        playbook_entry["source_projects"] = [project_name]
        playbooks[playbook_key] = playbook_entry
        logger.info(f"🧠 Playbook Learner: created new auto-learned playbook '{playbook_name}'")

    # Save
    if master:
        master.data = json.dumps(playbooks)
    else:
        master = GlobalPlaybooks(id="master", data=json.dumps(playbooks))
        db.session.add(master)
    db.session.commit()


def _auto_generate_runbook(project_id, trace, mapper_nodes, pdata):
    """Call the existing runbook generator and save to project data."""
    try:
        # Build runbook from trace (inline version of generate-runbook logic)
        runbook = []
        step_num = 0

        # Get server resources
        server_resources = [r for r in mapper_nodes if (r.get("type", "")).upper() in ("ECS", "COMPUTE")]

        for i, s in enumerate(server_resources):
            s_name = s.get("name", f"server-{i}")
            s_os = s.get("os", "linux")
            is_win = "windows" in s_os.lower()

            # Find the strategy used for this server from trace
            server_steps = [st for st in trace if st.get("target") == s_name]
            strategy = "sms"
            for st in server_steps:
                if "image" in (st.get("action", "")).lower():
                    strategy = "image"
                    break

            step_num += 1
            runbook.append({
                "id": f"rb_{step_num}",
                "taskId": f"4.2.{step_num}",
                "name": f"Install SMS agent on {s_name}",
                "wave": f"Wave 1",
                "start": "",
                "estHours": 0.5,
                "actualHours": 0,
                "status": "Pending",
                "owner": "Migration Engineer",
                "dependencies": "",
            })
            step_num += 1
            runbook.append({
                "id": f"rb_{step_num}",
                "taskId": f"4.2.{step_num}",
                "name": f"Create target ECS for {s_name}",
                "wave": f"Wave 1",
                "start": "",
                "estHours": 0.3,
                "actualHours": 0,
                "status": "Pending",
                "owner": "Migration Engineer",
                "dependencies": f"rb_{step_num-1}",
            })
            step_num += 1
            runbook.append({
                "id": f"rb_{step_num}",
                "taskId": f"4.2.{step_num}",
                "name": f"Start SMS migration task for {s_name}",
                "wave": f"Wave 1",
                "start": "",
                "estHours": 2.0,
                "actualHours": 0,
                "status": "Pending",
                "owner": "Migration Engineer",
                "dependencies": f"rb_{step_num-1}",
            })
            step_num += 1
            runbook.append({
                "id": f"rb_{step_num}",
                "taskId": f"4.6.{step_num}",
                "name": f"Cutover: Stop source, start target for {s_name}",
                "wave": f"Wave 1",
                "start": "",
                "estHours": 0.5,
                "actualHours": 0,
                "status": "Pending",
                "owner": "Migration Engineer",
                "dependencies": f"rb_{step_num-1}",
            })

        # Save runbook to project data
        if "runbook" not in pdata or not pdata.get("runbook"):
            pdata["runbook"] = runbook
            project = ProjectData.query.get(project_id)
            if project:
                project.data = json.dumps(pdata) if isinstance(project.data, str) else pdata
                db.session.commit()
                logger.info(f"🧠 Playbook Learner: auto-generated {len(runbook)} runbook steps for project {project_id}")

    except Exception as e:
        logger.error(f"Auto-runbook generation failed: {str(e)}")


def suggest_playbook(mapper_nodes):
    """
    Given a set of mapper nodes for a new project, query past learnings
    and suggest the best-matching playbook template.

    Returns: { playbook_key, playbook_name, tasks, confidence, matched_patterns }
    """
    try:
        # Analyze the resource profile
        server_resources = [r for r in mapper_nodes if (r.get("type", "")).upper() in ("ECS", "COMPUTE")]
        os_types = [r.get("os", "linux").lower() for r in server_resources]
        server_count = len(server_resources)
        total_disk = sum(float(r.get("diskGB", r.get("storage", 0)) or 0) for r in server_resources)

        # Query CognitiveLearningLog for similar patterns
        logs = CognitiveLearningLog.query.filter(
            CognitiveLearningLog.error_signature.like("migration_pattern:%")
        ).all()

        if not logs:
            # No learnings yet — return the best static playbook
            return _suggest_static_playbook(server_count, os_types)

        # Score each learning by similarity
        scored = []
        for log in logs:
            try:
                ctx = json.loads(log.context_snapshot or "{}")
                log_os = ctx.get("os", "unknown").lower()
                log_type = ctx.get("type", "ECS").upper()
                log_disk = float(ctx.get("disk_gb", 0) or 0)
                log_strategy = ctx.get("strategy", "unknown")

                # Similarity score
                score = 0
                # OS match
                for os_t in os_types:
                    if os_t in log_os or log_os in os_t:
                        score += 30
                    elif os_t == "linux" and log_os in ("ubuntu", "centos", "debian", "linux"):
                        score += 20
                # Disk similarity (within 50% range)
                if total_disk > 0 and log_disk > 0:
                    disk_ratio = min(total_disk, log_disk) / max(total_disk, log_disk)
                    if disk_ratio > 0.5:
                        score += 15
                # Success bonus
                if log.success:
                    score += 25

                scored.append({"score": score, "strategy": log_strategy, "os": log_os, "project_id": log.project_id})
            except:
                continue

        if not scored:
            return _suggest_static_playbook(server_count, os_types)

        # Sort by score
        scored.sort(key=lambda x: x["score"], reverse=True)
        best = scored[0]
        dominant_strategy = best["strategy"]

        # Find the matching playbook
        master = GlobalPlaybooks.query.get("master")
        if master:
            playbooks = json.loads(master.data) if isinstance(master.data, str) else master.data
            # Look for auto-learned playbook matching this strategy
            for key, pb in playbooks.items():
                if dominant_strategy in key or (pb.get("auto_generated") and dominant_strategy in pb.get("name", "").lower()):
                    confidence = min(best["score"] / 100, 1.0)
                    return {
                        "playbook_key": key,
                        "playbook_name": pb.get("name", key),
                        "tasks": pb.get("tasks", []),
                        "confidence": round(confidence, 2),
                        "matched_patterns": len(scored),
                        "strategy": dominant_strategy,
                        "auto_generated": pb.get("auto_generated", False),
                    }

        return _suggest_static_playbook(server_count, os_types)

    except Exception as e:
        logger.error(f"Playbook suggestion failed: {str(e)}")
        return _suggest_static_playbook(len(mapper_nodes), [])


def _suggest_static_playbook(server_count, os_types):
    """Fallback: suggest the best static playbook when no learnings exist."""
    master = GlobalPlaybooks.query.get("master")
    if not master:
        return None

    playbooks = json.loads(master.data) if isinstance(master.data, str) else master.data

    # Simple heuristic
    has_windows = any("windows" in os_t for os_t in os_types)
    has_db = any("rds" in os_t or "database" in os_t for os_t in os_types)

    if has_db and "database_drs" in playbooks:
        key = "database_drs"
    elif server_count > 10 and "sap_enterprise_cutover" in playbooks:
        key = "sap_enterprise_cutover"
    else:
        key = "default_vm"

    pb = playbooks.get(key)
    if pb:
        return {
            "playbook_key": key,
            "playbook_name": pb.get("name", key),
            "tasks": pb.get("tasks", []),
            "confidence": 0.5,
            "matched_patterns": 0,
            "strategy": "static_template",
            "auto_generated": False,
        }
    return None
