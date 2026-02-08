import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const analysisSchema = z.object({
  incidentType: z.enum(['medical', 'fire', 'safety', 'accident', 'other']),
  summary: z.string(),
  victims: z.number(),
  risks: z.array(z.string()),
  steps: z.array(z.string()),
  tacticalAdvice: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
})

export async function POST(request: Request) {
  try {
    const { text, scenario } = await request.json()

    if (!text) {
      return Response.json({ error: 'No description provided' }, { status: 400 })
    }

    const prompt = `Analyze this emergency situation and provide guidance.

User's Description: "${text}"
${scenario ? `Emergency Type Hint: ${scenario}` : ''}

Provide:
1. Incident type classification (medical, fire, safety, accident, or other)
2. Brief summary (1 sentence)
3. Estimated number of victims
4. List of risks/hazards (2-4 items)
5. Step-by-step instructions for the citizen (5-8 clear, actionable steps)
6. Tactical advice for responders (1-2 sentences)
7. Severity level (CRITICAL, HIGH, MEDIUM, LOW)

Keep steps simple, clear, and safety-focused. Each step should be one short sentence that can be read aloud.`

    const result = await generateObject({
      model: openai('gpt-4-turbo'),
      system: `You are an emergency response AI assistant. You help citizens during emergencies by providing calm, clear, step-by-step instructions.

Your tone must be:
- Calm and reassuring
- Direct and concise
- Safety-first focused
- Professional but compassionate

Never give medical diagnoses. Always prioritize calling emergency services for serious situations.`,
      prompt,
      schema: analysisSchema,
    })

    return Response.json({
      incidentType: result.object.incidentType,
      summary: result.object.summary,
      victims: result.object.victims,
      risks: result.object.risks,
      steps: result.object.steps,
      tacticalAdvice: result.object.tacticalAdvice,
      severity: result.object.severity,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    
    // Fallback response for demo/testing
    return Response.json({
      incidentType: 'medical',
      summary: 'Medical emergency requiring immediate attention',
      victims: 1,
      risks: ['Potential cardiac event', 'Risk of unconsciousness', 'Airway obstruction possible'],
      steps: [
        'Stay calm and assess the situation',
        'Check if the person is responsive - tap their shoulder and ask loudly "Are you okay?"',
        'Call 112 or have someone else call immediately',
        'Check if the person is breathing normally',
        'If not breathing, begin chest compressions - push hard and fast in the center of the chest',
        'Continue until help arrives or the person recovers',
        'Keep the area clear for emergency responders'
      ],
      tacticalAdvice: 'Potential cardiac arrest. Prepare AED if available. CPR may be in progress.',
      severity: 'CRITICAL',
    })
  }
}
