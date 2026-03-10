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

  const { id } = await params
  const body = await request.json()
  const admin = getSupabaseAdmin()

  // Verify user exists
  const { data: { user } } = await admin.auth.admin.getUserById(id)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Update profile with subscription data
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.subscription_plan !== undefined) updateData.subscription_plan = body.subscription_plan
  if (body.subscription_status !== undefined) updateData.subscription_status = body.subscription_status
  if (body.setup_fee_paid !== undefined) updateData.setup_fee_paid = body.setup_fee_paid
  if (body.current_period_end !== undefined) updateData.current_period_end = body.current_period_end

  const { error } = await admin
    .from('profiles')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If activating, ensure an organization record exists
  if (body.subscription_status === 'active') {
    const { data: existingOrg } = await admin
      .from('organizations')
      .select('id')
      .eq('user_id', id)
      .maybeSingle()

    if (!existingOrg) {
      await admin.from('organizations').insert({
        user_id: id,
        company_name: user.user_metadata?.company_name || '',
        niche: user.user_metadata?.niche || '',
        phone: user.user_metadata?.phone || '',
        onboarding_status: 'pending_call',
      })
    }
  }

  return NextResponse.json({ success: true })
}
