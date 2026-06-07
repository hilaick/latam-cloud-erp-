import React, { useState, useMemo } from 'react';
import AssessmentView from './AssessmentView';
import TopologyMapperView from './TopologyMapperView';
import MgCReconciliationView from './MgCReconciliationView';
import GovernanceAndCRView from './GovernanceAndCRView'; 

export default function StepArchitecture({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('summary');
    
    const nodes = project.mapperNodes || [];
    const rawInv = project.mgcData?.raw_inventory || {};
    
    const totalMgcNodes = Object.keys(rawInv).filter(k => k !== 'diagnostics' && k !== 'summary').reduce((acc, curr) => acc + (Array.isArray(rawInv[curr]) ? rawInv[curr].length : 0), 0);
    const hasScanned = !!project.mgcData;
    const isLocked = project.status === 'Approved' || project.status === 'Locked';

    // 🚨 FIX: Upsell logic strictly counts BILLABLE resources.
    const { targetCount, upsellCount } = useMemo(() => {
        if (nodes.length === 0) {
            const compute = project.blueprintData?.topology?.compute?.length || 0;
            const dbs = project.blueprintData?.topology?.database?.length || 0;
            return { targetCount: compute + dbs, upsellCount: 0 };
        }
        
        const billableTypes = ['ECS', 'RDS', 'NAT', 'VPN', 'CGW', 'OBS', 'CBR', 'ELB', 'CCE'];
        const target = nodes.filter(n => n.status !== 'Live Only' && billableTypes.includes(String(n.type).toUpperCase())).length;
        
        // Scope Creep is only an opportunity if we can bill for it
        const upsell = nodes.filter(n => n.status === 'Live Only' && billableTypes.some(bt => String(n.type).toUpperCase().includes(bt))).length;
        
        return { targetCount: target, upsellCount: upsell };
    }, [nodes, project.blueprintData]);

    let displayRisk = 'Pending';
    let riskColor = 'text-slate-500';
    if (project.ora) {
        const o = project.ora;
        const score = Math.round((parseInt(o.infraControl||0) + parseInt(o.itSkills||0) + parseInt(o.partnerCapability||0) + parseInt(o.downtime||0) + parseInt(o.appArch||0) + parseInt(o.security||0)) / 6);
        if (score > 75) { displayRisk = 'Low Risk'; riskColor = 'text-emerald-600'; }
        else if (score > 40) { displayRisk = 'Medium Risk'; riskColor = 'text-amber-600'; }
        else { displayRisk = 'High Risk'; riskColor = 'text-rose-600'; }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6 flex-wrap">
                <button onClick={()=>setSubTab('summary')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='summary'?'bg-indigo-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Summary</button>
                <button onClick={()=>setSubTab('mgc')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='mgc'?'bg-emerald-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}><i className="fas fa-search mr-1"></i> 1. Source Discovery</button>
                <button onClick={()=>setSubTab('ora')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='ora'?'bg-purple-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>2. ORA Profile</button>
                <button onClick={()=>setSubTab('mapper')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='mapper'?'bg-blue-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>3. Target Architecture</button>
                <button onClick={()=>setSubTab('gov')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${subTab==='gov'?'bg-slate-800 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                    4. DTRB Governance {isLocked && <i className="fas fa-lock text-emerald-400"></i>}
                </button>
            </div>

            {subTab === 'summary' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-blue-900 text-sm">Source Discovery</h4><i className="fas fa-search text-blue-500"></i></div>
                            <div className="text-xs text-blue-700 mb-4 flex-1">Raw inventory found in live env.</div>
                            <div className="text-xl font-black text-blue-800">{hasScanned ? `${totalMgcNodes} Resources` : 'Pending'}</div>
                            <button onClick={()=>setSubTab('mgc')} className="mt-2 text-left text-[10px] uppercase font-bold text-blue-600 hover:underline">View Live Data &gt;</button>
                        </div>
                        <div className={`p-6 rounded-2xl shadow-sm border flex flex-col ${displayRisk === 'Pending' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-2"><h4 className={`font-black text-sm ${riskColor}`}>ORA Profile</h4><i className={`fas fa-exclamation-triangle ${riskColor}`}></i></div>
                            <div className="text-xs mb-4 text-slate-500 font-medium flex-1">Stateful cutover complexity.</div>
                            <div className={`text-xl font-black ${riskColor}`}>{displayRisk}</div>
                            <button onClick={()=>setSubTab('ora')} className={`mt-2 text-left text-[10px] uppercase font-bold ${riskColor} hover:underline`}>Configure Details &gt;</button>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-slate-700 text-sm">Target Topology</h4><i className="fas fa-sitemap text-slate-500"></i></div>
                            <div className="text-xs text-slate-500 mb-4 flex-1">Billable Execution Baseline.</div>
                            <div className="flex items-end gap-3">
                                <div className="text-xl font-black text-slate-800">{targetCount > 0 ? `${targetCount} Nodes` : 'Pending'}</div>
                                {upsellCount > 0 && <div className="text-[9px] font-black uppercase tracking-widest text-purple-600 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded mb-1" title="Billable Scope Creep discovered">+{upsellCount} Upsell</div>}
                            </div>
                            <button onClick={()=>setSubTab('mapper')} className="mt-2 text-left text-[10px] uppercase font-bold text-slate-600 hover:underline">Open Mapper &gt;</button>
                        </div>
                        <div className={`p-6 rounded-2xl shadow-sm border flex flex-col ${isLocked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-2"><h4 className={`font-black text-sm ${isLocked ? 'text-emerald-800' : 'text-slate-700'}`}>DTRB Approval</h4>{isLocked ? <i className="fas fa-lock text-emerald-600"></i> : <i className="fas fa-unlock-alt text-slate-400"></i>}</div>
                            <div className={`text-xs mb-4 font-medium flex-1 ${isLocked ? 'text-emerald-700' : 'text-slate-500'}`}>Technical feasibility review.</div>
                            <div className={`text-xl font-black ${isLocked ? 'text-emerald-600' : 'text-slate-400'}`}>{isLocked ? 'Locked' : 'Draft'}</div>
                            <button onClick={()=>setSubTab('gov')} className={`mt-2 text-left text-[10px] uppercase font-bold hover:underline ${isLocked ? 'text-emerald-700' : 'text-slate-600'}`}>Review Governance &gt;</button>
                        </div>
                    </div>
                </div>
            )}
            
            {subTab === 'mgc' && <MgCReconciliationView activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'ora' && <AssessmentView activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'mapper' && <TopologyMapperView activeProject={project} onUpdateProject={onUpdateProject} onPromote={onPromote} />}
            {subTab === 'gov' && <GovernanceAndCRView activeProject={project} onUpdateProject={onUpdateProject} />}
        </div>
    );
}
