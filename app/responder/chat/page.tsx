'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, Phone, PhoneOff, MessageSquare, MapPin, 
  Navigation, User, Bot, Headphones, Send, Mic, MicOff,
  Volume2, CheckCircle, AlertTriangle, Clock, Shield,
  Radio, ChevronRight
} from 'lucide-react'

// Mock assigned incident for demo
const mockIncident = {
  id: 'EM-1707300000-abc123',
  type: 'medical',
  severity: 'CRITICAL',
  summary: 'Person collapsed and not breathing',
  location: {
    lat: 28.6139,
    lng: 77.2090,
    address: 'Connaught Place, New Delhi',
  },
  citizen: {
    name: 'Caller',
    phone: '+91-9876543210',
  },
  messages: [
    { id: '1', role: 'dispatch', content: 'Medical unit dispatched. ETA 4 minutes.', timestamp: Date.now() - 120000 },
    { id: '2', role: 'user', content: 'Please hurry! He is still not responding!', timestamp: Date.now() - 100000 },
    { id: '3', role: 'responder', content: "We're almost there. Keep doing chest compressions.", timestamp: Date.now() - 80000 },
    { id: '4', role: 'user', content: 'I am trying my best!', timestamp: Date.now() - 60000 },
  ],
  steps: [
    { id: 's1', text: 'Check if person is responsive', completed: true },
    { id: 's2', text: 'Call for help from anyone nearby', completed: true },
    { id: 's3', text: 'Place person flat on firm surface', completed: true },
    { id: 's4', text: 'Begin chest compressions', completed: true },
  ],
  eta: '2 minutes',
  distance: '0.8 km',
}

export default function ResponderChatPage() {
  const [incident] = useState(mockIncident)
  const [messages, setMessages] = useState(mockIncident.messages)
  const [messageInput, setMessageInput] = useState('')
  const [isOnCall, setIsOnCall] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    const newMessage = {
      id: `msg-${Date.now()}`,
      role: 'responder' as const,
      content: messageInput,
      timestamp: Date.now(),
    }

    setMessages([...messages, newMessage])
    setMessageInput('')
  }

  const handleCall = () => {
    setIsOnCall(!isOnCall)
  }

  const handleMic = () => {
    setIsListening(!isListening)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/medical" className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-400 font-medium">LIVE INCIDENT</span>
              </div>
              <h1 className="font-semibold">{incident.summary}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">{incident.id}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main Chat */}
        <div className="flex-1 flex flex-col">
          {/* Location Banner */}
          <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{incident.location.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400">{incident.distance}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">ETA: {incident.eta}</span>
                </div>
              </div>
              <a
                href={`https://maps.google.com/?q=${incident.location.lat},${incident.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                Navigate
              </a>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'responder' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-3 max-w-[70%] ${msg.role === 'responder' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-blue-600' :
                    msg.role === 'dispatch' ? 'bg-amber-600' :
                    'bg-emerald-600'
                  }`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> :
                     msg.role === 'dispatch' ? <Headphones className="h-4 w-4" /> :
                     <Shield className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className={`rounded-2xl px-4 py-2 ${
                      msg.role === 'responder' ? 'bg-emerald-600' :
                      msg.role === 'dispatch' ? 'bg-amber-500/20 border border-amber-500/30' :
                      'bg-slate-800'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block px-2">
                      {msg.role === 'user' ? 'Citizen' : msg.role === 'dispatch' ? 'Dispatch' : 'You'} • {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex gap-2">
              <button
                onClick={handleCall}
                className={`p-3 rounded-xl transition-colors ${
                  isOnCall ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isOnCall ? <PhoneOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
              </button>
              <button
                onClick={handleMic}
                className={`p-3 rounded-xl transition-colors ${
                  isListening ? 'bg-blue-600 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Message citizen..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-slate-800 bg-slate-900/30 flex flex-col">
          {/* Severity */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Severity</span>
              <span className="px-3 py-1 bg-red-500 rounded-lg text-sm font-semibold">
                {incident.severity}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Type</span>
              <span className="text-sm text-slate-300 capitalize">{incident.type}</span>
            </div>
          </div>

          {/* Steps Progress */}
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Citizen Steps</h3>
            <div className="space-y-2">
              {incident.steps.map((step, i) => (
                <div key={step.id} className="flex items-start gap-2">
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                    step.completed ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <span className="text-xs">{i + 1}</span>
                    )}
                  </div>
                  <p className={`text-xs ${step.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Responses */}
          <div className="p-4 flex-1">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Responses</h3>
            <div className="space-y-2">
              {[
                "We're almost there, stay calm",
                "Keep doing what you're doing",
                "Can you see our vehicle?",
                "We have arrived",
                "Patient is stable",
              ].map((msg, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setMessages([...messages, {
                      id: `msg-${Date.now()}`,
                      role: 'responder' as const,
                      content: msg,
                      timestamp: Date.now(),
                    }])
                  }}
                  className="w-full text-left p-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-xs text-slate-300 transition-colors"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Status Actions */}
          <div className="p-4 border-t border-slate-800">
            <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Mark Resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
