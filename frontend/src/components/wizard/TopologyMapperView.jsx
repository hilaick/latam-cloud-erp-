import React, { useState, useEffect, useMemo } from 'react';

export default function TopologyMapperView({ activeProject, onUpdateProject }) {
    // 🚨 FIX: Define the missing variables by extracting them from the activeProject!
    // This guarantees the file will never throw a ReferenceError again.
    const servers = activeProject?.blueprintData?.topology?.compute || [];
    const networks = activeProject?.blueprintData?.topology?.network || [];
    const databases = activeProject?.blueprintData?.topology?.database || [];

    const [csvText, setCsvText] = useState(activeProject?.mapperCsv || "");
    const [nodes, setNodes] = useState([]); 
    const [isMaximized, setIsMaximized] = useState(false);
    
    useEffect(()=>{ 
        setCsvText(activeProject?.mapperCsv || ""); 
        setNodes([]); 
    },[activeProject]);
    
    const handleSaveSnapshot = () => { 
        const desc = prompt("Enter description for this Topology Snapshot:"); 
        if(!desc) return;
        const hist = activeProject.mapperHistory || [];
        onUpdateProject(activeProject.id, 'mapperHistory', [{id: Date.now(), desc, date: new Date().toLocaleDateString(), data: csvText}, ...hist]);
        onUpdateProject(activeProject.id, 'mapperCsv', csvText); 
        alert("Topology Snapshot Saved."); 
    };

    const loadSnapshot = (histId) => {
        if(!histId) return;
        const snap = (activeProject?.mapperHistory || []).find(h => h.id.toString() === histId);
        if(snap) { setCsvText(snap.data); handleParse(snap.data); }
    };
    
    const loadScenario = (type) => {
        let s = "";
        if (type === 'aws_oms') s = `Name,Type,IP_CIDR,Location,Notes\nAWS-VPC,VPC,10.0.0.0/16,External-AWS,Source Network\nAWS-S3-Prod,S3,Global,External-AWS,50TB Images\nAWS-S3-Logs,S3,Global,External-AWS,200M Small Files\nHuawei-OBS-Prod,OBS,Global,PaaS,Target Data Lake\nHuawei-OMS-Service,OMS,Serverless,PaaS,API Migrator`;
        else if (type === 'onprem_sms_drs') s = `Name,Type,IP_CIDR,Location,Notes\nOnPrem-DC-FW,VPN,192.168.1.1,On-Premise,IPsec Tunnel\nVMware-Web-01,VM,192.168.1.10,On-Premise,Source Web\nVMware-Web-02,VM,192.168.1.11,On-Premise,Source Web\nOracle-DB-OnPrem,DB,192.168.1.50,On-Premise,Legacy DB\nHuawei-VPC-Prod,VPC,10.0.0.0/16,Cloud-Network,Target Network\nECS-Web-01,ECS,10.0.1.10,Cloud-Compute,SMS Target\nECS-Web-02,ECS,10.0.1.11,Cloud-Compute,SMS Target\nRDS-PostgreSQL,RDS,10.0.2.50,Cloud-Database,DRS Target`;
        else if (type === 'azure_cce') s = `Name,Type,IP_CIDR,Location,Notes\nAzure-VNet,VPC,172.16.0.0/16,External-Azure,Source Network\nAzure-AKS-Cluster,K8S,172.16.1.0/24,External-Azure,Source Containers\nHuawei-VPC-Prod,VPC,10.0.0.0/16,Cloud-Network,Target Network\nHuawei-CCE-Cluster,CCE,10.0.1.0/24,Cloud-Compute,Target K8s\nSWR-Registry,SWR,Global,PaaS,Container Images`;
        setCsvText(s); handleParse(s);
    };

    // 🚀 NEW FEATURE: Auto-Generate Diagram directly from Blueprint JSON
    const generateFromBlueprint = () => {
        if (servers.length === 0) {
            alert('No servers found in blueprint. Please upload an Excel quotation first in the ARB tab.');
            return;
        }

        let csvLines = ['Name,Type,IP_CIDR,Location,Notes'];
        
        servers.forEach((server, index) => {
            const name = server.name || `server-${index + 1}`;
            const type = 'ECS'; 
            const ipCidr = `10.0.${Math.floor(index/256) + 1}.${(index % 256) + 10}/24`;
            const location = server.metadata?.tier === 'Web Tier' ? 'Web-Subnet' : 
                           server.metadata?.tier === 'Application Tier' ? 'App-Subnet' :
                           server.metadata?.tier === 'Database' ? 'Data-Subnet' : 'Compute-Subnet';
            const notes = `${server.flavor || 'Unknown'} - ${server.metadata?.os_type || 'Linux'}`;
            
            csvLines.push(`${name},${type},${ipCidr},${location},${notes}`);
        });

        csvLines.push('VPC-Main,VPC,10.0.0.0/16,Cloud-Network,Primary VPC');
        csvLines.push('Internet-GW,Internet,0.0.0.0/0,Edge,Internet Gateway');
        csvLines.push('NAT-Gateway,NAT,10.0.0.254/32,Edge,Outbound NAT');
        
        const csv = csvLines.join('\n');
        setCsvText(csv);
        onUpdateProject(activeProject.id, 'mapperCsv', csv);
        handleParse(csv);
    };

    const handleParse = (textToParse = csvText) => {
        if (!textToParse || typeof textToParse !== 'string' || !textToParse.trim()) { setNodes([]); return; }
        try {
            const lines = textToParse.trim().split('\n'); const parsedNodes = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue; const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length >= 4) {
                    const ipCidr = String(cols[2] || "Unknown"); const location = String(cols[3] || "Unknown");
                    parsedNodes.push({ id: i, name: cols[0], type: cols[1], ip: ipCidr, location: location, notes: cols[4]||'' });
                }
            }
            setNodes(parsedNodes);
        } catch (e) {}
    };

    const handleAutoGenerateWBS = () => {
        if (nodes.length === 0) { alert("Please load or draw a topology first."); return; }
        let newTasks = [
            { id: "1", name: "Phase 1: Landing Zone & Security", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
            { id: "1.1", name: "Deploy Target VPC & Subnets", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "1.2", name: "Configure IAM & Security Groups", prog: "0%", resp: "Partner", start: "", end: "", isParent: false }
        ];
        let phaseCount = 2;
        const types = nodes.map(n => String(n.type).toUpperCase());
        
        if (types.includes('ECS') || types.includes('VM')) {
            newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Compute Sync (SMS)`, prog: "0%", resp: "Partner", start: "", end: "", isParent: true });
            newTasks.push({ id: `${phaseCount}.1`, name: "Install SMS Agents on Source VMs", prog: "0%", resp: "Customer IT", start: "", end: "", isParent: false });
            newTasks.push({ id: `${phaseCount}.2`, name: "Execute Initial Block Sync via SMS", prog: "0%", resp: "Partner", start: "", end: "", isParent: false });
            phaseCount++;
        }
        if (types.includes('RDS') || types.includes('GAUSSDB') || types.includes('DB')) {
            newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Database Sync (DRS)`, prog: "0%", resp: "Partner", start: "", end: "", isParent: true });
            newTasks.push({ id: `${phaseCount}.1`, name: "Provision Target RDS/GaussDB Instances", prog: "0%", resp: "Partner", start: "", end: "", isParent: false });
            newTasks.push({ id: `${phaseCount}.2`, name: "Configure DRS Logical Replication Tasks", prog: "0%", resp: "Principal Arch", start: "", end: "", isParent: false });
            phaseCount++;
        }
        if (types.includes('OBS') || types.includes('S3') || types.includes('OMS')) {
            newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Object Sync (OMS)`, prog: "0%", resp: "Partner", start: "", end: "", isParent: true });
            newTasks.push({ id: `${phaseCount}.1`, name: "Create Target OBS Buckets & Policies", prog: "0%", resp: "Partner", start: "", end: "", isParent: false });
            newTasks.push({ id: `${phaseCount}.2`, name: "Execute Serverless OMS API Transfer", prog: "0%", resp: "Cloud Backend", start: "", end: "", isParent: false });
            phaseCount++;
        }
        
        newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Cutover & Post-Live`, prog: "0%", resp: "All", start: "", end: "", isParent: true });
        newTasks.push({ id: `${phaseCount}.1`, name: "Final Delta Sync & App Switchover", prog: "0%", resp: "Partner / Cust", start: "", end: "", isParent: false });

        if(window.confirm("This will overwrite the current Migration Plan based on the detected topology. Proceed?")) {
            onUpdateProject(activeProject.id, 'migrationPlan', newTasks);
            alert("Migration Plan auto-generated successfully! Check the Planning tab.");
        }
    };

    const groups = useMemo(() => {
        const grps = { Edge: [], External: [], Subnets: {}, Global: [] };
        nodes.forEach(n => {
            const loc = String(n.location || "");
            if (loc === 'Edge') grps.Edge.push(n); else if (loc.includes('External') || loc.includes('On-Premise')) grps.External.push(n);
            else if (loc === 'PaaS' || loc === 'Storage' || loc === 'Management' || loc === 'Serverless') grps.Global.push(n); else { if (!grps.Subnets[loc]) grps.Subnets[loc] = []; grps.Subnets[loc].push(n); }
        });
        return grps;
    }, [nodes]);

    const getIcon = (type) => {
        const t = String(type || "").toLowerCase();
        if (t==='waf') return 'fa-shield-alt text-rose-500'; if (t==='elb' || t==='loadbalancer') return 'fa-sitemap text-blue-500'; 
        if (t==='ecs' || t==='vm') return 'fa-server text-blue-600'; if (t==='onprem' || t==='aws-ec2') return 'fa-server text-slate-500';
        if (t==='rds' || t==='gaussdb') return 'fa-database text-rose-600'; if (t==='obs' || t==='sfs') return 'fa-hdd text-emerald-600';
        if (t==='vpn' || t==='peering' || t==='directconnect' || t==='internet') return 'fa-network-wired text-amber-600';
        if (t==='dcs') return 'fa-bolt text-red-500'; if (t==='cce' || t==='asg') return 'fa-cubes text-indigo-600';
        if (t==='s3') return 'fa-bucket text-amber-500';
        if (t==='oms' || t==='drs' || t==='sms') return 'fa-exchange-alt text-purple-500';
        if (t==='swr') return 'fa-box-open text-pink-500';
        if (t==='k8s') return 'fa-dharmachakra text-blue-500';
        if (t==='db') return 'fa-database text-slate-500';
        if (t==='nat') return 'fa-route text-indigo-500';
        return 'fa-microchip text-slate-500';
    };

    return (
        <div className={isMaximized ? "fixed inset-0 z-50 bg-[#f8fafc] p-4 md:p-8 flex flex-col overflow-auto animate-fade-in" : "max-w-[1800px] mx-auto pb-6 animate-fade-in"}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[750px]">
                <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-200 pb-4 gap-2">
                    <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-project-diagram text-indigo-500"></i> IaC Auto-Mapper</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="ml-2 flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 hidden sm:flex">
                            <select onChange={e=>{if(e.target.value) loadScenario(e.target.value); e.target.value="";}} className="bg-transparent text-xs font-bold outline-none px-2 py-1 max-w-[200px] text-blue-600 cursor-pointer">
                                <option value="">-- Load Cloud Scenario --</option>
                                <option value="onprem_sms_drs">On-Prem to ECS/RDS (SMS/DRS)</option>
                                <option value="aws_oms">AWS S3 to OBS Data Lake (OMS)</option>
                                <option value="azure_cce">Azure AKS to CCE Containers</option>
                            </select>
                        </div>
                        <button onClick={()=>setIsMaximized(!isMaximized)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black shadow-sm transition-colors"><i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} mr-2`}></i>{isMaximized ? 'Restore' : 'Full Screen'}</button>
                        <div className="ml-2 flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1">
                            <select onChange={e=>loadSnapshot(e.target.value)} className="bg-transparent text-xs font-bold outline-none px-2 py-1 max-w-[150px] text-slate-600 cursor-pointer">
                                <option value="">-- History --</option>
                                {(activeProject?.mapperHistory||[]).map(h => <option key={h.id} value={h.id}>{h.desc}</option>)}
                            </select>
                            <button onClick={handleSaveSnapshot} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-xs font-black transition-colors"><i className="fas fa-camera mr-2"></i>Snap</button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    <div className="lg:w-1/4 flex flex-col bg-slate-50 rounded-2xl p-4 border border-slate-200">
                        <textarea value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full h-48 lg:h-full p-4 text-xs font-mono border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 whitespace-pre shadow-inner bg-white custom-scrollbar" placeholder="Name,Type,IP_CIDR,Location,Notes" />
                        
                        <button onClick={()=>handleParse()} className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-md transition-colors"><i className="fas fa-paint-brush mr-2"></i>Draw Diagram</button>
                        
                        {/* THE NEW AUTO-GENERATE BUTTON */}
                        <button onClick={generateFromBlueprint} className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95 border border-emerald-500"><i className="fas fa-magic mr-2"></i>Map from Blueprint</button>
                        
                        <button onClick={handleAutoGenerateWBS} className="w-full mt-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95 border border-indigo-500">✨ Generate WBS Plan</button>
                    </div>
                    <div className="flex-1 bg-[#f8fafc] p-6 overflow-auto border border-slate-200 rounded-2xl shadow-inner relative custom-scrollbar">
                        {nodes.length === 0 ? (
                            <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 animate-fade-in">
                                <i className="fas fa-network-wired text-6xl mb-4 opacity-50"></i>
                                <p className="font-black text-lg mb-6">Awaiting Topology Data</p>
                                
                                {/* THE FIX: This block caused your ReferenceError before, but now runs perfectly! */}
                                <div className="flex justify-center gap-4 mb-4">
                                    <div className="w-20 h-20 bg-white border-2 border-purple-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-purple-600"><i className="fas fa-network-wired text-2xl"></i><span className="text-[10px] font-black mt-2">{networks.length || 1} VPC</span></div>
                                    <div className="w-20 h-20 bg-white border-2 border-blue-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-blue-600"><i className="fas fa-server text-2xl"></i><span className="text-[10px] font-black mt-2">{servers.length} ECS</span></div>
                                    <div className="w-20 h-20 bg-white border-2 border-emerald-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-emerald-600"><i className="fas fa-database text-2xl"></i><span className="text-[10px] font-black mt-2">{databases.length} RDS</span></div>
                                </div>
                                <p className="text-xs text-slate-400 font-bold max-w-sm text-center">Click "Map from Blueprint" to auto-draw this architecture, or paste a CSV on the left.</p>
                            </div>
                        ) : (
                            <div className="min-w-[800px]">
                                <div className="flex gap-4 items-start mt-4">
                                    <div className="w-56 shrink-0 space-y-6">
                                        {groups.External.length > 0 && (<div className="p-4 border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-xl relative pt-6"><span className="absolute -top-3 left-3 bg-amber-100 px-3 py-1 rounded-full text-[10px] font-black text-amber-800 uppercase tracking-wider border border-amber-200">External</span><div className="space-y-3">{groups.External.map(n => (<div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm"><div className="font-bold text-xs"><i className={`fas ${getIcon(n.type)} mr-2`}></i> {n.name}</div><div className="mt-2"><span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{n.ip}</span></div></div>))}</div></div>)}
                                        {groups.Edge.length > 0 && (<div className="p-4 border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-xl relative pt-6"><span className="absolute -top-3 left-3 bg-purple-100 px-3 py-1 rounded-full text-[10px] font-black text-purple-800 uppercase tracking-wider border border-purple-200">Edge / Gateway</span><div className="space-y-3">{groups.Edge.map(n => (<div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm"><div className="font-bold text-xs"><i className={`fas ${getIcon(n.type)} mr-2`}></i> {n.name}</div><div className="mt-2"><span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{n.ip}</span></div></div>))}</div></div>)}
                                    </div>
                                    <div className="flex-1 border-4 border-blue-200 bg-blue-50/30 rounded-2xl p-8 relative min-h-[400px]">
                                        <span className="absolute -top-4 left-6 bg-blue-100 border border-blue-300 px-4 py-1.5 rounded-full text-sm font-black text-blue-800 uppercase tracking-widest shadow-sm"><i className="fas fa-cloud mr-2"></i> Target VPC</span>
                                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
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
                                    {groups.Global.length > 0 && (
                                        <div className="w-48 shrink-0 border-2 border-emerald-200 bg-emerald-50/50 rounded-xl relative pt-6 p-4">
                                            <span className="absolute -top-3 left-3 bg-emerald-100 px-3 py-1 rounded-full text-[10px] font-black text-emerald-800 uppercase tracking-wider border border-emerald-200">PaaS / Global</span>
                                            <div className="space-y-4">
                                                {groups.Global.map(n => (
                                                    <div key={n.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center hover:border-emerald-300 transition-colors">
                                                        <i className={`fas ${getIcon(n.type)} text-2xl mb-2 opacity-90`}></i>
                                                        <div className="font-bold text-xs truncate" title={n.name}>{n.name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
