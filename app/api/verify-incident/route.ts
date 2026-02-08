import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getClientIP } from '@/lib/rate-limiter'
import { generalLimiter, rateLimitResponse } from '@/lib/rate-limiter'

/**
 * GET /api/verify-incident — Get verification status for an incident
 */
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const incidentId = searchParams.get('incidentId')

  if (!incidentId) {
    return NextResponse.json({ error: 'incidentId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('incident_verifications')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch verifications error:', error)
    return NextResponse.json({ verifications: [], summary: null })
  }

  const verifications = data || []
  const confirms = verifications.filter(v => v.verification_type === 'confirm').length
  const denies = verifications.filter(v => v.verification_type === 'deny').length
  const additionalInfo = verifications.filter(v => v.verification_type === 'additional_info')

  const summary = {
    totalVerifications: verifications.length,
    confirms,
    denies,
    additionalInfoCount: additionalInfo.length,
    confidenceScore: verifications.length > 0 
      ? Math.round((confirms / verifications.length) * 100) 
      : null,
    communityVerdict: confirms > denies 
      ? 'likely_genuine' 
      : denies > confirms 
        ? 'likely_false' 
        : 'inconclusive',
  }

  return NextResponse.json({ verifications, summary })
}

/**
 * POST /api/verify-incident — Submit a verification from a nearby citizen
 */
export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const supabase = createServerClient()

  // Rate limit: max 5 verifications per 10 minutes per IP
  const rateCheck = generalLimiter.check(`verify:${ip}`)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfter)
  }

  try {
    const { incidentId, verificationType, details, lat, lng } = await req.json()

    if (!incidentId || !verificationType) {
      return NextResponse.json({ error: 'incidentId and verificationType required' }, { status: 400 })
    }

    if (!['confirm', 'deny', 'additional_info'].includes(verificationType)) {
      return NextResponse.json({ error: 'Invalid verificationType' }, { status: 400 })
    }

    // Check if this IP already verified this incident
    const { data: existing } = await supabase
      .from('incident_verifications')
      .select('id')
      .eq('incident_id', incidentId)
      .eq('verifier_ip', ip)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'You have already submitted a verification for this incident',
        code: 'ALREADY_VERIFIED' 
      }, { status: 409 })
    }

    const { data, error } = await supabase.from('incident_verifications').insert({
      incident_id: incidentId,
      verifier_ip: ip,
      verification_type: verificationType,
      details: details || null,
      location_lat: lat || null,
      location_lng: lng || null,
    }).select().single()

    if (error) throw error

    // If we now have enough denials, flag the incident
    const { data: allVerifications } = await supabase
      .from('incident_verifications')
      .select('verification_type')
      .eq('incident_id', incidentId)

    const denials = allVerifications?.filter(v => v.verification_type === 'deny').length || 0
    const confirmations = allVerifications?.filter(v => v.verification_type === 'confirm').length || 0

    // If 3+ denials and no confirmations → flag as potentially false
    if (denials >= 3 && confirmations === 0) {
      await supabase
        .from('incidents')
        .update({ dispatch_notes: `⚠️ COMMUNITY FLAGGED: ${denials} nearby citizens report this incident may be false.` })
        .eq('id', incidentId)
    }

    // If 3+ confirmations → boost confidence
    if (confirmations >= 3) {
      await supabase
        .from('incidents')
        .update({ dispatch_notes: `✅ COMMUNITY VERIFIED: ${confirmations} nearby citizens confirm this incident.` })
        .eq('id', incidentId)
    }

    return NextResponse.json({ 
      success: true, 
      verification: data,
      currentStats: {
        confirmations,
        denials,
        total: (allVerifications?.length || 0),
      }
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 })
  }
}
