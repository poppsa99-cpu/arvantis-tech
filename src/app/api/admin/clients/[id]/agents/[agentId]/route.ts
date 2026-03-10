import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { agentId } = await params
  const admin = getSupabaseAdmin()

  const { error } = await admin
    .from('organization_agents')
    .delete()
    .eq('id', agentId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { agentId } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  // Whitelist allowed fields
  const updates: Record<string, unknown> = {}
  if (body.status !== undefined) updates.status = body.status
  if (body.n8n_webhook_url !== undefined) updates.n8n_webhook_url = body.n8n_webhook_url
  if (body.config !== undefined) updates.config = body.config
  if (body.error_message !== undefined) updates.error_message = body.error_message

  const { error } = await admin
    .from('organization_agents')
    .update(updates)
    .eq('id', agentId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
