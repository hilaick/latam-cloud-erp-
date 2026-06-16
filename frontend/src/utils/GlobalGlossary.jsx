import React, { useState, useEffect } from 'react';

export default function GlobalGlossary({ isOpen, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');

    // Pressing 'Esc' closes the modal
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const glossaryTerms = [
        { term: "ARB", title: "Architecture Review Board", desc: "A formal governance body that reviews and approves cloud architecture designs, ensuring they meet security, compliance, and best practice standards before implementation." },
        { term: "BOM", title: "Bill of Materials", desc: "The itemized list of precise cloud resources (SKUs, instances, disks) required to build the target environment. Extracted from the Sales Quotation." },
        { term: "Blueprint", title: "Architecture Blueprint", desc: "The ERP's internal JSON representation of the BOM. This is the machine-readable format that the Execution Orchestrator converts into Terraform code." },
        { term: "CBR", title: "Cloud Backup and Recovery", desc: "Huawei's native backup service. The ERP provisions these empty during execution, and attaches production servers to them during Cutover." },
        { term: "DTRB", title: "Delivery Technical Review Board", desc: "The formal engineering gate where Lead Architects review and approve the Blueprint before any infrastructure is provisioned." },
        { term: "EIP", title: "Elastic IP", desc: "A static, public IPv4 address. Used during migrations to bridge the Data Plane so SMS agents can route traffic to private target servers." },
        { term: "MgC", title: "Migration Center", desc: "Huawei Cloud's discovery service. Used to scan source environments (AWS, Azure, On-Prem) and generate the raw inventory data." },
        { term: "PMO", title: "Project Management Office", desc: "The centralized group responsible for defining and maintaining project management standards, tracking execution, and managing resources and timelines across migrations." },
        { term: "SOW", title: "Statement of Work", desc: "The legally binding commercial document signed by the customer. It contains the BOM and the scope of migration services." },
        { term: "STS", title: "Security Token Service", desc: "Provides temporary, ephemeral API credentials (AK/SK). Used to ensure Zero-Trust execution without exposing master account keys." },
        { term: "Vector", title: "Execution Vector", desc: "The algorithmic path chosen by the ERP to migrate a specific server. (e.g., Vector 1 uses SMS agents, Vector 3 uses offline VHD uploads)." }
    ];

    const filteredTerms = glossaryTerms.filter(t => 
        t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||  
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex justify-end">
            {/* Dark Overlay */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            ></div>
            
            {/* Panel */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left border-l border-slate-200">
                <div className="px-6 py-5 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="font-black text-lg"><i className="fas fa-book-open mr-2"></i> Cloud ERP Glossary</h2>
                        <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-1">Definitions & Terminology</p>
                    </div>
                    <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input 
                            type="text" 
                            placeholder="Search terms (e.g., BOM, DTRB)..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white custom-scrollbar">
                    {filteredTerms.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <i className="fas fa-ghost text-4xl mb-3 opacity-20"></i>
                            <p className="text-sm font-bold">No terms found matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        filteredTerms.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-indigo-100 text-indigo-800 font-black text-xs px-2 py-1 rounded border border-indigo-200">
                                        {item.term}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700">{item.title}</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center shrink-0">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        LATAM Cloud Delivery Framework
                    </p>
                </div>
            </div>
        </div>
    );
}
