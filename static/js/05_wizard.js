function ProjectCommandCenter({ project, onUpdateProject, customPlaybooks }) {
    const isPoC = project?.project_type === "poc";
    
    console.log("ProjectCommandCenter - Project:", project?.name);
    console.log("ProjectCommandCenter - isPoC:", isPoC);
    console.log("ProjectCommandCenter - project_type:", project?.project_type);
    
    // Dynamic Phase Arrays: Remove Post-Live if PoC
    const states = isPoC 
        ? ['1_arb', '2_architecture', '3_planning', '4_execution']
        : ['1_arb', '2_architecture', '3_planning', '4_execution', '5_postlive'];
        
    const stepLabels = isPoC
        ? ['ARB Intake', 'Architecture', 'PoC Budgeting', 'Active Execution']
        : ['ARB Intake', 'Architecture', 'Delivery Planning', 'Active Execution', 'Post-Live WAR'];

    const currentIndex = Math.max(0, states.indexOf(project?.lifecycleState || '1_arb'));
    const [viewIndex, setViewIndex] = useState(currentIndex);
    useEffect(() => { setViewIndex(currentIndex); }, [currentIndex]);

    const promoteState = () => {
        if (currentIndex < states.length - 1) {
            const nextState = states[currentIndex + 1];
            onUpdateProject(project.id, 'lifecycleState', nextState);
            alert(`Project Promoted to: ${stepLabels[currentIndex + 1]}`);
        } else if (isPoC && currentIndex === states.length - 1) {
            // PoC finishes at Execution
            onUpdateProject(project.id, 'lifecycleState', '6_completed');
            alert("PoC Execution Complete. Project Archived.");
        }
    };

    if (!project) return null;

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto flex flex-col">
            {isPoC && (
                <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 mb-4 rounded shadow-sm flex items-center">
                    <i className="fas fa-bolt text-2xl mr-4"></i>
                    <div>
                        <p className="font-black">Fast-Track PoC Lifecycle Active</p>
                        <p className="text-xs">Post-Live WAR phase disabled. Strict budget cap and Expiration TTL required.</p>
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-5 flex-1">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-blue-200 shrink-0"><i className="fas fa-building text-blue-600 text-2xl"></i></div>
                    <div><h2 className="text-xl font-black text-slate-800 leading-tight">{project.name}</h2><p className="text-xs font-bold text-slate-500 mt-1 tracking-widest uppercase">Project Command Center</p></div>
                </div>
                <div className="hidden lg:flex items-center gap-2 flex-1 justify-end max-w-3xl">
                    {states.map((s, idx) => {
                        const isCompleted = idx < currentIndex;
                        const isActive = idx === currentIndex;
                        const isViewing = idx === viewIndex;
                        let cssClass = "step-pending cursor-pointer hover:bg-slate-50";
                        if (isActive) cssClass = "step-active shadow-md ring-2 ring-blue-200";
                        else if (isCompleted) cssClass = "step-completed cursor-pointer hover:bg-emerald-100";
                        if (isViewing && !isActive) cssClass += " ring-2 ring-slate-300";

                        return (
                            <React.Fragment key={s}>
                                <div onClick={()=> idx <= currentIndex ? setViewIndex(idx) : null} className={`flex-1 text-center py-2 px-3 rounded-xl border-2 transition-all ${cssClass} ${idx > currentIndex ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <div className="text-[9px] font-black uppercase tracking-widest opacity-80">Step {idx+1}</div>
                                    <div className="text-xs font-bold mt-0.5">{stepLabels[idx]}</div>
                                </div>
                                {idx < states.length - 1 && <div className="w-4 h-0.5 bg-slate-300 shrink-0"></div>}
                            </React.Fragment>
                        )
                    })}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 pb-12">
                {viewIndex === 0 && <WizardStepARB project={project} onUpdateProject={onUpdateProject} onPromote={promoteState} isCurrent={currentIndex===0} />}
                {viewIndex === 1 && <WizardStepArchitecture project={project} onUpdateProject={onUpdateProject} onPromote={promoteState} isCurrent={currentIndex===1} />}
                {viewIndex === 2 && <WizardStepPlanning project={project} onUpdateProject={onUpdateProject} onPromote={promoteState} isCurrent={currentIndex===2} customPlaybooks={customPlaybooks} isPoC={isPoC} />}
                {viewIndex === 3 && <WizardStepExecution project={project} onUpdateProject={onUpdateProject} onPromote={promoteState} isCurrent={currentIndex===3} />}
                {viewIndex === 4 && !isPoC && <WizardStepPostLive project={project} onUpdateProject={onUpdateProject} onPromote={promoteState} isCurrent={currentIndex===4} />}
            </div>
        </div>
    );
}

function WizardStepARB({ project, onUpdateProject, onPromote, isCurrent }) {
    console.log('WizardStepARB rendering with project:', project?.id, 'blueprintData:', project?.blueprintData);
    const [showUploader, setShowUploader] = useState(false);
    const [hasBlueprint, setHasBlueprint] = useState(false);
    const [artefactsComplete, setArtefactsComplete] = useState(false);

    // Check if project has blueprint data and artefacts are complete
    useEffect(() => {
        console.log('WizardStepARB useEffect running with project:', project?.id);
        // Check if blueprint exists in project data
        const hasBP = !!project?.blueprintData;
        console.log('Setting hasBlueprint to:', hasBP, 'from blueprintData:', project?.blueprintData);
        setHasBlueprint(hasBP);
        
        // Check if all artefacts are complete
        const artefacts = project?.arbArtefacts || {};
        const allComplete = artefacts.presentStateHLD && artefacts.targetArchitecture && artefacts.sowSigned;
        console.log('Setting artefactsComplete to:', allComplete, 'from artefacts:', artefacts);
        setArtefactsComplete(allComplete);
        
        console.log('WizardStepARB useEffect:', { 
            hasBlueprint: hasBP, 
            artefacts, 
            allComplete,
            projectId: project?.id,
            blueprintDataExists: !!project?.blueprintData,
            blueprintData: project?.blueprintData
        });
    }, [project, project?.blueprintData, project?.arbArtefacts]);

    const handleBlueprintGenerated = (blueprintData) => {
        console.log('handleBlueprintGenerated called for project:', project.id, 'with data:', blueprintData);
        
        // Update project with blueprint data AND artefacts in a single update
        onUpdateProject(project.id, {
            blueprintData: blueprintData,
            arbArtefacts: {
                presentStateHLD: true,
                targetArchitecture: true,
                sowSigned: true
            }
        });
        
        console.log('handleBlueprintGenerated: Updated project state with blueprint and artefacts');
        // Alert removed - ExcelUploader already shows one
    };

    const areAllArtefactsComplete = () => {
        return artefactsComplete;
    };

    return (
        <div className="p-8">
            <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
                <div>
                    <h3 className="font-black text-2xl text-slate-800">
                        <i className="fas fa-door-open text-blue-600 mr-3"></i> 
                        Step 1: ARB Intake Gate
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Validate the technical SOW and Architectures provided by the Sales Architect.
                    </p>
                </div>
                {isCurrent && (
                    <button 
                        onClick={onPromote} 
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!hasBlueprint || !areAllArtefactsComplete()}
                        title={!hasBlueprint ? "Upload quotation first" : !artefactsComplete ? "Complete all mandatory artefacts" : "Approve ARB and advance to Architecture"}
                    >
                        {hasBlueprint && areAllArtefactsComplete() ? (
                            <>
                                Approve ARB & Advance <i className="fas fa-arrow-right ml-2"></i>
                            </>
                        ) : (
                            <>
                                {!hasBlueprint ? "Upload Quotation to Begin" : "Complete Artefacts First"} <i className="fas fa-exclamation-circle ml-2"></i>
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Quotation Upload */}
                <div className="space-y-6">
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <i className="fas fa-file-excel text-emerald-600"></i>
                                Quotation Upload
                            </h4>
                            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                                Required
                            </span>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-6">
                            Upload the Sales Architect's quotation (Excel/CSV) to generate the technical blueprint.
                            The system will normalize column names and validate the architecture.
                        </p>

                        {hasBlueprint ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <i className="fas fa-check-circle text-emerald-600 text-xl"></i>
                                    <div>
                                        <h5 className="font-bold text-emerald-800">Blueprint Generated</h5>
                                        <p className="text-sm text-emerald-700">
                                            Customer: <span className="font-bold">{project.blueprintData?.customer || 'Unknown'}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                        <div className="text-emerald-600 font-bold">Servers</div>
                                        <div className="text-lg font-black text-slate-800">
                                            {project.blueprintData?.topology?.compute?.length || 0}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                        <div className="text-emerald-600 font-bold">Status</div>
                                        <div className="text-lg font-black text-emerald-700">
                                            Ready
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowUploader(true)}
                                    className="w-full mt-4 px-4 py-2 text-sm font-bold bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                    <i className="fas fa-sync-alt mr-2"></i>
                                    Re-upload Quotation
                                </button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer bg-slate-50/50"
                                 onClick={() => setShowUploader(true)}>
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                        <i className="fas fa-file-upload text-3xl text-emerald-600"></i>
                                    </div>
                                    <h5 className="font-bold text-slate-800 mb-2">Upload Sales Architect Quotation</h5>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Drag & drop or click to upload Excel/CSV file
                                    </p>
                                    <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-4 py-2">
                                        Supports: .csv, .xlsx, .xls
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <i className="fas fa-info-circle text-blue-500"></i>
                                Expected File Format
                            </h5>
                            <div className="text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                server_name,flavor,cpu,ram,is_public,tier,os_type,storage_gb<br/>
                                web-server-1,s6.large.2,2,4,Yes,Web Tier,Linux,50<br/>
                                db-server-1,c6.2xlarge.4,8,16,No,Database,Linux,200
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Column names are fuzzy-matched. Missing flavors will be flagged as WARNING.
                            </p>
                        </div>
                    </div>

                    {/* Mandatory Artefacts */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2 border-b pb-2">
                            Mandatory Architectural Artefacts
                        </h4>
                        <label className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-blue-600"
                                checked={project.arbArtefacts?.presentStateHLD || false}
                                onChange={e => onUpdateProject(project.id, 'arbArtefacts', {
                                    ...project.arbArtefacts,
                                    presentStateHLD: e.target.checked
                                })}
                            />
                            <span className="font-bold text-sm text-slate-700">Present State HLD (As-Is)</span>
                        </label>
                        <label className="flex items-center gap-4 p-4 border-2 border-rose-200 rounded-xl cursor-pointer bg-rose-50/50 hover:bg-rose-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-rose-600"
                                checked={project.arbArtefacts?.targetArchitecture || false}
                                onChange={e => onUpdateProject(project.id, 'arbArtefacts', {
                                    ...project.arbArtefacts,
                                    targetArchitecture: e.target.checked
                                })}
                            />
                            <span className="font-bold text-sm text-rose-900">Target Architecture (To-Be)</span>
                        </label>
                        <label className="flex items-center gap-4 p-4 border-2 border-purple-200 rounded-xl cursor-pointer bg-purple-50/50 hover:bg-purple-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-purple-600"
                                checked={project.arbArtefacts?.sowSigned || false}
                                onChange={e => onUpdateProject(project.id, 'arbArtefacts', {
                                    ...project.arbArtefacts,
                                    sowSigned: e.target.checked
                                })}
                            />
                            <span className="font-bold text-sm text-purple-900">SOW (Scope of Work) Signed</span>
                        </label>
                        
                        {/* Artefacts Status */}
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                                Artefacts Status
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-sm">
                                    {artefactsComplete ? (
                                        <span className="text-emerald-700 font-bold flex items-center gap-2">
                                            <i className="fas fa-check-circle"></i>
                                            All artefacts complete
                                        </span>
                                    ) : (
                                        <span className="text-amber-700 font-bold flex items-center gap-2">
                                            <i className="fas fa-exclamation-circle"></i>
                                            {3 - (Object.values(project.arbArtefacts || {}).filter(Boolean).length)} remaining
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-500">
                                    {Object.values(project.arbArtefacts || {}).filter(Boolean).length}/3
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Project Details */}
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                Kickoff Milestone
                            </label>
                            <input 
                                type="date" 
                                value={project.kickoff} 
                                onChange={e => onUpdateProject(project.id, 'kickoff', e.target.value)}
                                className="w-full p-3 border-2 border-blue-200 rounded-xl bg-white outline-none font-bold text-blue-900 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                Go-Live Milestone
                            </label>
                            <input 
                                type="date" 
                                value={project.date} 
                                onChange={e => onUpdateProject(project.id, 'date', e.target.value)}
                                className="w-full p-3 border-2 border-emerald-200 rounded-xl bg-white outline-none font-bold text-emerald-900 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                Target MRR ($)
                            </label>
                            <input 
                                type="number" 
                                value={project.mrr} 
                                onChange={e => onUpdateProject(project.id, 'mrr', e.target.value)}
                                className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white outline-none font-bold" 
                            />
                        </div>
                    </div>

                    {/* Next Steps Card */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                        <h5 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <i className="fas fa-arrow-right text-blue-600"></i>
                            Next Steps After Upload
                        </h5>
                        <ol className="space-y-3 text-sm text-blue-800">
                            <li className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">1</span>
                                <span>System validates quotation and generates blueprint</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">2</span>
                                <span>Blueprint moves to Architecture phase for review</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">3</span>
                                <span>Topology Auto-Mapper creates visual architecture</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">4</span>
                                <span>Delivery Physics calculates resources & timeline</span>
                            </li>
                        </ol>
                    </div>

                    {/* Status */}
                    <div className="bg-slate-100 border border-slate-300 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">ARB Status</div>
                                <div className={`text-lg font-black ${hasBlueprint && artefactsComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {hasBlueprint && artefactsComplete ? 'Ready for Approval' : hasBlueprint ? 'Artefacts Pending' : 'Awaiting Quotation'}
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${hasBlueprint && artefactsComplete ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                {hasBlueprint && artefactsComplete ? 'Complete' : 'Pending'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Excel Uploader Modal */}
            {showUploader && (
                <ExcelUploader 
                    onUpdateData={(blueprintData) => {
                        handleBlueprintGenerated(blueprintData);
                        setShowUploader(false);
                    }}
                    onClose={() => setShowUploader(false)}
                />
            )}
        </div>
    );
}

function WizardStepArchitecture({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('mapper');
    const hasData = typeof project?.mapperCsv === 'string' && project.mapperCsv.trim().length > 0;

    const loadSampleEnterprise = () => { 
        const s = `Name,Type,IP_CIDR,Location,Notes\nHQ-Datacenter-VPN,VPN,10.0.0.0/16,External-Peering,IPsec\nROMA-Connect,ROMA,Global,Edge,API Integration\nHuawei-CCE-Cluster,CCE,10.0.4.0/24,Container-Subnet,Managed K8s 1.28\nWorker-Node-ECS-1,ECS,10.0.4.10,Container-Subnet,Ubuntu NodePool\nWorker-Node-ECS-2,ECS,10.0.4.11,Container-Subnet,Ubuntu NodePool\nHuawei-DMS,DMS,10.0.5.20,Data-Subnet,Kafka Message Bus\nGaussDB-Distributed,GaussDB,10.0.6.100,Data-Subnet,HTAP Database\nHuawei-OBS-Datalake,OBS,Global,Storage,100TB Data\nHuawei-SFS-Turbo,SFS,10.0.5.50,Data-Subnet,Shared NFS`; 
        onUpdateProject(project.id, 'mapperCsv', s);
    };

    const generateFromBlueprint = () => {
        if (!project?.blueprintData?.topology?.compute || project.blueprintData.topology.compute.length === 0) {
            alert('No blueprint data found. Please upload a quotation first.');
            return;
        }

        const servers = project.blueprintData.topology.compute;
        let csvLines = ['Name,Type,IP_CIDR,Location,Notes'];
        
        servers.forEach((server, index) => {
            const name = server.name || `server-${index + 1}`;
            const type = 'ECS'; // Default to ECS for compute
            const ipCidr = `10.0.${Math.floor(index/256) + 1}.${(index % 256) + 10}/24`;
            const location = server.metadata?.tier === 'Web Tier' ? 'Web-Subnet' : 
                           server.metadata?.tier === 'Application Tier' ? 'App-Subnet' :
                           server.metadata?.tier === 'Database' ? 'Data-Subnet' : 'Compute-Subnet';
            const notes = `${server.flavor || 'Unknown'} - ${server.metadata?.os_type || 'Linux'}`;
            
            csvLines.push(`${name},${type},${ipCidr},${location},${notes}`);
        });

        // Add network components
        csvLines.push('VPC-Main,VPC,10.0.0.0/16,Cloud-Network,Primary VPC');
        csvLines.push('Internet-GW,Internet,0.0.0.0/0,Edge,Internet Gateway');
        csvLines.push('NAT-Gateway,NAT,10.0.0.254/32,Edge,Outbound NAT');
        
        const csv = csvLines.join('\n');
        onUpdateProject(project.id, 'mapperCsv', csv);
        alert(`Generated topology from blueprint: ${servers.length} servers mapped`);
    };

    return (
        <div>
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={()=>setSubTab('mapper')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='mapper'?'bg-indigo-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>1. Topology Auto-Mapper</button>
                    <button onClick={()=>setSubTab('physics')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='physics'?'bg-indigo-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>2. Delivery Physics</button>
                    <button onClick={()=>setSubTab('ora')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='ora'?'bg-indigo-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>3. ORA Friction</button>
                </div>
                {isCurrent && <button onClick={onPromote} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">Complete Architecture <i className="fas fa-arrow-right ml-2"></i></button>}
            </div>
            <div className="p-8 bg-slate-100/50">
                {subTab === 'mapper' && (
                    !hasData ? (
                        <div className="h-[500px] flex flex-col items-center justify-center text-slate-500 bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner"><i className="fas fa-project-diagram text-5xl text-indigo-400"></i></div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">No Topology Data Detected</h3>
                            <p className="text-sm max-w-lg mx-auto mb-8 font-medium">This project recently passed the ARB Gate. You must map the target architecture before calculating Delivery Physics and Planning.</p>
                            <div className="flex gap-4">
                                <button onClick={loadSampleEnterprise} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest shadow-md transition-all hover:scale-105"><i className="fas fa-lightbulb mr-2"></i> Load Sample PaaS Template</button>
                                <button onClick={()=>{const d = prompt("Paste CSV data here:"); if(d) onUpdateProject(project.id, 'mapperCsv', d);}} className="px-6 py-3 bg-white border-2 border-slate-300 hover:border-indigo-400 text-slate-700 rounded-xl font-black uppercase tracking-widest shadow-sm transition-all"><i className="fas fa-paste mr-2"></i> Paste CSV Data</button>
                                {project?.blueprintData?.topology?.compute && project.blueprintData.topology.compute.length > 0 && (
                                    <button onClick={generateFromBlueprint} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest shadow-md transition-all hover:scale-105">
                                        <i className="fas fa-magic mr-2"></i> Auto-Generate from Blueprint
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <TopologyMapperView activeProject={project} onUpdateProject={onUpdateProject} />
                    )
                )}
                {subTab === 'physics' && <PhysicsEngineView activeProject={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'ora' && <AssessmentView activeProject={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    )
}

function TopologyMapperView({ activeProject, onUpdateProject }) {
    const [csvText, setCsvText] = useState(activeProject?.mapperCsv || "");
    const [nodes, setNodes] = useState([]); const [viewMode, setViewMode] = useState("all");
    const [isMaximized, setIsMaximized] = useState(false);
    
    useEffect(()=>{ setCsvText(activeProject?.mapperCsv || ""); setNodes([]); },[activeProject]);
    
    const handleSaveSnapshot = () => { 
        const desc = prompt("Enter description for this Topology Snapshot:"); 
        if(!desc) return;
        const hist = activeProject.mapperHistory || [];
        onUpdateProject(activeProject.id, 'mapperHistory', [{id: Date.now(), desc, date: new Date().toLocaleDateString(), data: csvText}, ...hist]);
        onUpdateProject(activeProject.id, 'mapperCsv', csvText); 
        alert("Topology Snapshot Saved."); 
    };

    const loadSnapshot = (histId) => {
        if(!histId) return;
        const snap = (activeProject?.mapperHistory || []).find(h => h.id.toString() === histId);
        if(snap) { setCsvText(snap.data); handleParse(snap.data); }
    };
    
    const loadScenario = (type) => {
        let s = "";
        if (type === 'aws_oms') s = `Name,Type,IP_CIDR,Location,Notes\nAWS-VPC,VPC,10.0.0.0/16,External-AWS,Source Network\nAWS-S3-Prod,S3,Global,External-AWS,50TB Images\nAWS-S3-Logs,S3,Global,External-AWS,200M Small Files\nHuawei-OBS-Prod,OBS,Global,PaaS,Target Data Lake\nHuawei-OMS-Service,OMS,Serverless,PaaS,API Migrator`;
        else if (type === 'onprem_sms_drs') s = `Name,Type,IP_CIDR,Location,Notes\nOnPrem-DC-FW,VPN,192.168.1.1,On-Premise,IPsec Tunnel\nVMware-Web-01,VM,192.168.1.10,On-Premise,Source Web\nVMware-Web-02,VM,192.168.1.11,On-Premise,Source Web\nOracle-DB-OnPrem,DB,192.168.1.50,On-Premise,Legacy DB\nHuawei-VPC-Prod,VPC,10.0.0.0/16,Cloud-Network,Target Network\nECS-Web-01,ECS,10.0.1.10,Cloud-Compute,SMS Target\nECS-Web-02,ECS,10.0.1.11,Cloud-Compute,SMS Target\nRDS-PostgreSQL,RDS,10.0.2.50,Cloud-Database,DRS Target`;
        else if (type === 'azure_cce') s = `Name,Type,IP_CIDR,Location,Notes\nAzure-VNet,VPC,172.16.0.0/16,External-Azure,Source Network\nAzure-AKS-Cluster,K8S,172.16.1.0/24,External-Azure,Source Containers\nHuawei-VPC-Prod,VPC,10.0.0.0/16,Cloud-Network,Target Network\nHuawei-CCE-Cluster,CCE,10.0.1.0/24,Cloud-Compute,Target K8s\nSWR-Registry,SWR,Global,PaaS,Container Images`;
        setCsvText(s); handleParse(s);
    };

    const handleParse = (textToParse = csvText) => {
        if (!textToParse || typeof textToParse !== 'string' || !textToParse.trim()) { setNodes([]); return; }
        try {
            const lines = textToParse.trim().split('\n'); const parsedNodes = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue; const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length >= 4) {
                    const ipCidr = String(cols[2] || "Unknown"); const location = String(cols[3] || "Unknown");
                    parsedNodes.push({ id: i, name: cols[0], type: cols[1], ip: ipCidr, location: location, notes: cols[4]||'' });
                }
            }
            setNodes(parsedNodes);
        } catch (e) {}
    };

    const handleAutoGenerateWBS = () => {
        if (nodes.length === 0) { alert("Please load or draw a topology first."); return; }
        let newTasks = [
            { id: "1", name: "Phase 1: Landing Zone & Security", prog: "0%", resp: "Partner", start: "", end: "", isParent: true },
            { id: "1.1", name: "Deploy Target VPC & Subnets", prog: "0%", resp: "Partner", start: "", end: "", isParent: false },
            { id: "1.2", name: "Configure IAM & Security Groups", prog: "0%", resp: "Partner", start: "", end: "", isParent: false }
        ];
        let phaseCount = 2;
        const types = nodes.map(n => String(n.type).toUpperCase());
        
        if (types.includes('ECS') || types.includes('VM')) {
            newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Compute Sync (SMS)`, prog: "0%", resp: "Partner", start: "", end: "", isParent: true });
            newTasks.push({ id: `${phaseCount}.1`, name: "Install SMS Agents on Source VMs", prog: "0%", resp: "Customer IT", start: "", end: "", isParent: false });
            newTasks.push({ id: `${phaseCount}.2`, name: "Execute Initial Block Sync via SMS", prog: "0%", resp: "Partner", start: "", end: "", isParent: false });
            phaseCount++;
        }
        if (types.includes('RDS') || types.includes('GAUSSDB') || types.includes('DB')) {
            newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Database Sync (DRS)`, prog: "0%", resp: "Partner", start: "", end: "", isParent: true });
            newTasks.push({ id: `${phaseCount}.1`, name: "Provision Target RDS/GaussDB Instances", prog: "0%", resp: "Partner", start: "", end: "", isParent: false });
            newTasks.push({ id: `${phaseCount}.2`, name: "Configure DRS Logical Replication Tasks", prog: "0%", resp: "Principal Arch", start: "", end: "", isParent: false });
            phaseCount++;
        }
        if (types.includes('OBS') || types.includes('S3') || types.includes('OMS')) {
            newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Object Sync (OMS)`, prog: "0%", resp: "Partner", start: "", end: "", isParent: true });
            newTasks.push({ id: `${phaseCount}.1`, name: "Create Target OBS Buckets & Policies", prog: "0%", resp: "Partner", start: "", end: "", isParent: false });
            newTasks.push({ id: `${phaseCount}.2`, name: "Execute Serverless OMS API Transfer", prog: "0%", resp: "Cloud Backend", start: "", end: "", isParent: false });
            phaseCount++;
        }
        if (types.includes('CCE') || types.includes('K8S') || types.includes('SWR')) {
            newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Container Workloads (CCE)`, prog: "0%", resp: "Partner", start: "", end: "", isParent: true });
            newTasks.push({ id: `${phaseCount}.1`, name: "Provision CCE Cluster & Node Pools", prog: "0%", resp: "Partner", start: "", end: "", isParent: false });
            newTasks.push({ id: `${phaseCount}.2`, name: "Deploy Helm Charts / Manifests to CCE", prog: "0%", resp: "DevOps", start: "", end: "", isParent: false });
            phaseCount++;
        }

        newTasks.push({ id: `${phaseCount}`, name: `Phase ${phaseCount}: Cutover & Post-Live`, prog: "0%", resp: "All", start: "", end: "", isParent: true });
        newTasks.push({ id: `${phaseCount}.1`, name: "Final Delta Sync & App Switchover", prog: "0%", resp: "Partner / Cust", start: "", end: "", isParent: false });
        newTasks.push({ id: `${phaseCount}.2`, name: "Post-Live WAR Sign-Off", prog: "0%", resp: "TAM", start: "", end: "", isParent: false });

        if(confirm("This will overwrite the current Migration Plan based on the detected topology. Proceed?")) {
            onUpdateProject(activeProject.id, 'migrationPlan', newTasks);
            alert("Migration Plan auto-generated successfully! Check the Planning tab.");
        }
    };

    const groups = useMemo(() => {
        const grps = { Edge: [], External: [], Subnets: {}, Global: [] };
        nodes.forEach(n => {
            const loc = String(n.location || "");
            if (loc === 'Edge') grps.Edge.push(n); else if (loc.includes('External') || loc.includes('On-Premise')) grps.External.push(n);
            else if (loc === 'PaaS' || loc === 'Storage' || loc === 'Management' || loc === 'Serverless') grps.Global.push(n); else { if (!grps.Subnets[loc]) grps.Subnets[loc] = []; grps.Subnets[loc].push(n); }
        });
        return grps;
    }, [nodes]);

    const getIcon = (type) => {
        const t = String(type || "").toLowerCase();
        if (t==='waf') return 'fa-shield-alt text-rose-500'; if (t==='elb' || t==='loadbalancer') return 'fa-sitemap text-blue-500'; 
        if (t==='ecs' || t==='vm') return 'fa-server text-blue-600'; if (t==='onprem' || t==='aws-ec2') return 'fa-server text-slate-500';
        if (t==='rds' || t==='gaussdb') return 'fa-database text-rose-600'; if (t==='obs' || t==='sfs') return 'fa-hdd text-emerald-600';
        if (t==='vpn' || t==='peering' || t==='directconnect') return 'fa-network-wired text-amber-600';
        if (t==='dcs') return 'fa-bolt text-red-500'; if (t==='cce' || t==='asg') return 'fa-cubes text-indigo-600';
        if (t==='s3') return 'fa-bucket text-amber-500';
        if (t==='oms' || t==='drs' || t==='sms') return 'fa-exchange-alt text-purple-500';
        if (t==='swr') return 'fa-box-open text-pink-500';
        if (t==='k8s') return 'fa-dharmachakra text-blue-500';
        if (t==='db') return 'fa-database text-slate-500';
        return 'fa-microchip text-slate-500';
    };

    return (
        <div className={isMaximized ? "fixed inset-0 z-50 bg-[#f8fafc] p-4 md:p-8 flex flex-col overflow-auto animate-fade-in" : "max-w-[1800px] mx-auto pb-6 animate-fade-in"}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[750px]">
                <div className="flex flex-wrap justify-between items-center mb-6 border-b border-slate-200 pb-4 gap-2">
                    <h3 className="font-black flex items-center gap-3 text-lg text-slate-800"><i className="fas fa-project-diagram text-indigo-500"></i> IaC Auto-Mapper</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="ml-2 flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 hidden sm:flex">
                            <select onChange={e=>{if(e.target.value) loadScenario(e.target.value); e.target.value="";}} className="bg-transparent text-xs font-bold outline-none px-2 py-1 max-w-[200px] text-blue-600 cursor-pointer">
                                <option value="">-- Load Cloud Scenario --</option>
                                <option value="onprem_sms_drs">On-Prem to ECS/RDS (SMS/DRS)</option>
                                <option value="aws_oms">AWS S3 to OBS Data Lake (OMS)</option>
                                <option value="azure_cce">Azure AKS to CCE Containers</option>
                            </select>
                        </div>
                        <button onClick={()=>setIsMaximized(!isMaximized)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black shadow-sm transition-colors"><i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} mr-2`}></i>{isMaximized ? 'Restore' : 'Full Screen'}</button>
                        <div className="ml-2 flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1">
                            <select onChange={e=>loadSnapshot(e.target.value)} className="bg-transparent text-xs font-bold outline-none px-2 py-1 max-w-[150px] text-slate-600 cursor-pointer">
                                <option value="">-- History --</option>
                                {(activeProject.mapperHistory||[]).map(h => <option key={h.id} value={h.id}>{h.desc}</option>)}
                            </select>
                            <button onClick={handleSaveSnapshot} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-xs font-black transition-colors"><i className="fas fa-camera mr-2"></i>Snap</button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    <div className="lg:w-1/4 flex flex-col bg-slate-50 rounded-2xl p-4 border border-slate-200">
                        <textarea value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full h-48 lg:h-full p-4 text-xs font-mono border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 whitespace-pre shadow-inner bg-white custom-scrollbar" placeholder="Name,Type,IP_CIDR,Location,Notes" />
                        <button onClick={()=>handleParse()} className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-md transition-colors"><i className="fas fa-paint-brush mr-2"></i>Draw Diagram</button>
                        <button onClick={handleAutoGenerateWBS} className="w-full mt-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-md transition-transform active:scale-95 border border-indigo-500">✨ Auto-Generate WBS</button>
                    </div>
                    <div className="flex-1 bg-[#f8fafc] p-6 overflow-auto border border-slate-200 rounded-2xl shadow-inner relative custom-scrollbar">
                        {nodes.length === 0 ? (<div className="h-[400px] flex flex-col items-center justify-center text-slate-400"><i className="fas fa-network-wired text-6xl mb-4 opacity-50"></i><p className="font-black text-lg">Awaiting Topology Data</p></div>) : (
                            <div className="min-w-[800px]">
                                <div className="flex gap-4 items-start mt-4">
                                    <div className="w-56 shrink-0 space-y-6">
                                        {groups.External.length > 0 && (<div className="p-4 border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-xl relative pt-6"><span className="absolute -top-3 left-3 bg-amber-100 px-3 py-1 rounded-full text-[10px] font-black text-amber-800 uppercase tracking-wider border border-amber-200">External</span><div className="space-y-3">{groups.External.map(n => (<div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm"><div className="font-bold text-xs"><i className={`fas ${getIcon(n.type)} mr-2`}></i> {n.name}</div><div className="mt-2"><span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{n.ip}</span></div></div>))}</div></div>)}
                                    </div>
                                    <div className="flex-1 border-4 border-blue-200 bg-blue-50/30 rounded-2xl p-8 relative min-h-[400px]">
                                        <span className="absolute -top-4 left-6 bg-blue-100 border border-blue-300 px-4 py-1.5 rounded-full text-sm font-black text-blue-800 uppercase tracking-widest shadow-sm"><i className="fas fa-cloud mr-2"></i> Target VPC</span>
                                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
                                            {Object.entries(groups.Subnets).map(([subName, subNodes]) => (
                                                <div key={subName} className="border-2 border-dashed border-blue-300 bg-white/80 p-5 rounded-xl relative pt-8 shadow-sm">
                                                    <span className="absolute top-2 left-3 text-[10px] font-black text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{subName}</span>
                                                    <div className="space-y-3">
                                                        {subNodes.map(n => (
                                                            <div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 transition-colors">
                                                                <div className="font-bold text-xs truncate" title={n.name}><i className={`fas ${getIcon(n.type)} mr-2 opacity-80`}></i>{n.name}</div>
                                                                <div className="text-[10px] font-mono text-slate-500 mt-1">{n.ip}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {groups.Global.length > 0 && (
                                        <div className="w-48 shrink-0 border-2 border-emerald-200 bg-emerald-50/50 rounded-xl relative pt-6 p-4">
                                            <span className="absolute -top-3 left-3 bg-emerald-100 px-3 py-1 rounded-full text-[10px] font-black text-emerald-800 uppercase tracking-wider border border-emerald-200">PaaS / Global</span>
                                            <div className="space-y-4">
                                                {groups.Global.map(n => (
                                                    <div key={n.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center hover:border-emerald-300 transition-colors">
                                                        <i className={`fas ${getIcon(n.type)} text-2xl mb-2 opacity-90`}></i>
                                                        <div className="font-bold text-xs truncate" title={n.name}>{n.name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function AssessmentView({ activeProject, onUpdateProject }) {
    const [infraControl, setInfraControl] = useState(activeProject?.ora?.infraControl || '0'); 
    const [itSkills, setItSkills] = useState(activeProject?.ora?.itSkills || '0'); 
    const [partnerCapability, setPartnerCapability] = useState(activeProject?.ora?.partnerCapability || '0'); 
    const [downtime, setDowntime] = useState(activeProject?.ora?.downtime || '0'); 
    const [appArch, setAppArch] = useState(activeProject?.ora?.appArch || '0'); 
    const [security, setSecurity] = useState(activeProject?.ora?.security || '0');

    useEffect(() => { if(activeProject?.ora) { const o = activeProject.ora; setInfraControl(o.infraControl||'0'); setItSkills(o.itSkills||'0'); setPartnerCapability(o.partnerCapability||'0'); setDowntime(o.downtime||'0'); setAppArch(o.appArch||'0'); setSecurity(o.security||'0'); } }, [activeProject]);
    
    const handleSave = () => { onUpdateProject(activeProject.id, 'ora', { infraControl, itSkills, partnerCapability, downtime, appArch, security }); alert("ORA Profile Saved."); };

    const score = Math.round((parseInt(infraControl) + parseInt(itSkills) + parseInt(partnerCapability) + parseInt(downtime) + parseInt(appArch) + parseInt(security)) / 6);
    let timeBuffer = "+80%"; let bgColor = "bg-rose-50 border-rose-300 text-rose-700";
    if (score > 40 && score <= 75) { timeBuffer = "+30%"; bgColor = "bg-amber-50 border-amber-300 text-amber-700"; } else if (score > 75) { timeBuffer = "+10%"; bgColor = "bg-emerald-50 border-emerald-300 text-emerald-700"; }

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h3 className="font-black flex items-center gap-3 text-xl text-slate-800"><i className="fas fa-clipboard-check text-purple-600"></i> Operational Readiness (ORA)</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Calculate human and architectural friction constraints.</p>
                    </div>
                    <button onClick={handleSave} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95"><i className="fas fa-save mr-2"></i>Save ORA</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
                    <div className="space-y-8">
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">1. Infra Control</label><input type="range" min="0" max="100" step="50" value={infraControl} onChange={e=>setInfraControl(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>3rd Party</span><span>Partial</span><span>Full Root</span></div></div>
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">2. IT Skills</label><input type="range" min="0" max="100" step="50" value={itSkills} onChange={e=>setItSkills(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>None</span><span>Basic</span><span>Experts</span></div></div>
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">3. Partner RACI</label><input type="range" min="0" max="100" step="50" value={partnerCapability} onChange={e=>setPartnerCapability(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Reseller</span><span>Partial</span><span>MSP</span></div></div>
                    </div>
                    <div className="space-y-8">
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">4. Downtime Tolerance</label><input type="range" min="0" max="100" step="50" value={downtime} onChange={e=>setDowntime(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Zero (HA)</span><span>Weekend</span><span>Best Effort</span></div></div>
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">5. App Architecture</label><input type="range" min="0" max="100" step="50" value={appArch} onChange={e=>setAppArch(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Legacy</span><span>Monolith</span><span>Cloud-Native</span></div></div>
                        <div><label className="font-black text-sm text-slate-800 mb-2 block">6. Security/Compliance</label><input type="range" min="0" max="100" step="50" value={security} onChange={e=>setSecurity(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /><div className="flex justify-between text-[10px] mt-2 font-bold text-slate-400 uppercase tracking-widest"><span>Gov/PCI</span><span>PII</span><span>Standard</span></div></div>
                    </div>
                </div>
                <div className={`p-8 rounded-2xl border-4 text-center shadow-inner ${bgColor}`}>
                    <div className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Global Friction Score</div>
                    <div className="text-6xl font-black">{score}/100</div>
                    <div className="text-sm font-black mt-4 tracking-widest uppercase bg-white/50 inline-block px-4 py-2 rounded-xl shadow-sm">Mandatory Timeline Buffer: {timeBuffer}</div>
                </div>
            </div>
        </div>
    )
}

function WizardStepPlanning({ project, onUpdateProject, onPromote, isCurrent, customPlaybooks, isPoC }) {
    const [subTab, setSubTab] = useState('budget');
    return (
        <div>
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={()=>setSubTab('budget')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='budget'?'bg-emerald-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-file-invoice-dollar mr-2"></i> FinOps Budget & Commercial Model</button>
                    <button onClick={()=>setSubTab('plan')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='plan'?'bg-blue-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-tasks mr-2"></i> Migration Plan Builder</button>
                </div>
                {isCurrent && <button onClick={onPromote} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">Lock Plan & Start Delivery <i className="fas fa-arrow-right ml-2"></i></button>}
            </div>
            <div className="p-8 bg-slate-100/50">
                {subTab === 'budget' && (isPoC ? <PoCFinOpsView project={project} onUpdateProject={onUpdateProject} /> : <BudgetEstimatorView activeProject={project} onUpdateProject={onUpdateProject} />)}
                {subTab === 'plan' && <DedicatedMigrationPlan project={project} onUpdateProject={onUpdateProject} customPlaybooks={customPlaybooks} />}
            </div>
        </div>
    )
}

function BudgetEstimatorView({ activeProject, onUpdateProject }) {
    const [mrr, setMrr] = useState(5000); 
    const [durationMonths, setDurationMonths] = useState(3); 
    const [infraComplexity, setInfraComplexity] = useState('Medium'); 
    const [penaltyRisk, setPenaltyRisk] = useState(0);
    const [commModel, setCommModel] = useState('Partner');
    const [partnerHours, setPartnerHours] = useState(160); const [partnerRate, setPartnerRate] = useState(75); 
    const [internalHours, setInternalHours] = useState(160); const [internalRate, setInternalRate] = useState(150);

    useEffect(() => { 
        if (activeProject?.budget) { 
            const b = activeProject.budget; 
            setMrr(b.mrr); setDurationMonths(b.durationMonths); setInfraComplexity(b.infraComplexity); setPenaltyRisk(b.penaltyRisk || 0);
            setCommModel(b.commModel || 'Partner');
            setPartnerHours(b.partnerHours || 160); setPartnerRate(b.partnerRate || 75);
            setInternalHours(b.internalHours || 160); setInternalRate(b.internalRate || 150);
        } else if (activeProject) { setMrr(activeProject.mrr || 5000); } 
    }, [activeProject]);

    const saveContext = () => { onUpdateProject(activeProject.id, 'budget', { mrr, durationMonths, infraComplexity, penaltyRisk, commModel, partnerHours, partnerRate, internalHours, internalRate }); alert("FinOps & Commercial Model Saved."); };

    const estimate = useMemo(() => { 
        let baseLabor = 0; let activeRole = ""; let activeRate = 0;
        if (commModel === 'Partner') { baseLabor = partnerHours * partnerRate; activeRole = "Partner-Led"; activeRate = partnerRate;}
        else if (commModel === 'Internal') { baseLabor = internalHours * internalRate; activeRole = "Principal Architect Rescue"; activeRate = internalRate;}

        const laborOverrun = baseLabor * 0.30; 
        const dualRun = mrr * durationMonths; 
        let tempInfra = 500; if (infraComplexity === 'Medium') tempInfra = 1500; if (infraComplexity === 'High') tempInfra = 4000; 
        return { baseLabor, laborOverrun, dualRun, tempInfra, tuningBuffer: (mrr * 12) * 0.15, totalTrueCost: baseLabor + laborOverrun + dualRun + tempInfra + ((mrr * 12) * 0.15) + Number(penaltyRisk), activeRole, activeRate }; 
    }, [mrr, durationMonths, infraComplexity, penaltyRisk, commModel, partnerHours, partnerRate, internalHours, internalRate]);

    const fm = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

    return (
        <div className="max-w-[1400px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-black text-lg tracking-wide"><i className="fas fa-handshake text-blue-400 mr-3"></i> Delivery Ownership & Commercial Model</h3>
                    <button onClick={saveContext} className="px-6 py-2.5 bg-emerald-600 hover:emerald-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">Save FinOps</button>
                </div>
                <div className="p-8 bg-slate-50 border-b border-slate-200">
                    <div className="flex gap-6">
                        <button onClick={()=>setCommModel('Partner')} className={`flex-1 p-5 rounded-2xl border-4 text-left transition-all ${commModel==='Partner' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                            <div className="font-black text-slate-800 text-lg"><i className="fas fa-users text-blue-500 mr-2"></i> Standard Partner-Led</div>
                            <div className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">Customer pays Partner directly. Principal Architect provides oversight and governance.</div>
                        </button>
                        <button onClick={()=>setCommModel('Internal')} className={`flex-1 p-5 rounded-2xl border-4 text-left transition-all ${commModel==='Internal' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                            <div className="font-black text-purple-900 text-lg"><i className="fas fa-user-astronaut text-purple-600 mr-2"></i> Principal Architect Rescue</div>
                            <div className="text-xs text-purple-800 mt-2 font-bold leading-relaxed">Partner failed validation gate. Internal Delivery assumes direct execution. Partner labor fee is reclaimed as Internal Margin.</div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    <div className="p-8 border-r border-slate-200 bg-white space-y-6">
                        <div className="flex gap-6">
                            <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Target MRR ($)</label><input type="number" value={mrr} onChange={e=>setMrr(Number(e.target.value))} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50" /></div>
                            <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Dual-Run Timeline (Months)</label><input type="number" value={durationMonths} onChange={e=>setDurationMonths(Number(e.target.value))} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50" /></div>
                        </div>
                        
                        {commModel === 'Partner' && (
                            <div className="flex gap-6 p-5 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-600">Partner Labor (Hrs)</label><input type="number" value={partnerHours} onChange={e=>setPartnerHours(Number(e.target.value))} className="w-full p-3 border-2 border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-white" /></div>
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-600">Partner Rate ($/hr)</label><input type="number" value={partnerRate} onChange={e=>setPartnerRate(Number(e.target.value))} className="w-full p-3 border-2 border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-white" /></div>
                            </div>
                        )}
                        {commModel === 'Internal' && (
                            <div className="flex gap-6 p-5 bg-purple-100 rounded-xl border border-purple-300 shadow-inner">
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-purple-800">Architect Labor (Hrs)</label><input type="number" value={internalHours} onChange={e=>setInternalHours(Number(e.target.value))} className="w-full p-3 border-2 border-purple-300 rounded-xl text-sm font-bold outline-none focus:border-purple-500 bg-white" /></div>
                                <div className="flex-1"><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-purple-800">Internal Margin Rate ($/hr)</label><input type="number" value={internalRate} onChange={e=>setInternalRate(Number(e.target.value))} className="w-full p-3 border-2 border-purple-300 rounded-xl text-sm font-bold outline-none focus:border-purple-500 bg-white" /></div>
                            </div>
                        )}

                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Temporary Transfer Infra Limit</label><select value={infraComplexity} onChange={e=>setInfraComplexity(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-slate-50"><option value="Low">Low (Internet)</option><option value="Medium">Medium (VPN)</option><option value="High">High (DirectConnect)</option></select></div>
                        <div className="border-t-2 pt-6 border-rose-200"><label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Contract Penalty SLA Risk ($)</label><input type="number" value={penaltyRisk} onChange={e=>setPenaltyRisk(Number(e.target.value))} className="w-full p-3 border-2 border-rose-300 rounded-xl bg-rose-50 text-rose-900 text-lg font-black outline-none focus:border-rose-500 shadow-inner" /></div>
                    </div>

                    <div className="p-8 bg-slate-100 flex flex-col justify-center space-y-5">
                        <div className={`flex justify-between p-5 border-2 rounded-2xl shadow-sm border-l-8 ${commModel==='Partner'?'bg-white border-slate-200 border-l-blue-500' : 'bg-purple-50 border-purple-200 border-l-purple-600'}`}>
                            <div><div className="font-black text-sm text-slate-800">Delivery Labor + 30% Buffer</div><div className="text-[10px] text-slate-600 mt-1 font-bold">Role: {estimate.activeRole} (@ ${estimate.activeRate}/hr)</div></div>
                            <div className="text-xl font-black text-slate-800">{fm(estimate.baseLabor + estimate.laborOverrun)}</div>
                        </div>
                        <div className="flex justify-between p-5 border-2 border-slate-200 rounded-2xl bg-white shadow-sm border-l-8 border-l-slate-400"><div><div className="font-black text-sm text-slate-800">Dual-Run Cloud Penalty</div><div className="text-[10px] text-slate-500 mt-1 font-medium">Cost of running Source & Target clouds during migration.</div></div><div className="text-xl font-black text-slate-700">{fm(estimate.dualRun)}</div></div>
                        <div className="flex justify-between p-5 border-2 border-slate-200 rounded-2xl bg-white shadow-sm border-l-8 border-l-amber-400"><div><div className="font-black text-sm text-slate-800">Temp Infra & Day-2 Tuning Buffer</div><div className="text-[10px] text-slate-500 mt-1 font-medium">Reserved budget for right-sizing post go-live.</div></div><div className="text-xl font-black text-amber-700">{fm(estimate.tempInfra + estimate.tuningBuffer)}</div></div>
                        <div className="mt-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white flex justify-between items-center shadow-xl border border-slate-700"><div className="text-xs font-black uppercase tracking-widest text-emerald-400">Total Journey Cost</div><div className="text-3xl font-black text-emerald-400">{fm(estimate.totalTrueCost)}</div></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// New Lightweight Component for PoC Budget Governance
function PoCFinOpsView({ project, onUpdateProject }) {
    const [cap, setCap] = useState(project.pocCap || 500);
    const [ttl, setTtl] = useState(project.pocTtl || '');
    
    return (
        <div className="max-w-[800px] mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-black text-xl text-slate-800 mb-6"><i className="fas fa-money-bill-wave text-emerald-500 mr-2"></i> PoC Budget Governance</h3>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Hard Budget Cap (USD)</label>
                    <input type="number" value={cap} onChange={e=>setCap(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl font-black text-lg bg-slate-50" />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Cloud Infrastructure TTL (Expiration Date)</label>
                    <input type="date" value={ttl} onChange={e=>setTtl(e.target.value)} className="w-full p-4 border-2 border-rose-200 rounded-xl font-black text-lg bg-rose-50 text-rose-900" />
                </div>
                <button onClick={()=>onUpdateProject(project.id, 'pocCap', cap)} className="w-full py-4 bg-slate-800 text-white font-black rounded-xl uppercase tracking-widest">Authorize PoC Spend</button>
            </div>
        </div>
    );
}

function DedicatedMigrationPlan({ project, onUpdateProject, customPlaybooks }) {
    const handlePlanUpdate = (taskId, field, value) => {
        if(!project) return;
        const newPlan = (project.migrationPlan || []).map(t => t.id === taskId ? {...t, [field]: value} : t);
        onUpdateProject(project.id, 'migrationPlan', newPlan);
    };

    const injectPlaybook = (playbookKey) => {
        if(!playbookKey || !customPlaybooks[playbookKey]) return;
        if(confirm(`This will overwrite the current Migration Plan with '${customPlaybooks[playbookKey].name}'. Are you sure?`)) {
            onUpdateProject(project.id, 'migrationPlan', JSON.parse(JSON.stringify(customPlaybooks[playbookKey].tasks)));
        }
    };

    return (
        <div className="max-w-[1800px] mx-auto pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-black text-lg tracking-wide"><i className="fas fa-tasks text-blue-400 mr-2"></i> Migration Execution Plan</h3>
                        {project.apiConfig?.automationEnabled && <div className="text-[10px] font-bold text-emerald-400 mt-1 uppercase tracking-widest"><i className="fas fa-robot mr-1"></i> Live API Reconciliation Active</div>}
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="flex items-center bg-slate-800 rounded-lg p-1.5 border border-slate-600">
                            <select onChange={e=>{injectPlaybook(e.target.value); e.target.value="";}} className="bg-transparent text-xs font-bold text-blue-300 outline-none px-2 cursor-pointer w-64 truncate">
                                <option value="">-- Load Enterprise Playbook --</option>
                                {Object.entries(customPlaybooks || {}).map(([key, pb]) => <option key={key} value={key}>{pb.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex-1 bg-slate-50">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left min-w-[1200px]">
                            <thead className="bg-slate-200 text-[10px] uppercase text-slate-600 border-b-2 border-slate-300 tracking-wider">
                                <tr>
                                    <th className="p-4 w-16 text-center font-black">WBS ID</th>
                                    <th className="p-4 font-black">Task Name</th>
                                    <th className="p-4 w-32 font-black">Progress</th>
                                    <th className="p-4 w-64 font-black">RACI Responsible</th>
                                    <th className="p-4 w-40 font-black">Start Date</th>
                                    <th className="p-4 w-40 font-black">End Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs bg-white">
                                {(project.migrationPlan || []).map(task => (
                                    <tr key={task.id} className={`${task.isParent ? 'bg-slate-100 font-black border-t-2 border-slate-300' : 'hover:bg-blue-50/50 transition-colors'}`}>
                                        <td className="p-3 text-center font-mono text-slate-500 font-bold">{task.id}</td>
                                        <td className={`p-3 ${task.isParent ? 'text-slate-900 text-sm' : 'pl-10 text-slate-700 font-bold'}`}><EditableCell value={task.name} onSave={v=>handlePlanUpdate(task.id, 'name', v)} /></td>
                                        <td className="p-3">
                                            {!task.isParent && (
                                                <div className={`px-3 py-1.5 rounded-lg border-2 inline-flex items-center w-full max-w-[80px] shadow-sm ${task.prog==='100%'?'bg-emerald-50 border-emerald-200 text-emerald-800 font-black':task.prog==='0%'?'bg-white border-slate-200 text-slate-500':'bg-blue-50 border-blue-200 text-blue-800 font-black'}`}>
                                                    <EditableCell value={task.prog} onSave={v=>handlePlanUpdate(task.id, 'prog', v)} className="w-full text-center" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-slate-700 font-bold"><EditableCell value={task.resp} onSave={v=>handlePlanUpdate(task.id, 'resp', v)} /></td>
                                        <td className="p-3 font-mono font-bold text-slate-600"><EditableCell type="date" value={task.start} onSave={v=>handlePlanUpdate(task.id, 'start', v)} /></td>
                                        <td className="p-3 font-mono font-bold text-slate-600"><EditableCell type="date" value={task.end} onSave={v=>handlePlanUpdate(task.id, 'end', v)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-6 text-center border-t border-slate-200 bg-white">
                        <button className="px-6 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-colors w-full max-w-md mx-auto" onClick={()=>alert("Mock: Add Row")}><i className="fas fa-plus mr-2"></i> Append Manual Task</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function WizardStepExecution({ project, onUpdateProject, onPromote, isCurrent }) {
    const [subTab, setSubTab] = useState('hub');
    return (
        <div>
            <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex gap-2">
                    <button onClick={()=>setSubTab('hub')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='hub'?'bg-emerald-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-stream mr-2"></i> Progress Tracking</button>
                    <button onClick={()=>setSubTab('tam')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${subTab==='tam'?'bg-emerald-600 text-white':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}><i className="fas fa-headset mr-2"></i> TAM & Service Hub</button>
                </div>
                {isCurrent && <button onClick={onPromote} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-md transition-transform active:scale-95">Go-Live Complete <i className="fas fa-arrow-right ml-2"></i></button>}
            </div>
            <div className="p-8 bg-slate-100/50">
                {subTab === 'hub' && <ExecutionHubView project={project} onUpdateProject={onUpdateProject} />}
                {subTab === 'tam' && <TAMHubView project={project} onUpdateProject={onUpdateProject} />}
            </div>
        </div>
    )
}

function TAMHubView({ project, onUpdateProject }) {
    const safeTamData = project.tamData || { supportPlan: "Enterprise", welinkGroup: "", tickets: [], workshops: [{id: 1, name: "Cloud Console 101", done: false}, {id: 2, name: "IAM & Security Best Practices", done: false}] };
    const [tamData, setTamData] = useState(safeTamData);
    
    useEffect(() => { setTamData(project.tamData || safeTamData); }, [project]);
    
    const handleSave = () => { onUpdateProject(project.id, 'tamData', tamData); alert("TAM Operations Data Saved."); };
    const toggleWorkshop = (id) => { const w = (tamData.workshops||[]).map(x => x.id === id ? {...x, done: !x.done} : x); setTamData({...tamData, workshops: w}); };
    const addTicket = () => { const id = prompt("Ticket ID (e.g., SR-123):"); if(!id) return; const title = prompt("Issue Title:"); setTamData({...tamData, tickets: [...(tamData.tickets||[]), {id, title, sev: 'Medium', status: 'Open'}]}); };

    return (
        <div className="max-w-[1800px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                    <div><h3 className="font-black text-lg tracking-wide"><i className="fas fa-headset text-blue-400 mr-2"></i> TAM Service Governance</h3><p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Customer Enablement & Escalation Routing</p></div>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-transform active:scale-95">Save Operations Data</button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    <div className="p-8 bg-slate-50 space-y-6">
                        <div><h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2"><i className="fas fa-sitemap text-slate-400 mr-2"></i> Escalation Pathways</h4></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Contracted Support Plan</label><select value={tamData.supportPlan} onChange={e=>setTamData({...tamData, supportPlan: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-white"><option>Developer</option><option>Business</option><option>Enterprise</option><option>Premier</option></select></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Internal WeLink Group (NOC/Escalations)</label><div className="flex gap-2"><input type="text" value={tamData.welinkGroup} onChange={e=>setTamData({...tamData, welinkGroup: e.target.value})} className="flex-1 p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white" placeholder="welink://group/12345" /><a href={tamData.welinkGroup} target="_blank" className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center transition-colors"><i className="fas fa-external-link-alt"></i></a></div></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">External Customer Comms</label><input type="text" value={project.comms?.chat || ''} disabled className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-500 bg-slate-100 cursor-not-allowed" placeholder="No link provided" /></div>
                    </div>

                    <div className="p-8 bg-white space-y-6">
                        <div><h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2"><i className="fas fa-graduation-cap text-blue-500 mr-2"></i> Cloud Enablement Tracker</h4><p className="text-[10px] text-slate-500 leading-relaxed mb-4">Tracking hands-on workshops prevents post-live churn and documents TAM educational effort.</p></div>
                        <div className="space-y-3">
                            {(tamData.workshops||[]).map(w => (
                                <label key={w.id} className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${w.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                    <input type="checkbox" checked={w.done} onChange={()=>toggleWorkshop(w.id)} className="w-5 h-5 accent-emerald-500" />
                                    <span className={`font-bold text-sm ${w.done ? 'text-emerald-800 line-through opacity-75' : 'text-slate-700'}`}>{w.name}</span>
                                </label>
                            ))}
                            <button className="w-full p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-600 text-xs" onClick={()=>alert("Mock: Add Custom Workshop")}><i className="fas fa-plus mr-1"></i> Add Workshop</button>
                        </div>
                    </div>

                    <div className="p-8 bg-white flex flex-col h-full min-h-[400px]">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-2 mb-4 shrink-0">
                            <h4 className="font-black text-sm text-slate-800"><i className="fas fa-ticket-alt text-rose-500 mr-2"></i> Migration Support Tickets</h4>
                            <button onClick={addTicket} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"><i className="fas fa-plus"></i> Log Ticket</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                            {(!tamData.tickets || tamData.tickets.length === 0) ? <div className="p-6 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-xs">No active escalations.</div> : 
                                tamData.tickets.map((t,i) => (
                                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors">
                                        <div className="flex justify-between items-start mb-2"><div className="font-mono text-[10px] text-slate-500 font-bold">{t.id}</div><div className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">{t.status}</div></div>
                                        <div className="font-bold text-xs text-slate-800">{t.title}</div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ExecutionHubView({ project, onUpdateProject }) {
    const [comms, setComms] = useState(project.comms || { bridge: "", chat: "", notes: "" });
    const [apiState, setApiState] = useState({ loading: false, logs: null, error: false });
    const [deploymentHistory, setDeploymentHistory] = useState([]);
    
    useEffect(() => { setComms(project.comms || { bridge: "", chat: "", notes: "" }); }, [project]);
    
    useEffect(() => {
        fetch('/api/logs').then(res => res.json()).then(data => setDeploymentHistory(data.deployments || [])).catch(err => console.error("Failed to load logs", err));
    }, []);

    const handleSaveComms = () => { onUpdateProject(project.id, 'comms', comms); alert("Comms Hub Updated"); };

    const triggerAPI = async (endpoint, actionName) => {
        if(!confirm(`WARNING: You are about to execute a LIVE ${actionName} in Huawei Cloud. Proceed?`)) return;
        setApiState({ loading: true, logs: `Initiating ${actionName}...\nExecuting shell script on backend...`, error: false });
        
        try {
            const res = await fetch(endpoint, { method: 'POST' });
            const data = await res.json();
            let finalLog = data.output || data.error || "Execution Finished.";
            setApiState({ loading: false, logs: finalLog, error: !data.success });

            if(endpoint === '/api/deploy' || endpoint === '/api/cleanup') {
                fetch('/api/logs').then(r=>r.json()).then(d=>setDeploymentHistory(d.deployments || []));
            }
        } catch(e) {
            setApiState({ loading: false, logs: `API Connection Failed: ${e.message}`, error: true });
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200">
                    <h3 className="font-black text-sm tracking-wide text-slate-800 mb-4"><i className="fas fa-server text-blue-500 mr-2"></i> Infrastructure Execution</h3>
                    <p className="text-xs text-slate-500 mb-6">Fire Huawei Cloud pipelines directly from the ERP.</p>
                    
                    <div className="space-y-3">
                        <button onClick={() => triggerAPI('/api/audit', 'Pre-Flight Audit')} disabled={apiState.loading} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-md uppercase tracking-widest disabled:opacity-50 transition-colors"><i className="fas fa-shield-alt mr-2"></i> 1. Run Environment Audit</button>
                        <button onClick={() => triggerAPI('/api/deploy', 'Deployment')} disabled={apiState.loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md uppercase tracking-widest disabled:opacity-50 transition-colors"><i className="fas fa-rocket mr-2"></i> 2. Deploy Infrastructure</button>
                        <button onClick={() => triggerAPI('/api/cleanup', 'Teardown/Cleanup')} disabled={apiState.loading} className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-black shadow-sm uppercase tracking-widest disabled:opacity-50 transition-colors"><i className="fas fa-fire mr-2"></i> 3. Destroy / Cleanup Logs</button>
                    </div>
                </div>
                <div className={`p-6 md:w-1/2 bg-slate-900 font-mono text-[10px] overflow-y-auto max-h-[300px] custom-scrollbar whitespace-pre-wrap ${apiState.error ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {apiState.loading && <i className="fas fa-spinner fa-spin mr-2 mb-2 block text-white text-base"></i>}
                    {apiState.logs || "// Terminal Output\n// Awaiting Execution Commands...\n// Backend API Ready."}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center"><h3 className="font-black text-sm tracking-wide text-slate-800"><i className="fas fa-history text-slate-500 mr-2"></i> Active Deployments & Logs</h3></div>
                <div className="p-0 overflow-x-auto">
                    {deploymentHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold">No deployment logs found.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 text-[10px] uppercase text-slate-600 border-b border-slate-200">
                                <tr><th className="p-4">Date/Time</th><th className="p-4">Tag</th><th className="p-4">Region</th><th className="p-4">VPC</th><th className="p-4">ECS Count</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {deploymentHistory.map((dep, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono">{dep.metadata?.time}</td><td className="p-4 font-bold">{dep.metadata?.tag || "Unknown"}</td>
                                        <td className="p-4">{dep.metadata?.region || "N/A"}</td><td className="p-4">{dep.vpc?.id ? "✅ Yes" : "❌ No"}</td>
                                        <td className="p-4"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-black">{dep.ecs?.length || 0}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50 flex justify-between items-center">
                    <h3 className="font-black text-sm tracking-wide text-indigo-900"><i className="fas fa-headset text-indigo-600 mr-2"></i> Live Communications</h3>
                    <button onClick={handleSaveComms} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">Save Links</button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
                    <div className="col-span-2 space-y-4">
                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Persistent Bridge Link</label><input type="text" value={comms.bridge} onChange={e=>setComms({...comms, bridge: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-slate-50" /></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Group Chat Link</label><input type="text" value={comms.chat} onChange={e=>setComms({...comms, chat: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-slate-50" /></div>
                    </div>
                    <div><label className="block text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">Execution Notes</label><textarea value={comms.notes} onChange={e=>setComms({...comms, notes: e.target.value})} className="w-full h-32 p-3 border-2 border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-amber-50/50"></textarea></div>
                </div>
            </div>
        </div>
    )
}

function SingleProjectGantt({ project }) {
    const timelineData = useMemo(() => {
        if(!project.kickoff || !project.date || project.kickoff==='Pending' || project.date==='TBD') return null;
        const start = new Date(project.kickoff); const end = new Date(project.date);
        if(isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
        const pad = 10 * 24 * 60 * 60 * 1000;
        const min = start.getTime() - pad; const max = end.getTime() + pad; const total = max - min;
        const pStart = ((start.getTime() - min) / total) * 100; const pWidth = ((end.getTime() - start.getTime()) / total) * 100;
        return { pStart, pWidth, startStr: formatShortDate(project.kickoff), endStr: formatShortDate(project.date) };
    }, [project]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in">
            <h3 className="font-black text-sm text-slate-800 mb-6 flex items-center"><i className="fas fa-stream text-emerald-500 mr-3"></i> Project Timeline Baseline</h3>
            {!timelineData ? <div className="p-12 text-center text-slate-400 font-bold border-2 border-dashed rounded-xl bg-slate-50 text-xs">Valid Kickoff and Go-Live dates required to render timeline.</div> : (
                <div className="overflow-x-auto w-full">
                    <div className="min-w-[600px] relative h-[120px]">
                        <div className="absolute inset-0 flex justify-between opacity-20 pointer-events-none">{[...Array(6)].map((_, i) => <div key={i} className="h-full border-l-2 border-dashed border-slate-400"></div>)}</div>
                        <div className="relative z-10 pt-8">
                            <div className="h-12 relative bg-slate-50 border-y border-transparent transition-colors rounded-xl">
                                <div className="absolute text-xs font-black text-slate-500 top-1/2 -translate-y-1/2 -translate-x-full pr-3" style={{ left: `${timelineData.pStart}%` }}>{timelineData.startStr}</div>
                                <div className={`absolute top-1 bottom-1 rounded-lg shadow-md border-2 flex flex-col justify-center px-4 overflow-hidden ${project.health === 'Green' ? 'bg-emerald-500 border-emerald-600 text-white' : project.health === 'Red' ? 'bg-rose-500 border-rose-600 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`} style={{ left: `${timelineData.pStart}%`, width: `${timelineData.pWidth}%`, minWidth:'60px'}}><span className="text-xs font-black truncate">{project.progress} Complete</span></div>
                                <div className="absolute text-xs font-black text-slate-800 top-1/2 -translate-y-1/2 pl-3" style={{ left: `${timelineData.pStart + timelineData.pWidth}%` }}>{timelineData.endStr}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function WizardStepPostLive({ project, onUpdateProject, onPromote, isCurrent }) {
    return (
        <div className="p-8">
            <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
                <div><h3 className="font-black text-2xl text-slate-800"><i className="fas fa-award text-amber-500 mr-3"></i> Step 5: Post-Live WAR Sign-Off</h3><p className="text-sm text-slate-500 mt-2">Evaluate the delivered architecture against the 5 Cloud Pillars for final handover.</p></div>
                {isCurrent && <button onClick={()=>{onUpdateProject(project.id, 'lifecycleState', '6_completed'); alert("Project Closed Successfully!");}} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-transform active:scale-95">Archive Project <i className="fas fa-check-double ml-2"></i></button>}
            </div>
            <PhasePostLive activeProject={project} onUpdateProject={onUpdateProject} />
        </div>
    )
}

function PhasePostLive({ activeProject, onUpdateProject }) {
    const [r, setR] = useState(activeProject?.war?.r || 50); const [s, setS] = useState(activeProject?.war?.s || 50); const [p, setP] = useState(activeProject?.war?.p || 50); const [c, setC] = useState(activeProject?.war?.c || 50); const [o, setO] = useState(activeProject?.war?.o || 50);
    useEffect(()=>{ if(activeProject?.war) { setR(activeProject.war.r); setS(activeProject.war.s); setP(activeProject.war.p); setC(activeProject.war.c); setO(activeProject.war.o); } }, [activeProject]);
    const score = Math.round((parseInt(r) + parseInt(s) + parseInt(p) + parseInt(c) + parseInt(o)) / 5); const isCertified = score >= 80;
    const saveContext = () => { onUpdateProject(activeProject.id, 'war', { r, s, p, c, o }); alert("Sign-Off Saved"); };

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
                <h3 className="font-black flex items-center gap-3 text-lg"><i className="fas fa-award text-amber-500"></i> Well-Architected Framework</h3>
                <button onClick={saveContext} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-xs shadow-md hover:bg-amber-600 transition-colors uppercase tracking-widest">Sign & Save</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Resilience (HA/DR)</label><span className="text-blue-600 font-black text-sm">{r}%</span></div><input type="range" min="0" max="100" value={r} onChange={e=>setR(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Security & Compliance</label><span className="text-rose-600 font-black text-sm">{s}%</span></div><input type="range" min="0" max="100" value={s} onChange={e=>setS(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-rose-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Performance Efficiency</label><span className="text-purple-600 font-black text-sm">{p}%</span></div><input type="range" min="0" max="100" value={p} onChange={e=>setP(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-purple-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Cost Optimization</label><span className="text-emerald-600 font-black text-sm">{c}%</span></div><input type="range" min="0" max="100" value={c} onChange={e=>setC(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer" /></div>
                    <div><div className="flex justify-between mb-2"><label className="font-black text-sm">Operational Excellence</label><span className="text-slate-600 font-black text-sm">{o}%</span></div><input type="range" min="0" max="100" value={o} onChange={e=>setO(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg accent-slate-600 cursor-pointer" /></div>
                </div>
                <div className={`p-10 rounded-3xl border-4 flex flex-col items-center justify-center text-center ${isCertified ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-slate-50 border-slate-300'}`}>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Architecture Final Score</h4>
                    <div className={`text-8xl font-black tracking-tighter ${isCertified ? 'text-amber-500' : 'text-slate-700'}`}>{score}</div>
                    <div className={`mt-8 px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs border-2 ${isCertified ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>{isCertified ? 'Certified & Approved' : 'Remediation Required'}</div>
                </div>
            </div>
        </div>
    )
}

// Global window binding for Babel Standalone scoping
window.ProjectCommandCenter = ProjectCommandCenter;
window.PhysicsEngineView = PhysicsEngineView;
window.calculatePhysics = calculatePhysics;
window.ComputeNode = ComputeNode;
window.PayloadInputs = PayloadInputs;
window.DatabaseRouting = DatabaseRouting;
window.NetworkRouting = NetworkRouting;
window.SLASection = SLASection;
window.PhysicsResults = PhysicsResults;
window.FAQSection = FAQSection;