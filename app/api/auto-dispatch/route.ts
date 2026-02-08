import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Calculate distance between two coordinates (Haversine formula) in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Map emergency type to responder role
function getRequiredRoles(type: string): ('medical' | 'police' | 'fire' | 'rescue')[] {
  switch (type) {
    case 'medical': return ['medical', 'rescue']
    case 'fire': return ['fire', 'rescue']
    case 'safety': return ['police']
    case 'accident': return ['medical', 'police']
    default: return ['medical', 'police']
  }
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const { sessionId, type, severity, lat, lng, dispatchNotes } = await req.json()

    if (!sessionId || !lat || !lng) {
      return NextResponse.json({ error: 'sessionId, lat, lng required' }, { status: 400 })
    }

    const roles = getRequiredRoles(type || 'other')

    // Get available responders matching the needed roles
    const { data: responders } = await supabase
      .from('responders')
      .select('*')
      .in('role', roles)
      .eq('status', 'available')

    if (!responders || responders.length === 0) {
      return NextResponse.json({ error: 'No responders available', dispatched: [] })
    }

    // Sort by distance from incident. If a responder has no location, assign a large distance
    const sorted = responders
      .map(r => {
        const hasLocation = r.location_lat != null && r.location_lng != null
        const dist = hasLocation
          ? haversine(lat, lng, Number(r.location_lat), Number(r.location_lng))
          : 9999
        return {
          ...r,
          distance: dist,
          eta: Math.max(2, Math.round((dist < 9999 ? dist : 5) / 40 * 60)) // ~40km/h avg speed
        }
      })
      .sort((a, b) => a.distance - b.distance)

    // Pick the nearest responder per role
    const dispatched: any[] = []
    const usedRoles = new Set<string>()

    for (const r of sorted) {
      if (!usedRoles.has(r.role) && dispatched.length < 2) {
        usedRoles.add(r.role)

        // Place responder near the incident (realistic nearby position, 0.5-1.5 km away)
        const offsetLat = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
        const offsetLng = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
        const responderLat = Number(lat) + offsetLat
        const responderLng = Number(lng) + offsetLng
        const actualDistance = haversine(lat, lng, responderLat, responderLng)
        const actualEta = Math.max(1, Math.round((actualDistance / 40) * 60))

        // Mark responder as busy and update their location to be near the incident
        await supabase
          .from('responders')
          .update({
            status: 'busy' as const,
            location_lat: responderLat,
            location_lng: responderLng,
          })
          .eq('id', r.id)

        dispatched.push({
          id: r.id,
          name: r.name,
          role: r.role,
          unit: r.unit_id,
          distance: Math.round(actualDistance * 10) / 10,
          eta: Math.max(actualEta, 2),
        })
      }
    }

    // Update the escalated session with the first dispatched responder
    if (dispatched.length > 0) {
      await supabase
        .from('escalated_sessions')
        .update({
          status: 'assigned' as const,
          assigned_responder: {
            id: dispatched[0].id,
            name: dispatched[0].name,
            role: dispatched[0].role,
            unit: dispatched[0].unit,
          },
        })
        .eq('id', sessionId)

      // Also update the incidents table so department dashboards see assignment + dispatch notes
      const incidentUpdate: Record<string, any> = { status: 'assigned' }
      if (dispatchNotes) {
        incidentUpdate.tactical_advice = dispatchNotes
      }
      await supabase
        .from('incidents')
        .update(incidentUpdate as any)
        .eq('reported_by', sessionId)

      // Create incident_assignments records
      const { data: incident } = await supabase
        .from('incidents')
        .select('id')
        .eq('reported_by', sessionId)
        .single()

      if (incident) {
        for (const d of dispatched) {
          await supabase.from('incident_assignments').upsert({
            incident_id: incident.id,
            responder_id: d.id,
            status: 'assigned' as const,
          }, { onConflict: 'incident_id,responder_id' })

          // Link responder to the incident
          await supabase
            .from('responders')
            .update({ current_incident_id: incident.id })
            .eq('id', d.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      dispatched,
      message: `${dispatched.length} responder(s) dispatched`,
    })
  } catch (error) {
    console.error('Auto-dispatch error:', error)
    return NextResponse.json({ error: 'Auto-dispatch failed' }, { status: 500 })
  }
}
