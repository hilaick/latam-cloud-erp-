import React, { useState } from 'react';
import ExcelUploader from '../views/ExcelUploader';

export default function StepARB({ project, onUpdateProject }) {
    const [showUploader, setShowUploader] = useState(false);
    const blueprintData = project.blueprintData;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-between items-center">
                <div>
                    <h3 className="font-black text-xl text-slate-800"><i className="fas fa-door-open text-purple-500 mr-2"></i> ARB Intake Gate</h3>
                    <p className="text-xs text-slate-500 mt-1">Upload the Sales Quotation to auto-generate the Blueprint JSON.</p>
                </div>
                <button onClick={() => setShowUploader(true)} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition-colors uppercase tracking-widest">
                    <i className="fas fa-file-excel mr-2"></i> Upload SOW / Quotation
                </button>
            </div>

            {blueprintData ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h4 className="font-black text-lg text-slate-800 mb-4 text-center border-b border-slate-100 pb-4">Signed Target Architecture (To-Be)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Customer</div><div className="font-bold text-sm text-slate-800">{blueprintData.customer}</div></div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Total Servers</div><div className="font-bold text-sm text-blue-600">{blueprintData.topology?.compute?.length || 0}</div></div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Total Databases</div><div className="font-bold text-sm text-emerald-600">{blueprintData.topology?.database?.length || 0}</div></div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-500 uppercase font-black">Est. Cloud Spend</div><div className="font-bold text-sm text-purple-600">${blueprintData.metadata?.estimated_monthly_cost || 0} /mo</div></div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center">
                    <i className="fas fa-file-invoice text-4xl text-slate-300 mb-3"></i>
                    <h4 className="font-black text-slate-500">No Blueprint Generated</h4>
                    <p className="text-xs text-slate-400 mt-1">Upload an approved quotation to unlock the architecture pipeline.</p>
                </div>
            )}

            {showUploader && (
                <ExcelUploader 
                    defaultCustomer={project.name.split('-')[0].trim()} 
                    onUpdateData={(data) => {
                        onUpdateProject(project.id, 'blueprintData', data);
                        setShowUploader(false);
                    }} 
                    onClose={() => setShowUploader(false)} 
                />
            )}
        </div>
    );
}