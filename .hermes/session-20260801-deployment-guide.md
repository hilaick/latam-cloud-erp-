# Session Deployment Guide — 2026-08-01
## ERP Migration Factory — feature-migration-lifecycle-2

---

## Commits Delivered

### Commit 1: `0e1c486` — Credential Routing + UI Fixes
### Commit 2: `37f6122` — 4.0 Readiness Gateway

---

## What Changed

### 1. NOC Scan: Credential Fix (Commit 1)
**File:** `StepPostLive.jsx` line 633 (runFinalNocScan)
- ❌ Before: sent `projectId` → backend legacy path → sometimes used Source credentials
- ✅ Now: sends `use_source_credentials: false` explicitly, no `projectId`
- **Verify:** Phase 5 → 3-Way Infrastructure Diff → Run Final NOC Scan
  - Open browser DevTools Network tab
  - Confirm POST to `/api/cloud/inventory` body does NOT contain `projectId`
  - Confirm it DOES contain `use_source_credentials: false`

### 2. MgC Discovery: Explicit Credential Flag (Commit 1)
**File:** `MgCReconciliationView.jsx` line 63 (handleLiveScan)
- Now explicitly sends `use_source_credentials: true`
- **Verify:** Phase 2 → 2.2 Source Discovery (MgC) → Run Live Scan
  - Network tab: confirm body has `use_source_credentials: true`

### 3. Phase 1 Gate: BoM Required (Commit 1)
**File:** `StepARB.jsx` line 27 (Approve Gate button)
- ❌ Before: unlocked immediately
- ✅ Now: disabled until `blueprintData` (BoM uploaded in 1.1 Intake)
- **Verify:** Phase 1 → 1.1 ARB Intake & SOW
  - Without BoM: button shows "Upload Quotation BoM First" (disabled)
  - After uploading Excel BoM: button shows "Approve Gate →" (enabled)

### 4. NOC Results Modal: Dark Mode (Commit 1)
**File:** `StepPostLive.jsx` line 1032 (detailsModal)
- Full dark theme matching CustomerDirectory: bg-slate-800/900, emerald-400 accents
- **Verify:** Phase 5 → 3-Way Diff → click any Resource Count badge
  - Modal should be dark (not white). Header = bg-slate-900 with emerald-400 title.

### 5. 4.0 Readiness Gateway (Commit 2) — MAJOR
**New files:**
- `routes/gateway.py` — 7 API endpoints
- `services/huawei_iam.py` — IAM client
- `services/huawei_eps.py` — EPS client
- `n8n/docker-compose.yml` — deployment manifest
- `n8n/README.md` — setup instructions

**Updated files:**
- `app.py` — registered gateway blueprint
- `StepExecution.jsx` — real ReadinessGatewayView UI

**Verify:**
1. Phase 4 → 4.0 Readiness Gateway tab
2. Page should auto-run the readiness check on load
3. You should see a Check Matrix with 5 rows:
   - Master AK/SK (valid/missing/blocked)
   - Real-Name Authentication (valid/unverified)
   - Tier 2: Sandbox EPS Admin (valid/missing)
   - EPS Bracket (small/medium/large)
   - OS Data Plane (configured/missing)
4. If real-name auth is unverified: amber warning box appears with risk acknowledgment checkbox
5. If all checks pass: "Unlock Execution Engine" button is active
6. "Re-Check" button re-runs validation

### 6. Backend API Endpoints (Commit 2)
All under `/api/gateway/*`:
| Endpoint | Purpose |
|----------|---------|
| POST /validate-master | Ping IAM with Master AK/SK |
| POST /check-realname-auth | Check real-name verification status |
| POST /provision-eps | Create Enterprise Project (size-bracketed) |
| POST /validate-tier2 | Test EPS Admin Key against EPS |
| POST /validate-tier3 | Tool-specific permission validation |
| POST /test-os-cred | OS data plane credential check |
| POST /full-check | Aggregated readiness report |

**Verify:** `curl -k https://159.138.148.45:9119/api/gateway/full-check` (when server reachable)

---

## n8n Dashboard Setup

n8n is not yet deployed — server (159.138.148.45) is currently unreachable (ping timeout).
When server is accessible:

1. SSH: `ssh -p 8443 root@159.138.148.45`
2. Check Docker: `docker --version`
3. Deploy:
   ```
   mkdir -p /opt/n8n
   cd /opt/n8n
   # Copy docker-compose.yml from repo
   docker network create erp-network 2>/dev/null || true
   docker compose up -d
   ```
4. Access: `https://159.138.148.45:5678`
5. Login: admin / (see docker-compose.yml)
6. Import workflows from `/data/workflows/`

---

## Bundle Hash
`index-Dj9J0Khh.js` (1,014 KB) — contains all changes from both commits.

## Verification Summary
- Source checks: 26/27 passed (1 deploy.py false negative — script deploys entire dist/)
- Frontend build: ✓ succeeded (5.03s)
- Git push: pending (background process)
