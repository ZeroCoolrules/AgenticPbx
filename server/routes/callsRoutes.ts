import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { CallSession, TranscriptMessage } from '../../src/types/index.ts';
import { resolveCallRoute, calculateBANTScore, determineLeadStage } from '../../src/lib/scoring.ts';
import { processAgentConversationTurn } from '../gemini.ts';

const router = Router();

// GET /api/calls
router.get('/', (req: Request, res: Response) => {
  const { status, direction, search } = req.query;
  let calls = db.getCalls();

  if (status && typeof status === 'string') {
    calls = calls.filter(c => c.status === status);
  }
  if (direction && typeof direction === 'string') {
    calls = calls.filter(c => c.direction === direction);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    calls = calls.filter(
      c =>
        c.callerNumber.includes(q) ||
        (c.callerName && c.callerName.toLowerCase().includes(q)) ||
        (c.callerCompany && c.callerCompany.toLowerCase().includes(q)) ||
        c.summary.toLowerCase().includes(q)
    );
  }

  res.json(calls);
});

// GET /api/calls/:id
router.get('/:id', (req: Request, res: Response) => {
  const call = db.getCallById(req.params.id);
  if (!call) {
    res.status(404).json({ error: 'Call session not found' });
    return;
  }
  res.json(call);
});

// POST /api/calls/initiate
router.post('/initiate', (req: Request, res: Response) => {
  try {
    const {
      direction = 'inbound',
      callerNumber = '+1 (555) 482-9900',
      callerName = 'Inbound Prospect',
      callerCompany,
      calleeNumber,
      didNumber = '+1 (555) 019-4820',
      targetExtension,
    } = req.body;

    const dids = db.getVirtualNumbers();
    const extensions = db.getExtensions();

    let resolvedExt = targetExtension;
    let resolvedAgentId = 'agent-receptionist-sophia';

    if (!resolvedExt) {
      const routing = resolveCallRoute(didNumber, dids, extensions);
      resolvedExt = routing.targetExtension;
      resolvedAgentId = routing.agentId;
    } else {
      const extObj = extensions.find(e => e.extensionNumber === resolvedExt);
      if (extObj && extObj.targetAgentId) {
        resolvedAgentId = extObj.targetAgentId;
      }
    }

    const agent = db.getAgentById(resolvedAgentId);

    // Initial greeting from the agent
    let initialGreeting = `Thank you for calling Apex Cloud Systems. My name is ${agent?.name || 'Sophia'}. How may I help you today?`;
    if (agent?.role === 'sdr') {
      initialGreeting = `Thanks for connecting with Sales, this is ${agent.name}. How can we help automate your phone operations today?`;
    } else if (agent?.role === 'support') {
      initialGreeting = `Hello, this is ${agent.name} with Technical Support. What can I help you resolve?`;
    }

    const newCall: CallSession = {
      id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      direction,
      callerNumber,
      callerName,
      callerCompany,
      calleeNumber: calleeNumber || didNumber,
      didNumber,
      status: 'connected',
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      agentId: resolvedAgentId,
      extension: resolvedExt,
      sentiment: 'neutral',
      qualificationScore: 30,
      bant: {
        budget: 'Unknown',
        budgetDetails: '',
        authority: 'Unknown',
        need: '',
        timeline: 'Uncertain',
        score: 30,
        isQualified: false,
        notes: 'Call just initiated',
      },
      summary: `Call initiated to DID ${didNumber} (${agent?.name || 'Sophia'} - Ext ${resolvedExt})`,
      actionItems: [],
      transcript: [
        {
          id: `t-sys-${Date.now()}`,
          sender: 'system',
          text: `Call connected to Virtual DID ${didNumber} -> Extension ${resolvedExt} (${agent?.name || 'Agent'}). Encrypted SIP media channel established.`,
          timestamp: '00:00',
        },
        {
          id: `t-agent-${Date.now()}`,
          sender: 'agent',
          text: initialGreeting,
          timestamp: '00:01',
        },
      ],
      toolExecutions: [
        {
          id: `tool-init-${Date.now()}`,
          toolName: 'lookup_caller_crm',
          timestamp: '00:00',
          input: { callerNumber },
          output: { foundInCrm: false, notes: 'New caller record created' },
          status: 'success',
          summary: 'Looked up caller in CRM database',
        },
      ],
    };

    db.createCall(newCall);
    res.status(201).json(newCall);
  } catch (err: any) {
    console.error('[Calls] Initiate call error:', err);
    res.status(500).json({ error: 'Failed to initiate call session.' });
  }
});

// POST /api/calls/:id/message
router.post('/:id/message', async (req: Request, res: Response) => {
  try {
    const { text, audioLevel } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const call = db.getCallById(req.params.id);
    if (!call) {
      res.status(404).json({ error: 'Call session not found' });
      return;
    }

    if (call.status === 'completed') {
      res.status(400).json({ error: 'Call has already ended.' });
      return;
    }

    // Append caller's message
    const callerMsg: TranscriptMessage = {
      id: `t-caller-${Date.now()}`,
      sender: 'caller',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
      audioLevel,
    };
    call.transcript.push(callerMsg);

    // Get current active agent
    let currentAgent = db.getAgentById(call.agentId);
    if (!currentAgent) {
      currentAgent = db.getAgents()[0];
    }

    // Process agent reasoning
    const agentTurn = await processAgentConversationTurn(call, currentAgent, text.trim());

    // Check if agent initiated transfer
    if (agentTurn.transferToExtension && agentTurn.transferToExtension !== call.extension) {
      const newExt = agentTurn.transferToExtension;
      const targetAgent = db.getAgents().find(a => a.assignedExtension === newExt);
      if (targetAgent) {
        call.agentId = targetAgent.id;
        call.extension = newExt;
        call.transcript.push({
          id: `t-sys-${Date.now()}`,
          sender: 'system',
          text: `[PBX TRANSFER] Attended call transferred to Extension ${newExt} (${targetAgent.name} - ${targetAgent.title}).`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }

    // Append Agent response
    const agentMsg: TranscriptMessage = {
      id: `t-agent-${Date.now()}`,
      sender: 'agent',
      text: agentTurn.replyText,
      timestamp: new Date().toLocaleTimeString(),
    };
    call.transcript.push(agentMsg);

    // Merge tool executions
    if (agentTurn.toolExecutions && agentTurn.toolExecutions.length > 0) {
      call.toolExecutions.push(...agentTurn.toolExecutions);
    }

    // Update BANT and qualification
    if (agentTurn.bantUpdate) {
      const prevBant = call.bant || {
        budget: 'Unknown',
        budgetDetails: '',
        authority: 'Unknown',
        need: '',
        timeline: 'Uncertain',
        score: 0,
        isQualified: false,
        notes: '',
      };

      const updatedBant = {
        ...prevBant,
        budget: agentTurn.bantUpdate.budget || prevBant.budget,
        budgetDetails: agentTurn.bantUpdate.budgetDetails || prevBant.budgetDetails,
        authority: agentTurn.bantUpdate.authority || prevBant.authority,
        need: agentTurn.bantUpdate.need || prevBant.need,
        timeline: agentTurn.bantUpdate.timeline || prevBant.timeline,
        notes: agentTurn.bantUpdate.notes || prevBant.notes,
      };

      const bantCalc = calculateBANTScore({
        budget: updatedBant.budget,
        authority: updatedBant.authority,
        need: updatedBant.need,
        timeline: updatedBant.timeline,
      });

      updatedBant.score = bantCalc.score;
      updatedBant.isQualified = bantCalc.isQualified;

      call.bant = updatedBant;
      call.qualificationScore = bantCalc.score;
    }

    call.sentiment = agentTurn.sentiment;

    // Check if appointment was booked in toolExecutions
    const hasBooked = call.toolExecutions.some(t => t.toolName === 'book_calendar_appointment' && t.status === 'success');
    if (hasBooked) {
      call.actionItems.push('Confirm calendar demo with account executive');
    }

    db.updateCall(call.id, call);

    res.json({
      agentReply: agentTurn.replyText,
      agentName: currentAgent.name,
      agentId: call.agentId,
      extension: call.extension,
      call,
    });
  } catch (err: any) {
    console.error('[Calls] Message processing error:', err);
    res.status(500).json({ error: 'Failed to process voice turn.' });
  }
});

// POST /api/calls/:id/event
router.post('/:id/event', (req: Request, res: Response) => {
  const { eventType, payload } = req.body;
  const call = db.getCallById(req.params.id);
  if (!call) {
    res.status(404).json({ error: 'Call session not found' });
    return;
  }

  if (eventType === 'hold') {
    call.status = 'on_hold';
    call.transcript.push({
      id: `t-sys-${Date.now()}`,
      sender: 'system',
      text: 'Call placed ON HOLD with comfort music streaming.',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (eventType === 'resume') {
    call.status = 'connected';
    call.transcript.push({
      id: `t-sys-${Date.now()}`,
      sender: 'system',
      text: 'Call RESUMED from hold.',
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (eventType === 'transfer') {
    const targetExt = payload?.targetExtension || '102';
    const targetAgent = db.getAgents().find(a => a.assignedExtension === targetExt);
    call.extension = targetExt;
    if (targetAgent) {
      call.agentId = targetAgent.id;
    }
    call.transcript.push({
      id: `t-sys-${Date.now()}`,
      sender: 'system',
      text: `Call transferred to Extension ${targetExt} (${targetAgent?.name || 'Department'}).`,
      timestamp: new Date().toLocaleTimeString(),
    });
  } else if (eventType === 'dtmf') {
    const digit = payload?.digit || '';
    call.transcript.push({
      id: `t-sys-${Date.now()}`,
      sender: 'system',
      text: `DTMF tone received: [Key ${digit}]`,
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  db.updateCall(call.id, call);
  res.json(call);
});

// POST /api/calls/:id/end
router.post('/:id/end', (req: Request, res: Response) => {
  const call = db.getCallById(req.params.id);
  if (!call) {
    res.status(404).json({ error: 'Call session not found' });
    return;
  }

  const endTime = new Date().toISOString();
  const startMs = new Date(call.startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));

  call.status = 'completed';
  call.endTime = endTime;
  call.durationSeconds = durationSec;

  // Final summary generation
  const agent = db.getAgentById(call.agentId);
  const isBooked = call.toolExecutions.some(t => t.toolName === 'book_calendar_appointment');
  const stage = determineLeadStage('new', call.qualificationScore, isBooked);

  call.summary = `Call completed with ${agent?.name || 'AI Agent'} (${durationSec}s). Sentiment: ${call.sentiment.toUpperCase()}. BANT Score: ${call.qualificationScore}/100. Status: ${isBooked ? 'Appointment Scheduled' : 'Lead Qualified'}.`;

  if (isBooked) {
    call.actionItems.push('Calendar appointment verified and invite dispatched.');
  }
  call.actionItems.push(`Synced call details to CRM lead pipeline stage: ${stage.toUpperCase()}`);

  call.transcript.push({
    id: `t-sys-${Date.now()}`,
    sender: 'system',
    text: `Call terminated by caller. Duration: ${durationSec} seconds. CDR and audio archive saved.`,
    timestamp: new Date().toLocaleTimeString(),
  });

  db.updateCall(call.id, call);

  // Update CRM Lead if phone matches
  const leads = db.getLeads();
  const matchedLead = leads.find(l => l.phone.replace(/\D/g, '') === call.callerNumber.replace(/\D/g, ''));
  if (matchedLead) {
    matchedLead.status = stage;
    matchedLead.score = Math.max(matchedLead.score, call.qualificationScore);
    matchedLead.bant = call.bant;
    matchedLead.callIds.push(call.id);
    matchedLead.notes.push(`Call on ${new Date().toLocaleDateString()}: ${call.summary}`);
    db.updateLead(matchedLead.id, matchedLead);
  }

  res.json(call);
});

export default router;
