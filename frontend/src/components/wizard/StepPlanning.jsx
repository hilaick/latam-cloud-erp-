import React, { useState } from 'react';
import PhysicsEngine from './PhysicsEngine';
import FinOpsCalculator from './FinOpsCalculator';
import DedicatedMigrationPlan from './DedicatedMigrationPlan';
import ToolRecommendationView from './ToolRecommendationView';
import CutoverRunbookView from './CutoverRunbookView';

export default function StepPlanning({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('physics');
    const [sidebarOpen, setSidebarOpen] = useState(true); // 🚨 NEW COLLAPSE STATE

    const menuItems = [
        { id: 'physics', num: '3.1', icon: 'fa-water', label: 'Wave Physics SLA' },
        { id: 'finops', num: '3.2', icon: 'fa-wallet', label: 'FinOps Budget & Burn' },
        { id: 'wbs', num: '3.3', icon: 'fa-tasks', label: 'WBS & RACI Matrix' },
        { id: 'tools', num: '3.4', icon: 'fa-tools', label: 'Strategic Tooling' },
        { id: 'runbook', num: '3.5', icon: 'fa-calendar-alt', label: 'Wave & Runbook Planning' }
    ];

    return (
        <div className="animate-fade-in pb-12 flex flex-col h-full">
            
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 mb-6 rounded-t-2xl flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors"
                        title={sidebarOpen ? "Collapse Menu" : "Expand Menu"}
                    >
                        <i className={`fas fa-bars ${sidebarOpen ? 'text-indigo-600' : ''}`}></i>
                    </button>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">Migration Planning & Strategy</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Translate the mapped Blueprint into an executable plan.</p>
                    </div>
                </div>
            </div>

            {/* Layout Container */}
            <div className="flex flex-1 gap-6 px-4 lg:px-8 relative h-full">
                
                {/* Collapsible Left Navigation Sidebar */}
                <div className={`shrink-0 space-y-2 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-full lg:w-64 opacity-100' : 'w-0 opacity-0 hidden lg:block'}`}>
                    {menuItems.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setSubTab(item.id)}
                            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between group ${
                                subTab === item.id 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${subTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                    {item.num}
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                        </button>
                    ))}
                    
                    <div className="pt-8">
                        <button onClick={() => onPromote && onPromote('execution')} className="w-full px-4 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                            Go to Execution Phase <i className="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>

                {/* Right Content Area (Expands to 100% when sidebar collapses) */}
                <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[700px] overflow-hidden transition-all duration-300">
                    {subTab === 'physics' && <PhysicsEngine activeProject={project} onUpdateProject={onUpdateProject} />}
                    {subTab === 'finops' && <FinOpsCalculator project={project} onUpdateProject={onUpdateProject} />}
                    {subTab === 'wbs' && <DedicatedMigrationPlan activeProject={project} onUpdateProject={onUpdateProject} />}
                    
                    {subTab === 'tools' && (
                        <div className="animate-fade-in h-full flex flex-col">
                            <div className="bg-amber-50 border-b border-amber-200 p-6 shrink-0">
                                <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest"><i className="fas fa-tools mr-2"></i> Strategic Tooling Generation</h4>
                                <p className="text-xs text-amber-700/80 mt-1 font-medium">This phase generates theoretical recommendations based on SOW metadata to build the Project Plan. (Physical OS validation occurs in Phase 4).</p>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <ToolRecommendationView activeProject={project} onUpdateProject={onUpdateProject} />
                            </div>
                        </div>
                    )}
                    
                    {subTab === 'runbook' && (
                        <div className="p-6 h-full flex flex-col animate-fade-in">
                            <div className="bg-purple-50 border border-purple-200 p-5 rounded-xl mb-6 flex items-start gap-4 text-purple-800 shadow-inner shrink-0">
                                <i className="fas fa-info-circle mt-0.5 text-xl"></i>
                                <div className="text-xs leading-relaxed">
                                    <strong className="block mb-1 text-sm uppercase tracking-widest">Iterative Wave Planning</strong>
                                    Migrations are executed in waves, not linearly. Use this interface to group the mapped Blueprint servers into scheduled Cutover Waves based on the customer's accepted downtime SLA.
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <CutoverRunbookView activeProject={project} onUpdateProject={onUpdateProject} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
