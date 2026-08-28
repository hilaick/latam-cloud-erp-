import React, { useState, useMemo, useEffect, useRef } from 'react';
import { helpTopics } from '../../data/helpContent';

// Category display config — order matters (lifecycle flow)
const CATEGORY_CONFIG = [
    { name: 'Getting Started', icon: 'fa-rocket', color: 'blue' },
    { name: 'Phase 1 — ARB', icon: 'fa-handshake', color: 'indigo' },
    { name: 'Phase 2 — Architecture', icon: 'fa-drafting-compass', color: 'purple' },
    { name: 'Phase 3 — Planning', icon: 'fa-map-signs', color: 'amber' },
    { name: 'Phase 4 — Execution', icon: 'fa-play-circle', color: 'rose' },
    { name: 'Phase 5 — Post-Live', icon: 'fa-flag-checkered', color: 'emerald' },
    { name: 'Dashboards', icon: 'fa-th-large', color: 'slate' },
    { name: 'AI & Automation', icon: 'fa-robot', color: 'violet' },
    { name: 'Configuration', icon: 'fa-cog', color: 'gray' },
    { name: 'Scenarios', icon: 'fa-cubes', color: 'cyan' },
];

const COLOR_MAP = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', hover: 'hover:bg-blue-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', hover: 'hover:bg-indigo-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', hover: 'hover:bg-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', hover: 'hover:bg-amber-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', hover: 'hover:bg-rose-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', hover: 'hover:bg-emerald-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500', hover: 'hover:bg-slate-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', hover: 'hover:bg-violet-100' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500', hover: 'hover:bg-gray-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500', hover: 'hover:bg-cyan-100' },
};

function renderMarkdown(text) {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code block
        if (line.startsWith('```')) {
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // skip closing ```
            elements.push(
                <pre key={key++} className="bg-slate-900 text-emerald-300 p-4 rounded-xl overflow-x-auto text-xs font-mono leading-relaxed my-3 border border-slate-700">
                    <code>{codeLines.join('\n')}</code>
                </pre>
            );
            continue;
        }

        // H2
        if (line.startsWith('## ')) {
            elements.push(<h2 key={key++} className="text-xl font-black text-slate-900 mt-8 mb-4 pb-2 border-b border-slate-200">{line.replace('## ', '')}</h2>);
            i++; continue;
        }
        // H3
        if (line.startsWith('### ')) {
            elements.push(<h3 key={key++} className="text-base font-black text-slate-800 mt-6 mb-3">{line.replace('### ', '')}</h3>);
            i++; continue;
        }
        // H4
        if (line.startsWith('#### ')) {
            elements.push(<h4 key={key++} className="text-sm font-black text-slate-700 mt-4 mb-2">{line.replace('#### ', '')}</h4>);
            i++; continue;
        }

        // Horizontal rule
        if (line.trim() === '---') {
            elements.push(<hr key={key++} className="my-6 border-slate-200" />);
            i++; continue;
        }

        // Table — collect contiguous lines starting with |
        if (line.trim().startsWith('|')) {
            const tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            if (tableLines.length >= 2) {
                const headers = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
                const bodyRows = tableLines.slice(2).map(row =>
                    row.split('|').filter(c => c.trim()).map(c => c.trim())
                );
                elements.push(
                    <div key={key++} className="overflow-x-auto my-4 rounded-xl border border-slate-200 shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-100">
                                    {headers.map((h, hi) => (
                                        <th key={hi} className="px-4 py-3 font-black text-slate-700 uppercase tracking-wider text-[10px]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {bodyRows.map((row, ri) => (
                                    <tr key={ri} className={`${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-t border-slate-100 hover:bg-indigo-50/50 transition-colors`}>
                                        {row.map((cell, ci) => (
                                            <td key={ci} className="px-4 py-2.5 font-medium text-slate-600">{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            continue;
        }

        // Ordered list
        if (/^\d+\.\s/.test(line)) {
            const items = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ''));
                i++;
            }
            elements.push(
                <ol key={key++} className="my-3 space-y-1.5 ml-6 list-decimal">
                    {items.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-700 leading-relaxed">{item}</li>
                    ))}
                </ol>
            );
            continue;
        }

        // Unordered list
        if (/^[-*]\s/.test(line)) {
            const items = [];
            while (i < lines.length && /^[-*]\s/.test(lines[i])) {
                items.push(lines[i].replace(/^[-*]\s/, ''));
                i++;
            }
            elements.push(
                <ul key={key++} className="my-3 space-y-1.5 ml-6 list-disc">
                    {items.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-700 leading-relaxed">{item}</li>
                    ))}
                </ul>
            );
            continue;
        }

        // Empty line
        if (line.trim() === '') {
            i++; continue;
        }

        // Paragraph
        elements.push(<p key={key++} className="text-sm text-slate-600 leading-relaxed my-2">{line}</p>);
        i++;
    }

    return elements;
}

export default function DocumentationCenter() {
    const [search, setSearch] = useState('');
    const [activeArticle, setActiveArticle] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const contentRef = useRef(null);

    // Group topics by category
    const categories = useMemo(() => {
        const cats = {};
        Object.entries(helpTopics).forEach(([key, topic]) => {
            const cat = topic.category || 'General';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push({ key, ...topic });
        });
        return cats;
    }, []);

    // Sort categories by lifecycle order
    const sortedCategoryNames = useMemo(() => {
        const known = CATEGORY_CONFIG.map(c => c.name);
        const present = Object.keys(categories);
        const ordered = known.filter(k => present.includes(k));
        const extra = present.filter(k => !known.includes(k)).sort();
        return [...ordered, ...extra];
    }, [categories]);

    // Search results
    const searchResults = useMemo(() => {
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

    // Auto-select first article
    useEffect(() => {
        if (!activeArticle && sortedCategoryNames.length > 0) {
            const firstCat = sortedCategoryNames[0];
            if (categories[firstCat]?.length > 0) {
                setActiveCategory(firstCat);
                setActiveArticle(categories[firstCat][0].key);
            }
        }
    }, [sortedCategoryNames, categories, activeArticle]);

    // Scroll to top when article changes
    useEffect(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
    }, [activeArticle]);

    const currentArticle = helpTopics[activeArticle];
    const totalTopics = Object.keys(helpTopics).length;

    // Get category config
    const getCatConfig = (catName) => {
        return CATEGORY_CONFIG.find(c => c.name === catName) || { icon: 'fa-folder', color: 'gray' };
    };
    const getColors = (colorName) => COLOR_MAP[colorName] || COLOR_MAP.gray;

    return (
        <div className="animate-fade-in max-w-[1400px] mx-auto h-[calc(100vh-140px)] flex gap-5 pb-6">
            {/* Left sidebar — categories + topics */}
            <div className="w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                            <i className="fas fa-book-open text-white text-sm"></i>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800">Help Guide</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{totalTopics} articles</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search articles..."
                            className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Category list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {searchResults ? (
                        /* Search results */
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5 mb-1">
                                Search Results ({searchResults.length})
                            </div>
                            {searchResults.length === 0 ? (
                                <div className="px-3 py-6 text-center">
                                    <i className="fas fa-search text-slate-200 text-2xl mb-2"></i>
                                    <p className="text-xs text-slate-400">No results for "{search}"</p>
                                </div>
                            ) : (
                                searchResults.map(article => {
                                    const catCfg = getCatConfig(article.category);
                                    const colors = getColors(catCfg.color);
                                    return (
                                        <button
                                            key={article.key}
                                            onClick={() => { setActiveArticle(article.key); setActiveCategory(article.category); setSearch(''); }}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all mb-0.5 flex items-start gap-2.5 ${activeArticle === article.key ? `${colors.bg} ${colors.text}` : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <i className={`fas ${article.icon || 'fa-file-alt'} ${activeArticle === article.key ? colors.text : 'text-slate-300'} text-xs mt-0.5`}></i>
                                            <div className="flex-1 min-w-0">
                                                <div className="truncate">{article.title}</div>
                                                <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${activeArticle === article.key ? colors.text : 'text-slate-300'}`}>{article.category}</div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        /* Category groups */
                        sortedCategoryNames.map(catName => {
                            const catCfg = getCatConfig(catName);
                            const colors = getColors(catCfg.color);
                            const articles = categories[catName] || [];
                            const isActiveCat = activeCategory === catName;

                            return (
                                <div key={catName} className="mb-3">
                                    <div
                                        onClick={() => setActiveCategory(catName)}
                                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${isActiveCat ? `${colors.bg}` : 'hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${colors.bg} ${colors.text}`}>
                                            <i className={`fas ${catCfg.icon} text-[10px]`}></i>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActiveCat ? colors.text : 'text-slate-400'}`}>{catName}</span>
                                        <span className="ml-auto text-[9px] font-bold text-slate-300">{articles.length}</span>
                                    </div>
                                    {articles.map(article => (
                                        <button
                                            key={article.key}
                                            onClick={() => { setActiveArticle(article.key); setActiveCategory(catName); }}
                                            className={`w-full text-left px-3 py-2 pl-9 rounded-lg text-xs font-medium transition-all mb-0.5 flex items-center gap-2 ${activeArticle === article.key ? `${colors.bg} ${colors.text} font-bold` : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <i className={`fas ${article.icon || 'fa-file-alt'} ${activeArticle === article.key ? colors.text : 'text-slate-300'} text-[10px]`}></i>
                                            <span className="truncate">{article.title}</span>
                                        </button>
                                    ))}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main content area */}
            <div ref={contentRef} className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar">
                {currentArticle ? (
                    <div className="p-8 lg:p-10">
                        {/* Article header */}
                        <div className="border-b border-slate-100 pb-6 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                {(() => {
                                    const catCfg = getCatConfig(currentArticle.category);
                                    const colors = getColors(catCfg.color);
                                    return (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colors.bg} ${colors.text} border ${colors.border}`}>
                                            <i className={`fas ${catCfg.icon} text-[9px]`}></i>
                                            {currentArticle.category}
                                        </span>
                                    );
                                })()}
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 mb-2">{currentArticle.title}</h1>
                            {currentArticle.short && <p className="text-sm text-slate-500 leading-relaxed">{currentArticle.short}</p>}
                            {currentArticle.tags && (
                                <div className="flex flex-wrap gap-1.5 mt-4">
                                    {currentArticle.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">#{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Article body */}
                        <div className="prose prose-sm max-w-none">
                            {renderMarkdown(currentArticle.long || currentArticle.short || 'No content available.')}
                        </div>

                        {/* Article footer */}
                        <div className="mt-10 pt-6 border-t border-slate-100">
                            {/* Prev/Next navigation */}
                            {(() => {
                                const allKeys = sortedCategoryNames.flatMap(cat => (categories[cat] || []).map(a => a.key));
                                const currentIdx = allKeys.indexOf(activeArticle);
                                const prevKey = currentIdx > 0 ? allKeys[currentIdx - 1] : null;
                                const nextKey = currentIdx < allKeys.length - 1 ? allKeys[currentIdx + 1] : null;
                                const prevTopic = prevKey ? helpTopics[prevKey] : null;
                                const nextTopic = nextKey ? helpTopics[nextKey] : null;

                                return (
                                    <div className="flex items-center justify-between gap-4">
                                        {prevTopic ? (
                                            <button
                                                onClick={() => { setActiveArticle(prevKey); setActiveCategory(prevTopic.category); }}
                                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                                            >
                                                <i className="fas fa-arrow-left text-slate-300 group-hover:text-indigo-500 text-xs"></i>
                                                <div className="text-left">
                                                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Previous</div>
                                                    <div className="text-xs font-bold text-slate-700">{prevTopic.title}</div>
                                                </div>
                                            </button>
                                        ) : <div />}
                                        {nextTopic ? (
                                            <button
                                                onClick={() => { setActiveArticle(nextKey); setActiveCategory(nextTopic.category); }}
                                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                                            >
                                                <div className="text-right">
                                                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Next</div>
                                                    <div className="text-xs font-bold text-slate-700">{nextTopic.title}</div>
                                                </div>
                                                <i className="fas fa-arrow-right text-slate-300 group-hover:text-indigo-500 text-xs"></i>
                                            </button>
                                        ) : <div />}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <i className="fas fa-book-open text-5xl text-slate-200 mb-4"></i>
                            <p className="text-sm text-slate-400 font-medium">Select an article from the sidebar</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
