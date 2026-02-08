'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Phone, MapPin, Clock, User, AlertCircle, Users, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

export default function IncidentDetailsPage({ params }: { params: { id: string } }) {
  const [notes, setNotes] = useState('')

  // Mock incident data - in a real app, fetch this based on params.id
  const incident = {
    id: params.id,
    type: 'Medical Emergency',
    severity: 'CRITICAL',
    status: 'Active',
    location: '1234 Main St, Downtown',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    description: 'Person collapsed, unconscious, not breathing',
    reportedBy: 'John Doe',
    reportedAt: '2024-02-07 14:23:45',
    age: 'Unknown',
    gender: 'Unknown',
    consciousness: 'Unconscious',
    breathing: 'Not breathing',
    bystanders: 'Yes - performing CPR',
    respondersAssigned: [
      { id: 1, name: 'Unit 12', type: 'Paramedics', status: 'En Route', eta: '2 min' },
      { id: 2, name: 'Unit 7', type: 'Police', status: 'En Route', eta: '3 min' },
    ],
    timeline: [
      { time: '14:23:45', event: 'Emergency reported', type: 'report' },
      { time: '14:24:10', event: 'AI analysis completed', type: 'analysis' },
      { time: '14:24:20', event: 'Medical unit assigned', type: 'dispatch' },
      { time: '14:24:25', event: 'Police unit assigned', type: 'dispatch' },
    ],
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dispatch">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Incident Details</h1>
              <p className="text-slate-400 text-sm">Case #{incident.id}</p>
            </div>
          </div>
          <Badge className={`${getSeverityColor(incident.severity)} text-lg px-4 py-2`}>
            {incident.severity} - {incident.status}
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Summary */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  {incident.type}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Details Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex gap-3 items-start">
                    <MapPin className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-400">Location</p>
                      <p className="text-white font-semibold">{incident.location}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {incident.coordinates.lat.toFixed(4)}, {incident.coordinates.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Clock className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-400">Reported At</p>
                      <p className="text-white font-semibold">{incident.reportedAt}</p>
                      <p className="text-slate-400 text-xs mt-1">(3 minutes ago)</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Incident Description</h3>
                  <p className="text-white bg-slate-700/50 rounded p-3">{incident.description}</p>
                </div>

                {/* Patient Information */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Patient Information</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">Age</p>
                      <p className="text-white font-semibold">{incident.age}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Gender</p>
                      <p className="text-white font-semibold">{incident.gender}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Consciousness</p>
                      <p className="text-white font-semibold">{incident.consciousness}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Breathing</p>
                      <p className="text-white font-semibold">{incident.breathing}</p>
                    </div>
                  </div>
                </div>

                {/* Scene Information */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Scene Information</h3>
                  <p className="text-white">
                    <span className="text-slate-400">Bystanders: </span>
                    {incident.bystanders}
                  </p>
                </div>

                {/* Responder Information */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300">Assigned Responders</h3>
                  {incident.respondersAssigned.map((responder) => (
                    <div key={responder.id} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-semibold">{responder.name}</h4>
                          <p className="text-sm text-slate-400">{responder.type}</p>
                        </div>
                        <Badge variant="outline" className="border-green-500 text-green-400">
                          {responder.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-300">
                        <span>ETA: {responder.eta}</span>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dispatch Notes */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Dispatch Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add notes for responders and other agencies..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-400 min-h-24"
                />
                <Button className="bg-blue-600 hover:bg-blue-700">Save Notes</Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Reporter Information */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Reporter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-white font-semibold">{incident.reportedBy}</p>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Phone className="mr-2 h-4 w-4" />
                  Call Reporter
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
                  Assign Additional Unit
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
                  Change Priority
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent">
                  Request Support
                </Button>
                <Button variant="destructive" className="w-full">
                  Close Incident
                </Button>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incident.timeline.map((entry, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        {idx !== incident.timeline.length - 1 && (
                          <div className="h-8 w-0.5 bg-slate-700 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-xs text-slate-400">{entry.time}</p>
                        <p className="text-sm text-white">{entry.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-lg">Nearby Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Medical Units</span>
                  <span className="text-white font-semibold">2 available</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Police Units</span>
                  <span className="text-white font-semibold">1 available</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Fire Dept</span>
                  <span className="text-white font-semibold">0 available</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
