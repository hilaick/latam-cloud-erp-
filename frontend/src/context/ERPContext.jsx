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
        // 🚨 STRICT VALIDATION: Do not send "null" or "undefined" strings
        if (token && token !== 'null' && token !== 'undefined') {
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
        } else {
            console.warn('Preventing rapid reload loop');
        }
    };

    const [lastFetchTime, setLastFetchTime] = useState(0);
    const FETCH_COOLDOWN_MS = 5000; 
    
    const fetchState = async () => {
        const now = Date.now();
        if (now - lastFetchTime < FETCH_COOLDOWN_MS) {
            return;
        }
        
        setLastFetchTime(now);
        const token = localStorage.getItem('erp_jwt_token');
        if (!token || token === 'null' || token === 'undefined') {
            handleAuthError();
            return;
        }

        try {
            const res = await fetch('/api/erp/state', { headers: getAuthHeaders() });
            // 🚨 FIX: Intercept 422 Unprocessable Entity (Malformed JWT)
            if (res.status === 401 || res.status === 422) return handleAuthError();
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.projects) setProjects(data.projects.filter(p => !p.isDeleted));
            }
        } catch (err) { 
            console.error("Projects Fetch Error:", err); 
            setLastFetchTime(now + 30000); 
        }

        try {
            const pbRes = await fetch('/api/erp/playbooks', { headers: getAuthHeaders() });
            if (pbRes.status === 401 || pbRes.status === 422) return handleAuthError();
            
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
            setLastFetchTime(now + 30000); 
        }

        try {
            const custRes = await fetch('/api/erp/customers', { headers: getAuthHeaders() });
            if (custRes.status === 401 || custRes.status === 422) return handleAuthError();
            if (custRes.ok) {
                const custData = await custRes.json();
                if (custData.success && custData.customers) setCustomers(custData.customers);
            }
        } catch (err) { 
            console.error("Customers Fetch Error:", err); 
            setLastFetchTime(now + 30000); 
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('erp_jwt_token');
        if (token && token !== 'null' && token !== 'undefined') {
            fetchState();
        } else {
            handleAuthError();
        }
    }, []);

    // Helper function to determine region based on country
    const getRegionFromCountry = (country) => {
        if (!country) return 'la-south-2'; // Default fallback
        
        const countryLower = country.toLowerCase();
        
        // Mexico
        if (countryLower.includes('mexico')) return 'la-north-2';
        
        // Brazil
        if (countryLower.includes('brazil')) return 'sa-brazil-1';
        
        // Chile
        if (countryLower.includes('chile')) return 'la-south-2';
        
        // Argentina
        if (countryLower.includes('argentina')) return 'sa-argentina-1';
        
        // Central America & Caribbean - default to Mexico
        const centralAmerica = ['guatemala', 'belize', 'el salvador', 'honduras', 'nicaragua', 'costa rica', 'panama'];
        const caribbean = ['dominican republic', 'haiti', 'cuba', 'jamaica', 'puerto rico', 'trinidad', 'tobago', 'bahamas', 'barbados', 'dominica', 'grenada', 'saint lucia', 'saint vincent', 'antigua', 'barbuda', 'saint kitts', 'nevis'];
        
        if (centralAmerica.some(ca => countryLower.includes(ca)) || 
            caribbean.some(cb => countryLower.includes(cb))) {
            return 'la-north-2'; // Mexico region for Central America/Caribbean
        }
        
        // South America (excluding Brazil, Chile, Argentina)
        const southAmerica = ['colombia', 'venezuela', 'ecuador', 'peru', 'bolivia', 'uruguay', 'paraguay', 'guyana', 'suriname', 'french guiana'];
        if (southAmerica.some(sa => countryLower.includes(sa))) {
            return 'sa-brazil-1'; // Brazil region for other South America
        }
        
        return 'la-south-2'; // Default fallback
    };

    const handleUpdateProject = (id, fieldOrObj, value) => {
        const targetProject = projects.find(p => String(p.id) === String(id));
        if (!targetProject) return;

        const isObj = typeof fieldOrObj === 'object';
        let modifiedProject = isObj 
            ? { ...targetProject, ...fieldOrObj } 
            : { ...targetProject, [fieldOrObj]: value };

        fetch('/api/erp/projects', { 
            method: 'POST', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(modifiedProject) 
        })
        .then(r => { 
            if(r.status === 401 || r.status === 422) handleAuthError();
            else if(!r.ok) throw new Error(`Failed to save project: ${r.status} ${r.statusText}`);
        })
        .catch(err => {
            console.error('Error saving project to DB:', err);
        });

        const isMovingToPipeline = targetProject.isWaiting === true && modifiedProject.isWaiting === false;
        
        if (isMovingToPipeline) {
            const custName = (modifiedProject.customerName || modifiedProject.name.split('-')[0]).trim();
            if (custName) {
                const existingCustomer = customers.find(c => c.name.toLowerCase() === custName.toLowerCase());
                
                if (!existingCustomer) {
                    const newCust = { 
                        id: `CUST-${Date.now()}`, name: custName, ak: '', sk: '', 
                        region: getRegionFromCountry(modifiedProject.country), // Use country-based region mapping
                        country: modifiedProject.country || 'TBD', sa: modifiedProject.sa || 'TBD', 
                        partner: modifiedProject.partner || 'TBD', techContact: modifiedProject.techContact || 'TBD' 
                    };
                    
                    setCustomers(prev => [...prev, newCust]);
                    fetch('/api/erp/customers', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newCust) });
                    
                    modifiedProject.customerId = newCust.id;
                    // Inherit region from newly created customer
                    modifiedProject.region = newCust.region;
                    fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(modifiedProject) });
                } else {
                    modifiedProject.customerId = existingCustomer.id;
                    // Inherit region from existing customer
                    modifiedProject.region = existingCustomer.region || getRegionFromCountry(modifiedProject.country);
                    fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(modifiedProject) });
                }
            }
        }

        setProjects(prev => prev.map(p => String(p.id) === String(id) ? modifiedProject : p));
    };

    const handleAddProject = (newProject) => {
        const custName = newProject.customerName?.trim();
        let customerRegion = getRegionFromCountry(newProject.country); // Use country-based mapping
        
        if (custName) {
            const existingCustomer = customers.find(c => c.name.toLowerCase() === custName.toLowerCase());
            if (existingCustomer) {
                newProject = { ...newProject, customerId: existingCustomer.id };
                // Inherit region from customer, default to country-based mapping if not set
                customerRegion = existingCustomer.region || getRegionFromCountry(newProject.country);
            }
        }
        
        // Add region to project (inherit from customer or use country-based mapping)
        newProject = { ...newProject, region: customerRegion };
        
        setProjects(prev => [newProject, ...prev]);
        fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newProject) })
            .then(r => { 
                if(r.status === 401 || r.status === 422) handleAuthError();
                else if(!r.ok) throw new Error(`Failed to add project: ${r.status} ${r.statusText}`);
            })
            .catch(err => {
                console.error('Error adding project:', err);
                alert(`Failed to add project: ${err.message}`);
            });
    };

    const handleAddCustomer = (newCustomer) => {
        setCustomers(prev => [...prev, newCustomer]);
        fetch('/api/erp/customers', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newCustomer) })
            .then(r => { 
                if(r.status === 401 || r.status === 422) handleAuthError();
                else if(!r.ok) throw new Error(`Failed to add customer: ${r.status} ${r.statusText}`);
            })
            .catch(err => {
                console.error('Error adding customer:', err);
                alert(`Failed to add customer: ${err.message}`);
            });
    };

    const handleUpdateCustomer = (updatedCustomer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        fetch(`/api/erp/customers/${updatedCustomer.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updatedCustomer) })
            .then(r => { 
                if(r.status === 401 || r.status === 422) handleAuthError();
                else if(!r.ok) throw new Error(`Failed to update customer: ${r.status} ${r.statusText}`);
            })
            .catch(err => {
                console.error('Error updating customer:', err);
                alert(`Failed to update customer: ${err.message}`);
            });
    };

    const handleDeleteCustomer = (id) => {
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
        if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
        
        fetch(`/api/erp/projects/${id}`, { 
            method: 'DELETE', 
            headers: getAuthHeaders() 
        })
        .then(r => {
            if (r.status === 401 || r.status === 422) handleAuthError();
            else if (!r.ok) throw new Error(`Failed to delete project: ${r.status} ${r.statusText}`);
            else {
                setProjects(prev => prev.filter(p => String(p.id) !== String(id)));
                if (String(activeProjectId) === String(id)) { 
                    setActiveProjectId('none'); 
                    setActivePhase('home'); 
                }
            }
        })
        .catch(err => {
            console.error('Error deleting project:', err);
            alert(`Failed to delete project: ${err.message}`);
        });
    };

    // ============================================================================
    // 🚨 PROGRESS ENGINE: Automated Roll-up Logic for WBS Tagging
    // ============================================================================
    const syncExecutionProgress = (projectId, highLevelPlan, executionPlan) => {
        if (!highLevelPlan || !executionPlan) return;

        let updatedHighLevelPlan = [...highLevelPlan];

        updatedHighLevelPlan = updatedHighLevelPlan.map(hlTask => {
            if (hlTask.isParent) return hlTask; 

            const childTasks = executionPlan.filter(ex => String(ex.parentWbsId) === String(hlTask.id));
            
            if (childTasks.length === 0) return hlTask; 

            let totalPercent = 0;
            childTasks.forEach(child => {
                const val = parseInt((child.prog || '0').replace('%', ''), 10);
                totalPercent += isNaN(val) ? 0 : val;
            });
            
            const avgProgress = Math.round(totalPercent / childTasks.length);
            return { ...hlTask, prog: `${avgProgress}%` };
        });

        const validHlTasks = updatedHighLevelPlan.filter(t => !t.isParent);
        let masterTotal = 0;
        validHlTasks.forEach(t => {
            const v = parseInt((t.prog || '0').replace('%', ''), 10);
            masterTotal += isNaN(v) ? 0 : v;
        });
        const masterOverallProgress = validHlTasks.length > 0 ? Math.round(masterTotal / validHlTasks.length) + '%' : '0%';

        handleUpdateProject(projectId, 'migrationPlan', updatedHighLevelPlan);
        setTimeout(() => {
            handleUpdateProject(projectId, 'progress', masterOverallProgress);
        }, 50);
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
            handleAddCustomer, 
            handleUpdateCustomer, 
            handleDeleteCustomer, 
            handleDeleteProject,
            syncExecutionProgress, 
            refreshData: fetchState
        }}>
            {children}
        </ERPContext.Provider>
    );
};
