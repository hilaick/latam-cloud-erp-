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
import McpServerView from './components/views/McpServerView';
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
import HelpDrawer from './components/utils/HelpDrawer';
import DocumentationCenter from './components/views/DocumentationCenter';

// Direct imports (not lazy) — avoids React 19 chunk-boundary hook errors
import ScenarioPicker from './components/guided/ScenarioPicker';
import GuidedWizardShell from './components/guided/GuidedWizardShell';
import StepProjectSetup from './components/guided/steps/StepProjectSetup';
import StepSourceDiscovery from './components/guided/steps/StepSourceDiscovery';
import StepQuotationUpload from './components/guided/steps/StepQuotationUpload';

// Guided wizard step definitions — covers presales + Phase 1 (ARB) only
// After completion, hands off to regular Phase 2 (Architecture) in Project Wizard
const GUIDED_STEPS = [
  { id: 'project', title: 'Project Setup', icon: 'fa-folder-plus', description: 'Name, customer, region' },
  { id: 'discovery', title: 'Source Info', icon: 'fa-search', description: 'Source cloud & credentials' },
  { id: 'quotation', title: 'Quotation & BOM', icon: 'fa-file-excel', description: 'Upload presales BOM' },
];

const GUIDED_SCENARIOS = {
  'sap': { title: 'SAP S/4HANA Migration', subtitle: 'Migrate SAP workloads with certified flavors and manual cutover gates' },
  'cross-cloud': { title: 'Cross-Cloud Migration', subtitle: 'Migrate from AWS or Azure to Huawei Cloud using SMS' },
  'on-prem': { title: 'On-Prem Lift & Shift', subtitle: 'Migrate on-premises servers with SMS agent-based replication' },
  'database': { title: 'Database-Only Migration', subtitle: 'Migrate databases using DRS with minimal downtime' },
  'object-storage': { title: 'Object Storage Migration', subtitle: 'Migrate S3/Blob to Huawei Cloud OBS using OMS' },
  'multi-region': { title: 'Multi-Region Deployment', subtitle: 'Deploy across multiple regions with DR and failover' },
};

function App() {
    const { isAuthenticated, loading: authLoading, logout } = useAuth();
    
    // MODAL STATES
    const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
    const [isCommandDrawerOpen, setIsCommandDrawerOpen] = useState(false);
    const [isHermesOpen, setIsHermesOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [guidedScenario, setGuidedScenario] = useState(null);
    const [guidedStep, setGuidedStep] = useState(0);
    const [guidedData, setGuidedData] = useState({});

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

    const knownRoutes = ['home', 'map', 'radar', 'pipeline', 'crm', 'migration_monitor', 'master_hub', 'wizard', 'finops', 'schedule', 'process', 'playbooks', 'users', 'workflow', 'login', 'resource-discovery', 'halted', 'guided', 'docs'];
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
                    onOpenHelp={() => setIsHelpOpen(true)} // 📖 HELP DOCUMENTATION
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
                    {activePhase === 'halted' && <HaltedProjects />}
                    {activePhase === 'users' && <UserManagement />}
                    {activePhase === 'docs' && <DocumentationCenter />}

                    {activePhase === 'guided' && (
                        <>
                            {!guidedScenario ? (
                                <ScenarioPicker
                                    onSelectScenario={(id) => { setGuidedScenario(id); setGuidedStep(0); setGuidedData({}); }}
                                    onSkip={() => setActivePhase('home')}
                                />
                            ) : (
                                <GuidedWizardShell
                                    scenarioId={guidedScenario}
                                    title={GUIDED_SCENARIOS[guidedScenario]?.title || 'Guided Migration Wizard'}
                                    subtitle={GUIDED_SCENARIOS[guidedScenario]?.subtitle || ''}
                                    steps={GUIDED_STEPS}
                                    currentStep={guidedStep}
                                    onNext={() => setGuidedStep(s => Math.min(s + 1, GUIDED_STEPS.length - 1))}
                                    onBack={() => setGuidedStep(s => Math.max(s - 1, 0))}
                                    onSkip={() => {
                                        // Skip — go to project wizard at Phase 1 (ARB) if project created, else home
                                        if (guidedData.projectId) {
                                            setActiveProjectId(guidedData.projectId);
                                            setActivePhase('wizard');
                                        } else {
                                            setActivePhase('home');
                                        }
                                        setGuidedScenario(null);
                                    }}
                                    onComplete={() => {
                                        // Wizard finished (Step 3 = last step)
                                        // Save gathered data to project and advance to Phase 2 (Architecture)
                                        if (guidedData.projectId) {
                                            const projectPatch = {
                                                customerName: guidedData.customerName || '',
                                                country: guidedData.country || '',
                                                region: guidedData.region || 'la-south-2',
                                                mrr: Number(guidedData.mrr) || 0,
                                                sa: guidedData.sa || '',
                                                partner: guidedData.partner || '',
                                                quotationFile: guidedData.quotationFile || '',
                                                sourceCloud: guidedData.source || '',
                                                sapSid: guidedData.sapSid || '',
                                                dbType: guidedData.dbType || '',
                                                // Phase 1 (ARB) complete — advance to Phase 2 (Architecture)
                                                lifecycleState: '2_architecture',
                                                phase: '2_architecture',
                                                currentPhase: 'Architecture',
                                                migrationScenario: guidedScenario || '',
                                            };
                                            handleUpdateProject(guidedData.projectId, projectPatch);
                                            setActiveProjectId(guidedData.projectId);
                                            setActivePhase('wizard');
                                        } else {
                                            setActivePhase('home');
                                        }
                                        setGuidedScenario(null);
                                    }}
                                >
                                    {guidedStep === 0 && <StepProjectSetup data={guidedData} onChange={setGuidedData} />}
                                    {guidedStep === 1 && <StepSourceDiscovery data={guidedData} onChange={setGuidedData} scenarioId={guidedScenario} />}
                                    {guidedStep === 2 && <StepQuotationUpload data={guidedData} onChange={setGuidedData} />}
                                >
                                </GuidedWizardShell>
                            )}
                        </>
                    )}

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

                {/* 📖 GLOBAL HELP — now uses DocumentationCenter */}
                <HelpDrawer
                    isOpen={isHelpOpen}
                    onClose={() => { setIsHelpOpen(false); setActivePhase('docs'); }}
                    title="ERP Migration Factory — Documentation"
                    docName="USER_MANUAL"
                />
            </main>
        </div>
    );
}

export default App;
