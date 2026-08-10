"""
Agentic Execution Simulator — Dry-Run Engine for Hermes-Driven Orchestration.
Simulates wave processing without touching any cloud API.
Generates a full trace log: agent spawns → task delegation → verification loops.
"""
import json, logging, math, random
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class AgenticExecutionSimulator:
    """
    Pure simulation engine. Takes an execution contract (topology, physics,
    finops, tool assignments, waves) and produces a deterministic trace of
    what agentic orchestration WOULD do — without calling any cloud API.
    """

    # ── Simulation constants ──────────────────────────────────────────
    # How long each phase step takes in simulation (seconds of wall-clock)
    STEP_TIMINGS = {
        "agent_spawn": 8,          # spawning an Hermes subagent
        "topology_scan": 15,       # agent reads topology for its server
        "tool_dispatch": 10,       # pick right migration tool
        "network_provision": 20,   # create VPC/subnet/EIP via Terraform
        "vm_provision": 45,        # provision target VM
        "agent_install": 30,       # install SMS/HSS/UniAgent on target
        "sync_start": 20,          # kick off data replication
        "sync_monitor": 15,        # check sync progress
        "sync_cutover": 30,        # final sync + cutover
        "post_validation": 25,     # verify target health
        "dns_switch": 10,          # DNS cutover
        "source_cleanup": 15,      # decommission source
        "handoff": 5,              # agent returns result to orchestrator
    }

    # Agent decision templates — deterministic based on server properties
    DECISION_TEMPLATES = {
        "ECS_WEB": {
            "tool": "Huawei SMS Agent (block-level replication)",
            "reasoning": "Standard web server — SMS block replication optimal for IIS/Apache workloads with minimal reconfiguration.",
            "pre_check": "Verify source OS version compatible with Huawei SMS. Check disk layout < 40 TB.",
        },
        "ECS_DB": {
            "tool": "Huawei DRS (Database Replication Service)",
            "reasoning": "Database detected — DRS ensures transactional consistency with sub-second RPO.",
            "pre_check": "Verify DB engine version supported by DRS. Ensure WAL/redo logging enabled for CDC.",
        },
        "ECS_APP": {
            "tool": "Huawei SMS Agent (block-level replication)",
            "reasoning": "Application server — SMS handles app binaries and config. Post-sync app reconfigure needed.",
            "pre_check": "Verify hostname resolution. Document all app-specific config paths.",
        },
        "BMS": {
            "tool": "Huawei Image Import Service + SMS Hybrid",
            "reasoning": "Bare metal — image-based migration with SMS for data delta sync.",
            "pre_check": "Verify BMS flavor availability in target AZ. Image must be < 1 TB compressed.",
        },
        "RDS": {
            "tool": "Huawei DRS (Database Replication Service)",
            "reasoning": "Managed DB — DRS handles both homogenous and heterogeneous migration with schema conversion.",
            "pre_check": "Verify source DB network accessible from Huawei Cloud via VPN/Direct Connect.",
        },
        "VM": {
            "tool": "Huawei SMS Agent (block-level replication)",
            "reasoning": "Generic VM — SMS provides agent-based migration with continuous delta sync.",
            "pre_check": "VMware tools or Hyper-V integration services must be running.",
        },
    }

    @staticmethod
    def _pick_decision(server: dict) -> dict:
        """Determine what tool + reasoning an agent would choose for this server."""
        name = str(server.get("name", "")).upper()
        kind = str(server.get("type", "ECS")).upper()

        if kind in ("RDS", "GAUSSDB", "DB", "DATABASE"):
            return AgenticExecutionSimulator.DECISION_TEMPLATES["RDS"]
        if kind == "BMS":
            return AgenticExecutionSimulator.DECISION_TEMPLATES["BMS"]
        if any(kw in name for kw in ("SQL", "DB", "MYSQL", "ORACLE", "POSTGRES", "MARIA")):
            return AgenticExecutionSimulator.DECISION_TEMPLATES["ECS_DB"]
        if any(kw in name for kw in ("WEB", "IIS", "NGINX", "APACHE", "HTTP")):
            return AgenticExecutionSimulator.DECISION_TEMPLATES["ECS_WEB"]
        if any(kw in name for kw in ("APP", "SAP", "ERP")):
            return AgenticExecutionSimulator.DECISION_TEMPLATES["ECS_APP"]
        return AgenticExecutionSimulator.DECISION_TEMPLATES["VM"]

    @staticmethod
    def _simulate_throughput(physics: Optional[dict]) -> float:
        """Derive effective Mbps from physics data for timing calculations."""
        if not physics:
            return 100  # default 100 Mbps
        net_source = float(physics.get("netSource", 1000))
        net_tunnel = float(physics.get("netTunnel", 300))
        pipe = min(net_source, net_tunnel)
        transit = str(physics.get("transitType", "Direct Connect"))
        if "VPN" in transit:
            crypto_tax = 0.85
        elif "Public" in transit:
            crypto_tax = 0.75
        else:
            crypto_tax = 0.95
        return pipe * crypto_tax

    @staticmethod
    def _estimate_sync_time(server: dict, physics: Optional[dict]) -> float:
        """Estimate data sync wall-clock time in hours."""
        disk_gb = float(server.get("diskGB", server.get("disk_gb", 100)))
        effective_mbps = AgenticExecutionSimulator._simulate_throughput(physics)
        # ~5% change rate during sync window
        data_to_sync_gb = disk_gb * 0.05
        sync_seconds = (data_to_sync_gb * 8000) / effective_mbps  # GB→Mb / Mbps
        return max(sync_seconds / 3600, 0.1)  # minimum 6 minutes

    @staticmethod
    def simulate(project: dict) -> dict:
        """
        Run the full agentic orchestration dry-run simulation.
        
        Args:
            project: dict with keys — mapperNodes, waves, physics, finops,
                     toolAssignments, executionMode, projectName, region
        
        Returns:
            dict with trace, timeline, resource_usage, summary
        """
        mapper_nodes = project.get("mapperNodes", [])
        waves = project.get("waves", [])
        physics = project.get("physics", {})
        finops = project.get("finops", {})
        tool_assignments = project.get("toolAssignments", {})
        region = project.get("region", "la-south-2")
        project_name = project.get("projectName", "UNNAMED")
        concurrency = int(physics.get("concurrency", 5)) if physics else 5

        # If no waves defined, auto-group servers into waves by type
        if not waves and mapper_nodes:
            waves = AgenticExecutionSimulator._auto_group_waves(mapper_nodes, concurrency)

        trace: List[dict] = []
        resource_usage = {
            "agents_spawned": 0,
            "eips_consumed": 0,
            "vpcs_created": 0,
            "subnets_created": 0,
            "instances_provisioned": 0,
            "cbr_vaults_used": 0,
            "peak_parallel_agents": 0,
        }
        total_simulated_seconds = 0
        step_id = 0

        # ── Phase 4.0: Orchestrator Initialization ──
        step_id += 1
        trace.append({
            "id": step_id,
            "phase": "PHASE_4_0",
            "agent": "Orchestrator",
            "action": "INIT",
            "message": f"Agentic Orchestrator initialized for project '{project_name}' in {region}. "
                       f"Concurrency limit: {concurrency} parallel agents. Mode: DRY-RUN (simulation only).",
            "timestamp_offset_seconds": 0,
            "decision": None,
        })
        total_simulated_seconds += AgenticExecutionSimulator.STEP_TIMINGS["agent_spawn"]

        # ── Phase 4.1: Network Provisioning ──
        step_id += 1
        trace.append({
            "id": step_id,
            "phase": "PHASE_4_1",
            "agent": "Orchestrator → Terraform Agent",
            "action": "NETWORK_PROVISION",
            "message": f"Deploying landing zone: VPC, subnets, security groups, and NAT gateway for {region}. "
                       f"BOM-validated sizing from topology blueprint.",
            "timestamp_offset_seconds": total_simulated_seconds,
            "decision": {"tool": "Huawei RFS (Resource Formation Service)", "template": "latam-erp-landing-zone-v3"},
        })
        total_simulated_seconds += AgenticExecutionSimulator.STEP_TIMINGS["network_provision"]
        resource_usage["vpcs_created"] += 1
        resource_usage["subnets_created"] += 2  # mgmt + app subnet
        resource_usage["eips_consumed"] += 1  # NAT gateway EIP

        # ── Phase 4.2: Wave Processing ──
        servers_processed = 0
        for wave_idx, wave in enumerate(waves):
            wave_name = wave.get("name", f"Wave-{wave_idx + 1}")
            wave_servers = wave.get("servers", wave.get("nodes", []))
            if not wave_servers:
                # Try to resolve from mapper_nodes by name
                server_names = wave.get("serverNames", [])
                wave_servers = [n for n in mapper_nodes if n.get("name") in server_names]
            
            if not wave_servers:
                continue

            step_id += 1
            trace.append({
                "id": step_id,
                "phase": "PHASE_4_2",
                "agent": "Orchestrator",
                "action": "WAVE_START",
                "message": f"Starting {wave_name}: {len(wave_servers)} servers. "
                           f"Estimated window: {len(wave_servers) * 2:.0f}-{len(wave_servers) * 4:.0f} hours.",
                "timestamp_offset_seconds": total_simulated_seconds,
                "decision": {"wave": wave_name, "server_count": len(wave_servers)},
            })
            total_simulated_seconds += AgenticExecutionSimulator.STEP_TIMINGS["agent_spawn"]

            # Process servers in this wave, respecting concurrency
            for batch_start in range(0, len(wave_servers), concurrency):
                batch = wave_servers[batch_start:batch_start + concurrency]
                batch_agents = len(batch)
                resource_usage["agents_spawned"] += batch_agents
                resource_usage["peak_parallel_agents"] = max(
                    resource_usage["peak_parallel_agents"], batch_agents
                )

                # Each server gets its own agent
                batch_results = []
                for server in batch:
                    # Resolve server ID string to full server object from mapperNodes
                    if isinstance(server, str):
                        server_obj = next((n for n in mapper_nodes if n.get("id") == server), {"id": server, "name": server})
                    else:
                        server_obj = server
                    server_result = AgenticExecutionSimulator._simulate_server_migration(
                        server_obj, physics, tool_assignments, step_id, total_simulated_seconds, region
                    )
                    step_id = server_result["final_step_id"]
                    total_simulated_seconds = server_result["final_offset"]
                    batch_results.append(server_result)
                    servers_processed += 1

                # After batch, agents report back
                for result in batch_results:
                    step_id += 1
                    trace.append({
                        "id": step_id,
                        "phase": "PHASE_4_2",
                        "agent": f"Agent-{result['server_name']}",
                        "action": "HANDOFF",
                        "message": f"Agent for '{result['server_name']}' reports: "
                                   f"{result['outcome']}. Sync time: {result['sync_hours']:.1f}h.",
                        "timestamp_offset_seconds": total_simulated_seconds,
                        "decision": {"outcome": result["outcome"], "sync_hours": result["sync_hours"]},
                    })
                    total_simulated_seconds += AgenticExecutionSimulator.STEP_TIMINGS["handoff"]

            # Wave completion
            step_id += 1
            trace.append({
                "id": step_id,
                "phase": "PHASE_4_2",
                "agent": "Orchestrator",
                "action": "WAVE_COMPLETE",
                "message": f"{wave_name} complete. {len(wave_servers)} servers migrated. "
                           f"Advancing to post-validation.",
                "timestamp_offset_seconds": total_simulated_seconds,
                "decision": None,
            })
            total_simulated_seconds += AgenticExecutionSimulator.STEP_TIMINGS["post_validation"]

        # ── Phase 4.7: Garbage Collection ──
        step_id += 1
        trace.append({
            "id": step_id,
            "phase": "PHASE_4_7",
            "agent": "Orchestrator → Terraform Agent",
            "action": "GARBAGE_COLLECT",
            "message": f"Stripping transient factory resources: {resource_usage['agents_spawned']} mig-worker VMs "
                       f"and associated EIPs. PPU cost ceases after this phase.",
            "timestamp_offset_seconds": total_simulated_seconds,
            "decision": {"destroyed": ["mig-worker ECS instances", "transient EIPs", "temporary security groups"]},
        })
        total_simulated_seconds += AgenticExecutionSimulator.STEP_TIMINGS["source_cleanup"]

        # ── Build Summary ──
        total_hours = total_simulated_seconds / 3600
        effective_mbps = AgenticExecutionSimulator._simulate_throughput(physics)
        budget = finops.get("budget", {}) if isinstance(finops, dict) else {}
        budget_total = float(budget.get("total", budget.get("amount", 10000)))
        estimated_cost = servers_processed * 120  # ~$120/server for agentic orchestration overhead
        cost_efficiency = "UNDER_BUDGET" if estimated_cost < budget_total else "OVER_BUDGET"

        summary = {
            "project": project_name,
            "mode": "agentic",
            "dry_run": True,
            "servers_total": len(mapper_nodes),
            "servers_processed": servers_processed,
            "waves_count": len(waves),
            "total_simulated_hours": round(total_hours, 1),
            "estimated_wall_clock_days": round(total_hours / 24, 1),
            "effective_throughput_mbps": round(effective_mbps, 0),
            "peak_parallel_agents": resource_usage["peak_parallel_agents"],
            "resource_usage": resource_usage,
            "cost_estimate_usd": estimated_cost,
            "budget_usd": budget_total,
            "cost_efficiency": cost_efficiency,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "note": "DRY-RUN — no cloud resources were provisioned or modified.",
        }

        return {
            "success": True,
            "dry_run": True,
            "trace": trace,
            "summary": summary,
        }

    @staticmethod
    def _simulate_server_migration(
        server: dict,
        physics: Optional[dict],
        tool_assignments: dict,
        base_step_id: int,
        base_offset: int,
        region: str,
    ) -> dict:
        """Simulate a single server's migration by an agent."""
        server_name = server.get("name", "unknown")
        server_type = str(server.get("type", "ECS")).upper()
        decision = AgenticExecutionSimulator._pick_decision(server)
        sync_hours = AgenticExecutionSimulator._estimate_sync_time(server, physics)
        step_id = base_step_id
        offset = base_offset

        # Agent spawn
        step_id += 1
        offset += AgenticExecutionSimulator.STEP_TIMINGS["agent_spawn"]

        # Topology scan
        step_id += 1
        offset += AgenticExecutionSimulator.STEP_TIMINGS["topology_scan"]

        # Tool dispatch decision
        step_id += 1
        offset += AgenticExecutionSimulator.STEP_TIMINGS["tool_dispatch"]

        # VM provisioning (if not already exists)
        step_id += 1
        offset += AgenticExecutionSimulator.STEP_TIMINGS["vm_provision"]

        # Agent installation on target
        step_id += 1
        offset += AgenticExecutionSimulator.STEP_TIMINGS["agent_install"]

        # Data sync
        step_id += 1
        sync_seconds = int(sync_hours * 3600)
        offset += sync_seconds

        # Cutover
        step_id += 1
        offset += AgenticExecutionSimulator.STEP_TIMINGS["sync_cutover"]

        # Post-validation
        step_id += 1
        offset += AgenticExecutionSimulator.STEP_TIMINGS["post_validation"]

        # DNS switch
        step_id += 1
        offset += AgenticExecutionSimulator.STEP_TIMINGS["dns_switch"]

        # Determine outcome with realistic failure rate (~5%)
        success = random.random() > 0.05
        outcome = (
            "SUCCESS: Target validated, DNS cut over, source decommissioned"
            if success
            else "RETRY_NEEDED: Sync lag exceeded threshold, agent will retry with reduced concurrency"
        )

        return {
            "server_name": server_name,
            "server_type": server_type,
            "decision": decision,
            "sync_hours": round(sync_hours, 1),
            "outcome": outcome,
            "final_step_id": step_id,
            "final_offset": offset,
        }

    @staticmethod
    def _auto_group_waves(mapper_nodes: list, max_per_wave: int) -> list:
        """Auto-group servers into waves when no explicit wave plan exists."""
        # Group by type: databases first (high risk), then app servers, then web
        db_servers = []
        app_servers = []
        web_servers = []
        other_servers = []

        for node in mapper_nodes:
            name = str(node.get("name", "")).upper()
            kind = str(node.get("type", "ECS")).upper()
            if kind in ("RDS", "GAUSSDB", "DB", "DATABASE") or any(
                kw in name for kw in ("SQL", "DB", "MYSQL", "ORACLE")
            ):
                db_servers.append(node)
            elif any(kw in name for kw in ("APP", "SAP", "ERP")):
                app_servers.append(node)
            elif any(kw in name for kw in ("WEB", "IIS", "NGINX", "APACHE")):
                web_servers.append(node)
            else:
                other_servers.append(node)

        waves = []
        for group_name, group in [
            ("Wave 1 — Database", db_servers),
            ("Wave 2 — Application", app_servers),
            ("Wave 3 — Web", web_servers),
            ("Wave 4 — Remaining", other_servers),
        ]:
            if not group:
                continue
            for i in range(0, len(group), max_per_wave):
                batch = group[i:i + max_per_wave]
                label = f"{group_name}" if len(group) <= max_per_wave else f"{group_name} (batch {i // max_per_wave + 1})"
                waves.append({"name": label, "servers": batch, "serverNames": [n.get("name") for n in batch]})

        return waves


# ── Flask route to be registered in routes/execution.py ──────────────────

def register_agentic_dry_run_routes(execution_bp):
    """Register the agentic dry-run endpoint on the execution blueprint."""
    from flask import request, jsonify
    from flask_jwt_extended import jwt_required
    from models import ProjectData

    @execution_bp.route("/api/projects/<project_id>/agentic-dry-run", methods=["POST"])
    @jwt_required()
    def agentic_dry_run(project_id):
        """Simulate agentic orchestration for a project without touching cloud APIs."""
        try:
            project_record = ProjectData.query.get(project_id)
            if not project_record:
                return jsonify({"success": False, "error": "Project not found"}), 404

            project_data = json.loads(project_record.data) if isinstance(project_record.data, str) else project_record.data
            # Ensure we have a dict (handle double-serialization edge case)
            if isinstance(project_data, str):
                project_data = json.loads(project_data)
            
            # Build execution contract from project data
            contract = {
                "projectName": project_data.get("name", "UNNAMED"),
                "region": project_data.get("region", "la-south-2"),
                "mapperNodes": project_data.get("mapperNodes", []),
                "waves": project_data.get("waves", []),
                "physics": project_data.get("physics", {}),
                "finops": {
                    "budget": project_data.get("budget", {}),
                    "financials": project_data.get("financials", {}),
                },
                "toolAssignments": project_data.get("toolAssignments", {}),
                "executionMode": "agentic",
            }

            result = AgenticExecutionSimulator.simulate(contract)
            return jsonify(result), 200

        except Exception as e:
            import traceback
            logger.exception(f"Agentic dry-run failed for project {project_id}")
            return jsonify({"success": False, "error": str(e), "traceback": traceback.format_exc()}), 500
