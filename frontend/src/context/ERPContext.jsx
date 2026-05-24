import React, { createContext, useState, useEffect } from 'react';

export const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [customPlaybooks, setCustomPlaybooks] = useState({});
    
    // 🚨 FIX: We added the Customers state back!
    const [customers, setCustomers] = useState([]);
    
    const [activePhase, setActivePhase] = useState('home');
    const [activeProjectId, setActiveProjectId] = useState('none');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const fetchState = async () => {
            try {
                // 1. Load Projects from Postgres
                const res = await fetch('/api/erp/state');
                const data = await res.json();
                if (data.success && data.projects) {
                    setProjects(data.projects);
                }

                // 2. Load Playbooks & Customers from Memory/Local
                const savedPb = localStorage.getItem('cac_erp_playbooks');
                if (savedPb) setCustomPlaybooks(JSON.parse(savedPb));

                const savedCust = localStorage.getItem('cac_erp_customers');
                if (savedCust) setCustomers(JSON.parse(savedCust));
                
                setIsLoaded(true);
            } catch (err) {
                console.error("CRITICAL: Failed to connect to PostgreSQL:", err);
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

        // Auto-generate a customer when a new project is created
        const custName = newProject.name.split('-')[0].trim();
        if (!customers.find(c => c.name === custName)) {
            const newCust = { id: Date.now(), name: custName, ak: '', sk: '', region: 'la-south-2' };
            const updatedCusts = [...customers, newCust];
            setCustomers(updatedCusts);
            localStorage.setItem('cac_erp_customers', JSON.stringify(updatedCusts));
        }
    };

    // 🚨 FIX: Handlers for updating Customers
    const handleUpdateCustomer = (updatedCustomer) => {
        const newCusts = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
        setCustomers(newCusts);
        localStorage.setItem('cac_erp_customers', JSON.stringify(newCusts));
    };

    const handleDeleteCustomer = (id) => {
        const newCusts = customers.filter(c => c.id !== id);
        setCustomers(newCusts);
        localStorage.setItem('cac_erp_customers', JSON.stringify(newCusts));
    };

    if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">Connecting to PostgreSQL...</div>;

    return (
        <ERPContext.Provider value={{
            projects,
            customers,            // <-- Passed down to directory
            activePhase,
            activeProjectId,
            customPlaybooks,
            setActivePhase,
            setActiveProjectId,
            setCustomPlaybooks: (pb) => { setCustomPlaybooks(pb); localStorage.setItem('cac_erp_playbooks', JSON.stringify(pb)); },
            handleUpdateProject,
            handleAddProject,
            handleUpdateCustomer, // <-- Passed down to directory
            handleDeleteCustomer  // <-- Passed down to directory
        }}>
            {children}
        </ERPContext.Provider>
    );
};
