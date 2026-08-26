import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const STORAGE_PREFIX = 'erp_agent_history_';
const MAX_VISIBLE = 50; // Show last 50 messages, load more on scroll up

const HermesModal = ({ isOpen, onClose, projectId }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const socketRef = useRef(null);
  const loadingRef = useRef(false);
  const messagesRef = useRef([]);

  // Keep refs in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Storage key
  const storageKey = `${STORAGE_PREFIX}${projectId || 'global'}`;

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load history from localStorage on mount / project change
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setVisibleCount(MAX_VISIBLE);
        }
      } else {
        // First time — show welcome message
        setMessages([{
          id: 1, role: "assistant",
          content: "👋 **Welcome to ERP Agent!**\n\nI'm your AI assistant for the ERP Migration Factory — with **real tool access** to the system.\n\n**What I can do:**\n• 📊 Check project topology and resource state\n• 🚀 Run migration simulations (agentic dry-run)\n• 📋 View simulation traces and delivery reports\n• 🔧 List migration skills and knowledge tree\n• 📝 Update project phases and data (Engineer+)\n• 📈 Check system health (Admin)\n• 📋 View execution logs\n\n**Try asking:**\n- \"What's the topology of this project?\"\n- \"Run a simulation\"\n- \"List all projects\"",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }]);
      }
    } catch (e) { /* localStorage might be full or corrupted */ }
  }, [storageKey]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      // Only store last 200 messages to avoid localStorage limits
      const toStore = messages.slice(-200);
      localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch (e) { /* quota exceeded — silently skip */ }
  }, [messages, storageKey]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') { onClose(); setIsMinimized(false); } };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Initialize Socket.IO ONCE — don't disconnect on minimize or feature switch
  useEffect(() => {
    if (!isOpen) return;
    // Reuse existing socket if still connected
    if (socketRef.current && socketRef.current.connected) {
      setSocket(socketRef.current);
      return;
    }
    const socketInstance = io(window.location.origin, {
      transports: ["polling"],  // threading mode only supports polling
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      pingInterval: 25000,
      pingTimeout: 120000,
    });
    socketRef.current = socketInstance;
    setSocket(socketInstance);
    // DON'T disconnect on cleanup — only disconnect when modal is fully closed (onClose)
    // Socket persists across minimize/feature switches
  }, [isOpen]);

  // Disconnect socket only when modal is fully closed (not minimized)
  useEffect(() => {
    if (!isOpen && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Scroll handler — load more messages when scrolling to top
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 50 && visibleCount < messages.length) {
      const prevHeight = container.scrollHeight;
      setVisibleCount(prev => Math.min(prev + MAX_VISIBLE, messages.length));
      // Maintain scroll position after loading more
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - prevHeight;
        }
      });
    }
  }, [visibleCount, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !socketRef.current) return;

    const currentInput = input.trim();
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: currentInput,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const conversationHistory = messagesRef.current
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));
    conversationHistory.push({ role: "user", content: currentInput });

    const assistantMessageId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isStreaming: true,
      },
    ]);

    setInput("");
    setLoading(true);

    const sock = socketRef.current;
    sock.off("hermes_token");
    sock.off("hermes_done");
    sock.off("hermes_error");

    sock.on("hermes_token", (data) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMessageId) {
            return { ...msg, content: msg.content + data.text };
          }
          return msg;
        })
      );
    });

    sock.on("hermes_done", () => {
      setLoading(false);
      setMessages((prev) =>
        prev.map((msg) => msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg)
      );
    });

    sock.on("hermes_error", (data) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMessageId) {
            return { ...msg, content: `❌ **Error:** ${data.error || "Connection lost."}`, isStreaming: false };
          }
          return msg;
        })
      );
      setLoading(false);
    });

    sock.emit("hermes_query_stream", {
      query: currentInput,
      projectId: projectId || "global",
      messages: conversationHistory,
      token: sessionStorage.getItem('hermes_access_token') || '',
    });
  };

  // Render markdown
  const renderContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeLines = [];
    const elements = [];

    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${i}`} style={{
              background: '#0d1117', borderRadius: 6, padding: '12px 14px',
              overflowX: 'auto', margin: '8px 0', border: '1px solid #30363d',
              fontSize: isMobile ? 11 : 12, fontFamily: "'SF Mono', 'Fira Code', monospace", color: '#e6edf3',
            }}><code>{codeLines.join('\n')}</code></pre>
          );
          codeLines = [];
          inCodeBlock = false;
        } else { inCodeBlock = true; }
        return;
      }
      if (inCodeBlock) { codeLines.push(line); return; }

      let processed = line
        .replace(/`([^`]+)`/g, '<code style="background:#1f2937;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:0.85em;color:#e6edf3">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e6edf3">$1</strong>')
        .replace(/^\s*•\s/, '<span style="color:#818cf8">•</span> ');

      if (line.startsWith('### ')) {
        elements.push(<div key={`h3-${i}`} style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginTop: 8, marginBottom: 4 }}>{line.slice(4)}</div>);
      } else if (line.startsWith('## ')) {
        elements.push(<div key={`h2-${i}`} style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc', marginTop: 10, marginBottom: 4 }}>{line.slice(3)}</div>);
      } else if (line.startsWith('# ')) {
        elements.push(<div key={`h1-${i}`} style={{ fontSize: 15, fontWeight: 700, color: '#c7d2fe', marginTop: 12, marginBottom: 6 }}>{line.slice(2)}</div>);
      } else if (processed.trim()) {
        elements.push(<div key={`p-${i}`} style={{ margin: '2px 0' }} dangerouslySetInnerHTML={{ __html: processed }} />);
      } else {
        elements.push(<div key={`br-${i}`} style={{ height: 6 }} />);
      }
    });

    if (inCodeBlock && codeLines.length > 0) {
      elements.push(
        <pre key="code-final" style={{
          background: '#0d1117', borderRadius: 6, padding: '12px 14px',
          overflowX: 'auto', margin: '8px 0', border: '1px solid #30363d',
          fontSize: isMobile ? 11 : 12, fontFamily: "'SF Mono', 'Fira Code', monospace", color: '#e6edf3',
        }}><code>{codeLines.join('\n')}</code></pre>
      );
    }
    return elements;
  };

  if (!isOpen) return null;

  // Visible messages — show only the last N, load more on scroll up
  const visibleMessages = messages.slice(-visibleCount);
  const hasMore = visibleCount < messages.length;

  // Minimized floating badge
  if (isMinimized) {
    const lastMsg = messages[messages.length - 1];
    let statusText = loading ? 'Working...' : 'Idle';
    let statusIcon = 'fa-robot';
    if (loading && lastMsg && lastMsg.content) {
      const toolMatch = lastMsg.content.match(/⚙️ \*\*Executing:\*\* `([^`]+)`/);
      if (toolMatch) { statusText = toolMatch[1]; statusIcon = 'fa-cog fa-spin'; }
      else if (lastMsg.content.length > 0) { statusText = 'Typing...'; statusIcon = 'fa-keyboard'; }
    }

    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 30,
          background: 'linear-gradient(135deg, #161b22 0%, #1a1f2e 100%)',
          border: `1px solid ${loading ? '#818cf8' : '#30363d'}`,
          boxShadow: loading ? '0 4px 20px rgba(99,102,241,0.3)' : '0 4px 12px rgba(0,0,0,0.4)',
          cursor: 'pointer', animation: 'slideUp 0.3s ease',
          maxWidth: isMobile ? 'calc(100vw - 40px)' : 320,
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}>
          <i className={`fas ${statusIcon}`} style={{ color: '#fff', fontSize: 14 }} />
          {loading && (
            <div style={{
              position: 'absolute', top: -2, right: -2, width: 10, height: 10,
              borderRadius: '50%', background: '#fbbf24', border: '2px solid #161b22',
              animation: 'pulse 1.5s infinite',
            }} />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e6edf3', lineHeight: 1.2 }}>ERP Agent</div>
          <div style={{
            fontSize: 10, color: loading ? '#a5b4fc' : '#8b949e', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{statusText}</div>
        </div>
        {!loading && <i className="fas fa-chevron-up" style={{ color: '#484f58', fontSize: 11, flexShrink: 0 }} />}
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9998,
      }} />

      <div style={{
        position: 'fixed',
        top: isMobile ? 0 : '50%', left: isMobile ? 0 : '50%',
        right: isMobile ? 0 : 'auto', bottom: isMobile ? 0 : 'auto',
        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
        width: isMobile ? '100%' : 'min(900px, 92vw)',
        height: isMobile ? '100%' : 'min(700px, 88vh)',
        background: '#0d1117', borderRadius: isMobile ? 0 : 12,
        border: '1px solid #30363d',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(129,140,248,0.1)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
          @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #484f58; }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '10px 14px' : '12px 20px',
          background: 'linear-gradient(135deg, #161b22 0%, #1a1f2e 100%)',
          borderBottom: '1px solid #30363d', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            }}>
              <i className="fas fa-robot" style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', lineHeight: 1.2 }}>ERP Agent</div>
              <div style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.2 }}>
                {projectId && projectId !== 'global' ? `Project: ${projectId.substring(0, 12)}...` : 'Global Context'}
                {messages.length > 0 && ` · ${messages.length} msgs`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 12,
              background: loading ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.15)',
              border: `1px solid ${loading ? '#fbbf2440' : '#10b98140'}`,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: loading ? '#fbbf24' : '#10b981',
                animation: loading ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: loading ? '#fbbf24' : '#10b981' }}>
                {loading ? 'Working...' : 'Online'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize — agent keeps working in background"
                style={{
                  width: 30, height: 30, borderRadius: 6, border: 'none',
                  background: 'rgba(129,140,248,0.1)', color: '#818cf8',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="fas fa-window-minimize" style={{ fontSize: 11 }} />
              </button>
              <button
                onClick={() => { onClose(); setIsMinimized(false); }}
                title="Close"
                style={{
                  width: 30, height: 30, borderRadius: 6, border: 'none',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="fas fa-times" style={{ fontSize: 14 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            padding: isMobile ? '12px' : '20px', background: '#0d1117',
            scrollBehavior: 'auto',
          }}
        >
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '8px 0', color: '#484f58', fontSize: 10 }}>
              ↑ Scroll up to load {messages.length - visibleCount} older messages
            </div>
          )}
          {visibleMessages.map((msg) => (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12, animation: 'slideIn 0.3s ease',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 7,
                  background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginRight: isMobile ? 8 : 10,
                }}>
                  <i className="fas fa-robot" style={{ color: '#fff', fontSize: isMobile ? 11 : 13 }} />
                </div>
              )}
              <div style={{
                maxWidth: isMobile ? '82%' : '75%',
                padding: isMobile ? '10px 12px' : '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                  : '#161b22',
                border: msg.role === 'user' ? 'none' : '1px solid #30363d',
                color: msg.role === 'user' ? '#fff' : '#c9d1d9',
                fontSize: isMobile ? 12 : 13, lineHeight: 1.6, wordBreak: 'break-word',
                boxShadow: msg.role === 'user' ? '0 2px 8px rgba(99,102,241,0.2)' : 'none',
              }}>
                <div style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.6 }}>
                  {msg.isStreaming && !msg.content && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8', animation: 'bounce 1.4s infinite' }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8', animation: 'bounce 1.4s infinite 0.2s' }} />
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8', animation: 'bounce 1.4s infinite 0.4s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#8b949e', fontStyle: 'italic' }}>Processing your request...</span>
                    </div>
                  )}
                  {msg.isStreaming && msg.content && msg.content.includes('⚙️') && !msg.content.includes('\n\n', msg.content.indexOf('⚙️') + 3) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <i className="fas fa-cog fa-spin" style={{ color: '#818cf8', fontSize: 12 }} />
                      <span style={{ fontSize: 11, color: '#a5b4fc' }}>
                        {msg.content.match(/⚙️ \*\*Executing:\*\* `([^`]+)`/)?.[1] || 'Calling ERP API...'}
                      </span>
                    </div>
                  )}
                  {renderContent(msg.content)}
                  {msg.isStreaming && msg.content && (
                    <span style={{
                      display: 'inline-block', width: 8, height: 14,
                      background: '#818cf8', borderRadius: 1, marginLeft: 2,
                      animation: 'blink 1s infinite', verticalAlign: 'text-bottom',
                    }} />
                  )}
                </div>
                <div style={{
                  fontSize: 9, color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : '#484f58',
                  marginTop: 4, textAlign: 'right',
                }}>{msg.timestamp}</div>
              </div>
              {msg.role === 'user' && (
                <div style={{
                  width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 7,
                  background: '#30363d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginLeft: isMobile ? 8 : 10,
                }}>
                  <i className="fas fa-user" style={{ color: '#8b949e', fontSize: isMobile ? 11 : 13 }} />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: isMobile ? '10px 12px' : '14px 20px',
          background: '#161b22', borderTop: '1px solid #30363d', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: isMobile ? 8 : 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Ask the ERP Agent anything..."
                disabled={loading}
                rows={1}
                style={{
                  width: '100%', minHeight: isMobile ? 38 : 42, maxHeight: 120,
                  padding: isMobile ? '9px 12px' : '10px 14px',
                  fontSize: isMobile ? 13 : 14, background: '#0d1117',
                  border: '1px solid #30363d', borderRadius: 10,
                  color: '#e6edf3', resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#30363d'}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: 10,
                border: 'none',
                background: input.trim() && !loading ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#21262d',
                color: input.trim() && !loading ? '#fff' : '#484f58',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: input.trim() && !loading ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
              }}
            >
              {loading ? <i className="fas fa-spinner fa-spin" style={{ fontSize: 15 }} /> : <i className="fas fa-paper-plane" style={{ fontSize: 14 }} />}
            </button>
          </div>
          <div style={{ fontSize: 9, color: '#484f58', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span><kbd style={{ background: '#21262d', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>Enter</kbd> to send</span>
            <span><kbd style={{ background: '#21262d', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>Shift+Enter</kbd> for new line</span>
            <span>·</span>
            <span>History saved per project</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default HermesModal;
