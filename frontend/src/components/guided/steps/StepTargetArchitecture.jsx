import React from 'react';

export default function StepTargetArchitecture({ data, onChange, scenarioId }) {
  const d = data || {};

  const resources = [
    { type: 'ECS (Compute)', count: 3, status: 'ok', icon: 'fa-server' },
    { type: 'RDS (Database)', count: 1, status: 'ok', icon: 'fa-database' },
    { type: 'EVS (Storage)', count: 5, status: 'warning', icon: 'fa-hdd' },
    { type: 'VPC', count: 1, status: 'ok', icon: 'fa-cloud' },
    { type: 'EIP', count: 2, status: 'ok', icon: 'fa-globe' },
    { type: 'Security Groups', count: 3, status: 'ok', icon: 'fa-shield-alt' },
  ];

  const statusColors = { ok: 'emerald', warning: 'amber', blocked: 'rose' };
  const statusIcons = { ok: 'fa-check-circle', warning: 'fa-exclamation-triangle', blocked: 'fa-times-circle' };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800 mb-1">Target Architecture & Feasibility</h3>
        <p className="text-xs text-slate-500">Review the discovered resources and validate they'll work on Huawei Cloud.</p>
      </div>

      {/* Resource summary */}
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Discovered Resources</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {resources.map((r, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <i className={`fas ${r.icon} text-slate-400`}></i>
                <i className={`fas ${statusIcons[r.status]} text-${statusColors[r.status]}-500 text-xs`}></i>
              </div>
              <div className="text-2xl font-black text-slate-700">{r.count}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">{r.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feasibility results */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
          <i className="fas fa-vial text-blue-500 mr-1"></i> Feasibility Check Results
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="text-xs font-bold text-emerald-700"><i className="fas fa-check-circle mr-2"></i>Compute sizing — all ECS flavors available in target region</span>
            <span className="text-[10px] font-black text-emerald-600">PASS</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="text-xs font-bold text-emerald-700"><i className="fas fa-check-circle mr-2"></i>Network — VPC and subnet configuration valid</span>
            <span className="text-[10px] font-black text-emerald-600">PASS</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-xs font-bold text-amber-700"><i className="fas fa-exclamation-triangle mr-2"></i>Storage — 2 EVS disks need type upgrade (SATA → SAS)</span>
            <span className="text-[10px] font-black text-amber-600">WARNING</span>
          </div>
        </div>
      </div>

      {/* SAP-specific note */}
      {scenarioId === 'sap' && (
        <div className="bg-purple-50 rounded-2xl border border-purple-100 p-6">
          <h4 className="text-xs font-black uppercase tracking-widest text-purple-500 mb-3">
            <i className="fas fa-server mr-1"></i> SAP-Certified Flavors
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            For SAP workloads, only certified ECS flavors are recommended. The ERP will automatically filter to:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-[10px] font-black text-purple-500">HANA DB</div>
              <div className="text-xs font-mono text-slate-600">e3.14xlarge.12 (56 vCPU, 696 GB)</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="text-[10px] font-black text-purple-500">App Server</div>
              <div className="text-xs font-mono text-slate-600">h1.8xlarge.4 (32 vCPU, 128 GB)</div>
            </div>
          </div>
        </div>
      )}

      {/* Region & VPC info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Region</div>
          <div className="text-sm font-bold text-blue-600 mt-1">{d.region || 'la-south-2'}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">VPC</div>
          <div className="text-sm font-bold text-slate-600 mt-1">Auto-provisioned</div>
        </div>
      </div>

      {/* DTRB link */}
      <div className="text-center">
        <button className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors">
          <i className="fas fa-clipboard-check mr-1"></i> Review DTRB (Design Technical Review Board)
        </button>
      </div>
    </div>
  );
}
