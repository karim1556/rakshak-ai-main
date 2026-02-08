import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST: Update live location for an emergency session
export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const { sessionId, lat, lng, address } = await req.json()

    if (!sessionId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'sessionId, lat, lng required' }, { status: 400 })
    }

    // Update escalated_sessions table
    const { error: escError } = await supabase
      .from('escalated_sessions')
      .update({
        location_lat: lat,
        location_lng: lng,
        location_address: address || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (escError) {
      console.error('Escalated session location update error:', escError)
    }

    // Also update the linked incident
    const { error: incError } = await supabase
      .from('incidents')
      .update({
        location_lat: lat,
        location_lng: lng,
        location_address: address || null,
      })
      .eq('reported_by', sessionId)

    if (incError) {
      console.error('Incident location update error:', incError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Location update error:', error)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}
