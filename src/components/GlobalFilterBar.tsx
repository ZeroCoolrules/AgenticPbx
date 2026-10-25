import React from 'react';
import {
  Calendar,
  Bot,
  Filter,
  X,
  RotateCcw,
  SlidersHorizontal,
  Target,
  Sparkles,
  Users,
} from 'lucide-react';
import { useFilters } from '../context/FilterContext.tsx';
import { DateRangePreset } from '../lib/filters.ts';

interface GlobalFilterBarProps {
  viewName: 'CommandCenter' | 'CRM';
  totalCount?: number;
  filteredCount?: number;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  viewName,
  totalCount,
  filteredCount,
}) => {
  const {
    dateRange,
    setDateRange,
    agentId,
    setAgentId,
    leadStatus,
    setLeadStatus,
    resetFilters,
    isFiltered,
    activeFilterCount,
  } = useFilters();

  const datePresets: Array<{ id: DateRangePreset; label: string }> = [
    { id: 'all', label: 'All Dates' },
    { id: 'today', label: 'Today' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'this_quarter', label: 'This Quarter' },
  ];

  const agentOptions = [
    { id: 'all', label: 'All Agents & Extensions' },
    { id: 'agent-sdr-marcus', label: 'Marcus (AI SDR - Ext 102)' },
    { id: 'agent-receptionist-sophia', label: 'Sophia (Reception - Ext 101)' },
    { id: 'agent-support-david', label: 'David (Support - Ext 103)' },
    { id: 'agent-am-elena', label: 'Elena (Client Success - Ext 104)' },
    { id: 'agent-supervisor-victoria', label: 'Victoria (Supervisor - Ext 100)' },
  ];

  const statusOptions = [
    { id: 'all', label: 'All Lead Statuses' },
    { id: 'demo_booked', label: 'Demo Booked' },
    { id: 'sql', label: 'SQL (Sales Qualified)' },
    { id: 'mql', label: 'MQL (Marketing Qualified)' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'new', label: 'New Inbound' },
    { id: 'won', label: 'Closed Won' },
    { id: 'disqualified', label: 'Disqualified' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title & Filter Indicator */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Filter className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Global Filters
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({viewName} Scope)
              </span>
              {isFiltered && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold animate-in fade-in">
                  {activeFilterCount} Active
                </span>
              )}
            </div>
            {typeof filteredCount === 'number' && typeof totalCount === 'number' && (
              <p className="text-[11px] text-slate-400">
                Displaying <strong className="text-slate-200">{filteredCount}</strong> of{' '}
                <strong className="text-slate-200">{totalCount}</strong> records
              </p>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="relative flex items-center">
            <div className="absolute left-2.5 pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              aria-label="Filter by date range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer hover:border-slate-600"
            >
              {datePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Agent Selector */}
          <div className="relative flex items-center">
            <div className="absolute left-2.5 pointer-events-none text-slate-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <select
              aria-label="Filter by specific agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer hover:border-slate-600"
            >
              {agentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Status Selector */}
          <div className="relative flex items-center">
            <div className="absolute left-2.5 pointer-events-none text-slate-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <select
              aria-label="Filter by lead status"
              value={leadStatus}
              onChange={(e) => setLeadStatus(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer hover:border-slate-600"
            >
              {statusOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              title="Reset all filters to default"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-rose-300 hover:text-white transition-all shadow-sm"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
