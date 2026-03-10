import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, full_name, company_name, niche, phone, subscription_plan, setup_fee_paid } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // 1. Create the auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm so they can login immediately
    user_metadata: {
      full_name: full_name || '',
      company_name: company_name || '',
      niche: niche || '',
      phone: phone || '',
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  // 2. Profile is auto-created by the DB trigger, but update it with subscription info if provided
  if (subscription_plan) {
    const nextBilling = new Date()
    nextBilling.setMonth(nextBilling.getMonth() + 1)

    await admin.from('profiles').update({
      subscription_plan,
      subscription_status: 'active',
      setup_fee_paid: setup_fee_paid ?? false,
      current_period_end: nextBilling.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
  }

  // 3. Create organization record
  await admin.from('organizations').insert({
    user_id: userId,
    company_name: company_name || '',
    niche: niche || '',
    phone: phone || '',
    onboarding_status: subscription_plan ? 'building' : 'pending_call',
  })

  return NextResponse.json({ userId, email })
}
