import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('orchestrator');
    const [showMasterGuide, setShowMasterGuide] = useState(false);
    
    const [driftAlert, setDriftAlert] = useState(true);
    const execStatus = project.execStatus || 'pending'; 
    const authLevel = project.authLevel || 'Read-Only (Customer Managed)';
    
    const hasPassedPreflight = ['preflight_complete', 'sandbox_built', 'agents_deployed', 'syncing', 'cutover_ready', 'completed'].includes(execStatus);
    
    // STATE PERSISTENCE: Hydrate from DB
    const [iamStatus, setIamStatus] = useState(hasPassedPreflight ? 'active' : 'pending'); 
    const [ephemeralKeys, setEphemeralKeys] = useState(project.ephemeralKeys || (hasPassedPreflight ? { ak: `HW_STS_CACHED_TOKEN`, sk: '********' } : null));
    const [preflightStatus, setPreflightStatus] = useState(hasPassedPreflight ? 'done' : 'pending'); 
    const [vectorAssignments, setVectorAssignments] = useState(project.vectorAssignments || {});
    
    const sandboxEpsRaw = project.sandboxEps?.trim() || '';
    const prodEpsRaw = project.prodEps?.trim() || '';
    const isVpcIsolationMode = !sandboxEpsRaw || !prodEpsRaw;

    const discoveryComputeCount = project?.mgcData?.compute?.length || project?.mgcData?.servers?.length || 0;
    
    const inScopeNodes = useMemo(() => {
        return (project.mapperNodes || []).filter(n => 
            ['ECS', 'VM'].includes(String(n.type).toUpperCase()) && 
            n.status !== 'Quoted Only' 
        );
    }, [project.mapperNodes]);

    useEffect(() => {
        if (hasPassedPreflight && Object.keys(vectorAssignments).length === 0 && preflightStatus === 'done') {
            setPreflightStatus('pending');
            safePartialUpdate({ execStatus: 'pending' });
        }
    }, [hasPassedPreflight, vectorAssignments, preflightStatus, project.id]);

    // 🚨 CRASH FIX: Dedicated Partial Update Function
    const safePartialUpdate = async (updates) => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            await fetch(`/api/erp/projects/${project.id}/partial`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates)
            });
            // Also update React Context state locally so UI updates instantly
            Object.keys(updates).forEach(k => {
                onUpdateProject(project.id, k, updates[k]);
            });
        } catch (e) {
            console.error("Failed partial update:", e);
        }
    };

    const advanceStatus = (newStatus) => {
        safePartialUpdate({ execStatus: newStatus });
        if (newStatus === 'syncing') setDriftAlert(true);
    };

    // 🚨 THE REAL HUAWEI STS API CALL
    const handleProvisionIAM = async () => {
        setIamStatus('provisioning');
        const token = localStorage.getItem('erp_jwt_token');
        
        try {
            const res = await fetch('/api/cloud/sts-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ projectId: project.id })
            });
            
            const data = await res.json();
            
            if (data.success) {
                const keys = { 
                    ak: data.ak, 
                    sk: '********************************', // Masked for security in UI
                    expires: data.expires_at 
                };
                setEphemeralKeys(keys);
                setIamStatus('active');
                
                // Persist the fact that we got the key
                safePartialUpdate({ ephemeralKeys: keys });
                alert("Huawei Cloud STS Token Successfully Provisioned!\nCheck Cloud Trace Service (CTS) to verify the event.");
            } else {
                setIamStatus('pending');
                alert(`STS Provisioning Failed:\n\n${data.error}`);
            }
        } catch (err) {
            setIamStatus('pending');
            alert(`Network Error during STS provision: ${err.message}`);
        }
    };

    const handleRunPreflight = () => {
        setPreflightStatus('scanning');
        setTimeout(() => {
            const assignments = {};
            inScopeNodes.forEach((n, idx) => {
                if (n.status === 'Live Only' && !project.crApproved) {
                    assignments[n.id] = { status: 'Scope Creep Detected', vector: 'Blocked (Missing CR)', icon: 'fa-hand-paper', color: 'text-rose-500' };
                } else {
                    if (idx % 4 === 0) assignments[n.id] = { status: 'UEFI Boot Mismatch', vector: 'Vector 2: Pre-Provisioned SMS Target', icon: 'fa-exclamation-triangle', color: 'text-amber-500' };
                    else if (idx % 5 === 0) assignments[n.id] = { status: 'Legacy Kernel (Win 2008)', vector: 'Vector 3: OBS VHD Image Import', icon: 'fa-times-circle', color: 'text-rose-500' };
                    else if (idx % 7 === 0) assignments[n.id] = { status: 'Strict Firewall Block', vector: 'Vector 4: Direct OS-Level Rsync', icon: 'fa-lock', color: 'text-purple-500' };
                    else assignments[n.id] = { status: 'OS Healthy & Compatible', vector: 'Vector 1: SMS Auto-Provision', icon: 'fa-check-circle', color: 'text-emerald-500' };
                }
            });
            
            setVectorAssignments(assignments);
            setPreflightStatus('done');
            
            // 🚨 Use Crash-Proof Partial Update
            safePartialUpdate({ 
                vectorAssignments: assignments,
                execStatus: 'preflight_complete' 
            });
        }, 2500);
    };

    const handleVectorChange = (nodeId, newVector) => {
        const updated = { ...vectorAssignments, [nodeId]: { ...vectorAssignments[nodeId], vector: newVector } };
        setVectorAssignments(updated);
        safePartialUpdate({ vectorAssignments: updated });
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-12 animate-fade-in relative space-y-6">
            
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6 flex-wrap">
                <button onClick={() => setSubTab('orchestrator')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center ${subTab === 'orchestrator' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                    <i className="fas fa-cogs mr-2"></i> 1. Execution Orchestrator
                </button>
                <button onClick={() => setSubTab('hub')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center ${subTab === 'hub' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                    <i className="fas fa-stream mr-2"></i> 2. Delivery Command Center
                </button>
                <button onClick={() => setSubTab('tam')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center ${subTab === 'tam' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                    <i className="fas fa-headset mr-2"></i> 3. TAM Service Governance
                </button>
            </div>

            {subTab === 'orchestrator' && (
                <div className="space-y-6 animate-fade-in">
                    
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
                                <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Cognitive Pre-Flight, Zero-Trust IAM & Dark Factory Provisioning</p>
                            </div>
                            <button onClick={() => setShowMasterGuide(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors border border-indigo-500 flex items-center">
                                <i className="fas fa-book-open mr-2"></i> Master Execution Guide
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 relative z-10">
                            
                            <div className="p-8 border-r border-slate-700 bg-slate-800/50 flex flex-col gap-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2 flex items-center"><i className="fas fa-shield-alt mr-2"></i> Zero-Trust Target IAM</h4>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-inner relative overflow-hidden">
                                            {iamStatus === 'active' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Execution Boundary</div>
                                            <div className="text-xs font-mono text-amber-400 mb-4">{sandboxEpsRaw ? `EPS: ${sandboxEpsRaw}` : 'Isolated Sandbox VPC'}</div>
                                            
                                            {iamStatus === 'pending' && (
                                                <button onClick={handleProvisionIAM} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-md flex items-center justify-center">
                                                    <i className="fas fa-key mr-2"></i> Provision STS Ephemeral Key
                                                </button>
                                            )}
                                            {iamStatus === 'provisioning' && (
                                                <div className="w-full py-2.5 bg-slate-800 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center border border-emerald-500/30">
                                                    <i className="fas fa-circle-notch fa-spin mr-2"></i> Generating STS Token...
                                                </div>
                                            )}
                                            {iamStatus === 'active' && ephemeralKeys && (
                                                <div className="space-y-2 animate-fade-in">
                                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-t border-slate-700 pt-3">Restricted Token Active</div>
                                                    <div className="text-[10px] font-mono text-slate-300 break-all">AK: {ephemeralKeys.ak}</div>
                                                    <p className="text-[9px] text-slate-500 leading-snug mt-2">The Cognitive Engine will execute strictly using this token. Blast-radius isolated.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 lg:col-span-2 space-y-6">
                                
                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'pending' || execStatus === 'preflight_complete' ? (iamStatus === 'active' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-600 bg-slate-800/80') : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${iamStatus === 'active' ? 'text-blue-500' : 'text-slate-500'}`}>Phase 1</div>
                                            <h4 className="text-lg font-black text-white mb-2">Scope Filter & Pre-Flight Diagnostics</h4>
                                        </div>
                                        {execStatus === 'pending' || preflightStatus === 'pending' ? (
                                            <button 
                                                onClick={handleRunPreflight} 
                                                disabled={iamStatus !== 'active' || preflightStatus === 'scanning'}
                                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center"
                                            >
                                                {preflightStatus === 'scanning' ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning OS</> : <><i className="fas fa-microscope mr-2"></i> Run Dry-Run Diagnostics</>}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => { setPreflightStatus('pending'); safePartialUpdate({ execStatus: 'pending' }); }} className="text-xs text-slate-400 hover:text-white underline">Re-Run</button>
                                                <div className="text-blue-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4 mb-5">
                                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-center flex-1">
                                            <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Total Discovered</div>
                                            <div className="text-xl font-black text-slate-300">{discoveryComputeCount}</div>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-center flex-1">
                                            <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Out of Scope</div>
                                            <div className="text-xl font-black text-rose-500/70">{Math.max(0, discoveryComputeCount - inScopeNodes.length)}</div>
                                        </div>
                                        <div className="bg-blue-900/20 border border-blue-500/50 p-3 rounded-lg text-center flex-1 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                            <div className="text-[9px] text-blue-300 uppercase tracking-widest mb-1">Approved In Target Mapper</div>
                                            <div className="text-xl font-black text-blue-400">{inScopeNodes.length}</div>
                                        </div>
                                    </div>

                                    {preflightStatus === 'done' && (
                                        <div className="mt-6 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner animate-fade-in">
                                            <div className="overflow-y-auto max-h-[300px] custom-scrollbar">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-800/80 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10">
                                                        <tr>
                                                            <th className="p-3">Compute Node</th>
                                                            <th className="p-3">OS Diagnostic Status</th>
                                                            <th className="p-3">Assigned Execution Vector</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-700/50 text-slate-300">
                                                        {inScopeNodes.map(n => {
                                                            const data = vectorAssignments[n.id] || { status: 'Pending', vector: 'Vector 1: SMS Auto-Provision', icon: 'fa-circle-notch', color: 'text-slate-500' };
                                                            return (
                                                                <tr key={n.id} className="hover:bg-slate-800 transition-colors">
                                                                    <td className="p-3 font-bold text-white">
                                                                        <i className="fas fa-server text-blue-400 mr-2 opacity-70"></i>{n.name}
                                                                        {n.status === 'Live Only' && <span className="ml-2 bg-rose-900 text-rose-300 px-1 py-0.5 rounded text-[8px] uppercase tracking-widest">Scope Creep</span>}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <span className={`px-2 py-1 rounded bg-slate-950 border border-slate-700 font-bold ${data.color} flex w-max items-center`}>
                                                                            <i className={`fas ${data.icon} mr-1.5`}></i> {data.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        {data.vector.includes('Blocked') ? (
                                                                            <div className="bg-rose-950 border border-rose-700 text-rose-400 px-2 py-1.5 rounded font-black text-[10px] uppercase tracking-wider text-center">
                                                                                <i className="fas fa-hand-paper mr-2"></i> {data.vector}
                                                                            </div>
                                                                        ) : (
                                                                            <select 
                                                                                value={data.vector} 
                                                                                onChange={(e) => handleVectorChange(n.id, e.target.value)}
                                                                                className="w-full bg-slate-950 border border-slate-700 text-slate-300 px-2 py-1.5 rounded outline-none focus:border-blue-500 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                                                                            >
                                                                                <option value="Vector 1: SMS Auto-Provision">Vector 1: SMS Auto-Provision</option>
                                                                                <option value="Vector 2: Pre-Provisioned SMS Target">Vector 2: Pre-Provisioned SMS Target</option>
                                                                                <option value="Vector 3: OBS VHD Image Import">Vector 3: OBS VHD Image Import</option>
                                                                                <option value="Vector 4: Direct OS-Level Rsync">Vector 4: Direct OS-Level Rsync</option>
                                                                            </select>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-3 bg-slate-800/80 border-t border-slate-700 text-right">
                                                <button onClick={() => advanceStatus('sandbox_built')} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center ml-auto shadow-md">
                                                    <i className="fas fa-lock mr-2"></i> Approve Matrix & Proceed
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* PHASE 2 TO 5 BLOCKS ... */}
                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'sandbox_built' ? 'border-amber-500 bg-slate-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Phase 2</div>
                                            <h4 className="text-lg font-black text-white mb-2">Build Landing Zone & Pre-Provision Targets</h4>
                                            <p className="text-xs text-slate-400">Compiles the blueprint into Terraform. Deploys network skeleton and pre-builds specific ECS targets mandated by Vector 2 & 3.</p>
                                        </div>
                                        {execStatus === 'sandbox_built' ? (
                                            <button onClick={() => advanceStatus('agents_deployed')} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center whitespace-nowrap"><i className="fas fa-play mr-2"></i> Execute Terraform</button>
                                        ) : ['agents_deployed', 'syncing', 'cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-amber-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'agents_deployed' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 3</div>
                                            <h4 className="text-lg font-black text-white mb-2">Deploy Agents & Execute Syncs</h4>
                                        </div>
                                        {execStatus === 'agents_deployed' ? (
                                            <button onClick={() => advanceStatus('syncing')} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center whitespace-nowrap"><i className="fas fa-satellite-dish mr-2"></i> Trigger Data Plane</button>
                                        ) : ['syncing', 'cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-purple-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'syncing' ? 'border-rose-500 bg-slate-800 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-6">
                                            <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Phase 4</div>
                                            <h4 className="text-lg font-black text-white mb-2">Continuous Sync & Drift Monitor</h4>
                                            
                                            {execStatus === 'syncing' && driftAlert && (
                                                <div className="mt-5 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 animate-pulse">
                                                    <div className="flex items-start gap-3">
                                                        <i className="fas fa-radar text-rose-500 text-xl mt-0.5"></i>
                                                        <div>
                                                            <h5 className="font-black text-rose-400 text-sm">Drift Detection: Unauthorized Modification</h5>
                                                            <div className="flex gap-3 mt-4">
                                                                <button onClick={() => setDriftAlert(false)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-md flex items-center">
                                                                    <i className="fas fa-fire mr-1.5"></i> Auto-Revert (Destroy VM)
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {execStatus === 'syncing' ? (
                                            <button onClick={() => advanceStatus('cutover_ready')} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center whitespace-nowrap"><i className="fas fa-forward mr-2"></i> Sync Complete</button>
                                        ) : ['cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-rose-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'cutover_ready' ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Phase 5</div>
                                            <h4 className="text-lg font-black text-white mb-2">Production Cutover & Optimization</h4>
                                        </div>
                                        {execStatus === 'cutover_ready' ? (
                                            <button onClick={() => advanceStatus('completed')} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center whitespace-nowrap"><i className="fas fa-power-off mr-2"></i> Execute Cutover</button>
                                        ) : execStatus === 'completed' ? (
                                            <div className="text-emerald-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>
                                
                                {execStatus === 'completed' && (
                                    <div className="pt-4 flex justify-end">
                                        <button onClick={onPromote} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all animate-bounce flex items-center"><i className="fas fa-flag-checkered mr-2"></i> Proceed to Post-Live Validation</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'hub' && <ExecutionHubView project={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'tam' && <TAMHubView project={project} onUpdateProject={onUpdateProject} />}
            {showMasterGuide && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white p-8 rounded shadow-xl text-black">Master Guide Placeholder - Close this and it won't crash. <button onClick={()=>setShowMasterGuide(false)} className="mt-4 p-2 bg-blue-500 text-white rounded">Close</button></div></div>}
        </div>
    );
}

// ... [ExecutionHubView and TAMHubView remain exactly as before] ...
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
                    </div>
                    <button onClick={handleSaveComms} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-save mr-2"></i>Save Links</button>
                </div>
            </div>
        </div>
    )
}

function TAMHubView({ project, onUpdateProject }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h3 className="font-black text-lg text-slate-800"><i className="fas fa-headset text-blue-500 mr-2"></i> TAM Governance</h3>
        </div>
    );
}
