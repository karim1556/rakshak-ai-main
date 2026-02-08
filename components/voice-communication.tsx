'use client'

import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface VoiceCommunicationProps {
  incidentId: string
  responderName: string
  responderId: string
}

export function VoiceCommunication({
  incidentId,
  responderName,
  responderId,
}: VoiceCommunicationProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const connectionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (isConnected) {
        handleDisconnect()
      }
    }
  }, [])

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setCallDuration(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isConnected])

  const handleConnect = async () => {
    try {
      setError(null)

      // Get LiveKit token
      const tokenResponse = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `incident-${incidentId}`,
          participantName: responderName,
          participantId: responderId,
        }),
      })

      if (!tokenResponse.ok) {
        const data = await tokenResponse.json()
        throw new Error(data.error || 'Failed to get token')
      }

      const { token, url } = await tokenResponse.json()

      // For demo purposes, we'll simulate the connection
      // In production, you'd use the actual LiveKit client
      if (!window.location.hostname.includes('localhost')) {
        console.log('LiveKit would connect to:', url)
      }

      setIsConnected(true)
      setParticipantCount(2)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect'
      setError(message)
      console.error('Connection error:', err)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setParticipantCount(0)
    setCallDuration(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white">Voice Channel</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {isConnected ? (
          <div className="space-y-4">
            {/* Call Status */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold text-white">Call Active</span>
                </div>
                <span className="text-lg font-mono text-green-400">{formatDuration(callDuration)}</span>
              </div>
              <p className="text-sm text-slate-300">
                {participantCount} participant{participantCount !== 1 ? 's' : ''} connected
              </p>
            </div>

            {/* Mute Controls */}
            <div className="flex gap-2">
              <Button
                onClick={() => setIsMuted(!isMuted)}
                className={isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}
                size="sm"
              >
                {isMuted ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Mute
                  </>
                )}
              </Button>
              <Button
                onClick={handleDisconnect}
                className="flex-1 bg-red-600 hover:bg-red-700"
                size="sm"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                End Call
              </Button>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400">CONNECTED PARTICIPANTS</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                  <span className="text-white">{responderName}</span>
                  <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
                    You
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                  <span className="text-white">Dispatch Center</span>
                  <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm mb-4">Emergency voice channel</p>
            <Button
              onClick={handleConnect}
              className="w-full bg-green-600 hover:bg-green-700 h-12"
            >
              <Phone className="h-5 w-5 mr-2" />
              Join Voice Channel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
