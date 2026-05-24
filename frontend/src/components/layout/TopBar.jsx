import React, { useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function TopBar({ setSidebarOpen }) {
    const { projects, activeProjectId, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);

    return (
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm shrink-0">
            <div className="flex items-center gap-4 md:gap-6">
                <button onClick={() => setSidebarOpen(prev => !prev)} className="text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-100 flex items-center justify-center h-10 w-10 border border-transparent hover:border-slate-200" title="Toggle Sidebar"><i className="fas fa-bars text-xl"></i></button>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center text-blue-600 shadow-inner"><i className="fas fa-building"></i></div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 hidden sm:block">Active Project Context</div>
                        <select 
                            value={activeProjectId || "none"} 
                            onChange={(e) => { setActiveProjectId(e.target.value); if (e.target.value !== 'none') setActivePhase('wizard'); }}
                            className="bg-slate-50 sm:bg-transparent px-2 py-1 sm:p-0 rounded border border-slate-200 sm:border-none font-black text-xs sm:text-sm text-slate-800 outline-none cursor-pointer hover:text-blue-600 transition-colors max-w-[150px] sm:max-w-[250px] truncate"
                        >
                            <option value="none">-- Global View (No Context) --</option>
                            {activeProjects.map(p => (<option key={p.id} value={p.id}>{p.name} {p.country ? `(${p.country})` : ''}</option>))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Production DB</span>
                </div>
                
                {/* 🚨 THE PROFILE / SETTINGS ROUTER */}
                <div 
                    onClick={() => { setActiveProjectId('none'); setActivePhase('users'); }}
                    className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:bg-blue-600 hover:border-blue-400 transition-colors"
                    title="Profile & Settings"
                >
                    HY
                </div>
            </div>
        </div>
    );
}
