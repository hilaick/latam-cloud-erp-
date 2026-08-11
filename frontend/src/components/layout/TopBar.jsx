import React, { useContext, useState, useRef, useEffect } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';

export default function TopBar({ onLogout, onOpenGlossary, onOpenCommandDrawer, onOpenHermes }) {
    const { projects, activeProjectId, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    const { user } = useAuth();
    
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    
    const profileMenuRef = useRef(null);

    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userName = user?.name || 'System User';
    const userRole = user?.role || 'Unknown';
    const initials = userName.split(' ').map(n => n[0] || '').join('').substring(0, 2).toUpperCase();

    const currentProject = activeProjects.find(p => String(p.id) === String(activeProjectId));
    const currentProjectDisplay = currentProject 
        ? `${currentProject.customerName || 'No Account'} - ${currentProject.name || 'Unnamed'}` 
        : "-- Global View --";


    

    return (
        <div className="bg-white border-b border-slate-200 px-3 md:px-6 lg:pl-20 py-2.5 md:py-4 flex items-center justify-between sticky top-0 z-[45] shadow-sm shrink-0">
            
            <div className="flex items-center gap-3 relative">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner shrink-0">
                    <i className="fas fa-building text-sm md:text-base"></i>
                </div>
                <div className="flex flex-col">
                    <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 hidden sm:block">Active Project Context</div>
                    
                    <div className="flex items-center gap-2 px-2 py-1 md:p-0">
                        <span className="font-black text-xs md:text-sm truncate text-slate-800">{currentProjectDisplay}</span>
                    </div>

                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 relative">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Production DB</span>
                </div>
                
                {/* 🚨 NEW: Hermes AI Assistant Button */}
                <button 
                    onClick={onOpenHermes}
                    title="Hermes AI Assistant"
                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-800 border border-purple-700 flex items-center justify-center text-purple-200 hover:bg-purple-700 hover:text-purple-100 hover:border-purple-500 transition-all shadow-md active:scale-95"
                >
                    <i className="fas fa-robot text-xs md:text-sm"></i>
                </button>

                {/* 🚨 NEW: Global Terminal Button */}
                <button 
                    onClick={onOpenCommandDrawer}
                    title="Delivery Command Interface"
                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 hover:border-slate-500 transition-all shadow-md active:scale-95"
                >
                    <i className="fas fa-terminal text-xs md:text-sm"></i>
                </button>

                <div className="relative" ref={profileMenuRef}>
                    <div 
                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                        className="w-8 h-8 md:w-10 md:h-10 text-xs md:text-base rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:bg-blue-600 hover:border-blue-400 transition-colors"
                    >
                        {initials}
                    </div>

                    {profileMenuOpen && (
                        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-slide-up">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                <div className="font-black text-sm text-slate-800">{userName}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-1">{userRole}</div>
                            </div>
                            <div className="p-2">
                                <button 
                                    onClick={() => { setActiveProjectId('none'); setActivePhase('users'); setProfileMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors flex items-center mb-1"
                                >
                                    <i className="fas fa-users-cog w-5 text-center mr-2"></i> IAM & Profile
                                </button>
                                <button 
                                    onClick={() => { onOpenGlossary(); setProfileMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors flex items-center"
                                >
                                    <i className="fas fa-book w-5 text-center mr-2"></i> Terminology Glossary
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={onLogout}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                >
                    <i className="fas fa-power-off text-xs md:text-sm"></i>
                </button>
            </div>
        </div>
    );
}
