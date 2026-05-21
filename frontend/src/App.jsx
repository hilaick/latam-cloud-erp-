import React, { useContext, useState, useEffect } from 'react';
import { ERPContext } from './context/ERPContext';
import Sidebar from './components/layout/Sidebar';
import CustomerDirectory from './components/views/CustomerDirectory';
import MasterExecutionHub from './components/views/MasterExecutionHub';
import LiveCloudNOC from './components/views/LiveCloudNOC';
import RegionalMap from './components/views/RegionalMap';
import MasterPipeline from './components/views/MasterPipeline';
import FinOpsDashboard from './components/views/FinOpsDashboard';
import PreSalesRadar from './components/views/PreSalesRadar';
import ProjectWizard from './components/wizard/ProjectWizard';

export default function App() {
    const { 
        projects, customers, activePhase, setActivePhase, 
        activeProjectId, setActiveProjectId, fetchState 
    } = useContext(ERPContext);
    
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
    const [showConfig, setShowConfig] = useState(false);
    const [showUploader, setShowUploader] = useState(false);

    const activeProjectObj = projects.find(p => String(p.id) === String(activeProjectId));

    const navToPhase = (phase) => {
        setActivePhase(phase);
        setActiveProjectId('none');
    };

    const navToProject = (projectId) => {
        setActiveProjectId(projectId);
        setActivePhase('project_detail');
    };

    const handleUpdateCustomer = (updatedCustomer) => {
        // TODO: Implement customer update logic
        console.log('Update customer:', updatedCustomer);
        fetch('/api/erp/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedCustomer)
        }).then(() => fetchState());
    };

    const handleDeleteCustomer = (customerId) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            fetch(`/api/erp/customers/${customerId}`, {
                method: 'DELETE'
            }).then(() => fetchState());
        }
    };

    const handleHardReset = () => {
        if (window.confirm('⚠️ WARNING: This will reset ALL data (projects, customers, tasks). Continue?')) {
            fetch('/api/erp/reset', { method: 'POST' })
                .then(() => {
                    alert('System reset complete. Refreshing...');
                    window.location.reload();
                });
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800 selection:bg-blue-200">
            <Sidebar 
                activePhase={activePhase}
                activeProjectId={activeProjectId}
                setActivePhase={setActivePhase}
                setActiveProjectId={setActiveProjectId}
                projects={projects}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
            
            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
                {/* TOP HEADER */}
                <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm shrink-0 z-20 relative">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)} 
                            className="text-slate-500 hover:text-slate-800 p-2 transition-colors rounded-lg hover:bg-slate-100"
                        >
                            <i className="fas fa-bars text-xl"></i>
                        </button>
                        <h2 className="font-black text-sm text-slate-800 uppercase tracking-widest hidden sm:block">
                            {activeProjectId === 'none' || !activeProjectObj ? 'Regional Management' : 'Project Workspace'}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-2">
                            {activeProjectObj && (
                                <button 
                                    onClick={() => setShowConfig(true)} 
                                    title="Project Configuration" 
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 border border-slate-300 transition-colors shadow-sm"
                                >
                                    <i className="fas fa-cog text-base"></i>
                                </button>
                            )}
                            <div className="flex items-center bg-slate-100 rounded-xl px-4 py-2 border border-slate-300 w-full sm:w-72 shadow-inner">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mr-2 hidden sm:block">
                                    <i className="fas fa-crosshairs mr-1"></i> Context:
                                </span>
                                <select 
                                    value={activeProjectId} 
                                    onChange={e => setActiveProjectId(e.target.value)} 
                                    className="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer w-full truncate"
                                >
                                    <option value="none">-- Global View (No Context) --</option>
                                    <optgroup label="Active Pipeline">
                                        {(projects || []).filter(p => p && !p.isWaiting).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Radar (Waiting)">
                                        {(projects || []).filter(p => p && p.isWaiting).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                        <button 
                            onClick={handleHardReset} 
                            title="Factory Reset" 
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-200 shrink-0 transition-colors ml-2 shadow-sm"
                        >
                            <i className="fas fa-power-off text-sm"></i>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc] relative custom-scrollbar">
                    {activeProjectId === 'none' || !activeProjectObj ? (
                        <>
                            {/* Global Views */}
                            {activePhase === 'home' && <RegionalMap />}
                            {activePhase === 'map' && <RegionalMap />}
                            {activePhase === 'crm' && (
                                <CustomerDirectory 
                                    customers={customers}
                                    projects={projects}
                                    onUpdateCustomer={handleUpdateCustomer}
                                    onDeleteCustomer={handleDeleteCustomer}
                                />
                            )}
                            {activePhase === 'pipeline' && <MasterPipeline />}
                            {activePhase === 'master_hub' && <MasterExecutionHub projects={projects} />}
                            {activePhase === 'schedule' && <FinOpsDashboard />}
                            {activePhase === 'radar' && <PreSalesRadar />}
                            {activePhase === 'process' && <FinOpsDashboard />}
                            {activePhase === 'playbooks' && <MasterExecutionHub projects={projects} />}
                            {activePhase === 'migration_monitor' && <LiveCloudNOC />}
                        </>
                    ) : (
                        <ProjectWizard />
                    )}
                </main>
            </div>
        </div>
    );
}