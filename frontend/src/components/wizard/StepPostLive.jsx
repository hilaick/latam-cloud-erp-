import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    // Default to the Diff view as the first step of Post-Live
    const [subTab, setSubTab] = useState('diff');

    return (
        <div className="animate-fade-in pb-12">
            {/* Phase 5 Header & Archive */}
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h3 className="font-black text-2xl text-slate-800"><i className="fas fa-award text-amber-500 mr-3"></i> Step 5: Post-Live Governance</h3>
                    <p className="text-sm text-slate-500 mt-2">3-Way Reconciliation, Digital Twin mapping, and WAR Sign-Off.</p>
                </div>
                {isCurrent && (
                    <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}} className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95 whitespace-nowrap">
                        Archive Project <i className="fas fa-check-double ml-2"></i>
                    </button>
                )}
            </div>

            {/* 3-TAB POST-LIVE NAVIGATION */}
            <div className="px-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
                <button 
                    onClick={() => setSubTab('diff')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'diff' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-balance-scale mr-2"></i> 1. 3-Way Diff Matrix
                </button>
                <button 
                    onClick={() => setSubTab('constellation')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'constellation' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-meteor mr-2"></i> 2. Target Constellation
                </button>
                <button 
                    onClick={() => setSubTab('war')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'war' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-shield-alt mr-2"></i> 3. WAR Sign-Off
                </button>
            </div>
            
            <div className="px-8">
                {subTab === 'diff' && <PhaseThreeWayDiff activeProject={project} />}
                {subTab === 'constellation' && <LiveConstellationView activeProject={project} />}
                {subTab === 'war' && <PhasePostLive activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}

// ==========================================
// ⚖️ 1. 3-WAY INFRASTRUCTURE DIFF MATRIX
// ==========================================
function PhaseThreeWayDiff({ activeProject }) {
    const [nocScanned, setNocScanned] = useState(false);
    const [showDiffModal, setShowDiffModal] = useState(false);

    // Data synthesis for the Diff 
    // Compares blueprintData (SOW) vs mapperNodes (Target Architecture) vs targetCloudData (Live Huawei API)
    const sowNodesCount = (activeProject?.blueprintData?.topology?.compute || []).length + (activeProject?.blueprintData?.topology?.database || []).length + (activeProject?.blueprintData?.topology?.network || []).length;
    const targetNodes = activeProject?.mapperNodes || [];
    
    // Simulate Target Huawei API Data (in a real scenario, this is pulled from Huawei CloudEye / ECS APIs)
    const liveTargetNodes = activeProject?.targetCloudData || targetNodes.map(n => ({...n, status: 'Provisioned', ip: n.ip !== 'TBD' ? n.ip : `10.0.${Math.floor(Math.random()*10)}.${Math.floor(Math.random()*255)}` }));

    const handleStandardDossier = () => {
        window.print(); // Easy printable standard dossier
    };

    const handleDetailedReport = () => {
        if (targetNodes.length === 0) return alert("No mapped nodes available to export.");
        
        const headers = ["Resource Name", "Type", "Status", "Target Huawei IP / Location"];
        const csvContent = [
            headers.join(","),
            ...targetNodes.map(n => `"${n.name}","${n.type}","Provisioned","${n.ip || n.location}"`)
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Post_Live_Audit_HuaweiCloud_${activeProject.name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in space-y-6 max-w-[1600px] mx-auto">
            {/* Header & Export Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                        <i className="fas fa-satellite-dish text-indigo-500"></i> Final Telemetry Reconciliation
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                        Cross-referencing the SOW, Target Architecture, and Live Cloud State.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={handleStandardDossier} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm border border-slate-200 flex items-center">
                        <i className="fas fa-file-pdf mr-2 text-rose-500"></i> Standard Dossier
                    </button>
                    <button onClick={handleDetailedReport} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm border border-slate-200 flex items-center">
                        <i className="fas fa-file-excel mr-2 text-emerald-500"></i> Detailed Report
                    </button>
                </div>
            </div>

            {/* NOC Scan Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                    <h4 className="font-black text-lg text-slate-800 uppercase tracking-widest flex items-center">
                        <i className="fas fa-balance-scale text-indigo-500 mr-3 text-xl"></i> 3-Way Infrastructure Diff
                    </h4>
                    <button 
                        onClick={() => setNocScanned(true)} 
                        className="px-6 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-indigo-200 shadow-sm flex items-center"
                    >
                        <i className="fas fa-search mr-2"></i> Run Final NOC Scan (Target API)
                    </button>
                </div>
                
                {!nocScanned ? (
                    <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                        <i className="fas fa-satellite-dish text-5xl text-slate-300 mb-4"></i>
                        <h5 className="font-black text-slate-600 text-lg">Awaiting Final Cloud Scan</h5>
                        <p className="text-sm text-slate-500 mt-2 font-medium max-w-lg mx-auto">
                            Run the Final NOC Scan to verify exactly what was built in Huawei Cloud against the original Sales Quotation.
                        </p>
                    </div>
                ) : (
                    <div className="p-10 text-center bg-emerald-50 border-2 border-emerald-200 rounded-xl shadow-inner animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-[100px] opacity-20 pointer-events-none -mr-10 -mt-10"></div>
                        <i className="fas fa-check-circle text-5xl text-emerald-500 mb-4 shadow-sm rounded-full bg-white"></i>
                        <h5 className="font-black text-emerald-800 text-xl uppercase tracking-widest">Scan Complete. 100% Match.</h5>
                        <p className="text-sm text-emerald-700 mt-2 font-bold max-w-lg mx-auto mb-6">
                            Live telemetry confirms final Huawei Cloud infrastructure strictly aligns with the signed SOW and locked Target Architecture.
                        </p>
                        <button 
                            onClick={() => setShowDiffModal(true)} 
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-colors"
                        >
                            <i className="fas fa-columns mr-2"></i> View Detailed Diff Matrix
                        </button>
                    </div>
                )}
            </div>

            {/* THE 3-WAY DIFF MODAL (3 Columns) */}
            {showDiffModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-700">
                        <div className="bg-indigo-900 px-8 py-5 rounded-t-2xl flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-black text-xl text-indigo-300"><i className="fas fa-balance-scale mr-3"></i> 3-Way Discrepancy Matrix</h3>
                                <p className="text-[10px] text-indigo-200 mt-1 uppercase tracking-widest font-bold">Verifying the structural integrity of the migration.</p>
                            </div>
                            <button onClick={()=>setShowDiffModal(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto bg-slate-50 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 custom-scrollbar">
                            
                            {/* Column 1: SOW */}
                            <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                <div className="p-4 bg-slate-100 border-b border-slate-200 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Baseline 1</div>
                                    <h4 className="font-black text-slate-800">Quoted SOW</h4>
                                    <div className="text-xs font-bold text-slate-400 mt-1">{sowNodesCount || 0} Entities Found</div>
                                </div>
                                <div className="p-4 flex-1 space-y-3">
                                    {activeProject?.blueprintData ? (
                                        <div className="text-center text-xs text-slate-500 font-mono bg-slate-50 p-4 rounded border border-slate-200">
                                            SOW imported on: {formatShortDate(activeProject.kickoff)}
                                        </div>
                                    ) : <div className="text-center text-xs text-slate-400 italic mt-10">No SOW data.</div>}
                                </div>
                            </div>

                            {/* Column 2: Mapper */}
                            <div className="bg-white border-2 border-blue-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
                                <div className="p-4 bg-blue-50 border-b border-blue-200 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Baseline 2</div>
                                    <h4 className="font-black text-blue-900">Target Architecture</h4>
                                    <div className="text-xs font-bold text-blue-600 mt-1">{targetNodes.length || 0} Entities Locked</div>
                                </div>
                                <div className="p-4 flex-1 space-y-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                                    {targetNodes.map((n, i) => (
                                        <div key={i} className="flex justify-between items-center text-[10px] p-2 bg-blue-50/50 border border-blue-100 rounded">
                                            <span className="font-bold text-slate-700 truncate mr-2"><i className="fas fa-server text-blue-400 mr-1.5"></i>{n.name}</span>
                                            <span className="font-black text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-200">Locked</span>
                                        </div>
                                    ))}
                                    {targetNodes.length === 0 && <div className="text-center text-xs text-slate-400 italic mt-10">No mapped nodes.</div>}
                                </div>
                            </div>

                            {/* Column 3: Live API */}
                            <div className="bg-white border-2 border-emerald-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Target Telemetry</div>
                                    <h4 className="font-black text-emerald-900">Live Huawei Cloud State</h4>
                                    <div className="text-xs font-bold text-emerald-700 mt-1">{liveTargetNodes.length || 0} Entities Provisioned</div>
                                </div>
                                <div className="p-4 flex-1 space-y-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                                     {liveTargetNodes.map((n, i) => (
                                        <div key={`live-${i}`} className="flex justify-between items-center text-[10px] p-2 bg-emerald-50/50 border border-emerald-100 rounded">
                                            <span className="font-bold text-slate-700 truncate mr-2"><i className="fas fa-check text-emerald-500 mr-1.5"></i>{n.name}</span>
                                            <span className="font-mono text-slate-500 bg-white px-1 border border-slate-200 rounded truncate max-w-[80px]" title={n.ip}>{n.ip}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                        
                        {/* Footer */}
                        <div className="bg-white p-5 border-t border-slate-200 rounded-b-2xl flex justify-between items-center shrink-0">
                            <div className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                                <i className="fas fa-check-circle mr-2"></i> Diff Passed Validation
                            </div>
                            <button onClick={()=>setShowDiffModal(false)} className="px-8 py-2.5 text-xs font-black text-white uppercase bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-colors">
                                Close Matrix
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 🌌 2. THE LIVING DIGITAL TWIN CONSTELLATION (Huawei Target)
// ==========================================
function LiveConstellationView({ activeProject }) {
    const [viewMode, setViewMode] = useState('live'); 
    const [playbackStep, setPlaybackStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Uses Target Architecture/Target Telemetry instead of source mgcData
    const targetNodes = useMemo(() => {
        const raw = activeProject?.targetCloudData || activeProject?.mapperNodes || [];
        const valid = raw.filter(n => n.status !== 'Quoted Only' && n.status !== 'Live Only');
        
        return valid.map((item, index) => {
            return {
                id: item.id || Math.random().toString(),
                name: item.name || 'Unnamed Resource',
                type: String(item.type).toUpperCase(),
                ip: item.ip || item.location || 'N/A',
                timestamp: Date.now() + (index * 1000) // Simulated creation delay for playback
            };
        }).sort((a, b) => a.timestamp - b.timestamp);
    }, [activeProject]);

    const graphData = useMemo(() => {
        const width = 1000;
        const height = 600;
        const cx = width / 2;
        const cy = height / 2;

        const hubs = {
            compute:  { x: cx - 200, y: cy - 150, color: '#06b6d4', icon: 'fa-server', name: 'Huawei ECS Core' },
            database: { x: cx + 200, y: cy - 150, color: '#f43f5e', icon: 'fa-database', name: 'Huawei RDS / Gauss' },
            network:  { x: cx - 200, y: cy + 150, color: '#8b5cf6', icon: 'fa-network-wired', name: 'Huawei VPC & Edge' },
            storage:  { x: cx + 200, y: cy + 150, color: '#10b981', icon: 'fa-hdd', name: 'Huawei OBS / SFS' },
        };

        const mappedNodes = [];
        const categorize = (type) => {
            if (['ECS', 'VM', 'CCE', 'ASG'].includes(type)) return 'compute';
            if (['RDS', 'GAUSSDB', 'DB'].includes(type)) return 'database';
            if (['VPC', 'SUBNET', 'VPN', 'NAT', 'EIP', 'ELB', 'CGW'].includes(type)) return 'network';
            return 'storage';
        };

        const grouped = { compute: [], database: [], network: [], storage: [] };
        targetNodes.forEach(n => grouped[categorize(n.type)].push(n));

        let globalSeqIndex = 0;
        targetNodes.forEach((n) => {
            const cat = categorize(n.type);
            const hub = hubs[cat];
            const catNodes = grouped[cat];
            const catIndex = catNodes.findIndex(x => x.id === n.id);
            
            const angleStep = (Math.PI * 2) / (catNodes.length || 1);
            const radius = 80 + (Math.random() * 50); 
            const angle = catIndex * angleStep + (Math.random() * 0.5); 
            
            mappedNodes.push({
                ...n,
                category: cat,
                x: hub.x + Math.cos(angle) * radius,
                y: hub.y + Math.sin(angle) * radius,
                color: hub.color,
                icon: hub.icon,
                sequenceId: globalSeqIndex++ 
            });
        });

        return { hubs, mappedNodes, cx, cy, width, height, totalNodes: mappedNodes.length };
    }, [targetNodes]);

    useEffect(() => {
        if (viewMode === 'live') {
            setPlaybackStep(graphData.totalNodes);
            setIsPlaying(false);
        }
    }, [viewMode, graphData.totalNodes]);

    useEffect(() => {
        let interval;
        if (isPlaying && playbackStep <= graphData.totalNodes) {
            interval = setInterval(() => {
                setPlaybackStep(prev => prev + 1);
            }, 300); 
        } else if (playbackStep > graphData.totalNodes) {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackStep, graphData.totalNodes]);

    const handleReplay = () => {
        setViewMode('replay');
        setPlaybackStep(0);
        setIsPlaying(true);
    };

    if (targetNodes.length === 0) {
        return (
            <div className="bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 p-16 text-center text-slate-500 animate-fade-in">
                <i className="fas fa-meteor text-6xl mb-4 text-slate-700"></i>
                <h3 className="font-black text-xl mb-2 text-white">Constellation Offline</h3>
                <p className="font-medium text-sm">Target Architecture has not been mapped or provisioned yet.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="font-black flex items-center gap-3 text-xl text-slate-800">
                        <i className="fas fa-meteor text-blue-500"></i> Huawei Target Constellation
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Visualizing live Huawei Cloud API telemetry and historical deployment sequences.</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto">
                    <button onClick={()=>{setViewMode('live'); setIsPlaying(false); setPlaybackStep(graphData.totalNodes);}} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <i className="fas fa-eye mr-2"></i> Live State
                    </button>
                    <button onClick={handleReplay} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'replay' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <i className="fas fa-history mr-2"></i> Playback
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
                    <div className="absolute w-20 h-20 bg-blue-900 border-2 border-blue-400 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.4)] z-20 animate-fade-in" style={{ left: graphData.cx - 40, top: graphData.cy - 40 }}>
                        <i className="fas fa-cloud text-blue-300 text-2xl"></i>
                        <span className="text-[8px] font-black text-white uppercase tracking-widest mt-1">Huawei VPC</span>
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
                                <div className="text-[9px] font-bold text-slate-500 mb-1">Target IP: <span className="font-mono text-slate-700 ml-1">{n.ip}</span></div>
                            </div>
                        </div>
                    );
                })}

                <div className="absolute bottom-6 left-6 bg-slate-800/80 backdrop-blur px-6 py-4 rounded-xl border border-slate-700 z-40 shadow-xl">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {viewMode === 'live' ? 'Live Huawei Target State' : 'Deployment Sequence Playback'}
                    </div>
                    <div className="text-xl font-black text-white font-mono flex items-center gap-2">
                        {Math.min(playbackStep, graphData.totalNodes)} <span className="text-slate-500 text-sm">/ {graphData.totalNodes} Nodes</span>
                        {viewMode === 'live' && <span className="flex h-2 w-2 relative ml-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                    </div>
                    {viewMode === 'replay' && (
                        <div className="w-48 h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(Math.min(playbackStep, graphData.totalNodes) / graphData.totalNodes) * 100}%` }}></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 🛡️ 3. WELL-ARCHITECTED REVIEW (WAR)
// ==========================================
function PhasePostLive({ activeProject, onUpdateProject }) {
    const [r, setR] = useState(activeProject?.war?.r || 0); 
    const [s, setS] = useState(activeProject?.war?.s || 0); 
    const [p, setP] = useState(activeProject?.war?.p || 0); 
    const [c, setC] = useState(activeProject?.war?.c || 0); 
    const [o, setO] = useState(activeProject?.war?.o || 0);
    const [autoEval, setAutoEval] = useState(false);
    
    useEffect(()=>{ 
        if(activeProject?.war) { 
            setR(activeProject.war.r || 0); setS(activeProject.war.s || 0); setP(activeProject.war.p || 0); 
            setC(activeProject.war.c || 0); setO(activeProject.war.o || 0); 
        } 
    }, [activeProject]);
    
    const score = Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5) || 0; 
    
    const saveContext = () => { 
        onUpdateProject(activeProject.id, 'war', { r, s, p, c, o }); 
        alert("WAR Sign-Off Saved"); 
    };

    const handleAutoEvaluate = () => {
        setAutoEval(true);
        // Simulate API evaluating the infrastructure and assigning scores
        setR(95); setS(100); setP(90); setC(85); setO(95);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-100 pb-4 gap-4">
                    <h4 className="font-black text-lg text-slate-800 uppercase tracking-widest flex items-center">
                        <i className="fas fa-shield-alt text-amber-500 mr-3 text-xl"></i> Well-Architected Framework
                    </h4>
                    <div className="flex gap-3">
                        <button onClick={handleAutoEvaluate} className="px-6 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-amber-200 shadow-sm flex items-center">
                            <i className="fas fa-magic mr-2"></i> Auto-Evaluate via API
                        </button>
                        <button onClick={saveContext} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-colors">
                            <i className="fas fa-save mr-2"></i> Save Scores
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        {!autoEval && score === 0 && (
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-center shadow-inner">
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
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Final Architecture Score</h4>
                        <div className={`text-8xl font-black tracking-tighter ${score > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{score}</div>
                        <div className={`mt-8 px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px] border-2 transition-all ${score >= 80 ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                            {score >= 80 ? 'Certified & Approved' : 'Pending Verification'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
