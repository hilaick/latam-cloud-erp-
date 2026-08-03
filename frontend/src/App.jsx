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

    const knownRoutes = ['home', 'map', 'radar', 'pipeline', 'crm', 'migration_monitor', 'master_hub', 'wizard', 'finops', 'schedule', 'process', 'playbooks', 'users', 'workflow'];
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
                    {activePhase === 'users' && <UserManagement />}
                    
                    {!knownRoutes.includes(activePhase) && (
                        <div className="text-center mt-20 text-slate-400">
                            <h2 className="text-2xl font-bold">View Migration in Progress</h2>
                            <p>This view is currently being ported to the Vite architecture.</p>
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
