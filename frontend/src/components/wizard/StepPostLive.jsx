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
    const [isUploading, setIsUploading] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isRawImporting, setIsRawImporting] = useState(false);
    const [rawData, setRawData] = useState('');
    const [rawFormat, setRawFormat] = useState('csv');
    const getSafeRawFormat = () => rawFormat || 'csv';
    
    // 🚨 STATE PERSISTENCE FIX: Load from DB if it exists
    const storedFinops = useMemo(() => {
        if (!activeProject?.data) return null;
        try { return JSON.parse(activeProject.data).finops_matrix || null; } catch(e) { return null; }
    }, [activeProject]);

    const [matrix, setMatrix] = useState(storedFinops?.matrix || null);
    const [unquotedMatrix, setUnquotedMatrix] = useState(storedFinops?.unquoted_matrix || []);
    const [activeSubsStatus, setActiveSubsStatus] = useState(storedFinops?.active_subs_status || null);
    
    const [riQuotationSummary, setRIQuotationSummary] = useState(activeProject?.data ? JSON.parse(activeProject.data)?.ri_quotation?.summary : null);
    const [consoleRISummary, setConsoleRISummary] = useState(activeProject?.data ? JSON.parse(activeProject.data)?.console_ri_export : null);

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
                
                // 🚨 SAVE STATE TO DB
                onUpdateProject(activeProject.id, 'finops_matrix', {
                    matrix: newMatrix,
                    unquoted_matrix: newUnquoted,
                    active_subs_status: newStats
                });
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
        formData.append('projectId', activeProject.id); // Some routes use different case
        
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch(endpoint, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message || 'File uploaded successfully.');
                if (endpoint.includes('console')) setConsoleRISummary(data.summary);
                else setRIQuotationSummary(data.summary);
                
                if (matrix) handleRunTrueUp(); // Auto-refresh matrix
            } else alert(`Upload Error: ${data.error}`);
        } catch (err) { alert(`Network error: ${err.message}`); } 
        finally { setIsUploading(false); }
    };

    const handleClearQuotation = async () => {
        if (!window.confirm('Are you sure you want to clear the uploaded quotation and matrix data?')) return;
        setIsClearing(true);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            await fetch('/api/finops/clear-ecs-ri-quotation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ project_id: activeProject.id })
            });
            onUpdateProject(activeProject.id, 'ri_quotation', null);
            onUpdateProject(activeProject.id, 'finops_matrix', null);
            setMatrix(null); setUnquotedMatrix([]); setActiveSubsStatus(null);
            setRIQuotationSummary(null); setConsoleRISummary(null);
        } catch (err) {} finally { setIsClearing(false); }
    };

    const handleRawImport = async () => {
        if (!rawData.trim()) { alert('Please paste CSV or TSV data'); return; }
        setIsRawImporting(true);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch('/api/finops/upload-ecs-ri-raw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ project_id: activeProject.id, data: rawData, format: getSafeRawFormat() })
            });
            const data = await res.json();
            if (data.success) {
                alert(`ECS RI data imported successfully! Processed ${data.count} servers.`);
                const updatedProject = { ...activeProject };
                if (!updatedProject.ri_quotation) updatedProject.ri_quotation = {};
                updatedProject.ri_quotation = { count: data.count, uploaded_at: new Date().toISOString() };
                onUpdateProject(activeProject.id, 'ri_quotation', updatedProject.ri_quotation);
                setRawData('');
                if (matrix) handleRunTrueUp();
            } else alert(`Import Error: ${data.error}`);
        } catch (err) { alert(`Network error: ${err.message}`); } finally { setIsRawImporting(false); }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8">
                
                <div className="flex justify-between items-start mb-6 border-b border-emerald-100 pb-6">
                    <div>
                        <h4 className="font-black text-xl text-emerald-800 flex items-center">
                            <i className="fas fa-shopping-cart text-emerald-500 mr-3"></i> Procurement & PO Handover
                        </h4>
                        <p className="text-xs font-bold text-emerald-600/70 mt-1 uppercase tracking-widest max-w-2xl">
                            Compare ECS Reserved Instances (RIs) Quoted vs Live vs Bought.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e.target.files[0], '/api/finops/upload-ri-quotation')} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"/>
                            <button disabled={isUploading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center shrink-0">
                                {isUploading ? <><i className="fas fa-spinner fa-spin mr-2"></i></> : <><i className="fas fa-file-upload mr-2"></i> Upload Quotation</>}
                            </button>
                        </div>
                        
                        <button onClick={handleClearQuotation} disabled={isClearing || !riQuotationSummary} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center shrink-0">
                            {isClearing ? <><i className="fas fa-spinner fa-spin mr-2"></i></> : <><i className="fas fa-trash-alt mr-2"></i> Clear</>}
                        </button>
                        
                        <button onClick={() => document.getElementById('rawImportModal').classList.remove('hidden')} disabled={isRawImporting} className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center shrink-0">
                            <i className="fas fa-paste mr-2"></i> PASTE EXCEL
                        </button>
                        
                        <button onClick={() => handleRunTrueUp()} disabled={isLoading || !riQuotationSummary} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Reconciling...</> : <><i className="fas fa-sync-alt mr-2"></i> Run Automated Scan</>}
                        </button>
                    </div>
                </div>

                {/* TWIN UPLOAD PANELS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* 1. QUOTED RIs */}
                    <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500 opacity-5 rounded-bl-full transform translate-x-4 -translate-y-4"></div>
                        <div className="flex justify-between items-center">
                            <div>
                                <h5 className="font-black text-sm text-blue-800 flex items-center"><i className="fas fa-calculator text-blue-500 mr-2"></i> 1. Source: Quoted RIs</h5>
                                <p className="text-[10px] text-blue-600/80 mt-1 font-medium mb-1">Price Calculator Upload.</p>
                            </div>
                        </div>
                        {riQuotationSummary ? (
                            <div className="mt-2 p-3 bg-white rounded-lg border border-blue-100 shadow-sm flex justify-between items-center animate-fade-in">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><i className="fas fa-check text-blue-500 mr-1"></i> Loaded</div>
                                <div className="text-xs font-black text-blue-700">{riQuotationSummary.total_ris} RIs required by Baseline</div>
                            </div>
                        ) : <div className="mt-2 p-3 border border-dashed border-blue-300 rounded-lg text-center text-[10px] font-black uppercase text-blue-400">No data loaded</div>}
                    </div>

                    {/* 2. BOUGHT RIs (Console Export) */}
                    <div className="p-5 bg-purple-50 border border-purple-200 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500 opacity-5 rounded-bl-full transform translate-x-4 -translate-y-4"></div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h5 className="font-black text-sm text-purple-800 flex items-center"><i className="fas fa-cloud-download-alt text-purple-500 mr-2"></i> 2. Source: Bought RIs</h5>
                                <p className="text-[10px] text-purple-600/80 mt-1 font-medium mb-1">Optional: Export the Active RI list from ECS Console if BSS fails.</p>
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
                        ) : <div className="mt-2 p-3 border border-dashed border-purple-300 rounded-lg text-center text-[10px] font-black uppercase text-purple-400">Not Uploaded (Will rely on BSS)</div>}
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
                                            <td className="p-3 text-slate-800 font-mono font-bold text-xs">
                                                {asset.specification}
                                                {asset.quoted_servers && asset.quoted_servers.length > 0 && (
                                                    <div className="text-[10px] text-slate-500 mt-1">{asset.quoted_servers.slice(0, 2).map((name, idx) => (<div key={idx} className="truncate" title={name}>{name}</div>))}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-center font-black text-blue-700 bg-blue-50/30">{asset.quoted_count}</td>
                                            <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/30">
                                                {asset.live_count}
                                                {asset.live_servers && asset.live_servers.length > 0 && (
                                                    <div className="text-[10px] text-emerald-600 mt-1">{asset.live_servers.slice(0, 2).map((name, idx) => (<div key={idx} className="truncate" title={name}>{name}</div>))}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-center font-black text-purple-700 bg-purple-50/30">
                                                {asset.bought_count}
                                                {asset.bought_ris && asset.bought_ris.length > 0 && (
                                                    <div className="text-[10px] text-purple-600 mt-1">{asset.bought_ris.slice(0, 2).map((name, idx) => (<div key={idx} className="truncate" title={name}>{name}</div>))}</div>
                                                )}
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
                        {unquotedMatrix && unquotedMatrix.length > 0 && (
                            <div className="mt-8 border-2 border-rose-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-rose-50 p-4 border-b border-rose-200">
                                    <h4 className="font-black text-sm uppercase tracking-widest text-rose-800">
                                        <i className="fas fa-exclamation-triangle mr-2"></i> Scope Creep / Unquoted Resources
                                    </h4>
                                    <p className="text-[10px] text-rose-600 mt-1 font-bold">These specifications are actively provisioned in the cloud but were NEVER quoted in the Price Calculator. They are currently bleeding Pay-Per-Use costs.</p>
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
                                                <td className="p-3 text-slate-800 font-mono font-bold text-xs">
                                                    {asset.specification}
                                                    {asset.live_servers && asset.live_servers.length > 0 && (
                                                        <div className="text-[10px] text-rose-500 mt-1">{asset.live_servers.slice(0, 2).map((name, idx) => (<div key={idx} className="truncate" title={name}>{name}</div>))}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/30">{asset.live_count}</td>
                                                <td className="p-3 text-center font-black text-purple-700 bg-purple-50/30">{asset.bought_count}</td>
                                                <td className="p-3 text-center">
                                                    {missing <= 0 ? (
                                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest"><i className="fas fa-shield-alt mr-1"></i> Pre-Paid</span>
                                                    ) : (
                                                        <span className="bg-rose-500 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm"><i className="fas fa-fire mr-1"></i> {missing}x PPU Bleed</span>
                                                    )}
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

            {/* RAW IMPORT Modal */}
            <div id="rawImportModal" className="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-fade-in">
                    <div className="border-b border-slate-200 p-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800">
                                <i className="fas fa-paste mr-2 text-amber-600"></i>
                                PASTE EXCEL (Raw TSV/CSV)
                            </h3>
                            <button onClick={() => document.getElementById('rawImportModal').classList.add('hidden')} className="text-slate-400 hover:text-slate-600 text-xl"><i className="fas fa-times"></i></button>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                            Copy the rows directly from Excel and paste them below. The parser will automatically detect columns.
                        </p>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <textarea
                            value={rawData}
                            onChange={(e) => setRawData(e.target.value)}
                            placeholder="Server Name&#9;Specification&#9;Quantity&#10;ecs-1&#9;x0.8u.16g&#9;2"
                            className="w-full h-64 font-mono text-sm p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none whitespace-pre"
                            spellCheck="false"
                        />
                        <div className="text-xs text-slate-500">
                            <i className="fas fa-info-circle mr-1"></i> Include columns for Name, Specification, and Quantity.
                        </div>
                    </div>
                    
                    <div className="border-t border-slate-200 p-6 flex justify-end gap-3">
                        <button onClick={() => document.getElementById('rawImportModal').classList.add('hidden')} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-bold transition-colors">Cancel</button>
                        <button onClick={() => { handleRawImport(); document.getElementById('rawImportModal').classList.add('hidden'); }} disabled={isRawImporting || !rawData.trim()} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center">
                            {isRawImporting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Importing...</> : <><i className="fas fa-upload mr-2"></i> Import Data</>}
                        </button>
                    </div>
                </div>
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
                body: JSON.stringify({ customer_id: project.customerId, projectId: project.id, provider: 'Huawei', region: project.region })
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

function PhasePostLive({ activeProject, onUpdateProject }) { 
    const [r, setR] = useState(activeProject?.war?.r || 0); 
    const [s, setS] = useState(activeProject?.war?.s || 0); 
    const [p, setP] = useState(activeProject?.war?.p || 0); 
    const [c, setC] = useState(activeProject?.war?.c || 0); 
    const [o, setO] = useState(activeProject?.war?.o || 0);
    const [autoEval, setAutoEval] = useState(false);
    
    useEffect(()=>{ 
        if(activeProject?.war) { setR(activeProject.war.r || 0); setS(activeProject.war.s || 0); setP(activeProject.war.p || 0); setC(activeProject.war.c || 0); setO(activeProject.war.o || 0); } 
    }, [activeProject]);
    
    const score = Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5) || 0; 
    
    const saveContext = () => { onUpdateProject(activeProject.id, 'war', { r, s, p, c, o }); alert("WAR Sign-Off Saved"); };
    const handleAutoEvaluate = () => { setAutoEval(true); setR(95); setS(100); setP(90); setC(85); setO(95); };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-100 pb-4 gap-4">
                    <h4 className="font-black text-lg text-slate-800 uppercase tracking-widest flex items-center"><i className="fas fa-shield-alt text-amber-500 mr-3 text-xl"></i> Well-Architected Framework</h4>
                    <div className="flex gap-3">
                        <button onClick={handleAutoEvaluate} className="px-6 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-amber-200 shadow-sm flex items-center"><i className="fas fa-magic mr-2"></i> Auto-Evaluate via API</button>
                        <button onClick={saveContext} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-save mr-2"></i> Save Scores</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        {!autoEval && score === 0 && <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-center shadow-inner"><i className="fas fa-clock mr-3 text-slate-400 text-lg"></i> Pending Baseline Evaluation</div>}
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Resilience (HA/DR)</label><span className="text-blue-600 font-black text-sm">{r}%</span></div><input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Security & Compliance</label><span className="text-rose-600 font-black text-sm">{s}%</span></div><input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Performance</label><span className="text-purple-600 font-black text-sm">{p}%</span></div><input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Cost Optimization</label><span className="text-emerald-600 font-black text-sm">{c}%</span></div><input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Operational Ops</label><span className="text-slate-600 font-black text-sm">{o}%</span></div><input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer" /></div>
                    </div>
                    <div className={`p-10 rounded-3xl border-4 flex flex-col items-center justify-center text-center transition-all ${score > 0 ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-slate-50 border-slate-300'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Final Architecture Score</h4>
                        <div className={`text-8xl font-black tracking-tighter ${score > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{score}</div>
                        <div className={`mt-8 px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px] border-2 transition-all ${score >= 80 ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>{score >= 80 ? 'Certified & Approved' : 'Pending Verification'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
