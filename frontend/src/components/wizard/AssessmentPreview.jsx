import React, { useState, useEffect } from 'react';
import AgenticOrchestrationPanel from './AgenticOrchestrationPanel';

/**
 * AssessmentPreview — Phase 3.6
 *
 * Shallow simulation from raw project data. Calls the agentic-dry-run
 * endpoint with assessment_preview=true to get a fast, advisory preview
 * of strategy, cost, timing, and blockers before the full Execution Plan
 * is built in 3.7 Wave & Runbook Planning.
 *
 * Once the dry-run completes, it injects the result into the project object
 * and renders the full AgenticOrchestrationPanel (constellation, traces,
 * timeline, resource footprint, rollback plan) in read-only advisory mode.
 *
 * Props: { activeProject, onUpdateProject }
 */
export default function AssessmentPreview({ activeProject, onUpdateProject }) {
    const [loading, setLoading] = useState(false);
    const [simResult, setSimResult] = useState(activeProject?.agenticDryRun || null);
    const [error, setError] = useState(null);
    const [hasRun, setHasRun] = useState(!!activeProject?.agenticDryRun);

    const handleRunAssessment = async () => {
        if (!activeProject?.id) return;
        setLoading(true);
        setError(null);
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
            setSimResult(data);
            setHasRun(true);
            // Inject into project so AgenticOrchestrationPanel picks it up
            if (onUpdateProject) {
                onUpdateProject({
                    ...activeProject,
                    agenticDryRun: data,
                });
            }
        } catch (e) {
            setError(String(e.message || e));
        } finally {
            setLoading(false);
        }
    };

    // Derive validation status
    const validation = simResult?.validation || {};
    const status = validation.status || null;
    const blockers = validation.blockers || [];
    const warnings = validation.warnings || [];
    const hasBlockers = blockers.length > 0;
    const hasWarnings = warnings.length > 0;
    const statusLevel = hasBlockers ? 'blocked' : hasWarnings ? 'warnings' : (status === 'PASS' ? 'pass' : status ? 'warnings' : 'pass');

    const statusConfig = {
        pass:    { icon: 'fa-check-circle',     label: 'PASS',     bg: 'bg-emerald-50',  border: 'border-emerald-300',  text: 'text-emerald-700',  badge: 'bg-emerald-600' },
        warnings:{ icon: 'fa-exclamation-triangle', label: 'WARNINGS', bg: 'bg-amber-50',    border: 'border-amber-300',    text: 'text-amber-700',    badge: 'bg-amber-600' },
        blocked: { icon: 'fa-times-circle',     label: 'BLOCKED',   bg: 'bg-rose-50',     border: 'border-rose-300',     text: 'text-rose-700',     badge: 'bg-rose-600' },
    };
    const sc = statusConfig[statusLevel] || statusConfig.pass;

    // Build a project-like object with the simulation result baked in
    const projectWithResult = {
        ...activeProject,
        agenticDryRun: simResult,
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
            {/* Header + Controls */}
            <div className="p-4 bg-indigo-50 border-b border-indigo-200 shrink-0 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <i className="fas fa-chart-line text-indigo-600 text-lg mt-0.5"></i>
                    <div>
                        <h4 className="font-black text-indigo-800 text-sm uppercase tracking-widest">
                            Assessment Preview
                        </h4>
                        <p className="text-[10px] text-indigo-700/80 mt-0.5 font-medium">
                            Shallow simulation from project data — <b>advisory only</b>. Deep plan-based validation in Phase 4.0.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {/* Status badge (after run) */}
                    {hasRun && !error && (
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white ${sc.badge}`}>
                            <i className={`fas ${sc.icon} mr-1`}></i>{sc.label}
                        </span>
                    )}
                    <button
                        onClick={handleRunAssessment}
                        disabled={loading || !activeProject?.id}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow ${
                            loading ? 'bg-slate-200 text-slate-400 cursor-wait' :
                            !activeProject?.id ? 'bg-slate-100 text-slate-300 cursor-not-allowed' :
                            'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                    >
                        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rocket'}`}></i>
                        {loading ? 'Running...' : 'Run Assessment'}
                    </button>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="px-4 pt-3 shrink-0">
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2">
                    <i className="fas fa-exclamation-triangle text-amber-600 text-sm mt-0.5 shrink-0"></i>
                    <div className="text-[10px] text-amber-800 leading-relaxed">
                        <strong className="font-black">Advisory:</strong> Based on project data only — not the execution plan. Build the plan in 3.7, then run <b>Plan Validation</b> in Phase 4.0 for precise PASS/WARNINGS/BLOCKED status.
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="px-4 pt-3 shrink-0">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
                        <i className="fas fa-times-circle text-rose-600 text-sm mt-0.5 shrink-0"></i>
                        <div className="text-xs text-rose-800">
                            <strong className="font-black block mb-0.5">Assessment Failed</strong>{error}
                        </div>
                    </div>
                </div>
            )}

            {/* Simulation Results — full AgenticOrchestrationPanel */}
            {simResult && !error && (
                <div className="flex-1 overflow-hidden">
                    <AgenticOrchestrationPanel
                        project={projectWithResult}
                        onUpdateProject={onUpdateProject}
                    />
                </div>
            )}

            {/* Empty state */}
            {!simResult && !error && !loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-slate-400">
                        <i className="fas fa-chart-line text-6xl mb-4 opacity-20"></i>
                        <p className="text-sm font-bold text-slate-500">No assessment run yet</p>
                        <p className="text-xs mt-1 text-slate-400">Click <strong>Run Assessment</strong> to preview migration strategy, cost, timing, and blockers.</p>
                        <p className="text-[10px] mt-3 text-slate-400/70">Results include: simulation constellation, trace replay, resource footprint, rollback plan</p>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-indigo-600">
                        <i className="fas fa-spinner fa-spin text-4xl mb-3"></i>
                        <p className="text-sm font-bold">Running shallow simulation...</p>
                        <p className="text-xs mt-1 text-indigo-400">Analyzing project data for strategy, cost, timing, and blockers</p>
                    </div>
                </div>
            )}
        </div>
    );
}
