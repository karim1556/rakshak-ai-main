'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'dispatch' | 'police' | 'medical' | 'fire' | 'citizen'

interface UserProfile {
  id: string
  email: string
  role: UserRole
  fullName: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isDemo: boolean
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string; role?: UserRole }>
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  demoLogin: (role?: UserRole) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      // profiles table may not be in typed schema — use untyped query
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (data) {
        const p: UserProfile = {
          id: data.id,
          email: data.email || email,
          role: data.role as UserRole,
          fullName: data.full_name || email,
        }
        setProfile(p)
        return p
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    }
    return null
  }, [])

  // Initialize auth state
  useEffect(() => {
    const init = async () => {
      // Check demo mode
      if (typeof window !== 'undefined' && localStorage.getItem('rakshak-auth') === 'demo') {
        const demoRole = (localStorage.getItem('rakshak-demo-role') as UserRole) || 'dispatch'
        setIsDemo(true)
        setProfile({
          id: 'demo',
          email: 'demo@rakshak.ai',
          role: demoRole,
          fullName: `Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}`,
        })
        // Set demo cookie for middleware
        document.cookie = 'rakshak-demo=true; path=/; max-age=86400'
        setIsLoading(false)
        return
      }

      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setSession(session)
        await fetchProfile(session.user.id, session.user.email || '')
      }
      setIsLoading(false)
    }

    init()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || '')
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setIsDemo(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email: string, password: string): Promise<{ error?: string; role?: UserRole }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    if (data.user) {
      const p = await fetchProfile(data.user.id, data.user.email || '')
      return { role: p?.role || 'dispatch' }
    }
    return { role: 'dispatch' }
  }

  const signUp = async (email: string, password: string, role: UserRole, fullName: string): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, full_name: fullName },
      },
    })
    if (error) return { error: error.message }

    // Manually create profile as fallback (in case DB trigger doesn't exist)
    if (data.user) {
      try {
        await (supabase as any).from('profiles').upsert({
          id: data.user.id,
          email,
          role,
          full_name: fullName,
        }, { onConflict: 'id' })
      } catch (profileErr) {
        console.warn('Profile auto-create failed (trigger may handle it):', profileErr)
      }
      // Set profile immediately so user doesn't have to re-login
      setProfile({ id: data.user.id, email, role, fullName })
    }
    return {}
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setIsDemo(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rakshak-auth')
      localStorage.removeItem('rakshak-demo-role')
      document.cookie = 'rakshak-demo=; path=/; max-age=0'
    }
  }

  const demoLogin = (role: UserRole = 'dispatch') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rakshak-auth', 'demo')
      localStorage.setItem('rakshak-demo-role', role)
      document.cookie = 'rakshak-demo=true; path=/; max-age=86400'
    }
    setIsDemo(true)
    setProfile({
      id: 'demo',
      email: 'demo@rakshak.ai',
      role,
      fullName: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    })
  }

  const isAuthenticated = !!(user || isDemo)

  return (
    <AuthContext.Provider value={{
      user, session, profile, isDemo, isLoading, isAuthenticated,
      signIn, signUp, signOut, demoLogin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/**
 * Get the role-specific dashboard path
 */
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'dispatch': return '/dashboard/dispatch'
    case 'police': return '/dashboard/police'
    case 'medical': return '/dashboard/medical'
    case 'fire': return '/dashboard/fire'
    default: return '/dashboard/dispatch'
  }
}
