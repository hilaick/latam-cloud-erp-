import React, { useState } from 'react';
import { helpTopics } from '../../data/helpContent';
import HelpSlideout from './HelpSlideout';

export default function HelpButton({ topic, size }) {
  const [open, setOpen] = useState(false);
  const sz = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-[10px]';
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`${sz} rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-300 flex items-center justify-center transition-colors shrink-0`}
        title="Help"
      >
        <i className="fas fa-question"></i>
      </button>
      {open && <HelpSlideout topic={topic} onClose={() => setOpen(false)} />}
    </>
  );
}
