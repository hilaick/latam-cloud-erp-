import React, { useState, useEffect } from 'react';

// ── Lane feasibility per scenario ──
// Deterministic lane: executor has code for the action (SMS_TASK_*, CREATE_TARGET_ECS, etc.)
// Agent lane: skill tree has proven commands + context file has plan steps
// "Proven" = actually executed in a live migration, not just code exists

const SCENARIOS = [
  // ─── COMPUTE ───
  { id: 'on-prem', title: 'On-Prem Lift & Shift', icon: 'fa-building', gradient: 'from-amber-500 to-orange-600', time: '~2-4 weeks', complexity: 2, desc: 'Bare Metal, VMware, or Nutanix → Huawei Cloud via SMS agent-based replication.', v1: true, category: 'Compute', detLane: 'proven', agentLane: 'proven' },
  { id: 'cross-cloud', title: 'Cross-Cloud (AWS/Azure/GCP)', icon: 'fa-cloud', gradient: 'from-blue-500 to-cyan-600', time: '~2-6 weeks', complexity: 3, desc: 'AWS, Azure, or Google Cloud VMs → Huawei Cloud via SMS or IMS image migration.', v1: true, category: 'Compute', detLane: 'proven', agentLane: 'proven' },
  { id: 'huawei-cross-region', title: 'Huawei Cross-Region', icon: 'fa-globe-americas', gradient: 'from-violet-500 to-fuchsia-600', time: '~2-4 weeks', complexity: 3, desc: 'Between Huawei Cloud regions. SMS or IMS image copy.', v1: true, category: 'Compute', detLane: 'proven', agentLane: 'proven' },
  { id: 'huawei-cross-account', title: 'Huawei Cross-Account', icon: 'fa-user-friends', gradient: 'from-purple-500 to-indigo-600', time: '~2-4 weeks', complexity: 3, desc: 'Between Huawei Cloud accounts. SMS with shared AK/SK or IMS image sharing.', v1: true, category: 'Compute', detLane: 'available', agentLane: 'available' },
  { id: 'huawei-az-to-az', title: 'Huawei AZ-to-AZ', icon: 'fa-arrows-alt-h', gradient: 'from-teal-500 to-emerald-600', time: '~1-2 weeks', complexity: 2, desc: 'Within the same region, different availability zone. IMS image or EVS snapshot copy.', v1: true, category: 'Compute', detLane: 'available', agentLane: 'available' },

  // ─── DATABASE ───
  { id: 'database-redis', title: 'Redis / DCS Migration', icon: 'fa-bolt', gradient: 'from-red-500 to-rose-600', time: '~1-2 weeks', complexity: 2, desc: 'Redis instance migration via DCS sync or redis-shake. Skills proven, executor not yet.', v1: true, category: 'Database', detLane: 'not_yet', agentLane: 'proven' },
  { id: 'database', title: 'Database Migration (DRS)', icon: 'fa-database', gradient: 'from-emerald-500 to-teal-600', time: '~1-3 weeks', complexity: 3, desc: 'MySQL, PostgreSQL, Oracle, DDS, DWS via DRS with incremental sync and minimal downtime.', v1: false, category: 'Database', detLane: 'not_yet', agentLane: 'available' },

  // ─── STORAGE ───
  { id: 'object-storage', title: 'Object Storage Migration', icon: 'fa-cube', gradient: 'from-rose-500 to-pink-600', time: '~1-2 weeks', complexity: 1, desc: 'S3/Blob → OBS (cross-cloud) or OBS → OBS (within Huawei) via OMS.', v1: false, category: 'Storage', detLane: 'not_yet', agentLane: 'available' },

  // ─── SPECIALIZED ───
  { id: 'sap', title: 'SAP S/4HANA Migration', icon: 'fa-server', gradient: 'from-indigo-500 to-purple-600', time: '~4-8 weeks', complexity: 4, desc: 'SAP S/4HANA with certified flavors, HANA SR, and manual cutover gates.', v1: false, category: 'Specialized', detLane: 'not_yet', agentLane: 'available' },
];

// ── Category filter chips ──
const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'fa-th-large' },
  { id: 'Compute', label: 'Compute', icon: 'fa-server', color: 'text-amber-500' },
  { id: 'Database', label: 'Database', icon: 'fa-database', color: 'text-red-500' },
  { id: 'Storage', label: 'Storage', icon: 'fa-cube', color: 'text-rose-500' },
  { id: 'Specialized', label: 'Specialized', icon: 'fa-cogs', color: 'text-indigo-500' },
];

const LANE_BADGE = {
  proven: { label: 'Proven', cls: 'bg-green-100 text-green-700' },
  available: { label: 'Available', cls: 'bg-blue-100 text-blue-700' },
  not_yet: { label: 'Not yet', cls: 'bg-slate-100 text-slate-500' },
};

export default function ScenarioPicker({ onSelectScenario, onSkip }) {
  const [recent, setRecent] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem('guided-recent') || '[]');
      setRecent(r);
    } catch {}
  }, []);

  const handleSelect = (id) => {
    const scenario = SCENARIOS.find(s => s.id === id);
    if (!scenario.v1) return;
    const newRecent = [id, ...recent.filter(r => r !== id)].slice(0, 3);
    localStorage.setItem('guided-recent', JSON.stringify(newRecent));
    onSelectScenario(id);
  };

  const renderCard = (s, disabled) => {
    const detBadge = LANE_BADGE[s.detLane];
    const agentBadge = LANE_BADGE[s.agentLane];
    return (
      <div
        key={s.id}
        onClick={() => !disabled && handleSelect(s.id)}
        className={`rounded-2xl overflow-hidden shadow-sm border border-slate-200 transition-all duration-300 ${
          disabled
            ? 'opacity-55 cursor-not-allowed bg-white'
            : 'group cursor-pointer bg-white hover:shadow-xl hover:-translate-y-1'
        }`}
      >
        <div className={`h-24 bg-gradient-to-br ${s.gradient} relative flex items-center justify-center`}>
          <i className={`fas ${s.icon} text-white text-3xl ${disabled ? 'opacity-40' : 'opacity-90 group-hover:scale-110 transition-transform'}`}></i>
          {!disabled && recent.includes(s.id) && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-black bg-white/30 text-white backdrop-blur">
              RECENT
            </span>
          )}
          {disabled && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-400/90 text-white">
              COMING SOON
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-sm font-black text-slate-800 mb-1">{s.title}</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3 h-12 overflow-hidden">{s.desc}</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400">
              <i className="far fa-clock mr-1"></i>{s.time}
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <i key={i} className={`fas fa-star text-[8px] ${i <= s.complexity ? 'text-amber-400' : 'text-slate-200'}`}></i>
              ))}
            </div>
          </div>
          {/* Lane badges */}
          <div className="flex gap-1.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${detBadge.cls}`}>
              Det: {detBadge.label}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${agentBadge.cls}`}>
              Agent: {agentBadge.label}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Filter scenarios by active category
  const filtered = activeCategory === 'all'
    ? SCENARIOS
    : SCENARIOS.filter(s => s.category === activeCategory);

  const v1Scenarios = filtered.filter(s => s.v1);
  const v2Scenarios = filtered.filter(s => !s.v1);

  return (
    <div className="animate-fade-in max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="text-center mb-8 mt-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg mb-4">
          <i className="fas fa-magic text-white text-2xl"></i>
        </div>
        <h1 className="text-3xl font-black text-slate-800">Start a New Migration Project</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
          Choose a scenario and we'll guide you through each step — from discovery to simulation to execution.
        </p>
      </div>

      {/* Category filter chips */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          const count = cat.id === 'all'
            ? SCENARIOS.length
            : SCENARIOS.filter(s => s.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-slate-800 text-white shadow-md scale-105'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              <i className={`fas ${cat.icon} ${isActive ? 'text-white' : (cat.color || 'text-slate-400')}`}></i>
              {cat.label}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-400'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Available scenarios */}
      {v1Scenarios.length > 0 && (
        <div className="mb-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
            <i className="fas fa-check-circle text-green-500 mr-1"></i> Available
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {v1Scenarios.map(s => renderCard(s, false))}
          </div>
        </div>
      )}

      {/* Coming Soon scenarios */}
      {v2Scenarios.length > 0 && (
        <div className={v1Scenarios.length > 0 ? 'mt-6' : ''}>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
            <i className="fas fa-hourglass-half text-amber-400 mr-1"></i> Coming Soon
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {v2Scenarios.map(s => renderCard(s, true))}
          </div>
        </div>
      )}

      {/* Skip link */}
      <div className="text-center mt-10">
        <button
          onClick={onSkip}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          I know what I'm doing — take me to the standard wizard <i className="fas fa-arrow-right ml-1"></i>
        </button>
      </div>
    </div>
  );
}
