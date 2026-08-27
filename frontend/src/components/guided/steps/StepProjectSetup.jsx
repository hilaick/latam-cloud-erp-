import React, { useState, useContext, useMemo } from 'react';
import { ERPContext } from '../../../context/ERPContext';

const COUNTRIES = ['Mexico', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panama', 'Colombia', 'Ecuador', 'Peru', 'Bolivia', 'Chile', 'Argentina', 'Uruguay', 'Paraguay', 'Brazil', 'Dominican Republic', 'Cuba', 'Jamaica', 'Puerto Rico', 'Trinidad and Tobago', 'Other / TBD'];

function getRegion(country) {
  const c = (country || '').toLowerCase();
  if (c.includes('mexico') || c.includes('guatemala') || c.includes('salvador') || c.includes('honduras') || c.includes('nicaragua') || c.includes('costa') || c.includes('panama') || c.includes('dominican') || c.includes('cuba') || c.includes('jamaica') || c.includes('puerto') || c.includes('trinidad')) return 'la-north-2';
  if (c.includes('brazil')) return 'sa-brazil-1';
  return 'la-south-2';
}

export default function StepProjectSetup({ data, onChange }) {
  const { customers, projects, handleAddProject } = useContext(ERPContext);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [created, setCreated] = useState(false);
  const d = data || {};

  const update = (key, val) => onChange({ ...d, [key]: val });

  // Auto-derive region from country
  const derivedRegion = useMemo(() => getRegion(d.country), [d.country]);

  // Existing SAs and partners from projects for auto-suggest
  const existingSAs = useMemo(() => Array.from(new Set((projects || []).map(p => p.sa).filter(Boolean))), [projects]);
  const existingPartners = useMemo(() => Array.from(new Set((projects || []).map(p => p.partner).filter(Boolean))), [projects]);

  const selectedCustomer = customers?.find(c => c.id === d.customerId);

  const handleCreate = () => {
    if (!d.projectName) return;

    // If new customer entered, create inline
    let custName = d.customerName;
    let custId = d.customerId;
    if (showNewCustomer && newCustName) {
      custName = newCustName;
    } else if (selectedCustomer) {
      custName = selectedCustomer.name;
      custId = selectedCustomer.id;
    }

    const region = selectedCustomer?.region || derivedRegion;

    // Build the project object — same shape as existing wizard
    const newProject = {
      id: `proj-${Date.now()}`,
      name: d.projectName,
      customerName: custName || '',
      customerId: custId || '',
      country: d.country || '',
      region: region,
      mrr: Number(d.mrr) || 0,
      health: 'Green',
      phase: '1_arb',
      currentPhase: 'ARB Handover',
      lifecycleState: '1_arb',
      sa: d.sa || '',
      partner: d.partner || '',
      isDeleted: false,
      isWaiting: false,
      mapperNodes: [],
      // Presales scenario tag
      migrationScenario: d.scenarioId || '',
    };

    // Use the ERP's own project creation handler — creates in DB + state
    if (handleAddProject) {
      handleAddProject(newProject);
    }

    // Store the created project ID for later steps
    update('projectId', newProject.id);
    update('region', region);
    update('customerName', custName);
    setCreated(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800 mb-1">Project & Customer Setup</h3>
        <p className="text-xs text-slate-500">Create your migration project and link it to a customer from the CRM.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Project Name *</label>
            <input
              type="text"
              value={d.projectName || ''}
              onChange={e => { update('projectName', e.target.value); setCreated(false); }}
              placeholder="e.g. SAP S/4HANA Migration — CODELPA"
              className={`w-full px-4 py-3 text-sm font-medium border rounded-xl outline-none transition-colors ${!d.projectName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200'}`}
            />
            {!d.projectName && <p className="text-[10px] text-rose-400 mt-1">Please enter a project name</p>}
          </div>

          {/* Customer from CRM */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Customer</label>
            {!showNewCustomer ? (
              <div className="flex gap-2">
                <select
                  value={d.customerId || ''}
                  onChange={e => {
                    const cust = customers?.find(c => c.id === e.target.value);
                    if (cust) {
                      update('customerId', cust.id);
                      update('customerName', cust.name);
                      update('country', cust.country || '');
                      update('region', cust.region || '');
                    } else {
                      update('customerId', '');
                      update('customerName', '');
                    }
                    setCreated(false);
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select existing customer...</option>
                  {(customers || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.region ? `(${c.region})` : ''} {c.ak ? '✓' : '⚠'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="px-3 py-3 rounded-xl text-xs font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                  <i className="fas fa-plus mr-1"></i> New
                </button>
              </div>
            ) : (
              <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <input
                  type="text"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="New customer name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                />
                <button onClick={() => { setShowNewCustomer(false); setNewCustName(''); }}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-700">
                  ← Use existing customer instead
                </button>
              </div>
            )}
            {selectedCustomer && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-500 flex gap-3">
                <span><i className="fas fa-globe mr-1"></i>{selectedCustomer.country || 'No country'}</span>
                <span><i className="fas fa-map-marker-alt mr-1"></i>{selectedCustomer.region || 'No region'}</span>
                <span><i className={`fas ${selectedCustomer.ak ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-triangle text-amber-500'} mr-1`}></i>{selectedCustomer.ak ? 'Keys configured' : 'No keys'}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Country</label>
            <select
              value={d.country || ''}
              onChange={e => { update('country', e.target.value); update('region', getRegion(e.target.value)); setCreated(false); }}
              className="w-full px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select country...</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">MRR (Monthly Recurring Revenue)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                value={d.mrr || ''}
                onChange={e => update('mrr', e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* SA and Partner — auto-suggest from existing data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Solution Architect</label>
              <input
                type="text"
                list="sa-list"
                value={d.sa || ''}
                onChange={e => update('sa', e.target.value)}
                placeholder="Auto-suggest..."
                className="w-full px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400"
              />
              <datalist id="sa-list">
                {existingSAs.map(sa => <option key={sa} value={sa} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Partner</label>
              <input
                type="text"
                list="partner-list"
                value={d.partner || ''}
                onChange={e => update('partner', e.target.value)}
                placeholder="Auto-suggest..."
                className="w-full px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400"
              />
              <datalist id="partner-list">
                {existingPartners.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={!d.projectName || created}
            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-colors ${created ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300'}`}
          >
            {created ? <><i className="fas fa-check-circle mr-1"></i> Project Created — ID: {d.projectId?.slice(-8)}</> : <><i className="fas fa-plus mr-1"></i> Create Project</>}
          </button>
        </div>

        {/* Summary card */}
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 h-fit">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Project Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-xs text-slate-500">Name</span><span className="text-xs font-bold text-slate-700">{d.projectName || '—'}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Customer</span><span className="text-xs font-bold text-slate-700">{selectedCustomer?.name || newCustName || d.customerName || '—'}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Country</span><span className="text-xs font-bold text-slate-700">{d.country || '—'}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Target Region</span><span className="text-xs font-bold text-blue-600">{d.region || derivedRegion}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">MRR</span><span className="text-xs font-bold text-emerald-600">{d.mrr ? `$${Number(d.mrr).toLocaleString()}` : '—'}</span></div>
            {d.sa && <div className="flex justify-between"><span className="text-xs text-slate-500">SA</span><span className="text-xs font-bold text-slate-700">{d.sa}</span></div>}
            {d.partner && <div className="flex justify-between"><span className="text-xs text-slate-500">Partner</span><span className="text-xs font-bold text-slate-700">{d.partner}</span></div>}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <i className="fas fa-info-circle mr-1"></i>
              Project will be created in Phase 1 (ARB Handover). The wizard will guide you through discovery, quotation, architecture, and simulation — then take you to the execution phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
