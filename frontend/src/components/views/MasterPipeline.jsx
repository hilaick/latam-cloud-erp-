import React, { useContext, useState } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';

export default function MasterPipeline() {
    const { projects, handleUpdateProject, handleAddProject, handleDeleteProject, setActiveProjectId, setView } = useContext(ERPContext);
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
        return '🏳️'; // Default
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
                            mrr: 0, pocCap: 500, kickoff: new Date().toISOString().split('T')[0]
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
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-64">Project & Customer Context</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Geo</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-40">Phase</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-48">Timelines (Edit)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Health</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Target MRR</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-20 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(p => {
                                const statusObj = statuses.find(s => s.id === p.lifecycleState) || statuses[0];
                                return (
                                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="p-4 cursor-pointer" onClick={()=>openProject(p.id)}>
                                            <div className="font-black text-sm text-indigo-700 hover:underline">{p.name}</div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                                                <i className="fas fa-building opacity-50"></i> {p.customerName || 'No Customer Linked'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="text-3xl" title={p.country || 'Region Not Set'}>{getFlag(p.country)}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusObj.color}`}>{statusObj.name}</div>
                                        </td>
                                        <td className="p-4">
                                            {/* 🚨 Editable Timeline Dates */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase w-10">Start</span>
                                                    <input type="date" value={p.kickoff || ''} onChange={(e) => handleUpdateProject(p.id, 'kickoff', e.target.value)} className="bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase w-10">Go-Live</span>
                                                    <input type="date" value={p.date || ''} onChange={(e) => handleUpdateProject(p.id, 'date', e.target.value)} className="bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${p.health==='Green'?'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]':p.health==='Red'?'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]':'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'}`}></div>
                                                <span className="text-xs font-bold text-slate-700">{p.health || 'Green'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-black text-sm text-slate-800">${(parseFloat(p.mrr)||0).toLocaleString()}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={()=>{ if(window.confirm('Delete project permanently?')) handleDeleteProject(p.id); }} className="text-slate-400 hover:text-rose-500 transition-colors p-2"><i className="fas fa-trash-alt"></i></button>
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
