import React from 'react';

export default function StepPostLive({ project, onUpdateProject }) {
    return (
        <div className="animate-fade-in p-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <i className="fas fa-award text-2xl text-emerald-500"></i>
                    <h3 className="font-black text-xl text-slate-800">Post-Live Phase</h3>
                </div>
                <p className="text-slate-600 mb-4">
                    This phase will contain post-migration validation, handover documentation, and customer acceptance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-700 mb-2">Handover Checklist</h4>
                        <p className="text-sm text-slate-500">Final validation and customer acceptance sign-off.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-700 mb-2">Support Transition</h4>
                        <p className="text-sm text-slate-500">Transition to operations team with runbooks and monitoring.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}