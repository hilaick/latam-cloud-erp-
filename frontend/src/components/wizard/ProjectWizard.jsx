import React, { useState, useEffect, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import StepARB from './StepARB';
import StepArchitecture from './StepArchitecture';
import StepPlanning from './StepPlanning';
import StepExecution from './StepExecution';
import StepPostLive from './StepPostLive';

export default function ProjectWizard({ activeProject, onUpdateProject, onClose }) {
    const [showConfig, setShowConfig] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    
    // 🚨 Fetch customers from context to populate the dropdown
    const { customers } = useContext(ERPContext);

    // Safely determine the Max Unlocked Phase using Optional Chaining (?.)
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

            {/* 🚨 FULLY INTERACTIVE CONFIGURATION MODAL */}
            {showConfig && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfig(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        <div className="px-8 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-lg flex items-center"><i className="fas fa-sliders-h text-indigo-400 mr-3"></i> Project Details</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Core Identity & Configuration</p>
                            </div>
                            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 overflow-y-auto custom-scrollbar">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Project Name</label>
                                <input 
                                    type="text" 
                                    value={activeProject.name || ''} 
                                    onChange={(e) => onUpdateProject(activeProject.id, 'name', e.target.value)}
                                    className="w-full font-bold text-sm text-slate-800 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-indigo-500" 
                                />
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Customer Account</label>
                                <select 
                                    value={activeProject.customerId || ''} 
                                    onChange={(e) => {
                                        const cust = (customers || []).find(c => String(c.id) === String(e.target.value));
                                        if (cust) {
                                            onUpdateProject(activeProject.id, 'customerId', cust.id);
                                            onUpdateProject(activeProject.id, 'customerName', cust.name);
                                        }
                                    }}
                                    className="w-full font-bold text-sm text-slate-800 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-indigo-500 cursor-pointer"
                                >
                                    <option value="" disabled>-- Select Customer --</option>
                                    {(customers || []).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="bg-slate-100 p-5 rounded-xl border border-slate-200 shadow-inner opacity-70 cursor-not-allowed">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">System Project ID</label>
                                <div className="font-mono text-xs text-slate-500 font-bold border-b border-transparent pb-1">{activeProject.id || 'N/A'}</div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Sales Architect</label>
                                <input 
                                    type="text" 
                                    value={activeProject.sa || ''} 
                                    onChange={(e) => onUpdateProject(activeProject.id, 'sa', e.target.value)}
                                    placeholder="Unassigned"
                                    className="w-full font-bold text-sm text-indigo-600 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-indigo-500" 
                                />
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Target MRR ($)</label>
                                <div className="relative">
                                    <span className="absolute left-0 top-0 font-black text-base text-emerald-600">$</span>
                                    <input 
                                        type="number" 
                                        value={activeProject.mrr || ''} 
                                        onChange={(e) => onUpdateProject(activeProject.id, 'mrr', Number(e.target.value))}
                                        className="w-full font-black text-base text-emerald-600 bg-transparent border-b border-slate-200 outline-none pb-1 pl-4 focus:border-emerald-500" 
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Deployment Country</label>
                                <div className="relative">
                                    <i className="fas fa-globe-americas absolute left-0 top-1 text-slate-400"></i>
                                    <input 
                                        type="text" 
                                        value={activeProject.country || ''} 
                                        onChange={(e) => onUpdateProject(activeProject.id, 'country', e.target.value)}
                                        placeholder="e.g. Mexico, Brazil"
                                        className="w-full font-bold text-sm text-slate-800 uppercase bg-transparent border-b border-slate-200 outline-none pb-1 pl-6 focus:border-indigo-500" 
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Date (Kickoff)</label>
                                <input 
                                    type="date" 
                                    value={activeProject.kickoff || activeProject.kickoffDate || activeProject.startDate || ''} 
                                    onChange={(e) => onUpdateProject(activeProject.id, 'kickoff', e.target.value)}
                                    className="w-full font-mono font-bold text-sm text-slate-700 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-indigo-500 cursor-pointer" 
                                />
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Go-Live Cutover (Target Date)</label>
                                <input 
                                    type="date" 
                                    value={activeProject.date || activeProject.targetDate || activeProject.goLiveDate || ''} 
                                    onChange={(e) => onUpdateProject(activeProject.id, 'date', e.target.value)}
                                    className="w-full font-mono font-black text-sm text-emerald-600 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-emerald-500 cursor-pointer" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
