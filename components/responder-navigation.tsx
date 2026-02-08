'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Navigation, MapPin, Clock, ArrowUp, ArrowLeft, ArrowRight, 
  CornerDownLeft, CornerDownRight, CornerUpLeft, CornerUpRight,
  RotateCcw, MoveUp, AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Volume2, Loader2, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DirectionStep {
  instruction: string
  distance: string
  duration: string
  maneuver?: string
  startLocation: { lat: number; lng: number }
  endLocation: { lat: number; lng: number }
}

interface NavigationProps {
  incidentLocation: { lat: number; lng: number; address?: string }
  onClose?: () => void
  className?: string
}

const MANEUVER_ICONS: Record<string, any> = {
  'turn-left': ArrowLeft,
  'turn-right': ArrowRight,
  'turn-sharp-left': CornerDownLeft,
  'turn-sharp-right': CornerDownRight,
  'turn-slight-left': CornerUpLeft,
  'turn-slight-right': CornerUpRight,
  'uturn-left': RotateCcw,
  'uturn-right': RotateCcw,
  'straight': ArrowUp,
  'merge': MoveUp,
  'fork': ArrowUp,
  'depart': Navigation,
  'arrive': CheckCircle,
  'roundabout': RotateCcw,
  'continue': ArrowUp,
  'turn': ArrowRight,
}

export function ResponderNavigation({ incidentLocation, onClose, className = '' }: NavigationProps) {
  const [steps, setSteps] = useState<DirectionStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [totalDistance, setTotalDistance] = useState('')
  const [totalDuration, setTotalDuration] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [navigating, setNavigating] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  // Get user location and fetch directions
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not available')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        await fetchDirections(loc, incidentLocation)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError('Could not get your location. Enable GPS.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [incidentLocation.lat, incidentLocation.lng])

  const fetchDirections = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, mode: 'driving' }),
      })

      if (!response.ok) throw new Error('Failed to get directions')

      const data = await response.json()
      setSteps(data.steps || [])
      setTotalDistance(data.distance)
      setTotalDuration(data.duration)
      setCurrentStepIndex(0)
    } catch (err) {
      console.error('Directions error:', err)
      setError('Could not load directions')
    } finally {
      setLoading(false)
    }
  }

  // Start live navigation with GPS tracking
  const startNavigation = useCallback(() => {
    setNavigating(true)
    setCurrentStepIndex(0)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)

        // Auto-advance steps when close to next turn
        if (steps.length > 0 && currentStepIndex < steps.length - 1) {
          const nextStep = steps[currentStepIndex + 1]
          if (nextStep?.startLocation) {
            const dist = getDistanceKm(loc, nextStep.startLocation)
            if (dist < 0.05) { // Within 50 meters
              setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1))
            }
          }
        }
      },
      (err) => console.error('GPS watch error:', err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    )
  }, [steps, currentStepIndex])

  const stopNavigation = useCallback(() => {
    setNavigating(false)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Open in native maps app
  const openExternalNav = () => {
    const dest = `${incidentLocation.lat},${incidentLocation.lng}`
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : ''
    
    // Detect platform and open appropriate maps app
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    if (isIOS) {
      window.open(`maps://maps.apple.com/?saddr=${origin}&daddr=${dest}&dirflg=d`, '_blank')
    } else {
      window.open(`https://www.google.com/maps/dir/${origin}/${dest}/@${dest},14z/data=!4m2!4m1!3e0`, '_blank')
    }
  }

  const getManeuverIcon = (maneuver?: string) => {
    if (!maneuver) return ArrowUp
    return MANEUVER_ICONS[maneuver] || ArrowUp
  }

  const currentStep = steps[currentStepIndex]
  const nextStep = currentStepIndex + 1 < steps.length ? steps[currentStepIndex + 1] : null

  if (loading) {
    return (
      <Card className={`border-blue-800 bg-blue-950/80 backdrop-blur ${className}`}>
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
          <span className="text-blue-300">Calculating route...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`border-red-800 bg-red-950/80 backdrop-blur ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-red-300">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={openExternalNav}
                className="text-red-400 hover:text-red-300 mt-2 px-0"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Open in Maps App Instead
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-blue-800 bg-gradient-to-b from-blue-950/90 to-slate-900/90 backdrop-blur overflow-hidden ${className}`}>
      {/* Top Bar: Distance & ETA */}
      <div className="bg-blue-900/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-400" />
            <span className="text-lg font-bold text-white">{totalDistance}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span className="text-lg font-bold text-emerald-400">{totalDuration}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={openExternalNav}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            <MapPin className="h-3.5 w-3.5 mr-1" />
            Maps App
          </Button>
          {onClose && (
            <Button onClick={onClose} size="sm" variant="ghost" className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Current Step - Big Display */}
      {currentStep && (
        <div className="px-4 py-5 border-b border-blue-800/50">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              {(() => {
                const Icon = getManeuverIcon(currentStep.maneuver)
                return <Icon className="h-7 w-7 text-white" />
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-lg font-semibold leading-tight">
                {currentStep.instruction}
              </p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="text-blue-300">{currentStep.distance}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{currentStep.duration}</span>
              </div>
            </div>
          </div>

          {/* Next Step Preview */}
          {nextStep && (
            <div className="mt-3 ml-[4.5rem] flex items-center gap-2 text-sm text-slate-400">
              <span className="text-xs">Then:</span>
              {(() => {
                const NextIcon = getManeuverIcon(nextStep.maneuver)
                return <NextIcon className="h-3.5 w-3.5" />
              })()}
              <span className="truncate">{nextStep.instruction}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Controls */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
            disabled={currentStepIndex === 0}
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-white disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <Button
            onClick={() => setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))}
            disabled={currentStepIndex >= steps.length - 1}
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-white disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {!navigating ? (
            <Button 
              onClick={startNavigation} 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Navigation className="h-4 w-4 mr-1" />
              Start Navigation
            </Button>
          ) : (
            <Button 
              onClick={stopNavigation} 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Stop
            </Button>
          )}
          <Button
            onClick={() => setExpanded(!expanded)}
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            {expanded ? 'Hide All' : 'Show All'}
          </Button>
        </div>
      </div>

      {/* All Steps List (Expandable) */}
      {expanded && (
        <div className="border-t border-blue-800/50 max-h-64 overflow-y-auto">
          {steps.map((step, idx) => {
            const StepIcon = getManeuverIcon(step.maneuver)
            const isCurrent = idx === currentStepIndex
            const isPast = idx < currentStepIndex
            
            return (
              <div
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors border-b border-slate-800/40 ${
                  isCurrent
                    ? 'bg-blue-900/40'
                    : isPast
                    ? 'bg-slate-900/30 opacity-50'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCurrent ? 'bg-blue-600' : isPast ? 'bg-slate-700' : 'bg-slate-800'
                }`}>
                  {isPast ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <StepIcon className={`h-4 w-4 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isCurrent ? 'text-white font-medium' : isPast ? 'text-slate-500' : 'text-slate-300'}`}>
                    {step.instruction}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.distance} · {step.duration}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Destination */}
      {incidentLocation.address && (
        <div className="px-4 py-3 bg-slate-900/50 border-t border-blue-800/50">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-red-400" />
            <span className="truncate">{incidentLocation.address}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

// Haversine distance helper
function getDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const aa = sinDLat * sinDLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
}
