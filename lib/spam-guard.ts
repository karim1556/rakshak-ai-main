/**
 * Spam Guard Middleware
 * 
 * Combines rate limiting + spam detection into a single guard
 * that can be applied to any API route.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  escalationLimiter,
  agentConversationLimiter,
  analysisLimiter,
  speechLimiter,
  generalLimiter,
  getClientIP,
  rateLimitResponse,
  type RateLimiter,
} from './rate-limiter';
import {
  computeSpamVerdict,
  quickSpamCheck,
  type SpamVerdict,
} from './spam-detection';
import { createServerClient } from './supabase';

// ── Types ──

export interface SpamGuardResult {
  allowed: boolean;
  response?: Response;
  verdict?: SpamVerdict;
  ip: string;
}

// ── Route-specific guards ──

/**
 * Guard for the escalation endpoint (POST /api/escalation)
 * Most critical — this creates real incidents and dispatches responders
 */
export async function guardEscalation(
  req: NextRequest,
  session: any
): Promise<SpamGuardResult> {
  const ip = getClientIP(req);

  // 1. Rate limit check
  const rateCheck = escalationLimiter.check(ip);
  if (!rateCheck.allowed) {
    console.warn(`[SPAM GUARD] Rate limited escalation from IP: ${ip}`);
    return {
      allowed: false,
      ip,
      response: rateLimitResponse(rateCheck.retryAfter),
    };
  }

  // 2. Compute spam verdict
  const messages = session.messages || [];
  const userMessages = messages.filter((m: any) => m.role === 'user');
  const allUserText = userMessages.map((m: any) => m.content).join(' ');
  
  // Calculate session duration and message timing
  const timestamps = messages.map((m: any) => m.timestamp || 0).filter((t: number) => t > 0);
  const sessionDuration = timestamps.length > 1
    ? (Math.max(...timestamps) - Math.min(...timestamps)) / 1000
    : 0;
  const avgInterval = timestamps.length > 1
    ? sessionDuration / (timestamps.length - 1)
    : 30; // default to reasonable interval

  const verdict = computeSpamVerdict({
    text: allUserText || session.summary || '',
    emergencyType: session.type || 'other',
    location: session.location?.address || '',
    sessionId: session.id,
    ip,
    sessionDurationSec: sessionDuration,
    messageCount: userMessages.length,
    avgMessageIntervalSec: avgInterval,
    hasLocation: !!(session.location?.lat && session.location?.lng),
    hasImage: !!session.imageSnapshot,
    conversationHistory: messages,
  });

  console.log(`[SPAM GUARD] Escalation verdict for ${session.id}: score=${verdict.trustScore}, class=${verdict.classification}, action=${verdict.action}`);

  // 3. Act on verdict
  if (verdict.action === 'block') {
    // Log blocked attempt to Supabase for audit
    await logSpamAttempt(ip, session.id, verdict, 'escalation');
    
    return {
      allowed: false,
      verdict,
      ip,
      response: NextResponse.json({
        error: 'Your report has been flagged for review. If this is a genuine emergency, please call 112 directly.',
        code: 'SPAM_DETECTED',
        trustScore: verdict.trustScore,
        reasons: verdict.reasons,
      }, { status: 403 }),
    };
  }

  if (verdict.action === 'require_verification') {
    // Don't block, but mark for manual review
    await logSpamAttempt(ip, session.id, verdict, 'escalation');
    
    return {
      allowed: true, // Still allow through, but flagged
      verdict,
      ip,
    };
  }

  return {
    allowed: true,
    verdict,
    ip,
  };
}

/**
 * Guard for the emergency agent conversation endpoint
 */
export function guardAgentConversation(
  req: NextRequest,
  sessionId: string,
  message: string
): SpamGuardResult {
  const ip = getClientIP(req);

  // Rate limit per session
  const rateCheck = agentConversationLimiter.check(`${ip}:${sessionId}`);
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      ip,
      response: rateLimitResponse(rateCheck.retryAfter),
    };
  }

  // Quick spam check on the message
  const spamCheck = quickSpamCheck(message, ip);
  if (spamCheck.isLikelySpam) {
    console.warn(`[SPAM GUARD] Likely spam in agent conversation from IP: ${ip}, reason: ${spamCheck.reason}`);
    // Don't block agent conversations — just log. The AI agent can handle pranks.
  }

  return { allowed: true, ip };
}

/**
 * Guard for analysis endpoints
 */
export function guardAnalysis(req: NextRequest): SpamGuardResult {
  const ip = getClientIP(req);

  const rateCheck = analysisLimiter.check(ip);
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      ip,
      response: rateLimitResponse(rateCheck.retryAfter),
    };
  }

  return { allowed: true, ip };
}

/**
 * Guard for speech-to-text endpoint
 */
export function guardSpeech(req: NextRequest): SpamGuardResult {
  const ip = getClientIP(req);

  const rateCheck = speechLimiter.check(ip);
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      ip,
      response: rateLimitResponse(rateCheck.retryAfter),
    };
  }

  return { allowed: true, ip };
}

// ── Audit Logging ──

async function logSpamAttempt(
  ip: string,
  sessionId: string,
  verdict: SpamVerdict,
  endpoint: string
): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase.from('spam_reports').insert({
      ip_address: ip,
      session_id: sessionId,
      trust_score: verdict.trustScore,
      classification: verdict.classification,
      reasons: verdict.reasons,
      action_taken: verdict.action,
      endpoint,
    });
  } catch (error) {
    // Don't let logging failures break the flow
    console.error('[SPAM GUARD] Failed to log spam attempt:', error);
  }
}

/**
 * Get spam guard statistics (for dashboard)
 */
export function getGuardStats() {
  return {
    escalation: escalationLimiter.getStats(),
    agentConversation: agentConversationLimiter.getStats(),
    analysis: analysisLimiter.getStats(),
    speech: speechLimiter.getStats(),
  };
}
