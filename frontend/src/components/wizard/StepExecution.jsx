import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    return (
        <div className="p-4 md:p-8 animate-fade-in">
            {/* 🚨 RESTORED: The original Phase 5 Header and Archive Button */}
            <div className="mb-8 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h3 className="font-black text-2xl text-slate-800"><i className="fas fa-award text-amber-500 mr-3"></i> Step 5: Post-Live WAR Sign-Off</h3>
                    <p className="text-sm text-slate-500 mt-2">Evaluate the final delivered architecture against the 5 Cloud Pillars for handover.</p>
                </div>
                {isCurrent && (
                    <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap">
                        Archive Project <i className="fas fa-check-double ml-2"></i>
                    </button>
                )}
            </div>
            
            {/* 🚨 INTEGRATION: Stacking the new Constellation with the old WAR Framework so nothing is replaced */}
            <div className="space-y-12">
                <LiveConstellationView activeProject={project} />
                <PhasePostLive activeProject={project} onUpdateProject={onUpdateProject} />
            </div>
        </div>
    );
}

// ==========================================
// 🌌 THE LIVING DIGITAL TWIN CONSTELLATION
// ==========================================
function LiveConstellationView({ activeProject }) {
    const [viewMode, setViewMode] = useState('live'); // 'live' or 'replay'
    const [playbackStep, setPlaybackStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // 🚨 STOPPED MOCKING: Pulling directly from the Live API Discovery (MgC) Data
    const liveNodes = useMemo(() => {
        const raw = activeProject?.mgcData?.raw_inventory || {};
        const nodes = [];
        
        const addNode = (item, cat, icon, color) => {
            if (!item) return;
            // Extract actual creation dates from various cloud API formats
            const createdAt = item.created_at || item.launch_time || item.creation_time || item.created || null;
            nodes.push({
                id: item.id || item.name || Math.random().toString(),
                name: item.name || 'Unnamed Resource',
                type: item.type || item.engine || 'Resource',
                ip: item.private_ip_address || item.public_ip_address || item.cidr || item.location || 'N/A',
                createdAt: createdAt,
                timestamp: createdAt ? new Date(createdAt).getTime() : Date.now(), // Fallback to now if missing
                category: cat,
                icon, color
            });
        };

        (raw.compute || raw.servers || []).forEach(n => addNode(n, 'compute', 'fa-server', '#06b6d4'));
        (raw.databases || raw.database || []).forEach(n => addNode(n, 'database', 'fa-database', '#f43f5e'));
        (raw.network || []).forEach(n => addNode(n, 'network', 'fa-network-wired', '#8b5cf6'));
        (raw.storage || []).forEach(n => addNode(n, 'storage', 'fa-hdd', '#10b981'));

        // Sort chronologically by API creation date for the replay engine
        return nodes.sort((a, b) => a.timestamp - b.timestamp);
    }, [activeProject]);

    // Map Nodes to physical X,Y coordinates using Trigonometry
    const graphData = useMemo(() => {
        const width = 1000;
        const height = 600;
        const cx = width / 2;
        const cy = height / 2;

        const hubs = {
            compute:  { x: cx - 200, y: cy - 150, color: '#06b6d4', icon: 'fa-server', name: 'Compute Core' },
            database: { x: cx + 200, y: cy - 150, color: '#f43f5e', icon: 'fa-database', name: 'Data Platform' },
            network:  { x: cx - 200, y: cy + 150, color: '#8b5cf6', icon: 'fa-network-wired', name: 'Network & Edge' },
            storage:  { x: cx + 200, y: cy + 150, color: '#10b981', icon: 'fa-hdd', name: 'Object & Block Storage' },
        };

        const mappedNodes = [];
        const grouped = { compute: [], database: [], network: [], storage: [] };
        liveNodes.forEach(n => { if (grouped[n.category]) grouped[n.category].push(n); });

        // Distribute nodes organically in an orbit around their category hub
        let globalSeqIndex = 0;
        liveNodes.forEach((n) => {
            const hub = hubs[n.category];
            const catNodes = grouped[n.category];
            const catIndex = catNodes.findIndex(x => x.id === n.id);
            
            const angleStep = (Math.PI * 2) / (catNodes.length || 1);
            const radius = 80 + (Math.random() * 50); // Organic scattering
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

    // Initialize Default View
    useEffect(() => {
        if (viewMode === 'live') {
            setPlaybackStep(graphData.totalNodes);
            setIsPlaying(false);
        }
    }, [viewMode, graphData.totalNodes]);

    // Playback Engine
    useEffect(() => {
        let interval;
        if (viewMode === 'replay' && isPlaying && playbackStep <= graphData.totalNodes) {
            interval = setInterval(() => {
                setPlaybackStep(prev => prev + 1);
            }, 300); // Speed of the deployment simulation
        } else if (playbackStep > graphData.totalNodes) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [viewMode, isPlaying, playbackStep, graphData.totalNodes]);

    const handleSetLive = () => {
        setViewMode('live');
        setIsPlaying(false);
        setPlaybackStep(graphData.totalNodes);
    };

    const handleSetReplay = () => {
        setViewMode('replay');
        setPlaybackStep(0);
        setIsPlaying(true);
    };

    if (liveNodes.length === 0) {
        return (
            <div className="bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 p-16 text-center text-slate-500 animate-fade-in shadow-xl">
                <i className="fas fa-meteor text-6xl mb-4 text-slate-700"></i>
                <h3 className="font-black text-xl mb-2 text-white">Constellation Offline</h3>
                <p className="font-medium text-sm">No live architecture data detected. Run the Source Discovery API in Step 1.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="font-black flex items-center gap-3 text-xl text-slate-800">
                        <i className="fas fa-meteor text-indigo-500"></i> Organic Infrastructure Constellation
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Visualizing live API telemetry and historical deployment timelines.</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto">
                    <button 
                        onClick={handleSetLive} 
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <i className="fas fa-eye mr-2"></i> Live State
                    </button>
                    <button 
                        onClick={handleSetReplay} 
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'replay' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <i className="fas fa-history mr-2"></i> Historical Playback
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700 relative h-[650px] flex items-center justify-center">
                {/* 🌌 Deep Space Background Elements */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none"></div>
                
                <svg width="100%" height="100%" viewBox={`0 0 ${graphData.width} ${graphData.height}`} className="absolute inset-0 pointer-events-none">
                    {/* Lines connecting Central VPC to 4 Hubs */}
                    {playbackStep > 0 && Object.values(graphData.hubs).map((hub, i) => (
                        <line 
                            key={`hub-line-${i}`} x1={graphData.cx} y1={graphData.cy} x2={hub.x} y2={hub.y} 
                            stroke={hub.color} strokeWidth="1" strokeDasharray="4 4" className="opacity-30" 
                        />
                    ))}

                    {/* Lines connecting Hubs to their individual Nodes */}
                    {graphData.mappedNodes.map((n, i) => {
                        if (i >= playbackStep) return null;
                        const hub = graphData.hubs[n.category];
                        return (
                            <line 
                                key={`node-line-${i}`} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} 
                                stroke={n.color} strokeWidth="1.5" className={`opacity-40 ${viewMode === 'replay' ? 'animate-pulse' : ''}`} 
                            />
                        );
                    })}
                </svg>

                {/* CENTRAL VPC NODE */}
                {playbackStep > 0 && (
                    <div className="absolute w-20 h-20 bg-indigo-900 border-2 border-indigo-400 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] z-20 animate-fade-in" style={{ left: graphData.cx - 40, top: graphData.cy - 40 }}>
                        <i className="fas fa-cloud text-indigo-300 text-2xl"></i>
                        <span className="text-[8px] font-black text-white uppercase tracking-widest mt-1">Core VPC</span>
                    </div>
                )}

                {/* THE 4 CATEGORY HUBS */}
                {playbackStep > 0 && Object.values(graphData.hubs).map((hub, i) => (
                    <div key={`hub-${i}`} className="absolute w-12 h-12 rounded-full flex items-center justify-center z-20 animate-fade-in" style={{ left: hub.x - 24, top: hub.y - 24, backgroundColor: `${hub.color}20`, border: `2px solid ${hub.color}`, boxShadow: `0 0 20px ${hub.color}40` }}>
                        <i className={`fas ${hub.icon} text-lg`} style={{ color: hub.color }}></i>
                        <div className="absolute -bottom-6 w-32 text-center text-[9px] font-black uppercase tracking-widest text-slate-300">{hub.name}</div>
                    </div>
                ))}

                {/* THE RESOURCE NODES (Time-lapsed) */}
                {graphData.mappedNodes.map((n, i) => {
                    if (i >= playbackStep) return null;
                    return (
                        <div key={`node-${i}`} className="absolute z-30 group cursor-pointer animate-fade-in" style={{ left: n.x - 12, top: n.y - 12 }}>
                            {/* The glowing dot */}
                            <div className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-125 transition-transform" style={{ backgroundColor: n.color, boxShadow: `0 0 15px ${n.color}80` }}>
                                <i className={`fas ${n.icon} text-[10px] text-white`}></i>
                            </div>

                            {/* 🚨 NEW: Hover Tooltip with API Creation Date */}
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-slate-200 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-max z-50">
                                <div className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-1.5">{n.name}</div>
                                <div className="text-[9px] font-bold text-slate-500 mb-1">Type: <span style={{ color: n.color }} className="font-black ml-1 uppercase">{n.type}</span></div>
                                <div className="text-[9px] font-bold text-slate-500 mb-1">IP/Loc: <span className="font-mono text-slate-700 ml-1">{n.ip}</span></div>
                                <div className="text-[9px] font-bold text-slate-500 pt-1.5 border-t border-slate-200 mt-1.5">
                                    <i className="fas fa-clock mr-1 opacity-70"></i> Created: 
                                    <span className="font-mono text-slate-700 font-black ml-1">
                                        {n.createdAt ? formatShortDate(n.createdAt) : 'Unknown'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Playback HUD */}
                <div className="absolute bottom-6 left-6 bg-slate-800/80 backdrop-blur px-6 py-4 rounded-xl border border-slate-700 z-40 shadow-xl">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {viewMode === 'live' ? 'Live Telemetry Active' : 'Deployment Sequence Playback'}
                    </div>
                    <div className="text-xl font-black text-white font-mono flex items-center gap-2">
                        {Math.min(playbackStep, graphData.totalNodes)} <span className="text-slate-500 text-sm">/ {graphData.totalNodes} Nodes</span>
                        {viewMode === 'live' && <span className="flex h-2 w-2 relative ml-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
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

// ==========================================
// 🏆 RESTORED: WELL-ARCHITECTED REVIEW (WAR)
// ==========================================
function PhasePostLive({ activeProject, onUpdateProject }) {
    const [r, setR] = useState(activeProject?.war?.r || 50); 
    const [s, setS] = useState(activeProject?.war?.s || 50); 
    const [p, setP] = useState(activeProject?.war?.p || 50); 
    const [c, setC] = useState(activeProject?.war?.c || 50); 
    const [o, setO] = useState(activeProject?.war?.o || 50);
    
    useEffect(()=>{ 
        if(activeProject?.war) { setR(activeProject.war.r); setS(activeProject.war.s); setP(activeProject.war.p); setC(activeProject.war.c); setO(activeProject.war.o); } 
    }, [activeProject]);
    
    const score = Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5); 
    const isCertified = score >= 80;
    
    const saveContext = () => { 
        onUpdateProject(activeProject.id, 'war', { r, s, p, c, o }); 
        alert("WAR Sign-Off Saved"); 
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
                <h3 className="font-black flex items-center gap-3 text-lg"><i className="fas fa-shield-alt text-amber-500"></i> Well-Architected Framework Assessment</h3>
                <button onClick={saveContext} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-xs shadow-md hover:bg-amber-600 transition-colors uppercase tracking-widest">Sign & Save</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm uppercase tracking-widest text-slate-700">Resilience (HA/DR)</label><span className="text-blue-600 font-black text-sm">{r}%</span></div><input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm uppercase tracking-widest text-slate-700">Security & Compliance</label><span className="text-rose-600 font-black text-sm">{s}%</span></div><input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm uppercase tracking-widest text-slate-700">Performance Efficiency</label><span className="text-purple-600 font-black text-sm">{p}%</span></div><input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm uppercase tracking-widest text-slate-700">Cost Optimization</label><span className="text-emerald-600 font-black text-sm">{c}%</span></div><input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm uppercase tracking-widest text-slate-700">Operational Excellence</label><span className="text-slate-600 font-black text-sm">{o}%</span></div><input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer" /></div>
                </div>
                <div className={`p-10 rounded-3xl border-4 flex flex-col items-center justify-center text-center transition-colors ${isCertified ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-slate-50 border-slate-300'}`}>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Architecture Final Score</h4>
                    <div className={`text-8xl font-black tracking-tighter ${isCertified ? 'text-amber-500' : 'text-slate-700'}`}>{score}</div>
                    <div className={`mt-8 px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs border-2 transition-colors ${isCertified ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                        {isCertified ? 'Certified & Approved' : 'Remediation Required'}
                    </div>
                </div>
            </div>
        </div>
    );
}
