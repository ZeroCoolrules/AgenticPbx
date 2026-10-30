export type Role = 'admin' | 'sales_director' | 'sdr_agent' | 'support_agent' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  companyName: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface VirtualNumber {
  id: string;
  number: string;
  label: string;
  assignedAgentId: string;
  assignedExtension: string;
  smsEnabled: boolean;
  countryCode: string;
  status: 'active' | 'suspended';
  monthlyMinutes: number;
}

export type ExtensionType = 'ai_agent' | 'human_sip' | 'ring_group' | 'voicemail';

export interface PBXExtension {
  extensionNumber: string;
  name: string;
  department: string;
  type: ExtensionType;
  targetAgentId?: string;
  sipUri?: string;
  status: 'available' | 'in_call' | 'dnd' | 'offline';
  forwardingNumber?: string;
  voicemailEnabled: boolean;
}

export interface RingGroup {
  id: string;
  name: string;
  number: string;
  strategy: 'simultaneous' | 'round_robin' | 'hunt';
  members: string[]; // extension numbers
  timeoutSeconds: number;
  fallbackExtension: string;
}

export type AgentRole = 'receptionist' | 'sdr' | 'account_manager' | 'support' | 'supervisor';

export interface AIAgent {
  id: string;
  name: string;
  role: AgentRole;
  title: string;
  avatar: string;
  voiceGender: 'female' | 'male';
  voicePitch: number;
  voiceRate: number;
  assignedExtension: string;
  objective: string;
  systemPrompt: string;
  qualificationRubric: {
    minScoreToBook: number;
    requiresBudget: boolean;
    requiresTimeline: boolean;
    requiresAuthority: boolean;
  };
  allowedTools: string[];
  handoffExtension: string;
  stats: {
    totalCalls: number;
    qualifiedLeads: number;
    appointmentsBooked: number;
    avgCallDurationSec: number;
    satisfactionScore: number;
  };
}

export interface TranscriptMessage {
  id: string;
  sender: 'caller' | 'agent' | 'system' | 'supervisor';
  text: string;
  timestamp: string;
  durationMs?: number;
  audioLevel?: number;
}

export interface BANTScores {
  budget: 'High' | 'Medium' | 'Low' | 'Unknown';
  budgetDetails: string;
  authority: 'Decision Maker' | 'Influencer' | 'User/Researcher' | 'Unknown';
  need: string;
  timeline: 'Immediate (< 30d)' | '1-3 months' | '3-6 months' | 'Uncertain';
  score: number; // 0 - 100
  isQualified: boolean;
  notes: string;
}

export interface ToolExecution {
  id: string;
  toolName: string;
  timestamp: string;
  input: Record<string, any>;
  output: Record<string, any>;
  status: 'success' | 'failed';
  summary: string;
}

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'ringing' | 'connected' | 'on_hold' | 'transferred' | 'completed' | 'voicemail';

export interface CallSession {
  id: string;
  direction: CallDirection;
  callerNumber: string;
  callerName?: string;
  callerCompany?: string;
  calleeNumber: string;
  didNumber: string;
  status: CallStatus;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  agentId: string;
  extension: string;
  transcript: TranscriptMessage[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
  qualificationScore: number;
  bant: BANTScores;
  summary: string;
  actionItems: string[];
  toolExecutions: ToolExecution[];
  recordingUrl?: string;
}

export type LeadStatus = 'new' | 'contacted' | 'mql' | 'sql' | 'demo_booked' | 'proposal' | 'won' | 'disqualified';

export interface CRMLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  title: string;
  status: LeadStatus;
  dealSize: number;
  score: number;
  bant: BANTScores;
  source: string;
  assignedAgent: string;
  lastContactDate: string;
  notes: string[];
  callIds: string[];
}

export interface CalendarAppointment {
  id: string;
  leadId: string;
  leadName: string;
  leadCompany: string;
  leadEmail: string;
  title: string;
  date: string;
  timeSlot: string;
  agentId: string;
  meetingLink: string;
  status: 'confirmed' | 'rescheduled' | 'cancelled';
  notes: string;
}

export interface OutboundCampaign {
  id: string;
  name: string;
  agentId: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  targetAudience: string;
  scriptGoal: string;
  leadIds: string[];
  dialsCount: number;
  connectedCount: number;
  qualifiedCount: number;
  appointmentsCount: number;
  createdAt: string;
}

export interface PBXSystemMetrics {
  activeCallsCount: number;
  callsTodayCount: number;
  avgWaitTimeSeconds: number;
  aiHandledPercentage: number;
  appointmentsBookedToday: number;
  sipTrunksOnline: number;
}

export interface WebRTCQualityPoint {
  time: string;
  timestamp: number;
  jitterMs: number;
  packetLossPercent: number;
  rttMs: number;
  mosScore: number;
  bitrateKbps: number;
}

export interface WebRTCTrunkDiagnostics {
  trunkId: string;
  trunkName: string;
  region: string;
  codec: string;
  iceState: 'connected' | 'completed' | 'checking' | 'disconnected';
  dtxEnabled: boolean;
  jitterBufferDelayMs: number;
  currentJitterMs: number;
  currentPacketLossPercent: number;
  currentRttMs: number;
  currentMos: number;
  mosRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  status: 'optimal' | 'warning' | 'critical';
}

export type SMSDirection = 'inbound' | 'outbound';
export type SMSSenderType = 'customer' | 'human_agent' | 'ai_autonomous';
export type SMSDeliveryStatus = 'sent' | 'delivered' | 'failed' | 'received';

export interface SMSMessage {
  id: string;
  threadId: string;
  fromNumber: string;
  toNumber: string;
  direction: SMSDirection;
  senderType: SMSSenderType;
  senderName: string;
  text: string;
  timestamp: string;
  status: SMSDeliveryStatus;
  aiSuggested?: boolean;
}

export interface SMSThread {
  id: string;
  customerNumber: string;
  customerName: string;
  customerCompany?: string;
  assignedDid: string;
  lastMessageText: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  autonomousMode: boolean; // if true, AI auto-replies independently
  assignedAgentId: string;
  leadId?: string;
  bantScore?: number;
  status: 'open' | 'resolved' | 'waiting_customer' | 'waiting_agent';
}

