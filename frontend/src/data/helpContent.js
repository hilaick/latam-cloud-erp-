// ERP Delivery & Migration Factory — Help Guide
// Organized by lifecycle phase, then dashboards, then configuration.
// Each topic is a self-contained article with practical guidance.

export const helpTopics = {
  // ═══════════════════════════════════════════════════════════
  // GETTING STARTED
  // ═══════════════════════════════════════════════════════════
  'getting-started': {
    title: 'Getting Started',
    category: 'Getting Started',
    icon: 'fa-rocket',
    short: 'Your first 5 minutes: login, navigate, and understand the layout.',
    long: `## Getting Started

Welcome to the **ERP Delivery & Migration Factory** — an end-to-end platform for planning, simulating, and executing cloud migrations to Huawei Cloud.

### Step 1: Login

Navigate to the platform URL and enter your credentials. Your role (Master Admin, Architect, Engineer, or Viewer) determines what you can see and do.

### Step 2: Understand the Layout

- **Left sidebar** — navigation between dashboards (Dashboard, Pipeline, Radar, Map, etc.)
- **Top bar** — project selector, AI assistant (purple robot), command terminal (dark button), user menu, and logout
- **Profile menu** (avatar, top-right) — Guided Wizard, Documentation (this guide), IAM & Profile, Glossary
- **Main area** — changes based on the selected dashboard or active project

### Step 3: Pick a Project

Click the project name in the top bar to open the project switcher. Select a project to open the **Project Wizard** — the 5-phase migration lifecycle workspace. Select "Global View" to see all projects across dashboards.

### Step 4: Use the Guided Wizard (New Users)

Profile menu → **Guided Wizard** walks you through presales qualification, ARB handover, and quotation upload in 4 steps. It creates the project and advances it to Phase 2 (Architecture).

### Step 5: Explore Dashboards

Each sidebar item is a dashboard. Start with **Dashboard** (overview), then **Pipeline** (delivery tracker), then **Regional Map** (geographic view).`,
    tags: ['getting-started', 'login', 'navigation'],
  },
  'platform-overview': {
    title: 'Platform Overview',
    category: 'Getting Started',
    icon: 'fa-server',
    short: 'What the ERP Migration Factory is and how it fits into your workflow.',
    long: `## Platform Overview

The **ERP Delivery & Migration Factory** is a single platform that covers the entire cloud migration lifecycle — from presales lead to post-live operations.

### What it does

- **Intake** — Capture presales leads, qualify them, and convert to projects
- **Architecture** — Discover source resources, design target topology, validate with Physics Engine, get DTRB approval
- **Planning** — Build migration waves, estimate costs, prepare runbooks
- **Execution** — Simulate the migration (dry-run), then execute for real with MCP/hcloud
- **Post-Live** — Validate billing, hand over to operations, close the project

### The 5-Phase Lifecycle

| Phase | Name | What Happens |
|---|---|---|
| 1 | ARB Handover | Project setup, customer, BOM upload |
| 2 | Architecture | Discovery, topology, physics engine, DTRB gate |
| 3 | Planning | Wave planning, FinOps, runbooks, tool selection |
| 4 | Execution | Simulation → live execution, cutover, validation |
| 5 | Post-Live | Billing reconciliation, operational handover |

### Who uses it

- **Sales / Presales** — Pre-Sales Radar, Guided Wizard, Quotation upload
- **Architects** — Discovery, Target Architecture, DTRB, Physics Engine
- **Engineers** — Wave planning, Execution, Cutover, NOC monitoring
- **FinOps** — Cost tracking, RI reconciliation, Commercial True-Up
- **PM / TAM** — Pipeline, Schedule, Halted Projects, TAM sign-off`,
    tags: ['overview', 'architecture', 'lifecycle'],
  },
  'navigation-layout': {
    title: 'Navigation & Layout',
    category: 'Getting Started',
    icon: 'fa-compass',
    short: 'Every button, menu, and panel explained.',
    long: `## Navigation & Layout

### Top Bar

| Element | Function |
|---|---|
| **Project Selector** (left) | Switch between projects or Global View |
| **Production DB** badge | Confirms live database connection |
| **AI Assistant** (purple robot) | Open the Delivery Agent chat |
| **Command Terminal** (dark button) | Open the global command drawer |
| **User Avatar** | Profile menu: Guided Wizard, Documentation, IAM, Glossary |
| **Logout** (red button) | End session |

### Sidebar

The sidebar has navigation icons for each dashboard. Hover to see labels. Click to switch views.

### Profile Menu

Click your avatar (top-right) to access:
- **Guided Wizard** — Step-by-step new project creation
- **Documentation** — This help guide
- **IAM & Profile** — User management, AI model config, MCP servers, Skills tree
- **Terminology Glossary** — Acronym definitions

### Project Wizard

When a project is selected, the main area shows the **Project Wizard** — a 5-phase tabbed interface. Click phase numbers at the top to navigate. All phases are unlocked for flexibility.`,
    tags: ['navigation', 'layout', 'ui'],
  },
  'guided-wizard': {
    title: 'Guided Wizard',
    category: 'Getting Started',
    icon: 'fa-magic',
    short: 'Step-by-step project creation from presales lead to Phase 2.',
    long: `## Guided Wizard

The Guided Wizard (Profile menu → Guided Wizard) walks new users through project intake in 4 steps.

### Step 1: Lead Info

Capture customer identity, Huawei Cloud account details, country, region, and stakeholder contacts (SA, partner, CIO/IT lead, technical architect).

### Step 2: Qualification

Select migration type, scope (compute, database, storage, network), source environment, authorization level, and delivery scope. Also captures technical sizing estimates (workload count, disk capacity, complexity).

### Step 3: ARB Handover

Document discovery notes, expected close date, gate artefacts (HLD, target architecture, WBS), and credential availability status.

### Step 4: Quotation BoM

Upload the presales Bill of Materials (Excel). The parser extracts ECS flavors, RDS instances, storage, and networking components. MRR is calculated from the BOM.

### After Completion

The project is created and advanced to **Phase 2 (Architecture)**. All 31 intake fields are saved to the project record. The Guided Wizard supports 6 scenarios: SAP, Cross-Cloud, On-Prem, Database, Object Storage, and Multi-Region.`,
    tags: ['guided', 'wizard', 'presales', 'intake'],
  },
  'glossary': {
    title: 'Terminology Glossary',
    category: 'Getting Started',
    icon: 'fa-book',
    short: 'Every acronym and term used in the platform.',
    long: `## Terminology Glossary

| Term | Definition |
|---|---|
| **ARB** | Architecture Review Board — formal project intake process |
| **BOM** | Bill of Materials — quoted resource list from presales |
| **CBR** | Cloud Backup and Recovery — Huawei Cloud backup service |
| **DCS** | Distributed Cache Service — Huawei Cloud Redis |
| **DRS** | Data Replication Service — Huawei Cloud database replication |
| **DTRB** | Design Technical Review Board — architecture approval gate |
| **ECS** | Elastic Cloud Server — Huawei Cloud virtual machine |
| **EIP** | Elastic IP — public IP address |
| **EVS** | Elastic Volume Service — Huawei Cloud block storage |
| **HSS** | Host Security Service — server security monitoring |
| **HSR** | HANA System Replication — zero-downtime SAP HANA migration |
| **MCP** | Model Context Protocol — structured API gateway to Huawei Cloud |
| **mig_worker** | Transient server that runs migration operations on the target side |
| **MRR** | Monthly Recurring Revenue — monthly income from a project |
| **OBS** | Object Storage Service — Huawei Cloud S3 equivalent |
| **RDS** | Relational Database Service — Huawei Cloud managed databases |
| **SDRS** | Storage Disaster Recovery Service — cross-AZ disaster recovery |
| **SG** | Security Group — firewall rules |
| **SID** | SAP System Identifier — groups SAP components for migration |
| **SMS** | Server Migration Service — Huawei Cloud block-level migration |
| **TAM** | Technical Account Manager — final sign-off before post-live |
| **VPC** | Virtual Private Cloud — isolated network environment |
| **WBS** | Work Breakdown Structure — project task decomposition |

Access the interactive glossary from Profile menu → Terminology Glossary.`,
    tags: ['glossary', 'terms', 'definitions'],
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 1 — ARB HANDOVER
  // ═══════════════════════════════════════════════════════════
  'phase1-arb': {
    title: 'Phase 1: ARB Handover',
    category: 'Phase 1 — ARB',
    icon: 'fa-handshake',
    short: 'Project intake: customer setup, BOM upload, and stakeholder assignment.',
    long: `## Phase 1: ARB Handover

The ARB (Architecture Review Board) Handover is where a migration project is formally created and baseline information is captured.

### What happens here

1. **Project creation** — Name, customer assignment, country, target Huawei Cloud region
2. **Stakeholder assignment** — Sales architect, partner, technical contacts
3. **Financial baseline** — MRR (Monthly Recurring Revenue) entry
4. **BOM upload** — Drag-and-drop the presales quotation Excel
5. **Lifecycle state set** — Project starts at Phase 1, advances to Phase 2 on completion

### How to get here

- **Guided Wizard** (recommended for new users) — Profile menu → Guided Wizard
- **Direct creation** — Pipeline or Customer Directory → New Project
- **From Pre-Sales Radar** — Convert a qualified lead to a project

### BOM Upload

The quotation parser accepts Huawei Cloud pricing calculator Excel exports. It extracts:
- ECS instances (flavor, vCPU, RAM, OS)
- RDS instances (type, storage)
- Storage (EVS, OBS, SFS)
- Network components (VPC, EIP, ELB, NAT)
- Monthly pricing → calculates MRR

### Phase 1 → Phase 2

Once the BOM is uploaded and basic info is complete, the project advances to Phase 2 (Architecture) for discovery and topology design.`,
    tags: ['phase-1', 'arb', 'intake', 'bom'],
  },
  'quotation-bom': {
    title: 'Quotation & BOM Upload',
    category: 'Phase 1 — ARB',
    icon: 'fa-file-excel',
    short: 'Upload the presales Bill of Materials to seed the project with quoted resources.',
    long: `## Quotation & BOM Upload

The quotation (Bill of Materials) is the presales document listing all Huawei Cloud resources quoted for the customer.

### How to upload

1. In the Project Wizard (Phase 1), drag and drop the Excel file into the upload zone
2. The parser reads the file and creates a BOM preview
3. Review the parsed resources — each row shows server name, flavor, vCPU, RAM, disk, OS, and monthly cost
4. MRR is automatically calculated from the BOM totals

### Excel format

The parser expects a Huawei Cloud pricing calculator export with columns for:
- Server name
- Flavor (e.g., s6.large.2)
- vCPU count
- RAM (GB)
- Disk size and type
- Operating system (important for SAP detection — "SUSE Linux Enterprise Server for SAP" triggers SAP workload classification)
- Monthly cost

### What the BOM feeds

- **Physics Engine** (Phase 2) — validates quoted resources against discovered source resources
- **MRR calculation** — total monthly cost becomes the project MRR
- **Flavor mapping** — quoted ECS flavors are matched to source servers during topology design
- **Cost baseline** — FinOps Dashboard tracks actual spend against the BOM budget

### Troubleshooting

- **Parse error** — Ensure the file is a valid Excel export from the Huawei Cloud pricing calculator
- **Missing OS** — If the OS column is blank, SAP workload detection won't trigger. Edit the row to add the full OS string
- **Flavor mismatch** — If quoted flavors don't match available Huawei Cloud flavors, the Physics Engine will flag them in Phase 2`,
    tags: ['quotation', 'bom', 'presales', 'excel'],
  },
  'presales-radar': {
    title: 'Pre-Sales Radar',
    category: 'Phase 1 — ARB',
    icon: 'fa-satellite-dish',
    short: 'Track and qualify opportunities before they become projects.',
    long: `## Pre-Sales Radar

Access: Sidebar → Pre-Sales Radar

The Pre-Sales Radar helps sales teams track opportunities before they become formal migration projects.

### What it tracks

- **Opportunity stage**: Lead → Qualified → Quoted → Won → Project
- **Qualification matrix**: Migration scope (compute, database, storage, network)
- **Source environment**: Cross-cloud, on-premise, or Huawei-to-Huawei
- **Estimated MRR**: Projected revenue from the opportunity
- **Customer and country**: Geographic distribution of pipeline

### Conversion to Project

Once an opportunity is won, it transitions to the Project Wizard starting at Phase 1 (ARB Handover). The Guided Wizard can also be used for a more structured intake.

### When to use

- **Sales managers** — Track pipeline health and revenue forecast
- **Architects** — Pre-qualify technical feasibility before quoting
- **PMO** — Forecast resource demand based on upcoming projects`,
    tags: ['presales', 'radar', 'pipeline', 'sales'],
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 2 — ARCHITECTURE
  // ═══════════════════════════════════════════════════════════
  'phase2-architecture': {
    title: 'Phase 2: Architecture',
    category: 'Phase 2 — Architecture',
    icon: 'fa-drafting-compass',
    short: 'Discover source resources, design target topology, validate, and get DTRB approval.',
    long: `## Phase 2: Architecture

The Architecture phase discovers the source environment and designs the target topology on Huawei Cloud.

### Key activities (in order)

1. **Resource Discovery** — Scan source cloud for all resources (ECS, RDS, EVS, VPC, EIP, SG, NAT, ELB)
2. **Workload Detection** — ServerProfiler automatically classifies servers (SAP HANA, SAP app, web, database) based on hostname, OS, and tags
3. **Topology Mapping** — Map source resources to target Huawei Cloud equivalents
4. **Physics Engine** — Validate that quoted resources (from BOM) will fit and perform on target infrastructure
5. **DTRB Review** — Governance gate — architecture must be approved before proceeding to Phase 3

### Output

A complete target architecture with VPC, subnets, ECS, RDS, storage, and network components — ready for execution planning.

### Zero Trust

Discovery is **read-only**. The ERP never modifies the source environment. Source credentials are used solely to list resources via the source cloud API.

### Target Architecture as Single Source of Truth

The target architecture is the **primary data source** for the simulation and execution engines. Mapper nodes are secondary. This means any changes to the target topology flow directly into the migration plan.`,
    tags: ['phase-2', 'architecture', 'discovery', 'dtrb'],
  },
  'resource-discovery': {
    title: 'Resource Discovery',
    category: 'Phase 2 — Architecture',
    icon: 'fa-search',
    short: 'Scanning the source environment to inventory all resources for migration.',
    long: `## Resource Discovery

Access: Project Wizard → Phase 2 → Discovery tab, or Sidebar → Discovery Map

Resource discovery scans the source cloud environment to inventory everything that needs to be migrated.

### What gets discovered

- **Compute**: ECS/VM instances with OS, vCPU, RAM, and disk layout
- **Database**: RDS instances with type (MySQL, PostgreSQL, etc.) and storage
- **Storage**: EVS disks, OBS buckets, SFS file systems
- **Network**: VPCs, subnets, EIPs, security groups, NAT gateways, ELBs
- **Other**: VPN, CDN, WAF, HSS agents

### How it works

1. Source credentials (read-only AK/SK) are stored in the Customer Directory
2. The ERP calls the source cloud API to list all resources in all regions
3. Discovered resources become **mapperNodes** in the project data
4. **ServerProfiler** classifies each server by workload type (SAP, database, web, etc.)
5. Results appear in the Resource Discovery Map view

### Workload auto-detection

ServerProfiler checks hostname patterns, OS strings, and tags to classify:
- **SAP HANA** — hostname contains "hana" or OS includes "SAP" + "HANA"
- **SAP App** — OS includes "SUSE" + "SAP" (non-HANA)
- **Database** — hostname contains "db", "mysql", "postgres", "redis"
- **Web** — hostname contains "web", "nginx", "apache"

### Discovery Map

Sidebar → Discovery Map shows a visual layout of all discovered resources grouped by type, with mapping status to target equivalents.`,
    tags: ['discovery', 'phase-2', 'source', 'scan'],
  },
  'physics-engine': {
    title: 'Physics Engine',
    category: 'Phase 2 — Architecture',
    icon: 'fa-atom',
    short: 'Validates compute, storage, and network sizing against target topology.',
    long: `## Physics Engine

The Physics Engine validates that your quoted resources (from the presales BOM) will fit and perform correctly on Huawei Cloud target infrastructure.

### What it checks

- **Compute**: vCPU and RAM matching between source servers and target ECS flavors
- **Storage**: Disk capacity and type (EVS SSD/SAS/SATA) mapping
- **Network**: VPC, subnet, EIP, and security group compatibility
- **Flavor availability**: Quoted flavors exist in the target region

### When it runs

The Physics Engine runs automatically during Phase 2 after resource discovery. Results show as:
- 🟢 **Green (OK)** — Resource fits and is compatible
- 🟡 **Yellow (Warning)** — Resource fits but with caveats (e.g., different disk type)
- 🔴 **Red (Blocked)** — Resource does not fit or is unavailable in target region

### How to use results

- Fix all red items before requesting DTRB approval
- Review yellow items and document any acceptable trade-offs
- Green items can proceed without action

### Common issues

- **Flavor not found** — The quoted flavor may not exist in the target region. Check the Huawei Cloud flavor catalog for the correct region.
- **Disk type mismatch** — Source uses SSD but BOM quotes SAS. Decide whether the performance difference is acceptable.
- **Network incompatibility** — Source has more EIPs than quoted. Update the BOM or release unused EIPs.`,
    tags: ['physics', 'validation', 'sizing', 'phase-2'],
  },
  'dtrb': {
    title: 'DTRB (Design Technical Review Board)',
    category: 'Phase 2 — Architecture',
    icon: 'fa-clipboard-check',
    short: 'Governance gate that reviews and approves the target architecture before execution.',
    long: `## DTRB — Design Technical Review Board

The DTRB is a governance gate between Phase 2 (Architecture) and Phase 3 (Planning). It ensures the proposed target architecture is technically sound before resources are committed.

### What DTRB reviews

- Target topology (VPC, subnets, ECS, RDS, storage)
- Feasibility check results from the Physics Engine
- Migration strategy (SMS, DRS, image conversion)
- Risk assessment and rollback plan
- Cost alignment (BOM vs. discovered resources)

### Approval flow

1. Architect submits the target architecture
2. DTRB reviews and either **approves**, **requests changes**, or **rejects**
3. Only approved architectures proceed to Phase 3 (Planning)

### DTRB Governance document

The full DTRB governance framework covers:

- **Architecture standards** — VPC design patterns, subnet sizing, security group baselines
- **Migration strategy selection** — When to use SMS vs. DRS vs. image conversion vs. HSR
- **Risk classification** — Low/Medium/High/Critical based on workload sensitivity, data volume, and downtime tolerance
- **Rollback requirements** — Every architecture must have a documented rollback path
- **Sign-off authority** — DTRB board composition and quorum requirements

### After approval

Once DTRB approves, the project advances to Phase 3 (Planning) where waves are built, FinOps is finalized, and runbooks are prepared.`,
    tags: ['dtrb', 'governance', 'approval', 'phase-2'],
  },
  'zero-trust': {
    title: 'Zero Trust Security Model',
    category: 'Phase 2 — Architecture',
    icon: 'fa-shield-alt',
    short: 'Source credentials are read-only. ERP never modifies the source environment.',
    long: `## Zero Trust Security Model

The ERP Migration Factory operates under a strict Zero Trust principle:

### Core rules

- **Read-only source access** — The ERP never writes to or modifies the source environment
- **Customer installs agents** — SMS agents and mig_workers are installed by the customer, not by the ERP
- **ERP runs ALL target-side ops** — All provisioning, configuration, and execution happens on the Huawei Cloud target

### Why this matters

If anything goes wrong during migration, the source environment is completely untouched and can serve as a rollback point. There is no risk of corrupting the source.

### Credential handling

- Source AK/SK are stored encrypted in the database (Customer Directory)
- Source credentials are used **only** for read-only API calls (list resources)
- Target credentials (Huawei Cloud AK/SK) are used for all provisioning and execution
- Per-customer credentials override the ERP default MCP credentials during execution

### mig_worker boundary

The mig_worker operates on the **TARGET side only**. It never needs source credentials with write access. It:
- Installs SMS agents on source servers (via SMS console, not direct source access)
- Runs pre-migration scripts on the target
- Manages data synchronization from target side
- Executes post-migration validation on the target`,
    tags: ['security', 'zero-trust', 'credentials'],
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 3 — PLANNING
  // ═══════════════════════════════════════════════════════════
  'phase3-planning': {
    title: 'Phase 3: Planning',
    category: 'Phase 3 — Planning',
    icon: 'fa-map-signs',
    short: 'Build migration waves, finalize FinOps, and prepare runbooks.',
    long: `## Phase 3: Planning

The Planning phase takes the DTRB-approved architecture and turns it into an executable plan.

### Key activities

1. **Wave Planning** — Group servers into migration waves based on dependencies
2. **FinOps Finalization** — Lock down the budget, reconcile RI coverage, and estimate migration costs
3. **Runbook Preparation** — Document step-by-step procedures for each wave
4. **Tool Selection** — Choose migration tools (SMS, DRS, image conversion, HSR) per resource type
5. **Execution Mode** — Choose dry-run (simulation) or live execution

### Output

A complete migration plan with:
- Ordered waves with cutover windows
- Tool assignments per resource
- Cost estimates and RI reconciliation
- Runbooks for each wave
- Rollback procedures`,
    tags: ['phase-3', 'planning', 'waves', 'finops'],
  },
  'wave-planning': {
    title: 'Wave Planning',
    category: 'Phase 3 — Planning',
    icon: 'fa-layer-group',
    short: 'Sequencing migration into waves with dependency chains and cutover windows.',
    long: `## Wave Planning

Migration waves group servers that should migrate together based on dependencies.

### How waves are built

1. **Dependency analysis** — Identify which servers depend on each other (database → app → web)
2. **SID grouping** — For SAP, all servers with the same SID are automatically in the same wave
3. **Cutover windows** — Each wave has a defined cutover time window
4. **Rollback paths** — Each wave has a defined rollback strategy

### Wave zero

Wave 0 is the infrastructure wave — VPC, subnets, security groups, and shared services that must exist before any server migration.

### Auto-grouping

The platform auto-groups waves by:
- **Application group** (from ServerProfiler classification)
- **SID** (for SAP — all components of one SAP system migrate together)
- **Dependency chains** (database before app before web)

### Manual gates

For sensitive workloads (SAP HANA, production databases), manual gates are inserted into the wave plan. These require human confirmation before proceeding to the next step.`,
    tags: ['waves', 'planning', 'phase-3', 'dependencies'],
  },
  'finops-dashboard': {
    title: 'FinOps Dashboard',
    category: 'Phase 3 — Planning',
    icon: 'fa-chart-line',
    short: 'Real-time cost tracking, RI reconciliation, and budget burn-down.',
    long: `## FinOps Dashboard

Access: Sidebar → FinOps

The FinOps Dashboard (Cost Optimization Center) provides financial operations monitoring for migration projects.

### Features

- **RI/ECS Reconciliation** — Match reserved instances against running ECS for savings analysis
- **Budget Burn** — Track actual spend vs. quotation BOM
- **Commercial True-Up** — Reconcile quoted costs with actual Huawei Cloud billing
- **TCO Comparison** — Compare source cloud costs vs. Huawei Cloud target costs

### Data sources

- Huawei Cloud BSS (billing system) for actual costs
- Quotation BOM for budgeted costs
- ECS RI detector for reserved instance analysis

### When to use

- **During Phase 3** — Finalize budget before execution
- **During Phase 4** — Monitor spend as resources are provisioned
- **During Phase 5** — Reconcile final costs and perform commercial true-up

### MRR

MRR (Monthly Recurring Revenue) is the monthly revenue from each project. It's set during Phase 1 (ARB Handover) or calculated from the BOM. MRR feeds into:
- Regional Map bubble sizes
- FinOps revenue tracking
- Pipeline revenue forecasting`,
    tags: ['finops', 'cost', 'billing', 'ri'],
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 4 — EXECUTION
  // ═══════════════════════════════════════════════════════════
  'phase4-execution': {
    title: 'Phase 4: Execution',
    category: 'Phase 4 — Execution',
    icon: 'fa-play-circle',
    short: 'Simulate the migration (dry-run), then execute for real with cutover and validation.',
    long: `## Phase 4: Execution

The Execution phase runs the migration — first as a simulation (dry-run), then for real.

### Execution flow (15 sub-phases)

| Sub-phase | What happens |
|---|---|
| 4.0 | Readiness Gateway — validate all prerequisites |
| 4.1 | Network verification |
| 4.2 | Wave planning, knowledge enrichment, preflight checks |
| 4.2b | Source and agent preparation |
| 4.2c | Target provisioning (create ECS, VPC, RDS) |
| 4.2d | Data synchronization (SMS/DRS) |
| 4.2e-f | Post-sync and smoke tests |
| 4.3-4.5 | Landing zone, HSS, continuous sync |
| 4.6 | Cutover (with manual gates) |
| 4.7-4.8 | Cleanup and finalization |

### Two modes

- **Dry-Run (Simulation)** — Executes all 15 phases as a simulation. No real resources are created. Shows trace, resource usage, and delivery report. Visualized in the 3D Architecture Constellation.
- **Live Execution** — Executes real operations via MCP servers or hcloud CLI. Creates real ECS, VPC, starts SMS sync, etc.

### Knowledge enrichment

During Phase 4.2, the simulator queries the 3-source knowledge tree (Skills, External, History) and shows which skills match each server. This informs the migration approach and flags potential issues.`,
    tags: ['phase-4', 'execution', 'simulation', 'cutover'],
  },
  'readiness-gateway': {
    title: 'Readiness Gateway (Phase 4.0)',
    category: 'Phase 4 — Execution',
    icon: 'fa-door-closed',
    short: 'Pre-execution validation gate — verifies all prerequisites are met.',
    long: `## Readiness Gateway — Phase 4.0

The Readiness Gateway is the first step of Phase 4 (Execution). It validates that all prerequisites are met before any real migration operations begin.

### What it checks

- **Credentials** — Customer AK/SK are valid and have sufficient permissions
- **Target infrastructure** — VPC, subnets, and security groups are provisioned
- **Source connectivity** — SMS agent can reach the source servers
- **Quotation alignment** — BOM matches discovered resources
- **DTRB approval** — Architecture has been approved
- **Wave plan** — At least one wave is defined with a cutover window

### Gate behavior

- 🟢 **All green** → execution proceeds to Phase 4.1
- 🔴 **Any red** → execution blocked with specific failure reason
- 🟡 **Yellow warnings** → informational only — execution can proceed

### Credential hierarchy

The gateway checks credentials in this order:
1. Per-customer AK/SK (from Customer Directory) — highest priority
2. ERP default MCP credentials (from Profile → MCP Servers)
3. hcloud CLI default profile — fallback

If none are valid, the gate blocks execution.`,
    tags: ['readiness', 'gate', 'validation', 'phase-4'],
  },
  'agentic-simulation': {
    title: 'Agentic Simulation',
    category: 'Phase 4 — Execution',
    icon: 'fa-vr-cardboard',
    short: '15-phase dry-run that simulates the entire migration before executing anything real.',
    long: `## Agentic Simulation

The agentic simulator runs a complete migration dry-run across all 15 phases (4.0 through 4.8) without touching any real resources.

### What it simulates

- Phase 4.0: Readiness gateway validation
- Phase 4.1: Network verification
- Phase 4.2: Wave planning, knowledge enrichment, preflight checks
- Phase 4.2b: Source and agent preparation
- Phase 4.2c: Target provisioning
- Phase 4.2d: Data synchronization
- Phase 4.2e-f: Post-sync and smoke tests
- Phase 4.3-4.5: Landing zone, HSS, continuous sync
- Phase 4.6: Cutover (with manual gates)
- Phase 4.7-4.8: Cleanup and finalization

### Knowledge enrichment

During Phase 4.2, the simulator queries the 3-source knowledge tree:
1. **Skill Registry** (priority 1, confidence 90%) — curated skills from \`/root/.hermes/skills/\`
2. **External Knowledge** (priority 2, confidence 75%) — community skills from GitHub
3. **Execution History** (priority 3, confidence 55%) — patterns from past simulations

The simulator shows which skills match each server and how they inform the migration approach.

### 3D Constellation

Results are visualized in the 3D Architecture Constellation with replay controls — step through each phase, see resources appear, watch data sync particles flow between source and target.

### Delivery report

After simulation, a delivery report shows:
- Total time estimate
- Resource utilization
- Cost projection
- Risk flags
- Manual gate count`,
    tags: ['simulation', 'dry-run', 'phases', 'ai'],
  },
  'agentic-orchestration': {
    title: 'Agentic Orchestration & Execution',
    category: 'Phase 4 — Execution',
    icon: 'fa-cogs',
    short: 'Multi-agent execution pipeline that runs migration phases 4.0–4.8 autonomously.',
    long: `## Agentic Orchestration & Execution

Access: Project Wizard → Phase 4 → Agentic Orchestration panel

### Two modes

- **Dry-Run (Simulation)** — Executes all 15 phases as a simulation. No real resources are created. Shows trace, resource usage, and delivery report.
- **Live Execution** — Executes real operations via MCP servers or hcloud CLI. Creates real ECS, VPC, starts SMS sync, etc.

### Execution engine flow

1. Starts MCP servers on-demand with customer credentials
2. Creates dynamic hcloud CLI profile
3. For each step: tries MCP first, falls back to hcloud CLI
4. Records results, timing, and errors per step
5. On completion: stops MCP servers, deletes hcloud profile

### MCP vs. hcloud CLI

| Aspect | MCP Server | hcloud CLI |
|---|---|---|
| Input/Output | Structured JSON | Text output |
| Validation | OpenAPI spec | Manual |
| Versioning | Automatic | Manual |
| Self-documenting | Yes (tools/list) | No |
| Fallback | — | Used when MCP fails |

### 3D Constellation

Results are visualized in the 3D Architecture Constellation with replay controls — step through each phase, see resources appear, watch data sync particles flow.`,
    tags: ['orchestration', 'execution', 'mcp', 'hcloud'],
  },
  'mig-worker': {
    title: 'Migration Worker (mig_worker)',
    category: 'Phase 4 — Execution',
    icon: 'fa-worker',
    short: 'Transient server that runs migration operations on the target side.',
    long: `## mig_worker

The mig_worker is a transient server deployed on Huawei Cloud that executes migration operations on the target side.

### What it does

- Installs SMS agents on source servers (via SMS console)
- Runs pre-migration scripts (disk expansion, boot fixes, partition fixes)
- Manages data synchronization
- Executes post-migration validation

### Lifecycle

1. **Deployed** during Phase 4.2b (Source & Agent Prep)
2. **Active** during Phase 4.2c–4.6 (provisioning through cutover)
3. **Cleaned up** during Phase 4.7 (Cleanup)

### When it triggers

- **Cross-cloud migration** (AWS/Azure → Huawei) — triggers mig_worker
- **Source inaccessible** — triggers mig_worker (customer-side ops only)
- **Cross-region same-cloud** — does NOT trigger mig_worker (handled by SMS/DRS directly)

### Zero Trust boundary

The mig_worker operates on the **TARGET side only**. It never needs source credentials with write access. All source-side operations (agent installation) go through the SMS console API, not direct source access.`,
    tags: ['mig-worker', 'execution', 'agent', 'phase-4'],
  },
  'cutover': {
    title: 'Cutover (Phase 4.6)',
    category: 'Phase 4 — Execution',
    icon: 'fa-exchange-alt',
    short: 'The critical switchover from source to target — includes manual gates and rollback.',
    long: `## Cutover — Phase 4.6

Cutover is the critical moment when traffic switches from the source environment to the Huawei Cloud target.

### What happens (in order)

1. **Manual gate** — Confirm all sync is complete
2. **Stop source services** — Application, database
3. **Final sync** — Last incremental data sync
4. **Start target** — Boot target servers, start applications
5. **DNS switch** — Update DNS to point to target
6. **Verify** — Smoke tests on target

### Rollback

If cutover fails, the source environment is untouched (Zero Trust) and can be restarted. The manual gates ensure a human confirms each step before proceeding.

### SAP-specific cutover

For SAP, cutover includes explicit manual gates:
1. **Stop SAP S/4HANA** — Application layer
2. **Stop SAP HANA** — Database layer
3. **Final HSR sync** — Last replication delta
4. **Start target HANA** — Boot target HANA instance
5. **Start target SAP** — Application layer
6. **Smoke tests** — SAP transaction verification

Each gate requires human confirmation. No automated cutover for SAP production.`,
    tags: ['cutover', 'phase-4', 'execution', 'rollback'],
  },
  'execution-workbench': {
    title: 'Execution Workbench (Phase 4.8)',
    category: 'Phase 4 — Execution',
    icon: 'fa-tools',
    short: 'Manual re-run and debugging interface for individual execution steps.',
    long: `## Execution Workbench — Phase 4.8

The Execution Workbench allows operators to manually re-run individual steps from the migration pipeline.

### What you can do

- **Re-run failed steps** — Select any failed step and re-execute it
- **Modify parameters** — Change parameters before re-running
- **View step logs** — Detailed logs for each step execution
- **Compare runs** — Compare results between different runs of the same step

### When to use

After a migration that had partial failures. Use the workbench to fix and re-run only the failed steps without re-running the entire pipeline.

### Common scenarios

- **SMS sync failed on one server** — Re-run just that server's sync
- **ECS creation timed out** — Retry the specific ECS creation step
- **VPC subnet mismatch** — Fix the configuration and re-run the network step
- **Post-migration validation failed** — Re-run validation after fixing the issue`,
    tags: ['workbench', 'debug', 're-run', 'phase-4'],
  },
  'tam-governance': {
    title: 'TAM Governance (Phase 4.10)',
    category: 'Phase 4 — Execution',
    icon: 'fa-user-tie',
    short: 'Technical Account Manager sign-off gate for migration completion.',
    long: `## TAM Governance — Phase 4.10

The TAM (Technical Account Manager) Governance is the final sign-off gate before a migration is considered complete.

### What the TAM reviews

- All execution steps completed successfully
- Post-migration validation passed
- Customer acceptance received
- Documentation delivered
- FinOps reconciliation complete

### Sign-off

Once the TAM signs off, the project transitions to Phase 5 (Post-Live) for operational handover.

### Prerequisites

Before TAM review:
- All cutover steps must be green
- Smoke tests must pass
- No open critical issues
- FinOps true-up must be complete (or scheduled)`,
    tags: ['tam', 'governance', 'sign-off', 'completion'],
  },

  // ═══════════════════════════════════════════════════════════
  // PHASE 5 — POST-LIVE
  // ═══════════════════════════════════════════════════════════
  'phase5-post-live': {
    title: 'Phase 5: Post-Live',
    category: 'Phase 5 — Post-Live',
    icon: 'fa-flag-checkered',
    short: 'Post-migration governance, billing validation, and operational handover.',
    long: `## Phase 5: Post-Live

After migration is complete, the Post-Live phase handles governance and operational handover.

### Key activities

- **Billing validation** — Reconcile actual Huawei Cloud costs against quotation
- **Commercial true-up** — Adjust pricing based on actual usage
- **Operational handover** — Transfer management to the operations team
- **HSS configuration** — Ensure security monitoring is active on all migrated servers
- **CBR backup setup** — Configure backup policies for the migrated workloads
- **Documentation** — Final delivery report and lessons learned

### Commercial True-Up

The commercial true-up process:
1. Pull actual billing from Huawei Cloud BSS
2. Compare against BOM budget
3. Identify variances (over/under utilization)
4. Adjust RI commitments if needed
5. Generate true-up report for customer

### Project closure

Once all Post-Live activities are complete:
- Project status set to "Completed"
- Final delivery report generated
- Lessons learned captured in Execution History (knowledge tree Source 3)
- Project archived but data retained for future reference`,
    tags: ['phase-5', 'post-live', 'billing', 'handover'],
  },

  // ═══════════════════════════════════════════════════════════
  // DASHBOARDS
  // ═══════════════════════════════════════════════════════════
  'dashboard': {
    title: 'Global Dashboard',
    category: 'Dashboards',
    icon: 'fa-th-large',
    short: 'Overview of all projects, MRR, health status, and recent activity.',
    long: `## Global Dashboard

Access: Sidebar → Dashboard (default landing page)

The Global Dashboard is the landing page of the platform. It provides a high-level overview of your entire migration portfolio.

### What you see

- **Key Metrics** — Total projects, active migrations, total MRR, halted projects
- **Health Distribution** — Green/Yellow/Red breakdown across all projects
- **Phase Distribution** — How many projects are in each lifecycle phase
- **Recent Activity** — Latest project updates and events

### Navigation

Click any project card to open it in the Project Wizard.`,
    tags: ['dashboard', 'overview', 'home'],
  },
  'pipeline': {
    title: 'Master Pipeline',
    category: 'Dashboards',
    icon: 'fa-stream',
    short: 'Delivery tracker showing all projects across all phases with timeline.',
    long: `## Master Pipeline

Access: Sidebar → Pipeline

The Master Pipeline is a delivery tracker that shows all migration projects across all lifecycle phases in a timeline view.

### Features

- **Phase columns** — Projects organized by ARB → Architecture → Planning → Execution → Post-Live
- **Health indicators** — Color-coded health status per project
- **Progress bars** — Visual progress within each phase
- **Filters** — Filter by phase, health, customer, or SA

### Usage

Use the pipeline to identify bottlenecks, track delivery progress, and manage resource allocation across multiple projects.`,
    tags: ['pipeline', 'delivery', 'tracking'],
  },
  'regional-map': {
    title: 'Regional Map',
    category: 'Dashboards',
    icon: 'fa-globe-americas',
    short: 'Geographic view of all projects, customers, and Huawei Cloud regions across LATAM.',
    long: `## Regional Map

Access: Sidebar → Regional Map

The Regional Map provides a geographic view of all migration activity across LATAM.

### Layers

- **Projects by Country** — Bubble markers sized by project count, colored by health
- **Cloud Region Coverage** — Dashed circles showing Huawei Cloud region coverage areas
- **Customer Credentials** — Markers showing which customers have keys configured
- **Migration Arcs** — Lines from source countries to target Huawei Cloud regions

### Interactions

- Click a country to see project details
- Click a region to see customer and credential status
- Filter by phase and health status`,
    tags: ['map', 'regional', 'geographic', 'latam'],
  },
  'customer-directory': {
    title: 'Customer Directory (CRM)',
    category: 'Dashboards',
    icon: 'fa-address-book',
    short: 'Manage customers, their Huawei Cloud credentials, and project associations.',
    long: `## Customer Directory

Access: Sidebar → Customer Directory

The Customer Directory is the CRM module for managing customer accounts and their Huawei Cloud credentials.

### What you can do

- **Create customers** — Name, region, country, contact info
- **Manage credentials** — Store AK/SK per customer (encrypted in DB)
- **Link projects** — Associate projects with customers
- **View credential status** — See which customers have keys configured
- **Filter and search** — Find customers by name, region, or credential status

### Credential security

- AK/SK are stored encrypted in the database
- Credentials are used only for target-side Huawei Cloud API calls
- Per-customer credentials override the ERP default MCP credentials during execution

### Region assignment

Each customer is assigned to a Huawei Cloud region (la-north-2, la-south-2, sa-brazil-1) which determines where their target infrastructure is provisioned.`,
    tags: ['crm', 'customers', 'credentials'],
  },
  'live-noc': {
    title: 'Live Cloud NOC',
    category: 'Dashboards',
    icon: 'fa-tv',
    short: 'Real-time monitoring of active migrations, server status, and sync progress.',
    long: `## Live Cloud NOC

Access: Sidebar → Live NOC

The Live Cloud NOC (Network Operations Center) provides real-time monitoring of active migration operations.

### What it monitors

- **Active migrations** — SMS sync progress, DRS replication status
- **Server health** — CPU, memory, disk utilization on target servers
- **Alert feed** — Errors, warnings, and manual gate notifications
- **Sync status** — Data synchronization progress bars

### When to use

During Phase 4 (Execution), the NOC is your real-time view into what's happening. Use it to:
- Monitor ongoing SMS/DRS sync
- Catch errors early
- Track cutover progress
- Verify post-migration health`,
    tags: ['noc', 'monitoring', 'live', 'execution'],
  },
  'master-hub': {
    title: 'Master Execution Hub',
    category: 'Dashboards',
    icon: 'fa-hub',
    short: 'Centralized execution control for all active migration waves.',
    long: `## Master Execution Hub

Access: Sidebar → Master Hub

The Master Execution Hub is the centralized control point for executing migration waves across multiple projects.

### Capabilities

- **Wave execution** — Start, pause, or stop migration waves
- **Cross-project view** — See all active executions in one place
- **Resource allocation** — Track mig_worker deployment and utilization
- **Execution logs** — Real-time log streaming per step

### Integration

The Execution Hub calls the execution engine which:
1. Starts MCP servers on-demand with customer credentials
2. Creates dynamic hcloud CLI profiles
3. Executes each step (MCP first, hcloud CLI fallback)
4. Records results and timing`,
    tags: ['hub', 'execution', 'control', 'waves'],
  },
  'global-schedule': {
    title: 'Global Schedule',
    category: 'Dashboards',
    icon: 'fa-calendar-alt',
    short: 'Cross-project migration timeline with wave scheduling and dependencies.',
    long: `## Global Schedule

Access: Sidebar → Schedule

The Global Schedule provides a timeline view of all migration waves across all projects.

### Features

- **Wave timeline** — Gantt-style view of migration waves with start/end dates
- **Dependency chains** — Visual links between dependent waves
- **Resource conflicts** — Highlights when multiple waves compete for the same mig_workers
- **Cutover windows** — Marked time slots for each cutover event

### Usage

Use the schedule to plan wave sequencing, avoid resource conflicts, and communicate timelines to stakeholders.`,
    tags: ['schedule', 'timeline', 'gantt'],
  },
  'global-process': {
    title: 'Global Process View',
    category: 'Dashboards',
    icon: 'fa-project-diagram',
    short: 'Process flow visualization showing all projects through the delivery lifecycle.',
    long: `## Global Process View

Access: Sidebar → Process

The Global Process View shows the complete delivery process flow with all projects positioned at their current stage.

### What it displays

- **Process stages** — ARB → Architecture → Planning → Execution → Post-Live
- **Project positions** — Each project shown at its current stage with progress indicator
- **Bottleneck detection** — Stages with too many projects queued
- **Throughput metrics** — Average time per stage

### Usage

Use this view to identify process bottlenecks, track overall delivery health, and forecast when projects will complete.`,
    tags: ['process', 'flow', 'lifecycle'],
  },
  'playbook-studio': {
    title: 'Playbook Studio',
    category: 'Dashboards',
    icon: 'fa-book-open',
    short: 'Create and manage custom migration playbooks for repeatable processes.',
    long: `## Playbook Studio

Access: Sidebar → Playbooks

The Playbook Studio lets you create, edit, and manage custom migration playbooks — reusable sequences of steps that can be applied across projects.

### What playbooks contain

- **Step sequences** — Ordered list of actions (create ECS, configure VPC, start SMS, etc.)
- **Preconditions** — Checks that must pass before each step
- **Rollback actions** — What to do if a step fails
- **Variables** — Parameterized values that change per project

### Self-learning

The playbook learner automatically saves successful execution patterns to the CognitiveLearningLog in PostgreSQL. These become part of the knowledge tree (Source 3: History) for future projects.`,
    tags: ['playbooks', 'automation', 'reusable'],
  },
  'workflow-graph': {
    title: 'Workflow Graph',
    category: 'Dashboards',
    icon: 'fa-diagram-project',
    short: 'Visual dependency graph of migration steps and their relationships.',
    long: `## Workflow Graph

Access: Sidebar → Workflow Graph

The Workflow Graph provides a visual representation of migration step dependencies and execution flow.

### What it shows

- **Nodes** — Individual migration steps (create VPC, provision ECS, start SMS, etc.)
- **Edges** — Dependencies between steps (must complete A before B)
- **Status colors** — Pending (gray), running (blue), success (green), failed (red)
- **Critical path** — Highlighted longest dependency chain

### Usage

Use the workflow graph to understand the execution order, identify parallelizable steps, and find bottleneck dependencies.`,
    tags: ['workflow', 'graph', 'dependencies'],
  },
  'resource-discovery-map': {
    title: 'Resource Discovery Map',
    category: 'Dashboards',
    icon: 'fa-map-marked-alt',
    short: 'Visual map of discovered resources across source and target environments.',
    long: `## Resource Discovery Map

Access: Sidebar → Discovery Map

The Resource Discovery Map provides a visual representation of all discovered resources from the source environment and their mapped counterparts on Huawei Cloud.

### What it shows

- Source resources (ECS, RDS, EVS, VPC, etc.) grouped by type
- Target resource mapping with status indicators
- Discovery progress and coverage
- Unmapped or mismatched resources

### When to use

During Phase 2 (Architecture) after running resource discovery. Use it to verify all source resources have been discovered and properly mapped to target equivalents.`,
    tags: ['discovery', 'map', 'resources'],
  },
  'halted-projects': {
    title: 'Halted Projects',
    category: 'Dashboards',
    icon: 'fa-pause-circle',
    short: 'Projects that have been paused or halted with reason tracking and resume capability.',
    long: `## Halted Projects

Access: Sidebar → Halted Projects

The Halted Projects view lists all projects that have been paused during execution.

### What it tracks

- **Halt reason** — Why the project was stopped (blocker, customer request, resource issue)
- **Halt timestamp** — When the project was paused
- **Phase at halt** — Which lifecycle phase the project was in when halted
- **Resume capability** — Projects can be resumed from where they left off

### Halt vs Delete

Halting a project preserves all its data (mapperNodes, simulations, quotations) so it can be resumed. Deletion is permanent and requires 2FA confirmation.`,
    tags: ['halted', 'paused', 'resume'],
  },

  // ═══════════════════════════════════════════════════════════
  // AI & AUTOMATION
  // ═══════════════════════════════════════════════════════════
  'delivery-agent': {
    title: 'Delivery Agent',
    category: 'AI & Automation',
    icon: 'fa-robot',
    short: 'AI assistant with real function-calling tools to query and operate the ERP.',
    long: `## Delivery Agent

Access: Purple robot icon in the TopBar

The Delivery Agent (formerly "ERP Agent") is an AI assistant that uses real LLM function-calling to interact with the ERP system.

### What it can do

- Query project state, topology, and simulation results
- Run agentic migration simulations
- List registered skills and knowledge tree
- Update project data (requires Engineer+ role)
- View system info (Admin only)

### How it works

1. User asks a question via the chat interface
2. The LLM (GLM-5.2) decides which tool to call
3. The tool executes against the real ERP database
4. Results feed back to the LLM for a natural language response

### Security

- **RBAC enforced** — tools check user role before executing
- **Project-scoped** — tools can only access the current project
- **No terminal/root access** — the agent cannot run shell commands`,
    tags: ['ai', 'agent', 'function-calling', 'rbac'],
  },
  'skills-knowledge': {
    title: 'Skills Knowledge Tree',
    category: 'AI & Automation',
    icon: 'fa-tree',
    short: '3-source federated knowledge: Skill Registry, External GitHub, and Execution History.',
    long: `## Skills Knowledge Tree

Access: Profile menu → IAM & Profile → Skills Knowledge Tree

The platform uses a 3-source federated knowledge system to inform migration decisions.

### Source 1: Skill Registry (priority 1, confidence 90%)

Curated skills stored in \`/root/.hermes/skills/\` and the SkillRegistry. These are authoritative, human-reviewed migration procedures.

### Source 2: External Knowledge (priority 2, confidence 75%)

Community skills synced from GitHub. Auto-syncs every 6 hours. Includes OS tags, failure modes, and CLI commands.

### Source 3: Execution History (priority 3, confidence 55%)

Empirical patterns from past simulations stored in CognitiveLearningLog in PostgreSQL. The playbook learner saves successful patterns for reuse.

### How it is queried

\`KnowledgeProvider.query(profile, mapper_node)\` merges all 3 sources, deduplicates by command signature, and ranks by priority + confidence.

### SAP skills

5 SAP-specific skills are dynamically discovered from the filesystem:
- sap_hana_migration_sms
- sap_hana_migration_hsr
- sap_backint_backup
- sap_dr_sdrs
- sap_ha_deployment
- sap_certified_flavors

These appear as a separate "SAP" division in the knowledge tree when SAP workloads are detected.`,
    tags: ['skills', 'knowledge', 'ai', 'federation'],
  },

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════
  'mcp-servers': {
    title: 'MCP Servers',
    category: 'Configuration',
    icon: 'fa-network-wired',
    short: 'Model Context Protocol servers provide structured API access to Huawei Cloud services.',
    long: `## MCP Servers

Access: Profile menu → IAM & Profile → MCP Servers

MCP (Model Context Protocol) servers are local HTTP gateways between the ERP and Huawei Cloud APIs. Each server wraps a specific Huawei Cloud service (ECS, VPC, RDS, etc.) with structured input/output.

### How they work

1. MCP server starts on-demand on a local port (8800–8999)
2. The ERP sends a JSON-RPC \`tools/call\` request
3. The MCP server calls the real Huawei Cloud API using the SDK
4. Structured JSON response returns to the ERP

### Credentials

- **ERP default** — Set in Profile → MCP Servers → Configure
- **Per-customer** — Customer AK/SK from CRM overrides the default during execution

### Benefits over hcloud CLI

- Structured input/output (always JSON)
- Parameter validation via OpenAPI spec
- API versioning handled automatically
- Self-documenting (tools/list shows all available endpoints)`,
    tags: ['mcp', 'api', 'configuration', 'huawei-cloud'],
  },
  'model-config': {
    title: 'AI Model Configuration',
    category: 'Configuration',
    icon: 'fa-microchip',
    short: 'Configure LLM providers, models, and connection settings for the Delivery Agent.',
    long: `## AI Model Configuration

Access: Profile menu → IAM & Profile → AI Model Configuration

Controls how the Delivery Agent connects to LLMs.

### Settings

- **Connection Mode** — \`cli\` (local Hermes binary) or \`http\` (load balancer API)
- **Global Model** — Primary model for the Delivery Agent (e.g., \`glm-5.2\`)
- **Global Provider** — LLM provider (e.g., \`zai\`, \`deepseek\`)
- **Delegation Model** — Model used for subagent delegation
- **Delegation Provider** — Provider for delegation calls
- **LB URL** — Load balancer endpoint
- **LB Auth** — Authentication header for the load balancer

### How it works

The Delivery Agent reads these settings via HermesConfig and uses them for the function-calling loop. The agent sends \`tools\` array with \`tool_choice: auto\` and processes up to 5 rounds of tool calls.`,
    tags: ['ai', 'model', 'llm', 'configuration'],
  },
  'user-management': {
    title: 'User Management (Admin)',
    category: 'Configuration',
    icon: 'fa-users-cog',
    short: 'Manage system users, roles, and permissions.',
    long: `## User Management

Access: Sidebar → Users (Admin only)

The User Management page controls system user accounts and their roles.

### Roles

| Role | Permissions |
|---|---|
| **Master Admin** | Full access — all projects, all settings, user management |
| **Architect** | Create/edit projects, run discovery, design architecture, DTRB |
| **Engineer** | Execute migrations, run simulations, update project data |
| **Viewer** | Read-only access to dashboards and project data |

### What you can do

- Create and deactivate user accounts
- Assign roles
- View activity logs
- Configure AI model settings (Admin only)
- View MCP server status
- Browse the Skills Knowledge Tree`,
    tags: ['users', 'admin', 'roles', 'management'],
  },
  'command-terminal': {
    title: 'Command Terminal',
    category: 'Configuration',
    icon: 'fa-terminal',
    short: 'Global command drawer for quick actions and navigation.',
    long: `## Command Terminal

Access: Dark terminal button in the TopBar

The Command Terminal is a global command drawer that provides quick access to actions and navigation.

### What you can do

- Quick navigation to any dashboard or project
- Search across all projects and customers
- Execute quick actions (create project, run discovery, etc.)
- Access recent items

### Keyboard shortcut

Use \`Ctrl+K\` (or \`Cmd+K\` on Mac) to open the command drawer without clicking.`,
    tags: ['command', 'terminal', 'navigation', 'shortcuts'],
  },

  // ═══════════════════════════════════════════════════════════
  // SCENARIOS
  // ═══════════════════════════════════════════════════════════
  'sap-migration': {
    title: 'SAP S/4HANA Migration',
    category: 'Scenarios',
    icon: 'fa-industry',
    short: 'Specialized migration path for SAP workloads with certified flavors and manual gates.',
    long: `## SAP S/4HANA Migration

SAP migrations require special handling due to certification requirements and the need for manual gates during cutover.

### Three approaches

| Approach | Downtime | Best for |
|---|---|---|
| **SMS Block-Level** | 18–65h (500GB–2TB) | Non-production, maintenance windows |
| **HANA System Replication (HSR)** | <1h cutover | Production, near-zero downtime |
| **Backup/Restore with OBS** | ~2h | Small databases, simple landscapes |

### SAP-specific features in the platform

- **Workload detection** — ServerProfiler labels SAP/HANA servers at discovery time based on hostname, OS, and tags
- **SID-based wave grouping** — All servers with the same SID automatically migrate together
- **Manual gates** — Trace includes explicit stops for "Stop SAP" and "Stop HANA"
- **Certified flavors** — Only SAP-certified ECS flavors are selected (e3/e6/e7 for HANA, h1/m6 for NetWeaver)
- **5 SAP skills** — Dynamically discovered from the skills filesystem

### SAP intake fields (Guided Wizard)

The Guided Wizard captures SAP-specific information:
- SID, database size, transactional volume
- Add-on complexity, SQL-to-HANA conversion
- Integrations, operational constraints
- Customer prioritization, migration phases
- DB consolidation, tenancy model
- Migration windows and timelines`,
    tags: ['sap', 'hana', 'scenarios', 'certified'],
  },
  'troubleshooting': {
    title: 'Troubleshooting & FAQ',
    category: 'Getting Started',
    icon: 'fa-wrench',
    short: 'Common issues and their solutions.',
    long: `## Troubleshooting & FAQ

### Common Issues

**Q: The 3D constellation is not loading**
A: Ensure Three.js CDN is accessible. Check browser console for script loading errors.

**Q: Simulation shows no steps**
A: Ensure the project has mapperNodes (discovered resources) and a target architecture. Run discovery first (Phase 2).

**Q: MCP server won't start**
A: Check that ERP default credentials are configured (Profile → MCP Servers → Configure). The MCP server needs valid Huawei Cloud AK/SK.

**Q: Delivery Agent is not responding**
A: Check that the load balancer is running (HermesConfig mode = http, lb_url accessible). The agent uses GLM-5.2 via the load balancer.

**Q: Regional map shows no markers**
A: Projects need a valid \`country\` field. Unknown or "?" countries are filtered out. Edit the project in Phase 1 to set the country.

**Q: Browser shows ERR_CONNECTION_RESET on assets**
A: Hard refresh (Ctrl+Shift+R) to clear cached old JavaScript bundles after a deploy.

**Q: SAP servers not detected as SAP workload**
A: Ensure the quotation parser preserved the full OS string (e.g., "SUSE Linux Enterprise Server for SAP"). The workload detector checks for "SAP" in the OS string.

**Q: "Session Expired" error**
A: JWT token expired. Log out and log back in. Token lifetime is 8 hours.

**Q: Credential validation fails**
A: The platform validates credentials via hcloud CLI subprocess (not the custom API signer). Ensure hcloud CLI is installed and the AK/SK has the required IAM permissions.`,
    tags: ['troubleshooting', 'faq', 'issues'],
  },
};
