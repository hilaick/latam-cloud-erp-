import React, { useState, useEffect, useMemo } from 'react';

export default function TopologyMapperView({ activeProject, onUpdateProject, onPromote }) {
    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const networks = activeProject?.blueprintData?.topology?.network || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];

    const discoveredServers = activeProject?.mgcData?.compute || servers.length;

    const [csvText, setCsvText] = useState(activeProject?.mapperCsv || "");
    const [nodes, setNodes] = useState([]); 
    const [isMaximized, setIsMaximized] = useState(false);
    
    useEffect(()=>{ 
        setCsvText(activeProject?.mapperCsv || ""); 
        handleParse(activeProject?.mapperCsv || "");
    },[activeProject]);

    // 1. Map from SA Quotation
    const generateFromBlueprint = () => {
        if (servers.length === 0) return alert('No blueprint data found.');
        let csvLines = ['Name,Type,IP_CIDR,Location,Notes'];
        servers.forEach((server, i) => csvLines.push(`Quoted-Server-${i+1},ECS,10.0.1.${10+i},Compute-Subnet,From Quotation`));
        csvLines.push('VPC-Main,VPC,10.0.0.0/16,Cloud-Network,Primary VPC');
        const csv = csvLines.join('\n');
        setCsvText(csv); onUpdateProject(activeProject.id, 'mapperCsv', csv); handleParse(csv);
    };

    // 2. Map from MgC Actuals
    const generateFromMgC = () => {
        if (!activeProject?.mgcData) return alert('You must run the Live MgC Discovery first!');
        let csvLines = ['Name,Type,IP_CIDR,Location,Notes'];
        for(let i=0; i<discoveredServers; i++) csvLines.push(`Actual-Server-${i+1},ECS,10.0.1.${10+i},Compute-Subnet,Discovered via MgC API`);
        csvLines.push('VPC-Main,VPC,10.0.0.0/16,Cloud-Network,Primary VPC');
        const csv = csvLines.join('\n');
        setCsvText(csv); onUpdateProject(activeProject.id, 'mapperCsv', csv); handleParse(csv);
    };

    const handleParse = (textToParse = csvText) => {
        if (!textToParse || typeof textToParse !== 'string' || !textToParse.trim()) { setNodes([]); return; }
        try {
            const lines = textToParse.trim().split('\n'); const parsedNodes = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue; const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length >= 4) {
                    parsedNodes.push({ id: i, name: cols[0], type: cols[1], ip: cols[2], location: cols[3], notes: cols[4]||'' });
                }
            }
            setNodes(parsedNodes);
        } catch (e) {}
    };

    const handleAutoGenerateWBS = () => {
        if (nodes.length === 0) { alert("Please draw a topology first."); return; }
        
        if(window.confirm("This will generate a new WBS Task List based on the visual diagram. Once approved, the project will automatically advance to Step 3: Planning. Proceed?")) {
            
            // Generate the WBS Tasks
            let newTasks = [
                { id: "1", name: "Phase 1: Landing Zone & Security", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
                { id: "1.1", name: "Deploy Target VPC & Subnets", prog: "0%", resp: "Partner", start: "", end: "", isParent: false }
            ];
            let p = 2;
            const types = nodes.map(n => String(n.type).toUpperCase());
            if (types.includes('ECS')) { newTasks.push({ id: `${p}`, name: `Phase ${p}: Compute Sync`, prog: "0%", resp: "Partner", isParent: true }); newTasks.push({ id: `${p}.1`, name: "Install SMS Agents", prog: "0%", resp: "Customer IT", isParent: false }); p++; }
            if (types.includes('RDS')) { newTasks.push({ id: `${p}`, name: `Phase ${p}: Database Sync`, prog: "0%", resp: "Partner", isParent: true }); newTasks.push({ id: `${p}.1`, name: "Configure DRS", prog: "0%", resp: "Partner", isParent: false }); p++; }
            
            newTasks.push({ id: `${p}`, name: `Phase ${p}: Cutover`, prog: "0%", resp: "All", isParent: true });
            newTasks.push({ id: `${p}.1`, name: "DNS Switch", prog: "0%", resp: "Customer", isParent: false });

            // Save the Plan
            onUpdateProject(activeProject.id, 'migrationPlan', newTasks);
            
            // AUTOMATICALLY PROMOTE TO STEP 3
            if(onPromote) onPromote();
        }
    };

    const getIcon = (type) => {
        const t = String(type || "").toLowerCase();
        if (t==='ecs' || t==='vm') return 'fa-server text-blue-600'; 
        if (t==='rds' || t==='gaussdb') return 'fa-database text-rose-600';
        if (t==='vpc') return 'fa-cloud text-indigo-600';
        return 'fa-microchip text-slate-500';
    };

    return (
        <div className={isMaximized ? "fixed inset-0 z-50 bg-[#f8fafc] p-4 md:p-8 flex flex-col overflow-auto animate-fade-in" : "animate-fade-in"}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[750px]">
                <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-200 pb-4">
                    <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-project-diagram text-indigo-500"></i> IaC Auto-Mapper</h3>
                    <button onClick={()=>setIsMaximized(!isMaximized)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black shadow-sm"><i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} mr-2`}></i>{isMaximized ? 'Restore' : 'Full Screen'}</button>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    <div className="lg:w-1/4 flex flex-col bg-slate-50 rounded-2xl p-4 border border-slate-200">
                        <textarea value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full h-48 lg:h-full p-4 text-xs font-mono border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 whitespace-pre shadow-inner bg-white custom-scrollbar" placeholder="Name,Type,IP_CIDR,Location,Notes" />
                        
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button onClick={generateFromBlueprint} className="py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-colors"><i className="fas fa-file-invoice mr-1"></i> Map Quote</button>
                            <button onClick={generateFromMgC} className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-colors"><i className="fas fa-search mr-1"></i> Map MgC</button>
                        </div>
                        
                        <button onClick={()=>handleParse()} className="w-full mt-3 py-3 bg-slate-300 hover:bg-slate-400 text-slate-800 font-black text-sm uppercase tracking-widest rounded-xl shadow-sm transition-colors border border-slate-400"><i className="fas fa-paint-brush mr-2"></i> Draw Diagram</button>
                        <button onClick={handleAutoGenerateWBS} className="w-full mt-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95 border border-indigo-500">✨ Generate WBS & Advance</button>
                    </div>

                    <div className="flex-1 bg-[#f8fafc] p-6 overflow-auto border border-slate-200 rounded-2xl shadow-inner relative custom-scrollbar">
                        {nodes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <i className="fas fa-network-wired text-6xl mb-4 opacity-50"></i>
                                <p className="font-black text-lg">Awaiting Topology Data</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-4 items-start">
                                {nodes.map(n => (
                                    <div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm w-48">
                                        <div className="font-bold text-xs truncate"><i className={`fas ${getIcon(n.type)} mr-2`}></i>{n.name}</div>
                                        <div className="text-[10px] font-mono text-slate-500 mt-1">{n.ip} ({n.location})</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
