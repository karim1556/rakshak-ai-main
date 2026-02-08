'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, MapPin, Phone, PhoneOff, PhoneCall, Clock, Send, CheckCircle2,
  Heart, Flame, Car, Shield, AlertTriangle, Bell,
  Radio, UserCheck, ChevronRight, MessageSquare, Info,
  FileText, Loader2, X, Volume2, Eye, Zap, Activity, Users,
  Mic, MicOff
} from 'lucide-react'
import { AuthGuard } from '@/components/auth-guard'
import { PatientHealthCard } from '@/components/patient-health-card'
import { supabase } from '@/lib/supabase'
import { useCall } from '@/lib/use-call'
import { haversineDistance, formatDistance, estimateETA } from '@/lib/utils'

const MapComponent = dynamic(() => import('@/components/map').then(m => ({ default: m.Map })), { ssr: false })

interface Session {
  id: string
  type: string
  severity: string
  summary: string
  status: string
  location?: { address?: string; lat?: number; lng?: number }
  messages: any[]
  steps: any[]
  escalatedAt: number
  assignedResponder?: any
  language?: string
  imageSnapshot?: string
  qaReport?: any
  // Citizen identity
  citizenId?: string | null
  citizenName?: string | null
  citizenPhone?: string | null
}

const typeIcons: Record<string, any> = {
  medical: Heart, fire: Flame, accident: Car, safety: Shield, other: AlertTriangle
}

const typeColors: Record<string, string> = {
  medical: 'text-rose-500', fire: 'text-orange-500', accident: 'text-amber-500',
  safety: 'text-blue-500', other: 'text-slate-500'
}

// --- Dispatch Modal ---
function DispatchModal({ type, session, onClose, onDispatch }: {
  type: 'medical' | 'police' | 'fire'
  session: Session
  onClose: () => void
  onDispatch: (type: 'medical' | 'police' | 'fire', notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const icons = { medical: Heart, police: Shield, fire: Flame }
  const labels = { medical: 'EMS / Ambulance', police: 'Police Unit', fire: 'Fire Engine' }
  const colors = { medical: 'border-rose-200 bg-rose-50', police: 'border-blue-200 bg-blue-50', fire: 'border-orange-200 bg-orange-50' }
  const btnColors = { medical: 'bg-rose-500 hover:bg-rose-600', police: 'bg-blue-500 hover:bg-blue-600', fire: 'bg-orange-500 hover:bg-orange-600' }
  const IconC = icons[type]

  const handleSend = async () => {
    setSending(true)
    await onDispatch(type, notes.trim())
    setSending(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={`p-4 border-b rounded-t-2xl ${colors[type]}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconC className={`h-5 w-5 ${typeColors[type]}`} />
              <h3 className="text-sm font-bold text-slate-800">Dispatch {labels[type]}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-lg"><X className="h-4 w-4 text-slate-500" /></button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
            <p className="text-xs font-semibold text-slate-800">{session.summary || 'Emergency'}</p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200 font-semibold">{session.severity}</span>
              <span>{session.type}</span>
              {session.location?.address && (
                <>
                  <span>·</span>
                  <MapPin className="h-2.5 w-2.5" />
                  <span className="truncate">{session.location.address.split(',').slice(0, 2).join(',')}</span>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5 block">
              Dispatch Notes (sent to {type} dashboard)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`e.g. "Victim is on 3rd floor, use east stairway. Caller reports smoke inhalation. Approach from Ring Road side."`}
              rows={4}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300 resize-none transition-all"
              autoFocus
            />
            <p className="text-[9px] text-slate-400 mt-1">These notes will appear on the {type} department dashboard for this incident.</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-500 font-medium">Cancel</button>
            <button onClick={handleSend} disabled={sending} className={`flex-1 py-2.5 text-xs text-white rounded-xl transition-colors flex items-center justify-center gap-1.5 font-semibold shadow-sm ${btnColors[type]} ${sending ? 'opacity-50' : ''}`}>
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {sending ? 'Dispatching...' : `Dispatch ${type === 'medical' ? 'EMS' : type === 'police' ? 'Police' : 'Fire'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Quick Summary Card ---
function QuickSummary({ session }: { session: Session }) {
  const callerMsgs = session.messages?.filter((m: any) => m.role === 'user') || []
  const aiMsgs = session.messages?.filter((m: any) => m.role === 'ai') || []
  const stepsCount = session.steps?.length || 0
  const completedSteps = session.steps?.filter((s: any) => s.completed)?.length || 0

  // Build a quick text summary from caller messages
  const callerSummary = callerMsgs.slice(0, 3).map((m: any) => m.content).join(' ').slice(0, 200)

  return (
    <div className="mx-4 mt-3 p-3 bg-white border border-slate-200 rounded-xl flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
        <Info className="h-3 w-3" /> Quick Summary
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-[9px] text-slate-400 font-medium">Type</p>
          <p className="text-[11px] text-slate-800 font-semibold capitalize">{session.type}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-[9px] text-slate-400 font-medium">Messages</p>
          <p className="text-[11px] text-slate-800 font-semibold">{callerMsgs.length} caller / {aiMsgs.length} AI</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-[9px] text-slate-400 font-medium">Steps</p>
          <p className="text-[11px] text-slate-800 font-semibold">{completedSteps}/{stepsCount} done</p>
        </div>
      </div>
      {callerSummary && (
        <div className="bg-indigo-50/50 rounded-lg p-2 border border-indigo-100">
          <p className="text-[9px] text-indigo-500 mb-0.5 font-semibold">Caller said</p>
          <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-2">&ldquo;{callerSummary}{callerSummary.length >= 200 ? '...' : ''}&rdquo;</p>
        </div>
      )}
    </div>
  )
}

function DispatchContent() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<Session | null>(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [qaLoading, setQaLoading] = useState(false)
  const [qaReport, setQaReport] = useState<any>(null)
  const [showQA, setShowQA] = useState(false)
  const [responders, setResponders] = useState<any[]>([])
  const [dispatchModal, setDispatchModal] = useState<'medical' | 'police' | 'fire' | null>(null)
  const msgEndRef = useRef<HTMLDivElement>(null)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/escalation')
      const data = await res.json()
      setSessions(data.sessions || [])
      if (selected) {
        const updated = data.sessions?.find((s: Session) => s.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch {}
    setLoading(false)
  }, [selected])

  // Fetch responders
  const fetchResponders = async () => {
    const { data } = await supabase.from('responders').select('*')
    if (data) setResponders(data)
  }

  // Update all responder locations in DB to the dispatch team's current browser location
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        // Update all responders to be near the current location (spread within ~2km radius)
        const { data: allResp } = await supabase.from('responders').select('id')
        if (allResp) {
          for (const r of allResp) {
            const offsetLat = (Math.random() * 0.015 + 0.003) * (Math.random() > 0.5 ? 1 : -1)
            const offsetLng = (Math.random() * 0.015 + 0.003) * (Math.random() > 0.5 ? 1 : -1)
            await supabase.from('responders').update({
              location_lat: latitude + offsetLat,
              location_lng: longitude + offsetLng,
            } as any).eq('id', r.id)
          }
          fetchResponders()
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  useEffect(() => { fetchSessions(); fetchResponders() }, [])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('dispatch-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalated_sessions' }, () => fetchSessions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responders' }, () => fetchResponders())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchSessions])

  // WebRTC call hook
  const call = useCall({
    sessionId: selected?.id || '',
    role: 'dispatch',
    onCallConnected: () => {
      // Add a system message
      if (selected) {
        fetch('/api/escalation', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: selected.id, message: '📞 Dispatch connected — live verification call in progress' }),
        }).then(() => fetchSessions())
      }
    },
    onCallEnded: () => {},
  })

  // Start a call to the selected session
  const handleStartCall = async () => {
    if (!selected) return
    call.startCall()
  }

  // Auto-scroll messages
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [selected?.messages])

  // Send message
  const sendMessage = async () => {
    if (!selected || !msg.trim()) return
    const text = msg.trim()
    setMsg('')
    await fetch('/api/escalation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: selected.id, message: text }),
    })
    fetchSessions()
  }

  // Dispatch responder WITH notes
  const assignResponder = async (type: 'medical' | 'police' | 'fire', notes: string) => {
    if (!selected) return
    const loc = selected.location

    if (loc?.lat && loc?.lng) {
      const res = await fetch('/api/auto-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selected.id, type, severity: selected.severity,
          lat: loc.lat, lng: loc.lng, dispatchNotes: notes,
        }),
      })
      const data = await res.json()
      const dispatchMsg = data.dispatched?.length
        ? `${data.dispatched[0].name} (${data.dispatched[0].unit}) dispatched — ETA ${data.dispatched[0].eta} min${notes ? '\nNotes: ' + notes : ''}`
        : `${type.toUpperCase()} dispatched${notes ? '\nNotes: ' + notes : ''}`
      await fetch('/api/escalation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selected.id, message: dispatchMsg }),
      })
    } else {
      const units: Record<string, any> = {
        medical: { name: 'Ambulance Unit 3', unit: 'EMS-3' },
        police: { name: 'Patrol Unit 7', unit: 'POL-7' },
        fire: { name: 'Engine 5', unit: 'FIRE-5' },
      }
      await fetch('/api/escalation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selected.id, status: 'assigned',
          assignedResponder: { id: type, name: units[type].name, role: type, unit: units[type].unit },
          message: `${units[type].name} dispatched${notes ? '\nNotes: ' + notes : ''}`,
        }),
      })

      // Store notes on incident for the department dashboard
      if (notes) {
        await supabase.from('incidents')
          .update({ tactical_advice: notes } as any)
          .eq('reported_by', selected.id)
      }
    }
    fetchSessions()
    fetchResponders()
  }

  // Resolve session
  const resolveSession = async () => {
    if (!selected) return
    await fetch('/api/escalation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: selected.id, status: 'resolved', message: 'Session resolved by dispatch' }),
    })
    await supabase.from('incidents').update({ status: 'resolved' } as any).eq('reported_by', selected.id)
    if (selected.assignedResponder?.id) {
      await supabase.from('responders').update({ status: 'available', current_incident_id: null } as any).eq('id', selected.assignedResponder.id)
    }
    setSelected(null)
    fetchSessions()
    fetchResponders()
  }

  // QA Report
  const generateQA = async () => {
    if (!selected) return
    setQaLoading(true)
    try {
      const res = await fetch('/api/qa-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selected.id }),
      })
      const data = await res.json()
      setQaReport(data.report)
      setShowQA(true)
      fetchSessions()
    } catch (e) { console.error(e) }
    setQaLoading(false)
  }

  // Map markers — only show selected incident + its assigned responder
  const mapMarkers = useMemo(() => {
    const m: any[] = []
    if (!selected) return m

    // Show the selected incident's caller location
    if (selected.location?.lat && selected.location?.lng) {
      m.push({
        position: [selected.location.lat, selected.location.lng] as [number, number],
        popup: `<b>📍 ${selected.summary || 'Emergency'}</b><br/><span style="color:#dc2626;font-weight:600">${selected.severity}</span> • ${selected.type}<br/><em style="color:#6366f1">Live Location</em>`,
        type: 'user-live' as const,
      })
    }

    // Show only the assigned responder for this incident (if any)
    if (selected.assignedResponder) {
      const resp = responders.find(r => r.id === selected.assignedResponder?.id || r.name === selected.assignedResponder?.name)
      if (resp?.location_lat && resp?.location_lng) {
        const dist = selected.location?.lat && selected.location?.lng
          ? haversineDistance(Number(resp.location_lat), Number(resp.location_lng), selected.location.lat, selected.location.lng)
          : 0
        const distInfo = dist > 0
          ? `<br/><span style="color:#6366f1;font-size:11px">📏 ${formatDistance(dist)} • ~${estimateETA(dist)} min ETA</span>`
          : ''
        m.push({
          position: [Number(resp.location_lat), Number(resp.location_lng)] as [number, number],
          popup: `<b>${resp.name}</b><br/>${resp.unit_id} • <span style="color:${resp.status === 'available' ? '#16a34a' : '#dc2626'}">${resp.status}</span>${distInfo}`,
          type: 'responder' as const,
        })
      }
    }
    return m
  }, [selected, responders])

  // Build routes: line from assigned responder to selected session only
  const mapRoutes = useMemo(() => {
    const lines: { from: [number, number]; to: [number, number]; color: string; label: string }[] = []
    if (!selected?.location?.lat || !selected?.location?.lng || !selected?.assignedResponder) return lines
    const resp = responders.find(r => r.id === selected.assignedResponder?.id || r.name === selected.assignedResponder?.name)
    if (resp?.location_lat && resp?.location_lng) {
      const typeColors: Record<string, string> = { medical: '#e11d48', fire: '#ea580c', police: '#2563eb', rescue: '#7c3aed' }
      lines.push({
        from: [Number(resp.location_lat), Number(resp.location_lng)],
        to: [selected.location.lat, selected.location.lng],
        color: typeColors[resp.role] || '#6366f1',
        label: `${resp.name}`,
      })
    }
    return lines
  }, [selected, responders])

  const criticalCount = sessions.filter(s => s.severity === 'CRITICAL').length
  const availableUnits = responders.filter(r => r.status === 'available').length

  const sevBadge = (s: string) => s === 'CRITICAL' ? 'text-red-600 bg-red-50 border-red-200' : s === 'HIGH' ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-amber-600 bg-amber-50 border-amber-200'
  const statusBadge = (s: string) => s === 'resolved' ? 'text-emerald-600 bg-emerald-50' : s === 'assigned' ? 'text-blue-600 bg-blue-50' : s === 'connected' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return 'Just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    return `${Math.floor(s / 3600)}h ago`
  }

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 text-slate-900 flex flex-col">
      {/* Dispatch Modal */}
      {dispatchModal && selected && (
        <DispatchModal
          type={dispatchModal}
          session={selected}
          onClose={() => setDispatchModal(null)}
          onDispatch={assignResponder}
        />
      )}

      {/* Header */}
      <header className="h-14 border-b border-slate-200/60 flex items-center justify-between px-3 sm:px-5 flex-shrink-0 bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Radio className="h-4 w-4 text-red-600" />
              </div>
              {sessions.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white" />}
            </div>
            <span className="text-sm font-bold tracking-tight">Dispatch Command</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full border border-red-200 animate-pulse font-semibold">
              <Zap className="h-3 w-3" /> {criticalCount}
            </span>
          )}
          <Link href="/dashboard/spam" className="hidden sm:flex items-center gap-1 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-2.5 py-1.5 rounded-full border border-slate-200 hover:border-red-200 transition-colors font-medium">
            <Shield className="h-3 w-3" /> Spam
          </Link>
          <span className="text-slate-500 font-medium">{sessions.length} active</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-emerald-600 font-medium hidden sm:inline">{availableUnits} ready</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Session List */}
        <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200/60 flex flex-col flex-shrink-0 bg-white/50 max-h-36 md:max-h-none">
          <div className="p-3 border-b border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold px-1">Escalated Incidents</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-300 mb-2" />
                <p className="text-xs font-semibold text-slate-500">All clear</p>
                <p className="text-[10px] text-slate-400">No active emergencies</p>
              </div>
            ) : sessions.map(s => {
              const Icon = typeIcons[s.type] || AlertTriangle
              const active = selected?.id === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s); setShowQA(false); setQaReport(s.qaReport || null) }}
                  className={`w-full p-3 text-left border-b border-slate-100 transition-all ${active ? 'bg-indigo-50/70 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${typeColors[s.type] || 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold truncate text-slate-800">{s.summary || 'Emergency'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] px-1.5 py-px rounded-full border font-semibold ${sevBadge(s.severity)}`}>{s.severity}</span>
                        <span className={`text-[9px] px-1.5 py-px rounded-full font-medium ${statusBadge(s.status)}`}>{s.status}</span>
                        {(s as any).spamVerdict && (s as any).spamVerdict.classification !== 'genuine' && (
                          <span className={`text-[9px] px-1.5 py-px rounded-full font-semibold ${
                            (s as any).spamVerdict.classification === 'confirmed_spam' ? 'bg-red-100 text-red-700 border border-red-200' :
                            (s as any).spamVerdict.classification === 'likely_spam' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                            'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}>
                            ⚠ {(s as any).spamVerdict.trustScore}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(s.escalatedAt)}
                        {s.location?.address && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="truncate">{s.location.address.split(',')[0]}</span>
                          </>
                        )}
                      </div>
                      {s.citizenName && (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-indigo-600 font-medium">
                          <Users className="h-2.5 w-2.5" />
                          {s.citizenName}
                          {s.citizenPhone && <span className="text-slate-400">· {s.citizenPhone}</span>}
                        </div>
                      )}
                      {s.assignedResponder && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                          <UserCheck className="h-2.5 w-2.5" />
                          {s.assignedResponder.name}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Session Header */}
              <div className="px-3 sm:px-5 py-3.5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between flex-shrink-0 bg-white/60 backdrop-blur-sm gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-sm font-bold text-slate-900">{selected.summary || 'Emergency'}</h2>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${sevBadge(selected.severity)}`}>{selected.severity}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusBadge(selected.status)}`}>{selected.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="font-mono text-slate-300">{selected.id}</span>
                    <span>·</span>
                    <Clock className="h-2.5 w-2.5" />
                    <span>{timeAgo(selected.escalatedAt)}</span>
                    {selected.location?.address && (
                      <>
                        <span>·</span>
                        <MapPin className="h-2.5 w-2.5 text-indigo-500" />
                        <span className="text-indigo-500 font-medium">{selected.location.address.split(',').slice(0, 2).join(',')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {/* Connect / Call button */}
                  {selected.status !== 'resolved' && call.status === 'idle' && (
                    <button onClick={handleStartCall}
                      className="px-3 py-1.5 text-[11px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg transition-all hover:from-emerald-600 hover:to-teal-600 flex items-center gap-1.5 shadow-md shadow-emerald-200 font-semibold animate-pulse">
                      <Phone className="h-3 w-3" />
                      Connect
                    </button>
                  )}
                  {(call.status === 'calling' || call.status === 'ringing') && (
                    <button onClick={() => call.endCall()}
                      className="px-3 py-1.5 text-[11px] bg-amber-50 border border-amber-200 text-amber-700 rounded-lg transition-all flex items-center gap-1.5 shadow-sm font-semibold">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Calling...
                    </button>
                  )}
                  {call.status === 'connected' && (
                    <>
                      <div className="px-3 py-1.5 text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2 shadow-sm font-semibold">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <PhoneCall className="h-3 w-3" />
                        {call.formattedDuration}
                      </div>
                      <button onClick={call.toggleMute}
                        className={`px-2 py-1.5 text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-sm font-medium border ${
                          call.isMuted ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>
                        {call.isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      </button>
                      <button onClick={() => call.endCall()}
                        className="px-2.5 py-1.5 text-[11px] bg-red-500 text-white rounded-lg transition-all hover:bg-red-600 flex items-center gap-1 shadow-sm font-semibold">
                        <PhoneOff className="h-3 w-3" />
                        End
                      </button>
                    </>
                  )}

                  <div className="w-px h-6 bg-slate-200" />

                  {(['medical', 'police', 'fire'] as const).map(type => {
                    const icons = { medical: Heart, police: Shield, fire: Flame }
                    const labels = { medical: 'EMS', police: 'Police', fire: 'Fire' }
                    const colors = { medical: 'hover:bg-rose-50 hover:border-rose-200', police: 'hover:bg-blue-50 hover:border-blue-200', fire: 'hover:bg-orange-50 hover:border-orange-200' }
                    const IconC = icons[type]
                    return (
                      <button key={type} onClick={() => setDispatchModal(type)}
                        className={`px-2.5 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg transition-all flex items-center gap-1.5 shadow-sm font-medium ${colors[type]}`}>
                        <IconC className={`h-3 w-3 ${typeColors[type] || ''}`} />
                        {labels[type]}
                      </button>
                    )
                  })}
                  <button onClick={generateQA} disabled={qaLoading}
                    className="px-2.5 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg transition-all hover:bg-slate-50 flex items-center gap-1.5 shadow-sm font-medium">
                    {qaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3 text-slate-400" />}
                    QA
                  </button>
                  {selected.status !== 'resolved' && (
                    <button onClick={resolveSession}
                      className="px-2.5 py-1.5 text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg transition-all hover:bg-emerald-100 flex items-center gap-1.5 shadow-sm font-semibold">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Live Call Banner */}
              {call.status === 'connected' && (
                <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center gap-3 flex-shrink-0 shadow-sm">
                  <div className="relative">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                      <PhoneCall className="h-5 w-5 text-white" />
                    </div>
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-800">Live Verification Call</p>
                    <p className="text-[10px] text-emerald-600">Connected to caller — {call.formattedDuration}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={call.toggleMute}
                      className={`p-2 rounded-lg transition-all ${
                        call.isMuted ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}>
                      {call.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button onClick={() => call.endCall()}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-sm">
                      <PhoneOff className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Citizen Info Banner */}
              {(selected.citizenName || selected.citizenPhone) && (
                <div className="mx-4 mt-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-xs flex-shrink-0 shadow-sm">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-indigo-900">{selected.citizenName || 'Unknown Caller'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-indigo-600">
                      {selected.citizenPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {selected.citizenPhone}
                        </span>
                      )}
                      {selected.citizenId && (
                        <span className="text-indigo-400">ID: {selected.citizenId.slice(0, 20)}...</span>
                      )}
                    </div>
                  </div>
                  {selected.citizenId && (
                    <span className="text-[9px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 font-semibold">Registered</span>
                  )}
                </div>
              )}

              {/* Quick Summary */}
              <QuickSummary session={selected} />

              {/* Assigned Responder Banner */}
              {selected.assignedResponder && (
                <div className="mx-4 mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs flex-shrink-0 shadow-sm">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-800 font-semibold">{selected.assignedResponder.name}</span>
                  <span className="text-emerald-500 text-[10px]">({selected.assignedResponder.unit})</span>
                  <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-semibold">
                    <Activity className="h-2.5 w-2.5" /> En Route
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Transcript + Map */}
                <div className="flex-1 flex flex-col border-r border-slate-200/60">
                  {/* Map */}
                  {(selected.location?.lat || mapMarkers.length > 0) && (
                    <div className="h-52 border-b border-slate-200/60 flex-shrink-0 relative">
                      <MapComponent
                        center={selected.location?.lat && selected.location?.lng ? [selected.location.lat, selected.location.lng] : undefined}
                        zoom={14}
                        markers={mapMarkers}
                        routes={mapRoutes}
                        light={true}
                        selectedIncident={selected.location?.lat && selected.location?.lng ? [selected.location.lat, selected.location.lng] : null}
                      />
                      {mapRoutes.length > 0 && (
                        <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm border border-indigo-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                          <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 font-semibold">
                            <Activity className="h-3 w-3" />
                            {mapRoutes.length} unit{mapRoutes.length > 1 ? 's' : ''} en route
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
                    {selected.messages?.map((m: any) => {
                      const isSystem = m.role === 'system'
                      const isUser = m.role === 'user'
                      const isDispatch = m.role === 'dispatch'

                      if (isSystem) {
                        return (
                          <div key={m.id} className="flex justify-center">
                            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                              {m.content}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-xl px-3 py-2 shadow-sm ${
                            isUser ? 'bg-indigo-500 text-white' :
                            isDispatch ? 'bg-emerald-50 border border-emerald-200' :
                            'bg-white border border-slate-200'
                          }`}>
                            <p className={`text-[9px] mb-0.5 font-semibold ${
                              isUser ? 'text-indigo-200' : isDispatch ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                              {isUser ? 'Caller' : isDispatch ? 'You (Dispatch)' : 'AI Assistant'}
                            </p>
                            <p className={`text-xs leading-relaxed whitespace-pre-line ${
                              isUser ? 'text-white' : 'text-slate-700'
                            }`}>{m.content}</p>
                            <p className={`text-[9px] mt-1 ${isUser ? 'text-indigo-300' : 'text-slate-300'}`}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={msgEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-slate-200/60 flex gap-2 flex-shrink-0 bg-white">
                    <input
                      value={msg}
                      onChange={e => setMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Message to caller..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all"
                    />
                    <button onClick={sendMessage} disabled={!msg.trim()} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right Panel: Steps + QA + Snapshot */}
                <div className="hidden lg:flex w-64 flex-col flex-shrink-0 bg-white/50">
                  <div className="p-3 border-b border-slate-200/60 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> AI-Generated Steps
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                    {/* QA Report */}
                    {showQA && qaReport && (
                      <div className="mb-2 p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold flex items-center gap-1 text-slate-700"><FileText className="h-3 w-3 text-slate-400" /> QA Report</span>
                          <button onClick={() => setShowQA(false)} className="hover:bg-slate-100 p-0.5 rounded"><X className="h-3 w-3 text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          {[
                            { label: 'Score', value: `${qaReport.responseScore}/100`, color: (qaReport.responseScore || 0) >= 80 ? 'text-emerald-600' : 'text-amber-600' },
                            { label: 'Quality', value: qaReport.responseQuality, color: 'text-slate-800' },
                            { label: 'Empathy', value: `${qaReport.aiPerformance?.empathy}/10`, color: 'text-slate-800' },
                            { label: 'Accuracy', value: `${qaReport.aiPerformance?.accuracy}/10`, color: 'text-slate-800' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="bg-slate-50 rounded-lg p-1.5">
                              <span className="text-slate-400 text-[9px] font-medium">{label}</span>
                              <p className={`font-bold ${color}`}>{value}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{qaReport.summary}</p>
                        {qaReport.recommendations?.length > 0 && (
                          <div className="text-[10px]">
                            <span className="text-slate-500 font-semibold">Recommendations:</span>
                            <ul className="list-disc pl-3 mt-0.5 space-y-0.5 text-slate-400">
                              {qaReport.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Steps */}
                    {selected.steps?.length > 0 ? (
                      selected.steps.map((step: any, i: number) => (
                        <div key={step.id || i} className={`p-2 rounded-lg text-[11px] transition-all ${step.completed ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-200 shadow-sm'}`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-bold mt-px ${
                              step.completed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {step.completed ? '✓' : i + 1}
                            </div>
                            <span className={step.completed ? 'text-emerald-500 line-through' : 'text-slate-700'}>{step.text}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 text-center py-6">No steps generated yet</p>
                    )}
                  </div>

                  {/* Patient Health Card — show if citizen ID available, or try session ID */}
                  {(selected.citizenId || selected.id) && (
                    <div className="p-2.5 border-t border-slate-200/60">
                      <PatientHealthCard citizenId={selected.citizenId || selected.id} className="" />
                    </div>
                  )}

                  {/* Camera Snapshot */}
                  {selected.imageSnapshot && (
                    <div className="p-2.5 border-t border-slate-200/60">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-semibold">
                        <Eye className="h-2.5 w-2.5" /> Scene Capture
                      </div>
                      <img src={selected.imageSnapshot} alt="Scene" className="w-full rounded-lg border border-slate-200 shadow-sm" />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Radio className="h-8 w-8 text-indigo-300" />
                </div>
                <p className="text-sm text-slate-600 font-semibold">Dispatch Command Center</p>
                <p className="text-xs text-slate-400 mt-1">Escalated emergencies will appear on the left</p>
                <p className="text-[10px] text-slate-300 mt-3">{responders.length} responders registered — {availableUnits} available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DispatchDashboard() {
  return <AuthGuard><DispatchContent /></AuthGuard>
}
