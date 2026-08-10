import React, { useState } from 'react';

/**
 * AgenticOrchestrationPanel — shown when 'Agentic Orchestration' is selected in 3.4b.
 * Provides dry-run simulation of how Hermes would autonomously process this project's waves.
 */
export default function AgenticOrchestrationPanel({ project, onUpdateProject }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(project?.agenticDryRun || null);
    const [error, setError] = useState(null);
    const [expandedSteps, setExpandedSteps] = useState({});
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

    const getPhaseColor = (phase) => {
        if (phase.startsWith('PHASE_4_0')) return 'bg-slate-100 text-slate-700 border-slate-300';
        if (phase.startsWith('PHASE_4_1')) return 'bg-blue-100 text-blue-700 border-blue-300';
        if (phase.startsWith('PHASE_4_2')) return 'bg-purple-100 text-purple-700 border-purple-300';
        if (phase.startsWith('PHASE_4_7')) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const getActionIcon = (action) => {
        if (!action) return 'fa-circle';
        if (action.includes('INIT')) return 'fa-power-off';
        if (action.includes('NETWORK')) return 'fa-network-wired';
        if (action.includes('WAVE_START')) return 'fa-play-circle';
        if (action.includes('WAVE_COMPLETE')) return 'fa-check-circle';
        if (action.includes('HANDOFF')) return 'fa-handshake';
        if (action.includes('GARBAGE')) return 'fa-trash-alt';
        return 'fa-circle';
    };

    const summary = result?.summary;
    const trace = result?.trace || [];

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
                            <strong> No cloud resources are provisioned or modified.</strong> The simulation
                            uses your topology, physics, and wave plan to trace every agent decision.
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
                                <>
                                    <i className="fas fa-spinner fa-spin mr-2"></i> Simulating...
                                </>
                            ) : result ? (
                                <>
                                    <i className="fas fa-redo mr-2"></i> Re-run Simulation
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-play mr-2"></i> Run Dry-Run Simulation
                                </>
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

                    {/* Trace Timeline */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                            <h5 className="font-black text-slate-800 text-sm uppercase tracking-widest">
                                <i className="fas fa-list-ol mr-2 text-purple-500"></i>
                                Execution Trace ({trace.length} steps)
                            </h5>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {trace.map((step, idx) => {
                                const isExpanded = expandedSteps[step.id] || false;
                                const isLast = idx === trace.length - 1;
                                return (
                                    <div
                                        key={step.id}
                                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${isLast ? '' : ''}`}
                                        onClick={() => toggleStep(step.id)}
                                    >
                                        <div className="px-4 py-3 flex items-start gap-3">
                                            {/* Timeline connector */}
                                            <div className="flex flex-col items-center shrink-0 pt-1">
                                                <div className={`w-2.5 h-2.5 rounded-full border-2 ${getPhaseColor(step.phase)}`}></div>
                                                {!isLast && <div className="w-0.5 h-full bg-slate-200 my-0.5"></div>}
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${getPhaseColor(step.phase)}`}>
                                                        {step.phase.replace('PHASE_', 'Φ').replace(/_/g, '.')}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-500">
                                                        <i className={`fas ${getActionIcon(step.action)} mr-1 text-[10px]`}></i>
                                                        {step.action?.replace(/_/g, ' ') || 'STEP'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 ml-auto">
                                                        +{step.timestamp_offset_seconds}s
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                                                    <span className="font-bold text-slate-700">{step.agent}:</span> {step.message}
                                                </p>
                                                {/* Expanded details */}
                                                {isExpanded && step.decision && (
                                                    <div className="mt-2 ml-2 pl-3 border-l-2 border-purple-200 text-[11px] text-slate-500 space-y-1">
                                                        {typeof step.decision === 'object' ? (
                                                            Object.entries(step.decision).map(([k, v]) => (
                                                                <div key={k} className="flex gap-2">
                                                                    <span className="font-bold text-purple-600 shrink-0">{k}:</span>
                                                                    <span>
                                                                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span>{String(step.decision)}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-300 text-xs mt-1 shrink-0`}></i>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Note */}
                    <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-2">
                        <i className="fas fa-shield-alt"></i>
                        {summary?.note || 'DRY-RUN — No cloud resources were provisioned or modified.'}
                    </div>
                </>
            )}
        </div>
    );
}
