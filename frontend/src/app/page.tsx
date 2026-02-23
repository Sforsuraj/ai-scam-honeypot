'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Send, Bot, User, Phone, Mail, Link as LinkIcon, AlertTriangle, CheckCircle2, ShieldQuestion, MessageSquarePlus, MessageSquare, Menu, X } from 'lucide-react';

interface ExtractedData {
  upi?: string[];
  phones?: string[];
  emails?: string[];
  links?: string[];
  payment_requests?: string[];
  scam_type?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSessionInfo {
  id: string;
  title: string;
  is_scam: boolean;
  confidence: number;
}

export default function Home() {
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scamStatus, setScamStatus] = useState<string>('ONGOING');
  const [confidence, setConfidence] = useState<number>(0);
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all sessions on load
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('https://ai-scam-honeypot-6o4l.onrender.com/honeypot/sessions');
      const data = await res.json();
      setSessions(data.reverse()); // Show newest first
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`https://ai-scam-honeypot-6o4l.onrender.com/honeypot/session/${id}`);
      const data = await res.json();
      if (data.error) return;

      setSessionId(data.id);

      // Map history to ChatMessage format
      const formattedHistory: ChatMessage[] = data.history.map((msg: any, i: number) => ({
        id: `${Date.now()}-${i}`,
        role: msg.role,
        content: msg.content
      }));

      setMessages(formattedHistory);
      setScamStatus(data.is_scam ? 'SCAM_CONFIRMED' : 'ONGOING');
      setConfidence(data.confidence);
      setExtractedData(data.extracted || {});

      // On mobile, close sidebar after selecting
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setScamStatus('ONGOING');
    setConfidence(0);
    setExtractedData({});
    setInput('');
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the session when clicking delete

    // Optimistic UI update
    setSessions(prev => prev.filter(s => s.id !== id));

    // If the deleted session is currently open, clear it
    if (sessionId === id) {
      startNewChat();
    }

    try {
      await fetch(`https://ai-scam-honeypot-6o4l.onrender.com/honeypot/session/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
      // Revert optimism if failed
      fetchSessions();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('https://ai-scam-honeypot-6o4l.onrender.com/honeypot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.content,
        }),
      });

      const data = await response.json();

      const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, botMessage]);
      setSessionId(data.session_id);
      setScamStatus(data.scam_status);
      setConfidence(data.confidence);
      setExtractedData(data.extracted);

      // Refresh sidebar list if it's a new session, or update title
      if (!sessionId) {
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Connection error. Please try again.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getStatusColor = () => {
    if (scamStatus === 'SCAM_CONFIRMED') return 'text-red-400 border-red-500/30 bg-red-500/10 shadow-red-500/20';
    if (confidence > 0.5) return 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-amber-500/20';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-emerald-500/20';
  };

  const getStatusIcon = () => {
    if (scamStatus === 'SCAM_CONFIRMED') return <ShieldAlert className="w-6 h-6 text-red-400" />;
    if (confidence > 0.5) return <AlertTriangle className="w-6 h-6 text-amber-400" />;
    if (messages.length === 0) return <ShieldQuestion className="w-6 h-6 text-indigo-400" />;
    return <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-slate-950 font-sans text-slate-100 relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950/80 to-slate-950 -z-10" />

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* History Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:translate-x-0 absolute md:static z-30 w-72 h-full glass-panel border-r border-white/10 flex flex-col`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <button
            onClick={startNewChat}
            className="flex-1 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors font-medium text-sm shadow-lg shadow-indigo-500/20"
          >
            <MessageSquarePlus className="w-4 h-4" /> New Chat
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden ml-2 p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Chats</p>
          {sessions.length === 0 ? (
            <p className="text-slate-500 text-sm px-3 italic">No previous chats</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${sessionId === session.id
                  ? 'bg-white/10 border border-white/10'
                  : 'hover:bg-white/5 border border-transparent'
                  }`}
              >
                <div
                  className="flex-1 flex items-center gap-3 overflow-hidden cursor-pointer"
                  onClick={() => loadSession(session.id)}
                >
                  <div className={`p-1.5 rounded-lg ${session.is_scam ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 overflow-hidden pr-6">
                    <p className="text-sm font-medium truncate text-slate-200">{session.title}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      {session.is_scam ? <ShieldAlert className="w-3 h-3 text-red-500" /> : null}
                      {session.is_scam ? 'Scam Detected' : 'Analyzing...'}
                    </p>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                  title="Delete Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col h-full relative">
        {/* Chat Header */}
        <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className={`p-2 rounded-xl bg-indigo-500/20 text-indigo-400 hidden sm:block`}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                Honeypot Chat
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Engage to extract intel</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-6">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Shield className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to AI Honeypot</h2>
                <p className="text-slate-400">Start chatting to bait the potential scammer. The AI will automatically analyze the context and extract actionable intel.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-8 hidden sm:grid">
                <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                  <p className="text-sm">"Hello, I am calling from tech support. Your computer has a virus."</p>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                  <p className="text-sm">"I accidentally sent you money, please refund via UPI."</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed max-w-[85%] md:max-w-[75%] ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-900/20'
                      : 'bg-white/10 text-slate-200 rounded-tl-sm border border-white/5'
                      }`}
                  >
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 border border-white/10 text-slate-300">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 justify-start"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white/10 rounded-tl-sm border border-white/5 flex gap-1.5 items-center h-[52px]">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-950/80 backdrop-blur-md border-t border-white/10 mt-auto">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message to the scammer..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl w-14 flex items-center justify-center transition-colors shadow-lg"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
            <p className="text-center text-xs text-slate-500 mt-2">
              AI Honeypot automatically analyzes conversation context to extract valuable intelligence.
            </p>
          </div>
        </div>
      </section>

      {/* Side Intelligence Panel */}
      <aside className="w-80 hidden xl:flex flex-col border-l border-white/10 bg-slate-950/50 backdrop-blur-md">
        {/* Status Header */}
        <div className="p-5 border-b border-white/10">
          <h2 className="font-semibold text-slate-300 flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4" /> Live Analysis
          </h2>
          <div className={`p-4 rounded-xl border transition-all duration-500 ${getStatusColor()}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Alert Status</p>
                <h3 className="text-sm font-bold">{scamStatus.replace('_', ' ')}</h3>
              </div>
              {getStatusIcon()}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="opacity-80">Confidence</span>
                <span className="font-mono">{(confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${confidence > 0.7 ? 'bg-red-500' : confidence > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Extracted Intel Scrollable */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 pb-2 border-b border-white/5">
            <Phone className="w-4 h-4" /> Extracted Artifacts
          </h3>

          {/* Scam Type */}
          {(extractedData.scam_type && extractedData.scam_type !== "") && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Scam Classification</p>
              <div className="inline-block px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-300">
                {extractedData.scam_type}
              </div>
            </div>
          )}

          {/* UPI */}
          {extractedData.upi && extractedData.upi.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Payment IDs (UPI)</p>
              <div className="space-y-2">
                {extractedData.upi.map((v, i) => (
                  <div key={i} className="px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg text-sm font-mono text-slate-300 break-all select-all flex items-center justify-between group">
                    <span>{v}</span>
                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-red-400">Copy</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phones */}
          {extractedData.phones && extractedData.phones.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Phone Numbers</p>
              <div className="flex flex-wrap gap-2">
                {extractedData.phones.map((v, i) => (
                  <span key={i} className="px-3 py-1 bg-amber-500/5 border border-amber-500/10 rounded-full text-xs font-mono text-amber-200 select-all">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emails */}
          {extractedData.emails && extractedData.emails.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Email Addresses</p>
              <div className="space-y-2">
                {extractedData.emails.map((v, i) => (
                  <div key={i} className="px-3 py-2 bg-blue-500/5 border border-blue-500/10 rounded-lg text-sm text-slate-300 select-all">
                    {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {extractedData.links && extractedData.links.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase">URLs & Links</p>
              <div className="space-y-2">
                {extractedData.links.map((v, i) => (
                  <a key={i} href={v} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-sm text-indigo-300 hover:text-indigo-200 truncate transition-colors">
                    {v}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!extractedData.scam_type &&
            (!extractedData.upi?.length) &&
            (!extractedData.phones?.length) &&
            (!extractedData.emails?.length) &&
            (!extractedData.links?.length) &&
            (!extractedData.payment_requests?.length) && (
              <div className="text-center text-slate-500 text-sm py-12 space-y-3">
                <ShieldQuestion className="w-8 h-8 mx-auto opacity-20" />
                <p>Awaiting artifacts...</p>
              </div>
            )}
        </div>
      </aside>
    </main>
  );
}
