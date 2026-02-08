'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Shield, AlertTriangle, MapPin, Loader2, UserCheck, Clock, Navigation, X, Radio, RotateCcw, Route } from 'lucide-react'
import { AuthGuard } from '@/components/auth-guard'
import { supabase } from '@/lib/supabase'
import { haversineDistance, formatDistance, estimateETA } from '@/lib/utils'
import { ResponderNavigation } from '@/components/responder-navigation'

const MapComponent = dynamic(() => import('@/components/map').then(m => ({ default: m.Map })), { ssr: false })

function PoliceContent() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [responders, setResponders] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignModal, setAssignModal] = useState<string | null>(null)
  const [showNavigation, setShowNavigation] = useState(false)

  const load = async () => {
    const [{ data: resp }] = await Promise.all([
      supabase.from('responders').select('*').eq('role', 'police'),
    ])
    setResponders(resp || [])

    // Get incidents by type match
    const { data: byType } = await supabase.from('incidents').select('*').in('type', ['safety', 'accident', 'other']).neq('status', 'resolved').order('created_at', { ascending: false })

    // Also get incidents assigned to police responders (dispatched from dispatch team)
    const responderIds = (resp || []).filter(r => r.current_incident_id).map(r => r.current_incident_id as string)
    let byAssignment: any[] = []
    if (responderIds.length > 0) {
      const { data: assigned } = await supabase.from('incidents').select('*').in('id', responderIds).neq('status', 'resolved')
      byAssignment = assigned || []
    }

    // Merge and deduplicate
    const allInc = [...(byType || [])]
    for (const inc of byAssignment) {
      if (!allInc.find(i => i.id === inc.id)) allInc.push(inc)
    }
    allInc.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setIncidents(allInc)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('police-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responders' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_assignments' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Update responder locations to real browser geolocation on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const { data: polResp } = await supabase.from('responders').select('id').eq('role', 'police')
        if (polResp) {
          for (const r of polResp) {
            const offsetLat = (Math.random() * 0.015 + 0.003) * (Math.random() > 0.5 ? 1 : -1)
            const offsetLng = (Math.random() * 0.015 + 0.003) * (Math.random() > 0.5 ? 1 : -1)
            await supabase.from('responders').update({
              location_lat: latitude + offsetLat,
              location_lng: longitude + offsetLng,
            } as any).eq('id', r.id)
          }
          load()
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  const available = responders.filter(r => r.status === 'available').length
  const active = incidents.filter(i => i.status === 'active').length

  const sevClass = (s: string) =>
    s === 'CRITICAL' ? 'text-red-600 bg-red-50 border border-red-200' :
    s === 'HIGH' ? 'text-orange-600 bg-orange-50 border border-orange-200' :
    'text-amber-600 bg-amber-50 border border-amber-200'

  const markers = [
    ...incidents.filter(i => i.location_lat && i.location_lng).map(i => ({
      position: [Number(i.location_lat), Number(i.location_lng)] as [number, number],
      popup: `<b>📍 ${i.summary || 'Incident'}</b><br/><span style="color:#dc2626;font-weight:600">${i.severity}</span> · ${i.type}<br/><em style="color:#6366f1">Live Location</em>`,
      type: 'user-live' as const
    })),
    ...responders.filter(r => r.location_lat && r.location_lng).map(r => {
      let distInfo = ''
      if (r.current_incident_id) {
        const inc = incidents.find(i => i.id === r.current_incident_id)
        if (inc?.location_lat && inc?.location_lng) {
          const dist = haversineDistance(Number(r.location_lat), Number(r.location_lng), Number(inc.location_lat), Number(inc.location_lng))
          distInfo = `<br/><span style="color:#6366f1;font-size:11px">📏 ${formatDistance(dist)} · ~${estimateETA(dist)} min ETA</span>`
        }
      }
      return {
        position: [Number(r.location_lat), Number(r.location_lng)] as [number, number],
        popup: `<b>${r.name}</b><br/>${r.unit_id} · <span style="color:${r.status === 'available' ? '#16a34a' : '#dc2626'}">${r.status}</span>${distInfo}`,
        type: 'responder' as const
      }
    })
  ]

  // Build routes: lines from busy responders to their assigned incidents
  const routes = responders
    .filter(r => r.status === 'busy' && r.location_lat && r.location_lng && r.current_incident_id)
    .map(r => {
      const inc = incidents.find(i => i.id === r.current_incident_id)
      if (!inc || !inc.location_lat || !inc.location_lng) return null
      const dist = haversineDistance(Number(r.location_lat), Number(r.location_lng), Number(inc.location_lat), Number(inc.location_lng))
      return {
        from: [Number(r.location_lat), Number(r.location_lng)] as [number, number],
        to: [Number(inc.location_lat), Number(inc.location_lng)] as [number, number],
        color: '#2563eb',
        label: `${r.name}`,
      }
    }).filter(Boolean) as { from: [number, number]; to: [number, number]; color: string; label: string }[]

  const selectedPosition: [number, number] | null = selected?.location_lat && selected?.location_lng
    ? [Number(selected.location_lat), Number(selected.location_lng)]
    : null

  const handleAssign = async (incidentId: string, responderId: string) => {
    const inc = incidents.find(i => i.id === incidentId)
    const locUpdate: any = { status: 'busy', current_incident_id: incidentId }
    if (inc?.location_lat && inc?.location_lng) {
      const offsetLat = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
      const offsetLng = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
      locUpdate.location_lat = Number(inc.location_lat) + offsetLat
      locUpdate.location_lng = Number(inc.location_lng) + offsetLng
    }
    await Promise.all([
      (supabase.from('incidents') as any).update({ status: 'assigned' }).eq('id', incidentId),
      (supabase.from('responders') as any).update(locUpdate).eq('id', responderId),
    ])
    setAssignModal(null)
    load()
  }

  const resetUnits = async () => {
    await (supabase.from('responders') as any)
      .update({ status: 'available', current_incident_id: null })
      .eq('role', 'police')
    load()
  }

  const handleResolve = async (id: string) => {
    await (supabase.from('incidents') as any).update({ status: 'resolved' }).eq('id', id)
    // Free up any assigned responders
    await (supabase.from('responders') as any).update({ status: 'available', current_incident_id: null }).eq('current_incident_id', id)
    setSelected(null)
    load()
  }

  const availableResponders = responders.filter(r => r.status === 'available')
  const busyResponders = responders.filter(r => r.status === 'busy')

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900 flex flex-col">
      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setAssignModal(null)}>
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-blue-100 bg-blue-50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Assign Responder</h3>
                </div>
                <button onClick={() => setAssignModal(null)} className="p-1 hover:bg-white/50 rounded-lg"><X className="h-4 w-4 text-slate-500" /></button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Select a unit to dispatch to this incident</p>
            </div>
            <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
              {availableResponders.length === 0 ? (
                <div className="text-center py-6">
                  <Radio className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No units available</p>
                  <p className="text-[10px] text-slate-300">All units are currently assigned</p>
                </div>
              ) : availableResponders.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleAssign(assignModal, r.id)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center gap-3 group"
                >
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-semibold text-slate-800">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.unit_id} · <span className="text-emerald-500 font-medium">Available</span></p>
                  </div>
                  <UserCheck className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
              {busyResponders.length > 0 && (
                <>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold pt-2 px-1">Currently Assigned</p>
                  {busyResponders.map(r => (
                    <div key={r.id} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 opacity-60">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-500">{r.name}</p>
                        <p className="text-[10px] text-slate-400">{r.unit_id} · <span className="text-red-400 font-medium">Busy</span></p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="h-14 border-b border-slate-200/60 flex items-center justify-between px-3 sm:px-5 flex-shrink-0 bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft className="h-4 w-4 text-slate-500" /></Link>
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-bold">Police Command</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500">
          <span className="font-medium hidden sm:inline">{active} active</span>
          <span className="text-emerald-600 font-medium">{available}/{responders.length} ready</span>
          {busyResponders.length > 0 && (
            <button onClick={resetUnits} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 font-medium">
              <RotateCcw className="h-3 w-3" /> Reset Units
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200/60 flex flex-col flex-shrink-0 bg-white/50 max-h-48 md:max-h-none overflow-hidden">
          <div className="grid grid-cols-2 gap-2 p-3 border-b border-slate-100">
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <p className="text-xl font-bold text-blue-600">{active}</p>
              <p className="text-[9px] text-blue-400 uppercase tracking-wider font-semibold">Active</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-xl font-bold text-emerald-600">{available}</p>
              <p className="text-[9px] text-emerald-400 uppercase tracking-wider font-semibold">Ready</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 text-slate-400 animate-spin" /></div>
            ) : incidents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No active incidents</p>
            ) : incidents.map(inc => (
              <button
                key={inc.id}
                onClick={() => setSelected(inc)}
                className={`w-full p-3 text-left border-b border-slate-100 transition-colors ${selected?.id === inc.id ? 'bg-blue-50/70 border-l-2 border-l-blue-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`h-3 w-3 ${inc.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'}`} />
                  <span className="text-xs font-semibold truncate flex-1 text-slate-800">{inc.summary || 'Incident'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${sevClass(inc.severity)}`}>{inc.severity}</span>
                  <span className="text-[9px] text-slate-400 font-medium">{inc.type}</span>
                </div>
                {inc.location_address && (
                  <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 truncate"><MapPin className="h-2.5 w-2.5 flex-shrink-0 text-indigo-400" />{inc.location_address.split(',')[0]}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          <div className="h-48 sm:h-72 border-b border-slate-200/60 relative">
            <MapComponent markers={markers} routes={routes} zoom={12} light={true} selectedIncident={selectedPosition} />
            {routes.length > 0 && (
              <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm border border-blue-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-[9px] text-blue-600 font-semibold">
                  <Navigation className="h-3 w-3" />
                  {routes.length} unit{routes.length > 1 ? 's' : ''} en route
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50/50">
            {selected ? (
              <div className="space-y-4 max-w-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{selected.summary || 'Incident'}</h2>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${sevClass(selected.severity)}`}>{selected.severity}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">{selected.status}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">{selected.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {selected.location_lat && selected.location_lng && (
                      <button onClick={() => setShowNavigation(!showNavigation)} className={`text-[10px] px-3 py-1.5 rounded-lg transition-colors font-semibold border shadow-sm ${showNavigation ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'}`}>
                        <Route className="h-3 w-3 inline mr-1" />Navigate
                      </button>
                    )}
                    {(selected.status === 'active' || selected.status === 'assigned') && (
                      <button onClick={() => setAssignModal(selected.id)} className="text-[10px] px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold border border-blue-200 shadow-sm">
                        <UserCheck className="h-3 w-3 inline mr-1" />Assign
                      </button>
                    )}
                    <button onClick={() => handleResolve(selected.id)} className="text-[10px] px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors font-semibold border border-emerald-200 shadow-sm">
                      Resolve
                    </button>
                  </div>
                </div>

                {selected.description && <p className="text-xs text-slate-500 leading-relaxed">{selected.description}</p>}

                {/* Citizen Info */}
                {(selected.citizen_name || selected.citizen_phone) && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 shadow-sm">
                    <p className="text-[10px] text-indigo-700 font-semibold mb-1 uppercase tracking-wider">Caller Info</p>
                    <div className="flex items-center gap-3 text-xs">
                      {selected.citizen_name && <span className="font-semibold text-indigo-900">{selected.citizen_name}</span>}
                      {selected.citizen_phone && <span className="text-indigo-600">{selected.citizen_phone}</span>}
                    </div>
                  </div>
                )}

                {selected.tactical_advice && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
                    <p className="text-[10px] text-amber-700 font-semibold mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="h-3 w-3" /> Dispatch Notes
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-line">{selected.tactical_advice}</p>
                  </div>
                )}

                {selected.location_address && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="font-medium">{selected.location_address}</span>
                    <span className="ml-auto text-[9px] text-indigo-400 font-semibold">LIVE</span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                  </div>
                )}

                {showNavigation && selected.location_lat && selected.location_lng && (
                  <ResponderNavigation
                    incidentLocation={{
                      lat: Number(selected.location_lat),
                      lng: Number(selected.location_lng),
                      address: selected.location_address || undefined,
                    }}
                    onClose={() => setShowNavigation(false)}
                  />
                )}

                {selected.risks?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Risks</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.risks.map((r: string, i: number) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-200 font-medium">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.steps?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Response Protocol</p>
                    <ol className="space-y-1.5">
                      {selected.steps.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {selected.created_at && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(selected.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-blue-100">
                    <Shield className="h-6 w-6 text-blue-300" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Select an incident</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PoliceDashboard() {
  return <AuthGuard><PoliceContent /></AuthGuard>
}
