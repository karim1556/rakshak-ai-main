import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate distance between two lat/lng coordinates using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Format distance as a human-readable string (e.g. "2.3 km", "450 m")
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${Math.round(km * 10) / 10} km`
}

/**
 * Estimate ETA in minutes based on distance in km.
 * Uses ~40 km/h average emergency vehicle speed.
 */
export function estimateETA(km: number): number {
  return Math.max(1, Math.round((km / 40) * 60))
}
