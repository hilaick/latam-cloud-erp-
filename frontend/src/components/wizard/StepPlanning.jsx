import React, { useState } from 'react';
import FinOpsCalculator from './FinOpsCalculator';
import DedicatedMigrationPlan from './DedicatedMigrationPlan';
import WBSImportView from './WBSImportView';
import CutoverRunbookView from './CutoverRunbookView';

export default function StepPlanning({ project, onUpdateProject, onPromote, isCurrent }) {
    // FIX: Default to 'plan' (Migration Plan) instead of 'budget' or 'runbook'
    const [subTab, setSubTab] = useState('plan');
    const isPoC = project?.project_type === 'poc';

    return (
        <div className="animate-fade-in">
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-2xl">
                <div className="flex flex-wrap gap-2">
                    <button onClick={()=>setSubTab('budget')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='budget'?'bg-emerald-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-file-invoice-dollar mr-2"></i> 1. FinOps Budget</button>
                    <button onClick={()=>setSubTab('plan')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='plan'?'bg-blue-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-tasks mr-2"></i> 2. Migration Plan (WBS)</button>
                    <button onClick={()=>setSubTab('wbs')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='wbs'?'bg-purple-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-sitemap mr-2"></i> 3. WBS Import</button>
                    <button onClick={()=>setSubTab('runbook')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='runbook'?'bg-purple-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-calendar-alt mr-2"></i> 4. Cutover Runbook</button>
                </div>
                {isCurrent && <button onClick={onPromote} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">Lock Plan & Start Delivery <i className="fas fa-arrow-right ml-2"></i></button>}
            </div>
            <div className="p-8 bg-slate-100/50 rounded-b-2xl border-x border-b border-slate-200">
                {subTab === 'budget' && <FinOpsCalculator project={project} onUpdateProject={onUpdateProject} isPoC={isPoC} />}
                {subTab === 'plan' && <DedicatedMigrationPlan project={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'wbs' && <WBSImportView activeProject={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'runbook' && <CutoverRunbookView activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}
