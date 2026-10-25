/**
 * WebRTC Telemetry, Jitter, Packet Loss, and ITU-T E-model MOS calculations
 */

export interface MOSResult {
  mos: number; // 1.0 to 4.5
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  rFactor: number;
}

/**
 * Calculates ITU-T E-model R-factor and converts to Mean Opinion Score (MOS)
 * @param rttMs Round-trip latency in milliseconds
 * @param jitterMs Packet arrival jitter in milliseconds
 * @param packetLossPercent Percentage of dropped packets (0 to 100)
 */
export function calculateMOS(rttMs: number, jitterMs: number, packetLossPercent: number): MOSResult {
  const safeRtt = Math.max(0, rttMs);
  const safeJitter = Math.max(0, jitterMs);
  const safeLoss = Math.min(100, Math.max(0, packetLossPercent));

  // Effective round-trip latency including jitter buffer delay
  const effectiveLatency = safeRtt + safeJitter * 2 + 10;

  // Base R-factor
  let rFactor = 93.2;

  if (effectiveLatency < 160) {
    rFactor -= effectiveLatency / 40;
  } else {
    rFactor -= (effectiveLatency - 120) / 10;
  }

  // Deduct packet loss impairment (burst loss curve)
  rFactor -= safeLoss * 2.6;

  rFactor = Math.max(0, Math.min(100, rFactor));

  // ITU-T G.107 standard polynomial conversion from R to MOS
  let mos = 1.0;
  if (rFactor <= 0) {
    mos = 1.0;
  } else if (rFactor >= 100) {
    mos = 4.5;
  } else {
    mos = 1 + 0.035 * rFactor + rFactor * (100 - rFactor) * (rFactor - 60) * 0.000007;
  }

  const roundedMos = Math.round(Math.min(4.5, Math.max(1.0, mos)) * 100) / 100;

  let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Poor';
  if (roundedMos >= 4.1) {
    rating = 'Excellent';
  } else if (roundedMos >= 3.6) {
    rating = 'Good';
  } else if (roundedMos >= 3.0) {
    rating = 'Fair';
  } else {
    rating = 'Poor';
  }

  return {
    mos: roundedMos,
    rating,
    rFactor: Math.round(rFactor * 10) / 10,
  };
}

/**
 * Evaluates network severity status based on WebRTC thresholds
 */
export function evaluateNetworkQuality(
  jitterMs: number,
  packetLossPercent: number,
  rttMs: number
): 'optimal' | 'warning' | 'critical' {
  if (packetLossPercent >= 4.0 || jitterMs >= 45 || rttMs >= 220) {
    return 'critical';
  }
  if (packetLossPercent >= 1.5 || jitterMs >= 25 || rttMs >= 110) {
    return 'warning';
  }
  return 'optimal';
}

/**
 * Generates initial synthetic historical points for WebRTC telemetry
 */
export function generateInitialTelemetry(count = 20): Array<{
  time: string;
  timestamp: number;
  jitterMs: number;
  packetLossPercent: number;
  rttMs: number;
  mosScore: number;
  bitrateKbps: number;
}> {
  const points = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * 2000);
    const timeStr = t.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    // Stable low jitter ~6-14ms, packet loss ~0.1-0.4%, RTT ~28-42ms
    const jitterMs = Math.round((8 + Math.sin(i * 0.5) * 4 + (Math.random() * 2 - 1)) * 10) / 10;
    const packetLossPercent = Math.round((0.2 + (i % 5 === 0 ? 0.3 : 0) + Math.random() * 0.15) * 100) / 100;
    const rttMs = Math.round(32 + Math.cos(i * 0.4) * 6 + Math.random() * 3);
    const mosRes = calculateMOS(rttMs, jitterMs, packetLossPercent);
    const bitrateKbps = Math.round(40 + Math.sin(i * 0.3) * 2);

    points.push({
      time: timeStr,
      timestamp: t.getTime(),
      jitterMs,
      packetLossPercent,
      rttMs,
      mosScore: mosRes.mos,
      bitrateKbps,
    });
  }
  return points;
}
