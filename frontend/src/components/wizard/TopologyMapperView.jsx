import React, { useState, useEffect, useMemo } from 'react';
import { EditableCell } from '../../utils/helpers';

export default function TopologyMapperView({ activeProject, onUpdateProject, onPromote }) {
    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];
    const networks = activeProject?.blueprintData?.topology?.network || [];
    const storages = activeProject?.blueprintData?.topology?.storage || [];

    const [nodes, setNodes] = useState(activeProject?.mapperNodes || []); 
    const [activeTab, setActiveTab] = useState('table'); 
    const [regionFilter, setRegionFilter] = useState('All');
    
    useEffect(()=>{ setNodes(activeProject?.mapperNodes || []); }, [activeProject]);
    const saveNodes = (newNodes) => { setNodes(newNodes); onUpdateProject(activeProject.id, 'mapperNodes', newNodes); };

    const toggleFullScreen = (elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (!document.fullscreenElement) el.requestFullscreen().catch(err => alert(`Error enabling full-screen: ${err.message}`));
        else document.exitFullscreen();
    };

    // 🚨 1. Quotation Map (Pulls exact region from file or Project fallback)
    const generateFromBlueprint = () => {
        if (servers.length === 0 && databases.length === 0 && networks.length === 0) return alert('No blueprint data found in this project.');
        if (nodes.length > 0 && !window.confirm("Overwrite your current architecture table?")) return;
        
        const fallbackRegion = activeProject?.region || 'la-south-2';
        const newNodes = [];
        servers.forEach((s, i) => newNodes.push({ id: `srv-${Date.now()}-${i}`, name: s.name, type: 'ECS', ip: `10.0.1.${10+i}`, location: 'Compute-Subnet', region: s.metadata?.region || fallbackRegion, status: 'Quoted Only' }));
        databases.forEach((d, i) => newNodes.push({ id: `db-${Date.now()}-${i}`, name: d.name, type: 'RDS', ip: `10.0.2.${10+i}`, location: 'Data-Subnet', region: d.metadata?.region || fallbackRegion, status: 'Quoted Only' }));
        networks.forEach((n, i) => newNodes.push({ id: `net-${Date.now()}-${i}`, name: n.name, type: n.type || 'VPC', ip: 'N/A', location: 'Cloud-Network', region: n.metadata?.region || fallbackRegion, status: 'Quoted Only' }));
        storages.forEach((st, i) => newNodes.push({ id: `st-${Date.now()}-${i}`, name: st.name, type: st.type || 'OBS', ip: 'N/A', location: 'Global', region: st.metadata?.region || fallbackRegion, status: 'Quoted Only' }));
        saveNodes(newNodes);
    };

    // 🚨 2. Load Live Map
    const generateFromMgC = () => {
        if (!activeProject?.mgcData) return alert('You must run the Live MgC Discovery or import MgC Excel data first!');
        if (nodes.length > 0 && !window.confirm("This will overwrite your current architecture table. Proceed?")) return;
        
        const newNodes = [];
        const raw = activeProject.mgcData.raw_inventory || {};
        
        const parseNet = (netList) => netList.forEach((net, i) => {
            let shortType = (net.type||'VPC').includes('Security') ? 'SG' : (net.type||'VPC').includes('NAT') ? 'NAT' : (net.type||'VPC').includes('VPN') ? 'VPN' : (net.type||'VPC').includes('Subnet') ? 'Subnet' : 'VPC';
            newNodes.push({ id: `net-${Date.now()}-${i}`, name: net.name || `${shortType}-${i}`, type: shortType, ip: net.cidr || net.specs?.cidr || net.specs?.ip || 'N/A', location: 'Cloud-Network', region: net.region || net.specs?.region || activeProject?.region || 'Unknown', status: 'Live Only' });
        });
        const parseStorage = (stList) => stList.forEach((st, i) => newNodes.push({ id: `st-${Date.now()}-${i}`, name: st.name || `${st.type||'OBS'}-${i}`, type: st.type||'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global', region: st.location || st.region || 'Global', status: 'Live Only' }));

        const extractCompute = (list) => list.forEach((srv, i) => newNodes.push({ id: `srv-${Date.now()}-${i}`, name: srv.name, type: 'ECS', ip: srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet', region: srv.region || srv.specs?.region || activeProject?.region || 'Unknown', status: 'Live Only' }));
        const extractDb = (list) => list.forEach((db, i) => newNodes.push({ id: `db-${Date.now()}-${i}`, name: db.name, type: 'RDS', ip: db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet', region: db.region || db.specs?.region || activeProject?.region || 'Unknown', status: 'Live Only' }));

        extractCompute(raw.servers || raw.compute || []);
        extractDb(raw.databases || []);
        parseNet(raw.network || []);
        parseStorage(raw.storage || []);
        saveNodes(newNodes);
    };

    // 🚨 3. RECONCILE
    const generateReconciledScope = () => {
        if (!activeProject?.mgcData) return alert('Run MgC Discovery first to reconcile against SOW!');
        if (nodes.length > 0 && !window.confirm("Merge Quoted and Live scopes, replacing your current table?")) return;

        const raw = activeProject.mgcData.raw_inventory || {};
        let mgcNodes = [];
        
        const parseNetForMerge = (netList) => netList.forEach((net, i) => {
            let shortType = (net.type||'VPC').includes('Security') ? 'SG' : (net.type||'VPC').includes('NAT') ? 'NAT' : (net.type||'VPC').includes('VPN') ? 'VPN' : (net.type||'VPC').includes('Subnet') ? 'Subnet' : 'VPC';
            mgcNodes.push({ id: `mgc-net-${i}`, name: net.name || `${shortType}-${i}`, type: shortType, ip: net.cidr || net.specs?.cidr || net.specs?.ip || 'N/A', location: 'Cloud-Network', region: net.region || net.specs?.region || activeProject?.region || 'Unknown' });
        });
        const parseStorageForMerge = (stList) => stList.forEach((st, i) => mgcNodes.push({ id: `mgc-st-${i}`, name: st.name || `${st.type||'OBS'}-${i}`, type: st.type||'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global', region: st.location || st.region || 'Global' }));

        const extractCompute = (list) => list.forEach((srv, i) => mgcNodes.push({ id: `mgc-srv-${i}`, name: srv.name, type: 'ECS', ip: srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet', region: srv.region || srv.specs?.region || activeProject?.region || 'Unknown' }));
        const extractDb = (list) => list.forEach((db, i) => mgcNodes.push({ id: `mgc-db-${i}`, name: db.name, type: 'RDS', ip: db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet', region: db.region || db.specs?.region || activeProject?.region || 'Unknown' }));

        extractCompute(raw.servers || raw.compute || []);
        extractDb(raw.databases || []);
        parseNetForMerge(raw.network || []);
        parseStorageForMerge(raw.storage || []);

        const fallbackRegion = activeProject?.region || 'la-south-2';
        let quotedNodes = [];
        servers.forEach((s) => quotedNodes.push({ name: s.name, type: 'ECS', loc: 'Compute-Subnet', reg: s.metadata?.region || fallbackRegion }));
        databases.forEach((d) => quotedNodes.push({ name: d.name, type: 'RDS', loc: 'Data-Subnet', reg: d.metadata?.region || fallbackRegion }));
        networks.forEach((n) => quotedNodes.push({ name: n.name, type: n.type || 'VPC', loc: 'Cloud-Network', reg: n.metadata?.region || fallbackRegion }));
        storages.forEach((s) => quotedNodes.push({ name: s.name, type: s.type || 'OBS', loc: 'Global', reg: s.metadata?.region || fallbackRegion }));

        const merged = [];
        mgcNodes.forEach(mNode => {
            const matchIdx = quotedNodes.findIndex(q => (q.name || '').toLowerCase().includes((mNode.name || '').toLowerCase()));
            if (matchIdx !== -1) { merged.push({ ...mNode, status: 'Matched' }); quotedNodes.splice(matchIdx, 1); } 
            else { merged.push({ ...mNode, status: 'Live Only' }); }
        });

        quotedNodes.forEach((q, i) => merged.push({ id: `quo-only-${Date.now()}-${i}`, name: q.name, type: q.type, ip: 'TBD', location: q.loc, region: q.reg, status: 'Quoted Only' }));
        saveNodes(merged);
    };

    const handleUpdateNode = (id, field, value) => saveNodes(nodes.map(n => n.id === id ? { ...n, [field]: value } : n));
    const handleAddNode = () => saveNodes([...nodes, { id: `manual-${Date.now()}`, name: 'New Resource', type: 'ECS', ip: '0.0.0.0/32', location: 'New-Subnet', region: activeProject?.region || 'la-south-2', status: 'Manual' }]);
    const handleDeleteNode = (id) => saveNodes(nodes.filter(n => n.id !== id));

    const groups = useMemo(() => {
        const grps = { EdgeGateways: [], Subnets: {}, Global: [], Pending: [] };
        nodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = String(n.location || "");
            if (loc === 'Pending-Allocation') grps.Pending.push(n);
            else if (['NAT', 'EIP', 'VPN', 'ELB'].includes(type)) grps.EdgeGateways.push(n);
            else if (['OBS', 'CBR', 'STORAGE'].includes(type) || loc === 'Global') grps.Global.push(n);
            else if (type !== 'VPC') {
                if (!grps.Subnets[loc]) grps.Subnets[loc] = [];
                grps.Subnets[loc].push(n);
            }
        });
        return grps;
    }, [nodes, regionFilter]);

    const getIcon = (type) => {
        const t = String(type || "").toLowerCase();
        if (t.includes('ecs') || t.includes('vm')) return 'fa-server text-blue-600'; 
        if (t.includes('rds') || t.includes('db')) return 'fa-database text-rose-600';
        if (t.includes('subnet')) return 'fa-network-wired text-indigo-400';
        if (t.includes('sg') || t.includes('security')) return 'fa-shield-alt text-amber-500';
        if (t.includes('nat') || t.includes('eip') || t.includes('vpn')) return 'fa-route text-indigo-600';
        if (t.includes('elb') || t.includes('loadbalancer')) return 'fa-sitemap text-blue-500';
        if (t.includes('obs') || t.includes('storage') || t.includes('cbr') || t.includes('backup')) return 'fa-hdd text-emerald-600';
        if (t.includes('cce') || t.includes('k8s')) return 'fa-cubes text-blue-500';
        return 'fa-microchip text-slate-500';
    };

    const getStatusIcon = (status) => {
        if(status === 'Matched') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Matched in Quotation and Live"></div>;
        if(status === 'Live Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse" title="Scope Creep: Found Live but not in Quotation"></div>;
        if(status === 'Quoted Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" title="Missing: Quoted but not found Live"></div>;
        if(status === 'Manual') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm" title="Manually added"></div>;
        return null;
    };

    const uniqueRegions = ['All', ...new Set(nodes.map(n => n.region).filter(r => r && r !== 'TBD' && r !== 'Global'))];

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8">
                
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

                {activeTab === 'table' && (
                    <div id="table-container" className="flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fade-in min-h-[600px] bg-white">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3 bg-white">
                            <div className="flex gap-2 flex-wrap">
                                {/* 🚨 RENAMED BUTTONS */}
                                <button onClick={generateReconciledScope} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-emerald-500"><i className="fas fa-random mr-2"></i> Reconcile Quotation vs Live</button>
                                <button onClick={generateFromMgC} className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-slate-300"><i className="fas fa-search mr-2"></i> Load Live Discovery</button>
                                <button onClick={generateFromBlueprint} className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-slate-300"><i className="fas fa-file-invoice mr-2"></i> Load Quotation</button>
                                <button onClick={handleAddNode} className="py-2 px-4 bg-white border border-slate-300 hover:border-indigo-400 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors"><i className="fas fa-plus mr-2"></i> Add Resource</button>
                            </div>
                            <button onClick={()=>toggleFullScreen('table-container')} className="py-2 px-4 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-700 transition-colors"><i className="fas fa-expand mr-2"></i> Full Screen</button>
                        </div>
                        
                        <div className="flex-1 overflow-auto custom-scrollbar max-h-[700px] bg-white">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 w-48 font-black">Resource Name</th>
                                        <th className="p-4 w-32 font-black">Region</th>
                                        <th className="p-4 w-28 font-black">Type</th>
                                        <th className="p-4 w-32 font-black">IP / CIDR</th>
                                        <th className="p-4 w-40 font-black">Subnet / Zone</th>
                                        <th className="p-4 w-12 text-center font-black">Act</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {nodes.length === 0 ? (
                                        <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50 m-4 rounded-xl">Click a button above to map your infrastructure.</td></tr>
                                    ) : (
                                        nodes.map(n => (
                                            <tr key={n.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-4 font-bold text-slate-800 relative">
                                                    {getStatusIcon(n.status)}
                                                    <div className="ml-4"><EditableCell value={n.name} onSave={v=>handleUpdateNode(n.id, 'name', v)} /></div>
                                                </td>
                                                {/* 🚨 REMOVED REGION DROPDOWN - NOW EDITABLE CELL */}
                                                <td className="p-4 font-bold text-slate-600 uppercase text-[10px] tracking-widest">
                                                    <EditableCell value={n.region} onSave={v=>handleUpdateNode(n.id, 'region', v)} />
                                                </td>
                                                <td className="p-4 font-bold text-indigo-700">
                                                    <select value={n.type} onChange={e => handleUpdateNode(n.id, 'type', e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1.5 outline-none shadow-sm cursor-pointer">
                                                        <option value="ECS">ECS (Compute)</option><option value="RDS">RDS (Database)</option><option value="VPC">VPC</option>
                                                        <option value="Subnet">Subnet</option><option value="SG">Security Group</option><option value="NAT">NAT Gateway</option>
                                                        <option value="EIP">Elastic IP</option><option value="VPN">VPN Gateway</option><option value="OBS">OBS (Storage)</option>
                                                        <option value="CBR">CBR (Backup)</option><option value="ELB">ELB</option><option value="CCE">CCE (K8s)</option>
                                                    </select>
                                                </td>
                                                <td className="p-4 font-mono text-slate-600 font-bold"><EditableCell value={n.ip} onSave={v=>handleUpdateNode(n.id, 'ip', v)} /></td>
                                                <td className="p-4 font-bold text-slate-600"><EditableCell value={n.location} onSave={v=>handleUpdateNode(n.id, 'location', v)} /></td>
                                                <td className="p-4 text-center">
                                                    <button onClick={()=>handleDeleteNode(n.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-trash-alt"></i></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'canvas' && (
                    <div id="canvas-container" className="flex flex-col bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-inner animate-fade-in min-h-[700px] overflow-hidden">
                        
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
                            {nodes.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-20">
                                    <i className="fas fa-project-diagram text-6xl mb-4 opacity-50"></i>
                                    <p className="font-black text-lg">Awaiting Topology Data</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-10 items-center min-w-[800px] py-8">
                                    <div className="w-full max-w-5xl border-4 border-indigo-200 bg-indigo-50/20 rounded-3xl p-8 pt-16 relative shadow-sm">
                                        <div className="absolute -top-5 left-8 bg-indigo-600 border border-indigo-700 px-6 py-2 rounded-xl text-sm font-black text-white uppercase tracking-widest shadow-md">
                                            <i className="fas fa-cloud mr-2"></i> {regionFilter === 'All' ? 'Huawei Cloud VPC' : `VPC: ${regionFilter}`}
                                        </div>
                                        
                                        {groups.EdgeGateways.length > 0 && (
                                            <div className="absolute -top-8 right-8 flex gap-3 flex-wrap max-w-xl justify-end">
                                                {groups.EdgeGateways.map(n => (
                                                    <div key={n.id} className="bg-white border-2 border-indigo-300 p-2.5 rounded-xl shadow-lg flex items-center gap-3 min-w-[150px] hover:border-indigo-500 transition-colors relative">
                                                        {getStatusIcon(n.status)}
                                                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                                                            <i className={`${getIcon(n.type)} text-lg`}></i>
                                                        </div>
                                                        <div className="truncate">
                                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{n.type} Gateway</div>
                                                            <div className="font-bold text-[10px] text-indigo-900 truncate" title={n.name}>{n.name}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                            {Object.entries(groups.Subnets).map(([subName, subNodes]) => (
                                                <div key={subName} className="border-2 border-dashed border-blue-400 bg-white/60 p-5 rounded-2xl relative pt-10 shadow-sm hover:border-blue-500 transition-colors">
                                                    <span className="absolute top-3 left-4 text-[10px] font-black text-blue-800 uppercase tracking-widest bg-blue-100 px-3 py-1 rounded-md border border-blue-300 shadow-sm">
                                                        <i className="fas fa-network-wired mr-2 opacity-50"></i>{subName}
                                                    </span>
                                                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mt-2">
                                                        {subNodes.map(n => (
                                                            <div key={n.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all relative flex flex-col items-center text-center">
                                                                {getStatusIcon(n.status)}
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
                                    
                                    {groups.Global.length > 0 && (
                                        <div className="w-full max-w-5xl border-2 border-emerald-300 bg-emerald-50/50 rounded-2xl relative pt-10 p-6 shadow-sm">
                                            <span className="absolute -top-4 left-6 bg-emerald-100 px-4 py-1.5 rounded-xl text-xs font-black text-emerald-800 uppercase tracking-widest border border-emerald-400 shadow-sm"><i className="fas fa-globe mr-2"></i> Global / External Services</span>
                                            <div className="flex flex-wrap gap-5">
                                                {groups.Global.map(n => (
                                                    <div key={n.id} className="bg-white p-4 w-36 rounded-xl border border-slate-200 shadow-sm text-center hover:border-emerald-400 transition-all relative">
                                                        {getStatusIcon(n.status)}
                                                        <div className="w-12 h-12 mx-auto bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 mb-2">
                                                            <i className={`fas ${getIcon(n.type)} text-2xl`}></i>
                                                        </div>
                                                        <div className="font-black text-[10px] text-slate-800 truncate" title={n.name}>{n.name}</div>
                                                        <div className="text-[9px] font-black text-emerald-600 mt-1 uppercase tracking-wider bg-emerald-50 rounded px-1 py-0.5">{n.type}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
