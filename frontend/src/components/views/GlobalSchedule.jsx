import React, { useState, useMemo, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';

export default function GlobalSchedule() {
    const { projects } = useContext(ERPContext);
    
    // Filters
    const [phaseFilter, setPhaseFilter] = useState('All');
    
    const timelineProjects = useMemo(() => {
        const valid = []; 
        (projects||[]).filter(p => p && !p.isWaiting).forEach(p => { 
            if (phaseFilter !== 'All' && p.lifecycleState !== phaseFilter) return;
            
            const start = new Date(p.kickoff); 
            const end = new Date(p.date); 
            if(!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                // Determine node count from Target Architecture or fallback to Blueprint
                const targetNodes = p.mapperNodes?.filter(n => n.status !== 'Live Only').length || 0;
                valid.push({ ...p, startObj: start, endObj: end, targetNodes }); 
            }
        });
        return valid.sort((a,b) => a.startObj - b.startObj);
    }, [projects, phaseFilter]);

    const bounds = useMemo(() => { 
        if(timelineProjects.length === 0) return null; 
        let min = timelineProjects[0].startObj.getTime(); 
        let max = timelineProjects[0].endObj.getTime(); 
        timelineProjects.forEach(p => { 
            if(p.startObj.getTime() < min) min = p.startObj.getTime(); 
            if(p.endObj.getTime() > max) max = p.endObj.getTime(); 
        }); 
        const pad = 15 * 24 * 60 * 60 * 1000; 
        return { min: min - pad, max: max + pad, total: Math.max((max+pad) - (min-pad), 1) }; 
    }, [timelineProjects]);

    const getLeftPos = (d) => bounds ? ((d.getTime() - bounds.min) / bounds.total) * 100 : 0;
    const getWidth = (s, e) => bounds ? ((e.getTime() - s.getTime()) / bounds.total) * 100 : 0;
    
    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col">
                
                <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
                    <h3 className="font-black text-xl text-slate-800 flex items-center"><i className="fas fa-stream text-emerald-500 mr-3"></i> Global Delivery Schedule</h3>
                    <div className="flex items-center gap-4">
                        <select value={phaseFilter} onChange={e=>setPhaseFilter(e.target.value)} className="p-2.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 bg-slate-50">
                            <option value="All">All Execution Phases</option>
                            <option value="1_arb">1. ARB Intake</option>
                            <option value="2_architecture">2. Architecture & Design</option>
                            <option value="3_planning">3. Pre-Flight Planning</option>
                            <option value="4_execution">4. Active Execution</option>
                            <option value="5_postlive">5. Post-Live Hypercare</option>
                        </select>
                    </div>
                </div>

                {timelineProjects.length===0 ? <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50">No valid dates in pipeline. Ensure dates are chosen via calendar picker in Master Pipeline.</div> : (
                    <div className="overflow-x-auto w-full">
                        <div className="min-w-[1000px] relative min-h-[500px]">
                            <div className="absolute inset-0 flex justify-between pl-72 opacity-20 pointer-events-none">{[...Array(8)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                            <div className="space-y-6 relative z-10 pt-4">
                                {timelineProjects.map(p => (
                                    <div key={p.id} className="flex items-center group">
                                        {/* Project Sidebar Info */}
                                        <div className="w-72 shrink-0 pr-4 border-r-2 border-slate-200">
                                            <div className="font-black text-sm text-slate-800 truncate">{p.name}</div>
                                            <div className="flex gap-2 items-center mt-1">
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.sa || 'Unassigned SA'}</div>
                                                <div className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">{p.targetNodes} Target Nodes</div>
                                            </div>
                                        </div>
                                        
                                        {/* Gantt Timeline Bar */}
                                        <div className="flex-1 h-12 relative bg-slate-50 border-y border-r border-transparent group-hover:bg-slate-100 transition-colors rounded-r-lg ml-2">
                                            <div className="absolute text-[10px] font-black text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-2" style={{ left: `${getLeftPos(p.startObj)}%` }}>{formatShortDate(p.kickoff)}</div>
                                            
                                            <div className={`absolute top-1 bottom-1 rounded-md shadow-md border-2 flex flex-col justify-center px-3 overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer ${p.health === 'Green' ? 'bg-emerald-500 border-emerald-600 text-white' : p.health === 'Red' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`} style={{ left: `${getLeftPos(p.startObj)}%`, width: `${getWidth(p.startObj, p.endObj)}%`, minWidth:'70px'}} title={`Status: ${p.lifecycleState}`}>
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-[10px] font-black">{p.progress}</span>
                                                    {p.targetNodes > 0 && <span className="text-[9px] opacity-80"><i className="fas fa-server mr-1"></i>{p.targetNodes}</span>}
                                                </div>
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
    );
}
