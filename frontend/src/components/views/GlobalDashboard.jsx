import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';

export default function GlobalDashboard() {
    const { projects, setActivePhase, setActiveProjectId } = useContext(ERPContext);
    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);
    const totalMRR = activeProjects.reduce((s, p) => s + (Number(p.mrr) || 0), 0);
    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);

    const [showLifecycle, setShowLifecycle] = useState(true);
    const [selectedStage, setSelectedStage] = useState('all');

    const stages = [
        { id: '1_arb', name: 'ARB Intake', color: 'border-purple-500 text-purple-600 bg-purple-50', icon: 'fa-door-open', action: 'Approve Architecture SOW' },
        { id: '2_architecture', name: 'Architecture', color: 'border-blue-500 text-blue-600 bg-blue-50', icon: 'fa-project-diagram', action: 'Calculate Physics Engine' },
        { id: '3_planning', name: 'Planning', color: 'border-emerald-500 text-emerald-600 bg-emerald-50', icon: 'fa-tasks', action: 'Lock FinOps & WBS' },
        { id: '4_execution', name: 'Execution', color: 'border-amber-500 text-amber-600 bg-amber-50', icon: 'fa-rocket', action: 'Monitor Sync & TAM Tickets' },
        { id: '5_postlive', name: 'Post-Live', color: 'border-slate-500 text-slate-600 bg-slate-50', icon: 'fa-award', action: 'Execute WAR Sign-Off' }
    ];

    const filteredProjects = selectedStage === 'all' ? activeProjects : activeProjects.filter(p => p.lifecycleState === selectedStage);

    const onNavigateToProject = (id) => {
        setActiveProjectId(id);
        setActivePhase('wizard');
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6 pb-12">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-700">
                <div><h2 className="text-3xl font-black tracking-tight mb-2">Executive Overview</h2><p className="text-sm text-slate-400 max-w-xl">Regional aggregate of delivery performance and financial forecasting.</p></div>
                <div className="flex gap-4 items-center">
                    <button onClick={()=>setShowLifecycle(!showLifecycle)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showLifecycle ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}><i className="fas fa-project-diagram mr-2"></i> Toggle Lifecycle Flow</button>
                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 px-8 py-4 rounded-xl shadow-inner text-center"><div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Active Pipeline MRR</div><div className="text-3xl font-black text-emerald-400">{fm(totalMRR)}</div></div>
                </div>
            </div>

            {showLifecycle && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4"><h3 className="font-black text-lg text-slate-800"><i className="fas fa-route text-blue-500 mr-2"></i> Standard Delivery Methodology</h3>{selectedStage !== 'all' && <button onClick={()=>setSelectedStage('all')} className="text-xs font-bold text-slate-500 hover:text-blue-600"><i className="fas fa-times-circle mr-1"></i> Clear Filter</button>}</div>
                    <div className="flex flex-col md:flex-row justify-between items-center relative gap-4 md:gap-0">
                        <div className="hidden md:block absolute top-1/2 left-10 right-10 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                        {stages.map((stage) => {
                            const stageProjects = activeProjects.filter(p => p.lifecycleState === stage.id);
                            const stageMRR = stageProjects.reduce((s, p) => s + (Number(p.mrr) || 0), 0);
                            const isSelected = selectedStage === stage.id;
                            return (
                                <div key={stage.id} onClick={()=>setSelectedStage(stage.id)} className={`relative z-10 flex flex-col items-center cursor-pointer group transition-transform ${isSelected ? 'scale-110' : 'hover:scale-105'}`}>
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-lg bg-white transition-colors ${isSelected ? stage.color : 'border-slate-200 text-slate-400 group-hover:border-slate-400'}`}><i className={`fas ${stage.icon} text-2xl`}></i></div>
                                    <div className="text-center mt-4"><div className={`font-black text-sm uppercase tracking-widest ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{stage.name}</div><div className="flex gap-2 justify-center mt-1.5"><span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600">{stageProjects.length} Proj</span><span className="text-[10px] font-black bg-emerald-50 px-2 py-0.5 rounded text-emerald-700">{fm(stageMRR)}</span></div></div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-10 pt-6 border-t border-slate-100 bg-slate-50 p-6 rounded-xl">
                        <h4 className="font-black text-sm text-slate-800 mb-4 uppercase tracking-widest">{selectedStage === 'all' ? 'All Active Projects' : `Projects currently in: ${stages.find(s=>s.id===selectedStage)?.name}`}</h4>
                        {filteredProjects.length === 0 ? (<div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold">No projects currently in this stage.</div>) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredProjects.map(p => {
                                    const stg = stages.find(s => s.id === p.lifecycleState) || stages[0];
                                    return (
                                        <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2"><div className="font-black text-sm text-slate-800 truncate pr-2">{p.name}</div><div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{fm(p.mrr)}</div></div>
                                            <div className="text-[10px] text-slate-500 font-bold mb-3 flex items-center gap-2"><i className="fas fa-user-tie"></i> {p.sa} | <i className="fas fa-globe-americas ml-1"></i> {p.country}</div>
                                            <div className={`p-3 rounded-lg border bg-opacity-30 ${stg.color.split(' ')[0]} ${stg.color.split(' ')[2]}`}><div className="text-[9px] uppercase tracking-widest font-bold mb-1 opacity-70">Next Automated Action</div><div className="text-xs font-black flex items-center gap-2 cursor-pointer hover:underline" onClick={() => onNavigateToProject(p.id)}><i className="fas fa-play-circle"></i> {stg.action}</div></div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-5 flex items-center"><i className="fas fa-shield-halved text-rose-500 mr-3 text-xl"></i> Executive Escalations</h3>
                    <div className="space-y-4">
                        {activeProjects.filter(p=>p.health==='Red').map(p => (
                            <div key={p.id} className="p-5 bg-rose-50 border border-rose-200 rounded-xl flex justify-between items-center shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateToProject(p.id)}>
                                <div><div className="font-black text-base text-rose-900">{p.name}</div><div className="text-xs text-rose-700 mt-1 font-medium">{p.blocker}</div></div>
                                <div className="font-black text-xl text-rose-800 bg-white px-3 py-1 rounded-lg border border-rose-100 shadow-sm">{fm(p.mrr)}</div>
                            </div>
                        ))}
                        {activeProjects.filter(p=>p.health==='Red').length===0 && <div className="text-slate-400 text-sm p-8 text-center border-2 border-dashed rounded-xl font-bold bg-slate-50">All regions operating within SLA.</div>}
                    </div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-5 flex items-center"><i className="fas fa-rocket text-emerald-500 mr-3 text-xl"></i> Imminent Go-Lives (30 Days)</h3>
                    <div className="space-y-4">
                        {activeProjects.filter(p=>p.date && p.date !== 'TBD').slice(0,5).map(p => (
                            <div key={p.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center shadow-sm cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => onNavigateToProject(p.id)}>
                                <div><div className="font-black text-base text-slate-800">{p.name}</div><div className="text-xs text-slate-500 mt-1 font-bold">Lead: {p.sa}</div></div>
                                <div className="font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-lg text-sm shadow-sm">{formatShortDate(p.date)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}