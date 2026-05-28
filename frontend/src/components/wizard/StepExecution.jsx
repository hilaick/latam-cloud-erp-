import React, { useState } from 'react';

export default function StepExecution({ project, onUpdateProject }) {
    const [subTab, setSubTab] = useState('tasks');
    const [apiState, setApiState] = useState({ loading: false, logs: project.lastDeploymentLogs || null, error: false });
    
    const plan = project.migrationPlan || [];
    const runbook = project.runbook || [];

    const handlePlanUpdate = (taskId, val) => {
        onUpdateProject(project.id, 'migrationPlan', plan.map(t => String(t.id) === String(taskId) ? {...t, prog: val} : t));
    };

    const handleRunbookUpdate = (id, val) => {
        onUpdateProject(project.id, 'runbook', runbook.map(r => String(r.id) === String(id) ? {...r, actualHours: parseFloat(val)||0} : r));
    };

    const totalEst = runbook.reduce((sum, r) => sum + r.estHours, 0);
    const totalActual = runbook.reduce((sum, r) => sum + r.actualHours, 0);
    const shadowDelta = totalActual - totalEst;

    const triggerLandingZone = async () => {
        if(!confirm(`Deploy Landing Zone to Huawei Cloud for ${project.name}?`)) return;
        setApiState({ loading: true, logs: "Parsing Blueprint...\\nAuthenticating with Huawei Cloud API...\\nPreparing Terraform state...", error: false });
        
        try {
            const token = localStorage.getItem('erp_jwt_token');
            if (!token) {
                throw new Error("Authentication required. Please log in again.");
            }

            const res = await fetch('/api/deploy/landing_zone', { 
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }, 
                body: JSON.stringify({ id: project.id }) 
            });
            
            if (res.status === 401) {
                throw new Error("Authentication failed. Please log in again.");
            }
            
            const data = await res.json();
            
            if (data.success) {
                const logText = data.logs.join('\n');
                setApiState({ loading: false, logs: logText, error: false });
                onUpdateProject(project.id, 'lastDeploymentLogs', logText);
            } else {
                setApiState({ loading: false, logs: `API Error: ${data.error}`, error: true });
            }
        } catch(e) { 
            setApiState({ loading: false, logs: `Network Error: ${e.message}`, error: true }); 
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-4 mb-8 border-b border-slate-200 pb-4 overflow-x-auto">
                <button onClick={()=>setSubTab('tasks')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap ${subTab==='tasks'?'bg-emerald-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-check-square mr-2"></i> Task Execution Board</button>
                <button onClick={()=>setSubTab('deploy')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap ${subTab==='deploy'?'bg-indigo-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-cloud-upload-alt mr-2"></i> Native Orchestration</button>
            </div>

            {subTab === 'tasks' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b border-slate-100 pb-6 gap-6">
                        <div>
                            <h3 className="font-black text-xl text-slate-800"><i className="fas fa-check-square text-emerald-500 mr-2"></i> Active Task Execution</h3>
                            <p className="text-xs text-slate-500 mt-1">Track WBS progress and log actual hours against the Runbook estimates.</p>
                        </div>
                        <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap gap-6 items-center shadow-lg w-full xl:w-auto">
                            <div><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Shadow Mode</div><div className="text-xs font-bold text-emerald-400 flex items-center"><span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Active Tracking</div></div>
                            <div className="border-l border-slate-700 pl-6"><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Est. Baseline</div><div className="text-lg font-black">{totalEst}h</div></div>
                            <div className="border-l border-slate-700 pl-6"><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Actual Billed</div><div className={`text-lg font-black ${shadowDelta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{totalActual}h</div></div>
                            <div className="border-l border-slate-700 pl-6"><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Commercial Variance</div><div className={`text-xs font-black px-2 py-1 rounded ${shadowDelta > 0 ? 'bg-rose-500/20 text-rose-400' : shadowDelta < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>{shadowDelta > 0 ? '+' : ''}{shadowDelta}h</div></div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[800px]">
                            <thead className="bg-slate-100 uppercase text-slate-500 text-[10px]">
                                <tr>
                                    <th className="p-3 w-24">WBS ID</th>
                                    <th className="p-3">Task Name</th>
                                    <th className="p-3 w-32">Progress</th>
                                    <th className="p-3 w-64">Timesheet (Shadow Mode)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {plan.length === 0 ? (
                                    <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold">No tasks generated in planning phase.</td></tr>
                                ) : (
                                    plan.map(t => {
                                        const rb = runbook.find(r => String(r.taskId) === String(t.id));
                                        return (
                                            <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${t.isParent ? 'bg-slate-50' : ''}`}>
                                                <td className="p-3 font-mono text-slate-500 font-bold">{t.id}</td>
                                                <td className={`p-3 ${t.isParent ? 'text-slate-800 text-sm font-black' : 'text-slate-600 font-bold pl-8'}`}>{t.name}</td>
                                                <td className="p-3">
                                                    {!t.isParent ? (
                                                        <select value={t.prog||'0%'} onChange={e=>handlePlanUpdate(t.id, e.target.value)} className={`border p-1.5 rounded font-black outline-none focus:border-emerald-500 w-full ${t.prog==='100%'?'bg-emerald-100 text-emerald-800 border-emerald-300':'bg-white text-slate-700 border-slate-300'}`}>
                                                            <option>0%</option><option>25%</option><option>50%</option><option>75%</option><option>100%</option>
                                                        </select>
                                                    ) : (
                                                        <div className="bg-slate-200 h-2 w-full rounded-full overflow-hidden"><div className="bg-slate-400 h-full w-full"></div></div>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    {rb ? (
<div className="flex gap-2 items-center bg-slate-50 p-1.5 rounded border border-slate-200">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Est: {rb.estHours}h | Act:</span>
                                                            <input type="number" step="0.5" disabled={t.prog!=='100%'} value={rb.actualHours||''} onChange={e=>handleRunbookUpdate(rb.id, e.target.value)} className="w-16 border border-slate-300 p-1 rounded text-xs font-black disabled:bg-slate-200 outline-none focus:border-emerald-500" placeholder="0.0"/>
                                                        </div>
                                                    ) : (
                                                        !t.isParent ? <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Not in Runbook</span> : null
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {subTab === 'deploy' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                    <div className="p-8 md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
                        <h3 className="font-black text-lg tracking-wide text-slate-800 mb-4"><i className="fas fa-server text-blue-500 mr-2"></i> Native Orchestration</h3>
                        <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium">Deploy the baseline infrastructure identified by the AI Analysis directly from the Blueprint into the Huawei Cloud Destination Region.</p>
                        
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-8">
                            <div className="text-[10px] uppercase font-black text-indigo-500 tracking-widest mb-2">Target Configuration</div>
                            <div className="text-xs font-bold text-slate-700 flex justify-between mb-1"><span>Region:</span> <span className="text-indigo-700">{project.customerProfile?.region || 'la-south-2'}</span></div>
                            <div className="text-xs font-bold text-slate-700 flex justify-between"><span>Auth Type:</span> <span className="text-indigo-700">AK/SK IAM Proxy</span></div>
                        </div>

                        <button onClick={triggerLandingZone} disabled={apiState.loading} className="mt-auto w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-md active:scale-95">
                            {apiState.loading ? (<span><i className="fas fa-spinner fa-spin mr-2"></i> Orchestrating...</span>) : (<span><i className="fas fa-rocket mr-2"></i> Deploy Landing Zone</span>)}
                        </button>
                    </div>
                    <div className="p-6 md:w-2/3 bg-slate-900 font-mono text-xs leading-relaxed relative overflow-y-auto">
                        <div className="absolute top-0 left-0 w-full p-2 bg-slate-800 border-b border-slate-700 text-slate-400 text-[10px] uppercase tracking-widest flex items-center justify-between">
                            <span><i className="fas fa-terminal mr-2"></i> Huawei Cloud CLI Output</span>
                            {apiState.loading && <span className="text-emerald-400 animate-pulse">Connection Active...</span>}
                        </div>
                        <div className={`mt-8 whitespace-pre-wrap ${apiState.error ? 'text-rose-400' : 'text-emerald-400'}`}>
{apiState.logs || "// Terminal Output\n// Awaiting Execution Commands..."}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}