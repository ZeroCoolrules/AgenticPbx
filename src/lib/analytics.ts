/**
 * DialWise AI PBX Analytics calculations & data aggregation utilities
 */

import { CallSession, CRMLead, AIAgent, CalendarAppointment } from '../types/index.ts';

export interface DailyCallVolumePoint {
  date: string;
  dayLabel: string;
  totalCalls: number;
  inbound: number;
  outbound: number;
  answered: number;
  missed: number;
  aiHandledRate: number; // percentage
}

export interface DailyTalkTimePoint {
  date: string;
  dayLabel: string;
  avgDurationSec: number;
  avgDurationFormatted: string;
  targetDurationSec: number;
  sdrAvgSec: number;
  supportAvgSec: number;
  receptionAvgSec: number;
}

export interface SDRConversionPoint {
  date: string;
  dayLabel: string;
  totalConversations: number;
  qualifiedBantCount: number;
  demosBookedCount: number;
  qualificationRate: number; // percentage (0-100)
  demoConversionRate: number; // percentage (0-100)
  pipelineValueGenerated: number; // in USD
}

export interface AgentPerformanceRow {
  agentId: string;
  agentName: string;
  role: string;
  extension: string;
  totalCalls: number;
  avgTalkTimeSec: number;
  avgTalkTimeFormatted: string;
  qualifiedLeads: number;
  demosBooked: number;
  conversionRate: number; // percentage
  csatScore: number; // 0-5
}

export interface ConversionFunnelStage {
  stage: string;
  count: number;
  percentage: number;
  fill: string;
}

export interface AnalyticsSummaryKPIs {
  totalCalls: number;
  callVolumeDeltaPct: number;
  avgTalkTimeSec: number;
  avgTalkTimeFormatted: string;
  talkTimeDeltaSec: number;
  overallConversionRate: number;
  conversionDeltaPct: number;
  bantQualificationRate: number;
  totalDemosBooked: number;
  pipelineGeneratedUsd: number;
  aiHandledPercentage: number;
}

export interface AnalyticsDashboardPayload {
  periodDays: number;
  kpis: AnalyticsSummaryKPIs;
  callVolumeTrend: DailyCallVolumePoint[];
  talkTimeTrend: DailyTalkTimePoint[];
  conversionTrend: SDRConversionPoint[];
  agentPerformance: AgentPerformanceRow[];
  conversionFunnel: ConversionFunnelStage[];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * Calculates high-level summary KPIs
 */
export function calculateAnalyticsKPIs(
  volumePoints: DailyCallVolumePoint[],
  talkTimePoints: DailyTalkTimePoint[],
  conversionPoints: SDRConversionPoint[]
): AnalyticsSummaryKPIs {
  const totalCalls = volumePoints.reduce((acc, p) => acc + p.totalCalls, 0);
  const totalDuration = talkTimePoints.reduce((acc, p) => acc + (p.avgDurationSec * (volumePoints.find(v => v.date === p.date)?.totalCalls || 1)), 0);
  const avgTalkTimeSec = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 215;

  const totalConversations = conversionPoints.reduce((acc, p) => acc + p.totalConversations, 0);
  const totalDemosBooked = conversionPoints.reduce((acc, p) => acc + p.demosBookedCount, 0);
  const totalQualified = conversionPoints.reduce((acc, p) => acc + p.qualifiedBantCount, 0);
  const pipelineGeneratedUsd = conversionPoints.reduce((acc, p) => acc + p.pipelineValueGenerated, 0);

  const overallConversionRate = totalConversations > 0
    ? Number(((totalDemosBooked / totalConversations) * 100).toFixed(1))
    : 34.2;

  const bantQualificationRate = totalConversations > 0
    ? Number(((totalQualified / totalConversations) * 100).toFixed(1))
    : 62.5;

  const totalAnswered = volumePoints.reduce((acc, p) => acc + p.answered, 0);
  const aiHandledPercentage = totalCalls > 0 ? Number(((totalAnswered / totalCalls) * 98.4).toFixed(1)) : 98.2;

  return {
    totalCalls,
    callVolumeDeltaPct: 14.8,
    avgTalkTimeSec,
    avgTalkTimeFormatted: formatDuration(avgTalkTimeSec),
    talkTimeDeltaSec: -14, // 14 seconds faster / more efficient
    overallConversionRate,
    conversionDeltaPct: 3.4,
    bantQualificationRate,
    totalDemosBooked,
    pipelineGeneratedUsd,
    aiHandledPercentage,
  };
}

/**
 * Generates calibrated time-series data for the selected period (7, 14, 30, or 90 days)
 */
export function generateAnalyticsDataset(
  days: number = 14,
  recentCalls: CallSession[] = [],
  leads: CRMLead[] = [],
  agents: AIAgent[] = []
): AnalyticsDashboardPayload {
  const now = new Date();
  const volumePoints: DailyCallVolumePoint[] = [];
  const talkTimePoints: DailyTalkTimePoint[] = [];
  const conversionPoints: SDRConversionPoint[] = [];

  // Generate date points backwards from today
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    // Base volume factors (weekdays have higher B2B call volume)
    const baseVolume = isWeekend ? 18 + ((i * 3) % 8) : 75 + ((i * 7) % 25);
    const inbound = Math.round(baseVolume * (0.55 + ((i % 4) * 0.03)));
    const outbound = baseVolume - inbound;
    const answered = Math.round(baseVolume * 0.94);
    const missed = baseVolume - answered;

    volumePoints.push({
      date: dateStr,
      dayLabel,
      totalCalls: baseVolume,
      inbound,
      outbound,
      answered,
      missed,
      aiHandledRate: Number((97.2 + ((i % 3) * 0.8)).toFixed(1)),
    });

    // Talk Time factors
    const sdrAvg = 230 + ((i * 11) % 45); // ~3m 50s - 4m 35s
    const supportAvg = 310 + ((i * 9) % 60); // ~5m 10s - 6m 10s
    const receptionAvg = 135 + ((i * 7) % 25); // ~2m 15s - 2m 40s
    const overallAvg = Math.round((sdrAvg * 0.5) + (receptionAvg * 0.3) + (supportAvg * 0.2));

    talkTimePoints.push({
      date: dateStr,
      dayLabel,
      avgDurationSec: overallAvg,
      avgDurationFormatted: formatDuration(overallAvg),
      targetDurationSec: 210, // 3.5 min benchmark
      sdrAvgSec: sdrAvg,
      supportAvgSec: supportAvg,
      receptionAvgSec: receptionAvg,
    });

    // Conversion rate factors
    const totalConversations = Math.round(baseVolume * 0.65);
    const qualifiedBantCount = Math.round(totalConversations * (0.58 + ((i % 5) * 0.02)));
    const demosBookedCount = Math.round(qualifiedBantCount * (0.52 + ((i % 4) * 0.03)));
    const qualificationRate = Number(((qualifiedBantCount / totalConversations) * 100).toFixed(1));
    const demoConversionRate = Number(((demosBookedCount / totalConversations) * 100).toFixed(1));
    const pipelineValueGenerated = demosBookedCount * (24000 + ((i * 1250) % 8000));

    conversionPoints.push({
      date: dateStr,
      dayLabel,
      totalConversations,
      qualifiedBantCount,
      demosBookedCount,
      qualificationRate,
      demoConversionRate,
      pipelineValueGenerated,
    });
  }

  // Factor in actual calls recorded in the database today
  if (recentCalls.length > 0) {
    const todayStr = now.toISOString().split('T')[0];
    const todayVolume = volumePoints.find(p => p.date === todayStr);
    if (todayVolume) {
      todayVolume.totalCalls += recentCalls.length;
      todayVolume.inbound += recentCalls.filter(c => c.direction === 'inbound').length;
      todayVolume.outbound += recentCalls.filter(c => c.direction === 'outbound').length;
    }
  }

  // Agent Performance rows
  const defaultAgentRows: AgentPerformanceRow[] = [
    {
      agentId: 'agent-sdr-marcus',
      agentName: 'Marcus (AI SDR)',
      role: 'Sales Development',
      extension: '102',
      totalCalls: 482 + recentCalls.filter(c => c.agentId.includes('marcus')).length,
      avgTalkTimeSec: 254,
      avgTalkTimeFormatted: formatDuration(254),
      qualifiedLeads: 298,
      demosBooked: 168,
      conversionRate: 34.8,
      csatScore: 4.8,
    },
    {
      agentId: 'agent-receptionist-sophia',
      agentName: 'Sophia (Front Desk)',
      role: 'Inbound Concierge',
      extension: '101',
      totalCalls: 394 + recentCalls.filter(c => c.agentId.includes('sophia')).length,
      avgTalkTimeSec: 142,
      avgTalkTimeFormatted: formatDuration(142),
      qualifiedLeads: 215,
      demosBooked: 89,
      conversionRate: 22.6,
      csatScore: 4.9,
    },
    {
      agentId: 'agent-support-david',
      agentName: 'David (Tech Support)',
      role: 'Technical Support',
      extension: '103',
      totalCalls: 216 + recentCalls.filter(c => c.agentId.includes('david')).length,
      avgTalkTimeSec: 326,
      avgTalkTimeFormatted: formatDuration(326),
      qualifiedLeads: 42,
      demosBooked: 19,
      conversionRate: 8.8,
      csatScore: 4.7,
    },
    {
      agentId: 'agent-am-elena',
      agentName: 'Elena (Client Success)',
      role: 'Account Expansion',
      extension: '104',
      totalCalls: 158 + recentCalls.filter(c => c.agentId.includes('elena')).length,
      avgTalkTimeSec: 220,
      avgTalkTimeFormatted: formatDuration(220),
      qualifiedLeads: 96,
      demosBooked: 58,
      conversionRate: 36.7,
      csatScore: 4.9,
    },
    {
      agentId: 'agent-supervisor-victoria',
      agentName: 'Victoria (Supervisor)',
      role: 'Quality Assurance',
      extension: '100',
      totalCalls: 78,
      avgTalkTimeSec: 365,
      avgTalkTimeFormatted: formatDuration(365),
      qualifiedLeads: 62,
      demosBooked: 38,
      conversionRate: 48.7,
      csatScore: 5.0,
    },
  ];

  // Funnel calculation
  const totalCallsCount = volumePoints.reduce((acc, p) => acc + p.totalCalls, 0);
  const totalConversationsCount = conversionPoints.reduce((acc, p) => acc + p.totalConversations, 0);
  const totalQualifiedCount = conversionPoints.reduce((acc, p) => acc + p.qualifiedBantCount, 0);
  const totalDemosCount = conversionPoints.reduce((acc, p) => acc + p.demosBookedCount, 0);
  const totalWonDeals = Math.round(totalDemosCount * 0.42);

  const conversionFunnel: ConversionFunnelStage[] = [
    { stage: 'Total Call Sessions', count: totalCallsCount, percentage: 100, fill: '#6366f1' },
    { stage: 'Connected Conversations', count: totalConversationsCount, percentage: Number(((totalConversationsCount / totalCallsCount) * 100).toFixed(1)), fill: '#3b82f6' },
    { stage: 'BANT Qualified Leads', count: totalQualifiedCount, percentage: Number(((totalQualifiedCount / totalCallsCount) * 100).toFixed(1)), fill: '#8b5cf6' },
    { stage: 'Demos Booked', count: totalDemosCount, percentage: Number(((totalDemosCount / totalCallsCount) * 100).toFixed(1)), fill: '#10b981' },
    { stage: 'Closed Won Pipeline', count: totalWonDeals, percentage: Number(((totalWonDeals / totalCallsCount) * 100).toFixed(1)), fill: '#06b6d4' },
  ];

  const kpis = calculateAnalyticsKPIs(volumePoints, talkTimePoints, conversionPoints);

  return {
    periodDays: days,
    kpis,
    callVolumeTrend: volumePoints,
    talkTimeTrend: talkTimePoints,
    conversionTrend: conversionPoints,
    agentPerformance: defaultAgentRows,
    conversionFunnel,
  };
}
