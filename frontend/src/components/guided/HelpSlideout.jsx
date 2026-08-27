import React, { useState, useMemo } from 'react';
import { helpTopics } from '../../data/helpContent';

export default function HelpSlideout({ topic, onClose }) {
  const [search, setSearch] = useState('');
  const article = helpTopics[topic];

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return Object.entries(helpTopics)
      .filter(([k, t]) => (t.title + t.short + (t.tags || []).join(' ')).toLowerCase().includes(search.toLowerCase()))
      .map(([k, t]) => ({ key: k, ...t }));
  }, [search]);

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-black text-slate-800 mt-3 mb-1">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-bold text-slate-700 mt-2 mb-1">{line.replace('### ', '')}</h3>;
      if (line.startsWith('- ')) return <li key={i} className="text-xs text-slate-600 ml-4 list-disc">{line.replace('- ', '')}</li>;
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      return <p key={i} className="text-xs text-slate-600 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full" style={{ animation: 'slideInRight 0.3s ease' }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <i className="fas fa-question-circle text-blue-500"></i> Help & Documentation
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <i className="fas fa-times"></i>
          </button>
        </div>
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search help topics..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
            />
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {searchResults ? (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Search Results ({searchResults.length})
              </div>
              {searchResults.map(r => (
                <button
                  key={r.key}
                  onClick={() => { setSearch(''); }}
                  className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2 transition-colors"
                >
                  <div className="text-xs font-bold text-slate-700">{r.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{r.short}</div>
                </button>
              ))}
            </div>
          ) : article ? (
            <div>
              <h2 className="text-lg font-black text-slate-800 mb-1">{article.title}</h2>
              {article.short && <p className="text-xs text-slate-500 mb-3">{article.short}</p>}
              {article.tags && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {article.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">{tag}</span>
                  ))}
                </div>
              )}
              <div className="border-t border-slate-100 pt-3">
                {renderMarkdown(article.long || article.short)}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <i className="fas fa-book text-3xl mb-3"></i>
              <p className="text-xs">No help content found for this topic.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
