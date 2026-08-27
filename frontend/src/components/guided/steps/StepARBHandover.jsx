import React from 'react';

export default function StepARBHandover({ data, onChange }) {
    const d = data || {};
    const update = (k, v) => onChange({ ...d, [k]: v });
    const artefacts = d.artefacts || { hld: false, targetArch: false };
    const toggleArtefact = (key) => update('artefacts', { ...artefacts, [key]: !artefacts[key] });

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">ARB Handover</h3>
                <p className="text-xs text-slate-500">Sales → Delivery handover. Confirm mandatory artifacts and capture SOW context.</p>
            </div>

            {/* Pre-Sales Context Summary (read-only, from previous steps) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <h4 className="font-black text-sm text-slate-800"><i className="fas fa-briefcase text-blue-500 mr-2"></i> Pre-Sales Handover Context</h4>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200">Sales → Delivery</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Customer</div><div className="font-black text-sm text-slate-800">{d.customerName || 'TBD'}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Country</div><div className="font-bold text-sm text-slate-800">{d.country || 'TBD'}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">SA</div><div className="font-bold text-sm text-blue-600">{d.sa || 'TBD'}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Partner</div><div className="font-bold text-sm text-slate-800">{d.partner || 'TBD'}</div></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100"><div className="text-[10px] text-emerald-600 uppercase font-black mb-1">Target MRR</div><div className="font-black text-lg text-emerald-700">${d.mrr || 0}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Source Env</div><div className="font-bold text-xs text-slate-800">{Array.isArray(d.sourceEnvironment) ? d.sourceEnvironment.join(', ') : (d.sourceEnvironment || 'Unknown')}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Complexity</div><div className="font-bold text-xs text-purple-800">{d.complexityLevel || 'Medium'}</div></div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Project Type</div><div className="font-bold text-xs text-slate-800">{Array.isArray(d.project_type) ? d.project_type.join(', ') : (d.project_type || '—')}</div></div>
                </div>
                {d.discoveryNotes && (
                    <div className="mt-3">
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Discovery Notes</div>
                        <div className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{d.discoveryNotes}</div>
                    </div>
                )}
            </div>

            {/* Mandatory Gate Artefacts */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-100 pb-3">Mandatory Gate Artefacts</h4>
                <div className="space-y-3">
                    <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input type="checkbox" checked={artefacts.hld} onChange={() => toggleArtefact('hld')} className="w-5 h-5 accent-purple-600" />
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Present State HLD (As-Is)</div>
                            <div className="text-[10px] text-slate-500">Collect present environment state documentation</div>
                        </div>
                    </label>
                    <label className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input type="checkbox" checked={artefacts.targetArch} onChange={() => toggleArtefact('targetArch')} className="w-5 h-5 accent-purple-600" />
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Target Architecture (To-Be)</div>
                            <div className="text-[10px] text-slate-500">Design cloud architecture strategy</div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Expected Close Date + Estimated Workloads */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Expected Close Date</label>
                    <input type="date" value={d.expectedCloseDate || ''} onChange={e => update('expectedCloseDate', e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400" />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Est. Workloads (VMs)</label>
                    <input type="number" value={d.estimatedWorkloads || ''} onChange={e => update('estimatedWorkloads', e.target.value)} placeholder="0"
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400" />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Est. Migration Hours</label>
                    <input type="number" value={d.estimatedMigrationHours || ''} onChange={e => update('estimatedMigrationHours', e.target.value)} placeholder="0"
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400" />
                </div>
            </div>

            {/* Blockers */}
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Blockers / Risks (if any)</label>
                <textarea value={d.blocker || ''} onChange={e => update('blocker', e.target.value)} rows="2" placeholder="No blockers reported..."
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-rose-400 resize-none" />
            </div>
        </div>
    );
}
