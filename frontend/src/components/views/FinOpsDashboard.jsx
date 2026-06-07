import React, { useContext, useState, useEffect } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';

export default function FinOpsDashboard() {
    const { projects } = useContext(ERPContext);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time occasionally to keep projections live
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const activeProjects = (projects || []).filter(p => p && !p.isWaiting && p.lifecycleState !== '6_completed');
    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);

    // Huawei COC (Customer Operations Capability) Simulated Data
    let totalQuotedBudget = 0;
    let totalBilledToDate = 0;
    let totalProjectedOverrun = 0;

    const enrichedProjects = activeProjects.map(project => {
        const mrr = parseFloat(project.mrr) || 0;
        totalQuotedBudget += mrr;

        const start = new Date(project.kickoff);
        const end = new Date(project.date);
        
        let daysTotal = 30; // Default baseline
        let daysElapsed = 0;
        let daysDelayed = 0;

        if (!isNaN(start) && !isNaN(end)) {
            daysTotal = Math.max((end - start) / (1000 * 60 * 60 * 24), 1);
            daysElapsed = Math.max((currentTime - start) / (1000 * 60 * 60 * 24), 0);
            if (currentTime > end) {
                daysDelayed = Math.floor((currentTime - end) / (1000 * 60 * 60 * 24));
            }
        }

        // Daily Burn Rate of the Target Environment + Migration Tools (SMS/DRS)
        const targetDailyBurn = (mrr * 0.45) / 30; 
        const migrationDailyBurn = 25; // ~$750/mo for replication overhead

        // Calculate simulated Billed-to-Date
        const billedTarget = Math.min(daysElapsed, daysTotal) * targetDailyBurn;
        let billedOverrun = 0;
        
        if (daysDelayed > 0) {
            billedOverrun = daysDelayed * (targetDailyBurn + migrationDailyBurn);
            totalProjectedOverrun += billedOverrun;
        }

        const totalBilled = billedTarget + billedOverrun;
        totalBilledToDate += totalBilled;

        return {
            ...project,
            daysTotal,
            daysElapsed: Math.floor(daysElapsed),
            daysDelayed,
            targetDailyBurn,
            billedToDate: totalBilled,
            overrun: billedOverrun,
            isAtRisk: daysDelayed > 0 || totalBilled > (mrr * 0.5) // Risk if delayed or burning too fast
        };
    });

    const activeCoupons = 25000;
    const remainingCoupons = activeCoupons - totalBilledToDate;

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            
            {/* 🚨 HUAWEI COC COST CENTER HEADER */}
            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-8 relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-700 pb-6 mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3"><i className="fas fa-server text-blue-400"></i> Huawei COC FinOps Center</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Live Customer Operations Capability (COC) Budget & Run-Rate Analysis</p>
                    </div>
                    <button className="px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm whitespace-nowrap">
                        <i className="fas fa-sync-alt mr-2"></i> Sync COC APIs
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2"><i className="fas fa-file-signature text-emerald-400 mr-2"></i> Total Quoted SOW Budget</div>
                        <div className="text-3xl font-black text-white">{fm(totalQuotedBudget)}</div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">{activeProjects.length} Active Delivery Projects</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2"><i className="fas fa-file-invoice text-blue-400 mr-2"></i> Billed to Date (COC)</div>
                        <div className="text-3xl font-black text-blue-300">{fm(totalBilledToDate)}</div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Actual consumption tracked</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 text-6xl m-2"><i className="fas fa-exclamation-triangle"></i></div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2"><i className="fas fa-fire text-rose-400 mr-2"></i> Projected Delay Overrun</div>
                        <div className={`text-3xl font-black ${totalProjectedOverrun > 0 ? 'text-rose-400' : 'text-slate-300'}`}>{fm(totalProjectedOverrun)}</div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Cost of extended timelines</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2"><i className="fas fa-ticket-alt text-amber-400 mr-2"></i> Huawei Migration Coupons</div>
                        <div className={`text-3xl font-black ${remainingCoupons >= 0 ? 'text-amber-400' : 'text-rose-500'}`}>{fm(remainingCoupons)}</div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Balance remaining</div>
                    </div>
                </div>
            </div>

            {/* Project Level FinOps Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg text-slate-800">Timeline Impact & Run-Rate</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Monitoring dual-run infrastructure costs caused by partners pushing end dates.</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto min-h-[400px] custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 w-[20%]">Project & Identity</th>
                                <th className="p-4 w-[15%]">SOW Budget</th>
                                <th className="p-4 w-[15%]">Schedule & Variance</th>
                                <th className="p-4 w-[15%]">Billed to Date</th>
                                <th className="p-4 w-[15%]">Daily Burn Rate</th>
                                <th className="p-4 w-[15%]">COC Health</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {enrichedProjects.map((project) => (
                                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-black text-slate-800">{project.name || 'Unnamed Project'}</div>
                                        <div className="text-[10px] font-bold text-slate-500 mt-1">{project.customerName || 'No Customer'}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-black text-emerald-700">{fm(project.mrr)} <span className="text-[9px] text-slate-400 font-bold ml-1">Limit</span></div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-700">{formatShortDate(project.kickoff)} - {formatShortDate(project.date)}</div>
                                        <div className={`text-[10px] font-black mt-1 ${project.daysDelayed > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                            {project.daysElapsed} days elapsed {project.daysDelayed > 0 && `(+${project.daysDelayed} delayed)`}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 text-sm">{fm(project.billedToDate)}</div>
                                        {project.overrun > 0 && (
                                            <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">
                                                {fm(project.overrun)} Delay Overrun
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-black text-amber-600">
                                            {fm(project.targetDailyBurn + 25)} <span className="text-[9px] text-slate-400 font-bold ml-1">/ day</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className={`inline-flex px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest ${project.isAtRisk ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                            {project.isAtRisk ? <><i className="fas fa-exclamation-triangle mr-1"></i> Budget Risk</> : <><i className="fas fa-check-circle mr-1"></i> On Budget</>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {enrichedProjects.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-sm">
                                        No active projects in the pipeline.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
