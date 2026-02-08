// Deepgram-supported languages for Nova-2
const SUPPORTED_LANGUAGES: Record<string, { code: string; name: string; model?: string }> = {
  en: { code: 'en', name: 'English' },
  hi: { code: 'hi', name: 'Hindi' },
  mr: { code: 'mr', name: 'Marathi' },
  ta: { code: 'ta', name: 'Tamil' },
  te: { code: 'te', name: 'Telugu' },
  kn: { code: 'kn', name: 'Kannada' },
  ml: { code: 'ml', name: 'Malayalam' },
  gu: { code: 'gu', name: 'Gujarati' },
  bn: { code: 'bn', name: 'Bengali' },
  pa: { code: 'pa', name: 'Punjabi' },
  ur: { code: 'ur', name: 'Urdu' },
  es: { code: 'es', name: 'Spanish' },
  fr: { code: 'fr', name: 'French' },
  de: { code: 'de', name: 'German' },
  ja: { code: 'ja', name: 'Japanese' },
  ko: { code: 'ko', name: 'Korean' },
  zh: { code: 'zh', name: 'Chinese' },
  ar: { code: 'ar', name: 'Arabic' },
  pt: { code: 'pt', name: 'Portuguese' },
  ru: { code: 'ru', name: 'Russian' },
  multi: { code: 'multi', name: 'Auto-detect', model: 'nova-2' },
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = (formData.get('language') as string) || 'en'

    if (!audioFile) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Check file size
    if (audioFile.size < 1000) {
      return Response.json({ 
        text: '',
        error: 'Recording too short' 
      }, { status: 400 })
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Resolve language config
    const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES['en']
    const model = langConfig.model || 'nova-2'

    // Build Deepgram URL with language parameter
    // For 'multi' mode, use detect_language=true for auto-detection
    let deepgramUrl = `https://api.deepgram.com/v1/listen?model=${model}&smart_format=true`
    if (language === 'multi') {
      deepgramUrl += '&detect_language=true'
    } else {
      deepgramUrl += `&language=${langConfig.code}`
    }

    // Use Deepgram for transcription
    const response = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': audioFile.type || 'audio/webm',
      },
      body: buffer,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Deepgram error:', error)
      throw new Error('Transcription failed')
    }

    const data = await response.json()
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
    const detectedLanguage = data.results?.channels?.[0]?.detected_language || language

    return Response.json({
      text: transcript,
      confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
      detectedLanguage,
      requestedLanguage: language,
    })
  } catch (error: any) {
    console.error('Speech-to-text error:', error)
    return Response.json({ 
      text: '',
      error: 'Failed to transcribe audio' 
    }, { status: 500 })
  }
}

// GET endpoint to return supported languages
export async function GET() {
  return Response.json({
    languages: Object.entries(SUPPORTED_LANGUAGES).map(([key, val]) => ({
      code: key,
      name: val.name,
    })),
  })
}
