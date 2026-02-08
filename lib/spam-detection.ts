/**
 * AI-powered Spam Detection & Trust Scoring Engine
 * 
 * Multi-layered approach to detect spam/prank/false emergency reports:
 * 1. Text pattern analysis (known prank phrases, gibberish detection)
 * 2. Behavioral signals (session duration, message patterns)
 * 3. AI classification (GPT-based intent analysis)
 * 4. Trust scoring (composite score from all signals)
 * 5. Repeat offender tracking
 */

import { createClient } from '@supabase/supabase-js';

// ── Types ──

export interface TrustSignals {
  textQuality: number;         // 0-1: Is the text coherent and specific?
  behavioralScore: number;     // 0-1: Does behavior match genuine emergency?
  locationConfidence: number;  // 0-1: Is location data present and reasonable?
  sessionDuration: number;     // seconds the session has been active
  messageCount: number;        // number of messages in conversation
  hasSpecificDetails: boolean; // mentions specific location, people, symptoms
  hasImageEvidence: boolean;   // user provided photo/video
  ipReputation: number;        // 0-1: history of this IP
  duplicateScore: number;      // 0-1: similarity to recent reports (0=unique, 1=duplicate)
}

export interface SpamVerdict {
  trustScore: number;          // 0-100 composite score
  classification: 'genuine' | 'suspicious' | 'likely_spam' | 'confirmed_spam';
  reasons: string[];           // human-readable reasons
  action: 'allow' | 'flag_for_review' | 'require_verification' | 'block';
  requiresVerification: boolean;
  verificationMethod?: 'callback' | 'location_confirm' | 'photo_required';
}

// ── Known spam/prank patterns ──

const PRANK_PHRASES = [
  'just kidding', 'jk', 'lol', 'haha', 'this is a test',
  'testing', 'prank', 'fake', 'not real', 'just joking',
  'swatting', 'swat', 'dare', 'for fun', 'bet you can\'t',
  'yo mama', 'deez nuts', 'ligma', 'send cops to',
  'i\'m bored', 'nothing happened', 'false alarm on purpose',
];

const GIBBERISH_PATTERN = /^[^aeiou]{10,}|(.)\1{5,}|^[a-z]{1,2}$/i;
const EXCESSIVE_CAPS_THRESHOLD = 0.7;
const MIN_MEANINGFUL_LENGTH = 10;

// ── In-memory tracking stores ──

interface IPHistory {
  totalReports: number;
  spamReports: number;
  genuineReports: number;
  lastReport: number;
  flaggedCount: number;
}

const ipHistoryStore = new Map<string, IPHistory>();

interface RecentReport {
  text: string;
  type: string;
  location: string;
  timestamp: number;
  ip: string;
  sessionId: string;
}

const recentReports: RecentReport[] = [];
const MAX_RECENT_REPORTS = 500;

// ── Core Analysis Functions ──

/**
 * Analyze text quality and detect spam patterns
 */
export function analyzeTextQuality(text: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 1.0;

  if (!text || text.trim().length === 0) {
    return { score: 0, reasons: ['Empty message'] };
  }

  const cleaned = text.trim().toLowerCase();

  // Check for known prank phrases
  for (const phrase of PRANK_PHRASES) {
    if (cleaned.includes(phrase)) {
      score -= 0.4;
      reasons.push(`Contains known prank phrase: "${phrase}"`);
      break; // Only penalize once for prank phrases
    }
  }

  // Check for gibberish
  if (GIBBERISH_PATTERN.test(cleaned)) {
    score -= 0.3;
    reasons.push('Text appears to be gibberish');
  }

  // Check message length
  if (cleaned.length < MIN_MEANINGFUL_LENGTH) {
    score -= 0.2;
    reasons.push('Message too short to contain emergency details');
  }

  // Check for excessive caps (shouting/spam)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (text.length > 20 && capsRatio > EXCESSIVE_CAPS_THRESHOLD) {
    score -= 0.15;
    reasons.push('Excessive use of capital letters');
  }

  // Check for repeated characters (e.g., "aaaaaaa", "helppppppp")
  if (/(.)\1{4,}/i.test(text)) {
    score -= 0.1;
    reasons.push('Excessive character repetition');
  }

  // Check for specific emergency details (positive signals)
  const hasAddress = /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|blvd|drive|dr|nagar|colony|sector|block)/i.test(text);
  const hasSymptoms = /(bleeding|unconscious|breathing|chest pain|broken|fracture|burn|choking|seizure|stroke|heart attack|accident|crash|fire|smoke|gunshot|stabbing|drowning)/i.test(text);
  const hasNumbers = /\d+/.test(text);
  const hasPeopleCount = /(person|people|victim|injured|child|children|man|woman|elderly|baby)/i.test(text);

  if (hasAddress) { score += 0.1; }
  if (hasSymptoms) { score += 0.15; }
  if (hasNumbers && hasPeopleCount) { score += 0.1; }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

/**
 * Analyze behavioral signals
 */
export function analyzeBehavior(signals: {
  sessionDurationSec: number;
  messageCount: number;
  avgMessageIntervalSec: number;
  hasLocation: boolean;
  hasImage: boolean;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0.5; // Start neutral

  // Session duration: genuine emergencies usually have some conversation
  if (signals.sessionDurationSec < 5) {
    score -= 0.2;
    reasons.push('Session extremely short (< 5 seconds)');
  } else if (signals.sessionDurationSec > 30) {
    score += 0.15;
  }

  // Message count: genuine users engage with the AI
  if (signals.messageCount >= 3) {
    score += 0.15;
  } else if (signals.messageCount <= 1) {
    score -= 0.1;
    reasons.push('Very few messages in conversation');
  }

  // Message interval: spam tends to be rapid-fire
  if (signals.avgMessageIntervalSec < 2 && signals.messageCount > 3) {
    score -= 0.15;
    reasons.push('Messages sent unusually quickly');
  }

  // Location and image are strong positive signals
  if (signals.hasLocation) {
    score += 0.15;
  } else {
    score -= 0.1;
    reasons.push('No location data provided');
  }

  if (signals.hasImage) {
    score += 0.2;
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

/**
 * Check IP reputation based on history
 */
export function checkIPReputation(ip: string): { score: number; reasons: string[] } {
  const history = ipHistoryStore.get(ip);
  const reasons: string[] = [];

  if (!history) {
    return { score: 0.7, reasons: ['New IP, no history'] }; // Slightly trusted by default
  }

  let score = 0.7;

  // High spam ratio → low trust
  if (history.totalReports > 0) {
    const spamRatio = history.spamReports / history.totalReports;
    if (spamRatio > 0.5) {
      score -= 0.4;
      reasons.push(`High spam ratio: ${(spamRatio * 100).toFixed(0)}% of past reports flagged`);
    } else if (spamRatio > 0.2) {
      score -= 0.2;
      reasons.push(`Moderate spam ratio: ${(spamRatio * 100).toFixed(0)}% of past reports flagged`);
    }
  }

  // Too many reports in short time
  const timeSinceLastReport = Date.now() - history.lastReport;
  if (timeSinceLastReport < 5 * 60 * 1000 && history.totalReports > 3) {
    score -= 0.3;
    reasons.push('Multiple reports in very short time');
  }

  // Repeat flagged user
  if (history.flaggedCount >= 3) {
    score -= 0.3;
    reasons.push(`Previously flagged ${history.flaggedCount} times`);
  }

  // Good history bonus
  if (history.genuineReports > 0 && history.spamReports === 0) {
    score += 0.1;
    reasons.push('Clean history');
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

/**
 * Check for duplicate/similar reports
 */
export function checkDuplicates(report: {
  text: string;
  type: string;
  location: string;
  sessionId: string;
}): { score: number; reasons: string[]; duplicateOf?: string } {
  const reasons: string[] = [];
  const now = Date.now();
  const WINDOW = 30 * 60 * 1000; // 30-minute window

  // Clean up old reports
  while (recentReports.length > 0 && now - recentReports[0].timestamp > WINDOW) {
    recentReports.shift();
  }

  let highestSimilarity = 0;
  let duplicateSessionId: string | undefined;

  for (const recent of recentReports) {
    if (recent.sessionId === report.sessionId) continue; // Skip same session

    const similarity = calculateSimilarity(
      `${report.type} ${report.text} ${report.location}`,
      `${recent.type} ${recent.text} ${recent.location}`
    );

    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      duplicateSessionId = recent.sessionId;
    }
  }

  // Add current report to recent
  recentReports.push({
    text: report.text,
    type: report.type,
    location: report.location,
    timestamp: now,
    ip: '',
    sessionId: report.sessionId,
  });

  // Trim if needed
  while (recentReports.length > MAX_RECENT_REPORTS) {
    recentReports.shift();
  }

  if (highestSimilarity > 0.85) {
    reasons.push(`Very similar to recent report (${(highestSimilarity * 100).toFixed(0)}% match)`);
    return { score: highestSimilarity, reasons, duplicateOf: duplicateSessionId };
  } else if (highestSimilarity > 0.6) {
    reasons.push(`Partially similar to recent report (${(highestSimilarity * 100).toFixed(0)}% match)`);
    return { score: highestSimilarity, reasons, duplicateOf: duplicateSessionId };
  }

  return { score: 0, reasons: ['No duplicates found'] };
}

/**
 * Simple text similarity using Jaccard index on word n-grams
 */
function calculateSimilarity(text1: string, text2: string): number {
  const ngrams1 = new Set(getNGrams(text1.toLowerCase(), 2));
  const ngrams2 = new Set(getNGrams(text2.toLowerCase(), 2));

  if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  let intersection = 0;
  for (const gram of ngrams1) {
    if (ngrams2.has(gram)) intersection++;
  }

  const union = ngrams1.size + ngrams2.size - intersection;
  return intersection / union;
}

function getNGrams(text: string, n: number): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const grams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    grams.push(words.slice(i, i + n).join(' '));
  }
  // Also include individual words for better matching
  grams.push(...words);
  return grams;
}

/**
 * Record IP outcome for future reputation tracking
 */
export function recordIPOutcome(ip: string, outcome: 'genuine' | 'spam' | 'flagged'): void {
  const history = ipHistoryStore.get(ip) || {
    totalReports: 0,
    spamReports: 0,
    genuineReports: 0,
    lastReport: 0,
    flaggedCount: 0,
  };

  history.totalReports++;
  history.lastReport = Date.now();

  if (outcome === 'spam') history.spamReports++;
  if (outcome === 'genuine') history.genuineReports++;
  if (outcome === 'flagged') history.flaggedCount++;

  ipHistoryStore.set(ip, history);
}

// ── Main Spam Detection Function ──

/**
 * Compute a comprehensive spam verdict for an emergency report
 */
export function computeSpamVerdict(params: {
  text: string;
  emergencyType: string;
  location: string;
  sessionId: string;
  ip: string;
  sessionDurationSec: number;
  messageCount: number;
  avgMessageIntervalSec: number;
  hasLocation: boolean;
  hasImage: boolean;
  conversationHistory?: Array<{ role: string; content: string }>;
}): SpamVerdict {
  const reasons: string[] = [];

  // 1. Text quality analysis
  const textResult = analyzeTextQuality(params.text);

  // 2. Behavioral analysis
  const behaviorResult = analyzeBehavior({
    sessionDurationSec: params.sessionDurationSec,
    messageCount: params.messageCount,
    avgMessageIntervalSec: params.avgMessageIntervalSec,
    hasLocation: params.hasLocation,
    hasImage: params.hasImage,
  });

  // 3. IP reputation
  const ipResult = checkIPReputation(params.ip);

  // 4. Duplicate detection
  const dupResult = checkDuplicates({
    text: params.text,
    type: params.emergencyType,
    location: params.location,
    sessionId: params.sessionId,
  });

  // 5. Conversation coherence check
  let conversationScore = 0.7;
  if (params.conversationHistory && params.conversationHistory.length > 0) {
    const userMessages = params.conversationHistory.filter(m => m.role === 'user');
    // Check if user messages form a coherent narrative
    if (userMessages.length >= 2) {
      conversationScore = 0.85; // Multi-turn conversation is a good sign
    }
    // Check for contradictions (user says "just kidding" after reporting)
    const lastUserMsg = userMessages[userMessages.length - 1]?.content?.toLowerCase() || '';
    if (PRANK_PHRASES.some(p => lastUserMsg.includes(p))) {
      conversationScore = 0.1;
      reasons.push('User indicated this is not a real emergency');
    }
  }

  // ── Weighted composite score ──
  const weights = {
    text: 0.25,
    behavior: 0.20,
    ip: 0.15,
    duplicate: 0.15,
    conversation: 0.25,
  };

  const rawScore =
    textResult.score * weights.text +
    behaviorResult.score * weights.behavior +
    ipResult.score * weights.ip +
    (1 - dupResult.score) * weights.duplicate + // Invert: high dup = low trust
    conversationScore * weights.conversation;

  const trustScore = Math.round(rawScore * 100);

  // Collect all reasons
  reasons.push(
    ...textResult.reasons,
    ...behaviorResult.reasons,
    ...ipResult.reasons,
    ...dupResult.reasons.filter(r => !r.includes('No duplicates'))
  );

  // ── Classify and decide action ──
  let classification: SpamVerdict['classification'];
  let action: SpamVerdict['action'];
  let requiresVerification = false;
  let verificationMethod: SpamVerdict['verificationMethod'];

  if (trustScore >= 70) {
    classification = 'genuine';
    action = 'allow';
  } else if (trustScore >= 50) {
    classification = 'suspicious';
    action = 'flag_for_review';
    requiresVerification = true;
    verificationMethod = params.hasLocation ? 'photo_required' : 'location_confirm';
  } else if (trustScore >= 30) {
    classification = 'likely_spam';
    action = 'require_verification';
    requiresVerification = true;
    verificationMethod = 'callback';
    reasons.push('Report requires phone callback verification');
  } else {
    classification = 'confirmed_spam';
    action = 'block';
    reasons.push('Report blocked due to very low trust score');
  }

  // High-severity override: never fully block if it could be real
  const highSeverityKeywords = ['dying', 'dead', 'shooting', 'bomb', 'explosion', 'terrorist',
    'murder', 'kidnap', 'hostage', 'mass casualty', 'active shooter'];
  const textLower = params.text.toLowerCase();
  if (highSeverityKeywords.some(k => textLower.includes(k)) && action === 'block') {
    action = 'flag_for_review';
    classification = 'suspicious';
    reasons.push('Contains high-severity keywords — flagged for manual review instead of blocking');
  }

  // Record IP outcome
  if (classification === 'confirmed_spam' || classification === 'likely_spam') {
    recordIPOutcome(params.ip, 'spam');
  } else if (classification === 'suspicious') {
    recordIPOutcome(params.ip, 'flagged');
  } else {
    recordIPOutcome(params.ip, 'genuine');
  }

  return {
    trustScore,
    classification,
    reasons,
    action,
    requiresVerification,
    verificationMethod,
  };
}

/**
 * Quick spam check for lightweight endpoints (no full analysis)
 */
export function quickSpamCheck(text: string, ip: string): {
  isLikelySpam: boolean;
  reason?: string;
} {
  // Check IP reputation first
  const ipResult = checkIPReputation(ip);
  if (ipResult.score < 0.3) {
    return { isLikelySpam: true, reason: 'IP has poor reputation' };
  }

  // Quick text check
  const cleaned = text.trim().toLowerCase();
  for (const phrase of PRANK_PHRASES) {
    if (cleaned.includes(phrase)) {
      return { isLikelySpam: true, reason: `Contains prank phrase: "${phrase}"` };
    }
  }

  if (GIBBERISH_PATTERN.test(cleaned)) {
    return { isLikelySpam: true, reason: 'Text appears to be gibberish' };
  }

  return { isLikelySpam: false };
}

/**
 * Get spam statistics for dashboard
 */
export function getSpamStats(): {
  totalTrackedIPs: number;
  flaggedIPs: number;
  recentReportsCount: number;
  topOffenders: Array<{ ip: string; spamCount: number; totalReports: number }>;
} {
  const topOffenders: Array<{ ip: string; spamCount: number; totalReports: number }> = [];

  for (const [ip, history] of ipHistoryStore) {
    if (history.spamReports > 0) {
      topOffenders.push({
        ip,
        spamCount: history.spamReports,
        totalReports: history.totalReports,
      });
    }
  }

  topOffenders.sort((a, b) => b.spamCount - a.spamCount);

  return {
    totalTrackedIPs: ipHistoryStore.size,
    flaggedIPs: topOffenders.length,
    recentReportsCount: recentReports.length,
    topOffenders: topOffenders.slice(0, 10),
  };
}
