import { useState, useEffect } from 'react';
import DeliveryConstellation from './DeliveryConstellation';

export { DeliveryConstellation };

export default function GlobalProcessView() {
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [workflow, setWorkflow] = useState(null);

  const PHASE = {
    blue:     { bg1: 'bg-blue-400/5', bg2: 'bg-blue-400/10', border: 'border-blue-400/30', ring: 'ring-blue-400/20', text: 'text-blue-400', hex: '#3b82f6' },
    indigo:   { bg1: 'bg-indigo-400/5', bg2: 'bg-indigo-400/10', border: 'border-indigo-400/30', ring: 'ring-indigo-400/20', text: 'text-indigo-400', hex: '#6366f1' },
    amber:    { bg1: 'bg-amber-400/5', bg2: 'bg-amber-400/10', border: 'border-amber-400/30', ring: 'ring-amber-400/20', text: 'text-amber-400', hex: '#f59e0b' },
    emerald:  { bg1: 'bg-emerald-400/5', bg2: 'bg-emerald-400/10', border: 'border-emerald-400/30', ring: 'ring-emerald-400/20', text: 'text-emerald-400', hex: '#10b981' },
    purple:   { bg1: 'bg-purple-400/5', bg2: 'bg-purple-400/10', border: 'border-purple-400/30', ring: 'ring-purple-400/20', text: 'text-purple-400', hex: '#8b5cf6' },
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/gateway/generate-n8n-workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.success) setWorkflow(data.workflow);
      } catch (err) {
        console.error('Failed to load standard methodology', err);
      }
    })();
  }, []);

  return (
    <div className="animate-fade-in min-h-screen bg-slate-900">
      {/* background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-700/12 to-purple-700/8 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-blue-700/10 to-cyan-700/8 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8 pb-12">
        
        {/* brand header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <i className="fas fa-project-diagram text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Standard Delivery Methodology</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">End-to-End Migration Lifecycle for LATAM Cloud — Phase 1 → Phase 5</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setExpandedPhase(expandedPhase === null ? 1 : null)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-colors">
              <i className={`fas fa-${expandedPhase === null ? 'expand-alt' : 'compress-alt'} mr-1.5`}></i>
              {expandedPhase === null ? 'Expand All' : 'Collapse All'}
            </button>
          </div>
        </div>

        {/* React Flow — Standard Methodology graph */}
        <div className="mb-8">
          {workflow ? (
            <DeliveryConstellation workflow={workflow} compact />
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm font-bold">
              <i className="fas fa-spinner fa-spin mr-2"></i> Loading workflow...
            </div>
          )}
        </div>

        {/* phase pipeline — horizontal flow */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch">
            {phases.map((phase, i) => (
              <div key={phase.id} className="contents">
                <button
                  onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                  className={`flex-1 rounded-2xl border p-5 text-left transition-all cursor-pointer ${expandedPhase === phase.id
                    ? `${PHASE[phase.color].bg1} ${PHASE[phase.color].border} ${PHASE[phase.color].ring} ring-1`
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-8 h-8 rounded-lg ${PHASE[phase.color].bg2} flex items-center justify-center text-xs font-black leading-none tabular-nums ${PHASE[phase.color].text}`}>{phase.id}</span>
                    <div>
                      <div className="text-xs font-black text-white">{phase.title}</div>
                      <div className="text-[9px] text-slate-500">{phase.tagline}</div>
                    </div>
                  </div>
                  <div className="space-y-1 mt-3">
                    {phase.gates.map((g, j) => (
                      <PhaseGate key={j} label={g} passed={false} />
                    ))}
                  </div>
                </button>
                {i < phases.length - 1 && (
                  <div className="hidden lg:flex items-center text-slate-600 text-lg shrink-0">
                    <i className="fas fa-chevron-right"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* expanded detail */}
        {expandedPhase && (
          <div className="animate-slide-up">
            {(() => {
              const phase = phases.find(p => p.id === expandedPhase);
              if (!phase) return null;
              return (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  {/* phase header */}
                  <div className={`p-6 ${PHASE[phase.color].bg1} border-b border-slate-700`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${PHASE[phase.color].bg2} flex items-center justify-center text-2xl ${PHASE[phase.color].text}`}>
                        <i className={`fas ${phase.icon}`}></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-white">Phase {phase.id}: {phase.title}</h3>
                        <p className="text-xs text-slate-400">{phase.tagline}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Steps</div>
                        <div className={`text-2xl font-black ${PHASE[phase.color].text}`}>{phase.steps.length}</div>
                      </div>
                    </div>
                  </div>
                  {/* steps list */}
                  <div className="p-6 space-y-4">
                    {phase.steps.map((step, idx) => (
                      <PhaseStep key={idx} step={step} idx={idx} styles={PHASE[phase.color]} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseGate({ label, passed }) {
  return (
    <div className="flex items-center gap-2 text-[9px]">
      <span className={`w-1.5 h-1.5 rounded-full ${passed ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
      <span className={passed ? 'text-emerald-300' : 'text-slate-500'}>{label}</span>
    </div>
  );
}

function PhaseStep({ step, idx, styles }) {
  return (
    <div className="flex gap-4">
      <div className={`w-8 h-8 shrink-0 rounded-lg ${styles.bg2} flex items-center justify-center text-xs font-black ${styles.text}`}>
        {idx + 1}
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-white mb-1">{step.title}</div>
        <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
        {step.tools?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {step.tools.map((tool, j) => (
              <span key={j} className="text-[8px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 font-bold uppercase">{tool}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const phases = [
  {
    id: 1,
    title: 'ARB Handover',
    tagline: 'ARB intake, SOW, and high-level project scoping',
    icon: 'fa-handshake',
    color: 'blue',
    gates: ['ARB Intake & SOW signed', 'High-Level WBS (Sales) approved'],
    steps: [
      { title: 'ARB Intake & SOW', description: 'Formal Architecture Review Board intake process: capture customer requirements, define scope boundaries, and obtain signed Statement of Work.', tools: ['ARB Portal', 'CRM Integration'] },
      { title: 'High-Level WBS (Sales)', description: 'Translate SOW into a high-level Work Breakdown Structure, identifying major deliverables, milestones, and resource estimates for the sales pipeline.', tools: ['WBS Template', 'Salesforce'] },
    ],
  },
  {
    id: 2,
    title: 'Architecture',
    tagline: 'Source discovery, risk profiling, and target topology design',
    icon: 'fa-drafting-compass',
    color: 'purple',
    gates: ['Architecture Summary complete', 'Source Discovery (MgC) executed', 'ORA Risk Profile assessed', 'Target Topology Mapped', 'DTRB Governance approved'],
    steps: [
      { title: '2.1 Architecture Summary', description: 'Define the high-level architecture approach, constraints, and key decisions that will guide the entire migration lifecycle.', tools: ['Architecture Framework', 'Decision Log'] },
      { title: '2.2 Source Discovery (MgC)', description: 'Deploy MgC Agent for automated discovery of source servers, databases, and network topology — foundational for sizing and migration planning.', tools: ['MgC Agent', 'SSH', 'vCenter API'] },
      { title: '2.3 ORA Risk Profile', description: 'Assess Operational Risk Assessment profile: identify compatibility gaps, regulatory constraints, and technical debt that could impact migration.', tools: ['ORA Framework', 'Risk Matrix'] },
      { title: '2.4 Target Topology Mapper', description: 'Map discovered source infrastructure to Huawei Cloud target services, generating the target state architecture diagram.', tools: ['Topology Mapper', 'Huawei Cloud API'] },
      { title: '2.5 DTRB Governance', description: 'Digital Transformation Review Board governance checkpoint: validate architecture decisions against organizational standards and policies.', tools: ['DTRB Portal', 'Governance Checklist'] },
    ],
  },
  {
    id: 3,
    title: 'Planning',
    tagline: 'Delivery physics, FinOps budgeting, and wave planning',
    icon: 'fa-tasks',
    color: 'amber',
    gates: ['WBS & RACI Matrix defined', 'Physics Engine calibrated', 'FinOps Budget & Burn approved', 'Strategic Tooling selected', 'Wave & Runbook planned'],
    steps: [
      { title: '3.1 WBS & RACI Matrix', description: 'Develop detailed Work Breakdown Structure with RACI assignments — clarify who is Responsible, Accountable, Consulted, and Informed for every task.', tools: ['WBS Builder', 'RACI Matrix Tool'] },
      { title: '3.2 Delivery Physics Engine', description: 'Calculate migration timelines, resource requirements, parallelization limits, and effort estimates based on infrastructure complexity and team velocity.', tools: ['Physics Engine', 'Capacity Planner'] },
      { title: '3.3 FinOps Budget & Burn', description: 'Build cloud cost models, budget forecasts, and burn-rate tracking — align financial governance with migration execution cadence.', tools: ['FinOps Dashboard', 'Cost Calculator'] },
      { title: '3.4 Strategic Tooling', description: 'Select and provision the toolchain: SMS, DRS, UGO, Terraform, monitoring, and orchestration platforms for the migration factory.', tools: ['Tooling Matrix', 'Procurement Workflow'] },
      { title: '3.5 Wave & Runbook Planning', description: 'Define migration waves, sequencing, dependency mapping, and generate executable runbooks with step-by-step procedures per wave.', tools: ['Wave Planner', 'Runbook Generator'] },
    ],
  },
  {
    id: 4,
    title: 'Execution',
    tagline: 'Pipeline execution, engineering workbench, and TAM governance',
    icon: 'fa-play-circle',
    color: 'emerald',
    gates: ['Readiness Gateway passed', 'Execution Pipeline active', 'Engineering Workbench online', 'Delivery Command Center staffed', 'TAM Service Governance running'],
    steps: [
      { title: '4.0 Readiness Gateway', description: 'Final go/no-go checkpoint before entering execution: verify all prerequisites, tooling, access, and team readiness.', tools: ['Readiness Checklist', 'Go/No-Go Dashboard'] },
      { title: '4.1–4.7 Execution Pipeline', description: 'Execute migration waves through the 7-stage pipeline: VM replication, data sync, schema conversion, app reconfiguration, testing, validation, and cutover.', tools: ['SMS', 'DRS', 'UGO', 'Pipeline Orchestrator'] },
      { title: '4.8 Engineering Workbench', description: 'Central workspace for engineers to manage migration tasks, access tools, view status, and collaborate on technical issues in real time.', tools: ['Workbench UI', 'Task Manager'] },
      { title: '4.9 Delivery Command Center', description: 'Real-time operational dashboard for tracking all active waves, SLA adherence, incident response, and cross-team coordination.', tools: ['Command Center', 'SLA Tracker'] },
      { title: '4.10 TAM Service Governance', description: 'Technical Account Manager oversight: ensure service quality, manage escalations, and maintain customer satisfaction throughout execution.', tools: ['TAM Portal', 'Escalation Matrix'] },
    ],
  },
  {
    id: 5,
    title: 'Post-Live',
    tagline: 'Infrastructure reconciliation, sign-off, and procurement handover',
    icon: 'fa-clipboard-check',
    color: 'indigo',
    gates: ['3-Way Infrastructure Diff complete', 'Target Constellation verified', 'WAR Sign-Off obtained', 'Procurement & PO Handover executed'],
    steps: [
      { title: '5.1 3-Way Infrastructure Diff', description: 'Compare source infrastructure, target delivery, and contracted scope to identify discrepancies and ensure completeness of migration.', tools: ['Diff Engine', 'Reconciliation Report'] },
      { title: '5.2 Target Constellation', description: 'Generate the final target-state infrastructure diagram showing all deployed resources, their relationships, and operational status.', tools: ['Topology Visualizer', 'Diagram Tool'] },
      { title: '5.3 WAR Sign-Off', description: 'Work Acceptance Review: formal customer sign-off confirming all deliverables meet acceptance criteria and migration success is achieved.', tools: ['WAR Template', 'Sign-Off Portal'] },
      { title: '5.4 Procurement & PO Handover', description: 'Finalize procurement records, purchase orders, and hand over asset inventory to the customer\'s procurement and finance teams.', tools: ['Procurement System', 'Asset Register'] },
    ],
  },
];
