import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('diff');

    return (
        <div className="animate-fade-in pb-12">
            
            <div className="mb-8 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-4 md:px-8">
                <div>
                    <h3 className="font-black text-2xl text-slate-800"><i className="fas fa-award text-amber-500 mr-3"></i> Step 5: Post-Live Governance</h3>
                    <p className="text-sm text-slate-500 mt-2">3-Way Reconciliation, Digital Twin mapping, and Commercial Handover.</p>
                </div>
            </div>

            <div className="px-4 md:px-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
                <button onClick={() => setSubTab('diff')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'diff' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-balance-scale mr-2"></i> 1. 3-Way Diff Matrix</button>
                <button onClick={() => setSubTab('constellation')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'constellation' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-meteor mr-2"></i> 2. Target Constellation</button>
                <button onClick={() => setSubTab('war')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'war' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-shield-alt mr-2"></i> 3. WAR Sign-Off</button>
                <button onClick={() => setSubTab('commercial')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'commercial' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'}`}><i className="fas fa-shopping-cart mr-2"></i> 4. Commercial True-Up</button>
            </div>
            
            <div className="px-4 md:px-8">
                {subTab === 'diff' && <PhaseThreeWayDiff project={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'constellation' && <LiveConstellationView activeProject={project} />}
                {subTab === 'war' && <PhasePostLive activeProject={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'commercial' && <CommercialTrueUpView activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}

// ==========================================
// 🚨 4. COMMERCIAL TRUE-UP (THE EXIT GATE)
// ==========================================
function CommercialTrueUpView({ activeProject, onUpdateProject }) {
    const [isLoading, setIsLoading] = useState(false);
    const [matrix, setMatrix] = useState(null);
    const [activeSubsStatus, setActiveSubsStatus] = useState(null);
    
    // File Upload States
    const [isUploading, setIsUploading] = useState(false);
    const [riQuotationSummary, setRIQuotationSummary] = useState(activeProject?.data ? JSON.parse(activeProject.data)?.ri_quotation?.summary : null);
    const [consoleRISummary, setConsoleRISummary] = useState(activeProject?.data ? JSON.parse(activeProject.data)?.console_ri_export : null);

    const handleRunTrueUp = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('erp_jwt_token'); 
            const res = await fetch('/api/finops/ecs-ri-reconciliation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ projectId: activeProject.id })
            });
            const data = await res.json();
            if (data.success) {
                // 🚨 FIX: Extract exactly the array, avoiding the object crash
                setMatrix(data.reconciliation.matrix || []);
                if (data.active_subs_status) setActiveSubsStatus(data.active_subs_status);
            } else {
                alert(`Error reconciling ECS RI Matrix: ${data.error}`);
            }
        } catch (err) {
            alert(`Network error during ECS RI Reconciliation: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (file, endpoint) => {
        if (!file) return;
        setIsUploading(true);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', activeProject.id);
        
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                if (endpoint.includes('console')) {
                    setConsoleRISummary(data.summary);
                } else {
                    setRIQuotationSummary(data.summary);
                }
                if (matrix) handleRunTrueUp(); // Refresh if matrix is active
            } else {
                alert(`Error uploading file: ${data.error}`);
            }
        } catch (err) {
            alert(`Network error: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleHandover = () => {
        onUpdateProject(activeProject.id, 'lifecycleState', '5_awaiting_commercial');
        alert("Success! The project has been marked Technically Complete. Delivery SLA timer stopped. The project is now owned by the Commercial/Partner team for final PO True-Up.");
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6 border-b border-emerald-100 pb-6">
                    <div>
                        <h4 className="font-black text-xl text-emerald-800 flex items-center">
                            <i className="fas fa-shopping-cart text-emerald-500 mr-3"></i> Procurement & PO Handover
                        </h4>
                        <p className="text-xs font-bold text-emerald-600/70 mt-1 uppercase tracking-widest max-w-2xl">
                            Compare ECS Reserved Instances (RIs) Quoted vs Live vs Bought.
                        </p>
                    </div>
                    <button 
                        onClick={() => handleRunTrueUp()} 
                        disabled={isLoading}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center shrink-0"
                    >
                        {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Reconciling...</> : <><i className="fas fa-sync-alt mr-2"></i> Run Reconciler</>}
                    </button>
                </div>

                {/* TWIN UPLOAD PANELS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    
                    {/* 1. QUOTED RIs */}
                    <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500 opacity-5 rounded-bl-full transform translate-x-4 -translate-y-4"></div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h5 className="font-black text-sm text-blue-800 flex items-center">
                                    <i className="fas fa-calculator text-blue-500 mr-2"></i> 1. Source: Quoted RIs
                                </h5>
                                <p className="text-[10px] text-blue-600/80 mt-1 font-medium mb-4">Upload the Price Calculator RI spreadsheet.</p>
                            </div>
                            <button onClick={() => document.getElementById('ri-quotation-upload').click()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                <i className="fas fa-upload mr-1.5"></i> Upload Baseline
                            </button>
                            <input type="file" id="ri-quotation-upload" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e.target.files[0], '/api/finops/upload-ri-quotation')} />
                        </div>
                        
                        {riQuotationSummary ? (
                            <div className="mt-2 p-3 bg-white rounded-lg border border-blue-100 shadow-sm flex justify-between items-center animate-fade-in">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><i className="fas fa-check text-blue-500 mr-1"></i> Data Loaded</div>
                                <div className="text-xs font-black text-blue-700">{riQuotationSummary.total_ris} RIs required by Baseline</div>
                            </div>
                        ) : (
                            <div className="mt-2 p-3 border border-dashed border-blue-300 rounded-lg text-center text-[10px] font-black uppercase text-blue-400">No data loaded</div>
                        )}
                    </div>

                    {/* 2. BOUGHT RIs (Console Export) */}
                    <div className="p-5 bg-purple-50 border border-purple-200 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500 opacity-5 rounded-bl-full transform translate-x-4 -translate-y-4"></div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h5 className="font-black text-sm text-purple-800 flex items-center">
                                    <i className="fas fa-cloud-download-alt text-purple-500 mr-2"></i> 2. Source: Bought RIs
                                </h5>
                                <p className="text-[10px] text-purple-600/80 mt-1 font-medium mb-4">Export the Active RI list from Huawei ECS Console.</p>
                            </div>
                            <button onClick={() => document.getElementById('console-ri-upload').click()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                <i className="fas fa-upload mr-1.5"></i> Upload
                            </button>
                            <input type="file" id="console-ri-upload" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e.target.files[0], '/api/finops/upload-console-ris')} />
                        </div>
                        
                        {consoleRISummary ? (
                            <div className="mt-2 p-3 bg-white rounded-lg border border-purple-100 shadow-sm flex justify-between items-center animate-fade-in">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><i className="fas fa-check text-purple-500 mr-1"></i> Data Loaded</div>
                                <div className="text-xs font-black text-purple-700">{consoleRISummary.total_ris} Active RIs Owned</div>
                            </div>
                        ) : (
                            <div className="mt-2 p-3 border border-dashed border-purple-300 rounded-lg text-center text-[10px] font-black uppercase text-purple-400">No data loaded</div>
                        )}
                    </div>

                </div>

                {isUploading && <div className="text-center py-4 text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse"><i className="fas fa-circle-notch fa-spin mr-2"></i> Processing File...</div>}

                {!matrix ? (
                    <div className="text-center py-12 text-emerald-300 border-2 border-dashed border-emerald-100 rounded-2xl">
                        <i className="fas fa-balance-scale-right text-5xl mb-4 opacity-40"></i>
                        <h3 className="font-black text-lg text-emerald-700">Awaiting Cross-Reconciliation</h3>
                        <p className="text-xs font-medium mt-2 text-emerald-600/60 max-w-md mx-auto">Upload the Quote and Console CSVs above, then run the Reconciler to calculate exactly which specifications are missing coverage.</p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {/* Status Grid */}
                        {activeSubsStatus && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center border-r border-slate-200">
                                        <div className="text-3xl font-black text-blue-600">{activeSubsStatus.total_quoted || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Quoted RIs</div>
                                    </div>
                                    <div className="text-center border-r border-slate-200">
                                        <div className="text-3xl font-black text-emerald-600">{activeSubsStatus.total_live || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Live ECS Nodes</div>
                                    </div>
                                    <div className="text-center border-r border-slate-200">
                                        <div className="text-3xl font-black text-purple-600">{activeSubsStatus.total_bought || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-purple-500 mt-1">Bought RIs (Owned)</div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-3xl font-black ${activeSubsStatus.total_missing > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{activeSubsStatus.total_missing || 0}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${activeSubsStatus.total_missing > 0 ? 'text-rose-500' : 'text-slate-400'}`}>Missing RIs (Deficit)</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Detail Matrix */}
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-3 border-b border-slate-200 pb-2">Procurement Action Matrix (By Specification)</h4>
                            <table className="w-full text-left bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                                    <tr>
                                        <th className="p-3">Specification / Flavor</th>
                                        <th className="p-3 text-center bg-blue-50/50">Required (Quoted)</th>
                                        <th className="p-3 text-center bg-emerald-50/50">Running (Live ECS)</th>
                                        <th className="p-3 text-center bg-purple-50/50">Owned (RIs)</th>
                                        <th className="p-3 text-center">Status / Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {matrix.map((asset, i) => {
                                        const missing = asset.quoted_count - asset.bought_count;
                                        return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-slate-800 font-mono font-bold text-xs">{asset.specification}</td>
                                            <td className="p-3 text-center font-black text-blue-700 bg-blue-50/30">{asset.quoted_count}</td>
                                            <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/30">{asset.live_count}</td>
                                            <td className="p-3 text-center font-black text-purple-700 bg-purple-50/30">{asset.bought_count}</td>
                                            <td className="p-3 text-center">
                                                {missing <= 0 ? (
                                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest"><i className="fas fa-check-circle mr-1"></i> Covered</span>
                                                ) : (
                                                    <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm"><i className="fas fa-exclamation-triangle mr-1"></i> Buy {missing}x RI</span>
                                                )}
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="bg-slate-800 p-6 rounded-xl flex justify-between items-center shadow-lg mt-8">
                            <div>
                                <h4 className="font-black text-white text-lg">Delivery Exit Gate</h4>
                                <p className="text-slate-400 text-xs mt-1">Export this True-Up Matrix for Procurement, close technical execution, and shift accountability to Sales.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => window.print()} className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-md border border-slate-600">
                                    <i className="fas fa-file-pdf mr-2"></i> Export Shopping List
                                </button>
                                <button onClick={handleHandover} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-md border border-emerald-400">
                                    Mark Technically Complete <i className="fas fa-arrow-right ml-2"></i>
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// ⚖️ 1. 3-WAY INFRASTRUCTURE DIFF
// ==========================================
function PhaseThreeWayDiff({ project, onUpdateProject }) {
    const [isScanningNoc, setIsScanningNoc] = useState(false);
    const [nocData, setNocData] = useState(project?.nocData || null);
    const [crApproved, setCrApproved] = useState(project?.crApproved || false);
    const [detailsModal, setDetailsModal] = useState({ show: false, category: '', label: '', items: [] });
    const hasNocScanned = nocData !== null;

    const liveCategories = useMemo(() => {
        if (!hasNocScanned || !nocData?.raw) return [];
        const normalized = {
            compute: [...(nocData.raw.compute || []), ...(nocData.raw.ecs || []), ...(nocData.raw.server || [])],
            databases: [...(nocData.raw.databases || []), ...(nocData.raw.database || []), ...(nocData.raw.rds || [])],
            network: [...(nocData.raw.network || []), ...(nocData.raw.vpc || []), ...(nocData.raw.eip || []), ...(nocData.raw.nat || [])],
            storage: [...(nocData.raw.storage || []), ...(nocData.raw.obs || []), ...(nocData.raw.cbr || [])],
            security: [...(nocData.raw.security || []), ...(nocData.raw.waf || [])]
        };
        return Object.keys(normalized).map(key => ({
            id: key, label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '), count: normalized[key].length, items: normalized[key]
        })).filter(cat => cat.count > 0);
    }, [nocData, hasNocScanned]);

    const requiresCR = hasNocScanned && liveCategories.some(cat => {
        const quoted = project?.blueprintData?.topology?.[cat.id]?.length || 0;
        return (cat.count - quoted) > 0;
    });

    const runFinalNocScan = async () => {
        setIsScanningNoc(true);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch('/api/cloud/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customer_id: project.customerId, projectId: project.id, provider: 'Huawei' })
            });
            const data = await res.json();
            if (data.success) {
                const finalNoc = { raw: data.inventory || {} };
                setNocData(finalNoc);
                onUpdateProject(project.id, 'nocData', finalNoc);
            } else alert(`NOC Scan Error: ${data.error}`); 
        } catch (err) { alert(`Network error: ${err.message}`); } finally { setIsScanningNoc(false); }
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-black text-base text-slate-800"><i className="fas fa-search text-indigo-500 mr-2"></i> Telemetry Scan Engine</h3>
                    <button onClick={runFinalNocScan} disabled={isScanningNoc} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center">
                        {isScanningNoc ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning Target API</> : <><i className="fas fa-radar mr-2"></i> Run Final NOC Scan</>}
                    </button>
                </div>
                <div className="p-6 flex-1 space-y-6">
                    {!hasNocScanned ? (
                        <div className="text-center text-slate-400 py-16"><i className="fas fa-search-dollar text-6xl mb-4 opacity-30"></i><h3 className="font-black text-lg">Awaiting Final Cloud Scan</h3></div>
                    ) : (
                        <table className="w-full text-left text-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <thead className="bg-slate-100 text-[10px] uppercase text-slate-500">
                                <tr>
                                    <th className="p-3">Resource Category</th>
                                    <th className="p-3 text-center border-l border-slate-200 bg-slate-50">1. As-Is (Source)</th>
                                    <th className="p-3 text-center border-l border-slate-200 bg-blue-50/50">2. To-Be (Quoted)</th>
                                    <th className="p-3 text-center border-l border-slate-200 bg-emerald-50/50">3. Built (NOC)</th>
                                    <th className="p-3 text-center border-l border-slate-200 font-black">Delta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {liveCategories.map(cat => {
                                    const asIs = project?.mgcData?.[cat.id] || 0;
                                    const quoted = project?.blueprintData?.topology?.[cat.id]?.length || 0; 
                                    const actual = cat.count;
                                    const creep = actual - quoted;
                                    return (
                                        <tr key={cat.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold text-slate-700 uppercase tracking-wider text-xs">{cat.label}</td>
                                            <td className="p-3 text-center font-mono text-slate-500 bg-slate-50">{asIs}</td>
                                            <td className="p-3 text-center font-mono font-bold text-blue-700 bg-blue-50/30">{quoted}</td>
                                            <td className={`p-3 text-center font-mono font-black bg-emerald-50/30 ${actual > 0 ? 'text-emerald-700 cursor-pointer hover:bg-emerald-100' : 'text-slate-400'}`} onClick={() => actual > 0 && setDetailsModal({ show: true, category: cat.id, label: cat.label, items: cat.items })}>
                                                {actual}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-black ${creep > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {creep > 0 ? `+${creep} (CR)` : creep === 0 ? 'Verified' : creep}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {detailsModal.show && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-700 animate-slide-up">
                        <div className="bg-slate-900 px-6 py-4 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black text-lg text-emerald-400">Verified {detailsModal.label}</h3>
                            <button onClick={() => setDetailsModal({ show: false, items: [] })} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
                            <table className="w-full text-left bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                                    <tr><th className="p-3">Name</th><th className="p-3">Specification</th><th className="p-3">IP / Location</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {detailsModal.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-emerald-50/30">
                                            <td className="p-3 font-bold text-slate-800">{item.name || item.id}</td>
                                            <td className="p-3 text-slate-600">{item.type || item.flavor || 'Standard'}</td>
                                            <td className="p-3 font-mono text-slate-500">{item.ip || item.private_ip_address || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🌌 2. INTERACTIVE DIGITAL TWIN CONSTELLATION
// ==========================================
function LiveConstellationView({ activeProject }) {
    const targetNodes = useMemo(() => {
        const rawNoc = activeProject?.nocData?.raw;
        if (rawNoc && Object.keys(rawNoc).length > 0) {
            const nodes = [];
            (rawNoc.compute || []).forEach(n => nodes.push({ id: n.id, name: n.name, type: 'ECS', ip: n.private_ip_address || 'N/A' }));
            (rawNoc.databases || []).forEach(n => nodes.push({ id: n.id, name: n.name, type: 'RDS', ip: 'N/A' }));
            (rawNoc.network || []).forEach(n => nodes.push({ id: n.id, name: n.name, type: 'VPC', ip: n.cidr || 'N/A' }));
            return nodes;
        }
        return [];
    }, [activeProject]);

    if (targetNodes.length === 0) return (
        <div className="bg-slate-900 rounded-2xl border-2 border-slate-700 p-16 text-center text-slate-500 animate-fade-in"><i className="fas fa-meteor text-6xl mb-4 text-slate-700"></i><h3 className="font-black text-xl text-white">Constellation Offline</h3><p>Run Final NOC Scan first.</p></div>
    );

    return (
        <div className="bg-slate-900 rounded-2xl shadow-xl h-[650px] border border-slate-700 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-4 left-4 z-40 bg-slate-800/90 border border-slate-700 px-5 py-3 rounded-xl"><h3 className="font-black text-lg text-white"><i className="fas fa-meteor text-blue-500"></i> Target Constellation</h3></div>
            {targetNodes.map((n, i) => (
                <div key={i} className="absolute w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white" style={{left: `${20 + Math.random() * 60}%`, top: `${20 + Math.random() * 60}%`}} title={`${n.name} (${n.ip})`}><i className="fas fa-server text-[10px]"></i></div>
            ))}
        </div>
    );
}

function PhasePostLive({ activeProject, onUpdateProject }) { return <div></div>; }
