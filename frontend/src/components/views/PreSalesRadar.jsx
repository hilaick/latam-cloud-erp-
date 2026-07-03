import React, { useState, useContext, useMemo } from 'react';
import { ERPContext } from '../../context/ERPContext';
import TwoFactorModal from '../utils/TwoFactorModal';

/**
 * 🎯 Hybrid Presales Qualification Wizard (Card -> Tab -> Accordion)
 * Clean multi-select handler mapped to the 3-stage delivery pipeline.
 */
function HybridPresalesWizard({ triage, setTriage }) {
    const [currentStage, setCurrentStage] = useState(1);
    const [expanded, setExpanded] = useState({
        'eng-type': true, 'drivers': true, 
        'res-type': true, 'src-env': true, 
        'del-scope': true, 'auth': true
    });

    const toggle = (sec) => setExpanded({ ...expanded, [sec]: !expanded[sec] });

    const handleMulti = (field, val) => {
        const arr = Array.isArray(triage[field]) ? triage[field] : (triage[field] ? [triage[field]] : []);
        setTriage({ ...triage, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] });
    };

    const handleSingle = (field, val) => {
        setTriage({ ...triage, [field]: val });
    };

    return (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden mb-6">
            {/* 1. Overall Structure: Card-Based Wizard (Macro Level) */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <h3 className="font-black text-slate-800 tracking-widest text-sm uppercase">
                    <i className="fas fa-bullseye text-blue-500 mr-2"></i> Presales Qualification Matrix
                </h3>
                <div className="flex gap-2 items-center w-full md:w-auto">
                    <div onClick={() => setCurrentStage(1)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest cursor-pointer rounded-lg transition-colors ${currentStage === 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>1. Early Prospect</div>
                    <div onClick={() => setCurrentStage(2)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest cursor-pointer rounded-lg transition-colors ${currentStage === 2 ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>2. Discovery</div>
                    <div onClick={() => setCurrentStage(3)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest cursor-pointer rounded-lg transition-colors ${currentStage === 3 ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>3. ARB Intake</div>
                </div>
            </div>

            <div className="p-6 bg-slate-50/50">
                {/* Stage 1: Early Prospects */}
                {currentStage === 1 && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-slate-100/50 p-4 flex justify-between items-center cursor-pointer border-b border-slate-100" onClick={() => toggle('eng-type')}>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest"><i className="fas fa-project-diagram text-blue-500 mr-2"></i> Engagement Type (Project Strategy)</span>
                                <i className={`fas fa-chevron-${expanded['eng-type'] ? 'up' : 'down'} text-slate-400`}></i>
                            </div>
                            {expanded['eng-type'] && (
                                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { id: 'standard', label: 'Standard Migration', icon: 'fa-truck-moving' },
                                        { id: 'greenfield', label: 'Greenfield', icon: 'fa-leaf' },
                                        { id: 'poc', label: 'Proof of Concept', icon: 'fa-bolt' },
                                        { id: 'expansion', label: 'Expansion Phase 2+', icon: 'fa-expand-arrows-alt' }
                                    ].map(opt => (
                                        <div key={opt.id} onClick={() => handleSingle('project_type', opt.id)} className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col items-center justify-center gap-3 text-center transition-all ${triage.project_type === opt.id || (Array.isArray(triage.project_type) && triage.project_type.includes(opt.id)) ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm scale-[1.02]' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}>
                                            <i className={`fas ${opt.icon} text-xl`}></i>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-slate-100/50 p-4 flex justify-between items-center cursor-pointer border-b border-slate-100" onClick={() => toggle('drivers')}>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest"><i className="fas fa-chart-line text-emerald-500 mr-2"></i> Business Drivers (Multi-Select)</span>
                                <i className={`fas fa-chevron-${expanded['drivers'] ? 'up' : 'down'} text-slate-400`}></i>
                            </div>
                            {expanded['drivers'] && (
                                <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['Cost Reduction', 'Hardware Refresh', 'Security & Compliance', 'DC Exit', 'Innovation & AI', 'Scalability'].map(opt => (
                                        <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${((triage.businessDrivers || []).includes(opt)) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={(triage.businessDrivers || []).includes(opt)} onChange={() => handleMulti('businessDrivers', opt)} className="rounded text-emerald-600 w-4 h-4 focus:ring-emerald-500" />
                                            <span className={`text-xs font-bold ${((triage.businessDrivers || []).includes(opt)) ? 'text-emerald-800' : 'text-slate-600'}`}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Stage 2: Discovery & Sizing */}
                {currentStage === 2 && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-slate-100/50 p-4 flex justify-between items-center cursor-pointer border-b border-slate-100" onClick={() => toggle('res-type')}>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest"><i className="fas fa-server text-indigo-500 mr-2"></i> Resource Types (Multi-Select)</span>
                                <i className={`fas fa-chevron-${expanded['res-type'] ? 'up' : 'down'} text-slate-400`}></i>
                            </div>
                            {expanded['res-type'] && (
                                <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['compute', 'storage', 'database', 'network', 'security', 'analytics'].map(opt => (
                                        <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${((triage.migrationScope || []).includes(opt)) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={(triage.migrationScope || []).includes(opt)} onChange={() => handleMulti('migrationScope', opt)} className="rounded text-indigo-600 w-4 h-4 focus:ring-indigo-500" />
                                            <span className={`text-xs font-bold uppercase tracking-widest ${((triage.migrationScope || []).includes(opt)) ? 'text-indigo-800' : 'text-slate-600'}`}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-slate-100/50 p-4 flex justify-between items-center cursor-pointer border-b border-slate-100" onClick={() => toggle('src-env')}>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest"><i className="fas fa-cloud text-sky-500 mr-2"></i> Source Environments (Multi-Select)</span>
                                <i className={`fas fa-chevron-${expanded['src-env'] ? 'up' : 'down'} text-slate-400`}></i>
                            </div>
                            {expanded['src-env'] && (
                                <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['VMware', 'Hyper-V', 'AWS EC2', 'Azure VMs', 'GCP Compute', 'On-Premise Bare Metal', 'Other Cloud'].map(opt => (
                                        <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${((triage.sourceEnvironment || []).includes(opt)) ? 'bg-sky-50 border-sky-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={(triage.sourceEnvironment || []).includes(opt)} onChange={() => handleMulti('sourceEnvironment', opt)} className="rounded text-sky-600 w-4 h-4 focus:ring-sky-500" />
                                            <span className={`text-xs font-bold uppercase tracking-widest ${((triage.sourceEnvironment || []).includes(opt)) ? 'text-sky-800' : 'text-slate-600'}`}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Stage 3: ARB Intake */}
                {currentStage === 3 && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-slate-100/50 p-4 flex justify-between items-center cursor-pointer border-b border-slate-100" onClick={() => toggle('del-scope')}>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest"><i className="fas fa-hands-helping text-purple-500 mr-2"></i> Delivery Scope</span>
                                <i className={`fas fa-chevron-${expanded['del-scope'] ? 'up' : 'down'} text-slate-400`}></i>
                            </div>
                            {expanded['del-scope'] && (
                                <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {[
                                        { id: 'turnkey', label: 'Turnkey Migration' },
                                        { id: 'co_delivery', label: 'Co-Delivery' },
                                        { id: 'advisory', label: 'Advisory Only' },
                                        { id: 'arch_review', label: 'Arch Review' },
                                        { id: 'security', label: 'Security / SecOps' },
                                        { id: 'post_live', label: 'Post-Live Support' }
                                    ].map(opt => (
                                        <div key={opt.id} onClick={() => handleSingle('deliveryScope', opt.id)} className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-center text-center transition-all ${triage.deliveryScope === opt.id ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm scale-[1.02]' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-slate-100/50 p-4 flex justify-between items-center cursor-pointer border-b border-slate-100" onClick={() => toggle('auth')}>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest"><i className="fas fa-key text-rose-500 mr-2"></i> Authorization Level (Multi-Select)</span>
                                <i className={`fas fa-chevron-${expanded['auth'] ? 'up' : 'down'} text-slate-400`}></i>
                            </div>
                            {expanded['auth'] && (
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Read-Only (Customer Managed)', 'Full Admin (Partner Managed)', 'Co-Managed (Federated)', 'No Access (Advisory Only)'].map(opt => (
                                        <label key={opt} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${((triage.authLevel || []).includes(opt)) ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={(triage.authLevel || []).includes(opt)} onChange={() => handleMulti('authLevel', opt)} className="rounded text-rose-600 w-4 h-4 focus:ring-rose-500" />
                                            <span className={`text-xs font-bold uppercase tracking-widest ${((triage.authLevel || []).includes(opt)) ? 'text-rose-800' : 'text-slate-600'}`}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="bg-slate-900 p-4 flex justify-between items-center rounded-b-xl">
                <button onClick={() => setCurrentStage(Math.max(1, currentStage - 1))} disabled={currentStage === 1} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white disabled:opacity-30 transition-colors"><i className="fas fa-arrow-left mr-2"></i> Back</button>
                <div className="flex gap-2">
                    <div className={`w-2 h-2 rounded-full transition-colors ${currentStage >= 1 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-slate-700'}`}></div>
                    <div className={`w-2 h-2 rounded-full transition-colors ${currentStage >= 2 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-slate-700'}`}></div>
                    <div className={`w-2 h-2 rounded-full transition-colors ${currentStage >= 3 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-slate-700'}`}></div>
                </div>
                <button onClick={() => setCurrentStage(Math.min(3, currentStage + 1))} disabled={currentStage === 3} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-blue-400 hover:text-white disabled:opacity-30 transition-colors">Next Stage <i className="fas fa-arrow-right ml-2"></i></button>
            </div>
        </div>
    );
}

export default function PreSalesRadar() {
    const { projects, customers, handleAddProject, handleUpdateProject, handleDeleteProject } = useContext(ERPContext);
    const waitingProjects = (projects || []).filter(p => p && p.isWaiting);
    
    const uniqueSAs = useMemo(() => Array.from(new Set((projects || []).map(p => p.sa).filter(Boolean))), [projects]);
    const uniquePartners = useMemo(() => Array.from(new Set((projects || []).map(p => p.partner).filter(Boolean))), [projects]);

    const [newLeadCustomer, setNewLeadCustomer] = useState("");
    const [newLeadName, setNewLeadName] = useState(""); 
    const [newLeadCountry, setNewLeadCountry] = useState("");
    const [newLeadSA, setNewLeadSA] = useState(""); 
    
    // Triage State for New Lead via Hybrid Wizard
    const [triage, setTriage] = useState({
        project_type: 'standard',
        businessDrivers: [],
        migrationScope: ['compute'],
        sourceEnvironment: ['VMware / On-Premise'],
        authLevel: ['Read-Only (Customer Managed)'],
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
        
        const matchedCustomer = (customers || []).find(c => c.name.toLowerCase() === newLeadCustomer.toLowerCase().trim());
        let customerId = null;
        let customerName = newLeadCustomer.trim().toUpperCase();
        if (matchedCustomer) { customerId = matchedCustomer.id; customerName = matchedCustomer.name; } 

        const isGreenfield = Array.isArray(triage.project_type) ? triage.project_type.includes('greenfield') : triage.project_type === 'greenfield';
        const isPoC = Array.isArray(triage.project_type) ? triage.project_type.includes('poc') : triage.project_type === 'poc';
        
        // Parse arrays to strings for database compatibility
        const migrationScopeValue = Array.isArray(triage.migrationScope) ? (triage.migrationScope.length > 0 ? triage.migrationScope : (isGreenfield ? [] : ['compute'])) : [triage.migrationScope];
        const authLevelValue = Array.isArray(triage.authLevel) ? (triage.authLevel.length > 0 ? triage.authLevel : (isGreenfield ? [] : ['Read-Only (Customer Managed)'])) : [triage.authLevel];
        const sourceEnvValue = isGreenfield ? "Greenfield / Cloud Native" : (Array.isArray(triage.sourceEnvironment) ? triage.sourceEnvironment.join(', ') : triage.sourceEnvironment);

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
            sourceEnvironment: sourceEnvValue, 
            authLevel: authLevelValue,
            migrationScope: isGreenfield ? "N/A" : migrationScopeValue,
            deliveryScope: triage.deliveryScope, 
            businessDrivers: triage.businessDrivers,
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
            project_type: 'standard', businessDrivers: [], migrationScope: ['compute'], 
            sourceEnvironment: ['VMware / On-Premise'], authLevel: ['Read-Only (Customer Managed)'], deliveryScope: 'turnkey' 
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 border-b border-slate-100 pb-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Customer Account *</label>
                        <div className="relative">
                            <input 
                                type="text" list="new-lead-customers" value={newLeadCustomer} 
                                onChange={e => setNewLeadCustomer(e.target.value)}
                                placeholder="Type to search or enter new..."
                                className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-white outline-none focus:border-blue-500 font-bold uppercase pr-10"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400"><i className="fas fa-chevron-down"></i></div>
                        </div>
                        <datalist id="new-lead-customers">{(customers || []).map(c => <option key={c.id} value={c.name} />)}</datalist>
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
                
                {/* 🚨 THE NEW WIZARD COMPONENT 🚨 */}
                <HybridPresalesWizard triage={triage} setTriage={setTriage} />

                <div className="flex justify-end items-center pt-6 mt-6 border-t border-slate-100">
                    <button onClick={handleAddNewLead} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl text-xs transition-colors shadow-lg shadow-blue-600/30">
                        <i className="fas fa-plus mr-2"></i> Add Lead & Configure Pipeline
                    </button>
                </div>
            </div>
            
            {/* Column Rendering Pipeline (No changes here, remains robust) */}
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
                                                type="text" list="edit-customers" value={editingProject.customerName || ''} 
                                                onChange={e => { 
                                                    const selectedName = e.target.value.toUpperCase(); 
                                                    const matched = (customers || []).find(c => c.name.toLowerCase() === selectedName.toLowerCase().trim());
                                                    setEditingProject({ ...editingProject, customerName: selectedName, customerId: matched ? matched.id : null }); 
                                                }} 
                                                className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:border-blue-500 outline-none text-xs font-bold uppercase pr-10"
                                            />
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400"><i className="fas fa-chevron-down"></i></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project Name (Scope)</label>
                                        <input type="text" value={editingProject.name || ''} onChange={e=>setEditingProject({...editingProject, name: e.target.value.toUpperCase()})} className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:border-blue-500 outline-none text-xs font-bold uppercase" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2"><i className="fas fa-random text-blue-500 mr-2"></i> Hybrid Wizard Triage</h4>
                                {/* Recycles the new component inside the edit modal for continuity */}
                                <HybridPresalesWizard 
                                    triage={{
                                        project_type: Array.isArray(editingProject.project_type) ? editingProject.project_type : (editingProject.project_type ? [editingProject.project_type] : ['standard']),
                                        migrationScope: Array.isArray(editingProject.migrationScope) ? editingProject.migrationScope : (editingProject.migrationScope ? [editingProject.migrationScope] : ['compute']),
                                        sourceEnvironment: Array.isArray(editingProject.sourceEnvironment) ? editingProject.sourceEnvironment : (editingProject.sourceEnvironment ? [editingProject.sourceEnvironment] : ['VMware / On-Premise']),
                                        authLevel: Array.isArray(editingProject.authLevel) ? editingProject.authLevel : (editingProject.authLevel ? [editingProject.authLevel] : ['Read-Only (Customer Managed)']),
                                        deliveryScope: editingProject.deliveryScope || 'turnkey',
                                        businessDrivers: editingProject.businessDrivers || []
                                    }} 
                                    setTriage={(newTriage) => setEditingProject({...editingProject, ...newTriage})} 
                                />
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-5">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4 border-b border-slate-100 pb-2"><i className="fas fa-cogs text-purple-500 mr-2"></i> Technical Sizing</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Workloads (VMs)</label><input type="number" value={editingProject.estimatedWorkloads || ''} onChange={e=>setEditingProject({...editingProject, estimatedWorkloads: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold bg-slate-50" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Est. Labor (hrs)</label><input type="number" value={editingProject.estimatedMigrationHours || ''} onChange={e=>setEditingProject({...editingProject, estimatedMigrationHours: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold bg-slate-50" /></div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Complexity</label>
                                        <select value={editingProject.complexityLevel || 'Medium'} onChange={e=>setEditingProject({...editingProject, complexityLevel: e.target.value})} className="w-full p-2 border border-purple-300 rounded focus:border-purple-500 outline-none text-sm font-bold bg-purple-50 text-purple-900 cursor-pointer">
                                            <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Ultra-High">Ultra-High</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
                            <button onClick={()=>setEditingProject(null)} className="px-6 py-3 text-xs font-black text-slate-600 uppercase bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={()=>{ handleUpdateProject(editingProject.id, editingProject); setEditingProject(null); }} className="px-8 py-3 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"><i className="fas fa-save mr-2"></i> Save Assessment</button>
                        </div>
                    </div>
                </div>
            )}

            {projectToDelete && <TwoFactorModal actionName={`Delete Lead`} onConfirm={executeDelete} onCancel={() => setProjectToDelete(null)} />}
        </div>
    )
}
