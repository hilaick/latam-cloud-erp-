import React, { useState, useEffect } from 'react';

const TOUR_STEPS = [
  { title: 'Navigation Bar', text: 'Use the top bar to switch between Dashboard, Pipeline, Map, Radar, and more.', icon: 'fa-compass' },
  { title: 'New Project (Guided)', text: 'Click "Guided Wizard" in the profile menu to start a new migration project with step-by-step guidance.', icon: 'fa-magic' },
  { title: 'Customer Directory', text: 'Manage all customers and their Huawei Cloud credentials in the CRM view.', icon: 'fa-address-book' },
  { title: 'Delivery Agent', text: 'Chat with the AI-powered Delivery Agent to query projects, run simulations, and get insights.', icon: 'fa-robot' },
  { title: 'FinOps Dashboard', text: 'Track costs, RI reconciliation, and budget burn-down across all projects.', icon: 'fa-chart-line' },
];

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('onboardingComplete')) {
      const dismissed = localStorage.getItem('onboardingDismissed');
      if (!dismissed) setActive(true);
    }
  }, []);

  const finish = () => {
    localStorage.setItem('onboardingComplete', 'true');
    setActive(false);
    if (onComplete) onComplete();
  };

  const skip = () => {
    localStorage.setItem('onboardingDismissed', 'true');
    setActive(false);
  };

  if (!active) return null;

  // Welcome modal
  if (step === -1) {
    return (
      <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md p-8 text-center" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 mx-auto mb-4 flex items-center justify-center">
            <i className="fas fa-rocket text-white text-2xl"></i>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Welcome to ERP Migration Factory</h2>
          <p className="text-sm text-slate-500 mb-6">Would you like a quick tour of the key features?</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setStep(0)} className="px-6 py-3 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors">
              <i className="fas fa-play mr-1"></i> Start Tour
            </button>
            <button onClick={skip} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  const t = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm p-6" style={{ animation: 'fadeIn 0.3s ease' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <i className={`fas ${t.icon} text-blue-600 text-lg`}></i>
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">
              Tour {step + 1} / {TOUR_STEPS.length}
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-1">{t.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.text}</p>
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mt-5">
          {TOUR_STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200'}`} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-5">
          <button onClick={skip} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">
                Back
              </button>
            )}
            <button
              onClick={() => isLast ? finish() : setStep(s => s + 1)}
              className="px-4 py-1.5 rounded-lg text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
