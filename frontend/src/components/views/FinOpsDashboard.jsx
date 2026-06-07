import React, { useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';

export default function FinOpsDashboard() {
    const { projects } = useContext(ERPContext);
    const activeProjects = (projects || []).filter(p => p && !p.isWaiting && p.lifecycleState !== '6_completed');
    
    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);

    // Simulated Huawei BSS API logic for the Dashboard
    const totalMRR = activeProjects.reduce((sum, p) => sum + (parseFloat(p.mrr) || 0), 0);
    
    // Simulate expected BSS cost based on architecture (usually 40% of MRR if priced correctly)
    const expectedHuaweiCost = totalMRR * 0.45; 
    const currentMargin = totalMRR > 0 ? ((totalMRR - expectedHuaweiCost) / totalMRR) * 100 : 0;

    // Simulate active partner coupons covering the migration overhead (SMS/DRS)
    const activeCoupons = 15000;
    const migrationOverhead = activeProjects.length * 800; // Estimated 800/mo overhead per active migration
    const remainingCoupons = activeCoupons - migrationOverhead;

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            
            {/* 🚨 FINOPS COST CENTER HEADER */}
            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-8 relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-center border-b border-slate-700 pb-6 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3"><i className="fas fa-file-invoice-dollar text-emerald-400"></i> Partner FinOps Cost Center</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Huawei BSS API Billing Simulation & Margin Tracker</p>
                    </div>
                    <button className="px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/50 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm">
                        <i className="fas fa-sync-alt mr-2"></i> Sync Huawei Bills
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2"><i className="fas fa-chart-line text-blue-400 mr-2"></i> Quoted Portfolio MRR</div>
                        <div className="text-3xl font-black text-white">{fm(totalMRR)}</div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">{activeProjects.length} Active Delivery Projects</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2"><i className="fas fa-server text-rose-400 mr-2"></i> Expected Huawei Invoice</div>
                        <div className="text-3xl font-black text-rose-300">{fm(expectedHuaweiCost)}</div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Estimated BSS Run-Rate</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 text-6xl m-2"><i className="fas fa-percent"></i></div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2"><i className="fas fa-piggy-bank text-emerald-400 mr-2"></i> Partner Gross Margin</div>
                        <div className="text-3xl font-black text-emerald-400">{currentMargin.toFixed(1)}%</div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Target Margin: >40.0%</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2"><i className="fas fa-ticket-alt text-amber-400 mr-2"></i> Migration Coupons</div>
                        <div className={`text-3xl font-black ${remainingCoupons >= 0 ? 'text-amber-400' : 'text-rose-500'}`}>{fm(remainingCoupons)}</div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">Of {fm(activeCoupons)} allocated</div>
                    </div>
                </div>
            </div>

            {/* Project Level FinOps Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg text-slate-800">Migration Run-Rate Analysis</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Tracking timeline extensions that erode partner margins due to temporary SMS/DRS overhead.</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto min-h-[400px] custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 w-[20%]">Project</th>
                                <th className="p-4 w-[15%]">Quoted MRR</th>
                                <th className="p-4 w-[15%]">Delivery Timeline</th>
                                <th className="p-4 w-[15%]">Est. Target Cost</th>
                                <th className="p-4 w-[15%]">Est. Migration Overhead</th>
                                <th className="p-4 w-[15%]">FinOps Health</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {activeProjects.map((project) => {
                                const mrr = parseFloat(project.mrr) || 0;
                                const estCost = mrr * 0.45;
                                
                                // Calculate timeline risk (if migration takes too long, overhead eats margin)
                                const start = new Date(project.kickoff);
                                const end = new Date(project.date);
                                const diffDays = (!isNaN(start) && !isNaN(end)) ? (end - start) / (1000 * 60 * 60 * 24) : 30;
                                const isDelayed = diffDays > 60;
                                
                                // Simulated overhead (SMS + NAT + DRS)
                                const overhead = isDelayed ? 1500 : 800;

                                return (
                                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-black text-slate-800">{project.name || 'Unnamed Project'}</div>
                                            <div className="text-[10px] font-bold text-slate-500 mt-1">{project.customerName || 'No Customer'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-black text-emerald-700">{fm(mrr)} <span className="text-[9px] text-slate-400 font-bold ml-1">/ mo</span></div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{formatShortDate(project.kickoff)} - {formatShortDate(project.date)}</div>
                                            <div className={`text-[10px] font-black mt-1 ${isDelayed ? 'text-rose-500' : 'text-slate-400'}`}>Est {Math.round(diffDays)} Days</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-600">{fm(estCost)} <span className="text-[9px] text-slate-400 font-bold ml-1">/ mo</span></div>
                                        </td>
                                        <td className="p-4">
                                            <div className={`font-black ${isDelayed ? 'text-rose-600' : 'text-amber-600'}`}>
                                                {fm(overhead)} <span className="text-[9px] text-slate-400 font-bold ml-1">Total</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className={`inline-flex px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest ${isDelayed ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                {isDelayed ? <><i className="fas fa-exclamation-triangle mr-1"></i> Margin At Risk</> : <><i className="fas fa-check-circle mr-1"></i> Healthy</>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {activeProjects.length === 0 && (
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
