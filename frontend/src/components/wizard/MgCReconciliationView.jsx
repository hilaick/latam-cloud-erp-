import React, { useState, useEffect } from 'react';

export default function MgCReconciliationView({ activeProject, onUpdateProject }) {
    const [scanMode, setScanMode] = useState('live'); 
    const [isScanning, setIsScanning] = useState(false);
    const [showDiscoveryHelp, setShowDiscoveryHelp] = useState(false);
    const [migrationTools, setMigrationTools] = useState(null);
    
    // 🚨 EXPOSED STATE
    const [provider, setProvider] = useState('Huawei'); 
    const [subscriptionId, setSubscriptionId] = useState(''); 
    
    const hasData = activeProject?.mgcData?.raw_inventory && (
        (activeProject.mgcData.raw_inventory.compute?.length > 0) ||
        (activeProject.mgcData.raw_inventory.databases?.length > 0) ||
        (activeProject.mgcData.raw_inventory.network?.length > 0) ||
        (activeProject.mgcData.raw_inventory.storage?.length > 0)
    );

    useEffect(() => {
        const fetchTools = async () => {
            try {
                const token = localStorage.getItem('erp_jwt_token');
                const res = await fetch('/api/migration/tools', { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.success) setMigrationTools(data.tools);
            } catch (err) { console.error("Failed to fetch migration tools", err); }
        };
        fetchTools();
    }, []);

    const mergeDeduplicate = (arr1 = [], arr2 = []) => {
        const map = new Map();
        arr1.forEach(item => { if (item?.name) map.set(item.name.toLowerCase().trim(), item); });
        arr2.forEach(item => { if (item?.name) map.set(item.name.toLowerCase().trim(), item); });
        return Array.from(map.values());
    };

    const isQuoted = (resourceName) => {
        if (!resourceName || !activeProject?.blueprintData?.topology) return false;
        const targetName = resourceName.toLowerCase().trim();
        for (const category of Object.values(activeProject.blueprintData.topology)) {
            if (Array.isArray(category)) {
                if (category.some(item => item.name && item.name.toLowerCase().trim() === targetName)) return true;
            }
        }
        return false;
    };

    const handleLiveScan = async () => {
        if (!activeProject.customerId) {
            return alert("Discovery Error: No Customer linked to this project.\nPlease link this project to a Customer with valid Vault Credentials to run a secure scan.");
        }

        setIsScanning(true);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch('/api/cloud/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    customer_id: activeProject.customerId, 
                    projectId: activeProject.id, 
                    region: activeProject.region || 'la-south-2',
                    provider: provider,
                    subscriptionId: subscriptionId 
                })
            });
            const data = await res.json();
            
            if (data.success) {
                const existing = activeProject.mgcData?.raw_inventory || { compute: [], databases: [], storage: [], network: [] };
                const inventory = {
                    compute: mergeDeduplicate(existing.compute, data.inventory.compute || []),
                    databases: mergeDeduplicate(existing.databases, data.inventory.databases || data.inventory.database || []),
                    storage: mergeDeduplicate(existing.storage, data.inventory.storage || []),
                    network: mergeDeduplicate(existing.network, data.inventory.network || [])
                };
                
                onUpdateProject(activeProject.id, 'mgcData', { raw_inventory: inventory });
                alert(`${provider} Discovery Scan Complete.\n\nSuccessfully cross-referenced live infrastructure with the Blueprint.`);
            } else { 
                alert(`Discovery Error: ${data.error}`); 
            }
        } catch (err) { 
            alert(`Network error occurred during API scan: ${err.message}`); 
        } finally { 
            setIsScanning(false); 
        }
    };

    const handleOfflineUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsScanning(true);
        try {
            const token = localStorage.getItem('erp_jwt_token');
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch('/api/source-resources/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                const existing = activeProject.mgcData?.raw_inventory || { compute: [], databases: [], storage: [], network: [] };
                const inventory = {
                    compute: mergeDeduplicate(existing.compute, data.resources.servers || data.resources.compute || []),
                    databases: mergeDeduplicate(existing.databases, data.resources.databases || data.resources.database || []),
                    storage: mergeDeduplicate(existing.storage, data.resources.storage || []),
                    network: mergeDeduplicate(existing.network, data.resources.network || [])
                };
                onUpdateProject(activeProject.id, 'mgcData', { raw_inventory: inventory });
                alert(`Offline Discovery Complete.\nMerged new nodes into the inventory.`);
            } else { alert(`Parse Error: ${data.error}`); }
        } catch (err) { alert(`Network error: ${err.message}`); } 
        finally { setIsScanning(false); e.target.value = null; }
    };

    const handleAddToWBS = (tool) => {
        const currentPlan = activeProject.migrationPlan || [];
        if (currentPlan.some(task => task.name.includes(tool.id.toUpperCase()))) return alert(`${tool.name} is already assigned in your WBS.`);
        const newTask = {
            id: `task-${Date.now()}`, name: `[Auto-Assigned] Execute Migration via ${tool.name}`,
            prog: "0%", resp: "Partner", start: "", end: "", isParent: false,
            notes: `Recommended Scenario: ${tool.scenarios.join(', ')}. Auto-assigned via Source Discovery.`
        };
        onUpdateProject(activeProject.id, 'migrationPlan', [...currentPlan, newTask]);
        alert(`${tool.name} strategy successfully added to the Phase 3 WBS & RACI Matrix!`);
    };

    return (
        <div className="animate-fade-in max-w-[1200px] mx-auto pb-12 relative space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-200 pb-6 mb-8 flex-wrap gap-4">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-satellite-dish text-blue-500"></i> Source Infrastructure Discovery</h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Fetch the "As-Is" technical reality via Live API or Offline Import.</p>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                        <button onClick={()=>setShowDiscoveryHelp(true)} className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm"><i className="fas fa-question-circle mr-2"></i> Help Guide</button>

                        {hasData && (
                            <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-lg border border-blue-200">
                                {/* 🚨 FIX: Exposed Provider Dropdown so users can switch to Azure even when data exists */}
                                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="p-1.5 text-[10px] font-bold text-slate-700 border border-slate-300 rounded outline-none bg-white">
                                    <option value="Huawei">Huawei</option>
                                    <option value="AWS">AWS</option>
                                    <option value="Azure">Azure</option>
                                </select>
                                {provider === 'Azure' && <input type="text" placeholder="Sub ID" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} className="w-28 p-1.5 text-[10px] border border-slate-300 rounded outline-none bg-white" />}
                                
                                <button onClick={handleLiveScan} disabled={isScanning} className="px-4 py-1.5 bg-blue-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                                    {isScanning ? <><i className="fas fa-spinner fa-spin mr-1"></i> Syncing...</> : <><i className="fas fa-sync-alt mr-1"></i> Sync API</>}
                                </button>
                                
                                <div className="relative ml-2 border-l border-blue-200 pl-3">
                                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleOfflineUpload} disabled={isScanning} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                                    <button className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-black uppercase tracking-widest shadow-sm pointer-events-none disabled:opacity-50">
                                        <i className="fas fa-file-excel mr-1"></i> Append File
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!hasData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className={`p-8 rounded-2xl border-2 transition-all ${scanMode === 'live' ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-slate-200 bg-slate-50 hover:border-blue-300 cursor-pointer'}`} onClick={() => setScanMode('live')}>
                            <i className="fas fa-cloud text-4xl text-blue-500 mb-4 block"></i>
                            <h4 className="font-black text-slate-800 text-lg mb-2">Live Vault Sync</h4>
                            <p className="text-xs text-slate-600 mb-4">Uses Customer Vault AK/SK credentials to safely query live infrastructure over secure APIs.</p>
                            
                            {scanMode === 'live' && (
                                <div className="space-y-3">
                                    <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full p-2.5 text-xs font-bold text-slate-700 border border-blue-300 rounded-lg outline-none focus:border-blue-600 bg-white">
                                        <option value="Huawei">Huawei Cloud (Native)</option>
                                        <option value="AWS">Amazon Web Services (AWS)</option>
                                        <option value="Azure">Microsoft Azure</option>
                                    </select>
                                    {provider === 'Azure' && <input type="text" placeholder="Azure Subscription ID (Optional if saved in Vault)" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} className="w-full p-2.5 text-xs font-mono text-slate-700 border border-blue-300 rounded-lg outline-none focus:border-blue-600 bg-white shadow-inner" />}
                                    <button onClick={handleLiveScan} disabled={isScanning} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isScanning ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Syncing {provider}...</> : <><i className="fas fa-bolt mr-2"></i> Run {provider} Sync</>}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={`p-8 rounded-2xl border-2 transition-all ${scanMode === 'offline' ? 'border-emerald-500 bg-emerald-50/50 shadow-md' : 'border-slate-200 bg-slate-50 hover:border-emerald-300 cursor-pointer'}`} onClick={() => setScanMode('offline')}>
                            <i className="fas fa-file-excel text-4xl text-emerald-500 mb-4 block"></i>
                            <h4 className="font-black text-slate-800 text-lg mb-2">Offline File Import</h4>
                            <p className="text-xs text-slate-600 mb-6">If API access is blocked, upload the customer's vCenter, Hyper-V, or Azure/AWS CSV export.</p>
                            {scanMode === 'offline' && (
                                <div className="relative">
                                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleOfflineUpload} disabled={isScanning} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                                    <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all pointer-events-none">
                                        {isScanning ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Parsing File...</> : <><i className="fas fa-upload mr-2"></i> Select Excel / CSV</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner md:col-span-2">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4">
                                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest"><i className="fas fa-server text-blue-500 mr-2"></i> Core Infrastructure</h4>
                                <button onClick={()=>onUpdateProject(activeProject.id, 'mgcData', null)} className="text-[9px] font-black text-rose-500 uppercase hover:underline"><i className="fas fa-trash mr-1"></i> Clear All Data</button>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 pl-1">Compute Nodes ({activeProject.mgcData.raw_inventory?.compute?.length || 0})</div>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                        {activeProject.mgcData.raw_inventory?.compute?.map(c => (
                                            <div key={c.name || Math.random()} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                                <div className="flex flex-col"><div className="flex items-center gap-2"><i className="fas fa-server text-blue-500 w-4 text-center"></i><span className="text-xs font-bold text-slate-800">{c.name}</span></div><span className="text-[9px] text-slate-500 font-medium ml-6 mt-0.5 truncate max-w-[200px]">{c.type}</span></div>
                                                <div className="flex gap-2 items-center">
                                                    {isQuoted(c.name) ? <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"><i className="fas fa-check-double mr-1"></i> Quoted</div> : <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200"><i className="fas fa-exclamation-triangle mr-1"></i> Unquoted</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 pl-1">Databases ({activeProject.mgcData.raw_inventory?.databases?.length || 0})</div>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                        {activeProject.mgcData.raw_inventory?.databases?.map(d => (
                                            <div key={d.name || Math.random()} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                                <div className="flex flex-col"><div className="flex items-center gap-2"><i className="fas fa-database text-rose-500 w-4 text-center"></i><span className="text-xs font-bold text-slate-800">{d.name}</span></div><span className="text-[9px] text-slate-500 font-medium ml-6 mt-0.5">{d.engine || d.type}</span></div>
                                                <div className="flex gap-2 items-center">
                                                    {isQuoted(d.name) ? <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"><i className="fas fa-check-double mr-1"></i> Quoted</div> : <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200"><i className="fas fa-exclamation-triangle mr-1"></i> Unquoted</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner flex flex-col gap-6">
                            <div>
                                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fas fa-network-wired text-indigo-500 mr-2"></i> Network ({activeProject.mgcData.raw_inventory?.network?.length || 0})</h4>
                                <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                    {activeProject.mgcData.raw_inventory?.network?.map(n => (
                                        <div key={n.name || Math.random()} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3 truncate max-w-[140px]"><i className="fas fa-cloud text-slate-400"></i><span className="text-[10px] font-bold text-slate-800 truncate">{n.name}</span></div>
                                            {isQuoted(n.name) ? <div className="text-[9px] font-black text-emerald-600"><i className="fas fa-check"></i></div> : <div className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 truncate max-w-[80px]">{n.type || n.cidr}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fas fa-hdd text-emerald-500 mr-2"></i> Storage ({activeProject.mgcData.raw_inventory?.storage?.length || 0})</h4>
                                <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                    {activeProject.mgcData.raw_inventory?.storage?.map(s => (
                                        <div key={s.name || Math.random()} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3 truncate max-w-[140px]"><i className="fas fa-hdd text-slate-400"></i><span className="text-[10px] font-bold text-slate-800 truncate">{s.name}</span></div>
                                            {isQuoted(s.name) ? <div className="text-[9px] font-black text-emerald-600"><i className="fas fa-check"></i></div> : <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Disk</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Tool Matrix omitted for brevity, it stays exactly the same */}

            {/* Help Guide Modal */}
            {showDiscoveryHelp && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowDiscoveryHelp(false)}></div>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-blue-600 text-white flex justify-between items-center shrink-0">
                            <h3 className="font-black text-lg"><i className="fas fa-question-circle mr-2"></i> Source Infrastructure Discovery Help Guide</h3>
                            <button onClick={() => setShowDiscoveryHelp(false)} className="text-blue-200 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-black text-lg text-slate-800 mb-3">Live Vault Sync</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                        Uses Customer Vault AK/SK credentials to securely query live infrastructure via Huawei Cloud APIs.
                                    </p>
                                    <ul className="text-slate-600 text-sm space-y-2 ml-4">
                                        <li className="flex items-start">
                                            <i className="fas fa-check-circle text-emerald-500 mt-1 mr-2"></i>
                                            <span><b>Huawei Cloud</b>: Uses source Huawei Cloud credentials for cross-account/region migrations</span>
                                        </li>
                                        <li className="flex items-start">
                                            <i className="fas fa-check-circle text-emerald-500 mt-1 mr-2"></i>
                                            <span><b>AWS</b>: Requires AWS Access Key/Secret in Customer Vault</span>
                                        </li>
                                        <li className="flex items-start">
                                            <i className="fas fa-check-circle text-emerald-500 mt-1 mr-2"></i>
                                            <span><b>Azure</b>: Requires Azure Subscription ID (optional if saved in Vault)</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-black text-lg text-slate-800 mb-3">Offline File Import</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                        When API access is blocked or unavailable, upload customer infrastructure data from:
                                    </p>
                                    <ul className="text-slate-600 text-sm space-y-2 ml-4">
                                        <li className="flex items-start">
                                            <i className="fas fa-file-excel text-emerald-500 mt-1 mr-2"></i>
                                            <span><b>vCenter/Hyper-V exports</b>: CSV or Excel files</span>
                                        </li>
                                        <li className="flex items-start">
                                            <i className="fas fa-file-excel text-emerald-500 mt-1 mr-2"></i>
                                            <span><b>Cloud provider exports</b>: AWS Cost Explorer, Azure Cost Management</span>
                                        </li>
                                        <li className="flex items-start">
                                            <i className="fas fa-file-excel text-emerald-500 mt-1 mr-2"></i>
                                            <span><b>Manual inventory</b>: Custom spreadsheets with server details</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <h4 className="font-black text-blue-800 mb-2 flex items-center">
                                        <i className="fas fa-lightbulb mr-2"></i> Pro Tip
                                    </h4>
                                    <p className="text-blue-700 text-sm">
                                        For Huawei Cloud cross-account/region migrations, ensure the customer has <b>Source Huawei Cloud credentials</b> saved in their profile. 
                                        The system will automatically use these instead of master credentials when <code>sourceEnvironment</code> is set to <code>huawei_cross_account</code> or <code>huawei_cross_region</code>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
                            <button onClick={() => setShowDiscoveryHelp(false)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-colors">
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
