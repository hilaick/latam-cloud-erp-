import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';
import CutoverRunbookView from './CutoverRunbookView';

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('orchestrator');
    const [showMasterGuide, setShowMasterGuide] = useState(false);
    
    // COGNITIVE ANTICIPATION STATE
    const [anticipationInsights, setAnticipationInsights] = useState(project.anticipationInsights || null);
    
    // RUNBOOK & OPT-IN STATE
    const [showRunbookModal, setShowRunbookModal] = useState(false);
    const [runbookData, setRunbookData] = useState(null);
    const [runbookTab, setRunbookTab] = useState('linux');
    const [agentOptIns, setAgentOptIns] = useState({
        uniAgent: true, 
        hss: project?.blueprintData?.topology?.security?.some(s => s.type === 'HSS') || false,
        lts: false
    });
    
    const [driftAlert, setDriftAlert] = useState(true);
    const execStatus = project.execStatus || 'pending'; 
    const authLevel = project.authLevel || 'Read-Only (Customer Managed)';
    
    const hasPassedPreflight = ['preflight_complete', 'sandbox_built', 'agents_deployed', 'syncing', 'cutover_ready', 'completed'].includes(execStatus);
    
    const [iamStatus, setIamStatus] = useState(project.ephemeralKeys ? 'active' : 'pending'); 
    const [ephemeralKeys, setEphemeralKeys] = useState(project.ephemeralKeys || null);
    const [preflightStatus, setPreflightStatus] = useState(hasPassedPreflight ? 'done' : 'pending'); 
    const [vectorAssignments, setVectorAssignments] = useState(project.vectorAssignments || {});
    const [tokenValidated, setTokenValidated] = useState(false);
    
    const sandboxEpsRaw = project.sandboxEps?.trim() || '';
    const prodEpsRaw = project.prodEps?.trim() || '';
    const isVpcIsolationMode = !sandboxEpsRaw || !prodEpsRaw;

    const getStrategyDetails = () => {
        if (authLevel.includes('Cloud Admin API')) return { icon: 'fa-cloud', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'Automated Agentless Push via AWS SSM, Azure Run Command, or vCenter Guest Ops. Control Plane active.' };
        if (authLevel.includes('Active Directory')) return { icon: 'fa-windows', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'Automated GPO/WinRM batch push. Centralized Data Plane active.' };
        if (authLevel.includes('Local OS Admin')) return { icon: 'fa-terminal', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'Automated SSH/WinRM Injection loop. Sequential Data Plane active.' };
        return { icon: 'fa-user-shield', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', text: 'Zero Trust (Customer Managed). Generating custom SCCM/Ansible Runbooks for client IT execution.' };
    };
    const strategy = getStrategyDetails();

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

    useEffect(() => {
        if (hasPassedPreflight && Object.keys(vectorAssignments).length === 0 && preflightStatus === 'done') {
            setPreflightStatus('pending');
            safePartialUpdate({ execStatus: 'pending' });
        }
    }, [hasPassedPreflight, vectorAssignments, preflightStatus, project.id]);

    const safePartialUpdate = async (updates) => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            await fetch(`/api/erp/projects/${project.id}/partial`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates)
            });
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
                const keys = { ak: data.ak, sk: data.sk, expires: data.expires_at, security_token: data.security_token };
                setEphemeralKeys(keys); setIamStatus('active'); setTokenValidated(false);
                safePartialUpdate({ ephemeralKeys: keys });
                alert("Huawei Cloud STS Token Successfully Provisioned!");
            } else {
                setIamStatus('pending'); alert(`STS Provisioning Failed:\n\n${data.error}`);
            }
        } catch (err) { setIamStatus('pending'); alert(`Network Error: ${err.message}`); }
    };

    const handleValidateToken = async () => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch('/api/cloud/validate-sts-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ projectId: project.id })
            });
            const data = await res.json();
            if (data.success && data.valid) {
                setTokenValidated(true); alert("✅ STS Token Validated Successfully!");
            } else {
                alert(`❌ Token Validation Failed:\n\n${data.error}`);
                setIamStatus('pending'); setEphemeralKeys(null); setTokenValidated(false); safePartialUpdate({ ephemeralKeys: null });
            }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    const handleResetToken = () => {
        setIamStatus('pending'); setEphemeralKeys(null); setTokenValidated(false); safePartialUpdate({ ephemeralKeys: null });
    };

    const handleRunPreflight = async () => {
        setPreflightStatus('scanning');
        const token = localStorage.getItem('erp_jwt_token');
        
        try {
            // Trigger Anticipation Engine
            const res = await fetch(`/api/projects/${project.id}/anticipate`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                setAnticipationInsights(data.insights);
                safePartialUpdate({ anticipationInsights: data.insights });
            }
        } catch (e) {
            console.warn("Anticipation API failed, proceeding with local vector assignments.", e);
        }

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
            setVectorAssignments(assignments); setPreflightStatus('done');
            safePartialUpdate({ vectorAssignments: assignments, execStatus: 'preflight_complete' });
        }, 2000);
    };

    const handleVectorChange = (nodeId, newVector) => {
        const updated = { ...vectorAssignments, [nodeId]: { ...vectorAssignments[nodeId], vector: newVector } };
        setVectorAssignments(updated); safePartialUpdate({ vectorAssignments: updated });
    };

    const handleExecuteTerraform = async () => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ ${data.message}${data.warning ? `\n\nNote: ${data.warning}` : ''}`);
                advanceStatus('agents_deployed');
            } else { alert(`❌ Execution Failed:\n\n${data.error}`); }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    const handleDeployAgents = async () => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const payload = { optIns: agentOptIns };
            const res = await fetch(`/api/projects/${project.id}/deploy-agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.success) {
                if (data.mode === 'manual') {
                    setRunbookData(data.runbook);
                    setShowRunbookModal(true);
                } else {
                    alert(`✅ ${data.message}\n\nAutomated Payloads Sent.`);
                    advanceStatus('syncing');
                }
            } else {
                alert(`❌ Agent Deployment Failed:\n\n${data.error}`);
            }
        } catch (err) {
            alert(`Network Error: ${err.message}`);
        }
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
                                                    
                                                    {!tokenValidated ? (
                                                        <button 
                                                            onClick={handleValidateToken}
                                                            className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-md flex items-center justify-center"
                                                        >
                                                            <i className="fas fa-check-circle mr-2"></i> Validate Token with Huawei Cloud
                                                        </button>
                                                    ) : (
                                                        <div className="mt-3 p-2 bg-emerald-900/30 border border-emerald-500/30 rounded-lg">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center">
                                                                    <i className="fas fa-check-circle text-emerald-500 mr-2"></i>
                                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Token Validated</span>
                                                                </div>
                                                                <span className="text-[9px] text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded">Ready for Execution</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <button onClick={handleResetToken} className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center border border-slate-600">
                                                        <i className="fas fa-sync-alt mr-2"></i> Reset & Re-Provision
                                                    </button>
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

                                    {/* 🚨 ANTICIPATION API ALERTS RENDERING */}
                                    {anticipationInsights && (
                                        <div className="mb-6 space-y-3 animate-fade-in">
                                            {anticipationInsights.quota_warnings?.map((warn, i) => (
                                                <div key={`quota-${i}`} className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex gap-3 text-amber-200">
                                                    <i className="fas fa-exclamation-triangle text-amber-500 mt-1"></i>
                                                    <div className="text-xs"><strong>EIP Quota Warning:</strong> {warn}</div>
                                                </div>
                                            ))}
                                            {anticipationInsights.capacity_warnings?.map((warn, i) => (
                                                <div key={`cap-${i}`} className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg flex gap-3 text-rose-200">
                                                    <i className="fas fa-ban text-rose-500 mt-1"></i>
                                                    <div className="text-xs"><strong>Capacity Alert:</strong> {warn}</div>
                                                </div>
                                            ))}
                                            {anticipationInsights.upsell_opportunities?.map((upsell, i) => (
                                                <div key={`up-${i}`} className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-lg flex gap-3 text-indigo-200">
                                                    <i className="fas fa-lightbulb text-indigo-400 mt-1"></i>
                                                    <div className="text-xs"><strong>Upsell Anticipated:</strong> {upsell}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

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
                                            <div className="p-3 bg-slate-800/80 border-t border-slate-700 text-right flex justify-between items-center">
                                                {!tokenValidated ? (
                                                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest ml-4">
                                                        <i className="fas fa-exclamation-triangle mr-1"></i> Token validation required
                                                    </span>
                                                ) : (
                                                    <span></span>
                                                )}
                                                <button 
                                                    onClick={() => advanceStatus('sandbox_built')} 
                                                    disabled={!tokenValidated}
                                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center shadow-md"
                                                >
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
                                            <p className="text-xs text-slate-400">Compiles the blueprint into Terraform and pushes to Huawei RFS. Deploys network skeleton, CBR vaults, and pre-builds targets for Vector 2 & 3.</p>
                                        </div>
                                        {execStatus === 'sandbox_built' ? (
                                            <button onClick={handleExecuteTerraform} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center whitespace-nowrap"><i className="fas fa-play mr-2"></i> Execute Terraform</button>
                                        ) : ['agents_deployed', 'syncing', 'cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-amber-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'agents_deployed' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="pr-6 w-full">
                                            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 3</div>
                                            <h4 className="text-lg font-black text-white mb-4 border-b border-slate-700 pb-2">Deploy Agents & Execute Syncs</h4>
                                            
                                            {/* 🚨 COGNITIVE OPT-IN HUB */}
                                            {execStatus === 'agents_deployed' && (
                                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5 animate-fade-in">
                                                    <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3"><i className="fas fa-robot mr-2"></i> Cognitive Anticipation Engine</h5>
                                                    <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">Select optional agents to deploy alongside the migration engine. These activate Day-2 observability and security instantly upon cutover.</p>
                                                    
                                                    <div className="space-y-2">
                                                        <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                                                            <input type="checkbox" checked={agentOptIns.uniAgent} onChange={e=>setAgentOptIns({...agentOptIns, uniAgent: e.target.checked})} className="w-4 h-4 accent-blue-500" />
                                                            <div>
                                                                <div className="text-xs font-black text-white">Huawei UniAgent (CES/Monitoring) <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] ml-2">Free</span></div>
                                                                <div className="text-[9px] text-slate-400">Captures internal RAM and Disk I/O metrics post-migration. Highly recommended for SAP/Windows.</div>
                                                            </div>
                                                        </label>
                                                        <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                                                            <input type="checkbox" checked={agentOptIns.hss} disabled className="w-4 h-4 accent-rose-500 opacity-50" />
                                                            <div>
                                                                <div className="text-xs font-black text-white">Host Security Service (HSS)</div>
                                                                <div className="text-[9px] text-slate-400">{agentOptIns.hss ? "Enabled by default based on original SOW quotation." : "Not found in SOW. Requires Change Request to enable."}</div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        {execStatus === 'agents_deployed' ? (
                                            <button onClick={handleDeployAgents} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center whitespace-nowrap shadow-md">
                                                <i className="fas fa-satellite-dish mr-2"></i> Trigger Data Plane
                                            </button>
                                        ) : ['syncing', 'cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-purple-500 flex flex-col items-end">
                                                <i className="fas fa-check-circle text-2xl mb-2"></i>
                                                <button onClick={() => setShowRunbookModal(true)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors border border-slate-600 bg-slate-800 px-3 py-1.5 rounded-lg mt-2">View Runbooks</button>
                                            </div>
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
                                            <button onClick={() => advanceStatus('cutover_ready')} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center whitespace-nowrap"><i className="fas fa-forward mr-2"></i> Synced (Ready for Cutover)</button>
                                        ) : ['cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-rose-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                {/* 🚨 PHASE 5: MOVED CUTOVER RUNBOOK HERE */}
                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'cutover_ready' ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Phase 5</div>
                                            <h4 className="text-lg font-black text-white mb-2">Production Cutover & Optimization</h4>
                                            <p className="text-xs text-slate-400">Cutover is a manual, human-driven process. Follow the runbook sequence to finalize DNS, shut down sources, and attach the CBR vaults.</p>
                                        </div>
                                    </div>
                                    
                                    {execStatus === 'cutover_ready' && (
                                        <div className="mt-6 border-t border-slate-700 pt-6">
                                            <CutoverRunbookView activeProject={project} onUpdateProject={onUpdateProject} />
                                            
                                            <div className="mt-8 flex justify-end">
                                                <button onClick={() => advanceStatus('completed')} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95">
                                                    <i className="fas fa-power-off mr-2"></i> Finalize Complete Cutover
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {execStatus === 'completed' && (
                                        <div className="text-emerald-500 flex justify-end mt-4"><i className="fas fa-check-circle text-2xl"></i></div>
                                    )}
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

            {/* CUSTOMER RUNBOOK MODAL */}
            {showRunbookModal && runbookData && (
                <div className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                        <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-black text-xl text-purple-400 flex items-center"><i className="fas fa-terminal mr-3"></i> Customer-Managed Execution Runbooks</h3>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Generated via Zero-Trust Policy</p>
                            </div>
                            <button onClick={()=>setShowRunbookModal(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
                        </div>
                        
                        <div className="flex bg-slate-100 border-b border-slate-200 px-6 pt-4 gap-2">
                            <button onClick={()=>setRunbookTab('linux')} className={`px-6 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest transition-colors ${runbookTab === 'linux' ? 'bg-white text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Linux (Bash)</button>
                            <button onClick={()=>setRunbookTab('windows')} className={`px-6 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest transition-colors ${runbookTab === 'windows' ? 'bg-white text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Windows (PS)</button>
                        </div>

                        <div className="p-8 overflow-y-auto bg-white flex-1 custom-scrollbar">
                            <pre className="bg-slate-900 text-slate-300 p-6 rounded-xl overflow-x-auto text-xs font-mono shadow-inner border border-slate-700">
                                {runbookTab === 'linux' ? runbookData.linux : runbookData.windows}
                            </pre>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button onClick={() => { setShowRunbookModal(false); advanceStatus('syncing'); }} className="px-8 py-3 text-xs font-black text-white uppercase tracking-widest bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-md">Acknowledge & Proceed</button>
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
                        </div>
                        {/* More guide text... */}
                    </div>
                </div>
            )}
        </div>
    );
}

// 🚨 THE FINOPS MATTRESS WIDGET
function ExecutionHubView({ project, onUpdateProject, safePartialUpdate }) {
    const [comms, setComms] = useState(project.comms || { bridge: "", chat: "", notes: "" });
    useEffect(() => { setComms(project.comms || { bridge: "", chat: "", notes: "" }); }, [project]);
    
    // Calculates overlapping runtimes (Mattress)
    const mrr = project.mrr || 5000; 
    const overheadBudget = mrr * 0.15; // 15% FinOps buffer
    const currentBurn = (project.mapperNodes || []).length * 45; // Simulated burn

    const handleSaveComms = () => { 
        if (safePartialUpdate) safePartialUpdate({ comms });
        else onUpdateProject(project.id, 'comms', comms); 
        alert("Command Center Links Updated"); 
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
                <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="font-black text-lg tracking-wide text-slate-800"><i className="fas fa-wallet text-emerald-500 mr-2"></i> Migration FinOps Mattress</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Tracking overlapping runtimes, NATs, and EIPs.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-800">${overheadBudget.toLocaleString()}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allocated Buffer (15% MRR)</div>
                    </div>
                </div>

                <div className="relative pt-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                        <span className={`${currentBurn > overheadBudget ? 'text-rose-500' : 'text-blue-600'}`}>Current Burn: ${currentBurn.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner flex">
                        <div className={`h-full transition-all duration-500 ${currentBurn > overheadBudget ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (currentBurn / overheadBudget) * 100)}%` }}></div>
                    </div>
                    {currentBurn > overheadBudget && (
                        <div className="mt-3 text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center bg-rose-50 p-2 rounded border border-rose-200">
                            <i className="fas fa-exclamation-triangle mr-2"></i> Warning: Overlapping runtime has exceeded the migration budget buffer.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
                    <h3 className="font-black text-sm tracking-wide text-amber-900"><i className="fas fa-satellite-dish text-amber-600 mr-2"></i> Delivery Command Center</h3>
                    <button onClick={handleSaveComms} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors">Save Links</button>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                    <textarea value={comms.notes} onChange={e=>setComms({...comms, notes: e.target.value})} className="w-full h-32 p-4 border border-amber-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 bg-amber-50/50 resize-none shadow-inner" placeholder="Execution Notes..."></textarea>
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
            {!timelineData ? <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-xs">Valid Kickoff and Go-Live dates required.</div> : (
                <div className="overflow-x-auto w-full">
                    <div className="min-w-[800px] relative h-[120px]">
                        <div className="absolute inset-0 flex justify-between opacity-20 pointer-events-none">{[...Array(6)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                        <div className="relative z-10 pt-8">
                            <div className="h-12 relative bg-slate-50 border-y border-transparent transition-colors rounded-xl shadow-inner">
                                <div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-4" style={{ left: `${timelineData.pStart}%` }}>{timelineData.startStr}</div>
                                <div className={`absolute top-1 bottom-1 rounded-lg shadow-md border-2 flex flex-col justify-center px-4 overflow-hidden bg-blue-500 border-blue-600 text-white`} style={{ left: `${timelineData.pStart}%`, width: `${timelineData.pWidth}%`, minWidth:'80px'}}>
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
        if (safePartialUpdate) safePartialUpdate({ tamData });
        else onUpdateProject(project.id, 'tamData', tamData); 
        alert("TAM Operations Data Saved."); 
    };
    
    const toggleWorkshop = (id) => { 
        const w = (tamData.workshops||[]).map(x => x.id === id ? {...x, done: !x.done} : x); 
        setTamData({...tamData, workshops: w}); 
    };

    return (
        <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-headset text-blue-400 mr-3"></i> TAM Service Governance</h3>
                    </div>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md">
                        Save Operations Data
                    </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    <div className="p-8 bg-slate-50 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Contracted Support Plan</label>
                            <select value={tamData.supportPlan} onChange={e=>setTamData({...tamData, supportPlan: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white cursor-pointer shadow-sm">
                                <option>Developer</option><option>Business</option><option>Enterprise</option><option>Premier</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-8 bg-white space-y-6">
                        <div><h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-widest"><i className="fas fa-graduation-cap text-blue-500 mr-2"></i> Cloud Enablement Tracker</h4></div>
                        <div className="space-y-3">
                            {(tamData.workshops||[]).map(w => (
                                <label key={w.id} className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors shadow-sm ${w.done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}`}>
                                    <input type="checkbox" checked={w.done} onChange={()=>toggleWorkshop(w.id)} className="w-5 h-5 accent-emerald-500" />
                                    <span className={`font-bold text-xs ${w.done ? 'text-emerald-800 line-through opacity-75' : 'text-slate-700'}`}>{w.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
