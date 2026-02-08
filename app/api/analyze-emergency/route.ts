import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { guardAnalysis } from '@/lib/spam-guard'
import { NextRequest } from 'next/server'

const analysisSchema = z.object({
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  incidentType: z.string(),
  respondersNeeded: z.array(z.string()),
  recommendedResponse: z.string(),
  estimatedResponseTime: z.string(),
  keyFacts: z.array(z.string()),
})

export async function POST(request: NextRequest) {
  try {
    // ── Spam Guard ──
    const guard = guardAnalysis(request)
    if (!guard.allowed) {
      return guard.response!
    }

    const { emergencyType, description, location } = await request.json()

    const prompt = `You are an expert emergency dispatch AI. Analyze this emergency report and provide critical response information.

Emergency Type: ${emergencyType}
Location: ${location}
Description: ${description}

Analyze this emergency and provide:
1. Severity level (CRITICAL, HIGH, MEDIUM, LOW)
2. Specific incident type
3. List of responders needed (e.g., "Paramedics", "Police Officers", "Fire Department")
4. Recommended immediate response action
5. Estimated response time based on typical emergency response protocols
6. Key facts to communicate to responders

Be precise and focused on actionable information for emergency responders.`

    const result = await generateObject({
      model: openai('gpt-4-turbo'),
      system: `You are an emergency dispatch AI system. Your role is to quickly analyze emergency reports and provide critical information for responders. Be concise, clear, and focus on actionable information.`,
      prompt,
      schema: analysisSchema,
    })

    return Response.json({
      severity: result.object.severity,
      incidentType: result.object.incidentType,
      respondersNeeded: result.object.respondersNeeded,
      recommendedResponse: result.object.recommendedResponse,
      estimatedResponseTime: result.object.estimatedResponseTime,
      keyFacts: result.object.keyFacts,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    
    // Fallback for demo
    return Response.json({
      severity: 'HIGH',
      incidentType: 'Unknown Emergency',
      respondersNeeded: ['Paramedics', 'Police Officers'],
      recommendedResponse: 'Dispatch emergency services immediately',
      estimatedResponseTime: '5-8 minutes',
      keyFacts: ['Emergency reported', 'Requires immediate attention'],
    })
  }
}
