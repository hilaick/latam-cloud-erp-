import React, { useState, useEffect, useMemo } from 'react';

// --- Pure Calculation Logic ---
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
            ioWarn = `CRIT: API-Bound. ${validSmallFiles.toLocaleString()} small files took ${smallFileHours.toFixed(1)}h. `;
        } else {
            ioWarn = `INFO: Bandwidth-Bound. `;
        }
    } else {
        const bottleneckMbps = Math.min(Number(netSource) || Infinity, Number(netTunnel) || Infinity, Number(netTarget) || Infinity);
        finalBottleneck = bottleneckMbps === Infinity ? 1000 : bottleneckMbps;

        if (transitType === 'IPsec VPN') speedMultiplier *= 0.85; 
        else if (transitType === 'Public Internet') speedMultiplier *= 0.75; 
        else speedMultiplier *= 0.95;

        let simulatedCpu = Number(computeCPU) + (sourceEncrypted ? 15 : 0);
        const highestComputeLoad = Math.max(simulatedCpu, Number(computeRAM));
        if (highestComputeLoad >= 85) { speedMultiplier *= 0.4; cpuWarn = "CRIT Compute: Source node >85%."; } 
        else if (highestComputeLoad >= 75) { speedMultiplier *= 0.7; cpuWarn = "WARN Compute: Source node >75%."; }

        let diskLimitMbps = diskType === 'SSD' ? 4000 : (diskType === 'NVMe' ? 24000 : 1000);
        finalBottleneck = Math.min(finalBottleneck, diskLimitMbps);

        if (targetKMS) speedMultiplier *= 0.95;

        if (syncMethod === 'Block') {
            speedMultiplier *= 1.35; 
        } else if (syncMethod === 'File' && validSmallFiles > 100000) { 
            let volumePenalty = validSmallFiles / 2000000;
            let filePenalty = Math.max(0.20, 1 - (volumePenalty * (0.5 + (smallFileRatio * 0.5)))); 
            speedMultiplier *= filePenalty;
            ioWarn += `CRIT I/O: File-Level sync of small files penalizes network. `; 
        }

        actualTransferMbps = finalBottleneck * speedMultiplier;
        osPayloadTB = excludeDb ? Math.max(0, normalizedStorageTB - normalizedDbTB) : normalizedStorageTB;
        osSyncHours = (((osPayloadTB * 1024 * 1024 * 8) / (actualTransferMbps || 1)) / 3600); 
    }

    const dbTotalRows = Number(dbRowsM) * 1000000;
    let effectiveRps = Number(dbRps) || 1;
    if (dbType === 'Oracle' || dbType === 'HANA') effectiveRps *= 0.8; 
    const dbSyncHours = (excludeDb && storageMode !== 'Object') ? (dbTotalRows / effectiveRps) / 3600 : 0;

    const rawExecutionHours = Math.max(osSyncHours, dbSyncHours);
    let riskMultiplier = drStability === 'Medium' ? 1.3 : (drStability === 'Low' ? 1.6 : 1.0);
    const totalHours = (rawExecutionHours + (Number(drBackupHrs) || 0)) * riskMultiplier;

    return { 
        totalHours: totalHours.toFixed(1),
        isFeasible: totalHours <= (Number(downtimeWindow) || 0),
        osSyncHours: osSyncHours.toFixed(1), 
        dbSyncHours: dbSyncHours.toFixed(1),
        actualMbps: actualTransferMbps.toFixed(1),
        cpuWarn, ioWarn, dbWarn, netWarn,
        smallFilePct: Math.round(smallFileRatio * 100)
    };
}

// --- Simplified Input Components ---

function ComputeNode({ computeCPU, computeRAM, sourceEncrypted, onParamChange }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-sm mb-2"><i className="fas fa-server text-blue-500 mr-2"></i> Compute</h4>
            <div className="space-y-2 text-xs">
                <div>
                    <label className="flex justify-between">CPU <span className="text-blue-600">{computeCPU}%</span></label>
                    <input type="range" min="10" max="99" value={computeCPU} onChange={e => onParamChange('computeCPU', e.target.value)} className="w-full" />
                </div>
                <div>
                    <label className="flex justify-between">RAM <span className="text-blue-600">{computeRAM}%</span></label>
                    <input type="range" min="10" max="99" value={computeRAM} onChange={e => onParamChange('computeRAM', e.target.value)} className="w-full" />
                </div>
                <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={sourceEncrypted} onChange={e => onParamChange('sourceEncrypted', e.target.checked)} /> Source Encrypted
                </label>
            </div>
        </div>
    );
}

function PayloadInputs({ storageSize, storageMode, totalFiles, smallFiles, onParamChange, onTotalFilesChange, onSmallFilesChange }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-sm mb-2"><i className="fas fa-hdd text-blue-500 mr-2"></i> Payload</h4>
            <div className="space-y-2 text-xs">
                <div className="flex gap-2">
                    <div className="flex-1"><label>Size (TB)</label><input type="number" value={storageSize} onChange={e => onParamChange('storageSize', e.target.value)} className="w-full border p-1 rounded" /></div>
                    <div className="flex-1"><label>Protocol</label><select value={storageMode} onChange={e => onParamChange('storageMode', e.target.value)} className="w-full border p-1 rounded"><option value="Block">Block</option><option value="Object">Object</option></select></div>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1"><label>Total Files</label><input type="number" value={totalFiles} onChange={e => onTotalFilesChange(e.target.value)} className="w-full border p-1 rounded" /></div>
                    <div className="flex-1"><label>Small Files</label><input type="number" value={smallFiles} onChange={e => onSmallFilesChange(e.target.value)} className="w-full border p-1 rounded" /></div>
                </div>
            </div>
        </div>
    );
}

function SLASection({ downtimeWindow, onParamChange }) {
     return (
        <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-sm mb-2"><i className="fas fa-clock text-amber-500 mr-2"></i> SLA</h4>
            <div className="text-xs">
                 <label>Max Downtime Window (Hours)</label>
                 <input type="number" value={downtimeWindow} onChange={e => onParamChange('downtimeWindow', e.target.value)} className="w-full border p-1 rounded mt-1" />
            </div>
        </div>
     );
}

// --- Simplified Results Component ---
function PhysicsResults({ results, downtimeWindow }) {
    return (
        <div className={`p-6 rounded-2xl text-white ${results.isFeasible ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            <h3 className="font-black text-xl mb-2">Estimated Timeline</h3>
            <div className="text-4xl font-black mb-4">{results.totalHours} Hours</div>
            <div className="text-sm font-bold mb-4">Required Window: {downtimeWindow}h</div>
            <div className="space-y-2 text-xs bg-black/20 p-4 rounded-xl font-mono">
                <div>OS Sync: {results.osSyncHours}h</div>
                <div>DB Sync: {results.dbSyncHours}h</div>
                <div>Transfer: {results.actualMbps} Mbps</div>
                {results.cpuWarn && <div className="text-rose-200">{results.cpuWarn}</div>}
                {results.ioWarn && <div className="text-amber-200">{results.ioWarn}</div>}
            </div>
        </div>
    );
}

// --- Main Export ---
export default function PhysicsEngine({ project, onUpdateProject }) {
    const [computeCPU, setComputeCPU] = useState(60); 
    const [computeRAM, setComputeRAM] = useState(60);
    const [sourceEncrypted, setSourceEncrypted] = useState(false);
    const [storageSize, setStorageSize] = useState(5.0); 
    const [storageMode, setStorageMode] = useState('Block');
    const [totalFiles, setTotalFiles] = useState(103000000); 
    const [smallFiles, setSmallFiles] = useState(90000000); 
    const [downtimeWindow, setDowntimeWindow] = useState(48);

    useEffect(() => {
        if (project?.physics) {
            const p = project.physics;
            setComputeCPU(p.computeCPU||60); setComputeRAM(p.computeRAM||60); setSourceEncrypted(p.sourceEncrypted||false);
            setStorageMode(p.storageMode||'Block'); setStorageSize(p.storageSize||5.0); 
            setTotalFiles(p.totalFiles||103000000); setSmallFiles(p.smallFiles||90000000); 
            setDowntimeWindow(p.downtimeWindow||48);
        }
    }, [project]);

    const handleParamChange = (param, value) => {
        const setters = { computeCPU: setComputeCPU, computeRAM: setComputeRAM, sourceEncrypted: setSourceEncrypted, storageSize: setStorageSize, storageMode: setStorageMode, downtimeWindow: setDowntimeWindow };
        if (setters[param]) setters[param](value);
    };

    const results = useMemo(() => calculatePhysics({
            computeCPU, computeRAM, sourceEncrypted, storageSize, storageUnit: 'TB', storageMode, diskType: 'SSD', targetKMS: false,
            totalFiles, smallFiles, syncMethod: 'Block', excludeDb: false, dbStorageSize: 0, dbType: 'PostgreSQL', dbRowsM: 0, dbRps: 0,
            netSource: 1000, transitType: 'DirectConnect', netTunnel: 300, netTarget: 1000, omsTasks: 5, omsObjPerSec: 120, omsBackbone: 16,
            drBackupHrs: 4, drStability: 'High', downtimeWindow
    }), [computeCPU, computeRAM, sourceEncrypted, storageSize, storageMode, totalFiles, smallFiles, downtimeWindow]);

    const saveContext = () => { 
        onUpdateProject(project.id, 'physics', { computeCPU, computeRAM, sourceEncrypted, storageMode, storageSize, totalFiles, smallFiles, downtimeWindow });
        alert("Physics Engine parameters saved to project context."); 
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="font-black text-lg text-slate-800"><i className="fas fa-microscope text-rose-500 mr-2"></i> Delivery Physics</h3>
                <button onClick={saveContext} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md">Save Physics</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <ComputeNode computeCPU={computeCPU} computeRAM={computeRAM} sourceEncrypted={sourceEncrypted} onParamChange={handleParamChange} />
                    <PayloadInputs storageSize={storageSize} storageMode={storageMode} totalFiles={totalFiles} smallFiles={smallFiles} onParamChange={handleParamChange} onTotalFilesChange={setTotalFiles} onSmallFilesChange={setSmallFiles} />
                    <SLASection downtimeWindow={downtimeWindow} onParamChange={handleParamChange} />
                </div>
                <PhysicsResults results={results} downtimeWindow={downtimeWindow} />
            </div>
        </div>
    );
}
