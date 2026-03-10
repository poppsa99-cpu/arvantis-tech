import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: userId } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  // Get the org for this user
  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('organization_agents')
    .insert({
      organization_id: org.id,
      agent_template_id: body.agent_template_id,
      n8n_webhook_url: body.n8n_webhook_url || null,
      config: body.config || {},
      status: body.status || 'active',
    })
    .select('*, agent_template:agent_templates(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agent: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  await params // consume params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  const { agent_id } = body

  // Whitelist allowed fields
  const updates: Record<string, unknown> = {}
  if (body.status !== undefined) updates.status = body.status
  if (body.n8n_webhook_url !== undefined) updates.n8n_webhook_url = body.n8n_webhook_url
  if (body.config !== undefined) updates.config = body.config

  const { error } = await admin
    .from('organization_agents')
    .update(updates)
    .eq('id', agent_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
