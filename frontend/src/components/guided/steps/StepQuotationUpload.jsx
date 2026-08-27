import React, { useState } from 'react';

export default function StepQuotationUpload({ data, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const d = data || {};

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onChange({ ...d, quotationFile: e.dataTransfer.files[0].name });
      setUploaded(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800 mb-1">Quotation & BOM Upload</h3>
        <p className="text-xs text-slate-500">Upload the presales quotation (Excel) so we can validate resources and calculate MRR.</p>
      </div>

      {/* Drag & drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragging ? 'border-blue-400 bg-blue-50 scale-[1.02]' : uploaded ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400'}`}
      >
        {uploaded ? (
          <div>
            <i className="fas fa-check-circle text-4xl text-emerald-500 mb-3"></i>
            <h4 className="text-sm font-black text-emerald-700">Quotation Uploaded</h4>
            <p className="text-xs text-emerald-600 mt-1 font-mono">{d.quotationFile}</p>
            <button onClick={() => { setUploaded(false); onChange({ ...d, quotationFile: null }); }} className="mt-3 text-[10px] font-bold text-slate-400 hover:text-rose-500">
              <i className="fas fa-times mr-1"></i> Remove
            </button>
          </div>
        ) : (
          <div>
            <i className={`fas fa-file-excel text-4xl ${dragging ? 'text-blue-500' : 'text-slate-300'} mb-3`}></i>
            <h4 className="text-sm font-bold text-slate-600">Drag & drop your quotation Excel file</h4>
            <p className="text-xs text-slate-400 mt-1">or click to browse — supports .xlsx and .xls</p>
          </div>
        )}
      </div>

      {/* BOM Preview (after upload) */}
      {uploaded && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6" style={{ animation: 'fadeIn 0.3s ease' }}>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">BOM Preview</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[9px] uppercase text-slate-400 border-b border-slate-200">
                <tr><th className="text-left py-2">Server</th><th className="text-left py-2">Flavor</th><th className="text-right py-2">vCPU</th><th className="text-right py-2">RAM</th><th className="text-right py-2">Disk</th><th className="text-right py-2">Monthly</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="text-slate-600"><td className="py-2 font-mono">sap-prd-db01</td><td>e3.14xlarge.12</td><td className="text-right">56</td><td className="text-right">696 GB</td><td className="text-right">2 TB</td><td className="text-right font-bold text-emerald-600">$8,420</td></tr>
                <tr className="text-slate-600"><td className="py-2 font-mono">sap-prd-app01</td><td>h1.8xlarge.4</td><td className="text-right">32</td><td className="text-right">128 GB</td><td className="text-right">500 GB</td><td className="text-right font-bold text-emerald-600">$2,180</td></tr>
                <tr className="text-slate-600"><td className="py-2 font-mono">sap-prd-web01</td><td>c6.2xlarge.4</td><td className="text-right">8</td><td className="text-right">32 GB</td><td className="text-right">200 GB</td><td className="text-right font-bold text-emerald-600">$580</td></tr>
              </tbody>
              <tfoot className="border-t-2 border-slate-200">
                <tr className="font-black text-slate-700"><td className="py-3" colSpan={5}>Total MRR</td><td className="text-right text-emerald-600">$11,180</td></tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400">
            <i className="fas fa-info-circle"></i> All servers in the BOM have matching source resources discovered.
          </div>
        </div>
      )}

      {/* Skip option */}
      <div className="text-center">
        <button onClick={() => onChange({ ...d, quotationSkipped: true })} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
          Skip for now — I'll add the quotation later
        </button>
      </div>
    </div>
  );
}
