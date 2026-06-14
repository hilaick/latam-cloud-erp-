import React, { useState } from 'react';
import PhysicsEngine from './PhysicsEngine';
import FinOpsCalculator from './FinOpsCalculator';
import DedicatedMigrationPlan from './DedicatedMigrationPlan';
import ToolRecommendationView from './ToolRecommendationView';

export default function StepPlanning({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('physics');

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6 flex-wrap">
                <button 
                    onClick={() => setSubTab('physics')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'physics' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    1. Wave Physics SLA
                </button>
                <button 
                    onClick={() => setSubTab('finops')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'finops' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    2. FinOps Budget
                </button>
                <button 
                    onClick={() => setSubTab('wbs')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'wbs' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    3. WBS & RACI Matrix
                </button>
                <button 
                    onClick={() => setSubTab('tools')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'tools' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    4. Tool Recommendations
                </button>
            </div>

            {/* Sub-Components rendered based on state */}
            {subTab === 'physics' && <PhysicsEngine activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'finops' && <FinOpsCalculator activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'wbs' && <DedicatedMigrationPlan activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'tools' && <ToolRecommendationView activeProject={project} onUpdateProject={onUpdateProject} />}
            
            {/* Execution Promotion Gate */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-12 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Ready to execute migration?</h3>
                    <p className="text-slate-600 mt-1">
                        Complete planning phase and transition the project to the Execution Control Plane.
                    </p>
                </div>
                <button
                    onClick={() => onPromote && onPromote('execution')}
                    className="px-8 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-md flex items-center"
                >
                    Promote to Execution Phase <i className="fas fa-arrow-right ml-3"></i>
                </button>
            </div>
        </div>
    );
}
