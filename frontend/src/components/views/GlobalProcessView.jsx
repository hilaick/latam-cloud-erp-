import React, { useState } from 'react';

const phases = [
  {
    id: 1, title: 'ARB Handover', icon: 'fa-file-invoice-dollar', color: 'blue',
    tagline: 'Establish the Financial Baseline',
    gates: ['Signed SOW uploaded', 'Quotation parsed into BOM', 'Customer vault created'],
    steps: [
      { id: '1.1', name: 'Upload SOW Quotation', desc: 'Ingest the signed Huawei Cloud SOW Excel to establish the Bill of Materials', tool: 'Pre-Sales Radar / Quotation History', actor: 'Pre-Sales Architect', output: 'Structured BOM with line items' },
      { id: '1.2', name: 'Register Customer Vault', desc: 'Create customer profile with region, contact, and credential tiers', tool: 'Customer Directory', actor: 'Delivery Architect', output: 'Customer record + credential placeholders' },
    ],
    prerequisite: 'Signed commercial agreement',
    output: 'Validated BOM baseline for delivery scope enforcement',
  },
  {
    id: 2, title: 'Architecture & Discovery', icon: 'fa-network-wired', color: 'indigo',
    tagline: 'Map Source Reality to Quoted Targets',
    gates: ['MgC inventory uploaded (optional)', 'Topology mapped servers→BOM lines', 'DTRB scope locked'],
    steps: [
      { id: '2.1', name: 'Source Discovery (Optional)', desc: 'Run MgC agent or NOC scan against source environment to inventory live workloads', tool: 'Live Cloud NOC / MgC Upload', actor: 'Delivery Architect', output: 'Raw source server inventory', optional: true },
      { id: '2.2', name: 'Build Target Topology', desc: 'Create target architecture blueprint from quoted BOM — servers, RDS, VPC, storage, security', tool: 'Topology Mapper', actor: 'Delivery Architect', output: 'Target topology JSON (nodes + edges)', mandatory: true },
      { id: '2.3', name: 'MgC Reconciliation (Optional)', desc: 'Reconcile source MgC data against quoted BOM to detect unquoted servers', tool: 'MgC Reconciliation View', actor: 'Delivery Architect', output: 'Reconciliation delta report', optional: true },
      { id: '2.4', name: 'DTRB Governance Review', desc: 'Lock scope to prevent scope creep — review financial firewall alignment', tool: 'DTRB Review View', actor: 'Delivery Lead + Partner', output: 'Approved scope baseline', mandatory: true },
    ],
    prerequisite: 'SOW BOM from Phase 1',
    output: 'Target Topology signed off, scope locked',
  },
  {
    id: 3, title: 'Strategy & Planning', icon: 'fa-tasks', color: 'purple',
    tagline: 'Plan Migration Waves and Tooling',
    gates: ['Wave grouping defined', 'FinOps overlap budget calculated', 'WBS tasks generated', 'Runbook schedule locked'],
    steps: [
      { id: '3.1', name: 'Define Migration Waves', desc: 'Group target servers into iterative waves (DEV first, then UAT, PROD last)', tool: 'Wave Planning / Physics Engine', actor: 'Delivery Architect', output: 'Wave assignment per server' },
      { id: '3.2', name: 'FinOps Overlap Calculation', desc: 'Calculate temporary infrastructure costs during migration overlap period', tool: 'FinOps Calculator', actor: 'FinOps Analyst', output: 'Overlap buffer budget' },
      { id: '3.3', name: 'WBS Task Generation', desc: 'Generate structured work breakdown structure from topology and tool recommendations', tool: 'Tool Recommendation / WBS Import', actor: 'Delivery Architect', output: 'High-level + execution WBS' },
      { id: '3.4', name: 'Build Cutover Runbook', desc: 'Draft step-by-step cutover sequence with dependencies, timing, and rollback plans', tool: 'Cutover Runbook View', actor: 'Delivery Architect', output: 'Runbook with dependencies' },
    ],
    prerequisite: 'Target Topology + DTRB approval from Phase 2',
    output: 'Wave plan, WBS, runbook ready for execution',
  },
  {
    id: 4, title: 'Execution Control', icon: 'fa-rocket', color: 'rose',
    tagline: 'Deploy Infrastructure & Start Replication',
    gates: ['Terraform Landing Zone deployed', 'OS pre-flight checks passed', 'SMS/HSS agents installed', 'Sync replication active'],
    steps: [
      { id: '4.1', name: 'OS Pre-Flight Diagnostics', desc: 'Test source OS readiness — UEFI/Legacy detection, disk layout, agent compatibility', tool: 'Physics Engine / Pre-Flight', actor: 'Execution Agent', output: 'Execution vectors per server' },
      { id: '4.2', name: 'Deploy Landing Zones', desc: 'Terraform provisions target VPC, subnets, security groups, CBR vaults, and edge-case resources', tool: 'Terraform Orchestration', actor: 'Execution Agent', output: 'Live target infrastructure' },
      { id: '4.3', name: 'Install Migration Agents', desc: 'Push SMS Agent and UniAgent to source servers, enable HSS based on SOW opt-ins', tool: 'Huawei SMS Agent Push', actor: 'Execution Agent', output: 'Agents installed and reporting' },
      { id: '4.4', name: 'Start Data Sync', desc: 'Initiate block-level replication from source to target, monitor sync progress', tool: 'DRS/SMS Monitor', actor: 'Execution Agent', output: 'Active sync streams' },
    ],
    prerequisite: 'Wave plan + WBS from Phase 3, Master AK/SK configured',
    output: 'Live target infrastructure, active data sync',
  },
  {
    id: 5, title: 'Post-Live Governance', icon: 'fa-shield-alt', color: 'emerald',
    tagline: 'Cutover, Validate, and Close',
    gates: ['Cutover runbook executed', 'Live billing validated', 'WAR assessment passed', 'Project closed'],
    steps: [
      { id: '5.1', name: 'Execute Cutover Runbook', desc: 'Interactive cutover — flush DNS, stop source services, finalize sync, start target services', tool: 'Cutover Runbook / Interactive View', actor: 'Delivery Architect + Partner', output: 'Services running on target' },
      { id: '5.2', name: 'Validate Infrastructure', desc: 'Run NOC scan against LIVE target to verify delivered resources match quoted SOW BOM', tool: 'Live Cloud NOC / StepPostLive Report', actor: 'Delivery Architect', output: 'Infrastructure Verification Report' },
      { id: '5.3', name: 'Commercial True-Up', desc: 'Compare delivered vs quoted counts, calculate RI recommendation and financial delta', tool: 'Commercial True-Up / FinOps', actor: 'FinOps Analyst', output: 'True-up report + RI recommendations' },
      { id: '5.4', name: 'WAR Assessment', desc: 'Run Well-Architected Review against live environment for security, reliability, cost optimization', tool: 'Step ARB / Governance & CR', actor: 'Delivery Lead', output: 'WAR scorecard' },
    ],
    prerequisite: 'Execution Phase 4 completed, live target accessible',
    output: 'Project closure, billing validation, customer sign-off',
  },
];

const PhaseGate = ({ label, passed }) => (
  <div className={`flex items-center gap-2 text-[10px] font-bold ${passed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
    <span className={`w-2 h-2 rounded-full ${passed ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
    {label}
  </div>
);

/* ── n8n orchestration engine ── */
const OrchestrationWorkflow = () => {
  const [workflow, setWorkflow] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deployed, setDeployed] = useState(false);

  const generateWorkflow = async () => {
    setLoading(true); setError(null); setDeployed(false);
    try {
      const token = sessionStorage.getItem('hermes_access_token');
      const res = await fetch('/api/gateway/generate-n8n-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) { setWorkflow(data.workflow); setSummary(data.summary); }
      else { setError(data.error || 'Failed to generate workflow'); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const deployToN8n = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/gateway/deploy-n8n-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      });
      const data = await res.json();
      if (data.success) { setDeployed(true); }
      else { setError(data.error || `n8n deploy failed (${data.status_code})`); }
    } catch (err) {
      setError(`Deploy error: ${err.message}`);
    }
    finally { setLoading(false); }
  };

  // Render a compact DAG visualization from the workflow
  const renderDag = () => {
    if (!workflow || !summary) return null;
    const phaseColors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-rose-500', 'bg-emerald-500'];
    const phaseGroups = [
      { label: 'Phase 1', ids: ['trigger', 'phase1_arb', 'phase1_gate'], color: 'border-blue-400' },
      { label: 'Phase 2', ids: ['phase2_discovery', 'phase2_source_scan', 'phase2_topology', 'phase2_mgc', 'phase2_dtrb'], color: 'border-indigo-400' },
      { label: 'Phase 3', ids: ['phase3_strategy'], color: 'border-purple-400' },
      { label: 'Phase 4', ids: ['readiness_gateway', 'readiness_gate', 'phase4_execution', 'phase4_terraform', 'phase4_agents', 'phase4_sync', 'phase4_monitor'], color: 'border-rose-400' },
      { label: 'Phase 5', ids: ['phase5_cutover', 'phase5_noc', 'phase5_commercial', 'phase5_war', 'project_close'], color: 'border-emerald-400' },
    ];

    const nodeMap = {};
    workflow.nodes.forEach(n => { nodeMap[n.id] = n; });

    return (
      <div className="space-y-4 mt-4">
        {phaseGroups.map((group, gi) => (
          <div key={gi} className={`border-l-4 ${group.color} pl-4 py-2`}>
            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">{group.label}</div>
            <div className="flex flex-wrap gap-2">
              {group.ids.filter(id => nodeMap[id]).map((id, ni) => {
                const node = nodeMap[id];
                const isGate = node.type.includes('if') || node.type.includes('switch');
                return (
                  <div key={ni} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${isGate ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                    {node.name}
                    {isGate && <span className="ml-1 text-[8px] text-amber-400">◈</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <i className="fas fa-diagram-project text-white text-lg"></i>
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="font-black text-white">Auto-Generated Migration Workflow Engine</h3>
          <p className="text-xs text-slate-400">
            Generates an executable n8n workflow from the ERP Migration Factory logic (Phase 1-5),
            with decision gates at ARB handoff, source discovery, and readiness gateway.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={generateWorkflow} disabled={loading}
            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20">
            {loading ? <><i className="fas fa-spinner fa-spin mr-1.5"></i> Generating...</> : <><i className="fas fa-bolt mr-1.5"></i> Generate Workflow</>}
          </button>
          {workflow && (
            <button onClick={deployToN8n} disabled={loading || deployed}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deployed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' : 'bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20'}`}>
              {deployed ? <><i className="fas fa-check-circle mr-1.5"></i> Deployed ✓</> : <><i className="fas fa-rocket mr-1.5"></i> Deploy to n8n</>}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/50 border border-rose-700/50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <i className="fas fa-exclamation-triangle text-rose-400"></i>
          <span className="text-xs text-rose-300 font-bold">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-200"><i className="fas fa-times"></i></button>
        </div>
      )}

      {summary && (
        <div className="flex gap-4 mb-4 text-[10px]">
          <span className="bg-slate-700 px-3 py-1 rounded-lg font-bold text-slate-300">{summary.total_nodes} Nodes</span>
          <span className="bg-slate-700 px-3 py-1 rounded-lg font-bold text-slate-300">{summary.total_connections} Connections</span>
          <span className="bg-slate-700 px-3 py-1 rounded-lg font-bold text-slate-300">{summary.phases} Phases</span>
          <span className="bg-amber-400/15 px-3 py-1 rounded-lg font-bold text-amber-300">{summary.decision_gates} Decision Gates</span>
          <span className="bg-slate-700 px-3 py-1 rounded-lg font-mono text-slate-400">{summary.endpoint_base}</span>
        </div>
      )}

      {renderDag()}

      {!workflow && !loading && (
        <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl">
          <i className="fas fa-cube text-slate-600 text-3xl mb-2 block"></i>
          <p className="text-xs text-slate-500 font-bold">Click "Generate Workflow" to create the n8n DAG from migration logic</p>
        </div>
      )}
    </div>
  );
};

export default function GlobalProcessView() {
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [showN8n, setShowN8n] = useState(false);

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
            <button onClick={() => setShowN8n(!showN8n)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${showN8n ? 'bg-amber-400/10 text-amber-400 border-amber-400/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>
              <i className="fas fa-cubes mr-1.5"></i> {showN8n ? 'n8n Info' : 'Orchestration'}
            </button>
            <button onClick={() => setExpandedPhase(expandedPhase === null ? 1 : null)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-colors">
              <i className={`fas fa-${expandedPhase === null ? 'expand-alt' : 'compress-alt'} mr-1.5`}></i>
              {expandedPhase === null ? 'Expand All' : 'Collapse All'}
            </button>
          </div>
        </div>

        {/* n8n orchestration engine */}
        {showN8n && <OrchestrationWorkflow />}

        {/* phase pipeline — horizontal flow */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch">
            {phases.map((phase, i) => (
              <React.Fragment key={phase.id}>
                <button
                  onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                  className={`flex-1 rounded-2xl border p-5 text-left transition-all cursor-pointer ${expandedPhase === phase.id
                    ? `bg-${phase.color}-400/5 border-${phase.color}-400/30 ring-1 ring-${phase.color}-400/20`
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-8 h-8 rounded-lg bg-${phase.color}-400/10 flex items-center justify-center text-sm font-black text-${phase.color}-400`}>{phase.id}</span>
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
              </React.Fragment>
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
                <div className={`bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden`}>
                  {/* phase header */}
                  <div className={`p-6 bg-${phase.color}-400/5 border-b border-slate-700`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-${phase.color}-400/10 flex items-center justify-center text-2xl text-${phase.color}-400`}>
                        <i className={`fas ${phase.icon}`}></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-white">Phase {phase.id}: {phase.title}</h3>
                        <p className="text-xs text-slate-400">{phase.tagline}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Steps</div>
                        <div className={`text-2xl font-black text-${phase.color}-400`}>{phase.steps.length}</div>
                      </div>
                    </div>
                  </div>

                  {/* timeline */}
                  <div className="p-6 space-y-0">
                    {phase.steps.map((step, i) => (
                      <div key={step.id} className="flex gap-4">
                        {/* timeline line */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-9 h-9 rounded-xl bg-${phase.color}-400/10 border border-${phase.color}-400/20 flex items-center justify-center text-xs font-black text-${phase.color}-400`}>
                            {step.id}
                          </div>
                          {i < phase.steps.length - 1 && (
                            <div className="w-0.5 flex-1 min-h-[24px] bg-slate-700 my-1"></div>
                          )}
                        </div>
                        {/* content */}
                        <div className={`pb-6 flex-1 ${i === phase.steps.length - 1 ? '' : 'border-b border-slate-700/50'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black text-white">{step.name}</h4>
                            {step.mandatory && <span className="text-[8px] font-black bg-rose-400/10 text-rose-400 px-1.5 py-0.5 rounded uppercase">Required</span>}
                            {step.optional && <span className="text-[8px] font-black bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded uppercase">Optional</span>}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{step.desc}</p>
                          <div className="flex flex-wrap gap-3 text-[9px]">
                            <span className="text-slate-500"><span className="font-bold text-slate-400">Tool:</span> {step.tool}</span>
                            <span className="text-slate-500"><span className="font-bold text-slate-400">Actor:</span> {step.actor}</span>
                            <span className="text-slate-500"><span className="font-bold text-slate-400">Output:</span> {step.output}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* summary footer */}
                  <div className="p-5 bg-slate-900 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Prerequisite</div>
                      <div className="text-[10px] text-slate-300 font-bold mt-0.5">{phase.prerequisite}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Gate Check</div>
                      <div className="text-[10px] text-slate-300 font-bold mt-0.5">{phase.gates.join(' · ')}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Deliverable</div>
                      <div className="text-[10px] text-slate-300 font-bold mt-0.5">{phase.output}</div>
                    </div>
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
