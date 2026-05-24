import React, { useState } from 'react';

export default function MgCReconciliationView({ activeProject, onUpdateProject }) {
    const [isScanning, setIsScanning] = useState(false);

    // QUOTED (From Sales Architect Excel)
    const quotedCompute = activeProject?.blueprintData?.topology?.compute?.length || 0;
    const quotedDb = activeProject?.blueprintData?.topology?.database?.length || 0;
    const quotedStorage = parseFloat(activeProject?.blueprintData?.metadata?.estimated_monthly_cost || 0); // Using cost as proxy if size isn't mapped

    // DISCOVERED (From Live MgC API)
    // If we haven't scanned yet, default to null.
    const discoveredCompute = activeProject?.mgcData?.compute || null;
    const discoveredDb = activeProject?.mgcData?.database || null;

    const runMgCDiscovery = () => {
        setIsScanning(true);
        // MOCK API CALL: In reality, this hits the backend, which looks up the Customer's AK/SK in Postgres, 
        // triggers MgC, and returns the JSON. 
        setTimeout(() => {
            const mockDiscoveredData = {
                compute: quotedCompute + 4, // Found 4 unquoted rogue servers
                database: quotedDb + 1,     // Found 1 unquoted dev database
            };
            onUpdateProject(activeProject.id, 'mgcData', mockDiscoveredData);
            setIsScanning(false);
            alert("MgC Discovery Complete. Scope differences detected.");
        }, 2500);
    };

    const hasScanned = discoveredCompute !== null;
    const computeDiff = hasScanned ? (discoveredCompute - quotedCompute) : 0;
    const dbDiff = hasScanned ? (discoveredDb - quotedDb) : 0;

    return (
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-search text-blue-600"></i> Live MgC Reconciliation</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Verify the SA's Quotation against the actual infrastructure discovered in the source environment.</p>
                    </div>
                    <button 
                        onClick={runMgCDiscovery} 
                        disabled={isScanning}
                        className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {isScanning ? <><i className="fas fa-spinner fa-spin mr-2"></i> Scanning APIs...</> : <><i className="fas fa-radar mr-2"></i> Run Automated Discovery</>}
                    </button>
                </div>

                {!hasScanned ? (
                    <div className="p-12 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center flex flex-col items-center">
                        <i className="fas fa-user-secret text-4xl text-slate-400 mb-4"></i>
                        <h4 className="font-black text-slate-700 text-lg mb-2">Awaiting Discovery</h4>
                        <p className="text-sm text-slate-500 max-w-md">Click "Run Automated Discovery". The system will securely utilize the Customer's vaulted AK/SK to scan their current environment.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-start mb-6">
                            <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                            <p className="text-xs text-blue-900 font-bold leading-relaxed">Discovery complete. The data below highlights discrepancies (Scope Creep) between the signed contract and the actual infrastructure. These deltas must be accounted for in Delivery Physics.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Compute Card */}
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

                            {/* Database Card */}
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

                             {/* Unmanaged Services */}
                             <div className="p-6 rounded-2xl border-2 bg-slate-50 border-slate-200 opacity-60">
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-700 mb-4 border-b border-slate-200 pb-2"><i className="fas fa-network-wired mr-2"></i> Network / Subnets</h4>
                                <div className="text-center pt-4 text-xs font-bold text-slate-500">
                                    Network architectures are mapped visually via the Topology Mapper, not via MgC volume counts.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
