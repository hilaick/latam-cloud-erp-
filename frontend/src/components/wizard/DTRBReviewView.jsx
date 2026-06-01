import React, { useState, useMemo } from 'react';

export default function DTRBReviewView({ activeProject, onUpdateProject }) {
    const [isLocked, setIsLocked] = useState(activeProject?.status === 'Approved' || activeProject?.status === 'Locked');

    const nodes = activeProject?.mapperNodes || [];

    // 🚨 AUTOMATED DTRB RULES ENGINE
    const { score, checks } = useMemo(() => {
        let totalScore = 100;
        const results = [];

        // 1. Business Continuity (CBR)
        const hasCBR = nodes.some(n => String(n.type).toUpperCase() === 'CBR');
        if (hasCBR) {
            results.push({ id: 'bc-1', type: 'pass', category: 'Continuity', text: 'CBR Vaults detected. Backup strategy is in place.' });
        } else {
            totalScore -= 20;
            results.push({ id: 'bc-1', type: 'fail', category: 'Continuity', text: 'CRITICAL: No CBR Backup Vaults mapped. Data loss risk is high.' });
        }

        // 2. Security (SGs)
        const hasSG = nodes.some(n => String(n.type).toUpperCase() === 'SG' || String(n.type).toUpperCase().includes('SECURITY'));
        if (hasSG) {
            results.push({ id: 'sec-1', type: 'pass', category: 'Security', text: 'Security Groups detected. Network isolation is defined.' });
        } else {
            totalScore -= 20;
            results.push({ id: 'sec-1', type: 'fail', category: 'Security', text: 'CRITICAL: No Security Groups defined. VPCs are completely exposed or inaccessible.' });
        }

        // 3. Public Exposure (Databases)
        const dbs = nodes.filter(n => String(n.type).toUpperCase() === 'RDS');
        const exposedDbs = dbs.filter(db => db.ip && db.ip !== 'N/A' && db.ip !== 'TBD' && !db.ip.startsWith('10.') && !db.ip.startsWith('192.168.') && !db.ip.startsWith('172.'));
        if (exposedDbs.length > 0) {
            totalScore -= 30;
            results.push({ id: 'sec-2', type: 'fail', category: 'Security', text: `CRITICAL: ${exposedDbs.length} Database(s) appear to have public IPs. RDS must remain in private subnets.` });
        } else if (dbs.length > 0) {
            results.push({ id: 'sec-2', type: 'pass', category: 'Security', text: 'All Databases are correctly isolated from direct public IP assignment.' });
        }

        // 4. Commercial Alignment (Scope Creep)
        const scopeCreep = nodes.filter(n => n.status === 'Live Only');
        if (scopeCreep.length > 0) {
            totalScore -= 10;
            results.push({ id: 'com-1', type: 'warn', category: 'Commercial', text: `WARNING: ${scopeCreep.length} unquoted resource(s) mapped. Requires Change Request (CR) before deployment.` });
        } else {
            results.push({ id: 'com-1', type: 'pass', category: 'Commercial', text: 'Target architecture aligns perfectly with the quoted SOW.' });
        }

        // 5. High Availability (ELB)
        const computeNodes = nodes.filter(n => String(n.type).toUpperCase() === 'ECS');
        const hasELB = nodes.some(n => String(n.type).toUpperCase() === 'ELB');
        if (computeNodes.length > 2 && !hasELB) {
            results.push({ id: 'ha-1', type: 'warn', category: 'Availability', text: `WARNING: ${computeNodes.length} Compute nodes mapped, but no Load Balancer (ELB) detected. Consider HA distribution.` });
        } else if (hasELB) {
            results.push({ id: 'ha-1', type: 'pass', category: 'Availability', text: 'Load Balancers (ELB) mapped. High Availability paths exist.' });
        }

        return { score: Math.max(0, totalScore), checks: results };
    }, [nodes]);

    const handleLockArchitecture = () => {
        if (score < 80 && !window.confirm("There are critical DTRB warnings. Are you sure you want to lock this architecture for SRB approval?")) return;
        
        onUpdateProject(activeProject.id, 'status', 'Approved');
        setIsLocked(true);
        alert("Project Blueprint Locked. DTRB Sign-off complete.");
    };

    const handleUnlock = () => {
        if (!window.confirm("Unlocking will revert the project to Draft status and allow structural changes. Continue?")) return;
        onUpdateProject(activeProject.id, 'status', 'Draft');
        setIsLocked(false);
    };

    return (
        <div className="animate-fade-in max-w-[1200px] mx-auto pb-12 relative mt-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                
                <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-8">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-clipboard-check text-indigo-600"></i> DTRB Governance Gate</h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Automated Delivery Technical Review Board (DTRB) compliance scan.</p>
                    </div>
                    {isLocked ? (
                        <div className="bg-emerald-50 border border-emerald-200 px-6 py-3 rounded-xl flex items-center gap-4 shadow-sm">
                            <i className="fas fa-lock text-emerald-600 text-2xl"></i>
                            <div>
                                <div className="text-xs font-black text-emerald-800 uppercase tracking-widest">Architecture Locked</div>
                                <div className="text-[10px] text-emerald-600 font-bold">Approved for Provisioning Phase</div>
                            </div>
                            <button onClick={handleUnlock} className="ml-4 px-3 py-1 bg-white border border-emerald-300 text-emerald-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 rounded text-[10px] font-black uppercase transition-colors">Unlock</button>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl flex items-center gap-4 shadow-sm">
                            <i className="fas fa-unlock-alt text-slate-400 text-2xl"></i>
                            <div>
                                <div className="text-xs font-black text-slate-700 uppercase tracking-widest">Draft Mode Active</div>
                                <div className="text-[10px] text-slate-500 font-bold">Awaiting Final SRB/DTRB Approval</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="md:col-span-1 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-inner relative overflow-hidden">
                        <div className={`absolute top-0 w-full h-2 ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                        <div className="text-5xl font-black mb-2" style={{ color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e' }}>{score}%</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Compliance Score</div>
                        <p className="text-xs text-center text-slate-600 mt-4 font-medium px-4">
                            {score === 100 ? "Flawless architecture design. Ready for deployment." : 
                             score >= 80 ? "Minor warnings detected. Proceed with caution." : 
                             "Critical design flaws detected. Review required before locking."}
                        </p>
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-3">
                        <h4 className="font-black text-slate-700 text-sm mb-2 uppercase tracking-widest border-b border-slate-200 pb-2">Automated Check Results</h4>
                        <div className="overflow-y-auto max-h-[300px] custom-scrollbar pr-2 space-y-3">
                            {checks.map(c => (
                                <div key={c.id} className={`p-4 rounded-xl border flex gap-4 items-start ${
                                    c.type === 'pass' ? 'bg-emerald-50/50 border-emerald-200' : 
                                    c.type === 'warn' ? 'bg-amber-50/50 border-amber-200' : 
                                    'bg-rose-50/50 border-rose-300'
                                }`}>
                                    <div className="mt-0.5 shrink-0">
                                        {c.type === 'pass' && <i className="fas fa-check-circle text-emerald-500 text-lg"></i>}
                                        {c.type === 'warn' && <i className="fas fa-exclamation-triangle text-amber-500 text-lg"></i>}
                                        {c.type === 'fail' && <i className="fas fa-times-circle text-rose-500 text-lg"></i>}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: c.type === 'pass' ? '#059669' : c.type === 'warn' ? '#d97706' : '#e11d48' }}>{c.category}</div>
                                        <div className="text-xs font-bold text-slate-700 leading-relaxed">{c.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {!isLocked && (
                    <div className="flex justify-end pt-6 border-t border-slate-200">
                        <button onClick={handleLockArchitecture} className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-md transition-transform active:scale-95 text-white ${score >= 80 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                            {score >= 80 ? <><i className="fas fa-file-signature mr-2"></i> Lock & Approve Blueprint</> : <><i className="fas fa-exclamation-triangle mr-2"></i> Acknowledge Risks & Lock</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
