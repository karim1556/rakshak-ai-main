'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Phone, MapPin, Clock, Activity, Navigation, Heart, Pill, Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResponderNavigation } from '@/components/responder-navigation'
import { PatientHealthCard } from '@/components/patient-health-card'

import { supabase } from '@/lib/supabase'

export default function MedicalResponderPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [activeIncident, setActiveIncident] = useState<any>(null)
  const [status, setStatus] = useState('en-route')
  const [showNavigation, setShowNavigation] = useState(false)
  const [activeTab, setActiveTab] = useState('incident')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadIncidents = async () => {
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .in('type', ['medical', 'accident'])
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(10)

      const mapped = (data || []).map(inc => ({
        id: inc.id,
        type: inc.summary || inc.type || 'Medical Emergency',
        severity: inc.severity,
        location: inc.location_address || 'Unknown location',
        locationCoords: inc.location_lat ? { 
          lat: Number(inc.location_lat), 
          lng: Number(inc.location_lng), 
          address: inc.location_address 
        } : undefined,
        description: inc.description || '',
        distance: '—',
        eta: '—',
        status: inc.status,
        time: new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        notes: inc.tactical_advice || '',
        citizenId: inc.citizen_identifier || inc.reported_by || '',
        citizenName: inc.citizen_name || null,
        citizenPhone: inc.citizen_phone || null,
      }))

      setIncidents(mapped)
      if (mapped.length > 0 && !activeIncident) setActiveIncident(mapped[0])
      setLoading(false)
    }

    loadIncidents()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('medical-responder-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => loadIncidents())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white'
      case 'HIGH':
        return 'bg-orange-600 text-white'
      case 'MEDIUM':
        return 'bg-yellow-600 text-white'
      default:
        return 'bg-green-600 text-white'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-600/20 text-blue-400'
      case 'Pending':
        return 'bg-yellow-600/20 text-yellow-400'
      case 'On Scene':
        return 'bg-green-600/20 text-green-400'
      default:
        return 'bg-slate-600/20 text-slate-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-blue-900 bg-blue-950/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-blue-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Medical Responder Dashboard</h1>
              <p className="text-blue-400 text-sm">Unit 12 - Active Dispatch</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {activeIncident && (
              <Badge className={`${getSeverityColor(activeIncident.severity)} text-lg px-4 py-2`}>
                {activeIncident.severity}
              </Badge>
            )}
            <Button className="bg-red-600 hover:bg-red-700">End Shift</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading && (
          <div className="text-center py-12"><p className="text-blue-400 text-lg">Loading incidents...</p></div>
        )}
        {!loading && incidents.length === 0 && (
          <div className="text-center py-12"><p className="text-slate-400 text-lg">No active medical incidents</p></div>
        )}
        {!loading && activeIncident && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Incident Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Citizen Info Banner */}
            {(activeIncident.citizenName || activeIncident.citizenPhone) && (
              <div className="rounded-lg border border-blue-800 bg-blue-900/40 p-4 flex items-center gap-4">
                <Heart className="h-5 w-5 text-pink-400" />
                <div>
                  <p className="text-white font-semibold">{activeIncident.citizenName || 'Unknown Citizen'}</p>
                  {activeIncident.citizenPhone && <p className="text-blue-300 text-sm">{activeIncident.citizenPhone}</p>}
                </div>
              </div>
            )}
            {/* Active Incident Card */}
            <Card className="border-blue-900 bg-blue-900/30 backdrop-blur">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-2xl">{activeIncident.type}</CardTitle>
                    <CardDescription className="text-blue-300">{activeIncident.description}</CardDescription>
                  </div>
                  <Badge className={getSeverityColor(activeIncident.severity)}>
                    {activeIncident.severity}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Location & Distance */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex gap-3 items-start">
                    <MapPin className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-300">Location</p>
                      <p className="text-white font-semibold">{activeIncident.location}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Clock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-300">Reported</p>
                      <p className="text-white font-semibold">{activeIncident.time}</p>
                    </div>
                  </div>
                </div>

                {/* Distance & ETA */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">Distance</p>
                    <p className="text-2xl font-bold text-blue-400">{activeIncident.distance}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">ETA</p>
                    <p className="text-2xl font-bold text-green-400">{activeIncident.eta}</p>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-2">Important Notes</p>
                  <p className="text-white">{activeIncident.notes}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base">
                    <Phone className="mr-2 h-5 w-5" />
                    Call Dispatch
                  </Button>
                  <Button 
                    onClick={() => setShowNavigation(!showNavigation)}
                    className={`flex-1 h-12 text-base ${showNavigation ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    <Navigation className="mr-2 h-5 w-5" />
                    {showNavigation ? 'Hide Navigation' : 'Navigate'}
                  </Button>
                  <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800 bg-transparent">
                    Report Arrived
                  </Button>
                </div>

                {/* Turn-by-Turn Navigation Panel */}
                {showNavigation && (
                  <ResponderNavigation 
                    incidentLocation={activeIncident.locationCoords}
                    onClose={() => setShowNavigation(false)}
                  />
                )}

                {/* Patient Health Profile */}
                <PatientHealthCard citizenId={activeIncident.citizenId} />

                {/* Status Selector */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-300">Current Status</p>
                  <div className="flex gap-2">
                    {['en-route', 'on-scene', 'transporting'].map((s) => (
                      <Button
                        key={s}
                        onClick={() => setStatus(s)}
                        variant={status === s ? 'default' : 'outline'}
                        className={status === s ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-white hover:bg-slate-800'}
                      >
                        {s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Incident List */}
            <Card className="border-blue-900 bg-blue-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">All Active Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <div
                      key={incident.id}
                      onClick={() => setActiveIncident(incident)}
                      className={`p-4 rounded-lg cursor-pointer transition ${
                        activeIncident.id === incident.id
                          ? 'bg-blue-700 border-2 border-blue-500'
                          : 'bg-slate-800 border-2 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white">{incident.type}</h3>
                        <Badge className={getStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                      </div>
                      <p className="text-slate-300 text-sm mb-2">{incident.location}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{incident.distance} away</span>
                        <span>{incident.eta} ETA</span>
                        <span>{incident.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border-blue-900 bg-blue-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-lg">Shift Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-blue-800">
                  <span className="text-slate-400">Active Incidents</span>
                  <span className="text-2xl font-bold text-white">{incidents.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-800">
                  <span className="text-slate-400">Calls Today</span>
                  <span className="text-2xl font-bold text-white">12</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Avg Response</span>
                  <span className="text-2xl font-bold text-white">4m 30s</span>
                </div>
              </CardContent>
            </Card>

            {/* Team Communication */}
            <Card className="border-blue-900 bg-blue-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-lg">Team Communication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Phone className="mr-2 h-4 w-4" />
                  Open Voice Channel
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-800 bg-transparent">
                  View Team Status
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-800 bg-transparent">
                  Message Dispatch
                </Button>
              </CardContent>
            </Card>

            {/* Protocol Quick Access */}
            <Card className="border-blue-900 bg-blue-900/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-lg">Protocols</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-blue-400 hover:text-blue-300">
                  CPR Guidelines
                </Button>
                <Button variant="ghost" className="w-full justify-start text-blue-400 hover:text-blue-300">
                  Trauma Protocol
                </Button>
                <Button variant="ghost" className="w-full justify-start text-blue-400 hover:text-blue-300">
                  Medication Reference
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
