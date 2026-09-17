import React, { useState } from 'react';
import ToolRecommendationView from './ToolRecommendationView';
import PhysicsEngine from './PhysicsEngine';
import FinOpsCalculator from './FinOpsCalculator';
import DedicatedMigrationPlan from './DedicatedMigrationPlan';
import CutoverRunbookView from './CutoverRunbookView';
import AgenticOrchestrationPanel from './AgenticOrchestrationPanel';

import TechnicalFeasibility from './TechnicalFeasibility';

// Agent model label for the spawn tree. NEVER hardcode a version here — read from
// the saved execution plan (project.data.executionPlan.model), falling back to the
// configured default 'glm-5.1'.
const resolveAgentModelName = (project) => {
    try {
        const pd = typeof project?.data === 'string' ? JSON.parse(project.data) : (project?.data || {});
        return pd?.executionPlan?.model || project?.executionPlan?.model || 'glm-5.1';
    } catch (e) {
        return 'glm-5.1';
    }
};

export default function StepPlanning({ project, onUpdateProject, onPromote }) {
    // 🚨 REORDERED: Default tab is now 'wbs' (3.1)
    const [subTab, setSubTab] = useState('feasibility');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [executionMode, setExecutionMode] = useState(project?.executionMode || 'manual');
    const [showGateModal, setShowGateModal] = useState(false);
    const [gateWarnings, setGateWarnings] = useState([]);
    const [gatePassed, setGatePassed] = useState(false);
    const [resourceRefreshKey, setResourceRefreshKey] = useState(0);
    const [buildPlanLoading, setBuildPlanLoading] = useState(false);
    const [buildPlanResult, setBuildPlanResult] = useState(null); // { ok, steps, planSteps, builtAt, actions, message, rawError }
    const [dryRunLoading, setDryRunLoading] = useState(false);
    const [stepsExpanded, setStepsExpanded] = useState(true);      // plan step preview table open/closed
    const [expandedStepRows, setExpandedStepRows] = useState({});  // per-row full-command expansion

    // Agent model label for AgenticOrchestrationPanel → SpawnTreeVisualizer (defaults 'glm-5.1').
    // Declared here at the top so no later code references an uninitialized binding (TDZ-safe).
    const agentModelName = resolveAgentModelName(project);

    // 🚨 NEW: Build Execution Plan (Phase 3.5 → Phase 4 handoff contract)
    // The plan is the template (placeholders: <src_id>, <ecs_id>, <task_id>...)
    // that Phase 4 execution resolves per-phase; simulation validates it.
    const handleBuildPlan = async () => {
        if (!project?.id) return;
        setBuildPlanLoading(true);
        setBuildPlanResult(null);
        try {
            const token = sessionStorage.getItem('hermes_access_token');
            const res = await fetch(`/api/execution/${project.id}/build-plan`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            const plan = data.plan || {};
            const steps = plan.steps || [];
            const actions = {};
            steps.forEach(s => { actions[s.action] = (actions[s.action] || 0) + 1; });
            setBuildPlanResult({
                ok: res.ok,
                steps: steps.length,
                planSteps: steps,
                builtAt: plan.built_at || '',
                actions,
                rawError: data.error || '',
            });
        } catch (e) {
            setBuildPlanResult({ ok: false, steps: 0, planSteps: [], builtAt: '', actions: {}, rawError: String(e) });
        } finally {
            setBuildPlanLoading(false);
        }
    };

    // 🚨 NEW: Dry-run simulation — validates the BUILT PLAN (execution template),
    // not just raw topology. Runs after build-plan so preflight/modeling reflects
    // the actual steps Phase 4 would execute.
    const handleDryRun = async () => {
        if (!project?.id) return;
        setDryRunLoading(true);
        try {
            const token = sessionStorage.getItem('hermes_access_token');
            await fetch(`/api/projects/${project.id}/agentic-dry-run`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'agentic' }),
            });
            // Simulation results are rendered in the Execution dashboard / constellation;
            // here we just confirm it ran so the user can click through.
            setBuildPlanResult(prev => prev ? { ...prev, dryRunDone: true } : { dryRunDone: true, ok: true, steps: 0, builtAt: '', actions: {} });
        } catch (e) {
            setBuildPlanResult(prev => prev ? { ...prev, dryRunError: String(e) } : { dryRunError: String(e), ok: false, steps: 0, builtAt: '', actions: {} });
        } finally {
            setDryRunLoading(false);
        }
    };

    // 🚨 SPLIT: 3.4a = Tool Recommendations, 3.4b = Execution Mode (after tools, before runbook)
    const handleRefreshResources = () => {
        setResourceRefreshKey(prev => prev + 1);
    };

    const menuItems = [
        { id: 'feasibility', num: '3.1', icon: 'fa-clipboard-check', label: 'Technical Feasibility' },
        { id: 'wbs', num: '3.2', icon: 'fa-tasks', label: 'WBS & RACI Matrix' },
        { id: 'physics', num: '3.3', icon: 'fa-microscope', label: 'Delivery Physics Engine' },
        { id: 'finops', num: '3.4', icon: 'fa-wallet', label: 'FinOps Budget & Burn' },
        { id: 'tools', num: '3.5', icon: 'fa-tools', label: 'Strategic Tooling' },
        { id: 'assessment', num: '3.6', icon: 'fa-chart-bar', label: 'Assessment Preview' },
        { id: 'runbook', num: '3.7', icon: 'fa-calendar-alt', label: 'Wave & Runbook Planning' }
    ];

    // 🚨 NEW: Phase 3 → Phase 4 Gate — validate prerequisites & build ExecutionPlan
    const handleGateCheck = () => {
        const warnings = [];
        let data = {};
        try { data = JSON.parse(project?.data || '{}'); } catch(e) {}

        // REQUIRED: execution mode (now in 4.0 Readiness Gateway — no longer blocking here)
        // Execution Mode moved to Phase 4.0 Readiness Gateway

        // RECOMMENDED: WBS & RACI populated
        if (!project?.wbsMatrix && !data?.wbs) {
            warnings.push({ level: 'recommended', tab: 'wbs', msg: 'WBS & RACI Matrix not populated. Visit 3.2 to define detailed work breakdown.' });
        }

        // RECOMMENDED: physics calculated (now 3.3)
        if (!project?.physics) {
            warnings.push({ level: 'recommended', tab: 'physics', msg: 'Delivery physics not calculated. Visit 3.3 for time/bandwidth estimates.' });
        }

        // RECOMMENDED: finops budget (now 3.4) — FIXED: checks actual save keys
        if (!project?.budget && !project?.financials) {
            warnings.push({ level: 'recommended', tab: 'finops', msg: 'FinOps budget & burn not configured. Visit 3.4 for cost envelopes.' });
        }

        // RECOMMENDED: tool assignments (now 3.5)
        if (!data?.toolAssignments && !data?.recommendations) {
            warnings.push({ level: 'recommended', tab: 'tools', msg: 'Tool assignments not generated. Visit 3.5 to run tool recommendations based on physics & cost analysis.' });
        }

        // RECOMMENDED: wave plan (now 3.7)
        if (!data?.waves && !data?.runbook) {
            warnings.push({ level: 'recommended', tab: 'runbook', msg: 'Wave cutover plan not created. Visit 3.7 to group servers into waves.' });
        }

        const hasBlocking = warnings.some(w => w.level === 'required');
        setGatePassed(!hasBlocking);
        setGateWarnings(warnings);
        setShowGateModal(true);
    };

    const handleProceedToExecution = () => {
        // Build ExecutionPlan contract — now includes physics & finops
        
        // Validate prerequisites exist
        const missingPrereqs = [];
        // Check for target architecture OR mapper nodes (either is valid)
        const hasTargetArch = project?.targetArchitecture && 
            (project.targetArchitecture.compute?.length > 0 || 
             project.targetArchitecture.database?.length > 0 ||
             project.targetArchitecture.storage?.length > 0);
        if (!hasTargetArch && (!project?.mapperNodes || project.mapperNodes.length === 0)) {
            missingPrereqs.push('Target architecture or topology nodes (Phase 2)');
        }
        // Check ORA — saved as { infraControl, itSkills, ... } (not riskScore)
        const oraData = project?.ora;
        const hasOra = oraData && (oraData.riskScore || oraData.infraControl || oraData.infra_control);
        if (!hasOra) {
            missingPrereqs.push('Risk assessment (ORA)');
        }
        
        if (missingPrereqs.length > 0) {
            alert(`Cannot proceed to Execution: missing prerequisites.\n\n${missingPrereqs.map(m => `• ${m}`).join('\n')}\n\nComplete the Architecture & Scope step first.`);
            return;
        }

        const executionPlan = {
            mode: project?.executionMode || executionMode || 'manual',
            planningCompletedAt: new Date().toISOString(),
            warnings: gateWarnings.filter(w => w.level !== 'required').map(w => w.msg),
            sourceData: {
                wbs: project?.wbsMatrix || null,
                topology: project?.mapperNodes || null,
                riskScore: project?.ora?.riskScore || null,
                physics: project?.physics?.result || project?.physics || null,
                finops: { budget: project?.budget || null, financials: project?.financials || null }
            }
        };

        onUpdateProject(project.id, 'executionPlan', executionPlan);
        onUpdateProject(project.id, 'executionMode', executionPlan.mode);
        setShowGateModal(false);
        onPromote && onPromote('execution');
    };

    return (
        <div className="animate-fade-in pb-12 flex flex-col h-full">
            
            <div className="bg-white border-b border-slate-200 px-8 py-5 mb-6 rounded-t-2xl flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors"
                        title={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
                    >
                        <i className={`fas fa-chevron-${sidebarOpen ? 'left' : 'right'} ${sidebarOpen ? 'text-indigo-600' : ''}`}></i>
                    </button>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">Migration Planning & Strategy</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Translate the mapped Blueprint into an executable plan.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 px-4 lg:px-8 relative h-full">
                
                <div className={`shrink-0 space-y-2 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 hidden lg:block'}`}>
                    {menuItems.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setSubTab(item.id)}
                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between group ${
                                subTab === item.id 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${subTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                    {item.num}
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                        </button>
                    ))}
                    
                    <div className="pt-8">
                        <button onClick={handleGateCheck} className="w-full px-4 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                            <i className="fas fa-tasks-check mr-1"></i> Review & Advance to Execution <i className="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[700px] overflow-hidden transition-all duration-300">
                    
                    {subTab === 'feasibility' && (
                        <div className="p-6 h-full flex flex-col animate-fade-in">
                            <TechnicalFeasibility activeProject={project} onUpdateProject={onUpdateProject} />
                        </div>
                    )}
                    {subTab === 'wbs' && <DedicatedMigrationPlan activeProject={project} onUpdateProject={onUpdateProject} />}

                    {subTab === 'tools' && (
                        <div key={`tools-${resourceRefreshKey}`} className="animate-fade-in h-full flex flex-col">
                            <div className="bg-amber-50 border-b border-amber-200 p-6 shrink-0">
                                <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest"><i className="fas fa-tools mr-2"></i> Strategic Tooling Allocation</h4>
                                <p className="text-xs text-amber-700/80 mt-1 font-medium">Select optimal migration engines informed by delivery physics and cost constraints from steps 3.3–3.4.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <ToolRecommendationView activeProject={project} onUpdateProject={onUpdateProject} onRefreshResources={handleRefreshResources} />
                            </div>
                        </div>
                    )}

                    {/* ── 3.6 Assessment Preview: synthesizes 3.1–3.5 → "should we proceed?" ── */}
                    {subTab === 'assessment' && (
                        <div className="p-6 h-full flex flex-col animate-fade-in">
                            <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl mb-4 flex items-start gap-4 text-indigo-800 shadow-inner shrink-0">
                                <i className="fas fa-chart-bar mt-0.5 text-xl"></i>
                                <div className="text-xs leading-relaxed">
                                    <strong className="block mb-1 text-sm uppercase tracking-widest">Assessment Preview</strong>
                                    Synthesizes outputs from Technical Feasibility (3.1), Delivery Physics (3.3), FinOps (3.4), and Strategic Tooling (3.5) into a preliminary readiness assessment.
                                    This is a <b>shallow simulation</b> from raw project data — the deep plan-based validation happens in Phase 4.0 Readiness Gateway after the execution plan is built.
                                </div>
                            </div>

                            {/* Feasibility Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                {[
                                    { label: 'Feasibility', icon: 'fa-clipboard-check', tab: 'feasibility', ok: !!project?.feasibilityResult, msg: project?.feasibilityResult ? 'Assessed' : 'Not assessed' },
                                    { label: 'Physics', icon: 'fa-microscope', tab: 'physics', ok: !!project?.physics, msg: project?.physics ? 'Calculated' : 'Not calculated' },
                                    { label: 'FinOps', icon: 'fa-wallet', tab: 'finops', ok: !!(project?.budget || project?.financials), msg: (project?.budget || project?.financials) ? 'Budgeted' : 'Not budgeted' },
                                    { label: 'Tooling', icon: 'fa-tools', tab: 'tools', ok: !!(project?.data?.toolAssignments || project?.data?.recommendations), msg: (project?.data?.toolAssignments || project?.data?.recommendations) ? 'Assigned' : 'Not assigned' },
                                ].map(card => (
                                    <div key={card.label} onClick={() => setSubTab(card.tab)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                                            card.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className={`fas ${card.icon} ${card.ok ? 'text-emerald-600' : 'text-amber-500'}`}></i>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-700">{card.label}</span>
                                        </div>
                                        <div className={`text-sm font-bold ${card.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            <i className={`fas ${card.ok ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1`}></i>
                                            {card.msg}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Assessment Verdict */}
                            {(() => {
                                const allReady = project?.feasibilityResult && project?.physics && (project?.budget || project?.financials);
                                return (
                                    <div className={`rounded-xl border-2 p-5 ${allReady ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
                                        <h4 className={`font-black text-sm uppercase tracking-widest mb-2 ${allReady ? 'text-emerald-800' : 'text-amber-800'}`}>
                                            <i className={`fas ${allReady ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
                                            {allReady ? 'Assessment: Ready to Proceed' : 'Assessment: Incomplete Inputs'}
                                        </h4>
                                        <p className="text-xs text-slate-600">
                                            {allReady
                                                ? 'All planning inputs are populated. Build the execution plan in 3.7 Wave & Runbook Planning, then validate it in Phase 4.0 Readiness Gateway.'
                                                : 'Complete the flagged inputs above before building the execution plan. The deep plan-based validation in Phase 4.0 will provide precise PASS/WARNINGS/BLOCKED status.'}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {subTab === 'physics' && (
                        <div key={`physics-${resourceRefreshKey}`} className="h-full overflow-y-auto custom-scrollbar">
                            <PhysicsEngine activeProject={project} onUpdateProject={onUpdateProject} onRefreshResources={handleRefreshResources} />
                        </div>
                    )}
                    
                    {subTab === 'finops' && <FinOpsCalculator key={`finops-${resourceRefreshKey}`} project={project} onUpdateProject={onUpdateProject} onRefreshResources={handleRefreshResources} />}
                    
                    {subTab === 'runbook' && (
                        <div className="p-6 h-full flex flex-col animate-fade-in">
                            <div className="bg-purple-50 border border-purple-200 p-5 rounded-xl mb-4 flex items-start gap-4 text-purple-800 shadow-inner shrink-0">
                                <i className="fas fa-info-circle mt-0.5 text-xl"></i>
                                <div className="text-xs leading-relaxed">
                                    <strong className="block mb-1 text-sm uppercase tracking-widest">Iterative Wave Planning</strong>
                                    Migrations are executed in waves, not linearly. Use this interface to group the mapped Blueprint servers into scheduled Cutover Waves based on the customer's accepted downtime SLA. When waves are defined, <b>build the Execution Plan</b> — the step template Phase 4 will execute — then <b>run the Dry-Run Simulation</b> to validate it before promoting to Execution.
                                </div>
                            </div>

                            {/* 🚨 NEW: Build Execution Plan + Dry-Run (3.5 → 4 handoff) */}
                            <div className={`rounded-xl border-2 mb-4 p-4 shrink-0 transition-colors ${
                                buildPlanResult?.ok ? 'border-emerald-200 bg-emerald-50/50' :
                                buildPlanResult?.rawError ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'
                            }`}>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                            <i className="fas fa-sitemap text-indigo-500 mr-1.5"></i> Execution Plan — Phase 4 contract
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            {buildPlanResult?.ok
                                                ? <span className="text-emerald-700">✓ Built <b>{buildPlanResult.steps}</b> steps at {buildPlanResult.builtAt}. {buildPlanResult.dryRunDone && <span className="text-indigo-600">✓ Dry-run simulation ran.</span>}</span>
                                                : buildPlanResult?.rawError
                                                    ? <span className="text-rose-700">✗ {buildPlanResult.rawError}</span>
                                                    : 'Generates the step template (with placeholders) that Phase 4 resolves and executes.'}
                                        </div>
                                        {buildPlanResult?.ok && buildPlanResult.steps > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {Object.entries(buildPlanResult.actions).slice(0, 10).map(([a, n]) => (
                                                    <span key={a} className="px-1.5 py-px rounded bg-white border border-slate-200 text-[8px] font-bold text-slate-500">{a}×{n}</span>
                                                ))}
                                                {Object.keys(buildPlanResult.actions).length > 10 && (
                                                    <span className="px-1.5 py-px rounded bg-white border border-slate-200 text-[8px] text-slate-400">+{Object.keys(buildPlanResult.actions).length - 10} more</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={handleBuildPlan}
                                            disabled={buildPlanLoading}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                                buildPlanLoading ? 'bg-slate-200 text-slate-400 cursor-wait' :
                                                'bg-indigo-600 hover:bg-indigo-700 text-white shadow'
                                            }`}
                                        >
                                            <i className={`fas ${buildPlanLoading ? 'fa-spinner fa-spin' : 'fa-sitemap'}`}></i> {buildPlanLoading ? 'Building...' : 'Build Execution Plan'}
                                        </button>
                                        {/* Dry-Run moved to Phase 4.0 Readiness Gateway → Plan Validation */}
                                    </div>
                                </div>
                            </div>

                            {/* 🚨 NEW: Collapsible step preview table — shows actual plan steps for review */}
                            {buildPlanResult?.ok && buildPlanResult.planSteps?.length > 0 && (
                                <div className="border border-slate-200 rounded-xl mb-4 shrink-0 overflow-hidden">
                                    <div
                                        onClick={() => setStepsExpanded(prev => !prev)}
                                        className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                            <i className="fas fa-list-ul text-indigo-500"></i>
                                            Step Preview ({buildPlanResult.planSteps.length} steps)
                                        </div>
                                        <i className={`fas fa-chevron-${stepsExpanded ? 'up' : 'down'} text-slate-400 text-xs transition-transform`}></i>
                                    </div>
                                    {stepsExpanded && (
                                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-[10px] border-collapse">
                                                <thead className="bg-slate-100 sticky top-0">
                                                    <tr className="text-left text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                        <th className="px-4 py-2 border-b border-slate-200 w-14">Step</th>
                                                        <th className="px-4 py-2 border-b border-slate-200">Phase</th>
                                                        <th className="px-4 py-2 border-b border-slate-200">Action</th>
                                                        <th className="px-4 py-2 border-b border-slate-200">Target Resource</th>
                                                        <th className="px-4 py-2 border-b border-slate-200">Commands Preview</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(buildPlanResult.planSteps || []).slice(0, 20).map((step, idx) => {
                                                        const cmdCount = (step.commands || []).length;
                                                        const cmdPreview = cmdCount > 0 ? step.commands.slice(0, 2).map(c => (typeof c === 'string' ? c : (c?.cmd || c?.desc || ''))).filter(Boolean).join('; ') : '';
                                                        const hasMore = cmdCount > 2;
                                                        const rowKey = step.step_id || idx;
                                                        const isExpanded = expandedStepRows[rowKey] || false;
                                                        return (
                                                            <React.Fragment key={rowKey}>
                                                                <tr
                                                                    onClick={() => setExpandedStepRows(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                                                                    className={`border-b border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-colors ${
                                                                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                                                    }`}
                                                                >
                                                                    <td className="px-4 py-2 font-mono text-slate-400">{step.step_id || idx + 1}</td>
                                                                    <td className="px-4 py-2"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">{step.phase || '-'}</span></td>
                                                                    <td className="px-4 py-2 font-medium text-slate-700">{step.action || '-'}</td>
                                                                    <td className="px-4 py-2 text-slate-500">{step.target_resource || '-'}</td>
                                                                    <td className="px-4 py-2 text-slate-400 max-w-[240px] truncate" title={cmdPreview}>
                                                                        {cmdPreview ? <><i className="fas fa-terminal text-indigo-400 mr-1"></i>{cmdPreview}</> : <span className="text-slate-300 italic">—</span>}
                                                                        {hasMore && <span className="ml-1 text-indigo-400 font-bold">+{cmdCount - 2}</span>}
                                                                    </td>
                                                                </tr>
                                                                {isExpanded && (
                                                                    <tr className="bg-slate-50/80">
                                                                        <td colSpan={5} className="px-8 py-3">
                                                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">All Commands</div>
                                                                            {(step.commands || []).length > 0 ? (
                                                                                <div className="space-y-1">
                                                                                    {(step.commands || []).map((c, ci) => {
                                                                                        const cmdStr = typeof c === 'string' ? c : (c?.cmd || c?.desc || JSON.stringify(c));
                                                                                        const descStr = typeof c === 'object' && c?.desc && c?.desc !== cmdStr ? c.desc : '';
                                                                                        return (
                                                                                            <div key={ci} className="flex items-start gap-2">
                                                                                                <span className="text-indigo-400 font-mono text-[9px] mt-0.5">$</span>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <code className="text-[10px] text-slate-700 font-mono break-all">{cmdStr}</code>
                                                                                                    {descStr && <div className="text-[9px] text-slate-400">{descStr}</div>}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-slate-400 italic text-[10px]">No commands defined for this step.</span>
                                                                            )}
                                                                            {step.tool_name && (
                                                                                <div className="mt-2 text-[9px] text-slate-400">
                                                                                    <span className="font-bold">Tool:</span> {step.tool_name}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {(buildPlanResult.planSteps || []).length > 20 && (
                                                        <tr className="bg-slate-100">
                                                            <td colSpan={5} className="px-4 py-2 text-center text-[10px] text-slate-500 font-bold">
                                                                +{buildPlanResult.planSteps.length - 20} more steps (preview limited to first 20)
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 🚨 NEW: AgenticOrchestrationPanel embed in 3.5 — shows when plan is built */}
                            {buildPlanResult?.ok && (
                                <div className="mb-4 shrink-0">
                                    <AgenticOrchestrationPanel project={project} onUpdateProject={onUpdateProject} modelName={agentModelName} />
                                </div>
                            )}

                            {/* ── Sub-tabs: Execution Plan vs Cutover Runbook ── */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                                <CutoverRunbookView activeProject={project} onUpdateProject={onUpdateProject} defaultCollapsed={true} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 🚨 GATE MODAL: Phase 3 → Phase 4 Validation */}
            {showGateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in border border-slate-200">
                        <div className={`p-6 border-b ${gatePassed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                            <div className="flex justify-between items-center">
                                <h3 className={`font-black text-lg ${gatePassed ? 'text-emerald-800' : 'text-rose-800'}`}>
                                    <i className={`fas ${gatePassed ? 'fa-check-circle text-emerald-600' : 'fa-exclamation-triangle text-rose-600'} mr-2`}></i>
                                    {gatePassed ? 'Execution Readiness Review' : 'Prerequisites Not Met'}
                                </h3>
                                <button onClick={() => setShowGateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <p className={`text-xs mt-1 font-medium ${gatePassed ? 'text-emerald-700/80' : 'text-rose-700/80'}`}>
                                {gatePassed 
                                    ? 'All required prerequisites satisfied. Review recommendations below and proceed.' 
                                    : 'The following items must be completed before advancing to Execution.'}
                            </p>
                        </div>

                        <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {gateWarnings.length === 0 ? (
                                <div className="text-center py-6 text-emerald-600">
                                    <i className="fas fa-check-circle text-4xl mb-3"></i>
                                    <p className="font-black text-sm">All checks passed!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {gateWarnings.map((w, i) => (
                                        <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 ${
                                            w.level === 'required' 
                                                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                                                : w.level === 'recommended'
                                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}>
                                            <div className="mt-0.5 shrink-0">
                                                <i className={`fas ${
                                                    w.level === 'required' 
                                                        ? 'fa-times-circle text-rose-500' 
                                                        : w.level === 'recommended'
                                                            ? 'fa-exclamation-circle text-amber-500'
                                                            : 'fa-info-circle text-slate-400'
                                                } text-lg`}></i>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                                        w.level === 'required'
                                                            ? 'bg-rose-200 text-rose-700'
                                                            : w.level === 'recommended'
                                                                ? 'bg-amber-200 text-amber-700'
                                                                : 'bg-slate-200 text-slate-500'
                                                    }`}>{w.level}</span>
                                                    <button 
                                                        onClick={() => { setSubTab(w.tab); setShowGateModal(false); }}
                                                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 underline uppercase tracking-wider"
                                                    >
                                                        <i className="fas fa-arrow-right mr-1"></i> Go to 3.{menuItems.find(m => m.id === w.tab)?.num?.split('.')[1] || w.tab}
                                                    </button>
                                                </div>
                                                <p className="text-xs font-medium leading-relaxed">{w.msg}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex gap-3">
                            <button 
                                onClick={() => setShowGateModal(false)} 
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors"
                            >
                                <i className="fas fa-arrow-left mr-1"></i> Back to Planning
                            </button>
                            {gatePassed ? (
                                <button 
                                    onClick={handleProceedToExecution} 
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-colors"
                                >
                                    Proceed to Execution <i className="fas fa-rocket ml-1"></i>
                                </button>
                            ) : (
                                <button 
                                    disabled
                                    className="flex-1 px-4 py-2.5 bg-slate-300 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-xl cursor-not-allowed"
                                >
                                    <i className="fas fa-lock mr-1"></i> Execution Locked
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
