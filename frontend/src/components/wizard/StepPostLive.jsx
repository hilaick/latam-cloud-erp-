import React, { useState, useEffect, useMemo, useRef } from 'react';

export default function WizardStepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('constellation');

    return (
        <div>
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex gap-2">
                    <button 
                        onClick={()=>setSubTab('constellation')} 
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='constellation'?'bg-indigo-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <i className="fas fa-meteor mr-2"></i> 1. Live Constellation
                    </button>
                    <button 
                        onClick={()=>setSubTab('war')} 
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='war'?'bg-amber-500 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <i className="fas fa-award mr-2"></i> 2. WAR Sign-Off
                    </button>
                </div>
                {isCurrent && (
                    <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">
                        Archive Project <i className="fas fa-check-double ml-2"></i>
                    </button>
                )}
            </div>
            
            <div className="p-8 bg-slate-100/50">
                {subTab === 'constellation' && <LiveConstellationView activeProject={project} />}
                {subTab === 'war' && <PhasePostLive activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}

// ==========================================
// 🌌 THE LIVING DIGITAL TWIN CONSTELLATION
// ==========================================
function LiveConstellationView({ activeProject }) {
    const [playbackStep, setPlaybackStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Auto-detect nodes from the approved architecture
    const rawNodes = activeProject?.mapperNodes || [];
    const validNodes = rawNodes.filter(n => n.status !== 'Quoted Only'); // Only show what was actually deployed

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
        const categorize = (type) => {
            const t = String(type).toUpperCase();
            if (['ECS', 'VM', 'CCE', 'ASG'].includes(t)) return 'compute';
            if (['RDS', 'GAUSSDB', 'DB'].includes(t)) return 'database';
            if (['VPC', 'SUBNET', 'VPN', 'NAT', 'EIP', 'ELB', 'CGW'].includes(t)) return 'network';
            return 'storage';
        };

        // Group nodes by category
        const grouped = { compute: [], database: [], network: [], storage: [] };
        validNodes.forEach(n => grouped[categorize(n.type)].push(n));

        // Distribute nodes organically in an orbit around their category hub
        let nodeIndex = 0; // Global sequence for playback
        Object.entries(grouped).forEach(([cat, nodes]) => {
            const hub = hubs[cat];
            const angleStep = (Math.PI * 2) / (nodes.length || 1);
            
            nodes.forEach((n, i) => {
                // Organic scattering: Randomize radius slightly so it looks like a constellation, not a perfect circle
                const radius = 80 + (Math.random() * 50); 
                const angle = i * angleStep + (Math.random() * 0.5); // Slight angle offset
                
                mappedNodes.push({
                    ...n,
                    category: cat,
                    x: hub.x + Math.cos(angle) * radius,
                    y: hub.y + Math.sin(angle) * radius,
                    color: hub.color,
                    icon: hub.icon,
                    sequenceId: nodeIndex++ // To animate them in order
                });
            });
        });

        return { hubs, mappedNodes, cx, cy, width, height, totalNodes: mappedNodes.length };
    }, [validNodes]);

    // Playback Engine
    useEffect(() => {
        let interval;
        if (isPlaying && playbackStep <= graphData.totalNodes) {
            interval = setInterval(() => {
                setPlaybackStep(prev => prev + 1);
            }, 300); // Speed of the deployment simulation
        } else if (playbackStep > graphData.totalNodes) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackStep, graphData.totalNodes]);

    const handleReplay = () => {
        setPlaybackStep(0);
        setIsPlaying(true);
    };

    if (validNodes.length === 0) {
        return (
            <div className="bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 p-16 text-center text-slate-500">
                <i className="fas fa-meteor text-6xl mb-4 text-slate-700"></i>
                <h3 className="font-black text-xl mb-2 text-white">Constellation Offline</h3>
                <p className="font-medium text-sm">No live architecture nodes detected to map.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
                <div>
                    <h3 className="font-black flex items-center gap-3 text-xl text-slate-800">
                        <i className="fas fa-meteor text-indigo-500"></i> Organic Infrastructure Constellation
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Live visual mapping of the final Cloud deployed state.</p>
                </div>
                <button 
                    onClick={handleReplay} 
                    disabled={isPlaying}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-black uppercase tracking-widest text-xs transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isPlaying ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Deploying...</> : <><i className="fas fa-play mr-2"></i> Replay Deployment</>}
                </button>
            </div>

            <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700 relative h-[650px] flex items-center justify-center">
                {/* 🌌 Deep Space Background Elements */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none"></div>
                
                <svg width="100%" height="100%" viewBox={`0 0 ${graphData.width} ${graphData.height}`} className="absolute inset-0 pointer-events-none">
                    
                    {/* Lines connecting Central VPC to 4 Hubs (Only show if at least 1 node exists) */}
                    {playbackStep > 0 && Object.values(graphData.hubs).map((hub, i) => (
                        <line 
                            key={`hub-line-${i}`} x1={graphData.cx} y1={graphData.cy} x2={hub.x} y2={hub.y} 
                            stroke={hub.color} strokeWidth="1" strokeDasharray="4 4" className="opacity-30" 
                        />
                    ))}

                    {/* Lines connecting Hubs to their individual Nodes */}
                    {graphData.mappedNodes.map((n, i) => {
                        if (i >= playbackStep) return null; // Time-lapse visibility
                        const hub = graphData.hubs[n.category];
                        return (
                            <line 
                                key={`node-line-${i}`} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} 
                                stroke={n.color} strokeWidth="1.5" className="opacity-40 animate-pulse" 
                            />
                        );
                    })}
                </svg>

                {/* CENTRAL VPC NODE */}
                {playbackStep > 0 && (
                    <div 
                        className="absolute w-20 h-20 bg-indigo-900 border-2 border-indigo-400 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] z-20 animate-fade-in"
                        style={{ left: graphData.cx - 40, top: graphData.cy - 40 }}
                    >
                        <i className="fas fa-cloud text-indigo-300 text-2xl"></i>
                        <span className="text-[8px] font-black text-white uppercase tracking-widest mt-1">Core VPC</span>
                    </div>
                )}

                {/* THE 4 CATEGORY HUBS */}
                {playbackStep > 0 && Object.values(graphData.hubs).map((hub, i) => (
                    <div 
                        key={`hub-${i}`}
                        className="absolute w-12 h-12 rounded-full flex items-center justify-center z-20 animate-fade-in"
                        style={{ left: hub.x - 24, top: hub.y - 24, backgroundColor: `${hub.color}20`, border: `2px solid ${hub.color}`, boxShadow: `0 0 20px ${hub.color}40` }}
                    >
                        <i className={`fas ${hub.icon} text-lg`} style={{ color: hub.color }}></i>
                        <div className="absolute -bottom-6 w-32 text-center text-[9px] font-black uppercase tracking-widest text-slate-300">{hub.name}</div>
                    </div>
                ))}

                {/* THE RESOURCE NODES (Time-lapsed) */}
                {graphData.mappedNodes.map((n, i) => {
                    if (i >= playbackStep) return null;
                    return (
                        <div 
                            key={`node-${i}`}
                            className="absolute z-30 group cursor-pointer animate-fade-in"
                            style={{ left: n.x - 12, top: n.y - 12 }}
                        >
                            {/* The glowing dot */}
                            <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center hover:scale-125 transition-transform"
                                style={{ backgroundColor: n.color, boxShadow: `0 0 15px ${n.color}80` }}
                            >
                                <i className={`fas ${n.icon} text-[10px] text-white`}></i>
                            </div>

                            {/* Hover Tooltip */}
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-slate-200 px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-max z-50">
                                <div className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1">{n.name}</div>
                                <div className="text-[9px] font-bold text-slate-500">Type: <span style={{ color: n.color }}>{n.type}</span></div>
                                <div className="text-[9px] font-bold text-slate-500">IP/Loc: <span className="font-mono text-slate-700">{n.ip}</span></div>
                            </div>
                        </div>
                    );
                })}

                {/* Playback HUD */}
                <div className="absolute bottom-6 left-6 bg-slate-800/80 backdrop-blur px-6 py-3 rounded-xl border border-slate-700 z-40">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Deployment Sequence</div>
                    <div className="text-xl font-black text-white font-mono">
                        {Math.min(playbackStep, graphData.totalNodes)} <span className="text-slate-500 text-sm">/ {graphData.totalNodes} Nodes</span>
                    </div>
                    <div className="w-48 h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(Math.min(playbackStep, graphData.totalNodes) / graphData.totalNodes) * 100}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 🏆 WELL-ARCHITECTED REVIEW (WAR)
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
        <div className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
                <h3 className="font-black flex items-center gap-3 text-lg"><i className="fas fa-award text-amber-500"></i> Well-Architected Framework Assessment</h3>
                <button onClick={saveContext} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-xs shadow-md hover:bg-amber-600 transition-colors uppercase tracking-widest">Sign & Save</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Resilience (HA/DR)</label><span className="text-blue-600 font-black text-sm">{r}%</span></div><input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Security & Compliance</label><span className="text-rose-600 font-black text-sm">{s}%</span></div><input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Performance Efficiency</label><span className="text-purple-600 font-black text-sm">{p}%</span></div><input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Cost Optimization</label><span className="text-emerald-600 font-black text-sm">{c}%</span></div><input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Operational Excellence</label><span className="text-slate-600 font-black text-sm">{o}%</span></div><input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer" /></div>
                </div>
                <div className={`p-10 rounded-3xl border-4 flex flex-col items-center justify-center text-center ${isCertified ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-slate-50 border-slate-300'}`}>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Architecture Final Score</h4>
                    <div className={`text-8xl font-black tracking-tighter ${isCertified ? 'text-amber-500' : 'text-slate-700'}`}>{score}</div>
                    <div className={`mt-8 px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs border-2 ${isCertified ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>{isCertified ? 'Certified & Approved' : 'Remediation Required'}</div>
                </div>
            </div>
        </div>
    );
}
