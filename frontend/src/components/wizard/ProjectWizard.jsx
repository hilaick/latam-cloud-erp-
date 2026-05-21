import React, { useState, useEffect, useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import StepARB from './StepARB';
import StepArchitecture from './StepArchitecture';
import StepPlanning from './StepPlanning';
import StepExecution from './StepExecution';
import StepPostLive from './StepPostLive';

export default function ProjectWizard() {
    const { activeProjectId, projects, fetchState } = useContext(ERPContext);
    const [viewIndex, setViewIndex] = useState(0);
    
    const activeProject = projects.find(p => String(p.id) === String(activeProjectId));
    
    if (!activeProject) {
        return (
            <div className="animate-fade-in max-w-[1800px] mx-auto flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center text-slate-400">
                    <i className="fas fa-folder-open text-6xl mb-4 opacity-50"></i>
                    <h3 className="font-black text-xl">No Project Selected</h3>
                    <p className="mt-2">Select a project from the context dropdown to view its command center.</p>
                </div>
            </div>
        );
    }

    const isPoC = activeProject?.project_type === "poc";
    
    // Dynamic Phase Arrays: Remove Post-Live if PoC
    const states = isPoC 
        ? ['1_arb', '2_architecture', '3_planning', '4_execution']
        : ['1_arb', '2_architecture', '3_planning', '4_execution', '5_postlive'];
        
    const stepLabels = isPoC
        ? ['ARB Intake', 'Architecture', 'PoC Budgeting', 'Active Execution']
        : ['ARB Intake', 'Architecture', 'Delivery Planning', 'Active Execution', 'Post-Live WAR'];

    const currentIndex = Math.max(0, states.indexOf(activeProject?.lifecycleState || '1_arb'));
    
    useEffect(() => { 
        setViewIndex(currentIndex); 
    }, [currentIndex]);

    const handleUpdateProject = async (fieldOrUpdates, value) => {
        let updates;
        if (typeof fieldOrUpdates === 'string' && value !== undefined) {
            updates = { [fieldOrUpdates]: value };
        } else if (typeof fieldOrUpdates === 'object') {
            updates = fieldOrUpdates;
        } else {
            return;
        }

        try {
            const response = await fetch('/api/erp/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeProjectId, ...updates })
            });
            
            if (response.ok) {
                fetchState(); // Refresh data from server
            }
        } catch (error) {
            console.error('Failed to update project:', error);
        }
    };

    const promoteState = () => {
        if (currentIndex < states.length - 1) {
            const nextState = states[currentIndex + 1];
            handleUpdateProject('lifecycleState', nextState);
            alert(`Project Promoted to: ${stepLabels[currentIndex + 1]}`);
        } else if (isPoC && currentIndex === states.length - 1) {
            // PoC finishes at Execution
            handleUpdateProject('lifecycleState', '6_completed');
            alert("PoC Execution Complete. Project Archived.");
        }
    };

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto flex flex-col">
            {isPoC && (
                <div className="bg-amber-100 border-lplace-4 border-amber-500 text-amber-800 p-4 mb-4 rounded shadow-sm flex items-center">
                    <i className="fas fa-bolt text-2xl mr-4"></i>
                    <div>
                        <p className="font-black">Fast-Track PoC Lifecycle Active</p>
                        <p className="text-xs">Post-Live WAR phase disabled. Strict budget cap and Expiration TTL required.</p>
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-5 flex-1">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-blue-200 shrink-0">
                        <i className="fas fa-building text-blue-600 text-2xl"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 leading-tight">{activeProject.name}</h2>
                        <p className="text-xs font-bold text-slate-500 mt-1 tracking-widest uppercase">Project Command Center</p>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 flex-1 justify-end max-w-3xl">
                    {states.map((s, idx) => {
                        const isCompleted = idx < currentIndex;
                        const isActive = idx === currentIndex;
                        const isViewing = idx === viewIndex;
                        let cssClass = "step-pending cursor-pointer hover:bg-slate-50";
                        if (isActive) cssClass = "step-active shadow-md ring-2 ring-blue-200";
                        else if (isCompleted) cssClass = "step-completed cursor-pointer hover:bg-emerald-100";
                        if (isViewing && !isActive) cssClass += " ring-2 ring-slate-300";

                        return (
                            <React.Fragment key={s}>
                                <div 
                                    onClick={() => idx <= currentIndex ? setViewIndex(idx) : null} 
                                    className={`flex-1 text-center py-2 px-3 rounded-xl border-2 transition-all ${cssClass} ${idx > currentIndex ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="text-[9px] font-black uppercase tracking-widest opacity-80">Step {idx+1}</div>
                                    <div className="text-xs font-bold mt-0.5">{stepLabels[idx]}</div>
                                </div>
                                {idx < states.length - 1 && <div className="w-4 h-0.5 bg-slate-300 shrink-0"></div>}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 pb-12">
                {viewIndex === 0 && (
                    <StepARB 
                        project={activeProject} 
                        onUpdateProject={handleUpdateProject} 
                        onPromote={promoteState} 
                        isCurrent={currentIndex === 0} 
                    />
                )}
                {viewIndex === 1 && (
                    <StepArchitecture 
                        project={activeProject} 
                        onUpdateProject={handleUpdateProject} 
                        onPromote={promoteState} 
                        isCurrent={currentIndex === 1} 
                    />
                )}
                {viewIndex === 2 && (
                    <StepPlanning 
                        project={activeProject} 
                        onUpdateProject={handleUpdateProject} 
                        onPromote={promoteState} 
                        isCurrent={currentIndex === 2} 
                        isPoC={isPoC}
                    />
                )}
                {viewIndex === 3 && (
                    <StepExecution 
                        project={activeProject} 
                        onUpdateProject={handleUpdateProject} 
                        onPromote={promoteState} 
                        isCurrent={currentIndex === 3} 
                    />
                )}
                {viewIndex === 4 && !isPoC && (
                    <StepPostLive 
                        project={activeProject} 
                        onUpdateProject={handleUpdateProject} 
                        onPromote={promoteState} 
                        isCurrent={currentIndex === 4} 
                    />
                )}
            </div>
        </div>
    );
}