import React, { useState, useContext, useMemo } from 'react';
import { ERPContext } from '../../context/ERPContext';
import TwoFactorModal from '../utils/TwoFactorModal';

/**
 * 🎯 5-Step Horizontal Sequential Qualification Matrix
 */
function HorizontalPresalesWizard({ triage, setTriage }) {
    const [currentStep, setCurrentStep] = useState(1);
    
    // Logic: Steps unlock sequentially, show "COMPLETED" badges
    const isCompleted = (step) => {
        if (step === 1) return !!triage.project_type && (triage.businessDrivers && triage.businessDrivers.length > 0);
        if (step === 2) return triage.migrationScope && triage.migrationScope.length > 0;
        if (step === 3) return triage.sourceEnvironment && triage.sourceEnvironment.length > 0;
        if (step === 4) return !!triage.deliveryScope;
        if (step === 5) return triage.authLevel && triage.authLevel.length > 0;
        return false;
    };

    const handleMulti = (field, val) => {
        const arr = Array.isArray(triage[field]) ? triage[field] : (triage[field] ? [triage[field]] : []);
        setTriage({ ...triage, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] });
    };

    const handleSingle = (field, val) => {
        setTriage({ ...triage, [field]: val });
    };

    const nextStep = () => {
        if (currentStep < 5) setCurrentStep(currentStep + 1);
    };

    return (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden mb-6">
            {/* Progress Indicator with steps 1-5 */}
            <div className="bg-slate-50 p-6 border-b border-slate-200">
                <div className="flex items-center justify-between relative max-w-4xl mx-auto">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0 rounded-full"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 z-0 rounded-full transition-all duration-300" style={{ width: `${((currentStep - 1) / 4) * 100}%` }}></div>
                    
                    {[
                        { num: 1, label: 'Engagement' },
                        { num: 2, label: 'Resources' },
                        { num: 3, label: 'Source Env' },
                        { num: 4, label: 'Delivery' },
                        { num: 5, label: 'Auth Level' }
                    ].map((step) => (
                        <div key={step.num} className="relative z-10 flex flex-col items-center gap-2" onClick={() => setCurrentStep(step.num)} style={{ cursor: 'pointer' }}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-colors ${currentStep === step.num ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : isCompleted(step.num) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {isCompleted(step.num) && currentStep !== step.num ? <i className="fas fa-check"></i> : step.num}
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-widest ${currentStep === step.num ? 'text-blue-600' : 'text-slate-500'}`}>{step.label}</div>
                            {isCompleted(step.num) && <div className="absolute -top-6 bg-emerald-100 text-emerald-700 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest">Completed</div>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-8 bg-slate-50/50 min-h-[300px]">
                {/* Step 1 */}
                {currentStep === 1 && (
                    <div className="animate-fade-in space-y-6">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest border-b border-slate-200 pb-2"><i className="fas fa-project-diagram text-blue-500 mr-2"></i> Select Engagement Type</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { id: 'standard', label: 'Standard Migration', icon: 'fa-truck-moving' },
                                { id: 'greenfield', label: 'Greenfield', icon: 'fa-leaf' },
                                { id: 'poc', label: 'Proof of Concept', icon: 'fa-bolt' },
                                { id: 'expansion', label: 'Expansion Phase 2+', icon: 'fa-expand-arrows-alt' }
                            ].map(opt => (
                                <div key={opt.id} onClick={() => handleSingle('project_type', opt.id)} className={`p-5 rounded-xl border-2 cursor-pointer flex flex-col items-center justify-center gap-3 text-center transition-all ${triage.project_type === opt.id ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                    <i className={`fas ${opt.icon} text-2xl`}></i>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                                </div>
                            ))}
                        </div>

                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest border-b border-slate-200 pb-2 mt-8"><i className="fas fa-chart-line text-emerald-500 mr-2"></i> Business Drivers (Select Multiple)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {['Cost Reduction', 'Hardware Refresh', 'Security & Compliance', 'DC Exit', 'Innovation & AI', 'Scalability'].map(opt => (
                                <label key={opt} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${((triage.businessDrivers || []).includes(opt)) ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={(triage.businessDrivers || []).includes(opt)} onChange={() => handleMulti('businessDrivers', opt)} className="rounded text-emerald-600 w-4 h-4" />
                                    <span className={`text-xs font-bold ${((triage.businessDrivers || []).includes(opt)) ? 'text-emerald-800' : 'text-slate-600'}`}>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                    <div className="animate-fade-in space-y-6">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest border-b border-slate-200 pb-2"><i className="fas fa-server text-indigo-500 mr-2"></i> Target Resource Types</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {['compute', 'storage', 'database', 'network', 'security', 'analytics'].map(opt => (
                                <label key={opt} className={`flex items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-colors ${((triage.migrationScope || []).includes(opt)) ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={(triage.migrationScope || []).includes(opt)} onChange={() => handleMulti('migrationScope', opt)} className="rounded text-indigo-600 w-5 h-5" />
                                    <span className={`text-xs font-black uppercase tracking-widest ${((triage.migrationScope || []).includes(opt)) ? 'text-indigo-800' : 'text-slate-600'}`}>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                    <div className="animate-fade-in space-y-6">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest border-b border-slate-200 pb-2"><i className="fas fa-cloud text-sky-500 mr-2"></i> Source Environments</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {['VMware', 'Hyper-V', 'AWS EC2', 'Azure VMs', 'GCP Compute', 'On-Premise Bare Metal', 'Other Cloud'].map(opt => (
                                <label key={opt} className={`flex items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-colors ${((triage.sourceEnvironment || []).includes(opt)) ? 'bg-sky-50 border-sky-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={(triage.sourceEnvironment || []).includes(opt)} onChange={() => handleMulti('sourceEnvironment', opt)} className="rounded text-sky-600 w-5 h-5" />
                                    <span className={`text-xs font-black uppercase tracking-widest ${((triage.sourceEnvironment || []).includes(opt)) ? 'text-sky-800' : 'text-slate-600'}`}>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 4 */}
                {currentStep === 4 && (
                    <div className="animate-fade-in space-y-6">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest border-b border-slate-200 pb-2"><i className="fas fa-hands-helping text-purple-500 mr-2"></i> Delivery Scope</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                                { id: 'turnkey', label: 'Turnkey Migration' },
                                { id: 'co_delivery', label: 'Co-Delivery' },
                                { id: 'advisory', label: 'Advisory Only' },
                                { id: 'arch_review', label: 'Arch Review' },
                                { id: 'security', label: 'Security / SecOps' },
                                { id: 'post_live', label: 'Post-Live Support' }
                            ].map(opt => (
                                <div key={opt.id} onClick={() => handleSingle('deliveryScope', opt.id)} className={`p-5 rounded-xl border-2 cursor-pointer flex items-center justify-center text-center transition-all ${triage.deliveryScope === opt.id ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                    <span className="text-xs font-black uppercase tracking-widest">{opt.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 5 */}
                {currentStep === 5 && (
                    <div className="animate-fade-in space-y-6">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest border-b border-slate-200 pb-2"><i className="fas fa-key text-rose-500 mr-2"></i> Authorization Level</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['Read-Only (Customer Managed)', 'Full Admin (Partner Managed)', 'Co-Managed (Federated)', 'No Access (Advisory Only)'].map(opt => (
                                <label key={opt} className={`flex items-center gap-4 p-6 rounded-xl border-2 cursor-pointer transition-colors ${((triage.authLevel || []).includes(opt)) ? 'bg-rose-50 border-rose-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={(triage.authLevel || []).includes(opt)} onChange={() => handleMulti('authLevel', opt)} className="rounded text-rose-600 w-5 h-5" />
                                    <span className={`text-sm font-black uppercase tracking-widest ${((triage.authLevel || []).includes(opt)) ? 'text-rose-800' : 'text-slate-600'}`}>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-900 p-5 flex justify-between items-center rounded-b-2xl">
                <button onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 transition-colors">
                    <i className="fas fa-arrow-left mr-2"></i> Back
                </button>
                {currentStep < 5 ? (
                    <button onClick={nextStep} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-colors shadow-md">
                        Continue to Step {currentStep + 1} <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                ) : (
                    <div className="text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center bg-slate-800 px-6 py-3 rounded-xl">
                        <i className="fas fa-check-circle mr-2"></i> Triage Complete
                    </div>
                )}
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
    
    const [triage, setTriage] = useState({
        project_type: 'standard', businessDrivers: [], migrationScope: ['compute'],
        sourceEnvironment: ['VMware / On-Premise'], authLevel: ['Read-Only (Customer Managed)'], deliveryScope: 'turnkey' 
    });

    const [expanded, setExpanded] = useState({ prospect: true, sizing: true, ready: true });
    const [editingProject, setEditingProject] = useState(null);
    const [projectToDelete, setProjectToDelete] = useState(null);

    const targetCountries = ["Mexico", "Colombia", "Peru", "Chile", "Argentina", "Brazil", "Other / TBD"];

    const handleAddNewLead = () => { 
        if(!newLeadName || !newLeadSA || !newLeadCountry || !newLeadCustomer) return alert("Project Name, Customer Account, Target Country, and SA are required."); 
        
        const matchedCustomer = (customers || []).find(c => c.name.toLowerCase() === newLeadCustomer.toLowerCase().trim());
        let customerId = null;
        let customerName = newLeadCustomer.trim().toUpperCase();
        if (matchedCustomer) { customerId = matchedCustomer.id; customerName = matchedCustomer.name; } 

        handleAddProject({
            id: String(Date.now()), name: newLeadName.toUpperCase(), customerName, customerId, 
            isWaiting: true, waitingStage: "prospect", health: "Yellow", mrr: 0, 
            sa: newLeadSA.toUpperCase(), country: newLeadCountry, partner: "TBD", techContact: "TBD", 
            sourceEnvironment: Array.isArray(triage.sourceEnvironment) ? triage.sourceEnvironment.join(', ') : triage.sourceEnvironment, 
            authLevel: Array.isArray(triage.authLevel) ? triage.authLevel : [triage.authLevel],
            migrationScope: Array.isArray(triage.migrationScope) ? triage.migrationScope : [triage.migrationScope],
            deliveryScope: triage.deliveryScope, businessDrivers: triage.businessDrivers,
            project_type: triage.project_type, lifecycleState: '1_arb'
        }); 
        
        setNewLeadCustomer(""); setNewLeadName(""); setNewLeadSA(""); setNewLeadCountry(""); 
        setTriage({ project_type: 'standard', businessDrivers: [], migrationScope: ['compute'], sourceEnvironment: ['VMware / On-Premise'], authLevel: ['Read-Only (Customer Managed)'], deliveryScope: 'turnkey' });
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
                        <input type="text" list="customers" value={newLeadCustomer} onChange={e => setNewLeadCustomer(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full font-bold uppercase outline-none focus:border-blue-500" />
                        <datalist id="customers">{(customers || []).map(c => <option key={c.id} value={c.name} />)}</datalist>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Project Name *</label><input type="text" value={newLeadName} onChange={e=>setNewLeadName(e.target.value.toUpperCase())} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 font-bold uppercase outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Target Country *</label><select value={newLeadCountry} onChange={e=>setNewLeadCountry(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full font-bold"><option value="" disabled>-- Select --</option>{targetCountries.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Sales Architect *</label><input type="text" list="sas" value={newLeadSA} onChange={e=>setNewLeadSA(e.target.value.toUpperCase())} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 font-bold uppercase outline-none focus:border-blue-500" /><datalist id="sas">{uniqueSAs.map(sa => <option key={sa} value={sa} />)}</datalist></div>
                </div>
                
                {/* HORIZONTAL WIZARD INJECTION */}
                <HorizontalPresalesWizard triage={triage} setTriage={setTriage} />

                <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
                    <button onClick={handleAddNewLead} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl text-xs shadow-lg">
                        <i className="fas fa-plus mr-2"></i> Add Lead to Pipeline
                    </button>
                </div>
            </div>
            
            {/* Column Rendering Pipeline (Preserved) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {cols.map(col => {
                    const colProjects = waitingProjects.filter(p => p.waitingStage === col.id || (col.id==='prospect' && !p.waitingStage));
                    return (
                        <div key={col.id} className={`rounded-2xl border-2 flex flex-col overflow-hidden ${col.color}`}>
                            <div className="p-5 border-b-2 border-inherit font-black text-sm text-slate-800 uppercase bg-white/60 flex justify-between items-center cursor-pointer" onClick={() => setExpanded(prev => ({...prev, [col.id]: !prev[col.id]}))}>
                                <div>{col.title} <span className="ml-3 bg-slate-800 text-white px-3 py-1 rounded-full text-[10px]">{colProjects.length}</span></div><i className={`fas fa-chevron-${expanded[col.id] ? 'up' : 'down'} text-slate-400`}></i>
                            </div>
                            <div className={`p-5 space-y-5 overflow-y-auto h-[750px] custom-scrollbar ${!expanded[col.id] ? 'hidden' : 'block'}`}>
                                {colProjects.map(p => (
                                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                        <div className="flex flex-col mb-4 border-b border-slate-100 pb-3 gap-3">
                                            <div className="font-black text-base text-slate-800 uppercase">{p.name}</div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingProject({...p})} className="flex-1 text-[10px] font-black uppercase bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg border border-blue-200">Assess</button>
                                                <button onClick={() => setProjectToDelete(p.id)} className="text-[10px] font-black uppercase bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-lg border border-rose-200"><i className="fas fa-trash-alt"></i></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-4 text-[9px] font-bold text-slate-600 uppercase">
                                            <div className="bg-slate-50 p-1.5 rounded border border-slate-100 truncate"><i className="fas fa-user-tie mr-1"></i> {p.sa}</div>
                                            <div className="bg-slate-50 p-1.5 rounded border border-slate-100 truncate"><i className="fas fa-globe-americas mr-1"></i> {p.country}</div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                            {col.id === 'prospect' && <div className="w-full flex justify-end"><button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">Move <i className="fas fa-arrow-right ml-1"></i></button></div>}
                                            {col.id === 'sizing' && <><button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'prospect')} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"><i className="fas fa-arrow-left mr-1"></i> Back</button><button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'ready')} className="text-[10px] font-black uppercase bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">Ready <i className="fas fa-arrow-right ml-1"></i></button></>}
                                            {col.id === 'ready' && <><button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"><i className="fas fa-arrow-left mr-1"></i> Back</button><button onClick={()=>{handleUpdateProject(p.id, 'isWaiting', false);}} className="text-[10px] font-black uppercase bg-emerald-600 text-white px-4 py-2 rounded-lg">Start ARB <i className="fas fa-door-open ml-1"></i></button></>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
            {projectToDelete && <TwoFactorModal actionName={`Delete Lead`} onConfirm={executeDelete} onCancel={() => setProjectToDelete(null)} />}
        </div>
    )
}
