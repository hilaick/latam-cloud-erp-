# Auto-Healing Execution Architecture (2026-09-04)
_Self-sustaining migration pipeline: Plan → Simulate → Execute → Heal → Update Plan_

## The Five-Step Cycle

```
                         ┌──────────────────────────────┐
                         │    1. PLAN SIMULATOR          │
                         │    (LLM-enriched generator)   │
                         │    Target Arch + Resources    │
                         │    Kit → Execution Plan       │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │    2. DRY-RUN SIMULATION      │
                         │    (deterministic physics)    │
                         │    Runs plan against physics  │
                         │    Predicts failures, timing  │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │    3. EXECUTE                 │
                         │    (deterministic — no LLM)   │
                         │    Runs plan steps per phase  │
                         │    Each phase = scripts/CLI   │
                         └──────────────┬───────────────┘
                                        │
                     ┌──────────────────┴──────────────────┐
                     │                                     │
                   SUCCESS                              FAILURE
                     │                                     │
                     │                    ┌────────────────┴────────────────┐
                     │                    │                                 │
                     ▼                    ▼                                 ▼
            ┌──────────────┐   ┌──────────────────────┐        ┌──────────────────────┐
            │ COMPLETE     │   │ 4. AUTO-HEAL (retry)  │        │ 5. LLM-TROUBLESHOOT  │
            │ Move to next │   │ Rebuild plan from     │        │ (3rd+ attempt)       │
            │ phase/task   │   │ current state + fix   │        │ Spawn agent to       │
            └──────────────┘   │ → step 2 (re-sim)     │        │ diagnose + fix       │
                               │ Max 2 retries         │        │ → update plan        │
                               └──────────┬────────────┘        │ → step 2 (re-sim)    │
                                          │                     └──────────────────────┘
                                          │                                │
                                          └────────────┬───────────────────┘
                                                       ▼
                                            ┌──────────────────────┐
                                            │ UPDATE PLAN + SKILL  │
                                            │ Record failure →     │
                                            │ enrich the Resources │
                                            │ Kit for next time    │
                                            └──────────────────────┘
```

## Principle

**The LLM should only be present where reasoning is required — nowhere else.**

| Phase | Reasoning? | LLM needed? | Implementation |
|-------|-----------|-------------|----------------|
| 1. Plan Generator | ✅ Strategy selection, resource cross-ref from Knowledge Kit | ✅ Yes | `build_plan()` + simulation model |
| 2. Dry-Run Sim | ⚠️ Physics timing, failure prediction | Maybe (model enriches) | `agentic_simulator.simulate()` |
| 3. Execute | ❌ Follow the plan | ❌ No | `ExecutionEngine.execute(step_id)` + scripts |
| 4. Auto-Heal (retry) | ❌ Rebuild plan from current state | ❌ No | Same deterministic code, fresh state |
| 5. LLM Troubleshoot | ✅ Diagnose novel failure | ✅ Yes | `delegate_task` → fix → update plan |
| 6. Update Skills | ✅ Synthesize lesson | ✅ Yes | Write new knowledge back to the Kit |

## Auto-Heal Rules

1. **Attempt 1**: Execute plan as-is. If a step fails → log exact error, mark step status=failed.
2. **Attempt 2**: Rebuild plan from current state (what succeeded) + skip failed step (try alternative if available). Re-simulate, re-execute.
3. **Attempt 3**: Spawn LLM agent to diagnose the failure directly. Agent can SSH, read logs, modify configs. After fix → update plan, re-simulate, re-execute.
4. **After success on any attempt**: Record the failure + fix in the Knowledge Kit (skills tree) so next time the Plan Generator already knows about it.

## Why this is NOT overkill

- **Empirically proven**: The syncing=false fix was found by trying → failing → analyzing → rebuilding → succeeding. This five-step cycle is what we lived, just manually.
- **Self-sustaining**: Each failure teaches the system. The Resources Kit grows. After enough cycles, Attempt 1 succeeds because the Plan Generator already knows the fix.
- **No single point of failure**: The LLM is never in the hot path. If the model is down, execution still runs (steps 1+2 may be stale, but step 3 works). The model only appears when things break.
- **Autonomous**: The 3-attempt ladder means the system fixes common issues (like `--syncing=false` or `vols_map`) without human intervention. The human only sees it on attempt 3+.

## What this replaces

The old approach (current `orchestration_engine.py`) tried to spawn an LLM agent per phase — making the model critical path for every execution. New approach: **LLM in planning and enrichment only. Deterministic execution. Auto-heal on failure. Skills update after success.**
