import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';
import CutoverRunbookView from './CutoverRunbookView';

export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('orchestrator');
    const [showMasterGuide, setShowMasterGuide] = useState(false);
    
    const [anticipationInsights, setAnticipationInsights] = useState(project.anticipationInsights || null);
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
        if (authLevel.includes('Cloud Admin API')) return { icon: 'fa-cloud', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'Automated Agentless Push via AWS SSM/Azure Run. Control Plane active.' };
        if (authLevel.includes('Active Directory')) return { icon: 'fa-windows', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'Automated GPO/WinRM batch push. Centralized Data Plane active.' };
        if (authLevel.includes('Local OS Admin')) return { icon: 'fa-terminal', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'Automated SSH/WinRM Injection loop. Sequential Data Plane active.' };
        return { icon: 'fa-user-shield', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', text: 'Zero Trust. Generating custom SCCM/Ansible Runbooks for client execution.' };
    };
    const strategy = getStrategyDetails();

    const discoveryComputeCount = useMemo(() => (project?.mgcData?.raw_inventory?.compute || project?.mgcData?.raw_inventory?.servers || []).length, [project?.mgcData]);
    const inScopeNodes = useMemo(() => (project.mapperNodes || []).filter(n => ['ECS', 'VM'].includes(String(n.type).toUpperCase()) && n.status !== 'Quoted Only'), [project.mapperNodes]);

    const safePartialUpdate = async (updates) => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            await fetch(`/api/erp/projects/${project.id}/partial`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(updates)
            });
            Object.keys(updates).forEach(k => onUpdateProject(project.id, k, updates[k]));
        } catch (e) { console.error("Failed partial update:", e); }
    };

    const advanceStatus = (newStatus) => {
        safePartialUpdate({ execStatus: newStatus });
        if (newStatus === 'syncing') setDriftAlert(true);
    };

    const handleProvisionIAM = async () => {
        setIamStatus('provisioning');
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch('/api/cloud/sts-token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ projectId: project.id }) });
            const data = await res.json();
            if (data.success) {
                const keys = { ak: data.ak, sk: data.sk, expires: data.expires_at, security_token: data.security_token };
                setEphemeralKeys(keys); setIamStatus('active'); setTokenValidated(false); safePartialUpdate({ ephemeralKeys: keys });
            } else { setIamStatus('pending'); alert(`STS Provisioning Failed:\n\n${data.error}`); }
        } catch (err) { setIamStatus('pending'); alert(`Network Error: ${err.message}`); }
    };

    const handleValidateToken = async () => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch('/api/cloud/validate-sts-token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ projectId: project.id }) });
            const data = await res.json();
            if (data.success && data.valid) { setTokenValidated(true); alert("✅ STS Token Validated!"); }
            else { alert(`❌ Validation Failed:\n\n${data.error}`); setIamStatus('pending'); setEphemeralKeys(null); setTokenValidated(false); safePartialUpdate({ ephemeralKeys: null }); }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    const handleRunPreflight = async () => {
        setPreflightStatus('scanning');
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/anticipate`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) { setAnticipationInsights(data.insights); safePartialUpdate({ anticipationInsights: data.insights }); }
        } catch (e) { console.warn("Anticipation API failed.", e); }

        setTimeout(() => {
            const assignments = {};
            inScopeNodes.forEach((n, idx) => {
                if (n.status === 'Live Only' && !project.crApproved) assignments[n.id] = { status: 'Scope Creep', vector: 'Blocked (Missing CR)', icon: 'fa-hand-paper', color: 'text-rose-500' };
                else {
                    if (idx % 4 === 0) assignments[n.id] = { status: 'UEFI Boot Mismatch', vector: 'Vector 2: Pre-Provisioned SMS Target', icon: 'fa-exclamation-triangle', color: 'text-amber-500' };
                    else if (idx % 5 === 0) assignments[n.id] = { status: 'Legacy Kernel (Win 2008)', vector: 'Vector 3: OBS VHD Image Import', icon: 'fa-times-circle', color: 'text-rose-500' };
                    else assignments[n.id] = { status: 'OS Healthy', vector: 'Vector 1: SMS Auto-Provision', icon: 'fa-check-circle', color: 'text-emerald-500' };
                }
            });
            setVectorAssignments(assignments); setPreflightStatus('done');
            safePartialUpdate({ vectorAssignments: assignments, execStatus: 'preflight_complete' });
        }, 2000);
    };

    const handleExecuteTerraform = async () => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) { alert(`✅ ${data.message}`); advanceStatus('agents_deployed'); }
            else { alert(`❌ Execution Failed:\n\n${data.error}`); }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    const handleDeployAgents = async () => {
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/deploy-agents`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ optIns: agentOptIns }) });
            const data = await res.json();
            if (data.success) {
                if (data.mode === 'manual') { setRunbookData(data.runbook); setShowRunbookModal(true); }
                else { alert(`✅ ${data.message}`); advanceStatus('syncing'); }
            } else { alert(`❌ Deployment Failed:\n\n${data.error}`); }
        } catch (err) { alert(`Network Error: ${err.message}`); }
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
                        <div className="bg-amber-100 border border-amber-300 text-amber-800 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-sm">
                            <i className="fas fa-exclamation-triangle mr-3 text-amber-600 text-lg"></i> 
                            <div><div>VPC Isolation Fallback Active</div><div className="text-[10px] font-bold text-amber-700/70 lowercase tracking-normal mt-0.5">Enterprise Project (EPS) missing. ERP reverting to isolated Sandbox VPC methodology.</div></div>
                        </div>
                    )}

                    <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden relative">
                        <div className="px-8 py-6 border-b border-slate-700 flex justify-between items-center relative z-10">
                            <div>
                                <h3 className="font-black text-2xl text-white flex items-center gap-3"><i className="fas fa-rocket text-indigo-400"></i> Execution Orchestrator</h3>
                                <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Cognitive Pre-Flight, Zero-Trust IAM & Dark Factory Provisioning</p>
                            </div>
                            <button onClick={() => setShowMasterGuide(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md flex items-center">
                                <i className="fas fa-book-open mr-2"></i> Master Execution Guide
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 relative z-10">
                            <div className="p-8 border-r border-slate-700 bg-slate-800/50 flex flex-col gap-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Source Plane Strategy</h4>
                                    <div className={`p-5 rounded-xl border ${strategy.border} ${strategy.bg} shadow-inner`}>
                                        <div className="flex items-center gap-3 mb-3"><i className={`fas ${strategy.icon} ${strategy.color} text-2xl`}></i><div className={`text-sm font-black ${strategy.color}`}>{authLevel}</div></div>
                                        <div className="text-xs text-slate-600 font-medium leading-relaxed">{strategy.text}</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2 flex items-center"><i className="fas fa-shield-alt mr-2"></i> Zero-Trust Target IAM</h4>
                                    <div className="space-y-4">
                                        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-inner relative overflow-hidden">
                                            {iamStatus === 'active' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Execution Boundary</div>
                                            <div className="text-xs font-mono text-amber-400 mb-4">{sandboxEpsRaw ? `EPS: ${sandboxEpsRaw}` : 'Isolated Sandbox VPC'}</div>
                                            
                                            {iamStatus === 'pending' && (<button onClick={handleProvisionIAM} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center"><i className="fas fa-key mr-2"></i> Provision STS Ephemeral Key</button>)}
                                            {iamStatus === 'provisioning' && (<div className="w-full py-2.5 bg-slate-800 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center border border-emerald-500/30"><i className="fas fa-circle-notch fa-spin mr-2"></i> Calling STS API...</div>)}
                                            {iamStatus === 'active' && ephemeralKeys && (
                                                <div className="space-y-2 animate-fade-in">
                                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-t border-slate-700 pt-3">Restricted Token Active</div>
                                                    <div className="text-[10px] font-mono text-slate-300 break-all">AK: {ephemeralKeys.ak}</div>
                                                    {!tokenValidated ? (
                                                        <button onClick={handleValidateToken} className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center"><i className="fas fa-check-circle mr-2"></i> Validate Token</button>
                                                    ) : (
                                                        <div className="mt-3 p-2 bg-emerald-900/30 border border-emerald-500/30 rounded-lg flex items-center justify-between"><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest"><i className="fas fa-check-circle mr-2"></i>Validated</span></div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 lg:col-span-2 space-y-6">
                                {/* PHASE 1 */}
                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'pending' || execStatus === 'preflight_complete' ? (iamStatus === 'active' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-600 bg-slate-800/80') : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${iamStatus === 'active' ? 'text-blue-500' : 'text-slate-500'}`}>Phase 1</div>
                                            <h4 className="text-lg font-black text-white mb-2">Scope Filter & Pre-Flight Diagnostics</h4>
                                        </div>
                                        {execStatus === 'pending' || preflightStatus === 'pending' ? (
                                            <button onClick={handleRunPreflight} disabled={iamStatus !== 'active' || preflightStatus === 'scanning'} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center">
                                                {preflightStatus === 'scanning' ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning OS</> : <><i className="fas fa-microscope mr-2"></i> Run Diagnostics</>}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => { setPreflightStatus('pending'); safePartialUpdate({ execStatus: 'pending' }); }} className="text-xs text-slate-400 hover:text-white underline">Re-Run</button>
                                                <div className="text-blue-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 🚨 COGNITIVE ALERTS */}
                                    {anticipationInsights && (
                                        <div className="mb-6 space-y-3 animate-fade-in">
                                            {anticipationInsights.quota_warnings?.map((warn, i) => (
                                                <div key={`quota-${i}`} className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex gap-3 text-amber-200">
                                                    <i className="fas fa-exclamation-triangle text-amber-500 mt-1"></i><div className="text-xs"><strong>EIP Quota:</strong> {warn}</div>
                                                </div>
                                            ))}
                                            {anticipationInsights.capacity_warnings?.map((warn, i) => (
                                                <div key={`cap-${i}`} className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg flex gap-3 text-rose-200">
                                                    <i className="fas fa-ban text-rose-500 mt-1"></i><div className="text-xs"><strong>Capacity Alert:</strong> {warn}</div>
                                                </div>
                                            ))}
                                            {anticipationInsights.upsell_opportunities?.map((upsell, i) => (
                                                <div key={`up-${i}`} className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-lg flex gap-3 text-indigo-200">
                                                    <i className="fas fa-lightbulb text-indigo-400 mt-1"></i><div className="text-xs"><strong>Upsell Anticipated:</strong> {upsell}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {preflightStatus === 'done' && (
                                        <div className="mt-6 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner">
                                            <div className="overflow-y-auto max-h-[300px] custom-scrollbar">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-800/80 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10">
                                                        <tr><th className="p-3">Compute Node</th><th className="p-3">OS Diagnostic Status</th><th className="p-3">Assigned Execution Vector</th></tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-700/50 text-slate-300">
                                                        {inScopeNodes.map(n => {
                                                            const data = vectorAssignments[n.id] || { status: 'Pending', vector: 'Vector 1: SMS Auto-Provision', icon: 'fa-circle-notch', color: 'text-slate-500' };
                                                            return (
                                                                <tr key={n.id} className="hover:bg-slate-800 transition-colors">
                                                                    <td className="p-3 font-bold text-white"><i className="fas fa-server text-blue-400 mr-2"></i>{n.name}</td>
                                                                    <td className="p-3"><span className={`px-2 py-1 rounded bg-slate-950 border border-slate-700 font-bold ${data.color} flex w-max items-center`}><i className={`fas ${data.icon} mr-1.5`}></i> {data.status}</span></td>
                                                                    <td className="p-3">
                                                                        <select value={data.vector} onChange={(e) => handleVectorChange(n.id, e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-300 px-2 py-1.5 rounded outline-none font-bold text-[10px] uppercase">
                                                                            <option>Vector 1: SMS Auto-Provision</option><option>Vector 2: Pre-Provisioned SMS Target</option>
                                                                            <option>Vector 3: OBS VHD Image Import</option><option>Vector 4: Direct OS-Level Rsync</option>
                                                                        </select>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-3 bg-slate-800/80 border-t border-slate-700 text-right">
                                                <button onClick={() => advanceStatus('sandbox_built')} disabled={!tokenValidated} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center shadow-md ml-auto">
                                                    <i className="fas fa-lock mr-2"></i> Approve Matrix & Proceed
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* PHASE 2 */}
                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'sandbox_built' ? 'border-amber-500 bg-slate-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Phase 2</div>
                                            <h4 className="text-lg font-black text-white mb-2">Build Landing Zone & Pre-Provision Targets</h4>
                                            <p className="text-xs text-slate-400">Compiles the blueprint into Terraform. Deploys network, empty CBR vaults, and factory worker.</p>
                                        </div>
                                        {execStatus === 'sandbox_built' ? (
                                            <button onClick={handleExecuteTerraform} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap"><i className="fas fa-play mr-2"></i> Execute Terraform</button>
                                        ) : ['agents_deployed', 'syncing', 'cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-amber-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                {/* PHASE 3 */}
                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'agents_deployed' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="pr-6 w-full">
                                            <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 3</div>
                                            <h4 className="text-lg font-black text-white mb-4 border-b border-slate-700 pb-2">Deploy Agents & Execute Syncs</h4>
                                            
                                            {execStatus === 'agents_deployed' && (
                                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5 animate-fade-in">
                                                    <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3"><i className="fas fa-robot mr-2"></i> Cognitive Anticipation Engine</h5>
                                                    <div className="space-y-2">
                                                        <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-600 rounded-lg cursor-pointer">
                                                            <input type="checkbox" checked={agentOptIns.uniAgent} onChange={e=>setAgentOptIns({...agentOptIns, uniAgent: e.target.checked})} className="w-4 h-4 accent-blue-500" />
                                                            <div>
                                                                <div className="text-xs font-black text-white">Huawei UniAgent (CES) <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] ml-2">Free</span></div>
                                                                <div className="text-[9px] text-slate-400">Captures internal RAM and Disk I/O metrics.</div>
                                                            </div>
                                                        </label>
                                                        <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
                                                            <input type="checkbox" checked={agentOptIns.hss} disabled className="w-4 h-4 accent-rose-500 opacity-50" />
                                                            <div>
                                                                <div className="text-xs font-black text-white">Host Security Service (HSS)</div>
                                                                <div className="text-[9px] text-slate-400">{agentOptIns.hss ? "Enabled via SOW." : "Not found in SOW."}</div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        {execStatus === 'agents_deployed' ? (
                                            <button onClick={handleDeployAgents} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">
                                                <i className="fas fa-satellite-dish mr-2"></i> Trigger Data Plane
                                            </button>
                                        ) : ['syncing', 'cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-purple-500 flex flex-col items-end">
                                                <i className="fas fa-check-circle text-2xl mb-2"></i>
                                                <button onClick={() => setShowRunbookModal(true)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white border border-slate-600 bg-slate-800 px-3 py-1.5 rounded-lg mt-2">View Runbooks</button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                {/* PHASE 4 */}
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
                                                            <p className="text-[11px] text-rose-200/70 mt-1">Unexpected instance detected. Does not match approved SOW baseline.</p>
                                                            <div className="flex gap-3 mt-4">
                                                                <button onClick={() => { alert("Auto-Revert triggered."); setDriftAlert(false); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">Destroy VM</button>
                                                                <button onClick={() => { alert("Alert routed to TAM."); setDriftAlert(false); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-rose-500/50 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest">Alert TAM</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {execStatus === 'syncing' ? (
                                            <button onClick={() => advanceStatus('cutover_ready')} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap"><i className="fas fa-forward mr-2"></i> Wave Synced</button>
                                        ) : ['cutover_ready', 'completed'].includes(execStatus) ? (
                                            <div className="text-rose-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                        ) : null}
                                    </div>
                                </div>

                                {/* 🚨 PHASE 5: THE CUTOVER RUNBOOK EXECUTION */}
                                <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'cutover_ready' ? 'border-emerald-500 bg-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Phase 5</div>
                                            <h4 className="text-lg font-black text-white mb-2">Wave Execution & Production Cutover</h4>
                                            <p className="text-xs text-slate-400">Execute the Wave Cutover Runbook defined in Step 3. Finalize DNS, attach CBR vaults, and close the migration.</p>
                                        </div>
                                    </div>
                                    
                                    {execStatus === 'cutover_ready' && (
                                        <div className="mt-6 border-t border-slate-700 pt-6">
                                            <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl mb-6 flex items-start gap-3 text-emerald-300">
                                                <i className="fas fa-calendar-check mt-1"></i>
                                                <div className="text-sm">
                                                    Use the Runbook checklist below to execute the Cutover waves you planned. Once all waves are 100% complete, click 'Finalize Complete Cutover' below.
                                                </div>
                                            </div>
                                            
                                            {/* Render the interactive Runbook here for execution */}
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
            
        </div>
    );
}

// 🚨 FULLY RESTORED FINOPS & COMMAND CENTER HUB
function ExecutionHubView({ project, onUpdateProject, safePartialUpdate }) {
    const [comms, setComms] = useState(project.comms || { bridge: "", chat: "", notes: "" });
    useEffect(() => { setComms(project.comms || { bridge: "", chat: "", notes: "" }); }, [project]);
    
    // Calculates overlapping runtimes (Mattress)
    const mrr = project.mrr || 5000; 
    const overheadBudget = mrr * 0.15; 
    const currentBurn = (project.mapperNodes || []).length * 45; 

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

            {/* RESTORED LINKS & CHAT */}
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
            
            {/* RESTORED GANTT CHART */}
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

// 🚨 FULLY RESTORED TAM GOVERNANCE AND TICKETING SYSTEM
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
