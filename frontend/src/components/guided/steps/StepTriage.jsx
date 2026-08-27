import React from 'react';

const PROJECT_TYPES = [
    { id: 'greenfield', label: 'Greenfield', desc: 'Born-in-Cloud', icon: 'fa-leaf' },
    { id: 'standard', label: 'Migration', desc: 'Lift & Shift', icon: 'fa-truck-moving' },
    { id: 'poc', label: 'PoC Sandbox', desc: 'Fast-Track', icon: 'fa-bolt' },
    { id: 'expansion', label: 'Expansion', desc: 'Phase 2+', icon: 'fa-expand-arrows-alt' },
];

const RESOURCE_CATEGORIES = [
    { id: 'compute', label: 'Compute', icon: 'fa-server', items: [
        { id: 'compute_single_servers', label: 'Single Servers', desc: 'Individual VM migration' },
        { id: 'compute_batch_servers', label: 'Batch Servers', desc: 'Multiple VMs in batches' },
    ]},
    { id: 'database', label: 'Databases', icon: 'fa-database', items: [
        { id: 'database_migration', label: 'Migration', desc: 'Full database migration' },
        { id: 'database_synchronization', label: 'Synchronization', desc: 'Continuous data sync' },
    ]},
    { id: 'storage', label: 'Storage', icon: 'fa-hdd', items: [
        { id: 'storage_object_cross_cloud', label: 'Object (Cross-Cloud)', desc: 'S3/Blob → OBS' },
        { id: 'storage_object_cloud_to_cloud', label: 'Object (Cloud-to-Cloud)', desc: 'Within Huawei' },
        { id: 'storage_snapshots_same_region', label: 'Snapshots', desc: 'Same region' },
        { id: 'storage_images_cross_region', label: 'Images', desc: 'Cross-region/account' },
    ]},
];

const SOURCE_CATEGORIES = [
    { id: 'cross_cloud', label: 'Cross-Cloud', icon: 'fa-exchange-alt', items: [
        { id: 'aws', label: 'AWS', icon: 'fab fa-aws' },
        { id: 'azure', label: 'Azure', icon: 'fab fa-windows' },
        { id: 'google_cloud', label: 'Google Cloud', icon: 'fab fa-google' },
    ]},
    { id: 'huawei_cloud', label: 'Huawei Cloud', icon: 'fa-cloud', items: [
        { id: 'huawei_az_to_az', label: 'AZ-to-AZ', desc: 'Within same region' },
        { id: 'huawei_cross_region', label: 'Cross-Region', desc: 'Between regions' },
        { id: 'huawei_cross_account', label: 'Cross-Account', desc: 'Between accounts' },
    ]},
    { id: 'on_premise', label: 'On-Premise', icon: 'fa-server', items: [
        { id: 'bare_metal', label: 'Bare Metal' },
        { id: 'vmware', label: 'VMware' },
        { id: 'nutanix', label: 'Nutanix' },
    ]},
];

const AUTH_LEVELS = [
    { id: 'Cloud Admin API', label: 'Cloud API', icon: 'fa-cloud' },
    { id: 'Active Directory', label: 'AD / GPO', icon: 'fa-sitemap' },
    { id: 'Local OS Admin', label: 'OS Admin', icon: 'fa-terminal' },
    { id: 'Read-Only (Customer Managed)', label: 'Zero-Trust', icon: 'fa-user-shield' },
];

const DELIVERY_SCOPES = [
    { id: 'turnkey', label: 'Turnkey', desc: 'We Execute E2E', icon: 'fa-key' },
    { id: 'co_delivery', label: 'Co-Delivery', desc: 'Shared Model', icon: 'fa-handshake' },
    { id: 'advisory', label: 'Advisory', desc: 'Partner Executes', icon: 'fa-chalkboard-teacher' },
    { id: 'arch_review', label: 'Arch Review', desc: 'Validation & Design', icon: 'fa-sitemap' },
];

const COMPLEXITY = ['Low', 'Medium', 'High', 'Ultra-High'];
const DISK_TYPES = ['SSD', 'HDD', 'GPSSD', 'Ultra-high I/O', 'Mixed'];

// Scenario-specific pre-fills
const SCENARIO_PRESETS = {
    'sap': { project_type: ['standard'], sourceEnvironment: ['vmware', 'bare_metal'], authLevel: ['Read-Only (Customer Managed)'], deliveryScope: ['turnkey'], complexityLevel: 'High', migrationScope: ['compute_single_servers', 'compute_batch_servers', 'database_migration'] },
    'cross-cloud': { sourceEnvironment: ['aws', 'azure'], migrationScope: ['compute_single_servers', 'compute_batch_servers', 'storage_object_cross_cloud'], complexityLevel: 'Medium' },
    'on-prem': { project_type: ['standard'], sourceEnvironment: ['vmware', 'bare_metal'], authLevel: ['Local OS Admin'], migrationScope: ['compute_single_servers', 'compute_batch_servers'], complexityLevel: 'Low' },
    'database': { migrationScope: ['database_migration', 'database_synchronization'], deliveryScope: ['co_delivery'], complexityLevel: 'Medium' },
    'object-storage': { migrationScope: ['storage_object_cross_cloud'], sourceEnvironment: ['aws', 'azure'], complexityLevel: 'Low' },
    'multi-region': { deliveryScope: ['turnkey'], complexityLevel: 'Ultra-High', sourceEnvironment: ['huawei_cross_region'] },
};

export default function StepTriage({ data, onChange, scenarioId }) {
    const d = data || {};
    const update = (k, v) => onChange({ ...d, [k]: v });

    // Apply scenario preset on first load
    React.useEffect(() => {
        if (scenarioId && SCENARIO_PRESETS[scenarioId] && !d._presetApplied) {
            const preset = SCENARIO_PRESETS[scenarioId];
            onChange({ ...d, ...preset, _presetApplied: true });
        }
    }, [scenarioId]);

    const toggleArray = (key, id) => {
        const arr = Array.isArray(d[key]) ? d[key] : (d[key] ? [d[key]] : []);
        const newArr = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
        update(key, newArr);
    };
    const isSelected = (key, id) => Array.isArray(d[key]) ? d[key].includes(id) : d[key] === id;
    const toggleType = (id) => {
        const arr = Array.isArray(d.project_type) ? d.project_type : (d.project_type ? [d.project_type] : []);
        const newArr = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
        update('project_type', newArr);
    };
    const isTypeSelected = (id) => Array.isArray(d.project_type) ? d.project_type.includes(id) : d.project_type === id;

    const inputCls = "w-full px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors";
    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5";
    const sectionCls = "text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2 mb-4";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Discovery & Technical Sizing</h3>
                <p className="text-xs text-slate-500">Sections C + D of the BD/SA Intake Form — financials, sizing, risk profile, and qualification.</p>
                {scenarioId && SCENARIO_PRESETS[scenarioId] && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-[10px] text-blue-600 border border-blue-100">
                        <i className="fas fa-magic mr-1"></i> Pre-configured for <strong>{scenarioId}</strong> scenario — review and adjust as needed.
                    </div>
                )}
            </div>

            {/* Section C: Discovery & Financials */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className={sectionCls}><i className="fas fa-search-dollar text-emerald-500 mr-2"></i> C. Discovery & Financials</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className={labelCls}>Discovery Scope / Requirements</label>
                        <textarea value={d.discoveryNotes || ''} onChange={e => update('discoveryNotes', e.target.value)} rows="3" placeholder="What was discovered, constraints, customer asks, deal context" className={`${inputCls} resize-none`} />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Target MRR ($)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                                <input type="number" value={d.mrr || ''} onChange={e => update('mrr', e.target.value)} placeholder="0" className={`${inputCls} pl-7`} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Expected Close Date</label>
                            <input type="date" value={d.expectedCloseDate || ''} onChange={e => update('expectedCloseDate', e.target.value)} className={inputCls} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section D: Technical Sizing & Risk Profile */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className={sectionCls}><i className="fas fa-microchip text-blue-500 mr-2"></i> D. Technical Sizing & Risk Profile</div>

                {/* Project Type */}
                <div className="mb-5">
                    <label className={labelCls}>Project Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {PROJECT_TYPES.map(t => (
                            <button key={t.id} onClick={() => toggleType(t.id)} className={`p-2 rounded-lg border-2 text-center transition-all ${isTypeSelected(t.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <i className={`fas ${t.icon} ${isTypeSelected(t.id) ? 'text-blue-600' : 'text-slate-400'} mb-1`}></i>
                                <div className={`text-[10px] font-black ${isTypeSelected(t.id) ? 'text-blue-700' : 'text-slate-500'}`}>{t.label}</div>
                                <div className="text-[8px] text-slate-400">{t.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Migration Scope */}
                <div className="mb-5">
                    <label className={labelCls}>Migration Scope</label>
                    <div className="space-y-2">
                        {RESOURCE_CATEGORIES.map(cat => (
                            <div key={cat.id} className="bg-white rounded-lg border border-slate-100 p-3">
                                <div className="text-[11px] font-black text-slate-600 mb-2 flex items-center gap-1"><i className={`fas ${cat.icon} text-slate-400`}></i>{cat.label}</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {cat.items.map(item => (
                                        <button key={item.id} onClick={() => toggleArray('migrationScope', item.id)} className={`p-2 rounded-lg border text-left transition-all ${isSelected('migrationScope', item.id) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <div className={`text-[10px] font-bold ${isSelected('migrationScope', item.id) ? 'text-emerald-700' : 'text-slate-600'}`}>{item.label}</div>
                                            {item.desc && <div className="text-[8px] text-slate-400">{item.desc}</div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Source Environment */}
                <div className="mb-5">
                    <label className={labelCls}>Source Environment</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {SOURCE_CATEGORIES.map(cat => (
                            <div key={cat.id} className="bg-white rounded-lg border border-slate-100 p-3">
                                <div className="text-[11px] font-black text-slate-600 mb-2 flex items-center gap-1"><i className={`fas ${cat.icon} text-slate-400`}></i>{cat.label}</div>
                                <div className="space-y-1">
                                    {cat.items.map(item => (
                                        <button key={item.id} onClick={() => toggleArray('sourceEnvironment', item.id)} className={`w-full p-1.5 rounded border text-left transition-all ${isSelected('sourceEnvironment', item.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <span className={`text-[10px] font-bold ${isSelected('sourceEnvironment', item.id) ? 'text-blue-700' : 'text-slate-600'}`}>{item.icon && <i className={`${item.icon} mr-1`}></i>}{item.label}</span>
                                            {item.desc && <span className="text-[8px] text-slate-400 block">{item.desc}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sizing grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div><label className={labelCls}>Estimated Workloads (# VMs)</label><input type="number" value={d.estimatedWorkloads || ''} onChange={e => update('estimatedWorkloads', e.target.value)} placeholder="0" className={inputCls} /></div>
                    <div><label className={labelCls}>Total Disk Count</label><input type="number" value={d.totalDiskCount || ''} onChange={e => update('totalDiskCount', e.target.value)} placeholder="e.g., 15" className={inputCls} /></div>
                    <div><label className={labelCls}>Total Disk Capacity (TB)</label><input type="number" step="0.1" value={d.totalDiskCapacity || ''} onChange={e => update('totalDiskCapacity', e.target.value)} placeholder="e.g., 8.5" className={inputCls} /></div>
                    <div><label className={labelCls}>Disk Types / Performance Tier</label><select value={d.diskTypes || ''} onChange={e => update('diskTypes', e.target.value)} className={inputCls}><option value="">Select...</option>{DISK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className={labelCls}>Est. Migration Labor (Hours)</label><input type="number" value={d.estimatedMigrationHours || ''} onChange={e => update('estimatedMigrationHours', e.target.value)} placeholder="0" className={inputCls} /></div>
                    <div><label className={labelCls}>Complexity Level</label><select value={d.complexityLevel || 'Medium'} onChange={e => update('complexityLevel', e.target.value)} className={inputCls}>{COMPLEXITY.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>

                {/* Auth Level */}
                <div className="mb-5">
                    <label className={labelCls}>Access Level</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {AUTH_LEVELS.map(a => (
                            <button key={a.id} onClick={() => toggleArray('authLevel', a.id)} className={`p-2 rounded-lg border-2 text-center transition-all ${isSelected('authLevel', a.id) ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <i className={`fas ${a.icon} ${isSelected('authLevel', a.id) ? 'text-purple-600' : 'text-slate-400'} mb-1`}></i>
                                <div className={`text-[10px] font-black ${isSelected('authLevel', a.id) ? 'text-purple-700' : 'text-slate-500'}`}>{a.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Delivery Scope */}
                <div className="mb-5">
                    <label className={labelCls}>Delivery Scope</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {DELIVERY_SCOPES.map(s => (
                            <button key={s.id} onClick={() => toggleArray('deliveryScope', s.id)} className={`p-2 rounded-lg border-2 text-center transition-all ${isSelected('deliveryScope', s.id) ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <i className={`fas ${s.icon} ${isSelected('deliveryScope', s.id) ? 'text-amber-600' : 'text-slate-400'} mb-1`}></i>
                                <div className={`text-[10px] font-black ${isSelected('deliveryScope', s.id) ? 'text-amber-700' : 'text-slate-500'}`}>{s.label}</div>
                                <div className="text-[8px] text-slate-400">{s.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Blockers */}
                <div>
                    <label className={labelCls}>Blockers / Deal-Breakers</label>
                    <textarea value={d.blocker || ''} onChange={e => update('blocker', e.target.value)} rows="2" placeholder="Known risks or showstoppers; flag if any are present" className={`${inputCls} resize-none`} />
                </div>
            </div>

            {/* SAP-Specific Section */}
            {scenarioId === 'sap' && (
                <div className="bg-purple-50 rounded-2xl border border-purple-100 p-6" style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="text-xs font-black uppercase tracking-widest text-purple-600 border-b border-purple-100 pb-2 mb-4"><i className="fas fa-server mr-2"></i> SAP-Specific Details</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div><label className={labelCls}>SAP SID</label><input type="text" value={d.sapSid || ''} onChange={e => update('sapSid', e.target.value)} placeholder="PRD" className={`${inputCls} font-mono`} /></div>
                        <div><label className={labelCls}>Database Size (GB)</label><input type="number" value={d.sapDbSize || ''} onChange={e => update('sapDbSize', e.target.value)} placeholder="e.g., 2000" className={inputCls} /></div>
                        <div><label className={labelCls}>Transactional Volume (transactions/day)</label><input type="number" value={d.sapTransactionalVolume || ''} onChange={e => update('sapTransactionalVolume', e.target.value)} placeholder="e.g., 500000" className={inputCls} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><label className={labelCls}>Add-on Complexity</label><select value={d.sapAddonComplexity || ''} onChange={e => update('sapAddonComplexity', e.target.value)} className={inputCls}><option value="">Select...</option><option>Low — standard SAP modules only</option><option>Medium — custom add-ons (Z-programs)</option><option>High — heavily customized + third-party</option></select></div>
                        <div><label className={labelCls}>SQL-to-HANA Requirements</label><select value={d.sapSqlToHana || ''} onChange={e => update('sapSqlToHana', e.target.value)} className={inputCls}><option value="">Select...</option><option>Not applicable</option><option>Required — anyDB → HANA</option><option>Already on HANA</option><option>Assessment needed</option></select></div>
                    </div>
                    <div className="mb-4">
                        <label className={labelCls}>Integrations (PI/PO, RFC, APIs, third-party)</label>
                        <textarea value={d.sapIntegrations || ''} onChange={e => update('sapIntegrations', e.target.value)} rows="2" placeholder="List all integrations: PI/PO, RFC, web services, third-party connectors..." className={`${inputCls} resize-none`} />
                    </div>
                    <div className="mb-4">
                        <label className={labelCls}>Operational Constraints</label>
                        <textarea value={d.sapOperationalConstraints || ''} onChange={e => update('sapOperationalConstraints', e.target.value)} rows="2" placeholder="Batch jobs, maintenance windows, backup schedules, downtime tolerance..." className={`${inputCls} resize-none`} />
                    </div>

                    {/* Partner Install-Base (special projects) */}
                    <div className="mt-4 pt-4 border-t border-purple-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-3"><i className="fas fa-handshake mr-1"></i> Partner Install-Base (if moving partner's customer base)</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div><label className={labelCls}>Customer Prioritization</label><select value={d.sapCustomerPrioritization || ''} onChange={e => update('sapCustomerPrioritization', e.target.value)} className={inputCls}><option value="">Select...</option><option>Tier 1 — Critical (production)</option><option>Tier 2 — Important (non-prod)</option><option>Tier 3 — Standard (dev/test)</option><option>Mixed — phased by priority</option></select></div>
                            <div><label className={labelCls}>Migration Phases</label><input type="text" value={d.sapMigrationPhases || ''} onChange={e => update('sapMigrationPhases', e.target.value)} placeholder="e.g., Phase 1: 5 customers, Phase 2: 12..." className={inputCls} /></div>
                            <div><label className={labelCls}>Database Consolidation by Account ID</label><select value={d.sapDbConsolidation || ''} onChange={e => update('sapDbConsolidation', e.target.value)} className={inputCls}><option value="">Select...</option><option>No consolidation — 1:1 mapping</option><option>Consolidate by Account ID</option><option>Mixed — some consolidated, some 1:1</option></select></div>
                            <div><label className={labelCls}>Tenancy Model</label><select value={d.sapTenancy || ''} onChange={e => update('sapTenancy', e.target.value)} className={inputCls}><option value="">Select...</option><option>Single-tenant</option><option>Multi-tenant</option><option>Mixed</option></select></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelCls}>Migration Windows</label><textarea value={d.sapMigrationWindows || ''} onChange={e => update('sapMigrationWindows', e.target.value)} rows="2" placeholder="Weekend cutover, quarterly windows, holiday freezes..." className={`${inputCls} resize-none`} /></div>
                            <div><label className={labelCls}>Estimated Timelines</label><textarea value={d.sapTimelines || ''} onChange={e => update('sapTimelines', e.target.value)} rows="2" placeholder="Start date, end date, key milestones..." className={`${inputCls} resize-none`} /></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
