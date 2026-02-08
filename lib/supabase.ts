import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Server client (API routes)
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Realtime subscription helper
export function subscribeToTable(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) {
  const channel = supabase
    .channel(`${table}-changes-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      callback
    )
    .subscribe()
  return channel
}
