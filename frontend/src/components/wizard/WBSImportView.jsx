import React, { useState } from 'react';

export default function WBSImportView({ activeProject, onUpdateProject }) {
    const [pasteData, setPasteData] = useState("");

    const handleProcess = () => {
        if (!pasteData.trim()) return;
        const rows = pasteData.split('\n').filter(row => row.trim());
        const newTasks = [];
        
        rows.forEach((row, i) => {
            const cols = row.includes('\t') ? row.split('\t') : row.split(',');
            if (cols.length >= 2) {
                const id = cols[0].trim();
                newTasks.push({
                    id: id,
                    name: cols[1].trim(),
                    prog: cols[2]?.trim() || "0%",
                    resp: cols[3]?.trim() || "Unassigned",
                    start: cols[4]?.trim() || "",
                    end: cols[5]?.trim() || "",
                    isParent: !id.includes('.') // Simple logic: if it has a dot (1.1), it's a subtask
                });
            }
        });

        if (newTasks.length > 0) {
            onUpdateProject(activeProject.id, 'migrationPlan', newTasks);
            alert("WBS Imported successfully! Check the Migration Plan tab.");
            setPasteData("");
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h3 className="font-black text-lg text-slate-800 mb-6"><i className="fas fa-file-import text-purple-600 mr-2"></i> Import External WBS (Excel/CSV)</h3>
                <p className="text-sm text-slate-500 mb-4">If the customer has a mandatory MS Project or Excel WBS, paste it here to overwrite the active Migration Plan.</p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Expected Column Format (Tab or Comma separated):</p>
                    <p className="font-mono text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">WBS_ID | Task Name | Progress | RACI Owner | Start Date | End Date</p>
                </div>

                <textarea 
                    value={pasteData} 
                    onChange={e => setPasteData(e.target.value)} 
                    className="w-full h-64 p-4 border-2 border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-purple-500 bg-white mb-4 whitespace-pre custom-scrollbar" 
                    placeholder="1    Phase 1: Setup    0%    Partner&#10;1.1  Create VPC        0%    Partner"
                />
                
                <div className="flex justify-end">
                    <button onClick={handleProcess} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95">
                        Process & Import WBS
                    </button>
                </div>
            </div>
        </div>
    );
}
