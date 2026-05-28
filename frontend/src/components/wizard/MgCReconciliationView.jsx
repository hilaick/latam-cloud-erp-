import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function MgCReconciliationView({ activeProject, onUpdateProject }) {
    const [isScanning, setIsScanning] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showPaste, setShowPaste] = useState(false);
    const [pasteText, setPasteText] = useState('');
    
    const { customers } = useContext(ERPContext);

    const quotedCompute = activeProject?.blueprintData?.topology?.compute?.length || 0;
    const quotedDb = activeProject?.blueprintData?.topology?.database?.length || 0;

    const discoveredCompute = activeProject?.mgcData?.compute || null;
    const discoveredDb = activeProject?.mgcData?.database || null;
    const mgcData = activeProject?.mgcData;

    const runMgCDiscovery = async () => {
        setIsScanning(true);
        const custName = (activeProject?.customerName || activeProject?.name.split('-')[0] || '').trim().toLowerCase();
        const customer = customers.find(c => c.name.toLowerCase() === custName);

        if (!customer) {
            alert("No matching Customer Profile found. Please ensure the customer exists in the Customer Directory.");
            setIsScanning(false);
            return;
        }

        try {
            const token = localStorage.getItem('erp_jwt_token');
            if (!token) throw new Error("Authentication required.");

            const res = await fetch('/api/cloud/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customer_id: customer.id, region: customer.region || 'la-south-2' })
            });

            if (res.status === 401) throw new Error("Authentication failed.");

            const data = await res.json();
            if (data.success) {
                const inv = data.inventory;
                const liveData = {
                    source: 'api',
                    compute: inv.compute ? inv.compute.length : 0,
                    database: inv.databases ? inv.databases.length : 0,
                    raw_inventory: inv
                };
                onUpdateProject(activeProject.id, 'mgcData', liveData);
                alert("MgC Discovery Complete!");
            } else {
                alert(`API Discovery Failed: ${data.error}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('erp_jwt_token');
        fetch('/api/source-resources/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const liveData = {
                    source: 'excel',
                    compute: data.counts?.servers || 0,
                    database: data.counts?.databases || 0,
                    counts: data.counts,
                    raw_inventory: data.resources
                };
                onUpdateProject(activeProject.id, 'mgcData', liveData);
                setPasteText('');
                setShowPaste(false);
                alert(`Successfully imported resource data!`);
            } else {
                alert(`Upload Failed: ${data.error}`);
            }
        })
        .catch(err => alert(`Error: ${err.message}`))
        .finally(() => setIsImporting(false));
    };

    const handleExcelUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        input.onchange = (e) => handleFileUpload(e.target.files[0]);
        input.click();
    };

    const handlePasteSubmit = () => {
        if (!pasteText.trim()) return;
        // Convert the pasted text to a TSV File Blob
        const file = new File([pasteText], "pasted_data.tsv", { type: "text/tab-separated-values" });
        handleFileUpload(file);
    };

    const handleClearData = () => {
        if(window.confirm("Are you sure you want to completely delete all imported resource data?")) {
            onUpdateProject(activeProject.id, 'mgcData', null);
        }
    };

    const hasScanned = discoveredCompute !== null;
    const computeDiff = hasScanned ? (discoveredCompute - quotedCompute) : 0;
    const dbDiff = hasScanned ? (discoveredDb - quotedDb) : 0;

    const renderExpandedList = () => {
        if (!mgcData || !mgcData.raw_inventory) return null;

        const res = mgcData.raw_inventory;
        const isExcel = mgcData.source === 'excel';
        const categories = isExcel 
            ? ['servers', 'containers', 'middleware', 'databases', 'big_data', 'network', 'storage']
            : ['compute', 'databases', 'network'];

        return (
            <div className="mt-8 pt-8 border-t border-slate-200 animate-fade-in">
                <h4 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2">
                    <i className={`fas fa-list ${isExcel ? 'text-blue-600' : 'text-emerald-600'}`}></i> 
                    Expanded Resource List ({isExcel ? 'Imported' : 'Live Scan'})
                </h4>
                
                {categories.map(category => {
                    const items = res[category] || [];
                    if (items.length === 0) return null;
                    return (
                        <div key={category} className="mb-6">
                            <h5 className="font-bold text-sm uppercase tracking-widest text-slate-600 mb-3 capitalize">{category.replace('_', ' ')} ({items.length})</h5>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden custom-scrollbar overflow-x-auto shadow-sm">
                                <table className="w-full text-left text-xs min-w-[800px]">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase">
                                        <tr>
                                            <th className="p-3 w-64">Name</th>
                                            <th className="p-3">Specifications</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white transition-colors">
                                                <td className="p-3 font-bold text-slate-800 break-all">{item.name}</td>
                                                <td className="p-3 font-mono text-[10px] text-slate-600 leading-relaxed">
                                                    {Object.entries(item.specs || {})
                                                        .filter(([k, v]) => v !== null && v !== '')
                                                        .map(([k, v]) => <span key={k} className="mr-3 inline-block"><span className="text-slate-400">{k}:</span> <span className="font-bold text-slate-700">{v}</span></span>)
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-search text-blue-600"></i> MgC Source Resources</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Discover and import source environment resources for migration planning.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Option 1: Automated Discovery */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                <i className="fas fa-robot text-emerald-600"></i> Automated Discovery
                            </h4>
                            <button 
                                onClick={runMgCDiscovery} 
                                disabled={isScanning || isImporting}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-md transition-transform active:scale-95 disabled:opacity-50 whitespace-nowrap"
                            >
                                {isScanning ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning...</> : <><i className="fas fa-radar mr-2"></i> Run Scan</>}
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><i className="fas fa-cloud text-emerald-600"></i></div>
                                    <div>
                                        <h5 className="font-bold text-slate-800 text-sm">Huawei Cloud API Scan</h5>
                                        <p className="text-xs text-slate-500">Real-time infrastructure discovery</p>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-600">
                                    <p className="mb-2">Automatically scans Huawei Cloud using customer's vaulted AK/SK credentials to discover Compute, Databases, Networks, and Storage.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Option 2: Import Resource Data */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <h4 className="font-black text-slate-800 text-lg flex items-center gap-2 shrink-0">
                                <i className="fas fa-file-import text-blue-600"></i> Import Data
                            </h4>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button 
                                    onClick={() => setShowPaste(!showPaste)}
                                    disabled={isScanning || isImporting}
                                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50 ${showPaste ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'}`}
                                >
                                    <i className="fas fa-paste mr-2"></i> Paste
                                </button>
                                <button 
                                    onClick={handleExcelUpload}
                                    disabled={isScanning || isImporting}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-md transition-transform active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                >
                                    {isImporting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Importing...</> : <><i className="fas fa-file-excel mr-2"></i> Excel</>}
                                </button>
                            </div>
                        </div>

                        {showPaste && (
                            <div className="mb-4 animate-slide-up-liquid border border-slate-200 rounded-xl p-3 bg-slate-50">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block"><i className="fas fa-clipboard mr-1"></i> Paste Excel / TSV Data</label>
                                <textarea 
                                    value={pasteText}
                                    onChange={e => setPasteText(e.target.value)}
                                    placeholder="Click in the top-left cell of your Excel spreadsheet, press Ctrl+A, then Ctrl+C. Paste it right here..."
                                    className="w-full h-32 p-3 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-blue-500 custom-scrollbar whitespace-pre"
                                ></textarea>
                                <div className="mt-2 text-right">
                                    <button onClick={handlePasteSubmit} disabled={!pasteText.trim()} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50">Process Text</button>
                                </div>
                            </div>
                        )}
                        
                        {!showPaste && (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><i className="fas fa-file-excel text-blue-600"></i></div>
                                        <div>
                                            <h5 className="font-bold text-slate-800 text-sm">MgC Template Import</h5>
                                            <p className="text-xs text-slate-500">Upload structured resource inventory</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        <p>Upload Excel files or paste clipboard data containing source environment configurations, including multiple sheets (Servers, Databases, etc).</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Discovery Results Section */}
                {hasScanned && (
                    <div className="mt-8 pt-8 border-t border-slate-200 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                <i className="fas fa-chart-bar text-emerald-600"></i> Discovery Results {mgcData?.source === 'excel' ? '(Imported)' : '(Live API Scan)'}
                            </h4>
                            {/* 🚨 DELETE DATA BUTTON */}
                            <button onClick={handleClearData} className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white transition-colors rounded-lg text-xs font-black uppercase tracking-widest shadow-sm">
                                <i className="fas fa-trash-alt mr-2"></i> Delete Data
                            </button>
                        </div>

                        {mgcData?.source === 'excel' && (
                            <div className="mb-6 p-6 rounded-2xl border-2 bg-blue-50 border-blue-200 shadow-inner">
                                <h4 className="font-black text-sm uppercase tracking-widest text-blue-900 mb-4 border-b border-blue-200/50 pb-2"><i className="fas fa-layer-group mr-2"></i> Imported Resource Counts</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-center"><div className="text-[10px] uppercase font-bold text-slate-500">Servers</div><div className="text-xl font-black text-blue-700">{mgcData.counts?.servers || 0}</div></div>
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-center"><div className="text-[10px] uppercase font-bold text-slate-500">Containers</div><div className="text-xl font-black text-blue-700">{mgcData.counts?.containers || 0}</div></div>
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-center"><div className="text-[10px] uppercase font-bold text-slate-500">Middleware</div><div className="text-xl font-black text-blue-700">{mgcData.counts?.middleware || 0}</div></div>
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-center"><div className="text-[10px] uppercase font-bold text-slate-500">Databases</div><div className="text-xl font-black text-blue-700">{mgcData.counts?.databases || 0}</div></div>
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-center"><div className="text-[10px] uppercase font-bold text-slate-500">Big Data</div><div className="text-xl font-black text-blue-700">{mgcData.counts?.big_data || 0}</div></div>
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-center"><div className="text-[10px] uppercase font-bold text-slate-500">Network</div><div className="text-xl font-black text-blue-700">{mgcData.counts?.network || 0}</div></div>
                                    <div className="bg-white p-3 rounded-xl shadow-sm text-center"><div className="text-[10px] uppercase font-bold text-slate-500">Storage</div><div className="text-xl font-black text-blue-700">{mgcData.counts?.storage || 0}</div></div>
                                </div>
                            </div>
                        )}
                        
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-start mb-6">
                            <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                            <p className="text-xs text-blue-900 font-bold leading-relaxed">The data below highlights discrepancies (Scope Creep) between the signed contract and the actual infrastructure. These deltas must be accounted for in Delivery Physics.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`p-6 rounded-2xl border-2 ${computeDiff > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-700 mb-4 border-b border-slate-200/50 pb-2"><i className="fas fa-server mr-2"></i> Compute Nodes</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold">Quoted (SOW):</span> <span className="font-black">{quotedCompute}</span></div>
                                    <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold">Discovered (MgC):</span> <span className="font-black">{discoveredCompute}</span></div>
                                    <div className="pt-3 border-t border-slate-200/50 flex justify-between items-center">
                                        <span className="text-xs uppercase font-black tracking-widest text-slate-500">Delta / Creep</span>
                                        <span className={`text-xl font-black ${computeDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{computeDiff > 0 ? `+${computeDiff}` : computeDiff}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`p-6 rounded-2xl border-2 ${dbDiff > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-700 mb-4 border-b border-slate-200/50 pb-2"><i className="fas fa-database mr-2"></i> Databases</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold">Quoted (SOW):</span> <span className="font-black">{quotedDb}</span></div>
                                    <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold">Discovered (MgC):</span> <span className="font-black">{discoveredDb}</span></div>
                                    <div className="pt-3 border-t border-slate-200/50 flex justify-between items-center">
                                        <span className="text-xs uppercase font-black tracking-widest text-slate-500">Delta / Creep</span>
                                        <span className={`text-xl font-black ${dbDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{dbDiff > 0 ? `+${dbDiff}` : dbDiff}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 rounded-2xl border-2 bg-slate-50 border-slate-200 opacity-60">
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-700 mb-4 border-b border-slate-200 pb-2"><i className="fas fa-network-wired mr-2"></i> Network / Subnets</h4>
                                <div className="text-center pt-4 text-xs font-bold text-slate-500">
                                    Network architectures are mapped visually via the Topology Mapper, not via MgC volume counts.
                                </div>
                            </div>
                        </div>

                        {renderExpandedList()}
                    </div>
                )}

                {!hasScanned && (
                    <div className="text-center py-12 text-slate-500">
                        <i className="fas fa-cloud-upload-alt text-4xl mb-4 opacity-50"></i>
                        <p className="text-sm font-medium">Run Automated Discovery or upload Excel data to see resource analysis.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
