# ERP Migration Factory — Complete User Manual

**Version:** 1.0.0  
**Last Updated:** August 2026  
**Platform:** Huawei Cloud LATAM (la-north-2)  
**Access URL:** `https://159.138.148.45:9119`  

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Getting Started](#2-getting-started)
3. [Navigation & Layout](#3-navigation--layout)
4. [Dashboard — Global View](#4-dashboard--global-view)
5. [Pipeline — Master Delivery Tracker](#5-pipeline--master-delivery-tracker)
6. [Pre-Sales Radar](#6-pre-sales-radar)
7. [Master Execution Hub](#7-master-execution-hub)
8. [Regional Map](#8-regional-map)
9. [Customer Directory](#9-customer-directory)
10. [FinOps Dashboard (COC)](#10-finops-dashboard-coc)
11. [Global Schedule](#11-global-schedule)
12. [Global Process View](#12-global-process-view)
13. [Resource Discovery Map](#13-resource-discovery-map)
14. [Playbook Studio](#14-playbook-studio)
15. [Live Cloud NOC](#15-live-cloud-noc)
16. [Workflow Graph](#16-workflow-graph)
17. [Halted Projects](#17-halted-projects)
18. [User Management (Admin)](#18-user-management-admin)
19. [Project Wizard — 5-Phase Migration Lifecycle](#19-project-wizard--5-phase-migration-lifecycle)
    - [Phase 1: ARB Handover](#phase-1-arb-handover)
    - [Phase 2: Architecture](#phase-2-architecture)
    - [Phase 3: Planning](#phase-3-planning)
    - [Phase 4: Execution](#phase-4-execution)
    - [Phase 5: Post-Live](#phase-5-post-live)
20. [AI & Automation Tools](#20-ai--automation-tools)
21. [Help & Documentation System](#21-help--documentation-system)
22. [Glossary of Terms](#22-glossary-of-terms)
23. [Troubleshooting & FAQ](#23-troubleshooting--faq)
24. [AI Model Configuration & API Keys](#24-ai-model-configuration--api-keys)
25. [Skills Knowledge Tree](#25-skills-knowledge-tree)
26. [MCP Servers](#26-mcp-servers)
27. [Agentic Orchestration & Execution Mode](#27-agentic-orchestration--execution-mode)
28. [Readiness Gateway](#28-readiness-gateway)

---

## 1. Overview & Architecture

### What is ERP Migration Factory?

The **ERP Migration Factory** is an end-to-end cloud migration orchestration platform built for **Huawei Cloud LATAM**. It automates the complete lifecycle of migrating enterprise ERP workloads from on-premises, AWS, or Azure to Huawei Cloud — from initial sales handover through architecture design, planning, execution, and post-live validation.

### Key Capabilities

| Capability | Description |
|---|---|
| **5-Phase Migration Lifecycle** | ARB → Architecture → Planning → Execution → Post-Live |
| **Multi-Tenant Project Management** | Isolated projects with RBAC access control |
| **FinOps Cost Optimization** | RI/ECS reconciliation, burn tracking, TCO comparison |
| **Physics Engine** | Server resource mapping, network topology, performance modeling |
| **Automated Tool Recommendation** | AI-driven migration tool selection (SMS, DRS, OBS, etc.) |
| **Execution Gateway** | 3-tier least-privilege credential provisioning |
| **Hermes AI Assistant** | Built-in AI agent for queries, troubleshooting, and automation |
| **Live NOC Monitoring** | Real-time migration dashboards |
| **DTRB Governance** | Architecture review board compliance and change request tracking |

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser (React)                    │
│  Dashboard │ Pipeline │ Wizard │ FinOps │ NOC │ Admin   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS :9119
┌──────────────────────▼──────────────────────────────────┐
│              Flask Backend (Python 3.12)                 │
│  Auth │ Projects │ CRM │ Gateway │ FinOps │ Execution   │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
┌──────────▼──────────┐    ┌─────────▼────────────────────┐
│  SQLite Database     │    │  Huawei Cloud APIs           │
│  (Projects, Users,   │    │  (ECS, IAM, BSS, EPS, SMS,  │
│   Customers, Vault)  │    │   OBS, DRS, VPC, DWS)       │
└─────────────────────┘    └──────────────────────────────┘
```

---

## 2. Getting Started

### Login

1. Navigate to `https://159.138.148.45:9119`
2. Enter your credentials:
   - **Admin:** `admin@erp.com`
   - **Password:** Provided by your system administrator
3. If 2FA is enabled, enter the code sent to your email

### Roles & Permissions

| Role | Access Level |
|---|---|
| **Admin** | Full system access — user management, all projects, configuration |
| **Manager** | Create/edit projects, view all pipelines, FinOps access |
| **SA (Solutions Architect)** | Architecture design, topology mapping, governance |
| **Engineer** | Execution pipeline, runbook, migration tools |
| **Viewer** | Read-only access to dashboards and project status |

### Session Management

- Sessions are JWT-based with automatic refresh
- Tokens stored securely in `sessionStorage`
- Sessions expire after 24 hours of inactivity
- Click your avatar → **Logout** to end your session

---

## 3. Navigation & Layout

### Top Bar

| Element | Function |
|---|---|
| **Hamburger Menu** (left) | Toggle sidebar navigation |
| **Search** | Quick-find projects, customers, or pages |
| **? Help** | Opens global help documentation |
| **Book Icon** | Opens Glossary of migration terms |
| **Terminal Icon** | Opens Command Drawer (quick actions) |
| **Brain Icon** | Opens Hermes AI Assistant |
| **User Avatar** | Profile menu → Logout |

### Sidebar Navigation

The left sidebar provides access to all system views:

| Icon | View | Purpose |
|---|---|---|
| 📊 | **Dashboard** | Global migration overview & KPIs |
| 📋 | **Pipeline** | Master delivery pipeline with timeline |
| 📡 | **Pre-Sales Radar** | Estimated/upcoming project pipeline |
| ♟️ | **Master Hub** | Aggregated execution control center |
| 🌎 | **Regional Map** | Geographic project distribution |
| 🏢 | **Customer Directory** | Customer & credential management |
| 💰 | **FinOps (COC)** | Cost optimization & RI management |
| 📅 | **Schedule** | Project timeline & calendar view |
| 🗺️ | **Process** | Step-by-step methodology view |
| 🔍 | **Discovery** | Source resource discovery map |
| 📚 | **Playbooks** | Standard operating procedures |
| 📺 | **Live NOC** | Real-time migration monitoring |
| 🔀 | **Workflow Graph** | Visual process graph |
| 📦 | **Halted Projects** | Archived/suspended/cancelled projects |

### Mobile Navigation

On mobile devices, the sidebar collapses to a bottom dock for touch-friendly access. Key views are accessible via icon buttons.

---

## 4. Dashboard — Global View

**Access:** Sidebar → Dashboard (default landing page)

The **Global Dashboard** provides a high-level overview of all migration activities:

### Dashboard Widgets

| Widget | Description |
|---|---|
| **KPI Cards** | Total projects, active migrations, completed, at-risk |
| **Regional Breakdown** | Projects by LATAM country (Brazil, Mexico, Argentina, etc.) |
| **Phase Distribution** | Pie chart showing projects by lifecycle phase |
| **Health Summary** | Green/Yellow/Red project health indicators |
| **Upcoming Cutovers** | Next 7/14/30 day go-live schedule |
| **FinOps Snapshot** | Monthly burn rate, RI coverage %, savings |
| **Recent Activity** | Latest project updates, comments, status changes |

### Actions

- Click any KPI card to filter the pipeline view
- Click a region to zoom into Regional Map
- Click an upcoming cutover to open the project wizard

---

## 5. Pipeline — Master Delivery Tracker

**Access:** Sidebar → Pipeline

The **Master Pipeline** is the central project management view for tracking all migration projects through their lifecycle.

### Features

| Feature | Description |
|---|---|
| **Inline Editing** | Click any editable cell (status, dates, SA, nodes) to modify |
| **Timeline View** | Horizontal Gantt-style project bars showing phase progress |
| **Grid View** | Sortable table with filterable columns |
| **Calendar View** | Monthly/weekly/daily calendar with cutover dates |
| **Bulk Update** | Select multiple projects to update status, dates, or assignments |
| **Export** | Download pipeline data as CSV/Excel |
| **Edit History** | View change log per project (who changed what, when) |

### Health Indicators

| Color | Meaning |
|---|---|
| 🟢 **Green** | On track — no blockers |
| 🟡 **Yellow** | At risk — attention needed |
| 🔴 **Red** | Critical — blocked or delayed |
| 🔵 **Blue (Dashed)** | Pre-Sales — estimated timeline |

### Column Reference

| Column | Description |
|---|---|
| **Project Name** | Customer/project identifier |
| **SA** | Assigned Solutions Architect |
| **PM** | Project Manager |
| **Health** | Green/Yellow/Red status |
| **Phase** | Current lifecycle phase (1-5) |
| **Progress** | % completion within current phase |
| **Start Date** | Project kickoff date |
| **Target Go-Live** | Planned cutover date |
| **Nodes** | Number of servers/VMs to migrate |
| **Region** | Target Huawei Cloud region |

---

## 6. Pre-Sales Radar

**Access:** Sidebar → Pre-Sales Radar

The **Pre-Sales Radar** tracks potential and estimated projects that have not yet been formally handed over from ARB.

### Features

| Feature | Description |
|---|---|
| **Opportunity Cards** | Each card shows customer, estimated scope, target quarter |
| **Probability Scoring** | High/Medium/Low win probability |
| **Waiting Stage** | Current stage in pre-sales pipeline |
| **Quick Convert** | Convert a pre-sales opportunity to a formal project |

### Lifecycle

Pre-sales projects are shown with dashed borders to distinguish them from committed projects. Once ARB handover is complete, they transition to the main Pipeline.

---

## 7. Master Execution Hub

**Access:** Sidebar → Master Hub

The **Master Execution Hub** is the aggregated control center for active and pending migrations. It combines data from all projects into a unified execution view.

### Features

| Feature | Description |
|---|---|
| **Execution Queue** | Ordered list of pending migration tasks |
| **Resource Pool** | Available migration worker nodes |
| **Active Migrations** | Currently running replication/sync jobs |
| **Wave Management** | Migration wave grouping and sequencing |
| **Dependency Graph** | Inter-project dependency visualization |
| **Command Center** | Issue commands to worker nodes |

---

## 8. Regional Map

**Access:** Sidebar → Regional Map

The **Regional Map** displays project distribution across LATAM on an interactive map.

### Features

| Feature | Description |
|---|---|
| **Country Markers** | Colored pins showing project count per country |
| **Click to Zoom** | Click a country to see city-level detail |
| **Project List** | Side panel listing projects in selected region |
| **Heat Map** | Toggle to show project density heat map |
| **Infrastructure Overlay** | Show Huawei Cloud region/ AZ locations |

---

## 9. Customer Directory

**Access:** Sidebar → Customer Directory (🏢)

The **Customer Directory** manages customer records and their cloud credentials.

### Features

| Feature | Description |
|---|---|
| **Customer List** | Searchable, filterable customer database |
| **Add Customer** | Create new customer record with contact details |
| **Credential Vault** | Securely store source cloud credentials (AWS, Azure, on-prem) |
| **Credential Validation** | Test credentials against live APIs before migration |
| **Encryption** | All credentials encrypted at rest (AES-256) |
| **Credential Age** | Monitor credential freshness; alert on expired keys |

### Credential Management

Credentials follow the **least-privilege hierarchy**:

1. **Master AK/SK** — Huawei Cloud account-level access
2. **Tier 2 (EPS Admin)** — Enterprise project admin scope
3. **Tier 3 (Tool-specific)** — SMS, DRS, OBS service accounts
4. **Data Plane (OS)** — In-guest OS credentials for agent install

---

## 10. FinOps Dashboard (COC)

**Access:** Sidebar → FinOps (💰)

The **FinOps Dashboard** (Cost Optimization Center) manages cloud financial operations.

### Features

| Feature | Description |
|---|---|
| **RI Coverage Analysis** | Reserved Instance coverage % vs on-demand |
| **ECS-RI Reconciliation** | Match RI purchases to running ECS instances |
| **Burn Rate Tracking** | Monthly/daily cloud spend monitoring |
| **TCO Comparison** | Compare source vs target cloud costs |
| **Quotation Upload** | Import RI quotations from Huawei Cloud |
| **Console RI Import** | Pull live RI data from Huawei Cloud Console |
| **Commercial True-Up** | Validate delivered vs quoted infrastructure |
| **Savings Dashboard** | Track realized vs projected savings |

### Key Workflows

#### ECS-RI Reconciliation
1. Upload RI quotation (Excel from Huawei)
2. Fetch live ECS inventory via API
3. Run reconciliation to match RIs to instances
4. Review unmatched RIs and uncovered instances
5. Export optimization recommendations

#### Commercial True-Up
1. Load project quotation (BoM)
2. Fetch delivered infrastructure from live APIs
3. Compare line by line
4. Flag discrepancies (missing, extra, misconfigured)
5. Generate True-Up report

---

## 11. Global Schedule

**Access:** Sidebar → Schedule (📅)

The **Global Schedule** provides calendar and timeline views for all project milestones.

### Features

| Feature | Description |
|---|---|
| **Calendar View** | Monthly/weekly/daily calendar with cutover dates |
| **Timeline** | Horizontal timeline with project bars |
| **Weekend Critical** | Highlights cutovers falling on weekends (pink) |
| **Filtering** | Filter by region, SA, phase, health |
| **Export** | Download schedule as iCal/CSV |

---

## 12. Global Process View

**Access:** Sidebar → Process (🗺️)

The **Global Process View** displays the **Standard Delivery Methodology** — the step-by-step migration lifecycle that all projects follow.

### Features

| Feature | Description |
|---|---|
| **5-Phase Breakdown** | Expandable cards for each lifecycle phase |
| **Step Details** | Detailed description of each step with tools |
| **Phase Gates** | Quality gates that must pass before advancing |
| **Workflow Graph** | Visual graph showing phase→gate→phase flow |
| **Guided Tour** | Animated walkthrough of the methodology |
| **Fullscreen Mode** | Expand to full-screen for presentations |

---

## 13. Resource Discovery Map

**Access:** Sidebar → Discovery (🔍)

The **Resource Discovery Map** visualizes source environment resources discovered during the Architecture phase.

### Features

| Feature | Description |
|---|---|
| **Resource Tree** | Hierarchical view of discovered resources |
| **Dependency Graph** | Visualize inter-resource dependencies |
| **MgC Integration** | Pull data from Huawei Migration Center |
| **Resource Tagging** | Tag resources by migration wave, priority |
| **Summary Stats** | Total VMs, storage, databases, networks |

---

## 14. Playbook Studio

**Access:** Sidebar → Playbooks (📚)

The **Playbook Studio** houses standard operating procedures for common migration scenarios.

### Features

| Feature | Description |
|---|---|
| **Playbook Library** | Browse pre-built playbooks by category |
| **Step-by-Step Guides** | Detailed instructions with commands |
| **Copy Commands** | One-click copy shell/CLI commands |
| **Custom Playbooks** | Create and save your own procedures |
| **Runbook Export** | Export as executable runbook for Execution phase |

---

## 15. Live Cloud NOC

**Access:** Sidebar → Live NOC (📺)

The **Live Cloud NOC** (Network Operations Center) provides real-time monitoring of active migrations.

### Features

| Feature | Description |
|---|---|
| **Live Status Dashboard** | Real-time replication/sync progress |
| **Agent Status** | Monitor SMS/DRS agent health |
| **Transfer Rates** | Live data transfer throughput |
| **Alerts** | Real-time alerts on failures or stalls |
| **Log Viewer** | Live tail of migration agent logs |

---

## 16. Workflow Graph

**Access:** Sidebar → Workflow Graph (🔀)

The **Workflow Graph** provides a visual, interactive graph of the migration lifecycle phases and gates.

### Features

| Feature | Description |
|---|---|
| **Interactive Nodes** | Clickable phase hubs and gate nodes |
| **Guided Tour** | Animated step-by-step walkthrough |
| **Zoom/Pan** | Mouse wheel zoom, drag to pan |
| **Fullscreen** | Presentation-ready fullscreen mode |
| **Project Context** | Highlight current project position |

---

## 17. Halted Projects

**Access:** Sidebar → Halted Projects (📦)

The **Halted Projects** view manages projects that have been suspended, cancelled, or transferred.

### Features

| Feature | Description |
|---|---|
| **Halt Reasons** | View why each project was halted |
| **Restore** | Reactivate a halted project |
| **Archive** | Permanently archive completed/cancelled |
| **Halt History** | Timeline of halt/resume actions |

### Halt Actions

| Action | Description |
|---|---|
| **Cancel** | Permanently cancel — cannot be restored |
| **Suspend** | Temporarily pause — can be resumed |
| **Transfer** | Reassign to different SA/team |

---

## 18. User Management (Admin)

**Access:** Sidebar → Users (Admin only)

The **User Management** page controls system user accounts and permissions.

### Features

| Feature | Description |
|---|---|
| **User List** | All registered users with roles |
| **Add User** | Create new user account |
| **Edit User** | Change role, name, email |
| **Disable User** | Temporarily disable access |
| **Delete User** | Permanently remove user |
| **Role Assignment** | Assign Admin/Manager/SA/Engineer/Viewer |

---

## 19. Project Wizard — 5-Phase Migration Lifecycle

**Access:** Click any project in Pipeline → Opens Wizard

The **Project Wizard** is the heart of the ERP Migration Factory. It guides users through the complete 5-phase migration lifecycle for each project.

### Navigation

The wizard uses a horizontal stepper at the top showing all 5 phases. The active phase is highlighted. Completed phases show a checkmark.

```
[1. ARB] → [2. Architecture] → [3. Planning] → [4. Execution] → [5. Post-Live]
```

### Phase 1: ARB Handover

**Purpose:** Formal intake from Architecture Review Board

| Component | Description |
|---|---|
| **StepARB.jsx** | ARB intake form |

**Key Fields:**
- SOW reference number
- High-level scope description
- Assigned SA and PM
- Target region and availability zone
- Initial timeline estimate
- Customer contact information

**Gate:** ARB Intake & SOW signed → advances to Phase 2

---

### Phase 2: Architecture

**Purpose:** Design target architecture, assess risks, map topology

| Component | Description |
|---|---|
| **ArchitectureCanvas.jsx** | Container tab view for all architecture tools |
| **DTRBReviewView.jsx** | Technical review board compliance checklist |
| **TopologyMapperView.jsx** | Design target topology from BoM/quotation |
| **MgCReconciliationView.jsx** | Optional source discovery data reconciliation |
| **GovernanceAndCRView.jsx** | DTRB governance tracking and change requests |
| **AssessmentView.jsx** | ORA risk profile and architecture assessment |

#### Architecture Canvas Tabs

| Tab | Purpose |
|---|---|
| **DTRB Review** | Architecture Review Board compliance checklist |
| **Topology Mapper** | Design target server/network/storage topology |
| **MgC Reconciliation** | Compare source discovery vs target topology |
| **Governance & CR** | Track governance status and change requests |
| **Assessment** | Risk profiling, dependency analysis |

#### Key Workflows

**Topology Mapper:**
1. Import BoM/quotation data
2. Map source servers to target Huawei Cloud specs
3. Define network topology (VPC, subnet, security groups)
4. Configure storage mapping (EVS, OBS, SFS)
5. Export target topology for execution

**Governance & CR (DTRB):**
1. Review DTRB compliance status
2. Create change requests for deviations
3. Track CR approval workflow
4. Link CRs to specific architecture decisions
5. View governance score and compliance %

**Gates (must all pass to advance):**
- Architecture Summary complete
- Source Discovery complete (or waived)
- ORA Risk Profile assessed
- Target Topology Mapped
- DTRB Governance approved

---

### Phase 3: Planning

**Purpose:** Resource planning, cost estimation, tool selection, wave design

| Component | Description |
|---|---|
| **StepPlanning.jsx** | Container tab view for all planning tools |
| **PhysicsEngine.jsx** | Server mapping & performance modeling |
| **FinOpsCalculator.jsx** | Cost estimation & budgeting |
| **ToolRecommendationView.jsx** | AI-driven migration tool selection |
| **WBSImportView.jsx** | Work Breakdown Structure import |

#### Planning Tabs

| Tab | Purpose |
|---|---|
| **Physics Engine** | Map source→target specs, network, dependencies |
| **FinOps Calculator** | Estimate monthly costs, RI needs, budget |
| **Tool Recommendation** | Recommend migration tools per workload |
| **WBS Import** | Import/define detailed work breakdown |

**Gates:**
- WBS & RACI Matrix defined
- Physics Engine calibrated
- FinOps Budget & Burn approved
- Strategic Tooling selected
- Wave & Runbook planned

---

### Phase 4: Execution

**Purpose:** Pipeline execution, engineering workbench, cutover management

| Component | Description |
|---|---|
| **StepExecution.jsx** | Container tab view for all execution tools |
| **CutoverRunbookView.jsx** | Detailed cutover runbook with steps |
| **DedicatedMigrationPlan.jsx** | Per-server migration plan |
| **AgenticOrchestrationPanel.jsx** | AI agent orchestration for parallel tasks |
| **ModelConfigPanel.jsx** | Hermes AI model configuration |
| **WaveZeroConfigModal.jsx** | Initial wave configuration |

#### Execution Tabs

| Tab | Purpose |
|---|---|
| **Cutover Runbook** | Step-by-step cutover plan with commands |
| **Migration Plan** | Per-server migration task assignments |
| **Agentic AI** | Orchestrate parallel AI agents for tasks |
| **Model Config** | Configure AI provider and model settings |

**Gates:**
- Readiness Gateway passed (all 3 credential tiers validated)
- Execution Pipeline active
- Engineering Workbench online
- Delivery Command Center staffed
- TAM Service Governance running

---

### Phase 5: Post-Live

**Purpose:** Validation, reconciliation, sign-off, handover

| Component | Description |
|---|---|
| **StepPostLive.jsx** | Container tab view for post-live tools |

**Key Activities:**
1. **3-Way Infrastructure Diff** — Compare source, target, and delivered
2. **Target Constellation Verification** — Validate all services running
3. **WAR Sign-Off** — Work Acceptance Report approval
4. **Procurement Handover** — Transfer to ongoing operations
5. **Lessons Learned** — Document findings for future projects

---

## 20. AI & Automation Tools

### Hermes AI Assistant

**Access:** Brain icon in TopBar

Hermes is the built-in AI assistant that can:
- Answer questions about migration processes
- Troubleshoot issues with commands and logs
- Generate scripts and configurations
- Explain error messages and solutions
- Navigate you to relevant documentation

### Hermes CLI Mode

**Access:** Terminal icon → Hermes CLI tab

The CLI provides:
- Direct terminal access to the backend
- Sandboxed command execution
- Background task delegation
- Multi-agent parallel processing

### Agentic Orchestration

**Access:** Execution → Agentic AI tab

This feature:
- Spawns parallel AI agents for migration tasks
- Monitors agent progress and results
- Handles retries and error recovery
- Consolidates multi-agent output

---

## 21. Help & Documentation System

### Global Help

**Access:** `?` icon in TopBar

Opens a right-sliding panel with the **Project Introduction** — an overview of the ERP Migration Factory, its architecture, and how to use it.

### Context-Sensitive Help

**Access:** Help button within each wizard step

- **DTRB Governance & CR Help:** Available in Phase 2 → Governance & CR tab
- **More context help** available as needed per component

### Glossary

**Access:** Book icon in TopBar

The Global Glossary defines all migration-specific terminology used throughout the platform.

### Command Drawer

**Access:** Terminal icon in TopBar

Quick-action command palette for power users.

---

## 22. Glossary of Terms

| Term | Definition |
|---|---|
| **ARB** | Architecture Review Board — formal project intake process |
| **BoM** | Bill of Materials — hardware/software quotation |
| **COC** | Cost Optimization Center — FinOps dashboard |
| **CR** | Change Request — formal change to architecture/scope |
| **DRS** | Data Replication Service — Huawei database migration |
| **DTRB** | Delivery Technical Review Board — governance body |
| **ECS** | Elastic Cloud Server — Huawei virtual machine |
| **EPS** | Enterprise Project Service — Huawei resource hierarchy |
| **EVS** | Elastic Volume Service — Huawei block storage |
| **FinOps** | Financial Operations — cloud cost management |
| **MgC** | Migration Center — Huawei source discovery tool |
| **NOC** | Network Operations Center — live monitoring |
| **OBS** | Object Storage Service — Huawei S3-compatible storage |
| **ORA** | Operational Risk Assessment |
| **RI** | Reserved Instance — discounted compute commitment |
| **SA** | Solutions Architect |
| **SFS** | Scalable File System — Huawei NAS storage |
| **SMS** | Server Migration Service — Huawei VM migration |
| **SOW** | Statement of Work — project scope document |

---

## 24. AI Model Configuration & API Keys

**Access:** Sidebar → Users → AI Model Configuration panel

### Overview

The ERP uses AI models for the ERP Agent (migration execution), simulation analysis, and chat assistance. Models are configured in priority order:

### Priority Order

```
1. LoadBalancer (PRIMARY) — already configured with working API keys
2. Individual Provider Keys (FALLBACK) — added via ModelConfigPanel
3. Fallback Chain (LAST RESORT) — ordered provider list
```

### Configuration Steps

1. **LoadBalancer (Priority 1):** The HuaweiLoadBalancer at `services/huawei_loadbalancer.py` has pre-configured API keys. When the delegate-task endpoint runs in HTTP mode, it POSTs to the loadbalancer URL. No additional configuration needed.

2. **Individual Provider Keys (Priority 2):** In the Model Configuration panel:
   - Select a provider (Alibaba, OpenAI, DeepSeek, etc.)
   - Click "+ Add API key" and paste your key
   - The key is stored encrypted and shown as masked (`****`)
   - Green dot = key configured, Amber dot = no key

3. **Primary Model:** Select which provider+model to use for main AI tasks
4. **Delegation Model:** Select which provider+model to use for subagent spawning
5. **Fallback Chain:** Drag to reorder providers — if primary fails, system tries next in chain

### API Keys Needed

| Key | Purpose | Where to Configure |
|-----|---------|-------------------|
| LLM API key (Alibaba/OpenAI/etc.) | ERP Agent AI calls | ModelConfigPanel → API key |
| Huawei Master AK/SK | Control plane (ECS, VPC, IAM) | Customer Directory |
| Huawei Source AK/SK | Source VM discovery + SMS agent | Customer Directory → source_huawei_ak/sk |
| OS SSH credentials | Data plane (agent install, smoke tests) | Customer Directory → os_user/os_password |

### ERP Agent Execution Modes

The ERP Agent (`/api/hermes-cli/delegate-task`) supports two modes:

| Mode | When Used | Tool Access |
|------|-----------|-------------|
| **HTTP (LoadBalancer)** | Simple chat, queries, analysis | Text only — no tool execution |
| **CLI (Hermes)** | Execution tasks (create, deploy, migrate) | Full terminal, file, browser access + `--yolo` auto-approve |

The system auto-detects execution tasks by keywords (create, delete, deploy, install, migrate, configure, etc.) and forces CLI mode for those.

---

## 25. Skills Knowledge Tree

**Access:** Sidebar → Users → Skill Knowledge Tree panel

### Overview

The Skills Knowledge Tree is a hierarchical registry of migration skills from 3 sources:

| Source | Description | Count |
|--------|-------------|-------|
| **Skill Registry** | Hardcoded skills in `agentic_simulator.py` | 13 |
| **External** | Skills synced from GitHub repos | Variable |
| **History** | Learnings from past project executions | Variable |

### How Skills Are Used

1. **Simulation:** When a project is simulated, the `SkillRegistry.get_skills_for_server()` method matches skills to each server based on OS, cloud, and migration scope. Matched skills appear in the trace with a 🔧 Skilled label.

2. **Execution:** When the ERP Agent runs in CLI mode, the skill list is injected into the system prompt so the agent knows what proven runbooks are available.

3. **Learning:** Each simulation's outcomes are ingested into the `ExecutionHistoryStore`. Future simulations query this data and apply relevant learnings.

### Managing Skills

- **View:** The tree shows all skills with category, confidence, and relevance
- **Sync:** Click "Sync from GitHub" to pull the latest skills from external repos
- **Deployed:** Skills with `hermes_skill` field are deployed to the live server at `/root/ulearning-migration/skills/`

### Available Skills (13)

| Skill | Category | Purpose |
|-------|----------|---------|
| huawei-cloud-sms-migration | migration | SMS migration patterns with hcloud CLI |
| huawei-cloud-sms-api-only | migration | SMS API-only migration (no CLI) |
| huawei-cloud-sms-migration-exact-disk-config | migration | Exact 1:1 disk configuration for SMS |
| huawei-sms-cross-region-migration | migration | Cross-region SMS (proven live) |
| sms-handler | migration | SMS agent-based block-level replication |
| data-plane-sync | migration | File-level sync (rsync/robocopy) |
| image-conversion | migration | qemu-img conversion (vhd→qcow2→zvhd) |
| obs-migration | storage | OBS bucket migration |
| boot-fixes | post_migration | Boot failure fixes (initramfs, GRUB, BCD) |
| partition-fixes | post_migration | Disk partition expansion |
| agent-orchestrator | orchestration | HSS, UniAgent, LTS deployment |
| mig-worker-framework | infrastructure | mig_worker deployment framework |
| erp-execution-orchestration | orchestration | ERP execution orchestration |

---

## 26. MCP Servers

**Access:** Sidebar → Users → MCP Servers panel (below Skills Knowledge Tree)

### Overview

The Model Context Protocol (MCP) server provides 175+ Huawei Cloud IaaS API tools. The server is at `/home/huawei-cloud/iaas-mcp-server/` on the live server.

### Features

| Feature | Description |
|---------|-------------|
| **Server List** | Shows all MCP server directories (huaweicloud_services_server, dws, marketplace, common) |
| **Sync from GitHub** | Pulls latest from `huaweicloud-samples/iaas-mcp-server` |
| **Tool Count** | Shows total Python modules per server |
| **Status** | Running/Stopped indicator |

### MCP Integration Status

- ✅ MCP server code synced to live server
- ✅ UI panel with sync button in Profile section
- ⚠️ MCP not yet integrated with execution engine (coming in future release)
- Future: MCP tools will appear in simulation traces with 🔌 MCP label

---

## 27. Agentic Orchestration & Execution Mode

**Access:** Project Wizard → Phase 3 → 3.4b Execution Mode

### Execution Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Manual Pipeline** | Step-by-step Kanban execution | Small teams, manual control |
| **Agentic Orchestration** | Hermes autonomous engine | Full automation, large migrations |
| **Individual Tasks** | Isolated ad-hoc tasks | Small batches, database true-ups |

### Agentic Orchestration Flow

```
3.4b: Select "Agentic Orchestration"
  ↓
4.0: Readiness Gateway (credential validation)
  ↓
4.1-4.7: Autonomous execution pipeline
  ├── Network verification/provisioning
  ├── Per-server SMS migration:
  │   ├── SOURCE_ECS_ACTIVE_CHECK
  │   ├── SMS_AGENT_INSTALL
  │   ├── MIGRATION_PROJECT_CONFIG
  │   ├── PREFLIGHT_SG_RULES (8900+22)
  │   ├── PREFLIGHT_FLAVOR_IMAGE
  │   ├── DISK_MAPPING (MGC-style)
  │   ├── TARGET_SMS_TASK_CREATE
  │   ├── SMS_SUBTASK_* (6 subtasks)
  │   └── SMOKE_TESTS
  ├── Cutover (HUMAN GATE)
  └── Garbage Collection
```

### Simulation (Dry-Run)

Before live execution, run a dry-run simulation:
1. Click "Run Simulation" in the Agentic Orchestration panel
2. The simulator generates a trace with exact CLI commands, resource specs, and error prevention
3. Each step shows 🔧 Skilled label if it came from the Skills Knowledge Tree
4. The simulation includes a **rollback plan** — all reversible steps in reverse order

### Rollback

Every resource-creating step has a `rollback_action` field:
- TARGET_EIP_CREATE → Delete EIP
- TARGET_ECS_CREATE → Delete ECS
- PREFLIGHT_SG_RULES → Delete SG rules
- TARGET_SMS_TASK_CREATE → Delete SMS task
- SMS_AGENT_INSTALL → Uninstall agent
- MIGRATION_PROJECT_CONFIG → Reset use_public_ip

The simulation returns a `rollback_plan` with all reversible steps. In live execution, the same rollback tracking applies.

---

## 28. Readiness Gateway

**Access:** Project Wizard → Phase 4 → 4.0 Readiness Gateway

### Credential Hierarchy

The gateway checks credential existence (not decryption — that happens at execution time):

| Check | Status | Description |
|-------|--------|-------------|
| **Master AK/SK** | valid / configured / blocked | Control plane authentication |
| **Real-Name Auth** | valid / unverified / unknown | Required for EPS + Tier 2 isolation |
| **Tier 2 EPS Admin** | valid / missing | Enterprise Project-scoped access |
| **EPS Bracket** | small / medium / large | Size classification |
| **OS Data Plane** | configured / missing | Agentless migration credentials |

### Unlocking Execution

The execution engine unlocks when:
1. Master AK/SK is present (configured or valid)
2. OS Data Plane credentials are configured

Real-name auth and Tier 2 are NOT blockers — the system falls back to Master AK/SK (Path B) with a warning.
| **TAM** | Technical Account Manager |
| **TCO** | Total Cost of Ownership |
| **VPC** | Virtual Private Cloud |
| **WAR** | Work Acceptance Report — final sign-off |
| **WBS** | Work Breakdown Structure — task hierarchy |

---

## 23. Troubleshooting & FAQ

### Common Issues

#### "Session Expired" Error
**Cause:** JWT token expired or invalid  
**Fix:** Click "Log In" button to re-authenticate

#### "Module Not Found" on Startup
**Cause:** Missing Python dependency  
**Fix:** Run `pip install -r requirements.txt` on the server

#### Credential Validation Fails
**Cause:** Expired or incorrect AK/SK  
**Fix:** Update credentials in Customer Directory → Vault

#### RI Reconciliation Returns Empty
**Cause:** No RI quotation uploaded  
**Fix:** Upload quotation via FinOps → Upload RI Quotation

#### HelpDrawer Not Opening
**Cause:** Fixed in latest update — `useMemo` hooks ordering corrected  
**Fix:** Refresh page to load latest bundle

### Support

For issues not covered here:
1. Open Hermes AI Assistant and describe the problem
2. Check server logs at `/tmp/erp_server.log`
3. Contact the ERP Migration Factory team

---

*© 2026 ERP Migration Factory — Huawei Cloud LATAM*
