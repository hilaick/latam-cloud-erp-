// Results display component for Physics Engine


function PhysicsResults({
    results, 
    downtimeWindow, 
    storageUnit, 
    smallFilePct,
    onParamChange 
}) {
    const { 
        totalHours, 
        daysStr, 
        osPayloadTB, 
        actualMbps, 
        actualMBps,
        osSyncHours, 
        dbSyncHours,
        bottleneckMbps, 
        cpuWarn, 
        ioWarn, 
        dbWarn, 
        netWarn, 
        riskWarn, 
        controllingPath,
        isFeasible,
        smallFilePct: calculatedSmallFilePct
    } = results;

    return (
        <div className="xl:col-span-4 space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase mb-1 text-slate-500">
                        Target Go-Live Window
                    </label>
                    <div className="text-2xl font-black text-slate-800">{downtimeWindow} Hrs</div>
                </div>
                <i className={`fas ${isFeasible ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-triangle text-rose-500'} text-4xl`}></i>
            </div>

            <div className={`p-8 rounded-3xl border-4 flex flex-col justify-center min-h-[350px] shadow-sm relative overflow-hidden ${isFeasible ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                    Calculated End-to-End SLA
                </div>
                <div className={`text-6xl font-black tracking-tighter ${isFeasible ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {daysStr}
                </div>
                <div className="text-sm font-bold text-slate-600 mt-2">
                    ({totalHours} total execution hours)
                </div>
                
                <div className="mt-6 pt-6 border-t-2 border-slate-200/60 text-xs font-medium space-y-3">
                    <div className="flex justify-between items-center text-slate-600">
                        <span>Calculated Bottleneck:</span> 
                        <span className="font-black bg-white px-2 py-1 rounded shadow-sm">
                            {bottleneckMbps} Mbps
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                        <span>Effective Transfer Speed:</span> 
                        <span className="font-black bg-white px-2 py-1 rounded shadow-sm">
                            {actualMbps} Mbps 
                            <span className="text-slate-500 text-[10px] font-bold ml-1">
                                ({actualMBps} MB/s)
                            </span>
                        </span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200/50">
                        <div className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-2">
                            Pipeline Division
                        </div>
                        <div className="flex justify-between items-center text-blue-700 font-bold mb-1">
                            <span>Payload Sync ({osPayloadTB} {storageUnit}):</span> 
                            <span>{osSyncHours} hrs</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-700 font-bold">
                            <span>Native DB Sync:</span> 
                            <span>{dbSyncHours} hrs</span>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 p-2 bg-white/50 rounded text-slate-800 font-black border border-slate-200 shadow-sm">
                        <span>Controlling Path:</span> 
                        <span>{controllingPath}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 p-2 bg-amber-50 rounded text-amber-800 font-black border border-amber-200 shadow-sm">
                        <span>Friction Risk:</span> 
                        <span>{riskWarn}</span>
                    </div>
                </div>

                <div className="mt-5 space-y-2">
                    {netWarn && (
                        <div className="text-[10px] font-black text-slate-800 bg-slate-100 border border-slate-300 p-3 rounded-xl leading-tight shadow-sm">
                            <i className="fas fa-route mr-1"></i> {netWarn}
                        </div>
                    )}
                    {dbWarn && (
                        <div className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-200 p-3 rounded-xl leading-tight shadow-sm">
                            <i className="fas fa-exclamation-circle mr-1"></i> {dbWarn}
                        </div>
                    )}
                    {ioWarn && (
                        <div className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 p-3 rounded-xl leading-tight shadow-sm">
                            <i className="fas fa-exclamation-triangle mr-1"></i> {ioWarn}
                        </div>
                    )}
                    {cpuWarn && (
                        <div className="text-[10px] font-black text-purple-800 bg-purple-100 border border-purple-200 p-3 rounded-xl leading-tight shadow-sm">
                            <i className="fas fa-microchip mr-1"></i> {cpuWarn}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FAQSection({ showFaq, setShowFaq }) {
    const { useState } = React;
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
            <button 
                onClick={() => setShowFaq(!showFaq)} 
                className="w-full px-6 py-4 flex justify-between items-center text-blue-900 font-black text-sm hover:bg-blue-100 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <i className="fas fa-graduation-cap text-blue-600 text-lg mr-1"></i> 
                    The Reality of Bandwidth: Why Migrations Run Late
                </span>
                <i className={`fas fa-chevron-${showFaq ? 'up' : 'down'}`}></i>
            </button>
            {showFaq && (
                <div className="p-6 pt-0 text-xs text-blue-900 space-y-4 animate-fade-in border-t border-blue-200 mt-2 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <h5 className="font-black mb-2 uppercase tracking-widest text-[10px]">
                                <i className="fas fa-divide mr-1"></i> 1. Mbps vs MB/s
                            </h5>
                            <p className="leading-relaxed font-medium">
                                ISPs sell networks in <b>Megabits</b> (Mbps). Data is measured in <b>Megabytes</b> (MB). 
                                Since 8 bits = 1 Byte, a 1,000 Mbps (1 Gbps) tunnel actually maxes out at a theoretical 125 MB/s.
                            </p>
                        </div>
                        <div>
                            <h5 className="font-black mb-2 uppercase tracking-widest text-[10px]">
                                <i className="fas fa-route mr-1"></i> 2. The Transit Tax
                            </h5>
                            <p className="leading-relaxed font-medium">
                                You never get 100% of the pipe. Standard TCP routing takes ~5%. 
                                <b>IPsec VPNs</b> require heavy packet encryption (~15% tax). 
                                <b>Public Internet</b> routing suffers from packet drops and latency (~25% tax).
                            </p>
                        </div>
                        <div>
                            <h5 className="font-black mb-2 uppercase tracking-widest text-[10px]">
                                <i className="fas fa-copy mr-1"></i> 3. The Small Files Nightmare
                            </h5>
                            <p className="leading-relaxed font-medium">
                                A 1 TB video file syncs instantly. 1 TB of 5KB text files will crawl. 
                                For every small file, the OS must do an inode lookup (or an HTTP PUT request for Object Storage), 
                                plummeting network utilization.
                            </p>
                        </div>
                        <div>
                            <h5 className="font-black mb-2 uppercase tracking-widest text-[10px]">
                                <i className="fas fa-lock mr-1"></i> 4. The Crypto Penalty
                            </h5>
                            <p className="leading-relaxed font-medium">
                                Decrypting a source OS drive (BitLocker/LUKS) spikes CPU on read. 
                                Hitting a Cloud <b>KMS (Key Management Service)</b> on the destination adds an 
                                API authentication latency tax to every block/file written.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Global bindings for Babel Standalone
window.PhysicsResults = PhysicsResults;
window.FAQSection = FAQSection;