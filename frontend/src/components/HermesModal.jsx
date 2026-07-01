import React, { useState, useEffect, useRef } from 'react';
import TelegramWidget from './TelegramWidget';

const HermesModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('telegram'); // 'telegram' or 'api'
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "👋 **Welcome to Hermes AI!**\n\nYou have two ways to chat with me:\n\n**🤖 Telegram Widget (Recommended)**\n• Same interface as Telegram app\n• Full features: files, images, voice\n• Persistent chat history\n• Mobile notifications\n• Multi-device sync\n\n**⚡ API Chat (Fallback)**\n• Direct Hermes CLI connection\n• Works without Telegram\n• Limited to text only\n\nSwitch between tabs below ↓",
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

    const currentInput = input.trim();
    
    const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));
        
    conversationHistory.push({ role: 'user', content: currentInput });

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('erp_jwt_token');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const res = await fetch('/api/hermes-cli/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            query: currentInput,
            type: 'natural',
            projectId: 'global'
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to get response from Hermes');
        }
        
        let responseText = '';
        
        if (data.response) {
          responseText = data.response;
        } else if (data.data && Array.isArray(data.data)) {
          if (data.data.length === 0) {
            responseText = 'No data found.';
          } else if (data.type === 'direct_data') {
            const items = data.data;
            if (items[0]?.name && items[0]?.region) {
              responseText = `Found ${items.length} customers:\n`;
              items.forEach((item, i) => {
                responseText += `${i + 1}. ${item.name} (ID: ${item.id}, Region: ${item.region})\n`;
              });
            } else if (items[0]?.type) {
              responseText = `Found ${items.length} projects:\n`;
              items.forEach((item, i) => {
                const projData = item.data || {};
                const name = projData.name || item.id;
                const customer = projData.customer || projData.customerName || 'Unknown';
                responseText += `${i + 1}. ${name} (Customer: ${customer}, Type: ${item.type})\n`;
              });
            } else {
              responseText = `Found ${items.length} items:\n${JSON.stringify(items, null, 2)}`;
            }
          } else {
            responseText = JSON.stringify(data.data, null, 2);
          }
        } else {
          responseText = 'I received your query. For complex analysis, please try asking about specific data like "list customers" or "show projects".';
        }
        
        const assistantMessage = {
          id: messages.length + 2,
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Request timeout. The query is taking too long. Try a simpler question.');
        }
        throw err;
      }
    } catch (err) {
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

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: "Chat cleared. How can I help you?",
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-900 to-indigo-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <i className="fas fa-brain text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold">Hermes AI Assistant</h2>
              <p className="text-sm text-purple-200">Choose your chat interface</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href="/telegram-chat"
              target="_blank"
              className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center"
              title="Open Telegram Web App"
            >
              <i className="fab fa-telegram mr-2"></i>
              Open Telegram Web App
            </a>
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

        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-100 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'telegram'
                ? 'bg-white dark:bg-gray-900 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <i className="fab fa-telegram mr-2"></i>
            Telegram Widget
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'api'
                ? 'bg-white dark:bg-gray-900 border-b-2 border-purple-500 text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <i className="fas fa-code mr-2"></i>
            API Chat
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'telegram' ? (
            // Telegram Widget Tab
            <div className="h-full p-4">
              <TelegramWidget />
            </div>
          ) : (
            // API Chat Tab
            <div className="h-full flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                          : msg.role === 'assistant'
                          ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm'
                          : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {msg.role === 'user' ? (
                            <i className="fas fa-user text-sm"></i>
                          ) : msg.role === 'assistant' ? (
                            <i className="fas fa-robot text-sm text-purple-600 dark:text-purple-400"></i>
                          ) : (
                            <i className="fas fa-exclamation-triangle text-sm"></i>
                          )}
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            msg.role === 'assistant' ? 'text-purple-700 dark:text-purple-300' : 
                            msg.role === 'user' ? 'text-indigo-200' : 'text-rose-700 dark:text-rose-300'
                          }`}>
                            {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Hermes' : 'System Alert'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {msg.timestamp}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <i className="fas fa-robot text-sm text-purple-600 dark:text-purple-400"></i>
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Hermes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse delay-150"></div>
                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse delay-300"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message here... (Shift+Enter for new line)"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                      rows="2"
                      disabled={loading}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || loading}
                      className="absolute right-2 bottom-2 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      title="Send message"
                    >
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                  <span>
                    Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd> to send,{' '}
                    <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Shift+Enter</kbd> for new line
                  </span>
                  <span className="text-blue-500 dark:text-blue-400">
                    <i className="fas fa-info-circle mr-1"></i>
                    Switch to Telegram tab for full features
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