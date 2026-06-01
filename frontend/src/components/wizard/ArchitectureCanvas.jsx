import React, { useState, useMemo } from 'react';

export default function ArchitectureCanvas({ title, nodes, onNodeClick, regionFilter }) {
    const [zoom, setZoom] = useState(1);
    const [collapsedGroups, setCollapsedGroups] = useState({}); // Tracks collapsed subnets

    const toggleGroup = (groupName, e) => {
        e.stopPropagation();
        setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const handleZoom = (factor) => {
        setZoom(prev => Math.min(Math.max(0.4, prev + factor), 2.5));
    };

    // Group resources into Cloud Topology Columns
    const { edge, subnets, regional, global, eips } = useMemo(() => {
        const groups = { edge: [], subnets: {}, regional: [], global: [], eips: [] };
        
        nodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = String(n.location || "Default-Subnet");
            
            if (['EIP'].includes(type)) {
                groups.eips.push(n);
            } else if (['VPN', 'CGW', 'VPN-CONN', 'ELB', 'NAT'].includes(type)) {
                groups.edge.push(n);
            } else if (['OBS', 'STORAGE'].includes(type) || loc === 'Global') {
                groups.global.push(n);
            } else if (['CBR', 'CCE'].includes(type)) {
                groups.regional.push(n);
            } else if (type !== 'VPC') {
                if (!groups.subnets[loc]) groups.subnets[loc] = [];
                groups.subnets[loc].push(n);
            }
        });
        return groups;
    }, [nodes, regionFilter]);

    const getVisuals = (type) => {
        const t = String(type).toUpperCase();
        if (t.includes('ECS')) return { icon: 'fa-server', bg: 'bg-[#ff6b6b]' }; 
        if (t.includes('RDS')) return { icon: 'fa-database', bg: 'bg-[#f43f5e]' }; 
        if (t.includes('VPN') || t.includes('CGW')) return { icon: 'fa-network-wired', bg: 'bg-[#a855f7]' }; 
        if (t.includes('EIP')) return { icon: 'fa-wifi', bg: 'bg-[#84cc16]' }; 
        if (t.includes('OBS')) return { icon: 'fa-cloud-upload-alt', bg: 'bg-[#22c55e]' }; 
        if (t.includes('CBR')) return { icon: 'fa-shield-alt', bg: 'bg-[#3b82f6]' }; 
        if (t.includes('SG') || t.includes('SECURITY')) return { icon: 'fa-lock', bg: 'bg-[#0ea5e9]' }; 
        if (t.includes('ELB') || t.includes('NAT')) return { icon: 'fa-route', bg: 'bg-[#2563eb]' }; 
        return { icon: 'fa-cube', bg: 'bg-slate-400' };
    };

    const getStatusBorder = (status) => {
        if(status === 'Matched') return 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
        if(status === 'Live Only') return 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] border-dashed';
        if(status === 'Quoted Only') return 'border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] opacity-70';
        if(status === 'Manual') return 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]';
        return 'border-transparent shadow-sm';
    };

    const renderNode = (n, compact = false) => {
        const { icon, bg } = getVisuals(n.type);
        const borderClass = getStatusBorder(n.status);
        
        return (
            <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white border-2 ${borderClass} rounded-xl flex items-center p-2 gap-3 transition-transform hover:-translate-y-1 cursor-pointer w-48 shrink-0 bg-white`}>
                <div className={`w-10 h-10 rounded-lg ${bg} text-white flex items-center justify-center text-lg shrink-0 shadow-inner`}>
                    <i className={`fas ${icon}`}></i>
                </div>
                <div className="overflow-hidden">
                    <div className="text-[11px] font-black text-slate-800 truncate" title={n.name}>{n.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{n.type} {n.ip !== 'N/A' && n.ip !== 'TBD' ? `| ${n.ip}` : ''}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-slate-50">
            {/* Header & Zoom Controls */}
            <div className="absolute top-4 left-4 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm z-20">
                <h4 className="font-black text-slate-800 text-sm"><i className="fas fa-sitemap text-indigo-500 mr-2"></i> {title}</h4>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Region: {regionFilter}</div>
            </div>

            <div className="absolute bottom-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg z-20 flex overflow-hidden">
                <button onClick={()=>handleZoom(-0.2)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black"><i className="fas fa-minus"></i></button>
                <div className="px-4 py-2 bg-slate-50 border-l border-r border-slate-200 text-xs font-black text-slate-700 w-16 text-center">{Math.round(zoom * 100)}%</div>
                <button onClick={()=>handleZoom(0.2)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black"><i className="fas fa-plus"></i></button>
            </div>

            {/* Draggable/Zoomable Canvas Area */}
            <div className="flex-1 overflow-auto custom-scrollbar relative p-12">
                <div 
                    className="flex flex-row items-stretch justify-start gap-8 min-w-max min-h-full origin-top-left transition-transform duration-200 ease-out p-16"
                    style={{ transform: `scale(${zoom})` }}
                >
                    
                    {/* LEFT COLUMN: PUBLIC / EDGE */}
                    <div className="flex flex-col gap-6 w-56 shrink-0 relative z-10">
                        {eips.length > 0 && (
                            <div className="bg-white border-2 border-lime-400 rounded-2xl p-4 shadow-sm relative">
                                <div className="absolute -top-3 left-4 bg-lime-100 px-2 rounded text-[10px] font-black text-lime-800 uppercase tracking-widest border border-lime-300">Public IPs</div>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="w-10 h-10 rounded-lg bg-lime-500 text-white flex items-center justify-center text-xl shadow-inner"><i className="fas fa-wifi"></i></div>
                                    <div><div className="font-black text-slate-800 text-sm">{eips.length} Allocated</div><div className="text-[9px] text-slate-500 uppercase font-bold">EIP Pool</div></div>
                                </div>
                            </div>
                        )}

                        {edge.length > 0 && (
                            <div className="bg-indigo-50/50 border-2 border-dashed border-indigo-300 rounded-2xl p-5 relative shadow-sm flex-1">
                                <div className="absolute -top-3 left-4 bg-indigo-100 px-2 rounded text-[10px] font-black text-indigo-800 uppercase tracking-widest border border-indigo-300">Edge Gateways</div>
                                <div className="flex flex-col gap-3 mt-3">
                                    {edge.map(n => renderNode(n))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MIDDLE COLUMN: VPC BOUNDARY */}
                    <div className="bg-white border-[3px] border-blue-300 rounded-3xl p-8 relative shadow-sm min-w-[400px] flex-1">
                        <div className="absolute top-0 left-0 bg-blue-100 px-4 py-1.5 rounded-br-2xl text-[11px] font-black text-blue-800 uppercase tracking-widest border-b border-r border-blue-300 shadow-sm z-10">
                            <i className="fas fa-cloud mr-2"></i> Virtual Private Cloud (VPC)
                        </div>

                        <div className="mt-8 flex flex-col gap-8">
                            {Object.entries(subnets).map(([subName, subNodes]) => {
                                const isCollapsed = collapsedGroups[subName];
                                return (
                                    <div key={subName} className="border-2 border-slate-200 bg-slate-50/50 rounded-2xl p-5 relative shadow-inner">
                                        <div className="absolute -top-3.5 left-4 flex items-center shadow-sm rounded-lg overflow-hidden border border-slate-300">
                                            <div className="bg-slate-700 px-3 py-1 text-[10px] font-black text-white uppercase tracking-widest"><i className="fas fa-network-wired mr-2"></i>{subName}</div>
                                            <button onClick={(e)=>toggleGroup(subName, e)} className="bg-slate-200 hover:bg-slate-300 px-3 py-1 text-slate-700 text-[10px] font-black transition-colors">
                                                {isCollapsed ? <i className="fas fa-plus"></i> : <i className="fas fa-minus"></i>}
                                            </button>
                                        </div>
                                        
                                        {isCollapsed ? (
                                            <div className="mt-4 text-center py-4 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-50 transition-colors" onClick={(e)=>toggleGroup(subName, e)}>
                                                {subNodes.length} Resources Hidden
                                            </div>
                                        ) : (
                                            <div className="mt-4 flex flex-wrap gap-4">
                                                {subNodes.map(n => renderNode(n))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {Object.keys(subnets).length === 0 && <div className="text-center text-slate-400 text-xs py-10 italic">No VPC subnets mapped.</div>}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: REGIONAL & GLOBAL SERVICES */}
                    <div className="flex flex-col gap-6 w-56 shrink-0 relative z-10">
                        {regional.length > 0 && (
                            <div className="bg-emerald-50/50 border-2 border-dashed border-emerald-300 rounded-2xl p-5 relative shadow-sm">
                                <div className="absolute -top-3 left-4 bg-emerald-100 px-2 rounded text-[10px] font-black text-emerald-800 uppercase tracking-widest border border-emerald-300">Regional Services</div>
                                <div className="flex flex-col gap-3 mt-3">
                                    {regional.map(n => renderNode(n))}
                                </div>
                            </div>
                        )}

                        {global.length > 0 && (
                            <div className="bg-white border-[3px] border-slate-300 rounded-2xl p-5 relative shadow-sm">
                                <div className="absolute -top-3 left-4 bg-slate-700 px-2 rounded text-[10px] font-black text-white uppercase tracking-widest border border-slate-800 shadow-sm"><i className="fas fa-globe mr-1"></i> Global</div>
                                <div className="flex flex-col gap-3 mt-3">
                                    {global.map(n => renderNode(n))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
