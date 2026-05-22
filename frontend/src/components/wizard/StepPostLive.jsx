import React from 'react';

export default function StepPostLive({ project, onUpdateProject }) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center max-w-4xl mx-auto">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fas fa-award text-5xl text-emerald-500"></i>
                </div>
                <h3 className="font-black text-3xl text-slate-800 mb-4">Post-Live Handover Phase</h3>
                <p className="text-slate-500 font-medium max-w-lg mx-auto mb-8 leading-relaxed">
                    The migration is complete. This phase involves FinOps cost optimization, Well-Architected Review (WAR) sign-offs, and final handover to the TAM.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <i className="fas fa-file-signature text-2xl text-blue-500 mb-2"></i>
                        <div className="font-bold text-sm text-slate-800">WAR Sign-Off</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <i className="fas fa-chart-line text-2xl text-emerald-500 mb-2"></i>
                        <div className="font-bold text-sm text-slate-800">Cost Optimization</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <i className="fas fa-handshake text-2xl text-purple-500 mb-2"></i>
                        <div className="font-bold text-sm text-slate-800">TAM Handover</div>
                    </div>
                </div>
            </div>
        </div>
    );
}