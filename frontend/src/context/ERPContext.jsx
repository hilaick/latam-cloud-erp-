import React, { createContext, useState, useEffect } from 'react';

// --- 5 ENTERPRISE-GRADE PLAYBOOKS ---
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

    // Get JWT Headers
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
        setHashParams(activePhase, proj);
    };

    useEffect(() => {
        const fetchState = async () => {
            const token = localStorage.getItem('erp_jwt_token');
            if (!token) return;

            try {
                // 1. Fetch Projects
                const res = await fetch('/api/erp/state', { headers: getAuthHeaders() });
                const data = await res.json();
                if (data.success && data.projects) setProjects(data.projects.filter(p => !p.isDeleted));

                // 🚨 2. Fetch Playbooks from POSTGRESQL!
                const pbRes = await fetch('/api/erp/playbooks', { headers: getAuthHeaders() });
                const pbData = await pbRes.json();
                
                if (pbData.success && pbData.playbooks && Object.keys(pbData.playbooks).length > 0) {
                    setCustomPlaybooks(pbData.playbooks);
                } else {
                    // Database is empty! Inject the 5 defaults.
                    setCustomPlaybooks(DEFAULT_PLAYBOOKS);
                    fetch('/api/erp/playbooks', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(DEFAULT_PLAYBOOKS)
                    });
                }

                // 3. Fetch Customers
                const savedCust = localStorage.getItem('cac_erp_customers');
                if (savedCust) setCustomers(JSON.parse(savedCust));
            } catch (err) {
                console.error("PostgreSQL Connection Warning:", err);
            }
        };
        fetchState();
    }, []);

    const handleUpdateProject = (id, field, value) => {
        setProjects(prevProjects => {
            const updatedProjects = prevProjects.map(p => String(p.id) === String(id) ? { ...p, [field]: value } : p);
            const modifiedProject = updatedProjects.find(p => String(p.id) === String(id));

            fetch('/api/erp/projects', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(modifiedProject)
            }).catch(err => console.error("Postgres Sync Error:", err));

            if (field === 'isWaiting' && value === false) {
                const custName = modifiedProject.name.split('-')[0].trim();
                setCustomers(prevCusts => {
                    if (!prevCusts.find(c => c.name === custName)) {
                        const newCust = { id: Date.now(), name: custName, ak: '', sk: '', region: 'la-south-2' };
                        const updated = [...prevCusts, newCust];
                        localStorage.setItem('cac_erp_customers', JSON.stringify(updated));
                        return updated;
                    }
                    return prevCusts;
                });
            }
            return updatedProjects;
        });
    };

    const handleAddProject = (newProject) => {
        setProjects(prev => [newProject, ...prev]);
        fetch('/api/erp/projects', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(newProject)
        });
    };

    const handleUpdateCustomer = (updatedCustomer) => {
        const newCusts = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
        setCustomers(newCusts);
        localStorage.setItem('cac_erp_customers', JSON.stringify(newCusts));
    };

    const handleDeleteCustomer = (id) => {
        const customerToDelete = customers.find(c => c.id === id);
        if (!customerToDelete) return;

        const newCusts = customers.filter(c => c.id !== id);
        setCustomers(newCusts);
        localStorage.setItem('cac_erp_customers', JSON.stringify(newCusts));

        const prefix = customerToDelete.name.toLowerCase().split(' ')[0];
        setProjects(prevProjects => {
            const remaining = prevProjects.filter(p => {
                const isMatch = (p.name || '').toLowerCase().includes(prefix);
                if (isMatch) {
                    fetch('/api/erp/projects', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ ...p, isDeleted: true, lifecycleState: 'archived' })
                    }).catch(e => console.error("Cascade Delete Error:", e));
                }
                return !isMatch;
            });
            return remaining;
        });
    };

    const handleDeleteProject = (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this project?")) return;
        
        setProjects(prevProjects => {
            const projectToDelete = prevProjects.find(p => String(p.id) === String(id));
            if (projectToDelete) {
                fetch('/api/erp/projects', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ ...projectToDelete, isDeleted: true, lifecycleState: 'archived' })
                }).catch(err => console.error("Postgres Sync Error:", err));
            }
            return prevProjects.filter(p => String(p.id) !== String(id));
        });
        
        if (String(activeProjectId) === String(id)) {
            setActiveProjectId('none');
            setActivePhase('home');
        }
    };

    return (
        <ERPContext.Provider value={{
            projects,
            customers,
            activePhase,
            activeProjectId,
            customPlaybooks,
            setActivePhase,
            setActiveProjectId,
            // 🚨 Update save function to push to Postgres
            setCustomPlaybooks: (pb) => { 
                setCustomPlaybooks(pb); 
                fetch('/api/erp/playbooks', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(pb)
                });
            },
            handleUpdateProject,
            handleAddProject,
            handleUpdateCustomer,
            handleDeleteCustomer,
            handleDeleteProject
        }}>
            {children}
        </ERPContext.Provider>
    );
};
