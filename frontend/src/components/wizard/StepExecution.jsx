import React, { useState } from 'react';

export default function StepExecution({ project, onUpdateProject }) {
    const [subTab, setSubTab] = useState('tasks');
    const [apiState, setApiState] = useState({ loading: false, logs: project.lastDeploymentLogs || null, error: false });
    
    const plan = project.migrationPlan || [];
    const runbook = project.runbook || [];

    const handlePlanUpdate = (taskId, val) => onUpdateProject(project.id, 'migrationPlan', plan.map(t => t.id === taskId ? {...t, prog: val} : t));
    const handleRunbookUpdate = (id, val) => onUpdateProject(project.id, 'runbook', runbook.map(r => r.id === id ? {...r, actualHours: parseFloat(val)||0} : r));

    const totalEst = runbook.reduce((sum, r) => sum + r.estHours, 0);
    const totalActual = runbook.reduce((sum, r) => sum + r.actualHours, 0);
    const shadowDelta = totalActual - totalEst;

    const triggerLandingZone = async () => {
        if(!confirm(`Deploy Landing Zone to Huawei Cloud for ${project.name}?`)) return;
        setApiState({ loading: true, logs: "Parsing Blueprint...\nAuthenticating with Huawei Cloud API...", error: false });
        try {
            const res = await fetch('/api/deploy/landing_zone', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id: project.id }) });
            const data = await res.json();
            if (data.success) {
                const logText = data.logs.join('\n');
                setApiState({ loading: false, logs: logText, error: false });
                onUpdateProject(project.id, 'lastDeploymentLogs', logText);
            } else setApiState({ loading: false, logs: `API Error: ${data.error}`, error: true });
        } catch(e) { setApiState({ loading: false, logs: `Network Error: ${e.message}`, error: true }); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-4 mb-8 border-b border-slate-200 pb-4">
                <button onClick={()=>setSubTab('tasks')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='tasks'?'bg-emerald-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-check-square mr-2"></i> Task Execution Board</button>
                <button onClick={()=>setSubTab('deploy')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='deploy'?'bg-indigo-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-cloud-upload-alt mr-2"></i> Native Orchestration</button>
            </div>

            {subTab === 'tasks' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-6 gap-4">
                        <div><h3 className="font-black text-xl text-slate-800"><i className="fas fa-check-square text-emerald-500 mr-2"></i> Active Task Execution</h3></div>
                        <div className="bg-slate-900 text-white p-4 rounded-xl flex gap-6 items-center shadow-lg">
                            <div><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Shadow Mode</div><div className="text-xs font-bold text-emerald-400">Active Tracking</div></div>
                            <div className="border-l border-slate-700 pl-6"><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Est. Baseline</div><div className="text-lg font-black">{totalEst}h</div></div>
                            <div className="border-l border-slate-700 pl-6"><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Actual Billed</div><div className={`text-lg font-black ${shadowDelta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{totalActual}h</div></div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs"><thead className="bg-slate-100 uppercase text-slate-500 text-[10px]"><tr><th className="p-3">WBS ID</th><th className="p-3">Task Name</th><th className="p-3">Progress</th><th className="p-3">Timesheet (Shadow Mode)</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {plan.length === 0 ? <tr><td colSpan="4" className="p-6 text-center text-slate-400">No tasks generated.</td></tr> : 
                            plan.map(t => {
                                const rb = runbook.find(r => r.taskId === t.id);
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono text-slate-500">{t.id}</td>
                                        <td className={`p-3 font-bold ${t.isParent ? 'text-slate-800 text-sm' : 'text-slate-600 pl-8'}`}>{t.name}</td>
                                        <td className="p-3">{!t.isParent ? <select value={t.prog||'0%'} onChange={e=>handlePlanUpdate(t.id, e.target.value)} className={`border p-1.5 rounded font-black outline-none ${t.prog==='100%'?'bg-emerald-100 text-emerald-800 border-emerald-300':'bg-white text-slate-700'}`}><option>0%</option><option>25%</option><option>50%</option><option>75%</option><option>100%</option></select> : <div className="bg-slate-200 h-2 w-full rounded-full"></div>}</td>
                                        <td className="p-3">{rb ? <div className="flex gap-2 items-center"><span className="text-[10px] font-bold text-slate-400">Est: {rb.estHours}h | Act:</span><input type="number" step="0.5" disabled={t.prog!=='100%'} value={rb.actualHours||''} onChange={e=>handleRunbookUpdate(rb.id, e.target.value)} className="w-16 border border-slate-300 p-1.5 rounded text-xs font-black disabled:bg-slate-100 outline-none focus:border-emerald-500" placeholder="0.0"/></div> : (!t.isParent ? <span className="text-[10px] text-slate-300 italic">Not in Runbook</span> : null)}</td>
                                    </tr>
                                )
                            })}
                        </tbody></table>
                    </div>
                </div>
            )}

            {subTab === 'deploy' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                    <div className="p-6 md:w-1/2 bg-slate-50 border-r border-slate-200">
                        <h3 className="font-black text-sm tracking-wide text-slate-800 mb-4"><i className="fas fa-server text-blue-500 mr-2"></i> Native Orchestration</h3>
                        <p className="text-xs text-slate-500 mb-6">Deploy the baseline infrastructure identified by the AI Analysis directly from the Blueprint.</p>
                        <button onClick={triggerLandingZone} disabled={apiState.loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-colors shadow-md">Deploy Landing Zone</button>
                    </div>
                    <div className={`p-6 md:w-1/2 bg-slate-900 font-mono text-[11px] whitespace-pre-wrap ${apiState.error ? 'text-rose-400' : 'text-emerald-400'}`}>{apiState.loading && "Loading...\n"}{apiState.logs || "// Terminal Output\n// Awaiting Execution Commands..."}</div>
                </div>
            )}
        </div>
    );
}