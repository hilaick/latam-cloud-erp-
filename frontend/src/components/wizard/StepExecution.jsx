import React, { useState } from 'react';

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [showMasterGuide, setShowMasterGuide] = useState(false);
    
    const execStatus = project.execStatus || 'pending'; // pending -> sandbox_built -> agent_push -> syncing -> cutover
    const authLevel = project.authLevel || 'Read-Only (Customer Managed)';
    const sandboxEps = project.sandboxEps || 'Not Configured';
    const prodEps = project.prodEps || 'Not Configured';

    const getStrategyDetails = () => {
        if (authLevel.includes('Cloud Admin API')) return { icon: 'fa-cloud', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'Automated Agentless Push via SSM/Run-Command. Control Plane active.' };
        if (authLevel.includes('Active Directory')) return { icon: 'fa-windows', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'Automated GPO/WinRM batch push. Centralized Data Plane active.' };
        if (authLevel.includes('Local OS Admin')) return { icon: 'fa-terminal', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'Automated SSH/WinRM Injection loop. Sequential Data Plane active.' };
        return { icon: 'fa-user-shield', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', text: 'Zero Trust. Generating custom Runbooks for customer manual execution.' };
    };
    
    const strategy = getStrategyDetails();

    const advanceStatus = (newStatus) => {
        onUpdateProject(project.id, 'execStatus', newStatus);
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in relative space-y-6">
            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                
                <div className="px-8 py-6 border-b border-slate-700 flex justify-between items-center relative z-10">
                    <div>
                        <h3 className="font-black text-2xl text-white flex items-center gap-3"><i className="fas fa-rocket text-indigo-400"></i> Execution Orchestrator</h3>
                        <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Day-1 Landing Zone Provisioning & MgC Automation</p>
                    </div>
                    <button onClick={() => setShowMasterGuide(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors border border-indigo-500">
                        <i className="fas fa-book-open mr-2"></i> Master Execution Guide
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 relative z-10">
                    {/* LEFT COLUMN: STRATEGY MATRIX */}
                    <div className="p-8 border-r border-slate-700 bg-slate-800/50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Credential Decision Matrix</h4>
                        <div className={`p-5 rounded-xl border ${strategy.border} ${strategy.bg} mb-6`}>
                            <div className="flex items-center gap-3 mb-3">
                                <i className={`fas ${strategy.icon} ${strategy.color} text-2xl`}></i>
                                <div className={`text-sm font-black ${strategy.color}`}>{authLevel}</div>
                            </div>
                            <div className="text-xs text-slate-600 font-medium leading-relaxed">{strategy.text}</div>
                        </div>

                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2 mt-8">Active Directory Variables</h4>
                        <div className="space-y-4">
                            <div><label className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Target Sandbox EPS</label><div className="text-xs font-mono text-amber-400 bg-slate-900 px-3 py-2 rounded border border-slate-700">{sandboxEps}</div></div>
                            <div><label className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Target Production EPS</label><div className="text-xs font-mono text-emerald-400 bg-slate-900 px-3 py-2 rounded border border-slate-700">{prodEps}</div></div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PIPELINE EXECUTION */}
                    <div className="p-8 lg:col-span-2 space-y-6">
                        {/* Phase 1: Landing Zone */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'pending' ? 'border-amber-500 bg-slate-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Phase 1</div>
                                    <h4 className="text-lg font-black text-white mb-2">Build RFS Landing Zone</h4>
                                    <p className="text-xs text-slate-400">Compiles the JSON blueprint into Terraform and pushes VPCs, Subnets, and temp nodes to the Sandbox EPS.</p>
                                </div>
                                {execStatus === 'pending' ? (
                                    <button onClick={() => advanceStatus('sandbox_built')} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"><i className="fas fa-play mr-2"></i> Execute RFS</button>
                                ) : (
                                    <div className="text-amber-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                )}
                            </div>
                        </div>

                        {/* Phase 2: Agent Push */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'sandbox_built' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Phase 2</div>
                                    <h4 className="text-lg font-black text-white mb-2">Deploy SMS / MgC Agents</h4>
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

                        {/* Phase 3: Drift & Sync */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'syncing' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 3</div>
                                    <h4 className="text-lg font-black text-white mb-2">Continuous Sync & Drift Monitor</h4>
                                    <p className="text-xs text-slate-400">Polling `task_poll_latest.json`. Continuous checks running to detect source environment drift before cutover.</p>
                                </div>
                                {execStatus === 'syncing' ? (
                                    <button onClick={() => advanceStatus('cutover_ready')} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"><i className="fas fa-forward mr-2"></i> Simulate Sync Complete</button>
                                ) : ['cutover_ready', 'completed'].includes(execStatus) ? (
                                    <div className="text-purple-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                ) : null}
                            </div>
                        </div>

                        {/* Phase 4: Production Cutover */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'cutover_ready' ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Phase 4</div>
                                    <h4 className="text-lg font-black text-white mb-2">Production Cutover & Optimization</h4>
                                    <p className="text-xs text-slate-400">Promotes resources from Sandbox to Production EPS. Rebinds EIPs, validates Security Groups, and destroys Sandbox.</p>
                                </div>
                                {execStatus === 'cutover_ready' ? (
                                    <button onClick={() => advanceStatus('completed')} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"><i className="fas fa-power-off mr-2"></i> Execute Cutover</button>
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

            {/* 🚨 MASTER EXECUTION GUIDE DRAWER */}
            {showMasterGuide && (
                <div className="fixed inset-y-0 right-0 w-[800px] bg-white shadow-2xl border-l border-slate-200 z-[10000] flex flex-col animate-slide-left overflow-hidden">
                    <div className="bg-indigo-600 text-white p-6 border-b border-indigo-700 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-black text-xl"><i className="fas fa-book-open mr-2"></i> Phase 3 Execution & Provisioning Master Guide</h3>
                            <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-1">Bridging the Cloud API Plane with the OS-level Data Plane</p>
                        </div>
                        <button onClick={()=>setShowMasterGuide(false)} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times text-2xl"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 text-sm text-slate-700 leading-relaxed custom-scrollbar">
                        
                        {/* Section 1 */}
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

                        {/* Section 2 */}
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
                            <ul className="list-disc pl-5 space-y-2 text-xs">
                                <li><strong>Hyperscaler Admin:</strong> Fully automated cloud native orchestration. Pushed automatically across massive batches via SSM/Run-Command blocks.</li>
                                <li><strong>Active Directory Domain Admin:</strong> Centralized environment control. The ERP logs into a single internal jump-box and distributes MSI packages across the fleet utilizing batch PowerShell remote loops.</li>
                                <li><strong>Local System Admin:</strong> The engine steps down to sequential host-by-host execution, parsing individual whitelisted node coordinates to apply safe, silent background agent installations.</li>
                                <li><strong>Read-Only / Closed Posture:</strong> Zero automation access. The engine compiles a fully customized script package. The delivery engineer presents this directly to the customer IT team for manual deployment.</li>
                            </ul>
                        </div>

                        {/* Section 3 */}
                        <div className="space-y-4">
                            <h4 className="font-black text-indigo-900 text-lg border-b border-indigo-200 pb-2">3. The Multi-Tiered Vault & Sandbox (EPS) Isolation</h4>
                            <p>To minimize risk and guarantee zero blast-radius to production environments, the ERP enforces a strict Least Privilege Key Tiering system tied directly to Huawei Cloud Enterprise Projects (EPS).</p>
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
 └─────────────────────────┘  │  └──────────────────────┘  │ └────────────────┘
        BLAST RADIUS:         │        BLAST RADIUS:       │   BLAST RADIUS:
           ZERO               │      SANDBOX EPS ONLY      │   PROD APPROVED`}</pre>
                            </div>
                            <ul className="list-disc pl-5 space-y-2 text-xs">
                                <li><strong>The Sandbox Phase (Tier 2):</strong> The RFS/Terraform generator dynamically reads the visual topology blueprint and injects the staging <code>enterprise_project_id</code> across every VPC, subnet, security group, and storage container. All replication stress tests live here safely.</li>
                                <li><strong>The Promotion Cutover Phase (Tier 3):</strong> Following customer sign-off, staging environments undergo seamless billing and policy promotion directly into the Production EPS boundary, followed by an automated deep teardown optimization cycle of the entire sandbox resource graph to maintain a zero-waste finops posture.</li>
                            </ul>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
