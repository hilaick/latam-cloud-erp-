import React, { useState } from 'react';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    const [showWarReport, setShowWarReport] = useState(false);
    const [warData, setWarData] = useState({
        lessonsLearned: '',
        kpis: { uptime: 0, performance: 0, cost: 0, satisfaction: 0 },
        recommendations: ''
    });

    const kpis = project?.postLiveKpis || warData.kpis;
    const averageKpi = Math.round((kpis.uptime + kpis.performance + kpis.cost + kpis.satisfaction) / 4);

    const handleKpiChange = (key, value) => {
        const newKpis = { ...kpis, [key]: parseInt(value) || 0 };
        setWarData({ ...warData, kpis: newKpis });
    };

    const handleSaveWar = () => {
        onUpdateProject('postLiveKpis', warData.kpis);
        onUpdateProject('postLiveLessons', warData.lessonsLearned);
        onUpdateProject('postLiveRecommendations', warData.recommendations);
        alert('WAR report saved successfully');
    };

    const handleCompleteProject = () => {
        onUpdateProject('lifecycleState', '6_completed');
        alert('Project marked as completed and archived');
    };

    return (
        <div className="p-8">
            <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                    <h3 className="font-black text-2xl text-slate-800">
                        <i className="fas fa-flag-checkered text-purple-600 mr-3"></i> 
                        Step 5: Post-Live WAR (After Action Review)
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Document lessons learned, measure KPIs, and archive the project.
                    </p>
                </div>
                {isCurrent && (
                    <button 
                        onClick={onPromote} 
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                        title="Complete project and archive"
                    >
                        Complete Project <i className="fas fa-archive ml-2"></i>
                    </button>
                )}
            </div>

            {/* KPI Dashboard */}
            <div className="mb-8 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-chart-bar text-purple-500"></i>
                            Post-Live KPIs
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                            Measure project success against key performance indicators
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-purple-700">{averageKpi}%</div>
                        <div className="text-xs text-slate-500">Average Score</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { key: 'uptime', label: 'Uptime', icon: 'fa-server', color: 'bg-blue-100 text-blue-700' },
                        { key: 'performance', label: 'Performance', icon: 'fa-rocket', color: 'bg-emerald-100 text-emerald-700' },
                        { key: 'cost', label: 'Cost Efficiency', icon: 'fa-money-bill-wave', color: 'bg-amber-100 text-amber-700' },
                        { key: 'satisfaction', label: 'Satisfaction', icon: 'fa-smile', color: 'bg-purple-100 text-purple-700' }
                    ].map((kpi) => (
                        <div key={kpi.key} className="p-4 bg-white border border-slate-200 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color.split(' ')[0]}`}>
                                        <i className={`fas ${kpi.icon} ${kpi.color.split(' ')[1]}`}></i>
                                    </div>
                                    <div className="font-bold text-slate-800">{kpi.label}</div>
                                </div>
                                <div className="text-lg font-black text-slate-800">{kpis[kpi.key]}%</div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={kpis[kpi.key]}
                                onChange={(e) => handleKpiChange(kpi.key, e.target.value)}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lessons Learned */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-lightbulb text-amber-500"></i>
                            Lessons Learned
                        </h4>
                        <button 
                            onClick={() => setShowWarReport(true)}
                            className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold text-xs rounded-lg transition-colors"
                        >
                            Generate Report
                        </button>
                    </div>
                    
                    <textarea
                        value={warData.lessonsLearned}
                        onChange={(e) => setWarData({ ...warData, lessonsLearned: e.target.value })}
                        placeholder="What went well? What could be improved? Any surprises or blockers encountered?"
                        className="w-full h-48 p-4 border-2 border-slate-200 rounded-xl resize-none outline-none focus:border-amber-500 bg-slate-50/50"
                    />
                    
                    <div className="mt-4 text-xs text-slate-500">
                        Document key learnings for future projects. This will be archived with the project.
                    </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <i className="fas fa-bullseye text-emerald-500"></i>
                        Recommendations
                    </h4>
                    
                    <textarea
                        value={warData.recommendations}
                        onChange={(e) => setWarData({ ...warData, recommendations: e.target.value })}
                        placeholder="Recommendations for future migrations, process improvements, tooling suggestions..."
                        className="w-full h-48 p-4 border-2 border-slate-200 rounded-xl resize-none outline-none focus:border-emerald-500 bg-slate-50/50"
                    />
                    
                    <div className="mt-4 text-xs text-slate-500">
                        Actionable recommendations for process improvement.
                    </div>
                </div>
            </div>

            {/* Project Archive Section */}
            <div className="mt-8 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <i className="fas fa-archive text-slate-600"></i>
                            Project Archive
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                            Finalize and archive the project. This will move it to the completed projects list.
                        </p>
                    </div>
                    <button 
                        onClick={handleSaveWar}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
                    >
                        Save WAR Report
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i className="fas fa-file-pdf text-blue-600"></i>
                            </div>
                            <div>
                                <div className="font-bold text-blue-800">Final Report</div>
                                <div className="text-xs text-blue-600">Generate comprehensive project report</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => alert('Generating final report...')}
                            className="w-full py-2 bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold rounded-lg transition-colors"
                        >
                            Generate PDF
                        </button>
                    </div>
                    
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <i className="fas fa-share-alt text-emerald-600"></i>
                            </div>
                            <div>
                                <div className="font-bold text-emerald-800">Share with Team</div>
                                <div className="text-xs text-emerald-600">Share WAR with stakeholders</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => alert('Sharing WAR report...')}
                            className="w-full py-2 bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold rounded-lg transition-colors"
                        >
                            Share Report
                        </button>
                    </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-slate-800">Ready to Archive?</div>
                            <div className="text-sm text-slate-600">
                                Once archived, the project will be moved to completed projects.
                            </div>
                        </div>
                        <button 
                            onClick={handleCompleteProject}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                        >
                            <i className="fas fa-archive"></i>
                            Archive Project
                        </button>
                    </div>
                </div>
            </div>

            {/* WAR Report Modal */}
            {showWarReport && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex justify-between items-center">
                            <h3 className="font-black text-xl text-slate-800">WAR Report Preview</h3>
                            <button onClick={() => setShowWarReport(false)} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="space-y-6">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-2">Project Summary</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-slate-600">Project</div>
                                            <div className="font-bold">{project.name}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-600">Customer</div>
                                            <div className="font-bold">{project.blueprintData?.customer || 'Unknown'}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-600">Duration</div>
                                            <div className="font-bold">45 days</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-600">Overall Score</div>
                                            <div className="font-bold text-purple-700">{averageKpi}%</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2">KPIs</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(kpis).map(([key, value]) => (
                                            <div key={key} className="p-3 bg-white border border-slate-200 rounded-lg">
                                                <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                </div>
                                                <div className="text-2xl font-black text-slate-800 mt-1">{value}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2">Lessons Learned</h4>
                                    <div className="p-4 bg-white border border-slate-200 rounded-lg whitespace-pre-line">
                                        {warData.lessonsLearned || 'No lessons documented yet.'}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2">Recommendations</h4>
                                    <div className="p-4 bg-white border border-slate-200 rounded-lg whitespace-pre-line">
                                        {warData.recommendations || 'No recommendations documented yet.'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowWarReport(false)}
                                    className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Close
                                </button>
                                <button 
                                    onClick={() => {
                                        handleSaveWar();
                                        setShowWarReport(false);
                                    }}
                                    className="px-5 py-2 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md"
                                >
                                    Save & Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}