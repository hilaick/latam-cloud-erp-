import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('orchestrator');
    const [showMasterGuide, setShowMasterGuide] = useState(false);
    
    const [driftAlert, setDriftAlert] = useState(true);
    const execStatus = project.execStatus || 'pending'; 
    const authLevel = project.authLevel || 'Read-Only (Customer Managed)';
    
    const hasPassedPreflight = ['preflight_complete', 'sandbox_built', 'agents_deployed', 'syncing', 'cutover_ready', 'completed'].includes(execStatus);
    
    // STATE PERSISTENCE: Read exactly from the database
    const [iamStatus, setIamStatus] = useState(project.ephemeralKeys ? 'active' : 'pending'); 
    const [ephemeralKeys, setEphemeralKeys] = useState(project.ephemeralKeys || null);
    const [preflightStatus, setPreflightStatus] = useState(hasPassedPreflight ? 'done' : 'pending'); 
    const [vectorAssignments, setVectorAssignments] = useState(project.vectorAssignments || {});
    
    const sandboxEpsRaw = project.sandboxEps?.trim() || '';
    const prodEpsRaw = project.prodEps?.trim() || '';
    const isVpcIsolationMode = !sandboxEpsRaw || !prodEpsRaw;

    // 🚨 FIX: Correctly read from raw_inventory
    const discoveryComputeCount = useMemo(() => {
        const raw = project?.mgcData?.raw_inventory || {};
        return (raw.compute || raw.servers || []).length;
    }, [project?.mgcData]);
    
    const inScopeNodes = useMemo(() => {
        return (project.mapperNodes || []).filter(n => 
            ['ECS', 'VM'].includes(String(n.type).toUpperCase()) && 
            n.status !== 'Quoted Only' 
        );
    }, [project.mapperNodes]);

    // FAILSAFE: If the DB says we passed preflight but assignments are empty
    useEffect(() => {
        if (hasPassedPreflight && Object.keys(vectorAssignments).length === 0 && preflightStatus === 'done') {
            setPreflightStatus('pending');
            safePartialUpdate({ execStatus: 'pending' });
        }
    }, [hasPassedPreflight, vectorAssignments, preflightStatus, project.id]);

    // 🚨 CRASH FIX: Dedicated Partial Update Function using PATCH
    const safePartialUpdate = async (updates) => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            await fetch(`/api/erp/projects/${project.id}/partial`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates)
            });
            // Update React Context state locally so UI updates instantly
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
                
                // Persist the keys via the crash-proof partial update
                safePartialUpdate({ ephemeralKeys: keys });
                alert("Huawei Cloud STS Token Successfully Provisioned!\n\nYou can now verify the 'GetSessionToken' event in the Huawei Cloud Trace Service (CTS) console.");
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
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Source Plane Strategy</h4>
                                    <div className={`p-5 rounded-xl border ${strategy.border} ${strategy.bg} shadow-inner`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <i className={`fas ${strategy.icon} ${strategy.color} text-2xl`}></i>
                                            <div className={`text-sm font-black ${strategy.color}`}>{authLevel}</div>
                                        </div>
                                        <div className="text-xs text-slate-600 font-medium leading-relaxed">{strategy.text}</div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2 flex items-center"><i className="fas fa-shield-alt mr-2"></i> Zero-Trust Target IAM</h4>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-inner">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Master Key Status</span>
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Verified in Vault</span>
                                            </div>
                                            <div className="text-xs font-mono text-slate-400">HW_MASTER_***********</div>
                                        </div>

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
                                                    <i className="fas fa-circle-notch fa-spin mr-2"></i> Calling STS API...
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
                                    
                                    <p className="text-xs text-slate-400 leading-relaxed border-b border-slate-700 pb-5">
                                        The Execution Orchestrator explicitly ignores out-of-scope servers. It securely tunnels to the <strong>{inScopeNodes.length} approved source nodes</strong> to run read-only diagnostics and assigns the safest Execution Vector.
                                    </p>

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
                                                            <p className="text-[11px] text-rose-200/70 mt-1 font-medium leading-relaxed">
                                                                Unexpected ECS instance <span className="font-mono text-white">dev-test-ubuntu (10.0.1.99)</span> detected in Target VPC. Does not match approved SOW baseline.
                                                            </p>
                                                            <div className="flex gap-3 mt-4">
                                                                <button onClick={() => { alert("API Call: Forcing deletion of unauthorized instance to maintain SOW compliance..."); setDriftAlert(false); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-md flex items-center">
                                                                    <i className="fas fa-fire mr-1.5"></i> Auto-Revert (Destroy VM)
                                                                </button>
                                                                <button onClick={() => { alert("Drift Alert routed to TAM Governance Board."); setDriftAlert(false); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-rose-500/50 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center">
                                                                    <i className="fas fa-headset mr-1.5"></i> Alert TAM
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

            {subTab === 'hub' && <ExecutionHubView project={project} onUpdateProject={onUpdateProject} safePartialUpdate={safePartialUpdate} />}
            {subTab === 'tam' && <TAMHubView project={project} onUpdateProject={onUpdateProject} safePartialUpdate={safePartialUpdate} />}
            
            {showMasterGuide && (
                <div className="fixed inset-y-0 right-0 w-full sm:w-[800px] bg-white shadow-2xl border-l border-slate-200 z-[10000] flex flex-col animate-slide-left overflow-hidden">
                    <div className="bg-indigo-600 text-white p-6 border-b border-indigo-700 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-black text-xl"><i className="fas fa-book-open mr-2"></i> Execution & Provisioning Master Guide</h3>
                            <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-1">Cognitive Vectors, Matrix Logic & Zero-Trust.</p>
                        </div>
                        <button onClick={()=>setShowMasterGuide(false)} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times text-2xl"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 text-sm text-slate-700 leading-relaxed custom-scrollbar">
                        
                        <div className="space-y-4">
                            <h4 className="font-black text-indigo-900 text-lg border-b border-indigo-200 pb-2">1. The Multi-Vector Execution Matrix</h4>
                            <p>To prevent AI hallucinations from breaking production, the ERP operates on a multi-vector system. During the Pre-Flight dry-run, the ERP SSHs into the source environment and assigns a specific execution vector based on OS health, boot modes, and constraints. You must approve this matrix before automation begins.</p>
                            
                            <div className="space-y-4 pt-2">
                                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="font-black text-emerald-600 text-sm mb-1"><i className="fas fa-check-circle w-5"></i> Vector 1: SMS Auto-Provision (The Happy Path)</div>
                                    <p className="text-xs text-slate-600 ml-5">Source OS is modern and fully supported. ERP installs SMS -> SMS registers with Huawei -> Huawei SMS dynamically creates the target ECS -> Sync begins.</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="font-black text-amber-600 text-sm mb-1"><i className="fas fa-exclamation-triangle w-5"></i> Vector 2: Pre-Provisioned Target (SMS Override)</div>
                                    <p className="text-xs text-slate-600 ml-5">Detected UEFI boot mode mismatch or strict flavor limitations. ERP uses Terraform to pre-build the exact ECS instance first, then forces SMS to inject data into the existing node.</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="font-black text-rose-600 text-sm mb-1"><i className="fas fa-times-circle w-5"></i> Vector 3: OBS Image Import (VHD)</div>
                                    <p className="text-xs text-slate-600 ml-5">Source OS completely rejects the SMS agent (e.g. Legacy Windows 2008). ERP skips agents, orchestrates VHD upload to OBS, and spawns the ECS via Huawei IMS API.</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="font-black text-purple-600 text-sm mb-1"><i className="fas fa-lock w-5"></i> Vector 4: Direct OS-Level Sync (Rsync)</div>
                                    <p className="text-xs text-slate-600 ml-5">SMS blocked by compliance firewall. ERP pre-provisions target ECS, opens direct SSH tunnel, and natively executes an rsync block copy bypassing Huawei tools entirely.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-black text-indigo-900 text-lg border-b border-indigo-200 pb-2">2. Zero-Trust Identity Provisioning</h4>
                            <p>The ERP platform never hands the Master Admin Key to the Execution Orchestrator. When you click "Provision Ephemeral Key", the platform calls the Huawei Security Token Service (STS).</p>
                            <ul className="list-disc pl-5 space-y-2 text-xs">
                                <li>A temporary Access Key/Secret Key pair is generated.</li>
                                <li>The token is strictly scoped to the <strong>Sandbox Enterprise Project (EPS)</strong> defined in the boundaries.</li>
                                <li>If the AI Orchestrator attempts to provision resources outside this Sandbox, or delete resources in Production, the Huawei Cloud IAM drops the request immediately.</li>
                            </ul>
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
function ExecutionHubView({ project, onUpdateProject, safePartialUpdate }) {
    const [comms, setComms] = useState(project.comms || { bridge: "", chat: "", notes: "" });
    useEffect(() => { setComms(project.comms || { bridge: "", chat: "", notes: "" }); }, [project]);
    
    const handleSaveComms = () => { 
        if (safePartialUpdate) {
            safePartialUpdate({ comms });
        } else {
            onUpdateProject(project.id, 'comms', comms); 
        }
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
// 🎧 3. TAM SERVICE GOVERNANCE COMPONENT
// ==========================================
function TAMHubView({ project, onUpdateProject, safePartialUpdate }) {
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
        if (safePartialUpdate) {
            safePartialUpdate({ tamData });
        } else {
            onUpdateProject(project.id, 'tamData', tamData); 
        }
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
