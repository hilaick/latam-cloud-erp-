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
    const [customerName, setCustomerName] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['.csv', '.xlsx', '.xls'];
            const fileExt = file.name.split('.').pop().toLowerCase();
            
            if (!allowedTypes.includes(`.${fileExt}`)) {
                alert('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
                e.target.value = ''; // Clear the file input
                setSelectedFile(null);
                return;
            }
            
            setSelectedFile(file);
            setUploadMessage(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            
            // Auto-extract customer name from filename if not set
            if (!customerName.trim()) {
                const nameFromFile = file.name
                    .replace(/\.[^/.]+$/, '') // Remove extension
                    .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
                    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
                setCustomerName(nameFromFile);
            }
        }
    };

    const handleProcess = async (e) => {
        if (e) {
            e.preventDefault(); // Prevent any default form submission
            e.stopPropagation();
        }
        
        if (!selectedFile) {
            alert("Please select a file to upload");
            return;
        }

        if (!customerName.trim()) {
            alert("Please enter a customer name");
            return;
        }

        setIsUploading(true);
        setUploadMessage("Uploading and processing...");

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('customer_name', customerName);

            const response = await fetch('/api/upload_quotation', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                setUploadMessage(`✅ ${result.message}`);
                
                // Show success details
                alert(`✅ Quotation processed successfully!\n\n` +
                      `Customer: ${result.blueprint.customer}\n` +
                      `Servers: ${result.stats.total_servers}\n` +
                      `Warnings: ${result.stats.warnings}\n\n` +
                      `Blueprint has been updated. All mandatory artefacts auto-approved.`);
                
                // Close the uploader after successful upload
                setTimeout(() => {
                    onClose();
                    // Call onUpdateData with the blueprint data to update React state
                    console.log('ExcelUploader: Upload successful, calling onUpdateData with:', result.blueprint);
                    if (onUpdateData) {
                        onUpdateData(result.blueprint);
                    } else {
                        console.error('ExcelUploader: onUpdateData is undefined!');
                    }
                }, 1500);
            } else {
                setUploadMessage(`❌ Error: ${result.error}`);
                alert(`❌ Upload failed: ${result.error}`);
            }
        } catch (error) {
            setUploadMessage(`❌ Network error: ${error.message}`);
            alert(`❌ Network error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-black text-xl flex items-center gap-3 text-slate-800">
                        <i className="fas fa-file-excel text-emerald-600"></i>
                        Upload Quotation File
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Customer Name Input */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Customer Name
                            </label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="e.g., Acme Corporation"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none bg-white text-slate-800"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                This will be used as the customer name in the blueprint
                            </p>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Quotation File (CSV or Excel)
                            </label>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
                                <input
                                    type="file"
                                    id="quotation-file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label htmlFor="quotation-file" className="cursor-pointer">
                                    <div className="flex flex-col items-center justify-center">
                                        <i className="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3"></i>
                                        <p className="text-sm font-medium text-slate-600 mb-1">
                                            Click to select file or drag and drop
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Supports: .csv, .xlsx, .xls
                                        </p>
                                    </div>
                                </label>
                            </div>
                            
                            {selectedFile && (
                                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <i className="fas fa-file-excel text-emerald-600"></i>
                                            <div>
                                                <p className="font-medium text-slate-800">{selectedFile.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {(selectedFile.size / 1024).toFixed(1)} KB • {
                                                        selectedFile.name.endsWith('.csv') ? 'CSV' : 
                                                        selectedFile.name.endsWith('.xlsx') ? 'Excel' : 'Excel'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setUploadMessage("");
                                                document.getElementById('quotation-file').value = '';
                                            }}
                                            className="text-slate-400 hover:text-rose-500"
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Upload Message */}
                        {uploadMessage && (
                            <div className={`p-4 rounded-xl ${uploadMessage.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                uploadMessage.includes('❌') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                                'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                <div className="flex items-center space-x-2">
                                    {uploadMessage.includes('✅') && <i className="fas fa-check-circle"></i>}
                                    {uploadMessage.includes('❌') && <i className="fas fa-exclamation-circle"></i>}
                                    {!uploadMessage.includes('✅') && !uploadMessage.includes('❌') && <i className="fas fa-info-circle"></i>}
                                    <p className="text-sm font-medium">{uploadMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* File Format Requirements */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Expected File Format</h4>
                            <p className="text-xs text-slate-600 mb-2">
                                Your CSV/Excel file should include columns like:
                            </p>
                            <div className="text-xs font-mono bg-white p-3 rounded border border-slate-300">
                                server_name,flavor,cpu,ram,is_public,tier,os_type,storage_gb<br/>
                                web-server-1,s6.large.2,2,4,Yes,Web Tier,Linux,50<br/>
                                db-server-1,c6.2xlarge.4,8,16,No,Database,Linux,200
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                The system will automatically match column names (fuzzy matching supported)
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-4">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider transition-colors"
                        disabled={isUploading}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleProcess}
                        type="button"
                        disabled={!selectedFile || isUploading}
                        className={`px-6 py-3 text-sm font-black text-white rounded-xl uppercase tracking-wider shadow-md transition-all ${!selectedFile || isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'}`}
                    >
                        {isUploading ? (
                            <span className="flex items-center gap-2">
                                <i className="fas fa-spinner fa-spin"></i>
                                Processing...
                            </span>
                        ) : (
                            'Upload & Generate Blueprint'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Global window bindings for Babel Standalone scoping
window.formatShortDate = formatShortDate; window.EditableCell = EditableCell; window.ConfigModal = ConfigModal; window.ExcelUploader = ExcelUploader;