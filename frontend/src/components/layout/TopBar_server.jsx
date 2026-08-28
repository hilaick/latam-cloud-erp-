import React, { useContext, useState, useRef, useEffect } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Avatar, Dropdown, Badge } from 'antd';
import {
  GlobalOutlined,
  BuildOutlined,
  SearchOutlined,
  UserOutlined,
  BookOutlined,
  UsergroupAddOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  PoweroffOutlined,
  DownOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';

export default function TopBar({ onLogout, onOpenGlossary, onOpenCommandDrawer, onOpenHermes }) {
    const { projects, activeProjectId, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    const { user } = useAuth();
    
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [projectMenuOpen, setProjectMenuOpen] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    
    const projectMenuRef = useRef(null);
    const profileMenuRef = useRef(null);

    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
                setProjectMenuOpen(false);
            }
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
        : "Global View";

    const filteredProjects = activeProjects.filter(p => {
        const query = projectSearch.toLowerCase();
        return (p.name || '').toLowerCase().includes(query) || 
               (p.customerName || '').toLowerCase().includes(query);
    });

    const handleSelectProject = (id) => {
        setActiveProjectId(id);
        if (id !== 'none') setActivePhase('wizard');
        setProjectMenuOpen(false);
        setProjectSearch('');
    };

    const projectMenuItems = [
        {
            key: 'none',
            label: (
                <div className="flex items-center gap-3 px-2 py-1">
                    <GlobalOutlined className="w-4 h-4" />
                    <span className="font-semibold text-sm">Global View</span>
                </div>
            ),
            style: { backgroundColor: !currentProject ? '#fef2f2' : undefined },
        },
        ...filteredProjects.map(p => ({
            key: p.id,
            label: (
                <div className="flex flex-col gap-0.5 px-2 py-1">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">{p.customerName || 'No Account'}</span>
                    <span className="text-sm font-semibold truncate max-w-[200px]">{p.name || 'Unnamed Project'}</span>
                </div>
            ),
            style: { backgroundColor: currentProject?.id === p.id ? '#fef2f2' : undefined },
        })),
    ];

    const profileMenuItems = [
        {
            key: 'guided',
            icon: <i className="fas fa-magic" />,
            label: 'Guided Wizard',
            onClick: () => { setActiveProjectId('none'); setActivePhase('guided'); setProfileMenuOpen(false); },
        },
        {
            key: 'docs',
            icon: <BookOutlined />,
            label: 'Documentation',
            onClick: () => { setActiveProjectId('none'); setActivePhase('docs'); setProfileMenuOpen(false); },
        },
        {
            key: 'users',
            icon: <UsergroupAddOutlined />,
            label: 'IAM & Profile',
            onClick: () => { setActiveProjectId('none'); setActivePhase('users'); setProfileMenuOpen(false); },
        },
        {
            key: 'glossary',
            icon: <BookOutlined />,
            label: 'Terminology Glossary',
            onClick: () => { onOpenGlossary(); setProfileMenuOpen(false); },
        },
    ];

    return (
        <div className="bg-white border-b border-gray-200 px-3 md:px-6 lg:pl-20 py-2.5 md:py-4 flex items-center justify-between sticky top-0 z-[45] shadow-sm shrink-0">
            {/* Project Selector */}
            <div className="flex items-center gap-3 relative" ref={projectMenuRef}>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <BuildOutlined className="text-sm md:text-base" />
                </div>
                <div className="flex flex-col">
                    <div className="text-[10px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5 hidden sm:block">Active Project</div>
                    
                    <div
                        onClick={() => setProjectMenuOpen(!projectMenuOpen)}
                        className="flex items-center justify-between gap-2 bg-gray-50 sm:bg-transparent px-2 py-1 md:p-0 rounded-lg border border-gray-200 sm:border-none outline-none cursor-pointer hover:text-red-600 transition-colors w-[150px] sm:w-auto max-w-[160px] sm:max-w-[280px]"
                    >
                        <span className="font-bold text-xs md:text-sm truncate text-gray-800">
                            {currentProjectDisplay}
                        </span>
                        <DownOutlined className={`text-[10px] text-gray-400 transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {projectMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-[280px] sm:w-[320px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-slide-up"
                             style={{ animation: 'slideUp 0.2s ease-out' }}>
                            
                            <div className="p-3 border-b border-gray-100 bg-gray-50">
                                <Input 
                                    placeholder="Search by customer or project..." 
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    prefix={<SearchOutlined className="text-gray-400" />}
                                    size="small"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-[300px] overflow-y-auto">
                                {filteredProjects.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-xs font-semibold italic">No matching projects found.</div>
                                ) : (
                                    filteredProjects.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => handleSelectProject(p.id)}
                                            className={`w-full text-left px-4 py-3 flex flex-col cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${currentProject?.id === p.id ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50'}`}
                                        >
                                            <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${currentProject?.id === p.id ? 'text-red-300' : 'text-gray-400'}`}>
                                                {p.customerName || 'No Account'}
                                            </span>
                                            <span className={`text-xs font-semibold truncate ${currentProject?.id === p.id ? 'text-red-700' : 'text-gray-800'}`}>
                                                {p.name || 'Unnamed Project'}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 md:gap-4 relative">
                {/* Production DB Indicator */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-800">Production DB</span>
                </div>
                
                {/* Hermes AI Assistant */}
                <Button 
                    onClick={onOpenHermes}
                    type="default"
                    shape="circle"
                    size="large"
                    icon={<RobotOutlined />}
                    className="bg-purple-800 border-purple-700 text-purple-100 hover:bg-purple-700 hover:text-purple-50 hover:border-purple-500 shadow-md"
                />

                {/* Command Terminal */}
                <Button 
                    onClick={onOpenCommandDrawer}
                    type="default"
                    shape="circle"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    className="bg-gray-800 border-gray-700 text-green-400 hover:bg-gray-700 hover:text-green-300 hover:border-gray-500 shadow-md"
                />

                {/* User Avatar */}
                <div className="relative" ref={profileMenuRef}>
                    <Avatar 
                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                        size="large"
                        icon={<UserOutlined />}
                        className="bg-gray-900 border-2 border-gray-700 cursor-pointer hover:bg-red-600 hover:border-red-400 transition-colors"
                    >
                        {initials}
                    </Avatar>

                    {profileMenuOpen && (
                        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                             style={{ animation: 'slideUp 0.2s ease-out' }}>
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                <div className="font-bold text-sm text-gray-800">{userName}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 mt-1">{userRole}</div>
                            </div>
                            <div className="p-2">
                                {profileMenuItems.map(item => (
                                    <button
                                        key={item.key}
                                        onClick={item.onClick}
                                        className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors flex items-center mb-1"
                                    >
                                        <span className="w-5 text-center mr-2">{item.icon}</span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <Button 
                    onClick={onLogout}
                    type="default"
                    shape="circle"
                    size="large"
                    icon={<PoweroffOutlined />}
                    className="bg-red-50 border-red-200 text-red-600 hover:bg-red-500 hover:text-white shadow-sm"
                />
            </div>
        </div>
    );
}
