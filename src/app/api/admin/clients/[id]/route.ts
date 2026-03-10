import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const admin = getSupabaseAdmin()

  // Get user from auth
  const { data: { user } } = await admin.auth.admin.getUserById(id)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get profile
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  // Get organization
  const { data: org } = await admin
    .from('organizations')
    .select('*')
    .eq('user_id', id)
    .maybeSingle()

  // Get agents (if org exists)
  let agents: unknown[] = []
  if (org) {
    const { data } = await admin
      .from('organization_agents')
      .select('*, agent_template:agent_templates(*)')
      .eq('organization_id', org.id)
    agents = data || []
  }

  // Get billing events
  const { data: billingEvents } = await admin
    .from('billing_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Filter billing events for this user (check metadata)
  const userEvents = (billingEvents || []).filter((e) => {
    const data = e.data as Record<string, unknown>
    return (
      data?.user_id === id ||
      data?.customer_email === user.email
    )
  })

  // Get admin notes (if org exists)
  let notes: unknown[] = []
  if (org) {
    const { data } = await admin
      .from('admin_notes')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
    notes = data || []
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      company_name: user.user_metadata?.company_name || '',
      niche: user.user_metadata?.niche || '',
      phone: user.user_metadata?.phone || '',
      created_at: user.created_at,
    },
    profile,
    organization: org,
    agents,
    billingEvents: userEvents,
    notes,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  // Check if org exists for this user
  const { data: existingOrg } = await admin
    .from('organizations')
    .select('id')
    .eq('user_id', id)
    .maybeSingle()

  if (existingOrg) {
    // Update existing org
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.onboarding_status) {
      updateData.onboarding_status = body.onboarding_status
      updateData.stage_changed_at = new Date().toISOString()
    }
    if (body.n8n_webhook_url !== undefined) updateData.n8n_webhook_url = body.n8n_webhook_url
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.has_mini_bot !== undefined) updateData.has_mini_bot = body.has_mini_bot
    if (body.company_name !== undefined) updateData.company_name = body.company_name
    if (body.niche !== undefined) updateData.niche = body.niche

    const { error } = await admin
      .from('organizations')
      .update(updateData)
      .eq('id', existingOrg.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    // Create org if it doesn't exist
    const { data: { user } } = await admin.auth.admin.getUserById(id)
    const { error } = await admin.from('organizations').insert({
      user_id: id,
      company_name: body.company_name || user?.user_metadata?.company_name || '',
      niche: body.niche || user?.user_metadata?.niche || '',
      phone: body.phone || user?.user_metadata?.phone || '',
      onboarding_status: body.onboarding_status || 'pending_call',
      n8n_webhook_url: body.n8n_webhook_url || null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
