import React, { useContext, useState } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function TopBar({ onLogout }) {
    const { projects, activeProjectId, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);
    
    const userStr = localStorage.getItem('erp_user');
    const user = userStr ? JSON.parse(userStr) : { name: "System User", role: "Unknown" };
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="bg-white border-b border-slate-200 px-3 md:px-6 lg:pl-20 py-2.5 md:py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm shrink-0">
            {/* The rest of the file stays exactly the same... */}
            <div className="flex items-center gap-3">
