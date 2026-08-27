import React, { useState } from 'react';
import ExcelUploader from '../../views/ExcelUploader';

export default function StepQuotationUpload({ data, onChange }) {
    const [showUploader, setShowUploader] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [blueprintData, setBlueprintData] = useState(null);
    const d = data || {};

    const handleUploadComplete = (bpData) => {
        setBlueprintData(bpData);
        setUploaded(true);
        onChange({
            ...d,
            quotationFile: bpData?.customer || 'Quotation uploaded',
            blueprintData: bpData,
        });
    };

    // Parse blueprint for preview
    const computeCount = blueprintData?.topology?.compute?.length || 0;
    const dbCount = blueprintData?.topology?.databases?.length || blueprintData?.topology?.database?.length || 0;
    const storageCount = blueprintData?.topology?.storage?.length || 0;
    const networkCount = blueprintData?.topology?.network?.length || 0;
    const totalCount = computeCount + dbCount + storageCount + networkCount;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Quotation & BOM Upload</h3>
                <p className="text-xs text-slate-500">Upload the presales quotation (Excel) so we can validate resources and calculate MRR.</p>
            </div>

            {/* Upload button or uploaded state */}
            {!uploaded ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
                        <i className="fas fa-file-excel text-emerald-600 text-2xl"></i>
                    </div>
                    <h4 className="text-sm font-black text-slate-700 mb-2">Upload Quotation BoM</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                        Supports Excel file upload, paste raw data, or shared link — same as the ARB phase uploader.
                    </p>
                    <button
                        onClick={() => setShowUploader(true)}
                        className="px-6 py-3 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors"
                    >
                        <i className="fas fa-upload mr-1"></i> Upload Quotation
                    </button>
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    {/* Upload success banner */}
                    <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex items-center gap-3 mb-4">
                        <i className="fas fa-check-circle text-emerald-500 text-lg"></i>
                        <div>
                            <div className="text-sm font-bold text-emerald-700">Quotation Uploaded Successfully</div>
                            <div className="text-[10px] text-emerald-600">{blueprintData?.customer || 'Customer'} — {totalCount} resources parsed</div>
                        </div>
                        <button
                            onClick={() => { setUploaded(false); setBlueprintData(null); onChange({ ...d, quotationFile: null, blueprintData: null }); }}
                            className="ml-auto text-[10px] font-bold text-slate-400 hover:text-rose-500"
                        >
                            <i className="fas fa-times mr-1"></i> Remove
                        </button>
                    </div>

                    {/* BOM Preview */}
                    {blueprintData && (
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Parsed BOM Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-blue-600">{computeCount}</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-1">Compute (ECS)</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-emerald-600">{dbCount}</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-1">Databases (RDS)</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-amber-600">{storageCount}</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-1">Storage (EVS/OBS)</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-purple-600">{networkCount}</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-1">Network (VPC/EIP)</div>
                                </div>
                            </div>

                            {/* Compute detail preview */}
                            {blueprintData.topology?.compute?.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="text-[9px] uppercase text-slate-400 border-b border-slate-200">
                                            <tr>
                                                <th className="text-left py-2">Server</th>
                                                <th className="text-left py-2">Flavor</th>
                                                <th className="text-right py-2">vCPU</th>
                                                <th className="text-right py-2">RAM</th>
                                                <th className="text-right py-2">Disk</th>
                                                <th className="text-left py-2">OS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {blueprintData.topology.compute.slice(0, 8).map((srv, i) => (
                                                <tr key={i} className="text-slate-600">
                                                    <td className="py-2 font-mono">{srv.name || srv.server_name || `Server-${i+1}`}</td>
                                                    <td>{srv.flavor || srv.flavorRef || '—'}</td>
                                                    <td className="text-right">{srv.vcpus || srv.vCPU || '—'}</td>
                                                    <td className="text-right">{srv.ram || srv.memory || '—'}</td>
                                                    <td className="text-right">{srv.disk || srv.system_disk_size || '—'}</td>
                                                    <td className="text-[10px]">{srv.os || srv.os_type || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {blueprintData.topology.compute.length > 8 && (
                                        <div className="text-center text-[10px] text-slate-400 mt-2">
                                            +{blueprintData.topology.compute.length - 8} more servers...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Skip option */}
            <div className="text-center">
                <button
                    onClick={() => onChange({ ...d, quotationSkipped: true })}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                    Skip for now — I'll add the quotation later in Phase 1 (ARB)
                </button>
            </div>

            {/* Excel Uploader Modal */}
            {showUploader && (
                <ExcelUploader
                    defaultCustomer={d.customerName || ''}
                    projectId={d.projectId || ''}
                    onUpdateData={handleUploadComplete}
                    onClose={() => setShowUploader(false)}
                />
            )}
        </div>
    );
}
