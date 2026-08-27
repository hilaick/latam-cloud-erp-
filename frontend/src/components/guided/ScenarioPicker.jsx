import React, { useState, useEffect } from 'react';

const SCENARIOS = [
  { id: 'sap', title: 'SAP S/4HANA Migration', icon: 'fa-server', gradient: 'from-indigo-500 to-purple-600', time: '~4-8 weeks', complexity: 4, desc: 'Migrate SAP S/4HANA workloads with certified flavors, HANA SR, and manual cutover gates.' },
  { id: 'cross-cloud', title: 'Cross-Cloud (AWS/Azure)', icon: 'fa-cloud', gradient: 'from-blue-500 to-cyan-600', time: '~2-6 weeks', complexity: 3, desc: 'Migrate VMs from AWS or Azure to Huawei Cloud using SMS block-level replication.' },
  { id: 'on-prem', title: 'On-Prem Lift & Shift', icon: 'fa-building', gradient: 'from-amber-500 to-orange-600', time: '~2-4 weeks', complexity: 2, desc: 'Migrate on-premises or VMware servers to Huawei Cloud with SMS agent-based replication.' },
  { id: 'database', title: 'Database-Only Migration', icon: 'fa-database', gradient: 'from-emerald-500 to-teal-600', time: '~1-3 weeks', complexity: 3, desc: 'Migrate databases (MySQL, PostgreSQL, Oracle) using DRS with minimal downtime.' },
  { id: 'object-storage', title: 'Object Storage Migration', icon: 'fa-cube', gradient: 'from-rose-500 to-pink-600', time: '~1-2 weeks', complexity: 1, desc: 'Migrate S3 buckets or Azure Blob containers to Huawei Cloud OBS using OMS.' },
  { id: 'multi-region', title: 'Multi-Region Deployment', icon: 'fa-globe-americas', gradient: 'from-violet-500 to-fuchsia-600', time: '~4-12 weeks', complexity: 5, desc: 'Deploy across multiple Huawei Cloud regions with DR, cross-region sync, and failover.' },
];

export default function ScenarioPicker({ onSelectScenario, onSkip }) {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem('guided-recent') || '[]');
      setRecent(r);
    } catch {}
  }, []);

  const handleSelect = (id) => {
    const newRecent = [id, ...recent.filter(r => r !== id)].slice(0, 3);
    localStorage.setItem('guided-recent', JSON.stringify(newRecent));
    onSelectScenario(id);
  };

  return (
    <div className="animate-fade-in max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="text-center mb-10 mt-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg mb-4">
          <i className="fas fa-magic text-white text-2xl"></i>
        </div>
        <h1 className="text-3xl font-black text-slate-800">Start a New Migration Project</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
          Choose a scenario and we'll guide you through each step — from discovery to simulation to execution.
        </p>
      </div>

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SCENARIOS.map((s) => {
          const isRecent = recent.includes(s.id);
          return (
            <div
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className="group cursor-pointer rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white"
            >
              {/* Gradient header */}
              <div className={`h-24 bg-gradient-to-br ${s.gradient} relative flex items-center justify-center`}>
                <i className={`fas ${s.icon} text-white text-3xl opacity-90 group-hover:scale-110 transition-transform`}></i>
                {isRecent && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-black bg-white/30 text-white backdrop-blur">
                    RECENT
                  </span>
                )}
              </div>
              {/* Body */}
              <div className="p-5">
                <h3 className="text-sm font-black text-slate-800 mb-1">{s.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3 h-12 overflow-hidden">{s.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">
                    <i className="far fa-clock mr-1"></i>{s.time}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <i
                        key={i}
                        className={`fas fa-star text-[8px] ${i <= s.complexity ? 'text-amber-400' : 'text-slate-200'}`}
                      ></i>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
