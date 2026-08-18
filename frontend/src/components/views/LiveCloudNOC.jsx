import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

const badge = (label, color) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-${color}-400/10 text-${color}-400 border border-${color}-400/20`}>{label}</span>
);

export default function LiveCloudNOC() {
  const { customers } = useContext(ERPContext);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [inventory, setInventory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanMode, setScanMode] = useState('target'); // 'target' (Master AK/SK) | 'source' (Cross-Account)

  const activeCustomer = customers?.find(c => String(c.id) === selectedCustomerId);

  const fetchInventory = async () => {
    if (!activeCustomer) {
      alert('Please select a customer first.');
      return;
    }

    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('hermes_access_token');
      if (!token) throw new Error('Authentication required. Please log in again.');

      const body = {
        customer_id: activeCustomer.id,
        region: activeCustomer.region || 'la-south-2',
        provider: 'Huawei',
      };

      // When in source mode, include source region override
      if (scanMode === 'source') {
        if (!activeCustomer.source_huawei_ak || !activeCustomer.source_huawei_sk) {
          alert('Source Huawei Cloud credentials are not configured for this customer.');
          setIsLoading(false);
          return;
        }
        body.region = activeCustomer.source_huawei_region || 'la-south-2';
        body.use_source_credentials = true;
      }

      const res = await fetch('/api/cloud/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.status === 401) throw new Error('Authentication failed. Please log in again.');

      const data = await res.json();
      if (data.success) {
        setInventory({ ...data.inventory, is_source_discovery: data.is_source_discovery, region: data.region });
      } else {
        alert('API Error: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── helpers ── */
  const hasMasterCreds = activeCustomer?.ak && activeCustomer?.sk;
  const hasSourceCreds = activeCustomer?.source_huawei_ak && activeCustomer?.source_huawei_sk;
  const scanLabel = scanMode === 'source' ? 'Source Discovery (Cross-Account)' : 'Target Monitoring (Master AK/SK)';

  /* ── render ── */
  return (
    <div className="animate-fade-in min-h-screen bg-slate-900">
      {/* background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-700/10 to-cyan-700/8 blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-emerald-700/8 to-blue-700/10 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-[1800px] mx-auto px-6 py-8 pb-12 space-y-6">

        {/* brand header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <i className="fas fa-tv text-white"></i>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Cloud Infrastructure Scanner</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target & Source Infrastructure Discovery</p>
          </div>
        </div>

        {/* control panel */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* customer selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">-- Choose Account --</option>
                {(customers || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* scan mode toggle */}
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
              <button
                onClick={() => setScanMode('target')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'target' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <i className="fas fa-cloud mr-1.5"></i> Target (Master AK/SK)
              </button>
              <button
                onClick={() => setScanMode('source')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'source' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <i className="fas fa-exchange-alt mr-1.5"></i> Source (Cross-Account)
              </button>
            </div>

            {/* scan button */}
            <button
              onClick={fetchInventory}
              disabled={!activeCustomer || isLoading}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-500/25 transition-all disabled:cursor-not-allowed"
            >
              {isLoading
                ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning...</>
                : <><i className="fas fa-search mr-2"></i> Run Cloud Scanner</>}
            </button>
          </div>

          {/* credential status row */}
          {activeCustomer && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-700">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Credentials:</span>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${hasMasterCreds ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${hasMasterCreds ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                Master AK/SK {hasMasterCreds ? 'Configured' : 'Missing'}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${hasSourceCreds ? 'text-purple-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${hasSourceCreds ? 'bg-purple-500' : 'bg-slate-600'}`}></span>
                Source AK/SK {hasSourceCreds ? 'Configured' : 'Missing'}
              </span>
              <span className="ml-auto text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-lg">
                <i className="fas fa-satellite mr-1"></i> Active mode: {scanMode === 'source' ? 'Source Discovery' : 'Target Monitoring'}
              </span>
            </div>
          )}
        </div>

        {/* empty / no creds states */}
        {!activeCustomer && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 flex items-center justify-center">
              <i className="fas fa-shield-alt text-slate-600 text-3xl"></i>
            </div>
            <h3 className="text-lg font-black text-slate-400 mb-2">No customer selected</h3>
            <p className="text-xs text-slate-500">Select a customer from the dropdown to access their cloud environment.</p>
          </div>
        )}

        {activeCustomer && scanMode === 'target' && !hasMasterCreds && (
          <div className="p-5 bg-rose-400/5 border border-rose-400/20 rounded-xl flex items-center gap-3">
            <i className="fas fa-exclamation-triangle text-rose-400 text-lg"></i>
            <div>
              <div className="text-xs font-black text-rose-300 uppercase tracking-wider">Master AK/SK Missing</div>
              <div className="text-[10px] text-rose-400/70">This customer does not have Master Admin keys vaulted. Target monitoring will fail. Configure keys in Customer Directory → Huawei Tiers.</div>
            </div>
          </div>
        )}

        {activeCustomer && scanMode === 'source' && !hasSourceCreds && (
          <div className="p-5 bg-amber-400/5 border border-amber-400/20 rounded-xl flex items-center gap-3">
            <i className="fas fa-exclamation-triangle text-amber-400 text-lg"></i>
            <div>
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider">Source AK/SK Missing</div>
              <div className="text-[10px] text-amber-400/70">Source Huawei Cloud credentials not configured. Source discovery requires Cross-Account keys in Customer Directory → Huawei Tiers.</div>
            </div>
          </div>
        )}

        {/* inventory panels */}
        {inventory && (
          <>
            {/* scan metadata */}
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                <i className="fas fa-map-marker-alt text-blue-400 mr-1"></i> Region: {inventory.region || '—'}
              </span>
              <span className="bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                <i className={`fas fa-${inventory.is_source_discovery ? 'exchange-alt text-purple-400' : 'cloud text-cyan-400'} mr-1`}></i>
                {inventory.is_source_discovery ? 'Source Discovery' : 'Target Monitoring'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Compute (ECS) */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[520px]">
                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-black text-sm text-white"><i className="fas fa-server text-blue-400 mr-2"></i> Compute (ECS)</h3>
                  <span className="bg-blue-400/10 text-blue-400 px-2.5 py-0.5 rounded-lg font-black text-[11px]">{(inventory.compute || []).length}</span>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-850 text-[9px] uppercase text-slate-500 sticky top-0">
                      <tr><th className="p-3">Name</th><th className="p-3">Flavor</th><th className="p-3">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(inventory.compute || []).map(s => (
                        <tr key={s.id} className="hover:bg-slate-750">
                          <td className="p-3 text-xs font-bold text-white">{s.name}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">{s.flavor?.id || s.vcpu ? `${s.vcpu}vCPU / ${s.ram_gb}GB` : '—'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${s.status === 'ACTIVE' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{s.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Networks (VPC) */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[520px]">
                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-black text-sm text-white"><i className="fas fa-network-wired text-purple-400 mr-2"></i> Networks (VPC)</h3>
                  <span className="bg-purple-400/10 text-purple-400 px-2.5 py-0.5 rounded-lg font-black text-[11px]">{(inventory.network || []).filter(n => n.type === 'VPC').length}</span>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-850 text-[9px] uppercase text-slate-500 sticky top-0">
                      <tr><th className="p-3">Name</th><th className="p-3">CIDR</th><th className="p-3">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(inventory.network || []).filter(n => n.type === 'VPC').map(v => (
                        <tr key={v.id} className="hover:bg-slate-750">
                          <td className="p-3 text-xs font-bold text-white">{v.name}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">{v.cidr}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-400/10 text-emerald-400">{v.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Databases (RDS) */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[520px]">
                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-black text-sm text-white"><i className="fas fa-database text-rose-400 mr-2"></i> Databases (RDS)</h3>
                  <span className="bg-rose-400/10 text-rose-400 px-2.5 py-0.5 rounded-lg font-black text-[11px]">{(inventory.databases || []).length}</span>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-850 text-[9px] uppercase text-slate-500 sticky top-0">
                      <tr><th className="p-3">Name</th><th className="p-3">Engine</th><th className="p-3">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {(inventory.databases || []).map(r => (
                        <tr key={r.id} className="hover:bg-slate-750">
                          <td className="p-3 text-xs font-bold text-white">{r.name}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">{r.engine || r.datastore?.type || '—'}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-400/10 text-emerald-400">{r.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EIP Cost Leakage */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[520px]">
                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-black text-sm text-white"><i className="fas fa-money-bill-wave text-amber-400 mr-2"></i> EIP Leakage</h3>
                  <span className="bg-amber-400/10 text-amber-400 px-2.5 py-0.5 rounded-lg font-black text-[11px]">{(inventory.network || []).filter(n => n.type === 'EIP').length} EIPs</span>
                </div>
                <div className="flex-1 overflow-auto">
                  {((inventory.network || []).filter(n => n.type === 'EIP')).length === 0 ? (
                    <div className="p-8 text-center">
                      <i className="fas fa-check-circle text-2xl mb-3 text-slate-600"></i>
                      <p className="text-xs font-bold text-slate-400">No Elastic IPs found</p>
                      <p className="text-[10px] text-slate-500 mt-1">All EIPs are properly bound</p>
                    </div>
                  ) : (
                    <>
                      {((inventory.network || []).filter(n => n.type === 'EIP' && n.is_unbound_risk)).length > 0 && (
                        <div className="m-4 p-4 bg-rose-400/5 border border-rose-400/20 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-exclamation-triangle text-rose-400"></i>
                            <span className="font-black text-rose-300 text-xs">COST LEAKAGE DETECTED</span>
                          </div>
                          <p className="text-[10px] text-rose-400/70 mb-3">{(inventory.network || []).filter(n => n.type === 'EIP' && n.is_unbound_risk).length} unbound EIPs detected</p>
                          <div className="flex gap-2">
                            <a href={`/api/cloud/eip-cleanup-report?customerId=${activeCustomer?.id || ''}`} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black rounded-lg transition-colors inline-block">
                              <i className="fas fa-file-invoice-dollar mr-1"></i> Cost Report
                            </a>
                            <a href={`/api/cloud/eip-cleanup?customerId=${activeCustomer?.id || ''}&dryRun=true`} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black rounded-lg transition-colors inline-block">
                              <i className="fas fa-eye mr-1"></i> Dry Run
                            </a>
                          </div>
                        </div>
                      )}
                      <table className="w-full text-left">
                        <thead className="bg-slate-850 text-[9px] uppercase text-slate-500 sticky top-0">
                          <tr><th className="p-3">IP</th><th className="p-3">Status</th><th className="p-3">Bound To</th><th className="p-3">Risk</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {(inventory.network || []).filter(n => n.type === 'EIP').map(eip => (
                            <tr key={eip.id} className={`hover:bg-slate-750 ${eip.is_unbound_risk ? 'bg-rose-400/5' : ''}`}>
                              <td className="p-3 font-mono text-[10px] font-bold text-white">{eip.public_ip}</td>
                              <td className="p-3"><span className={`px-2 py-0.5 rounded text-[9px] font-black ${eip.status === 'ACTIVE' ? (eip.is_unbound_risk ? 'bg-rose-400/10 text-rose-400' : 'bg-emerald-400/10 text-emerald-400') : 'bg-slate-700 text-slate-400'}`}>{eip.status}</span></td>
                              <td className="p-3 text-[10px]">{eip.bound_to ? <span className="text-slate-300">{eip.bound_to}</span> : <span className="text-rose-400 font-bold">UNBOUND</span>}</td>
                              <td className="p-3">{eip.is_unbound_risk ? <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-400/10 text-rose-400">LEAKAGE</span> : <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-400/10 text-emerald-400">SAFE</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
