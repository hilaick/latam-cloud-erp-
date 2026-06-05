import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell } from '../../utils/helpers'; 
import TwoFactorModal from '../utils/TwoFactorModal';

export default function PreSalesRadar() {
    // 🚨 ADDED handleAddCustomer so we can auto-create missing customers in the CRM
    const { projects, customers, handleAddProject, handleUpdateProject, handleDeleteProject, handleAddCustomer } = useContext(ERPContext);
    const waitingProjects = (projects || []).filter(p => p && p.isWaiting);
    
    const [newLeadCustomer, setNewLeadCustomer] = useState("");
    const [newLeadName, setNewLeadName] = useState(""); 
    const [newLeadCountry, setNewLeadCountry] = useState("");
    const [newLeadSA, setNewLeadSA] = useState(""); 
    const [isPoC, setIsPoC] = useState(false);

    const [expanded, setExpanded] = useState({ prospect: true, sizing: true, ready: true });
    
    const [editingProject, setEditingProject] = useState(null);
    const [projectToDelete, setProjectToDelete] = useState(null);

    const targetCountries = [
        "Mexico", "Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica", "Panama",
        "Colombia", "Venezuela", "Ecuador", "Peru", "Bolivia", "Chile", "Argentina", "Uruguay", "Paraguay", "Brazil",
        "Dominican Republic", "Haiti", "Cuba", "Jamaica", "Puerto Rico", "Trinidad and Tobago", "Bahamas", "Barbados", 
        "Dominica", "Grenada", "Saint Lucia", "Saint Vincent and the Grenadines", "Antigua and Barbuda", "Saint Kitts and Nevis",
        "Guyana", "Suriname", "French Guiana", "Guadeloupe", "Martinique", "Curaçao", "Aruba", "Bonaire", "Sint Maarten",
        "Saba", "Sint Eustatius", "Cayman Islands", "Turks and Caicos Islands", "British Virgin Islands", "US Virgin Islands",
        "Anguilla", "Montserrat", "Bermuda", "Other / TBD"
    ];

    const handleAddNewLead = () => { 
        if(!newLeadName || !newLeadSA || !newLeadCountry || !newLeadCustomer) return alert("Project Name, Customer, Target Country, and SA are required."); 
        
        const customerNameTrimmed = newLeadCustomer.trim();
        const matchedCustomer = (customers || []).find(c => c.name.toLowerCase() === customerNameTrimmed.toLowerCase());
        
        let finalCustomerId = matchedCustomer ? matchedCustomer.id : String(Date.now() + 1);

        // 🚨 NEW LOGIC: Auto-create customer in the Vault if they don't exist yet
        if (!matchedCustomer && handleAddCustomer) {
            handleAddCustomer({
                id: finalCustomerId,
                name: customerNameTrimmed,
                region: 'la-south-2' // Default
            });
        }

        handleAddProject({
            id: String(Date.now()), 
            name: newLeadName, 
            customerName: customerNameTrimmed, 
            customerId: finalCustomerId, 
            isWaiting: true, 
            waitingStage: "prospect", 
            health: "Yellow", 
            mrr: 0, 
            sa: newLeadSA, 
            country: newLeadCountry, 
            partner: "TBD", 
            techContact: "TBD", 
            blocker: "", 
            lifecycleState: '1_arb', 
            progress: '0%', 
            project_type: isPoC ? 'poc' : 'standard', 
            pocCap: isPoC ? 1000 : null, 
            pocTtl: isPoC ? '' : null, 
            discoveryStatus: "Not Started", 
            sizingStatus: "Not Started", 
            complexityLevel: "Medium"
        }); 
        setNewLeadCustomer(""); setNewLeadName(""); setNewLeadSA(""); setNewLeadCountry(""); setIsPoC(false);
    };

    const handleSaveAssessment = () => {
        let finalProject = { ...editingProject };
        
        // Ensure changes to customer name in deep edit auto-create CRM profiles too
        if (finalProject.customerName) {
            const customerNameTrimmed = finalProject.customerName.trim();
            const matched = (customers || []).find(c => c.name.toLowerCase() === customerNameTrimmed.toLowerCase());
            
            if (matched) {
                finalProject.customerId = matched.id;
            } else if (handleAddCustomer) {
                const newId = String(Date.now() + 1);
                handleAddCustomer({ id: newId, name: customerNameTrimmed, region: 'la-south-2' });
                finalProject.customerId = newId;
            }
        }

        handleUpdateProject(finalProject.id, finalProject);
        setEditingProject(null);
    };

    const executeDelete = () => {
        if (projectToDelete) { handleDeleteProject(projectToDelete); setProjectToDelete(null); setEditingProject(null); }
    };
    
    const cols = [
        { id: 'prospect', title: 'Early Prospect', color: 'border-slate-300 bg-slate-50' }, 
        { id: 'sizing', title: 'Discovery & Sizing', color: 'border-blue-300 bg-blue-50/50' }, 
        { id: 'ready', title: 'Ready for ARB Intake', color: 'border-purple-300 bg-purple-50/50' }
    ];

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12 relative">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-black text-sm uppercase tracking-widest
