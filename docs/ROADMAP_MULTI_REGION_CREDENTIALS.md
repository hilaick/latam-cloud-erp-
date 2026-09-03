# Roadmap — Multi-Region / Multi-Project Credentials Management

> **Status:** Design consolidated from 6 working sessions (Aug 1 – Aug 29, 2026).
> **Branches from:** `feature-migration-lifecycle-2`
> **Owner:** ERP Migration Factory (LATAM)
> **Guiding principle:** Zero Trust — Read-Only has no SOURCE access; customer installs agents; ERP runs all target-side ops. Single source of truth.

---

## 1. Why this roadmap exists

Today the ERP stores **one set of credentials per customer** (`Customer` record) and derives the target region from `customer.region` (INTERNAL_ACCOUNT → `la-north-2`). Everything else — projects, discovery, execution — inherits that single default.

This breaks the moment a customer has more than one project in different accounts or regions:

```
Customer (INTERNAL_ACCOUNT)
  └─ region: la-north-2        ← single default for ALL projects
  ├─ Project CR-1 → la-north-2 ✅ (inherits correctly)
  ├─ Project CR-2 → la-north-2 ✅ (inherits correctly)
  └─ Project CR-3 → sa-brazil-1 ❌ (no way to override)
```

Six sessions produced the evidence, the design decisions, and the known gaps. This document consolidates them into one authoritative feature roadmap so the deferred work can be picked up without re-deriving context.

---

## 2. Current state (proven / in production)

| Area | How it works today | Proven in |
|---|---|---|
| **Single account, multi-region** | Master AK/SK + per-region Keystone `project_id` resolution; cross-region discovery works when each API endpoint is called with ITS region's project scoping | Session: `20260813_101956_e02074`, `20260820_080656_8d3d77` |
| **Credential storage** | Plain AK/SK fields on `Customer` model (`ak/sk`, `tier1/2/3`, `source_huawei_*`, `aws_*`, `azure_*`, `os_domain/user/pw`) | `models.py` |
| **Credential tiers** | Master / Source / OS Data Plane / Multi-cloud defined; **Tier 1 & Tier 3 roles undefined**; Tier 2 = sandbox EPS Admin | Session: `20260801_143125_97bb4b` |
| **Readiness Gateway** | 4.0 gateway decision tree with Paths A/B/C (no EPS → direct master; real-name ✓ no Tier2 → EPS via master; full ladder) — **3 overlapping implementations** (see §2.1) | Session: `20260801_143125_97bb4b` and live server audit Aug 29, 2026 |
| **Target region source** | `Reconcile Scope` reads `customer.region`, **not** `project.region` (Guided Wizard already collects region per project, Section A field 8 — it's just ignored) | Session: `bg_131630_f81250` |
| **Credential intake** | Presales radar fields 20–24: Master AK/SK, Source Huawei creds (+region), Multi-cloud, OS Data Plane, real-name status | Session: `20260803_150122_9bf149` |

### 2.1 Known dupes — the 3 overlapping Readiness Gateway implementations

A live server audit (Aug 29) revealed the gateway was built in **three separate iterations**, each adding more surface area without removing the prior version:

```mermaid
flowchart LR
  subgraph "Implementation A — Main API gateway"
    A1[gateway.py<br>959 lines, 11 endpoints]
    A2[huawei_iam.py<br>118 lines — stub client]
    A3[huawei_eps.py<br>78 lines — stub client]
  end
  subgraph "Implementation B — Plan builder"
    B[execution_engine.py<br>PHASE_4_0 block<br>in build_plan()]
  end
  subgraph "Implementation C — Simulation"
    C[agentic_simulator.py<br>PHASE_4_0 steps<br>~30 ReadinessGateway nodes]
  end
  A1 -- frontend calls --> FE[ReadinessGatewayView in<br>StepExecution.jsx<br>calls /api/gateway/full-check]
  B -- via --> execRoute[routes/execution.py<br>imports ExecutionEngine]
```

| # | File | Type | Endpoints / Surface | Status | Serves |
|---|---|---|---|---|---|
| **A** | `routes/gateway.py` | **Flask Blueprint** (`/api/gateway/*`) | 11 endpoints: `validate-master`, `check-realname-auth`, `provision-eps`, `validate-tier2`, `validate-tier3`, `test-os-cred`, `validate-credential`, `full-check`, `create-tier2-credentials`, `generate-n8n-workflow`, `deploy-n8n-workflow` | ✅ **Active** — frontend calls `/api/gateway/full-check` on mount | Live IAM validation via `HuaweiIAMClient.ping()` (creates temp hcloud profile) + regex-based real-name & tier checks |
| **A-backing** | `services/huawei_iam.py` | **IAM stub client** | `ping()` (hcloud subprocess), `check_realname_auth()` (REST direct — bypasses `HuaweiCloudClient` pattern) | ⚠️ **Active but fragile** — uses `X-Auth-AK`/`X-Auth-SK`/`X-Project-Id` custom headers instead of proper SDK v3 signing. `check_realname_auth()` first tries `/v5.0/realname-authentication/status` (likely non-existent API) then falls back to `/v3.0/OS-USER/users`. Both bypass the proven `HuaweiCloudClient` signer. | Individual gateway endpoint calls |
| **A-backing** | `services/huawei_eps.py` | **EPS stub client** | `list_eps()`, `create_enterprise_project()`, `list_resources()` — also uses `X-Auth-AK`/`X-Auth-SK` direct headers | ⚠️ **Active but untested** — likely encounters `Common.0013` cross-region signing mismatch. Does NOT use the proven `HuaweiCloudClient` path. | EPS provisioning in gateway |
| **B** | `services/execution_engine.py` | **Plan-building engine** | `build_plan()` generates PHASE_4_0 steps: `CREDENTIAL_VALIDATION`, `PROJECT_ID_DISCOVERY`, `EPS_PROVISIONING` (Path A/B), `EPS_VERIFICATION_REQUIRED` etc. | ❌ **Dead code path** — `execution_engine.py` is imported by `routes/execution.py` at lines 774/836/959/969/979 but never fired in practice. The frontend calls `/api/gateway/full-check` directly, not the execution engine's build_plan(). | Planned replacement for the API gateway — not reached in practice |
| **C** | `services/agentic_simulator.py` | **Simulation orchestrator** | ~30 `PHASE_4_0` / `ReadinessGateway` agent nodes generating mock gateway results during simulation runs | ✅ **Active but simulation-only** — these are mock steps for the agentic simulation engine, not real API calls. Not a blocker — they correctly simulate gateway passes during dry-run mode. | Simulation/dry-run only |

#### Key concerns

1. **`huawei_iam.py` and `huawei_eps.py` bypass the proven signing path** — they construct their own `X-Auth-AK`/`X-Auth-SK` headers instead of using `HuaweiCloudClient` from `/root/huawei_hmac_auth.py`. The `Common.0013` cross-region bug (proven in production) likely means these have never successfully called a non-default-region API.

2. **`gateway.py`'s `full-readiness-check` does NOT route through `execution_engine.py`** — there are two independent gateway implementations living side-by-side, both claiming to serve Phase 4.0, but the execution engine path is effectively dead code.

3. **`execution_engine.py` includes its own PHASE_4_0 logic** that duplicates all gateway checks (credential validation, project discovery, EPS provisioning). It uses skills knowledge tree resolution + MCP endpoints, which is architecturally superior. If the execution engine ever goes live, the /api/gateway endpoints would be redundant.

4. **n8n worklow generation endpoints** (`generate-n8n-workflow`, `deploy-n8n-workflow`) are baked into `gateway.py` — they don't belong in a credential validation gateway. They were an early-phase experiment that should be extracted or removed.

### Known bugs & blockers (proven in production)

1. **Vault credential persistence** — GUI-saved AK/SK is lost on page refresh. (`20260813_101956_e02074`)
2. **Cross-region signing mismatch** — `Common.0013: "the current region is [X] and does not match with the project name [Y]"` when source-region credentials are used against a target-region endpoint. Root cause: credentials carry an implicit region/project scope, and callers were not resolving per-endpoint project scoping. (`20260820_080656_8d3d77`)
3. **No per-project override** — a project cannot declare its own target account, target region, or source account/region. (`bg_131630_f81250`)

---

## 3. Target architecture (the design we agreed to build)

```
Customer record = DEFAULTS (convenience, not authority)
├─ master_ak/sk, default_region (la-north-2), default source scoping
│
└─ Project (each carries its OWN credential context)
   ├─ target_account   (AK/SK — which Huawei account to deploy into)
   ├─ target_region    (which region in that account)
   ├─ source_account   (AK/SK or CSMS secret ref — where to discover from)
   ├─ source_region
   └─ credential_mode  (direct | csms | agency)      ← NEW
```

- `Reconcile Scope` / Target Architecture builder reads **project**, falls back to **customer** only as default.
- Credential retrieval is **just-in-time**: direct AK/SK today, CSMS later; never persist retrieved source secrets — memory only.
- All credential handoffs keep the Zero Trust split: customer installs agents, ERP runs target-side ops.

---

## 4. Feature roadmap

Priority labels: 🔴 P0 (blockers / security) · 🟡 P1 (core feature) · 🟢 P2 (hardening/enhancement)

### Epic A — 🔴 P0 · Vault credential persistence fix
**Status:** 🔴 Bug confirmed in production — highest urgency.
- [ ] Root-cause the refresh-loss of GUI-saved AK/SK (frontend state vs backend persistence path)
- [ ] Re-verify save → server restart → load round-trip for all credential fields
- [ ] Strip empty/masked values before PUT (existing convention — enforce it here)
- **Acceptance:** save credentials, hard-refresh browser, credentials still present; no raw secret in any GET response.

### Epic B — 🔴 P0 · Cross-region / cross-project signing hardening
**Status:** 🔴 `Common.0013` proven in production; partial fix already in IAM signer.
- [ ] Every API call resolves its **own region's `project_id`** before signing (never reuse a foreign project scope)
- [ ] Add scope guard: assert region + project consistency before `sign_and_request` / hcloud CLI invocation → fail fast with a clear message instead of `Common.0013`
- [ ] Per-endpoint region map (control plane regions per service: SMS = Singapore control plane, etc.)
- **Acceptance:** no `Common.0013` in a two-region (source `ap-southeast-3` → target `la-north-2`) live run.

### Epic C — 🟡 P1 · Per-project credential & region override model
**Status:** 🟡 Designed, deferred ("not yet", Aug 26). Core of the multi-region/multi-project story.
- [ ] Extend `Project` model: `target_ak/sk`, `target_region`, `source_ak/sk`, `source_region`, `credential_mode`, `source_account_id`
- [ ] Migration: backfill existing projects from `customer` (defaults) — customer stays the single source for legacy records
- [ ] Update `Reconcile Scope` (Target Architecture builder) to read `project.target_region` → fallback `customer.region`
- [ ] Guided Wizard Section A field 8 (`region`) now actually flows into the project record
- [ ] Region selector + source/target account fields per project in Customer Directory UI
- **Acceptance:** CR-3-style project targets `sa-brazil-1` while CR-1/CR-2 stay `la-north-2`, end-to-end through discovery → execution.

### Epic D — 🟡 P1 · Complete credential tier definitions (Tier 1 & Tier 3)
**Status:** 🟡 Open design questions from Aug 1 never closed.
- [ ] Define Tier 1 role (candidate: read-only auditor / Cloud Eye / CES monitoring)
- [ ] Define Tier 3 role (candidate: SMS-agent-dedicated low-privilege key — server migration only)
- [ ] Decide EPS scope: one Enterprise Project **per customer** (all waves) vs **per wave** (finer isolation)
- [ ] Decide real-name-auth failure behavior: block vs proceed Path A/B with explicit risk acceptance
- [ ] Designate SMS Agent credential tier (Tier 2 or Tier 3?) and enforce in SMS flows
- **Acceptance:** Readiness Gateway report states exactly which tier each operation used and why.

### Epic E — 🟡 P1 · Auth-tier gating in execution
**Status:** 🟡 Proposed Aug 3; gateway frontend still a stub.
- [ ] `POST /api/projects/<id>/execute-phase/<phaseId>` / `execute-wave/<waveId>` check credentials **before** phase execution
- [ ] Wire the 4.0 Readiness Gateway against live IAM validation (master valid + real-name status + tier presence per Path A/B/C)
- **Acceptance:** execution endpoints refuse to run a phase whose required credential tier is absent, with a human-readable reason.

### Epic F — 🟢 P2 · CSMS credential backend (secure sharing)
**Status:** 🟢 Fully designed Aug 29. Removes email/phone/spreadsheet credential transmission.
- [ ] Customer stores source secrets (AWS/Azure AK/SK, vSphere, DB passwords, SSH keys) as **CSMS secrets (JSON)** in their target account
- [ ] ERP retrieves on-demand with Master AK/SK → CSMS+KMS decrypts server-side → use in-memory, never persist
- [ ] New intake mode in credential validation: `direct` (legacy) | `csms` (secret name + refs)
- [ ] Verify hcloud CLI CSMS command support on ERP server (retrieval path = `hcloud CSMS ShowSecretVersion ...`)
- [ ] Optional: IAM Agency (委托) / STS layer — **only as complement**, NOT a sole path (SMS agent requires permanent AK/SK; temp tokens fail)
- **Acceptance:** a full migration draws AWS source creds from CSMS with zero out-of-band transmission except the existing Master AK/SK; CTS audit trail shows every retrieval.

### Epic G — 🟢 P2 · Readiness Gateway live dashboard
**Status:** 🟢 Enhancement.
- [ ] Replace hardcoded "Cloud credentials validated" stub with live per-tier status chips
- [ ] Show per-project credential coverage matrix (Master / Tier1 / Tier2 / Tier3 / Source / OS / Multi-cloud) with Path A/B/C outcome
- **Acceptance:** one screen answers "can this project execute?" for every tier.

### Epic H — 🔴 P0 · Consolidate Readiness Gateway implementations (SINGLE SOURCE OF TRUTH)
**Status:** 🔴 Audit done Aug 29, 2026 — 3 overlapping implementations live side-by-side (see §2.1). The user's directive: **"update the commit and handle all together. later we can remove whats not needed or that breaks the ERP system's current functionality."**
- [ ] **Decide the survivor:** keep A (`routes/gateway.py` — what frontend actually calls) as the READ endpoint; treat B (`execution_engine.py` PHASE_4_0) as the future replacement but gate its adoption behind a live test
- [ ] **Route all signing through one path:** `huawei_iam.py` + `huawei_eps.py` must use `HuaweiCloudClient` (`/root/huawei_hmac_auth.py`) — the proven signer — instead of custom `X-Auth-AK`/`X-Auth-SK` headers. Fix applies Epic B scope guard to every call in gateway.py
- [ ] **Extract n8n endpoints** (`generate-n8n-workflow`, `deploy-n8n-workflow`) out of gateway.py into their own blueprint (`routes/n8n.py`) — they are not credential validation
- [ ] **Deprecate clearly:** docstring banner on `huawei_iam.py`/`huawei_eps.py` pointing to `HuaweiCloudClient`; remove dead imports from `routes/execution.py` only after B is proven or deleted
- [ ] Keep C (`agentic_simulator.py` PHASE_4_0 mock nodes) as-is — simulation must not call real APIs
- **Acceptance:** ONE code path validates credentials for Phase 4.0 in live mode; `/api/gateway/*` and the execution engine agree on readiness; no endpoint calls Huawei APIs with non-`HuaweiCloudClient` signing; simulation unchanged.

---

## 5. Sequencing & dependencies

```
Now (P0)          Epic A  vault persistence        ← blocks everything else
                  Epic B  cross-region signing     ← hardens live SMS runs
                  Epic H  gateway consolidation    ← SINGLE SOURCE OF TRUTH

Next (P1)         Epic C  per-project override     ← needs A (credential save is reliable)
                  Epic D  tier definitions         ← independent; unblocks E
                  Epic E  auth-tier gating         ← needs D + H

Later (P2)        Epic F  CSMS backend             ← needs C (per-project secret refs)
                  Epic G  gateway dashboard        ← needs D + E + H
```

**Dependency chain:** A → C → F · D → E → G · H gates E,G · B independent throughout.

---

## 6. Decisions log (consolidated from sessions)

| # | Decision | Rationale | Source session |
|---|---|---|---|
| D1 | Customer record is a **default**, projects **override** (target/source account + region) | CR-3 must reach `sa-brazil-1` without touching CR-1/CR-2 | `bg_131630_f81250` |
| D2 | Master AK/SK is the **only credential transmitted**; everything else retrievable | Minimal trust surface, already the practice today | `bg_181124_2ca87b` |
| D3 | CSMS over email/chat/spreadsheets for source secrets | Revocable, versioned, CTS-audited, customer retains lifecycle control | `bg_181124_2ca87b` |
| D4 | IAM Agency/STS **cannot be the sole path** — SMS agent needs permanent AK/SK | Proven constraint: agent registration + some hcloud ops reject `X-Security-Token` | `bg_181124_2ca87b` |
| D5 | Cross-region calls require **per-region project scoping**; fail fast on mismatch | `Common.0013` proven in production | `20260820_080656_8d3d77`, `20260813_101956_e02074` |
| D6 | Execution endpoints gate on **credential tier presence** before running | Prevent half-run phases on under-privileged creds | `20260803_150122_9bf149` |
| D7 | SMS flow uses `sms_v9.py`/`sms_v10.py` pattern; agent restart creates a NEW source id | Established SMS execution pattern — do not reinvent | ERP skill tree |
| D8 | `routes/gateway.py` is the **live** Readiness Gateway (frontend calls it); `execution_engine.py` PHASE_4_0 is a **planned replacement** (skills+MCP-driven) but unproven; `agentic_simulator.py` PHASE_4_0 is **simulation-only** | Live server audit Aug 29, 2026 found 3 overlapping implementations — consolidate to ONE code path (§2.1, Epic H) | Live server audit + user directive, `20260829` |

---

## 7. Source sessions

| Session | Date | What it contributed |
|---|---|---|
| `20260801_143125_97bb4b` | Aug 1 | Credential tier ladder, Readiness Gateway Paths A/B/C design |
| `20260803_150122_9bf149` | Aug 3 | Presales radar credential intake fields; auth-tier gating proposal |
| `20260813_101956_e02074` | Aug 13 | Cross-region live pipeline; Keystone per-region scoping; vault persistence bug |
| `20260820_080656_8d3d77` | Aug 20 | `Common.0013` cross-region signing mismatch (root cause evidence) |
| `bg_131630_f81250` | Aug 26 | Multi-Account/Multi-Region design; per-project override model (deferred) |
| `bg_181124_2ca87b` | Aug 29 | CSMS secure credential backend; agency/STS analysis; D2–D4 |

---

*This document is the single source of truth for multi-region / multi-project credentials work. Update the roadmap and Decision Log here as features land — do not fork the context into new docs.*
