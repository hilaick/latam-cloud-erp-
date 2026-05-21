import React, { createContext, useState, useEffect } from 'react';

export const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [activePhase, setActivePhase] = useState(() => localStorage.getItem('erp_activePhase') || 'home');
    const [activeProjectId, setActiveProjectId] = useState(() => localStorage.getItem('erp_activeProject') || "none");

    useEffect(() => { localStorage.setItem('erp_activePhase', activePhase); }, [activePhase]);
    useEffect(() => { localStorage.setItem('erp_activeProject', activeProjectId); }, [activeProjectId]);

    const fetchState = async () => {
        try {
            const res = await fetch('/api/erp/state');
            const data = await res.json();
            if (data.projects) setProjects(data.projects);
            if (data.customers) setCustomers(data.customers);
        } catch (error) { 
            console.error("Failed to fetch state", error); 
        }
    };

    useEffect(() => { 
        fetchState(); 
    }, []);

    return (
        <ERPContext.Provider value={{ 
            projects, 
            setProjects, 
            customers, 
            setCustomers, 
            activePhase, 
            setActivePhase, 
            activeProjectId, 
            setActiveProjectId, 
            fetchState 
        }}>
            {children}
        </ERPContext.Provider>
    );
};