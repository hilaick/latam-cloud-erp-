import React, { useState, useEffect } from 'react';

export default function StepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    // 1. Initialize State from Database (or default to 50%)
    const [r, setR] = useState(project?.war?.r || 50); // Resilience
    const [s, setS] = useState(project?.war?.s || 50); // Security
    const [p, setP] = useState(project?.war?.p || 50); // Performance
    const [c, setC] = useState(project?.war?.c || 50); // Cost Optimization
    const [o, setO] = useState(project?.war?.o || 50); // Operational Excellence

    // 2. Sync state if the active project changes
    useEffect(() => {
        if (project?.war) {
            setR(project.war.r);
            setS(project.war.s);
            setP(project.war.p);
            setC(project.war.c);
            setO(project.war.o);
        }
    }, [project]);

    // 3. Calculation & Validation
    const score = Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5);
    const isCertified = score >= 80;

    // 4. Save to PostgreSQL
    const saveContext = () => {
        onUpdateProject(project.id, 'war', { r, s, p, c, o });
        alert("WAR Sign-Off Saved to Database.");
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-12">
            
            {/* Header Area */}
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center rounded-t-2xl gap-4">
                <div>
                    <h3 className="font-black text-lg tracking-wide text-slate-800">
                        <i className="fas fa-award text-amber-500 mr-2"></i> Step 5: Post-Live WAR Sign-Off
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Evaluate the delivered architecture against the 5 Cloud Pillars.</p>
                </div>
                {isCurrent && (
                    <button
                        onClick={onPromote}
                        disabled={!isCertified}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95 flex items-center"
                        title={!isCertified ? "Score must be 80 or higher to archive" : "Archive Project"}
                    >
                        Archive Project <i className="fas fa-check-double ml-2"></i>
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="p-4 md:p-8 bg-slate-100/50 rounded-b-2xl border-x border-b border-slate-200 space-y-6">
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="font-black flex items-center gap-3 text-lg text-slate-800">
                        <i className="fas fa-clipboard-check text-amber-500"></i> Well-Architected Framework
                    </h3>
                    <button onClick={saveContext} className="px-6 py-2.5 w-full sm:w-auto bg-amber-500 text-white rounded-xl font-black text-xs shadow-md hover:bg-amber-600 transition-colors uppercase tracking-widest">
                        Sign & Save
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* The 5 Pillar Sliders */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="font-black text-sm text-slate-700">Resilience (HA/DR)</label>
                                <span className="text-blue-600 font-black text-sm">{r}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer" />
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="font-black text-sm text-slate-700">Security & Compliance</label>
                                <span className="text-rose-600 font-black text-sm">{s}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer" />
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="font-black text-sm text-slate-700">Performance Efficiency</label>
                                <span className="text-purple-600 font-black text-sm">{p}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" />
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="font-black text-sm text-slate-700">Cost Optimization</label>
                                <span className="text-emerald-600 font-black text-sm">{c}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer" />
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="font-black text-sm text-slate-700">Operational Excellence</label>
                                <span className="text-slate-600 font-black text-sm">{o}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer" />
                        </div>
                    </div>

                    {/* The Final Certification Scorecard */}
                    <div className={`p-8 md:p-10 rounded-3xl border-4 flex flex-col items-center justify-center text-center shadow-sm transition-colors duration-500 ${isCertified ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-300'}`}>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Architecture Final Score</h4>
                        
                        <div className={`text-8xl font-black tracking-tighter ${isCertified ? 'text-amber-500' : 'text-slate-700'}`}>
                            {score}
                        </div>
                        
                        <div className={`mt-8 px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs border-2 shadow-sm ${isCertified ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                            {isCertified ? 'Certified & Approved' : 'Remediation Required'}
                        </div>

                        {!isCertified && (
                            <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs">
                                Note: You must achieve an aggregate score of 80% or higher to formally archive the project.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
