import { CallSession, CRMLead, LeadStatus } from '../types/index.ts';

export type DateRangePreset = 'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_quarter';

export interface GlobalFilterState {
  dateRange: DateRangePreset;
  agentId: string; // 'all' or specific agent ID
  leadStatus: string; // 'all' or specific LeadStatus
  searchQuery?: string;
}

/**
 * Checks if a date string falls within the selected date range preset
 */
export function isWithinDateRange(dateString: string | undefined, range: DateRangePreset, now = new Date()): boolean {
  if (!dateString || range === 'all') return true;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return true;

  const nowMs = now.getTime();
  const dateMs = date.getTime();
  const diffMs = nowMs - dateMs;

  switch (range) {
    case 'today': {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return dateMs >= todayStart;
    }
    case 'last_7_days': {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return diffMs <= sevenDaysMs && diffMs >= 0;
    }
    case 'last_30_days': {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      return diffMs <= thirtyDaysMs && diffMs >= 0;
    }
    case 'this_quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1).getTime();
      return dateMs >= quarterStart;
    }
    default:
      return true;
  }
}

/**
 * Filters call sessions based on global filter criteria
 */
export function filterCallSessions(calls: CallSession[], filters: GlobalFilterState, now = new Date()): CallSession[] {
  return calls.filter((call) => {
    // 1. Date Range Check
    if (!isWithinDateRange(call.startTime, filters.dateRange, now)) {
      return false;
    }

    // 2. Agent Check
    if (filters.agentId && filters.agentId !== 'all') {
      const matchesAgentId = call.agentId === filters.agentId;
      const matchesExtension =
        (filters.agentId.includes('marcus') && call.extension === '102') ||
        (filters.agentId.includes('sophia') && call.extension === '101') ||
        (filters.agentId.includes('david') && call.extension === '103') ||
        (filters.agentId.includes('elena') && call.extension === '104') ||
        (filters.agentId.includes('victoria') && call.extension === '100');

      if (!matchesAgentId && !matchesExtension) {
        return false;
      }
    }

    // 3. Search query check
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchesSearch =
        call.callerNumber.includes(q) ||
        (call.callerName && call.callerName.toLowerCase().includes(q)) ||
        (call.callerCompany && call.callerCompany.toLowerCase().includes(q)) ||
        (call.summary && call.summary.toLowerCase().includes(q));

      if (!matchesSearch) return false;
    }

    return true;
  });
}

/**
 * Filters CRM leads based on global filter criteria
 */
export function filterCRMLeads(leads: CRMLead[], filters: GlobalFilterState, now = new Date()): CRMLead[] {
  return leads.filter((lead) => {
    // 1. Date Range Check
    if (!isWithinDateRange(lead.lastContactDate, filters.dateRange, now)) {
      return false;
    }

    // 2. Agent Check
    if (filters.agentId && filters.agentId !== 'all') {
      const assigned = (lead.assignedAgent || '').toLowerCase();
      const agentTarget = filters.agentId.toLowerCase();

      const matches =
        (agentTarget.includes('marcus') && assigned.includes('marcus')) ||
        (agentTarget.includes('sophia') && assigned.includes('sophia')) ||
        (agentTarget.includes('david') && assigned.includes('david')) ||
        (agentTarget.includes('elena') && assigned.includes('elena')) ||
        (agentTarget.includes('victoria') && assigned.includes('victoria'));

      if (!matches) {
        return false;
      }
    }

    // 3. Lead Status Check
    if (filters.leadStatus && filters.leadStatus !== 'all') {
      if (lead.status !== filters.leadStatus) {
        return false;
      }
    }

    // 4. Search query check
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchesSearch =
        lead.name.toLowerCase().includes(q) ||
        lead.company.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.includes(q);

      if (!matchesSearch) return false;
    }

    return true;
  });
}
