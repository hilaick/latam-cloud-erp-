import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

/* ── Utility: safely coerce any value to a string for JSX rendering ── */
const S = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'object') {
        if (Array.isArray(v)) return v.map(S).join(', ');
        if (v.cmd && v.desc) return v.cmd + ' \u2014 ' + v.desc;
        if (v.cmd) return v.cmd;
        if (v.desc) return v.desc;
        if (v.message) return v.message;
        try { return JSON.stringify(v); } catch(e) { return '[object]'; }
    }
    return String(v);
};

/* ── Sub-component: Copy-to-clipboard button ── */
const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (
        <button onClick={handleCopy} className="text-[9px] font-por-bold text-purple-500 hover:text-purple-700 uppercase ml-2">
            <i className={'fas ' + (copied ? 'fa-check text-emerald-500' : 'fa-copy')}></i>
        </button>
    );
};

/* ── Sub-component: Status badge (PASS / FAIL / WARN) ── */
const StatusBadge = ({ result, outcome }) => {
    const status = (result || outcome || '').toLowerCase();
    const isSuccess = status.includes('success') || status === 'capacity_ok' || status === 'registered' || status.includes('complete');
    const isWarn = status.includes('warn') || status.includes('retry');
    const isFail = status.includes('error') || status.includes('failed') || status.includes('blocked') || status === 'not_resolved';
    
    let color, icon, label;
    if (isSuccess) {
        color = 'bg-emerald-100 text-emerald-700 border-emerald-300';
        icon = 'fa-check-circle';
        label = 'OK';
    } else if (isWarn) {
        color = 'bg-amber-100 text-amber-700 border-amber-300';
        icon = 'fa-exclamation-triangle';
        label = 'WARN';
    } else if (isFail) {
        color = 'bg-rose-100 text-rose-700 border-rose-300';
        icon = 'fa-times-circle';
        label = 'FAIL';
    } else {
        color = 'bg-por-bg-hover text-por-text-secondary border-por-border-light';
        icon = 'fa-circle';
        label = (result || outcome || 'pending').toUpperCase();
    }
    
    return (
        <span className={'inline-flex items-center gap-1 text-[10px] font-por-bold px-1.5 py-0.5 rounded border ' + color}>
            <i className={'fas ' + icon + ' text-[9px]'}></i>
            {label}
        </span>
    );
};

/* ── Sub-component: Dependency resolution display ── */
const DependencyBadge = ({ deps }) => {
    if (!deps || deps.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {deps.map((dep, i) => (
                <div key={i} className={'flex items-center gap-1.5 ' + (dep.status === 'ok' ? 'text-emerald-600' : 'text-amber-600') + ' text-[9px] bg-white/80 rounded-por-full px-por-1 py-0.5 border border-por-border-light'}>
                    <i className={'fas ' + (dep.status === 'ok' ? 'fa-check-circle' : 'fa-circle') + ' text-[9px]'}></i>
                    {dep.name}
                </div>
            ))}
        </div>
    );
};

/* ── Sub-component: Trace entry (one step) ── */
const TraceEntry = ({ step, isLast, isExpanded, onToggle }) => {
    const isRunning = step.result === 'running' || step.outcome === 'in_progress';
    const connectorLine = !isLast ? 'border-l-2 border-por-border-light ml-4 h-4' : '';
    
    return (
        <div>
            <div
                className={'hover:bg-por-bg-hover/50 transition-colors cursor-pointer group ' + (isExpanded ? 'bg-por-bg-hover/50' : '')}
                onClick={onToggle}
            >
                <div className="px-por-4 py-por-2 flex items-start gap-por-2">
                    {/* Status icon */}
                    <div className={'w-7 h-7 rounded-por-full flex items-center justify-center shrink-0 mt-0.5 ' +
                        (isRunning ? 'bg-blue-100 text-por-brand-blue animate-pulse' :
                         step.result === 'capacity_ok' || step.result === 'registered' || (step.result || '').includes('success') ? 'bg-emerald-100 text-emerald-600' :
                         (step.result || '').includes('error') || (step.result || '').includes('failed') || step.result === 'not_resolved' ? 'bg-rose-100 text-rose-600' :
                         'bg-por-bg-hover text-por-text-secondary')}>
                        <i className={'fas ' +
                            (isRunning ? 'fa-spinner fa-spin' :
                             step.result === 'capacity_ok' || step.result === 'registered' || (step.result || '').includes('success') ? 'fa-check' :
                             (step.result || '').includes('error') || (step.result || '').includes('failed') || step.result === 'not_resolved' ? 'fa-times' :
                             'fa-circle') + ' text-[10px]'}></i>
                    </div>
                    
                    {/* Step info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-por-1 flex-wrap">
                            <span className="text-[10px] font-por-bold text-por-text-secondary uppercase tracking-wider">
                                {step.action?.replace(/_/g, ' ')}
                            </span>
                            <StatusBadge result={step.result} outcome={step.outcome} />
                            {step.duration_ms && (
                                <span className="text-[9px] text-por-text-secondary">{step.duration_ms}ms</span>
                            )}
                        </div>
                        <p className="text-por-xs text-por-text-secondary mt-0.5 leading-relaxed">
                            {step.description || step.decision?.message || ''}
                        </p>
                        <DependencyBadge deps={step.dependencies} />
                    </div>
                    
                    {/* Expand indicator */}
                    <div className="shrink-0 pt-1">
                        <i className={'fas fa-chevron-' + (isExpanded ? 'up' : 'down') + ' text-por-text-secondary text-[10px] shrink-0 ml-1 group-hover:text-por-text-secondary transition-colors'}></i>
                    </div>
                </div>
            </div>
            
            {/* Expanded body: commands, config, troubleshooting */}
            {isExpanded && (
                <div className="px-por-4 pb-3 ml-10 space-y-2">
                    {/* CLI Commands */}
                    {step.commands && step.commands.length > 0 && (
                        <div className="bg-por-gray-90 rounded-por-s p-por-2 font-mono text-por-xs">
                            <div className="text-[9px] text-por-text-secondary uppercase tracking-widest mb-1.5">CLI / API Commands</div>
                            {step.commands.map((cmd, i) => {
                                const cmdStr = typeof cmd === 'object' && cmd !== null ? (cmd.cmd || cmd.command || JSON.stringify(cmd)) : cmd;
                                const descStr = typeof cmd === 'object' && cmd !== null ? (cmd.desc || cmd.description || '') : '';
                                return (
                                    <div key={i} className="flex items-start gap-por-1 py-0.5 group/cmd">
                                        <span className="text-emerald-400 shrink-0">$</span>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-por-text-secondary break-all">{cmdStr}</span>
                                            {descStr && <div className="text-[9px] text-por-text-secondary">{descStr}</div>}
                                        </div>
                                        <CopyButton text={cmdStr} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {/* Resource Spec */}
                    {step.decision?.resource_spec && (
                        <div className="bg-por-bg-hover rounded-por-s p-por-2 text-por-xs">
                            <div className="text-[9px] text-por-text-secondary uppercase tracking-widest mb-1">Resource Specification</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-por-1">
                                {Object.entries(step.decision.resource_spec).map(([k, v]) => (
                                    <div key={k}>
                                        <span className="text-por-text-secondary">{k.replace(/_/g, ' ')}</span>
                                        <strong className="block text-por-text-primary">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Troubleshooting */}
                    {step.troubleshooting && (
                        <div className="bg-amber-50 border border-amber-200 rounded-por-s p-por-2 text-por-xs">
                            <div className="text-[9px] text-amber-600 uppercase tracking-widest mb-1 font-por-bold">
                                <i className="fas fa-exclamation-triangle mr-1"></i> Troubleshooting
                            </div>
                            <p className="text-amber-700 text-por-xs">{step.troubleshooting}</p>
                        </div>
                    )}
                    
                    {/* Dependencies detail */}
                    {step.decision?.dependencies_detail && step.decision.dependencies_detail.length > 0 && (
                        <div className="bg-indigo-50 rounded-por-s p-por-2 text-por-xs">
                            <div className="text-[9px] text-indigo-500 uppercase tracking-widest mb-1 font-por-bold">Dependencies</div>
                            {step.decision.dependencies_detail.map((dep, i) => (
                                <div key={i} className="text-indigo-600">{dep}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Connector line */}
            {connectorLine && <div className={connectorLine}></div>}
        </div>
    );
};

/* ── Sub-component: Phase grouping header ── */
const PhaseHeader = ({ icon, label, color, count, isExpanded, onToggle }) => (
    <div
        className={'px-por-4 py-por-2 flex items-center gap-por-2 cursor-pointer transition-colors ' + (isExpanded ? 'bg-white' : 'bg-por-bg-hover/80 hover:bg-white') + ' border-b border-por-border-light'}
        onClick={onToggle}
    >
        <div className={'w-9 h-9 ' + color + ' rounded-por-s flex items-center justify-center shadow-por-light shrink-0'}>
            <i className={'fas ' + icon + ' text-white text-por-sm'}></i>
        </div>
        <div className="flex-1">
            <span className="text-por-xs font-por-bold text-por-text-primary uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-[10px] text-por-text-secondary">{count} steps</span>
        <i className={'fas fa-chevron-' + (isExpanded ? 'up' : 'down') + ' text-por-text-secondary text-por-xs'}></i>
    </div>
);

/* ── Resource status styles ── */
const RESOURCE_STATUS_STYLES = {
    pending:    'bg-por-bg-hover text-por-text-secondary border-por-border-light',
    active:     'bg-blue-100 text-blue-700 border-blue-300 animate-pulse',
    completed:  'bg-emerald-100 text-emerald-700 border-emerald-300',
    failed:     'bg-rose-100 text-rose-700 border-rose-300',
    skipped:    'bg-amber-100 text-amber-700 border-amber-200',
};

const RESOURCE_STATUS_ICONS = {
    pending:   'fa-clock',
    active:    'fa-spinner fa-spin',
    completed: 'fa-check-circle',
    failed:    'fa-times-circle',
    skipped:   'fa-forward',
};

/* ── Sub-component: Individual resource card ── */
const ResourceCard = ({ resource, status, isHighlighted }) => {
    const style = RESOURCE_STATUS_STYLES[status] || RESOURCE_STATUS_STYLES.pending;
    const icon = RESOURCE_STATUS_ICONS[status] || RESOURCE_STATUS_ICONS.pending;
    const highlightClass = isHighlighted ? 'ring-2 ring-purple-400 shadow-por-normal scale-[1.02]' : '';
    const statusBgClass = 
        status === 'completed' ? 'bg-emerald-200' :
        status === 'active' ? 'bg-blue-200' :
        status === 'failed' ? 'bg-rose-200' : 'bg-por-border-light';
    return (
        <div className={'flex items-center gap-por-2 px-por-2 py-por-1.5 border rounded-por-s transition-all duration-300 ' + style + ' ' + highlightClass}>
            <div className={'w-8 h-8 rounded-por-s flex items-center justify-center shrink-0 ' + statusBgClass}>
                <i className={'fas ' + icon + ' text-por-xs'}></i>
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-por-xs font-por-bold truncate">{resource.name || resource.id || 'Unknown'}</div>
                <div className="text-[9px] opacity-60 uppercase truncate">
                    {resource.type || '?'}{resource.os ? ' · ' + resource.os : ''}
                </div>
            </div>
            <div className="text-[9px] font-por-bold uppercase shrink-0 opacity-50">{status}</div>
        </div>
    );
};

/* ── Sub-component: Resource Migration Tracker Panel ── */
const ResourceMigrationTracker = ({ resources, resourceStatus, activeResourceId, completedCount }) => (
    <div className="bg-white border border-por-border-light rounded-por-l overflow-hidden shadow-por-light h-full">
        <div className="px-por-3 py-por-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-por-border-light">
            <h6 className="font-por-bold text-por-text-primary text-por-xs uppercase tracking-widest flex items-center gap-por-1">
                <i className="fas fa-server text-indigo-500"></i>
                Resource Migration Tracker
            </h6>
            <div className="flex gap-por-2 mt-1.5">
                <span className="text-[10px] text-por-text-secondary">
                    <span className="font-por-bold text-indigo-600">{completedCount}</span>/{resources.length} completed
                </span>
                <div className="flex-1 bg-por-border-light rounded-por-full h-1.5 mt-1 overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 rounded-por-full transition-all duration-700"
                        style={{width: (resources.length > 0 ? (completedCount / resources.length) * 100 : 0) + '%'}}
                    ></div>
                </div>
            </div>
        </div>
        <div className="p-2 space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
            {resources.map((r, i) => (
                <ResourceCard
                    key={r.id || r.name || i}
                    resource={r}
                    status={resourceStatus[r.id] || resourceStatus[r.name] || 'pending'}
                    isHighlighted={(r.id || r.name) === activeResourceId}
                />
            ))}
            {resources.length === 0 && (
                <div className="text-center py-por-4 text-por-text-secondary text-por-xs">No resources loaded</div>
            )}
        </div>
    </div>
);

/* ── Sub-component: Replay controls ── */
const ReplayControls = ({ isPlaying, currentStep, totalSteps, onPlay, onPause, onStep, onReset, speed, onSpeedChange }) => (
    <div className="flex items-center gap-por-2 px-por-3 py-por-1.5 bg-por-gray-90 rounded-por-l">
        <button onClick={onReset} className="text-por-text-secondary hover:text-white transition-colors" title="Reset">
            <i className="fas fa-backward text-por-xs"></i>
        </button>
        <button onClick={isPlaying ? onPause : onPlay} className="text-white hover:text-purple-300 transition-colors" title={isPlaying ? 'Pause' : 'Play'}>
            <i className={'fas ' + (isPlaying ? 'fa-pause' : 'fa-play') + ' text-por-sm'}></i>
        </button>
        <button onClick={onStep} disabled={isPlaying || currentStep >= totalSteps} className="text-por-text-secondary hover:text-white transition-colors disabled:opacity-30" title="Step Forward">
            <i className="fas fa-step-forward text-por-xs"></i>
        </button>
        <span className="text-[10px] font-mono text-por-text-secondary ml-1">
            {currentStep}/{totalSteps}
        </span>
        <div className="w-px h-4 bg-por-gray-70"></div>
        <select
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="bg-por-gray-80 text-por-text-secondary text-[10px] font-por-bold rounded px-1.5 py-por-1 border border-por-gray-70"
        >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={150}>5x</option>
            <option value={50}>10x</option>
        </select>
    </div>
);

/* ── Sub-component: Live step indicator ── */
const LiveStepCard = ({ step }) => {
    if (!step) return null;
    const phaseLabel = (step.phase || '').replace('PHASE_', '\u03a6') || '\u2022';
    return (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-por-l p-por-3 mb-3">
            <div className="flex items-center gap-por-2">
                <div className="w-8 h-8 bg-purple-600 rounded-por-s flex items-center justify-center animate-pulse">
                    <i className="fas fa-bolt text-white text-por-xs"></i>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-por-bold text-purple-600 uppercase tracking-widest">
                        {phaseLabel + ' \u00b7 ' + step.action}
                    </div>
                    <div className="text-por-xs text-por-text-secondary truncate">
                        {S(step.description || (step.decision && step.decision.message) || step.result)}
                    </div>
                </div>
                <StatusBadge result={step.result} outcome={step.outcome} />
            </div>
            {step.commands && step.commands.length > 0 && (
                <div className="mt-2 bg-por-gray-90 rounded-por-s p-2 font-mono text-[10px] text-emerald-400">
                    {step.commands.map((c, i) => {
                        const cmdStr = typeof c === 'object' && c !== null ? (c.cmd || c.command || JSON.stringify(c)) : c;
                        const descStr = typeof c === 'object' && c !== null ? (c.desc || c.description || '') : '';
                        return (
                            <div key={i} className="flex items-start gap-por-1">
                                <span className="text-por-text-secondary shrink-0">$</span>
                                <div className="flex-1 min-w-0">
                                    <span>{cmdStr}</span>
                                    {descStr && <div className="text-[9px] text-por-text-secondary">{descStr}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default function AgenticOrchestrationPanel({ project, onUpdateProject }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(project?.agenticDryRun || null);
    const [error, setError] = useState(null);
    const [expandedSteps, setExpandedSteps] = useState({});
    const [expandedPhases, setExpandedPhases] = useState({
        'PHASE_4_0': true, 'PHASE_4_1': true, 'PHASE_4_2': true, 'PHASE_4_7': true
    });
    const [showSummary, setShowSummary] = useState(true);

    // ── Replay state ──
    const [replayMode, setReplayMode] = useState(false);
    const [replayIndex, setReplayIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [replaySpeed, setReplaySpeed] = useState(1000);
    const timerRef = useRef(null);

    const token = sessionStorage.getItem('hermes_access_token');

    // ── Extract resources from project data ──
    const resources = useMemo(() => {
        const topologyFilter = project?.topologyFilter || 'All';
        let nodes = project?.mapperNodes || [];
        // Apply same filter as backend / Phase 3
        if (topologyFilter === 'In SOW') {
            nodes = nodes.filter(n => n.status === 'Matched' || n.status === 'Quoted Only');
        } else if (topologyFilter === 'In Discovery') {
            nodes = nodes.filter(n => n.status === 'Matched' || n.status === 'Live Only');
        } else if (topologyFilter && topologyFilter !== 'All') {
            nodes = nodes.filter(n => n.status === topologyFilter);
        }
        // Only show migratable types (ECS/RDS/Storage)
        return nodes.filter(n => {
            const type = (n.type || '').toUpperCase();
            return type === 'ECS' || type === 'COMPUTE' || type === 'RDS' || type === 'DATABASE' || type === 'STORAGE' || type === 'OBS';
        });
    }, [project?.mapperNodes, project?.topologyFilter]);

    // ── Compute resource status from trace up to replayIndex ──
    const resourceStatus = useMemo(() => {
        if (!result?.trace || resources.length === 0) return {};
        const status = {};
        
        // Initialize all as pending
        resources.forEach(r => {
            status[r.id || r.name] = 'pending';
        });

        const visibleTrace = replayMode ? result.trace.slice(0, replayIndex + 1) : result.trace;
        
        visibleTrace.forEach(step => {
            const serverId = step.server_id || (step.decision && step.decision.server_id) || (step.decision && step.decision.server_name) || '';
            const serverName = (step.decision && step.decision.server_name) || '';
            
            // Find matching resource
            const matched = resources.find(r => 
                (r.id && (r.id === serverId || r.id === serverName)) ||
                (r.name && (r.name === serverId || r.name === serverName))
            );

            if (matched) {
                const key = matched.id || matched.name;
                const resultOutcome = (step.result || step.outcome || '').toLowerCase();
                const isSuccess = resultOutcome.includes('success') || resultOutcome === 'capacity_ok' || resultOutcome === 'registered';
                const isFail = resultOutcome.includes('error') || resultOutcome.includes('failed') || resultOutcome.includes('blocked') || resultOutcome === 'not_resolved';
                const isComplete = step.action === 'WAVE_COMPLETE' || step.action === 'SERVER_COMPLETE' || step.action === 'HANDOFF';

                if (isComplete || isSuccess) {
                    status[key] = 'completed';
                } else if (isFail) {
                    status[key] = 'failed';
                } else if (step.action !== 'WAVE_START') {
                    status[key] = 'active';
                }
            }
        });
        return status;
    }, [result, replayIndex, replayMode, resources]);

    // ── Active resource and completed count ──
    const activeResourceId = useMemo(() => {
        if (!replayMode || !result?.trace) return null;
        const step = result.trace[replayIndex];
        if (!step) return null;
        const sid = step.server_id || (step.decision && step.decision.server_id) || (step.decision && step.decision.server_name) || '';
        const matched = resources.find(r => r.id === sid || r.name === sid);
        return matched ? (matched.id || matched.name) : null;
    }, [replayMode, replayIndex, result, resources]);

    const completedCount = useMemo(() => {
        return Object.values(resourceStatus).filter(s => s === 'completed').length;
    }, [resourceStatus]);

    // ── Replay timer effect ──
    useEffect(() => {
        if (!isPlaying || !replayMode || !result?.trace) return;
        if (replayIndex >= result.trace.length - 1) {
            setIsPlaying(false);
            return;
        }
        timerRef.current = setTimeout(() => {
            setReplayIndex(prev => Math.min(prev + 1, result.trace.length - 1));
        }, replaySpeed);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [isPlaying, replayIndex, replayMode, replaySpeed, result]);

    // ── Replay control callbacks ──
    const startReplay = useCallback(() => {
        setReplayMode(true);
        setReplayIndex(0);
        setIsPlaying(true);
    }, []);

    const pauseReplay = useCallback(() => setIsPlaying(false), []);
    const resumeReplay = useCallback(() => setIsPlaying(true), []);
    const stepForward = useCallback(() => {
        if (!result?.trace) return;
        setReplayIndex(prev => Math.min(prev + 1, result.trace.length - 1));
    }, [result]);
    const resetReplay = useCallback(() => {
        setIsPlaying(false);
        setReplayIndex(0);
    }, []);
    const stopReplay = useCallback(() => {
        setIsPlaying(false);
        setReplayMode(false);
        setReplayIndex(0);
    }, []);

    const toggleStep = (stepId) => {
        setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
    };

    const togglePhase = (phaseKey) => {
        setExpandedPhases(prev => ({ ...prev, [phaseKey]: !prev[phaseKey] }));
    };

    const handleDryRun = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/agentic-dry-run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
            const data = await res.json();
            setResult(data);
            setReplayMode(false);
            setReplayIndex(0);
            setIsPlaying(false);
            if (onUpdateProject) {
                onUpdateProject({ ...project, agenticDryRun: data });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const clearResults = () => {
        setResult(null);
        setReplayMode(false);
        setReplayIndex(0);
        setIsPlaying(false);
    };

    // ── Derived metadata ──
    const builtProjectName = project?.name || project?.projectName || 'UNNAMED';
    
    const dataSourceLabel = useMemo(() => {
        if (!result) return null;
        if (project?.targetTopology?.mapperNodes?.length > 0) {
            return 'Using Saved Architecture';
        }
        if (project?.mapperNodes?.length > 0) {
            return 'Using Filtered Discovery Data (Save & Proceed from Step 2.4 first)';
        }
        if (project?.blueprintData) {
            return 'Using SOW/Quote Data';
        }
        return 'No Data Source Available';
    }, [result, project]);

    const inScopeCount = useMemo(() => {
        const savedNodes = project?.targetTopology?.mapperNodes;
        if (savedNodes && savedNodes.length > 0) return savedNodes.length;
        const topologyFilter = project?.topologyFilter || 'All';
        const allNodes = project?.mapperNodes || [];
        if (topologyFilter === 'In SOW') {
            return allNodes.filter(n => n.status === 'Matched' || n.status === 'Quoted Only').length;
        } else if (topologyFilter === 'In Discovery') {
            return allNodes.filter(n => n.status === 'Matched' || n.status === 'Live Only').length;
        } else if (topologyFilter && topologyFilter !== 'All') {
            return allNodes.filter(n => n.status === topologyFilter).length;
        }
        return allNodes.length;
    }, [project]);

    const allNodesCount = useMemo(() => {
        return (project?.mapperNodes || []).length;
    }, [project]);

    // ── Trace analysis ──
    const { totalSteps, phaseGroups, waveGroups } = useMemo(() => {
        const trace = result?.trace || [];
        
        // Group by phase
        const groups = {};
        trace.forEach(step => {
            const phase = step.phase || 'UNKNOWN';
            if (!groups[phase]) groups[phase] = [];
            groups[phase].push(step);
        });

        // Extract wave groups from PHASE_4_2
        const waves = [];
        const wSteps = groups['PHASE_4_2'] || [];
        let currentWave = null;
        wSteps.forEach(step => {
            if (step.action === 'WAVE_START') {
                currentWave = {
                    name: 'Wave ' + (step.wave_index || step.wave_number || (waves.length + 1)),
                    servers: step.server_count || 0,
                    steps: [step]
                };
                waves.push(currentWave);
            } else if (currentWave) {
                currentWave.steps.push(step);
                if (step.action === 'WAVE_COMPLETE') currentWave = null;
            }
        });

        return {
            totalSteps: trace.length,
            phaseGroups: groups,
            waveGroups: waves
        };
    }, [result]);

    const summary = result?.summary;

    // ── Phase configuration ──
    const PHASE_CONFIG = {
        'PHASE_4_0': { icon: 'fa-rocket', label: 'Phase 4.0 — Initialisation', color: 'bg-por-gray-70' },
        'PHASE_4_1': { icon: 'fa-network-wired', label: 'Phase 4.1 — Network Fabric', color: 'bg-por-brand-blue' },
        'PHASE_4_2': { icon: 'fa-server', label: 'Phase 4.2 — Wave Processing', color: 'bg-purple-600' },
        'PHASE_4_7': { icon: 'fa-broom', label: 'Phase 4.7 — Cleanup & Handoff', color: 'bg-emerald-600' },
    };

    return (
        <div className="space-y-por-3">
            {/* Trigger panel */}
            <div className="bg-white border border-por-border-light rounded-por-l p-por-5 shadow-por-normal">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-por-3">
                    <div className="flex-1">
                        <h4 className="font-por-bold text-por-text-primary text-por-sm uppercase tracking-widest flex items-center gap-por-1">
                            <i className="fas fa-robot text-purple-600"></i>
                            Agentic Orchestration — Dry-Run Simulation
                        </h4>
                        <p className="text-por-xs text-por-text-secondary mt-1 leading-relaxed max-w-2xl">
                            Simulate how Hermes would autonomously process all waves for this project. No cloud resources are provisioned or modified. Each step shows the exact CLI/API commands, resource specs, dependencies, and troubleshooting paths that would execute in a live orchestration.
                        </p>
                    </div>
                    <div className="flex gap-por-1 shrink-0">
                        <button
                            onClick={handleDryRun}
                            disabled={loading}
                            className={'px-por-5 py-por-1.5 rounded-por-l font-por-bold uppercase tracking-widest text-por-xs transition-all ' +
                                (loading ? 'bg-por-gray-30 text-por-text-secondary cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-400/30')}
                        >
                            {loading ? (
                                <><i className="fas fa-spinner fa-spin mr-2"></i>Simulating...</>
                            ) : (
                                <><i className="fas fa-play mr-2"></i>{result ? 'Re-run Simulation' : 'Run Simulation'}</>
                            )}
                        </button>
                        {result && (
                            <button
                                onClick={clearResults}
                                className="px-por-3 py-por-1 rounded-por-l font-por-bold text-por-text-secondary hover:text-por-text-primary hover:bg-por-bg-hover uppercase tracking-widest text-por-xs transition-colors border border-por-border-light"
                            >
                                Clear Results
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Data source badge */}
                {dataSourceLabel && (
                    <div className="mt-3 flex items-center gap-por-2 text-por-xs">
                        <span className="font-por-bold text-por-text-secondary">
                            Resources in Target Architecture 
                            <span className="text-purple-600 mx-1">{inScopeCount} / {allNodesCount}</span>
                        </span>
                        <span className={'text-[10px] font-por-bold uppercase px-por-1 py-0.5 rounded border ' +
                            (project?.targetTopology?.mapperNodes?.length > 0 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                : 'bg-amber-50 text-amber-600 border-amber-200')}>
                            {dataSourceLabel}
                        </span>
                    </div>
                )}
                
                {error && (
                    <div className="mt-3 bg-rose-50 border border-rose-200 rounded-por-s p-por-2 text-por-xs text-rose-700">
                        <i className="fas fa-exclamation-circle mr-1.5"></i>
                        {error}
                    </div>
                )}
            </div>

            {result && (
                <>
                    {/* Summary */}
                    <div className="bg-white border border-por-border-light rounded-por-l overflow-hidden shadow-por-light">
                        <div
                            className="px-por-4 py-por-2 bg-gradient-to-r from-por-bg-hover to-white border-b border-por-border-light cursor-pointer flex justify-between items-center"
                            onClick={() => setShowSummary(!showSummary)}
                        >
                            <h5 className="font-por-bold text-por-text-primary text-por-sm uppercase tracking-widest">
                                <i className="fas fa-chart-bar mr-2 text-blue-500"></i>
                                Simulation Summary
                            </h5>
                            <i className={'fas fa-chevron-' + (showSummary ? 'down' : 'right') + ' mr-2 text-por-text-secondary'}></i>
                        </div>
                        
                        {showSummary && summary && (
                            <div className="p-por-4 space-y-por-3">
                                {/* Top-line stats */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-por-2">
                                    <div className="text-center p-por-2 bg-por-bg-hover rounded-por-s">
                                        <div className="text-por-2xl font-por-bold text-por-text-primary">{summary.servers_processed}</div>
                                        <div className="text-[10px] text-por-text-secondary uppercase tracking-wider mt-1">Servers</div>
                                    </div>
                                    <div className="text-center p-por-2 bg-por-bg-hover rounded-por-s">
                                        <div className="text-por-2xl font-por-bold text-por-text-primary">{summary.total_waves}</div>
                                        <div className="text-[10px] text-por-text-secondary uppercase tracking-wider mt-1">Waves</div>
                                    </div>
                                    <div className="text-center p-por-2 bg-por-bg-hover rounded-por-s">
                                        <div className="text-por-2xl font-por-bold text-por-brand-blue">{summary.peak_parallel_agents}</div>
                                        <div className="text-[10px] text-por-text-secondary uppercase tracking-wider mt-1">Peak Agents</div>
                                    </div>
                                    <div className="text-center p-por-2 bg-por-bg-hover rounded-por-s">
                                        <div className={'text-por-2xl font-por-bold ' + (summary.cost_efficiency === 'UNDER_BUDGET' ? 'text-emerald-600' : 'text-rose-600')}>
                                            {summary.estimated_wall_clock_days}d
                                        </div>
                                        <div className="text-[10px] text-por-text-secondary uppercase tracking-wider mt-1">Est. Duration</div>
                                    </div>
                                    <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-por-2 pt-2 border-t border-por-border-lighter">
                                        <div className="text-por-xs text-por-text-secondary">
                                            <span className="block text-por-text-secondary">Throughput</span>
                                            <strong>{summary.effective_throughput_mbps} Mbps</strong>
                                        </div>
                                        <div className="text-por-xs text-por-text-secondary">
                                            <span className="block text-por-text-secondary">Est. Cost</span>
                                            <strong>${summary.cost_estimate_usd?.toLocaleString()}</strong>
                                        </div>
                                        <div className="text-por-xs text-por-text-secondary">
                                            <span className="block text-por-text-secondary">Budget</span>
                                            <strong>${summary.budget_usd?.toLocaleString()}</strong>
                                        </div>
                                        <div className="text-por-xs">
                                            <span className={'inline-block px-por-1 py-0.5 rounded text-[10px] font-por-bold uppercase ' +
                                                (summary.cost_efficiency === 'UNDER_BUDGET' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                                                {summary.cost_efficiency === 'UNDER_BUDGET' ? '\u2705 Under Budget' : '\u26a0\ufe0f Over Budget'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Learning System Stats */}
                    {summary?.learning_system && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-por-l p-por-3">
                            <h6 className="font-por-bold text-indigo-800 text-por-xs uppercase tracking-widest mb-3 flex items-center gap-por-1">
                                <i className="fas fa-brain text-indigo-600"></i>
                                Self-Learning Engine
                            </h6>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-por-1 text-center">
                                <div className="bg-white rounded-por-s p-2 shadow-por-light">
                                    <div className="text-por-lg font-por-bold text-indigo-600">{summary.learning_system.total_history_records}</div>
                                    <div className="text-[9px] text-por-text-secondary uppercase">History Records</div>
                                </div>
                                <div className="bg-white rounded-por-s p-2 shadow-por-light">
                                    <div className="text-por-lg font-por-bold text-indigo-600">{summary.learning_system.success_rate}</div>
                                    <div className="text-[9px] text-por-text-secondary uppercase">Success Rate</div>
                                </div>
                                <div className="bg-white rounded-por-s p-2 shadow-por-light">
                                    <div className="text-por-lg font-por-bold text-indigo-600">{summary.learning_system.unique_projects}</div>
                                    <div className="text-[9px] text-por-text-secondary uppercase">Projects Learned</div>
                                </div>
                                <div className="bg-white rounded-por-s p-2 shadow-por-light">
                                    <div className="text-por-lg font-por-bold text-indigo-600">{summary.learning_system.records_ingested}</div>
                                    <div className="text-[9px] text-por-text-secondary uppercase">Records Ingested</div>
                                </div>
                                <div className="bg-white rounded-por-s p-2 shadow-por-light">
                                    <div className="text-por-sm font-por-bold text-indigo-600">
                                        {Object.keys(summary.learning_system.strategy_distribution || {}).length}
                                    </div>
                                    <div className="text-[9px] text-por-text-secondary uppercase">Strategies Known</div>
                                </div>
                            </div>
                            <p className="text-[10px] text-indigo-500/70 mt-2 leading-relaxed">
                                {summary.learning_system.note}
                            </p>
                        </div>
                    )}

                    {/* Resource Usage */}
                    {summary?.resource_usage && (
                        <div className="bg-white border border-por-border-light rounded-por-l p-por-3">
                            <h6 className="font-por-bold text-por-text-primary text-por-xs uppercase tracking-widest mb-3">
                                <i className="fas fa-cloud mr-2 text-indigo-500"></i> Simulated Resource Footprint
                            </h6>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-por-1 text-center">
                                {Object.entries(summary.resource_usage).map(([key, val]) => (
                                    key !== 'peak_parallel_agents' && (
                                        <div key={key} className="bg-por-bg-hover rounded-por-s p-2">
                                            <div className="text-por-lg font-por-bold text-por-text-primary">{val}</div>
                                            <div className="text-[9px] text-por-text-secondary uppercase tracking-wider">
                                                {key.replace(/_/g, ' ')}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Resource Migration Comparison Board (Face-to-Face View) ── */}
                    {resources.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h5 className="font-por-bold text-por-text-primary text-por-sm uppercase tracking-widest flex items-center gap-por-1">
                                    <i className="fas fa-balance-scale text-purple-500"></i>
                                    Migration Comparison Board
                                </h5>
                                <div className="flex gap-por-1">
                                    {!replayMode ? (
                                        <button
                                            onClick={startReplay}
                                            className="px-por-3 py-por-1 bg-purple-600 hover:bg-purple-700 text-white rounded-por-s text-[10px] font-por-bold uppercase tracking-widest transition-colors shadow-lg shadow-purple-400/30"
                                        >
                                            <i className="fas fa-play mr-1.5"></i> Replay Simulation
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopReplay}
                                            className="px-por-3 py-por-1 bg-por-gray-70 hover:bg-por-gray-70 text-white rounded-por-s text-[10px] font-por-bold uppercase tracking-widest transition-colors"
                                        >
                                            <i className="fas fa-stop mr-1.5"></i> Exit Replay
                                        </button>
                                    )}
                                </div>
                            </div>

                            {replayMode && (
                                <ReplayControls
                                    isPlaying={isPlaying}
                                    currentStep={replayIndex + 1}
                                    totalSteps={result?.trace?.length || 0}
                                    onPlay={resumeReplay}
                                    onPause={pauseReplay}
                                    onStep={stepForward}
                                    onReset={resetReplay}
                                    speed={replaySpeed}
                                    onSpeedChange={setReplaySpeed}
                                />
                            )}

                            {replayMode && result?.trace && (
                                <LiveStepCard step={result.trace[replayIndex]} />
                            )}

                            <div className={'grid ' + (replayMode ? 'grid-cols-1 lg:grid-cols-2' : '') + ' gap-por-3'}>
                                {/* LEFT: Resource Migration Tracker */}
                                <ResourceMigrationTracker
                                    resources={resources}
                                    resourceStatus={resourceStatus}
                                    activeResourceId={activeResourceId}
                                    completedCount={completedCount}
                                />

                                {/* RIGHT: Cumulative Task Log (shown during replay) */}
                                {replayMode && (
                                    <div className="bg-white border border-por-border-light rounded-por-l overflow-hidden shadow-por-light">
                                        <div className="px-por-3 py-por-2 bg-gradient-to-r from-por-bg-hover to-white border-b border-por-border-light">
                                            <h6 className="font-por-bold text-por-text-primary text-por-xs uppercase tracking-widest flex items-center gap-por-1">
                                                <i className="fas fa-tasks text-por-text-secondary"></i>
                                                Cumulative Task Log
                                            </h6>
                                        </div>
                                        <div className="p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                            <div className="divide-y divide-por-border-lighter">
                                                {(result.trace || []).slice(0, replayIndex + 1).map((step, i) => (
                                                    <div key={step.id || i} className="px-por-2 py-por-1 text-por-xs">
                                                        <div className="flex items-center gap-por-1">
                                                            <span className="text-[9px] font-mono text-por-text-secondary w-6">{i + 1}</span>
                                                            <span className="text-[9px] font-por-bold text-por-text-secondary uppercase">
                                                                {(step.phase || '').replace('PHASE_', '\u03a6') || '\u2022'}
                                                            </span>
                                                            <span className="font-por-bold text-por-text-primary truncate flex-1">
                                                                {(step.action || '').replace(/_/g, ' ')}
                                                            </span>
                                                            <StatusBadge result={step.result} outcome={step.outcome} />
                                                        </div>
                                                        {step.commands && step.commands.length > 0 && (
                                                            <div className="mt-1 ml-8 bg-por-gray-90 rounded p-1.5 font-mono text-[9px] text-emerald-400">
                                                                {step.commands.map((c, ci) => (
                                                                    <div key={ci}>$ {c}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {replayIndex < 0 && (
                                                <div className="text-center py-por-4 text-por-text-secondary text-por-xs">
                                                    No steps executed yet — press Play to begin
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Execution Trace — Grouped by Phase ── */}
                    <div className="bg-white border border-por-border-light rounded-por-l overflow-hidden shadow-por-light">
                        <div className="px-por-4 py-por-3 bg-gradient-to-r from-por-bg-hover to-white border-b border-por-border-light flex justify-between items-center">
                            <h5 className="font-por-bold text-por-text-primary text-por-sm uppercase tracking-widest">
                                <i className="fas fa-project-diagram mr-2 text-purple-500"></i>
                                Execution Trace ({totalSteps} steps)
                            </h5>
                            <div className="flex gap-por-1">
                                <button
                                    className="text-[9px] font-por-bold text-purple-500 hover:text-purple-700 uppercase"
                                    onClick={() => setExpandedSteps(Object.fromEntries(
                                        (result.trace || []).map(s => [s.id, true])
                                    ))}
                                >
                                    Expand All
                                </button>
                                <button
                                    className="text-[9px] font-por-bold text-por-text-secondary hover:text-por-text-secondary uppercase"
                                    onClick={() => setExpandedSteps({})}
                                >
                                    Collapse All
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
                            {/* Phase 4.0: Init */}
                            {phaseGroups['PHASE_4_0']?.length > 0 && (
                                <div>
                                    <PhaseHeader
                                        {...PHASE_CONFIG['PHASE_4_0']}
                                        count={phaseGroups['PHASE_4_0'].length}
                                        isExpanded={expandedPhases['PHASE_4_0']}
                                        onToggle={() => togglePhase('PHASE_4_0')}
                                    />
                                    {expandedPhases['PHASE_4_0'] && (
                                        <div className="divide-y divide-por-border-lighter">
                                            {phaseGroups['PHASE_4_0'].map((step, idx) => (
                                                <TraceEntry
                                                    key={step.id}
                                                    step={step}
                                                    isLast={idx === phaseGroups['PHASE_4_0'].length - 1}
                                                    isExpanded={expandedSteps[step.id] || false}
                                                    onToggle={() => toggleStep(step.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Phase 4.1: Network */}
                            {phaseGroups['PHASE_4_1']?.length > 0 && (
                                <div>
                                    <PhaseHeader
                                        {...PHASE_CONFIG['PHASE_4_1']}
                                        count={phaseGroups['PHASE_4_1'].length}
                                        isExpanded={expandedPhases['PHASE_4_1']}
                                        onToggle={() => togglePhase('PHASE_4_1')}
                                    />
                                    {expandedPhases['PHASE_4_1'] && (
                                        <div className="divide-y divide-por-border-lighter">
                                            {phaseGroups['PHASE_4_1'].map((step, idx) => (
                                                <TraceEntry
                                                    key={step.id}
                                                    step={step}
                                                    isLast={idx === phaseGroups['PHASE_4_1'].length - 1}
                                                    isExpanded={expandedSteps[step.id] || false}
                                                    onToggle={() => toggleStep(step.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Phase 4.2: Wave Processing — sub-group by wave */}
                            {waveGroups.length > 0 && (
                                <div>
                                    <PhaseHeader
                                        {...PHASE_CONFIG['PHASE_4_2']}
                                        count={phaseGroups['PHASE_4_2']?.length || 0}
                                        isExpanded={expandedPhases['PHASE_4_2']}
                                        onToggle={() => togglePhase('PHASE_4_2')}
                                    />
                                    {expandedPhases['PHASE_4_2'] && (
                                        <div className="divide-y divide-por-border-light">
                                            {waveGroups.map((wave, wi) => (
                                                <div key={wi}>
                                                    <div className="px-por-3 py-por-1 bg-purple-50/50 border-b border-purple-100 flex items-center gap-por-2">
                                                        <i className="fas fa-play-circle text-purple-500 text-por-xs"></i>
                                                        <span className="text-por-xs font-por-bold text-purple-700 uppercase tracking-wider">
                                                            {wave.name}
                                                        </span>
                                                        <span className="text-[10px] text-purple-400">
                                                            {wave.servers} servers • {wave.steps.filter(s => s.action !== 'WAVE_START' && s.action !== 'WAVE_COMPLETE' && s.action !== 'HANDOFF').length} operations
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-por-border-lighter">
                                                        {wave.steps.map((step, idx) => (
                                                            <TraceEntry
                                                                key={step.id}
                                                                step={step}
                                                                isLast={idx === wave.steps.length - 1 && wi === waveGroups.length - 1}
                                                                isExpanded={expandedSteps[step.id] || false}
                                                                onToggle={() => toggleStep(step.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Phase 4.7: Cleanup */}
                            {phaseGroups['PHASE_4_7']?.length > 0 && (
                                <div>
                                    <PhaseHeader
                                        {...PHASE_CONFIG['PHASE_4_7']}
                                        count={phaseGroups['PHASE_4_7'].length}
                                        isExpanded={expandedPhases['PHASE_4_7']}
                                        onToggle={() => togglePhase('PHASE_4_7')}
                                    />
                                    {expandedPhases['PHASE_4_7'] && (
                                        <div className="divide-y divide-por-border-lighter">
                                            {phaseGroups['PHASE_4_7'].map((step, idx) => (
                                                <TraceEntry
                                                    key={step.id}
                                                    step={step}
                                                    isLast={idx === phaseGroups['PHASE_4_7'].length - 1}
                                                    isExpanded={expandedSteps[step.id] || false}
                                                    onToggle={() => toggleStep(step.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comparison Toggle */}
                    <div className="text-center flex items-center justify-center gap-por-3">
                        <button
                            className="text-[10px] font-por-bold text-por-text-secondary hover:text-por-text-primary uppercase flex items-center gap-1.5"
                            onClick={() => window.dispatchEvent(new CustomEvent('hermes:show-standard-view'))}
                        >
                            <i className="fas fa-project-diagram text-[9px]"></i>
                            Switch to Standard Methodology View
                        </button>
                        <div className="w-px h-3 bg-por-gray-30"></div>
                        <span className="text-[10px] text-por-text-secondary flex items-center gap-1.5">
                            <i className="fas fa-shield-alt text-[9px]"></i>
                            DRY-RUN — No cloud resources were provisioned or modified.
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
