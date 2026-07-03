import React, { useState, useContext, useMemo } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell, PreSalesQualificationMatrix } from '../../utils/helpers'; 
import TwoFactorModal from '../utils/TwoFactorModal';

export default function PreSalesRadar() {
    const { projects, customers, handleAddProject, handleUpdateProject, handleDeleteProject } = useContext(ERPContext);
    const waitingProjects = (projects || []).filter(p => p && p.isWaiting);
    
    const uniqueSAs = useMemo(() => Array.from(new Set((projects || []).map(p => p.sa).filter(Boolean))), [projects]);
    const uniquePartners = useMemo(() => Array.from(new Set((projects || []).map(p => p.partner).filter(Boolean))), [projects]);

    const [newLeadCustomer, setNewLeadCustomer] = useState("");
    const [newLeadName, setNewLeadName] = useState(""); 
    const [newLeadCountry, setNewLeadCountry] = useState("");
    const [newLeadSA, setNewLeadSA] = useState(""); 
    
    // Triage State for New Lead (Includes Delivery Scope)
    const [triage, setTriage] = useState({
        project_type: 'standard',
        migrationScope: 'compute',
        sourceEnvironment: 'VMware / On-Premise',
        authLevel: 'Read-Only (Customer Managed)',
        deliveryScope: 'turnkey' 
    });

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
        if(!newLeadName || !newLeadSA || !newLeadCountry || !newLeadCustomer) return alert("Project Name, Customer Account, Target Country, and SA are required."); 
        
        // Try to find a matching customer (case-insensitive, partial match)
        const matchedCustomer = (customers || []).find(c => 
            c.name.toLowerCase() === newLeadCustomer.toLowerCase().trim()
        );
        
        // If no exact match, check for partial matches
        let customerId = null;
        let customerName = newLeadCustomer.trim().toUpperCase();
        
        if (matchedCustomer) {
            customerId = matchedCustomer.id;
            customerName = matchedCustomer.name; // Use the canonical name from database
        } else {
            // No matching customer found - this will create a new customer entry
            // The backend should handle creating the customer if needed
            console.log('Creating project with new customer:', customerName);
        }

        const isGreenfield = Array.isArray(triage.project_type) ? triage.project_type.includes('greenfield') : triage.project_type === 'greenfield';
        const isPoC = Array.isArray(triage.project_type) ? triage.project_type.includes('poc') : triage.project_type === 'poc';
        
        // Handle array values for migrationScope and authLevel
        const migrationScopeValue = Array.isArray(triage.migrationScope) ? 
            (triage.migrationScope.length > 0 ? triage.migrationScope : (isGreenfield ? [] : ['compute'])) : 
            triage.migrationScope;
            
        const authLevelValue = Array.isArray(triage.authLevel) ? 
            (triage.authLevel.length > 0 ? triage.authLevel : (isGreenfield ? [] : ['Read-Only (Customer Managed)'])) : 
            triage.authLevel;

        handleAddProject({
            id: String(Date.now()), 
            name: newLeadName.toUpperCase(), 
            customerName: customerName,
            customerId: customerId, 
            isWaiting: true, 
            waitingStage: "prospect", 
            health: "Yellow", 
            mrr: 0, 
            sa: newLeadSA.toUpperCase(), 
            country: newLeadCountry, 
            partner: "TBD", 
            techContact: "TBD", 
            sourceEnvironment: isGreenfield ? "Greenfield / Cloud Native" : triage.sourceEnvironment, 
            authLevel: authLevelValue,
            migrationScope: isGreenfield ? "N/A" : migrationScopeValue,
            deliveryScope: triage.deliveryScope, 
            estimatedWorkloads: 0,
            estimatedMigrationHours: 0,
            blocker: "", 
            lifecycleState: '1_arb', 
            progress: '0%', 
            project_type: triage.project_type, 
            pocCap: isPoC ? 1000 : null, 
            pocTtl: isPoC ? '' : null, 
            discoveryStatus: "Not Started", 
            sizingStatus: "Not Started", 
            complexityLevel: "Medium"
        }); 
        
        setNewLeadCustomer(""); setNewLeadName(""); setNewLeadSA(""); setNewLeadCountry(""); 
        setTriage({ 
            project_type: Array.isArray(triage.project_type) ? ['standard'] : 'standard', 
            migrationScope: Array.isArray(triage.migrationScope) ? ['compute'] : 'compute', 
            sourceEnvironment: 'VMware / On-Premise', 
            authLevel: Array.isArray(triage.authLevel) ? ['Read-Only (Customer Managed)'] : 'Read-Only (Customer Managed)', 
            deliveryScope: 'turnkey' 
        });
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
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 flex items-center"><i className="fas fa-satellite-dish text-blue-500 mr-3 text-lg"></i> Pre-Sales Qualification Matrix</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 border-b border-slate-100 pb-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Customer Account *</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                list="new-lead-customers" 
                                value={newLeadCustomer} 
                                onChange={e => {
                                    const value = e.target.value;
                                    setNewLeadCustomer(value);
                                    // Try to find a matching customer
                                    const matchedCustomer = (customers || []).find(c => 
                                        c.name.toLowerCase().includes(value.toLowerCase().trim()) ||
                                        value.toLowerCase().trim().includes(c.name.toLowerCase())
                                    );
                                    if (matchedCustomer && value.toLowerCase() === matchedCustomer.name.toLowerCase()) {
                                        // Exact match found
                                        console.log('Matched customer:', matchedCustomer.name, 'ID:', matchedCustomer.id);
                                    }
                                }}
                                placeholder="Type to search or enter new..."
                                className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-white outline-none focus:border-blue-500 font-bold uppercase pr-10"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                                <i className="fas fa-chevron-down"></i>
                            </div>
                        </div>
                        <datalist id="new-lead-customers">
                            {(customers || []).map(c => <option key={c.id} value={c.name} />)}
                        </datalist>
                        {newLeadCustomer && !(customers || []).some(c => c.name.toLowerCase() === newLeadCustomer.toLowerCase().trim()) && (
                            <div className="mt-1 text-[9px] text-amber-600 font-bold">
                                <i className="fas fa-exclamation-triangle mr-1"></i> New customer will be created
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Project Name *</label>
                        <input type="text" value={newLeadName} onChange={e=>setNewLeadName(e.target.value.toUpperCase())} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold uppercase" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Target Country *</label>
                        <select value={newLeadCountry} onChange={e=>setNewLeadCountry(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full outline-none font-bold bg-white"><option value="" disabled>-- Select --</option>{targetCountries.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Sales Architect *</label>
                        <input type="text" list="sa-list" value={newLeadSA} onChange={e=>setNewLeadSA(e.target.value.toUpperCase())} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold uppercase" />
                        <datalist id="sa-list">{uniqueSAs.map(sa => <option key={sa} value={sa} />)}</datalist>
                    </div>
                </div>
                
                <div className="overflow-x-auto pb-4">
                    <PreSalesQualificationMatrix triage={triage} setTriage={setTriage} />
                </div>

                <div className="flex justify-end items-center pt-6 mt-6 border-t border-slate-100">
                    <button onClick={handleAddNewLead} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl text-xs transition-colors shadow-md">
                        <i className="fas fa-plus mr-2"></i> Add Lead & Configure Pipeline
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {cols.map(col => {
                    const colProjects = waitingProjects.filter(p => p.waitingStage === col.id || (col.id==='prospect' && !p.waitingStage));
                    return (
                        <div key={col.id} className={`rounded-2xl border-2 flex flex-col transition-all duration-300 overflow-hidden ${col.color} ${expanded[col.id] ? 'h-auto lg:h-[750px]' : 'h-16'}`}>
                            <div className="p-5 border-b-2 border-inherit font-black text-sm text-slate-800 uppercase tracking-widest bg-white/60 backdrop-blur-sm flex justify-between items-center cursor-pointer" onClick={() => setExpanded(prev => ({...prev, [col.id]: !prev[col.id]}))}>
                                <div>{col.title} <span className="ml-3 bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] shadow-sm">{colProjects.length}</span></div><i className={`fas fa-chevron-${expanded[col.id] ? 'up' : 'down'} text-slate-400`}></i>
                            </div>
                            <div className={`p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar ${!expanded[col.id] ? 'hidden' : 'block'}`}>
                                {colProjects.map(p => (
                                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                        <div className="flex flex-col mb-4 border-b border-slate-100 pb-3 mt-2 gap-3">
                                            <div className="font-black text-base text-slate-800 leading-tight">
                                                <div className={`text-[10px] uppercase tracking-widest mb-1 ${p.customerId ? 'text-blue-600' : 'text-amber-500 font-bold'}`}>
                                                    {p.customerId ? <><i className="fas fa-shield-alt text-[9px] mr-1"></i> {p.customerName}</> : <><i className="fas fa-exclamation-triangle mr-1"></i> Account Unlinked</>}
                                                </div>
                                                <div className="uppercase">{p.name}</div> 
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {p.project_type === 'poc' && <span className="bg-amber-400 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-bolt mr-1"></i> PoC</span>}
                                                {p.project_type === 'greenfield' && <span className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-leaf mr-1"></i> Greenfield</span>}
                                                {p.project_type === 'standard' && <span className="bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-truck-moving mr-1"></i> Migration</span>}
                                                {p.project_type === 'expansion' && <span className="bg-purple-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-expand-arrows-alt mr-1"></i> Phase 2+</span>}
                                                
                                                {/* 🚨 Delivery Scope Badges */}
                                                {p.deliveryScope === 'advisory' && <span className="bg-slate-700 text-amber-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-chalkboard-teacher mr-1"></i> Advisory</span>}
                                                {p.deliveryScope === 'co_delivery' && <span className="bg-slate-700 text-blue-300 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-handshake mr-1"></i> Co-Delivery</span>}
                                                {p.deliveryScope === 'arch_review' && <span className="bg-slate-700 text-teal-300 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-sitemap mr-1"></i> Arch Review</span>}
                                                {p.deliveryScope === 'escalation' && <span className="bg-slate-700 text-rose-300 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-life-ring mr-1"></i> Escalation</span>}
                                                {p.deliveryScope === 'security' && <span className="bg-slate-700 text-emerald-300 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-shield-alt mr-1"></i> Security</span>}
                                                {p.deliveryScope === 'post_live' && <span className="bg-slate-700 text-indigo-300 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm inline-block"><i className="fas fa-chart-line mr-1"></i> Post-Live</span>}
                                            </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingProject({...p})} className="flex-1 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg border border-blue-200"><i className="fas fa-expand-arrows-alt mr-1"></i> Assess</button>
                                                <button onClick={() => setProjectToDelete(p.id)} className="text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-lg border border-rose-200"><i className="fas fa-trash-alt"></i></button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                                            <div className="text-[9px] font-bold text-slate-600 uppercase flex items-center bg-slate-50 p-1.5 rounded border border-slate-100 truncate" title="Sales Architect"><i className="fas fa-user-tie mr-1.5 text-slate-400"></i> {p.sa}</div>
                                            <div className="text-[9px] font-bold text-slate-600 uppercase flex items-center bg-slate-50 p-1.5 rounded border border-slate-100 truncate" title="Target Country"><i className="fas fa-globe-americas mr-1.5 text-slate-400"></i> {p.country}</div>
                                            <div className="col-span-2 lg:col-span-1 text-[9px] font-bold text-slate-600 uppercase flex items-center bg-slate-50 p-1.5 rounded border border-slate-100 truncate" title="Source Environment"><i className="fas fa-server mr-1.5 text-slate-400"></i> {p.sourceEnvironment || 'TBD'}</div>
                                        </div>
                                        
                                        {(col.id === 'sizing' || col.id === 'ready') && (
                                            <div className="space-y-4 border-t border-slate-100 pt-3 mt-3">
                                                <div className="flex justify-between items-center"><div className="text-sm font-black bg-emerald-50 text-emerald-800 px-3 py-1 rounded-lg border border-emerald-200">${p.mrr || 0} /mo</div><div className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded">Disc: {p.discoveryStatus || 'Pending'}</div></div>
                                            </div>
                                        )}
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                            {col.id === 'prospect' && <div className="w-full flex justify-end"><button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">Move <i className="fas fa-arrow-right ml-1"></i></button></div>}
                                            {col.id === 'sizing' && <><button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'prospect')} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"><i className="fas fa-arrow-left mr-1"></i> Back</button><button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'ready')} className="text-[10px] font-black uppercase bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">Ready <i className="fas fa-arrow-right ml-1"></i></button></>}
                                            {col.id === 'ready' && <><button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"><i className="fas fa-arrow-left mr-1"></i> Back</button><button onClick={()=>{handleUpdateProject(p.id, 'isWaiting', false); alert("Moved to Delivery Pipeline!");}} className="text-[10px] font-black uppercase bg-emerald-600 text-white px-4 py-2 rounded-lg">Start ARB <i className="fas fa-door-open ml-1"></i></button></>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* EDITING MODAL */}
            {editingProject && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col border border-slate-700 animate-slide-up">
                        <div className="bg-slate-900 px-8 py-5 rounded-t-2xl flex justify-between items-center text-white"><h3 className="font-black text-xl text-blue-400"><i className="fas fa-clipboard-list mr-3"></i> Pre-Sales Assessment</h3><button onClick={()=>setEditingProject(null)} className="text-slate-400 hover:text-white"><i className="fas fa-times"></i></button></div>
                        <div className="p-8 overflow-y-auto bg-slate-50 space-y-8">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2"><i className="fas fa-info-circle text-blue-500 mr-2"></i> Basic Information</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Customer Account</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                list="edit-customers" 
                                                value={editingProject.customerName || ''} 
                                                onChange={e => { 
                                                    const selectedName = e.target.value.toUpperCase(); 
                                                    const matched = (customers || []).find(c => c.name.toLowerCase() === selectedName.toLowerCase().trim());
                                                    setEditingProject({ ...editingProject, customerName: selectedName, customerId: matched ? matched.id : null }); 
                                                }} 
                                                className="w-full p-2 border border-slate-300 rounded bg-white focus:border-blue-500 outline-none text-sm font-bold uppercase pr-10"
                                            />
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                                                <i className="fas fa-chevron-down"></i>
                                            </div>
                                        </div>
                                        <datalist id="edit-customers">{(customers || []).map(c => <option key={c.id} value={c.name} />)}</datalist>
                                        {editingProject.customerName && !editingProject.customerId && (
                                            <div className="mt-1 text-[9px] text-amber-600 font-bold">
                                                <i className="fas fa-exclamation-triangle mr-1"></i> Customer not linked - will create new entry
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project Name (Scope)</label>
                                        <input type="text" value={editingProject.name || ''} onChange={e=>setEditingProject({...editingProject, name: e.target.value.toUpperCase()})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold uppercase" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 border-t border-slate-50 pt-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sales Architect</label>
                                        <input type="text" list="sa-list-edit" value={editingProject.sa || ''} onChange={e=>setEditingProject({...editingProject, sa: e.target.value.toUpperCase()})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold uppercase" />
                                        <datalist id="sa-list-edit">{uniqueSAs.map(sa => <option key={sa} value={sa} />)}</datalist>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Delivery Partner</label>
                                        <input type="text" list="partner-list-edit" value={editingProject.partner || ''} onChange={e=>setEditingProject({...editingProject, partner: e.target.value.toUpperCase()})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold uppercase" />
                                        <datalist id="partner-list-edit">{uniquePartners.map(pt => <option key={pt} value={pt} />)}</datalist>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2"><i className="fas fa-random text-blue-500 mr-2"></i> Pre-Sales Qualification</h4>
                                
                                <div className="overflow-x-auto pb-2">
                                    <PreSalesQualificationMatrix 
                                        triage={{
                                            project_type: Array.isArray(editingProject.project_type) ? editingProject.project_type : (editingProject.project_type ? [editingProject.project_type] : ['standard']),
                                            migrationScope: Array.isArray(editingProject.migrationScope) ? editingProject.migrationScope : (editingProject.migrationScope ? [editingProject.migrationScope] : ['compute']),
                                            sourceEnvironment: editingProject.sourceEnvironment || 'VMware / On-Premise',
                                            authLevel: Array.isArray(editingProject.authLevel) ? editingProject.authLevel : (editingProject.authLevel ? [editingProject.authLevel] : ['Read-Only (Customer Managed)']),
                                            deliveryScope: editingProject.deliveryScope || 'turnkey'
                                        }} 
                                        setTriage={(newTriage) => setEditingProject({...editingProject, ...newTriage})} 
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-5">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2"><i className="fas fa-cogs text-purple-500 mr-2"></i> Technical Sizing</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Workloads (VMs)</label><input type="number" value={editingProject.estimatedWorkloads || ''} onChange={e=>setEditingProject({...editingProject, estimatedWorkloads: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Est. Labor (hrs)</label><input type="number" value={editingProject.estimatedMigrationHours || ''} onChange={e=>setEditingProject({...editingProject, estimatedMigrationHours: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Complexity</label>
                                        <select value={editingProject.complexityLevel || 'Medium'} onChange={e=>setEditingProject({...editingProject, complexityLevel: e.target.value})} className="w-full p-2 border border-purple-300 rounded focus:border-purple-500 outline-none text-sm font-bold bg-purple-50 text-purple-900 cursor-pointer">
                                            <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Ultra-High">Ultra-High</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2"><i className="fas fa-search-dollar text-emerald-500 mr-2"></i> Discovery & Financials</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discovery Status</label><select value={editingProject.discoveryStatus || 'Not Started'} onChange={e=>setEditingProject({...editingProject, discoveryStatus: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold bg-white cursor-pointer"><option>Not Started</option><option>In Progress</option><option>Completed</option></select></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expected Close Date</label><input type="date" value={editingProject.expectedCloseDate || ''} onChange={e=>setEditingProject({...editingProject, expectedCloseDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold font-mono cursor-pointer" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Est. Target MRR (USD)</label><input type="number" value={editingProject.mrr === undefined || editingProject.mrr === null ? '' : editingProject.mrr} onChange={e=>setEditingProject({...editingProject, mrr: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full p-2 border border-emerald-300 rounded bg-emerald-50 text-emerald-900 focus:border-emerald-500 outline-none text-sm font-black" /></div>
                                </div>
                                <div className="space-y-4">
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discovery Notes / Scope Requirements</label><textarea rows="3" value={editingProject.discoveryNotes || ''} onChange={e=>setEditingProject({...editingProject, discoveryNotes: e.target.value})} className="w-full p-3 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-medium custom-scrollbar bg-slate-50"></textarea></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Blockers</label><textarea rows="2" value={editingProject.blocker || ''} onChange={e=>setEditingProject({...editingProject, blocker: e.target.value})} className="w-full p-3 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-medium custom-scrollbar bg-slate-50"></textarea></div>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
                            <button onClick={()=>setEditingProject(null)} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={()=>{ handleUpdateProject(editingProject.id, editingProject); setEditingProject(null); }} className="px-8 py-2.5 text-xs font-black text-white uppercase bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"><i className="fas fa-save mr-2"></i> Save Assessment</button>
                        </div>
                    </div>
                </div>
            )}

            {projectToDelete && <TwoFactorModal actionName={`Delete Lead`} onConfirm={executeDelete} onCancel={() => setProjectToDelete(null)} />}
        </div>
    )
}
