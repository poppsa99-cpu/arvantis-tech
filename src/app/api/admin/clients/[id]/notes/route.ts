import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin } = await requireAdmin()
  if (!isAdmin || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: userId } = await params
  const admin = getSupabaseAdmin()

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ notes: [] })
  }

  const { data: notes } = await admin
    .from('admin_notes')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ notes: notes || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin } = await requireAdmin()
  if (!isAdmin || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: userId } = await params
  const { content } = await request.json()
  const admin = getSupabaseAdmin()

  // Get or create org
  let { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!org) {
    const { data: newOrg } = await admin
      .from('organizations')
      .insert({ user_id: userId })
      .select('id')
      .single()
    org = newOrg
  }

  if (!org) {
    return NextResponse.json({ error: 'Could not find or create organization' }, { status: 500 })
  }

  const { data: note, error } = await admin
    .from('admin_notes')
    .insert({
      organization_id: org.id,
      admin_user_id: user.id,
      content,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ note })
}
