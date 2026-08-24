import React, { useState, useEffect, useMemo } from 'react';
import { generateStructuredResult, classifyNodeWithConfidence, generateRecalibrationBaseline, estimatePhysicsEgressForFinOps, generateNodeTimeline } from '../../utils/physicsMath';

// Pre-defined Physics Profiles
const PROFILES = {
    'linux_block': { name: 'Linux VM (Block)', os: 'Linux', sync: 'Block', totalFiles: 500000, smallFiles: 50000 },
    'linux_file_heavy': { name: 'Linux App (File-Heavy)', os: 'Linux', sync: 'File', totalFiles: 50000000, smallFiles: 45000000 },
    'windows_std': { name: 'Windows Server (Block)', os: 'Windows', sync: 'Block', totalFiles: 300000, smallFiles: 20000 },
    'db_paas': { name: 'Database (PaaS Logical)', isDb: true, engine: 'PostgreSQL', rowsM: 250, rps: 8000 },
    'obs_standard': { name: 'OBS Bucket (API Sync)', isStorage: true, sync: 'API', totalFiles: 1000000, smallFiles: 0 }
};

const computeTypes = ['ECS', 'BMS', 'VM', 'CCE', 'SERVER'];
const dbTypes = ['RDS', 'GAUSSDB', 'DB', 'DATABASE', 'DCS'];
const storageTypes = ['OBS', 'SFS', 'STORAGE']; 

// 🚨 THE NEW GUIDE & LEGEND CAROUSEL COMPONENT
const PhysicsGuideModal = ({ onClose }) => {
    const [slide, setSlide] = useState(1);
    const totalSlides = 3;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-black text-lg"><i className="fas fa-book-open mr-2"></i> Delivery Physics Engine: User Guide & Legend</h3>
                    <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                </div>
                
                <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
                    {slide === 1 && (
                        <div className="animate-fade-in space-y-4">
                            <h4 className="font-black text-xl text-slate-800 mb-2 border-b border-slate-200 pb-2">1. The "Water Pipe Fallacy"</h4>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                A common mistake in cloud migrations is calculating downtime by simply dividing total storage by network bandwidth (e.g., 5TB / 1Gbps). This is the <b>Water Pipe Fallacy</b>. 
                                In reality, network transfers are bottlenecked by several invisible taxes and agent limitations.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="font-black text-sm text-amber-600 mb-1"><i className="fas fa-copy mr-1"></i> Small Files Penalty</div>
                                    <p className="text-xs text-slate-500">1TB of 5KB text files will transfer significantly slower than a 1TB video file because the OS must perform an inode lookup for every file. The engine heavily penalizes <b>File-Level Syncs</b> with high small-file counts.</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="font-black text-sm text-blue-600 mb-1"><i className="fas fa-route mr-1"></i> The Transit Tax</div>
                                    <p className="text-xs text-slate-500">TCP connections lose ~5% to header overhead. IPsec VPNs add an extra ~15% tax due to packet encryption. Public Internet routing loses ~25% to latency and drops.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {slide === 2 && (
                        <div className="animate-fade-in space-y-4">
                            <h4 className="font-black text-xl text-slate-800 mb-2 border-b border-slate-200 pb-2">2. The Migration Pillars</h4>
                            <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                The engine completely decouples your infrastructure into 3 distinct functional pillars, because Huawei Cloud migrates them using entirely different toolsets and algorithms.
                            </p>
                            <ul className="space-y-3">
                                <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                    <i className="fas fa-server text-blue-500 text-xl mt-1"></i>
                                    <div><strong className="text-sm text-slate-800">Compute (SMS)</strong><p className="text-xs text-slate-500">Servers are constrained by the available VPN bandwidth and the Agent's Disk IOPS. High CPU saturation on the source node will aggressively throttle the sync.</p></div>
                                </li>
                                <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                    <i className="fas fa-database text-rose-500 text-xl mt-1"></i>
                                    <div><strong className="text-sm text-slate-800">Logical Databases (DRS)</strong><p className="text-xs text-slate-500">PaaS databases cannot be block-migrated. The engine calculates DRS sync times based purely on Logical Rows-per-Second (RPS) engine limits.</p></div>
                                </li>
                                <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                    <i className="fas fa-hdd text-amber-500 text-xl mt-1"></i>
                                    <div><strong className="text-sm text-slate-800">Standalone Storage (OMS)</strong><p className="text-xs text-slate-500">Object buckets bypass your VPN and are synced via the Cloud Backbone. Constrained exclusively by API Objects/sec rate limits.</p></div>
                                </li>
                            </ul>
                        </div>
                    )}

                    {slide === 3 && (
                        <div className="animate-fade-in space-y-4">
                            <h4 className="font-black text-xl text-slate-800 mb-2 border-b border-slate-200 pb-2">3. Icon & Terminology Legend</h4>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div><div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Engine Modes</div>
                                    <ul className="text-xs space-y-2 text-slate-600">
                                        <li><i className="fas fa-brain text-indigo-500 w-5"></i> <b>Cognitive (Auto PMO):</b> Simulates timelines automatically using PMO heuristics (2% daily churn).</li>
                                        <li><i className="fas fa-sliders-h text-rose-500 w-5"></i> <b>Granular (Manual):</b> Gives the Delivery Engineer per-server control over OS and file counts.</li>
                                    </ul>
                                </div>
                                <div><div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Abbreviations</div>
                                    <ul className="text-xs space-y-2 text-slate-600">
                                        <li><b>SMS:</b> Server Migration Service (Block/File level)</li>
                                        <li><b>DRS:</b> Data Replication Service (Logical DB Sync)</li>
                                        <li><b>OMS:</b> Object Migration Service (Bucket API Sync)</li>
                                        <li><b>SLA Window:</b> Customer's accepted Cutover downtime.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                    <button onClick={() => setSlide(slide > 1 ? slide - 1 : 1)} disabled={slide === 1} className="px-4 py-2 text-xs font-black uppercase text-slate-500 hover:text-slate-800 disabled:opacity-30"><i className="fas fa-arrow-left mr-1"></i> Previous</button>
                    <div className="flex gap-2">{[1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full ${slide === i ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>)}</div>
                    {slide < totalSlides ? (
                        <button onClick={() => setSlide(slide + 1)} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-black uppercase transition-colors">Next <i className="fas fa-arrow-right ml-1"></i></button>
                    ) : (
                        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-black uppercase shadow-md transition-colors">Get Started</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function PhysicsEngine({ activeProject, onUpdateProject, onRefreshResources }) {
    // Shared Global State
    const [engineMode, setEngineMode] = useState('cognitive'); 
    const [showGuide, setShowGuide] = useState(false);
    
    // Shared Network State
    const [netSource, setNetSource] = useState(1000); 
    const [transitType, setTransitType] = useState('IPsec VPN'); 
    const [netTunnel, setNetTunnel] = useState(300); 
    const [downtimeWindow, setDowntimeWindow] = useState(48); 
    const [concurrency, setConcurrency] = useState(5); 

    // Cognitive State
    const [usedStoragePct, setUsedStoragePct] = useState(50); 
    const [appChurnPct, setAppChurnPct] = useState(2); 
    const [dbChurnPct, setDbChurnPct] = useState(8); 

    // Shared Pillars & Table State
    const [useCompute, setUseCompute] = useState(true);
    const [useDatabase, setUseDatabase] = useState(true);
    const [useStorage, setUseStorage] = useState(false);
    const [nodeConfigs, setNodeConfigs] = useState({});
    const [selectedNodes, setSelectedNodes] = useState([]); 
    const [bulkProfile, setBulkProfile] = useState('linux_block');
    
    // Manual State
    const [omsTasks, setOmsTasks] = useState(5);
    const [omsObjPerSec, setOmsObjPerSec] = useState(120);

    // ⚡ WHAT-IF / SENSITIVITY MODE
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [whatIfNetSource, setWhatIfNetSource] = useState(2000);
    const [whatIfTransit, setWhatIfTransit] = useState('DirectConnect');
    const [whatIfConcurrency, setWhatIfConcurrency] = useState(10);

    // 🚨 EXPLICIT EXECUTION GATE — Results compute only when user clicks "Calculate Physics"
    const [hasCalculated, setHasCalculated] = useState(false);
    const [calcKey, setCalcKey] = useState(0); // bumped to trigger recalculation

    const nodes = useMemo(() => {
        // v2.1 🎯 AUTHORITATIVE SOURCE: Read from saved Target Architecture first
        // targetTopology.mapperNodes = the 5 in-scope nodes saved via Save & Proceed
        const savedNodes = activeProject?.targetTopology?.mapperNodes;
        if (savedNodes && savedNodes.length > 0) {
            return savedNodes.filter(n => {
                const nodeType = String(n.type || '').toUpperCase();
                const isCompute = computeTypes.some(c => nodeType.includes(c));
                const isDatabase = dbTypes.some(d => nodeType.includes(d));
                const isStorage = storageTypes.some(s => nodeType.includes(s));
                const nonMigratableTypes = ['HSS', 'WAF', 'CBR', 'CDN', 'EIP', 'ELB', 'NAT', 'VPN', 'VPC', 'SUBNET', 'SECURITY_GROUP', 'SECURITYGROUP'];
                const isNonMigratable = nonMigratableTypes.some(nmt => nodeType.includes(nmt));
                return (isCompute || isDatabase || isStorage) && !isNonMigratable;
            });
        }
        
        // Fallback: mapperNodes filtered by topologyFilter (mirrors TopologyMapper logic)
        if (activeProject?.mapperNodes?.length > 0) {
            const filter = activeProject?.topologyFilter || 'All';
            return activeProject.mapperNodes.filter(n => {
                const nodeType = String(n.type || '').toUpperCase();
                const isCompute = computeTypes.some(c => nodeType.includes(c));
                const isDatabase = dbTypes.some(d => nodeType.includes(d));
                const isStorage = storageTypes.some(s => nodeType.includes(s));
                const nonMigratableTypes = ['HSS', 'WAF', 'CBR', 'CDN', 'EIP', 'ELB', 'NAT', 'VPN', 'VPC', 'SUBNET', 'SECURITY_GROUP', 'SECURITYGROUP'];
                const isNonMigratable = nonMigratableTypes.some(nmt => nodeType.includes(nmt));
                const isMigratable = (isCompute || isDatabase || isStorage) && !isNonMigratable;
                if (!isMigratable) return false;
                // Apply topology filter (same logic as TopologyMapperView)
                if (filter === 'All') return true;
                if (filter === 'In SOW') return n.status === 'Matched' || n.status === 'Quoted Only';
                if (filter === 'In Discovery') return n.status === 'Matched' || n.status === 'Live Only';
                return n.status === filter;
            });
        }
        
        // Fall back to blueprintData (SOW/Quote) if mapperNodes is empty
        if (activeProject?.blueprintData) {
            try {
                const blueprintData = typeof activeProject.blueprintData === 'string' 
                    ? JSON.parse(activeProject.blueprintData) 
                    : activeProject.blueprintData;
                
                const topology = blueprintData.topology || {};
                const compute = topology.compute || [];
                const databases = topology.databases || topology.database || [];
                const storage = topology.storage || [];
                
                // Convert to mapperNodes format
                const nodesFromBlueprint = [
                    ...compute.map(item => ({
                        id: `sow-comp-${item.id || Date.now()}`,
                        name: item.name || `Compute-${item.id || 'unknown'}`,
                        type: 'ECS',
                        status: 'Quoted Only',
                        storage: item.storage || item.metadata?.storage_gb,
                        os: item.os || 'Unknown',
                        location: 'Compute-Subnet',
                        region: activeProject?.region || 'la-south-2',
                        ip: 'TBD',
                        config: {}
                    })),
                    ...databases.map(item => ({
                        id: `sow-db-${item.id || Date.now()}`,
                        name: item.name || `Database-${item.id || 'unknown'}`,
                        type: 'RDS',
                        status: 'Quoted Only',
                        storage: item.storage || item.metadata?.storage_gb,
                        location: 'Data-Subnet',
                        region: activeProject?.region || 'la-south-2',
                        ip: 'TBD',
                        config: {}
                    })),
                    ...storage.map(item => ({
                        id: `sow-stor-${item.id || Date.now()}`,
                        name: item.name || `Storage-${item.id || 'unknown'}`,
                        type: 'OBS',
                        status: 'Quoted Only',
                        storage: item.storage || item.metadata?.storage_gb,
                        location: 'Global',
                        region: activeProject?.region || 'la-south-2',
                        ip: 'TBD',
                        config: {}
                    }))
                ];
                
                return nodesFromBlueprint;
            } catch (e) {
                console.error("Error parsing blueprintData for PhysicsEngine:", e);
            }
        }
        
        // Fall back to legacy blueprint field
        if (activeProject?.blueprint) {
            try {
                const blueprint = typeof activeProject.blueprint === 'string' 
                    ? JSON.parse(activeProject.blueprint) 
                    : activeProject.blueprint;
                
                const resources = blueprint.target_architecture || blueprint.resources || [];
                return resources.map(resource => ({
                    ...resource,
                    status: 'Quoted Only',
                    config: {}
                }));
            } catch (e) {
                console.error("Error parsing blueprint for PhysicsEngine:", e);
            }
        }
        
        return [];
    }, [activeProject?.targetTopology?.mapperNodes, activeProject?.mapperNodes, activeProject?.blueprintData, activeProject?.blueprint, activeProject?.region, activeProject?.topologyFilter]);

    useEffect(() => {
        if (!activeProject) return;

        if (activeProject.physics) {
            const p = activeProject.physics;
            setEngineMode(p.engineMode || 'cognitive');
            setNetSource(p.netSource||1000); setTransitType(p.transitType||'IPsec VPN'); setNetTunnel(p.netTunnel||300); setDowntimeWindow(p.downtimeWindow||48);
            setConcurrency(p.concurrency||5);
            setUsedStoragePct(p.usedStoragePct||50); setAppChurnPct(p.appChurnPct||2); setDbChurnPct(p.dbChurnPct||8);
            setUseCompute(p.useCompute !== undefined ? p.useCompute : true);
            setUseDatabase(p.useDatabase !== undefined ? p.useDatabase : true);
            setUseStorage(p.useStorage || false);
            setOmsTasks(p.omsTasks || 5); setOmsObjPerSec(p.omsObjPerSec || 120);
        } else {
            setEngineMode('cognitive');
            setNetSource(1000); setTransitType('IPsec VPN'); setNetTunnel(300); setDowntimeWindow(48);
            setConcurrency(5); setUsedStoragePct(50); setAppChurnPct(2); setDbChurnPct(8);
            setUseCompute(true); setUseDatabase(true); setUseStorage(false);
        }

        let pConfigs = activeProject.physics?.nodeConfigs || {};
        let mergedConfigs = { ...pConfigs };
        let needsUpdate = false;

        nodes.forEach(n => {
            if (!mergedConfigs[n.id]) {
                const classification = classifyNodeWithConfidence(n);
                let profileBase;
                if (classification.pillar === 'database') {
                    profileBase = { ...PROFILES['db_paas'] };
                } else if (classification.pillar === 'storage') {
                    profileBase = { ...PROFILES['obs_standard'] };
                } else {
                    const isWin = String(n.os || '').toUpperCase().includes('WIN');
                    profileBase = isWin ? { ...PROFILES['windows_std'] } : { ...PROFILES['linux_block'] };
                }
                mergedConfigs[n.id] = {
                    ...profileBase,
                    profileName: profileBase.name || 'Custom',
                    customSizeGB: Number(n.storage) || 200,
                    includedInMath: true,
                    isDb: classification.pillar === 'database',
                    isStorage: classification.pillar === 'storage',
                    // Confidence-scored metadata (NEW)
                    _classifiedPillar: classification.pillar,
                    _classificationConfidence: classification.confidence,
                    _recommendedTool: classification.recommendedTool,
                    _syncMethod: classification.syncMethod,
                    _isFileHeavy: classification.isFileHeavy
                };
                needsUpdate = true;
            }
        });

        if (needsUpdate || !activeProject.physics) setNodeConfigs(mergedConfigs);
        else setNodeConfigs(pConfigs);

    }, [activeProject?.physics, nodes]);

    const saveContext = () => { 
        onUpdateProject(activeProject.id, 'physics', { 
            engineMode, netSource, transitType, netTunnel, downtimeWindow, concurrency, 
            usedStoragePct, appChurnPct, dbChurnPct,
            useCompute, useDatabase, useStorage, nodeConfigs, omsTasks, omsObjPerSec,
            // Structured machine-readable result (NEW — consumed by ExecutionPlan)
            result: physicsResult
        }); 
        alert("Physics parameters saved — including structured execution plan data.");
    };

    const resetContext = () => {
        if (window.confirm("Are you sure you want to reset all physics calculations? This will wipe all manual overrides and restore the baseline configuration from your Blueprint & Quotation.")) {
            onUpdateProject(activeProject.id, 'physics', null);
            setSelectedNodes([]);
        }
    };

    const applyBulkProfile = () => {
        if(selectedNodes.length === 0) return alert("Select at least one node using the checkboxes on the left.");
        const newConfigs = { ...nodeConfigs };
        selectedNodes.forEach(id => {
            newConfigs[id] = { ...newConfigs[id], ...PROFILES[bulkProfile], profileName: PROFILES[bulkProfile].name };
        });
        setNodeConfigs(newConfigs);
        setSelectedNodes([]); 
    };

    const toggleNode = (id) => {
        if(selectedNodes.includes(id)) setSelectedNodes(selectedNodes.filter(n => n !== id));
        else setSelectedNodes([...selectedNodes, id]);
    };
    
    const toggleAll = () => {
        if(selectedNodes.length === nodes.length) setSelectedNodes([]);
        else setSelectedNodes(nodes.map(n => n.id));
    };

    // ==========================================
    // 🧠 MATH: COGNITIVE (Automated PMO Simulation)
    // ==========================================
    const cogResult = useMemo(() => {
        const pipeMbps = Math.min(Number(netSource) || 1000, Number(netTunnel) || 300);
        let cryptoTax = transitType === 'IPsec VPN' ? 0.85 : transitType === 'Public Internet' ? 0.75 : 0.95; 
        const effectivePipeMbps = pipeMbps * cryptoTax;
        const validConcurrency = Math.max(Number(concurrency) || 1, 1);
        const pipePerServer = effectivePipeMbps / validConcurrency;

        let computeInitSum = 0; let computeCutoverSum = 0;
        let dbCutoverSum = 0;
        let storageInitSum = 0; let storageCutoverSum = 0;
        let totalUsedGB = 0; let totalChurnGB = 0;

        const activeNodes = nodes.filter(n => nodeConfigs[n.id]?.includedInMath !== false);
        const computeNodes = useCompute ? activeNodes.filter(n => !nodeConfigs[n.id]?.isDb && !nodeConfigs[n.id]?.isStorage) : [];
        const dbNodes = useDatabase ? activeNodes.filter(n => nodeConfigs[n.id]?.isDb) : [];
        const storageNodes = useStorage ? activeNodes.filter(n => nodeConfigs[n.id]?.isStorage) : [];

        computeNodes.forEach(n => {
            const usedGB = (nodeConfigs[n.id]?.customSizeGB || Number(n.storage) || 200) * (usedStoragePct / 100);
            const churnGB = usedGB * (appChurnPct / 100);
            totalUsedGB += usedGB; totalChurnGB += churnGB;

            const speed = Math.min(pipePerServer, 3000); 
            computeInitSum += ((usedGB * 1024 * 8) / speed) / 3600;
            computeCutoverSum += ((churnGB * 1024 * 8) / speed) / 3600;
        });

        dbNodes.forEach(n => {
            const usedGB = (nodeConfigs[n.id]?.customSizeGB || Number(n.storage) || 500) * (usedStoragePct / 100);
            const churnGB = usedGB * (dbChurnPct / 100);
            totalUsedGB += usedGB; totalChurnGB += churnGB;

            const rowsM = usedGB * 2.5; 
            dbCutoverSum += ((rowsM * 1000000) / 5000) / 3600; 
        });

        const omsSpeedMbps = 5 * 120 * 1.5; 
        const stSpeed = Math.min(effectivePipeMbps, omsSpeedMbps);
        storageNodes.forEach(n => {
            const usedGB = (nodeConfigs[n.id]?.customSizeGB || Number(n.storage) || 1000) * (usedStoragePct / 100);
            const churnGB = usedGB * (appChurnPct / 100);
            totalUsedGB += usedGB; totalChurnGB += churnGB;

            storageInitSum += ((usedGB * 1024 * 8) / stSpeed) / 3600;
            storageCutoverSum += ((churnGB * 1024 * 8) / stSpeed) / 3600;
        });

        const computeInitHrs = computeNodes.length > 0 ? computeInitSum / validConcurrency : 0;
        const computeCutoverHrs = computeNodes.length > 0 ? computeCutoverSum / validConcurrency : 0;
        const dbCutoverHrs = dbNodes.length > 0 ? dbCutoverSum / validConcurrency : 0;
        const storageInitHrs = storageNodes.length > 0 ? storageInitSum / validConcurrency : 0;
        const storageCutoverHrs = storageNodes.length > 0 ? storageCutoverSum / validConcurrency : 0;

        const phase1Hrs = Math.max(computeInitHrs, storageInitHrs);
        const phase2Hrs = Math.max(computeCutoverHrs, dbCutoverHrs, storageCutoverHrs) + 1.5; 

        let bottleneck = 'Compute Delta Transfer';
        if (dbCutoverHrs > computeCutoverHrs && dbCutoverHrs > storageCutoverHrs) bottleneck = 'Database Logical Sync (DRS)';
        if (storageCutoverHrs > computeCutoverHrs && storageCutoverHrs > dbCutoverHrs) bottleneck = 'Storage Delta Sync (OMS)';

        return {
            effectiveMbps: Math.round(effectivePipeMbps),
            computeCount: computeNodes.length, dbCount: dbNodes.length, storageCount: storageNodes.length,
            computeInitHrs: computeInitHrs.toFixed(1), computeCutoverHrs: computeCutoverHrs.toFixed(1),
            dbCutoverHrs: dbCutoverHrs.toFixed(1),
            storageInitHrs: storageInitHrs.toFixed(1), storageCutoverHrs: storageCutoverHrs.toFixed(1),
            phase1Days: (phase1Hrs / 24).toFixed(1),
            phase2Hrs: phase2Hrs.toFixed(1),
            totalUsedTB: (totalUsedGB / 1024).toFixed(1),
            totalChurnGB: Math.round(totalChurnGB),
            bottleneck,
            isFeasible: phase2Hrs <= Number(downtimeWindow)
        };
    }, [nodes, nodeConfigs, useCompute, useDatabase, useStorage, netSource, transitType, netTunnel, concurrency, usedStoragePct, appChurnPct, dbChurnPct, downtimeWindow]);

    // ==========================================
    // ⚙️ MATH: GRANULAR (Perfect Per-Server Simulation)
    // ==========================================
    const manResult = useMemo(() => {
        const pipeMbps = Math.min(Number(netSource) || Infinity, Number(netTunnel) || Infinity);
        let cryptoTax = transitType === 'IPsec VPN' ? 0.85 : transitType === 'Public Internet' ? 0.75 : 0.95; 
        const effectivePipeMbps = pipeMbps * cryptoTax;
        
        let totalComputeHrs = 0; let totalDbHrs = 0; let totalStorageHrs = 0;
        let criticalBottleneck = "Network Pipe";

        const validConcurrency = Math.max(Number(concurrency) || 1, 1);
        const activeNodes = nodes.filter(n => nodeConfigs[n.id]?.includedInMath !== false);

        if (useCompute) {
            const computeNodes = activeNodes.filter(n => nodeConfigs[n.id] && !nodeConfigs[n.id].isDb && !nodeConfigs[n.id].isStorage);
            const pipePerServer = effectivePipeMbps / Math.min(computeNodes.length || 1, validConcurrency);
            
            let batchTimeSum = 0;
            computeNodes.forEach(n => {
                const conf = nodeConfigs[n.id];
                const payloadGB = conf.customSizeGB || Number(n.storage) || 200;
                let speedMultiplier = 1.0;
                if (conf.sync === 'File' && conf.smallFiles > 100000) {
                    const ratio = conf.smallFiles / Math.max(conf.totalFiles, 1);
                    speedMultiplier = Math.max(0.15, 1 - ( (conf.smallFiles / 2000000) * ratio ));
                } else if (conf.sync === 'Block') speedMultiplier = 1.35; 
                
                const actualServerSpeed = Math.min(pipePerServer, 4000 * speedMultiplier);
                batchTimeSum += ((payloadGB * 1024 * 8) / actualServerSpeed) / 3600;
            });
            totalComputeHrs = computeNodes.length > 0 ? batchTimeSum / validConcurrency : 0;
        }

        if (useDatabase) {
            const dbNodes = activeNodes.filter(n => nodeConfigs[n.id] && nodeConfigs[n.id].isDb);
            let dbTimeSum = 0;
            dbNodes.forEach(n => {
                const conf = nodeConfigs[n.id];
                dbTimeSum += (((conf.rowsM || 1) * 1000000) / (conf.rps || 5000)) / 3600;
            });
            totalDbHrs = dbNodes.length > 0 ? dbTimeSum / validConcurrency : 0;
        }

        if (useStorage) {
            const storageNodes = activeNodes.filter(n => nodeConfigs[n.id] && nodeConfigs[n.id].isStorage);
            const actualSpeed = Math.min(effectivePipeMbps, (omsTasks * omsObjPerSec * 1.5)); 
            let stTimeSum = 0;
            storageNodes.forEach(n => {
                stTimeSum += (((nodeConfigs[n.id].customSizeGB || Number(n.storage) || 1000) * 1024 * 8) / actualSpeed) / 3600;
            });
            totalStorageHrs = storageNodes.length > 0 ? stTimeSum / validConcurrency : 0;
            if((omsTasks * omsObjPerSec * 1.5) < effectivePipeMbps && storageNodes.length > 0) criticalBottleneck = "Storage API Rate Limit";
        }

        const totalExecutionHrs = Math.max(totalComputeHrs, totalDbHrs, totalStorageHrs);
        const days = Math.floor(totalExecutionHrs / 24); 
        const remainingHours = (totalExecutionHrs % 24).toFixed(1);

        return { 
            totalExecutionHrs: totalExecutionHrs.toFixed(1),
            daysStr: days > 0 ? `${days}d ${remainingHours}h` : `${totalExecutionHrs.toFixed(1)}h`,
            computeHrs: totalComputeHrs.toFixed(1), dbHrs: totalDbHrs.toFixed(1), storageHrs: totalStorageHrs.toFixed(1),
            effectivePipeMbps: Math.round(effectivePipeMbps), criticalBottleneck,
            isFeasible: totalExecutionHrs <= Number(downtimeWindow)
        };
    }, [nodes, nodeConfigs, useCompute, useDatabase, useStorage, netSource, netTunnel, transitType, concurrency, omsTasks, omsObjPerSec, downtimeWindow]);

    // ==========================================
    // 📊 STRUCTURED RESULT — Machine-readable output for ExecutionPlan
    // ==========================================
    const physicsResult = useMemo(() => {
        const sharedState = {
            netSource, transitType, netTunnel, downtimeWindow, concurrency,
            usedStoragePct, appChurnPct, dbChurnPct
        };
        const result = generateStructuredResult({
            engineMode,
            cogResult,
            manResult,
            nodeConfigs,
            nodes,
            sharedState
        });
        // Attach recalibration baseline for Phase 4.5
        result._recalibrationBaseline = generateRecalibrationBaseline(result);
        return result;
    }, [engineMode, cogResult, manResult, nodeConfigs, nodes, netSource, transitType, netTunnel, downtimeWindow, concurrency, usedStoragePct, appChurnPct, dbChurnPct, calcKey]);

    // ⚡ PER-NODE TIMELINE
    const nodeTimeline = useMemo(() => {
        if (!hasCalculated || !physicsResult) return [];
        const activeResult = engineMode === 'cognitive' ? cogResult : manResult;
        const effectiveMbps = engineMode === 'cognitive' ? activeResult?.effectiveMbps : activeResult?.effectivePipeMbps;
        return generateNodeTimeline({
            nodes,
            nodeConfigs,
            effectiveMbps: effectiveMbps || 100,
            maxParallel: Number(concurrency) || 1,
            perNode: physicsResult.perNode || {}
        });
    }, [physicsResult, engineMode, cogResult, manResult, nodes, nodeConfigs, concurrency, calcKey]);

    // ⚡ PHYSICS→FINOPS BRIDGE
    const physicsEgressForFinOps = useMemo(() => {
        if (!hasCalculated || !physicsResult) return null;
        return estimatePhysicsEgressForFinOps(physicsResult, 'USD');
    }, [physicsResult, calcKey]);

    // ⚡ WHAT-IF SCENARIO
    const whatIfScenario = useMemo(() => {
        if (!showWhatIf || !physicsResult) return null;
        const pipeMbps = Math.min(Number(whatIfNetSource) || 2000, Number(netTunnel) || 300);
        const cryptoTaxMap = { 'DirectConnect': 0.95, 'IPsec VPN': 0.85, 'Public Internet': 0.75 };
        const cryptoTax = cryptoTaxMap[whatIfTransit] || 0.85;
        const effMbps = pipeMbps * cryptoTax;
        const validConc = Math.max(Number(whatIfConcurrency) || 1, 1);
        
        // Quick estimate using the cognitive model
        const activeNodes = nodes.filter(n => nodeConfigs[n.id]?.includedInMath !== false);
        const computeNodes = activeNodes.filter(n => !nodeConfigs[n.id]?.isDb && !nodeConfigs[n.id]?.isStorage);
        let totalGB = 0;
        computeNodes.forEach(n => {
            totalGB += (nodeConfigs[n.id]?.customSizeGB || Number(n.storage) || 200) * (usedStoragePct / 100);
        });
        
        const pipePerServer = effMbps / Math.min(computeNodes.length || 1, validConc);
        const totalHrs = computeNodes.length > 0 
            ? ((totalGB * 1024 * 8) / Math.min(pipePerServer, 3000)) / 3600 / validConc 
            : 0;
        const days = Math.floor(totalHrs / 24);
        const remaining = (totalHrs % 24).toFixed(1);
        
        // Compare with baseline
        const baselineHrs = engineMode === 'cognitive' 
            ? parseFloat(cogResult?.phase1Days || 0) * 24 + parseFloat(cogResult?.phase2Hrs || 0)
            : parseFloat(manResult?.totalExecutionHrs || 0);
        const deltaHrs = totalHrs - baselineHrs;
        const improvementPct = baselineHrs > 0 ? Math.abs(deltaHrs / baselineHrs * 100).toFixed(0) : 0;
        
        return {
            effectiveMbps: Math.round(effMbps),
            totalHrs: totalHrs.toFixed(1),
            daysStr: days > 0 ? `${days}d ${remaining}h` : `${totalHrs.toFixed(1)}h`,
            deltaHrs: deltaHrs.toFixed(1),
            improvementPct,
            isBetter: deltaHrs < 0,
            isFeasible: totalHrs <= Number(downtimeWindow),
            pipePerServer: Math.round(pipePerServer),
            totalNodes: computeNodes.length,
            totalGB: Math.round(totalGB)
        };
    }, [showWhatIf, physicsResult, whatIfNetSource, whatIfTransit, whatIfConcurrency, nodes, nodeConfigs, netTunnel, usedStoragePct, downtimeWindow, engineMode, cogResult, manResult, calcKey]);

    const handleCalculate = () => {
        setCalcKey(k => k + 1);
        setHasCalculated(true);
    };

    // Reset calculated state when any input changes — user must explicitly recalculate
    useEffect(() => {
        if (hasCalculated) {
            setHasCalculated(false);
        }
    }, [engineMode, netSource, transitType, netTunnel, concurrency, usedStoragePct, appChurnPct, dbChurnPct, downtimeWindow, nodeConfigs]);

    return (
        <div className="mx-auto space-y-6 animate-fade-in p-2 md:p-6 pb-12">
            
            {showGuide && <PhysicsGuideModal onClose={() => setShowGuide(false)} />}

            {/* 🎛️ HEADER & TOGGLES */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-microscope text-indigo-500"></i> Delivery Physics Engine</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-slate-500 font-bold">Calculate true SLA timelines using Network, Crypto, and Tooling constraints.</p>
                        <button onClick={() => setShowGuide(true)} className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded font-black uppercase tracking-widest transition-colors"><i className="fas fa-book-open mr-1"></i> View Guide & Legend</button>
                    </div>
                    
                    {/* Resource Count Display */}
                    <div className="mt-3 flex items-center gap-3">
                        <div className="bg-slate-100 border border-slate-300 px-4 py-2 rounded-lg">
                            <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Resources in Target Architecture</div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-indigo-600">
                                    {(() => {
                                        // Read from saved Target Architecture first (authoritative)
                                        const savedNodes = activeProject?.targetTopology?.mapperNodes;
                                        const allNodes = activeProject?.mapperNodes || [];
                                        if (savedNodes && savedNodes.length > 0) {
                                            return `${savedNodes.length} / ${allNodes.length}`;
                                        }
                                        // Fallback: filter mapperNodes by saved status filter
                                        const filter = activeProject?.topologyFilter || 'All';
                                        if (filter && filter !== 'All') {
                                            const inScope = allNodes.filter(n => {
                                                if (filter === 'In SOW') return n.status === 'Matched' || n.status === 'Quoted Only';
                                                if (filter === 'In Discovery') return n.status === 'Matched' || n.status === 'Live Only';
                                                return n.status === filter;
                                            });
                                            return `${inScope.length} / ${allNodes.length}`;
                                        }
                                        return allNodes.length;
                                    })()}
                                </span>
                                <button 
                                    onClick={onRefreshResources}
                                    className="text-[10px] bg-indigo-100 text-indigo-600 hover:bg-indigo-200 px-2 py-1 rounded font-black uppercase tracking-widest transition-colors"
                                    title="Refresh from saved Target Architecture"
                                >
                                    <i className="fas fa-sync-alt mr-1"></i> Refresh
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">
                            {activeProject?.targetTopology?.mapperNodes?.length > 0 ? "Using Saved Architecture" : 
                             activeProject?.mapperNodes?.length > 0 ? "Using Unfiltered Discovery Data (Save & Proceed from Step 2.4 first)" : 
                             activeProject?.blueprintData ? "Using SOW/Quote Data (Not Saved)" : 
                             activeProject?.blueprint ? "Using Blueprint Data (Not Saved)" : 
                             "No Architecture Data"}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 border border-slate-200 shadow-inner">
                        <button onClick={() => setEngineMode('cognitive')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${engineMode === 'cognitive' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-brain mr-2"></i> Cognitive (Auto PMO)</button>
                        <button onClick={() => setEngineMode('manual')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${engineMode === 'manual' ? 'bg-white text-rose-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-sliders-h mr-2"></i> Granular (Per Server)</button>
                    </div>
                    <button onClick={resetContext} className="px-6 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-xl shadow-sm font-black uppercase tracking-widest text-xs transition-colors whitespace-nowrap"><i className="fas fa-undo mr-2"></i> Reset</button>
                    <button onClick={saveContext} className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-md font-black uppercase tracking-widest text-xs transition-colors whitespace-nowrap"><i className="fas fa-save mr-2"></i> Save Context</button>
                </div>
            </div>

            {/* ⚡ EXECUTION READINESS DASHBOARD — always visible */}
            <div className={`rounded-2xl shadow-xl border p-6 text-white overflow-hidden relative mb-6 ${
                hasCalculated 
                    ? 'bg-gradient-to-r from-slate-900 to-slate-800 border-indigo-500/30' 
                    : 'bg-gradient-to-r from-slate-800 to-slate-700 border-amber-500/30'
            }`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    {hasCalculated ? (
                        <>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-black text-sm uppercase tracking-widest text-indigo-300">
                                <i className="fas fa-rocket mr-2"></i> Execution Readiness Dashboard
                            </h4>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
                                    physicsResult.timeline?.isFeasible !== false
                                        ? 'bg-emerald-900/60 text-emerald-400 border-emerald-600'
                                        : 'bg-rose-900/60 text-rose-400 border-rose-600'
                                }`}>
                                    {physicsResult.timeline?.isFeasible !== false ? '\u2713 Execution Feasible' : '\u26a0 Not Feasible'}
                                </span>
                                <button onClick={handleCalculate} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap">
                                    <i className="fas fa-redo mr-1"></i> Recalculate
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Total Sync</div>
                                <div className="text-lg font-black text-white font-mono">
                                    {physicsResult.executionTimeline?.phase1InitialSyncDays
                                        ? `${physicsResult.executionTimeline.phase1InitialSyncDays}d`
                                        : physicsResult.executionTimeline?.totalExecutionHours
                                            ? `${(physicsResult.executionTimeline.totalExecutionHours / 24).toFixed(1)}d`
                                            : '—'}
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Cutover Window</div>
                                <div className="text-lg font-black text-white font-mono">
                                    {physicsResult.executionTimeline?.phase2CutoverHours
                                        ? `${physicsResult.executionTimeline.phase2CutoverHours}h`
                                        : physicsResult.executionTimeline?.totalExecutionHours
                                            ? `${physicsResult.executionTimeline.totalExecutionHours}h`
                                            : '—'}
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10 col-span-2 lg:col-span-1">
                                <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Bottleneck</div>
                                <div className="text-sm font-black text-amber-400 uppercase">
                                    {physicsResult.executionTimeline?.bottleneck || '—'}
                                </div>
                                {physicsResult.executionTimeline?.slaWindowHours && (() => {
                                    const sla = Number(physicsResult.executionTimeline.slaWindowHours);
                                    // Calculate total hours from whichever mode is active
                                    const cutoverHrs = Number(physicsResult.executionTimeline?.totalCutoverHours) || 0;
                                    const execHrs = Number(physicsResult.executionTimeline?.totalExecutionHours) || 0;
                                    const totalHrs = cutoverHrs || execHrs || 0;
                                    if (!sla || !totalHrs) return null;
                                    const overrun = totalHrs - sla;
                                    const headroom = sla - totalHrs;
                                    return (
                                        <div className="mt-2 pt-2 border-t border-white/10 text-[9px] leading-relaxed">
                                            {overrun > 0 ? (
                                                <span className="text-rose-400 font-bold">
                                                    Exceeds SLA by {overrun.toFixed(1)}h — bottleneck consumes {Math.round(totalHrs / Math.max(sla, 1) * 100)}% of window
                                                </span>
                                            ) : (
                                                <span className="text-emerald-400 font-bold">
                                                    {headroom.toFixed(1)}h headroom ({Math.round(headroom / Math.max(sla, 1) * 100)}% buffer)
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Confidence</div>
                                <div className={`text-sm font-black uppercase ${
                                    physicsResult.recommendations?.warnings?.length === 0 ? 'text-emerald-400'
                                    : physicsResult.recommendations?.warnings?.length <= 2 ? 'text-amber-400'
                                    : 'text-rose-400'
                                }`}>
                                    {physicsResult.recommendations?.warnings?.length === 0 ? 'HIGH'
                                     : physicsResult.recommendations?.warnings?.length <= 2 ? 'MEDIUM'
                                     : 'LOW'}
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Effective Pipe</div>
                                <div className="text-sm font-black text-indigo-400 font-mono">
                                    {physicsResult.pipeline?.effectiveMbps || '\u2014'} Mbps
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Parallel Nodes</div>
                                <div className="text-sm font-black text-indigo-400 font-mono">
                                    {physicsResult.concurrency?.maxParallel || '\u2014'}
                                </div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        {physicsResult.recommendations?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="text-[9px] text-slate-400 uppercase font-bold mb-2">Key Recommendations</div>
                                <div className="flex flex-wrap gap-2">
                                    {physicsResult.recommendations.slice(0, 4).map((rec, i) => (
                                        <span key={i} className={`text-[9px] font-black px-2 py-1 rounded uppercase border ${
                                            rec.priority === 'CRITICAL' ? 'bg-rose-900/40 text-rose-400 border-rose-700'
                                            : rec.priority === 'HIGH' ? 'bg-amber-900/40 text-amber-400 border-amber-700'
                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}>
                                            {rec.note?.length > 80 ? rec.note.slice(0, 80) + '\u2026' : rec.note}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className="text-center py-10">
                            <i className="fas fa-microscope text-5xl text-amber-400/30 mb-4 block"></i>
                            <h4 className="font-black text-base uppercase tracking-widest text-amber-300 mb-3">
                                Delivery Physics Ready to Run
                            </h4>
                            <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                                Click <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">"Calculate Physics"</span> to generate time estimates, identify bottlenecks, and populate this execution readiness dashboard.
                            </p>
                            <button onClick={handleCalculate} className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95">
                                <i className="fas fa-play mr-2"></i> Calculate Physics
                            </button>
                            <div className="mt-5 flex justify-center gap-4 text-[10px] uppercase tracking-widest text-slate-500">
                                <span className="flex items-center gap-1"><i className="fas fa-check-circle text-emerald-500/40"></i> Bandwidth math</span>
                                <span className="flex items-center gap-1"><i className="fas fa-check-circle text-emerald-500/40"></i> Concurrency limits</span>
                                <span className="flex items-center gap-1"><i className="fas fa-check-circle text-emerald-500/40"></i> SLA feasibility</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 📋 PER-NODE MIGRATION TIMELINE */}
            {nodeTimeline.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest">
                            <i className="fas fa-timeline text-indigo-500 mr-2"></i> Per-Node Migration Timeline
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                            {nodeTimeline.length} nodes · {Math.max(...nodeTimeline.map(n => n.wave || 1))} waves · ~{Math.max(...nodeTimeline.map(n => n.completeHour || 0)).toFixed(1)}h total
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="p-2 w-8">#</th>
                                    <th className="p-2">Node Name</th>
                                    <th className="p-2">Pillar</th>
                                    <th className="p-2">Tool</th>
                                    <th className="p-2 text-right">Payload</th>
                                    <th className="p-2 text-right">Est. Time</th>
                                    <th className="p-2 text-center">Wave</th>
                                    <th className="p-2 text-right">Completes @</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {nodeTimeline.slice(0, 20).map((node, idx) => (
                                    <tr key={node.nodeId} className={`hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                        <td className="p-2 font-mono text-[10px] text-slate-400">{node.finishOrder}</td>
                                        <td className="p-2 font-bold text-slate-800 max-w-[200px] truncate" title={node.name}>{node.name}</td>
                                        <td className="p-2">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                node.pillar === 'database' ? 'bg-rose-100 text-rose-600' :
                                                node.pillar === 'storage' ? 'bg-amber-100 text-amber-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>{node.pillar}</span>
                                        </td>
                                        <td className="p-2 text-[10px] font-bold text-slate-600">{node.tool}</td>
                                        <td className="p-2 text-right font-mono text-[10px] text-slate-600">{node.totalGB} GB</td>
                                        <td className="p-2 text-right font-mono text-[10px] font-bold text-slate-700">{node.estimatedDays > 0 ? `${node.estimatedDays.toFixed(1)}d` : `${node.estimatedHours.toFixed(1)}h`}</td>
                                        <td className="p-2 text-center">
                                            <span className="bg-indigo-100 text-indigo-600 text-[9px] font-black px-1.5 py-0.5 rounded">{node.wave}</span>
                                        </td>
                                        <td className="p-2 text-right font-mono text-[10px] text-slate-500">T+{node.completeHour.toFixed(1)}h</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {nodeTimeline.length > 20 && (
                            <div className="text-center py-2 text-[10px] text-slate-400 font-bold">
                                + {nodeTimeline.length - 20} more nodes...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ⚡ WHAT-IF SCENARIO COMPARISON */}
            {hasCalculated && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest">
                            <i className="fas fa-flask text-amber-500 mr-2"></i> What-If Sensitivity Analysis
                        </h4>
                        <button 
                            onClick={() => setShowWhatIf(!showWhatIf)} 
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                showWhatIf ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            {showWhatIf ? 'Hide Comparison' : 'Compare Scenario'}
                        </button>
                    </div>
                    
                    {showWhatIf && (
                        <div className="animate-fade-in space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Baseline */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Baseline (Current)</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><div className="text-[9px] text-slate-400 uppercase">Pipe</div><div className="font-mono font-bold text-slate-800">{physicsResult.pipeline?.effectiveMbps || '—'} Mbps</div></div>
                                        <div><div className="text-[9px] text-slate-400 uppercase">Transit</div><div className="font-bold text-slate-800 text-xs">{physicsResult.pipeline?.transitType || '—'}</div></div>
                                        <div><div className="text-[9px] text-slate-400 uppercase">Concurrency</div><div className="font-mono font-bold text-slate-800">{physicsResult.concurrency?.maxParallel || '—'} nodes</div></div>
                                        <div><div className="text-[9px] text-slate-400 uppercase">Feasible</div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                                physicsResult.executionTimeline?.isFeasible ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                            }`}>{physicsResult.executionTimeline?.isFeasible ? 'Yes' : 'No'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* What-If */}
                                <div className={`border-2 rounded-xl p-5 ${whatIfScenario?.isBetter ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">What-If Scenario</div>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div>
                                            <label className="text-[9px] text-slate-400 uppercase block mb-1">Pipe (Mbps)</label>
                                            <input type="number" value={whatIfNetSource} onChange={e => setWhatIfNetSource(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs font-bold font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-slate-400 uppercase block mb-1">Transit</label>
                                            <select value={whatIfTransit} onChange={e => setWhatIfTransit(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs font-bold">
                                                <option value="DirectConnect">DirectConnect</option>
                                                <option value="IPsec VPN">IPsec VPN</option>
                                                <option value="Public Internet">Internet</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-slate-400 uppercase block mb-1">Concurrency</label>
                                            <input type="number" value={whatIfConcurrency} onChange={e => setWhatIfConcurrency(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs font-bold font-mono" />
                                        </div>
                                    </div>
                                    
                                    {whatIfScenario && (
                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                                            <div><div className="text-[9px] text-slate-400 uppercase">Result</div><div className="font-mono font-bold text-slate-800">{whatIfScenario.daysStr}</div></div>
                                            <div className="text-right">
                                                <div className={`text-lg font-black ${whatIfScenario.isBetter ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {whatIfScenario.isBetter ? `↓${whatIfScenario.improvementPct}% faster` : `↑${whatIfScenario.improvementPct}% slower`}
                                                </div>
                                                <div className="text-[9px] text-slate-400 uppercase">{whatIfScenario.isBetter ? 'Improvement' : 'Regression'} vs baseline</div>
                                            </div>
                                            <div><div className="text-[9px] text-slate-400 uppercase">Eff. Pipe</div><div className="font-mono font-bold text-slate-800">{whatIfScenario.effectiveMbps} Mbps</div></div>
                                            <div><div className="text-[9px] text-slate-400 uppercase">Feasible</div>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                                    whatIfScenario.isFeasible ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                                }`}>{whatIfScenario.isFeasible ? 'Yes' : 'No'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 text-center italic">
                                Use this to answer: "What if the customer upgrades from 500 Mbps VPN to 1 Gbps Direct Connect?" Adjust parameters above to compare scenarios.
                            </p>
                        </div>
                    )}
                    {!showWhatIf && (
                        <div className="text-center py-6 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <i className="fas fa-flask text-2xl mb-2 opacity-50"></i>
                            <div className="text-xs font-bold uppercase tracking-widest">Sensitivity analysis ready — click "Compare Scenario" to test alternative configurations</div>
                        </div>
                    )}
                </div>
            )}

            {/* 🌐 SHARED GLOBAL PIPELINE */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                    <h4 className="font-black text-sm flex items-center gap-2 text-slate-800"><i className="fas fa-network-wired text-indigo-500"></i> Global End-to-End Pipeline & Limits</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                    <div className="w-full"><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Source Outbound (Mbps)</label><input type="number" value={netSource} onChange={e=>setNetSource(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50"/></div>
                    <div className="w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-blue-500">Transit Route / Encryption</label>
                        <select value={transitType} onChange={e=>setTransitType(e.target.value)} className="w-full p-3 border-2 border-blue-200 rounded-xl text-xs font-black outline-none focus:border-blue-500 bg-blue-50 text-blue-900 shadow-sm mb-3 cursor-pointer"><option value="DirectConnect">DirectConnect / ExpressRoute</option><option value="IPsec VPN">IPsec VPN Tunnel</option><option value="Public Internet">Public Internet / EIP</option></select>
                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-400">Tunnel Limit:</span><input type="number" value={netTunnel} onChange={e=>setNetTunnel(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs font-bold outline-none focus:border-blue-500 bg-white"/></div>
                    </div>
                    <div className="w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700">Agent Concurrency Limit</label>
                        <div className="flex items-center gap-4">
                            <input type="range" min="1" max="50" value={concurrency} onChange={e=>setConcurrency(e.target.value)} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none accent-emerald-600 cursor-pointer"/>
                            <div className="font-black text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">{concurrency} Nodes</div>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-2 font-bold leading-relaxed">Max nodes syncing simultaneously over the pipeline.</div>
                    </div>
                    <div className="w-full">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-emerald-700">Downtime SLA Window (Hrs)</label>
                        <input type="number" value={downtimeWindow} onChange={e=>setDowntimeWindow(e.target.value)} className="w-full p-4 border-2 border-emerald-300 rounded-xl bg-emerald-50 font-black text-xl text-emerald-900 outline-none text-center shadow-inner"/>
                    </div>
                </div>
            </div>

            {/* 🚨 SHARED SCOPE REVIEW & INVENTORY TABLE */}
            <div className="space-y-6">
                <div className="bg-slate-800 p-4 rounded-2xl shadow-md flex flex-wrap gap-4 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">Migration Scope Pillars:</span>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-2 transition-all ${useCompute ? 'bg-blue-500/20 border-blue-400 text-blue-100' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                        <input type="checkbox" checked={useCompute} onChange={e=>setUseCompute(e.target.checked)} className="hidden"/> <i className="fas fa-server"></i> Compute Nodes
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-2 transition-all ${useDatabase ? 'bg-rose-500/20 border-rose-400 text-rose-100' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                        <input type="checkbox" checked={useDatabase} onChange={e=>setUseDatabase(e.target.checked)} className="hidden"/> <i className="fas fa-database"></i> Logical Databases
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-2 transition-all ${useStorage ? 'bg-amber-500/20 border-amber-400 text-amber-100' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                        <input type="checkbox" checked={useStorage} onChange={e=>setUseStorage(e.target.checked)} className="hidden"/> <i className="fas fa-hdd"></i> Standalone Storage
                    </label>
                </div>

                {(useCompute || useDatabase || useStorage) && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest"><i className="fas fa-list text-indigo-500 mr-2"></i> Scope Inclusion & Inventory Review</h4>
                                <p className="text-[10px] font-bold text-slate-500 mt-1">Reviewing {nodes.length} Migratable Resources from the Target Architecture. Use the toggles to exclude specific nodes from the SLA timeline.</p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <select value={bulkProfile} onChange={e=>setBulkProfile(e.target.value)} className="p-2 border border-slate-300 rounded text-xs font-bold bg-white">
                                    {Object.entries(PROFILES).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
                                </select>
                                <button onClick={applyBulkProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">Apply Profile to Selected</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="p-3 w-10 text-center" title="Select for Bulk Edit"><input type="checkbox" onChange={toggleAll} checked={selectedNodes.length === nodes.length && nodes.length > 0} className="w-4 h-4 accent-indigo-600"/></th>
                                        <th className="p-3">Resource Name</th>
                                        <th className="p-3">Type & Profile</th>
                                        <th className="p-3 text-right">Payload Size</th>
                                        <th className="p-3 text-center w-16">Conf.</th>
                                        <th className="p-3">Sync Details (Manual Overrides)</th>
                                        <th className="p-3 text-center">Include in Math</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {nodes.filter(n => {
                                        const c = nodeConfigs[n.id] || {};
                                        if (c.isDb && !useDatabase) return false;
                                        if (c.isStorage && !useStorage) return false;
                                        if (!c.isDb && !c.isStorage && !useCompute) return false;
                                        return true;
                                    }).map(n => {
                                        const conf = nodeConfigs[n.id] || {};
                                        const isActive = conf.includedInMath !== false;
                                        
                                        return (
                                            <tr key={n.id} className={`transition-colors ${selectedNodes.includes(n.id) ? 'bg-indigo-50' : isActive ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-50'}`}>
                                                <td className="p-3 text-center"><input type="checkbox" checked={selectedNodes.includes(n.id)} onChange={() => toggleNode(n.id)} className="w-4 h-4 accent-indigo-600"/></td>
                                                <td className="p-3 font-bold text-slate-800 flex items-center">
                                                    <i className={`fas ${conf.isDb ? 'fa-database text-rose-500' : conf.isStorage ? 'fa-hdd text-amber-500' : 'fa-server text-blue-500'} mr-2`}></i>
                                                    {n.name || n.hostname || n.description || 'Placeholder Resource'}
                                                    {n.status === 'Quoted Only' && <span className="ml-2 bg-slate-200 text-slate-600 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-300" title="This node was imported from a Sales Quote, not auto-discovered from source.">Quote Only</span>}
                                                </td>
                                                <td className="p-3">
                                                    <div className="text-[10px] font-black uppercase text-slate-500 mb-0.5">{conf.isDb ? 'Database' : conf.isStorage ? 'Storage' : conf.os || 'VM'}</div>
                                                    <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 inline-block px-1.5 py-0.5 rounded">{conf.profileName || 'Custom'}</div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <input type="number" value={conf.customSizeGB || 0} onChange={e => setNodeConfigs({...nodeConfigs, [n.id]: {...conf, customSizeGB: Number(e.target.value)}})} className="w-20 p-1 border border-slate-200 rounded text-right font-mono font-bold focus:border-indigo-500 outline-none" /> <span className="text-[10px] font-black text-slate-400">GB</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {(() => {
                                                        const confPct = conf._classificationConfidence;
                                                        if (confPct === undefined) return <span className="text-[9px] text-slate-300">—</span>;
                                                        const pct = Math.round(confPct * 100);
                                                        const color = pct >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                      : pct >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                      : 'bg-red-100 text-red-600 border-red-200';
                                                        return (
                                                            <span className={`inline-block px-1.5 py-0.5 rounded font-black text-[9px] border ${color}`}
                                                                  title={`AI Classification Confidence: ${pct}% — ${conf._classifiedPillar || 'unknown'} pillar`}>
                                                                {pct}%
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-3">
                                                    {conf.isDb ? (
                                                        <div className="flex gap-2 items-center">
                                                            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-black text-[9px] uppercase border border-rose-200">Logical (DRS)</span>
                                                            <input type="number" title="Millions of Rows" value={conf.rowsM || 0} onChange={e => setNodeConfigs({...nodeConfigs, [n.id]: {...conf, rowsM: Number(e.target.value)}})} className="w-16 p-1 border border-slate-200 rounded font-mono text-[10px] focus:border-rose-500 outline-none" /> <span className="text-[9px] text-slate-400">M Rows</span>
                                                        </div>
                                                    ) : conf.isStorage ? (
                                                        <div className="flex gap-2 items-center">
                                                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black text-[9px] uppercase border border-amber-200">API Sync (OMS)</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 items-center">
                                                            <select value={conf.sync || 'Block'} onChange={e => setNodeConfigs({...nodeConfigs, [n.id]: {...conf, sync: e.target.value}})} className="p-1 border border-slate-200 rounded text-[10px] font-black text-blue-800 bg-blue-50 cursor-pointer focus:border-blue-500 outline-none">
                                                                <option value="Block">Block (SMS)</option><option value="File">File (Rsync)</option>
                                                            </select>
                                                            {conf.sync === 'File' && (
                                                                <><input type="number" title="Small Files" value={conf.smallFiles || 0} onChange={e => setNodeConfigs({...nodeConfigs, [n.id]: {...conf, smallFiles: Number(e.target.value)}})} className="w-20 p-1 border border-amber-200 bg-amber-50 rounded font-mono text-[10px] focus:border-amber-500 outline-none" /> <span className="text-[9px] text-amber-600 font-bold">Sm. Files</span></>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <label className="flex items-center justify-center cursor-pointer">
                                                        <div className="relative">
                                                            <input type="checkbox" className="sr-only" checked={isActive} onChange={(e) => setNodeConfigs({...nodeConfigs, [n.id]: {...conf, includedInMath: e.target.checked}})} />
                                                            <div className={`block w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isActive ? 'transform translate-x-4' : ''}`}></div>
                                                        </div>
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {nodes.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 m-4 rounded-xl">No valid resources imported from Blueprint or Quote.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================== */}
            {/* ⚙️ ENGINE MODE SPECIFIC SETTINGS & RESULTS */}
            {/* ========================================================== */}
            {engineMode === 'cognitive' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
                    <div className="xl:col-span-4 space-y-6">
                        <div className="bg-slate-800 p-6 rounded-2xl shadow-md text-white">
                            <h4 className="font-black text-sm flex items-center gap-2 mb-4 text-indigo-300"><i className="fas fa-robot"></i> Automated PMO Engine</h4>
                            <p className="text-xs font-medium leading-relaxed text-slate-300 mb-6">
                                The Cognitive Engine auto-generates a comprehensive execution timeline based on predictive churn heuristics and payload capacity.
                            </p>
                            
                            <div className="space-y-5">
                                <div>
                                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-400"><span>Est. Used Storage %</span><span className="text-indigo-400">{usedStoragePct}%</span></label>
                                    <input type="range" min="10" max="100" step="5" value={usedStoragePct} onChange={e=>setUsedStoragePct(e.target.value)} className="w-full h-2 bg-slate-600 rounded-lg appearance-none accent-indigo-500 cursor-pointer"/>
                                </div>
                                <div className="border-t border-slate-700 pt-4">
                                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-400"><span>App Server Daily Churn</span><span className="text-indigo-400">{appChurnPct}%</span></label>
                                    <input type="range" min="0.1" max="10" step="0.1" value={appChurnPct} onChange={e=>setAppChurnPct(e.target.value)} className="w-full h-2 bg-slate-600 rounded-lg appearance-none accent-indigo-500 cursor-pointer"/>
                                </div>
                                <div className="border-t border-slate-700 pt-4">
                                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-400"><span>DB Server Daily Churn</span><span className="text-rose-400">{dbChurnPct}%</span></label>
                                    <input type="range" min="1" max="25" step="1" value={dbChurnPct} onChange={e=>setDbChurnPct(e.target.value)} className="w-full h-2 bg-slate-600 rounded-lg appearance-none accent-rose-500 cursor-pointer"/>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                            <div className="text-[10px] font-black tracking-widest uppercase mb-1 text-slate-500">Calculated Pipe Capacity</div>
                            <div className="text-3xl font-black text-indigo-600">{cogResult.effectiveMbps} Mbps</div>
                            <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">After TCP/Crypto Tax</div>
                        </div>
                    </div>

                    <div className="xl:col-span-8 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 bg-slate-50 border-b border-slate-200">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest"><i className="fas fa-stream text-indigo-500 mr-2"></i> Simulated Migration Execution</h3>
                                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Auto-packed execution waves based on inventory parameters</p>
                            </div>
                            
                            <div className="p-6 space-y-8">
                                <div className="relative pl-8 border-l-4 border-blue-500">
                                    <div className="absolute w-4 h-4 bg-blue-500 rounded-full -left-[10px] top-0 shadow border-4 border-white"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-black text-slate-800 uppercase text-sm">Phase 1: Background Initial Sync</h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1">Transfers <b>{cogResult.totalUsedTB} TB</b> of payload data while source remains live.</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-blue-600">{cogResult.phase1Days} <span className="text-sm">Days</span></div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Zero Downtime</div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex justify-between items-center">
                                            <div><i className="fas fa-server text-blue-500 mr-2"></i><span className="text-xs font-bold text-slate-700">Compute ({cogResult.computeCount})</span></div>
                                            <div className="text-xs font-black font-mono">{cogResult.computeInitHrs} hrs</div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex justify-between items-center">
                                            <div><i className="fas fa-hdd text-amber-500 mr-2"></i><span className="text-xs font-bold text-slate-700">Storage ({cogResult.storageCount})</span></div>
                                            <div className="text-xs font-black font-mono">{cogResult.storageInitHrs} hrs</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative pl-8 border-l-4 border-emerald-500">
                                    <div className={`absolute w-4 h-4 rounded-full -left-[10px] top-0 shadow border-4 border-white ${cogResult.isFeasible ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-black text-slate-800 uppercase text-sm">Phase 2: Cutover & Validation</h4>
                                            <p className="text-xs font-medium text-slate-500 mt-1">Flush <b>{cogResult.totalChurnGB} GB</b> of daily deltas + Logical DB Sync.</p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-4xl font-black tracking-tighter ${cogResult.isFeasible ? 'text-emerald-600' : 'text-rose-600'}`}>{cogResult.phase2Hrs} <span className="text-xl">Hrs</span></div>
                                            <div className={`text-[9px] font-black uppercase tracking-widest mt-1 px-2 py-0.5 inline-block rounded ${cogResult.isFeasible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                {cogResult.isFeasible ? 'SLA Approved' : 'SLA Violation'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col justify-center">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1"><i className="fas fa-server text-blue-500 mr-1"></i> Compute Delta</div>
                                            <div className="text-sm font-black font-mono">{cogResult.computeCutoverHrs} hrs</div>
                                        </div>
                                        <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex flex-col justify-center">
                                            <div className="text-[10px] font-bold text-rose-700 uppercase mb-1"><i className="fas fa-database text-rose-500 mr-1"></i> Database Logical</div>
                                            <div className="text-sm font-black text-rose-900 font-mono">{cogResult.dbCutoverHrs} hrs</div>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex flex-col justify-center">
                                            <div className="text-[10px] font-bold text-amber-700 uppercase mb-1"><i className="fas fa-hdd text-amber-500 mr-1"></i> Storage Delta</div>
                                            <div className="text-sm font-black text-amber-900 font-mono">{cogResult.storageCutoverHrs} hrs</div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center font-bold text-slate-700">
                                        <span><i className="fas fa-info-circle text-blue-500 mr-2"></i> Includes 1.5 hrs for shutdown, boot, & global validation.</span>
                                        <span>Critical Bottleneck: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{cogResult.bottleneck}</span></span>
                                    </div>
                                    
                                    {!cogResult.isFeasible && (
                                        <div className="mt-3 text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-200 p-3 rounded-xl shadow-sm">
                                            <i className="fas fa-exclamation-circle mr-1"></i> The {cogResult.bottleneck} exceeds the accepted {downtimeWindow} hour downtime window. Recommend increasing Pipeline Bandwidth or reducing Agent Concurrency.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {engineMode === 'manual' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
                    <div className="xl:col-span-4 space-y-6">
                        {useStorage && nodes.filter(n => nodeConfigs[n.id]?.isStorage).length > 0 && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800 mb-4"><i className="fas fa-cogs text-amber-500"></i> Global OMS API Limits (Storage Pillar)</h4>
                                <div className="space-y-4">
                                    <div><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Concurrent OMS Tasks</label><input type="number" value={omsTasks} onChange={e=>setOmsTasks(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"/></div>
                                    <div><label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">API Objects / Sec Limit</label><input type="number" value={omsObjPerSec} onChange={e=>setOmsObjPerSec(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"/></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-8 space-y-6">
                        <div className={`p-8 rounded-3xl border-4 flex flex-col justify-center min-h-[300px] shadow-sm relative overflow-hidden transition-colors ${manResult.isFeasible ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                            <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Total Combined SLA Time</div>
                            <div className={`text-5xl font-black tracking-tighter ${manResult.isFeasible ? 'text-emerald-700' : 'text-rose-700'}`}>{manResult.daysStr}</div>
                            <div className="text-xs font-bold text-slate-500 mt-2">Maximum parallel execution time based on manual overrides.</div>
                            
                            <div className="mt-6 pt-6 border-t-2 border-slate-200/60 text-xs font-medium space-y-3">
                                <div className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-2"><span>Effective Network Pipe:</span> <span className="font-black bg-white px-2 py-1 rounded shadow-sm">{manResult.effectivePipeMbps} Mbps</span></div>
                                
                                {useCompute && <div className="flex justify-between items-center text-blue-700 font-bold pt-2"><span>Compute Pipeline:</span> <span>{manResult.computeHrs} hrs</span></div>}
                                {useDatabase && <div className="flex justify-between items-center text-rose-700 font-bold"><span>Database Pipeline:</span> <span>{manResult.dbHrs} hrs</span></div>}
                                {useStorage && <div className="flex justify-between items-center text-amber-700 font-bold"><span>Storage Pipeline:</span> <span>{manResult.storageHrs} hrs</span></div>}
                                
                                <div className="flex flex-col gap-1 mt-3 p-3 bg-white/50 rounded-xl text-slate-800 border border-slate-200 shadow-sm">
                                    <span className="text-[9px] font-black uppercase text-slate-400">Critical Bottleneck</span>
                                    <span className="font-black text-sm">{manResult.criticalBottleneck}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
