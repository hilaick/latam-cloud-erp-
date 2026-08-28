import React, { useState, useContext, useMemo, useEffect } from 'react';
import { ERPContext } from '../../context/ERPContext';
import TwoFactorModal from '../utils/TwoFactorModal';

/* ── helpers ─────────────────────────────────────────────────── */

const credentialHealth = (c) => {
  const h = {
    master:     !!(c?.ak && c?.sk),
    tier2:      !!(c?.tier2AK && c?.tier2SK),
    tier1:      !!(c?.tier1AK && c?.tier1SK),
    source:     !!(c?.source_huawei_ak && c?.source_huawei_sk),
    aws:        !!(c?.awsAK && c?.awsSK),
    azure:      !!(c?.azureTenant && c?.azureClient && c?.azureSecret),
    dataplane:  !!(c?.osDomain && c?.osUser && c?.osPassword),
  };
  h.huawei_any = h.master || h.tier2;
  h.multicloud_any = h.aws || h.azure;
  h.any = h.huawei_any || h.multicloud_any || h.dataplane;
  return h;
};

const StatusDot = ({ active, label, color }) => (
  <span className="inline-flex items-center gap-1.5" title={label}>
    <span className={`w-2 h-2 rounded-full ${active ? color : 'bg-slate-300'}`}></span>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
  </span>
);

/* ── component ───────────────────────────────────────────────── */

export default function CustomerDirectory() {
  const { projects, customers, handleAddCustomer, handleUpdateCustomer, handleDeleteCustomer } = useContext(ERPContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
  const [tabFilter, setTabFilter] = useState('all'); // 'all' | 'huawei' | 'multicloud' | 'dataplane' | 'valid' | 'invalid'
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [validationStatus, setValidationStatus] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  /* ── auto-open customer vault from URL hash ── */
  useEffect(() => {
    const h = window.location.hash.replace('#','');
    const p = new URLSearchParams(h);
    const custId = p.get('customer');
    const custName = p.get('cname');
    if (custId && custName && customers.length > 0) {
      const target = (customers || []).find(
        c => String(c.id) === custId || c.name === decodeURIComponent(custName)
      );
      if (target) {
        // Normalize booleans to empty strings (same as handleEditCustomer)
        const credentialFields = ['ak', 'sk', 'tier1AK', 'tier1SK', 'tier2AK', 'tier2SK',
          'tier3AK', 'tier3SK', 'awsAK', 'awsSK', 'source_huawei_ak', 'source_huawei_sk',
          'azureTenant', 'azureClient', 'azureSecret'];
        const normalized = { ...target };
        credentialFields.forEach(f => {
          if (typeof normalized[f] === 'boolean') normalized[f] = '';
        });
        setEditingCustomer(normalized);
        setActiveTab('vault');
      }
    }
  }, [customers]);

  /* ── derived ── */

  const enriched = useMemo(() => {
    const list = (customers || []).map(c => ({
      ...c,
      _health: credentialHealth(c),
      _keyAge: c?.key_age || {},
      _lastRotated: c?.last_rotated || {},
      _oldestMaster: c?.last_rotated?.master, // for reference
      _projectCount: (projects || []).filter(p => p?.customerId === c.id || p?.customerName === c.name).length,
    }));
    // filter
    return list.filter(c => {
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      const h = c._health;
      if (tabFilter === 'huawei')      return h.huawei_any;
      if (tabFilter === 'multicloud')  return h.multicloud_any;
      if (tabFilter === 'dataplane')   return h.dataplane;
      if (tabFilter === 'valid')       return h.any;
      if (tabFilter === 'invalid')     return !h.any;
      return true;
    });
  }, [customers, projects, searchTerm, tabFilter]);

  const stats = useMemo(() => {
    const all = (customers || []).map(c => credentialHealth(c));
    return {
      total: all.length,
      withValid: all.filter(h => h.any).length,
      withHuawei: all.filter(h => h.huawei_any).length,
      withMultiCloud: all.filter(h => h.multicloud_any).length,
      withDataPlane: all.filter(h => h.dataplane).length,
    };
  }, [customers]);

  /* ── modal actions ── */

  const openCreateModal = () => {
    setEditingCustomer({
      id: String(Date.now()), name: '', contact: '', email: '', region: 'la-south-2',
      ak: '', sk: '',
      tier1AK: '', tier1SK: '', tier2AK: '', tier2SK: '', tier3AK: '', tier3SK: '',
      awsAK: '', awsSK: '', azureTenant: '', azureClient: '', azureSecret: '', azureSubscriptionId: '', vCenterHost: '',
      osDomain: '', osUser: '', osPassword: '',
      source_huawei_ak: '', source_huawei_sk: '', source_huawei_region: '', source_huawei_project_id: '', source_huawei_domain_id: '',
    });
    setIsCreating(true);
    setValidationStatus({});
    setActiveTab('general');
  };

  const handleEditCustomer = (customer) => {
    // Normalize boolean credential indicators back to empty strings
    const credentialFields = ['ak', 'sk', 'tier1AK', 'tier1SK', 'tier2AK', 'tier2SK',
      'tier3AK', 'tier3SK', 'awsAK', 'awsSK', 'source_huawei_ak', 'source_huawei_sk',
      'azureTenant', 'azureClient', 'azureSecret'];
    const normalized = { ...customer };
    credentialFields.forEach(f => {
      if (typeof normalized[f] === 'boolean') normalized[f] = '';
    });
    setEditingCustomer(normalized);
    setIsCreating(false);
    setValidationStatus({});
    setActiveTab('vault');
  };

  const handleSave = () => {
    if (!editingCustomer.name) return alert('Customer Name is required.');
    if (isCreating) handleAddCustomer(editingCustomer);
    else handleUpdateCustomer(editingCustomer);
    setEditingCustomer(null);
    setIsCreating(false);
  };

  const validateKeys = async (provider) => {
    setIsValidating(true);
    try {
      const token = sessionStorage.getItem('hermes_access_token');
      // Huawei credential types use the new gateway validate-credential endpoint
      if (['master', 'source', 'tier1', 'tier2', 'tier3'].includes(provider)) {
        const res = await fetch('/api/gateway/validate-credential', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ customer_id: editingCustomer.id, credential_type: provider }),
        });
        const data = await res.json();
        setValidationStatus(prev => ({ ...prev, [provider]: data }));
      } else {
        const bodyData = provider === 'AWS'
          ? { provider: 'AWS', ak: editingCustomer.awsAK, sk: editingCustomer.awsSK }
          : { provider: 'Azure', azureTenant: editingCustomer.azureTenant, azureClient: editingCustomer.azureClient, azureSecret: editingCustomer.azureSecret };
        const res = await fetch('/api/vault/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(bodyData),
        });
        const data = await res.json();
        setValidationStatus(prev => ({ ...prev, [provider]: data }));
      }
    } catch (err) {
      setValidationStatus(prev => ({ ...prev, [provider]: { valid: false, error: err.message } }));
    } finally {
      setIsValidating(false);
    }
  };

  const _xconsole = ['c','o','n','s','o','l','e','2','0','2','6'].join(''); // cache buster
  const openIAMConsole = (provider) => {
    // Map region to console URL — Huawei has per-region console endpoints
    const consoleUrl = `https://console.huaweicloud.com/iam/?region=${region}#/iam/users`;
    window.open(consoleUrl, '_blank', 'noopener,noreferrer');
  };

  const syncKeys = async (provider) => {
    const fieldMap = {
      master:      { ak: 'ak',               sk: 'sk',               tier: 'master' },
      tier2:       { ak: 'tier2AK',          sk: 'tier2SK',          tier: 'tier2' },
      source:      { ak: 'source_huawei_ak', sk: 'source_huawei_sk', tier: 'source_huawei' },
      aws:         { ak: 'awsAK',            sk: 'awsSK',            tier: 'aws' },
      tier1:       { ak: 'tier1AK',          sk: 'tier1SK',          tier: 'tier1' },
      tier3:       { ak: 'tier3AK',          sk: 'tier3SK',          tier: 'tier3' },
    };
    const f = fieldMap[provider];
    if (!f) return;
    const ak = typeof editingCustomer[f.ak] === 'string' ? editingCustomer[f.ak] : '';
    const sk = typeof editingCustomer[f.sk] === 'string' ? editingCustomer[f.sk] : '';
    if (!ak || !sk) return alert(`Enter new ${provider} AK/SK first.`);
    if (ak.length < 10 || sk.length < 10) return alert('AK/SK look too short to be valid.');
    setIsValidating(true);
    try {
      const token = sessionStorage.getItem('hermes_access_token');
      const res = await fetch(`/api/erp/customers/${editingCustomer.id}/sync-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tier: f.tier, ak, sk, reason: 'Console rotation sync' }),
      });
      const data = await res.json();
      if (data.success) {
        setValidationStatus(prev => ({ ...prev, [provider]: { status: 'valid', message: `Synced & validated ${data.timestamp}`, login_id_last4: data.login_id_last4 } }));
      } else {
        setValidationStatus(prev => ({ ...prev, [provider]: { status: 'invalid', error: data.error } }));
        alert(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      setValidationStatus(prev => ({ ...prev, [provider]: { status: 'invalid', error: err.message } }));
      alert(`Sync error: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const initiateDeleteCustomer = (customerId) => {
    const customer = customers.find(c => c?.id === customerId);
    if (!customer) return;
    const attached = (projects || []).filter(p => p?.customerId === customerId || p?.customerName === customer.name);
    if (attached.length > 0) {
      alert(`Cannot delete "${customer.name}". ${attached.length} active project(s) attached. Reassign or delete projects first.`);
      return;
    }
    setCustomerToDelete(customer);
  };

  const executeDelete = () => {
    if (!customerToDelete) return;
    handleDeleteCustomer(customerToDelete.id);
    setCustomerToDelete(null);
  };

  /* ── tab bar filters ── */

  const filterTabs = [
    { key: 'all',        label: 'All',       icon: 'fa-building',      count: stats.total },
    { key: 'valid',      label: 'Active',    icon: 'fa-check-circle',  count: stats.withValid,  color: 'emerald' },
    { key: 'huawei',     label: 'Huawei',    icon: 'fa-cloud',         count: stats.withHuawei,  color: 'blue' },
    { key: 'multicloud', label: 'Multi-Cloud',icon: 'fa-network-wired',count: stats.withMultiCloud, color: 'amber' },
    { key: 'dataplane',  label: 'Data Plane',icon: 'fa-terminal',      count: stats.withDataPlane, color: 'purple' },
    { key: 'invalid',    label: 'No Creds',  icon: 'fa-exclamation-triangle', count: stats.total - stats.withValid, color: 'rose' },
  ];

  /* ── render ── */

  return (
    <div className="animate-fade-in min-h-screen bg-slate-900">
      {/* ── background decoration ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-700/15 to-purple-700/10 blur-3xl"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-emerald-700/12 to-cyan-700/10 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8 pb-12">

        {/* ── brand header ── */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 flex items-center justify-center">
              <i className="fas fa-building text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Customer Directory & Secure Vault</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Multi-Tier Least Privilege Credential Management</p>
            </div>
          </div>
        </div>

        {/* ── stats bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Customers', value: stats.total, color: 'slate' },
            { label: 'Active (Has Creds)', value: stats.withValid, color: 'emerald' },
            { label: 'Huawei Tiers', value: stats.withHuawei, color: 'blue' },
            { label: 'Multi-Cloud', value: stats.withMultiCloud, color: 'amber' },
            { label: 'Data Plane', value: stats.withDataPlane, color: 'purple' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700/50 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`text-xl font-black text-${s.color}-400`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── controls bar: search + view toggle + register ── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* view toggle */}
          <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <i className="fas fa-th-large mr-1.5"></i> Cards
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <i className="fas fa-list mr-1.5"></i> List
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/25 transition-all"
          >
            <i className="fas fa-plus mr-2"></i> Register Customer
          </button>
        </div>

        {/* ── credential tab filters ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTabFilter(t.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${tabFilter === t.key
                ? 'bg-slate-700 border-slate-600 text-white shadow'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <i className={`fas ${t.icon} ${t.color ? `text-${t.color}-400` : ''}`}></i>
              {t.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tabFilter === t.key ? 'bg-white/10 text-white' : 'bg-slate-700/50 text-slate-500'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── main content: cards or list ── */}
        {enriched.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 flex items-center justify-center">
              <i className="fas fa-ghost text-slate-600 text-3xl"></i>
            </div>
            <h3 className="text-lg font-black text-slate-400 mb-2">No customers found</h3>
            <p className="text-xs text-slate-500">{tabFilter !== 'all' ? 'Try changing the filter or ' : ''}Register your first customer to get started.</p>
            {tabFilter !== 'all' && (
              <button onClick={() => setTabFilter('all')} className="mt-4 text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest">
                <i className="fas fa-arrow-left mr-1"></i> Show all customers
              </button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* ── CARD VIEW ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {enriched.map(c => {
              const h = c._health;
              const accentColor = h.any ? 'from-emerald-500 to-blue-500' : 'from-slate-600 to-slate-700';
              return (
                <div key={c.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-slate-500 transition-all group">
                  {/* colored accent top bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${accentColor}`}></div>

                  <div className="p-5">
                    {/* top row: name + actions */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-white text-base truncate">{c.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-slate-400">{c.region || 'la-south-2'}</span>
                          {c._projectCount > 0 && (
                            <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                              {c._projectCount} project{c._projectCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditCustomer(c)} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 flex items-center justify-center transition-colors" title="Edit credentials">
                          <i className="fas fa-shield-alt text-xs"></i>
                        </button>
                        <button onClick={() => initiateDeleteCustomer(c.id)} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors" title="Delete">
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>

                    {/* credential status matrix */}
                    <div className="space-y-3 pt-3 border-t border-slate-700/50">
                      {/* Huawei Tiers */}
                      <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          <i className="fas fa-cloud text-blue-400 mr-1"></i> Huawei Tiers
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusDot active={h.master} label="Master" color="bg-rose-500" />
                          <StatusDot active={h.tier2} label="Tier 2" color="bg-emerald-500" />
                          <StatusDot active={h.tier1} label="Tier 1" color="bg-amber-500" />
                          <StatusDot active={h.source} label="Source" color="bg-cyan-500" />
                        </div>
                      </div>

                      {/* Multi-Cloud */}
                      <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          <i className="fas fa-network-wired text-amber-400 mr-1"></i> Multi-Cloud
                        </div>
                        <div className="flex gap-2">
                          <StatusDot active={h.aws} label="AWS" color="bg-orange-500" />
                          <StatusDot active={h.azure} label="Azure" color="bg-blue-500" />
                        </div>
                      </div>

                      {/* Data Plane */}
                      <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          <i className="fas fa-terminal text-purple-400 mr-1"></i> Data Plane
                        </div>
                        <StatusDot active={h.dataplane} label="OS / VM" color="bg-purple-500" />
                      </div>
                    </div>

                    {/* Key age / last rotated */}
                    {(c._keyAge?.master != null || c._keyAge?.tier2 != null) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {c._keyAge?.master != null && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${c._keyAge.master > 90 ? 'bg-rose-500/10 text-rose-400' : c._keyAge.master > 30 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            <i className="fas fa-key" /> Master {c._keyAge.master}d
                          </span>
                        )}
                        {c._keyAge?.tier2 != null && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${c._keyAge.tier2 > 90 ? 'bg-rose-500/10 text-rose-400' : c._keyAge.tier2 > 30 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            <i className="fas fa-key" /> T2 {c._keyAge.tier2}d
                          </span>
                        )}
                      </div>
                    )}

                    {/* overall status badge */}
                    <div className="mt-4 pt-3 border-t border-slate-700/50">
                      {h.any ? (
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active — Credentials Configured
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          Inactive — No Credentials
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Customer</th>
                  <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Region</th>
                  <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden lg:table-cell">Projects</th>
                  <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">Huawei Tiers</th>
                  <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell">Multi-Cloud</th>
                  <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden xl:table-cell">Data Plane</th>
                  <th className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {enriched.map(c => {
                  const h = c._health;
                  return (
                    <tr key={c.id} className="hover:bg-slate-750 transition-colors group">
                      {/* Status */}
                      <td className="px-5 py-4">
                        {h.any ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-slate-600"></span> None
                          </span>
                        )}
                      </td>
                      {/* Customer name */}
                      <td className="px-5 py-4">
                        <div className="font-black text-white text-sm">{c.name}</div>
                      </td>
                      {/* Region */}
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-xs font-bold text-slate-400">{c.region || 'la-south-2'}</span>
                      </td>
                      {/* Projects */}
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {c._projectCount > 0 ? (
                          <span className="text-xs font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">{c._projectCount}</span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      {/* Huawei Tiers */}
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <StatusDot active={h.master} label="" color="bg-rose-500" />
                          <StatusDot active={h.tier2} label="" color="bg-emerald-500" />
                          <StatusDot active={h.tier1} label="" color="bg-amber-500" />
                          <StatusDot active={h.source} label="" color="bg-cyan-500" />
                        </div>
                      </td>
                      {/* Multi-Cloud */}
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <StatusDot active={h.aws} label="" color="bg-orange-500" />
                          <StatusDot active={h.azure} label="" color="bg-blue-500" />
                        </div>
                      </td>
                      {/* Data Plane */}
                      <td className="px-5 py-4 hidden xl:table-cell">
                        <StatusDot active={h.dataplane} label="" color="bg-purple-500" />
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEditCustomer(c)} className="w-7 h-7 rounded-lg bg-slate-700/50 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 flex items-center justify-center transition-colors" title="Edit credentials">
                            <i className="fas fa-shield-alt text-[11px]"></i>
                          </button>
                          <button onClick={() => initiateDeleteCustomer(c.id)} className="w-7 h-7 rounded-lg bg-slate-700/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors" title="Delete">
                            <i className="fas fa-trash text-[11px]"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL (unchanged structure) ── */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col border border-slate-700 animate-slide-up max-h-[90vh]">
            <div className="bg-slate-900 px-8 py-5 rounded-t-2xl flex justify-between items-center text-white shrink-0">
              <div>
                <h3 className="font-black text-xl text-blue-400">
                  <i className="fas fa-user-shield mr-3"></i>Customer Profile & Vault
                  <span className="text-white text-sm font-bold ml-3 align-middle">— {editingCustomer?.name || 'Unnamed'}</span>
                </h3>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>

            {/* TABS */}
            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto pt-2 px-4">
              <button onClick={() => setActiveTab('general')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>General Info</button>
              <button onClick={() => setActiveTab('vault')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'vault' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-cloud mr-2"></i> Huawei Tiers</button>
              <button onClick={() => setActiveTab('multicloud')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'multicloud' ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-network-wired mr-2"></i> Multi-Cloud</button>
              <button onClick={() => setActiveTab('os')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'os' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-terminal mr-2"></i> Data Plane</button>
              <button onClick={() => setActiveTab('projects')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'projects' ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-project-diagram mr-2"></i> Projects</button>
            </div>

            {/* CONTENT */}
            <div className="p-8 overflow-y-auto bg-slate-50 space-y-6 flex-1 custom-scrollbar">
              {activeTab === 'general' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Company Name *</label>
                      <input type="text" value={editingCustomer.name} onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value.toUpperCase() })} style={{ textTransform: 'uppercase' }} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500" placeholder="CLINICA UNION MEDICA" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Default Cloud Region</label>
                      <select value={editingCustomer.region || 'la-south-2'} onChange={e => setEditingCustomer({ ...editingCustomer, region: e.target.value })} className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-white cursor-pointer">
                        <optgroup label="Latin America">
                          <option value="la-south-2">Santiago, Chile (la-south-2)</option>
                          <option value="la-north-2">Mexico City, Mexico (la-north-2)</option>
                          <option value="sa-brazil-1">São Paulo, Brazil (sa-brazil-1)</option>
                        </optgroup>
                        <optgroup label="Africa">
                          <option value="af-south-1">Johannesburg, South Africa (af-south-1)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'vault' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 relative shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-black text-rose-800 text-sm">Master / Full Admin Key</h4>
                      {(editingCustomer.ak && editingCustomer.sk) && (
                        <span className="bg-rose-100 text-rose-700 text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                          <i className="fas fa-check-circle mr-0.5"></i>Configured
                        </span>
                      )}
                      {validationStatus['master'] && (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black ${
                          validationStatus['master'].status === 'valid' ? 'bg-emerald-100 text-emerald-700' :
                          validationStatus['master'].status === 'invalid' ? 'bg-rose-100 text-rose-700' :
                          validationStatus['master'].status === 'missing' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <i className={`fas ${validationStatus['master'].status === 'valid' ? 'fa-shield-check' : 'fa-exclamation-triangle'} mr-0.5`}></i>
                          {validationStatus['master'].status === 'valid' ? `…${validationStatus['master'].login_id_last4 || '????'}` : validationStatus['master'].status || '?'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.ak || ''} onChange={e => setEditingCustomer({ ...editingCustomer, ak: e.target.value })} className="w-full p-2.5 border border-rose-300 rounded-lg text-xs font-mono outline-none focus:border-rose-500 bg-white" /></div>
                      <div><label className="block text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.sk || ''} onChange={e => setEditingCustomer({ ...editingCustomer, sk: e.target.value })} className="w-full p-2.5 border border-rose-300 rounded-lg text-xs font-mono outline-none focus:border-rose-500 bg-white" /></div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => openIAMConsole('master')} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-black uppercase tracking-widest transition-colors">
                        <i className="fas fa-external-link-alt mr-1"></i> Open Console
                      </button>
                      <button onClick={() => syncKeys('master')} disabled={isValidating || !editingCustomer.ak || !editingCustomer.sk} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                        {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Syncing...</> : <><i className="fas fa-cloud-upload-alt mr-1"></i> Sync & Validate</>}
                      </button>
                      <button onClick={() => validateKeys('master')} disabled={isValidating || !editingCustomer.ak || !editingCustomer.sk} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                        {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Validating...</> : <><i className="fas fa-shield-check mr-1"></i> Validate Master Keys</>}
                      </button>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 relative shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-black text-emerald-800 text-sm">Tier 2: Sandbox EPS Admin Key</h4>
                      {(editingCustomer.tier2AK && editingCustomer.tier2SK) && (
                        <span className="bg-emerald-100 text-emerald-700 text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                          <i className="fas fa-check-circle mr-0.5"></i>Configured
                        </span>
                      )}
                      {validationStatus['tier2'] && (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black ${
                          validationStatus['tier2'].status === 'valid' ? 'bg-emerald-100 text-emerald-700' :
                          validationStatus['tier2'].status === 'invalid' ? 'bg-rose-100 text-rose-700' :
                          validationStatus['tier2'].status === 'missing' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <i className={`fas ${validationStatus['tier2'].status === 'valid' ? 'fa-shield-check' : 'fa-exclamation-triangle'} mr-0.5`}></i>
                          {validationStatus['tier2'].status === 'valid' ? `…${validationStatus['tier2'].login_id_last4 || '????'}` : validationStatus['tier2'].status || '?'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Access Key (AK)</label><input type="password" value={editingCustomer.tier2AK || ''} onChange={e => setEditingCustomer({ ...editingCustomer, tier2AK: e.target.value })} className="w-full p-2.5 border border-emerald-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500 bg-white" /></div>
                      <div><label className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Secret Key (SK)</label><input type="password" value={editingCustomer.tier2SK || ''} onChange={e => setEditingCustomer({ ...editingCustomer, tier2SK: e.target.value })} className="w-full p-2.5 border border-emerald-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-500 bg-white" /></div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => openIAMConsole('tier2')} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-black uppercase tracking-widest transition-colors">
                        <i className="fas fa-external-link-alt mr-1"></i> Open Console
                      </button>
                      <button onClick={() => syncKeys('tier2')} disabled={isValidating || !editingCustomer.tier2AK || !editingCustomer.tier2SK} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                        {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Syncing...</> : <><i className="fas fa-cloud-upload-alt mr-1"></i> Sync & Validate</>}
                      </button>
                      <button onClick={() => validateKeys('tier2')} disabled={isValidating || !editingCustomer.tier2AK || !editingCustomer.tier2SK} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                        {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Validating...</> : <><i className="fas fa-shield-check mr-1"></i> Validate Tier 2 Keys</>}
                      </button>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 relative shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-black text-blue-800 text-sm">
                        <i className="fas fa-exchange-alt text-blue-500 mr-2"></i>
                        Source Huawei Cloud (Cross-Account/Region)
                        <span className="ml-2 bg-blue-100 text-blue-700 text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest">Migration Only</span>
                      </h4>
                      {validationStatus['source'] && (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black ${
                          validationStatus['source'].status === 'valid' ? 'bg-emerald-100 text-emerald-700' :
                          validationStatus['source'].status === 'invalid' ? 'bg-rose-100 text-rose-700' :
                          validationStatus['source'].status === 'missing' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <i className={`fas ${validationStatus['source'].status === 'valid' ? 'fa-shield-check' : 'fa-exclamation-triangle'} mr-0.5`}></i>
                          {validationStatus['source'].status === 'valid' ? `…${validationStatus['source'].login_id_last4 || '????'}` : validationStatus['source'].status || '?'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-600 mb-3">Use these credentials for Huawei Cloud → Huawei Cloud migrations (different account/region)</p>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div><label className="block text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">Source Access Key (AK)</label><input type="password" value={editingCustomer.source_huawei_ak || ''} onChange={e => setEditingCustomer({ ...editingCustomer, source_huawei_ak: e.target.value })} className="w-full p-2.5 border border-blue-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500 bg-white" /></div>
                      <div><label className="block text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">Source Secret Key (SK)</label><input type="password" value={editingCustomer.source_huawei_sk || ''} onChange={e => setEditingCustomer({ ...editingCustomer, source_huawei_sk: e.target.value })} className="w-full p-2.5 border border-blue-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500 bg-white" /></div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
                        <div><label className="block text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">Source Region</label><input type="text" value={editingCustomer.source_huawei_region || ''} onChange={e => setEditingCustomer({ ...editingCustomer, source_huawei_region: e.target.value })} placeholder="ap-southeast-3" className="w-full p-2.5 border border-blue-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500 bg-white" /></div>
                        <div><label className="block text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">Source Project ID</label><input type="text" value={editingCustomer.source_huawei_project_id || ''} onChange={e => setEditingCustomer({ ...editingCustomer, source_huawei_project_id: e.target.value })} placeholder="Optional" className="w-full p-2.5 border border-blue-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500 bg-white" /></div>
                        <div><label className="block text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">Source Domain ID</label><input type="text" value={editingCustomer.source_huawei_domain_id || ''} onChange={e => setEditingCustomer({ ...editingCustomer, source_huawei_domain_id: e.target.value })} placeholder="Optional" className="w-full p-2.5 border border-blue-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500 bg-white" /></div>
                      </div>
                      <div className="flex gap-2 whitespace-nowrap">
                        <button onClick={() => openIAMConsole('source')} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-black uppercase tracking-widest transition-colors">
                          <i className="fas fa-external-link-alt mr-1"></i> Open Console
                        </button>
                        <button onClick={() => syncKeys('source')} disabled={isValidating || !editingCustomer.source_huawei_ak || !editingCustomer.source_huawei_sk} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                          {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Syncing...</> : <><i className="fas fa-cloud-upload-alt mr-1"></i> Sync & Validate</>}
                        </button>
                        <button onClick={() => validateKeys('source')} disabled={isValidating || !editingCustomer.source_huawei_ak || !editingCustomer.source_huawei_sk} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                          {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Validating...</> : <><i className="fas fa-shield-check mr-1"></i> Validate Source Keys</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'multicloud' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                      <h4 className="font-black text-slate-800 text-sm"><i className="fab fa-aws text-orange-500 mr-2"></i>AWS Control Plane</h4>
                      {validationStatus['AWS'] && (
                        <div className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${validationStatus['AWS'].valid ? (validationStatus['AWS'].level === 'Admin' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200') : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {validationStatus['AWS'].valid ? <><i className="fas fa-check-circle mr-1"></i> Verified: {validationStatus['AWS'].level}</> : <><i className="fas fa-times-circle mr-1"></i> Invalid Keys</>}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Access Key ID</label><input type="password" value={editingCustomer.awsAK || ''} onChange={e => setEditingCustomer({ ...editingCustomer, awsAK: e.target.value })} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-orange-500" /></div>
                      <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Secret Access Key</label><input type="password" value={editingCustomer.awsSK || ''} onChange={e => setEditingCustomer({ ...editingCustomer, awsSK: e.target.value })} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-orange-500" /></div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => openIAMConsole('aws')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-black uppercase tracking-widest transition-colors">
                        <i className="fas fa-external-link-alt mr-1"></i> Open Console
                      </button>
                      <button onClick={() => syncKeys('aws')} disabled={isValidating || !editingCustomer.awsAK || !editingCustomer.awsSK} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                        {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Syncing...</> : <><i className="fas fa-cloud-upload-alt mr-1"></i> Sync & Validate</>}
                      </button>
                      <button onClick={() => validateKeys('AWS')} disabled={isValidating || !editingCustomer.awsAK || !editingCustomer.awsSK} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                        {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Checking...</> : <><i className="fas fa-shield-alt mr-1"></i> Assess Permissions</>}
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                      <h4 className="font-black text-slate-800 text-sm"><i className="fab fa-windows text-blue-500 mr-2"></i>Azure Control Plane</h4>
                      {validationStatus['Azure'] && (
                        <div className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${validationStatus['Azure'].valid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {validationStatus['Azure'].valid ? <><i className="fas fa-check-circle mr-1"></i> Verified: {validationStatus['Azure'].level}</> : <><i className="fas fa-times-circle mr-1"></i> Invalid Keys</>}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tenant ID</label><input type="password" value={editingCustomer.azureTenant || ''} onChange={e => setEditingCustomer({ ...editingCustomer, azureTenant: e.target.value })} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-blue-500" /></div>
                      <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Subscription ID</label><input type="text" value={editingCustomer.azureSubscriptionId || ''} onChange={e => setEditingCustomer({ ...editingCustomer, azureSubscriptionId: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-blue-500" /></div>
                      <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Client ID</label><input type="password" value={editingCustomer.azureClient || ''} onChange={e => setEditingCustomer({ ...editingCustomer, azureClient: e.target.value })} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-blue-500" /></div>
                      <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Client Secret</label><input type="password" value={editingCustomer.azureSecret || ''} onChange={e => setEditingCustomer({ ...editingCustomer, azureSecret: e.target.value })} className="w-full p-2.5 border rounded-lg text-xs font-mono outline-none focus:border-blue-500" /></div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => validateKeys('Azure')} disabled={isValidating || !editingCustomer.azureTenant || !editingCustomer.azureClient || !editingCustomer.azureSecret} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors">
                        {isValidating ? <><i className="fas fa-spinner fa-spin mr-1"></i> Checking...</> : <><i className="fas fa-shield-alt mr-1"></i> Assess Permissions</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'os' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 shadow-sm">
                    <h4 className="font-black text-indigo-900 text-sm mb-1"><i className="fas fa-terminal text-indigo-500 mr-2"></i>Local OS / Data Plane</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Domain</label><input type="text" value={editingCustomer.osDomain || ''} onChange={e => setEditingCustomer({ ...editingCustomer, osDomain: e.target.value })} className="w-full p-3 border border-indigo-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500" /></div>
                      <div><label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Username</label><input type="text" value={editingCustomer.osUser || ''} onChange={e => setEditingCustomer({ ...editingCustomer, osUser: e.target.value })} className="w-full p-3 border border-indigo-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500" /></div>
                      <div><label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Password</label><input type="password" value={editingCustomer.osPassword || ''} onChange={e => setEditingCustomer({ ...editingCustomer, osPassword: e.target.value })} className="w-full p-3 border border-indigo-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500" /></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm">
                    <h4 className="font-black text-slate-800 text-sm mb-4">
                      <i className="fas fa-project-diagram text-orange-500 mr-2"></i>
                      Projects associated with {editingCustomer.name}
                    </h4>
                    {(() => {
                      const customerProjects = (projects || []).filter(p => 
                        (p?.customerId && String(p.customerId) === String(editingCustomer.id)) || 
                        (p?.customerName && p.customerName === editingCustomer.name)
                      );
                      return customerProjects.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <i className="fas fa-folder-open text-3xl mb-2 opacity-30"></i>
                          <p className="text-xs font-bold uppercase">No projects associated with this customer yet</p>
                          <p className="text-[10px] mt-1">Projects appear here after quotation upload or creation</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {customerProjects.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-orange-300 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-black">{p.name ? p.name.charAt(0).toUpperCase() : '?'}</div>
                                <div>
                                  <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                    {p.name || 'Unnamed Project'}
                                    {p.status === 'cancelled' && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">Cancelled</span>}
                                    {p.status === 'suspended' && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 border border-amber-200">Suspended</span>}
                                    {p.status === 'transferred' && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 border border-indigo-200">Transferred</span>}
                                  </div>
                                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                                    {p.lifecycleState || 'draft'} · {p.customerName || editingCustomer.name}
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => { setEditingCustomer(null); window.location.hash = `#/project/${p.id}`; }}
                                className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-widest hover:underline"
                              >
                                <i className="fas fa-external-link-alt mr-1"></i> Open Project
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingCustomer(null)} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-8 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"><i className="fas fa-save mr-2"></i> Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA */}
      {customerToDelete && (
        <TwoFactorModal
          actionName={`Delete Customer Vault: ${customerToDelete.name}`}
          onConfirm={executeDelete}
          onCancel={() => setCustomerToDelete(null)}
        />
      )}
    </div>
  );
}
