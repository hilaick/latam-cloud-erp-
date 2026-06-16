import React, { useState, useEffect, useMemo } from 'react';

export default function PhysicsEngine({ activeProject, onUpdateProject }) {
    // ==========================================
    // 🎛️ GLOBAL & SHARED STATE
    // ==========================================
    const [engineMode, setEngineMode] = useState('cognitive'); // 'cognitive' or 'manual'
    const [showFaq, setShowFaq] = useState(false);

    // Shared Network Constraints
    const [netSource, setNetSource] = useState(1000); 
    const [transitType, setTransitType] = useState('IPsec VPN'); 
    const [netTunnel, setNetTunnel] = useState(300); 
    const [netTarget, setNetTarget] = useState(1000);
    const [downtimeWindow, setDowntimeWindow] = useState(48); 

    // ==========================================
    // 🤖 COGNITIVE MODE STATE
    // ==========================================
    const [concurrency, setConcurrency] = useState(5); 
    const [usedStoragePct, setUsedStoragePct] = useState(50); 
    const [appChurnPct, setAppChurnPct] = useState(2); 
    const [dbChurnPct, setDbChurnPct] = useState(8); 

    // ==========================================
    // ⚙️ MANUAL / GRANULAR MODE STATE
    // ==========================================
    const [computeCPU, setComputeCPU] = useState(60); 
    const [computeRAM, setComputeRAM] = useState(60);
    const [computeOS, setComputeOS] = useState('Linux');
    const [sourceEncrypted, setSourceEncrypted] = useState(false);
    const [storageSize, setStorageSize] = useState(5.0); 
    const [storageUnit, setStorageUnit] = useState('TB');
    const [storageMode, setStorageMode] = useState('Block'); 
    const [diskType, setDiskType] = useState('SSD');
    const [targetKMS, setTargetKMS] = useState(false);
    const [totalFiles, setTotalFiles] = useState(103000000); 
    const [smallFiles, setSmallFiles] = useState(90000000); 
    const [syncMethod, setSyncMethod] = useState('Block'); 
    const [excludeDb, setExcludeDb] = useState(true); 
    const [dbStorageSize, setDbStorageSize] = useState(4.0);
    const [dbType, setDbType] = useState('PostgreSQL'); 
    const [dbRowsM, setDbRowsM] = useState(250); 
    const [dbRps, setDbRps] = useState(8000);
    const [omsTasks, setOmsTasks] = useState(5);
    const [omsObjPerSec, setOmsObjPerSec] = useState(120);
    const [omsBackbone, setOmsBackbone] = useState(16); 
    const [drBackupHrs, setDrBackupHrs] = useState(4); 
    const [drStability, setDrStability] = useState('High'); 

    // ==========================================
    // DATA MAPPING
    // ==========================================
    const nodes = useMemo(() => (activeProject?.mapperNodes || []).filter(n => n?.status !== 'Quoted Only'), [activeProject?.mapperNodes]);
    const totalCompute = nodes.filter(n => ['ECS', 'VM'].includes(String(n.type).toUpperCase())).length;
    const totalDbs = nodes.filter(n => ['RDS', 'GAUSSDB', 'DB'].includes(String(n.type).toUpperCase())).length;

    useEffect(() => {
        if (activeProject?.physics) {
            const p = activeProject.physics;
            setEngineMode(p.engineMode || 'cognitive');
            setNetSource(p.netSource||1000); setTransitType(p.transitType||'IPsec VPN'); setNetTunnel(p.netTunnel||300); setNetTarget(p.netTarget||1000); setDowntimeWindow(p.downtimeWindow||48);
            
            // Cognitive
            setConcurrency(p.concurrency||5); setUsedStoragePct(p.usedStoragePct||50); setAppChurnPct(p.appChurnPct||2); setDbChurnPct(p.dbChurnPct||8);
            
            // Manual
            setComputeCPU(p.computeCPU||60); setComputeRAM(p.computeRAM||60); setComputeOS(p.computeOS||'Linux'); setSourceEncrypted(p.sourceEncrypted||false);
            setStorageMode(p.storageMode||'Block'); setDiskType(p.diskType||'SSD'); setTargetKMS(p.targetKMS||false);
            setStorageSize(p.storageSize||5.0); setStorageUnit(p.storageUnit||'TB');
            setTotalFiles(p.totalFiles||103000000); setSmallFiles(p.smallFiles||90000000); setSyncMethod(p.syncMethod||'Block');
            setExcludeDb(p.excludeDb===undefined?true:p.excludeDb); setDbStorageSize(p.dbStorageSize||4.0);
            setDbType(p.dbType||'PostgreSQL'); setDbRowsM(p.dbRowsM||250); setDbRps(p.dbRps||8000);
            setOmsTasks(p.omsTasks||5); setOmsObjPerSec(p.omsObjPerSec||120); setOmsBackbone(p.omsBackbone||16);
            setDrBackupHrs(p.drBackupHrs||4); setDrStability(p.drStability||'High'); 
        }
    }, [activeProject]);

    const saveContext = () => { 
        const data = { engineMode, netSource, transitType, netTunnel, netTarget, downtimeWindow, concurrency, usedStoragePct, appChurnPct, dbChurnPct, computeCPU, computeRAM, computeOS, sourceEncrypted, storageMode, diskType, targetKMS, storageSize, storageUnit, totalFiles, smallFiles, syncMethod, excludeDb, dbStorageSize, dbType, dbRowsM, dbRps, omsTasks, omsObjPerSec, omsBackbone, drBackupHrs, drStability };
        onUpdateProject(activeProject.id, 'physics', data); 
        alert("Physics Engine parameters saved to project context."); 
    };

    const handleTotalFilesChange = (val) => { const numVal = Number(val); setTotalFiles(val); if (Number(smallFiles) > numVal) setSmallFiles(numVal); };
    const handleSmallFilesChange = (val) => { const numVal = Number(val); const maxVal = Number(totalFiles); setSmallFiles(numVal > maxVal ? maxVal : numVal); };

    // ==========================================
    // 🧠 MATH: COGNITIVE ENGINE
    // ==========================================
    const cogResult = useMemo(() => {
        const rawBottleneckMbps = Math.min(Number(netSource) || 1000, Number(netTunnel) || 300, Number(netTarget) || 1000);
        let cryptoTax = 0.95; 
        if (transitType === 'IPsec VPN') cryptoTax = 0.85; 
        if (transitType === 'Public Internet') cryptoTax = 0.75; 
        
        const effectiveMbps = rawBottleneckMbps * cryptoTax;
        const effectiveGBps = (effectiveMbps / 8) / 1024;

        let totalAllocatedGB = 0; let totalUsedGB = 0; let totalChurnGB = 0;
        
        const analyzedNodes = nodes.map(n => {
            const isDB = String(n.type || '').toUpperCase().includes('DB') || String(n.type || '').toUpperCase().includes('RDS');
            const baseDiskGB = isDB ? 1500 : 200; 
            const allocatedGB = Number(n.storage) || baseDiskGB;
            
            const usedGB = allocatedGB * (usedStoragePct / 100);
            const churnPct = isDB ? dbChurnPct : appChurnPct;
            const churnGB = usedGB * (churnPct / 100);

            const initialSyncHrs = usedGB / effectiveGBps / 3600;
            const cutoverSyncHrs = (churnGB / effectiveGBps / 3600) + 0.5;

            totalAllocatedGB += allocatedGB; totalUsedGB += usedGB; totalChurnGB += churnGB;

            return { ...n, isDB, allocatedGB, usedGB, churnGB, initialSyncHrs, cutoverSyncHrs };
        }).sort((a,b) => b.cutoverSyncHrs - a.cutoverSyncHrs);

        const totalInitialHrs = nodes.length > 0 ? (totalUsedGB / effectiveGBps / 3600) / Number(concurrency) : 0;
        const totalCutoverHrs = nodes.length > 0 ? (totalChurnGB / effectiveGBps / 3600) / Number(concurrency) + 1.5 : 0;
        const criticalNode = analyzedNodes.length > 0 ? analyzedNodes[0] : null;
        const realisticCutoverHrs = Math.max(totalCutoverHrs, criticalNode?.cutoverSyncHrs || 0);

        return {
            effectiveMbps: Math.round(effectiveMbps),
            totalAllocatedTB: (totalAllocatedGB / 1024).toFixed(1),
            totalUsedTB: (totalUsedGB / 1024).toFixed(1),
            totalChurnGB: Math.round(totalChurnGB),
            initialSyncDays: (totalInitialHrs / 24).toFixed(1),
            cutoverHrs: realisticCutoverHrs.toFixed(1),
            isFeasible: realisticCutoverHrs <= Number(downtimeWindow),
            analyzedNodes,
            criticalNode
        };
    }, [nodes, netSource, transitType, netTunnel, netTarget, concurrency, usedStoragePct, appChurnPct, dbChurnPct, downtimeWindow]);

    // ==========================================
    // ⚙️ MATH: MANUAL ENGINE
    // ==========================================
    const manResult = useMemo(() => {
        const unitMultiplier = storageUnit === 'TB' ? 1 : (storageUnit === 'GB' ? 1/1024 : 1/1048576);
        const normalizedStorageTB = Number(storageSize) * unitMultiplier;
        const normalizedDbTB = Number(dbStorageSize) * unitMultiplier;

        const validTotalFiles = Math.max(Number(totalFiles) || 1, 1);
        const validSmallFiles = Math.min(Number(smallFiles) || 0, validTotalFiles);
        const smallFileRatio = validSmallFiles / validTotalFiles;

        let speedMultiplier = 1.0; 
        let cpuWarn = ""; let ioWarn = ""; let dbWarn = ""; let netWarn = ""; let riskWarn = "Stable Infra";
        let finalBottleneck = 1000; let actualTransferMbps = 0; let osSyncHours = 0; let osPayloadTB = 0;

        if (storageMode === 'Object') {
            const tasks = Number(omsTasks) || 1; const ops = Number(omsObjPerSec) || 1;
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

            if (smallFileHours > largeFileHours) ioWarn = `CRIT: Migration is API-Bound. ${validSmallFiles.toLocaleString()} small files took ${smallFileHours.toFixed(1)}h. Large files took ${largeFileHours.toFixed(1)}h. `;
            else ioWarn = `INFO: Migration is Bandwidth-Bound over Cloud Backbone. `;
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
            totalHours: totalHours.toFixed(1), daysStr: days > 0 ? `${days}d ${remainingHours}h` : `${totalHours.toFixed(1)}h`,
            osPayloadTB: osPayloadTB.toFixed(2), actualMbps: actualTransferMbps.toFixed(1), actualMBps: actualTransferMBps.toFixed(1),
            osSyncHours: osSyncHours.toFixed(1), dbSyncHours: dbSyncHours.toFixed(1),
            bottleneckMbps: finalBottleneck, cpuWarn, ioWarn, dbWarn, netWarn, riskWarn, controllingPath,
            isFeasible: totalHours <= (Number(downtimeWindow) || 0), smallFilePct: Math.round(smallFileRatio * 100)
        };
    }, [storageUnit, storageSize, dbStorageSize, totalFiles, smallFiles, storageMode, omsTasks, omsObjPerSec, omsBackbone, excludeDb, targetKMS, netSource, netTunnel, netTarget, transitType, computeCPU, sourceEncrypted, computeRAM, diskType, syncMethod, dbRowsM, dbRps, dbType, drStability, drBackupHrs, downtimeWindow]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-4 pb-12 animate-fade-in">
            {/* 🎛️ HEADER & TOGGLE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
                <div>
                    <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-microscope text-indigo-500"></i> Delivery Physics Engine</h3>
                    <p className="text-xs text-slate-500 mt-1 font-bold">Calculate true SLA timelines using Network, Crypto, and File Count constraints.</p>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                    {/* The Mode Toggle */}
                    <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 border border-slate-200 shadow-inner">
                        <button onClick={() => setEngineMode('cognitive')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${engineMode === 'cognitive' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-brain mr-2"></i> Cognitive (Auto)</button>
                        <button onClick={() => setEngineMode('manual')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${engineMode === 'manual' ? 'bg-white text-rose-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-sliders-h mr-2"></i> Granular (Manual)</button>
                    </div>
                    <button onClick={saveContext} className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-md font-black uppercase tracking-widest text-xs transition-colors whitespace-nowrap"><i className="fas fa-save mr-2"></i> Save Context</button>
                </div>
            </div>

            {/* SHARED NETWORK OVERRIDES (Used by both modes) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between mb-6">
                <div className="flex justify-between items-center mb-5">
                    <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-network-wired text-indigo-500"></i> Global End-to-End Network Constraints</h4>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Source Outbound (Mbps)</label><input type="number" value={netSource} onChange={e=>setNetSource(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50"/></div>
                    <i className="fas fa-arrow-right text-slate-300 text-xl hidden md:block mt-8"></i>
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-blue-500">Transit Route / Tunnel</label>
                        <select value={transitType} onChange={e=>setTransitType(e.target.value)} className="w-full p-3 border-2 border-blue-200 rounded-xl text-xs font-black outline-none focus:border-blue-500 bg-blue-50 text-blue-900 shadow-sm mb-3 cursor-pointer"><option value="DirectConnect">DirectConnect / ExpressRoute</option><option value="IPsec VPN">IPsec VPN Tunnel</option><option value="Public Internet">Public Internet / EIP</option></select>
                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-400">Tunnel Limit:</span><input type="number" value={netTunnel} onChange={e=>setNetTunnel(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs font-bold outline-none focus:border-blue-500 bg-white"/></div>
                    </div>
                    <i className="fas fa-arrow-right text-slate-300 text-xl hidden md:block mt-8"></i>
                    <div className="flex-1 w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Target Cloud Inbound (Mbps)</label><input type="number" value={netTarget} onChange={e=>setNetTarget(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50"/></div>
                </div>
            </div>

            {/* ========================================================== */}
            {/* 🤖 RENDER COGNITIVE MODE */}
            {/* ========================================================== */}
            {engineMode === 'cognitive' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
                    <div className="xl:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                        
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-brain text-purple-500"></i> Predictive Baselines</h4>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Est. Used Storage %</span><span className="text-purple-700">{usedStoragePct}%</span></label>
                                    <input type="range" min="10" max="100" step="5" value={usedStoragePct} onChange={e=>setUsedStoragePct(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-purple-600 cursor-pointer"/>
                                    <div className="text-[9px] text-slate-400 mt-1 font-bold">What % of the raw disks actually contain data?</div>
                                </div>
                                <div className="border-t border-slate-100 pt-4">
                                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>App Server Daily Churn</span><span className="text-purple-700">{appChurnPct}%</span></label>
                                    <input type="range" min="0.1" max="10" step="0.1" value={appChurnPct} onChange={e=>setAppChurnPct(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-purple-600 cursor-pointer"/>
                                </div>
                                <div>
                                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>DB Server Daily Churn</span><span className="text-purple-700">{dbChurnPct}%</span></label>
                                    <input type="range" min="1" max="25" step="1" value={dbChurnPct} onChange={e=>setDbChurnPct(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-purple-600 cursor-pointer"/>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-shield-alt text-emerald-500"></i> Limits & Cutover SLA</h4>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Agent Concurrency Limit</label>
                                    <div className="flex items-center gap-4">
                                        <input type="range" min="1" max="20" value={concurrency} onChange={e=>setConcurrency(e.target.value)} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none accent-emerald-600 cursor-pointer"/>
                                        <div className="font-black text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">{concurrency} Nodes</div>
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-1 font-bold">Max servers syncing simultaneously.</div>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-800">Target Cutover Window (Hours)</label>
                                    <input type="number" value={downtimeWindow} onChange={e=>setDowntimeWindow(e.target.value)} className="w-full p-4 border-2 border-emerald-300 rounded-xl bg-white font-black text-2xl text-emerald-900 outline-none text-center shadow-inner"/>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h4 className="font-black text-xs uppercase tracking-widest text-slate-700"><i className="fas fa-exclamation-triangle text-amber-500 mr-2"></i> Critical Path Analysis</h4>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Top Heaviest Nodes</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-[9px] uppercase tracking-widest text-slate-500">
                                        <tr><th className="p-3">Node Name</th><th className="p-3 text-right">Used Storage</th><th className="p-3 text-right">Daily Delta</th><th className="p-3 text-right">Init Sync</th><th className="p-3 text-right">Cutover Time</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {cogResult.analyzedNodes.slice(0, 5).map((n, i) => (
                                            <tr key={i} className={`hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-amber-50/50' : ''}`}>
                                                <td className="p-3 font-bold text-slate-800"><i className={`fas ${n.isDB ? 'fa-database text-rose-500' : 'fa-server text-blue-500'} mr-2`}></i>{n.name || n.hostname || 'Unknown Node'} {i === 0 && <span className="ml-2 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest">Critical Path</span>}</td>
                                                <td className="p-3 text-right font-mono text-slate-600">{(n.usedGB).toFixed(0)} GB</td><td className="p-3 text-right font-mono text-slate-600">{(n.churnGB).toFixed(0)} GB</td><td className="p-3 text-right font-mono text-slate-600">{(n.initialSyncHrs).toFixed(1)}h</td>
                                                <td className={`p-3 text-right font-black ${n.cutoverSyncHrs > downtimeWindow ? 'text-rose-600' : 'text-slate-800'}`}>{(n.cutoverSyncHrs).toFixed(1)}h</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-4 space-y-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                            <div className="text-[10px] font-black tracking-widest uppercase mb-1 text-slate-500">Effective Bandwidth</div>
                            <div className="text-3xl font-black text-indigo-600">{cogResult.effectiveMbps} Mbps</div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 pl-2 border-b border-slate-100 pb-2">Phase 1: Background Sync</div>
                            <div className="flex justify-between items-end mb-2">
                                <div><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Time to Complete</div><div className="text-3xl font-black text-blue-700">{cogResult.initialSyncDays} Days</div></div>
                                <i className="fas fa-clock text-3xl text-slate-200"></i>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">Total payload is <b>{cogResult.totalUsedTB} TB</b>. Zero downtime impact.</div>
                        </div>

                        <div className={`p-8 rounded-3xl border-4 flex flex-col justify-center shadow-sm relative overflow-hidden transition-colors ${cogResult.isFeasible ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Phase 2: Cutover Downtime</div>
                            <div className={`text-6xl font-black tracking-tighter ${cogResult.isFeasible ? 'text-emerald-700' : 'text-rose-700'}`}>{cogResult.cutoverHrs} <span className="text-2xl">Hrs</span></div>
                            <div className="mt-4 pt-4 border-t-2 border-slate-200/60 text-xs font-medium space-y-3">
                                <div className="flex justify-between items-center text-slate-600"><span>Target SLA Allowed:</span> <span className="font-black bg-white px-2 py-1 rounded shadow-sm">{downtimeWindow} Hrs</span></div>
                                <div className="flex justify-between items-center text-slate-600"><span>Total Delta Data:</span> <span className="font-black bg-white px-2 py-1 rounded shadow-sm">{cogResult.totalChurnGB} GB</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================== */}
            {/* ⚙️ RENDER MANUAL MODE */}
            {/* ========================================================== */}
            {engineMode === 'manual' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
                    <div className="xl:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                        
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[200px]">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-server text-blue-500"></i> 1. Compute Node</h4>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={sourceEncrypted} onChange={e=>setSourceEncrypted(e.target.checked)} className="w-4 h-4 accent-blue-600"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Source Disk Encrypted</span></label>
                            </div>
                            <div className="space-y-5">
                                <div><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>CPU Saturation</span><span className="text-blue-700">{computeCPU}%</span></label><input type="range" min="10" max="99" value={computeCPU} onChange={e=>setComputeCPU(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"/></div>
                                <div><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>RAM Saturation</span><span className="text-blue-700">{computeRAM}%</span></label><input type="range" min="10" max="99" value={computeRAM} onChange={e=>setComputeRAM(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"/></div>
                                <div className="flex gap-4"><div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Operating System</label><select value={computeOS} onChange={e=>setComputeOS(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"><option value="Linux">Linux</option><option value="Windows">Windows</option></select></div></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-hdd text-blue-500"></i> 2. Target Protocol & Payload</h4>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={targetKMS} onChange={e=>setTargetKMS(e.target.checked)} className="w-4 h-4 accent-blue-600"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target KMS Encryption</span></label>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-1/2 flex gap-2">
                                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Total Size</label><input type="number" value={storageSize} onChange={e=>setStorageSize(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none bg-slate-50"/></div>
                                        <div className="w-16"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Unit</label><select value={storageUnit} onChange={e=>setStorageUnit(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none bg-slate-50"><option>TB</option><option>GB</option><option>MB</option></select></div>
                                    </div>
                                    <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-rose-700">Target Protocol</label><select value={storageMode} onChange={e=>setStorageMode(e.target.value)} className="w-full p-3 border-2 border-rose-300 bg-rose-50 text-rose-900 rounded-xl text-xs font-black outline-none"><option value="Block">Block/File (Disk)</option><option value="Object">Object Storage</option></select></div>
                                </div>
                                <div className="flex gap-4 items-end pt-3">
                                    <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Total File Count</label><input type="number" value={totalFiles} onChange={e=>handleTotalFilesChange(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none bg-slate-50"/></div>
                                    <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-amber-700">Of which are Small</label><input type="number" value={smallFiles} onChange={e=>handleSmallFilesChange(e.target.value)} className="w-full p-3 border-2 border-amber-300 bg-amber-50 text-amber-900 rounded-xl text-sm font-black outline-none shadow-inner"/></div>
                                </div>
                                {storageMode !== 'Object' && (
                                    <div className="flex gap-4 pt-1"><div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Source Disk</label><select value={diskType} onChange={e=>setDiskType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none bg-slate-50"><option>HDD</option><option>SSD</option><option>NVMe</option></select></div><div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-purple-700">Agent Mode</label><select value={syncMethod} onChange={e=>setSyncMethod(e.target.value)} className="w-full p-3 border-2 border-purple-300 bg-purple-50 text-purple-900 rounded-xl text-xs font-black outline-none"><option value="Block">Block-Level</option><option value="File">File-Level (Linux)</option></select></div></div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-database text-rose-500"></i> 3. Database Routing</h4>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={excludeDb} onChange={e=>setExcludeDb(e.target.checked)} className="w-4 h-4 accent-rose-600"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Split DB Payload</span></label>
                            </div>
                            {excludeDb ? (
                                <div className="space-y-4">
                                    <div className="flex gap-3"><div className="w-1/3"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">DB Size ({storageUnit})</label><input type="number" value={dbStorageSize} onChange={e=>setDbStorageSize(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none bg-white"/></div><div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Engine</label><select value={dbType} onChange={e=>setDbType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none bg-white"><option>HANA</option><option>Oracle</option><option>PostgreSQL</option><option>SQL Server</option></select></div></div>
                                    <div className="flex gap-3"><div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Est. Rows (M)</label><input type="number" value={dbRowsM} onChange={e=>setDbRowsM(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none bg-white"/></div><div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Sync (Rows/s)</label><input type="number" value={dbRps} onChange={e=>setDbRps(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none bg-white"/></div></div>
                                </div>
                            ) : <div className="flex-1 flex items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 opacity-60"><p className="text-xs font-bold">Monolith Sync Active.</p></div>}
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="font-black text-sm mb-5 flex items-center gap-2 text-slate-800"><i className="fas fa-shield-alt text-amber-500"></i> 4. Operations & DR SLA</h4>
                            <div className="flex gap-3 mb-6"><div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Cold Backup (Hrs)</label><input type="number" value={drBackupHrs} onChange={e=>setDrBackupHrs(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none bg-slate-50"/></div><div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Link Stability</label><select value={drStability} onChange={e=>setDrStability(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none bg-slate-50"><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div></div>
                            <div className="w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700">Target SLA Window (Hrs)</label><input type="number" value={downtimeWindow} onChange={e=>setDowntimeWindow(e.target.value)} className="w-full p-4 border-2 border-emerald-300 rounded-xl bg-emerald-50 font-black text-base text-emerald-900 outline-none text-center shadow-inner"/></div>
                        </div>

                    </div>

                    <div className="xl:col-span-4 space-y-6">
                        <div className={`p-8 rounded-3xl border-4 flex flex-col justify-center min-h-[350px] shadow-sm relative overflow-hidden ${manResult.isFeasible ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Calculated End-to-End SLA</div>
                            <div className={`text-6xl font-black tracking-tighter ${manResult.isFeasible ? 'text-emerald-700' : 'text-rose-700'}`}>{manResult.daysStr}</div>
                            <div className="text-sm font-bold text-slate-600 mt-2">({manResult.totalHours} total execution hours)</div>
                            
                            <div className="mt-6 pt-6 border-t-2 border-slate-200/60 text-xs font-medium space-y-3">
                                <div className="flex justify-between items-center text-slate-600"><span>Calculated Bottleneck:</span> <span className="font-black bg-white px-2 py-1 rounded shadow-sm">{manResult.bottleneckMbps} Mbps</span></div>
                                <div className="flex justify-between items-center text-slate-600"><span>Effective Transfer:</span> <span className="font-black bg-white px-2 py-1 rounded shadow-sm">{manResult.actualMbps} Mbps</span></div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-200/50">
                                    <div className="flex justify-between items-center text-blue-700 font-bold mb-1"><span>Payload Sync:</span> <span>{manResult.osSyncHours} hrs</span></div>
                                    {excludeDb && storageMode !== 'Object' && <div className="flex justify-between items-center text-rose-700 font-bold"><span>Native DB Sync:</span> <span>{manResult.dbSyncHours} hrs</span></div>}
                                </div>
                            </div>
                            <div className="mt-5 space-y-2">
                                {manResult.netWarn && <div className="text-[10px] font-black text-slate-800 bg-slate-100 border border-slate-300 p-3 rounded-xl shadow-sm"><i className="fas fa-route mr-1"></i> {manResult.netWarn}</div>}
                                {manResult.dbWarn && <div className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-200 p-3 rounded-xl shadow-sm"><i className="fas fa-exclamation-circle mr-1"></i> {manResult.dbWarn}</div>}
                                {manResult.ioWarn && <div className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 p-3 rounded-xl shadow-sm"><i className="fas fa-exclamation-triangle mr-1"></i> {manResult.ioWarn}</div>}
                                {manResult.cpuWarn && <div className="text-[10px] font-black text-purple-800 bg-purple-100 border border-purple-200 p-3 rounded-xl shadow-sm"><i className="fas fa-microchip mr-1"></i> {manResult.cpuWarn}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
