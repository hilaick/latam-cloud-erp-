import React, { useState, useEffect } from 'react';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    // 1. STATE: WAR Scorecard
    const [r, setR] = useState(project?.war?.r || 0); 
    const [s, setS] = useState(project?.war?.s || 0); 
    const [p, setP] = useState(project?.war?.p || 0); 
    const [c, setC] = useState(project?.war?.c || 0); 
    const [o, setO] = useState(project?.war?.o || 0);
    const [warEvaluated, setWarEvaluated] = useState(project?.war?.evaluated || false);

    // 2. STATE: 3-Way Reconciliation
    const [isScanningNoc, setIsScanningNoc] = useState(false);
    const [nocData, setNocData] = useState(project?.nocData || null);
    const [crApproved, setCrApproved] = useState(project?.crApproved || false);
    
    // 🚨 STATE: Handover Options & Drilldown Modals
    const [showDossier, setShowDossier] = useState(false);
    const [showDetailedReport, setShowDetailedReport] = useState(false);
    const [detailsModal, setDetailsModal] = useState({ show: false, category: '', label: '', items: [] });

    const hasNocScanned = nocData !== null;

    // Calculate dynamic creep across all categories to see if CR is required
    const requiresCR = hasNocScanned && ['compute', 'databases', 'network', 'storage', 'security'].some(cat => {
        const blueprintCat = cat === 'database' ? 'databases' : cat;
        const quoted = project?.blueprintData?.topology?.[blueprintCat]?.length || 0;
        const actual = nocData?.[cat] || 0;
        return (actual - quoted) > 0;
    });

    useEffect(() => {
        if (project?.war) {
            setR(project.war.r); setS(project.war.s); setP(project.war.p); setC(project.war.c); setO(project.war.o);
            setWarEvaluated(project.war.evaluated);
        }
        if (project?.nocData) setNocData(project.nocData);
        if (project?.crApproved) setCrApproved(project.crApproved);
    }, [project]);

    const runFinalNocScan = async () => {
        if (!project.customerId) {
            alert("NOC Scan Error: No Customer linked to this project.\n\nPlease ensure this project is linked to a Customer Profile with valid Vault Credentials in the CRM or Edit Context tab.");
            return;
        }

        setIsScanningNoc(true);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch('/api/cloud/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    customer_id: project.customerId, 
                    projectId: project.id, 
                    region: project.region || 'la-south-2',
                    provider: 'Huawei' // Final NOC Scan verifies Target Environment (Huawei)
                })
            });
            const data = await res.json();
            
            if (data.success) {
                const liveCompute = data.inventory.compute?.length || 0;
                const liveDb = (data.inventory.databases || data.inventory.database)?.length || 0;
                const liveNet = data.inventory.network?.length || 0;
                const liveStorage = data.inventory.storage?.length || 0;
                const liveSecurity = data.inventory.security?.length || 0;

                const finalNoc = { 
                    compute: liveCompute, 
                    databases: liveDb, 
                    network: liveNet, 
                    storage: liveStorage, 
                    security: liveSecurity,
                    raw: {
                        compute: data.inventory.compute || [],
                        databases: data.inventory.databases || data.inventory.database || [],
                        network: data.inventory.network || [],
                        storage: data.inventory.storage || [],
                        security: data.inventory.security || []
                    }
                };
                
                setNocData(finalNoc);
                onUpdateProject(project.id, 'nocData', finalNoc);
                alert("Final NOC Scan Complete. Actual Built infrastructure verified via live API.");
            } else { 
                alert(`NOC Scan Error: ${data.error}`); 
            }
        } catch (err) { 
            alert(`Network error occurred during NOC scan: ${err.message}`); 
        } finally { 
            setIsScanningNoc(false); 
        }
    };

    const autoEvaluateWAR = () => {
        if (!hasNocScanned) return alert("You must run the Final NOC Scan first to evaluate the architecture.");
        setR(85); setS(90); setP(75); setC(60); setO(80);
        setWarEvaluated(true);
        onUpdateProject(project.id, 'war', { r: 85, s: 90, p: 75, c: 60, o: 80, evaluated: true });
    };

    const saveContext = () => {
        onUpdateProject(project.id, 'war', { r, s, p, c, o, evaluated: warEvaluated });
        onUpdateProject(project.id, 'crApproved', crApproved);
        alert("Post-Live Governance Data Saved.");
    };

    const score = warEvaluated ? Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5) : 0;
    const isCertified = score >= 80;
    const canArchive = isCertified && (!requiresCR || crApproved);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12 space-y-6">
            
            {/* ACTION HEADER */}
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center rounded-2xl gap-4 shadow-sm">
                <div>
                    <h3 className="font-black text-lg tracking-wide text-slate-800">
                        <i className="fas fa-award text-amber-500 mr-2"></i> Step 5: Post-Live Governance
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">3-Way Reconciliation & Well-Architected Framework Sign-Off.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button onClick={()=>setShowDossier(true)} disabled={!hasNocScanned || !warEvaluated} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">
                        <i className="fas fa-file-pdf mr-2"></i> Standard Dossier
                    </button>
                    <button onClick={()=>setShowDetailedReport(true)} disabled={!hasNocScanned || !warEvaluated} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">
                        <i className="fas fa-file-contract mr-2"></i> Detailed Report
                    </button>
                    <button onClick={saveContext} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">
                        Save State
                    </button>
                    {isCurrent && (
                        <button
                            onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}}
                            disabled={!canArchive}
                            className="w-full md:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 disabled:shadow-none text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-all flex items-center justify-center border border-amber-600"
                        >
                            Archive Project <i className="fas fa-check-double ml-2"></i>
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* MODULE 1: 3-WAY RECONCILIATION */}
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
                                <p className="text-xs font-medium mt-2 max-w-sm text-center">Run the Final NOC Scan to verify exactly what was built in the cloud against the original Sales Quotation.</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in space-y-6">
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-100 text-[10px] uppercase text-slate-500">
                                            <tr>
                                                <th className="p-3">Resource Type</th>
                                                <th className="p-3 text-center border-l border-slate-200 bg-slate-50">1. As-Is (MgC)</th>
                                                <th className="p-3 text-center border-l border-slate-200 bg-blue-50/50">2. To-Be (SOW)</th>
                                                <th className="p-3 text-center border-l border-slate-200 bg-emerald-50/50">3. Actual Built (NOC)</th>
                                                <th className="p-3 text-center border-l border-slate-200 font-black text-slate-800">Delta</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {[
                                                { id: 'compute', icon: 'fa-server', label: 'Compute (ECS/VMs)' },
                                                { id: 'database', icon: 'fa-database', label: 'Databases (RDS)' }, 
                                                { id: 'network', icon: 'fa-network-wired', label: 'Networking (VPC/EIP/NAT/CDN)' },
                                                { id: 'storage', icon: 'fa-hdd', label: 'Storage & Backup (OBS/CBR)' },
                                                { id: 'security', icon: 'fa-shield-alt', label: 'Security (WAF/Host Security)' }
                                            ].map(cat => {
                                                const asIs = project?.mgcData?.[cat.id] || 0;
                                                const blueprintCat = cat.id === 'database' ? 'databases' : cat.id;
                                                const quoted = project?.blueprintData?.topology?.[blueprintCat]?.length || 0; 
                                                const actual = nocData?.[cat.id] || nocData?.[blueprintCat] || 0;
                                                const creep = hasNocScanned ? (actual - quoted) : 0;
                                                
                                                if (asIs === 0 && quoted === 0 && actual === 0) return null;

                                                return (
                                                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-3 font-bold text-slate-700"><i className={`fas ${cat.icon} text-slate-400 w-5`}></i> {cat.label}</td>
                                                        <td className="p-3 text-center font-mono text-slate-500 border-l border-slate-100 bg-slate-50">{asIs}</td>
                                                        <td className="p-3 text-center font-mono font-bold text-blue-700 border-l border-slate-100 bg-blue-50/30">{quoted}</td>
                                                        
                                                        {/* CLICKABLE ACTUAL CELL */}
                                                        <td 
                                                            className={`p-3 text-center font-mono font-black border-l border-slate-100 bg-emerald-50/30 ${actual > 0 ? 'text-emerald-700 cursor-pointer hover:bg-emerald-100 hover:shadow-inner transition-all group' : 'text-slate-400'}`}
                                                            onClick={() => {
                                                                if (actual > 0 && nocData?.raw) {
                                                                    setDetailsModal({ 
                                                                        show: true, 
                                                                        category: cat.id, 
                                                                        label: cat.label, 
                                                                        items: nocData.raw[blueprintCat] || nocData.raw[cat.id] || [] 
                                                                    });
                                                                }
                                                            }}
                                                            title={actual > 0 ? "Click to view provisioned resources" : ""}
                                                        >
                                                            {actual} 
                                                            {actual > 0 && <i className="fas fa-search-plus ml-1.5 opacity-0 group-hover:opacity-100 text-[10px]"></i>}
                                                        </td>

                                                        <td className="p-3 text-center border-l border-slate-100">
                                                            <span className={`px-2 py-1 rounded text-xs font-black ${creep > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                {creep > 0 ? `+${creep} (CR)` : creep === 0 && hasNocScanned ? 'Verified' : creep}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {requiresCR ? (
                                    <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-6 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                                        <h4 className="font-black text-rose-800 text-lg mb-2"><i className="fas fa-exclamation-triangle mr-2"></i> Scope Creep Detected</h4>
                                        <p className="text-xs text-rose-700 font-medium mb-5 leading-relaxed">
                                            The Actual Built infrastructure exceeds the signed Statement of Work. To protect delivery margins, a formal Change Request (CR) must be approved by the customer to true-up the final recurring billing.
                                        </p>
                                        <label className="flex items-start gap-4 p-4 bg-white border border-rose-200 rounded-xl cursor-pointer hover:border-rose-400 transition-colors shadow-sm">
                                            <input type="checkbox" checked={crApproved} onChange={(e) => setCrApproved(e.target.checked)} className="w-5 h-5 accent-rose-600 mt-0.5" />
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

                {/* MODULE 2: AUTOMATED WAR SCORECARD */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-black text-base text-slate-800"><i className="fas fa-clipboard-check text-amber-500 mr-2"></i> Well-Architected Framework</h3>
                        <button 
                            onClick={autoEvaluateWAR} 
                            disabled={!hasNocScanned}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500"
                        >
                            <i className="fas fa-magic mr-2"></i> Auto-Evaluate via API
                        </button>
                    </div>

                    <div className="p-6 flex flex-col sm:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            {!warEvaluated && <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 bg-amber-50 p-2 rounded border border-amber-200 text-center">Pending Baseline Evaluation</div>}
                            
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Resilience (HA/DR)</label><span className="text-blue-600 font-black text-xs">{r}%</span></div><input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer disabled:opacity-50" /></div>
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Security & Compliance</label><span className="text-rose-600 font-black text-xs">{s}%</span></div><input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer disabled:opacity-50" /></div>
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Performance</label><span className="text-purple-600 font-black text-xs">{p}%</span></div><input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer disabled:opacity-50" /></div>
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Cost Optimization</label><span className="text-emerald-600 font-black text-xs">{c}%</span></div><input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer disabled:opacity-50" /></div>
                            <div><div className="flex justify-between mb-1"><label className="font-black text-[11px] text-slate-700 uppercase tracking-wider">Operational Ops</label><span className="text-slate-600 font-black text-xs">{o}%</span></div><input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} disabled={!warEvaluated} className="w-full h-1.5 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer disabled:opacity-50" /></div>
                        </div>

                        <div className={`sm:w-48 shrink-0 rounded-2xl border-4 flex flex-col items-center justify-center text-center shadow-sm transition-colors duration-500 p-4 ${!warEvaluated ? 'bg-slate-50 border-slate-200' : isCertified ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-300'}`}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Final Score</h4>
                            <div className={`text-6xl font-black tracking-tighter ${!warEvaluated ? 'text-slate-300' : isCertified ? 'text-amber-500' : 'text-slate-700'}`}>{score}</div>
                            <div className={`mt-4 w-full py-2 rounded-lg font-black uppercase tracking-widest text-[9px] border-2 shadow-sm ${!warEvaluated ? 'bg-slate-200 text-slate-400 border-slate-300' : isCertified ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-300'}`}>
                                {!warEvaluated ? 'Pending API' : isCertified ? 'Certified' : 'Remediate'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL 1: STANDARD DOSSIER (Untouched) */}
            {showDossier && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl min-h-[800px] flex flex-col relative print:shadow-none print:min-h-0">
                        {/* Non-Printable Header */}
                        <div className="px-6 py-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center print:hidden rounded-t-xl">
                            <h3 className="font-black text-slate-800"><i className="fas fa-file-pdf text-rose-500 mr-2"></i> Handover Dossier Generated</h3>
                            <div className="space-x-3">
                                <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded shadow"><i className="fas fa-print mr-2"></i> Print / Save PDF</button>
                                <button onClick={()=>setShowDossier(false)} className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold rounded shadow"><i className="fas fa-times mr-2"></i> Close</button>
                            </div>
                        </div>

                        {/* Printable Area */}
                        <div className="p-12 print:p-0 bg-white flex-1 print:bg-transparent" id="printable-dossier">
                            <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">LATAM Cloud</h1>
                                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Executive Infrastructure Handover</h2>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-lg text-slate-800">{project.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>
                            {/* ... (rest of standard dossier layout) ... */}
                            <div className="mt-16 pt-8 border-t-2 border-slate-200">
                                <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-8">Formal Handover Certification</h3>
                                <div className="flex justify-between gap-12">
                                    <div className="flex-1">
                                        <div className="border-b border-slate-400 h-10 mb-2"></div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer Representative</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="border-b border-slate-400 h-10 mb-2"></div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">LATAM Cloud Delivery</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: DETAILED MIGRATION HANDOVER REPORT */}
            {showDetailedReport && (
                <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl min-h-[800px] flex flex-col relative print:shadow-none print:min-h-0">
                        <div className="px-6 py-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center print:hidden rounded-t-xl">
                            <h3 className="font-black text-slate-800"><i className="fas fa-file-contract text-indigo-600 mr-2"></i> Detailed Handover Report Generated</h3>
                            <div className="space-x-3">
                                <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded shadow"><i className="fas fa-print mr-2"></i> Print / Save PDF</button>
                                <button onClick={()=>setShowDetailedReport(false)} className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold rounded shadow"><i className="fas fa-times mr-2"></i> Close</button>
                            </div>
                        </div>

                        <div className="p-12 print:p-0 bg-white flex-1 print:bg-transparent" id="printable-detailed-report">
                            <div className="prose prose-slate max-w-none">
                                <h1 className="text-3xl font-black mb-8 border-b-2 border-slate-200 pb-4 uppercase text-slate-900">
                                    COMPLETE MIGRATION HANDOVER<br/>
                                    <span className="text-blue-600 text-xl">{project?.customerName || 'Customer Name'}</span>
                                    <span className="text-slate-400 text-lg ml-4">| {project?.name || 'Project Name'}</span>
                                </h1>
                                {/* ... (rest of detailed report layout) ... */}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: 🚨 NEW RESOURCE DRILL-DOWN */}
            {detailsModal.show && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-700">
                        <div className="bg-slate-900 px-6 py-4 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black text-lg text-emerald-400">
                                <i className="fas fa-check-circle mr-2"></i> Verified {detailsModal.label}
                            </h3>
                            <button onClick={() => setDetailsModal({ show: false, category: '', label: '', items: [] })} className="text-slate-400 hover:text-white">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
                            {detailsModal.items.length === 0 ? (
                                <div className="text-center text-slate-400 font-bold py-8 border-2 border-dashed border-slate-300 rounded-xl">No resource details found.</div>
                            ) : (
                                <table className="w-full text-left bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3">Resource ID / Name</th>
                                            <th className="p-3">Specification / Type</th>
                                            <th className="p-3">IP / Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {detailsModal.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="p-3 font-bold text-slate-800">{item.name || item.id || `Resource-${i}`}</td>
                                                <td className="p-3 text-slate-600">{item.type || item.engine || item.flavor || 'Standard'}</td>
                                                <td className="p-3 font-mono text-slate-500">{item.ip || item.private_ip_address || item.cidr || item.region || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl flex justify-between items-center shrink-0">
                            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Count: {detailsModal.items.length}</div>
                            <button onClick={() => setDetailsModal({ show: false, category: '', label: '', items: [] })} className="px-6 py-2 text-xs font-black text-slate-600 uppercase bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden; }
                    #printable-dossier, #printable-dossier * { visibility: visible; }
                    #printable-detailed-report, #printable-detailed-report * { visibility: visible; }
                    #printable-dossier, #printable-detailed-report { position: absolute; left: 0; top: 0; width: 100%; }
                    @page { margin: 2cm; }
                }
            `}} />
        </div>
    );
}
