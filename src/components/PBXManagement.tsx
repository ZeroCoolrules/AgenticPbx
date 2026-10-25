import React, { useState, useEffect } from 'react';
import {
  Phone,
  Plus,
  Radio,
  Layers,
  Settings,
  Check,
  Edit2,
  Trash2,
  ShieldCheck,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import { VirtualNumber, PBXExtension, RingGroup } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { safeFetchJson } from '../utils/api.ts';

export const PBXManagement: React.FC = () => {
  const { token } = useAuth();

  const [dids, setDids] = useState<VirtualNumber[]>([]);
  const [extensions, setExtensions] = useState<PBXExtension[]>([]);
  const [ringGroups, setRingGroups] = useState<RingGroup[]>([]);

  // Add DID Modal state
  const [isAddDidOpen, setIsAddDidOpen] = useState(false);
  const [newNumber, setNewNumber] = useState('+1 (555) 019-4822');
  const [newLabel, setNewLabel] = useState('Outbound Marketing DID Line');
  const [newAgent, setNewAgent] = useState('agent-sdr-marcus');
  const [newExt, setNewExt] = useState('102');

  const fetchPBXData = async () => {
    const [didRes, extRes, rgRes] = await Promise.all([
      safeFetchJson<VirtualNumber[]>('/api/pbx/dids'),
      safeFetchJson<PBXExtension[]>('/api/pbx/extensions'),
      safeFetchJson<RingGroup[]>('/api/pbx/ring-groups'),
    ]);
    if (didRes.ok && didRes.data) setDids(didRes.data);
    if (extRes.ok && extRes.data) setExtensions(extRes.data);
    if (rgRes.ok && rgRes.data) setRingGroups(rgRes.data);
  };

  useEffect(() => {
    fetchPBXData();
  }, []);

  const handleAddDid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pbx/dids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          number: newNumber,
          label: newLabel,
          assignedAgentId: newAgent,
          assignedExtension: newExt,
          smsEnabled: true,
        }),
      });

      if (res.ok) {
        setIsAddDidOpen(false);
        fetchPBXData();
      }
    } catch (err) {
      // Handled silently
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <span>Virtual PBX Telephony &amp; Number Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your virtual phone numbers (DIDs), SIP trunks, dialplan routing, and extension queues.
          </p>
        </div>

        <button
          onClick={() => setIsAddDidOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-md shadow-indigo-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Virtual DID</span>
        </button>
      </div>

      {/* Virtual Numbers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Assigned Virtual DIDs / Phone Numbers</span>
            </h3>
            <p className="text-xs text-slate-400">Incoming caller routing and agent assignments</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{dids.length} Active DIDs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Virtual Number</th>
                <th className="py-3 px-4">DID Label &amp; Purpose</th>
                <th className="py-3 px-4">Assigned Agent / Extension</th>
                <th className="py-3 px-4">Capabilities</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Monthly Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dids.map((did) => (
                <tr key={did.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white tracking-wide">
                    {did.number}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium">
                    {did.label}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1.5 bg-indigo-950/60 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-500/30 font-semibold">
                      <span>Ext {did.assignedExtension}</span>
                      <ArrowRight className="w-3 h-3 text-indigo-400" />
                      <span>{did.assignedAgentId.replace('agent-', '').replace('-', ' ').toUpperCase()}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Voice</span>
                      {did.smsEnabled && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                          SMS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span className="uppercase">{did.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {did.monthlyMinutes.toLocaleString()} mins
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extensions & Ring Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Extensions List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Headphones className="w-4 h-4 text-purple-400" />
                <span>PBX Extensions &amp; Dialplan</span>
              </h3>
              <p className="text-xs text-slate-400">Internal routing destinations</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{extensions.length} Extensions</span>
          </div>

          <div className="space-y-2.5">
            {extensions.map((ext) => (
              <div
                key={ext.extensionNumber}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-indigo-400">
                    {ext.extensionNumber}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">{ext.name}</div>
                    <div className="text-[11px] text-slate-400">{ext.department}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {ext.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ring Groups & Hunt Queues */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Ring Groups &amp; Hunt Queues</span>
              </h3>
              <p className="text-xs text-slate-400">Simultaneous &amp; sequential agent hunting</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{ringGroups.length} Groups</span>
          </div>

          <div className="space-y-3">
            {ringGroups.map((rg) => (
              <div key={rg.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-white">{rg.name}</div>
                  <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                    Queue #{rg.number}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                  <span className="capitalize">Strategy: {rg.strategy}</span>
                  <span>•</span>
                  <span>Timeout: {rg.timeoutSeconds}s</span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500">Members:</span>
                    {rg.members.map((m) => (
                      <span key={m} className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-slate-300">
                        Ext {m}
                      </span>
                    ))}
                  </div>

                  <span className="text-slate-400 text-[10px]">
                    Fallback: Ext {rg.fallbackExtension}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add DID Modal */}
      {isAddDidOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Provision Virtual Number (DID)</h3>
            <p className="text-xs text-slate-400 mb-4">Assign dedicated inbound voice and SMS routing</p>

            <form onSubmit={handleAddDid} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">E.164 Phone Number</label>
                <input
                  type="text"
                  required
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">DID Label &amp; Purpose</label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned AI Agent</label>
                <select
                  value={newAgent}
                  onChange={(e) => {
                    setNewAgent(e.target.value);
                    if (e.target.value.includes('marcus')) setNewExt('102');
                    else if (e.target.value.includes('sophia')) setNewExt('101');
                    else if (e.target.value.includes('david')) setNewExt('103');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="agent-sdr-marcus">Marcus (AI SDR - Ext 102)</option>
                  <option value="agent-receptionist-sophia">Sophia (AI Receptionist - Ext 101)</option>
                  <option value="agent-support-david">David (AI Support - Ext 103)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDidOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md"
                >
                  Add Number
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
