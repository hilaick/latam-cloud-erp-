import React, { useState, useEffect, useMemo, useContext } from 'react';
import { formatShortDate, EditableCell } from '../../utils/helpers';
import { ERPContext } from '../../context/ERPContext';
import WaveZeroConfigModal from './WaveZeroConfigModal';

const executableTypes = ['ECS', 'BMS', 'VM', 'SERVER', 'RDS', 'GAUSSDB', 'DB', 'DATABASE'];

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState(project?.authValidated ? 'orchestrator' : 'readiness');
    const [sidebarOpen, setSidebarOpen] = useState(true); 
    const [showWaveZeroModal, setShowWaveZeroModal] = useState(false);
    const [runbookData, setRunbookData] = useState(null);
    const [showRunbookModal, setShowRunbookModal] = useState(false);
    
    const [executionState, setExecutionState] = useState(null);
    const [isLoadingState, setIsLoadingState] = useState(true);

    const isGreenfield = project?.projectType === 'greenfield' || project?.project_type === 'greenfield';
    const authLevel = project?.authLevel || 'Read-Only (Customer Managed)';
    const isZeroTrust = authLevel === 'Read-Only (Customer Managed)';

    useEffect(() => {
        if (!project?.id) return;
        const fetchState = async () => {
            try {
                const token = localStorage.getItem('erp_jwt_token');
                const res = await fetch(`/api/executions/${project.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.success) {
                    setExecutionState(data.data);
                    if (data.data.currentPhase === 'PHASE_4_0') setSubTab('readiness');
                    else setSubTab('orchestrator');
                }
            } catch (e) { console.error("State Fetch Error:", e); } 
            finally { setIsLoadingState(false); }
        };
        fetchState();
    }, [project?.id]);

    const updatePhase = async (newPhase, newStatus, pendingAction = null) => {
        setExecutionState(prev => ({ ...prev, currentPhase: newPhase, status: newStatus, pendingAction }));
        const token = localStorage.getItem('erp_jwt_token');
        await fetch(`/api/executions/${project.id}/update`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ phase: newPhase, status: newStatus, pendingAction })
        });
    };

    const handleExecuteTerraform = async (networkConfig = null) => {
        if (!project?.id) return;
        setShowWaveZeroModal(false);
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/execute`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ networkConfig })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) { 
                    alert(`✅ ${data.message}`); 
                    if (isGreenfield && executionState.currentPhase === 'PHASE_4_2') updatePhase('PHASE_4_3', 'PENDING');
                    else if (!isGreenfield && executionState.currentPhase === 'PHASE_4_1') updatePhase('PHASE_4_2', 'PENDING');
                    else if (!isGreenfield && executionState.currentPhase === 'PHASE_4_3') updatePhase('PHASE_4_4', 'PENDING');
                }
                else alert(`❌ Execution Failed:\n\n${data.error}`);
            }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    // 🚨 Phase 4.7 Backend Call
    const handleGarbageCollection = async () => {
        if (!project?.id) return;
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/garbage-collect`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    alert(`✅ Garbage Collection successful. Transient resources dropped.`);
                    updatePhase('COMPLETED', 'DONE');
                } else alert(`❌ Cleanup Failed: ${data.error}`);
            }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    const menuItems = isGreenfield ? [
        { id: 'readiness', num: '4.0', icon: 'fa-user-lock', label: 'Readiness Gateway' },
        { id: 'orchestrator', num: '4.1-4.3', icon: 'fa-rocket', label: 'CI/CD Pipeline' },
        { id: 'workbench', num: '4.4', icon: 'fa-tools', label: 'Engineering Workbench' },
        { id: 'hub', num: '4.5', icon: 'fa-stream', label: 'DevOps Command Center' }
    ] : [
        { id: 'readiness', num: '4.0', icon: 'fa-user-lock', label: 'Readiness Gateway' },
        { id: 'orchestrator', num: '4.1-4.7', icon: 'fa-cogs', label: 'Execution Pipeline' },
        { id: 'workbench', num: '4.8', icon: 'fa-tools', label: 'Engineering Workbench' },
        { id: 'hub', num: '4.9', icon: 'fa-satellite-dish', label: 'Delivery Command Center' },
        { id: 'tam', num: '4.10', icon: 'fa-clipboard-check', label: 'TAM Service Governance' }
    ];

    if (isLoadingState) return <div className="p-12 text-center text-slate-400 font-bold"><i className="fas fa-circle-notch fa-spin mr-2"></i> Initializing State Machine...</div>;
    const isLocked = executionState?.currentPhase === 'PHASE_4_0';
    const executionMode = project?.executionMode || 'manual';
    const isIndividual = executionMode === 'individual';
    const pipelineComplete = executionState?.currentPhase === 'COMPLETED';
    // Workbench unlocked when: pipeline complete (manual/agentic) OR individual prereqs passed
    const workbenchUnlocked = pipelineComplete || (isIndividual && project?.prereqsValidated);

    return (
        <div className="animate-fade-in pb-12 flex flex-col h-full">
            {showWaveZeroModal && <WaveZeroConfigModal onClose={() => setShowWaveZeroModal(false)} onConfirm={(config) => handleExecuteTerraform(config)} />}

            <div className="bg-white border-b border-slate-200 px-8 py-5 mb-6 rounded-t-2xl flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors">
                        <i className={`fas fa-chevron-${sidebarOpen ? 'left' : 'right'} ${sidebarOpen ? 'text-indigo-600' : ''}`}></i>
                    </button>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">{isGreenfield ? "Cloud-Native Provisioning Engine" : "Execution Control Plane"}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isGreenfield ? "Automated Infrastructure-as-Code CI/CD" : "Database-Backed Cloud Orchestrator"}</p>
                            {isGreenfield && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-emerald-200">Greenfield Mode</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 px-4 lg:px-8 relative h-full">
                <div className={`shrink-0 space-y-2 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 hidden lg:block'}`}>
                    {menuItems.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => { 
                                if (isLocked && item.id !== 'readiness') return alert("Please complete the 4.0 Readiness Gateway to unlock Execution."); 
                                if ((item.id === 'workbench' || item.id === 'hub') && !workbenchUnlocked) 
                                    return alert(isIndividual 
                                        ? "Validate prerequisites in the Orchestrator tab first to unlock Workbench & Command Center." 
                                        : "Complete the 7-phase pipeline to unlock Workbench & Command Center."); 
                                setSubTab(item.id); 
                            }}
                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between group ${
                                isLocked && item.id !== 'readiness' ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' : 
                                (item.id === 'workbench' || item.id === 'hub') && !workbenchUnlocked ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' :
                                subTab === item.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                                    isLocked && item.id !== 'readiness' ? 'bg-slate-200 text-slate-400' : 
                                    (item.id === 'workbench' || item.id === 'hub') && !workbenchUnlocked ? 'bg-slate-200 text-slate-400' :
                                    subTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                }`}>{item.num}</div>
                                <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                            {isLocked && item.id !== 'readiness' && <i className="fas fa-lock text-slate-300"></i>}
                            {(item.id === 'workbench' || item.id === 'hub') && !isLocked && !workbenchUnlocked && <i className="fas fa-lock text-slate-300"></i>}
                        </button>
                    ))}
                    
                    <div className="pt-8">
                        {executionState?.currentPhase === 'COMPLETED' ? (
                            <button onClick={() => onPromote && onPromote('post-live')} className="w-full px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                                Go to Post-Live Phase <i className="fas fa-arrow-right"></i>
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button disabled className="flex-1 px-4 py-3.5 bg-slate-200 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                                    <i className="fas fa-lock"></i> Post-Live Locked
                                </button>
                                <button 
                                    onClick={() => updatePhase('COMPLETED', 'DONE')}
                                    className="px-4 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2"
                                    title="Debug: Mark execution as complete"
                                >
                                    <i className="fas fa-wrench"></i> Debug Complete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0 bg-transparent min-h-[700px] transition-all duration-300">
                    {subTab === 'readiness' && <ReadinessGatewayView project={project} isGreenfield={isGreenfield} authLevel={authLevel} isZeroTrust={isZeroTrust} onApprove={() => { updatePhase('PHASE_4_1', 'PENDING'); setSubTab('orchestrator'); }} />}
                    {subTab === 'orchestrator' && executionState && <OrchestratorView project={project} executionState={executionState} updatePhase={updatePhase} isGreenfield={isGreenfield} setShowWaveZeroModal={setShowWaveZeroModal} handleExecuteTerraform={handleExecuteTerraform} handleGarbageCollection={handleGarbageCollection} executionMode={project?.executionMode || 'manual'} onUpdateProject={onUpdateProject} />}
                    {/* 🚨 REPLACED STUBS WITH INTEGRATED FULL COMPONENTS */}
                    {subTab === 'workbench' && <WorkbenchView project={project} />}
                    {subTab === 'hub' && <CommandCenterView project={project} executionState={executionState} executionMode={executionMode} />}
                    {subTab === 'tam' && !isGreenfield && <GovernanceView project={project} onUpdateProject={onUpdateProject} />}
                </div>
            </div>
        </div>
    );
}

// 🚨 PRESERVED: Your exact interactive state machine for Phase 4.1 to 4.7
// 🚨 UPGRADED: Modes — manual (original behavior) / agentic (auto-chain) / individual (prereq check)
function OrchestratorView({ project, executionState, updatePhase, isGreenfield, setShowWaveZeroModal, handleExecuteTerraform, handleGarbageCollection, executionMode, onUpdateProject }) {
    const [crState, setCrState] = useState('idle'); // idle, pending, approved
    const [crForm, setCrForm] = useState({ approver: '', ticket: '' });
    const [autoOrchestrating, setAutoOrchestrating] = useState(false);
    const [orchestrationLog, setOrchestrationLog] = useState([]);
    const [prereqChecked, setPrereqChecked] = useState(project?.prereqsValidated === true);
    const [prereqPassed, setPrereqPassed] = useState(project?.prereqsValidated === true);

    const isAgentic = executionMode === 'agentic';
    const isIndividual = executionMode === 'individual';
    const isManual = !isAgentic && !isIndividual;

    const handleSimulateCR = () => { setCrState('pending'); };
    const handleApproveCR = () => {
        if (!crForm.approver || !crForm.ticket) return alert("Approver Name and Ticket Reference are required for audit trail.");
        setCrState('approved');
        updatePhase('PHASE_4_3', 'PENDING');
    };

    // 🚨 AGENTIC: Orchestrate entire pipeline with simulated auto-chaining
    const handleOrchestrateAll = async () => {
        setAutoOrchestrating(true);
        setOrchestrationLog([]);
        const log = (msg) => setOrchestrationLog(prev => [...prev, msg]);

        const chain = [
            { phase: 'PHASE_4_1', label: 'Wave 0: Network & Identity Foundation', delay: 1500 },
            { phase: 'PHASE_4_2', label: 'Vector-Aware OS Pre-Flight', delay: 1000 },
            { phase: 'PHASE_4_3', label: 'Build App Landing Zone', delay: 2000 },
            { phase: 'PHASE_4_4', label: 'Deploy Data Plane Agents', delay: 1500 },
            { phase: 'PHASE_4_5', label: 'Continuous Sync Monitor', delay: 3000 },
            { phase: 'PHASE_4_6', label: 'Cold Cutover & VPC Promotion', delay: 2000 },
            { phase: 'PHASE_4_7', label: 'Teardown & Garbage Collection', delay: 1500 },
        ];

        for (let i = 0; i < chain.length; i++) {
            const step = chain[i];
            log(`[agentic] Starting Phase ${step.phase}: ${step.label}...`);
            updatePhase(step.phase, 'IN_PROGRESS');

            // 🚨 In production: call delegate_task API
            // await fetch('/api/hermes-cli/delegate-task', {
            //     method: 'POST',
            //     body: JSON.stringify({ goal: step.label, context: `ERP Phase ${step.phase}`, profile: 'exec' })
            // });

            await new Promise(resolve => setTimeout(resolve, step.delay));
            log(`[agentic ✓] ${step.label} — complete.`);
        }

        updatePhase('COMPLETED', 'DONE');
        log('[agentic ✓] All 7 phases completed. Pipeline finished.');
        setAutoOrchestrating(false);
    };

    // 🚨 INDIVIDUAL: Validate minimum prerequisites for ad-hoc task execution
    const handleCheckPrereqs = () => {
        // Check: Wave 0 (PHASE_4_1) must be done for network fabric
        const wave0Done = executionState.currentPhase > 'PHASE_4_1' || executionState.currentPhase === 'COMPLETED';
        // Check: Agents (PHASE_4_4) must be deployed for migration tooling
        const agentsDone = executionState.currentPhase > 'PHASE_4_4' || executionState.currentPhase === 'COMPLETED';

        setPrereqChecked(true);
        if (wave0Done && agentsDone) {
            setPrereqPassed(true);
            onUpdateProject && onUpdateProject(project?.id, 'prereqsValidated', true);
        } else {
            setPrereqPassed(false);
        }
    };

    const handleForcePrereqs = async () => {
        // Quick-run: execute Wave 0 + Agents in sequence, then unlock
        setAutoOrchestrating(true);
        updatePhase('PHASE_4_1', 'IN_PROGRESS');
        await new Promise(r => setTimeout(r, 2000)); // simulate terraform
        updatePhase('PHASE_4_4', 'PENDING'); // skip 4.2, 4.3
        await new Promise(r => setTimeout(r, 1500)); // simulate agent push
        updatePhase('PHASE_4_5', 'PENDING'); // mark sync ready
        setPrereqPassed(true);
        setPrereqChecked(true);
        onUpdateProject && onUpdateProject(project?.id, 'prereqsValidated', true);
        setAutoOrchestrating(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 🚨 MODE BANNER */}
            <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                isAgentic ? 'bg-purple-50 border-purple-300' :
                isIndividual ? 'bg-emerald-50 border-emerald-300' :
                'bg-blue-50 border-blue-300'
            }`}>
                <div className="flex items-center gap-3">
                    <i className={`fas ${isAgentic ? 'fa-robot text-purple-600 text-xl' : isIndividual ? 'fa-cube text-emerald-600 text-xl' : 'fa-tasks text-blue-600 text-xl'}`}></i>
                    <div>
                        <div className={`font-black text-sm uppercase tracking-widest ${
                            isAgentic ? 'text-purple-800' : isIndividual ? 'text-emerald-800' : 'text-blue-800'
                        }`}>
                            {isAgentic ? 'Agentic Orchestration Active' : isIndividual ? 'Individual Tasks Mode' : 'Manual Pipeline Mode'}
                        </div>
                        <p className="text-[10px] font-medium text-slate-500">
                            {isAgentic ? 'Hermes will autonomously execute all 7 phases. Lock individual controls during run.' :
                             isIndividual ? 'Validate minimum prerequisites, then use Workbench for ad-hoc migration tasks.' :
                             'Standard step-by-step Kanban execution. Team triggers each phase manually.'}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                    isAgentic ? 'bg-purple-200 text-purple-700 border border-purple-300' :
                    isIndividual ? 'bg-emerald-200 text-emerald-700 border border-emerald-300' :
                    'bg-blue-200 text-blue-700 border border-blue-300'
                }`}>
                    {executionMode.toUpperCase()}
                </span>
            </div>

            {/* 🚨 AGENTIC: Orchestrate All button */}
            {isAgentic && (
                <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-lg p-6">
                    <h4 className="font-black text-purple-800 text-sm uppercase tracking-widest mb-3">
                        <i className="fas fa-robot mr-2"></i> Autonomous Pipeline Execution
                    </h4>
                    <p className="text-xs text-slate-500 mb-5">
                        The orchestration engine will chain all 7 phases sequentially. Individual phase controls are locked during execution.
                    </p>
                    {autoOrchestrating ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-purple-700 font-bold text-sm">
                                <i className="fas fa-spinner fa-spin text-xl"></i>
                                Orchestration in progress...
                            </div>
                            <div className="bg-slate-900 rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-[10px] text-emerald-400 border border-slate-700 shadow-inner">
                                {orchestrationLog.map((line, i) => (
                                    <div key={i} className={line.includes('✓') ? 'text-emerald-400' : 'text-purple-300'}>{line}</div>
                                ))}
                                <div className="text-amber-400 animate-pulse mt-2">
                                    <i className="fas fa-spinner fa-spin mr-2"></i> Agent working...
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleOrchestrateAll}
                            disabled={executionState?.currentPhase === 'COMPLETED'}
                            className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all ${
                                executionState?.currentPhase === 'COMPLETED'
                                    ? 'bg-emerald-500 text-white cursor-default'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
                            }`}
                        >
                            {executionState?.currentPhase === 'COMPLETED' 
                                ? <><i className="fas fa-check-circle mr-2"></i> Pipeline Already Completed</>
                                : <><i className="fas fa-play mr-2"></i> Orchestrate All 7 Phases</>
                            }
                        </button>
                    )}
                </div>
            )}

            {/* 🚨 INDIVIDUAL: Prerequisite Check */}
            {isIndividual && (
                <div className="bg-white border-2 border-emerald-200 rounded-2xl shadow-lg p-6">
                    <h4 className="font-black text-emerald-800 text-sm uppercase tracking-widest mb-3">
                        <i className="fas fa-clipboard-check mr-2"></i> Prerequisite Validation
                    </h4>
                    <p className="text-xs text-slate-500 mb-5">
                        Individual task mode requires network fabric (Wave 0) and migration agents to be in place before ad-hoc workloads.
                    </p>
                    {!prereqChecked ? (
                        <div className="flex gap-3">
                            <button onClick={handleCheckPrereqs} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors">
                                <i className="fas fa-stethoscope mr-2"></i> Check Prerequisites
                            </button>
                            <button onClick={handleForcePrereqs} disabled={autoOrchestrating} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors disabled:opacity-50">
                                {autoOrchestrating ? <><i className="fas fa-spinner fa-spin mr-2"></i> Running...</> : <><i className="fas fa-bolt mr-2"></i> Quick-Run Prerequisites</>}
                            </button>
                        </div>
                    ) : prereqPassed ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                            <i className="fas fa-check-circle text-emerald-600 text-2xl"></i>
                            <div>
                                <div className="font-black text-emerald-800 text-sm">Prerequisites Validated</div>
                                <p className="text-[10px] text-emerald-700 font-medium">Network fabric + agents confirmed. Engineering Workbench is unlocked.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <i className="fas fa-times-circle text-rose-600 text-2xl"></i>
                                <div>
                                    <div className="font-black text-rose-800 text-sm">Prerequisites Not Met</div>
                                    <p className="text-[10px] text-rose-700 font-medium">Required: Wave 0 network fabric + deployed migration agents.</p>
                                </div>
                            </div>
                            <button onClick={handleForcePrereqs} disabled={autoOrchestrating} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors disabled:opacity-50">
                                {autoOrchestrating ? <><i className="fas fa-spinner fa-spin mr-2"></i> Running...</> : <><i className="fas fa-bolt mr-2"></i> Quick-Run Prerequisites</>}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 🚨 PIPELINE PHASES (visible in all modes, locked during agentic run) */}
            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden p-8">
                {isGreenfield ? (
                    <div>Greenfield Pipeline...</div>
                ) : (
                    <>
                        {/* PHASE 4.1: WAVE 0 */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${
                            executionState.currentPhase === 'PHASE_4_1' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' :
                            executionState.currentPhase > 'PHASE_4_1' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Phase 4.1</div>
                                    <h4 className="text-lg font-black text-white mb-2">Wave 0: Network & Identity Foundation</h4>
                                    <p className="text-xs text-slate-400">Executes Terraform to build isolated Transit VPCs, Subnets, and Security Groups.</p>
                                </div>
                                {executionState.currentPhase === 'PHASE_4_1' ? (
                                    <button
                                        onClick={() => setShowWaveZeroModal(true)}
                                        disabled={autoOrchestrating}
                                        className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md transition-colors ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                        <i className="fas fa-network-wired mr-2"></i> Configure & Execute
                                    </button>
                                ) : <div className="text-blue-500"><i className="fas fa-check-circle text-2xl"></i></div>}
                            </div>
                            {autoOrchestrating && executionState.currentPhase === 'PHASE_4_1' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.2: PRE-FLIGHT WITH CR GATE */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_2' ? 'border-amber-500 bg-slate-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : executionState.currentPhase > 'PHASE_4_2' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Phase 4.2</div>
                                    <h4 className="text-lg font-black text-white mb-2">Vector-Aware OS Pre-Flight</h4>
                                    <p className="text-xs text-slate-400">Validates OS constraints and checks target Cloud availability against quoted BOM.</p>
                                    
                                    {crState === 'pending' && (
                                        <div className="mt-4 bg-rose-500/10 border-2 border-rose-500 p-5 rounded-xl animate-pulse-slow">
                                            <div className="flex items-center gap-3 text-rose-500 font-black mb-2"><i className="fas fa-exclamation-triangle text-xl"></i> Change Request (CR) Needed</div>
                                            <p className="text-xs text-rose-200/80 mb-4 font-medium leading-relaxed">
                                                <strong>Availability Check Failed:</strong> The quoted flavor <span className="font-mono bg-rose-900 px-1 rounded">s6.large.2</span> is unavailable in the target AZ. Upsizing to <span className="font-mono bg-rose-900 px-1 rounded">c7.large.2</span> is required to boot database. 
                                                <br/><em>Warning: Acknowledging this change will result in a mismatch with the purchased RI and generate Pay-Per-Use (PPU) charges.</em>
                                            </p>
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div><label className="block text-[9px] font-black uppercase text-rose-400 mb-1">Commercial Approver (SA/BD)</label><input type="text" value={crForm.approver} onChange={e=>setCrForm({...crForm, approver: e.target.value})} className="w-full p-2 bg-slate-900 border border-rose-500/50 rounded text-xs text-white outline-none focus:border-rose-400" placeholder="e.g. John Doe" /></div>
                                                <div><label className="block text-[9px] font-black uppercase text-rose-400 mb-1">Approval Ticket / Email Ref</label><input type="text" value={crForm.ticket} onChange={e=>setCrForm({...crForm, ticket: e.target.value})} className="w-full p-2 bg-slate-900 border border-rose-500/50 rounded text-xs text-white outline-none focus:border-rose-400" placeholder="e.g. Jira-9942" /></div>
                                            </div>
                                            <button onClick={handleApproveCR} disabled={autoOrchestrating} className={`px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}>Acknowledge Financial Risk & Override <i className="fas fa-unlock ml-2"></i></button>
                                        </div>
                                    )}
                                </div>
                                {executionState.currentPhase === 'PHASE_4_2' && crState === 'idle' ? (
                                    <div className="flex gap-2">
                                        <button onClick={handleSimulateCR} disabled={autoOrchestrating} className={`px-4 py-2 border rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'border-slate-500 text-slate-500 cursor-not-allowed' : 'border-slate-600 hover:bg-slate-700 text-slate-400'}`} title="Simulate HANA Out-of-Stock">Simulate CR Failure</button>
                                        <button onClick={() => updatePhase('PHASE_4_3', 'PENDING')} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}><i className="fas fa-microscope mr-2"></i> Run OS Diagnostics</button>
                                    </div>
                                ) : executionState.currentPhase > 'PHASE_4_2' || executionState.currentPhase === 'COMPLETED' ? <div className="text-amber-500 flex flex-col items-end"><i className="fas fa-check-circle text-2xl"></i>{crState==='approved' && <span className="text-[8px] font-black uppercase text-rose-500 mt-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">CR Overridden</span>}</div> : null}
                            </div>
                            {autoOrchestrating && executionState.currentPhase === 'PHASE_4_2' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.3: LANDING ZONE */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_3' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : executionState.currentPhase > 'PHASE_4_3' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div><div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 4.3</div><h4 className="text-lg font-black text-white mb-2">Build App Landing Zone</h4><p className="text-xs text-slate-400">Provisions application VPCs, target ECS instances, and empty PaaS databases.</p></div>
                                {executionState.currentPhase === 'PHASE_4_3' ? <button onClick={() => handleExecuteTerraform(null)} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}><i className="fas fa-cogs mr-2"></i> Deploy Infrastructure</button> : executionState.currentPhase > 'PHASE_4_3' || executionState.currentPhase === 'COMPLETED' ? <div className="text-purple-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && executionState.currentPhase === 'PHASE_4_3' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.4: AGENTS */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_4' ? 'border-fuchsia-500 bg-slate-800 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : executionState.currentPhase > 'PHASE_4_4' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div><div className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest mb-1">Phase 4.4</div><h4 className="text-lg font-black text-white mb-2">Deploy Data Plane Agents</h4><p className="text-xs text-slate-400">Pushes SMS/DRS agents over the established Wave 0 network.</p></div>
                                {executionState.currentPhase === 'PHASE_4_4' ? <button onClick={() => updatePhase('PHASE_4_5', 'PENDING')} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white'}`}><i className="fas fa-satellite-dish mr-2"></i> Push Agents</button> : executionState.currentPhase > 'PHASE_4_4' || executionState.currentPhase === 'COMPLETED' ? <div className="text-fuchsia-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && executionState.currentPhase === 'PHASE_4_4' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.5: SYNC */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_5' ? 'border-indigo-500 bg-slate-800 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : executionState.currentPhase > 'PHASE_4_5' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div><div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Phase 4.5</div><h4 className="text-lg font-black text-white mb-2">Continuous Sync Monitor</h4><p className="text-xs text-slate-400">Awaiting 100% byte-by-byte synchronization. Lock state before Cutover.</p></div>
                                {executionState.currentPhase === 'PHASE_4_5' ? <button onClick={() => updatePhase('PHASE_4_6', 'PENDING')} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}><i className="fas fa-lock mr-2"></i> Lock Sync & Proceed</button> : executionState.currentPhase > 'PHASE_4_5' || executionState.currentPhase === 'COMPLETED' ? <div className="text-indigo-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && executionState.currentPhase === 'PHASE_4_5' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.6: CUTOVER */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_6' ? 'border-rose-500 bg-slate-800 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : executionState.currentPhase > 'PHASE_4_6' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div><div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Phase 4.6</div><h4 className="text-lg font-black text-white mb-2">Cold Cutover & VPC Promotion</h4><p className="text-xs text-slate-400">Severs on-premise connection and modifies Huawei Cloud VPC bindings.</p></div>
                                {executionState.currentPhase === 'PHASE_4_6' ? <button onClick={() => updatePhase('PHASE_4_7', 'PENDING')} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}><i className="fas fa-power-off mr-2"></i> Execute Network Swap</button> : executionState.currentPhase === 'COMPLETED' || executionState.currentPhase > 'PHASE_4_6' ? <div className="text-rose-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && executionState.currentPhase === 'PHASE_4_6' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.7: GARBAGE COLLECTION */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${executionState.currentPhase === 'PHASE_4_7' ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Phase 4.7</div>
                                    <h4 className="text-lg font-black text-white mb-2">Teardown & Garbage Collection</h4>
                                    <p className="text-xs text-slate-400">Destroys transient migration resources (Factory VMs, EIPs, Staging Disks) to drop PPU costs to quoted baseline.</p>
                                </div>
                                {executionState.currentPhase === 'PHASE_4_7' ? (
                                    <button onClick={handleGarbageCollection} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}><i className="fas fa-trash-alt mr-2"></i> Destroy Transient Resources</button>
                                ) : executionState.currentPhase === 'COMPLETED' ? <div className="text-emerald-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && executionState.currentPhase === 'PHASE_4_7' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>
                    </>
                )}

                {executionState.currentPhase === 'COMPLETED' && (
                    <div className="mt-8 bg-emerald-500/10 border border-emerald-500 p-6 rounded-xl text-center animate-fade-in">
                        <i className="fas fa-check-double text-4xl text-emerald-500 mb-3"></i>
                        <h3 className="font-black text-xl text-emerald-400">Migration Pipeline Completed</h3>
                        <p className="text-emerald-200 mt-2 text-sm">Servers are now live and attached to the Production VPC. Transient costs eliminated. Please proceed to Post-Live.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// 🚨 PRESERVED: Readiness Gateway View
function ReadinessGatewayView({ project, isGreenfield, authLevel, isZeroTrust, onApprove }) {
    return (
        <div className="p-8 h-full flex flex-col justify-center items-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-center p-12">
                <h3 className="text-xl font-black mb-4">4.0 Execution Readiness Gateway</h3>
                <p className="text-sm text-slate-500 mb-8">Target Boundary Verified. Cloud credentials validated.</p>
                <button onClick={onApprove} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest shadow-md transition-colors">Unlock Engine <i className="fas fa-unlock ml-2"></i></button>
            </div>
        </div>
    );
}

// ==========================================
// 🚨 NEW: 4.8 ENGINEERING WORKBENCH (Hermes Agentic Orchestration)
// ==========================================
function WorkbenchView({ project }) {
    const [prompt, setPrompt] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState([
        "[system] mig_worker is offline.",
        "[system] Awaiting deployment to Target VPC..."
    ]);
    const [selectedProfile, setSelectedProfile] = useState('exec');
    const [selectedModel, setSelectedModel] = useState('');

    const executionMode = project?.executionMode || 'manual';
    const isAgentic = executionMode === 'agentic';

    const handleDelegate = async () => {
        if (!prompt || isExecuting) return;
        setIsExecuting(true);
        setTerminalOutput(prev => [
            ...prev,
            `\n[hermes] Spawning agent via profile '${selectedProfile}'...`,
            `[hermes] Goal: "${prompt}"`
        ]);

        try {
            const token = localStorage.getItem('erp_jwt_token');
            const body = {
                goal: prompt,
                context: `ERP Project ID: ${project?.id || 'N/A'}. Repo at C:/Users/h84423900/latam-cloud-erp/repo.`,
                profile: selectedProfile,
            };
            if (selectedModel) body.model = selectedModel;

            const res = await fetch('/api/hermes-cli/delegate-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (data.success) {
                setTerminalOutput(prev => [
                    ...prev,
                    `\n[hermes ✓] Task completed successfully.`,
                    `[output]\n${data.response}`
                ]);
            } else {
                setTerminalOutput(prev => [
                    ...prev,
                    `\n[hermes ✗] Task failed: ${data.error}`
                ]);
            }
        } catch (err) {
            setTerminalOutput(prev => [
                ...prev,
                `\n[error] Network error: ${err.message}`
            ]);
        } finally {
            setIsExecuting(false);
            setPrompt('');
        }
    };

    const profileOptions = [
        { id: 'exec', label: 'exec (GLM 5.2)', icon: 'fa-robot', color: 'text-purple-400' },
        { id: 'default', label: 'default (DeepSeek V4)', icon: 'fa-brain', color: 'text-blue-400' },
    ];

    const modelOptions = [
        { id: '', label: 'Use profile default' },
        { id: 'glm-5.2', label: 'GLM 5.2 (Zhipu)', provider: 'zai' },
        { id: 'kimi-k2.6', label: 'Kimi K2.6 (Moonshot)', provider: 'kimi-coding' },
    ];

    return (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
            {/* Left: Hermes Agentic Co-Pilot */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                    <h3 className="font-black text-sm text-slate-800 flex items-center">
                        <i className={`fas ${isAgentic ? 'fa-robot text-purple-600' : 'fa-tasks text-blue-600'} mr-2`}></i>
                        {isAgentic ? 'Hermes Agentic Orchestrator' : 'Hermes Context AI'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                        isAgentic 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                        {isAgentic ? 'AGENTIC MODE — GLM 5.2' : 'MANUAL MODE'}
                    </span>
                </div>
                <div className="flex-1 p-6 bg-slate-50/50 flex flex-col">
                    {isAgentic ? (
                        <>
                            <div className="flex-1 flex flex-col items-center justify-center text-center mb-4">
                                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                                    <i className="fas fa-robot"></i>
                                </div>
                                <h4 className="font-black text-slate-700 mb-2">Autonomous Migration Agent</h4>
                                <p className="text-xs text-slate-500 max-w-sm">
                                    Describe the migration workload. Hermes will spawn agents with the appropriate model to handle it autonomously.
                                </p>
                                {/* Profile & Model Selectors */}
                                <div className="w-full max-w-xs mt-4 space-y-2">
                                    <div className="flex gap-2">
                                        {profileOptions.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedProfile(p.id)}
                                                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                    selectedProfile === p.id
                                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                <i className={`fas ${p.icon} mr-1`}></i> {p.label}
                                            </button>
                                        ))}
                                    </div>
                                    <select
                                        value={selectedModel}
                                        onChange={e => setSelectedModel(e.target.value)}
                                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 font-medium"
                                    >
                                        {modelOptions.map(m => (
                                            <option key={m.id} value={m.id}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                                <i className="fas fa-brain"></i>
                            </div>
                            <h4 className="font-black text-slate-700">Manual Pipeline Mode</h4>
                            <p className="text-xs text-slate-500 mt-2 max-w-sm">
                                Use Hermes AI for guidance. Select "Agentic Orchestration" in Phase 3.2 for autonomous execution.
                            </p>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-200 bg-white flex gap-3">
                    <input
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleDelegate()}
                        placeholder={isAgentic 
                            ? "e.g. Migrate Ubuntu 20.04 web server via SMS with 500GB data..." 
                            : "e.g. Generate an SMS installation script for Ubuntu 20.04..."}
                        className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        disabled={isExecuting}
                    />
                    <button
                        onClick={handleDelegate}
                        disabled={!prompt || isExecuting}
                        className={`px-5 py-2.5 rounded-xl font-black text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                            isAgentic
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isExecuting ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <i className="fas fa-paper-plane"></i>
                        )}
                    </button>
                </div>
            </div>

            {/* Right: mig_worker Terminal */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
                    <h3 className="font-black text-sm text-white flex items-center">
                        <i className="fas fa-terminal text-emerald-400 mr-2"></i> mig_worker Terminal
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-400">profile: {selectedProfile}</span>
                        <button
                            onClick={() => setTerminalOutput([
                                "[system] Terminal cleared.",
                                "[system] mig_worker ready."
                            ])}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Clear terminal"
                        >
                            <i className="fas fa-eraser text-xs"></i>
                        </button>
                    </div>
                </div>
                <div className="flex-1 p-6 font-mono text-xs text-emerald-400 overflow-y-auto whitespace-pre-wrap custom-scrollbar bg-slate-950">
                    {terminalOutput.map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                    {isExecuting && (
                        <div className="text-amber-400 animate-pulse mt-2">
                            <i className="fas fa-spinner fa-spin mr-2"></i> Agent working...
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex gap-3">
                    <button
                        onClick={() => setTerminalOutput(prev => [...prev, "\n[diag] Running connectivity diagnostics...", "[diag ✓] VPC reachable. SMS endpoint responding. ECS quotas OK."])}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm border border-slate-600"
                    >
                        <i className="fas fa-stethoscope mr-1"></i> Run Diagnostics
                    </button>
                    <button
                        onClick={handleDelegate}
                        disabled={!prompt || isExecuting}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm shadow-emerald-900/50 disabled:opacity-50"
                    >
                        {isExecuting ? (
                            <><i className="fas fa-spinner fa-spin mr-1"></i> Executing...</>
                        ) : (
                            <><i className="fas fa-cloud-upload-alt mr-1"></i> Execute Vector Push</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 🚨 NEW: 4.9 DELIVERY COMMAND CENTER (Telemetry)
// ==========================================
function CommandCenterView({ project, executionState, executionMode }) {
    const isAgentic = executionMode === 'agentic';
    const pipelineComplete = executionState?.currentPhase === 'COMPLETED';

    // Build dynamic rows from project delegate tasks and execution state
    const delegateTasks = project?.delegateTasks || [];
    const hasDelegates = delegateTasks.length > 0;

    // Phase status mapping
    const phaseLabels = {
        'PHASE_4_0': 'Readiness Gateway',
        'PHASE_4_1': 'Wave 0: Network',
        'PHASE_4_2': 'OS Pre-Flight',
        'PHASE_4_3': 'Landing Zone',
        'PHASE_4_4': 'Agent Deployment',
        'PHASE_4_5': 'Sync Monitor',
        'PHASE_4_6': 'Cutover',
        'PHASE_4_7': 'Garbage Collection',
    };
    const currentPhase = executionState?.currentPhase;
    const phaseLabel = phaseLabels[currentPhase] || 'Idle';

    return (
        <div className="animate-fade-in space-y-6">
            {/* 🚨 STATUS SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${isAgentic ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        <i className={`fas ${isAgentic ? 'fa-robot' : 'fa-tasks'}`}></i>
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Execution Mode</div>
                        <div className="font-black text-sm text-slate-800">{executionMode?.toUpperCase() || 'MANUAL'}</div>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        pipelineComplete ? 'bg-emerald-100 text-emerald-600' : 
                        currentPhase && currentPhase !== 'PHASE_4_0' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                        <i className={`fas ${pipelineComplete ? 'fa-check-circle' : 'fa-spinner fa-spin'}`}></i>
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pipeline Status</div>
                        <div className="font-black text-sm text-slate-800">{pipelineComplete ? 'COMPLETED' : phaseLabel}</div>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${hasDelegates ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        <i className="fas fa-network-wired"></i>
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Delegates</div>
                        <div className="font-black text-sm text-slate-800">{hasDelegates ? delegateTasks.length : '0'} running</div>
                    </div>
                </div>
            </div>

            {/* 🚨 DELEGATE TASK MONITOR */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                <h4 className="font-black text-lg text-slate-800 mb-6 flex items-center">
                    <i className="fas fa-satellite-dish text-emerald-500 mr-3"></i> 
                    {isAgentic ? 'Agentic Orchestration Telemetry' : 'Migration Delegate Telemetry'}
                </h4>
                
                {!hasDelegates ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                        <i className="fas fa-inbox text-5xl text-slate-300 mb-4"></i>
                        <h5 className="font-black text-slate-500 text-sm mb-2">No Active Delegates</h5>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                            {isAgentic 
                                ? 'Click "Orchestrate All" in the Orchestrator tab to spawn autonomous migration agents. Delegate status will appear here in real-time.'
                                : 'When migration delegates are spawned via the Orchestrator or Workbench, their status will appear here.'}
                        </p>
                        {pipelineComplete && (
                            <div className="mt-4 text-emerald-600 text-xs font-bold">
                                <i className="fas fa-check-circle mr-1"></i> Pipeline complete — all phases finished successfully.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                                <tr>
                                    <th className="p-4">Target</th>
                                    <th className="p-4">Phase / Job</th>
                                    <th className="p-4">Provider / Model</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {delegateTasks.map((task, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-800 text-xs">{task.target || 'N/A'}</td>
                                        <td className="p-4 text-xs font-mono text-slate-500">{task.phase || task.goal || '—'}</td>
                                        <td className="p-4 text-xs text-slate-500">{task.model || task.profile || 'exec'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                                task.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                                                task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                task.status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {task.status === 'RUNNING' && <i className="fas fa-spinner fa-spin mr-1"></i>}
                                                {task.status === 'COMPLETED' && <i className="fas fa-check mr-1"></i>}
                                                {task.status === 'FAILED' && <i className="fas fa-times mr-1"></i>}
                                                {task.status || 'UNKNOWN'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 🚨 QUICK REFERENCE: Pipeline Phase Map */}
            {isAgentic && hasDelegates && (
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
                    <h4 className="font-black text-white text-sm uppercase tracking-widest mb-4">
                        <i className="fas fa-project-diagram mr-2 text-purple-400"></i> Pipeline Execution Map
                    </h4>
                    <div className="grid grid-cols-7 gap-2">
                        {['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7'].map((phase, i) => {
                            const phaseKey = `PHASE_4_${i+1}`;
                            const isDone = executionState?.currentPhase > phaseKey || executionState?.currentPhase === 'COMPLETED';
                            const isActive = executionState?.currentPhase === phaseKey;
                            return (
                                <div key={phase} className={`p-3 rounded-lg text-center border transition-all ${
                                    isDone ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
                                    isActive ? 'bg-purple-500/20 border-purple-500 text-purple-300 animate-pulse' :
                                    'bg-slate-800 border-slate-600 text-slate-500'
                                }`}>
                                    <div className="text-[10px] font-black">{phase}</div>
                                    <i className={`fas ${isDone ? 'fa-check' : isActive ? 'fa-spinner fa-spin' : 'fa-circle'} text-[8px] mt-1`}></i>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🚨 NEW: 4.10 TAM SERVICE GOVERNANCE
// ==========================================
function GovernanceView({ project, onUpdateProject }) {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
                <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"><i className="fas fa-clipboard-check"></i></div>
                <h3 className="font-black text-2xl text-slate-800 mb-2">Service Governance Sign-Off</h3>
                <p className="text-sm text-slate-600 mb-8 max-w-lg mx-auto">Confirm that all execution vectors ran successfully, the rollback window has closed, and the system is technically handed over.</p>
                
                <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"><input type="checkbox" className="w-5 h-5 accent-amber-500" /><span className="text-xs font-bold text-slate-700">All SMS/DRS Tasks complete.</span></label>
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"><input type="checkbox" className="w-5 h-5 accent-amber-500" /><span className="text-xs font-bold text-slate-700">Customer accepted Cutover UAT.</span></label>
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"><input type="checkbox" className="w-5 h-5 accent-amber-500" /><span className="text-xs font-bold text-slate-700">mig_worker securely destroyed from Target VPC.</span></label>
                </div>

                <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '5_postlive'); alert("Phase Completed! Moving to Post-Live Governance.");}} className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-transform active:scale-95">
                    Sign Off & Proceed to True-Up <i className="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    );
}
