import React, { useState, useEffect, useMemo, useContext } from 'react';
import { formatShortDate, EditableCell } from '../../utils/helpers';
import { ERPContext } from '../../context/ERPContext';
import WaveZeroConfigModal from './WaveZeroConfigModal';

const executableTypes = ['ECS', 'BMS', 'VM', 'SERVER', 'RDS', 'GAUSSDB', 'DB', 'DATABASE'];

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState(project?.authValidated ? 'orchestrator' : 'readiness');
    const [sidebarOpen, setSidebarOpen] = useState(true); 
    
    // 🚨 Wave 0 Modal State
    const [showWaveZeroModal, setShowWaveZeroModal] = useState(false);
    const [runbookData, setRunbookData] = useState(null);
    const [showRunbookModal, setShowRunbookModal] = useState(false);
    
    // 🚨 DB-Backed State Machine
    const [executionState, setExecutionState] = useState(null);
    const [isLoadingState, setIsLoadingState] = useState(true);

    // Architectural Fork Logic
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
            } catch (e) { 
                console.error("State Fetch Error:", e); 
            } finally { 
                setIsLoadingState(false); 
            }
        };
        fetchState();
    }, [project?.id]);

    const updatePhase = async (newPhase, newStatus, pendingAction = null) => {
        setExecutionState(prev => ({ ...prev, currentPhase: newPhase, status: newStatus, pendingAction }));
        const token = localStorage.getItem('erp_jwt_token');
        await fetch(`/api/executions/${project.id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ phase: newPhase, status: newStatus, pendingAction })
        });
    };

    // Admin function to override project lifecycle phase
    const overrideProjectPhase = async (newLifecyclePhase) => {
        if (!confirm(`Are you sure you want to move this project to phase: ${newLifecyclePhase}? This will update the project's lifecycle state.`)) {
            return;
        }
        
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const response = await fetch(`/api/erp/projects/${project.id}/set-phase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ phase: newLifecyclePhase })
            });
            
            const data = await response.json();
            if (data.success) {
                alert(`✅ Project phase updated to: ${newLifecyclePhase}`);
                // Refresh the project data
                if (onUpdateProject) onUpdateProject();
            } else {
                alert(`❌ Failed to update phase: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    };

    // 🚨 Safe partial update for project data
    const safePartialUpdate = async (updates) => {
        if (!project?.id) return;
        const token = localStorage.getItem('erp_jwt_token');
        try {
            await fetch(`/api/erp/projects/${project.id}/partial`, {
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify(updates)
            });
            // Also update local context if onUpdateProject exists
            if (onUpdateProject) {
                Object.keys(updates).forEach(k => onUpdateProject(project.id, k, updates[k]));
            }
        } catch (e) { 
            console.error("Failed partial update:", e); 
            alert("Failed to save changes. Please try again.");
        }
    };

    // Execute Terraform (Dynamic for both Migration Wave 0 and Greenfield App Deploy)
    const handleExecuteTerraform = async (networkConfig = null) => {
        if (!project?.id) return;
        setShowWaveZeroModal(false);
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/execute`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ networkConfig })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) { 
                    alert(`✅ ${data.message}`); 
                    if (isGreenfield && executionState.currentPhase === 'PHASE_4_2') {
                        updatePhase('PHASE_4_3', 'PENDING');
                    } else if (!isGreenfield && executionState.currentPhase === 'PHASE_4_1') {
                        updatePhase('PHASE_4_2', 'PENDING');
                    } else if (!isGreenfield && executionState.currentPhase === 'PHASE_4_3') {
                        updatePhase('PHASE_4_4', 'PENDING');
                    }
                }
                else { alert(`❌ Execution Failed:\n\n${data.error}`); }
            }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    // 🚨 Dynamic Navigation Menu based on Project Type
    const menuItems = isGreenfield ? [
        { id: 'readiness', num: '4.0', icon: 'fa-user-lock', label: 'Readiness Gateway' },
        { id: 'orchestrator', num: '4.1-4.3', icon: 'fa-rocket', label: 'CI/CD Pipeline' },
        { id: 'hub', num: '4.4', icon: 'fa-stream', label: 'DevOps Command Center' }
    ] : [
        { id: 'readiness', num: '4.0', icon: 'fa-user-lock', label: 'Readiness Gateway' },
        { id: 'orchestrator', num: '4.1-4.6', icon: 'fa-cogs', label: 'Execution Pipeline' },
        { id: 'hub', num: '4.7', icon: 'fa-stream', label: 'Delivery Command Center' },
        { id: 'tam', num: '4.8', icon: 'fa-headset', label: 'TAM Service Governance' }
    ];

    if (isLoadingState) return <div className="p-12 text-center text-slate-400 font-bold"><i className="fas fa-circle-notch fa-spin mr-2"></i> Initializing State Machine...</div>;
    const isLocked = executionState?.currentPhase === 'PHASE_4_0';

    return (
        <div className="animate-fade-in pb-12 flex flex-col h-full">
            
            {showWaveZeroModal && (
                <WaveZeroConfigModal 
                    onClose={() => setShowWaveZeroModal(false)}
                    onConfirm={(config) => handleExecuteTerraform(config)} 
                />
            )}

            <div className="bg-white border-b border-slate-200 px-8 py-5 mb-6 rounded-t-2xl flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors">
                        <i className={`fas fa-chevron-${sidebarOpen ? 'left' : 'right'} ${sidebarOpen ? 'text-indigo-600' : ''}`}></i>
                    </button>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">
                            {isGreenfield ? "Cloud-Native Provisioning Engine" : "Execution Control Plane"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                {isGreenfield ? "Automated Infrastructure-as-Code CI/CD" : "Database-Backed 6-Phase Cloud Orchestrator"}
                            </p>
                            {isGreenfield && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-emerald-200">Greenfield Mode</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 px-4 lg:px-8 relative h-full">
                
                {/* Sidebar Navigation */}
                <div className={`shrink-0 space-y-2 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 hidden lg:block'}`}>
                    {menuItems.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => {
                                if (isLocked && item.id !== 'readiness') return alert("Please complete the 4.0 Readiness Gateway to unlock Execution.");
                                setSubTab(item.id);
                            }}
                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between group ${isLocked && item.id !== 'readiness' ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400' : subTab === item.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${isLocked && item.id !== 'readiness' ? 'bg-slate-200 text-slate-400' : subTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                    {item.num}
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                            {isLocked && item.id !== 'readiness' && <i className="fas fa-lock text-slate-300"></i>}
                        </button>
                    ))}
                    
                    {/* Admin Phase Override */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Admin Controls</div>
                        <div className="space-y-2">
                            <button 
                                onClick={() => {
                                    const phase = prompt("Enter target lifecycle phase (1_arb, 2_architecture, 3_planning, 4_execution, 5_postlive, 6_completed):");
                                    if (phase && ['1_arb', '2_architecture', '3_planning', '4_execution', '5_postlive', '6_completed'].includes(phase)) {
                                        overrideProjectPhase(phase);
                                    } else if (phase) {
                                        alert("Invalid phase. Must be one of: 1_arb, 2_architecture, 3_planning, 4_execution, 5_postlive, 6_completed");
                                    }
                                }}
                                className="w-full text-left px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all duration-200 flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-wrench text-[10px]"></i>
                                    <span className="font-black text-[10px] uppercase tracking-wider">Override Phase</span>
                                </div>
                                <i className="fas fa-chevron-right text-[10px] opacity-50 group-hover:opacity-100"></i>
                            </button>
                            <div className="text-[8px] text-slate-500 italic pl-1">
                                Updates project lifecycle state for retroactive projects
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 bg-transparent min-h-[700px] transition-all duration-300">
                    
                    {subTab === 'readiness' && (
                        <ReadinessGatewayView project={project} isGreenfield={isGreenfield} authLevel={authLevel} isZeroTrust={isZeroTrust} onApprove={() => { updatePhase('PHASE_4_1', 'PENDING'); setSubTab('orchestrator'); }} />
                    )}

                    {subTab === 'orchestrator' && executionState && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden p-8">
                                
                                {isGreenfield ? (
                                    /* 🚨 GREENFIELD PIPELINE (3 PHASES) 🚨 */
                                    <>
                                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_1' ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : executionState.currentPhase > 'PHASE_4_1' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Phase 4.1</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Cloud Foundation (Wave 0)</h4>
                                                    <p className="text-xs text-slate-400">Provisions isolated VPCs, Subnets, and Security Groups for the Cloud-Native workload.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_1' ? (
                                                    <button onClick={() => setShowWaveZeroModal(true)} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-network-wired mr-2"></i> Configure Network</button>
                                                ) : <div className="text-emerald-500"><i className="fas fa-check-circle text-2xl"></i></div>}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_2' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : executionState.currentPhase > 'PHASE_4_2' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Phase 4.2</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Infrastructure-as-Code Provisioning</h4>
                                                    <p className="text-xs text-slate-400">Compiles Blueprint into Terraform. Deploys ECS Clusters, RDS, and API Gateways via Huawei RFS.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_2' ? (
                                                    <button onClick={() => handleExecuteTerraform(null)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-play mr-2"></i> Deploy Terraform</button>
                                                ) : executionState.currentPhase > 'PHASE_4_2' || executionState.currentPhase === 'COMPLETED' ? <div className="text-blue-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all ${executionState.currentPhase === 'PHASE_4_3' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 4.3</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Configuration & Handoff</h4>
                                                    <p className="text-xs text-slate-400">Generates Access Endpoints, Kubeconfigs, and marks environment ready for Customer DevOps teams.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_3' ? (
                                                    <button onClick={() => updatePhase('COMPLETED', 'DONE')} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-flag-checkered mr-2"></i> Complete & Handoff</button>
                                                ) : executionState.currentPhase === 'COMPLETED' ? <div className="text-purple-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* 🚨 MIGRATION PIPELINE (6 PHASES) 🚨 */
                                    <>
                                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_1' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : executionState.currentPhase > 'PHASE_4_1' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Phase 4.1</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Wave 0: Network & Identity Foundation</h4>
                                                    <p className="text-xs text-slate-400">Executes Terraform to build isolated Transit VPCs, Subnets, and Security Groups required for Preflight networking.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_1' ? (
                                                    <button onClick={() => setShowWaveZeroModal(true)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-network-wired mr-2"></i> Configure & Execute</button>
                                                ) : <div className="text-blue-500"><i className="fas fa-check-circle text-2xl"></i></div>}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_2' ? 'border-amber-500 bg-slate-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : executionState.currentPhase > 'PHASE_4_2' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Phase 4.2</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Vector-Aware OS Pre-Flight</h4>
                                                    <p className="text-xs text-slate-400">Validates OS constraints. Connects over Wave 0 network to assess system matrices.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_2' ? (
                                                    <button onClick={() => updatePhase('PHASE_4_3', 'PENDING')} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-microscope mr-2"></i> Run OS Diagnostics</button>
                                                ) : executionState.currentPhase > 'PHASE_4_2' || executionState.currentPhase === 'COMPLETED' ? <div className="text-amber-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_3' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : executionState.currentPhase > 'PHASE_4_3' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 4.3</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Build App Landing Zone</h4>
                                                    <p className="text-xs text-slate-400">Provisions application VPCs, target ECS instances, and empty PaaS databases.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_3' ? (
                                                    <button onClick={() => handleExecuteTerraform(null)} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-cogs mr-2"></i> Deploy Infrastructure</button>
                                                ) : executionState.currentPhase > 'PHASE_4_3' || executionState.currentPhase === 'COMPLETED' ? <div className="text-purple-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_4' ? 'border-fuchsia-500 bg-slate-800 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : executionState.currentPhase > 'PHASE_4_4' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest mb-1">Phase 4.4</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Deploy Data Plane Agents</h4>
                                                    <p className="text-xs text-slate-400">Pushes SMS/DRS agents over the established Wave 0 network.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_4' ? (
                                                    <button onClick={() => updatePhase('PHASE_4_5', 'PENDING')} className="px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-satellite-dish mr-2"></i> Push Agents</button>
                                                ) : executionState.currentPhase > 'PHASE_4_4' || executionState.currentPhase === 'COMPLETED' ? <div className="text-fuchsia-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all mb-6 ${executionState.currentPhase === 'PHASE_4_5' ? 'border-indigo-500 bg-slate-800 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : executionState.currentPhase > 'PHASE_4_5' || executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Phase 4.5</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Continuous Sync Monitor</h4>
                                                    <p className="text-xs text-slate-400">Awaiting 100% byte-by-byte synchronization. Lock state before Cutover.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_5' ? (
                                                    <button onClick={() => updatePhase('PHASE_4_6', 'PENDING')} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-lock mr-2"></i> Lock Sync & Proceed</button>
                                                ) : executionState.currentPhase > 'PHASE_4_5' || executionState.currentPhase === 'COMPLETED' ? <div className="text-indigo-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all ${executionState.currentPhase === 'PHASE_4_6' ? 'border-rose-500 bg-slate-800 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : executionState.currentPhase === 'COMPLETED' ? 'border-slate-700 bg-slate-900/50 opacity-60' : 'hidden'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Phase 4.6</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Cold Cutover & VPC Promotion</h4>
                                                    <p className="text-xs text-slate-400">Severs on-premise connection and modifies Huawei Cloud VPC bindings.</p>
                                                </div>
                                                {executionState.currentPhase === 'PHASE_4_6' ? (
                                                    <button onClick={() => updatePhase('COMPLETED', 'DONE')} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black uppercase shadow-md"><i className="fas fa-power-off mr-2"></i> Execute Network Swap</button>
                                                ) : executionState.currentPhase === 'COMPLETED' ? <div className="text-rose-500"><i className="fas fa-check-circle text-2xl"></i></div> : null}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {executionState.currentPhase === 'COMPLETED' && (
                                    <div className="mt-8 bg-emerald-500/10 border border-emerald-500 p-6 rounded-xl text-center animate-fade-in">
                                        <i className="fas fa-check-double text-4xl text-emerald-500 mb-3"></i>
                                        <h3 className="font-black text-xl text-emerald-400">{isGreenfield ? "Cloud-Native Infrastructure Ready" : "Migration Pipeline Completed"}</h3>
                                        <p className="text-emerald-200 mt-2 text-sm">{isGreenfield ? "The application environment has been successfully provisioned." : "Servers are now live and attached to the Production VPC."} Please proceed to the Post-Live phase.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {subTab === 'hub' && <ExecutionHubView project={project} onUpdateProject={onUpdateProject} safePartialUpdate={safePartialUpdate} />}
                    {subTab === 'tam' && !isGreenfield && <TAMHubView project={project} onUpdateProject={onUpdateProject} safePartialUpdate={safePartialUpdate} />}
                </div>
            </div>
        </div>
    );
}

// 🚨 READINESS GATEWAY VIEW
function ReadinessGatewayView({ project, isGreenfield, authLevel, isZeroTrust, onApprove }) {
    const [pingStatus, setPingStatus] = useState('idle'); 
    const handlePing = (success) => { setPingStatus('pinging'); setTimeout(() => setPingStatus(success ? 'success' : 'failed'), 1500); };

    return (
        <div className="animate-fade-in p-8 h-full flex flex-col justify-center items-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 p-6 flex items-center justify-between border-b border-slate-700">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center"><i className="fas fa-shield-alt text-emerald-400 mr-3"></i> 4.0 Execution Readiness Gateway</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Verify Execution Credentials and Target Boundary</p>
                    </div>
                </div>
                
                <div className="p-8 space-y-8 bg-slate-50">
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black shrink-0"><i className="fas fa-check"></i></div>
                        <div>
                            <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest">1. Cloud Credentials Verified</h4>
                            <p className="text-xs text-slate-600 mt-1">
                                {isGreenfield 
                                    ? "Huawei Cloud credentials validated for greenfield deployment." 
                                    : "The system has validated the ephemeral STS token integration for Huawei Cloud."
                                }
                            </p>
                        </div>
                    </div>

                    {!isGreenfield && (
                        <div className="flex gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 transition-colors ${pingStatus === 'success' || isZeroTrust ? 'bg-emerald-100 text-emerald-600' : pingStatus === 'failed' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                {pingStatus === 'success' || isZeroTrust ? <i className="fas fa-check"></i> : pingStatus === 'failed' ? <i className="fas fa-times"></i> : "2"}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest">2. Source Connectivity Acid Test</h4>
                                {isZeroTrust ? (
                                    <div className="mt-2 text-xs text-slate-600">
                                        <p>Zero-Trust active. Data plane agents will be deployed manually via Customer Runbooks.</p>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-slate-600">
                                        <p>The system requires connectivity verification to the source environment.</p>
                                        {pingStatus === 'idle' && (
                                            <div className="mt-4 flex gap-3">
                                                <button onClick={() => handlePing(true)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">Run Ping</button>
                                            </div>
                                        )}
                                        {pingStatus === 'success' && <p className="text-emerald-700 font-black mt-3">Access Verified</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-200">
                        <button onClick={onApprove} disabled={!isGreenfield && !isZeroTrust && pingStatus !== 'success'} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors">
                            Acknowledge & Unlock Engine <i className="fas fa-unlock ml-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// 🚨 FINOPS HUB (With Optional Chaining enforced)
function ExecutionHubView({ project, onUpdateProject, safePartialUpdate }) {
    const [comms, setComms] = useState(project?.comms || { bridge: "", chat: "", notes: "" });
    useEffect(() => { setComms(project?.comms || { bridge: "", chat: "", notes: "" }); }, [project]);
    const mrr = project?.mrr || project?.budget?.mrr || 5000; 
    const overheadBudget = mrr * 0.15; 
    const currentBurn = (project?.mapperNodes || []).length * 45; 
    const handleSaveComms = () => { if (safePartialUpdate) safePartialUpdate({ comms }); else onUpdateProject(project?.id, 'comms', comms); alert("Command Center Links Updated"); };

    return (
        <div className="animate-fade-in space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden p-8">
                <div className="flex justify-between items-end mb-6 border-b border-slate-200 pb-4">
                    <div>
                        <h3 className="font-black text-lg tracking-wide text-slate-800"><i className="fas fa-wallet text-emerald-500 mr-2"></i> Migration Overlap Buffer</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Tracking overlapping compute, NATs, and Data Plane EIPs.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-800">${overheadBudget.toLocaleString()}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allocated Buffer (15% MRR)</div>
                    </div>
                </div>
                <div className="relative pt-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2"><span className={`${currentBurn > overheadBudget ? 'text-rose-500' : 'text-blue-600'}`}>Current Burn: ${currentBurn.toLocaleString()}</span></div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner flex"><div className={`h-full transition-all duration-500 ${currentBurn > overheadBudget ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (currentBurn / overheadBudget) * 100)}%` }}></div></div>
                </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
                    <div><h3 className="font-black text-sm tracking-wide text-slate-800"><i className="fas fa-satellite-dish text-blue-600 mr-2"></i> Delivery Command Center</h3></div>
                    <button onClick={handleSaveComms} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors">Save Links</button>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Persistent Bridge Link (Teams/Zoom/Meet)</label><input type="text" value={comms.bridge} onChange={e=>setComms({...comms, bridge: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white" placeholder="https://teams.microsoft.com/..." /></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Group Chat / WhatsApp Link</label><input type="text" value={comms.chat} onChange={e=>setComms({...comms, chat: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white" placeholder="https://chat.whatsapp.com/..." /></div>
                    </div>
                    <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Execution Notes / Escalation Path</label><textarea value={comms.notes} onChange={e=>setComms({...comms, notes: e.target.value})} className="w-full h-32 p-4 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-white custom-scrollbar resize-none" placeholder="PM Name: Maria..."></textarea></div>
                </div>
            </div>
            <SingleProjectGantt project={project} />
        </div>
    )
}

function SingleProjectGantt({ project }) {
    const timelineData = useMemo(() => {
        const kickoffStr = project?.kickoff || project?.kickoffDate || project?.startDate; 
        const targetStr = project?.date || project?.targetDate || project?.goLiveDate;
        if(!kickoffStr || !targetStr || kickoffStr==='Pending' || targetStr==='TBD') return null;
        const start = new Date(kickoffStr); const end = new Date(targetStr);
        if(isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
        const pad = 10 * 24 * 60 * 60 * 1000; const min = start.getTime() - pad; const max = end.getTime() + pad; const total = max - min;
        const pStart = ((start.getTime() - min) / total) * 100; const pWidth = ((end.getTime() - start.getTime()) / total) * 100;
        return { pStart, pWidth, startStr: formatShortDate(kickoffStr), endStr: formatShortDate(targetStr) };
    }, [project]);

    return (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
            <h3 className="font-black text-sm text-slate-800 mb-6 flex items-center uppercase tracking-widest"><i className="fas fa-stream text-amber-500 mr-3"></i> Project Timeline Baseline</h3>
            {!timelineData ? <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed border-slate-300 rounded-xl bg-white text-xs">Valid Kickoff and Go-Live dates required.</div> : (
                <div className="overflow-x-auto w-full"><div className="min-w-[800px] relative h-[120px]"><div className="absolute inset-0 flex justify-between opacity-20 pointer-events-none">{[...Array(6)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div><div className="relative z-10 pt-8"><div className="h-12 relative bg-white border-y border-transparent rounded-xl shadow-sm"><div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-4" style={{ left: `${timelineData.pStart}%` }}>{timelineData.startStr}</div><div className={`absolute top-1 bottom-1 rounded-lg shadow-md border-2 flex flex-col justify-center px-4 overflow-hidden ${project?.health === 'Green' ? 'bg-emerald-500 border-emerald-600 text-white' : project?.health === 'Red' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`} style={{ left: `${timelineData.pStart}%`, width: `${timelineData.pWidth}%`, minWidth:'80px'}}><span className="text-xs font-black truncate">{project?.progress || '0%'} Complete</span></div><div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-800 top-1/2 -translate-y-1/2 pl-4" style={{ left: `${timelineData.pStart + timelineData.pWidth}%` }}>{timelineData.endStr}</div></div></div></div></div>
            )}
        </div>
    )
}


function TAMHubView({ project, onUpdateProject, safePartialUpdate }) {
    const safeTamData = project?.tamData || { supportPlan: "Enterprise", welinkGroup: "", tickets: [], workshops: [{id: 1, name: "Cloud Console 101", done: false}, {id: 2, name: "IAM & Security Best Practices", done: false}] };
    const [tamData, setTamData] = useState(safeTamData);
    useEffect(() => { setTamData(project?.tamData || safeTamData); }, [project]);
    const handleSave = () => { if (safePartialUpdate) safePartialUpdate({ tamData }); else onUpdateProject(project?.id, 'tamData', tamData); alert("TAM Operations Data Saved."); };
    
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <h3 className="font-black text-lg tracking-wide text-slate-800"><i className="fas fa-headset text-blue-500 mr-2"></i> TAM Service Governance</h3>
                <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md">Save Operations Data</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Contracted Support Plan</label>
                    <select value={tamData.supportPlan} onChange={e=>setTamData({...tamData, supportPlan: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"><option>Developer</option><option>Business</option><option>Enterprise</option><option>Premier</option></select>
                </div>
                <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Internal WeLink Group (NOC)</label>
                    <input type="text" value={tamData.welinkGroup} onChange={e=>setTamData({...tamData, welinkGroup: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50" placeholder="welink://group/12345" />
                </div>
            </div>
        </div>
    );
}