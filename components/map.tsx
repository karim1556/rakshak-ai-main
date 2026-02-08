'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface RouteData {
  from: [number, number]
  to: [number, number]
  color?: string
  label?: string
}

interface MapComponentProps {
  center?: [number, number]
  zoom?: number
  markers?: Array<{
    position: [number, number]
    popup?: string
    type?: 'incident' | 'responder' | 'user-live'
  }>
  routes?: RouteData[]
  className?: string
  light?: boolean
  fitBounds?: boolean
  selectedIncident?: [number, number] | null
}

// Shared geolocation cache so we only request once across all map instances
let _geoCache: [number, number] | null = null
let _geoRequested = false

function useCurrentLocation(): [number, number] | null {
  const [loc, setLoc] = useState<[number, number] | null>(_geoCache)

  useEffect(() => {
    if (_geoCache) { setLoc(_geoCache); return }
    if (_geoRequested) return
    _geoRequested = true

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          _geoCache = coords
          setLoc(coords)
        },
        () => { /* geolocation denied/unavailable — leave null, map will use fallback */ },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      )
    }
  }, [])

  return loc
}

// Fallback center (world view) when geolocation is unavailable
const FALLBACK_CENTER: [number, number] = [20, 0]
const FALLBACK_ZOOM = 2

export function MapComponent({ 
  center,
  zoom = 13,
  markers = [],
  routes = [],
  className = '',
  light = true,
  fitBounds = true,
  selectedIncident,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const currentLocation = useCurrentLocation()

  // Resolve the effective center: explicit prop > browser geolocation > fallback
  const effectiveCenter = center || currentLocation || FALLBACK_CENTER
  const effectiveZoom = center ? zoom : currentLocation ? zoom : FALLBACK_ZOOM

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(effectiveCenter, effectiveZoom)

    const tileUrl = light
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current)

    // Fix map rendering in flex containers
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize()
    }, 100)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // When geolocation resolves after initial render, re-center the map
  // (only if no explicit center prop and no markers to fitBounds to)
  useEffect(() => {
    if (!mapInstanceRef.current || center || (fitBounds && markers.length > 0)) return
    if (currentLocation) {
      mapInstanceRef.current.setView(currentLocation, zoom, { animate: true })
    }
  }, [currentLocation, center, fitBounds, markers.length, zoom])

  // Handle resize / visibility changes
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize()
    })
    if (mapRef.current) observer.observe(mapRef.current)
    return () => observer.disconnect()
  }, [])

  // Draw markers and routes
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    // Clear existing markers and overlays (keep tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer)
      }
    })

    // --- Markers ---
    markers.forEach(({ position, popup, type }) => {
      let html = ''

      if (type === 'user-live') {
        html = `
          <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.18);animation:livePulse 2s ease-out infinite;"></div>
            <div style="position:absolute;inset:4px;border-radius:50%;background:rgba(239,68,68,0.12);animation:livePulse 2s ease-out infinite;animation-delay:0.5s;"></div>
            <div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.5);position:relative;z-index:2;"></div>
          </div>
        `
      } else if (type === 'incident') {
        html = `
          <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.15);animation:livePulse 3s ease-out infinite;"></div>
            <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;box-shadow:0 2px 10px rgba(239,68,68,0.4);background:linear-gradient(135deg,#ef4444,#dc2626);">!</div>
          </div>
        `
      } else {
        // Responder marker — green with ambulance/shield icon
        html = `
          <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,0.12);animation:livePulse 3s ease-out infinite;"></div>
            <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;box-shadow:0 2px 10px rgba(34,197,94,0.4);background:linear-gradient(135deg,#22c55e,#16a34a);border:2px solid white;">R</div>
          </div>
        `
      }

      const icon = L.divIcon({
        className: 'custom-marker',
        html,
        iconSize: type === 'user-live' ? [40, 40] : [36, 36],
        iconAnchor: type === 'user-live' ? [20, 20] : [18, 18],
      })

      const marker = L.marker(position, { icon }).addTo(map)
      if (popup) marker.bindPopup(popup, {
        className: 'custom-popup',
        maxWidth: 220,
      })
    })

    // --- Routes (polylines from responder to incident) ---
    routes.forEach(({ from, to, color = '#6366f1', label }) => {
      // Calculate actual distance in km using Haversine
      const R = 6371
      const dLat = ((to[0] - from[0]) * Math.PI) / 180
      const dLng = ((to[1] - from[1]) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((from[0] * Math.PI) / 180) * Math.cos((to[0] * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      // Skip routes that are too close (<100m) or unrealistically far (>100km)
      if (distKm < 0.1 || distKm > 100) return

      // Build distance label
      const distLabel = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${Math.round(distKm * 10) / 10} km`
      const eta = Math.max(1, Math.round((distKm / 40) * 60))
      const routeLabel = label ? `${label} · ${distLabel} · ~${eta} min` : `${distLabel} · ~${eta} min`

      // Animated dashed line
      const polyline = L.polyline([from, to], {
        color,
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      // Add a midpoint label with distance & ETA
      if (routeLabel) {
        const midLat = (from[0] + to[0]) / 2
        const midLng = (from[1] + to[1]) / 2
        const labelIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${color};color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.15);border:2px solid white;">${routeLabel}</div>`,
          iconSize: [120, 20],
          iconAnchor: [60, 10],
        })
        L.marker([midLat, midLng], { icon: labelIcon, interactive: false }).addTo(map)
      }

      // Small direction arrow at the midpoint (only if no label was shown)
      if (!routeLabel) {
        const midLat2 = (from[0] + to[0]) / 2
        const midLng2 = (from[1] + to[1]) / 2
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) * (180 / Math.PI)
        const arrowIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="transform:rotate(${-angle + 90}deg);color:${color};font-size:16px;font-weight:900;text-shadow:0 1px 3px rgba(0,0,0,0.15);">▲</div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
        L.marker([midLat2, midLng2], { icon: arrowIcon, interactive: false }).addTo(map)
      }
    })

    // --- Auto-fit bounds ---
    if (fitBounds && markers.length > 0) {
      const allPoints: [number, number][] = markers.map(m => m.position)
      // Include route endpoints for visible routes
      routes.forEach(r => {
        const R2 = 6371
        const dLat2 = ((r.to[0] - r.from[0]) * Math.PI) / 180
        const dLng2 = ((r.to[1] - r.from[1]) * Math.PI) / 180
        const a2 =
          Math.sin(dLat2 / 2) ** 2 +
          Math.cos((r.from[0] * Math.PI) / 180) * Math.cos((r.to[0] * Math.PI) / 180) *
          Math.sin(dLng2 / 2) ** 2
        const dKm = R2 * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2))
        if (dKm >= 0.1 && dKm <= 100) {
          allPoints.push(r.from, r.to)
        }
      })

      if (allPoints.length >= 2) {
        const bounds = L.latLngBounds(allPoints.map(p => L.latLng(p[0], p[1])))
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true })
      } else if (selectedIncident) {
        map.setView(selectedIncident, 14, { animate: true })
      } else if (allPoints.length === 1) {
        map.setView(allPoints[0], 14, { animate: true })
      }
    }
  }, [markers, routes, selectedIncident, fitBounds, zoom])

  // Center change when not fitting bounds
  useEffect(() => {
    if (mapInstanceRef.current && !fitBounds) {
      mapInstanceRef.current.setView(effectiveCenter, effectiveZoom)
    }
  }, [effectiveCenter, effectiveZoom, fitBounds])

  return (
    <div 
      ref={mapRef} 
      className={`w-full h-full overflow-hidden ${className}`}
      style={{ zIndex: 0, minHeight: '200px' }}
    />
  )
}

export function Map(props: MapComponentProps) {
  return <MapComponent {...props} />
}
