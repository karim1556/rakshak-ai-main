'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mic, Shield, Phone, Heart, Flame, ArrowRight, Radio, UserPlus, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function HomePage() {
  const router = useRouter()
  const { user, profile, signOut, isLoading, isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">Rakshak AI</span>
          </div>
          {isLoading ? (
            <div className="w-20 h-5 bg-slate-200 animate-pulse rounded" />
          ) : isAuthenticated ? (
            <button
              onClick={signOut}
              className="text-sm text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">{profile?.fullName || user?.email || 'User'}</span>
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link href="/login" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
              Login <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-center max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-200 mb-10">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">AI Emergency Assistant — 24/7</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-tight tracking-tight">
            Need help?
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Talk to me.</span>
          </h1>

          <p className="text-base text-slate-500 mb-12 max-w-sm mx-auto leading-relaxed">
            AI-powered emergency assistant. Describe your situation, get real-time guidance, and auto-dispatch responders.
          </p>

          {/* CTA */}
          <button
            onClick={() => router.push('/emergency')}
            className="group w-36 h-36 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 transition-all duration-300 mb-8 mx-auto flex flex-col items-center justify-center relative shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-105"
          >
            <Mic className="h-12 w-12 md:h-14 md:w-14 mb-1.5 text-white" />
            <span className="text-sm font-semibold text-white/90">Get Help</span>
            <div className="absolute inset-0 rounded-full animate-ping bg-indigo-400/10" style={{ animationDuration: '3s' }} />
          </button>

          <p className="text-xs text-slate-400 mb-8">Tap to start — Voice + Camera + Location</p>

          {/* Register CTA */}
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-white border-2 border-indigo-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all shadow-sm mb-10"
          >
            <UserPlus className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-700">Register &amp; Add Health Profile</span>
            <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
          </Link>

          {/* Emergency numbers */}
          <div className="flex flex-wrap justify-center gap-3">
            <a href="tel:112" className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-red-300 hover:shadow-md transition-all shadow-sm">
              <Phone className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-slate-700">112</span>
            </a>
            <a href="tel:108" className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:shadow-md transition-all shadow-sm">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-medium text-slate-700">108</span>
            </a>
            <a href="tel:101" className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all shadow-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-slate-700">101</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-white/50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3 w-3" />
            <span>Encrypted & private</span>
          </div>
          <div className="flex gap-3 sm:gap-5">
            <Link href="/dashboard/dispatch" className="hover:text-indigo-600 transition-colors font-medium">Dispatch</Link>
            <Link href="/dashboard/police" className="hover:text-indigo-600 transition-colors font-medium">Police</Link>
            <Link href="/dashboard/medical" className="hover:text-indigo-600 transition-colors font-medium">Medical</Link>
            <Link href="/dashboard/fire" className="hover:text-indigo-600 transition-colors font-medium">Fire</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
