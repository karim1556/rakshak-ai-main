import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { guardAgentConversation } from '@/lib/spam-guard'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AIResponse {
  response: string
  sessionInfo?: {
    type?: 'medical' | 'fire' | 'safety' | 'accident' | 'other'
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    summary?: string
    risks?: string[]
    tacticalAdvice?: string
    victims?: number
  }
  steps?: Array<{
    text: string
    imageUrl?: string
  }>
  shouldEscalate: boolean
  needsMoreInfo: boolean
  visionAnalysis?: string
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message, conversationHistory = [], currentSteps = [], imageBase64, language = 'en' } = await req.json()

    if (!message && !imageBase64) {
      return NextResponse.json({ error: 'Message or image is required' }, { status: 400 })
    }

    // ── Spam Guard ──
    const guard = guardAgentConversation(req, sessionId || 'unknown', message || '')
    if (!guard.allowed) {
      return guard.response!
    }

    // Build conversation context
    const conversationContext = conversationHistory
      .filter((m: any) => m.role === 'user' || m.role === 'ai')
      .map((m: any) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n')

    const existingSteps = currentSteps
      .map((s: any, i: number) => `${i + 1}. ${s.text} ${s.completed ? '(DONE)' : ''}`)
      .join('\n')

    const LANGUAGE_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu',
      kn: 'Kannada', ml: 'Malayalam', gu: 'Gujarati', bn: 'Bengali',
      pa: 'Punjabi', ur: 'Urdu', es: 'Spanish', fr: 'French', de: 'German',
      ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic',
      pt: 'Portuguese', ru: 'Russian', multi: 'Auto-detect',
    }

    const langName = LANGUAGE_NAMES[language] || 'English'
    const isNonEnglish = language !== 'en' && language !== 'multi'

    const systemPrompt = `You are Rakshak, an AI emergency assistant having a voice conversation. Be a calm, knowledgeable friend who guides people through tough situations.

${isNonEnglish ? `CRITICAL LANGUAGE INSTRUCTION:
You MUST respond entirely in ${langName}. The user is speaking ${langName}. 
- Your "response" field must be in ${langName}
- Your "steps" text must be in ${langName}
- Your "summary" can remain in English for dispatch systems
- Use natural, colloquial ${langName} — not formal/textbook language
- If the user code-switches (mixes English), respond in ${langName} with occasional English terms they used
` : language === 'multi' ? `LANGUAGE INSTRUCTION:
Detect the language the user is speaking and respond in that SAME language.
If the user speaks Hindi, respond in Hindi. If Marathi, respond in Marathi. And so on.
Your "response" and "steps" should match the user's language.
` : ''}

${imageBase64 ? `IMPORTANT - VIDEO/IMAGE ANALYSIS:
You have been given a live camera image from the scene. Analyze it carefully to:
- Assess the situation visually (injuries, fire, danger, etc.)
- Provide specific guidance based on what you SEE
- Reference visual details: "I can see...", "It looks like...", "From the image..."
- Combine visual analysis with what the user tells you
` : ''}

CONVERSATION STYLE:
- Keep responses SHORT (2-3 sentences max)
- Be warm and natural - use contractions
- End with a question to keep dialogue going
- Show empathy: "That's scary", "I hear you", "You're doing great"
${imageBase64 ? '- Reference what you see in the image when relevant' : ''}

CRITICAL RULE - ALWAYS GIVE A STEP:
When you give ANY advice or instruction, you MUST add it to the steps array. Every actionable suggestion = a step.

EXAMPLES:
User: "I'm being chased by a car"
Response: "That's really scary. First, try to get somewhere safe - a store, restaurant, anywhere with people. Are you near any buildings?"
Steps: [{"text": "Get to a safe public place with other people"}]

User: "Someone collapsed"  
Response: "I'm here with you. Can you check if they're breathing - is their chest moving?"
Steps: [{"text": "Check if the person is breathing"}]

User: "There's a fire in my kitchen"
Response: "Okay, first get everyone out of the house right now. Is everyone able to get out safely?"
Steps: [{"text": "Evacuate everyone from the house immediately"}]

${imageBase64 ? `WITH IMAGE EXAMPLES:
If you see someone unconscious: "I can see the person on the ground. They appear unconscious. Let's check if they're breathing - can you look at their chest?"

If you see a fire: "I can see flames in the image. Get everyone out immediately and move away from the building. Are you at a safe distance?"

If you see an injury: "I can see what looks like a wound on their arm. We need to stop the bleeding - do you have any clean cloth nearby?"
` : ''}

STEP RULES:
- ALWAYS include a step when giving advice (this is mandatory!)
- One step at a time, don't overwhelm
- Make steps clear and actionable
- Check existing steps to avoid duplicates

ESCALATION - shouldEscalate = false ALWAYS unless:
- User says "call 911", "call police", "connect me to help", "I need emergency services"
- User EXPLICITLY requests professional help

DO NOT ESCALATE for:
- Being chased (guide them to safety first)
- Someone collapsed (guide CPR/first aid)
- Fire (guide evacuation)
- Any emergency where you can still help guide them

shouldEscalate is ONLY for when the user explicitly wants to connect to dispatch. Default is ALWAYS false.

JSON RESPONSE FORMAT:
{
  "response": "Short empathetic response with guidance, ending with question",
  "sessionInfo": {
    "type": "medical|fire|safety|accident|other",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "summary": "2-3 words",
    "risks": ["list of identified risks/dangers"],
    "tacticalAdvice": "Key safety/tactical advice for responders",
    "victims": 1
  },
  "steps": [{"text": "Clear actionable step based on your advice"}],
  "shouldEscalate": false,
  "needsMoreInfo": true${imageBase64 ? ',\n  "visionAnalysis": "Brief description of what you observed in the image"' : ''}
}`

    const userMessageText = `Session: ${sessionId}
${conversationContext ? `\nConversation:\n${conversationContext}` : ''}
${existingSteps ? `\nExisting steps:\n${existingSteps}` : ''}

User says: "${message || 'Please analyze the image I\'m sharing'}"
${imageBase64 ? '\n[User has shared a live camera image - analyze it and incorporate your observations]' : ''}

Respond with valid JSON only.`

    // Build message content - with or without image
    let messageContent: any = userMessageText
    
    if (imageBase64) {
      messageContent = [
        { type: 'text', text: userMessageText },
        { 
          type: 'image_url', 
          image_url: { 
            url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
            detail: 'high'
          } 
        }
      ]
    }

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messageContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    const parsed: AIResponse = JSON.parse(content)
    
    return NextResponse.json({
      response: parsed.response || "I'm here to help. Can you tell me more about what's happening?",
      sessionInfo: parsed.sessionInfo,
      steps: parsed.steps || [],
      shouldEscalate: parsed.shouldEscalate || false,
      needsMoreInfo: parsed.needsMoreInfo !== false,
    })

  } catch (error) {
    console.error('Emergency agent error:', error)
    return NextResponse.json(
      { 
        response: "I'm having some technical difficulties, but your safety is my priority. If this is a life-threatening emergency, please call 112 immediately.",
        shouldEscalate: false,
        needsMoreInfo: true,
        steps: []
      },
      { status: 200 }
    )
  }
}
