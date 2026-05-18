// Input components for Physics Engine


function ComputeNode({ computeCPU, computeRAM, computeOS, sourceEncrypted, storageMode, onParamChange }) {
    const { useState } = React;
    if (storageMode === 'Object') {
        return (
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-center opacity-70 min-h-[200px]">
                <i className="fas fa-server text-4xl text-slate-300 mb-3"></i>
                <h4 className="font-black text-sm text-slate-500 mt-2">1. Compute Node Bypassed</h4>
                <p className="text-xs font-bold text-slate-400 mt-2 max-w-[250px] leading-relaxed">
                    Targeting Object Storage uses direct API transfers, bypassing OS-level block agents and compute constraints.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-h-[200px]">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800">
                    <i className="fas fa-server text-blue-500"></i> 1. Compute Node
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={sourceEncrypted} 
                        onChange={e => onParamChange('sourceEncrypted', e.target.checked)} 
                        className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500" title="e.g. BitLocker, LUKS">
                        Source Disk Encrypted
                    </span>
                </label>
            </div>
            <div className="space-y-5">
                <div>
                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                        <span>CPU Saturation</span>
                        <span className="text-blue-700">{computeCPU}%</span>
                    </label>
                    <input 
                        type="range" 
                        min="10" 
                        max="99" 
                        value={computeCPU} 
                        onChange={e => onParamChange('computeCPU', e.target.value)} 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                    />
                </div>
                <div>
                    <label className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                        <span>RAM Saturation</span>
                        <span className="text-blue-700">{computeRAM}%</span>
                    </label>
                    <input 
                        type="range" 
                        min="10" 
                        max="99" 
                        value={computeRAM} 
                        onChange={e => onParamChange('computeRAM', e.target.value)} 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                    />
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                            Operating System
                        </label>
                        <select 
                            value={computeOS} 
                            onChange={e => onParamChange('computeOS', e.target.value)} 
                            className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"
                        >
                            <option value="Linux">Linux</option>
                            <option value="Windows">Windows</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PayloadInputs({ 
    const { useState } = React;
    storageSize, storageUnit, storageMode, diskType, targetKMS, 
    totalFiles, smallFiles, syncMethod, onParamChange, onTotalFilesChange, onSmallFilesChange 
}) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800">
                    <i className="fas fa-hdd text-blue-500"></i> 2. Target Protocol & Payload
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={targetKMS} 
                        onChange={e => onParamChange('targetKMS', e.target.checked)} 
                        className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500" title="Use Cloud KMS API to encrypt data at rest">
                        Target KMS Encryption
                    </span>
                </label>
            </div>
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="w-1/2 flex gap-2">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                Total Size
                            </label>
                            <input 
                                type="number" 
                                value={storageSize} 
                                onChange={e => onParamChange('storageSize', e.target.value)} 
                                className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"
                            />
                        </div>
                        <div className="w-16">
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                Unit
                            </label>
                            <select 
                                value={storageUnit} 
                                onChange={e => onParamChange('storageUnit', e.target.value)} 
                                className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none bg-slate-50"
                            >
                                <option value="TB">TB</option>
                                <option value="GB">GB</option>
                                <option value="MB">MB</option>
                            </select>
                        </div>
                    </div>
                    <div className="w-1/2">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-rose-700">
                            Target Protocol
                        </label>
                        <select 
                            value={storageMode} 
                            onChange={e => onParamChange('storageMode', e.target.value)} 
                            className="w-full p-3 border-2 border-rose-300 bg-rose-50 text-rose-900 rounded-xl text-xs font-black outline-none"
                        >
                            <option value="Block">Block/File (Disk)</option>
                            <option value="Object">Object Storage</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex gap-4 items-end animate-fade-in border-t border-slate-100 pt-3">
                    <div className="w-1/2">
                        <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                            Total File Count
                        </label>
                        <input 
                            type="number" 
                            value={totalFiles} 
                            onChange={e => onTotalFilesChange(e.target.value)} 
                            className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"
                        />
                    </div>
                    <div className="w-1/2">
                        <label className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase mb-2 text-amber-700">
                            <span title="Files smaller than 64KB">Of which are Small</span>
                            <span className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 border border-amber-200">
                                {/* This will be calculated by parent */}
                            </span>
                        </label>
                        <input 
                            type="number" 
                            value={smallFiles} 
                            onChange={e => onSmallFilesChange(e.target.value)} 
                            className="w-full p-3 border-2 border-amber-300 bg-amber-50 text-amber-900 rounded-xl text-sm font-black outline-none focus:border-amber-500 shadow-inner"
                        />
                    </div>
                </div>

                {storageMode !== 'Object' && (
                    <div className="flex gap-4 pt-1 animate-fade-in">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                Source Disk
                            </label>
                            <select 
                                value={diskType} 
                                onChange={e => onParamChange('diskType', e.target.value)} 
                                className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50"
                            >
                                <option value="HDD">HDD</option>
                                <option value="SSD">SSD</option>
                                <option value="NVMe">NVMe</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-purple-700">
                                Agent Sync Mode
                            </label>
                            <select 
                                value={syncMethod} 
                                onChange={e => onParamChange('syncMethod', e.target.value)} 
                                className="w-full p-3 border-2 border-purple-300 bg-purple-50 text-purple-900 rounded-xl text-xs font-black outline-none"
                            >
                                <option value="Block">Block-Level</option>
                                <option value="File">File-Level (Linux)</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DatabaseRouting({ 
    const { useState } = React;
    excludeDb, dbStorageSize, dbType, dbRowsM, dbRps, storageMode, storageUnit, onParamChange 
}) {
    if (storageMode === 'Object') {
        return (
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-center opacity-70 min-h-[200px]">
                <i className="fas fa-database text-4xl text-slate-300 mb-3"></i>
                <h4 className="font-black text-sm text-slate-500 mt-2">3. Database Routing Bypassed</h4>
                <p className="text-xs font-bold text-slate-400 mt-2 max-w-[250px] leading-relaxed">
                    Object Storage selected. Databases cannot be natively replicated to Object protocols.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-h-[200px]">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
                <h4 className="font-black text-sm flex items-center gap-2 text-slate-800">
                    <i className="fas fa-database text-rose-500"></i> 3. Database Routing
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={excludeDb} 
                        onChange={e => onParamChange('excludeDb', e.target.checked)} 
                        className="w-4 h-4 accent-rose-600"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Split DB Payload
                    </span>
                </label>
            </div>
            {excludeDb ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-[10px] text-rose-800 font-bold leading-relaxed">
                        Excludes DB directories from main payload. Calculates Native DB Logical Replication separately.
                    </div>
                    <div className="flex gap-3">
                        <div className="w-1/3">
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                DB Size ({storageUnit})
                            </label>
                            <input 
                                type="number" 
                                value={dbStorageSize} 
                                onChange={e => onParamChange('dbStorageSize', e.target.value)} 
                                className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                Engine
                            </label>
                            <select 
                                value={dbType} 
                                onChange={e => onParamChange('dbType', e.target.value)} 
                                className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-500 bg-white"
                            >
                                <option value="HANA">HANA</option>
                                <option value="Oracle">Oracle</option>
                                <option value="PostgreSQL">PostgreSQL</option>
                                <option value="SQL Server">SQL Server</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                Est. Rows (M)
                            </label>
                            <input 
                                type="number" 
                                value={dbRowsM} 
                                onChange={e => onParamChange('dbRowsM', e.target.value)} 
                                className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-black tracking-widest uppercase mb-2 text-slate-500">
                                Sync (Rows/s)
                            </label>
                            <input 
                                type="number" 
                                value={dbRps} 
                                onChange={e => onParamChange('dbRps', e.target.value)} 
                                className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-rose-500 bg-white"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 opacity-60">
                    <div>
                        <i className="fas fa-cubes text-3xl mb-2 text-slate-400"></i>
                        <p className="text-xs font-bold">Monolith Sync Active.<br/>DB treated as standard block data.</p>
                    </div>
                </div>
            )}
        </div>
    );
}