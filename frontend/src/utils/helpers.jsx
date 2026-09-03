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

export function PreSalesQualificationMatrix({ triage, setTriage }) {
    const [isLegacyExpanded, setIsLegacyExpanded] = useState(false);
    const [isLegacySourceExpanded, setIsLegacySourceExpanded] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState({
        compute: false,
        database: false,
        storage: false
    });
    const [expandedSourceCategories, setExpandedSourceCategories] = useState({
        cross_cloud: false,
        huawei_cloud: false,
        on_premise: false
    });

    // Initialize expanded categories based on selected items
    useEffect(() => {
        const newExpanded = { compute: false, database: false, storage: false };
        resourceTypeCategories.forEach(category => {
            if (category.items.some(item => isMigrationScopeSelected(item.id))) {
                newExpanded[category.id] = true;
            }
        });
        setExpandedCategories(newExpanded);
        
        // Initialize source categories based on selection
        const newSourceExpanded = { cross_cloud: false, huawei_cloud: false, on_premise: false };
        if (triage.sourceEnvironment) {
            const selectedEnv = sourceEnvironments.find(se => se.id === triage.sourceEnvironment);
            if (selectedEnv && selectedEnv.category) {
                newSourceExpanded[selectedEnv.category] = true;
            }
        }
        setExpandedSourceCategories(newSourceExpanded);
    }, [triage.migrationScope, triage.sourceEnvironment]);
    const types = [
        { id: 'greenfield', label: 'Greenfield', desc: 'Born-in-Cloud', icon: 'fa-leaf' },
        { id: 'standard', label: 'Migration', desc: 'Lift & Shift', icon: 'fa-truck-moving' },
        { id: 'poc', label: 'PoC Sandbox', desc: 'Fast-Track', icon: 'fa-bolt' },
        { id: 'expansion', label: 'Expansion', desc: 'Phase 2+', icon: 'fa-expand-arrows-alt' }
    ];

    // Resource Type (renamed from Migration Scope) - Hybrid approach with backward compatibility
    const resourceTypes = [
        // Legacy values for backward compatibility
        { id: 'compute', label: 'Compute', category: 'compute', icon: 'fa-server', legacy: true },
        { id: 'database', label: 'Database', category: 'database', icon: 'fa-database', legacy: true },
        { id: 'storage', label: 'Storage', category: 'storage', icon: 'fa-hdd', legacy: true },
        { id: 'cross_region', label: 'Cross-Region', category: 'storage', icon: 'fa-globe', legacy: true },
        
        // New Compute subcategories
        { id: 'compute_single_servers', label: 'Single Servers', category: 'compute', icon: 'fa-server', desc: 'Individual VM migration' },
        { id: 'compute_batch_servers', label: 'Batch Servers', category: 'compute', icon: 'fa-server', desc: 'Multiple VMs in batches' },
        
        // New Database subcategories
        { id: 'database_migration', label: 'Migration', category: 'database', icon: 'fa-database', desc: 'Full database migration' },
        { id: 'database_synchronization', label: 'Synchronization', category: 'database', icon: 'fa-sync', desc: 'Continuous data sync' },
        
        // New Storage subcategories
        { id: 'storage_object_cross_cloud', label: 'Object Storage (Cross-Cloud)', category: 'storage', icon: 'fa-hdd', desc: 'Between different cloud providers' },
        { id: 'storage_object_cloud_to_cloud', label: 'Object Storage (Cloud-to-Cloud)', category: 'storage', icon: 'fa-hdd', desc: 'Within Huawei Cloud' },
        { id: 'storage_snapshots_same_region', label: 'Migration via Snapshots', category: 'storage', icon: 'fa-camera', desc: 'Same region snapshot migration' },
        { id: 'storage_images_cross_region', label: 'Migration via Images', category: 'storage', icon: 'fa-image', desc: 'Cross-region/account via images' }
    ];

    // Group resource types by category for UI
    const resourceTypeCategories = [
        {
            id: 'compute',
            label: 'Compute',
            icon: 'fa-server',
            items: resourceTypes.filter(rt => rt.category === 'compute')
        },
        {
            id: 'database',
            label: 'Databases',
            icon: 'fa-database',
            items: resourceTypes.filter(rt => rt.category === 'database')
        },
        {
            id: 'storage',
            label: 'Storage',
            icon: 'fa-hdd',
            items: resourceTypes.filter(rt => rt.category === 'storage')
        }
    ];

    // Source Environment with accordion structure - Hybrid approach with backward compatibility
    const sourceEnvironments = [
        // Legacy values for backward compatibility
        { id: 'AWS', label: 'AWS', category: 'cross_cloud', icon: 'fab fa-aws', legacy: true },
        { id: 'Azure', label: 'Azure', category: 'cross_cloud', icon: 'fab fa-windows', legacy: true },
        { id: 'VMware / On-Premise', label: 'VMware', category: 'on_premise', icon: 'fa-network-wired', legacy: true },
        { id: 'Bare Metal', label: 'Bare Metal', category: 'on_premise', icon: 'fa-server', legacy: true },
        { id: 'Huawei Cloud', label: 'Huawei Cloud', category: 'huawei_cloud', icon: 'fa-cloud', legacy: true },
        
        // Cross-Cloud Migration
        { id: 'aws', label: 'AWS', category: 'cross_cloud', icon: 'fab fa-aws' },
        { id: 'azure', label: 'Azure', category: 'cross_cloud', icon: 'fab fa-windows' },
        { id: 'google_cloud', label: 'Google Cloud', category: 'cross_cloud', icon: 'fab fa-google' },
        { id: 'other_public_cloud', label: 'Other Public Clouds', category: 'cross_cloud', icon: 'fa-cloud' },
        
        // Cloud-to-Cloud (Huawei Cloud)
        { id: 'huawei_az_to_az', label: 'AZ-to-AZ', category: 'huawei_cloud', icon: 'fa-sync-alt', desc: 'Within same region' },
        { id: 'huawei_cross_region', label: 'Cross-Region', category: 'huawei_cloud', icon: 'fa-globe-americas', desc: 'Between Huawei Cloud regions' },
        { id: 'huawei_cross_account', label: 'Cross-Account', category: 'huawei_cloud', icon: 'fa-user-friends', desc: 'Between Huawei Cloud accounts' },
        
        // On-premise
        { id: 'bare_metal', label: 'Bare Metal', category: 'on_premise', icon: 'fa-server' },
        { id: 'vmware', label: 'VMware', category: 'on_premise', icon: 'fa-network-wired' },
        { id: 'nutanix', label: 'Nutanix', category: 'on_premise', icon: 'fa-cube' }
    ];

    // Group source environments by category for UI
    const sourceEnvironmentCategories = [
        {
            id: 'cross_cloud',
            label: 'Cross-Cloud Migration',
            icon: 'fa-exchange-alt',
            items: sourceEnvironments.filter(se => se.category === 'cross_cloud' && !se.legacy)
        },
        {
            id: 'huawei_cloud',
            label: 'Cloud-to-Cloud (Huawei Cloud)',
            icon: 'fa-cloud',
            items: sourceEnvironments.filter(se => se.category === 'huawei_cloud' && !se.legacy)
        },
        {
            id: 'on_premise',
            label: 'On-premise',
            icon: 'fa-server',
            items: sourceEnvironments.filter(se => se.category === 'on_premise' && !se.legacy)
        }
    ];

    const auths = [
        { id: 'Full Admin (Partner Managed)', label: 'Full Admin', icon: 'fa-user-cog', desc: 'Partner has full access, ERP performs ops' },
        { id: 'Cloud Admin API', label: 'Cloud API', icon: 'fa-cloud', desc: 'API-level access' },
        { id: 'Active Directory', label: 'AD / GPO', icon: 'fa-sitemap', desc: 'Domain-level access' },
        { id: 'Local OS Admin', label: 'OS Admin', icon: 'fa-terminal', desc: 'Local credentials' },
        { id: 'Read-Only (Customer Managed)', label: 'Zero-Trust', icon: 'fa-user-shield', desc: 'Customer installs agents' }
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

    // Helper function to handle project type selection (multiple)
    const handleProjectTypeToggle = (typeId) => {
        const currentTypes = Array.isArray(triage.project_type) ? triage.project_type : 
                           (triage.project_type ? [triage.project_type] : []);
        
        let newTypes;
        if (currentTypes.includes(typeId)) {
            // Remove if already selected
            newTypes = currentTypes.filter(id => id !== typeId);
        } else {
            // Add if not selected
            newTypes = [...currentTypes, typeId];
        }
        
        // If no types selected, set to empty array
        setTriage({ ...triage, project_type: newTypes.length > 0 ? newTypes : [] });
    };

    // Check if a project type is selected
    const isProjectTypeSelected = (typeId) => {
        if (Array.isArray(triage.project_type)) {
            return triage.project_type.includes(typeId);
        }
        return triage.project_type === typeId;
    };

    // Helper function to handle migration scope selection (multiple)
    const handleMigrationScopeToggle = (scopeId) => {
        const currentScopes = Array.isArray(triage.migrationScope) ? triage.migrationScope : 
                             (triage.migrationScope ? [triage.migrationScope] : []);
        
        let newScopes;
        if (currentScopes.includes(scopeId)) {
            // Remove if already selected
            newScopes = currentScopes.filter(id => id !== scopeId);
        } else {
            // Add if not selected
            newScopes = [...currentScopes, scopeId];
        }
        
        // If no scopes selected, set to empty array
        setTriage({ ...triage, migrationScope: newScopes.length > 0 ? newScopes : [] });
    };
    const handleAuthLevelToggle = (authId) => {
        const currentAuths = Array.isArray(triage.authLevel) ? triage.authLevel : 
                           (triage.authLevel ? [triage.authLevel] : []);
        
        let newAuths;
        if (currentAuths.includes(authId)) {
            // Remove if already selected
            newAuths = currentAuths.filter(id => id !== authId);
        } else {
            // Add if not selected
            newAuths = [...currentAuths, authId];
        }
        
        // If no auths selected, set to empty array
        setTriage({ ...triage, authLevel: newAuths.length > 0 ? newAuths : [] });
    };

    // Check if a migration scope is selected
    const isMigrationScopeSelected = (scopeId) => {
        if (Array.isArray(triage.migrationScope)) {
            return triage.migrationScope.includes(scopeId);
        }
        return triage.migrationScope === scopeId;
    };

    // Check if greenfield is selected (for conditional logic)
    const isGreenfieldSelected = () => {
        if (Array.isArray(triage.project_type)) {
            return triage.project_type.includes('greenfield');
        }
        return triage.project_type === 'greenfield';
    };

    // Check if an auth level is selected
    const isAuthLevelSelected = (authId) => {
        if (Array.isArray(triage.authLevel)) {
            return triage.authLevel.includes(authId);
        }
        return triage.authLevel === authId;
    };

    return (
        <div className="flex flex-col xl:flex-row gap-4 items-stretch overflow-x-auto pb-2">
            {/* Col 1: Type */}
            <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner min-w-[200px]">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">1. Engagement Type</h4>
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {types.map(t => {
                        const isSelected = isProjectTypeSelected(t.id);
                        const selectedCount = Array.isArray(triage.project_type) ? triage.project_type.length : (triage.project_type ? 1 : 0);
                        
                        return (
                            <div 
                                key={t.id} 
                                onClick={() => handleProjectTypeToggle(t.id)}
                                className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors relative ${isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <i className={`fas ${t.icon}`}></i>
                                </div>
                                <div className="flex-1">
                                    <div className={`text-xs font-black ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{t.label}</div>
                                    <div className={`text-[9px] uppercase tracking-widest font-bold ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>{t.desc}</div>
                                </div>
                                {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">
                                        ✓
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {Array.isArray(triage.project_type) && triage.project_type.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                Selected: {triage.project_type.length} type{triage.project_type.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="hidden xl:flex items-center justify-center text-slate-300"><i className="fas fa-arrow-right text-xl"></i></div>

            {/* Col 2: Resource Type (renamed from Migration Scope) */}
            <div className={`flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner transition-opacity min-w-[200px] ${isGreenfieldSelected() ? 'opacity-40 pointer-events-none' : ''}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">2. Resource Type</h4>
                <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {resourceTypeCategories.map(category => {
                        // Check if any item in this category is selected
                        const hasSelectedItems = category.items.some(item => isMigrationScopeSelected(item.id));
                        
                        return (
                            <div key={category.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                <div 
                                    className={`p-3 flex items-center justify-between cursor-pointer ${hasSelectedItems ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-white hover:bg-slate-50'}`}
                                    onClick={() => setExpandedCategories(prev => ({...prev, [category.id]: !prev[category.id]}))}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${hasSelectedItems ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <i className={`fas ${category.icon} text-xs`}></i>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">{category.label}</span>
                                    </div>
                                    <i className={`fas fa-chevron-${expandedCategories[category.id] ? 'up' : 'down'} text-slate-400 text-xs`}></i>
                                </div>
                                
                                {expandedCategories[category.id] && (
                                    <div className="p-2 space-y-1 bg-white">
                                        {category.items.map(item => {
                                            const isSelected = isMigrationScopeSelected(item.id);
                                            return (
                                                <div 
                                                    key={item.id} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMigrationScopeToggle(item.id);
                                                    }}
                                                    className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-25'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        <i className={`fas ${item.icon} text-xs`}></i>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{item.label}</div>
                                                        {item.desc && (
                                                            <div className="text-[9px] text-slate-500 truncate">{item.desc}</div>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[8px] font-black">
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* Legacy values section (collapsed by default) */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div 
                            className="p-3 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100"
                            onClick={() => setIsLegacyExpanded(!isLegacyExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-amber-100 text-amber-600">
                                    <i className="fas fa-history text-xs"></i>
                                </div>
                                <span className="text-xs font-bold text-slate-700">Legacy Values</span>
                            </div>
                            <i className={`fas fa-chevron-${isLegacyExpanded ? 'up' : 'down'} text-slate-400 text-xs`}></i>
                        </div>
                        
                        {isLegacyExpanded && (
                            <div className="p-2 space-y-1 bg-white">
                                {resourceTypes.filter(rt => rt.legacy).map(item => {
                                    const isSelected = isMigrationScopeSelected(item.id);
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMigrationScopeToggle(item.id);
                                            }}
                                            className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-colors ${isSelected ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-25'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <i className={`fas ${item.icon} text-xs`}></i>
                                            </div>
                                            <div className="flex-1">
                                                <div className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>{item.label}</div>
                                                <div className="text-[9px] text-amber-600 font-bold">Legacy</div>
                                            </div>
                                            {isSelected && (
                                                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white text-[8px] font-black">
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {Array.isArray(triage.migrationScope) && triage.migrationScope.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                Selected: {triage.migrationScope.length} resource{triage.migrationScope.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={`hidden xl:flex items-center justify-center text-slate-300 transition-opacity ${isGreenfieldSelected() ? 'opacity-40' : ''}`}><i className="fas fa-arrow-right text-xl"></i></div>

            {/* Col 3: Source Environment */}
            <div className={`flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner transition-opacity min-w-[200px] ${isGreenfieldSelected() ? 'opacity-40 pointer-events-none' : ''}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">3. Source Environment</h4>
                <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {sourceEnvironmentCategories.map(category => {
                        const isSelected = triage.sourceEnvironment && 
                            sourceEnvironments.find(se => se.id === triage.sourceEnvironment)?.category === category.id;
                        
                        return (
                            <div key={category.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                <div 
                                    className={`p-3 flex items-center justify-between cursor-pointer ${isSelected ? 'bg-purple-50 border-b border-purple-100' : 'bg-white hover:bg-slate-50'}`}
                                    onClick={() => {
                                        // Auto-select first item in category if none selected
                                        if (!isSelected && category.items.length > 0) {
                                            setTriage({...triage, sourceEnvironment: category.items[0].id});
                                        }
                                        setExpandedSourceCategories(prev => ({...prev, [category.id]: !prev[category.id]}));
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isSelected ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <i className={`fas ${category.icon} text-xs`}></i>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">{category.label}</span>
                                    </div>
                                    <i className={`fas fa-chevron-${expandedSourceCategories[category.id] ? 'up' : 'down'} text-slate-400 text-xs`}></i>
                                </div>
                                
                                {expandedSourceCategories[category.id] && (
                                    <div className="p-2 space-y-1 bg-white">
                                        {category.items.map(item => {
                                            const itemSelected = triage.sourceEnvironment === item.id;
                                            return (
                                                <div 
                                                    key={item.id} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTriage({...triage, sourceEnvironment: item.id});
                                                    }}
                                                    className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-colors ${itemSelected ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-25'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${itemSelected ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        <i className={`fas ${item.icon} text-xs`}></i>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className={`text-xs font-bold ${itemSelected ? 'text-purple-900' : 'text-slate-700'}`}>{item.label}</div>
                                                        {item.desc && (
                                                            <div className="text-[9px] text-slate-500 truncate">{item.desc}</div>
                                                        )}
                                                    </div>
                                                    {itemSelected && (
                                                        <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-white text-[8px] font-black">
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* Legacy values section (collapsed by default) */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div 
                            className="p-3 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100"
                            onClick={() => setIsLegacySourceExpanded(!isLegacySourceExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-amber-100 text-amber-600">
                                    <i className="fas fa-history text-xs"></i>
                                </div>
                                <span className="text-xs font-bold text-slate-700">Legacy Environments</span>
                            </div>
                            <i className={`fas fa-chevron-${isLegacySourceExpanded ? 'up' : 'down'} text-slate-400 text-xs`}></i>
                        </div>
                        
                        {isLegacySourceExpanded && (
                            <div className="p-2 space-y-1 bg-white">
                                {sourceEnvironments.filter(se => se.legacy).map(item => {
                                    const isSelected = triage.sourceEnvironment === item.id;
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTriage({...triage, sourceEnvironment: item.id});
                                            }}
                                            className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-colors ${isSelected ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-25'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <i className={`fas ${item.icon} text-xs`}></i>
                                            </div>
                                            <div className="flex-1">
                                                <div className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>{item.label}</div>
                                                <div className="text-[9px] text-amber-600 font-bold">Legacy</div>
                                            </div>
                                            {isSelected && (
                                                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white text-[8px] font-black">
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`hidden xl:flex items-center justify-center text-slate-300 transition-opacity ${isGreenfieldSelected() ? 'opacity-40' : ''}`}><i className="fas fa-arrow-right text-xl"></i></div>

            {/* Col 4: Auth */}
            <div className={`flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner transition-opacity min-w-[200px] ${isGreenfieldSelected() ? 'opacity-40 pointer-events-none' : ''}`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">4. Authorization Level</h4>
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {auths.map(t => {
                        const isSelected = isAuthLevelSelected(t.id);
                        const selectedCount = Array.isArray(triage.authLevel) ? triage.authLevel.length : (triage.authLevel ? 1 : 0);
                        
                        return (
                            <div 
                                key={t.id} 
                                onClick={() => handleAuthLevelToggle(t.id)}
                                className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors relative ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <i className={`fas ${t.icon}`}></i>
                                </div>
                                <div className="flex-1">
                                    <div className={`text-xs font-black ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{t.label}</div>
                                </div>
                                {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">
                                        ✓
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {Array.isArray(triage.authLevel) && triage.authLevel.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                Selected: {triage.authLevel.length} authorization{triage.authLevel.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
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
