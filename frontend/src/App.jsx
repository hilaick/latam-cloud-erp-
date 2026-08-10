import React, { useState, useContext, useEffect } from 'react';
import { ERPContext } from './context/ERPContext';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import FinOpsDashboard from './components/views/FinOpsDashboard';
import CustomerDirectory from './components/views/CustomerDirectory';
import MasterExecutionHub from './components/views/MasterExecutionHub';
import LiveCloudNOC from './components/views/LiveCloudNOC';
import RegionalMap from './components/views/RegionalMap';
import MasterPipeline from './components/views/MasterPipeline';
import PreSalesRadar from './components/views/PreSalesRadar';
import ProjectWizard from './components/wizard/ProjectWizard';
import GlobalDashboard from './components/views/GlobalDashboard';
import GlobalSchedule from './components/views/GlobalSchedule';
import GlobalProcessView from './components/views/GlobalProcessView';
import PlaybookStudio from './components/views/PlaybookStudio';
import UserManagement from './components/views/UserManagement';
import WorkflowGraphView from './components/views/WorkflowGraphView';
import GlobalGlossary from './components/utils/GlobalGlossary';
import GlobalCommandDrawer from './components/utils/GlobalCommandDrawer';
import HermesModal from './components/HermesModal';
import LoginPage from './components/auth/LoginPage';
import ResourceDiscoveryMap from './components/views/ResourceDiscoveryMap';
import HaltedProjects from './components/views/HaltedProjects';

function App() {
    const { isAuthenticated, loading: authLoading, logout } = useAuth();
    
    // MODAL STATES
    const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
    const [isCommandDrawerOpen, setIsCommandDrawerOpen] = useState(false);
    const [isHermesOpen, setIsHermesOpen] = useState(false);

    const { 
        projects, 
        activePhase, 
        activeProjectId, 
        setActivePhase, 
        handleUpdateProject, 
        refreshData 
    } = useContext(ERPContext);

    // ── Redirect to home if wizard project is unset ──
    useEffect(() => {
        if (activePhase === 'wizard' && (!activeProjectId || activeProjectId === 'global' || activeProjectId === 'none')) {
            setActivePhase('home');
        }
    }, [activePhase, activeProjectId, setActivePhase]);

    const handleLogout = async () => {
        await logout();
        window.location.reload(); 
    };

    const knownRoutes = ['home', 'map', 'radar', 'pipeline', 'crm', 'migration_monitor', 'master_hub', 'wizard', 'finops', 'schedule', 'process', 'playbooks', 'users', 'workflow', 'login', 'resource-discovery', 'halted'];
    const activeProject = (projects || []).find(p => String(p.id) === String(activeProjectId));

    // ── Auth loading state ──
    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-purple-500 text-4xl mb-4"></i>
                    <p className="text-slate-400 text-sm font-bold">Initializing session...</p>
                </div>
            </div>
        );
    }

    // ── Login gate ──
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800 selection:bg-blue-200">
            <Sidebar />
            
            <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50/50 flex flex-col pb-24 lg:pb-0">
                <TopBar 
                    onLogout={handleLogout} 
                    onOpenGlossary={() => setIsGlossaryOpen(true)} 
                    onOpenCommandDrawer={() => setIsCommandDrawerOpen(true)} // 🚨 PASSED PROP
                    onOpenHermes={() => setIsHermesOpen(true)} // 🚨 HERMES AI BUTTON
                />

                <div className="p-3 md:p-8 lg:p-12 pb-12 flex-1">
                    {activePhase === 'home' && <GlobalDashboard />}
                    {activePhase === 'schedule' && <GlobalSchedule />}
                    {activePhase === 'process' && <GlobalProcessView />}
                    
                    {activePhase === 'map' && <RegionalMap />}
                    {activePhase === 'radar' && <PreSalesRadar />}
                    {activePhase === 'pipeline' && <MasterPipeline />}
                    {activePhase === 'crm' && <CustomerDirectory />}
                    {activePhase === 'migration_monitor' && <LiveCloudNOC />}
                    {activePhase === 'master_hub' && <MasterExecutionHub />}
                    
                    {activePhase === 'wizard' && (
                        <ProjectWizard 
                            activeProject={activeProject} 
                            onUpdateProject={handleUpdateProject} 
                            onClose={() => setActivePhase('home')} 
                        />
                    )}
                    
                    {activePhase === 'finops' && <FinOpsDashboard />}
                    {activePhase === 'playbooks' && <PlaybookStudio />}
                    {activePhase === 'workflow' && <WorkflowGraphView />}
                    {activePhase === 'resource-discovery' && <ResourceDiscoveryMap />}
                    {activePhase === 'halted' && <HaltedProjects />}
                    {activePhase === 'users' && <UserManagement />}
                    
                    {activePhase === 'login' && <LoginPage />}
                    
                    {!knownRoutes.includes(activePhase) && (
                        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                                <i className="fas fa-clock text-red-400 text-3xl" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-300">Session Expired</h2>
                                <p className="text-slate-500 text-sm mt-2 max-w-md">
                                    Your session has expired or the page is unavailable. Please log in again.
                                </p>
                            </div>
                            <button
                                onClick={() => { handleLogout(); }}
                                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                            >
                                <i className="fas fa-sign-in-alt mr-2" /> Log In
                            </button>
                        </div>
                    )}
                </div>
                
                <GlobalGlossary 
                    isOpen={isGlossaryOpen} 
                    onClose={() => setIsGlossaryOpen(false)} 
                />

                {/* 🚨 THE GLOBAL SLIDING DRAWER */}
                <GlobalCommandDrawer 
                    isOpen={isCommandDrawerOpen}
                    onClose={() => setIsCommandDrawerOpen(false)}
                />

                {/* 🚨 HERMES AI MODAL */}
                <HermesModal 
                    projectId={activeProjectId}
                    isOpen={isHermesOpen}
                    onClose={() => setIsHermesOpen(false)}
                />
            </main>
        </div>
    );
}

export default App;
