'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, getDashboardPath, type UserRole } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, profile } = useAuth()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    // Check role-based access
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
      // Redirect to their correct dashboard
      router.replace(getDashboardPath(profile.role))
      return
    }

    setChecked(true)
  }, [isAuthenticated, isLoading, profile, router, allowedRoles])

  if (isLoading || !checked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null
  return <>{children}</>
}
