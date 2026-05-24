import React, { useState } from 'react';
import AssessmentView from './AssessmentView';
import PhysicsEngine from './PhysicsEngine';

export default function StepArchitecture({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('summary');

    const servers = project.blueprintData?.topology?.compute || [];
    const networks = project.blueprintData?.topology?.network || [];
    const databases = project.blueprintData?.topology?.database || [];
    
    const autoDeployable = servers.filter(s => !s.metadata?.os_type || s.metadata?.os_type === 'Unknown').length + databases.length + networks.length;
    const manual = servers.length - (servers.filter(s => !s.metadata?.os_type || s.metadata?.os_type === 'Unknown').length);
    const percentage = (autoDeployable + manual) > 0 ? Math.round((autoDeployable / (autoDeployable + manual)) * 100) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6">
                <button onClick={()=>setSubTab('summary')} className={`px-4 py-2 rounded-lg text-xs font-bold ${subTab==='summary'?'bg-indigo-600 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>Summary</button>
                <button onClick={()=>setSubTab('physics')} className={`px-4 py-2 rounded-lg text-xs font-bold ${subTab==='physics'?'bg-rose-600 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>Delivery Physics</button>
                <button onClick={()=>setSubTab('ora')} className={`px-4 py-2 rounded-lg text-xs font-bold ${subTab==='ora'?'bg-purple-600 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>ORA Friction Profile</button>
            </div>

            {/* Tab Content */}
            {subTab === 'summary' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-blue-900 text-sm">Live MgC Sizing</h4><i className="fas fa-server text-blue-500"></i></div>
                            <div className="text-xs text-blue-700 mb-4">Reconciliation against source APIs.</div>
                            <div className="text-xl font-black text-blue-800">{servers.length} Instances</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-emerald-900 text-sm">Delivery Physics</h4><i className="fas fa-stopwatch text-emerald-500"></i></div>
                            <div className="text-xs text-emerald-700 mb-4">Calculated automated provisioning speed.</div>
                            <div className="text-xl font-black text-emerald-800">~{(autoDeployable * 4.5).toFixed(1)} Hours</div>
                            <button onClick={()=>setSubTab('physics')} className="mt-2 text-[10px] uppercase font-bold text-emerald-600 hover:underline">Configure Details &gt;</button>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-rose-900 text-sm">ORA Friction Profile</h4><i className="fas fa-exclamation-triangle text-rose-500"></i></div>
                            <div className="text-xs text-rose-700 mb-4">Stateful workload cutover complexity.</div>
                            <div className="text-xl font-black text-rose-800">{manual > 0 ? 'High' : 'Low'} Risk</div>
                            <button onClick={()=>setSubTab('ora')} className="mt-2 text-[10px] uppercase font-bold text-rose-600 hover:underline">Configure Details &gt;</button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* ARCHITECTURE DIAGRAM AUTO-CREATOR */}
                        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-lg text-slate-800"><i className="fas fa-project-diagram text-indigo-500 mr-2"></i> Architecture Topology</h3>
                                <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black border border-indigo-100 hover:bg-indigo-100 transition-colors"><i className="fas fa-magic mr-1"></i> Auto-Generate Diagram</button>
                            </div>
                            <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                                <div className="text-center relative z-10">
                                    <div className="flex justify-center gap-4 mb-4">
                                        <div className="w-16 h-16 bg-white border-2 border-purple-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-purple-600"><i className="fas fa-network-wired text-xl"></i><span className="text-[10px] font-black mt-1">{networks.length || 1} VPC</span></div>
                                        <div className="w-16 h-16 bg-white border-2 border-blue-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-blue-600"><i className="fas fa-server text-xl"></i><span className="text-[10px] font-black mt-1">{servers.length} ECS</span></div>
                                        <div className="w-16 h-16 bg-white border-2 border-emerald-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-emerald-600"><i className="fas fa-database text-xl"></i><span className="text-[10px] font-black mt-1">{databases.length} RDS</span></div>
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold">Topology parsed from Blueprint JSON.</p>
                                </div>
                            </div>
                        </div>

                        {/* API ORCHESTRATION ANALYSIS */}
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
                </>
            )}

            {subTab === 'physics' && <PhysicsEngine project={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'ora' && <AssessmentView project={project} onUpdateProject={onUpdateProject} />}

        </div>
    );
}
