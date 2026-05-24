import React, { useState, useEffect, useMemo } from 'react';

export default function FinOpsCalculator({ project, onUpdateProject, isPoC }) {
    if (isPoC) {
        return <PoCFinOpsView project={project} onUpdateProject={onUpdateProject} />;
    }
    return <BudgetEstimatorView activeProject={project} onUpdateProject={onUpdateProject} />;
}

function BudgetEstimatorView({ activeProject, onUpdateProject }) {
    const [mrr, setMrr] = useState(5000); 
    const [durationMonths, setDurationMonths] = useState(3); 
    const [infraComplexity, setInfraComplexity] = useState('Medium'); 
    const [penaltyRisk, setPenaltyRisk] = useState(0);
    const [commModel, setCommModel] = useState('Partner');
    const [partnerHours, setPartnerHours] = useState(160); 
    const [partnerRate, setPartnerRate] = useState(75); 
    const [internalHours, setInternalHours] = useState(160); 
    const [internalRate, setInternalRate] = useState(150);

    useEffect(() => { 
        if (activeProject?.budget) { 
            const b = activeProject.budget; 
            setMrr(b.mrr); setDurationMonths(b.durationMonths); setInfraComplexity(b.infraComplexity); setPenaltyRisk(b.penaltyRisk || 0);
            setCommModel(b.commModel || 'Partner');
            setPartnerHours(b.partnerHours || 160); setPartnerRate(b.partnerRate || 75);
            setInternalHours(b.internalHours || 160); setInternalRate(b.internalRate || 150);
        } else if (activeProject) { 
            setMrr(activeProject.mrr || 5000); 
        } 
    }, [activeProject]);

    const saveContext = () => { 
        onUpdateProject(activeProject.id, 'budget', { mrr, durationMonths, infraComplexity, penaltyRisk, commModel, partnerHours, partnerRate, internalHours, internalRate }); 
        alert("FinOps & Commercial Model Saved."); 
    };

    const estimate = useMemo(() => { 
        let baseLabor = 0; let activeRole = ""; let activeRate = 0;
        if (commModel === 'Partner') { baseLabor = partnerHours * partnerRate; activeRole = "Partner-Led"; activeRate = partnerRate;}
        else if (commModel === 'Internal') { baseLabor = internalHours * internalRate; activeRole = "Principal Architect Rescue"; activeRate = internalRate;}

        const laborOverrun = baseLabor * 0.30; 
        const dualRun = mrr * durationMonths; 
        let tempInfra = 500; if (infraComplexity === 'Medium') tempInfra = 1500; if (infraComplexity === 'High') tempInfra = 4000; 
        
        return { 
            baseLabor, laborOverrun, dualRun, tempInfra, 
            tuningBuffer: (mrr * 12) * 0.15, 
            totalTrueCost: baseLabor + laborOverrun + dualRun + tempInfra + ((mrr * 12) * 0.15) + Number(penaltyRisk), 
            activeRole, activeRate 
        }; 
    }, [mrr, durationMonths, infraComplexity, penaltyRisk, commModel, partnerHours, partnerRate, internalHours, internalRate]);

    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

    return (
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-black text-lg tracking-wide"><i className="fas fa-handshake text-blue-400 mr-3"></i> Delivery Ownership & Commercial Model</h3>
                    <button onClick={saveContext} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">Save FinOps</button>
                </div>
                <div className="p-8 bg-slate-50 border-b border-slate-200">
                    <div className="flex gap-6">
                        <button onClick={()=>setCommModel('Partner')} className={`flex-1 p-5 rounded-2xl border-4 text-left transition-all ${commModel==='Partner' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                            <div className="font-black text-slate-800 text-lg"><i className="fas fa-users text-blue-500 mr-2"></i> Standard Partner-Led</div>
                            <div className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">Customer pays Partner directly. Principal Architect provides oversight and governance.</div>
                        </button>
                        <button onClick={()=>setCommModel('Internal')} className={`flex-1 p-5 rounded-2xl border-4 text-left transition-all ${commModel==='Internal' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                            <div className="font-black text-purple-900 text-lg"><i className="fas fa-user-astronaut text-purple-600 mr-2"></i> Principal Architect Rescue</div>
                            <div className="text-xs text-purple-800 mt-2 font-bold leading-relaxed">Partner failed validation gate. Internal Delivery assumes direct execution. Partner labor fee is reclaimed as Internal Margin.</div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    <div className="p-8 border-r border-slate-200 bg-white space-y-6">
                        <div className="flex gap-6">
                            <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Target MRR ($)</label><input type="number" value={mrr} onChange={e=>setMrr(Number(e.target.value))} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50" /></div>
                            <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Dual-Run Timeline (Months)</label><input type="number" value={durationMonths} onChange={e=>setDurationMonths(Number(e.target.value))} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50" /></div>
                        </div>
                        
                        {commModel === 'Partner' && (
                            <div className="flex gap-6 p-5 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-600">Partner Labor (Hrs)</label><input type="number" value={partnerHours} onChange={e=>setPartnerHours(Number(e.target.value))} className="w-full p-3 border-2 border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-white" /></div>
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-600">Partner Rate ($/hr)</label><input type="number" value={partnerRate} onChange={e=>setPartnerRate(Number(e.target.value))} className="w-full p-3 border-2 border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-white" /></div>
                            </div>
                        )}
                        {commModel === 'Internal' && (
                            <div className="flex gap-6 p-5 bg-purple-100 rounded-xl border border-purple-300 shadow-inner">
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-purple-800">Architect Labor (Hrs)</label><input type="number" value={internalHours} onChange={e=>setInternalHours(Number(e.target.value))} className="w-full p-3 border-2 border-purple-300 rounded-xl text-sm font-bold outline-none focus:border-purple-500 bg-white" /></div>
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-purple-800">Internal Margin Rate ($/hr)</label><input type="number" value={internalRate} onChange={e=>setInternalRate(Number(e.target.value))} className="w-full p-3 border-2 border-purple-300 rounded-xl text-sm font-bold outline-none focus:border-purple-500 bg-white" /></div>
                            </div>
                        )}

                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Temporary Transfer Infra Limit</label><select value={infraComplexity} onChange={e=>setInfraComplexity(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"><option value="Low">Low (Internet)</option><option value="Medium">Medium (VPN)</option><option value="High">High (DirectConnect)</option></select></div>
                        <div className="border-t-2 pt-6 border-rose-200"><label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Contract Penalty SLA Risk ($)</label><input type="number" value={penaltyRisk} onChange={e=>setPenaltyRisk(Number(e.target.value))} className="w-full p-3 border-2 border-rose-300 rounded-xl bg-rose-50 text-rose-900 text-lg font-black outline-none focus:border-rose-500 shadow-inner" /></div>
                    </div>

                    <div className="p-8 bg-slate-100 flex flex-col justify-center space-y-5">
                        <div className={`flex justify-between p-5 border-2 rounded-2xl shadow-sm border-l-8 ${commModel==='Partner'?'bg-white border-slate-200 border-l-blue-500' : 'bg-purple-50 border-purple-200 border-l-purple-600'}`}>
                            <div><div className="font-black text-sm text-slate-800">Delivery Labor + 30% Buffer</div><div className="text-[10px] text-slate-600 mt-1 font-bold">Role: {estimate.activeRole} (@ ${estimate.activeRate}/hr)</div></div>
                            <div className="text-xl font-black text-slate-800">{fm(estimate.baseLabor + estimate.laborOverrun)}</div>
                        </div>
                        <div className="flex justify-between p-5 border-2 border-slate-200 rounded-2xl bg-white shadow-sm border-l-8 border-l-slate-400"><div><div className="font-black text-sm text-slate-800">Dual-Run Cloud Penalty</div><div className="text-[10px] text-slate-500 mt-1 font-medium">Cost of running Source & Target clouds during migration.</div></div><div className="text-xl font-black text-slate-700">{fm(estimate.dualRun)}</div></div>
                        <div className="flex justify-between p-5 border-2 border-slate-200 rounded-2xl bg-white shadow-sm border-l-8 border-l-amber-400"><div><div className="font-black text-sm text-slate-800">Temp Infra & Day-2 Tuning Buffer</div><div className="text-[10px] text-slate-500 mt-1 font-medium">Reserved budget for right-sizing post go-live.</div></div><div className="text-xl font-black text-amber-700">{fm(estimate.tempInfra + estimate.tuningBuffer)}</div></div>
                        <div className="mt-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white flex justify-between items-center shadow-xl border border-slate-700"><div className="text-xs font-black uppercase tracking-widest text-emerald-400">Total Journey Cost</div><div className="text-3xl font-black text-emerald-400">{fm(estimate.totalTrueCost)}</div></div>
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
