import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function MasterExecutionHub() {
    const { projects, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    const [globalTasks, setGlobalTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [raciFilter, setRaciFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    const getAuthHeaders = () => {
        const token = localStorage.getItem('erp_jwt_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    useEffect(() => {
        fetch('/api/wbs/global', { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(d => { 
                if (d.success) setGlobalTasks(d.tasks); 
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    const updateTaskProgress = async (taskId, newProgress) => {
        await fetch('/api/wbs/task', { 
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ id: taskId, progress: newProgress }) 
        });
        setGlobalTasks(globalTasks.map(t => t.id === taskId ? { ...t, progress: newProgress } : t));
    };

    const navigateToProject = (id) => {
        setActiveProjectId(id);
        setActivePhase('wizard'); // Teleports user directly to the exact project
    };

    // 🚨 ACTIONABLE PMO LOGIC: Filter and identify overdue tasks
    const processedTasks = useMemo(() => {
        const today = new Date();
        // Remove time for strict date comparison
        today.setHours(0,0,0,0);

        return globalTasks.filter(t => {
            // Check RACI
            if (raciFilter !== 'All' && t.raci !== raciFilter) return false;
            
            // Check Status
            const isComplete = t.progress === '100%';
            if (statusFilter === 'Completed' && !isComplete) return false;
            if (statusFilter === 'In Progress' && isComplete) return false;
            
            return true;
        }).map(t => {
            // Calculate if task is OVERDUE (End date has passed and progress is not 100%)
            let isOverdue = false;
            if (t.end_date && t.progress !== '100%') {
                const endDate = new Date(t.end_date);
                if (!isNaN(endDate.getTime()) && endDate < today) {
                    isOverdue = true;
                }
            }
            return { ...t, isOverdue };
        });
    }, [globalTasks, raciFilter, statusFilter]);

    // Statistics for the Header
    const stats = useMemo(() => {
        const total = processedTasks.length;
        const complete = processedTasks.filter(t => t.progress === '100%').length;
        const overdue = processedTasks.filter(t => t.isOverdue).length;
        return { total, complete, overdue };
    }, [processedTasks]);

    return (
        <div className="max-w-[1800px] mx-auto space-y-6 pb-12 animate-fade-in">
            
            {/* Actionable Dashboard Header */}
            <div className="bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black mb-2 text-white flex items-center">
                            <i className="fas fa-chess-board text-blue-400 mr-4"></i> PMO Master Execution Hub
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">Aggregated Action Dashboard of all regional WBS tasks. Monitor delays and track RACI accountability.</p>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="bg-slate-800/80 border border-slate-600 p-4 rounded-xl text-center min-w-[120px]">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Active Tasks</div>
                            <div className="text-3xl font-black text-blue-400">{stats.total}</div>
                        </div>
                        <div className="bg-emerald-900/30 border border-emerald-500/30 p-4 rounded-xl text-center min-w-[120px]">
                            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-1">Completed</div>
                            <div className="text-3xl font-black text-emerald-400">{stats.complete}</div>
                        </div>
                        <div className="bg-rose-900/30 border border-rose-500/30 p-4 rounded-xl text-center min-w-[120px] relative">
                            {stats.overdue > 0 && <div className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-lg animate-bounce">{stats.overdue}</div>}
                            <div className="text-[10px] uppercase tracking-widest text-rose-400 font-bold mb-1">Overdue Delays</div>
                            <div className="text-3xl font-black text-rose-400">{stats.overdue}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls & Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 border-r border-slate-200 pr-4">
                    <i className="fas fa-filter text-slate-400"></i>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-600">Filters:</span>
                </div>
                
                <select value={raciFilter} onChange={e=>setRaciFilter(e.target.value)} className="p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50 min-w-[180px] cursor-pointer">
                    <option value="All">All RACI Owners</option>
                    <option value="Huawei">Huawei PM / SA</option>
                    <option value="Partner">Partner Delivery</option>
                    <option value="Customer">Customer IT</option>
                </select>

                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50 min-w-[180px] cursor-pointer">
                    <option value="All">All Statuses</option>
                    <option value="In Progress">Pending / In Progress</option>
                    <option value="Completed">100% Completed</option>
                </select>
            </div>

            {/* Main Action Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 text-slate-400">
                            <i className="fas fa-circle-notch fa-spin text-3xl mr-3 text-blue-500"></i> Fetching Global Portfolio...
                        </div>
                    ) : processedTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-100 m-8 rounded-xl bg-slate-50">
                            <i className="fas fa-clipboard-check text-4xl mb-3 opacity-50"></i>
                            <h4 className="font-black text-lg text-slate-600">No Tasks Match Filters</h4>
                            <p className="text-xs font-medium mt-1">Try adjusting the RACI or Status filters above.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest font-black text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 w-10">Alert</th>
                                    <th className="p-4 w-64">Project Location</th>
                                    <th className="p-4 w-24">WBS ID</th>
                                    <th className="p-4">Task Description</th>
                                    <th className="p-4 w-32">RACI Owner</th>
                                    <th className="p-4 w-40">Progress Update</th>
                                    <th className="p-4 w-48">Target Dates</th>
                                    <th className="p-4 w-32 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {processedTasks.map(t => {
                                    const proj = projects.find(p => p.id === t.project_id);
                                    return (
                                        <tr key={t.id} className={`transition-colors group ${t.is_parent ? 'bg-slate-50 border-t-2 border-slate-200' : 'hover:bg-blue-50'} ${t.isOverdue ? 'bg-rose-50 hover:bg-rose-100' : ''}`}>
                                            
                                            {/* Alert Indicator */}
                                            <td className="p-4 text-center">
                                                {t.isOverdue ? <i className="fas fa-exclamation-circle text-rose-500 text-lg animate-pulse" title="Task is past its end date!"></i> : 
                                                 t.progress === '100%' ? <i className="fas fa-check-circle text-emerald-500 text-lg"></i> : 
                                                 <i className="fas fa-clock text-slate-300"></i>}
                                            </td>

                                            {/* Project Name */}
                                            <td className="p-4 font-black text-slate-800 truncate max-w-[250px] cursor-pointer hover:text-blue-600" onClick={() => navigateToProject(t.project_id)} title="Jump to Project">
                                                {proj ? proj.name : t.project_id}
                                                <div className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{proj?.customerName || 'Unknown Customer'}</div>
                                            </td>

                                            {/* WBS ID */}
                                            <td className="p-4 font-mono font-bold text-slate-400">{t.wbs_id}</td>

                                            {/* Task Name */}
                                            <td className={`p-4 font-bold ${t.is_parent ? 'text-slate-800 text-sm' : 'text-slate-600'}`}>{t.name}</td>

                                            {/* RACI */}
                                            <td className="p-4">
                                                {!t.is_parent && (
                                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                        t.raci === 'Huawei' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                        t.raci === 'Partner' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        t.raci === 'Customer' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {t.raci}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Progress Updater */}
                                            <td className="p-4">
                                                {!t.is_parent ? (
                                                    <select 
                                                        value={t.progress} 
                                                        onChange={e => updateTaskProgress(t.id, e.target.value)} 
                                                        className={`border rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer transition-colors shadow-sm ${
                                                            t.progress === '100%' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 
                                                            t.isOverdue ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-200' :
                                                            'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                                                        }`}
                                                    >
                                                        <option value="0%">0% Pending</option>
                                                        <option value="25%">25% Started</option>
                                                        <option value="50%">50% Halfway</option>
                                                        <option value="75%">75% Nearing</option>
                                                        <option value="100%">100% Done</option>
                                                    </select>
                                                ) : (
                                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
                                                        <div className="bg-slate-400 h-full w-full"></div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Dates */}
                                            <td className="p-4">
                                                {!t.is_parent && (
                                                    <div className="flex flex-col gap-1 text-[10px] font-mono font-bold">
                                                        <div className="text-slate-500">Start: {t.start_date || 'TBD'}</div>
                                                        <div className={t.isOverdue ? 'text-rose-600' : 'text-slate-700'}>End: &nbsp;{t.end_date || 'TBD'}</div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Direct Navigation */}
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => navigateToProject(t.project_id)}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 text-slate-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm group-hover:bg-blue-100 group-hover:text-blue-700 border border-slate-200 group-hover:border-blue-200"
                                                >
                                                    <i className="fas fa-external-link-alt mr-1"></i> Open
                                                </button>
                                            </td>

                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
