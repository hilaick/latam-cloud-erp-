import React from 'react';

export default function StepARBHandover({ data, onChange }) {
    const d = data || {};
    const update = (k, v) => onChange({ ...d, [k]: v });
    const artefacts = d.artefacts || { hld: false, targetArch: false, sow: false, wbs: false };
    const toggleArtefact = (key) => update('artefacts', { ...artefacts, [key]: !artefacts[key] });

    const inputCls = "w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors";
    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5";
    const sectionCls = "text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2 mb-4";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">ARB Handover — Artefacts & Credentials</h3>
                <p className="text-xs text-slate-500">Sections E + F of the BD/SA Intake Form — mandatory gate artefacts and credential collection.</p>
            </div>

            {/* Pre-Sales Context Summary (read-only from previous steps) */}
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

            {/* Section E: Mandatory Gate Artefacts */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className={sectionCls}><i className="fas fa-check-double text-amber-500 mr-2"></i> E. Mandatory Gate Artefacts (ARB-ready)</div>
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
                        <input type="checkbox" checked={artefacts.sow} onChange={() => toggleArtefact('sow')} className="w-5 h-5 accent-purple-600" />
                        <div><div className="font-bold text-slate-800 text-sm">SOW Blueprint</div><div className="text-[10px] text-slate-500">Derived from uploaded quotation BoM or shared Price Calculator link</div></div>
                    </label>
                    <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-colors bg-white">
                        <input type="checkbox" checked={artefacts.wbs} onChange={() => toggleArtefact('wbs')} className="w-5 h-5 accent-purple-600" />
                        <div><div className="font-bold text-slate-800 text-sm">High-Level WBS (Sales)</div><div className="text-[10px] text-slate-500">Sales-provided Work Breakdown Structure</div></div>
                    </label>
                </div>
                <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-700">
                    <i className="fas fa-exclamation-triangle mr-1"></i> Missing artefacts = ARB rejection. Upload or link every artefact.
                </div>
            </div>

            {/* Section F: Credentials & Access */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className={sectionCls}><i className="fas fa-key text-rose-500 mr-2"></i> F. Credentials & Access</div>
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>Master AK/SK (Target Huawei Cloud)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={d.masterAk || ''} onChange={e => update('masterAk', e.target.value)} placeholder="Access Key" className={inputCls} />
                            <input type="password" value={d.masterSk || ''} onChange={e => update('masterSk', e.target.value)} placeholder="Secret Key" className={inputCls} />
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">Full-account credentials for target Huawei Cloud (console access)</div>
                    </div>
                    <div>
                        <label className={labelCls}>Source Huawei Credentials (if cross-account)</label>
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" value={d.sourceHuaweiAk || ''} onChange={e => update('sourceHuaweiAk', e.target.value)} placeholder="Source AK" className={inputCls} />
                            <input type="password" value={d.sourceHuaweiSk || ''} onChange={e => update('sourceHuaweiSk', e.target.value)} placeholder="Source SK" className={inputCls} />
                            <input type="text" value={d.sourceHuaweiRegion || ''} onChange={e => update('sourceHuaweiRegion', e.target.value)} placeholder="Source Region" className={inputCls} />
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">Only if source ≠ target (cross-account MgC discovery)</div>
                    </div>
                    <div>
                        <label className={labelCls}>Multi-Cloud Credentials (AWS / Azure / vCenter)</label>
                        <textarea value={d.multiCloudCreds || ''} onChange={e => update('multiCloudCreds', e.target.value)} rows="2" placeholder="AWS AK/SK, Azure tenant/client/secret/subscription, vCenter host/user — only if source is non-Huawei" className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                        <label className={labelCls}>OS Data Plane Credentials</label>
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" value={d.osDomain || ''} onChange={e => update('osDomain', e.target.value)} placeholder="Domain" className={inputCls} />
                            <input type="text" value={d.osUser || ''} onChange={e => update('osUser', e.target.value)} placeholder="User (admin/root)" className={inputCls} />
                            <input type="password" value={d.osPassword || ''} onChange={e => update('osPassword', e.target.value)} placeholder="Password" className={inputCls} />
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">Domain/user/password for workload-level access</div>
                    </div>
                </div>
                <div className="mt-3 p-2 bg-rose-50 rounded-lg border border-rose-100 text-[10px] text-rose-700">
                    <i className="fas fa-shield-alt mr-1"></i> Treat with extreme care. Only share encrypted or via secure channel. Mark 'TBD' if pending.
                </div>
            </div>
        </div>
    );
}
