import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSpamStats } from '@/lib/spam-detection'
import { getGuardStats } from '@/lib/spam-guard'

/**
 * GET /api/spam-review — Get spam reports and statistics
 */
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'all' // all | unreviewed | confirmed_spam | false_positive
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    let query = supabase
      .from('spam_reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (filter === 'unreviewed') {
      query = query.eq('reviewed', false)
    } else if (filter === 'confirmed_spam' || filter === 'false_positive' || filter === 'genuine') {
      query = query.eq('review_outcome', filter)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('Spam review fetch error:', error)
      return NextResponse.json({ reports: [], total: 0 })
    }

    // Get in-memory stats
    const spamStats = getSpamStats()
    const guardStats = getGuardStats()

    // Get DB aggregate stats
    const { data: statsData } = await supabase
      .from('spam_reports')
      .select('classification')
    
    const dbStats = {
      total: statsData?.length || 0,
      confirmed_spam: statsData?.filter(r => r.classification === 'confirmed_spam').length || 0,
      likely_spam: statsData?.filter(r => r.classification === 'likely_spam').length || 0,
      suspicious: statsData?.filter(r => r.classification === 'suspicious').length || 0,
      genuine: statsData?.filter(r => r.classification === 'genuine').length || 0,
    }

    return NextResponse.json({
      reports: data || [],
      total: count || 0,
      page,
      limit,
      stats: {
        database: dbStats,
        inMemory: spamStats,
        rateLimiters: guardStats,
      },
    })
  } catch (error) {
    console.error('Spam review error:', error)
    return NextResponse.json({ error: 'Failed to fetch spam reports' }, { status: 500 })
  }
}

/**
 * PUT /api/spam-review — Review a spam report (confirm/dismiss)
 */
export async function PUT(req: NextRequest) {
  const supabase = createServerClient()

  try {
    const { reportId, outcome, reviewedBy } = await req.json()

    if (!reportId || !outcome) {
      return NextResponse.json({ error: 'reportId and outcome required' }, { status: 400 })
    }

    if (!['confirmed_spam', 'false_positive', 'genuine'].includes(outcome)) {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
    }

    const { error } = await supabase
      .from('spam_reports')
      .update({
        reviewed: true,
        review_outcome: outcome,
        reviewed_by: reviewedBy || 'dispatch',
      })
      .eq('id', reportId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Spam review update error:', error)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}
