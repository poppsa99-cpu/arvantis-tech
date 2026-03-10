import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  // Get all admin users
  const { data: adminProfiles } = await admin
    .from('profiles')
    .select('id')
    .eq('is_admin', true)

  // Get user details for admins
  const adminUsers = []
  for (const profile of adminProfiles || []) {
    const { data: { user } } = await admin.auth.admin.getUserById(profile.id)
    if (user) {
      adminUsers.push({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
      })
    }
  }

  return NextResponse.json({ adminUsers })
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const admin = getSupabaseAdmin()

  if (body.action === 'grant_admin') {
    // Find user by email
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 500 })
    const user = users?.find((u) => u.email === body.email)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error } = await admin
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (body.action === 'revoke_admin') {
    const userId = body.userId || body.email // Support both for backwards compat
    const { error } = await admin
      .from('profiles')
      .update({ is_admin: false })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
