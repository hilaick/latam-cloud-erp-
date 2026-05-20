function GlobalDashboard({ projects, onNavigateToProject }) {
  const { useState, useEffect, useMemo, useRef } = React;
    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);
    const totalMRR = activeProjects.reduce((s, p) => s + (Number(p.mrr) || 0), 0);
    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);

    const [showLifecycle, setShowLifecycle] = useState(true);
    const [selectedStage, setSelectedStage] = useState('all');

    const stages = [
        { id: '1_arb', name: 'ARB Intake', color: 'border-purple-500 text-purple-600 bg-purple-50', icon: 'fa-door-open', action: 'Approve Architecture SOW' },
        { id: '2_architecture', name: 'Architecture', color: 'border-blue-500 text-blue-600 bg-blue-50', icon: 'fa-project-diagram', action: 'Calculate Physics Engine' },
        { id: '3_planning', name: 'Planning', color: 'border-emerald-500 text-emerald-600 bg-emerald-50', icon: 'fa-tasks', action: 'Lock FinOps & WBS' },
        { id: '4_execution', name: 'Execution', color: 'border-amber-500 text-amber-600 bg-amber-50', icon: 'fa-rocket', action: 'Monitor Sync & TAM Tickets' },
        { id: '5_postlive', name: 'Post-Live', color: 'border-slate-500 text-slate-600 bg-slate-50', icon: 'fa-award', action: 'Execute WAR Sign-Off' }
    ];

    const filteredProjects = selectedStage === 'all' ? activeProjects : activeProjects.filter(p => p.lifecycleState === selectedStage);

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6 pb-12">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-700">
                <div><h2 className="text-3xl font-black tracking-tight mb-2">Executive Overview</h2><p className="text-sm text-slate-400 max-w-xl">Regional aggregate of delivery performance and financial forecasting.</p></div>
                <div className="flex gap-4 items-center">
                    <button onClick={()=>setShowLifecycle(!showLifecycle)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showLifecycle ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}><i className="fas fa-project-diagram mr-2"></i> Toggle Lifecycle Flow</button>
                    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 px-8 py-4 rounded-xl shadow-inner text-center"><div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Active Pipeline MRR</div><div className="text-3xl font-black text-emerald-400">{fm(totalMRR)}</div></div>
                </div>
            </div>

            {showLifecycle && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4"><h3 className="font-black text-lg text-slate-800"><i className="fas fa-route text-blue-500 mr-2"></i> Standard Delivery Methodology</h3>{selectedStage !== 'all' && <button onClick={()=>setSelectedStage('all')} className="text-xs font-bold text-slate-500 hover:text-blue-600"><i className="fas fa-times-circle mr-1"></i> Clear Filter</button>}</div>
                    <div className="flex flex-col md:flex-row justify-between items-center relative gap-4 md:gap-0">
                        <div className="hidden md:block absolute top-1/2 left-10 right-10 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
                        {stages.map((stage) => {
                            const stageProjects = activeProjects.filter(p => p.lifecycleState === stage.id);
                            const stageMRR = stageProjects.reduce((s, p) => s + (Number(p.mrr) || 0), 0);
                            const isSelected = selectedStage === stage.id;
                            return (
                                <div key={stage.id} onClick={()=>setSelectedStage(stage.id)} className={`relative z-10 flex flex-col items-center cursor-pointer group transition-transform ${isSelected ? 'scale-110' : 'hover:scale-105'}`}>
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-lg bg-white transition-colors ${isSelected ? stage.color : 'border-slate-200 text-slate-400 group-hover:border-slate-400'}`}><i className={`fas ${stage.icon} text-2xl`}></i></div>
                                    <div className="text-center mt-4"><div className={`font-black text-sm uppercase tracking-widest ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{stage.name}</div><div className="flex gap-2 justify-center mt-1.5"><span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600">{stageProjects.length} Proj</span><span className="text-[10px] font-black bg-emerald-50 px-2 py-0.5 rounded text-emerald-700">{fm(stageMRR)}</span></div></div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-10 pt-6 border-t border-slate-100 bg-slate-50 p-6 rounded-xl">
                        <h4 className="font-black text-sm text-slate-800 mb-4 uppercase tracking-widest">{selectedStage === 'all' ? 'All Active Projects' : `Projects currently in: ${stages.find(s=>s.id===selectedStage)?.name}`}</h4>
                        {filteredProjects.length === 0 ? (<div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold">No projects currently in this stage.</div>) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredProjects.map(p => {
                                    const stg = stages.find(s => s.id === p.lifecycleState) || stages[0];
                                    return (
                                        <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2"><div className="font-black text-sm text-slate-800 truncate pr-2">{p.name}</div><div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{fm(p.mrr)}</div></div>
                                            <div className="text-[10px] text-slate-500 font-bold mb-3 flex items-center gap-2"><i className="fas fa-user-tie"></i> {p.sa} | <i className="fas fa-globe-americas ml-1"></i> {p.country}</div>
                                            <div className={`p-3 rounded-lg border bg-opacity-30 ${stg.color.split(' ')[0]} ${stg.color.split(' ')[2]}`}><div className="text-[9px] uppercase tracking-widest font-bold mb-1 opacity-70">Next Automated Action</div><div className="text-xs font-black flex items-center gap-2 cursor-pointer hover:underline" onClick={() => onNavigateToProject(p.id)}><i className="fas fa-play-circle"></i> {stg.action}</div></div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-5 flex items-center"><i className="fas fa-shield-halved text-rose-500 mr-3 text-xl"></i> Executive Escalations</h3>
                    <div className="space-y-4">
                        {activeProjects.filter(p=>p.health==='Red').map(p => (
                            <div key={p.id} className="p-5 bg-rose-50 border border-rose-200 rounded-xl flex justify-between items-center shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateToProject(p.id)}>
                                <div><div className="font-black text-base text-rose-900">{p.name}</div><div className="text-xs text-rose-700 mt-1 font-medium">{p.blocker}</div></div>
                                <div className="font-black text-xl text-rose-800 bg-white px-3 py-1 rounded-lg border border-rose-100 shadow-sm">{fm(p.mrr)}</div>
                            </div>
                        ))}
                        {activeProjects.filter(p=>p.health==='Red').length===0 && <div className="text-slate-400 text-sm p-8 text-center border-2 border-dashed rounded-xl font-bold bg-slate-50">All regions operating within SLA.</div>}
                    </div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-5 flex items-center"><i className="fas fa-rocket text-emerald-500 mr-3 text-xl"></i> Imminent Go-Lives (30 Days)</h3>
                    <div className="space-y-4">
                        {activeProjects.filter(p=>p.date && p.date !== 'TBD').slice(0,5).map(p => (
                            <div key={p.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center shadow-sm cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => onNavigateToProject(p.id)}>
                                <div><div className="font-black text-base text-slate-800">{p.name}</div><div className="text-xs text-slate-500 mt-1 font-bold">Lead: {p.sa}</div></div>
                                <div className="font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-lg text-sm shadow-sm">{formatShortDate(p.date)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function GlobalRadar({ projects, onUpdateProject, onAddProject }) {
    const { useState } = React;
    const waitingProjects = (projects || []).filter(p => p && p.isWaiting);
    const [newLeadName, setNewLeadName] = useState(""); const [newLeadSA, setNewLeadSA] = useState(""); const [newLeadMRR, setNewLeadMRR] = useState("");
    const [expanded, setExpanded] = useState({ prospect: true, sizing: true, ready: true });

    const handleAddNewLead = () => { if(!newLeadName || !newLeadSA) return alert("Name and SA required."); onAddProject(generateDefaultProject(Date.now(), newLeadName, true, "1_arb", "Yellow", parseFloat(newLeadMRR)||0, "", "")); setNewLeadName(""); setNewLeadSA(""); setNewLeadMRR(""); };
    const cols = [{ id: 'prospect', title: 'Early Prospect', color: 'border-slate-300 bg-slate-50' }, { id: 'sizing', title: 'Discovery & Sizing', color: 'border-blue-300 bg-blue-50/50' }, { id: 'ready', title: 'Ready for ARB Intake', color: 'border-purple-300 bg-purple-50/50' }];

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-5">
                <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Customer Lead</label><input type="text" value={newLeadName} onChange={e=>setNewLeadName(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-sm w-64 bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="GlobalCorp Migration" /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sales Architect</label><input type="text" value={newLeadSA} onChange={e=>setNewLeadSA(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-sm w-48 bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="SA Name" /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Est. MRR ($)</label><input type="number" value={newLeadMRR} onChange={e=>setNewLeadMRR(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl text-sm w-32 bg-slate-50 outline-none focus:border-blue-500 font-bold" placeholder="0" /></div>
                <button onClick={handleAddNewLead} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-md text-xs transition-colors"><i className="fas fa-plus mr-2"></i> Add to Radar</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {cols.map(col => {
                    const colProjects = waitingProjects.filter(p => p.waitingStage === col.id || (col.id==='prospect' && !p.waitingStage));
                    return (
                        <div key={col.id} className={`rounded-2xl border-2 flex flex-col transition-all duration-300 overflow-hidden ${col.color} ${expanded[col.id] ? 'h-auto lg:h-[700px]' : 'h-16'}`}>
                            <div className="p-5 border-b-2 border-inherit font-black text-sm text-slate-800 uppercase tracking-widest bg-white/60 backdrop-blur-sm flex justify-between items-center cursor-pointer hover:bg-white/80 transition-colors" onClick={() => setExpanded(prev => ({...prev, [col.id]: !prev[col.id]}))}>
                                <div className="flex items-center">{col.title} <span className="ml-3 bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] shadow-sm">{colProjects.length}</span></div>
                                <i className={`fas fa-chevron-${expanded[col.id] ? 'up' : 'down'} text-slate-400 text-lg`}></i>
                            </div>
                            <div className={`p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar ${!expanded[col.id] ? 'hidden' : 'block'}`}>
                                {colProjects.map(p => (
                                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
                                        <div className="font-black text-base text-slate-800 leading-tight mb-3"><EditableCell value={p.name} onSave={v=>onUpdateProject(p.id,'name',v)} /></div>
                                        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center mb-4"><i className="fas fa-user-tie mr-2 opacity-50"></i> <EditableCell value={p.sa} onSave={v=>onUpdateProject(p.id,'sa',v)} /></div>
                                        <div className="text-sm font-black bg-emerald-50 text-emerald-800 w-max px-4 py-1.5 rounded-lg border border-emerald-200 flex items-center shadow-sm"><span className="mr-1 text-emerald-500">$</span><EditableCell value={p.mrr} type="number" onSave={v=>onUpdateProject(p.id,'mrr',v)} /></div>
                                        <div className="text-xs text-slate-600 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium"><EditableCell type="textarea" value={p.blocker} onSave={v=>onUpdateProject(p.id,'blocker',v)} /></div>
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {col.id === 'prospect' && <button onClick={()=>onUpdateProject(p.id, 'waitingStage', 'sizing')} className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors">Move <i className="fas fa-arrow-right ml-1"></i></button>}
                                            {col.id === 'sizing' && <button onClick={()=>onUpdateProject(p.id, 'waitingStage', 'ready')} className="text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-800 hover:bg-purple-200 px-4 py-2 rounded-lg transition-colors">Ready <i className="fas fa-arrow-right ml-1"></i></button>}
                                            {col.id === 'ready' && <button onClick={()=>{onUpdateProject(p.id, 'isWaiting', false); alert("Moved to Pipeline!");}} className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-md transition-colors">Start ARB <i className="fas fa-door-open ml-1"></i></button>}
                                        </div>
                                    </div>
                                ))}
                                {colProjects.length === 0 && <div className="text-center text-slate-400 text-xs font-bold py-12 border-2 border-dashed border-slate-300 rounded-2xl mx-2">No active leads</div>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function GlobalPipeline({ projects, onUpdateProject, onExport, onImport }) {
    const { useState } = React;
    const activeProjects = (projects || []).filter(p => p && !p.isWaiting);
    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num || 0);
    const [menuOpen, setMenuOpen] = useState(false);

    const getHealthBadge = (h) => { if(h==='Green') return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-200"><i className="fas fa-check-circle"></i> On Track</span>; if(h==='Red') return <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[9px] font-bold border border-rose-200"><i className="fas fa-times-circle"></i> Blocked</span>; return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px] font-bold border border-amber-200"><i className="fas fa-clock"></i> At Risk</span>; };
    const getStateLabel = (s) => { const map = {'1_arb':'1. ARB Intake', '2_architecture':'2. Architecture', '3_planning':'3. Planning', '4_execution':'4. Execution', '5_postlive':'5. Post-Live'}; return map[s] || s; };

    const handleSalesExport = () => {
        const headers = ["Customer", "Country", "Phase", "Go-Live Date", "Target MRR", "Overall Health", "Executive Summary"];
        const csvContent = [headers.join(","), ...activeProjects.map(p => { 
            let execSummary = p.health === 'Green' ? "On track for standard delivery." : p.health === 'Yellow' ? "Minor delays, actively managed." : `Critical blocker escalated: ${(p.blocker || '').replace(/"/g, '""')}`;
            let status = getStateLabel(p.lifecycleState).replace(/[0-9]. /g, '');
            return [`"${(p.name || '').replace(/"/g, '""')}"`, `"${(p.country || '').replace(/"/g, '""')}"`, `"${status}"`, `"${formatShortDate(p.date)}"`, `"${fm(p.mrr)}"`, `"${p.health || ''}"`, `"${execSummary}"`].join(","); 
        })].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Sales_Exec_Pipeline_${new Date().toISOString().split('T')[0]}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in max-w-[2000px] mx-auto pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap gap-4 justify-between items-center">
                <h3 className="font-black text-lg tracking-wide"><i className="fas fa-list-alt text-emerald-400 mr-2"></i> Master Execution Pipeline</h3>
                <div className="flex gap-3 items-center flex-wrap relative">
                    <button onClick={()=>setMenuOpen(!menuOpen)} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-md transition-colors border border-slate-600 focus:outline-none"><i className="fas fa-ellipsis-v"></i></button>
                    {menuOpen && (
                        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
                            <button onClick={()=>{onImport(); setMenuOpen(false);}} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"><i className="fas fa-upload text-emerald-500 w-5 text-center"></i> Import Pipeline Data</button>
                            <button onClick={()=>{onExport(); setMenuOpen(false);}} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"><i className="fas fa-code text-slate-500 w-5 text-center"></i> Export Technical Schema</button>
                            <button onClick={()=>{handleSalesExport(); setMenuOpen(false);}} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 bg-blue-50/50 transition-colors"><i className="fas fa-file-invoice text-blue-500 w-5 text-center"></i> Export Sales Summary</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto w-full bg-slate-50 flex-1">
                <table className="w-full min-w-[1600px] text-left border-collapse">
                <thead className="bg-slate-200 text-slate-600 text-[10px] uppercase border-b-2 border-slate-300 tracking-wider">
                    <tr><th className="px-6 py-4 w-[15%]">Customer / Phase</th><th className="px-4 py-4 w-[8%]">Country</th><th className="px-4 py-4 w-[10%]">Health & Prog</th><th className="px-4 py-4 w-[8%]">MRR / Comp</th><th className="px-4 py-4 w-[12%]">Timeline</th><th className="px-4 py-4 w-[10%]">SA / Partner</th><th className="px-4 py-4 w-[12%]">Scope</th><th className="px-6 py-4">Blockers / Notes</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-xs">
                    {activeProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 align-top"><div className="font-black text-sm text-slate-800"><EditableCell value={p.name} onSave={v=>onUpdateProject(p.id,'name',v)} /></div><div className="text-[9px] font-black uppercase mt-1.5 bg-blue-100 text-blue-800 inline-block px-2 py-0.5 rounded border border-blue-200 tracking-widest">{getStateLabel(p.lifecycleState)}</div></td>
                        <td className="px-4 py-4 align-top"><div className="font-bold text-slate-700 flex items-center bg-slate-100 px-2 py-1 rounded w-max border border-slate-200"><i className="fas fa-globe-americas mr-1.5 text-slate-400"></i><EditableCell value={p.country} onSave={v=>onUpdateProject(p.id,'country',v)} placeholder="Country" /></div></td>
                        <td className="px-4 py-4 align-top"><div className="mb-2"><EditableCell type="select" placeholder="health" value={p.health} onSave={v=>onUpdateProject(p.id,'health',v)} className="hidden" />{getHealthBadge(p.health)}</div><div className="flex items-center gap-2"><div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className={`h-full transition-all ${p.health==='Green'?'bg-emerald-500':p.health==='Red'?'bg-rose-500':'bg-amber-500'}`} style={{width: `${parseInt(p.progress)||0}%`}}></div></div><span className="text-[10px] font-black">{p.progress}</span></div></td>
                        <td className="px-4 py-4 align-top"><div className="font-black text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2 py-1 w-max shadow-sm">${p.mrr}</div><div className="text-[9px] font-bold uppercase mt-2 text-slate-500 tracking-wider"><EditableCell type="select" placeholder="complexity" value={p.complexity} onSave={v=>onUpdateProject(p.id,'complexity',v)} /></div></td>
                        <td className="px-4 py-4 align-top"><div className="flex flex-col gap-1.5 text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200"><div className="flex items-center justify-between border-b border-slate-200 pb-1.5"><span className="font-bold text-slate-500 uppercase tracking-wider"><i className="fas fa-flag-checkered text-blue-500 mr-1.5"></i> Start:</span> <span className="font-mono font-bold"><EditableCell type="date" value={p.kickoff} onSave={v=>onUpdateProject(p.id,'kickoff',v)} /></span></div><div className="flex items-center justify-between pt-1"><span className="font-bold text-slate-500 uppercase tracking-wider"><i className="fas fa-rocket text-emerald-500 mr-1.5"></i> Live:</span> <span className="font-mono font-black text-emerald-700"><EditableCell type="date" value={p.date} onSave={v=>onUpdateProject(p.id,'date',v)} /></span></div></div></td>
                        <td className="px-4 py-4 align-top"><div className="font-black text-blue-700 mb-1.5 truncate"><EditableCell value={p.sa} onSave={v=>onUpdateProject(p.id,'sa',v)} placeholder="SA Name" /></div><div className="text-[10px] font-bold text-slate-600 bg-slate-100 p-1.5 rounded border border-slate-200">Partner: <EditableCell value={p.partner} onSave={v=>onUpdateProject(p.id,'partner',v)} placeholder="Partner" /></div></td>
                        <td className="px-4 py-4 align-top"><div className="text-[10px] font-bold text-slate-700 bg-purple-50 p-2 rounded-lg border border-purple-100 leading-relaxed"><EditableCell type="textarea" value={p.scope} onSave={v=>onUpdateProject(p.id,'scope',v)} /></div></td>
                        <td className="px-6 py-4 align-top"><div className="text-[11px] font-medium text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-200 h-full min-h-[60px] leading-relaxed shadow-inner"><EditableCell type="textarea" value={p.blocker} onSave={v=>onUpdateProject(p.id,'blocker',v)} placeholder="Notes / Blocker" /></div></td>
                    </tr>
                    ))}
                    {activeProjects.length === 0 && <tr><td colSpan="8" className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-xs">No active projects in pipeline.</td></tr>}
                </tbody>
                </table>
            </div>
            </div>
        </div>
        )
}

function GlobalSchedule({ projects }) {
    const { useMemo } = React;
    const timelineProjects = useMemo(() => {
        const valid = []; (projects||[]).filter(p => p && !p.isWaiting).forEach(p => { 
            const start = new Date(p.kickoff); const end = new Date(p.date); 
            if(!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) valid.push({ ...p, startObj: start, endObj: end }); 
        });
        return valid.sort((a,b) => a.startObj - b.startObj);
    }, [projects]);

    const bounds = useMemo(() => { if(timelineProjects.length === 0) return null; let min = timelineProjects[0].startObj.getTime(); let max = timelineProjects[0].endObj.getTime(); timelineProjects.forEach(p => { if(p.startObj.getTime() < min) min = p.startObj.getTime(); if(p.endObj.getTime() > max) max = p.endObj.getTime(); }); const pad = 15 * 24 * 60 * 60 * 1000; return { min: min - pad, max: max + pad, total: Math.max((max+pad) - (min-pad), 1) }; }, [timelineProjects]);
    const getLeftPos = (d) => ((d.getTime() - bounds.min) / bounds.total) * 100;
    const getWidth = (s, e) => ((e.getTime() - s.getTime()) / bounds.total) * 100;
    
    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col">
                <h3 className="font-black text-xl text-slate-800 mb-8 flex items-center"><i className="fas fa-stream text-emerald-500 mr-3"></i> Global Delivery Schedule (Gantt)</h3>
                {timelineProjects.length===0 ? <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50">No valid dates in pipeline. Ensure dates are chosen via calendar picker.</div> : (
                    <div className="overflow-x-auto w-full">
                        <div className="min-w-[1000px] relative min-h-[400px]">
                            <div className="absolute inset-0 flex justify-between pl-64 opacity-20 pointer-events-none">{[...Array(8)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                            <div className="space-y-6 relative z-10 pt-4">
                                {timelineProjects.map(p => (
                                    <div key={p.id} className="flex items-center group">
                                        <div className="w-64 shrink-0 pr-4 border-r-2 border-slate-200"><div className="font-black text-xs text-slate-800 truncate">{p.name}</div><div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{p.sa}</div></div>
                                        <div className="flex-1 h-10 relative bg-slate-50 border-y border-r border-transparent group-hover:bg-slate-100 transition-colors rounded-r-lg">
                                            <div className="absolute text-[10px] font-black text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-2" style={{ left: `${getLeftPos(p.startObj)}%` }}>{formatShortDate(p.kickoff)}</div>
                                            <div className={`absolute top-1 bottom-1 rounded-md shadow-md border-2 flex flex-col justify-center px-3 overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer ${p.health === 'Green' ? 'bg-emerald-500 border-emerald-600 text-white' : p.health === 'Red' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`} style={{ left: `${getLeftPos(p.startObj)}%`, width: `${getWidth(p.startObj, p.endObj)}%`, minWidth:'50px'}}>
                                                <div className="flex justify-between items-center w-full"><span className="text-[10px] font-black">{p.progress}</span></div>
                                            </div>
                                            <div className="absolute text-[10px] font-black text-slate-800 top-1/2 -translate-y-1/2 pl-2" style={{ left: `${getLeftPos(p.startObj) + getWidth(p.startObj, p.endObj)}%` }}>{formatShortDate(p.date)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function PlaybookStudio({ customPlaybooks, setCustomPlaybooks }) {
    const { useState } = React;
    const [selectedKey, setSelectedKey] = useState("sap_enterprise_cutover");
    const safePlaybooks = customPlaybooks || {};
    const activePlaybook = safePlaybooks[selectedKey] || { name: 'Unknown Playbook', tasks: [] };

    const handleNewPlaybook = () => {
        const name = prompt("Enter new Playbook Name:");
        if(!name) return;
        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        setCustomPlaybooks({...safePlaybooks, [key]: { name, tasks: [] }});
        setSelectedKey(key);
    };

    const handleTaskUpdate = (taskId, field, value) => {
        const updatedTasks = (activePlaybook.tasks || []).map(t => t.id === taskId ? {...t, [field]: value} : t);
        setCustomPlaybooks({...safePlaybooks, [selectedKey]: {...activePlaybook, tasks: updatedTasks}});
    };

    const handleAddTask = () => {
        const newId = prompt("Enter WBS ID (e.g., 4.1):");
        if(!newId) return;
        const isParent = !newId.includes('.');
        const newTask = { id: newId, name: "New Task", prog: "0%", resp: "Internal Delivery", start: "", end: "", isParent };
        setCustomPlaybooks({...safePlaybooks, [selectedKey]: {...activePlaybook, tasks: [...(activePlaybook.tasks||[]), newTask]}});
    };

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800"><i className="fas fa-book-open text-blue-600 mr-3"></i> Dynamic Playbook Studio</h2>
                    <p className="text-sm text-slate-500 mt-2">Design, edit, and save standardized LATAM migration methodologies (WBS) to inject into projects.</p>
                </div>
                <button onClick={handleNewPlaybook} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95"><i className="fas fa-plus mr-2"></i> Create Playbook</button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-80 space-y-3 shrink-0">
                    {Object.entries(safePlaybooks).map(([key, pb]) => (
                        <div key={key} onClick={()=>setSelectedKey(key)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedKey === key ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                            <div className="font-black text-sm text-slate-800">{pb.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{(pb.tasks||[]).length} Tasks defined</div>
                        </div>
                    ))}
                </div>
                
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[600px]">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-black text-lg text-slate-800">Editing: {activePlaybook?.name}</h3>
                        <button onClick={handleAddTask} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm"><i className="fas fa-plus mr-2"></i> Add Task Row</button>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-50 p-6 custom-scrollbar">
                        <table className="w-full text-left min-w-[800px] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <thead className="bg-slate-200 text-[10px] uppercase text-slate-600 border-b-2 border-slate-300 tracking-wider">
                                <tr>
                                    <th className="p-3 w-16 text-center font-black">WBS</th>
                                    <th className="p-3 font-black">Template Task Name</th>
                                    <th className="p-3 w-48 font-black">Default RACI Owner</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs">
                                {(activePlaybook?.tasks || []).map(task => (
                                    <tr key={task.id} className={`${task.isParent ? 'bg-slate-100 font-black border-t-2 border-slate-300' : 'hover:bg-blue-50/50 transition-colors'}`}>
                                        <td className="p-3 text-center font-mono text-slate-500 font-bold"><EditableCell value={task.id} onSave={v=>handleTaskUpdate(task.id, 'id', v)} /></td>
                                        <td className={`p-3 ${task.isParent ? 'text-slate-900 text-sm' : 'pl-10 text-slate-700 font-bold'}`}><EditableCell value={task.name} onSave={v=>handleTaskUpdate(task.id, 'name', v)} /></td>
                                        <td className="p-3 text-slate-700 font-bold"><EditableCell value={task.resp} onSave={v=>handleTaskUpdate(task.id, 'resp', v)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

function GlobalProcessView() {
    const phases = [
        { id: 1, title: "ARB Intake Gate", icon: "fa-door-open", color: "bg-purple-500", shadow: "shadow-purple-500/30", text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", owner: "Sales Architect (SA)", desc: "Pre-sales transition phase.", artefacts: ["Present State HLD (As-Is)", "Target Architecture (To-Be)", "Signed Scope of Work (SOW)"] },
        { id: 2, title: "Architecture & Physics", icon: "fa-project-diagram", color: "bg-blue-500", shadow: "shadow-blue-500/30", text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", owner: "Principal Architect", desc: "Technical validation phase.", artefacts: ["IaC Topology Map", "Delivery Physics Calculation", "ORA Friction Profile"] },
        { id: 3, title: "Delivery Planning", icon: "fa-tasks", color: "bg-emerald-500", shadow: "shadow-emerald-500/30", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", owner: "Delivery Manager", desc: "Financial and scheduling phase.", artefacts: ["FinOps Commercial Model", "RACI Assignment Matrix", "Enterprise Playbook / WBS"] },
        { id: 4, title: "Active Execution", icon: "fa-rocket", color: "bg-amber-500", shadow: "shadow-amber-500/30", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", owner: "Delivery Pod / Partner", desc: "The active migration phase.", artefacts: ["TAM Support Ticket Hub", "Active Comms Dashboard", "Live Progress Gantt"] },
        { id: 5, title: "Post-Live Handover", icon: "fa-award", color: "bg-slate-700", shadow: "shadow-slate-700/30", text: "text-slate-800", bg: "bg-slate-100", border: "border-slate-300", owner: "TAM / Principal Architect", desc: "Final delivery milestone.", artefacts: ["5-Pillar WAR Scorecard", "Cost Optimization Review", "Formal Project Sign-Off"] }
    ];

    return (
        <div className="animate-fade-in max-w-[1400px] mx-auto pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-slate-900 p-8 lg:p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none"></div>
                    <h2 className="text-3xl lg:text-4xl font-black mb-4 relative z-10"><i className="fas fa-route text-blue-400 mr-4"></i>Standard Delivery Methodology</h2>
                    <p className="text-sm text-slate-400 max-w-2xl mx-auto relative z-10 leading-relaxed font-medium">The End-to-End lifecycle mapping for LATAM Cloud migrations.</p>
                </div>
            </div>

            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-10 md:before:ml-[2.25rem] before:-translate-x-px before:w-1 before:bg-slate-200 before:z-0">
                {phases.map((phase) => (
                    <div key={phase.id} className="relative z-10 flex flex-col md:flex-row gap-6 lg:gap-8 items-start group">
                        <div className="flex shrink-0 w-20 h-20 ml-2 md:ml-0 rounded-full border-4 border-white bg-white shadow-xl items-center justify-center relative">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${phase.color} ${phase.shadow}`}>
                                <i className={`fas ${phase.icon} text-white text-xl`}></i>
                            </div>
                        </div>
                        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 w-full overflow-hidden hover:shadow-md transition-shadow">
                            <div className={`px-6 py-4 border-b border-slate-200 flex justify-between items-center ${phase.bg}`}>
                                <h3 className={`font-black text-lg ${phase.text}`}>{phase.id}. {phase.title}</h3>
                                <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 shadow-sm flex items-center"><i className="fas fa-user-circle mr-2 opacity-50"></i> {phase.owner}</span>
                            </div>
                            <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                                <div className="flex-1"><h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3">Phase Objective</h4><p className="text-sm font-medium text-slate-600 leading-relaxed">{phase.desc}</p></div>
                                <div className="lg:w-1/3 shrink-0">
                                    <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Mandatory Gate Artefacts</h4>
                                    <ul className="space-y-2">
                                        {phase.artefacts.map((art, i) => <li key={i} className="flex items-start text-xs font-bold text-slate-700"><i className="fas fa-check-circle text-emerald-500 mt-0.5 mr-2"></i><span>{art}</span></li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function GlobalMigrationMonitor() {
    const { useState } = React;
    const [ak, setAk] = useState(''); const [sk, setSk] = useState(''); 
    const [projectId, setProjectId] = useState(''); const [region, setRegion] = useState('la-south-2');
    const [inventory, setInventory] = useState(null); const [isLoading, setIsLoading] = useState(false);
    
    const fetchInventory = async () => {
        if (!ak || !sk || !projectId) return alert("Credentials required.");
        setIsLoading(true);
        try {
            const res = await fetch('/api/cloud/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ak, sk, projectId, region }) });
            const data = await res.json();
            if (data.success) setInventory(data.inventory);
            else alert("API Error: " + data.error);
        } catch (err) { alert("Network Error"); } finally { setIsLoading(false); }
    };

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 flex flex-wrap gap-4 items-center text-white">
                <div className="flex-1 min-w-[250px]"><h2 className="text-2xl font-black mb-1"><i className="fas fa-tv text-blue-400 mr-3"></i> Live Cloud NOC</h2><p className="text-xs text-slate-400">Real-time resource discovery directly via AK/SK.</p></div>
                <div className="flex gap-3 flex-wrap">
                    <input type="password" value={ak} onChange={e=>setAk(e.target.value)} placeholder="AK" className="p-3 rounded-xl bg-slate-800 border border-slate-600 text-xs font-mono w-32 outline-none" />
                    <input type="password" value={sk} onChange={e=>setSk(e.target.value)} placeholder="SK" className="p-3 rounded-xl bg-slate-800 border border-slate-600 text-xs font-mono w-32 outline-none" />
                    <input type="text" value={projectId} onChange={e=>setProjectId(e.target.value)} placeholder="Project ID" className="p-3 rounded-xl bg-slate-800 border border-slate-600 text-xs font-mono w-32 outline-none" />
                    <button onClick={fetchInventory} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-widest">{isLoading ? 'Scanning...' : 'Scan Environment'}</button>
                </div>
            </div>

            {inventory && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ECS Servers */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="font-black text-slate-800"><i className="fas fa-server text-blue-500 mr-2"></i> Compute (ECS)</h3><span className="bg-blue-100 text-blue-800 px-2 rounded font-black text-xs">{inventory.ecs.length}</span></div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0"><tr><th className="p-3">Name</th><th className="p-3">Flavor</th><th className="p-3">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {inventory.ecs.map(s => <tr key={s.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{s.name}</td><td className="p-3 font-mono text-[10px]">{s.flavor?.id}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-[9px] font-black ${s.status==='ACTIVE'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{s.status}</span></td></tr>)}
                            </tbody></table>
                        </div>
                    </div>
                    {/* VPCs */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="font-black text-slate-800"><i className="fas fa-network-wired text-purple-500 mr-2"></i> Networks (VPC)</h3><span className="bg-purple-100 text-purple-800 px-2 rounded font-black text-xs">{inventory.vpc.length}</span></div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0"><tr><th className="p-3">Name</th><th className="p-3">CIDR</th><th className="p-3">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {inventory.vpc.map(v => <tr key={v.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{v.name}</td><td className="p-3 font-mono text-[10px]">{v.cidr}</td><td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">{v.status}</span></td></tr>)}
                            </tbody></table>
                        </div>
                    </div>
                    {/* RDS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="font-black text-slate-800"><i className="fas fa-database text-rose-500 mr-2"></i> Databases (RDS)</h3><span className="bg-rose-100 text-rose-800 px-2 rounded font-black text-xs">{inventory.rds.length}</span></div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0"><tr><th className="p-3">Name</th><th className="p-3">Engine</th><th className="p-3">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {inventory.rds.map(r => <tr key={r.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{r.name}</td><td className="p-3 font-mono text-[10px]">{r.datastore?.type}</td><td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">{r.status}</span></td></tr>)}
                            </tbody></table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
window.GlobalMigrationMonitor = GlobalMigrationMonitor;

window.GlobalMigrationMonitor = GlobalMigrationMonitor;
function MasterExecutionHub({ projects }) {
    const { useState, useEffect } = React;
    const [globalTasks, setGlobalTasks] = useState([]);

    useEffect(() => {
        fetch('/api/wbs/global').then(r=>r.json()).then(d=> { if(d.success) setGlobalTasks(d.tasks); });
    }, []);

    return (
        <div className="max-w-[1800px] mx-auto space-y-6 pb-12 animate-fade-in">
            <div className="bg-slate-900 p-8 rounded-2xl shadow-xl text-white flex justify-between items-center border border-slate-700">
                <div><h2 className="text-3xl font-black mb-2"><i className="fas fa-chess-board text-blue-400 mr-3"></i> Master Execution Hub</h2><p className="text-sm text-slate-400">Aggregated view of all active WBS tasks across the regional portfolio.</p></div>
                <div className="text-right"><div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Active Tasks</div><div className="text-3xl font-black text-emerald-400">{globalTasks.length}</div></div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] uppercase text-slate-600 border-b border-slate-200">
                        <tr><th className="p-4">Project</th><th className="p-4">WBS ID</th><th className="p-4">Task Description</th><th className="p-4">RACI Owner</th><th className="p-4">Progress</th><th className="p-4">Dates</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {globalTasks.map(t => {
                            const proj = projects.find(p => p.id === t.project_id);
                            return (
                                <tr key={t.id} className={t.is_parent ? "bg-slate-50 font-bold border-t-2 border-slate-200" : "hover:bg-blue-50"}>
                                    <td className="p-4 font-black text-slate-800">{proj ? proj.name : t.project_id}</td>
                                    <td className="p-4 font-mono text-slate-500">{t.wbs_id}</td>
                                    <td className="p-4">{t.name}</td>
                                    <td className="p-4"><span className="bg-slate-200 px-2 py-1 rounded text-[10px] font-black">{t.raci}</span></td>
                                    <td className="p-4"><div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full" style={{width: t.progress}}></div></div></td>
                                    <td className="p-4 font-mono text-[10px]">{t.start_date} - {t.end_date}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function CustomerDirectory({ customers, projects, onUpdateCustomer }) {
    const { useState } = React;
    const [selectedId, setSelectedId] = useState(customers.length > 0 ? customers[0].id : null);
    
    const activeCustomer = customers.find(c => c.id === selectedId);
    const linkedProjects = projects.filter(p => !p.isWaiting && p.name.toLowerCase().includes((activeCustomer?.name || '').toLowerCase().split(' ')[0]));

    const [ak, setAk] = useState(''); const [sk, setSk] = useState(''); const [region, setRegion] = useState('');
    
    // Sync local state when selected customer changes
    React.useEffect(() => {
        if(activeCustomer) { setAk(activeCustomer.ak || ''); setSk(activeCustomer.sk || ''); setRegion(activeCustomer.region || 'la-south-2'); }
    }, [activeCustomer]);

    const handleSaveVault = () => {
        onUpdateCustomer({ ...activeCustomer, ak, sk, region });
        alert("Secure Customer Vault Updated.");
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto space-y-6 pb-12">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-8 flex justify-between items-center text-white border border-slate-700">
                <div><h2 className="text-3xl font-black mb-2"><i className="fas fa-building text-blue-400 mr-3"></i> Customer Directory</h2><p className="text-sm text-slate-400">Master Accounts, Security Vaults, and Associated Portfolios.</p></div>
                <div className="text-right"><div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Managed Accounts</div><div className="text-3xl font-black text-blue-400">{customers.length}</div></div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Accounts List */}
                <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[600px] flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-200"><input type="text" placeholder="Search accounts..." className="w-full p-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500" /></div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {customers.length === 0 && <div className="p-4 text-center text-xs font-bold text-slate-400">No customers generated yet.</div>}
                        {customers.map(c => (
                            <div key={c.id} onClick={()=>setSelectedId(c.id)} className={`p-4 rounded-xl cursor-pointer transition-colors border-2 ${selectedId === c.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}>
                                <div className="font-black text-sm text-slate-800 truncate">{c.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold"><i className="fas fa-key text-slate-400 mr-1"></i> {c.ak ? 'Vault Active' : 'Keys Missing'}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Active Profile */}
                {activeCustomer ? (
                    <div className="flex-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <h3 className="font-black text-2xl text-slate-800 mb-6 border-b border-slate-100 pb-4">{activeCustomer.name}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4"><i className="fas fa-lock text-emerald-500 mr-2"></i> Security Vault (API Credentials)</h4>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Access Key (AK)</label><input type="password" value={ak} onChange={e=>setAk(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:border-blue-500 outline-none" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Secret Key (SK)</label><input type="password" value={sk} onChange={e=>setSk(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:border-blue-500 outline-none" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Default Region</label><select value={region} onChange={e=>setRegion(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold bg-white focus:border-blue-500 outline-none"><option value="la-south-2">Santiago</option><option value="la-north-2">Mexico</option><option value="sa-brazil-1">Sao Paulo</option></select></div>
                                    <button onClick={handleSaveVault} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md transition-colors">Update Vault</button>
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4"><i className="fas fa-folder-open text-blue-500 mr-2"></i> Active Portfolio</h4>
                                    <div className="space-y-3">
                                        {linkedProjects.length === 0 && <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs font-bold text-slate-400">No active projects found.</div>}
                                        {linkedProjects.map(p => (
                                            <div key={p.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                                                <div><div className="font-bold text-sm text-slate-800">{p.name}</div><div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{p.sa}</div></div>
                                                <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">${p.mrr}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400"><div className="text-center"><i className="fas fa-id-card text-6xl mb-4 opacity-50"></i><h3 className="font-black text-xl">Select a Customer Profile</h3></div></div>
                )}
            </div>
        </div>
    );
}
window.CustomerDirectory = CustomerDirectory;

// Global window bindings for Babel Standalone scoping
window.GlobalDashboard = GlobalDashboard; window.GlobalRadar = GlobalRadar; window.GlobalPipeline = GlobalPipeline; window.GlobalSchedule = GlobalSchedule; window.PlaybookStudio = PlaybookStudio; window.GlobalProcessView = GlobalProcessView; window.GlobalMigrationMonitor = GlobalMigrationMonitor; window.MasterExecutionHub = MasterExecutionHub;