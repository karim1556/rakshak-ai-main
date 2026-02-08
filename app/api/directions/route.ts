import { NextRequest, NextResponse } from 'next/server'

// Use Google Maps Directions API or fallback to OSRM (free)
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY

interface DirectionStep {
  instruction: string
  distance: string
  duration: string
  maneuver?: string
  startLocation: { lat: number; lng: number }
  endLocation: { lat: number; lng: number }
}

interface DirectionsResult {
  distance: string
  duration: string
  steps: DirectionStep[]
  polyline: string // encoded polyline
  bounds: {
    northeast: { lat: number; lng: number }
    southwest: { lat: number; lng: number }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { origin, destination, mode = 'driving' } = await req.json()

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json({ error: 'Origin and destination coordinates required' }, { status: 400 })
    }

    // Try Google Maps first, fallback to OSRM
    if (GOOGLE_MAPS_KEY) {
      return await getGoogleDirections(origin, destination, mode)
    } else {
      return await getOSRMDirections(origin, destination, mode)
    }
  } catch (error) {
    console.error('Directions error:', error)
    return NextResponse.json({ error: 'Failed to get directions' }, { status: 500 })
  }
}

async function getGoogleDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: string
) {
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`)
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`)
  url.searchParams.set('mode', mode)
  url.searchParams.set('key', GOOGLE_MAPS_KEY!)
  url.searchParams.set('alternatives', 'false')
  url.searchParams.set('units', 'metric')

  const response = await fetch(url.toString())
  const data = await response.json()

  if (data.status !== 'OK' || !data.routes?.length) {
    return NextResponse.json({ error: 'No route found', status: data.status }, { status: 404 })
  }

  const route = data.routes[0]
  const leg = route.legs[0]

  const steps: DirectionStep[] = leg.steps.map((step: any) => ({
    instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || step.maneuver || 'Continue',
    distance: step.distance.text,
    duration: step.duration.text,
    maneuver: step.maneuver,
    startLocation: step.start_location,
    endLocation: step.end_location,
  }))

  const result: DirectionsResult = {
    distance: leg.distance.text,
    duration: leg.duration.text,
    steps,
    polyline: route.overview_polyline.points,
    bounds: route.bounds,
  }

  return NextResponse.json(result)
}

async function getOSRMDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: string
) {
  // OSRM (Open Source Routing Machine) — free, no API key required
  const profile = mode === 'driving' ? 'car' : mode === 'walking' ? 'foot' : 'car'
  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`

  const response = await fetch(url)
  const data = await response.json()

  if (data.code !== 'Ok' || !data.routes?.length) {
    return NextResponse.json({ error: 'No route found' }, { status: 404 })
  }

  const route = data.routes[0]
  const leg = route.legs[0]

  const steps: DirectionStep[] = leg.steps.map((step: any) => ({
    instruction: formatOSRMInstruction(step),
    distance: formatDistance(step.distance),
    duration: formatDuration(step.duration),
    maneuver: step.maneuver?.type,
    startLocation: { 
      lat: step.maneuver.location[1], 
      lng: step.maneuver.location[0] 
    },
    endLocation: {
      lat: step.maneuver.location[1],
      lng: step.maneuver.location[0],
    },
  }))

  // Convert GeoJSON coords to bounds
  const coords = route.geometry.coordinates
  const lats = coords.map((c: number[]) => c[1])
  const lngs = coords.map((c: number[]) => c[0])

  const result: DirectionsResult = {
    distance: formatDistance(route.distance),
    duration: formatDuration(route.duration),
    steps,
    polyline: JSON.stringify(route.geometry), // GeoJSON for OSRM
    bounds: {
      northeast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
      southwest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    },
  }

  return NextResponse.json(result)
}

function formatOSRMInstruction(step: any): string {
  const type = step.maneuver?.type || ''
  const modifier = step.maneuver?.modifier || ''
  const streetName = step.name || 'the road'

  switch (type) {
    case 'depart': return `Head ${modifier || 'forward'} on ${streetName}`
    case 'arrive': return `Arrive at your destination`
    case 'turn': return `Turn ${modifier} onto ${streetName}`
    case 'merge': return `Merge ${modifier} onto ${streetName}`
    case 'fork': return `Take the ${modifier} fork onto ${streetName}`
    case 'roundabout': return `Enter roundabout, take exit onto ${streetName}`
    case 'continue': return `Continue on ${streetName}`
    case 'end of road': return `At the end of the road, turn ${modifier}`
    case 'new name': return `Continue onto ${streetName}`
    default: return `Continue on ${streetName}`
  }
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 1) return 'Less than 1 min'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hours} hr ${remainMins} min`
}
