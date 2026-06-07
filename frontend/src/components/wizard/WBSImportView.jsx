import React, { useState } from 'react';

export default function WBSImportView({ activeProject, onUpdateProject }) {
    const [pasteData, setPasteData] = useState("");

    const handleProcess = () => {
        if (!pasteData.trim()) return;
        const rows = pasteData.split('\n').filter(row => row.trim());
        const newTasks = [];
        
        // 🚨 NEW: Smart Regex Parser 
        // Matches exact format: ID | Name | % | Start Date | End Date | RACI
        // Example: 2.1 Provisioning the VPC 100% 3/28/2026 3/28/2026 UCE, Huawei (S)
        const smartRegex = /^([\d.]+)\s+(.+?)\s+(\d+%)\s+(\S+)\s+(\S+)(?:\s+(.*))?$/;

        rows.forEach((row, i) => {
            const cleanRow = row.trim();
            const match = cleanRow.match(smartRegex);
            
            if (match) {
                newTasks.push({
                    id: match[1],
                    name: match[2].trim(),
                    prog: match[3],
                    start: match[4] === 'TBD' ? '' : match[4],
                    end: match[5] === 'TBD' ? '' : match[5],
                    resp: match[6] ? match[6].trim() : "Unassigned",
                    isParent: !match[1].includes('.')
                });
            } else {
                // Legacy fallback for strictly tab/comma separated data
                const cols = row.includes('\t') ? row.split('\t') : row.split(',');
                if (cols.length >= 2) {
                    const id = cols[0].trim();
                    newTasks.push({
                        id: id,
                        name: cols[1]?.trim() || "Unknown Task",
                        prog: cols[2]?.trim() || "0%",
                        resp: cols[3]?.trim() || "Unassigned",
                        start: cols[4]?.trim() || "",
                        end: cols[5]?.trim() || "",
                        isParent: !id.includes('.')
                    });
                }
            }
        });

        if (newTasks.length > 0) {
            onUpdateProject(activeProject.id, 'migrationPlan', newTasks);
            alert(`WBS Imported successfully! Parsed ${newTasks.length} tasks. Check the Migration Plan tab.`);
            setPasteData("");
        } else {
            alert("Could not extract valid tasks. Please check your format.");
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h3 className="font-black text-lg text-slate-800 mb-6"><i className="fas fa-file-import text-purple-600 mr-2"></i> Import External WBS</h3>
                <p className="text-sm text-slate-500 mb-4">If the customer has a mandatory MS Project or Excel WBS, paste it here to overwrite the active Migration Plan.</p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Supported Formats (Auto-Detected):</p>
                    <ul className="list-disc pl-5 text-xs text-slate-700 font-mono space-y-1">
                        <li>ID &lt;Space&gt; Task Name &lt;Space&gt; Progress &lt;Space&gt; Start Date &lt;Space&gt; End Date &lt;Space&gt; RACI Owner</li>
                        <li>Tab-separated or Comma-separated columns.</li>
                    </ul>
                    <p className="text-[10px] text-slate-500 mt-3"><i className="fas fa-info-circle mr-1"></i> Example: <span className="font-black text-slate-800">1.1 Create VPC 100% 3/25/2026 3/25/2026 Customer IT</span></p>
                </div>

                <textarea 
                    value={pasteData} 
                    onChange={e => setPasteData(e.target.value)} 
                    className="w-full h-64 p-4 border-2 border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-purple-500 bg-white mb-4 whitespace-pre custom-scrollbar leading-relaxed" 
                    placeholder="1 Preparation phase: 100% 3/25/2026 3/27/2026&#10;1.1 Creating the account 100% 3/25/2026 3/25/2026 Gestnett/UCE/Huawei"
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
