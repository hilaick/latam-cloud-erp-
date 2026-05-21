import React, { useState } from 'react';

export default function StepPlanning({ project, onUpdateProject }) {
    const [subTab, setSubTab] = useState('runbook');
    const plan = project.migrationPlan || [];
    const runbook = project.runbook || [];
    const oraRules = project.physicsData?.frictionProfile?.downtime || "Standard Weekend Outage Only";
    const [taskId, setTaskId] = useState('');
    const [windowDate, setWindowDate] = useState('');
    const [estHours, setEstHours] = useState('');

    const handleAddRunbookEntry = () => {
        if (!taskId || !windowDate || !estHours) return alert("Task, Date, and Estimated Hours required.");
        const taskName = plan.find(t => t.id === taskId)?.name || 'Unknown Task';
        const newEntry = { id: 'rb_'+Date.now(), taskId, taskName, windowDate, estHours: parseFloat(estHours), actualHours: 0 };
        onUpdateProject(project.id, 'runbook', [...runbook, newEntry]);
        setTaskId(''); setWindowDate(''); setEstHours('');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-4 mb-8 border-b border-slate-200 pb-4">
                <button onClick={()=>setSubTab('wbs')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='wbs'?'bg-purple-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-sitemap mr-2"></i> WBS Summary</button>
                <button onClick={()=>setSubTab('runbook')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='runbook'?'bg-purple-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-calendar-alt mr-2"></i> Cutover Runbook</button>
            </div>

            {subTab === 'runbook' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div><h3 className="font-black text-xl text-slate-800"><i className="fas fa-calendar-alt text-purple-500 mr-2"></i> Cutover Runbook</h3><p className="text-xs text-slate-500 mt-1">Schedule critical maintenance windows based on ORA friction rules.</p></div>
                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-right"><div className="text-[10px] font-black uppercase tracking-widest text-rose-500">ORA Friction Rule</div><div className="text-xs font-bold text-rose-800">{oraRules}</div></div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Critical Task</label><select value={taskId} onChange={e=>setTaskId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none"><option value="">-- Select WBS Task --</option>{plan.filter(t => !t.isParent).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Window</label><input type="datetime-local" value={windowDate} onChange={e=>setWindowDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none" /></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Est. Hrs</label><input type="number" step="0.5" value={estHours} onChange={e=>setEstHours(e.target.value)} className="w-24 p-2 border border-slate-300 rounded-lg text-xs outline-none" /></div>
                        <button onClick={handleAddRunbookEntry} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black shadow-md">Add</button>
                    </div>

                    <table className="w-full text-left text-xs"><thead className="bg-slate-100 uppercase text-slate-500 text-[10px]"><tr><th className="p-3">Task</th><th className="p-3">Maintenance Window</th><th className="p-3">Est. Hours</th><th className="p-3 text-center">Action</th></tr></thead>
                    <tbody>
                        {runbook.length === 0 ? <tr><td colSpan="4" className="p-6 text-center text-slate-400">No cutovers scheduled yet.</td></tr> : runbook.map(r => <tr key={r.id} className="border-t hover:bg-slate-50"><td className="p-3 font-bold">{r.taskName}</td><td className="p-3 font-mono text-blue-600">{new Date(r.windowDate).toLocaleString()}</td><td className="p-3 font-black text-slate-700">{r.estHours}h</td><td className="p-3 text-center"><button onClick={()=>onUpdateProject(project.id, 'runbook', runbook.filter(x => x.id !== r.id))} className="text-rose-500 hover:text-rose-700"><i className="fas fa-trash"></i></button></td></tr>)}
                    </tbody></table>
                </div>
            )}
            
            {subTab === 'wbs' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h3 className="font-black text-xl text-slate-800 mb-4">WBS Import</h3>
                    <p className="text-xs text-slate-500">WBS tracking is handled in Execution phase. Use Cutover Runbook to schedule critical tasks.</p>
                </div>
            )}
        </div>
    );
}