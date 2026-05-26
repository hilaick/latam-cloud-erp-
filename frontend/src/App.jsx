import React, { useState, useContext, useEffect } from 'react';
import { ERPContext } from './context/ERPContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';

import CustomerDirectory from './components/views/CustomerDirectory';
import MasterExecutionHub from './components/views/MasterExecutionHub';
import LiveCloudNOC from './components/views/LiveCloudNOC';
import RegionalMap from './components/views/RegionalMap';
import MasterPipeline from './components/views/MasterPipeline';
import PreSalesRadar from './components/views/PreSalesRadar';
import FinOpsDashboard from './components/views/FinOpsDashboard';
import ProjectWizard from './components/wizard/ProjectWizard';
import GlobalDashboard from './components/views/GlobalDashboard';
import GlobalSchedule from './components/views/GlobalSchedule';
import GlobalProcessView from './components/views/GlobalProcessView';
import PlaybookStudio from './components/views/PlaybookStudio';
import UserManagement from './components/views/UserManagement';

export default function App() {
    const { activePhase } = useContext(ERPContext);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    // 🚨 AUTHENTICATION STATE
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Check for existing token on load
    useEffect(() => {
        const token = localStorage.getItem('erp_jwt_token');
        if (token) setIsAuthenticated(true);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password: loginPassword })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('erp_jwt_token', data.token);
                localStorage.setItem('erp_user', JSON.stringify(data.user));
                setIsAuthenticated(true);
            } else {
                setLoginError(data.error || "Invalid credentials");
            }
        } catch (err) {
            setLoginError("Failed to connect to authentication server.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('erp_jwt_token');
        localStorage.removeItem('erp_user');
        setIsAuthenticated(false);
        window.location.reload(); // Hard reset state
    };

    const knownRoutes = ['home', 'map', 'radar', 'pipeline', 'crm', 'migration_monitor', 'master_hub', 'wizard', 'finops', 'schedule', 'process', 'playbooks', 'users'];

    // 🚨 IF NOT LOGGED IN, SHOW LOGIN SCREEN
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-blue-500/30 relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay"></div>
                
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-fade-in">
                    <div className="p-8 text-center bg-slate-50 border-b border-slate-200">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center border-4 border-blue-100 shadow-lg mx-auto mb-4">
                            <i className="fas fa-cloud text-white text-3xl"></i>
                        </div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">LATAM Cloud ERP</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise Delivery Platform</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="p-8 space-y-6">
                        {loginError && (
                            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold border border-rose-200 flex items-center">
                                <i className="fas fa-exclamation-circle mr-2 text-base"></i> {loginError}
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Corporate Email</label>
                            <input type="email" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors" placeholder="user@latamcloud.com" />
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Password</label>
                            <input type="password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" />
                        </div>

                        <button type="submit" disabled={isLoggingIn} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex justify-center items-center">
                            {isLoggingIn ? <i className="fas fa-spinner fa-spin text-xl"></i> : "Authenticate & Enter"}
                        </button>
                    </form>
                </div>

                {/* 🚨 NEW: LOGIN SCREEN VERSION FOOTER */}
                <div className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none">
                    <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500/80">LATAM Cloud ERP v2.0.0-Enterprise</p>
                </div>
            </div>
        );
    }

    // 🚨 IF LOGGED IN, RENDER THE MAIN APP
    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800 selection:bg-blue-200">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            
            <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50/50 flex flex-col">
                <TopBar setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />

                <div className="p-4 md:p-8 lg:p-12 pb-24 flex-1">
                    {activePhase === 'home' && <GlobalDashboard />}
                    {activePhase === 'schedule' && <GlobalSchedule />}
                    {activePhase === 'process' && <GlobalProcessView />}
                    
                    {activePhase === 'map' && <RegionalMap />}
                    {activePhase === 'radar' && <PreSalesRadar />}
                    {activePhase === 'pipeline' && <MasterPipeline />}
                    {activePhase === 'crm' && <CustomerDirectory />}
                    {activePhase === 'migration_monitor' && <LiveCloudNOC />}
                    {activePhase === 'master_hub' && <MasterExecutionHub />}
                    {activePhase === 'wizard' && <ProjectWizard />}
                    {activePhase === 'finops' && <FinOpsDashboard />}
                    {activePhase === 'playbooks' && <PlaybookStudio />}
                    {activePhase === 'users' && <UserManagement />}
                    
                    {!knownRoutes.includes(activePhase) && (
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
