import React, { useState } from 'react';

export default function StepSimulation({ data, onChange, onComplete, onSkip }) {
  const [simState, setSimState] = useState('idle'); // idle, running, done
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');

  const phases = [
    'Phase 4.0 — Readiness Gateway',
    'Phase 4.1 — Network Verification',
    'Phase 4.2K — Knowledge Enrichment',
    'Phase 4.2b — Source & Agent Prep',
    'Phase 4.2c — Target Provisioning',
    'Phase 4.2d — Data Synchronization',
    'Phase 4.2f — Smoke Tests',
    'Phase 4.6 — Cutover (with manual gates)',
    'Phase 4.8 — Finalization',
  ];

  const runSimulation = () => {
    setSimState('running');
    setProgress(0);
    phases.forEach((ph, i) => {
      setTimeout(() => {
        setCurrentPhase(ph);
        setProgress(Math.round(((i + 1) / phases.length) * 100));
        if (i === phases.length - 1) setSimState('done');
      }, (i + 1) * 600);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800 mb-1">Simulation Preview</h3>
        <p className="text-xs text-slate-500">Run a dry-run simulation to see exactly what will happen during the migration — no real resources are created.</p>
      </div>

      {simState === 'idle' && (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 mx-auto mb-5 flex items-center justify-center shadow-lg">
            <i className="fas fa-rocket text-white text-3xl"></i>
          </div>
          <h4 className="text-sm font-black text-slate-700 mb-2">Ready to Simulate</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            The simulation will run through all 15 phases (4.0-4.8) and show you:
            resource provisioning, data sync, manual gates, and the knowledge tree matching.
          </p>
          <button onClick={runSimulation} className="px-8 py-3 rounded-xl text-sm font-black text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg transition-all">
            <i className="fas fa-play mr-2"></i> Run Simulation
          </button>
        </div>
      )}

      {simState === 'running' && (
        <div className="py-8">
          <div className="text-center mb-6">
            <i className="fas fa-spinner fa-spin text-3xl text-blue-500 mb-3"></i>
            <h4 className="text-sm font-black text-slate-700">Simulating Migration...</h4>
            <p className="text-xs text-blue-500 font-mono mt-1">{currentPhase}</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-center text-[10px] font-mono text-slate-400 mt-2">{progress}%</div>
          </div>
          <div className="max-w-md mx-auto mt-6 space-y-1">
            {phases.map((ph, i) => {
              const phaseProgress = Math.round(((i + 1) / phases.length) * 100);
              const done = progress >= phaseProgress;
              const current = progress < phaseProgress && progress >= Math.round((i / phases.length) * 100);
              return (
                <div key={i} className={`flex items-center gap-2 text-xs ${done ? 'text-emerald-600' : current ? 'text-blue-600 font-bold' : 'text-slate-300'}`}>
                  <i className={`fas ${done ? 'fa-check-circle' : current ? 'fa-spinner fa-spin' : 'fa-circle'}`}></i>
                  {ph}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {simState === 'done' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          {/* Results dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <div className="text-3xl font-black text-blue-600">47</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">Total Steps</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <div className="text-3xl font-black text-emerald-600">15</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">Phases Completed</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <div className="text-3xl font-black text-amber-600">3</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">Manual Gates</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <div className="text-3xl font-black text-purple-600">7</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">Skills Matched</div>
            </div>
          </div>

          {/* Flagged items */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
              <i className="fas fa-flag text-amber-500 mr-1"></i> Flagged Items
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <i className="fas fa-hand-paper text-amber-500 mt-0.5"></i>
                <div>
                  <div className="text-xs font-bold text-amber-700">Manual Gate: Stop SAP S/4HANA</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Requires human confirmation before final sync — cutover phase</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <i className="fas fa-hand-paper text-amber-500 mt-0.5"></i>
                <div>
                  <div className="text-xs font-bold text-amber-700">Manual Gate: Stop SAP HANA Database</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Flush memory to disk before final SMS sync</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <i className="fas fa-shield-alt text-blue-500 mt-0.5"></i>
                <div>
                  <div className="text-xs font-bold text-blue-700">Zero Trust: Source agent installation</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Customer must install SMS agent on source servers (read-only)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Knowledge enrichment */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              <i className="fas fa-sitemap text-emerald-500 mr-1"></i> Knowledge Enrichment
            </h4>
            <p className="text-xs text-slate-500 mb-3">The simulator matched 7 skills from the knowledge tree:</p>
            <div className="flex flex-wrap gap-2">
              {['sap-hana-migration', 'huawei-sms-migration', 'sap-certified-flavors', 'boot-fixes', 'partition-fixes', 'data-plane-sync', 'mig-worker-framework'].map(s => (
                <span key={s} className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <i className="fas fa-check mr-1"></i>{s}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button onClick={onSkip} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
              <i className="fas fa-external-link-alt mr-1"></i> View Full Details
            </button>
            <button onClick={onComplete} className="px-6 py-3 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors">
              <i className="fas fa-check mr-1"></i> Proceed to Execution
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
