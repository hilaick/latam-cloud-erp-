# Plan-Driven Execution Engine — Architecture Scope

> **For Hermes:** This is a scoping/architecture plan, not an implementation plan. No code changes are prescribed — this defines the contract between Phase 3 (Planning) and Phase 4 (Execution).

**Goal:** Replace the hardcoded 7-phase pipeline with a plan-driven engine that reads the ExecutionPlan contract from Phase 3 and the engagement triage from PreSalesRadar, then dynamically constructs an adapted execution pipeline.

**Architecture:** The ExecutionPlan becomes the single source of truth for what Phase 4 executes. Instead of `StepExecution.jsx` iterating a fixed array, it reads `project.executionPlan` and maps its contents to executable phases. Each phase is no longer a string label but a structured task with dependencies, tool requirements, auth gates, and wave assignments.

**Tech Stack:** Existing — Flask + SQLAlchemy (backend), React + Vite (frontend). No new dependencies.

---

## 1. Scenario Matrix — All Known Engagement Types

The PreSalesRadar qualifies projects across 5 orthogonal dimensions. The cross-product of these dimensions produces the scenario space the execution engine must handle:

### Dimension A: Engagement Type
| ID | Label | Execution Implication |
|----|-------|----------------------|
| `standard` | Standard Migration | Full 7-phase pipeline with source→target migration |
| `greenfield` | Greenfield | Skip source-dependent phases (4.2, 4.4, 4.5, 4.6). Only provision target infrastructure, deploy baseline config |
| `poc` | Proof of Concept | Real deployment — sales model where customer tries solution with actual resources, including migration if necessary for vast migration scenarios. Full pipeline but scoped to representative workloads. NOT a dry-run simulation |
| `expansion` | Expansion Phase 2+ | Target already exists — skip network foundation (4.1). Focus on incremental workload onboarding |

### Dimension B: Migration Scope
| Scope | Execution Implication |
|-------|----------------------|
| `Cross-Region Migration` | Requires inter-region VPC peering or CCN. DRS for DB sync across regions |
| `Cross-Cloud Migration` | Source is AWS/Azure/GCP. Agent-based migration (SMS agent install on source). No native Huawei APIs for source |
| `On-Premise to Cloud` | Requires VPN/Direct Connect or internet-routed migration. SMS agent or Rsync/WinRM agentless |
| `Cloud to Cloud` | Source is another cloud (Huawei or competitor). Native API-driven discovery possible on source |
| `VM Migration` | Scope limited to compute. SMS agent deploy + replication |
| `Database Migration` | Scope limited to databases. DRS task creation + continuous sync. No compute provisioning needed |
| `Application Migration` | Full app stack — compute + DB + network + DNS. All 7 phases |
| `Full Data Center Migration` | Largest scope — multiple waves, multiple apps, DR site. All phases × N waves |

### Dimension C: Source Environment
| Source | Execution Implication |
|--------|----------------------|
| `ON-PREMISE VMWARE` | SMS agent on vCenter or agentless via Rsync. vCenter API for discovery if accessible |
| `ON-PREMISE HYPER-V` | SMS agent on Hyper-V host or agentless. WinRM for Windows VMs |
| `AWS` | Cross-cloud: SMS agent on EC2. AWS API for discovery if credentials available. EBS snapshot import possible |
| `AZURE` | Cross-cloud: SMS agent on Azure VM. Azure API for discovery |
| `GOOGLE CLOUD` | Cross-cloud: SMS agent on GCE. Limited native migration tooling |
| `Huawei Cloud` | Native tools: DRS for DB, SMS for compute. Full API access if source credentials provided. MgC discovery possible |
| `On-Premise Bare Metal` | Physical server migration. P2V conversion required. SMS agent or image-based migration |
| `Other Cloud` | Generic agent-based migration. Assume no source API access |

### Dimension D: Delivery Scope
| Scope | Execution Implication |
|-------|----------------------|
| `turnkey` | Full pipeline executed by Huawei/delivery team. All phases enabled |
| `co_delivery` | Shared execution. Some phases delegated to partner. Phase gating with approval handoffs |
| `advisory` | Partner/customer executes. System provides plan, runbook, and validation. Read-only execution mode |
| `arch_review` | Architecture validation only. Phase 2.4 topology review. No execution |
| `security` | Security/SecOps scope. IAM, security group, encryption phases prioritized |
| `post_live` | Post-migration support. Skip to Phase 5 directly |

### Dimension E: Authorization Level
| Auth Level | Execution Implication |
|------------|----------------------|
| `Read-Only (Customer Managed)` | Cannot execute terraform. Dry-run only. Customer applies terraform themselves. All mutation operations gated |
| `Full Admin (Partner Managed)` | Full access. All phases executable |
| `Co-Managed (Federated)` | Limited access. Some APIs restricted. Enterprise Project scoping required |
| `No Access (Advisory Only)` | No cloud API access. Plan and documentation only. No execution at all |

---

## 2. The ExecutionPlan Contract (Target State)

Currently `project.executionPlan` stores a lightweight wrapper around mode + warnings. The target contract must be a complete, machine-readable specification that the execution engine can consume without human interpretation.

### Proposed Schema

```json
{
  "mode": "agentic",
  "planningCompletedAt": "2026-08-04T16:00:00Z",
  "engagement": {
    "type": "standard",
    "businessDrivers": ["Cost Reduction", "DC Exit"],
    "migrationScope": ["VM Migration", "Database Migration"],
    "sourceEnvironments": ["ON-PREMISE VMWARE"],
    "deliveryScope": ["turnkey"],
    "authLevel": ["Full Admin (Partner Managed)"]
  },
  "strategy": {
    "approach": "rehost",
    "tooling": {
      "compute": "SMS",
      "database": "DRS",
      "file": "Rsync"
    },
    "targetRegion": "la-santiago-1",
    "connectivity": "VPN_IPSEC"
  },
  "waves": [
    {
      "id": "wave-1",
      "label": "Non-Production Pilot",
      "servers": ["app-dev-01", "db-dev-01"],
      "cutoverWindow": "2026-08-15T02:00:00Z",
      "dependsOn": []
    },
    {
      "id": "wave-2",
      "label": "Production Core",
      "servers": ["app-prod-01", "app-prod-02", "db-prod-primary"],
      "cutoverWindow": "2026-08-22T02:00:00Z",
      "dependsOn": ["wave-1"]
    }
  ],
  "phases": [
    {
      "id": "PHASE_4_1",
      "label": "Network & Identity Foundation",
      "applicable": true,
      "waves": ["wave-1", "wave-2"],
      "tool": "terraform",
      "authRequired": "master",
      "dependsOn": [],
      "estimatedMinutes": 45
    },
    {
      "id": "PHASE_4_2",
      "label": "Source Validation & Pre-Flight",
      "applicable": true,
      "waves": ["wave-1"],
      "tool": "sms_agent",
      "authRequired": "source",
      "dependsOn": ["PHASE_4_1"],
      "estimatedMinutes": 30
    },
    {
      "id": "PHASE_4_3",
      "label": "Target Landing Zone Provisioning",
      "applicable": true,
      "waves": ["wave-1"],
      "tool": "terraform",
      "authRequired": "master",
      "dependsOn": ["PHASE_4_1"],
      "estimatedMinutes": 60
    },
    {
      "id": "PHASE_4_4",
      "label": "Data Plane Agent Deployment",
      "applicable": true,
      "waves": ["wave-1"],
      "tool": "sms_agent",
      "authRequired": "tier3",
      "dependsOn": ["PHASE_4_2", "PHASE_4_3"],
      "estimatedMinutes": 20
    },
    {
      "id": "PHASE_4_5",
      "label": "Data Sync Monitor",
      "applicable": true,
      "waves": ["wave-1"],
      "tool": "sms_monitor",
      "authRequired": "tier1",
      "dependsOn": ["PHASE_4_4"],
      "estimatedMinutes": 120
    },
    {
      "id": "PHASE_4_6",
      "label": "Cutover Execution",
      "applicable": true,
      "waves": ["wave-1"],
      "tool": "terraform",
      "authRequired": "master",
      "dependsOn": ["PHASE_4_5"],
      "estimatedMinutes": 30
    },
    {
      "id": "PHASE_4_7",
      "label": "Garbage Collection",
      "applicable": true,
      "waves": ["wave-1"],
      "tool": "terraform",
      "authRequired": "master",
      "dependsOn": ["PHASE_4_6"],
      "estimatedMinutes": 15
    }
  ],
  "riskAssessments": {
    "highRisks": [
      {
        "id": "risk-1",
        "description": "Source vCenter version 6.7 — SMS agent compatibility not guaranteed",
        "mitigation": "Pre-flight validation before Phase 4.2",
        "blocksPhase": null
      }
    ],
    "requiresApproval": false
  },
  "finopsEnvelope": {
    "budgetSOW": 150000,
    "huaweiCoupon": 50000,
    "estimatedBurn": 98000,
    "alertThreshold": 0.8
  }
}
```

### Contract Principles

1. **`applicable` flag** — Each phase declares whether it applies to this engagement. Greenfield sets 4.2/4.4/4.5/4.6 to `false`. PoC sets 4.6/4.7 to `false`. Advisory sets ALL to `false`.

2. **`waves` array** — Each phase declares which waves it applies to. Phase 4.1 (network) applies to all waves. Phase 4.2 (source validation) only applies to wave-1 if source is the same for all waves, or per-wave if sources differ.

3. **`dependsOn`** — Declares explicit phase dependencies. The execution engine topological-sorts before running. Enables parallel execution of independent phases.

4. **`authRequired`** — Maps to the credential tier architecture. The execution engine gates phase execution on credential availability. If a required tier is unavailable, the phase is marked `BLOCKED` rather than failing.

5. **`tool`** — Which backend service handles this phase. The execution engine routes to the correct service (terraform → orchestrator.py, sms_agent → huawei-sms-migration skill, drs → huawei-drs-sync skill).

---

## 3. Scenario-to-Pipeline Mapping

How the 4 engagement types × key source/delivery combinations map to phase applicability:

### A. Standard Migration — On-Prem VMware → Huawei Cloud (Turnkey, Full Admin)
```
Phase 4.1 ✅ Network Foundation (terraform: VPC, subnets, SG, VPN gateway)
Phase 4.2 ✅ Source Pre-Flight (vCenter connectivity, SMS agent compatibility check)
Phase 4.3 ✅ Target Landing Zone (terraform: ECS flavors, disks, PaaS instances)
Phase 4.4 ✅ SMS Agent Deploy (install on source VMs, register with SMS service)
Phase 4.5 ✅ Sync Monitor (replication progress, delta sync)
Phase 4.6 ✅ Cold Cutover (stop source, final sync, promote target IPs)
Phase 4.7 ✅ Garbage Collection (destroy factory resources)
```

### B. Greenfield — New Cloud-Native Deployment
```
Phase 4.1 ✅ Network Foundation
Phase 4.2 ❌ (no source to validate)
Phase 4.3 ✅ Target Landing Zone (full provisioning)
Phase 4.4 ❌ (no migration agents needed)
Phase 4.5 ❌ (no data to sync)
Phase 4.6 ❌ (no cutover — this IS the production environment)
Phase 4.7 ❌ (no migration resources to clean)
```

### C. PoC — 2 VMs + 1 DB, On-Prem VMware → Huawei Cloud (Turnkey, Full Admin)
```
// PoC = REAL deployment, NOT dry-run. Sales model where customer tries solution 
// with actual resources. Full pipeline, scoped to representative workloads.
Phase 4.1 ✅ Network Foundation (real: VPC, VPN gateway for PoC environment)
Phase 4.2 ✅ Source Pre-Flight (real: vCenter connectivity, agent compatibility)
Phase 4.3 ✅ Target Landing Zone (real: provision 2 ECS + 1 RDS instance)
Phase 4.4 ✅ SMS Agent Deploy (real: install on 2 source VMs)
Phase 4.5 ✅ Sync Monitor (real: replication progress for PoC workloads)
Phase 4.6 ✅ Cold Cutover (real: cutover PoC workloads to target)
Phase 4.7 ✅ Garbage Collection (destroy PoC factory resources after validation)
// Key difference from Standard: reduced scale (2-3 servers vs full fleet), 
// may skip DR/backup if not in scope, but ALL phases execute with real resources.
```

### D. Expansion Phase 2+ — Adding workloads to existing landing zone
```
Phase 4.1 ❌ (network already exists — validate only)
Phase 4.2 ✅ Source Pre-Flight (new source servers only)
Phase 4.3 ✅ Target Landing Zone (new ECS/PaaS instances only)
Phase 4.4 ✅ SMS Agent Deploy (new servers only)
Phase 4.5 ✅ Sync Monitor
Phase 4.6 ✅ Cutover (wave-scoped)
Phase 4.7 ✅ Garbage Collection (wave-scoped)
```

### E. Database-Only Migration — On-Prem Oracle → Huawei GaussDB
```
Phase 4.1 ❌ (if network exists)
Phase 4.2 ✅ Source DB Pre-Flight (Oracle version, SCN compatibility)
Phase 4.3 ✅ Target DB Provisioning (terraform: GaussDB instance)
Phase 4.4 ✅ DRS Task Creation (not SMS — DRS for database)
Phase 4.5 ✅ DRS Sync Monitor
Phase 4.6 ✅ DB Cutover (final sync, promote target)
Phase 4.7 ✅ Cleanup
```

---

## 3.4. FinOps Budget & Burn Rate Calculator

### Purpose & Position

FinOps (3.3) sits between Physics (3.2) and Tooling (3.4) in the wizard flow:

```
3.1 WBS → 3.2 Physics → 3.3 FinOps → 3.4 Tooling → 3.5 Runbook
              ↓            ↓
         time estimates  cost estimates
                         (time × rates)
```

This ordering is deliberate: **Tooling is a decision step.** By the time the presales team reaches Tooling, they know how long the migration takes (Physics) and what it costs (FinOps). Tool selection and execution mode become informed strategic choices — not guesses.

### What It Does

The FinOps Calculator (`FinOpsCalculator.jsx`, 531 lines) has two operational views:

#### A. Budget Estimator (default)

Models the **commercial envelope** for the migration engagement:

| Category | Fields | Purpose |
|----------|--------|---------|
| **MRR & Duration** | Monthly recurring revenue, project duration (months), infrastructure complexity tier | Determines migration priority class |
| **Penalty & Commission** | SLA penalty risk %, commercial model (Partner/Direct/Reseller) | Drives cost of failure vs cost of tooling |
| **Resource Rates** | Partner hours + rate, internal hours + rate | Labour cost baseline |
| **Contract Envelope** | SOW budget ceiling, Huawei Cloud coupon allocation, migration overhead budget | Hard financial guardrails |
| **BOM Validation** | Migration BOM (from quotation), actual billing (via API pull) | Validates quoted vs delivered |

#### B. PoC View (conditional)

When `isPoC` flag is active, switches to a simplified view focused on:
- Trial credit allocation (Huawei Cloud coupon)
- Scoped resource count (2-3 representative workloads)
- Time-boxed budget window (typically 30 days)
- Success criteria tied to budget consumption

### Data Persistence

The calculator writes to **two separate keys** on the project:

```
project.budget      → { mrr, durationMonths, infraComplexity, penaltyRisk,
                        commModel, partnerHours, partnerRate, internalHours, internalRate }
project.financials  → { sowBudget, huaweiCoupon, migrationOverhead,
                        overheadScenario, migrationBom, actualBilling }
```

**⚠️ Critical fix applied (2026-08-05):** The Phase 3→4 gate check previously looked for `data.finopsBudget || data.finops` inside `project.data` — a key that NEVER existed. The gate now correctly checks `project.budget || project.financials`.

### Physics → FinOps Handoff (Cost Overlay)

The Delivery Physics Engine now outputs structured cost estimates via `estimateCosts()` in `physicsMath.js`:

```json
{
  "costEstimate": {
    "egressCost": 45.00,        // data size × egress rate per transit type
    "computeCost": 180.00,     // compute-hours × hourly rate × node count
    "agentLicenseCost": 75.00, // SMS/DRS/OMS agent licensing estimate
    "overheadFlat": 50.00,     // setup/teardown minimum
    "totalCost": 350.00,       // sum of above
    "transitType": "IPsec VPN",
    "dataSizeGB": 500
  }
}
```

**Current state:** The `estimateCosts()` function exists and runs inside `physicsMath.js`. It is included in the `physicsResult` structured output saved under `project.physics.result`. The FinOps Calculator does NOT yet consume this data — this is the planned handoff for Phase E (Risk & FinOps Integration).

### FinOps in the ExecutionPlan Contract

As of the 2026-08-05 re-order, the ExecutionPlan contract now includes finops data:

```json
{
  "sourceData": {
    "finops": {
      "budget": { "mrr": 5000, "durationMonths": 3, ... },
      "financials": { "sowBudget": 25000, "huaweiCoupon": 5000, ... }
    }
  }
}
```

This enables Phase 4 to:
- Block cutover if actual burn exceeds SOW budget ceiling *(planned)*
- Trigger budget alerts during long-running sync phases *(planned)*
- Auto-recommend coupon application strategies *(planned)*

### Integration Checklist

| Step | Status |
|------|--------|
| FinOpsCalculator component exists with dual-mode views | ✅ Complete |
| Saves to correct project keys (`budget`, `financials`) | ✅ Complete |
| Gate check reads correct keys | ✅ Fixed 2026-08-05 |
| ExecutionPlan contract includes finops | ✅ Added 2026-08-05 |
| Cost overlay from physics → finops pre-population | ⬜ Planned (Phase E) |
| Burn-rate monitoring during Phase 4 execution | ⬜ Planned (Phase E) |
| Budget alert triggers in agentic orchestrator | ⬜ Planned (Phase E) |

---

## 3.5. Delivery Physics Engine — Analysis & Execution Integration

### What It Does Today

The Physics Engine (`PhysicsEngine.jsx`, planning step 3.3) is a sophisticated SLA calculator that models real-world migration constraints:

**Two operational modes:**
- **Cognitive (Auto PMO):** Uses heuristics (storage utilization %, daily churn %, pipe capacity) to auto-generate Phase 1 (Initial Sync) and Phase 2 (Cutover + Validation) time estimates
- **Granular (Per Server):** Per-node configuration — OS type, sync method (Block/File), small-files penalty, DB row counts + RPS, OMS API object limits

**What it calculates:**
- Effective pipe capacity after TCP overhead (~5%) and crypto tax (IPsec: ~15%, Public Internet: ~25%, DirectConnect: ~5%)
- Per-pillar sync times: Compute (SMS — constrained by pipe + agent IOPS), Database (DRS — constrained by logical rows/sec), Storage (OMS — constrained by API objects/sec)
- Concurrency modeling: N parallel nodes sharing the pipe
- Bottleneck identification: which pillar dominates the timeline
- SLA feasibility: whether cutover fits within the customer's downtime window

**Data flow:**
```
Phase 2.4 (Topology Mapper) → mapperNodes
    ↓
Physics Engine (3.3) reads mapperNodes, auto-classifies into pillars
    ↓
Calculates Phase 1 (Initial Sync) + Phase 2 (Cutover) times
    ↓
Saves to project.physics { engineMode, netSource, transitType, ... nodeConfigs }
    ↓
Phase 3 Gate Check — DOES NOT CONSUME PHYSICS OUTPUT ❌
    ↓
Phase 4 Execution — DOES NOT CONSUME PHYSICS OUTPUT ❌
```

### The Gap: Physics Is an Island

The physics calculation is rich and accurate, but it's a **display-only artifact**. It doesn't feed into the execution plan or drive phase behavior:

| Physics Output | Currently Used? | Should Drive |
|---|---|---|
| Effective pipe capacity (Mbps) | Display only | Phase 4.5 Sync Monitor: expected throughput baseline |
| Per-node sync method (Block vs File) | Display only | Phase 4.4 Agent Deploy: which agent config to apply |
| Per-pillar tool selection (SMS/DRS/OMS) | Display only | Phase 4.4: which service to invoke per node |
| Phase 1 estimated duration (days) | Display only | Phase 4.3+4.4+4.5: total initial sync window |
| Phase 2 estimated duration (hours) | Display only | Phase 4.6 Cutover: expected downtime duration |
| Bottleneck pillar | Display only | Phase prioritization: parallelize non-bottleneck pillars first |
| SLA feasibility (boolean) | Display only | Phase 3 Gate Check: BLOCK execution if infeasible |
| Concurrency limit | Display only | Phase 4.4 Agent Deploy: max parallel agent installs |
| Per-node payload size | Display only | Phase 4.3 Landing Zone: disk sizing, ECS flavor selection |

### Integration Design: Physics → ExecutionPlan → Phase 4

The physics output must become a **section of the ExecutionPlan contract** so Phase 4 can consume it without re-implementing the math:

```json
{
  "physics": {
    "calculatedAt": "2026-08-04T16:00:00Z",
    "engineMode": "cognitive",
    "pipeline": {
      "effectiveMbps": 255,
      "cryptoTax": 0.85,
      "tcpOverhead": 0.95,
      "transitType": "IPsec VPN"
    },
    "concurrency": {
      "maxParallelNodes": 5,
      "perNodeMbps": 51
    },
    "pillars": {
      "compute": {
        "tool": "SMS",
        "nodeCount": 12,
        "totalPayloadGB": 2400,
        "totalChurnGB": 48,
        "initialSyncHours": 52.3,
        "cutoverHours": 1.1
      },
      "database": {
        "tool": "DRS",
        "nodeCount": 3,
        "totalRowsM": 750,
        "cutoverHours": 4.2
      },
      "storage": {
        "tool": "OMS",
        "nodeCount": 2,
        "totalPayloadGB": 5000,
        "initialSyncHours": 18.7,
        "cutoverHours": 0.4
      }
    },
    "executionTimeline": {
      "phase1InitialSyncDays": 2.2,
      "phase2CutoverHours": 5.7,
      "overheadHours": 1.5,
      "totalCutoverHours": 7.2,
      "bottleneck": "Database Logical Sync (DRS)",
      "slaWindowHours": 48,
      "isFeasible": true
    },
    "perNode": {
      "app-prod-01": {
        "syncMethod": "Block",
        "tool": "SMS",
        "payloadGB": 200,
        "estimatedHours": 8.7
      },
      "db-prod-primary": {
        "syncMethod": "Logical",
        "tool": "DRS",
        "rowsM": 250,
        "rps": 5000,
        "estimatedHours": 13.9
      }
    },
    "recommendations": {
      "warnings": [
        "Database pillar dominates cutover — consider pre-migration schema sync",
        "File-heavy nodes (3 found) will incur small-files penalty"
      ],
      "actions": [
        "Increase concurrency to 8 to reduce compute sync time by 37%",
        "Schedule DB cutover during low-transaction window to maximize DRS throughput"
      ]
    }
  }
}
```

### How Physics Drives Each Execution Mode

#### Manual Execution
Physics pre-populates the execution phases with **data-driven defaults**:
- Phase 4.3 (Landing Zone): Disk sizes from `perNode[].payloadGB`, ECS flavors based on source CPU/RAM
- Phase 4.4 (Agent Deploy): Tool per node (`SMS` for compute, `DRS` for databases, `OMS` for storage), concurrency limit from `maxParallelNodes`
- Phase 4.5 (Sync Monitor): Expected throughput baseline (`effectiveMbps`), estimated duration (`initialSyncHours`) for progress tracking
- Phase 4.6 (Cutover): Expected duration (`totalCutoverHours`), bottleneck pillar for real-time monitoring focus
- SLA gate: If `isFeasible === false`, execution is BLOCKED with actionable recommendations

#### Agentic (Fully Orchestrated)
Physics provides the **SLA contract** the agent must honor:
- The Hermes delegate-task prompt includes the full physics section
- The agent is instructed: "Complete initial sync within 2.2 days, cutover within 7.2 hours"
- Agent validates real-time progress against physics estimates — alerts if actual throughput < expected
- Agent can propose concurrency/pipe adjustments if actual conditions differ from modeled
- Per-node estimates enable the agent to sequence nodes optimally (e.g., start large payloads first)

#### Individual (Workbench)
Physics provides **per-node migration estimates** for ad-hoc tasks:
- User selects a node in the Workbench → sees estimated migration time, required tool, sync method
- "Migrate this node" button uses the physics-recommended tool (SMS/DRS/OMS)
- Progress bar shows actual vs estimated time
- User can override physics parameters per-node before execution

### Physics Engine Improvements (Incremental, Non-Destructive)

**1. Structure the output for machine consumption:**
- Currently `project.physics` is a flat key-value bag of UI state. Add a `physics.result` sub-object with the structured output above alongside the existing UI state.
- Backward compatible: existing `project.physics` keys (`engineMode`, `netSource`, etc.) remain — `result` is a new sibling key.

**2. Auto-classify nodes with confidence scores:**
- Currently nodes are classified by simple type-string matching (`computeTypes.includes(...)`, etc.)
- Enhancement: add confidence scoring — a node matching `RDS` is 100% database, but a node with ambiguous type gets a lower confidence and flags for manual review
- Store classification confidence in `perNode[].classificationConfidence`

**3. Add wave-packing recommendations:**
- Physics currently models all nodes as one batch. Enhancement: calculate optimal wave packing based on concurrency limits and pipe capacity.
- Output: `recommendedWaves: [{ nodes: [...], estimatedDays: 2.2 }, { nodes: [...], estimatedDays: 1.8 }]`
- This feeds directly into the ExecutionPlan's `waves` array

**4. Real-time physics recalibration during execution:**
- During Phase 4.5 (Sync Monitor), compare actual throughput against physics estimates
- If actual < 70% of estimated, flag a "Physics Deviation" alert
- Option to recalibrate: update remaining estimates based on observed throughput

**5. Cost estimation overlay:**
- Physics knows per-node payload GB and tool selection — this can feed FinOps burn-rate calculations
- `estimatedEgressCost` for cross-cloud/cross-region migrations
- `estimatedSMSAgentHours` × `costPerAgentHour` for TCO tracking

### Files Affected (Non-Destructive Additions)

| File | Change | Risk |
|------|--------|------|
| `PhysicsEngine.jsx` | Add `result` sub-object generation; wave packing; confidence scoring | Low — additions only |
| `StepPlanning.jsx` | Gate Check reads `project.physics.result` and validates `isFeasible` | Low — adds a validation check |
| `StepExecution.jsx` | Phase cards read `executionPlan.physics` for duration estimates | Low — reads new data |
| `services/orchestrator.py` | `generate_terraform_payload()` reads `physics.perNode[]` for disk/ECS sizing | Medium — changes payload generation |
| `routes/hermes_cli_api.py` | Agentic prompt template includes physics SLA constraints | Low — prompt enrichment only |

---

## 4. Architecture Changes Required

### 4.1 New Data Structures

**`ExecutionPlan` model** (backed by `project.executionPlan` JSON field — reuse existing pattern):
- Define the schema above as the canonical contract
- Add validation on write (Phase 3 Gate Check builds a valid plan)
- Add `plan_version` field for schema evolution

**`ExecutionPhase` enum** (backend validation):
- Replace hardcoded phase strings with enumerated values
- Each phase has metadata: `{id, label, defaultApplicable, requiredTools, requiredAuthTier, defaultDependsOn}`

### 4.2 Backend Changes

**`routes/planning.py`** (NEW — or extend existing):
- `POST /api/projects/<id>/generate-plan` — consumes Phase 3 outputs + engagement triage, produces ExecutionPlan JSON
- `GET /api/projects/<id>/execution-plan` — returns the plan for Phase 4 to consume
- `PUT /api/projects/<id>/execution-plan` — allows plan editing before execution lock

**`services/plan_generator.py`** (NEW):
- `generate_execution_plan(project)` — the core logic: reads triage, Phase 2.4 topology, Phase 3 outputs, produces a complete plan JSON
- Decision tree for each phase's `applicable` flag based on engagement dimensions
- Wave-to-phase mapping: which phases apply per wave

**`routes/execution.py`** (MODIFY):
- `POST /api/projects/<id>/execute` — reads `project.executionPlan.phases` instead of implicit phase list
- Add `POST /api/projects/<id>/execute-phase/<phaseId>` — execute a single phase (manual mode)
- Add `POST /api/projects/<id>/execute-wave/<waveId>` — execute all phases for a specific wave

**`services/orchestrator.py`** (MODIFY):
- `deploy_to_rfs()` — accepts phase metadata, adapts terraform payload based on phase scope (full infra vs single wave vs single server)

### 4.3 Frontend Changes

**`StepPlanning.jsx`** (MODIFY):
- Gate Check calls `POST /api/projects/<id>/generate-plan`
- Shows generated plan preview before allowing promotion to Phase 4
- Allows manual override of phase applicability before lock

**`StepExecution.jsx`** (MAJOR REFACTOR):
- Remove hardcoded `chain` array
- On mount: `GET /api/projects/<id>/execution-plan`
- Render phases dynamically from `executionPlan.phases`
- Each phase card shows: applicability badge, wave scope, auth tier requirement, dependency status
- `handleOrchestrateAll()` topologically sorts phases by `dependsOn`, skips `applicable: false` phases
- Wave selector: filter phases by wave, execute per-wave

**`OrchestratorView`** (MODIFY):
- Phase cards become dynamic (mapped from plan, not hardcoded)
- Add wave tabs to group phases by wave
- Add auth tier indicator per phase (shows if credentials are missing)

**`CommandCenterView`** (ENHANCE):
- Show execution progress as a DAG (topological sort visualization)
- Per-wave progress bars
- Risk register integration: paused phases due to unmitigated risks

### 4.4 New UI Components

**`PlanPreviewModal`** — Shown at Phase 3 Gate Check:
- Displays generated plan: which phases apply, estimated timeline, auth requirements
- "Accept & Lock" vs "Modify" options
- Risk highlights

**`WaveSelector`** — In OrchestratorView:
- Tabs for each wave
- Per-wave phase list
- Wave dependency visualization

**`AuthGateBadge`** — Per-phase indicator:
- Green: required credentials available
- Yellow: credentials available but wrong tier (downgrade warning)
- Red: credentials missing — phase blocked

---

## 5. Implementation Phases (Not Tasks — This Is a Scoping Doc)

### Phase A: Contract Definition (backend only, no UI changes)
1. Define `ExecutionPlan` schema as Python dataclass + JSON Schema
2. Create `ExecutionPhase` enum with metadata
3. Add `plan_version` to `ProjectData` model
4. Write `services/plan_generator.py` with decision tree logic
5. Add `POST /api/projects/<id>/generate-plan` endpoint
6. Add `GET /api/projects/<id>/execution-plan` endpoint
7. **Verify:** POST to generate-plan returns valid plan JSON for a standard project

### Phase B: Plan-Driven Execution (backend)
1. Modify `POST /api/projects/<id>/execute` to read `executionPlan.phases`
2. Add `POST /api/projects/<id>/execute-phase/<phaseId>`
3. Add `POST /api/projects/<id>/execute-wave/<waveId>`
4. Add auth-tier gating in execution (check credentials before phase execution)
5. **Verify:** Manual execution follows generated plan, skips inapplicable phases

### Phase C: UI Adaptation (frontend)
1. `StepPlanning.jsx`: Gate Check calls generate-plan, shows preview
2. `StepExecution.jsx`: Remove hardcoded chain, render from plan
3. `OrchestratorView`: Dynamic phase cards, wave tabs, auth badges
4. `PlanPreviewModal`: Plan visualization at gate check
5. **Verify:** UI renders correct phases for greenfield vs standard vs PoC projects

### Phase D: Wave Engine
1. Wave-to-phase mapping in plan generator
2. Wave selector UI
3. Per-wave execution (execute all phases for one wave)
4. Wave dependency enforcement (wave-2 blocked until wave-1 complete)
5. **Verify:** Multi-wave project executes wave-1 first, then wave-2

### Phase E: Risk & FinOps Integration
1. Risk register items gate phase execution
2. FinOps burn rate monitoring during execution
3. Budget threshold alerts
4. **Verify:** High-risk item blocks phase until mitigated; budget alert fires at 80%

---

## 6. Risks, Tradeoffs & Open Questions

### Risks
- **Plan complexity explosion:** The cross-product of engagement dimensions could produce edge cases not covered by the decision tree. Mitigation: start with the 4 engagement types and 3 most common source×delivery combos (~12 scenarios), add more as needed.
- **Backward compatibility:** Existing projects have no `executionPlan` or have the old lightweight version. Mitigation: `plan_version` field; if missing or version < 2, fall back to hardcoded 7-phase pipeline (graceful degradation).
- **Agentic mode + plan complexity:** The Hermes delegate-task prompt needs to include the plan JSON as context so the agent understands which phases to execute and which to skip. Token budget concern for large plans.
- **Auth tier gating in agentic mode:** If the agent tries to execute a phase that requires credentials the customer hasn't provided, we need a clean WAITING_ON_CUSTOMER state — not a crash.

### Tradeoffs
- **Flexibility vs simplicity:** A fully dynamic plan lets customers customize execution, but makes testing and validation harder. Recommendation: generated plan is the default; manual override requires explicit "unlock plan" action.
- **Per-wave vs per-project execution:** Per-wave is more powerful but adds UI complexity. Recommendation: default to per-project (current behavior), add wave selector as an advanced option.
- **Real-time plan regeneration:** If topology changes after plan generation (e.g., customer adds servers), should the plan auto-update? Recommendation: plan is locked at Phase 3 Gate Check; changes require plan revision + re-approval.

### Open Questions
1. **Should the execution engine support parallel phase execution?** The `dependsOn` DAG allows it technically, but RFS stack operations are sequential. Parallelism would apply to independent waves (wave-1 and wave-2 can run concurrently if no shared infrastructure).
2. **How does rollback work with per-wave execution?** Rolling back wave-2 should not affect wave-1 infrastructure. This requires wave-scoped terraform state management.
3. **Does the plan need to be human-readable as well as machine-readable?** Yes — the PlanPreviewModal must display it clearly for SA/PM approval.
4. **Should the agentic orchestrator generate its OWN plan?** Alternative approach: instead of a generated plan, give the Hermes agent the full Phase 3 context and let IT decide what to execute. This is more autonomous but less deterministic. Recommendation: generated plan as baseline; agentic mode can propose deviations for human approval.

---

## 7. Success Metrics

After implementation, the system should:
1. **Greenfield project:** Execute only phases 4.1 + 4.3 (2 phases, not 7)
2. **Standard migration:** Execute all 7 phases, but with wave-scoping (7 phases × N waves)
3. **PoC with read-only auth:** Execute only dry-run validation phases, zero mutations
4. **Database-only migration:** Skip compute provisioning, use DRS instead of SMS
5. **Expansion Phase 2+:** Skip network foundation, execute incremental phases only

The hardcoded 7-phase pipeline becomes the **default** for a standard turnkey migration — not the only option.
