import React, { useState, useEffect } from 'react';

export default function ExcelUploader({ onUpdateData, onClose, defaultCustomer = "", projectId = "" }) {
    const [customerName, setCustomerName] = useState(defaultCustomer);
    
    // Upload Modes
    const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'paste'
    const [selectedFile, setSelectedFile] = useState(null);
    const [pastedData, setPastedData] = useState("");
    
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("");

    useEffect(() => {
        if (defaultCustomer) setCustomerName(defaultCustomer);
    }, [defaultCustomer]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['.csv', '.xlsx', '.xls'];
            const fileExt = file.name.split('.').pop().toLowerCase();
            if (!allowedTypes.includes(`.${fileExt}`)) {
                alert('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
                e.target.value = '';
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setUploadMessage(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            if (!customerName.trim()) {
                const nameFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                setCustomerName(nameFromFile);
            }
        }
    };

    const handleProcess = async (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        
        if (uploadMode === 'file' && !selectedFile) return alert("Please select a file to upload.");
        if (uploadMode === 'paste' && !pastedData.trim()) return alert("Please paste data into the text area.");
        if (!customerName.trim()) return alert("Please enter a customer name.");

        setIsUploading(true);
        setUploadMessage("Uploading and processing...");

        try {
            const formData = new FormData();
            formData.append('customer_name', customerName);
            if (projectId) formData.append('project_id', projectId);

            if (uploadMode === 'file') {
                formData.append('file', selectedFile);
            } else {
                formData.append('raw_text', pastedData);
            }

            const token = localStorage.getItem('erp_jwt_token');
            if (!token) throw new Error("Authentication required. Please log in again.");
            
            const response = await fetch('/api/upload_quotation', { 
                method: 'POST', 
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401) throw new Error("Authentication failed. Please log in again.");
            
            const result = await response.json();

            if (result.success) {
                setUploadMessage(`✅ ${result.message || 'Quotation processed successfully!'}`);
                alert(`✅ Quotation processed successfully!\n\nCustomer: ${result.blueprint?.customer || customerName}\nServers: ${result.stats?.total_servers || 0}\n\nBlueprint has been updated.`);
                setTimeout(() => {
                    onClose();
                    if (onUpdateData) onUpdateData(result.blueprint);
                }, 1500);
            } else {
                setUploadMessage(`❌ Error: ${result.error}`);
                alert(`❌ Processing failed: ${result.error}`);
            }
        } catch (error) {
            setUploadMessage(`❌ Error: ${error.message}`);
            alert(`❌ Network/Processing failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex justify-between items-center shrink-0">
                    <h3 className="font-black text-xl flex items-center gap-3 text-slate-800"><i className="fas fa-file-excel text-emerald-600"></i> Import Quotation</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors"><i className="fas fa-times"></i></button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Customer / Project Context</label>
                            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g., Acme Corporation" className="w-full p-3 border border-slate-300 rounded-xl focus:border-emerald-500 outline-none bg-white font-bold text-slate-800 shadow-sm" />
                        </div>

                        {/* MODE TOGGLE TABS */}
                        <div className="flex border-b border-slate-200 mt-6">
                            <button 
                                onClick={() => setUploadMode('file')} 
                                className={`pb-3 px-6 text-xs uppercase tracking-widest font-black border-b-2 transition-colors ${uploadMode === 'file' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50 rounded-t-lg' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <i className="fas fa-upload mr-2"></i> File Upload
                            </button>
                            <button 
                                onClick={() => setUploadMode('paste')} 
                                className={`pb-3 px-6 text-xs uppercase tracking-widest font-black border-b-2 transition-colors ${uploadMode === 'paste' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50 rounded-t-lg' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <i className="fas fa-paste mr-2"></i> Paste Raw Data
                            </button>
                        </div>

                        {/* CONTENT BASED ON TAB */}
                        {uploadMode === 'file' ? (
                            <div className="animate-fade-in">
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors bg-slate-50">
                                    <input type="file" id="quotation-file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                                    <label htmlFor="quotation-file" className="cursor-pointer">
                                        <div className="flex flex-col items-center justify-center">
                                            <i className="fas fa-file-csv text-5xl text-emerald-500 mb-4 opacity-80"></i>
                                            <p className="text-sm font-bold text-slate-700 mb-1">Click to browse or drag file here</p>
                                            <p className="text-xs text-slate-500 font-medium">Accepts native .xlsx or .csv exports</p>
                                        </div>
                                    </label>
                                </div>
                                
                                {selectedFile && (
                                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <i className="fas fa-check-circle text-emerald-600 text-xl"></i>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{selectedFile.name}</p>
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <button onClick={() => { setSelectedFile(null); setUploadMessage(""); document.getElementById('quotation-file').value = ''; }} className="text-slate-400 hover:text-rose-500"><i className="fas fa-times"></i></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Paste Excel / CSV Contents</label>
                                <textarea 
                                    value={pastedData} 
                                    onChange={e => setPastedData(e.target.value)} 
                                    placeholder="Open your file in Excel, select all cells (Ctrl+A), copy (Ctrl+C), and paste them here (Ctrl+V)..." 
                                    className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:border-emerald-500 outline-none font-mono text-[10px] text-slate-700 shadow-inner bg-slate-50 custom-scrollbar leading-relaxed whitespace-pre"
                                ></textarea>
                                <p className="text-[10px] text-slate-400 font-bold mt-2"><i className="fas fa-info-circle mr-1"></i> Bypasses file encoding issues by parsing raw tab-separated or comma-separated text.</p>
                            </div>
                        )}

                        {uploadMessage && (
                            <div className={`p-4 rounded-xl border ${uploadMessage.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : uploadMessage.includes('❌') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                <p className="text-xs font-black uppercase tracking-widest">{uploadMessage}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} disabled={isUploading} className="px-6 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl uppercase tracking-widest transition-colors">Cancel</button>
                    <button onClick={handleProcess} disabled={(uploadMode==='file'&&!selectedFile) || (uploadMode==='paste'&&!pastedData) || isUploading} className={`px-8 py-2.5 text-xs font-black text-white rounded-xl uppercase tracking-widest shadow-md transition-all ${(uploadMode==='file'&&!selectedFile) || (uploadMode==='paste'&&!pastedData) || isUploading ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'}`}>
                        {isUploading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Processing</> : <><i className="fas fa-magic mr-2"></i> Generate Blueprint</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
