import React, { useState, useMemo } from 'react';

/* ── Sub-component: Copy-to-clipboard button ── */
const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (
        <button
            onClick={handleCopy}
            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors shrink-0"
            title="Copy command"
        >
            {copied ? '✓ Copied!' : '📋'}
        </button>
    );
};

/* ── Sub-component: Status badge with color coding ── */
const STATUS_STYLES = {
    success:      'bg-emerald-100 text-emerald-800 border-emerald-300',
    warning:      'bg-amber-100 text-amber-800 border-amber-300',
    error:        'bg-rose-100 text-rose-800 border-rose-300',
    blocked:      'bg-slate-100 text-slate-600 border-slate-300',
    progress:     'bg-blue-100 text-blue-800 border-blue-300',
    troubleshooting: 'bg-orange-100 text-orange-800 border-orange-300',
    handoff:      'bg-purple-100 text-purple-800 border-purple-300',
    unknown:      'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_MAP = {
    // Map result strings to status
    capacity_ok: 'success', capacity_flagged: 'warning',
    registered: 'success', agent_validated: 'success',
    agent_installed_by_orchestrator: 'success',
    agent_installed_by_customer: 'warning',
    blocked_manual_required: 'blocked', blocked_no_agent: 'blocked',
    syncing: 'progress', delta_complete: 'success',
    source_stopped: 'success', target_launched: 'success',
    SMS_SUCCESS: 'success', SMS_MIGRATION_SUCCESS: 'success',
    SMS_MIGRATION_SUCCESS_AFTER_TROUBLESHOOTING: 'success',
    IMAGE_MIGRATION_SUCCESS: 'success',
    BLOCKED_MANUAL_AGENT_REQUIRED: 'blocked',
    BLOCKED: 'blocked', retrying: 'warning',
    escalating: 'warning', troubleshooting: 'troubleshooting',
    resolved: 'success', not_resolved: 'error',
    boot_fixed: 'success', partition_fixed: 'success',
    hss_installed: 'success', uniagent_installed: 'success',
    lts_installed: 'success', smoke_tests_passed: 'success',
    smoke_tests_failed: 'error',
};

const StatusBadge = ({ result, outcome }) => {
    const status = STATUS_MAP[result] || STATUS_MAP[outcome] || 'unknown';
    const style = STATUS_STYLES[status];
    const icon = status === 'success' ? 'fa-check-circle' :
                 status === 'warning' ? 'fa-exclamation-triangle' :
                 status === 'error' ? 'fa-times-circle' :
                 status === 'blocked' ? 'fa-ban' :
                 status === 'progress' ? 'fa-spinner fa-spin' :
                 status === 'troubleshooting' ? 'fa-wrench' :
                 status === 'handoff' ? 'fa-handshake' : 'fa-circle';
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded border uppercase ${style}`}>
            <i className={`fas ${icon} text-[9px]`}></i>
            {(result || outcome || '?').replace(/_/g, ' ')}
        </span>
    );
};

/* ── Sub-component: Command card in terminal style ── */
const CommandCard = ({ cmd }) => (
    <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs">
        <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                {cmd.desc}
            </span>
            <CopyButton text={cmd.cmd} />
        </div>
        <code className="text-emerald-400 break-all leading-relaxed block">
            $ {cmd.cmd}
        </code>
    </div>
);

/* ── Sub-component: Dependency chain indicator ── */
const DependencyChain = ({ dependencies, blocked_by }) => {
    if (!dependencies && !blocked_by) return null;
    const deps = dependencies || [];
    return (
        <div className="mt-2 ml-2 pl-3 border-l-2 border-amber-300 text-[11px] space-y-1">
            {blocked_by && (
                <div className="text-rose-600 flex items-center gap-1.5">
                    <i className="fas fa-lock text-[9px]"></i>
                    <span className="font-bold">BLOCKED BY:</span> {blocked_by}
                </div>
            )}
            {deps.map((dep, i) => (
                <div key={i} className={`flex items-center gap-1.5 ${dep.status === 'ok' ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <i className={`fas ${dep.status === 'ok' ? 'fa-check-circle' : 'fa-circle'} text-[9px]`}></i>
                    <span className="font-bold">{dep.name}:</span>
                    <span>{dep.desc}</span>
                </div>
            ))}
        </div>
    );
};

/* ── Sub-component: History enrichment callout ── */
const HistoryCallout = ({ learnings, history_sourced, best_match_project }) => {
    if (!history_sourced && !learnings) return null;
    return (
        <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px]">
            <div className="flex items-center gap-1.5 mb-1 text-indigo-700 font-bold">
                <i className="fas fa-brain text-[10px]"></i>
                📚 Cross-Project Learning
                {best_match_project && <span className="text-indigo-400 font-normal">— from {best_match_project}</span>}
            </div>
            {learnings && Object.keys(learnings).length > 0 && (
                <div className="space-y-0.5 text-indigo-600">
                    {Object.entries(learnings).map(([k, v]) => (
                        <div key={k} className="flex gap-1.5">
                            <span className="font-bold">• {k.replace(/_/g, ' ')}:</span>
                            <span>{typeof v === 'boolean' ? (v ? '✅' : '❌') : String(v)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ── Sub-component: Resource spec display ── */
const ResourceSpec = ({ spec }) => {
    if (!spec || Object.keys(spec).length === 0) return null;
    return (
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1.5 text-[10px]">
            {Object.entries(spec).map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded px-2 py-1 flex justify-between">
                    <span className="text-slate-400">{k.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-700">{String(v)}</span>
                </div>
            ))}
        </div>
    );
};

/* ── Sub-component: Single trace entry (expandable) ── */
const TraceEntry = ({ step, isLast, isExpanded, onToggle }) => {
    const hasCommands = step.commands && step.commands.length > 0;
    const hasDeps = (step.dependencies && step.dependencies.length > 0) || step.blocked_by;
    const hasLearning = step.history_sourced || (step.learnings_applied && Object.keys(step.learnings_applied).length > 0);
    const hasDecision = step.decision && Object.keys(step.decision).length > 0;
    const hasSpec = step.resourceSpec || step.network_spec;
    const hasResources = step.resource_usage || step.metrics;

    return (
        <div
            className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${isExpanded ? 'bg-slate-50/80' : ''}`}
            onClick={() => onToggle(step.id)}
        >
            <div className="px-4 py-3 flex items-start gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center shrink-0 pt-1.5">
                    <StatusBadge result={step.result} outcome={step.outcome} />
                    {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[8px]"></div>}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            {step.phase?.replace('PHASE_', 'Φ').replace(/_/g, '.')}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600">
                            {step.action?.replace(/_/g, ' ') || 'STEP'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">{step.agent}</span>
                        <span className="text-[10px] text-slate-400 ml-auto font-mono">
                            +{step.timestamp_offset_seconds}s
                        </span>
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-300 text-[10px] shrink-0 ml-1`}></i>
                    </div>

                    {/* Message */}
                    <p className={`text-xs text-slate-600 mt-1 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {step.message}
                    </p>

                    {/* Expanded details */}
                    {isExpanded && (
                        <div className="mt-3 space-y-3">
                            {/* History enrichment */}
                            <HistoryCallout
                                history_sourced={step.history_sourced}
                                learnings={step.learnings_applied}
                                best_match_project={step.best_match_project}
                            />

                            {/* Dependencies */}
                            <DependencyChain
                                dependencies={step.dependencies}
                                blocked_by={step.blocked_by}
                            />

                            {/* Resource spec */}
                            {hasSpec && <ResourceSpec spec={step.resourceSpec || step.network_spec} />}

                            {/* Metrics */}
                            {hasResources && (
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 text-[10px]">
                                    {Object.entries(step.resource_usage || step.metrics || {}).map(([k, v]) => (
                                        <div key={k} className="bg-slate-50 rounded px-2 py-1 text-center">
                                            <div className="font-black text-slate-700">{typeof v === 'number' ? v.toFixed(1) : String(v)}</div>
                                            <div className="text-slate-400">{k.replace(/_/g, ' ')}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Commands */}
                            {hasCommands && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <i className="fas fa-terminal text-[9px]"></i>
                                        Commands ({step.commands.length})
                                    </div>
                                    {step.commands.map((cmd, i) => (
                                        <CommandCard key={i} cmd={cmd} />
                                    ))}
                                </div>
                            )}

                            {/* Decision */}
                            {hasDecision && (
                                <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-[11px]">
                                    <div className="text-purple-700 font-bold mb-1 flex items-center gap-1.5">
                                        <i className="fas fa-code-branch text-[10px]"></i>
                                        Decision
                                    </div>
                                    <div className="space-y-0.5 text-purple-600">
                                        {Object.entries(step.decision).map(([k, v]) => (
                                            <div key={k} className="flex gap-1.5">
                                                <span className="font-bold">• {k.replace(/_/g, ' ')}:</span>
                                                <span>{v === null ? '—' : String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Troubleshooting / Resolution detail */}
                            {step.troubleshooting_steps && (
                                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-[11px]">
                                    <div className="text-orange-700 font-bold mb-1 flex items-center gap-1.5">
                                        <i className="fas fa-wrench text-[10px]"></i>
                                        Troubleshooting
                                    </div>
                                    <div className="space-y-1">
                                        {step.troubleshooting_steps.map((ts, i) => (
                                            <div key={i} className="flex gap-1.5 text-orange-600">
                                                <span className="font-bold">Step {i+1}:</span>
                                                <span>{ts.action} → {ts.result}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step.resolution && (
                                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px]">
                                    <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                                        <i className="fas fa-check-circle text-[10px]"></i>
                                        Resolution: {step.resolution}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Sub-component: Phase group header ── */
const PhaseHeader = ({ icon, label, count, color, isExpanded, onToggle }) => (
    <div
        className={`px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${isExpanded ? 'bg-white' : 'bg-slate-50'} border-b border-slate-200`}
        onClick={onToggle}
    >
        <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center shadow-sm shrink-0`}>
            <i className={`fas ${icon} text-white text-sm`}></i>
        </div>
        <div className="flex-1">
            <h6 className="font-black text-slate-800 text-sm">{label}</h6>
            <span className="text-[10px] text-slate-500">{count} steps</span>
        </div>
        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-slate-400 text-sm`}></i>
    </div>
);




export default function AgenticOrchestrationPanel({ project, onUpdateProject }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(project?.agenticDryRun || null);
    const [error, setError] = useState(null);
    const [expandedSteps, setExpandedSteps] = useState({});
    const [expandedPhases, setExpandedPhases] = useState({
        'PHASE_4_0': true, 'PHASE_4_1': true, 'PHASE_4_2': true, 'PHASE_4_7': true
    });
    const [showSummary, setShowSummary] = useState(true);

    const token = sessionStorage.getItem('hermes_access_token');

    const handleDryRun = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/agentic-dry-run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setResult(data);
                onUpdateProject(project.id, 'agenticDryRun', data);
            } else {
                setError(data.error || 'Unknown error');
            }
        } catch (e) {
            setError(e.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const toggleStep = (id) => {
        setExpandedSteps(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const togglePhase = (phase) => {
        setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
    };

    // Group trace entries by phase
    const phaseGroups = useMemo(() => {
        if (!result?.trace) return {};
        const groups = {};
        const phaseOrder = ['PHASE_4_0', 'PHASE_4_1', 'PHASE_4_2', 'PHASE_4_7'];
        phaseOrder.forEach(p => { groups[p] = []; });
        result.trace.forEach(step => {
            const phase = step.phase?.startsWith('PHASE_4_2') ? 'PHASE_4_2' : step.phase;
            if (groups[phase]) groups[phase].push(step);
            // Also partition by wave within 4.2
        });
        return groups;
    }, [result]);

    const totalSteps = result?.trace?.length || 0;
    const summary = result?.summary;

    // Partition 4.2 entries by wave
    const waveGroups = useMemo(() => {
        if (!result?.trace) return [];
        const wave4_2 = phaseGroups['PHASE_4_2'] || [];
        const waves = [];
        let currentWave = null;
        wave4_2.forEach(step => {
            if (step.action === 'WAVE_START') {
                if (currentWave) waves.push(currentWave);
                currentWave = { name: step.decision?.wave || 'Wave', servers: step.decision?.server_count || 0, steps: [step] };
            } else if (currentWave) {
                currentWave.steps.push(step);
            } else {
                // Before first WAVE_START
                if (!waves[0]) waves.push({ name: 'Pre-Wave', servers: 0, steps: [] });
                waves[0].steps.push(step);
            }
        });
        if (currentWave) waves.push(currentWave);
        return waves;
    }, [result, phaseGroups]);

    const PHASE_CONFIG = {
        'PHASE_4_0': { icon: 'fa-power-off', label: 'Φ4.0 — Orchestrator Initialization', color: 'bg-slate-600' },
        'PHASE_4_1': { icon: 'fa-network-wired', label: 'Φ4.1 — Network Provisioning', color: 'bg-blue-600' },
        'PHASE_4_2': { icon: 'fa-server', label: 'Φ4.2 — Wave Processing', color: 'bg-purple-600' },
        'PHASE_4_7': { icon: 'fa-trash-alt', label: 'Φ4.7 — Garbage Collection', color: 'bg-emerald-600' },
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Trigger Button */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-6 shadow-inner">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-300 shrink-0">
                        <i className="fas fa-flask text-white text-xl"></i>
                    </div>
                    <div className="flex-1">
                        <h5 className="font-black text-purple-900 text-lg mb-1">
                            Agentic Orchestration — Dry-Run Simulation
                        </h5>
                        <p className="text-sm text-purple-700/80 leading-relaxed mb-4">
                            Simulate how Hermes would autonomously process all waves for this project.
                            <strong> No cloud resources are provisioned or modified.</strong> Each step shows
                            the exact CLI/API commands, resource specs, dependencies, and troubleshooting
                            paths that would execute in a live orchestration.
                        </p>
                        <button
                            onClick={handleDryRun}
                            disabled={loading}
                            className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                                loading
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30 active:scale-95'
                            }`}
                        >
                            {loading ? (
                                <><i className="fas fa-spinner fa-spin mr-2"></i> Simulating...</>
                            ) : result ? (
                                <><i className="fas fa-redo mr-2"></i> Re-run Simulation</>
                            ) : (
                                <><i className="fas fa-play mr-2"></i> Run Dry-Run Simulation</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">
                    <i className="fas fa-exclamation-triangle mr-2"></i> {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <>
                    {/* Summary Card */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div
                            className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer"
                            onClick={() => setShowSummary(!showSummary)}
                        >
                            <h5 className="font-black text-slate-800 text-sm uppercase tracking-widest">
                                <i className={`fas fa-chevron-${showSummary ? 'down' : 'right'} mr-2 text-slate-400`}></i>
                                Simulation Summary
                            </h5>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {summary?.servers_processed || 0} servers • {summary?.waves_count || 0} waves
                            </span>
                        </div>
                        {showSummary && summary && (
                            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <div className="text-2xl font-black text-purple-600">{summary.servers_processed}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Servers</div>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <div className="text-2xl font-black text-indigo-600">{summary.waves_count}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Waves</div>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <div className="text-2xl font-black text-blue-600">{summary.peak_parallel_agents}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Peak Agents</div>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <div className={`text-2xl font-black ${summary.cost_efficiency === 'UNDER_BUDGET' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {summary.estimated_wall_clock_days}d
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Est. Duration</div>
                                </div>
                                <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                                    <div className="text-xs text-slate-500">
                                        <span className="block text-slate-400">Throughput</span>
                                        <strong>{summary.effective_throughput_mbps} Mbps</strong>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        <span className="block text-slate-400">Est. Cost</span>
                                        <strong>${summary.cost_estimate_usd?.toLocaleString()}</strong>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        <span className="block text-slate-400">Budget</span>
                                        <strong>${summary.budget_usd?.toLocaleString()}</strong>
                                    </div>
                                    <div className="text-xs">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                            summary.cost_efficiency === 'UNDER_BUDGET' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {summary.cost_efficiency === 'UNDER_BUDGET' ? '✅ Under Budget' : '⚠️ Over Budget'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Learning System Stats */}
                    {summary?.learning_system && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                            <h6 className="font-black text-indigo-800 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                <i className="fas fa-brain text-indigo-600"></i>
                                Self-Learning Engine
                            </h6>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                                <div className="bg-white rounded-lg p-2 shadow-sm">
                                    <div className="text-lg font-black text-indigo-600">{summary.learning_system.total_history_records}</div>
                                    <div className="text-[9px] text-slate-400 uppercase">History Records</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 shadow-sm">
                                    <div className="text-lg font-black text-indigo-600">{summary.learning_system.success_rate}</div>
                                    <div className="text-[9px] text-slate-400 uppercase">Success Rate</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 shadow-sm">
                                    <div className="text-lg font-black text-indigo-600">{summary.learning_system.unique_projects}</div>
                                    <div className="text-[9px] text-slate-400 uppercase">Projects Learned</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 shadow-sm">
                                    <div className="text-lg font-black text-indigo-600">{summary.learning_system.records_ingested}</div>
                                    <div className="text-[9px] text-slate-400 uppercase">Records Ingested</div>
                                </div>
                                <div className="bg-white rounded-lg p-2 shadow-sm">
                                    <div className="text-sm font-black text-indigo-600">
                                        {Object.keys(summary.learning_system.strategy_distribution || {}).length}
                                    </div>
                                    <div className="text-[9px] text-slate-400 uppercase">Strategies Known</div>
                                </div>
                            </div>
                            <p className="text-[10px] text-indigo-500/70 mt-2 leading-relaxed">
                                {summary.learning_system.note}
                            </p>
                        </div>
                    )}

                    {/* Resource Usage */}
                    {summary?.resource_usage && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <h6 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-3">
                                <i className="fas fa-cloud mr-2 text-indigo-500"></i> Simulated Resource Footprint
                            </h6>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
                                {Object.entries(summary.resource_usage).map(([key, val]) => (
                                    key !== 'peak_parallel_agents' && (
                                        <div key={key} className="bg-slate-50 rounded-lg p-2">
                                            <div className="text-lg font-black text-slate-700">{val}</div>
                                            <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                                                {key.replace(/_/g, ' ')}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Execution Trace — Grouped by Phase ── */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex justify-between items-center">
                            <h5 className="font-black text-slate-800 text-sm uppercase tracking-widest">
                                <i className="fas fa-project-diagram mr-2 text-purple-500"></i>
                                Execution Trace ({totalSteps} steps)
                            </h5>
                            <div className="flex gap-2">
                                <button
                                    className="text-[9px] font-bold text-purple-500 hover:text-purple-700 uppercase"
                                    onClick={() => setExpandedSteps(Object.fromEntries(
                                        (result.trace || []).map(s => [s.id, true])
                                    ))}
                                >
                                    Expand All
                                </button>
                                <button
                                    className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase"
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
                                        <div className="divide-y divide-slate-100">
                                            {phaseGroups['PHASE_4_0'].map((step, idx) => (
                                                <TraceEntry
                                                    key={step.id}
                                                    step={step}
                                                    isLast={idx === phaseGroups['PHASE_4_0'].length - 1}
                                                    isExpanded={expandedSteps[step.id] || false}
                                                    onToggle={toggleStep}
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
                                        <div className="divide-y divide-slate-100">
                                            {phaseGroups['PHASE_4_1'].map((step, idx) => (
                                                <TraceEntry
                                                    key={step.id}
                                                    step={step}
                                                    isLast={idx === phaseGroups['PHASE_4_1'].length - 1}
                                                    isExpanded={expandedSteps[step.id] || false}
                                                    onToggle={toggleStep}
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
                                        <div className="divide-y divide-slate-200">
                                            {waveGroups.map((wave, wi) => (
                                                <div key={wi}>
                                                    {/* Wave sub-header */}
                                                    <div className="px-4 py-2 bg-purple-50/50 border-b border-purple-100 flex items-center gap-3">
                                                        <i className="fas fa-play-circle text-purple-500 text-xs"></i>
                                                        <span className="text-xs font-black text-purple-700 uppercase tracking-wider">
                                                            {wave.name}
                                                        </span>
                                                        <span className="text-[10px] text-purple-400">
                                                            {wave.servers} servers • {wave.steps.filter(s => s.action !== 'WAVE_START' && s.action !== 'WAVE_COMPLETE' && s.action !== 'HANDOFF').length} operations
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {wave.steps.map((step, idx) => (
                                                            <TraceEntry
                                                                key={step.id}
                                                                step={step}
                                                                isLast={idx === wave.steps.length - 1 && wi === waveGroups.length - 1}
                                                                isExpanded={expandedSteps[step.id] || false}
                                                                onToggle={toggleStep}
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
                                        <div className="divide-y divide-slate-100">
                                            {phaseGroups['PHASE_4_7'].map((step, idx) => (
                                                <TraceEntry
                                                    key={step.id}
                                                    step={step}
                                                    isLast={idx === phaseGroups['PHASE_4_7'].length - 1}
                                                    isExpanded={expandedSteps[step.id] || false}
                                                    onToggle={toggleStep}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comparison Toggle — "Standard" vs "Agentic" view */}
                    <div className="text-center flex items-center justify-center gap-4">
                        <button
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 uppercase flex items-center gap-1.5"
                            onClick={() => window.dispatchEvent(new CustomEvent('hermes:show-standard-view'))}
                        >
                            <i className="fas fa-project-diagram text-[9px]"></i>
                            Switch to Standard Methodology View
                        </button>
                        <div className="w-px h-3 bg-slate-300"></div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <i className="fas fa-shield-alt text-[9px]"></i>
                            DRY-RUN — No cloud resources were provisioned or modified.
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
