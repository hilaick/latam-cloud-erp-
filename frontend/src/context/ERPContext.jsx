import React, { createContext, useState, useEffect } from 'react';

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
            try {
                const res = await fetch('/api/erp/state');
                const data = await res.json();
                // Filter out any projects we flagged as deleted
                if (data.success && data.projects) setProjects(data.projects.filter(p => !p.isDeleted));

                const savedPb = localStorage.getItem('cac_erp_playbooks');
                if (savedPb) setCustomPlaybooks(JSON.parse(savedPb));

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
                headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProject)
        });
    };

    const handleUpdateCustomer = (updatedCustomer) => {
        const newCusts = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
        setCustomers(newCusts);
        localStorage.setItem('cac_erp_customers', JSON.stringify(newCusts));
    };

    // 🚨 THE CASCADE DELETE FIX
    const handleDeleteCustomer = (id) => {
        const customerToDelete = customers.find(c => c.id === id);
        if (!customerToDelete) return;

        // 1. Delete the Customer Profile
        const newCusts = customers.filter(c => c.id !== id);
        setCustomers(newCusts);
        localStorage.setItem('cac_erp_customers', JSON.stringify(newCusts));

        // 2. Cascade Delete all associated projects from the Pipeline
        const prefix = customerToDelete.name.toLowerCase().split(' ')[0];
        setProjects(prevProjects => {
            const remaining = prevProjects.filter(p => {
                const isMatch = (p.name || '').toLowerCase().includes(prefix);
                if (isMatch) {
                    // Send an update to Postgres to mark it as archived/deleted so it doesn't return on refresh
                    fetch('/api/erp/projects', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...p, isDeleted: true, lifecycleState: 'archived' })
                    }).catch(e => console.error("Cascade Delete Error:", e));
                }
                return !isMatch;
            });
            return remaining;
        });
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
            setCustomPlaybooks: (pb) => { setCustomPlaybooks(pb); localStorage.setItem('cac_erp_playbooks', JSON.stringify(pb)); },
            handleUpdateProject,
            handleAddProject,
            handleUpdateCustomer,
            handleDeleteCustomer
        }}>
            {children}
        </ERPContext.Provider>
    );
};
