import React, { useState, useEffect, useMemo, useContext } from 'react';
import { EditableCell } from '../../utils/helpers';
import { ERPContext } from '../../context/ERPContext'; // 🚨 NEW CONTEXT IMPORT FOR LIVE API REFRESH

export const HUAWEI_REGIONS = [
    { group: "Latin America", options: [{ id: "na-mexico-1", name: "LA-Mexico City1" }, { id: "la-north-2", name: "LA-Mexico City2" }, { id: "sa-brazil-1", name: "LA-Sao Paulo1" }, { id: "la-south-2", name: "LA-Santiago" }, { id: "sa-argentina-1", name: "LA-Buenos Aires1" }] },
    { group: "Europe, Middle East & Africa", options: [{ id: "eu-west-101", name: "EU-Dublin" }, { id: "tr-west-1", name: "TR-Istanbul" }, { id: "me-east-1", name: "ME-Riyadh" }, { id: "af-south-1", name: "AF-Johannesburg" }, { id: "af-north-1", name: "AF-Cairo" }] },
    { group: "Asia Pacific", options: [{ id: "ap-southeast-1", name: "CN-Hong Kong" }, { id: "ap-southeast-2", name: "AP-Bangkok" }, { id: "ap-southeast-3", name: "AP-Singapore" }, { id: "ap-southeast-4", name: "AP-Jakarta" }, { id: "ap-southeast-5", name: "AP-Manila" }] },
    { group: "Chinese Mainland", options: [{ id: "cn-north-1", name: "CN North-Beijing1" }, { id: "cn-north-4", name: "CN North-Beijing4" }, { id: "cn-north-9", name: "CN North-Ulanqab1" }, { id: "cn-north-12", name: "CN North3" }, { id: "cn-east-3", name: "CN East-Shanghai1" }, { id: "cn-east-2", name: "CN East-Shanghai2" }, { id: "cn-east-5", name: "CN East-Qingdao" }, { id: "cn-east-4", name: "CN East2" }, { id: "cn-south-1", name: "CN South-Guangzhou" }, { id: "cn-southwest-2", name: "CN Southwest-Guiyang1" }] }
];

export default function TopologyMapperView({ activeProject, onUpdateProject, onPromote }) {
    const { customers } = useContext(ERPContext); // 🚨 IMPORT CUSTOMERS FOR REAL-TIME FETCH

    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];
    const networks = activeProject?.blueprintData?.topology?.network || [];
    const storages = activeProject?.blueprintData?.topology?.storage || [];

    const [localNodes, setLocalNodes] = useState(activeProject?.mapperNodes || []); 
    const [activeTab, setActiveTab] = useState('table'); 
    const [regionFilter, setRegionFilter] = useState('All');
    const [selectedNode, setSelectedNode] = useState(null);
    
    // Reconciliation State
    const [quotedNodes, setQuotedNodes] = useState([]);
    const [liveNodes, setLiveNodes] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false); // 🚨 SPINNER STATE
    
    useEffect(()=>{ setLocalNodes(activeProject?.mapperNodes || []); }, [activeProject]);
    
    const saveArchitecture = () => {
        onUpdateProject(activeProject.id, 'mapperNodes', localNodes);
        alert("Architecture Configuration Saved Successfully.");
    };

    const toggleFullScreen = (elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (!document.fullscreenElement) el.requestFullscreen().catch(err => alert(`Error enabling full-screen: ${err.message}`));
        else document.exitFullscreen();
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

    // Helper to extract live nodes from inventory payload
    const extractLiveNodesFromPayload = (raw, fallbackRegion) => {
        let mNodes = [];
        (raw.network || []).forEach((net, i) => mNodes.push({ name: net.name || `${getShortNetType(net.type)}-${i}`, type: getShortNetType(net.type), ip: net.cidr || net.specs?.cidr || net.specs?.ip || net.public_ip_address || 'N/A', location: 'Cloud-Network', region: net.region || net.specs?.region || fallbackRegion }));
        (raw.storage || []).forEach((st, i) => mNodes.push({ name: st.name || `${st.type||'OBS'}-${i}`, type: st.type||'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global', region: st.location || st.region || 'Global' }));
        (raw.servers || raw.compute || []).forEach((srv, i) => mNodes.push({ name: srv.name, type: 'ECS', ip: srv.private_ip_address || srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet', region: srv.region || srv.specs?.region || fallbackRegion }));
        (raw.databases || []).forEach((db, i) => mNodes.push({ name: db.name, type: 'RDS', ip: db.private_ip_address || db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet', region: db.region || db.specs?.region || fallbackRegion }));
        return mNodes;
    };

    // 🚨 1. REAL-TIME API REFRESH FUNCTION
    const refreshLiveDiscovery = async () => {
        setIsRefreshing(true);
        const custName = (activeProject?.customerName || activeProject?.name.split('-')[0] || '').trim().toLowerCase();
        const customer = customers.find(c => c.name.toLowerCase() === custName);

        if (!customer) { alert("No matching Customer Profile found to scan."); setIsRefreshing(false); return; }

        try {
            const token = localStorage.getItem('erp_jwt_token');
            const res = await fetch('/api/cloud/inventory', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customer_id: customer.id, region: customer.region || 'la-south-2' })
            });

            const data = await res.json();
            if (data.success) { 
                // Save it globally to MgC so it persists
                onUpdateProject(activeProject.id, 'mgcData', { source: 'api', raw_inventory: data.inventory }); 
                // Inject instantly into the dual-pane array!
                const freshLiveNodes = extractLiveNodesFromPayload(data.inventory, activeProject?.region || 'la-south-2');
                setLiveNodes(freshLiveNodes);
            } 
            else { alert(`API Discovery Failed: ${data.error}`); }
        } catch (err) { alert(`Error: ${err.message}`); } finally { setIsRefreshing(false); }
    };

    const openReconciliationView = () => {
        if (!activeProject?.mgcData) return alert('Run MgC Discovery first to reconcile against the SOW!');
        const fallbackRegion = activeProject?.region || 'la-south-2';
        
        let qNodes = [];
        servers.forEach(s => qNodes.push({ name: s.name, type: 'ECS', loc: 'Compute-Subnet', reg: s.metadata?.region || fallbackRegion, ip: 'TBD' }));
        databases.forEach(d => qNodes.push({ name: d.name, type: 'RDS', loc: 'Data-Subnet', reg: d.metadata?.region || fallbackRegion, ip: 'TBD' }));
        networks.forEach(n => qNodes.push({ name: n.name, type: getShortNetType(n.type), loc: 'Cloud-Network', reg: n.metadata?.region || fallbackRegion, ip: 'TBD' }));
        storages.forEach(s => qNodes.push({ name: s.name, type: s.type || 'OBS', loc: 'Global', reg: s.metadata?.region || fallbackRegion, ip: 'TBD' }));
        setQuotedNodes(qNodes);

        const raw = activeProject.mgcData.raw_inventory || {};
        setLiveNodes(extractLiveNodesFromPayload(raw, fallbackRegion));
        
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
                merged.push({ id: `mgc-${Date.now()}-${index}`, ...mNode, name: tempQuoted[matchIdx].name, status: 'Matched' }); 
                tempQuoted.splice(matchIdx, 1); 
            } else { 
                merged.push({ id: `mgc-${Date.now()}-${index}`, ...mNode, status: 'Live Only' }); 
            }
        });

        tempQuoted.forEach((q, i) => merged.push({ id: `quo-${Date.now()}-${i}`, name: q.name, type: q.type, ip: q.ip, location: q.loc, region: q.reg, status: 'Quoted Only', config: {} }));
        
        setLocalNodes(merged);
        setActiveTab('table');
        alert("Reconciliation Complete. Review the final table and click Save Architecture.");
    };

    const handleUpdateNode = (id, field, value) => setLocalNodes(localNodes.map(n => n.id === id ? { ...n, [field]: value } : n));
    const handleAddNode = () => setLocalNodes([...localNodes, { id: `manual-${Date.now()}`, name: 'New Resource', type: 'ECS', ip: '0.0.0.0/32', location: 'New-Subnet', region: activeProject?.region || 'la-south-2', status: 'Manual', config: {} }]);
    const handleDeleteNode = (id) => setLocalNodes(localNodes.filter(n => n.id !== id));

    const generateFromBlueprint = () => {
        if (servers.length === 0 && databases.length === 0 && networks.length === 0) return alert('No blueprint data found in this project.');
        if (localNodes.length > 0 && !window.confirm("Overwrite your current architecture table?")) return;
        
        const fallbackRegion = activeProject?.region || 'la-south-2';
        const newNodes = [];
        servers.forEach((s, i) => newNodes.push({ id: `srv-${Date.now()}-${i}`, name: s.name, type: 'ECS', ip: `10.0.1.${10+i}`, location: 'Compute-Subnet', region: s.metadata?.region || fallbackRegion, status: 'Quoted Only', config: { os: s.metadata?.os_type || 'Unknown' } }));
        databases.forEach((d, i) => newNodes.push({ id: `db-${Date.now()}-${i}`, name: d.name, type: 'RDS', ip: `10.0.2.${10+i}`, location: 'Data-Subnet', region: d.metadata?.region || fallbackRegion, status: 'Quoted Only', config: {} }));
        networks.forEach((n, i) => newNodes.push({ id: `net-${Date.now()}-${i}`, name: n.name, type: getShortNetType(n.type), ip: 'N/A', location: 'Cloud-Network', region: n.metadata?.region || fallbackRegion, status: 'Quoted Only', config: {} }));
        storages.forEach((st, i) => newNodes.push({ id: `st-${Date.now()}-${i}`, name: st.name, type: st.type || 'OBS', ip: 'N/A', location: 'Global', region: st.metadata?.region || fallbackRegion, status: 'Quoted Only', config: {} }));
        setLocalNodes(newNodes);
    };

    const generateFromMgC = () => {
        if (!activeProject?.mgcData) return alert('You must run the Live MgC Discovery or import MgC Excel data first!');
        if (localNodes.length > 0 && !window.confirm("This will overwrite your current architecture table. Proceed?")) return;
        
        const raw = activeProject.mgcData.raw_inventory || {};
        setLocalNodes(extractLiveNodesFromPayload(raw, activeProject?.region || 'la-south-2').map(n => ({...n, status: 'Live Only', config: {}})));
    };

    const groups = useMemo(() => {
        const grps = { EdgeGateways: [], EIPs: [], Subnets: {}, Global: [], Pending: [] };
        localNodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = String(n.location || "");
            
            if (loc === 'Pending-Allocation') grps.Pending.push(n);
            else if (['EIP'].includes(type)) grps.EIPs.push(n);
            else if (['NAT', 'VPN', 'CGW', 'VPN-CONN', 'ELB'].includes(type)) grps.EdgeGateways.push(n);
            else if (['OBS', 'CBR', 'STORAGE'].includes(type) || loc === 'Global') grps.Global.push(n);
            else if (type !== 'VPC') {
                if (!grps.Subnets[loc]) grps.Subnets[loc] = [];
                grps.Subnets[loc].push(n);
            }
        });
        return grps;
    }, [localNodes, regionFilter]);

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
        if(status === 'Matched') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Matched in Quotation and Live"></div>;
        if(status === 'Live Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse" title="Scope Creep"></div>;
        if(status === 'Quoted Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" title="Missing"></div>;
        if(status === 'Manual') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm" title="Manually added"></div>;
        return null;
    };

    const uniqueRegions = ['All', ...new Set(localNodes.map(n => n.region).filter(r => r && r !== 'TBD' && r !== 'Global'))];

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12 relative">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 relative overflow-hidden">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-200 pb-4 gap-4">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-sitemap text-indigo-500"></i> Infrastructure Scope Manager</h3>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Reconcile and Manage the Approved Delivery Scope</p>
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto">
                        <button onClick={()=>setActiveTab('table')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-table mr-2"></i> Resource List</button>
                        <button onClick={()=>setActiveTab('canvas')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'canvas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-project-diagram mr-2"></i> Architecture</button>
                    </div>
                </div>

                {/* TAB: DUAL-PANE RECONCILIATION */}
                {activeTab === 'reconcile' && (
                    <div className="animate-fade-in flex flex-col min-h-[600px]">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6 flex justify-between items-center">
                            <div>
                                <h4 className="font-black text-blue-900"><i className="fas fa-random mr-2"></i> Dual-Pane Reconciliation Mode</h4>
                                <p className="text-xs text-blue-700 mt-1">Review the SOW Quoted Scope alongside the Live Discovery. Click Merge when ready.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={()=>setActiveTab('table')} className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">Cancel</button>
                                <button onClick={finalizeReconciliation} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-md transition-colors">Merge & Finalize</button>
                            </div>
                        </div>

                        <div className="flex flex-col xl:flex-row gap-6 flex-1">
                            {/* LEFT: SOW */}
                            <div className="xl:w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col shadow-inner">
                                <h4 className="font-black text-slate-700 uppercase tracking-widest text-[11px] mb-4 text-center pb-2 border-b border-slate-200">1. Quoted Scope (SOW)</h4>
                                <div className="overflow-y-auto max-h-[500px] custom-scrollbar space-y-2">
                                    {quotedNodes.length === 0 && <div className="text-center text-slate-400 text-xs py-8">No SOW data imported.</div>}
                                    {quotedNodes.map((n, i) => (
                                        <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <i className={`fas ${getIcon(n.type)} text-lg opacity-80`}></i>
                                                <div><div className="font-bold text-xs text-slate-800">{n.name}</div><div className="text-[10px] text-slate-500 uppercase">{n.type}</div></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* RIGHT: LIVE DISCOVERY + REFRESH BUTTON */}
                            <div className="xl:w-1/2 bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 flex flex-col shadow-inner relative">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-indigo-200">
                                    <div className="w-20"></div> {/* Spacer for center alignment */}
                                    <h4 className="font-black text-indigo-800 uppercase tracking-widest text-[11px] text-center">2. Discovered Scope (MgC/Live)</h4>
                                    
                                    {/* 🚨 THE REAL-TIME API REFRESH BUTTON */}
                                    <button 
                                        onClick={refreshLiveDiscovery} 
                                        disabled={isRefreshing}
                                        className="w-20 py-1.5 bg-white text-indigo-700 border border-indigo-300 rounded text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {isRefreshing ? <><i className="fas fa-spinner fa-spin"></i> Wait</> : <><i className="fas fa-sync-alt mr-1"></i> Scan</>}
                                    </button>
                                </div>
                                <div className="overflow-y-auto max-h-[500px] custom-scrollbar space-y-2">
                                    {liveNodes.length === 0 && <div className="text-center text-slate-400 text-xs py-8">No Live Discovery data found. Click Scan.</div>}
                                    {liveNodes.map((n, i) => (
                                        <div key={i} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <i className={`fas ${getIcon(n.type)} text-lg opacity-80`}></i>
                                                <div><div className="font-bold text-xs text-indigo-900">{n.name}</div><div className="text-[10px] text-indigo-500 uppercase">{n.type} | {n.ip}</div></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: RESOURCE LIST */}
                {activeTab === 'table' && (
                    <div id="table-container" className="flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fade-in min-h-[600px] bg-white">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3 bg-white">
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={openReconciliationView} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-emerald-500"><i className="fas fa-random mr-2"></i> Reconcile Quotation vs Live</button>
                                <button onClick={handleAddNode} className="py-2 px-4 bg-white border border-slate-300 hover:border-indigo-400 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors"><i className="fas fa-plus mr-2"></i> Add Resource</button>
                                <button onClick={saveArchitecture} className="py-2 px-6 bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-md transition-transform active:scale-95 ml-4"><i className="fas fa-save mr-2"></i> Save Architecture</button>
                            </div>
                            <button onClick={()=>toggleFullScreen('table-container')} className="py-2 px-4 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-200 transition-colors border border-slate-300"><i className="fas fa-expand mr-2"></i> Full Screen</button>
                        </div>
                        
                        <div className="flex-1 overflow-auto custom-scrollbar max-h-[700px] bg-white relative">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 w-48 font-black">Resource Name</th>
                                        <th className="p-4 w-32 font-black">Region</th>
                                        <th className="p-4 w-28 font-black">Type</th>
                                        <th className="p-4 w-32 font-black">IP / CIDR</th>
                                        <th className="p-4 w-40 font-black">Subnet / Zone</th>
                                        <th className="p-4 w-24 text-center font-black">Act</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {localNodes.length === 0 ? (
                                        <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50 m-4 rounded-xl">Click "Reconcile" above to begin mapping.</td></tr>
                                    ) : (
                                        localNodes.map(n => (
                                            <tr key={n.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-4 font-bold text-slate-800 relative">
                                                    {getStatusIcon(n.status)}
                                                    <div className="ml-4"><EditableCell value={n.name} onSave={v=>handleUpdateNode(n.id, 'name', v)} /></div>
                                                </td>
                                                <td className="p-4 font-bold text-slate-600 uppercase text-[10px] tracking-widest">
                                                    <EditableCell value={n.region} onSave={v=>handleUpdateNode(n.id, 'region', v)} />
                                                </td>
                                                <td className="p-4 font-bold text-indigo-700">
                                                    <select value={n.type} onChange={e => handleUpdateNode(n.id, '
