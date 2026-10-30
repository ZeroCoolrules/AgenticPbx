import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Sparkles,
  Bot,
  User,
  Phone,
  Building,
  CheckCircle2,
  Calendar,
  Clock,
  Radio,
  Copy,
  Check,
  Zap,
  Sliders,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
} from 'lucide-react';
import { SMSThread, SMSMessage } from '../types/index.ts';
import { safeFetchJson } from '../utils/api.ts';

export const SMSConversationsView: React.FC = () => {
  const [threads, setThreads] = useState<SMSThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'autonomous' | 'manual' | 'unread'>('all');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simulatedText, setSimulatedText] = useState('Can you send over details on enterprise pricing for 50 users?');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // New thread form state
  const [newCustomerPhone, setNewCustomerPhone] = useState('+1 (555) 678-4321');
  const [newCustomerName, setNewCustomerName] = useState('Jordan Taylor');
  const [newCustomerCompany, setNewCustomerCompany] = useState('Nexus Cloud Group');
  const [newInitialMsg, setNewInitialMsg] = useState('Hi Jordan, thanks for requesting information about DialWise AI PBX.');
  const [newAutonomous, setNewAutonomous] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads list
  const fetchThreads = async () => {
    const res = await safeFetchJson<SMSThread[]>('/api/sms/threads');
    if (res.ok && res.data) {
      setThreads(res.data);
      if (!selectedThreadId && res.data.length > 0) {
        setSelectedThreadId(res.data[0].id);
      }
    }
  };

  // Fetch active thread messages
  const fetchActiveThreadMessages = async (threadId: string) => {
    setIsLoadingMessages(true);
    const res = await safeFetchJson<{ thread: SMSThread; messages: SMSMessage[] }>(`/api/sms/threads/${threadId}`);
    if (res.ok && res.data) {
      setMessages(res.data.messages);
      // Update thread in local state if unread was cleared
      setThreads(prev => prev.map(t => (t.id === threadId ? { ...t, unreadCount: 0 } : t)));
    }
    setIsLoadingMessages(false);
  };

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      fetchActiveThreadMessages(selectedThreadId);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

  // Filtered threads
  const filteredThreads = threads.filter(t => {
    const matchesSearch =
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerNumber.includes(searchQuery) ||
      (t.customerCompany && t.customerCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesMode = true;
    if (filterMode === 'autonomous') matchesMode = t.autonomousMode === true;
    if (filterMode === 'manual') matchesMode = t.autonomousMode === false;
    if (filterMode === 'unread') matchesMode = t.unreadCount > 0;

    return matchesSearch && matchesMode;
  });

  // Send manual operator message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedThreadId) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');

    try {
      const res = await fetch(`/api/sms/threads/${selectedThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });

      if (res.ok) {
        const newMsg: SMSMessage = await res.json();
        setMessages(prev => [...prev, newMsg]);
        fetchThreads();
      }
    } catch (err) {
      console.warn('Failed to send SMS:', err);
    }
  };

  // Toggle Autonomous Mode for the active thread
  const handleToggleAutonomous = async () => {
    if (!selectedThread) return;
    const nextMode = !selectedThread.autonomousMode;

    try {
      const res = await fetch(`/api/sms/threads/${selectedThread.id}/autonomous`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autonomousMode: nextMode }),
      });

      if (res.ok) {
        setThreads(prev => prev.map(t => (t.id === selectedThread.id ? { ...t, autonomousMode: nextMode } : t)));
      }
    } catch (err) {
      console.warn('Failed to toggle autonomous mode:', err);
    }
  };

  // Request AI Draft suggestion for human review
  const handleGenerateAISuggestion = async () => {
    if (!selectedThreadId) return;
    setIsSuggesting(true);

    try {
      const res = await safeFetchJson<{ suggestedText: string }>(`/api/sms/threads/${selectedThreadId}/suggest`, {
        method: 'POST',
      });

      if (res.ok && res.data?.suggestedText) {
        setInputMessage(res.data.suggestedText);
      }
    } catch (err) {
      console.warn('Failed to get AI draft:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  // Simulate incoming customer SMS test
  const handleSimulateCustomerInbound = async () => {
    if (!selectedThreadId || !simulatedText.trim()) return;

    try {
      const res = await fetch('/api/sms/test-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedThreadId,
          text: simulatedText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.customerMsg) {
          setMessages(prev => {
            const next = [...prev, data.customerMsg];
            if (data.aiReply) next.push(data.aiReply);
            return next;
          });
        }
        setIsSimulateModalOpen(false);
        fetchThreads();
      }
    } catch (err) {
      console.warn('Failed to simulate customer text:', err);
    }
  };

  // Create new SMS thread
  const handleCreateNewThread = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sms/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerNumber: newCustomerPhone,
          customerName: newCustomerName,
          customerCompany: newCustomerCompany,
          initialMessage: newInitialMsg,
          autonomousMode: newAutonomous,
        }),
      });

      if (res.ok) {
        const created: SMSThread = await res.json();
        setIsNewModalOpen(false);
        await fetchThreads();
        setSelectedThreadId(created.id);
      }
    } catch (err) {
      console.warn('Failed to create thread:', err);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/sms/webhook/twilio`
    : '/api/sms/webhook/twilio';

  return (
    <div className="space-y-6">
      {/* Top SMS Hub Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Two-Way SMS &amp; Autonomous Dispatch Hub</span>
            </span>
            <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Carrier SMS Gateway Active</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Customer SMS Communications &amp; Autonomous AI SDR
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Send and receive text messages directly with customers. Enable independent autonomous AI mode
            to have Marcus (AI SDR) auto-qualify BANT and book meetings 24/7, or take over manually at any moment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer Text</span>
          </button>
        </div>
      </div>

      {/* Main Three-Column Messaging Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        {/* Left Column: Thread List (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
          {/* Search & Filters */}
          <div className="space-y-3 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers, phones, texts..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'autonomous', label: 'Autonomous AI' },
                  { id: 'manual', label: 'Manual' },
                  { id: 'unread', label: 'Unread' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    filterMode === f.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredThreads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
                <p className="text-xs font-semibold text-slate-300">No conversations found</p>
                <p className="text-[11px] text-slate-500 mt-1">Start a new thread or adjust your search filter.</p>
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = selectedThreadId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="truncate max-w-[170px]">
                        <span className="font-bold text-xs text-white block truncate">{t.customerName}</span>
                        <span className="text-[10px] text-slate-400 truncate block">{t.customerCompany || t.customerNumber}</span>
                      </div>

                      <div className="flex flex-col items-end space-y-1 shrink-0">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(t.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {t.unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                            {t.unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-1 mb-2">
                      {t.lastMessageText}
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800/80">
                      {t.autonomousMode ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                          <Bot className="w-3 h-3 text-emerald-400" />
                          <span>Autonomous AI Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-400 font-semibold">
                          <User className="w-3 h-3 text-amber-400" />
                          <span>Manual Control</span>
                        </span>
                      )}

                      <span className="text-slate-500 font-mono">
                        DID: {t.assignedDid.slice(-8)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Conversation Feed & Controls (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
          {selectedThread ? (
            <>
              {/* Conversation Header */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">{selectedThread.customerName}</h3>
                    <span className="text-xs text-slate-400 font-mono">{selectedThread.customerNumber}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectedThread.customerCompany || 'Direct Client'} • Routing through DID {selectedThread.assignedDid}
                  </p>
                </div>

                {/* Autonomous Mode Toggle Switch */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleAutonomous}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      selectedThread.autonomousMode
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                    }`}
                    title={
                      selectedThread.autonomousMode
                        ? 'AI answers incoming SMS autonomously. Click to take over manually.'
                        : 'Manual takeover mode. Click to re-enable autonomous AI replies.'
                    }
                  >
                    {selectedThread.autonomousMode ? (
                      <>
                        <Bot className="w-3.5 h-3.5 text-emerald-400" />
                        <span>AI Auto-Reply: ON</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Manual Takeover</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Simulator Bar */}
              <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Test Inbound Customer Text:</span>
                </span>
                <button
                  onClick={() => setIsSimulateModalOpen(true)}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center space-x-1"
                >
                  <span>Simulate Text from Customer</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/30">
                {isLoadingMessages ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2 text-indigo-400" />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 text-center p-6">
                    <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
                    <span>No messages exchanged yet in this thread.</span>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isFromCustomer = m.direction === 'inbound';
                    const isAutonomousAI = m.senderType === 'ai_autonomous';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isFromCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1 px-1">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {m.senderName || (isFromCustomer ? selectedThread.customerName : 'Agent')}
                          </span>
                          {isAutonomousAI && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold">
                              <Bot className="w-2.5 h-2.5 text-indigo-400" />
                              <span>Autonomous</span>
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            isFromCustomer
                              ? 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/60'
                              : isAutonomousAI
                              ? 'bg-gradient-to-r from-indigo-950/70 to-purple-950/70 text-slate-100 rounded-tr-sm border border-indigo-500/40 shadow-sm'
                              : 'bg-indigo-600 text-white rounded-tr-sm shadow-md'
                          }`}
                        >
                          <p>{m.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose Bar with AI Draft Co-pilot */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-slate-400">
                    Sending as: <strong className="text-white">You (Human Operator)</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateAISuggestion}
                    disabled={isSuggesting}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isSuggesting ? 'animate-spin' : ''}`} />
                    <span>{isSuggesting ? 'Generating Draft...' : 'Suggest AI Reply'}</span>
                  </button>
                </div>

                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type an SMS reply to customer..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all"
                    title="Send SMS to customer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-indigo-400" />
              <p className="text-sm font-semibold text-slate-300">Select a conversation thread</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                View message logs, toggle autonomous SDR replies, or send direct text messages to customers.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Lead Info, BANT & Carrier Webhook (3 Cols) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full overflow-y-auto space-y-4">
          {selectedThread ? (
            <>
              {/* Contact Profile */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-xs">
                    {selectedThread.customerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{selectedThread.customerName}</h4>
                    <p className="text-[11px] text-slate-400">{selectedThread.customerCompany || 'Direct Client'}</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono text-slate-200">{selectedThread.customerNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">DID Assigned:</span>
                    <span className="font-mono text-indigo-400">{selectedThread.assignedDid}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="capitalize font-semibold text-emerald-400">
                      {selectedThread.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* BANT Qualification Score */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>BANT Qualification</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {selectedThread.bantScore || 65}/100
                  </span>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                    style={{ width: `${selectedThread.bantScore || 65}%` }}
                  />
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Autonomous SDR extracts budget, timeline, and decision maker signals from customer SMS conversations in real-time.
                </p>
              </div>

              {/* Live PSTN Carrier SMS Webhook Configuration */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real Carrier SMS Webhook</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Attach your real Twilio or Telnyx number to route live customer SMS into this engine:
                </p>

                <div className="p-2 rounded bg-slate-900 border border-slate-700/80 font-mono text-[10px] text-slate-200 select-all break-all">
                  {webhookUrl}
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1 border border-slate-700 transition-colors"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copied URL!' : 'Copy Webhook URL'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 text-center py-10">
              No thread selected.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: New Outbound Customer Text */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Start New Customer SMS</span>
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewThread} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer E.164 Mobile Number</label>
                <input
                  type="text"
                  required
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer / Contact Name</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="e.g. Jordan Taylor"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={newCustomerCompany}
                  onChange={(e) => setNewCustomerCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="e.g. Nexus Cloud Group"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial Outbound Message</label>
                <textarea
                  rows={3}
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Hi, thanks for reaching out..."
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="newAutonomous"
                  checked={newAutonomous}
                  onChange={(e) => setNewAutonomous(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="newAutonomous" className="text-xs text-slate-300">
                  Enable Autonomous AI Auto-Reply (AI SDR will reply independently)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                >
                  Send &amp; Create Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Simulate Inbound Customer Text */}
      {isSimulateModalOpen && selectedThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Simulate Inbound Customer SMS</span>
              </h3>
              <button
                onClick={() => setIsSimulateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Send a test SMS from <strong>{selectedThread.customerName}</strong> ({selectedThread.customerNumber}) to test how the system handles incoming texts:
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">Customer Message Text:</label>
              <textarea
                rows={3}
                value={simulatedText}
                onChange={(e) => setSimulatedText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Quick Test Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'What is your pricing for 40 seats?',
                  'Can we schedule a demo this Thursday at 2 PM?',
                  'Our PBX latency is too high, who do I talk to?',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSimulatedText(preset)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700"
                  >
                    "{preset.slice(0, 30)}..."
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              Current Thread Mode:{' '}
              {selectedThread.autonomousMode ? (
                <strong className="text-emerald-400">Autonomous AI Mode (AI will reply independently immediately)</strong>
              ) : (
                <strong className="text-amber-400">Manual Control Mode (Text will wait for your response)</strong>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSimulateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulateCustomerInbound}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
              >
                Simulate Customer Inbound
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
