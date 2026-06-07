import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('constellation');

    return (
        <div className="animate-fade-in pb-12">
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={()=>setSubTab('constellation')} 
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab==='constellation'?'bg-indigo-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <i className="fas fa-meteor mr-2"></i> 1. Live Constellation
                    </button>
                    <button 
                        onClick={()=>setSubTab('hub')} 
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab==='hub'?'bg-blue-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <i className="fas fa-stream mr-2"></i> 2. Command Center
                    </button>
                    <button 
                        onClick={()=>setSubTab('tam')} 
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab==='tam'?'bg-purple-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <i className="fas fa-headset mr-2"></i> 3. TAM Governance
                    </button>
                    <button 
                        onClick={()=>setSubTab('war')} 
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab==='war'?'bg-amber-500 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <i className="fas fa-award mr-2"></i> 4. WAR Sign-Off
                    </button>
                </div>
                {isCurrent && (
                    <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95 whitespace-nowrap">
                        Archive Project <i className="fas fa-check-double ml-2"></i>
                    </button>
                )}
            </div>
            
            <div className="px-8">
                {subTab === 'constellation' && <LiveConstellationView activeProject={project} />}
                {subTab === 'hub' && <ExecutionHubView project={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'tam' && <TAMHubView project={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'war' && <PhasePostLive activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}

// ==========================================
// 🌌 1. THE LIVING DIGITAL TWIN CONSTELLATION
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

        let globalSeqIndex = 0;
        liveNodes.forEach((n) => {
            const hub = hubs[n.category];
            const catNodes = grouped[n.category];
            const catIndex = catNodes.findIndex(x => x.id === n.id);
            
            const angleStep = (Math.PI * 2) / (catNodes.length || 1);
            const radius = 80 + (Math.random() * 50); 
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
                    <button onClick={handleSetLive} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <i className="fas fa-eye mr-2"></i> Live State
                    </button>
                    <button onClick={handleSetReplay} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'replay' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <i className="fas fa-history mr-2"></i> Historical Playback
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700 relative h-[650px] flex items-center justify-center">
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
// 🚀 2. DELIVERY COMMAND CENTER
// ==========================================
function ExecutionHubView({ project, onUpdateProject }) {
    const [comms, setComms] = useState(project.comms || { bridge: "", chat: "", notes: "" });
    useEffect(() => { setComms(project.comms || { bridge: "", chat: "", notes: "" }); }, [project]);
    
    const handleSaveComms = () => { 
        onUpdateProject(project.id, 'comms', comms); 
        alert("Command Center Links Updated"); 
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-blue-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-sm tracking-wide text-blue-900"><i className="fas fa-satellite-dish text-blue-600 mr-2"></i> Delivery Command Center</h3>
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mt-1">Centralized Execution Communications</p>
                    </div>
                    <button onClick={handleSaveComms} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-save mr-2"></i>Save Links</button>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white">
                    <div className="col-span-2 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Persistent Bridge Link (Teams/Zoom/Meet)</label>
                            <div className="flex gap-2">
                                <input type="text" value={comms.bridge} onChange={e=>setComms({...comms, bridge: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50" placeholder="https://teams.microsoft.com/..." />
                                <a href={comms.bridge || '#'} target="_blank" rel="noreferrer" className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-colors"><i className="fas fa-video"></i> Join</a>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Group Chat / Slack / WhatsApp Link</label>
                            <div className="flex gap-2">
                                <input type="text" value={comms.chat} onChange={e=>setComms({...comms, chat: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50" placeholder="https://chat.whatsapp.com/..." />
                                <a href={comms.chat || '#'} target="_blank" rel="noreferrer" className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-colors"><i className="fas fa-comment-dots"></i> Chat</a>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Execution Notes / Escalation Path</label>
                        <textarea value={comms.notes} onChange={e=>setComms({...comms, notes: e.target.value})} className="w-full h-32 p-4 border border-blue-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-blue-50/50 custom-scrollbar leading-relaxed resize-none shadow-inner" placeholder="PM Name: Maria&#10;Escalation: CIO (john@corp.com)"></textarea>
                    </div>
                </div>
            </div>
            <SingleProjectGantt project={project} />
        </div>
    )
}

function SingleProjectGantt({ project }) {
    const timelineData = useMemo(() => {
        if(!project.kickoff || !project.date || project.kickoff==='Pending' || project.date==='TBD') return null;
        const start = new Date(project.kickoff); const end = new Date(project.date);
        if(isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
        const pad = 10 * 24 * 60 * 60 * 1000;
        const min = start.getTime() - pad; const max = end.getTime() + pad; const total = max - min;
        const pStart = ((start.getTime() - min) / total) * 100; const pWidth = ((end.getTime() - start.getTime()) / total) * 100;
        return { pStart, pWidth, startStr: formatShortDate(project.kickoff), endStr: formatShortDate(project.date) };
    }, [project]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in">
            <h3 className="font-black text-sm text-slate-800 mb-6 flex items-center uppercase tracking-widest"><i className="fas fa-stream text-blue-500 mr-3"></i> Project Timeline Baseline</h3>
            {!timelineData ? <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-xs">Valid Kickoff and Go-Live dates required to render timeline.</div> : (
                <div className="overflow-x-auto w-full">
                    <div className="min-w-[800px] relative h-[120px]">
                        <div className="absolute inset-0 flex justify-between opacity-20 pointer-events-none">{[...Array(6)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                        <div className="relative z-10 pt-8">
                            <div className="h-12 relative bg-slate-50 border-y border-transparent transition-colors rounded-xl shadow-inner">
                                <div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-4" style={{ left: `${timelineData.pStart}%` }}>{timelineData.startStr}</div>
                                <div className={`absolute top-1 bottom-1 rounded-lg shadow-md border-2 flex flex-col justify-center px-4 overflow-hidden ${project.health === 'Green' ? 'bg-emerald-500 border-emerald-600 text-white' : project.health === 'Red' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`} style={{ left: `${timelineData.pStart}%`, width: `${timelineData.pWidth}%`, minWidth:'80px'}}>
                                    <span className="text-xs font-black truncate">{project.progress} Complete</span>
                                </div>
                                <div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-800 top-1/2 -translate-y-1/2 pl-4" style={{ left: `${timelineData.pStart + timelineData.pWidth}%` }}>{timelineData.endStr}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ==========================================
// 🎧 3. TAM SERVICE GOVERNANCE
// ==========================================
function TAMHubView({ project, onUpdateProject }) {
    const safeTamData = project.tamData || { 
        supportPlan: "Enterprise", welinkGroup: "", 
        tickets: [], 
        workshops: [
            {id: 1, name: "Cloud Console 101", done: false}, 
            {id: 2, name: "IAM & Security Best Practices", done: false}, 
            {id: 3, name: "Billing & Cost Center Setup", done: false}
        ] 
    };
    const [tamData, setTamData] = useState(safeTamData);
    
    useEffect(() => { setTamData(project.tamData || safeTamData); }, [project]);
    
    const handleSave = () => { 
        onUpdateProject(project.id, 'tamData', tamData); 
        alert("TAM Operations Data Saved."); 
    };
    
    const toggleWorkshop = (id) => { 
        const w = (tamData.workshops||[]).map(x => x.id === id ? {...x, done: !x.done} : x); 
        setTamData({...tamData, workshops: w}); 
    };
    
    const addTicket = () => { 
        const id = prompt("Ticket ID (e.g., SR-123):"); 
        if(!id) return; 
        const title = prompt("Issue Title:"); 
        setTamData({...tamData, tickets: [{id, title, sev: 'Medium', status: 'Open'}, ...(tamData.tickets||[])]}); 
    };

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-headset text-purple-400 mr-3"></i> TAM Service Governance</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Customer Enablement & Escalation Routing</p>
                    </div>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">
                        <i className="fas fa-save mr-2"></i> Save Operations Data
                    </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    
                    {/* Card 1: Escalation & Plans */}
                    <div className="p-8 bg-slate-50 space-y-6">
                        <div><h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-widest"><i className="fas fa-sitemap text-slate-400 mr-2"></i> Escalation Pathways</h4></div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Contracted Support Plan</label>
                            <select value={tamData.supportPlan} onChange={e=>setTamData({...tamData, supportPlan: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-purple-500 bg-white cursor-pointer shadow-sm">
                                <option>Developer</option><option>Business</option><option>Enterprise</option><option>Premier</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Internal WeLink Group (NOC/Escalations)</label>
                            <div className="flex gap-2">
                                <input type="text" value={tamData.welinkGroup} onChange={e=>setTamData({...tamData, welinkGroup: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-purple-500 bg-white shadow-sm" placeholder="welink://group/12345" />
                                <a href={tamData.welinkGroup || '#'} target="_blank" rel="noreferrer" className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center transition-colors"><i className="fas fa-external-link-alt"></i></a>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">External Customer Comms (WhatsApp/Teams)</label>
                            <input type="text" value={project.comms?.chat || ''} disabled className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-500 bg-slate-100 cursor-not-allowed shadow-inner" title="Edit in Command Center tab" placeholder="No link provided in Command Center" />
                        </div>
                    </div>

                    {/* Card 2: Enablement Tracker */}
                    <div className="p-8 bg-white space-y-6">
                        <div>
                            <h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-widest"><i className="fas fa-graduation-cap text-purple-500 mr-2"></i> Cloud Enablement Tracker</h4>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-4">Tracking hands-on workshops prevents post-live churn and documents TAM educational effort.</p>
                        </div>
                        
                        <div className="space-y-3">
                            {(tamData.workshops||[]).map(w => (
                                <label key={w.id} className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors shadow-sm ${w.done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}`}>
                                    <input type="checkbox" checked={w.done} onChange={()=>toggleWorkshop(w.id)} className="w-5 h-5 accent-emerald-500" />
                                    <span className={`font-bold text-xs ${w.done ? 'text-emerald-800 line-through opacity-75' : 'text-slate-700'}`}>{w.name}</span>
                                </label>
                            ))}
                            <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold hover:border-purple-400 hover:text-purple-600 text-[10px] uppercase tracking-widest transition-colors" onClick={() => {
                                const name = prompt("Enter custom workshop name:");
                                if(name) setTamData({...tamData, workshops: [...tamData.workshops, {id: Date.now(), name, done: false}]});
                            }}>
                                <i className="fas fa-plus mr-2"></i> Add Workshop
                            </button>
                        </div>
                    </div>

                    {/* Card 3: Tickets */}
                    <div className="p-8 bg-slate-50 flex flex-col h-full min-h-[400px]">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-3 mb-4 shrink-0">
                            <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest"><i className="fas fa-ticket-alt text-rose-500 mr-2"></i> Migration Support Tickets</h4>
                            <button onClick={addTicket} className="text-[10px] font-black uppercase tracking-widest text-purple-700 hover:text-white bg-purple-100 hover:bg-purple-600 px-3 py-1.5 rounded-lg border border-purple-200 hover:border-purple-700 transition-colors shadow-sm"><i className="fas fa-plus mr-1"></i> Log Ticket</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {(!tamData.tickets || tamData.tickets.length === 0) ? (
                                <div className="p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl bg-white text-xs shadow-sm">No active escalations.</div> 
                            ) : (
                                tamData.tickets.map((t,i) => (
                                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-purple-300 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-[10px] text-slate-500 font-bold group-hover:text-purple-600 transition-colors">{t.id}</div>
                                            <div className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 tracking-widest">{t.status}</div>
                                        </div>
                                        <div className="font-bold text-xs text-slate-800 leading-snug">{t.title}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 🏆 4. WELL-ARCHITECTED REVIEW (WAR)
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
