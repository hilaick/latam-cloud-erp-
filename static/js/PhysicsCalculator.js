// Pure calculation logic for Physics Engine - no JSX, no React dependencies
function calculatePhysics(params) {
    const {
        computeCPU,
        computeRAM,
        computeOS,
        sourceEncrypted,
        storageSize,
        storageUnit,
        storageMode,
        diskType,
        targetKMS,
        totalFiles,
        smallFiles,
        syncMethod,
        excludeDb,
        dbStorageSize,
        dbType,
        dbRowsM,
        dbRps,
        netSource,
        transitType,
        netTunnel,
        netTarget,
        omsTasks,
        omsObjPerSec,
        omsBackbone,
        drBackupHrs,
        drStability,
        downtimeWindow
    } = params;

    // Normalize Storage to TB for math
    const unitMultiplier = storageUnit === 'TB' ? 1 : (storageUnit === 'GB' ? 1/1024 : 1/1048576);
    const normalizedStorageTB = Number(storageSize) * unitMultiplier;
    const normalizedDbTB = Number(dbStorageSize) * unitMultiplier;

    const validTotalFiles = Math.max(Number(totalFiles) || 1, 1);
    const validSmallFiles = Math.min(Number(smallFiles) || 0, validTotalFiles);
    const smallFileRatio = validSmallFiles / validTotalFiles;

    let speedMultiplier = 1.0; 
    let cpuWarn = ""; 
    let ioWarn = ""; 
    let dbWarn = ""; 
    let netWarn = ""; 
    let riskWarn = "Stable Infra";
    let finalBottleneck = 1000;
    let actualTransferMbps = 0;
    let osSyncHours = 0;
    let osPayloadTB = 0;

    // ==========================================
    // 🚀 TRACK A: OBJECT STORAGE (OMS APIs)
    // ==========================================
    if (storageMode === 'Object') {
        const tasks = Number(omsTasks) || 1;
        const ops = Number(omsObjPerSec) || 1;
        const backboneMbps = (Number(omsBackbone) || 16) * 1000; // Gbps to Mbps
        finalBottleneck = backboneMbps;

        // API Track (Small Files) -> Bounded by Concurrency & Objects/sec
        const smallFileHours = validSmallFiles / (tasks * ops) / 3600;
        
        // Bandwidth Track (Large Files) -> Bounded by Backbone Peak
        osPayloadTB = excludeDb ? Math.max(0, normalizedStorageTB - normalizedDbTB) : normalizedStorageTB;
        // Rough estimate: small files average 10KB each. Subtract from payload.
        const smallFilesTB = (validSmallFiles * 10) / (1024 * 1024 * 1024);
        const largePayloadTB = Math.max(0, osPayloadTB - smallFilesTB);
        
        // Large files use the huge backbone, subject to KMS tax
        let backboneMultiplier = 0.9; // 10% standard REST overhead
        if (targetKMS) backboneMultiplier *= 0.9;
        const effectiveBackboneMbps = backboneMbps * backboneMultiplier;
        const largeFileHours = (((largePayloadTB * 1024 * 1024 * 8) / effectiveBackboneMbps) / 3600);

        // Total time is API time + Backbone time
        osSyncHours = smallFileHours + largeFileHours;
        
        // Calculate "Effective" Mbps based on total time vs payload
        actualTransferMbps = osSyncHours > 0 ? ((osPayloadTB * 1024 * 1024 * 8) / (osSyncHours * 3600)) : effectiveBackboneMbps;

        // Warnings
        if (smallFileHours > largeFileHours) {
            ioWarn = `CRIT: Migration is API-Bound. ${validSmallFiles.toLocaleString()} small files took ${smallFileHours.toFixed(1)}h. Large files took ${largeFileHours.toFixed(1)}h. `;
        } else {
            ioWarn = `INFO: Migration is Bandwidth-Bound over Cloud Backbone. `;
        }
        if (targetKMS) ioWarn += "KMS API Tax applied. ";
        netWarn = "INFO: Serverless OMS active. Transit routes (VPN/DC) bypassed.";
    } else {
        // ==========================================
        // 🖥️ TRACK B: STANDARD OS AGENT (Block/File)
        // ==========================================
        const bottleneckMbps = Math.min(
            Number(netSource) || Infinity, 
            Number(netTunnel) || Infinity, 
            Number(netTarget) || Infinity
        );
        finalBottleneck = bottleneckMbps === Infinity ? 1000 : bottleneckMbps;

        if (transitType === 'IPsec VPN') { 
            speedMultiplier *= 0.85; 
            netWarn = "IPsec Encryption Tax (15%). "; 
        } else if (transitType === 'Public Internet') { 
            speedMultiplier *= 0.75; 
            netWarn = "Internet TCP Retransmit/Latency Tax (25%). "; 
        } else { 
            speedMultiplier *= 0.95; 
            netWarn = "Standard TCP Header Tax (5%). "; 
        }

        let simulatedCpu = Number(computeCPU) + (sourceEncrypted ? 15 : 0);
        const highestComputeLoad = Math.max(simulatedCpu, Number(computeRAM));
        if (highestComputeLoad >= 85) { 
            speedMultiplier *= 0.4; 
            cpuWarn = "CRIT Compute: Source node >85% saturation. Agent severely throttled."; 
        } else if (highestComputeLoad >= 75) { 
            speedMultiplier *= 0.7; 
            cpuWarn = "WARN Compute: Source node >75% saturation. Minor throttling applied."; 
        }

        let diskLimitMbps = 1000; 
        if (diskType === 'SSD') diskLimitMbps = 4000; 
        if (diskType === 'NVMe') diskLimitMbps = 24000;
        finalBottleneck = Math.min(finalBottleneck, diskLimitMbps);

        if (targetKMS) { 
            speedMultiplier *= 0.95; 
            ioWarn += "Target Block KMS Encryption Tax (5%). "; 
        }

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

    // ==========================================
    // 🧮 AGGREGATIONS & LOGICAL DB SYNC
    // ==========================================
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
    
    let riskMultiplier = 1.0;
    if (drStability === 'Medium') { 
        riskMultiplier = 1.3; 
        riskWarn = "Risk (+30% Stability Buffer)"; 
    } else if (drStability === 'Low') { 
        riskMultiplier = 1.6; 
        riskWarn = "Risk (+60% Stability Buffer)"; 
    }

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
        cpuWarn, 
        ioWarn, 
        dbWarn, 
        netWarn, 
        riskWarn, 
        controllingPath,
        isFeasible: totalHours <= (Number(downtimeWindow) || 0),
        smallFilePct: Math.round(smallFileRatio * 100),
        rawExecutionHours,
        riskMultiplier,
        smallFileHours: validSmallFiles > 0 ? validSmallFiles : 0,
        largePayloadTB: storageMode === 'Object' ? Math.max(0, osPayloadTB - ((validSmallFiles * 10) / (1024 * 1024 * 1024))) : 0
   
}