import React, { useState, useEffect } from 'react';
import StepARB from './StepARB';
import StepArchitecture from './StepArchitecture';
import StepPlanning from './StepPlanning';
import StepExecution from './StepExecution';
import StepPostLive from './StepPostLive';

export default function ProjectWizard({ activeProject, onUpdateProject, onClose }) {
    // 🚨 Determine the Maximum Unlocked Phase based on the 5-Phase Methodology
    const getMaxUnlockedPhase = () => {
        if (!activeProject) return 1;
        
        const hasBOM = activeProject.blueprintData || activeProject.sowData;
        const hasMappedNodes = activeProject.mapperNodes && activeProject.mapperNodes.length > 0;
        const hasBudget = activeProject.budget || activeProject.financials;
        const hasExecution = activeProject.execStatus;
        const isCutoverReady = ['cutover_ready', 'completed'].includes(activeProject.execStatus);

        if (isCutoverReady) return 5;
        if (hasBudget || hasExecution) return 4;
        if (hasMappedNodes) return 3;
        if (hasBOM) return 2;
        return 1;
    };

    const maxUnlocked = getMaxUnlockedPhase();
    const [currentStep, setCurrentStep] = useState(1);

    // Default user to highest phase
    useEffect(() => {
        if (maxUnlocked > 1) setCurrentStep(maxUnlocked);
    }, [activeProject?.id]);

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

    return (
        <div className="bg-slate-50 min-h-[85vh] flex flex-col font-sans relative rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* Header & CHEVRON TRACKER */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 flex flex-col xl:flex-row gap-4 justify-between items-center shadow-sm">
                <div className="flex items-center gap-4 shrink-0">
                    <button onClick={onClose} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 className="font-black text-xl text-slate-800">{activeProject?.name || "Loading Project..."}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{activeProject?.customerName || "Project Workspace"}</p>
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

            {/* Smart Prompt Action Center */}
            <div className="bg-indigo-50 border-b border-indigo-100 px-8 py-3 flex items-center justify-center text-indigo-800 text-xs shadow-inner">
                <i className="fas fa-robot text-indigo-500 mr-3 text-lg"></i>
                <span className="font-medium">
                    {currentStep === 1 && "Welcome. To begin, upload the signed SOW Quotation to establish the baseline Bill of Materials (BOM)."}
                    {currentStep === 2 && "BOM ingested. Upload MgC Discovery data, then map the discovered servers to the BOM in the Topology Mapper."}
                    {currentStep === 3 && "Scope locked by DTRB. Calculate your FinOps overlap budget and schedule your Iterative Migration Waves."}
                    {currentStep === 4 && "Strategy Approved. Run Pre-Flight OS Diagnostics before provisioning Landing Zones and Agents."}
                    {currentStep === 5 && "Cutover Ready. Follow the Interactive Runbook to finalize DNS, power down sources, and evaluate WAR."}
                </span>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
                {currentStep === 1 && <StepARB project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(2)} />}
                {currentStep === 2 && <StepArchitecture project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(3)} />}
                {currentStep === 3 && <StepPlanning project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(4)} />}
                {currentStep === 4 && <StepExecution project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(5)} />}
                {currentStep === 5 && <StepPostLive project={activeProject} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}
