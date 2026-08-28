import React, { useContext, useState, useEffect, useRef } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge } from 'antd';
import {
  CloudOutlined,
  MenuOutlined,
  CloseOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  BranchesOutlined,
  SearchOutlined,
  BookOutlined,
  DesktopOutlined,
  ProjectOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';

// ── Role-based navigation config ──
const ROLE_NAV = {
    'Master Admin': ['home', 'pipeline', 'radar', 'master_hub', 'map', 'crm', 'finops', 'schedule', 'process', 'playbooks', 'migration_monitor', 'halted'],
    'Admin':    ['home', 'pipeline', 'radar', 'master_hub', 'map', 'crm', 'finops', 'schedule', 'process', 'playbooks', 'migration_monitor', 'halted'],
    'PM':       ['home', 'pipeline', 'radar', 'master_hub', 'map', 'crm', 'finops', 'schedule', 'process', 'playbooks', 'migration_monitor', 'halted'],
    'SA':       ['home', 'radar', 'crm'],
    'Engineer': ['home', 'pipeline', 'master_hub', 'migration_monitor', 'halted'],
    'Partner':  ['home', 'radar'],
    'Viewer':   ['home'],
};

const allNavItems = [
    { id: 'home', icon: DashboardOutlined, label: 'Dashboard', mobileLabel: 'Dash' },
    { id: 'pipeline', icon: UnorderedListOutlined, label: 'Pipeline', mobileLabel: 'Pipeline' },
    { id: 'radar', icon: ExperimentOutlined, label: 'Pre-Sales Radar', mobileLabel: 'Radar' },
    { id: 'master_hub', icon: AppstoreOutlined, label: 'Master Hub', mobileLabel: 'Hub' },
    { id: 'map', icon: GlobalOutlined, label: 'Regional Map', mobileLabel: 'Map' },
    { id: 'crm', icon: TeamOutlined, label: 'Customer Directory', mobileLabel: 'Directory' },
    { id: 'finops', icon: DollarOutlined, label: 'FinOps (COC)', mobileLabel: 'FinOps' },
    { id: 'schedule', icon: CalendarOutlined, label: 'Schedule', mobileLabel: 'Schedule' },
    { id: 'process', icon: BranchesOutlined, label: 'Process', mobileLabel: 'Process' },
    { id: 'resource-discovery', icon: SearchOutlined, label: 'Discovery', mobileLabel: 'Discovery' },
    { id: 'playbooks', icon: BookOutlined, label: 'Playbooks', mobileLabel: 'Playbooks' },
    { id: 'migration_monitor', icon: DesktopOutlined, label: 'Live NOC', mobileLabel: 'NOC' },
    { id: 'workflow', icon: ProjectOutlined, label: 'Workflow Graph', mobileLabel: 'Flow' },
    { id: 'halted', icon: PauseCircleOutlined, label: 'Halted Projects', mobileLabel: 'Halted' },
];

export default function Sidebar() {
    const { activePhase, activeProjectId, setActivePhase, setActiveProjectId } = useContext(ERPContext);
    const { user } = useAuth();

    // ── Filter nav items by user role ──
    const userRole = user?.role || 'Viewer';
    const allowedIds = ROLE_NAV[userRole] || ROLE_NAV['Viewer'];
    const navItems = allNavItems.filter(item => allowedIds.includes(item.id));
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

    const globalNav = navItems.slice(0, 8);
    const executionNav = navItems.slice(8);

    return (
        <>
            {/* Desktop Hamburger */}
            <div className="hidden lg:flex fixed top-4 left-4 z-[60] desktop-hamburger">
                <Button
                    onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
                    type="default"
                    shape="circle"
                    size="large"
                    icon={desktopMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
                    className="bg-gray-900 border-gray-700 text-white shadow-xl hover:bg-gray-800"
                    style={{ width: 40, height: 40 }}
                />
            </div>

            {/* Desktop Sidebar */}
            <div 
                ref={desktopSidebarRef}
                className={`hidden lg:flex fixed inset-y-0 left-0 z-50 bg-gray-900 text-white shadow-2xl flex-col w-64 shrink-0 transition-transform duration-300 ease-in-out ${desktopMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-5 pl-16 flex justify-between items-center border-b border-gray-800 w-64 shrink-0 h-[73px]">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navToPhase('home')}>
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center border border-red-400 shadow-lg">
                            <CloudOutlined className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-tight">LATAM Cloud</h1>
                            <h2 className="text-[8px] text-red-400 uppercase tracking-widest font-bold">Delivery ERP</h2>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 w-64">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-3 mb-3">Global Overviews</p>
                    
                    {globalNav.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => navToPhase(item.id)} 
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activePhase === item.id && activeProjectId === 'none' ? 'bg-red-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800'}`}
                        >
                            <item.icon className="w-5" />
                            {item.label}
                        </button>
                    ))}
                    
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-3 mb-3">Execution</p>
                        {executionNav.map(item => (
                            <button 
                                key={item.id} 
                                onClick={() => navToPhase(item.id)} 
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all mt-1 ${activePhase === item.id && activeProjectId === 'none' ? 'bg-red-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800'}`}
                            >
                                <item.icon className="w-5" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 w-64 shrink-0 text-center">
                    <p className="text-[10px] font-mono tracking-widest uppercase text-gray-500">v2.0.0-Enterprise</p>
                </div>
            </div>

            {/* Mobile FAB Menu */}
            <div className={`lg:hidden mobile-menu-container fixed bottom-6 right-6 z-40 transition-all duration-300 ${isScrolling ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                <Button
                    onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(!mobileMenuOpen); }}
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={mobileMenuOpen ? <CloseOutlined /> : <activeItem.icon />}
                    className={`shadow-2xl transition-all duration-300 ${mobileMenuOpen ? 'bg-red-600 rotate-45 scale-110' : 'bg-gray-900 hover:bg-gray-800 active:scale-95'}`}
                    style={{ 
                        width: 48, 
                        height: 48, 
                        fontSize: 20,
                        boxShadow: mobileMenuOpen 
                            ? '0 15px 50px rgba(230,0,18,0.5), 0 0 0 4px rgba(230,0,18,0.15)' 
                            : '0 15px 50px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)',
                    }}
                >
                    {mobileMenuOpen ? <CloseOutlined style={{ color: 'white' }} /> : <activeItem.icon style={{ color: mobileMenuOpen ? 'white' : '#fca5a5' }} />}
                </Button>

                {mobileMenuOpen && (
                    <>
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setMobileMenuOpen(false)}></div>
                        <div className="absolute bottom-16 right-0 mb-4 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700/30 p-3 animate-slide-up min-w-[200px] z-50"
                             style={{ animation: 'slideUp 0.2s ease-out' }}>
                            <div className="px-3 py-2 mb-2 border-b border-gray-700/50">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Current View</div>
                                <div className="flex items-center gap-2">
                                    <activeItem.icon className="text-red-400" />
                                    <span className="text-sm font-bold text-white">{activeItem.label}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                {navItems.map(item => {
                                    const isActive = activePhase === item.id && activeProjectId === 'none';
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => navToPhase(item.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-gray-300 hover:bg-gray-800/50 hover:text-white border border-transparent'}`}
                                        >
                                            <item.icon className="text-lg mb-1" />
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