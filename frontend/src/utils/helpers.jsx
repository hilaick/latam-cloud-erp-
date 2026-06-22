import React, { useState, useEffect } from 'react';

export const formatShortDate = (dateStr) => {
    if (!dateStr || dateStr === 'Pending' || dateStr === 'TBD') return "TBD";
    const d = new Date(dateStr); if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

export function EditableCell({ value, onSave, type = "text", className = "", placeholder = "" }) {
    const [isEditing, setIsEditing] = useState(false); 
    const [editValue, setEditValue] = useState(value);
    
    useEffect(() => { setEditValue(value); }, [value]);
    
    const handleSave = () => { setIsEditing(false); if (editValue !== value) onSave(editValue); };
    const handleKeyDown = (e) => { 
        if (e.key === 'Enter' && type !== 'textarea') handleSave(); 
        if (e.key === 'Escape') { setIsEditing(false); setEditValue(value); } 
    };

    if (isEditing) {
        if (type === 'textarea') return <textarea autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={e=>{if(e.key==='Escape')handleSave()}} className={`w-full p-1 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`} rows={3} />
        if (type === 'select') {
            let options = placeholder === 'health' ? ['Green', 'Yellow', 'Red'] : placeholder === 'complexity' ? ['Low', 'Medium', 'High', 'Ultra-High'] : ['Low', 'Medium', 'High'];
            return <select autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSave} className={`w-full p-0.5 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`}>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
        }
        return <input autoFocus type={type} value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={`w-full p-0.5 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`} />
    }
    const displayValue = type === 'date' ? formatShortDate(value) : value;
    return (
        <div className={`cursor-pointer hover:bg-slate-200 rounded px-1 -ml-1 inline-flex items-center group relative min-h-[16px] w-full ${className}`} onClick={() => setIsEditing(true)} title="Click to edit">
            {displayValue || <span className="italic text-slate-400">{placeholder || 'Edit'}</span>}
            <i className="fas fa-pencil-alt text-[8px] text-slate-400 ml-1 opacity-0 group-hover:opacity-100 absolute right-0 bg-slate-200 pl-1"></i>
        </div>
    );
}

export function TriageCardFlow({ triage, setTriage }) {
    const types = [
        { id: 'greenfield', label: 'Greenfield', desc: 'Born-in-Cloud', icon: 'fa-leaf' },
        { id: 'standard', label: 'Migration', desc: 'Lift & Shift', icon: 'fa-truck-moving' },
        { id: 'poc', label: 'PoC Sandbox', desc: 'Fast-Track', icon: 'fa-bolt' },
        { id: 'expansion', label: 'Expansion', desc: 'Phase 2+', icon: 'fa-expand-arrows-alt' }
    ];

    const scopes = [
        { id: 'compute', label: 'Batch Server', icon: 'fa-server' },
        { id: 'database', label: 'Database Sync', icon: 'fa-database' },
        { id: 'storage', label: 'Object Storage', icon: 'fa-hdd' },
        { id: 'cross_region', label: 'Cross-Region', icon: 'fa-globe' }
    ];

    const sources = [
        { id: 'AWS', label: 'AWS', icon: 'fab fa-aws' },
        { id: 'Azure', label: 'Azure', icon: 'fab fa-windows' },
        { id: 'VMware / On-Premise', label: 'VMware', icon: 'fa-network-wired' },
        { id: 'Bare Metal', label: 'Bare Metal', icon: 'fa-server' },
        { id: 'Huawei Cloud', label: 'Huawei Cloud', icon: 'fa-cloud' }
    ];

    const auths = [
        { id: 'Cloud Admin API', label: 'Cloud API', icon: 'fa-cloud' },
        { id: 'Active Directory', label: 'AD / GPO', icon: 'fa-sitemap' },
        { id: 'Local OS Admin', label: 'OS Admin', icon: 'fa-terminal' },
        { id: 'Read-Only (Customer Managed)', label: 'Zero-Trust', icon: 'fa-user-shield' }
    ];

    // 🚨 5th Column: Expanded Delivery Scopes
    const deliveryScopes = [
        { id: 'turnkey', label: 'Turnkey', desc: 'We Execute E2E', icon: 'fa-key' },
        { id: 'co_delivery', label: 'Co-Delivery', desc: 'Shared Model', icon: 'fa-handshake' },
        { id: 'advisory', label: 'Advisory', desc: 'Partner Executes', icon: 'fa-chalkboard-teacher' },
        { id: 'arch_review', label: 'Arch Review', desc: 'Validation & Design', icon: 'fa-sitemap' },
        { id: 'escalation', label: 'Escalation', desc: 'Tier 3 Support', icon: 'fa-life-ring' },
        { id: 'security', label: 'Security Review', desc: 'Audit & Compliance', icon: 'fa-shield-alt' },
        { id: 'post_live', label: 'Post-Live', desc: 'FinOps Optimization', icon: 'fa-chart-line' }
    ];

    const isGreenfield = triage.project_type === 'greenfield';

    return (
        <div className="flex flex-col xl:flex-row gap-4 items-stretch overflow-x-auto pb-2">
            {/* Col 1: Type */}
            <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner min-w-[200px]">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">1. Engagement Type</h4>
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {types.map(t => (
                        <div key={t.id} onClick={() => setTriage({...triage, project_type: t.id})} className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors ${triage.project_type === t.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${triage.project_type === t.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                <i className={`fas ${t.icon}`}></i>
                            </div>
                            <div>
                                <div className={`text-xs font-black ${triage.project_type === t.id ? 'text-blue-900' : 'text-slate-700'}`}>{t.label}</div>
                                <div className={`text-[9px] uppercase tracking-widest font-bold ${triage.project_type === t.id ? 'text-blue-500' : 'text-slate-400'}`}>{t.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="hidden xl:flex items-center justify-center text-slate-300"><i className="fas fa-arrow-right text-xl"></i></div>

            {/* Col 2: Scope */}
            <div className={`flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner transition-opacity min-w-[200px] ${isGreenfield ? 'opacity-40 pointer-events-none' : ''}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">2. Migration Scope</h4>
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {scopes.map(t => (
                        <div key={t.id} onClick={() => setTriage({...triage, migrationScope: t.id})} className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors ${triage.migrationScope === t.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${triage.migrationScope === t.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                <i className={`fas ${t.icon}`}></i>
                            </div>
                            <div className={`text-xs font-black ${triage.migrationScope === t.id ? 'text-indigo-900' : 'text-slate-700'}`}>{t.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`hidden xl:flex items-center justify-center text-slate-300 transition-opacity ${isGreenfield ? 'opacity-40' : ''}`}><i className="fas fa-arrow-right text-xl"></i></div>

            {/* Col 3: Source */}
            <div className={`flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner transition-opacity min-w-[200px] ${isGreenfield ? 'opacity-40 pointer-events-none' : ''}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">3. Source Environment</h4>
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {sources.map(t => (
                        <div key={t.id} onClick={() => setTriage({...triage, sourceEnvironment: t.id})} className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors ${triage.sourceEnvironment === t.id ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${triage.sourceEnvironment === t.id ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                                <i className={`fas ${t.icon}`}></i>
                            </div>
                            <div className={`text-xs font-black ${triage.sourceEnvironment === t.id ? 'text-purple-900' : 'text-slate-700'}`}>{t.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`hidden xl:flex items-center justify-center text-slate-300 transition-opacity ${isGreenfield ? 'opacity-40' : ''}`}><i className="fas fa-arrow-right text-xl"></i></div>

            {/* Col 4: Auth */}
            <div className={`flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner transition-opacity min-w-[200px] ${isGreenfield ? 'opacity-40 pointer-events-none' : ''}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">4. Authorization Level</h4>
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {auths.map(t => (
                        <div key={t.id} onClick={() => setTriage({...triage, authLevel: t.id})} className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors ${triage.authLevel === t.id ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${triage.authLevel === t.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <i className={`fas ${t.icon}`}></i>
                            </div>
                            <div className={`text-xs font-black ${triage.authLevel === t.id ? 'text-emerald-900' : 'text-slate-700'}`}>{t.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="hidden xl:flex items-center justify-center text-slate-300"><i className="fas fa-arrow-right text-xl"></i></div>

            {/* Col 5: Delivery Scope */}
            <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner min-w-[200px]">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">5. Delivery Scope</h4>
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {deliveryScopes.map(t => (
                        <div key={t.id} onClick={() => setTriage({...triage, deliveryScope: t.id})} className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors ${triage.deliveryScope === t.id ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-slate-200 bg-white hover:border-amber-300'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${triage.deliveryScope === t.id ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                <i className={`fas ${t.icon}`}></i>
                            </div>
                            <div>
                                <div className={`text-xs font-black ${triage.deliveryScope === t.id ? 'text-amber-900' : 'text-slate-700'}`}>{t.label}</div>
                                <div className={`text-[9px] uppercase tracking-widest font-bold ${triage.deliveryScope === t.id ? 'text-amber-500' : 'text-slate-400'}`}>{t.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
