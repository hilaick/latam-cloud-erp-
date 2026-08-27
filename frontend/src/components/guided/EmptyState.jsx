import React, { useState } from 'react';
import HelpSlideout from './HelpSlideout';

export default function EmptyState({ icon, title, description, actionLabel, onAction, helpTopic }) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <i className={`fas ${icon || 'fa-inbox'} text-3xl text-slate-300`}></i>
      </div>
      <h3 className="text-lg font-black text-slate-700 mb-2">{title || 'Nothing here yet'}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{description || 'Get started by creating your first item.'}</p>
      <div className="flex items-center gap-3">
        {onAction && (
          <button
            onClick={onAction}
            className="px-6 py-3 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors"
          >
            <i className="fas fa-plus mr-1"></i> {actionLabel || 'Get Started'}
          </button>
        )}
        {helpTopic && (
          <button
            onClick={() => setShowHelp(true)}
            className="px-4 py-3 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <i className="fas fa-question-circle mr-1"></i> Learn more
          </button>
        )}
      </div>
      {showHelp && <HelpSlideout topic={helpTopic} onClose={() => setShowHelp(false)} />}
    </div>
  );
}
