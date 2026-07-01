import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import TelegramWidget from './TelegramWidget';

const HermesModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('api'); // Set API Chat as default tab for enterprise co-pilot
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "👋 **Welcome to Hermes Agentic Engine Room!**\n\nI am connected directly into the local DeepSeek-v3.2 model and your enterprise server kernel over an active WebSocket socket layer. Timeouts have been fully removed.\n\nYou can ask me profound architectural questions, require extensive standard delivery methodology breakdowns, or command me to read code scripts and execute system commands in real time.\n\nHow can I guide your cloud infrastructure lifecycle operations right now?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize unified persistent TCP WebSocket session when component mounts
  useEffect(() => {
    if (!isOpen) return;

    // Connect to the host running the Flask server instance
    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5
    });

    setSocket(socketInstance);

    // Clean connection hooks when modal is minimized or destroyed
    return () => {
      socketInstance.disconnect();
    };
  }, [isOpen]);

  // Auto-scroll layout layer to bottom when messages stream tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !socket) return;

    const currentInput = input.trim();

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: currentInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Extract historical prompt sequences for context maintenance
    const conversationHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));
        
    conversationHistory.push({ role: 'user', content: currentInput });

    // Instantly commit user message and append placeholder for token streaming buffer
    const assistantMessageId = messages.length + 2;
    setMessages(prev => [
      ...prev, 
      userMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '', // Will fill up chunk by chunk as tokens arrive
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    setInput('');
    setLoading(true);

    // Purge historical listeners on this socket cycle to avoid packet duplication leaks
    socket.off('hermes_token');
    socket.off('hermes_done');
    socket.off('hermes_error');

    // Listener 1: Capture asynchronous execution stream fragments
    socket.on('hermes_token', (data) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === assistantMessageId) {
          return { ...msg, content: msg.content + data.text };
        }
        return msg;
      }));
    });

    // Listener 2: Clean stream teardown signature
    socket.on('hermes_done', () => {
      setLoading(false);
    });

    // Listener 3: Gracefully map stream exception boundaries
    socket.on('hermes_error', (data) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === assistantMessageId) {
          return { 
            ...msg, 
            role: 'system', 
            content: `❌ **Engine Interruption:** ${data.error || 'Connection to the AI execution worker lost.'}` 
          };
        }
        return msg;
      }));
      setLoading(false);
    });

    // Emit event payload to kick off the backend ReAct/Streaming loop
    socket.emit('hermes_query_stream', {
      query: currentInput,
      projectId: 'global',
      messages: conversationHistory
    });
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: "Chat logs purged from UI state memory. Ready for next operational query.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Advanced inline parser rendering server log text and raw code blocks natively
  const renderMessageContent = (content) => {
    if (!content) return null;
    
    const parts = content.split('```');
    return parts.map((part, index) => {
      // Every odd index denotes block arrays encapsulated inside backticks
      if (index % 2 !== 0) {
        const lines = part.split('\n');
        // Extract the code language identifier if present (e.g., 'bash', 'json', 'text')
        const language = lines[0].trim();
        const codeText = lines.length > 1 ? lines.slice(1).join('\n') : part;

        return (
          <div key={index} className="my-3 relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-gray-400 text-xxs px-2 py-0.5 rounded font-sans uppercase">
              {language || 'code'}
            </div>
            <pre className="bg-gray-950 text-green-400 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner border border-gray-800 custom-scrollbar leading-relaxed">
              <code>{codeText.trim()}</code>
            </pre>
          </div>
        );
      }
      
      // Basic fallback formatting block for standard markdown bold elements
      return (
        <span key={index} className="leading-relaxed font-sans text-sm">
          {part.split('**').map((subPart, subIdx) => 
            subIdx % 2 !== 0 ? <strong key={subIdx} className="font-bold text-indigo-900 dark:text-indigo-300">{subPart}</strong> : subPart
          )}
        </span>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Modal Branding Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-15 rounded-xl flex items-center justify-center border border-white border-opacity-10 animate-pulse">
              <i className="fas fa-microchip text-lg text-purple-300"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide">Hermes AI Autonomous Engine</h2>
              <p className="text-xs text-purple-200 font-medium">Alternative 1: High-Performance WebSocket Streaming Mode</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href="/telegram-chat"
              target="_blank"
              className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center shadow-sm"
              title="Open Telegram Web App Router"
            >
              <i className="fab fa-telegram mr-2 text-sm"></i>
              Open Telegram External
            </a>
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-xs bg-white bg-opacity-10 hover:bg-opacity-20 font-medium rounded-lg transition-colors border border-white border-opacity-10"
              title="Clear Local Screen Logs"
            >
              <i className="fas fa-eraser mr-1"></i> Clear Log
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 p-1 transition-colors"
              title="Minimize Assistant"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Real-time Layer Navigation Tabs */}
        <div className="flex border-b bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-3 px-4 text-center text-sm font-semibold tracking-wide transition-colors ${
              activeTab === 'api'
                ? 'bg-white dark:bg-gray-900 border-b-2 border-purple-600 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80'
            }`}
          >
            <i className="fas fa-terminal mr-2"></i>
            ERP Direct Co-Pilot (API Chat)
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-3 px-4 text-center text-sm font-semibold tracking-wide transition-colors ${
              activeTab === 'telegram'
                ? 'bg-white dark:bg-gray-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80'
            }`}
          >
            <i className="fab fa-telegram mr-2"></i>
            Telegram Integration Bridge
          </button>
        </div>

        {/* Operational Viewports */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'telegram' ? (
            <div className="h-full p-4 bg-gray-50 dark:bg-gray-950">
              <TelegramWidget />
            </div>
          ) : (
            <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
              {/* Asynchronous Message Streaming Terminal */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl p-4 shadow-sm border ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 dark:bg-indigo-700 border-transparent text-white rounded-br-none shadow-md'
                          : msg.role === 'assistant'
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-bl-none font-mono text-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 border-b border-gray-100 dark:border-gray-700 pb-1 text-xxs tracking-wider uppercase font-bold">
                        <div className="flex items-center space-x-1.5">
                          {msg.role === 'user' ? (
                            <i className="fas fa-user-shield text-indigo-200"></i>
                          ) : msg.role === 'assistant' ? (
                            <i className="fas fa-robot text-purple-500"></i>
                          ) : (
                            <i className="fas fa-exclamation-triangle text-rose-500"></i>
                          )}
                          <span className={msg.role === 'user' ? 'text-indigo-200' : msg.role === 'assistant' ? 'text-purple-600 dark:text-purple-400' : 'text-rose-500'}>
                            {msg.role === 'user' ? 'Operator' : msg.role === 'assistant' ? 'Hermes' : 'Kernel Error'}
                          </span>
                        </div>
                        <span className={msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}>
                          {msg.timestamp}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap">
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Real-time thinking animation loop */}
                {loading && !messages[messages.length - 1]?.content && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex items-center space-x-3">
                      <i className="fas fa-brain fa-spin text-purple-600 dark:text-purple-400 text-sm"></i>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-widest">STREAMING FROM DEEPSEEK KERNEL...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Secure Command Line & Textarea Block */}
              <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 shadow-xl">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Input operational objectives or complex systems code queries... (Shift+Enter for newline)"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-white font-sans text-sm resize-none custom-scrollbar"
                      rows="2"
                      disabled={loading || !socket}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || loading || !socket}
                      className="absolute right-2 bottom-3 p-2.5 bg-gradient-to-tr from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md"
                      title="Transmit Stream Instruction"
                    >
                      <i className={`fas ${loading ? 'fa-circle-notch fa-spin' : 'fa-terminal'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xxs text-gray-400 dark:text-gray-500 flex justify-between font-medium">
                  <span>
                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-sans border dark:border-gray-700 shadow-xs">Enter</kbd> to transmit payload,{' '}
                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-sans border dark:border-gray-700 shadow-xs">Shift + Enter</kbd> to write code/newlines.
                  </span>
                  <span className="text-purple-500 dark:text-purple-400 flex items-center">
                    <i className="fas fa-lock mr-1"></i> Asynchronous Local Sandbox Session
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HermesModal;
