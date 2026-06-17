import React, { useContext } from 'react';
import { EditableCell } from '../../utils/helpers';
import { ERPContext } from '../../context/ERPContext';

export default function DedicatedMigrationPlan({ activeProject, onUpdateProject }) {
    const { customPlaybooks } = useContext(ERPContext);

    const handlePlanUpdate = (taskId, field, value) => {
        if(!activeProject) return;
        const newPlan = (activeProject.migrationPlan || []).map(t => String(t.id) === String(taskId) ? {...t, [field]: value} : t);
        
        // 🚨 FIX: Corrected signature to save the Migration Plan
        onUpdateProject(activeProject.id, 'migrationPlan', newPlan);
        
        // 🚨 FIX: Auto-calculate and bubble up the overall project progress
        if (field === 'prog') {
            const childTasks = newPlan.filter(t => !t.isParent);
            if (childTasks.length > 0) {
                let totalPercent = 0;
                childTasks.forEach(t => {
                    let val = t.prog || '0';
                    if (val === 'Auto') val = '0'; // Auto assumes 0% until the API updates it
                    totalPercent += parseInt(val.replace('%', '') || '0');
                });
                const overallProg = Math.round(totalPercent / childTasks.length) + '%';
                onUpdateProject(activeProject.id, 'progress', overallProg);
            }
        }
    };

    const injectPlaybook = (playbookKey) => {
        if(!playbookKey || !customPlaybooks[playbookKey]) return;
        if(window.confirm(`This will overwrite the current Migration Plan with '${customPlaybooks[playbookKey].name}'. Are you sure?`)) {
            // 🚨 FIX: Corrected signature for playbook injection
            onUpdateProject(activeProject.id, 'migrationPlan', JSON.parse(JSON.stringify(customPlaybooks[playbookKey].tasks)));
            onUpdateProject(activeProject.id, 'progress', '0%');
        }
    };

    const handleAddManualTask = () => {
        const id = window.prompt("Enter new WBS ID (e.g. 5.1):");
        if (!id) return;
        const newTask = { id, name: "New Custom Task", prog: "0%", resp: "Unassigned", start: "", end: "", isParent: !id.includes('.') };
        onUpdateProject(activeProject.id, 'migrationPlan', [...(activeProject.migrationPlan || []), newTask]);
    };

    if (!activeProject) return null;

    return (
        <div className="max-w-[1800px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-tasks text-blue-400 mr-2"></i> Master WBS & RACI Assignment Matrix</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Enterprise Playbook execution scheduling</p>
                    </div>
                    <div className="flex gap-3 items-center w-full md:w-auto">
                        <div className="flex items-center bg-slate-800 rounded-lg p-1.5 border border-slate-600 flex-1 md:flex-none">
                            <select onChange={e=>{injectPlaybook(e.target.value); e.target.value="";}} className="bg-transparent text-xs font-bold text-blue-300 outline-none px-2 cursor-pointer w-full md:w-64 truncate">
                                <option value="">-- Load Enterprise Playbook --</option>
                                {Object.entries(customPlaybooks || {}).map(([key, pb]) => (
                                    <option key={key} value={key}>{pb.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex-1 bg-slate-50 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-200 text-[10px] uppercase text-slate-600 border-b-2 border-slate-300 tracking-wider">
                            <tr>
                                <th className="p-4 w-16 text-center font-black">WBS ID</th>
                                <th className="p-4 w-1/3 font-black">Task Name</th>
                                <th className="p-4 w-48 font-black">Progress Status</th>
                                <th className="p-4 w-48 font-black text-indigo-700 bg-indigo-100/50"><i className="fas fa-users mr-1"></i> RACI Owner</th>
                                <th className="p-4 w-32 font-black">Start Date</th>
                                <th className="p-4 w-32 font-black">End Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs bg-white">
                            {(activeProject.migrationPlan || []).map(task => {
                                const progVal = task.prog?.includes('100') ? '100%' : task.prog?.includes('0') ? '0%' : 'Auto';
                                return (
                                    <tr key={task.id} className={`${task.isParent ? 'bg-slate-100 font-black border-t-2 border-slate-300' : 'hover:bg-blue-50/50 transition-colors'}`}>
                                        <td className="p-3 text-center font-mono text-slate-500 font-bold">{task.id}</td>
                                        <td className={`p-3 ${task.isParent ? 'text-slate-900 text-sm' : 'pl-10 text-slate-700 font-bold'}`}><EditableCell value={task.name} onSave={v=>handlePlanUpdate(task.id, 'name', v)} /></td>
                                        <td className="p-3">
                                            {!task.isParent && (
                                                <div className={`px-2 py-1.5 rounded-lg border-2 w-full shadow-sm ${progVal==='100%'?'bg-emerald-50 border-emerald-300 text-emerald-800':progVal==='0%'?'bg-slate-50 border-slate-300 text-slate-600':'bg-blue-50 border-blue-300 text-blue-800'}`}>
                                                    <select 
                                                        value={progVal} 
                                                        onChange={e=>handlePlanUpdate(task.id, 'prog', e.target.value)} 
                                                        className="w-full bg-transparent outline-none cursor-pointer text-center text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        <option value="Auto">[Auto] API Sync</option>
                                                        <option value="0%">[0%] Pending</option>
                                                        <option value="100%">[100%] Waived / Done</option>
                                                    </select>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-indigo-800 font-bold bg-indigo-50/30">
                                            <EditableCell type="select" placeholder="Select Role" value={task.resp} onSave={v=>handlePlanUpdate(task.id, 'resp', v)} />
                                        </td>
                                        <td className="p-3 font-mono font-bold text-slate-600"><EditableCell type="date" value={task.start} onSave={v=>handlePlanUpdate(task.id, 'start', v)} /></td>
                                        <td className="p-3 font-mono font-bold text-slate-600"><EditableCell type="date" value={task.end} onSave={v=>handlePlanUpdate(task.id, 'end', v)} /></td>
                                    </tr>
                                );
                            })}
                            {(!activeProject.migrationPlan || activeProject.migrationPlan.length === 0) && (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50">No WBS tasks defined. Load a playbook or generate from Topology Mapper.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 text-center border-t border-slate-200 bg-white">
                    <button onClick={handleAddManualTask} className="px-6 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition-colors w-full max-w-sm mx-auto">
                        <i className="fas fa-plus mr-2"></i> Append Manual Task
                    </button>
                </div>
            </div>
        </div>
    );
}
