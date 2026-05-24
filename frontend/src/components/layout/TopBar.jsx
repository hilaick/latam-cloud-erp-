import React, { useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function TopBar({ setSidebarOpen }) {
    const { projects, activeProjectId, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    
    // We only want to show active projects in the global dropdown (not leads in the radar)
    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-6">
                {/* Mobile Menu Toggle */}
                <button 
                    onClick={() => setSidebarOpen(prev => !prev)} 
                    className="lg:hidden text-slate-500 hover:text-blue-600 transition-colors"
                >
                    <i className="fas fa-bars text-xl"></i>
                </button>

                {/* Global Project Context Selector */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                        <i className="fas fa-building"></i>
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                            Active Project Context
                        </div>
                        <select 
                            value={activeProjectId || "none"} 
                            onChange={(e) => {
                                setActiveProjectId(e.target.value);
                                if (e.target.value !== 'none') {
                                    setActivePhase('wizard'); // FORCE IMMEDIATE NAVIGATION
                                }
                            }}
                            className="bg-transparent font-black text-sm text-slate-800 outline-none cursor-pointer hover:text-blue-600 transition-colors"
                        >
                            <option value="none">-- Select Project to Manage --</option>
                            {activeProjects.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.country ? `(${p.country})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Right Side: Environment Indicator & Profile */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Production DB</span>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:bg-slate-800 transition-colors">
                    PA
                </div>
            </div>
        </div>
    );
}
