'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'

interface UseCallOptions {
  sessionId: string
  role: 'dispatch' | 'user'
  onIncomingCall?: () => void
  onCallConnected?: () => void
  onCallEnded?: () => void
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function useCall({ sessionId, role, onIncomingCall, onCallConnected, onCallEnded }: UseCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [remoteAudioActive, setRemoteAudioActive] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([])

  // Create and set up peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate.toJSON(), from: role },
        })
      }
    }

    pc.ontrack = (event) => {
      setRemoteAudioActive(true)
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio()
        remoteAudioRef.current.autoplay = true
      }
      remoteAudioRef.current.srcObject = event.streams[0]
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setStatus('connected')
        onCallConnected?.()
        // Start duration timer
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
      }
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        endCall()
      }
    }

    pcRef.current = pc
    return pc
  }, [role, onCallConnected])

  // Get local audio
  const getLocalAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      return stream
    } catch (err) {
      console.error('Microphone access denied:', err)
      throw err
    }
  }, [])

  // Setup signaling channel
  const setupChannel = useCallback(() => {
    const channelName = `call-${sessionId}`
    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.from === role) return // ignore own messages
        // Incoming call — user side
        onIncomingCall?.()
        try {
          const pc = createPeerConnection()
          const stream = await getLocalAudio()
          stream.getTracks().forEach(track => pc.addTrack(track, stream))

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))

          // Process queued candidates
          for (const candidate of candidateQueueRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          candidateQueueRef.current = []

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          channel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { sdp: answer, from: role },
          })
          setStatus('connected')
        } catch (err) {
          console.error('Error handling offer:', err)
          setStatus('idle')
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.from === role) return
        try {
          if (pcRef.current && pcRef.current.signalingState === 'have-local-offer') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            // Process queued candidates
            for (const candidate of candidateQueueRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
            }
            candidateQueueRef.current = []
          }
        } catch (err) {
          console.error('Error handling answer:', err)
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from === role) return
        try {
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } else {
            candidateQueueRef.current.push(payload.candidate)
          }
        } catch (err) {
          console.error('Error handling ICE candidate:', err)
        }
      })
      .on('broadcast', { event: 'end-call' }, ({ payload }) => {
        if (payload.from === role) return
        endCall(true)
      })
      .subscribe()

    channelRef.current = channel
    return channel
  }, [sessionId, role, createPeerConnection, getLocalAudio, onIncomingCall])

  // Start call (dispatch initiates)
  const startCall = useCallback(async () => {
    try {
      setStatus('calling')
      setDuration(0)

      const channel = setupChannel()

      const pc = createPeerConnection()
      const stream = await getLocalAudio()
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Small delay so the other side subscribes first
      await new Promise(r => setTimeout(r, 500))

      channel.send({
        type: 'broadcast',
        event: 'offer',
        payload: { sdp: offer, from: role },
      })

      // Also notify via communications table so the user page picks it up if just loading
      await (supabase.from('communications') as any).insert({
        session_id: sessionId,
        sender_role: 'dispatch',
        content: '📞 Dispatch is connecting to verify your emergency...',
      })

      setStatus('ringing')
    } catch (err) {
      console.error('Error starting call:', err)
      setStatus('idle')
    }
  }, [setupChannel, createPeerConnection, getLocalAudio, role, sessionId])

  // End call
  const endCall = useCallback((remote = false) => {
    if (channelRef.current && !remote) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'end-call',
        payload: { from: role },
      })
    }

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    // Close peer connection
    pcRef.current?.close()
    pcRef.current = null

    // Stop remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
      remoteAudioRef.current = null
    }

    // Cleanup channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setStatus('ended')
    setDuration(0)
    setRemoteAudioActive(false)
    setIsMuted(false)
    candidateQueueRef.current = []

    onCallEnded?.()

    // Reset to idle after a moment
    setTimeout(() => setStatus('idle'), 2000)
  }, [role, onCallEnded])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  // Listen for incoming calls (user side)
  const listenForCalls = useCallback(() => {
    setupChannel()
  }, [setupChannel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      pcRef.current?.close()
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return {
    status,
    duration,
    formattedDuration: formatDuration(duration),
    isMuted,
    remoteAudioActive,
    startCall,
    endCall,
    toggleMute,
    listenForCalls,
  }
}
