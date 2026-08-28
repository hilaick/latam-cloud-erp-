import React, { useState, useEffect } from 'react';

const MODES = [
    {
        id: 'manual',
        icon: 'fa-list-check',
        title: 'Manual Pipeline',
        color: 'blue',
        description: 'Standard step-by-step Kanban execution. Teams manually update cards and trigger APIs per server.',
        bestFor: ['High-risk operations', 'Regulatory compliance', 'Small batches (<3 servers)', 'Human-in-the-loop every step'],
        flow: ['Human triggers each step', 'Hermes assists per request', 'No automatic phase advancement', 'Full manual control']
    },
    {
        id: 'agentic',
        icon: 'fa-robot',
        title: 'Agentic Orchestration',
        color: 'emerald',
        description: 'Hermes autonomous engine takes control of the entire wave, deploying agents and syncing tasks automatically.',
        bestFor: ['Medium-large waves (>5 servers)', 'Repeatable patterns', 'Parallel per-server work', 'Time-sensitive deliveries'],
        flow: ['Hermes decomposes wave into tasks', 'delegate_task spawns sub-agents', 'Human gates at risk points only', 'Auto phase advancement + monitoring'],
        recommended: true
    },
    {
        id: 'individual',
        icon: 'fa-bolt',
        title: 'Individual Tasks',
        color: 'amber',
        description: 'Isolate workloads into standalone ad-hoc tasks. Ideal for tiny batches or specific database true-ups.',
        bestFor: ['One-off database true-ups', 'Single server fixes', 'Emergency hotfixes', 'Quick validations'],
        flow: ['Fire delegate_task per item', 'No wave coordination', 'No dependency tracking', 'Fire and forget']
    }
];

const colorMap = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700', icon: 'text-blue-500', ring: 'ring-blue-500' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', icon: 'text-emerald-500', ring: 'ring-emerald-500' },
    amber: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700', icon: 'text-amber-500', ring: 'ring-amber-500' }
};

export default function ExecutionModeSelector({ project, onUpdateProject }) {
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load existing mode from project data
        if (project?.executionMode) setSelected(project.executionMode);
        // Also check execution state via API
        fetch(`/api/execution/state/${project?.id}`)
            .then(r => r.json())
            .then(data => {
                if (data.success && data.migration_mode) setSelected(data.migration_mode);
            })
            .catch(() => {});
    }, [project?.id, project?.executionMode]);

    const handleSelect = (modeId) => {
        setSelected(modeId);
        setSaved(false);
    };

    const handleSave = async () => {
        if (!selected || !project?.id) return;
        setSaving(true);
        try {
            // Save to ERP via the execution start API
            const res = await fetch('/api/execution/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: project.id, migration_mode: selected })
            });
            const data = await res.json();
            if (data.success) {
                // Also update project data for frontend state
                onUpdateProject?.(project.id, 'executionMode', selected);
                setSaved(true);
            }
        } catch (e) {
            console.error('Failed to save execution mode:', e);
        }
        setSaving(false);
    };

    return (
        <div className="animate-fade-in p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full mb-4">
                        <span className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-[10px]">3.2</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Setup Phase 4 Execution Mode</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Select how workloads will be processed</h3>
                    <p className="text-sm text-slate-500">Choose the execution strategy for the delivery team or orchestration engine. This decision drives the 4.0-4.7 pipeline behavior.</p>
                </div>

                {/* Mode Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {MODES.map((mode) => {
                        const c = colorMap[mode.color];
                        const isSelected = selected === mode.id;
                        return (
                            <div
                                key={mode.id}
                                onClick={() => handleSelect(mode.id)}
                                className={`relative cursor-pointer rounded-2xl border-2 transition-all duration-200 ${
                                    isSelected
                                        ? `${c.border} ${c.bg} shadow-xl scale-[1.02]`
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                }`}
                            >
                                {mode.recommended && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                                        Recommended
                                    </div>
                                )}
                                <div className="p-6">
                                    {/* Icon + Title */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isSelected ? `${c.btn} text-white` : 'bg-slate-100 text-slate-400'}`}>
                                            <i className={`fas ${mode.icon}`}></i>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg text-slate-800">{mode.title}</h4>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-slate-600 leading-relaxed mb-4">{mode.description}</p>

                                    {/* Best For */}
                                    <div className="mb-4">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Best For</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {mode.bestFor.map((item, i) => (
                                                <span key={i} className={`text-[10px] px-2 py-1 rounded-md font-bold ${isSelected ? `${c.bg} ${c.text} border ${c.border}` : 'bg-slate-50 text-slate-500'}`}>
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Flow */}
                                    <div className="border-t border-slate-200 pt-3">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Execution Flow</div>
                                        <div className="space-y-1.5">
                                            {mode.flow.map((step, i) => (
                                                <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${isSelected ? `${c.btn} text-white` : 'bg-slate-200 text-slate-400'}`}>{i + 1}</span>
                                                    {step}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Selected indicator */}
                                    {isSelected && (
                                        <div className={`absolute top-4 right-4 w-6 h-6 rounded-full ${c.btn} text-white flex items-center justify-center shadow-md`}>
                                            <i className="fas fa-check text-xs"></i>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Architecture Preview */}
                {selected && (
                    <div className="bg-slate-900 rounded-2xl p-6 mb-6 animate-fade-in">
                        <h4 className="text-white font-black text-sm mb-4 flex items-center">
                            <i className="fas fa-project-diagram text-indigo-400 mr-2"></i>
                            Execution Architecture Preview
                        </h4>
                        <div className="font-mono text-xs text-slate-300 leading-relaxed">
                            {selected === 'manual' && (
                                <pre className="whitespace-pre-wrap">{`Lead Agent (this session)
  │
  ├── You trigger each phase manually via chat
  ├── Hermes executes commands per your request
  ├── POST /api/execution/advance (per step, human-initiated)
  └── No automatic progression, no sub-agents spawned`}</pre>
                            )}
                            {selected === 'agentic' && (
                                <pre className="whitespace-pre-wrap">{`Lead Orchestrator (this session, GLM-5.2)
  │  Context: ~2-4k tokens (SOW + Blueprint only)
  │
  ├── delegate_task → Infra Sub-Agent (4.1, 4.3)
  │     Executes Terraform, hcloud CLI
  │     Returns: {"status":"SUCCESS","resources":14}
  │     Context: destroyed on exit
  │
  ├── delegate_task → Data Sub-Agent (4.2, 4.4, 4.5)
  │     SSH to mig_worker, SMS API polls
  │     Returns: {"sync":"100%","servers":3}
  │     Context: destroyed on exit
  │
  ├── Human gates at 4.0, 4.6 (block/unblock)
  └── POST /api/execution/advance per phase`}</pre>
                            )}
                            {selected === 'individual' && (
                                <pre className="whitespace-pre-wrap">{`Lead Agent (this session)
  │
  ├── delegate_task("Migrate server X")
  ├── delegate_task("True-up DB Y")
  ├── delegate_task("Fix VPN Z")
  │
  └── Each task isolated, no dependencies
      No wave coordination, no phase tracking
      Fire and forget per task`}</pre>
                            )}
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                    {saved && (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                            <i className="fas fa-check-circle"></i>
                            Execution mode saved. Pipeline ready for 4.0 Readiness Gateway.
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!selected || saving}
                        className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-all ${
                            !selected || saving
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                        }`}
                    >
                        {saving ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Saving...</> : <>Lock Execution Mode <i className="fas fa-lock ml-2"></i></>}
                    </button>
                </div>
            </div>
        </div>
    );
}
