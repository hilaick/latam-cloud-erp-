import React, { useState, useMemo, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function GovernanceAndCRView({ activeProject, onUpdateProject }) {
    const { customPlaybooks, setCustomPlaybooks } = useContext(ERPContext);
    
    const [isLocked, setIsLocked] = useState(activeProject?.status === 'Approved' || activeProject?.status === 'Locked');
    const [showCRModal, setShowCRModal] = useState(false);
    const [showGovernanceHelp, setShowGovernanceHelp] = useState(false);
    
    const [crTitle, setCrTitle] = useState('');
    const [crReason, setCrReason] = useState('');
    const [crApprover, setCrApprover] = useState('Partner');
    const [crCost, setCrCost] = useState(0);
    const [crResource, setCrResource] = useState('Global/Unknown'); 
    const [crType, setCrType] = useState('minor'); 
    const [updatePlaybook, setUpdatePlaybook] = useState(false); 

    const nodes = activeProject?.mapperNodes || [];
    const changeRequests = activeProject?.changeRequests || [];

    const { score, checks } = useMemo(() => {
        let totalScore = 100;
        const results = [];
        
        // 1. Technical Checks
        const hasCBR = nodes.some(n => String(n.type).toUpperCase() === 'CBR');
        if (hasCBR) results.push({ id: 'bc-1', type: 'pass', category: 'Continuity', text: 'CBR Vaults detected. Backup strategy is in place.' });
        else { totalScore -= 20; results.push({ id: 'bc-1', type: 'fail', category: 'Continuity', text: 'CRITICAL: No CBR Backup Vaults mapped.' }); }
        
        const hasSG = nodes.some(n => String(n.type).toUpperCase() === 'SG' || String(n.type).toUpperCase().includes('SECURITY'));
        if (hasSG) results.push({ id: 'sec-1', type: 'pass', category: 'Security', text: 'Security Groups detected. Network isolation defined.' });
        else { totalScore -= 20; results.push({ id: 'sec-1', type: 'fail', category: 'Security', text: 'CRITICAL: No Security Groups defined.' }); }
        
        const dbs = nodes.filter(n => String(n.type).toUpperCase() === 'RDS');
        const exposedDbs = dbs.filter(db => db.ip && db.ip !== 'N/A' && db.ip !== 'TBD' && !db.ip.startsWith('10.') && !db.ip.startsWith('192.168.') && !db.ip.startsWith('172.'));
        if (exposedDbs.length > 0) { totalScore -= 30; results.push({ id: 'sec-2', type: 'fail', category: 'Security', text: `CRITICAL: ${exposedDbs.length} DBs have public IPs.` }); } 
        else if (dbs.length > 0) results.push({ id: 'sec-2', type: 'pass', category: 'Security', text: 'Databases correctly isolated.' });
        
        // 🚨 FIX: Commercial Check (Does NOT deduct from Technical Score)
        const scopeCreep = nodes.filter(n => n.status === 'Live Only');
        if (scopeCreep.length > 0) { 
            // It's an Upsell, not a technical failure!
            results.push({ id: 'com-1', type: 'info', category: 'Sales Opportunity', text: `${scopeCreep.length} unquoted resource(s) discovered in the live environment. Excellent candidate for a Phase 2 SOW Upsell.` }); 
        } else {
            results.push({ id: 'com-1', type: 'pass', category: 'Commercial', text: 'Architecture aligns perfectly with the SOW Baseline.' });
        }
        
        return { score: Math.max(0, totalScore), checks: results };
    }, [nodes]);

    const handleLockArchitecture = () => {
        if (score < 80 && !window.confirm("There are critical DTRB warnings. Lock anyway?")) return;
        onUpdateProject(activeProject.id, 'status', 'Approved');
        setIsLocked(true);
        alert("Blueprint Locked. Ready for Provisioning.");
    };

    const handleAdminOverrideLock = () => {
        if (!window.confirm("ADMIN OVERRIDE: You are bypassing the DTRB Governance Gate for testing purposes. Force lock the architecture?")) return;
        onUpdateProject(activeProject.id, 'status', 'Approved');
        setIsLocked(true);
        alert("Blueprint Locked via Admin Override.");
    };

    const handleAdminUnlock = () => {
        if (!window.confirm("ADMIN OVERRIDE: You are bypassing the CR Governance Gate for testing. Force unlock the blueprint?")) return;
        onUpdateProject(activeProject.id, 'status', 'Draft');
        setIsLocked(false);
        alert("Blueprint Unlocked via Admin Override.");
    };

    const handleSubmitCR = () => {
        if (!crTitle || !crReason) return alert("Please fill out the CR Title and Reason.");
        
        const newCR = {
            id: `CR-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            title: crTitle,
            reason: crReason,
            approver: crApprover,
            cost: Number(crCost),
            resource: crResource,
            type: crType,
            status: crType === 'major' ? 'Pending Phase 2 Spinoff' : 'Approved & Unlocked'
        };

        if (updatePlaybook) {
            const masterPb = customPlaybooks['default_vm'] || { name: 'Standard VM Lift & Shift', tasks: [] };
            const newLessonTask = {
                id: `lesson-${Date.now()}`,
                name: `[DTRB LESSON] Verify ${crResource} configuration`,
                prog: "0%", resp: "Lead Architect", start: "", end: "", isParent: false,
                notes: `Root Cause: ${crReason}. \nPrevention: Ensure ${crTitle} is evaluated before execution phase.`
            };
            const updatedMasterPb = { ...masterPb, tasks: [...masterPb.tasks, newLessonTask] };
            const newPlaybooksState = { ...customPlaybooks, 'default_vm': updatedMasterPb };
            
            setCustomPlaybooks(newPlaybooksState);
            const token = localStorage.getItem('erp_jwt_token');
            fetch('/api/erp/playbooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newPlaybooksState)
            });
        }

        onUpdateProject(activeProject.id, 'changeRequests', [...changeRequests, newCR]);
        
        if (crTitle.toLowerCase().includes('quotation') || crReason.toLowerCase().includes('quotation')) {
            linkCRToLatestQuotationVersion(newCR.id);
        }
        
        if (crType === 'minor') {
            onUpdateProject(activeProject.id, 'status', 'Draft');
            setIsLocked(false);
            alert("Change Request Logged. The architecture has been unlocked for edits.");
        } else {
            alert("Phase 2 Upsell logged. A new SOW block has been sent to the Account Manager.");
        }
        
        setShowCRModal(false);
        setCrTitle(''); setCrReason(''); setCrCost(0); setCrApprover('Partner'); setUpdatePlaybook(false);
    };

    const linkCRToLatestQuotationVersion = async (crId) => {
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const response = await fetch(`/api/quotation/versions/${activeProject.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.versions && data.versions.length > 0) {
                    await fetch('/api/quotation/link-cr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ version_id: data.versions[0].id, cr_id: crId })
                    });
                }
            }
        } catch (error) { console.error('Failed to link CR to quotation version:', error); }
    };

    return (
        <div className="animate-fade-in max-w-[1200px] mx-auto pb-12 relative mt-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                
                <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-8">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-balance-scale text-indigo-600"></i> DTRB Governance & Change Requests</h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Automated Delivery Technical Review Board (DTRB) compliance and Architecture unlocking.</p>
                    </div>
                    
                    <div className="flex gap-4">
                        <button onClick={()=>setShowGovernanceHelp(true)} className="px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm">
                            <i className="fas fa-question-circle mr-2"></i> Help Guide
                        </button>
                        
                        {isLocked ? (
                            <>
                                <div className="bg-emerald-50 border border-emerald-200 px-6 py-2.5 rounded-xl flex items-center gap-4 shadow-sm">
                                    <i className="fas fa-lock text-emerald-600 text-xl"></i>
                                    <div>
                                        <div className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">Blueprint Locked</div>
                                        <div className="text-[9px] text-emerald-600 font-bold">Approved for Provisioning Phase</div>
                                    </div>
                                </div>
                                <button onClick={handleAdminUnlock} className="px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black uppercase tracking-widest border border-rose-200 shadow-sm flex items-center gap-2 transition-colors">
                                    <i className="fas fa-unlock"></i> [Admin] Force Unlock
                                </button>
                                <button onClick={()=>setShowCRModal(true)} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95"><i className="fas fa-edit mr-2"></i> Raise CR</button>
                            </>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl flex items-center gap-4 shadow-sm">
                                <i className="fas fa-unlock-alt text-slate-400 text-2xl"></i>
                                <div>
                                    <div className="text-xs font-black text-slate-700 uppercase tracking-widest">Draft Mode Active</div>
                                    <div className="text-[10px] text-slate-500 font-bold">Awaiting DTRB Sign-off</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner flex flex-col gap-6">
                        <div className="flex items-center gap-6 border-b border-slate-200 pb-6">
                            <div className="flex flex-col items-center justify-center shrink-0">
                                <div className="text-6xl font-black mb-1" style={{ color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e' }}>{score}%</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">DTRB Tech Score</div>
                            </div>
                            <div className="text-xs text-slate-600 font-medium">
                                {score === 100 ? "Flawless technical architecture design. Ready for deployment." : 
                                 score >= 80 ? "Minor technical compliance warnings detected. Proceed with caution." : 
                                 "Critical technical design flaws detected. Review required before locking."}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 space-y-3">
                            {checks.map(c => (
                                <div key={c.id} className={`p-4 rounded-xl border flex gap-4 items-start ${
                                    c.type === 'pass' ? 'bg-emerald-50/50 border-emerald-200' : 
                                    c.type === 'warn' ? 'bg-amber-50/50 border-amber-200' : 
                                    c.type === 'info' ? 'bg-purple-50/50 border-purple-300' : 
                                    'bg-rose-50/50 border-rose-300'
                                }`}>
                                    <div className="mt-0.5 shrink-0">
                                        {c.type === 'pass' && <i className="fas fa-check-circle text-emerald-500 text-lg"></i>}
                                        {c.type === 'warn' && <i className="fas fa-exclamation-triangle text-amber-500 text-lg"></i>}
                                        {c.type === 'info' && <i className="fas fa-hand-holding-usd text-purple-600 text-lg"></i>}
                                        {c.type === 'fail' && <i className="fas fa-times-circle text-rose-500 text-lg"></i>}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: c.type === 'pass' ? '#059669' : c.type === 'warn' ? '#d97706' : c.type === 'info' ? '#7e22ce' : '#e11d48' }}>{c.category}</div>
                                        <div className="text-xs font-bold text-slate-700 leading-relaxed">{c.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                            <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest"><i className="fas fa-file-contract text-blue-500 mr-2"></i> Structural Change Log</h4>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto max-h-[380px] custom-scrollbar pr-2 space-y-3">
                            {changeRequests.length === 0 ? (
                                <div className="text-center text-slate-400 text-xs italic py-16 border-2 border-dashed border-slate-100 rounded-xl h-full flex items-center justify-center">No structural Change Requests logged.</div>
                            ) : (
                                changeRequests.map(cr => (
                                    <div key={cr.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative shadow-sm">
                                        <div className={`absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${cr.type==='major'?'bg-purple-100 text-purple-800 border border-purple-200':'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                                            {cr.type === 'major' ? 'Phase 2 Scope' : 'Minor Mod'}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{cr.date} | Appr: {cr.approver} | Node: <span className="text-slate-600">{cr.resource}</span></div>
                                        <div className="text-sm font-black text-slate-800 mb-1">{cr.title}</div>
                                        <div className="text-xs text-slate-600 font-medium mb-3">{cr.reason}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-slate-200 pt-2">Cost Impact: <span className="text-rose-600">${cr.cost} / mo</span></div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {!isLocked && (
                    <div className="flex justify-between items-center pt-6 border-t border-slate-200 gap-4">
                        <div className="flex-1">
                            <button onClick={handleAdminOverrideLock} className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-rose-200 flex items-center gap-2 shadow-sm">
                                <i className="fas fa-shield-alt"></i> [Admin Override] Force Lock
                            </button>
                        </div>
                        
                        <button onClick={handleLockArchitecture} className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-md transition-transform active:scale-95 text-white ${score >= 80 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                            {score >= 80 ? <><i className="fas fa-file-signature mr-2"></i> Lock & Approve Blueprint</> : <><i className="fas fa-exclamation-triangle mr-2"></i> Acknowledge Risks & Lock</>}
                        </button>
                    </div>
                )}
            </div>

            {/* DTRB HELP DRAWER & CR MODAL EXCLUDED FOR BREVITY, Keep your existing modal code here! */}
        </div>
    );
}
