import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell } from '../../utils/helpers'; 

export default function PreSalesRadar() {
    // 🚨 THE FIX: Extract the correct Database-Linked functions from Context!
    const { projects, handleAddProject, handleUpdateProject } = useContext(ERPContext);
    
    const waitingProjects = (projects || []).filter(p => p && p.isWaiting);
    
    const [newLeadName, setNewLeadName] = useState(""); 
    const [newLeadSA, setNewLeadSA] = useState(""); 
    const [newLeadMRR, setNewLeadMRR] = useState("");
    const [newLeadCountry, setNewLeadCountry] = useState("");
    const [newLeadPartner, setNewLeadPartner] = useState("");
    const [newLeadTechContact, setNewLeadTechContact] = useState("");

    const [expanded, setExpanded] = useState({ prospect: true, sizing: true, ready: true });

    const handleAddNewLead = () => { 
        if(!newLeadName || !newLeadSA) return alert("Customer Name and Sales Architect are required."); 
        
        const newProj = {
            id: String(Date.now()), 
            name: newLeadName, 
            isWaiting: true, 
            waitingStage: "prospect", 
            health: "Yellow", 
            mrr: parseFloat(newLeadMRR) || 0, 
            sa: newLeadSA, 
            country: newLeadCountry || "TBD",
            partner: newLeadPartner || "None",
            techContact: newLeadTechContact || "TBD",
            lifecycleState: '1_arb', 
            progress: '0%'
        };

        // Send straight to Postgres
        handleAddProject(newProj); 
        
        // Reset Form
        setNewLeadName(""); setNewLeadSA(""); setNewLeadMRR(""); 
        setNewLeadCountry(""); setNewLeadPartner(""); setNewLeadTechContact("");
    };
    
    const cols = [
        { id: 'prospect', title: 'Early Prospect', color: 'border-slate-300 bg-slate-50' }, 
        { id: 'sizing', title: 'Discovery & Sizing', color: 'border-blue-300 bg-blue-50/50' }, 
        { id: 'ready', title: 'Ready for ARB Intake', color: 'border-purple-300 bg-purple-50/50' }
    ];

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            
            {/* NEW LEAD INTAKE FORM */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-6 flex items-center">
                    <i className="fas fa-satellite-dish text-blue-500 mr-3 text-lg"></i> Register New Prospect
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Customer Lead *</label>
                        <input type="text" value={newLeadName} onChange={e=>setNewLeadName(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="GlobalCorp Migration" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Country</label>
                        <input type="text" value={newLeadCountry} onChange={e=>setNewLeadCountry(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="e.g. Mexico" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Est. MRR ($)</label>
                        <input type="number" value={newLeadMRR} onChange={e=>setNewLeadMRR(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="5000" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sales Architect *</label>
                        <input type="text" value={newLeadSA} onChange={e=>setNewLeadSA(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="SA Name" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Partner</label>
                        <input type="text" value={newLeadPartner} onChange={e=>setNewLeadPartner(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="e.g. TechCorp Integrators" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Technical Contact</label>
                        <input type="text" value={newLeadTechContact} onChange={e=>setNewLeadTechContact(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-xs w-full bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="CIO / IT Lead" />
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button onClick={handleAddNewLead} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-md text-xs transition-colors">
                        <i className="fas fa-plus mr-2"></i> Add Lead to Radar
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
                                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
                                        <div className="font-black text-base text-slate-800 leading-tight mb-4 border-b border-slate-100 pb-2">
                                            <EditableCell value={p.name} onSave={v=>handleUpdateProject(p.id,'name',v)} />
                                        </div>
                                        
                                        {/* RICH DATA GRID */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center bg-blue-50 p-1.5 rounded">
                                                <i className="fas fa-user-tie mr-2 opacity-70"></i> 
                                                <EditableCell value={p.sa} placeholder="SA Name" onSave={v=>handleUpdateProject(p.id,'sa',v)} className="w-full" />
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                                                <i className="fas fa-globe-americas mr-2 opacity-50"></i> 
                                                <EditableCell value={p.country} placeholder="Country" onSave={v=>handleUpdateProject(p.id,'country',v)} className="w-full" />
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                                                <i className="fas fa-handshake mr-2 opacity-50"></i> 
                                                <EditableCell value={p.partner} placeholder="Partner" onSave={v=>handleUpdateProject(p.id,'partner',v)} className="w-full" />
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                                                <i className="fas fa-headset mr-2 opacity-50"></i> 
                                                <EditableCell value={p.techContact} placeholder="Tech Contact" onSave={v=>handleUpdateProject(p.id,'techContact',v)} className="w-full" />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-sm font-black bg-emerald-50 text-emerald-800 w-max px-4 py-1.5 rounded-lg border border-emerald-200 flex items-center shadow-sm">
                                                <span className="mr-1 text-emerald-500">$</span>
                                                <EditableCell value={p.mrr} type="number" onSave={v=>handleUpdateProject(p.id,'mrr',v)} />
                                            </div>
                                        </div>

                                        <div className="text-xs text-slate-600 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium">
                                            <EditableCell type="textarea" placeholder="Add blockers or discovery notes..." value={p.blocker} onSave={v=>handleUpdateProject(p.id,'blocker',v)} />
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {col.id === 'prospect' && <button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors">Move <i className="fas fa-arrow-right ml-1"></i></button>}
                                            {col.id === 'sizing' && <button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'ready')} className="text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-800 hover:bg-purple-200 px-4 py-2 rounded-lg transition-colors">Ready <i className="fas fa-arrow-right ml-1"></i></button>}
                                            {col.id === 'ready' && <button onClick={()=>{handleUpdateProject(p.id, 'isWaiting', false); alert("Moved to Delivery Pipeline! Customer Profile created.");}} className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-md transition-colors">Start ARB <i className="fas fa-door-open ml-1"></i></button>}
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
