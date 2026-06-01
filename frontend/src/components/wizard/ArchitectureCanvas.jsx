import React, { useMemo } from 'react';

export default function ArchitectureCanvas({ title, nodes, onNodeClick, regionFilter }) {
    
    // Group resources into Huawei's logical flowchart columns
    const { edge, network, compute, storage, eips } = useMemo(() => {
        const groups = { edge: [], network: [], compute: [], storage: [], eips: [] };
        
        nodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            
            if (['EIP'].includes(type)) {
                groups.eips.push(n);
            } else if (['VPN', 'CGW', 'VPN-CONN', 'ELB', 'NAT'].includes(type)) {
                groups.edge.push(n);
            } else if (['SG', 'VPC', 'SUBNET'].includes(type)) {
                groups.network.push(n);
            } else if (['ECS', 'RDS', 'CCE'].includes(type)) {
                groups.compute.push(n);
            } else if (['OBS', 'CBR', 'STORAGE'].includes(type)) {
                groups.storage.push(n);
            } else {
                groups.compute.push(n); // Fallback
            }
        });
        return groups;
    }, [nodes, regionFilter]);

    // Huawei-style Aesthetics Mapping
    const getVisuals = (type) => {
        const t = String(type).toUpperCase();
        if (t.includes('ECS')) return { icon: 'fa-server', bg: 'bg-[#ff6b6b]' }; // Coral Red
        if (t.includes('RDS')) return { icon: 'fa-database', bg: 'bg-[#ff6b6b]' }; 
        if (t.includes('VPC')) return { icon: 'fa-cloud', bg: 'bg-[#f97316]' }; // Orange
        if (t.includes('VPN') || t.includes('CGW')) return { icon: 'fa-network-wired', bg: 'bg-[#a855f7]' }; // Purple
        if (t.includes('EIP')) return { icon: 'fa-wifi', bg: 'bg-[#84cc16]' }; // Lime Green
        if (t.includes('OBS')) return { icon: 'fa-cloud-upload-alt', bg: 'bg-[#22c55e]' }; // Emerald Green
        if (t.includes('CBR')) return { icon: 'fa-shield-alt', bg: 'bg-[#3b82f6]' }; // Blue
        if (t.includes('SG') || t.includes('SECURITY')) return { icon: 'fa-lock', bg: 'bg-[#0ea5e9]' }; // Sky Blue
        if (t.includes('ELB') || t.includes('NAT')) return { icon: 'fa-route', bg: 'bg-[#2563eb]' }; // Royal Blue
        if (t.includes('SUBNET')) return { icon: 'fa-project-diagram', bg: 'bg-[#64748b]' }; // Slate
        return { icon: 'fa-cube', bg: 'bg-slate-400' };
    };

    const getStatusIndicator = (status) => {
        if(status === 'Matched') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Matched"></div>;
        if(status === 'Live Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse" title="Scope Creep"></div>;
        if(status === 'Quoted Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" title="Missing"></div>;
        if(status === 'Manual') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm" title="Manual"></div>;
        return null;
    };

    const FlowArrow = () => (
        <div className="flex items-center text-slate-300 shrink-0 px-4">
            <div className="h-0.5 w-12 bg-slate-300"></div>
            <i className="fas fa-chevron-right -ml-1 text-sm"></i>
        </div>
    );

    const FlowBox = ({ title, items, emptyText }) => (
        <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-t-lg mb-[-1px] z-10 border border-blue-100">{title}</div>
            <div className="border border-dashed border-slate-300 bg-white rounded-2xl p-6 min-w-[160px] min-h-[200px] flex flex-col items-center justify-center gap-6 shadow-sm">
                {items.length === 0 ? (
                    <div className="text-[10px] text-slate-400 italic">{emptyText}</div>
                ) : (
                    items.map((n, i) => {
                        const { icon, bg } = getVisuals(n.type);
                        return (
                            <div key={n.id || i} onClick={()=>onNodeClick && onNodeClick(n)} className={`flex flex-col items-center group relative ${onNodeClick ? 'cursor-pointer hover:-translate-y-1 transition-transform' : ''}`}>
                                <div className={`w-14 h-14 rounded-2xl ${bg} text-white flex items-center justify-center text-2xl shadow-md group-hover:shadow-lg transition-shadow relative`}>
                                    {n.status && getStatusIndicator(n.status)}
                                    <i className={`fas ${icon}`}></i>
                                </div>
                                <div className="mt-3 text-center">
                                    <div className="text-[10px] font-black text-slate-800 truncate w-24" title={n.name}>{n.name}</div>
                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{n.type}</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#fafafa]">
            {/* Header */}
            <div className="absolute top-4 left-4 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm z-10">
                <h4 className="font-black text-slate-800 text-sm"><i className="fas fa-project-diagram text-blue-500 mr-2"></i> {title}</h4>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Region: {regionFilter}</div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto custom-scrollbar flex items-center justify-start p-12 min-w-max">
                
                {/* 1. External / User Layer */}
                <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-2xl shadow-inner border border-slate-200">
                        <i className="fas fa-users"></i>
                    </div>
                    <div className="mt-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">External</div>
                </div>

                <FlowArrow />

                {/* 2. Edge / Access Layer */}
                <FlowBox 
                    title="Access & Edge" 
                    items={edge} 
                    emptyText="No Edge Nodes" 
                />

                <FlowArrow />

                {/* 3. Networking Services */}
                <FlowBox 
                    title="Networking Services" 
                    items={[
                        ...(eips.length > 0 ? [{ id: 'eip-pool', name: `${eips.length} Allocated`, type: 'EIP Pool', status: eips[0].status }] : []),
                        ...network
                    ]} 
                    emptyText="No Network Nodes" 
                />

                <FlowArrow />

                {/* 4. Application Components */}
                <FlowBox 
                    title="Application Components" 
                    items={compute} 
                    emptyText="No Compute Nodes" 
                />

                <FlowArrow />

                {/* 5. Storage & Backup */}
                <FlowBox 
                    title="Storage & Data" 
                    items={storage} 
                    emptyText="No Storage Nodes" 
                />

            </div>
        </div>
    );
}
