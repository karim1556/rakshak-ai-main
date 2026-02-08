// Voice configurations per language
// ElevenLabs multilingual_v2 supports all these languages with the same voice ID
const VOICE_CONFIG: Record<string, { voiceId: string; model: string }> = {
  en: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_turbo_v2_5' },
  // For non-English, use multilingual model with same voice (it auto-adapts)
  hi: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  mr: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  ta: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  te: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  kn: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  ml: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  gu: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  bn: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  pa: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  ur: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  es: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  fr: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  de: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  ja: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  ko: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  zh: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  ar: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  pt: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
  ru: { voiceId: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_multilingual_v2' },
}

export async function POST(request: Request) {
  try {
    const { text, language = 'en' } = await request.json()

    if (!text) {
      return Response.json({ error: 'No text provided' }, { status: 400 })
    }

    // Get voice config for language (fallback to English)
    const config = VOICE_CONFIG[language] || VOICE_CONFIG['en']
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: config.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs error:', error)
      throw new Error('TTS failed')
    }

    // Stream the audio back
    const audioBuffer = await response.arrayBuffer()
    
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return Response.json({ error: 'Failed to generate speech' }, { status: 500 })
  }
}
