import React, { createContext, useState, useEffect } from 'react';

const DEFAULT_PLAYBOOKS = {
    "default_vm": {
        name: "Standard VM Lift & Shift",
        tasks: [
            { id: "1", name: "Phase 1: Architecture & Auth", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
            { id: "1.1", name: "Deploy Target VPC", prog: "0%", resp: "Partner", start: "", end: "", isParent: false }
        ]
    }
};

const getHashParams = () => {
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash || '');
    return { phase: params.get('phase') || 'home', proj: params.get('proj') || 'none' };
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
        return { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' };
    };

    useEffect(() => {
        const handlePopState = () => {
            const { phase, proj } = getHashParams();
            setActivePhaseState(phase); setActiveProjectIdState(proj);
        };
        window.addEventListener('popstate', handlePopState);
        if (!window.location.hash) setHashParams(initialParams.phase, initialParams.proj);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const setActivePhase = (phase) => { setActivePhaseState(phase); setHashParams(phase, activeProjectId); };
    const setActiveProjectId = (proj) => { setActiveProjectIdState(proj); setHashParams(activePhase, proj); };

    const handleAuthError = () => {
        localStorage.removeItem('erp_jwt_token');
        localStorage.removeItem('erp_user');
        window.location.reload();
    };

    // 🚨 FIX: Indestructible Fetch Logic
    useEffect(() => {
        const fetchState = async () => {
            const token = localStorage.getItem('erp_jwt_token');
            if (!token) return;

            // 1. Fetch Projects (Isolated)
            try {
                const res = await fetch('/api/erp/state', { headers: getAuthHeaders() });
                if (res.status === 401) return handleAuthError();
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.projects) setProjects(data.projects.filter(p => !p.isDeleted));
                }
            } catch (err) { console.error("Projects Fetch Error:", err); }

            // 2. Fetch Playbooks (Isolated & Guaranteed to Fallback)
            try {
                const pbRes = await fetch('/api/erp/playbooks', { headers: getAuthHeaders() });
                if (pbRes.status === 401) return handleAuthError();
                
                let pbData = {};
                if (pbRes.ok) {
                    const text = await pbRes.text();
                    pbData = text ? JSON.parse(text) : {};
                }
                
                if (pbData.success && pbData.playbooks && Object.keys(pbData.playbooks).length > 0) {
                    setCustomPlaybooks(pbData.playbooks);
                } else {
                    setCustomPlaybooks(DEFAULT_PLAYBOOKS);
                    fetch('/api/erp/playbooks', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(DEFAULT_PLAYBOOKS) });
                }
            } catch (err) {
                console.error("Playbooks Fetch Error:", err);
                setCustomPlaybooks(DEFAULT_PLAYBOOKS);
            }

            // 3. Fetch Customers (Isolated)
            try {
                const custRes = await fetch('/api/erp/customers', { headers: getAuthHeaders() });
                if (custRes.status === 401) return handleAuthError();
                if (custRes.ok) {
                    const custData = await custRes.json();
                    if (custData.success && custData.customers) setCustomers(custData.customers);
                }
            } catch (err) { console.error("Customers Fetch Error:", err); }
        };
        fetchState();
    }, []);

    const handleUpdateProject = (id, fieldOrObj, value) => {
        setProjects(prev => {
            const isObj = typeof fieldOrObj === 'object';
            const updated = prev.map(p => String(p.id) === String(id) ? (isObj ? { ...p, ...fieldOrObj } : { ...p, [fieldOrObj]: value }) : p);
            const modified = updated.find(p => String(p.id) === String(id));

            fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(modified) }).then(r => { if(r.status === 401) handleAuthError(); });

            if (isObj ? fieldOrObj.isWaiting === false : (fieldOrObj === 'isWaiting' && value === false)) {
                const custName = (modified.customerName || modified.name.split('-')[0]).trim();
                setCustomers(prevCusts => {
                    if (!prevCusts.find(c => c.name.toLowerCase() === custName.toLowerCase())) {
                        const newCust = { id: `CUST-${Date.now()}`, name: custName, ak: '', sk: '', region: 'la-south-2', country: modified.country || 'TBD', sa: modified.sa || 'TBD', partner: modified.partner || 'TBD', techContact: modified.techContact || 'TBD' };
                        fetch('/api/erp/customers', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newCust) });
                        return [...prevCusts, newCust];
                    }
                    return prevCusts;
                });
            }
            return updated;
        });
    };

    const handleAddProject = (newProject) => {
        setProjects(prev => [newProject, ...prev]);
        fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newProject) }).then(r => { if(r.status === 401) handleAuthError(); });
    };

    const handleUpdateCustomer = (updatedCustomer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        fetch(`/api/erp/customers/${updatedCustomer.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updatedCustomer) });
    };

    const handleDeleteCustomer = (id) => {
        setCustomers(prev => prev.filter(c => c.id !== id));
        fetch(`/api/erp/customers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    };

    const handleDeleteProject = (id) => {
        if (!window.confirm("Delete this project?")) return;
        setProjects(prev => prev.filter(p => String(p.id) !== String(id)));
        fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ id, isDeleted: true, lifecycleState: 'archived' }) });
        if (String(activeProjectId) === String(id)) { setActiveProjectId('none'); setActivePhase('home'); }
    };

    return (
        <ERPContext.Provider value={{ projects, customers, activePhase, activeProjectId, customPlaybooks, setActivePhase, setActiveProjectId, setCustomPlaybooks, handleUpdateProject, handleAddProject, handleUpdateCustomer, handleDeleteCustomer, handleDeleteProject }}>
            {children}
        </ERPContext.Provider>
    );
};
