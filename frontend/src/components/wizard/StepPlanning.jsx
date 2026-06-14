import React, { useState } from 'react';
import PhysicsEngine from './PhysicsEngine';
import WBSImportView from './WBSImportView';

export default function StepPlanning({ project, onUpdateProject, onPromote }) {
    // 🚨 Removed 'cutover' from subTabs
    const [subTab, setSubTab] = useState('timeline');

    return (
        <div className="animate-fade-in pb-12">
            <div className="mb-8 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-4 md:px-8">
                <div>
                    <h3 className="font-black text-2xl text-slate-800"><i className="fas fa-calendar-alt text-blue-500 mr-3"></i> Step 3: Migration Planning</h3>
                    <p className="text-sm text-slate-500 mt-2">Interactive timeline physics and WBS task ingestion.</p>
                </div>
                <button onClick={onPromote} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95 whitespace-nowrap">
                    Proceed to Execution <i className="fas fa-arrow-right ml-2"></i>
                </button>
            </div>

            <div className="px-4 md:px-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
                <button 
                    onClick={() => setSubTab('timeline')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-project-diagram mr-2"></i> 1. Timeline Physics
                </button>
                <button 
                    onClick={() => setSubTab('wbs')} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${subTab === 'wbs' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-tasks mr-2"></i> 2. WBS & Task Master
                </button>
            </div>

            <div className="px-4 md:px-8">
                {subTab === 'timeline' && <PhysicsEngine project={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'wbs' && <WBSImportView activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    );
}
