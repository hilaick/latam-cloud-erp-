import React, { useState, useEffect } from 'react';
import ExcelUploader from '../views/ExcelUploader';

export default function StepARB({ project, onUpdateProject, onPromote, isCurrent }) {
    const [showUploader, setShowUploader] = useState(false);
    const [hasBlueprint, setHasBlueprint] = useState(false);
    const [artefactsComplete, setArtefactsComplete] = useState(false);

    // Check if project has blueprint data and artefacts are complete
    useEffect(() => {
        const hasBP = !!project?.blueprintData;
        setHasBlueprint(hasBP);
        
        // Check if all artefacts are complete
        const artefacts = project?.arbArtefacts || {};
        const allComplete = artefacts.presentStateHLD && artefacts.targetArchitecture && artefacts.sowSigned;
        setArtefactsComplete(allComplete);
    }, [project, project?.blueprintData, project?.arbArtefacts]);

    const handleBlueprintGenerated = (blueprintData) => {
        // Update project with blueprint data AND artefacts in a single update
        onUpdateProject({
            blueprintData: blueprintData,
            arbArtefacts: {
                presentStateHLD: true,
                targetArchitecture: true,
                sowSigned: true
            }
        });
    };

    const areAllArtefactsComplete = () => {
        return artefactsComplete;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const fileExt = file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(`.${fileExt}`)) {
            alert('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('customer_name', project.name || 'Unknown Customer');

        try {
            const response = await fetch('/api/upload_quotation', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ Quotation processed successfully!\n\nCustomer: ${result.blueprint.customer}\nServers: ${result.stats.total_servers}\nWarnings: ${result.stats.warnings}`);
                handleBlueprintGenerated(result.blueprint);
            } else {
                alert(`❌ Upload failed: ${result.error}`);
            }
        } catch (error) {
            alert(`❌ Network error: ${error.message}`);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                    <h3 className="font-black text-2xl text-slate-800">
                        <i className="fas fa-door-open text-blue-600 mr-3"></i> 
                        Step 1: ARB Intake Gate
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Validate the technical SOW and Architectures provided by the Sales Architect.
                    </p>
                </div>
                {isCurrent && (
                    <button 
                        onClick={onPromote} 
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!hasBlueprint || !areAllArtefactsComplete()}
                        title={!hasBlueprint ? "Upload quotation first" : !artefactsComplete ? "Complete all mandatory artefacts" : "Approve ARB and advance to Architecture"}
                    >
                        {hasBlueprint && areAllArtefactsComplete() ? (
                            <>
                                Approve ARB & Advance <i className="fas fa-arrow-right ml-2"></i>
                            </>
                        ) : (
                            <>
                                {!hasBlueprint ? "Upload Quotation to Begin" : "Complete Artefacts First"} <i className="fas fa-exclamation-circle ml-2"></i>
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Quotation Upload */}
                <div className="space-y-6">
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <i className="fas fa-file-excel text-emerald-600"></i>
                                Quotation Upload
                            </h4>
                            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                                Required
                            </span>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-6">
                            Upload the Sales Architect's quotation (Excel/CSV) to generate the technical blueprint.
                            The system will normalize column names and validate the architecture.
                        </p>

                        {hasBlueprint ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <i className="fas fa-check-circle text-emerald-600 text-xl"></i>
                                    <div>
                                        <h5 className="font-bold text-emerald-800">Blueprint Generated</h5>
                                        <p className="text-sm text-emerald-700">
                                            Customer: <span className="font-bold">{project.blueprintData?.customer || 'Unknown'}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                        <div className="text-emerald-600 font-bold">Servers</div>
                                        <div className="text-lg font-black text-slate-800">
                                            {project.blueprintData?.topology?.compute?.length || 0}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                        <div className="text-emerald-600 font-bold">Status</div>
                                        <div className="text-lg font-black text-emerald-700">
                                            Ready
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowUploader(true)}
                                    className="w-full mt-4 px-4 py-2 text-sm font-bold bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                    <i className="fas fa-sync-alt mr-2"></i>
                                    Re-upload Quotation
                                </button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer bg-slate-50/50"
                                 onClick={() => setShowUploader(true)}>
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                        <i className="fas fa-file-upload text-3xl text-emerald-600"></i>
                                    </div>
                                    <h5 className="font-bold text-slate-800 mb-2">Upload Sales Architect Quotation</h5>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Drag & drop or click to upload Excel/CSV file
                                    </p>
                                    <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-4 py-2">
                                        Supports: .csv, .xlsx, .xls
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <i className="fas fa-info-circle text-blue-500"></i>
                                Expected File Format
                            </h5>
                            <div className="text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                server_name,flavor,cpu,ram,is_public,tier,os_type,storage_gb<br/>
                                web-server-1,s6.large.2,2,4,Yes,Web Tier,Linux,50<br/>
                                db-server-1,c6.2xlarge.4,8,16,No,Database,Linux,200
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Column names are fuzzy-matched. Missing flavors will be flagged as WARNING.
                            </p>
                        </div>
                    </div>

                    {/* Mandatory Artefacts */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2 border-b pb-2">
                            Mandatory Architectural Artefacts
                        </h4>
                        <label className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-blue-600"
                                checked={project.arbArtefacts?.presentStateHLD || false}
                                onChange={e => onUpdateProject('arbArtefacts', {
                                    ...project.arbArtefacts,
                                    presentStateHLD: e.target.checked
                                })}
                            />
                            <span className="font-bold text-sm text-slate-700">Present State HLD (As-Is)</span>
                        </label>
                        <label className="flex items-center gap-4 p-4 border-2 border-rose-200 rounded-xl cursor-pointer bg-rose-50/50 hover:bg-rose-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-rose-600"
                                checked={project.arbArtefacts?.targetArchitecture || false}
                                onChange={e => onUpdateProject('arbArtefacts', {
                                    ...project.arbArtefacts,
                                    targetArchitecture: e.target.checked
                                })}
                            />
                            <span className="font-bold text-sm text-rose-900">Target Architecture (To-Be)</span>
                        </label>
                        <label className="flex items-center gap-4 p-4 border-2 border-purple-200 rounded-xl cursor-pointer bg-purple-50/50 hover:bg-purple-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-purple-600"
                                checked={project.arbArtefacts?.sowSigned || false}
                                onChange={e => onUpdateProject('arbArtefacts', {
                                    ...project.arbArtefacts,
                                    sowSigned: e.target.checked
                                })}
                            />
                            <span className="font-bold text-sm text-purple-900">SOW (Scope of Work) Signed</span>
                        </label>
                        
                        {/* Artefacts Status */}
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                                Artefacts Status
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-sm">
                                    {artefactsComplete ? (
                                        <span className="text-emerald-700 font-bold flex items-center gap-2">
                                            <i className="fas fa-check-circle"></i>
                                            All artefacts complete
                                        </span>
                                    ) : (
                                        <span className="text-amber-700 font-bold flex items-center gap-2">
                                            <i className="fas fa-exclamation-circle"></i>
                                            {3 - (Object.values(project.arbArtefacts || {}).filter(Boolean).length)} remaining
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-500">
                                    {Object.values(project.arbArtefacts || {}).filter(Boolean).length}/3
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Project Details */}
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                Kickoff Milestone
                            </label>
                            <input 
                                type="date" 
                                value={project.kickoff || ''} 
                                onChange={e => onUpdateProject('kickoff', e.target.value)}
                                className="w-full p-3 border-2 border-blue-200 rounded-xl bg-white outline-none font-bold text-blue-900 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                Go-Live Milestone
                            </label>
                            <input 
                                type="date" 
                                value={project.date || ''} 
                                onChange={e => onUpdateProject('date', e.target.value)}
                                className="w-full p-3 border-2 border-emerald-200 rounded-xl bg-white outline-none font-bold text-emerald-900 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                Target MRR ($)
                            </label>
                            <input 
                                type="number" 
                                value={project.mrr || ''} 
                                onChange={e => onUpdateProject('mrr', e.target.value)}
                                className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white outline-none font-bold" 
                            />
                        </div>
                    </div>

                    {/* Next Steps Card */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                        <h5 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <i className="fas fa-arrow-right text-blue-600"></i>
                            Next Steps After Upload
                        </h5>
                        <ol className="space-y-3 text-sm text-blue-800">
                            <li className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">1</span>
                                <span>System validates quotation and generates blueprint</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">2</span>
                                <span>Blueprint moves to Architecture phase for review</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">3</span>
                                <span>Topology Auto-Mapper creates visual architecture</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">4</span>
                                <span>Delivery Physics calculates resources & timeline</span>
                            </li>
                        </ol>
                    </div>

                    {/* Status */}
                    <div className="bg-slate-100 border border-slate-300 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">ARB Status</div>
                                <div className={`text-lg font-black ${hasBlueprint && artefactsComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {hasBlueprint && artefactsComplete ? 'Ready for Approval' : hasBlueprint ? 'Artefacts Pending' : 'Awaiting Quotation'}
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${hasBlueprint && artefactsComplete ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                {hasBlueprint && artefactsComplete ? 'Complete' : 'Pending'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Excel Uploader Modal */}
            {showUploader && (
                <ExcelUploader 
                    onUpdateData={(blueprintData) => {
                        handleBlueprintGenerated(blueprintData);
                        setShowUploader(false);
                    }}
                    onClose={() => setShowUploader(false)}
                    defaultCustomer={project.name || ''}
                />
            )}
        </div>
    );
}