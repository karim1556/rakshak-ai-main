import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Routes that require authentication (dispatch/responder dashboards)
const PROTECTED_ROUTES = ['/dashboard']

// Routes that are always public
const PUBLIC_ROUTES = ['/', '/login', '/register', '/emergency', '/health-profile', '/citizen']

// API routes that require authentication (dispatch/responder only)
const PROTECTED_API_ROUTES = [
  '/api/qa-report',
  '/api/spam-review',
  '/api/seed-demo-accounts',
  '/api/responders',
  '/api/auto-dispatch',
  '/api/incidents',
  '/api/verify-incident',
]

// API routes that are always open (citizen-facing)
const PUBLIC_API_ROUTES = [
  '/api/analyze',
  '/api/analyze-emergency',
  '/api/emergency-agent',
  '/api/escalation',
  '/api/emergency-contacts',
  '/api/health-profile',
  '/api/speech-to-text',
  '/api/text-to-speech',
  '/api/tts-notification',
  '/api/directions',
  '/api/communication',
  '/api/community-alerts',
  '/api/location-update',
  '/api/livekit-token',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Allow citizen-facing API routes (explicitly listed)
  if (pathname.startsWith('/api/') && PUBLIC_API_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Protect listed API routes
  const isProtectedApi = pathname.startsWith('/api/') && PROTECTED_API_ROUTES.some(r => pathname.startsWith(r))
  
  // Allow unlisted API routes (fallback - don't block unknown routes)
  if (pathname.startsWith('/api/') && !isProtectedApi) {
    return NextResponse.next()
  }

  // Check if route needs protection
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  if (!isProtected && !isProtectedApi) {
    return NextResponse.next()
  }

  // Check for Supabase auth session via cookies
  const accessToken = req.cookies.get('sb-access-token')?.value
    || req.cookies.get(`sb-${getProjectRef()}-auth-token`)?.value

  // Also check the standard Supabase auth cookie pattern
  const supabaseCookies = Array.from(req.cookies.getAll())
    .filter(c => c.name.includes('auth-token') || c.name.includes('sb-'))
    .map(c => c.value)

  const hasAuthCookie = accessToken || supabaseCookies.length > 0

  // For dashboard routes, also allow demo mode via a custom header/cookie
  const isDemoMode = req.cookies.get('rakshak-demo')?.value === 'true'

  if (!hasAuthCookie && !isDemoMode) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // For pages, redirect to login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  // Extract project ref from URL like https://abcdefg.supabase.co
  const match = url.match(/https:\/\/([^.]+)\.supabase/)
  return match?.[1] || ''
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
