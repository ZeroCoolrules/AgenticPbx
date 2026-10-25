import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  VirtualNumber,
  PBXExtension,
  RingGroup,
  AIAgent,
  CallSession,
  CRMLead,
  CalendarAppointment,
  OutboundCampaign,
} from '../src/types/index.ts';

export interface DBUser extends User {
  passwordHash: string;
  salt: string;
}

export interface DialWiseStore {
  users: DBUser[];
  virtualNumbers: VirtualNumber[];
  extensions: PBXExtension[];
  ringGroups: RingGroup[];
  agents: AIAgent[];
  calls: CallSession[];
  leads: CRMLead[];
  appointments: CalendarAppointment[];
  campaigns: OutboundCampaign[];
  auditLogs: Array<{ id: string; timestamp: string; action: string; userId?: string; details: string }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'dialwise-store.json');

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function getInitialStore(): DialWiseStore {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const sdrSalt = crypto.randomBytes(16).toString('hex');

  const defaultAdmin: DBUser = {
    id: 'user-admin-1',
    name: 'Alex Vance',
    email: 'admin@dialwise.io',
    role: 'admin',
    companyId: 'comp-enterprise-1',
    companyName: 'Apex Cloud Systems',
    passwordHash: hashPassword('DialWise2025!', adminSalt),
    salt: adminSalt,
    createdAt: new Date().toISOString(),
  };

  const defaultSdrUser: DBUser = {
    id: 'user-sdr-2',
    name: 'Sarah Chen',
    email: 'sarah.sdr@dialwise.io',
    role: 'sdr_agent',
    companyId: 'comp-enterprise-1',
    companyName: 'Apex Cloud Systems',
    passwordHash: hashPassword('SdrTeam2025!', sdrSalt),
    salt: sdrSalt,
    createdAt: new Date().toISOString(),
  };

  const agents: AIAgent[] = [
    {
      id: 'agent-receptionist-sophia',
      name: 'Sophia',
      role: 'receptionist',
      title: 'AI Front Desk & Inbound Concierge',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      voiceGender: 'female',
      voicePitch: 1.05,
      voiceRate: 1.0,
      assignedExtension: '101',
      objective: 'Answer incoming calls warmly, determine caller intent, collect caller identity, answer basic company questions, and smoothly route/transfer to the appropriate department or AI SDR specialist.',
      systemPrompt: 'You are Sophia, the intelligent executive AI receptionist for Apex Cloud Systems. You speak concisely, warmly, and professionally like an experienced corporate receptionist. Your job is to welcome the caller, ask for their name and company, understand what they need, and either answer high-level questions or route them to sales (Extension 102 - Marcus) or support (Extension 103 - David). Keep your responses to 1-3 spoken sentences. Never read out robotic bullet points.',
      qualificationRubric: {
        minScoreToBook: 40,
        requiresBudget: false,
        requiresTimeline: false,
        requiresAuthority: false,
      },
      allowedTools: ['lookup_caller_crm', 'transfer_call', 'book_calendar_appointment', 'send_sms'],
      handoffExtension: '100',
      stats: {
        totalCalls: 342,
        qualifiedLeads: 210,
        appointmentsBooked: 88,
        avgCallDurationSec: 145,
        satisfactionScore: 4.9,
      },
    },
    {
      id: 'agent-sdr-marcus',
      name: 'Marcus',
      role: 'sdr',
      title: 'Autonomous Inbound & Outbound AI SDR',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      voiceGender: 'male',
      voicePitch: 0.95,
      voiceRate: 1.05,
      assignedExtension: '102',
      objective: 'Conduct high-impact discovery on inbound sales leads, probe pain points, quantify BANT (Budget, Authority, Need, Timeline), overcome objections with consultative positioning, and secure a booked product demo appointment on the calendar.',
      systemPrompt: 'You are Marcus, the elite AI Sales Development Representative (SDR) for Apex Cloud Systems. You are charismatic, consultative, curious, and direct. You use the BANT framework without sounding like a checklist. Ask probing questions: understand their current PBX or telecom headaches, team size, budget, and deployment timeline. When they express strong interest or fit, pitch the 20-minute executive architecture demo and book a calendar slot immediately. Always keep voice answers concise (2-4 spoken sentences).',
      qualificationRubric: {
        minScoreToBook: 65,
        requiresBudget: true,
        requiresTimeline: true,
        requiresAuthority: true,
      },
      allowedTools: ['lookup_caller_crm', 'create_or_update_lead', 'book_calendar_appointment', 'send_sms', 'transfer_call'],
      handoffExtension: '100',
      stats: {
        totalCalls: 512,
        qualifiedLeads: 324,
        appointmentsBooked: 168,
        avgCallDurationSec: 280,
        satisfactionScore: 4.8,
      },
    },
    {
      id: 'agent-support-david',
      name: 'David',
      role: 'support',
      title: 'AI Technical Support Specialist',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      voiceGender: 'male',
      voicePitch: 1.0,
      voiceRate: 1.0,
      assignedExtension: '103',
      objective: 'Troubleshoot SIP trunking, call routing, audio codec latency, extension mapping issues, and log support tickets with automated SLA tracking.',
      systemPrompt: 'You are David, a senior AI Telephony & PBX Support Engineer at Apex Cloud Systems. You are calm, empathetic, and technically precise. Help callers troubleshoot SIP configurations, WebRTC audio devices, call recording issues, and ticketing. If an issue requires Tier 3 engineer intervention, create a high-priority ticket and reassure the client.',
      qualificationRubric: {
        minScoreToBook: 20,
        requiresBudget: false,
        requiresTimeline: false,
        requiresAuthority: false,
      },
      allowedTools: ['lookup_caller_crm', 'create_support_ticket', 'transfer_call', 'send_sms'],
      handoffExtension: '100',
      stats: {
        totalCalls: 189,
        qualifiedLeads: 15,
        appointmentsBooked: 12,
        avgCallDurationSec: 320,
        satisfactionScore: 4.7,
      },
    },
    {
      id: 'agent-am-elena',
      name: 'Elena',
      role: 'account_manager',
      title: 'AI Client Success & Expansion Manager',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      voiceGender: 'female',
      voicePitch: 1.0,
      voiceRate: 1.0,
      assignedExtension: '104',
      objective: 'Manage enterprise account relationships, check account health, identify renewal/upsell opportunities (e.g. additional DIDs or AI SDR seats), and book business reviews.',
      systemPrompt: 'You are Elena, AI Account Manager for Apex Cloud Systems. You maintain strong relationships with existing enterprise clients. You review current utilization, discuss contract expansions, and address renewal timelines.',
      qualificationRubric: {
        minScoreToBook: 50,
        requiresBudget: true,
        requiresTimeline: false,
        requiresAuthority: true,
      },
      allowedTools: ['lookup_caller_crm', 'book_calendar_appointment', 'create_or_update_lead', 'send_sms'],
      handoffExtension: '100',
      stats: {
        totalCalls: 124,
        qualifiedLeads: 78,
        appointmentsBooked: 44,
        avgCallDurationSec: 215,
        satisfactionScore: 4.9,
      },
    },
    {
      id: 'agent-supervisor-victoria',
      name: 'Victoria',
      role: 'supervisor',
      title: 'AI Sales Floor Supervisor & Quality Analyst',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      voiceGender: 'female',
      voicePitch: 0.98,
      voiceRate: 1.0,
      assignedExtension: '100',
      objective: 'Monitor live calls across all extensions, analyze prospect sentiment in real-time, detect high-value enterprise triggers ($50k+ budget, 500+ seats), and whisper advice or take over calls when critical.',
      systemPrompt: 'You are Victoria, the executive AI Sales Director and Call Floor Supervisor. You monitor call streams, evaluate objection handling, and alert the sales leadership when high-stakes enterprise deals are detected.',
      qualificationRubric: {
        minScoreToBook: 70,
        requiresBudget: true,
        requiresTimeline: true,
        requiresAuthority: true,
      },
      allowedTools: ['transfer_call', 'escalate_to_human_manager', 'send_sms'],
      handoffExtension: '100',
      stats: {
        totalCalls: 68,
        qualifiedLeads: 55,
        appointmentsBooked: 32,
        avgCallDurationSec: 360,
        satisfactionScore: 5.0,
      },
    },
  ];

  const virtualNumbers: VirtualNumber[] = [
    {
      id: 'did-1',
      number: '+1 (555) 019-4820',
      label: 'Main Corporate Line (Sophia Receptionist)',
      assignedAgentId: 'agent-receptionist-sophia',
      assignedExtension: '101',
      smsEnabled: true,
      countryCode: 'US',
      status: 'active',
      monthlyMinutes: 4820,
    },
    {
      id: 'did-2',
      number: '+1 (555) 019-4821',
      label: 'Direct Inbound Sales & SDR Hotline (Marcus)',
      assignedAgentId: 'agent-sdr-marcus',
      assignedExtension: '102',
      smsEnabled: true,
      countryCode: 'US',
      status: 'active',
      monthlyMinutes: 6150,
    },
    {
      id: 'did-3',
      number: '+1 (800) 555-0199',
      label: 'Toll-Free Enterprise Support (David)',
      assignedAgentId: 'agent-support-david',
      assignedExtension: '103',
      smsEnabled: true,
      countryCode: 'US',
      status: 'active',
      monthlyMinutes: 2900,
    },
  ];

  const extensions: PBXExtension[] = [
    {
      extensionNumber: '100',
      name: 'Victoria - Floor Supervisor / Executive Desk',
      department: 'Executive Sales & Operations',
      type: 'ai_agent',
      targetAgentId: 'agent-supervisor-victoria',
      status: 'available',
      voicemailEnabled: true,
    },
    {
      extensionNumber: '101',
      name: 'Sophia - Inbound AI Receptionist',
      department: 'Front Office & Triage',
      type: 'ai_agent',
      targetAgentId: 'agent-receptionist-sophia',
      status: 'available',
      voicemailEnabled: true,
    },
    {
      extensionNumber: '102',
      name: 'Marcus - Autonomous AI SDR Specialist',
      department: 'Sales Development',
      type: 'ai_agent',
      targetAgentId: 'agent-sdr-marcus',
      status: 'available',
      voicemailEnabled: true,
    },
    {
      extensionNumber: '103',
      name: 'David - AI Telecom Support Engineer',
      department: 'Technical Support',
      type: 'ai_agent',
      targetAgentId: 'agent-support-david',
      status: 'available',
      voicemailEnabled: true,
    },
    {
      extensionNumber: '104',
      name: 'Elena - AI Enterprise Account Manager',
      department: 'Client Success',
      type: 'ai_agent',
      targetAgentId: 'agent-am-elena',
      status: 'available',
      voicemailEnabled: true,
    },
    {
      extensionNumber: '200',
      name: 'Tier 1 Human Sales Rep (SIP Softphone)',
      department: 'Human SDR Escalation',
      type: 'human_sip',
      sipUri: 'sip:rep200@sip.apexcloud.net',
      status: 'available',
      forwardingNumber: '+1 (555) 992-1144',
      voicemailEnabled: true,
    },
  ];

  const ringGroups: RingGroup[] = [
    {
      id: 'rg-1',
      name: 'Inbound Sales Hunt Group',
      number: '801',
      strategy: 'simultaneous',
      members: ['102', '200'],
      timeoutSeconds: 25,
      fallbackExtension: '101',
    },
    {
      id: 'rg-2',
      name: 'VIP Executive Escalation Queue',
      number: '802',
      strategy: 'hunt',
      members: ['100', '102'],
      timeoutSeconds: 20,
      fallbackExtension: '100',
    },
  ];

  const leads: CRMLead[] = [
    {
      id: 'lead-1',
      name: 'Jonathan Sterling',
      company: 'OmniLogistics Global',
      email: 'jsterling@omnilogistics.com',
      phone: '+1 (555) 329-8812',
      title: 'VP of Inside Sales',
      status: 'demo_booked',
      dealSize: 48000,
      score: 95,
      bant: {
        budget: 'High',
        budgetDetails: '$50k/yr budgeted for AI PBX replacement',
        authority: 'Decision Maker',
        need: 'Replace legacy Avaya PBX with autonomous AI SDRs for 80 agents',
        timeline: 'Immediate (< 30d)',
        score: 95,
        isQualified: true,
        notes: 'Requested live demo with architecture review for their CTO.',
      },
      source: 'Inbound Call DID +1 (555) 019-4821',
      assignedAgent: 'Marcus (AI SDR)',
      lastContactDate: new Date(Date.now() - 3600000 * 4).toISOString(),
      notes: [
        'Called via Inbound Sales DID. Marcus conducted discovery.',
        'Expressed urgency due to contract renewal with existing carrier next month.',
        'Demo booked for upcoming Thursday 2:00 PM EST.',
      ],
      callIds: ['call-seed-1'],
    },
    {
      id: 'lead-2',
      name: 'Samantha Ray',
      company: 'Fintech Velocity',
      email: 'sray@fintechvelocity.io',
      phone: '+1 (555) 781-4402',
      title: 'Director of Growth',
      status: 'sql',
      dealSize: 32000,
      score: 82,
      bant: {
        budget: 'Medium',
        budgetDetails: '$25k-$35k approved',
        authority: 'Decision Maker',
        need: 'Automate after-hours caller qualification and calendar booking',
        timeline: '1-3 months',
        score: 82,
        isQualified: true,
        notes: 'Concerned about latency and natural voice tone; loved Sophia demo.',
      },
      source: 'Web Inbound Call',
      assignedAgent: 'Sophia (Receptionist)',
      lastContactDate: new Date(Date.now() - 3600000 * 24).toISOString(),
      notes: ['Spoke with Sophia, transferred to Marcus for qualification.'],
      callIds: ['call-seed-2'],
    },
    {
      id: 'lead-3',
      name: 'Dr. Arthur Pendelton',
      company: 'Apex Health Systems',
      email: 'apendelton@apexhealth.org',
      phone: '+1 (555) 412-9901',
      title: 'Chief Medical Informatics Officer',
      status: 'mql',
      dealSize: 65000,
      score: 72,
      bant: {
        budget: 'High',
        budgetDetails: 'Grant & Capital budget available',
        authority: 'Influencer',
        need: 'HIPAA-compliant patient appointment reminder & triage PBX',
        timeline: '3-6 months',
        score: 72,
        isQualified: true,
        notes: 'Needs BAA signed and on-premise PBX bridge integration.',
      },
      source: 'Outbound SDR Campaign',
      assignedAgent: 'Marcus (AI SDR)',
      lastContactDate: new Date(Date.now() - 3600000 * 48).toISOString(),
      notes: ['Contacted via Healthcare Outbound campaign.'],
      callIds: ['call-seed-3'],
    },
  ];

  const appointments: CalendarAppointment[] = [
    {
      id: 'apt-1',
      leadId: 'lead-1',
      leadName: 'Jonathan Sterling',
      leadCompany: 'OmniLogistics Global',
      leadEmail: 'jsterling@omnilogistics.com',
      title: 'DialWise AI PBX Architecture & Executive Demo',
      date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      timeSlot: '14:00 EST',
      agentId: 'agent-sdr-marcus',
      meetingLink: 'https://meet.dialwise.io/room-omnilogistics-8812',
      status: 'confirmed',
      notes: 'Booked automatically by Marcus during 4m 12s inbound discovery call.',
    },
    {
      id: 'apt-2',
      leadId: 'lead-2',
      leadName: 'Samantha Ray',
      leadCompany: 'Fintech Velocity',
      leadEmail: 'sray@fintechvelocity.io',
      title: 'DialWise Voice AI Latency & CRM Integration Walkthrough',
      date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      timeSlot: '11:30 EST',
      agentId: 'agent-sdr-marcus',
      meetingLink: 'https://meet.dialwise.io/room-fintech-velocity-4402',
      status: 'confirmed',
      notes: 'Follow-up consultation on after-hours SDR call flow.',
    },
  ];

  const calls: CallSession[] = [
    {
      id: 'call-seed-1',
      direction: 'inbound',
      callerNumber: '+1 (555) 329-8812',
      callerName: 'Jonathan Sterling',
      callerCompany: 'OmniLogistics Global',
      calleeNumber: '+1 (555) 019-4821',
      didNumber: '+1 (555) 019-4821',
      status: 'completed',
      startTime: new Date(Date.now() - 3600000 * 4).toISOString(),
      endTime: new Date(Date.now() - 3600000 * 4 + 252000).toISOString(),
      durationSeconds: 252,
      agentId: 'agent-sdr-marcus',
      extension: '102',
      sentiment: 'positive',
      qualificationScore: 95,
      bant: {
        budget: 'High',
        budgetDetails: '$50,000 / year',
        authority: 'Decision Maker',
        need: 'Replace Avaya PBX with autonomous SDR triage for 80 sales reps',
        timeline: 'Immediate (< 30d)',
        score: 95,
        isQualified: true,
        notes: 'Prospect confirmed budget authority and immediate 30-day requirement.',
      },
      summary: 'Inbound prospect Jonathan Sterling looking for an enterprise virtual PBX with autonomous AI SDRs. Marcus conducted consultative BANT discovery, confirmed $50k budget and 30-day timeline, and booked a live demo for Thursday 2 PM.',
      actionItems: [
        'Send calendar invite with Google Meet link (Completed by AI)',
        'Create Salesforce / CRM Opportunity (Completed by AI)',
        'Notify Executive Account Executive for high-value deal prep',
      ],
      transcript: [
        {
          id: 't-1',
          sender: 'system',
          text: 'Call connected to DID +1 (555) 019-4821. Routed to Extension 102 (Marcus AI SDR).',
          timestamp: '00:00',
        },
        {
          id: 't-2',
          sender: 'agent',
          text: 'Thanks for calling Apex Cloud Systems, this is Marcus. How can I help your business scale today?',
          timestamp: '00:02',
        },
        {
          id: 't-3',
          sender: 'caller',
          text: 'Hi Marcus, I am Jonathan from OmniLogistics. We are currently looking to replace our legacy PBX system with an AI-driven PBX that has automated SDR inbound qualification.',
          timestamp: '00:10',
        },
        {
          id: 't-4',
          sender: 'agent',
          text: 'That is exactly what we specialize in, Jonathan. OmniLogistics has high call volume across your operations. Roughly how many sales reps or extensions are you looking to equip, and what is your target deployment timeline?',
          timestamp: '00:19',
        },
        {
          id: 't-5',
          sender: 'caller',
          text: 'We have about 80 inside sales reps. Our existing PBX contract expires in 30 days, so we have approved around $50,000 to deploy a modern solution immediately.',
          timestamp: '00:32',
        },
        {
          id: 't-6',
          sender: 'agent',
          text: 'That timing is ideal. Given your scale, our autonomous SDR workforce can handle simultaneous inbound call routing, qualify prospects using BANT in real-time, and sync directly to your CRM. Let us set up a live 20-minute executive demo with our solutions architect. How does Thursday at 2:00 PM EST look for you?',
          timestamp: '00:46',
        },
        {
          id: 't-7',
          sender: 'caller',
          text: 'Thursday at 2:00 PM works great. My email is jsterling@omnilogistics.com.',
          timestamp: '00:58',
        },
        {
          id: 't-8',
          sender: 'agent',
          text: 'Wonderful, Jonathan! I have locked in Thursday at 2:00 PM EST and dispatched the calendar invite and confirmation SMS to your number. We look forward to showing you the system.',
          timestamp: '01:08',
        },
      ],
      toolExecutions: [
        {
          id: 'tool-exec-1',
          toolName: 'create_or_update_lead',
          timestamp: '00:40',
          input: { name: 'Jonathan Sterling', company: 'OmniLogistics Global', dealSize: 50000 },
          output: { leadId: 'lead-1', status: 'created' },
          status: 'success',
          summary: 'Created CRM Lead for Jonathan Sterling ($50,000 deal size, High Intent)',
        },
        {
          id: 'tool-exec-2',
          toolName: 'book_calendar_appointment',
          timestamp: '01:05',
          input: { date: 'Thursday', timeSlot: '14:00 EST', email: 'jsterling@omnilogistics.com' },
          output: { appointmentId: 'apt-1', status: 'confirmed' },
          status: 'success',
          summary: 'Booked Calendar Appointment for Thursday 2:00 PM EST',
        },
        {
          id: 'tool-exec-3',
          toolName: 'send_sms',
          timestamp: '01:07',
          input: { phone: '+1 (555) 329-8812', template: 'appointment_confirmation' },
          output: { messageId: 'sms-9912', status: 'delivered' },
          status: 'success',
          summary: 'Sent SMS Confirmation to +1 (555) 329-8812',
        },
      ],
    },
  ];

  const campaigns: OutboundCampaign[] = [
    {
      id: 'cmp-1',
      name: 'Q4 Enterprise PBX Modernization - SaaS 100',
      agentId: 'agent-sdr-marcus',
      status: 'running',
      targetAudience: 'VPs of Sales & Sales Ops at 50-500 employee tech companies',
      scriptGoal: 'Probe satisfaction with existing telephony, introduce autonomous AI SDR qualification, and book a 20-min product tour.',
      leadIds: ['lead-1', 'lead-2', 'lead-3'],
      dialsCount: 64,
      connectedCount: 42,
      qualifiedCount: 18,
      appointmentsCount: 9,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];

  return {
    users: [defaultAdmin, defaultSdrUser],
    virtualNumbers,
    extensions,
    ringGroups,
    agents,
    calls,
    leads,
    appointments,
    campaigns,
    auditLogs: [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        action: 'SYSTEM_BOOT',
        details: 'DialWise AI Virtual PBX & Agentic SDR Engine initialized with encrypted storage.',
      },
    ],
  };
}

class Database {
  private store: DialWiseStore;

  constructor() {
    this.store = this.loadStore();
  }

  private loadStore(): DialWiseStore {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Failed to read store file, reinitializing default:', err);
    }
    const initial = getInitialStore();
    this.saveStore(initial);
    return initial;
  }

  public saveStore(customStore?: DialWiseStore): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const dataToSave = customStore || this.store;
      fs.writeFileSync(STORE_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error saving store:', err);
    }
  }

  public getStore(): DialWiseStore {
    return this.store;
  }

  // Users & Auth
  public findUserByEmail(email: string): DBUser | undefined {
    return this.store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): DBUser | undefined {
    return this.store.users.find(u => u.id === id);
  }

  public createUser(user: DBUser): DBUser {
    this.store.users.push(user);
    this.logAction('USER_REGISTERED', user.id, `User ${user.email} registered in company ${user.companyName}`);
    this.saveStore();
    return user;
  }

  public logAction(action: string, userId?: string, details?: string): void {
    this.store.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      userId,
      details: details || '',
    });
    if (this.store.auditLogs.length > 200) {
      this.store.auditLogs = this.store.auditLogs.slice(0, 200);
    }
    this.saveStore();
  }

  // Virtual Numbers
  public getVirtualNumbers(): VirtualNumber[] {
    return this.store.virtualNumbers;
  }

  public addVirtualNumber(num: VirtualNumber): VirtualNumber {
    this.store.virtualNumbers.push(num);
    this.saveStore();
    return num;
  }

  public updateVirtualNumber(id: string, updates: Partial<VirtualNumber>): VirtualNumber | null {
    const idx = this.store.virtualNumbers.findIndex(v => v.id === id);
    if (idx === -1) return null;
    this.store.virtualNumbers[idx] = { ...this.store.virtualNumbers[idx], ...updates };
    this.saveStore();
    return this.store.virtualNumbers[idx];
  }

  // Extensions
  public getExtensions(): PBXExtension[] {
    return this.store.extensions;
  }

  public updateExtension(extNum: string, updates: Partial<PBXExtension>): PBXExtension | null {
    const idx = this.store.extensions.findIndex(e => e.extensionNumber === extNum);
    if (idx === -1) return null;
    this.store.extensions[idx] = { ...this.store.extensions[idx], ...updates };
    this.saveStore();
    return this.store.extensions[idx];
  }

  // Agents
  public getAgents(): AIAgent[] {
    return this.store.agents;
  }

  public getAgentById(id: string): AIAgent | undefined {
    return this.store.agents.find(a => a.id === id);
  }

  public updateAgent(id: string, updates: Partial<AIAgent>): AIAgent | null {
    const idx = this.store.agents.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.store.agents[idx] = { ...this.store.agents[idx], ...updates };
    this.saveStore();
    return this.store.agents[idx];
  }

  // Calls
  public getCalls(): CallSession[] {
    return this.store.calls;
  }

  public getCallById(id: string): CallSession | undefined {
    return this.store.calls.find(c => c.id === id);
  }

  public createCall(call: CallSession): CallSession {
    this.store.calls.unshift(call);
    this.saveStore();
    return call;
  }

  public updateCall(id: string, updates: Partial<CallSession>): CallSession | null {
    const idx = this.store.calls.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.store.calls[idx] = { ...this.store.calls[idx], ...updates };
    this.saveStore();
    return this.store.calls[idx];
  }

  // Leads
  public getLeads(): CRMLead[] {
    return this.store.leads;
  }

  public getLeadById(id: string): CRMLead | undefined {
    return this.store.leads.find(l => l.id === id);
  }

  public createLead(lead: CRMLead): CRMLead {
    this.store.leads.unshift(lead);
    this.saveStore();
    return lead;
  }

  public updateLead(id: string, updates: Partial<CRMLead>): CRMLead | null {
    const idx = this.store.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.store.leads[idx] = { ...this.store.leads[idx], ...updates };
    this.saveStore();
    return this.store.leads[idx];
  }

  // Appointments
  public getAppointments(): CalendarAppointment[] {
    return this.store.appointments;
  }

  public createAppointment(apt: CalendarAppointment): CalendarAppointment {
    this.store.appointments.unshift(apt);
    this.saveStore();
    return apt;
  }

  // Campaigns
  public getCampaigns(): OutboundCampaign[] {
    return this.store.campaigns;
  }

  public createCampaign(cmp: OutboundCampaign): OutboundCampaign {
    this.store.campaigns.unshift(cmp);
    this.saveStore();
    return cmp;
  }

  public updateCampaign(id: string, updates: Partial<OutboundCampaign>): OutboundCampaign | null {
    const idx = this.store.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.store.campaigns[idx] = { ...this.store.campaigns[idx], ...updates };
    this.saveStore();
    return this.store.campaigns[idx];
  }
}

export const db = new Database();
