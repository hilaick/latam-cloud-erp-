import React, { useState, useEffect } from 'react';

export default function AssessmentView({ activeProject, onUpdateProject }) {
    const [infraControl, setInfraControl] = useState(activeProject?.ora?.infraControl || '0'); 
    const [itSkills, setItSkills] = useState(activeProject?.ora?.itSkills || '0'); 
    const [partnerCapability, setPartnerCapability] = useState(activeProject?.ora?.partnerCapability || '0'); 
    const [downtime, setDowntime] = useState(activeProject?.ora?.downtime || '0'); 
    const [appArch, setAppArch] = useState(activeProject?.ora?.appArch || '0'); 
    const [security, setSecurity] = useState(activeProject?.ora?.security || '0');
    // 🚨 NEW: 7th Metric for FinOps / Timeline Alignment
    const [finopsAlignment, setFinopsAlignment] = useState(activeProject?.ora?.finopsAlignment || '0');

    useEffect(() => { 
        if(activeProject?.ora) { 
            const o = activeProject.ora; 
            setInfraControl(o.infraControl||'0'); 
            setItSkills(o.itSkills||'0'); 
            setPartnerCapability(o.partnerCapability||'0'); 
            setDowntime(o.downtime||'0'); 
            setAppArch(o.appArch||'0'); 
            setSecurity(o.security||'0'); 
            setFinopsAlignment(o.finopsAlignment||'0');
        } 
    }, [activeProject]);
    
    // 🚨 FIX: Prevent browser events from aborting the fetch
    const handleSave = (e) => { 
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        onUpdateProject(activeProject.id, 'ora', { infraControl, itSkills, partnerCapability, downtime, appArch, security, finopsAlignment }); 
        alert("ORA Profile Saved."); 
    };

    // 🚨 FIX: Score is now calculated out of 7 metrics
    const score = Math.round((parseInt(infraControl) + parseInt(itSkills) + parseInt(partnerCapability) + parseInt(downtime) + parseInt(appArch) + parseInt(security) + parseInt(finopsAlignment)) / 7);
    let timeBuffer = "+80%"; 
    let bgColor = "bg-rose-50 border-rose-300 text-rose-700";
    
    if (score > 40 && score <= 75) { 
        timeBuffer = "+30%"; 
        bgColor = "bg-amber-50 border-amber-300 text-amber-700"; 
    } else if (score > 75) { 
        timeBuffer = "+10%"; 
        bgColor = "bg-emerald-50 border-emerald-300 text-emerald-700"; 
    }

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-clipboard-check text-purple-600"></i> Operational Readiness (ORA)</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Calculate human, commercial, and architectural friction constraints.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                    <div className="space-y-8">
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">1. Infra Control</label><input type="range" min="0" max="100" step="50" value={infraControl} onChange={e=>setInfraControl(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>3rd Party</span><span>Partial</span><span>Full Root</span></div></div>
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">2. IT Skills</label><input type="range" min="0" max="100" step="50" value={itSkills} onChange={e=>setItSkills(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>None</span><span>Basic</span><span>Experts</span></div></div>
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">3. Partner RACI</label><input type="range" min="0" max="100" step="50" value={partnerCapability} onChange={e=>setPartnerCapability(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Reseller</span><span>Partial</span><span>MSP</span></div></div>
                        {/* 🚨 NEW: 7th FinOps / Timeline Alignment Slider */}
                        <div>
                            <label className="font-black text-sm text-slate-800 mb-2 block">4. FinOps / Timeline Alignment</label>
                            <input type="range" min="0" max="100" step="50" value={finopsAlignment} onChange={e=>setFinopsAlignment(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" />
                            <div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Forced Dates</span><span>Moderate</span><span>Strict Control</span></div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">5. Downtime Tolerance</label><input type="range" min="0" max="100" step="50" value={downtime} onChange={e=>setDowntime(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Zero (HA)</span><span>Weekend</span><span>Best Effort</span></div></div>
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">6. App Architecture</label><input type="range" min="0" max="100" step="50" value={appArch} onChange={e=>setAppArch(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Legacy</span><span>Monolith</span><span>Cloud-Native</span></div></div>
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">7. Security/Compliance</label><input type="range" min="0" max="100" step="50" value={security} onChange={e=>setSecurity(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Gov/PCI</span><span>PII</span><span>Standard</span></div></div>
                    </div>
                </div>
                
                <div className={`p-8 rounded-2xl border-4 text-center shadow-inner flex flex-col items-center justify-center ${bgColor}`}>
                    <div className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Global Friction Score</div>
                    <div className="text-6xl font-black">{score}/100</div>
                    <div className="text-sm font-black mt-4 mb-8 tracking-widest uppercase bg-white/50 inline-block px-4 py-2 rounded-xl shadow-sm">Mandatory Timeline Buffer: {timeBuffer}</div>
                    
                    {/* 🚨 FIX: Explicit type="button" strictly prevents silent HTML form submission aborts */}
                    <button type="button" onClick={handleSave} className="px-10 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95">
                        <i className="fas fa-save mr-2"></i>Save ORA Profile
                    </button>
                </div>
            </div>
        </div>
    )
}
