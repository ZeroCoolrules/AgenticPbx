import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  calculateAnalyticsKPIs,
  generateAnalyticsDataset,
  DailyCallVolumePoint,
  DailyTalkTimePoint,
  SDRConversionPoint,
} from './analytics.ts';

test('formatDuration formats seconds to human-readable string', () => {
  assert.equal(formatDuration(0), '0m 00s');
  assert.equal(formatDuration(65), '1m 05s');
  assert.equal(formatDuration(210), '3m 30s');
  assert.equal(formatDuration(3600), '60m 00s');
});

test('calculateAnalyticsKPIs aggregates summary totals correctly', () => {
  const volumePoints: DailyCallVolumePoint[] = [
    {
      date: '2026-10-25',
      dayLabel: 'Oct 25',
      totalCalls: 100,
      inbound: 60,
      outbound: 40,
      answered: 95,
      missed: 5,
      aiHandledRate: 98.5,
    },
    {
      date: '2026-10-26',
      dayLabel: 'Oct 26',
      totalCalls: 50,
      inbound: 30,
      outbound: 20,
      answered: 48,
      missed: 2,
      aiHandledRate: 97.9,
    },
  ];

  const talkTimePoints: DailyTalkTimePoint[] = [
    {
      date: '2026-10-25',
      dayLabel: 'Oct 25',
      avgDurationSec: 200,
      avgDurationFormatted: '3m 20s',
      targetDurationSec: 210,
      sdrAvgSec: 240,
      supportAvgSec: 300,
      receptionAvgSec: 120,
    },
    {
      date: '2026-10-26',
      dayLabel: 'Oct 26',
      avgDurationSec: 230,
      avgDurationFormatted: '3m 50s',
      targetDurationSec: 210,
      sdrAvgSec: 250,
      supportAvgSec: 320,
      receptionAvgSec: 130,
    },
  ];

  const conversionPoints: SDRConversionPoint[] = [
    {
      date: '2026-10-25',
      dayLabel: 'Oct 25',
      totalConversations: 60,
      qualifiedBantCount: 36,
      demosBookedCount: 18,
      qualificationRate: 60.0,
      demoConversionRate: 30.0,
      pipelineValueGenerated: 150000,
    },
    {
      date: '2026-10-26',
      dayLabel: 'Oct 26',
      totalConversations: 40,
      qualifiedBantCount: 24,
      demosBookedCount: 16,
      qualificationRate: 60.0,
      demoConversionRate: 40.0,
      pipelineValueGenerated: 120000,
    },
  ];

  const kpis = calculateAnalyticsKPIs(volumePoints, talkTimePoints, conversionPoints);

  assert.equal(kpis.totalCalls, 150);
  assert.equal(kpis.totalDemosBooked, 34);
  assert.equal(kpis.overallConversionRate, 34.0); // 34 demos out of 100 conversations
  assert.equal(kpis.bantQualificationRate, 60.0); // 60 qualified out of 100 conversations
  assert.equal(kpis.pipelineGeneratedUsd, 270000);
});

test('generateAnalyticsDataset produces full payload for specified days', () => {
  const result7D = generateAnalyticsDataset(7);
  assert.equal(result7D.periodDays, 7);
  assert.equal(result7D.callVolumeTrend.length, 7);
  assert.equal(result7D.talkTimeTrend.length, 7);
  assert.equal(result7D.conversionTrend.length, 7);
  assert.ok(result7D.agentPerformance.length >= 4);
  assert.equal(result7D.conversionFunnel.length, 5);

  const result30D = generateAnalyticsDataset(30);
  assert.equal(result30D.callVolumeTrend.length, 30);
  assert.ok(result30D.kpis.totalCalls > 0);
  assert.ok(result30D.kpis.overallConversionRate > 0);
});
