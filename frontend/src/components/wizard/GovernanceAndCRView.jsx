import React, { useState, useMemo } from 'react';

export default function GovernanceAndCRView({ activeProject, onUpdateProject }) {
    const [isLocked, setIsLocked] = useState(activeProject?.status === 'Approved' || activeProject?.status === 'Locked');
    const [showCRModal, setShowCRModal] = useState(false);
    
    // CR Form State
    const [crTitle, setCrTitle] = useState('');
    const [crReason, setCrReason] = useState('');
    const [crApprover, setCrApprover] = useState('Partner');
    const [crCost, setCrCost] = useState(0);

    const nodes = activeProject?.mapperNodes || [];
    const financials = activeProject?.financials || { sowBudget: 0, huaweiCoupon: 0, migrationOverhead: 0 };
    const changeRequests = activeProject?.changeRequests || [];

    // Financial calculations
    const totalAvailable = Number(financials.sowBudget) + Number(financials.huaweiCoupon);
    const estimatedRunRate = Number(financials.migrationOverhead) + changeRequests.reduce((acc, cr) => acc + Number(cr.cost), 0);
    const budgetHealth = totalAvailable - estimatedRunRate;

    // 🚨 DTRB RULES ENGINE
    const { score, checks } = useMemo(() => {
        let totalScore = 100;
        const results = [];

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

        const scopeCreep = nodes.filter(n => n.status === 'Live Only');
        if (scopeCreep.length > 0) { totalScore -= 10; results.push({ id: 'com-1', type: 'warn', category: 'Commercial', text: `WARNING: ${scopeCreep.length} unquoted resource(s) found.` }); } 
        else results.push({ id: 'com-1', type: 'pass', category: 'Commercial', text: 'Architecture aligns with SOW.' });

        return { score: Math.max(0, totalScore), checks: results };
    }, [nodes]);

    const handleUpdateFinancials = (field, val) => {
        onUpdateProject(activeProject.id, 'financials', { ...financials, [field]: Number(val) });
    };

    const handleLockArchitecture = () => {
        if (score < 80 && !window.confirm("There are critical DTRB warnings. Lock anyway?")) return;
        onUpdateProject(activeProject.id, 'status', 'Approved');
        setIsLocked(true);
        alert("Blueprint Locked. Ready for Provisioning.");
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
            status: 'Approved & Unlocked'
        };

        onUpdateProject(activeProject.id, 'changeRequests', [...changeRequests, newCR]);
        onUpdateProject(activeProject.id, 'status', 'Draft');
        setIsLocked(false);
        setShowCRModal(false);
        
        // Reset form
        setCrTitle(''); setCrReason(''); setCrCost(0); setCrApprover('Partner');
        alert("Change Request Approved. The architecture has been unlocked for edits.");
    };

    return (
        <div className="animate-fade-in max-w-[1400px] mx-auto pb-12 relative mt-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                
                {/* HEADER */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-8">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-balance-scale text-indigo-600"></i> Governance, Financials & CRs</h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Manage DTRB compliance, migration budgets, and formal Change Requests.</p>
                    </div>
                    {isLocked ? (
                        <div className="bg-emerald-50 border border-emerald-200 px-6 py-3 rounded-xl flex items-center gap-4 shadow-sm">
                            <i className="fas fa-lock text-emerald-600 text-2xl"></i>
                            <div>
                                <div className="text-xs font-black text-emerald-800 uppercase tracking-widest">Architecture Locked</div>
                                <div className="text-[10px] text-emerald-600 font-bold">Approved for Provisioning Phase</div>
                            </div>
                        </div>
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

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    
                    {/* LEFT COLUMN: DTRB & CR LOG */}
                    <div className="flex flex-col gap-8">
                        {/* DTRB SCORE */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner flex gap-6 items-center">
                            <div className="flex flex-col items-center justify-center shrink-0">
                                <div className="text-5xl font-black mb-1" style={{ color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e' }}>{score}%</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">DTRB Score</div>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[150px] custom-scrollbar pr-2 space-y-2">
                                {checks.map(c => (
                                    <div key={c.id} className="flex gap-3 items-start text-xs">
                                        <div className="mt-0.5">
                                            {c.type === 'pass' && <i className="fas fa-check-circle text-emerald-500"></i>}
                                            {c.type === 'warn' && <i className="fas fa-exclamation-triangle text-amber-500"></i>}
                                            {c.type === 'fail' && <i className="fas fa-times-circle text-rose-500"></i>}
                                        </div>
                                        <div className="font-bold text-slate-700 leading-tight">{c.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CHANGE REQUEST LOG */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col flex-1">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                                <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest"><i className="fas fa-file-contract text-blue-500 mr-2"></i> Change Request (CR) Log</h4>
                                {isLocked && (
                                    <button onClick={()=>setShowCRModal(true)} className="px-4 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white rounded text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                                        <i className="fas fa-edit mr-1"></i> Raise CR to Unlock
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 space-y-3">
                                {changeRequests.length === 0 ? (
                                    <div className="text-center text-slate-400 text-xs italic py-8 border-2 border-dashed border-slate-100 rounded-xl">No Change Requests logged.</div>
                                ) : (
                                    changeRequests.map(cr => (
                                        <div key={cr.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative">
                                            <div className="absolute top-4 right-4 text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{cr.status}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{cr.date} | Appr: {cr.approver}</div>
                                            <div className="text-sm font-black text-slate-800 mb-1">{cr.title}</div>
                                            <div className="text-xs text-slate-600 font-medium mb-3">{cr.reason}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 border-t border-slate-200 pt-2">Cost Impact: ${cr.cost}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: FINANCIALS */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                        <h4 className="font-black text-slate-700 text-sm mb-6 uppercase tracking-widest border-b border-slate-200 pb-3"><i className="fas fa-money-check-alt text-emerald-500 mr-2"></i> Migration Budget & Financials</h4>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Baseline SOW Budget ($)</label>
                                    <input type="number" value={financials.sowBudget} onChange={e => handleUpdateFinancials('sowBudget', e.target.value)} className="w-full bg-white border border-slate-300 rounded p-2 text-sm font-black outline-none focus:border-emerald-500" disabled={isLocked} />
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                    <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block mb-2">Huawei Coupon / Voucher ($)</label>
                                    <input type="number" value={financials.huaweiCoupon} onChange={e => handleUpdateFinancials('huaweiCoupon', e.target.value)} className="w-full bg-white border border-emerald-300 rounded p-2 text-sm font-black text-emerald-800 outline-none focus:border-emerald-500" disabled={isLocked} />
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Est. Migration Overhead ($)</label>
                                    <i className="fas fa-info-circle text-amber-500 cursor-help" title="Invisible resources: MgC clusters, SMS agents, temporary EIPs, Outbound Data Transfer"></i>
                                </div>
                                <input type="number" value={financials.migrationOverhead} onChange={e => handleUpdateFinancials('migrationOverhead', e.target.value)} className="w-full bg-white border border-amber-300 rounded p-2 text-sm font-black text-amber-800 outline-none focus:border-amber-500" disabled={isLocked} />
                                <p className="text-[9px] font-bold text-amber-600 mt-2 leading-tight">Must account for invisible runtime overhead (e.g., temporary storage, data transfer, background migration clusters).</p>
                            </div>

                            <div className="bg-slate-800 text-white p-6 rounded-2xl border border-slate-700 shadow-inner mt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-xs font-black uppercase tracking-widest text-slate-300">Total Available Funds</div>
                                    <div className="text-lg font-black text-emerald-400">${totalAvailable.toLocaleString()}</div>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-xs font-black uppercase tracking-widest text-slate-300">Est. Run Rate (Overhead + CRs)</div>
                                    <div className="text-lg font-black text-rose-400">-${estimatedRunRate.toLocaleString()}</div>
                                </div>
                                <div className="w-full h-px bg-slate-600 mb-4"></div>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm font-black uppercase tracking-widest">Project Margin Health</div>
                                    <div className={`text-2xl font-black ${budgetHealth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        ${budgetHealth.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {!isLocked && (
                    <div className="flex justify-end pt-6 border-t border-slate-200">
                        <button onClick={handleLockArchitecture} className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-md transition-transform active:scale-95 text-white ${score >= 80 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                            {score >= 80 ? <><i className="fas fa-file-signature mr-2"></i> Lock & Approve Blueprint</> : <><i className="fas fa-exclamation-triangle mr-2"></i> Acknowledge Risks & Lock</>}
                        </button>
                    </div>
                )}
            </div>

            {/* 🚨 CR MODAL FOR UNLOCKING */}
            {showCRModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-slide-up">
                        <div className="bg-rose-600 p-6 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-black text-lg"><i className="fas fa-exclamation-triangle mr-2"></i> Raise Change Request</h3>
                                <div className="text-[10px] uppercase tracking-widest font-bold text-rose-200 mt-1">Required to unlock and modify Architecture</div>
                            </div>
                            <button onClick={()=>setShowCRModal(false)} className="text-rose-200 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Change Title</label>
                                <input type="text" value={crTitle} onChange={e=>setCrTitle(e.target.value)} placeholder="e.g., Add missing VPN Gateway" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-bold outline-none focus:border-rose-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Technical / Commercial Justification</label>
                                <textarea value={crReason} onChange={e=>setCrReason(e.target.value)} placeholder="Explain why this change is necessary..." className="w-full h-24 bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-medium outline-none focus:border-rose-500 custom-scrollbar"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Approval Authority</label>
                                    <select value={crApprover} onChange={e=>setCrApprover(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-bold outline-none focus:border-rose-500 cursor-pointer">
                                        <option value="Partner">Partner (Internal Margin)</option>
                                        <option value="Huawei SA">Huawei SA (New Quotation)</option>
                                        <option value="Customer">Customer (Billable CR)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Est. Cost Impact ($)</label>
                                    <input type="number" value={crCost} onChange={e=>setCrCost(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-bold text-rose-600 outline-none focus:border-rose-500" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={()=>setShowCRModal(false)} className="px-6 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={handleSubmitCR} className="px-6 py-2 bg-rose-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-rose-700 shadow-md transition-colors">Approve & Unlock</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
