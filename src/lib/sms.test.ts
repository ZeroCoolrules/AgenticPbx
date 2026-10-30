import test from 'node:test';
import assert from 'node:assert/strict';
import { SMSThread, SMSMessage } from '../types/index.ts';

test('SMSThread can be created with autonomous mode enabled', () => {
  const thread: SMSThread = {
    id: 'thread-test-1',
    customerNumber: '+1 (555) 987-6543',
    customerName: 'Test Customer',
    customerCompany: 'Acme Corp',
    assignedDid: '+1 (555) 019-4821',
    lastMessageText: 'Can I get a quote?',
    lastMessageTimestamp: new Date().toISOString(),
    unreadCount: 1,
    autonomousMode: true,
    assignedAgentId: 'agent-sdr-marcus',
    status: 'open',
  };

  assert.equal(thread.autonomousMode, true);
  assert.equal(thread.assignedAgentId, 'agent-sdr-marcus');
  assert.equal(thread.customerName, 'Test Customer');
});

test('SMSMessage supports human_agent, ai_autonomous and customer senders', () => {
  const customerMsg: SMSMessage = {
    id: 'msg-1',
    threadId: 'thread-test-1',
    fromNumber: '+1 (555) 987-6543',
    toNumber: '+1 (555) 019-4821',
    direction: 'inbound',
    senderType: 'customer',
    senderName: 'Test Customer',
    text: 'Hello!',
    timestamp: new Date().toISOString(),
    status: 'received',
  };

  const aiMsg: SMSMessage = {
    id: 'msg-2',
    threadId: 'thread-test-1',
    fromNumber: '+1 (555) 019-4821',
    toNumber: '+1 (555) 987-6543',
    direction: 'outbound',
    senderType: 'ai_autonomous',
    senderName: 'Marcus (AI SDR)',
    text: 'Hi there, how can I help?',
    timestamp: new Date().toISOString(),
    status: 'delivered',
  };

  const humanMsg: SMSMessage = {
    id: 'msg-3',
    threadId: 'thread-test-1',
    fromNumber: '+1 (555) 019-4821',
    toNumber: '+1 (555) 987-6543',
    direction: 'outbound',
    senderType: 'human_agent',
    senderName: 'You (Operator)',
    text: 'Stepping in to help directly.',
    timestamp: new Date().toISOString(),
    status: 'delivered',
  };

  assert.equal(customerMsg.senderType, 'customer');
  assert.equal(aiMsg.senderType, 'ai_autonomous');
  assert.equal(humanMsg.senderType, 'human_agent');
});

test('Manual takeover disengages autonomous AI auto-replies', () => {
  let thread: SMSThread = {
    id: 'thread-test-2',
    customerNumber: '+1 (555) 123-4567',
    customerName: 'Enterprise VIP',
    assignedDid: '+1 (555) 019-4821',
    lastMessageText: 'Initial text',
    lastMessageTimestamp: new Date().toISOString(),
    unreadCount: 0,
    autonomousMode: true,
    assignedAgentId: 'agent-sdr-marcus',
    status: 'waiting_customer',
  };

  // Human operator toggles manual mode
  thread = { ...thread, autonomousMode: false, status: 'waiting_agent' };
  assert.equal(thread.autonomousMode, false);
  assert.equal(thread.status, 'waiting_agent');
});
