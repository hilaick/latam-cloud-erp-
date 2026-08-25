/**
 * physicsMath.js — Delivery Physics Engine calculation helpers
 * 
 * Provides structured output generation, confidence scoring,
 * wave packing, and cost overlay for the Physics Engine (step 3.3).
 * All functions are pure — no side effects, no state.
 */

// ─── Constants ────────────────────────────────────────────────────────

/** Tax multipliers per transit type */
const CRYPTO_TAX = {
    'DirectConnect': 0.95,
    'IPsec VPN': 0.85,
    'Public Internet': 0.75,
    'default': 0.85
};

const TCP_OVERHEAD = 0.95;

/** Cost rates (USD) for estimation */
const COST_RATES = {
    egressPerGB: {
        'DirectConnect': 0.02,
        'IPsec VPN': 0.0,       // no egress over VPN
        'Public Internet': 0.09,
        'cross_region': 0.02,
        'cross_cloud': 0.09,
        'default': 0.05
    },
    smsAgentPerHour: 0.15,      // SMS agent hourly cost per node
    drsTaskPerHour: 0.25,       // DRS task hourly cost
    omsApiPerThousandObj: 0.01, // OMS API cost per 1000 objects
    overheadFlat: 50.00         // Minimum overhead per migration (setup, teardown)
};

/** Compute type keywords — broader matching for confidence scoring */
const COMPUTE_KEYWORDS = [
    'ecs', 'ec2', 'vm', 'virtual', 'compute', 'instance', 'server',
    'elastic', 'c6', 'c7', 'm6', 'm7', 't3', 't4', 's6', 's7',
    'h2', 'd2', 'i3', 'g5', 'app', 'web', 'frontend', 'middleware',
    'application', 'linux', 'windows', 'centos', 'ubuntu', 'rhel',
    'suse', 'debian', 'coreos'
];

const DATABASE_KEYWORDS = [
    'rds', 'aurora', 'database', 'db', 'sql', 'mysql', 'postgres',
    'postgresql', 'oracle', 'mssql', 'sqlserver', 'mongodb', 'redis',
    'elasticache', 'dynamodb', 'cassandra', 'mariadb', 'gaussdb',
    'taurus', 'ddm', 'dds', 'drs'
];

const STORAGE_KEYWORDS = [
    's3', 'obs', 'blob', 'bucket', 'storage', 'nas', 'nfs', 'efs',
    'fileshare', 'files', 'archive', 'backup', 'glacier', 'volume',
    'disk', 'san', 'object'
];

const FILE_HEAVY_WORDS = ['file', 'media', 'image', 'video', 'document', 'log', 'archive', 'backup'];

// ─── Classification with Confidence ───────────────────────────────────

/**
 * Classify a node into compute/database/storage with confidence score [0-1].
 * Returns { pillar, confidence, isFileHeavy, recommendedTool, syncMethod }
 */
export function classifyNodeWithConfidence(node) {
    const name = (node.name || node.label || node.id || '').toLowerCase();
    const type = (node.type || node.category || '').toLowerCase();
    const os   = (node.os || node.operatingSystem || '').toLowerCase();
    const combined = `${name} ${type} ${os}`;

    // Count keyword matches per pillar
    const computeHits  = COMPUTE_KEYWORDS.filter(kw => combined.includes(kw)).length;
    const databaseHits = DATABASE_KEYWORDS.filter(kw => combined.includes(kw)).length;
    const storageHits  = STORAGE_KEYWORDS.filter(kw => combined.includes(kw)).length;

    const totalHits = computeHits + databaseHits + storageHits;

    // If nothing matches, default to compute with low confidence
    if (totalHits === 0) {
        return {
            pillar: 'compute',
            confidence: 0.3,
            isFileHeavy: false,
            recommendedTool: 'SMS',
            syncMethod: 'Block'
        };
    }

    // Compute confidence as proportion of total hits
    const computeConf  = computeHits / totalHits;
    const databaseConf = databaseHits / totalHits;
    const storageConf  = storageHits / totalHits;

    // Determine pillar
    let pillar, confidence;
    if (databaseConf > computeConf && databaseConf >= storageConf) {
        pillar = 'database';
        confidence = databaseConf;
    } else if (storageConf > computeConf && storageConf > databaseConf) {
        pillar = 'storage';
        confidence = storageConf;
    } else {
        pillar = 'compute';
        confidence = computeConf;
    }

    // If tie or ambiguous, reduce confidence
    const sorted = [computeConf, databaseConf, storageConf].sort((a, b) => b - a);
    if (sorted[0] - sorted[1] < 0.15) {
        confidence = Math.max(0.4, confidence - 0.2);
    }

    // File-heavy detection
    const fileHeavyHits = FILE_HEAVY_WORDS.filter(kw => combined.includes(kw)).length;
    const isFileHeavy = fileHeavyHits > 0;

    // Tool and sync method
    let recommendedTool, syncMethod;
    switch (pillar) {
        case 'compute':
            recommendedTool = 'SMS';
            syncMethod = isFileHeavy ? 'File' : 'Block';
            break;
        case 'database':
            recommendedTool = 'DRS';
            syncMethod = 'Logical';
            break;
        case 'storage':
            recommendedTool = 'OMS';
            syncMethod = 'API Sync';
            break;
        default:
            recommendedTool = 'Unknown';
            syncMethod = 'Block';
    }

    return { pillar, confidence, isFileHeavy, recommendedTool, syncMethod };
}

// ─── Structured Result Generator ──────────────────────────────────────

/**
 * Generate the machine-readable physics.result object from engine state.
 * This is what gets embedded in the ExecutionPlan contract.
 *
 * @param {Object} params
 * @param {string} params.engineMode  — 'cognitive' | 'manual'
 * @param {Object} params.cogResult   — cognitive mode calculation result
 * @param {Object} params.manResult   — manual mode calculation result
 * @param {Object} params.nodeConfigs — { [nodeId]: { ...perNodeConfig } }
 * @param {Array}  params.nodes       — mapperNodes from project
 * @param {Object} params.sharedState — network, concurrency, downtime config
 * @returns {Object} structured physics result
 */
export function generateStructuredResult({ engineMode, cogResult, manResult, nodeConfigs, nodes, sharedState }) {
    const now = new Date().toISOString();

    // Per-node classification with confidence
    const perNode = {};
    const pillarBuckets = { compute: [], database: [], storage: [] };
    let classificationWarnings = [];

    nodes.forEach(n => {
        const conf = nodeConfigs[n.id] || {};
        const classification = classifyNodeWithConfidence(n);

        const nodeResult = {
            name: n.name || n.label || n.id,
            nodeId: n.id,
            pillar: classification.pillar,
            classificationConfidence: classification.confidence,
            recommendedTool: classification.recommendedTool,
            syncMethod: classification.syncMethod,
            isFileHeavy: classification.isFileHeavy,
            includedInMath: conf.includedInMath !== false,
            // Payload estimates — match actual field names used in nodeConfigs
            payloadGB: conf.dataSizeGB || conf.customSizeGB || conf.storageGB || conf.payloadGB || Number(n.storage) || 0,
            churnGB: conf.churnGB || ((conf.dataSizeGB || conf.customSizeGB || conf.storageGB || conf.payloadGB || Number(n.storage) || 0) * 0.02),
            smallFiles: conf.smallFiles || 0,
            // DB-specific
            rowsM: conf.rowsM || 0,
            rps: conf.rps || 0,
            // OS info
            os: conf.os || n.os || 'linux',
            // Estimated time based on pillar
            estimatedSyncHours: conf.estimatedHours || 0
        };

        perNode[n.id] = nodeResult;
        if (classification.pillar) {
            pillarBuckets[classification.pillar].push(nodeResult);
        }
        if (classification.confidence < 0.6) {
            classificationWarnings.push(
                `Low confidence classification for "${nodeResult.name}" (${Math.round(classification.confidence * 100)}% — ${classification.pillar}). Manual review recommended.`
            );
        }
    });

    // Pillar summaries
    const pillars = {};
    ['compute', 'database', 'storage'].forEach(pillar => {
        const bucket = pillarBuckets[pillar];
        if (bucket.length === 0) return;
        const included = bucket.filter(n => n.includedInMath);
        pillars[pillar] = {
            tool: bucket[0].recommendedTool,
            nodeCount: bucket.length,
            includedCount: included.length,
            totalPayloadGB: included.reduce((s, n) => s + (n.payloadGB || 0), 0),
            totalChurnGB: included.reduce((s, n) => s + (n.churnGB || 0), 0),
            totalRowsM: included.reduce((s, n) => s + (n.rowsM || 0), 0),
            fileHeavyNodes: bucket.filter(n => n.isFileHeavy).length,
            lowConfidenceNodes: bucket.filter(n => n.classificationConfidence < 0.6).length
        };
    });

    // Pipeline config
    const transitType = sharedState.transitType || 'IPsec VPN';
    const cryptoTax = CRYPTO_TAX[transitType] || CRYPTO_TAX.default;
    const effectiveMbps = engineMode === 'cognitive'
        ? (cogResult?.effectiveMbps || 0)
        : (manResult?.effectivePipeMbps || 0);

    const pipeline = {
        effectiveMbps: effectiveMbps,
        cryptoTax: cryptoTax,
        tcpOverhead: TCP_OVERHEAD,
        transitType: transitType,
        sourceBandwidthMbps: sharedState.netSource || 0
    };

    // Concurrency
    const maxParallel = sharedState.concurrency || 1;
    const concurrency = {
        maxParallelNodes: maxParallel,
        perNodeMbps: maxParallel > 0 ? effectiveMbps / maxParallel : 0
    };

    // Execution timeline from cognitive/manual results
    const result = engineMode === 'cognitive' ? cogResult : manResult;
    const executionTimeline = {
        phase1InitialSyncDays: engineMode === 'cognitive' ? (result?.phase1Days || 0) : null,
        phase2CutoverHours: engineMode === 'cognitive' ? (result?.phase2Hrs || 0) : null,
        totalExecutionHours: engineMode === 'manual' ? (result?.daysHrs || 0) : null,
        overheadHours: 1.5,
        totalCutoverHours: engineMode === 'cognitive'
            ? ((result?.phase2Hrs || 0) + 1.5)
            : null,
        bottleneck: result?.bottleneck || result?.criticalBottleneck || 'Unknown',
        slaWindowHours: sharedState.downtimeWindow || 0,
        isFeasible: result?.isFeasible === true
    };

    // Wave packing (if enough data)
    const recommendedWaves = generateWavePacking({
        nodes: nodes.filter(n => (nodeConfigs[n.id] || {}).includedInMath !== false),
        nodeConfigs,
        maxParallel,
        effectiveMbps,
        perNode
    });

    // Cost overlay
    const costEstimate = estimateCosts({
        pillars,
        perNode,
        executionTimeline,
        transitType,
        maxParallel
    });

    // Recommendations
    const recommendations = {
        warnings: [
            ...classificationWarnings,
            ...(!executionTimeline.isFeasible
                ? [`SLA violation: bottleneck (${executionTimeline.bottleneck}) exceeds ${executionTimeline.slaWindowHours}h downtime window.`]
                : []),
            ...((pillars.compute?.fileHeavyNodes || 0) > 0
                ? [`${pillars.compute.fileHeavyNodes} file-heavy compute nodes detected — may incur small-files performance penalty.`]
                : []),
            ...((pillars.database?.lowConfidenceNodes || 0) > 0
                ? [`${pillars.database.lowConfidenceNodes} database nodes have low classification confidence — verify before DRS configuration.`]
                : [])
        ],
        actions: [
            ...(executionTimeline.isFeasible
                ? []
                : [`Increase pipeline bandwidth beyond ${pipeline.sourceBandwidthMbps} Mbps or reduce concurrency to decrease congestion.`]),
            ...((maxParallel < 8 && effectiveMbps > 100)
                ? [`Consider increasing concurrency from ${maxParallel} to ${Math.min(8, Math.floor(effectiveMbps / 25))} to reduce total sync time by ~${Math.round((1 - 1/Math.min(2, maxParallel+1)) * 100)}%.`]
                : []),
            ...(pillars.database && pillars.database.nodeCount > 0
                ? ['Schedule database cutover during low-transaction window to maximize DRS throughput.']
                : []),
            ...(recommendedWaves.length > 1
                ? [`Recommended wave execution: ${recommendedWaves.length} waves identified. Wave 1 contains ${recommendedWaves[0]?.nodeCount || 0} nodes (~${recommendedWaves[0]?.estimatedDays || 0} days).`]
                : [])
        ]
    };

    return {
        calculatedAt: now,
        engineMode,
        pipeline,
        concurrency,
        pillars,
        perNode,
        executionTimeline,
        recommendedWaves,
        costEstimate,
        recommendations
    };
}

// ─── Wave Packing ─────────────────────────────────────────────────────

/**
 * Pack nodes into optimal execution waves based on concurrency and pipe capacity.
 * Simple greedy algorithm: pack largest payloads first, respect concurrency limit.
 *
 * @returns {Array<{wave: number, nodeCount: number, nodes: string[], totalPayloadGB: number, estimatedDays: number}>}
 */
export function generateWavePacking({ nodes, nodeConfigs, maxParallel, effectiveMbps, perNode }) {
    if (!nodes || nodes.length === 0) return [];
    if (maxParallel <= 0) maxParallel = 1;
    if (effectiveMbps <= 0) effectiveMbps = 100;

    // Sort nodes by payload descending (largest first)
    const sorted = [...nodes].sort((a, b) => {
        const aGB = (nodeConfigs[a.id] || {}).customSizeGB || (nodeConfigs[a.id] || {}).storageGB || 0;
        const bGB = (nodeConfigs[b.id] || {}).customSizeGB || (nodeConfigs[b.id] || {}).storageGB || 0;
        return bGB - aGB;
    });

    const waves = [];
    let currentWave = { wave: 1, nodeCount: 0, nodes: [], totalPayloadGB: 0, estimatedDays: 0 };

    sorted.forEach(node => {
        if (currentWave.nodeCount >= maxParallel) {
            // Finalize current wave
            currentWave.estimatedDays = estimateWaveDays(currentWave.totalPayloadGB, effectiveMbps);
            waves.push({ ...currentWave });
            currentWave = {
                wave: waves.length + 1,
                nodeCount: 0,
                nodes: [],
                totalPayloadGB: 0,
                estimatedDays: 0
            };
        }

        const nodeInfo = perNode[node.id] || {};
        const payloadGB = nodeInfo.payloadGB || 0;
        currentWave.nodes.push(nodeInfo.name || node.id);
        currentWave.nodeCount++;
        currentWave.totalPayloadGB += payloadGB;
    });

    // Don't forget the last wave (even if not full)
    if (currentWave.nodeCount > 0) {
        currentWave.estimatedDays = estimateWaveDays(currentWave.totalPayloadGB, effectiveMbps);
        waves.push({ ...currentWave });
    }

    return waves;
}

/**
 * Estimate days to sync a wave's payload over the given pipe.
 * Mbps → MB/s = Mbps / 8, GB → MB = × 1024
 */
function estimateWaveDays(totalGB, effectiveMbps) {
    if (!totalGB || !effectiveMbps) return 0;
    const MBps = effectiveMbps / 8;
    const totalMB = totalGB * 1024;
    const seconds = totalMB / MBps;
    return Math.round((seconds / 3600 / 24) * 10) / 10;
}

// ─── Cost Estimation ──────────────────────────────────────────────────

/**
 * Estimate migration costs based on physics parameters.
 * @returns {Object} cost breakdown
 */
export function estimateCosts({ pillars, perNode, executionTimeline, transitType, maxParallel }) {
    const egressRate = COST_RATES.egressPerGB[transitType] || COST_RATES.egressPerGB.default;

    // Total payload across all pillars
    let totalPayloadGB = 0;
    let computeCount = 0;
    let databaseCount = 0;
    let storageCount = 0;
    let totalSmallFiles = 0;
    let totalRowsM = 0;

    Object.values(pillars).forEach(p => {
        totalPayloadGB += (p.totalPayloadGB || 0);
        if (p.tool === 'SMS') computeCount += (p.includedCount || p.nodeCount || 0);
        if (p.tool === 'DRS') databaseCount += (p.includedCount || p.nodeCount || 0);
        if (p.tool === 'OMS') storageCount += (p.includedCount || p.nodeCount || 0);
    });

    // Sum per-node details
    Object.values(perNode).forEach(n => {
        totalSmallFiles += (n.smallFiles || 0);
        totalRowsM += (n.rowsM || 0);
    });

    // Egress cost
    const egressCost = totalPayloadGB * egressRate;

    // Agent costs
    const syncDays = executionTimeline.phase1InitialSyncDays || 0;
    const smsAgentCost = computeCount * COST_RATES.smsAgentPerHour * syncDays * 24;
    const drsTaskCost = databaseCount * COST_RATES.drsTaskPerHour * syncDays * 24;
    const omsApiCost = storageCount > 0
        ? Math.max(0.01, (totalSmallFiles / 1000) * COST_RATES.omsApiPerThousandObj)
        : 0;

    // Overhead
    const overheadCost = COST_RATES.overheadFlat;

    const totalCost = egressCost + smsAgentCost + drsTaskCost + omsApiCost + overheadCost;

    return {
        currency: 'USD',
        egressCost: Math.round(egressCost * 100) / 100,
        smsAgentCost: Math.round(smsAgentCost * 100) / 100,
        drsTaskCost: Math.round(drsTaskCost * 100) / 100,
        omsApiCost: Math.round(omsApiCost * 100) / 100,
        overheadCost: Math.round(overheadCost * 100) / 100,
        totalEstimatedCost: Math.round(totalCost * 100) / 100,
        costPerNode: maxParallel > 0 ? Math.round((totalCost / Math.max(computeCount + databaseCount + storageCount, 1)) * 100) / 100 : 0,
        breakdown: {
            computeNodes: computeCount,
            databaseNodes: databaseCount,
            storageNodes: storageCount,
            totalPayloadGB: Math.round(totalPayloadGB * 100) / 100,
            estimatedSyncDays: syncDays,
            transitType,
            egressRatePerGB: egressRate
        }
    };
}

// ─── Recalibration Baseline ───────────────────────────────────────────

/**
 * Generate the recalibration baseline for Phase 4.5 Sync Monitor.
 * This provides expected throughput values so the execution engine
 * can compare actual vs estimated during live migration.
 *
 * @returns {Object} recalibration contract
 */
export function generateRecalibrationBaseline(structuredResult) {
    const { pipeline, concurrency, executionTimeline, pillars } = structuredResult;

    return {
        expectedThroughputMbps: pipeline.effectiveMbps,
        perNodeExpectedMbps: concurrency.perNodeMbps,
        maxParallelNodes: concurrency.maxParallelNodes,
        totalInitialSyncDays: executionTimeline.phase1InitialSyncDays,
        totalCutoverHours: executionTimeline.totalCutoverHours,
        isFeasible: executionTimeline.isFeasible,
        bottleneck: executionTimeline.bottleneck,
        // Deviation thresholds
        recalibrationThreshold: {
            throughputWarningPct: 70,  // Alert if actual < 70% of expected
            throughputCriticalPct: 50, // Escalate if actual < 50% of expected
            timeOverrunWarningPct: 120, // Alert if elapsed > 120% of estimated
            timeOverrunCriticalPct: 150 // Escalate if elapsed > 150% of estimated
        },
        perPillarBaselines: {}
    };
}

// ─── Exports ──────────────────────────────────────────────────────────

/**
 * Bridge function: Estimate egress costs from physics data for FinOps consumption.
 * FinOpsCalculator calls this to get physics-informed cost projections.
 * 
 * @param {Object} physicsResult - The structured physics result
 * @param {string} currency - Target currency code (default: 'USD')
 * @returns {Object} { totalEgressGB, estimatedEgressCost, perPillarEgress, currency }
 */
export function estimatePhysicsEgressForFinOps(physicsResult, currency = 'USD') {
    const { pillars, executionTimeline, pipeline } = physicsResult;
    
    // Currency conversion rates (approximate, updated periodically)
    const fxRates = {
        USD: 1.0, BRL: 5.45, CLP: 930, PEN: 3.72, COP: 4100, MXN: 18.30
    };
    const rate = fxRates[currency] || 1.0;
    
    let totalEgressGB = 0;
    const perPillarEgress = {};
    
    ['compute', 'database', 'storage'].forEach(pillar => {
        const p = pillars[pillar];
        if (!p) return;
        const payloadGB = p.totalPayloadGB || 0;
        const churnGB = p.totalChurnGB || 0;
        const totalGB = payloadGB + churnGB;
        
        // Egress cost per pillar based on transit type
        const transitType = pipeline?.transitType || 'IPsec VPN';
        const egressRate = COST_RATES.egressPerGB[transitType] || COST_RATES.egressPerGB.default;
        
        const cost = totalGB * egressRate * rate;
        totalEgressGB += totalGB;
        
        perPillarEgress[pillar] = {
            payloadGB: Math.round(payloadGB * 100) / 100,
            churnGB: Math.round(churnGB * 100) / 100,
            totalGB: Math.round(totalGB * 100) / 100,
            egressRatePerGB: egressRate * rate,
            estimatedCost: Math.round(cost * 100) / 100,
            currency
        };
    });
    
    const transitType = pipeline?.transitType || 'IPsec VPN';
    const egressRate = COST_RATES.egressPerGB[transitType] || COST_RATES.egressPerGB.default;
    
    return {
        totalEgressGB: Math.round(totalEgressGB * 100) / 100,
        estimatedEgressCost: Math.round(totalEgressGB * egressRate * rate * 100) / 100,
        perPillarEgress,
        transitType,
        egressRatePerGB: egressRate * rate,
        currency
    };
}

/**
 * Per-node timeline: Calculate the completion order and estimated finish time
 * for each node based on its payload, pipe allocation, and concurrency.
 * 
 * @param {Object} params
 * @returns {Array} timeline entries sorted by completion order
 */
export function generateNodeTimeline({ nodes, nodeConfigs, effectiveMbps, maxParallel, perNode }) {
    if (!nodes || nodes.length === 0) return [];
    if (effectiveMbps <= 0) effectiveMbps = 100;
    if (maxParallel <= 0) maxParallel = 1;
    
    const pipePerNode = effectiveMbps / maxParallel;
    const MBps = pipePerNode / 8;
    
    // Calculate estimated time for each node
    const scheduled = nodes
        .filter(n => {
            const conf = nodeConfigs[n.id] || {};
            return conf.includedInMath !== false;
        })
        .map(n => {
            const pn = perNode[n.id] || {};
            const payloadMB = (pn.payloadGB || 0) * 1024;
            const churnMB = (pn.churnGB || 0) * 1024;
            const totalSeconds = (payloadMB + churnMB) / Math.max(MBps, 0.001);
            const totalHours = totalSeconds / 3600;
            
            return {
                nodeId: n.id,
                name: pn.name || n.name || n.label || n.id,
                pillar: pn.pillar || 'unknown',
                tool: pn.recommendedTool || 'Unknown',
                payloadGB: Math.round((pn.payloadGB || 0) * 100) / 100,
                totalGB: Math.round(((pn.payloadGB || 0) + (pn.churnGB || 0)) * 100) / 100,
                estimatedHours: Math.round(totalHours * 10) / 10,
                estimatedDays: Math.round((totalHours / 24) * 10) / 10,
                allocatedMbps: Math.round(pipePerNode * 10) / 10,
                classificationConfidence: pn.classificationConfidence || 0
            };
        })
        .sort((a, b) => a.estimatedHours - b.estimatedHours);
    
    // Simulate parallel execution: group into waves based on concurrency
    const timeline = [];
    let globalClock = 0;
    
    for (let i = 0; i < scheduled.length; i += maxParallel) {
        const waveNodes = scheduled.slice(i, i + maxParallel);
        const waveTime = Math.max(...waveNodes.map(n => n.estimatedHours));
        
        waveNodes.forEach((node, idx) => {
            timeline.push({
                ...node,
                wave: Math.floor(i / maxParallel) + 1,
                slot: idx + 1,
                startHour: Math.round(globalClock * 10) / 10,
                completeHour: Math.round((globalClock + node.estimatedHours) * 10) / 10,
                finishOrder: timeline.length + 1
            });
        });
        
        globalClock += waveTime;
    }
    
    // Sort by finish order
    timeline.sort((a, b) => a.finishOrder - b.finishOrder);
    
    return timeline;
}

export default {
    classifyNodeWithConfidence,
    generateStructuredResult,
    generateWavePacking,
    estimateCosts,
    generateRecalibrationBaseline,
    estimatePhysicsEgressForFinOps,
    generateNodeTimeline
};
