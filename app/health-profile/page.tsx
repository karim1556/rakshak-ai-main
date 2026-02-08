'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HealthProfileForm } from '@/components/health-profile-form'

export default function HealthProfilePage() {
  // Use a consistent citizen identifier
  // In production, this would come from auth context
  const [citizenId, setCitizenId] = useState('')

  useEffect(() => {
    // Generate or retrieve a persistent citizen ID from localStorage
    let id = localStorage.getItem('rakshak-citizen-id')
    if (!id) {
      id = `citizen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('rakshak-citizen-id', id)
    }
    setCitizenId(id)
  }, [])

  if (!citizenId) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Heart className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Health Profile</h1>
                <p className="text-sm text-slate-500">Auto-shared with responders during emergencies</p>
              </div>
            </div>
          </div>
          <Link href="/emergency">
            <Button className="bg-red-500 hover:bg-red-600 text-white">
              <Shield className="h-4 w-4 mr-2" />
              Emergency
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Why add your health profile?</p>
              <p className="text-sm text-blue-700 mt-1">
                When you report an emergency, your medical history (allergies, medications, blood type) 
                is automatically shared with medical responders. This helps them provide faster, safer treatment.
              </p>
            </div>
          </div>
        </div>

        {/* Health Profile Form */}
        <HealthProfileForm citizenId={citizenId} />
      </div>
    </div>
  )
}
