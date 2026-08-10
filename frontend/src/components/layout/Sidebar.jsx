import React, { useContext, useState, useEffect, useRef } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function Sidebar() {
    const { activePhase, activeProjectId, setActivePhase, setActiveProjectId } = useContext(ERPContext);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [desktopMenuOpen, setDesktopMenuOpen] = useState(false); 
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef(null);
    
    const desktopSidebarRef = useRef(null);
    
    const navToPhase = (phase) => {
        setActivePhase(phase);
        setActiveProjectId('none');
        setMobileMenuOpen(false);
        setDesktopMenuOpen(false); 
    };

    const navItems = [
        { id: 'home', icon: 'fa-chart-pie', label: 'Dashboard', mobileLabel: 'Dash' },
        { id: 'pipeline', icon: 'fa-list-alt', label: 'Pipeline', mobileLabel: 'Pipeline' },
        { id: 'radar', icon: 'fa-satellite-dish', label: 'Pre-Sales Radar', mobileLabel: 'Radar' },
        { id: 'master_hub', icon: 'fa-chess-board', label: 'Master Hub', mobileLabel: 'Hub' },
        { id: 'map', icon: 'fa-globe-americas', label: 'Regional Map', mobileLabel: 'Map' },
        { id: 'crm', icon: 'fa-building', label: 'Customer Directory', mobileLabel: 'Directory' }, // 🚨 Updated Label
        { id: 'finops', icon: 'fa-file-invoice-dollar', label: 'FinOps (COC)', mobileLabel: 'FinOps' }, 
        { id: 'schedule', icon: 'fa-calendar-alt', label: 'Schedule', mobileLabel: 'Schedule' },
        { id: 'process', icon: 'fa-route', label: 'Process', mobileLabel: 'Process' },
        { id: 'resource-discovery', icon: 'fa-search-location', label: 'Discovery', mobileLabel: 'Discovery' },
        { id: 'playbooks', icon: 'fa-book-open', label: 'Playbooks', mobileLabel: 'Playbooks' },
        { id: 'migration_monitor', icon: 'fa-tv', label: 'Live NOC', mobileLabel: 'NOC' },
        { id: 'workflow', icon: 'fa-project-diagram', label: 'Workflow Graph', mobileLabel: 'Flow' },
        { id: 'halted', icon: 'fa-archive', label: 'Halted Projects', mobileLabel: 'Halted' },
    ];

    const activeItem = navItems.find(item => item.id === activePhase && activeProjectId === 'none') || navItems[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileMenuOpen && !event.target.closest('.mobile-menu-container')) {
                setMobileMenuOpen(false);
            }
            if (desktopMenuOpen && 
                desktopSidebarRef.current && 
                !desktopSidebarRef.current.contains(event.target) && 
                !event.target.closest('.desktop-hamburger')) {
                setDesktopMenuOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen, desktopMenuOpen]);

    useEffect(() => {
        const isMobile = window.innerWidth < 1024; 
        
        if (!isMobile) return; 
        
        const handleScroll = () => {
            setIsScrolling(true);
            
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 500); 
        };
        
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll);
        }
        
        window.addEventListener('scroll', handleScroll);
        
        return () => {
            if (mainContent) {
                mainContent.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    return (
        <>
            <div className="hidden lg:flex fixed top-4 left-4 z-[60] desktop-hamburger">
                <button
                    onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
                    className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white shadow-xl hover:bg-slate-800 transition-colors"
                >
                    <i className={`fas ${desktopMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
                </button>
            </div>

            <div 
                ref={desktopSidebarRef}
                className={`hidden lg:flex fixed inset-y-0 left-0 z-50 bg-slate-900 text-white shadow-2xl flex-col w-64 shrink-0 transition-transform duration-300 ease-in-out ${desktopMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-5 pl-16 flex justify-between items-center border-b border-slate-800 w-64 shrink-0 h-[73px]">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navToPhase('home')}>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center border border-blue-400 shadow-lg"><i className="fas fa-cloud text-white"></i></div>
                        <div><h1 className="text-sm font-black text-white leading-tight">LATAM Cloud</h1><h2 className="text-[8px] text-blue-300 uppercase tracking-widest font-bold">Delivery ERP</h2></div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 w-64 custom-scrollbar">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 mb-3">Global Overviews</p>
                    
                    {navItems.slice(0, 8).map(item => (
                        <button key={item.id} onClick={() => navToPhase(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase === item.id && activeProjectId === 'none' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                            <i className={`fas ${item.icon} w-5 text-center`}></i> {item.label}
                        </button>
                    ))}
                    
                    <div className="pt-4 mt-4 border-t border-slate-800">
                        {navItems.slice(8).map(item => (
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

            <div className={`lg:hidden mobile-menu-container fixed bottom-6 right-6 z-40 transition-all duration-300 ${isScrolling ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                <button
                    onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(!mobileMenuOpen); }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${mobileMenuOpen ? 'bg-gradient-to-br from-blue-600 to-blue-700 rotate-45 scale-110' : 'bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md hover:from-slate-800/95 hover:to-slate-700/95 active:scale-95'}`}
                    style={{
                        boxShadow: mobileMenuOpen 
                            ? '0 15px 50px rgba(37, 99, 235, 0.5), 0 0 0 4px rgba(37, 99, 235, 0.15), inset 0 2px 10px rgba(255, 255, 255, 0.2)' 
                            : '0 15px 50px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1), inset 0 -2px 10px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    <i className={`fas ${mobileMenuOpen ? 'fa-times' : activeItem.icon} text-xl ${mobileMenuOpen ? 'text-white' : 'text-blue-300'}`}></i>
                </button>

                {mobileMenuOpen && (
                    <>
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setMobileMenuOpen(false)}></div>
                        <div className="absolute bottom-16 right-0 mb-4 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/30 p-3 animate-slide-up-liquid min-w-[200px] z-50">
                            <div className="px-3 py-2 mb-2 border-b border-slate-700/50">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current View</div>
                                <div className="flex items-center gap-2">
                                    <i className={`fas ${activeItem.icon} text-blue-400`}></i>
                                    <span className="text-xs font-bold text-white">{activeItem.label}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                {navItems.map(item => {
                                    const isActive = activePhase === item.id && activeProjectId === 'none';
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => navToPhase(item.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent'}`}
                                        >
                                            <i className={`fas ${item.icon} text-lg mb-1`}></i>
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-center">{item.mobileLabel || item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
