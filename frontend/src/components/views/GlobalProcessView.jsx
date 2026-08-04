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
            <DeliveryConstellation compact />
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
                    <span className={`w-8 h-8 rounded-lg ${PHASE[phase.color].bg2} flex items-center justify-center text-sm font-black ${PHASE[phase.color].text}`}>{phase.id}</span>
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
    title: 'Discovery & Assessment',
    tagline: 'Analyze source landscape & target requirements',
    icon: 'fa-search',
    color: 'blue',
    gates: ['MgC Agent audit', 'Source topology inventory', 'Target BoM parsed', 'Gap analysis complete'],
    steps: [
      { title: 'Deploy MgC Agent', description: 'Install and configure Huawei MgC Agent on source environment for automated discovery of servers, databases, and network topology.', tools: ['MgC Agent', 'SSH', 'vCenter API'] },
      { title: 'Target Topology Mapping', description: 'Map discovered source infrastructure to Huawei Cloud target services using topology mapper rules engine.', tools: ['Topology Mapper', 'Huawei Cloud API'] },
      { title: 'Quotation & BoM Validation', description: 'Cross-reference customer quotation against discovered topology to validate resource sizing and identify gaps.', tools: ['BoM Parser', 'Quotation Engine'] },
    ],
  },
  {
    id: 2,
    title: 'Infrastructure Setup',
    tagline: 'Provision target cloud foundation',
    icon: 'fa-cloud-upload-alt',
    color: 'indigo',
    gates: ['VPC/network provisioned', 'VPN/Direct Connect up', 'Security groups configured', 'DNS/routing verified'],
    steps: [
      { title: 'Terraform Plan', description: 'Generate Terraform infrastructure-as-code from target topology, including VPCs, subnets, security groups, and VPN gateways.', tools: ['Terraform', 'Huawei Cloud T Provider'] },
      { title: 'Network Connectivity', description: 'Establish VPN or Direct Connect between source data center and Huawei Cloud region for migration traffic.', tools: ['VPN Gateway', 'Direct Connect', 'BGP'] },
      { title: 'Security Hardening', description: 'Apply security baselines: security groups, NACLs, WAF policies, and encryption at rest/transit.', tools: ['Security Center', 'WAF', 'KMS'] },
    ],
  },
  {
    id: 3,
    title: 'Data Migration',
    tagline: 'Move databases & storage with minimal downtime',
    icon: 'fa-database',
    color: 'amber',
    gates: ['DRS sync healthy', 'Schema converted', 'Data validated', 'Cutover window scheduled'],
    steps: [
      { title: 'Schema Conversion', description: 'Convert source database schemas (Oracle, SQL Server, MySQL) to target Huawei Cloud database services (GaussDB, RDS).', tools: ['UGO', 'Schema Converter'] },
      { title: 'DRS Full + Incremental Sync', description: 'Configure Huawei DRS for full data sync followed by ongoing incremental replication until cutover.', tools: ['DRS', 'CDC', 'Log Reader'] },
      { title: 'Data Validation', description: 'Run row-count, checksum, and business-logic validation between source and target to ensure data integrity.', tools: ['DRS Compare', 'Custom Scripts'] },
    ],
  },
  {
    id: 4,
    title: 'Application Migration',
    tagline: 'Rehost, replatform, or refactor workloads',
    icon: 'fa-server',
    color: 'emerald',
    gates: ['SMS agent healthy', 'App dependencies mapped', 'Test environment verified', 'UAT signed off'],
    steps: [
      { title: 'Server Migration (SMS)', description: 'Replicate source VMs to Huawei Cloud ECS using SMS with continuous block-level sync until final cutover.', tools: ['SMS', 'VMware', 'Hyper-V'] },
      { title: 'Application Reconfiguration', description: 'Update application configs: database connection strings, DNS endpoints, load balancer targets for cloud-native services.', tools: ['Config Mgmt', 'Ansible', 'Puppet'] },
      { title: 'Pre-Production Testing', description: 'Execute integration, performance, and UAT test suites in isolated cloud environment before production cutover.', tools: ['Test Framework', 'LoadRunner', 'Selenium'] },
    ],
  },
  {
    id: 5,
    title: 'Cutover & Hypercare',
    tagline: 'Final sync, go-live, and stabilization',
    icon: 'fa-flag-checkered',
    color: 'purple',
    gates: ['Final DRS sync', 'DNS swing complete', 'Monitoring green', 'Hypercare 72h passed'],
    steps: [
      { title: 'Final Sync & Cutover', description: 'Execute final incremental sync, stop source applications, perform DNS cutover, and start target workloads.', tools: ['DRS', 'DNS', 'Load Balancer'] },
      { title: 'Production Monitoring', description: 'Enable Cloud Eye monitoring, set up dashboards, and configure alerts for critical infrastructure and application metrics.', tools: ['Cloud Eye', 'Grafana', 'Alerting'] },
      { title: 'Hypercare Support', description: 'Provide 72-hour intensive support period with rapid response team for any production issues post-migration.', tools: ['Support Ticketing', 'War Room', 'Rollback Plan'] },
    ],
  },
];
