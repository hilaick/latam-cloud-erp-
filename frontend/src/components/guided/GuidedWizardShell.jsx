import React, { useState, useEffect } from 'react';

export default function GuidedWizardShell({
  scenarioId, title, subtitle, steps = [], currentStep = 0,
  onNext, onBack, onSkip, onComplete, children,
}) {
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  // Persist progress
  useEffect(() => {
    if (scenarioId) {
      localStorage.setItem(`guided-wizard-${scenarioId}`, String(currentStep));
    }
  }, [scenarioId, currentStep]);

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black flex items-center gap-3">
              <i className="fas fa-magic text-purple-400"></i>
              {title || 'Guided Migration Wizard'}
            </h2>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 transition-colors"
          >
            <i className="fas fa-times mr-1"></i> Skip Wizard
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
          Step {currentStep + 1} of {steps.length} — {Math.round(progress)}% complete
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex gap-6 flex-1">
        {/* Step sidebar */}
        <div className="w-64 shrink-0 space-y-2">
          {steps.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <div
                key={step.id || i}
                className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 border-blue-300 shadow-sm scale-105'
                    : isDone
                    ? 'bg-emerald-50 border-emerald-200 opacity-70'
                    : 'bg-white border-slate-200 opacity-50'
                }`}
                onClick={() => { if (i < currentStep) onBack && onBack(); }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {isDone ? <i className="fas fa-check text-[10px]"></i> : i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-black truncate ${isActive ? 'text-blue-700' : isDone ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {step.title}
                    </div>
                    {step.description && (
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">{step.description}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 overflow-y-auto custom-scrollbar" style={{ animation: 'fadeIn 0.3s ease' }}>
          {children}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={onBack}
              disabled={currentStep === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <i className="fas fa-arrow-left mr-1"></i> Back
            </button>
            <div className="flex gap-3">
              {currentStep === steps.length - 1 ? (
                <button
                  onClick={onComplete}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors"
                >
                  <i className="fas fa-check mr-1"></i> Complete & Proceed
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors"
                >
                  Next <i className="fas fa-arrow-right ml-1"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
