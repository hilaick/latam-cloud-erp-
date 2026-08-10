import React, { useContext, useEffect, useState } from 'react';
import { ERPContext } from '../../context/ERPContext';

const STATUS_COLORS = {
    cancelled: { bg: '#dc262610', border: '#dc262640', text: '#fca5a5', icon: 'fa-ban', label: 'Cancelled' },
    suspended: { bg: '#f59e0b10', border: '#f59e0b40', text: '#fcd34d', icon: 'fa-pause-circle', label: 'Suspended' },
    transferred: { bg: '#6366f110', border: '#6366f140', text: '#c4b5fd', icon: 'fa-exchange-alt', label: 'Transferred' },
};

const PHASE_LABELS = {
    '1': 'ARB Handover',
    '2': 'Architecture',
    '3': 'Planning',
    '4': 'Execution',
    '5': 'Post-Live',
    'phase_1': 'ARB Handover',
    'phase_2': 'Architecture',
    'phase_3': 'Planning',
    'phase_4': 'Execution',
    'phase_5': 'Post-Live',
};

export default function HaltedProjects() {
    const { haltedProjects, fetchHaltedProjects, handleResumeProject, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    const [loaded, setLoaded] = useState(false);
    const [filter, setFilter] = useState('all');
    const [resuming, setResuming] = useState(null);

    useEffect(() => {
        fetchHaltedProjects();
        setLoaded(true);
    }, []);

    const filtered = filter === 'all'
        ? haltedProjects
        : haltedProjects.filter(p => p.status === filter);

    const stats = {
        total: haltedProjects.length,
        cancelled: haltedProjects.filter(p => p.status === 'cancelled').length,
        suspended: haltedProjects.filter(p => p.status === 'suspended').length,
        transferred: haltedProjects.filter(p => p.status === 'transferred').length,
    };

    const handleResume = async (projectId) => {
        setResuming(projectId);
        const result = await handleResumeProject(projectId);
        setResuming(null);
        if (result && result.success) {
            setActiveProjectId(projectId);
            setActivePhase('wizard');
        }
    };

    const navigateToProject = (projectId) => {
        setActiveProjectId(projectId);
        setActivePhase('wizard');
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return iso; }
    };

    const getPhaseLabel = (phaseId) => {
        if (!phaseId) return 'Unknown';
        // Could be 'phase_1' or just '1'
        return PHASE_LABELS[phaseId] || PHASE_LABELS[String(phaseId).replace('phase_', '')] || phaseId;
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-700">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black mb-2 text-white flex items-center">
                            <i className="fas fa-archive text-amber-400 mr-4"></i> Halted Projects Archive
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">
                            Cancelled, suspended, and transferred migration projects — audit trail and recovery hub.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-slate-800/80 border border-slate-600 p-4 rounded-xl text-center min-w-[100px]">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total</div>
                            <div className="text-2xl font-black text-white">{stats.total}</div>
                        </div>
                        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-center min-w-[100px]">
                            <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-1">Cancelled</div>
                            <div className="text-2xl font-black text-red-400">{stats.cancelled}</div>
                        </div>
                        <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl text-center min-w-[100px]">
                            <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1">Suspended</div>
                            <div className="text-2xl font-black text-amber-400">{stats.suspended}</div>
                        </div>
                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl text-center min-w-[100px]">
                            <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1">Transferred</div>
                            <div className="text-2xl font-black text-indigo-400">{stats.transferred}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter:</span>
                {['all', 'cancelled', 'suspended', 'transferred'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                            filter === f
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {f === 'all' ? 'All' : STATUS_COLORS[f]?.label || f}
                    </button>
                ))}
            </div>

            {/* Project cards */}
            {!loaded ? (
                <div className="flex items-center justify-center py-20">
                    <i className="fas fa-spinner fa-spin text-3xl text-slate-300"></i>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                        <i className="fas fa-inbox text-3xl text-slate-300"></i>
                    </div>
                    <h3 className="text-lg font-black text-slate-600 mb-2">
                        {filter === 'all' ? 'No halted projects' : `No ${filter} projects`}
                    </h3>
                    <p className="text-sm text-slate-400">
                        {filter === 'all'
                            ? 'All projects are currently active. Halted projects will appear here.'
                            : 'Use the filter to view other status categories.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(project => {
                        const s = STATUS_COLORS[project.status] || STATUS_COLORS.cancelled;
                        return (
                            <div
                                key={project.id}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                {/* Status bar */}
                                <div
                                    style={{
                                        background: s.bg,
                                        borderBottom: `1px solid ${s.border}`,
                                        padding: '10px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <i className={`fas ${s.icon}`} style={{ color: s.text, fontSize: 14 }}></i>
                                    <span
                                        style={{
                                            color: s.text,
                                            fontSize: 10,
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                        }}
                                    >
                                        {s.label}
                                    </span>
                                    {project.haltedFromPhase && (
                                        <span style={{
                                            marginLeft: 'auto',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: '#94a3b8',
                                            background: '#f1f5f9',
                                            padding: '2px 8px',
                                            borderRadius: 8,
                                        }}>
                                            {getPhaseLabel(project.haltedFromPhase)}
                                        </span>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="p-5">
                                    <h3
                                        className="text-base font-black text-slate-800 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => navigateToProject(project.id)}
                                    >
                                        {project.name || project.id}
                                    </h3>
                                    {project.customerName && (
                                        <p className="text-xs text-slate-500 mb-3">{project.customerName}</p>
                                    )}

                                    {/* Details */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-400 w-16">Halted:</span>
                                            <span className="text-slate-700 font-semibold">{formatDate(project.haltDate)}</span>
                                        </div>
                                        {project.haltAuthor && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-400 w-16">By:</span>
                                                <span className="text-slate-700 font-semibold">{project.haltAuthor}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-400 w-16">Progress:</span>
                                            <span className="text-slate-700 font-semibold">{project.progress || '0%'}</span>
                                        </div>
                                        {project.status === 'transferred' && project.transferredTo && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-400 w-16">To:</span>
                                                <span className="text-indigo-600 font-bold">{project.transferredTo}</span>
                                            </div>
                                        )}
                                        {project.status === 'suspended' && project.resumeReviewDate && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-400 w-16">Review:</span>
                                                <span className="text-amber-600 font-bold">{formatDate(project.resumeReviewDate)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reason */}
                                    {project.haltReason && (
                                        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason</p>
                                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{project.haltReason}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigateToProject(project.id)}
                                            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                                        >
                                            <i className="fas fa-eye mr-1"></i> View
                                        </button>
                                        {project.status === 'suspended' && (
                                            <button
                                                onClick={() => handleResume(project.id)}
                                                disabled={resuming === project.id}
                                                className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                                            >
                                                {resuming === project.id ? (
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-play mr-1"></i> Resume
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Snapshot details at bottom */}
            {filtered.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-6">
                    <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fas fa-clipboard-list text-slate-400"></i> Resource &amp; State Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {filtered.map(project => {
                            const snap = project.haltSnapshot || {};
                            return (
                                <div key={`snap-${project.id}`} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <p className="text-xs font-bold text-slate-700 mb-2 truncate">{project.name || project.id}</p>
                                    <div className="space-y-1 text-[10px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Phase at halt:</span>
                                            <span className="text-slate-600 font-semibold">{getPhaseLabel(snap.phase)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Progress:</span>
                                            <span className="text-slate-600 font-semibold">{snap.progress || '0%'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Resources deployed:</span>
                                            <span className="text-slate-600 font-semibold">
                                                {Array.isArray(snap.resourcesDeployed) ? snap.resourcesDeployed.length : 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
