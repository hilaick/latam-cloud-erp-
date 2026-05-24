import React, { useState, useEffect, useMemo } from 'react';

export default function PhysicsEngine({ project, onUpdateProject }) {
    // 1. Compute & Encryption
    const [computeCPU, setComputeCPU] = useState(60); 
    const [computeRAM, setComputeRAM] = useState(60);
    const [computeOS, setComputeOS] = useState('Linux');
    const [sourceEncrypted, setSourceEncrypted] = useState(false);
    
    // 2. Payload, Unit & Files
    const [storageSize, setStorageSize] = useState(5.0); 
    const [storageUnit, setStorageUnit] = useState('TB');
    const [storageMode, setStorageMode] = useState('Block'); 
    const [diskType, setDiskType] = useState('SSD');
    const [targetKMS, setTargetKMS] = useState(false);
    
    const [totalFiles, setTotalFiles] = useState(103000000); 
    const [smallFiles, setSmallFiles] = useState(90000000); 
    const [syncMethod, setSyncMethod] = useState('Block'); 
    
    // 3. Database
    const [excludeDb, setExcludeDb] = useState(true); 
    const [dbStorageSize, setDbStorageSize] = useState(4.0);
    const [dbType, setDbType] = useState('PostgreSQL'); 
    const [dbRowsM, setDbRowsM] = useState(250); 
    const [dbRps, setDbRps] = useState(8000);
    
    // 4. Network Routing
    const [netSource, setNetSource] = useState(1000); 
    const [transitType, setTransitType] = useState('DirectConnect'); 
    const [netTunnel, setNetTunnel] = useState(300); 
    const [netTarget, setNetTarget] = useState(1000);
    const [omsTasks, setOmsTasks] = useState(5);
    const [omsObjPerSec, setOmsObjPerSec] = useState(120);
    const [omsBackbone, setOmsBackbone] = useState(16); 
    
    // 5. DR & SLA
    const [drBackupHrs, setDrBackupHrs] = useState(4); 
    const [drStability, setDrStability] = useState('High'); 
    const [downtimeWindow, setDowntimeWindow] = useState(48);
    const [showFaq, setShowFaq] = useState(false);

    useEffect(() => {
        if (project?.physics) {
            const p = project.physics;
            setComputeCPU(p.computeCPU||60); setComputeRAM(p.computeRAM||60); setComputeOS(p.computeOS||'Linux'); setSourceEncrypted(p.sourceEncrypted||false);
            setStorageMode(p.storageMode||'Block'); setDiskType(p.diskType||'SSD'); setTargetKMS(p.targetKMS||false);
            setStorageSize(p.storageSize||5.0); setStorageUnit(p.storageUnit||'TB');
            setTotalFiles(p.totalFiles||103000000); setSmallFiles(p.smallFiles||90000000); setSyncMethod(p.syncMethod||'Block');
            setExcludeDb(p.excludeDb===undefined?true:p.excludeDb); setDbStorageSize(p.dbStorageSize||4.0);
            setDbType(p.dbType||'PostgreSQL'); setDbRowsM(p.dbRowsM||250); setDbRps(p.dbRps||8000);
            setNetSource(p.netSource||1000); setTransitType(p.transitType||'DirectConnect'); setNetTunnel(p.netTunnel||300); setNetTarget(p.netTarget||1000);
            setOmsTasks(p.omsTasks||5); setOmsObjPerSec(p.omsObjPerSec||120); setOmsBackbone(p.omsBackbone||16);
            setDrBackupHrs(p.drBackupHrs||4); setDrStability(p.drStability||'High'); setDowntimeWindow(p.downtimeWindow||48);
        }
    }, [project]);

    const saveContext = () => { 
        const data = { 
            computeCPU, computeRAM, computeOS, sourceEncrypted, storageMode, diskType, targetKMS, 
            storageSize, storageUnit, totalFiles, smallFiles, syncMethod, excludeDb, dbStorageSize, 
            dbType, dbRowsM, dbRps, netSource, transitType, netTunnel, netTarget, omsTasks, 
            omsObjPerSec, omsBackbone, drBackupHrs, drStability, downtimeWindow,
            // 🚨 FIX: We now explicitly save the math output to PostgreSQL so the Summary Tab can see it!
            calculatedTotalHours: result.totalHours 
        };
        onUpdateProject(project.id, 'physics', data); 
        alert("Physics Engine parameters saved to project context."); 
    };

    const handleTotalFilesChange = (val) => {
        const numVal = Number(val);
        setTotalFiles(val);
        if (Number(smallFiles) > numVal) setSmallFiles(numVal);
    };

    const handleSmallFilesChange = (val) => {
        const numVal = Number(val);
        const maxVal = Number(totalFiles);
        setSmallFiles(numVal > maxVal ? maxVal : numVal);
    };

    const result = useMemo(() => {
        const unitMultiplier = storageUnit === 'TB' ? 1 : (storageUnit === 'GB' ? 1/1024 : 1/1048576);
        const normalizedStorageTB = Number(storageSize) * unitMultiplier;
        const normalizedDbTB = Number(dbStorageSize) * unitMultiplier;

        const validTotalFiles = Math.max(Number(totalFiles) || 1, 1);
        const validSmallFiles = Math.min(Number(smallFiles) || 0, validTotalFiles);
        const smallFileRatio = validSmallFiles / validTotalFiles;

        let speedMultiplier = 1.0; 
        let cpuWarn = ""; let ioWarn = ""; let dbWarn = ""; let netWarn = ""; let riskWarn = "Stable Infra";
        let finalBottleneck = 1000;
        let actualTransferMbps = 0;
        let osSyncHours = 0;
        let osPayloadTB = 0;

        if (storageMode === 'Object') {
            const tasks = Number(omsTasks) || 1;
            const ops = Number(omsObjPerSec) || 1;
            const backboneMbps = (Number(omsBackbone) || 16) * 1000;
            finalBottleneck = backboneMbps;

            const smallFileHours = validSmallFiles / (tasks * ops) / 3600;
            osPayloadTB = excludeDb ? Math.max(0, normalizedStorageTB - normalizedDbTB) : normalizedStorageTB;
            const smallFilesTB = (validSmallFiles * 10) / (1024 * 1024 * 1024);
            const largePayloadTB = Math.max(0, osPayloadTB - smallFilesTB);
            
            let backboneMultiplier = 0.9;
            if (targetKMS) backboneMultiplier *= 0.9;
            const effectiveBackboneMbps = backboneMbps * backboneMultiplier;
            const largeFileHours = (((largePayloadTB * 1024 * 1024 * 8) / effectiveBackboneMbps) / 3600);

            osSyncHours = smallFileHours + largeFileHours;
            actualTransferMbps = osSyncHours > 0 ? ((osPayloadTB * 1024 * 1024 * 8) / (osSyncHours * 3600)) : effectiveBackboneMbps;

            if (smallFileHours > largeFileHours) {
                ioWarn = `CRIT: Migration is API-Bound. ${validSmallFiles.toLocaleString()} small files took ${smallFileHours.toFixed(1)}h. Large files took ${largeFileHours.toFixed(1)}h. `;
            } else {
                ioWarn = `INFO: Migration is Bandwidth-Bound over Cloud Backbone. `;
            }
            if (targetKMS) ioWarn += "KMS API Tax applied. ";
            netWarn = "INFO: Serverless OMS active. Transit routes (VPN/DC) bypassed.";
        } else {
            const bottleneckMbps = Math.min(Number(netSource) || Infinity, Number(netTunnel) || Infinity, Number(netTarget) || Infinity);
            finalBottleneck = bottleneckMbps === Infinity ? 1000 : bottleneckMbps;

            if (transitType === 'IPsec VPN') { speedMultiplier *= 0.85; netWarn = "IPsec Encryption Tax (15%). "; }
            else if (transitType === 'Public Internet') { speedMultiplier *= 0.75; netWarn = "Internet TCP Retransmit/Latency Tax (25%). "; }
            else { speedMultiplier *= 0.95; netWarn = "Standard TCP Header Tax (5%). "; }

            let simulatedCpu = Number(computeCPU) + (sourceEncrypted ? 15 : 0);
            const highestComputeLoad = Math.max(simulatedCpu, Number(computeRAM));
            if (highestComputeLoad >= 85) { speedMultiplier *= 0.4; cpuWarn = "CRIT Compute: Source node >85% saturation. Agent severely throttled."; } 
            else if (highestComputeLoad >= 75) { speedMultiplier *= 0.7; cpuWarn = "WARN Compute: Source node >75% saturation. Minor throttling applied."; }

            let diskLimitMbps = 1000; if(diskType === 'SSD') diskLimitMbps = 4000; if(diskType === 'NVMe') diskLimitMbps = 24000;
            finalBottleneck = Math.min(finalBottleneck, diskLimitMbps);

            if (targetKMS) { speedMultiplier *= 0.95; ioWarn += "Target Block KMS Encryption Tax (5%). "; }

            if (syncMethod === 'Block') {
                speedMultiplier *= 1.35; 
                ioWarn += "INFO: Block-Level selected. Data compressed transit (+35% virtual speed). Ignores small files.";
            } else if (syncMethod === 'File' && validSmallFiles > 100000) { 
                let volumePenalty = validSmallFiles / 2000000;
                let filePenalty = Math.max(0.20, 1 - (volumePenalty * (0.5 + (smallFileRatio * 0.5)))); 
                speedMultiplier *= filePenalty;
                ioWarn += `CRIT I/O: File-Level sync of ${validSmallFiles.toLocaleString()} small files (${Math.round(smallFileRatio*100)}% of payload) destroys inode lookups. Network underutilized. `; 
            }

            actualTransferMbps = finalBottleneck * speedMultiplier;
            osPayloadTB = excludeDb ? Math.max(0, normalizedStorageTB - normalizedDbTB) : normalizedStorageTB;
            osSyncHours = (((osPayloadTB * 1024 * 1024 * 8) / (actualTransferMbps || 1)) / 3600); 
        }

        const actualTransferMBps = actualTransferMbps / 8;
        
        const dbTotalRows = Number(dbRowsM) * 1000000;
        let effectiveRps = Number(dbRps) || 1;
        if(dbType === 'Oracle' || dbType === 'HANA') effectiveRps *= 0.8; 
        const dbSyncHours = (excludeDb && storageMode !== 'Object') ? (dbTotalRows / effectiveRps) / 3600 : 0;

        let controllingPath = storageMode === 'Object' ? "API Object Transfer (OMS)" : "OS/Disk Network Transfer";
        if (excludeDb && storageMode !== 'Object' && dbSyncHours > osSyncHours) {
            controllingPath = "Database Native Replication";
            dbWarn = `CRIT BOTTLENECK: DB Logical Sync (${dbSyncHours.toFixed(1)}h) is slower than the Payload Sync (${osSyncHours.toFixed(1)}h). Pipeline constrained by DB Rows/sec.`;
        }

        const rawExecutionHours = Math.max(osSyncHours, dbSyncHours);
        
        let riskMultiplier = 1.0;
        if (drStability === 'Medium') { riskMultiplier = 1.3; riskWarn = "Risk (+30% Stability Buffer)"; }
        else if (drStability === 'Low') { riskMultiplier = 1.6; riskWarn = "Risk (+60% Stability Buffer)"; }

        const totalHours = (rawExecutionHours + (Number(drBackupHrs) || 0)) * riskMultiplier;
        const days = Math.floor(totalHours / 24); 
        const remainingHours = (totalHours % 24).toFixed(1);

        return { 
            totalHours: totalHours.toFixed(1), 
            daysStr: days > 0 ? `${days}d ${remainingHours}h` : `${totalHours.toFixed(1)}h`,
            osPayloadTB: osPayloadTB.toFixed(2), 
            actualMbps: actualTransferMbps.toFixed(1), 
            actualMBps: actualTransferMBps.toFixed(1),
            osSyncHours: osSyncHours.toFixed(1), 
            dbSyncHours: dbSyncHours.toFixed(1),
            bottleneckMbps: finalBottleneck, 
            cpuWarn, ioWarn, dbWarn, netWarn, riskWarn, controllingPath,
            isFeasible: totalHours <= (Number(downtimeWindow) || 0),
            smallFilePct: Math.round(smallFileRatio * 100)
        };
    }, [computeCPU, computeRAM, sourceEncrypted, storageSize, storageUnit, storageMode, diskType, targetKMS, excludeDb, dbStorageSize, totalFiles, smallFiles, syncMethod, dbType, dbRowsM, dbRps, netSource, transitType, netTunnel, netTarget, omsTasks, omsObjPerSec, omsBackbone, drBackupHrs, drStability, downtimeWindow]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-4 pb-12 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-microscope text-rose-500"></i> Cloud Delivery Physics Engine</h3>
                    <p className="text-xs text-slate-500 mt-1">Calculates true SLA timelines using Agent constraints, Crypto/KMS overhead, E2E routing, and File Counts.</p>
                </div>
                <button onClick={saveContext} className="px-6 py-3 bg-rose-600 text-white hover:bg-rose-700 rounded-xl shadow-md font-black uppercase tracking-widest text-xs transition-transform active:scale-95"><i className="fas fa-save mr-2"></i>Save Physics Context</button>
            </div>

            {/* Educational FAQ Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
                <button onClick={() => setShowFaq(!showFaq)} className="w-full px-6 py-4 flex justify-between items-center text-blue-900 font-black text-sm hover:bg-blue-100 transition-colors">
                    <span className="flex items-center gap-2"><i className="fas fa-graduation-cap text-blue-600 text-lg mr-1"></i> The Reality of Bandwidth: Why Migrations Run Late</span>
                    <i className={`fas fa-chevron-${showFaq ? 'up' : 'down'}`}></i>
                </button>
                {showFaq && (
                    <div className="p-6 pt-0 text-xs text-blue-900 space-y-4 animate-fade-in border-t border-blue-200 mt-2 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <h5 className="font-black mb-2 uppercase tracking-widest text-[10px]"><i className="fas fa-divide mr-1"></i> 1. Mbps vs MB/s</h5>
                                <p className="leading-relaxed font-medium">ISPs sell networks in <b>Megabits</b> (Mbps). Data is measured in <b>Megabytes</b> (MB). Since 8 bits = 1 Byte, a 1,000 Mbps (1 Gbps) tunnel actually maxes out at a theoretical 125 MB/s.</p>
                            </div>
                            <div>
                                <h5 className="font-black mb-2 uppercase tracking-widest text-[10px]"><i className="fas fa-route mr-1"></i> 2. The Transit Tax</h5>
                                <p className="leading-relaxed font-medium">You never get 100% of the pipe. Standard TCP routing takes ~5%. <b>IPsec VPNs</b> require heavy packet encryption (~15% tax). <b>Public Internet</b> routing suffers from packet drops and latency (~25% tax).</p>
                            </div>
                            <div>
                                <h5 className="font-black mb-2 uppercase tracking-widest text-[10px]"><i className="fas fa-copy mr-1"></i> 3. The Small Files Nightmare</h5>
                                <p className="leading-relaxed font-medium">A 1 TB video file syncs instantly. 1 TB of 5KB text files will crawl. For every small file, the OS must do an inode lookup (or an HTTP PUT request for Object Storage), plummeting network utilization.</p>
                            </div>
                            <div>
                                <h5 className="font-black mb-2 uppercase tracking-widest text-[10px]"><i className="fas fa-lock mr-1"></i> 4. The Crypto Penalty</h5>
                                <p className="leading-relaxed font-medium">Decrypting a source OS drive (BitLocker/LUKS) spikes CPU on read. Hitting a Cloud <b>KMS (Key Management Service)</b> on the destination adds an API authentication latency tax to every block/file written.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* 1. Compute Node */}
                    {storageMode === 'Object' ? (
                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-center opacity-70 min-h-[200px]">
                            <i className="fas fa-server text-4xl text-slate-300 mb-3"></i>
                            <h4 className="font-black text-sm text-slate-500 mt-2">1. Compute Node Bypassed</h4>
                            <p className="text-xs font-bold text-slate-400 mt-2 max-w-[250px] leading-relaxed">Targeting Object Storage uses direct API transfers, bypassing OS-level block agents and compute constraints.</p>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-h-[200px]">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-server text-blue-500"></i> 1. Compute Node</h4>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={sourceEncrypted} onChange={e=>setSourceEncrypted(e.target.checked)} className="w-4 h-4 accent-blue-600"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-500" title="e.g. BitLocker, LUKS">Source Disk Encrypted</span></label>
                            </div>
                            <div className="space-y-5">
                                <div><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>CPU Saturation</span><span className="text-blue-700">{computeCPU}%</span></label><input type="range" min="10" max="99" value={computeCPU} onChange={e=>setComputeCPU(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"/></div>
                                <div><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>RAM Saturation</span><span className="text-blue-700">{computeRAM}%</span></label><input type="range" min="10" max="99" value={computeRAM} onChange={e=>setComputeRAM(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"/></div>
                                <div className="flex gap-4">
                                    <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Operating System</label><select value={computeOS} onChange={e=>setComputeOS(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"><option value="Linux">Linux</option><option value="Windows">Windows</option></select></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* 2. Payload & Protocol */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                            <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-hdd text-blue-500"></i> 2. Target Protocol & Payload</h4>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={targetKMS} onChange={e=>setTargetKMS(e.target.checked)} className="w-4 h-4 accent-blue-600"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-500" title="Use Cloud KMS API to encrypt data at rest">Target KMS Encryption</span></label>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-1/2 flex gap-2">
                                    <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Total Size</label><input type="number" value={storageSize} onChange={e=>setStorageSize(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"/></div>
                                    <div className="w-16"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Unit</label><select value={storageUnit} onChange={e=>setStorageUnit(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none bg-slate-50"><option>TB</option><option>GB</option><option>MB</option></select></div>
                                </div>
                                <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-rose-700">Target Protocol</label><select value={storageMode} onChange={e=>setStorageMode(e.target.value)} className="w-full p-3 border-2 border-rose-300 bg-rose-50 text-rose-900 rounded-xl text-xs font-black outline-none"><option value="Block">Block/File (Disk)</option><option value="Object">Object Storage</option></select></div>
                            </div>
                            
                            <div className="flex gap-4 items-end animate-fade-in border-t border-slate-100 pt-3">
                                <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Total File Count</label><input type="number" value={totalFiles} onChange={e=>handleTotalFilesChange(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"/></div>
                                <div className="w-1/2">
                                    <label className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase mb-2 text-amber-700">
                                        <span title="Files smaller than 64KB">Of which are Small</span>
                                        <span className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 border border-amber-200">{result.smallFilePct}%</span>
                                    </label>
                                    <input type="number" value={smallFiles} onChange={e=>handleSmallFilesChange(e.target.value)} className="w-full p-3 border-2 border-amber-300 bg-amber-50 text-amber-900 rounded-xl text-sm font-black outline-none focus:border-amber-500 shadow-inner"/>
                                </div>
                            </div>

                            {storageMode !== 'Object' && (
                                <div className="flex gap-4 pt-1 animate-fade-in">
                                    <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Source Disk</label><select value={diskType} onChange={e=>setDiskType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"><option>HDD</option><option>SSD</option><option>NVMe</option></select></div>
                                    <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-purple-700">Agent Sync Mode</label><select value={syncMethod} onChange={e=>setSyncMethod(e.target.value)} className="w-full p-3 border-2 border-purple-300 bg-purple-50 text-purple-900 rounded-xl text-xs font-black outline-none"><option value="Block">Block-Level</option><option value="File">File-Level (Linux)</option></select></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. DB Splitting */}
                    {storageMode === 'Object' ? (
                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-center opacity-70 min-h-[200px]">
                            <i className="fas fa-database text-4xl text-slate-300 mb-3"></i>
                            <h4 className="font-black text-sm text-slate-500 mt-2">3. Database Routing Bypassed</h4>
                            <p className="text-xs font-bold text-slate-400 mt-2 max-w-[250px] leading-relaxed">Object Storage selected. Databases cannot be natively replicated to Object protocols.</p>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-h-[200px]">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-database text-rose-500"></i> 3. Database Routing</h4>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={excludeDb} onChange={e=>setExcludeDb(e.target.checked)} className="w-4 h-4 accent-rose-600"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Split DB Payload</span></label>
                            </div>
                            {excludeDb ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-[10px] text-rose-800 font-bold leading-relaxed">Excludes DB directories from main payload. Calculates Native DB Logical Replication separately.</div>
                                    <div className="flex gap-3">
                                        <div className="w-1/3"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">DB Size ({storageUnit})</label><input type="number" value={dbStorageSize} onChange={e=>setDbStorageSize(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"/></div>
                                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Engine</label><select value={dbType} onChange={e=>setDbType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-500 bg-white"><option>HANA</option><option>Oracle</option><option>PostgreSQL</option><option>SQL Server</option></select></div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Est. Rows (M)</label><input type="number" value={dbRowsM} onChange={e=>setDbRowsM(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"/></div>
                                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Sync (Rows/s)</label><input type="number" value={dbRps} onChange={e=>setDbRps(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"/></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 opacity-60">
                                    <div><i className="fas fa-cubes text-3xl mb-2 text-slate-400"></i><p className="text-xs font-bold">Monolith Sync Active.<br/>DB treated as standard block data.</p></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. SLA */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="font-black text-sm mb-5 flex items-center gap-2 text-slate-800"><i className="fas fa-shield-alt text-amber-500"></i> 4. Operations & DR SLA</h4>
                        <div className="flex flex-col gap-6">
                            <div className="flex gap-3">
                                <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Cold Backup (Hrs)</label><input type="number" value={drBackupHrs} onChange={e=>setDrBackupHrs(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-500 bg-slate-50"/></div>
                                <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Link Stability</label><select value={drStability} onChange={e=>setDrStability(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-500 bg-slate-50"><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
                            </div>
                            <div className="w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700">Target SLA Window (Hrs)</label><input type="number" value={downtimeWindow} onChange={e=>setDowntimeWindow(e.target.value)} className="w-full p-4 border-2 border-emerald-300 rounded-xl bg-emerald-50 font-black text-base text-emerald-900 outline-none text-center shadow-inner"/></div>
                        </div>
                    </div>
                    
                    {/* 5. End-to-End Network */}
                    {storageMode === 'Object' ? (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 hover:shadow-md transition-shadow animate-fade-in">
                            <div className="flex justify-between items-center mb-5">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-cloud text-blue-500"></i> 5. Cloud-to-Cloud Backbone (OMS)</h4>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-[10px] text-blue-800 font-bold leading-relaxed mb-5">
                                Serverless Object Migration active. Data travels over high-speed cloud provider backbone, bypassing customer VPNs and Direct Connects. Speed is bounded by Concurrent API Tasks and limits.
                            </div>
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Concurrent Tasks</label><input type="number" value={omsTasks} onChange={e=>setOmsTasks(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"/></div>
                                <i className="fas fa-times text-slate-300 text-xl hidden md:block mt-8"></i>
                                <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">API Speed (Obj/sec per task)</label><input type="number" value={omsObjPerSec} onChange={e=>setOmsObjPerSec(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"/></div>
                                <i className="fas fa-plus text-slate-300 text-xl hidden md:block mt-8"></i>
                                <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700">Backbone Peak (Gbps)</label><input type="number" value={omsBackbone} onChange={e=>setOmsBackbone(e.target.value)} className="w-full p-3 border-2 border-emerald-200 rounded-xl text-sm font-black outline-none focus:border-emerald-500 bg-emerald-50 text-emerald-900 shadow-inner"/></div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 hover:shadow-md transition-shadow animate-fade-in">
                            <div className="flex justify-between items-center mb-5">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-network-wired text-emerald-500"></i> 5. End-to-End Network Route (Mbps)</h4>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 font-bold leading-relaxed mb-5">
                                E2E limits apply to all replication data flowing from the source OS block agent to the destination block storage.
                            </div>
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Source Outbound</label><input type="number" value={netSource} onChange={e=>setNetSource(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 bg-slate-50"/></div>
                                <i className="fas fa-arrow-right text-slate-300 text-xl hidden md:block mt-8"></i>
                                <div className="flex-1 w-full">
                                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-indigo-500">Transit Route</label>
                                    <select value={transitType} onChange={e=>setTransitType(e.target.value)} className="w-full p-3 border-2 border-indigo-200 rounded-xl text-xs font-black outline-none focus:border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm mb-3"><option value="DirectConnect">DirectConnect / ExpressRoute</option><option value="IPsec VPN">IPsec VPN Tunnel</option><option value="Public Internet">Public Internet / EIP</option></select>
                                    <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-400">Limit:</span><input type="number" value={netTunnel} onChange={e=>setNetTunnel(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 bg-white"/></div>
                                </div>
                                <i className="fas fa-arrow-right text-slate-300 text-xl hidden md:block mt-8"></i>
                                <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Target Cloud Inbound</label><input type="number" value={netTarget} onChange={e=>setNetTarget(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 bg-slate-50"/></div>
                            </div>
                        </div>
                    )}

                </div>

                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-1 text-slate-500">Target Go-Live Window</label>
                            <div className="text-2xl font-black text-slate-800">{downtimeWindow} Hrs</div>
                        </div>
                        <i className={`fas ${result.isFeasible ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-triangle text-rose-500'} text-4xl`}></i>
                    </div>

                    <div className={`p-8 rounded-3xl border-4 flex flex-col justify-center min-h-[350px] shadow-sm relative overflow-hidden ${result.isFeasible ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Calculated End-to-End SLA</div>
                        <div className={`text-6xl font-black tracking-tighter ${result.isFeasible ? 'text-emerald-700' : 'text-rose-700'}`}>{result.daysStr}</div>
                        <div className="text-sm font-bold text-slate-600 mt-2">({result.totalHours} total execution hours)</div>
                        
                        <div className="mt-6 pt-6 border-t-2 border-slate-200/60 text-xs font-medium space-y-3">
                            <div className="flex justify-between items-center text-slate-600"><span>Calculated Bottleneck:</span> <span className="font-black bg-white px-2 py-1 rounded shadow-sm">{result.bottleneckMbps} Mbps</span></div>
                            <div className="flex justify-between items-center text-slate-600"><span>Effective Transfer Speed:</span> <span className="font-black bg-white px-2 py-1 rounded shadow-sm">{result.actualMbps} Mbps <span className="text-slate-500 text-[10px] font-bold ml-1">({result.actualMBps} MB/s)</span></span></div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-200/50">
                                <div className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-2">Pipeline Division</div>
                                <div className="flex justify-between items-center text-blue-700 font-bold mb-1"><span>Payload Sync ({result.osPayloadTB} {storageUnit}):</span> <span>{result.osSyncHours} hrs</span></div>
                                {excludeDb && storageMode !== 'Object' && <div className="flex justify-between items-center text-rose-700 font-bold"><span>Native DB Sync:</span> <span>{result.dbSyncHours} hrs</span></div>}
                            </div>
                            
                            <div className="flex justify-between items-center mt-3 p-2 bg-white/50 rounded text-slate-800 font-black border border-slate-200 shadow-sm"><span>Controlling Path:</span> <span>{result.controllingPath}</span></div>
                            <div className="flex justify-between items-center mt-1 p-2 bg-amber-50 rounded text-amber-800 font-black border border-amber-200 shadow-sm"><span>Friction Risk:</span> <span>{result.riskWarn}</span></div>
                        </div>

                        <div className="mt-5 space-y-2">
                            {result.netWarn && <div className="text-[10px] font-black text-slate-800 bg-slate-100 border border-slate-300 p-3 rounded-xl leading-tight shadow-sm"><i className="fas fa-route mr-1"></i> {result.netWarn}</div>}
                            {result.dbWarn && <div className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-200 p-3 rounded-xl leading-tight shadow-sm"><i className="fas fa-exclamation-circle mr-1"></i> {result.dbWarn}</div>}
                            {result.ioWarn && <div className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 p-3 rounded-xl leading-tight shadow-sm"><i className="fas fa-exclamation-triangle mr-1"></i> {result.ioWarn}</div>}
                            {result.cpuWarn && <div className="text-[10px] font-black text-purple-800 bg-purple-100 border border-purple-200 p-3 rounded-xl leading-tight shadow-sm"><i className="fas fa-microchip mr-1"></i> {result.cpuWarn}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
