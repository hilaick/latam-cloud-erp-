import React, { useState, useEffect, useMemo } from 'react';
import { EditableCell } from '../../utils/helpers';

export default function TopologyMapperView({ activeProject, onUpdateProject, onPromote }) {
    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];
    const networks = activeProject?.blueprintData?.topology?.network || [];
    const storages = activeProject?.blueprintData?.topology?.storage || [];

    const [nodes, setNodes] = useState(activeProject?.mapperNodes || []); 
    const [isMaximized, setIsMaximized] = useState(false);
    
    useEffect(()=>{ 
        setNodes(activeProject?.mapperNodes || []);
    }, [activeProject]);

    const saveNodes = (newNodes) => {
        setNodes(newNodes);
        onUpdateProject(activeProject.id, 'mapperNodes', newNodes);
    };

    // 1. Map from SA Quotation (Now captures Network & Storage)
    const generateFromBlueprint = () => {
        if (servers.length === 0 && databases.length === 0 && networks.length === 0) return alert('No blueprint data found in this project.');
        if (nodes.length > 0 && !window.confirm("This will overwrite your current architecture table. Proceed?")) return;
        
        const newNodes = [];
        servers.forEach((s, i) => newNodes.push({ id: `srv-${Date.now()}-${i}`, name: s.name || `Quoted-Server-${i+1}`, type: 'ECS', ip: `10.0.1.${10+i}`, location: 'Compute-Subnet', status: 'Quoted Only' }));
        databases.forEach((d, i) => newNodes.push({ id: `db-${Date.now()}-${i}`, name: d.name || `Quoted-DB-${i+1}`, type: 'RDS', ip: `10.0.2.${10+i}`, location: 'Data-Subnet', status: 'Quoted Only' }));
        networks.forEach((n, i) => newNodes.push({ id: `net-${Date.now()}-${i}`, name: n.name || `Quoted-${n.type}-${i+1}`, type: n.type || 'VPC', ip: 'N/A', location: 'Cloud-Network', status: 'Quoted Only' }));
        storages.forEach((st, i) => newNodes.push({ id: `st-${Date.now()}-${i}`, name: st.name || `Quoted-${st.type}-${i+1}`, type: st.type || 'OBS', ip: 'N/A', location: 'Global', status: 'Quoted Only' }));

        if(newNodes.length === 0 || !newNodes.find(n => n.type === 'VPC')) {
            newNodes.push({ id: `vpc-${Date.now()}`, name: 'VPC-Main', type: 'VPC', ip: '10.0.0.0/16', location: 'Cloud-Network', status: 'Quoted Only' });
        }
        saveNodes(newNodes);
    };

    // 2. Map Actual Data from MgC Only
    const generateFromMgC = () => {
        if (!activeProject?.mgcData) return alert('You must run the Live MgC Discovery or import MgC Excel data first!');
        if (nodes.length > 0 && !window.confirm("This will overwrite your current architecture table. Proceed?")) return;
        
        const newNodes = [];
        const raw = activeProject.mgcData.raw_inventory || {};
        const isExcel = activeProject.mgcData.source === 'excel';

        const parseNetwork = (netList) => {
            netList.forEach((net, i) => {
                const type = net.type || net.specs?.type || 'VPC';
                let shortType = type.includes('Security') ? 'SG' : type.includes('NAT') ? 'NAT' : type.includes('Subnet') ? 'Subnet' : 'VPC';
                newNodes.push({ id: `net-${Date.now()}-${i}`, name: net.name || `${shortType}-${i}`, type: shortType, ip: net.cidr || net.specs?.cidr || net.specs?.ip || 'N/A', location: 'Cloud-Network', status: 'MgC Only' });
            });
        };

        const parseStorage = (stList) => {
            stList.forEach((st, i) => {
                newNodes.push({ id: `st-${Date.now()}-${i}`, name: st.name || `Storage-${i}`, type: 'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global', status: 'MgC Only' });
            });
        };

        if (isExcel) {
            (raw.servers || []).forEach((srv, i) => newNodes.push({ id: `srv-${Date.now()}-${i}`, name: srv.name || `Server-${i}`, type: 'ECS', ip: srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet', status: 'MgC Only' }));
            (raw.databases || []).forEach((db, i) => newNodes.push({ id: `db-${Date.now()}-${i}`, name: db.name || `DB-${i}`, type: 'RDS', ip: db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet', status: 'MgC Only' }));
            parseNetwork(raw.network || []);
            parseStorage(raw.storage || []);
        } else {
            (raw.compute || []).forEach((srv, i) => newNodes.push({ id: `srv-${Date.now()}-${i}`, name: srv.name || `Server-${i}`, type: 'ECS', ip: `10.0.1.${10+i}`, location: 'Compute-Subnet', status: 'MgC Only' }));
            (raw.databases || []).forEach((db, i) => newNodes.push({ id: `db-${Date.now()}-${i}`, name: db.name || `DB-${i}`, type: 'RDS', ip: `10.0.2.${10+i}`, location: 'Data-Subnet', status: 'MgC Only' }));
            parseNetwork(raw.network || []);
            parseStorage(raw.storage || []);
        }
        
        if(newNodes.length === 0) newNodes.push({ id: `vpc-${Date.now()}`, name: 'VPC-Main', type: 'VPC', ip: '10.0.0.0/16', location: 'Cloud-Network', status: 'MgC Only' });
        saveNodes(newNodes);
    };

    // 3. RECONCILIATION ENGINE: Compares SOW vs MgC and labels differences!
    const generateReconciledScope = () => {
        if (!activeProject?.mgcData) return alert('You must run MgC Discovery first to reconcile against the SOW!');
        if (nodes.length > 0 && !window.confirm("This will merge Quoted and MgC scopes, replacing your current table. Proceed?")) return;

        const raw = activeProject.mgcData.raw_inventory || {};
        const isExcel = activeProject.mgcData.source === 'excel';
        
        // 1. Gather all MgC Resources
        let mgcNodes = [];
        const parseNetForMerge = (netList) => {
            netList.forEach((net, i) => {
                const type = net.type || net.specs?.type || 'VPC';
                let shortType = type.includes('Security') ? 'SG' : type.includes('NAT') ? 'NAT' : type.includes('Subnet') ? 'Subnet' : 'VPC';
                mgcNodes.push({ id: `mgc-net-${i}`, name: net.name || `${shortType}-${i}`, type: shortType, ip: net.cidr || net.specs?.cidr || net.specs?.ip || 'N/A', location: 'Cloud-Network' });
            });
        };
        const parseStorageForMerge = (stList) => {
            stList.forEach((st, i) => {
                mgcNodes.push({ id: `mgc-st-${i}`, name: st.name || `Storage-${i}`, type: 'OBS', ip: st.location || st.specs?.location || 'N/A', location: 'Global' });
            });
        };

        if (isExcel) {
            (raw.servers || []).forEach((srv, i) => mgcNodes.push({ id: `mgc-srv-${i}`, name: srv.name || `Server-${i}`, type: 'ECS', ip: srv.specs?.ip || srv.specs?.private_ip_address || `10.0.1.${10+i}`, location: 'Compute-Subnet' }));
            (raw.databases || []).forEach((db, i) => mgcNodes.push({ id: `mgc-db-${i}`, name: db.name || `DB-${i}`, type: 'RDS', ip: db.specs?.ip || `10.0.2.${10+i}`, location: 'Data-Subnet' }));
            parseNetForMerge(raw.network || []);
            parseStorageForMerge(raw.storage || []);
        } else {
            (raw.compute || []).forEach((srv, i) => mgcNodes.push({ id: `mgc-srv-${i}`, name: srv.name || `Server-${i}`, type: 'ECS', ip: `10.0.1.${10+i}`, location: 'Compute-Subnet' }));
            (raw.databases || []).forEach((db, i) => mgcNodes.push({ id: `mgc-db-${i}`, name: db.name || `DB-${i}`, type: 'RDS', ip: `10.0.2.${10+i}`, location: 'Data-Subnet' }));
            parseNetForMerge(raw.network || []);
            parseStorageForMerge(raw.storage || []);
        }

        // 2. Gather all Quoted Resources
        let quotedNodes = [];
        servers.forEach((s, i) => quotedNodes.push({ name: s.name || `Quoted-Server-${i+1}`, type: 'ECS' }));
        databases.forEach((d, i) => quotedNodes.push({ name: d.name || `Quoted-DB-${i+1}`, type: 'RDS' }));
        networks.forEach((n, i) => quotedNodes.push({ name: n.name || `Quoted-${n.type}-${i+1}`, type: n.type || 'VPC' }));
        storages.forEach((s, i) => quotedNodes.push({ name: s.name || `Quoted-${s.type}-${i+1}`, type: s.type || 'OBS' }));

        const merged = [];
        
        // 3. Match MgC against Quoted
        mgcNodes.forEach(mNode => {
            const matchIdx = quotedNodes.findIndex(q => (q.name || '').toLowerCase().includes((mNode.name || '').toLowerCase()) || (mNode.name || '').toLowerCase().includes((q.name || '').toLowerCase()));
            if (matchIdx !== -1) {
                merged.push({ ...mNode, status: 'Matched' });
                quotedNodes.splice(matchIdx, 1);
            } else {
                merged.push({ ...mNode, status: 'MgC Only' });
            }
        });

        // 4. Leftovers were NOT found in MgC
        quotedNodes.forEach((q, i) => {
            merged.push({ id: `quo-only-${Date.now()}-${i}`, name: q.name, type: q.type, ip: 'TBD', location: q.type === 'VPC' ? 'Cloud-Network' : 'Pending-Allocation', status: 'Quoted Only' });
        });

        if(!merged.find(n => n.type === 'VPC')) merged.push({ id: `vpc-${Date.now()}`, name: 'VPC-Main', type: 'VPC', ip: '10.0.0.0/16', location: 'Cloud-Network', status: 'Matched' });
        saveNodes(merged);
    };

    const handleUpdateNode = (id, field, value) => {
        const updated = nodes.map(n => n.id === id ? { ...n, [field]: value } : n);
        saveNodes(updated);
    };

    const handleAddNode = () => {
        const newId = `manual-${Date.now()}`;
        const updated = [...nodes, { id: newId, name: 'New Resource', type: 'ECS', ip: '0.0.0.0/32', location: 'New-Subnet', status: 'Manual' }];
        saveNodes(updated);
    };

    const handleDeleteNode = (id) => {
        const updated = nodes.filter(n => n.id !== id);
        saveNodes(updated);
    };

    const handleAutoGenerateWBS = () => {
        if (nodes.length === 0) { alert("Please populate the infrastructure scope first."); return; }
        if(window.confirm("This will generate a new WBS Task List based on the infrastructure scope below. Once approved, the project will automatically advance to Step 3: Planning. Proceed?")) {
            let newTasks = [
                { id: "1", name: "Phase 1: Landing Zone & Security", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
                { id: "1.1", name: "Deploy Target VPC & Subnets", prog: "0%", resp: "Partner", start: "", end: "", isParent: false }
            ];
            let p = 2;
            const types = nodes.map(n => String(n.type).toUpperCase());
            if (types.includes('ECS') || types.includes('VM')) { newTasks.push({ id: `${p}`, name: `Phase ${p}: Compute Sync`, prog: "0%", resp: "Partner", isParent: true }); newTasks.push({ id: `${p}.1`, name: "Install SMS Agents", prog: "0%", resp: "Customer IT", isParent: false }); p++; }
            if (types.includes('RDS') || types.includes('DB')) { newTasks.push({ id: `${p}`, name: `Phase ${p}: Database Sync`, prog: "0%", resp: "Partner", isParent: true }); newTasks.push({ id: `${p}.1`, name: "Configure DRS", prog: "0%", resp: "Partner", isParent: false }); p++; }
            
            newTasks.push({ id: `${p}`, name: `Phase ${p}: Cutover`, prog: "0%", resp: "All", isParent: true });
            newTasks.push({ id: `${p}.1`, name: "DNS Switch", prog: "0%", resp: "Customer", isParent: false });

            onUpdateProject(activeProject.id, 'migrationPlan', newTasks);
            if(onPromote) onPromote();
        }
    };

    const groups = useMemo(() => {
        const grps = { Edge: [], External: [], Subnets: {}, Global: [], Network: [], Pending: [] };
        nodes.forEach(n => {
            const loc = String(n.location || "");
            if (loc === 'Pending-Allocation') grps.Pending.push(n);
            else if (loc === 'Edge') grps.Edge.push(n); 
            else if (loc.includes('External') || loc.includes('On-Premise')) grps.External.push(n);
            else if (loc === 'PaaS' || loc === 'Storage' || loc === 'Management' || loc === 'Serverless' || loc === 'Global') grps.Global.push(n); 
            else if (loc === 'Cloud-Network') grps.Network.push(n); 
            else { if (!grps.Subnets[loc]) grps.Subnets[loc] = []; grps.Subnets[loc].push(n); }
        });
        return grps;
    }, [nodes]);

    const getIcon = (type) => {
        const t = String(type || "").toLowerCase();
        if (t.includes('ecs') || t.includes('vm')) return 'fa-server text-blue-600'; 
        if (t.includes('rds') || t.includes('db')) return 'fa-database text-rose-600';
        if (t.includes('vpc')) return 'fa-cloud text-indigo-600';
        if (t.includes('subnet')) return 'fa-network-wired text-indigo-400';
        if (t.includes('sg') || t.includes('security') || t.includes('cbr') || t.includes('backup')) return 'fa-shield-alt text-amber-500';
        if (t.includes('nat') || t.includes('eip') || t.includes('vpn')) return 'fa-route text-indigo-500';
        if (t.includes('elb') || t.includes('loadbalancer')) return 'fa-sitemap text-blue-500';
        if (t.includes('obs') || t.includes('storage') || t.includes('sfs')) return 'fa-hdd text-emerald-600';
        if (t.includes('cce') || t.includes('k8s')) return 'fa-cubes text-blue-500';
        return 'fa-microchip text-slate-500';
    };

    const getStatusBadge = (status) => {
        if(status === 'Matched') return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 text-[9px] font-black uppercase tracking-wider whitespace-nowrap"><i className="fas fa-check-circle mr-1"></i>Matched</span>;
        if(status === 'MgC Only') return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 text-[9px] font-black uppercase tracking-wider whitespace-nowrap" title="Found in MgC, missing from SOW"><i className="fas fa-exclamation-triangle mr-1"></i>Unquoted</span>;
        if(status === 'Quoted Only') return <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200 text-[9px] font-black uppercase tracking-wider whitespace-nowrap" title="In SOW, missing from MgC"><i className="fas fa-times-circle mr-1"></i>Missing</span>;
        if(status === 'Manual') return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200 text-[9px] font-black uppercase tracking-wider whitespace-nowrap"><i className="fas fa-edit mr-1"></i>Manual</span>;
        return <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-[9px] font-black uppercase tracking-wider whitespace-nowrap">Mapped</span>;
    };

    const getStatusIcon = (status) => {
        if(status === 'Matched') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Matched in both SOW and MgC"></div>;
        if(status === 'MgC Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse" title="Scope Creep: Discovered but not quoted"></div>;
        if(status === 'Quoted Only') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" title="Missing: Quoted but not discovered"></div>;
        if(status === 'Manual') return <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm" title="Manually added"></div>;
        return null;
    };

    return (
        <div className={isMaximized ? "fixed inset-0 z-50 bg-[#f8fafc] p-4 md:p-8 flex flex-col overflow-auto animate-fade-in" : "animate-fade-in"}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[750px] max-h-[900px]">
                <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-200 pb-4">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-sitemap text-indigo-500"></i> Infrastructure Scope Manager</h3>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Reconcile and Manage the Approved Delivery Scope</p>
                    </div>
                    <button onClick={()=>setIsMaximized(!isMaximized)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black shadow-sm"><i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} mr-2`}></i>{isMaximized ? 'Restore' : 'Full Screen'}</button>
                </div>
                
                <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
                    
                    {/* LEFT SIDE: The Interactive Table */}
                    <div className="xl:w-1/2 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white flex-wrap gap-2">
                            <div className="flex gap-2">
                                <button onClick={generateReconciledScope} className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg shadow-md transition-colors border border-emerald-500"><i className="fas fa-random mr-1"></i> Reconcile MgC vs SOW</button>
                                <button onClick={generateFromMgC} className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[9px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-slate-300" title="Load MgC Only"><i className="fas fa-search"></i></button>
                                <button onClick={generateFromBlueprint} className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[9px] uppercase tracking-widest rounded-lg shadow-sm transition-colors border border-slate-300" title="Load SOW Only"><i className="fas fa-file-invoice"></i></button>
                            </div>
                            <button onClick={handleAddNode} className="py-2 px-3 bg-white border-2 border-slate-300 hover:border-indigo-400 text-indigo-700 font-black text-[9px] uppercase tracking-widest rounded-lg shadow-sm transition-colors"><i className="fas fa-plus mr-1"></i> Add Resource</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                            <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-slate-200 text-[10px] uppercase text-slate-600 sticky top-0 z-10 shadow-sm border-b-2 border-slate-300">
                                    <tr>
                                        <th className="p-3 w-40 font-black">Resource Name</th>
                                        <th className="p-3 w-28 font-black">Type</th>
                                        <th className="p-3 w-32 font-black">IP / CIDR</th>
                                        <th className="p-3 w-32 font-black">Target Zone</th>
                                        <th className="p-3 w-24 font-black">Status</th>
                                        <th className="p-3 w-12 text-center font-black">Act</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-xs bg-white">
                                    {nodes.length === 0 ? (
                                        <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50">Click "Reconcile MgC vs SOW" to map your infrastructure.</td></tr>
                                    ) : (
                                        nodes.map(n => (
                                            <tr key={n.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-3 font-bold text-slate-800"><EditableCell value={n.name} onSave={v=>handleUpdateNode(n.id, 'name', v)} /></td>
                                                <td className="p-3 font-bold text-indigo-700">
                                                    <select 
                                                        value={n.type} 
                                                        onChange={e => handleUpdateNode(n.id, 'type', e.target.value)} 
                                                        className="border border-slate-200 rounded p-1 text-xs font-bold text-indigo-700 bg-white shadow-sm outline-none cursor-pointer w-full focus:border-indigo-500"
                                                    >
                                                        <option value="ECS">ECS (Compute)</option>
                                                        <option value="RDS">RDS (Database)</option>
                                                        <option value="VPC">VPC</option>
                                                        <option value="Subnet">Subnet</option>
                                                        <option value="SG">Security Group</option>
                                                        <option value="NAT">NAT Gateway</option>
                                                        <option value="EIP">Elastic IP</option>
                                                        <option value="VPN">VPN</option>
                                                        <option value="OBS">OBS (Storage)</option>
                                                        <option value="CBR">Backup (CBR)</option>
                                                        <option value="ELB">ELB</option>
                                                        <option value="CCE">CCE (K8s)</option>
                                                    </select>
                                                </td>
                                                <td className="p-3 font-mono text-slate-600 font-bold"><EditableCell value={n.ip} onSave={v=>handleUpdateNode(n.id, 'ip', v)} /></td>
                                                <td className="p-3 font-bold text-slate-600"><EditableCell value={n.location} onSave={v=>handleUpdateNode(n.id, 'location', v)} /></td>
                                                <td className="p-3">{getStatusBadge(n.status)}</td>
                                                <td className="p-3 text-center">
                                                    <button onClick={()=>handleDeleteNode(n.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-trash-alt"></i></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200 mt-auto">
                            <button onClick={handleAutoGenerateWBS} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95 border border-indigo-500">✨ Generate WBS & Advance to Planning</button>
                        </div>
                    </div>

                    {/* RIGHT SIDE: The Live Visual Canvas */}
                    <div className="xl:w-1/2 bg-[#f8fafc] p-6 overflow-auto border border-slate-200 rounded-2xl shadow-inner relative custom-scrollbar">
                        {nodes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <i className="fas fa-network-wired text-6xl mb-4 opacity-50"></i>
                                <p className="font-black text-lg">Awaiting Topology Data</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 items-start min-w-[600px]">

                                {/* Unallocated / Pending Nodes */}
                                {groups.Pending.length > 0 && (
                                    <div className="w-full border-2 border-rose-200 bg-rose-50/50 rounded-xl p-4 relative mb-4">
                                        <span className="absolute -top-3 left-3 bg-rose-100 px-3 py-1 rounded-full text-[10px] font-black text-rose-800 uppercase tracking-wider border border-rose-200">Unallocated Quoted Resources</span>
                                        <div className="flex flex-wrap gap-4 mt-2">
                                            {groups.Pending.map(n => (
                                                <div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 min-w-[150px] relative">
                                                    {getStatusIcon(n.status)}
                                                    <i className={`${getIcon(n.type)} text-2xl`}></i>
                                                    <div className="truncate">
                                                        <div className="font-bold text-xs text-slate-800 truncate" title={n.name}>{n.name}</div>
                                                        <div className="text-[10px] font-mono text-rose-600 truncate">Assign to Subnet</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Target Cloud VPC */}
                                <div className="w-full border-4 border-blue-200 bg-blue-50/30 rounded-2xl p-8 relative min-h-[300px]">
                                    <span className="absolute -top-4 left-6 bg-blue-100 border border-blue-300 px-4 py-1.5 rounded-full text-sm font-black text-blue-800 uppercase tracking-widest shadow-sm"><i className="fas fa-cloud mr-2"></i> Target Infrastructure</span>
                                    
                                    {groups.Network.length > 0 && (
                                        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/60 border border-blue-200 rounded-xl shadow-sm">
                                            <div className="w-full text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-1"><i className="fas fa-network-wired mr-1"></i> Core Networking</div>
                                            {groups.Network.map(n => (
                                                <div key={n.id} className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg shadow-sm flex items-center gap-3 min-w-[150px] hover:border-indigo-400 transition-colors relative">
                                                    {getStatusIcon(n.status)}
                                                    <i className={`${getIcon(n.type)} text-2xl`}></i>
                                                    <div className="truncate">
                                                        <div className="font-bold text-xs text-indigo-900 truncate" title={n.name}>{n.name}</div>
                                                        <div className="text-[10px] font-mono text-indigo-600 truncate">{n.ip}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                                        {Object.entries(groups.Subnets).map(([subName, subNodes]) => (
                                            <div key={subName} className="border-2 border-dashed border-blue-300 bg-white/80 p-5 rounded-xl relative pt-8 shadow-sm">
                                                <span className="absolute top-2 left-3 text-[10px] font-black text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{subName}</span>
                                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                    {subNodes.map(n => (
                                                        <div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 transition-colors relative">
                                                            {getStatusIcon(n.status)}
                                                            <div className="font-bold text-xs truncate pr-2" title={n.name}><i className={`fas ${getIcon(n.type)} mr-2 opacity-80`}></i>{n.name}</div>
                                                            <div className="text-[10px] font-mono text-slate-500 mt-1">{n.ip}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* PaaS & Global Components */}
                                {groups.Global.length > 0 && (
                                    <div className="w-full border-2 border-emerald-200 bg-emerald-50/50 rounded-xl relative pt-6 p-4 mt-4">
                                        <span className="absolute -top-3 left-3 bg-emerald-100 px-3 py-1 rounded-full text-[10px] font-black text-emerald-800 uppercase tracking-wider border border-emerald-200">PaaS / Global Services</span>
                                        <div className="flex flex-wrap gap-4">
                                            {groups.Global.map(n => (
                                                <div key={n.id} className="bg-white p-4 w-32 rounded-lg border border-slate-200 shadow-sm text-center hover:border-emerald-300 transition-colors relative">
                                                    {getStatusIcon(n.status)}
                                                    <i className={`fas ${getIcon(n.type)} text-2xl mb-2 opacity-90`}></i>
                                                    <div className="font-bold text-[10px] truncate" title={n.name}>{n.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
