import React, { useState, useMemo } from 'react';
import AssessmentView from './AssessmentView';
import TopologyMapperView from './TopologyMapperView';
import MgCReconciliationView from './MgCReconciliationView';
import GovernanceAndCRView from './GovernanceAndCRView'; 

export default function StepArchitecture({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('summary');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    // 🚨 SAFE OPTIONAL CHAINING
    const nodes = project?.mapperNodes || [];
    const rawInv = project?.mgcData?.raw_inventory || {};
    
    const totalMgcNodes = Object.keys(rawInv).filter(k => k !== 'diagnostics' && k !== 'summary').reduce((acc, curr) => acc + (Array.isArray(rawInv[curr]) ? rawInv[curr].length : 0), 0);
    const hasScanned = !!project?.mgcData;
    const isLocked = project?.status === 'Approved' || project?.status === 'Locked';

    const { targetCount, upsellCount } = useMemo(() => {
        if (nodes.length === 0) {
            const compute = project?.blueprintData?.topology?.compute?.length || 0;
            const dbs = project?.blueprintData?.topology?.database?.length || 0;
            return { targetCount: compute + dbs, upsellCount: 0 };
        }
        
        const billableTypes = ['ECS', 'RDS', 'NAT', 'VPN', 'CGW', 'OBS', 'CBR', 'ELB', 'CCE'];
        const target = nodes.filter(n => n?.status !== 'Live Only' && billableTypes.includes(String(n?.type || '').toUpperCase())).length;
        const upsell = nodes.filter(n => n?.status === 'Live Only' && billableTypes.some(bt => String(n?.type || '').toUpperCase().includes(bt))).length;
        
        return { targetCount: target, upsellCount: upsell };
    }, [nodes, project?.blueprintData]);

    let displayRisk = 'Pending';
    let riskColor = 'text-slate-500';
    if (project?.ora) {
        const o = project.ora;
        const score = Math.round((parseInt(o.infraControl||0) + parseInt(o.itSkills||0) + parseInt(o.partnerCapability||0) + parseInt(o.downtime||0) + parseInt(o.appArch||0) + parseInt(o.security||0)) / 6);
        if (score > 75) { displayRisk = 'Low Risk'; riskColor = 'text-emerald-600'; }
        else if (score > 40) { displayRisk = 'Medium Risk'; riskColor = 'text-amber-600'; }
        else { displayRisk = 'High Risk'; riskColor = 'text-rose-600'; }
    }

    const menuItems = [
        { id: 'summary', num: '2.1', icon: 'fa-chart-pie', label: 'Architecture Summary' },
        { id: 'mgc', num: '2.2', icon: 'fa-search', label: 'Source Discovery (MgC)' },
        { id: 'ora', num: '2.3', icon: 'fa-exclamation-triangle', label: 'ORA Risk Profile' },
        { id: 'mapper', num: '2.4', icon: 'fa-network-wired', label: 'Target Topology Mapper' },
        { id: 'gov', num: '2.5', icon: isLocked ? 'fa-lock' : 'fa-shield-alt', label: 'DTRB Governance' }
    ];

    if (!project) {
        return <div className="p-12 text-center text-slate-400 font-bold"><i className="fas fa-circle-notch fa-spin mr-2"></i> Loading Architecture...</div>;
    }

    return (
        <div className="animate-fade-in pb-12 flex flex-col h-full">
            <div className="bg-white border-b border-slate-200 px-8 py-5 mb-6 rounded-t-2xl flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors"
                        title={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
                    >
                        <i className={`fas fa-bars ${sidebarOpen ? 'text-indigo-600' : ''}`}></i>
                    </button>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">Architecture & Discovery</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Map technical discovery to the approved SOW BOM.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 px-4 lg:px-8 relative h-full">
                
                {/* Collapsible Sidebar */}
                <div className={`shrink-0 space-y-2 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 hidden lg:block'}`}>
                    {menuItems.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setSubTab(item.id)}
                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between group ${
                                subTab === item.id 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${subTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                    {item.num}
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                            <i className={`fas ${item.icon} ${subTab === item.id ? 'text-indigo-200' : 'text-slate-300 group-hover:text-indigo-400'}`}></i>
                        </button>
                    ))}
                    
                    <div className="pt-8">
                        {isLocked ? (
                            <button onClick={() => onPromote && onPromote('planning')} className="w-full px-4 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                                Go to Planning Phase <i className="fas fa-arrow-right"></i>
                            </button>
                        ) : (
                            <button disabled className="w-full px-4 py-3.5 bg-slate-200 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                                <i className="fas fa-lock"></i> Pending DTRB Lock
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 min-w-0 bg-transparent min-h-[700px] transition-all duration-300">
                    
                    {subTab === 'summary' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    
                    {/* The Full-Width Components */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full overflow-hidden">
                        {subTab === 'mgc' && <MgCReconciliationView activeProject={project} onUpdateProject={onUpdateProject} />}
                        {subTab === 'ora' && <AssessmentView activeProject={project} onUpdateProject={onUpdateProject} />}
                        {subTab === 'mapper' && <TopologyMapperView activeProject={project} onUpdateProject={onUpdateProject} onPromote={() => setSubTab('gov')} />}
                        {subTab === 'gov' && <GovernanceAndCRView activeProject={project} onUpdateProject={onUpdateProject} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
