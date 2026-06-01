import React, { useState, useMemo } from 'react';

export default function ArchitectureCanvas({ title, nodes, onNodeClick, regionFilter }) {
    const [zoom, setZoom] = useState(1);
    const [collapsedGroups, setCollapsedGroups] = useState({});
    
    // 🚨 PRO-TIER FEATURE: VPC and SGs collapsed by default as requested
    const [vpcCollapsed, setVpcCollapsed] = useState(true);
    const [sgCollapsed, setSgCollapsed] = useState(true);

    const handleZoom = (factor) => setZoom(prev => Math.min(Math.max(0.4, prev + factor), 2.5));

    const toggleSubnetCollapse = (groupName, e) => {
        e.stopPropagation();
        setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    // 🚨 INTELLIGENT BOUNDARY GROUPING LOGIC (Fixed CBR Priority)
    const { edge, vpcs, subnetsMap, regional, global, standaloneNetworks, eips } = useMemo(() => {
        const edge = []; const vpcs = []; const regional = []; const global = []; const standaloneNetworks = []; const eips = [];
        const subnetsMap = {};

        nodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = n.location || 'Default-Subnet';

            // Priority 1: EIPs
            if (['EIP'].includes(type)) {
                eips.push(n);
            } 
            // Priority 2: Edge/Gateways
            else if (['VPN', 'CGW', 'VPN-CONN', 'ELB', 'NAT'].includes(type)) {
                edge.push(n);
            } 
            // 🚨 Priority 3: Regional Services (Forces CBR into Regional, overriding the loc='Global' tag)
            else if (['CBR', 'CCE'].includes(type)) {
                regional.push(n);
            } 
            // Priority 4: True Global Services
            else if (['OBS', 'STORAGE'].includes(type) || loc === 'Global') {
                global.push(n);
            } 
            // Priority 5: VPC Definitions
            else if (type === 'VPC') {
                vpcs.push(n);
            } 
            // Priority 6: Security Groups
            else if (type === 'SG' || type.includes('SECURITY')) {
                standaloneNetworks.push(n);
            } 
            // Priority 7: Subnets & Workloads
            else {
                const subnetName = type === 'SUBNET' ? n.name : loc;
                if (!subnetsMap[subnetName]) subnetsMap[subnetName] = { definition: null, resources: [] };
                
                if (type === 'SUBNET') subnetsMap[subnetName].definition = n;
                else subnetsMap[subnetName].resources.push(n);
            }
        });
        return { edge, vpcs, subnetsMap, regional, global, standaloneNetworks, eips };
    }, [nodes, regionFilter]);

    // Calculate VPC Contents for the Collapsed Summary
    const vpcStats = useMemo(() => {
        let compute = 0; let db = 0;
        Object.values(subnetsMap).forEach(sub => {
            sub.resources.forEach(r => {
                if (r.type === 'RDS') db++;
                else compute++;
            });
        });
        return { subnets: Object.keys(subnetsMap).length, compute, db, sgs: standaloneNetworks.length };
    }, [subnetsMap, standaloneNetworks]);

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
            <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white border-2 ${getStatusBorder(n.status)} rounded-xl p-2.5 flex items-center gap-3 w-56 shrink-0 relative ${onNodeClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all' : ''}`}>
                <div className={`w-10 h-10 rounded-lg ${v.lBg} ${v.text} flex items-center justify-center text-xl border ${v.border} shrink-0`}>
                    <i className={`fas ${v.icon}`}></i>
                </div>
                <div className="overflow-hidden">
                    <div className="text-xs font-black text-slate-800 truncate" title={n.name}>{n.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{n.type} {n.ip !== 'N/A' && n.ip !== 'TBD' ? `| ${n.ip}` : ''}</div>
                </div>
            </div>
        );
    };

    const displayRegion = regionFilter === 'All' ? 'Cross-Region / Global View' : regionFilter;

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#f4f4f5]">
            
            {/* Header & Zoom Controls */}
            <div className="absolute top-4 left-4 bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm z-20 flex items-center gap-4">
                <i className="fas fa-sitemap text-indigo-500 text-2xl"></i>
                <div>
                    <h4 className="font-black text-slate-800 text-sm leading-none">{title}</h4>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Region Filter: {displayRegion}</div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg z-20 flex overflow-hidden">
                <button onClick={()=>handleZoom(-0.2)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black"><i className="fas fa-search-minus"></i></button>
                <div className="px-3 py-2 bg-slate-50 border-l border-r border-slate-200 text-xs font-black text-slate-700 w-16 text-center flex items-center justify-center">{Math.round(zoom * 100)}%</div>
                <button onClick={()=>handleZoom(0.2)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-black"><i className="fas fa-search-plus"></i></button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative p-8">
                <div className="min-w-max min-h-full origin-top-left transition-transform duration-200 ease-out p-10 flex flex-col gap-8" style={{ transform: `scale(${zoom})` }}>
                    
                    {/* OUTER BOUNDARY: CLOUD REGION */}
                    <div className="border-4 border-dashed border-slate-400 bg-slate-100/50 rounded-[32px] p-10 relative shadow-sm min-w-[900px]">
                        <div className="absolute -top-5 left-10 bg-slate-700 border border-slate-800 px-6 py-2 rounded-xl text-xs font-black text-white uppercase tracking-widest shadow-md">
                            <i className="fas fa-map-marker-alt mr-2 text-slate-300"></i> Outer Box: Huawei Cloud Region
                        </div>

                        {/* TIER 1: EDGE & PUBLIC NETWORK */}
                        {(edge.length > 0 || eips.length > 0) && (
                            <div className="mt-6 mb-8 border-2 border-indigo-200 bg-indigo-50/70 rounded-2xl p-6 relative">
                                <div className="absolute -top-3 left-6 bg-indigo-100 px-3 py-1 rounded text-[10px] font-black text-indigo-800 uppercase tracking-widest border border-indigo-300 shadow-sm">
                                    <i className="fas fa-globe-americas mr-2 opacity-70"></i>Top Inner Box: Public Network & Edge Gateways
                                </div>
                                <div className="flex flex-wrap gap-4 pt-3">
                                    {eips.length > 0 && (
                                        <div className="bg-white border-2 border-lime-400 rounded-xl p-2 flex items-center gap-3 w-56 shrink-0 shadow-sm">
                                            <div className="w-10 h-10 rounded-lg bg-lime-50 text-lime-600 flex items-center justify-center text-xl border border-lime-200 shrink-0"><i className="fas fa-wifi"></i></div>
                                            <div className="overflow-hidden"><div className="text-xs font-black text-slate-800 truncate">EIP Pool</div><div className="text-[9px] font-bold text-lime-600 uppercase tracking-widest truncate">{eips.length} IPs Allocated</div></div>
                                        </div>
                                    )}
                                    {edge.map(n => <ResourceCard key={n.id} n={n} />)}
                                </div>
                            </div>
                        )}

                        {/* TIER 2: VPC BOUNDARY (COLLAPSIBLE) */}
                        <div className={`border-[3px] border-blue-400 bg-blue-50/50 rounded-3xl relative shadow-md transition-all duration-300 ${vpcCollapsed ? 'p-6' : 'p-8 pt-12'}`}>
                            <div className={`flex items-center shadow-sm rounded-xl overflow-hidden border border-blue-500 z-10 ${vpcCollapsed ? 'relative' : 'absolute -top-4 left-8'}`}>
                                <div className="bg-blue-600 px-5 py-2 text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <i className="fas fa-cloud"></i> Middle Inner Box: Virtual Private Cloud (VPC)
                                </div>
                                <button onClick={()=>setVpcCollapsed(!vpcCollapsed)} className="bg-blue-100 hover:bg-blue-200 px-5 py-2 text-blue-900 text-xs font-black transition-colors focus:outline-none">
                                    {vpcCollapsed ? <><i className="fas fa-expand-arrows-alt mr-2"></i>Expand VPC</> : <i className="fas fa-compress-arrows-alt"></i>}
                                </button>
                            </div>

                            {vpcCollapsed ? (
                                <div className="mt-4 flex flex-wrap gap-3 cursor-pointer" onClick={()=>setVpcCollapsed(false)}>
                                    <div className="bg-white border border-blue-200 px-4 py-2 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-network-wired mr-2 opacity-50"></i>{vpcStats.subnets} Subnets</div>
                                    <div className="bg-white border border-blue-200 px-4 py-2 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-server mr-2 opacity-50"></i>{vpcStats.compute} Compute Nodes</div>
                                    <div className="bg-white border border-blue-200 px-4 py-2 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-database mr-2 opacity-50"></i>{vpcStats.db} Databases</div>
                                    <div className="bg-white border border-blue-200 px-4 py-2 rounded-lg shadow-sm text-[10px] font-black text-blue-800 uppercase tracking-widest"><i className="fas fa-shield-alt mr-2 opacity-50"></i>{vpcStats.sgs} Security Groups</div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-8">
                                    
                                    {/* SGs & VPC DEFS (COLLAPSIBLE) */}
                                    {(vpcs.length > 0 || standaloneNetworks.length > 0) && (
                                        <div className="border border-sky-300 bg-white/60 rounded-xl p-4 relative shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] font-black text-sky-800 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-shield-alt opacity-70"></i> Security Groups & Network Policies</div>
                                                <button onClick={()=>setSgCollapsed(!sgCollapsed)} className="text-[10px] font-black text-sky-600 hover:text-sky-800 uppercase px-3 py-1 bg-sky-100 rounded">
                                                    {sgCollapsed ? 'Expand Policies' : 'Collapse'}
                                                </button>
                                            </div>
                                            {!sgCollapsed && (
                                                <div className="flex flex-wrap gap-4 pt-4 mt-2 border-t border-sky-200">
                                                    {vpcs.map(n => <ResourceCard key={n.id} n={n} />)}
                                                    {standaloneNetworks.map(n => <ResourceCard key={n.id} n={n} />)}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* SUBNET BOXES */}
                                    <div className="flex flex-col gap-6">
                                        {Object.entries(subnetsMap).map(([subName, data]) => {
                                            const isCollapsed = collapsedGroups[subName];
                                            const resCount = data.resources.length;
                                            return (
                                                <div key={subName} className={`border border-slate-300 bg-white/90 rounded-2xl relative shadow-sm transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-6 pt-10'}`}>
                                                    <div className={`flex items-center shadow-sm rounded-lg overflow-hidden border border-slate-300 z-10 ${isCollapsed ? 'relative' : 'absolute -top-3.5 left-6'}`}>
                                                        <div className="bg-slate-700 px-4 py-1.5 text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                            <i className="fas fa-network-wired"></i> Subnet: {subName} {data.definition ? `(${data.definition.cidr || 'N/A'})` : ''}
                                                        </div>
                                                        <button onClick={(e)=>toggleSubnetCollapse(subName, e)} className="bg-slate-200 hover:bg-slate-300 px-4 py-1.5 text-slate-700 text-[10px] font-black transition-colors focus:outline-none">
                                                            {isCollapsed ? <><i className="fas fa-expand-alt mr-1"></i> Expand Nodes ({resCount})</> : <i className="fas fa-compress-alt"></i>}
                                                        </button>
                                                    </div>
                                                    
                                                    {!isCollapsed && (
                                                        <div className="flex flex-wrap gap-4 mt-2">
                                                            {data.definition && <ResourceCard n={data.definition} />}
                                                            {data.resources.length === 0 && !data.definition && <div className="text-xs text-slate-400 italic py-4 px-2">Empty Subnet</div>}
                                                            {data.resources.map(n => <ResourceCard key={n.id} n={n} />)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {Object.keys(subnetsMap).length === 0 && <div className="text-center text-slate-400 text-xs py-6 italic border-2 border-dashed border-blue-200 rounded-xl">No Subnets mapped inside VPC.</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TIER 3: REGIONAL SERVICES (CBR) */}
                        {regional.length > 0 && (
                            <div className="mt-8 border-2 border-emerald-300 bg-emerald-50/70 rounded-2xl p-6 relative shadow-sm">
                                <div className="absolute -top-3 left-6 bg-emerald-100 px-3 py-1 rounded text-[10px] font-black text-emerald-800 uppercase tracking-widest border border-emerald-300 shadow-sm">
                                    <i className="fas fa-shield-alt mr-2 opacity-70"></i>Bottom Inner Box: Regional Services (Backup / Container)
                                </div>
                                <div className="flex flex-wrap gap-4 pt-3">
                                    {regional.map(n => <ResourceCard key={n.id} n={n} />)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* EXTERNAL BOUNDARY: GLOBAL SERVICES (OBS) */}
                    {global.length > 0 && (
                        <div className="border-[3px] border-slate-300 bg-white rounded-3xl p-8 relative shadow-sm min-w-[800px] mt-6">
                            <div className="absolute -top-4 left-8 bg-slate-800 border border-slate-900 px-6 py-2 rounded-xl text-xs font-black text-white uppercase tracking-widest shadow-md">
                                <i className="fas fa-globe mr-2"></i> External Box: Global Services
                            </div>
                            <div className="flex flex-wrap gap-4 pt-3">
                                {global.map(n => <ResourceCard key={n.id} n={n} />)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
