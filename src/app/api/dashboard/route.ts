import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Get profile
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_plan, subscription_status, setup_fee_paid, current_period_end')
    .eq('id', user.id)
    .maybeSingle()

  // Get organization
  const { data: org } = await admin
    .from('organizations')
    .select('id, company_name, onboarding_status')
    .eq('user_id', user.id)
    .maybeSingle()

  // Get deployed agents with template info
  let agents: Array<{
    id: string
    status: string
    runs_count: number
    last_run_at: string | null
    created_at: string
    agent_template: {
      display_name: string
      description: string | null
      icon: string | null
      category: string | null
    }
  }> = []

  if (org) {
    const { data } = await admin
      .from('organization_agents')
      .select('id, status, runs_count, last_run_at, created_at, agent_template:agent_templates(display_name, description, icon, category)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: true })

    agents = ((data || []) as unknown as typeof agents).map((a) => ({
      ...a,
      agent_template: Array.isArray(a.agent_template) ? a.agent_template[0] : a.agent_template,
    }))
  }

  return NextResponse.json({
    user: {
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      company_name: org?.company_name || user.user_metadata?.company_name || '',
    },
    subscription: {
      plan: profile?.subscription_plan || null,
      status: profile?.subscription_status || null,
      setup_fee_paid: profile?.setup_fee_paid || false,
      current_period_end: profile?.current_period_end || null,
    },
    onboarding_status: org?.onboarding_status || 'pending_call',
    agents,
  })
}
