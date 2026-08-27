import React, { useState, useContext, useMemo } from 'react';
import { ERPContext } from '../../../context/ERPContext';

const COUNTRIES = ['Mexico', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panama', 'Colombia', 'Ecuador', 'Peru', 'Bolivia', 'Chile', 'Argentina', 'Uruguay', 'Paraguay', 'Brazil', 'Dominican Republic', 'Cuba', 'Jamaica', 'Puerto Rico', 'Trinidad and Tobago', 'Other / TBD'];

function getRegion(country) {
  const c = (country || '').toLowerCase();
  if (c.includes('mexico') || c.includes('guatemala') || c.includes('salvador') || c.includes('honduras') || c.includes('nicaragua') || c.includes('costa') || c.includes('panama') || c.includes('dominican') || c.includes('cuba') || c.includes('jamaica') || c.includes('puerto') || c.includes('trinidad')) return 'la-north-2';
  if (c.includes('brazil')) return 'sa-brazil-1';
  return 'la-south-2';
}

const VERIFICATION_OPTIONS = ['Verified', 'Pending', 'Not Started'];

export default function StepLeadInfo({ data, onChange }) {
    const { customers, projects, handleAddProject } = useContext(ERPContext);
    const [localCountry, setLocalCountry] = useState(data?.country || '');
    const [localVerification, setLocalVerification] = useState(data?.realNameVerification || '');
    const [localIsPartner, setLocalIsPartner] = useState(data?.isPartner || '');
    const [created, setCreated] = useState(false);
    const d = data || {};
    const update = (k, v) => onChange({ ...d, [k]: v });

    const existingSAs = useMemo(() => Array.from(new Set((projects || []).map(p => p.sa).filter(Boolean))), [projects]);
    const existingPartners = useMemo(() => Array.from(new Set((projects || []).map(p => p.partner).filter(Boolean))), [projects]);

    const selectedCustomer = customers?.find(c => c.name?.toLowerCase() === (d.customerName || '').toLowerCase());

    const handleCreate = () => {
        if (!d.customerName || !d.sa || !d.country) return;
        const matchedCustomer = (customers || []).find(c => c.name?.toLowerCase() === d.customerName.toLowerCase().trim());
        let customerId = null;
        let customerName = d.customerName.trim().toUpperCase();
        if (matchedCustomer) { customerId = matchedCustomer.id; customerName = matchedCustomer.name; }

        const region = matchedCustomer?.region || getRegion(d.country);

        const newProject = {
            id: `proj-${Date.now()}`,
            name: d.projectName ? d.projectName.toUpperCase() : `${customerName} Migration`,
            customerName,
            customerId,
            // Section A fields
            huaweiAccountName: d.huaweiAccountName || '',
            accountId: d.accountId || '',
            realNameVerification: d.realNameVerification || '',
            isPartner: d.isPartner || '',
            enterpriseProject: d.enterpriseProject || '',
            country: d.country || '',
            region,
            // Section B fields
            sa: (d.sa || '').toUpperCase(),
            partner: d.partner || 'TBD',
            cioItLead: d.cioItLead || '',
            technicalArchitect: d.technicalArchitect || '',
            // Section C fields
            discoveryNotes: d.discoveryNotes || '',
            mrr: Number(d.mrr) || 0,
            expectedCloseDate: d.expectedCloseDate || '',
            // Defaults
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
        update('customerId', customerId);
        setCreated(true);
    };

    const inputCls = "w-full px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors";
    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5";
    const sectionCls = "text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2 mb-4";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Customer & Account Identity</h3>
                <p className="text-xs text-slate-500">Section A + B of the BD/SA Intake Form — customer identity and stakeholder contacts.</p>
            </div>

            {/* Section A: Customer & Account Identity */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className={sectionCls}><i className="fas fa-building text-blue-500 mr-2"></i> A. Customer & Account Identity</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Customer Account Name *</label>
                        <input type="text" list="guided-customers" value={d.customerName || ''} onChange={e => { update('customerName', e.target.value); setCreated(false); }} placeholder="Legal entity / brand name" className={inputCls} />
                        <datalist id="guided-customers">{(customers || []).map(c => <option key={c.id} value={c.name}>{c.name} ({c.region})</option>)}</datalist>
                    </div>
                    <div>
                        <label className={labelCls}>Huawei Account Name</label>
                        <input type="text" value={d.huaweiAccountName || ''} onChange={e => update('huaweiAccountName', e.target.value)} placeholder="Huawei Cloud account display name" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Account ID (Customer ID)</label>
                        <input type="text" value={d.accountId || ''} onChange={e => update('accountId', e.target.value)} placeholder="e.g., 3a1b2c3d4e5f..." className={`${inputCls} font-mono`} />
                    </div>
                    <div>
                        <label className={labelCls}>Real-Name Verification Status</label>
                        <select value={localVerification} onChange={e => { setLocalVerification(e.target.value); update('realNameVerification', e.target.value); }} className={inputCls}>
                            <option value="">Select...</option>
                            {VERIFICATION_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Is this a Partner account?</label>
                        <select value={localIsPartner} onChange={e => { setLocalIsPartner(e.target.value); update('isPartner', e.target.value); }} className={inputCls}>
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    {d.isPartner === 'Yes' && (
                        <div>
                            <label className={labelCls}>Enterprise Project (if Partner)</label>
                            <input type="text" value={d.enterpriseProject || ''} onChange={e => update('enterpriseProject', e.target.value)} placeholder="EPS name/ID" className={inputCls} />
                        </div>
                    )}
                    <div>
                        <label className={labelCls}>Target Country *</label>
                        <select value={localCountry} onChange={e => { const c = e.target.value; setLocalCountry(c); update('country', c); update('region', getRegion(c)); setCreated(false); }} className={inputCls}>
                            <option value="">Select country...</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {d.projectName === undefined && (
                        <div>
                            <label className={labelCls}>Project Name (optional)</label>
                            <input type="text" value={d.projectName || ''} onChange={e => { update('projectName', e.target.value); setCreated(false); }} placeholder="Auto-generated if blank" className={inputCls} />
                        </div>
                    )}
                </div>
                {selectedCustomer && (
                    <div className="mt-3 p-2 bg-white rounded-lg text-[10px] text-slate-500 flex gap-4 border border-slate-100">
                        <span><i className="fas fa-globe mr-1"></i>{selectedCustomer.country || '—'}</span>
                        <span><i className="fas fa-map-marker-alt mr-1"></i>{selectedCustomer.region || '—'}</span>
                        <span><i className={`fas ${selectedCustomer.ak ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-triangle text-amber-500'} mr-1`}></i>{selectedCustomer.ak ? 'Keys OK' : 'No keys'}</span>
                    </div>
                )}
            </div>

            {/* Section B: Stakeholder Contacts */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className={sectionCls}><i className="fas fa-users text-purple-500 mr-2"></i> B. Stakeholder Contacts</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Sales Architect (SA) *</label>
                        <input type="text" list="sa-list" value={d.sa || ''} onChange={e => update('sa', e.target.value)} placeholder="Who sold it" className={inputCls} />
                        <datalist id="sa-list">{existingSAs.map(sa => <option key={sa} value={sa} />)}</datalist>
                    </div>
                    <div>
                        <label className={labelCls}>Delivery Partner</label>
                        <input type="text" list="partner-list" value={d.partner || ''} onChange={e => update('partner', e.target.value)} placeholder="e.g., Partner 1, Partner 2, or Internal" className={inputCls} />
                        <datalist id="partner-list">{existingPartners.map(p => <option key={p} value={p} />)}</datalist>
                    </div>
                    <div>
                        <label className={labelCls}>CIO / IT Lead</label>
                        <input type="text" value={d.cioItLead || ''} onChange={e => update('cioItLead', e.target.value)} placeholder="Customer-side decision-maker" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Technical Architect (Customer)</label>
                        <input type="text" value={d.technicalArchitect || ''} onChange={e => update('technicalArchitect', e.target.value)} placeholder="Customer's technical POC" className={inputCls} />
                    </div>
                </div>
            </div>

            {/* Create lead button */}
            <button onClick={handleCreate} disabled={!d.customerName || !d.sa || !d.country || created}
                className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors ${created ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300'}`}>
                {created ? <><i className="fas fa-check-circle mr-1"></i> Lead Created — {d.projectId?.slice(-8)}</> : <><i className="fas fa-plus mr-1"></i> Create Presales Lead</>}
            </button>
            {!created && (!d.customerName || !d.sa || !d.country) && (
                <p className="text-[10px] text-rose-400 text-center">Customer Name, SA, and Country are required</p>
            )}
        </div>
    );
}
