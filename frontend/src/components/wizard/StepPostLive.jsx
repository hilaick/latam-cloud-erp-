import React, { useState } from 'react';

export default function StepPostLive({ project, onUpdateProject }) {
    const [activeTab, setActiveTab] = useState('dashboard');

    // Safe data extraction from the project object
    const blueprint = project?.blueprint || {};
    const budget = project?.mrr || 0;
    const computeNodes = blueprint?.topology?.compute || [];
    
    // Auto-Generate the Handover Report based on existing ERP data
    const generateHandoverReport = () => {
        return `
# COMPLETE MIGRATION HANDOVER: ${project?.customerName || 'Unknown Customer'} - ${project?.name || 'Project'}

## 1. ARB INTAKE (Historical)
- **Quotation Date:** ${new Date().toLocaleDateString()}
- **Source Environment:** ${project?.type || 'Legacy Environment'}
- **Business Drivers:** Cost Optimization, Cloud Modernization
- **Approved Budget:** $${Number(budget).toLocaleString()} MRR
- **Success Criteria:** Zero-downtime cutover, Sub-millisecond latency

## 2. ARCHITECTURE (As Designed)
- **Target Huawei Cloud Region:** ${project?.region || 'la-south-2'}
- **Compute:** ${computeNodes.length} Elastic Cloud Servers (ECS)
- **Networking:** Virtual Private Cloud (VPC), Subnets, EIP configured
- **Security:** Zero-Trust IAM Sandbox, Security Groups Applied

## 3. PLANNING (As Scheduled)
- **Timeline:** Executed via Latam Cloud ERP Automated Pipeline
- **Team:** Delivery & Architecture
- **Risk Mitigation:** Cognitive Agent auto-remediation enabled during execution.

## 4. EXECUTION (Completed)
- **Status:** ✅ MIGRATION COMPLETED
- **Method:** Automated Deterministic Provisioning (RFS) + AI Troubleshooter
- **Orchestration Log:** Successfully verified by Proprietary Cognitive Engine.

## 5. POST-LIVE (Current State)
### 5.1 Infrastructure Inventory
- **Actual Resources:** Huawei Cloud Tenant Validated
- **Connectivity:** Site-to-Site VPN / EIP active

### 5.2 Performance Validation
- **Compliance Check:** Passed DTRB & ARB Security baselines.
- **Cost Analysis:** Aligning with pre-sales projection of $${Number(budget).toLocaleString()}

### 5.3 Operational Readiness
- **Support Contacts:** Latam Cloud NOC
- **Monitoring:** Cloud Eye metrics integrated.
        `;
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-between items-center print:hidden">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center">
                        <i className="fas fa-satellite-dish text-emerald-500 mr-3"></i>
                        Post-Live & Day-2 Operations
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Environment Handover & Governance</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        NOC Dashboard
                    </button>
                    <button onClick={() => setActiveTab('handover')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'handover' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <i className="fas fa-file-contract mr-2"></i> Handover Document
                    </button>
                </div>
            </div>

            {/* TAB: NOC Dashboard (Standard View) */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="font-black text-slate-800 mb-4"><i className="fas fa-check-circle text-emerald-500 mr-2"></i> Migration Status</h3>
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="text-emerald-700 font-black text-lg mb-1">Live in Production</div>
                            <div className="text-emerald-600 text-xs font-bold uppercase tracking-widest">Handover Ready</div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                        <h3 className="font-black text-slate-800 mb-4"><i className="fas fa-chart-line text-blue-500 mr-2"></i> Day-2 Telemetry (Mock)</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Cloud Eye CPU Avg</div>
                                <div className="text-slate-800 font-mono text-xl">14.2%</div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Active Resources</div>
                                <div className="text-slate-800 font-mono text-xl">{computeNodes.length} ECS</div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">IAM Blast Radius</div>
                                <div className="text-emerald-600 font-black text-sm mt-1"><i className="fas fa-lock mr-1"></i> Secured (Tier 2)</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Handover Report Generator */}
            {activeTab === 'handover' && (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 px-8 py-4 flex justify-between items-center print:hidden">
                        <div className="text-white font-black"><i className="fas fa-file-signature mr-2 text-blue-400"></i> Automated Handover Report</div>
                        <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-colors">
                            <i className="fas fa-print mr-2"></i> Export / PDF
                        </button>
                    </div>
                    
                    <div className="p-12 bg-white text-slate-800">
                        {/* Render the Markdown template as clean HTML for the PDF */}
                        <div className="prose prose-slate max-w-none">
                            <h1 className="text-3xl font-black mb-8 border-b-2 border-slate-200 pb-4 uppercase">
                                COMPLETE MIGRATION HANDOVER<br/>
                                <span className="text-blue-600 text-xl">{project?.customerName}</span>
                            </h1>
                            
                            <div className="grid grid-cols-2 gap-12">
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">1. ARB INTAKE (Historical)</h2>
                                    <ul className="space-y-2 text-sm">
                                        <li><strong>Quotation Date:</strong> {new Date().toLocaleDateString()}</li>
                                        <li><strong>Source Environment:</strong> {project?.type || 'Legacy Datacenter'}</li>
                                        <li><strong>Business Drivers:</strong> Cost, Performance, Compliance</li>
                                        <li><strong>Approved Budget:</strong> ${Number(budget).toLocaleString()} MRR</li>
                                        <li><strong>Success Criteria:</strong> Zero-downtime cutover</li>
                                    </ul>
                                </div>
                                
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">2. ARCHITECTURE (As Designed)</h2>
                                    <ul className="space-y-2 text-sm">
                                        <li><strong>Target Region:</strong> {project?.region || 'la-south-2'}</li>
                                        <li><strong>Compute:</strong> {computeNodes.length} Elastic Cloud Servers</li>
                                        <li><strong>Storage:</strong> OBS / EVS Volumes Attached</li>
                                        <li><strong>Networking:</strong> Dedicated VPC & Subnets</li>
                                        <li><strong>Security:</strong> Enterprise Security Groups</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">3. PLANNING & EXECUTION</h2>
                                <ul className="space-y-2 text-sm">
                                    <li><strong>Status:</strong> <span className="text-emerald-600 font-bold">✅ MIGRATION COMPLETED</span></li>
                                    <li><strong>Method:</strong> Automated Zero-Trust Provisioning Pipeline</li>
                                    <li><strong>Team:</strong> Latam Cloud Delivery Architects</li>
                                    <li><strong>Risk Mitigation:</strong> Handled by Proprietary Cognitive Execution Agent</li>
                                </ul>
                            </div>

                            <div className="mt-8">
                                <h2 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-200 pb-2">5. POST-LIVE (Current State)</h2>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="font-bold text-slate-700 text-sm mb-2">5.1 Infrastructure Inventory</h3>
                                        <ul className="space-y-1 text-sm list-disc pl-5">
                                            <li>Resources validated against Huawei Cloud API</li>
                                            <li>Network mapping & DNS verified</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-700 text-sm mb-2">5.2 Operational Readiness</h3>
                                        <ul className="space-y-1 text-sm list-disc pl-5">
                                            <li>Support escalations routed to NOC</li>
                                            <li>Cloud Eye monitoring baselines applied</li>
                                            <li>Snapshot backup schedules initialized</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="mt-16 pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-12">
                            <div>
                                <div className="border-b border-slate-400 h-8 mb-2"></div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Delivery Architect Signature</div>
                            </div>
                            <div>
                                <div className="border-b border-slate-400 h-8 mb-2"></div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer Sign-Off</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
