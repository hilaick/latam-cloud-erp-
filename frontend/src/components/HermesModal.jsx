import React, { useState, useRef, useEffect } from 'react';

const HermesModal = ({ projectId, isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm Hermes, your AI assistant powered by DeepSeek. I am securely connected to the ERP context. How can I assist your delivery today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // 🚨 1. Build the chat history BEFORE updating state
    const currentInput = input.trim();
    
    // Filter out system errors, we only want to send valid conversation history to the LLM
    const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));
        
    // Append the message we are about to send
    conversationHistory.push({ role: 'user', content: currentInput });

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('erp_jwt_token');
      const res = await fetch('/api/hermes/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          projectId,
          messages: conversationHistory // 🚨 2. Send the ENTIRE history to the backend proxy
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from Hermes');
      }
      
      const assistantMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        id: messages.length + 2,
        role: 'system',
        content: `Error: ${err.message || 'Failed to connect to Hermes Backend'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Hermes query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: "Memory cleared. How can I help you?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-900 to-indigo-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <i className="fas fa-brain text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">Hermes Local Agent</h2>
              <p className="text-sm text-purple-200">DeepSeek v3.2 Core connected to ERP</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-sm bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <i className="fas fa-eraser mr-1"></i> Clear Context
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 p-1"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                    : msg.role === 'assistant'
                    ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                    : 'bg-rose-50 border border-rose-200 text-rose-700 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {msg.role === 'user' ? (
                      <i className="fas fa-user text-sm"></i>
                    ) : msg.role === 'assistant' ? (
                      <i className="fas fa-robot text-sm text-purple-600"></i>
                    ) : (
                      <i className="fas fa-exclamation-triangle text-sm"></i>
                    )}
                    <span className={`text-xs font-black uppercase tracking-wider ${msg.role === 'assistant' && 'text-purple-700'}`}>
                      {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Hermes' : 'System Alert'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold opacity-50">{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
  {msg.content.split('```').map((part, index) => {
    // Every odd index is inside a markdown code block (```)
    if (index % 2 !== 0) {
      // Remove the language identifier (like 'text' or 'bash') from the first line
      const lines = part.split('\n');
      const code = lines.length > 1 ? lines.slice(1).join('\n') : part;
      return (
        <div key={index} className="my-3 bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto shadow-inner border border-gray-700">
          {code}
        </div>
      );
    }
    return <span key={index}>{part}</span>;
  })}
</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-white border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-robot text-sm text-purple-600"></i>
                  <span className="text-xs font-bold text-purple-700">Hermes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-white">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <textarea
                className="w-full p-3 pl-4 pr-12 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-indigo-500 resize-none transition-colors text-sm"
                placeholder="Ask Hermes to analyze project matrices or write local code..."
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center transition-transform active:scale-95 shadow-md"
            >
              {loading ? <i className="fas fa-circle-notch fa-spin text-xl"></i> : <i className="fas fa-paper-plane text-xl"></i>}
            </button>
          </div>
          <div className="mt-3 text-[10px] font-bold text-slate-400 flex items-center justify-between uppercase tracking-widest">
            <div>
              <span className="text-slate-600">Context Loaded:</span> {projectId && projectId !== 'none' ? `Project ID [${projectId}]` : 'Global Mode'}
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Local Agent Connected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HermesModal;
