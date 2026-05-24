import React, { useState, useEffect, useMemo } from 'react';

// ==========================================
// 1. PURE CALCULATION LOGIC (No UI)
// ==========================================
function calculatePhysics(params) {
    const {
        computeCPU, computeRAM, computeOS, sourceEncrypted,
        storageSize, storageUnit, storageMode, diskType, targetKMS,
        totalFiles, smallFiles, syncMethod, excludeDb, dbStorageSize,
        dbType, dbRowsM, dbRps, netSource, transitType, netTunnel,
        netTarget, omsTasks, omsObjPerSec, omsBackbone, drBackupHrs,
        drStability, downtimeWindow
    } = params;

    const unitMultiplier = storageUnit === 'TB' ? 1 : (storageUnit === 'GB' ? 1/1024 : 1/1048576);
    const normalizedStorageTB = Number(storageSize) * unitMultiplier;
    const normalizedDbTB = Number(dbStorageSize) * unitMultiplier;

    const validTotalFiles = Math.max(Number(totalFiles) || 1, 1);
    const validSmallFiles = Math.min(Number(smallFiles) || 0, validTotalFiles);
    const smallFileRatio = validSmallFiles / validTotalFiles;

    let speedMultiplier = 1.0; 
    let cpuWarn = ""; let ioWarn = ""; let dbWarn = ""; let netWarn = ""; 
    let riskWarn = "Stable Infra";
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

        let diskLimitMbps = diskType === 'SSD' ? 4000 : (diskType === 'NVMe' ? 24000 : 1000);
        finalBottleneck = Math.min(finalBottleneck, diskLimitMbps);

        if (targetKMS) { speedMultiplier *= 0.95; ioWarn += "Target Block KMS Encryption Tax (5%). "; }

        if (syncMethod === 'Block') {
            speedMultiplier *= 1.35; ioWarn += "INFO: Block-Level selected. Data compressed transit (+35% virtual speed). Ignores small files.";
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
    if (dbType === 'Oracle' || dbType === 'HANA') effectiveRps *= 0.8; 
    const dbSyncHours = (excludeDb && storageMode !== 'Object') ? (dbTotalRows / effectiveRps) / 3600 : 0;

    let controllingPath = storageMode === 'Object' ? "API Object Transfer (OMS)" : "OS/Disk Network Transfer";
    if (excludeDb && storageMode !== 'Object' && dbSyncHours > osSyncHours) {
        controllingPath = "Database Native Replication";
        dbWarn = `CRIT BOTTLENECK: DB Logical Sync (${dbSyncHours.toFixed(1)}h) is slower than the Payload Sync (${osSyncHours.toFixed(1)}h). Pipeline constrained by DB Rows/sec.`;
    }

    const rawExecutionHours = Math.max(osSyncHours, dbSyncHours);
    let riskMultiplier = drStability === 'Medium' ? 1.3 : (drStability === 'Low' ? 1.6 : 1.0);
    if (drStability === 'Medium') riskWarn = "Risk (+30% Stability Buffer)";
    else if (drStability === 'Low') riskWarn = "Risk (+60% Stability Buffer)";
    
    const totalHours = (rawExecutionHours + (Number(drBackupHrs) || 0)) * riskMultiplier;
    const days = Math.floor(totalHours / 24); 
    const remainingHours = (totalHours % 24).toFixed(1);

    return { 
        totalHours: totalHours.toFixed(1), daysStr: days > 0 ? `${days}d ${remainingHours}h` : `${totalHours.toFixed(1)}h`,
        osPayloadTB: osPayloadTB.toFixed(2), actualMbps: actualTransferMbps.toFixed(1), actualMBps: actualTransferMBps.toFixed(1),
        osSyncHours: osSyncHours.toFixed(1), dbSyncHours: dbSyncHours.toFixed(1), bottleneckMbps: finalBottleneck, 
        cpuWarn, ioWarn, dbWarn, netWarn, riskWarn, controllingPath,
        isFeasible: totalHours <= (Number(downtimeWindow) || 0), smallFilePct: Math.round(smallFileRatio * 100),
        rawExecutionHours, riskMultiplier, smallFileHours: validSmallFiles > 0 ? validSmallFiles : 0,
        largePayloadTB: storageMode === 'Object' ? Math.max(0, osPayloadTB - ((validSmallFiles * 10) / (1024 * 1024 * 1024))) : 0
    };
}

// ==========================================
// 2. DETAILED UI COMPONENTS
// ==========================================

function ComputeNode({ computeCPU, computeRAM, computeOS, sourceEncrypted, storageMode, onParamChange }) {
    if (storageMode === 'Object') {
        return (
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-center opacity-70 min-h-[200px]">
                <i className="fas fa-server text-4xl text-slate-300 mb-3"></i>
                <h4 className="font-black text-sm text-slate-500 mt-2">1. Compute Node Bypassed</h4>
                <p className="text-xs font-bold text-slate-400 mt-2 max-w-[250px] leading-relaxed">Targeting Object Storage uses direct API transfers, bypassing OS-level block agents and compute constraints.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-h-[200px]">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-server text-blue-500"></i> 1. Compute Node</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={sourceEncrypted} onChange={e => onParamChange('sourceEncrypted', e.target.checked)} className="w-4 h-4 accent-blue-600"/>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Source Disk Encrypted</span>
                </label>
            </div>
            <div className="space-y-5">
                <div>
                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>CPU Saturation</span><span className="text-blue-700">{computeCPU}%</span></label>
                    <input type="range" min="10" max="99" value={computeCPU} onChange={e => onParamChange('computeCPU', e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"/>
                </div>
                <div>
                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>RAM Saturation</span><span className="text-blue-700">{computeRAM}%</span></label>
                    <input type="range" min="10" max="99" value={computeRAM} onChange={e => onParamChange('computeRAM', e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"/>
                </div>
                <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Operating System</label>
                    <select value={computeOS} onChange={e => onParamChange('computeOS', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50">
                        <option value="Linux">Linux</option>
                        <option value="Windows">Windows</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

function PayloadInputs({ storageSize, storageUnit, storageMode, diskType, targetKMS, totalFiles, smallFiles, syncMethod, onParamChange, onTotalFilesChange, onSmallFilesChange }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-hdd text-blue-500"></i> 2. Target Protocol & Payload</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={targetKMS} onChange={e => onParamChange('targetKMS', e.target.checked)} className="w-4 h-4 accent-blue-600"/>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target KMS Encryption</span>
                </label>
            </div>
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="w-1/2 flex gap-2">
                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Total Size</label><input type="number" value={storageSize} onChange={e => onParamChange('storageSize', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"/></div>
                        <div className="w-16"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Unit</label><select value={storageUnit} onChange={e => onParamChange('storageUnit', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none bg-slate-50"><option value="TB">TB</option><option value="GB">GB</option><option value="MB">MB</option></select></div>
                    </div>
                    <div className="w-1/2">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-rose-700">Target Protocol</label>
                        <select value={storageMode} onChange={e => onParamChange('storageMode', e.target.value)} className="w-full p-3 border-2 border-rose-300 bg-rose-50 text-rose-900 rounded-xl text-xs font-black outline-none"><option value="Block">Block/File (Disk)</option><option value="Object">Object Storage</option></select>
                    </div>
                </div>
                
                <div className="flex gap-4 items-end animate-fade-in border-t border-slate-100 pt-3">
                    <div className="w-1/2">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Total File Count</label>
                        <input type="number" value={totalFiles} onChange={e => onTotalFilesChange(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"/>
                    </div>
                    <div className="w-1/2">
                        <label className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase mb-2 text-amber-700"><span>Of which are Small</span></label>
                        <input type="number" value={smallFiles} onChange={e => onSmallFilesChange(e.target.value)} className="w-full p-3 border-2 border-amber-300 bg-amber-50 text-amber-900 rounded-xl text-sm font-black outline-none focus:border-amber-500 shadow-inner"/>
                    </div>
                </div>

                {storageMode !== 'Object' && (
                    <div className="flex gap-4 pt-1 animate-fade-in">
                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Source Disk</label><select value={diskType} onChange={e => onParamChange('diskType', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"><option value="HDD">HDD</option><option value="SSD">SSD</option><option value="NVMe">NVMe</option></select></div>
                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-purple-700">Agent Sync Mode</label><select value={syncMethod} onChange={e => onParamChange('syncMethod', e.target.value)} className="w-full p-3 border-2 border-purple-300 bg-purple-50 text-purple-900 rounded-xl text-xs font-black outline-none"><option value="Block">Block-Level</option><option value="File">File-Level (Linux)</option></select></div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DatabaseRouting({ excludeDb, dbStorageSize, dbType, dbRowsM, dbRps, storageMode, storageUnit, onParamChange }) {
    if (storageMode === 'Object') {
        return (
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-center opacity-70 min-h-[200px]">
                <i className="fas fa-database text-4xl text-slate-300 mb-3"></i>
                <h4 className="font-black text-sm text-slate-500 mt-2">3. Database Routing Bypassed</h4>
                <p className="text-xs font-bold text-slate-400 mt-2 max-w-[250px] leading-relaxed">Object Storage selected. Databases cannot be natively replicated to Object protocols.</p>
            </div>
        );
    }
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-h-[200px]">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-database text-rose-500"></i> 3. Database Routing</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={excludeDb} onChange={e => onParamChange('excludeDb', e.target.checked)} className="w-4 h-4 accent-rose-600"/>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Split DB Payload</span>
                </label>
            </div>
            {excludeDb ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-[10px] text-rose-800 font-bold leading-relaxed">Excludes DB directories from main payload. Calculates Native DB Logical Replication separately.</div>
                    <div className="flex gap-3">
                        <div className="w-1/3"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">DB Size ({storageUnit})</label><input type="number" value={dbStorageSize} onChange={e => onParamChange('dbStorageSize', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"/></div>
                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Engine</label><select value={dbType} onChange={e => onParamChange('dbType', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-500 bg-white"><option value="HANA">HANA</option><option value="Oracle">Oracle</option><option value="PostgreSQL">PostgreSQL</option><option value="SQL Server">SQL Server</option></select></div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Est. Rows (M)</label><input type="number" value={dbRowsM} onChange={e => onParamChange('dbRowsM', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"/></div>
                        <div className="flex-1"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Sync (Rows/s)</label><input type="number" value={dbRps} onChange={e => onParamChange('dbRps', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"/></div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 opacity-60"><div><i className="fas fa-cubes text-3xl mb-2 text-slate-400"></i><p className="text-xs font-bold">Monolith Sync Active.<br/>DB treated as standard block data.</p></div></div>
            )}
        </div>
    );
}

function NetworkRouting({ storageMode, netSource, transitType, netTunnel, netTarget, omsTasks, omsObjPerSec, omsBackbone, onParamChange }) {
    if (storageMode === 'Object') {
        return (
            <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200 shadow-sm flex flex-col hover:shadow-md transition-shadow min-h-[200px] animate-fade-in">
                <div className="flex justify-between items-center mb-5 border-b border-indigo-100 pb-2"><h4 className="font-black text-sm flex items-center gap-2 text-indigo-900"><i className="fas fa-cloud text-indigo-500"></i> 4. API Object Routing (OMS)</h4></div>
                <div className="space-y-4">
                    <div className="bg-white p-3 rounded-xl border border-indigo-100"><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Parallel Tasks</span><span className="text-indigo-700">{omsTasks}</span></label><input type="range" min="1" max="20" value={omsTasks} onChange={e => onParamChange('omsTasks', e.target.value)} className="w-full h-2 bg-indigo-100 rounded-lg appearance-none accent-indigo-600 cursor-pointer"/></div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-100"><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Objects / Sec (API Limit)</span><span className="text-indigo-700">{omsObjPerSec}</span></label><input type="range" min="10" max="500" value={omsObjPerSec} onChange={e => onParamChange('omsObjPerSec', e.target.value)} className="w-full h-2 bg-indigo-100 rounded-lg appearance-none accent-indigo-600 cursor-pointer"/></div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-100"><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Cloud Backbone (Gbps)</span><span className="text-indigo-700">{omsBackbone}</span></label><input type="range" min="1" max="100" value={omsBackbone} onChange={e => onParamChange('omsBackbone', e.target.value)} className="w-full h-2 bg-indigo-100 rounded-lg appearance-none accent-indigo-600 cursor-pointer"/></div>
                </div>
            </div>
        );
    }
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-h-[200px]">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2"><h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-network-wired text-purple-500"></i> 4. Network Routing</h4></div>
            <div className="space-y-5">
                <div><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Source Firewall Limit (Mbps)</span><span className="text-purple-700">{netSource}</span></label><input type="range" min="10" max="10000" step="10" value={netSource} onChange={e => onParamChange('netSource', e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-purple-600 cursor-pointer"/></div>
                <div className="flex gap-4">
                    <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Transit Type</label><select value={transitType} onChange={e => onParamChange('transitType', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-purple-500 bg-slate-50"><option value="DirectConnect">Direct Connect (DC)</option><option value="IPsec VPN">IPsec VPN</option><option value="Public Internet">Public Internet</option></select></div>
                    <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Tunnel Limit (Mbps)</label><input type="number" value={netTunnel} onChange={e => onParamChange('netTunnel', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-purple-500 bg-slate-50"/></div>
                </div>
                <div><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Target VPC Ingress (Mbps)</span><span className="text-purple-700">{netTarget}</span></label><input type="range" min="100" max="10000" step="100" value={netTarget} onChange={e => onParamChange('netTarget', e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-purple-600 cursor-pointer"/></div>
            </div>
        </div>
    );
}

function SLASection({ drBackupHrs, drStability, downtimeWindow, onParamChange }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-h-[200px]">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2"><h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-file-contract text-emerald-500"></i> 5. SLA & Contract Baseline</h4></div>
            <div className="space-y-5">
                <div className="flex gap-4">
                    <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Pre-Migration Backup (Hrs)</label><input type="number" value={drBackupHrs} onChange={e => onParamChange('drBackupHrs', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 bg-slate-50"/></div>
                    <div className="w-1/2"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Source Stability Risk</label><select value={drStability} onChange={e => onParamChange('drStability', e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 bg-slate-50"><option value="High">Stable (High)</option><option value="Medium">Moderate (Medium)</option><option value="Low">Unstable (Low)</option></select></div>
                </div>
                <div className="pt-2 border-t border-slate-100"><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700"><span>Mandated Max Downtime (SLA Window)</span><span className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 border border-emerald-200">{downtimeWindow} Hours</span></label><input type="range" min="1" max="168" value={downtimeWindow} onChange={e => onParamChange('downtimeWindow', e.target.value)} className="w-full h-2 bg-emerald-100 rounded-lg appearance-none accent-emerald-600 cursor-pointer"/></div>
            </div>
        </div>
    );
}

function PhysicsResults({ results, downtimeWindow, storageUnit, smallFilePct }) {
    return (
        <div className="xl:col-span-4 bg-slate-900 rounded-2xl shadow-xl border border-slate-700 flex flex-col text-white sticky top-24 max-h-[800px] overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center"><h3 className="font-black text-lg tracking-wide"><i className="fas fa-terminal text-blue-400 mr-2"></i> Output Engine</h3><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${results.isFeasible ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'}`}>{results.isFeasible ? 'SLA Feasible' : 'SLA Breach Risk'}</span></div>
            <div className="p-6 bg-slate-800 border-b border-slate-700">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Calculated E2E Migration Time</div>
                <div className="flex items-baseline gap-3"><span className={`text-6xl font-black ${results.isFeasible ? 'text-emerald-400' : 'text-rose-500'}`}>{results.totalHours}</span><span className="text-xl font-bold text-slate-500">hours</span></div>
                <div className="text-sm font-bold text-slate-400 mt-2">({results.daysStr})</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-700 pb-2">Performance Metrics</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"><div className="text-[9px] uppercase text-slate-400 font-bold mb-1">Effective Speed</div><div className="text-lg font-black text-blue-400">{results.actualMbps} <span className="text-[10px] text-slate-500 font-bold">Mbps</span></div><div className="text-xs text-slate-400 mt-1 font-mono">({results.actualMBps} MB/s)</div></div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"><div className="text-[9px] uppercase text-slate-400 font-bold mb-1">Total Payload</div><div className="text-lg font-black text-purple-400">{results.osPayloadTB} <span className="text-[10px] text-slate-500 font-bold">{storageUnit}</span></div><div className="text-xs text-rose-400 mt-1">{smallFilePct}% Small Files</div></div>
                    </div>
                </div>
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-700 pb-2">Execution Breakdown</div>
                    <div className="space-y-3">
                        <div
