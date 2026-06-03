import React, { useState, useEffect, useMemo } from 'react';

export default function FinOpsCalculator({ project, onUpdateProject, isPoC }) {
    if (isPoC) {
        return <PoCFinOpsView project={project} onUpdateProject={onUpdateProject} />;
    }
    return <BudgetEstimatorView activeProject={project} onUpdateProject={onUpdateProject} />;
}

function BudgetEstimatorView({ activeProject, onUpdateProject }) {
    // 1. Execution & Labor Variables (Existing)
    const [mrr, setMrr] = useState(5000); 
    const [durationMonths, setDurationMonths] = useState(3); 
    const [infraComplexity, setInfraComplexity] = useState('Medium'); 
    const [penaltyRisk, setPenaltyRisk] = useState(0);
    const [commModel, setCommModel] = useState('Partner');
    const [partnerHours, setPartnerHours] = useState(160); 
    const [partnerRate, setPartnerRate] = useState(75); 
    const [internalHours, setInternalHours] = useState(160); 
    const [internalRate, setInternalRate] = useState(150);

    // 2. High-Level Financials & Ledgers (Phase 3 Integration)
    const [sowBudget, setSowBudget] = useState(0);
    const [huaweiCoupon, setHuaweiCoupon] = useState(0);
    const [migrationOverhead, setMigrationOverhead] = useState(0);

    useEffect(() => { 
        if (activeProject?.budget) { 
            const b = activeProject.budget; 
            setMrr(b.mrr || 5000); 
            setDurationMonths(b.durationMonths || 3); 
            setInfraComplexity(b.infraComplexity || 'Medium'); 
            setPenaltyRisk(b.penaltyRisk || 0);
            setCommModel(b.commModel || 'Partner');
            setPartnerHours(b.partnerHours || 160); 
            setPartnerRate(b.partnerRate || 75);
            setInternalHours(b.internalHours || 160); 
            setInternalRate(b.internalRate || 150);
        } else if (activeProject) { 
            setMrr(activeProject.mrr || 5000); 
        }

        if (activeProject?.financials) {
            const f = activeProject.financials;
            setSowBudget(f.sowBudget || 0);
            setHuaweiCoupon(f.huaweiCoupon || 0);
            setMigrationOverhead(f.migrationOverhead || 0);
        }
    }, [activeProject]);

    // 🚨 Calculate CR impacts dynamically from Phase 2
    const changeRequests = activeProject?.changeRequests || [];
    const crTotalCost = changeRequests.reduce((acc, cr) => acc + Number(cr.cost || 0), 0);

    const estimate = useMemo(() => { 
        let baseLabor = 0; let activeRole = ""; let activeRate = 0;
        if (commModel === 'Partner') { baseLabor = partnerHours * partnerRate; activeRole = "Partner-Led"; activeRate = partnerRate;}
        else if (commModel === 'Internal') { baseLabor = internalHours * internalRate; activeRole = "Principal Architect Rescue"; activeRate = internalRate;}

        const laborOverrun = baseLabor * 0.30; 
        const dualRun = mrr * durationMonths; 
        let tempInfra = 500; if (infraComplexity === 'Medium') tempInfra = 1500; if (infraComplexity === 'High') tempInfra = 4000; 
        
        const executionCost = baseLabor + laborOverrun + dualRun + tempInfra + ((mrr * 12) * 0.15) + Number(penaltyRisk);

        return { 
            baseLabor, laborOverrun, dualRun, tempInfra, 
            tuningBuffer: (mrr * 12) * 0.15, 
            executionCost, activeRole, activeRate 
        }; 
    }, [mrr, durationMonths, infraComplexity, penaltyRisk, commModel, partnerHours, partnerRate, internalHours, internalRate]);

    const totalAvailable = Number(sowBudget) + Number(huaweiCoupon);
    const totalRunRate = estimate.executionCost + Number(migrationOverhead) + crTotalCost;
    const budgetHealth = totalAvailable - totalRunRate;
    const marginPercentage = totalAvailable > 0 ? ((budgetHealth / totalAvailable) * 100).toFixed(1) : 0;

    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

    const saveContext = () => { 
        onUpdateProject(activeProject.id, 'budget', { mrr, durationMonths, infraComplexity, penaltyRisk, commModel, partnerHours, partnerRate, internalHours, internalRate }); 
        onUpdateProject(activeProject.id, 'financials', { sowBudget, huaweiCoupon, migrationOverhead });
        alert("FinOps & Commercial Model Saved."); 
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                
                {/* 🚨 HEADER */}
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-file-invoice-dollar text-emerald-400 mr-3"></i> FinOps Ledger & Commercial Modeler</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Single Source of Financial Truth</p>
                    </div>
                    <button onClick={saveContext} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95"><i className="fas fa-save mr-2"></i> Save FinOps</button>
                </div>

                {/* 🚨 SECTION 1: BASELINE FUNDING */}
                <div className="p-8 border-b border-slate-200 bg-slate-50">
                    <h4 className="font-black text-slate-700 text-sm mb-4 uppercase tracking-widest"><i className="fas fa-wallet text-indigo-500 mr-2"></i> Baseline Funding</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-2">Baseline SOW Budget ($)</label>
                            <div className="relative">
                                <i className="fas fa-dollar-sign absolute left-4 top-3.5 text-slate-400"></i>
                                <input type="number" value={sowBudget} onChange={e=>setSowBudget(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-8 pr-4 text-sm font-black outline-none focus:border-indigo-500 shadow-sm" />
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold mt-2">The total commercial value sold to the customer.</p>
                        </div>
                        <div>
                            <label className="text-xs font-black text-emerald-700 uppercase tracking-widest block mb-2">Huawei Migration Coupon ($)</label>
                            <div className="relative">
                                <i className="fas fa-ticket-alt absolute left-4 top-3.5 text-emerald-500"></i>
                                <input type="number" value={huaweiCoupon} onChange={e=>setHuaweiCoupon(e.target.value)} className="w-full bg-emerald-50 border border-emerald-300 rounded-xl py-3 pl-10 pr-4 text-sm font-black text-emerald-800 outline-none focus:border-emerald-500 shadow-sm" />
                            </div>
                            <p className="text-[10px] text-emerald-600 font-bold mt-2">Funding provided by Huawei to offset migration costs.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* 🚨 SECTION 2: LABOR & EXECUTION PARAMETERS */}
                    <div className="p-8 border-r border-slate-200 bg-white space-y-6">
                        <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest border-b border-slate-100 pb-3"><i className="fas fa-users-cog text-blue-500 mr-2"></i> Execution Labor Model</h4>
                        <div className="flex gap-4">
                            <button onClick={()=>setCommModel('Partner')} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${commModel==='Partner' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                                <div className="font-black text-slate-800 text-sm"><i className="fas fa-users text-blue-500 mr-2"></i> Partner-Led</div>
                            </button>
                            <button onClick={()=>setCommModel('Internal')} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${commModel==='Internal' ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                                <div className="font-black text-purple-900 text-sm"><i className="fas fa-user-astronaut text-purple-600 mr-2"></i> Rescue Mode</div>
                            </button>
                        </div>

                        <div className="flex gap-6">
                            <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Target MRR ($)</label><input type="number" value={mrr} onChange={e=>setMrr(Number(e.target.value))} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-slate-50" /></div>
                            <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Dual-Run (Months)</label><input type="number" value={durationMonths} onChange={e=>setDurationMonths(Number(e.target.value))} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-slate-50" /></div>
                        </div>
                        
                        {commModel === 'Partner' && (
                            <div className="flex gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-600">Partner Labor (Hrs)</label><input type="number" value={partnerHours} onChange={e=>setPartnerHours(Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-white" /></div>
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-600">Partner Rate ($/hr)</label><input type="number" value={partnerRate} onChange={e=>setPartnerRate(Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-white" /></div>
                            </div>
                        )}
                        {commModel === 'Internal' && (
                            <div className="flex gap-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-purple-800">Architect Labor (Hrs)</label><input type="number" value={internalHours} onChange={e=>setInternalHours(Number(e.target.value))} className="w-full p-2.5 border border-purple-300 rounded-lg text-sm font-bold outline-none focus:border-purple-500 bg-white" /></div>
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-purple-800">Internal Rate ($/hr)</label><input type="number" value={internalRate} onChange={e=>setInternalRate(Number(e.target.value))} className="w-full p-2.5 border border-purple-300 rounded-lg text-sm font-bold outline-none focus:border-purple-500 bg-white" /></div>
                            </div>
                        )}
                    </div>

                    {/* 🚨 SECTION 3: MIGRATION OVERHEADS & RISK */}
                    <div className="p-8 bg-slate-50 space-y-6">
                        <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest border-b border-amber-200 pb-3"><i className="fas fa-weight-hanging text-amber-500 mr-2"></i> Migration Run Rate & Overhead</h4>
                        
                        <div>
                            <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Est. Invisible Overhead ($)</label>
                            <input type="number" value={migrationOverhead} onChange={e=>setMigrationOverhead(e.target.value)} className="w-full p-3 border border-amber-300 rounded-lg text-sm font-black text-amber-800 bg-white outline-none focus:border-amber-500 shadow-sm" />
                            <p className="text-[9px] text-amber-600 font-bold mt-1.5 leading-tight">Temporary resources (MgC clusters, SMS agents, Data Transfer).</p>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Transfer Infra Tax</label><select value={infraComplexity} onChange={e=>setInfraComplexity(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-amber-500 bg-white"><option value="Low">Low (Internet)</option><option value="Medium">Medium (VPN)</option><option value="High">High (DirectConnect)</option></select></div>
                            <div className="flex-1"><label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">SLA Penalty Risk ($)</label><input type="number" value={penaltyRisk} onChange={e=>setPenaltyRisk(Number(e.target.value))} className="w-full p-3 border border-rose-300 rounded-lg bg-rose-50 text-rose-900 text-sm font-black outline-none focus:border-rose-500" /></div>
                        </div>

                        {/* PHASE 2 CR READ-ONLY IMPACT */}
                        <div className="bg-white border-2 border-dashed border-rose-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Phase 2 CR Impact</div>
                                <div className="text-[9px] font-bold text-slate-400">Dynamically synced from Governance</div>
                            </div>
                            <div className="text-xl font-black text-rose-600">-${crTotalCost.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* 🚨 SECTION 4: THE MARGIN CALCULATOR */}
                <div className="bg-slate-800 p-8 flex flex-col justify-center border-t border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 -mr-20 -mt-20"></div>
                    
                    <h4 className="font-black text-white text-lg mb-6 uppercase tracking-widest border-b border-slate-600 pb-3 relative z-10">
                        <i className="fas fa-calculator text-indigo-400 mr-3"></i> Margin Analysis
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Execution Labor</div><div className="text-lg font-black text-slate-200">{fm(estimate.baseLabor + estimate.laborOverrun)}</div></div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Dual-Run Penalty</div><div className="text-lg font-black text-slate-200">{fm(estimate.dualRun)}</div></div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Temp Infra & Tuning</div><div className="text-lg font-black text-slate-200">{fm(estimate.tempInfra + estimate.tuningBuffer)}</div></div>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-600 shadow-inner"><div className="text-[10px] text-indigo-300 uppercase tracking-widest font-black mb-1">Total Expected Run Rate</div><div className="text-xl font-black text-rose-400">-${totalRunRate.toLocaleString()}</div></div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-slate-600 relative z-10 gap-4">
                        <div className="text-center md:text-left">
                            <div className="text-sm font-black uppercase tracking-widest text-slate-300">Available Funds: <span className="text-emerald-400">{fm(totalAvailable)}</span></div>
                        </div>
                        <div className="flex flex-col items-center md:items-end">
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Final Project Margin</div>
                            <div className={`text-4xl font-black flex items-center gap-4 ${budgetHealth >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                <span>{fm(budgetHealth)}</span>
                                <span className={`text-sm px-3 py-1.5 rounded-lg border ${budgetHealth >= 0 ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-300' : 'bg-rose-900/50 border-rose-500/50 text-rose-300'}`}>
                                    {marginPercentage}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function PoCFinOpsView({ project, onUpdateProject }) {
    const [cap, setCap] = useState(project.pocCap || 500);
    const [ttl, setTtl] = useState(project.pocTtl || '');
    
    return (
        <div className="max-w-[800px] mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-black text-xl text-slate-800 mb-6"><i className="fas fa-money-bill-wave text-emerald-500 mr-2"></i> PoC Budget Governance</h3>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Hard Budget Cap (USD)</label>
                    <input type="number" value={cap} onChange={e=>setCap(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl font-black text-lg bg-slate-50" />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Cloud Infrastructure TTL (Expiration Date)</label>
                    <input type="date" value={ttl} onChange={e=>setTtl(e.target.value)} className="w-full p-4 border-2 border-rose-200 rounded-xl font-black text-lg bg-rose-50 text-rose-900" />
                </div>
                <button onClick={()=>onUpdateProject(project.id, 'pocCap', cap)} className="w-full py-4 bg-slate-800 hover:bg-slate-900 transition-colors text-white font-black rounded-xl uppercase tracking-widest">Authorize PoC Spend</button>
            </div>
        </div>
    );
}
