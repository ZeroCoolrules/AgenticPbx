import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBANTScore, determineLeadStage, resolveCallRoute, evaluateSentiment } from './scoring.ts';

test('calculateBANTScore qualifies high-intent enterprise prospect', () => {
  const result = calculateBANTScore({
    budget: 'High',
    authority: 'Decision Maker',
    need: 'We need to deploy an automated AI SDR system for 100 sales reps within 30 days',
    timeline: 'Immediate (< 30d)',
  });

  assert.equal(result.score, 100);
  assert.equal(result.isQualified, true);
});

test('calculateBANTScore disqualifies unknown authority and low budget', () => {
  const result = calculateBANTScore({
    budget: 'Low',
    authority: 'Unknown',
    need: 'Just curious',
    timeline: 'Uncertain',
  });

  assert.equal(result.isQualified, false);
  assert.ok(result.score < 30);
});

test('determineLeadStage properly assigns stages', () => {
  assert.equal(determineLeadStage('new', 85, true), 'demo_booked');
  assert.equal(determineLeadStage('new', 80, false), 'sql');
  assert.equal(determineLeadStage('new', 55, false), 'mql');
  assert.equal(determineLeadStage('contacted', 15, false), 'disqualified');
});

test('resolveCallRoute routes to correct available extension and agent', () => {
  const dids = [
    { number: '+15550194820', assignedAgentId: 'agent-sdr-marcus', assignedExtension: '102', status: 'active' },
    { number: '+15550194899', assignedAgentId: 'agent-inactive', assignedExtension: '999', status: 'suspended' },
  ];
  const extensions = [
    { extensionNumber: '102', status: 'available' },
    { extensionNumber: '101', status: 'available' },
  ];

  const route1 = resolveCallRoute('+15550194820', dids, extensions);
  assert.equal(route1.targetExtension, '102');
  assert.equal(route1.agentId, 'agent-sdr-marcus');
  assert.equal(route1.routedSuccessfully, true);

  const routeSuspended = resolveCallRoute('+15550194899', dids, extensions);
  assert.equal(routeSuspended.routedSuccessfully, false);
});

test('evaluateSentiment detects critical and positive signals', () => {
  assert.equal(evaluateSentiment('I love this, we are ready to buy and want to book a demo'), 'positive');
  assert.equal(evaluateSentiment('I am talking to my lawyer this is unacceptable'), 'critical');
  assert.equal(evaluateSentiment('Just checking if you support SIP trunking'), 'neutral');
});
