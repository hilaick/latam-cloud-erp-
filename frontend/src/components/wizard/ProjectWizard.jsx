import React, { useState, useEffect } from 'react';
import StepArchitecture from './StepArchitecture';
import TopologyMapperView from './TopologyMapperView';
import StepPlanning from './StepPlanning';
import StepExecution from './StepExecution';
import StepPostLive from './StepPostLive';

export default function ProjectWizard({ activeProject, onUpdateProject, onClose }) {
    // Determine the Maximum Unlocked Phase based on Project Data
    const getMaxUnlockedPhase = () => {
        if (!activeProject) return 1;
        
        const hasDiscovery = activeProject.mgcData || activeProject.blueprintData;
        const hasMappedNodes = activeProject.mapperNodes && activeProject.mapperNodes.length > 0;
        const hasBudget = activeProject.budget || activeProject.financials;
        const hasExecution = activeProject.execStatus;
        const isCutoverReady = ['cutover_ready', 'completed'].includes(activeProject.execStatus);

        if (isCutoverReady) return 5;
        if (hasBudget || hasExecution) return 4;
        if (hasMappedNodes) return 3;
        if (hasDiscovery) return 2;
        return 1;
    };

    const maxUnlocked = getMaxUnlockedPhase();
    const [currentStep, setCurrentStep] = useState(1);

    // If user opens a project that is already at execution, default them to the highest phase
    useEffect(() => {
        if (maxUnlocked > 1) setCurrentStep(maxUnlocked);
    }, [activeProject?.id]);

    const phases = [
        { id: 1, label: "1. Discovery", full: "Discovery & Architecture" },
        { id: 2, label: "2. Topology", full: "Topology Mapper" },
        { id: 3, label: "3. Planning", full: "Strategy & Planning" },
        { id: 4, label: "4. Execution", full: "Execution Control" },
        { id: 5, label: "5. Post-Live", full: "Post-Live Governance" }
    ];

    const handlePhaseClick = (phaseId) => {
        if (phaseId <= maxUnlocked) setCurrentStep(phaseId);
    };

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col font-sans relative">
            {/* Header & CHEVRON TRACKER */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-4 shrink-0">
                    <button onClick={onClose} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 className="font-black text-xl text-slate-800">{activeProject?.name || "New Project"}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{activeProject?.customerName || "No Customer Linked"}</p>
                    </div>
                </div>

                {/* The Chevron Progress Bar */}
                <div className="flex-1 w-full max-w-4xl overflow-x-auto custom-scrollbar pb-2 md:pb-0">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 min-w-[600px]">
                        {phases.map((phase) => {
                            const isCompleted = phase.id < maxUnlocked;
                            const isCurrent = phase.id === currentStep;
                            const isLocked = phase.id > maxUnlocked;

                            let baseStyle = "flex-1 relative flex items-center justify-center py-2.5 px-4 text-xs font-black uppercase tracking-widest transition-all rounded-lg z-10 text-center cursor-pointer ";
                            
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
                    {currentStep === 1 && "Welcome. To begin, upload the SOW Blueprint and MgC Discovery data to establish technical and financial baselines."}
                    {currentStep === 2 && "Data ingested successfully. Drag and drop discovered servers to their quoted SOW lines to lock in the project scope."}
                    {currentStep === 3 && "Scope locked. Calculate your FinOps overlap budget and schedule your Iterative Migration Waves."}
                    {currentStep === 4 && "Strategy Approved. Run Pre-Flight OS Diagnostics before provisioning Landing Zones and Agents."}
                    {currentStep === 5 && "Cutover Ready. Follow the Interactive Runbook to finalize DNS, power down sources, and attach CBR vaults."}
                </span>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {currentStep === 1 && <StepArchitecture project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(2)} />}
                {currentStep === 2 && <TopologyMapperView activeProject={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(3)} />}
                {currentStep === 3 && <StepPlanning project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(4)} />}
                {currentStep === 4 && <StepExecution project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(5)} />}
                {currentStep === 5 && <StepPostLive project={activeProject} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}
