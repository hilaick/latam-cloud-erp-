import React, { useState } from 'react';
import ToolRecommendationView from './ToolRecommendationView';
import PhysicsEngine from './PhysicsEngine';
import FinOpsCalculator from './FinOpsCalculator';
import DedicatedMigrationPlan from './DedicatedMigrationPlan';
import CutoverRunbookView from './CutoverRunbookView';
import AgenticOrchestrationPanel from './AgenticOrchestrationPanel';

export default function StepPlanning({ project, onUpdateProject, onPromote }) {
    // 🚨 REORDERED: Default tab is now 'wbs' (3.1)
    const [subTab, setSubTab] = useState('wbs');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [executionMode, setExecutionMode] = useState(project?.executionMode || 'manual');
    const [showGateModal, setShowGateModal] = useState(false);
    const [gateWarnings, setGateWarnings] = useState([]);
    const [gatePassed, setGatePassed] = useState(false);
    const [resourceRefreshKey, setResourceRefreshKey] = useState(0);

    // 🚨 SPLIT: 3.4a = Tool Recommendations, 3.4b = Execution Mode (after tools, before runbook)
    const handleRefreshResources = () => {
        setResourceRefreshKey(prev => prev + 1);
    };

    const menuItems = [
        { id: 'wbs', num: '3.1', icon: 'fa-tasks', label: 'WBS & RACI Matrix' },
        { id: 'physics', num: '3.2', icon: 'fa-microscope', label: 'Delivery Physics Engine' },
        { id: 'finops', num: '3.3', icon: 'fa-wallet', label: 'FinOps Budget & Burn' },
        { id: 'tools', num: '3.4a', icon: 'fa-tools', label: 'Strategic Tooling' },
        { id: 'execution', num: '3.4b', icon: 'fa-robot', label: 'Execution Mode' },
        { id: 'runbook', num: '3.5', icon: 'fa-calendar-alt', label: 'Wave & Runbook Planning' }
    ];

    // 🚨 NEW: Phase 3 → Phase 4 Gate — validate prerequisites & build ExecutionPlan
    const handleGateCheck = () => {
        const warnings = [];
        let data = {};
        try { data = JSON.parse(project?.data || '{}'); } catch(e) {}

        // REQUIRED: execution mode (now in 3.4b Execution Mode)
        const mode = project?.executionMode || executionMode;
        if (!mode) {
            warnings.push({ level: 'required', tab: 'execution', msg: 'Execution Mode not selected. Choose Manual, Agentic, or Individual in 3.4b Execution Mode.' });
        }

        // RECOMMENDED: WBS & RACI populated
        if (!project?.wbsMatrix && !data?.wbs) {
            warnings.push({ level: 'recommended', tab: 'wbs', msg: 'WBS & RACI Matrix not populated. Visit 3.1 to define detailed work breakdown.' });
        }

        // RECOMMENDED: physics calculated (now 3.2)
        if (!project?.physics) {
            warnings.push({ level: 'recommended', tab: 'physics', msg: 'Delivery physics not calculated. Visit 3.2 for time/bandwidth estimates.' });
        }

        // RECOMMENDED: finops budget (now 3.3) — FIXED: checks actual save keys
        if (!project?.budget && !project?.financials) {
            warnings.push({ level: 'recommended', tab: 'finops', msg: 'FinOps budget & burn not configured. Visit 3.3 for cost envelopes.' });
        }

        // RECOMMENDED: tool assignments (now 3.4a)
        if (!data?.toolAssignments && !data?.recommendations) {
            warnings.push({ level: 'recommended', tab: 'tools', msg: 'Tool assignments not generated. Visit 3.4a to run tool recommendations based on physics & cost analysis.' });
        }

        // RECOMMENDED: wave plan
        if (!data?.waves && !data?.runbook) {
            warnings.push({ level: 'recommended', tab: 'runbook', msg: 'Wave cutover plan not created. Visit 3.5 to group servers into waves.' });
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
        if (!project?.mapperNodes || project.mapperNodes.length === 0) {
            missingPrereqs.push('Topology nodes (Architecture & Scope step)');
        }
        if (!project?.ora?.riskScore) {
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
                    
                    {subTab === 'wbs' && <DedicatedMigrationPlan activeProject={project} onUpdateProject={onUpdateProject} />}

                    {subTab === 'tools' && (
                        <div key={`tools-${resourceRefreshKey}`} className="animate-fade-in h-full flex flex-col">
                            <div className="bg-amber-50 border-b border-amber-200 p-6 shrink-0">
                                <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest"><i className="fas fa-tools mr-2"></i> Strategic Tooling Allocation</h4>
                                <p className="text-xs text-amber-700/80 mt-1 font-medium">Select optimal migration engines informed by delivery physics and cost constraints from steps 3.2–3.3.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <ToolRecommendationView activeProject={project} onUpdateProject={onUpdateProject} onRefreshResources={handleRefreshResources} />
                            </div>
                        </div>
                    )}

                    {subTab === 'execution' && (
                        <div key={`execution-${resourceRefreshKey}`} className="animate-fade-in h-full flex flex-col">
                            <div className="bg-purple-50 border-b border-purple-200 p-6 shrink-0">
                                <h4 className="font-black text-purple-800 text-sm uppercase tracking-widest">
                                    <i className="fas fa-robot mr-2"></i> Setup Phase 4 Execution Mode
                                </h4>
                                <p className="text-xs text-purple-700/80 mt-1 font-medium">
                                    Select how workloads will be processed by the delivery team or orchestration engine.
                                    <span className="block mt-1 text-purple-500">Run recommendations (3.4a) and wave planning (3.5) first for best results.</span>
                                </p>
                                {/* Resource Count + Refresh */}
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="bg-white border border-purple-200 px-4 py-2 rounded-lg">
                                        <div className="text-[10px] text-purple-600 uppercase tracking-widest font-bold">Resources in Target Architecture</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-purple-800">
                                                {(() => {
                                                    const savedNodes = project?.targetTopology?.mapperNodes;
                                                    const allNodes = project?.mapperNodes || [];
                                                    if (savedNodes && savedNodes.length > 0) {
                                                        return `${savedNodes.length} / ${allNodes.length}`;
                                                    }
                                                    const filter = project?.topologyFilter || 'All';
                                                    if (filter && filter !== 'All') {
                                                        const inScope = allNodes.filter(n => {
                                                            if (filter === 'In SOW') return n.status === 'Matched' || n.status === 'Quoted Only';
                                                            if (filter === 'In Discovery') return n.status === 'Matched' || n.status === 'Live Only';
                                                            return n.status === filter;
                                                        });
                                                        return `${inScope.length} / ${allNodes.length}`;
                                                    }
                                                    return allNodes.length;
                                                })()}
                                            </span>
                                            <button 
                                                onClick={handleRefreshResources}
                                                className="text-[10px] bg-purple-100 text-purple-600 hover:bg-purple-200 px-2 py-1 rounded font-black uppercase tracking-widest transition-colors"
                                                title="Refresh from saved Target Architecture"
                                            >
                                                <i className="fas fa-sync-alt mr-1"></i> Refresh
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-purple-500">
                                        {project?.targetTopology?.mapperNodes?.length > 0 ? "Using Saved Architecture" : 
                                         project?.mapperNodes?.length > 0 ? "Using Unfiltered Discovery Data (Save & Proceed from Step 2.4 first)" : 
                                         project?.blueprintData ? "Using SOW/Quote Data" : 
                                         project?.blueprint ? "Using Blueprint Data" : 
                                         "No Architecture Data"}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {/* Execution Mode Selector */}
                                <div className="mb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Manual Pipeline */}
                                        <button
                                            onClick={() => {
                                                setExecutionMode('manual');
                                                onUpdateProject(project.id, 'executionMode', 'manual');
                                            }}
                                            className={`p-5 rounded-xl border-2 text-left transition-all ${
                                                executionMode === 'manual'
                                                    ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-200/50'
                                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                                                executionMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                <i className="fas fa-tasks text-lg"></i>
                                            </div>
                                            <h6 className="font-black text-sm text-slate-800 mb-1">Manual Pipeline</h6>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Standard step-by-step Kanban execution. Teams manually update cards and trigger APIs per server.
                                            </p>
                                            {executionMode === 'manual' && (
                                                <span className="inline-block mt-3 bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                                    <i className="fas fa-check mr-1"></i> Selected
                                                </span>
                                            )}
                                        </button>

                                        {/* Agentic Orchestration */}
                                        <button
                                            onClick={() => {
                                                setExecutionMode('agentic');
                                                onUpdateProject(project.id, 'executionMode', 'agentic');
                                            }}
                                            className={`p-5 rounded-xl border-2 text-left transition-all ${
                                                executionMode === 'agentic'
                                                    ? 'border-purple-600 bg-purple-50 shadow-md shadow-purple-200/50'
                                                    : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                                                executionMode === 'agentic' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                <i className="fas fa-robot text-lg"></i>
                                            </div>
                                            <h6 className="font-black text-sm text-slate-800 mb-1">Agentic Orchestration</h6>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Hermes autonomous engine takes control of the entire wave, deploying agents and syncing tasks automatically.
                                            </p>
                                            {executionMode === 'agentic' && (
                                                <span className="inline-block mt-3 bg-purple-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                                    <i className="fas fa-check mr-1"></i> Selected
                                                </span>
                                            )}
                                        </button>

                                        {/* Individual Tasks */}
                                        <button
                                            onClick={() => {
                                                setExecutionMode('individual');
                                                onUpdateProject(project.id, 'executionMode', 'individual');
                                            }}
                                            className={`p-5 rounded-xl border-2 text-left transition-all ${
                                                executionMode === 'individual'
                                                    ? 'border-emerald-600 bg-emerald-50 shadow-md shadow-emerald-200/50'
                                                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                                                executionMode === 'individual' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                <i className="fas fa-cube text-lg"></i>
                                            </div>
                                            <h6 className="font-black text-sm text-slate-800 mb-1">Individual Tasks</h6>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Isolate workloads into standalone ad-hoc tasks. Ideal for tiny batches or specific database true-ups.
                                            </p>
                                            {executionMode === 'individual' && (
                                                <span className="inline-block mt-3 bg-emerald-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                                    <i className="fas fa-check mr-1"></i> Selected
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Agentic Orchestration Panel — shown when agentic selected */}
                                {executionMode === 'agentic' && (
                                    <AgenticOrchestrationPanel project={project} onUpdateProject={onUpdateProject} />
                                )}
                            </div>
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
                            <div className="bg-purple-50 border border-purple-200 p-5 rounded-xl mb-6 flex items-start gap-4 text-purple-800 shadow-inner shrink-0">
                                <i className="fas fa-info-circle mt-0.5 text-xl"></i>
                                <div className="text-xs leading-relaxed">
                                    <strong className="block mb-1 text-sm uppercase tracking-widest">Iterative Wave Planning</strong>
                                    Migrations are executed in waves, not linearly. Use this interface to group the mapped Blueprint servers into scheduled Cutover Waves based on the customer's accepted downtime SLA.
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <CutoverRunbookView activeProject={project} onUpdateProject={onUpdateProject} />
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
