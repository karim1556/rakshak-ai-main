'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, Lock, ArrowRight, Radio, Heart, Flame } from 'lucide-react'
import { useAuth, getDashboardPath, type UserRole } from '@/lib/auth-context'

const DEMO_ROLES: { role: UserRole; label: string; icon: any; color: string }[] = [
  { role: 'dispatch', label: 'Dispatch', icon: Radio, color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
  { role: 'police', label: 'Police', icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { role: 'medical', label: 'Medical', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { role: 'fire', label: 'Fire', icon: Flame, color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signUp, demoLogin, isAuthenticated, profile } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('dispatch')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && profile) {
      const redirect = searchParams.get('redirect') || getDashboardPath(profile.role)
      router.replace(redirect)
    }
  }, [isAuthenticated, profile, router, searchParams])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, role, fullName)
        if (result.error) throw new Error(result.error)
        setError('Check your email to confirm your account.')
        setMode('login')
      } else {
        const result = await signIn(email, password)
        if (result.error) throw new Error(result.error)
        const dashPath = getDashboardPath(result.role || 'dispatch')
        router.push(dashPath)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = (demoRole: UserRole) => {
    demoLogin(demoRole)
    router.push(getDashboardPath(demoRole))
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Rakshak AI</h1>
        <p className="text-sm text-slate-400 mt-1">Dispatch & Responder Access</p>
      </div>

      {/* Form */}
      <form onSubmit={handleAuth} className="space-y-3">
        {mode === 'signup' && (
          <>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              required
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all shadow-sm"
            />
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-medium">Role</label>
              <div className="grid grid-cols-4 gap-2">
                {DEMO_ROLES.map(({ role: r, label, icon: Icon }) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs transition-all ${
                      role === r
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all shadow-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 transition-all shadow-sm"
        />

        {error && (
          <p className={`text-xs ${error.includes('Check') ? 'text-emerald-600' : 'text-red-500'}`}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
        >
          <Lock className="h-4 w-4" />
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-xs text-slate-400 hover:text-indigo-600 transition-colors"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">DEMO ACCESS</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Demo Login with Role Selection */}
      <div className="grid grid-cols-2 gap-2">
        {DEMO_ROLES.map(({ role: r, label, icon: Icon, color }) => (
          <button
            key={r}
            onClick={() => handleDemoLogin(r)}
            className={`flex items-center gap-2 py-2.5 px-3 border rounded-xl text-xs font-medium transition-all ${color}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-6">
        Citizens don&apos;t need an account. Go to{' '}
        <a href="/" className="text-indigo-500 hover:text-indigo-700 font-medium">/</a>
        {' '}to report an emergency.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 text-slate-900 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
