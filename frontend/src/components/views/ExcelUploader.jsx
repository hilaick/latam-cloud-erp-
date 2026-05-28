import React, { useState, useEffect } from 'react';

export default function ExcelUploader({ onUpdateData, onClose, defaultCustomer = "" }) {
    const [customerName, setCustomerName] = useState(defaultCustomer);
    const [selectedFile, setSelectedFile] = useState(null);
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
        if (!selectedFile) return alert("Please select a file to upload");
        if (!customerName.trim()) return alert("Please enter a customer name");

        setIsUploading(true);
        setUploadMessage("Uploading and processing...");

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('customer_name', customerName);

            // Get JWT token from localStorage
            const token = localStorage.getItem('erp_jwt_token');
            if (!token) {
                throw new Error("Authentication required. Please log in again.");
            }

            const response = await fetch('/api/upload_quotation', { 
                method: 'POST', 
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                throw new Error("Authentication failed. Please log in again.");
            }
            
            const result = await response.json();

            if (result.success) {
                setUploadMessage(`✅ ${result.message || 'Quotation processed successfully!'}`);
                alert(`✅ Quotation processed successfully!\\n\\nCustomer: ${result.blueprint?.customer || customerName}\\nServers: ${result.stats?.total_servers || 0}\\nWarnings: ${result.stats?.warnings || 0}\\n\\nBlueprint has been updated.`);
                setTimeout(() => {
                    onClose();
                    if (onUpdateData) onUpdateData(result.blueprint);
                }, 1500);
            } else {
                setUploadMessage(`❌ Error: ${result.error}`);
                alert(`❌ Upload failed: ${result.error}`);
            }
        } catch (error) {
            setUploadMessage(`❌ Error: ${error.message}`);
            alert(`❌ Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-black text-xl flex items-center gap-3 text-slate-800"><i className="fas fa-file-excel text-emerald-600"></i> Upload Quotation File</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors"><i className="fas fa-times"></i></button>
                </div>
                
                <div className="p-8 overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Customer Name</label>
                            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g., Acme Corporation" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none bg-white text-slate-800" />
                            <p className="text-xs text-slate-500 mt-1">This will be used as the customer name in the blueprint</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Quotation File (CSV or Excel)</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
                                <input type="file" id="quotation-file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                                <label htmlFor="quotation-file" className="cursor-pointer">
                                    <div className="flex flex-col items-center justify-center">
                                        <i className="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3"></i>
                                        <p className="text-sm font-medium text-slate-600 mb-1">Click to select file or drag and drop</p>
                                        <p className="text-xs text-slate-500">Supports: .csv, .xlsx, .xls</p>
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
                                                <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedFile(null); setUploadMessage(""); document.getElementById('quotation-file').value = ''; }} className="text-slate-400 hover:text-rose-500"><i className="fas fa-times"></i></button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {uploadMessage && (
                            <div className={`p-4 rounded-xl ${uploadMessage.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : uploadMessage.includes('❌') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                <p className="text-sm font-medium">{uploadMessage}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-4">
                    <button onClick={onClose} disabled={isUploading} className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider transition-colors">Cancel</button>
                    <button onClick={handleProcess} disabled={!selectedFile || isUploading} className={`px-6 py-3 text-sm font-black text-white rounded-xl uppercase tracking-wider shadow-md transition-all ${!selectedFile || isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {isUploading ? 'Processing...' : 'Upload & Generate Blueprint'}
                    </button>
                </div>
            </div>
        </div>
    );
}