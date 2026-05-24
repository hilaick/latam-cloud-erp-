import React from 'react';

export default function GlobalProcessView() {
    const phases = [
        { id: 1, title: "ARB Intake Gate", icon: "fa-door-open", color: "bg-purple-500", shadow: "shadow-purple-500/30", text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", owner: "Sales Architect (SA)", desc: "Pre-sales transition and blueprint generation.", artefacts: ["Present State HLD (As-Is)", "Target Architecture (To-Be)", "Signed SOW & Blueprint.json"] },
        { id: 2, title: "Architecture & Physics", icon: "fa-project-diagram", color: "bg-blue-500", shadow: "shadow-blue-500/30", text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", owner: "Principal Architect", desc: "Technical validation against live environment.", artefacts: ["Live MgC Sizing Reconciliation", "Delivery Physics Calculation", "ORA Friction Profile"] },
        { id: 3, title: "Delivery Planning", icon: "fa-tasks", color: "bg-emerald-500", shadow: "shadow-emerald-500/30", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", owner: "Delivery Manager", desc: "Financial modeling and execution scheduling.", artefacts: ["FinOps Commercial Model", "RACI Assignment Matrix", "WBS Migration Plan Lock"] },
        { id: 4, title: "Active Execution", icon: "fa-rocket", color: "bg-amber-500", shadow: "shadow-amber-500/30", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", owner: "Delivery Pod / Partner", desc: "The active block-level migration phase.", artefacts: ["Live Cloud NOC Dashboard", "Master Execution Hub Updates", "TAM Support Ticket Tracking"] },
        { id: 5, title: "Post-Live Handover", icon: "fa-award", color: "bg-slate-700", shadow: "shadow-slate-700/30", text: "text-slate-800", bg: "bg-slate-100", border: "border-slate-300", owner: "TAM / Principal Architect", desc: "Cost Optimization verification and sign-off.", artefacts: ["Automated WAR Diff Engine", "Cost Optimization Verification", "Formal Project Sign-Off"] }
    ];

    return (
        <div className="animate-fade-in max-w-[1400px] mx-auto pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-slate-900 p-8 lg:p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none"></div>
                    <h2 className="text-3xl lg:text-4xl font-black mb-4 relative z-10"><i className="fas fa-route text-blue-400 mr-4"></i>Standard Delivery Methodology</h2>
                    <p className="text-sm text-slate-400 max-w-2xl mx-auto relative z-10 leading-relaxed font-medium">The End-to-End lifecycle mapping for LATAM Cloud migrations.</p>
                </div>
            </div>

            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-10 md:before:ml-[2.25rem] before:-translate-x-px before:w-1 before:bg-slate-200 before:z-0">
                {phases.map((phase) => (
                    <div key={phase.id} className="relative z-10 flex flex-col md:flex-row gap-6 lg:gap-8 items-start group">
                        <div className="flex shrink-0 w-20 h-20 ml-2 md:ml-0 rounded-full border-4 border-white bg-white shadow-xl items-center justify-center relative">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${phase.color} ${phase.shadow}`}>
                                <i className={`fas ${phase.icon} text-white text-xl`}></i>
                            </div>
                        </div>
                        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 w-full overflow-hidden hover:shadow-md transition-shadow">
                            <div className={`px-6 py-4 border-b border-slate-200 flex justify-between items-center ${phase.bg}`}>
                                <h3 className={`font-black text-lg ${phase.text}`}>{phase.id}. {phase.title}</h3>
                                <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 shadow-sm flex items-center"><i className="fas fa-user-circle mr-2 opacity-50"></i> {phase.owner}</span>
                            </div>
                            <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                                <div className="flex-1"><h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3">Phase Objective</h4><p className="text-sm font-medium text-slate-600 leading-relaxed">{phase.desc}</p></div>
                                <div className="lg:w-1/3 shrink-0">
                                    <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Mandatory Gate Artefacts</h4>
                                    <ul className="space-y-2">
                                        {phase.artefacts.map((art, i) => <li key={i} className="flex items-start text-xs font-bold text-slate-700"><i className="fas fa-check-circle text-emerald-500 mt-0.5 mr-2"></i><span>{art}</span></li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}