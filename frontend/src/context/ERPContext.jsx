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
            // TODO: Add customers fetch when endpoint is available
            // if (data.customers) setCustomers(data.customers);
        } catch (error) { console.error("Failed to fetch state", error); }
    };

    // Placeholder functions for customer operations
    const onUpdateCustomer = async (customerData) => {
        console.log('Updating customer:', customerData);
        // TODO: Implement API call to update customer
        // For now, update local state
        setCustomers(customers.map(c => c.id === customerData.id ? customerData : c));
    };

    const onDeleteCustomer = async (customerId) => {
        console.log('Deleting customer:', customerId);
        // TODO: Implement API call to delete customer
        // For now, update local state
        if (window.confirm('Are you sure you want to delete this customer?')) {
            setCustomers(customers.filter(c => c.id !== customerId));
        }
    };

    useEffect(() => { fetchState(); }, []);

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
            fetchState,
            onUpdateCustomer,
            onDeleteCustomer
        }}>
            {children}
        </ERPContext.Provider>
    );
};