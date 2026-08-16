import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ERPContext } from '../../context/ERPContext';
import StepARB from './StepARB';
import StepArchitecture from './StepArchitecture';
import StepPlanning from './StepPlanning';
import StepExecution from './StepExecution';
import StepPostLive from './StepPostLive';
import { PreSalesQualificationMatrix } from '../../utils/helpers';

import HaltProjectModal from '../views/HaltProjectModal';

export default function ProjectWizard({ activeProject, onUpdateProject, onClose }) {
    const [showConfig, setShowConfig] = useState(false);
    const [showHaltModal, setShowHaltModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    
    const { customers, projects } = useContext(ERPContext);

    const uniqueSAs = useMemo(() => Array.from(new Set((projects || []).map(p => p.sa).filter(Boolean))), [projects]);
    const uniquePartners = useMemo(() => Array.from(new Set((projects || []).map(p => p.partner).filter(Boolean))), [projects]);

    const targetCountries = [
        "Mexico", "Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica", "Panama",
        "Colombia", "Venezuela", "Ecuador", "Peru", "Bolivia", "Chile", "Argentina", "Uruguay", "Paraguay", "Brazil",
        "Dominican Republic", "Haiti", "Cuba", "Jamaica", "Puerto Rico", "Trinidad and Tobago", "Bahamas", "Barbados", 
        "Dominica", "Grenada", "Saint Lucia", "Saint Vincent and the Grenadines", "Antigua and Barbuda", "Saint Kitts and Nevis",
        "Guyana", "Suriname", "French Guiana", "Guadeloupe", "Martinique", "Curaçao", "Aruba", "Bonaire", "Sint Maarten",
        "Saba", "Sint Eustatius", "Cayman Islands", "Turks and Caicos Islands", "British Virgin Islands", "US Virgin Islands",
        "Anguilla", "Montserrat", "Bermuda", "Other / TBD"
    ];

    // 🚨 FIX: Force all phases to be unlocked for full operations & development freedom
    const getMaxUnlockedPhase = () => {
        return 5; 
    };

    const maxUnlocked = getMaxUnlockedPhase();

    useEffect(() => {
        // Keep user on the step they clicked instead of auto-forcing them back
        if (!currentStep) setCurrentStep(1);
    }, [activeProject?.id]);

    // 🐛 FIX: Sync wizard step to lifecycleState when navigating from dashboard
    useEffect(() => {
        if (!activeProject?.lifecycleState) return;
        const lifecycleToStep = {
            '1_arb': 1, '2_architecture': 2, '3_planning': 3,
            '4_execution': 4, '5_postlive': 5,
        };
        const step = lifecycleToStep[activeProject.lifecycleState];
        if (step && step !== currentStep) {
            setCurrentStep(step);
        }
    }, [activeProject?.id]);

    const phases = [
        { id: 1, label: "1. ARB Handover", full: "Architecture Review Board & BOM Setup" },
        { id: 2, label: "2. Architecture", full: "Discovery, Mapper & DTRB Governance" },
        { id: 3, label: "3. Planning", full: "Strategy, FinOps & Runbooks" },
        { id: 4, label: "4. Execution", full: "Execution Control Plane" },
        { id: 5, label: "5. Post-Live", full: "Post-Live Governance & Billing" }
    ];

    const handlePhaseClick = (phaseId) => {
        setCurrentStep(phaseId);
        
        // Update lifecycleState based on selected phase
        const phaseMap = {
            1: '1_arb',
            2: '2_architecture', 
            3: '3_planning',
            4: '4_execution',
            5: '5_postlive'
        };
        
        if (phaseMap[phaseId] && activeProject?.id) {
            onUpdateProject(activeProject.id, 'lifecycleState', phaseMap[phaseId]);
        }
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
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex flex-col xl:flex-row gap-4 justify-between items-center shadow-sm">
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
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors" onClick={() => activeProject?.customerId ? window.location.hash = `#phase=crm&proj=none&customer=${activeProject.customerId}&cname=${encodeURIComponent(activeProject.customerName || '')}` : null} title="Open customer vault"><i className="fas fa-building mr-1"></i> {activeProject.customerName || "Project Workspace"}</p>
                    </div>
                </div>

                <div className="flex-1 w-full max-w-5xl overflow-x-auto custom-scrollbar pb-2 xl:pb-0">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 min-w-[700px]">
                        {phases.map((phase) => {
                            // Since maxUnlocked is 5, isLocked is always false
                            const isCompleted = phase.id < maxUnlocked;
                            const isCurrent = phase.id === currentStep;
                            const isLocked = false;

                            let baseStyle = "flex-1 relative flex items-center justify-center py-2.5 px-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-lg z-10 text-center cursor-pointer ";
                            
                            if (isLocked) baseStyle += "text-slate-400 bg-transparent cursor-not-allowed opacity-60";
                            else if (isCurrent) baseStyle += "bg-white text-indigo-600 shadow-sm border border-slate-200 scale-[1.02] z-20";
                            else baseStyle += "text-slate-600 hover:bg-slate-200/50 bg-transparent";

                            return (
                                <div key={phase.id} onClick={() => handlePhaseClick(phase.id)} className={baseStyle} title={phase.full}>
                                    {isCompleted && !isCurrent ? <i className="fas fa-check text-emerald-500 mr-2"></i> : null}
                                    <span className="truncate">{phase.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={() => setShowHaltModal(true)}
                    className="shrink-0 px-4 py-2 bg-red-700 hover:bg-red-600 text-red-100 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-600 transition-colors flex items-center gap-2 shadow-md"
                    title="Halt this project (cancel, suspend, or transfer)"
                >
                    <i className="fas fa-hand-paper"></i> Halt Project
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
                {currentStep === 1 && <StepARB project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(2)} />}
                {currentStep === 2 && <StepArchitecture project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(3)} />}
                {currentStep === 3 && <StepPlanning project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(4)} />}
                {currentStep === 4 && <StepExecution project={activeProject} onUpdateProject={onUpdateProject} onPromote={() => setCurrentStep(5)} />}
                {currentStep === 5 && <StepPostLive project={activeProject} onUpdateProject={onUpdateProject} isCurrent={true} />}
            </div>

            {showConfig && (
                <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-8 animate-fade-in pointer-events-auto" style={{ zIndex: 99999 }}>
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowConfig(false)}></div>
                    
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative flex flex-col max-h-full overflow-hidden animate-slide-up border border-slate-700">
                        
                        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-lg flex items-center"><i className="fas fa-sliders-h text-indigo-400 mr-3"></i> Project Details</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Core Identity & Configuration</p>
                            </div>
                            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white transition-colors p-2 cursor-pointer">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        
                        <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 bg-slate-50 custom-scrollbar">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Project Name (Scope)</label>
                                    <input 
                                        type="text" 
                                        value={activeProject.name || ''} 
                                        onChange={(e) => onUpdateProject(activeProject.id, 'name', e.target.value.toUpperCase())}
                                        className="w-full font-bold text-sm text-slate-800 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-indigo-500 uppercase" 
                                    />
                                </div>
                                
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Customer Account</label>
                                    <input 
                                        type="text" 
                                        list="config-customers"
                                        value={activeProject.customerName || ''} 
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            onUpdateProject(activeProject.id, 'customerName', val);
                                            const matched = (customers || []).find(c => c.name.toUpperCase() === val);
                                            if (matched) onUpdateProject(activeProject.id, 'customerId', matched.id);
                                        }}
                                        className="w-full font-bold text-sm text-slate-800 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-indigo-500 uppercase" 
                                    />
                                    <datalist id="config-customers">{(customers || []).map(c => <option key={c.id} value={c.name} />)}</datalist>
                                </div>
                                
                                <div className="bg-slate-100 p-5 rounded-xl border border-slate-200 shadow-inner opacity-70 cursor-not-allowed">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">System Project ID</label>
                                    <div className="font-mono text-xs text-slate-500 font-bold border-b border-transparent pb-1">{activeProject.id || 'N/A'}</div>
                                </div>
                                
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Sales Architect</label>
                                    <input 
                                        type="text" 
                                        list="config-sa"
                                        value={activeProject.sa || ''} 
                                        onChange={(e) => onUpdateProject(activeProject.id, 'sa', e.target.value.toUpperCase())}
                                        placeholder="Unassigned"
                                        className="w-full font-bold text-sm text-indigo-600 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-indigo-500 uppercase" 
                                    />
                                    <datalist id="config-sa">{uniqueSAs.map(sa => <option key={sa} value={sa} />)}</datalist>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Delivery Partner</label>
                                    <input 
                                        type="text" 
                                        list="config-partner"
                                        value={activeProject.partner || ''} 
                                        onChange={(e) => onUpdateProject(activeProject.id, 'partner', e.target.value.toUpperCase())}
                                        placeholder="TBD"
                                        className="w-full font-bold text-sm text-slate-700 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-indigo-500 uppercase" 
                                    />
                                    <datalist id="config-partner">{uniquePartners.map(pt => <option key={pt} value={pt} />)}</datalist>
                                </div>
                                
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Deployment Country</label>
                                    <div className="relative">
                                        <i className="fas fa-globe-americas absolute left-0 top-1 text-slate-400"></i>
                                        <select 
                                            value={activeProject.country || ''} 
                                            onChange={(e) => onUpdateProject(activeProject.id, 'country', e.target.value)}
                                            className="w-full font-bold text-sm text-slate-800 uppercase bg-transparent border-b border-slate-200 outline-none pb-1 pl-6 focus:border-indigo-500 cursor-pointer"
                                        >
                                            <option value="" disabled>-- Select Country --</option>
                                            {targetCountries.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Target MRR ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-0 top-0 font-black text-base text-emerald-600">$</span>
                                        <input 
                                            type="number" 
                                            value={activeProject.mrr === undefined || activeProject.mrr === null ? '' : activeProject.mrr} 
                                            onChange={(e) => onUpdateProject(activeProject.id, 'mrr', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full font-black text-base text-emerald-600 bg-transparent border-b border-slate-200 outline-none pb-1 pl-4 focus:border-emerald-500" 
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

                            <div className="pt-6 border-t border-slate-200 mt-6">
                                <h4 className="font-black text-sm text-slate-800 uppercase mb-4"><i className="fas fa-random text-purple-500 mr-2"></i> Pre-Sales Qualification</h4>
                                
                                <div className="overflow-x-auto pb-4">
                                    <PreSalesQualificationMatrix 
                                        triage={{
                                            project_type: Array.isArray(activeProject?.project_type) ? activeProject.project_type : (activeProject?.project_type ? [activeProject.project_type] : ['standard']),
                                            migrationScope: activeProject?.migrationScope || (activeProject?.project_type === 'greenfield' ? [] : ['compute']),
                                            sourceEnvironment: activeProject?.sourceEnvironment || 'VMware / On-Premise',
                                            authLevel: activeProject?.authLevel || (activeProject?.project_type === 'greenfield' ? [] : ['Read-Only (Customer Managed)']),
                                            deliveryScope: activeProject?.deliveryScope || 'turnkey'
                                        }} 
                                        setTriage={(newTriage) => {
                                            onUpdateProject(activeProject.id, {
                                                project_type: newTriage.project_type,
                                                migrationScope: newTriage.migrationScope,
                                                sourceEnvironment: newTriage.sourceEnvironment,
                                                authLevel: newTriage.authLevel,
                                                deliveryScope: newTriage.deliveryScope
                                            });
                                        }} 
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Workloads (VMs)</label>
                                        <input 
                                            type="number" 
                                            value={activeProject.estimatedWorkloads === undefined || activeProject.estimatedWorkloads === null ? '' : activeProject.estimatedWorkloads} 
                                            onChange={(e) => onUpdateProject(activeProject.id, 'estimatedWorkloads', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full font-bold text-sm text-slate-800 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-purple-500" 
                                        />
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Est. Labor (hrs)</label>
                                        <input 
                                            type="number" 
                                            value={activeProject.estimatedMigrationHours === undefined || activeProject.estimatedMigrationHours === null ? '' : activeProject.estimatedMigrationHours} 
                                            onChange={(e) => onUpdateProject(activeProject.id, 'estimatedMigrationHours', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full font-bold text-sm text-slate-800 bg-transparent border-b border-slate-200 outline-none pb-1 focus:border-purple-500" 
                                        />
                                    </div>

                                    <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 shadow-sm hover:border-purple-400 transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-purple-600 mb-2">Complexity</label>
                                        <select 
                                            value={activeProject.complexityLevel || 'Medium'} 
                                            onChange={(e) => onUpdateProject(activeProject.id, 'complexityLevel', e.target.value)}
                                            className="w-full font-black text-sm text-purple-900 bg-transparent border-b border-purple-300 outline-none pb-1 focus:border-purple-600 cursor-pointer"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Ultra-High">Ultra-High</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-white border-t border-slate-200 shrink-0 flex justify-end">
                            <button onClick={() => setShowConfig(false)} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-colors cursor-pointer">
                                Save & Close
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {showHaltModal && (
                <HaltProjectModal
                    project={activeProject}
                    onClose={() => setShowHaltModal(false)}
                />
            )}
        </div>
    );
}
