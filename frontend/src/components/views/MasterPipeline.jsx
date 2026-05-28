import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell, formatShortDate } from '../../utils/helpers';
import TwoFactorModal from '../utils/TwoFactorModal';

export default function MasterPipeline() {
    const { projects, handleUpdateProject, handleDeleteProject, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    const [menuOpen, setMenuOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    
    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);
    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);

    const getHealthBadge = (h) => { 
        if(h==='Green') return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-200 whitespace-nowrap"><i className="fas fa-check-circle"></i> On Track</span>; 
        if(h==='Red') return <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[9px] font-bold border border-rose-200 whitespace-nowrap"><i className="fas fa-times-circle"></i> Blocked</span>; 
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px] font-bold border border-amber-200 whitespace-nowrap"><i className="fas fa-clock"></i> At Risk</span>; 
    };
    const getStateLabel = (s) => { const map = {'1_arb':'1. ARB Intake', '2_architecture':'2. Architecture', '3_planning':'3. Planning', '4_execution':'4. Execution', '5_postlive':'5. Post-Live'}; return map[s] || s; };

    const handleSalesExport = () => {
        const headers = ["Customer", "Country", "Phase", "Go-Live Date", "Target MRR", "Overall Health", "Executive Summary"];
        const csvContent = [headers.join(","), ...activeProjects.map(p => { 
            let execSummary = p.health === 'Green' ? "On track for standard delivery." : p.health === 'Yellow' ? "Minor delays, actively managed." : `Critical blocker escalated: ${(p.blocker || '').replace(/"/g, '""')}`;
            let status = getStateLabel(p.lifecycleState).replace(/[0-9]. /g, '');
            return [`"${(p.name || '').replace(/"/g, '""')}"`, `"${(p.country || '').replace(/"/g, '""')}"`, `"${status}"`, `"${formatShortDate(p.date)}"`, `"${fm(p.mrr)}"`, `"${p.health || ''}"`, `"${execSummary}"`].join(","); 
        })].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Sales_Exec_Pipeline_${new Date().toISOString().split('T')[0]}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const executeDelete = () => {
        if (projectToDelete) {
            handleDeleteProject(projectToDelete);
            setProjectToDelete(null);
        }
    };

    const navigateToProject = (id) => {
        setActiveProjectId(id);
        setActivePhase('wizard');
    };

    const targetProjectName = activeProjects.find(p => p.id === projectToDelete)?.name || 'Unknown Project';

    return (
        <div className="animate-fade-in max-w-[2000px] mx-auto pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
                <div className="px-4 md:px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap gap-4 justify-between items-center">
                    <h3 className="font-black text-lg tracking-wide"><i className="fas fa-list-alt text-emerald-400 mr-2"></i> Master Execution Pipeline</h3>
                    <div className="flex gap-3 items-center flex-wrap relative">
                        <button onClick={()=>setMenuOpen(!menuOpen)} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-md transition-colors border border-slate-600 focus:outline-none"><i className="fas fa-ellipsis-v"></i></button>
                        {menuOpen && (
                            <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
                                <button onClick={()=>{handleSalesExport(); setMenuOpen(false);}} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 bg-blue-50/50 transition-colors"><i className="fas fa-file-invoice text-blue-500 w-5 text-center"></i> Export Sales Summary</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto w-full bg-slate-50 flex-1 custom-scrollbar">
                    <table className="w-full min-w-[1400px] text-left border-collapse">
                    <thead className="bg-slate-200 text-slate-600 text-[10px] uppercase border-b-2 border-slate-300 tracking-wider">
                        <tr>
                            <th className="px-4 py-4 w-[15%]">Customer / Phase</th>
                            <th className="px-4 py-4 w-[8%]">Country</th>
                            <th className="px-4 py-4 w-[10%]">Health & Prog</th>
                            <th className="px-4 py-4 w-[8%]">MRR / Comp</th>
                            <th className="px-4 py-4 w-[12%]">Timeline</th>
                            <th className="px-4 py-4 w-[10%]">SA / Partner</th>
                            <th className="px-4 py-4 w-[15%]">Scope</th>
                            <th className="px-4 py-4 min-w-[200px]">Blockers / Notes (Editable)</th>
                            <th className="px-4 py-4 w-[5%] text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-xs">
                        {activeProjects.map((p) => (
                        <tr key={p.id} className="hover:bg-blue-50/50 transition-colors group">
                            <td className="px-4 py-4 align-top">
                                <div onClick={() => navigateToProject(p.id)} className="font-black text-sm text-slate-800 cursor-pointer hover:text-blue-600 hover:underline transition-colors" title="Open Project Workspace">{p.name}</div>
                                <div className="text-[9px] font-black uppercase mt-1.5 bg-blue-100 text-blue-800 inline-block px-2 py-0.5 rounded border border-blue-200 tracking-widest">{getStateLabel(p.lifecycleState)}</div>
                            </td>
                            <td className="px-4 py-4 align-top"><div className="font-bold text-slate-700 flex items-center bg-slate-100 px-2 py-1 rounded w-max border border-slate-200"><i className="fas fa-globe-americas mr-1.5 text-slate-400"></i>{p.country || 'TBD'}</div></td>
                            <td className="px-4 py-4 align-top">
                                <div className="mb-2">{getHealthBadge(p.health)}</div>
                                <div className="flex items-center gap-2" title="Auto-calculated from Execution WBS">
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className={`h-full transition-all ${p.health==='Green'?'bg-emerald-500':p.health==='Red'?'bg-rose-500':'bg-amber-500'}`} style={{width: `${parseInt(p.progress)||0}%`}}></div></div>
                                    <span className="text-[10px] font-black">{p.progress || '0%'}</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                                <div className="font-black text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2 py-1 w-max shadow-sm">${p.mrr || 0}</div>
                                <div className="text-[9px] font-bold uppercase mt-2 text-slate-500 tracking-wider">{p.complexity || 'Medium'}</div>
                            </td>
                            <td className="px-4 py-4 align-top">
                                <div className="flex flex-col gap-1.5 text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5"><span className="font-bold text-slate-500 uppercase tracking-wider"><i className="fas fa-flag-checkered text-blue-500 mr-1.5"></i> Start:</span> <span className="font-mono font-bold">{formatShortDate(p.kickoff)}</span></div>
                                    <div className="flex items-center justify-between pt-1"><span className="font-bold text-slate-500 uppercase tracking-wider"><i className="fas fa-rocket text-emerald-500 mr-1.5"></i> Live:</span> <span className="font-mono font-black text-emerald-700">{formatShortDate(p.date)}</span></div>
                                </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                                <div className="font-black text-blue-700 mb-1.5 truncate">{p.sa || 'TBD'}</div>
                                <div className="text-[10px] font-bold text-slate-600 bg-slate-100 p-1.5 rounded border border-slate-200 truncate">Partner: {p.partner || 'TBD'}</div>
                            </td>
                            <td className="px-4 py-4 align-top">
                                <div className="text-[10px] font-bold text-slate-700 bg-purple-50 p-2 rounded-lg border border-purple-100 leading-relaxed max-h-20 overflow-y-auto custom-scrollbar">{p.scope || p.discoveryNotes || 'No scope provided.'}</div>
                            </td>
                            <td className="px-4 py-4 align-top">
                                {/* 🚨 ONLY BLOCKERS ARE EDITABLE IN THE PIPELINE */}
                                <div className="text-[11px] font-medium text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-200 h-full min-h-[60px] leading-relaxed shadow-inner hover:border-blue-400 transition-colors">
                                    <EditableCell type="textarea" value={p.blocker} onSave={v=>handleUpdateProject(p.id,'blocker',v)} placeholder="Log escalations or blockers..." />
                                </div>
                            </td>
                            <td className="px-4 py-4 align-middle text-center">
                                <button 
                                    onClick={() => setProjectToDelete(p.id)} 
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all p-2 rounded shadow-sm border border-slate-200 hover:border-rose-200 bg-white"
                                    title="Delete Project"
                                >
                                    <i className="fas fa-trash-alt text-lg"></i>
                                </button>
                            </td>
                        </tr>
                        ))}
                        {activeProjects.length === 0 && <tr><td colSpan="9" className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-xs">No active projects in pipeline.</td></tr>}
                    </tbody>
                    </table>
                </div>
            </div>

            {projectToDelete && (
                <TwoFactorModal 
                    actionName={`Delete Project: ${targetProjectName}`} 
                    onConfirm={executeDelete} 
                    onCancel={() => setProjectToDelete(null)} 
                />
            )}
        </div>
    )
}
