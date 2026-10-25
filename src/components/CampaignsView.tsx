import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Play,
  CheckCircle2,
  PhoneCall,
  Users,
  Target,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { OutboundCampaign } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { safeFetchJson } from '../utils/api.ts';

export const CampaignsView: React.FC = () => {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<OutboundCampaign[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);

  const [name, setName] = useState('High-Growth B2B Outreach');
  const [targetAudience, setTargetAudience] = useState('VPs of Inside Sales & Operations at mid-market SaaS companies');
  const [scriptGoal, setScriptGoal] = useState('Assess dissatisfaction with legacy PBX, introduce AI SDR qualification, and schedule a 20-min demo.');

  const fetchCampaigns = async () => {
    const res = await safeFetchJson<OutboundCampaign[]>('/api/crm/campaigns');
    if (res.ok && res.data) {
      setCampaigns(res.data);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          targetAudience,
          scriptGoal,
          agentId: 'agent-sdr-marcus',
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        fetchCampaigns();
      }
    } catch (e) {}
  };

  const handleRunBatch = async (campaignId: string) => {
    setRunningCampaignId(campaignId);
    try {
      const res = await fetch(`/api/crm/campaigns/${campaignId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await fetchCampaigns();
      }
    } catch (e) {
    } finally {
      setRunningCampaignId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-indigo-400" />
            <span>Outbound AI SDR Calling Campaigns</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Orchestrate automated cold and warm outbound prospecting batches powered by Marcus (AI SDR).
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-md shadow-indigo-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Outbound Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="space-y-4">
        {campaigns.map((cmp) => {
          const isRunning = runningCampaignId === cmp.id;
          const connectRate = cmp.dialsCount > 0 ? Math.round((cmp.connectedCount / cmp.dialsCount) * 100) : 0;
          const bookingRate = cmp.connectedCount > 0 ? Math.round((cmp.appointmentsCount / cmp.connectedCount) * 100) : 0;

          return (
            <div
              key={cmp.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h3 className="font-bold text-base text-white">{cmp.name}</h3>
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {cmp.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                    <Target className="w-3.5 h-3.5 text-slate-500" />
                    <span>Target: {cmp.targetAudience}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRunBatch(cmp.id)}
                  disabled={isRunning}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-emerald-600/20 transition-all shrink-0"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Dialing Leads...' : 'Launch Dialing Batch'}</span>
                </button>
              </div>

              {/* Script Goal */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">AI Calling Strategy:</span> {cmp.scriptGoal}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 text-[11px] block">Total Dials</span>
                  <span className="font-mono text-base font-bold text-white">{cmp.dialsCount}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 text-[11px] block">Connected Calls</span>
                  <span className="font-mono text-base font-bold text-white">
                    {cmp.connectedCount} <span className="text-[10px] text-emerald-400">({connectRate}%)</span>
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 text-[11px] block">BANT Qualified</span>
                  <span className="font-mono text-base font-bold text-indigo-400">{cmp.qualifiedCount}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 text-[11px] block">Demos Booked</span>
                  <span className="font-mono text-base font-bold text-purple-400">
                    {cmp.appointmentsCount} <span className="text-[10px] text-purple-300">({bookingRate}%)</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Outbound Campaign</h3>
            <p className="text-xs text-slate-400 mb-4">Set audience and instructions for Marcus AI SDR</p>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Prospect Audience</label>
                <input
                  type="text"
                  required
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">AI Calling Objective &amp; Pitch</label>
                <textarea
                  rows={3}
                  required
                  value={scriptGoal}
                  onChange={(e) => setScriptGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
