'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Heart, Phone, Mail, MapPin, Shield,
  Save, Loader2, CheckCircle, Plus, X, Droplets, Pill,
  AlertTriangle, UserPlus, Calendar, Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function RegisterPage() {
  const router = useRouter()
  const [citizenId, setCitizenId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [step, setStep] = useState(1) // 1 = personal, 2 = health

  // Personal info
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')

  // Health info
  const [bloodType, setBloodType] = useState('')
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

  // Temp inputs
  const [newAllergy, setNewAllergy] = useState('')
  const [newMedication, setNewMedication] = useState('')
  const [newCondition, setNewCondition] = useState('')

  useEffect(() => {
    let id = localStorage.getItem('rakshak-citizen-id')
    if (!id) {
      id = `citizen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('rakshak-citizen-id', id)
    }
    setCitizenId(id)
    fetchProfile(id)
  }, [])

  const fetchProfile = async (id: string) => {
    try {
      const res = await fetch(`/api/health-profile?citizenId=${id}`)
      const data = await res.json()
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
        setPhoneNumber(p.phone_number || '')
        setEmail(p.email || '')
        setAddress(p.address || '')
        setGender(p.gender || '')
        setEmergencyContactName(p.emergency_contact_name || '')
        setEmergencyContactPhone(p.emergency_contact_phone || '')
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/health-profile', {
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
          height: height ? Number(height) : null,
          weight: weight ? Number(weight) : null,
          primaryPhysician: primaryPhysician || null,
          physicianPhone: physicianPhone || null,
          insuranceInfo: insuranceInfo || null,
          phoneNumber: phoneNumber || null,
          email: email || null,
          address: address || null,
          gender: gender || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
        }),
      })
      if (res.ok) {
        // Save key citizen info to localStorage for emergency flow
        if (fullName) localStorage.setItem('rakshak-citizen-name', fullName)
        if (phoneNumber) localStorage.setItem('rakshak-citizen-phone', phoneNumber)
        if (email) localStorage.setItem('rakshak-citizen-email', email)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const addItem = (list: string[], setList: (v: string[]) => void, value: string, setValue: (v: string) => void) => {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
      setValue('')
    }
  }

  const removeItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:py-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">Citizen Registration</h1>
                <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Personal details &amp; health profile</p>
              </div>
            </div>
          </div>
          <Link href="/emergency">
            <Button className="bg-red-500 hover:bg-red-600 text-white flex-shrink-0" size="sm">
              <Shield className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Emergency</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-indigo-900">Why register?</p>
              <p className="text-sm text-indigo-700 mt-1">
                Your details are securely stored and automatically shared with emergency responders when you report an emergency. 
                This helps them locate you faster, provide the right treatment, and save critical time.
              </p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setStep(1)}
            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
              step === 1 
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            <User className="h-4 w-4" />
            <div className="text-left">
              <p className="text-sm font-semibold">Step 1</p>
              <p className="text-xs opacity-75">Personal Info</p>
            </div>
          </button>
          <div className="w-8 h-0.5 bg-slate-200 flex-shrink-0" />
          <button
            onClick={() => setStep(2)}
            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
              step === 2 
                ? 'border-red-500 bg-red-50 text-red-700' 
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            <Heart className="h-4 w-4" />
            <div className="text-left">
              <p className="text-sm font-semibold">Step 2</p>
              <p className="text-xs opacity-75">Health Profile</p>
            </div>
          </button>
        </div>

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <User className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name *</label>
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="border-slate-200"
                  />
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone *
                    </label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="border-slate-200"
                    />
                  </div>
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" /> Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={e => setDateOfBirth(e.target.value)}
                      className="border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Gender</label>
                    <div className="flex gap-2">
                      {['Male', 'Female', 'Other'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g.toLowerCase())}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                            gender === g.toLowerCase()
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> Home Address
                  </label>
                  <Textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Enter your home address"
                    className="border-slate-200 min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Phone className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-bold text-slate-900">Emergency Contact</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                This person will be notified when you report an emergency.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Contact Name</label>
                  <Input
                    value={emergencyContactName}
                    onChange={e => setEmergencyContactName(e.target.value)}
                    placeholder="Name"
                    className="border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Contact Phone</label>
                  <Input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={e => setEmergencyContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-700 px-8">
                Next: Health Profile <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Health Profile */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Blood Type */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Droplets className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-bold text-slate-900">Blood Type &amp; Vitals</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Blood Type</label>
                  <div className="flex flex-wrap gap-2">
                    {BLOOD_TYPES.map(bt => (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setBloodType(bloodType === bt ? '' : bt)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                          bloodType === bt
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-200 text-slate-500 hover:border-red-300'
                        }`}
                      >
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Height (cm)</label>
                    <Input
                      type="number"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="170"
                      className="border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Weight (kg)</label>
                    <Input
                      type="number"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="70"
                      className="border-slate-200"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={organDonor}
                    onChange={e => setOrganDonor(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Organ Donor</p>
                    <p className="text-xs text-slate-400">I am a registered organ donor</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Allergies */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">Allergies</h2>
              </div>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newAllergy}
                  onChange={e => setNewAllergy(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts"
                  className="border-slate-200"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(allergies, setAllergies, newAllergy, setNewAllergy))}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => addItem(allergies, setAllergies, newAllergy, setNewAllergy)}
                  className="border-slate-200 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a, i) => (
                    <Badge key={i} variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 pr-1 gap-1">
                      {a}
                      <button type="button" onClick={() => removeItem(allergies, setAllergies, i)} className="ml-0.5 hover:bg-amber-200 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Medications */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Pill className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-900">Current Medications</h2>
              </div>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newMedication}
                  onChange={e => setNewMedication(e.target.value)}
                  placeholder="e.g. Metformin 500mg"
                  className="border-slate-200"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(medications, setMedications, newMedication, setNewMedication))}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => addItem(medications, setMedications, newMedication, setNewMedication)}
                  className="border-slate-200 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {medications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {medications.map((m, i) => (
                    <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 pr-1 gap-1">
                      {m}
                      <button type="button" onClick={() => removeItem(medications, setMedications, i)} className="ml-0.5 hover:bg-blue-200 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Medical Conditions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-violet-500" />
                <h2 className="text-lg font-bold text-slate-900">Medical Conditions</h2>
              </div>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newCondition}
                  onChange={e => setNewCondition(e.target.value)}
                  placeholder="e.g. Diabetes, Asthma"
                  className="border-slate-200"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(conditions, setConditions, newCondition, setNewCondition))}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => addItem(conditions, setConditions, newCondition, setNewCondition)}
                  className="border-slate-200 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {conditions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {conditions.map((c, i) => (
                    <Badge key={i} variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200 pr-1 gap-1">
                      {c}
                      <button type="button" onClick={() => removeItem(conditions, setConditions, i)} className="ml-0.5 hover:bg-violet-200 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Doctor & Notes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Heart className="h-5 w-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900">Additional Medical Info</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Primary Physician</label>
                    <Input
                      value={primaryPhysician}
                      onChange={e => setPrimaryPhysician(e.target.value)}
                      placeholder="Dr. Name"
                      className="border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Physician Phone</label>
                    <Input
                      type="tel"
                      value={physicianPhone}
                      onChange={e => setPhysicianPhone(e.target.value)}
                      placeholder="+91 ..."
                      className="border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Insurance Info</label>
                  <Input
                    value={insuranceInfo}
                    onChange={e => setInsuranceInfo(e.target.value)}
                    placeholder="Insurance provider & policy number"
                    className="border-slate-200"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Emergency Medical Notes</label>
                  <Textarea
                    value={emergencyNotes}
                    onChange={e => setEmergencyNotes(e.target.value)}
                    placeholder="Any important notes for emergency responders..."
                    className="border-slate-200 min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="border-slate-200">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            </div>
          </div>
        )}

        {/* Save Button — always visible */}
        <div className="mt-8 sticky bottom-4 z-40">
          <Button
            onClick={handleSave}
            disabled={saving || !fullName}
            className={`w-full h-14 text-base font-semibold rounded-2xl shadow-lg transition-all ${
              saved
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Registration Saved Successfully!
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Registration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
