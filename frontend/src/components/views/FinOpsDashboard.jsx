import React, { useContext, useState, useEffect, useCallback } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';

export default function FinOpsDashboard() {
    const { projects } = useContext(ERPContext);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [dashboardData, setDashboardData] = useState(null); // live API response
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastSyncTime, setLastSyncTime] = useState(null);

    // Update current time occasionally to keep projections live
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const fm = (num) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
            num || 0
        );

    // ── Fetch live COC FinOps dashboard data ──
    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setError('AUTH_REQUIRED');
                return;
            }
            const resp = await fetch('/api/finops/dashboard', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (resp.status === 401 || resp.status === 422) {
                // Token expired or invalid — clear it and prompt re-login
                const body = await resp.json().catch(() => ({}));
                if (body.msg && (body.msg.includes('expired') || body.msg.includes('Signature') || body.msg.includes('segments'))) {
                    localStorage.removeItem('access_token');
                    setError('SESSION_EXPIRED');
                    return;
                }
                setError('AUTH_ERROR');
                return;
            }
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            }
            const data = await resp.json();
            if (data.success) {
                setDashboardData(data);
                setLastSyncTime(new Date());
            } else {
                setError(data.error || 'API returned failure');
            }
        } catch (err) {
            console.error('FinOps Dashboard fetch failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch on mount
    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // ── Build enriched projects from live API data ──
    const activeProjects = (projects || []).filter(
        (p) => p && !p.isWaiting && p.lifecycleState !== '6_completed'
    );

    let totalQuotedBudget = 0;
    let totalBilledToDate = 0;
    let totalProjectedOverrun = 0;
    let projectsWithLiveData = 0;

    const enrichedProjects = activeProjects.map((project) => {
        const mrr = parseFloat(project.mrr) || 0;
        totalQuotedBudget += mrr;

        // ── LIVE DATA PATH: check if we have live data for this project ──
        const liveProject =
            dashboardData?.projects?.find(
                (lp) => lp.id === project.id || lp.name === project.name
            ) || null;

        if (liveProject?.live_data_fetched) {
            projectsWithLiveData++;
            if (liveProject.billedToDate) totalBilledToDate += liveProject.billedToDate;
            if (liveProject.overrun) totalProjectedOverrun += liveProject.overrun;
            return {
                ...project,
                ...liveProject, // live data fields from API response
                isLive: true,
            };
        }

        // ── No live data available for this project ──
        const start = new Date(project.kickoff);
        const end = new Date(project.date);
        let daysTotal = 30;
        let daysElapsed = 0;
        let daysDelayed = 0;

        if (!isNaN(start) && !isNaN(end)) {
            daysTotal = Math.max((end - start) / (1000 * 60 * 60 * 24), 1);
            daysElapsed = Math.max((currentTime - start) / (1000 * 60 * 60 * 24), 0);
            if (currentTime > end) {
                daysDelayed = Math.floor((currentTime - end) / (1000 * 60 * 60 * 24));
            }
        }

        return {
            ...project,
            daysTotal,
            daysElapsed: Math.floor(daysElapsed),
            daysDelayed,
            dailyBurnRate: null,
            billedToDate: null,
            overrun: null,
            isAtRisk: null,
            isLive: false,
            dataAvailable: false,
        };
    });

    // ── Summary: live API overrides if available ──
    const liveSummary = dashboardData?.summary || null;
    const summary = {
        totalQuotedBudget: liveSummary?.total_quoted_budget ?? totalQuotedBudget,
        totalBilledToDate: liveSummary?.total_billed_to_date ?? totalBilledToDate,
        totalProjectedOverrun: liveSummary?.total_projected_overrun ?? totalProjectedOverrun,
        activeCoupons: liveSummary?.active_coupons ?? 25000,
    };
    const remainingCoupons = summary.activeCoupons - summary.totalBilledToDate;

    const liveDataAvailable = dashboardData?.live_data_available || false;
    const totalProjectsWithLive = dashboardData?.projects_with_live_data ?? projectsWithLiveData;

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            {/* 🚨 HUAWEI COC FINOPS CENTER HEADER */}
            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-8 relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-700 pb-6 mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <i className="fas fa-server text-blue-400"></i> Huawei COC FinOps Center
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Live Customer Operations Capability (COC) Budget &amp; Run-Rate Analysis
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Live Data Indicator */}
                        {liveDataAvailable ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                LIVE · {totalProjectsWithLive}/{summary.totalQuotedBudget > 0 ? enrichedProjects.length : dashboardData?.total_projects ?? 0} Projects
                            </span>
                        ) : loading ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5">
                                <i className="fas fa-spinner fa-spin mr-1.5"></i>Connecting...
                            </span>
                        ) : error === 'SESSION_EXPIRED' || error === 'AUTH_REQUIRED' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors"
                                  onClick={() => window.location.href = '/login'}>
                                <i className="fas fa-key mr-1.5"></i>Session Expired — Click to Login
                            </span>
                        ) : error === 'AUTH_ERROR' ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-full px-3 py-1.5">
                                <i className="fas fa-user-lock mr-1.5"></i>Authentication Error
                            </span>
                        ) : error ? (
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-full px-3 py-1.5">
                                <i className="fas fa-exclamation-circle mr-1.5"></i>Unavailable
                            </span>
                        ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-400/10 border border-slate-500/30 rounded-full px-3 py-1.5">
                                No Live Data
                            </span>
                        )}

                        <button
                            onClick={fetchDashboard}
                            disabled={loading}
                            className="px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                        >
                            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} mr-2`}></i>
                            {loading ? 'Syncing...' : 'Sync COC APIs'}
                        </button>
                    </div>
                </div>

                {/* Four KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                            <i className="fas fa-file-signature text-emerald-400 mr-2"></i> Total Quoted SOW Budget
                        </div>
                        <div className="text-3xl font-black text-white">
                            {fm(summary.totalQuotedBudget)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">
                            {activeProjects.length} Active Delivery Projects
                        </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                            <i className="fas fa-file-invoice text-blue-400 mr-2"></i> Billed to Date
                            {liveDataAvailable && (
                                <span className="text-emerald-400 ml-1">(COC Live)</span>
                            )}
                        </div>
                        <div className="text-3xl font-black text-blue-300">
                            {fm(summary.totalBilledToDate)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">
                            {liveDataAvailable ? 'Live consumption from COC BSS' : 'Live data unavailable for LATAM region'}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 text-6xl m-2">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                            <i className="fas fa-fire text-rose-400 mr-2"></i> Projected Delay Overrun
                        </div>
                        <div
                            className={`text-3xl font-black ${
                                summary.totalProjectedOverrun > 0 ? 'text-rose-400' : 'text-slate-300'
                            }`}
                        >
                            {fm(summary.totalProjectedOverrun)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">
                            Cost of extended timelines
                        </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-5">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                            <i className="fas fa-ticket-alt text-amber-400 mr-2"></i> Huawei Migration Coupons
                        </div>
                        <div
                            className={`text-3xl font-black ${
                                remainingCoupons >= 0 ? 'text-amber-400' : 'text-rose-500'
                            }`}
                        >
                            {fm(remainingCoupons)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2 font-bold uppercase">
                            Balance remaining
                        </div>
                    </div>
                </div>
            </div>

            {/* Project Level FinOps Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg text-slate-800">Timeline Impact &amp; Run-Rate</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                            {liveDataAvailable
                                ? 'Live billing data from Huawei COC BSS APIs — actual consumption tracked per project.'
                                : 'Monitoring dual-run infrastructure costs caused by partners pushing end dates.'}
                        </p>
                    </div>
                    {lastSyncTime && (
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Last synced: {lastSyncTime.toLocaleTimeString()}
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto min-h-[400px] custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 w-[18%]">Project &amp; Identity</th>
                                <th className="p-4 w-[12%]">SOW Budget</th>
                                <th className="p-4 w-[14%]">Schedule &amp; Variance</th>
                                <th className="p-4 w-[14%]">Billed to Date</th>
                                <th className="p-4 w-[14%]">Daily Burn Rate</th>
                                <th className="p-4 w-[14%]">COC Health</th>
                                <th className="p-4 w-[14%]">Data Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {enrichedProjects.map((project) => (
                                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-black text-slate-800">
                                            {project.name || 'Unnamed Project'}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500 mt-1">
                                            {project.customerName || project.customerId || 'No Customer'}
                                        </div>
                                        {project.liveDataError && (
                                            <div className="text-[9px] text-rose-500 mt-1 italic" title={project.liveDataError}>
                                                <i className="fas fa-exclamation-circle mr-1"></i>
                                                {project.liveDataError.substring(0, 40)}...
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-black text-emerald-700">
                                            {fm(project.mrr)}{' '}
                                            <span className="text-[9px] text-slate-400 font-bold ml-1">Limit</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-700">
                                            {formatShortDate(project.kickoff)} - {formatShortDate(project.date)}
                                        </div>
                                        <div
                                            className={`text-[10px] font-black mt-1 ${
                                                project.daysDelayed > 0 ? 'text-rose-500' : 'text-slate-400'
                                            }`}
                                        >
                                            {project.daysElapsed} days elapsed
                                            {project.daysDelayed > 0 && ` (+${project.daysDelayed} delayed)`}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 text-sm">
                                            {fm(project.billedToDate)}
                                        </div>
                                        {project.overrun > 0 && (
                                            <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">
                                                {fm(project.overrun)} Delay Overrun
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-black text-amber-600">
                                            {fm(project.dailyBurnRate)}{' '}
                                            <span className="text-[9px] text-slate-400 font-bold ml-1">/ day</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div
                                            className={`inline-flex px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                                project.isAtRisk === null
                                                    ? 'bg-slate-50 text-slate-500 border border-slate-200'
                                                    : project.isAtRisk
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            }`}
                                        >
                                            {project.isAtRisk === null ? (
                                                <>
                                                    <i className="fas fa-minus-circle mr-1"></i> Unknown
                                                </>
                                            ) : project.isAtRisk ? (
                                                <>
                                                    <i className="fas fa-exclamation-triangle mr-1"></i> Budget Risk
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-check-circle mr-1"></i> On Budget
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {project.isLive ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                COC Live
                                            </span>
                                        ) : project.liveDataError ? (
                                            <span className="text-[9px] font-bold text-rose-500">Error</span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-400">No Data</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {enrichedProjects.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-sm"
                                    >
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
