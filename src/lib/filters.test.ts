import test from 'node:test';
import assert from 'node:assert/strict';
import { isWithinDateRange, filterCallSessions, filterCRMLeads } from './filters.ts';
import { CallSession, CRMLead } from '../types/index.ts';

const baseDate = new Date('2026-10-25T12:00:00Z');

test('isWithinDateRange correctly handles date presets', () => {
  const todayStr = '2026-10-25T08:00:00Z';
  const threeDaysAgoStr = '2026-10-22T08:00:00Z';
  const fortyDaysAgoStr = '2026-09-10T08:00:00Z';

  assert.equal(isWithinDateRange(todayStr, 'today', baseDate), true);
  assert.equal(isWithinDateRange(threeDaysAgoStr, 'today', baseDate), false);
  assert.equal(isWithinDateRange(threeDaysAgoStr, 'last_7_days', baseDate), true);
  assert.equal(isWithinDateRange(fortyDaysAgoStr, 'last_7_days', baseDate), false);
  assert.equal(isWithinDateRange(fortyDaysAgoStr, 'all', baseDate), true);
});

test('filterCallSessions filters by agent and date range', () => {
  const mockCalls: Partial<CallSession>[] = [
    {
      id: 'c1',
      startTime: '2026-10-25T10:00:00Z',
      agentId: 'agent-sdr-marcus',
      extension: '102',
      callerNumber: '+15551234567',
      summary: 'Sales demo',
    },
    {
      id: 'c2',
      startTime: '2026-10-20T10:00:00Z',
      agentId: 'agent-receptionist-sophia',
      extension: '101',
      callerNumber: '+15559876543',
      summary: 'General inquiry',
    },
  ];

  const allFiltered = filterCallSessions(mockCalls as CallSession[], {
    dateRange: 'all',
    agentId: 'all',
    leadStatus: 'all',
  }, baseDate);
  assert.equal(allFiltered.length, 2);

  const marcusOnly = filterCallSessions(mockCalls as CallSession[], {
    dateRange: 'all',
    agentId: 'agent-sdr-marcus',
    leadStatus: 'all',
  }, baseDate);
  assert.equal(marcusOnly.length, 1);
  assert.equal(marcusOnly[0].id, 'c1');

  const todayOnly = filterCallSessions(mockCalls as CallSession[], {
    dateRange: 'today',
    agentId: 'all',
    leadStatus: 'all',
  }, baseDate);
  assert.equal(todayOnly.length, 1);
  assert.equal(todayOnly[0].id, 'c1');
});

test('filterCRMLeads filters by lead status and agent', () => {
  const mockLeads: Partial<CRMLead>[] = [
    {
      id: 'l1',
      name: 'Alice',
      company: 'Tech Corp',
      email: 'alice@tech.com',
      phone: '111',
      status: 'demo_booked',
      assignedAgent: 'Marcus (AI SDR)',
      lastContactDate: '2026-10-25T09:00:00Z',
    },
    {
      id: 'l2',
      name: 'Bob',
      company: 'Logistics LLC',
      email: 'bob@logistics.com',
      phone: '222',
      status: 'mql',
      assignedAgent: 'Sophia (Receptionist)',
      lastContactDate: '2026-10-15T09:00:00Z',
    },
  ];

  const demoBookedOnly = filterCRMLeads(mockLeads as CRMLead[], {
    dateRange: 'all',
    agentId: 'all',
    leadStatus: 'demo_booked',
  }, baseDate);
  assert.equal(demoBookedOnly.length, 1);
  assert.equal(demoBookedOnly[0].name, 'Alice');

  const marcusLeads = filterCRMLeads(mockLeads as CRMLead[], {
    dateRange: 'all',
    agentId: 'agent-sdr-marcus',
    leadStatus: 'all',
  }, baseDate);
  assert.equal(marcusLeads.length, 1);
  assert.equal(marcusLeads[0].name, 'Alice');
});
