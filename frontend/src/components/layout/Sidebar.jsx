import React, { useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
    const { activePhase, activeProjectId, setActivePhase, setActiveProjectId, projects } = useContext(ERPContext);
    
    const navToPhase = (phase) => {
        setActivePhase(phase);
        setActiveProjectId('none');
    };

    const activeProjectObj = projects.find(p => String(p.id) === String(activeProjectId));

    return (
        <div className={`fixed lg:relative inset-y-0 left-0 z-50 bg-slate-900 text-white shadow-2xl flex flex-col sidebar-transition ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'}`}>
            <div className="p-5 flex justify-between items-center border-b border-slate-800 w-64 shrink-0">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navToPhase('home')}>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center border border-blue-400 shadow-lg shadow-blue-500/20">
                        <i className="fas fa-cloud text-white text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-base font-black text-white leading-tight">LATAM Cloud</h1>
                        <h2 className="text-[9px] text-blue-300 uppercase tracking-widest font-bold">Delivery ERP</h2>
                    </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 p-2">
                    <i className="fas fa-times text-lg"></i>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 w-64 custom-scrollbar">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 mb-3">Global Overviews</p>
                <button 
                    onClick={() => navToPhase('home')} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === 'home' && activeProjectId === 'none' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                    <i className="fas fa-chart-pie w-5 text-center"></i> Executive Dash
                </button>
                <button 
                    onClick={() => navToPhase('map')} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === 'map' && activeProjectId === 'none' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                    <i className="fas fa-globe-americas w-5 text-center"></i> Regional Map
                </button>
                <button 
                    onClick={() => navToPhase('crm')} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === 'crm' && activeProjectId === 'none' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                    <i className="fas fa-building w-5 text-center"></i> Customer Directory
                </button>
                <button 
                    onClick={() => navToPhase('pipeline')} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === 'pipeline' && activeProjectId === 'none' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                    <i className="fas fa-list-alt w-5 text-center"></i> Master Pipeline
                </button>
                <button 
                    onClick={() => navToPhase('master_hub')} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === 'master_hub' && activeProjectId === 'none' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                    <i className="fas fa-chess-board w-5 text-center"></i> Master Execution Hub
                </button>
                <button 
                    onClick={() => navToPhase('schedule')} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === 'schedule' && activeProjectId === 'none' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                    <i className="fas fa-calendar-alt w-5 text-center"></i> Regional Schedule
                </button>
                <button 
                    onClick={() => navToPhase('radar')} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === 'radar' && activeProjectId === 'none' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                    <i className="fas fa-satellite-dish w-5 text-center"></i> Pre-Sales Radar
                </button>
                
                <div className="pt-4 mt-4 border-t border-slate-800">
                    <button 
                        onClick={() => navToPhase('process')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === 'process' && activeProjectId === 'none' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <i className="fas fa-route w-5 text-center"></i> Standard Process
                    </button>
                    <button 
                        onClick={() => navToPhase('playbooks')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all mt-2 ${activePhase === 'playbooks' && activeProjectId === 'none' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <i className="fas fa-book-open w-5 text-center"></i> Playbook Studio
                    </button>
                    <button 
                        onClick={() => navToPhase('migration_monitor')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all mt-2 ${activePhase === 'migration_monitor' && activeProjectId === 'none' ? 'bg-emerald-500 text-slate-900 shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                        <i className="fas fa-tv w-5 text-center"></i> Migration NOC
                    </button>
                </div>
            </div>

            <div className="p-5 border-t border-slate-800 bg-slate-950 w-64 shrink-0">
                <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                        <i className="fas fa-user-astronaut text-sm text-slate-300"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-white truncate">Hilaick Y.</div>
                        <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider truncate">Principal Architect & TAM</div>
                    </div>
                </div>
            </div>
        </div>
    );
}