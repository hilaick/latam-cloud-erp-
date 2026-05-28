import React, { useState, useEffect, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function MasterExecutionHub() {
    const { projects } = useContext(ERPContext);
    const [globalTasks, setGlobalTasks] = useState([]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('erp_jwt_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    };

    useEffect(() => {
        fetch('/api/wbs/global', { headers: getAuthHeaders() }).then(r => r.json()).then(d => { 
            if (d.success) setGlobalTasks(d.tasks); 
        });
    }, []);

    const updateTaskProgress = async (taskId, newProgress) => {
        await fetch('/api/wbs/task', { 
            method: 'POST', 
            headers: getAuthHeaders(), 
            body: JSON.stringify({ id: taskId, progress: newProgress }) 
        });
        setGlobalTasks(globalTasks.map(t => t.id === taskId ? { ...t, progress: newProgress } : t));
    };

    return (
        <div className="max-w-[1800px] mx-auto space-y-6 pb-12 animate-fade-in">
            <div className="bg-slate-900 p-8 rounded-2xl shadow-xl text-white flex justify-between items-center border border-slate-700">
                <div>
                    <h2 className="text-3xl font-black mb-2">
                        <i className="fas fa-chess-board text-blue-400 mr-3"></i> Master Execution Hub
                    </h2>
                    <p className="text-sm text-slate-400">Aggregated view of all active WBS tasks across the regional portfolio.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Active Tasks</div>
                    <div className="text-3xl font-black text-emerald-400">{globalTasks.length}</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] uppercase text-slate-600 border-b border-slate-200">
                        <tr>
                            <th className="p-4">Project</th>
                            <th className="p-4">WBS ID</th>
                            <th className="p-4">Task Description</th>
                            <th className="p-4">RACI Owner</th>
                            <th className="p-4">Progress</th>
                            <th className="p-4">Dates</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {globalTasks.map(t => {
                            const proj = projects.find(p => p.id === t.project_id);
                            return (
                                <tr key={t.id} className={t.is_parent ? "bg-slate-50 font-bold border-t-2 border-slate-200" : "hover:bg-blue-50"}>
                                    <td className="p-4 font-black text-slate-800">{proj ? proj.name : t.project_id}</td>
                                    <td className="p-4 font-mono text-slate-500">{t.wbs_id}</td>
                                    <td className="p-4">{t.name}</td>
                                    <td className="p-4">
                                        <span className="bg-slate-200 px-2 py-1 rounded text-[10px] font-black">{t.raci}</span>
                                    </td>
                                    <td className="p-4">
                                        {!t.is_parent ? (
                                            <select 
                                                value={t.progress} 
                                                onChange={e => updateTaskProgress(t.id, e.target.value)} 
                                                className={`border rounded p-1.5 text-xs font-black outline-none ${t.progress === '100%' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}
                                            >
                                                <option value="0%">0%</option>
                                                <option value="25%">25%</option>
                                                <option value="50%">50%</option>
                                                <option value="75%">75%</option>
                                                <option value="100%">100%</option>
                                            </select>
                                        ) : (
                                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                <div className="bg-slate-400 h-full w-full"></div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 font-mono text-[10px]">{t.start_date} - {t.end_date}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}