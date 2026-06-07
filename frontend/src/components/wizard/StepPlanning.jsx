import React, { useState } from 'react';
import PhysicsEngine from './PhysicsEngine';
import FinOpsCalculator from './FinOpsCalculator';
import DedicatedMigrationPlan from './DedicatedMigrationPlan';
import CutoverRunbookView from './CutoverRunbookView';

export default function StepPlanning({ project, onUpdateProject, onPromote }) {
    const [subTab, setSubTab] = useState('physics');

    return (
        <div className="space-y-6 animate-fade-in">
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
                    onClick={() => setSubTab('runbook')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'runbook' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    4. Cutover Runbook
                </button>
            </div>

            {/* Sub-Components rendered based on state */}
            {subTab === 'physics' && <PhysicsEngine activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'finops' && <FinOpsCalculator activeProject={project} onUpdateProject={onUpdateProject} />}
            {subTab === 'wbs' && <DedicatedMigrationPlan activeProject={project} onUpdateProject={onUpdateProject} />}
            
            {subTab === 'runbook' && (
                <div className="space-y-6 animate-fade-in">
                    <CutoverRunbookView activeProject={project} onUpdateProject={onUpdateProject} />
                    
                    {/* Execution Promotion Gate */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h4 className="font-black text-slate-800 text-lg">Lock Plan & Execute</h4>
                            <p className="text-xs text-slate-500 mt-1">Once the planning phase is approved, promote the project to Active Execution.</p>
                        </div>
                        <button 
                            onClick={onPromote} 
                            className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-3 w-full md:w-auto justify-center"
                        >
                            <span>Proceed to Execution</span>
                            <i className="fas fa-rocket"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
