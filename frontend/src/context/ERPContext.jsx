import React, { createContext, useState, useEffect } from 'react';

export const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [customPlaybooks, setCustomPlaybooks] = useState({});
    const [activePhase, setActivePhase] = useState('home');
    const [activeProjectId, setActiveProjectId] = useState('none');
    const [isLoaded, setIsLoaded] = useState(false);

    // 1. INITIAL LOAD FROM POSTGRESQL
    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await fetch('/api/erp/state');
                const data = await res.json();
                if (data.success && data.projects) {
                    setProjects(data.projects);
                }
                // If you build a /api/erp/playbooks endpoint later, fetch it here.
                // For now, we load playbooks from memory/local to prevent crash.
                const savedPb = localStorage.getItem('cac_erp_playbooks');
                if (savedPb) setCustomPlaybooks(JSON.parse(savedPb));
                
                setIsLoaded(true);
            } catch (err) {
                console.error("CRITICAL: Failed to connect to PostgreSQL:", err);
            }
        };
        fetchState();
    }, []);

    // 2. BACKGROUND POSTGRESQL SYNC ON EVERY UPDATE
    const handleUpdateProject = (id, field, value) => {
        setProjects(prevProjects => {
            // Update React State instantly for snappy UI
            const updatedProjects = prevProjects.map(p => String(p.id) === String(id) ? { ...p, [field]: value } : p);
            const modifiedProject = updatedProjects.find(p => String(p.id) === String(id));

            // Fire and forget to PostgreSQL backend
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
    };

    if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">Connecting to PostgreSQL...</div>;

    return (
        <ERPContext.Provider value={{
            projects,
            activePhase,
            activeProjectId,
            customPlaybooks,
            setActivePhase,
            setActiveProjectId,
            setCustomPlaybooks: (pb) => { setCustomPlaybooks(pb); localStorage.setItem('cac_erp_playbooks', JSON.stringify(pb)); },
            handleUpdateProject,
            handleAddProject
        }}>
            {children}
        </ERPContext.Provider>
    );
};
