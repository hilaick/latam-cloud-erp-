import React, { useContext, useState } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell } from '../../utils/helpers';

export default function MasterPipeline() {
    const { projects, handleUpdateProject, handleDeleteProject, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    const [searchTerm, setSearchTerm] = useState('');

    const openProject = (id) => {
        setActiveProjectId(id);
        setActivePhase('wizard');
    };

    const handleExportCSV = () => {
        const headers = ["Project Name", "Customer", "Country", "Phase", "Health", "Progress", "MRR", "Kickoff", "Go-Live", "SA", "Partner", "Complexity", "Blockers"];
        const activeProjects = (projects || []).filter(p => !p.isWaiting);
        
        const csvContent = [
            headers.join(","), 
            ...activeProjects.map(p => { 
                return [
                    `"${(p.name || '').replace(/"/g, '""')}"`, 
                    `"${(p.customerName || '').replace(/"/g, '""')}"`, 
                    `"${(p.country || '').replace(/"/g, '""')}"`, 
                    `"${p.lifecycleState || ''}"`, 
                    `"${p.health || 'Green'}"`, 
                    `"${p.progress || '0%'}"`, 
                    `"${p.mrr || 0}"`, 
                    `"${p.kickoff || ''}"`, 
                    `"${p.date || ''}"`, 
                    `"${(p.sa || '').replace(/"/g, '""')}"`, 
                    `"${(p.partner || '').replace(/"/g, '""')}"`, 
                    `"${p.complexity || 'Medium'}"`, 
                    `"${(p.blocker || '').replace(/"/g, '""')}"`
                ].join(","); 
            })
        ].join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); 
        link.setAttribute("href", url); 
        link.setAttribute("download", `LATAM_Pipeline_Export_${new Date().toISOString().split('T')[0]}.csv`); 
        document.body.appendChild(link); 
        link.click(); 
        document.body.removeChild(link);
    };

    const getFlag = (country) => {
        const c = String(country || '').toLowerCase().trim();
        if (c.includes('mexico')) return '🇲🇽';
        if (c.includes('brazil') || c.includes('brasil')) return '🇧🇷';
        if (c.includes('chile')) return '🇨🇱';
        if (c.includes('colombia')) return '🇨🇴';
        if (c.includes('argentina')) return '🇦🇷';
        if (c.includes('peru') || c.includes('perú')) return '🇵🇪';
        if (c.includes('panama') || c.includes('panamá')) return '🇵🇦';
        if (c.includes('guatemala')) return '🇬🇹';
        if (c.includes('costa rica')) return '🇨🇷';
        if (c.includes('ecuador')) return '🇪🇨';
        if (c.includes('bolivia')) return '🇧🇴';
        if (c.includes('uruguay')) return '🇺🇾';
        if (c.includes('paraguay')) return '🇵🇾';
        if (c.includes('venezuela')) return '🇻🇪';
        if (c.includes('salvador')) return '🇸🇻';
        if (c.includes('honduras')) return '🇭🇳';
        if (c.includes('nicaragua')) return '🇳🇮';
        if (c.includes('dominican') || c.includes('republica dominicana')) return '🇩🇴';
        if (c.includes('puerto rico')) return '🇵🇷';
        if (c.includes('cuba')) return '🇨🇺';
        return <i className="fas fa-globe-americas text-indigo-400"></i>; 
    };

    const statuses = [
        { id: '1_arb', name: '1. ARB Intake', color: 'bg-slate-100 text-slate-800' },
        { id: '2_architecture', name: '2. Architecture', color: 'bg-blue-100 text-blue-800' },
        { id: '3_planning', name: '3. Planning', color: 'bg-indigo-100 text-indigo-800' },
        { id: '4_execution', name: '4. Execution', color: 'bg-amber-100 text-amber-800' },
        { id: '5_postlive', name: '5. Post-Live', color: 'bg-purple-100 text-purple-800' },
        { id: '6_completed', name: 'Completed', color: 'bg-emerald-100 text-emerald-800' }
    ];

    const filtered = (projects || []).filter(p => p && !p.isWaiting && String(p.name || '').toUpperCase().includes(searchTerm.toUpperCase()));

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto pb-12">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><i className="fas fa-layer-group text-indigo-600"></i> Master Pipeline</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Cross-Functional Migration Delivery Portfolio</p>
                </div>
                <div className="flex gap-3 items-center">
                    <input type="text" placeholder="Search projects..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 w-64" />
                    <button onClick={handleExportCSV} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-slate-600 shadow-sm"><i className="fas fa-download mr-2"></i> Export CSV</button>
                    <button onClick={() => setActivePhase('radar')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors ml-2"><i className="fas fa-plus mr-2"></i> New Project</button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[600px] custom-scrollbar pb-16">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-0 border-r border-slate-200 align-top">
                                    <div className="resize-x overflow-hidden min-w-[200px] w-72 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Project & Identity</div>
                                </th>
                                <th className="p-0 border-r border-slate-200 align-top">
                                    <div className="resize-x overflow-hidden min-w-[60px] w-20 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Country</div>
                                </th>
                                <th className="p-0 border-r border-slate-200 align-top">
                                    <div className="resize-x overflow-hidden min-w-[150px] w-40 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Phase & Progress</div>
                                </th>
                                <th className="p-0 border-r border-slate-200 align-top">
                                    <div className="resize-x overflow-hidden min-w-[100px] w-32 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">MRR & Comp</div>
                                </th>
                                <th className="p-0 border-r border-slate-200 align-top">
                                    <div className="resize-x overflow-hidden min-w-[150px] w-48 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Timelines (Edit)</div>
                                </th>
                                <th className="p-0 border-r border-slate-200 align-top">
                                    <div className="resize-x overflow-hidden min-w-[120px] w-32 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">SA / Partner</div>
                                </th>
                                <th className="p-0 border-r border-slate-200 align-top">
                                    <div className="resize-x overflow-hidden min-w-[150px] w-auto p-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Blockers / Notes (Edit)</div>
                                </th>
                                <th className="p-0 align-top">
                                    <div className="min-w-[80px] w-24 p-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Actions</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(p => {
                                const statusObj = statuses.find(s => s.id === p.lifecycleState) || statuses[0];
                                const progNum = parseInt(p.progress) || 0;
                                const targetId = p.id || p._id || p.projectId;

                                return (
                                    <tr key={targetId || Math.random()} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="p-4 align-top cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => openProject(targetId)} title="Click to Open Project Context">
                                            <div className="font-black text-sm text-indigo-700 w-full uppercase truncate">{p.name || 'UNNAMED PROJECT'}</div>
                                            <div className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-1 w-max mt-2 uppercase">
                                                {p.customerName || (p.name || '').split('-')[0] || 'UNLINKED'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center align-top pt-5">
                                            <div className="text-3xl cursor-help select-none hover:scale-110 transition-transform" title={p.country || 'No Country Configured'}>{getFlag(p.country)}</div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded w-max mb-3 border border-transparent shadow-sm ${statusObj.color}`}>
                                                {statusObj.name}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
                                                    <div className={`h-full transition-all ${p.health==='Red'?'bg-rose-500':p.health==='Yellow'?'bg-amber-500':'bg-emerald-500'}`} style={{width: `${progNum}%`}}></div>
                                                </div>
                                                <EditableCell 
                                                    value={p.progress || '0%'}
                                                    onSave={(newProgress) => handleUpdateProject(targetId, 'progress', newProgress)}
                                                    type="text"
                                                    className="text-[10px] font-black w-10 text-right text-slate-700"
                                                />
                                            </div>
                                            <EditableCell 
                                                value={p.health || 'Green'}
                                                onSave={(newHealth) => handleUpdateProject(targetId, 'health', newHealth)}
                                                type="select"
                                                placeholder="health"
                                                className="text-[9px] font-bold uppercase tracking-widest mt-1 w-20"
                                            />
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="font-black text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 w-max shadow-sm mb-2">${p.mrr || 0}</div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{p.complexity || 'MEDIUM'} COMP</div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 w-max shadow-inner">
                                                <div className="flex items-center justify-between w-full gap-3 border-b border-slate-200 pb-1.5">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest"><i className="fas fa-flag-checkered text-blue-500 mr-1.5"></i> Start</span>
                                                    <input type="date" value={p.kickoff || ''} onChange={(e) => handleUpdateProject(targetId, 'kickoff', e.target.value)} className="bg-white border border-slate-200 hover:border-indigo-300 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 outline-none transition-colors shadow-sm cursor-pointer" />
                                                </div>
                                                <div className="flex items-center justify-between w-full gap-3 pt-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest"><i className="fas fa-rocket text-emerald-500 mr-1.5"></i> Live</span>
                                                    <input type="date" value={p.date || ''} onChange={(e) => handleUpdateProject(targetId, 'date', e.target.value)} className="bg-white border border-slate-200 hover:border-indigo-300 rounded px-1.5 py-0.5 text-[10px] font-mono font-black text-emerald-700 outline-none transition-colors shadow-sm cursor-pointer" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top space-y-2">
                                            <div>
                                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Sales Arch</div>
                                                <div className="text-xs font-bold text-blue-700 uppercase truncate max-w-[150px]">{p.sa || 'UNASSIGNED'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Partner</div>
                                                <div className="text-xs font-bold text-slate-700 uppercase truncate max-w-[150px]">{p.partner || 'TBD'}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <textarea value={p.blocker || ''} onChange={e => handleUpdateProject(targetId, 'blocker', e.target.value)} placeholder="Type notes or current blockers..." className="w-full h-16 bg-amber-50/50 hover:bg-white border border-amber-100 hover:border-amber-300 rounded-lg p-2 text-[10px] font-medium text-slate-700 outline-none focus:border-amber-500 custom-scrollbar leading-relaxed resize-none transition-colors shadow-inner" />
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!targetId) {
                                                        alert("This project lacks a valid ID (likely a manual database entry). Please remove it directly from the database.");
                                                        return;
                                                    }
                                                    handleDeleteProject(targetId);
                                                }}
                                                className={`px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm ${!targetId ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border-rose-200 hover:border-rose-300'}`}
                                                title={!targetId ? "Cannot delete: Missing DB Identity" : "Delete Project"}
                                            >
                                                <i className="fas fa-trash-alt mr-1"></i> Delete
                                            </button>
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
