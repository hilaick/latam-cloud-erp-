import React, { useContext } from 'react';
import { ERPContext } from './context/ERPContext';
import Sidebar from './components/layout/Sidebar';
import CustomerDirectory from './components/views/CustomerDirectory';
import MasterExecutionHub from './components/views/MasterExecutionHub';
import LiveCloudNOC from './components/views/LiveCloudNOC';
import RegionalMap from './components/views/RegionalMap';
import MasterPipeline from './components/views/MasterPipeline';
import PreSalesRadar from './components/views/PreSalesRadar';
import FinOpsDashboard from './components/views/FinOpsDashboard';
import ProjectWizard from './components/wizard/ProjectWizard';

export default function App() {
    const { activePhase } = useContext(ERPContext);

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800 selection:bg-blue-200">
            <Sidebar />
            <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50/50">
                <div className="p-4 md:p-8 lg:p-12 pb-24">
                    {activePhase === 'home' && <RegionalMap />}
                    {activePhase === 'radar' && <PreSalesRadar />}
                    {activePhase === 'pipeline' && <MasterPipeline />}
                    {activePhase === 'crm' && <CustomerDirectory />}
                    {activePhase === 'noc' && <LiveCloudNOC />}
                    {activePhase === 'execution' && <MasterExecutionHub />}
                    {activePhase === 'wizard' && <ProjectWizard />}
                    {activePhase === 'finops' && <FinOpsDashboard />}
                    
                    {/* Fallback for components you haven't ported yet */}
                    {!['home', 'radar', 'pipeline', 'crm', 'noc', 'execution', 'wizard', 'finops'].includes(activePhase) && (
                        <div className="text-center mt-20 text-slate-400">
                            <h2 className="text-2xl font-bold">View Migration in Progress</h2>
                            <p>This view is currently being ported to the Vite architecture.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}