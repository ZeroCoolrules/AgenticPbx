import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth } from '../auth.ts';
import { CRMLead, CalendarAppointment, OutboundCampaign } from '../../src/types/index.ts';

const router = Router();

// GET /api/crm/leads
router.get('/leads', (req: Request, res: Response) => {
  res.json(db.getLeads());
});

// POST /api/crm/leads
router.post('/leads', requireAuth, (req: Request, res: Response) => {
  const { name, company, email, phone, title, dealSize, status, notes } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required.' });
    return;
  }

  const newLead: CRMLead = {
    id: `lead-${Date.now()}`,
    name,
    company: company || 'Self-Employed',
    email,
    phone: phone || '+1 (555) 000-0000',
    title: title || 'Executive',
    status: status || 'new',
    dealSize: dealSize || 15000,
    score: 50,
    bant: {
      budget: 'Medium',
      budgetDetails: 'Estimated initial deal',
      authority: 'Decision Maker',
      need: 'Automated PBX and Sales Calling',
      timeline: '1-3 months',
      score: 50,
      isQualified: false,
      notes: 'Manually created lead',
    },
    source: 'Manual Entry',
    assignedAgent: 'Marcus (AI SDR)',
    lastContactDate: new Date().toISOString(),
    notes: notes ? [notes] : ['Lead registered into CRM.'],
    callIds: [],
  };

  db.createLead(newLead);
  res.status(201).json(newLead);
});

// PUT /api/crm/leads/:id
router.put('/leads/:id', requireAuth, (req: Request, res: Response) => {
  const updated = db.updateLead(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Lead not found.' });
    return;
  }
  res.json(updated);
});

// GET /api/crm/appointments
router.get('/appointments', (req: Request, res: Response) => {
  res.json(db.getAppointments());
});

// POST /api/crm/appointments
router.post('/appointments', requireAuth, (req: Request, res: Response) => {
  const { leadName, leadCompany, leadEmail, title, date, timeSlot, agentId, notes } = req.body;

  const newApt: CalendarAppointment = {
    id: `apt-${Date.now()}`,
    leadId: `lead-${Date.now()}`,
    leadName: leadName || 'Enterprise Lead',
    leadCompany: leadCompany || 'Client Org',
    leadEmail: leadEmail || 'client@example.com',
    title: title || 'DialWise Architecture & AI SDR Consultation',
    date: date || new Date().toISOString().split('T')[0],
    timeSlot: timeSlot || '14:00 EST',
    agentId: agentId || 'agent-sdr-marcus',
    meetingLink: `https://meet.dialwise.io/room-${Math.random().toString(36).substring(2, 8)}`,
    status: 'confirmed',
    notes: notes || 'Scheduled via CRM portal.',
  };

  db.createAppointment(newApt);
  res.status(201).json(newApt);
});

// GET /api/crm/campaigns
router.get('/campaigns', (req: Request, res: Response) => {
  res.json(db.getCampaigns());
});

// POST /api/crm/campaigns
router.post('/campaigns', requireAuth, (req: Request, res: Response) => {
  const { name, agentId, targetAudience, scriptGoal, leadIds } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Campaign name is required.' });
    return;
  }

  const allLeads = db.getLeads();
  const selectedLeadIds = leadIds && leadIds.length > 0 ? leadIds : allLeads.slice(0, 5).map(l => l.id);

  const newCampaign: OutboundCampaign = {
    id: `cmp-${Date.now()}`,
    name,
    agentId: agentId || 'agent-sdr-marcus',
    status: 'draft',
    targetAudience: targetAudience || 'Sales leadership in high-growth companies',
    scriptGoal: scriptGoal || 'Introduce AI PBX, qualify inbound/outbound volume, book meeting.',
    leadIds: selectedLeadIds,
    dialsCount: 0,
    connectedCount: 0,
    qualifiedCount: 0,
    appointmentsCount: 0,
    createdAt: new Date().toISOString(),
  };

  db.createCampaign(newCampaign);
  res.status(201).json(newCampaign);
});

// POST /api/crm/campaigns/:id/run
router.post('/campaigns/:id/run', requireAuth, (req: Request, res: Response) => {
  const cmp = db.getCampaigns().find(c => c.id === req.params.id);
  if (!cmp) {
    res.status(404).json({ error: 'Campaign not found.' });
    return;
  }

  // Simulate automated outbound batch run
  const newDials = cmp.leadIds.length;
  const newConnected = Math.max(1, Math.round(newDials * 0.7));
  const newQualified = Math.max(1, Math.round(newConnected * 0.5));
  const newBooked = Math.max(1, Math.round(newQualified * 0.4));

  const updated = db.updateCampaign(cmp.id, {
    status: 'running',
    dialsCount: cmp.dialsCount + newDials,
    connectedCount: cmp.connectedCount + newConnected,
    qualifiedCount: cmp.qualifiedCount + newQualified,
    appointmentsCount: cmp.appointmentsCount + newBooked,
  });

  db.logAction('CAMPAIGN_LAUNCHED', undefined, `Launched outbound campaign: ${cmp.name} (${newDials} dials initiated)`);
  res.json(updated);
});

export default router;
