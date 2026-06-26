import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('commercial'); // Default to true-up for testing

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
    const [isUploading, setIsUploading] = useState(false);
    
    // 🚨 STATE PERSISTENCE: Load from DB if it exists
    const storedFinops = useMemo(() => {
        if (!activeProject?.data) return null;
        try { return JSON.parse(activeProject.data).finops_matrix || null; } catch(e) { return null; }
    }, [activeProject]);

    const [matrix, setMatrix] = useState(storedFinops?.matrix || null);
    const [unquotedMatrix, setUnquotedMatrix] = useState(storedFinops?.unquoted_matrix || []);
    const [activeSubsStatus, setActiveSubsStatus] = useState(storedFinops?.active_subs_status || null);
    
    const [riQuotationSummary, setRIQuotationSummary] = useState(activeProject?.data ? JSON.parse(activeProject.data)?.ri_quotation?.summary : null);
    const [consoleRISummary, setConsoleRISummary] = useState(activeProject?.data ? JSON.parse(activeProject.data)?.console_ri_export : null);

    // 🚨 NEW: Drill-Down Modal State
    const [detailsModal, setDetailsModal] = useState({ show: false, title: '', items: [] });

    const handleRunTrueUp = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('erp_jwt_token'); 
            const res = await fetch('/api/finops/ecs-ri-reconciliation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ projectId: activeProject.id })
            });
            const data = await res.json();
            if (data.success) {
                const newMatrix = data.reconciliation.matrix || [];
                const newUnquoted = data.reconciliation.unquoted_matrix || [];
                const newStats = data.active_subs_status || null;
                
                setMatrix(newMatrix);
                setUnquotedMatrix(newUnquoted);
                setActiveSubsStatus(newStats);
                
                // Slim the payload to prevent DB 500 errors
                const leanMatrix = { matrix: newMatrix, unquoted_matrix: newUnquoted, active_subs_status: newStats };
                onUpdateProject(activeProject.id, 'finops_matrix', leanMatrix);
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
        formData.append('project_id', activeProject.id);
        formData.append('projectId', activeProject.id);
        
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch(endpoint, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            const data = await res.json();
            if (data.success) {
                if (endpoint.includes('console')) setConsoleRISummary(data.summary);
                else setRIQuotationSummary(data.summary);
                if (matrix) handleRunTrueUp(); // Auto-refresh matrix
            } else alert(`Upload Error: ${data.error}`);
        } catch (err) { alert(`Network error: ${err.message}`); } 
        finally { setIsUploading(false); }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in relative">
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8">
                
                <div className="flex justify-between items-start mb-6 border-b border-emerald-100 pb-6">
                    <div>
                        <h4 className="font-black text-xl text-emerald-800 flex items-center">
                            <i className="fas fa-shopping-cart text-emerald-500 mr-3"></i> Procurement & PO Handover
                        </h4>
                        <p className="text-xs font-bold text-emerald-600/70 mt-1 uppercase tracking-widest max-w-2xl">
                            Compare ECS Reserved Instances (RIs) Quoted vs Provisioned vs Bought.
                        </p>
                    </div>
                    <button onClick={() => handleRunTrueUp()} disabled={isLoading} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center shrink-0">
                        {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Reconciling...</> : <><i className="fas fa-sync-alt mr-2"></i> Run Automated Scan</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* 1. QUOTED RIs */}
                    <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl relative overflow-hidden group">
                        <div className="flex justify-between items-center">
                            <div>
                                <h5 className="font-black text-sm text-blue-800 flex items-center"><i className="fas fa-calculator text-blue-500 mr-2"></i> 1. Source: Quoted RIs</h5>
                                <p className="text-[10px] text-blue-600/80 mt-1 font-medium mb-1">Price Calculator Upload.</p>
                            </div>
                            <div className="relative">
                                <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e.target.files[0], '/api/finops/upload-ri-quotation')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm"><i className="fas fa-upload mr-1.5"></i> Upload</button>
                            </div>
                        </div>
                        {riQuotationSummary ? (
                            <div className="mt-2 p-3 bg-white rounded-lg border border-blue-100 shadow-sm flex justify-between items-center animate-fade-in">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><i className="fas fa-check text-blue-500 mr-1"></i> Loaded</div>
                                <div className="text-xs font-black text-blue-700">{riQuotationSummary.total_ris} RIs required by Baseline</div>
                            </div>
                        ) : <div className="mt-2 p-3 border border-dashed border-blue-300 rounded-lg text-center text-[10px] font-black uppercase text-blue-400">No data loaded</div>}
                    </div>

                    {/* 2. BOUGHT RIs (Console Export Fallback) */}
                    <div className="p-5 bg-purple-50 border border-purple-200 rounded-xl relative overflow-hidden group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h5 className="font-black text-sm text-purple-800 flex items-center"><i className="fas fa-cloud-download-alt text-purple-500 mr-2"></i> 2. Fallback: Bought RIs</h5>
                                <p className="text-[10px] text-purple-600/80 mt-1 font-medium mb-1">Optional: Upload Active RI List from ECS Console if BSS blocks API.</p>
                            </div>
                            <div className="relative">
                                <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e.target.files[0], '/api/finops/upload-console-ris')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm"><i className="fas fa-upload mr-1.5"></i> Upload</button>
                            </div>
                        </div>
                        {consoleRISummary ? (
                            <div className="mt-2 p-3 bg-white rounded-lg border border-purple-100 shadow-sm flex justify-between items-center animate-fade-in">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><i className="fas fa-check text-purple-500 mr-1"></i> Loaded</div>
                                <div className="text-xs font-black text-purple-700">{consoleRISummary.total_ris} Active RIs Owned</div>
                            </div>
                        ) : <div className="mt-2 p-3 border border-dashed border-purple-300 rounded-lg text-center text-[10px] font-black uppercase text-purple-400">Not Uploaded (Will rely on Nova/BSS)</div>}
                    </div>
                </div>

                {!matrix ? (
                    <div className="text-center py-12 text-emerald-300 border-2 border-dashed border-emerald-100 rounded-2xl">
                        <i className="fas fa-balance-scale-right text-5xl mb-4 opacity-40"></i>
                        <h3 className="font-black text-lg text-emerald-700">Awaiting Cross-Reconciliation</h3>
                        <p className="text-xs font-medium mt-2 text-emerald-600/60 max-w-md mx-auto">Upload the Quote CSV above, then run the Reconciler to hit the Huawei Global Billing API and calculate missing coverage.</p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        
                        {/* Summary Block */}
                        {activeSubsStatus && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center border-r border-slate-200">
                                        <div className="text-3xl font-black text-blue-600">{activeSubsStatus.total_quoted || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Quoted RIs</div>
                                    </div>
                                    <div className="text-center border-r border-slate-200">
                                        <div className="text-3xl font-black text-emerald-600">{activeSubsStatus.total_live || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Provisioned (Live ECS)</div>
                                    </div>
                                    <div className="text-center border-r border-slate-200">
                                        <div className="text-3xl font-black text-purple-600">{activeSubsStatus.total_bought || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-purple-500 mt-1">Owned / Prepaid</div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-3xl font-black ${activeSubsStatus.total_missing > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{activeSubsStatus.total_missing || 0}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${activeSubsStatus.total_missing > 0 ? 'text-rose-500' : 'text-slate-400'}`}>Missing RIs (Deficit)</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TABLE 1: ANCHORED QUOTED MATRIX */}
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-3 border-b border-slate-200 pb-2">Procurement Action Matrix (Quoted Baseline)</h4>
                            <table className="w-full text-left bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                                    <tr>
                                        <th className="p-3">Specification / Flavor</th>
                                        <th className="p-3 text-center bg-blue-50/50">Quoted Baseline</th>
                                        <th className="p-3 text-center bg-emerald-50/50">Provisioned (Live ECS)</th>
                                        <th className="p-3 text-center bg-purple-50/50">Owned / Prepaid</th>
                                        <th className="p-3 text-center">Status / Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {matrix.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center p-6 text-slate-400 font-bold">No quoted items found.</td></tr>
                                    ) : matrix.map((asset, i) => {
                                        const missing = asset.quoted_count - asset.bought_count;
                                        return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-slate-800 font-mono font-bold text-xs">{asset.specification}</td>
                                            
                                            <td className="p-3 text-center font-black text-blue-700 bg-blue-50/30 cursor-pointer hover:bg-blue-100 transition-all" onClick={() => asset.quoted_count > 0 && setDetailsModal({show: true, title: `Quoted: ${asset.specification}`, items: asset.quoted_servers})}>
                                                {asset.quoted_count} {asset.quoted_count > 0 && <i className="fas fa-search-plus ml-1 opacity-50 text-[10px]"></i>}
                                            </td>
                                            
                                            <td className={`p-3 text-center font-black ${asset.live_count > 0 ? 'text-emerald-700 bg-emerald-50/30 cursor-pointer hover:bg-emerald-100' : 'text-slate-400 bg-slate-50/30'}`} onClick={() => asset.live_count > 0 && setDetailsModal({show: true, title: `Provisioned: ${asset.specification}`, items: asset.live_servers})}>
                                                {asset.live_count} {asset.live_count > 0 && <i className="fas fa-search-plus ml-1 opacity-50 text-[10px]"></i>}
                                            </td>
                                            
                                            <td className={`p-3 text-center font-black ${asset.bought_count > 0 ? 'text-purple-700 bg-purple-50/30 cursor-pointer hover:bg-purple-100' : 'text-slate-400 bg-slate-50/30'}`} onClick={() => asset.bought_count > 0 && setDetailsModal({show: true, title: `Owned RIs: ${asset.specification}`, items: asset.bought_ris})}>
                                                {asset.bought_count} {asset.bought_count > 0 && <i className="fas fa-search-plus ml-1 opacity-50 text-[10px]"></i>}
                                            </td>
                                            
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

                        {/* TABLE 2: SCOPE CREEP / UNQUOTED */}
                        {unquotedMatrix.length > 0 && (
                            <div className="mt-8 border-2 border-rose-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-rose-50 p-4 border-b border-rose-200">
                                    <h4 className="font-black text-sm uppercase tracking-widest text-rose-800"><i className="fas fa-exclamation-triangle mr-2"></i> Scope Creep / Unquoted Resources</h4>
                                    <p className="text-[10px] text-rose-600 mt-1 font-bold">These specifications are actively provisioned but were NEVER quoted in the Price Calculator.</p>
                                </div>
                                <table className="w-full text-left bg-white text-sm">
                                    <thead className="bg-rose-50/50 border-b border-rose-100 text-[10px] uppercase font-black text-rose-600">
                                        <tr>
                                            <th className="p-3">Specification / Flavor</th>
                                            <th className="p-3 text-center bg-emerald-50/50 text-emerald-700">Provisioned (Live ECS)</th>
                                            <th className="p-3 text-center bg-purple-50/50 text-purple-700">Owned / Prepaid</th>
                                            <th className="p-3 text-center">Financial Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-rose-50">
                                        {unquotedMatrix.map((asset, i) => {
                                            const missing = asset.live_count - asset.bought_count;
                                            return (
                                            <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                                                <td className="p-3 text-slate-800 font-mono font-bold text-xs">{asset.specification}</td>
                                                <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/30 cursor-pointer hover:bg-emerald-100" onClick={() => asset.live_count > 0 && setDetailsModal({show: true, title: `Provisioned: ${asset.specification}`, items: asset.live_servers})}>
                                                    {asset.live_count} <i className="fas fa-search-plus ml-1 opacity-50 text-[10px]"></i>
                                                </td>
                                                <td className="p-3 text-center font-black text-purple-700 bg-purple-50/30">{asset.bought_count}</td>
                                                <td className="p-3 text-center">
                                                    {missing <= 0 ? <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest">Pre-Paid</span> : <span className="bg-rose-500 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm"><i className="fas fa-fire mr-1"></i> {missing}x PPU Bleed</span>}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                    </div>
                )}
            </div>

            {/* 🚨 NEW: DRILL-DOWN MODAL FOR SERVERS */}
            {detailsModal.show && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-slate-700 animate-slide-up">
                        <div className="bg-slate-900 px-6 py-4 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black text-lg text-emerald-400"><i className="fas fa-server mr-2"></i> {detailsModal.title}</h3>
                            <button onClick={() => setDetailsModal({ show: false, title: '', items: [] })} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
                            <table className="w-full text-left bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Resource Name</th>
                                        <th className="p-3">Instance ID</th>
                                        <th className="p-3">Full Specification</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {detailsModal.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="p-3 font-bold text-slate-800">{item.name}</td>
                                            <td className="p-3 font-mono text-slate-400">{item.id || 'N/A'}</td>
                                            <td className="p-3 font-mono text-slate-600">{item.spec || item.original_spec || 'Unknown'}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{item.status}</span>
                                            </td>
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
// ⚖️ 1. 3-WAY INFRASTRUCTURE DIFF (Stubbed for space, unchanged)
// ==========================================
function PhaseThreeWayDiff({ project, onUpdateProject }) {
    // ... [Unchanged NOC Diff Logic] ...
    return <div></div>;
}

function LiveConstellationView({ activeProject }) { return <div></div>; }
function PhasePostLive({ activeProject, onUpdateProject }) { return <div></div>; }
