import { generateText } from 'ai'

export async function POST(request: Request) {
  try {
    const { incidentType, severity, location, responderType } = await request.json()

    // Generate natural language notification
    const notificationPrompt = `Create a brief, urgent voice notification for a ${responderType} responder about a ${severity} severity ${incidentType} at ${location}. 
    
    The message should be:
    - Concise (under 30 seconds to read)
    - Clear and professional
    - Include the incident type and location
    - Format as if it's being spoken directly to the responder
    
    Start with attention getter like "Attention all units" or similar.`

    const result = await generateText({
      model: 'openai/gpt-4-turbo',
      system: `You are an emergency dispatch notification system that creates concise, professional voice notifications for emergency responders. Your messages should be clear, authoritative, and action-oriented.`,
      prompt: notificationPrompt,
    })

    return Response.json({
      notification: result.text,
      duration: 'estimated 15-25 seconds',
    })
  } catch (error) {
    console.error('Notification generation error:', error)
    return Response.json(
      { error: 'Failed to generate notification' },
      { status: 500 }
    )
  }
}
