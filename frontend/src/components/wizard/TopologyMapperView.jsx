import React, { useState, useEffect, useMemo } from 'react';
import { EditableCell } from '../../utils/helpers';

export default function TopologyMapperView({ activeProject, onUpdateProject, onPromote }) {
    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];
    const discoveredServers = activeProject?.mgcData?.compute || servers.length;

    // We now store structured Array data instead of raw CSV strings
    const [nodes, setNodes] = useState(activeProject?.mapperNodes || []); 
    const [isMaximized, setIsMaximized] = useState(false);
    
    useEffect(()=>{ 
        setNodes(activeProject?.mapperNodes || []);
    }, [activeProject]);

    const saveNodes = (newNodes) => {
        setNodes(newNodes);
        onUpdateProject(activeProject.id, 'mapperNodes', newNodes);
    };

    // 1. Map from SA Quotation (Loads into the Table)
    const generateFromBlueprint = () => {
        if (servers.length === 0) return alert('No blueprint data found in this project.');
        if (nodes.length > 0 && !window.confirm("This will overwrite your current architecture table with the original SOW quotation. Proceed?")) return;
        
        const newNodes = [];
        servers.forEach((server, i) => {
            newNodes.push({ id: `srv-${Date.now()}-${i}`, name: server.name || `Quoted-Server-${i+1}`, type: 'ECS', ip: `10.0.1.${10+i}`, location: 'Compute-Subnet' });
        });
        databases.forEach((db, i) => {
            newNodes.push({ id: `db-${Date.now()}-${i}`, name: db.name || `Quoted-DB-${i+1}`, type: 'RDS', ip: `10.0.2.${10+i}`, location: 'Data-Subnet' });
        });
        newNodes.push({ id: `vpc-${Date.now()}`, name: 'VPC-Main', type: 'VPC', ip: '10.0.0.0/16', location: 'Cloud-Network' });
        
        saveNodes(newNodes);
    };

    // 2. Map from MgC Actuals (Loads into the Table)
    const generateFromMgC = () => {
        if (!activeProject?.mgcData) return alert('You must run the Live MgC Discovery first!');
        if (nodes.length > 0 && !window.confirm("This will overwrite your current architecture table with the Live MgC Discovery data. Proceed?")) return;
        
        const newNodes = [];
        for(let i=0; i<discoveredServers; i++) {
            newNodes.push({ id: `act-${Date.now()}-${i}`, name: `Actual-Server-${i+1}`, type: 'ECS', ip: `10.0.1.${10+i}`, location: 'Compute-Subnet' });
        }
        newNodes.push({ id: `vpc-${Date.now()}`, name: 'VPC-Main', type: 'VPC', ip: '10.0.0.0/16', location: 'Cloud-Network' });
        
        saveNodes(newNodes);
    };

    // 3. Table Interaction Handlers
    const handleUpdateNode = (id, field, value) => {
        const updated = nodes.map(n => n.id === id ? { ...n, [field]: value } : n);
        saveNodes(updated);
    };

    const handleAddNode = () => {
        const newId = `manual-${Date.now()}`;
        const updated = [...nodes, { id: newId, name: 'New Resource', type: 'ECS', ip: '0.0.0.0/32', location: 'New-Subnet' }];
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
        const grps = { Edge: [], External: [], Subnets: {}, Global: [] };
        nodes.forEach(n => {
            const loc = String(n.location || "");
            if (loc === 'Edge') grps.Edge.push(n); 
            else if (loc.includes('External') || loc.includes('On-Premise')) grps.External.push(n);
            else if (loc === 'PaaS' || loc === 'Storage' || loc === 'Management' || loc === 'Serverless' || loc === 'Global') grps.Global.push(n); 
            else if (loc === 'Cloud-Network') { /* Ignore Base VPC for subnets */ }
            else { if (!grps.Subnets[loc]) grps.Subnets[loc] = []; grps.Subnets[loc].push(n); }
        });
        return grps;
    }, [nodes]);

    const getIcon = (type) => {
        const t = String(type || "").toLowerCase();
        if (t==='ecs' || t==='vm') return 'fa-server text-blue-600'; 
        if (t==='rds' || t==='gaussdb' || t==='db') return 'fa-database text-rose-600';
        if (t==='vpc') return 'fa-cloud text-indigo-600';
        if (t==='elb' || t==='loadbalancer') return 'fa-sitemap text-blue-500';
        return 'fa-microchip text-slate-500';
    };

    return (
        <div className={isMaximized ? "fixed inset-0 z-50 bg-[#f8fafc] p-4 md:p-8 flex flex-col overflow-auto animate-fade-in" : "animate-fade-in"}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[750px] max-h-[900px]">
                <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-200 pb-4">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-sitemap text-indigo-500"></i> Infrastructure Scope Manager</h3>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Manage the Approved Delivery Scope</p>
                    </div>
                    <button onClick={()=>setIsMaximized(!isMaximized)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black shadow-sm"><i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} mr-2`}></i>{isMaximized ? 'Restore' : 'Full Screen'}</button>
                </div>
                
                <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
                    
                    {/* LEFT SIDE: The Interactive Table (Replaces CSV/JSON) */}
                    <div className="xl:w-1/2 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <div className="flex gap-2">
                                <button onClick={generateFromBlueprint} className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-colors"><i className="fas fa-file-invoice mr-1"></i> Load Quoted Scope</button>
                                <button onClick={generateFromMgC} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-colors"><i className="fas fa-search mr-1"></i> Load MgC Scope</button>
                            </div>
                            <button onClick={handleAddNode} className="py-2 px-4 bg-white border-2 border-slate-300 hover:border-indigo-400 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm transition-colors"><i className="fas fa-plus mr-1"></i> Add Resource</button>
                        </div>
                        
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-slate-200 text-[10px] uppercase text-slate-600 sticky top-0 z-10 shadow-sm border-b-2 border-slate-300">
                                    <tr>
                                        <th className="p-3 w-40 font-black">Resource Name</th>
                                        <th className="p-3 w-24 font-black">Type</th>
                                        <th className="p-3 w-32 font-black">IP / CIDR</th>
                                        <th className="p-3 w-40 font-black">Target Zone</th>
                                        <th className="p-3 w-12 text-center font-black">Act</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-xs bg-white">
                                    {nodes.length === 0 ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-bold border-2 border-dashed bg-slate-50">No infrastructure mapped. Load data from the buttons above.</td></tr>
                                    ) : (
                                        nodes.map(n => (
                                            <tr key={n.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-3 font-bold text-slate-800"><EditableCell value={n.name} onSave={v=>handleUpdateNode(n.id, 'name', v)} /></td>
                                                <td className="p-3 font-bold text-indigo-700"><EditableCell type="select" placeholder="ECS" value={n.type} onSave={v=>handleUpdateNode(n.id, 'type', v)} /></td>
                                                <td className="p-3 font-mono text-slate-600 font-bold"><EditableCell value={n.ip} onSave={v=>handleUpdateNode(n.id, 'ip', v)} /></td>
                                                <td className="p-3 font-bold text-slate-600"><EditableCell value={n.location} onSave={v=>handleUpdateNode(n.id, 'location', v)} /></td>
                                                <td className="p-3 text-center">
                                                    <button onClick={()=>handleDeleteNode(n.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-trash-alt"></i></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200">
                            <button onClick={handleAutoGenerateWBS} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95 border border-indigo-500">✨ Generate WBS & Advance to Planning</button>
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
                                
                                {/* Target Cloud VPC */}
                                <div className="w-full border-4 border-blue-200 bg-blue-50/30 rounded-2xl p-8 relative min-h-[300px]">
                                    <span className="absolute -top-4 left-6 bg-blue-100 border border-blue-300 px-4 py-1.5 rounded-full text-sm font-black text-blue-800 uppercase tracking-widest shadow-sm"><i className="fas fa-cloud mr-2"></i> Target Infrastructure</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                                        {Object.entries(groups.Subnets).map(([subName, subNodes]) => (
                                            <div key={subName} className="border-2 border-dashed border-blue-300 bg-white/80 p-5 rounded-xl relative pt-8 shadow-sm">
                                                <span className="absolute top-2 left-3 text-[10px] font-black text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{subName}</span>
                                                <div className="space-y-3">
                                                    {subNodes.map(n => (
                                                        <div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 transition-colors">
                                                            <div className="font-bold text-xs truncate" title={n.name}><i className={`fas ${getIcon(n.type)} mr-2 opacity-80`}></i>{n.name}</div>
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
                                    <div className="w-full border-2 border-emerald-200 bg-emerald-50/50 rounded-xl relative pt-6 p-4">
                                        <span className="absolute -top-3 left-3 bg-emerald-100 px-3 py-1 rounded-full text-[10px] font-black text-emerald-800 uppercase tracking-wider border border-emerald-200">PaaS / Global Services</span>
                                        <div className="flex flex-wrap gap-4">
                                            {groups.Global.map(n => (
                                                <div key={n.id} className="bg-white p-4 w-32 rounded-lg border border-slate-200 shadow-sm text-center hover:border-emerald-300 transition-colors">
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
