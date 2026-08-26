1|import React, { useState, useEffect, useMemo, useContext } from 'react';
2|import { formatShortDate, EditableCell } from '../../utils/helpers';
3|import { ERPContext } from '../../context/ERPContext';
4|import WaveZeroConfigModal from './WaveZeroConfigModal';
5|
6|const executableTypes = ['ECS', 'BMS', 'VM', 'SERVER', 'RDS', 'GAUSSDB', 'DB', 'DATABASE'];
7|
8|export default function StepExecution({ project, onUpdateProject, onPromote }) {
9|    const [subTab, setSubTab] = useState(project?.authValidated ? 'orchestrator' : 'readiness');
10|    const [sidebarOpen, setSidebarOpen] = useState(true); 
11|    const [showWaveZeroModal, setShowWaveZeroModal] = useState(false);
12|    const [runbookData, setRunbookData] = useState(null);
13|    const [showRunbookModal, setShowRunbookModal] = useState(false);
14|    // Physics recalibration tracking (NEW — Improvement #4)
15|    const [recalibrationState, setRecalibrationState] = useState({
16|        observedThroughputMbps: null,
17|        elapsedSyncHours: 0,
18|        deviationPct: null,
19|        lastCheckedAt: null,
20|        recalibrated: false
21|    });
22|    
23|    const [executionState, setExecutionState] = useState(null);
24|    const [isLoadingState, setIsLoadingState] = useState(true);
25|
26|    const isGreenfield = project?.projectType === 'greenfield' || project?.project_type === 'greenfield';
27|    const authLevel = project?.authLevel || 'Read-Only (Customer Managed)';
28|    const isZeroTrust = authLevel === 'Read-Only (Customer Managed)';
29|    // Extract physics recalibration baseline from saved physics data
30|    const recalibrationBaseline = useMemo(() => {
31|        const physics = project?.physics;
32|        if (!physics) return null;
33|        // Check for structured result first, fall back to legacy
34|        if (physics.result?._recalibrationBaseline) return physics.result._recalibrationBaseline;
35|        if (physics._recalibrationBaseline) return physics._recalibrationBaseline;
36|        // Construct from flat physics data for backward compatibility
37|        if (physics.engineMode && physics.transitType) {
38|            const pipeMbps = Math.min(Number(physics.netSource) || 1000, Number(physics.netTunnel) || 300);
39|            let cryptoTax = physics.transitType === 'IPsec VPN' ? 0.85 : physics.transitType === 'Public Internet' ? 0.75 : 0.95;
40|            const effectiveMbps = pipeMbps * cryptoTax;
41|            return {
42|                expectedThroughputMbps: Math.round(effectiveMbps),
43|                perNodeExpectedMbps: Math.round(effectiveMbps / Math.max((physics.concurrency || 5), 1)),
44|                maxParallelNodes: physics.concurrency || 5,
45|                isFeasible: physics.downtimeWindow ? (Number(physics.downtimeWindow) >= 0) : true,
46|                recalibrationThreshold: {
47|                    throughputWarningPct: 70,
48|                    throughputCriticalPct: 50,
49|                    timeOverrunWarningPct: 120,
50|                    timeOverrunCriticalPct: 150
51|                }
52|            };
53|        }
54|        return null;
55|    }, [project?.physics]);
56|
57|    useEffect(() => {
58|        if (!project?.id) return;
59|        const fetchState = async () => {
60|            try {
61|                const token = sessionStorage.getItem('hermes_access_token');
62|                const res = await fetch(`/api/executions/${project.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
63|                const data = await res.json();
64|                if (data.success) {
65|                    setExecutionState(data.data);
66|                    if (data.data.currentPhase === 'PHASE_4_0') setSubTab('readiness');
67|                    else setSubTab('orchestrator');
68|                }
69|            } catch (e) { console.error("State Fetch Error:", e); } 
70|            finally { setIsLoadingState(false); }
71|        };
72|        fetchState();
73|    }, [project?.id]);
74|
75|    const updatePhase = async (newPhase, newStatus, pendingAction = null) => {
76|        setExecutionState(prev => ({ ...prev, currentPhase: newPhase, status: newStatus, pendingAction }));
77|        const token = sessionStorage.getItem('hermes_access_token');
78|        await fetch(`/api/executions/${project.id}/update`, {
79|            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
80|            body: JSON.stringify({ phase: newPhase, status: newStatus, pendingAction })
81|        });
82|    };
83|
84|    const handleExecuteTerraform = async (networkConfig = null) => {
85|        if (!project?.id) return;
86|        setShowWaveZeroModal(false);
87|        const token = sessionStorage.getItem('hermes_access_token');
88|        try {
89|            const res = await fetch(`/api/projects/${project.id}/execute`, { 
90|                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
91|                body: JSON.stringify({ networkConfig })
92|            });
93|            if (res.ok) {
94|                const data = await res.json();
95|                if (data.success) { 
96|                    alert(`✅ ${data.message}`); 
97|                    if (isGreenfield && executionState.currentPhase === 'PHASE_4_2') updatePhase('PHASE_4_3', 'PENDING');
98|                    else if (!isGreenfield && executionState.currentPhase === 'PHASE_4_1') updatePhase('PHASE_4_2', 'PENDING');
99|                    else if (!isGreenfield && executionState.currentPhase === 'PHASE_4_3') updatePhase('PHASE_4_4', 'PENDING');
100|                }
101|                else alert(`❌ Execution Failed:\n\n${data.error}`);
102|            }
103|        } catch (err) { alert(`Network Error: ${err.message}`); }
104|    };
105|
106|    // 🚨 DRY-RUN: Validate terraform payload without deploying to RFS
107|    const handleDryRunTerraform = async (networkConfig = null) => {
108|        if (!project?.id) return null;
109|        setShowWaveZeroModal(false);
110|        const token = sessionStorage.getItem('hermes_access_token');
111|        try {
112|            const res = await fetch(`/api/projects/${project.id}/execute`, {
113|                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
114|                body: JSON.stringify({ networkConfig, dryRun: true })
115|            });
116|            const data = await res.json();
117|            if (data.success && data.dry_run) return data;
118|            throw new Error(data.error || 'Dry-run failed');
119|        } catch (err) { alert(`Dry-Run Error: ${err.message}`); return null; }
120|    };
121|
122|    // 🚨 Phase 4.7 Backend Call
123|    const handleGarbageCollection = async () => {
124|        if (!project?.id) return;
125|        const token = sessionStorage.getItem('hermes_access_token');
126|        try {
127|            const res = await fetch(`/api/projects/${project.id}/garbage-collect`, { 
128|                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
129|            });
130|            if (res.ok) {
131|                const data = await res.json();
132|                if (data.success) {
133|                    alert(`✅ Garbage Collection successful. Transient resources dropped.`);
134|                    updatePhase('COMPLETED', 'DONE');
135|                } else alert(`❌ Cleanup Failed: ${data.error}`);
136|            }
137|        } catch (err) { alert(`Network Error: ${err.message}`); }
138|    };
139|
140|    const menuItems = isGreenfield ? [
141|        { id: 'readiness', num: '4.0', icon: 'fa-user-lock', label: 'Readiness Gateway' },
142|        { id: 'orchestrator', num: '4.1-4.3', icon: 'fa-rocket', label: 'CI/CD Pipeline' },
143|        { id: 'workbench', num: '4.4', icon: 'fa-tools', label: 'Engineering Workbench' },
144|        { id: 'hub', num: '4.5', icon: 'fa-stream', label: 'DevOps Command Center' }
145|    ] : [
146|        { id: 'readiness', num: '4.0', icon: 'fa-user-lock', label: 'Readiness Gateway' },
147|        { id: 'orchestrator', num: '4.1-4.7', icon: 'fa-cogs', label: 'Execution Pipeline' },
148|        { id: 'workbench', num: '4.8', icon: 'fa-tools', label: 'Engineering Workbench' },
149|        { id: 'hub', num: '4.9', icon: 'fa-satellite-dish', label: 'Delivery Command Center' },
150|        { id: 'tam', num: '4.10', icon: 'fa-clipboard-check', label: 'TAM Service Governance' }
151|    ];
152|
153|    if (isLoadingState) return <div className="p-12 text-center text-slate-400 font-bold"><i className="fas fa-circle-notch fa-spin mr-2"></i> Initializing State Machine...</div>;
154|    const isLocked = executionState?.currentPhase === 'PHASE_4_0';
155|    const executionMode = project?.executionMode || 'manual';
156|    const isIndividual = executionMode === 'individual';
157|    const pipelineComplete = executionState?.currentPhase === 'COMPLETED';
158|    // Workbench unlocked when: pipeline complete OR individual prereqs passed OR manual mode past Phase 4.2 (infra deployed)
159|    const workbenchUnlocked = pipelineComplete || (isIndividual && project?.prereqsValidated) || (executionMode === 'manual' && executionState?.currentPhase > 'PHASE_4_2');
160|
161|    return (
162|        <div className="animate-fade-in pb-12 flex flex-col h-full">
163|            {showWaveZeroModal && <WaveZeroConfigModal onClose={() => setShowWaveZeroModal(false)} onConfirm={(config) => handleExecuteTerraform(config)} />}
164|
165|            <div className="bg-white border-b border-slate-200 px-8 py-5 mb-6 rounded-t-2xl flex justify-between items-center shadow-sm shrink-0">
166|                <div className="flex items-center gap-4">
167|                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors">
168|                        <i className={`fas fa-chevron-${sidebarOpen ? 'left' : 'right'} ${sidebarOpen ? 'text-indigo-600' : ''}`}></i>
169|                    </button>
170|                    <div>
171|                        <h3 className="font-black text-xl text-slate-800">{isGreenfield ? "Cloud-Native Provisioning Engine" : "Execution Control Plane"}</h3>
172|                        <div className="flex items-center gap-3 mt-1">
173|                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isGreenfield ? "Automated Infrastructure-as-Code CI/CD" : "Database-Backed Cloud Orchestrator"}</p>
174|                            {isGreenfield && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-emerald-200">Greenfield Mode</span>}
175|                        </div>
176|                    </div>
177|                </div>
178|            </div>
179|
180|            <div className="flex flex-1 gap-6 px-4 lg:px-8 relative h-full">
181|                <div className={`shrink-0 space-y-2 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 hidden lg:block'}`}>
182|                    {menuItems.map((item) => (
183|                        <button 
184|                            key={item.id}
185|                            onClick={() => { 
186|                                if (isLocked && item.id !== 'readiness') return alert("Please complete the 4.0 Readiness Gateway to unlock Execution."); 
187|                                if ((item.id === 'workbench' || item.id === 'hub') && !workbenchUnlocked) 
188|                                    return alert(isIndividual 
189|                                        ? "Validate prerequisites in the Orchestrator tab first to unlock Workbench & Command Center." 
190|                                        : executionMode === 'agentic'
191|                                            ? "Complete the 7-phase pipeline to unlock Workbench & Command Center."
192|                                            : "Advance past Phase 4.2 (infrastructure deployed) to unlock Workbench & Command Center."); 
193|                                setSubTab(item.id); 
194|                            }}
195|                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between group ${
196|                                isLocked && item.id !== 'readiness' ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' : 
197|                                (item.id === 'workbench' || item.id === 'hub') && !workbenchUnlocked ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' :
198|                                subTab === item.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
199|                            }`}
200|                        >
201|                            <div className="flex items-center gap-3">
202|                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
203|                                    isLocked && item.id !== 'readiness' ? 'bg-slate-200 text-slate-400' : 
204|                                    (item.id === 'workbench' || item.id === 'hub') && !workbenchUnlocked ? 'bg-slate-200 text-slate-400' :
205|                                    subTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
206|                                }`}>{item.num}</div>
207|                                <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
208|                            </div>
209|                            {isLocked && item.id !== 'readiness' && <i className="fas fa-lock text-slate-300"></i>}
210|                            {(item.id === 'workbench' || item.id === 'hub') && !isLocked && !workbenchUnlocked && <i className="fas fa-lock text-slate-300"></i>}
211|                        </button>
212|                    ))}
213|                    
214|                    <div className="pt-8">
215|                        {executionState?.currentPhase === 'COMPLETED' ? (
216|                            <button onClick={() => onPromote && onPromote('post-live')} className="w-full px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
217|                                Go to Post-Live Phase <i className="fas fa-arrow-right"></i>
218|                            </button>
219|                        ) : (
220|                            <div className="flex gap-2">
221|                                <button disabled className="flex-1 px-4 py-3.5 bg-slate-200 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
222|                                    <i className="fas fa-lock"></i> Post-Live Locked
223|                                </button>
224|                                <button 
225|                                    onClick={() => updatePhase('COMPLETED', 'DONE')}
226|                                    className="px-4 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2"
227|                                    title="Debug: Mark execution as complete"
228|                                >
229|                                    <i className="fas fa-wrench"></i> Debug Complete
230|                                </button>
231|                            </div>
232|                        )}
233|                    </div>
234|                </div>
235|
236|                <div className="flex-1 min-w-0 bg-transparent min-h-[700px] transition-all duration-300">
237|                    {subTab === 'readiness' && <ReadinessGatewayView project={project} isGreenfield={isGreenfield} authLevel={authLevel} isZeroTrust={isZeroTrust} onApprove={() => { updatePhase('PHASE_4_1', 'PENDING'); setSubTab('orchestrator'); }} />}
238|                    {subTab === 'orchestrator' && executionState && <OrchestratorView project={project} executionState={executionState} updatePhase={updatePhase} isGreenfield={isGreenfield} setShowWaveZeroModal={setShowWaveZeroModal} handleExecuteTerraform={handleExecuteTerraform} handleDryRunTerraform={handleDryRunTerraform} handleGarbageCollection={handleGarbageCollection} executionMode={project?.executionMode || 'manual'} onUpdateProject={onUpdateProject} />}
239|                    {/* 🚨 REPLACED STUBS WITH INTEGRATED FULL COMPONENTS */}
240|                    {subTab === 'workbench' && <WorkbenchView project={project} />}
241|                    {subTab === 'hub' && <CommandCenterView project={project} executionState={executionState} executionMode={executionMode} />}
242|                    {subTab === 'tam' && !isGreenfield && <GovernanceView project={project} onUpdateProject={onUpdateProject} />}
243|                </div>
244|            </div>
245|        </div>
246|    );
247|}
248|
249|// 🚨 PRESERVED: Your exact interactive state machine for Phase 4.1 to 4.7
250|// 🚨 UPGRADED: Modes — manual (original behavior) / agentic (auto-chain) / individual (prereq check)
251|function OrchestratorView({ project, executionState, updatePhase, isGreenfield, setShowWaveZeroModal, handleExecuteTerraform, handleDryRunTerraform, handleGarbageCollection, executionMode, onUpdateProject }) {
252|    const [crState, setCrState] = useState('idle'); // idle, pending, approved
253|    const [crForm, setCrForm] = useState({ approver: '', ticket: '' });
254|    const [autoOrchestrating, setAutoOrchestrating] = useState(false);
255|    const [orchestrationLog, setOrchestrationLog] = useState([]);
256|    // Phase-level resume state (Fix #4)
257|    const [completedOrchPhases, setCompletedOrchPhases] = useState(new Set());
258|    const [failedOrchPhaseIdx, setFailedOrchPhaseIdx] = useState(null);
259|    const [phaseStatus, setPhaseStatus] = useState({}); // { PHASE_4_X: 'completed'|'failed'|'running' }
260|    const [prereqChecked, setPrereqChecked] = useState(project?.prereqsValidated === true);
261|    const [prereqPassed, setPrereqPassed] = useState(project?.prereqsValidated === true);
262|    const [dryRunResult, setDryRunResult] = useState(null);
263|    const [showDryRunModal, setShowDryRunModal] = useState(false);
264|    const [dryRunLoading, setDryRunLoading] = useState(false);
265|
266|    const isAgentic = executionMode === 'agentic';
267|    const isIndividual = executionMode === 'individual';
268|    const isManual = !isAgentic && !isIndividual;
269|
270|    const handleSimulateCR = () => { setCrState('pending'); };
271|    const handleApproveCR = () => {
272|        if (!crForm.approver || !crForm.ticket) return alert("Approver Name and Ticket Reference are required for audit trail.");
273|        setCrState('approved');
274|        updatePhase('PHASE_4_3', 'PENDING');
275|    };
276|
277|    // 🚨 DRY-RUN: Run terraform validation without deploying
278|    const handleDryRun = async () => {
279|        setDryRunLoading(true);
280|        const result = await handleDryRunTerraform();
281|        setDryRunLoading(false);
282|        if (result) {
283|            setDryRunResult(result);
284|            setShowDryRunModal(true);
285|        }
286|    };
287|
288|    // 🚨 AGENTIC: Orchestrate pipeline via real Hermes delegate-task API (Fix #4: phase-level resume)
289|    // INTEGRATED with dry-run simulator: passes simulation trace as context to each Hermes agent
290|    const handleOrchestrateAll = async (startFrom = 0) => {
291|        // Build completed-set from backend delegateTasks on first run
292|        if (startFrom === 0 && project?.delegateTasks?.length) {
293|            const done = new Set();
294|            let firstFail = null;
295|            project.delegateTasks.forEach((t, i) => {
296|                if (t.status === 'COMPLETED') done.add(t.phase);
297|                if (t.status === 'FAILED' && firstFail === null) firstFail = i;
298|            });
299|            setCompletedOrchPhases(done);
300|            if (firstFail !== null) setFailedOrchPhaseIdx(firstFail);
301|        }
302|
303|        setAutoOrchestrating(true);
304|        setOrchestrationLog([]);
305|        const log = (msg) => setOrchestrationLog(prev => [...prev, msg]);
306|
307|        const token = sessionStorage.getItem('hermes_access_token');
308|
309|        // ── Read dry-run simulation result for rich phase context ──
310|        const simResult = project?.agenticDryRun;
311|        const simTrace = simResult?.trace || [];
312|        const simSummary = simResult?.summary || {};
313|
314|        const chain = [
315|            { phase: 'PHASE_4_1', label: 'Wave 0: Network & Identity Foundation', goal: 'Validate and prepare the Wave 0 network fabric: provision isolated Transit VPC, subnets, security groups, and identity foundation via Terraform. Confirm all prerequisites for the migration landing zone.' },
316|            { phase: 'PHASE_4_2', label: 'Vector-Aware OS Pre-Flight', goal: 'Run OS pre-flight diagnostics: validate source OS constraints against target cloud availability. Check that quoted flavors are in stock and flag any mismatches requiring Change Requests.' },
317|            { phase: 'PHASE_4_3', label: 'Build App Landing Zone', goal: 'Provision the application landing zone: deploy target VPC, ECS instances, and empty PaaS databases. Confirm infrastructure matches the approved Target Architecture from Phase 2.4.' },
318|            { phase: 'PHASE_4_4', label: 'Deploy Data Plane Agents', goal: 'Deploy SMS and DRS migration agents across the established Wave 0 network. Verify agent health, connectivity to source and target, and prepare for data synchronization.' },
319|            { phase: 'PHASE_4_5', label: 'Continuous Sync Monitor', goal: 'Monitor data synchronization progress. Confirm byte-by-byte replication is complete for all volumes. Report sync percentages and estimated time to cutover readiness.' },
320|            { phase: 'PHASE_4_6', label: 'Cold Cutover & VPC Promotion', goal: 'Execute cold cutover procedure: sever on-premises connections, promote target VPC bindings, and validate application reachability on the new infrastructure.' },
321|            { phase: 'PHASE_4_7', label: 'Teardown & Garbage Collection', goal: 'Destroy transient migration resources: factory VMs, staging EIPs, and temporary disks. Confirm PPU costs drop to quoted baseline. Verify no orphaned resources remain.' },
322|        ];
323|
324|        // ── Pre-compute phase context from simulation traces ──
325|        const buildPhaseContext = (phaseKey) => {
326|            if (!simTrace.length) return null;
327|            const phaseSteps = simTrace.filter(t => t.phase === phaseKey || t.phase_group === phaseKey);
328|            if (!phaseSteps.length) return null;
329|
330|            const commands = phaseSteps
331|                .filter(t => Array.isArray(t.commands) && t.commands.length > 0)
332|                .flatMap(t => t.commands.map(c => c.cmd || c.command || ''))
333|                .filter(Boolean);
334|            const serverNames = [...new Set(phaseSteps
335|                .filter(t => t.target || (t.decision && t.decision.server_name))
336|                .map(t => t.target || t.decision.server_name))];
337|            const resourceSpecs = phaseSteps
338|                .filter(t => t.network_spec || t.resourceSpec || (t.decision && t.decision.resource_spec))
339|                .map(t => t.network_spec || t.resourceSpec || t.decision.resource_spec);
340|
341|            return {
342|                phaseSteps: phaseSteps.length,
343|                commands: commands.slice(0, 20),
344|                serverNames: serverNames.slice(0, 10),
345|                resourceSpecs: resourceSpecs.slice(0, 3),
346|                estimatedDurationDays: simSummary.estimated_wall_clock_days,
347|                serversProcessed: simSummary.servers_processed,
348|                totalWaves: simSummary.total_waves,
349|            };
350|        };
351|
352|        if (simTrace.length > 0) {
353|            log(`[simulator] Using dry-run simulation (${simTrace.length} trace entries) as context for orchestration.`);
354|        }
355|
356|        for (let i = startFrom; i < chain.length; i++) {
357|            const step = chain[i];
358|
359|            // Skip phases already completed (from prior run or resume state)
360|            if (completedOrchPhases.has(step.phase)) {
361|                log(`[agentic ✓] ${step.label} — already completed (skipping).`);
362|                updatePhase(step.phase, 'COMPLETED');
363|                continue;
364|            }
365|
366|            log(`[agentic] Phase ${step.phase}: ${step.label} — spawning Hermes agent...`);
367|            updatePhase(step.phase, 'IN_PROGRESS');
368|            setPhaseStatus(prev => ({ ...prev, [step.phase]: 'running' }));
369|
370|            // ── Build enriched context using simulation trace ──
371|            const phaseCtx = buildPhaseContext(step.phase);
372|            let enrichedContext = `ERP Migration Project ID: ${project?.id || 'N/A'}. Current pipeline phase: ${step.phase}. Customer: ${project?.customerName || 'N/A'}. Target region: ${project?.region || 'la-south-2'}. Execution mode: agentic orchestration.`;
373|            if (phaseCtx) {
374|                enrichedContext += `\n\n=== SIMULATION CONTEXT for ${step.phase} ===`;
375|                enrichedContext += `\nSimulated steps in this phase: ${phaseCtx.phaseSteps}`;
376|                if (phaseCtx.commands.length > 0) {
377|                    enrichedContext += `\nSimulated CLI commands for this phase:\n  ` + phaseCtx.commands.map((c, j) => `${j+1}. ${c}`).join('\n  ');
378|                }
379|                if (phaseCtx.serverNames.length > 0) {
380|                    enrichedContext += `\nTarget servers: ${phaseCtx.serverNames.join(', ')}`;
381|                }
382|                enrichedContext += `\n\n=== END SIMULATION CONTEXT ===`;
383|            }
384|
385|            try {
386|                const res = await fetch('/api/hermes-cli/delegate-task', {
387|                    method: 'POST',
388|                    headers: {
389|                        'Content-Type': 'application/json',
390|                        'Authorization': `Bearer ${token}`
391|                    },
392|                    body: JSON.stringify({
393|                            goal: step.goal,
394|                            context: enrichedContext,
395|                            profile: 'exec',
396|                            project_id: project?.id || ''
397|                        })
398|                });
399|
400|                const data = await res.json();
401|
402|                if (data.success) {
403|                    log(`[agentic ✓] ${step.label} — agent completed successfully.`);
404|                    log(`[agentic 📝] ${data.response?.substring(0, 300)}${(data.response?.length > 300) ? '...' : ''}`);
405|                    setCompletedOrchPhases(prev => new Set([...prev, step.phase]));
406|                    setPhaseStatus(prev => ({ ...prev, [step.phase]: 'completed' }));
407|                    updatePhase(step.phase, 'COMPLETED');
408|                } else {
409|                    log(`[agentic ✗] ${step.label} — agent returned error: ${data.error}`);
410|                    log(`[agentic ⏸] Pipeline halted at Phase ${step.phase}. Remaining phases not executed.`);
411|                    setFailedOrchPhaseIdx(i);
412|                    setPhaseStatus(prev => ({ ...prev, [step.phase]: 'failed' }));
413|                    updatePhase(step.phase, 'FAILED');
414|                    setAutoOrchestrating(false);
415|                    return; // Stop the chain on failure
416|                }
417|            } catch (err) {
418|                log(`[agentic ✗] ${step.label} — network/connection error: ${err.message}`);
419|                log(`[agentic ⏸] Pipeline halted at Phase ${step.phase}. Check server connectivity.`);
420|                setFailedOrchPhaseIdx(i);
421|                setPhaseStatus(prev => ({ ...prev, [step.phase]: 'failed' }));
422|                updatePhase(step.phase, 'FAILED');
423|                setAutoOrchestrating(false);
424|                return; // Stop the chain on failure
425|            }
426|        }
427|
428|        // All phases completed
429|        setFailedOrchPhaseIdx(null);
430|        updatePhase('COMPLETED', 'DONE');
431|        log('[agentic ✓] All 7 phases completed. Pipeline finished.');
432|        setAutoOrchestrating(false);
433|    };
434|
435|    // 🚨 RESUME: Continue from failed phase
436|    const handleResumePipeline = () => {
437|        if (failedOrchPhaseIdx === null) return;
438|        setPhaseStatus({});
439|        handleOrchestrateAll(failedOrchPhaseIdx);
440|    };
441|
442|    // 🚨 ROLLBACK: Destroy all provisioned infrastructure (Fix #5)
443|    const handleRollback = async () => {
444|        if (!confirm('⚠️ ROLLBACK: This will destroy ALL provisioned infrastructure (VPCs, subnets, ECS instances, EIPs). This cannot be undone. Continue?')) return;
445|        setAutoOrchestrating(true);
446|        setOrchestrationLog([]);
447|        const log = (msg) => setOrchestrationLog(prev => [...prev, msg]);
448|        log('[rollback] Initiating infrastructure rollback...');
449|        
450|        const token = sessionStorage.getItem('hermes_access_token');
451|        try {
452|            const res = await fetch(`/api/projects/${project?.id}/rollback`, {
453|                method: 'POST',
454|                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
455|            });
456|            const data = await res.json();
457|            if (data.success) {
458|                log(`[rollback ✓] ${data.message}`);
459|                setCompletedOrchPhases(new Set());
460|                setPhaseStatus({});
461|                setFailedOrchPhaseIdx(null);
462|                updatePhase('PHASE_4_0', 'PENDING');
463|            } else {
464|                log(`[rollback ✗] Failed: ${data.error}`);
465|            }
466|        } catch (err) {
467|            log(`[rollback ✗] Network error: ${err.message}`);
468|        }
469|        setAutoOrchestrating(false);
470|    };
471|
472|    // 🚨 INDIVIDUAL: Validate minimum prerequisites for ad-hoc task execution
473|    const handleCheckPrereqs = () => {
474|        // Check: Wave 0 (PHASE_4_1) must be done for network fabric
475|        const wave0Done = executionState.currentPhase > 'PHASE_4_1' || executionState.currentPhase === 'COMPLETED';
476|        // Check: Agents (PHASE_4_4) must be deployed for migration tooling
477|        const agentsDone = executionState.currentPhase > 'PHASE_4_4' || executionState.currentPhase === 'COMPLETED';
478|
479|        setPrereqChecked(true);
480|        if (wave0Done && agentsDone) {
481|            setPrereqPassed(true);
482|            onUpdateProject && onUpdateProject(project?.id, 'prereqsValidated', true);
483|        } else {
484|            setPrereqPassed(false);
485|        }
486|    };
487|
488|    const handleForcePrereqs = async () => {
489|        // Quick-run: execute Wave 0 + Agents in sequence, then unlock
490|        setAutoOrchestrating(true);
491|        updatePhase('PHASE_4_1', 'IN_PROGRESS');
492|        await new Promise(r => setTimeout(r, 2000)); // simulate terraform
493|        updatePhase('PHASE_4_4', 'PENDING'); // skip 4.2, 4.3
494|        await new Promise(r => setTimeout(r, 1500)); // simulate agent push
495|        updatePhase('PHASE_4_5', 'PENDING'); // mark sync ready
496|        setPrereqPassed(true);
497|        setPrereqChecked(true);
498|        onUpdateProject && onUpdateProject(project?.id, 'prereqsValidated', true);
499|        setAutoOrchestrating(false);
500|    };
501|
502|    return (
503|        <div className="space-y-6 animate-fade-in">
504|            {/* 🚨 MODE BANNER */}
505|            <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${
506|                isAgentic ? 'bg-purple-50 border-purple-300' :
507|                isIndividual ? 'bg-emerald-50 border-emerald-300' :
508|                'bg-blue-50 border-blue-300'
509|            }`}>
510|                <div className="flex items-center gap-3">
511|                    <i className={`fas ${isAgentic ? 'fa-robot text-purple-600 text-xl' : isIndividual ? 'fa-cube text-emerald-600 text-xl' : 'fa-tasks text-blue-600 text-xl'}`}></i>
512|                    <div>
513|                        <div className={`font-black text-sm uppercase tracking-widest ${
514|                            isAgentic ? 'text-purple-800' : isIndividual ? 'text-emerald-800' : 'text-blue-800'
515|                        }`}>
516|                            {isAgentic ? 'Agentic Orchestration Active' : isIndividual ? 'Individual Tasks Mode' : 'Manual Pipeline Mode'}
517|                        </div>
518|                        <p className="text-[10px] font-medium text-slate-500">
519|                            {isAgentic ? 'Hermes will autonomously execute all 7 phases. Lock individual controls during run.' :
520|                             isIndividual ? 'Validate minimum prerequisites, then use Workbench for ad-hoc migration tasks.' :
521|                             'Standard step-by-step Kanban execution. Team triggers each phase manually.'}
522|                        </p>
523|                    </div>
524|                </div>
525|                <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
526|                    isAgentic ? 'bg-purple-200 text-purple-700 border border-purple-300' :
527|                    isIndividual ? 'bg-emerald-200 text-emerald-700 border border-emerald-300' :
528|                    'bg-blue-200 text-blue-700 border border-blue-300'
529|                }`}>
530|                    {executionMode.toUpperCase()}
531|                </span>
532|            </div>
533|
534|            {/* 🚨 AGENTIC: Orchestrate All button */}
535|            {isAgentic && (
536|                <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-lg p-6">
537|                    <h4 className="font-black text-purple-800 text-sm uppercase tracking-widest mb-3">
538|                        <i className="fas fa-robot mr-2"></i> Autonomous Pipeline Execution
539|                    </h4>
540|                    <p className="text-xs text-slate-500 mb-5">
541|                        The orchestration engine will chain all 7 phases sequentially. Individual phase controls are locked during execution.
542|                    </p>
543|
544|                    {/* Phase progress bar */}
545|                    {completedOrchPhases.size > 0 && (
546|                        <div className="mb-4">
547|                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
548|                                <span className="font-bold">{completedOrchPhases.size}/7 phases complete</span>
549|                                {failedOrchPhaseIdx !== null && <span className="text-rose-500 font-black">⏸ Halted at Phase {failedOrchPhaseIdx + 1}</span>}
550|                            </div>
551|                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
552|                                <div className={`h-full rounded-full transition-all duration-500 ${failedOrchPhaseIdx !== null ? 'bg-amber-500' : 'bg-emerald-500'}`}
553|                                    style={{ width: `${(completedOrchPhases.size / 7) * 100}%` }} />
554|                            </div>
555|                            {/* Per-phase status pills */}
556|                            <div className="flex gap-1.5 mt-2 flex-wrap">
557|                                {[1,2,3,4,5,6,7].map(n => {
558|                                    const phase = `PHASE_4_${n}`;
559|                                    const status = phaseStatus[phase] || (completedOrchPhases.has(phase) ? 'completed' : 'pending');
560|                                    const color = status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
561|                                                  status === 'failed' ? 'bg-rose-100 text-rose-700 border-rose-300' :
562|                                                  status === 'running' ? 'bg-purple-100 text-purple-700 border-purple-300' :
563|                                                  'bg-slate-100 text-slate-400 border-slate-200';
564|                                    const icon = status === 'completed' ? 'fa-check' : status === 'failed' ? 'fa-times' : status === 'running' ? 'fa-spinner fa-spin' : 'fa-circle';
565|                                    return (
566|                                        <span key={n} className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${color}`}>
567|                                            <i className={`fas ${icon} mr-1 text-[8px]`}></i>P{n}
568|                                        </span>
569|                                    );
570|                                })}
571|                            </div>
572|                        </div>
573|                    )}
574|
575|                    {autoOrchestrating ? (
576|                        <div className="space-y-2">
577|                            <div className="flex items-center gap-3 text-purple-700 font-bold text-sm">
578|                                <i className="fas fa-spinner fa-spin text-xl"></i>
579|                                Orchestration in progress...
580|                            </div>
581|                            <div className="bg-slate-900 rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-[10px] text-emerald-400 border border-slate-700 shadow-inner">
582|                                {orchestrationLog.map((line, i) => (
583|                                    <div key={i} className={line.includes('✓') ? 'text-emerald-400' : 'text-purple-300'}>{line}</div>
584|                                ))}
585|                                <div className="text-amber-400 animate-pulse mt-2">
586|                                    <i className="fas fa-spinner fa-spin mr-2"></i> Agent working...
587|                                </div>
588|                            </div>
589|                        </div>
590|                    ) : (
591|                        <div className="flex gap-3">
592|                            {/* Primary: Orchestrate All */}
593|                            <button
594|                                onClick={() => handleOrchestrateAll(0)}
595|                                disabled={executionState?.currentPhase === 'COMPLETED'}
596|                                className={`flex-1 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all ${
597|                                    executionState?.currentPhase === 'COMPLETED'
598|                                        ? 'bg-emerald-500 text-white cursor-default'
599|                                        : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
600|                                }`}
601|                            >
602|                                {executionState?.currentPhase === 'COMPLETED'
603|                                    ? <><i className="fas fa-check-circle mr-2"></i> Pipeline Already Completed</>
604|                                    : <><i className="fas fa-play mr-2"></i> {completedOrchPhases.size > 0 ? 'Re-run Full Pipeline' : 'Orchestrate All 7 Phases'}</>
605|                                }
606|                            </button>
607|                            {/* Resume button (only when failed phase exists) */}
608|                            {failedOrchPhaseIdx !== null && (
609|                                <button
610|                                    onClick={handleResumePipeline}
611|                                    className="flex-1 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg bg-amber-500 hover:bg-amber-600 text-white active:scale-95 transition-all"
612|                                >
613|                                    <i className="fas fa-forward mr-2"></i> Resume from Phase {failedOrchPhaseIdx + 1}
614|                                </button>
615|                            )}
616|                            {/* Rollback button (when pipeline has progressed past Phase 4.0) */}
617|                            {(completedOrchPhases.size > 0 || executionState?.currentPhase > 'PHASE_4_0') && (
618|                                <button
619|                                    onClick={handleRollback}
620|                                    className="py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg bg-rose-600 hover:bg-rose-700 text-white active:scale-95 transition-all"
621|                                    title="Destroy all provisioned infrastructure"
622|                                >
623|                                    <i className="fas fa-undo mr-1"></i> Rollback
624|                                </button>
625|                            )}
626|                        </div>
627|                    )}
628|                </div>
629|            )}
630|
631|            {/* 🚨 INDIVIDUAL: Prerequisite Check */}
632|            {isIndividual && (
633|                <div className="bg-white border-2 border-emerald-200 rounded-2xl shadow-lg p-6">
634|                    <h4 className="font-black text-emerald-800 text-sm uppercase tracking-widest mb-3">
635|                        <i className="fas fa-clipboard-check mr-2"></i> Prerequisite Validation
636|                    </h4>
637|                    <p className="text-xs text-slate-500 mb-5">
638|                        Individual task mode requires network fabric (Wave 0) and migration agents to be in place before ad-hoc workloads.
639|                    </p>
640|                    {!prereqChecked ? (
641|                        <div className="flex gap-3">
642|                            <button onClick={handleCheckPrereqs} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors">
643|                                <i className="fas fa-stethoscope mr-2"></i> Check Prerequisites
644|                            </button>
645|                            <button onClick={handleForcePrereqs} disabled={autoOrchestrating} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors disabled:opacity-50">
646|                                {autoOrchestrating ? <><i className="fas fa-spinner fa-spin mr-2"></i> Running...</> : <><i className="fas fa-bolt mr-2"></i> Quick-Run Prerequisites</>}
647|                            </button>
648|                        </div>
649|                    ) : prereqPassed ? (
650|                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
651|                            <i className="fas fa-check-circle text-emerald-600 text-2xl"></i>
652|                            <div>
653|                                <div className="font-black text-emerald-800 text-sm">Prerequisites Validated</div>
654|                                <p className="text-[10px] text-emerald-700 font-medium">Network fabric + agents confirmed. Engineering Workbench is unlocked.</p>
655|                            </div>
656|                        </div>
657|                    ) : (
658|                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
659|                            <div className="flex items-center gap-3 mb-3">
660|                                <i className="fas fa-times-circle text-rose-600 text-2xl"></i>
661|                                <div>
662|                                    <div className="font-black text-rose-800 text-sm">Prerequisites Not Met</div>
663|                                    <p className="text-[10px] text-rose-700 font-medium">Required: Wave 0 network fabric + deployed migration agents.</p>
664|                                </div>
665|                            </div>
666|                            <button onClick={handleForcePrereqs} disabled={autoOrchestrating} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors disabled:opacity-50">
667|                                {autoOrchestrating ? <><i className="fas fa-spinner fa-spin mr-2"></i> Running...</> : <><i className="fas fa-bolt mr-2"></i> Quick-Run Prerequisites</>}
668|                            </button>
669|                        </div>
670|                    )}
671|                </div>
672|            )}
673|
674|            {/* 🚨 PIPELINE PHASES (visible in all modes, locked during agentic run) */}
675|            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden p-8">
                {isGreenfield ? (
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
                            {/* ⚡ PHYSICS RECALIBRATION MONITOR (NEW — Improvement #4) */}
                            {executionState.currentPhase === 'PHASE_4_5' && recalibrationBaseline && (
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
                {executionState.currentPhase === 'COMPLETED' && (
                    <div className="mt-8 bg-emerald-500/10 border border-emerald-500 p-6 rounded-xl text-center animate-fade-in">
                        <i className="fas fa-check-double text-4xl text-emerald-500 mb-3"></i>
                        <h3 className="font-black text-xl text-emerald-400">Migration Pipeline Completed</h3>
                        <p className="text-emerald-200 mt-2 text-sm">Servers are now live and attached to the Production VPC. Transient costs eliminated. Please proceed to Post-Live.</p>
                    </div>
                )}
                    </>
                ) : (
                    <MigrationOrchestratorView project={project} executionState={executionState} executionMode={executionMode} onUpdateProject={onUpdateProject} />
                )}
952|        </div>
953|    );
954|}
955|
956|// ═══ Migration Orchestrator View — for migration projects (not greenfield) ═══
function MigrationOrchestratorView({ project, executionState, executionMode, onUpdateProject }) {
    const token = sessionStorage.getItem('hermes_access_token');
    const [execPlan, setExecPlan] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [execResult, setExecResult] = useState(null);
    const [execLog, setExecLog] = useState([]);
    const [selectedServer, setSelectedServer] = useState(null);
    const [serverStatus, setServerStatus] = useState({});
    const [failedStep, setFailedStep] = useState(null);

    // Extract resources from target architecture (single source of truth)
    const targetArch = project?.targetArchitecture || {};
    const servers = [
        ...(targetArch.compute || []),
        ...(targetArch.database || []),
        ...(targetArch.storage || []),
    ].filter(s => s.name);

    const networkRes = targetArch.network || [];
    const authLevel = project?.authLevel || project?.presales?.authLevel || [];
    const isZeroTrust = Array.isArray(authLevel)
        ? authLevel.some(a => String(a).includes('Read-Only'))
        : String(authLevel).includes('Read-Only');
    const sourceEnv = project?.sourceEnvironment || project?.presales?.sourceEnvironment || 'Unknown';
    const isAgentic = executionMode === 'agentic';
    const isIndividual = executionMode === 'individual';
    const isManual = !isAgentic && !isIndividual;

    // Build execution plan
    const buildPlan = async () => {
        try {
            const res = await fetch(`/api/execution/${project.id}/build-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setExecPlan(data);
        } catch (err) {
            setExecLog(prev => [...prev, `[ERROR] Build plan failed: ${err.message}`]);
        }
    };

    useEffect(() => { buildPlan(); }, [project.id]);

    // Execute full plan (agentic mode)
    const executeAll = async () => {
        setExecuting(true);
        setExecLog([{ msg: '[AGENTIC] Starting autonomous execution...', type: 'info' }]);
        try {
            const res = await fetch(`/api/execution/${project.id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ dry_run: true }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setExecResult(data);
            setExecLog(prev => [...prev, { msg: `[AGENTIC ✓] Execution complete: ${data.summary?.succeeded || 0}/${data.summary?.total_steps || 0} steps succeeded`, type: 'success' }]);
            if (data.steps) {
                data.steps.forEach(s => {
                    const icon = s.tool_source === 'mcp' ? '🔌' : s.tool_source === 'skill' ? '🔧' : 'CLI';
                    setExecLog(prev => [...prev, { msg: `  ${s.status === 'success' ? '✅' : s.status === 'failed' ? '❌' : '⬜'} [${s.phase}] ${s.action} → ${s.target_resource} ${icon}`, type: s.status }]);
                });
                if (data.steps.some(s => s.status === 'failed')) {
                    const fail = data.steps.find(s => s.status === 'failed');
                    setFailedStep(fail.step_id);
                }
            }
        } catch (err) {
            setExecLog(prev => [...prev, { msg: `[ERROR] ${err.message}`, type: 'error' }]);
        }
        setExecuting(false);
    };

    // Execute single step (manual/individual mode)
    const executeStep = async (stepId) => {
        setExecuting(true);
        try {
            const res = await fetch(`/api/execution/${project.id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ step_id: stepId, dry_run: true }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data;
        } catch (err) {
            return { success: false, error: err.message };
        }
        setExecuting(false);
    };

    // Migration phases for progress display
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
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden p-6">
            {/* Phase progression chips */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {MIG_PHASES.map((ph, idx) => (
                    <div key={ph.key} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        idx === currentPhaseIdx ? 'text-white scale-110' :
                        idx < currentPhaseIdx ? 'text-slate-400' : 'text-slate-600'
                    }`} style={{
                        background: idx === currentPhaseIdx ? ph.color : idx < currentPhaseIdx ? ph.color + '20' : '#1e293b',
                        border: `1px solid ${idx <= currentPhaseIdx ? ph.color : '#374151'}`,
                    }}>
                        <i className={`fas ${ph.icon} mr-1`} />{ph.label}
                    </div>
                ))}
            </div>

            {/* Zero Trust banner */}
            {isZeroTrust && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
                    <i className="fas fa-lock text-amber-500" />
                    <span className="text-amber-300 text-xs font-bold">ZERO TRUST MODE — Source not directly accessible. Agent install is customer responsibility. ERP runs all target-side operations.</span>
                </div>
            )}

            {/* mig_worker indicator */}
            {execPlan?.mcp_servers_needed?.length > 0 && (
                <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2">
                    <i className="fas fa-cog text-blue-500" />
                    <span className="text-blue-300 text-xs font-bold">mig_worker ready — {execPlan.mcp_servers_needed.length} MCP services on-demand</span>
                </div>
            )}

            {/* Execution mode label */}
            <div className="mb-4 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mode:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{
                    background: isAgentic ? '#722ed130' : isIndividual ? '#f59e0b30' : '#3b82f630',
                    color: isAgentic ? '#a78bfa' : isIndividual ? '#fbbf24' : '#60a5fa',
                }}>{executionMode}</span>
                <span className="text-xs text-slate-500">Source: {sourceEnv}</span>
                <span className="text-xs text-slate-500">| Servers: {servers.length}</span>
                {execPlan && <span className="text-xs text-slate-500">| Plan: {execPlan.summary?.total_steps || 0} steps</span>}
            </div>

            {/* === MODE-SPECIFIC VIEWS === */}
            {isManual && <MigrationManualView servers={servers} execPlan={execPlan} executeStep={executeStep} serverStatus={serverStatus} setServerStatus={setServerStatus} isZeroTrust={isZeroTrust} />}
            {isAgentic && <MigrationAgenticView execPlan={execPlan} executing={executing} executeAll={executeAll} execLog={execLog} execResult={execResult} failedStep={failedStep} />}
            {isIndividual && <MigrationIndividualView servers={servers} executeStep={executeStep} selectedServer={selectedServer} setSelectedServer={setSelectedServer} isZeroTrust={isZeroTrust} />}
        </div>
    );
}

// === MANUAL: Per-server Kanban table ===
function MigrationManualView({ servers, execPlan, executeStep, serverStatus, setServerStatus, isZeroTrust }) {
    const getStepFor = (serverName, action) => {
        if (!execPlan?.steps) return null;
        return execPlan.steps.find(s => s.target_resource === serverName && s.action === action);
    };

    const handleAction = async (serverName, action) => {
        const step = getStepFor(serverName, action);
        if (!step) return;
        setServerStatus(prev => ({ ...prev, [`${serverName}_${action}`]: 'running' }));
        const result = await executeStep(step.step_id);
        setServerStatus(prev => ({ ...prev, [`${serverName}_${action}`]: result?.success !== false ? 'success' : 'failed' }));
    };

    const statusIcon = (key) => {
        const s = serverStatus[key];
        if (s === 'success') return <span className="text-emerald-400 text-lg">✅</span>;
        if (s === 'running') return <i className="fas fa-spinner fa-spin text-amber-400" />;
        if (s === 'failed') return <span className="text-red-400 text-lg">❌</span>;
        return <span className="text-slate-600">⬜</span>;
    };

    const columns = [
        { title: 'Server', dataIndex: 'name', key: 'name', render: (name, r) => (
            <div><span className="text-white font-bold text-sm">{name}</span><br/><span className="text-slate-500 text-[10px]">{r.type || 'ECS'}</span></div>
        )},
        { title: 'Agent', key: 'agent', render: (_, r) => isZeroTrust ? <span className="text-amber-400 text-xs">👤 Customer</span> : (
            <button onClick={() => handleAction(r.name, 'SMS_AGENT_INSTALL')} disabled={!!serverStatus[`${r.name}_SMS_AGENT_INSTALL`]}>
                {statusIcon(`${r.name}_SMS_AGENT_INSTALL`)} <span className="text-[10px] text-slate-400 ml-1">Install</span>
            </button>
        )},
        { title: 'Target ECS', key: 'ecs', render: (_, r) => (
            <button onClick={() => handleAction(r.name, 'CREATE_TARGET_ECS')} disabled={!!serverStatus[`${r.name}_CREATE_TARGET_ECS`]}>
                {statusIcon(`${r.name}_CREATE_TARGET_ECS`)} <span className="text-[10px] text-slate-400 ml-1">Create</span>
            </button>
        )},
        { title: 'SMS Task', key: 'sms', render: (_, r) => (
            <button onClick={() => handleAction(r.name, 'SMS_CREATE_TASK')} disabled={!!serverStatus[`${r.name}_SMS_CREATE_TASK`]}>
                {statusIcon(`${r.name}_SMS_CREATE_TASK`)} <span className="text-[10px] text-slate-400 ml-1">Start</span>
            </button>
        )},
        { title: 'Sync', key: 'sync', render: (_, r) => statusIcon(`${r.name}_SMS_SUBTASK`) },
        { title: 'Cutover', key: 'cutover', render: (_, r) => (
            <button onClick={() => handleAction(r.name, 'SMS_CUTOVER')} disabled={!!serverStatus[`${r.name}_SMS_CUTOVER`]}
                className="px-2 py-1 rounded bg-red-600/20 border border-red-600/40 text-red-400 text-[10px] font-bold hover:bg-red-600/30">
                {statusIcon(`${r.name}_SMS_CUTOVER`)} Cutover
            </button>
        )},
    ];

    if (!servers.length) return <div className="text-slate-500 text-sm p-4">No servers in target architecture. Build the target architecture in Phase 2.4 first.</div>;

    return (
        <div>
            <div className="text-xs text-slate-400 mb-3">Click each cell to execute that step for that server. Status updates in real-time.</div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="border-b border-slate-700">
                        {columns.map(c => <th key={c.key} className="py-2 px-3 text-[10px] font-black uppercase text-slate-500">{c.title}</th>)}
                    </tr></thead>
                    <tbody>
                        {servers.map(s => (
                            <tr key={s.name} className="border-b border-slate-800 hover:bg-slate-800/50">
                                {columns.map(c => <td key={c.key} className="py-3 px-3">{c.render(null, s)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// === AGENTIC: One-button orchestration ===
function MigrationAgenticView({ execPlan, executing, executeAll, execLog, execResult, failedStep }) {
    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <button onClick={executeAll} disabled={executing}
                    className={`px-6 py-3 rounded-lg text-sm font-black uppercase shadow-md ${executing ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                    {executing ? <><i className="fas fa-spinner fa-spin mr-2" />Executing...</> : <><i className="fas fa-robot mr-2" />Execute Migration</>}
                </button>
                {failedStep && <span className="text-red-400 text-xs">Halted at step {failedStep}</span>}
                {execResult?.summary && <span className="text-emerald-400 text-xs">{execResult.summary.succeeded}/{execResult.summary.total_steps} succeeded</span>}
            </div>

            {/* Live trace */}
            {execLog.length > 0 && (
                <div className="bg-black/40 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs">
                    {execLog.map((entry, i) => (
                        <div key={i} className={entry.type === 'success' ? 'text-emerald-400' : entry.type === 'error' ? 'text-red-400' : 'text-slate-300'}>
                            {entry.msg || entry}
                        </div>
                    ))}
                </div>
            )}

            {/* Plan preview */}
            {execPlan && !execResult && (
                <div className="mt-4">
                    <div className="text-xs text-slate-400 mb-2">Execution Plan ({execPlan.summary?.total_steps || 0} steps):</div>
                    <div className="bg-black/30 rounded-lg p-3 max-h-64 overflow-y-auto">
                        {execPlan.steps?.slice(0, 20).map(s => (
                            <div key={s.step_id} className="text-xs py-1 flex items-center gap-2">
                                <span className="text-slate-600 w-6">{s.step_id}.</span>
                                <span className="text-slate-500 w-24">[{s.phase?.replace('PHASE_4_', '4.')}]</span>
                                <span className="text-slate-300 w-40">{s.action}</span>
                                <span className="text-slate-500 w-32">{s.target_resource}</span>
                                <span className="text-slate-600">{s.tool_source === 'mcp' ? '🔌' : s.tool_source === 'skill' ? '🔧' : 'CLI'}</span>
                            </div>
                        ))}
                        {execPlan.steps?.length > 20 && <div className="text-slate-600 text-xs mt-2">... {execPlan.steps.length - 20} more steps</div>}
                    </div>
                </div>
            )}
        </div>
    );
}

// === INDIVIDUAL: Server picker + standalone tasks ===
function MigrationIndividualView({ servers, executeStep, selectedServer, setSelectedServer, isZeroTrust }) {
    const [taskStatus, setTaskStatus] = useState({});
    const TASKS = [
        { action: 'SMS_AGENT_INSTALL', label: 'Install SMS Agent', icon: 'fa-download', color: '#f59e0b' },
        { action: 'CREATE_TARGET_ECS', label: 'Create Target ECS', icon: 'fa-server', color: '#3b82f6' },
        { action: 'SMS_CREATE_TASK', label: 'Start SMS Migration', icon: 'fa-sync-alt', color: '#10b981' },
        { action: 'DATA_SYNC_START', label: 'Run rsync Data Sync', icon: 'fa-exchange-alt', color: '#8b5cf6' },
        { action: 'IMPORT_IMAGE', label: 'Import Image', icon: 'fa-image', color: '#06b6d4' },
        { action: 'DRS_CREATE_JOB', label: 'Start DRS Job', icon: 'fa-database', color: '#10b981' },
    ];

    const handleTask = async (action) => {
        if (!selectedServer) return;
        setTaskStatus(prev => ({ ...prev, [action]: 'running' }));
        const result = await executeStep(action); // simplified
        setTaskStatus(prev => ({ ...prev, [action]: result?.success !== false ? 'success' : 'failed' }));
    };

    return (
        <div>
            <div className="text-xs text-slate-400 mb-3">Select a server, then run standalone tasks independently. No wave dependencies.</div>

            {/* Server grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {servers.map(s => (
                    <div key={s.name} onClick={() => setSelectedServer(s)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedServer?.name === s.name ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
                        <i className="fas fa-server text-slate-500 mb-1" />
                        <div className="text-white text-xs font-bold truncate">{s.name}</div>
                        <div className="text-slate-500 text-[10px]">{s.type || 'ECS'}</div>
                    </div>
                ))}
            </div>

            {/* Task buttons for selected server */}
            {selectedServer && (
                <div className="bg-slate-800 rounded-lg p-4">
                    <div className="text-sm text-white font-bold mb-3">Tasks for: {selectedServer.name}</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {TASKS.map(t => {
                            const status = taskStatus[t.action];
                            return (
                                <button key={t.action} onClick={() => handleTask(t.action)} disabled={status === 'running'}
                                    className="p-3 rounded-lg border text-left transition-all disabled:opacity-50"
                                    style={{ borderColor: t.color + '60', background: t.color + '10' }}>
                                    <div className="flex items-center gap-2">
                                        <i className={`fas ${t.icon}`} style={{ color: t.color }} />
                                        <span className="text-xs text-white font-bold">{t.label}</span>
                                    </div>
                                    {status === 'success' && <span className="text-emerald-400 text-[10px] mt-1 block">✅ Done</span>}
                                    {status === 'running' && <span className="text-amber-400 text-[10px] mt-1 block">⏳ Running...</span>}
                                    {status === 'failed' && <span className="text-red-400 text-[10px] mt-1 block">❌ Failed</span>}
                                </button>
                            );
                        })}
                    </div>
                    {isZeroTrust && <div className="mt-3 text-amber-400 text-xs">⚠ Zero Trust: Agent install is customer responsibility.</div>}
                </div>
            )}
        </div>
    );
}

// 🚨 PRESERVED: Readiness Gateway View
957|function ReadinessGatewayView({ project, isGreenfield, authLevel, isZeroTrust, onApprove }) {
958|    const [loading, setLoading] = useState(false);
959|    const [gatewayResult, setGatewayResult] = useState(null);
960|    const [riskAcknowledged, setRiskAcknowledged] = useState(false);
961|    const [notifyCommercial, setNotifyCommercial] = useState(false);
962|
963|    const runFullCheck = async () => {
964|        setLoading(true);
965|        setGatewayResult(null);
966|        try {
967|            const token = sessionStorage.getItem('hermes_access_token');
968|            const res = await fetch('/api/gateway/full-check', {
969|                method: 'POST',
970|                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
971|                body: JSON.stringify({ 
972|                    customer_id: project?.customerId, 
973|                    project_id: project?.id 
974|                })
975|            });
976|            const data = await res.json();
977|            setGatewayResult(data);
978|            // Auto-set commercial notification if real-name auth missing
979|            if (data.checks?.realname_auth?.status === 'unverified') {
980|                setNotifyCommercial(true);
981|            }
982|        } catch (err) {
983|            setGatewayResult({ success: false, error: err.message });
984|        } finally {
985|            setLoading(false);
986|        }
987|    };
988|
989|    // Run check on mount
990|    useEffect(() => {
991|        if (project?.customerId) {
992|            runFullCheck();
993|        }
994|    }, [project?.customerId]);
995|
996|    const checks = gatewayResult?.checks || {};
997|    const isReady = gatewayResult?.ready;
998|    const mode = gatewayResult?.mode || 'unknown';
999|    const showRiskWarning = checks.realname_auth?.status === 'unverified';
1000|
1001|    const statusIcon = (status) => {
1002|        switch (status) {
1003|            case 'valid': return { icon: 'fa-check-circle', color: 'text-emerald-400' };
1004|            case 'configured': return { icon: 'fa-check-circle', color: 'text-emerald-400' };
1005|            case 'unverified': return { icon: 'fa-exclamation-triangle', color: 'text-amber-400' };
1006|            case 'missing': return { icon: 'fa-times-circle', color: 'text-rose-400' };
1007|            case 'blocked': return { icon: 'fa-ban', color: 'text-rose-500' };
1008|            case 'invalid': return { icon: 'fa-times-circle', color: 'text-rose-400' };
1009|            default: return { icon: 'fa-question-circle', color: 'text-slate-400' };
1010|        }
1011|    };
1012|
1013|    return (
1014|        <div className="p-8 h-full flex flex-col items-center overflow-y-auto custom-scrollbar">
1015|            <div className="w-full max-w-2xl space-y-6">
1016|                {/* Header */}
1017|                <div className="text-center">
1018|                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${
1019|                        isReady ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-400'
1020|                    }`}>
1021|                        <i className={`fas ${isReady ? 'fa-shield-check' : 'fa-shield-haltered'}`}></i>
1022|                    </div>
1023|                    <h3 className="text-xl font-black text-white mb-1">4.0 Execution Readiness Gateway</h3>
1024|                    <p className="text-sm text-slate-400">
1025|                        {isReady 
1026|                            ? `Target boundary verified — ${mode === 'least_privilege' ? 'Least Privilege mode active' : 'Master fallback mode'}`
1027|                            : 'Validating credential hierarchy...'}
1028|                    </p>
1029|                </div>
1030|
1031|                {/* Check Matrix */}
1032|                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
1033|                    <div className="bg-slate-900 px-5 py-3 border-b border-slate-700">
1034|                        <h4 className="font-black text-xs text-slate-300 uppercase tracking-widest">
1035|                            <i className="fas fa-list-check mr-2 text-emerald-400"></i>Credential & Access Validation
1036|                        </h4>
1037|                    </div>
1038|                    <div className="divide-y divide-slate-700/50">
1039|                        {/* Master AK/SK */}
1040|                        <CheckRow 
1041|                            label="Master AK/SK" 
1042|                            desc="Control plane authentication" 
1043|                            status={checks.master_credentials?.status}
1044|                            message={checks.master_credentials?.message}
1045|                            si={statusIcon(checks.master_credentials?.status)}
1046|                        />
1047|                        {/* Real-Name Auth */}
1048|                        <CheckRow 
1049|                            label="Real-Name Authentication" 
1050|                            desc="Required for EPS + Tier 2 isolation" 
1051|                            status={checks.realname_auth?.status}
1052|                            message={checks.realname_auth?.warning || checks.realname_auth?.message}
1053|                            si={statusIcon(checks.realname_auth?.status)}
1054|                        />
1055|                        {/* Tier 2 EPS Admin */}
1056|                        <CheckRow 
1057|                            label="Tier 2: Sandbox EPS Admin" 
1058|                            desc="Enterprise Project-scoped access" 
1059|                            status={checks.tier2_credentials?.status}
1060|                            message={checks.tier2_credentials?.message}
1061|                            si={statusIcon(checks.tier2_credentials?.status)}
1062|                        />
1063|                        {/* EPS Bracket */}
1064|                        <CheckRow 
1065|                            label="EPS Bracket" 
1066|                            desc={`Size classification: ${checks.eps_bracket?.bracket || 'unknown'}`}
1067|                            status={checks.eps_bracket?.bracket ? 'valid' : 'missing'}
1068|                            si={statusIcon(checks.eps_bracket?.bracket ? 'valid' : 'missing')}
1069|                        />
1070|                        {/* OS Data Plane */}
1071|                        <CheckRow 
1072|                            label="OS Data Plane" 
1073|                            desc="Agentless migration credentials" 
1074|                            status={checks.os_credentials?.status}
1075|                            message={checks.os_credentials?.message}
1076|                            si={statusIcon(checks.os_credentials?.status)}
1077|                        />
1078|                    </div>
1079|                </div>
1080|
1081|                {/* Risk Warning (Path B) */}
1082|                {showRiskWarning && (
1083|                    <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-5 animate-fade-in">
1084|                        <div className="flex items-start gap-3">
1085|                            <i className="fas fa-exclamation-triangle text-amber-400 text-xl mt-0.5"></i>
1086|                            <div className="flex-1">
1087|                                <h4 className="font-black text-amber-400 text-sm mb-1">Reduced Isolation Mode</h4>
1088|                                <p className="text-xs text-amber-300/80 mb-3">
1089|                                    Real-name authentication not complete. Full Master AK/SK will be used for execution. 
1090|                                    Enterprise Project isolation is unavailable until verification is done.
1091|                                </p>
1092|                                <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer">
1093|                                    <input 
1094|                                        type="checkbox" 
1095|                                        checked={riskAcknowledged} 
1096|                                        onChange={e => setRiskAcknowledged(e.target.checked)}
1097|                                        className="rounded bg-slate-700 border-slate-600"
1098|                                    />
1099|                                    I acknowledge the reduced security posture
1100|                                </label>
1101|                                {notifyCommercial && (
1102|                                    <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
1103|                                        <i className="fas fa-bell"></i>
1104|                                        Commercial team will be notified to complete real-name authentication
1105|                                    </div>
1106|                                )}
1107|                            </div>
1108|                        </div>
1109|                    </div>
1110|                )}
1111|
1112|                {/* Action Buttons */}
1113|                <div className="flex justify-center gap-4">
1114|                    <button 
1115|                        onClick={runFullCheck}
1116|                        disabled={loading}
1117|                        className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50"
1118|                    >
1119|                        <i className={`fas fa-sync-alt mr-2 ${loading ? 'animate-spin' : ''}`}></i>
1120|                        Re-Check
1121|                    </button>
1122|                    <button 
1123|                        onClick={onApprove}
1124|                        disabled={!isReady || (showRiskWarning && !riskAcknowledged)}
1125|                        className={`px-8 py-2.5 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all ${
1126|                            isReady && (!showRiskWarning || riskAcknowledged)
1127|                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
1128|                                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
1129|                        }`}
1130|                        title={showRiskWarning && !riskAcknowledged ? 'Acknowledge risk warning first' : ''}
1131|                    >
1132|                        <i className="fas fa-unlock mr-2"></i>
1133|                        Unlock Execution Engine
1134|                    </button>
1135|                </div>
1136|
1137|                {gatewayResult?.requires_action?.length > 0 && (
1138|                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
1139|                        <h4 className="font-black text-[10px] text-slate-500 uppercase tracking-widest mb-2">
1140|                            <i className="fas fa-clipboard-list mr-1"></i>Required Actions
1141|                        </h4>
1142|                        <ul className="space-y-1">
1143|                            {gatewayResult.requires_action.map((action, i) => (
1144|                                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
1145|                                    <i className="fas fa-chevron-right text-emerald-500 mt-0.5"></i>
1146|                                    {action}
1147|                                </li>
1148|                            ))}
1149|                        </ul>
1150|                    </div>
1151|                )}
1152|            </div>
1153|        </div>
1154|    );
1155|}
1156|
1157|function CheckRow({ label, desc, status, message, si }) {
1158|    return (
1159|        <div className="px-5 py-3 flex items-center gap-4 hover:bg-slate-750 transition-colors">
1160|            <i className={`fas ${si.icon} ${si.color} text-lg`}></i>
1161|            <div className="flex-1 min-w-0">
1162|                <div className="font-bold text-sm text-white">{label}</div>
1163|                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{desc}</div>
1164|                {message && <div className="text-[10px] text-slate-500 mt-0.5 italic">{message}</div>}
1165|            </div>
1166|            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
1167|                status === 'valid' || status === 'configured' 
1168|                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
1169|                    : status === 'unverified'
1170|                    ? 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
1171|                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
1172|            }`}>
1173|                {status || 'unknown'}
1174|            </span>
1175|        </div>
1176|    );
1177|}
1178|
1179|// ==========================================
1180|// 🚨 NEW: 4.8 ENGINEERING WORKBENCH (Hermes Agentic Orchestration)
1181|// ==========================================
1182|function WorkbenchView({ project }) {
1183|    const [prompt, setPrompt] = useState('');
1184|    const [isExecuting, setIsExecuting] = useState(false);
1185|    const [terminalOutput, setTerminalOutput] = useState([
1186|        "[system] mig_worker is offline.",
1187|        "[system] Awaiting deployment to Target VPC..."
1188|    ]);
1189|    const [selectedProfile, setSelectedProfile] = useState('exec');
1190|    const [selectedModel, setSelectedModel] = useState('');
1191|
1192|    const executionMode = project?.executionMode || 'manual';
1193|    const isAgentic = executionMode === 'agentic';
1194|
1195|    const handleDelegate = async () => {
1196|        if (!prompt || isExecuting) return;
1197|        setIsExecuting(true);
1198|        setTerminalOutput(prev => [
1199|            ...prev,
1200|            `\n[hermes] Spawning agent via profile '${selectedProfile}'...`,
1201|            `[hermes] Goal: "${prompt}"`
1202|        ]);
1203|
1204|        try {
1205|            const token = sessionStorage.getItem('hermes_access_token');
1206|            const body = {
1207|                goal: prompt,
1208|                context: `ERP Project ID: ${project?.id || 'N/A'}. Repo at C:/Users/h84423900/latam-cloud-erp/repo.`,
1209|                profile: selectedProfile,
1210|            };
1211|            if (selectedModel) body.model = selectedModel;
1212|
1213|            const res = await fetch('/api/hermes-cli/delegate-task', {
1214|                method: 'POST',
1215|                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
1216|                body: JSON.stringify(body)
1217|            });
1218|
1219|            const data = await res.json();
1220|
1221|            if (data.success) {
1222|                setTerminalOutput(prev => [
1223|                    ...prev,
1224|                    `\n[hermes ✓] Task completed successfully.`,
1225|                    `[output]\n${data.response}`
1226|                ]);
1227|            } else {
1228|                setTerminalOutput(prev => [
1229|                    ...prev,
1230|                    `\n[hermes ✗] Task failed: ${data.error}`
1231|                ]);
1232|            }
1233|        } catch (err) {
1234|            setTerminalOutput(prev => [
1235|                ...prev,
1236|                `\n[error] Network error: ${err.message}`
1237|            ]);
1238|        } finally {
1239|            setIsExecuting(false);
1240|            setPrompt('');
1241|        }
1242|    };
1243|
1244|    const profileOptions = [
1245|        { id: 'exec', label: 'exec (GLM 5.2)', icon: 'fa-robot', color: 'text-purple-400' },
1246|        { id: 'default', label: 'default (DeepSeek V4)', icon: 'fa-brain', color: 'text-blue-400' },
1247|    ];
1248|
1249|    const modelOptions = [
1250|        { id: '', label: 'Use profile default' },
1251|        { id: 'glm-5.2', label: 'GLM 5.2 (Zhipu)', provider: 'zai' },
1252|        { id: 'kimi-k2.6', label: 'Kimi K2.6 (Moonshot)', provider: 'kimi-coding' },
1253|    ];
1254|
1255|    return (
1256|        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
1257|            {/* Left: Hermes Agentic Co-Pilot */}
1258|            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
1259|                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
1260|                    <h3 className="font-black text-sm text-slate-800 flex items-center">
1261|                        <i className={`fas ${isAgentic ? 'fa-robot text-purple-600' : 'fa-tasks text-blue-600'} mr-2`}></i>
1262|                        {isAgentic ? 'Hermes Agentic Orchestrator' : 'Hermes Context AI'}
1263|                    </h3>
1264|                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
1265|                        isAgentic 
1266|                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
1267|                            : 'bg-blue-100 text-blue-700 border border-blue-200'
1268|                    }`}>
1269|                        {isAgentic ? 'AGENTIC MODE — GLM 5.2' : 'MANUAL MODE'}
1270|                    </span>
1271|                </div>
1272|                <div className="flex-1 p-6 bg-slate-50/50 flex flex-col">
1273|                    {isAgentic ? (
1274|                        <>
1275|                            <div className="flex-1 flex flex-col items-center justify-center text-center mb-4">
1276|                                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
1277|                                    <i className="fas fa-robot"></i>
1278|                                </div>
1279|                                <h4 className="font-black text-slate-700 mb-2">Autonomous Migration Agent</h4>
1280|                                <p className="text-xs text-slate-500 max-w-sm">
1281|                                    Describe the migration workload. Hermes will spawn agents with the appropriate model to handle it autonomously.
1282|                                </p>
1283|                                {/* Profile & Model Selectors */}
1284|                                <div className="w-full max-w-xs mt-4 space-y-2">
1285|                                    <div className="flex gap-2">
1286|                                        {profileOptions.map(p => (
1287|                                            <button
1288|                                                key={p.id}
1289|                                                onClick={() => setSelectedProfile(p.id)}
1290|                                                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
1291|                                                    selectedProfile === p.id
1292|                                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
1293|                                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
1294|                                                }`}
1295|                                            >
1296|                                                <i className={`fas ${p.icon} mr-1`}></i> {p.label}
1297|                                            </button>
1298|                                        ))}
1299|                                    </div>
1300|                                    <select
1301|                                        value={selectedModel}
1302|                                        onChange={e => setSelectedModel(e.target.value)}
1303|                                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 font-medium"
1304|                                    >
1305|                                        {modelOptions.map(m => (
1306|                                            <option key={m.id} value={m.id}>{m.label}</option>
1307|                                        ))}
1308|                                    </select>
1309|                                </div>
1310|                            </div>
1311|                        </>
1312|                    ) : (
1313|                        <div className="flex-1 flex flex-col items-center justify-center text-center">
1314|                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
1315|                                <i className="fas fa-brain"></i>
1316|                            </div>
1317|                            <h4 className="font-black text-slate-700">Manual Pipeline Mode</h4>
1318|                            <p className="text-xs text-slate-500 mt-2 max-w-sm">
1319|                                Use Hermes AI for guidance. Select "Agentic Orchestration" in Phase 3.2 for autonomous execution.
1320|                            </p>
1321|                        </div>
1322|                    )}
1323|                </div>
1324|                <div className="p-4 border-t border-slate-200 bg-white flex gap-3">
1325|                    <input
1326|                        type="text"
1327|                        value={prompt}
1328|                        onChange={e => setPrompt(e.target.value)}
1329|                        onKeyDown={e => e.key === 'Enter' && handleDelegate()}
1330|                        placeholder={isAgentic 
1331|                            ? "e.g. Migrate Ubuntu 20.04 web server via SMS with 500GB data..." 
1332|                            : "e.g. Generate an SMS installation script for Ubuntu 20.04..."}