import React from 'react';

export default function StepArchitecture({ project, onUpdateProject }) {
    return (
        <div className="animate-fade-in p-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <i className="fas fa-project-diagram text-2xl text-blue-500"></i>
                    <h3 className="font-black text-xl text-slate-800">Architecture Phase</h3>
                </div>
                <p className="text-slate-600 mb-4">
                    This phase will contain the AI-generated architecture diagrams and topology mapping.
                    The blueprint from ARB Intake will be analyzed to generate visual infrastructure diagrams.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-700 mb-2">Topology Analysis</h4>
                        <p className="text-sm text-slate-500">Visual representation of server placements, network zones, and security groups.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-700 mb-2">Resource Mapping</h4>
                        <p className="text-sm text-slate-500">Mapping of quotation items to Huawei Cloud resources (ECS, RDS, ELB, etc.)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}