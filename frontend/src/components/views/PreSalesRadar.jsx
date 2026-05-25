import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell } from '../../utils/helpers'; 

export default function PreSalesRadar() {
    const { projects, handleAddProject, handleUpdateProject } = useContext(ERPContext);
    const waitingProjects = (projects || []).filter(p => p && p.isWaiting);
    
    const [newLeadName, setNewLeadName] = useState(""); 
    const [newLeadCountry, setNewLeadCountry] = useState("");
    const [newLeadSA, setNewLeadSA] = useState(""); 
    const [isPoC, setIsPoC] = useState(false);

    const [expanded, setExpanded] = useState({ prospect: true, sizing: true, ready: true });

    // 🚨 NEW: Comprehensive LATAM & Caribbean Country List
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
        if(!newLeadName || !newLeadSA || !newLeadCountry) return alert("Customer Name, Target Country, and Sales Architect are required."); 
        
        const newProj = {
            id: String(Date.now()), 
            name: newLeadName, 
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
            pocTtl: isPoC ? '' : null
        };

        handleAddProject(newProj); 
        setNewLeadName(""); setNewLeadSA(""); setNewLeadCountry(""); setIsPoC(false);
    };
    
    const cols = [
        { id: 'prospect', title: 'Early Prospect', color: 'border-slate-300 bg-slate-50' }, 
        { id: 'sizing', title: 'Discovery & Sizing', color: 'border-blue-300 bg-blue-50/50' }, 
        { id: 'ready', title: 'Ready for ARB Intake', color: 'border-purple-300 bg-purple-50/50' }
    ];

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            
            {/* INTAKE FORM */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-6 flex items-center">
                    <i className="fas fa-satellite-dish text-blue-500 mr-3 text-lg"></i> Register New Lead
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Customer Name *</label>
                        <input type="text" value={newLeadName} onChange={e=>setNewLeadName(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="GlobalCorp" />
                    </div>
                    <div>
                        {/* 🚨 NEW: Dropdown for Target Country */}
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
                        <input type="text" value={newLeadSA} onChange={e=>setNewLeadSA(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="SA Name" />
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
                                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-300 transition-all relative overflow-hidden">
                                        {p.project_type === 'poc' && <div className="absolute top-0 right-0 bg-amber-400 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-lg"><i className="fas fa-bolt mr-1"></i> PoC</div>}

                                        <div className="font-black text-base text-slate-800 leading-tight mb-4 border-b border-slate-100 pb-2 mt-2">
                                            <EditableCell value={p.name} onSave={v=>handleUpdateProject(p.id,'name',v)} />
                                        </div>
                                        
                                        {/* STAGE 1: BASIC INFO */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                                                <i className="fas fa-user-tie mr-2 opacity-50"></i> 
                                                <EditableCell value={p.sa} placeholder="SA Name" onSave={v=>handleUpdateProject(p.id,'sa',v)} className="w-full" />
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                                                <i className="fas fa-globe-americas mr-2 opacity-50"></i> 
                                                <EditableCell value={p.country} placeholder="Country" onSave={v=>handleUpdateProject(p.id,'country',v)} className="w-full" />
                                            </div>
                                        </div>

                                        {/* STAGE 2 & 3: TECHNICAL & FINANCIAL SCOPE */}
                                        {(col.id === 'sizing' || col.id === 'ready') && (
                                            <div className="animate-fade-in space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                                                        <i className="fas fa-handshake mr-2 opacity-50"></i> 
                                                        <EditableCell value={p.partner} placeholder="Partner" onSave={v=>handleUpdateProject(p.id,'partner',v)} className="w-full" />
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                                                        <i className="fas fa-headset mr-2 opacity-50"></i> 
                                                        <EditableCell value={p.techContact} placeholder="Tech Contact" onSave={v=>handleUpdateProject(p.id,'techContact',v)} className="w-full" />
                                                    </div>
                                                </div>

                                                <div className="text-sm font-black bg-emerald-50 text-emerald-800 w-max px-4 py-1.5 rounded-lg border border-emerald-200 flex items-center shadow-sm">
                                                    <span className="mr-1 text-emerald-500">$</span>
                                                    <EditableCell value={p.mrr} type="number" placeholder="Est. MRR" onSave={v=>handleUpdateProject(p.id,'mrr',v)} />
                                                </div>

                                                <div className="text-xs text-slate-600 p-3 bg-amber-50 rounded-xl border border-amber-100 font-medium">
                                                    <EditableCell type="textarea" placeholder="Add discovery notes, scope, or blockers..." value={p.blocker} onSave={v=>handleUpdateProject(p.id,'blocker',v)} />
                                                </div>
                                            </div>
                                        )}

                                        {col.id === 'ready' && (
                                            <div className="mt-4 bg-purple-50 p-3 rounded-lg border border-purple-200 text-[10px] font-bold text-purple-800 uppercase tracking-widest text-center">
                                                Verify data before Pipeline Entry
                                            </div>
                                        )}
                                        
                                        {/* BACK / FORWARD NAVIGATION */}
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>
    )
}
