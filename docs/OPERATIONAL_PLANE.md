# ERP Migration Factory — Operational Plane Architecture

## Verified System State (2026-08-16)

### Running Processes
```
Process                        PID     Port    Status
──────────────────────────────────────────────────────
python3 app.py (Flask)         4039058 9119    ✅ Running
huawei_load_balancer.py        4017612 8666    ✅ Running
hermes gateway run             4017591 —       ✅ Running (Tier 2)
hermes daemon (port 5005)      —       5005    ❌ NOT LISTENING — Tier 1 down
postgresql                     —       5432    ✅ Running
```

### HermesConfig (from /api/hermes-cli/health)
- mode: `cli` (not `http`) — uses subprocess, NOT the load balancer
- global: `deepseek/deepseek-v4-pro`
- delegation: `zai/glm-5.2`
- binary: `/usr/local/lib/hermes-agent/venv/bin/hermes`
- **Tier 1 daemon** (port 5005) is DOWN — all `execute_privileged_engine_command()` calls fall through to Tier 2 subprocess
- **Load balancer** (port 8666) is running but returns `"All key allocation routing attempts failed"` — the 6 API keys configured in it are not routing successfully

### Critical Finding: Both Tier 1 + LB are broken
The Hermes daemon (port 5005) is dead. The load balancer (8666, the alternative HTTP path) is also failing. This means:
- `execute_privileged_engine_command()` → Tier 1 fails → Tier 2 fallback → `hermes chat` subprocess
- `hermes_delegate_task()` → since mode is `cli`, uses subprocess path → `hermes chat --profile exec`
- The ERP Agent chat → Socket.IO to Flask → `routes/hermes.py` WebSocket relay → load balancer on 8666 → **fails silently** because the LB can't route

## Complete Configuration Map

### Category 1: System-Level Credentials (Operational Plane)
These are the keys the ERP SYSTEM needs to run — NOT customer cloud credentials.

| Credential / Config | Where | How to Set | Status |
|---------------------|-------|-----------|:------:|
| Hermes model/provider | `HermesConfig` Postgres row | Settings page → `PUT /api/hermes-config` | ✅ Set: deepseek-v4-pro / glm-5.2 |
| Hermes binary path | `HermesConfig.hermes_binary_path` | Settings page | ✅ `/usr/local/lib/hermes-agent/venv/bin/hermes` |
| Load balancer URL | `HermesConfig.lb_url` | Settings page | ⚠️ Set but failing |
| Load balancer auth | `HermesConfig.lb_auth` | Settings page | ⚠️ Set but routing fails |
| Postgres connection | `DATABASE_URL` env var | Server `/etc/environment` or `~/.bashrc` | ✅ Running |
| Proxy auth (SSH) | `base64.b64encode(b'username:')` | Hardcoded in deploy scripts | ✅ Working (empty password) |
| SSH key | `~/.ssh/id_ed25519` | File system | ✅ Exists |
| Git credentials | `~/.git-credentials` + `credential.helper store` | File system | ✅ Configured |
| npm proxy | `npm config set proxy http://proxy.huawei.com:8080` | Config file | ✅ Set |

### Category 2: Customer Cloud Credentials (Data Plane)
Stored per-customer in the `Customer` model, encrypted:

| Credential | DB Column | Used For |
|-----------|-----------|----------|
| Master AK/SK | `ak` / `sk` | Target account provisioning (RFS, IAM, BSS) |
| Source Huawei AK/SK | `source_huawei_ak` / `source_huawei_sk` | Source discovery (cross-account) |
| Tier 2 EPS Admin | Encrypted in vault blob | Sandbox EPS provisioning |
| Tier 3 per-tool | Encrypted in vault blob | SMS agent / DRS / Terraform |

### Category 3: Application Config (Env Vars / Files)

| Config | File / Env | Value |
|--------|-----------|-------|
| Flask secret key | `config.py` `SECRET_KEY` | Set |
| JWT secret | `config.py` `JWT_SECRET_KEY` | Set |
| Database URL | `DATABASE_URL` env var | `postgresql://postgres:***@localhost:5432/erp` |
| Hermes skills dir | `/root/.hermes/skills/devops/` | 20 production-tested skills |
| Knowledge cache | `~/.hermes/knowledge-cache/` | 1 repo cached: 1-3-Cloud-Adoption-Skills |

## Gap Analysis: What Must Be Fixed Before "Deterministic Migration Factory"

### Gap 1: Daemon on port 5005 (Tier 1) needs restart
The daemon provides direct socket IPC without Postgres dependency. Without it, every Hermes call depends on:
1. Postgres being up (for `_get_hc()`)
2. Subprocess being available (for `hermes chat`)
3. The Hermes binary being at the right path

**Fix:** Start the daemon with `nohup /usr/local/lib/hermes-agent/venv/bin/hermes daemon --port 5005 > /tmp/daemon.log 2>&1 &`

### Gap 2: Load balancer API keys need checking
The LB at `/root/huawei_load_balancer.py` has 6 API keys but can't route. Root cause is likely expired or misconfigured keys for the provider APIs (DeepSeek, ZAI, Kimi).

### Gap 3: ERP Agent (HermesModal) → broken WebSocket path
The Socket.IO chat connects to the Flask server, which relays to the load balancer on 8666. Since the LB can't route, the Agent returns errors.

### Gap 4: Delivery Command Interface → no backend route
`/api/executions/<id>/command` doesn't exist. Commands return 404.

### Gap 5: Simulator → Orchestration integration
The simulator produces detailed traces but they're never fed into the live `delegate-task` chain.

---

## Architecture Diagram — As-Is State

```
User Browser
    │
    ├── ERP Agent Chat (HermesModal.jsx)
    │   └── Socket.IO → Flask → routes/hermes.py → LB :8666 ❌
    │
    ├── Delivery Command (GlobalCommandDrawer.jsx)
    │   └── POST /api/executions/<id>/command → 404 ❌
    │
    ├── Agentic Simulation (AgenticOrchestrationPanel.jsx)
    │   └── POST /api/projects/<id>/agentic-dry-run
    │       └── AgenticExecutionSimulator.simulate() ✅
    │       └── Returns rich trace (commands, deps, specs) ✅
    │       └── BUT trace is NOT used by live orchestration ❌
    │
    └── Orchestrate All (StepExecution.jsx)
        └── For loop 7 phases → delegate-task API
            └── Tier 1 :5005 ❌
            └── Tier 2 subprocess → hermes chat ✅ (if binary works)
```

## Architecture Diagram — Target State

```
User Browser
    │
    ├── ERP Agent Chat
    │   └── Socket.IO → Flask → Tier 2 subprocess (since daemon + LB broken)
    │       → hermes chat with project context injected
    │
    ├── Delivery Command
    │   └── POST /api/hermes-cli/query (EXISTING ✅)
    │       → execute_privileged_engine_command()
    │       → Tier 2 → hermes chat
    │
    ├── Simulation (read-only, what WOULD happen)
    │   └── POST /api/projects/<id>/agentic-dry-run ✅
    │   └── AgenticExecutionSimulator.simulate() ✅
    │   └── Stores result in `project.agenticDryRun`
    │
    └── Orchestrate All (real execution)
        ├── Reads simulation trace from `project.agenticDryRun`
        ├── Passes per-phase commands + resource specs as context to delegate-task
        ├── Tier 2 subprocess → hermes chat --profile exec
        └── Tracks progress via delegate_tasks + execution_logs
```
