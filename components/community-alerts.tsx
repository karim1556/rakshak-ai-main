'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle, Shield, Info, X, MapPin,
  Bell, BellOff, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CommunityAlert {
  id: string
  alert_type: string
  title: string
  message: string
  severity: string
  radius_km: number
  center_lat: number | null
  center_lng: number | null
  active: boolean
  created_at: string
  incidents?: {
    type: string
    severity: string
    summary: string
    status: string
  }
}

export function CommunityAlerts() {
  const [alerts, setAlerts] = useState<CommunityAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Silently fail if location denied
      )
    }
  }, [])

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const params = new URLSearchParams()
      if (userLocation) {
        params.set('lat', String(userLocation.lat))
        params.set('lng', String(userLocation.lng))
      }
      try {
        const res = await fetch(`/api/community-alerts?${params}`)
        const data = await res.json()
        setAlerts(data.alerts || [])
      } catch (err) {
        console.error('Failed to fetch community alerts:', err)
      }
    }

    fetchAlerts()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('community-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_alerts' }, () => {
        fetchAlerts()
      })
      .subscribe()

    // Poll every 2 minutes
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userLocation])

  const activeAlerts = alerts.filter(a => !dismissed.has(a.id))

  if (activeAlerts.length === 0) return null

  const criticalAlerts = activeAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH')
  const otherAlerts = activeAlerts.filter(a => a.severity !== 'CRITICAL' && a.severity !== 'HIGH')

  const getAlertStyle = (alert: CommunityAlert) => {
    const styles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      evacuation: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' },
      warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: 'text-orange-500' },
      shelter_in_place: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' },
      advisory: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' },
      all_clear: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-500' },
    }
    return styles[alert.alert_type] || styles.advisory
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'evacuation':
      case 'warning':
        return AlertTriangle
      case 'shelter_in_place':
        return Shield
      case 'all_clear':
        return Info
      default:
        return Bell
    }
  }

  return (
    <div className="space-y-2">
      {/* Critical alerts always shown */}
      {criticalAlerts.map(alert => {
        const style = getAlertStyle(alert)
        const Icon = getAlertIcon(alert.alert_type)
        return (
          <div key={alert.id} className={`${style.bg} ${style.border} border rounded-xl p-3 relative`}>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(alert.id))}
              className="absolute top-2 right-2 p-1 hover:bg-white/50 rounded"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
            <div className="flex items-start gap-2 pr-6">
              <Icon className={`w-5 h-5 ${style.icon} shrink-0 mt-0.5`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${style.text}`}>{alert.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/60 rounded-full font-semibold uppercase">
                    {alert.alert_type.replace('_', ' ')}
                  </span>
                </div>
                <p className={`text-xs ${style.text} opacity-80 mt-0.5`}>{alert.message}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] opacity-60">
                  <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                  {alert.radius_km && (
                    <>
                      <span>·</span>
                      <MapPin className="w-3 h-3" />
                      <span>{alert.radius_km}km radius</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Non-critical alerts collapsible */}
      {otherAlerts.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            {otherAlerts.length} safety advisory{otherAlerts.length > 1 ? 'ies' : ''} in your area
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
      
      {expanded && otherAlerts.map(alert => {
        const style = getAlertStyle(alert)
        const Icon = getAlertIcon(alert.alert_type)
        return (
          <div key={alert.id} className={`${style.bg} ${style.border} border rounded-lg p-2.5 text-xs`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${style.icon}`} />
              <span className={`font-semibold ${style.text}`}>{alert.title}</span>
            </div>
            <p className={`${style.text} opacity-70 mt-0.5 ml-6`}>{alert.message}</p>
          </div>
        )
      })}
    </div>
  )
}
