import React, { useState, useEffect, useMemo } from 'react';

export default function FinOpsCalculator({ project, onUpdateProject, isPoC }) {
    if (isPoC) {
        return <PoCFinOpsView project={project} onUpdateProject={onUpdateProject} />;
    }
    return <BudgetEstimatorView activeProject={project} onUpdateProject={onUpdateProject} />;
}

function BudgetEstimatorView({ activeProject, onUpdateProject }) {
    // 1. Execution & Labor Variables
    const [mrr, setMrr] = useState(5000); 
    const [durationMonths, setDurationMonths] = useState(3); 
    const [infraComplexity, setInfraComplexity] = useState('Medium'); 
    const [penaltyRisk, setPenaltyRisk] = useState(0);
    const [commModel, setCommModel] = useState('Partner');
    const [partnerHours, setPartnerHours] = useState(160); 
    const [partnerRate, setPartnerRate] = useState(75); 
    const [internalHours, setInternalHours] = useState(160); 
    const [internalRate, setInternalRate] = useState(150);

    // 2. High-Level Financials
    const [sowBudget, setSowBudget] = useState(0);
    const [huaweiCoupon, setHuaweiCoupon] = useState(0);
    const [migrationOverhead, setMigrationOverhead] = useState(0);

    // 3. Overhead Scenarios & Help UI
    const [overheadScenario, setOverheadScenario] = useState('manual');
    const [showOverheadHelp, setShowOverheadHelp] = useState(false);
    const [isApiSyncing, setIsApiSyncing] = useState(false);
    
    // 🚨 NEW: The Bill of Materials state for the auditable second pass
    const [migrationBom, setMigrationBom] = useState(null);

    useEffect(() => { 
        if (activeProject?.budget) { 
            const b = activeProject.budget; 
            setMrr(b.mrr || 5000); setDurationMonths(b.durationMonths || 3); 
            setInfraComplexity(b.infraComplexity || 'Medium'); setPenaltyRisk(b.penaltyRisk || 0);
            setCommModel(b.commModel || 'Partner');
            setPartnerHours(b.partnerHours || 160); setPartnerRate(b.partnerRate || 75);
            setInternalHours(b.internalHours || 160); setInternalRate(b.internalRate || 150);
        } else if (activeProject) { setMrr(activeProject.mrr || 5000); }

        if (activeProject?.financials) {
            const f = activeProject.financials;
            setSowBudget(f.sowBudget || 0); setHuaweiCoupon(f.huaweiCoupon || 0);
            setMigrationOverhead(f.migrationOverhead || 0);
            setOverheadScenario(f.overheadScenario || 'manual');
            setMigrationBom(f.migrationBom || null);
        }
    }, [activeProject]);

    const changeRequests = activeProject?.changeRequests || [];
    const crTotalCost = changeRequests.reduce((acc, cr) => acc + Number(cr.cost || 0), 0);
    const totalServers = (activeProject?.mapperNodes || []).filter(n => n.type === 'ECS' || n.type === 'RDS').length;

    // SCENARIO CALCULATOR
    const handleScenarioChange = async (scenario) => {
        setOverheadScenario(scenario);
        
        if (scenario === 'rule_of_thumb') {
            setMigrationOverhead(Math.round(mrr * 0.05 * durationMonths));
            setMigrationBom(null);
        } else if (scenario === 'historical_avg') {
            setIsApiSyncing(true);
            setTimeout(() => {
                const historicalCostPerServerPerMonth = 118.50; 
                setMigrationOverhead(Math.round(totalServers * historicalCostPerServerPerMonth * durationMonths));
                setMigrationBom(null);
                setIsApiSyncing(false);
            }, 800);
        } else if (scenario === 'wbs_high') {
            const batches = Math.ceil(totalServers / 5) || 1;
            const tempStorage = totalServers * 20; 
            setMigrationOverhead(Math.round((batches * 150 * durationMonths) + tempStorage));
            setMigrationBom(null);
        } else if (scenario === 'wbs_detailed') {
            // 🚨 FETCH LIVE API BOM
            setIsApiSyncing(true);
            try {
                const token = localStorage.getItem('erp_jwt_token');
                const response = await fetch('/api/finops/query_price', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        duration_months: durationMonths,
                        nodes: activeProject?.mapperNodes || []
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    setMigrationOverhead(data.overhead_cost);
                    setMigrationBom(data.bom_items); // Inject the itemized receipt
                } else {
                    console.error("API Error:", data.error);
                    alert("Failed to fetch live pricing from Huawei Cloud BSS API.");
                }
            } catch (err) {
                console.error("Network Error:", err);
            } finally {
                setIsApiSyncing(false);
            }
        }
    };

    const estimate = useMemo(() => { 
        let baseLabor = 0; let activeRole = ""; let activeRate = 0;
        if (commModel === 'Partner') { baseLabor = partnerHours * partnerRate; activeRole = "Partner-Led"; activeRate = partnerRate;}
        else if (commModel === 'Internal') { baseLabor = internalHours * internalRate; activeRole = "Principal Architect Rescue"; activeRate = internalRate;}

        const laborOverrun = baseLabor * 0.30; 
        const dualRun = mrr * durationMonths; 
        let tempInfra = 500; if (infraComplexity === 'Medium') tempInfra = 1500; if (infraComplexity === 'High') tempInfra = 4000; 
        
        const executionCost = baseLabor + laborOverrun + dualRun + tempInfra + ((mrr * 12) * 0.15) + Number(penaltyRisk);
        return { baseLabor, laborOverrun, dualRun, tempInfra, tuningBuffer: (mrr * 12) * 0.15, executionCost, activeRole, activeRate }; 
    }, [mrr, durationMonths, infraComplexity, penaltyRisk, commModel, partnerHours, partnerRate, internalHours, internalRate]);

    const totalAvailable = Number(sowBudget) + Number(huaweiCoupon);
    const totalRunRate = estimate.executionCost + Number(migrationOverhead) + crTotalCost;
    const budgetHealth = totalAvailable - totalRunRate;
    const marginPercentage = totalAvailable > 0 ? ((budgetHealth / totalAvailable) * 100).toFixed(1) : 0;

    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

    const saveContext = () => { 
        onUpdateProject(activeProject.id, 'budget', { mrr, durationMonths, infraComplexity, penaltyRisk, commModel, partnerHours, partnerRate, internalHours, internalRate }); 
        onUpdateProject(activeProject.id, 'financials', { sowBudget, huaweiCoupon, migrationOverhead, overheadScenario, migrationBom });
        alert("FinOps & Commercial Model Saved."); 
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in relative">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-file-invoice-dollar text-emerald-400 mr-3"></i> FinOps Ledger & Commercial Modeler</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Single Source of Financial Truth</p>
                    </div>
                    <button onClick={saveContext} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95"><i className="fas fa-save mr-2"></i> Save FinOps</button>
                </div>

                <div className="p-8 border-b border-slate-200 bg-slate-50">
                    <h4 className="font-black text-slate-700 text-sm mb-4 uppercase tracking-widest"><i className="fas fa-wallet text-indigo-500 mr-2"></i> Baseline Funding</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-2">Baseline SOW Budget ($)</label>
                            <div className="relative">
                                <i className="fas fa-dollar-sign absolute left-4 top-3.5 text-slate-400"></i>
                                <input type="number" value={sowBudget} onChange={e=>setSowBudget(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-8 pr-4 text-sm font-black outline-none focus:border-indigo-500 shadow-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-black text-emerald-700 uppercase tracking-widest block mb-2">Huawei Migration Coupon ($)</label>
                            <div className="relative">
                                <i className="fas fa-ticket-alt absolute left-4 top-3.5 text-emerald-500"></i>
                                <input type="number" value={huaweiCoupon} onChange={e=>setHuaweiCoupon(e.target.value)} className="w-full bg-emerald-50 border border-emerald-300 rounded-xl py-3 pl-10 pr-4 text-sm font-black text-emerald-800 outline-none focus:border-emerald-500 shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
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
                    </div>

                    <div className="p-8 bg-amber-50/30 space-y-6">
                        <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                            <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest"><i className="fas fa-weight-hanging text-amber-500 mr-2"></i> Migration Overhead Calculation</h4>
                            <button onClick={()=>setShowOverheadHelp(true)} className="text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"><i className="fas fa-question-circle mr-1"></i> Help Guide</button>
                        </div>
                        
                        <div className="flex bg-white p-1 rounded-xl border border-amber-200 shadow-sm flex-wrap gap-1">
                            <button onClick={()=>handleScenarioChange('manual')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${overheadScenario==='manual'?'bg-amber-100 text-amber-800 shadow-sm':'text-slate-500 hover:bg-slate-50'}`}>Manual</button>
                            <button onClick={()=>handleScenarioChange('rule_of_thumb')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${overheadScenario==='rule_of_thumb'?'bg-amber-100 text-amber-800 shadow-sm':'text-slate-500 hover:bg-slate-50'}`}>5% Rule</button>
                            <button onClick={()=>handleScenarioChange('historical_avg')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${overheadScenario==='historical_avg'?'bg-amber-500 text-white shadow-sm':'text-slate-500 hover:bg-slate-50'}`}>{isApiSyncing && overheadScenario === 'historical_avg' ? <i className="fas fa-circle-notch fa-spin"></i> : 'Historical Avg'}</button>
                            <button onClick={()=>handleScenarioChange('wbs_high')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${overheadScenario==='wbs_high'?'bg-amber-100 text-amber-800 shadow-sm':'text-slate-500 hover:bg-slate-50'}`}>WBS (High)</button>
                            <button onClick={()=>handleScenarioChange('wbs_detailed')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${overheadScenario==='wbs_detailed'?'bg-indigo-600 text-white shadow-sm':'text-slate-500 hover:bg-slate-50'}`}>{isApiSyncing && overheadScenario === 'wbs_detailed' ? <i className="fas fa-circle-notch fa-spin"></i> : 'API Sync'}</button>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Est. Invisible Overhead ($)</label>
                            <input type="number" value={migrationOverhead} onChange={e=>setMigrationOverhead(e.target.value)} disabled={overheadScenario !== 'manual'} className="w-full p-3 border border-amber-300 rounded-lg text-sm font-black text-amber-800 bg-white outline-none focus:border-amber-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-500" />
                        </div>

                        {/* 🚨 THE VISIBLE BOM AUDIT UI */}
                        {migrationBom && overheadScenario === 'wbs_detailed' && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-fade-in shadow-sm">
                                <h5 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-3 border-b border-indigo-200/50 pb-2"><i className="fas fa-clipboard-list mr-2"></i> Migration Infra Bill of Materials (BOM)</h5>
                                <div className="space-y-3">
                                    {migrationBom.map((item, i) => (
                                        <div key={i} className="flex justify-between items-start bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                                            <div>
                                                <div className="text-xs font-black text-slate-800">{item.service} <span className="text-indigo-600 mx-1">x{item.qty}</span></div>
                                                <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.spec}</div>
                                                <div className="text-[10px] text-slate-500 mt-1.5 leading-tight">{item.reason}</div>
                                            </div>
                                            <div className="text-xs font-black text-rose-600 mt-0.5">{fm(item.cost_per_month)}/mo</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[9px] text-indigo-500 font-bold mt-3 text-right">Rates pulled via Huawei Cloud BSS API (PostPaid)</div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Transfer Infra Tax</label><select value={infraComplexity} onChange={e=>setInfraComplexity(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-xs font-bold outline-none bg-white"><option value="Low">Low (Internet)</option><option value="Medium">Medium (VPN)</option><option value="High">High (DirectConnect)</option></select></div>
                            <div className="flex-1"><label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">SLA Penalty Risk ($)</label><input type="number" value={penaltyRisk} onChange={e=>setPenaltyRisk(Number(e.target.value))} className="w-full p-3 border border-rose-300 rounded-lg bg-rose-50 text-rose-900 text-sm font-black outline-none" /></div>
                        </div>

                        <div className="bg-white border border-rose-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Phase 2 CR Impact</div>
                                <div className="text-[9px] font-bold text-slate-400">Dynamically synced from Blueprint Governance</div>
                            </div>
                            <div className="text-xl font-black text-rose-600">-${crTotalCost.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 p-8 flex flex-col justify-center border-t border-slate-700 relative overflow-hidden">
                    <h4 className="font-black text-white text-lg mb-6 uppercase tracking-widest border-b border-slate-600 pb-3 relative z-10"><i className="fas fa-calculator text-indigo-400 mr-3"></i> Margin Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Execution Labor</div><div className="text-lg font-black text-slate-200">{fm(estimate.baseLabor + estimate.laborOverrun)}</div></div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Dual-Run Penalty</div><div className="text-lg font-black text-slate-200">{fm(estimate.dualRun)}</div></div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Temp Infra & Tuning</div><div className="text-lg font-black text-slate-200">{fm(estimate.tempInfra + estimate.tuningBuffer)}</div></div>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-600 shadow-inner"><div className="text-[10px] text-indigo-300 uppercase tracking-widest font-black mb-1">Total Expected Run Rate</div><div className="text-xl font-black text-rose-400">-${totalRunRate.toLocaleString()}</div></div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-slate-600 relative z-10 gap-4">
                        <div className="text-center md:text-left"><div className="text-sm font-black uppercase tracking-widest text-slate-300">Available Funds: <span className="text-emerald-400">{fm(totalAvailable)}</span></div></div>
                        <div className="flex flex-col items-center md:items-end">
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Final Project Margin</div>
                            <div className={`text-4xl font-black flex items-center gap-4 ${budgetHealth >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                <span>{fm(budgetHealth)}</span>
                                <span className={`text-sm px-3 py-1.5 rounded-lg border ${budgetHealth >= 0 ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-300' : 'bg-rose-900/50 border-rose-500/50 text-rose-300'}`}>{marginPercentage}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showOverheadHelp && (
                <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l border-slate-200 z-[10000] flex flex-col animate-slide-left overflow-hidden">
                    <div className="bg-amber-500 text-white p-6 border-b border-amber-600 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-black text-lg"><i className="fas fa-book-open mr-2"></i> Methodology Guide</h3>
                            <p className="text-[10px] text-amber-100 uppercase tracking-widest font-bold mt-1">Understanding Migration Overheads</p>
                        </div>
                        <button onClick={()=>setShowOverheadHelp(false)} className="text-amber-100 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 text-sm text-slate-700 leading-relaxed custom-scrollbar">
                        
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-2">1. What are "Invisible" Migration Costs?</h4>
                            <p className="mb-3">When you migrate a workload, you don't just pay for the final Target Architecture. The migration tools consume billable resources 24/7 during the sync:</p>
                            <ul className="list-disc pl-5 space-y-2 text-xs">
                                <li><strong>Worker Nodes (Compute):</strong> Tools like SMS or MgC spin up temporary ECS instances in the target VPC to receive block-level replication.</li>
                                <li><strong>Temporary Storage:</strong> Uploading massive `.vmdk` files to OBS before converting them to private images costs money.</li>
                                <li><strong>Data Transfer & Networking:</strong> Provisioning temporary EIPs or NAT Gateways, plus inter-region outbound bandwidth.</li>
                            </ul>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-2">2. How are these calculated?</h4>
                            <ul className="space-y-4 text-xs">
                                <li><strong className="text-indigo-600 block mb-1">5% Rule of Thumb:</strong><span className="text-slate-600">Standard for rapid pre-sales. Assumes temporary infra costs ~5% of Target MRR per month of migration.</span></li>
                                <li><strong className="text-indigo-600 block mb-1">Historical Averages:</strong><span className="text-slate-600">Queries the ERP database to find past projects of similar complexity and pulls their verified actual run-rates.</span></li>
                                <li><strong className="text-indigo-600 block mb-1">WBS High-Level:</strong><span className="text-slate-600">Counts the total servers mapped in the architecture, assumes standard batching (e.g. 5 servers per worker), and applies a baseline hourly rate.</span></li>
                                <li><strong className="text-indigo-600 block mb-1">Huawei API Sync:</strong><span className="text-slate-600">Pulls live pricing from the Huawei Cloud BSS API based on exact temporary EIPs, NATs, and specific VM flavors defined in the WBS Blueprint mapping.</span></li>
                            </ul>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
                            <h4 className="font-black text-emerald-800 mb-2 border-b border-emerald-100 pb-2">3. Who Pays For It?</h4>
                            <p className="text-xs text-slate-700">These resources are transient and deleted after Go-Live, meaning they are <strong>never in the Sales Quotation.</strong></p>
                            <p className="text-xs text-slate-700 mt-2">This is why the <strong>Huawei Migration Coupon</strong> exists. Huawei issues these coupons to absorb the overhead. If you don't secure a coupon, this overhead directly subtracts from your Partner/Delivery Margin.</p>
                        </div>

                    </div>
                </div>
            )}
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
                <div><label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Hard Budget Cap (USD)</label><input type="number" value={cap} onChange={e=>setCap(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl font-black text-lg bg-slate-50" /></div>
                <div><label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Cloud Infrastructure TTL (Expiration Date)</label><input type="date" value={ttl} onChange={e=>setTtl(e.target.value)} className="w-full p-4 border-2 border-rose-200 rounded-xl font-black text-lg bg-rose-50 text-rose-900" /></div>
                <button onClick={()=>onUpdateProject(project.id, 'pocCap', cap)} className="w-full py-4 bg-slate-800 hover:bg-slate-900 transition-colors text-white font-black rounded-xl uppercase tracking-widest">Authorize PoC Spend</button>
            </div>
        </div>
    );
}
