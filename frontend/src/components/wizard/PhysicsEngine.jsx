import React, { useState, useEffect, useMemo } from 'react';

export default function PhysicsEngine({ project, onUpdateProject }) {
    const [netSource, setNetSource] = useState(1000); 
    const [transitType, setTransitType] = useState('IPsec VPN'); 
    const [netTunnel, setNetTunnel] = useState(300); 
    const [targetKMS, setTargetKMS] = useState(false);
    
    const nodes = project?.mapperNodes || [];
    
    // Global Aggregates
    const totalCompute = nodes.filter(n => ['ECS', 'VM'].includes(String(n.type).toUpperCase())).length;
    const totalDbs = nodes.filter(n => ['RDS', 'GAUSSDB', 'DB'].includes(String(n.type).toUpperCase())).length;

    const waves = useMemo(() => {
        const computeAndDb = nodes.filter(n => ['ECS', 'VM', 'RDS', 'GAUSSDB', 'DB'].includes(String(n.type).toUpperCase()));
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

    const [waveConfigs, setWaveConfigs] = useState({});

    useEffect(() => {
        if (project?.physics?.waveConfigs) {
            setWaveConfigs(project.physics.waveConfigs);
            setNetSource(project.physics.netSource || 1000);
            setTransitType(project.physics.transitType || 'IPsec VPN');
            setNetTunnel(project.physics.netTunnel || 300);
            setTargetKMS(project.physics.targetKMS || false);
        } else {
            const defaults = {};
            waves.forEach(w => { defaults[w.name] = { storageSizeTB: ((w.nodeCount * 0.5) + (w.dbCount * 1.0)).toFixed(1), computeCPU: 60 }; });
            setWaveConfigs(defaults);
        }
    }, [project, waves]);

    const handleWaveConfigChange = (waveName, field, value) => {
        setWaveConfigs(prev => ({ ...prev, [waveName]: { ...prev[waveName], [field]: value } }));
    };

    const waveResults = useMemo(() => {
        return waves.map(wave => {
            const config = waveConfigs[wave.name] || { storageSizeTB: 1.0, computeCPU: 60 };
            let speedMultiplier = 1.0;
            const bottleneckMbps = Math.min(Number(netSource), Number(netTunnel), 10000);
            
            if (transitType === 'IPsec VPN') speedMultiplier *= 0.85;
            else if (transitType === 'Public Internet') speedMultiplier *= 0.75;
            else speedMultiplier *= 0.95;

            if (targetKMS) speedMultiplier *= 0.95;
            if (Number(config.computeCPU) >= 85) speedMultiplier *= 0.4;
            else if (Number(config.computeCPU) >= 75) speedMultiplier *= 0.7;

            speedMultiplier *= 1.35; 
            const actualTransferMbps = bottleneckMbps * speedMultiplier;
            const payloadTB = Number(config.storageSizeTB) || 1.0;
            
            const syncHours = (((payloadTB * 1024 * 1024 * 8) / (actualTransferMbps || 1)) / 3600);
            const finalHours = wave.isDbHeavy ? syncHours * 1.5 : syncHours;

            return { ...wave, payloadTB, actualMbps: actualTransferMbps.toFixed(0), hours: finalHours.toFixed(1) };
        });
    }, [waves, waveConfigs, netSource, transitType, netTunnel, targetKMS]);

    const longestWaveHours = waveResults.length > 0 ? Math.max(...waveResults.map(w => Number(w.hours))).toFixed(1) : "0.0";
    const totalPayload = waveResults.reduce((sum, w) => sum + w.payloadTB, 0).toFixed(1);

    const saveContext = () => { 
        const data = { waveConfigs, netSource, transitType, netTunnel, targetKMS, calculatedTotalHours: longestWaveHours, totalStorageTB: totalPayload };
        onUpdateProject(project.id, 'physics', data); 
        alert("Wave Physics Parameters Saved."); 
    };

    if (waves.length === 0) {
        return (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center text-slate-500 animate-fade-in">
                <i className="fas fa-layer-group text-4xl mb-4 text-slate-400"></i>
                <h3 className="font-black text-xl mb-2">No Application Waves Detected</h3>
                <p className="font-medium text-sm">Please return to Step 2 (Architecture) and populate the Topology Mapper.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
            {/* 🚨 THE RESTORED GLOBAL SUMMARY */}
            <div className="bg-slate-900 rounded-2xl shadow-xl p-8 flex flex-col md:flex-row justify-between items-center text-white border border-slate-700 gap-6">
                <div>
                    <h2 className="text-2xl font-black mb-2"><i className="fas fa-water text-blue-400 mr-3"></i> Wave-Based Physics Engine</h2>
                    <p className="text-xs text-slate-400 font-medium">Calculating cutover SLA downtime per Application Group.</p>
                </div>
                <div className="flex gap-6 items-center flex-wrap">
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
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Longest Wave SLA</div>
                        <div className="text-3xl font-black text-emerald-400">{longestWaveHours}h</div>
                    </div>
                    <button onClick={saveContext} className="ml-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">Save Math</button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">
                {/* Left: Global Pipeline Constraints */}
                <div className="xl:w-80 shrink-0 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h4 className="font-black text-sm text-slate-800 mb-6 border-b pb-2"><i className="fas fa-network-wired text-amber-500 mr-2"></i> Global Network Pipe</h4>
                        <div className="space-y-5">
                            <div><label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Source Firewall limit (Mbps)</span><span className="text-amber-700">{netSource}</span></label><input type="range" min="10" max="10000" step="10" value={netSource} onChange={e=>setNetSource(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-amber-500 cursor-pointer"/></div>
                            <div>
                                <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">Transit Route</label>
                                <select value={transitType} onChange={e=>setTransitType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500 bg-slate-50"><option value="DirectConnect">DirectConnect / ExpressRoute</option><option value="IPsec VPN">IPsec VPN Tunnel (15% Tax)</option><option value="Public Internet">Public Internet (25% Tax)</option></select>
                            </div>
                            <div>
                                <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500"><span>Tunnel Cap (Mbps)</span><span className="text-amber-700">{netTunnel}</span></label>
                                <input type="range" min="10" max="10000" step="10" value={netTunnel} onChange={e=>setNetTunnel(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-amber-500 cursor-pointer"/>
                            </div>
                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" checked={targetKMS} onChange={e=>setTargetKMS(e.target.checked)} className="w-5 h-5 accent-amber-500"/>
                                <span className="text-xs font-bold text-slate-700">Target KMS Crypto Tax</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right: The Application Waves */}
                <div className="flex-1 space-y-4">
                    {waveResults.map((wave, idx) => {
                        const config = waveConfigs[wave.name] || { storageSizeTB: 1.0, computeCPU: 60 };
                        
                        return (
                            <div key={wave.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row overflow-hidden hover:border-blue-300 transition-colors">
                                {/* Wave Header */}
                                <div className="bg-slate-50 border-r border-slate-200 p-6 md:w-64 flex flex-col justify-center relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 text-8xl text-slate-200 opacity-30 pointer-events-none font-black">{idx+1}</div>
                                    <h4 className="font-black text-lg text-slate-800 relative z-10">{wave.name}</h4>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1 relative z-10">{wave.nodeCount} Servers {wave.isDbHeavy && ` + ${wave.dbCount} DBs`}</p>
                                    
                                    <div className="mt-4 pt-4 border-t border-slate-200 relative z-10">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Calculated Cutover SLA</div>
                                        <div className={`text-3xl font-black ${Number(wave.hours) > 24 ? 'text-rose-600' : 'text-emerald-600'}`}>{wave.hours}h</div>
                                    </div>
                                </div>
                                
                                {/* Wave Configurations */}
                                <div className="p-6 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                                <span>Estimated Wave Storage (TB)</span>
                                            </label>
                                            <input 
                                                type="number" step="0.1" 
                                                value={config.storageSizeTB} 
                                                onChange={e=>handleWaveConfigChange(wave.name, 'storageSizeTB', e.target.value)} 
                                                className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-black text-blue-900 bg-blue-50 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                                <span>Heaviest Node CPU Limit</span>
                                                <span className="text-slate-700">{config.computeCPU}%</span>
                                            </label>
                                            <input 
                                                type="range" min="10" max="99" 
                                                value={config.computeCPU} 
                                                onChange={e=>handleWaveConfigChange(wave.name, 'computeCPU', e.target.value)} 
                                                className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-inner flex flex-col justify-center h-full text-white">
                                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 border-b border-slate-700 pb-2"><i className="fas fa-terminal mr-2"></i> Pipeline Execution Math</div>
                                        <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-300">Effective Bandwidth:</span> <span className="font-mono text-cyan-400">{wave.actualMbps} Mbps</span></div>
                                        <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-300">Data Compression:</span> <span className="font-mono text-emerald-400">+35% (Block)</span></div>
                                        {wave.isDbHeavy && <div className="flex justify-between items-center"><span className="text-xs text-slate-300">DB Logical Penalty:</span> <span className="font-mono text-rose-400">1.5x Multiplier</span></div>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
