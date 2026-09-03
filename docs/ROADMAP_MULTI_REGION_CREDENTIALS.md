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
| **Readiness Gateway** | 4.0 gateway decision tree with Paths A/B/C (no EPS → direct master; real-name ✓ no Tier2 → EPS via master; full ladder) — frontend currently a stub | Session: `20260801_143125_97bb4b` |
| **Target region source** | `Reconcile Scope` reads `customer.region`, **not** `project.region` (Guided Wizard already collects region per project, Section A field 8 — it's just ignored) | Session: `bg_131630_f81250` |
| **Credential intake** | Presales radar fields 20–24: Master AK/SK, Source Huawei creds (+region), Multi-cloud, OS Data Plane, real-name status | Session: `20260803_150122_9bf149` |

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

---

## 5. Sequencing & dependencies

```
Now (P0)          Epic A  vault persistence        ← blocks everything else
                  Epic B  cross-region signing     ← hardens live SMS runs

Next (P1)         Epic C  per-project override     ← needs A (credential save is reliable)
                  Epic D  tier definitions         ← independent; unblocks E
                  Epic E  auth-tier gating         ← needs D

Later (P2)        Epic F  CSMS backend             ← needs C (per-project secret refs)
                  Epic G  gateway dashboard        ← needs D + E
```

**Dependency chain:** A → C → F · D → E → G · B independent throughout.

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
