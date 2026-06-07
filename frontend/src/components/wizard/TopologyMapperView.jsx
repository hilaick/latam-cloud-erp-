import React, { useState, useEffect, useMemo, useContext } from 'react';
import { EditableCell } from '../../utils/helpers';
import { ERPContext } from '../../context/ERPContext'; 
import ArchitectureCanvas from './ArchitectureCanvas'; 

export const HUAWEI_REGIONS = [
    { group: "Latin America", options: [{ id: "na-mexico-1", name: "LA-Mexico City1" }, { id: "la-north-2", name: "LA-Mexico City2" }, { id: "sa-brazil-1", name: "LA-Sao Paulo1" }, { id: "la-south-2", name: "LA-Santiago" }, { id: "sa-argentina-1", name: "LA-Buenos Aires1" }] }
];

export default function TopologyMapperView({ activeProject, onUpdateProject }) {
    const { customers } = useContext(ERPContext); 

    const [localNodes, setLocalNodes] = useState(activeProject?.mapperNodes || []); 
    
    const [activeTab, setActiveTab] = useState('reconcile'); 
    const [reconcileView, setReconcileView] = useState('table'); 
    const [targetView, setTargetView] = useState('list'); 
    
    const [regionFilter, setRegionFilter] = useState('All');
    const [selectedNode, setSelectedNode] = useState(null);
    
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    
    useEffect(()=>{ setLocalNodes(activeProject?.mapperNodes || []); }, [activeProject]);
    
    const filteredAndSortedNodes = useMemo(() => {
        let result = localNodes.filter(n => {
            if (statusFilter !== 'All' && n.status !== statusFilter) return false;
            if (typeFilter !== 'All' && n.type !== typeFilter) return false;
            return true;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [localNodes, statusFilter, typeFilter, sortConfig]);

    // 🚨 SCOPE FILTER FIX: Save Architecture strictly saves the FILTERED list. 
    const saveArchitecture = () => {
        onUpdateProject(activeProject.id, 'mapperNodes', filteredAndSortedNodes);
        setLocalNodes(filteredAndSortedNodes);
        alert(`Target Architecture Saved!\n\n${filteredAndSortedNodes.length} filtered nodes have been locked as the official execution baseline.\n\nPlease proceed to the '4. DTRB Governance' tab.`);
    };

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
        (activeProject?.blueprintData?.topology?.compute || []).forEach((s, i) => qNodes.push({ id: `q-srv-${i}`, name: s.name, type: 'ECS', location: 'Compute-Subnet', region: fallbackRegion, ip: 'TBD', status: 'Quoted Only' }));
        (activeProject?.blueprintData?.topology?.database || []).forEach((d, i) => qNodes.push({ id: `q-db-${i}`, name: d.name, type: 'RDS', location: 'Data-Subnet', region: fallbackRegion, ip: 'TBD', status: 'Quoted Only' }));
        (activeProject?.blueprintData?.topology?.network || []).forEach((n, i) => qNodes.push({ id: `q-net-${i}`, name: n.name, type: getShortNetType(n.type), location: 'Cloud-Network', region: fallbackRegion, ip: 'TBD', status: 'Quoted Only' }));
        (activeProject?.blueprintData?.topology?.storage || []).forEach((s, i) => qNodes.push({ id: `q-st-${i}`, name: s.name, type: s.type || 'OBS', location: 'Global', region: fallbackRegion, ip: 'TBD', status: 'Quoted Only' }));
        return qNodes;
    }, [activeProject?.blueprintData, activeProject?.region]);

    const liveNodes = useMemo(() => {
        const raw = activeProject?.mgcData?.raw_inventory || {};
        const fallbackRegion = activeProject?.region || 'la-south-2';
        const mNodes = [];
        (raw.network || []).forEach((net, i) => mNodes.push({ id: `l-net-${i}`, name: net.name || `${getShortNetType(net.type)}-${i}`, type: getShortNetType(net.type), ip: net.cidr || net.specs?.cidr || net.specs?.ip || net.public_ip_address || 'N/A', location: 'Cloud-Network', region: fallbackRegion, status: 'Live Only' }));
        (raw.storage || []).forEach((st, i) => mNodes.push({ id: `l-st-${i}`, name: st.name || `${st.type||'OBS'}-${i}`, type: st.type||'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global', region: fallbackRegion, status: 'Live Only' }));
        (raw.servers || raw.compute || []).forEach((srv, i) => mNodes.push({ id: `l-srv-${i}`, name: srv.name, type: 'ECS', ip: srv.private_ip_address || srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet', region: fallbackRegion, status: 'Live Only' }));
        (raw.databases || []).forEach((db, i) => mNodes.push({ id: `l-db-${i}`, name: db.name, type: 'RDS', ip: db.private_ip_address || db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet', region: fallbackRegion, status: 'Live Only' }));
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
        
        setActiveTab('target');
        setTargetView('list');
    };

    const handleUpdateNode = (id, field, value) => setLocalNodes(localNodes.map(n => n.id === id ? { ...n, [field]: value } : n));
    const handleAddNode = () => setLocalNodes([...localNodes, { id: `manual-${Date.now()}`, name: 'New Resource', type: 'ECS', ip: '10.0.0.100', location: 'New-Subnet', region: activeProject?.region || 'la-south-2', status: 'Manual', config: {} }]);
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
        if(status === 'Matched') return <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)] shrink-0"></div>;
        if(status === 'Live Only') return <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_5px_rgba(245,158,11,0.5)] animate-pulse shrink-0"></div>;
        if(status === 'Quoted Only') return <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_5px_rgba(244,63,94,0.5)] shrink-0"></div>;
        if(status === 'Manual') return <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)] shrink-0"></div>;
        return <div className="w-2.5 h-2.5 bg-slate-300 rounded-full shadow-sm shrink-0"></div>;
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const uniqueTypes = ['All', ...new Set(localNodes.map(n => n.type))];

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12 relative">
            <style>{`
                .fixed-fullscreen-mode {
                    position: fixed !important; top: 0 !important; left: 0 !important;
                    width: 100vw !important; height: 100vh !important;
                    max-height: none !important; z-index: 9999 !important;
                    background: #f8fafc !important; border-radius: 0 !important;
                    padding: 0 !important; overflow: hidden !important;
                    display: flex !important; flex-direction: column !important;
                }
            `}</style>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 relative overflow-hidden flex flex-col h-full">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-200 pb-4 gap-4 shrink-0">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-sitemap text-indigo-500"></i> Architecture & Scope Manager</h3>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Reconcile Source Reality with Target Design.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto">
                        <button onClick={()=>setActiveTab('reconcile')} className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'reconcile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-random mr-2"></i> 1. Reconcile Scope</button>
                        <button onClick={()=>setActiveTab('target')} className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'target' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-bullseye mr-2"></i> 2. Target Architecture</button>
                    </div>
                </div>

                {activeTab === 'reconcile' && (
                    <div id="reconcile-container" className="animate-fade-in flex flex-col flex-1 min-h-[600px] bg-white resize-y overflow-auto pb-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                            <div>
                                <h4 className="font-black text-slate-800">Dual-Pane Reconciliation</h4>
                                <p className="text-xs text-slate-500 mt-1">Review the SOW Quoted Scope alongside the Live Discovery.</p>
                            </div>
                            <div className="flex gap-4 items-center w-full md:w-auto flex-wrap">
                                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
                                    <button onClick={()=>setReconcileView('table')} className={`px-4 py-1.5 text-[10px] uppercase font-black tracking-widest rounded transition-colors ${reconcileView === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-list mr-1"></i> List</button>
                                    <button onClick={()=>setReconcileView('canvas')} className={`px-4 py-1.5 text-[10px] uppercase font-black tracking-widest rounded transition-colors ${reconcileView === 'canvas' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}><i className="fas fa-project-diagram mr-1"></i> Diagram</button>
                                </div>
                                <button onClick={finalizeReconciliation} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-md transition-colors shrink-0">Merge & Review Target <i className="fas fa-arrow-right ml-2"></i></button>
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
                            <div className="flex flex-col xl:flex-row gap-6 flex-1 overflow-hidden animate-fade-in">
                                <div id="quoted-canvas-pane" className="xl:w-1/2 bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden flex flex-col relative transition-all duration-300">
                                    <button onClick={()=>toggleFullScreen('quoted-canvas-pane')} className="absolute top-4 right-4 z-50 bg-white/90 border border-slate-300 p-2 rounded shadow-sm text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="Full Screen Pane">
                                        <i className="fas fa-expand"></i>
                                    </button>
                                    {quotedNodes.length === 0 ? <div className="text-center text-slate-400 text-xs py-20 bg-slate-50 flex-1">No SOW data imported.</div> : <ArchitectureCanvas title="Quoted Architecture (SOW)" nodes={quotedNodes} regionFilter={regionFilter} />}
                                </div>
                                
                                <div id="live-canvas-pane" className="xl:w-1/2 bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden flex flex-col relative transition-all duration-300">
                                    <button onClick={()=>toggleFullScreen('live-canvas-pane')} className="absolute top-4 right-4 z-50 bg-white/90 border border-slate-300 p-2 rounded shadow-sm text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="Full Screen Pane">
                                        <i className="fas fa-expand"></i>
                                    </button>
                                    {liveNodes.length === 0 ? <div className="text-center text-slate-400 text-xs py-20 bg-slate-50 flex-1">No Live Discovery data found.</div> : <ArchitectureCanvas title="Discovered Architecture (Live)" nodes={liveNodes} regionFilter={regionFilter} />}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'target' && (
                    <div id="target-container" className="flex flex-col flex-1 bg-white resize-y overflow-auto min-h-[600px] animate-fade-in">
                        
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3 bg-white shrink-0 rounded-t-2xl">
                            <div className="flex gap-4 flex-wrap items-center">
                                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
                                    <button onClick={()=>setTargetView('list')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${targetView === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-list mr-1"></i> View List</button>
                                    <button onClick={()=>setTargetView('canvas')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${targetView === 'canvas' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-project-diagram mr-1"></i> View Diagram</button>
                                </div>
                                
                                {targetView === 'list' && (
                                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="p-1.5 border border-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-indigo-400 bg-white">
                                        {uniqueTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'Filter by Resource Type' : t}</option>)}
                                    </select>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button onClick={()=>toggleFullScreen('target-container')} className="py-2 px-4 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-50 transition-colors border border-slate-300"><i className="fas fa-expand mr-1"></i> Full Screen</button>
                                {targetView === 'list' && <button onClick={handleAddNode} className="py-2 px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors"><i className="fas fa-plus mr-1"></i> Add Node</button>}
                                <button onClick={saveArchitecture} className="py-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-md transition-transform active:scale-95"><i className="fas fa-shield-alt mr-2"></i> Save & Proceed to Governance</button>
                            </div>
                        </div>

                        {targetView === 'list' && (
                            <div className="flex flex-col flex-1 bg-slate-50 overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-600 shrink-0 flex-wrap select-none shadow-sm z-10 relative">
                                    <div className="mr-2 text-slate-400 flex items-center"><i className="fas fa-filter mr-2"></i> Status Filter:</div>
                                    <div onClick={() => setStatusFilter(statusFilter === 'Matched' ? 'All' : 'Matched')} className={`flex items-center gap-2 cursor-pointer transition-all px-2 py-1 rounded border ${statusFilter === 'Matched' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-inner' : 'border-transparent hover:bg-slate-200'}`} title="Resource exists in BOTH the signed Quotation (SOW) and the live Discovery data.">
                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div> Matched
                                    </div>
                                    <div onClick={() => setStatusFilter(statusFilter === 'Live Only' ? 'All' : 'Live Only')} className={`flex items-center gap-2 cursor-pointer transition-all px-2 py-1 rounded border ${statusFilter === 'Live Only' ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-inner' : 'border-transparent hover:bg-slate-200'}`} title="Resource was discovered in the live environment but is NOT in the signed Quotation (SOW). May require a Change Request (CR).">
                                        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_5px_rgba(245,158,11,0.5)]"></div> Scope Creep
                                    </div>
                                    <div onClick={() => setStatusFilter(statusFilter === 'Quoted Only' ? 'All' : 'Quoted Only')} className={`flex items-center gap-2 cursor-pointer transition-all px-2 py-1 rounded border ${statusFilter === 'Quoted Only' ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-inner' : 'border-transparent hover:bg-slate-200'}`} title="Resource is in the signed Quotation (SOW) but could not be found in the live environment.">
                                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_5px_rgba(244,63,94,0.5)]"></div> Missing SOW
                                    </div>
                                    <div onClick={() => setStatusFilter(statusFilter === 'Manual' ? 'All' : 'Manual')} className={`flex items-center gap-2 cursor-pointer transition-all px-2 py-1 rounded border ${statusFilter === 'Manual' ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-inner' : 'border-transparent hover:bg-slate-200'}`} title="Manually added to the Target Architecture by an engineer.">
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div> Manual Addition
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto custom-scrollbar bg-white relative">
                                    <table className="w-full text-left min-w-[1000px]">
                                        <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                            <tr>
                                                <th className="p-4 w-72 font-black cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('name')}>Target Resource Name {sortConfig.key==='name' && <i className={`fas fa-sort-${sortConfig.direction==='asc'?'up':'down'} ml-1 text-indigo-500`}></i>}</th>
                                                <th className="p-4 w-32 font-black cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('region')}>Target Region {sortConfig.key==='region' && <i className={`fas fa-sort-${sortConfig.direction==='asc'?'up':'down'} ml-1 text-indigo-500`}></i>}</th>
                                                <th className="p-4 w-28 font-black cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('type')}>Resource Type {sortConfig.key==='type' && <i className={`fas fa-sort-${sortConfig.direction==='asc'?'up':'down'} ml-1 text-indigo-500`}></i>}</th>
                                                <th className="p-4 w-32 font-black cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('ip')}>Target IP / CIDR {sortConfig.key==='ip' && <i className={`fas fa-sort-${sortConfig.direction==='asc'?'up':'down'} ml-1 text-indigo-500`}></i>}</th>
                                                <th className="p-4 w-40 font-black cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('location')}>Target Subnet / Zone {sortConfig.key==='location' && <i className={`fas fa-sort-${sortConfig.direction==='asc'?'up':'down'} ml-1 text-indigo-500`}></i>}</th>
                                                <th className="p-4 w-24 text-center font-black">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {filteredAndSortedNodes.length === 0 ? (
                                                <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50 m-4 rounded-xl">No resources match the current filter or data is empty. Click Merge in the Reconcile tab.</td></tr>
                                            ) : (
                                                filteredAndSortedNodes.map(n => {
                                                    const inSow = n.status === 'Matched' || n.status === 'Quoted Only';
                                                    return (
                                                        <tr key={n.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                            <td className="p-4 font-bold text-slate-800">
                                                                <div className="flex items-center gap-3">
                                                                    {getStatusIcon(n.status)}
                                                                    <div className="flex flex-col flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <EditableCell value={n.name} onSave={v=>handleUpdateNode(n.id, 'name', v)} />
                                                                            {inSow && <span className="bg-blue-100 text-blue-700 text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase border border-blue-200" title="This resource was paid for in the original Statement of Work">SOW</span>}
                                                                        </div>
                                                                    </div>
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
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {targetView === 'canvas' && (
                            <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col border-t border-slate-200">
                                {localNodes.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <i className="fas fa-project-diagram text-6xl mb-4 opacity-50"></i>
                                        <p className="font-black text-lg">Awaiting Target Architecture Data</p>
                                    </div>
                                ) : (
                                    <ArchitectureCanvas title="Final Target Architecture" nodes={filteredAndSortedNodes} onNodeClick={setSelectedNode} regionFilter={regionFilter} />
                                )}
                            </div>
                        )}
                    </div>
                )}

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
