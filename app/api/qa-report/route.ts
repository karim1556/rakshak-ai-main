import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: session } = await supabase
      .from('escalated_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const messages = (session.messages as any[]) || []
    const steps = (session.steps as any[]) || []

    const transcript = messages
      .filter((m: any) => m.role === 'user' || m.role === 'ai')
      .map((m: any) => `${m.role === 'user' ? 'Caller' : 'AI'}: ${m.content}`)
      .join('\n')

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a QA analyst reviewing an emergency AI call session. Generate a structured post-call report. Return JSON:
{
  "callDuration": "estimated duration string",
  "emergencyType": "type",
  "severityAssessment": "CRITICAL|HIGH|MEDIUM|LOW",
  "responseQuality": "Excellent|Good|Adequate|Poor",
  "responseScore": 0-100,
  "aiPerformance": {
    "empathy": 0-10,
    "accuracy": 0-10,
    "responseTime": 0-10,
    "guidanceQuality": 0-10
  },
  "timeline": ["key event 1", "key event 2"],
  "stepsProvided": number,
  "stepsCompleted": number,
  "escalationTriggered": boolean,
  "keyActions": ["action taken 1"],
  "areasForImprovement": ["improvement 1"],
  "summary": "2-3 sentence summary of the call",
  "recommendations": ["recommendation 1"]
}`
        },
        {
          role: 'user',
          content: `Session ID: ${sessionId}
Type: ${session.type}
Severity: ${session.severity}
Status: ${session.status}
Steps: ${steps.length} total, ${steps.filter((s: any) => s.completed).length} completed

Transcript:
${transcript || 'No transcript available'}

Generate a QA report.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const report = JSON.parse(completion.choices[0]?.message?.content || '{}')

    // Save report to session
    await supabase
      .from('escalated_sessions')
      .update({ qa_report: report, status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({ report })
  } catch (error) {
    console.error('QA report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
