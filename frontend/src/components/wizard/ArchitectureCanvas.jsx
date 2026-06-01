import React, { useState, useMemo } from 'react';

export default function ArchitectureCanvas({ title, nodes, onNodeClick, regionFilter }) {
    const [zoom, setZoom] = useState(1);
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const handleZoom = (factor) => setZoom(prev => Math.min(Math.max(0.4, prev + factor), 2.5));

    const toggleCollapse = (groupName, e) => {
        e.stopPropagation();
        setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    // 🚨 INTELLIGENT BOUNDARY GROUPING LOGIC
    const { edge, vpcs, subnetsMap, regional, global, standaloneNetworks, eips } = useMemo(() => {
        const edge = []; const vpcs = []; const regional = []; const global = []; const standaloneNetworks = []; const eips = [];
        const subnetsMap = {}; // Maps workloads INTO their actual subnets!

        nodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = n.location || 'Default-Subnet';

            if (['EIP'].includes(type)) {
                eips.push(n);
            } else if (['VPN', 'CGW', 'VPN-CONN', 'ELB', 'NAT'].includes(type)) {
                edge.push(n);
            } else if (['OBS', 'STORAGE'].includes(type) || loc === 'Global') {
                global.push(n);
            } else if (['CBR', 'CCE'].includes(type)) {
                regional.push(n);
            } else if (type === 'VPC') {
                vpcs.push(n);
            } else if (type === 'SG' || type.includes('SECURITY')) {
                standaloneNetworks.push(n);
            } else {
                // It's a Workload or a Subnet Definition! Group them together.
                const subnetName = type === 'SUBNET' ? n.name : loc;
                if (!subnetsMap[subnetName]) subnetsMap[subnetName] = { definition: null, resources: [] };
                
                if (type === 'SUBNET') subnetsMap[subnetName].definition = n;
                else subnetsMap[subnetName].resources.push(n);
            }
        });
        return { edge, vpcs, subnetsMap, regional, global, standaloneNetworks, eips };
    }, [nodes, regionFilter]);

    // Huawei-Native Color Aesthetics
    const getVisuals = (type) => {
        const t = String(type).toUpperCase();
        if (t.includes('ECS')) return { icon: 'fa-server', bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-200', lBg: 'bg-rose-50' }; 
        if (t.includes('RDS')) return { icon: 'fa-database', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-300', lBg: 'bg-rose-50' }; 
        if (t.includes('VPN') || t.includes('CGW')) return { icon: 'fa-network-wired', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-200', lBg: 'bg-purple-50' }; 
        if (t.includes('EIP')) return { icon: 'fa-wifi', bg: 'bg-lime-500', text: 'text-lime-600', border: 'border-lime-200', lBg: 'bg-lime-50' }; 
        if (t.includes('NAT')) return { icon: 'fa-route', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-200', lBg: 'bg-indigo-50' }; 
        if (t.includes('OBS')) return { icon: 'fa-cloud-upload-alt', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', lBg: 'bg-emerald-50' }; 
        if (t.includes('CBR')) return { icon: 'fa-shield-alt', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', lBg: 'bg-blue-50' }; 
        if (t.includes('ELB')) return { icon: 'fa-sitemap', bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-200', lBg: 'bg-sky-50' }; 
        return { icon: 'fa-cube', bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-200', lBg: 'bg-slate-50' };
    };

    const getStatusIndicator = (status) => {
        if(status === 'Matched') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Matched"></div>;
        if(status === 'Live Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse" title="Scope Creep"></div>;
        if(status === 'Quoted Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" title="Missing"></div>;
        if(status === 'Manual') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm" title="Manual"></div>;
        return null;
    };

    // 🚨 SLEEK INNOSTAGE CARD
    const ResourceCard = ({ n }) => {
        const v = getVisuals(n.type);
        return (
            <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white border ${v.border} rounded-xl p-2.5 flex items-center gap-3 w-52 shrink-0 shadow-sm relative ${onNodeClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-blue-400 transition-all' : ''}`}>
                {getStatusIndicator(n.status)}
                <div className={`w-9 h-9 rounded-lg ${v.lBg} ${v.text} flex items-center justify-center text-lg border ${v.border} shrink-0`}>
                    <i className={`fas ${v.icon}`}></i>
                </div>
                <div className="overflow-hidden">
                    <div className="text-[11px] font-black text-slate-800 truncate" title={n.name}>{n.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{n.type} {n.ip !== 'N/A' && n.ip !== 'TBD' ? `| ${n.ip}` : ''}</div>
                </div>
            </div>
        );
    };

    const displayRegion = regionFilter === 'All' ? 'Cross-Region / Global View' : regionFilter;

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#f4f4f5]">
            
            {/* Header & Zoom Controls */}
            <div className="absolute top-4 left-4 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm z-20 flex items-center gap-3">
                <i className="fas fa-sitemap text-indigo-500 text-lg"></i>
                <div>
                    <h4 className="font-black text-slate-800 text-sm leading-none">{title}</h4>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">Region: {displayRegion}</div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg z-20 flex overflow-hidden">
                <button onClick={()=>handleZoom(-0.2)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black"><i className="fas fa-search-minus"></i></button>
                <div className="px-3 py-2 bg-slate-50 border-l border-r border-slate-200 text-xs font-black text-slate-700 w-16 text-center">{Math.round(zoom * 100)}%</div>
                <button onClick={()=>handleZoom(0.2)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black"><i className="fas fa-search-plus"></i></button>
            </div>

            {/* 🚨 DRAGGABLE / ZOOMABLE CANVAS */}
            <div className="flex-1 overflow-auto custom-scrollbar relative p-8">
                <div className="min-w-max min-h-full origin-top-left transition-transform duration-200 ease-out p-10 flex flex-col gap-6" style={{ transform: `scale(${zoom})` }}>
                    
                    {/* OUTER BOUNDARY: CLOUD REGION */}
                    <div className="border-[3px] border-dashed border-slate-300 bg-slate-50/50 rounded-3xl p-8 relative shadow-sm min-w-[800px]">
                        <div className="absolute -top-4 left-8 bg-slate-200 border border-slate-300 px-4 py-1.5 rounded-lg text-[11px] font-black text-slate-700 uppercase tracking-widest shadow-sm">
                            <i className="fas fa-map-marker-alt mr-2 text-slate-500"></i> Huawei Cloud Region Boundary
                        </div>

                        {/* TIER 1: PUBLIC NETWORK & EDGE */}
                        {(edge.length > 0 || eips.length > 0) && (
                            <div className="mt-4 mb-8 border border-indigo-200 bg-indigo-50/50 rounded-2xl p-6 relative">
                                <div className="absolute -top-2.5 left-6 bg-indigo-100 px-3 py-0.5 rounded text-[10px] font-black text-indigo-800 uppercase tracking-widest border border-indigo-200 shadow-sm">
                                    <i className="fas fa-globe-americas mr-2 opacity-70"></i>Public Network & Edge Gateways
                                </div>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    {eips.length > 0 && (
                                        <div className="bg-white border border-lime-300 rounded-xl p-2.5 flex items-center gap-3 w-52 shrink-0 shadow-sm cursor-help">
                                            <div className="w-9 h-9 rounded-lg bg-lime-50 text-lime-600 flex items-center justify-center text-lg border border-lime-200 shrink-0"><i className="fas fa-wifi"></i></div>
                                            <div className="overflow-hidden"><div className="text-[11px] font-black text-slate-800 truncate">EIP Pool</div><div className="text-[9px] font-bold text-lime-600 uppercase tracking-widest truncate">{eips.length} IPs Allocated</div></div>
                                        </div>
                                    )}
                                    {edge.map(n => <ResourceCard key={n.id} n={n} />)}
                                </div>
                            </div>
                        )}

                        {/* TIER 2: VPC BOUNDARY (CONTAINS SUBNETS) */}
                        <div className="border-[3px] border-blue-300 bg-blue-50/30 rounded-3xl p-8 relative shadow-sm">
                            <div className="absolute -top-4 left-6 bg-blue-500 border border-blue-600 px-4 py-1.5 rounded-lg text-[11px] font-black text-white uppercase tracking-widest shadow-md">
                                <i className="fas fa-cloud mr-2"></i> Virtual Private Cloud (VPC)
                            </div>
                            
                            {/* VPC Level Metadata (SGs, Base VPCs) */}
                            {(vpcs.length > 0 || standaloneNetworks.length > 0) && (
                                <div className="absolute top-4 right-6 flex gap-2">
                                    {vpcs.map(v => <span key={v.id} className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">VPC: {v.name}</span>)}
                                    {standaloneNetworks.map(s => <span key={s.id} className="bg-sky-100 text-sky-800 border border-sky-300 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">SG: {s.name}</span>)}
                                </div>
                            )}

                            <div className="mt-6 flex flex-col gap-6">
                                {Object.keys(subnetsMap).length === 0 ? (
                                    <div className="text-center text-slate-400 text-xs py-10 italic">No Subnets or Workloads mapped inside VPC.</div>
                                ) : (
                                    Object.entries(subnetsMap).map(([subName, data]) => {
                                        const isCollapsed = collapsedGroups[subName];
                                        const resCount = data.resources.length;
                                        
                                        return (
                                            <div key={subName} className={`border border-slate-300 bg-white/80 rounded-2xl relative shadow-sm transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-6 pt-10'}`}>
                                                
                                                {/* 🚨 Subnet Header with Collapse Toggle */}
                                                <div className={`flex items-center shadow-sm rounded-lg overflow-hidden border border-slate-300 z-10 ${isCollapsed ? 'relative' : 'absolute -top-3.5 left-6'}`}>
                                                    <div className="bg-slate-700 px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                        <i className="fas fa-network-wired"></i> Subnet: {subName} {data.definition ? `(${data.definition.cidr || 'N/A'})` : ''}
                                                    </div>
                                                    <button onClick={(e)=>toggleCollapse(subName, e)} className="bg-slate-200 hover:bg-slate-300 px-4 py-1.5 text-slate-700 text-[10px] font-black transition-colors focus:outline-none">
                                                        {isCollapsed ? <><i className="fas fa-expand-alt mr-1"></i> Expand ({resCount})</> : <i className="fas fa-compress-alt"></i>}
                                                    </button>
                                                </div>
                                                
                                                {/* 🚨 GRID OF COMPUTE/DB RESOURCES INSIDE SUBNET */}
                                                {!isCollapsed && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                                                        {data.definition && <ResourceCard n={data.definition} />}
                                                        {data.resources.length === 0 && !data.definition && <div className="text-xs text-slate-400 italic py-4">Empty Subnet</div>}
                                                        {data.resources.map(n => <ResourceCard key={n.id} n={n} />)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* TIER 3: REGIONAL SERVICES (CBR) */}
                        {regional.length > 0 && (
                            <div className="mt-8 border border-emerald-200 bg-emerald-50/50 rounded-2xl p-6 relative">
                                <div className="absolute -top-2.5 left-6 bg-emerald-100 px-3 py-0.5 rounded text-[10px] font-black text-emerald-800 uppercase tracking-widest border border-emerald-200 shadow-sm">
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
                        <div className="border-[3px] border-slate-300 bg-white rounded-3xl p-8 relative shadow-sm min-w-[800px]">
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
