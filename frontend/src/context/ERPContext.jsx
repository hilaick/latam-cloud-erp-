import React, { createContext, useState, useEffect } from 'react';

// --- ENTERPRISE-GRADE PLAYBOOKS ---
const DEFAULT_PLAYBOOKS = {
    "default_vm": {
        name: "Standard VM Lift & Shift (SMS)",
        tasks: [
            { id: "1", name: "Phase 1: Architecture & Auth", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
            { id: "1.1", name: "Provision IAM Service Account & API Keys", prog: "0%", resp: "Customer", start: "", end: "", isParent: false },
            { id: "1.2", name: "Deploy Target VPC & Core Network", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "2", name: "Phase 2: Workload Sync", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
            { id: "2.1", name: "Install SMS Agents on Source VMs", prog: "0%", resp: "Customer IT", start: "", end: "", isParent: false },
            { id: "2.2", name: "Execute Initial Full Block Sync", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "3", name: "Phase 3: Validation & Cutover", prog: "0%", resp: "All", start: "", end: "", isParent: true },
            { id: "3.1", name: "Final Delta Sync & App Switchover", prog: "0%", resp: "Partner", start: "", end: "", isParent: false }
        ]
    },
    "sap_enterprise_cutover": {
        name: "SAP Enterprise: Cutover & Hypercare",
        tasks: [
            { id: "1", name: "PHASE 0: PRE-CUTOVER", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
            { id: "1.1", name: "Purge & Export Logs/Backups to Cold VM", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "1.2", name: "Full On-Premise Backup (Safe Point)", prog: "0%", resp: "Customer IT", start: "", end: "", isParent: false },
            { id: "2", name: "PHASE 1: CUTOVER (DOWNTIME WINDOW)", prog: "0%", resp: "All", start: "", end: "", isParent: true },
            { id: "2.1", name: "Shutdown On-Premise SAP & Network Block", prog: "0%", resp: "Customer IT", start: "", end: "", isParent: false },
            { id: "2.2", name: "Final Sync (Exclude Logs)", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "2.3", name: "Cloud Boot & Over-Provisioning (200% Compute)", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "3", name: "PHASE 2: GO-LIVE", prog: "0%", resp: "All", start: "", end: "", isParent: true },
            { id: "3.1", name: "DNS Update & SAP Logon Switch", prog: "0%", resp: "Partner / Cust", start: "", end: "", isParent: false },
            { id: "3.2", name: "Go-Live: 'Monday Avalanche' Hypercare", prog: "0%", resp: "TAM", start: "", end: "", isParent: false }
        ]
    },
    "k8s_cce_migration": {
        name: "Cloud-Native K8s Migration (to CCE)",
        tasks: [
            { id: "1", name: "Phase 1: Platform Provisioning", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
            { id: "1.1", name: "Deploy CCE Turbo Cluster & Node Pools", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "1.2", name: "Configure SWR Container Registry", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "2", name: "Phase 2: CI/CD & Stateful Data", prog: "0%", resp: "DevOps", start: "", end: "", isParent: true },
            { id: "2.1", name: "Push Docker Images to Huawei SWR", prog: "0%", resp: "Customer DevOps", start: "", end: "", isParent: false },
            { id: "2.2", name: "Migrate Persistent Volumes (SFS Turbo/EVS)", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "3", name: "Phase 3: Ingress & Traffic Switch", prog: "0%", resp: "All", start: "", end: "", isParent: true },
            { id: "3.1", name: "Deploy Helm Charts / Manifests", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "3.2", name: "Update Global DNS to ELB Ingress", prog: "0%", resp: "Customer IT", start: "", end: "", isParent: false }
        ]
    },
    "oms_data_lake": {
        name: "Data Lake Sync (AWS S3 to OBS)",
        tasks: [
            { id: "1", name: "Phase 1: Target Landing Zone", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
            { id: "1.1", name: "Create Target OBS Buckets", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "1.2", name: "Configure Target KMS Encryption", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "2", name: "Phase 2: OMS Serverless Transfer", prog: "0%", resp: "Cloud Backend", start: "", end: "", isParent: true },
            { id: "2.1", name: "Setup Source IAM / AWS Access Keys", prog: "0%", resp: "Customer", start: "", end: "", isParent: false },
            { id: "2.2", name: "Execute Initial OMS Sync (Background)", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "3", name: "Phase 3: Delta Sync & API Cutover", prog: "0%", resp: "All", start: "", end: "", isParent: true },
            { id: "3.1", name: "Execute Delta OMS Sync", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "3.2", name: "Update App APIs to target OBS Endpoints", prog: "0%", resp: "Customer Dev", start: "", end: "", isParent: false }
        ]
    },
    "database_drs": {
        name: "Database Logical Sync (Oracle to GaussDB)",
        tasks: [
            { id: "1", name: "Phase 1: Schema Conversion", prog: "0%", resp: "DBA", start: "", end: "", isParent: true },
            { id: "1.1", name: "Run Huawei UGO (Database Assessment)", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "1.2", name: "Provision Target GaussDB Instance", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "2", name: "Phase 2: Continuous Replication", prog: "0%", resp: "DBA", start: "", end: "", isParent: true },
            { id: "2.1", name: "Configure DRS Network Connectivity", prog: "0%", resp: "Network Team", start: "", end: "", isParent: false },
            { id: "2.2", name: "Start DRS Full + Incremental Sync", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "3", name: "Phase 3: Connection Cutover", prog: "0%", resp: "All", start: "", end: "", isParent: true },
            { id: "3.1", name: "Stop Source Application Traffic", prog: "0%", resp: "Customer IT", start: "", end: "", isParent: false },
            { id: "3.2", name: "Verify DRS Zero-Lag & Promote Target", prog: "0%", resp: "Partner DBA", start: "", end: "", isParent: false },
            { id: "3.3", name: "Update App Connection Strings", prog: "0%", resp: "Customer Dev", start: "", end: "", isParent: false }
        ]
    },
    "dataarts_sql_poc": {
        "name": "DataArts PoC: On-Prem SQL to GaussDB",
        "tasks": [
            { "id": "1", "name": "Phase 1: Hybrid Network Connectivity", "prog": "0%", "resp": "Network Team", "start": "", "end": "", "isParent": true },
            { "id": "1.1", "name": "Establish IPsec VPN or EIP access", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "1.2", "name": "Configure On-Prem Firewall (Port 1433)", "prog": "0%", "resp": "Customer IT", "start": "", "end": "", "isParent": false },
            { "id": "1.3", "name": "Verify Telnet/Ping from Cloud VPC", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "2", "name": "Phase 2: Schema Translation (UGO)", "prog": "0%", "resp": "DBA", "start": "", "end": "", "isParent": true },
            { "id": "2.1", "name": "Provision Huawei UGO Instance", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "2.2", "name": "Connect UGO to Source SQL Server", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "2.3", "name": "Generate DDL Scripts via UGO", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "2.4", "name": "Execute DDL on Target GaussDB", "prog": "0%", "resp": "Partner DBA", "start": "", "end": "", "isParent": false },
            { "id": "3", "name": "Phase 3: DataArts & CDM Provisioning", "prog": "0%", "resp": "Data Engineer", "start": "", "end": "", "isParent": true },
            { "id": "3.1", "name": "Create DataArts Studio Workspace", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "3.2", "name": "Provision CDM Cluster in Target VPC", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "3.3", "name": "Configure SG Rules for CDM to GaussDB", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "4", "name": "Phase 4: Data Pipeline Execution", "prog": "0%", "resp": "All", "start": "", "end": "", "isParent": true },
            { "id": "4.1", "name": "Create CDM Source Link (SQL Server)", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "4.2", "name": "Create CDM Target Link (GaussDB)", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "4.3", "name": "Map Table/File Migration Job", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "4.4", "name": "Execute Initial Data Sync", "prog": "0%", "resp": "Partner", "start": "", "end": "", "isParent": false },
            { "id": "4.5", "name": "Validate Record Counts & Integrity", "prog": "0%", "resp": "Customer / Partner", "start": "", "end": "", "isParent": false }
        ]
    }
};

const getHashParams = () => {
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash || '');
    return {
        phase: params.get('phase') || 'home',
        proj: params.get('proj') || 'none'
    };
};

const setHashParams = (phase, proj) => {
    window.history.pushState(null, '', `#phase=${phase}&proj=${proj}`);
};

export const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [customPlaybooks, setCustomPlaybooks] = useState({});
    const [customers, setCustomers] = useState([]);
    
    const initialParams = getHashParams();
    const [activePhase, setActivePhaseState] = useState(initialParams.phase);
    const [activeProjectId, setActiveProjectIdState] = useState(initialParams.proj);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('erp_jwt_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    };

    useEffect(() => {
        const handlePopState = () => {
            const { phase, proj } = getHashParams();
            setActivePhaseState(phase);
            setActiveProjectIdState(proj);
        };
        window.addEventListener('popstate', handlePopState);
        if (!window.location.hash) setHashParams(initialParams.phase, initialParams.proj);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const setActivePhase = (phase) => {
        setActivePhaseState(phase);
        setHashParams(phase, activeProjectId);
    };

    const setActiveProjectId = (proj) => {
        setActiveProjectIdState(proj);
        setHashParams(active
