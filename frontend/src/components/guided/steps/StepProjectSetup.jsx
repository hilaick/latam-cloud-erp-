import React, { useState } from 'react';

const COUNTRIES = ['Mexico', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panama', 'Colombia', 'Ecuador', 'Peru', 'Bolivia', 'Chile', 'Argentina', 'Uruguay', 'Paraguay', 'Brazil', 'Dominican Republic', 'Cuba', 'Jamaica', 'Puerto Rico', 'Trinidad and Tobago', 'Other / TBD'];

function getRegion(country) {
  const c = (country || '').toLowerCase();
  if (c.includes('mexico') || c.includes('guatemala') || c.includes('salvador') || c.includes('honduras') || c.includes('nicaragua') || c.includes('costa') || c.includes('panama') || c.includes('dominican') || c.includes('cuba') || c.includes('jamaica') || c.includes('puerto') || c.includes('trinidad')) return 'la-north-2';
  if (c.includes('brazil')) return 'sa-brazil-1';
  return 'la-south-2';
}

export default function StepProjectSetup({ data, onChange }) {
  const [newCustomer, setNewCustomer] = useState(false);
  const d = data || {};

  const update = (key, val) => onChange({ ...d, [key]: val });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800 mb-1">Project & Customer Setup</h3>
        <p className="text-xs text-slate-500">Let's start by creating your migration project and linking it to a customer.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Project Name *</label>
            <input
              type="text"
              value={d.projectName || ''}
              onChange={e => update('projectName', e.target.value)}
              placeholder="e.g. SAP S/4HANA Migration — CODELPA"
              className={`w-full px-4 py-3 text-sm font-medium border rounded-xl outline-none transition-colors ${!d.projectName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200'}`}
            />
            {!d.projectName && <p className="text-[10px] text-rose-400 mt-1">Please enter a project name</p>}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Customer</label>
            {!newCustomer ? (
              <div className="flex gap-2">
                <select
                  value={d.customer || ''}
                  onChange={e => update('customer', e.target.value)}
                  className="flex-1 px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select existing customer...</option>
                  <option value="new">+ Create new customer</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <input type="text" value={d.newCustomerName || ''} onChange={e => update('newCustomerName', e.target.value)} placeholder="Customer name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
                <div className="flex gap-2">
                  <button onClick={() => { setNewCustomer(false); update('customer', ''); }} className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Country</label>
            <select
              value={d.country || ''}
              onChange={e => { update('country', e.target.value); update('region', getRegion(e.target.value)); }}
              className="w-full px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select country...</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">MRR (Monthly Recurring Revenue) — Optional</label>
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
        </div>

        {/* Summary card */}
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 h-fit">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Project Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Name</span>
              <span className="text-xs font-bold text-slate-700">{d.projectName || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Customer</span>
              <span className="text-xs font-bold text-slate-700">{d.customer || d.newCustomerName || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Country</span>
              <span className="text-xs font-bold text-slate-700">{d.country || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Target Region</span>
              <span className="text-xs font-bold text-blue-600">{d.region || 'la-south-2'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">MRR</span>
              <span className="text-xs font-bold text-emerald-600">{d.mrr ? `$${Number(d.mrr).toLocaleString()}` : '—'}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <i className="fas fa-info-circle mr-1"></i>
              This project will go through 5 phases: ARB → Architecture → Planning → Execution → Post-Live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
