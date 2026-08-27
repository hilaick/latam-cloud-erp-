import React, { useState, useMemo } from 'react';
import { helpTopics } from '../../data/helpContent';

export default function DocumentationCenter() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Getting Started');
    const [helpfulFeedback, setHelpfulFeedback] = useState({});

    const categories = useMemo(() => {
        const cats = {};
        Object.entries(helpTopics).forEach(([key, topic]) => {
            const cat = topic.category || 'General';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push({ key, ...topic });
        });
        return cats;
    }, []);

    const filteredArticles = useMemo(() => {
        if (!search.trim()) return null;
        const results = [];
        Object.entries(helpTopics).forEach(([key, topic]) => {
            const searchText = (topic.title + ' ' + topic.short + ' ' + (topic.tags || []).join(' ')).toLowerCase();
            if (searchText.includes(search.toLowerCase())) {
                results.push({ key, ...topic });
            }
        });
        return results;
    }, [search]);

    const [activeArticle, setActiveArticle] = useState(() => {
        const firstCat = Object.keys(categories)[0];
        return categories[firstCat]?.[0]?.key || null;
    });

    const currentArticle = helpTopics[activeArticle];

    const renderMarkdown = (text) => {
        if (!text) return null;
        const lines = text.split('\n');
        return lines.map((line, i) => {
            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-black text-slate-800 mt-4 mb-2">{line.replace('## ', '')}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-slate-700 mt-3 mb-1">{line.replace('### ', '')}</h3>;
            if (line.startsWith('- ')) return <li key={i} className="text-xs text-slate-600 ml-4 list-disc">{line.replace('- ', '')}</li>;
            if (line.startsWith('| ')) return null; // skip table syntax for simplicity
            if (line.trim() === '') return <div key={i} className="h-2" />;
            return <p key={i} className="text-xs text-slate-600 leading-relaxed">{line}</p>;
        });
    };

    return (
        <div className="animate-fade-in max-w-[1400px] mx-auto h-[calc(100vh-140px)] flex gap-6 pb-12">
            {/* Left sidebar — categories */}
            <div className="w-64 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <i className="fas fa-book text-blue-500"></i> Documentation
                    </h2>
                </div>
                <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search docs..."
                            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredArticles ? (
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1">
                                Search Results ({filteredArticles.length})
                            </div>
                            {filteredArticles.map(article => (
                                <button
                                    key={article.key}
                                    onClick={() => { setActiveArticle(article.key); setSearch(''); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-0.5 ${activeArticle === article.key ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <i className="fas fa-file-alt mr-2 text-slate-300"></i>{article.title}
                                </button>
                            ))}
                        </div>
                    ) : (
                        Object.entries(categories).map(([cat, articles]) => (
                            <div key={cat} className="mb-3">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1">{cat}</div>
                                {articles.map(article => (
                                    <button
                                        key={article.key}
                                        onClick={() => setActiveArticle(article.key)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-0.5 ${activeArticle === article.key ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <i className="fas fa-file-alt mr-2 text-slate-300"></i>{article.title}
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar p-8">
                {currentArticle ? (
                    <div>
                        <div className="border-b border-slate-100 pb-4 mb-6">
                            <h1 className="text-2xl font-black text-slate-800">{currentArticle.title}</h1>
                            {currentArticle.short && <p className="text-sm text-slate-500 mt-2">{currentArticle.short}</p>}
                            {currentArticle.tags && (
                                <div className="flex gap-2 mt-3">
                                    {currentArticle.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="prose prose-sm max-w-none">
                            {renderMarkdown(currentArticle.long || currentArticle.short || 'No content available.')}
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Was this helpful?</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setHelpfulFeedback(prev => ({ ...prev, [activeArticle]: 'yes' }))}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${helpfulFeedback[activeArticle] === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <i className="fas fa-thumbs-up mr-1"></i> Yes
                                </button>
                                <button
                                    onClick={() => setHelpfulFeedback(prev => ({ ...prev, [activeArticle]: 'no' }))}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${helpfulFeedback[activeArticle] === 'no' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <i className="fas fa-thumbs-down mr-1"></i> No
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <i className="fas fa-book-open text-4xl text-slate-200 mb-4"></i>
                            <p className="text-sm text-slate-400">Select an article from the sidebar</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
