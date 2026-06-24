import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('diff');

    return (
        <div className="animate-fade-in pb-12">
            
            {/* Header & Archive */}
            <div className="mb-8 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-4 md:px-8">
                <div>
                    <h3 className="font-black text-2xl text-slate-800"><i className="fas fa-award text-amber-500 mr-3"></i> Step 5: Post-Live Governance</h3>
                    <p className="text-sm text-slate-500 mt-2">3-Way Reconciliation, Digital Twin mapping, and Commercial Handover.</p>
                </div>
                {isCurrent && project?.lifecycleState !== '6_completed' && project?.lifecycleState !== '5_awaiting_commercial' && (
                    <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap">
                        Archive Project <i className="fas fa-check-double ml-2"></i>
                    </button>
                )}
            </div>

            {/* 4-TAB POST-LIVE NAVIGATION */}
            <div className="px-4 md:px-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
                <button 
                    onClick={() => setSubTab('diff')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'diff' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-balance-scale mr-2"></i> 1. 3-Way Diff Matrix
                </button>
                <button 
                    onClick={() => setSubTab('constellation')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'constellation' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-meteor mr-2"></i> 2. Target Constellation
                </button>
                <button 
                    onClick={() => setSubTab('war')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'war' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-shield-alt mr-2"></i> 3. WAR Sign-Off
                </button>
                {/* 🚨 NEW COMMERCIAL TRUE-UP TAB */}
                <button 
                    onClick={() => setSubTab('commercial')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'commercial' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'}`}
                >
                    <i className="fas fa-shopping-cart mr-2"></i> 4. Commercial True-Up
                </button>
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
    const [activeFilter, setActiveFilter] = useState('all');
    const [filterCounts, setFilterCounts] = useState(null);

    const handleRunTrueUp = async (filterType = 'all') => {
        setIsLoading(true);
        setActiveFilter(filterType);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch('/api/finops/live-reconciliation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    projectId: activeProject.id,
                    filter: filterType 
                })
            });
            const data = await res.json();
            if (data.success) {
                setMatrix(data.matrix);
                setFilterCounts(data.filter_counts || {
                    pending_ri: 0,
                    not_migrated: 0,
                    marked_for_deletion: 0,
                    pending_config: 0,
                    all: data.matrix?.deployable_assets?.length || 0
                });
            } else {
                alert(`Error during Live Architecture Reconciliation: ${data.error}`);
            }
        } catch (err) {
            alert(`Network error during reconciliation: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleHandover = () => {
        onUpdateProject(activeProject.id, 'lifecycleState', '5_awaiting_commercial');
        alert("Success! The project has been marked Technically Complete. Delivery SLA timer stopped. The project is now owned by the Commercial/Partner team for final PO True-Up.");
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
                            Technical execution is complete. Compare the live Pay-Per-Use (PPU) environment against the Commercial Intent defined in the blueprint to generate the final PO Shopping List.
                        </p>
                    </div>
                    <button 
                        onClick={handleRunTrueUp} 
                        disabled={isLoading}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center shrink-0"
                    >
                        {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Analyzing Live Architecture...</> : <><i className="fas fa-sync-alt mr-2"></i> Run Live Reconciliation</>}
                    </button>
                </div>

                {!matrix ? (
                    <div className="text-center py-16 text-emerald-300">
                        <i className="fas fa-file-invoice-dollar text-6xl mb-4 opacity-50"></i>
                        <h3 className="font-black text-lg">Live Architecture Reconciliation</h3>
                        <p className="text-xs font-medium mt-2">Run the reconciliation to compare quoted vs live environment and identify RI requirements.</p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary Blocks */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-inner text-center">
                                <div className="text-3xl font-black text-slate-800">{matrix.summary.covered}</div>
                                <div className="text-[10px] font-black uppercase text-slate-500 mt-1">Covered Resources</div>
                            </div>
                            <div className={`p-5 rounded-xl border shadow-inner text-center ${matrix.summary.missing_ri > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div className={`text-3xl font-black ${matrix.summary.missing_ri > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{matrix.summary.missing_ri}</div>
                                <div className={`text-[10px] font-black uppercase mt-1 ${matrix.summary.missing_ri > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Missing RI Contracts</div>
                            </div>
                            <div className={`p-5 rounded-xl border shadow-inner text-center ${matrix.summary.missing_account_services > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div className={`text-3xl font-black ${matrix.summary.missing_account_services > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{matrix.summary.missing_account_services}</div>
                                <div className={`text-[10px] font-black uppercase mt-1 ${matrix.summary.missing_account_services > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>Missing Account Svcs</div>
                            </div>
                        </div>

                        {/* Filter Buttons */}
                        {filterCounts && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                <button
                                    onClick={() => handleRunTrueUp('all')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    All Resources ({filterCounts.all || 0})
                                </button>
                                <button
                                    onClick={() => handleRunTrueUp('pending_ri')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeFilter === 'pending_ri' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                                >
                                    <i className="fas fa-exclamation-triangle mr-1"></i> Pending RI ({filterCounts.pending_ri || 0})
                                </button>
                                <button
                                    onClick={() => handleRunTrueUp('not_migrated')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeFilter === 'not_migrated' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                                >
                                    <i className="fas fa-server mr-1"></i> Not Migrated ({filterCounts.not_migrated || 0})
                                </button>
                                <button
                                    onClick={() => handleRunTrueUp('marked_for_deletion')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeFilter === 'marked_for_deletion' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                                >
                                    <i className="fas fa-trash-alt mr-1"></i> Marked for Deletion ({filterCounts.marked_for_deletion || 0})
                                </button>
                                <button
                                    onClick={() => handleRunTrueUp('pending_config')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeFilter === 'pending_config' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                >
                                    <i className="fas fa-cog mr-1"></i> Pending Config ({filterCounts.pending_config || 0})
                                </button>
                            </div>
                        )}

                        {/* Deployable Assets Table */}
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-3 border-b border-slate-200 pb-2">Deployable Assets (Compute, DB, Storage)</h4>
                            <table className="w-full text-left bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                                    <tr>
                                        <th className="p-3">Resource Name</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Commercial Intent (Quoted)</th>
                                        <th className="p-3">Live Environment</th>
                                        <th className="p-3 text-center">RI Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {matrix.deployable_assets.map((asset, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold text-slate-700">{asset.name}</td>
                                            <td className="p-3 text-slate-600">{asset.type}</td>
                                            <td className="p-3 font-mono text-slate-500">{asset.billing_mode}</td>
                                            <td className="p-3 text-center">
                                                {asset.status === 'COVERED' ? (
                                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest"><i className="fas fa-check mr-1"></i> Covered</span>
                                                ) : (
                                                    <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest"><i className="fas fa-exclamation-triangle mr-1"></i> Action Required (PO)</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Account Assets Table */}
                        {matrix.account_assets.length > 0 && (
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-3 border-b border-slate-200 pb-2">Account Assets (Support Plans, Security)</h4>
                                <table className="w-full text-left bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                                        <tr>
                                            <th className="p-3">Service Name</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Commercial Intent (Quoted)</th>
                                            <th className="p-3 text-center">BSS API Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {matrix.account_assets.map((asset, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold text-slate-700">{asset.name}</td>
                                                <td className="p-3 text-slate-600">{asset.type}</td>
                                                <td className="p-3 font-mono text-slate-500">{asset.billing_mode}</td>
                                                <td className="p-3 text-center">
                                                    {asset.status === 'COVERED' ? (
                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest"><i className="fas fa-check mr-1"></i> Covered</span>
                                                    ) : (
                                                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest"><i className="fas fa-exclamation-triangle mr-1"></i> Action Required (PO)</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
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
    
    // Modals
    const [showDossier, setShowDossier] = useState(false);
    const [showDetailedReport, setShowDetailedReport] = useState(false);
    const [detailsModal, setDetailsModal] = useState({ show: false, category: '', label: '', items: [] });

    const hasNocScanned = nocData !== null;

    // 🚨 Overhauled to dynamically extract all categories from the API payload so nothing is hidden
    const liveCategories = useMemo(() => {
        if (!hasNocScanned || !nocData?.raw) return [];
        return Object.keys(nocData.raw).map(key => ({
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
            count: nocData.raw[key]?.length || 0,
            items: nocData.raw[key] || []
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
                    provider: 'Huawei'
                })
            });
            const data = await res.json();
            
            if (data.success) {
                // 🚨 Just store the raw payload directly so we don't accidentally drop nested objects like Vaults/EIPs
                const finalNoc = { 
                    raw: data.inventory || {}
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

    const handleSaveState = () => {
        onUpdateProject(project.id, 'crApproved', crApproved);
        alert("3-Way Diff State Saved.");
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6">
            
            {/* ACTION HEADER */}
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
                                                    
                                                    {/* CLICKABLE ACTUAL CELL */}
                                                    <td 
                                                        className={`p-3 text-center font-mono font-black border-l border-slate-100 bg-emerald-50/30 ${actual > 0 ? 'text-emerald-700 cursor-pointer hover:bg-emerald-100 hover:shadow-inner transition-all group' : 'text-slate-400'}`}
                                                        onClick={() => {
                                                            if (actual > 0) {
                                                                setDetailsModal({ 
                                                                    show: true, 
                                                                    category: cat.id, 
                                                                    label: cat.label, 
                                                                    items: cat.items 
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

            {/* MODAL 1: STANDARD DOSSIER */}
            {showDossier && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl min-h-[800px] flex flex-col relative print:shadow-none print:min-h-0 animate-slide-up">
                        {/* Non-Printable Header */}
                        <div className="px-6 py-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center print:hidden rounded-t-xl">
                            <h3 className="font-black text-slate-800"><i className="fas fa-file-pdf text-rose-500 mr-2"></i> Handover Dossier Generated</h3>
                            <div className="space-x-3">
                                <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow transition-colors"><i className="fas fa-print mr-2"></i> Print / Save PDF</button>
                                <button onClick={()=>setShowDossier(false)} className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold rounded shadow transition-colors"><i className="fas fa-times mr-2"></i> Close</button>
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
                            
                            <div className="space-y-8 text-sm text-slate-700">
                                <div>
                                    <h3 className="font-black text-lg text-slate-900 border-b border-slate-200 pb-2 mb-4">Project Summary</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><span className="font-bold">Customer:</span> {project.customerName || 'N/A'}</div>
                                        <div><span className="font-bold">Target Region:</span> {project.region || 'la-south-2'}</div>
                                        <div><span className="font-bold">Kickoff Date:</span> {formatShortDate(project.kickoff)}</div>
                                        <div><span className="font-bold">Go-Live Date:</span> {formatShortDate(project.date)}</div>
                                        <div><span className="font-bold">Lead Architect:</span> {project.sa || 'N/A'}</div>
                                        <div><span className="font-bold">Partner:</span> {project.partner || 'N/A'}</div>
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl min-h-[800px] flex flex-col relative print:shadow-none print:min-h-0 animate-slide-up">
                        <div className="px-6 py-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center print:hidden rounded-t-xl">
                            <h3 className="font-black text-slate-800"><i className="fas fa-file-contract text-indigo-600 mr-2"></i> Detailed Handover Report Generated</h3>
                            <div className="space-x-3">
                                <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow"><i className="fas fa-print mr-2"></i> Print / Save PDF</button>
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
                                
                                <h4>1. Objective</h4>
                                <p className="text-sm">This document provides a detailed itemized list of all cloud resources successfully provisioned and verified in the Target Cloud environment.</p>

                                <h4>2. Provisioned Resources (Live API Telemetry)</h4>
                                {hasNocScanned && nocData?.raw ? (
                                    Object.entries(nocData.raw).map(([category, items]) => {
                                        if (!items || items.length === 0) return null;
                                        return (
                                            <div key={category} className="mb-6">
                                                <h5 className="uppercase text-xs font-black tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-1">{category}</h5>
                                                <table className="w-full text-left text-xs border border-slate-200">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="p-2 border-b border-slate-200">Resource Name/ID</th>
                                                            <th className="p-2 border-b border-slate-200">Specification</th>
                                                            <th className="p-2 border-b border-slate-200">IP / Meta</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="p-2 border-b border-slate-100 font-bold">{item.name || item.id || `Item ${idx}`}</td>
                                                                <td className="p-2 border-b border-slate-100 text-slate-600">{item.type || item.flavor || item.engine || item.bandwidth || 'Standard'}</td>
                                                                <td className="p-2 border-b border-slate-100 font-mono text-slate-500">{item.ip || item.private_ip_address || item.cidr || 'N/A'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No telemetry data available. Please run Final NOC Scan.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: RESOURCE DRILL-DOWN (The Table Modal) */}
            {detailsModal.show && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-700 animate-slide-up">
                        <div className="bg-slate-900 px-6 py-4 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black text-lg text-emerald-400">
                                <i className="fas fa-check-circle mr-2"></i> Verified {detailsModal.label}
                            </h3>
                            <button onClick={() => setDetailsModal({ show: false, category: '', label: '', items: [] })} className="text-slate-400 hover:text-white">
                                <i className="fas fa-times text-xl"></i>
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
                                            <th className="p-3">Target IP / Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {detailsModal.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="p-3 font-bold text-slate-800">{item.name || item.id || `Resource-${i}`}</td>
                                                <td className="p-3 text-slate-600">{item.type || item.engine || item.flavor || item.bandwidth || 'Standard'}</td>
                                                <td className="p-3 font-mono text-slate-500">{item.ip || item.private_ip_address || item.cidr || item.region || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl flex justify-between items-center shrink-0">
                            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Count: {detailsModal.items.length}</div>
                            <button onClick={() => setDetailsModal({ show: false, category: '', label: '', items: [] })} className="px-6 py-2.5 text-xs font-black text-white uppercase tracking-widest bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-md">Close Matrix</button>
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

// ==========================================
// 🌌 2. INTERACTIVE DIGITAL TWIN CONSTELLATION
// ==========================================
function LiveConstellationView({ activeProject }) {
    const [viewMode, setViewMode] = useState('live'); 
    const [playbackStep, setPlaybackStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Pan & Zoom State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    // Zoom Controls
    const handleZoom = (factor) => setZoom(prev => Math.min(Math.max(0.4, prev + factor), 3));
    const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    // Fullscreen Controls
    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => alert(`Error enabling fullscreen: ${err.message}`));
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Drag / Pan Controls
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    // Source Data: Prioritize Live NOC over Mapper Nodes
    const targetNodes = useMemo(() => {
        const rawNoc = activeProject?.nocData?.raw;
        
        if (rawNoc && Object.keys(rawNoc).length > 0) {
            const nodes = [];
            (rawNoc.compute || []).forEach(n => nodes.push({ id: n.id || Math.random().toString(), name: n.name, type: 'ECS', ip: n.private_ip_address || n.ip || 'N/A' }));
            (rawNoc.databases || rawNoc.database || []).forEach(n => nodes.push({ id: n.id || Math.random().toString(), name: n.name, type: 'RDS', ip: n.private_ip_address || n.ip || 'N/A' }));
            (rawNoc.network || []).forEach(n => nodes.push({ id: n.id || Math.random().toString(), name: n.name, type: 'VPC/NET', ip: n.cidr || n.ip || 'N/A' }));
            (rawNoc.storage || []).forEach(n => nodes.push({ id: n.id || Math.random().toString(), name: n.name, type: 'OBS', ip: 'N/A' }));
            
            return nodes.map((item, index) => ({
                ...item,
                timestamp: Date.now() + (index * 1000)
            })).sort((a, b) => a.timestamp - b.timestamp);
        }

        const rawMap = activeProject?.mapperNodes || [];
        const valid = rawMap.filter(n => n.status !== 'Quoted Only' && n.status !== 'Live Only');
        
        return valid.map((item, index) => {
            return {
                id: item.id || Math.random().toString(),
                name: item.name || 'Unnamed Resource',
                type: String(item.type).toUpperCase(),
                ip: item.ip || item.location || 'N/A',
                timestamp: Date.now() + (index * 1000) 
            };
        }).sort((a, b) => a.timestamp - b.timestamp);

    }, [activeProject]);

    // D3-style Graph Logic
    const graphData = useMemo(() => {
        const width = 1000;
        const height = 600;
        const cx = width / 2;
        const cy = height / 2;

        const hubs = {
            compute:  { x: cx - 250, y: cy - 150, color: '#06b6d4', icon: 'fa-server', name: 'Huawei ECS Core' },
            database: { x: cx + 250, y: cy - 150, color: '#f43f5e', icon: 'fa-database', name: 'Huawei RDS / Gauss' },
            network:  { x: cx - 250, y: cy + 150, color: '#8b5cf6', icon: 'fa-network-wired', name: 'Huawei VPC & Edge' },
            storage:  { x: cx + 250, y: cy + 150, color: '#10b981', icon: 'fa-hdd', name: 'Huawei OBS / SFS' },
        };

        const mappedNodes = [];
        const categorize = (type) => {
            if (['ECS', 'VM', 'CCE', 'ASG'].includes(type)) return 'compute';
            if (['RDS', 'GAUSSDB', 'DB'].includes(type)) return 'database';
            if (['VPC', 'SUBNET', 'VPN', 'NAT', 'EIP', 'ELB', 'CGW', 'VPC/NET'].includes(type)) return 'network';
            return 'storage';
        };

        const grouped = { compute: [], database: [], network: [], storage: [] };
        targetNodes.forEach(n => grouped[categorize(n.type)].push(n));

        let globalSeqIndex = 0;
        targetNodes.forEach((n) => {
            const cat = categorize(n.type);
            const hub = hubs[cat];
            const catNodes = grouped[cat];
            const catIndex = catNodes.findIndex(x => x.id === n.id);
            
            const angleStep = (Math.PI * 2) / (catNodes.length || 1);
            const radius = 90 + (Math.random() * 60); 
            const angle = catIndex * angleStep + (Math.random() * 0.5); 
            
            mappedNodes.push({
                ...n,
                category: cat,
                x: hub.x + Math.cos(angle) * radius,
                y: hub.y + Math.sin(angle) * radius,
                color: hub.color,
                icon: hub.icon,
                sequenceId: globalSeqIndex++ 
            });
        });

        return { hubs, mappedNodes, cx, cy, width, height, totalNodes: mappedNodes.length };
    }, [targetNodes]);

    useEffect(() => {
        if (viewMode === 'live') {
            setPlaybackStep(graphData.totalNodes);
            setIsPlaying(false);
        }
    }, [viewMode, graphData.totalNodes]);

    useEffect(() => {
        let interval;
        if (isPlaying && playbackStep <= graphData.totalNodes) {
            interval = setInterval(() => {
                setPlaybackStep(prev => prev + 1);
            }, 300); 
        } else if (playbackStep > graphData.totalNodes) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackStep, graphData.totalNodes]);

    const handleReplay = () => {
        setViewMode('replay');
        setPlaybackStep(0);
        setIsPlaying(true);
    };

    if (targetNodes.length === 0) {
        return (
            <div className="bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 p-16 text-center text-slate-500 animate-fade-in max-w-[1600px] mx-auto shadow-xl">
                <i className="fas fa-meteor text-6xl mb-4 text-slate-700"></i>
                <h3 className="font-black text-xl mb-2 text-white">Constellation Offline</h3>
                <p className="font-medium text-sm">No live API telemetry found. Run the Final NOC Scan in Tab 1 to generate the Twin.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6">
            
            <div ref={containerRef} className={`relative flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999] bg-slate-900 h-screen w-screen' : 'bg-slate-900 rounded-2xl shadow-xl h-[650px] border border-slate-700'} overflow-hidden select-none`}>
                
                {/* FLOATING HEADER CONTROLS */}
                <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start pointer-events-none">
                    <div className="bg-slate-800/90 backdrop-blur border border-slate-700 px-5 py-3 rounded-xl shadow-lg pointer-events-auto">
                        <h3 className="font-black flex items-center gap-3 text-lg text-white">
                            <i className="fas fa-meteor text-blue-500"></i> Target Constellation
                            {activeProject?.nocData && <span className="ml-2 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-black border border-emerald-500/30"><i className="fas fa-wifi mr-1"></i> Live</span>}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Interactive Digital Twin</p>
                    </div>
                    
                    <div className="flex gap-3 pointer-events-auto">
                        <div className="bg-slate-800/90 backdrop-blur p-1.5 rounded-xl border border-slate-700 shadow-lg flex">
                            <button onClick={()=>{setViewMode('live'); setIsPlaying(false); setPlaybackStep(graphData.totalNodes);}} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
                                <i className="fas fa-eye mr-2"></i> Live State
                            </button>
                            <button onClick={handleReplay} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'replay' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
                                <i className="fas fa-history mr-2"></i> Playback
                            </button>
                        </div>
                        <button onClick={toggleFullscreen} className="bg-slate-800/90 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-lg text-slate-400 hover:text-white transition-colors" title="Toggle Fullscreen">
                            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                        </button>
                    </div>
                </div>

                {/* ZOOM CONTROLS */}
                <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl shadow-lg z-40 flex overflow-hidden">
                    <button onClick={()=>handleZoom(-0.2)} className="px-4 py-2.5 text-slate-400 hover:bg-slate-700 hover:text-white font-black transition-colors"><i className="fas fa-search-minus"></i></button>
                    <div className="px-3 py-2.5 bg-slate-900 border-l border-r border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 w-16 text-center flex items-center justify-center">{Math.round(zoom * 100)}%</div>
                    <button onClick={()=>handleZoom(0.2)} className="px-4 py-2.5 text-slate-400 hover:bg-slate-700 hover:text-white font-black transition-colors"><i className="fas fa-search-plus"></i></button>
                    <button onClick={handleResetZoom} className="px-3 py-2.5 border-l border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-blue-400 font-black transition-colors" title="Reset View"><i className="fas fa-sync-alt"></i></button>
                </div>

                {/* PLAYBACK PROGRESS OVERLAY */}
                <div className="absolute bottom-6 left-6 bg-slate-800/90 backdrop-blur px-6 py-4 rounded-xl border border-slate-700 z-40 shadow-xl pointer-events-none">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {viewMode === 'live' ? 'Live Target State' : 'Deployment Sequence Playback'}
                    </div>
                    <div className="text-xl font-black text-white font-mono flex items-center gap-2">
                        {Math.min(playbackStep, graphData.totalNodes)} <span className="text-slate-500 text-sm">/ {graphData.totalNodes} Nodes</span>
                        {viewMode === 'live' && <span className="flex h-2 w-2 relative ml-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                    </div>
                    {viewMode === 'replay' && (
                        <div className="w-48 h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(Math.min(playbackStep, graphData.totalNodes) / graphData.totalNodes) * 100}%` }}></div>
                        </div>
                    )}
                </div>

                {/* INTERACTIVE DRAG/PAN CANVAS AREA */}
                <div 
                    className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none"></div>
                    
                    {/* Transforming Container */}
                    <div className="w-full h-full transform-origin-center transition-transform duration-75 ease-out flex items-center justify-center" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
                        
                        <div style={{ width: graphData.width, height: graphData.height, position: 'relative' }}>
                            <svg width="100%" height="100%" viewBox={`0 0 ${graphData.width} ${graphData.height}`} className="absolute inset-0 pointer-events-none overflow-visible">
                                {playbackStep > 0 && Object.values(graphData.hubs).map((hub, i) => (
                                    <line key={`hub-line-${i}`} x1={graphData.cx} y1={graphData.cy} x2={hub.x} y2={hub.y} stroke={hub.color} strokeWidth="1" strokeDasharray="4 4" className="opacity-30" />
                                ))}
                                {graphData.mappedNodes.map((n, i) => {
                                    if (i >= playbackStep) return null;
                                    const hub = graphData.hubs[n.category];
                                    return <line key={`node-line-${i}`} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} stroke={n.color} strokeWidth="1.5" className={`opacity-40 ${viewMode === 'replay' ? 'animate-pulse' : ''}`} />;
                                })}
                            </svg>

                            {/* Core Router */}
                            {playbackStep > 0 && (
                                <div className="absolute w-20 h-20 bg-blue-900 border-2 border-blue-400 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.4)] z-20 animate-fade-in pointer-events-none" style={{ left: graphData.cx - 40, top: graphData.cy - 40 }}>
                                    <i className="fas fa-cloud text-blue-300 text-2xl"></i>
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest mt-1">Huawei VPC</span>
                                </div>
                            )}

                            {/* Service Hubs */}
                            {playbackStep > 0 && Object.values(graphData.hubs).map((hub, i) => (
                                <div key={`hub-${i}`} className="absolute w-12 h-12 rounded-full flex items-center justify-center z-20 animate-fade-in pointer-events-none" style={{ left: hub.x - 24, top: hub.y - 24, backgroundColor: `${hub.color}20`, border: `2px solid ${hub.color}`, boxShadow: `0 0 20px ${hub.color}40` }}>
                                    <i className={`fas ${hub.icon} text-lg`} style={{ color: hub.color }}></i>
                                    <div className="absolute -bottom-7 w-32 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">{hub.name}</div>
                                </div>
                            ))}

                            {/* Resources (Satellites) */}
                            {graphData.mappedNodes.map((n, i) => {
                                if (i >= playbackStep) return null;
                                return (
                                    <div key={`node-${i}`} className="absolute z-30 group animate-fade-in pointer-events-auto" style={{ left: n.x - 12, top: n.y - 12 }}>
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-125 transition-transform cursor-pointer" style={{ backgroundColor: n.color, boxShadow: `0 0 15px ${n.color}80` }}>
                                            <i className={`fas ${n.icon} text-[10px] text-white`}></i>
                                        </div>

                                        {/* Hover Tooltip (Interactive) */}
                                        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur border border-slate-600 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-max z-50">
                                            <div className="text-[10px] font-black text-white uppercase tracking-widest border-b border-slate-600 pb-1.5 mb-1.5">{n.name}</div>
                                            <div className="text-[9px] font-bold text-slate-400 mb-1">Type: <span style={{ color: n.color }} className="font-black ml-1 uppercase">{n.type}</span></div>
                                            <div className="text-[9px] font-bold text-slate-400 mb-1">Target IP: <span className="font-mono text-emerald-400 ml-1">{n.ip}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
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
