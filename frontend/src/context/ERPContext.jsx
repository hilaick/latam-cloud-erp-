import React, { createContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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
    const [haltedProjects, setHaltedProjects] = useState([]);
    
    const initialParams = getHashParams();
    const [activePhase, setActivePhaseState] = useState(initialParams.phase);
    const [activeProjectId, setActiveProjectIdState] = useState(initialParams.proj);

    const getAuthHeaders = () => {
        const token = sessionStorage.getItem('hermes_access_token');  // Match AuthContext
        const headers = { 'Content-Type': 'application/json' };
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
        sessionStorage.removeItem('hermes_access_token');
        sessionStorage.removeItem('hermes_user');
        // 🚨 Redirect to login instead of reloading (prevents rapid reload loop)
        window.location.hash = '#phase=login&proj=none';
    };

    const [lastFetchTime, setLastFetchTime] = useState(0);
    const FETCH_COOLDOWN_MS = 5000; 
    
    const fetchState = async () => {
        const now = Date.now();
        if (now - lastFetchTime < FETCH_COOLDOWN_MS) {
            return;
        }
        
        setLastFetchTime(now);
        const token = sessionStorage.getItem('hermes_access_token');
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

    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            fetchState();
        }
    }, [isAuthenticated]);

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
        const updates = isObj ? fieldOrObj : { [fieldOrObj]: value };
        let modifiedProject = { ...targetProject, ...updates };

        // 🚨 CRITICAL: Use PATCH (partial update) to preserve blueprintData/topology
        fetch(`/api/erp/projects/${id}/partial`, { 
            method: 'PATCH', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(updates)  // Only send changed fields
        })
        .then(r => { 
            if(r.status === 401 || r.status === 422) handleAuthError();
            else if(!r.ok) throw new Error(`Failed to save project: ${r.status} ${r.statusText}`);
            
            // Update local state after successful save
            setProjects(prev => prev.map(p => 
                String(p.id) === String(id) ? modifiedProject : p
            ));
        })
        .catch(err => {
            console.error('Error saving project to DB:', err);
        });

        const isMovingToPipeline = targetProject.isWaiting === true && modifiedProject.isWaiting === false;
        
        if (isMovingToPipeline) {
            const custName = (modifiedProject.customerName || (modifiedProject.name ? modifiedProject.name.split('-')[0] : '')).trim();
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
                    fetch(`/api/erp/projects/${id}/partial`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ customerId: newCust.id, region: newCust.region }) });
                } else {
                    modifiedProject.customerId = existingCustomer.id;
                    // Inherit region from existing customer
                    modifiedProject.region = existingCustomer.region || getRegionFromCountry(modifiedProject.country);
                    fetch(`/api/erp/projects/${id}/partial`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ customerId: existingCustomer.id, region: modifiedProject.region }) });
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
                const projectCustomerName = p.customerName || (p.name ? p.name.split('-')[0]?.trim() : '');
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

    // ============================================================================
    // 🛑 PROJECT HALT / CANCELLATION OPERATIONS
    // ============================================================================
    const handleHaltProject = async (projectId, { action, reason, transferredTo, resumeReviewDate }) => {
        try {
            const r = await fetch(`/api/erp/projects/${projectId}/halt`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    action,
                    reason,
                    transferredTo: transferredTo || '',
                    resumeReviewDate: resumeReviewDate || '',
                    author: sessionStorage.getItem('hermes_user_name') || 'System'
                })
            });

            if (r.status === 401 || r.status === 422) { handleAuthError(); return { success: false }; }
            if (!r.ok) {
                const errData = await r.json().catch(() => ({}));
                throw new Error(errData.error || `Halt failed: ${r.status}`);
            }

            const result = await r.json();
            if (result.success) {
                setProjects(prev => prev.map(p =>
                    String(p.id) === String(projectId)
                        ? { ...p, status: result.status, haltAction: action, haltReason: reason }
                        : p
                ));
                if (action === 'cancel' || action === 'transfer') {
                    setActiveProjectId('none');
                    setActivePhase('home');
                }
            }
            return result;
        } catch (err) {
            console.error('Error halting project:', err);
            alert(`Failed to halt project: ${err.message}`);
            return { success: false, error: err.message };
        }
    };

    const handleResumeProject = async (projectId) => {
        try {
            const r = await fetch(`/api/erp/projects/${projectId}/resume`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    author: sessionStorage.getItem('hermes_user_name') || 'System'
                })
            });

            if (r.status === 401 || r.status === 422) { handleAuthError(); return { success: false }; }
            if (!r.ok) {
                const errData = await r.json().catch(() => ({}));
                throw new Error(errData.error || `Resume failed: ${r.status}`);
            }

            const result = await r.json();
            if (result.success) {
                setProjects(prev => prev.map(p =>
                    String(p.id) === String(projectId)
                        ? { ...p, status: 'active', haltAction: undefined, haltReason: undefined }
                        : p
                ));
                setHaltedProjects(prev => prev.filter(p => String(p.id) !== String(projectId)));
            }
            return result;
        } catch (err) {
            console.error('Error resuming project:', err);
            alert(`Failed to resume project: ${err.message}`);
            return { success: false, error: err.message };
        }
    };

    const fetchHaltedProjects = async () => {
        try {
            const r = await fetch('/api/erp/projects/halted', { headers: getAuthHeaders() });
            if (r.status === 401 || r.status === 422) { handleAuthError(); return; }
            if (!r.ok) throw new Error(`Failed to fetch halted projects: ${r.status}`);
            const data = await r.json();
            if (data.success) {
                setHaltedProjects(data.projects || []);
            }
        } catch (err) {
            console.error('Error fetching halted projects:', err);
        }
    };


    return (
        <ERPContext.Provider value={{ 
            projects, 
            customers, 
            activePhase, 
            activeProjectId, 
            customPlaybooks,
            haltedProjects, 
            setActivePhase, 
            setActiveProjectId, 
            setCustomPlaybooks, 
            handleUpdateProject, 
            handleAddProject, 
            handleAddCustomer, 
            handleUpdateCustomer, 
            handleDeleteCustomer, 
            handleDeleteProject,
            handleHaltProject,
            handleResumeProject,
            fetchHaltedProjects,
            syncExecutionProgress,
            refreshData: fetchState
        }}>
            {children}
        </ERPContext.Provider>
    );
};
