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
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
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
        const lastReload = localStorage.getItem('erp_last_reload');
        const now = Date.now();
        
        if (!lastReload || (now - parseInt(lastReload)) > 5000) { 
            localStorage.setItem('erp_last_reload', now.toString());
            window.location.reload();
        }
    };

    const [lastFetchTime, setLastFetchTime] = useState(0);
    const FETCH_COOLDOWN_MS = 5000; 
    
    const fetchState = async () => {
        const now = Date.now();
        if (now - lastFetchTime < FETCH_COOLDOWN_MS) return;
        
        setLastFetchTime(now);
        const token = localStorage.getItem('erp_jwt_token');
        if (!token) return;

        try {
            const res = await fetch('/api/erp/state', { headers: getAuthHeaders() });
            if (res.status === 401) return handleAuthError();
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.projects) setProjects(data.projects.filter(p => !p.isDeleted));
            }
        } catch (err) { setLastFetchTime(now + 30000); }

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
            setCustomPlaybooks(DEFAULT_PLAYBOOKS);
            setLastFetchTime(now + 30000); 
        }

        try {
            const custRes = await fetch('/api/erp/customers', { headers: getAuthHeaders() });
            if (custRes.status === 401) return handleAuthError();
            if (custRes.ok) {
                const custData = await custRes.json();
                if (custData.success && custData.customers) setCustomers(custData.customers);
            }
        } catch (err) { setLastFetchTime(now + 30000); }
    };

    useEffect(() => {
        const token = localStorage.getItem('erp_jwt_token');
        if (token) fetchState();
    }, []);

    // 🚨 FIX: Purified state updater. Extracted fetch logic out of the setState callback.
    const handleUpdateProject = (id, fieldOrObj, value) => {
        const originalProject = projects.find(p => String(p.id) === String(id));
        if (!originalProject) return;

        const isObj = typeof fieldOrObj === 'object';
        const modifiedProject = isObj ? { ...originalProject, ...fieldOrObj } : { ...originalProject, [fieldOrObj]: value };

        // 1. Pure State Update
        setProjects(prev => prev.map(p => String(p.id) === String(id) ? modifiedProject : p));

        // 2. Safe Asynchronous Fetch (Outside of state lifecycle)
        fetch('/api/erp/projects', { 
            method: 'POST', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(modifiedProject) 
        })
        .then(r => { 
            if(r.status === 401) handleAuthError();
            else if(!r.ok) throw new Error(`Failed to save project: ${r.status} ${r.statusText}`);
        })
        .catch(err => console.error('Error saving project:', err));

        // 3. Customer Auto-Creation Logic
        const isMovingToPipeline = originalProject.isWaiting === true && modifiedProject.isWaiting === false;
        
        if (isMovingToPipeline) {
            const custName = (modifiedProject.customerName || modifiedProject.name.split('-')[0]).trim();
            if (custName) {
                const existingCustomer = customers.find(c => c.name.toLowerCase() === custName.toLowerCase());
                
                if (!existingCustomer) {
                    const newCust = { 
                        id: `CUST-${Date.now()}`, name: custName, ak: '', sk: '', region: 'la-south-2', 
                        country: modifiedProject.country || 'TBD', sa: modifiedProject.sa || 'TBD', 
                        partner: modifiedProject.partner || 'TBD', techContact: modifiedProject.techContact || 'TBD' 
                    };
                    setCustomers(prev => [...prev, newCust]);
                    fetch('/api/erp/customers', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newCust) });
                    
                    const updatedWithCustomer = { ...modifiedProject, customerId: newCust.id };
                    setProjects(prev => prev.map(p => String(p.id) === String(id) ? updatedWithCustomer : p));
                    fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(updatedWithCustomer) });
                } else {
                    const updatedWithCustomer = { ...modifiedProject, customerId: existingCustomer.id };
                    setProjects(prev => prev.map(p => String(p.id) === String(id) ? updatedWithCustomer : p));
                    fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(updatedWithCustomer) });
                }
            }
        }
    };

    const handleAddProject = (newProject) => {
        const custName = newProject.customerName?.trim();
        if (custName) {
            const existingCustomer = customers.find(c => c.name.toLowerCase() === custName.toLowerCase());
            if (existingCustomer) newProject = { ...newProject, customerId: existingCustomer.id };
        }
        
        setProjects(prev => [newProject, ...prev]);
        fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newProject) })
            .then(r => { if(r.status === 401) handleAuthError(); })
            .catch(err => console.error('Error adding project:', err));
    };

    const handleUpdateCustomer = (updatedCustomer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        fetch(`/api/erp/customers/${updatedCustomer.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updatedCustomer) })
            .then(r => { if(r.status === 401) handleAuthError(); })
            .catch(err => console.error('Error updating customer:', err));
    };

    const handleDeleteCustomer = (id) => {
        const customerToDelete = customers.find(c => c.id === id);
        const customerName = customerToDelete?.name;
        
        if (customerName) {
            const customerProjects = projects.filter(p => p.customerId === id || (p.customerName && p.customerName.toLowerCase() === customerName.toLowerCase()));
            if (customerProjects.length > 0) {
                if (!window.confirm(`Customer "${customerName}" has ${customerProjects.length} active project(s).\nDeleting this customer will NOT delete the projects, but they will lose association. Proceed?`)) return;
            }
        }
        
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
        <ERPContext.Provider value={{ 
            projects, customers, activePhase, activeProjectId, customPlaybooks, 
            setActivePhase, setActiveProjectId, setCustomPlaybooks, handleUpdateProject, 
            handleAddProject, handleUpdateCustomer, handleDeleteCustomer, handleDeleteProject, refreshData: fetchState
        }}>
            {children}
        </ERPContext.Provider>
    );
};
