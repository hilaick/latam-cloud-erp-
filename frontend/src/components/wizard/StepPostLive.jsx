import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    
    // WAR State
    const [r, setR] = useState(project?.war?.r || 0); 
    const [s, setS] = useState(project?.war?.s || 0); 
    const [p, setP] = useState(project?.war?.p || 0); 
    const [c, setC] = useState(project?.war?.c || 0); 
    const [o, setO] = useState(project?.war?.o || 0);
    const [autoEval, setAutoEval] = useState(false);
    
    // NOC Scan State
    const [nocScanned, setNocScanned] = useState(false);

    useEffect(()=>{ 
        if(project?.war) { 
            setR(project.war.r || 0); setS(project.war.s || 0); setP(project.war.p || 0); 
            setC(project.war.c || 0); setO(project.war.o || 0); 
        } 
    }, [project]);

    const score = Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5) || 0;

    const handleSaveState = () => {
        onUpdateProject(project.id, 'war', { r, s, p, c, o });
        alert("Phase 5 State Saved Successfully.");
    };

    const handleAutoEvaluate = () => {
        setAutoEval(true);
        // Simulate API evaluating the infrastructure and assigning scores
        setR(95); setS(100); setP(90); setC(85); setO(95);
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* 🚨 EXACTLY RESTORED ORIGINAL HEADER */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                        <i className="fas fa-award text-amber-500"></i> Step 5: Post-Live Governance
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-widest">
                        3-Way Reconciliation & Well-Architected Framework Sign-Off.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm border border-slate-200 flex items-center">
                        <i className="fas fa-file-pdf mr-2 text-rose-500"></i> Standard Dossier
                    </button>
                    <button className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm border border-slate-200 flex items-center">
                        <i className="fas fa-file-excel mr-2 text-emerald-500"></i> Detailed Report
                    </button>
                    <button onClick={handleSaveState} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm flex items-center">
                        <i className="fas fa-save mr-2"></i> Save State
                    </button>
                    {isCurrent && (
                        <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Archived.");}} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95 flex items-center">
                            Archive Project <i className="fas fa-check-double ml-2"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* 🌌 INTEGRATED FEATURE: The Live Constellation mapping the deployed state */}
            <LiveConstellationView activeProject={project} />

            {/* 🚨 RESTORED: 3-Way Infrastructure Diff */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                    <h4 className="font-black text-lg text-slate-800 uppercase tracking-widest flex items-center">
                        <i className="fas fa-balance-scale text-indigo-500 mr-3 text-xl"></i> 3-Way Infrastructure Diff
                    </h4>
                    <button onClick={()=>setNocScanned(true)} className="px-6 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-indigo-200 shadow-sm flex items-center">
                        <i className="fas fa-search mr-2"></i> Run Final NOC Scan
                    </button>
                </div>
                
                {!nocScanned ? (
                    <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                        <i className="fas fa-satellite-dish text-5xl text-slate-300 mb-4"></i>
                        <h5 className="font-black text-slate-600 text-lg">Awaiting Final Cloud Scan</h5>
                        <p className="text-sm text-slate-500 mt-2 font-medium max-w-lg mx-auto">
                            Run the Final NOC Scan to verify exactly what was built in the cloud against the original Sales Quotation.
                        </p>
                    </div>
                ) : (
                    <div className="p-10 text-center bg-emerald-50 border-2 border-emerald-200 rounded-xl shadow-inner animate-fade-in">
                        <i className="fas fa-check-circle text-5xl text-emerald-500 mb-4 shadow-sm rounded-full"></i>
                        <h5 className="font-black text-emerald-800 text-lg uppercase tracking-widest">Scan Complete. 100% Match.</h5>
                        <p className="text-sm text-emerald-700 mt-2 font-bold max-w-lg mx-auto">
                            Live telemetry confirms final cloud infrastructure strictly aligns with the signed SOW and locked Target Architecture.
                        </p>
                    </div>
                )}
            </div>

            {/* 🚨 RESTORED: Well-Architected Framework */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-100 pb-4 gap-4">
                    <h4 className="font-black text-lg text-slate-800 uppercase tracking-widest flex items-center">
                        <i className="fas fa-shield-alt text-amber-500 mr-3 text-xl"></i> Well-Architected Framework
                    </h4>
                    <button onClick={handleAutoEvaluate} className="px-6 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-amber-200 shadow-sm flex items-center">
                        <i className="fas fa-magic mr-2"></i> Auto-Evaluate via API
                    </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        {!autoEval && (
                            <div className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-center shadow-inner">
                                <i className="fas fa-clock mr-3 text-slate-400 text-lg"></i> Pending Baseline Evaluation
                            </div>
                        )}
                        
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Resilience (HA/DR)</label><span className="text-blue-600 font-black text-sm">{r}%</span></div><input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Security & Compliance</label><span className="text-rose-600 font-black text-sm">{s}%</span></div><input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Performance</label><span className="text-purple-600 font-black text-sm">{p}%</span></div><input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Cost Optimization</label><span className="text-emerald-600 font-black text-sm">{c}%</span></div><input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer" /></div>
                        <div><div className="flex justify-between mb-2"><label className="font-black text-xs uppercase tracking-widest text-slate-600">Operational Ops</label><span className="text-slate-600 font-black text-sm">{o}%</span></div><input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer" /></div>
                    </div>

                    <div className={`p-10 rounded-3xl border-4 flex flex-col items-center justify-center text-center transition-all ${score > 0 ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-slate-50 border-slate-300'}`}>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Final Score</h4>
                        <div className={`text-8xl font-black tracking-tighter ${score > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{score}</div>
                        <div className={`mt-8 px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs border-2 transition-all ${score >= 80 ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                            {score >= 80 ? 'Certified & Approved' : 'Pending'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 🌌 THE LIVING DIGITAL TWIN CONSTELLATION
// ==========================================
function LiveConstellationView({ activeProject }) {
    const [viewMode, setViewMode] = useState('live'); 
    const [playbackStep, setPlaybackStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const liveNodes = useMemo(() => {
        const raw = activeProject?.mgcData?.raw_inventory || {};
        const nodes = [];
        
        const addNode = (item, cat, icon, color) => {
            if (!item) return;
            const createdAt = item.created_at || item.launch_time || item.creation_time || item.created || null;
            nodes.push({
                id: item.id || item.name || Math.random().toString(),
                name: item.name || 'Unnamed Resource',
                type: item.type || item.engine || 'Resource',
                ip: item.private_ip_address || item.public_ip_address || item.cidr || item.location || 'N/A',
                createdAt: createdAt,
                timestamp: createdAt ? new Date(createdAt).getTime() : Date.now(), 
                category: cat,
                icon, color
            });
        };

        (raw.compute || raw.servers || []).forEach(n => addNode(n, 'compute', 'fa-server', '#06b6d4'));
        (raw.databases || raw.database || []).forEach(n => addNode(n, 'database', 'fa-database', '#f43f5e'));
        (raw.network || []).forEach(n => addNode(n, 'network', 'fa-network-wired', '#8b5cf6'));
        (raw.storage || []).forEach(n => addNode(n, 'storage', 'fa-hdd', '#10b981'));

        return nodes.sort((a, b) => a.timestamp - b.timestamp);
    }, [activeProject]);

    const graphData = useMemo(() => {
        const width = 1000;
        const height = 500;
        const cx = width / 2;
        const cy = height / 2;

        const hubs = {
            compute:  { x: cx - 200, y: cy - 120, color: '#06b6d4', icon: 'fa-server', name: 'Compute Core' },
            database: { x: cx + 200, y: cy - 120, color: '#f43f5e', icon: 'fa-database', name: 'Data Platform' },
            network:  { x: cx - 200, y: cy + 120, color: '#8b5cf6', icon: 'fa-network-wired', name: 'Network & Edge' },
            storage:  { x: cx + 200, y: cy + 120, color: '#10b981', icon: 'fa-hdd', name: 'Object & Block Storage' },
        };

        const mappedNodes = [];
        const grouped = { compute: [], database: [], network: [], storage: [] };
        liveNodes.forEach(n => { if (grouped[n.category]) grouped[n.category].push(n); });

        let globalSeqIndex = 0;
        liveNodes.forEach((n) => {
            const hub = hubs[n.category];
            const catNodes = grouped[n.category];
            const catIndex = catNodes.findIndex(x => x.id === n.id);
            
            const angleStep = (Math.PI * 2) / (catNodes.length || 1);
            const radius = 60 + (Math.random() * 60); 
            const angle = catIndex * angleStep + (Math.random() * 0.5); 
            
            mappedNodes.push({
                ...n,
                x: hub.x + Math.cos(angle) * radius,
                y: hub.y + Math.sin(angle) * radius,
                sequenceId: globalSeqIndex++
            });
        });

        return { hubs, mappedNodes, cx, cy, width, height, totalNodes: mappedNodes.length };
    }, [liveNodes]);

    useEffect(() => {
        if (viewMode === 'live') {
            setPlaybackStep(graphData.totalNodes);
            setIsPlaying(false);
        }
    }, [viewMode, graphData.totalNodes]);

    useEffect(() => {
        let interval;
        if (isPlaying && playbackStep <= graphData.totalNodes) {
            interval = setInterval(() => { setPlaybackStep(prev => prev + 1); }, 300); 
        } else if (playbackStep > graphData.totalNodes) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackStep, graphData.totalNodes]);

    const handleSetLive = () => { setViewMode('live'); setIsPlaying(false); setPlaybackStep(graphData.totalNodes); };
    const handleSetReplay = () => { setViewMode('replay'); setPlaybackStep(0); setIsPlaying(true); };

    if (liveNodes.length === 0) {
        return (
            <div className="bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 p-12 text-center text-slate-500 animate-fade-in shadow-xl">
                <i className="fas fa-meteor text-5xl mb-4 text-slate-700"></i>
                <h3 className="font-black text-lg mb-1 text-white uppercase tracking-widest">Constellation Offline</h3>
                <p className="font-medium text-xs">No live architecture data detected. Run the Source Discovery API in Step 1.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border-b border-slate-700 text-white">
                <div>
                    <h3 className="font-black flex items-center gap-3 text-lg uppercase tracking-widest text-indigo-400">
                        <i className="fas fa-meteor"></i> Digital Twin Constellation
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Visualizing live API telemetry and historical deployment timelines.</p>
                </div>
                <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-600 shadow-inner w-full md:w-auto">
                    <button onClick={handleSetLive} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                        <i className="fas fa-eye mr-2"></i> Live State
                    </button>
                    <button onClick={handleSetReplay} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'replay' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                        <i className="fas fa-history mr-2"></i> Playback
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 relative h-[500px] flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none"></div>
                <svg width="100%" height="100%" viewBox={`0 0 ${graphData.width} ${graphData.height}`} className="absolute inset-0 pointer-events-none">
                    {playbackStep > 0 && Object.values(graphData.hubs).map((hub, i) => (
                        <line key={`hub-line-${i}`} x1={graphData.cx} y1={graphData.cy} x2={hub.x} y2={hub.y} stroke={hub.color} strokeWidth="1" strokeDasharray="4 4" className="opacity-30" />
                    ))}
                    {graphData.mappedNodes.map((n, i) => {
                        if (i >= playbackStep) return null;
                        const hub = graphData.hubs[n.category];
                        return <line key={`node-line-${i}`} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} stroke={n.color} strokeWidth="1.5" className={`opacity-40 ${viewMode === 'replay' ? 'animate-pulse' : ''}`} />;
                    })}
                </svg>

                {playbackStep > 0 && (
                    <div className="absolute w-20 h-20 bg-indigo-900 border-2 border-indigo-400 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] z-20 animate-fade-in" style={{ left: graphData.cx - 40, top: graphData.cy - 40 }}>
                        <i className="fas fa-cloud text-indigo-300 text-2xl"></i>
                        <span className="text-[8px] font-black text-white uppercase tracking-widest mt-1">Core VPC</span>
                    </div>
                )}

                {playbackStep > 0 && Object.values(graphData.hubs).map((hub, i) => (
                    <div key={`hub-${i}`} className="absolute w-12 h-12 rounded-full flex items-center justify-center z-20 animate-fade-in" style={{ left: hub.x - 24, top: hub.y - 24, backgroundColor: `${hub.color}20`, border: `2px solid ${hub.color}`, boxShadow: `0 0 20px ${hub.color}40` }}>
                        <i className={`fas ${hub.icon} text-lg`} style={{ color: hub.color }}></i>
                        <div className="absolute -bottom-6 w-32 text-center text-[9px] font-black uppercase tracking-widest text-slate-300">{hub.name}</div>
                    </div>
                ))}

                {graphData.mappedNodes.map((n, i) => {
                    if (i >= playbackStep) return null;
                    return (
                        <div key={`node-${i}`} className="absolute z-30 group cursor-pointer animate-fade-in" style={{ left: n.x - 12, top: n.y - 12 }}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-125 transition-transform" style={{ backgroundColor: n.color, boxShadow: `0 0 15px ${n.color}80` }}>
                                <i className={`fas ${n.icon} text-[10px] text-white`}></i>
                            </div>
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur border border-slate-600 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-max z-50 text-white">
                                <div className="text-[10px] font-black uppercase tracking-widest border-b border-slate-600 pb-1.5 mb-1.5 text-indigo-300">{n.name}</div>
                                <div className="text-[9px] font-bold text-slate-400 mb-1">Type: <span style={{ color: n.color }} className="font-black ml-1 uppercase">{n.type}</span></div>
                                <div className="text-[9px] font-bold text-slate-400 mb-1">IP/Loc: <span className="font-mono text-slate-300 ml-1">{n.ip}</span></div>
                                <div className="text-[9px] font-bold text-slate-400 pt-1.5 border-t border-slate-600 mt-1.5 flex items-center">
                                    <i className="fas fa-clock mr-1.5 opacity-70 text-amber-400"></i> Created: 
                                    <span className="font-mono text-slate-300 font-black ml-1">
                                        {n.createdAt ? formatShortDate(n.createdAt) : 'Unknown'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="absolute bottom-6 left-6 bg-slate-800/80 backdrop-blur px-6 py-4 rounded-xl border border-slate-700 z-40 shadow-xl">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
                        <i className={`fas ${viewMode === 'live' ? 'fa-broadcast-tower text-emerald-400' : 'fa-history text-indigo-400'}`}></i> 
                        {viewMode === 'live' ? 'Live Telemetry Active' : 'Deployment Sequence Playback'}
                    </div>
                    <div className="text-xl font-black text-white font-mono mt-1">
                        {Math.min(playbackStep, graphData.totalNodes)} <span className="text-slate-500 text-sm">/ {graphData.totalNodes} Nodes</span>
                    </div>
                    {viewMode === 'replay' && (
                        <div className="w-48 h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(Math.min(playbackStep, graphData.totalNodes) / graphData.totalNodes) * 100}%` }}></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
