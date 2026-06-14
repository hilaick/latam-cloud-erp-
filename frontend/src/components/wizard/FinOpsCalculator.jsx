import React, { useState, useEffect, useMemo } from 'react';

export default function FinOpsCalculator({ activeProject, onUpdateProject }) {
    // Partner & Budget State
    const [budgetSource, setBudgetSource] = useState('Huawei Partner Coupon');
    const [couponAmount, setCouponAmount] = useState(10000); // e.g., $10k migration credit
    const [migrationDurationWeeks, setMigrationDurationWeeks] = useState(3);
    
    // Derived from SOW / Blueprint (The BOM)
    const [targetMRR, setTargetMRR] = useState(0);
    const [serverCount, setServerCount] = useState(0);

    // Calculate BOM Totals
    useEffect(() => {
        if (activeProject?.blueprintData?.topology) {
            const topo = activeProject.blueprintData.topology;
            const ecsCount = (topo.compute || []).length;
            const dbCount = (topo.databases || []).length;
            setServerCount(ecsCount + dbCount);
            
            // In a real app, this parses the actual prices from the blueprint.
            // Simulating an average of $85 per server/db per month for demonstration.
            setTargetMRR((ecsCount + dbCount) * 85 + 150); // +150 for base networking/CBR
        }
    }, [activeProject]);

    // 🚨 The FinOps Burn Simulation Logic
    const math = useMemo(() => {
        // 1. Target Monthly Recurring Revenue (from SOW BOM)
        const baseMrr = targetMRR;
        
        // 2. Weekly Run-Rate of the Target Environment
        const weeklyRunRate = baseMrr / 4.33;

        // 3. Migration Overhead (The "Mattress")
        // EIPs for Data Plane + Temporary Worker VM + Snapshot Storage during migration
        const tempEipsCost = serverCount * 4.00; // $4 per EIP per month
        const workerVmCost = 35.00; // s6.large.2 cost per month
        const monthlyOverhead = tempEipsCost + workerVmCost;
        const weeklyOverhead = monthlyOverhead / 4.33;

        // 4. Total Burn during the specific migration window
        const overlapComputeBurn = weeklyRunRate * migrationDurationWeeks;
        const overheadBurn = weeklyOverhead * migrationDurationWeeks;
        const totalMigrationBurn = overlapComputeBurn + overheadBurn;

        // 5. Coupon Impact
        const remainingCouponAfterGoLive = couponAmount - totalMigrationBurn;
        const monthsOfRunwayLeft = remainingCouponAfterGoLive / baseMrr;

        return {
            baseMrr, weeklyRunRate, totalMigrationBurn, remainingCouponAfterGoLive, monthsOfRunwayLeft,
            overlapComputeBurn, overheadBurn
        };
    }, [targetMRR, serverCount, migrationDurationWeeks, couponAmount]);

    const handleSaveBudget = () => {
        onUpdateProject(activeProject.id, 'finOpsBudget', {
            couponAmount, migrationDurationWeeks, targetMRR, projectedBurn: math.totalMigrationBurn
        });
        alert("FinOps Budget Forecast Saved to Project Context.");
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                <div>
                    <h3 className="font-black text-lg text-emerald-400 flex items-center"><i className="fas fa-search-dollar mr-3"></i> Migration Budget Simulator</h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Forecast coupon burn rate against Target BOM overlapping compute.</p>
                </div>
                <button onClick={handleSaveBudget} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors border border-emerald-500">
                    <i className="fas fa-save mr-2"></i> Save Baseline Forecast
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                
                {/* COLUMN 1: Inputs & Baseline */}
                <div className="p-8 bg-slate-50 space-y-6">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Funding Source</h4>
                        <select value={budgetSource} onChange={e=>setBudgetSource(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none">
                            <option>Huawei Partner Coupon</option>
                            <option>Direct Customer Credit Card</option>
                            <option>Internal Migration Fund</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Available Budget / Coupon ($)</label>
                        <div className="relative">
                            <i className="fas fa-dollar-sign absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="number" value={couponAmount} onChange={e=>setCouponAmount(Number(e.target.value))} className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-800 shadow-sm focus:border-emerald-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Expected Migration Overlap (Weeks)</label>
                        <input type="range" min="1" max="12" value={migrationDurationWeeks} onChange={e=>setMigrationDurationWeeks(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer" />
                        <div className="text-right text-xs font-black text-emerald-600 mt-2">{migrationDurationWeeks} Weeks of Parallel Compute</div>
                        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Time from Phase 2 (Landing Zone Build) until Phase 5 (Cutover), during which Target servers are running alongside On-Premise sources.</p>
                    </div>
                </div>

                {/* COLUMN 2: Target BOM Costs */}
                <div className="p-8 bg-white space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Target Architecture BOM</h4>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Servers in DTRB Blueprint</div>
                            <div className="text-sm font-black text-blue-600">{serverCount} Nodes</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estimated Target MRR</div>
                            <div className="text-lg font-black text-slate-800">${math.baseMrr.toLocaleString(undefined, {minimumFractionDigits: 2})} /mo</div>
                        </div>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <i className="fas fa-fire text-rose-500"></i>
                            <div className="text-[10px] font-black uppercase tracking-widest text-rose-800">Overlap Burn Calculation</div>
                        </div>
                        <div className="space-y-2 text-xs font-medium text-slate-700">
                            <div className="flex justify-between border-b border-rose-100 pb-1">
                                <span>Target Compute ({migrationDurationWeeks} weeks)</span>
                                <span>${math.overlapComputeBurn.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-b border-rose-100 pb-1">
                                <span>Temporary Data Plane EIPs</span>
                                <span>${(serverCount * 4 * (migrationDurationWeeks/4.33)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-b border-rose-100 pb-1">
                                <span>Migration Bastion Worker</span>
                                <span>${(35 * (migrationDurationWeeks/4.33)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-black text-rose-700 pt-1 text-sm">
                                <span>Total Migration Burn</span>
                                <span>${math.totalMigrationBurn.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: Coupon Impact Analysis */}
                <div className="p-8 bg-slate-900 text-white flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                    
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6 border-b border-slate-700 pb-2 relative z-10">Post-Live Coupon Impact</h4>

                    <div className="space-y-8 relative z-10">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Starting Coupon</div>
                            <div className="text-xl font-black text-slate-300">${couponAmount.toLocaleString()}</div>
                        </div>

                        <div>
                            <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">- Minus Migration Burn</div>
                            <div className="text-2xl font-black text-rose-400">-${math.totalMigrationBurn.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                        </div>

                        <div className="pt-6 border-t border-slate-700">
                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Remaining Coupon for Post-Live</div>
                            <div className={`text-4xl font-black tracking-tighter ${math.remainingCouponAfterGoLive < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                ${math.remainingCouponAfterGoLive.toLocaleString(undefined, {minimumFractionDigits:2})}
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl border ${math.remainingCouponAfterGoLive < 0 ? 'bg-rose-900/50 border-rose-500/50 text-rose-200' : 'bg-emerald-900/50 border-emerald-500/50 text-emerald-100'}`}>
                            <div className="flex items-center gap-3 mb-1">
                                <i className={`fas ${math.remainingCouponAfterGoLive < 0 ? 'fa-skull-crossbones text-rose-400' : 'fa-plane-departure text-emerald-400'} text-lg`}></i>
                                <div className="text-[10px] font-black uppercase tracking-widest">Financial Runway</div>
                            </div>
                            <div className="text-sm font-bold mt-2">
                                {math.remainingCouponAfterGoLive < 0 
                                    ? "🚨 DANGER: The migration overlap will consume the entire budget before Go-Live. Customer will be billed directly."
                                    : `The remaining coupon will cover approximately ${math.monthsOfRunwayLeft.toFixed(1)} months of production MRR after cutover.`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
