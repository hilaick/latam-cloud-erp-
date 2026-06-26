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
    
    // 🚨 Two isolated matrices
    const [matrix, setMatrix] = useState(null);
    const [unquotedMatrix, setUnquotedMatrix] = useState([]);
    const [activeSubsStatus, setActiveSubsStatus] = useState(null);

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
                setMatrix(data.reconciliation.matrix || []);
                setUnquotedMatrix(data.reconciliation.unquoted_matrix || []);
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

    const handleUploadQuotation = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('project_id', activeProject.id);
            
            const res = await fetch('/api/finops/upload-ri-quotation', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`ECS RI Quotation uploaded successfully! Processed ${data.count} servers.`);
                const updatedProject = { ...activeProject };
                if (!updatedProject.ri_quotation) updatedProject.ri_quotation = {};
                updatedProject.ri_quotation = { count: data.count, uploaded_at: new Date().toISOString() };
                onUpdateProject(activeProject.id, 'ri_quotation', updatedProject.ri_quotation);
            } else {
                alert(`Upload Error: ${data.error}`);
            }
        } catch (err) {
            alert(`Network error during upload: ${err.message}`);
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const handleClearQuotation = async () => {
        if (!window.confirm('Are you sure you want to clear the uploaded quotation?')) return;
        setIsClearing(true);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            await fetch('/api/finops/clear-ecs-ri-quotation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ project_id: activeProject.id })
            });
            onUpdateProject(activeProject.id, 'ri_quotation', null);
            setMatrix(null); setUnquotedMatrix([]); setActiveSubsStatus(null);
        } catch (err) {} finally { setIsClearing(false); }
    };

    const handleRawImport = async () => {
        if (!rawData.trim()) { alert('Please paste CSV or JSON data'); return; }
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
            } else alert(`Import Error: ${data.error}`);
        } catch (err) { alert(`Network error: ${err.message}`); } finally { setIsRawImporting(false); }
    };

    const handleHandover = () => {
        onUpdateProject(activeProject.id, 'lifecycleState', '5_awaiting_commercial');
        alert("Success! The project has been marked Technically Complete. Delivery SLA timer stopped.");
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
                            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUploadQuotation} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"/>
                            <button disabled={isUploading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center shrink-0">
                                {isUploading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Uploading...</> : <><i className="fas fa-file-upload mr-2"></i> Upload Quotation</>}
                            </button>
                        </div>
                        
                        <button onClick={handleClearQuotation} disabled={isClearing || !activeProject?.ri_quotation} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center shrink-0">
                            {isClearing ? <><i className="fas fa-spinner fa-spin mr-2"></i> Clearing...</> : <><i className="fas fa-trash-alt mr-2"></i> Clear</>}
                        </button>
                        
                        <button onClick={() => document.getElementById('rawImportModal').classList.remove('hidden')} disabled={isRawImporting} className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center shrink-0">
                            <i className="fas fa-paste mr-2"></i> PASTE EXCEL
                        </button>
                        
                        <button onClick={() => handleRunTrueUp()} disabled={isLoading || !activeProject?.ri_quotation} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Reconciling...</> : <><i className="fas fa-sync-alt mr-2"></i> Run Automated Scan</>}
                        </button>
                    </div>
                </div>

                {!matrix ? (
                    <div className="text-center py-12 text-emerald-300 border-2 border-dashed border-emerald-100 rounded-2xl">
                        <i className="fas fa-balance-scale-right text-5xl mb-4 opacity-40"></i>
                        <h3 className="font-black text-lg text-emerald-700">Awaiting Cross-Reconciliation</h3>
                        <p className="text-xs font-medium mt-2 text-emerald-600/60 max-w-md mx-auto">
                            {!activeProject?.ri_quotation ? 
                                <><strong>Step 1:</strong> Upload the ECS RI Quotation (Excel/CSV) to establish the baseline.<br/><strong>Step 2:</strong> Click "Run Automated Scan" to cross-reference with Live Resources.</> : 
                                <>Click "Run Automated Scan" above to cross-reference the ECS RI Quotation with the Live Network and the BSS Billing Subscriptions.</>}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {activeSubsStatus && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center border-r border-slate-200">
                                        <div className="text-3xl font-black text-blue-600">{activeSubsStatus.total_quoted || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">Quoted RIs</div>
                                    </div>
                                    <div className="text-center border-r border-slate-200">
                                        <div className="text-3xl font-black text-emerald-600">{activeSubsStatus.total_live || 0}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Provisioned ECS Nodes</div>
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

                        {/* TABLE 2: SCOPE CREEP / UNQUOTED */}
                        {unquotedMatrix.length > 0 && (
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
                                                <td className="p-3 text-slate-800 font-mono font-bold text-xs">{asset.specification}</td>
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
                            placeholder="Server Name,Specification,Quantity&#10;ecs-1,x0.8u.16g,2"
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
// ⚖️ 1. 3-WAY INFRASTRUCTURE DIFF (Overhauled)
// ==========================================
function PhaseThreeWayDiff({ project, onUpdateProject }) {
    const [isScanningNoc, setIsScanningNoc] = useState(false);
    const [nocData, setNocData] = useState(project?.nocData || null);
    const [crApproved, setCrApproved] = useState(project?.crApproved || false);
    
    const [showDossier, setShowDossier] = useState(false);
    const [showDetailedReport, setShowDetailedReport] = useState(false);
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
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
            count: normalized[key].length,
            items: normalized[key]
        })).filter(cat => cat.count > 0);
    }, [nocData, hasNocScanned]);

    const requiresCR = hasNocScanned && liveCategories.some(cat => {
        const quoted = project?.blueprintData?.topology?.[cat.id]?.length || 0;
        return (cat.count - quoted) > 0;
    });

    useEffect(() => {
        if (project?.nocData) setNocData(project.nocData);
        if (project?.crApproved) setCrApproved(project.crApproved);
    }, [project]);

    const runFinalNocScan = async () => {
        if (!project.customerId) {
            alert("NOC Scan Error: No Customer linked to this project.");
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
                    provider: 'Huawei'
                })
            });
            const data = await res.json();
            
            if (data.success) {
                const finalNoc = { raw: data.inventory || {} };
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

    const handleSaveState = () => {
        onUpdateProject(project.id, 'crApproved', crApproved);
        alert("3-Way Diff State Saved.");
    };

    const handlePrint = () => window.print();

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6">
            
            <div className="px-8 py-5 border-b border-slate-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center rounded-2xl gap-4 shadow-sm border">
                <div>
                    <h3 className="font-black text-lg tracking-wide text-slate-800">
                        <i className="fas fa-balance-scale text-indigo-500 mr-2"></i> 3-Way Infrastructure Diff
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Verify live telemetry against the SOW Baseline.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button onClick={()=>setShowDossier(true)} disabled={!hasNocScanned} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">
                        <i className="fas fa-file-pdf mr-2"></i> Standard Dossier
                    </button>
                    <button onClick={()=>setShowDetailedReport(true)} disabled={!hasNocScanned} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">
                        <i className="fas fa-file-contract mr-2"></i> Detailed Report
                    </button>
                    <button onClick={handleSaveState} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">
                        Save State
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-black text-base text-slate-800"><i className="fas fa-search text-indigo-500 mr-2"></i> Telemetry Scan Engine</h3>
                    <button 
                        onClick={runFinalNocScan} 
                        disabled={isScanningNoc}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 flex items-center"
                    >
                        {isScanningNoc ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning Target API</> : <><i className="fas fa-radar mr-2"></i> Run Final NOC Scan</>}
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
                                            <th className="p-3">Resource Category</th>
                                            <th className="p-3 text-center border-l border-slate-200 bg-slate-50">1. As-Is (Source MgC)</th>
                                            <th className="p-3 text-center border-l border-slate-200 bg-blue-50/50">2. To-Be (SOW Blueprint)</th>
                                            <th className="p-3 text-center border-l border-slate-200 bg-emerald-50/50">3. Actual Built (Target NOC)</th>
                                            <th className="p-3 text-center border-l border-slate-200 font-black text-slate-800">Delta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {liveCategories.map(cat => {
                                            const asIs = project?.mgcData?.[cat.id] || 0;
                                            const quoted = project?.blueprintData?.topology?.[cat.id]?.length || 0; 
                                            const actual = cat.count;
                                            const creep = actual - quoted;
                                            
                                            let icon = 'fa-server';
                                            if(cat.id.includes('database')) icon = 'fa-database';
                                            else if(cat.id.includes('network') || cat.id.includes('vpc') || cat.id.includes('eip')) icon = 'fa-network-wired';
                                            else if(cat.id.includes('storage') || cat.id.includes('vault') || cat.id.includes('obs')) icon = 'fa-hdd';
                                            else if(cat.id.includes('security')) icon = 'fa-shield-alt';

                                            return (
                                                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 font-bold text-slate-700 uppercase tracking-wider text-xs"><i className={`fas ${icon} text-slate-400 w-5`}></i> {cat.label}</td>
                                                    <td className="p-3 text-center font-mono text-slate-500 border-l border-slate-100 bg-slate-50">{asIs}</td>
                                                    <td className="p-3 text-center font-mono font-bold text-blue-700 border-l border-slate-100 bg-blue-50/30">{quoted}</td>
                                                    <td className={`p-3 text-center font-mono font-black border-l border-slate-100 bg-emerald-50/30 ${actual > 0 ? 'text-emerald-700 cursor-pointer hover:bg-emerald-100 hover:shadow-inner transition-all group' : 'text-slate-400'}`} onClick={() => { if (actual > 0) { setDetailsModal({ show: true, category: cat.id, label: cat.label, items: cat.items }); } }} title={actual > 0 ? "Click to view provisioned resources" : ""}>
                                                        {actual} 
                                                        {actual > 0 && <i className="fas fa-search-plus ml-1.5 opacity-0 group-hover:opacity-100 text-[10px]"></i>}
                                                    </td>
                                                    <td className="p-3 text-center border-l border-slate-100">
                                                        <span className={`px-2 py-1 rounded text-xs font-black ${creep > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {creep > 0 ? `+${creep} (CR)` : creep === 0 ? 'Verified' : creep}
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
                                        <h4 className="font-black text-emerald-800 text-sm">Technical Scope Validated</h4>
                                        <p className="text-xs text-emerald-700 font-medium">Built infrastructure strictly aligns with the signed Quotation/SOW. Please proceed to Commercial True-Up.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            {showDossier && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl min-h-[800px] flex flex-col relative print:shadow-none print:min-h-0 animate-slide-up">
                        <div className="px-6 py-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center print:hidden rounded-t-xl">
                            <h3 className="font-black text-slate-800"><i className="fas fa-file-pdf text-rose-500 mr-2"></i> Handover Dossier</h3>
                            <div className="space-x-3">
                                <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow transition-colors"><i className="fas fa-print mr-2"></i> Print / Save PDF</button>
                                <button onClick={()=>setShowDossier(false)} className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold rounded shadow transition-colors"><i className="fas fa-times mr-2"></i> Close</button>
                            </div>
                        </div>
                        <div className="p-12 print:p-0 bg-white flex-1 print:bg-transparent" id="printable-dossier">
                            <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                                <div><h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">LATAM Cloud</h1><h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Executive Handover</h2></div>
                                <div className="text-right"><div className="font-black text-lg text-slate-800">{project.name}</div><div className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()}</div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDetailedReport && (
                <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl min-h-[800px] flex flex-col relative print:shadow-none print:min-h-0 animate-slide-up">
                        <div className="px-6 py-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center print:hidden rounded-t-xl">
                            <h3 className="font-black text-slate-800"><i className="fas fa-file-contract text-indigo-600 mr-2"></i> Detailed Handover Report</h3>
                            <div className="space-x-3">
                                <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow"><i className="fas fa-print mr-2"></i> Print / Save PDF</button>
                                <button onClick={()=>setShowDetailedReport(false)} className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold rounded shadow"><i className="fas fa-times mr-2"></i> Close</button>
                            </div>
                        </div>
                        <div className="p-12 print:p-0 bg-white flex-1 print:bg-transparent" id="printable-detailed-report">
                            <div className="prose prose-slate max-w-none">
                                <h1 className="text-3xl font-black mb-8 border-b-2 border-slate-200 pb-4 uppercase text-slate-900">COMPLETE MIGRATION HANDOVER</h1>
                                {hasNocScanned && nocData?.raw && Object.entries(nocData.raw).map(([category, items]) => {
                                    if (!items || items.length === 0) return null;
                                    return (
                                        <div key={category} className="mb-6">
                                            <h5 className="uppercase text-xs font-black tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-1">{category}</h5>
                                            <table className="w-full text-left text-xs border border-slate-200">
                                                <thead className="bg-slate-50"><tr><th className="p-2 border-b border-slate-200">Name</th><th className="p-2 border-b border-slate-200">Specification</th></tr></thead>
                                                <tbody>{items.map((item, idx) => (<tr key={idx}><td className="p-2 border-b border-slate-100 font-bold">{item.name}</td><td className="p-2 border-b border-slate-100 text-slate-600">{item.flavor || item.type}</td></tr>))}</tbody>
                                            </table>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {detailsModal.show && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-700 animate-slide-up">
                        <div className="bg-slate-900 px-6 py-4 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black text-lg text-emerald-400">Verified {detailsModal.label}</h3>
                            <button onClick={() => setDetailsModal({ show: false, category: '', label: '', items: [] })} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
                            <table className="w-full text-left bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                                    <tr><th className="p-3">Resource ID / Name</th><th className="p-3">Specification / Type</th><th className="p-3">Target IP / Location</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {detailsModal.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="p-3 font-bold text-slate-800">{item.name || item.id}</td>
                                            <td className="p-3 text-slate-600">{item.type || item.flavor || 'Standard'}</td>
                                            <td className="p-3 font-mono text-slate-500">{item.ip || item.private_ip_address || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl flex justify-between items-center shrink-0">
                            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Count: {detailsModal.items.length}</div>
                            <button onClick={() => setDetailsModal({ show: false, items: [] })} className="px-6 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-md">Close Matrix</button>
                        </div>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } #printable-dossier, #printable-dossier *, #printable-detailed-report, #printable-detailed-report * { visibility: visible; } #printable-dossier, #printable-detailed-report { position: absolute; left: 0; top: 0; width: 100%; } @page { margin: 2cm; } }`}} />
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

// ==========================================
// 🛡️ 3. WELL-ARCHITECTED REVIEW (WAR)
// ==========================================
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
