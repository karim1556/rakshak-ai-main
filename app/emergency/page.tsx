'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Mic, MicOff, X, Phone, PhoneOff, PhoneCall, Volume2, VolumeX, Loader2, 
  CheckCircle2, Circle, Shield, AlertTriangle, Heart,
  Flame, Car, Users, ChevronRight, Video, VideoOff, Camera,
  MapPin, AlertOctagon, Radio, Globe, ListChecks, PanelRightClose
} from 'lucide-react'
import { useEmergencyStore } from '@/lib/emergency-store'
import { supabase } from '@/lib/supabase'
import { useCall } from '@/lib/use-call'

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking'

const typeIcons: Record<string, any> = {
  medical: Heart,
  fire: Flame,
  accident: Car,
  safety: Shield,
  other: AlertTriangle,
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'multi', name: 'Auto-detect', flag: '🌐' },
]

const LANGUAGE_GREETINGS: Record<string, string> = {
  en: "Hey, I'm Rakshak. Tell me what's happening - I'm here to help you through this.",
  hi: "नमस्ते, मैं रक्षक हूँ। मुझे बताइए क्या हो रहा है — मैं आपकी मदद के लिए यहाँ हूँ।",
  mr: "नमस्कार, मी रक्षक आहे. मला सांगा काय होत आहे — मी तुम्हाला मदत करण्यासाठी इथे आहे.",
  ta: "வணக்கம், நான் ரக்ஷக். என்ன நடக்கிறது என்று சொல்லுங்கள் — நான் உங்களுக்கு உதவ இங்கே இருக்கிறேன்.",
  te: "నమస్కారం, నేను రక్షక్. ఏమి జరుగుతుందో చెప్పండి — నేను మీకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను.",
  kn: "ನಮಸ್ಕಾರ, ನಾನು ರಕ್ಷಕ್. ಏನಾಗುತ್ತಿದೆ ಎಂದು ಹೇಳಿ — ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.",
  bn: "নমস্কার, আমি রক্ষক। কী হচ্ছে বলুন — আমি আপনাকে সাহায্য করতে এখানে আছি।",
  gu: "નમસ્તે, હું રક્ષક છું. શું થઈ રહ્યું છે તે મને કહો — હું તમારી મદદ માટે અહીં છું.",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਰਕਸ਼ਕ ਹਾਂ। ਮੈਨੂੰ ਦੱਸੋ ਕੀ ਹੋ ਰਿਹਾ ਹੈ — ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਇੱਥੇ ਹਾਂ।",
  ml: "നമസ്കാരം, ഞാൻ രക്ഷക് ആണ്. എന്താണ് സംഭവിക്കുന്നതെന്ന് പറയൂ — ഞാൻ നിങ്ങളെ സഹായിക്കാൻ ഇവിടെയുണ്ട്.",
  ur: "نمسکار، میں رکشک ہوں۔ مجھے بتائیں کیا ہو رہا ہے — میں آپ کی مدد کے لیے یہاں ہوں۔",
  multi: "Hey, I'm Rakshak. Tell me what's happening - I'm here to help you through this.",
}

export default function EmergencyPage() {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartRef = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  
  const {
    session,
    isEscalated,
    startSession,
    endSession,
    addMessage,
    addStep,
    completeStep,
    updateSessionInfo,
    escalateToDispatch,
  } = useEmergencyStore()

  // Track previous language for detecting switches  
  const prevLanguageRef = useRef('en')
  
  const [state, setState] = useState<ConversationState>('idle')
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(0.2))
  const animationRef = useRef<number | null>(null)
  
  // Camera state
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  // Geolocation
  const [geoStatus, setGeoStatus] = useState<'pending' | 'ok' | 'denied'>('pending')
  const locationRef = useRef<{ lat: number; lng: number; address?: string } | null>(null)

  // Language
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const languageRef = useRef('en')

  // Translate steps when language changes
  useEffect(() => {
    if (prevLanguageRef.current === selectedLanguage) return
    const oldLang = prevLanguageRef.current
    prevLanguageRef.current = selectedLanguage

    const steps = session?.steps
    if (!steps || steps.length === 0) return

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu',
      kn: 'Kannada', ml: 'Malayalam', gu: 'Gujarati', bn: 'Bengali',
      pa: 'Punjabi', ur: 'Urdu', multi: 'English',
    }
    const targetLang = LANG_NAMES[selectedLanguage] || 'English'
    const stepTexts = steps.map(s => s.text)

    fetch('/api/emergency-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session?.id,
        message: `[SYSTEM: Translate these action steps to ${targetLang}. Return ONLY translated steps, no conversation response needed.]`,
        conversationHistory: [{ role: 'user', content: `Translate to ${targetLang}: ${JSON.stringify(stepTexts)}` }],
        currentSteps: [],
        language: selectedLanguage,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.steps?.length) {
          const translatedSteps = steps.map((s, i) => ({
            ...s,
            text: data.steps[i]?.text || s.text,
          }))
          useEmergencyStore.getState().updateSteps(translatedSteps)
        }
      })
      .catch(() => {}) // non-blocking
  }, [selectedLanguage])

  // SOS state
  const [sosCountdown, setSosCountdown] = useState<number | null>(null)
  const sosTapRef = useRef<number[]>([])
  const watchIdRef = useRef<number | null>(null)
  const lastLocationBroadcastRef = useRef<number>(0)

  // Mobile sidebar toggle
  const [showSidebar, setShowSidebar] = useState(false)

  // Dispatch call state
  const [dispatchCallActive, setDispatchCallActive] = useState(false)

  const call = useCall({
    sessionId: session?.id || '',
    role: 'user',
    onIncomingCall: () => {
      setDispatchCallActive(true)
      addMessage('system', '\ud83d\udcde Dispatch is connecting for live verification...')
    },
    onCallConnected: () => {
      setDispatchCallActive(true)
    },
    onCallEnded: () => {
      setDispatchCallActive(false)
      addMessage('system', 'Verification call ended')
    },
  })

  // Listen for incoming calls when escalated
  useEffect(() => {
    if (isEscalated && session?.id) {
      call.listenForCalls()
    }
  }, [isEscalated, session?.id])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages])

  // Live Geolocation — continuous tracking with watchPosition
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied')
      return
    }

    const handlePosition = async (pos: GeolocationPosition) => {
      const loc: { lat: number; lng: number; address?: string } = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }

      // Reverse geocode only on first capture or every 30s
      const now = Date.now()
      if (!locationRef.current || now - lastLocationBroadcastRef.current > 30000) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`)
          const data = await res.json()
          loc.address = data.display_name || undefined
        } catch {}
      } else {
        loc.address = locationRef.current.address
      }

      locationRef.current = loc
      updateSessionInfo({ location: loc })
      setGeoStatus('ok')

      // Broadcast live location to server every 10 seconds
      const currentSession = useEmergencyStore.getState().session
      if (currentSession?.isEscalated && now - lastLocationBroadcastRef.current > 10000) {
        lastLocationBroadcastRef.current = now
        fetch('/api/location-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            lat: loc.lat,
            lng: loc.lng,
            address: loc.address,
          }),
        }).catch(() => {})
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Listen for dispatch messages via Supabase Realtime
  useEffect(() => {
    if (!session?.id) return
    const channel = supabase
      .channel(`comms-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'communications', filter: `session_id=eq.${session.id}` },
        (payload: any) => {
          const msg = payload.new
          if (msg.sender_role === 'dispatch') {
            addMessage('dispatch', msg.content)
            speakText(msg.content)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session?.id])

  // SOS — triple-tap on background triggers silent panic
  // Only count taps on non-interactive areas (not buttons, inputs, dropdowns)
  const handleSOSTap = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // Ignore clicks on interactive elements
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[role="button"]') ||
      target.closest('[data-no-sos]')
    ) return

    const now = Date.now()
    sosTapRef.current = [...sosTapRef.current.filter(t => now - t < 800), now]
    if (sosTapRef.current.length >= 5) {
      sosTapRef.current = []
      triggerSOS()
    }
  }, [])

  const triggerSOS = async () => {
    setSosCountdown(3)
    const timer = setInterval(() => {
      setSosCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return null
        }
        return prev - 1
      })
    }, 1000)

    const currentSession = useEmergencyStore.getState().session
    if (!currentSession) return

    // Capture everything silently
    const imageBase64 = cameraStreamRef.current ? captureFrame() : null
    const loc = locationRef.current

    escalateToDispatch()
    addMessage('system', 'SOS activated — silent alert sent to dispatch')

    try {
      await fetch('/api/escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentSession.id,
          type: currentSession.type || 'safety',
          severity: 'CRITICAL',
          summary: 'SILENT SOS — ' + (currentSession.summary || 'Emergency'),
          location: loc,
          messages: currentSession.messages,
          steps: currentSession.steps,
          imageSnapshot: imageBase64,
          citizenId: currentSession.citizenId,
          citizenName: currentSession.citizenName,
          citizenPhone: currentSession.citizenPhone,
        }),
      })

      // Auto-dispatch if we have location
      if (loc) {
        await fetch('/api/auto-dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSession.id,
            type: currentSession.type || 'safety',
            severity: 'CRITICAL',
            lat: loc.lat,
            lng: loc.lng,
          }),
        })
      }
    } catch (e) {
      console.error('SOS error:', e)
    }
  }

  // Waveform animation
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const animate = () => {
        setWaveformBars(prev => 
          prev.map(() => 
            state === 'listening' 
              ? 0.3 + Math.random() * 0.7
              : 0.2 + Math.sin(Date.now() / 100) * 0.3 + Math.random() * 0.3
          )
        )
        animationRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else {
      setWaveformBars(Array(20).fill(0.2))
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [state])

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      let stream: MediaStream | null = null
      
      // Try different camera configurations
      try {
        // First try back camera (for mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          }
        })
        console.log('Back camera obtained')
      } catch (e) {
        // Fallback to any camera
        console.log('Back camera not available, trying default camera')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          }
        })
        console.log('Default camera obtained')
      }
      
      if (!stream) {
        throw new Error('Could not get camera stream')
      }
      
      const tracks = stream.getVideoTracks()
      console.log('Video tracks:', tracks.length, tracks[0]?.label)
      
      cameraStreamRef.current = stream
      setCameraEnabled(true)
      // The stream will be attached to the video element via useEffect
      // after React renders the conditionally-shown <video>
    } catch (error) {
      console.error('Camera error:', error)
      alert('Could not access camera. Please check permissions and make sure no other app is using the camera.')
      setCameraEnabled(false)
      setCameraReady(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraEnabled(false)
    setCameraReady(false)
  }, [])

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Use refs and direct video checks to avoid stale closures
    if (!video || !canvas || !cameraStreamRef.current) return null
    if (!video.videoWidth || !video.videoHeight) {
      console.warn('Video dimensions not ready:', video.videoWidth, video.videoHeight)
      return null
    }
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    
    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0)
    
    // Convert to base64 JPEG (smaller than PNG)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    console.log('Frame captured, size:', dataUrl.length)
    return dataUrl
  }, [])

  const toggleCamera = useCallback(() => {
    if (cameraEnabled) {
      stopCamera()
    } else {
      startCamera()
    }
  }, [cameraEnabled, startCamera, stopCamera])

  // Attach camera stream to video element once it's rendered
  useEffect(() => {
    if (cameraEnabled && cameraStreamRef.current && videoRef.current) {
      const video = videoRef.current
      video.srcObject = cameraStreamRef.current
      
      const playVideo = async () => {
        try {
          await video.play()
          setCameraReady(true)
          console.log('Camera started successfully')
        } catch (playError) {
          console.error('Play failed, waiting for loadedmetadata:', playError)
          video.onloadedmetadata = async () => {
            try {
              await video.play()
              setCameraReady(true)
              console.log('Camera started after metadata loaded')
            } catch (err) {
              console.error('Video play error after metadata:', err)
              setCameraReady(true)
            }
          }
        }
      }
      playVideo()
    }
  }, [cameraEnabled])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Initialize
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      
      if (!useEmergencyStore.getState().session) {
        startSession(selectedLanguage)
      }
      
      setTimeout(() => {
        const greeting = LANGUAGE_GREETINGS[languageRef.current] || LANGUAGE_GREETINGS['en']
        addMessage('ai', greeting)
        speakText(greeting)
      }, 600)
    }
  }, [])

  // TTS with ElevenLabs (multilingual)
  const speakText = async (text: string) => {
    setState('speaking')
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: languageRef.current }),
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl
          audioRef.current.onended = () => {
            setState('idle')
            URL.revokeObjectURL(audioUrl)
          }
          audioRef.current.onerror = () => setState('idle')
          await audioRef.current.play()
        }
      } else {
        setState('idle')
      }
    } catch (error) {
      console.error('TTS error:', error)
      setState('idle')
    }
  }

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setState('idle')
  }, [])

  // Recording
  const startRecording = useCallback(async () => {
    stopSpeaking()
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      
      audioChunksRef.current = []
      recordingStartRef.current = Date.now()
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        
        if (Date.now() - recordingStartRef.current < 500) {
          setState('idle')
          return
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size > 1000) {
          await processAudio(audioBlob)
        } else {
          setState('idle')
        }
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      setState('listening')
      
    } catch (error) {
      console.error('Mic error:', error)
      setState('idle')
    }
  }, [stopSpeaking])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setState('processing')
    }
  }, [])

  // Process conversation
  const processAudio = async (audioBlob: Blob) => {
    setState('processing')
    
    try {
      // Transcribe with language support
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', languageRef.current)
      
      const sttResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      })
      
      const sttData = await sttResponse.json()
      if (!sttData.text?.trim()) {
        setState('idle')
        return
      }
      
      const userText = sttData.text.trim()
      addMessage('user', userText)
      
      // Capture camera frame if enabled (use ref to avoid stale closure)
      const isCameraOn = !!cameraStreamRef.current
      const imageBase64 = isCameraOn ? captureFrame() : null
      console.log('Camera on:', isCameraOn, 'Image captured:', !!imageBase64)
      
      // Get AI response
      const currentSession = useEmergencyStore.getState().session
      const aiResponse = await fetch('/api/emergency-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession?.id,
          message: userText,
          conversationHistory: currentSession?.messages || [],
          currentSteps: currentSession?.steps || [],
          imageBase64: imageBase64,
          language: languageRef.current,
        }),
      })
      
      if (!aiResponse.ok) throw new Error('AI error')
      
      const aiData = await aiResponse.json()
      
      addMessage('ai', aiData.response)
      
      if (aiData.sessionInfo) updateSessionInfo(aiData.sessionInfo)
      
      // Add new steps dynamically
      if (aiData.steps?.length) {
        aiData.steps.forEach((s: any) => addStep(s.text, s.imageUrl))
      }
      
      if (aiData.shouldEscalate && !useEmergencyStore.getState().session?.isEscalated) {
        // Full escalation: push to Supabase so dispatch + department dashboards see it
        escalateToDispatch()
        addMessage('system', 'Connecting to emergency dispatch...')

        const s = useEmergencyStore.getState().session!
        const loc = locationRef.current || s.location
        const snapshot = cameraStreamRef.current ? captureFrame() : null

        fetch('/api/escalation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: s.id,
            type: s.type || 'other',
            severity: s.severity || 'MEDIUM',
            summary: s.summary || 'Emergency',
            location: loc,
            messages: s.messages,
            steps: s.steps,
            risks: aiData.sessionInfo?.risks || [],
            tacticalAdvice: aiData.sessionInfo?.tacticalAdvice || '',
            imageSnapshot: snapshot,
            citizenId: s.citizenId,
            citizenName: s.citizenName,
            citizenPhone: s.citizenPhone,
          }),
        }).then(r => r.json()).then(data => {
          if (data.success) {
            addMessage('system', 'Dispatch team notified — help is on the way!')
            speakText('Dispatch team has been notified. Help is on the way.')
            // Auto-dispatch if we have location
            if (loc?.lat && loc?.lng) {
              fetch('/api/auto-dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: s.id, type: s.type, severity: s.severity, lat: loc.lat, lng: loc.lng }),
              }).then(r => r.json()).then(dd => {
                if (dd.dispatched?.length) {
                  addMessage('system', `${dd.dispatched[0].name} dispatched — ETA ${dd.dispatched[0].eta} min`)
                }
              }).catch(() => {})
            }
          }
        }).catch(err => {
          console.error('Auto-escalation error:', err)
        })
      }
      
      await speakText(aiData.response)
      
    } catch (error) {
      console.error('Error:', error)
      const errorMsg = "I didn't catch that. Can you say that again?"
      addMessage('ai', errorMsg)
      await speakText(errorMsg)
    }
  }

  const handleMicPress = () => {
    if (state === 'idle' || state === 'speaking') {
      startRecording()
    }
  }

  const handleMicRelease = () => {
    if (state === 'listening') {
      stopRecording()
    }
  }

  const handleEndSession = () => {
    stopSpeaking()
    if (confirm('End this session?')) {
      endSession()
      router.push('/')
    }
  }

  const handleEscalate = async () => {
    if (!confirm('Connect to emergency dispatch? Professional responders will be alerted.')) {
      return
    }
    
    const currentSession = useEmergencyStore.getState().session
    if (!currentSession) return
    
    // Update local state
    escalateToDispatch()
    addMessage('system', 'Connecting to emergency dispatch...')
    
    try {
      const loc = locationRef.current || currentSession.location
      const imageBase64 = cameraStreamRef.current ? captureFrame() : null

      const response = await fetch('/api/escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentSession.id,
          type: currentSession.type || 'other',
          severity: currentSession.severity || 'MEDIUM',
          summary: currentSession.summary || 'Emergency',
          location: loc,
          messages: currentSession.messages,
          steps: currentSession.steps,
          risks: currentSession.risks || [],
          tacticalAdvice: currentSession.tacticalAdvice || '',
          imageSnapshot: imageBase64,
          citizenId: currentSession.citizenId,
          citizenName: currentSession.citizenName,
          citizenPhone: currentSession.citizenPhone,
        }),
      })
      
      if (response.ok) {
        addMessage('system', 'Dispatch team notified - help is on the way!')
        speakText('Dispatch team has been notified. Professional help is on the way. Stay on the line, I\'m still here with you.')

        // Auto-dispatch nearest responder if location available
        if (loc?.lat && loc?.lng) {
          fetch('/api/auto-dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: currentSession.id,
              type: currentSession.type || 'other',
              severity: currentSession.severity || 'MEDIUM',
              lat: loc.lat,
              lng: loc.lng,
            }),
          }).then(r => r.json()).then(data => {
            if (data.dispatched?.length) {
              addMessage('system', `${data.dispatched[0].name} dispatched — ETA ${data.dispatched[0].eta} min`)
            }
          }).catch(() => {})
        }
      } else {
        throw new Error('Escalation failed')
      }
    } catch (error) {
      console.error('Escalation error:', error)
      addMessage('system', 'Connection issue - retrying...')
      speakText('Having trouble connecting. Please call 112 directly if this is life-threatening.')
    }
  }

  const TypeIcon = session?.type ? typeIcons[session.type] || AlertTriangle : Shield
  const completedSteps = session?.steps?.filter(s => s.completed).length || 0
  const totalSteps = session?.steps?.length || 0

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 text-slate-900 flex overflow-hidden" onClick={handleSOSTap}>
      <audio ref={audioRef} />
      <canvas ref={canvasRef} className="hidden" />

      {/* SOS Countdown Overlay */}
      {sosCountdown !== null && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
          <div className="text-center text-white">
            <AlertOctagon className="h-20 w-20 mx-auto mb-4 animate-pulse" />
            <p className="text-4xl font-bold">SILENT SOS</p>
            <p className="text-lg mt-2 text-red-100">Alerting dispatch...</p>
          </div>
        </div>
      )}

      {/* Geolocation indicator */}
      {geoStatus !== 'pending' && (
        <div className="absolute top-4 left-16 z-30 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-slate-200">
          <MapPin className={`h-3.5 w-3.5 ${geoStatus === 'ok' ? 'text-emerald-500' : 'text-red-500'}`} />
          <span className="text-xs font-medium text-slate-600">
            {geoStatus === 'ok' ? (locationRef.current?.address?.split(',')[0] || 'Located') : 'No GPS'}
          </span>
          {geoStatus === 'ok' && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
        </div>
      )}
      
      {/* Camera Preview - Floating */}
      {cameraEnabled && (
        <div className="absolute top-20 right-4 z-30 animate-in slide-in-from-right">
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden w-32 h-24 sm:w-48 sm:h-36 shadow-xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              width="192"
              height="144"
              className="absolute inset-0 w-full h-full object-cover border-2 border-emerald-400/50 rounded-2xl bg-slate-900"
              onError={(e) => {
                console.error('Video element error:', e)
                alert('Video playback error. Camera might not be supported.')
              }}
              onLoadedMetadata={() => {
                console.log('Video metadata loaded, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
              }}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-2xl">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
              </div>
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-emerald-500 rounded-full shadow-sm">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-white">{cameraReady ? 'LIVE' : 'STARTING...'}</span>
            </div>
            <button
              onClick={toggleCamera}
              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-emerald-600 text-center mt-2 font-medium">
            {cameraReady ? 'AI can see this' : 'Loading camera...'}
          </p>
        </div>
      )}
      
      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-indigo-100/40 via-violet-50/20 to-transparent rounded-full blur-3xl" />
        
        {/* Header */}
        <header className="relative z-20 p-4 flex items-center justify-between border-b border-slate-200/60 bg-white/60 backdrop-blur-sm">
          <button onClick={handleEndSession} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
            <X className="h-5 w-5 text-slate-500" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              session?.severity === 'CRITICAL' ? 'bg-red-100' :
              session?.severity === 'HIGH' ? 'bg-orange-100' :
              session?.severity === 'MEDIUM' ? 'bg-amber-100' : 'bg-indigo-100'
            }`}>
              <TypeIcon className={`h-5 w-5 ${
                session?.severity === 'CRITICAL' ? 'text-red-600' :
                session?.severity === 'HIGH' ? 'text-orange-600' :
                session?.severity === 'MEDIUM' ? 'text-amber-600' : 'text-indigo-600'
              }`} />
            </div>
            <div>
              <h1 className="font-semibold text-sm text-slate-900">Rakshak AI</h1>
              <p className="text-xs text-slate-500">
                {isEscalated ? 'Dispatch Connected' : session?.summary || 'Emergency Assistant'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative" data-no-sos>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setShowLanguagePicker(!showLanguagePicker)
                }}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Globe className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">
                  {LANGUAGES.find(l => l.code === selectedLanguage)?.flag || '🌐'}
                </span>
              </button>
              
              {showLanguagePicker && (
                <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[100] w-48 max-h-72 overflow-y-auto" data-no-sos>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLanguage(lang.code)
                        languageRef.current = lang.code
                        setShowLanguagePicker(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-indigo-50 transition-colors ${
                        selectedLanguage === lang.code ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {selectedLanguage === lang.code && (
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={state === 'speaking' ? stopSpeaking : undefined}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              {state === 'speaking' ? <VolumeX className="h-5 w-5 text-slate-600" /> : <Volume2 className="h-5 w-5 text-slate-400" />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-5">
          {session?.messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {msg.role === 'system' ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800 font-medium">{msg.content}</span>
                </div>
              ) : msg.role === 'dispatch' ? (
                <div className="max-w-[85%]">
                  <div className="rounded-2xl px-5 py-3 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Radio className="h-3 w-3 text-emerald-600" />
                      <p className="text-[11px] font-semibold text-emerald-600">Dispatch Team</p>
                    </div>
                    <p className="text-[15px] leading-relaxed text-slate-800">{msg.content}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 px-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                  <div className={`rounded-2xl px-5 py-3 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white ml-auto' 
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 px-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          ))}
          
          {state === 'processing' && (
            <div className="flex justify-start animate-in fade-in">
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Control */}
        <div className="relative z-10 p-3 pb-5 sm:p-6 sm:pb-8 bg-white/40 backdrop-blur-sm border-t border-slate-200/60">
          {/* Waveform */}
          <div className="flex items-center justify-center gap-0.5 sm:gap-1 h-10 sm:h-14 mb-3 sm:mb-5">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  state === 'listening' ? 'bg-red-500' :
                  state === 'speaking' ? 'bg-indigo-500' :
                  state === 'processing' ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                style={{ 
                  height: `${height * 100}%`,
                  opacity: state === 'idle' ? 0.4 : 1
                }}
              />
            ))}
          </div>

          {/* Mic Button */}
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full transition-all duration-200 flex items-center justify-center shadow-md ${
                cameraEnabled 
                  ? 'bg-emerald-500 text-white shadow-emerald-200' 
                  : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-500'
              }`}
            >
              {cameraEnabled ? (
                <Video className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </button>
            
            {/* Main Mic Button */}
            <button
              onMouseDown={handleMicPress}
              onMouseUp={handleMicRelease}
              onMouseLeave={handleMicRelease}
              onTouchStart={handleMicPress}
              onTouchEnd={handleMicRelease}
              disabled={state === 'processing'}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full transition-all duration-200 flex items-center justify-center active:scale-95 disabled:opacity-50 shadow-lg ${
                state === 'listening' 
                  ? 'bg-red-500 text-white shadow-red-200' 
                  : state === 'speaking'
                  ? 'bg-indigo-600 text-white shadow-indigo-200'
                  : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-200 hover:shadow-xl'
              }`}
            >
              {state === 'processing' ? (
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
              ) : state === 'listening' ? (
                <MicOff className="h-6 w-6 sm:h-8 sm:w-8" />
              ) : (
                <Mic className="h-6 w-6 sm:h-8 sm:w-8" />
              )}
              
              {state === 'listening' && (
                <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping" />
              )}
            </button>
            
            {/* Capture Frame Button */}
            <button
              onClick={async () => {
                if (!cameraEnabled) return
                const frame = captureFrame()
                if (frame) {
                  addMessage('user', '[Shared camera view with AI]')
                  setState('processing')
                  try {
                    const currentSession = useEmergencyStore.getState().session
                    const aiResponse = await fetch('/api/emergency-agent', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId: currentSession?.id,
                        message: 'Look at what I\'m showing you',
                        conversationHistory: currentSession?.messages || [],
                        currentSteps: currentSession?.steps || [],
                        imageBase64: frame,
                      }),
                    })
                    if (aiResponse.ok) {
                      const aiData = await aiResponse.json()
                      addMessage('ai', aiData.response)
                      if (aiData.sessionInfo) updateSessionInfo(aiData.sessionInfo)
                      if (aiData.steps?.length) {
                        aiData.steps.forEach((s: any) => addStep(s.text, s.imageUrl))
                      }
                      await speakText(aiData.response)
                    }
                  } catch (error) {
                    console.error('Vision error:', error)
                    setState('idle')
                  }
                }
              }}
              disabled={!cameraEnabled || state === 'processing'}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full transition-all duration-200 flex items-center justify-center shadow-md ${
                cameraEnabled 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200' 
                  : 'bg-slate-100 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Camera className={`h-5 w-5 sm:h-6 sm:w-6 ${cameraEnabled ? 'text-white' : 'text-slate-300'}`} />
            </button>
          </div>

          <p className="text-center text-xs sm:text-sm text-slate-500 mt-2 sm:mt-4 font-medium">
            {state === 'listening' ? 'Listening... release to send' :
             state === 'processing' ? (cameraEnabled ? 'Analyzing with vision...' : 'Processing...') :
             state === 'speaking' ? 'Speaking...' :
             cameraEnabled ? 'Hold mic to talk — Tap camera to share view' : 'Hold to talk'}
          </p>
          <p className="text-center text-[10px] text-slate-400 mt-1 sm:mt-2">Tap background 5 times for silent SOS</p>
        </div>

        {/* Escalated / Dispatch Call Banner */}
        {isEscalated && (
          <div className={`absolute top-20 left-4 right-4 z-20 animate-in slide-in-from-top`}>
            <div className={`rounded-2xl p-4 shadow-xl ${
              call.status === 'connected'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200'
                : 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-200'
            } text-white`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  {call.status === 'connected' ? (
                    <PhoneCall className="h-5 w-5" />
                  ) : call.status === 'ringing' || call.status === 'calling' ? (
                    <Phone className="h-5 w-5 animate-pulse" />
                  ) : (
                    <Radio className="h-5 w-5 animate-pulse" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {call.status === 'connected' ? 'Live Verification Call' : 
                     call.status === 'ringing' ? 'Dispatch Connecting...' :
                     'Emergency Dispatch Connected'}
                  </p>
                  <p className={`text-sm ${
                    call.status === 'connected' ? 'text-emerald-100' : 'text-red-100'
                  }`}>
                    {call.status === 'connected' ? `Call in progress \u2014 ${call.formattedDuration}` :
                     call.status === 'ringing' ? 'Incoming call from dispatch...' :
                     'Professional help is on the way'}
                  </p>
                </div>
                {call.status === 'connected' && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={call.toggleMute}
                      className={`p-2 rounded-lg transition-all ${
                        call.isMuted ? 'bg-red-500/50' : 'bg-white/20 hover:bg-white/30'
                      }`}>
                      {call.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button onClick={() => call.endCall()}
                      className="p-2 bg-red-600 rounded-lg hover:bg-red-700 transition-all">
                      <PhoneOff className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Steps Sidebar Toggle (mobile) */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="fixed bottom-24 right-4 z-40 lg:hidden w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 transition-all"
      >
        <ListChecks className="h-5 w-5" />
        {totalSteps > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {completedSteps}/{totalSteps}
          </span>
        )}
      </button>

      {/* Sidebar Overlay (mobile) */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Steps Sidebar */}
      <div className={`fixed right-0 top-0 bottom-0 w-80 z-50 lg:relative lg:z-auto bg-white/95 lg:bg-white/70 backdrop-blur-xl border-l border-slate-200/60 flex flex-col transition-transform duration-300 ${
        showSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-5 border-b border-slate-200/60">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Action Steps</h2>
            <div className="flex items-center gap-2">
              {totalSteps > 0 && (
                <span className="text-xs text-slate-500 font-medium">{completedSteps}/{totalSteps}</span>
              )}
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <PanelRightClose className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
          {totalSteps > 0 && (
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {session?.steps && session.steps.length > 0 ? (
            session.steps.map((step, index) => (
              <div
                key={step.id}
                className={`group rounded-xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-right ${
                  step.completed 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : 'bg-white border border-slate-200 hover:border-indigo-200 shadow-sm'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => completeStep(step.id)}
                    className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                      step.completed 
                        ? 'bg-emerald-500 text-white' 
                        : 'border-2 border-slate-300 hover:border-indigo-500 text-slate-400 hover:text-indigo-500'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </button>
                  <p className={`text-sm leading-relaxed ${step.completed ? 'text-emerald-700/60 line-through' : 'text-slate-700'}`}>
                    {step.text}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <ChevronRight className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-400">Steps will appear here as we work through your situation</p>
            </div>
          )}
        </div>

        {/* Escalate Button */}
        <div className="p-4 border-t border-slate-200/60">
          <button
            onClick={handleEscalate}
            disabled={isEscalated}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              isEscalated 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default' 
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
            }`}
          >
            <Phone className="h-5 w-5" />
            {isEscalated ? 'Dispatch Connected' : 'Connect to Emergency Services'}
          </button>
          {!isEscalated && (
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Use only if you need professional emergency help
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
