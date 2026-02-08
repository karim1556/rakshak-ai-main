import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/emergency-contacts — Get contacts for a citizen
 */
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const citizenId = searchParams.get('citizenId')

  if (!citizenId) {
    return NextResponse.json({ error: 'citizenId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('citizen_identifier', citizenId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch contacts error:', error)
    return NextResponse.json({ contacts: [] })
  }

  return NextResponse.json({ contacts: data || [] })
}

/**
 * POST /api/emergency-contacts — Add/update emergency contacts
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const { citizenId, contacts } = await req.json()

    if (!citizenId || !contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: 'citizenId and contacts array required' }, { status: 400 })
    }

    // Upsert contacts (max 5 per citizen)
    const validContacts = contacts.slice(0, 5).map((c: any) => ({
      citizen_identifier: citizenId,
      contact_name: c.name,
      contact_phone: c.phone,
      contact_email: c.email || null,
      relationship: c.relationship || 'other',
      auto_notify: c.autoNotify !== false,
    }))

    const { data, error } = await supabase
      .from('emergency_contacts')
      .upsert(validContacts, { onConflict: 'id' })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, contacts: data })
  } catch (error) {
    console.error('Save contacts error:', error)
    return NextResponse.json({ error: 'Failed to save contacts' }, { status: 500 })
  }
}

/**
 * PUT /api/emergency-contacts — Notify emergency contacts about an incident
 * In production: integrate with Twilio SMS, email service, push notifications
 */
export async function PUT(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const { citizenId, sessionId, emergencyType, summary, location } = await req.json()

    if (!citizenId) {
      return NextResponse.json({ error: 'citizenId required' }, { status: 400 })
    }

    // Fetch auto-notify contacts
    const { data: contacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('citizen_identifier', citizenId)
      .eq('auto_notify', true)

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ success: true, notified: 0, message: 'No contacts to notify' })
    }

    // In production, this would send actual SMS/email/push notifications
    // For now, we log the notification intent
    const notifications = contacts.map(contact => ({
      contactName: contact.contact_name,
      contactPhone: contact.contact_phone,
      contactEmail: contact.contact_email,
      message: `EMERGENCY ALERT: ${contact.contact_name}, your contact has reported a ${emergencyType || 'emergency'}. ${summary || 'Emergency services have been notified.'} ${location ? `Location: ${location}` : ''}. Session ID: ${sessionId}`,
      status: 'queued', // would be 'sent' after actual delivery
    }))

    console.log(`[EMERGENCY CONTACTS] Notifying ${notifications.length} contacts for citizen ${citizenId}:`)
    notifications.forEach(n => console.log(`  → ${n.contactName} (${n.contactPhone}): ${n.message}`))

    return NextResponse.json({
      success: true,
      notified: notifications.length,
      notifications,
      message: `${notifications.length} emergency contact(s) would be notified (SMS/email integration pending)`,
    })
  } catch (error) {
    console.error('Notify contacts error:', error)
    return NextResponse.json({ error: 'Failed to notify contacts' }, { status: 500 })
  }
}

/**
 * DELETE /api/emergency-contacts — Remove a contact
 */
export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')

  if (!contactId) {
    return NextResponse.json({ error: 'contactId required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', contactId)

  if (error) {
    console.error('Delete contact error:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
