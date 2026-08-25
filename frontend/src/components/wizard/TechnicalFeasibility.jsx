import React, { useMemo, useState } from 'react';
import { Tag, Progress, Table, Tooltip, Empty, Spin } from 'antd';

const { Text } = { Text: ({ children, style }) => <span style={style}>{children}</span> };

// OS compatibility matrix — matches ServerProfiler._is_sms_os_supported
const SMS_UNSUPPORTED_OS = ['aix', 'solaris', 'freebsd', 'hp-ux', 'hpux', 'openbsd'];
const SMS_OLD_VERSIONS = ['centos 5', 'rhel 5', 'ubuntu 12', 'ubuntu 13', 'windows 2003'];

function isSmsSupported(osType) {
    const osLower = (osType || '').toLowerCase();
    if (SMS_UNSUPPORTED_OS.some(u => osLower.includes(u))) return false;
    if (SMS_OLD_VERSIONS.some(v => osLower.includes(v))) return false;
    return true;
}

function detectDbType(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('mysql') || n.includes('mariadb')) return 'MySQL/MariaDB';
    if (n.includes('postgres') || n.includes('pgsql')) return 'PostgreSQL';
    if (n.includes('mongo')) return 'MongoDB';
    if (n.includes('redis')) return 'Redis';
    if (n.includes('oracle')) return 'Oracle';
    if (n.includes('sqlserver') || n.includes('sql server') || n.includes('mssql')) return 'SQL Server';
    return null;
}

export default function TechnicalFeasibility({ activeProject, onUpdateProject }) {
    const [scanning, setScanning] = useState(false);
    const [assessment, setAssessment] = useState(activeProject?.feasibilityAssessment || null);

    const mapperNodes = activeProject?.mapperNodes || [];
    const sourceEnv = activeProject?.sourceEnvironment || activeProject?.presales?.sourceEnvironment || 'Unknown';
    const authLevel = activeProject?.authLevel || activeProject?.presales?.authLevel || 'Unknown';

    // Run feasibility assessment
    const runAssessment = useMemo(() => {
        if (!mapperNodes || mapperNodes.length === 0) return null;

        const results = [];
        let feasibilityScore = 100;
        const strategyRecommendations = [];

        // 1. OS Compatibility Check
        const unsupportedServers = [];
        const supportedServers = [];
        mapperNodes.forEach(node => {
            const osType = node.osType || node.os || 'linux';
            const supported = isSmsSupported(osType);
            if (supported) {
                supportedServers.push(node);
            } else {
                unsupportedServers.push({ ...node, osType });
                feasibilityScore -= 10;
            }
        });

        if (unsupportedServers.length > 0) {
            results.push({
                key: 'os_compat',
                category: 'OS Compatibility',
                status: 'warning',
                finding: `${unsupportedServers.length} server(s) have OS not supported by SMS agent`,
                recommendation: unsupportedServers.map(s => `${s.name} (${s.osType})`).join(', '),
                impact: 'Use data_sync (rsync) or image_import instead of SMS',
            });
            strategyRecommendations.push({
                servers: unsupportedServers.map(s => s.name),
                strategy: 'data_sync',
                reason: 'SMS agent not supported for this OS',
            });
        } else {
            results.push({
                key: 'os_compat',
                category: 'OS Compatibility',
                status: 'pass',
                finding: `All ${supportedServers.length} servers have SMS-supported OS`,
                recommendation: 'SMS agent can be installed on all servers',
                impact: 'SMS migration is viable',
            });
        }

        // 2. Source Accessibility (Zero Trust detection)
        const isZeroTrust = authLevel && (
            authLevel.includes('Read-Only') ||
            authLevel.includes('No Access') ||
            authLevel.includes('Advisory')
        );

        if (isZeroTrust) {
            results.push({
                key: 'source_access',
                category: 'Source Accessibility',
                status: 'warning',
                finding: 'Zero Trust: No direct access to source (Read-Only/Advisory auth)',
                recommendation: 'Customer must install SMS agents. ERP handles all target-side operations.',
                impact: 'Zero Trust mode — customer responsibility for agent install',
            });
            strategyRecommendations.push({
                servers: 'ALL',
                strategy: 'zero_trust',
                reason: 'Read-Only auth level — customer installs agents',
            });
        } else {
            results.push({
                key: 'source_access',
                category: 'Source Accessibility',
                status: 'pass',
                finding: 'Full admin access to source — ERP can install agents directly',
                recommendation: 'SMS with agent push is viable',
                impact: 'Full automation possible',
            });
        }

        // 3. VMware/vSphere Detection
        const isVmware = typeof sourceEnv === 'string'
            ? sourceEnv.toLowerCase().includes('vmware') || sourceEnv.toLowerCase().includes('vsphere')
            : Array.isArray(sourceEnv) && sourceEnv.some(s => s.toLowerCase().includes('vmware') || s.toLowerCase().includes('vsphere'));

        if (isVmware) {
            results.push({
                key: 'vmware',
                category: 'Virtualization',
                status: 'info',
                finding: 'VMware/vSphere source detected — image export is possible',
                recommendation: 'Export VMs via ovftool from vCenter → convert to zvhd → import to IMS',
                impact: 'Image-based migration available as primary or fallback',
            });
            strategyRecommendations.push({
                servers: 'ALL',
                strategy: 'image_import',
                reason: 'VMware source — export via ovftool + convert + import to IMS',
            });
        }

        // 4. Database Detection
        const dbServers = mapperNodes.filter(n => {
            const t = (n.type || '').toUpperCase();
            return t === 'RDS' || t === 'DDS' || t === 'DCS' || detectDbType(n.name);
        });

        if (dbServers.length > 0) {
            const dbTypes = [...new Set(dbServers.map(n => detectDbType(n.name) || n.type || 'Unknown'))];
            results.push({
                key: 'database',
                category: 'Database',
                status: 'info',
                finding: `${dbServers.length} database server(s) detected: ${dbTypes.join(', ')}`,
                recommendation: dbTypes.map(t => {
                    if (t.includes('MySQL') || t.includes('MariaDB')) return 'MySQL: binlog replication (CHANGE MASTER TO)';
                    if (t.includes('PostgreSQL')) return 'PostgreSQL: WAL streaming (pg_basebackup)';
                    if (t.includes('MongoDB')) return 'MongoDB: oplog replication';
                    if (t.includes('Redis')) return 'Redis: SLAVEOF/REPLICAOF';
                    if (t === 'RDS') return 'RDS: DRS migration';
                    return `${t}: native replication or DRS`;
                }).join('; '),
                impact: 'Database native replication available for near-zero downtime',
            });
            strategyRecommendations.push({
                servers: dbServers.map(s => s.name),
                strategy: 'db_replication',
                reason: 'Database servers detected — native replication recommended',
            });
        }

        // 5. Customer Image Availability
        results.push({
            key: 'customer_image',
            category: 'Customer Image',
            status: 'info',
            finding: 'If customer can provide VM image (VMDK/OVA), import to IMS + data sync is possible',
            recommendation: 'Customer exports VM → uploads to OBS → ERP imports to IMS → creates ECS → rsync data',
            impact: 'Viable for Zero Trust + unsupported OS scenarios',
        });

        // 6. ECS vs PaaS Detection
        const ecsServers = mapperNodes.filter(n => (n.type || '').toUpperCase() === 'ECS');
        const paasServers = mapperNodes.filter(n => {
            const t = (n.type || '').toUpperCase();
            return ['RDS', 'DDS', 'DCS', 'OBS', 'SFS'].includes(t);
        });

        if (ecsServers.length > 0) {
            results.push({
                key: 'ecs_detection',
                category: 'Resource Type',
                status: 'pass',
                finding: `${ecsServers.length} ECS server(s) — SMS is primary strategy (ECS is ECS first)`,
                recommendation: 'SMS MIGRATE_FILE (Linux) or MIGRATE_BLOCK (Windows)',
                impact: 'SMS is the default for all ECS resources',
            });
        }

        if (paasServers.length > 0) {
            results.push({
                key: 'paas_detection',
                category: 'Resource Type',
                status: 'info',
                finding: `${paasServers.length} PaaS resource(s) — use DRS (database) or OBS migration (storage)`,
                recommendation: `DRS for databases, OMS for storage — not SMS`,
                impact: 'PaaS resources use specialized migration tools',
            });
        }

        // 7. Recommended Execution Mode
        let recommendedMode = 'agentic';
        let modeReason = 'Full automation with SMS';
        if (isZeroTrust && unsupportedServers.length > 0) {
            recommendedMode = 'agentic_zero_trust';
            modeReason = 'Zero Trust + unsupported OS → data_sync/image_import fallback';
        } else if (isZeroTrust) {
            recommendedMode = 'agentic_zero_trust';
            modeReason = 'Zero Trust — customer installs agents, ERP handles target-side';
        } else if (unsupportedServers.length > 0) {
            recommendedMode = 'agentic';
            modeReason = 'Unsupported OS detected → SMS with data_sync fallback';
        } else if (isVmware) {
            recommendedMode = 'agentic';
            modeReason = 'VMware source → SMS with image_import fallback';
        }

        results.push({
            key: 'exec_mode',
            category: 'Execution Mode',
            status: 'pass',
            finding: `Recommended execution mode: ${recommendedMode}`,
            recommendation: modeReason,
            impact: 'This recommendation feeds into 3.4b Execution Mode selection',
        });

        return {
            score: Math.max(0, feasibilityScore),
            results,
            strategyRecommendations,
            recommendedMode,
            summary: {
                totalServers: mapperNodes.length,
                smsSupported: supportedServers.length,
                smsUnsupported: unsupportedServers.length,
                zeroTrust: isZeroTrust,
                vmware: isVmware,
                databases: dbServers.length,
                ecs: ecsServers.length,
                paas: paasServers.length,
            },
        };
    }, [mapperNodes, sourceEnv, authLevel]);

    const columns = [
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 150,
            render: (text) => <Text strong style={{ fontSize: 12 }}>{text}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 80,
            render: (status) => {
                const colors = { pass: 'green', warning: 'orange', fail: 'red', info: 'blue' };
                const icons = { pass: '✓', warning: '⚠', fail: '✗', info: 'ℹ' };
                return <Tag color={colors[status]} style={{ fontSize: 11 }}>{icons[status]} {status}</Tag>;
            },
        },
        {
            title: 'Finding',
            dataIndex: 'finding',
            key: 'finding',
            render: (text) => <Text style={{ fontSize: 12 }}>{text}</Text>,
        },
        {
            title: 'Recommendation',
            dataIndex: 'recommendation',
            key: 'recommendation',
            render: (text) => <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>,
        },
    ];

    if (!mapperNodes || mapperNodes.length === 0) {
        return (
            <div className="p-12 text-center">
                <Empty description="No mapper nodes found. Complete Phase 2 (Architecture) first." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-black text-lg text-slate-800">
                            <i className="fas fa-clipboard-check text-indigo-600 mr-2"></i>
                            Technical Feasibility Assessment
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                            Assess migration compatibility BEFORE choosing execution mode. Detects OS issues, source accessibility, database types, and VMware export capability.
                        </p>
                    </div>
                    {runAssessment && (
                        <div className="text-right">
                            <div className={`text-3xl font-black ${runAssessment.score >= 80 ? 'text-emerald-600' : runAssessment.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {runAssessment.score}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Feasibility Score</div>
                        </div>
                    )}
                </div>

                {runAssessment && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { label: 'Total Servers', value: runAssessment.summary.totalServers, color: 'text-slate-700' },
                            { label: 'SMS Supported', value: runAssessment.summary.smsSupported, color: 'text-emerald-600' },
                            { label: 'SMS Unsupported', value: runAssessment.summary.smsUnsupported, color: 'text-rose-600' },
                            { label: 'Zero Trust', value: runAssessment.summary.zeroTrust ? 'Yes' : 'No', color: runAssessment.summary.zeroTrust ? 'text-amber-600' : 'text-emerald-600' },
                            { label: 'VMware', value: runAssessment.summary.vmware ? 'Yes' : 'No', color: 'text-blue-600' },
                            { label: 'Databases', value: runAssessment.summary.databases, color: 'text-purple-600' },
                            { label: 'ECS', value: runAssessment.summary.ecs, color: 'text-cyan-600' },
                        ].map(item => (
                            <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">{item.label}</div>
                                <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recommended Execution Mode */}
            {runAssessment && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-6">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-lightbulb text-3xl text-indigo-600"></i>
                        <div>
                            <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Recommended Execution Mode</div>
                            <div className="text-lg font-black text-indigo-800">{runAssessment.recommendedMode}</div>
                            <div className="text-xs text-indigo-600 font-medium mt-1">
                                {runAssessment.results.find(r => r.key === 'exec_mode')?.recommendation}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assessment Results Table */}
            {runAssessment && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h4 className="font-bold text-sm text-slate-700 mb-4">Assessment Results</h4>
                    <Table
                        dataSource={runAssessment.results}
                        columns={columns}
                        pagination={false}
                        size="small"
                        rowKey="key"
                    />
                </div>
            )}

            {/* Strategy Recommendations */}
            {runAssessment && runAssessment.strategyRecommendations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h4 className="font-bold text-sm text-slate-700 mb-4">Strategy Recommendations per Server Group</h4>
                    <div className="space-y-3">
                        {runAssessment.strategyRecommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <Tag color="blue" style={{ minWidth: 100, textAlign: 'center' }}>{rec.strategy}</Tag>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-slate-700">
                                        {Array.isArray(rec.servers) ? rec.servers.join(', ') : rec.servers}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">{rec.reason}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                    <div className="text-xs text-amber-800 leading-relaxed">
                        <strong>When to run this:</strong> After Phase 2 (Architecture) is complete and mapper nodes are defined.
                        This assessment runs BEFORE choosing the execution mode in 3.4b. It identifies technical
                        incompatibilities early so the execution strategy can account for them. The preflight checks
                        in Phase 4 validate that the chosen strategy CAN execute — this assessment determines WHICH
                        strategy is viable in the first place.
                        <br /><br />
                        <strong>Customer-provided images:</strong> If the customer can export and provide a VM image
                        (VMDK/OVA from vSphere, or disk image), the system can import it to IMS, create a target ECS,
                        and then rsync the data. This is viable for Zero Trust + unsupported OS scenarios.
                    </div>
                </div>
            </div>
        </div>
    );
}
