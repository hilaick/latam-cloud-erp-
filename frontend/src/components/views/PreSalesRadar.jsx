import React, { useState, useContext, useMemo } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell } from '../../utils/helpers'; 
import TwoFactorModal from '../utils/TwoFactorModal';

export default function PreSalesRadar() {
    const { projects, handleAddProject, handleUpdateProject, handleDeleteProject } = useContext(ERPContext);
    const waitingProjects = (projects || []).filter(p => p && p.isWaiting);
    
    const [newLeadCustomer, setNewLeadCustomer] = useState("");
    const [newLeadName, setNewLeadName] = useState(""); 
    const [newLeadCountry, setNewLeadCountry] = useState("");
    const [newLeadSA, setNewLeadSA] = useState(""); 
    const [isPoC, setIsPoC] = useState(false);

    const [expanded, setExpanded] = useState({ prospect: true, sizing: true, ready: true });
    
    const [editingProject, setEditingProject] = useState(null);
    const [projectToDelete, setProjectToDelete] = useState(null);

    const uniqueSAs = useMemo(() => [...new Set((projects || []).map(p => p.sa).filter(Boolean))], [projects]);
    const uniquePartners = useMemo(() => [...new Set((projects || []).map(p => p.partner).filter(Boolean).filter(p => p !== 'TBD' && p !== 'None'))], [projects]);
    const uniqueTechs = useMemo(() => [...new Set((projects || []).map(p => p.techContact).filter(Boolean).filter(t => t !== 'TBD'))], [projects]);

    const targetCountries = [
        "Anguilla", "Antigua and Barbuda", "Argentina", "Aruba", "Bahamas", "Barbados", 
        "Belize", "Bermuda", "Bolivia", "Brazil", "British Virgin Islands", "Cayman Islands", 
        "Chile", "Colombia", "Costa Rica", "Cuba", "Curaçao", "Dominica", "Dominican Republic", 
        "Ecuador", "El Salvador", "Grenada", "Guadeloupe", "Guatemala", "Guyana", "Haiti", 
        "Honduras", "Jamaica", "Martinique", "Mexico", "Montserrat", "Nicaragua", "Panama", 
        "Paraguay", "Peru", "Puerto Rico", "Saint Barthélemy", "Saint Kitts and Nevis", 
        "Saint Lucia", "Saint Martin", "Saint Vincent and the Grenadines", "Sint Maarten", 
        "Suriname", "Trinidad and Tobago", "Turks and Caicos Islands", "U.S. Virgin Islands", 
        "Uruguay", "Venezuela", "Other / TBD"
    ];

    const handleAddNewLead = () => { 
        if(!newLeadName || !newLeadSA || !newLeadCountry) return alert("Project Name, Target Country, and SA are required."); 
        
        const newProj = {
            id: String(Date.now()), 
            name: newLeadName, 
            customerName: newLeadCustomer.trim(), 
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
        };

        handleAddProject(newProj); 
        setNewLeadCustomer(""); setNewLeadName(""); setNewLeadSA(""); setNewLeadCountry(""); setIsPoC(false);
    };

    const executeDelete = () => {
        if (projectToDelete) {
            handleDeleteProject(projectToDelete);
            setProjectToDelete(null);
            setEditingProject(null);
        }
    };
    
    const cols = [
        { id: 'prospect', title: 'Early Prospect', color: 'border-slate-300 bg-slate-50' }, 
        { id: 'sizing', title: 'Discovery & Sizing', color: 'border-blue-300 bg-blue-50/50' }, 
        { id: 'ready', title: 'Ready for ARB Intake', color: 'border-purple-300 bg-purple-50/50' }
    ];

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12 relative">
            
            <datalist id="sa-list">{uniqueSAs.map(sa => <option key={sa} value={sa} />)}</datalist>
            <datalist id="partner-list">{uniquePartners.map(p => <option key={p} value={p} />)}</datalist>
            <datalist id="tech-list">{uniqueTechs.map(t => <option key={t} value={t} />)}</datalist>

            {/* INTAKE FORM */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-6 flex items-center">
                    <i className="fas fa-satellite-dish text-blue-500 mr-3 text-lg"></i> Register New Lead
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Customer Account</label>
                        <input type="text" value={newLeadCustomer} onChange={e=>setNewLeadCustomer(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="Optional for early leads" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Project Name *</label>
                        <input type="text" value={newLeadName} onChange={e=>setNewLeadName(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="e.g. ERP Cloud Exit" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Country *</label>
                        <select 
                            value={newLeadCountry} 
                            onChange={e=>setNewLeadCountry(e.target.value)} 
                            className={`p-3 border-2 border-slate-200 rounded-xl text-xs w-full outline-none focus:border-blue-500 font-bold ${!newLeadCountry ? 'text-slate-400 bg-slate-50' : 'text-slate-800 bg-white'}`}
                        >
                            <option value="" disabled>-- Select Target Country --</option>
                            {targetCountries.map(country => (
                                <option key={country} value={country} className="text-slate-800">{country}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sales Architect *</label>
                        <input type="text" list="sa-list" value={newLeadSA} onChange={e=>setNewLeadSA(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="Start typing SA Name..." />
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <input type="checkbox" checked={isPoC} onChange={(e) => setIsPoC(e.target.checked)} className="w-5 h-5 accent-amber-500" />
                        <div>
                            <div className="text-xs font-black text-slate-800 uppercase tracking-widest">Fast-Track PoC</div>
                            <div className="text-[10px] text-slate-500 font-bold">Skip Post-Live governance</div>
                        </div>
                    </label>

                    <button onClick={handleAddNewLead} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-md text-xs transition-colors">
                        <i className="fas fa-plus mr-2"></i> Add Lead
                    </button>
                </div>
            </div>
            
            {/* KANBAN BOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {cols.map(col => {
                    const colProjects = waitingProjects.filter(p => p.waitingStage === col.id || (col.id==='prospect' && !p.waitingStage));
                    return (
                        <div key={col.id} className={`rounded-2xl border-2 flex flex-col transition-all duration-300 overflow-hidden ${col.color} ${expanded[col.id] ? 'h-auto lg:h-[750px]' : 'h-16'}`}>
                            <div className="p-5 border-b-2 border-inherit font-black text-sm text-slate-800 uppercase tracking-widest bg-white/60 backdrop-blur-sm flex justify-between items-center cursor-pointer hover:bg-white/80 transition-colors" onClick={() => setExpanded(prev => ({...prev, [col.id]: !prev[col.id]}))}>
                                <div className="flex items-center">{col.title} <span className="ml-3 bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] shadow-sm">{colProjects.length}</span></div>
                                <i className={`fas fa-chevron-${expanded[col.id] ? 'up' : 'down'} text-slate-400 text-lg`}></i>
                            </div>
                            <div className={`p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar ${!expanded[col.id] ? 'hidden' : 'block'}`}>
                                {colProjects.map(p => (
                                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all relative overflow-hidden">
                                        
                                        <div className="flex flex-col mb-4 border-b border-slate-100 pb-3 mt-2 gap-3">
                                            <div className="font-black text-base text-slate-800 leading-tight">
                                                <div className={`text-[10px] uppercase tracking-widest mb-1 ${p.customerName ? 'text-blue-600' : 'text-amber-500 font-bold'}`}>
                                                    {p.customerName ? p.customerName : <><i className="fas fa-exclamation-triangle"></i> Account TBD</>}
                                                </div>
                                                {p.name}
                                                {p.project_type === 'poc' && <span className="ml-2 bg-amber-400 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm align-middle"><i className="fas fa-bolt mr-1"></i> PoC</span>}
                                            </div>
                                            
                                            {/* 🚨 ACTION BUTTONS PERMANENTLY VISIBLE */}
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingProject({...p})} className="flex-1 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg transition-colors border border-blue-200 shadow-sm">
                                                    <i className="fas fa-expand-arrows-alt mr-1"></i> Assess
                                                </button>
                                                <button onClick={() => setProjectToDelete(p.id)} className="text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-lg transition-colors border border-rose-200 shadow-sm" title="Delete Prospect">
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100 truncate"><i className="fas fa-user-tie mr-2 opacity-50"></i> {p.sa}</div>
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100 truncate"><i className="fas fa-globe-americas mr-2 opacity-50"></i> {p.country}</div>
                                        </div>

                                        {(col.id === 'sizing' || col.id === 'ready') && (
                                            <div className="animate-fade-in space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100 truncate"><i className="fas fa-handshake mr-2 opacity-50"></i> {p.partner || 'TBD'}</div>
                                                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100 truncate"><i className="fas fa-headset mr-2 opacity-50"></i> {p.techContact || 'TBD'}</div>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <div className="text-sm font-black bg-emerald-50 text-emerald-800 px-3 py-1 rounded-lg border border-emerald-200 shadow-sm">${p.mrr || 0} /mo</div>
                                                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${p.discoveryStatus === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>Disc: {p.discoveryStatus || 'Pending'}</div>
                                                </div>

                                                {p.blocker && <div className="text-xs text-slate-600 p-3 bg-amber-50 rounded-xl border border-amber-100 font-medium italic">"{p.blocker}"</div>}
                                            </div>
                                        )}
                                        
                                        {col.id === 'ready' && (
                                            <div className="mt-4 bg-purple-50 p-3 rounded-lg border border-purple-200 text-[10px] font-bold text-purple-800 uppercase tracking-widest text-center">
                                                Verify data before Pipeline Entry
                                            </div>
                                        )}
                                        
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                            {col.id === 'prospect' && (
                                                <div className="w-full flex justify-end">
                                                    <button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors">Move <i className="fas fa-arrow-right ml-1"></i></button>
                                                </div>
                                            )}
                                            
                                            {col.id === 'sizing' && (
                                                <>
                                                    <button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'prospect')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"><i className="fas fa-arrow-left mr-1"></i> Back</button>
                                                    <button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'ready')} className="text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-800 hover:bg-purple-200 px-4 py-2 rounded-lg transition-colors">Ready <i className="fas fa-arrow-right ml-1"></i></button>
                                                </>
                                            )}

                                            {col.id === 'ready' && (
                                                <>
                                                    <button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"><i className="fas fa-arrow-left mr-1"></i> Back</button>
                                                    <button onClick={()=>{handleUpdateProject(p.id, 'isWaiting', false); alert("Moved to Delivery Pipeline! Customer Profile created.");}} className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-md transition-colors">Start ARB <i className="fas fa-door-open ml-1"></i></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {colProjects.length === 0 && <div className="text-center text-slate-400 text-xs font-bold py-12 border-2 border-dashed border-slate-300 rounded-2xl mx-2">No active leads</div>}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* DEEP EDIT MODAL */}
            {editingProject && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col border border-slate-700 animate-slide-up">
                        
                        <div className="bg-slate-900 px-8 py-5 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-black text-xl text-blue-400"><i className="fas fa-clipboard-list mr-3"></i> Comprehensive Pre-Sales Assessment</h3>
                                <div className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Editing Lead: {editingProject.name}</div>
                            </div>
                            <button onClick={()=>setEditingProject(null)} className="text-slate-400 hover:text-white transition-colors text-2xl"><i className="fas fa-times"></i></button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50">
                            <div className="space-y-8">
                                
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2"><i className="fas fa-info-circle text-blue-500 mr-2"></i> 1. Basic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Customer Account</label><input type="text" placeholder="Optional" value={editingProject.customerName || ''} onChange={e=>setEditingProject({...editingProject, customerName: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project Name (Scope)</label><input type="text" value={editingProject.name || ''} onChange={e=>setEditingProject({...editingProject, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Country</label>
                                            <select value={editingProject.country || ''} onChange={e=>setEditingProject({...editingProject, country: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold">
                                                {targetCountries.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sales Architect</label><input type="text" list="sa-list" value={editingProject.sa || ''} onChange={e=>setEditingProject({...editingProject, sa: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Delivery Partner</label><input type="text" list="partner-list" value={editingProject.partner || ''} onChange={e=>setEditingProject({...editingProject, partner: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Technical Contact</label><input type="text" list="tech-list" value={editingProject.techContact || ''} onChange={e=>setEditingProject({...editingProject, techContact: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Probability (%)</label><input type="number" min="0" max="100" value={editingProject.probability || 0} onChange={e=>setEditingProject({...editingProject, probability: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2"><i className="fas fa-search-dollar text-emerald-500 mr-2"></i> 2. Discovery & Financials</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discovery Status</label><select value={editingProject.discoveryStatus || 'Not Started'} onChange={e=>setEditingProject({...editingProject, discoveryStatus: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold"><option>Not Started</option><option>In Progress</option><option>Completed</option></select></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expected Close Date</label><input type="date" value={editingProject.expectedCloseDate || ''} onChange={e=>setEditingProject({...editingProject, expectedCloseDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold font-mono" /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Est. Target MRR (USD)</label><input type="number" value={editingProject.mrr || 0} onChange={e=>setEditingProject({...editingProject, mrr: e.target.value})} className="w-full p-2 border border-slate-300 rounded bg-emerald-50 text-emerald-900 focus:border-blue-500 outline-none text-sm font-black" /></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discovery Notes / Scope</label><textarea rows="2" value={editingProject.discoveryNotes || ''} onChange={e=>setEditingProject({...editingProject, discoveryNotes: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-medium"></textarea></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Discovery Document Links</label><input type="text" placeholder="SharePoint / Drive Link..." value={editingProject.discoveryDocuments || ''} onChange={e=>setEditingProject({...editingProject, discoveryDocuments: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-medium" /></div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2"><i className="fas fa-server text-purple-500 mr-2"></i> 3. Technical Sizing</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sizing Status</label><select value={editingProject.sizingStatus || 'Not Started'} onChange={e=>setEditingProject({...editingProject, sizingStatus: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold"><option>Not Started</option><option>In Progress</option><option>Completed</option></select></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Source Environment</label><input type="text" placeholder="e.g. On-Prem VMware" value={editingProject.sourceEnvironment || ''} onChange={e=>setEditingProject({...editingProject, sourceEnvironment: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Migration Type</label><select value={editingProject.migrationType || 'Lift & Shift'} onChange={e=>setEditingProject({...editingProject, migrationType: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold"><option>Lift & Shift</option><option>Replatform</option><option>Refactor</option></select></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Est. Workloads / VMs</label><input type="number" value={editingProject.estimatedWorkloads || 0} onChange={e=>setEditingProject({...editingProject, estimatedWorkloads: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sizing Document Links (BoM)</label><input type="text" placeholder="SharePoint / Drive Link..." value={editingProject.sizingDocuments || ''} onChange={e=>setEditingProject({...editingProject, sizingDocuments: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-medium" /></div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2"><i className="fas fa-exclamation-triangle text-amber-500 mr-2"></i> 4. Risks & Timelines</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proposed Start Date</label><input type="date" value={editingProject.proposedStartDate || ''} onChange={e=>setEditingProject({...editingProject, proposedStartDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold font-mono" /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proposed End Date</label><input type="date" value={editingProject.proposedEndDate || ''} onChange={e=>setEditingProject({...editingProject, proposedEndDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold font-mono" /></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Complexity Level</label><select value={editingProject.complexityLevel || 'Medium'} onChange={e=>setEditingProject({...editingProject, complexityLevel: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold"><option>Low</option><option>Medium</option><option>High</option><option>Ultra-High</option></select></div>
                                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Est. Migration Labor (Hours)</label><input type="number" value={editingProject.estimatedMigrationHours || 0} onChange={e=>setEditingProject({...editingProject, estimatedMigrationHours: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold" /></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div><label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Technical & Business Blockers</label><textarea rows="2" value={editingProject.blocker || ''} onChange={e=>setEditingProject({...editingProject, blocker: e.target.value})} className="w-full p-2 border border-rose-300 bg-rose-50 rounded focus:border-rose-500 outline-none text-sm font-medium"></textarea></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MODAL FOOTER WITH SECURE DELETE BUTTON */}
                        <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex flex-col sm:flex-row justify-between gap-4 shrink-0 items-center">
                            <button onClick={() => setProjectToDelete(editingProject.id)} className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-rose-600 uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 shadow-sm">
                                <i className="fas fa-trash-alt mr-2"></i> Delete Lead
                            </button>
                            
                            <div className="flex w-full sm:w-auto gap-3">
                                <button onClick={()=>setEditingProject(null)} className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors border border-slate-200">Cancel</button>
                                <button onClick={()=>{
                                    handleUpdateProject(editingProject.id, editingProject);
                                    setEditingProject(null);
                                }} className="flex-1 sm:flex-none px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors">
                                    <i className="fas fa-save mr-2"></i> Save Assessment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RENDER THE 2FA DELETION MODAL IF TRIGGERED */}
            {projectToDelete && (
                <TwoFactorModal 
                    actionName={`Delete Pre-Sales Lead: ${(projects.find(p=>p.id===projectToDelete)?.name) || 'Unknown'}`} 
                    onConfirm={executeDelete} 
                    onCancel={() => setProjectToDelete(null)} 
                />
            )}

        </div>
    )
}
