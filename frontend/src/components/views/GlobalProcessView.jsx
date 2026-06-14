import React, { useState } from 'react';

export default function GlobalProcessView() {
    const [viewMode, setViewMode] = useState('high-level'); // 'high-level' or 'detailed'

    return (
        <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
            <div className="bg-white px-8 py-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800"><i className="fas fa-project-diagram text-indigo-500 mr-3"></i> Standard Delivery Methodology</h1>
                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">End-to-End Migration Lifecycle for LATAM Cloud</p>
                </div>
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                    <button onClick={() => setViewMode('high-level')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'high-level' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>High-Level Overview</button>
                    <button onClick={() => setViewMode('detailed')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'detailed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Detailed Architect Journey</button>
                </div>
            </div>

            {viewMode === 'high-level' ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Existing High Level View Content (Condensed for layout) */}
                    {[
                        { title: "1. Discovery & Architecture", icon: "fa-search", color: "blue", desc: "Ingest Sales SOW and MgC data. Define the target architecture." },
                        { title: "2. Topology Mapper", icon: "fa-network-wired", color: "indigo", desc: "Bind source servers to quoted target resources. Enforce scope." },
                        { title: "3. Planning & Strategy", icon: "fa-tasks", color: "purple", desc: "Calculate FinOps overlap buffers, define waves, and schedule cutovers." },
                        { title: "4. Execution Control", icon: "fa-rocket", color: "rose", desc: "Run OS diagnostics, deploy Landing Zones, and sync data via SMS." },
                        { title: "5. Post-Live Governance", icon: "fa-shield-alt", color: "emerald", desc: "Execute Cutover Runbooks, validate billing, and run WAR." }
                    ].map((step, i) => (
                        <div key={i} className={`bg-white rounded-2xl shadow-sm border-t-4 border-${step.color}-500 p-6 flex flex-col items-center text-center border-x border-b border-slate-200`}>
                            <div className={`w-16 h-16 rounded-full bg-${step.color}-50 text-${step.color}-600 flex items-center justify-center text-2xl mb-4 shadow-inner`}>
                                <i className={`fas ${step.icon}`}></i>
                            </div>
                            <h3 className="font-black text-sm text-slate-800 mb-2">{step.title}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="p-8 border-b border-slate-100 relative z-10">
                        <h3 className="font-black text-xl text-slate-800 mb-2">First-Time User Journey</h3>
                        <p className="text-sm text-slate-600">The step-by-step narrative for a Delivery Architect running a project in the ERP.</p>
                    </div>
                    <div className="p-8 space-y-8 relative z-10">
                        {/* Detailed Journey Mapping */}
                        <div className="flex gap-6">
                            <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-100 text-blue-600 font-black flex items-center justify-center text-xl shadow-sm border border-blue-200">1</div>
                            <div>
                                <h4 className="font-black text-lg text-slate-800 mb-2">Pre-Sales Context & Discovery Ingestion (The Input)</h4>
                                <p className="text-sm text-slate-600 mb-3"><strong className="text-slate-800">Action:</strong> I upload two things: The signed Huawei Cloud SOW Quotation (The Budget/BOM), and the MgC Discovery Excel (The Technical Reality).</p>
                                <p className="text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 inline-block"><strong className="text-emerald-800">Goal:</strong> I need the ERP to know what we sold and what actually exists.</p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-100 text-indigo-600 font-black flex items-center justify-center text-xl shadow-sm border border-indigo-200">2</div>
                            <div>
                                <h4 className="font-black text-lg text-slate-800 mb-2">The Topology Mapper (The Financial Firewall)</h4>
                                <p className="text-sm text-slate-600 mb-3"><strong className="text-slate-800">Action:</strong> I see a list of discovered servers on the left, and quoted servers on the right. I drag and drop to connect them. Unquoted servers are left unconnected.</p>
                                <p className="text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 inline-block"><strong className="text-emerald-800">Goal:</strong> The ERP restricts my execution payload to ONLY the approved servers, preventing scope creep and protecting profitability.</p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-12 h-12 shrink-0 rounded-xl bg-purple-100 text-purple-600 font-black flex items-center justify-center text-xl shadow-sm border border-purple-200">3</div>
                            <div className="w-full">
                                <h4 className="font-black text-lg text-slate-800 mb-2">Migration Planning (The Strategy)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="block text-slate-800 mb-1">3.1 Wave Physics:</strong> Look at network bandwidth to see how long data transfer will take.</div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="block text-slate-800 mb-1">3.2 FinOps Budget:</strong> Calculate overlap buffer. Verify Huawei Coupon covers temporary infra.</div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="block text-slate-800 mb-1">3.3 WBS & Tooling:</strong> Generate project management tasks based on theoretical strategy.</div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="block text-slate-800 mb-1">3.4 Wave & Runbook:</strong> Group servers into Iterative Waves (e.g., DEV this weekend, PROD next).</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-12 h-12 shrink-0 rounded-xl bg-rose-100 text-rose-600 font-black flex items-center justify-center text-xl shadow-sm border border-rose-200">4</div>
                            <div className="w-full">
                                <h4 className="font-black text-lg text-slate-800 mb-2">Execution Orchestrator (The Control & Data Plane)</h4>
                                <div className="space-y-3">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="text-slate-800">4.1 Pre-Flight Diagnostics:</strong> ERP tests actual source OS, flagging UEFI/Legacy issues and assigns strict Execution Vectors.</div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="text-slate-800">4.2 Landing Zone Build:</strong> Terraform deploys network, empty CBR vaults, and pre-builds edge-case targets.</div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="text-slate-800">4.3 Cognitive Agent Push:</strong> ERP automatically injects SMS, UniAgent, and HSS based on SOW opt-ins.</div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="text-slate-800">4.4 Sync Monitor:</strong> Watch data replicate block-by-block while Drift Monitor protects VPC.</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-100 text-emerald-600 font-black flex items-center justify-center text-xl shadow-sm border border-emerald-200">5</div>
                            <div className="w-full">
                                <h4 className="font-black text-lg text-slate-800 mb-2">Post-Live Governance (The Output)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="block text-slate-800 mb-1">Action 1 (Cutover):</strong> Open Interactive Runbook. Flush DNS, shutdown sources, finalize waves.</div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="block text-slate-800 mb-1">Action 2 (Billing):</strong> Fetch live BSS Invoice to prove to partner we stayed under budget.</div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><strong className="block text-slate-800 mb-1">Action 3 (Validation):</strong> Run Well-Architected validation to prove environment is secure.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
