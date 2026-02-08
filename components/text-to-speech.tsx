'use client'

import { useState } from 'react'
import { Volume2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TextToSpeechProps {
  text: string
  disabled?: boolean
  variant?: 'default' | 'outline'
}

export function TextToSpeech({ text, disabled = false, variant = 'outline' }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)

  const handleSpeak = async () => {
    // Check if browser supports Web Speech API
    const SpeechSynthesisUtterance =
      typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null

    if (!SpeechSynthesisUtterance) {
      console.error('Speech Synthesis API not supported')
      return
    }

    if (isPlaying) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      return
    }

    setIsSynthesizing(true)

    try {
      // Create utterance
      const utterance = new window.SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => {
        setIsPlaying(true)
        setIsSynthesizing(false)
      }

      utterance.onend = () => {
        setIsPlaying(false)
      }

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        setIsPlaying(false)
        setIsSynthesizing(false)
      }

      // Start speaking
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('Error in text-to-speech:', error)
      setIsSynthesizing(false)
    }
  }

  return (
    <Button
      onClick={handleSpeak}
      disabled={disabled || isSynthesizing || !text}
      variant={variant}
      size="sm"
      className={variant === 'outline' ? 'border-slate-600 text-white hover:bg-slate-800' : ''}
    >
      {isSynthesizing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Preparing...
        </>
      ) : isPlaying ? (
        <>
          <Volume2 className="h-4 w-4 mr-2 text-green-500" />
          Playing...
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4 mr-2" />
          Listen
        </>
      )}
    </Button>
  )
}
