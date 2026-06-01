import React, { useState, useEffect, useMemo, useContext } from 'react';
import { EditableCell } from '../../utils/helpers';
import { ERPContext } from '../../context/ERPContext'; 

export const HUAWEI_REGIONS = [
    { group: "Latin America", options: [{ id: "na-mexico-1", name: "LA-Mexico City1" }, { id: "la-north-2", name: "LA-Mexico City2" }, { id: "sa-brazil-1", name: "LA-Sao Paulo1" }, { id: "la-south-2", name: "LA-Santiago" }, { id: "sa-argentina-1", name: "LA-Buenos Aires1" }] },
    { group: "Europe, Middle East & Africa", options: [{ id: "eu-west-101", name: "EU-Dublin" }, { id: "tr-west-1", name: "TR-Istanbul" }, { id: "me-east-1", name: "ME-Riyadh" }, { id: "af-south-1", name: "AF-Johannesburg" }, { id: "af-north-1", name: "AF-Cairo" }] },
    { group: "Asia Pacific", options: [{ id: "ap-southeast-1", name: "CN-Hong Kong" }, { id: "ap-southeast-2", name: "AP-Bangkok" }, { id: "ap-southeast-3", name: "AP-Singapore" }, { id: "ap-southeast-4", name: "AP-Jakarta" }, { id: "ap-southeast-5", name: "AP-Manila" }] },
    { group: "Chinese Mainland", options: [{ id: "cn-north-1", name: "CN North-Beijing1" }, { id: "cn-north-4", name: "CN North-Beijing4" }, { id: "cn-north-9", name: "CN North-Ulanqab1" }, { id: "cn-north-12", name: "CN North3" }, { id: "cn-east-3", name: "CN East-Shanghai1" }, { id: "cn-east-2", name: "CN East-Shanghai2" }, { id: "cn-east-5", name: "CN East-Qingdao" }, { id: "cn-east-4", name: "CN East2" }, { id: "cn-south-1", name: "CN South-Guangzhou" }, { id: "cn-southwest-2", name: "CN Southwest-Guiyang1" }] }
];

export default function TopologyMapperView({ activeProject, onUpdateProject }) {
    const { customers } = useContext(ERPContext); 

    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];
    const networks = activeProject?.blueprintData?.topology?.network || [];
    const storages = activeProject?.blueprintData?.topology?.storage || [];

    const [localNodes, setLocalNodes] = useState(activeProject?.mapperNodes || []); 
    const [activeTab, setActiveTab] = useState('reconcile'); // Default to reconcile first
    const [regionFilter, setRegionFilter] = useState('All');
    const [selectedNode, setSelectedNode] = useState(null);
    const [reconcileView, setReconcileView] = useState('table'); 
    const [showFaq, setShowFaq] = useState(false); 
    
    useEffect(()=>{ setLocalNodes(activeProject?.mapperNodes || []); }, [activeProject]);
    
    const saveArchitecture = () => {
        onUpdateProject(activeProject.id, 'mapperNodes', localNodes);
        alert("Target Architecture Configuration Saved Successfully.");
    };

    // 🚨 FIX: Strict Fullscreen handling without CSS constraint conflicts
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

    // Listen for Escape key to remove fullscreen classes safely
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
        alert("Reconciliation Complete. Review your Target Architecture List to refine the final names and IPs.");
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

    const getStatusIcon = (status) => {
        if(status === 'Matched') return <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shrink-0" title="Matched in Quotation and Live"></div>;
        if(status === 'Live Only') return <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm animate-pulse shrink-0" title="Scope Creep (Live Only)"></div>;
        if(status === 'Quoted Only') return <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-sm shrink-0" title="Missing (SOW Only)"></div>;
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
            else if (['CBR', 'CCE'].includes(type)) paneGroups.Regional.push(n); 
            else if (type !== 'VPC') {
                if (!paneGroups.Subnets[loc]) paneGroups.Subnets[loc] = [];
                paneGroups.Subnets[loc].push(n);
            }
        });

        // Sleek horizontal InnoStage node card
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
                <div className="w-full border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-lg p-6 relative shadow-sm">
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

                    {/* REGIONAL SERVICES ZONE */}
                    {paneGroups.Regional.length > 0 && (
                        <div className="mt-6 border border-emerald-200 bg-emerald-50/50 rounded-lg p-4 relative">
                            <div className="absolute -top-2.5 left-4 bg-emerald-100 px-2 rounded text-[9px] font-black text-emerald-800 uppercase tracking-widest border border-emerald-200">Regional Services</div>
                            <div className="flex flex-wrap gap-4 pt-2">
                                {paneGroups.Regional.map(n => renderNodeCard(n))}
                            </div>
                        </div>
                    )}
                </div>

                {/* GLOBAL SERVICES ZONE (OUTSIDE REGION) */}
                {paneGroups.Global.length > 0 && (
                    <div className="w-full border-2 border-slate-200 bg-white rounded-lg p-6 relative shadow-sm mt-6">
                        <div className="absolute top-0 left-0 bg-slate-700 px-3 py-1 rounded-br-lg text-[10px] font-bold text-white uppercase tracking-widest shadow-sm">
                            <i className="fas fa-globe mr-2"></i> Global & External Services
                        </div>
                        <div className="flex flex-wrap gap-4 pt-4">
                            {paneGroups.Global.map(n => renderNodeCard(n))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12 relative">
            <style>{`
                /* Fullscreen override logic to crush browser constraints */
                .fixed-fullscreen-mode {
                    position: fixed !important;
                    top: 0 !important; left: 0 !important;
                    width: 100vw !important; height: 100vh !important;
                    max-height: none !important;
                    z-index: 9999 !important;
                    background: #f8fafc !important; /* light slate */
                    border-radius: 0 !important;
                    padding: 1rem !important;
                    overflow: hidden !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
            `}</style>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 relative overflow-hidden">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-200 pb-4 gap-4">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-sitemap text-indigo-500"></i> Architecture & Scope Manager</h3>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Reconcile Source Reality with Target Design.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto">
                        <button onClick={()=>setShowFaq(true)} className="px-4 py-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 rounded-lg transition-colors mr-2 shrink-0"><i className="fas fa-question-circle mr-1"></i> Help</button>
                        <button onClick={()=>setActiveTab('reconcile')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'reconcile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-random mr-2"></i> 1. Reconcile Scope</button>
                        <button onClick={()=>setActiveTab('table')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-table mr-2"></i> 2. Target List</button>
                        <button onClick={()=>setActiveTab('canvas')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'canvas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-project-diagram mr-2"></i> 3. Target Diagram</button>
                    </div>
                </div>

                {/* TAB: RECONCILIATION */}
                {activeTab === 'reconcile' && (
                    <div id="reconcile-container" className="animate-fade-in flex flex-col min-h-[600px] bg-white resize-y overflow-auto pb-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                            <div>
                                <h4 className="font-black text-slate-800">Dual-Pane Reconciliation</h4>
                                <p className="text-xs text-slate-500 mt-1">Review the SOW Quoted Scope alongside the Live Discovery, then Merge.</p>
                            </div>
                            <div className="flex gap-4 items-center w-full md:w-auto flex-wrap">
                                <button onClick={()=>toggleFullScreen('reconcile-container')} className="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm shrink-0"><i className="fas fa-expand mr-1"></i> Full Screen</button>
                                
                                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
                                    <button onClick={()=>setReconcileView('table')} className={`px-4 py-1.5 text-[10px] uppercase font-black tracking-widest rounded transition-colors ${reconcileView === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-list mr-1"></i> List</button>
                                    <button onClick={()=>setReconcileView('canvas')} className={`px-4 py-1.5 text-[10px] uppercase font-black tracking-widest rounded transition-colors ${reconcileView === 'canvas' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-project-diagram mr-1"></i> Diagram</button>
                                </div>
                                <button onClick={finalizeReconciliation} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-md transition-colors shrink-0">Merge & Next</button>
                            </div>
                        </div>

                        {reconcileView === 'table' && (
                            <div className="flex flex-col xl:flex-row gap-6 flex-1 animate-fade-in overflow-hidden">
                                <div className="xl:w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col shadow-inner">
                                    <h4 className="font-black text-slate-700 uppercase tracking-widest text-[11px] mb-4 text-center pb-2 border-b border-slate-200">Quoted Scope (SOW)</h4>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                        {quotedNodes.length === 0 && <div className="text-center text-slate-400 text-xs py-8">No SOW data imported.</div>}
                                        {quotedNodes.map((n, i) => (
                                            <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3"><i className={`fas ${getIcon(n.type)} text-lg opacity-80`}></i><div><div className="font-bold text-xs text-slate-800">{n.name}</div><div className="text-[10px] text-slate-500 uppercase">{n.type}</div></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="xl:w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col shadow-inner">
                                    <h4 className="font-black text-slate-700 uppercase tracking-widest text-[11px] mb-4 text-center pb-2 border-b border-slate-200">Discovered Scope (Live)</h4>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                        {liveNodes.length === 0 && <div className="text-center text-slate-400 text-xs py-8">No Live Discovery data found.</div>}
                                        {liveNodes.map((n, i) => (
                                            <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3"><i className={`fas ${getIcon(n.type)} text-lg opacity-80`}></i><div><div className="font-bold text-xs text-slate-800">{n.name}</div><div className="text-[10px] text-slate-500 uppercase">{n.type} | {n.ip}</div></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {reconcileView === 'canvas' && (
                            <div className="flex flex-col xl:flex-row gap-6 flex-1 overflow-x-auto custom-scrollbar animate-fade-in">
                                <div className="xl:w-1/2 bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden flex flex-col min-w-[600px]">
                                    <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0"><h4 className="font-black text-slate-700 uppercase tracking-widest text-[11px] text-center">Quoted Diagram (SOW)</h4></div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100/50 relative">
                                        {quotedNodes.length === 0 ? <div className="text-center text-slate-400 text-xs py-8">No SOW data imported.</div> : renderCanvasPane('Quoted Infra', quotedNodes, null, regionFilter)}
                                    </div>
                                </div>
                                <div className="xl:w-1/2 bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden flex flex-col min-w-[600px]">
                                    <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0"><h4 className="font-black text-slate-700 uppercase tracking-widest text-[11px] text-center">Discovered Diagram (Live)</h4></div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100/50 relative">
                                        {liveNodes.length === 0 ? <div className="text-center text-slate-400 text-xs py-8">No Live Discovery data found.</div> : renderCanvasPane('Live Infra', liveNodes, null, regionFilter)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: TARGET ARCHITECTURE LIST */}
                {activeTab === 'table' && (
                    <div id="table-container" className="flex flex-col bg-slate-50 rounded-2xl border border-slate-200 shadow-sm animate-fade-in resize-y overflow-auto min-h-[600px] bg-white">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3 bg-white shrink-0">
                            <div className="flex gap-2 flex-wrap items-center">
                                <h4 className="font-black text-slate-800 mr-4">Target Architecture List</h4>
                                <button onClick={handleAddNode} className="py-2 px-4 bg-white border border-slate-300 hover:border-indigo-400 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors"><i className="fas fa-plus mr-2"></i> Add Custom Node</button>
                                <button onClick={saveArchitecture} className="py-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-md transition-transform active:scale-95 ml-2"><i className="fas fa-save mr-2"></i> Save Blueprint</button>
                            </div>
                            <button onClick={()=>toggleFullScreen('table-container')} className="py-2 px-4 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-200 transition-colors border border-slate-300"><i className="fas fa-expand mr-2"></i> Full Screen</button>
                        </div>
                        
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex gap-6 text-[10px] font-black uppercase tracking-widest text-slate-600 shrink-0 flex-wrap">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm"></div> Matched (SOW + Live)</div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm"></div> Scope Creep (Live Only)</div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-sm"></div> Missing (SOW Only)</div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm"></div> Manual Addition</div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar bg-white relative">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 w-64 font-black">Target Resource Name</th>
                                        <th className="p-4 w-32 font-black">Target Region</th>
                                        <th className="p-4 w-28 font-black">Resource Type</th>
                                        <th className="p-4 w-32 font-black">Target IP / CIDR</th>
                                        <th className="p-4 w-40 font-black">Target Subnet / Zone</th>
                                        <th className="p-4 w-24 text-center font-black">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {localNodes.length === 0 ? (
                                        <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50 m-4 rounded-xl">Go to Reconcile tab and click Merge to generate Target Architecture.</td></tr>
                                    ) : (
                                        localNodes.map(n => (
                                            <tr key={n.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-4 font-bold text-slate-800">
                                                    <div className="flex items-center gap-3">
                                                        {getStatusIcon(n.status)}
                                                        <div className="flex-1"><EditableCell value={n.name} onSave={v=>handleUpdateNode(n.id, 'name', v)} /></div>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-slate-600 uppercase text-[10px] tracking-widest"><EditableCell value={n.region} onSave={v=>handleUpdateNode(n.id, 'region', v)} /></td>
                                                <td className="p-4 font-bold text-indigo-700">
                                                    <select value={n.type} onChange={e => handleUpdateNode(n.id, 'type', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded p-1 outline-none cursor-pointer">
                                                        <option value="ECS">ECS (Compute)</option><option value="RDS">RDS (Database)</option><option value="VPC">VPC</option>
                                                        <option value="Subnet">Subnet</option><option value="SG">Security Group</option><option value="NAT">NAT Gateway</option>
                                                        <option value="EIP">Elastic IP</option><option value="VPN">VPN Gateway</option><option value="CGW">Customer Gateway</option>
                                                        <option value="VPN-Conn">VPN Connection</option><option value="OBS">OBS (Storage)</option><option value="CBR">CBR (Backup)</option>
                                                        <option value="ELB">ELB</option><option value="CCE">CCE (K8s)</option>
                                                    </select>
                                                </td>
                                                <td className="p-4 font-mono text-slate-600 font-bold"><EditableCell value={n.ip} onSave={v=>handleUpdateNode(n.id, 'ip', v)} /></td>
                                                <td className="p-4 font-bold text-slate-600"><EditableCell value={n.location} onSave={v=>handleUpdateNode(n.id, 'location', v)} /></td>
                                                <td className="p-4 text-center space-x-3">
                                                    <button onClick={()=>setSelectedNode(n)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Edit Configuration Properties"><i className="fas fa-cog"></i></button>
                                                    <button onClick={()=>handleDeleteNode(n.id)} className="text-slate-400 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB: TARGET ARCHITECTURE CANVAS */}
                {activeTab === 'canvas' && (
                    <div id="canvas-container" className="flex flex-col bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-inner animate-fade-in resize-y overflow-auto min-h-[700px]">
                        <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-20 shrink-0">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-filter text-slate-400"></i>
                                <div className="flex gap-2">
                                    {uniqueRegions.map(r => (
                                        <button key={r} onClick={()=>setRegionFilter(r)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors border ${regionFilter === r ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={()=>toggleFullScreen('canvas-container')} className="py-2 px-4 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-700 transition-colors"><i className="fas fa-expand mr-2"></i> Full Screen</button>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50">
                            {localNodes.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-20">
                                    <i className="fas fa-project-diagram text-6xl mb-4 opacity-50"></i>
                                    <p className="font-black text-lg">Awaiting Target Architecture Data</p>
                                </div>
                            ) : (
                                renderCanvasPane('Final Target Architecture', localNodes, setSelectedNode, regionFilter)
                            )}
                        </div>
                    </div>
                )}
                
                {/* 🚨 HELP / FAQ DRAWER */}
                {showFaq && (
                    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-slate-200 z-[10000] flex flex-col animate-slide-left overflow-hidden">
                        <div className="bg-indigo-600 text-white p-6 border-b border-indigo-700 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-lg"><i className="fas fa-book-open mr-2"></i> Methodology Guide</h3>
                                <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-1">Architecture & Migration Flow</p>
                            </div>
                            <button onClick={()=>setShowFaq(false)} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 text-sm text-slate-700 leading-relaxed custom-scrollbar">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 mb-2">What is MgC Discovery?</h4>
                                <p>This tool connects to the customer's current environment. It fetches the <strong className="text-blue-600">"As-Is"</strong> technical reality of what is running right now in their datacenter or cloud.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 mb-2">What is Reconciliation?</h4>
                                <p>Sales sells a Quotation (SOW) that rarely matches reality perfectly. Reconciliation forces you to compare the SOW against the MgC Discovery side-by-side to catch <strong>Scope Creep</strong> before you start building.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 mb-2">Why edit the Target Architecture?</h4>
                                <p>The Resource List is the <strong className="text-emerald-600">"To-Be"</strong> deployment blueprint. You should rename old server names (e.g., `WIN-2012-OLD` ➡️ `prd-latam-ecs-01`) and remap IPs here to match your strict cloud conventions. What you save here is what gets deployed.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* NODE PROPERTIES DRAWER */}
                {selectedNode && (
                    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-slate-200 z-[10000] flex flex-col animate-slide-left overflow-hidden">
                        <div className="bg-slate-800 text-white p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-lg"><i className="fas fa-sliders-h text-blue-400 mr-2"></i> Node Properties</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">{selectedNode.name}</p>
                            </div>
                            <button onClick={()=>setSelectedNode(null)} className="text-slate-400 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 custom-scrollbar">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3 border-b border-slate-100 pb-2">Core Identity</h4>
                                <div className="space-y-3">
                                    <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Resource Type</label><div className="font-black text-xs text-indigo-700">{selectedNode.type}</div></div>
                                    <div><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Location Zone</label><div className="font-bold text-xs text-slate-800">{selectedNode.location}</div></div>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3 border-b border-slate-100 pb-2">Configuration / Dependencies</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Custom Metadata (JSON)</label>
                                        <textarea 
                                            defaultValue={JSON.stringify(selectedNode.config || {}, null, 2)} 
                                            onChange={e => { try { handleUpdateNode(selectedNode.id, 'config', JSON.parse(e.target.value)); } catch(e){} }}
                                            className="w-full h-32 p-2 text-[10px] font-mono border border-slate-300 rounded outline-none focus:border-blue-500 custom-scrollbar"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-slate-200 flex gap-2 shrink-0">
                            <button onClick={()=>setSelectedNode(null)} className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest rounded-lg transition-colors">Close</button>
                            <button onClick={saveArchitecture} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-colors">Save Blueprint</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
