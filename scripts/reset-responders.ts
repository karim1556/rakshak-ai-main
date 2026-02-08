import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env or .env.local
try {
  const envFiles = ['.env.local', '.env']
  for (const envFile of envFiles) {
    try {
      const envContent = readFileSync(join(process.cwd(), envFile), 'utf-8')
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
          process.env[match[1].trim()] = match[2].trim()
        }
      })
      break
    } catch {}
  }
} catch (e) {
  console.log('Could not load env files, using existing env vars')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found')
  process.exit(1)
}

async function resetResponders() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🔄 Resetting all busy responders...')
  
  // Get all busy responders with their assigned incidents
  const { data: busyResponders } = await supabase
    .from('responders')
    .select('id, name, current_incident_id, location_lat, location_lng')
    .eq('status', 'busy')
  
  if (!busyResponders || busyResponders.length === 0) {
    console.log('✅ No busy responders to reset')
    return
  }
  
  console.log(`Found ${busyResponders.length} busy responders`)
  
  // For each busy responder, move them near their incident
  for (const resp of busyResponders) {
    if (!resp.current_incident_id) continue
    
    // Get the incident location
    const { data: incident } = await supabase
      .from('incidents')
      .select('location_lat, location_lng, summary')
      .eq('id', resp.current_incident_id)
      .single()
    
    if (incident?.location_lat && incident?.location_lng) {
      // Place responder 0.5-1.5 km from incident
      const offsetLat = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
      const offsetLng = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
      
      const newLat = Number(incident.location_lat) + offsetLat
      const newLng = Number(incident.location_lng) + offsetLng
      
      await supabase
        .from('responders')
        .update({ 
          location_lat: newLat, 
          location_lng: newLng 
        })
        .eq('id', resp.id)
      
      console.log(`✅ Moved ${resp.name} near incident: ${incident.summary}`)
    }
  }
  
  console.log('✅ All busy responders relocated near their incidents')
}

resetResponders().catch(console.error)
