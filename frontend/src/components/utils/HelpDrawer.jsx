import React, { useState, useEffect, useMemo } from 'react';

/**
 * Lightweight markdown → HTML converter for help content.
 * Supports headings, bold, italic, code, links, lists, tables, blockquotes, hr, paragraphs.
 */
function mdToHtml(md) {
  if (!md) return '';
  let html = md;

  // Pre: fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="bg-slate-900 text-emerald-300 p-4 rounded-xl overflow-x-auto text-xs font-mono leading-relaxed my-3 border border-slate-700"><code>${escapeHtml(code.trim())}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-200 text-rose-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-sm font-black text-slate-800 mt-6 mb-2">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-black text-slate-800 mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-black text-slate-900 mt-8 mb-4 pb-2 border-b border-slate-200">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-black text-slate-900 mt-8 mb-6">$1</h1>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-black italic">$1</strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-black">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-3 shadow-md border border-slate-200"/>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-600 hover:text-indigo-800 underline font-bold">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-6 border-slate-200"/>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-indigo-400 bg-indigo-50 pl-4 py-2 my-3 text-sm text-slate-700 italic rounded-r-lg">$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote[^>]*>/g, '<br/>');

  // Tables — convert markdown tables to HTML
  html = html.replace(/(\|[^\n]+\|\n\|[-:\s|]+\|\n((?:\|[^\n]+\|\n?)*))/g, (match) => {
    const lines = match.trim().split('\n').filter(l => l.includes('|'));
    if (lines.length < 2) return match;
    const headerLine = lines[0];
    const bodyLines = lines.slice(2); // skip separator line
    const headers = headerLine.split('|').filter(c => c.trim()).map(c => c.trim());
    const rows = bodyLines.map(line =>
      line.split('|').filter(c => c.trim()).map(c => c.trim())
    );
    let table = '<div class="overflow-x-auto my-4 rounded-xl border border-slate-200 shadow-sm"><table class="w-full text-left text-xs"><thead><tr class="bg-slate-100">';
    headers.forEach(h => { table += `<th class="px-4 py-3 font-black text-slate-700 uppercase tracking-wider text-[10px]">${h}</th>`; });
    table += '</tr></thead><tbody>';
    rows.forEach((row, i) => {
      table += `<tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-t border-slate-100 hover:bg-indigo-50/50 transition-colors">`;
      row.forEach(cell => { table += `<td class="px-4 py-2.5 font-bold text-slate-600">${cell}</td>`; });
      table += '</tr>';
    });
    table += '</tbody></table></div>';
    return table;
  });

  // Ordered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 list-decimal text-sm text-slate-700 my-1 leading-relaxed">$2</li>');
  // Wrap consecutive <li> in <ol>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ol class="my-3 space-y-1">$1</ol>');

  // Unordered lists
  html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-6 list-disc text-sm text-slate-700 my-1 leading-relaxed">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, (match) => {
    if (match.includes('<ol')) return match; // already wrapped
    return `<ul class="my-3 space-y-1">${match}</ul>`;
  });

  // Paragraphs: wrap remaining text blocks in <p>
  // Split by double newlines and wrap non-tag blocks
  const blocks = html.split(/\n{2,}/);
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed; // already an HTML tag
    // Replace single newlines within paragraph with <br/>
    const withBreaks = trimmed.replace(/\n/g, '<br/>');
    return `<p class="text-sm text-slate-600 leading-relaxed my-2">${withBreaks}</p>`;
  }).join('\n');

  return html;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function HelpDrawer({ isOpen, onClose, title, content, docName }) {
  const [mdContent, setMdContent] = useState(content || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (docName && isOpen && !content) {
      setLoading(true);
      const token = sessionStorage.getItem('hermes_access_token');
      fetch(`/api/docs/${docName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) setMdContent(data.content);
          else setMdContent('# Error\n\nUnable to load help content.');
        })
        .catch(() => setMdContent('# Error\n\nUnable to load help content.'))
        .finally(() => setLoading(false));
    } else if (content) {
      setMdContent(content);
    }
  }, [docName, content, isOpen]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // ⚠️ useMemo must be called BEFORE any early return — React rule: hooks must run in
  // the same order every render. When isOpen=false we return early, but when it flips
  // to true the useMemo below would add an extra hook → error #310.
  const htmlContent = useMemo(() => mdToHtml(mdContent), [mdContent]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[560px] bg-white shadow-2xl z-[101] animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
              <i className="fas fa-book-open text-white text-sm"></i>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">{title || 'Help Guide'}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Documentation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-indigo-500 text-3xl mb-3"></i>
                <p className="text-slate-400 text-sm font-bold">Loading help content...</p>
              </div>
            </div>
          ) : (
            <div
              className="prose-prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-center shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            ERP Migration Factory — Help System
          </p>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
