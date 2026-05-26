import React, { useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function Sidebar() {
    const { activePhase, activeProjectId, setActivePhase, setActiveProjectId } = useContext(ERPContext);
    
    const navToPhase = (phase) => {
        setActivePhase(phase);
        setActiveProjectId('none');
    };

    const navItems = [
        { id: 'home', icon: 'fa-chart-pie', label: 'Dash' },
        { id: 'pipeline', icon: 'fa-list-alt', label: 'Pipeline' },
        { id: 'radar', icon: 'fa-satellite-dish', label: 'Radar' },
        { id: 'master_hub', icon: 'fa-chess-board', label: 'Hub' },
        { id: 'map', icon: 'fa-globe-americas', label: 'Map' },
        { id: 'crm', icon: 'fa-building', label: 'CRM' },
        { id: 'schedule', icon: 'fa-calendar-alt', label: 'Schedule' },
        { id: 'process', icon: 'fa-route', label: 'Process' },
        { id: 'playbooks', icon: 'fa-book-open', label: 'Playbooks' },
        { id: 'migration_monitor', icon: 'fa-tv', label: 'NOC' },
    ];

    return (
        <>
            {/* 🚨 DESKTOP SIDEBAR (Hidden on Mobile) */}
            <div className="hidden lg:flex inset-y-0 left-0 z-50 bg-slate-900 text-white shadow-2xl flex-col w-64 shrink-0">
                <div className="p-5 flex justify-between items-center border-b border-slate-800 w-64 shrink-0">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navToPhase('home')}>
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center border border-blue-400 shadow-lg shadow-blue-500/20"><i className="fas fa-cloud text-white text-lg"></i></div>
                        <div><h1 className="text-base font-black text-white leading-tight">LATAM Cloud</h1><h2 className="text-[9px] text-blue-300 uppercase tracking-widest font-bold">Delivery ERP</h2></div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 w-64 custom-scrollbar">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 mb-3">Global Overviews</p>
                    
                    {navItems.slice(0, 7).map(item => (
                        <button key={item.id} onClick={() => navToPhase(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === item.id && activeProjectId === 'none' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                            <i className={`fas ${item.icon} w-5 text-center`}></i> {item.label}
                        </button>
                    ))}
                    
                    <div className="pt-4 mt-4 border-t border-slate-800">
                        {navItems.slice(7).map(item => (
                            <button key={item.id} onClick={() => navToPhase(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all mt-2 ${activePhase === item.id && activeProjectId === 'none' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                                <i className={`fas ${item.icon} w-5 text-center`}></i> {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 w-64 shrink-0 text-center">
                    <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500">v2.0.0-Enterprise</p>
                </div>
            </div>

            {/* 🚨 MOBILE BOTTOM NAVIGATION (Spotify Style) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] safe-area-pb">
                {/* Hides scrollbar but allows horizontal swipe */}
                <div className="flex overflow-x-auto items-center py-2 px-2 gap-1 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {navItems.map(item => {
                        const isActive = activePhase === item.id && activeProjectId === 'none';
                        return (
                            <button
                                key={item.id}
                                onClick={() => navToPhase(item.id)}
                                className={`flex flex-col items-center justify-center min-w-[72px] p-2 rounded-xl transition-all duration-300 snap-center ${
                                    isActive ? 'text-white bg-white/10 shadow-inner scale-105' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <i className={`fas ${item.icon} text-xl mb-1.5 ${isActive ? 'text-blue-400' : ''}`}></i>
                                <span className={`text-[9px] font-bold tracking-wide ${isActive ? 'text-white' : ''}`}>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
