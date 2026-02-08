'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export default function CitizenPage() {
  const [emergencyType, setEmergencyType] = useState('medical')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const emergencyTypes = [
    { value: 'medical', label: 'Medical Emergency', color: 'bg-red-500' },
    { value: 'accident', label: 'Traffic Accident', color: 'bg-orange-500' },
    { value: 'crime', label: 'Crime/Violence', color: 'bg-purple-500' },
    { value: 'fire', label: 'Fire', color: 'bg-red-600' },
    { value: 'natural', label: 'Natural Disaster', color: 'bg-yellow-500' },
    { value: 'other', label: 'Other', color: 'bg-slate-500' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/analyze-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyType,
          description,
          location,
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({
        error: 'Failed to analyze emergency. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (result && !result.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Header */}
        <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto flex items-center gap-4 px-4 py-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">Emergency Report Analysis</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Analysis Result */}
            <div className="space-y-4">
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-white">AI Analysis Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">Severity Level</h3>
                    <div className={`rounded px-4 py-2 text-white font-bold text-center ${
                      result.severity === 'CRITICAL' ? 'bg-red-600' :
                      result.severity === 'HIGH' ? 'bg-orange-600' :
                      result.severity === 'MEDIUM' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}>
                      {result.severity}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">Incident Type</h3>
                    <p className="text-white">{result.incidentType}</p>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">Recommended Response</h3>
                    <p className="text-slate-300">{result.recommendedResponse}</p>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">Responders Needed</h3>
                    <div className="space-y-1">
                      {result.respondersNeeded.map((responder: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-300">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          {responder}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">Estimated Response Time</h3>
                    <p className="text-white">{result.estimatedResponseTime}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Incident Details */}
            <div>
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-white">Incident Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">Type</h3>
                    <p className="text-white">{emergencyType.toUpperCase()}</p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">Location</h3>
                    <p className="text-white">{location}</p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">Description</h3>
                    <p className="text-slate-300">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button
              onClick={() => setResult(null)}
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800"
            >
              Report Another Emergency
            </Button>
            <Button className="bg-red-600 hover:bg-red-700">
              Confirm & Dispatch Responders
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Report Emergency</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl">
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <CardTitle className="text-white">Emergency Report Form</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Provide accurate information to help us respond quickly and effectively
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Emergency Type */}
                <div className="space-y-3">
                  <Label className="text-white text-base font-semibold">
                    What type of emergency is this?
                  </Label>
                  <RadioGroup value={emergencyType} onValueChange={setEmergencyType}>
                    <div className="grid gap-3 md:grid-cols-2">
                      {emergencyTypes.map((type) => (
                        <div key={type.value} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={type.value}
                            id={type.value}
                            className="border-slate-500"
                          />
                          <Label
                            htmlFor={type.value}
                            className="cursor-pointer text-slate-300 hover:text-white"
                          >
                            {type.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white font-semibold">
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="Enter the address or location of the emergency"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-400"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white font-semibold">
                    Describe the Emergency
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about the emergency. Include any relevant details that could help responders..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-400 min-h-32"
                    required
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading || !description || !location}
                  className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing Emergency...
                    </>
                  ) : (
                    'Analyze & Report Emergency'
                  )}
                </Button>

                {result?.error && (
                  <div className="rounded-lg bg-red-500/20 border border-red-500 p-4 text-red-400">
                    {result.error}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-600">
            <p className="font-semibold mb-1">In life-threatening situations:</p>
            <p>If you cannot use this app, call emergency services directly at your local emergency number.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
