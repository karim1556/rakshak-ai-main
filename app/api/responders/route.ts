// Mock responder database
const responders = [
  {
    id: 'unit-12',
    name: 'Unit 12',
    type: 'medical',
    status: 'en-route',
    location: { lat: 40.7150, lng: -74.0050 },
    currentIncident: '1',
    crew: ['Officer A', 'Officer B'],
  },
  {
    id: 'unit-7',
    name: 'Unit 7',
    type: 'police',
    status: 'en-route',
    location: { lat: 40.7100, lng: -74.0100 },
    currentIncident: '1',
    crew: ['Officer C', 'Officer D'],
  },
  {
    id: 'unit-8',
    name: 'Unit 8',
    type: 'police',
    status: 'on-scene',
    location: { lat: 40.7180, lng: -74.0020 },
    currentIncident: '2',
    crew: ['Officer E', 'Officer F'],
  },
  {
    id: 'unit-15',
    name: 'Unit 15',
    type: 'medical',
    status: 'available',
    location: { lat: 40.7120, lng: -74.0080 },
    currentIncident: null,
    crew: ['Medic A', 'Medic B'],
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const incident = searchParams.get('incident')

    let filtered = responders

    if (type) {
      filtered = filtered.filter((r) => r.type === type)
    }
    if (status) {
      filtered = filtered.filter((r) => r.status === status)
    }
    if (incident) {
      filtered = filtered.filter((r) => r.currentIncident === incident)
    }

    return Response.json({
      responders: filtered,
      total: filtered.length,
    })
  } catch (error) {
    console.error('Fetch responders error:', error)
    return Response.json({ error: 'Failed to fetch responders' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const responderId = searchParams.get('id')
    const body = await request.json()

    const responder = responders.find((r) => r.id === responderId)
    if (!responder) {
      return Response.json({ error: 'Responder not found' }, { status: 404 })
    }

    // Update responder
    if (body.status) responder.status = body.status
    if (body.location) responder.location = body.location
    if (body.currentIncident !== undefined) responder.currentIncident = body.currentIncident

    return Response.json({
      success: true,
      responder,
    })
  } catch (error) {
    console.error('Update responder error:', error)
    return Response.json({ error: 'Failed to update responder' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { incidentId, responderType, count } = body

    // Find available responders
    const available = responders.filter(
      (r) => r.type === responderType && r.status === 'available'
    )

    if (available.length === 0) {
      return Response.json(
        { error: 'No available responders of this type' },
        { status: 400 }
      )
    }

    const assigned = available.slice(0, count)
    assigned.forEach((responder) => {
      responder.status = 'en-route'
      responder.currentIncident = incidentId
    })

    return Response.json({
      success: true,
      assigned: assigned.map((r) => ({ id: r.id, name: r.name })),
    })
  } catch (error) {
    console.error('Assign responders error:', error)
    return Response.json({ error: 'Failed to assign responders' }, { status: 500 })
  }
}
