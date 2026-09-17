import React, { useState } from 'react';

/**
 * AssessmentPreview — Phase 3.5
 *
 * Lightweight simulation from raw project data. Calls the agentic-dry-run
 * endpoint with assessment_preview=true to get a fast, non-binding preview
 * of strategy, cost, timing, and blockers before the full Execution Plan
 * is built in 3.6 Wave & Runbook Planning.
 *
 * Props: { activeProject, onUpdateProject }
 */
export default function AssessmentPreview({ activeProject, onUpdateProject }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleRunAssessment = async () => {
        if (!activeProject?.id) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const token = sessionStorage.getItem('hermes_access_token');
            const res = await fetch(`/api/projects/${activeProject.id}/agentic-dry-run`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ assessment_preview: true }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.message || `HTTP ${res.status}`);
            }
            setResult(data);
        } catch (e) {
            setError(String(e.message || e));
        } finally {
            setLoading(false);
        }
    };

    // Derive status from result
    const status = result?.status || result?.overall_status || null;
    const blockers = result?.blockers || result?.blocking_issues || [];
    const warnings = result?.warnings || [];
    const hasBlockers = blockers.length > 0;
    const hasWarnings = warnings.length > 0;
    const statusLevel = hasBlockers ? 'blocked' : hasWarnings ? 'warnings' : (status || 'pass');

    const statusConfig = {
        pass:    { color: 'emerald', icon: 'fa-check-circle',     label: 'PASS',     bg: 'bg-emerald-50',  border: 'border-emerald-200',  text: 'text-emerald-700',  badge: 'bg-emerald-600' },
        warnings:{ color: 'amber',   icon: 'fa-exclamation-triangle', label: 'WARNINGS', bg: 'bg-amber-50',    border: 'border-amber-200',    text: 'text-amber-700',    badge: 'bg-amber-600' },
        blocked: { color: 'rose',    icon: 'fa-times-circle',     label: 'BLOCKED',   bg: 'bg-rose-50',     border: 'border-rose-200',     text: 'text-rose-700',     badge: 'bg-rose-600' },
    };
    const sc = statusConfig[statusLevel] || statusConfig.pass;

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="bg-indigo-50 border-b border-indigo-200 p-5 rounded-t-xl shrink-0">
                <h4 className="font-black text-indigo-800 text-sm uppercase tracking-widest">
                    <i className="fas fa-chart-line mr-2"></i> Assessment Preview
                </h4>
                <p className="text-xs text-indigo-700/80 mt-1 font-medium">
                    Run a lightweight simulation from raw project data to preview strategy, cost, timing, and potential blockers before building the full Execution Plan.
                </p>
            </div>

            {/* Disclaimer Banner */}
            <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shrink-0">
                <i className="fas fa-exclamation-triangle text-amber-600 text-lg mt-0.5 shrink-0"></i>
                <div className="text-xs text-amber-800 leading-relaxed">
                    <strong className="font-black">Disclaimer:</strong> Based on project data only. Build the Execution Plan in 3.6 for precise validation.
                </div>
            </div>

            {/* Run Assessment Button */}
            <div className="mt-4 shrink-0">
                <button
                    onClick={handleRunAssessment}
                    disabled={loading || !activeProject?.id}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow ${
                        loading ? 'bg-slate-200 text-slate-400 cursor-wait' :
                        !activeProject?.id ? 'bg-slate-100 text-slate-300 cursor-not-allowed' :
                        'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rocket'}`}></i>
                    {loading ? 'Running Assessment...' : 'Run Assessment'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-4 shrink-0">
                    <div className="flex items-start gap-3">
                        <i className="fas fa-times-circle text-rose-600 text-lg mt-0.5 shrink-0"></i>
                        <div className="text-xs text-rose-800 leading-relaxed">
                            <strong className="font-black block mb-1">Assessment Failed</strong>
                            {error}
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && !error && (
                <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                    {/* Status Badge */}
                    <div className={`rounded-xl border-2 p-4 ${sc.bg} ${sc.border}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <i className={`fas ${sc.icon} text-2xl ${sc.text}`}></i>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overall Status</div>
                                    <div className={`text-lg font-black ${sc.text}`}>{sc.label}</div>
                                </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white ${sc.badge}`}>
                                {sc.label}
                            </span>
                        </div>
                    </div>

                    {/* Strategy Summary */}
                    <div className="bg-slate-800 dark rounded-xl border border-slate-700 p-5">
                        <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3">
                            <i className="fas fa-route text-indigo-400 mr-1.5"></i> Strategy Summary
                        </h5>
                        <div className="space-y-2">
                            {result.strategy_summary || result.strategy ? (
                                <p className="text-sm text-slate-200 leading-relaxed">
                                    {typeof (result.strategy_summary || result.strategy) === 'string'
                                        ? (result.strategy_summary || result.strategy)
                                        : JSON.stringify(result.strategy_summary || result.strategy, null, 2)}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500 italic">No strategy summary available.</p>
                            )}
                            {result.recommended_strategy && (
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Recommended:</span>
                                    <span className="px-2 py-0.5 rounded bg-indigo-900/50 border border-indigo-700 text-[10px] font-bold text-indigo-300">
                                        {result.recommended_strategy}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cost Estimate + Timing Estimate — side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cost Estimate */}
                        <div className="bg-slate-800 dark rounded-xl border border-slate-700 p-5">
                            <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3">
                                <i className="fas fa-coins text-amber-400 mr-1.5"></i> Cost Estimate
                            </h5>
                            {result.cost_estimate || result.cost ? (
                                <div className="space-y-2">
                                    {(() => {
                                        const cost = result.cost_estimate || result.cost;
                                        if (typeof cost === 'string' || typeof cost === 'number') {
                                            return <p className="text-2xl font-black text-amber-300">{typeof cost === 'number' ? `$${cost.toLocaleString()}` : cost}</p>;
                                        }
                                        return Object.entries(cost).slice(0, 5).map(([k, v]) => (
                                            <div key={k} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                                                <span className="font-bold text-amber-300">
                                                    {typeof v === 'number' ? `$${v.toLocaleString()}` : String(v)}
                                                </span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic">No cost estimate available.</p>
                            )}
                        </div>

                        {/* Timing Estimate */}
                        <div className="bg-slate-800 dark rounded-xl border border-slate-700 p-5">
                            <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3">
                                <i className="fas fa-clock text-sky-400 mr-1.5"></i> Timing Estimate
                            </h5>
                            {result.timing_estimate || result.timing ? (
                                <div className="space-y-2">
                                    {(() => {
                                        const timing = result.timing_estimate || result.timing;
                                        if (typeof timing === 'string' || typeof timing === 'number') {
                                            return <p className="text-2xl font-black text-sky-300">{timing}{typeof timing === 'number' ? ' hrs' : ''}</p>;
                                        }
                                        return Object.entries(timing).slice(0, 5).map(([k, v]) => (
                                            <div key={k} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                                                <span className="font-bold text-sky-300">{String(v)}</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic">No timing estimate available.</p>
                            )}
                        </div>
                    </div>

                    {/* Blockers */}
                    <div className="bg-slate-800 dark rounded-xl border border-slate-700 p-5">
                        <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3">
                            <i className="fas fa-ban text-rose-400 mr-1.5"></i> Blockers
                            {blockers.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-rose-900/50 border border-rose-700 text-[9px] text-rose-300">
                                    {blockers.length}
                                </span>
                            )}
                        </h5>
                        {blockers.length > 0 ? (
                            <div className="space-y-2">
                                {blockers.map((b, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                        <i className="fas fa-times-circle text-rose-500 mt-0.5 shrink-0"></i>
                                        <span>{typeof b === 'string' ? b : (b.message || b.description || JSON.stringify(b))}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-emerald-400 flex items-center gap-2">
                                <i className="fas fa-check-circle"></i> No blockers detected.
                            </p>
                        )}
                    </div>

                    {/* Warnings (if any) */}
                    {hasWarnings && (
                        <div className="bg-slate-800 dark rounded-xl border border-slate-700 p-5">
                            <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3">
                                <i className="fas fa-exclamation-triangle text-amber-400 mr-1.5"></i> Warnings
                                <span className="ml-2 px-2 py-0.5 rounded bg-amber-900/50 border border-amber-700 text-[9px] text-amber-300">
                                    {warnings.length}
                                </span>
                            </h5>
                            <div className="space-y-2">
                                {warnings.map((w, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                        <i className="fas fa-exclamation-circle text-amber-500 mt-0.5 shrink-0"></i>
                                        <span>{typeof w === 'string' ? w : (w.message || w.description || JSON.stringify(w))}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!result && !error && !loading && (
                <div className="mt-4 flex-1 flex items-center justify-center">
                    <div className="text-center text-slate-400">
                        <i className="fas fa-chart-line text-5xl mb-4 opacity-30"></i>
                        <p className="text-sm font-bold text-slate-500">No assessment run yet.</p>
                        <p className="text-xs mt-1">Click <strong>Run Assessment</strong> to preview migration outcomes.</p>
                    </div>
                </div>
            )}
        </div>
    );
}