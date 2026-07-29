import React, { useState } from 'react';
import ToolRecommendationView from './ToolRecommendationView';
import PhysicsEngine from './PhysicsEngine';
import FinOpsCalculator from './FinOpsCalculator';
import DedicatedMigrationPlan from './DedicatedMigrationPlan';
import CutoverRunbookView from './CutoverRunbookView';

export default function StepPlanning({ project, onUpdateProject, onPromote }) {
    // 🚨 REORDERED: Default tab is now 'wbs' (3.1)
    const [subTab, setSubTab] = useState('wbs');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [executionMode, setExecutionMode] = useState(project?.executionMode || 'manual');

    // 🚨 REORDERED: Menu Items logical flow
    const menuItems = [
        { id: 'wbs', num: '3.1', icon: 'fa-tasks', label: 'WBS & RACI Matrix' },
        { id: 'tools', num: '3.2', icon: 'fa-tools', label: 'Strategic Tooling' },
        { id: 'physics', num: '3.3', icon: 'fa-microscope', label: 'Delivery Physics Engine' },
        { id: 'finops', num: '3.4', icon: 'fa-wallet', label: 'FinOps Budget & Burn' },
        { id: 'runbook', num: '3.5', icon: 'fa-calendar-alt', label: 'Wave & Runbook Planning' }
    ];

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
                        <button onClick={() => onPromote && onPromote('execution')} className="w-full px-4 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                            Go to Execution Phase <i className="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[700px] overflow-hidden transition-all duration-300">
                    
                    {subTab === 'wbs' && <DedicatedMigrationPlan activeProject={project} onUpdateProject={onUpdateProject} />}

                    {subTab === 'tools' && (
                        <div className="animate-fade-in h-full flex flex-col">
                            <div className="bg-amber-50 border-b border-amber-200 p-6 shrink-0">
                                <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest"><i className="fas fa-tools mr-2"></i> Strategic Tooling Allocation</h4>
                                <p className="text-xs text-amber-700/80 mt-1 font-medium">Determine exactly WHICH tools will migrate WHICH workloads before calculating transfer physics.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {/* 🚨 NEW: 3.2 Execution Mode Selector */}
                                <div className="p-6 border-b border-slate-100">
                                    <h5 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">
                                        <i className="fas fa-sliders-h mr-2 text-indigo-600"></i> Setup Phase 4 Execution Mode
                                    </h5>
                                    <p className="text-xs text-slate-500 mb-5">
                                        Select how workloads will be processed by the delivery team or orchestration engine.
                                    </p>
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
                                <ToolRecommendationView activeProject={project} onUpdateProject={onUpdateProject} />
                            </div>
                        </div>
                    )}

                    {subTab === 'physics' && (
                        <div className="h-full overflow-y-auto custom-scrollbar">
                            <PhysicsEngine activeProject={project} onUpdateProject={onUpdateProject} />
                        </div>
                    )}
                    
                    {subTab === 'finops' && <FinOpsCalculator project={project} onUpdateProject={onUpdateProject} />}
                    
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
        </div>
    );
}
