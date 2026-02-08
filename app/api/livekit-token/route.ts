import { AccessToken } from 'livekit-server-sdk'

export async function POST(request: Request) {
  try {
    const { roomName, participantName, participantId } = await request.json()

    if (!roomName || !participantName) {
      return Response.json(
        { error: 'Missing required parameters: roomName, participantName' },
        { status: 400 }
      )
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials not configured')
      return Response.json(
        { error: 'Server not configured for voice communication. Please add LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.' },
        { status: 500 }
      )
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantId || participantName,
      metadata: JSON.stringify({
        name: participantName,
        role: 'responder',
      }),
    })
    
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    })

    const token = await at.toJwt()

    return Response.json({
      token,
      url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
    })
  } catch (error) {
    console.error('Token generation error:', error)
    return Response.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
