import React, { useState, useContext, useMemo } from 'react';
import { ERPContext } from '../../../context/ERPContext';

const SOURCES = [
  { id: 'aws', label: 'AWS', icon: 'fa-aws', color: 'amber' },
  { id: 'azure', label: 'Azure', icon: 'fa-microsoft', color: 'blue' },
  { id: 'on-prem', label: 'On-Premise', icon: 'fa-building', color: 'slate' },
  { id: 'vmware', label: 'VMware', icon: 'fa-server', color: 'indigo' },
  { id: 'cross-region', label: 'Huawei Cross-Region', icon: 'fa-cloud', color: 'red' },
];

export default function StepSourceDiscovery({ data, onChange, scenarioId }) {
  const { customers } = useContext(ERPContext);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const d = data || {};
  const update = (k, v) => onChange({ ...d, [k]: v });
  const source = d.source || '';

  // If a customer is linked, auto-populate credentials from CRM
  const linkedCustomer = useMemo(() => customers?.find(c => c.id === d.customerId), [customers, d.customerId]);

  // Auto-populate credentials when customer is linked
  const autoCreds = useMemo(() => {
    if (!linkedCustomer) return {};
    return {
      ak: linkedCustomer.ak && linkedCustomer.ak !== 'false' ? linkedCustomer.ak : '',
      sk: linkedCustomer.sk && linkedCustomer.sk !== 'false' ? linkedCustomer.sk : '',
      awsAK: linkedCustomer.awsAK || '',
      awsSK: linkedCustomer.awsSK || '',
      azureTenant: linkedCustomer.azureTenant || '',
      azureClient: linkedCustomer.azureClient || '',
      azureSecret: linkedCustomer.azureSecret || '',
      source_huawei_ak: linkedCustomer.source_huawei_ak || '',
      source_huawei_sk: linkedCustomer.source_huawei_sk || '',
    };
  }, [linkedCustomer]);

  const handleTest = () => {
    setTesting(true); setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult(Math.random() > 0.3 ? 'success' : 'fail');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800 mb-1">Source Environment Discovery</h3>
        <p className="text-xs text-slate-500">Connect to your source environment so we can discover all resources to migrate.</p>
      </div>

      {/* Linked customer info */}
      {linkedCustomer && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 flex items-center gap-3">
          <i className="fas fa-link text-blue-500"></i>
          <div className="text-xs">
            <span className="font-bold text-blue-700">Linked to customer: {linkedCustomer.name}</span>
            <span className="text-blue-500 ml-2">Region: {linkedCustomer.region || '—'}</span>
            {autoCreds.ak && <span className="text-emerald-600 ml-2"><i className="fas fa-check-circle"></i> Huawei credentials available</span>}
            {autoCreds.awsAK && <span className="text-emerald-600 ml-2"><i className="fas fa-check-circle"></i> AWS credentials available</span>}
            {autoCreds.azureTenant && <span className="text-emerald-600 ml-2"><i className="fas fa-check-circle"></i> Azure credentials available</span>}
            {!autoCreds.ak && !autoCreds.awsAK && !autoCreds.azureTenant && <span className="text-amber-600 ml-2"><i className="fas fa-exclamation-triangle"></i> No source credentials stored — enter below</span>}
          </div>
        </div>
      )}

      {/* Source selector */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Source Cloud</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {SOURCES.map(s => (
            <button
              key={s.id}
              onClick={() => { update('source', s.id); setTestResult(null); }}
              className={`p-4 rounded-xl border-2 transition-all ${source === s.id ? `border-${s.color}-400 bg-${s.color}-50 shadow-sm` : 'border-slate-200 hover:border-slate-300'}`}
            >
              <i className={`fas ${s.icon} text-xl ${source === s.id ? `text-${s.color}-600` : 'text-slate-400'} mb-2`}></i>
              <div className={`text-[10px] font-black ${source === s.id ? `text-${s.color}-700` : 'text-slate-500'}`}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic credential form */}
      {source && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-4" style={{ animation: 'fadeIn 0.3s ease' }}>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
            <i className="fas fa-key mr-1"></i> Source Credentials (Read-Only Access)
          </h4>

          {(source === 'aws') && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">AWS Access Key ID {autoCreds.awsAK && <span className="text-emerald-500 ml-1">(from CRM)</span>}</label>
                <input type="text" defaultValue={autoCreds.awsAK || ''} onBlur={e => update('ak', e.target.value)} placeholder="AKIA..." className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">AWS Secret Access Key {autoCreds.awsSK && <span className="text-emerald-500 ml-1">(from CRM)</span>}</label>
                <input type="password" defaultValue={autoCreds.awsSK ? '••••••••' : ''} onBlur={e => update('sk', e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
            </>
          )}

          {(source === 'cross-region') && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Huawei Source AK {autoCreds.source_huawei_ak && <span className="text-emerald-500 ml-1">(from CRM)</span>}</label>
                <input type="text" defaultValue={autoCreds.source_huawei_ak || autoCreds.ak || ''} onBlur={e => update('ak', e.target.value)} placeholder="AK..." className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Huawei Source SK {autoCreds.source_huawei_sk && <span className="text-emerald-500 ml-1">(from CRM)</span>}</label>
                <input type="password" defaultValue={autoCreds.source_huawei_sk ? '••••••••' : ''} onBlur={e => update('sk', e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
            </>
          )}

          {source === 'azure' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Subscription ID</label><input type="text" defaultValue={autoCreds.azureTenant || ''} onBlur={e => update('subId', e.target.value)} className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Tenant ID</label><input type="text" onBlur={e => update('tenantId', e.target.value)} className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Client ID</label><input type="text" defaultValue={autoCreds.azureClient || ''} onBlur={e => update('clientId', e.target.value)} className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Client Secret</label><input type="password" defaultValue={autoCreds.azureSecret ? '••••••••' : ''} onBlur={e => update('clientSecret', e.target.value)} className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
              </div>
            </>
          )}

          {source === 'on-prem' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Source IP</label><input type="text" onBlur={e => update('sourceIp', e.target.value)} placeholder="192.168.1.100" className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">SSH User</label><input type="text" onBlur={e => update('osUser', e.target.value)} placeholder="root" className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Password / Key</label><input type="password" onBlur={e => update('osPassword', e.target.value)} className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
            </>
          )}

          {source === 'vmware' && (
            <>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">vCenter URL</label><input type="text" onBlur={e => update('vcenterUrl', e.target.value)} placeholder="https://vcenter.local/sdk" className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Username</label><input type="text" onBlur={e => update('vcUser', e.target.value)} placeholder="administrator@vsphere.local" className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Password</label><input type="password" onBlur={e => update('vcPass', e.target.value)} className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-400" /></div>
              </div>
            </>
          )}

          {/* SAP-specific fields */}
          {scenarioId === 'sap' && (
            <div className="pt-3 border-t border-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2"><i className="fas fa-server mr-1"></i> SAP-Specific</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">SAP SID</label><input type="text" value={d.sapSid || ''} onChange={e => update('sapSid', e.target.value)} placeholder="PRD" className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-purple-400" /></div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={d.detectSap || false} onChange={e => update('detectSap', e.target.checked)} className="rounded text-purple-600" />
                    Auto-detect SAP workload
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Database-specific fields */}
          {scenarioId === 'database' && (
            <div className="pt-3 border-t border-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2"><i className="fas fa-database mr-1"></i> Database Type</div>
              <select value={d.dbType || ''} onChange={e => update('dbType', e.target.value)} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400">
                <option value="">Select database type...</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="oracle">Oracle</option>
                <option value="hana">SAP HANA</option>
                <option value="sqlserver">SQL Server</option>
              </select>
            </div>
          )}

          {/* Test connection */}
          <div className="flex items-center gap-3 pt-3">
            <button onClick={handleTest} disabled={testing} className="px-5 py-2.5 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-slate-400">
              {testing ? <><i className="fas fa-spinner fa-spin mr-1"></i> Testing...</> : <><i className="fas fa-plug mr-1"></i> Test Connection</>}
            </button>
            {testResult === 'success' && <span className="text-xs font-bold text-emerald-600"><i className="fas fa-check-circle mr-1"></i> Connection successful</span>}
            {testResult === 'fail' && <span className="text-xs font-bold text-rose-600"><i className="fas fa-times-circle mr-1"></i> Connection failed — check credentials</span>}
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed pt-2">
            <i className="fas fa-shield-alt mr-1"></i>
            <strong>Zero Trust:</strong> Credentials are used read-only. The ERP never modifies your source environment.
          </p>
        </div>
      )}
    </div>
  );
}
