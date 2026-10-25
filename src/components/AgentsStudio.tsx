import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sliders,
  Sparkles,
  PhoneCall,
  Volume2,
  Check,
  Shield,
  Save,
  MessageSquare,
  Target,
  Flame,
} from 'lucide-react';
import { AIAgent } from '../types/index.ts';
import { useCall } from '../context/CallContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { safeFetchJson } from '../utils/api.ts';

export const AgentsStudio: React.FC = () => {
  const { initiateInboundCall } = useCall();
  const { token } = useAuth();

  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [objective, setObjective] = useState('');
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [minScoreToBook, setMinScoreToBook] = useState(65);

  const fetchAgents = async () => {
    const res = await safeFetchJson<AIAgent[]>('/api/agents');
    if (res.ok && res.data) {
      setAgents(res.data);
      if (res.data.length > 0) {
        setSelectedAgent(prev => prev || res.data![0]);
      }
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const selectAgentForEditing = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setSystemPrompt(agent.systemPrompt);
    setObjective(agent.objective);
    setVoicePitch(agent.voicePitch);
    setVoiceRate(agent.voiceRate);
    setMinScoreToBook(agent.qualificationRubric.minScoreToBook);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedAgent) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          systemPrompt,
          objective,
          voicePitch,
          voiceRate,
          qualificationRubric: {
            ...selectedAgent.qualificationRubric,
            minScoreToBook,
          },
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedAgent(updated);
        setAgents(prev => prev.map(a => (a.id === updated.id ? updated : a)));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      // Handled silently
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <span>Autonomous AI SDR &amp; Employee Workforce</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure system personas, BANT qualification criteria, conversational voice models, and autonomous tool permissions.
          </p>
        </div>

        <button
          onClick={() =>
            initiateInboundCall({
              didNumber: '+1 (555) 019-4821',
              callerName: 'Live Voice Test',
              callerCompany: 'Prospective Client',
            })
          }
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all shrink-0"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Test Call Active Agent</span>
        </button>
      </div>

      {/* Agents Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {agents.map((agent) => {
          const isSelected = selectedAgent?.id === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => selectAgentForEditing(agent)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden relative">
                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                    Ext {agent.assignedExtension}
                  </span>
                </div>

                <div className="font-bold text-sm text-white">{agent.name}</div>
                <div className="text-[11px] text-slate-400 font-medium mb-2">{agent.title}</div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Demos Booked:</span>
                <strong className="text-white font-mono">{agent.stats.appointmentsBooked}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Agent Configuration Studio */}
      {selectedAgent && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 overflow-hidden">
                <img src={selectedAgent.avatar} alt={selectedAgent.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>{selectedAgent.name} ({selectedAgent.title})</span>
                  <span className="text-xs font-mono font-semibold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-500/30">
                    Extension {selectedAgent.assignedExtension}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 capitalize">Role: {selectedAgent.role.replace('_', ' ')} • Voice: {selectedAgent.voiceGender}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Config Saved to PBX</span>
                </span>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-2 shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Agent Rules'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Prompts & Objective */}
            <div className="lg:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Agent Operational Objective</span>
                </label>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>System Prompt &amp; Conversational Guidance</span>
                </label>
                <textarea
                  rows={6}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white leading-relaxed focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Instruct the agent how to answer, what discovery questions to ask, how to handle pricing objections, and when to close appointments.
                </p>
              </div>

              {/* Allowed Tools */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active Autonomous Tools</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.allowedTools.map((tool) => (
                    <span
                      key={tool}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 flex items-center space-x-1.5"
                    >
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>{tool}()</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: BANT & Voice Audio Sliders */}
            <div className="lg:col-span-4 space-y-5 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Qualification Rubric &amp; Audio</span>
              </div>

              {/* BANT Threshold */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Min BANT Score to Book Demo</span>
                  <span className="font-mono font-bold text-indigo-400">{minScoreToBook} / 100</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={minScoreToBook}
                  onChange={(e) => setMinScoreToBook(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  The agent requires at least this score before proposing calendar booking.
                </p>
              </div>

              {/* Voice Speech Rate */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Speaking Rate</span>
                  <span className="font-mono font-bold text-indigo-400">{voiceRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Voice Pitch */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Voice Pitch</span>
                  <span className="font-mono font-bold text-indigo-400">{voicePitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={voicePitch}
                  onChange={(e) => setVoicePitch(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Human Escalation Handoff */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Human Handoff Extension</span>
                <div className="text-xs font-mono font-semibold text-slate-200 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                  Extension {selectedAgent.handoffExtension} (Floor Supervisor Desk)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
