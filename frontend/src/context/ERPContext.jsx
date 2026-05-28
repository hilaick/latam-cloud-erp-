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
        // Prevent rapid reload loops by checking if we just reloaded
        const lastReload = localStorage.getItem('erp_last_reload');
        const now = Date.now();
        
        if (!lastReload || (now - parseInt(lastReload)) > 5000) { // 5 second cooldown
            localStorage.setItem('erp_last_reload', now.toString());
            window.location.reload();
        } else {
            console.warn('Preventing rapid reload loop');
        }
    };

    // 🚨 FIX: Indestructible Fetch Logic with rate limiting
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const FETCH_COOLDOWN_MS = 5000; // 5 seconds between fetches
    
    const fetchState = async () => {
        const now = Date.now();
        if (now - lastFetchTime < FETCH_COOLDOWN_MS) {
            console.warn('Fetch throttled - too soon since last fetch');
            return;
        }
        
        setLastFetchTime(now);
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
        } catch (err) { 
            console.error("Projects Fetch Error:", err); 
            // Don't retry immediately on network error
            setLastFetchTime(now + 30000); // Add 30s penalty for network errors
        }

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
            setLastFetchTime(now + 30000); // Add 30s penalty for network errors
        }

        // 3. Fetch Customers (Isolated)
        try {
            const custRes = await fetch('/api/erp/customers', { headers: getAuthHeaders() });
            if (custRes.status === 401) return handleAuthError();
            if (custRes.ok) {
                const custData = await custRes.json();
                if (custData.success && custData.customers) setCustomers(custData.customers);
            }
        } catch (err) { 
            console.error("Customers Fetch Error:", err); 
            setLastFetchTime(now + 30000); // Add 30s penalty for network errors
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('erp_jwt_token');
        if (token) {
            fetchState();
        }
    }, []);

    const handleUpdateProject = (id, fieldOrObj, value) => {
        setProjects(prev => {
            const isObj = typeof fieldOrObj === 'object';
            const updated = prev.map(p => String(p.id) === String(id) ? (isObj ? { ...p, ...fieldOrObj } : { ...p, [fieldOrObj]: value }) : p);
            const modified = updated.find(p => String(p.id) === String(id));

            fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(modified) })
                .then(r => { 
                    if(r.status === 401) handleAuthError();
                    else if(!r.ok) throw new Error(`Failed to save project: ${r.status} ${r.statusText}`);
                })
                .catch(err => {
                    console.error('Error saving project:', err);
                    alert(`Failed to save project: ${err.message}`);
                });

            // 🚨 CREATE CUSTOMER WHEN PROJECT MOVES FROM PRE-SALES TO ARB/PIPELINE
            // Only create customer when project transitions from isWaiting:true to isWaiting:false
            const originalProject = prev.find(p => String(p.id) === String(id));
            const isMovingToPipeline = originalProject?.isWaiting === true && 
                                     (isObj ? fieldOrObj.isWaiting === false : (fieldOrObj === 'isWaiting' && value === false));
            
            if (isMovingToPipeline) {
                const custName = (modified.customerName || modified.name.split('-')[0]).trim();
                if (custName) {
                    setCustomers(prevCusts => {
                        // Check if customer already exists
                        let existingCustomer = prevCusts.find(c => c.name.toLowerCase() === custName.toLowerCase());
                        
                        if (!existingCustomer) {
                            // Create new customer
                            const newCust = { 
                                id: `CUST-${Date.now()}`, 
                                name: custName, 
                                ak: '', 
                                sk: '', 
                                region: 'la-south-2', 
                                country: modified.country || 'TBD', 
                                sa: modified.sa || 'TBD', 
                                partner: modified.partner || 'TBD', 
                                techContact: modified.techContact || 'TBD' 
                            };
                            fetch('/api/erp/customers', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newCust) })
                                .then(r => { 
                                    if(r.status === 401) handleAuthError();
                                    else if(!r.ok) console.error('Failed to create customer:', r.status, r.statusText);
                                })
                                .catch(err => console.error('Error creating customer:', err));
                            
                            // Update project with customerId
                            const updatedProjectWithCustomerId = { ...modified, customerId: newCust.id };
                            fetch('/api/erp/projects', { 
                                method: 'POST', 
                                headers: getAuthHeaders(), 
                                body: JSON.stringify(updatedProjectWithCustomerId) 
                            })
                                .then(r => { 
                                    if(r.status === 401) handleAuthError();
                                    else if(!r.ok) console.error('Failed to update project with customerId:', r.status, r.statusText);
                                })
                                .catch(err => console.error('Error updating project:', err));
                            
                            return [...prevCusts, newCust];
                        } else {
                            // Customer exists, link project to existing customer
                            const updatedProjectWithCustomerId = { ...modified, customerId: existingCustomer.id };
                            fetch('/api/erp/projects', { 
                                method: 'POST', 
                                headers: getAuthHeaders(), 
                                body: JSON.stringify(updatedProjectWithCustomerId) 
                            })
                                .then(r => { 
                                    if(r.status === 401) handleAuthError();
                                    else if(!r.ok) console.error('Failed to link project to customer:', r.status, r.statusText);
                                })
                                .catch(err => console.error('Error linking project:', err));
                            return prevCusts;
                        }
                    });
                }
            }
            return updated;
        });
    };

    const handleAddProject = (newProject) => {
        // If project has customerName, check if customer exists and add customerId
        const custName = newProject.customerName?.trim();
        if (custName) {
            const existingCustomer = customers.find(c => c.name.toLowerCase() === custName.toLowerCase());
            if (existingCustomer) {
                newProject = { ...newProject, customerId: existingCustomer.id };
            }
        }
        
        setProjects(prev => [newProject, ...prev]);
        fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newProject) })
            .then(r => { 
                if(r.status === 401) handleAuthError();
                else if(!r.ok) throw new Error(`Failed to add project: ${r.status} ${r.statusText}`);
            })
            .catch(err => {
                console.error('Error adding project:', err);
                alert(`Failed to add project: ${err.message}`);
            });
    };

    const handleUpdateCustomer = (updatedCustomer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        fetch(`/api/erp/customers/${updatedCustomer.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updatedCustomer) })
            .then(r => { 
                if(r.status === 401) handleAuthError();
                else if(!r.ok) throw new Error(`Failed to update customer: ${r.status} ${r.statusText}`);
            })
            .catch(err => {
                console.error('Error updating customer:', err);
                alert(`Failed to update customer: ${err.message}`);
            });
    };

    const handleDeleteCustomer = (id) => {
        // Check if customer has any active projects
        const customerToDelete = customers.find(c => c.id === id);
        const customerName = customerToDelete?.name;
        
        if (customerName) {
            const customerProjects = projects.filter(p => {
                const projectCustomerId = p.customerId;
                const projectCustomerName = p.customerName || p.name.split('-')[0]?.trim();
                return (projectCustomerId === id) || 
                       (projectCustomerName && projectCustomerName.toLowerCase() === customerName.toLowerCase());
            });
            
            if (customerProjects.length > 0) {
                const confirmDelete = window.confirm(
                    `Customer "${customerName}" has ${customerProjects.length} active project(s).\n\n` +
                    `Deleting this customer will NOT delete the projects, but they will lose their customer association.\n\n` +
                    `Do you want to proceed?`
                );
                if (!confirmDelete) return;
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
            projects, 
            customers, 
            activePhase, 
            activeProjectId, 
            customPlaybooks, 
            setActivePhase, 
            setActiveProjectId, 
            setCustomPlaybooks, 
            handleUpdateProject, 
            handleAddProject, 
            handleUpdateCustomer, 
            handleDeleteCustomer, 
            handleDeleteProject,
            refreshData: fetchState  // Add this line
        }}>
            {children}
        </ERPContext.Provider>
    );
};
