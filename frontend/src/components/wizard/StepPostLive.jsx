import React, { useState, useEffect } from 'react';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    // ==========================================
    // 1. STATE: WAR Scorecard
    // ==========================================
    const [r, setR] = useState(project?.war?.r || 0); 
    const [s, setS] = useState(project?.war?.s || 0); 
    const [p, setP] = useState(project?.war?.p || 0); 
    const [c, setC] = useState(project?.war?.c || 0); 
    const [o, setO] = useState(project?.war?.o || 0);
    const [warEvaluated, setWarEvaluated] = useState(project?.war?.evaluated || false);

    // ==========================================
    // 2. STATE: 3-Way Reconciliation & CR Process
    // ==========================================
    const [isScanningNoc, setIsScanningNoc] = useState(false);
    const [nocData, setNocData] = useState(project?.nocData || null);
    const [crApproved, setCrApproved] = useState(project?.crApproved || false);

    // Data Sources
    const asIsCompute = project?.mgcData?.compute || 0; // From Step 2 MgC
    const quotedCompute = project?.blueprintData?.topology?.compute?.length || 0; // From Step 1 SOW
    const actualCompute = nocData?.compute || 0; // From Step 5 NOC
    
    const asIsDb = project?.mgcData?.database || 0;
    const quotedDb = project?.blueprintData?.topology?.database?.length || 0;
    const actualDb = nocData?.database || 0;

    const hasNocScanned = nocData !== null;
    const computeCreep = hasNocScanned ? (actualCompute - quotedCompute) : 0;
    const dbCreep = hasNocScanned ? (actualDb - quotedDb) : 0;
    
    // CR Gate Logic: If Actual > Quoted, a Change Request is mandatory.
    const requiresCR = hasNocScanned && (computeCreep > 0 || dbCreep > 0);

    // Sync State on Load
    useEffect(() => {
        if (project?.war) {
            setR(project.war.r); setS(project.war.s); setP(project.war.p); setC(project.war.c); setO(project.war.o);
            setWarEvaluated(project.war.evaluated);
        }
        if (project?.nocData) setNocData(project.nocData);
        if (project?.crApproved) setCrApproved(project.crApproved);
    }, [project]);

    // ==========================================
    // 3. MOCK API ACTIONS
    // ==========================================
    const runFinalNocScan = () => {
        setIsScanningNoc(true);
        setTimeout(() => {
            // MOCK: We simulate finding Scope Creep (Actual Built > Quoted) to trigger the CR logic.
            const mockNoc = {
                compute: quotedCompute + 2, // 2 extra servers built
                database: quotedDb + 1      // 1 extra DB built
            };
            setNocData(mockNoc);
            onUpdateProject(project.id, 'nocData', mockNoc);
            setIsScanningNoc(false);
            alert("Live NOC Scan Complete. Infrastructure reconciliation generated.");
        }, 2000);
    };

    const autoEvaluateWAR = () => {
        if (!hasNocScanned) return alert("You must run the Final NOC Scan first to evaluate the architecture.");
        
        // MOCK: The API calculates baseline scores based on the NOC inventory
        setR(85); // e.g. Found Multi-AZ but missing some cross-region replication
        setS(90); // e.g. KMS active, no port 22 open
        setP(75); // e.g. CPU metrics show slight over-provisioning
        setC(60); // e.g. Found unattached EIPs and orphan disks
        setO(80); // e.g. Found 80% tag compliance
        
        setWarEvaluated(true);
        onUpdateProject(project.id, 'war', { r: 85, s: 90, p: 75, c: 60, o: 80, evaluated: true });
    };

    const saveContext = () => {
        onUpdateProject(project.id, 'war', { r, s, p, c, o, evaluated: warEvaluated });
        onUpdateProject(project.id, 'crApproved', crApproved);
        alert("Post-Live Governance Data Saved.");
    };

    // ==========================================
    // 4. HARD-BLOCK ARCHIVE LOGIC
    // ==========================================
    const score = warEvaluated ? Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5) : 0;
    const isCertified = score >= 80;
    
    // The Ultimate Gate: Must be WAR Certified AND (Not require a CR OR have the CR Approved)
    const canArchive = isCertified && (!requiresCR || crApproved);

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12 space-y-6">
            
            {/* Header Area */}
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center rounded-2xl gap-4 shadow-sm">
                <div>
                    <h3 className="font-black text-lg tracking-wide text-slate-800">
                        <i className="fas fa-award text-amber-500 mr-2"></i> Step 5: Post-Live Governance
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">3-Way Reconciliation & Well-Architected Framework Sign-Off.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={saveContext} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">
                        Save State
                    </button>
                    {isCurrent && (
                        <button
                            onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}}
                            disabled={!canArchive}
                            className="w-full md:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 disabled:shadow-none text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-all flex items-center justify-center border border-amber-600"
                            title={!canArchive ? "Resolve WAR Score or Change Requests before archiving" : "Archive Project"}
                        >
                            Archive Project <i className="fas fa-check-double ml-2"></i>
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* ========================================== */}
                {/* MODULE 1: 3-WAY RECONCILIATION & CR        */}
                {/* ========================================== */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-black text-base text-slate-800"><i className="fas fa-balance-scale text-indigo-500 mr-2"></i> 3-Way Infrastructure Diff</h3>
                        <button 
                            onClick={runFinalNocScan} 
                            disabled={isScanningNoc}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center"
                        >
                            {isScanningNoc ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning</> : <><i className="fas fa-radar mr-2"></i> Run Final NOC Scan</>}
                        </button>
                    </div>

                    <div className="p-6 flex-1 space-y-6">
                        {!hasNocScanned ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                                <i className="fas fa-search-dollar text-6xl mb-4 opacity-30"></i>
                                <h3 className="font-black text-lg">Awaiting Final Cloud Scan</h3>
                                <p className="text-xs font-medium mt-2 max-w-sm text-center">Run the Final NOC Scan to verify exactly what was built in Huawei Cloud against the original Sales Quotation.</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in space-y-6">
                                {/* The Diff Table */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-100 text-[10px] uppercase text-slate-500">
                                            <tr>
                                                <th className="p-3">Resource Type</th>
                                                <th className="p-3 text-center border-l border-slate-200 bg-slate-50">1. As-Is (MgC)</th>
                                                <th className="p-3 text-center border-l border-slate-200 bg-blue-50/50">2. To-Be (SOW)</th>
                                                <th className="p-3 text-center border-l border-slate-200 bg-emerald-50/50">3. Actual Built (NOC)</th>
                                                <th className="p-3 text-center border-l border-slate-200 font-black text-slate-800">Delta (Actual - SOW)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            <tr>
                                                <td className="p-3 font-bold text-slate-700"><i className="fas fa-server text-slate-400 w-5"></i> Compute</td>
                                                <td className="p-3 text-center font-mono text-slate-500 border-l border-slate-100 bg-slate-50">{asIsCompute}</td>
                                                <td className="p-3 text-center font-mono font-bold text-blue-700 border-l border-slate-100 bg-blue-50/30">{quotedCompute}</td>
                                                <td className="p-3 text-center font-mono font-black text-emerald-700 border-l border-slate-100 bg-emerald-50/30">{actualCompute}</td>
                                                <td className="p-3 text-center border-l border-slate-100">
                                                    <span className={`px-2 py-1 rounded text-xs font-black ${computeCreep > 0 ? 'bg-rose-100 text-rose-700' : computeCreep < 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {computeCreep > 0 ? `+${computeCreep}` : computeCreep}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-bold text-slate-700"><i className="fas fa-database text-slate-400 w-5"></i> Databases</td>
                                                <td className="p-3 text-center font-mono text-slate-500 border-l border-slate-100 bg-slate-50">{asIsDb}</td>
                                                <td className="p-3 text-center font-mono font-bold text-blue-700 border-l border-slate-100 bg-blue-50/30">{quotedDb}</td>
                                                <td className="p-3 text-center font-mono font-black text-emerald-700 border-l border-slate-100 bg-emerald-50/30">{actualDb}</td>
                                                <td className="p-3 text-center border-l border-slate-100">
                                                    <span className={`px-2 py-1 rounded text-xs font-black ${dbCreep > 0 ? 'bg-rose-100 text-rose-700' : dbCreep < 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {dbCreep > 0 ? `+${dbCreep}` : dbCreep}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Formal Change Request (CR) Process Gate */}
                                {requiresCR ? (
                                    <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-6 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                                        <h4 className="font-black text-rose-800 text-lg mb-2"><i className="fas fa-exclamation-triangle mr-2"></i> Scope Creep Detected</h4>
                                        <p className="text-xs text-rose-700 font-medium mb-5 leading-relaxed">
                                            The Actual Built infrastructure exceeds the signed Statement of Work. To protect delivery margins, a formal Change Request (CR) must be approved by the customer to true-up the final recurring billing.
                                        </p>
                                        
                                        <label className="flex items-start gap-4 p-4 bg-white border border-rose-200 rounded-xl cursor-pointer hover:border-rose-400 transition-colors shadow-sm">
                                            <input 
                                                type="checkbox" 
                                                checked={crApproved} 
                                                onChange={(e) => setCrApproved(e.target.checked)} 
                                                className="w-5 h-5 accent-rose-600 mt-0.5" 
                                            />
                                            <div>
                                                <div className="font-black text-slate-800 text-sm">Change Request (CR) Customer Approval</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">I certify the customer has signed the true-up agreement.</div>
                                            </div>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xl shrink-0"><i className="fas fa-check-circle"></i></div>
                                        <div>
                                            <h4 className="font-black text-emerald-800 text-sm">Financial Scope Validated</h4>
                                            <p className="text-xs text-emerald-700 font-medium">Built infrastructure aligns with the signed Quotation/SOW. No CR required.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ========================================== */}
                {/* MODULE 2: AUTOMATED WAR SCORECARD          */}
                {/* ========================================== */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-black text-base text-slate-800"><i className="fas fa-clipboard-check text-amber-500 mr-2"></i> Well-Architected Framework</h3>
                        <button 
                            onClick={autoEvaluateWAR} 
                            disabled={!hasNocScanned}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500"
                            title={!hasNocScanned ? "Run NOC Scan First" : "Evaluate APIs"}
                        >
                            <i className="fas fa-magic mr-2"></i> Auto-Evaluate via API
                        </button>
                    </div>

                    <div className="p-6 flex flex-col sm:flex-row gap-8">
                        {/* The Sliders */}
                        <div className="flex-1 space-y-6">
                            {!warEvaluated && (
                                <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 bg-amber-50 p-2 rounded border border-amber-200 text-center">
                                    Pending Baseline Evaluation
                                </div>
                            )}
                            
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Resilience (HA/DR)</label><span className="text-blue-600 font-black text-xs">{r}%</span></div><input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer disabled:opacity-50" /></div>
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Security & Compliance</label><span className="text-rose-600 font-black text-xs">{s}%</span></div><input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer disabled:opacity-50" /></div>
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Performance</label><span className="text-purple-600 font-black text-xs">{p}%</span></div><input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer disabled:opacity-50" /></div>
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Cost Optimization</label><span className="text-emerald-600 font-black text-xs">{c}%</span></div><input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer disabled:opacity-50" /></div>
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Operational Ops</label><span className="text-slate-600 font-black text-xs">{o}%</span></div><input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer disabled:opacity-50" /></div>
                            
                            {warEvaluated && (
                                <p className="text-[9px] text-slate-400 font-bold mt-2">
                                    <i className="fas fa-info-circle mr-1"></i> Principal Architect may manually override API baselines to account for business context.
                                </p>
                            )}
                        </div>

                        {/* The Certification Scorecard */}
                        <div className={`sm:w-48 shrink-0 rounded-2xl border-4 flex flex-col items-center justify-center text-center shadow-sm transition-colors duration-500 p-4 ${!warEvaluated ? 'bg-slate-50 border-slate-200' : isCertified ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-300'}`}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Final Score</h4>
                            <div className={`text-6xl font-black tracking-tighter ${!warEvaluated ? 'text-slate-300' : isCertified ? 'text-amber-500' : 'text-slate-700'}`}>
                                {score}
                            </div>
                            <div className={`mt-4 w-full py-2 rounded-lg font-black uppercase tracking-widest text-[9px] border-2 shadow-sm ${!warEvaluated ? 'bg-slate-200 text-slate-400 border-slate-300' : isCertified ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-300'}`}>
                                {!warEvaluated ? 'Pending API' : isCertified ? 'Certified' : 'Remediate'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
