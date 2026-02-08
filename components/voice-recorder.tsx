'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface VoiceRecorderProps {
  onTranscription: (text: string) => void
  disabled?: boolean
  incidentId?: string
}

export function VoiceRecorder({ onTranscription, disabled = false, incidentId }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Stop recording after 60 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          stopRecording()
        }
      }, 60000)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      if (incidentId) {
        formData.append('incidentId', incidentId)
      }

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process audio')
      }

      const data = await response.json()
      onTranscription(data.transcription)
    } catch (error) {
      console.error('Error processing audio:', error)
    } finally {
      setIsProcessing(false)
      setRecordingTime(0)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      <CardContent className="pt-6">
        {isRecording && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-red-400">Recording...</span>
              </div>
              <span className="text-xs font-mono text-red-400">{formatTime(recordingTime)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={disabled || isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700 h-10"
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Voice Message
            </Button>
          ) : (
            <>
              <Button
                onClick={stopRecording}
                className="flex-1 bg-red-600 hover:bg-red-700 h-10"
              >
                <MicOff className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
              <Button
                onClick={stopRecording}
                className="bg-blue-600 hover:bg-blue-700 h-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {isProcessing && (
          <div className="mt-3 p-3 rounded-lg bg-blue-500/20 border border-blue-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span className="text-sm text-blue-400">Processing audio...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
