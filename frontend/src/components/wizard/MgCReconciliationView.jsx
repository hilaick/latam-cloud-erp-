import React, { useState, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';

export default function MgCReconciliationView({ activeProject, onUpdateProject }) {
    const [isScanning, setIsScanning] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showPaste, setShowPaste] = useState(false);
    const [pasteText, setPasteText] = useState('');
    
    const { customers } = useContext(ERPContext);

    // Dynamic extraction logic to handle both Excel and API sources safely
    const rawInv = activeProject?.mgcData?.raw_inventory || {};
    const isExcel = activeProject?.mgcData?.source === 'excel';

    // Discovered Counts
    const discoveredCompute = isExcel ? (rawInv.servers?.length || 0) : (rawInv.compute?.length || 0);
    const discoveredDb = rawInv.databases?.length || 0;
    const discoveredObs = (rawInv.storage || []).filter(s => s.type === 'OBS' || s.specs?.type === 'OBS' || !s.type).length;
    const discoveredCbr = (rawInv.storage || []).filter(s => s.type === 'CBR' || s.specs?.type === 'CBR').length;
    const discoveredVpn = (rawInv.network || []).filter(n => n.type === 'VPN' || n.specs?.type === 'VPN').length;

    // Quoted Counts
    const top = activeProject?.blueprintData?.topology || {};
    const quotedCompute = top.compute?.length || 0;
    const quotedDb = top.database?.length || 0;
    const quotedObs = (top.storage || []).filter(s => s.type === 'OBS').length;
    const quotedCbr = (top.storage || []).filter(s => s.type === 'CBR').length;
    const quotedVpn = (top.network || []).filter(n => n.type === 'VPN').length;

    const hasScanned = activeProject?.mgcData != null;

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
            const res = await fetch('/api/cloud/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customer_id: customer.id, region: customer.region || 'la-south-2' })
            });

            const data = await res.json();
            if (data.success) {
                onUpdateProject(activeProject.id, 'mgcData', { source: 'api', raw_inventory: data.inventory });
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
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                onUpdateProject(activeProject.id, 'mgcData', { source: 'excel', counts: data.counts, raw_inventory: data.resources });
                setPasteText(''); setShowPaste(false); alert(`Successfully imported resource data!`);
            } else { alert(`Upload Failed: ${data.error}`); }
        })
        .catch(err => alert(`Error: ${err.message}`))
        .finally(() => setIsImporting(false));
    };

    const handleClearData = () => {
        if(window.confirm("Are you sure you want to completely delete all imported resource data?")) {
            onUpdateProject(activeProject.id, 'mgcData', null);
        }
    };

    // Helper for rendering summary cards
    const renderCard = (title, icon, quoted, discovered) => {
        const diff = discovered - quoted;
        const isCreep = diff > 0;
        const bg = isCreep ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200';
        const text = isCreep ? 'text-rose-600' : 'text-emerald-600';
        
        return (
            <div className={`p-5 rounded-2xl border-2 shadow-sm ${bg} transition-colors hover:shadow-md`}>
                <h4 className="font-black text-[11px] uppercase tracking-widest text-slate-700 mb-3 border-b border-slate-200/50 pb-2"><i className={`fas ${icon} mr-2`}></i> {title}</h4>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs"><span className="text-slate-600 font-bold">Quoted:</span> <span className="font-black">{quoted}</span></div>
                    <div className="flex justify-between items-center text-xs"><span className="text-slate-600 font-bold">Discovered:</span> <span className="font-black">{discovered}</span></div>
                    <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center mt-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Delta</span>
                        <span className={`text-lg font-black ${text}`}>{diff > 0 ? `+${diff}` : diff}</span>
                    </div>
                </div>
            </div>
        );
    }

    const renderExpandedList = () => {
        if (!hasScanned) return null;

        // 🚨 FIX: Live API scan now iterates through Storage explicitly!
        const categories = isExcel 
            ? ['servers', 'containers', 'middleware', 'databases', 'big_data', 'network', 'storage']
            : ['compute', 'databases', 'network', 'storage'];

        return (
            <div className="mt-8 pt-8 border-t border-slate-200 animate-fade-in">
                <h4 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2">
                    <i className={`fas fa-list ${isExcel ? 'text-blue-600' : 'text-emerald-600'}`}></i> 
                    Expanded Resource List ({isExcel ? 'Imported MgC Data' : 'Live API Scan'})
                </h4>
                
                {categories.map(category => {
                    const items = rawInv[category] || [];
                    if (items.length === 0) return null;
                    return (
                        <div key={category} className="mb-6">
                            <h5 className="font-bold text-sm uppercase tracking-widest text-slate-600 mb-3 capitalize">{category.replace('_', ' ')} ({items.length})</h5>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden custom-scrollbar max-h-[400px] overflow-y-auto shadow-sm">
                                <table className="w-full text-left text-xs min-w-[800px]">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase sticky top-0 z-10 shadow-sm">
                                        <tr><th className="p-4 w-64 font-black">Resource Name / ID</th><th className="p-4 font-black">Specifications & Attributes</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, idx) => {
                                            
                                            // 🚨 FIX: Extract capacities dynamically
                                            let specs = item.specs || {};
                                            if (!isExcel) {
                                                if (category === 'compute') specs = { Status: item.status, Flavor: item.flavor, vCPUs: item.vcpus, RAM: `${item.ram_gb}GB`, OS: item.os_type };
                                                else if (category === 'databases') specs = { Status: item.status, Engine: item.engine, Version: item.version, Volume: `${item.volume_gb}GB` };
                                                else if (category === 'network') specs = { Type: item.type, Status: item.status, CIDR: item.cidr || 'N/A' };
                                                else if (category === 'storage') {
                                                    specs = { Type: item.type, Status: item.status, Location: item.location || item.region || 'Global' };
                                                    if (item.type === 'CBR') {
                                                        specs['Allocated Space'] = item.size ? `${item.size}GB` : 'N/A';
                                                        specs['Used Space'] = item.used ? `${item.used}GB` : '0GB';
                                                    } else {
                                                        specs['Capacity'] = item.size || 'Dynamic';
                                                    }
                                                }
                                            }

                                            return (
                                                <tr key={idx} className="hover:bg-white transition-colors">
                                                    <td className="p-4 font-bold text-slate-800 break-all align-top">{item.name || item.id}</td>
                                                    <td className="p-4 font-mono text-[10px] text-slate-600 leading-relaxed">
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(specs).filter(([k, v]) => v !== null && v !== '').map(([k, v]) => (
                                                                <span key={k} className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700">
                                                                    <span className="text-slate-400 font-bold mr-1">{k}:</span><span className="font-black">{v}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
                    {/* Automated Discovery Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-black text-slate-800 text-lg flex items-center gap-2"><i className="fas fa-robot text-emerald-600"></i> Automated Discovery</h4>
                            <button onClick={runMgCDiscovery} disabled={isScanning || isImporting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-md transition-transform active:scale-95 disabled:opacity-50">
                                {isScanning ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning...</> : <><i className="fas fa-radar mr-2"></i> Run Scan</>}
                            </button>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-auto">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><i className="fas fa-cloud text-emerald-600"></i></div>
                                <div>
                                    <h5 className="font-bold text-slate-800 text-sm">Huawei Cloud API Scan</h5>
                                    <p className="text-xs text-slate-500">Real-time infrastructure discovery</p>
                                </div>
                            </div>
                            <div className="text-xs text-slate-600">Automatically scans Huawei Cloud to discover Compute, Databases, Networks, Backup Vaults, VPNs, and Storage.</div>
                        </div>
                    </div>

                    {/* Import Resource Data Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <h4 className="font-black text-slate-800 text-lg flex items-center gap-2 shrink-0"><i className="fas fa-file-import text-blue-600"></i> Import Data</h4>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => setShowPaste(!showPaste)} disabled={isScanning || isImporting} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-md transition-all ${showPaste ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 border border-slate-300'}`}>Paste</button>
                                <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx,.csv'; i.onchange = e => handleFileUpload(e.target.files[0]); i.click(); }} disabled={isScanning || isImporting} className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-md transition-transform">Excel</button>
                            </div>
                        </div>
                        {showPaste ? (
                            <div className="animate-slide-up-liquid border border-slate-200 rounded-xl p-3 bg-slate-50 mt-auto">
                                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste Excel data here..." className="w-full h-32 p-3 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-blue-500"></textarea>
                                <div className="mt-2 text-right"><button onClick={handlePasteSubmit} disabled={!pasteText.trim()} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-xs font-black uppercase">Process</button></div>
                            </div>
                        ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-auto">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><i className="fas fa-file-excel text-blue-600"></i></div>
                                    <div><h5 className="font-bold text-slate-800 text-sm">MgC Template Import</h5><p className="text-xs text-slate-500">Upload structured resource inventory</p></div>
                                </div>
                                <div className="text-xs text-slate-600">Upload Excel files containing source environment configurations, including multiple sheets.</div>
                            </div>
                        )}
                    </div>
                </div>

                {hasScanned && (
                    <div className="mt-8 pt-8 border-t border-slate-200 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-black text-slate-800 text-lg flex items-center gap-2"><i className="fas fa-chart-bar text-emerald-600"></i> Discovery Results</h4>
                            <button onClick={handleClearData} className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-black uppercase"><i className="fas fa-trash-alt mr-2"></i> Delete Data</button>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-start mb-6">
                            <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                            <p className="text-xs text-blue-900 font-bold leading-relaxed">The data below highlights discrepancies (Scope Creep) between the signed contract and the actual infrastructure.</p>
                        </div>
                        
                        {/* 🚨 FIX: 5 Unified Scope Creep Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {renderCard("Compute Nodes", "fa-server", quotedCompute, discoveredCompute)}
                            {renderCard("Databases", "fa-database", quotedDb, discoveredDb)}
                            {renderCard("OBS Buckets", "fa-hdd", quotedObs, discoveredObs)}
                            {renderCard("CBR Vaults", "fa-shield-alt", quotedCbr, discoveredCbr)}
                            {renderCard("VPN Gateways", "fa-route", quotedVpn, discoveredVpn)}
                        </div>

                        {renderExpandedList()}
                    </div>
                )}
            </div>
        </div>
    );
}
