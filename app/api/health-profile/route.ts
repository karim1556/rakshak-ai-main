import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET — fetch health profile by citizen ID or session ID
export async function GET(req: NextRequest) {
  try {
    const citizenId = req.nextUrl.searchParams.get('citizenId')
    const sessionId = req.nextUrl.searchParams.get('sessionId')

    if (!citizenId && !sessionId) {
      return NextResponse.json({ error: 'citizenId or sessionId required' }, { status: 400 })
    }

    // Try exact match first
    if (citizenId) {
      const { data, error } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('citizen_identifier', citizenId)
        .maybeSingle()

      if (data) {
        return NextResponse.json({ profile: data })
      }

      // If citizenId looks like a session ID (EM-xxx), extract timestamp and search by it
      const tsMatch = citizenId.match(/(\d{13})/)
      if (tsMatch) {
        const { data: fuzzyData } = await supabase
          .from('health_profiles')
          .select('*')
          .like('citizen_identifier', `%${tsMatch[1]}%`)
          .maybeSingle()

        if (fuzzyData) {
          return NextResponse.json({ profile: fuzzyData })
        }
      }

      // Also try matching by phone number or name
      if (citizenId.startsWith('+') || /^\d{10,}$/.test(citizenId)) {
        const { data: phoneData } = await supabase
          .from('health_profiles')
          .select('*')
          .eq('phone_number', citizenId)
          .maybeSingle()

        if (phoneData) {
          return NextResponse.json({ profile: phoneData })
        }
      }
    }

    return NextResponse.json({ profile: null })
  } catch (error) {
    console.error('Health profile error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST — create or update health profile
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      citizenId,
      fullName,
      dateOfBirth,
      bloodType,
      allergies = [],
      medications = [],
      conditions = [],
      emergencyNotes = '',
      organDonor = false,
      height,
      weight,
      primaryPhysician,
      physicianPhone,
      insuranceInfo,
      // Personal registration fields
      phoneNumber,
      email,
      address,
      gender,
      emergencyContactName,
      emergencyContactPhone,
    } = body

    if (!citizenId) {
      return NextResponse.json({ error: 'citizenId is required' }, { status: 400 })
    }

    // Check if profile exists
    const { data: existing } = await supabase
      .from('health_profiles')
      .select('id')
      .eq('citizen_identifier', citizenId)
      .maybeSingle()

    const profileData = {
      citizen_identifier: citizenId,
      full_name: fullName || '',
      date_of_birth: dateOfBirth || null,
      blood_type: bloodType || null,
      allergies,
      medications,
      conditions,
      emergency_notes: emergencyNotes,
      organ_donor: organDonor,
      height_cm: height || null,
      weight_kg: weight || null,
      primary_physician: primaryPhysician || null,
      physician_phone: physicianPhone || null,
      insurance_info: insuranceInfo || null,
      phone_number: phoneNumber || null,
      email: email || null,
      address: address || null,
      gender: gender || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
      updated_at: new Date().toISOString(),
    }

    let result

    if (existing) {
      // Update existing profile
      const { data, error } = await supabase
        .from('health_profiles')
        .update(profileData)
        .eq('citizen_identifier', citizenId)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new profile
      const { data, error } = await supabase
        .from('health_profiles')
        .insert({
          ...profileData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({ success: true, profile: result })
  } catch (error: any) {
    console.error('Health profile save error:', error)
    return NextResponse.json({ error: error.message || 'Failed to save health profile' }, { status: 500 })
  }
}

// DELETE — remove health profile
export async function DELETE(req: NextRequest) {
  try {
    const citizenId = req.nextUrl.searchParams.get('citizenId')
    if (!citizenId) {
      return NextResponse.json({ error: 'citizenId required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('health_profiles')
      .delete()
      .eq('citizen_identifier', citizenId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Health profile delete error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete profile' }, { status: 500 })
  }
}
