import React, { useContext, useState } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function MasterPipeline() {
    const { projects, customers, handleUpdateProject, handleAddProject, handleDeleteProject, setActiveProjectId, setView } = useContext(ERPContext);
    const [searchTerm, setSearchTerm] = useState('');

    const openProject = (id) => {
        setActiveProjectId(id);
        setView('wizard');
    };

    const getFlag = (country) => {
        const c = String(country||'').toLowerCase();
        if(c.includes('mexico')) return '🇲🇽';
        if(c.includes('brazil')) return '🇧🇷';
        if(c.includes('chile')) return '🇨🇱';
        if(c.includes('colombia')) return '🇨🇴';
        if(c.includes('argentina')) return '🇦🇷';
        if(c.includes('peru')) return '🇵🇪';
        return '🏳️'; 
    };

    const statuses = [
        { id: '1_arb', name: '1. ARB Intake', color: 'bg-slate-100 text-slate-800' },
        { id: '2_architecture', name: '2. Architecture', color: 'bg-blue-100 text-blue-800' },
        { id: '3_planning', name: '3. Planning', color: 'bg-indigo-100 text-indigo-800' },
        { id: '4_execution', name: '4. Execution', color: 'bg-amber-100 text-amber-800' },
        { id: '5_postlive', name: '5. Post-Live', color: 'bg-purple-100 text-purple-800' },
        { id: '6_completed', name: 'Completed', color: 'bg-emerald-100 text-emerald-800' }
    ];

    const filtered = (projects || []).filter(p => p && !p.isWaiting && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto pb-12">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><i className="fas fa-layer-group text-indigo-600"></i> Master Pipeline</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Cross-Functional Migration Delivery Portfolio</p>
                </div>
                <div className="flex gap-4">
                    <input type="text" placeholder="Search projects..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 w-64" />
                    <button onClick={() => {
                        const newProject = { 
                            id: `proj-${Date.now()}`, name: 'New Migration Project', lifecycleState: '1_arb', 
                            mrr: 0, pocCap: 0, kickoff: new Date().toISOString().split('T')[0], health: 'Green'
                        };
                        handleAddProject(newProject);
                        openProject(newProject.id);
                    }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-plus mr-2"></i> New Project</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[600px] custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-72">Project & Identity</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-20 text-center">Geo</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Phase</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-48">Timelines</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Health</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Target MRR ($)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-20 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(p => {
                                const statusObj = statuses.find(s => s.id === p.lifecycleState) || statuses[0];
                                return (
                                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="p-4">
                                            {/* 🚨 ALL EDITABLE FIELDS RESTORED */}
                                            <input value={p.name || ''} onChange={e => handleUpdateProject(p.id, 'name', e.target.value)} className="font-black text-sm text-indigo-700 w-full outline-none bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 pb-0.5 cursor-text" placeholder="Project Name" />
                                            <div className="flex items-center gap-2 mt-2">
                                                <select value={p.customerId || ''} onChange={e => {
                                                    const cust = customers.find(c => c.id === e.target.value);
                                                    handleUpdateProject(p.id, 'customerId', e.target.value);
                                                    if(cust) handleUpdateProject(p.id, 'customerName', cust.name);
                                                }} className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-1 outline-none w-32 cursor-pointer">
                                                    <option value="">Select Customer...</option>
                                                    {(customers||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <input value={p.sa || ''} onChange={e => handleUpdateProject(p.id, 'sa', e.target.value)} placeholder="SA Name" className="text-[10px] font-bold text-slate-600 uppercase bg-slate-100 border border-slate-200 rounded px-1.5 py-1 outline-none w-24" />
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {/* 🚨 FIX: Flag size is now normal (text-xl) with hover text */}
                                            <div className="text-xl cursor-help select-none hover:scale-110 transition-transform" title={p.country || 'No Country Configured'}>{getFlag(p.country)}</div>
                                        </td>
                                        <td className="p-4">
                                            <select value={p.lifecycleState} onChange={e => handleUpdateProject(p.id, 'lifecycleState', e.target.value)} className={`text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded outline-none cursor-pointer border border-transparent hover:border-slate-300 ${statusObj.color}`}>
                                                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between w-full gap-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Start</span>
                                                    <input type="date" value={p.kickoff || ''} onChange={(e) => handleUpdateProject(p.id, 'kickoff', e.target.value)} className="bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-700 outline-none transition-colors" />
                                                </div>
                                                <div className="flex items-center justify-between w-full gap-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">End</span>
                                                    <input type="date" value={p.date || ''} onChange={(e) => handleUpdateProject(p.id, 'date', e.target.value)} className="bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-700 outline-none transition-colors" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.health==='Green'?'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]':p.health==='Red'?'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]':'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'}`}></div>
                                                <select value={p.health || 'Green'} onChange={e => handleUpdateProject(p.id, 'health', e.target.value)} className="bg-transparent border border-transparent hover:border-slate-300 rounded text-xs font-bold text-slate-700 outline-none cursor-pointer">
                                                    <option value="Green">Green (On Track)</option>
                                                    <option value="Amber">Amber (At Risk)</option>
                                                    <option value="Red">Red (Delayed)</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-24">
                                                <span className="text-xs font-black text-slate-400">$</span>
                                                <input type="number" value={p.mrr || 0} onChange={e => handleUpdateProject(p.id, 'mrr', e.target.value)} className="w-full bg-transparent outline-none font-black text-sm text-slate-800" />
                                            </div>
                                        </td>
                                        <td className="p-4 text-center space-x-3">
                                            <button onClick={()=>openProject(p.id)} className="text-slate-400 hover:text-indigo-600 transition-colors p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-indigo-300" title="Open Project Wizard"><i className="fas fa-external-link-alt"></i></button>
                                            <button onClick={()=>{ if(window.confirm('Delete project permanently?')) handleDeleteProject(p.id); }} className="text-slate-400 hover:text-rose-600 transition-colors p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-rose-300" title="Delete Project"><i className="fas fa-trash-alt"></i></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
