import React, { useState, useEffect, useMemo, useContext } from 'react';
import { EditableCell } from '../../utils/helpers';
import { ERPContext } from '../../context/ERPContext'; 

export default function TopologyMapperView({ activeProject, onUpdateProject, onPromote }) {
    const { customers } = useContext(ERPContext); 

    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];
    const networks = activeProject?.blueprintData?.topology?.network || [];
    const storages = activeProject?.blueprintData?.topology?.storage || [];

    const [localNodes, setLocalNodes] = useState(activeProject?.mapperNodes || []); 
    const [activeTab, setActiveTab] = useState('table'); 
    const [regionFilter, setRegionFilter] = useState('All');
    const [selectedNode, setSelectedNode] = useState(null);
    const [reconcileView, setReconcileView] = useState('table'); 
    const [showFaq, setShowFaq] = useState(false); // 🚨 NEW FAQ STATE
    
    useEffect(()=>{ setLocalNodes(activeProject?.mapperNodes || []); }, [activeProject]);
    
    const saveArchitecture = () => {
        onUpdateProject(activeProject.id, 'mapperNodes', localNodes);
        alert("Architecture Configuration Saved Successfully.");
    };

    const toggleFullScreen = (elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen().catch(err => alert(`Error enabling full-screen: ${err.message}`));
            el.classList.add('is-fullscreen'); // 🚨 FIX FOR HEIGHT CONSTRAINT
        } else {
            document.exitFullscreen();
            el.classList.remove('is-fullscreen');
        }
    };

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

    const renderCanvasPane = (title, paneNodes, theme, onNodeClick, currentRegionFilter) => {
        const paneGroups = { EdgeGateways: [], EIPs: [], Subnets: {}, Global: [], Pending: [] };
        paneNodes.filter(n => currentRegionFilter === 'All' || n.region === currentRegionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = String(n.location || "");
            
            if (loc === 'Pending-Allocation') paneGroups.Pending.push(n);
            else if (['EIP'].includes(type)) paneGroups.EIPs.push(n);
            else if (['NAT', 'VPN', 'CGW', 'VPN-CONN', 'ELB'].includes(type)) paneGroups.EdgeGateways.push(n);
            else if (['OBS', 'CBR', 'STORAGE'].includes(type) || loc === 'Global') paneGroups.Global.push(n);
            else if (type !== 'VPC') {
                if (!paneGroups.Subnets[loc]) paneGroups.Subnets[loc] = [];
                paneGroups.Subnets[loc].push(n);
            }
        });

        const themes = {
            indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50/20', hBg: 'bg-indigo-600', hBorder: 'border-indigo-700', tBg: 'bg-indigo-50', tBorder: 'border-indigo-100', tText: 'text-indigo-900', gBorder: 'border-indigo-300' },
            slate:  { border: 'border-slate-300', bg: 'bg-slate-50/50', hBg: 'bg-slate-600', hBorder: 'border-slate-700', tBg: 'bg-slate-100', tBorder: 'border-slate-200', tText: 'text-slate-800', gBorder: 'border-slate-400' },
            blue:   { border: 'border-blue-300', bg: 'bg-blue-50/20', hBg: 'bg-blue-600', hBorder: 'border-blue-700', tBg: 'bg-blue-50', tBorder: 'border-blue-100', tText: 'text-blue-900', gBorder: 'border-blue-400' }
        };
        const t = themes[theme] || themes.indigo;

        return (
            <div className="flex flex-col gap-10 items-center w-full py-4 min-w-[600px]">
                <div className={`w-full max-w-5xl border-4 ${t.border} ${t.bg} rounded-3xl p-8 pt-16 relative shadow-sm`}>
                    <div className={`absolute -top-5 left-8 ${t.hBg} ${t.hBorder} px-6 py-2 rounded-xl text-sm font-black text-white uppercase tracking-widest shadow-md`}>
                        <i className="fas fa-cloud mr-2"></i> {title} {currentRegionFilter !== 'All' ? `(${currentRegionFilter})` : ''}
                    </div>
                    
                    <div className="absolute -top-8 right-8 flex gap-3 flex-wrap max-w-xl justify-end">
                        {paneGroups.EIPs.length > 0 && (
                            <div className="bg-white border-2 border-sky-300 p-2.5 rounded-xl shadow-lg flex items-center gap-3 min-w-[150px] relative cursor-help">
                                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center border border-sky-100"><i className="fas fa-wifi text-sky-600 text-lg"></i></div>
                                <div className="truncate"><div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">EIP Pool</div><div className="font-bold text-[10px] text-sky-900 truncate">{paneGroups.EIPs.length} Allocated IPs</div></div>
                            </div>
                        )}

                        {paneGroups.EdgeGateways.map(n => (
                            <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white border-2 ${t.gBorder} p-2.5 rounded-xl shadow-lg flex items-center gap-3 min-w-[150px] relative ${onNodeClick ? 'cursor-pointer hover:border-blue-500 hover:-translate-y-1 transition-transform' : ''}`}>
                                <div className="absolute -top-1.5 -right-1.5">{getStatusIcon(n.status)}</div>
                                <div className={`w-8 h-8 ${t.tBg} rounded-lg flex items-center justify-center border ${t.tBorder}`}><i className={`${getIcon(n.type)} text-lg`}></i></div>
                                <div className="truncate"><div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{n.type}</div><div className={`font-bold text-[10px] ${t.tText} truncate`} title={n.name}>{n.name}</div></div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                        {Object.entries(paneGroups.Subnets).map(([subName, subNodes]) => (
                            <div key={subName} className="border-2 border-dashed border-slate-400 bg-white/80 p-5 rounded-2xl relative pt-10 shadow-sm">
                                <span className="absolute top-3 left-4 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md border border-slate-300 shadow-sm"><i className="fas fa-network-wired mr-2 opacity-50"></i>{subName}</span>
                                <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mt-2">
                                    {subNodes.map(n => (
                                        <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative flex flex-col items-center text-center ${onNodeClick ? 'cursor-pointer hover:border-blue-500 hover:-translate-y-1 transition-all' : ''}`}>
                                            <div className="absolute -top-1.5 -right-1.5">{getStatusIcon(n.status)}</div>
                                            <i className={`fas ${getIcon(n.type)} text-3xl mt-2 mb-2 opacity-80`}></i>
                                            <div className="font-bold text-[10px] truncate w-full text-slate-800" title={n.name}>{n.name}</div>
                                            <div className="text-[9px] font-black bg-slate-100 text-slate-500 mt-1.5 px-2 py-0.5 rounded uppercase tracking-wider">{n.type}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {paneGroups.Global.length > 0 && (
                    <div className={`w-full max-w-5xl border-2 ${theme === 'slate' ? 'border-slate-300 bg-slate-100/50' : 'border-emerald-300 bg-emerald-50/50'} rounded-2xl relative pt-10 p-6 shadow-sm mt-4`}>
                        <span className={`absolute -top-4 left-6 ${theme === 'slate' ? 'bg-slate-200 text-slate-700 border-slate-400' : 'bg-emerald-100 text-emerald-800 border-emerald-400'} px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm`}><i className="fas fa-globe mr-2"></i> Global / External Services</span>
                        <div className="flex flex-wrap gap-5">
                            {paneGroups.Global.map(n => (
                                <div key={n.id} onClick={()=>onNodeClick && onNodeClick(n)} className={`bg-white p-4 w-36 rounded-xl border border-slate-200 shadow-sm text-center relative ${onNodeClick ? 'cursor-pointer hover:border-emerald-500 hover:-translate-y-1 transition-all' : ''}`}>
                                    <div className="absolute -top-1.5 -right-1.5">{getStatusIcon(n.status)}</div>
                                    <div className={`w-12 h-12 mx-auto ${theme === 'slate' ? 'bg-slate-100 border-slate-200' : 'bg-emerald-50 border-emerald-100'} rounded-full flex items-center justify-center border mb-2`}><i className={`fas ${getIcon(n.type)} text-2xl`}></i></div>
                                    <div className="font-black text-[10px] text-slate-800 truncate" title={n.name}>{n.name}</div>
                                    <div className={`text-[9px] font-black ${theme === 'slate' ? 'text-slate-600 bg-slate-100' : 'text-emerald-600 bg-emerald-50'} mt-1 uppercase tracking-wider rounded px-1 py-0.5`}>{n.type}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12 relative">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 relative overflow-hidden">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-200 pb-4 gap-4">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-sitemap text-indigo-500"></i> Target Architecture Mapper</h3>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Design and configure the final execution scope.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto">
                        <button onClick={()=>setShowFaq(true)} className="px-4 py-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 rounded-lg transition-colors mr-2"><i className="fas fa-question-circle mr-1"></i> Help</button>
                        <button onClick={()=>setActiveTab('table')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-table mr-2"></i> Resource List</button>
                        <button onClick={()=>setActiveTab('canvas')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'canvas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-project-diagram mr-2"></i> Diagram</button>
                    </div>
                </div>

                {/* TAB: DUAL-PANE RECONCILIATION */}
                {activeTab === 'reconcile' && (
                    <div id="reconcile-container" className="animate-fade-in flex flex-col min-h-[600px] bg-white transition-all duration-300 [&.is-fullscreen]:h-screen [&.is-fullscreen]:p-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h4 className="font-black text-blue-900"><i className="fas fa-random mr-2"></i> Dual-Pane Reconciliation Mode</h4>
                                <p className="text-xs text-blue-700 mt-1">Review the SOW Quoted Scope alongside the Live Discovery. Click Merge when ready.</p>
                            </div>
                            <div className="flex gap-4 items-center w-full md:w-auto">
                                <button onClick={()=>toggleFullScreen('reconcile-container')} className="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm"><i className="fas fa-expand mr-1"></i> Full Screen</button>
                                
                                <div className="flex bg-white p-1 rounded-lg border border-blue-200 shadow-sm">
                                    <button onClick={()=>setReconcileView('table')} className={`px-4 py-1.5 text-[10px] uppercase font-black tracking-widest rounded transition-colors ${reconcileView === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-list mr-1"></i> List</button>
                                    <button onClick={()=>setReconcileView('canvas')} className={`px-4 py-1.5 text-[10px] uppercase font-black tracking-widest rounded transition-colors ${reconcileView === 'canvas' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-project-diagram mr-1"></i> Diagram</button>
                                </div>
                                <div className="flex gap-2 border-l border-blue-200 pl-4">
                                    <button onClick={()=>setActiveTab('table')} className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button onClick={finalizeReconciliation} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-md transition-colors">Merge</button>
                                </div>
                            </div>
                        </div>

                        {reconcileView === 'table' && (
                            <div className="flex flex-col xl:flex-row gap-6 flex-1 animate-fade-in pb-4 overflow-hidden">
                                <div className="xl:w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col shadow-inner">
                                    <h4 className="font-black text-slate-700 uppercase tracking-widest text-[11px] mb-4 text-center pb-2 border-b border-slate-200">1. Quoted Scope (SOW)</h4>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                        {quotedNodes.length === 0 && <div className="text-center text-slate-400 text-xs py-8">No SOW data imported.</div>}
                                        {quotedNodes.map((n, i) => (
                                            <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3"><i className={`fas ${getIcon(n.type)} text-lg opacity-80`}></i><div><div className="font-bold text-xs text-slate-800">{n.name}</div><div className="text-[10px] text-slate-500 uppercase">{n.type}</div></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="xl:w-1/2 bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 flex flex-col shadow-inner">
                                    <h4 className="font-black text-indigo-800 uppercase tracking-widest text-[11px] mb-4 text-center pb-2 border-b border-indigo-200">2. Discovered Scope (Live)</h4>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                        {liveNodes.length === 0 && <div className="text-center text-slate-400 text-xs py-8">No Live Discovery data found.</div>}
                                        {liveNodes.map((n, i) => (
                                            <div key={i} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3"><i className={`fas ${getIcon(n.type)} text-lg opacity-80`}></i><div><div className="font-bold text-xs text-indigo-900">{n.name}</div><div className="text-[10px] text-indigo-500 uppercase">{n.type} | {n.ip}</div></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {reconcileView === 'canvas' && (
                            <div className="flex flex-col xl:flex-row gap-6 flex-1 overflow-x-auto custom-scrollbar animate-fade-in pb-4">
                                <div className="xl:w-1/2 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner overflow-hidden flex flex-col min-w-[600px]">
                                    <div className="p-4 border-b border-slate-200 bg-white"><h4 className="font-black text-slate-700 uppercase tracking-widest text-[11px] text-center">1. Quoted Diagram (SOW)</h4></div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-100/50">
                                        {quotedNodes.length === 0 ? <div className="text-center text-slate-400 text-xs py-8">No SOW data imported.</div> : renderCanvasPane('Quoted Infrastructure', quotedNodes, 'slate', null, regionFilter)}
                                    </div>
                                </div>
                                <div className="xl:w-1/2 bg-indigo-50/30 border border-indigo-200 rounded-2xl shadow-inner overflow-hidden flex flex-col min-w-[600px]">
                                    <div className="p-4 border-b border-indigo-200 bg-white"><h4 className="font-black text-indigo-800 uppercase tracking-widest text-[11px] text-center">2. Discovered Diagram (Live)</h4></div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-indigo-50/50">
                                        {liveNodes.length === 0 ? <div className="text-center text-slate-400 text-xs py-8">No Live Discovery data found.</div> : renderCanvasPane('Live Infrastructure', liveNodes, 'blue', null, regionFilter)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: RESOURCE LIST */}
                {activeTab === 'table' && (
                    <div id="table-container" className="flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fade-in min-h-[600px] bg-white transition-all duration-300 [&.is-fullscreen]:h-screen [&.is-fullscreen]:p-0">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3 bg-white">
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={openReconciliationView} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-emerald-500"><i className="fas fa-random mr-2"></i> Reconcile Quotation vs Live</button>
                                <button onClick={handleAddNode} className="py-2 px-4 bg-white border border-slate-300 hover:border-indigo-400 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors"><i className="fas fa-plus mr-2"></i> Add Resource</button>
                                <button onClick={saveArchitecture} className="py-2 px-6 bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-md transition-transform active:scale-95 ml-4"><i className="fas fa-save mr-2"></i> Save Architecture</button>
                            </div>
                            <button onClick={()=>toggleFullScreen('table-container')} className="py-2 px-4 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-200 transition-colors border border-slate-300"><i className="fas fa-expand mr-2"></i> Full Screen</button>
                        </div>
                        
                        {/* 🚨 THE NEW CLEAR LEGEND */}
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
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
                                        <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50 m-4 rounded-xl">Click "Reconcile" above to begin mapping your Target Architecture.</td></tr>
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
                                                    <select value={n.type} onChange={e => handleUpdateNode(n.id, 'type', e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1.5 outline-none shadow-sm cursor-pointer">
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

                {/* TAB: VISUAL CANVAS */}
                {activeTab === 'canvas' && (
                    <div id="canvas-container" className="flex flex-col bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-inner animate-fade-in min-h-[700px] overflow-hidden transition-all duration-300 [&.is-fullscreen]:h-screen [&.is-fullscreen]:p-0">
                        <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-20">
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

                        <div className="p-6 overflow-auto custom-scrollbar flex-1 relative">
                            {localNodes.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-20">
                                    <i className="fas fa-project-diagram text-6xl mb-4 opacity-50"></i>
                                    <p className="font-black text-lg">Awaiting Topology Data</p>
                                </div>
                            ) : (
                                renderCanvasPane('Target Infrastructure', localNodes, 'indigo', setSelectedNode, regionFilter)
                            )}
                        </div>
                    </div>
                )}
                
                {/* 🚨 HELP / FAQ DRAWER */}
                {showFaq && (
                    <div className="absolute inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-slide-left rounded-r-2xl overflow-hidden">
                        <div className="bg-indigo-600 text-white p-6 border-b border-indigo-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg"><i className="fas fa-book-open mr-2"></i> Methodology Guide</h3>
                                <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-1">Architecture & Migration Flow</p>
                            </div>
                            <button onClick={()=>setShowFaq(false)} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 text-sm text-slate-700 leading-relaxed">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 mb-2">What is MgC Discovery?</h4>
                                <p>This reads the customer's current environment. It is the <strong className="text-blue-600">"As-Is"</strong> technical reality of what is running right now.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 mb-2">What is Reconciliation?</h4>
                                <p>Sales sells a Quotation (SOW) that rarely matches the technical reality perfectly. Reconciliation forces you to compare the SOW against the MgC Discovery to catch <strong>Scope Creep</strong> before you start building.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 mb-2">Why edit the Target Architecture?</h4>
                                <p>The Resource List is the <strong className="text-emerald-600">"To-Be"</strong> deployment blueprint. You should rename old server names (e.g., `WIN-2012-OLD`) and remap IPs here to match your strict cloud conventions. What you save here is what gets built via IaC.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 mb-3">Status Legend</h4>
                                <ul className="space-y-3 text-xs">
                                    <li className="flex items-center gap-3"><div className="w-3 h-3 bg-emerald-500 rounded-full shrink-0"></div> <span><strong>Matched:</strong> Exists in SOW and Live.</span></li>
                                    <li className="flex items-center gap-3"><div className="w-3 h-3 bg-amber-500 rounded-full shrink-0"></div> <span><strong>Scope Creep:</strong> Found running live, but wasn't quoted.</span></li>
                                    <li className="flex items-center gap-3"><div className="w-3 h-3 bg-rose-500 rounded-full shrink-0"></div> <span><strong>Missing:</strong> Quoted, but doesn't exist live.</span></li>
                                    <li className="flex items-center gap-3"><div className="w-3 h-3 bg-blue-500 rounded-full shrink-0"></div> <span><strong>Manual:</strong> Added by the architect.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* NODE PROPERTIES DRAWER */}
                {selectedNode && (
                    <div className="absolute inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-slide-left rounded-r-2xl overflow-hidden">
                        <div className="bg-slate-800 text-white p-6 border-b border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg"><i className="fas fa-sliders-h text-blue-400 mr-2"></i> Node Properties</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">{selectedNode.name}</p>
                            </div>
                            <button onClick={()=>setSelectedNode(null)} className="text-slate-400 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
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
                        <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
                            <button onClick={()=>setSelectedNode(null)} className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest rounded-lg transition-colors">Close</button>
                            <button onClick={saveArchitecture} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-colors">Save</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
