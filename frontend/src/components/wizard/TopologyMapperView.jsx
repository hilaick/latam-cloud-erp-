import React, { useState, useEffect, useMemo } from 'react';
import { EditableCell } from '../../utils/helpers';

export const HUAWEI_REGIONS = [
    { group: "Latin America", options: [{ id: "na-mexico-1", name: "LA-Mexico City1" }, { id: "la-north-2", name: "LA-Mexico City2" }, { id: "sa-brazil-1", name: "LA-Sao Paulo1" }, { id: "la-south-2", name: "LA-Santiago" }, { id: "sa-argentina-1", name: "LA-Buenos Aires1" }] },
    { group: "Europe, Middle East & Africa", options: [{ id: "eu-west-101", name: "EU-Dublin" }, { id: "tr-west-1", name: "TR-Istanbul" }, { id: "me-east-1", name: "ME-Riyadh" }, { id: "af-south-1", name: "AF-Johannesburg" }, { id: "af-north-1", name: "AF-Cairo" }] },
    { group: "Asia Pacific", options: [{ id: "ap-southeast-1", name: "CN-Hong Kong" }, { id: "ap-southeast-2", name: "AP-Bangkok" }, { id: "ap-southeast-3", name: "AP-Singapore" }, { id: "ap-southeast-4", name: "AP-Jakarta" }, { id: "ap-southeast-5", name: "AP-Manila" }] },
    { group: "Chinese Mainland", options: [{ id: "cn-north-1", name: "CN North-Beijing1" }, { id: "cn-north-4", name: "CN North-Beijing4" }, { id: "cn-north-9", name: "CN North-Ulanqab1" }, { id: "cn-north-12", name: "CN North3" }, { id: "cn-east-3", name: "CN East-Shanghai1" }, { id: "cn-east-2", name: "CN East-Shanghai2" }, { id: "cn-east-5", name: "CN East-Qingdao" }, { id: "cn-east-4", name: "CN East2" }, { id: "cn-south-1", name: "CN South-Guangzhou" }, { id: "cn-southwest-2", name: "CN Southwest-Guiyang1" }] }
];

export default function TopologyMapperView({ activeProject, onUpdateProject, onPromote }) {
    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];
    const networks = activeProject?.blueprintData?.topology?.network || [];
    const storages = activeProject?.blueprintData?.topology?.storage || [];

    const [nodes, setNodes] = useState(activeProject?.mapperNodes || []); 
    const [activeTab, setActiveTab] = useState('table'); 
    const [regionFilter, setRegionFilter] = useState('All');
    const [selectedNode, setSelectedNode] = useState(null);
    
    useEffect(()=>{ setNodes(activeProject?.mapperNodes || []); }, [activeProject]);
    const saveNodes = (newNodes) => { setNodes(newNodes); onUpdateProject(activeProject.id, 'mapperNodes', newNodes); };

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

    const generateFromBlueprint = () => {
        if (servers.length === 0 && databases.length === 0 && networks.length === 0) return alert('No blueprint data found in this project.');
        if (nodes.length > 0 && !window.confirm("Overwrite your current architecture table?")) return;
        
        const fallbackRegion = activeProject?.region || 'la-south-2';
        const newNodes = [];
        servers.forEach((s, i) => newNodes.push({ id: `srv-${Date.now()}-${i}`, name: s.name, type: 'ECS', ip: `10.0.1.${10+i}`, location: 'Compute-Subnet', region: s.metadata?.region || fallbackRegion, status: 'Quoted Only', config: { os: s.metadata?.os_type || 'Unknown' } }));
        databases.forEach((d, i) => newNodes.push({ id: `db-${Date.now()}-${i}`, name: d.name, type: 'RDS', ip: `10.0.2.${10+i}`, location: 'Data-Subnet', region: d.metadata?.region || fallbackRegion, status: 'Quoted Only', config: {} }));
        networks.forEach((n, i) => newNodes.push({ id: `net-${Date.now()}-${i}`, name: n.name, type: getShortNetType(n.type), ip: 'N/A', location: 'Cloud-Network', region: n.metadata?.region || fallbackRegion, status: 'Quoted Only', config: {} }));
        storages.forEach((st, i) => newNodes.push({ id: `st-${Date.now()}-${i}`, name: st.name, type: st.type || 'OBS', ip: 'N/A', location: 'Global', region: st.metadata?.region || fallbackRegion, status: 'Quoted Only', config: {} }));
        saveNodes(newNodes);
    };

    const generateFromMgC = () => {
        if (!activeProject?.mgcData) return alert('You must run the Live MgC Discovery or import MgC Excel data first!');
        if (nodes.length > 0 && !window.confirm("This will overwrite your current architecture table. Proceed?")) return;
        
        const newNodes = [];
        const raw = activeProject.mgcData.raw_inventory || {};
        
        const parseNet = (netList) => netList.forEach((net, i) => {
            newNodes.push({ id: `net-${Date.now()}-${i}`, name: net.name || `${getShortNetType(net.type)}-${i}`, type: getShortNetType(net.type), ip: net.cidr || net.specs?.cidr || net.specs?.ip || 'N/A', location: 'Cloud-Network', region: net.region || net.specs?.region || activeProject?.region || 'Unknown', status: 'Live Only', config: {} });
        });
        const parseStorage = (stList) => stList.forEach((st, i) => newNodes.push({ id: `st-${Date.now()}-${i}`, name: st.name || `${st.type||'OBS'}-${i}`, type: st.type||'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global', region: st.location || st.region || 'Global', status: 'Live Only', config: {} }));

        const extractCompute = (list) => list.forEach((srv, i) => newNodes.push({ id: `srv-${Date.now()}-${i}`, name: srv.name, type: 'ECS', ip: srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet', region: srv.region || srv.specs?.region || activeProject?.region || 'Unknown', status: 'Live Only', config: { os: srv.os_type || srv.specs?.os || 'Unknown' } }));
        const extractDb = (list) => list.forEach((db, i) => newNodes.push({ id: `db-${Date.now()}-${i}`, name: db.name, type: 'RDS', ip: db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet', region: db.region || db.specs?.region || activeProject?.region || 'Unknown', status: 'Live Only', config: { engine: db.engine || db.specs?.engine || 'Unknown' } }));

        extractCompute(raw.servers || raw.compute || []);
        extractDb(raw.databases || []);
        parseNet(raw.network || []);
        parseStorage(raw.storage || []);
        saveNodes(newNodes);
    };

    // 🚨 2-PASS RECONCILIATION ENGINE (DUPLICATE FIX)
    const normalizeStr = (str) => String(str || "").toLowerCase().replace(/[^a-z0-9]/g, '');

    const generateReconciledScope = () => {
        if (!activeProject?.mgcData) return alert('Run MgC Discovery first to reconcile against SOW!');
        if (nodes.length > 0 && !window.confirm("Merge Quoted and Live scopes, replacing your current table?")) return;

        const raw = activeProject.mgcData.raw_inventory || {};
        let mgcNodes = [];
        
        (raw.network || []).forEach((net, i) => mgcNodes.push({ id: `mgc-net-${i}`, name: net.name || `${getShortNetType(net.type)}-${i}`, type: getShortNetType(net.type), ip: net.cidr || net.specs?.cidr || net.specs?.ip || 'N/A', location: 'Cloud-Network', region: net.region || net.specs?.region || activeProject?.region || 'Unknown', config: {} }));
        (raw.storage || []).forEach((st, i) => mgcNodes.push({ id: `mgc-st-${i}`, name: st.name || `${st.type||'OBS'}-${i}`, type: st.type||'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global', region: st.location || st.region || 'Global', config: {} }));
        (raw.servers || raw.compute || []).forEach((srv, i) => mgcNodes.push({ id: `mgc-srv-${i}`, name: srv.name, type: 'ECS', ip: srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet', region: srv.region || srv.specs?.region || activeProject?.region || 'Unknown', config: { os: srv.os_type || srv.specs?.os || 'Unknown' } }));
        (raw.databases || []).forEach((db, i) => mgcNodes.push({ id: `mgc-db-${i}`, name: db.name, type: 'RDS', ip: db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet', region: db.region || db.specs?.region || activeProject?.region || 'Unknown', config: { engine: db.engine || db.specs?.engine || 'Unknown' } }));

        const fallbackRegion = activeProject?.region || 'la-south-2';
        let quotedNodes = [];
        servers.forEach(s => quotedNodes.push({ name: s.name, type: 'ECS', loc: 'Compute-Subnet', reg: s.metadata?.region || fallbackRegion, ip: 'TBD' }));
        databases.forEach(d => quotedNodes.push({ name: d.name, type: 'RDS', loc: 'Data-Subnet', reg: d.metadata?.region || fallbackRegion, ip: 'TBD' }));
        networks.forEach(n => quotedNodes.push({ name: n.name, type: getShortNetType(n.type), loc: 'Cloud-Network', reg: n.metadata?.region || fallbackRegion, ip: 'TBD' }));
        storages.forEach(s => quotedNodes.push({ name: s.name, type: s.type || 'OBS', loc: 'Global', reg: s.metadata?.region || fallbackRegion, ip: 'TBD' }));

        const merged = [];
        const unmatchedMgc = [];

        // PASS 1: Exact Name Match or Exact IP Match
        mgcNodes.forEach(mNode => {
            const mNameNorm = normalizeStr(mNode.name);
            const mIp = (mNode.ip && mNode.ip !== 'N/A' && mNode.ip !== 'TBD') ? mNode.ip : null;

            const matchIdx = quotedNodes.findIndex(q => {
                const qNameNorm = normalizeStr(q.name);
                const isTypeCompat = (q.type === mNode.type) || (q.type === 'ECS' && mNode.type === 'ECS');
                return ((qNameNorm === mNameNorm) || (mIp && q.ip === mIp)) && isTypeCompat;
            });

            if (matchIdx !== -1) { 
                merged.push({ ...mNode, name: quotedNodes[matchIdx].name, status: 'Matched' }); 
                quotedNodes.splice(matchIdx, 1); 
            } else { 
                unmatchedMgc.push(mNode); 
            }
        });

        // PASS 2: Fuzzy Substring Match (Strip "server", "ecs", and trailing numbers)
        unmatchedMgc.forEach(mNode => {
            const mNameClean = normalizeStr(mNode.name).replace(/(ecs|rds|server|vm|node|0+.*)$/g, '');
            if(mNameClean.length < 4) { merged.push({ ...mNode, status: 'Live Only' }); return; }

            const matchIdx = quotedNodes.findIndex(q => {
                const qNameClean = normalizeStr(q.name).replace(/(ecs|rds|server|vm|node|0+.*)$/g, '');
                if(qNameClean.length < 4) return false;
                const isFuzzy = qNameClean.includes(mNameClean) || mNameClean.includes(qNameClean);
                const isTypeCompat = (q.type === mNode.type) || (q.type === 'ECS' && mNode.type === 'ECS');
                return isFuzzy && isTypeCompat;
            });

            if (matchIdx !== -1) { 
                merged.push({ ...mNode, name: quotedNodes[matchIdx].name, status: 'Matched' }); 
                quotedNodes.splice(matchIdx, 1); 
            } else { 
                merged.push({ ...mNode, status: 'Live Only' }); 
            }
        });

        quotedNodes.forEach((q, i) => merged.push({ id: `quo-only-${Date.now()}-${i}`, name: q.name, type: q.type, ip: q.ip, location: q.loc, region: q.reg, status: 'Quoted Only', config: {} }));
        saveNodes(merged);
    };

    const handleUpdateNode = (id, field, value) => saveNodes(nodes.map(n => n.id === id ? { ...n, [field]: value } : n));
    const handleAddNode = () => saveNodes([...nodes, { id: `manual-${Date.now()}`, name: 'New Resource', type: 'ECS', ip: '0.0.0.0/32', location: 'New-Subnet', region: activeProject?.region || 'la-south-2', status: 'Manual', config: {} }]);
    const handleDeleteNode = (id) => saveNodes(nodes.filter(n => n.id !== id));

    const groups = useMemo(() => {
        const grps = { EdgeGateways: [], Subnets: {}, Global: [], Pending: [] };
        nodes.filter(n => regionFilter === 'All' || n.region === regionFilter).forEach(n => {
            const type = String(n.type).toUpperCase();
            const loc = String(n.location || "");
            if (loc === 'Pending-Allocation') grps.Pending.push(n);
            else if (['NAT', 'EIP', 'VPN', 'CGW', 'VPN-CONN', 'ELB'].includes(type)) grps.EdgeGateways.push(n);
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
        if (t.includes('nat') || t.includes('eip') || t.includes('vpn') || t.includes('cgw')) return 'fa-route text-indigo-600';
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

                {activeTab === 'table' && (
                    <div id="table-container" className="flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fade-in min-h-[600px] bg-white">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3 bg-white">
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={generateReconciledScope} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-emerald-500"><i className="fas fa-random mr-2"></i> Reconcile Quotation vs Live</button>
                                <button onClick={generateFromMgC} className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-slate-300"><i className="fas fa-search mr-2"></i> Load Live Discovery</button>
                                <button onClick={generateFromBlueprint} className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-slate-300"><i className="fas fa-file-invoice mr-2"></i> Load Quotation</button>
                                <button onClick={handleAddNode} className="py-2 px-4 bg-white border border-slate-300 hover:border-indigo-400 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-colors"><i className="fas fa-plus mr-2"></i> Add Resource</button>
                            </div>
                            <button onClick={()=>toggleFullScreen('table-container')} className="py-2 px-4 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-700 transition-colors"><i className="fas fa-expand mr-2"></i> Full Screen</button>
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
                                    {nodes.length === 0 ? (
                                        <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50 m-4 rounded-xl">Click a button above to map your infrastructure.</td></tr>
                                    ) : (
                                        nodes.map(n => (
                                            <tr key={n.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-4 font-bold text-slate-800 relative">
                                                    {getStatusIcon(n.status)}
                                                    <div className="ml-4"><EditableCell value={n.name} onSave={v=>handleUpdateNode(n.id, 'name', v)} /></div>
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
                                                    <div key={n.id} onClick={()=>setSelectedNode(n)} className="bg-white border-2 border-indigo-300 p-2.5 rounded-xl shadow-lg flex items-center gap-3 min-w-[150px] hover:border-indigo-500 transition-colors relative cursor-pointer hover:-translate-y-1">
                                                        {getStatusIcon(n.status)}
                                                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                                                            <i className={`${getIcon(n.type)} text-lg`}></i>
                                                        </div>
                                                        <div className="truncate">
                                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{n.type}</div>
                                                            <div className="font-bold text-[10px] text-indigo-900 truncate" title={n.name}>{n.name}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                            {Object.entries(groups.Subnets).map(([subName, subNodes]) => (
                                                <div key={subName} className="border-2 border-dashed border-blue-400 bg-white/60 p-5 rounded-2xl relative pt-10 shadow-sm">
                                                    <span className="absolute top-3 left-4 text-[10px] font-black text-blue-800 uppercase tracking-widest bg-blue-100 px-3 py-1 rounded-md border border-blue-300 shadow-sm">
                                                        <i className="fas fa-network-wired mr-2 opacity-50"></i>{subName}
                                                    </span>
                                                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mt-2">
                                                        {subNodes.map(n => (
                                                            <div key={n.id} onClick={()=>setSelectedNode(n)} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:-translate-y-1 transition-all relative flex flex-col items-center text-center cursor-pointer">
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
                                                    <div key={n.id} onClick={()=>setSelectedNode(n)} className="bg-white p-4 w-36 rounded-xl border border-slate-200 shadow-sm text-center hover:border-emerald-500 hover:-translate-y-1 transition-all relative cursor-pointer">
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
                        <div className="p-4 bg-white border-t border-slate-200">
                            <button onClick={()=>setSelectedNode(null)} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-colors">Close Drawer</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
