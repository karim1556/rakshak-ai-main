'use client'

import { useState, useEffect } from 'react'
import { 
  Heart, Pill, AlertTriangle, Droplets, User, Activity,
  Shield, FileText, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface HealthProfile {
  id: string
  citizen_identifier: string
  full_name: string
  date_of_birth: string | null
  blood_type: string | null
  allergies: string[]
  medications: string[]
  conditions: string[]
  emergency_notes: string
  organ_donor: boolean
  height_cm: number | null
  weight_kg: number | null
  primary_physician: string | null
  physician_phone: string | null
  insurance_info: string | null
}

interface PatientHealthCardProps {
  citizenId: string
  className?: string
}

const BLOOD_TYPE_COLORS: Record<string, string> = {
  'A+': 'bg-red-600',
  'A-': 'bg-red-500',
  'B+': 'bg-blue-600',
  'B-': 'bg-blue-500',
  'AB+': 'bg-purple-600',
  'AB-': 'bg-purple-500',
  'O+': 'bg-emerald-600',
  'O-': 'bg-emerald-500',
}

export function PatientHealthCard({ citizenId, className = '' }: PatientHealthCardProps) {
  const [profile, setProfile] = useState<HealthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [noProfile, setNoProfile] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [citizenId])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/health-profile?citizenId=${encodeURIComponent(citizenId)}`)
      const data = await response.json()
      
      if (data.profile) {
        setProfile(data.profile)
        setNoProfile(false)
      } else {
        setProfile(null)
        setNoProfile(true)
      }
    } catch (error) {
      console.error('Error fetching health profile:', error)
      setNoProfile(true)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <Card className={`border-blue-800 bg-blue-950/50 ${className}`}>
        <CardContent className="p-4 flex items-center gap-2 text-blue-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading patient health data...</span>
        </CardContent>
      </Card>
    )
  }

  if (noProfile) {
    return (
      <Card className={`border-slate-700 bg-slate-800/50 ${className}`}>
        <CardContent className="p-4 flex items-center gap-2 text-slate-400">
          <FileText className="h-4 w-4" />
          <span className="text-sm">No health profile available for this patient</span>
        </CardContent>
      </Card>
    )
  }

  if (!profile) return null

  const hasAllergies = profile.allergies.length > 0
  const hasMedications = profile.medications.length > 0
  const hasConditions = profile.conditions.length > 0

  return (
    <Card className={`border-red-800/50 bg-gradient-to-b from-red-950/40 to-slate-900/80 overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="px-4 py-3 bg-red-900/30 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              Patient Medical History
              {hasAllergies && (
                <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">
                  ALLERGIES
                </Badge>
              )}
            </h3>
            <p className="text-red-300 text-xs">{profile.full_name || 'Patient'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.blood_type && (
            <Badge className={`${BLOOD_TYPE_COLORS[profile.blood_type] || 'bg-red-600'} text-white font-bold`}>
              {profile.blood_type}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {/* Quick Critical Info — Always Visible */}
      <div className="px-4 py-3 border-b border-red-800/30">
        <div className="grid grid-cols-3 gap-3">
          {profile.blood_type && (
            <div className="text-center">
              <Droplets className="h-4 w-4 text-red-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Blood Type</p>
              <p className="text-lg font-bold text-white">{profile.blood_type}</p>
            </div>
          )}
          {profile.date_of_birth && (
            <div className="text-center">
              <User className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Age</p>
              <p className="text-lg font-bold text-white">{calculateAge(profile.date_of_birth)} yrs</p>
            </div>
          )}
          {(profile.weight_kg || profile.height_cm) && (
            <div className="text-center">
              <Activity className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Body</p>
              <p className="text-sm font-bold text-white">
                {profile.height_cm ? `${profile.height_cm}cm` : ''}
                {profile.height_cm && profile.weight_kg ? ' / ' : ''}
                {profile.weight_kg ? `${profile.weight_kg}kg` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Allergies — Critical, always visible if present */}
      {hasAllergies && (
        <div className="px-4 py-3 bg-red-900/20 border-b border-red-800/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Allergies</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.allergies.map((allergy, i) => (
              <Badge key={i} className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">
                {allergy}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <>
          {/* Current Medications */}
          {hasMedications && (
            <div className="px-4 py-3 border-b border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Current Medications</span>
              </div>
              <div className="space-y-1">
                {profile.medications.map((med, i) => (
                  <div key={i} className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="w-1 h-1 bg-blue-400 rounded-full flex-shrink-0" />
                    {med}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Conditions */}
          {hasConditions && (
            <div className="px-4 py-3 border-b border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Medical Conditions</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.conditions.map((cond, i) => (
                  <Badge key={i} className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
                    {cond}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Notes */}
          {profile.emergency_notes && (
            <div className="px-4 py-3 border-b border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Emergency Notes</span>
              </div>
              <p className="text-sm text-slate-300">{profile.emergency_notes}</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="px-4 py-3 space-y-2 text-xs">
            {profile.primary_physician && (
              <div className="flex justify-between text-slate-400">
                <span>Primary Physician</span>
                <span className="text-slate-300">{profile.primary_physician}</span>
              </div>
            )}
            {profile.physician_phone && (
              <div className="flex justify-between text-slate-400">
                <span>Physician Phone</span>
                <a href={`tel:${profile.physician_phone}`} className="text-blue-400 hover:underline">
                  {profile.physician_phone}
                </a>
              </div>
            )}
            {profile.organ_donor && (
              <div className="flex justify-between text-slate-400">
                <span>Organ Donor</span>
                <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">YES</Badge>
              </div>
            )}
            {profile.insurance_info && (
              <div className="flex justify-between text-slate-400">
                <span>Insurance</span>
                <span className="text-slate-300">{profile.insurance_info}</span>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
