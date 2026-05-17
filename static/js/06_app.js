function App() {
  const [activePhase, setActivePhase] = useState('home'); 
  const [projects, setProjects] = useState([]);
  const [customPlaybooks, setCustomPlaybooks] = useState(defaultPlaybooks);
  const [activeProjectId, setActiveProjectId] = useState("none");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [showConfig, setShowConfig] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const ERP_DATA_KEY = 'cac_erp_data_v46';
  const ERP_PLAYBOOK_KEY = 'cac_erp_playbooks_v46';

  useEffect(() => {
    try { 
        const saved = localStorage.getItem(ERP_DATA_KEY); 
        if (saved) { 
            const parsed = JSON.parse(saved); 
            if (Array.isArray(parsed)) setProjects(parsed); 
            else setProjects(defaultProjects); 
        } else setProjects(defaultProjects); 

        const savedPlaybooks = localStorage.getItem(ERP_PLAYBOOK_KEY);
        if (savedPlaybooks) { 
            const parsed = JSON.parse(savedPlaybooks);
            setCustomPlaybooks(parsed || defaultPlaybooks); 
        }
    } catch(e) { setProjects(defaultProjects); setCustomPlaybooks(defaultPlaybooks); }
    
    const handleResize = () => { if(window.innerWidth > 1024) setSidebarOpen(true); else setSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleUpdateProject = (id, field, value) => { const updated = projects.map(p => p.id === id ? { ...p, [field]: value } : p); setProjects(updated); localStorage.setItem(ERP_DATA_KEY, JSON.stringify(updated)); };
  const handleAddProject = (p) => { const updated = [p, ...projects]; setProjects(updated); localStorage.setItem(ERP_DATA_KEY, JSON.stringify(updated)); };
  const handleSavePlaybooks = (newPlaybooks) => { setCustomPlaybooks(newPlaybooks); localStorage.setItem(ERP_PLAYBOOK_KEY, JSON.stringify(newPlaybooks)); };
  
  const handleHardReset = () => { if(confirm("Are you sure you want to permanently delete all data and restore defaults?")) { localStorage.removeItem(ERP_DATA_KEY); localStorage.removeItem(ERP_PLAYBOOK_KEY); setProjects(defaultProjects); setCustomPlaybooks(defaultPlaybooks); setActiveProjectId("none"); setActivePhase('home'); } };

  const handleExportCSV = () => {
      const headers = ["Customer", "Country", "Health", "Progress", "MRR", "Kickoff", "Go-Live", "Phase", "SA", "Partner", "Type", "Location", "Blocker", "Complexity", "Scope"];
      const csvContent = [headers.join(","), ...(projects||[]).filter(p=> p && !p.isWaiting).map(p => { return [`"${(p.name || '').replace(/"/g, '""')}"`, `"${(p.country || '').replace(/"/g, '""')}"`, `"${p.health || ''}"`, `"${p.progress || ''}"`, `"${p.mrr || ''}"`, `"${p.kickoff || ''}"`, `"${p.date || ''}"`, `"${p.phase || ''}"`, `"${p.sa || ''}"`, `"${p.partner || ''}"`, `"${p.partnerType || ''}"`, `"${p.partnerLocation || ''}"`, `"${(p.blocker||'').replace(/"/g, '""')}"`, `"${p.complexity || ''}"`, `"${p.scope || ''}"`].join(","); })].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", "pipeline_technical_export.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const activeProjectObj = (projects || []).find(p => p && String(p.id) === String(activeProjectId));
  const navToPhase = (phase) => { setActivePhase(phase); setActiveProjectId("none"); if(window.innerWidth < 1024) setSidebarOpen(false); };
  const navToProject = (id) => { setActiveProjectId(String(id)); if(window.innerWidth < 1024) setSidebarOpen(false); };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans text-slate-800 selection:bg-blue-200">
      
      {showConfig && activeProjectObj && <ConfigModal project={activeProjectObj} onClose={()=>setShowConfig(false)} onSave={(cfg)=>handleUpdateProject(activeProjectObj.id, 'apiConfig', cfg)} />}
      {showUploader && <ExcelUploader onUpdateData={(newProjs) => { setProjects([...newProjs, ...projects]); localStorage.setItem(ERP_DATA_KEY, JSON.stringify([...newProjs, ...projects])); setShowUploader(false);}} onClose={() => setShowUploader(false)} />}

      {/* SIDEBAR */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-50 bg-slate-900 text-white shadow-2xl flex flex-col sidebar-transition ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'}`}>
         <div className="p-5 flex justify-between items-center border-b border-slate-800 w-64 shrink-0">
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => navToPhase('home')}>
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center border border-blue-400 shadow-lg shadow-blue-500/20"><i className="fas fa-cloud text-white text-lg"></i></div>
                 <div><h1 className="text-base font-black text-white leading-tight">LATAM Cloud</h1><h2 className="text-[9px] text-blue-300 uppercase tracking-widest font-bold">Delivery ERP</h2></div>
             </div>
             <button onClick={()=>setSidebarOpen(false)} className="lg:hidden text-slate-400 p-2"><i className="fas fa-times text-lg"></i></button>
         </div>
         
         <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 w-64 custom-scrollbar">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 mb-3">Global Overviews</p>
            <button onClick={()=>navToPhase('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase==='home' && activeProjectId==='none' ?'bg-blue-600 text-white shadow-md':'text-slate-300 hover:bg-slate-800'}`}><i className="fas fa-chart-pie w-5 text-center"></i> Executive Dash</button>
            <button onClick={()=>navToPhase('map')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase==='map' && activeProjectId==='none' ?'bg-blue-500 text-white shadow-md':'text-slate-300 hover:bg-slate-800'}`}><i className="fas fa-globe-americas w-5 text-center"></i> Regional Map</button>
            <button onClick={()=>navToPhase('pipeline')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase==='pipeline' && activeProjectId==='none' ?'bg-emerald-600 text-white shadow-md':'text-slate-300 hover:bg-slate-800'}`}><i className="fas fa-list-alt w-5 text-center"></i> Master Pipeline</button>
            <button onClick={()=>navToPhase('schedule')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase==='schedule' && activeProjectId==='none' ?'bg-amber-500 text-white shadow-md':'text-slate-300 hover:bg-slate-800'}`}><i className="fas fa-calendar-alt w-5 text-center"></i> Regional Schedule</button>
            <button onClick={()=>navToPhase('radar')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase==='radar' && activeProjectId==='none' ?'bg-purple-600 text-white shadow-md':'text-slate-300 hover:bg-slate-800'}`}><i className="fas fa-satellite-dish w-5 text-center"></i> Pre-Sales Radar</button>
            
            <div className="pt-4 mt-4 border-t border-slate-800">
                <button onClick={()=>navToPhase('process')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activePhase==='process' && activeProjectId==='none' ?'bg-blue-500 text-white shadow-md':'text-slate-300 hover:bg-slate-800'}`}><i className="fas fa-route w-5 text-center"></i> Standard Process</button>
                <button onClick={()=>navToPhase('playbooks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all mt-2 ${activePhase==='playbooks' && activeProjectId==='none' ?'bg-indigo-600 text-white shadow-md':'text-slate-300 hover:bg-slate-800'}`}><i className="fas fa-book-open w-5 text-center"></i> Playbook Studio</button>
            </div>
         </div>

         <div className="p-5 border-t border-slate-800 bg-slate-950 w-64 shrink-0">
             <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-inner">
                 <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600"><i className="fas fa-user-astronaut text-sm text-slate-300"></i></div>
                 <div className="flex-1 min-w-0">
                     <div className="text-sm font-black text-white truncate">Hilaick Y.</div>
                     <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider truncate">Principal Architect & TAM</div>
                 </div>
             </div>
         </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
         
         {/* TOP HEADER */}
         <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm shrink-0 z-20 relative">
             <div className="flex items-center gap-4">
                 <button onClick={()=>setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-800 p-2 transition-colors rounded-lg hover:bg-slate-100"><i className="fas fa-bars text-xl"></i></button>
                 <h2 className="font-black text-sm text-slate-800 uppercase tracking-widest hidden sm:block">
                     {activeProjectId === 'none' || !activeProjectObj ? 'Regional Management' : 'Project Workspace'}
                 </h2>
             </div>
             
             <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                 <div className="flex items-center gap-2">
                     {activeProjectObj && <button onClick={()=>setShowConfig(true)} title="Project Configuration" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 border border-slate-300 transition-colors shadow-sm"><i className="fas fa-cog text-base"></i></button>}
                     <div className="flex items-center bg-slate-100 rounded-xl px-4 py-2 border border-slate-300 w-full sm:w-72 shadow-inner">
                         <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mr-2 hidden sm:block"><i className="fas fa-crosshairs mr-1"></i> Context:</span>
                         <select value={activeProjectId} onChange={e=>setActiveProjectId(e.target.value)} className="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer w-full truncate">
                             <option value="none">-- Global View (No Context) --</option>
                             <optgroup label="Active Pipeline">{(projects||[]).filter(p=> p && !p.isWaiting).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                             <optgroup label="Radar (Waiting)">{(projects||[]).filter(p=> p && p.isWaiting).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                         </select>
                     </div>
                 </div>
                 <button onClick={handleHardReset} title="Factory Reset" className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-200 shrink-0 transition-colors ml-2 shadow-sm"><i className="fas fa-power-off text-sm"></i></button>
             </div>
         </header>

         <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc] relative custom-scrollbar">
               {activeProjectId === 'none' || !activeProjectObj ? (
                   <>
                       {activePhase === 'home' && <GlobalDashboard projects={projects} onNavigateToProject={navToProject} />}
                       {activePhase === 'map' && <GeospatialMap projects={projects} />}
                       {activePhase === 'radar' && <GlobalRadar projects={projects} onUpdateProject={handleUpdateProject} onAddProject={handleAddProject} />}
                       {activePhase === 'pipeline' && <GlobalPipeline projects={projects} onUpdateProject={handleUpdateProject} onExport={handleExportCSV} onImport={()=>setShowUploader(true)} />}
                       {activePhase === 'schedule' && <GlobalSchedule projects={projects} />}
                       {activePhase === 'process' && <GlobalProcessView />}
                       {activePhase === 'playbooks' && <PlaybookStudio customPlaybooks={customPlaybooks} setCustomPlaybooks={handleSavePlaybooks} />}
                   </>
               ) : (
                   <ProjectCommandCenter project={activeProjectObj} onUpdateProject={handleUpdateProject} customPlaybooks={customPlaybooks} />
               )}
         </main>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')); root.render(<App />);