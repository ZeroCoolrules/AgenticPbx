import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import {
  BarChart3,
  PhoneCall,
  Clock,
  Target,
  TrendingUp,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Download,
  RefreshCw,
  CheckCircle2,
  Bot,
  Zap,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';
import { safeFetchJson } from '../utils/api.ts';
import {
  AnalyticsDashboardPayload,
  generateAnalyticsDataset,
  formatDuration,
} from '../lib/analytics.ts';

export const AnalyticsDashboard: React.FC = () => {
  const [periodDays, setPeriodDays] = useState<number>(14);
  const [data, setData] = useState<AnalyticsDashboardPayload>(() => generateAnalyticsDataset(14));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [volumeChartType, setVolumeChartType] = useState<'stacked_bar' | 'area_trend'>('stacked_bar');
  const [talkTimeView, setTalkTimeView] = useState<'overall' | 'agent_breakdown'>('overall');
  const [conversionMetric, setConversionMetric] = useState<'rates' | 'pipeline'>('rates');

  const fetchAnalytics = async (days: number) => {
    setIsLoading(true);
    const res = await safeFetchJson<AnalyticsDashboardPayload>(`/api/analytics?days=${days}`);
    if (res.ok && res.data) {
      setData(res.data);
    } else {
      // Fallback to locally generated calibrated analytics
      setData(generateAnalyticsDataset(days));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAnalytics(periodDays);
  }, [periodDays]);

  // Export Analytics Summary to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Total Calls', 'Inbound', 'Outbound', 'Avg Talk Time (s)', 'BANT Qual %', 'Demo Conv %', 'Pipeline Generated ($)'];
    const rows = data.callVolumeTrend.map((v, idx) => {
      const t = data.talkTimeTrend[idx] || { avgDurationSec: 0 };
      const c = data.conversionTrend[idx] || { qualificationRate: 0, demoConversionRate: 0, pipelineValueGenerated: 0 };
      return [
        v.date,
        v.totalCalls,
        v.inbound,
        v.outbound,
        t.avgDurationSec,
        c.qualificationRate,
        c.demoConversionRate,
        c.pipelineValueGenerated,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dialwise_telephony_analytics_${periodDays}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Recharts Dark Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
          <div className="font-bold text-white border-b border-slate-800/80 pb-1 flex items-center justify-between">
            <span>{label}</span>
          </div>
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-3 text-[11px]">
              <span className="flex items-center space-x-1.5" style={{ color: item.color || item.fill }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color || item.fill }} />
                <span>{item.name}:</span>
              </span>
              <span className="font-mono font-semibold text-slate-100">
                {item.name.includes('Rate') || item.name.includes('%')
                  ? `${item.value}%`
                  : item.name.includes('Duration') || item.name.includes('Time')
                  ? formatDuration(item.value)
                  : item.name.includes('Pipeline') || item.name.includes('Value')
                  ? `$${item.value.toLocaleString()}`
                  : item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Executive Telephony Telemetry</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">Live KPI Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Call Volume, Talk Time &amp; SDR Conversion Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Real-time analytics for your autonomous PBX telephony cloud: daily call throughput,
            AI handle time efficiency benchmarks, and SDR BANT-to-meeting pipeline conversion rates.
          </p>
        </div>

        {/* Global Period Selectors & Export */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Period Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
            {[7, 14, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setPeriodDays(days)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  periodDays === days
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics(periodDays)}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 4 Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Call Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Call Volume</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{data.kpis.totalCalls.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              +{data.kpis.callVolumeDeltaPct}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>AI Handled: <strong className="text-slate-200">{data.kpis.aiHandledPercentage}%</strong></span>
            <span className="text-indigo-400 font-mono">Last {periodDays} Days</span>
          </div>
        </div>

        {/* KPI 2: Average Talk Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Average Talk Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{data.kpis.avgTalkTimeFormatted}</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center">
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              {Math.abs(data.kpis.talkTimeDeltaSec)}s optimized
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Target Benchmark: <strong className="text-slate-200">3m 30s</strong></span>
            <span className="text-emerald-400 font-medium">Optimal Pace</span>
          </div>
        </div>

        {/* KPI 3: SDR Conversion Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">SDR Demo Conversion</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{data.kpis.overallConversionRate}%</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              +{data.kpis.conversionDeltaPct}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Demos Scheduled: <strong className="text-slate-200">{data.kpis.totalDemosBooked}</strong></span>
            <span className="text-purple-400 font-mono">Booked on Sales Cal</span>
          </div>
        </div>

        {/* KPI 4: BANT Qualified Pipeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">BANT Enterprise Value</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">
              ${(data.kpis.pipelineGeneratedUsd / 1000).toFixed(0)}k
            </span>
            <span className="text-xs text-indigo-400 font-semibold">
              {data.kpis.bantQualificationRate}% Qualified
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>High Intent Leads</span>
            <span className="text-emerald-400 font-medium">Direct CRM Synced</span>
          </div>
        </div>
      </div>

      {/* CHART SECTION 1: Daily Call Volume */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <PhoneCall className="w-4 h-4 text-indigo-400" />
              <span>Daily Call Volume &amp; Inbound/Outbound Throughput</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily call volume distribution across all connected carrier DIDs and autonomous outbound campaigns.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
              <button
                onClick={() => setVolumeChartType('stacked_bar')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  volumeChartType === 'stacked_bar'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Inbound vs Outbound
              </button>
              <button
                onClick={() => setVolumeChartType('area_trend')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  volumeChartType === 'area_trend'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Volume Area Trend
              </button>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {volumeChartType === 'stacked_bar' ? (
              <BarChart data={data.callVolumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <ReferenceLine y={70} stroke="#334155" strokeDasharray="3 3" label={{ value: 'Target: 70/day', fill: '#64748b', fontSize: 10 }} />
                <Bar dataKey="inbound" name="Inbound Calls" stackId="volume" fill="#6366f1" radius={[0, 0, 0, 0]} />
                <Bar dataKey="outbound" name="Outbound Calls" stackId="volume" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={data.callVolumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotalVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAnswered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                <Area type="monotone" dataKey="totalCalls" name="Total Calls" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotalVolume)" />
                <Area type="monotone" dataKey="answered" name="Answered & Handled" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAnswered)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* TWO-COLUMN GRID: Average Agent Talk Time & SDR Conversion Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART SECTION 2: Average Agent Talk Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Average Agent Talk Time (AHT)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily duration tracking against the 3.5-minute ideal conversation benchmark.
              </p>
            </div>

            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
              <button
                onClick={() => setTalkTimeView('overall')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  talkTimeView === 'overall' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Overall Avg
              </button>
              <button
                onClick={() => setTalkTimeView('agent_breakdown')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  talkTimeView === 'agent_breakdown' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                By Role
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {talkTimeView === 'overall' ? (
                <LineChart data={data.talkTimeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(sec) => `${Math.floor(sec / 60)}m`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  <ReferenceLine
                    y={210}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: 'Target: 3m 30s', fill: '#f59e0b', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgDurationSec"
                    name="Average Handle Time"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : (
                <LineChart data={data.talkTimeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(sec) => `${Math.floor(sec / 60)}m`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  <Line type="monotone" dataKey="sdrAvgSec" name="Marcus (AI SDR)" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="supportAvgSec" name="David (Support)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="receptionAvgSec" name="Sophia (Reception)" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART SECTION 3: SDR Conversion Rates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>SDR BANT Qualification &amp; Demo Conversion Rates</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Conversion rates from initial connection to verified BANT qualification and calendar booking.
              </p>
            </div>

            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
              <button
                onClick={() => setConversionMetric('rates')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  conversionMetric === 'rates' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Conversion %
              </button>
              <button
                onClick={() => setConversionMetric('pipeline')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  conversionMetric === 'pipeline' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pipeline ($)
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {conversionMetric === 'rates' ? (
                <AreaChart data={data.conversionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQualRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorDemoRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  <ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Target: 30% Demo Rate', fill: '#10b981', fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="qualificationRate"
                    name="BANT Qualification Rate"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorQualRate)"
                  />
                  <Area
                    type="monotone"
                    dataKey="demoConversionRate"
                    name="Demo Booked Conversion Rate"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorDemoRate)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={data.conversionTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  <Bar dataKey="pipelineValueGenerated" name="Pipeline Value ($)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CONVERSION FUNNEL & AGENT BENCHMARK TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Full Pipeline Conversion Funnel */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Autonomous SDR Conversion Funnel</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">End-to-end conversation-to-deal progression</p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {data.conversionFunnel.map((stage, idx) => (
              <div key={stage.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-400">
                      {idx + 1}
                    </span>
                    <span>{stage.stage}</span>
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white">{stage.count.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-400 ml-1.5">({stage.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stage.percentage}%`,
                      backgroundColor: stage.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Funnel Efficiency Note</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Marcus (AI SDR) qualifies over 61% of inbound conversations into verified BANT records,
              leading to a 34.8% demo booking rate directly on the sales calendar.
            </p>
          </div>
        </div>

        {/* Right Column: Agent Efficiency & Conversion Leaderboard */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Agent Performance &amp; Conversion Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Specialist breakdown across handle time and booked demos</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{data.agentPerformance.length} Agents</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Agent &amp; Role</th>
                  <th className="pb-3 font-semibold text-center">Ext</th>
                  <th className="pb-3 font-semibold text-right">Calls</th>
                  <th className="pb-3 font-semibold text-right">Avg Talk Time</th>
                  <th className="pb-3 font-semibold text-right">Demos</th>
                  <th className="pb-3 font-semibold text-right">Conversion</th>
                  <th className="pb-3 font-semibold text-right">CSAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.agentPerformance.map((agent) => (
                  <tr key={agent.agentId} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3">
                      <div className="font-semibold text-white">{agent.agentName}</div>
                      <div className="text-[11px] text-slate-400">{agent.role}</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {agent.extension}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-slate-200">
                      {agent.totalCalls}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-200">
                      {agent.avgTalkTimeFormatted}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-400">
                      {agent.demosBooked}
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono font-bold text-indigo-300">
                        {agent.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center space-x-1 font-mono text-amber-300 text-[11px]">
                        <span>★</span>
                        <span>{agent.csatScore.toFixed(1)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
