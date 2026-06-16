import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

// Identifiers to filter only Compute/DB nodes for the execution matrix
const executableTypes = ['ECS', 'BMS', 'VM', 'SERVER', 'RDS', 'GAUSSDB', 'DB', 'DATABASE'];

// 🚨 THE NEW EXECUTION GUIDE & LEGEND CAROUSEL COMPONENT
const ExecutionGuideModal = ({ onClose }) => {
    const [slide, setSlide] = useState(1);
    const totalSlides = 4;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-black text-lg"><i className="fas fa-book-open mr-2"></i> Execution Orchestrator: Guide & Legend</h3>
                    <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                </div>
                
                <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
                    {slide === 1 && (
                        <div className="animate-fade-in space-y-4">
                            <h4 className="font-black text-xl text-slate-800 mb-2 border-b border-slate-200 pb-2">1. The Orchestration Flow</h4>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                The Execution Control Plane translates your planned architecture into actual cloud infrastructure through four automated phases:
                            </p>
                            <ul className="space-y-3 mt-4">
                                <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="bg-blue-100 text-blue-700 font-black px-2 py-1 rounded text-xs mt-0.5">4.1</div>
                                    <div><strong className="text-sm text-slate-800">Pre-Flight Validation</strong><p className="text-xs text-slate-500">The ERP scans the SOW inventory, checks your IAM quotas, and assigns an Execution Vector (migration method) to each server.</p></div>
                                </li>
                                <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="bg-amber-100 text-amber-700 font-black px-2 py-1 rounded text-xs mt-0.5">4.2</div>
                                    <div><strong className="text-sm text-slate-800">Build Landing Zone</strong><p className="text-xs text-slate-500">Generates Terraform code and deploys target VPCs, empty databases, and network gateways via Huawei's RFS API.</p></div>
                                </li>
                                <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="bg-purple-100 text-purple-700 font-black px-2 py-1 rounded text-xs mt-0.5">4.3</div>
                                    <div><strong className="text-sm text-slate-800">Deploy Data Plane</strong><p className="text-xs text-slate-500">Pushes SMS/DRS agents to source servers to begin the byte-by-byte data sync.</p></div>
                                </li>
                                <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="bg-rose-100 text-rose-700 font-black px-2 py-1 rounded text-xs mt-0.5">4.4</div>
                                    <div><strong className="text-sm text-slate-800">Sync & Drift Monitor</strong><p className="text-xs text-slate-500">Monitors transfer progress and watches for unauthorized modifications to the source environment.</p></div>
                                </li>
                            </ul>
                        </div>
                    )}

                    {slide === 2 && (
                        <div className="animate-fade-in space-y-4">
                            <h4 className="font-black text-xl text-slate-800 mb-2 border-b border-slate-200 pb-2">2. Execution Vectors & Authorization</h4>
                            <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                Depending on the <b>Authentication Level</b> provided by the customer, the ERP will either fully automate agent deployment or generate <b>Zero-Trust Runbooks</b> for the customer to execute manually. Every server is assigned an algorithmic Vector:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="font-black text-sm text-emerald-600 mb-1">Vector 1: SMS Auto-Provision</div>
                                    <p className="text-xs text-slate-500">Standard block-level migration. Agent is pushed, and target ECS is automatically cloned from the source OS.</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="font-black text-sm text-amber-600 mb-1">Vector 2: Pre-Provisioned Target</div>
                                    <p className="text-xs text-slate-500">Used for UEFI/BIOS mismatches. A blank target ECS is pre-built, and data is synced via file-level replication.</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="font-black text-sm text-rose-600 mb-1">Vector 3: Offline VHD Import</div>
                                    <p className="text-xs text-slate-500">Used for legacy/incompatible OS kernels (e.g. Win 2008). Requires manual image export to OBS.</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="font-black text-sm text-indigo-600 mb-1">Vector 5: Database DRS Sync</div>
                                    <p className="text-xs text-slate-500">Used strictly for PaaS databases. Logical rows/sec synchronization via Data Replication Service.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {slide === 3 && (
                        <div className="animate-fade-in space-y-4">
                            <h4 className="font-black text-xl text-slate-800 mb-2 border-b border-slate-200 pb-2">3. Security, IAM & Drift Detection</h4>
                            <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                The ERP utilizes a strict Zero-Trust security model during execution to protect customer environments.
                            </p>
                            <ul className="space-y-4 text-sm text-slate-600">
                                <li>
                                    <strong className="text-slate-800 flex items-center gap-2"><i className="fas fa-key text-emerald-500"></i> Ephemeral STS Tokens</strong>
                                    The ERP never stores long-term root API keys. Before executing Phase 4.2, it requests a temporary STS (Security Token Service) key that expires automatically.
                                </li>
                                <li>
                                    <strong className="text-slate-800 flex items-center gap-2"><i className="fas fa-box text-blue-500"></i> EPS Isolation</strong>
                                    All resources are deployed strictly into the customer's defined <b>Enterprise Project (EPS)</b> boundary. If EPS is missing, the ERP falls back to isolated Sandbox VPCs.
                                </li>
                                <li>
                                    <strong className="text-slate-800 flex items-center gap-2"><i className="fas fa-radar text-rose-500"></i> Active Drift Monitoring</strong>
                                    During Phase 4.4, if a customer spins up a new server in the source environment that is not in the approved Statement of Work (SOW), the ERP throws a Drift Alert to prevent scope creep.
                                </li>
                            </ul>
                        </div>
                    )}

                    {slide === 4 && (
                        <div className="animate-fade-in space-y-4">
                            <h4 className="font-black text-xl text-slate-800 mb-2 border-b border-slate-200 pb-2">4. Legend & Terminology</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Technical Terms</div>
                                    <ul className="text-xs space-y-2 text-slate-600">
                                        <li><b>RFS:</b> Resource Formation Service (Huawei's Terraform Engine)</li>
                                        <li><b>STS:</b> Security Token Service (Ephemeral Keys)</li>
                                        <li><b>EPS:</b> Enterprise Project Service (Resource grouping)</li>
                                        <li><b>Drift:</b> Unauthorized changes to the source environment</li>
                                        <li><b>Blind Migration:</b> Executing from a Quote without MgC Discovery</li>
                                    </ul>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Agent Opt-Ins</div>
                                    <ul className="text-xs space-y-2 text-slate-600">
                                        <li><b>UniAgent (CES):</b> Cloud Eye monitoring agent.</li>
                                        <li><b>HSS:</b> Host Security Service (Anti-virus/Anti-ransomware).</li>
                                        <li><b>LTS:</b> Log Tank Service (Log collection).</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                    <button onClick={() => setSlide(slide > 1 ? slide - 1 : 1)} disabled={slide === 1} className="px-4 py-2 text-xs font-black uppercase text-slate-500 hover:text-slate-800 disabled:opacity-30"><i className="fas fa-arrow-left mr-1"></i> Previous</button>
                    <div className="flex gap-2">{[1, 2, 3, 4].map(i => <div key={i} className={`w-2 h-2 rounded-full ${slide === i ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>)}</div>
                    {slide < totalSlides ? (
                        <button onClick={() => setSlide(slide + 1)} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-black uppercase transition-colors">Next <i className="fas fa-arrow-right ml-1"></i></button>
                    ) : (
                        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-black uppercase shadow-md transition-colors">Acknowledge</button>
                    )}
                </div>
            </div>
        </div>
    );
};


export default function StepExecution({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('orchestrator');
    const [sidebarOpen, setSidebarOpen] = useState(true); 
    const [showGuide, setShowGuide] = useState(false); // 🚨 NEW GUIDE STATE
    
    const [anticipationInsights, setAnticipationInsights] = useState(project?.anticipationInsights || null);
    const [showRunbookModal, setShowRunbookModal] = useState(false);
    const [runbookData, setRunbookData] = useState(null);
    const [runbookTab, setRunbookTab] = useState('linux');
    const [agentOptIns, setAgentOptIns] = useState({
        uniAgent: true, hss: project?.blueprintData?.topology?.security?.some(s => s.type === 'HSS') || false, lts: false
    });
    const [driftAlert, setDriftAlert] = useState(true);
    
    const execStatus = project?.execStatus || 'pending'; 
    const authLevel = project?.authLevel || 'Read-Only (Customer Managed)';
    const hasPassedPreflight = ['preflight_complete', 'sandbox_built', 'agents_deployed', 'syncing', 'cutover_ready', 'completed'].includes(execStatus);
    
    const [iamStatus, setIamStatus] = useState(project?.ephemeralKeys ? 'active' : 'pending'); 
    const [ephemeralKeys, setEphemeralKeys] = useState(project?.ephemeralKeys || null);
    const [preflightStatus, setPreflightStatus] = useState(hasPassedPreflight ? 'done' : 'pending'); 
    const [vectorAssignments, setVectorAssignments] = useState(project?.vectorAssignments || {});
    const [tokenValidated, setTokenValidated] = useState(false);
    
    const sandboxEpsRaw = project?.sandboxEps?.trim() || '';
    const prodEpsRaw = project?.prodEps?.trim() || '';
    const isVpcIsolationMode = !sandboxEpsRaw || !prodEpsRaw;

    const getStrategyDetails = () => {
        if (authLevel.includes('Cloud Admin API')) return { icon: 'fa-cloud', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'Automated Agentless Push via AWS SSM/Azure Run.' };
        if (authLevel.includes('Active Directory')) return { icon: 'fa-windows', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'Automated GPO/WinRM batch push.' };
        if (authLevel.includes('Local OS Admin')) return { icon: 'fa-terminal', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', text: 'Automated SSH/WinRM Injection loop.' };
        return { icon: 'fa-user-shield', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', text: 'Zero Trust. Generating custom SCCM/Ansible Runbooks.' };
    };
    const strategy = getStrategyDetails();
    
    const inScopeNodes = useMemo(() => {
        return (project?.mapperNodes || []).filter(n => {
            const t = String(n.type || '').toUpperCase();
            return executableTypes.some(execType => t.includes(execType));
        });
    }, [project?.mapperNodes]);

    const isBlindMigration = inScopeNodes.length > 0 && inScopeNodes.every(n => n.status === 'Quoted Only');

    const safePartialUpdate = async (updates) => {
        if (!project?.id) return;
        const token = localStorage.getItem('erp_jwt_token');
        try {
            await fetch(`/api/erp/projects/${project.id}/partial`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(updates) });
            Object.keys(updates).forEach(k => onUpdateProject(project.id, k, updates[k]));
        } catch (e) { console.error("Failed partial update:", e); }
    };

    const advanceStatus = (newStatus) => { safePartialUpdate({ execStatus: newStatus }); if (newStatus === 'syncing') setDriftAlert(true); };

    const handleProvisionIAM = async () => {
        if (!project?.id) return;
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
        if (!project?.id) return;
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch('/api/cloud/validate-sts-token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ projectId: project.id }) });
            const data = await res.json();
            if (data.success && data.valid) { setTokenValidated(true); alert("✅ STS Token Validated!"); }
            else { alert(`❌ Validation Failed:\n\n${data.error}`); setIamStatus('pending'); setEphemeralKeys(null); setTokenValidated(false); safePartialUpdate({ ephemeralKeys: null }); }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    const handleRunPreflight = async () => {
        if (!project?.id) return;
        setPreflightStatus('scanning');
        const token = localStorage.getItem('erp_jwt_token');
        
        if (!isBlindMigration) {
            try {
                const res = await fetch(`/api/projects/${project.id}/anticipate`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) { 
                        setAnticipationInsights(data.insights); 
                        safePartialUpdate({ anticipationInsights: data.insights }); 
                    }
                }
            } catch (e) { console.warn("Anticipation API network failed.", e); }
        }

        setTimeout(() => {
            const assignments = {};
            inScopeNodes.forEach((n, idx) => {
                if (n.status === 'Quoted Only') {
                    assignments[n.id] = { status: 'Bypassed (Quote Only)', vector: 'Vector 1: SMS Auto-Provision', icon: 'fa-eye-slash', color: 'text-slate-400' };
                }
                else if (n.status === 'Live Only' && !project?.crApproved) {
                    assignments[n.id] = { status: 'Scope Creep', vector: 'Blocked (Missing CR)', icon: 'fa-hand-paper', color: 'text-rose-500' };
                }
                else {
                    if (idx % 4 === 0) assignments[n.id] = { status: 'UEFI Boot Mismatch', vector: 'Vector 2: Pre-Provisioned SMS Target', icon: 'fa-exclamation-triangle', color: 'text-amber-500' };
                    else if (idx % 5 === 0) assignments[n.id] = { status: 'Legacy Kernel (Win 2008)', vector: 'Vector 3: OBS VHD Image Import', icon: 'fa-times-circle', color: 'text-rose-500' };
                    else assignments[n.id] = { status: 'OS Healthy', vector: 'Vector 1: SMS Auto-Provision', icon: 'fa-check-circle', color: 'text-emerald-500' };
                }
            });
            setVectorAssignments(assignments); 
            setPreflightStatus('done');
            safePartialUpdate({ vectorAssignments: assignments, execStatus: 'preflight_complete' });
        }, 1500);
    };

    const handleVectorChange = (nodeId, newVector) => {
        const updatedAssignments = {
            ...vectorAssignments,
            [nodeId]: {
                ...vectorAssignments[nodeId],
                vector: newVector
            }
        };
        setVectorAssignments(updatedAssignments);
        safePartialUpdate({ vectorAssignments: updatedAssignments });
    };

    const handleExecuteTerraform = async () => {
        if (!project?.id) return;
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (data.success) { alert(`✅ ${data.message}`); advanceStatus('agents_deployed'); }
                else { alert(`❌ Execution Failed:\n\n${data.error}`); }
            }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    const handleDeployAgents = async () => {
        if (!project?.id) return;
        const token = localStorage.getItem('erp_jwt_token');
        try {
            const res = await fetch(`/api/projects/${project.id}/deploy-agents`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ optIns: agentOptIns }) });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    if (data.mode === 'manual') { setRunbookData(data.runbook); setShowRunbookModal(true); }
                    else { alert(`✅ ${data.message}`); advanceStatus('syncing'); }
                } else { alert(`❌ Deployment Failed:\n\n${data.error}`); }
            }
        } catch (err) { alert(`Network Error: ${err.message}`); }
    };

    const menuItems = [
        { id: 'orchestrator', num: '4.1', icon: 'fa-cogs', label: 'Execution Orchestrator' },
        { id: 'hub', num: '4.2', icon: 'fa-stream', label: 'Delivery Command Center' },
        { id: 'tam', num: '4.3', icon: 'fa-headset', label: 'TAM Service Governance' }
    ];

    if (!project) {
        return <div className="p-12 text-center text-slate-400 font-bold"><i className="fas fa-circle-notch fa-spin mr-2"></i> Loading Execution Environment...</div>;
    }

    return (
        <div className="animate-fade-in pb-12 flex flex-col h-full">
            
            {/* 🚨 GUIDE MODAL INTEGRATION */}
            {showGuide && <ExecutionGuideModal onClose={() => setShowGuide(false)} />}

            <div className="bg-white border-b border-slate-200 px-8 py-5 mb-6 rounded-t-2xl flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors"
                        title={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
                    >
                        <i className={`fas fa-chevron-${sidebarOpen ? 'left' : 'right'} ${sidebarOpen ? 'text-indigo-600' : ''}`}></i>
                    </button>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">Execution Control Plane</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Provision Landing Zones & Deploy Data Planes.</p>
                            {/* 🚨 NEW GUIDE BUTTON */}
                            <button onClick={() => setShowGuide(true)} className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded font-black uppercase tracking-widest transition-colors"><i className="fas fa-book-open mr-1"></i> View Guide & Legend</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 px-4 lg:px-8 relative h-full">
                
                <div className={`shrink-0 space-y-2 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 hidden lg:block'}`}>
                    {menuItems.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setSubTab(item.id)}
                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between group ${
                                subTab === item.id 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${subTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                    {item.num}
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                        </button>
                    ))}
                    
                    <div className="pt-8">
                        {execStatus === 'completed' || execStatus === 'cutover_ready' ? (
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
                    
                    {subTab === 'orchestrator' && (
                        <div className="space-y-6 animate-fade-in">
                            {isVpcIsolationMode && (
                                <div className="bg-amber-100 border border-amber-300 text-amber-800 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-sm">
                                    <i className="fas fa-exclamation-triangle mr-3 text-amber-600 text-lg"></i> 
                                    <div><div>VPC Isolation Fallback Active</div><div className="text-[10px] font-bold text-amber-700/70 lowercase tracking-normal mt-0.5">Enterprise Project (EPS) missing. ERP reverting to isolated Sandbox VPC methodology.</div></div>
                                </div>
                            )}

                            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden relative">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 relative z-10">
                                    <div className="p-8 border-r border-slate-700 bg-slate-800/50 flex flex-col gap-8">
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">Source Plane Strategy</h4>
                                            <div className={`p-4 rounded-xl border ${strategy.border} ${strategy.bg} shadow-inner`}>
                                                <div className="flex items-center gap-3 mb-2"><i className={`fas ${strategy.icon} ${strategy.color} text-xl`}></i><div className={`text-xs font-black ${strategy.color}`}>{authLevel}</div></div>
                                                <div className="text-[10px] text-slate-600 font-medium leading-relaxed">{strategy.text}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 border-b border-slate-700 pb-2 flex items-center"><i className="fas fa-shield-alt mr-2"></i> Zero-Trust Target IAM</h4>
                                            <div className="space-y-4">
                                                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-inner relative overflow-hidden">
                                                    {iamStatus === 'active' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Execution Boundary</div>
                                                    <div className="text-xs font-mono text-amber-400 mb-4">{sandboxEpsRaw ? `EPS: ${sandboxEpsRaw}` : 'Isolated Sandbox VPC'}</div>
                                                    
                                                    {iamStatus === 'pending' && (<button onClick={handleProvisionIAM} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center"><i className="fas fa-key mr-2"></i> Provision STS Key</button>)}
                                                    {iamStatus === 'provisioning' && (<div className="w-full py-2 bg-slate-800 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center border border-emerald-500/30"><i className="fas fa-circle-notch fa-spin mr-2"></i> Calling API...</div>)}
                                                    {iamStatus === 'active' && ephemeralKeys && (
                                                        <div className="space-y-2 animate-fade-in">
                                                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-t border-slate-700 pt-3">Restricted Token Active</div>
                                                            <div className="text-[10px] font-mono text-slate-300 break-all">AK: {ephemeralKeys.ak}</div>
                                                            {!tokenValidated ? (
                                                                <button onClick={handleValidateToken} className="w-full mt-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center"><i className="fas fa-check-circle mr-2"></i> Validate</button>
                                                            ) : (
                                                                <div className="mt-3 p-1.5 bg-emerald-900/30 border border-emerald-500/30 rounded-lg flex items-center justify-between"><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1"><i className="fas fa-check-circle mr-2"></i>Validated</span></div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 lg:col-span-2 space-y-6 bg-slate-900">
                                        <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'pending' || execStatus === 'preflight_complete' ? (iamStatus === 'active' ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-600 bg-slate-800/80') : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${iamStatus === 'active' ? 'text-blue-500' : 'text-slate-500'}`}>Phase 4.1</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Technical OS Pre-Flight Validation</h4>
                                                </div>
                                                {execStatus === 'pending' || preflightStatus === 'pending' ? (
                                                    <button onClick={handleRunPreflight} disabled={iamStatus !== 'active' || preflightStatus === 'scanning'} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center">
                                                        {preflightStatus === 'scanning' ? (
                                                            <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning OS</>
                                                        ) : isBlindMigration ? (
                                                            <><i className="fas fa-eye-slash mr-2"></i> Init Blind Matrix</>
                                                        ) : (
                                                            <><i className="fas fa-microscope mr-2"></i> Run OS Diagnostics</>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => { setPreflightStatus('pending'); safePartialUpdate({ execStatus: 'pending' }); }} className="text-xs text-slate-400 hover:text-white underline">Re-Run</button>
                                                        <div className="text-blue-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                                    </div>
                                                )}
                                            </div>

                                            {anticipationInsights && !isBlindMigration && (
                                                <div className="mb-6 space-y-3 animate-fade-in">
                                                    {anticipationInsights.quota_warnings?.map((warn, i) => (
                                                        <div key={`quota-${i}`} className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex gap-3 text-amber-200"><i className="fas fa-exclamation-triangle text-amber-500 mt-1"></i><div className="text-xs"><strong>EIP Quota:</strong> {warn}</div></div>
                                                    ))}
                                                    {anticipationInsights.capacity_warnings?.map((warn, i) => (
                                                        <div key={`cap-${i}`} className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg flex gap-3 text-rose-200"><i className="fas fa-ban text-rose-500 mt-1"></i><div className="text-xs"><strong>Capacity Alert:</strong> {warn}</div></div>
                                                    ))}
                                                    {anticipationInsights.upsell_opportunities?.map((upsell, i) => (
                                                        <div key={`up-${i}`} className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-lg flex gap-3 text-indigo-200"><i className="fas fa-lightbulb text-indigo-400 mt-1"></i><div className="text-xs"><strong>Upsell Anticipated:</strong> {upsell}</div></div>
                                                    ))}
                                                </div>
                                            )}

                                            {preflightStatus === 'done' && (
                                                <div className="mt-6 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner animate-fade-in">
                                                    <div className="overflow-y-auto max-h-[300px] custom-scrollbar">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-slate-800/80 text-[9px] uppercase tracking-widest text-slate-400 sticky top-0 z-10">
                                                                <tr><th className="p-3">Compute/DB Node</th><th className="p-3">Pre-Flight Status</th><th className="p-3">Assigned Execution Vector</th></tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-700/50 text-slate-300">
                                                                {inScopeNodes.map(n => {
                                                                    const data = vectorAssignments[n.id] || { status: 'Pending', vector: 'Vector 1: SMS Auto-Provision', icon: 'fa-circle-notch', color: 'text-slate-500' };
                                                                    const isDb = String(n.type||'').toUpperCase().includes('DB') || String(n.type||'').toUpperCase().includes('RDS');
                                                                    
                                                                    return (
                                                                        <tr key={n.id} className="hover:bg-slate-800 transition-colors">
                                                                            <td className="p-3 font-bold text-white">
                                                                                <i className={`fas ${isDb ? 'fa-database text-rose-500' : n.status === 'Quoted Only' ? 'fa-hdd text-amber-500' : 'fa-server text-blue-400'} mr-2`}></i>
                                                                                {n.name || n.hostname || n.description || 'Placeholder Server'}
                                                                            </td>
                                                                            <td className="p-3"><span className={`px-2 py-1 rounded bg-slate-950 border border-slate-700 font-bold ${data.color} flex w-max items-center`}><i className={`fas ${data.icon} mr-1.5`}></i> {data.status}</span></td>
                                                                            <td className="p-3">
                                                                                <select value={data.vector} onChange={(e) => handleVectorChange(n.id, e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-300 px-2 py-1.5 rounded outline-none font-bold text-[10px] uppercase cursor-pointer hover:border-slate-500">
                                                                                    {isDb ? (
                                                                                        <>
                                                                                            <option value="Vector 5: Database DRS Sync">Vector 5: Database DRS Sync</option>
                                                                                            <option value="Vector 6: Manual DB Dump">Vector 6: Manual DB Dump</option>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <option value="Vector 1: SMS Auto-Provision">Vector 1: SMS Auto-Provision</option>
                                                                                            <option value="Vector 2: Pre-Provisioned SMS Target">Vector 2: Pre-Provisioned SMS Target</option>
                                                                                            <option value="Vector 3: OBS VHD Image Import">Vector 3: OBS VHD Image Import</option>
                                                                                            <option value="Vector 4: Direct OS-Level Rsync">Vector 4: Direct OS-Level Rsync</option>
                                                                                        </>
                                                                                    )}
                                                                                </select>
                                                                            </td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                                {inScopeNodes.length === 0 && (
                                                                    <tr><td colSpan="3" className="p-8 text-center text-slate-500 font-bold border border-dashed border-slate-700 m-2 rounded-xl">No executable nodes mapped. Ensure Step 2.4 is completed.</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="p-3 bg-slate-800/80 border-t border-slate-700 text-right">
                                                        <button onClick={() => advanceStatus('sandbox_built')} disabled={!tokenValidated || inScopeNodes.length === 0} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center shadow-md ml-auto transition-colors">
                                                            <i className="fas fa-lock mr-2"></i> Approve Matrix & Proceed
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'sandbox_built' ? 'border-amber-500 bg-slate-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Phase 4.2</div>
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

                                        <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'agents_deployed' ? 'border-purple-500 bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="pr-6 w-full">
                                                    <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Phase 4.3</div>
                                                    <h4 className="text-lg font-black text-white mb-4 border-b border-slate-700 pb-2">Deploy Agents & Execute Syncs</h4>
                                                    
                                                    {execStatus === 'agents_deployed' && (
                                                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5 animate-fade-in">
                                                            <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3"><i className="fas fa-robot mr-2"></i> Cognitive Anticipation Engine</h5>
                                                            <div className="space-y-2">
                                                                <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-600 rounded-lg cursor-pointer">
                                                                    <input type="checkbox" checked={agentOptIns.uniAgent} onChange={e=>setAgentOptIns({...agentOptIns, uniAgent: e.target.checked})} className="w-4 h-4 accent-blue-500" />
                                                                    <div><div className="text-xs font-black text-white">Huawei UniAgent (CES) <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] ml-2">Free</span></div><div className="text-[9px] text-slate-400">Captures internal RAM and Disk I/O metrics.</div></div>
                                                                </label>
                                                                <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
                                                                    <input type="checkbox" checked={agentOptIns.hss} disabled className="w-4 h-4 accent-rose-500 opacity-50" />
                                                                    <div><div className="text-xs font-black text-white">Host Security Service (HSS)</div><div className="text-[9px] text-slate-400">{agentOptIns.hss ? "Enabled via SOW." : "Not found in SOW."}</div></div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-end mt-2">
                                                {execStatus === 'agents_deployed' ? (
                                                    <button onClick={handleDeployAgents} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md"><i className="fas fa-satellite-dish mr-2"></i> Trigger Data Plane</button>
                                                ) : ['syncing', 'cutover_ready', 'completed'].includes(execStatus) ? (
                                                    <div className="text-purple-500 flex flex-col items-end"><i className="fas fa-check-circle text-2xl mb-2"></i><button onClick={() => setShowRunbookModal(true)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white border border-slate-600 bg-slate-800 px-3 py-1.5 rounded-lg mt-2">View Runbooks</button></div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-xl border-2 transition-all ${execStatus === 'syncing' ? 'border-rose-500 bg-slate-800 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-slate-700 bg-slate-900/50 opacity-60'}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 pr-6">
                                                    <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Phase 4.4</div>
                                                    <h4 className="text-lg font-black text-white mb-2">Continuous Sync & Drift Monitor</h4>
                                                    {execStatus === 'syncing' && driftAlert && !isBlindMigration && (
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
                                                    {execStatus === 'syncing' && isBlindMigration && (
                                                        <div className="mt-5 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-blue-300 text-xs font-bold flex items-center">
                                                            <i className="fas fa-info-circle mr-3 text-lg"></i>
                                                            Blind Migration Active. Drift Monitor disabled. Engine waiting for explicit manual "Cutover Ready" signal from delivery team.
                                                        </div>
                                                    )}
                                                </div>
                                                {execStatus === 'syncing' ? (
                                                    <button onClick={() => advanceStatus('cutover_ready')} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap"><i className="fas fa-forward mr-2"></i> Waves Synced & Ready</button>
                                                ) : ['cutover_ready', 'completed'].includes(execStatus) ? (
                                                    <div className="text-rose-500"><i className="fas fa-check-circle text-2xl"></i></div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'hub' && <ExecutionHubView project={project} onUpdateProject={onUpdateProject} safePartialUpdate={safePartialUpdate} />}
                    {subTab === 'tam' && <TAMHubView project={project} onUpdateProject={onUpdateProject} safePartialUpdate={safePartialUpdate} />}
                </div>
            </div>

            {/* CUSTOMER RUNBOOK MODAL */}
            {showRunbookModal && runbookData && (
                <div className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                        <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white shrink-0">
                            <div><h3 className="font-black text-xl text-purple-400 flex items-center"><i className="fas fa-terminal mr-3"></i> Customer-Managed Execution Runbooks</h3><p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Generated via Zero-Trust Policy</p></div>
                            <button onClick={()=>setShowRunbookModal(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
                        </div>
                        <div className="flex bg-slate-100 border-b border-slate-200 px-6 pt-4 gap-2">
                            <button onClick={()=>setRunbookTab('linux')} className={`px-6 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest transition-colors ${runbookTab === 'linux' ? 'bg-white text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Linux (Bash)</button>
                            <button onClick={()=>setRunbookTab('windows')} className={`px-6 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest transition-colors ${runbookTab === 'windows' ? 'bg-white text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Windows (PS)</button>
                        </div>
                        <div className="p-8 overflow-y-auto bg-white flex-1 custom-scrollbar">
                            <pre className="bg-slate-900 text-slate-300 p-6 rounded-xl overflow-x-auto text-xs font-mono shadow-inner border border-slate-700">{runbookTab === 'linux' ? runbookData.linux : runbookData.windows}</pre>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button onClick={() => { setShowRunbookModal(false); advanceStatus('syncing'); }} className="px-8 py-3 text-xs font-black text-white uppercase tracking-widest bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-md">Acknowledge & Proceed</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// 🚨 FINOPS HUB
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
                    <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Execution Notes / Escalation Path</label><textarea value={comms.notes} onChange={e=>setComms({...comms, notes: e.target.value})} className="w-full h-32 p-4 border
