import React, { useState } from 'react';
import DedicatedMigrationPlan from './DedicatedMigrationPlan';
import FinOpsDashboard from '../views/FinOpsDashboard'; // 🚨 NEW: Imported the Cost Center

export default function StepPlanning({ project, onUpdateProject }) {
    const [subTab, setSubTab] = useState('wbs');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6">
                <button 
                    onClick={() => setSubTab('wbs')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'wbs' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-tasks mr-2"></i> 1. Phase 3 WBS & RACI
                </button>
                <button 
                    onClick={() => setSubTab('finops')} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${subTab === 'finops' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    <i className="fas fa-file-invoice-dollar mr-2"></i> 2. Partner FinOps Cost Center
                </button>
            </div>

            {subTab === 'wbs' && (
                <DedicatedMigrationPlan activeProject={project} onUpdateProject={onUpdateProject} />
            )}

            {subTab === 'finops' && (
                <div className="animate-slide-up">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 flex items-start gap-4 shadow-sm">
                        <i className="fas fa-info-circle text-emerald-600 text-xl mt-1"></i>
                        <div>
                            <h4 className="font-black text-emerald-800 text-sm">Financial Oversight</h4>
                            <p className="text-xs text-emerald-700 mt-1">This module tracks your gross margins, coupon allocation, and the expected Huawei BSS API overhead incurred during the delivery phase (e.g., SMS sync nodes, DRS clusters). Extend your dates in the Master Pipeline to see how delays impact your overhead costs.</p>
                        </div>
                    </div>
                    {/* 🚨 MOUNTS THE COST CENTER DIRECTLY INSIDE THE PROJECT FLOW */}
                    <FinOpsDashboard />
                </div>
            )}
        </div>
    );
}
