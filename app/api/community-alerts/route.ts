import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/community-alerts — Get active community alerts near a location
 */
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radiusKm = parseFloat(searchParams.get('radius') || '10')

  try {
    // Fetch active alerts
    const { data, error } = await supabase
      .from('community_alerts')
      .select('*, incidents(type, severity, summary, status)')
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Community alerts fetch error:', error)
      return NextResponse.json({ alerts: [] })
    }

    // Filter by distance if location provided
    let alerts = data || []
    if (lat !== 0 && lng !== 0) {
      alerts = alerts.filter(alert => {
        if (!alert.center_lat || !alert.center_lng) return true // No location = global alert
        const distance = haversineDistance(lat, lng, Number(alert.center_lat), Number(alert.center_lng))
        return distance <= (alert.radius_km || radiusKm)
      })
    }

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Community alerts error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

/**
 * POST /api/community-alerts — Create a new community alert (dispatch only)
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const { incidentId, alertType, title, message, severity, radiusKm, centerLat, centerLng, expiresInHours } = await req.json()

    if (!title || !message || !alertType) {
      return NextResponse.json({ error: 'title, message, and alertType required' }, { status: 400 })
    }

    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
      : null

    const { data, error } = await supabase.from('community_alerts').insert({
      incident_id: incidentId || null,
      alert_type: alertType,
      title,
      message,
      severity: severity || 'MEDIUM',
      radius_km: radiusKm || 2.0,
      center_lat: centerLat || null,
      center_lng: centerLng || null,
      expires_at: expiresAt,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, alert: data })
  } catch (error) {
    console.error('Create community alert error:', error)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}

/**
 * PUT /api/community-alerts — Deactivate an alert
 */
export async function PUT(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const { alertId, active } = await req.json()
    
    const { error } = await supabase
      .from('community_alerts')
      .update({ active: active ?? false })
      .eq('id', alertId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update community alert error:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}

// ── Helpers ──

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
