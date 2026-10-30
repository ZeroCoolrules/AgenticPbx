import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { SMSThread, SMSMessage } from '../../src/types/index.ts';
import { processAgentSMSTurn } from '../gemini.ts';

const router = Router();

// GET /api/sms/threads
router.get('/threads', (req: Request, res: Response) => {
  try {
    const { status, search, mode } = req.query;
    let threads = db.getSMSThreads();

    if (status && typeof status === 'string' && status !== 'all') {
      threads = threads.filter(t => t.status === status);
    }

    if (mode && typeof mode === 'string') {
      if (mode === 'autonomous') {
        threads = threads.filter(t => t.autonomousMode === true);
      } else if (mode === 'manual') {
        threads = threads.filter(t => t.autonomousMode === false);
      }
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      threads = threads.filter(
        t =>
          t.customerName.toLowerCase().includes(q) ||
          t.customerNumber.includes(q) ||
          (t.customerCompany && t.customerCompany.toLowerCase().includes(q)) ||
          t.lastMessageText.toLowerCase().includes(q)
      );
    }

    // Sort by most recent message
    threads.sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());

    res.json(threads);
  } catch (err: any) {
    console.error('[SMS] Error fetching threads:', err);
    res.status(500).json({ error: 'Failed to fetch SMS threads.' });
  }
});

// GET /api/sms/threads/:id
router.get('/threads/:id', (req: Request, res: Response) => {
  try {
    const thread = db.getSMSThreadById(req.params.id);
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    // Mark as read
    if (thread.unreadCount > 0) {
      db.updateSMSThread(thread.id, { unreadCount: 0 });
    }

    const messages = db.getSMSMessages(thread.id);
    res.json({ thread, messages });
  } catch (err: any) {
    console.error('[SMS] Error fetching thread:', err);
    res.status(500).json({ error: 'Failed to fetch thread.' });
  }
});

// POST /api/sms/threads - Start new customer SMS thread
router.post('/threads', (req: Request, res: Response) => {
  try {
    const { customerNumber, customerName, customerCompany, initialMessage, assignedDid, assignedAgentId, autonomousMode = true } = req.body;

    if (!customerNumber) {
      res.status(400).json({ error: 'Customer phone number is required' });
      return;
    }

    const dids = db.getVirtualNumbers();
    const chosenDid = assignedDid || dids[0]?.number || '+1 (555) 019-4821';
    const chosenAgentId = assignedAgentId || 'agent-sdr-marcus';

    const threadId = `thread-${Date.now()}`;
    const now = new Date().toISOString();

    const newThread: SMSThread = {
      id: threadId,
      customerNumber,
      customerName: customerName || 'Prospective Client',
      customerCompany: customerCompany || 'Direct SMS Lead',
      assignedDid: chosenDid,
      lastMessageText: initialMessage || 'Conversation initiated',
      lastMessageTimestamp: now,
      unreadCount: 0,
      autonomousMode: !!autonomousMode,
      assignedAgentId: chosenAgentId,
      bantScore: 50,
      status: 'waiting_customer',
    };

    db.createSMSThread(newThread);

    if (initialMessage && initialMessage.trim()) {
      const msg: SMSMessage = {
        id: `msg-${Date.now()}`,
        threadId,
        fromNumber: chosenDid,
        toNumber: customerNumber,
        direction: 'outbound',
        senderType: 'human_agent',
        senderName: 'You (Operator)',
        text: initialMessage.trim(),
        timestamp: now,
        status: 'delivered',
      };
      db.createSMSMessage(msg);
    }

    res.status(201).json(newThread);
  } catch (err: any) {
    console.error('[SMS] Error creating thread:', err);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// POST /api/sms/threads/:id/messages - Send manual SMS from human operator
router.post('/threads/:id/messages', (req: Request, res: Response) => {
  try {
    const { text, senderName = 'You (Operator)' } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const thread = db.getSMSThreadById(req.params.id);
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const newMsg: SMSMessage = {
      id: `msg-${Date.now()}`,
      threadId: thread.id,
      fromNumber: thread.assignedDid,
      toNumber: thread.customerNumber,
      direction: 'outbound',
      senderType: 'human_agent',
      senderName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      status: 'delivered',
    };

    db.createSMSMessage(newMsg);
    db.updateSMSThread(thread.id, {
      lastMessageText: text.trim(),
      lastMessageTimestamp: newMsg.timestamp,
      status: 'waiting_customer',
      unreadCount: 0,
    });

    res.status(201).json(newMsg);
  } catch (err: any) {
    console.error('[SMS] Send message error:', err);
    res.status(500).json({ error: 'Failed to send SMS.' });
  }
});

// PATCH /api/sms/threads/:id/autonomous - Toggle autonomous AI auto-reply
router.patch('/threads/:id/autonomous', (req: Request, res: Response) => {
  try {
    const { autonomousMode } = req.body;
    const thread = db.getSMSThreadById(req.params.id);
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const updated = db.updateSMSThread(thread.id, {
      autonomousMode: typeof autonomousMode === 'boolean' ? autonomousMode : !thread.autonomousMode,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[SMS] Toggle autonomous mode error:', err);
    res.status(500).json({ error: 'Failed to update autonomous mode.' });
  }
});

// POST /api/sms/threads/:id/suggest - Generate AI Draft suggestion for human review
router.post('/threads/:id/suggest', async (req: Request, res: Response) => {
  try {
    const thread = db.getSMSThreadById(req.params.id);
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const messages = db.getSMSMessages(thread.id);
    const lastCustomerMsg = [...messages].reverse().find(m => m.direction === 'inbound');
    const incomingText = lastCustomerMsg ? lastCustomerMsg.text : 'Can you give me more details on DialWise?';

    const agent = db.getAgentById(thread.assignedAgentId) || db.getAgents()[0];
    const turn = await processAgentSMSTurn(thread, messages, incomingText, agent);

    res.json({
      suggestedText: turn.replyText,
      bantUpdate: turn.bantUpdate,
    });
  } catch (err: any) {
    console.error('[SMS] Suggestion error:', err);
    res.status(500).json({ error: 'Failed to generate AI suggestion.' });
  }
});

// POST /api/sms/webhook & /api/sms/webhook/twilio - Real Inbound Carrier SMS Webhook
const handleInboundSMS = async (req: Request, res: Response) => {
  try {
    const from = (req.body.From || req.query.From || '').toString().trim();
    const to = (req.body.To || req.query.To || '').toString().trim();
    const body = (req.body.Body || req.query.Body || req.body.text || '').toString().trim();

    if (!from || !body) {
      res.status(400).send('Missing From or Body');
      return;
    }

    // Find or create thread
    let thread = db.getSMSThreadByCustomerNumber(from);
    const dids = db.getVirtualNumbers();
    const assignedDid = to || dids[0]?.number || '+1 (555) 019-4821';
    const now = new Date().toISOString();

    if (!thread) {
      const threadId = `thread-${Date.now()}`;
      thread = {
        id: threadId,
        customerNumber: from,
        customerName: req.body.CallerName || 'Inbound SMS Contact',
        customerCompany: 'Direct Inbound SMS',
        assignedDid,
        lastMessageText: body,
        lastMessageTimestamp: now,
        unreadCount: 1,
        autonomousMode: true, // Default to autonomous response!
        assignedAgentId: 'agent-sdr-marcus',
        bantScore: 50,
        status: 'open',
      };
      db.createSMSThread(thread);
    }

    // Save Customer Message
    const customerMsg: SMSMessage = {
      id: `msg-${Date.now()}`,
      threadId: thread.id,
      fromNumber: from,
      toNumber: assignedDid,
      direction: 'inbound',
      senderType: 'customer',
      senderName: thread.customerName,
      text: body,
      timestamp: now,
      status: 'received',
    };
    db.createSMSMessage(customerMsg);

    let aiReplyText = '';

    // If autonomous mode is active, AI responds immediately!
    if (thread.autonomousMode) {
      const history = db.getSMSMessages(thread.id);
      const agent = db.getAgentById(thread.assignedAgentId) || db.getAgents()[0];
      const aiTurn = await processAgentSMSTurn(thread, history, body, agent);

      aiReplyText = aiTurn.replyText;

      const agentMsg: SMSMessage = {
        id: `msg-${Date.now() + 1}`,
        threadId: thread.id,
        fromNumber: assignedDid,
        toNumber: from,
        direction: 'outbound',
        senderType: 'ai_autonomous',
        senderName: `${agent.name} (AI SDR)`,
        text: aiReplyText,
        timestamp: new Date().toISOString(),
        status: 'delivered',
      };
      db.createSMSMessage(agentMsg);

      // Update BANT score if extracted
      if (aiTurn.bantUpdate?.score) {
        db.updateSMSThread(thread.id, {
          bantScore: aiTurn.bantUpdate.score,
          status: 'waiting_customer',
        });
      }
    }

    // Return TwiML if carrier request or standard JSON
    const isTwilio = req.headers['x-twilio-signature'] || req.url.includes('twilio') || req.body.MessageSid;
    if (isTwilio) {
      res.set('Content-Type', 'text/xml');
      if (aiReplyText) {
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${aiReplyText}</Message></Response>`);
      } else {
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
      }
    } else {
      res.json({
        success: true,
        autonomousReplied: !!aiReplyText,
        reply: aiReplyText || null,
        threadId: thread.id,
      });
    }
  } catch (err: any) {
    console.error('[SMS Webhook] Error:', err);
    res.status(500).send('Error processing SMS webhook');
  }
};

router.post('/webhook', handleInboundSMS);
router.post('/webhook/twilio', handleInboundSMS);

// POST /api/sms/test-inbound - Test customer text simulation
router.post('/test-inbound', async (req: Request, res: Response) => {
  try {
    const { threadId, text } = req.body;
    const thread = db.getSMSThreadById(threadId);
    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const customerText = text || 'Can we schedule a 15-minute demo to see how this works with our team?';
    const now = new Date().toISOString();

    const customerMsg: SMSMessage = {
      id: `msg-${Date.now()}`,
      threadId: thread.id,
      fromNumber: thread.customerNumber,
      toNumber: thread.assignedDid,
      direction: 'inbound',
      senderType: 'customer',
      senderName: thread.customerName,
      text: customerText,
      timestamp: now,
      status: 'received',
    };
    db.createSMSMessage(customerMsg);

    let aiReply: SMSMessage | null = null;

    if (thread.autonomousMode) {
      const history = db.getSMSMessages(thread.id);
      const agent = db.getAgentById(thread.assignedAgentId) || db.getAgents()[0];
      const aiTurn = await processAgentSMSTurn(thread, history, customerText, agent);

      aiReply = {
        id: `msg-${Date.now() + 1}`,
        threadId: thread.id,
        fromNumber: thread.assignedDid,
        toNumber: thread.customerNumber,
        direction: 'outbound',
        senderType: 'ai_autonomous',
        senderName: `${agent.name} (AI SDR)`,
        text: aiTurn.replyText,
        timestamp: new Date().toISOString(),
        status: 'delivered',
      };
      db.createSMSMessage(aiReply);

      if (aiTurn.bantUpdate?.score) {
        db.updateSMSThread(thread.id, {
          bantScore: aiTurn.bantUpdate.score,
          status: 'waiting_customer',
        });
      }
    } else {
      db.updateSMSThread(thread.id, {
        status: 'waiting_agent',
        unreadCount: (thread.unreadCount || 0) + 1,
      });
    }

    res.json({
      customerMsg,
      aiReply,
      autonomousMode: thread.autonomousMode,
    });
  } catch (err: any) {
    console.error('[SMS] Test inbound error:', err);
    res.status(500).json({ error: 'Failed to simulate inbound SMS.' });
  }
});

export default router;
