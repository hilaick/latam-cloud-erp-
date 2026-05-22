import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell } from '../utils/EditableCell'; // Using your existing helper

export default function PlaybookStudio() {
    // If customPlaybooks isn't explicitly in Context yet, we use a local fallback to prevent crashes
    const context = useContext(ERPContext);
    const [localPlaybooks, setLocalPlaybooks] = useState({
        sap_enterprise_cutover: { name: 'SAP Enterprise Cutover', tasks: [] }
    });

    const safePlaybooks = context.customPlaybooks || localPlaybooks;
    const updatePlaybooks = context.setCustomPlaybooks || setLocalPlaybooks;

    const [selectedKey, setSelectedKey] = useState("sap_enterprise_cutover");
    const activePlaybook = safePlaybooks[selectedKey] || { name: 'Unknown Playbook', tasks: [] };

    const handleNewPlaybook = () => {
        const name = prompt("Enter new Playbook Name:");
        if(!name) return;
        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        updatePlaybooks({...safePlaybooks, [key]: { name, tasks: [] }});
        setSelectedKey(key);
    };

    const handleTaskUpdate = (taskId, field, value) => {
        const updatedTasks = (activePlaybook.tasks || []).map(t => t.id === taskId ? {...t, [field]: value} : t);
        updatePlaybooks({...safePlaybooks, [selectedKey]: {...activePlaybook, tasks: updatedTasks}});
    };

    const handleDeletePlaybook = () => {
        if(confirm(`Delete playbook '${activePlaybook.name}'?`)) {
            const newBooks = {...safePlaybooks};
            delete newBooks[selectedKey];
            updatePlaybooks(newBooks);
            setSelectedKey(Object.keys(newBooks)[0] || "");
        }
    };

    const handleAddTask = () => {
        const newId = prompt("Enter WBS ID (e.g., 4.1):");
        if(!newId) return;
        const isParent = !newId.includes('.');
        const newTask = { id: newId, name: "New Task", prog: "0%", resp: "Internal Delivery", start: "", end: "", isParent };
        updatePlaybooks({...safePlaybooks, [selectedKey]: {...activePlaybook, tasks: [...(activePlaybook.tasks||[]), newTask]}});
    };

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800"><i className="fas fa-book-open text-blue-600 mr-3"></i> Dynamic Playbook Studio</h2>
                    <p className="text-sm text-slate-500 mt-2">Design, edit, and save standardized LATAM migration methodologies (WBS) to inject into projects.</p>
                </div>
                <button onClick={handleNewPlaybook} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95"><i className="fas fa-plus mr-2"></i> Create Playbook</button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-80 space-y-3 shrink-0">
                    {Object.entries(safePlaybooks).map(([key, pb]) => (
                        <div key={key} onClick={()=>setSelectedKey(key)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedKey === key ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                            <div className="font-black text-sm text-slate-800">{pb.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{(pb.tasks||[]).length} Tasks defined</div>
                        </div>
                    ))}
                </div>
                
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[600px]">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-black text-lg text-slate-800">Editing: {activePlaybook?.name}</h3>
                        <div className="flex gap-2">
                            <button onClick={handleAddTask} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm"><i className="fas fa-plus mr-2"></i> Add Task</button>
                            <button onClick={handleDeletePlaybook} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold shadow-sm border border-rose-200"><i className="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-50 p-6 custom-scrollbar">
                        <table className="w-full text-left min-w-[800px] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <thead className="bg-slate-200 text-[10px] uppercase text-slate-600 border-b-2 border-slate-300 tracking-wider">
                                <tr>
                                    <th className="p-3 w-16 text-center font-black">WBS</th>
                                    <th className="p-3 font-black">Template Task Name</th>
                                    <th className="p-3 w-48 font-black">Default RACI Owner</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs">
                                {(activePlaybook?.tasks || []).map(task => (
                                    <tr key={task.id} className={`${task.isParent ? 'bg-slate-100 font-black border-t-2 border-slate-300' : 'hover:bg-blue-50/50 transition-colors'}`}>
                                        <td className="p-3 text-center font-mono text-slate-500 font-bold"><EditableCell value={task.id} onSave={v=>handleTaskUpdate(task.id, 'id', v)} /></td>
                                        <td className={`p-3 ${task.isParent ? 'text-slate-900 text-sm' : 'pl-10 text-slate-700 font-bold'}`}><EditableCell value={task.name} onSave={v=>handleTaskUpdate(task.id, 'name', v)} /></td>
                                        <td className="p-3 text-slate-700 font-bold"><EditableCell value={task.resp} onSave={v=>handleTaskUpdate(task.id, 'resp', v)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}