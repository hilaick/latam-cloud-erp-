import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell } from '../../utils/helpers';

export default function PreSalesRadar() {
    const { projects, setProjects } = useContext(ERPContext);
    const waitingProjects = (projects || []).filter(p => p && p.isWaiting);
    const [newLeadName, setNewLeadName] = useState(""); 
    const [newLeadSA, setNewLeadSA] = useState(""); 
    const [newLeadMRR, setNewLeadMRR] = useState("");
    const [expanded, setExpanded] = useState({ prospect: true, sizing: true, ready: true });

    // Built-in updater using the context
    const handleUpdateProject = (id, field, value) => {
        setProjects(prev => prev.map(p => {
            if (String(p.id) === String(id)) {
                const newProject = { ...p, [field]: value };
                fetch('/api/erp/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProject) });
                return newProject;
            }
            return p;
        }));
    };

    const handleAddProject = (newProj) => {
        setProjects([...projects, newProj]);
        fetch('/api/erp/projects', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newProj) });
    };

    const generateDefaultProject = (id, name, isWaiting, stage, health, mrr, sa, country) => ({
        id: String(id), name, isWaiting, waitingStage: stage, health, mrr, sa, country, lifecycleState: '1_arb', progress: '0%'
    });

    const handleAddNewLead = () => { 
        if(!newLeadName || !newLeadSA) return alert("Name and SA required."); 
        handleAddProject(generateDefaultProject(Date.now(), newLeadName, true, "prospect", "Yellow", parseFloat(newLeadMRR)||0, newLeadSA, "")); 
        setNewLeadName(""); setNewLeadSA(""); setNewLeadMRR(""); 
    };
    
    const cols = [
        { id: 'prospect', title: 'Early Prospect', color: 'border-slate-300 bg-slate-50' }, 
        { id: 'sizing', title: 'Discovery & Sizing', color: 'border-blue-300 bg-blue-50/50' }, 
        { id: 'ready', title: 'Ready for ARB Intake', color: 'border-purple-300 bg-purple-50/50' }
    ];

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-5">
                <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Customer Lead</label><input type="text" value={newLeadName} onChange={e=>setNewLeadName(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-sm w-64 bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="GlobalCorp Migration" /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sales Architect</label><input type="text" value={newLeadSA} onChange={e=>setNewLeadSA(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-sm w-48 bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="SA Name" /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Est. MRR ($)</label><input type="number" value={newLeadMRR} onChange={e=>setNewLeadMRR(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-sm w-32 bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="0" /></div>
                <button onClick={handleAddNewLead} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-md text-xs transition-colors"><i className="fas fa-plus mr-2"></i> Add to Radar</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {cols.map(col => {
                    const colProjects = waitingProjects.filter(p => p.waitingStage === col.id || (col.id==='prospect' && !p.waitingStage));
                    return (
                        <div key={col.id} className={`rounded-2xl border-2 flex flex-col transition-all duration-300 overflow-hidden ${col.color} ${expanded[col.id] ? 'h-auto lg:h-[700px]' : 'h-16'}`}>
                            <div className="p-5 border-b-2 border-inherit font-black text-sm text-slate-800 uppercase tracking-widest bg-white/60 backdrop-blur-sm flex justify-between items-center cursor-pointer hover:bg-white/80 transition-colors" onClick={() => setExpanded(prev => ({...prev, [col.id]: !prev[col.id]}))}>
                                <div className="flex items-center">{col.title} <span className="ml-3 bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] shadow-sm">{colProjects.length}</span></div>
                                <i className={`fas fa-chevron-${expanded[col.id] ? 'up' : 'down'} text-slate-400 text-lg`}></i>
                            </div>
                            <div className={`p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar ${!expanded[col.id] ? 'hidden' : 'block'}`}>
                                {colProjects.map(p => (
                                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
                                        <div className="font-black text-base text-slate-800 leading-tight mb-3"><EditableCell value={p.name} onSave={v=>handleUpdateProject(p.id,'name',v)} /></div>
                                        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center mb-4"><i className="fas fa-user-tie mr-2 opacity-50"></i> <EditableCell value={p.sa} onSave={v=>handleUpdateProject(p.id,'sa',v)} /></div>
                                        <div className="text-sm font-black bg-emerald-50 text-emerald-800 w-max px-4 py-1.5 rounded-lg border border-emerald-200 flex items-center shadow-sm"><span className="mr-1 text-emerald-500">$</span><EditableCell value={p.mrr} type="number" onSave={v=>handleUpdateProject(p.id,'mrr',v)} /></div>
                                        <div className="text-xs text-slate-600 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium"><EditableCell type="textarea" value={p.blocker} onSave={v=>handleUpdateProject(p.id,'blocker',v)} /></div>
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {col.id === 'prospect' && <button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors">Move <i className="fas fa-arrow-right ml-1"></i></button>}
                                            {col.id === 'sizing' && <button onClick={()=>handleUpdateProject(p.id, 'waitingStage', 'ready')} className="text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-800 hover:bg-purple-200 px-4 py-2 rounded-lg transition-colors">Ready <i className="fas fa-arrow-right ml-1"></i></button>}
                                            {col.id === 'ready' && <button onClick={()=>{handleUpdateProject(p.id, 'isWaiting', false); alert("Moved to Pipeline!");}} className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-md transition-colors">Start ARB <i className="fas fa-door-open ml-1"></i></button>}
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