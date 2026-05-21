import React, { useState } from 'react';

export default function StepPlanning({ project, onUpdateProject, onPromote, isCurrent, isPoC }) {
    const [showBudgetEstimator, setShowBudgetEstimator] = useState(false);
    const [showCutoverRunbook, setShowCutoverRunbook] = useState(false);

    const handlePoCToggle = () => {
        const newType = project.project_type === 'poc' ? 'standard' : 'poc';
        onUpdateProject('project_type', newType);
        alert(`Project type changed to ${newType === 'poc' ? 'Proof of Concept' : 'Standard'}`);
    };

    const handleBudgetUpdate = (budgetData) => {
        onUpdateProject('budget', budgetData);
        alert('Budget estimate updated');
    };

    return (
        <div className="p-8">
            <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                    <h3 className="font-black text-2xl text-slate-800">
                        <i className="fas fa-tasks text-emerald-600 mr-3"></i> 
                        Step 3: {isPoC ? 'PoC Budgeting' : 'Delivery Planning'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">
                        {isPoC 
                            ? 'Configure Proof of Concept budget cap and expiration timeline.'
                            : 'Finalize migration plan, budget, and cutover runbook.'}
                    </p>
                </div>
                {isCurrent && (
                    <button 
                        onClick={onPromote} 
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                        title="Advance to Execution phase"
                    >
                        Approve Plan & Advance <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                )}
            </div>

            {/* Project Type Toggle */}
            <div className="mb-8 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                            <i className="fas fa-flask text-amber-500"></i>
                            Project Type
                        </h4>
                        <p className="text-sm text-slate-600">
                            {isPoC 
                                ? 'Proof of Concept mode enabled. Post-Live WAR phase disabled. Strict budget cap and expiration TTL required.'
                                : 'Standard delivery mode. Full 5-phase lifecycle including Post-Live WAR.'}
                        </p>
                    </div>
                    <button 
                        onClick={handlePoCToggle}
                        className={`px-6 py-3 font-bold rounded-xl transition-colors ${isPoC ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
                    >
                        {isPoC ? 'Switch to Standard' : 'Switch to PoC'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget Estimator */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-money-bill-wave text-emerald-500"></i>
                            {isPoC ? 'PoC Budget Cap' : 'Budget Estimation'}
                        </h4>
                        <button 
                            onClick={() => setShowBudgetEstimator(!showBudgetEstimator)}
                            className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-xs rounded-lg transition-colors"
                        >
                            {showBudgetEstimator ? 'Hide' : 'Configure'}
                        </button>
                    </div>
                    
                    {showBudgetEstimator ? (
                        <div className="space-y-4">
                            {isPoC ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Hard Budget Cap (USD)
                                        </label>
                                        <input 
                                            type="number" 
                                            value={project.pocCap || 500}
                                            onChange={e => onUpdateProject('pocCap', parseInt(e.target.value) || 0)}
                                            className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-lg bg-slate-50 outline-none focus:border-emerald-500"
                                            placeholder="500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Cloud Infrastructure TTL (Expiration Date)
                                        </label>
                                        <input 
                                            type="date" 
                                            value={project.pocTtl || ''}
                                            onChange={e => onUpdateProject('pocTtl', e.target.value)}
                                            className="w-full p-3 border-2 border-rose-200 rounded-xl font-bold text-lg bg-rose-50 text-rose-900 outline-none focus:border-rose-500"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => onUpdateProject('pocCap', project.pocCap || 500)}
                                        className="w-full py-4 bg-slate-800 text-white font-black rounded-xl uppercase tracking-widest hover:bg-slate-900 transition-colors"
                                    >
                                        Authorize PoC Spend
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Compute</div>
                                            <div className="text-2xl font-black text-slate-800">$12,500</div>
                                            <div className="text-xs text-slate-600">Monthly</div>
                                        </div>
                                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                            <div className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Storage</div>
                                            <div className="text-2xl font-black text-slate-800">$3,200</div>
                                            <div className="text-xs text-slate-600">Monthly</div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="text-sm font-bold text-slate-700 mb-2">Total Estimated Monthly Cost</div>
                                        <div className="text-3xl font-black text-emerald-700">$15,700</div>
                                        <div className="text-xs text-slate-600 mt-1">Based on blueprint topology and region pricing</div>
                                    </div>
                                    <button 
                                        onClick={() => alert('Budget estimate saved')}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
                                    >
                                        Save Budget Estimate
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="h-48 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <i className="fas fa-calculator text-4xl text-slate-400 mb-3"></i>
                                <p className="text-sm text-slate-500">
                                    {isPoC 
                                        ? 'Configure PoC budget cap and expiration' 
                                        : 'View detailed budget estimation'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Cutover Runbook */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-book text-purple-500"></i>
                            Cutover Runbook
                        </h4>
                        <button 
                            onClick={() => setShowCutoverRunbook(!showCutoverRunbook)}
                            className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold text-xs rounded-lg transition-colors"
                        >
                            {showCutoverRunbook ? 'Hide' : 'View'}
                        </button>
                    </div>
                    
                    {showCutoverRunbook ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <h5 className="font-bold text-purple-800 mb-2">Migration Plan Tasks</h5>
                                <div className="space-y-2">
                                    {(project.migrationPlan || []).slice(0, 5).map((task, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-100">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-slate-800">{task.name || `Task ${index + 1}`}</div>
                                                <div className="text-xs text-slate-600">{task.owner || 'Unassigned'}</div>
                                            </div>
                                            <div className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                                                {task.status || 'pending'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => alert('Opening full migration plan editor')}
                                    className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                                >
                                    Edit Full Plan
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <i className="fas fa-clipboard-list text-4xl text-slate-400 mb-3"></i>
                                <p className="text-sm text-slate-500">
                                    {isPoC 
                                        ? 'PoC migration tasks and timeline' 
                                        : 'Detailed cutover runbook with tasks'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Summary */}
            <div className="mt-8 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Project Type</div>
                        <div className="text-xl font-black text-slate-800">
                            {isPoC ? 'Proof of Concept' : 'Standard Delivery'}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                            {isPoC ? '4-phase lifecycle' : '5-phase lifecycle'}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Budget Status</div>
                        <div className="text-xl font-black text-slate-800">
                            {isPoC 
                                ? `$${project.pocCap || 500} Cap` 
                                : 'Estimate Ready'}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                            {isPoC 
                                ? (project.pocTtl ? `TTL: ${project.pocTtl}` : 'No TTL set')
                                : 'Based on blueprint'}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <div className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Migration Plan</div>
                        <div className="text-xl font-black text-slate-800">
                            {(project.migrationPlan || []).length} Tasks
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                            {isPoC ? 'PoC-specific tasks' : 'Full cutover runbook'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}