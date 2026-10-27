import React, { useState, useEffect, useMemo } from 'react';
import {
  PhoneCall,
  Bot,
  Activity,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Clock,
  Radio,
  Headphones,
  Users,
  Search,
  Volume2,
  Zap,
} from 'lucide-react';
import { useCall } from '../context/CallContext.tsx';
import { useFilters } from '../context/FilterContext.tsx';
import { filterCallSessions } from '../lib/filters.ts';
import { CallSession, PBXExtension, VirtualNumber } from '../types/index.ts';
import { WebRTCQualityMonitor } from './WebRTCQualityMonitor.tsx';
import { GlobalFilterBar } from './GlobalFilterBar.tsx';
import { safeFetchJson } from '../utils/api.ts';

interface CommandCenterProps {
  onNavigateToTab: (tab: any) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onNavigateToTab }) => {
  const { initiateInboundCall, openDialpad, activeCall } = useCall();
  const { filters, resetFilters } = useFilters();

  const [metrics, setMetrics] = useState<any>({
    activeCallsCount: 0,
    callsTodayCount: 14,
    avgWaitTimeSeconds: 1.2,
    aiHandledPercentage: 98.4,
    appointmentsBookedToday: 6,
    sipTrunksOnline: 3,
  });

  const [extensions, setExtensions] = useState<PBXExtension[]>([]);
  const [dids, setDids] = useState<VirtualNumber[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallSession[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);

  const fetchDashboardData = async () => {
    // Single consolidated dashboard request prevents race conditions & failed fetch spam
    const res = await safeFetchJson<{
      metrics: any;
      extensions: PBXExtension[];
      dids: VirtualNumber[];
      calls: CallSession[];
    }>('/api/pbx/dashboard');

    if (res.ok && res.data) {
      if (res.data.metrics) setMetrics(res.data.metrics);
      if (res.data.extensions) setExtensions(res.data.extensions);
      if (res.data.dids) setDids(res.data.dids);
      if (res.data.calls) {
        setRecentCalls(res.data.calls);
        if (res.data.calls.length > 0) {
          setSelectedCall(prev => prev || res.data!.calls[0]);
        }
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchDashboardData();
    const interval = setInterval(() => {
      if (isMounted) fetchDashboardData();
    }, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredCalls = useMemo(() => {
    return filterCallSessions(recentCalls, filters);
  }, [recentCalls, filters]);

  // Keep selectedCall in sync if current selectedCall is filtered out
  useEffect(() => {
    if (filteredCalls.length > 0) {
      if (!selectedCall || !filteredCalls.some(c => c.id === selectedCall.id)) {
        setSelectedCall(filteredCalls[0]);
      }
    } else {
      setSelectedCall(null);
    }
  }, [filteredCalls, selectedCall]);

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Quick Test Actions */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Autonomous PBX Telephony Cloud</span>
              </span>
              <span className="text-xs text-slate-400">Carrier SIP Gateway active</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Virtual PBX Switchboard &amp; Agentic AI SDR
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Inbound and outbound telephone operations powered by specialized AI agents. Natural full-duplex voice,
              automatic BANT lead qualification, real-time CRM updates, and calendar booking.
            </p>
          </div>

          {/* Direct Live Call Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() =>
                initiateInboundCall({
                  didNumber: '+1 (555) 019-4821',
                  callerName: 'Enterprise Client',
                  callerNumber: '+1 (555) 782-9901',
                  callerCompany: 'Inbound Business Call',
                })
              }
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              title="Launch a direct real-time voice call with Marcus (AI SDR Ext 102)"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Call AI Sales Line (Ext 102)</span>
            </button>

            <button
              onClick={openDialpad}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center space-x-2 border border-slate-700 transition-all"
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Open Softphone Dialpad</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Persistent Global Filtering Bar */}
      <GlobalFilterBar
        viewName="CommandCenter"
        totalCount={recentCalls.length}
        filteredCount={filteredCalls.length}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Calls</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{metrics.activeCallsCount}</span>
            <span className="text-[11px] text-emerald-400 font-medium">Live on PBX</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">3 DIDs answering concurrently</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">AI Handled Rate</span>
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{metrics.aiHandledPercentage}%</span>
            <span className="text-[11px] text-emerald-400 font-medium">+1.8% vs goal</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Autonomous SDR resolution</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Demos Booked Today</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{metrics.appointmentsBookedToday}</span>
            <span className="text-[11px] text-indigo-400 font-medium">BANT Qualified</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Directly added to Sales calendar</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Answer Latency</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{metrics.avgWaitTimeSeconds}s</span>
            <span className="text-[11px] text-emerald-400 font-medium">Instant Ring</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Zero caller hold queues</p>
        </div>
      </div>

      {/* Real-Time WebRTC Jitter & Packet Loss Telemetry Dashboard (Recharts) */}
      <WebRTCQualityMonitor isCallActive={!!(activeCall && activeCall.status !== 'completed')} />

      {/* PBX Live Extensions Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Headphones className="w-4 h-4 text-indigo-400" />
              <span>Live PBX Internal Extensions &amp; Autonomous Agents</span>
            </h3>
            <p className="text-xs text-slate-400">Direct dial, monitor, and department routing</p>
          </div>
          <button
            onClick={() => onNavigateToTab('telephony')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
          >
            <span>Manage Dialplan</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {extensions.map((ext) => (
            <div
              key={ext.extensionNumber}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-indigo-400">
                  {ext.extensionNumber}
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-200 group-hover:text-white transition-colors">
                    {ext.name}
                  </div>
                  <div className="text-[11px] text-slate-400">{ext.department}</div>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-1.5">
                <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{ext.status}</span>
                </span>
                <button
                  onClick={() =>
                    initiateInboundCall({
                      callerName: 'Internal Test Call',
                      callerNumber: '+1 (555) 000-0100',
                      callerCompany: 'Apex Internal',
                      didNumber: dids[0]?.number || '+1 (555) 019-4820',
                    })
                  }
                  className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  Dial Ext
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Calls & Detailed Intelligence Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Calls Feed */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-purple-400" />
                <span>Call Logs &amp; Recordings</span>
              </h3>
              <p className="text-xs text-slate-400">Real-time transcripts, duration &amp; outcomes</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {filteredCalls.length} of {recentCalls.length} calls
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredCalls.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <Search className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
                <p className="text-xs font-semibold text-slate-300">No calls match active filters</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                  Try adjusting the date range, agent, or lead status.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredCalls.map((call) => {
                const isSelected = selectedCall?.id === call.id;
                return (
                  <div
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[170px]">
                        {call.callerName || call.callerNumber}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{call.durationSeconds}s</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span>{call.callerCompany || 'Inbound Caller'}</span>
                      <span className="text-indigo-400 font-medium">Ext {call.extension}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={`font-semibold capitalize px-1.5 py-0.5 rounded ${
                          call.sentiment === 'positive'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : call.sentiment === 'critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {call.sentiment}
                      </span>

                      <span className="text-slate-500">
                        BANT: <strong className="text-slate-300">{call.qualificationScore}/100</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Transcript & Call Intelligence Inspector */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[520px]">
          {selectedCall ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Call Detail Header */}
              <div className="border-b border-slate-800 pb-3 mb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-white">
                      {selectedCall.callerName || selectedCall.callerNumber}
                    </h4>
                    <span className="text-xs text-slate-400">({selectedCall.callerCompany || 'Inbound Caller'})</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Routed to Extension {selectedCall.extension} via Virtual DID {selectedCall.didNumber}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400">
                    BANT Score: {selectedCall.qualificationScore}/100
                  </div>
                  <div className="text-[11px] text-slate-500 capitalize">{selectedCall.status}</div>
                </div>
              </div>

              {/* Summary and BANT Cards */}
              <div className="mb-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="text-slate-400 font-semibold mb-1 text-[11px]">AI Executive Summary:</div>
                <p className="text-slate-200 leading-relaxed">{selectedCall.summary}</p>

                {selectedCall.bant && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Budget:</span>
                      <strong className="text-slate-200">{selectedCall.bant.budget}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Authority:</span>
                      <strong className="text-slate-200">{selectedCall.bant.authority}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Timeline:</span>
                      <strong className="text-slate-200">{selectedCall.bant.timeline}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Qualified:</span>
                      <strong className={selectedCall.bant.isQualified ? 'text-emerald-400' : 'text-amber-400'}>
                        {selectedCall.bant.isQualified ? 'YES' : 'PENDING'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Full Call Audio Transcript:
                </div>
                {selectedCall.transcript.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl text-xs ${
                      msg.sender === 'agent'
                        ? 'bg-indigo-950/30 border border-indigo-500/20 text-slate-200'
                        : msg.sender === 'system'
                        ? 'bg-slate-950 text-slate-400 text-center text-[11px]'
                        : 'bg-slate-800/80 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold uppercase text-indigo-400">{msg.sender}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
              <PhoneCall className="w-8 h-8 mb-2 opacity-40" />
              <span>Select a call from the list to view transcript and BANT intelligence</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
