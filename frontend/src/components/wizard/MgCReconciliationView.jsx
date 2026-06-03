import React, { useState, useEffect } from 'react';

export default function MgCReconciliationView({ activeProject, onUpdateProject }) {
    const [scanMode, setScanMode] = useState('live'); 
    const [isScanning, setIsScanning] = useState(false);
    const [showDiscoveryHelp, setShowDiscoveryHelp] = useState(false);
    const [migrationTools, setMigrationTools] = useState(null);
    
    // 🚨 Ensure hasData triggers if we have mgcData set (even if arrays are empty)
    const hasData = activeProject?.mgcData !== undefined && activeProject?.mgcData !== null;

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

    // 🚨 STRICT LIVE API SCAN (NO MOCKS, VAULT ONLY)
    const handleLiveScan = async () => {
        if (!activeProject.customerId) {
            alert("Discovery Error: No Customer linked to this project.\n\nPlease link this project to a Customer with valid Vault Credentials in the CRM or Edit Context tab to run a secure live scan.");
            return;
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
                    region: activeProject.region || 'la-south-2'
                })
            });
            const data = await res.json();
            
            if (data.success) {
                // Align Python keys with React structure
                const inventory = {
                    compute: data.inventory.compute || [],
                    databases: data.inventory.databases || data.inventory.database || [],
                    storage: data.inventory.storage || [],
                    network: data.inventory.network || []
                };
                onUpdateProject(activeProject.id, 'mgcData', { raw_inventory: inventory });
                alert("MgC Discovery Scan Complete. Live data fetched successfully.");
            } else { 
                alert(`Discovery Error: ${data.error}`); 
            }
        } catch (err) { 
            alert(`Network error occurred during API scan: ${err.message}`); 
        } finally { 
            setIsScanning(false); 
        }
    };

    // 🚨 STRICT OFFLINE EXCEL IMPORT (TRUSTING PYTHON PARSER)
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
                // Trusting the Python dict mapping and standardizing the keys
                const inventory = {
                    compute: data.resources.servers || data.resources.compute || [],
                    databases: data.resources.databases || data.resources.database || [],
                    storage: data.resources.storage || [],
                    network: data.resources.network || []
                };

                onUpdateProject(activeProject.id, 'mgcData', { raw_inventory: inventory });
                alert(`Offline Discovery Complete. Parsed ${inventory.compute.length} compute nodes successfully.`);
            } else { 
                alert(`Parse Error: ${data.error}`); 
            }
        } catch (err) { 
            alert(`Network error occurred during file upload: ${err.message}`); 
        } finally { 
            setIsScanning(false); 
            e.target.value = null; 
        }
    };

    const handleAddToWBS = (tool) => {
        const currentPlan = activeProject.migrationPlan || [];
        if (currentPlan.some(task => task.name.includes(tool.id.toUpperCase()))) {
            alert(`${tool.name} is already assigned in your WBS.`);
            return;
        }
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
                <div className="flex justify-between items-center border-b border-slate-200 pb-6 mb-8">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800">
                            <i className="fas fa-satellite-dish text-blue-500"></i> MgC Source Discovery
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Fetch the "As-Is" technical reality via Live API or Offline Import.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={()=>setShowDiscoveryHelp(true)} className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm">
                            <i className="fas fa-question-circle mr-2"></i> Help Guide
                        </button>
                    </div>
                </div>

                {!hasData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className={`p-8 rounded-2xl border-2 transition-all ${scanMode === 'live' ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-slate-200 bg-slate-50 hover:border-blue-300 cursor-pointer'}`} onClick={() => setScanMode('live')}>
                            <i className="fas fa-cloud text-4xl text-blue-500 mb-4 block"></i>
                            <h4 className="font-black text-slate-800 text-lg mb-2">Live Vault Sync</h4>
                            <p className="text-xs text-slate-600 mb-6">Uses Customer Vault AK/SK credentials to safely query live infrastructure over secure APIs.</p>
                            {scanMode === 'live' && (
                                <button onClick={handleLiveScan} disabled={isScanning} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isScanning ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Syncing via API...</> : <><i className="fas fa-bolt mr-2"></i> Run Live Sync</>}
                                </button>
                            )}
                        </div>

                        <div className={`p-8 rounded-2xl border-2 transition-all ${scanMode === 'offline' ? 'border-emerald-500 bg-emerald-50/50 shadow-md' : 'border-slate-200 bg-slate-50 hover:border-emerald-300 cursor-pointer'}`} onClick={() => setScanMode('offline')}>
                            <i className="fas fa-file-excel text-4xl text-emerald-500 mb-4 block"></i>
                            <h4 className="font-black text-slate-800 text-lg mb-2">Offline File Import</h4>
                            <p className="text-xs text-slate-600 mb-6">If API access is blocked, upload the customer's vCenter, Hyper-V, or manual Excel export.</p>
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
                                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest"><i className="fas fa-server text-blue-500 mr-2"></i> Discovered Compute & Databases</h4>
                                <button onClick={()=>onUpdateProject(activeProject.id, 'mgcData', null)} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Clear Data</button>
                            </div>
                            <div className="space-y-3">
                                {activeProject.mgcData.raw_inventory?.compute?.map(c => (
                                    <div key={c.id || Math.random()} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3"><i className="fas fa-server text-slate-400"></i><span className="text-xs font-bold text-slate-800">{c.name}</span></div>
                                        <div className="flex gap-2">
                                            {c.source && <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{c.source}</div>}
                                            {c.ip && <div className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{c.ip}</div>}
                                        </div>
                                    </div>
                                ))}
                                {activeProject.mgcData.raw_inventory?.databases?.map(d => (
                                    <div key={d.id || Math.random()} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3"><i className="fas fa-database text-rose-400"></i><span className="text-xs font-bold text-slate-800">{d.name}</span></div>
                                        <div className="flex gap-2">
                                            {d.engine && <div className="text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">{d.engine}</div>}
                                            {d.ip && <div className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{d.ip}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner flex flex-col gap-6">
                            <div>
                                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fas fa-network-wired text-indigo-500 mr-2"></i> Network</h4>
                                <div className="space-y-3">
                                    {activeProject.mgcData.raw_inventory?.network?.map(n => (
                                        <div key={n.id || Math.random()} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3"><i className="fas fa-cloud text-slate-400"></i><span className="text-xs font-bold text-slate-800">{n.name}</span></div>
                                            <div className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">{n.cidr || n.id}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fas fa-hdd text-emerald-500 mr-2"></i> Storage</h4>
                                <div className="space-y-3">
                                    {activeProject.mgcData.raw_inventory?.storage?.map(s => (
                                        <div key={s.id || Math.random()} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3"><i className="fas fa-hdd text-slate-400"></i><span className="text-xs font-bold text-slate-800">{s.name}</span></div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{s.source || 'Storage Volume'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {hasData && migrationTools && (
                <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 relative overflow-hidden animate-slide-up">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 -mr-20 -mt-20"></div>
                    
                    <div className="flex items-center justify-between border-b border-slate-600 pb-6 mb-6 relative z-10">
                        <div>
                            <h3 className="font-black text-xl text-white flex items-center gap-3"><i className="fas fa-tools text-indigo-400"></i> Huawei Migration Tool Center</h3>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Official execution strategies ready to apply based on discovered inventory.</p>
                        </div>
                        <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            <i className="fas fa-check-circle mr-2"></i> Engine Synced
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                        <div className="bg-slate-900/50 border border-slate-600 p-5 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 border-b border-slate-700 pb-2"><i className="fas fa-server mr-2 opacity-50"></i> Server & App Migration</h4>
                            <div className="space-y-4">
                                {migrationTools.compute.map(tool => (
                                    <div key={tool.id} className="bg-slate-800 border border-slate-600 p-4 rounded-lg flex flex-col h-full">
                                        <div className="text-sm font-black text-indigo-300 mb-1">{tool.name}</div>
                                        <div className="text-[10px] text-slate-400 leading-snug mb-3 flex-1">{tool.desc}</div>
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {tool.scenarios.map(s => <span key={s} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-[9px] font-bold border border-slate-600">{s}</span>)}
                                        </div>
                                        <button onClick={() => handleAddToWBS(tool)} className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded border border-indigo-500/50 text-[10px] font-black uppercase tracking-widest transition-colors mt-auto">
                                            <i className="fas fa-plus mr-1"></i> Add Strategy to WBS
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-600 p-5 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 border-b border-slate-700 pb-2"><i className="fas fa-database mr-2 opacity-50"></i> Database Migration</h4>
                            <div className="space-y-4">
                                {migrationTools.database.map(tool => (
                                    <div key={tool.id} className="bg-slate-800 border border-slate-600 p-4 rounded-lg flex flex-col h-full">
                                        <div className="text-sm font-black text-emerald-400 mb-1">{tool.name}</div>
                                        <div className="text-[10px] text-slate-400 leading-snug mb-3 flex-1">{tool.desc}</div>
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {tool.scenarios.map(s => <span key={s} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-[9px] font-bold border border-slate-600">{s}</span>)}
                                        </div>
                                        <button onClick={() => handleAddToWBS(tool)} className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded border border-emerald-500/50 text-[10px] font-black uppercase tracking-widest transition-colors mt-auto">
                                            <i className="fas fa-plus mr-1"></i> Add Strategy to WBS
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-600 p-5 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 border-b border-slate-700 pb-2"><i className="fas fa-box-open mr-2 opacity-50"></i> Data & Storage Migration</h4>
                            <div className="space-y-4">
                                {migrationTools.storage.map(tool => (
                                    <div key={tool.id} className="bg-slate-800 border border-slate-600 p-4 rounded-lg flex flex-col h-full">
                                        <div className="text-sm font-black text-amber-400 mb-1">{tool.name}</div>
                                        <div className="text-[10px] text-slate-400 leading-snug mb-3 flex-1">{tool.desc}</div>
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {tool.scenarios.map(s => <span key={s} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-[9px] font-bold border border-slate-600">{s}</span>)}
                                        </div>
                                        <button onClick={() => handleAddToWBS(tool)} className="w-full py-2 bg-amber-600/20 hover:bg-amber-500 text-amber-400 hover:text-white rounded border border-amber-500/50 text-[10px] font-black uppercase tracking-widest transition-colors mt-auto">
                                            <i className="fas fa-plus mr-1"></i> Add Strategy to WBS
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDiscoveryHelp && (
                <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l border-slate-200 z-[10000] flex flex-col animate-slide-left overflow-hidden">
                    <div className="bg-blue-600 text-white p-6 border-b border-blue-700 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-black text-lg"><i className="fas fa-book-open mr-2"></i> Methodology Guide</h3>
                            <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold mt-1">Understanding Source Discovery</p>
                        </div>
                        <button onClick={()=>setShowDiscoveryHelp(false)} className="text-blue-200 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 text-sm text-slate-700 leading-relaxed custom-scrollbar">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-2">1. What is MgC Discovery?</h4>
                            <p className="mb-3">Migration Center (MgC) Discovery connects directly to the customer's current IT environment via API or agent. It fetches the <strong>"As-Is"</strong> technical reality of what is running right now.</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-2">2. What if the source is offline?</h4>
                            <p className="text-xs text-slate-700">If API access is blocked by customer firewalls, use the <strong>Offline File Import</strong> tab to upload their VMware vCenter or manual Excel export.</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
                            <h4 className="font-black text-blue-800 mb-2 border-b border-blue-100 pb-2">3. Integrating with the WBS</h4>
                            <p className="text-xs text-slate-700">Once resources are discovered, the ERP maps them to the Huawei Tool Matrix. Clicking <strong>Add Strategy to WBS</strong> formalizes the execution plan for Phase 3.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
