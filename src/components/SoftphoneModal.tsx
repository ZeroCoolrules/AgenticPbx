import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  ArrowRightLeft,
  Grid,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Calendar,
  X,
  User,
  Building,
  Radio,
  Clock,
  Flame,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { useCall } from '../context/CallContext.tsx';
import { playDTMFTone } from '../utils/audio.ts';

export const SoftphoneModal: React.FC = () => {
  const {
    activeCall,
    isCallModalOpen,
    isDialpadOpen,
    closeCallModal,
    closeDialpad,
    isMuted,
    isOnHold,
    isAgentSpeaking,
    isListening,
    speechInputText,
    setSpeechInputText,
    initiateInboundCall,
    initiateOutboundCall,
    sendMessage,
    toggleMute,
    toggleHold,
    transferCall,
    pressDTMF,
    endCall,
    startVoiceRecognition,
    stopVoiceRecognition,
  } = useCall();

  const [typedMessage, setTypedMessage] = useState('');
  const [dialerInput, setDialerInput] = useState('+1 (555) 019-4821');
  const [showTransferDropdown, setShowTransferDropdown] = useState(false);
  const [showKeypadOverlay, setShowKeypadOverlay] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Call duration counter
  useEffect(() => {
    let timer: any = null;
    if (activeCall && activeCall.status === 'connected') {
      const startMs = new Date(activeCall.startTime).getTime();
      timer = setInterval(() => {
        setCallDuration(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCall?.transcript, activeCall?.toolExecutions]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedMessage.trim()) return;
    const msg = typedMessage;
    setTypedMessage('');
    await sendMessage(msg);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isCallModalOpen && !isDialpadOpen) {
    return null;
  }

  const isCallActive = activeCall && activeCall.status !== 'completed';

  const dialpadKeys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
    { num: '*', sub: '' },
    { num: '0', sub: '+' },
    { num: '#', sub: '' },
  ];

  const quickPrompts = [
    'We need to replace our PBX for 80 inside sales reps with a $50k budget.',
    'Yes, that sounds great. Let us book a demo for Thursday at 2 PM EST.',
    'What does your pricing look like for an enterprise setup?',
    'Could you connect me with Technical Support regarding SIP latency?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Softphone Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isCallActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {isCallActive ? 'DialWise AI WebRTC Softphone' : 'DialWise PBX Virtual Phone'}
                </h3>
                {isCallActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE {formatSeconds(callDuration)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isCallActive
                  ? `${activeCall?.direction === 'inbound' ? 'Inbound Call on DID ' : 'Outbound Call via DID '} ${activeCall?.didNumber} (Ext ${activeCall?.extension})`
                  : 'SIP Trunk Connected • Ready for Calls'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                closeCallModal();
                closeDialpad();
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content View: In-Call vs Dialer */}
        {isCallActive ? (
          /* ACTIVE CALL INTERFACE */
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Top Agent Status Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 px-5 py-3 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center overflow-hidden">
                      <Bot className="w-6 h-6 text-indigo-300" />
                    </div>
                    {isAgentSpeaking && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] text-white items-center justify-center font-bold">
                          <Volume2 className="w-2.5 h-2.5" />
                        </span>
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-white">
                        {activeCall.agentId.includes('marcus')
                          ? 'Marcus (AI SDR Specialist)'
                          : activeCall.agentId.includes('sophia')
                          ? 'Sophia (AI Receptionist)'
                          : activeCall.agentId.includes('david')
                          ? 'David (AI Tech Support)'
                          : 'Apex AI Voice Agent'}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        Ext {activeCall.extension}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                      <span>Caller: {activeCall.callerName || activeCall.callerNumber}</span>
                      <span>•</span>
                      <span className="capitalize text-emerald-400">
                        {isAgentSpeaking ? 'Agent Speaking...' : isOnHold ? 'Call On Hold' : 'Listening to caller'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live BANT Score & Sentiment Badge */}
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-slate-400">BANT Qualification:</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        activeCall.qualificationScore >= 65
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : activeCall.qualificationScore >= 40
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {activeCall.qualificationScore}/100
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="text-slate-400">Sentiment:</span>
                    <span
                      className={`font-semibold capitalize px-1.5 py-0.2 rounded ${
                        activeCall.sentiment === 'positive'
                          ? 'text-emerald-400 bg-emerald-950/60'
                          : activeCall.sentiment === 'critical'
                          ? 'text-rose-400 bg-rose-950/60'
                          : 'text-slate-300 bg-slate-800'
                      }`}
                    >
                      {activeCall.sentiment}
                    </span>
                  </div>
                </div>
              </div>

              {/* On Hold Notification */}
              {isOnHold && (
                <div className="mt-2 py-1 px-3 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center justify-between">
                  <span>Call is currently ON HOLD. Comfort audio active for caller.</span>
                  <button
                    onClick={toggleHold}
                    className="underline text-amber-200 font-semibold hover:text-white"
                  >
                    Resume Call
                  </button>
                </div>
              )}
            </div>

            {/* Live Waveform Indicator */}
            <div className="h-6 bg-slate-950/60 px-5 flex items-center justify-between border-b border-slate-800/40 text-[10px] text-slate-400">
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Full-Duplex Web Audio Stream</span>
              </div>
              <div className="flex items-center space-x-1 h-3">
                {[...Array(16)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-0.5 bg-indigo-500 rounded-full transition-all duration-150 ${
                      isAgentSpeaking || isListening
                        ? 'animate-pulse'
                        : 'opacity-30'
                    }`}
                    style={{
                      height: isAgentSpeaking
                        ? `${Math.sin(i * 0.8 + Date.now() * 0.005) * 8 + 10}px`
                        : isListening
                        ? '8px'
                        : '3px',
                    }}
                  />
                ))}
              </div>
              <span>Latency: 32ms</span>
            </div>

            {/* Transcript & Tool Execution Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/60">
              {activeCall.transcript.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="text-center my-2">
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isAgent = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-2.5 ${isAgent ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAgent && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-indigo-300" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isAgent
                          ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-sm'
                          : 'bg-indigo-600 text-white rounded-tr-sm shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-[10px] opacity-70">
                        <span className="font-semibold">
                          {isAgent
                            ? activeCall.agentId.includes('marcus')
                              ? 'Marcus (AI SDR)'
                              : activeCall.agentId.includes('sophia')
                              ? 'Sophia (Receptionist)'
                              : 'AI Agent'
                            : activeCall.callerName || 'You (Caller)'}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                    {!isAgent && (
                      <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-slate-200">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Display recent tool executions in real time */}
              {activeCall.toolExecutions && activeCall.toolExecutions.length > 0 && (
                <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
                  <div className="flex items-center space-x-1.5 text-indigo-300 font-semibold mb-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Autonomous SDR Tool Executions</span>
                  </div>
                  <div className="space-y-1">
                    {activeCall.toolExecutions.slice(-3).map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded text-[11px] border border-slate-800"
                      >
                        <div className="flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="font-mono text-slate-200">{tool.summary}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{tool.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0">Try Asking:</span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(p)}
                  className="shrink-0 text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded-md border border-slate-700/60 transition-colors"
                >
                  "{p.slice(0, 32)}..."
                </button>
              ))}
            </div>

            {/* Text & Speech Input Bar */}
            <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopVoiceRecognition();
                  } else {
                    startVoiceRecognition();
                  }
                }}
                className={`p-2 rounded-xl text-white transition-all ${
                  isListening
                    ? 'bg-rose-600 animate-pulse ring-2 ring-rose-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={isListening ? 'Stop listening' : 'Start microphone speech input'}
              >
                {isListening ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={typedMessage || speechInputText}
                onChange={(e) => {
                  setTypedMessage(e.target.value);
                  setSpeechInputText('');
                }}
                placeholder={isListening ? 'Listening to your speech... (or type here)' : 'Type your message to the AI agent...'}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <button
                type="submit"
                disabled={!typedMessage.trim() && !speechInputText.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* In-Call Phone Control Actions */}
            <div className="bg-slate-950 px-4 py-3 border-t border-slate-800/80 flex items-center justify-around relative">
              {/* Mute */}
              <button
                onClick={toggleMute}
                className={`flex flex-col items-center space-y-1 text-[11px] ${
                  isMuted ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isMuted ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </div>
                <span>{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              {/* Hold */}
              <button
                onClick={toggleHold}
                className={`flex flex-col items-center space-y-1 text-[11px] ${
                  isOnHold ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isOnHold ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {isOnHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </div>
                <span>{isOnHold ? 'Resume' : 'Hold'}</span>
              </button>

              {/* Keypad DTMF */}
              <button
                onClick={() => setShowKeypadOverlay(!showKeypadOverlay)}
                className={`flex flex-col items-center space-y-1 text-[11px] ${
                  showKeypadOverlay ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    showKeypadOverlay ? 'bg-indigo-600/30 border border-indigo-500/50' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </div>
                <span>Keypad</span>
              </button>

              {/* Transfer */}
              <button
                onClick={() => setShowTransferDropdown(!showTransferDropdown)}
                className={`flex flex-col items-center space-y-1 text-[11px] ${
                  showTransferDropdown ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    showTransferDropdown ? 'bg-indigo-600/30 border border-indigo-500/50' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <span>Transfer</span>
              </button>

              {/* End Call */}
              <button
                onClick={endCall}
                className="flex flex-col items-center space-y-1 text-[11px] text-rose-400 hover:text-rose-300"
              >
                <div className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
                  <PhoneOff className="w-5 h-5" />
                </div>
                <span className="font-semibold text-rose-400">End Call</span>
              </button>

              {/* Keypad Overlay */}
              {showKeypadOverlay && (
                <div className="absolute bottom-20 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl z-30 grid grid-cols-3 gap-2 w-56">
                  {dialpadKeys.map((k) => (
                    <button
                      key={k.num}
                      onClick={() => pressDTMF(k.num)}
                      className="h-10 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold rounded-lg text-sm flex items-center justify-center border border-slate-700"
                    >
                      {k.num}
                    </button>
                  ))}
                </div>
              )}

              {/* Transfer Overlay */}
              {showTransferDropdown && (
                <div className="absolute bottom-20 bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-xl z-30 w-64 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">Transfer to Extension:</div>
                  <button
                    onClick={() => {
                      transferCall('101');
                      setShowTransferDropdown(false);
                    }}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex justify-between"
                  >
                    <span>Ext 101 - Sophia (Reception)</span>
                  </button>
                  <button
                    onClick={() => {
                      transferCall('102');
                      setShowTransferDropdown(false);
                    }}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex justify-between"
                  >
                    <span>Ext 102 - Marcus (AI SDR)</span>
                  </button>
                  <button
                    onClick={() => {
                      transferCall('103');
                      setShowTransferDropdown(false);
                    }}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex justify-between"
                  >
                    <span>Ext 103 - David (Tech Support)</span>
                  </button>
                  <button
                    onClick={() => {
                      transferCall('100');
                      setShowTransferDropdown(false);
                    }}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex justify-between"
                  >
                    <span>Ext 100 - Victoria (Supervisor)</span>
                  </button>
                  <button
                    onClick={() => {
                      transferCall('200');
                      setShowTransferDropdown(false);
                    }}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex justify-between"
                  >
                    <span>Ext 200 - Human Sales Rep</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* DIALER SCREEN (When no call is active) */
          <div className="p-6 flex flex-col items-center">
            {/* Call Simulator Highlights */}
            <div className="w-full mb-6 p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30">
              <div className="flex items-center space-x-2 text-indigo-300 font-semibold text-xs mb-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Instant Inbound PBX Test Simulations</span>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Experience the live AI PBX in action. Dial in directly as a prospective client and speak with the AI SDR or receptionist:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    initiateInboundCall({
                      didNumber: '+1 (555) 019-4821',
                      callerName: 'Enterprise Buyer',
                      callerNumber: '+1 (555) 839-2041',
                      callerCompany: 'Omni Logistics',
                    })
                  }
                  className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-between shadow-md transition-all"
                >
                  <div className="text-left">
                    <div className="font-bold">Inbound Sales DID</div>
                    <div className="text-[10px] text-indigo-200">Routes to Marcus (AI SDR Ext 102)</div>
                  </div>
                  <Phone className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    initiateInboundCall({
                      didNumber: '+1 (555) 019-4820',
                      callerName: 'General Inbound',
                      callerNumber: '+1 (555) 992-1200',
                      callerCompany: 'Apex Customer',
                    })
                  }
                  className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-700 transition-all"
                >
                  <div className="text-left">
                    <div className="font-bold">Main Corporate DID</div>
                    <div className="text-[10px] text-slate-400">Routes to Sophia (Reception Ext 101)</div>
                  </div>
                  <Phone className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Custom Number Input */}
            <div className="w-full max-w-xs mb-4">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Dial Extension or External E.164 Number
              </label>
              <input
                type="text"
                value={dialerInput}
                onChange={(e) => setDialerInput(e.target.value)}
                placeholder="e.g. 102 or +1 (555) 019-4821"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono text-sm font-bold text-white focus:outline-none focus:border-indigo-500 tracking-wider"
              />
            </div>

            {/* DTMF Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs mb-5">
              {dialpadKeys.map((key) => (
                <button
                  key={key.num}
                  onClick={() => {
                    playDTMFTone(key.num);
                    setDialerInput((prev) => prev + key.num);
                  }}
                  className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white flex flex-col items-center justify-center border border-slate-700/80 transition-all"
                >
                  <span className="text-base font-bold leading-none">{key.num}</span>
                  {key.sub && <span className="text-[9px] text-slate-400 font-medium tracking-widest">{key.sub}</span>}
                </button>
              ))}
            </div>

            {/* Action Buttons: Dial Out or Clear */}
            <div className="flex items-center space-x-3 w-full max-w-xs">
              <button
                onClick={() => setDialerInput('')}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Clear
              </button>

              <button
                onClick={() => {
                  if (dialerInput.trim()) {
                    initiateOutboundCall(dialerInput.trim());
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Call Number</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
