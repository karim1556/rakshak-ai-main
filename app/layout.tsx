import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'
import { Providers } from './providers'
import { PWARegister } from '@/components/pwa-register'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4f46e5',
}

export const metadata: Metadata = {
  title: 'Rakshak AI - Emergency Intelligence Platform',
  description: 'Advanced AI-powered emergency response system for faster, smarter coordination between citizens and emergency responders.',
  generator: 'v0.app',
  keywords: ['emergency', 'AI', 'dispatch', 'responder', 'medical', 'police'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Rakshak AI',
  },
  formatDetection: {
    telephone: true,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
          <PWARegister />
        </Providers>
      </body>
    </html>
  )
}
