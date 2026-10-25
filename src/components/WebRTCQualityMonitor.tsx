import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  Activity,
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Play,
  Pause,
  Server,
  Zap,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { WebRTCQualityPoint } from '../types/index.ts';
import { calculateMOS, evaluateNetworkQuality, generateInitialTelemetry } from '../lib/telemetry.ts';

interface WebRTCQualityMonitorProps {
  isCallActive?: boolean;
}

export type NetworkSimulationMode = 'normal' | 'wifi_jitter' | 'high_congestion' | 'eu_carrier';

export const WebRTCQualityMonitor: React.FC<WebRTCQualityMonitorProps> = ({ isCallActive = false }) => {
  const [dataPoints, setDataPoints] = useState<WebRTCQualityPoint[]>(() => generateInitialTelemetry(24));
  const [isPaused, setIsPaused] = useState(false);
  const [simulationMode, setSimulationMode] = useState<NetworkSimulationMode>('normal');
  const [activeTab, setActiveTab] = useState<'jitter_loss' | 'latency_mos'>('jitter_loss');

  const simulationRef = useRef(simulationMode);
  simulationRef.current = simulationMode;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Real-time ticking stream every 1.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPausedRef.current) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let baseJitter = 8;
      let baseLoss = 0.15;
      let baseRtt = isCallActive ? 38 : 30;

      const mode = simulationRef.current;
      if (mode === 'wifi_jitter') {
        baseJitter = 34 + Math.random() * 12;
        baseLoss = 1.8 + Math.random() * 1.4;
        baseRtt = 68 + Math.random() * 15;
      } else if (mode === 'high_congestion') {
        baseJitter = 56 + Math.random() * 20;
        baseLoss = 5.2 + Math.random() * 3.2;
        baseRtt = 185 + Math.random() * 30;
      } else if (mode === 'eu_carrier') {
        baseJitter = 12 + Math.random() * 4;
        baseLoss = 0.2 + Math.random() * 0.2;
        baseRtt = 105 + Math.random() * 10;
      } else {
        // Normal direct connect
        baseJitter = (isCallActive ? 9.5 : 8.0) + (Math.random() * 3 - 1.5);
        baseLoss = (isCallActive ? 0.22 : 0.12) + Math.random() * 0.1;
        baseRtt = (isCallActive ? 36 : 28) + (Math.random() * 4 - 2);
      }

      const jitterMs = Math.round(Math.max(1, baseJitter) * 10) / 10;
      const packetLossPercent = Math.round(Math.max(0, baseLoss) * 100) / 100;
      const rttMs = Math.round(Math.max(5, baseRtt));
      const mosResult = calculateMOS(rttMs, jitterMs, packetLossPercent);
      const bitrateKbps = Math.round(40 + (Math.random() * 2 - 1));

      const newPoint: WebRTCQualityPoint = {
        time: timeStr,
        timestamp: now.getTime(),
        jitterMs,
        packetLossPercent,
        rttMs,
        mosScore: mosResult.mos,
        bitrateKbps,
      };

      setDataPoints(prev => {
        const next = [...prev.slice(1), newPoint];
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isCallActive]);

  const latestPoint = dataPoints[dataPoints.length - 1] || {
    jitterMs: 8.5,
    packetLossPercent: 0.18,
    rttMs: 32,
    mosScore: 4.38,
    bitrateKbps: 40,
  };

  const networkQuality = evaluateNetworkQuality(
    latestPoint.jitterMs,
    latestPoint.packetLossPercent,
    latestPoint.rttMs
  );

  const mosEvaluation = calculateMOS(latestPoint.rttMs, latestPoint.jitterMs, latestPoint.packetLossPercent);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: WebRTCQualityPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs font-mono">
          <div className="text-slate-400 font-semibold mb-2 flex items-center justify-between border-b border-slate-800 pb-1">
            <span>RTP Packet Slice</span>
            <span className="text-indigo-400">{data.time}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-cyan-400">Jitter:</span>
              <span className="font-bold text-white">{data.jitterMs} ms</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-amber-400">Packet Loss:</span>
              <span className="font-bold text-white">{data.packetLossPercent} %</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-purple-400">RTT Latency:</span>
              <span className="font-bold text-white">{data.rttMs} ms</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-emerald-400">MOS Rating:</span>
              <span className="font-bold text-emerald-400">{data.mosScore} / 4.5</span>
            </div>
            <div className="flex items-center justify-between space-x-4 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
              <span>Opus Bitrate:</span>
              <span>{data.bitrateKbps} kbps</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center space-x-2">
                <span>Real-Time WebRTC Jitter &amp; Packet Loss Diagnostics</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
                    networkQuality === 'optimal'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : networkQuality === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  }`}
                >
                  {networkQuality === 'optimal'
                    ? '● Optimal (Toll Quality)'
                    : networkQuality === 'warning'
                    ? '▲ Degraded Buffer'
                    : '✖ Critical Impairment'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Continuous RTP audio packet arrival variance, drop rates, and ITU-T E-model MOS scoring.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Stream Pause/Resume and Network Condition Simulation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Simulation mode picker */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold px-2">Simulate:</span>
            <button
              onClick={() => setSimulationMode('normal')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                simulationMode === 'normal'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct Fiber
            </button>
            <button
              onClick={() => setSimulationMode('wifi_jitter')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                simulationMode === 'wifi_jitter'
                  ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Wi-Fi Jitter
            </button>
            <button
              onClick={() => setSimulationMode('high_congestion')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                simulationMode === 'high_congestion'
                  ? 'bg-rose-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Congestion (Drop 5%)
            </button>
            <button
              onClick={() => setSimulationMode('eu_carrier')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                simulationMode === 'eu_carrier'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EU Trunk (105ms)
            </button>
          </div>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              isPaused
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-slate-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* 4 Diagnostic Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Jitter */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Audio Jitter</span>
            <span
              className={`w-2 h-2 rounded-full ${
                latestPoint.jitterMs < 20
                  ? 'bg-cyan-400'
                  : latestPoint.jitterMs < 40
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold font-mono text-cyan-300">{latestPoint.jitterMs}</span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Buffer: 24ms</span>
            <span className={latestPoint.jitterMs > 30 ? 'text-amber-400' : 'text-slate-400'}>
              Target: &lt; 30ms
            </span>
          </div>
        </div>

        {/* Card 2: Packet Loss */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Packet Loss</span>
            <span
              className={`w-2 h-2 rounded-full ${
                latestPoint.packetLossPercent < 1.0
                  ? 'bg-emerald-400'
                  : latestPoint.packetLossPercent < 3.0
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold font-mono text-amber-300">{latestPoint.packetLossPercent}</span>
            <span className="text-xs text-slate-400 font-mono">%</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>RTP Dropped</span>
            <span className={latestPoint.packetLossPercent > 2.0 ? 'text-rose-400' : 'text-slate-400'}>
              Target: &lt; 1.0%
            </span>
          </div>
        </div>

        {/* Card 3: MOS Score */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Voice MOS Score</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-xl font-bold font-mono ${
                latestPoint.mosScore >= 4.0
                  ? 'text-emerald-400'
                  : latestPoint.mosScore >= 3.4
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {latestPoint.mosScore}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 4.5</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="capitalize">{mosEvaluation.rating} Quality</span>
            <span className="font-mono">R: {mosEvaluation.rFactor}</span>
          </div>
        </div>

        {/* Card 4: RTT Latency */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Round-Trip Time</span>
            <Radio className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold font-mono text-purple-300">{latestPoint.rttMs}</span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Edge Mesh</span>
            <span>Target: &lt; 100ms</span>
          </div>
        </div>
      </div>

      {/* Chart View Selector */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('jitter_loss')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'jitter_loss'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Jitter (ms) &amp; Packet Loss (%) Telemetry
          </button>
          <button
            onClick={() => setActiveTab('latency_mos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'latency_mos'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            RTT Latency (ms) &amp; MOS Quality Trend
          </button>
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block"></span>
            <span>Jitter (ms)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"></span>
            <span>Packet Loss (%)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span>
            <span>Warning Threshold</span>
          </span>
        </div>
      </div>

      {/* Recharts Area / Line Chart Container */}
      <div className="h-64 sm:h-72 w-full bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'jitter_loss' ? (
            <AreaChart data={dataPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="jitterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              {/* Left Y Axis for Jitter in ms */}
              <YAxis
                yAxisId="left"
                stroke="#22d3ee"
                tick={{ fontSize: 10, fill: '#22d3ee' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                domain={[0, (dataMax: number) => Math.max(40, Math.ceil(dataMax * 1.2))]}
                label={{ value: 'Jitter (ms)', angle: -90, position: 'insideLeft', fill: '#22d3ee', fontSize: 10 }}
              />
              {/* Right Y Axis for Packet Loss in % */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fontSize: 10, fill: '#f59e0b' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.3))]}
                label={{ value: 'Loss (%)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine yAxisId="left" y={30} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '30ms Warn', fill: '#f43f5e', fontSize: 9 }} />
              <ReferenceLine yAxisId="right" y={2.0} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '2% Loss Warn', fill: '#f59e0b', fontSize: 9 }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="jitterMs"
                stroke="#22d3ee"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#jitterGradient)"
                name="Jitter (ms)"
                isAnimationActive={false}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="packetLossPercent"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#lossGradient)"
                name="Packet Loss (%)"
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <LineChart data={dataPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#c084fc"
                tick={{ fontSize: 10, fill: '#c084fc' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax * 1.15))]}
                label={{ value: 'RTT (ms)', angle: -90, position: 'insideLeft', fill: '#c084fc', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#34d399"
                tick={{ fontSize: 10, fill: '#34d399' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                domain={[1.0, 4.5]}
                label={{ value: 'MOS Score', angle: 90, position: 'insideRight', fill: '#34d399', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine yAxisId="right" y={4.0} stroke="#34d399" strokeDasharray="3 3" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rttMs"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                name="RTT Latency (ms)"
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="mosScore"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={false}
                name="MOS Score"
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* WebRTC Carrier Diagnostics & Media Stream Specs Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2.5">
          <Server className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Audio Codec &amp; Sampling</div>
            <div className="font-mono text-white text-[11px]">Opus 48kHz (Fullband, DTX On)</div>
          </div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2.5">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">ICE Connection State</div>
            <div className="font-mono text-white text-[11px]">Completed (UDP Host-to-Srflx)</div>
          </div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2.5">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Active Carrier Gateway</div>
            <div className="font-mono text-white text-[11px]">US-East AWS DirectConnect (Primary)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
