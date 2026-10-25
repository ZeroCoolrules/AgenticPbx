import { BANTScores, LeadStatus } from '../types/index.ts';

/**
 * Calculates BANT score (0 - 100) based on qualification attributes
 */
export function calculateBANTScore(params: {
  budget: 'High' | 'Medium' | 'Low' | 'Unknown';
  authority: 'Decision Maker' | 'Influencer' | 'User/Researcher' | 'Unknown';
  need: string;
  timeline: 'Immediate (< 30d)' | '1-3 months' | '3-6 months' | 'Uncertain';
}): { score: number; isQualified: boolean } {
  let score = 0;

  // Budget weights (max 30 pts)
  switch (params.budget) {
    case 'High':
      score += 30;
      break;
    case 'Medium':
      score += 20;
      break;
    case 'Low':
      score += 8;
      break;
    case 'Unknown':
    default:
      score += 0;
  }

  // Authority weights (max 30 pts)
  switch (params.authority) {
    case 'Decision Maker':
      score += 30;
      break;
    case 'Influencer':
      score += 20;
      break;
    case 'User/Researcher':
      score += 10;
      break;
    case 'Unknown':
    default:
      score += 0;
  }

  // Need clarity weights (max 20 pts)
  const needText = (params.need || '').trim();
  if (needText.length > 50) {
    score += 20;
  } else if (needText.length > 10) {
    score += 12;
  } else if (needText.length > 0) {
    score += 5;
  }

  // Timeline weights (max 20 pts)
  switch (params.timeline) {
    case 'Immediate (< 30d)':
      score += 20;
      break;
    case '1-3 months':
      score += 15;
      break;
    case '3-6 months':
      score += 8;
      break;
    case 'Uncertain':
    default:
      score += 2;
  }

  // Qualified threshold is 65+ points and must not be Unknown on authority
  const isQualified = score >= 65 && params.authority !== 'Unknown';

  return {
    score: Math.min(100, Math.max(0, score)),
    isQualified,
  };
}

/**
 * Determines appropriate CRM pipeline stage based on qualification score
 */
export function determineLeadStage(currentStage: LeadStatus, bantScore: number, appointmentBooked: boolean): LeadStatus {
  if (appointmentBooked) {
    return 'demo_booked';
  }
  if (bantScore >= 75) {
    return 'sql';
  }
  if (bantScore >= 50) {
    return 'mql';
  }
  if (bantScore < 25 && currentStage === 'contacted') {
    return 'disqualified';
  }
  return currentStage === 'new' ? 'contacted' : currentStage;
}

/**
 * Resolves incoming call routing to extension or agent
 */
export function resolveCallRoute(
  didNumber: string,
  dids: Array<{ number: string; assignedAgentId: string; assignedExtension: string; status: string }>,
  extensions: Array<{ extensionNumber: string; status: string; forwardingNumber?: string }>
): {
  targetExtension: string;
  agentId: string;
  routedSuccessfully: boolean;
  isForwarded: boolean;
} {
  const matchedDid = dids.find(d => d.number.replace(/\D/g, '') === didNumber.replace(/\D/g, ''));
  if (!matchedDid || matchedDid.status !== 'active') {
    return {
      targetExtension: '100', // Default receptionist
      agentId: 'agent-receptionist',
      routedSuccessfully: false,
      isForwarded: false,
    };
  }

  const targetExt = extensions.find(e => e.extensionNumber === matchedDid.assignedExtension);
  if (targetExt && targetExt.status === 'available') {
    return {
      targetExtension: matchedDid.assignedExtension,
      agentId: matchedDid.assignedAgentId,
      routedSuccessfully: true,
      isForwarded: false,
    };
  }

  if (targetExt && targetExt.forwardingNumber) {
    return {
      targetExtension: matchedDid.assignedExtension,
      agentId: matchedDid.assignedAgentId,
      routedSuccessfully: true,
      isForwarded: true,
    };
  }

  // Fallback to primary receptionist agent
  return {
    targetExtension: '101',
    agentId: 'agent-receptionist',
    routedSuccessfully: true,
    isForwarded: false,
  };
}

/**
 * Analyzes call transcript text sentiment
 */
export function evaluateSentiment(text: string): 'positive' | 'neutral' | 'negative' | 'critical' {
  const lower = text.toLowerCase();
  const criticalWords = ['lawyer', 'sue', 'angry', 'unacceptable', 'scam', 'terrible service', 'cancel immediately'];
  if (criticalWords.some(w => lower.includes(w))) {
    return 'critical';
  }

  const negativeWords = ['disappointed', 'frustrated', 'bad', 'poor', 'not working', 'delay', 'broken', 'issue', 'problem'];
  if (negativeWords.some(w => lower.includes(w))) {
    return 'negative';
  }

  const positiveWords = ['great', 'excellent', 'love', 'perfect', 'interested', 'budget approved', 'ready to buy', 'sounds good', 'exciting', 'book a demo'];
  if (positiveWords.some(w => lower.includes(w))) {
    return 'positive';
  }

  return 'neutral';
}
