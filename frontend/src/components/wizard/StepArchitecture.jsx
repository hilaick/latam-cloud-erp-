import React, { useState } from 'react';

// --- Sub-Component 1: AI IaC Analysis ---
function AIIaCAnalysisView({ blueprintData }) {
    const servers = blueprintData?.topology?.compute || [];
    const autoDeployable = servers.filter(s => !s.metadata?.os_type || s.metadata?.os_type === 'Unknown').length + (blueprintData?.topology?.database?.length || 0) + 2; 
    const manual = servers.length - (servers.filter(s => !s.metadata?.os_type || s.metadata?.os_type === 'Unknown').length);
    const percentage = (autoDeployable + manual) > 0 ? Math.round((autoDeployable / (autoDeployable + manual)) * 100) : 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-4xl mx-auto">
            <h3 className="font-black text-xl text-slate-800 mb-2"><i className="fas fa-robot text-indigo-500 mr-3"></i> API Orchestration Analysis</h3>
            <p className="text-sm text-slate-500 mb-8">Scanning blueprint to identify foundational Landing Zone vs Complex Block-Level Migrations.</p>
            <div className="flex items-center gap-8 mb-8">
                <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center relative shrink-0">
                    <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-l-transparent border-b-transparent transition-transform duration-1000" style={{transform: `rotate(${percentage * 3.6}deg)`}}></div>
                    <span className="text-2xl font-black text-slate-800">{percentage}%</span>
                </div>
                <div className="flex-1 space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center">
                        <div><div className="font-bold text-emerald-800">Landing Zone (API Auto-Deployable)</div><div className="text-xs text-emerald-600">VPCs, Subnets, SGs, and PaaS DBs extracted.</div></div>
                        <div className="text-2xl font-black text-emerald-700">{autoDeployable}</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex justify-between items-center">
                        <div><div className="font-bold text-amber-800">Stateful Compute (SMS Migration)</div><div className="text-xs text-amber-600">Stateful OS workloads requiring block-level agent sync.</div></div>
                        <div className="text-2xl font-black text-amber-700">{manual}</div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400">
                <div>// Generated Deployment Strategy</div>
                <div>{`> POST /api/v1/vpc { "name": "vpc-${blueprintData?.customer?.toLowerCase().replace(/\s+/g,'-')}" }`}</div>
                <div>{`> POST /api/v1/subnets { "count": 2 }`}</div>
                <div>{`> AWAITING SMS AGENT DEPLOYMENT FOR ${manual} WORKLOADS`}</div>
            </div>
        </div>
    );
}

// --- Sub-Component 2: Topology Mapper ---
function TopologyMapperView({ blueprintData }) {
    if (!blueprintData) return <div className="text-center p-8 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">No Blueprint Data Available</div>;
    const compute = blueprintData.topology?.compute || [];
    const database = blueprintData.topology?.database || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="font-black text-slate-800"><i className="fas fa-server text-blue-500 mr-2"></i> Compute Nodes</h3><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-black">{compute.length}</span></div>
                <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                    {compute.map((c, i) => (
                        <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                            <div><div className="font-bold text-sm text-slate-800">{c.name}</div><div className="text-[10px] text-slate-500 uppercase tracking-widest">{c.metadata?.os_type || 'Unknown OS'}</div></div>
                            <div className="text-right"><div className="font-mono text-xs font-bold text-blue-600">{c.flavor}</div><div className="text-[10px] text-slate-400">{c.metadata?.storage_gb}GB Disk</div></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="font-black text-slate-800"><i className="fas fa-database text-emerald-500 mr-2"></i> Database Nodes</h3><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black">{database.length}</span></div>
                <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                    {database.length === 0 ? <div className="text-center text-xs text-slate-400 font-bold p-4">No PaaS databases identified.</div> : database.map((db, i) => (
                        <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                            <div><div className="font-bold text-sm text-slate-800">{db.name}</div><div className="text-[10px] text-slate-500 uppercase tracking-widest">PaaS RDS</div></div>
                            <div className="text-right"><div className="font-mono text-xs font-bold text-emerald-600">{db.flavor}</div><div className="text-[10px] text-slate-400">{db.metadata?.storage_gb}GB Disk</div></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Main StepArchitecture Component ---
export default function StepArchitecture({ project, onUpdateProject }) {
    const [subTab, setSubTab] = useState('topology');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-4 mb-8 border-b border-slate-200 pb-4 overflow-x-auto">
                <button onClick={()=>setSubTab('topology')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${subTab==='topology'?'bg-blue-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-network-wired mr-2"></i> Topology Mapper</button>
                <button onClick={()=>setSubTab('physics')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${subTab==='physics'?'bg-blue-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-atom mr-2"></i> Delivery Physics Engine</button>
                <button onClick={()=>setSubTab('iac')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${subTab==='iac'?'bg-indigo-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-code mr-2"></i> AI IaC Analysis</button>
            </div>

            {subTab === 'topology' && <TopologyMapperView blueprintData={project.blueprintData} />}
            {subTab === 'iac' && <AIIaCAnalysisView blueprintData={project.blueprintData} />}
            {subTab === 'physics' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <i className="fas fa-tools text-4xl text-slate-300 mb-4"></i>
                    <h3 className="text-lg font-black text-slate-600">Physics Engine Pending</h3>
                    <p className="text-sm text-slate-400 mt-2">The core delivery physics calculator module will be ported in the next phase.</p>
                </div>
            )}
        </div>
    );
}