'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Shield, ShieldAlert, ShieldCheck, ShieldX,
  AlertTriangle, CheckCircle2, XCircle, Eye, Clock,
  BarChart3, Activity, Ban, RefreshCw, Filter
} from 'lucide-react'
import { AuthGuard } from '@/components/auth-guard'

interface SpamReport {
  id: string
  ip_address: string
  session_id: string
  trust_score: number
  classification: string
  reasons: string[]
  action_taken: string
  endpoint: string
  reviewed: boolean
  reviewed_by: string | null
  review_outcome: string | null
  created_at: string
}

interface Stats {
  database: {
    total: number
    confirmed_spam: number
    likely_spam: number
    suspicious: number
    genuine: number
  }
  inMemory: {
    totalTrackedIPs: number
    flaggedIPs: number
    recentReportsCount: number
    topOffenders: Array<{ ip: string; spamCount: number; totalReports: number }>
  }
  rateLimiters: {
    escalation: { activeKeys: number; blockedKeys: number }
    agentConversation: { activeKeys: number; blockedKeys: number }
    analysis: { activeKeys: number; blockedKeys: number }
    speech: { activeKeys: number; blockedKeys: number }
  }
}

export default function SpamMonitorPage() {
  const [reports, setReports] = useState<SpamReport[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/spam-review?filter=${filter}`)
      const data = await res.json()
      setReports(data.reports || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Failed to fetch spam data:', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  const handleReview = async (reportId: string, outcome: string) => {
    setUpdating(reportId)
    try {
      await fetch('/api/spam-review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, outcome }),
      })
      await fetchData()
    } catch (err) {
      console.error('Review update failed:', err)
    } finally {
      setUpdating(null)
    }
  }

  const getClassificationBadge = (classification: string) => {
    const styles: Record<string, string> = {
      genuine: 'bg-green-100 text-green-800 border-green-200',
      suspicious: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      likely_spam: 'bg-orange-100 text-orange-800 border-orange-200',
      confirmed_spam: 'bg-red-100 text-red-800 border-red-200',
    }
    return styles[classification] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      allow: 'bg-green-50 text-green-700',
      flag_for_review: 'bg-yellow-50 text-yellow-700',
      require_verification: 'bg-orange-50 text-orange-700',
      block: 'bg-red-50 text-red-700',
    }
    return styles[action] || 'bg-gray-50 text-gray-700'
  }

  const getTrustScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    if (score >= 30) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/dispatch" className="p-2 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-red-500" />
                <h1 className="font-bold text-lg">Spam Monitor</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard
                icon={<BarChart3 className="w-5 h-5 text-slate-600" />}
                label="Total Reports"
                value={stats.database.total}
              />
              <StatCard
                icon={<ShieldX className="w-5 h-5 text-red-500" />}
                label="Confirmed Spam"
                value={stats.database.confirmed_spam}
                color="text-red-600"
              />
              <StatCard
                icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
                label="Likely Spam"
                value={stats.database.likely_spam}
                color="text-orange-600"
              />
              <StatCard
                icon={<Eye className="w-5 h-5 text-yellow-500" />}
                label="Suspicious"
                value={stats.database.suspicious}
                color="text-yellow-600"
              />
              <StatCard
                icon={<Activity className="w-5 h-5 text-blue-500" />}
                label="Tracked IPs"
                value={stats.inMemory.totalTrackedIPs}
              />
              <StatCard
                icon={<Ban className="w-5 h-5 text-red-500" />}
                label="Rate Limited"
                value={
                  stats.rateLimiters.escalation.blockedKeys +
                  stats.rateLimiters.agentConversation.blockedKeys +
                  stats.rateLimiters.analysis.blockedKeys
                }
                color="text-red-600"
              />
            </div>
          )}

          {/* Top Offenders */}
          {stats?.inMemory.topOffenders && stats.inMemory.topOffenders.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 p-4">
              <h2 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
                <ShieldX className="w-4 h-4" />
                Top Offenders
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {stats.inMemory.topOffenders.map((offender, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg text-sm">
                    <span className="font-mono text-red-800">{offender.ip}</span>
                    <span className="text-red-600">
                      {offender.spamCount}/{offender.totalReports} spam
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All Reports', icon: Filter },
              { key: 'unreviewed', label: 'Needs Review', icon: Eye },
              { key: 'confirmed_spam', label: 'Confirmed Spam', icon: XCircle },
              { key: 'false_positive', label: 'False Positives', icon: ShieldCheck },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition ${
                  filter === tab.key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Reports List */}
          {loading && reports.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg text-slate-800">All Clear</h3>
              <p className="text-slate-500">No spam reports matching this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div
                  key={report.id}
                  className={`bg-white rounded-xl border p-4 transition ${
                    report.reviewed ? 'border-slate-200' : 'border-yellow-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getClassificationBadge(report.classification)}`}>
                          {report.classification.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getActionBadge(report.action_taken)}`}>
                          {report.action_taken.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-sm font-bold ${getTrustScoreColor(report.trust_score)}`}>
                          Trust: {report.trust_score}/100
                        </span>
                        {report.reviewed && (
                          <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Reviewed: {report.review_outcome?.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-slate-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-xs text-slate-400">IP: {report.ip_address}</span>
                          <span className="text-xs text-slate-400">Session: {report.session_id}</span>
                          <span className="text-xs text-slate-400">Endpoint: {report.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleString()}
                        </div>
                      </div>

                      {report.reasons && report.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {report.reasons.map((reason, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {!report.reviewed && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => handleReview(report.id, 'confirmed_spam')}
                          disabled={updating === report.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" />
                          Spam
                        </button>
                        <button
                          onClick={() => handleReview(report.id, 'false_positive')}
                          disabled={updating === report.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Genuine
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color || 'text-slate-800'}`}>{value}</span>
    </div>
  )
}
