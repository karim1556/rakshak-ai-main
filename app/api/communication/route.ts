import { generateText } from 'ai'

// Mock communication logs
const communicationLogs: any[] = []

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('incidentId')
    const channelType = searchParams.get('type') || 'all'

    let logs = communicationLogs

    if (incidentId) {
      logs = logs.filter((log) => log.incidentId === incidentId)
    }

    if (channelType !== 'all') {
      logs = logs.filter((log) => log.type === channelType)
    }

    return Response.json({
      logs: logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      total: logs.length,
    })
  } catch (error) {
    console.error('Fetch communication logs error:', error)
    return Response.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { incidentId, message, sender, senderType, type } = body

    const newLog = {
      id: `msg-${Date.now()}`,
      incidentId,
      message,
      sender,
      senderType, // 'responder' | 'dispatcher' | 'citizen'
      type, // 'voice' | 'text' | 'notification'
      timestamp: new Date().toISOString(),
      read: false,
    }

    communicationLogs.push(newLog)

    // Generate AI response for important messages
    if (senderType === 'responder' && message.toLowerCase().includes('need')) {
      const response = await generateText({
        model: 'openai/gpt-4-turbo',
        system:
          'You are a dispatcher assistant helping respond to responder requests. Keep responses professional and concise.',
        prompt: `A responder just said: "${message}". Generate a brief supportive dispatcher response.`,
      })

      const dispatcherLog = {
        id: `msg-${Date.now()}-dispatcher`,
        incidentId,
        message: response.text,
        sender: 'Dispatcher AI',
        senderType: 'dispatcher',
        type: 'text',
        timestamp: new Date().toISOString(),
        read: false,
      }

      communicationLogs.push(dispatcherLog)
    }

    return Response.json(
      {
        success: true,
        log: newLog,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Post communication error:', error)
    return Response.json({ error: 'Failed to post message' }, { status: 500 })
  }
}
