import React, { useState, useMemo, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import { formatShortDate } from '../../utils/helpers';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer for the calendar
const locales = {
    'en-US': enUS,
};
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

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
            if (phaseFilter !== 'All') {
                if (phaseFilter === 'pre_sales') {
                    if (!isWaiting) return;
                } else {
                    if (isWaiting || p.lifecycleState !== phaseFilter) return;
                }
            }
            
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
                let startDate = null;
                let endDate = null;
                
                const waitingStage = p.waitingStage || (p.data && p.data.waitingStage);
                const estimatedStartDate = p.expectedCloseDate || p.estimatedStartDate || (p.data && p.data.estimatedStartDate);
                const estimatedDurationWeeks = p.estimatedDurationWeeks || (p.data && p.data.estimatedDurationWeeks) || '4';
                
                if (estimatedStartDate) {
                    startDate = new Date(estimatedStartDate);
                } else {
                    const today = new Date();
                    const weeksOut = waitingStage === 'prospect' ? 10 : 
                                    waitingStage === 'sizing' ? 6 :    
                                    waitingStage === 'ready' ? 2 :     
                                    8; 
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() + (weeksOut * 7));
                }
                
                const durationWeeks = parseInt(estimatedDurationWeeks);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + (durationWeeks * 7));
                
                valid.push({
                    ...p,
                    startObj: startDate,
                    endObj: endDate,
                    targetNodes: p.estimatedWorkloads || 0,
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
        const pad = 15 * 24 * 60 * 60 * 1000; 
        return { min: min - pad, max: max + pad, total: Math.max((max+pad) - (min-pad), 1) }; 
    }, [timelineProjects]);

    const getLeftPos = (d) => bounds ? ((d.getTime() - bounds.min) / bounds.total) * 100 : 0;
    const getWidth = (s, e) => bounds ? ((e.getTime() - s.getTime()) / bounds.total) * 100 : 0;

    const navigateToProject = (id) => {
        setActiveProjectId(id);
        setActivePhase('wizard');
    };

    // 🚨 Convert timelineProjects to react-big-calendar events
    const calendarEvents = useMemo(() => {
        return timelineProjects.map(p => ({
            id: p.id,
            title: `${p.isPreSales ? '[EST] ' : ''}${p.name}`,
            start: p.startObj,
            end: p.endObj,
            allDay: true,
            resource: p
        }));
    }, [timelineProjects]);

    // 🚨 Custom styling for Calendar Events
    const eventStyleGetter = (event, start, end, isSelected) => {
        let style = {
            borderRadius: '6px',
            opacity: 0.95,
            color: 'white',
            border: '0px',
            display: 'block',
            fontWeight: '900',
            fontSize: '10px',
            padding: '3px 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        };

        if (event.resource.isPreSales) {
            style.backgroundColor = '#6366f1'; 
            style.backgroundImage = 'linear-gradient(to right, #818cf8, #6366f1)';
            style.border = '1px dashed #c7d2fe';
            style.color = '#ffffff';
        } else if (event.resource.health === 'Red') {
            style.backgroundColor = '#f43f5e'; 
            style.border = '1px solid #e11d48';
        } else if (event.resource.health === 'Yellow') {
            style.backgroundColor = '#f59e0b'; 
            style.border = '1px solid #d97706';
        } else {
            style.backgroundColor = '#10b981'; 
            style.border = '1px solid #059669';
        }

        return { style };
    };
    
    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto space-y-6 pb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 flex flex-col min-h-[800px]">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-200 pb-4 gap-4">
                    <div>
                        <h3 className="font-black text-2xl text-slate-800 flex items-center"><i className="fas fa-calendar-alt text-emerald-500 mr-3"></i> Global Delivery Schedule</h3>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Master Portfolio Timelines & Cutover Events</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
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
                            <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><i className="fas fa-calendar-day mr-2"></i> Calendar</button>
                        </div>
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-sm"></div> Active</span>
                            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 border-dashed border border-blue-300 rounded-sm shadow-sm"></div> Pre-Sales</span>
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
                    <div className="overflow-x-auto w-full flex-1 animate-fade-in">
                        <div className="min-w-[1000px] relative h-full min-h-[500px]">
                            <div className="absolute inset-0 flex justify-between pl-72 opacity-20 pointer-events-none">{[...Array(8)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                            <div className="space-y-6 relative z-10 pt-4">
                                {timelineProjects.map(p => (
                                    <div key={p.id} className="flex items-center group">
                                        <div className="w-72 shrink-0 pr-4 border-r-2 border-slate-200 cursor-pointer" onClick={() => navigateToProject(p.id)}>
                                            <div className="font-black text-sm text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{p.name}</div>
                                            <div className="flex gap-2 items-center mt-1">
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.sa || 'Unassigned SA'}</div>
                                                <div className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">{p.targetNodes || 0} Nodes</div>
                                            </div>
                                        </div>
                                        
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
                    /* 🚨 INTERACTIVE CALENDAR VIEW (react-big-calendar) */
                    <div className="h-full flex-1 min-h-[650px] animate-fade-in relative z-10 calendar-wrapper">
                        <style dangerouslySetContent={{__html: `
                            .calendar-wrapper .rbc-calendar { font-family: inherit; border: none; }
                            .calendar-wrapper .rbc-toolbar { margin-bottom: 20px; }
                            .calendar-wrapper .rbc-toolbar button { border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: #475569; border-color: #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                            .calendar-wrapper .rbc-toolbar button:active, .calendar-wrapper .rbc-toolbar button.rbc-active { background-color: #10b981; color: white; border-color: #059669; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
                            .calendar-wrapper .rbc-toolbar button:focus { outline: none; }
                            .calendar-wrapper .rbc-header { padding: 12px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
                            .calendar-wrapper .rbc-month-view { border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; background: #f8fafc; }
                            .calendar-wrapper .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #e2e8f0; }
                            .calendar-wrapper .rbc-month-row + .rbc-month-row { border-top: 1px solid #e2e8f0; }
                            .calendar-wrapper .rbc-off-range-bg { background: #f1f5f9; }
                            .calendar-wrapper .rbc-date-cell { font-weight: 900; font-size: 12px; color: #334155; padding: 4px 8px; }
                            .calendar-wrapper .rbc-event { transition: transform 0.2s, box-shadow 0.2s; }
                            .calendar-wrapper .rbc-event:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); z-index: 10; }
                        `}} />
                        <Calendar
                            localizer={localizer}
                            events={calendarEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            eventPropGetter={eventStyleGetter}
                            onSelectEvent={(event) => navigateToProject(event.id)}
                            popup={true}
                            views={['month', 'week', 'day', 'agenda']}
                            tooltipAccessor={(event) => `${event.title}\nDates: ${formatShortDate(event.start)} - ${formatShortDate(event.end)}\nSA: ${event.resource.sa || 'TBD'}`}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
