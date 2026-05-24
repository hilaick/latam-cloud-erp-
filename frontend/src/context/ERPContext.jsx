import React, { createContext, useState, useEffect } from 'react';

export const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [customPlaybooks, setCustomPlaybooks] = useState({});
    const [customers, setCustomers] = useState([]);
    
    const [activePhase, setActivePhase] = useState('home');
    const [activeProjectId, setActiveProjectId] = useState('none');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await fetch('/api/erp/state');
                const data = await res.json();
                if (data.success && data.projects) {
                    setProjects(data.projects);
                }

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

            // Sync to Postgres
            fetch('/api/erp/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(modifiedProject)
            }).catch(err => console.error("Postgres Sync Error:", err));

            // 🚨 THE FIX: Only generate the Customer Profile when the Lead enters the Master Pipeline
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
        // Sync to Postgres
        fetch('/api/erp/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProject)
        });
        // Notice we REMOVED customer generation from here!
    };

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
