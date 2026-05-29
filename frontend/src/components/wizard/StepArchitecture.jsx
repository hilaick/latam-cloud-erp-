import React, { useState } from 'react';
import AssessmentView from './AssessmentView';
import TopologyMapperView from './TopologyMapperView';
import MgCReconciliationView from './MgCReconciliationView';

export default function StepArchitecture({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('summary');
    
    // Topology Mapper data
    const nodes = project.mapperNodes || [];
    
    // MgC Data Calculation
    const rawInv = project.mgcData?.raw_inventory || {};
    const totalMgcNodes = Object.values(rawInv).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
    const hasScanned = !!project.mgcData;

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
                <button onClick={()=>setSubTab('mgc')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='mgc'?'bg-emerald-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}><i className="fas fa-search mr-1"></i> 1. MgC Source Resources</button>
                <button onClick={()=>setSubTab('mapper')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='mapper'?'bg-blue-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>2. Topology Mapper</button>
                <button onClick={()=>setSubTab('ora')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab==='ora'?'bg-purple-600 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>3. ORA Profile</button>
            </div>

            {subTab === 'summary' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-blue-900 text-sm">MgC Source Resources</h4><i className="fas fa-server text-blue-500"></i></div>
                            <div className="text-xs text-blue-700 mb-4 flex-1">Automated discovery and resource import.</div>
                            <div className="text-xl font-black text-blue-800">{hasScanned ? `${totalMgcNodes} Resources Discovered` : 'Pending Discovery'}</div>
                            <button onClick={()=>setSubTab('mgc')} className="mt-2 text-left text-[10px] uppercase font-bold text-blue-600 hover:underline">View Resources &gt;</button>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-2"><h4 className="font-black text-slate-700 text-sm">Topology Mapped</h4><i className="fas fa-sitemap text-slate-500"></i></div>
                            <div className="text-xs text-slate-500 mb-4 flex-1">Confirmed IaC Target Architecture.</div>
                            <div className="text-xl font-black text-slate-800">{nodes.length > 0 ? `${nodes.length} Nodes Mapped` : 'Pending Configuration'}</div>
                            <button onClick={()=>setSubTab('mapper')} className="mt-2 text-left text-[10px] uppercase font-bold text-slate-600 hover:underline">Open Mapper &gt;</button>
                        </div>
                        <div className={`p-6 rounded-2xl shadow-sm border flex flex-col ${displayRisk === 'Pending' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-2"><h4 className={`font-black text-sm ${riskColor}`}>ORA Friction Profile</h4><i className={`fas fa-exclamation-triangle ${riskColor}`}></i></div>
                            <div className="text-xs mb-4 text-slate-500 font-medium flex-1">Stateful workload cutover complexity.</div>
                            <div className={`text-xl font-black ${riskColor}`}>{displayRisk}</div>
                            <button onClick={()=>setSubTab('ora')} className={`mt-2 text-left text-[10px] uppercase font-bold ${riskColor} hover:underline`}>Configure Details &gt;</button>
                        </div>
                    </div>
                </div>
            )}
            {subTab === 'mgc' && <MgCReconciliationView activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'mapper' && <TopologyMapperView activeProject={project} onUpdateProject={onUpdateProject} onPromote={onPromote} />}
            {subTab === 'ora' && <AssessmentView activeProject={project} onUpdateProject={onUpdateProject} />}
        </div>
    );
}
