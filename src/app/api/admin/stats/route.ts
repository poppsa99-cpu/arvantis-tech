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

  // Fetch all profiles with active/trialing subscriptions
  const { data: profiles } = await admin
    .from('profiles')
    .select('subscription_plan, subscription_status')

  // Calculate MRR
  const activeProfiles = (profiles || []).filter(
    (p) => p.subscription_status === 'active' || p.subscription_status === 'trialing'
  )
  const totalMrr = activeProfiles.reduce(
    (sum, p) => sum + (PLAN_MRR[p.subscription_plan] || 0),
    0
  )
  const activeClients = activeProfiles.length

  // Onboarding counts
  const { data: orgs } = await admin
    .from('organizations')
    .select('onboarding_status')

  const onboardingCounts: Record<string, number> = {}
  let onboardingTotal = 0
  for (const org of orgs || []) {
    const status = org.onboarding_status || 'pending_call'
    onboardingCounts[status] = (onboardingCounts[status] || 0) + 1
    if (status !== 'active') onboardingTotal++
  }

  // Agent errors
  const { count: agentErrors } = await admin
    .from('organization_agents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'error')

  // Recent activity (last 15 billing events)
  const { data: recentActivity } = await admin
    .from('billing_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15)

  // MRR trend — aggregate from billing_events by month (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: trendEvents } = await admin
    .from('billing_events')
    .select('created_at, event_type, data')
    .gte('created_at', sixMonthsAgo.toISOString())
    .in('event_type', ['checkout.session.completed', 'customer.subscription.deleted'])
    .order('created_at', { ascending: true })

  // Build simple trend (count active subs per month)
  const mrrTrend: { month: string; mrr: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthLabel = d.toLocaleString('default', { month: 'short' })
    // Rough MRR: current MRR minus recent events adjustments
    // For MVP, just show current MRR for all months (will improve with real data)
    mrrTrend.push({ month: monthLabel, mrr: i === 0 ? totalMrr : 0 })
  }

  // If we have events, try to build a better trend
  if (trendEvents && trendEvents.length > 0) {
    let runningMrr = 0
    for (const entry of mrrTrend) {
      const monthEvents = (trendEvents || []).filter((e) => {
        const eventMonth = new Date(e.created_at).toLocaleString('default', { month: 'short' })
        return eventMonth === entry.month
      })
      for (const e of monthEvents) {
        if (e.event_type === 'checkout.session.completed') {
          const planId = (e.data as Record<string, unknown>)?.plan_id as string
          runningMrr += PLAN_MRR[planId] || 700
        } else if (e.event_type === 'customer.subscription.deleted') {
          runningMrr = Math.max(0, runningMrr - 700)
        }
      }
      entry.mrr = runningMrr
    }
  }

  return NextResponse.json({
    totalMrr,
    activeClients,
    onboardingCounts,
    onboardingTotal,
    agentErrors: agentErrors || 0,
    recentActivity: recentActivity || [],
    mrrTrend,
  })
}
