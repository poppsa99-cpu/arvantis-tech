'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { ShineBorder } from '@/components/ui/shine-border'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import {
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Loader2,
  TrendingUp,
  Pause,
  ArrowDown,
  Calendar,
  Shield,
  Zap,
  Gift,
  ChevronRight,
  X,
} from 'lucide-react'

/* ── Types ── */
type Profile = {
  subscription_status: string | null
  subscription_plan: string | null
  stripe_customer_id: string | null
  setup_fee_paid: boolean
  current_period_end: string | null
  created_at: string | null
  payment_failures: number | null
  dunning_stage: string | null
  last_payment_at: string | null
}

/* ── Plan config ── */
const planNames: Record<string, string> = {
  starter: 'Autopilot',
  growth: 'Overdrive',
  scale: 'Takeover',
}

const planPrices: Record<string, number> = {
  starter: 700,
  growth: 1000,
  scale: 1500,
}

const planOrder = ['starter', 'growth', 'scale']

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', color: 'text-emerald-400', bgColor: 'bg-emerald-500/[0.06] border-emerald-500/15', icon: CheckCircle2 },
  trialing: { label: 'Trial — Monthly billing starts next month', color: 'text-blue-400', bgColor: 'bg-blue-500/[0.06] border-blue-500/15', icon: Clock },
  past_due: { label: 'Payment Failed', color: 'text-amber-400', bgColor: 'bg-amber-500/[0.06] border-amber-500/20', icon: AlertTriangle },
  canceled: { label: 'Canceled', color: 'text-red-400', bgColor: 'bg-red-500/[0.06] border-red-500/15', icon: X },
  incomplete: { label: 'Setup Incomplete', color: 'text-amber-400', bgColor: 'bg-amber-500/[0.06] border-amber-500/20', icon: Clock },
  paused: { label: 'Paused', color: 'text-muted-foreground', bgColor: 'bg-[var(--background-50)] border-[var(--card-border)]', icon: Pause },
}

/* ── Cancel reason → save offer mapping (billing agent brain §2.4) ── */
const cancelReasons = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_using', label: 'Not using it enough' },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'competitor', label: 'Switching to another solution' },
  { id: 'business_change', label: 'Business closing or changing' },
  { id: 'other', label: 'Other reason' },
]

const saveOffers: Record<string, { icon: typeof Gift; title: string; description: string; cta: string; action: string }> = {
  too_expensive: {
    icon: ArrowDown,
    title: 'How about a lower plan?',
    description: 'Downgrade to keep your core agents running at a lower cost. You can always upgrade again later.',
    cta: 'Downgrade Plan',
    action: 'downgrade',
  },
  not_using: {
    icon: Pause,
    title: 'Pause instead of cancel?',
    description: 'Take a 1-3 month break. Your agents and settings stay saved. Resume anytime with one click.',
    cta: 'Pause Subscription',
    action: 'pause',
  },
  missing_features: {
    icon: Zap,
    title: 'Let us know what you need',
    description: 'We build custom features for clients. Tell us what\'s missing and we\'ll prioritize it on our roadmap.',
    cta: 'Request a Feature',
    action: 'feedback',
  },
  competitor: {
    icon: Shield,
    title: 'We\'d love a chance to match it',
    description: 'We\'ll match any competitor\'s offer and add a free workflow audit. Your agents are already custom-built — switching means rebuilding from scratch.',
    cta: 'Talk to Us',
    action: 'retention_call',
  },
  business_change: {
    icon: Pause,
    title: 'Pause while things settle?',
    description: 'Put your subscription on hold for up to 3 months. Everything stays ready for when you\'re back.',
    cta: 'Pause Subscription',
    action: 'pause',
  },
  other: {
    icon: Gift,
    title: 'Before you go...',
    description: 'We\'d love to understand what happened. Book a 10-minute call and we\'ll see if there\'s anything we can do.',
    cta: 'Book a Call',
    action: 'retention_call',
  },
}

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState<string | null>(null)
  const [showSaveOffer, setShowSaveOffer] = useState(false)
  const [portalError, setPortalError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_plan, stripe_customer_id, setup_fee_paid, current_period_end, created_at, payment_failures, dunning_stage, last_payment_at')
      .eq('id', user.id)
      .single()

    setProfile(data)
    setLoading(false)
  }

  async function openPortal() {
    setPortalLoading(true)
    setPortalError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setPortalError(data.error || 'Failed to open billing portal')
      }
    } catch {
      setPortalError('Failed to connect. Please try again.')
    }
    setPortalLoading(false)
  }

  function handleCancelReasonSelect(reasonId: string) {
    setCancelReason(reasonId)
    setShowSaveOffer(true)
  }

  async function handleSaveAction(action: string) {
    if (action === 'downgrade' || action === 'pause') {
      // Opens Stripe portal where they can downgrade/pause
      await openPortal()
    } else if (action === 'feedback' || action === 'retention_call') {
      window.open(process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/arvantistech/30min', '_blank')
    }
    setShowCancel(false)
    setShowSaveOffer(false)
    setCancelReason(null)
  }

  async function confirmCancel() {
    // Log the cancellation reason then open Stripe portal for actual cancellation
    if (cancelReason) {
      await supabase.from('cancellation_reasons').insert({
        reason: cancelReason,
        plan: profile?.subscription_plan,
        created_at: new Date().toISOString(),
      })
    }
    await openPortal()
    setShowCancel(false)
  }

  const status = profile?.subscription_status || 'none'
  const statusInfo = statusConfig[status] || { label: 'No Subscription', color: 'text-muted-foreground', bgColor: 'bg-[var(--background-50)] border-[var(--card-border)]', icon: Clock }
  const StatusIcon = statusInfo.icon

  // Calculate tenure
  const tenureMonths = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0

  // Annual savings calculation (billing brain §3.2 — "2 months free" framing)
  const currentPrice = profile?.subscription_plan ? planPrices[profile.subscription_plan] || 0 : 0
  const annualSavings = currentPrice * 2 // 2 months free on annual

  // Can upgrade?
  const currentPlanIndex = planOrder.indexOf(profile?.subscription_plan || '')
  const canUpgrade = currentPlanIndex >= 0 && currentPlanIndex < planOrder.length - 1
  const nextPlan = canUpgrade ? planOrder[currentPlanIndex + 1] : null

  // Dunning state (billing brain §1.4)
  const failureCount = profile?.payment_failures || 0
  const isInDunning = status === 'past_due' && failureCount > 0
  const graceDeadline = profile?.current_period_end
    ? new Date(new Date(profile.current_period_end).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent z-50" />
      <DotPattern width={24} height={24} cr={0.8} className="text-slate-700/15 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]" />

      <nav className="relative z-10 max-w-3xl mx-auto px-6 pt-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <BlurFade delay={0.1} duration={0.5}>
          <h1 className="text-2xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground text-sm mb-8">Manage your plan, payment method, and invoices.</p>
        </BlurFade>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* ─── DUNNING BANNER — Escalating urgency (billing brain §1.4) ─── */}
            {isInDunning && (
              <BlurFade delay={0.12} duration={0.5}>
                <div role="alert" className={`rounded-xl p-5 flex items-start gap-3 ${
                  failureCount >= 3
                    ? 'bg-red-500/[0.06] border border-red-500/20'
                    : 'bg-amber-500/[0.06] border border-amber-500/20'
                }`}>
                  <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${failureCount >= 3 ? 'text-red-400' : 'text-amber-400'}`} />
                  <div className="flex-1">
                    {failureCount === 1 && (
                      <>
                        <p className="text-sm font-medium text-amber-400 mb-1">Your last payment couldn&apos;t be processed</p>
                        <p className="text-xs text-muted-foreground">This is usually a temporary issue. Please update your payment method to keep your AI agents running without interruption.</p>
                      </>
                    )}
                    {failureCount === 2 && (
                      <>
                        <p className="text-sm font-medium text-amber-400 mb-1">Action needed — your subscription is at risk</p>
                        <p className="text-xs text-muted-foreground">We&apos;ve been unable to process your payment after multiple attempts. Update your payment method to avoid service interruption. Your AI agents are still running during this grace period.</p>
                      </>
                    )}
                    {failureCount >= 3 && (
                      <>
                        <p className="text-sm font-medium text-red-400 mb-1">Final notice — your agents will be paused {graceDeadline ? `on ${graceDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'soon'}</p>
                        <p className="text-xs text-muted-foreground">We don&apos;t want to lose you. Update your payment method now to keep everything running. All your custom workflows and configurations are safe.</p>
                      </>
                    )}
                    <button
                      onClick={openPortal}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--background-50)] border border-[var(--card-border)] text-sm font-medium text-foreground hover:bg-[var(--foreground-30)] transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Update Payment Method
                    </button>
                  </div>
                </div>
              </BlurFade>
            )}

            {/* ─── CURRENT PLAN CARD ─── */}
            <BlurFade delay={0.15} duration={0.5}>
              <div className="relative bg-[var(--card-80)] border border-[var(--card-border)] rounded-2xl p-6">
                <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={12} />
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground tracking-[0.15em] uppercase mb-1">Current Plan</p>
                    <h2 className="text-xl font-bold">
                      {profile?.subscription_plan ? planNames[profile.subscription_plan] || profile.subscription_plan : 'No Plan'}
                    </h2>
                    {tenureMonths > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Member for {tenureMonths} month{tenureMonths !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${statusInfo.bgColor} ${statusInfo.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{statusInfo.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Monthly Price</p>
                    <p className="text-lg font-semibold">
                      {currentPrice ? `$${currentPrice.toLocaleString()}/mo` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Daily Cost</p>
                    <p className="text-lg font-semibold">
                      {currentPrice ? `$${Math.round(currentPrice / 30)}/day` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Setup Fee</p>
                    <p className="text-lg font-semibold">
                      {profile?.setup_fee_paid ? (
                        <span className="flex items-center gap-1.5">
                          $1,500 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </span>
                      ) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Next Billing</p>
                    <p className="text-lg font-semibold">
                      {profile?.current_period_end
                        ? new Date(profile.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {profile?.stripe_customer_id && (
                    <ShimmerButton
                      onClick={openPortal}
                      disabled={portalLoading}
                      aria-label="Open Stripe billing portal"
                      shimmerColor="rgba(255,255,255,0.12)"
                      shimmerSize="0.06em"
                      shimmerDuration="2.5s"
                      borderRadius="0.75rem"
                      background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
                      className="h-11 px-6 text-sm font-medium disabled:opacity-40"
                    >
                      {portalLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Opening...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Manage Billing
                          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </span>
                      )}
                    </ShimmerButton>
                  )}

                  {(status === 'active' || status === 'trialing') && (
                    <button
                      onClick={() => setShowCancel(true)}
                      className="h-11 px-5 rounded-xl text-sm text-muted-foreground hover:text-foreground border border-[var(--card-border)] hover:border-[var(--foreground-30)] transition-all"
                    >
                      Cancel Plan
                    </button>
                  )}
                </div>
              </div>
            </BlurFade>

            {/* ─── UPGRADE CARD (billing brain §3.1 — expansion revenue) ─── */}
            {canUpgrade && nextPlan && (status === 'active' || status === 'trialing') && (
              <BlurFade delay={0.2} duration={0.5}>
                <div className="bg-gradient-to-r from-blue-500/[0.04] to-indigo-500/[0.04] border border-blue-500/10 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Upgrade to {planNames[nextPlan]}</p>
                      <p className="text-xs text-muted-foreground">
                        Unlock more agents and priority features — ${planPrices[nextPlan].toLocaleString()}/mo
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={openPortal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-sm font-medium text-blue-400 hover:bg-blue-500/30 transition-colors shrink-0"
                  >
                    Upgrade
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </BlurFade>
            )}

            {/* ─── ANNUAL SAVINGS (billing brain §3.2 — "2 months free" framing) ─── */}
            {annualSavings > 0 && tenureMonths >= 3 && (status === 'active') && (
              <BlurFade delay={0.25} duration={0.5}>
                <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Switch to annual & save ${annualSavings.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Get 2 months free — pay ${(currentPrice * 10).toLocaleString()}/yr instead of ${(currentPrice * 12).toLocaleString()}/yr
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={openPortal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-sm font-medium text-amber-400 hover:bg-amber-500/30 transition-colors shrink-0"
                  >
                    Save ${annualSavings.toLocaleString()}
                  </button>
                </div>
              </BlurFade>
            )}

            {/* ─── NO SUBSCRIPTION ─── */}
            {!profile?.stripe_customer_id && (
              <BlurFade delay={0.2} duration={0.5}>
                <div className="bg-blue-500/[0.04] border border-blue-500/15 rounded-xl p-6 text-center">
                  <CreditCard className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">No active subscription</p>
                  <p className="text-xs text-[var(--muted-dim)] mb-4">Get started with your AI agent team today.</p>
                  <Link
                    href="/pay"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    View Plans
                  </Link>
                </div>
              </BlurFade>
            )}

            {/* ─── CANCELED — Win-back (billing brain §2.6) ─── */}
            {status === 'canceled' && (
              <BlurFade delay={0.2} duration={0.5}>
                <div className="bg-gradient-to-br from-blue-500/[0.04] to-indigo-500/[0.04] border border-blue-500/15 rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Your subscription has been canceled.</p>
                  <p className="text-xs text-[var(--muted-dim)] mb-4">
                    Your custom AI agents and workflows are still saved. Reactivate anytime to pick up right where you left off.
                  </p>
                  <Link
                    href="/pay"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    Reactivate Subscription
                  </Link>
                </div>
              </BlurFade>
            )}

            {/* ─── CANCELLATION FLOW (billing brain §2.4 — max 5 steps) ─── */}
            {showCancel && (
              <BlurFade delay={0.1} duration={0.3}>
                <div className="bg-background/90 border border-[var(--card-border)] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold">
                      {showSaveOffer ? 'Before you go...' : 'We\'re sorry to see you go'}
                    </h3>
                    <button
                      onClick={() => { setShowCancel(false); setShowSaveOffer(false); setCancelReason(null) }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {!showSaveOffer ? (
                    <>
                      {/* Step 1: Ask why */}
                      <p className="text-sm text-muted-foreground mb-4">Help us improve — what&apos;s the main reason you&apos;re considering canceling?</p>
                      <div className="space-y-2" role="group" aria-label="Cancellation reasons">
                        {cancelReasons.map(reason => (
                          <button
                            key={reason.id}
                            onClick={() => handleCancelReasonSelect(reason.id)}
                            className="w-full text-left px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--background-50)] hover:border-blue-500/30 hover:bg-blue-500/[0.04] transition-all text-sm text-muted-foreground"
                          >
                            {reason.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : cancelReason && (
                    <>
                      {/* Step 2: Personalized save offer */}
                      {(() => {
                        const offer = saveOffers[cancelReason]
                        const OfferIcon = offer.icon
                        return (
                          <div className="bg-blue-500/[0.04] border border-blue-500/15 rounded-xl p-5 mb-5">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                <OfferIcon className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground mb-1">{offer.title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{offer.description}</p>
                                <button
                                  onClick={() => handleSaveAction(offer.action)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                                >
                                  {offer.cta}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Step 3: Confirm cancel */}
                      <div className="border-t border-[var(--card-border)] pt-4">
                        <button
                          onClick={confirmCancel}
                          className="text-sm text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          No thanks, proceed with cancellation →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </BlurFade>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
