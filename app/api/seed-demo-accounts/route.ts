import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Need admin key

export async function POST() {
  try {
    // Use service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const demoAccounts = [
      {
        email: 'dispatch@rakshak.ai',
        password: 'Dispatch@2025',
        role: 'dispatch',
        full_name: 'Dispatch Coordinator'
      },
      {
        email: 'police@rakshak.ai',
        password: 'Police@2025',
        role: 'police',
        full_name: 'Police Officer'
      },
      {
        email: 'medical@rakshak.ai',
        password: 'Medical@2025',
        role: 'medical',
        full_name: 'Medical Responder'
      },
      {
        email: 'fire@rakshak.ai',
        password: 'Fire@2025',
        role: 'fire',
        full_name: 'Fire Responder'
      }
    ]

    const results = []
    for (const account of demoAccounts) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          role: account.role,
          full_name: account.full_name
        }
      })

      if (error) {
        // Check if user already exists
        if (error.message?.includes('already') || error.status === 422) {
          // Try to find existing user and ensure profile exists
          const { data: users } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = users?.users?.find(u => u.email === account.email)
          if (existingUser) {
            await supabaseAdmin.from('profiles').upsert({
              id: existingUser.id,
              email: account.email,
              role: account.role,
              full_name: account.full_name,
            }, { onConflict: 'id' })
          }
          results.push({ email: account.email, status: 'already_exists', id: existingUser?.id })
        } else {
          results.push({ email: account.email, status: 'error', error: error.message })
        }
      } else {
        // Manually insert profile (in case DB trigger doesn't exist)
        if (data.user) {
          await supabaseAdmin.from('profiles').upsert({
            id: data.user.id,
            email: account.email,
            role: account.role,
            full_name: account.full_name,
          }, { onConflict: 'id' })
        }
        results.push({ email: account.email, status: 'created', id: data.user?.id })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Demo accounts seeded',
      results 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
