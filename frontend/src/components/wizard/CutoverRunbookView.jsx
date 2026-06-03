import React, { useState } from 'react';
import { EditableCell } from '../../utils/helpers';

export default function CutoverRunbookView({ activeProject, onUpdateProject }) {
    // 🚨 FIX: Removed the hardcoded mock data. It now defaults to an empty array []
    const runbook = activeProject?.runbook || [];

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
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-calendar-check text-rose-400 mr-2"></i> Critical Cutover Runbook</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Minute-by-minute scheduling for the downtime window.</p>
                    </div>
                </div>
                <div className="flex-1 bg-slate-50 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-200 text-[10px] uppercase text-slate-600 border-b-2 border-slate-300 tracking-wider">
                            <tr>
                                <th className="p-4 w-48 font-black">Scheduled Time</th>
                                <th className="p-4 font-black">Cutover Event / Task</th>
                                <th className="p-4 w-32 font-black">Est. Duration</th>
                                <th className="p-4 w-48 font-black">Owner</th>
                                <th className="p-4 w-32 font-black">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs bg-white">
                            {runbook.map(task => (
                                <tr key={task.id} className="hover:bg-rose-50/30 transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-600"><EditableCell type="datetime-local" value={task.start} onSave={v=>handleUpdate(task.id, 'start', v)} /></td>
                                    <td className="p-4 font-bold text-slate-800"><EditableCell value={task.name} onSave={v=>handleUpdate(task.id, 'name', v)} /></td>
                                    <td className="p-4 font-mono text-slate-600"><EditableCell type="number" value={task.estHours} onSave={v=>handleUpdate(task.id, 'estHours', parseFloat(v)||0)} /> hours</td>
                                    <td className="p-4 font-bold text-slate-700"><EditableCell value={task.owner} onSave={v=>handleUpdate(task.id, 'owner', v)} /></td>
                                    <td className="p-4">
                                        <select value={task.status} onChange={e=>handleUpdate(task.id, 'status', e.target.value)} className={`border p-1.5 rounded-lg font-black outline-none shadow-sm ${task.status==='Completed'?'bg-emerald-50 text-emerald-700 border-emerald-200':task.status==='Active'?'bg-blue-50 text-blue-700 border-blue-200':'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            <option>Pending</option><option>Active</option><option>Completed</option><option>Failed</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {runbook.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50">
                                        No runbook tasks scheduled yet. Add tasks manually or populate from your Master WBS.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 text-center border-t border-slate-200 bg-white">
                    <button onClick={handleAddManualTask} className="px-6 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:border-rose-400 hover:text-rose-600 transition-colors w-full max-w-sm mx-auto">
                        <i className="fas fa-plus mr-2"></i> Append Runbook Task
                    </button>
                </div>
            </div>
        </div>
    );
}
