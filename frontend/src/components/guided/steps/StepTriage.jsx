import React, { useState, useEffect } from 'react';

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

export default function StepTriage({ data, onChange, scenarioId }) {
    const d = data || {};
    const update = (k, v) => onChange({ ...d, [k]: v });

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

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Presales Qualification</h3>
                <p className="text-xs text-slate-500">Classify the opportunity — same fields as the Pre-Sales Radar qualification matrix.</p>
            </div>

            {/* Project Type */}
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Project Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PROJECT_TYPES.map(t => (
                        <button key={t.id} onClick={() => toggleType(t.id)}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${isTypeSelected(t.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <i className={`fas ${t.icon} text-lg ${isTypeSelected(t.id) ? 'text-blue-600' : 'text-slate-400'} mb-1`}></i>
                            <div className={`text-[10px] font-black ${isTypeSelected(t.id) ? 'text-blue-700' : 'text-slate-500'}`}>{t.label}</div>
                            <div className="text-[8px] text-slate-400">{t.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Migration Scope (Resource Types) */}
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Migration Scope</label>
                <div className="space-y-3">
                    {RESOURCE_CATEGORIES.map(cat => (
                        <div key={cat.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                            <div className="text-xs font-black text-slate-600 mb-3 flex items-center gap-2">
                                <i className={`fas ${cat.icon} text-slate-400`}></i>{cat.label}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {cat.items.map(item => (
                                    <button key={item.id} onClick={() => toggleArray('migrationScope', item.id)}
                                        className={`p-2 rounded-lg border text-left transition-all ${isSelected('migrationScope', item.id) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
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
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Source Environment</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {SOURCE_CATEGORIES.map(cat => (
                        <div key={cat.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                            <div className="text-xs font-black text-slate-600 mb-3 flex items-center gap-2">
                                <i className={`fas ${cat.icon} text-slate-400`}></i>{cat.label}
                            </div>
                            <div className="space-y-2">
                                {cat.items.map(item => (
                                    <button key={item.id} onClick={() => toggleArray('sourceEnvironment', item.id)}
                                        className={`w-full p-2 rounded-lg border text-left transition-all ${isSelected('sourceEnvironment', item.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <div className={`text-[10px] font-bold ${isSelected('sourceEnvironment', item.id) ? 'text-blue-700' : 'text-slate-600'}`}>
                                            {item.icon && <i className={`${item.icon} mr-1`}></i>}{item.label}
                                        </div>
                                        {item.desc && <div className="text-[8px] text-slate-400">{item.desc}</div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Auth Level */}
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Access Level</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {AUTH_LEVELS.map(a => (
                        <button key={a.id} onClick={() => toggleArray('authLevel', a.id)}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${isSelected('authLevel', a.id) ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <i className={`fas ${a.icon} text-lg ${isSelected('authLevel', a.id) ? 'text-purple-600' : 'text-slate-400'} mb-1`}></i>
                            <div className={`text-[10px] font-black ${isSelected('authLevel', a.id) ? 'text-purple-700' : 'text-slate-500'}`}>{a.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Delivery Scope */}
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Delivery Scope</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {DELIVERY_SCOPES.map(s => (
                        <button key={s.id} onClick={() => toggleArray('deliveryScope', s.id)}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${isSelected('deliveryScope', s.id) ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <i className={`fas ${s.icon} text-lg ${isSelected('deliveryScope', s.id) ? 'text-amber-600' : 'text-slate-400'} mb-1`}></i>
                            <div className={`text-[10px] font-black ${isSelected('deliveryScope', s.id) ? 'text-amber-700' : 'text-slate-500'}`}>{s.label}</div>
                            <div className="text-[8px] text-slate-400">{s.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Complexity + Discovery Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Complexity</label>
                    <select value={d.complexityLevel || 'Medium'} onChange={e => update('complexityLevel', e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400">
                        {COMPLEXITY.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Discovery Notes</label>
                    <textarea value={d.discoveryNotes || ''} onChange={e => update('discoveryNotes', e.target.value)} rows="2" placeholder="SA discovery scope, requirements, blockers..."
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none" />
                </div>
            </div>

            {/* SAP-specific */}
            {scenarioId === 'sap' && (
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2"><i className="fas fa-server mr-1"></i> SAP-Specific</div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">SAP SID</label><input type="text" value={d.sapSid || ''} onChange={e => update('sapSid', e.target.value)} placeholder="PRD" className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-purple-400" /></div>
                        <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={d.detectSap || false} onChange={e => update('detectSap', e.target.checked)} className="rounded text-purple-600" /> Auto-detect SAP workload</label></div>
                    </div>
                </div>
            )}
        </div>
    );
}
