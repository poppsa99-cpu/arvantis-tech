import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/server'
import { PLANS, type PlanId } from '@/lib/stripe/plans'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { planId, billingCycle = 'monthly' } = body as { planId: PlanId; billingCycle?: 'monthly' | 'annual' }

    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const plan = PLANS[planId]
    const isAnnual = billingCycle === 'annual'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    const setupPriceId = PLANS.setup.priceId
    const subscriptionPriceId = isAnnual && 'annualPriceId' in plan
      ? plan.annualPriceId
      : plan.priceId

    const stripe = getStripe()

    // Create an inline one-time price for the setup fee
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        // One-time setup fee
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Done-For-You Setup' },
            unit_amount: 150000, // $1,500
          },
          quantity: 1,
        },
        // Recurring subscription
        { price: subscriptionPriceId, quantity: 1 },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          plan_id: planId,
          plan_name: plan.name,
          billing_cycle: billingCycle,
          ...(user ? { user_id: user.id, user_email: user.email } : {}),
        },
      },
      ...(user?.email ? { customer_email: user.email } : {}),
      metadata: {
        plan_id: planId,
        billing_cycle: billingCycle,
        ...(user ? { user_id: user.id } : {}),
      },
      success_url: `${appUrl}/signup?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&billing=${billingCycle}`,
      cancel_url: `${appUrl}/pay?canceled=true`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    void error
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
