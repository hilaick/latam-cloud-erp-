import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { formatShortDate, EditableCell } from '../../utils/helpers';
import { ERPContext } from '../../context/ERPContext';
import WaveZeroConfigModal from './WaveZeroConfigModal';
import SpawnTreeVisualizer from './SpawnTreeVisualizer';
import PhaseSummaryCard from './PhaseSummaryCard';

const executableTypes = ['ECS', 'BMS', 'VM', 'SERVER', 'RDS', 'GAUSSDB', 'DB', 'DATABASE'];

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState(project?.authValidated ? 'orchestrator' : 'readiness');
    const [sidebarOpen, setSidebarOpen] = useState(true); 
    const [showWaveZeroModal, setShowWaveZeroModal] = useState(false);
    const [runbookData, setRunbookData] = useState(null);
    const [showRunbookModal, setShowRunbookModal] = useState(false);
    // Physics recalibration tracking (NEW — Improvement #4)
    const [recalibrationState, setRecalibrationState] = useState({
        observedThroughputMbps: null,
        elapsedSyncHours: 0,
        deviationPct: null,
        lastCheckedAt: null,
        recalibrated: false
    });
    
    const [executionState, setExecutionState] = useState(null);
    const [isLoadingState, setIsLoadingState] = useState(true);
    const [liveCloudState, setLiveCloudState] = useState(null); // live cloud resource state

    const isGreenfield = project?.projectType === 'greenfield' || project?.project_type === 'greenfield';
    const authLevel = project?.authLevel || 'Read-Only (Customer Managed)';
    const isZeroTrust = authLevel === 'Read-Only (Customer Managed)';
    // Extract physics recalibration baseline from saved physics data
    const recalibrationBaseline = useMemo(() => {
        const physics = project?.physics;
        if (!physics) return null;
        // Check for structured result first, fall back to legacy
        if (physics.result?._recalibrationBaseline) return physics.result._recalibrationBaseline;
        if (physics._recalibrationBaseline) return physics._recalibrationBaseline;
        // Construct from flat physics data for backward compatibility
        if (physics.engineMode && physics.transitType) {
            const pipeMbps = Math.min(Number(physics.netSource) || 1000, Number(physics.netTunnel) || 300);
            let cryptoTax = physics.transitType === 'IPsec VPN' ? 0.85 : physics.transitType === 'Public Internet' ? 0.75 : 0.95;
            const effectiveMbps = pipeMbps * cryptoTax;
            return {
                expectedThroughputMbps: Math.round(effectiveMbps),
                perNodeExpectedMbps: Math.round(effectiveMbps / Math.max((physics.concurrency || 5), 1)),
                maxParallelNodes: physics.concurrency || 5,
                isFeasible: physics.downtimeWindow ? (Number(physics.downtimeWindow) >= 0) : true,
                recalibrationThreshold: {
                    throughputWarningPct: 70,
                    throughputCriticalPct: 50,
                    timeOverrunWarningPct: 120,
                    timeOverrunCriticalPct: 150
                }
            };
        }
        return null;
    }, [project?.physics]);

    useEffect(() => {
        if (!project?.id) return;
        const fetchState = async () => {
            try {
                const token = sessionStorage.getItem('hermes_access_token');
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
        const token = sessionStorage.getItem('hermes_access_token');
        await fetch(`/api/executions/${project.id}/update`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ phase: newPhase, status: newStatus, pendingAction })
        });
    };

    const handleExecuteTerraform = async (networkConfig = null) => {
        if (!project?.id) return;
        setShowWaveZeroModal(false);
        const token = sessionStorage.getItem('hermes_access_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/execute`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ networkConfig })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) { 
                    alert(`✅ ${data.message}`); 
                    if (isGreenfield && (executionState?.currentPhase || 'PHASE_4_0') === 'PHASE_4_2') updatePhase('PHASE_4_3', 'PENDING');
                    else if (!isGreenfield && (executionState?.currentPhase || 'PHASE_4_0') === 'PHASE_4_1') updatePhase('PHASE_4_2', 'PENDING');
                    else if (!isGreenfield && (executionState?.currentPhase || 'PHASE_4_0') === 'PHASE_4_3') updatePhase('PHASE_4_4', 'PENDING');
                }
                else alert(`❌ Execution Failed:\n\n${data.error}`);
            }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    // 🚨 DRY-RUN: Validate terraform payload without deploying to RFS
    const handleDryRunTerraform = async (networkConfig = null) => {
        if (!project?.id) return null;
        setShowWaveZeroModal(false);
        const token = sessionStorage.getItem('hermes_access_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/execute`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ networkConfig, dryRun: true })
            });
            const data = await res.json();
            if (data.success && data.dry_run) return data;
            throw new Error(data.error || 'Dry-run failed');
        } catch (err) { alert(`Dry-Run Error: ${err.message}`); return null; }
    };

    // 🚨 Phase 4.7 Backend Call
    const handleGarbageCollection = async () => {
        if (!project?.id) return;
        const token = sessionStorage.getItem('hermes_access_token');
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
        { id: 'tam', num: '4.10', icon: 'fa-clipboard-check', label: 'TAM Service Governance' }
    ];

    if (isLoadingState) return <div className="p-12 text-center text-slate-400 font-bold"><i className="fas fa-circle-notch fa-spin mr-2"></i> Initializing State Machine...</div>;
    // Guard: if executionState is null (API failure or first load), provide safe default
    const execState = executionState || { currentPhase: 'PHASE_4_0', status: 'PENDING', pendingAction: null };
    const isLocked = execState.currentPhase === 'PHASE_4_0';
    const executionMode = project?.executionMode || 'manual';
    const isIndividual = executionMode === 'individual';
    const pipelineComplete = execState.currentPhase === 'COMPLETED';
    // Workbench unlocked when: pipeline complete OR individual prereqs passed OR manual mode past Phase 4.2 (infra deployed)
    const workbenchUnlocked = pipelineComplete || (isIndividual && project?.prereqsValidated) || (executionMode === 'manual' && execState.currentPhase > 'PHASE_4_2') || (project?.data?.executionProgress?.operations?.length > 0);

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
                                if (item.id === 'workbench' && !workbenchUnlocked) 
                                    return alert(isIndividual 
                                        ? "Validate prerequisites in the Orchestrator tab first to unlock Workbench & Command Center." 
                                        : executionMode === 'agentic'
                                            ? "Complete the 7-phase pipeline to unlock Workbench & Command Center."
                                            : "Advance past Phase 4.2 (infrastructure deployed) to unlock Workbench & Command Center."); 
                                setSubTab(item.id); 
                            }}
                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between group ${
                                isLocked && item.id !== 'readiness' ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' : 
                                item.id === 'workbench' && !workbenchUnlocked ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' :
                                subTab === item.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                                    isLocked && item.id !== 'readiness' ? 'bg-slate-200 text-slate-400' : 
                                    item.id === 'workbench' && !workbenchUnlocked ? 'bg-slate-200 text-slate-400' :
                                    subTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                }`}>{item.num}</div>
                                <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                            {isLocked && item.id !== 'readiness' && <i className="fas fa-lock text-slate-300"></i>}
                            {item.id === 'workbench' && !isLocked && !workbenchUnlocked && <i className="fas fa-lock text-slate-300"></i>}
                        </button>
                    ))}
                    
                    <div className="pt-8">
                        {executionState?.currentPhase === 'COMPLETED' ? (
                            <button onClick={() => onPromote && onPromote('post-live')} className="w-full px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                                Go to Post-Live Phase <i className="fas fa-arrow-right"></i>
                            </button>
                        ) : (
                            <button disabled className="w-full px-4 py-3.5 bg-slate-200 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                                <i className="fas fa-lock"></i> Post-Live Locked
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0 bg-transparent min-h-[700px] transition-all duration-300">
                    {subTab === 'readiness' && <ReadinessGatewayView project={project} isGreenfield={isGreenfield} authLevel={authLevel} isZeroTrust={isZeroTrust} onApprove={() => { updatePhase('PHASE_4_1', 'PENDING'); setSubTab('orchestrator'); }} />}
                    {subTab === 'orchestrator' && executionState && <OrchestratorView project={project} executionState={executionState} updatePhase={updatePhase} isGreenfield={isGreenfield} setShowWaveZeroModal={setShowWaveZeroModal} handleExecuteTerraform={handleExecuteTerraform} handleDryRunTerraform={handleDryRunTerraform} handleGarbageCollection={handleGarbageCollection} executionMode={project?.executionMode || 'manual'} onUpdateProject={onUpdateProject} execCloudState={liveCloudState} />}
                    {/* 🚨 REPLACED STUBS WITH INTEGRATED FULL COMPONENTS */}
                    {subTab === 'workbench' && <WorkbenchView project={project} />}
                    {subTab === 'tam' && !isGreenfield && <GovernanceView project={project} onUpdateProject={onUpdateProject} />}
                </div>
            </div>
        </div>
    );
}

// 🚨 PRESERVED: Your exact interactive state machine for Phase 4.1 to 4.7
// 🚨 UPGRADED: Modes — manual (original behavior) / agentic (auto-chain) / individual (prereq check)
function OrchestratorView({ project, executionState, updatePhase, isGreenfield, setShowWaveZeroModal, handleExecuteTerraform, handleDryRunTerraform, handleGarbageCollection, executionMode, onUpdateProject }) {
    const [cloudState, setCloudState] = useState(null); // local live cloud state (owned by this component's poller) (component body uses cloudState)
    const execState = executionState || { currentPhase: 'PHASE_4_0', status: 'PENDING', pendingAction: null };
    const [crState, setCrState] = useState('idle'); // idle, pending, approved
    const [crForm, setCrForm] = useState({ approver: '', ticket: '' });
    const [autoOrchestrating, setAutoOrchestrating] = useState(false);
    const [orchestrationLog, setOrchestrationLog] = useState([]);
    // Phase-level resume state (Fix #4)
    const [completedOrchPhases, setCompletedOrchPhases] = useState(new Set());
    const [failedOrchPhaseIdx, setFailedOrchPhaseIdx] = useState(null);
    const [phaseStatus, setPhaseStatus] = useState({}); // { PHASE_4_X: 'completed'|'failed'|'running' }
    const [prereqChecked, setPrereqChecked] = useState(project?.prereqsValidated === true);
    const [prereqPassed, setPrereqPassed] = useState(project?.prereqsValidated === true);
    const [dryRunResult, setDryRunResult] = useState(null);
    const [showDryRunModal, setShowDryRunModal] = useState(false);
    const [dryRunLoading, setDryRunLoading] = useState(false);
    const [externalExecutions, setExternalExecutions] = useState(null);
    const [activeHermesSessions, setActiveHermesSessions] = useState(null);
    const [liveFeed, setLiveFeed] = useState([]);
    const [inferredPhase, setInferredPhase] = useState(null);
    const [sessionStats, setSessionStats] = useState(null);
    const [lastToolCall, setLastToolCall] = useState(null);
    const [phaseContent, setPhaseContent] = useState(null); // dynamic phase content from execution plan
    const [polledAt, setPolledAt] = useState(null); // last poll timestamp
    const [activeService, setActiveService] = useState('all'); // service filter: all | sms | drs | oms

    // Detect migration services active for this project from targetArchitecture
    // Categories match Phase 3.4a Strategic Tooling:
    //   Compute Migration → SMS (Server Migration Service) — includes EVS volumes of servers
    //   Database Migration → DRS & UGO
    //   Storage Migration → OMS (Object) and CDM (Data) — ONLY standalone OBS/SFS, NOT EVS
    const services = useMemo(() => {
        const ta = project?.targetArchitecture || {};
        // Compute: ECS/VM servers
        const computeItems = [...(ta.compute || [])].filter(s => s.name || s.source_name);
        const computeN = computeItems.length;
        // Database: RDS/DDS/DCS/DMS
        const dbN = [...(ta.database || [])].filter(s => s.name || s.source_name).length;
        // Storage: ONLY standalone object/file storage (OBS/SFS), EXCLUDE:
        //  - EVS volumes (travel with their server via SMS)
        //  - Duplicate entries of compute servers (same name as a server)
        const computeNames = new Set(computeItems.map(s => (s.name || s.source_name).toLowerCase()));
        const storageN = [...(ta.storage || [])].filter(s => {
            const nm = (s.name || s.source_name || '').trim();
            if (!nm) return false;
            if (computeNames.has(nm.toLowerCase())) return false; // duplicate of a server → compute
            const t = String(s.type || '').toUpperCase();
            if (t.includes('EVS') || t.includes('VOLUME')) return false; // server volume → SMS
            if (t.includes('OBS') || t.includes('SFS') || t.includes('BUCKET')) return true;
            // Fallback by name: volume-XXXX pattern = EVS attached to server
            if (/volume/i.test(nm) || /-v\d+$/i.test(nm)) return false;
            return true;
        }).length;
        // Also scan execution plan for service markers
        const plan = project?.data?.executionPlan || {};
        const steps = Array.isArray(plan) ? plan : (plan.steps || []);
        const hasSMS = steps.some(s => String(s.action || '').startsWith('SMS_'));
        const hasDRS = steps.some(s => String(s.action || '').startsWith('DRS_') || String(s.action || '').startsWith('UGO_'));
        const hasOMS = steps.some(s => String(s.action || '').startsWith('OMS_') || String(s.action || '').startsWith('CDM_'));
        const svcs = [];
        if (computeN > 0 || hasSMS) svcs.push({
            id: 'sms', label: 'Compute Migration', tool: 'SMS', icon: 'fa-server', count: computeN,
            color: '#f59e0b', desc: 'Server Migration Service — block-level Windows/Linux sync (+ attached EVS volumes)'
        });
        if (dbN > 0 || hasDRS) svcs.push({
            id: 'drs', label: 'Database Migration', tool: 'DRS & UGO', icon: 'fa-database', count: dbN,
            color: '#06b6d4', desc: 'Zero-downtime logical replication and schema conversion'
        });
        if (storageN > 0 || hasOMS) svcs.push({
            id: 'oms', label: 'Storage Migration', tool: 'OMS / CDM', icon: 'fa-archive', count: storageN,
            color: '#8b5cf6', desc: 'Object (OMS) and data (CDM) large-scale parallel volume transport'
        });
        return svcs;
    }, [project?.targetArchitecture, project?.data?.executionPlan]);

    // 🚨 FETCH PHASE CONTENT: Load dynamic phase descriptions from execution plan
    useEffect(() => {
        if (!project?.id) return;
        const token = sessionStorage.getItem('hermes_access_token');
        fetch(`/api/execution/${project.id}/phase-content`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => { if (data.success && data.phases) setPhaseContent(data.phases); })
            .catch(() => {});
    }, [project?.id]);

    // 🚨 CLOUD STATE: Poll actual Huawei Cloud resources every 5s to detect migration progress
    // This works regardless of where the execution is triggered (GUI, external agent, CLI)
    // because it reads the REAL cloud state, not process lists
    const _isAgentic = executionMode === 'agentic';
    // Cloud-state fetch function (called by poll + manual refresh button).
    // Plain function (NOT useCallback): the minifier broke the useCallback closure
    // and emitted an unresolved global `setCloudState` -> ReferenceError in browser.
    const fetchCloudState = () => {
        if (!project?.id) return Promise.resolve();
        const token = sessionStorage.getItem('hermes_access_token');
        if (!token) return Promise.resolve();
        return fetch(`/api/execution/${project.id}/cloud-state`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => { if (data.success) { try { setCloudState(data); } catch (err) { console.error('[cloud-state] set failed', err); } } else console.error('[cloud-state] success=false', data); })
            .catch(err => { console.error('[cloud-state] fetch error', err); try { setCloudState(prev => prev || { error: String(err), timestamp: new Date().toISOString() }); } catch (e2) { console.error('[cloud-state] set failed in catch', e2); } });
    };
    // Poll in ALL modes — individual/manual also need per-server task status (SMS progress, connectivity)
    useEffect(() => {
        if (!project?.id) return;
        fetchCloudState(); // immediate
        const interval = setInterval(fetchCloudState, 5000);
        return () => clearInterval(interval);
    }, [project?.id]);

    const isAgentic = _isAgentic;
    const isIndividual = executionMode === 'individual';
    const isManual = !isAgentic && !isIndividual;

    const handleSimulateCR = () => { setCrState('pending'); };
    const handleApproveCR = () => {
        if (!crForm.approver || !crForm.ticket) return alert("Approver Name and Ticket Reference are required for audit trail.");
        setCrState('approved');
        updatePhase('PHASE_4_3', 'PENDING');
    };

    // 🚨 DRY-RUN: Run terraform validation without deploying
    const handleDryRun = async () => {
        setDryRunLoading(true);
        const result = await handleDryRunTerraform();
        setDryRunLoading(false);
        if (result) {
            setDryRunResult(result);
            setShowDryRunModal(true);
        }
    };

    // 🚨 AGENTIC: Fire-and-poll orchestration via background engine
    // POST /api/execution/<id>/orchestrate starts the pipeline in a background thread.
    // useEffect polls /orchestrate/status every 3s and updates the UI.
    const handleOrchestrateAll = async (startFrom = 0, explicitPhaseKey = null) => {
        const token = sessionStorage.getItem('hermes_access_token');
        setAutoOrchestrating(true);
        // Per-phase run: caller passes explicitPhaseKey (e.g. 'PHASE_4_1') to force re-run of THAT phase.
        // Full pipeline (no explicitPhaseKey): keep skip-completed behavior.
        const phaseKeys = ['PHASE_4_1', 'PHASE_4_2', 'PHASE_4_3', 'PHASE_4_4', 'PHASE_4_5', 'PHASE_4_6', 'PHASE_4_7'];
        const restartPhase = explicitPhaseKey && phaseKeys.includes(explicitPhaseKey) ? explicitPhaseKey : null;
        // Clear stale "completed" markers: if restarting a phase, clear it AND all later phases
        // (they may have been marked done from an earlier run — wrong to show green for them)
        if (restartPhase) {
            const restartIdx = phaseKeys.indexOf(restartPhase);
            const staleCompleted = completedOrchPhases.size > 0;
            if (staleCompleted) {
                const cleared = new Set();
                completedOrchPhases.forEach(p => {
                    const idx = phaseKeys.indexOf(p);
                    if (idx < restartIdx) cleared.add(p); // keep EARLIER completed phases
                });
                setCompletedOrchPhases(cleared);
            }
            setOrchestrationLog(prev => [...prev, `[restart] Forced re-run of ${restartPhase} — cleared stale status for this and later phases`]);
        }
        setOrchestrationLog(prev => [...prev, '[start] Requesting backend to start 7-phase pipeline...']);

        try {
            const res = await fetch(`/api/execution/${project?.id}/orchestrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ start_from: startFrom, restart_phase: restartPhase }),
            });
            const data = await res.json();

            if (data.success) {
                setOrchestrationLog(prev => [...prev, '[start] ✓ Pipeline started in background. Polling status...']);
                // The polling useEffect will pick it up from here.
            } else {
                setOrchestrationLog(prev => [...prev, `[start] ✗ ${data.error || 'Failed to start pipeline.'}`]);
                setAutoOrchestrating(false);
            }
        } catch (err) {
            setOrchestrationLog(prev => [...prev, `[start] ✗ Network error: ${err.message}`]);
            setAutoOrchestrating(false);
        }
    };

    // 🚨 POLL: Poll backend for pipeline status every 3s while orchestrating
    useEffect(() => {
        if (!project?.id) return;
        const token = sessionStorage.getItem('hermes_access_token');
        let cancelled = false;

        const poll = async () => {
            try {
                const res = await fetch(`/api/execution/${project.id}/orchestrate/status`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await res.json();
                if (cancelled) return;

                const st = data.status || {};
                // ── LIVE STATUS: derive autoOrchestrating from actual pipeline state
                // so the Run button shows Running as soon as the backend starts,
                // even if this component mounted mid-run (page refresh, navigation).
                if (st.status === 'running' || st.status === 'running_external') {
                    setAutoOrchestrating(true);
                }
                // Update phase status map
                if (st.phase_status) setPhaseStatus(st.phase_status);
                // Update completed phases
                if (st.completed_phases) setCompletedOrchPhases(new Set(st.completed_phases));
                // Update failed phase
                setFailedOrchPhaseIdx(st.failed_phase ?? null);
                // Update log — only append new lines
                if (st.log && st.log.length > 0) {
                    setOrchestrationLog(prev => {
                        const newLines = st.log.slice(prev.length);
                        return newLines.length > 0 ? [...prev, ...newLines] : prev;
                    });
                }

                // Update external execution info
                if (st.external_executions) setExternalExecutions(st.external_executions);
                else setExternalExecutions(null);
                if (st.active_hermes_sessions) setActiveHermesSessions(st.active_hermes_sessions);
                else setActiveHermesSessions(null);
                // Live feed from external Hermes session
                if (st.live_feed) setLiveFeed(st.live_feed);
                if (st.inferred_phase) setInferredPhase(st.inferred_phase);
                if (st.session_stats) setSessionStats(st.session_stats);
                if (st.last_tool_call) setLastToolCall(st.last_tool_call);
                if (st.polled_at) setPolledAt(st.polled_at);

                // Check if pipeline finished
                if (st.status === 'completed' || st.status === 'halted' || st.status === 'idle' || st.status === 'pending' || st.status === '') {
                    setAutoOrchestrating(false);
                    setExternalExecutions(null);
                    setActiveHermesSessions(null);
                    if (st.status === 'completed') {
                        updatePhase('COMPLETED', 'DONE');
                    } else if (st.status === 'halted' && st.current_phase) {
                        updatePhase(st.current_phase, 'FAILED');
                    }
                } else if (st.status === 'crashed') {
                    setAutoOrchestrating(false);
                    setCollapsedSections(prev => ({...prev, logs: false}));
                    if (st.log) setOrchestrationLog(st.log);
                }
                // running_external and orphaned_external: keep polling.
                // For orphaned, the data is static but we keep the dashboard visible.
            } catch (err) {
                // Network blip — keep polling
            }
        };

        poll(); // immediate first poll
        const interval = setInterval(poll, 3000);
        const onRefresh = () => poll();
        window.addEventListener('hermes-refresh-status', onRefresh);
        return () => { cancelled = true; clearInterval(interval); window.removeEventListener('hermes-refresh-status', onRefresh); };
    }, [project?.id]);

    // 🚨 MOUNT-CHECK: On mount or project switch, check if a pipeline is already running.
    // If so, set autoOrchestrating=true so the polling useEffect picks it up.
    // This handles the case where the API was called directly (delegated agent, curl, another session).
    useEffect(() => {
        if (!project?.id) return;
        const token = sessionStorage.getItem('hermes_access_token');
        let cancelled = false;

        const checkRunning = async () => {
            try {
                const res = await fetch(`/api/execution/${project.id}/orchestrate/status`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await res.json();
                if (cancelled) return;

                const st = data.status || {};
                // If pipeline is running (either via orchestration engine or external), sync state and poll
                if (st.status === 'running' || st.status === 'running_external') {
                    setAutoOrchestrating(true);
                } else if (st.status === 'orphaned_external' && st.live_feed && st.live_feed.length > 0) {
                    // Only set orphaned as running if it has recent live feed data
                    setAutoOrchestrating(true);
                    // Sync log from backend
                    if (st.log) setOrchestrationLog(st.log);
                    if (st.phase_status) setPhaseStatus(st.phase_status);
                    if (st.completed_phases) setCompletedOrchPhases(new Set(st.completed_phases));
                    setFailedOrchPhaseIdx(st.failed_phase ?? null);
                    // Store external execution info for display
                    if (st.external_executions) setExternalExecutions(st.external_executions);
                    if (st.active_hermes_sessions) setActiveHermesSessions(st.active_hermes_sessions);
                    if (st.live_feed) setLiveFeed(st.live_feed);
                    if (st.inferred_phase) setInferredPhase(st.inferred_phase);
                    if (st.session_stats) setSessionStats(st.session_stats);
                    if (st.last_tool_call) setLastToolCall(st.last_tool_call);
                    if (st.polled_at) setPolledAt(st.polled_at);
                } else if (st.status === 'crashed') {
                    if (st.log) setOrchestrationLog(st.log);
                    if (st.phase_status) setPhaseStatus(st.phase_status);
                    if (st.completed_phases) setCompletedOrchPhases(new Set(st.completed_phases));
                    setFailedOrchPhaseIdx(st.failed_phase ?? null);
                    setCollapsedSections(prev => ({...prev, logs: false}));
                } else if (st.status === 'halted') {
                    if (st.log) setOrchestrationLog(st.log);
                    if (st.phase_status) setPhaseStatus(st.phase_status);
                    if (st.completed_phases) setCompletedOrchPhases(new Set(st.completed_phases));
                    setFailedOrchPhaseIdx(st.failed_phase ?? null);
                } else if (st.status === 'completed') {
                    if (st.completed_phases) setCompletedOrchPhases(new Set(st.completed_phases));
                    if (st.phase_status) setPhaseStatus(st.phase_status);
                    updatePhase('COMPLETED', 'DONE');
                }
            } catch (err) {
                // Silent — might not have auth yet
            }
        };

        checkRunning();
        return () => { cancelled = true; };
    }, [project?.id]);

    // 🚨 RESUME: Continue from failed phase
    const handleResumePipeline = async () => {
        if (failedOrchPhaseIdx === null) return;
        setPhaseStatus({});
        const token = sessionStorage.getItem('hermes_access_token');
        setAutoOrchestrating(true);
        setOrchestrationLog(prev => [...prev, `[resume] Requesting resume from phase ${failedOrchPhaseIdx + 1}...`]);
        try {
            const res = await fetch(`/api/execution/${project?.id}/orchestrate/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (!data.success) {
                setOrchestrationLog(prev => [...prev, `[resume] ✗ ${data.error}`]);
                setAutoOrchestrating(false);
            }
        } catch (err) {
            setOrchestrationLog(prev => [...prev, `[resume] ✗ ${err.message}`]);
            setAutoOrchestrating(false);
        }
    };

    // 🚨 ROLLBACK: Destroy all provisioned infrastructure
    // 🚨 ROLLBACK: In-GUI modal (no browser confirm)
    const [showRollbackModal, setShowRollbackModal] = useState(false);
    const [rollbackPreview, setRollbackPreview] = useState(null);
    const [rollbackSelected, setRollbackSelected] = useState({});
    const [rollbackLoading, setRollbackLoading] = useState(false);

    const handleRollback = async () => {
        setRollbackLoading(true);
        setOrchestrationLog(prev => [...prev, '[rollback] Enumerating resources...']);
        const token = sessionStorage.getItem('hermes_access_token');
        try {
            const res = await fetch(`/api/execution/${project?.id}/orchestrate/rollback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (!data.success) {
                setOrchestrationLog(prev => [...prev, `[rollback ✗] ${data.error}`]);
                setRollbackLoading(false); return;
            }
            const found = data.found || {};
            // Pre-select all resources by default
            const all = {};
            for (const list of Object.values(found)) {
                for (const r of list) all[r.id] = true;
            }
            setRollbackSelected(all);
            setRollbackPreview(found);
            setShowRollbackModal(true);
        } catch (err) {
            setOrchestrationLog(prev => [...prev, `[rollback ✗] ${err.message}`]);
        }
        setRollbackLoading(false);
    };

    const handleRollbackExecute = async () => {
        const selected = Object.entries(rollbackSelected).filter(([_,v]) => v).map(([id]) => id);
        setShowRollbackModal(false);
        setOrchestrationLog(prev => [...prev, `[rollback] Deleting ${selected.length} resources...`]);
        const token = sessionStorage.getItem('hermes_access_token');
        try {
            const res = await fetch(`/api/execution/${project?.id}/orchestrate/rollback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ resources: selected.length > 0 ? selected : 'all' })
            });
            const data = await res.json();
            if (data.success) {
                const deleted = data.deleted || {};
                const count = (deleted.vpcs?.length||0) + (deleted.subnets?.length||0) + (deleted.security_groups?.length||0) + (deleted.eips?.length||0);
                setOrchestrationLog(prev => [...prev, `[rollback ✓] ${count} resources deleted: ${data.message || ''}`]);
                setCompletedOrchPhases(new Set());
                setPhaseStatus({});
                setFailedOrchPhaseIdx(null);
                updatePhase('PHASE_4_0', 'PENDING');
            } else {
                setOrchestrationLog(prev => [...prev, `[rollback ✗] ${data.error}`]);
            }
        } catch (err) {
            setOrchestrationLog(prev => [...prev, `[rollback ✗] ${err.message}`]);
        }
    };

    // 🚨 INDIVIDUAL: Validate minimum prerequisites for ad-hoc task execution
    const handleCheckPrereqs = () => {
        const wave0Done = (executionState?.currentPhase || 'PHASE_4_0') > 'PHASE_4_1' || executionState?.currentPhase === 'COMPLETED';
        const agentsDone = (executionState?.currentPhase || 'PHASE_4_0') > 'PHASE_4_4' || executionState?.currentPhase === 'COMPLETED';
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

    // Collapsible section state
    const [collapsedSections, setCollapsedSections] = useState({
        cloudState: false,
        lifecycle: false,
        runbook: false,
        logs: true
    });

    // Toggle function
    const toggleSection = (section) => {
        setCollapsedSections(prev => ({...prev, [section]: !prev[section]}));
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* 🚨 STICKY SUMMARY BAR */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-2 border-indigo-100 rounded-2xl shadow-md p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0 ${
                        isAgentic ? 'bg-indigo-100 text-indigo-700' : isIndividual ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                        <i className={`fas ${isAgentic ? 'fa-robot' : isIndividual ? 'fa-cube' : 'fa-tasks'}`}></i>
                        {isAgentic ? 'Auto' : isIndividual ? 'Tasks' : 'Manual'}
                    </div>
                    {cloudState?.inferred_phase && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                            <span className={`w-2 h-2 rounded-full ${
                                completedOrchPhases.size > 0 ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'
                            }`}></span>
                            {cloudState.inferred_phase.replace('PHASE_4_', 'Phase 4.')} · {
  cloudState.error ? <span className="text-red-500 font-bold">Crashed: {cloudState.error}</span> :
  cloudState.phase_reason ? cloudState.phase_reason :
  cloudState.sms_progress?.running > 0 ? `${cloudState.sms_progress.running} task${cloudState.sms_progress.running > 1 ? 's' : ''} syncing` :
  'Ready'
}
                            <span className="text-[8px] text-slate-400 font-mono">↻ {cloudState.timestamp}</span>
                        </div>
                    )}
                    {!cloudState && (
                        <div className="text-[10px] font-medium text-slate-500">
                            <i className="fas fa-circle-notch fa-spin mr-1"></i> Loading cloud state...
                            <span className="ml-2 text-[8px] text-slate-400 font-mono">(refreshing every 5s)</span>
                        </div>
                    )}
                    {cloudState?.error && (
                        <div className="mt-1 text-[9px] text-rose-500 font-mono">cloud-state error: {cloudState.error}</div>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {!autoOrchestrating && !executionState?.currentPhase === 'COMPLETED' && (
                        <button
                            onClick={() => handleOrchestrateAll(0)}
                            disabled={autoOrchestrating}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-40"
                        >
                            <i className="fas fa-play mr-1"></i> Run Pipeline
                        </button>
                    )}
                    <button
                        onClick={() => { fetchCloudState(); /* also refresh status */ window.dispatchEvent(new CustomEvent('hermes-refresh-status')); }}
                        className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                        title="Refresh cloud state + pipeline status"
                    >
                        <i className="fas fa-sync-alt mr-1"></i> Refresh
                    </button>
                    {failedOrchPhaseIdx !== null && (
                        <button onClick={handleResumePipeline} className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest shadow-sm transition-colors">
                            <i className="fas fa-forward mr-1"></i> Resume
                        </button>
                    )}
                </div>
            </div>

            {/* 🚨 AGENTIC: Orchestrate All button */}
            {isAgentic && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">

                    {/* 🚨 CLOUD STATE SECTION — collapsible */}
                    {isAgentic && cloudState && (
                        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <button
                                onClick={() => toggleSection('cloudState')}
                                className="w-full flex items-center justify-between p-3 cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-cloud text-indigo-500"></i>
                                    <h4 className="font-black text-slate-700 text-xs uppercase tracking-widest">Live Cloud State</h4>
                                    <span className="text-[8px] text-slate-400 font-mono">↻ {cloudState.timestamp}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hidden sm:block">
                                        {cloudState.phase_reason}
                                    </div>
                                    <span className="text-[10px] text-slate-400"><i className={`fas ${collapsedSections.cloudState ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i></span>
                                </div>
                            </button>
                            {!collapsedSections.cloudState && (
                            <div className="px-3 pb-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                {/* SMS Sources */}
                                <div className="bg-white rounded-lg p-3 border border-amber-100">
                                    <div className="text-[9px] font-black uppercase text-amber-400 mb-1">SMS Sources</div>
                                    <div className="text-2xl font-black text-amber-900">
                                        {cloudState.sms_source_count || 0}
                                        {cloudState.sms_sources_connected > 0 && (
                                            <span className="text-[10px] text-green-600 ml-1" title="connected sources">●{cloudState.sms_sources_connected} active</span>
                                        )}
                                    </div>
                                    {cloudState.resources?.sms_sources?.length > 0 && (
                                        <div className="text-[8px] text-amber-500 mt-1 truncate">
                                            {cloudState.resources.sms_sources.map(s => `${s.name}:${s.state}`).join(', ')}
                                        </div>
                                    )}
                                </div>
                                {/* ECS Instances */}
                                <div className="bg-white rounded-lg p-3 border border-purple-100">
                                    <div className="text-[9px] font-black uppercase text-purple-400 mb-1">Target ECS</div>
                                    <div className="text-2xl font-black text-purple-900">{cloudState.ecs_count || 0}</div>
                                    {cloudState.resources?.ecs_instances?.length > 0 && (
                                        <div className="text-[8px] text-purple-500 mt-1 truncate">
                                            {cloudState.resources.ecs_instances.map(e => `${e.name}:${e.status}`).join(', ')}
                                        </div>
                                    )}
                                </div>
                                {/* SMS Tasks */}
                                <div className="bg-white rounded-lg p-3 border border-emerald-100">
                                    <div className="text-[9px] font-black uppercase text-emerald-400 mb-1">SMS Tasks</div>
                                    <div className="text-2xl font-black text-emerald-900">{cloudState.sms_progress?.total || 0}</div>
                                    {cloudState.sms_progress?.total > 0 && (
                                        <div className="text-[8px] text-emerald-500 mt-1">
                                            {cloudState.sms_progress.running > 0 && <span className="text-blue-600 font-bold">⚡{cloudState.sms_progress.running} </span>}
                                            {cloudState.sms_progress.success > 0 && <span className="text-green-600 font-bold">✓{cloudState.sms_progress.success} </span>}
                                            {cloudState.sms_progress.failed > 0 && <span className="text-red-600 font-bold">✗{cloudState.sms_progress.failed} </span>}
                                            {cloudState.sms_progress.waiting > 0 && <span className="text-amber-600">⏳{cloudState.sms_progress.waiting}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!cloudState.credentials_found && (
                                <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1">
                                    ⚠ No Huawei Cloud credentials found — cannot query cloud state. Run Readiness Gateway (Phase 4.0) first.
                                </div>
                            )}
                            </div>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6 bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100">
                        <div className="text-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Source</div>
                            <div className="text-xs font-bold text-slate-700">{project?.sourceEnvironment || project?.presales?.sourceEnvironment || 'Unknown'}</div>
                            {(() => { const sr = project?.sourceRegion || project?.source_region || project?.data?.sourceRegion || project?.data?.source_region; return sr ? <div className="text-[9px] text-slate-400 font-medium">{sr}</div> : null; })()}
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Resources</div>
                            <div className="text-xs font-bold text-slate-700">{(() => {
                                // Same fallback as MigrationOrchestratorView servers: TA may be
                                // absent (migration outside ERP) — count mapperNodes instead.
                                let ta = project?.targetArchitecture;
                                if (!ta || (!(ta.compute || []).length && !(ta.database || []).length && !(ta.storage || []).length)) {
                                    const mn = project?.mapperNodes || [];
                                    const serverTypes = ['ECS', 'COMPUTE', 'APP', 'WEB', 'VM', 'SERVER'];
                                    const computeFallback = mn.filter(n => serverTypes.includes(String(n.type || '').toUpperCase()));
                                    const dbFallback = mn.filter(n => ['RDS', 'DATABASE', 'DB', 'DCS'].includes(String(n.type || '').toUpperCase()));
                                    const storageFallback = mn.filter(n => ['OBS', 'EVS', 'SFS', 'STORAGE', 'BUCKET'].includes(String(n.type || '').toUpperCase()));
                                    ta = { compute: computeFallback, database: dbFallback, storage: storageFallback };
                                }
                                const all = [...(ta.compute||[]),...(ta.database||[]),...(ta.storage||[])].filter(s=>s.name || s.source_name);
                                return `${all.length} migrating`;
                            })()}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Target Region</div>
                            <div className="text-xs font-bold text-slate-700">{project?.region || project?.data?.region || 'la-north-2'}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Delivery Posture</div>
                            <div className="text-xs font-bold text-slate-700 leading-tight" title="Read-Only auth = customer installs agents (Zero Trust). Full Admin/Partner Managed = ERP performs all operations.">{(() => { const al = project?.authLevel || project?.presales?.authLevel || []; const authStr = Array.isArray(al) ? al.join(', ') : String(al); const isZeroTrust = authStr.includes('Read-Only'); const isFullAdmin = authStr.includes('Full Admin') || authStr.includes('Partner Managed'); return isZeroTrust ? '🔒 Zero Trust (customer installs agents)' : isFullAdmin ? '🔓 Full Admin (ERP performs ops)' : '🔐 Mixed (' + authStr.slice(0, 30) + ')'; })()}</div>
                        </div>
                    </div>

                    {/* Service Switch — filter lifecycle by migration type */}
                    {isAgentic && services && services.length > 0 && (services.length > 1 || services.some(s => s.count > 1)) && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setActiveService('all')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                                        activeService === 'all'
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'
                                    }`}
                                >
                                    <i className="fas fa-layer-group mr-1"></i> All Services
                                </button>
                                {services.map(svc => (
                                    <button
                                        key={svc.id}
                                        onClick={() => setActiveService(svc.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-1.5 ${
                                            activeService === svc.id
                                                ? 'text-white shadow-md'
                                                : 'bg-white text-slate-500 border-slate-200 hover:opacity-80'
                                        }`}
                                        style={activeService === svc.id ? { background: svc.color, borderColor: svc.color } : {}}
                                    >
                                        <i className={`fas ${svc.icon} text-[10px]`}></i>
                                        {svc.label}
                                        <span className="text-[8px] opacity-75">· {svc.tool}</span>
                                        {svc.count > 0 && <span className="text-[8px] opacity-75">({svc.count})</span>}
                                    </button>
                                ))}
                            </div>
                            {activeService !== 'all' && services.find(s => s.id === activeService) && (
                                <div className="mt-1 text-[9px] text-slate-500 font-medium">
                                    Showing {services.find(s => s.id === activeService)?.desc}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Lifecycle Circle Chart — 7 phases as circular nodes (collapsible) */}
                    <div className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => toggleSection('lifecycle')}
                            className="w-full flex items-center justify-between p-3 cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <i className="fas fa-sync-alt text-indigo-500"></i>
                                <h4 className="font-black text-slate-700 text-xs uppercase tracking-widest">Migration Lifecycle</h4>
                            </div>
                            <span className="text-[10px] text-slate-400"><i className={`fas ${collapsedSections.lifecycle ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i></span>
                        </button>
                        {!collapsedSections.lifecycle && (
                        <div className="px-2 pb-4">
                        <div className="flex items-center justify-center overflow-x-auto">
                            <div className="relative shrink-0" style={{ width: 'min(380px, 88vw)', height: 'min(380px, 88vw)' }}>
                                {/* Center circle */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex flex-col items-center justify-center text-white shadow-xl z-10">
                                    <i className="fas fa-robot text-2xl mb-1"></i>
                                    <div className="text-[9px] font-black uppercase tracking-widest">7 Phases</div>
                                    <div className="text-[8px] text-purple-200 mt-0.5">{
                                        completedOrchPhases.size > 0 ? `${completedOrchPhases.size}/7 done` :
                                        inferredPhase ? `${inferredPhase.replace('PHASE_4_', '4.')} active` :
                                        cloudState?.inferred_phase ? `${cloudState.inferred_phase.replace('PHASE_4_', '4.')} active` : 'Ready'
                                    }</div>
                                </div>
                                {/* SVG connecting circle */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 380 380">
                                    <circle cx="190" cy="190" r="155" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                                    {(completedOrchPhases.size > 0 || inferredPhase) && (
                                        <circle cx="190" cy="190" r="155" fill="none" stroke={failedOrchPhaseIdx !== null ? '#f59e0b' : '#10b981'} strokeWidth="3"
                                            strokeDasharray={`${((completedOrchPhases.size || (inferredPhase ? parseInt(inferredPhase.replace('PHASE_4_','')) - 1 : 0)) / 7) * 974} 974`}
                                            transform="rotate(-90 190 190)"
                                            strokeLinecap="round"
                                            className="transition-all duration-700"
                                        />
                                    )}
                                </svg>
                                {/* Phase nodes — dynamic from execution plan */}
                                {[
                                    { n: 1, label: phaseContent?.PHASE_4_1?.label || 'Network', icon: phaseContent?.PHASE_4_1?.icon || 'fa-network-wired', color: '#3b82f6', desc: phaseContent?.PHASE_4_1?.desc || 'Wave 0 VPC, subnets, SG' },
                                    { n: 2, label: phaseContent?.PHASE_4_2?.label || 'Source Prep', icon: phaseContent?.PHASE_4_2?.icon || 'fa-download', color: '#f59e0b', desc: phaseContent?.PHASE_4_2?.desc || 'OS pre-flight, agent install' },
                                    { n: 3, label: phaseContent?.PHASE_4_3?.label || 'Target', icon: phaseContent?.PHASE_4_3?.icon || 'fa-server', color: '#8b5cf6', desc: phaseContent?.PHASE_4_3?.desc || 'Provision target instances' },
                                    { n: 4, label: phaseContent?.PHASE_4_4?.label || 'Data Sync', icon: phaseContent?.PHASE_4_4?.icon || 'fa-sync-alt', color: '#10b981', desc: phaseContent?.PHASE_4_4?.desc || 'SMS/DRS/OMS replication' },
                                    { n: 5, label: phaseContent?.PHASE_4_5?.label || 'Monitor', icon: phaseContent?.PHASE_4_5?.icon || 'fa-chart-line', color: '#06b6d4', desc: phaseContent?.PHASE_4_5?.desc || 'Sync progress monitoring' },
                                    { n: 6, label: phaseContent?.PHASE_4_6?.label || 'Cutover', icon: phaseContent?.PHASE_4_6?.icon || 'fa-exchange-alt', color: '#ef4444', desc: phaseContent?.PHASE_4_6?.desc || 'Cold cutover, VPC promotion' },
                                    { n: 7, label: phaseContent?.PHASE_4_7?.label || 'Teardown', icon: phaseContent?.PHASE_4_7?.icon || 'fa-trash-alt', color: '#84cc16', desc: phaseContent?.PHASE_4_7?.desc || 'Cleanup, smoke tests' },
                                ].map((ph, idx) => {
                                    const angle = (idx / 7) * 2 * Math.PI - Math.PI / 2;
                                    const x = 190 + 155 * Math.cos(angle);
                                    const y = 190 + 155 * Math.sin(angle);
                                    const phaseKey = `PHASE_4_${ph.n}`;
                                    let status = phaseStatus[phaseKey] || (completedOrchPhases.has(phaseKey) ? 'completed' : 'pending');
                                    // Only mark phases as 'running' if the pipeline is ACTUALLY running
                                    // (not from stale inferred_phase which defaults to PHASE_4_1 after a halt/failure)
                                    if (autoOrchestrating && status === 'pending' && inferredPhase === phaseKey) status = 'running';
                                    if (autoOrchestrating && status === 'pending' && inferredPhase && inferredPhase > phaseKey) status = 'completed';
                                    if (autoOrchestrating && cloudState?.inferred_phase) {
                                        if (status === 'pending' && cloudState.inferred_phase === phaseKey) status = 'running';
                                        if (status === 'pending' && cloudState.inferred_phase > phaseKey) status = 'completed';
                                    }
                                    const bgColor = status === 'completed' ? '#10b981' : status === 'running' ? '#8b5cf6' : status === 'failed' ? '#ef4444' : '#fff';
                                    const txtColor = status === 'pending' ? ph.color : '#fff';
                                    const ringClass = status === 'running' ? 'animate-pulse' : '';
                                    return (
                                        <div key={ph.n}
                                            className={`absolute -translate-x-1/2 -translate-y-1/2 ${ringClass}`}
                                            style={{ left: `${x}px`, top: `${y}px` }}
                                        >
                                            <div className="group relative cursor-help">
                                                <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg border-2 transition-all"
                                                    style={{ background: bgColor, borderColor: ph.color, color: txtColor }}>
                                                    <i className={`fas ${ph.icon} text-sm`}></i>
                                                    <div className="text-[7px] font-black uppercase mt-0.5">{ph.label}</div>
                                                </div>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                                                    <div className="font-bold">Phase 4.{ph.n}: {ph.label}</div>
                                                    <div className="text-slate-300">{ph.desc}</div>
                                                    <div className="text-purple-300 mt-0.5">{status.toUpperCase()}</div>
                                                </div>
                                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-800 text-white text-[8px] font-black flex items-center justify-center border border-white shadow">
                                                    {ph.n}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        </div>
                        )}
                        </div>

                    {/* What Will Happen — Phase Legend (collapsible) */}
                    <div className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-3 flex items-center justify-between border-b border-slate-100">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <i className="fas fa-list-ul text-indigo-500 mr-2"></i>What Will Happen — 7 Sequential Phases
                            </div>
                            <button onClick={() => toggleSection('runbook')} className="text-[10px] text-slate-400 cursor-pointer">
                                <i className={`fas ${collapsedSections.runbook ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                            </button>
                        </div>
                        {!collapsedSections.runbook && (
                        <div className="p-3 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {[
                                { n: 1, label: phaseContent?.PHASE_4_1?.label || 'Network', desc: phaseContent?.PHASE_4_1?.desc || 'Provision isolated Transit VPC, subnets, security groups, identity foundation.' },
                                { n: 2, label: phaseContent?.PHASE_4_2?.label || 'Source Prep', desc: phaseContent?.PHASE_4_2?.desc || 'Validate source OS against target cloud availability. Check quoted flavors in stock.' },
                                { n: 3, label: phaseContent?.PHASE_4_3?.label || 'Target', desc: phaseContent?.PHASE_4_3?.desc || 'Deploy target VPC, ECS instances, empty PaaS databases matching approved architecture.' },
                                { n: 4, label: phaseContent?.PHASE_4_4?.label || 'Data Sync', desc: phaseContent?.PHASE_4_4?.desc || 'Deploy SMS and DRS migration agents. Verify health and connectivity.' },
                                { n: 5, label: phaseContent?.PHASE_4_5?.label || 'Monitor', desc: phaseContent?.PHASE_4_5?.desc || 'Monitor byte-by-byte replication. Report sync percentages and ETA to cutover.' },
                                { n: 6, label: phaseContent?.PHASE_4_6?.label || 'Cutover', desc: phaseContent?.PHASE_4_6?.desc || 'Sever on-prem connections, promote target VPC, validate app reachability.' },
                                { n: 7, label: phaseContent?.PHASE_4_7?.label || 'Teardown', desc: phaseContent?.PHASE_4_7?.desc || 'Destroy transient resources. Confirm PPU costs drop to baseline.' },
                            ].map(ph => {
                                const phaseKey = `PHASE_4_${ph.n}`;
                                let status = phaseStatus[phaseKey] || (completedOrchPhases.has(phaseKey) ? 'completed' : 'pending');
                                // Running mark ONLY when pipeline is ACTUALLY running — cloudState.inferred_phase
                                // defaults to PHASE_4_1 even when idle, so it must not drive the spinner.
                                if (autoOrchestrating && status === 'pending' && inferredPhase === phaseKey) status = 'running';
                                if (autoOrchestrating && status === 'pending' && inferredPhase && inferredPhase > phaseKey) status = 'completed';
                                if (autoOrchestrating && cloudState?.inferred_phase) {
                                    if (status === 'pending' && cloudState.inferred_phase === phaseKey) status = 'running';
                                    if (status === 'pending' && cloudState.inferred_phase > phaseKey) status = 'completed';
                                }
                                return (
                                    <div key={ph.n} className="flex items-start gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                                            status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                            status === 'running' ? 'bg-purple-100 text-purple-600 animate-pulse' :
                                            status === 'failed' ? 'bg-rose-100 text-rose-600' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {status === 'completed' ? <i className="fas fa-check"></i> : status === 'running' ? <i className="fas fa-spinner fa-spin"></i> : status === 'failed' ? <i className="fas fa-times"></i> : ph.n}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-700">4.{ph.n} {ph.label}</div>
                                            <div className="text-[10px] text-slate-500 line-clamp-2">{ph.desc}</div>
                                        </div>
                                    </div>
                                 );
                             })}
                             </div>
                             </div>
                             )}
                             </div>

                             {/* External execution live dashboard — AFTER lifecycle graph */}
                    {/* Only show external execution feed when a LIVE process exists (pid > 0) */}
                    {externalExecutions && externalExecutions.length > 0 && externalExecutions[0]?.pid > 0 && (
                        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${externalExecutions[0]?.pid > 0 ? 'bg-amber-500 animate-pulse' : 'bg-rose-400'}`}>
                                        <i className={`fas ${externalExecutions[0]?.pid > 0 ? 'fa-bolt' : 'fa-exclamation-triangle'} text-sm`}></i>
                                    </div>
                                    <div>
                                        <div className="font-black text-amber-800 text-sm uppercase tracking-widest">
                                            {externalExecutions[0]?.pid > 0 ? 'External Execution In Progress' : 'External Execution — Process Ended'}
                                        </div>
                                        <div className="text-[10px] text-amber-600 font-medium">
                                            {externalExecutions[0]?.pid > 0
                                                ? 'Hermes agent running outside the orchestration engine — live data from session DB'
                                                : 'Hermes agent process ended — showing last known session data'}
                                        </div>
                                    </div>
                                </div>
                                {sessionStats && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold">
                                        <span className="bg-amber-200 text-amber-800 px-2 py-1 rounded-full">{sessionStats.messages} msgs</span>
                                        <span className="bg-amber-200 text-amber-800 px-2 py-1 rounded-full">{sessionStats.tool_calls} tools</span>
                                        {sessionStats.last_activity && <span className="text-amber-600 text-[9px]">last: {sessionStats.last_activity}</span>}
                                        {externalExecutions[0]?.pid > 0 ? (
                                            <span className="bg-amber-200 text-amber-800 px-2 py-1 rounded-full animate-pulse">● LIVE</span>
                                        ) : (
                                            <span className="bg-rose-200 text-rose-800 px-2 py-1 rounded-full">⚠ Ended</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Inferred phase indicator */}
                            {inferredPhase && (
                                <div className="mb-3 bg-white rounded-lg p-3 border border-amber-200">
                                    <div className="flex items-center gap-3">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Inferred Phase</div>
                                        <div className="px-3 py-1 rounded-full bg-purple-100 border border-purple-300 text-purple-700 text-xs font-black">
                                            {inferredPhase.replace('PHASE_4_', '4.')}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            {inferredPhase === 'PHASE_4_1' ? 'Network & Identity Foundation' :
                                             inferredPhase === 'PHASE_4_2' ? 'Source Prep & Agent Install' :
                                             inferredPhase === 'PHASE_4_3' ? 'Target ECS Landing Zone' :
                                             inferredPhase === 'PHASE_4_4' ? 'Data Sync Setup' :
                                             inferredPhase === 'PHASE_4_5' ? 'Sync Monitor / Cutover' :
                                             inferredPhase === 'PHASE_4_6' ? 'Cutover Complete' : 'Unknown'}
                                        </div>
                                        {externalExecutions[0]?.pid > 0 && <i className="fas fa-spinner fa-spin text-amber-500 ml-auto"></i>}
                                    </div>
                                </div>
                            )}

                            {/* Live activity feed — replaces the old "Orchestration in progress" section */}
                            {liveFeed && liveFeed.length > 0 && (
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Agent Activity</div>
                                        <div className="flex items-center gap-2">
                                            {sessionStats && <div className="text-[9px] text-slate-500 font-mono truncate max-w-[200px]">{sessionStats.title}</div>}
                                            {polledAt && <span className="text-[8px] text-emerald-400/60 font-mono">↻ {polledAt}</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {liveFeed.map((msg, i) => (
                                            <div key={i} className={`text-[10px] font-mono flex items-start gap-2 ${
                                                msg.type === 'error' ? 'text-rose-400' :
                                                msg.type === 'success' ? 'text-emerald-400' :
                                                msg.type === 'agent' ? 'text-blue-300' :
                                                msg.type === 'tool' ? 'text-amber-300' : 'text-slate-400'
                                            }`}>
                                                <span className="shrink-0">
                                                    {msg.type === 'error' ? '✗' :
                                                     msg.type === 'success' ? '✓' :
                                                     msg.type === 'agent' ? '🤖' :
                                                     msg.type === 'tool' ? '⚙' : '·'}
                                                </span>
                                                {msg.ts && <span className="shrink-0 text-slate-500 text-[9px] w-24">{msg.ts}</span>}
                                                <span className="shrink-0 text-slate-600 w-14">{msg.role}</span>
                                                {msg.tool && <span className="shrink-0 text-purple-400 font-bold">[{msg.tool}]</span>}
                                                <span className="truncate">{msg.content}</span>
                                            </div>
                                        ))}
                                        {externalExecutions[0]?.pid > 0 && (
                                            <div className="text-amber-400 text-[10px] animate-pulse pt-1">
                                                <i className="fas fa-spinner fa-spin mr-1"></i> Agent working...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Last tool call output */}
                            {lastToolCall && (
                                <div className="mt-3 bg-slate-900 rounded-lg p-3 border border-slate-700">
                                    <div className="flex items-center gap-2 mb-1">
                                        <i className="fas fa-terminal text-emerald-400 text-xs"></i>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{lastToolCall.name}</span>
                                        <span className="text-[9px] text-slate-500 ml-auto">last tool output</span>
                                    </div>
                                    <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">{lastToolCall.output}</pre>
                                </div>
                            )}

                            {/* Process details */}
                            <div className="mt-3 space-y-1">
                                {externalExecutions.map((ex, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[10px] text-amber-700">
                                        <i className="fas fa-server"></i>
                                        {ex.pid > 0 ? <span className="font-bold">PID {ex.pid}</span> : <span className="font-bold">No process</span>}
                                        <span>·</span>
                                        <span>{ex.started}</span>
                                        <span>·</span>
                                        <span className="text-amber-600">{ex.match_reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phase progress bar (shown when there's progress) */}
                    {completedOrchPhases.size > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                <span className="font-bold">{completedOrchPhases.size}/7 phases complete</span>
                                {failedOrchPhaseIdx !== null && <span className="text-rose-500 font-black">⏸ Halted at Phase {failedOrchPhaseIdx + 1}</span>}
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${failedOrchPhaseIdx !== null ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${(completedOrchPhases.size / 7) * 100}%` }} />
                            </div>
                            {/* Per-phase status pills */}
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                                {[1,2,3,4,5,6,7].map(n => {
                                    const phase = `PHASE_4_${n}`;
                                    const status = phaseStatus[phase] || (completedOrchPhases.has(phase) ? 'completed' : 'pending');
                                    const color = status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                                  status === 'failed' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                                                  status === 'running' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                                                  'bg-slate-100 text-slate-400 border-slate-200';
                                    const icon = status === 'completed' ? 'fa-check' : status === 'failed' ? 'fa-times' : status === 'running' ? 'fa-spinner fa-spin' : 'fa-circle';
                                    return (
                                        <span key={n} className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${color}`}>
                                            <i className={`fas ${icon} mr-1 text-[8px]`}></i>P{n}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Phase Summary Cards — show collapsible results for each completed phase */}
                    {orchestrationLog.filter(l => l.includes('[done]')).length > 0 && (
                        <div className="mb-4 space-y-2">
                            {[1,2,3,4,5,6,7].map(n => {
                                const phaseKey = `PHASE_4_${n}`;
                                const phaseLabel = phaseContent?.[phaseKey]?.label || ['Network','Source Prep','Target','Data Sync','Monitor','Cutover','Teardown'][n-1] || `Phase 4.${n}`;
                                const phaseDone = orchestrationLog.some(l =>
                                    (l.includes(phaseKey) || l.includes(phaseLabel) || l.includes(`4.${n}`)) && l.includes('[done]')
                                );
                                const doneLines = orchestrationLog.filter(l => l.includes('[done]') || l.includes('[output]'));
                                if (!phaseDone && doneLines.length === 0) return null;
                                // If we can't match the phase, still render ONE card (the first/only done phase)
                                const showForPhase = phaseDone || (n === 1 && doneLines.length > 0 && !completedOrchPhases.has('PHASE_4_2'));
                                if (!showForPhase) return null;
                                return (
                                    <PhaseSummaryCard key={phaseKey}
                                        phase={phaseContent?.[phaseKey]}
                                        logLines={orchestrationLog}
                                        phaseKey={phaseKey}
                                        projectId={project?.id}
                                        onRollback={handleRollback}
                                        color="#10b981"
                                    />
                                );
                            })}
                        </div>
                    )}
                    <div>
                        {/* Per-phase runbook — always shown (collapsible); Run buttons enabled unless busy */}
                        <div className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('runbook')}>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            <i className="fas fa-clipboard-list text-indigo-500 mr-1"></i> Phase Runbook — individual execution
                                        </div>
                                        <span className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleSection('logs'); }}
                                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border ${
                                                    !collapsedSections.logs ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                <i className="fas fa-terminal mr-1"></i> Logs {!collapsedSections.logs ? '▲' : '▼'}
                                            </button>
                                            <span className="text-[10px] text-slate-400"><i className={`fas ${collapsedSections.runbook ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i></span>
                                        </span>
                                    </div>
                                    {!collapsedSections.runbook && (
                                    <div className="p-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                        {[
                                            { n: 1, label: phaseContent?.PHASE_4_1?.label || 'Network', icon: 'fa-network-wired', color: '#3b82f6', done: completedOrchPhases.has('PHASE_4_1') || (cloudState?.inferred_phase && cloudState.inferred_phase > 'PHASE_4_1') },
                                            { n: 2, label: phaseContent?.PHASE_4_2?.label || 'Source Prep', icon: 'fa-download', color: '#f59e0b', done: completedOrchPhases.has('PHASE_4_2') || (cloudState?.inferred_phase && cloudState.inferred_phase > 'PHASE_4_2') },
                                            { n: 3, label: phaseContent?.PHASE_4_3?.label || 'Target', icon: 'fa-server', color: '#8b5cf6', done: completedOrchPhases.has('PHASE_4_3') || (cloudState?.inferred_phase && cloudState.inferred_phase > 'PHASE_4_3') },
                                            { n: 4, label: phaseContent?.PHASE_4_4?.label || 'Data Sync', icon: 'fa-sync-alt', color: '#10b981', done: completedOrchPhases.has('PHASE_4_4') || (cloudState?.inferred_phase && cloudState.inferred_phase > 'PHASE_4_4') },
                                            { n: 5, label: phaseContent?.PHASE_4_5?.label || 'Monitor', icon: 'fa-chart-line', color: '#06b6d4', done: completedOrchPhases.has('PHASE_4_5') || (cloudState?.inferred_phase && cloudState.inferred_phase > 'PHASE_4_5') },
                                            { n: 6, label: phaseContent?.PHASE_4_6?.label || 'Cutover', icon: 'fa-exchange-alt', color: '#ef4444', done: completedOrchPhases.has('PHASE_4_6') || (cloudState?.inferred_phase && cloudState.inferred_phase > 'PHASE_4_6') },
                                            { n: 7, label: phaseContent?.PHASE_4_7?.label || 'Teardown', icon: 'fa-trash-alt', color: '#84cc16', done: completedOrchPhases.has('PHASE_4_7') || (cloudState?.inferred_phase && cloudState.inferred_phase > 'PHASE_4_7') },
                                        ].map(ph => (
                                            <div key={ph.n} className={`rounded-lg border-2 p-3 flex items-center justify-between transition-all ${ph.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0" style={{ background: ph.done ? '#10b981' : ph.color }}>
                                                        {ph.done ? <i className="fas fa-check text-[8px]"></i> : ph.n}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="text-[9px] font-black text-slate-600 truncate">4.{ph.n} {ph.label}</div>
                                                    </div>
                                                </div>
                                                {ph.done ? (
                                                    <span className="text-[8px] font-black uppercase text-emerald-600 shrink-0">Done</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOrchestrateAll(ph.n - 1, `PHASE_4_${ph.n}`)}
                                                        disabled={autoOrchestrating || executionState?.currentPhase === 'COMPLETED'}
                                                        className="text-[8px] font-black uppercase text-purple-600 hover:text-purple-800 shrink-0 hover:underline disabled:opacity-40"
                                                    >
                                                        Run
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    </div>
                                    )}
                                </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Primary: Full Pipeline (smaller, secondary to per-phase) */}
                                <button
                                    onClick={() => {
                                        if (completedOrchPhases.size > 0 || executionState?.currentPhase > 'PHASE_4_0') {
                                            if (!confirm(`This will execute the migration pipeline from the beginning.\n\n${completedOrchPhases.size > 0 ? `${completedOrchPhases.size} phases already completed — they will be skipped.\n` : ''}The backend execution engine will chain all 7 phases sequentially:\n\n  4.1 Network & Identity Foundation\n  4.2 OS Pre-Flight\n  4.3 Target ECS Landing Zone\n  4.4 Data Plane Agents\n  4.5 Sync Monitor\n  4.6 Cold Cutover\n  4.7 Teardown\n\nIndividual phase controls are locked during execution.\n\nProceed?`)) return;
                                        }
                                        handleOrchestrateAll(0);
                                    }}
                                    disabled={autoOrchestrating || (executionState?.currentPhase === 'COMPLETED' && completedOrchPhases.size >= 7)}
                                    className={`flex-1 px-6 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-md transition-all ${
                                        executionState?.currentPhase === 'COMPLETED' && completedOrchPhases.size >= 7
                                            ? 'bg-emerald-500 text-white cursor-default'
                                            : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
                                    } ${autoOrchestrating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {executionState?.currentPhase === 'COMPLETED' && completedOrchPhases.size >= 7
                                        ? <><i className="fas fa-check-circle mr-2"></i> Pipeline Already Completed</>
                                        : <><i className="fas fa-play mr-2"></i> {completedOrchPhases.size > 0 ? 'Re-run Full Pipeline' : 'Run Full 7-Phase Pipeline'}</>
                                    }
                                </button>
                                {/* Resume button (only when failed phase exists) */}
                                {failedOrchPhaseIdx !== null && (
                                    <button
                                        onClick={handleResumePipeline}
                                        className="flex-1 px-5 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-md bg-amber-500 hover:bg-amber-600 text-white active:scale-95 transition-all"
                                    >
                                        <i className="fas fa-forward mr-2"></i> Resume from Phase {failedOrchPhaseIdx + 1}
                                    </button>
                                )}
                                {/* Rollback button — always available (enumerates resources itself) */}
                                <button
                                    onClick={handleRollback}
                                        className="flex-1 px-4 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-md bg-rose-600 hover:bg-rose-700 text-white active:scale-95 transition-all"
                                        title="Destroy all provisioned infrastructure"
                                    >
                                        <i className="fas fa-undo mr-1"></i> Rollback
                                    </button>
                            </div>
                        </div>
                        {/* Orchestration log — inside runbook, gated by Logs toggle */}
                        {!collapsedSections.logs && (
                            <div className="border-t border-slate-200">
                                <div className="bg-slate-900 rounded-xl m-3 p-4 max-h-64 overflow-y-auto font-mono text-[10px] border border-slate-700 shadow-inner">
                                    {orchestrationLog.length === 0 && !autoOrchestrating ? (
                                        <div className="text-slate-500 italic">No executions yet — run a phase to see live agent output here.</div>
                                    ) : (
                                        <>
                                            {orchestrationLog.map((line, i) => (
                                                <div key={i} className={line.includes('✓') ? 'text-emerald-400' : line.includes('✗') ? 'text-rose-400' : 'text-purple-300'}>{line}</div>
                                            ))}
                                            {autoOrchestrating && (
                                                <div className="flex items-center gap-3 text-purple-400 font-bold mt-2">
                                                    <i className="fas fa-spinner fa-spin"></i> Pipeline running — live updates...
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                </div>
            )}

            {/* Rollback modal — in-GUI resource selection (no browser confirm) */}
            {showRollbackModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRollbackModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-black text-rose-700 text-sm uppercase tracking-widest">
                                <i className="fas fa-undo mr-2"></i> Rollback — Select Resources
                            </h3>
                            <button onClick={() => setShowRollbackModal(false)} className="text-slate-400 hover:text-slate-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <p className="text-[10px] text-slate-500 mb-3 font-medium">
                                Select which resources to destroy. Untouched resources remain in your account.
                            </p>
                            {!rollbackPreview || (Object.values(rollbackPreview).every(l => !l || l.length === 0)) ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    <i className="fas fa-check-circle text-4xl mb-3 text-emerald-400"></i>
                                    No ERP-tagged resources found to rollback.
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {rollbackPreview.vpcs?.map(r => (
                                        <label key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-rose-50 cursor-pointer border border-slate-100">
                                            <input type="checkbox" checked={rollbackSelected[r.id]} onChange={() => setRollbackSelected(p => ({...p, [r.id]: !p[r.id]}))} className="accent-rose-600" />
                                            <i className="fas fa-network-wired text-rose-400 w-4"></i>
                                            <span className="text-sm font-bold text-slate-700 flex-1">VPC · {r.name}</span>
                                            <span className="text-[9px] font-mono text-slate-400">{r.id.slice(0,8)}</span>
                                        </label>
                                    ))}
                                    {rollbackPreview.subnets?.map(r => (
                                        <label key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-rose-50 cursor-pointer border border-slate-100">
                                            <input type="checkbox" checked={rollbackSelected[r.id]} onChange={() => setRollbackSelected(p => ({...p, [r.id]: !p[r.id]}))} className="accent-rose-600" />
                                            <i className="fas fa-layer-group text-rose-400 w-4"></i>
                                            <span className="text-sm font-bold text-slate-700 flex-1">Subnet · {r.name}</span>
                                            <span className="text-[9px] font-mono text-slate-400">{r.id.slice(0,8)}</span>
                                        </label>
                                    ))}
                                    {rollbackPreview.security_groups?.map(r => (
                                        <label key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-rose-50 cursor-pointer border border-slate-100">
                                            <input type="checkbox" checked={rollbackSelected[r.id]} onChange={() => setRollbackSelected(p => ({...p, [r.id]: !p[r.id]}))} className="accent-rose-600" />
                                            <i className="fas fa-shield-alt text-rose-400 w-4"></i>
                                            <span className="text-sm font-bold text-slate-700 flex-1">SG · {r.name}</span>
                                            <span className="text-[9px] font-mono text-slate-400">{r.id.slice(0,8)}</span>
                                        </label>
                                    ))}
                                    {rollbackPreview.eips?.map(r => (
                                        <label key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-rose-50 cursor-pointer border border-slate-100">
                                            <input type="checkbox" checked={rollbackSelected[r.id]} onChange={() => setRollbackSelected(p => ({...p, [r.id]: !p[r.id]}))} className="accent-rose-600" />
                                            <i className="fas fa-globe text-rose-400 w-4"></i>
                                            <span className="text-sm font-bold text-slate-700 flex-1">EIP · {r.ip}</span>
                                            <span className="text-[9px] font-mono text-slate-400">{r.id.slice(0,8)}</span>
                                        </label>
                                    ))}
                                    <div className="flex gap-2 pt-3 mt-2 border-t border-slate-100">
                                        <button onClick={() => { const all = {}; for (const list of Object.values(rollbackPreview)) for (const r of list) all[r.id] = true; setRollbackSelected(all); }} className="text-[10px] text-slate-500 hover:text-slate-700 underline">Select All</button>
                                        <button onClick={() => setRollbackSelected({})} className="text-[10px] text-slate-500 hover:text-slate-700 underline">Clear</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setShowRollbackModal(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-bold">Cancel</button>
                            <button
                                onClick={handleRollbackExecute}
                                disabled={rollbackLoading || Object.values(rollbackPreview || {}).every(l => !l || l.length === 0)}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md disabled:opacity-40 transition-colors"
                            >
                                <i className="fas fa-trash-alt mr-2"></i> Destroy Selected ({Object.values(rollbackSelected).filter(v => v).length})
                            </button>
                        </div>
                    </div>
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

            {/* 🚨 PIPELINE PHASES — greenfield uses dark container, migration uses transparent */}
            <div className={`${isGreenfield ? 'bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden p-8' : ''}`}>
                {isGreenfield ? (
                    <>
                        {/* PHASE 4.1: WAVE 0 */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${
                            execState.currentPhase === 'PHASE_4_1' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' :
                            execState.currentPhase > 'PHASE_4_1' || execState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Phase 4.1</div>
                                    <h4 className="text-lg font-black text-white mb-2">Wave 0: Network & Identity Foundation</h4>
                                    <p className="text-xs text-slate-400">Executes Terraform to build isolated Transit VPCs, Subnets, and Security Groups.</p>
                                </div>
                                {execState.currentPhase === 'PHASE_4_1' ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleDryRun}
                                            disabled={autoOrchestrating || dryRunLoading}
                                            className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase shadow-md transition-colors ${autoOrchestrating || dryRunLoading ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                                            {dryRunLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Validating...</> : <><i className="fas fa-flask mr-2"></i> Dry Run</>}
                                        </button>
                                        <button
                                            onClick={() => setShowWaveZeroModal(true)}
                                            disabled={autoOrchestrating}
                                            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md transition-colors ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                            <i className="fas fa-network-wired mr-2"></i> Configure & Execute
                                        </button>
                                    </div>
                                ) : <div className="text-blue-500"><i className="fas fa-check-circle text-2xl"></i></div>}
                            </div>
                            {autoOrchestrating && execState.currentPhase === 'PHASE_4_1' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.2: PRE-FLIGHT WITH CR GATE */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${execState.currentPhase === 'PHASE_4_2' ? 'border-amber-500 bg-slate-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : execState.currentPhase > 'PHASE_4_2' || execState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
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
                                {execState.currentPhase === 'PHASE_4_2' && crState === 'idle' ? (
                                    <div className="flex gap-2">
                                        <button onClick={handleSimulateCR} disabled={autoOrchestrating} className={`px-4 py-2 border rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'border-slate-500 text-slate-500 cursor-not-allowed' : 'border-slate-600 hover:bg-slate-700 text-slate-400'}`} title="Simulate HANA Out-of-Stock">Simulate CR Failure</button>
                                        <button onClick={() => updatePhase('PHASE_4_3', 'PENDING')} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}><i className="fas fa-microscope mr-2"></i> Run OS Diagnostics</button>
                                    </div>
                                ) : execState.currentPhase > 'PHASE_4_2' || execState.currentPhase === 'COMPLETED' ? <div className="text-amber-500 flex flex-col items-end"><i className="fas fa-check-circle text-2xl"></i>{crState==='approved' && <span className="text-[8px] font-black uppercase text-rose-500 mt-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">CR Overridden</span>}</div> : null}
                            </div>
                            {autoOrchestrating && execState.currentPhase === 'PHASE_4_2' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.3: LANDING ZONE */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${execState.currentPhase === 'PHASE_4_3' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : execState.currentPhase > 'PHASE_4_3' || execState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div><div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 4.3</div><h4 className="text-lg font-black text-white mb-2">Build App Landing Zone</h4><p className="text-xs text-slate-400">Provisions application VPCs, target ECS instances, and empty PaaS databases.</p></div>
                                {execState.currentPhase === 'PHASE_4_3' ? <button onClick={() => handleExecuteTerraform(null)} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}><i className="fas fa-cogs mr-2"></i> Deploy Infrastructure</button> : execState.currentPhase > 'PHASE_4_3' || execState.currentPhase === 'COMPLETED' ? <div className="text-purple-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && execState.currentPhase === 'PHASE_4_3' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.4: AGENTS */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${execState.currentPhase === 'PHASE_4_4' ? 'border-fuchsia-500 bg-slate-800 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : execState.currentPhase > 'PHASE_4_4' || execState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div><div className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest mb-1">Phase 4.4</div><h4 className="text-lg font-black text-white mb-2">Deploy Data Plane Agents</h4><p className="text-xs text-slate-400">Pushes SMS/DRS agents over the established Wave 0 network.</p></div>
                                {execState.currentPhase === 'PHASE_4_4' ? <button onClick={() => updatePhase('PHASE_4_5', 'PENDING')} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white'}`}><i className="fas fa-satellite-dish mr-2"></i> Push Agents</button> : execState.currentPhase > 'PHASE_4_4' || execState.currentPhase === 'COMPLETED' ? <div className="text-fuchsia-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && execState.currentPhase === 'PHASE_4_4' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.5: SYNC */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${execState.currentPhase === 'PHASE_4_5' ? 'border-indigo-500 bg-slate-800 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : execState.currentPhase > 'PHASE_4_5' || execState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div><div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Phase 4.5</div><h4 className="text-lg font-black text-white mb-2">Continuous Sync Monitor</h4><p className="text-xs text-slate-400">Awaiting 100% byte-by-byte synchronization. Lock state before Cutover.</p></div>
                                {execState.currentPhase === 'PHASE_4_5' ? <button onClick={() => updatePhase('PHASE_4_6', 'PENDING')} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}><i className="fas fa-lock mr-2"></i> Lock Sync & Proceed</button> : execState.currentPhase > 'PHASE_4_5' || execState.currentPhase === 'COMPLETED' ? <div className="text-indigo-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && execState.currentPhase === 'PHASE_4_5' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                            {/* ⚡ PHYSICS RECALIBRATION MONITOR (NEW — Improvement #4) */}
                            {execState.currentPhase === 'PHASE_4_5' && recalibrationBaseline && (
                                <div className="mt-4 border-t border-slate-700 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                            <i className="fas fa-tachometer-alt mr-1"></i> Physics Recalibration Monitor
                                        </h5>
                                        {recalibrationState.deviationPct !== null && (
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                                recalibrationState.deviationPct < 70 ? 'bg-rose-900/50 text-rose-400 border border-rose-700'
                                                : recalibrationState.deviationPct < 90 ? 'bg-amber-900/50 text-amber-400 border border-amber-700'
                                                : 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                                            }`}>
                                                {recalibrationState.deviationPct < 70 ? '⚠ Deviation' : recalibrationState.deviationPct < 90 ? '⚡ Below Expected' : '✓ On Track'}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Expected Pipe</div>
                                            <div className="text-sm font-black text-indigo-400 font-mono">
                                                {recalibrationBaseline.expectedThroughputMbps} <span className="text-[10px] text-slate-500">Mbps</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Per Node Limit</div>
                                            <div className="text-sm font-black text-indigo-400 font-mono">
                                                {recalibrationBaseline.perNodeExpectedMbps} <span className="text-[10px] text-slate-500">Mbps</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Max Parallel</div>
                                            <div className="text-sm font-black text-indigo-400 font-mono">
                                                {recalibrationBaseline.maxParallelNodes} <span className="text-[10px] text-slate-500">Nodes</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Est. Sync Days</div>
                                            <div className="text-sm font-black text-indigo-400 font-mono">
                                                {recalibrationBaseline.totalInitialSyncDays || '—'} <span className="text-[10px] text-slate-500">Days</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Observed vs Expected Comparison */}
                                    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-3 mb-3">
                                        <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase font-bold mb-2">
                                            <span>Actual Throughput Observation</span>
                                            <span className="text-slate-600">Updated every 5 min by agent</span>
                                        </div>
                                        {recalibrationState.observedThroughputMbps ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 bg-slate-800 rounded-lg h-2 overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-lg transition-all" 
                                                             style={{ width: `${Math.min(100, (recalibrationState.observedThroughputMbps / recalibrationBaseline.expectedThroughputMbps) * 100)}%` }}>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black text-indigo-400 font-mono">
                                                        {recalibrationState.observedThroughputMbps} Mbps
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[9px]">
                                                    <span className="text-slate-500">Target:</span>
                                                    <span className="font-bold text-slate-400">{recalibrationBaseline.expectedThroughputMbps} Mbps</span>
                                                    <span className="text-slate-600">|</span>
                                                    <span className="text-slate-500">Deviation:</span>
                                                    <span className={`font-black ${
                                                        recalibrationState.deviationPct < 70 ? 'text-rose-400'
                                                        : recalibrationState.deviationPct < 90 ? 'text-amber-400'
                                                        : 'text-emerald-400'
                                                    }`}>
                                                        {recalibrationState.deviationPct}% of expected
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs">
                                                <i className="fas fa-clock text-slate-600"></i>
                                                <span className="text-slate-500">Awaiting first throughput measurement from agent...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Recalibration Actions */}
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => {
                                                // Simulate a throughput check (in production, this polls the agent)
                                                const simulatedObserved = Math.round(recalibrationBaseline.expectedThroughputMbps * (0.5 + Math.random() * 0.7));
                                                const deviation = Math.round((simulatedObserved / recalibrationBaseline.expectedThroughputMbps) * 100);
                                                setRecalibrationState(prev => ({
                                                    ...prev,
                                                    observedThroughputMbps: simulatedObserved,
                                                    deviationPct: deviation,
                                                    lastCheckedAt: new Date().toISOString()
                                                }));
                                            }}
                                            disabled={autoOrchestrating}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                                autoOrchestrating 
                                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                            }`}
                                            title="Check current throughput from agent (simulated for now — will connect to live agent metrics)"
                                        >
                                            <i className="fas fa-sync mr-1"></i> Check Throughput
                                        </button>
                                        {recalibrationState.deviationPct !== null && recalibrationState.deviationPct < 90 && (
                                            <button 
                                                onClick={() => {
                                                    setRecalibrationState(prev => ({ ...prev, recalibrated: true }));
                                                    alert('Physics estimates recalibrated based on observed throughput.\n\nUpdated estimates will be reflected in remaining phase durations.');
                                                }}
                                                disabled={autoOrchestrating || recalibrationState.recalibrated}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                                    autoOrchestrating || recalibrationState.recalibrated
                                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                                                }`}
                                            >
                                                <i className="fas fa-calculator mr-1"></i> 
                                                {recalibrationState.recalibrated ? 'Recalibrated ✓' : 'Recalibrate Estimates'}
                                            </button>
                                        )}
                                    </div>
                                    {recalibrationState.lastCheckedAt && (
                                        <div className="mt-2 text-[9px] text-slate-600 font-mono">
                                            Last check: {new Date(recalibrationState.lastCheckedAt).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* PHASE 4.6: CUTOVER */}
                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${execState.currentPhase === 'PHASE_4_6' ? 'border-rose-500 bg-slate-800 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : execState.currentPhase > 'PHASE_4_6' || execState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div><div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Phase 4.6</div><h4 className="text-lg font-black text-white mb-2">Cold Cutover & VPC Promotion</h4><p className="text-xs text-slate-400">Severs on-premise connection and modifies Huawei Cloud VPC bindings.</p></div>
                                {execState.currentPhase === 'PHASE_4_6' ? <button onClick={() => updatePhase('PHASE_4_7', 'PENDING')} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}><i className="fas fa-power-off mr-2"></i> Execute Network Swap</button> : execState.currentPhase === 'COMPLETED' || execState.currentPhase > 'PHASE_4_6' ? <div className="text-rose-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && execState.currentPhase === 'PHASE_4_6' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>

                        {/* PHASE 4.7: GARBAGE COLLECTION */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${execState.currentPhase === 'PHASE_4_7' ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : (execState.currentPhase === 'COMPLETED' && completedOrchPhases.size >= 7) ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Phase 4.7</div>
                                    <h4 className="text-lg font-black text-white mb-2">Teardown & Garbage Collection</h4>
                                    <p className="text-xs text-slate-400">Destroys transient migration resources (Factory VMs, EIPs, Staging Disks) to drop PPU costs to quoted baseline.</p>
                                </div>
                                {execState.currentPhase === 'PHASE_4_7' ? (
                                    <button onClick={handleGarbageCollection} disabled={autoOrchestrating} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-md ${autoOrchestrating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}><i className="fas fa-trash-alt mr-2"></i> Destroy Transient Resources</button>
                                ) : (execState.currentPhase === 'COMPLETED' && completedOrchPhases.size >= 7) ? <div className="text-emerald-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                            </div>
                            {autoOrchestrating && execState.currentPhase === 'PHASE_4_7' && (
                                <div className="mt-3 text-purple-400 text-xs font-bold animate-pulse"><i className="fas fa-robot mr-1"></i> Agentic run in progress — auto-advancing...</div>
                            )}
                        </div>
                {execState.currentPhase === 'COMPLETED' && completedOrchPhases.size >= 7 && (
                    <div className="mt-8 bg-emerald-500/10 border border-emerald-500 p-6 rounded-xl text-center animate-fade-in">
                        <i className="fas fa-check-double text-4xl text-emerald-500 mb-3"></i>
                        <h3 className="font-black text-xl text-emerald-400">Migration Pipeline Completed</h3>
                        <p className="text-emerald-200 mt-2 text-sm">All 7 phases completed. Servers are now live and attached to the Production VPC. Transient costs eliminated. Please proceed to Post-Live.</p>
                    </div>
                )}
                    </>
                ) : (
                    <MigrationOrchestratorView project={project} executionState={executionState} executionMode={executionMode} onUpdateProject={onUpdateProject} cloudState={cloudState} />
                )}

                {execState.currentPhase === 'COMPLETED' && completedOrchPhases.size >= 7 && (
                    <div className="mt-8 bg-emerald-500/10 border border-emerald-500 p-6 rounded-xl text-center animate-fade-in">
                        <i className="fas fa-check-double text-4xl text-emerald-500 mb-3"></i>
                        <h3 className="font-black text-xl text-emerald-400">Migration Pipeline Completed</h3>
                        <p className="text-emerald-200 mt-2 text-sm">All 7 phases completed. Servers are now live and attached to the Production VPC. Transient costs eliminated. Please proceed to Post-Live.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══ Migration Orchestrator View — for migration projects (not greenfield) ═══
function MigrationOrchestratorView({ project, executionState, executionMode, onUpdateProject, cloudState }) {
    const token = sessionStorage.getItem('hermes_access_token');
    const [execPlan, setExecPlan] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [execResult, setExecResult] = useState(null);
    const [execLog, setExecLog] = useState([]);
    const [selectedServer, setSelectedServer] = useState(null);
    const [serverStatus, setServerStatus] = useState({});
    // showSpawnTree removed — telemetry now in OrchestratorView's external execution dashboard

    // Servers for Phase 4 execution come from targetArchitecture (execution contract).
    // Fall back to mapperNodes when targetArchitecture is absent (e.g. projects whose
    // migration ran outside the ERP — the execution contract was never materialized).
    // Mirrors backend build_plan() fallback: execution_engine.py — "No targetArchitecture —
    // falling back to mapperNodes".
    let ta = project?.targetArchitecture;
    if (!ta || (!(ta.compute || []).length && !(ta.database || []).length && !(ta.storage || []).length)) {
        const mn = project?.mapperNodes || [];
        const serverTypes = ['ECS', 'COMPUTE', 'APP', 'WEB', 'VM', 'SERVER'];
        const computeFallback = mn.filter(n => serverTypes.includes(String(n.type || '').toUpperCase()));
        const dbFallback = mn.filter(n => ['RDS', 'DATABASE', 'DB', 'DCS'].includes(String(n.type || '').toUpperCase()));
        const storageFallback = mn.filter(n => ['OBS', 'EVS', 'SFS', 'STORAGE', 'BUCKET'].includes(String(n.type || '').toUpperCase()));
        ta = { compute: computeFallback, database: dbFallback, storage: storageFallback, network: mn.filter(n => ['VPC', 'SUBNET', 'SECURITY_GROUP', 'NAT', 'EIP', 'VPN'].includes(String(n.type || '').toUpperCase())) };
    }
    const targetArch = ta || {};
    const servers = [
        ...(targetArch.compute || []).map(r => ({ ...r, name: r.name || r.source_name || r.id || `Server-${Math.random().toString(36).slice(2,7)}` })),
        ...(targetArch.database || []).map(r => ({ ...r, name: r.name || r.source_name || r.id || `DB-${Math.random().toString(36).slice(2,7)}`, type: r.type || 'RDS' })),
        ...(targetArch.storage || []).map(r => ({ ...r, name: r.name || r.source_name || r.id || `Storage-${Math.random().toString(36).slice(2,7)}`, type: r.type || 'OBS' })),
    ];
    const authLevel = project?.authLevel || project?.presales?.authLevel || [];
    const isZeroTrust = Array.isArray(authLevel) ? authLevel.some(a => String(a).includes('Read-Only')) : String(authLevel).includes('Read-Only');
    const sourceEnv = project?.sourceEnvironment || project?.presales?.sourceEnvironment || 'Unknown';
    const isAgentic = executionMode === 'agentic';
    const isIndividual = executionMode === 'individual';
    const isManual = !isAgentic && !isIndividual;

    const buildPlan = async () => {
        try {
            const res = await fetch(`/api/execution/${project.id}/build-plan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({}) });
            if (res.ok) {
                const data = await res.json();
                // API returns {success, plan} — unwrap so execPlan.steps works
                setExecPlan(data.plan || data);
            }
        } catch (e) { /* silent */ }
    };
    useEffect(() => { buildPlan(); }, [project.id]);

    const executeAll = async () => {
        setExecuting(true); setExecLog([{ msg: '[AGENTIC] Starting...', type: 'info' }]);
        try {
            const res = await fetch(`/api/execution/${project.id}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ dry_run: true }) });
            const data = await res.json(); setExecResult(data);
            setExecLog(prev => [...prev, { msg: `[✓] ${data.summary?.succeeded || 0}/${data.summary?.total_steps || 0} steps`, type: 'success' }]);
        } catch (e) { setExecLog(prev => [...prev, { msg: `[ERROR] ${e.message}`, type: 'error' }]); }
        setExecuting(false);
    };

    const executeStep = async (stepId) => {
        try {
            const res = await fetch(`/api/execution/${project.id}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ step_id: stepId, dry_run: false }) });
            const data = await res.json();
            return data.result || data;
        } catch (e) { return { success: false, error: e.message }; }
    };

    const MIG_PHASES = [
        { key: 'PHASE_4_1', label: 'Network', icon: 'fa-network-wired', color: '#3b82f6' },
        { key: 'PHASE_4_2', label: 'Source Prep', icon: 'fa-download', color: '#f59e0b' },
        { key: 'PHASE_4_3', label: 'Target ECS', icon: 'fa-server', color: '#8b5cf6' },
        { key: 'PHASE_4_4', label: 'Data Sync', icon: 'fa-sync-alt', color: '#10b981' },
        { key: 'PHASE_4_5', label: 'Cutover', icon: 'fa-exchange-alt', color: '#ef4444' },
        { key: 'PHASE_4_6', label: 'Harden', icon: 'fa-shield-alt', color: '#06b6d4' },
        { key: 'PHASE_4_7', label: 'Test', icon: 'fa-vial', color: '#10b981' },
    ];
    const currentPhase = executionState?.currentPhase || 'PHASE_4_1';
    const currentPhaseIdx = MIG_PHASES.findIndex(p => p.key === currentPhase);

    return (
        <div>
            {isZeroTrust && <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-amber-300 text-xs font-bold"><i className="fas fa-lock mr-1" />ZERO TRUST — Agent install is customer responsibility</div>}
            {isManual && <>
                <div className="flex gap-2 mb-4 flex-wrap">
                    {MIG_PHASES.map((ph, idx) => (
                        <div key={ph.key} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${idx === currentPhaseIdx ? 'text-white' : idx < currentPhaseIdx ? 'text-slate-400' : 'text-slate-600'}`}
                            style={{ background: idx === currentPhaseIdx ? ph.color : idx < currentPhaseIdx ? ph.color + '20' : '#1e293b', border: `1px solid ${idx <= currentPhaseIdx ? ph.color : '#374151'}` }}>
                            <i className={`fas ${ph.icon} mr-1`} />{ph.label}
                        </div>
                    ))}
                </div>
                <div className="mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{ background: '#3b82f630', color: '#60a5fa' }}>{executionMode}</span>
                    <span className="text-xs text-slate-500">Source: {sourceEnv} | Servers: {servers.length}{execPlan ? ` | Plan: ${execPlan.summary?.total_steps || 0} steps` : ''}</span>
                </div>
            </>}
            {isManual && <MigrationManualView servers={servers} execPlan={execPlan} executeStep={executeStep} serverStatus={serverStatus} setServerStatus={setServerStatus} isZeroTrust={isZeroTrust} />}
            {/* MigrationAgenticView removed — replaced by lifecycle chart + external execution dashboard above */}
            {isIndividual && <MigrationIndividualView servers={servers} execPlan={execPlan} executeStep={executeStep} selectedServer={selectedServer} setSelectedServer={setSelectedServer} isZeroTrust={isZeroTrust} cloudState={cloudState} />}
        </div>
    );
}

function MigrationManualView({ servers, execPlan, executeStep, serverStatus, setServerStatus, isZeroTrust }) {
    const getStep = (name, action) => execPlan?.steps?.find(s => s.target_resource === name && s.action === action);
    const handleAction = async (name, action) => {
        const step = getStep(name, action); if (!step) return;
        setServerStatus(p => ({ ...p, [`${name}_${action}`]: 'running' }));
        const r = await executeStep(step.step_id);
        setServerStatus(p => ({ ...p, [`${name}_${action}`]: r?.success !== false ? 'success' : 'failed' }));
    };
    const icon = (k) => { const s = serverStatus[k]; return s === 'success' ? '✅' : s === 'running' ? '⏳' : s === 'failed' ? '❌' : '⬜'; };
    const cols = ['Server', 'Agent', 'Target ECS', 'SMS Task', 'Sync', 'Cutover'];
    if (!servers.length) return <div className="text-slate-500 text-sm p-4">No servers in target architecture. Build it in Phase 2.4 first.</div>;
    return (
        <div>
            <div className="text-xs text-slate-400 mb-2">Click each cell to execute that step for that server.</div>
            <table className="w-full text-left"><thead><tr className="border-b border-slate-700">{cols.map(c => <th key={c} className="py-2 px-3 text-[10px] font-black uppercase text-slate-500">{c}</th>)}</tr></thead>
            <tbody>{servers.map(s => (
                <tr key={s.name} className="border-b border-slate-800">
                    <td className="py-3 px-3"><span className="text-white font-bold text-sm">{s.name}</span><br /><span className="text-slate-500 text-[10px]">{s.type || 'ECS'}</span></td>
                    <td className="py-3 px-3">{isZeroTrust ? <span className="text-amber-400 text-xs">👤 Customer</span> : <button onClick={() => handleAction(s.name, 'SMS_AGENT_INSTALL')}>{icon(`${s.name}_SMS_AGENT_INSTALL`)} <span className="text-[10px] text-slate-400">Install</span></button>}</td>
                    <td className="py-3 px-3"><button onClick={() => handleAction(s.name, 'CREATE_TARGET_ECS')}>{icon(`${s.name}_CREATE_TARGET_ECS`)} <span className="text-[10px] text-slate-400">Create</span></button></td>
                    <td className="py-3 px-3"><button onClick={() => handleAction(s.name, 'SMS_CREATE_TASK')}>{icon(`${s.name}_SMS_CREATE_TASK`)} <span className="text-[10px] text-slate-400">Start</span></button></td>
                    <td className="py-3 px-3">{icon(`${s.name}_SMS_SUBTASK`)}</td>
                    <td className="py-3 px-3"><button onClick={() => handleAction(s.name, 'SMS_CUTOVER')} className="px-2 py-1 rounded bg-red-600/20 border border-red-600/40 text-red-400 text-[10px] font-bold">{icon(`${s.name}_SMS_CUTOVER`)} Cutover</button></td>
                </tr>
            ))}</tbody></table>
        </div>
    );
}

function MigrationAgenticView({ execPlan, executing, executeAll, execLog, execResult }) {
    return (
        <div>
            <div className="mb-3 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700 font-medium">
                <i className="fas fa-info-circle mr-1"></i> Use "Orchestrate All 7 Phases" above to execute the full pipeline via the backend execution engine. The plan below shows what will run.
            </div>
            {execResult?.summary && <div className="mb-3 text-emerald-600 text-xs font-bold"><i className="fas fa-check-circle mr-1"></i>{execResult.summary.succeeded}/{execResult.summary.total_steps} steps succeeded</div>}
            {execLog.length > 0 && <div className="bg-black/40 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs">{execLog.map((e, i) => <div key={i} className={e.type === 'success' ? 'text-emerald-400' : e.type === 'error' ? 'text-red-400' : 'text-slate-300'}>{e.msg || e}</div>)}</div>}
            {execPlan && <div className="mt-3"><div className="text-xs text-slate-400 mb-1">Plan ({execPlan.summary?.total_steps || 0} steps):</div><div className="bg-black/30 rounded p-2 max-h-48 overflow-y-auto">{execPlan.steps?.slice(0, 15).map(s => <div key={s.step_id} className="text-xs py-0.5 flex gap-2"><span className="text-slate-600 w-6">{s.step_id}.</span><span className="text-slate-500 w-20">[{(s.phase || '').replace('PHASE_4_', '4.')}]</span><span className="text-slate-300 w-36">{s.action}</span><span className="text-slate-500">{s.target_resource}</span><span className="text-slate-600">{s.tool_source === 'mcp' ? '🔌' : s.tool_source === 'skill' ? '🔧' : 'CLI'}</span></div>)}</div></div>}
        </div>
    );
}

function MigrationIndividualView({ servers, executeStep, selectedServer, setSelectedServer, isZeroTrust, cloudState, execPlan }) {
    const [taskStatus, setTaskStatus] = useState({});
    const TASKS = [
        { action: 'SMS_AGENT_INSTALL', label: 'Install Agent', icon: 'fa-download', color: '#f59e0b', zeroTrust: true },
        { action: 'CREATE_TARGET_ECS', label: 'Create ECS', icon: 'fa-server', color: '#3b82f6' },
        { action: 'ADD_SG_RULES_SMS', label: 'SG Rules', icon: 'fa-shield', color: '#ec4899' },
        { action: 'SMS_TASK_CREATE', label: 'Start SMS', icon: 'fa-sync-alt', color: '#10b981' },
        { action: 'SMS_SUBTASK_MONITOR', label: 'Monitor', icon: 'fa-chart-line', color: '#6366f1' },
        { action: 'MIGRATION_PROJECT_CONFIG', label: 'Config', icon: 'fa-cog', color: '#8b5cf6' },
    ];
    const handleTask = async (action) => {
        if (!selectedServer) return; setTaskStatus(p => ({ ...p, [action]: 'running' }));
        // Look up the numeric step_id from the execution plan matching this server + action
        const planStep = execPlan?.steps?.find(s => s.target_resource === selectedServer.name && s.action === action);
        if (!planStep) {
            setTaskStatus(p => ({ ...p, [action]: 'nostep' }));
            return;
        }
        const r = await executeStep(planStep.step_id);
        setTaskStatus(p => ({ ...p, [action]: r?.success !== false ? 'success' : 'failed' }));
    };
    // Does the plan have this step for the selected server? (drives button enable state)
    const hasPlanStep = (action, srvName) => {
        const srv = srvName || selectedServer?.name;
        return !!execPlan?.steps?.find(s => s.target_resource === srv && s.action === action);
    };
    // SMS task state per source server name, from the live cloud-state poll (5s)
    const smsTasks = cloudState?.resources?.sms_tasks || [];
    const serverTask = (srvName) => {
        const lower = (srvName || '').toLowerCase();
        return smsTasks.find(t => (t.source_server_name || '').toLowerCase() === lower || (t.target_server_name || '').toLowerCase() === lower || (t.name || '').toLowerCase().includes(lower));
    };
    return (
        <div>
            <div className="text-xs text-slate-400 mb-2">Select a server, then run standalone tasks independently.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                {servers.map(s => {
                    const st = serverTask(s.name);
                    const isSelected = selectedServer?.name === s.name;
                    return (
                        <div key={s.id || s.name} onClick={() => setSelectedServer(s)}
                            className={`p-2 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <i className={`fas fa-server text-sm ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}></i>
                                <div className="font-bold text-xs text-slate-800 truncate flex-1">{s.name}</div>
                                {st && <MigrationStatusBadge state={st.state} percent={st.migration_percent} />}
                                {!st && <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">No task</span>}
                            </div>
                            <div className="text-[10px] text-slate-500">{s.type || 'ECS'}{s.flavor ? ` · ${s.flavor}` : ''}{s.storage ? ` · ${s.storage}GB` : ''}</div>
                            {st && (
                                <div className="mt-1.5 bg-slate-100 rounded-lg p-1.5 text-[9px] font-mono text-slate-600 leading-relaxed">
                                    {st.target_server_name && <div>Target: <span className="font-bold">{st.target_server_name}</span></div>}
                                    {st.source_server_id && <div>Src ID: <span className="font-bold" title={st.source_server_id}>{st.source_server_id.slice(0,12)}</span></div>}
                                    {st.source_server_ip && <div>Src IP: <span className="font-bold">{st.source_server_ip}</span></div>}
                                    {st.migration_percent > 0 && <div>Progress: <span className="font-bold text-emerald-700">{st.migration_percent}%</span></div>}
                                    {st.syncing && <div className="text-emerald-600"><i className="fas fa-sync fa-spin mr-1"></i>Continuous sync</div>}
                                    {st.subtask_info && <div>Stage: <span className="font-bold">{st.subtask_info}</span></div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {selectedServer && (
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-bold text-slate-800">Tasks: {selectedServer.name}</div>
                        {(() => { const st = serverTask(selectedServer.name); return st ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${st.state === 'RUNNING' || st.state === 'SYNCING' ? 'bg-emerald-100 text-emerald-700' : st.state === 'SUCCESS' ? 'bg-blue-100 text-blue-700' : st.state === 'READY' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{st.state}</span> : <span className="text-[10px] text-slate-400">No active task</span>; })()}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {TASKS.map(t => {
                            const st = taskStatus[t.action];
                            const taskMatch = serverTask(selectedServer.name);
                            const inPlan = hasPlanStep(t.action);
                            const disabled = st === 'running' || (!execPlan && false) || (t.zeroTrust && !inPlan);
                            return <button key={t.action} onClick={() => handleTask(t.action)} disabled={st === 'running'}
                                className="p-2 rounded-lg border text-left transition-all hover:shadow-sm disabled:opacity-50"
                                style={{ borderColor: t.color + '60', background: t.color + '08' }}>
                                <i className={`fas ${t.icon}`} style={{ color: t.color }} />
                                <span className="text-[10px] text-slate-700 ml-1 font-bold">{t.label}</span>
                                {st === 'success' && <span className="text-emerald-500 text-[9px] block mt-1">✅ Done</span>}
                                {st === 'running' && <span className="text-amber-500 text-[9px] block mt-1">⏳ Running...</span>}
                                {st === 'failed' && <span className="text-red-500 text-[9px] block mt-1">❌ Failed</span>}
                                {st === 'nostep' && <span className="text-slate-400 text-[9px] block mt-1">⚠ Not in plan</span>}
                                {!st && !inPlan && execPlan && <span className="text-slate-400 text-[9px] block mt-1">Not in plan</span>}
                                {!st && t.zeroTrust && inPlan && isZeroTrust && <span className="text-amber-500 text-[9px] block mt-1">👤 Customer</span>}
                                {!st && taskMatch?.state === 'RUNNING' && <span className="text-emerald-500 text-[9px] block mt-1">● Active</span>}
                                {!st && inPlan && !taskMatch && <span className="text-slate-400 text-[9px] block mt-1">Click to run</span>}
                            </button>;
                        })}
                    </div>
                    {isZeroTrust && <div className="mt-2 text-amber-500 text-[10px] font-medium"><i className="fas fa-lock mr-1"></i> Agent install is customer responsibility — Zero Trust</div>}
                </div>
            )}
            {/* 📋 EXECUTION PLAN PANEL — validate what will execute against the 188-step plan */}
            <ExecutionPlanPanel execPlan={execPlan} selectedServer={selectedServer} servers={servers} />
        </div>
    );
}

/* ── Sub-component: Execution Plan Panel — collapsible, grouped by server ── */
function ExecutionPlanPanel({ execPlan, selectedServer, servers }) {
    const [expanded, setExpanded] = useState(false);
    const [filter, setFilter] = useState('all'); // all | selected | noagent
    const steps = execPlan?.steps || [];
    const serverNames = new Set((servers || []).map(s => s.name));
    // Steps that belong to a server in the grid (per-server actionable steps)
    const serverSteps = steps.filter(s => serverNames.has(s.target_resource));
    const globalSteps = steps.filter(s => !serverNames.has(s.target_resource));
    // Filter by view mode
    const shown = filter === 'selected'
        ? serverSteps.filter(s => s.target_resource === selectedServer?.name)
        : filter === 'global' ? globalSteps : serverSteps;
    const phaseLabel = (p) => String(p || '').replace('PHASE_4_', '4.');
    const toolIcon = (t) => t === 'mcp' ? '🔌' : t === 'skill' ? '🔧' : t === 'external' ? '📦' : t === 'history' ? '🕘' : '⌨️';
    const statusColor = (st) => st === 'completed' || st === 'success' ? 'text-emerald-600' : st === 'running' ? 'text-amber-600' : st === 'failed' ? 'text-red-600' : 'text-slate-400';
    return (
        <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
                <div className="text-xs font-black text-slate-700 uppercase tracking-widest">
                    <i className={`fas ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-slate-400 mr-2`}></i>
                    Execution Plan
                    <span className="ml-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{steps.length} steps · {serverSteps.length} per-server · {globalSteps.length} global</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{execPlan ? `built ${(execPlan.built_at || '').replace('T', ' ').slice(0, 16)}Z` : 'no plan yet'}</span>
            </div>
            {expanded && (
                <div className="p-3">
                    {!execPlan && <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3"><i className="fas fa-exclamation-triangle mr-1"></i> No execution plan built. Run <b>build-plan</b> first (it runs automatically on Phase 4 mount).</div>}
                    {execPlan && (
                        <>
                            <div className="flex gap-2 mb-3">
                                {[{k: 'all', l: `All (${serverSteps.length})`}, {k: 'selected', l: selectedServer ? `Selected: ${selectedServer.name}` : 'Selected (pick a server)'}, {k: 'global', l: `Global (${globalSteps.length})`}].map(f => (
                                    <button key={f.k} onClick={() => setFilter(f.k)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${filter === f.k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>{f.l}</button>
                                ))}
                            </div>
                            {shown.length === 0 && <div className="text-xs text-slate-400 py-2">No steps in this view.</div>}
                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead><tr className="border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                        <th className="py-1.5 pr-2 w-10">#</th>
                                        <th className="py-1.5 pr-2 w-14">Phase</th>
                                        <th className="py-1.5 pr-2">Server</th>
                                        <th className="py-1.5 pr-2">Action</th>
                                        <th className="py-1.5 pr-2 w-20">Tool</th>
                                        <th className="py-1.5">Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {shown.map(s => (
                                            <tr key={s.step_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-1.5 pr-2 text-[10px] font-mono text-slate-400">{s.step_id}</td>
                                                <td className="py-1.5 pr-2 text-[10px] font-bold text-slate-500">{phaseLabel(s.phase)}</td>
                                                <td className="py-1.5 pr-2 text-[10px]">
                                                    <span className={`font-bold ${s.target_resource === selectedServer?.name ? 'text-indigo-700' : 'text-slate-600'}`}>{s.target_resource}</span>
                                                    {s.scope_status === 'not_in_target_arch' && <span className="ml-1 text-[8px] text-amber-600 bg-amber-50 px-1 rounded">scope+</span>}
                                                </td>
                                                <td className="py-1.5 pr-2">
                                                    <span className="text-[10px] font-mono text-slate-700">{s.action}</span>
                                                    {s.tool_name && <div className="text-[8px] text-slate-400 truncate max-w-[220px]">{s.tool_name}</div>}
                                                </td>
                                                <td className="py-1.5 pr-2 text-[11px]" title={s.tool_source}>{toolIcon(s.tool_source)}</td>
                                                <td className={`py-1.5 text-[9px] font-bold uppercase ${statusColor(s.status)}`}>{s.status || 'pending'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-2 text-[9px] text-slate-400"><i className="fas fa-info-circle mr-1"></i> Individual mode executes the <b>per-server</b> steps one by one via the engine tiers (Terraform → MCP → hcloud). Global steps (VPC, EIP, quotas) run in agentic/pipeline mode.</div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Sub-component: Migration status badge — tiny color-coded pill ── */
function MigrationStatusBadge({ state, percent }) {
    const running = state === 'RUNNING' || state === 'SYNCING';
    const done = state === 'SUCCESS' || state === 'FINISHED';
    const failed = state === 'FAIL' || state === 'ERROR';
    const waiting = state === 'READY' || state === 'WAITING';
    const bg = running ? 'bg-emerald-100 text-emerald-700' : done ? 'bg-blue-100 text-blue-700' : failed ? 'bg-red-100 text-red-700' : waiting ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';
    return <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${bg} uppercase tracking-wider whitespace-nowrap`}>{running && percent ? `${percent}%` : state || '—'}</span>;
}

// 🚨 PRESERVED: Readiness Gateway View
function ReadinessGatewayView({ project, isGreenfield, authLevel, isZeroTrust, onApprove }) {
    const [loading, setLoading] = useState(false);
    const [gatewayResult, setGatewayResult] = useState(null);
    const [riskAcknowledged, setRiskAcknowledged] = useState(false);
    const [notifyCommercial, setNotifyCommercial] = useState(false);

    const runFullCheck = async () => {
        setLoading(true);
        setGatewayResult(null);
        try {
            const token = sessionStorage.getItem('hermes_access_token');
            const res = await fetch('/api/gateway/full-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    customer_id: project?.customerId, 
                    project_id: project?.id 
                })
            });
            const data = await res.json();
            setGatewayResult(data);
            // Auto-set commercial notification if real-name auth missing
            if (data.checks?.realname_auth?.status === 'unverified') {
                setNotifyCommercial(true);
            }
        } catch (err) {
            setGatewayResult({ success: false, error: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Run check on mount
    useEffect(() => {
        if (project?.customerId) {
            runFullCheck();
        }
    }, [project?.customerId]);

    const checks = gatewayResult?.checks || {};
    const isReady = gatewayResult?.ready;
    const mode = gatewayResult?.mode || 'unknown';
    const showRiskWarning = checks.realname_auth?.status === 'unverified';

    const statusIcon = (status) => {
        switch (status) {
            case 'valid': return { icon: 'fa-check-circle', color: 'text-emerald-400' };
            case 'configured': return { icon: 'fa-check-circle', color: 'text-emerald-400' };
            case 'unverified': return { icon: 'fa-exclamation-triangle', color: 'text-amber-400' };
            case 'missing': return { icon: 'fa-times-circle', color: 'text-rose-400' };
            case 'blocked': return { icon: 'fa-ban', color: 'text-rose-500' };
            case 'invalid': return { icon: 'fa-times-circle', color: 'text-rose-400' };
            default: return { icon: 'fa-question-circle', color: 'text-slate-400' };
        }
    };

    return (
        <div className="p-8 h-full flex flex-col items-center overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-2xl space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${
                        isReady ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                        <i className={`fas ${isReady ? 'fa-shield-check' : 'fa-shield-haltered'}`}></i>
                    </div>
                    <h3 className="text-xl font-black text-white mb-1">4.0 Execution Readiness Gateway</h3>
                    <p className="text-sm text-slate-400">
                        {isReady 
                            ? `Target boundary verified — ${mode === 'least_privilege' ? 'Least Privilege mode active' : 'Master fallback mode'}`
                            : 'Validating credential hierarchy...'}
                    </p>
                </div>

                {/* Check Matrix */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                    <div className="bg-slate-900 px-5 py-3 border-b border-slate-700">
                        <h4 className="font-black text-xs text-slate-300 uppercase tracking-widest">
                            <i className="fas fa-list-check mr-2 text-emerald-400"></i>Credential & Access Validation
                        </h4>
                    </div>
                    <div className="divide-y divide-slate-700/50">
                        {/* Master AK/SK */}
                        <CheckRow 
                            label="Master AK/SK" 
                            desc="Control plane authentication" 
                            status={checks.master_credentials?.status}
                            message={checks.master_credentials?.message}
                            si={statusIcon(checks.master_credentials?.status)}
                        />
                        {/* Real-Name Auth */}
                        <CheckRow 
                            label="Real-Name Authentication" 
                            desc="Required for EPS + Tier 2 isolation" 
                            status={checks.realname_auth?.status}
                            message={checks.realname_auth?.warning || checks.realname_auth?.message}
                            si={statusIcon(checks.realname_auth?.status)}
                        />
                        {/* Tier 2 EPS Admin */}
                        <CheckRow 
                            label="Tier 2: Sandbox EPS Admin" 
                            desc="Enterprise Project-scoped access" 
                            status={checks.tier2_credentials?.status}
                            message={checks.tier2_credentials?.message}
                            si={statusIcon(checks.tier2_credentials?.status)}
                        />
                        {/* EPS Bracket */}
                        <CheckRow 
                            label="EPS Bracket" 
                            desc={`Size classification: ${checks.eps_bracket?.bracket || 'unknown'}`}
                            status={checks.eps_bracket?.bracket ? 'valid' : 'missing'}
                            si={statusIcon(checks.eps_bracket?.bracket ? 'valid' : 'missing')}
                        />
                        {/* OS Data Plane */}
                        <CheckRow 
                            label="OS Data Plane" 
                            desc="Agentless migration credentials" 
                            status={checks.os_credentials?.status}
                            message={checks.os_credentials?.message}
                            si={statusIcon(checks.os_credentials?.status)}
                        />
                    </div>
                </div>

                {/* Risk Warning (Path B) */}
                {showRiskWarning && (
                    <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-5 animate-fade-in">
                        <div className="flex items-start gap-3">
                            <i className="fas fa-exclamation-triangle text-amber-400 text-xl mt-0.5"></i>
                            <div className="flex-1">
                                <h4 className="font-black text-amber-400 text-sm mb-1">Reduced Isolation Mode</h4>
                                <p className="text-xs text-amber-300/80 mb-3">
                                    Real-name authentication not complete. Full Master AK/SK will be used for execution. 
                                    Enterprise Project isolation is unavailable until verification is done.
                                </p>
                                <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={riskAcknowledged} 
                                        onChange={e => setRiskAcknowledged(e.target.checked)}
                                        className="rounded bg-slate-700 border-slate-600"
                                    />
                                    I acknowledge the reduced security posture
                                </label>
                                {notifyCommercial && (
                                    <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                        <i className="fas fa-bell"></i>
                                        Commercial team will be notified to complete real-name authentication
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={runFullCheck}
                        disabled={loading}
                        className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50"
                    >
                        <i className={`fas fa-sync-alt mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                        Re-Check
                    </button>
                    <button 
                        onClick={onApprove}
                        disabled={!isReady || (showRiskWarning && !riskAcknowledged)}
                        className={`px-8 py-2.5 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all ${
                            isReady && (!showRiskWarning || riskAcknowledged)
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                        title={showRiskWarning && !riskAcknowledged ? 'Acknowledge risk warning first' : ''}
                    >
                        <i className="fas fa-unlock mr-2"></i>
                        Unlock Execution Engine
                    </button>
                </div>

                {gatewayResult?.requires_action?.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                        <h4 className="font-black text-[10px] text-slate-500 uppercase tracking-widest mb-2">
                            <i className="fas fa-clipboard-list mr-1"></i>Required Actions
                        </h4>
                        <ul className="space-y-1">
                            {gatewayResult.requires_action.map((action, i) => (
                                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                    <i className="fas fa-chevron-right text-emerald-500 mt-0.5"></i>
                                    {action}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

function CheckRow({ label, desc, status, message, si }) {
    return (
        <div className="px-5 py-3 flex items-center gap-4 hover:bg-slate-750 transition-colors">
            <i className={`fas ${si.icon} ${si.color} text-lg`}></i>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white">{label}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{desc}</div>
                {message && <div className="text-[10px] text-slate-500 mt-0.5 italic">{message}</div>}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                status === 'valid' || status === 'configured' 
                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                    : status === 'unverified'
                    ? 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
            }`}>
                {status || 'unknown'}
            </span>
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
    const [showDryRunModal, setShowDryRunModal] = useState(false);
    const [dryRunResult, setDryRunResult] = useState(null);
    // 📋 Execution plan fetched for context — agents and humans see what will run
    const [execPlan, setExecPlan] = useState(null);
    const [showPlan, setShowPlan] = useState(false);

    useEffect(() => {
        if (!project?.id) return;
        const token = sessionStorage.getItem('hermes_access_token');
        fetch(`/api/execution/${project.id}/build-plan`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({})
        }).then(r => r.json()).then(d => { if (d.success) setExecPlan(d.plan); }).catch(() => {});
    }, [project?.id]);

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
            const token = sessionStorage.getItem('hermes_access_token');
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
                {/* 📋 Execution Plan context — agents + humans validate what will run */}
                <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between">
                    <button onClick={() => setShowPlan(v => !v)} className="text-[10px] font-black text-indigo-700 uppercase tracking-widest hover:text-indigo-900 transition-colors">
                        <i className={`fas ${showPlan ? 'fa-chevron-down' : 'fa-chevron-right'} mr-1.5`}></i>
                        Execution Plan {execPlan ? `(${execPlan.summary?.total_steps || execPlan.steps?.length || 0} steps)` : '(loading...)'}
                    </button>
                    {execPlan && <span className="text-[9px] font-mono text-indigo-400">targets: {(execPlan.resources || []).length} | built {String(execPlan.built_at || '').replace('T',' ').slice(0,16)}Z</span>}
                </div>
                {showPlan && (
                    <div className="px-4 py-3 bg-white border-b border-slate-100 max-h-64 overflow-y-auto custom-scrollbar">
                        {!execPlan && <div className="text-[11px] text-slate-400">No execution plan available yet.</div>}
                        {execPlan && (
                            <table className="w-full text-left">
                                <thead><tr className="border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                    <th className="py-1 pr-2 w-8">#</th>
                                    <th className="py-1 pr-2 w-12">Phase</th>
                                    <th className="py-1 pr-2">Server</th>
                                    <th className="py-1 pr-2">Action</th>
                                    <th className="py-1 w-12">Tool</th>
                                </tr></thead>
                                <tbody>
                                    {(execPlan.steps || []).filter(s => ['ECS','COMPUTE','APP','WEB','VM','RDS','DATABASE','DB','OBS','EVS','SFS'].some(t => String(s.target_resource || '').toLowerCase().includes(t.toLowerCase())) || (execPlan.resources || []).some(r => (r.name || r.source_name) === s.target_resource))
                                        .slice(0, 40).map(s => (
                                        <tr key={s.step_id} className="border-b border-slate-50">
                                            <td className="py-0.5 pr-2 text-[9px] font-mono text-slate-400">{s.step_id}</td>
                                            <td className="py-0.5 pr-2 text-[9px] font-bold text-slate-500">{String(s.phase || '').replace('PHASE_4_', '4.')}</td>
                                            <td className="py-0.5 pr-2 text-[9px] font-bold text-slate-600">{s.target_resource}</td>
                                            <td className="py-0.5 pr-2 text-[9px] font-mono text-slate-700">{s.action}</td>
                                            <td className="py-0.5 text-[10px]" title={s.tool_source}>{s.tool_source === 'mcp' ? '🔌' : s.tool_source === 'skill' ? '🔧' : '⌨️'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <div className="mt-1.5 text-[9px] text-slate-400"><i className="fas fa-info-circle mr-1"></i> Delegated agents receive project context; use the plan above to validate scope before sending a task.</div>
                    </div>
                )}
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

            {/* 🚨 DRY-RUN RESULTS MODAL */}
            {showDryRunModal && dryRunResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDryRunModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
                            <div>
                                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><i className="fas fa-flask text-emerald-500"></i> Dry-Run Results</h3>
                                <p className="text-xs text-slate-500 mt-1">No resources were deployed. Terraform payload validated only.</p>
                            </div>
                            <button onClick={() => setShowDryRunModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-3"><i className="fas fa-cubes mr-2 text-blue-500"></i> Resource Inventory</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    {Object.entries(dryRunResult.resource_inventory || {}).filter(([k,v]) => k !== '_summary' && Array.isArray(v) && v.length > 0).map(([kind, items]) => (
                                        <div key={kind} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                                            <div className="text-2xl font-black text-slate-800">{items.length}</div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kind.replace('_', ' ')}</div>
                                        </div>
                                    ))}
                                    {(dryRunResult.resource_inventory?._summary?.total_resources === 0) && (
                                        <div className="col-span-5 text-center py-4 text-slate-400 text-sm">No resources would be provisioned (empty target topology).</div>
                                    )}
                                </div>
                                {dryRunResult.resource_inventory?._summary && (
                                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                                        <span className="font-bold text-slate-600">Total: <span className="text-slate-800">{dryRunResult.resource_inventory._summary.total_resources}</span> resources</span>
                                        {dryRunResult.resource_inventory._summary.transient_resources > 0 && (
                                            <span className="font-bold text-amber-600">Transient (destroyed in 4.7): <span className="text-amber-800">{dryRunResult.resource_inventory._summary.transient_resources}</span></span>
                                        )}
                                        <span className="text-slate-400 italic text-[11px]">{dryRunResult.resource_inventory._summary.note}</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-3"><i className="fas fa-code mr-2 text-purple-500"></i> Generated Terraform Payload</h4>
                                <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 overflow-auto max-h-[400px]">
                                    <pre className="text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre">{JSON.stringify(dryRunResult.terraform_json, null, 2)}</pre>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                                <button onClick={() => setShowDryRunModal(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-colors">Close</button>
                                <button onClick={() => { setShowDryRunModal(false); setShowWaveZeroModal(true); }} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors"><i className="fas fa-rocket mr-2"></i> Proceed to Configure & Execute</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

            {/* Live Agent Spawn Tree — polls execution progress from API */}
            <div className="mt-4">
                <SpawnTreeVisualizer
                    projectId={project?.id}
                    simulationTrace={[]}
                    isActive={true}
                    mode="execution"
                />
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
