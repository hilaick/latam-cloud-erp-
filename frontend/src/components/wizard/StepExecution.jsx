import React, { useState, useEffect, useMemo } from 'react';
import { formatShortDate } from '../../utils/helpers';

export default function StepExecution({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('hub');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6">
                <button 
                    onClick={() => setSubTab('hub')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'hub' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-stream mr-2"></i> 1. Delivery Command Center
                </button>
                <button 
                    onClick={() => setSubTab('tam')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'tam' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-headset mr-2"></i> 2. TAM Service Governance
                </button>
            </div>

            {subTab === 'hub' && <ExecutionHubView project={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'tam' && <TAMHubView project={project} onUpdateProject={onUpdateProject} />}

            {/* Post-Live Promotion Gate */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h4 className="font-black text-slate-800 text-lg">Execution Complete</h4>
                    <p className="text-xs text-slate-500 mt-1">Once all workloads are synced and tested, promote the project to Post-Live Hypercare.</p>
                </div>
                <button 
                    onClick={onPromote} 
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-3 w-full md:w-auto justify-center"
                >
                    <span>Proceed to Post-Live</span>
                    <i className="fas fa-flag-checkered"></i>
                </button>
            </div>
        </div>
    );
}

// ==========================================
// 🚀 1. DELIVERY COMMAND CENTER
// ==========================================
function ExecutionHubView({ project, onUpdateProject }) {
    const [comms, setComms] = useState(project.comms || { bridge: "", chat: "", notes: "" });
    useEffect(() => { setComms(project.comms || { bridge: "", chat: "", notes: "" }); }, [project]);
    
    const handleSaveComms = () => { 
        onUpdateProject(project.id, 'comms', comms); 
        alert("Command Center Links Updated"); 
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-amber-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-sm tracking-wide text-amber-900"><i className="fas fa-satellite-dish text-amber-600 mr-2"></i> Delivery Command Center</h3>
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mt-1">Centralized Execution Communications</p>
                    </div>
                    <button onClick={handleSaveComms} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors"><i className="fas fa-save mr-2"></i>Save Links</button>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white">
                    <div className="col-span-2 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Persistent Bridge Link (Teams/Zoom/Meet)</label>
                            <div className="flex gap-2">
                                <input type="text" value={comms.bridge} onChange={e=>setComms({...comms, bridge: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-amber-500 bg-slate-50" placeholder="https://teams.microsoft.com/..." />
                                <a href={comms.bridge || '#'} target="_blank" rel="noreferrer" className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-colors"><i className="fas fa-video"></i> Join</a>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Group Chat / Slack / WhatsApp Link</label>
                            <div className="flex gap-2">
                                <input type="text" value={comms.chat} onChange={e=>setComms({...comms, chat: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-amber-500 bg-slate-50" placeholder="https://chat.whatsapp.com/..." />
                                <a href={comms.chat || '#'} target="_blank" rel="noreferrer" className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-colors"><i className="fas fa-comment-dots"></i> Chat</a>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Execution Notes / Escalation Path</label>
                        <textarea value={comms.notes} onChange={e=>setComms({...comms, notes: e.target.value})} className="w-full h-32 p-4 border border-amber-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 bg-amber-50/50 custom-scrollbar leading-relaxed resize-none shadow-inner" placeholder="PM Name: Maria&#10;Escalation: CIO (john@corp.com)"></textarea>
                    </div>
                </div>
            </div>
            <SingleProjectGantt project={project} />
        </div>
    )
}

function SingleProjectGantt({ project }) {
    const timelineData = useMemo(() => {
        if(!project.kickoff || !project.date || project.kickoff==='Pending' || project.date==='TBD') return null;
        const start = new Date(project.kickoff); const end = new Date(project.date);
        if(isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
        const pad = 10 * 24 * 60 * 60 * 1000;
        const min = start.getTime() - pad; const max = end.getTime() + pad; const total = max - min;
        const pStart = ((start.getTime() - min) / total) * 100; const pWidth = ((end.getTime() - start.getTime()) / total) * 100;
        return { pStart, pWidth, startStr: formatShortDate(project.kickoff), endStr: formatShortDate(project.date) };
    }, [project]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in">
            <h3 className="font-black text-sm text-slate-800 mb-6 flex items-center uppercase tracking-widest"><i className="fas fa-stream text-amber-500 mr-3"></i> Project Timeline Baseline</h3>
            {!timelineData ? <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-xs">Valid Kickoff and Go-Live dates required to render timeline.</div> : (
                <div className="overflow-x-auto w-full">
                    <div className="min-w-[800px] relative h-[120px]">
                        <div className="absolute inset-0 flex justify-between opacity-20 pointer-events-none">{[...Array(6)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                        <div className="relative z-10 pt-8">
                            <div className="h-12 relative bg-slate-50 border-y border-transparent transition-colors rounded-xl shadow-inner">
                                <div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-4" style={{ left: `${timelineData.pStart}%` }}>{timelineData.startStr}</div>
                                <div className={`absolute top-1 bottom-1 rounded-lg shadow-md border-2 flex flex-col justify-center px-4 overflow-hidden ${project.health === 'Green' ? 'bg-emerald-500 border-emerald-600 text-white' : project.health === 'Red' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`} style={{ left: `${timelineData.pStart}%`, width: `${timelineData.pWidth}%`, minWidth:'80px'}}>
                                    <span className="text-xs font-black truncate">{project.progress} Complete</span>
                                </div>
                                <div className="absolute text-[10px] font-black uppercase tracking-widest text-slate-800 top-1/2 -translate-y-1/2 pl-4" style={{ left: `${timelineData.pStart + timelineData.pWidth}%` }}>{timelineData.endStr}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ==========================================
// 🎧 2. TAM SERVICE GOVERNANCE
// ==========================================
function TAMHubView({ project, onUpdateProject }) {
    const safeTamData = project.tamData || { 
        supportPlan: "Enterprise", welinkGroup: "", 
        tickets: [], 
        workshops: [
            {id: 1, name: "Cloud Console 101", done: false}, 
            {id: 2, name: "IAM & Security Best Practices", done: false}, 
            {id: 3, name: "Billing & Cost Center Setup", done: false}
        ] 
    };
    const [tamData, setTamData] = useState(safeTamData);
    
    useEffect(() => { setTamData(project.tamData || safeTamData); }, [project]);
    
    const handleSave = () => { 
        onUpdateProject(project.id, 'tamData', tamData); 
        alert("TAM Operations Data Saved."); 
    };
    
    const toggleWorkshop = (id) => { 
        const w = (tamData.workshops||[]).map(x => x.id === id ? {...x, done: !x.done} : x); 
        setTamData({...tamData, workshops: w}); 
    };
    
    const addTicket = () => { 
        const id = prompt("Ticket ID (e.g., SR-123):"); 
        if(!id) return; 
        const title = prompt("Issue Title:"); 
        setTamData({...tamData, tickets: [{id, title, sev: 'Medium', status: 'Open'}, ...(tamData.tickets||[])]}); 
    };

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-headset text-blue-400 mr-3"></i> TAM Service Governance</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Customer Enablement & Escalation Routing</p>
                    </div>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">
                        <i className="fas fa-save mr-2"></i> Save Operations Data
                    </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    
                    {/* Card 1: Escalation & Plans */}
                    <div className="p-8 bg-slate-50 space-y-6">
                        <div><h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-widest"><i className="fas fa-sitemap text-slate-400 mr-2"></i> Escalation Pathways</h4></div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Contracted Support Plan</label>
                            <select value={tamData.supportPlan} onChange={e=>setTamData({...tamData, supportPlan: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white cursor-pointer shadow-sm">
                                <option>Developer</option><option>Business</option><option>Enterprise</option><option>Premier</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Internal WeLink Group (NOC/Escalations)</label>
                            <div className="flex gap-2">
                                <input type="text" value={tamData.welinkGroup} onChange={e=>setTamData({...tamData, welinkGroup: e.target.value})} className="flex-1 p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white shadow-sm" placeholder="welink://group/12345" />
                                <a href={tamData.welinkGroup || '#'} target="_blank" rel="noreferrer" className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center transition-colors"><i className="fas fa-external-link-alt"></i></a>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">External Customer Comms (WhatsApp/Teams)</label>
                            <input type="text" value={project.comms?.chat || ''} disabled className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-500 bg-slate-100 cursor-not-allowed shadow-inner" title="Edit in Command Center tab" placeholder="No link provided in Command Center" />
                        </div>
                    </div>

                    {/* Card 2: Enablement Tracker */}
                    <div className="p-8 bg-white space-y-6">
                        <div>
                            <h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2 uppercase tracking-widest"><i className="fas fa-graduation-cap text-blue-500 mr-2"></i> Cloud Enablement Tracker</h4>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-4">Tracking hands-on workshops prevents post-live churn and documents TAM educational effort.</p>
                        </div>
                        
                        <div className="space-y-3">
                            {(tamData.workshops||[]).map(w => (
                                <label key={w.id} className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors shadow-sm ${w.done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}`}>
                                    <input type="checkbox" checked={w.done} onChange={()=>toggleWorkshop(w.id)} className="w-5 h-5 accent-emerald-500" />
                                    <span className={`font-bold text-xs ${w.done ? 'text-emerald-800 line-through opacity-75' : 'text-slate-700'}`}>{w.name}</span>
                                </label>
                            ))}
                            <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-600 text-[10px] uppercase tracking-widest transition-colors" onClick={() => {
                                const name = prompt("Enter custom workshop name:");
                                if(name) setTamData({...tamData, workshops: [...tamData.workshops, {id: Date.now(), name, done: false}]});
                            }}>
                                <i className="fas fa-plus mr-2"></i> Add Workshop
                            </button>
                        </div>
                    </div>

                    {/* Card 3: Tickets */}
                    <div className="p-8 bg-slate-50 flex flex-col h-full min-h-[400px]">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-3 mb-4 shrink-0">
                            <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest"><i className="fas fa-ticket-alt text-rose-500 mr-2"></i> Migration Support Tickets</h4>
                            <button onClick={addTicket} className="text-[10px] font-black uppercase tracking-widest text-blue-700 hover:text-white bg-blue-100 hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-700 transition-colors shadow-sm"><i className="fas fa-plus mr-1"></i> Log Ticket</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {(!tamData.tickets || tamData.tickets.length === 0) ? (
                                <div className="p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl bg-white text-xs shadow-sm">No active escalations.</div> 
                            ) : (
                                tamData.tickets.map((t,i) => (
                                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-[10px] text-slate-500 font-bold group-hover:text-blue-600 transition-colors">{t.id}</div>
                                            <div className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 tracking-widest">{t.status}</div>
                                        </div>
                                        <div className="font-bold text-xs text-slate-800 leading-snug">{t.title}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
