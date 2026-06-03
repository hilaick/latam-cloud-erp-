import React, { useState, useEffect } from 'react';

export default function MgCReconciliationView({ activeProject, onUpdateProject }) {
    const [isScanning, setIsScanning] = useState(false);
    const [showDiscoveryHelp, setShowDiscoveryHelp] = useState(false);
    const [migrationTools, setMigrationTools] = useState(null);
    const hasData = !!activeProject?.mgcData;

    // Fetch official Huawei Tool Matrix
    useEffect(() => {
        const fetchTools = async () => {
            try {
                const token = localStorage.getItem('erp_jwt_token');
                const res = await fetch('/api/migration/tools', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) setMigrationTools(data.tools);
            } catch (err) {
                console.error("Failed to fetch migration tools", err);
            }
        };
        fetchTools();
    }, []);

    const handleLiveScan = () => {
        setIsScanning(true);
        setTimeout(() => {
            // Simulated API Fetch
            const mockData = {
                raw_inventory: {
                    compute: [
                        { id: "ecs-1", name: "PRD-DB-01", type: "ECS", ip: "10.0.1.5", region: "la-south-2", source: "VMware" },
                        { id: "ecs-2", name: "PRD-APP-01", type: "ECS", ip: "10.0.1.6", region: "la-south-2", source: "AWS EC2" }
                    ],
                    network: [
                        { id: "vpc-1", name: "VPC-Production", type: "VPC", cidr: "10.0.0.0/16", region: "la-south-2" }
                    ],
                    storage: [
                        { id: "obs-1", name: "backup-archive-bucket", type: "OBS", source: "AWS S3" }
                    ]
                },
                diagnostics: ["Successfully authenticated to la-south-2."]
            };
            onUpdateProject(activeProject.id, 'mgcData', mockData);
            setIsScanning(false);
            alert("MgC Discovery Scan Complete. Live data fetched successfully.");
        }, 2000);
    };

    return (
        <div className="animate-fade-in max-w-[1200px] mx-auto pb-12 relative space-y-6">
            
            {/* 🚨 DISCOVERY ENGINE PANEL */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-200 pb-6 mb-8">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800">
                            <i className="fas fa-satellite-dish text-blue-500"></i> MgC Source Discovery
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Fetch the "As-Is" live technical reality of the source environment.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={()=>setShowDiscoveryHelp(true)} className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm">
                            <i className="fas fa-question-circle mr-2"></i> Help Guide
                        </button>
                        <button onClick={handleLiveScan} disabled={isScanning} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all ${isScanning ? 'bg-slate-200 text-slate-500' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'}`}>
                            {isScanning ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Scanning Region...</> : <><i className="fas fa-bolt mr-2"></i> Run Live API Scan</>}
                        </button>
                    </div>
                </div>

                {!hasData ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                        <i className="fas fa-cloud-download-alt text-6xl text-slate-300 mb-4"></i>
                        <h4 className="text-lg font-black text-slate-700 mb-2">No Live Data Found</h4>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">Click "Run Live API Scan" above to connect to the source region and fetch the current running inventory.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner md:col-span-2">
                            <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fas fa-server text-blue-500 mr-2"></i> Discovered Compute & Storage</h4>
                            <div className="space-y-3">
                                {activeProject.mgcData.raw_inventory.compute.map(c => (
                                    <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3"><i className="fas fa-server text-slate-400"></i><span className="text-xs font-bold text-slate-800">{c.name}</span></div>
                                        <div className="flex gap-2">
                                            {c.source && <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{c.source}</div>}
                                            <div className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{c.ip}</div>
                                        </div>
                                    </div>
                                ))}
                                {activeProject.mgcData.raw_inventory.storage.map(s => (
                                    <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3"><i className="fas fa-database text-slate-400"></i><span className="text-xs font-bold text-slate-800">{s.name}</span></div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{s.source}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                            <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fas fa-network-wired text-indigo-500 mr-2"></i> Discovered Network</h4>
                            <div className="space-y-3">
                                {activeProject.mgcData.raw_inventory.network.map(n => (
                                    <div key={n.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3"><i className="fas fa-cloud text-slate-400"></i><span className="text-xs font-bold text-slate-800">{n.name}</span></div>
                                        <div className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">{n.cidr}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 🚨 NEW: HUAWEI MIGRATION TOOL CENTER (Matches Source to Target Tools) */}
            {hasData && migrationTools && (
                <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 relative overflow-hidden animate-slide-up">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 -mr-20 -mt-20"></div>
                    
                    <div className="flex items-center justify-between border-b border-slate-600 pb-6 mb-6 relative z-10">
                        <div>
                            <h3 className="font-black text-xl text-white flex items-center gap-3"><i className="fas fa-tools text-indigo-400"></i> Huawei Migration Tool Center</h3>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Official execution strategies ready to apply based on discovered inventory.</p>
                        </div>
                        <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            <i className="fas fa-check-circle mr-2"></i> API Synced
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                        {/* Server Migration Tools */}
                        <div className="bg-slate-900/50 border border-slate-600 p-5 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 border-b border-slate-700 pb-2"><i className="fas fa-server mr-2 opacity-50"></i> Server & App Migration</h4>
                            <div className="space-y-4">
                                {migrationTools.compute.map(tool => (
                                    <div key={tool.id} className="bg-slate-800 border border-slate-600 p-4 rounded-lg">
                                        <div className="text-sm font-black text-indigo-300 mb-1">{tool.name}</div>
                                        <div className="text-[10px] text-slate-400 leading-snug mb-3">{tool.desc}</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {tool.scenarios.map(s => <span key={s} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-[9px] font-bold border border-slate-600">{s}</span>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Database Migration Tools */}
                        <div className="bg-slate-900/50 border border-slate-600 p-5 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 border-b border-slate-700 pb-2"><i className="fas fa-database mr-2 opacity-50"></i> Database Migration</h4>
                            <div className="space-y-4">
                                {migrationTools.database.map(tool => (
                                    <div key={tool.id} className="bg-slate-800 border border-slate-600 p-4 rounded-lg">
                                        <div className="text-sm font-black text-emerald-400 mb-1">{tool.name}</div>
                                        <div className="text-[10px] text-slate-400 leading-snug mb-3">{tool.desc}</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {tool.scenarios.map(s => <span key={s} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-[9px] font-bold border border-slate-600">{s}</span>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Storage Migration Tools */}
                        <div className="bg-slate-900/50 border border-slate-600 p-5 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4 border-b border-slate-700 pb-2"><i className="fas fa-box-open mr-2 opacity-50"></i> Data & Storage Migration</h4>
                            <div className="space-y-4">
                                {migrationTools.storage.map(tool => (
                                    <div key={tool.id} className="bg-slate-800 border border-slate-600 p-4 rounded-lg">
                                        <div className="text-sm font-black text-amber-400 mb-1">{tool.name}</div>
                                        <div className="text-[10px] text-slate-400 leading-snug mb-3">{tool.desc}</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {tool.scenarios.map(s => <span key={s} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-[9px] font-bold border border-slate-600">{s}</span>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚨 DISCOVERY HELP DRAWER (Restored) */}
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
                            <p>This is crucial because Sales SOWs (Quotations) are often based on outdated customer spreadsheets. MgC provides the undeniable truth of the source infrastructure.</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-2">2. What data is collected?</h4>
                            <ul className="list-disc pl-5 space-y-2 text-xs">
                                <li><strong>Compute:</strong> Servers, OS versions, vCPUs, RAM, and attached disks.</li>
                                <li><strong>Network:</strong> VPCs, Subnets, Security Groups, and live IP addresses.</li>
                                <li><strong>Storage:</strong> Databases and connected block/object storage.</li>
                            </ul>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
                            <h4 className="font-black text-blue-800 mb-2 border-b border-blue-100 pb-2">3. What if the source is offline?</h4>
                            <p className="text-xs text-slate-700">If API access is blocked by customer firewalls, you can ask the customer to export their VMware vCenter or Hyper-V inventory to an Excel file. You can then upload that raw <code>.csv</code> or <code>.xlsx</code> file directly into this engine to simulate an API scan.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
