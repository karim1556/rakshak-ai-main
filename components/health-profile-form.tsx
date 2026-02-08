'use client'

import { useState, useEffect } from 'react'
import {
  Heart, Pill, AlertTriangle, Droplets, User, Save,
  Plus, X, Loader2, CheckCircle, Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface HealthProfileFormProps {
  citizenId: string
  onSave?: () => void
  className?: string
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function HealthProfileForm({ citizenId, onSave, className = '' }: HealthProfileFormProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [bloodType, setBloodType] = useState<string>('')
  const [allergies, setAllergies] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [emergencyNotes, setEmergencyNotes] = useState('')
  const [organDonor, setOrganDonor] = useState(false)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [primaryPhysician, setPrimaryPhysician] = useState('')
  const [physicianPhone, setPhysicianPhone] = useState('')
  const [insuranceInfo, setInsuranceInfo] = useState('')

  // Temp inputs for array fields
  const [newAllergy, setNewAllergy] = useState('')
  const [newMedication, setNewMedication] = useState('')
  const [newCondition, setNewCondition] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [citizenId])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/health-profile?citizenId=${encodeURIComponent(citizenId)}`)
      const data = await response.json()
      
      if (data.profile) {
        const p = data.profile
        setFullName(p.full_name || '')
        setDateOfBirth(p.date_of_birth || '')
        setBloodType(p.blood_type || '')
        setAllergies(p.allergies || [])
        setMedications(p.medications || [])
        setConditions(p.conditions || [])
        setEmergencyNotes(p.emergency_notes || '')
        setOrganDonor(p.organ_donor || false)
        setHeight(p.height_cm?.toString() || '')
        setWeight(p.weight_kg?.toString() || '')
        setPrimaryPhysician(p.primary_physician || '')
        setPhysicianPhone(p.physician_phone || '')
        setInsuranceInfo(p.insurance_info || '')
      }
    } catch (error) {
      console.error('Error fetching health profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const response = await fetch('/api/health-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId,
          fullName,
          dateOfBirth: dateOfBirth || null,
          bloodType: bloodType || null,
          allergies,
          medications,
          conditions,
          emergencyNotes,
          organDonor,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          primaryPhysician: primaryPhysician || null,
          physicianPhone: physicianPhone || null,
          insuranceInfo: insuranceInfo || null,
        }),
      })

      if (response.ok) {
        setSaved(true)
        onSave?.()
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving health profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const addToList = (list: string[], setList: (v: string[]) => void, value: string, setValue: (v: string) => void) => {
    if (value.trim() && !list.includes(value.trim())) {
      setList([...list, value.trim()])
      setValue('')
    }
  }

  const removeFromList = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          <span className="text-slate-600">Loading health profile...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-slate-200 shadow-lg ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Medical Health Profile</CardTitle>
            <p className="text-sm text-slate-500">
              This info will be auto-shared with medical responders during emergencies
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name</label>
            <Input 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Date of Birth</label>
            <Input 
              type="date" 
              value={dateOfBirth} 
              onChange={(e) => setDateOfBirth(e.target.value)} 
            />
          </div>
        </div>

        {/* Blood Type */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-red-500" />
            Blood Type
          </label>
          <div className="flex flex-wrap gap-2">
            {BLOOD_TYPES.map((bt) => (
              <button
                key={bt}
                onClick={() => setBloodType(bloodType === bt ? '' : bt)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  bloodType === bt
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {bt}
              </button>
            ))}
          </div>
        </div>

        {/* Body Measurements */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Height (cm)</label>
            <Input 
              type="number" 
              value={height} 
              onChange={(e) => setHeight(e.target.value)} 
              placeholder="170"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Weight (kg)</label>
            <Input 
              type="number" 
              value={weight} 
              onChange={(e) => setWeight(e.target.value)} 
              placeholder="70"
            />
          </div>
        </div>

        {/* Allergies */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Allergies
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addToList(allergies, setAllergies, newAllergy, setNewAllergy)}
              placeholder="e.g., Penicillin, Peanuts, Latex"
            />
            <Button 
              onClick={() => addToList(allergies, setAllergies, newAllergy, setNewAllergy)}
              size="icon" 
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allergies.map((allergy, i) => (
              <Badge key={i} className="bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                {allergy}
                <button onClick={() => removeFromList(allergies, setAllergies, i)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Pill className="h-4 w-4 text-blue-500" />
            Current Medications
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addToList(medications, setMedications, newMedication, setNewMedication)}
              placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
            />
            <Button 
              onClick={() => addToList(medications, setMedications, newMedication, setNewMedication)}
              size="icon" 
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {medications.map((med, i) => (
              <Badge key={i} className="bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                {med}
                <button onClick={() => removeFromList(medications, setMedications, i)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Medical Conditions */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            Medical Conditions
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addToList(conditions, setConditions, newCondition, setNewCondition)}
              placeholder="e.g., Diabetes Type 2, Asthma, Hypertension"
            />
            <Button 
              onClick={() => addToList(conditions, setConditions, newCondition, setNewCondition)}
              size="icon" 
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {conditions.map((cond, i) => (
              <Badge key={i} className="bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                {cond}
                <button onClick={() => removeFromList(conditions, setConditions, i)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Emergency Notes */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Emergency Notes</label>
          <Textarea
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
            placeholder="Any critical info for first responders (e.g., 'Do not give aspirin', 'Has pacemaker', 'Epileptic — may have seizures')"
            rows={3}
          />
        </div>

        {/* Physician Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Primary Physician</label>
            <Input 
              value={primaryPhysician} 
              onChange={(e) => setPrimaryPhysician(e.target.value)} 
              placeholder="Dr. Name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Physician Phone</label>
            <Input 
              value={physicianPhone} 
              onChange={(e) => setPhysicianPhone(e.target.value)} 
              placeholder="+91-XXXXXXXXXX"
            />
          </div>
        </div>

        {/* Insurance */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Insurance Info</label>
          <Input 
            value={insuranceInfo} 
            onChange={(e) => setInsuranceInfo(e.target.value)} 
            placeholder="Insurance provider / policy number"
          />
        </div>

        {/* Organ Donor */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={organDonor}
            onChange={(e) => setOrganDonor(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700">I am a registered organ donor</span>
        </label>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-base font-semibold"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Saved Successfully
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Health Profile
            </>
          )}
        </Button>

        <p className="text-xs text-slate-400 text-center">
          Your health data is encrypted and only shared with medical responders when you report an emergency
        </p>
      </CardContent>
    </Card>
  )
}
