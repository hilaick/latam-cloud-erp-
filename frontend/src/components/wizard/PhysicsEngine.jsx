import React, { useState, useEffect, useMemo } from 'react';

export default function PhysicsEngine({ activeProject, onUpdateProject }) {
    // ==========================================
    // 🌍 GLOBAL PIPELINE CONSTRAINTS
    // ==========================================
    const [netSource, setNetSource] = useState(1000); 
    const [transitType, setTransitType] = useState('IPsec VPN'); 
    const [netTunnel, setNetTunnel] = useState(300); 
    const [targetKMS, setTargetKMS] = useState(false);
    const [storageMode, setStorageMode] = useState('Block'); // Block vs Object
    const [downtimeWindow, setDowntimeWindow] = useState(48);
    
    // Auto-detect waves from Target Architecture
    const nodes = activeProject?.mapperNodes || [];
    const totalCompute = nodes.filter(n => ['ECS', 'VM'].includes(String(n.type).toUpperCase())).length;
    const totalDbs = nodes.filter(n => ['RDS', 'GAUSSDB', 'DB'].includes(String(n.type).toUpperCase())).length;

    const waves = useMemo(() => {
        const computeAndDb = nodes.filter(n => ['ECS', 'VM', 'RDS', 'GAUSSDB', 'DB'].includes(String(n.type).toUpperCase()) && n.status !== 'Quoted Only');
        const groups = {};
        
        computeAndDb.forEach(n => {
            const waveName = n.location || 'Default Application Group';
            if (!groups[waveName]) groups[waveName] = { name: waveName, nodes: [], nodeCount: 0, dbCount: 0, isDbHeavy: false };
            groups[waveName].nodes.push(n);
            if (['RDS', 'GAUSSDB', 'DB'].includes(String(n.type).toUpperCase())) {
                groups[waveName].dbCount++;
                groups[waveName].isDbHeavy = true;
            } else {
                groups[waveName].nodeCount++;
            }
        });
        
        return Object.values(groups);
    }, [nodes]);

    // ==========================================
    // 🌊 PER-WAVE CONFIGURATIONS
    // ==========================================
    const [waveConfigs, setWaveConfigs] = useState({});

    useEffect(() => {
        if (activeProject?.physics?.waveConfigs) {
            setWaveConfigs(activeProject.physics.waveConfigs);
            setNetSource(activeProject.physics.netSource || 1000);
            setTransitType(activeProject.physics.transitType || 'IPsec VPN');
            setNetTunnel(activeProject.physics.netTunnel || 300);
            setTargetKMS(activeProject.physics.targetKMS || false);
            setStorageMode(activeProject.physics.storageMode || 'Block');
            setDowntimeWindow(activeProject.physics.downtimeWindow || 48);
        } else {
            const defaults = {};
            waves.forEach(w => { 
                defaults[w.name] = { 
                    storageSizeTB: ((w.nodeCount * 0.5) + (w.dbCount * 1.0)).toFixed(1), 
                    computeCPU: 60,
                    syncMethod: 'Block', // Block or File
                    totalFilesM: 10,
                    smallFilesM: 8,
                    excludeDb: true,
                    dbStorageSizeTB: (w.dbCount * 1.0).toFixed(1),
                    dbRowsM: w.dbCount * 250,
                    dbRps: 8000
                }; 
            });
            setWaveConfigs(defaults);
        }
    }, [activeProject, waves]);

    const handleWaveConfigChange = (waveName, field, value) => {
        setWaveConfigs(prev => ({ ...prev, [waveName]: { ...prev[waveName], [field]: value } }));
    };

    // ==========================================
    // 🧮 PRIMITIVE MATH ENGINE (Applied Per-Wave)
    // ==========================================
    const waveResults = useMemo(() => {
        return waves.map(wave => {
            const config = waveConfigs[wave.name] || { storageSizeTB: 1.0, computeCPU: 60 };
            
            let speedMultiplier = 1.0;
            let cpuWarn = ""; let ioWarn = ""; let dbWarn = ""; let netWarn = "";
            let finalBottleneck = Math.min(Number(netSource), Number(netTunnel), 10000);
            
            // 1. Global Network & Crypto Taxes
            if (transitType === 'IPsec VPN') { speedMultiplier *= 0.85; netWarn = "IPsec Tax (15%)."; }
            else if (transitType === 'Public Internet') { speedMultiplier *= 0.75; netWarn = "Internet TCP Retransmit Tax (25%)."; }
            else { speedMultiplier *= 0.95; netWarn = "Standard TCP Header Tax (5%)."; }

            if (targetKMS) { speedMultiplier *= 0.95; ioWarn += "Target Block KMS Crypto Tax (5%). "; }
            
            if (Number(config.computeCPU) >= 85) { speedMultiplier *= 0.4; cpuWarn = "CRIT Compute: Source node >85% saturation. Agent severely throttled."; }
            else if (Number(config.computeCPU) >= 75) { speedMultiplier *= 0.7; cpuWarn = "WARN Compute: Source node >75% saturation. Minor throttling applied."; }

            let actualTransferMbps = 0;
            let osSyncHours = 0;
            let dbSyncHours = 0;
            const totalPayloadTB = Number(config.storageSizeTB) || 1.0;

            // 2. Storage Protocol Math (Block vs Object)
            if (storageMode === 'Object') {
                const backboneMbps = 16000; // 16 Gbps cloud backbone
                finalBottleneck = backboneMbps;
                let backboneMultiplier = targetKMS ? 0.81 : 0.9;
                
                const validTotalFiles = Math.max(Number(config.totalFilesM) * 1000000, 1);
                const validSmallFiles = Math.min(Number(config.smallFilesM) * 1000000, validTotalFiles);
                
                // OMS API Constraints (Small files bounded by HTTP PUT limits)
                const smallFileHours = validSmallFiles / (5 * 120) / 3600; // 5 tasks * 120 ops/sec
                const smallFilesTB = (validSmallFiles * 10) / (1024 * 1024 * 1024);
                
                const largePayloadTB = Math.max(0, totalPayloadTB - smallFilesTB);
                const largeFileHours = (((largePayloadTB * 1024 * 1024 * 8) / (backboneMbps * backboneMultiplier)) / 3600);

                osSyncHours = smallFileHours + largeFileHours;
                actualTransferMbps = osSyncHours > 0 ? ((totalPayloadTB * 1024 * 1024 * 8) / (osSyncHours * 3600)) : (backboneMbps * backboneMultiplier);

                if (smallFileHours > largeFileHours) ioWarn += `CRIT: Migration is API-Bound. ${validSmallFiles.toLocaleString()} small files took ${smallFileHours.toFixed(1)}h. `;
                else ioWarn += `INFO: Migration is Bandwidth-Bound over Cloud Backbone. `;
            } else {
                // Block/File Constraints
                if (config.syncMethod === 'Block') {
                    speedMultiplier *= 1.35; // Block compression
                    ioWarn += "INFO: Block-Level selected. Data compressed transit (+35% virtual speed). ";
                } else if (config.syncMethod === 'File') {
                    const validTotalFiles = Math.max(Number(config.totalFilesM) * 1000000, 1);
                    const validSmallFiles = Math.min(Number(config.smallFilesM) * 1000000, validTotalFiles);
                    if (validSmallFiles > 100000) { 
                        let volumePenalty = validSmallFiles / 2000000;
                        let filePenalty = Math.max(0.20, 1 - (volumePenalty * 0.75)); 
                        speedMultiplier *= filePenalty;
                        ioWarn += `CRIT I/O: File-Level sync of ${validSmallFiles.toLocaleString()} small files destroys inode lookups. Network underutilized. `; 
                    }
                }
                actualTransferMbps = finalBottleneck * speedMultiplier;
                
                // Calculate OS Payload (Subtract DB size if split)
                let osPayloadTB = totalPayloadTB;
                if (wave.isDbHeavy && config.excludeDb) {
                    osPayloadTB = Math.max(0, totalPayloadTB - (Number(config.dbStorageSizeTB) || 0));
                }
                osSyncHours = (((osPayloadTB * 1024 * 1024 * 8) / (actualTransferMbps || 1)) / 3600); 
            }

            // 3. Database Native Sync Math
            if (wave.isDbHeavy && config.excludeDb && storageMode !== 'Object') {
                const dbTotalRows = Number(config.dbRowsM) * 1000000;
                const effectiveRps = Number(config.dbRps) || 8000;
                dbSyncHours = (dbTotalRows / effectiveRps) / 3600;

                if (dbSyncHours > osSyncHours) {
                    dbWarn = `CRIT BOTTLENECK: DB Logical Sync (${dbSyncHours.toFixed(1)}h) is slower than the OS Payload Sync (${osSyncHours.toFixed(1)}h). Pipeline constrained by DB Rows/sec.`;
                }
            } else if (wave.isDbHeavy && storageMode === 'Object') {
                dbWarn = `CRIT: Databases cannot be natively replicated to Object protocols.`;
            }

            const finalHours = Math.max(osSyncHours, dbSyncHours);

            return { 
                ...wave, payloadTB: totalPayloadTB, actualMbps: actualTransferMbps.toFixed(0), 
                hours: finalHours.toFixed(1),
                cpuWarn, ioWarn, dbWarn, netWarn,
                controllingPath: dbSyncHours > osSyncHours ? "Database Native Replication" : (storageMode === 'Object' ? "API Object Transfer (OMS)" : "OS/Disk Network Transfer")
            };
        });
    }, [waves, waveConfigs, netSource, transitType, netTunnel, targetKMS, storageMode]);

    const longestWaveHours = waveResults.length > 0 ? Math.max(...waveResults.map(w => Number(w.hours))).toFixed(1) : "0.0";
    const totalPayload = waveResults.reduce((sum, w) => sum + w.payloadTB, 0).toFixed(1);
    const isFeasible = Number(longestWaveHours) <= Number(downtimeWindow);

    const saveContext = () => { 
        const data = { waveConfigs, netSource, transitType, netTunnel, targetKMS, storageMode, downtimeWindow, calculatedTotalHours: longestWaveHours, totalStorageTB: totalPayload };
        onUpdateProject(activeProject.id, 'physics', data); 
        alert("Wave Physics Parameters Saved."); 
    };

    if (waves.length === 0) {
        return (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center text-slate-500 animate-fade-in">
                <i className="fas fa-layer-group text-4xl mb-4 text-slate-400"></i>
                <h3 className="font-black text-xl mb-2">No Application Waves Detected</h3>
                <p className="font-medium text-sm">Please return to Step 2 (Architecture) and ensure you have ECS or RDS nodes in your Target Architecture list.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
            {/* 🌍 GLOBAL SUMMARY HEADER */}
            <div className="bg-slate-900 rounded-2xl shadow-xl p-8 flex flex-col md:flex-row justify-between items-center text-white border border-slate-700 gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-10 pointer-events-none -mt-20 -mr-20"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2"><i className="fas fa-microscope text-blue-400 mr-3"></i> Cloud Delivery Physics Engine</h2>
                    <p className="text-xs text-slate-400 font-medium max-w-lg">Calculates true SLA timelines by simulating Agent constraints, Crypto overhead, Database rows, and E2E routing.</p>
                </div>
                <div className="flex gap-6 items-center flex-wrap relative z-10">
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-600 text-center min-w-[100px]">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Compute Nodes</div>
                        <div className="text-xl font-black text-blue-400">{totalCompute}</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-600 text-center min-w-[100px]">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Databases</div>
                        <div className="text-xl font-black text-rose-400">{totalDbs}</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-600 text-center min-w-[100px]">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Payload</div>
                        <div className="text-xl font-black text-purple-400">{totalPayload} TB</div>
                    </div>
                    <div className="border-l border-slate-700 pl-6 text-center">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">SLA Feasibility</div>
                        <div className={`text-3xl font-black ${isFeasible ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {isFeasible ? <i className="fas fa-check-circle"></i> : <i className="fas fa-exclamation-triangle"></i>}
                        </div>
                    </div>
                    <button onClick={saveContext} className="ml-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">Save Math</button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">
                {/* ⬅️ LEFT: GLOBAL PIPELINE CONSTRAINTS */}
                <div className="xl:w-80 shrink-0 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h4 className="font-black text-sm text-slate-800 mb-6 border-b pb-2"><i className="fas fa-network-wired text-amber-500 mr-2"></i> Global Pipe & Targets</h4>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-rose-700">Target Protocol</label>
                                <select value={storageMode} onChange={e=>setStorageMode(e.target.value)} className="w-full p-3 border-2 border-rose-300 bg-rose-50 text-rose-900 rounded-xl text-xs font-black outline-none">
                                    <option value="Block">Block/File (Disk)</option>
                                    <option value="Object">Serverless Object (OMS)</option>
                                </select>
                            </div>

                            {storageMode === 'Block' && (
                                <>
                                    <div><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Source Firewall limit (Mbps)</span><span className="text-amber-700">{netSource}</span></label><input type="range" min="10" max="10000" step="10" value={netSource} onChange={e=>setNetSource(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-amber-500 cursor-pointer"/></div>
                                    <div>
                                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Transit Route</label>
                                        <select value={transitType} onChange={e=>setTransitType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500 bg-slate-50">
                                            <option value="DirectConnect">DirectConnect / ExpressRoute</option>
                                            <option value="IPsec VPN">IPsec VPN Tunnel (15% Tax)</option>
                                            <option value="Public Internet">Public Internet (25% Tax)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Tunnel Cap (Mbps)</span><span className="text-amber-700">{netTunnel}</span></label>
                                        <input type="range" min="10" max="10000" step="10" value={netTunnel} onChange={e=>setNetTunnel(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-amber-500 cursor-pointer"/>
                                    </div>
                                </>
                            )}
                            
                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" checked={targetKMS} onChange={e=>setTargetKMS(e.target.checked)} className="w-5 h-5 accent-amber-500"/>
                                <span className="text-xs font-bold text-slate-700">Target KMS Crypto Tax</span>
                            </label>

                            <div className="border-t border-slate-200 pt-5 mt-5">
                                <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700">Target Go-Live SLA (Hrs)</label>
                                <input type="number" value={downtimeWindow} onChange={e=>setDowntimeWindow(e.target.value)} className="w-full p-4 border-2 border-emerald-300 rounded-xl bg-emerald-50 font-black text-base text-emerald-900 outline-none text-center shadow-inner"/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ➡️ RIGHT: THE APPLICATION WAVES (Detailed Math Applied Per Wave) */}
                <div className="flex-1 space-y-4">
                    {waveResults.map((wave, idx) => {
                        const config = waveConfigs[wave.name] || {};
                        const showFileMath = storageMode === 'Object' || config.syncMethod === 'File';

                        return (
                            <div key={wave.name} className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden hover:shadow-md transition-all ${Number(wave.hours) > Number(downtimeWindow) ? 'border-rose-300' : 'border-slate-200 hover:border-blue-300'}`}>
                                
                                {/* Wave Header & Output */}
                                <div className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-4">
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-8xl text-slate-200 opacity-20 pointer-events-none font-black">{idx+1}</div>
                                    <div className="relative z-10">
                                        <h4 className="font-black text-xl text-slate-800 flex items-center gap-3"><i className="fas fa-layer-group text-blue-500"></i> {wave.name}</h4>
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">
                                            {wave.nodeCount} Servers {wave.isDbHeavy && <span className="text-rose-500 ml-1">+ {wave.dbCount} Databases</span>}
                                        </p>
                                    </div>
                                    <div className="relative z-10 flex gap-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="text-right">
                                            <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Effective Transfer</div>
                                            <div className="text-base font-black text-cyan-600">{wave.actualMbps} Mbps</div>
                                        </div>
                                        <div className="border-l border-slate-200 pl-6 text-right">
                                            <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Calculated SLA</div>
                                            <div className={`text-xl font-black ${Number(wave.hours) > Number(downtimeWindow) ? 'text-rose-600' : 'text-emerald-600'}`}>{wave.hours}h</div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Wave Configurations (Dynamic Math Inputs) */}
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                                    {/* Column 1: Compute & Storage */}
                                    <div className="space-y-5">
                                        <h5 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2"><i className="fas fa-server mr-2 text-slate-400"></i> Payload & Compute Constraints</h5>
                                        
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Total Wave Payload (TB)</label>
                                                <input type="number" step="0.1" value={config.storageSizeTB} onChange={e=>handleWaveConfigChange(wave.name, 'storageSizeTB', e.target.value)} className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-black text-blue-900 bg-blue-50 outline-none focus:border-blue-500"/>
                                            </div>
                                            {storageMode === 'Block' && (
                                                <div className="w-32">
                                                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-purple-700">Sync Mode</label>
                                                    <select value={config.syncMethod} onChange={e=>handleWaveConfigChange(wave.name, 'syncMethod', e.target.value)} className="w-full p-2.5 border-2 border-purple-200 rounded-lg text-xs font-black outline-none bg-purple-50 text-purple-900">
                                                        <option value="Block">Block</option><option value="File">File</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {storageMode !== 'Object' && (
                                            <div>
                                                <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Heaviest Node CPU Limit</span><span className="text-slate-700">{config.computeCPU}%</span></label>
                                                <input type="range" min="10" max="99" value={config.computeCPU} onChange={e=>handleWaveConfigChange(wave.name, 'computeCPU', e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer"/>
                                            </div>
                                        )}

                                        {/* Dynamic File Math */}
                                        {showFileMath && (
                                            <div className="flex gap-4 pt-2 border-t border-slate-100">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Total Files (M)</label>
                                                    <input type="number" value={config.totalFilesM} onChange={e=>handleWaveConfigChange(wave.name, 'totalFilesM', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-white"/>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-amber-700" title="Files smaller than 64KB cause heavy inode/API latency">Small Files (M)</label>
                                                    <input type="number" value={config.smallFilesM} onChange={e=>handleWaveConfigChange(wave.name, 'smallFilesM', e.target.value)} className="w-full p-2.5 border border-amber-200 rounded-lg text-sm font-black outline-none bg-amber-50 text-amber-900"/>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Column 2: Database & Diagnostics */}
                                    <div className="space-y-5">
                                        <h5 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2"><i className="fas fa-database mr-2 text-rose-400"></i> Database Native Sync</h5>
                                        
                                        {wave.isDbHeavy ? (
                                            <div className="space-y-4">
                                                <label className="flex items-center gap-2 cursor-pointer bg-rose-50 p-2 rounded-lg border border-rose-100 w-max">
                                                    <input type="checkbox" checked={config.excludeDb} onChange={e=>handleWaveConfigChange(wave.name, 'excludeDb', e.target.checked)} className="w-4 h-4 accent-rose-600"/>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-800">Split DB Payload from Block Agent</span>
                                                </label>
                                                
                                                {config.excludeDb && (
                                                    <div className="flex gap-4">
                                                        <div className="w-24">
                                                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">DB TB</label>
                                                            <input type="number" step="0.1" value={config.dbStorageSizeTB} onChange={e=>handleWaveConfigChange(wave.name, 'dbStorageSizeTB', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-rose-500 bg-white"/>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Est. Rows (M)</label>
                                                            <input type="number" value={config.dbRowsM} onChange={e=>handleWaveConfigChange(wave.name, 'dbRowsM', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-rose-500 bg-white"/>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Sync (Rows/sec)</label>
                                                            <input type="number" value={config.dbRps} onChange={e=>handleWaveConfigChange(wave.name, 'dbRps', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-rose-500 bg-white"/>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full flex items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 opacity-60">
                                                <div className="text-center"><i className="fas fa-server text-3xl mb-2 text-slate-300"></i><p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Pure Compute Wave<br/>(No DB Logic Needed)</p></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Diagnostic Output Banner */}
                                {(wave.cpuWarn || wave.ioWarn || wave.dbWarn || wave.netWarn) && (
                                    <div className="bg-slate-900 border-t border-slate-700 p-4 flex flex-col gap-2">
                                        {wave.netWarn && <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest"><i className="fas fa-route mr-2 opacity-70"></i> {wave.netWarn}</div>}
                                        {wave.ioWarn && <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest"><i className="fas fa-exclamation-triangle mr-2 opacity-70"></i> {wave.ioWarn}</div>}
                                        {wave.dbWarn && <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest"><i className="fas fa-database mr-2 opacity-70"></i> {wave.dbWarn}</div>}
                                        {wave.cpuWarn && <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest"><i className="fas fa-microchip mr-2 opacity-70"></i> {wave.cpuWarn}</div>}
                                        
                                        <div className="text-[9px] font-mono text-slate-500 mt-2 border-t border-slate-700 pt-2">
                                            Controlling Path constraint: {wave.controllingPath}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
