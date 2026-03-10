/**
 * Arvantis Pricing Plans
 *
 * Setup fee: $1,500 one-time (everyone pays this)
 * Monthly subscription: starts NEXT month after setup
 * Annual: 2 months free (billing brain §3.2 — "2 months free" framing)
 *
 * Price IDs are created in the Stripe Dashboard and stored here.
 * For now, we use placeholder IDs — replace with real Stripe Price IDs
 * after creating products in the Stripe Dashboard.
 */

export const PLANS = {
  setup: {
    name: 'Done-For-You Setup',
    amount: 150000, // $1,500 in cents
    priceId: process.env.STRIPE_SETUP_PRICE_ID || 'price_setup_placeholder',
  },
  starter: {
    name: 'Autopilot',
    amount: 70000, // $700/mo in cents
    annualAmount: 700000, // $7,000/yr in cents (10 months — 2 free)
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_placeholder',
    annualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || 'price_starter_annual_placeholder',
    features: ['3 Custom AI Agents', 'Email Support', 'Monthly Reports', 'Standard Dashboard'],
  },
  growth: {
    name: 'Overdrive',
    amount: 100000, // $1,000/mo in cents
    annualAmount: 1000000, // $10,000/yr in cents (10 months — 2 free)
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || 'price_growth_placeholder',
    annualPriceId: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || 'price_growth_annual_placeholder',
    features: ['5 Custom AI Agents', 'Priority Support', 'Weekly Reports', 'Mini Bot Access'],
  },
  scale: {
    name: 'Takeover',
    amount: 150000, // $1,500/mo in cents
    annualAmount: 1500000, // $15,000/yr in cents (10 months — 2 free)
    priceId: process.env.STRIPE_SCALE_PRICE_ID || 'price_scale_placeholder',
    annualPriceId: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID || 'price_scale_annual_placeholder',
    features: ['Unlimited AI Agents', 'Dedicated Account Manager', 'Daily Reports', 'Mini Bot + Custom Integrations'],
  },
} as const

export type PlanId = 'starter' | 'growth' | 'scale'

export function getPlan(planId: PlanId) {
  return PLANS[planId]
}
