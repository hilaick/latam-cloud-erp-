import React, { useState, useContext, useMemo } from 'react';
import { ERPContext } from '../../../context/ERPContext';

const COUNTRIES = ['Mexico', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panama', 'Colombia', 'Ecuador', 'Peru', 'Bolivia', 'Chile', 'Argentina', 'Uruguay', 'Paraguay', 'Brazil', 'Dominican Republic', 'Cuba', 'Jamaica', 'Puerto Rico', 'Trinidad and Tobago', 'Other / TBD'];

function getRegion(country) {
  const c = (country || '').toLowerCase();
  if (c.includes('mexico') || c.includes('guatemala') || c.includes('salvador') || c.includes('honduras') || c.includes('nicaragua') || c.includes('costa') || c.includes('panama') || c.includes('dominican') || c.includes('cuba') || c.includes('jamaica') || c.includes('puerto') || c.includes('trinidad')) return 'la-north-2';
  if (c.includes('brazil')) return 'sa-brazil-1';
  return 'la-south-2';
}

export default function StepLeadInfo({ data, onChange }) {
    const { customers, projects, handleAddProject } = useContext(ERPContext);
    const [localCountry, setLocalCountry] = useState(data?.country || '');
    const [localCustomerId, setLocalCustomerId] = useState(data?.customerId || '');
    const [created, setCreated] = useState(false);
    const d = data || {};
    const update = (k, v) => onChange({ ...d, [k]: v });

    const existingSAs = useMemo(() => Array.from(new Set((projects || []).map(p => p.sa).filter(Boolean))), [projects]);
    const existingPartners = useMemo(() => Array.from(new Set((projects || []).map(p => p.partner).filter(Boolean))), [projects]);
    const selectedCustomer = customers?.find(c => c.id === localCustomerId);

    const handleCreate = () => {
        if (!d.projectName) return;
        const custName = selectedCustomer?.name || d.customerName || '';
        const custId = selectedCustomer?.id || d.customerId || '';
        const region = selectedCustomer?.region || getRegion(d.country);

        // Create as presales lead (isWaiting: true — same as PreSalesRadar)
        const newProject = {
            id: `proj-${Date.now()}`,
            name: d.projectName.toUpperCase(),
            customerName: custName,
            customerId: custId,
            country: d.country || '',
            region,
            mrr: Number(d.mrr) || 0,
            sa: (d.sa || '').toUpperCase(),
            partner: d.partner || 'TBD',
            techContact: d.techContact || 'TBD',
            health: 'Yellow',
            isWaiting: true,
            waitingStage: 'prospect',
            isDeleted: false,
            sourceEnvironment: '',
            authLevel: [],
            migrationScope: [],
            deliveryScope: [],
            businessDrivers: [],
            project_type: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            migrationScenario: d.scenarioId || '',
        };
        if (handleAddProject) handleAddProject(newProject);
        update('projectId', newProject.id);
        update('region', region);
        update('customerName', custName);
        update('customerId', custId);
        setCreated(true);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Presales Lead Information</h3>
                <p className="text-xs text-slate-500">Capture the initial lead details — same fields as the Pre-Sales Radar.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {/* Project Name */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Project Name *</label>
                        <input type="text" value={d.projectName || ''} onChange={e => { update('projectName', e.target.value); setCreated(false); }}
                            placeholder="e.g. SAP Migration — CODELPA"
                            className={`w-full px-4 py-3 text-sm font-medium border rounded-xl outline-none ${!d.projectName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200'}`} />
                        {!d.projectName && <p className="text-[10px] text-rose-400 mt-1">Required</p>}
                    </div>

                    {/* Customer */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Customer Account *</label>
                        <input type="text" list="guided-customers" value={d.customerName || ''} onChange={e => { update('customerName', e.target.value); setCreated(false); }}
                            placeholder="Type or select customer..."
                            className="w-full px-4 py-3 text-sm font-bold uppercase border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                        <datalist id="guided-customers">
                            {(customers || []).map(c => <option key={c.id} value={c.name}>{c.name} ({c.region})</option>)}
                        </datalist>
                        {selectedCustomer && (
                            <div className="mt-1.5 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-500 flex gap-3">
                                <span><i className="fas fa-globe mr-1"></i>{selectedCustomer.country || '—'}</span>
                                <span><i className="fas fa-map-marker-alt mr-1"></i>{selectedCustomer.region || '—'}</span>
                                <span><i className={`fas ${selectedCustomer.ak ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-triangle text-amber-500'} mr-1`}></i>{selectedCustomer.ak ? 'Keys OK' : 'No keys'}</span>
                            </div>
                        )}
                    </div>

                    {/* Country */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Target Country *</label>
                        <select value={localCountry} onChange={e => { const c = e.target.value; setLocalCountry(c); update('country', c); update('region', getRegion(c)); setCreated(false); }}
                            className="w-full px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200">
                            <option value="">Select country...</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* SA + Partner + Tech Contact */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">SA *</label>
                            <input type="text" list="sa-list" value={d.sa || ''} onChange={e => update('sa', e.target.value)} placeholder="Name" className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400" />
                            <datalist id="sa-list">{existingSAs.map(sa => <option key={sa} value={sa} />)}</datalist>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Partner</label>
                            <input type="text" list="partner-list" value={d.partner || ''} onChange={e => update('partner', e.target.value)} placeholder="TBD" className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400" />
                            <datalist id="partner-list">{existingPartners.map(p => <option key={p} value={p} />)}</datalist>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tech Contact</label>
                            <input type="text" value={d.techContact || ''} onChange={e => update('techContact', e.target.value)} placeholder="TBD" className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400" />
                        </div>
                    </div>

                    {/* MRR */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Target MRR ($/month)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                            <input type="number" value={d.mrr || ''} onChange={e => update('mrr', e.target.value)} placeholder="0" className="w-full pl-7 pr-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                        </div>
                    </div>

                    {/* Create lead */}
                    <button onClick={handleCreate} disabled={!d.projectName || created}
                        className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors ${created ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300'}`}>
                        {created ? <><i className="fas fa-check-circle mr-1"></i> Lead Created — {d.projectId?.slice(-8)}</> : <><i className="fas fa-plus mr-1"></i> Create Presales Lead</>}
                    </button>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 h-fit">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Lead Summary</h4>
                    <div className="space-y-2.5">
                        <div className="flex justify-between"><span className="text-xs text-slate-500">Project</span><span className="text-xs font-bold text-slate-700">{d.projectName || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-slate-500">Customer</span><span className="text-xs font-bold text-slate-700">{d.customerName || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-slate-500">Country</span><span className="text-xs font-bold text-slate-700">{d.country || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-slate-500">Region</span><span className="text-xs font-bold text-blue-600">{d.region || getRegion(d.country)}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-slate-500">SA</span><span className="text-xs font-bold text-slate-700">{d.sa || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-slate-500">MRR</span><span className="text-xs font-bold text-emerald-600">{d.mrr ? `$${Number(d.mrr).toLocaleString()}` : '—'}</span></div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            <i className="fas fa-info-circle mr-1"></i> Creates a presales lead (visible in Pre-Sales Radar). Next step: qualify the opportunity.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
