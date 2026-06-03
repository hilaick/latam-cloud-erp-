import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { EditableCell, formatShortDate } from '../../utils/helpers';

export default function FinOpsDashboard() {
    const { projects, setProjects } = useContext(ERPContext);
    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);
    const pocProjects = activeProjects.filter(p => p.project_type === 'poc');
    
    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);
    
    const handleUpdateProject = (id, field, value) => {
        setProjects(prev => prev.map(p => {
            if (String(p.id) === String(id)) {
                const newProject = { ...p, [field]: value };
                fetch('/api/erp/projects', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newProject) });
                return newProject;
            }
            return p;
        }));
    };

    const totalMRR = activeProjects.reduce((sum, p) => sum + (parseFloat(p.mrr) || 0), 0);
    const totalPocBudget = pocProjects.reduce((sum, p) => sum + (parseFloat(p.pocCap) || 0), 0);
    const activePocCount = pocProjects.length;
    const totalSpent = activeProjects.reduce((sum, p) => sum + (parseFloat(p.actualSpend) || 0), 0);
    const remainingBudget = totalPocBudget - totalSpent;

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                        <i className="fas fa-money-bill-wave text-blue-500 mr-2"></i> Total Portfolio MRR
                    </div>
                    <div className="text-3xl font-black text-slate-800">{fm(totalMRR)}</div>
                    <div className="text-xs text-slate-600 mt-2">{activeProjects.length} active projects</div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                        <i className="fas fa-flask text-emerald-500 mr-2"></i> PoC Budget Allocation
                    </div>
                    <div className="text-3xl font-black text-slate-800">{fm(totalPocBudget)}</div>
                    <div className="text-xs text-slate-600 mt-2">{activePocCount} PoC projects</div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                        <i className="fas fa-chart-line text-purple-500 mr-2"></i> Actual Spend
                    </div>
                    <div className="text-3xl font-black text-slate-800">{fm(totalSpent)}</div>
                    <div className="text-xs text-slate-600 mt-2">Across all projects</div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                        <i className="fas fa-piggy-bank text-amber-500 mr-2"></i> Remaining Budget
                    </div>
                    <div className={`text-3xl font-black ${remainingBudget >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {fm(remainingBudget)}
                    </div>
                    <div className="text-xs text-slate-600 mt-2">PoC projects only</div>
                </div>
            </div>

            {/* PoC Projects Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        <i className="fas fa-flask text-emerald-500"></i>
                        PoC Financial Dashboard
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">Proof of Concept budget tracking and financial oversight</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 w-[25%]">Project</th>
                                <th className="px-4 py-3 w-[15%]">Budget Cap</th>
                                <th className="px-4 py-3 w-[15%]">Spent</th>
                                <th className="px-4 py-3 w-[15%]">Remaining</th>
                                <th className="px-4 py-3 w-[15%]">TTL</th>
                                <th className="px-4 py-3 w-[15%]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pocProjects.map((project) => {
                                const spent = parseFloat(project.actualSpend) || 0;
                                const budget = parseFloat(project.pocCap) || 500;
                                const remaining = budget - spent;
                                const percentSpent = budget > 0 ? (spent / budget) * 100 : 0;
                                
                                return (
                                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{project.name || 'Unnamed Project'}</div>
                                            <div className="text-xs text-slate-500">{project.sa || 'No SA'}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-black text-slate-800">{fm(budget)}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-slate-700">{fm(spent)}</div>
                                            <div className="text-xs text-slate-500">{percentSpent.toFixed(0)}% used</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className={`font-black ${remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {fm(remaining)}
                                            </div>
                                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                                                <div 
                                                    className={`h-full ${remaining >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${Math.min(percentSpent, 100)}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-bold text-slate-700">
                                                {project.pocTtl ? formatShortDate(project.pocTtl) : 'No TTL'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${remaining >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                                                {remaining >= 0 ? 'Within Budget' : 'Over Budget'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {pocProjects.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-sm">
                                        No PoC projects in pipeline
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Budget Forecasting */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h4 className="font-black text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-chart-bar text-blue-500"></i>
                        Monthly Burn Rate
                    </h4>
                    <div className="space-y-4">
                        {activeProjects.slice(0, 5).map((project, index) => {
                            const monthlyBurn = (parseFloat(project.mrr) || 0) / 12;
                            return (
                                <div key={project.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <div className="font-medium text-slate-800">{project.name || `Project ${index + 1}`}</div>
                                        <div className="text-xs text-slate-500">{project.sa || 'No SA'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-800">{fm(monthlyBurn)}</div>
                                        <div className="text-xs text-slate-500">per month</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h4 className="font-black text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-calendar-alt text-purple-500"></i>
                        Upcoming Milestones
                    </h4>
                    <div className="space-y-4">
                        {activeProjects
                            .filter(p => p.date)
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .slice(0, 5)
                            .map((project, index) => (
                                <div key={project.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <div className="font-medium text-slate-800">{project.name || `Project ${index + 1}`}</div>
                                        <div className="text-xs text-slate-500">Go-Live: {formatShortDate(project.date)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-800">{fm(project.mrr)}</div>
                                        <div className="text-xs text-slate-500">Target MRR</div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}