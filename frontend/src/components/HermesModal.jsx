import React, { useState, useRef, useEffect } from 'react';

const HermesModal = ({ projectId, isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm Hermes, your AI assistant for the Huawei Cloud ERP migration system. I can help you with RI reconciliation, ECS deployment tracking, cost optimization, and technical recommendations. What would you like to know about your project?",
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

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
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
          query: currentInput
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from Hermes');
      }
      
      // Add assistant response
      const assistantMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      // Add error message
      const errorMessage = {
        id: messages.length + 2,
        role: 'system',
        content: `Error: ${err.message || 'Failed to connect to Hermes'}`,
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
        content: "Hello! I'm Hermes, your AI assistant for the Huawei Cloud ERP migration system. I can help you with RI reconciliation, ECS deployment tracking, cost optimization, and technical recommendations. What would you like to know about your project?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <i className="fas fa-robot text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">Hermes AI Assistant</h2>
              <p className="text-sm text-purple-100">Conversational AI for Huawei Cloud ERP</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-sm bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <i className="fas fa-eraser mr-1"></i> Clear
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : msg.role === 'assistant'
                    ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                    : 'bg-red-50 border border-red-200 text-red-700 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {msg.role === 'user' ? (
                      <i className="fas fa-user text-sm"></i>
                    ) : msg.role === 'assistant' ? (
                      <i className="fas fa-robot text-sm"></i>
                    ) : (
                      <i className="fas fa-exclamation-triangle text-sm"></i>
                    )}
                    <span className="text-xs font-bold">
                      {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Hermes' : 'System'}
                    </span>
                  </div>
                  <span className="text-xs opacity-70">{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-white border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-robot text-sm text-purple-600"></i>
                  <span className="text-xs font-bold">Hermes</span>
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none pr-10"
                placeholder="Ask Hermes about your project... (Press Enter to send)"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <div className="absolute right-2 bottom-2 text-xs text-gray-400">
                {loading ? 'Hermes is thinking...' : 'Enter to send'}
              </div>
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-bold"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
            <div>
              <span className="font-medium">Project:</span> {projectId || 'Global'}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>You</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>Hermes AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HermesModal;