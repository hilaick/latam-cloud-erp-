import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('orchestrator');
    const [showMasterGuide, setShowMasterGuide] = useState(false);
    
    // 🚨 DRIFT ALERT STATE
    const [driftAlert, setDriftAlert] = useState(true);
    
    const execStatus = project.execStatus || 'pending'; 
    const authLevel = project.authLevel || 'Read-Only (Customer Managed)';
    
    // Extract EPS safely and determine isolation mode
    const sandboxEpsRaw = project.sandboxEps?.trim() || '';
    const prodEpsRaw = project.prodEps?.trim() || '';
    const isVpcIsolationMode = !sandboxEpsRaw || !prodEpsRaw;

    const getStrategyDetails = () => {
        if (authLevel.includes('Cloud Admin API')) return { icon: 'fa-cloud', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'Automated Agentless Push via SSM/Run-Command. Control Plane active.' };
        if (authLevel.includes('Active Directory')) return { icon: 'fa-windows', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'Automated GPO/WinRM batch push. Centralized Data Plane active.' };
        if (authLevel.includes('Local OS Admin')) return { icon: 'fa-terminal', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'Automated SSH/WinRM Injection loop. Sequential Data Plane active.' };
        return { icon: 'fa-user-shield', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', text: 'Zero Trust. Generating custom Runbooks for customer manual execution.' };
    };
    
    const strategy = getStrategyDetails();

    const advanceStatus = (newStatus) => {
        onUpdateProject(project.id, 'execStatus', newStatus);
        // Reset drift alert for demo purposes if we move back to syncing
        if (newStatus === 'syncing') setDriftAlert(true);
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-12 animate-fade-in relative space-y-6">
            
            {/* INTEGRATED TAB NAVIGATION */}
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6 flex-wrap">
                <button 
                    onClick={() => setSubTab('orchestrator')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'orchestrator' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-cogs mr-2"></i> 1. Execution Orchestrator
                </button>
                <button 
                    onClick={() => setSubTab('hub')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'hub' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-stream mr-2"></i> 2. Delivery Command Center
                </button>
                <button 
                    onClick={() => setSubTab('tam')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'tam' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-headset mr-2"></i> 3. TAM Service Governance
                </button>
            </div>

            {/* TAB 1: EXECUTION ORCHESTRATOR */}
            {subTab === 'orchestrator' && (
                <div className="space-y-6 animate-fade-in">
                    {/* DYNAMIC VPC ISOLATION WARNING */}
                    {isVpcIsolationMode && (
                        <div className="bg-amber-100 border border-amber-300 text-amber-800 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-sm animate-fade-in">
                            <i className="fas fa-exclamation-triangle mr-3 text-amber-600 text-lg"></i> 
                            <div>
                                <div>VPC Isolation Fallback Active</div>
                                <div className="text-[10px] font-bold text-amber-700/70 lowercase tracking-normal mt-0.5">Enterprise Project (EPS) missing. ERP reverting to isolated Sandbox VPC methodology.</div>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                        
                        <div className="px-8 py-6 border-b border-slate-700 flex justify-between items-center relative z-10">
                            <div>
                                <h3 className="font-black text-2xl text-white flex items-center gap-3"><i className="fas fa-rocket text-indigo-400"></i> Execution Orchestrator</h3>
                                <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Day-1 Landing Zone Provisioning & Automation</p>
                            </div>
                            <button onClick={() => setShowMasterGuide(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors border border-indigo-500">
                                <i className="fas fa-book-open mr-2"></i> Master Execution Guide
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 relative z-10">
                            <div className="p-8 border-r border-slate-700 bg-slate-800/50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Credential Decision Matrix</h4>
                                <div className={`p-5 rounded-xl border ${strategy.border} ${strategy.bg} mb-6`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <i className={`fas ${strategy.icon} ${strategy.color} text-2xl`}></i>
                                        <div className={`text-sm font-black ${strategy.color}`}>{authLevel}</div>
                                    </div>
                                    <div className="text-xs text-slate-600 font-medium leading-relaxed">{strategy.text}</div>
                                </div>

                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2 mt-8">Execution Boundaries</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Target Sandbox Boundary</label>
                                        <div className={`text-xs font-mono px-3 py-2 rounded border shadow-inner ${sandboxEpsRaw ? 'text-amber-400 bg-slate-900 border-slate-700' : 'text-amber-800 bg-amber-100 border-amber-300'}`}>
                                            {sandboxEpsRaw ? `EPS: ${sandboxEpsRaw}` : 'Isolated Sandbox VPC'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Target Production Boundary</label>
                                        <div className={`text-xs font-mono px-3 py-2 rounded border shadow-inner ${prodEpsRaw ? 'text-emerald-400 bg-slate-900 border-slate-700' : 'text-emerald-800 bg-emerald-100 border-emerald-300'}`}>
                                            {prodEpsRaw ? `EPS: ${prodEpsRaw}` : 'Production VPC'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 lg:col-span-2 space-y-6">
                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'pending' ? 'border-amber-500 bg-slate-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Phase 1</div>
                                            <h4 className="text-lg font-black text-white mb-2">Build RFS Landing Zone</h4>
                                            <p className="text-xs text-slate-400">Compiles the JSON blueprint into Terraform and pushes infrastructure to the {sandboxEpsRaw ? 'Sandbox EPS' : 'Isolated Sandbox VPC'}.</p>
                                        </div>
                                        {execStatus === 'pending' ? (
                                            <button onClick={() => advanceStatus('sandbox_built')} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"><i className="fas fa-play mr-2"></i> Execute RFS</button>
                                        ) : (
                                            <div className="text-amber-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        )}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'sandbox_built' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Phase 2</div>
                                            <h4 className="text-lg font-black text-white mb-2">Deploy Migration Agents</h4>
                                            <p className="text-xs text-slate-400">Executes the `{authLevel}` deployment strategy across source servers.</p>
                                        </div>
                                        {execStatus === 'sandbox_built' && authLevel.includes('Read-Only') ? (
                                            <button onClick={() => { alert("Generating Custom Copy-Paste Runbooks for Customer IT Team..."); advanceStatus('syncing'); }} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-slate-500"><i className="fas fa-file-code mr-2"></i> Generate Scripts</button>
                                        ) : execStatus === 'sandbox_built' ? (
                                            <button onClick={() => advanceStatus('syncing')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"><i className="fas fa-project-diagram mr-2"></i> Push Agents</button>
                                        ) : execStatus !== 'pending' ? (
                                            <div className="text-blue-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'syncing' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-6">
                                            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 3</div>
                                            <h4 className="text-lg font-black text-white mb-2">Continuous Sync & Drift Monitor</h4>
                                            <p className="text-xs text-slate-400">Polling `task_poll_latest.json`. Continuous checks running to detect source environment drift before cutover.</p>
                                            
                                            {/* 🚨 DRIFT DETECTION FEATURE */}
                                            {execStatus === 'syncing' && driftAlert && (
                                                <div className="mt-5 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 animate-pulse">
                                                    <div className="flex items-start gap-3">
                                                        <i className="fas fa-radar text-rose-500 text-xl mt-0.5"></i>
                                                        <div>
                                                            <h5 className="font-black text-rose-400 text-sm">Drift Detection: Unauthorized Modification</h5>
                                                            <p className="text-[11px] text-rose-200/70 mt-1 font-medium leading-relaxed">
                                                                Unexpected ECS instance <span className="font-mono text-white">dev-test-ubuntu (10.0.1.99)</span> detected in Target VPC. Does not match approved SOW baseline.
                                                            </p>
                                                            <div className="flex gap-3 mt-4">
                                                                <button onClick={() => { alert("API Call: Forcing deletion of unauthorized instance to maintain SOW compliance..."); setDriftAlert(false); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-md">
                                                                    <i className="fas fa-fire mr-1"></i> Auto-Revert (Destroy VM)
                                                                </button>
                                                                <button onClick={() => { alert("Drift Alert routed to TAM Governance Board."); setDriftAlert(false); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-rose-500/50 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                                                                    <i className="fas fa-headset mr-1"></i> Alert TAM
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {execStatus === 'syncing' ? (
                                            <button onClick={() => advanceStatus('cutover_ready')} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap"><i className="fas fa-forward mr-2"></i> Simulate Sync Complete</button>
                                        ) : ['cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-purple-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'cutover_ready' ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Phase 4</div>
                                            <h4 className="text-lg font-black text-white mb-2">Production Cutover & Optimization</h4>
                                            <p className="text-xs text-slate-400">Promotes resources from Sandbox to {prodEpsRaw ? 'Production EPS' : 'Production VPC'}. Rebinds EIPs, validates Security Groups, and destroys Sandbox.</p>
                                        </div>
                                        {execStatus === 'cutover_ready' ? (
                                            <button onClick={() => advanceStatus('completed')} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap"><i className="fas fa-power-off mr-2"></i> Execute Cutover</button>
                                        ) : execStatus === 'completed' ? (
                                            <div className="text-emerald-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>
                                
                                {execStatus === 'completed' && (
                                    <div className="pt-4 flex justify-end">
                                        <button onClick={onPromote} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all animate-bounce"><i className="fas fa-flag-checkered mr-2"></i> Handover Complete</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: DELIVERY COMMAND CENTER */}
            {subTab === 'hub' && <ExecutionHubView project={project} onUpdateProject={onUpdateProject} />}

            {/* TAB 3: TAM SERVICE GOVERNANCE */}
            {subTab === 'tam' && <TAMHubView project={project} onUpdateProject={onUpdateProject} />}

            {/* MASTER EXECUTION GUIDE (Drawer) */}
            {showMasterGuide && (
                <div className="fixed inset-y-0 right-0 w-full sm:w-[800px] bg-white shadow-2xl border-l border-slate-200 z-[10000] flex flex-col animate-slide-left overflow-hidden">
                    <div className="bg-indigo-600 text-white p-6 border-b border-indigo-700 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-black text-xl"><i className="fas fa-book-open mr-2"></i> Execution & Provisioning Master Guide</h3>
                            <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-1">Bridging the Cloud API Plane with the OS-level Data Plane</p>
                        </div>
                        <button onClick={()=>setShowMasterGuide(false)} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times text-2xl"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 text-sm text-slate-700 leading-relaxed custom-scrollbar">
                        
                        <div className="space-y-4">
                            <h4 className="font-black text-indigo-900 text-lg border-b border-indigo-200 pb-2">1. The Operational Control vs. Data Plane Framework</h4>
                            <p>When the ERP orchestrates a migration, it operates across two entirely isolated execution vectors depending on the credential tiers provided by the customer profile.</p>
                            <div className="bg-slate-900 text-emerald-400 p-5 rounded-xl overflow-x-auto font-mono text-[10px] sm:text-xs shadow-inner leading-snug">
<pre>{`       ┌────────────────────────────────────────────────────────┐
       │             LATAM CLOUD ERP CORE ENGINE                │
       └───────────────────────────┬────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
 ┌───────────────┐                                   ┌───────────────┐
 │ CONTROL PLANE │ [Cloud Management API]            │  DATA PLANE   │ [OS-Level Tunneling]
 └───────┬───────┘                                   └───────┬───────┘
         │ (AWS AK/SK, Azure SP, vCenter)                    │ (SSH Key, local Admin)
         ▼                                                   ▼
┌─────────────────┐                                 ┌─────────────────┐
│ Cloud Providers │ (AWS, Azure, vCenter API)       │ Target Guest OS │ (Direct VM Access)
└────────┬────────┘                                 └────────┬────────┘
         │                                                   │
         └─────────────► [ AUTOMATED AGENT DEPLOYMENT ] ◄────┘`}</pre>
                            </div>
                            <ul className="list-disc pl-5 space-y-2 text-xs">
                                <li><strong>The Control Plane Vector:</strong> Utilizing Cloud Native remote management (e.g., AWS Systems Manager). If Cloud Administrator permissions are granted, the ERP speaks natively to the hyperscaler backend. Zero OS passwords or SSH keys are handled by our platform.</li>
                                <li><strong>The Data Plane Vector:</strong> Operating over the traditional network layer. If the customer whitelists our platform IP, the ERP opens an encrypted socket (Port 22/SSH or Port 5985/WinRM). The pipeline drops the signed binary into a temporary storage sector and executes.</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-black text-indigo-900 text-lg border-b border-indigo-200 pb-2">2. The Credential Decision Matrix</h4>
                            <p>The orchestration engine dynamically shifts its deployment runbook strategy based on the depth of validation keys recorded in the Customer Profile Vault.</p>
                            <div className="bg-slate-900 text-amber-400 p-5 rounded-xl overflow-x-auto font-mono text-[10px] sm:text-xs shadow-inner leading-snug">
<pre>{`                  ┌──────────────────────────────┐
                  │ Assess Customer Credentials  │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
 ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
 │  Cloud Admin  │       │ Domain Admin  │       │  Local Admin  │
 └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
         ▼                       ▼                       ▼
 ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
 │ Control Plane │       │ PowerShell/GPO│       │ Loop SSH/WinRM│
 │ Native Push   │       │ Batch Push    │       │ Per Node      │
 └───────────────┘       └───────────────┘       └───────────────┘`}</pre>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-black text-indigo-900 text-lg border-b border-indigo-200 pb-2">
                                3. {isVpcIsolationMode ? 'Sandbox VPC Isolation (Fallback Mode)' : 'Multi-Tiered Vault & Sandbox (EPS) Isolation'}
                            </h4>
                            <p>To minimize risk and guarantee zero blast-radius to production environments, the ERP enforces strict boundary isolation.</p>
                            
                            {isVpcIsolationMode ? (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 leading-relaxed shadow-sm">
                                    <h5 className="font-black uppercase tracking-widest mb-2"><i className="fas fa-exclamation-triangle"></i> VPC Isolation Active</h5>
                                    <p>Because the commercial team did not secure a Huawei Cloud Enterprise Project (EPS) prior to execution, the ERP has automatically fallen back to <strong>VPC Isolation Mode</strong>.</p>
                                    <ul className="list-disc pl-5 mt-2 space-y-1">
                                        <li><strong>Sandbox Phase:</strong> Target resources are built in an entirely separate, non-peered Sandbox VPC. Replication data flows here safely.</li>
                                        <li><strong>Cutover Phase:</strong> Following sign-off, the ERP dynamically re-maps Subnets, EIPs, and Security Groups to the primary Production VPC and terminates the Sandbox.</li>
                                    </ul>
                                </div>
                            ) : (
                                <div className="bg-slate-900 text-rose-400 p-5 rounded-xl overflow-x-auto font-mono text-[10px] sm:text-xs shadow-inner leading-snug">
<pre>{`        DAY 0: ASSESSMENT     │      DAY 1: EXECUTION      │   DAY 2: HANDOVER
                              │                            │
      [ 🔑 TIER 1 KEY ]       │      [ 🔑 TIER 2 KEY ]     │  [ 🔑 TIER 3 KEY ]
      Global Read-Only        │     Sandbox EPS Admin      │   Prod EPS Admin
                              │                            │
 ┌─────────────────────────┐  │  ┌──────────────────────┐  │ ┌────────────────┐
 │ MgC Discovery Engine    │  │  │ SMS Sync Workers     │  │ │ Cutover Binding│
 │ Source Network Mapping  │──┼─►│ RFS Landing Zone     │──┼►│ Prod SGs / EIP │
 │ Target Sizing Scans     │  │  │ Temp VPNs / NATs     │  │ │ Teardown Temp  │
 └─────────────────────────┘  │  └──────────────────────┘  │ └────────────────┘`}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🚀 DELIVERY COMMAND CENTER COMPONENT
// ==========================================
function ExecutionHubView({ project, onUpdateProject }) {
    const [comms, setComms] = useState(project.comms || { bridge: "", chat: "", notes: "" });
    useEffect(() => { setComms(project.comms || { bridge: "", chat: "", notes: "" }); }, [project]);
    
    const handleSaveComms = () => { 
        onUpdateProject(project.id, 'comms', comms); 
        alert("Command Center Links Updated"); 
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-sm tracking-wide text-amber-900"><i className="fas fa-satellite-dish text-amber-600 mr-2"></i> Delivery Command Center</h3>
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mt-1">Centralized Execution Communications</p>
                    </div>
                    <button onClick={handleSaveComms} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-save mr-2"></i>Save Links</button>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white">
                    <div className="col-span-2 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Persistent Bridge Link (Teams/Zoom/Meet)</label>
                            <div className="flex gap-2">
                                <input type="text" value={comms.bridge} onChange={e=>setComms({...comms, bridge: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-amber-500 bg-slate-50" placeholder="https://teams.microsoft.com/..." />
                                <a href={comms.bridge || '#'} target="_blank" rel="noreferrer" className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-colors"><i className="fas fa-video"></i> Join</a>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Group Chat / Slack / WhatsApp Link</label>
                            <div className="flex gap-2">
                                <input type="text" value={comms.chat} onChange={e=>setComms({...comms, chat: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-amber-500 bg-slate-50" placeholder="https://chat.whatsapp.com/..." />
                                <a href={comms.chat || '#'} target="_blank" rel="noreferrer" className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-colors"><i className="fas fa-comment-dots"></i> Chat</a>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Execution Notes / Escalation Path</label>
                        <textarea value={comms.notes} onChange={e=>setComms({...comms, notes: e.target.value})} className="w-full h-32 p-4 border border-amber-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 bg-amber-50/50 custom-scrollbar leading-relaxed resize-none shadow-inner" placeholder="PM Name: Maria&#10;Escalation: CIO (john@corp.com)"></textarea>
                    </div>
                </div>
            </div>
            <SingleProjectGantt project={project} />
        </div>
    )
}

function SingleProjectGantt({ project }) {
    const timelineData = useMemo(() => {
        if(!project.kickoff || !project.date || project.kickoff==='Pending' || project.date==='TBD') return null;
        const start = new Date(project.kickoff); const end = new Date(project.date);
        if(isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
        const pad = 10 * 24 * 60 * 60 * 1000;
        const min = start.getTime() - pad; const max = end.getTime() + pad; const total = max - min;
        const pStart = ((start.getTime() - min) / total) * 100; const pWidth = ((end.getTime() - start.getTime()) / total) * 100;
        return { pStart, pWidth, startStr: formatShortDate(project.kickoff), endStr: formatShortDate(project.date) };
    }, [project]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in">
            <h3 className="font-black text-sm text-slate-800 mb-6 flex items-center uppercase tracking-widest"><i className="fas fa-stream text-amber-500 mr-3"></i> Project Timeline Baseline</h3>
            {!timelineData ? <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-xs">Valid Kickoff and Go-Live dates required to render timeline.</div> : (
                <div className="overflow-x-auto w-full">
                    <div className="min-w-[800px] relative h-[120px]">
                        <div className="absolute inset-0 flex justify-between opacity-20 pointer-events-none">{[...Array(6)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                        <div className="relative z-10 pt-8">
                            <div className="h-12 relative bg-slate-50 border-y border-transparent transition-colors rounded-xl shadow-inner">
                                <div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-4" style={{ left: `${timelineData.pStart}%` }}>{timelineData.startStr}</div>
                                <div className={`absolute top-1 bottom-1 rounded-lg shadow-md border-2 flex flex-col justify-center px-4 overflow-hidden ${project.health === 'Green' ? 'bg-emerald-500 border-emerald-600 text-white' : project.health === 'Red' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`} style={{ left: `${timelineData.pStart}%`, width: `${timelineData.pWidth}%`, minWidth:'80px'}}>
                                    <span className="text-xs font-black truncate">{project.progress} Complete</span>
                                </div>
                                <div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-800 top-1/2 -translate-y-1/2 pl-4" style={{ left: `${timelineData.pStart + timelineData.pWidth}%` }}>{timelineData.endStr}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ==========================================
// 🎧 TAM SERVICE GOVERNANCE COMPONENT
// ==========================================
function TAMHubView({ project, onUpdateProject }) {
    const safeTamData = project.tamData || { 
        supportPlan: "Enterprise", welinkGroup: "", 
        tickets: [], 
        workshops: [
            {id: 1, name: "Cloud Console 101", done: false}, 
            {id: 2, name: "IAM & Security Best Practices", done: false}, 
            {id: 3, name: "Billing & Cost Center Setup", done: false}
        ] 
    };
    const [tamData, setTamData] = useState(safeTamData);
    
    useEffect(() => { setTamData(project.tamData || safeTamData); }, [project]);
    
    const handleSave = () => { 
        onUpdateProject(project.id, 'tamData', tamData); 
        alert("TAM Operations Data Saved."); 
    };
    
    const toggleWorkshop = (id) => { 
        const w = (tamData.workshops||[]).map(x => x.id === id ? {...x, done: !x.done} : x); 
        setTamData({...tamData, workshops: w}); 
    };
    
    const addTicket = () => { 
        const id = prompt("Ticket ID (e.g., SR-123):"); 
        if(!id) return; 
        const title = prompt("Issue Title:"); 
        setTamData({...tamData, tickets: [{id, title, sev: 'Medium', status: 'Open'}, ...(tamData.tickets||[])]}); 
    };

    return (
        <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-headset text-blue-400 mr-3"></i> TAM Service Governance</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Customer Enablement & Escalation Routing</p>
                    </div>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">
                        <i className="fas fa-save mr-2"></i> Save Operations Data
                    </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    
                    {/* Card 1: Escalation & Plans */}
                    <div className="p-8 bg-slate-50 space-y-6">
                        <div><h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-widest"><i className="fas fa-sitemap text-slate-400 mr-2"></i> Escalation Pathways</h4></div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Contracted Support Plan</label>
                            <select value={tamData.supportPlan} onChange={e=>setTamData({...tamData, supportPlan: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white cursor-pointer shadow-sm">
                                <option>Developer</option><option>Business</option><option>Enterprise</option><option>Premier</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Internal WeLink Group (NOC/Escalations)</label>
                            <div className="flex gap-2">
                                <input type="text" value={tamData.welinkGroup} onChange={e=>setTamData({...tamData, welinkGroup: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white shadow-sm" placeholder="welink://group/12345" />
                                <a href={tamData.welinkGroup || '#'} target="_blank" rel="noreferrer" className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center transition-colors"><i className="fas fa-external-link-alt"></i></a>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">External Customer Comms (WhatsApp/Teams)</label>
                            <input type="text" value={project.comms?.chat || ''} disabled className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-500 bg-slate-100 cursor-not-allowed shadow-inner" title="Edit in Command Center tab" placeholder="No link provided in Command Center" />
                        </div>
                    </div>

                    {/* Card 2: Enablement Tracker */}
                    <div className="p-8 bg-white space-y-6">
                        <div>
                            <h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-widest"><i className="fas fa-graduation-cap text-blue-500 mr-2"></i> Cloud Enablement Tracker</h4>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-4">Tracking hands-on workshops prevents post-live churn and documents TAM educational effort.</p>
                        </div>
                        
                        <div className="space-y-3">
                            {(tamData.workshops||[]).map(w => (
                                <label key={w.id} className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors shadow-sm ${w.done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}`}>
                                    <input type="checkbox" checked={w.done} onChange={()=>toggleWorkshop(w.id)} className="w-5 h-5 accent-emerald-500" />
                                    <span className={`font-bold text-xs ${w.done ? 'text-emerald-800 line-through opacity-75' : 'text-slate-700'}`}>{w.name}</span>
                                </label>
                            ))}
                            <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-600 text-[10px] uppercase tracking-widest transition-colors" onClick={() => {
                                const name = prompt("Enter custom workshop name:");
                                if(name) setTamData({...tamData, workshops: [...tamData.workshops, {id: Date.now(), name, done: false}]});
                            }}>
                                <i className="fas fa-plus mr-2"></i> Add Workshop
                            </button>
                        </div>
                    </div>

                    {/* Card 3: Tickets */}
                    <div className="p-8 bg-slate-50 flex flex-col h-full min-h-[400px]">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-3 mb-4 shrink-0">
                            <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest"><i className="fas fa-ticket-alt text-rose-500 mr-2"></i> Migration Support Tickets</h4>
                            <button onClick={addTicket} className="text-[10px] font-black uppercase tracking-widest text-blue-700 hover:text-white bg-blue-100 hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-700 transition-colors shadow-sm"><i className="fas fa-plus mr-1"></i> Log Ticket</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {(!tamData.tickets || tamData.tickets.length === 0) ? (
                                <div className="p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl bg-white text-xs shadow-sm">No active escalations.</div> 
                            ) : (
                                tamData.tickets.map((t,i) => (
                                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-[10px] text-slate-500 font-bold group-hover:text-blue-600 transition-colors">{t.id}</div>
                                            <div className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 tracking-widest">{t.status}</div>
                                        </div>
                                        <div className="font-bold text-xs text-slate-800 leading-snug">{t.title}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
