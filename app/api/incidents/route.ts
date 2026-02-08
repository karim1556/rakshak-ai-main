import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    const type = searchParams.get('type')

    let query = supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter && filter !== 'all') {
      // Filter could be status or severity
      const statuses = ['active', 'assigned', 'en_route', 'on_scene', 'resolved']
      const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
      if (statuses.includes(filter)) {
        query = query.eq('status', filter)
      } else if (severities.includes(filter)) {
        query = query.eq('severity', filter)
      }
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('Fetch incidents error:', error)
      return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
    }

    return NextResponse.json({
      incidents: data || [],
      total: data?.length || 0,
    })
  } catch (error) {
    console.error('Fetch incidents error:', error)
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  try {
    const body = await request.json()
    const { type, severity, location, description, summary, reportedBy, citizenId, citizenName, citizenPhone, coordinates } = body

    const newIncident: Record<string, any> = {
      type: type || 'other',
      severity: severity || 'MEDIUM',
      summary: summary || type || 'Emergency',
      description: description || 'Emergency reported',
      status: 'active',
      reported_by: reportedBy || null,
      citizen_identifier: citizenId || null,
      citizen_name: citizenName || null,
      citizen_phone: citizenPhone || null,
    }

    if (coordinates?.lat || location) {
      newIncident.location_lat = coordinates?.lat || null
      newIncident.location_lng = coordinates?.lng || null
      newIncident.location_address = typeof location === 'string' ? location : location?.address || null
    }

    const { data, error } = await supabase
      .from('incidents')
      .insert(newIncident)
      .select()
      .single()

    if (error) {
      console.error('Create incident error:', error)
      return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
    }

    return NextResponse.json({ success: true, incident: data }, { status: 201 })
  } catch (error) {
    console.error('Create incident error:', error)
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Incident ID required' }, { status: 400 })
    }

    const updates: Record<string, any> = {}
    if (body.status) updates.status = body.status
    if (body.severity) updates.severity = body.severity
    if (body.tactical_advice) updates.tactical_advice = body.tactical_advice
    if (body.dispatch_notes) updates.dispatch_notes = body.dispatch_notes

    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update incident error:', error)
      return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 })
    }

    return NextResponse.json({ success: true, incident: data })
  } catch (error) {
    console.error('Update incident error:', error)
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 })
  }
}
