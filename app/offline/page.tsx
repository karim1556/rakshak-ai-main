'use client'

import { WifiOff, RefreshCw, Shield, Phone } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <WifiOff className="h-10 w-10 text-slate-400" />
      </div>

      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight text-slate-900">Rakshak AI</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-3">You&apos;re Offline</h1>
      <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">
        No internet connection detected. Please check your connection and try again.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 mb-6"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>

      <div className="border-t border-slate-200 pt-6 mt-2">
        <p className="text-sm text-slate-500 mb-3">For life-threatening emergencies, call directly:</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="tel:112" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Phone className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-slate-700">112</span>
          </a>
          <a href="tel:108" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Phone className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-medium text-slate-700">108</span>
          </a>
          <a href="tel:101" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Phone className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-slate-700">101</span>
          </a>
        </div>
      </div>
    </div>
  )
}
