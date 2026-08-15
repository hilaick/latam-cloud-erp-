import React, { useContext, useState, useEffect, useCallback } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';
import { Button, Badge, Tag, Card, Statistic, Empty, Spin, Alert } from 'antd';
import {
    SyncOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    MinusCircleOutlined,
    FileOutlined,
    FireOutlined,
    FileTextOutlined,
    CloudServerOutlined,
    ThunderboltOutlined,
    ThunderboltFilled,
    WarningOutlined,
} from '@ant-design/icons';

export default function FinOpsDashboard() {
    const { projects } = useContext(ERPContext);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastSyncTime, setLastSyncTime] = useState(null);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const fm = (num) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
            num || 0
        );

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = sessionStorage.getItem('hermes_access_token');
            if (!token) {
                setError('AUTH_REQUIRED');
                return;
            }
            const resp = await fetch('/api/finops/dashboard', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (resp.status === 401 || resp.status === 422) {
                const body = await resp.json().catch(() => ({}));
                if (body.msg && (body.msg.includes('expired') || body.msg.includes('Signature') || body.msg.includes('segments'))) {
                    sessionStorage.removeItem('hermes_access_token');
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

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const activeProjects = (Array.isArray(projects) ? projects : []).filter(
        (p) => p && !p.isWaiting && p.lifecycleState !== '6_completed'
    );

    let totalQuotedBudget = 0;
    let totalBilledToDate = 0;
    let totalProjectedOverrun = 0;
    let projectsWithLiveData = 0;

    const enrichedProjects = activeProjects.map((project) => {
        const mrr = parseFloat(project.mrr) || 0;
        totalQuotedBudget += mrr;

        const liveProject =
            (Array.isArray(dashboardData?.projects) ? dashboardData.projects : []).find(
                (lp) => lp.id === project.id || lp.name === project.name
            ) || null;

        if (liveProject?.live_data_fetched) {
            projectsWithLiveData++;
            if (liveProject.billedToDate) totalBilledToDate += liveProject.billedToDate;
            if (liveProject.overrun) totalProjectedOverrun += liveProject.overrun;
            return {
                ...project,
                ...liveProject,
                isLive: true,
            };
        }

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

    if (!Array.isArray(projects)) {
        return (
            <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
                <Card className="bg-gray-900 border-gray-700 text-center">
                    <Spin size="large" />
                    <p className="text-gray-400 font-semibold mt-4">Loading project data...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            {/* Header */}
            <Card 
                className="bg-gray-900 border-gray-700 relative overflow-hidden"
                styles={{ body: { padding: '32px' } }}
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-700 pb-6 mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <CloudServerOutlined className="text-red-400" /> Huawei COC FinOps Center
                        </h2>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                            Live Customer Operations Capability (COC) Budget & Run-Rate Analysis
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        {liveDataAvailable ? (
                            <Badge 
                                status="success" 
                                text={
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">
                                        LIVE · {totalProjectsWithLive}/{summary.totalQuotedBudget > 0 ? enrichedProjects.length : dashboardData?.total_projects ?? 0} Projects
                                    </span>
                                }
                            />
                        ) : loading ? (
                            <Tag icon={<SyncOutlined spin />} color="warning">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Connecting...</span>
                            </Tag>
                        ) : error === 'SESSION_EXPIRED' || error === 'AUTH_REQUIRED' ? (
                            <Tag color="warning" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/login'}>
                                <ThunderboltOutlined className="mr-1" /> Session Expired — Click to Login
                            </Tag>
                        ) : error === 'AUTH_ERROR' ? (
                            <Tag color="error">
                                <ExclamationCircleOutlined className="mr-1" /> Authentication Error
                            </Tag>
                        ) : error ? (
                            <Tag color="error">
                                <ExclamationCircleOutlined className="mr-1" /> Unavailable
                            </Tag>
                        ) : (
                            <Tag color="default">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">No Live Data</span>
                            </Tag>
                        )}

                        <Button
                            onClick={fetchDashboard}
                            loading={loading}
                            icon={<SyncOutlined spin={loading} />}
                            type="primary"
                            className="bg-red-600 border-red-600 hover:bg-red-700"
                        >
                            {loading ? 'Syncing...' : 'Sync COC APIs'}
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                    <Card className="bg-gray-800/50 border-gray-600">
                        <Statistic
                            title={<><FileSignatureOutlined className="text-green-400 mr-2" />Total Quoted SOW Budget</>}
                            value={summary.totalQuotedBudget}
                            prefix="$"
                            precision={0}
                            valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
                            suffix={<span className="text-[10px] text-gray-500 font-semibold">{activeProjects.length} Active Projects</span>}
                        />
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-600">
                        <Statistic
                            title={
                                <span>
                                    <FileOutlined className="text-red-400 mr-2" />
                                    Billed to Date
                                    {liveDataAvailable && <span className="text-green-400 ml-2 text-xs">(COC Live)</span>}
                                </span>
                            }
                            value={summary.totalBilledToDate}
                            prefix="$"
                            precision={0}
                            valueStyle={{ color: '#fca5a5', fontSize: '28px', fontWeight: 'bold' }}
                            suffix={
                                <span className="text-[10px] text-gray-500 font-semibold">
                                    {liveDataAvailable ? 'Live consumption from COC BSS' : 'Live data unavailable for LATAM region'}
                                </span>
                            }
                        />
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-600 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 text-6xl m-2">
                            <WarningOutlined />
                        </div>
                        <Statistic
                            title={<><FireOutlined className="text-red-400 mr-2" />Projected Delay Overrun</>}
                            value={summary.totalProjectedOverrun}
                            prefix="$"
                            precision={0}
                            valueStyle={{ color: summary.totalProjectedOverrun > 0 ? '#f87171' : '#d1d5db', fontSize: '28px', fontWeight: 'bold' }}
                            suffix={<span className="text-[10px] text-gray-500 font-semibold">Cost of extended timelines</span>}
                        />
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-600">
                        <Statistic
                            title={<><TicketOutlined className="text-amber-400 mr-2" />Huawei Migration Coupons</>}
                            value={remainingCoupons}
                            prefix="$"
                            precision={0}
                            valueStyle={{ color: remainingCoupons >= 0 ? '#fbbf24' : '#f87171', fontSize: '28px', fontWeight: 'bold' }}
                            suffix={<span className="text-[10px] text-gray-500 font-semibold">Balance remaining</span>}
                        />
                    </Card>
                </div>
            </Card>

            {/* Project Table */}
            <Card className="overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">Timeline Impact & Run-Rate</h3>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                            {liveDataAvailable
                                ? 'Live billing data from Huawei COC BSS APIs — actual consumption tracked per project.'
                                : 'Monitoring dual-run infrastructure costs caused by partners pushing end dates.'}
                        </p>
                    </div>
                    {lastSyncTime && (
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                            Last synced: {lastSyncTime.toLocaleTimeString()}
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 w-[18%]">Project & Identity</th>
                                <th className="p-4 w-[12%]">SOW Budget</th>
                                <th className="p-4 w-[14%]">Schedule & Variance</th>
                                <th className="p-4 w-[14%]">Billed to Date</th>
                                <th className="p-4 w-[14%]">Daily Burn Rate</th>
                                <th className="p-4 w-[14%]">COC Health</th>
                                <th className="p-4 w-[14%]">Data Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {Array.isArray(enrichedProjects) && enrichedProjects.length > 0 && enrichedProjects.map((project) => (
                                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">
                                            {project.name || 'Unnamed Project'}
                                        </div>
                                        <div className="text-[10px] font-semibold text-gray-500 mt-1">
                                            {project.customerName || project.customerId || 'No Customer'}
                                        </div>
                                        {project.liveDataError && (
                                            <div className="text-[9px] text-red-500 mt-1 italic" title={project.liveDataError}>
                                                <ExclamationCircleOutlined className="mr-1" />
                                                {project.liveDataError.substring(0, 40)}...
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-green-700">
                                            {fm(project.mrr)}{' '}
                                            <span className="text-[9px] text-gray-400 font-semibold ml-1">Limit</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-700">
                                            {formatShortDate(project.kickoff)} - {formatShortDate(project.date)}
                                        </div>
                                        <div
                                            className={`text-[10px] font-bold mt-1 ${
                                                project.daysDelayed > 0 ? 'text-red-500' : 'text-gray-400'
                                            }`}
                                        >
                                            {project.daysElapsed} days elapsed
                                            {project.daysDelayed > 0 && ` (+${project.daysDelayed} delayed)`}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-800">
                                            {fm(project.billedToDate)}
                                        </div>
                                        {project.overrun > 0 && (
                                            <div className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-1">
                                                {fm(project.overrun)} Delay Overrun
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-amber-600">
                                            {fm(project.dailyBurnRate)}{' '}
                                            <span className="text-[9px] text-gray-400 font-semibold ml-1">/ day</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Tag
                                            color={
                                                project.isAtRisk === null ? 'default' :
                                                project.isAtRisk ? 'error' : 'success'
                                            }
                                            icon={
                                                project.isAtRisk === null ? <MinusCircleOutlined /> :
                                                project.isAtRisk ? <ExclamationCircleOutlined /> :
                                                <CheckCircleOutlined />
                                            }
                                        >
                                            {project.isAtRisk === null ? 'Unknown' :
                                             project.isAtRisk ? 'Budget Risk' : 'On Budget'}
                                        </Tag>
                                    </td>
                                    <td className="p-4">
                                        {project.isLive ? (
                                            <Tag color="success" icon={<CheckCircleOutlined />}>
                                                <span className="text-[9px] font-bold uppercase tracking-widest">COC Live</span>
                                            </Tag>
                                        ) : project.liveDataError ? (
                                            <Tag color="error">Error</Tag>
                                        ) : (
                                            <Tag color="default">
                                                <span className="text-[9px] font-semibold text-gray-400">No Data</span>
                                            </Tag>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {(!Array.isArray(enrichedProjects) || enrichedProjects.length === 0) && (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-400 font-semibold">
                                        <Empty description="No active projects in the pipeline." />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
