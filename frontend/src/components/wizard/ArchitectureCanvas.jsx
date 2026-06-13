import React, { useState, useMemo, useRef, useEffect } from 'react';

export default function ArchitectureCanvas({ title, nodes = [], onNodeClick, regionFilter }) {
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    
    // Independent collapse states for granular control
    const [collapsedVpcs, setCollapsedVpcs] = useState({});
    const [collapsedSgs, setCollapsedSgs] = useState({});
    const [collapsedSubnets, setCollapsedSubnets] = useState({});

    const handleZoom = (factor) => setZoom(prev => Math.min(Math.max(0.4, prev + factor), 2.5));
    const handleResetZoom = () => setZoom(1);

    const toggleState = (setter, key, e) => {
        e.stopPropagation();
        setter(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                alert(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Listen for Escape key to update fullscreen state
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // 🚨 STRICT HIERARCHY: REGION -> VPC -> [SGs, SUBNETS -> WORKLOADS]
    const { edge, vpcsMap, regional, global, eips } = useMemo(() => {
        const edge = []; const regional = []; const global = []; const eips = [];
        const vpcsMap = {}; 

        // 1. Map Explicit VPCs first
        nodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            if (String(n.type).toUpperCase() === 'VPC') {
                vpcsMap[n.name] = { definition: n, subnets: {}, sgs: [] };
            }
        });

        // Ensure a fallback VPC exists if resources are mapped without an explicit VPC node
        if (Object.keys(vpcsMap).length === 0 && nodes.length > 0) {
            vpcsMap['Default-VPC'] = { definition: null, subnets: {}, sgs: [] };
        }

        // 2. Map everything else into the hierarchy
        nodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = n.location || 'Default-Subnet';

            if (type === 'VPC') return; // Handled

            if (['EIP'].includes(type)) {
                eips.push(n);
            } else if (['VPN', 'CGW', 'VPN-CONN', 'ELB', 'NAT'].includes(type)) {
                edge.push(n);
            } else if (['CBR', 'CCE'].includes(type)) {
                regional.push(n);
            } else if (['OBS', 'STORAGE'].includes(type) || loc === 'Global') {
                global.push(n);
            } else if (type === 'SG' || type.includes('SECURITY')) {
                const vpcKey = Object.keys(vpcsMap).find(k => loc.includes(k)) || Object.keys(vpcsMap)[0];
                if (vpcKey) vpcsMap[vpcKey].sgs.push(n);
            } else {
                let subnetName = type === 'SUBNET' ? n.name : loc;
                const vpcKey = Object.keys(vpcsMap).find(k => loc.includes(k)) || Object.keys(vpcsMap)[0];

                if (vpcKey) {
                    if (!vpcsMap[vpcKey].subnets[subnetName]) {
                        vpcsMap[vpcKey].subnets[subnetName] = { definition: null, resources: [] };
                    }

                    if (type === 'SUBNET') vpcsMap[vpcKey].subnets[subnetName].definition = n;
                    else vpcsMap[vpcKey].subnets[subnetName].resources.push(n);
                }
            }
        });
        return { edge, vpcsMap, regional, global, eips };
    }, [nodes, regionFilter]);

    // Huawei-Native Color Aesthetics and Categories
    const getVisuals = (type) => {
        const t = String(type).toUpperCase();
        if (t.includes('ECS') || t.includes('VM')) return { icon: 'fa-server', bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-200', lBg: 'bg-rose-50', category: 'Compute Service' }; 
        if (t.includes('RDS') || t.includes('DB')) return { icon: 'fa-database', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-300', lBg: 'bg-rose-50', category: 'Database Service' }; 
        if (t.includes('VPN') || t.includes('CGW')) return { icon: 'fa-network-wired', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-200', lBg: 'bg-purple-50', category: 'VPN Gateway' }; 
        if (t.includes('EIP')) return { icon: 'fa-wifi', bg: 'bg-lime-500', text: 'text-lime-600', border: 'border-lime-200', lBg: 'bg-lime-50', category: 'Public IP' }; 
        if (t.includes('NAT')) return { icon: 'fa-route', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-200', lBg: 'bg-indigo-50', category: 'NAT Gateway' }; 
        if (t.includes('OBS') || t.includes('STORAGE')) return { icon: 'fa-cloud-upload-alt', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', lBg: 'bg-emerald-50', category: 'Object Storage' }; 
        if (t.includes('CBR') || t.includes('BACKUP')) return { icon: 'fa-shield-alt', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', lBg: 'bg-blue-50', category: 'Backup Vault' }; 
        if (t.includes('ELB') || t.includes('LOADBALANCER')) return { icon: 'fa-sitemap', bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-200', lBg: 'bg-sky-50', category: 'Load Balancer' }; 
        if (t.includes('CCE') || t.includes('K8S')) return { icon: 'fa-cubes', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', lBg: 'bg-blue-50', category: 'Cloud Container Engine' }; 
        return { icon: 'fa-cube', bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-200', lBg: 'bg-slate-50', category: 'Cloud Resource' };
    };

    const getStatusBorder = (status) => {
        if(status === 'Matched') return 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
        if(status === 'Live Only') return 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] border-dashed';
        if(status === 'Quoted Only') return 'border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] opacity-70';
        if(status === 'Manual') return 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]';
        return 'border-transparent shadow-sm';
    };

    const ResourceCard = ({ n }) => {
        const v = getVisuals(n.type);
        return (
            <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white border ${getStatusBorder(n.status)} rounded-xl p-2.5 flex items-center gap-3 w-56 shrink-0 relative ${onNodeClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-blue-400 transition-all' : ''}`}>
                <div className={`w-10 h-10 rounded-lg ${v.lBg} ${v.text} flex items-center justify-center text-lg border ${v.border} shrink-0`}>
                    <i className={`fas ${v.icon}`}></i>
                </div>
                <div className="overflow-hidden flex-1">
                    <div className="text-[11px] font-black text-slate-800 truncate" title={n.name}>{n.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">{n.type}</div>
                    <div className="text-[8px] font-bold text-blue-600 truncate mt-0.5">{v.category} {n.ip && n.ip !== 'N/A' && n.ip !== 'TBD' ? `| ${n.ip}` : ''}</div>
                </div>
            </div>
        );
    };

    const displayRegion = regionFilter === 'All' ? 'Cross-Region View' : regionFilter || 'la-south-2';

    return (
        <div ref={containerRef} className={`w-full h-full flex flex-col relative overflow-hidden bg-[#f8fafc] ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
            
            {/* Header Controls - Responsive on Mobile */}
            <div className="absolute top-2 left-2 md:top-4 md:left-4 right-2 md:right-auto bg-white/90 backdrop-blur-sm border border-slate-200 px-3 md:px-5 py-2 md:py-3 rounded-xl shadow-sm z-20 flex justify-between md:justify-start items-center gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <i className="fas fa-sitemap text-indigo-500 text-xl md:text-2xl hidden sm:block"></i>
                    <div>
                        <h4 className="font-black text-slate-800 text-xs md:text-sm leading-none truncate max-w-[150px] md:max-w-none">{title}</h4>
                        <div className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Region: {displayRegion}</div>
                    </div>
                </div>
                <button onClick={toggleFullscreen} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors md:hidden">
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                </button>
            </div>

            {/* Desktop Fullscreen Button */}
            <div className="absolute top-4 right-4 z-20 hidden md:block">
                <button onClick={toggleFullscreen} className="bg-white/90 backdrop-blur-sm border border-slate-300 p-2.5 rounded-lg shadow-sm text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors font-black text-xs" title="Toggle Fullscreen">
                    <i className={`fas ${isFullscreen ? 'fa-compress mr-2' : 'fa-expand mr-2'}`}></i> 
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg z-20 flex overflow-hidden">
                <button onClick={()=>handleZoom(-0.2)} className="px-3 md:px-4 py-2 text-slate-600 hover:bg-slate-100 font-black transition-colors"><i className="fas fa-search-minus"></i></button>
                <div className="px-2 md:px-3 py-2 bg-slate-50 border-l border-r border-slate-200 text-[10px] md:text-xs font-black text-slate-700 w-12 md:w-16 text-center flex items-center justify-center">{Math.round(zoom * 100)}%</div>
                <button onClick={()=>handleZoom(0.2)} className="px-3 md:px-4 py-2 text-slate-600 hover:bg-slate-100 font-black transition-colors"><i className="fas fa-search-plus"></i></button>
                <button onClick={handleResetZoom} className="px-3 border-l border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-blue-600 font-black transition-colors" title="Reset Zoom"><i className="fas fa-sync-alt"></i></button>
            </div>

            {/* 🚨 DRAGGABLE / ZOOMABLE CANVAS */}
            <div className="flex-1 overflow-auto custom-scrollbar relative p-4 md:p-8">
                <div className="min-w-max min-h-full origin-top-left transition-transform duration-200 ease-out p-6 md:p-10 flex flex-col gap-8" style={{ transform: `scale(${zoom})` }}>
                    
                    {nodes.length === 0 ? (
                        <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-3xl bg-white/50 w-full min-w-[800px]">
                            <i className="fas fa-project-diagram text-6xl mb-4 opacity-30"></i>
                            <p className="font-black text-lg text-slate-500">Awaiting Target Architecture Data</p>
                            <p className="text-xs font-medium mt-2">Upload a SOW or sync with MgC to populate the canvas.</p>
                        </div>
                    ) : (
                        <>
                            {/* OUTER BOUNDARY: CLOUD REGION */}
                            <div className="border-[3px] border-dashed border-slate-300 bg-slate-100/50 rounded-3xl p-6 md:p-8 relative shadow-sm min-w-[900px]">
                                <div className="absolute -top-4 left-8 bg-slate-200 border border-slate-300 px-4 py-1.5 rounded-lg text-[11px] font-black text-slate-700 uppercase tracking-widest shadow-sm">
                                    <i className="fas fa-map-marker-alt mr-2 text-slate-500"></i> Huawei Cloud Region
                                </div>

                                {/* EDGE & PUBLIC NETWORK */}
                                {(edge.length > 0 || eips.length > 0) && (
                                    <div className="mt-4 mb-8 border border-dashed border-indigo-300 bg-indigo-50/50 rounded-2xl p-6 relative">
                                        <div className="absolute -top-3 left-6 bg-indigo-100 px-3 py-1 rounded text-[10px] font-black text-indigo-800 uppercase tracking-widest border border-indigo-300 shadow-sm">
                                            <i className="fas fa-globe-americas mr-2 opacity-70"></i>Public Network & Edge Gateways
                                        </div>
                                        <div className="flex flex-wrap gap-4 pt-2">
                                            {eips.length > 0 && (
                                                <div className="bg-white border border-lime-300 rounded-xl p-2.5 flex items-center gap-3 w-56 shrink-0 shadow-sm">
                                                    <div className="w-10 h-10 rounded-lg bg-lime-50 text-lime-600 flex items-center justify-center text-xl border border-lime-200 shrink-0"><i className="fas fa-wifi"></i></div>
                                                    <div className="overflow-hidden"><div className="text-[11px] font-black text-slate-800 truncate">EIP Pool</div><div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">EIPs</div><div className="text-[8px] font-bold text-lime-600 uppercase tracking-widest truncate mt-0.5">{eips.length} IPs Allocated</div></div>
                                                </div>
                                            )}
                                            {edge.map(n => <ResourceCard key={n.id} n={n} />)}
                                        </div>
                                    </div>
                                )}

                                {/* DYNAMIC MULTI-VPC RENDERING */}
                                <div className="flex flex-col gap-8">
                                    {Object.entries(vpcsMap).map(([vpcName, vpcData]) => {
                                        const isVpcCollapsed = collapsedVpcs[vpcName];
                                        const hasSgs = vpcData.sgs.length > 0;
                                        const hasSubnets = Object.keys(vpcData.subnets).length > 0;

                                        let computeCount = 0; let dbCount = 0;
                                        Object.values(vpcData.subnets).forEach(s => s.resources.forEach(r => r.type.includes('RDS') || r.type.includes('DB') ? dbCount++ : computeCount++));

                                        return (
                                            <div key={vpcName} className={`border-[3px] border-blue-400 bg-blue-50/30 rounded-3xl relative shadow-sm transition-all duration-300 ${isVpcCollapsed ? 'p-6' : 'p-8 pt-10'}`}>
                                                
                                                <div className={`flex items-center shadow-sm rounded-lg overflow-hidden border border-blue-500 z-10 ${isVpcCollapsed ? 'relative' : 'absolute -top-4 left-6'}`}>
                                                    <div className="bg-blue-600 px-4 py-1.5 text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                        <i className="fas fa-cloud"></i> VPC: {vpcName}
                                                    </div>
                                                    <button onClick={(e)=>toggleState(setCollapsedVpcs, vpcName, e)} className="bg-blue-100 hover:bg-blue-200 px-4 py-1.5 text-blue-900 text-[10px] font-black transition-colors focus:outline-none">
                                                        {isVpcCollapsed ? <><i className="fas fa-expand-arrows-alt mr-1"></i> Expand</> : <i className="fas fa-compress-arrows-alt"></i>}
                                                    </button>
                                                </div>

                                                {isVpcCollapsed ? (
                                                    <div className="mt-4 flex flex-wrap gap-3 cursor-pointer" onClick={(e)=>toggleState(setCollapsedVpcs, vpcName, e)}>
                                                        <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-network-wired mr-2 opacity-50"></i>{Object.keys(vpcData.subnets).length} Subnets</div>
                                                        <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-server mr-2 opacity-50"></i>{computeCount} Compute</div>
                                                        <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-database mr-2 opacity-50"></i>{dbCount} Databases</div>
                                                        <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-shield-alt mr-2 opacity-50"></i>{vpcData.sgs.length} Security Groups</div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-6 mt-2">
                                                        
                                                        {hasSgs && (
                                                            <div className="border border-dashed border-sky-300 bg-sky-50/50 rounded-xl p-5 relative">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <div className="text-[10px] font-black text-sky-800 uppercase tracking-widest"><i className="fas fa-shield-alt mr-2 opacity-70"></i> Security Groups</div>
                                                                    <button onClick={(e)=>toggleState(setCollapsedSgs, vpcName, e)} className="text-[9px] font-black text-sky-700 hover:text-sky-900 uppercase bg-sky-100 px-2 py-1 rounded">
                                                                        {collapsedSgs[vpcName] ? `Expand (${vpcData.sgs.length})` : 'Collapse'}
                                                                    </button>
                                                                </div>
                                                                {!collapsedSgs[vpcName] && (
                                                                    <div className="flex flex-wrap gap-4 border-t border-sky-200 pt-4">
                                                                        {vpcData.sgs.map(n => <ResourceCard key={n.id} n={n} />)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {hasSubnets ? (
                                                            <div className="flex flex-col gap-5">
                                                                {Object.entries(vpcData.subnets).map(([subName, subData]) => {
                                                                    const isSubCollapsed = collapsedSubnets[`${vpcName}-${subName}`];
                                                                    const resCount = subData.resources.length;
                                                                    return (
                                                                        <div key={subName} className="border border-dashed border-slate-400 bg-white/60 rounded-xl p-5 relative shadow-sm">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                                                                                    <i className="fas fa-network-wired mr-2 opacity-70"></i> Subnet: {subName} {subData.definition && subData.definition.ip !== 'N/A' ? `(${subData.definition.ip})` : ''}
                                                                                </div>
                                                                                <button onClick={(e)=>toggleState(setCollapsedSubnets, `${vpcName}-${subName}`, e)} className="text-[9px] font-black text-slate-500 hover:text-slate-800 uppercase bg-slate-200 px-2 py-1 rounded">
                                                                                    {isSubCollapsed ? `Expand Nodes (${resCount})` : 'Collapse'}
                                                                                </button>
                                                                            </div>
                                                                            
                                                                            {!isSubCollapsed && (
                                                                                <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-4">
                                                                                    {subData.definition && <ResourceCard n={subData.definition} />}
                                                                                    {subData.resources.length === 0 && !subData.definition && <div className="text-xs text-slate-400 italic py-2">No resources in this subnet.</div>}
                                                                                    {subData.resources.map(n => <ResourceCard key={n.id} n={n} />)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-slate-400 text-xs py-6 italic border border-dashed border-blue-200 rounded-xl">No Subnets or Workloads mapped to this VPC.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* TIER 3: REGIONAL SERVICES (CBR) */}
                                {regional.length > 0 && (
                                    <div className="mt-8 border border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl p-6 relative shadow-sm">
                                        <div className="absolute -top-3 left-6 bg-emerald-100 px-3 py-1 rounded text-[10px] font-black text-emerald-800 uppercase tracking-widest border border-emerald-300 shadow-sm">
                                            <i className="fas fa-shield-alt mr-2 opacity-70"></i>Regional Services (Backup & Containers)
                                        </div>
                                        <div className="flex flex-wrap gap-4 pt-2">
                                            {regional.map(n => <ResourceCard key={n.id} n={n} />)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* EXTERNAL BOUNDARY: GLOBAL SERVICES (OBS) */}
                            {global.length > 0 && (
                                <div className="border-[3px] border-slate-300 bg-white rounded-3xl p-6 md:p-8 relative shadow-sm min-w-[800px] mt-6">
                                    <div className="absolute -top-4 left-8 bg-slate-700 border border-slate-800 px-4 py-1.5 rounded-lg text-[11px] font-black text-white uppercase tracking-widest shadow-md">
                                        <i className="fas fa-globe mr-2"></i> Global & External Services
                                    </div>
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        {global.map(n => <ResourceCard key={n.id} n={n} />)}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
