import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { guardEscalation } from '@/lib/spam-guard'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('escalated_sessions')
    .select('*')
    .order('escalated_at', { ascending: false })

  if (error) {
    console.error('Fetch sessions error:', error)
    return NextResponse.json({ sessions: [] })
  }

  // Transform DB rows to match frontend shape
  const sessions = (data || []).map((row: any) => {
    // Try to get citizen info from columns first, then from messages metadata
    let citizenId = row.citizen_identifier || null
    let citizenName = row.citizen_name || null
    let citizenPhone = row.citizen_phone || null

    // Fallback: check messages array for embedded citizen metadata
    if (!citizenId && Array.isArray(row.messages)) {
      const meta = row.messages.find((m: any) => m.role === '_citizen_meta')
      if (meta) {
        citizenId = meta.citizenId || null
        citizenName = meta.citizenName || null
        citizenPhone = meta.citizenPhone || null
      }
    }

    return {
      id: row.id,
      type: row.type,
      severity: row.severity,
      summary: row.summary,
      status: row.status,
      location: row.location_address ? {
        address: row.location_address,
        lat: row.location_lat ? Number(row.location_lat) : undefined,
        lng: row.location_lng ? Number(row.location_lng) : undefined,
      } : undefined,
      messages: (row.messages || []).filter((m: any) => m.role !== '_citizen_meta'),
      steps: row.steps || [],
      assignedResponder: row.assigned_responder,
      escalatedAt: new Date(row.escalated_at).getTime(),
      language: row.language,
      imageSnapshot: row.image_snapshot,
      qaReport: row.qa_report,
      spamVerdict: row.spam_verdict,
      dispatchNotes: row.dispatch_notes,
      citizenId,
      citizenName,
      citizenPhone,
    }
  })

  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const session = await req.json()
    if (!session.id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // ── Spam Guard ──
    const guard = await guardEscalation(req, session)
    if (!guard.allowed) {
      return guard.response!
    }

    // Attach spam verdict metadata to the session for dispatch review
    const spamMetadata = guard.verdict ? {
      trustScore: guard.verdict.trustScore,
      classification: guard.verdict.classification,
      reasons: guard.verdict.reasons,
      requiresVerification: guard.verdict.requiresVerification,
    } : null

    // Embed citizen info as metadata in messages array so it survives even without citizen columns
    const messagesWithMeta = [...(session.messages || [])]
    if (session.citizenId || session.citizenName || session.citizenPhone) {
      messagesWithMeta.push({
        role: '_citizen_meta',
        citizenId: session.citizenId || null,
        citizenName: session.citizenName || null,
        citizenPhone: session.citizenPhone || null,
      })
    }

    const { error } = await supabase.from('escalated_sessions').upsert({
      id: session.id,
      type: session.type || 'other',
      severity: session.severity || 'MEDIUM',
      summary: session.summary || 'Emergency',
      status: 'escalated',
      location_lat: session.location?.lat || null,
      location_lng: session.location?.lng || null,
      location_address: session.location?.address || null,
      messages: messagesWithMeta,
      steps: session.steps || [],
      priority: session.severity === 'CRITICAL' ? 1 : session.severity === 'HIGH' ? 2 : 3,
      language: session.language || 'en',
      image_snapshot: session.imageSnapshot || null,
      citizen_identifier: session.citizenId || null,
      citizen_name: session.citizenName || null,
      citizen_phone: session.citizenPhone || null,
      spam_verdict: spamMetadata,
      escalated_at: new Date().toISOString(),
    })

    if (error) {
      // If any columns don't exist, retry with absolute minimum fields
      if (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache')) {
        console.warn('Schema mismatch detected, retrying with core fields only...')
        const { error: retryError } = await supabase.from('escalated_sessions').upsert({
          id: session.id,
          type: session.type || 'other',
          severity: session.severity || 'MEDIUM',
          summary: session.summary || 'Emergency',
          status: 'escalated',
          location_lat: session.location?.lat || null,
          location_lng: session.location?.lng || null,
          location_address: session.location?.address || null,
          messages: messagesWithMeta,
          steps: session.steps || [],
          priority: session.severity === 'CRITICAL' ? 1 : session.severity === 'HIGH' ? 2 : 3,
          language: session.language || 'en',
          escalated_at: new Date().toISOString(),
        })
        if (retryError) {
          console.error('Retry insert error:', retryError)
          throw retryError
        }
      } else {
        console.error('Insert error:', error)
        throw error
      }
    }

    // Also create incident in incidents table for department dashboards
    const userMessages = session.messages?.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' ') || 'Emergency reported via AI assistant'
    const stepTexts = (session.steps || []).map((s: any) => typeof s === 'string' ? s : s.text || s.content || '').filter(Boolean)

    const { data: incident, error: incError } = await supabase.from('incidents').insert({
      type: session.type || 'other',
      summary: session.summary || 'Emergency',
      description: userMessages,
      severity: session.severity || 'MEDIUM',
      status: 'active',
      victims: session.victims || 1,
      risks: session.risks || [],
      steps: stepTexts,
      tactical_advice: session.tacticalAdvice || '',
      location_lat: session.location?.lat || null,
      location_lng: session.location?.lng || null,
      location_address: session.location?.address || null,
      reported_by: session.id,
      language: session.language || 'en',
      citizen_identifier: session.citizenId || null,
      citizen_name: session.citizenName || null,
      citizen_phone: session.citizenPhone || null,
    }).select('id').single()

    if (incError) {
      console.error('Incident insert error:', incError)
    }

    // Link the incident ID back to the escalated session for cross-reference
    const incidentId = incident?.id || null
    if (incidentId) {
      await supabase.from('escalated_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.id)
    }

    // Auto-notify emergency contacts if citizen is identified
    if (session.citizenId) {
      try {
        const baseUrl = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await fetch(`${baseUrl}/api/emergency-contacts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            citizenId: session.citizenId,
            sessionId: session.id,
            emergencyType: session.type || 'emergency',
            summary: session.summary || 'Emergency reported',
            location: session.location?.address || `${session.location?.lat}, ${session.location?.lng}`,
          }),
        })
      } catch (notifyErr) {
        console.error('Emergency contact notification error:', notifyErr)
        // Non-blocking — don't fail the escalation if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      incidentId,
      message: 'Session escalated to dispatch',
      spamVerdict: spamMetadata,
    })
  } catch (error) {
    console.error('Escalation error:', error)
    return NextResponse.json({ error: 'Failed to escalate' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const { sessionId, status, assignedResponder, message } = await req.json()

    // Get current session
    const { data: current } = await supabase
      .from('escalated_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (assignedResponder) updates.assigned_responder = assignedResponder

    // Add message
    if (message) {
      const messages = [...(current.messages as any[] || []), {
        id: `msg-${Date.now()}`,
        role: 'dispatch',
        content: message,
        timestamp: Date.now(),
      }]
      updates.messages = messages

      // Also save to communications table for realtime
      await supabase.from('communications').insert({
        session_id: sessionId,
        sender_role: 'dispatch',
        content: message,
      })
    }

    const { error } = await supabase
      .from('escalated_sessions')
      .update(updates)
      .eq('id', sessionId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (sessionId) {
    await supabase.from('escalated_sessions').delete().eq('id', sessionId)
  }

  return NextResponse.json({ success: true })
}
