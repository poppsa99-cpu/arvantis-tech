import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PLAN_MRR } from '@/lib/admin/types'

export async function GET(request: NextRequest) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') || ''
  const planFilter = searchParams.get('plan') || ''
  const statusFilter = searchParams.get('status') || ''
  const stageFilter = searchParams.get('stage') || ''

  // Get all profiles with user metadata
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 500 })

  // Get all profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('*')

  // Get all organizations
  const { data: orgs } = await admin
    .from('organizations')
    .select('*')

  // Get agent counts per org
  const { data: agentCounts } = await admin
    .from('organization_agents')
    .select('organization_id')

  const orgAgentCounts: Record<string, number> = {}
  for (const a of agentCounts || []) {
    orgAgentCounts[a.organization_id] = (orgAgentCounts[a.organization_id] || 0) + 1
  }

  // Build client list
  const clients = (users?.users || []).map((user) => {
    const profile = (profiles || []).find((p) => p.id === user.id)
    const org = (orgs || []).find((o) => o.user_id === user.id)
    const plan = profile?.subscription_plan || null
    const mrr = plan ? PLAN_MRR[plan] || 0 : 0

    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || '',
      company_name: org?.company_name || user.user_metadata?.company_name || '',
      niche: org?.niche || user.user_metadata?.niche || '',
      phone: org?.phone || user.user_metadata?.phone || '',
      subscription_plan: plan,
      subscription_status: profile?.subscription_status || null,
      setup_fee_paid: profile?.setup_fee_paid || false,
      onboarding_status: org?.onboarding_status || 'pending_call',
      agent_count: org ? orgAgentCounts[org.id] || 0 : 0,
      mrr,
      created_at: user.created_at,
      organization_id: org?.id || null,
    }
  })

  // Apply filters
  let filtered = clients

  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.company_name || '').toLowerCase().includes(q)
    )
  }

  if (planFilter) {
    filtered = filtered.filter((c) => c.subscription_plan === planFilter)
  }

  if (statusFilter) {
    filtered = filtered.filter((c) => c.subscription_status === statusFilter)
  }

  if (stageFilter) {
    filtered = filtered.filter((c) => c.onboarding_status === stageFilter)
  }

  // Sort by created_at descending
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ clients: filtered })
}
