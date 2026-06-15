import React, { useState, useMemo, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';

export default function GlobalSchedule() {
    const { projects, setActiveProjectId, setActivePhase } = useContext(ERPContext);
    
    // Filters & View Mode
    const [phaseFilter, setPhaseFilter] = useState('All');
    const [viewMode, setViewMode] = useState('gantt'); // 'gantt' or 'calendar'
    
    const timelineProjects = useMemo(() => {
        const valid = []; 
        (projects||[]).forEach(p => { 
            if (!p) return;
            
            // Check if project is waiting (pre-sales)
            const isWaiting = p.isWaiting === true || (p.data && p.data.isWaiting === true);
            
            // Filter by phase if not "All"
            if (phaseFilter !== 'All' && phaseFilter !== 'pre_sales') {
                if (p.lifecycleState !== phaseFilter && !isWaiting) return;
            }
            // If filter is 'pre_sales', only show pre-sales projects
            if (phaseFilter === 'pre_sales' && !isWaiting) return;
            
            // 🚨 FOR ACTIVE PROJECTS (isWaiting = false)
            if (!isWaiting) {
                const kickoffStr = p.kickoff || p.kickoffDate || p.startDate;
                const targetStr = p.date || p.targetDate || p.goLiveDate;

                if(!kickoffStr || !targetStr || kickoffStr === 'Pending' || targetStr === 'TBD') return;

                const start = new Date(kickoffStr); 
                const end = new Date(targetStr); 
                
                if(!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
                    const targetNodes = p.mapperNodes?.filter(n => n.status !== 'Live Only').length || 0;
                    valid.push({ 
                        ...p, 
                        startObj: start, 
                        endObj: end, 
                        targetNodes, 
                        kickoffStr, 
                        targetStr,
                        isPreSales: false,
                        timelineType: 'active'
                    }); 
                }
            }
            // 🚨 FOR PRE-SALES PROJECTS (isWaiting = true)
            else if (isWaiting) {
                // Use estimated start date or calculate based on waitingStage
                let startDate = null;
                let endDate = null;
                
                const waitingStage = p.waitingStage || (p.data && p.data.waitingStage);
                const estimatedStartDate = p.estimatedStartDate || (p.data && p.data.estimatedStartDate);
                const estimatedDurationWeeks = p.estimatedDurationWeeks || (p.data && p.data.estimatedDurationWeeks) || '4';
                
                if (estimatedStartDate) {
                    startDate = new Date(estimatedStartDate);
                } else {
                    // Calculate estimated start based on waitingStage
                    const today = new Date();
                    const weeksOut = waitingStage === 'prospect' ? 10 : // 8-12 weeks avg
                                    waitingStage === 'sizing' ? 6 :    // 4-8 weeks avg
                                    waitingStage === 'ready' ? 2 :     // 1-4 weeks avg
                                    8; // default
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() + (weeksOut * 7));
                }
                
                // Calculate end date based on estimated duration
                const durationWeeks = parseInt(estimatedDurationWeeks);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + (durationWeeks * 7));
                
                valid.push({
                    ...p,
                    startObj: startDate,
                    endObj: endDate,
                    targetNodes: 0,
                    kickoffStr: estimatedStartDate || 'TBD',
                    targetStr: 'TBD',
                    isPreSales: true,
                    timelineType: 'estimated',
                    estimatedDurationWeeks: estimatedDurationWeeks,
                    waitingStage: waitingStage || 'unknown'
                });
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
        const pad = 15 * 24 * 60 * 60 * 1000; // 15 days padding
        return { min: min - pad, max: max + pad, total: Math.max((max+pad) - (min-pad), 1) }; 
    }, [timelineProjects]);

    const getLeftPos = (d) => bounds ? ((d.getTime() - bounds.min) / bounds.total) * 100 : 0;
    const getWidth = (s, e) => bounds ? ((e.getTime() - s.getTime()) / bounds.total) * 100 : 0;

    const navigateToProject = (id) => {
        setActiveProjectId(id);
        setActivePhase('wizard');
    };
    
    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col min-h-[700px]">
                
                <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
                    <div>
                        <h3 className="font-black text-2xl text-slate-800 flex items-center"><i className="fas fa-calendar-alt text-emerald-500 mr-3"></i> Global Delivery Schedule</h3>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Master Portfolio Timelines & Cutover Events</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <select value={phaseFilter} onChange={e=>setPhaseFilter(e.target.value)} className="p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 bg-slate-50 shadow-sm cursor-pointer">
                            <option value="All">All Execution Phases</option>
                            <option value="1_arb">1. ARB Intake</option>
                            <option value="2_architecture">2. Architecture & Design</option>
                            <option value="3_planning">3. Pre-Flight Planning</option>
                            <option value="4_execution">4. Active Execution</option>
                            <option value="5_postlive">5. Post-Live Hypercare</option>
                            <option value="pre_sales">Pre-Sales Pipeline</option>
                        </select>
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 shadow-inner">
                            <button onClick={() => setViewMode('gantt')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'gantt' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-stream mr-2"></i> Gantt</button>
                            <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-calendar-day mr-2"></i> Cutover Grid</button>
                        </div>
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Active</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 border-dashed border border-blue-300 rounded-sm"></div> Pre-Sales</span>
                        </div>
                    </div>
                </div>

                {timelineProjects.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 max-w-lg">
                            <i className="fas fa-calendar-times text-4xl mb-4 opacity-50"></i>
                            <h4 className="font-black text-lg text-slate-600 mb-1">No Active Schedules</h4>
                            <p className="text-xs font-medium">Valid Kickoff and Go-Live dates are required. Please configure dates in the Master Pipeline or Project Pre-Sales Context.</p>
                        </div>
                    </div>
                ) : viewMode === 'gantt' ? (
                    /* 🚨 GANTT TIMELINE VIEW */
                    <div className="overflow-x-auto w-full flex-1">
                        <div className="min-w-[1000px] relative h-full min-h-[500px]">
                            <div className="absolute inset-0 flex justify-between pl-72 opacity-20 pointer-events-none">{[...Array(8)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                            <div className="space-y-6 relative z-10 pt-4">
                                {timelineProjects.map(p => (
                                    <div key={p.id} className="flex items-center group">
                                        {/* Project Sidebar Info */}
                                        <div className="w-72 shrink-0 pr-4 border-r-2 border-slate-200 cursor-pointer" onClick={() => navigateToProject(p.id)}>
                                            <div className="font-black text-sm text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{p.name}</div>
                                            <div className="flex gap-2 items-center mt-1">
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.sa || 'Unassigned SA'}</div>
                                                <div className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">{p.targetNodes} Target Nodes</div>
                                            </div>
                                        </div>
                                        
                                        {/* Gantt Bar */}
                                        <div className="flex-1 h-12 relative bg-slate-50 border-y border-r border-transparent group-hover:bg-slate-100 transition-colors rounded-r-lg ml-2">
                                            <div className="absolute text-[10px] font-black text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-2" style={{ left: `${getLeftPos(p.startObj)}%` }}>{formatShortDate(p.kickoffStr)}</div>
                                            
                                            <div onClick={() => navigateToProject(p.id)} className={`absolute top-1 bottom-1 rounded-md shadow-md border-2 flex flex-col justify-center px-3 overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer ${p.isPreSales ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-dashed border-blue-400 text-blue-800' : p.health === 'Green' ? 'bg-emerald-500 border-emerald-600 text-white' : p.health === 'Red' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`} style={{ left: `${getLeftPos(p.startObj)}%`, width: `${Math.max(getWidth(p.startObj, p.endObj), 2)}%`, minWidth:'70px'}} title={`${p.isPreSales ? 'Pre-Sales: ' : ''}${p.lifecycleState || p.waitingStage}`}>
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-[10px] font-black">{p.isPreSales ? 'EST' : (p.progress || '0%')}</span>
                                                    {p.targetNodes > 0 && <span className="text-[9px] opacity-80"><i className="fas fa-server mr-1"></i>{p.targetNodes}</span>}
                                                    {p.isPreSales && <span className="text-[8px] font-black opacity-70"><i className="fas fa-hourglass-half mr-1"></i>{p.waitingStage || 'unknown'}</span>}
                                                </div>
                                            </div>

                                            <div className="absolute text-[10px] font-black text-slate-800 top-1/2 -translate-y-1/2 pl-2" style={{ left: `${getLeftPos(p.startObj) + Math.max(getWidth(p.startObj, p.endObj), 2)}%` }}>{formatShortDate(p.targetStr)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 🚨 UPCOMING CUTOVER CALENDAR VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                        {timelineProjects.sort((a,b) => a.endObj - b.endObj).map(p => {
                            const isPast = p.endObj < new Date();
                            const isThisWeek = p.endObj >= new Date() && p.endObj <= new Date(new Date().setDate(new Date().getDate() + 7));
                            
                            return (
                                <div key={p.id} onClick={() => navigateToProject(p.id)} className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all hover:-translate-y-1 shadow-sm hover:shadow-lg ${p.isPreSales ? 'bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-dashed border-blue-300' : isThisWeek ? 'bg-rose-50 border-rose-200' : isPast ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                                    {p.isPreSales && <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md"><i className="fas fa-clock mr-1"></i>EST</div>}
                                    {isThisWeek && !p.isPreSales && <div className="absolute -top-3 -right-3 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md animate-pulse">Critical Weekend</div>}
                                    {isPast && !p.isPreSales && <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-300 px-2 py-0.5 rounded bg-white">Past</div>}
                                    
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-inner ${p.isPreSales ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200' : isThisWeek ? 'bg-rose-500 text-white' : isPast ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                            <span className="text-[9px] font-black uppercase leading-none mt-1">{p.endObj.toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-xl font-black leading-none">{p.endObj.getDate()}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{p.isPreSales ? 'Estimated Start' : 'Go-Live Cutover'}</div>
                                            <h4 className="font-black text-slate-800 text-sm truncate w-48">{p.name}</h4>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 mb-4">
                                        <span className={`${p.isPreSales ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-600'} px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border`}><i className="fas fa-user-tie mr-1"></i> {p.sa || 'TBD'}</span>
                                        <span className={`${p.isPreSales ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'} px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border`}><i className="fas fa-server mr-1"></i> {p.targetNodes} Nodes</span>
                                        {p.isPreSales && <span className="bg-purple-100 border-purple-200 text-purple-700 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border"><i className="fas fa-hourglass-half mr-1"></i>{p.waitingStage || 'unknown'}</span>}
                                    </div>
                                    
                                    <div className="bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                                        <div className={`h-full ${p.isPreSales ? 'bg-gradient-to-r from-blue-400 to-indigo-400' : p.health === 'Red' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: p.isPreSales ? '100%' : (p.progress || '0%')}}></div>
                                    </div>
                                    <div className="text-right text-[10px] font-black text-slate-500 mt-1">{p.isPreSales ? 'Pre-Sales' : `${p.progress || '0%'} Readiness`}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
