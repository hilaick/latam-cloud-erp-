const formatShortDate = (dateStr) => {
    if (!dateStr || dateStr === 'Pending' || dateStr === 'TBD') return "TBD";
    const d = new Date(dateStr); if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

function EditableCell({ value, onSave, type = "text", className = "", placeholder = "" }) {
  const [isEditing, setIsEditing] = useState(false); const [editValue, setEditValue] = useState(value);
  useEffect(() => { setEditValue(value); }, [value]);
  const handleSave = () => { setIsEditing(false); if (editValue !== value) onSave(editValue); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && type !== 'textarea') handleSave(); if (e.key === 'Escape') { setIsEditing(false); setEditValue(value); } };

  if (isEditing) {
    if (type === 'textarea') return <textarea autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={e=>{if(e.key==='Escape')handleSave()}} className={`w-full p-1 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`} rows={3} />
    if (type === 'select') {
        let options = placeholder === 'health' ? ['Green', 'Yellow', 'Red'] : ['Low', 'Medium', 'High', 'Ultra-High'];
        return <select autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSave} className={`w-full p-0.5 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`}>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
    }
    return <input autoFocus type={type} value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={`w-full p-0.5 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`} />
  }
  const displayValue = type === 'date' ? formatShortDate(value) : value;
  return <div className={`cursor-pointer hover:bg-slate-200 rounded px-1 -ml-1 inline-flex items-center group relative min-h-[16px] w-full ${className}`} onClick={() => setIsEditing(true)} title="Click to edit">{displayValue || <span className="italic text-slate-400">{placeholder || 'Edit'}</span>}<i className="fas fa-pencil-alt text-[8px] text-slate-400 ml-1 opacity-0 group-hover:opacity-100 absolute right-0 bg-slate-200 pl-1"></i></div>;
}

function ConfigModal({ project, onClose, onSave }) {
    const [config, setConfig] = useState(project?.apiConfig || { accessKey: "", secretKey: "", region: "la-south-2", automationEnabled: false });
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 flex flex-col">
                <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl"><h3 className="font-black text-base text-slate-800"><i className="fas fa-cog text-blue-600 mr-2"></i>Project Configuration</h3><button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-lg"><i className="fas fa-times"></i></button></div>
                <div className="p-6 space-y-5">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start"><i className="fas fa-info-circle text-blue-500 mt-0.5"></i><p className="text-xs text-blue-900 leading-relaxed">Providing secure IAM credentials allows the Delivery Platform to query Destination Cloud APIs for live reconciliation.</p></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Target Cloud Region</label><select value={config.region} onChange={e=>setConfig({...config, region: e.target.value})} className="w-full p-2 border rounded bg-slate-50 outline-none focus:border-blue-500"><option value="la-south-2">la-south-2 (Mexico)</option><option value="la-north-2">la-north-2 (Lima)</option><option value="sa-brazil-1">sa-brazil-1 (Sao Paulo)</option><option value="na-mexico-1">na-mexico-1 (Querétaro)</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Service Account Access Key (AK)</label><input type="text" value={config.accessKey} onChange={e=>setConfig({...config, accessKey: e.target.value})} className="w-full p-2 border rounded bg-slate-50 font-mono text-xs outline-none focus:border-blue-500" placeholder="HW_XXXXXXXXXXXXXXXX" /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Service Account Secret Key (SK)</label><input type="password" value={config.secretKey} onChange={e=>setConfig({...config, secretKey: e.target.value})} className="w-full p-2 border rounded bg-slate-50 font-mono text-xs outline-none focus:border-blue-500" placeholder="••••••••••••••••••••••••••••••••" /></div>
                    <div className="pt-2"><label className="flex items-center gap-3 cursor-pointer p-3 border rounded-xl hover:bg-slate-50"><input type="checkbox" checked={config.automationEnabled} onChange={e=>setConfig({...config, automationEnabled: e.target.checked})} className="w-5 h-5 accent-emerald-500" /><div className="flex flex-col"><span className="font-bold text-sm text-slate-800">Enable Live API Reconciliation</span><span className="text-[10px] text-slate-500">Poll provider APIs to auto-update progress</span></div></label></div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3"><button onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button><button onClick={()=>{onSave(config); onClose();}} className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md">Save Configuration</button></div>
            </div>
        </div>
    )
}

function ExcelUploader({ onUpdateData, onClose }) {
    const [pasteData, setPasteData] = useState("");

    const handleProcess = () => {
        if (!pasteData.trim()) return;
        const rows = pasteData.split('\n').filter(row => row.trim());
        let startIndex = 0;
        if (rows.length > 0) {
            const firstCol = rows[0].split(/[\t,]/)[0].toLowerCase().replace(/^"|"$/g, '').trim();
            if (firstCol === 'customer' || firstCol === 'customer name') startIndex = 1;
        }
        const newProjects = [];
        for (let i = startIndex; i < rows.length; i++) {
            let cols = rows[i].includes('\t') ? rows[i].split('\t') : rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            cols = cols.map(c => c ? c.trim().replace(/^"|"$/g, '') : "");
            if (cols.length >= 2) {
                newProjects.push(generateDefaultProject(
                    Date.now() + i, cols[0] || "Unnamed Project", false, "3_planning", cols[2] || "Yellow", 
                    parseFloat((cols[4] || "0").replace(/[^0-9.-]+/g,"")) || 0, cols[5] || "", cols[6] || ""
                ));
            }
        }
        if (newProjects.length > 0) { onUpdateData(newProjects); } else { alert("Could not parse data. Check formatting."); }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-black text-xl flex items-center gap-3 text-slate-800"><i className="fas fa-file-excel text-emerald-600"></i>Upload Excel / Paste Pipeline</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors"><i className="fas fa-times"></i></button>
                </div>
                <div className="p-8 overflow-y-auto">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Paste Tab-Separated Data Here:</p>
                    <textarea value={pasteData} onChange={(e) => setPasteData(e.target.value)} className="w-full h-64 p-5 border-2 border-slate-200 rounded-xl focus:border-emerald-500 font-mono text-xs outline-none bg-slate-50 whitespace-pre text-slate-700"></textarea>
                </div>
                <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider transition-colors">Cancel</button>
                    <button onClick={handleProcess} className="px-6 py-3 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl uppercase tracking-wider shadow-md transition-transform active:scale-95">Process Data & Update</button>
                </div>
            </div>
        </div>
    );
}