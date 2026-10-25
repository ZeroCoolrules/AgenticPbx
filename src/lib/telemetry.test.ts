import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMOS, evaluateNetworkQuality, generateInitialTelemetry } from './telemetry.ts';

test('calculateMOS returns high score (Excellent) for low latency and zero packet loss', () => {
  const result = calculateMOS(25, 5, 0.0);
  assert.ok(result.mos >= 4.2);
  assert.equal(result.rating, 'Excellent');
});

test('calculateMOS degrades significantly when packet loss and high jitter occur', () => {
  const result = calculateMOS(180, 55, 6.5);
  assert.ok(result.mos < 3.2);
  assert.ok(result.rating === 'Fair' || result.rating === 'Poor');
});

test('evaluateNetworkQuality marks high thresholds as critical', () => {
  assert.equal(evaluateNetworkQuality(10, 0.2, 35), 'optimal');
  assert.equal(evaluateNetworkQuality(28, 1.8, 80), 'warning');
  assert.equal(evaluateNetworkQuality(52, 4.8, 240), 'critical');
});

test('generateInitialTelemetry produces expected points count and schema', () => {
  const points = generateInitialTelemetry(15);
  assert.equal(points.length, 15);
  assert.ok(typeof points[0].jitterMs === 'number');
  assert.ok(typeof points[0].packetLossPercent === 'number');
  assert.ok(typeof points[0].mosScore === 'number');
  assert.ok(points[0].mosScore >= 1.0 && points[0].mosScore <= 4.5);
});
