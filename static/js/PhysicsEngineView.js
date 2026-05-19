// Main Physics Engine View - Orchestrates all components
// Uses global React from CDN

function PhysicsEngineView({ activeProject, onUpdateProject }) {
    const { useState, useEffect, useMemo } = React;
    
    console.log("PhysicsEngineView RENDERED - activeProject:", activeProject?.name);
    console.log("PhysicsEngineView - isPoC:", activeProject?.project_type === "poc");
    
    // 1. Compute & Encryption
    const [computeCPU, setComputeCPU] = useState(60); 
    const [computeRAM, setComputeRAM] = useState(60);
    const [computeOS, setComputeOS] = useState('Linux');
    const [sourceEncrypted, setSourceEncrypted] = useState(false);
    
    // 2. Payload, Unit & Files
    const [storageSize, setStorageSize] = useState(5.0); 
    const [storageUnit, setStorageUnit] = useState('TB');
    const [storageMode, setStorageMode] = useState('Block'); // Block/File vs Object
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
    
    // 4. Network Routing (Standard)
    const [netSource, setNetSource] = useState(1000); 
    const [transitType, setTransitType] = useState('DirectConnect'); // DC, VPN, Internet
    const [netTunnel, setNetTunnel] = useState(300); 
    const [netTarget, setNetTarget] = useState(1000);

    // 4.1 Cloud Backbone (Object / OMS)
    const [omsTasks, setOmsTasks] = useState(5);
    const [omsObjPerSec, setOmsObjPerSec] = useState(120);
    const [omsBackbone, setOmsBackbone] = useState(16); // Gbps
    
    // 5. DR & SLA
    const [drBackupHrs, setDrBackupHrs] = useState(4); 
    const [drStability, setDrStability] = useState('High'); 
    const [downtimeWindow, setDowntimeWindow] = useState(48);
    
    const [showFaq, setShowFaq] = useState(false);

    // Load saved state
    useEffect(() => {
        if (activeProject?.physics) {
            const p = activeProject.physics;
            setComputeCPU(p.computeCPU||60); 
            setComputeRAM(p.computeRAM||60); 
            setComputeOS(p.computeOS||'Linux'); 
            setSourceEncrypted(p.sourceEncrypted||false);
            setStorageMode(p.storageMode||'Block'); 
            setDiskType(p.diskType||'SSD'); 
            setTargetKMS(p.targetKMS||false);
            setStorageSize(p.storageSize||5.0); 
            setStorageUnit(p.storageUnit||'TB');
            setTotalFiles(p.totalFiles||103000000); 
            setSmallFiles(p.smallFiles||90000000); 
            setSyncMethod(p.syncMethod||'Block');
            setExcludeDb(p.excludeDb===undefined?true:p.excludeDb); 
            setDbStorageSize(p.dbStorageSize||4.0);
            setDbType(p.dbType||'PostgreSQL'); 
            setDbRowsM(p.dbRowsM||250); 
            setDbRps(p.dbRps||8000);
            setNetSource(p.netSource||1000); 
            setTransitType(p.transitType||'DirectConnect'); 
            setNetTunnel(p.netTunnel||300); 
            setNetTarget(p.netTarget||1000);
            setOmsTasks(p.omsTasks||5); 
            setOmsObjPerSec(p.omsObjPerSec||120); 
            setOmsBackbone(p.omsBackbone||16);
            setDrBackupHrs(p.drBackupHrs||4); 
            setDrStability(p.drStability||'High'); 
            setDowntimeWindow(p.downtimeWindow||48);
        }
    }, [activeProject]);

    // Parameter change handler
    const handleParamChange = (param, value) => {
        const setters = {
            computeCPU: setComputeCPU,
            computeRAM: setComputeRAM,
            computeOS: setComputeOS,
            sourceEncrypted: setSourceEncrypted,
            storageSize: setStorageSize,
            storageUnit: setStorageUnit,
            storageMode: setStorageMode,
            diskType: setDiskType,
            targetKMS: setTargetKMS,
            totalFiles: setTotalFiles,
            smallFiles: setSmallFiles,
            syncMethod: setSyncMethod,
            excludeDb: setExcludeDb,
            dbStorageSize: setDbStorageSize,
            dbType: setDbType,
            dbRowsM: setDbRowsM,
            dbRps: setDbRps,
            netSource: setNetSource,
            transitType: setTransitType,
            netTunnel: setNetTunnel,
            netTarget: setNetTarget,
            omsTasks: setOmsTasks,
            omsObjPerSec: setOmsObjPerSec,
            omsBackbone: setOmsBackbone,
            drBackupHrs: setDrBackupHrs,
            drStability: setDrStability,
            downtimeWindow: setDowntimeWindow
        };
        
        if (setters[param]) {
            setters[param](value);
        }
    };

    // Special handlers for file counts
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

    // Calculate results
    const results = useMemo(() => {
        const params = {
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
        };
        
        return calculatePhysics(params);
    }, [
        computeCPU, computeRAM, computeOS, sourceEncrypted,
        storageSize, storageUnit, storageMode, diskType, targetKMS,
        totalFiles, smallFiles, syncMethod, excludeDb, dbStorageSize,
        dbType, dbRowsM, dbRps, netSource, transitType, netTunnel,
        netTarget, omsTasks, omsObjPerSec, omsBackbone, drBackupHrs,
        drStability, downtimeWindow
    ]);

    const saveContext = () => { 
        const data = { 
            computeCPU, computeRAM, computeOS, sourceEncrypted, 
            storageMode, diskType, targetKMS, storageSize, storageUnit, 
            totalFiles, smallFiles, syncMethod, excludeDb, dbStorageSize, 
            dbType, dbRowsM, dbRps, netSource, transitType, netTunnel, 
            netTarget, omsTasks, omsObjPerSec, omsBackbone, drBackupHrs, 
            drStability, downtimeWindow 
        };
        onUpdateProject(activeProject.id, 'physics', data);
        alert("Physics Engine parameters saved to project context."); 
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-4 pb-12 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-black flex items-center gap-3 text-xl text-slate-800">
                        <i className="fas fa-microscope text-rose-500"></i> Cloud Delivery Physics Engine
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Calculates true SLA timelines using Agent constraints, Crypto/KMS overhead, E2E routing, and File Counts.
                    </p>
                </div>
                <button 
                    onClick={saveContext} 
                    className="px-6 py-3 bg-rose-600 text-white hover:bg-rose-700 rounded-xl shadow-md font-black uppercase tracking-widest text-xs transition-transform active:scale-95"
                >
                    <i className="fas fa-save mr-2"></i>Save Physics Context
                </button>
            </div>

            <FAQSection showFaq={showFaq} setShowFaq={setShowFaq} />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <ComputeNode 
                        computeCPU={computeCPU}
                        computeRAM={computeRAM}
                        computeOS={computeOS}
                        sourceEncrypted={sourceEncrypted}
                        storageMode={storageMode}
                        onParamChange={handleParamChange}
                    />
                    
                    <PayloadInputs 
                        storageSize={storageSize}
                        storageUnit={storageUnit}
                        storageMode={storageMode}
                        diskType={diskType}
                        targetKMS={targetKMS}
                        totalFiles={totalFiles}
                        smallFiles={smallFiles}
                        syncMethod={syncMethod}
                        onParamChange={handleParamChange}
                        onTotalFilesChange={handleTotalFilesChange}
                        onSmallFilesChange={handleSmallFilesChange}
                    />

                    <DatabaseRouting 
                        excludeDb={excludeDb}
                        dbStorageSize={dbStorageSize}
                        dbType={dbType}
                        dbRowsM={dbRowsM}
                        dbRps={dbRps}
                        storageMode={storageMode}
                        storageUnit={storageUnit}
                        onParamChange={handleParamChange}
                    />

                    <SLASection 
                        drBackupHrs={drBackupHrs}
                        drStability={drStability}
                        downtimeWindow={downtimeWindow}
                        onParamChange={handleParamChange}
                    />
                    
                    <NetworkRouting 
                        storageMode={storageMode}
                        netSource={netSource}
                        transitType={transitType}
                        netTunnel={netTunnel}
                        netTarget={netTarget}
                        omsTasks={omsTasks}
                        omsObjPerSec={omsObjPerSec}
                        omsBackbone={omsBackbone}
                        onParamChange={handleParamChange}
                    />
                </div>

                <PhysicsResults 
                    results={results}
                    downtimeWindow={downtimeWindow}
                    storageUnit={storageUnit}
                    smallFilePct={results.smallFilePct}
                    onParamChange={handleParamChange}
                />
            </div>
        </div>
    );
}

// Global binding for Babel Standalone
window.PhysicsEngineView = PhysicsEngineView;