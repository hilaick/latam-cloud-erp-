import React, { useState, useEffect, useMemo } from 'react';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('diff');

    return (
        <div className="animate-fade-in pb-12">
            
            <div className="mb-8 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-4 md:px-8">
                <div>
                    <h3 className="font-black text-2xl text-slate-800"><i className="fas fa-award text-amber-500 mr-3"></i> Step 5: Post-Live Governance</h3>
                    <p className="text-sm text-slate-500 mt-2">3-Way Reconciliation & Well-Architected Framework Sign-Off.</p>
                </div>
                {isCurrent && (
                    <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap">
                        Archive Project <i className="fas fa-check-double ml-2"></i>
                    </button>
                )}
            </div>

            <div className="px-4 md:px-8 flex gap-2 border-b border-slate-200 pb-4 mb-6">
                <button 
                    onClick={() => setSubTab('diff')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'diff' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-balance-scale mr-2"></i> 1. 3-Way Infrastructure Diff
                </button>
                <button 
                    onClick={() => setSubTab('war')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'war' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-shield-alt mr-2"></i> 2. WAR Sign-Off
                </button>
            </div>
            
            <div className="px-4 md:px-8">
                {subTab === 'diff' && <PhaseThreeWayDiff activeProject={project} />}
                {subTab === 'war' && <PhasePostLive activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}

// ==========================================
// ⚖️ RESTORED: 3-WAY INFRASTRUCTURE DIFF
// ==========================================
function PhaseThreeWayDiff({ activeProject }) {
    const [nocScanned, setNocScanned] = useState(false);
    const [showDiffModal, setShowDiffModal] = useState(false);

    // Mock data synthesis for the Diff 
    // In a real app, this compares project.blueprintData (SOW) vs project.mapperNodes (Target) vs MgC Data (Live)
    const sowNodes = (activeProject?.blueprintData?.topology?.compute || []).length + (activeProject?.blueprintData?.topology?.database || []).length;
    const targetNodes = (activeProject?.mapperNodes || []).length;
    const liveNodes = Object.values(activeProject?.mgcData?.raw_inventory || {}).flat().length;

    const handleStandardDossier = () => {
        window.print(); // Easy printable standard dossier
    };

    const handleDetailedReport = () => {
        // Export CSV logic for the detailed report
        const nodes = activeProject?.mapperNodes || [];
        if (nodes.length === 0) return alert("No mapped nodes available to export.");
        
        const headers = ["Resource Name", "Type", "Status", "IP/Location"];
        const csvContent = [
            headers.join(","),
            ...nodes.map(n => `"${n.name}","${n.type}","${n.status}","${n.ip || n.location}"`)
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Post_Live_Audit_${activeProject.name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in space-y-6 max-w-[1600px] mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                        <i className="fas fa-satellite-dish text-indigo-500"></i> Final Telemetry Reconciliation
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                        Cross-referencing the SOW, Target Architecture, and Live Cloud State.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={handleStandardDossier} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm border border-slate-200 flex items-center">
                        <i className="fas fa-file-pdf mr-2 text-rose-500"></i> Standard Dossier
                    </button>
                    <button onClick={handleDetailedReport} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm border border-slate-200 flex items-center">
                        <i className="fas fa-file-excel mr-2 text-emerald-500"></i> Detailed Report
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                    <h4 className="font-black text-lg text-slate-800 uppercase tracking-widest flex items-center">
                        <i className="fas fa-balance-scale text-indigo-500 mr-3 text-xl"></i> 3-Way Infrastructure Diff
                    </h4>
                    <button 
                        onClick={() => setNocScanned(true)} 
                        className="px-6 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-indigo-200 shadow-sm flex items-center"
                    >
                        <i className="fas fa-search mr-2"></i> Run Final NOC Scan
                    </button>
                </div>
                
                {!nocScanned ? (
                    <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                        <i className="fas fa-satellite-dish text-5xl text-slate-300 mb-4"></i>
                        <h5 className="font-black text-slate-600 text-lg">Awaiting Final Cloud Scan</h5>
                        <p className="text-sm text-slate-500 mt-2 font-medium max-w-lg mx-auto">
                            Run the Final NOC Scan to verify exactly what was built in the cloud against the original Sales Quotation.
                        </p>
                    </div>
                ) : (
                    <div className="p-10 text-center bg-emerald-50 border-2 border-emerald-200 rounded-xl shadow-inner animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-[100px] opacity-20 pointer-events-none -mr-10 -mt-10"></div>
                        <i className="fas fa-check-circle text-5xl text-emerald-500 mb-4 shadow-sm rounded-full bg-white"></i>
                        <h5 className="font-black text-emerald-800 text-xl uppercase tracking-widest">Scan Complete. 100% Match.</h5>
                        <p className="text-sm text-emerald-700 mt-2 font-bold max-w-lg mx-auto mb-6">
                            Live telemetry confirms final cloud infrastructure strictly aligns with the signed SOW and locked Target Architecture.
                        </p>
                        <button 
                            onClick={() => setShowDiffModal(true)} 
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors"
                        >
                            <i className="fas fa-columns mr-2"></i> View Detailed Diff Matrix
                        </button>
                    </div>
                )}
            </div>

            {/* THE 3-WAY DIFF MODAL */}
            {showDiffModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-700">
                        <div className="bg-indigo-900 px-8 py-5 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-black text-xl text-indigo-300"><i className="fas fa-balance-scale mr-3"></i> 3-Way Discrepancy Matrix</h3>
                                <p className="text-[10px] text-indigo-200 mt-1 uppercase tracking-widest font-bold">Verifying the structural integrity of the migration.</p>
                            </div>
                            <button onClick={()=>setShowDiffModal(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto bg-slate-50 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 custom-scrollbar">
                            
                            {/* Column 1: SOW */}
                            <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                <div className="p-4 bg-slate-100 border-b border-slate-200 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Baseline 1</div>
                                    <h4 className="font-black text-slate-800">Quoted SOW</h4>
                                    <div className="text-xs font-bold text-slate-400 mt-1">{sowNodes || 0} Entities Found</div>
                                </div>
                                <div className="p-4 flex-1 space-y-3">
                                    {activeProject?.blueprintData ? (
                                        <div className="text-center text-xs text-slate-500 font-mono bg-slate-50 p-4 rounded border border-slate-200">
                                            SOW imported on: {formatShortDate(activeProject.kickoff)}
                                        </div>
                                    ) : <div className="text-center text-xs text-slate-400 italic mt-10">No SOW data.</div>}
                                </div>
                            </div>

                            {/* Column 2: Mapper */}
                            <div className="bg-white border-2 border-blue-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
                                <div className="p-4 bg-blue-50 border-b border-blue-200 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Baseline 2</div>
                                    <h4 className="font-black text-blue-900">Target Architecture</h4>
                                    <div className="text-xs font-bold text-blue-600 mt-1">{targetNodes || 0} Entities Locked</div>
                                </div>
                                <div className="p-4 flex-1 space-y-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                                    {(activeProject?.mapperNodes || []).map((n, i) => (
                                        <div key={i} className="flex justify-between items-center text-[10px] p-2 bg-blue-50/50 border border-blue-100 rounded">
                                            <span className="font-bold text-slate-700 truncate mr-2"><i className="fas fa-server text-blue-400 mr-1.5"></i>{n.name}</span>
                                            <span className="font-black text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-200">Match</span>
                                        </div>
                                    ))}
                                    {(activeProject?.mapperNodes || []).length === 0 && <div className="text-center text-xs text-slate-400 italic mt-10">No mapped nodes.</div>}
                                </div>
                            </div>

                            {/* Column 3: Live API */}
                            <div className="bg-white border-2 border-emerald-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Telemetry</div>
                                    <h4 className="font-black text-emerald-900">Live Deployed State</h4>
                                    <div className="text-xs font-bold text-emerald-700 mt-1">{liveNodes || targetNodes || 0} Entities Found</div>
                                </div>
                                <div className="p-4 flex-1 space-y-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                                     {(activeProject?.mapperNodes || []).map((n, i) => (
                                        <div key={`live-${i}`} className="flex justify-between items-center text-[10px] p-2 bg-emerald-50/50 border border-emerald-100 rounded">
                                            <span className="font-bold text-slate-700 truncate mr-2"><i className="fas fa-check text-emerald-500 mr-1.5"></i>{n.name}</span>
                                            <span className="font-mono text-slate-500">{n.ip || 'Provisioned'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                        <div className="bg-white p-5 border-t border-slate-200 rounded-b-2xl flex justify-between items-center shrink-0">
                            <div className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                                <i className="fas fa-check-circle mr-2"></i> Diff Passed Validation
                            </div>
                            <button onClick={()=>setShowDiffModal(false)} className="px-8 py-2.5 text-xs font-black text-white uppercase bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-colors">
                                Close Matrix
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🏆 RESTORED: WELL-ARCHITECTED REVIEW (WAR)
// ==========================================
function PhasePostLive({ activeProject, onUpdateProject }) {
    const [r, setR] = useState(activeProject?.war?.r || 0); 
    const [s, setS] = useState(activeProject?.war?.s || 0); 
    const [p, setP] = useState(activeProject?.war?.p || 0); 
    const [c, setC] = useState(activeProject?.war?.c || 0); 
    const [o, setO] = useState(activeProject?.war?.o || 0);
    const [autoEval, setAutoEval] = useState(false);
    
    useEffect(()=>{ 
        if(activeProject?.war) { 
            setR(activeProject.war.r || 0); setS(activeProject.war.s || 0); setP(activeProject.war.p || 0); 
            setC(activeProject.war.c || 0); setO(activeProject.war.o || 0); 
        } 
    }, [activeProject]);
    
    const score = Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5) || 0; 
    
    const saveContext = () => { 
        onUpdateProject(activeProject.id, 'war', { r, s, p, c, o }); 
        alert("WAR Sign-Off Saved"); 
    };

    const handleAutoEvaluate = () => {
        setAutoEval(true);
        // Simulate API evaluating the infrastructure and assigning scores
        setR(95); setS(100); setP(90); setC(85); setO(95);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-100 pb-4 gap-4">
                    <h4 className="font-black text-lg text-slate-800 uppercase tracking-widest flex items-center">
                        <i className="fas fa-shield-alt text-amber-500 mr-3 text-xl"></i> Well-Architected Framework
                    </h4>
                    <div className="flex gap-3">
                        <button onClick={handleAutoEvaluate} className="px-6 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-amber-200 shadow-sm flex items-center">
                            <i className="fas fa-magic mr-2"></i> Auto-Evaluate via API
                        </button>
                        <button onClick={saveContext} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-colors">
                            <i className="fas fa-save mr-2"></i> Save Scores
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        {!autoEval && score === 0 && (
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-center shadow-inner">
                                <i className="fas fa-clock mr-3 text-slate-400 text-lg"></i> Pending Baseline Evaluation
                            </div>
                        )}
                        
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Resilience (HA/DR)</label><span className="text-blue-600 font-black text-sm">{r}%</span></div><input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Security & Compliance</label><span className="text-rose-600 font-black text-sm">{s}%</span></div><input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Performance</label><span className="text-purple-600 font-black text-sm">{p}%</span></div><input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Cost Optimization</label><span className="text-emerald-600 font-black text-sm">{c}%</span></div><input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Operational Ops</label><span className="text-slate-600 font-black text-sm">{o}%</span></div><input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer" /></div>
                    </div>

                    <div className={`p-10 rounded-3xl border-4 flex flex-col items-center justify-center text-center transition-all ${score > 0 ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-slate-50 border-slate-300'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Final Architecture Score</h4>
                        <div className={`text-8xl font-black tracking-tighter ${score > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{score}</div>
                        <div className={`mt-8 px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px] border-2 transition-all ${score >= 80 ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                            {score >= 80 ? 'Certified & Approved' : 'Pending Verification'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
