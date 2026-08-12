# ERP Migration Factory — Project Introduction

Learn about the ERP Migration Factory, an autonomous agentic orchestration platform for migrating enterprise ERP workloads to Huawei Cloud, designed for LATAM service delivery teams.

---

## Overview

The ERP Migration Factory is an **Execution Control Plane** that orchestrates end-to-end cloud migration waves — from ARB Handover through Architecture, Planning, Execution, and Post-Live. It combines a visual delivery constellation, an agentic orchestration engine, and real-time FinOps monitoring into a single integrated platform.

The Factory seamlessly integrates with Huawei Cloud infrastructure services (COC, BSS, IMS, DRS, OBS, DWS) and supports hybrid execution through both automated agent-driven pipelines and manual engineering workbenches.

Primarily intended for **internal service delivery teams** and **enterprise private deployment** at Huawei Cloud LATAM.

### Core Features

| Feature | Description |
|---|---|
| **Visual Delivery Constellation** | Interactive 5-phase project lifecycle (ARB Handover → Architecture → Planning → Execution → Post-Live) with real-time gates and dependency visualization |
| **Agentic Orchestration Engine** | Multi-agent execution pipelines using Hermes Agent delegation — autonomous processing of migration waves with parallel workstreams |
| **Physics Engine** | Compute, storage, and network sizing validation — validates quoted vs. target topology with automatic constraint checking |
| **FinOps Budget & Burn** | Live Huawei Cloud COC/BSS integration for real-time cost tracking, budget burn-down, and commercial true-up against quotation BoM |
| **Strategic Tooling** | Curated tool recommendation matrix for each migration step (SMS, DRS, OBS Browser, rsync, robocopy, etc.) |
| **Wave & Runbook Planning** | Structured migration wave sequencing with dependency chains, cutover windows, and rollback paths |
| **Governance & Change Control** | Built-in ARB intake, ORA risk profiling, DTRB gate reviews, and WAR sign-off workflows |
| **Multi-tenant Architecture** | Adaptable for individual project delivery, regional service teams, and enterprise PMO deployment |

---

## Technical Architecture

```
┌──────────────────────────────────┐
│         React SPA (Vite)         │  ← Frontend (port 9119 served by Flask)
│  ┌────────────────────────────┐  │
│  │  Delivery Constellation    │  │
│  │  Physics Engine            │  │
│  │  FinOps Dashboard          │  │
│  │  Agentic Orchestration     │  │
│  │  Execution Hub             │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│      Flask API Gateway           │  ← Backend (Python 3.11)
│  ┌────────────────────────────┐  │
│  │  /api/auth/*    (JWT)      │  │
│  │  /api/crm/*     (Projects) │  │
│  │  /api/finops/*  (BSS/COC)  │  │
│  │  /api/gateway/* (n8n)      │  │
│  │  /api/deploy/*  (SSH)      │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│    External Services             │
│  ┌──────────┬──────────┬───────┐ │
│  │Huawei    │Huawei    │n8n    │ │
│  │COC/BSS   │IMS/DRS   │WF     │ │
│  └──────────┴──────────┴───────┘ │
│  ┌──────────┬──────────┐         │
│  │Hermes    │PostgreSQL│         │
│  │Agent     │DB        │         │
│  └──────────┴──────────┘         │
└──────────────────────────────────┘
```

| Component | Technology |
|---|---|
| **Frontend** | React 18 + Vite, Tailwind CSS, Font Awesome |
| **Backend** | Flask (Python 3.11), SQLAlchemy, Flask-JWT-Extended |
| **Database** | PostgreSQL (via SQLAlchemy ORM) |
| **Agent Engine** | Hermes Agent delegation API |
| **Workflow Engine** | n8n (via public REST API) |
| **Cloud SDK** | Huawei Cloud Python SDK v3.1+ (COC, BSS, IMS, DRS) |
| **Authentication** | JWT-based (access + refresh tokens, sessionStorage-persisted) |
| **Deployment** | Single-pipe SSH deploy (tar.gz → base64 → SSH pipe → extract → restart) |

---

## Delivery Lifecycle

The ERP Migration Factory implements a **5-phase Operational PM Framework**:

| Phase | Label | Key Steps |
|---|---|---|
| **1** | ARB Handover | 1.1 ARB Intake & SOW, 1.2 High-Level WBS |
| **2** | Architecture | 2.1 Architecture Summary, 2.2 Source Discovery, 2.3 ORA Risk Profile, 2.4 Target Topology Mapper, 2.5 DTRB Governance |
| **3** | Planning | 3.1 WBS & RACI Matrix, 3.2 Delivery Physics Engine, 3.3 FinOps Budget & Burn, 3.4 Strategic Tooling, 3.5 Wave & Runbook Planning |
| **4** | Execution | 4.0 Readiness Gateway, 4.1-4.7 Execution Pipeline, 4.8 Engineering Workbench, 4.9 Delivery Command Center, 4.10 TAM Service Governance |
| **5** | Post-Live | 5.1 3-Way Infrastructure Diff, 5.2 Target Constellation, 5.3 WAR Sign-Off, 5.4 Procurement & PO Handover |

---

## Deployment

### Prerequisites

- **Server**: Huawei Cloud ECS (root access)
- **Python**: 3.11+ with venv
- **Node.js**: 18+ (build only)
- **SSH**: Key-based authentication (ed25519)
- **Network**: Access to proxy.huawei.com:8080 for cloud API calls

### Quick Start

```bash
# 1. Clone and build
git clone <repo-url>
cd repo/frontend && npm install && npm run build
cd ..

# 2. Deploy via SSH
python deploy.py  # Single-pipe: tar.gz → base64 → SSH pipe → extract

# 3. Start
ssh root@<server> "cd /home/huawei-cloud/latam-cloud-erp- && venv/bin/python3 app.py"
```

### Server Details

| Parameter | Value |
|---|---|
| **HTTP App Port** | 9119 |
| **SSH Port** | 8443 |
| **Default Credentials** | admin@erp.com |
| **Auth Token Storage** | `sessionStorage` key: `hermes_access_token` |

---

## License

The ERP Migration Factory is proprietary software developed for Huawei Cloud LATAM service delivery. Internal use only.

---

## Key Design Decisions

1. **Execution based on Target Topology (Phase 2.4), not source discovery (2.2)** — Source discovery is optional/additive; many customers don't grant source access. Target Topology is built from quotation BoM alone.
2. **Always-on Commercial True-Up** — Runs unconditionally, even without tags/active RIs. Validates DELIVERED vs QUOTED. Never gates on RI/tag presence.
3. **No simulated/estimated data** — Backend returns honest `{"live_data_available": false}` when APIs are unavailable (e.g., BSS billing detail for LATAM). Frontend shows "Unavailable" / "No Live Data" labels, never fake numbers.
4. **Wizard sequence is deterministic** — Analysis before decisions: 3.1 WBS → 3.2 Physics → 3.3 FinOps → 3.4 Tooling → 3.5 Runbook.
5. **Deploy must be visible** — Every deploy is verified with the server before reporting "Done". Code-only changes without deploy+restart+verify are incomplete.

---

## Support

For issues, feature requests, or access:
- **ERP System**: http://159.138.148.45:9119
- **Admin Login**: admin@erp.com
- **Session Reference**: Search past sessions with `session_search` for implementation history
