import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PLAN_MRR } from '@/lib/admin/types'

export async function GET() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // All profiles
  const { data: profiles } = await admin.from('profiles').select('*')
  const allProfiles = profiles || []

  // MRR by tier
  const byTier = ['starter', 'growth', 'scale'].map((tier) => {
    const tierProfiles = allProfiles.filter(
      (p) => p.subscription_plan === tier && (p.subscription_status === 'active' || p.subscription_status === 'trialing')
    )
    return {
      tier,
      label: tier === 'starter' ? 'Autopilot' : tier === 'growth' ? 'Overdrive' : 'Takeover',
      count: tierProfiles.length,
      mrr: tierProfiles.length * (PLAN_MRR[tier] || 0),
    }
  })

  const totalMrr = byTier.reduce((sum, t) => sum + t.mrr, 0)

  // Setup fees — count profiles with setup_fee_paid
  const setupPaidTotal = allProfiles.filter((p) => p.setup_fee_paid).length
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const setupPaidThisMonth = allProfiles.filter(
    (p) => p.setup_fee_paid && new Date(p.updated_at) >= thisMonthStart
  ).length

  // Churn rate (canceled in last 30 days / total active+canceled)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const recentCanceled = allProfiles.filter(
    (p) => p.subscription_status === 'canceled' && new Date(p.updated_at) >= thirtyDaysAgo
  ).length
  const activeCount = allProfiles.filter(
    (p) => p.subscription_status === 'active' || p.subscription_status === 'trialing'
  ).length
  const churnRate = activeCount + recentCanceled > 0
    ? (recentCanceled / (activeCount + recentCanceled)) * 100
    : 0

  // Payment failures
  const paymentFailures = allProfiles
    .filter((p) => (p.payment_failures || 0) > 0)
    .map((p) => ({
      id: p.id,
      payment_failures: p.payment_failures,
      dunning_stage: p.dunning_stage,
      subscription_plan: p.subscription_plan,
    }))

  // Upcoming renewals (next 7 days)
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000)
  const upcomingRenewals = allProfiles
    .filter(
      (p) =>
        p.current_period_end &&
        new Date(p.current_period_end) <= sevenDaysFromNow &&
        new Date(p.current_period_end) >= now &&
        p.subscription_status === 'active'
    )
    .map((p) => ({
      id: p.id,
      subscription_plan: p.subscription_plan,
      current_period_end: p.current_period_end,
    }))

  // MRR trend from billing events
  const { data: events } = await admin
    .from('billing_events')
    .select('created_at, event_type, data')
    .order('created_at', { ascending: true })

  const mrrTrend: { month: string; mrr: number }[] = []
  let runningMrr = 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)

    const monthEvents = (events || []).filter((e) => {
      const eventDate = new Date(e.created_at)
      return eventDate >= monthStart && eventDate <= monthEnd
    })

    for (const e of monthEvents) {
      if (e.event_type === 'checkout.session.completed') {
        const planId = (e.data as Record<string, unknown>)?.plan_id as string
        runningMrr += PLAN_MRR[planId] || 700
      } else if (e.event_type === 'customer.subscription.deleted') {
        runningMrr = Math.max(0, runningMrr - 700)
      }
    }

    mrrTrend.push({ month: monthLabel, mrr: i === 0 ? Math.max(runningMrr, totalMrr) : runningMrr })
  }

  return NextResponse.json({
    totalMrr,
    byTier,
    setupFeesThisMonth: setupPaidThisMonth * 1500,
    setupFeesTotal: setupPaidTotal * 1500,
    churnRate: Math.round(churnRate * 10) / 10,
    paymentFailures,
    upcomingRenewals,
    mrrTrend,
  })
}
