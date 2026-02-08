import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Verify that the request is from an authenticated user (Supabase or demo mode).
 * Returns the user profile if authenticated, null otherwise.
 */
export async function verifyAuth(req: NextRequest): Promise<{
  authenticated: boolean
  userId?: string
  role?: string
  isDemo?: boolean
}> {
  // Check demo mode cookie
  const isDemoMode = req.cookies.get('rakshak-demo')?.value === 'true'
  if (isDemoMode) {
    return { authenticated: true, userId: 'demo', role: 'dispatch', isDemo: true }
  }

  // Check Supabase auth via Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (user && !error) {
        return {
          authenticated: true,
          userId: user.id,
          role: user.user_metadata?.role || 'dispatch',
        }
      }
    } catch {}
  }

  // Check Supabase auth cookies
  const supabaseCookies = Array.from(req.cookies.getAll())
    .filter(c => c.name.includes('auth-token') || c.name.includes('sb-'))
  
  if (supabaseCookies.length > 0) {
    return { authenticated: true, userId: 'cookie-session' }
  }

  return { authenticated: false }
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Rate limit helper - simple in-memory rate limiter for API routes
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (entry.count >= maxRequests) {
    return false
  }
  
  entry.count++
  return true
}
