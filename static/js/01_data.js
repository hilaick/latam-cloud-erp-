const { useState, useMemo, useEffect, useRef } = React;

const defaultPlaybooks = {
    "default_vm": {
        name: "Standard Generic Migration",
        tasks: [
            { id: "1", name: "Phase 1: Architecture & Auth", prog: "0%", resp: "", start: "2026-03-01", end: "2026-03-05", isParent: true },
            { id: "1.1", name: "Provision IAM Service Account & API Keys", prog: "0%", resp: "Partner / Customer", start: "2026-03-01", end: "2026-03-02", isParent: false },
            { id: "1.2", name: "Deploy Target VPC & Core Network", prog: "0%", resp: "Partner", start: "2026-03-03", end: "2026-03-05", isParent: false },
            { id: "2", name: "Phase 2: Workload Sync", prog: "0%", resp: "", start: "2026-03-06", end: "2026-03-20", isParent: true },
            { id: "2.1", name: "Install Agents on Source VMs", prog: "0%", resp: "Customer IT", start: "2026-03-06", end: "2026-03-08", isParent: false },
            { id: "2.2", name: "Execute Initial Full Block Sync", prog: "0%", resp: "Partner", start: "2026-03-09", end: "2026-03-20", isParent: false }
        ]
    },
    "sap_enterprise_cutover": {
        name: "SAP Enterprise: Cutover & Hypercare",
        tasks: [
            { id: "1", name: "PHASE 0: PRE-CUTOVER", prog: "0%", resp: "", start: "2026-04-02", end: "2026-04-02", isParent: true },
            { id: "1.1", name: "Purge & Export Logs/Backups to Cold VM", prog: "0%", resp: "Partner", start: "2026-04-02", end: "2026-04-02", isParent: false },
            { id: "1.2", name: "Fire Drill: On-Premise DB Restart", prog: "0%", resp: "Partner", start: "2026-04-02", end: "2026-04-02", isParent: false },
            { id: "1.3", name: "Full On-Premise Backup (Safe Point)", prog: "0%", resp: "Customer IT", start: "2026-04-02", end: "2026-04-02", isParent: false },
            { id: "2", name: "PHASE 1: CUTOVER (HOLY WEEK)", prog: "0%", resp: "", start: "2026-04-02", end: "2026-04-05", isParent: true },
            { id: "2.1", name: "Shutdown On-Premise SAP & Network Block", prog: "0%", resp: "Cust / Partner", start: "2026-04-02", end: "2026-04-02", isParent: false },
            { id: "2.2", name: "Final Sync (File-Level, Exclude Logs)", prog: "0%", resp: "Partner / HW", start: "2026-04-02", end: "2026-04-04", isParent: false },
            { id: "2.3", name: "Cloud Boot & Over-Provisioning (200% Compute)", prog: "0%", resp: "Partner", start: "2026-04-02", end: "2026-04-04", isParent: false },
            { id: "2.4", name: "Technical Validation (Basis & Network)", prog: "0%", resp: "Partner", start: "2026-04-04", end: "2026-04-05", isParent: false },
            { id: "3", name: "PHASE 2: GO-LIVE & ROLLBACK SAFETY", prog: "0%", resp: "", start: "2026-04-05", end: "2026-04-08", isParent: true },
            { id: "3.1", name: "DNS Update & SAP Logon Switch", prog: "0%", resp: "Partner / Cust", start: "2026-04-05", end: "2026-04-05", isParent: false },
            { id: "3.2", name: "Go-Live: 'Monday Avalanche'", prog: "0%", resp: "TAM / All", start: "2026-04-06", end: "2026-04-06", isParent: false },
            { id: "3.3", name: "Configure Reverse Replication", prog: "0%", resp: "Partner", start: "2026-04-06", end: "2026-04-07", isParent: false }
        ]
    }
};

const generateDefaultProject = (id, name, isWaiting, lifecycleState, health, mrr, kickoff, date) => ({
    id, isWaiting, name, country: "TBD", health, progress: "0%", mrr, kickoff, date, sa: "John Doe", partner: "None", partnerType: "N/A", partnerLocation: "N/A", blocker: "Initial discovery.", complexity: "Medium", scope: "Advisory",
    lifecycleState: lifecycleState, 
    physics: null, physicsHistory: [], ora: null, oraHistory: [], budget: null, mapperCsv: "", mapperHistory: [], war: null,
    migrationPlan: JSON.parse(JSON.stringify(defaultPlaybooks["default_vm"].tasks)),
    apiConfig: { accessKey: "", secretKey: "", region: "la-south-2", automationEnabled: false },
    comms: { bridge: "https://teams.microsoft.com/l/meetup-join/...", chat: "", notes: "" },
    tamData: { supportPlan: "Enterprise", welinkGroup: "", tickets: [], workshops: [{id: 1, name: "Cloud Console 101", done: false}, {id: 2, name: "IAM & Security Best Practices", done: false}] }
});

const defaultProjects = [
  { ...generateDefaultProject(1, "AWS Data Lake Exit", false, "4_execution", "Green", 12000, "2026-03-01", "2026-04-15"), country: "Mexico", progress: "65%", complexity: "High", scope: "Hands-On", blocker: "Syncing DBs." },
  { ...generateDefaultProject(2, "Unicorn Corp SAP HANA", false, "3_planning", "Yellow", 83000, "2026-03-10", "2026-05-30"), country: "Panama", progress: "10%", complexity: "Ultra-High", scope: "Supervision", blocker: "Partner failed Dev gate. Triggering Rescue." },
  { ...generateDefaultProject(3, "Logistics Hub", false, "3_planning", "Red", 22000, "2026-03-15", "2026-04-05"), country: "Guatemala", progress: "20%", scope: "Advisory", blocker: "Budget pending approval." },
  { ...generateDefaultProject(5, "Retail POS Migration", false, "2_architecture", "Green", 34000, "2026-04-01", "2026-06-15"), country: "Chile", progress: "5%", complexity: "High", scope: "Supervision", blocker: "Discovery underway." },
  generateDefaultProject(4, "Bank of Andes", true, "1_arb", "Yellow", 45000, "", "")
];

// Global window bindings for Babel Standalone scoping
window.useState = useState; window.useMemo = useMemo; window.useEffect = useEffect; window.useRef = useRef; window.defaultPlaybooks = defaultPlaybooks; window.generateDefaultProject = generateDefaultProject; window.defaultProjects = defaultProjects;