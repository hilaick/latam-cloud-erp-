import React, { useState } from 'react';
import { Tag, Progress, Table, Tooltip, Empty, Spin, Button } from 'antd';

const { Text } = { Text: ({ children, style }) => <span style={style}>{children}</span> };

// OS compatibility pre-filter — NOT a definitive test.
// This is a heuristic pre-check against known unsupported OSes.
// The DEFINITIVE check happens when the SMS agent is actually installed
// on the source VM (Phase 4 preflight). This pre-filter just flags
// potential issues early so the execution strategy can account for them.
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

function getDbMethod(type, detected) {
    const dbType = detected || type;
    if (dbType === 'RDS' || dbType === 'GAUSSDB') return 'DRS (Huawei Data Replication Service)';
    if (dbType === 'DDS') return 'DRS or MongoDB oplog replication';
    if (dbType === 'DCS') return 'DCS replication (SLAVEOF/REPLICAOF)';
    if (dbType === 'DMS') return 'DMS migration (Kafka/message queue)';
    if (dbType && dbType.includes('MySQL')) return 'binlog replication (CHANGE MASTER TO)';
    if (dbType && dbType.includes('PostgreSQL')) return 'WAL streaming (pg_basebackup)';
    if (dbType && dbType.includes('MongoDB')) return 'oplog replication (rs.initiate)';
    if (dbType && dbType.includes('Redis')) return 'replication (SLAVEOF/REPLICAOF)';
    if (dbType && dbType.includes('Oracle')) return 'Oracle Data Pump or GoldenGate';
    if (dbType && dbType.includes('SQL Server')) return 'Always On availability groups or DRS';
    return 'DRS or native replication';
}

export default function TechnicalFeasibility({ activeProject, onUpdateProject }) {
    const [scanning, setScanning] = useState(false);
    const [assessmentRun, setAssessmentRun] = useState(false);
    const [runAssessment, setRunAssessment] = useState(activeProject?.feasibilityAssessment || null);

    // Read resources from targetArchitecture (primary) or mapperNodes (fallback)
    const targetArch = activeProject?.targetArchitecture || {};
    const archResources = [
        ...(targetArch.compute || []).map(r => ({ ...r, type: r.type || 'ECS' })),
        ...(targetArch.database || []).map(r => ({ ...r, type: r.type || 'RDS' })),
        ...(targetArch.storage || []).map(r => ({ ...r, type: r.type || 'OBS' })),
        ...(targetArch.network || []).map(r => ({ ...r, type: r.type || 'VPC' })),
    ];
    const mapperNodes = archResources.length > 0 ? archResources : (activeProject?.mapperNodes || []);
    const sourceEnv = activeProject?.sourceEnvironment || activeProject?.presales?.sourceEnvironment || 'Unknown';
    const authLevel = activeProject?.authLevel || activeProject?.presales?.authLevel || 'Unknown';
    const isSaved = !!activeProject?.feasibilityAssessment;

    // Run feasibility assessment (triggered by button click, NOT automatic)
    const computeAssessment = () => {
        if (!mapperNodes || mapperNodes.length === 0) return null;

        const results = [];
        let feasibilityScore = 100;
        const strategyRecommendations = [];

        // ── Categorize resources by service type (like physics engine pillars) ──
        const categorize = (node) => {
            const t = String(node.type || '').toUpperCase();
            if (['ECS', 'VM', 'CCE', 'ASG', 'AS'].includes(t)) return 'compute';
            if (['RDS', 'GAUSSDB', 'DDS', 'DCS', 'DMS'].includes(t)) return 'database';
            if (['VPC', 'SUBNET', 'SG', 'EIP', 'ELB', 'NAT', 'VPN', 'CGW'].includes(t)) return 'network';
            if (['OBS', 'SFS', 'EVS', 'CBR'].includes(t)) return 'storage';
            // Name-based fallback for ECS running databases
            const dbType = detectDbType(node.name);
            if (dbType) return 'database';
            return 'compute'; // default to compute
        };

        const pillars = { compute: [], database: [], network: [], storage: [] };
        mapperNodes.forEach(node => {
            const cat = categorize(node);
            pillars[cat].push(node);
        });

        // ═══ COMPUTE (ECS) — SMS is the primary tool ═══
        const computeNodes = pillars.compute;
        const computeSupported = [];
        const computeUnsupported = [];

        computeNodes.forEach(node => {
            const osType = node.osType || node.os || 'linux';
            const supported = isSmsSupported(osType);
            if (supported) {
                computeSupported.push(node);
            } else {
                computeUnsupported.push({ ...node, osType });
                feasibilityScore -= 5;
            }
        });

        results.push({
            key: 'compute_sms',
            category: 'Compute (ECS → SMS)',
            status: computeUnsupported.length === 0 ? 'pass' : 'warning',
            finding: `${computeNodes.length} compute server(s): ${computeSupported.length} SMS-compatible, ${computeUnsupported.length} may need fallback (OS pre-filter)`,
            recommendation: computeUnsupported.length > 0
                ? `SMS for ${computeSupported.length} server(s). data_sync/image_import for: ${computeUnsupported.map(s => `${s.name} (${s.osType})`).join(', ')}`
                : `All ${computeSupported.length} compute servers are SMS-compatible (pre-filter heuristic — definitive check during Phase 4 agent install)`,
            impact: computeUnsupported.length > 0 ? 'Some servers need data_sync or image_import fallback' : 'SMS is primary for all compute',
        });

        if (computeUnsupported.length > 0) {
            strategyRecommendations.push({
                servers: computeUnsupported.map(s => s.name),
                strategy: 'data_sync or image_import',
                reason: `SMS agent may not support OS: ${computeUnsupported.map(s => s.osType).join(', ')}`,
            });
        }
        if (computeSupported.length > 0) {
            strategyRecommendations.push({
                servers: computeSupported.map(s => s.name),
                strategy: 'sms_primary',
                reason: 'ECS compute servers — SMS is the primary migration tool',
            });
        }

        // ═══ DATABASE (RDS/DDS/DCS) — DRS or native replication ═══
        const dbNodes = pillars.database;
        if (dbNodes.length > 0) {
            const dbDetails = dbNodes.map(n => {
                const t = String(n.type || '').toUpperCase();
                const detected = detectDbType(n.name);
                return { name: n.name, type: t, detected, method: getDbMethod(t, detected) };
            });

            results.push({
                key: 'database_drs',
                category: 'Database (RDS/DDS/DCS → DRS)',
                status: 'info',
                finding: `${dbNodes.length} database resource(s) — SMS does NOT apply. Use DRS or native replication.`,
                recommendation: dbDetails.map(d => `${d.name}: ${d.method}`).join('; '),
                impact: 'Database resources use DRS or native replication, not SMS',
            });

            strategyRecommendations.push({
                servers: dbNodes.map(s => s.name),
                strategy: 'drs_migration or db_replication',
                reason: 'Database resources (RDS/DDS/DCS) — DRS is the primary tool, native replication for near-zero downtime',
            });
        }

        // ═══ STORAGE (OBS/SFS/EVS) — OMS or data sync ═══
        const storageNodes = pillars.storage;
        if (storageNodes.length > 0) {
            results.push({
                key: 'storage_oms',
                category: 'Storage (OBS/SFS → OMS)',
                status: 'info',
                finding: `${storageNodes.length} storage resource(s) — SMS does NOT apply. Use OMS (Object Migration Service) or data sync.`,
                recommendation: storageNodes.map(s => `${s.name} (${s.type}): obsutil sync or rclone`).join('; '),
                impact: 'Storage resources use OMS or data sync, not SMS',
            });

            strategyRecommendations.push({
                servers: storageNodes.map(s => s.name),
                strategy: 'obs_migration',
                reason: 'Storage resources (OBS/SFS/EVS) — OMS is the primary tool',
            });
        }

        // ═══ NETWORK (VPC/SG/EIP) — provisioned, not migrated ═══
        const networkNodes = pillars.network;
        if (networkNodes.length > 0) {
            results.push({
                key: 'network_provision',
                category: 'Network (VPC/SG/EIP)',
                status: 'pass',
                finding: `${networkNodes.length} network resource(s) — provisioned in target, not migrated. SMS/DRS/OMS do not apply.`,
                recommendation: 'Network resources are provisioned via RFS/Terraform or hcloud CLI in target region',
                impact: 'Network is infrastructure, not a migration target',
            });
        }

        // ═══ SOURCE ACCESSIBILITY (Zero Trust) ═══
        const isZeroTrust = authLevel && (
            authLevel.includes('Read-Only') || authLevel.includes('No Access') || authLevel.includes('Advisory')
        );
        if (isZeroTrust) {
            results.push({
                key: 'source_access',
                category: 'Source Accessibility',
                status: 'warning',
                finding: 'Zero Trust: No direct access to source (Read-Only/Advisory auth)',
                recommendation: 'Customer installs SMS agents on compute servers. ERP handles ALL target-side operations. Database replication requires customer to configure source-side.',
                impact: 'Zero Trust mode — customer responsibility for source-side operations',
            });
            strategyRecommendations.push({
                servers: 'ALL (source-side ops)',
                strategy: 'zero_trust',
                reason: 'Read-Only auth — customer handles agent install, source DB replication config',
            });
        } else {
            results.push({
                key: 'source_access',
                category: 'Source Accessibility',
                status: 'pass',
                finding: 'Full admin access to source — ERP can install agents and configure replication directly',
                recommendation: 'SMS with agent push for compute, DRS for databases, OMS for storage',
                impact: 'Full automation possible',
            });
        }

        // ═══ VMWARE/VSPHERE DETECTION ═══
        const isVmware = typeof sourceEnv === 'string'
            ? sourceEnv.toLowerCase().includes('vmware') || sourceEnv.toLowerCase().includes('vsphere')
            : Array.isArray(sourceEnv) && sourceEnv.some(s => s.toLowerCase().includes('vmware') || s.toLowerCase().includes('vsphere'));

        if (isVmware) {
            results.push({
                key: 'vmware',
                category: 'Virtualization',
                status: 'info',
                finding: 'VMware/vSphere source detected — image export is possible for compute servers',
                recommendation: 'Export VMs via ovftool from vCenter → convert to zvhd → import to IMS. Customer can also provide VMDK/OVA directly.',
                impact: 'Image-based migration available as primary or fallback for compute',
            });
            strategyRecommendations.push({
                servers: 'Compute (ECS)',
                strategy: 'image_import (fallback)',
                reason: 'VMware source — export via ovftool + convert + import to IMS. Viable when SMS agent cannot be installed.',
            });
        }

        // ═══ CUSTOMER IMAGE AVAILABILITY ═══
        results.push({
            key: 'customer_image',
            category: 'Customer Image',
            status: 'info',
            finding: 'If customer provides VM image (VMDK/OVA), import to IMS + data sync is possible for compute servers',
            recommendation: 'Customer exports VM → uploads to OBS → ERP imports to IMS → creates ECS → rsync data. Viable for Zero Trust + unsupported OS.',
            impact: 'Fallback for Zero Trust + unsupported OS scenarios',
        });

        // ═══ EXECUTION MODE RECOMMENDATION ═══
        let recommendedMode = 'agentic';
        let modeReason = 'Full automation: SMS for compute, DRS for databases, OMS for storage';
        if (isZeroTrust && computeUnsupported.length > 0) {
            recommendedMode = 'agentic_zero_trust';
            modeReason = 'Zero Trust + some OS unsupported → customer installs agents where possible, data_sync/image_import for unsupported';
        } else if (isZeroTrust) {
            recommendedMode = 'agentic_zero_trust';
            modeReason = 'Zero Trust — customer installs agents (compute), configures DB replication. ERP handles all target-side.';
        } else if (computeUnsupported.length > 0) {
            recommendedMode = 'agentic';
            modeReason = 'Some OS unsupported → SMS with data_sync/image_import fallback';
        }

        results.push({
            key: 'exec_mode',
            category: 'Execution Mode',
            status: 'pass',
            finding: `Recommended: ${recommendedMode}`,
            recommendation: modeReason,
            impact: 'Feeds into 3.4b Execution Mode selection',
        });

        return {
            score: Math.max(0, feasibilityScore),
            results,
            strategyRecommendations,
            recommendedMode,
            summary: {
                totalResources: mapperNodes.length,
                compute: computeNodes.length,
                computeSmsSupported: computeSupported.length,
                computeSmsUnsupported: computeUnsupported.length,
                database: dbNodes.length,
                storage: storageNodes.length,
                network: networkNodes.length,
                zeroTrust: isZeroTrust,
                vmware: isVmware,
            },
        };
    };

    // Triggered by button click — shows scanning animation, then computes & saves
    const handleRunAssessment = () => {
        setScanning(true);
        setAssessmentRun(false);
        setRunAssessment(null);
        // Simulate brief scanning delay for UX feedback
        setTimeout(() => {
            const result = computeAssessment();
            setRunAssessment(result);
            setScanning(false);
            setAssessmentRun(true);
            // Persist to project so it survives navigation
            if (onUpdateProject && result) {
                onUpdateProject({ ...activeProject, feasibilityAssessment: result });
            }
        }, 800);
    };

    // Clear the saved assessment
    const handleClearAssessment = () => {
        setRunAssessment(null);
        setAssessmentRun(false);
        if (onUpdateProject) {
            onUpdateProject({ ...activeProject, feasibilityAssessment: null });
        }
    };

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

    // ── Scanning in progress ──
    if (scanning) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-black text-lg text-slate-800">
                                <i className="fas fa-clipboard-check text-indigo-600 mr-2"></i>
                                Technical Feasibility Assessment
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Assess migration compatibility BEFORE choosing execution mode.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
                    <Spin size="large" tip="Scanning resources..." >
                        <div style={{ minHeight: 80 }} />
                    </Spin>
                    <div className="mt-4 text-sm text-slate-500 font-medium">
                        Analyzing {mapperNodes.length} resource(s) for OS compatibility, database types, source accessibility, and VMware export capability…
                    </div>
                </div>
            </div>
        );
    }

    // ── No assessment yet — show "Run Assessment" button ──
    if (!runAssessment) {
        return (
            <div className="space-y-6">
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
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="mb-6">
                        <i className="fas fa-search text-5xl text-slate-300"></i>
                    </div>
                    <h4 className="font-bold text-base text-slate-700 mb-2">Ready to Assess</h4>
                    <p className="text-sm text-slate-500 mb-6 max-w-lg mx-auto">
                        {mapperNodes.length} resource(s) detected from Phase 2 (Architecture). Click below to run the
                        Technical Feasibility Assessment — it will analyze OS compatibility, database types, source
                        accessibility, and VMware export capability, then recommend an execution mode.
                    </p>
                    <Button
                        type="primary"
                        size="large"
                        icon={<i className="fas fa-play mr-2"></i>}
                        onClick={handleRunAssessment}
                        className="!bg-indigo-600 !border-indigo-600 !rounded-xl !font-bold"
                        style={{ height: 48, paddingInline: 32 }}
                    >
                        Run Technical Feasibility Assessment
                    </Button>
                </div>
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
                        </div>
                    </div>
                </div>
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
                    <div className="flex items-center gap-4">
                        {runAssessment && (
                            <div className="text-right">
                                <div className={`text-3xl font-black ${runAssessment.score >= 80 ? 'text-emerald-600' : runAssessment.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {runAssessment.score}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-400">Feasibility Score</div>
                            </div>
                        )}
                        {isSaved && !scanning && (
                            <Tag color="green" style={{ fontSize: 10 }}>
                                <i className="fas fa-save mr-1"></i>Saved
                            </Tag>
                        )}
                        <Button
                            icon={<i className="fas fa-redo mr-1"></i>}
                            onClick={handleRunAssessment}
                            className="!rounded-lg"
                        >
                            Re-run
                        </Button>
                        <Button
                            danger
                            icon={<i className="fas fa-trash mr-1"></i>}
                            onClick={handleClearAssessment}
                            className="!rounded-lg"
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {runAssessment && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { label: 'Total Resources', value: runAssessment.summary.totalResources, color: 'text-slate-700' },
                            { label: 'Compute (ECS)', value: runAssessment.summary.compute, color: 'text-cyan-600' },
                            { label: 'SMS Compatible', value: runAssessment.summary.computeSmsSupported, color: 'text-emerald-600' },
                            { label: 'SMS Fallback', value: runAssessment.summary.computeSmsUnsupported, color: 'text-rose-600' },
                            { label: 'Database (DRS)', value: runAssessment.summary.database, color: 'text-purple-600' },
                            { label: 'Storage (OMS)', value: runAssessment.summary.storage, color: 'text-amber-600' },
                            { label: 'Network', value: runAssessment.summary.network, color: 'text-indigo-600' },
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
