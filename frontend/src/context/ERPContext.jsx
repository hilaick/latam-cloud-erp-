import React, { createContext, useState, useEffect } from 'react';

export const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [activePhase, setActivePhase] = useState('home');
    const [activeProjectId, setActiveProjectId] = useState('none');
    const [isLoading, setIsLoading] = useState(true);

    const fetchState = async () => {
        try {
            setIsLoading(true);
            const [projectsRes, customersRes] = await Promise.all([
                fetch('/api/erp/projects'),
                fetch('/api/erp/customers')
            ]);
            
            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                setProjects(projectsData);
            }
            
            if (customersRes.ok) {
                const customersData = await customersRes.json();
                setCustomers(customersData);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchState();
        
        // Restore active phase from localStorage
        const savedPhase = localStorage.getItem('erp_activePhase');
        const savedProjectId = localStorage.getItem('erp_activeProjectId');
        
        if (savedPhase) setActivePhase(savedPhase);
        if (savedProjectId) setActiveProjectId(savedProjectId);
    }, []);

    useEffect(() => {
        localStorage.setItem('erp_activePhase', activePhase);
    }, [activePhase]);

    useEffect(() => {
        localStorage.setItem('erp_activeProjectId', activeProjectId);
    }, [activeProjectId]);

    const value = {
        projects,
        customers,
        activePhase,
        setActivePhase,
        activeProjectId,
        setActiveProjectId,
        fetchState,
        isLoading
    };

    return (
        <ERPContext.Provider value={value}>
            {children}
        </ERPContext.Provider>
    );
};