/**
 * In-memory rate limiter for API routes
 * Tracks requests per IP and per session to prevent abuse
 * 
 * In production, replace with Redis-based limiter (e.g., @upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  blockDurationMs: number; // How long to block after exceeding limit
  name: string;            // Identifier for the limiter
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request should be allowed
   * Returns { allowed, remaining, retryAfter }
   */
  check(key: string): { allowed: boolean; remaining: number; retryAfter: number; totalRequests: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    // No previous requests
    if (!entry) {
      this.store.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
      });
      return { allowed: true, remaining: this.config.maxRequests - 1, retryAfter: 0, totalRequests: 1 };
    }

    // Currently blocked
    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return { allowed: false, remaining: 0, retryAfter, totalRequests: entry.count };
    }

    // Block expired, reset
    if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
      this.store.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
      });
      return { allowed: true, remaining: this.config.maxRequests - 1, retryAfter: 0, totalRequests: 1 };
    }

    // Window expired, reset counter
    if (now - entry.firstRequest > this.config.windowMs) {
      this.store.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
      });
      return { allowed: true, remaining: this.config.maxRequests - 1, retryAfter: 0, totalRequests: 1 };
    }

    // Within window, increment
    entry.count++;
    entry.lastRequest = now;

    // Exceeded limit → block
    if (entry.count > this.config.maxRequests) {
      entry.blocked = true;
      entry.blockedUntil = now + this.config.blockDurationMs;
      this.store.set(key, entry);
      const retryAfter = Math.ceil(this.config.blockDurationMs / 1000);
      return { allowed: false, remaining: 0, retryAfter, totalRequests: entry.count };
    }

    this.store.set(key, entry);
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      retryAfter: 0,
      totalRequests: entry.count,
    };
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { activeKeys: number; blockedKeys: number } {
    let blockedKeys = 0;
    const now = Date.now();
    for (const [, entry] of this.store) {
      if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
        blockedKeys++;
      }
    }
    return { activeKeys: this.store.size, blockedKeys };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      // Remove entries whose window has expired and are not blocked
      if (now - entry.lastRequest > this.config.windowMs && !entry.blocked) {
        this.store.delete(key);
      }
      // Remove entries whose block has expired
      if (entry.blocked && entry.blockedUntil && now > entry.blockedUntil + this.config.windowMs) {
        this.store.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// ── Pre-configured limiters for different endpoints ──

// Emergency escalation: max 3 escalations per 10 minutes per IP
export const escalationLimiter = new RateLimiter({
  name: 'escalation',
  windowMs: 10 * 60 * 1000,
  maxRequests: 3,
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
});

// Emergency agent conversation: max 60 messages per 10 minutes per session
export const agentConversationLimiter = new RateLimiter({
  name: 'agent-conversation',
  windowMs: 10 * 60 * 1000,
  maxRequests: 60,
  blockDurationMs: 15 * 60 * 1000,
});

// Analysis endpoints: max 10 per 5 minutes per IP
export const analysisLimiter = new RateLimiter({
  name: 'analysis',
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
  blockDurationMs: 15 * 60 * 1000,
});

// Speech-to-text: max 30 per 5 minutes per IP
export const speechLimiter = new RateLimiter({
  name: 'speech',
  windowMs: 5 * 60 * 1000,
  maxRequests: 30,
  blockDurationMs: 10 * 60 * 1000,
});

// General API: max 100 requests per minute per IP
export const generalLimiter = new RateLimiter({
  name: 'general',
  windowMs: 60 * 1000,
  maxRequests: 100,
  blockDurationMs: 5 * 60 * 1000,
});

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
      code: 'RATE_LIMITED',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

export { RateLimiter, type RateLimitConfig };
