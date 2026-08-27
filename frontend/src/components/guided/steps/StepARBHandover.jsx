import React from 'react';

export default function StepARBHandover({ data, onChange }) {
    const d = data || {};
    const update = (k, v) => onChange({ ...d, [k]: v });
    const artefacts = d.artefacts || { hld: false, targetArch: false, wbs: false };
    const toggleArtefact = (key) => update('artefacts', { ...artefacts, [key]: !artefacts[key] });

    // Credential confirmation (yes/no — actual credentials gathered via secure channel later)
    const creds = d.credStatus || {};
    const setCred = (key, val) => update('credStatus', { ...creds, [key]: val });

    const inputCls = "w-full px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors";
    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5";
    const sectionCls = "text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2 mb-4";

    const CRED_ITEMS = [
        { key: 'masterAkSk', label: 'Master AK/SK', desc: 'Full-account credentials for target Huawei Cloud (console access)' },
        { key: 'sourceHuawei', label: 'Source Huawei Credentials', desc: 'source_huawei_ak/sk + region — only if source ≠ target' },
        { key: 'multiCloud', label: 'Multi-Cloud Credentials', desc: 'AWS AK/SK, Azure tenant/client/secret, vCenter — only if non-Huawei source' },
        { key: 'osDataplane', label: 'OS Data Plane Credentials', desc: 'Domain/user/password for workload-level access' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">ARB Handover — Artefacts & Credentials</h3>
                <p className="text-xs text-slate-500">Sections E + F of the BD/SA Intake Form — confirm artefacts and credential availability.</p>
            </div>

            {/* Pre-Sales Context Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <h4 className="font-black text-sm text-slate-800"><i className="fas fa-briefcase text-blue-500 mr-2"></i> Pre-Sales Handover Context</h4>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200">Sales → Delivery</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Customer</div><div className="font-black text-sm text-slate-800">{d.customerName || 'TBD'}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Account ID</div><div className="font-bold text-xs text-slate-800 font-mono">{d.accountId || 'TBD'}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">SA</div><div className="font-bold text-sm text-blue-600">{d.sa || 'TBD'}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Partner</div><div className="font-bold text-sm text-slate-800">{d.partner || 'TBD'}</div></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100"><div className="text-[10px] text-emerald-600 uppercase font-black mb-1">MRR</div><div className="font-black text-lg text-emerald-700">${d.mrr || 0}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Source</div><div className="font-bold text-xs text-slate-800">{Array.isArray(d.sourceEnvironment) ? d.sourceEnvironment.join(', ') : (d.sourceEnvironment || 'Unknown')}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">VMs / Disks</div><div className="font-bold text-xs text-slate-800">{d.estimatedWorkloads || 0} VMs / {d.totalDiskCount || 0} disks</div></div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100"><div className="text-[10px] text-purple-600 uppercase font-bold mb-1">Complexity</div><div className="font-bold text-xs text-purple-800">{d.complexityLevel || 'Medium'}</div></div>
                </div>
                {d.discoveryNotes && <div className="mt-3"><div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Discovery Notes</div><div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{d.discoveryNotes}</div></div>}
            </div>

            {/* Section E: Gate Artefacts — Check if provided */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className={sectionCls}><i className="fas fa-check-double text-amber-500 mr-2"></i> E. Gate Artefacts — Check if Provided</div>
                <div className="space-y-3">
                    <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors bg-white">
                        <input type="checkbox" checked={artefacts.hld} onChange={() => toggleArtefact('hld')} className="w-5 h-5 accent-purple-600" />
                        <div><div className="font-bold text-slate-800 text-sm">Present State HLD (As-Is)</div><div className="text-[10px] text-slate-500">Current environment architecture diagram / document</div></div>
                    </label>
                    <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors bg-white">
                        <input type="checkbox" checked={artefacts.targetArch} onChange={() => toggleArtefact('targetArch')} className="w-5 h-5 accent-purple-600" />
                        <div><div className="font-bold text-slate-800 text-sm">Target Architecture (To-Be)</div><div className="text-[10px] text-slate-500">Cloud target-state design for Huawei Cloud</div></div>
                    </label>
                    <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors bg-white">
                        <input type="checkbox" checked={artefacts.wbs} onChange={() => toggleArtefact('wbs')} className="w-5 h-5 accent-purple-600" />
                        <div><div className="font-bold text-slate-800 text-sm">High-Level WBS (Sales)</div><div className="text-[10px] text-slate-500">Sales-provided Work Breakdown Structure</div></div>
                    </label>
                </div>
                <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-700">
                    <i className="fas fa-exclamation-triangle mr-1"></i> These artefacts must be confirmed by the delivery team to proceed to ARB.
                </div>
            </div>

            {/* Section F: Credentials — Yes/No confirmation */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className={sectionCls}><i className="fas fa-key text-rose-500 mr-2"></i> F. Credentials & Access — Confirm Availability</div>
                <div className="space-y-3">
                    {CRED_ITEMS.map(item => (
                        <div key={item.key} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white">
                            <div className="flex-1">
                                <div className="font-bold text-slate-800 text-sm">{item.label}</div>
                                <div className="text-[10px] text-slate-500">{item.desc}</div>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <button onClick={() => setCred(item.key, 'yes')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-colors ${creds[item.key] === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                                    <i className="fas fa-check mr-1"></i> Yes
                                </button>
                                <button onClick={() => setCred(item.key, 'no')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-colors ${creds[item.key] === 'no' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                                    <i className="fas fa-times mr-1"></i> No
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-700">
                    <i className="fas fa-info-circle mr-1"></i> Actual credentials will be gathered through a secure channel after ARB approval. This step only confirms availability.
                </div>
            </div>
        </div>
    );
}
