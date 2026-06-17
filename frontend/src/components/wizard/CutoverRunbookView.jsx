import React, { useMemo } from 'react';
import { EditableCell } from '../../utils/helpers';

export default function CutoverRunbookView({ activeProject, onUpdateProject }) {
    const runbook = activeProject?.runbook || [];

    // Calculate dynamic completion percentage to bubble up to the WBS
    const completedCount = runbook.filter(t => t.status === 'Completed').length;
    const progressPct = runbook.length > 0 ? Math.round((completedCount / runbook.length) * 100) : 0;

    const handleUpdate = (id, field, value) => {
        const updated = runbook.map(r => r.id === id ? {...r, [field]: value} : r);
        onUpdateProject(activeProject.id, 'runbook', updated);
    };

    const handleAddManualTask = () => {
        const newTask = { 
            id: `rb_${Date.now()}`, 
            taskId: "Custom", 
            name: "New Cutover Task", 
            start: "", 
            estHours: 0, 
            actualHours: 0, 
            status: 'Pending', 
            owner: 'Unassigned' 
        };
        onUpdateProject(activeProject.id, 'runbook', [...runbook, newTask]);
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in flex flex-col h-full">
            
            {/* 🚨 VISUAL RUNBOOK PROGRESS BAR */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 shrink-0 flex items-center gap-6">
                <div className="w-16 h-16 rounded-full border-4 border-rose-100 flex items-center justify-center shrink-0 bg-rose-50">
                    <span className="text-xl font-black text-rose-600">{progressPct}%</span>
                </div>
                <div className="flex-1">
                    <h4 className="font-black text-slate-800 text-lg mb-1">Downtime Window Execution Tracker</h4>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
                        <span>{completedCount} Tasks Completed</span>
                        <span>{runbook.length} Total Steps</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-clipboard-list text-rose-400 mr-2"></i> Critical Cutover Runbook</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Minute-by-minute operational checklist for the cutover window.</p>
                    </div>
                    <button onClick={handleAddManualTask} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">
                        <i className="fas fa-plus mr-2"></i> Add Step
                    </button>
                </div>
                <div className="flex-1 bg-slate-50 overflow-x-auto custom-scrollbar relative">
                    {/* Visual Timeline Line */}
                    <div className="absolute left-[39px] top-0 bottom-0 w-0.5 bg-slate-200 z-0"></div>
                    
                    <table className="w-full text-left min-w-[1000px] relative z-10">
                        <thead className="bg-slate-200/90 backdrop-blur-sm text-[10px] uppercase text-slate-600 border-b-2 border-slate-300 tracking-wider sticky top-0 shadow-sm">
                            <tr>
                                <th className="p-4 w-24 text-center font-black">Check</th>
                                <th className="p-4 w-48 font-black">Scheduled Time</th>
                                <th className="p-4 font-black">Cutover Event / Action</th>
                                <th className="p-4 w-32 font-black">Est. Duration</th>
                                <th className="p-4 w-48 font-black">RACI Owner</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs bg-transparent">
                            {runbook.map((task, index) => {
                                const isDone = task.status === 'Completed';
                                const isActive = task.status === 'Active';
                                
                                return (
                                    <tr key={task.id} className={`group transition-colors ${isDone ? 'bg-emerald-50/40 opacity-70' : isActive ? 'bg-rose-50/60' : 'bg-white hover:bg-slate-50'}`}>
                                        <td className="p-4 text-center relative">
                                            {/* Timeline Node */}
                                            <div className={`mx-auto w-6 h-6 rounded-full border-4 flex items-center justify-center transition-colors shadow-sm cursor-pointer
                                                ${isDone ? 'bg-emerald-500 border-emerald-200 text-white' : isActive ? 'bg-rose-500 border-rose-200 text-white animate-pulse' : 'bg-white border-slate-300 text-transparent hover:border-rose-400'}`}
                                                onClick={() => handleUpdate(task.id, 'status', isDone ? 'Pending' : isActive ? 'Completed' : 'Active')}
                                                title="Click to toggle status (Pending -> Active -> Completed)"
                                            >
                                                <i className={`fas fa-check text-[10px] ${isDone ? 'opacity-100' : 'opacity-0'}`}></i>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-slate-600"><EditableCell type="datetime-local" value={task.start} onSave={v=>handleUpdate(task.id, 'start', v)} /></td>
                                        <td className={`p-4 font-bold ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}><EditableCell value={task.name} onSave={v=>handleUpdate(task.id, 'name', v)} /></td>
                                        <td className="p-4 font-mono text-slate-500"><EditableCell type="number" value={task.estHours} onSave={v=>handleUpdate(task.id, 'estHours', parseFloat(v)||0)} /> <span className="text-[10px] uppercase">hours</span></td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded font-black text-slate-600 text-[10px] uppercase tracking-widest inline-block">
                                                <EditableCell value={task.owner} onSave={v=>handleUpdate(task.id, 'owner', v)} />
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {runbook.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center text-slate-400 font-bold border-2 border-dashed bg-white m-4 rounded-xl relative z-10">
                                        <i className="fas fa-clipboard-list text-3xl mb-3 text-slate-300"></i>
                                        <p>No runbook tasks scheduled yet.</p>
                                        <button onClick={handleAddManualTask} className="mt-4 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200 transition-colors border border-slate-300">Add First Step</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
