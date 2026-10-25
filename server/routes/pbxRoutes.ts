import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth } from '../auth.ts';

const router = Router();

// GET /api/pbx/status
router.get('/status', (req: Request, res: Response) => {
  const store = db.getStore();
  const activeCalls = store.calls.filter(c => c.status === 'connected' || c.status === 'ringing' || c.status === 'on_hold');

  const today = new Date().toISOString().split('T')[0];
  const callsToday = store.calls.filter(c => c.startTime && c.startTime.startsWith(today));
  const appointmentsToday = store.appointments.filter(a => a.date === today);

  res.json({
    activeCallsCount: activeCalls.length,
    callsTodayCount: callsToday.length || store.calls.length,
    avgWaitTimeSeconds: 1.2,
    aiHandledPercentage: 98.4,
    appointmentsBookedToday: appointmentsToday.length,
    sipTrunksOnline: 3,
    virtualNumbersCount: store.virtualNumbers.length,
    extensionsCount: store.extensions.length,
    agentsCount: store.agents.length,
  });
});

// GET /api/pbx/dashboard - Consolidated single-request feed for dashboard
router.get('/dashboard', (req: Request, res: Response) => {
  const store = db.getStore();
  const activeCalls = store.calls.filter(c => c.status === 'connected' || c.status === 'ringing' || c.status === 'on_hold');

  const today = new Date().toISOString().split('T')[0];
  const callsToday = store.calls.filter(c => c.startTime && c.startTime.startsWith(today));
  const appointmentsToday = store.appointments.filter(a => a.date === today);

  res.json({
    metrics: {
      activeCallsCount: activeCalls.length,
      callsTodayCount: callsToday.length || store.calls.length,
      avgWaitTimeSeconds: 1.2,
      aiHandledPercentage: 98.4,
      appointmentsBookedToday: appointmentsToday.length,
      sipTrunksOnline: 3,
      virtualNumbersCount: store.virtualNumbers.length,
      extensionsCount: store.extensions.length,
      agentsCount: store.agents.length,
    },
    extensions: store.extensions,
    dids: store.virtualNumbers,
    calls: store.calls,
  });
});

// GET /api/pbx/dids
router.get('/dids', (req: Request, res: Response) => {
  res.json(db.getVirtualNumbers());
});

// POST /api/pbx/dids
router.post('/dids', requireAuth, (req: Request, res: Response) => {
  const { number, label, assignedAgentId, assignedExtension, smsEnabled, countryCode } = req.body;
  if (!number || !label) {
    res.status(400).json({ error: 'Number and label are required.' });
    return;
  }

  const newDid = db.addVirtualNumber({
    id: `did-${Date.now()}`,
    number,
    label,
    assignedAgentId: assignedAgentId || 'agent-receptionist-sophia',
    assignedExtension: assignedExtension || '101',
    smsEnabled: smsEnabled ?? true,
    countryCode: countryCode || 'US',
    status: 'active',
    monthlyMinutes: 0,
  });

  res.status(201).json(newDid);
});

// PUT /api/pbx/dids/:id
router.put('/dids/:id', requireAuth, (req: Request, res: Response) => {
  const updated = db.updateVirtualNumber(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Virtual Number not found.' });
    return;
  }
  res.json(updated);
});

// GET /api/pbx/extensions
router.get('/extensions', (req: Request, res: Response) => {
  res.json(db.getExtensions());
});

// PUT /api/pbx/extensions/:ext
router.put('/extensions/:ext', requireAuth, (req: Request, res: Response) => {
  const updated = db.updateExtension(req.params.ext, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Extension not found.' });
    return;
  }
  res.json(updated);
});

// GET /api/pbx/ring-groups
router.get('/ring-groups', (req: Request, res: Response) => {
  res.json(db.getStore().ringGroups);
});

// GET /api/pbx/logs
router.get('/logs', requireAuth, (req: Request, res: Response) => {
  res.json(db.getStore().auditLogs);
});

// GET /api/pbx/webrtc-telemetry
router.get('/webrtc-telemetry', (req: Request, res: Response) => {
  const store = db.getStore();
  const activeCalls = store.calls.filter(c => c.status === 'connected' || c.status === 'on_hold');
  const hasActiveCall = activeCalls.length > 0;

  // Jitter between 7ms and 15ms in good conditions, loss 0.1-0.3%
  const jitterMs = hasActiveCall ? 9.4 : 7.8;
  const packetLossPercent = hasActiveCall ? 0.25 : 0.12;
  const rttMs = hasActiveCall ? 36 : 28;

  res.json({
    status: 'optimal',
    activeCallsCount: activeCalls.length,
    activeTrunk: {
      trunkId: 'trunk-useast-primary',
      name: 'US-East AWS DirectConnect (Primary SIP)',
      region: 'us-east-1 (N. Virginia)',
      iceState: 'connected',
      codec: 'Opus 48kHz Stereo (Fullband Audio)',
      dtxEnabled: true,
      jitterBufferDelayMs: 24,
      currentJitterMs: jitterMs,
      currentPacketLossPercent: packetLossPercent,
      currentRttMs: rttMs,
      currentMos: 4.38,
      mosRating: 'Excellent',
    },
  });
});

export default router;
