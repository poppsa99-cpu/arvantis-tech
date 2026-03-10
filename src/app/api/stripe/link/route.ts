import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Links a Stripe checkout session to a newly created user.
 * Called after signup when the user came from the /pay page.
 * This ensures their payment is connected to their account.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Missing sessionId or userId' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await getStripe().checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const customerId = session.customer as string
    const subscriptionId = session.subscription as string
    const planId = session.metadata?.plan_id

    // Update the user's profile with Stripe billing data
    await getSupabaseAdmin()
      .from('profiles')
      .upsert({
        id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_plan: planId,
        subscription_status: 'trialing',
        setup_fee_paid: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    // Also update the Stripe customer with the user ID for future webhook matching
    if (customerId) {
      await getStripe().customers.update(customerId, {
        metadata: { user_id: userId },
      })
    }

    // Update the subscription metadata too
    if (subscriptionId) {
      await getStripe().subscriptions.update(subscriptionId, {
        metadata: { user_id: userId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    void error
    const message = error instanceof Error ? error.message : 'Failed to link payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
