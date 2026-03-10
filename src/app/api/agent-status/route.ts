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

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ paused: false })
  }

  const { data: agents } = await admin
    .from('organization_agents')
    .select('status, agent_template:agent_templates(slug)')
    .eq('organization_id', org.id)

  const docAgent = (agents || []).find((a) => {
    const tmpl = a.agent_template
    const slug = Array.isArray(tmpl) ? tmpl[0]?.slug : (tmpl as { slug: string } | null)?.slug
    return slug === 'document'
  })

  return NextResponse.json({ paused: docAgent?.status === 'paused' })
}
