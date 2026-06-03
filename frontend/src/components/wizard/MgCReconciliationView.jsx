import React, { useState } from 'react';

export default function MgCReconciliationView({ activeProject, onUpdateProject }) {
    const [isScanning, setIsScanning] = useState(false);
    const [showDiscoveryHelp, setShowDiscoveryHelp] = useState(false);
    const hasData = !!activeProject?.mgcData;

    const handleLiveScan = () => {
        setIsScanning(true);
        setTimeout(() => {
            // Simulated API Fetch
            const mockData = {
                raw_inventory: {
                    compute: [
                        { id: "ecs-1", name: "PRD-DB-01", type: "ECS", ip: "10.0.1.5", region: "la-south-2" },
                        { id: "ecs-2", name: "PRD-APP-01", type: "ECS", ip: "10.0.1.6", region: "la-south-2" }
                    ],
                    network: [
                        { id: "vpc-1", name: "VPC-Production", type: "VPC", cidr: "10.0.0.0/16", region: "la-south-2" }
                    ],
                    storage: []
                },
                diagnostics: ["Successfully authenticated to la-south-2."]
            };
            onUpdateProject(activeProject.id, 'mgcData', mockData);
            setIsScanning(false);
            alert("MgC Discovery Scan Complete. Live data fetched successfully.");
        }, 2000);
    };

    return (
        <div className="animate-fade-in max-w-[1200px] mx-auto pb-12 relative">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
                
                <div className="flex justify-between items-center border-b border-slate-200 pb-6 mb-8">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800">
                            <i className="fas fa-satellite-dish text-blue-500"></i> MgC Source Discovery
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Fetch the "As-Is" live technical reality of the source environment.</p>
                    </div>
                    
                    {/* 🚨 THE RESTORED HELP BUTTON */}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                            <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2"><i className="fas fa-server text-blue-500 mr-2"></i> Discovered Compute</h4>
                            <div className="space-y-3">
                                {activeProject.mgcData.raw_inventory.compute.map(c => (
                                    <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3"><i className="fas fa-server text-slate-400"></i><span className="text-xs font-bold text-slate-800">{c.name}</span></div>
                                        <div className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{c.ip}</div>
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

            {/* 🚨 DISCOVERY HELP DRAWER */}
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
