'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
