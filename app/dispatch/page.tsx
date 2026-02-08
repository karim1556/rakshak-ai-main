'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DispatchRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/dispatch') }, [router])
  return (
    <div className="h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-600 text-sm">Redirecting…</p>
    </div>
  )
}
