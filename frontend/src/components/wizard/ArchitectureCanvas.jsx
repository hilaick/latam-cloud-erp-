import React, { useState, useMemo, useEffect } from 'react';

export default function ArchitectureCanvas({ title, nodes, onNodeClick, regionFilter }) {
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // Independent collapse states for granular control
    const [collapsedVpcs, setCollapsedVpcs] = useState({});
    const [collapsedSgs, setCollapsedSgs] = useState({});
    const [collapsedSubnets, setCollapsedSubnets] = useState({});

    // Check for mobile view
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleZoom = (factor) => setZoom(prev => Math.min(Math.max(0.4, prev + factor), 2.5));
    const resetZoom = () => setZoom(1);

    const toggleFullscreen = () => {
        const element = document.getElementById('architecture-canvas-container');
        if (!element) return;
        
        if (!document.fullscreenElement) {
            element.requestFullscreen().catch(err => {
                console.error(`Error enabling fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Handle fullscreen change
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleState = (setter, key, e) => {
        e.stopPropagation();
        setter(prev => ({ ...prev, [key]: !prev[key] }));
    };

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
        if (Object.keys(vpcsMap).length === 0) {
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
                // Assign to VPC based on location string, or fallback to the first available VPC
                const vpcKey = Object.keys(vpcsMap).find(k => loc.includes(k)) || Object.keys(vpcsMap)[0];
                vpcsMap[vpcKey].sgs.push(n);
            } else {
                // Subnets and Workloads (ECS, RDS, etc)
                let subnetName = type === 'SUBNET' ? n.name : loc;
                const vpcKey = Object.keys(vpcsMap).find(k => loc.includes(k)) || Object.keys(vpcsMap)[0];

                if (!vpcsMap[vpcKey].subnets[subnetName]) {
                    vpcsMap[vpcKey].subnets[subnetName] = { definition: null, resources: [] };
                }

                if (type === 'SUBNET') vpcsMap[vpcKey].subnets[subnetName].definition = n;
                else vpcsMap[vpcKey].subnets[subnetName].resources.push(n);
            }
        });
        return { edge, vpcsMap, regional, global, eips };
    }, [nodes, regionFilter]);

    // Huawei-Native Color Aesthetics with enhanced categorization
    const getVisuals = (type) => {
        const t = String(type).toUpperCase();
        
        // Huawei Cloud Service Color Mapping with categories
        if (t.includes('ECS')) return { icon: 'fa-server', bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-200', lBg: 'bg-rose-50', category: 'Compute' }; 
        if (t.includes('RDS')) return { icon: 'fa-database', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-300', lBg: 'bg-rose-50', category: 'Database' }; 
        if (t.includes('VPN') || t.includes('CGW') || t.includes('VPN-CONN')) return { icon: 'fa-network-wired', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-200', lBg: 'bg-purple-50', category: 'Networking' }; 
        if (t.includes('EIP')) return { icon: 'fa-wifi', bg: 'bg-lime-500', text: 'text-lime-600', border: 'border-lime-200', lBg: 'bg-lime-50', category: 'Network' }; 
        if (t.includes('NAT')) return { icon: 'fa-route', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-200', lBg: 'bg-indigo-50', category: 'Network' }; 
        if (t.includes('OBS') || t.includes('STORAGE')) return { icon: 'fa-cloud-upload-alt', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', lBg: 'bg-emerald-50', category: 'Storage' }; 
        if (t.includes('CBR')) return { icon: 'fa-shield-alt', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', lBg: 'bg-blue-50', category: 'Backup' }; 
        if (t.includes('ELB') || t.includes('LOADBALANCER')) return { icon: 'fa-sitemap', bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-200', lBg: 'bg-sky-50', category: 'Network' }; 
        if (t.includes('SG') || t.includes('SECURITY')) return { icon: 'fa-shield-alt', bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200', lBg: 'bg-amber-50', category: 'Security' }; 
        if (t.includes('VPC')) return { icon: 'fa-cloud', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', lBg: 'bg-blue-50', category: 'Network' }; 
        if (t.includes('SUBNET')) return { icon: 'fa-network-wired', bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-200', lBg: 'bg-slate-50', category: 'Network' }; 
        if (t.includes('CCE')) return { icon: 'fa-cubes', bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-200', lBg: 'bg-violet-50', category: 'Container' }; 
        if (t.includes('EVS')) return { icon: 'fa-hdd', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-200', lBg: 'bg-cyan-50', category: 'Storage' }; 
        if (t.includes('IAM')) return { icon: 'fa-user-shield', bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-200', lBg: 'bg-pink-50', category: 'Security' }; 
        if (t.includes('CES')) return { icon: 'fa-chart-line', bg: 'bg-teal-500', text: 'text-teal-500', border: 'border-teal-200', lBg: 'bg-teal-50', category: 'Monitoring' }; 
        if (t.includes('AS')) return { icon: 'fa-expand-arrows-alt', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-200', lBg: 'bg-orange-50', category: 'Compute' }; 
        
        return { icon: 'fa-cube', bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-200', lBg: 'bg-slate-50', category: 'Other' };
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
            <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white border ${getStatusBorder(n.status)} rounded-xl p-2.5 flex items-center gap-3 ${isMobile ? 'w-full' : 'w-52'} shrink-0 relative ${onNodeClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-blue-400 transition-all' : ''}`}>
                <div className={`w-9 h-9 rounded-lg ${v.lBg} ${v.text} flex items-center justify-center text-lg border ${v.border} shrink-0`}>
                    <i className={`fas ${v.icon}`}></i>
                </div>
                <div className="overflow-hidden flex-1">
                    <div className="text-[11px] font-black text-slate-800 truncate" title={n.name}>{n.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{n.type} {n.ip !== 'N/A' && n.ip !== 'TBD' ? `| ${n.ip}` : ''}</div>
                    <div className="text-[8px] font-medium text-slate-500 mt-0.5">{v.category}</div>
                </div>
                {n.status && (
                    <div className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        n.status === 'Matched' ? 'bg-emerald-100 text-emerald-800' :
                        n.status === 'Live Only' ? 'bg-amber-100 text-amber-800' :
                        n.status === 'Quoted Only' ? 'bg-rose-100 text-rose-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                        {n.status}
                    </div>
                )}
            </div>
        );
    };

    const displayRegion = regionFilter === 'All' ? 'Cross-Region View' : regionFilter;

    return (
        <div id="architecture-canvas-container" className="w-full h-full flex flex-col relative overflow-hidden bg-[#f8fafc]">
            
            {/* Diagram Header */}
            <div className={`absolute top-4 left-4 bg-white border border-slate-200 ${isMobile ? 'px-3 py-2' : 'px-5 py-3'} rounded-xl shadow-sm z-20 flex items-center gap-4`}>
                <i className="fas fa-sitemap text-indigo-500 text-xl md:text-2xl"></i>
                <div>
                    <h4 className="font-black text-slate-800 text-sm leading-none">{title}</h4>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Region: {displayRegion}</div>
                </div>
            </div>

            {/* Zoom & Fullscreen Controls */}
            <div className={`absolute ${isMobile ? 'bottom-2 right-2' : 'bottom-4 right-4'} flex gap-2 z-20`}>
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg flex overflow-hidden">
                    <button onClick={()=>handleZoom(-0.2)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black" title="Zoom Out">
                        <i className="fas fa-search-minus"></i>
                    </button>
                    <div className="px-3 py-2 bg-slate-50 border-l border-r border-slate-200 text-xs font-black text-slate-700 w-16 text-center flex items-center justify-center">
                        {Math.round(zoom * 100)}%
                    </div>
                    <button onClick={()=>handleZoom(0.2)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black" title="Zoom In">
                        <i className="fas fa-search-plus"></i>
                    </button>
                    <button onClick={resetZoom} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black border-l border-slate-200" title="Reset Zoom">
                        <i className="fas fa-expand-alt"></i>
                    </button>
                </div>
                
                <button 
                    onClick={toggleFullscreen}
                    className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-slate-600 hover:bg-slate-100 font-black transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                </button>
            </div>

            {/* 🚨 DRAGGABLE / ZOOMABLE CANVAS */}
            <div className="flex-1 overflow-auto custom-scrollbar relative p-4 md:p-8">
                <div className="min-w-max min-h-full origin-top-left transition-transform duration-200 ease-out p-4 md:p-10 flex flex-col gap-4 md:gap-8" style={{ transform: `scale(${zoom})` }}>
                    
                    {/* OUTER BOUNDARY: CLOUD REGION */}
                    <div className="border-[3px] border-dashed border-slate-300 bg-slate-100/50 rounded-3xl p-4 md:p-8 relative shadow-sm min-w-[300px] md:min-w-[900px]">
                        <div className="absolute -top-4 left-4 md:left-8 bg-slate-200 border border-slate-300 px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-[11px] font-black text-slate-700 uppercase tracking-widest shadow-sm">
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
                                        <div className="bg-white border border-lime-300 rounded-xl p-2.5 flex items-center gap-3 w-52 shrink-0 shadow-sm">
                                            <div className="w-9 h-9 rounded-lg bg-lime-50 text-lime-600 flex items-center justify-center text-xl border border-lime-200 shrink-0"><i className="fas fa-wifi"></i></div>
                                            <div className="overflow-hidden"><div className="text-[11px] font-black text-slate-800 truncate">EIP Pool</div><div className="text-[9px] font-bold text-lime-600 uppercase tracking-widest truncate">{eips.length} IPs Allocated</div></div>
                                        </div>
                                    )}
                                    {edge.map(n => <ResourceCard key={n.id} n={n} />)}
                                </div>
                            </div>
                        )}

                        {/* 🚨 DYNAMIC MULTI-VPC RENDERING */}
                        <div className="flex flex-col gap-8">
                            {Object.entries(vpcsMap).map(([vpcName, vpcData]) => {
                                const isVpcCollapsed = collapsedVpcs[vpcName];
                                const hasSgs = vpcData.sgs.length > 0;
                                const hasSubnets = Object.keys(vpcData.subnets).length > 0;

                                // Calculate quick stats for collapsed view
                                let computeCount = 0; let dbCount = 0;
                                Object.values(vpcData.subnets).forEach(s => s.resources.forEach(r => r.type === 'RDS' ? dbCount++ : computeCount++));

                                return (
                                    <div key={vpcName} className={`border-[3px] border-blue-400 bg-blue-50/30 rounded-3xl relative shadow-sm transition-all duration-300 ${isVpcCollapsed ? 'p-6' : 'p-8 pt-10'}`}>
                                        
                                        {/* VPC Header & Toggle */}
                                        <div className={`flex items-center shadow-sm rounded-lg overflow-hidden border border-blue-500 z-10 ${isVpcCollapsed ? 'relative' : 'absolute -top-4 left-6'}`}>
                                            <div className="bg-blue-600 px-4 py-1.5 text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                <i className="fas fa-cloud"></i> VPC: {vpcName}
                                            </div>
                                            <button onClick={(e)=>toggleState(setCollapsedVpcs, vpcName, e)} className="bg-blue-100 hover:bg-blue-200 px-4 py-1.5 text-blue-900 text-[10px] font-black transition-colors focus:outline-none">
                                                {isVpcCollapsed ? <><i className="fas fa-expand-arrows-alt mr-1"></i> Expand</> : <i className="fas fa-compress-arrows-alt"></i>}
                                            </button>
                                        </div>

                                        {/* VPC Collapsed Summary */}
                                        {isVpcCollapsed ? (
                                            <div className="mt-4 flex flex-wrap gap-3 cursor-pointer" onClick={(e)=>toggleState(setCollapsedVpcs, vpcName, e)}>
                                                <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-network-wired mr-2 opacity-50"></i>{Object.keys(vpcData.subnets).length} Subnets</div>
                                                <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-server mr-2 opacity-50"></i>{computeCount} Compute</div>
                                                <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-database mr-2 opacity-50"></i>{dbCount} Databases</div>
                                                <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-shield-alt mr-2 opacity-50"></i>{vpcData.sgs.length} Security Groups</div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-6 mt-2">
                                                
                                                {/* VPC -> Security Groups */}
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

                                                {/* VPC -> Subnets */}
                                                {hasSubnets ? (
                                                    <div className="flex flex-col gap-5">
                                                        {Object.entries(vpcData.subnets).map(([subName, subData]) => {
                                                            const isSubCollapsed = collapsedSubnets[`${vpcName}-${subName}`];
                                                            const resCount = subData.resources.length;
                                                            return (
                                                                <div key={subName} className="border border-dashed border-slate-400 bg-white/60 rounded-xl p-5 relative shadow-sm">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                                                                            <i className="fas fa-network-wired mr-2 opacity-70"></i> Subnet: {subName} {subData.definition ? `(${subData.definition.cidr || ''})` : ''}
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
                        <div className="border-[3px] border-slate-300 bg-white rounded-3xl p-8 relative shadow-sm min-w-[800px] mt-6">
                            <div className="absolute -top-4 left-8 bg-slate-700 border border-slate-800 px-4 py-1.5 rounded-lg text-[11px] font-black text-white uppercase tracking-widest shadow-md">
                                <i className="fas fa-globe mr-2"></i> Global & External Services
                            </div>
                            <div className="flex flex-wrap gap-4 pt-2">
                                {global.map(n => <ResourceCard key={n.id} n={n} />)}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
