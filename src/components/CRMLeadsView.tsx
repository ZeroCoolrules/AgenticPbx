import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  PhoneCall,
  Calendar,
  Sparkles,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Building,
  Mail,
  Phone,
  Filter,
} from 'lucide-react';
import { CRMLead, LeadStatus } from '../types/index.ts';
import { useCall } from '../context/CallContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useFilters } from '../context/FilterContext.tsx';
import { filterCRMLeads } from '../lib/filters.ts';
import { GlobalFilterBar } from './GlobalFilterBar.tsx';
import { safeFetchJson } from '../utils/api.ts';

export const CRMLeadsView: React.FC = () => {
  const { initiateOutboundCall } = useCall();
  const { token } = useAuth();
  const { filters, setLeadStatus, searchQuery, setSearchQuery, resetFilters } = useFilters();

  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);

  const fetchLeads = async () => {
    const res = await safeFetchJson<CRMLead[]>('/api/crm/leads');
    if (res.ok && res.data) {
      setLeads(res.data);
      if (res.data.length > 0) {
        setSelectedLead(prev => prev || res.data![0]);
      }
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    return filterCRMLeads(leads, filters);
  }, [leads, filters]);

  // Keep selectedLead in sync if current selected is filtered out
  useEffect(() => {
    if (filteredLeads.length > 0) {
      if (!selectedLead || !filteredLeads.some(l => l.id === selectedLead.id)) {
        setSelectedLead(filteredLeads[0]);
      }
    } else {
      setSelectedLead(null);
    }
  }, [filteredLeads, selectedLead]);

  const getStageBadge = (status: LeadStatus) => {
    switch (status) {
      case 'demo_booked':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'sql':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'mql':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'won':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'disqualified':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Autonomous CRM &amp; BANT Lead Intelligence</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline generated and qualified autonomously by your virtual PBX AI SDR agents.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads, companies..."
              className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <GlobalFilterBar
        viewName="CRM"
        totalCount={leads.length}
        filteredCount={filteredLeads.length}
      />

      {/* Stage Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
        {['all', 'demo_booked', 'sql', 'mql', 'contacted', 'new', 'won', 'disqualified'].map((st) => (
          <button
            key={st}
            onClick={() => setLeadStatus(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all uppercase text-[11px] ${
              filters.leadStatus === st
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Split View: Leads List + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Leads List */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Prospect Directory ({filteredLeads.length} of {leads.length})
            </span>
          </div>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                <Search className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
                <p className="text-xs font-semibold text-slate-300">No leads match active filters</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                  Adjust the date range, assigned agent, or status filter.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center space-x-2">
                        <span>{lead.name}</span>
                        <span className="text-xs text-slate-400 font-normal">({lead.title})</span>
                      </div>
                      <div className="text-xs text-indigo-400 flex items-center space-x-1.5 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lead.company}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStageBadge(
                          lead.status
                        )}`}
                      >
                        {lead.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        ${lead.dealSize.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* BANT Pills */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Budget:</span>
                      <span className="font-semibold text-slate-300">{lead.bant.budget}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Authority:</span>
                      <span className="font-semibold text-slate-300 truncate block">{lead.bant.authority}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Timeline:</span>
                      <span className="font-semibold text-slate-300">{lead.bant.timeline}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">BANT Score:</span>
                      <span
                        className={`font-bold ${
                          lead.score >= 75 ? 'text-emerald-400' : lead.score >= 50 ? 'text-indigo-400' : 'text-slate-400'
                        }`}
                      >
                        {lead.score}/100
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

        {/* Right Column: Lead Deep Dive Inspector */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          {selectedLead ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedLead.name}</h3>
                  <div className="text-xs text-slate-400 font-medium">{selectedLead.title} • {selectedLead.company}</div>
                </div>

                {/* Instant Dial button */}
                <button
                  onClick={() => initiateOutboundCall(selectedLead.phone)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Click-to-Dial</span>
                </button>
              </div>

              {/* Contact coordinates */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedLead.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono">{selectedLead.phone}</span>
                </div>
              </div>

              {/* BANT Deep Breakdown */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI SDR Qualification Reasoning</span>
                </div>

                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Identified Need:</strong> {selectedLead.bant.need}
                </div>

                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Budget Details:</strong> {selectedLead.bant.budgetDetails}
                </div>

                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">AI Notes:</strong> {selectedLead.bant.notes}
                </div>
              </div>

              {/* Call History Notes */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Conversation Log Timeline
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedLead.notes.map((n, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed"
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <span>Select a lead from the directory</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
