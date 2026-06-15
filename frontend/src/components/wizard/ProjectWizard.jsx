import React, { useState, useEffect } from 'react';
import StepARB from './StepARB';
import StepArchitecture from './StepArchitecture';
import StepPlanning from './StepPlanning';
import StepExecution from './StepExecution';
import StepPostLive from './StepPostLive';

export default function ProjectWizard({ activeProject, onUpdateProject, onClose }) {
    const [showConfig, setShowConfig] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // 🚨 SAFELY determine the Max Unlocked Phase using Optional Chaining (?.)
    const getMaxUnlockedPhase = () => {
        if (!activeProject) return 1;
        
        const hasBOM = activeProject?.blueprintData || activeProject?.sowData;
        const hasMappedNodes = activeProject?.mapperNodes && activeProject.mapperNodes.length > 0;
        const hasBudget = activeProject?.budget || activeProject?.financials;
        const hasExecution = activeProject?.execStatus;
        const isCutoverReady = ['cutover_ready', 'completed'].includes(activeProject?.execStatus);

        if (isCutoverReady) return 5;
        if (hasBudget || hasExecution) return 4;
        if (hasMappedNodes) return 3;
        if (hasBOM) return 2;
        return 1;
    };

    const maxUnlocked = getMaxUnlockedPhase();

    // Default user to highest phase
    useEffect(() => {
        if (maxUnlocked > 1) setCurrentStep(maxUnlocked);
    }, [activeProject?.id, maxUnlocked]);

    const phases = [
        { id: 1, label: "1. ARB Handover", full: "Architecture Review Board & BOM Setup" },
        { id: 2, label: "2. Architecture", full: "Discovery, Mapper & DTRB Governance" },
        { id: 3, label: "3. Planning", full: "Strategy, FinOps & Runbooks" },
        { id: 4, label: "4. Execution", full: "Execution Control Plane" },
        { id: 5, label: "5. Post-Live", full: "Post-Live Governance & Billing" }
    ];

    const handlePhaseClick = (phaseId) => {
        if (phaseId <= maxUnlocked) setCurrentStep(phaseId);
    };

    // 🚨 ULTIMATE CRASH PREVENTION: If project isn't loaded yet, show a spinner. 
    // This stops StepExecution from trying to read undefined data!
    if (!activeProject) {
        return (
            <div className="flex items-center justify-center h-full min-h-[600px] bg-slate-50 rounded-2xl border border-slate-200 shadow-xl">
                <div className="text-center text-slate-400">
                    <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-indigo-500"></i>
                    <p className="font-black uppercase tracking-widest text-xs">Loading Project Workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-[85vh] flex flex-col font-sans relative rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* Header & CHEVRON TRACKER */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 flex flex-col xl:flex-row gap-4 justify-between items-center shadow-sm">
                <div className="flex items-center gap-4 shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="font-black text-xl text-slate-800">{activeProject.name || "Unnamed Project"}</h2>
                            <button 
                                onClick={() => setShowConfig(true)} 
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors"
                                title="Project Configuration & Details"
                            >
                                <i className="fas fa-cog"></i>
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{activeProject.customerName || "Project Workspace"}</p>
                    </div>
                </div>

                {/* The Chevron Progress Bar */}
                <div className="flex-1 w-full max-w-5xl overflow-x-auto custom-scrollbar pb-2 xl:pb-0">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 min-w-[700px]">
                        {phases.map((phase) => {
                            const isCompleted = phase.id < maxUnlocked;
                            const isCurrent = phase.id === currentStep;
                            const isLocked = phase.id > maxUnlocked;

                            let baseStyle = "flex-1 relative flex items-center justify-center py-2.5 px-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-lg z-10 text-center cursor-pointer ";
                            
                            if (isLocked) baseStyle += "text-slate-400 bg-transparent cursor-not-allowed opacity-60";
                            else if (isCurrent) baseStyle += "bg-white text-indigo-600 shadow-sm border border-slate-200 scale-[1.02] z-20";
                            else if (isCompleted) baseStyle += "text-slate-600 hover:bg-slate-200/50 bg-transparent";

                            return (
                                <div key={phase.id} onClick={() => handlePhaseClick(phase.id)} className={baseStyle} title={isLocked ? "Complete previous phases to unlock" : phase.full}>
                                    {isCompleted && !isCurrent ? <i className="fas fa-check text-emerald-500 mr-2"></i> : null}
                                    {isLocked && <i className="fas fa-lock text-slate-300 mr-2"></i>}
                                    <span className="truncate">{phase.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
                {currentStep === 1 && <StepARB project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(2)} />}
                {currentStep === 2 && <StepArchitecture project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(3)} />}
                {currentStep === 3 && <StepPlanning project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(4)} />}
                {currentStep === 4 && <StepExecution project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(5)} />}
                {currentStep === 5 && <StepPostLive project={activeProject} onUpdateProject={onUpdateProject} />}
            </div>

            {/* Project Configuration Modal */}
            {showConfig && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfig(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-slide-up">
                        <div className="px-8 py-5 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg flex items-center"><i className="fas fa-sliders-h text-indigo-400 mr-3"></i> Project Details</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Core Identity & Configuration</p>
                            </div>
                            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Project Name</label>
                                <div className="font-bold text-sm text-slate-800">{activeProject.name || 'N/A'}</div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Customer Account</label>
                                <div className="font-bold text-sm text-slate-800">{activeProject.customerName || 'N/A'}</div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">System Project ID</label>
                                <div className="font-mono text-xs text-slate-500 font-bold">{activeProject.id || 'N/A'}</div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Sales Architect</label>
                                <div className="font-bold text-sm text-indigo-600">{activeProject.sa || 'Unassigned'}</div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Target MRR</label>
                                <div className="font-black text-base text-emerald-600">${activeProject.mrr || 0}</div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Deployment Country</label>
                                <div className="font-bold text-sm text-slate-800 uppercase flex items-center gap-2">
                                    <i className="fas fa-globe-americas text-slate-400"></i> {activeProject.country || 'Not Defined'}
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</label>
                                <div className="font-mono font-bold text-sm text-slate-700">{activeProject.kickoff || activeProject.kickoffDate || activeProject.startDate || 'TBD'}</div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Go-Live Cutover</label>
                                <div className="font-mono font-black text-sm text-emerald-600">{activeProject.date || activeProject.targetDate || activeProject.goLiveDate || 'TBD'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
