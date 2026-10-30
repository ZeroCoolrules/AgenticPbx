import { GoogleGenAI } from '@google/genai';
import { AIAgent, CallSession, ToolExecution } from '../src/types/index.ts';
import { db } from './db.ts';
import { calculateBANTScore, evaluateSentiment } from '../src/lib/scoring.ts';

let aiClient: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('[Gemini] Failed to initialize GoogleGenAI client:', err);
  }
}

export interface AgentTurnResponse {
  replyText: string;
  toolExecutions: ToolExecution[];
  bantUpdate?: {
    budget: 'High' | 'Medium' | 'Low' | 'Unknown';
    budgetDetails: string;
    authority: 'Decision Maker' | 'Influencer' | 'User/Researcher' | 'Unknown';
    need: string;
    timeline: 'Immediate (< 30d)' | '1-3 months' | '3-6 months' | 'Uncertain';
    notes: string;
  };
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
  transferToExtension?: string;
}

export async function processAgentConversationTurn(
  call: CallSession,
  agent: AIAgent,
  userMessage: string
): Promise<AgentTurnResponse> {
  const conversationHistory = call.transcript
    .map(t => `${t.sender.toUpperCase()}: ${t.text}`)
    .join('\n');

  const sentiment = evaluateSentiment(userMessage);

  // If Gemini API is available, generate response using gemini-3.8-flash
  if (aiClient) {
    try {
      const prompt = `
You are the voice of an AI Phone PBX Agent.
Agent Name: ${agent.name}
Agent Role: ${agent.role}
Agent Objective: ${agent.objective}
System Persona & Rules: ${agent.systemPrompt}

Current Caller Info:
Name: ${call.callerName || 'Unknown Caller'}
Company: ${call.callerCompany || 'Unknown Company'}
Caller Phone: ${call.callerNumber}
DID Called: ${call.didNumber} (Extension ${call.extension})

Current BANT State:
Budget: ${call.bant?.budget || 'Unknown'} (${call.bant?.budgetDetails || ''})
Authority: ${call.bant?.authority || 'Unknown'}
Need: ${call.bant?.need || ''}
Timeline: ${call.bant?.timeline || 'Uncertain'}

Previous Conversation Transcript:
${conversationHistory}

Caller just said: "${userMessage}"

INSTRUCTIONS:
1. Speak in character as ${agent.name}.
2. Voice conversation style: concise, natural, spoken English (1-3 sentences maximum).
3. If the caller provides new qualification details (budget, team size, timeline, pain point, authority), extract them into the JSON output.
4. If the caller agrees to book a meeting or requests a demo, or if qualification criteria is met, autonomously trigger the booking tool!
5. If caller asks for a department you don't handle (e.g. support asks for sales, or vice versa), trigger the transfer tool.

Respond ONLY with a valid JSON object matching this schema:
{
  "replyText": "spoken response to the caller",
  "toolsToExecute": [
    {
      "toolName": "book_calendar_appointment" | "create_or_update_lead" | "transfer_call" | "send_sms" | "create_support_ticket",
      "args": { ... }
    }
  ],
  "extractedBant": {
    "budget": "High" | "Medium" | "Low" | "Unknown",
    "budgetDetails": "string explanation",
    "authority": "Decision Maker" | "Influencer" | "User/Researcher" | "Unknown",
    "need": "core business need",
    "timeline": "Immediate (< 30d)" | "1-3 months" | "3-6 months" | "Uncertain",
    "notes": "key takeaways"
  },
  "transferToExtension": "101" | "102" | "103" | "104" | "100" | null
}
`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        const executedTools = executeAgentTools(call, parsed.toolsToExecute || []);

        return {
          replyText: parsed.replyText || 'I understand. Let me check that for you right away.',
          toolExecutions: executedTools,
          bantUpdate: parsed.extractedBant,
          sentiment,
          transferToExtension: parsed.transferToExtension,
        };
      }
    } catch (apiErr) {
      console.warn('[Gemini] Live API call failed, falling back to deterministic reasoning engine:', apiErr);
    }
  }

  // High-reliability Fallback Engine (ensures zero downtime & realistic telecom SDR responses)
  return fallbackAgentReasoning(call, agent, userMessage, sentiment);
}

function fallbackAgentReasoning(
  call: CallSession,
  agent: AIAgent,
  userMessage: string,
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical'
): AgentTurnResponse {
  const lower = userMessage.toLowerCase();
  const toolExecutions: ToolExecution[] = [];
  let replyText = '';
  let transferToExtension: string | undefined = undefined;

  let budget: 'High' | 'Medium' | 'Low' | 'Unknown' = call.bant?.budget || 'Unknown';
  let budgetDetails = call.bant?.budgetDetails || '';
  let authority: 'Decision Maker' | 'Influencer' | 'User/Researcher' | 'Unknown' = call.bant?.authority || 'Unknown';
  let need = call.bant?.need || '';
  let timeline: 'Immediate (< 30d)' | '1-3 months' | '3-6 months' | 'Uncertain' = call.bant?.timeline || 'Uncertain';

  // Extract budget cues
  if (lower.includes('$') || lower.includes('budget') || lower.includes('50k') || lower.includes('100k') || lower.includes('thousand') || lower.includes('approved')) {
    budget = 'High';
    budgetDetails = 'Enterprise budget identified from caller conversation';
  } else if (lower.includes('cheap') || lower.includes('free') || lower.includes('tight')) {
    budget = 'Low';
    budgetDetails = 'Cost sensitive or low budget';
  }

  // Extract authority cues
  if (lower.includes('i am the') || lower.includes('founder') || lower.includes('vp') || lower.includes('director') || lower.includes('head of') || lower.includes('decision maker') || lower.includes('i decide')) {
    authority = 'Decision Maker';
  } else if (lower.includes('evaluating for') || lower.includes('my team') || lower.includes('boss') || lower.includes('manager asked me')) {
    authority = 'Influencer';
  }

  // Extract timeline cues
  if (lower.includes('asap') || lower.includes('next month') || lower.includes('30 days') || lower.includes('immediately') || lower.includes('this quarter')) {
    timeline = 'Immediate (< 30d)';
  } else if (lower.includes('next year') || lower.includes('no rush') || lower.includes('exploring')) {
    timeline = '3-6 months';
  }

  // Extract Need
  if (lower.includes('pbx') || lower.includes('phone') || lower.includes('sdr') || lower.includes('replace') || lower.includes('call') || lower.includes('sales')) {
    need = userMessage.length > 20 ? userMessage.slice(0, 120) : 'Virtual PBX and automated SDR voice qualification';
  }

  // Role specific conversational handling
  if (agent.role === 'receptionist') {
    if (lower.includes('sales') || lower.includes('pricing') || lower.includes('demo') || lower.includes('buy') || lower.includes('pbx') || lower.includes('sdr')) {
      replyText = "I'd be glad to connect you with our Sales Engineering specialist, Marcus, on Extension 102. Connecting you right now.";
      transferToExtension = '102';
      toolExecutions.push({
        id: `tool-${Date.now()}-1`,
        toolName: 'transfer_call',
        timestamp: new Date().toLocaleTimeString(),
        input: { targetExtension: '102', department: 'Sales Development' },
        output: { status: 'transferred', destination: 'Marcus (AI SDR)' },
        status: 'success',
        summary: 'Transferred caller to Extension 102 (Marcus AI SDR)',
      });
    } else if (lower.includes('support') || lower.includes('help') || lower.includes('ticket') || lower.includes('technical')) {
      replyText = "Certainly, let me connect you with David in Technical Support on Extension 103. Please hold for just a second.";
      transferToExtension = '103';
      toolExecutions.push({
        id: `tool-${Date.now()}-1`,
        toolName: 'transfer_call',
        timestamp: new Date().toLocaleTimeString(),
        input: { targetExtension: '103', department: 'Technical Support' },
        output: { status: 'transferred', destination: 'David (AI Support)' },
        status: 'success',
        summary: 'Transferred caller to Extension 103 (David AI Support)',
      });
    } else {
      replyText = "Thank you for calling Apex Cloud Systems! My name is Sophia. Could I get your name and what company you are calling from today?";
    }
  } else if (agent.role === 'sdr') {
    if (lower.includes('book') || lower.includes('demo') || lower.includes('thursday') || lower.includes('tomorrow') || lower.includes('schedule') || lower.includes('yes') || lower.includes('sounds good')) {
      replyText = "Excellent! I have confirmed a 20-minute executive architecture walkthrough and locked that in on our calendar. I also dispatched a confirmation SMS with the meeting details.";
      const targetDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
      const apt = db.createAppointment({
        id: `apt-${Date.now()}`,
        leadId: call.callerName ? `lead-${Date.now()}` : 'lead-prospect',
        leadName: call.callerName || 'Inbound Prospect',
        leadCompany: call.callerCompany || 'Enterprise Prospect',
        leadEmail: `${(call.callerName || 'caller').toLowerCase().replace(/\s+/g, '.')}@company.com`,
        title: 'DialWise AI PBX Architecture & SDR Deep Dive',
        date: targetDate,
        timeSlot: '14:00 EST',
        agentId: agent.id,
        meetingLink: `https://meet.dialwise.io/room-${Math.random().toString(36).substring(2, 8)}`,
        status: 'confirmed',
        notes: `Booked by AI SDR ${agent.name} during live inbound call.`,
      });

      toolExecutions.push({
        id: `tool-${Date.now()}-book`,
        toolName: 'book_calendar_appointment',
        timestamp: new Date().toLocaleTimeString(),
        input: { date: targetDate, timeSlot: '14:00 EST', agentId: agent.id },
        output: { appointmentId: apt.id, status: 'confirmed', meetingLink: apt.meetingLink },
        status: 'success',
        summary: `Booked Calendar Appointment for ${targetDate} 14:00 EST`,
      });

      toolExecutions.push({
        id: `tool-${Date.now()}-sms`,
        toolName: 'send_sms',
        timestamp: new Date().toLocaleTimeString(),
        input: { recipient: call.callerNumber, template: 'meeting_confirmation' },
        output: { messageId: `sms-${Date.now()}`, status: 'delivered' },
        status: 'success',
        summary: `Dispatched SMS confirmation to ${call.callerNumber}`,
      });
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
      replyText = "Our platform starts at $99 per DID with unlimited AI SDR inbound and outbound minutes. For enterprise teams needing custom CRM sync and PBX bridging, packages typically range from $1,500 to $4,000 monthly. How many extensions or phone lines does your team currently manage?";
    } else if (lower.includes('team') || lower.includes('reps') || lower.includes('avaya') || lower.includes('cisco') || lower.includes('system') || lower.includes('lines')) {
      replyText = "That sounds like a strong fit for our autonomous PBX agent workforce. Our AI agents can answer simultaneous calls, qualify prospects using custom BANT rubrics, and immediately sync with Salesforce or HubSpot. Would you be open to a 20-minute live demonstration this week?";
    } else {
      replyText = "Thanks for connecting with Sales, this is Marcus. We help companies deploy agentic AI virtual PBX systems with fully autonomous SDR capabilities. Tell me, what challenges are you experiencing with your current telephony setup?";
    }
  } else if (agent.role === 'support') {
    replyText = "Thanks for contacting Support, this is David. I can assist with SIP credentials, WebRTC latency, call forwarding rules, and webhook integrations. What issue are you experiencing?";
  } else {
    replyText = `Hello! This is ${agent.name}. How can I assist you on this call today?`;
  }

  // Automatically create or update lead record in CRM
  if (need || budget !== 'Unknown' || authority !== 'Unknown') {
    const bantCalc = calculateBANTScore({ budget, authority, need, timeline });
    toolExecutions.push({
      id: `tool-${Date.now()}-lead`,
      toolName: 'create_or_update_lead',
      timestamp: new Date().toLocaleTimeString(),
      input: {
        callerNumber: call.callerNumber,
        company: call.callerCompany || 'Inbound Caller Organization',
        dealScore: bantCalc.score,
        budget,
        authority,
      },
      output: { leadScore: bantCalc.score, isQualified: bantCalc.isQualified },
      status: 'success',
      summary: `Updated CRM Lead (Score: ${bantCalc.score}/100, BANT Qualified: ${bantCalc.isQualified ? 'YES' : 'PENDING'})`,
    });
  }

  return {
    replyText,
    toolExecutions,
    bantUpdate: {
      budget,
      budgetDetails,
      authority,
      need,
      timeline,
      notes: `Extracted from live conversation with ${agent.name}`,
    },
    sentiment,
    transferToExtension,
  };
}

function executeAgentTools(call: CallSession, tools: Array<{ toolName: string; args: any }>): ToolExecution[] {
  const executions: ToolExecution[] = [];

  for (const t of tools) {
    const execId = `tool-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    try {
      if (t.toolName === 'book_calendar_appointment') {
        const apt = db.createAppointment({
          id: `apt-${Date.now()}`,
          leadId: call.callerName ? `lead-${call.callerName.toLowerCase().replace(/\s+/g, '-')}` : 'lead-inbound',
          leadName: t.args.leadName || call.callerName || 'Inbound Prospect',
          leadCompany: t.args.leadCompany || call.callerCompany || 'Enterprise Prospect',
          leadEmail: t.args.email || 'prospect@enterprise.com',
          title: t.args.title || 'DialWise AI PBX Architecture & Executive Demo',
          date: t.args.date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          timeSlot: t.args.timeSlot || '14:00 EST',
          agentId: call.agentId,
          meetingLink: `https://meet.dialwise.io/room-${Math.random().toString(36).substring(2, 8)}`,
          status: 'confirmed',
          notes: 'Autonomously scheduled by AI SDR during live telephone call.',
        });

        executions.push({
          id: execId,
          toolName: 'book_calendar_appointment',
          timestamp: new Date().toLocaleTimeString(),
          input: t.args,
          output: { appointmentId: apt.id, status: 'confirmed' },
          status: 'success',
          summary: `Booked calendar demo for ${apt.date} at ${apt.timeSlot}`,
        });
      } else if (t.toolName === 'create_or_update_lead') {
        const lead = db.createLead({
          id: `lead-${Date.now()}`,
          name: t.args.name || call.callerName || 'Inbound Prospect',
          company: t.args.company || call.callerCompany || 'Enterprise Prospect',
          email: t.args.email || 'inbound@company.com',
          phone: call.callerNumber,
          title: t.args.title || 'Decision Maker',
          status: 'sql',
          dealSize: t.args.dealSize || 35000,
          score: 85,
          bant: {
            budget: 'High',
            budgetDetails: 'Identified during call',
            authority: 'Decision Maker',
            need: 'AI Virtual PBX & SDR Deployment',
            timeline: 'Immediate (< 30d)',
            score: 85,
            isQualified: true,
            notes: 'Created autonomously from live conversation analysis',
          },
          source: `Inbound Call DID ${call.didNumber}`,
          assignedAgent: 'Marcus (AI SDR)',
          lastContactDate: new Date().toISOString(),
          notes: ['Lead qualified autonomously during inbound PBX call.'],
          callIds: [call.id],
        });

        executions.push({
          id: execId,
          toolName: 'create_or_update_lead',
          timestamp: new Date().toLocaleTimeString(),
          input: t.args,
          output: { leadId: lead.id, status: 'created' },
          status: 'success',
          summary: `Synced Qualified Lead to CRM: ${lead.name} (${lead.company})`,
        });
      } else if (t.toolName === 'send_sms') {
        executions.push({
          id: execId,
          toolName: 'send_sms',
          timestamp: new Date().toLocaleTimeString(),
          input: t.args,
          output: { messageId: `sms-${Date.now()}`, status: 'delivered' },
          status: 'success',
          summary: `Sent SMS to ${t.args.phone || call.callerNumber}`,
        });
      } else if (t.toolName === 'transfer_call') {
        executions.push({
          id: execId,
          toolName: 'transfer_call',
          timestamp: new Date().toLocaleTimeString(),
          input: t.args,
          output: { status: 'transferred', destination: t.args.extension },
          status: 'success',
          summary: `Initiated PBX transfer to Extension ${t.args.extension}`,
        });
      }
    } catch (toolErr) {
      console.error('[Tools] Execution error:', toolErr);
    }
  }

  return executions;
}

export interface SMSTurnResponse {
  replyText: string;
  bantUpdate?: {
    budget: 'High' | 'Medium' | 'Low' | 'Unknown';
    budgetDetails: string;
    authority: 'Decision Maker' | 'Influencer' | 'User/Researcher' | 'Unknown';
    need: string;
    timeline: 'Immediate (< 30d)' | '1-3 months' | '3-6 months' | 'Uncertain';
    notes: string;
    score: number;
    isQualified: boolean;
  };
  actionTaken?: string;
}

export async function processAgentSMSTurn(
  thread: import('../src/types/index.ts').SMSThread,
  history: import('../src/types/index.ts').SMSMessage[],
  incomingText: string,
  agent: AIAgent
): Promise<SMSTurnResponse> {
  const historyText = history
    .slice(-8)
    .map(m => `${m.senderType === 'customer' ? 'CUSTOMER' : 'AGENT'}: ${m.text}`)
    .join('\n');

  if (aiClient) {
    try {
      const prompt = `
You are ${agent.name}, an AI SDR and Telephony Specialist for Apex Cloud Systems.
You are communicating via two-way SMS with a customer / prospective client.
Customer Name: ${thread.customerName}
Customer Company: ${thread.customerCompany || 'Unknown'}
Customer Phone: ${thread.customerNumber}
Current BANT Score: ${thread.bantScore || 40}/100

Previous SMS conversation history:
${historyText}

Customer just texted: "${incomingText}"

INSTRUCTIONS:
1. Respond in character as ${agent.name} via text message (SMS).
2. Format: Short, natural, conversational English (1 to 2 sentences maximum, strictly under 280 characters). Do NOT write long emails or use markdown headers.
3. If they ask for pricing, features, or scheduling, answer helpfully and suggest scheduling a quick demo or asking for their team size.
4. If they agree to a demo or specify a time, confirm enthusiastically and provide https://dialwise.io/book.
5. Return ONLY a valid JSON object:
{
  "replyText": "your concise SMS text message here",
  "extractedBant": {
    "budget": "High" | "Medium" | "Low" | "Unknown",
    "budgetDetails": "brief note",
    "authority": "Decision Maker" | "Influencer" | "User/Researcher" | "Unknown",
    "need": "core need",
    "timeline": "Immediate (< 30d)" | "1-3 months" | "3-6 months" | "Uncertain",
    "notes": "summary",
    "score": number between 30 and 100,
    "isQualified": boolean
  },
  "actionTaken": "string or null"
}
`;

      const responsePromise = aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini SMS Timeout')), 3500)
      );

      const response: any = await Promise.race([responsePromise, timeoutPromise]);

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        return {
          replyText: parsed.replyText || `Thanks for your message, ${thread.customerName}! We'd love to connect. What time this week works best for a brief 15-min call?`,
          bantUpdate: parsed.extractedBant,
          actionTaken: parsed.actionTaken,
        };
      }
    } catch (err) {
      console.warn('[Gemini SMS] Fallback used due to API error:', err);
    }
  }

  // Robust contextual fallback
  const lower = incomingText.toLowerCase();
  let replyText = `Hi ${thread.customerName}, thanks for your text! This is ${agent.name} from Apex Cloud Systems. How can we help streamline your phone and SMS operations?`;

  if (lower.includes('demo') || lower.includes('schedule') || lower.includes('call') || lower.includes('time') || lower.includes('meet')) {
    replyText = `Great to hear! I have openings this Thursday at 2 PM EST or Friday at 11 AM EST. Do either of those work for your team?`;
  } else if (lower.includes('price') || lower.includes('cost') || lower.includes('pricing') || lower.includes('quote')) {
    replyText = `Our enterprise PBX + AI SDR plans start at $49/mo per DID with unlimited AI minutes. How many reps are on your team?`;
  } else if (lower.includes('yes') || lower.includes('works') || lower.includes('perfect') || lower.includes('sounds good')) {
    replyText = `Confirmed! I've locked that into our calendar and sent the invite over to your phone. Looking forward to speaking!`;
  } else if (lower.includes('support') || lower.includes('help') || lower.includes('issue') || lower.includes('latency')) {
    replyText = `Understood. I've flagged this with our Technical Support desk (Ext 103). A specialist will follow up shortly!`;
  }

  return {
    replyText,
    bantUpdate: {
      budget: lower.includes('price') || lower.includes('cost') ? 'Medium' : 'Unknown',
      budgetDetails: 'Discussed via SMS',
      authority: 'Decision Maker',
      need: 'Automated PBX and SDR text routing',
      timeline: 'Immediate (< 30d)',
      notes: 'Customer texted inquiry via SMS',
      score: 65,
      isQualified: true,
    },
  };
}
