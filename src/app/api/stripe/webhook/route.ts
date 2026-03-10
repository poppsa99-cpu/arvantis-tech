import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed'
    console.error('Webhook error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }
    }

    // Log all billing events
    await logBillingEvent(event)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const planId = session.metadata?.plan_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId) {
    console.log('Checkout completed without user_id — will be linked on signup')
    return
  }

  // Update the user's profile with Stripe data
  await getSupabaseAdmin()
    .from('profiles')
    .upsert({
      id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_plan: planId,
      subscription_status: 'trialing', // 30-day trial before first charge
      setup_fee_paid: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find user by Stripe customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!profile) return

  const status = mapStripeStatus(subscription.status)

  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status: status,
      current_period_end: subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!profile) return

  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, payment_failures')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!profile) return

  // Escalating dunning stages (billing agent brain §1.4)
  // Failure 1: "notice" — friendly, assume it's temporary
  // Failure 2: "warning" — firmer, mention risk
  // Failure 3+: "critical" — final notice, service will pause
  const failures = (profile.payment_failures || 0) + 1
  const dunningStage = failures === 1 ? 'notice' : failures === 2 ? 'warning' : 'critical'

  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status: 'past_due',
      payment_failures: failures,
      dunning_stage: dunningStage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!profile) return

  // Reset dunning state on successful payment (billing agent brain §1.2)
  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status: 'active',
      payment_failures: 0,
      dunning_stage: null,
      last_payment_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active': return 'active'
    case 'trialing': return 'trialing'
    case 'past_due': return 'past_due'
    case 'canceled': return 'canceled'
    case 'unpaid': return 'past_due'
    case 'incomplete': return 'incomplete'
    case 'incomplete_expired': return 'canceled'
    case 'paused': return 'paused'
    default: return status
  }
}

async function logBillingEvent(event: Stripe.Event) {
  try {
    await getSupabaseAdmin()
      .from('billing_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        data: event.data.object,
        created_at: new Date().toISOString(),
      })
  } catch {
    // Don't fail the webhook if logging fails
    console.error('Failed to log billing event')
  }
}
