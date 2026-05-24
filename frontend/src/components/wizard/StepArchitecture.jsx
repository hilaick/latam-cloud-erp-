import React, { useState } from 'react';

import AssessmentView from './AssessmentView';
import PhysicsEngine from './PhysicsEngine';
import TopologyMapperView from './TopologyMapperView';
import MgCReconciliationView from './MgCReconciliationView';

export default function StepArchitecture({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('summary');

    // 🚨 FIX 1: Read from the Interactive Mapper Nodes, not the old JSON!
    const nodes = project.mapperNodes || [];
    const servers = nodes.filter(n => ['ECS', 'VM'].includes(n.type));
    const databases = nodes.filter(n => ['RDS', 'GaussDB', 'DB'].includes(n.type));
    const networks = nodes.filter(n => ['VPC', 'Subnet', 'NAT', 'Internet', 'ELB'].includes(n.type));
    
    const autoDeployable = databases.length + networks.length;
    const manual = servers.length;
    const percentage = nodes.length > 0 ? Math.round((autoDeployable / nodes.length) * 100) : 0;

    // 🚨 FIX 2: Bubble up the saved Delivery Physics!
    // If they haven't saved the Physics tab yet, provide a rough estimate based on the Topology map.
    const displayHours = project.physics?.calculatedTotalHours || ((autoDeployable * 2.5) + (manual * 8.5)).toFixed(1);
    
    // 🚨 FIX 3: Re-calculate the ORA Score from the saved DB context!
    let displayRisk = manual > 0 ? 'High' : 'Low';
    let riskColor = manual > 0 ? 'text-rose-800' : 'text-emerald-800';
    let riskBg = manual > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200';
    let riskIcon = manual > 0 ? 'text-rose-500' : 'text-emerald-500';

    if (project.ora) {
        const o = project.ora;
        const score = Math.round((parseInt(o.infraControl||0) + parseInt(o.itSkills||0) + parseInt(o.partnerCapability||0) + parseInt(o.downtime||0) + parseInt(o.appArch||0) + parseInt(o.security||0)) / 6);
        if (score > 75) { displayRisk = 'Low'; riskColor = 'text-emerald-800'; riskBg = 'bg-emerald-50 border-emerald-200'; riskIcon = 'text-emerald-500'; }
        else if (score > 40) { displayRisk = 'Medium'; riskColor = 'text-amber-800'; riskBg = 'bg-amber-50 border-amber-200'; riskIcon = 'text-amber-500';}
        else { displayRisk = 'High'; riskColor = 'text-rose-800'; riskBg = 'bg-rose-50 border-rose-200'; riskIcon = 'text-rose-500';}
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6 flex-wrap">
                <button onClick={()=>setSubTab('summary')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='summary'?'bg-indigo-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Summary</button>
                <button onClick={()=>setSubTab('mgc')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='mgc'?'bg-emerald-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}><i className="fas fa-search mr-1"></i> Live MgC Diff</button>
                <button onClick={()=>setSubTab('mapper')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='mapper'?'bg-blue-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Topology Mapper</button>
                <button onClick={()=>setSubTab('physics')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='physics'?'bg-rose-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Delivery Physics</button>
                <button onClick={()=>setSubTab('ora')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='ora'?'bg-purple-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>ORA Friction Profile</button>
            </div>

            {subTab === 'summary' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Sizing Card */}
                        <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-blue-900 text-sm">Live MgC Sizing</h4><i className="fas fa-server text-blue-500"></i></div>
                            <div className="text-xs text-blue-700 mb-4">Reconciliation against source APIs.</div>
                            <div className="text-xl font-black text-blue-800">{servers.length} Instances</div>
                            <button onClick={()=>setSubTab('mgc')} className="mt-2 text-[10px] uppercase font-bold text-blue-600 hover:underline">View MgC Diff &gt;</button>
                        </div>
                        
                        {/* Delivery Physics Card */}
                        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-emerald-900 text-sm">Delivery Physics</h4><i className="fas fa-stopwatch text-emerald-500"></i></div>
                            <div className="text-xs text-emerald-700 mb-4">Calculated automated provisioning speed.</div>
                            <div className={`text-xl font-black ${project.physics ? 'text-emerald-800' : 'text-slate-500'}`}>
                                ~{displayHours} Hours
                            </div>
                            <button onClick={()=>setSubTab('physics')} className="mt-2 text-[10px] uppercase font-bold text-emerald-600 hover:underline">
                                {project.physics ? 'View Details >' : 'Configure Details >'}
                            </button>
                        </div>

                        {/* ORA Friction Card */}
                        <div className={`${riskBg} p-6 rounded-2xl shadow-sm`}>
                            <div className="flex justify-between items-start mb-2"><h4 className={`font-black text-sm ${riskColor}`}>ORA Friction Profile</h4><i className={`fas fa-exclamation-triangle ${riskIcon}`}></i></div>
                            <div className={`text-xs mb-4 ${riskColor} opacity-80`}>Stateful workload cutover complexity.</div>
                            <div className={`text-xl font-black ${riskColor}`}>{displayRisk} Risk</div>
                            <button onClick={()=>setSubTab('ora')} className={`mt-2 text-[10px] uppercase font-bold ${riskColor} hover:underline`}>
                                {project.ora ? 'View Details >' : 'Configure Details >'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-lg text-slate-800"><i className="fas fa-project-diagram text-indigo-500 mr-2"></i> Architecture Topology</h3>
                                <button onClick={()=>setSubTab('mapper')} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black border border-indigo-100 hover:bg-indigo-100 transition-colors"><i className="fas fa-sitemap mr-1"></i> Open Mapper Tool</button>
                            </div>
                            <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                                <div className="text-center relative z-10">
                                    <div className="flex justify-center gap-4 mb-4">
                                        <div className="w-16 h-16 bg-white border-2 border-purple-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-purple-600"><i className="fas fa-network-wired text-xl"></i><span className="text-[10px] font-black mt-1">{networks.length || 1} VPC</span></div>
                                        <div className="w-16 h-16 bg-white border-2 border-blue-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-blue-600"><i className="fas fa-server text-xl"></i><span className="text-[10px] font-black mt-1">{servers.length} ECS</span></div>
                                        <div className="w-16 h-16 bg-white border-2 border-emerald-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-emerald-600"><i className="fas fa-database text-xl"></i><span className="text-[10px] font-black mt-1">{databases.length} RDS</span></div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold">Topology metrics bound to active Scope Manager.</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 shrink-0">
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-500 mb-6">Orchestration Analysis</h3>
                            <div className="flex justify-center mb-8">
                                <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-l-transparent border-b-transparent transition-all duration-1000" style={{transform: `rotate(${percentage * 3.6}deg)`}}></div>
                                    <div className="text-center"><span className="text-2xl font-black text-slate-800">{percentage}%</span><div className="text-[9px] text-slate-400 uppercase font-black">Automated</div></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center">
                                    <div><div className="font-bold text-slate-800 text-sm">Landing Zone & PaaS</div><div className="text-[10px] text-slate-500">API Auto-Deployable</div></div>
                                    <div className="text-lg font-black text-indigo-600">{autoDeployable}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center">
                                    <div><div className="font-bold text-slate-800 text-sm">Stateful Compute</div><div className="text-[10px] text-slate-500">Requires SMS Sync</div></div>
                                    <div className="text-lg font-black text-amber-600">{manual}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'mgc' && <MgCReconciliationView activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'mapper' && <TopologyMapperView activeProject={project} onUpdateProject={onUpdateProject} onPromote={onPromote} />}
            {subTab === 'physics' && <PhysicsEngine project={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'ora' && <AssessmentView project={project} onUpdateProject={onUpdateProject} />}

        </div>
    );
}
