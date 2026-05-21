import React, { useState, useEffect } from 'react';

export function EditableCell({ value, onSave, type = "text", className = "", placeholder = "" }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  useEffect(() => { 
    setEditValue(value); 
  }, [value]);

  const handleSave = () => { 
    setIsEditing(false); 
    if (editValue !== value) onSave(editValue); 
  };

  const handleKeyDown = (e) => { 
    if (e.key === 'Enter' && type !== 'textarea') handleSave(); 
    if (e.key === 'Escape') { 
      setIsEditing(false); 
      setEditValue(value); 
    } 
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isEditing) {
    if (type === 'textarea') return (
      <textarea 
        autoFocus 
        value={editValue} 
        onChange={e => setEditValue(e.target.value)} 
        onBlur={handleSave} 
        onKeyDown={e => { if (e.key === 'Escape') handleSave() }} 
        className={`w-full p-1 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`} 
        rows={3} 
      />
    );
    
    if (type === 'select') {
      let options = placeholder === 'health' ? ['Green', 'Yellow', 'Red'] : ['Low', 'Medium', 'High', 'Ultra-High'];
      return (
        <select 
          autoFocus 
          value={editValue} 
          onChange={e => setEditValue(e.target.value)} 
          onBlur={handleSave} 
          className={`w-full p-0.5 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    
    return (
      <input 
        autoFocus 
        type={type} 
        value={editValue} 
        onChange={e => setEditValue(e.target.value)} 
        onBlur={handleSave} 
        onKeyDown={handleKeyDown} 
        className={`w-full p-0.5 text-[10px] border border-blue-500 rounded outline-none shadow-sm ${className}`} 
      />
    );
  }
  
  const displayValue = type === 'date' ? formatShortDate(value) : value;
  
  return (
    <div 
      className={`cursor-pointer hover:bg-slate-200 rounded px-1 -ml-1 inline-flex items-center group relative min-h-[16px] w-full ${className}`} 
      onClick={() => setIsEditing(true)} 
      title="Click to edit"
    >
      {displayValue || <span className="italic text-slate-400">{placeholder || 'Edit'}</span>}
      <i className="fas fa-pencil-alt text-[8px] text-slate-400 ml-1 opacity-0 group-hover:opacity-100 absolute right-0 bg-slate-200 pl-1"></i>
    </div>
  );
}