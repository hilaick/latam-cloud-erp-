import React, { useState } from 'react';
import { EditableCell } from '../../utils/helpers';

export default function CutoverRunbookView({ activeProject, onUpdateProject }) {
    const runbook = activeProject?.runbook || [
        { id: 1, taskId: "3.1", name: "Shutdown Source DB", start: "2026-04-10T22:00", estHours: 2, actualHours: 0, status: 'Pending', owner: 'Customer' },
        { id: 2, taskId: "3.2", name: "Final Delta Sync (SMS)", start: "2026-04-10T23:00", estHours: 4, actualHours: 0, status: 'Pending', owner: 'Partner' },
        { id: 3, taskId: "3.3", name: "DNS Cutover", start: "2026-04-11T03:00", estHours: 1, actualHours: 0, status: 'Pending', owner: 'All' }
    ];

    const handleUpdate = (id, field, value) => {
        const updated = runbook.map(r => r.id === id ? {...r, [field]: value} : r);
        onUpdateProject(activeProject.id, 'runbook', updated);
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
                <div className="flex-1 bg-slate-50 overflow-x-auto">
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
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
