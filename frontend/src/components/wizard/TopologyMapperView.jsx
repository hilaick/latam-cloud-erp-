import React, { useState, useEffect, useMemo, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext'; 

export const HUAWEI_REGIONS = [
    { group: "Latin America", options: [{ id: "na-mexico-1", name: "LA-Mexico City1" }, { id: "la-north-2", name: "LA-Mexico City2" }, { id: "sa-brazil-1", name: "LA-Sao Paulo1" }, { id: "la-south-2", name: "LA-Santiago" }, { id: "sa-argentina-1", name: "LA-Buenos Aires1" }] },
    { group: "Europe, Middle East & Africa", options: [{ id: "eu-west-101", name: "EU-Dublin" }, { id: "tr-west-1", name: "TR-Istanbul" }, { id: "me-east-1", name: "ME-Riy Riyadh" }, { id: "af-south-1", name: "AF-Johannesburg" }, { id: "af-north-1", name: "AF-Cairo" }] },
    { group: "Asia Pacific", options: [{ id: "ap-southeast-1", name: "CN-Hong Kong" }, { id: "ap-southeast-2", name: "AP-Bangkok" }, { id: "ap-southeast-3", name: "AP-Singapore" }, { id: "ap-southeast-4", name: "AP-Jakarta" }, { id: "ap-southeast-5", name: "AP-Manila" }] },
    { group: "Chinese Mainland", options: [{ id: "cn-north-1", name: "CN North-Beijing1" }, { id: "cn-north-4", name: "CN North-Beijing4" }, { id: "cn-north-9", name: "CN North-Ulanqab1" }, { id: "cn-north-12", name: "CN North3" }, { id: "cn-east-3", name: "CN East-Shanghai1" }, { id: "cn-east-2", name: "CN East-Shanghai2" }, { id: "cn-east-5", name: "CN East-Qingdao" }, { id: "cn-east-4", name: "CN East2" }, { id: "cn-south-1", name: "CN South-Guangzhou" }, { id: "cn-southwest-2", name: "CN Southwest-Guiyang1" }] }
];

export default function TopologyMapperView({ activeProject, onUpdateProject }) {
    const { customers } = useContext(ERPContext); 

    const [localNodes, setLocalNodes] = useState(activeProject?.mapperNodes || []); 
    const [activeTab, setActiveTab] = useState('table'); 
    const [regionFilter, setRegionFilter] = useState('All');
    const [selectedNode, setSelectedNode] = useState(null);
    const [reconcileView, setReconcileView] = useState('table'); 
    const [showFaq, setShowFaq] = useState(false); 
    
    useEffect(()=>{ setLocalNodes(activeProject?.mapperNodes || []); }, [activeProject]);
    
    const saveArchitecture = () => {
        onUpdateProject(activeProject.id, 'mapperNodes', localNodes);
        alert("Architecture Configuration Saved Successfully.");
    };

    // 🚨 FIX: Native browser fullscreen with CSS escape helper
    const toggleFullScreen = (elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen().catch(err => alert(`Error enabling full-screen: ${err.message}`));
            el.classList.add('fixed-fullscreen-mode');
        } else {
            document.exitFullscreen();
        }
    };

    // Correcting escape key to clean up classes
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                document.querySelectorAll('.fixed-fullscreen-mode').forEach(el => el.classList.remove('fixed-fullscreen-mode'));
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const getShortNetType = (type) => {
        const t = String(type || 'VPC');
        if (t.includes('Security') || t === 'SG') return 'SG';
        if (t.includes('NAT')) return 'NAT';
        if (t.includes('Customer Gateway')) return 'CGW';
        if (t.includes('Connection')) return 'VPN-Conn';
        if (t.includes('VPN')) return 'VPN';
        if (t.includes('EIP')) return 'EIP';
        if (t.includes('Subnet')) return 'Subnet';
        return 'VPC';
    };

    const quotedNodes = useMemo(() => {
        const fallbackRegion = activeProject?.region || 'la-south-2';
        const qNodes = [];
        (activeProject?.blueprintData?.topology?.compute || []).forEach((s, i) => qNodes.push({ id: `q-srv-${i}`, name: s.name, type: 'ECS', location: 'Compute-Subnet', region: s.metadata?.region || fallbackRegion, ip: 'TBD', status: 'Quoted Only' }));
        (activeProject?.blueprintData?.topology?.database || []).forEach((d, i) => qNodes.push({ id: `q-db-${i}`, name: d.name, type: 'RDS', location: 'Data-Subnet', region: d.metadata?.region || fallbackRegion, ip: 'TBD', status: 'Quoted Only' }));
        (activeProject?.blueprintData?.topology?.network || []).forEach((n, i) => qNodes.push({ id: `q-net-${i}`, name: n.name, type: getShortNetType(n.type), location: 'Cloud-Network', region: n.metadata?.region || fallbackRegion, ip: 'TBD', status: 'Quoted Only' }));
        (activeProject?.blueprintData?.topology?.storage || []).forEach((s, i) => qNodes.push({ id: `q-st-${i}`, name: s.name, type: s.type || 'OBS', location: 'Global', region: s.metadata?.region || fallbackRegion, ip: 'TBD', status: 'Quoted Only' }));
        return qNodes;
    }, [activeProject?.blueprintData, activeProject?.region]);

    const liveNodes = useMemo(() => {
        const raw = activeProject?.mgcData?.raw_inventory || {};
        const fallbackRegion = activeProject?.region || 'la-south-2';
        const mNodes = [];
        (raw.network || []).forEach((net, i) => mNodes.push({ id: `l-net-${i}`, name: net.name || `${getShortNetType(net.type)}-${i}`, type: getShortNetType(net.type), ip: net.cidr || net.specs?.cidr || net.specs?.ip || net.public_ip_address || 'N/A', location: 'Cloud-Network', region: net.region || net.specs?.region || fallbackRegion, status: 'Live Only' }));
        (raw.storage || []).forEach((st, i) => mNodes.push({ id: `l-st-${i}`, name: st.name || `${st.type||'OBS'}-${i}`, type: st.type||'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global', region: st.location || st.region || 'Global', status: 'Live Only' }));
        (raw.servers || raw.compute || []).forEach((srv, i) => mNodes.push({ id: `l-srv-${i}`, name: srv.name, type: 'ECS', ip: srv.private_ip_address || srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet', region: srv.region || srv.specs?.region || fallbackRegion, status: 'Live Only' }));
        (raw.databases || []).forEach((db, i) => mNodes.push({ id: `l-db-${i}`, name: db.name, type: 'RDS', ip: db.private_ip_address || db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet', region: db.region || db.specs?.region || fallbackRegion, status: 'Live Only' }));
        return mNodes;
    }, [activeProject?.mgcData, activeProject?.region]);

    const openReconciliationView = () => {
        if (!activeProject?.mgcData) return alert('Run MgC Discovery first to reconcile against the SOW!');
        setActiveTab('reconcile');
    };

    const finalizeReconciliation = () => {
        const merged = [];
        let tempQuoted = [...quotedNodes];
        
        liveNodes.forEach((mNode, index) => {
            const mNameNorm = String(mNode.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            const mIp = (mNode.ip && mNode.ip !== 'N/A' && mNode.ip !== 'TBD') ? mNode.ip : null;

            let matchIdx = tempQuoted.findIndex(q => {
                const qNameNorm = String(q.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
                return ((qNameNorm === mNameNorm) || (mIp && q.ip === mIp));
            });

            if (matchIdx === -1) {
                const mNameClean = mNameNorm.replace(/(ecs|rds|server|vm|node|0+.*)$/g, '');
                if(mNameClean.length >= 4) {
                    matchIdx = tempQuoted.findIndex(q => {
                        const qNameClean = String(q.name || "").toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(ecs|rds|server|vm|node|0+.*)$/g, '');
                        return qNameClean.length >= 4 && (qNameClean.includes(mNameClean) || mNameClean.includes(qNameClean));
                    });
                }
            }

            if (matchIdx !== -1) { 
                merged.push({ id: `mgc-${Date.now()}-${index}`, ...mNode, name: tempQuoted[matchIdx].name, status: 'Matched', config: {} }); 
                tempQuoted.splice(matchIdx, 1); 
            } else { 
                merged.push({ id: `mgc-${Date.now()}-${index}`, ...mNode, status: 'Live Only', config: {} }); 
            }
        });

        tempQuoted.forEach((q, i) => merged.push({ id: `quo-${Date.now()}-${i}`, ...q, status: 'Quoted Only', config: {} }));
        
        setLocalNodes(merged);
        setActiveTab('table');
        alert("Reconciliation Complete. Review your Target Architecture.");
    };

    const handleUpdateNode = (id, field, value) => setLocalNodes(localNodes.map(n => n.id === id ? { ...n, [field]: value } : n));
    const handleAddNode = () => setLocalNodes([...localNodes, { id: `manual-${Date.now()}`, name: 'New Resource', type: 'ECS', ip: '0.0.0.0/32', location: 'New-Subnet', region: activeProject?.region || 'la-south-2', status: 'Manual', config: {} }]);
    const handleDeleteNode = (id) => setLocalNodes(localNodes.filter(n => n.id !== id));

    const getIcon = (type) => {
        const t = String(type || "").toLowerCase();
        if (t.includes('ecs') || t.includes('vm')) return 'fa-server text-blue-600'; 
        if (t.includes('rds') || t.includes('db')) return 'fa-database text-rose-600';
        if (t.includes('subnet')) return 'fa-network-wired text-indigo-400';
        if (t.includes('sg') || t.includes('security')) return 'fa-shield-alt text-amber-500';
        if (t.includes('nat') || t.includes('eip') || t.includes('vpn') || t.includes('cgw')) return 'fa-route text-indigo-600';
        if (t.includes('elb') || t.includes('loadbalancer')) return 'fa-sitemap text-blue-500';
        if (t.includes('obs') || t.includes('storage') || t.includes('cbr') || t.includes('backup')) return 'fa-hdd text-emerald-600';
        if (t.includes('cce') || t.includes('k8s')) return 'fa-cubes text-blue-500';
        return 'fa-microchip text-slate-500';
    };

    // 🚨 FIX: PROPER INLINE STATUS DOTS
    const getStatusIcon = (status) => {
        if(status === 'Matched') return <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shrink-0" title="Matched in Quotation and Live"></div>;
        if(status === 'Live Only') return <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm animate-pulse shrink-0" title="Scope Creep"></div>;
        if(status === 'Quoted Only') return <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-sm shrink-0" title="Missing"></div>;
        if(status === 'Manual') return <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm shrink-0" title="Manually added"></div>;
        return <div className="w-2.5 h-2.5 bg-slate-300 rounded-full shadow-sm shrink-0"></div>;
    };

    const uniqueRegions = ['All', ...new Set([
        ...localNodes.map(n => n.region), ...quotedNodes.map(n => n.region), ...liveNodes.map(n => n.region)
    ].filter(r => r && r !== 'TBD' && r !== 'Global'))];

    // 🚨 PRO-TIER INNOSTAGE DISTRIBUTION RENDERER
    const renderCanvasPane = (title, paneNodes, onNodeClick, currentRegionFilter) => {
        const paneGroups = { Edge: [], Subnets: {}, Regional: [], Global: [], Pending: [] };
        
        paneNodes.filter(n => currentRegionFilter === 'All' || n.region === currentRegionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = String(n.location || "");
            
            if (loc === 'Pending-Allocation') paneGroups.Pending.push(n);
            else if (['EIP', 'NAT', 'VPN', 'CGW', 'VPN-CONN', 'ELB', 'SG'].includes(type)) paneGroups.Edge.push(n);
            else if (['OBS', 'STORAGE'].includes(type) || loc === 'Global') paneGroups.Global.push(n);
            else if (['CBR', 'CCE'].includes(type)) paneGroups.Regional.push(n); // 🚨 CBR IS REGIONAL
            else if (type !== 'VPC') {
                if (!paneGroups.Subnets[loc]) paneGroups.Subnets[loc] = [];
                paneGroups.Subnets[loc].push(n);
            }
        });

        // sleek InnoStage node card
        const renderNodeCard = (n) => (
            <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white border border-slate-200 p-2 w-48 rounded shadow-sm flex items-center gap-3 relative ${onNodeClick ? 'cursor-pointer hover:border-blue-500 hover:shadow-md transition-all' : ''}`}>
                <div className="absolute -top-1.5 -right-1.5 z-10">{getStatusIcon(n.status)}</div>
                <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                    <i className={`fas ${getIcon(n.type)} text-slate-600 text-sm`}></i>
                </div>
                <div className="overflow-hidden">
                    <div className="text-[10px] font-bold text-slate-800 truncate" title={n.name}>{n.name}</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">{n.type} {n.ip !== 'N/A' && n.ip !== 'TBD' ? `| ${n.ip}` : ''}</div>
                </div>
            </div>
        );

        return (
            <div className="flex flex-col items-center w-full min-w-[800px] h-full p-4">
                {/* HUAWEI CLOUD REGION BOUNDARY */}
                <div className="w-full border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-lg p-6 relative shadow-sm flex-1 overflow-auto custom-scrollbar">
                    <div className="absolute top-0 left-0 bg-slate-200 px-3 py-1 rounded-br-lg text-[10px] font-bold text-slate-700 uppercase tracking-widest shadow-sm">
                        <i className="fas fa-map-marker-alt mr-2"></i> {title} - Region: {currentRegionFilter}
                    </div>

                    {/* EDGE / PUBLIC ZONE */}
                    {paneGroups.Edge.length > 0 && (
                        <div className="mt-8 mb-6 border border-indigo-200 bg-indigo-50/50 rounded-lg p-4 relative">
                            <div className="absolute -top-2.5 left-4 bg-indigo-100 px-2 rounded text-[9px] font-black text-indigo-800 uppercase tracking-widest border border-indigo-200">Public Network / Edge Gateway</div>
                            <div className="flex flex-wrap gap-4 pt-2">
                                {paneGroups.Edge.map(n => renderNodeCard(n))}
                            </div>
                        </div>
                    )}

                    {/* VPC BOUNDARY */}
                    <div className="border border-blue-300 bg-blue-50/30 rounded-lg p-6 relative">
                        <div className="absolute top-0 left-0 bg-blue-100 px-3 py-1 rounded-br-lg text-[10px] font-bold text-blue-800 uppercase tracking-widest border-b border-r border-blue-200">
                            <i className="fas fa-cloud mr-2"></i> Virtual Private Cloud (VPC)
                        </div>
                        
                        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {Object.entries(paneGroups.Subnets).map(([subName, subNodes]) => (
                                <div key={subName} className="border border-slate-300 bg-white/80 p-4 rounded-lg relative shadow-sm">
                                    <span className="absolute -top-2.5 left-4 text-[9px] font-black text-slate-600 uppercase tracking-widest bg-slate-100 px-2 rounded border border-slate-200">
                                        <i className="fas fa-network-wired mr-1 opacity-50"></i> {subName}
                                    </span>
                                    <div className="flex flex-wrap gap-4 pt-3">
                                        {subNodes.map(n => renderNodeCard(n))}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(paneGroups.Subnets).length === 0 && <div className="text-xs text-slate-400 p-4 italic">No subnet resources mapped.</div>}
                        </div>
                    </div>

                    {/* REGIONAL SERVICES ZONE (CBR IS HERE) */}
                    {paneGroups.Regional.length > 0 && (
                        <div className="mt-6 border border-emerald-200 bg-emerald-50/50 rounded-lg p-4 relative">
                            <div className="absolute -top-2.5 left-4 bg-emerald-100 px-2 rounded text-[9px] font-black text-emerald-800 uppercase tracking-widest border border-emerald-200">Regional Services (Backup / Container)
