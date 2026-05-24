import React, { useContext } from 'react';
import { ERPContext } from '../../context/ERPContext';
import StepARB from './StepARB';
import StepArchitecture from './StepArchitecture';
import StepPlanning from './StepPlanning';
import StepExecution from './StepExecution';
import StepPostLive from './StepPostLive';

export default function ProjectWizard() {
    // 🚨 FIX 1: We extract the true database-connected handleUpdateProject from Context
    const { projects, activeProjectId, handleUpdateProject } = useContext(ERPContext);
    const project = projects.find(p => String(p.id) === String(activeProjectId));

    if (!project) {
        return <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-2xl border border-slate-200 mt-8 shadow-sm">Please select a project from the Pipeline or Radar.</div>;
    }

    const stages = [
        { id: '1_arb', name: '1. ARB Intake', icon: 'fa-door-open' },
        { id: '2_architecture', name: '2. Architecture', icon: 'fa-project-diagram' },
        { id: '3_planning', name: '3. Planning', icon: 'fa-tasks' },
        { id: '4_execution', name: '4. Execution', icon: 'fa-rocket' },
        { id: '5_postlive', name: '5. Post-Live', icon: 'fa-award' }
    ];

    // 🚨 FIX 2: The missing Promotion Engine
    // This calculates the current step and automatically advances the project to the next one!
    const handlePromote = () => {
        const currentIndex = stages.findIndex(s => s.id === project.lifecycleState);
        if (currentIndex >= 0 && currentIndex < stages.length - 1) {
            const nextState = stages[currentIndex + 1].id;
            handleUpdateProject(project.id, 'lifecycleState', nextState);
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top on tab change
        } else if (currentIndex === stages.length - 1) {
            handleUpdateProject(project.id, 'lifecycleState', '6_completed');
            alert("Project Closed Successfully!");
        }
    };

    const renderStage = () => {
        // 🚨 FIX 3: We now pass onPromote={handlePromote} and isCurrent={true} to every step
        switch(project.lifecycleState) {
            case '1_arb': return <StepARB project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            case '2_architecture': return <StepArchitecture project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            case '3_planning': return <StepPlanning project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            case '4_execution': return <StepExecution project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            case '5_postlive': return <StepPostLive project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
            default: return <StepARB project={project} onUpdateProject={handleUpdateProject} onPromote={handlePromote} isCurrent={true} />;
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">{project.name}</h2>
                    <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">SA: {project.sa} | Country: {project.country}</div>
                </div>
                <div className="font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-lg shadow-sm">${project.mrr}</div>
            </div>

            <div className="flex gap-2 bg-slate-200 p-1.5 rounded-xl overflow-x-auto shadow-inner">
                {stages.map(stg => (
                    <button key={stg.id} onClick={() => handleUpdateProject(project.id, 'lifecycleState', stg.id)} className={`flex-1 min-w-[150px] py-3 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${project.lifecycleState === stg.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}>
                        <i className={`fas ${stg.icon} mr-2`}></i> {stg.name}
                    </button>
                ))}
            </div>

            {renderStage()}
        </div>
    );
}
