'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { ShineBorder } from '@/components/ui/shine-border'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import {
  CheckCircle2,
  Shield,
  Lock,
  CreditCard,
  ArrowRight,
  Zap,
  Clock,
  ArrowLeft,
  Gift,
  BadgeCheck,
  ChevronDown,
  Star,
  Users,
  ShieldCheck,
  X,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Timer,
  Crown,
  Rocket,
  Brain,
} from 'lucide-react'

/* ── Tier data ── */
const tiers = [
  {
    id: 'starter',
    name: 'Autopilot',
    subtitle: 'For businesses ready to automate their first workflows',
    monthlyPrice: 700,
    annualPrice: 583,
    annualTotal: 7000,
    monthlySavings: 1400,
    daily: { monthly: '$23', annual: '$19' },
    badge: null,
    icon: Rocket,
    features: [
      { text: '3 Custom AI Agents', included: true },
      { text: 'Email Support (24hr response)', included: true },
      { text: 'Monthly Performance Reports', included: true },
      { text: 'Standard Dashboard Access', included: true },
      { text: 'Business Hours Monitoring', included: true },
      { text: 'Mini Bot Access', included: false },
      { text: 'Dedicated Account Manager', included: false },
      { text: 'Custom Integrations', included: false },
    ],
    highlight: false,
    gradient: 'from-slate-500/20 to-slate-600/5',
    accentColor: 'slate',
  },
  {
    id: 'growth',
    name: 'Overdrive',
    subtitle: 'For growing teams that want AI working around the clock',
    monthlyPrice: 1000,
    annualPrice: 833,
    annualTotal: 10000,
    monthlySavings: 2000,
    daily: { monthly: '$33', annual: '$27' },
    badge: 'Most Popular',
    icon: TrendingUp,
    features: [
      { text: '5 Custom AI Agents', included: true },
      { text: 'Priority Support (< 2hr response)', included: true },
      { text: 'Weekly Performance Reports', included: true },
      { text: 'Full Dashboard + Analytics', included: true },
      { text: '24/7 Agent Monitoring', included: true },
      { text: 'Mini Bot Access', included: true },
      { text: 'Performance Optimization', included: true },
      { text: 'Custom Integrations', included: false },
    ],
    highlight: true,
    gradient: 'from-blue-500/20 to-indigo-600/10',
    accentColor: 'blue',
  },
  {
    id: 'scale',
    name: 'Takeover',
    subtitle: 'Full-service AI operations with white-glove everything',
    monthlyPrice: 1500,
    annualPrice: 1250,
    annualTotal: 15000,
    monthlySavings: 3000,
    daily: { monthly: '$50', annual: '$41' },
    badge: 'Maximum ROI',
    icon: Crown,
    features: [
      { text: 'Unlimited AI Agents', included: true },
      { text: 'Dedicated Account Manager', included: true },
      { text: 'Daily Performance Reports', included: true },
      { text: 'Full Dashboard + Custom Analytics', included: true },
      { text: '24/7 Priority Monitoring & Alerts', included: true },
      { text: 'Mini Bot + Custom Integrations', included: true },
      { text: 'White-Glove Onboarding', included: true },
      { text: 'On-Demand Workflow Builds', included: true },
    ],
    highlight: false,
    gradient: 'from-amber-500/15 to-orange-600/5',
    accentColor: 'amber',
  },
]

const setupFeatures = [
  'Full discovery call & workflow mapping',
  'Custom AI agents built for YOUR niche',
  'Brand voice & tone calibration',
  'Full portal access & dashboard setup',
  'Delivered in under 1 week',
]

const bonuses = [
  { name: 'Complete Workflow Audit', value: '$500', icon: Brain },
  { name: 'Custom Brand Voice Training', value: '$800', icon: Sparkles },
  { name: 'Priority Onboarding & Setup', value: '$400', icon: Timer },
  { name: '30-Day Performance Guarantee', value: '$1,000', icon: ShieldCheck },
  { name: 'Lifetime Agent Upgrades', value: '$1,500+', icon: TrendingUp },
]

const faqs = [
  {
    q: 'What if I need more agents later?',
    a: 'You can upgrade your plan anytime — we\'ll add new agents to your existing setup with zero downtime. Most clients start on the Overdrive and scale up within 60 days because they see the ROI immediately.',
  },
  {
    q: 'How is this different from hiring a VA or marketing agency?',
    a: 'A VA handles one task at a time during business hours. Our AI agents handle dozens of tasks simultaneously, 24/7, with zero sick days, zero training time, and zero HR headaches. And they cost a fraction of one employee\'s salary.',
  },
  {
    q: 'What happens if I\'m not satisfied?',
    a: 'Your monthly subscription doesn\'t even start until your agents are live and producing results. If within the first 30 days of your subscription you\'re not seeing value, you get a full refund — no questions asked.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No long-term contracts. Your subscription can be canceled anytime through your billing dashboard. We don\'t lock you in because we don\'t need to — clients stay because the results speak for themselves.',
  },
]

/* What you'd normally pay — the human team */
const humanTeamCosts = [
  { role: 'Virtual Assistant', cost: '$3,000', slash: true },
  { role: 'Marketing Specialist', cost: '$5,500', slash: true },
  { role: 'Customer Support Rep', cost: '$3,500', slash: true },
  { role: 'Billing / Admin Staff', cost: '$3,000', slash: true },
]

export default function PayPage() {
  const [selectedTier, setSelectedTier] = useState<string>('growth')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [animatedTotal, setAnimatedTotal] = useState(0)
  const ctaRef = useRef<HTMLDivElement>(null)
  const isAnnual = billingCycle === 'annual'

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Animate the human team total cost
  useEffect(() => {
    const target = 15000
    const duration = 1500
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedTotal(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    const timeout = setTimeout(() => requestAnimationFrame(animate), 600)
    return () => clearTimeout(timeout)
  }, [])

  async function handleCheckout() {
    if (!selectedTier) return
    setLoading(true)
    setCheckoutError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedTier, billingCycle }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutError(data.error || 'Failed to start checkout. Please try again.')
        setLoading(false)
      }
    } catch {
      setCheckoutError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const selectedPlan = tiers.find(t => t.id === selectedTier)
  const totalBonusValue = 4200

  function scrollToCta() {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Top accent line */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent z-50" />

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.04)_0%,_transparent_70%)] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-1/4 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.03)_0%,_transparent_70%)] pointer-events-none z-0" />

      <DotPattern
        width={32}
        height={32}
        cr={0.6}
        className="text-slate-700/10 [mask-image:radial-gradient(800px_circle_at_50%_20%,white,transparent)]"
      />

      {/* Nav */}
      <nav className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 pt-6 sm:pt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 py-10 sm:py-14">

        {/* ─── HEADER ─── */}
        <BlurFade delay={0.05} duration={0.5}>
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-5">
              <Image src="/arvantis-logo.png" alt="Arvantis Tech" width={80} height={80} className="rounded-xl" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/[0.08] border border-blue-500/15 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-blue-400 tracking-wide uppercase font-medium">Step 3 of 4 — Select Your Plan</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
              Replace Your Team With{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
                  AI Agents
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-400/0 via-blue-500/50 to-indigo-400/0" />
              </span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Your custom plan was discussed on your discovery call. Select your tier below — every plan includes the full done-for-you build.
            </p>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PRICE ANCHOR — What you'd normally pay for a human team */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.1} duration={0.5}>
          <div className="max-w-4xl mx-auto mb-16">
            <div className="text-center mb-5">
              <p className="text-xs text-red-400/70 tracking-[0.2em] uppercase font-medium">What You&apos;d Normally Pay</p>
            </div>

            <div className="relative bg-[#080d19]/60 border border-white/[0.04] rounded-2xl overflow-hidden">
              {/* Diagonal strike-through overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-[0.07]">
                <div className="w-[140%] h-[2px] bg-red-400 rotate-[-8deg]" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Left: Human team costs */}
                <div className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <p className="text-xs text-red-400/80 tracking-[0.12em] uppercase font-medium">Hiring Humans</p>
                  </div>

                  <div className="space-y-3 mb-5">
                    {humanTeamCosts.map(item => (
                      <div key={item.role} className="flex items-center justify-between group">
                        <span className="text-sm text-slate-500">{item.role}</span>
                        <span className="text-sm text-red-400/50 line-through font-medium">{item.cost}/mo</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/[0.06] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Total monthly cost</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-red-400 line-through">${animatedTotal.toLocaleString()}</span>
                        <span className="text-sm text-red-400/60 ml-1">/mo</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">That&apos;s <span className="text-red-400/60 font-medium">${(animatedTotal * 12).toLocaleString()}/year</span> before benefits, training, and turnover</p>
                  </div>
                </div>

                {/* Right: Arvantis solution */}
                <div className="p-6 sm:p-8 bg-blue-500/[0.02]">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-xs text-emerald-400 tracking-[0.12em] uppercase font-medium">Arvantis AI Agents</p>
                  </div>

                  <div className="flex items-baseline gap-2 mb-1">
                    {isAnnual ? (
                      <>
                        <span className="text-4xl sm:text-5xl font-bold text-white">$583</span>
                        <span className="text-slate-500 text-sm">– $1,250/mo</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl sm:text-5xl font-bold text-white">$700</span>
                        <span className="text-slate-500 text-sm">– $1,500/mo</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                      <TrendingUp className="w-3 h-3" />
                      Save up to 95%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      'Works 24/7 — no breaks, no sick days',
                      'Zero training or onboarding time',
                      'No benefits, no HR, no overhead',
                      'Scales instantly — no hiring process',
                      'Gets smarter over time automatically',
                    ].map(item => (
                      <div key={item} className="flex items-center gap-2.5 text-[13px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={scrollToCta}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    See pricing below
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SETUP FEE — $1,500 one-time */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.15} duration={0.5}>
          <div className="max-w-4xl mx-auto mb-16">
            <div className="relative bg-gradient-to-br from-[#0a1628]/80 to-[#080d19]/80 border border-blue-500/10 rounded-2xl p-6 sm:p-8 overflow-hidden">
              <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={12} />

              {/* Subtle grid bg */}
              <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

              <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-blue-400 tracking-[0.15em] uppercase font-medium">One-Time Investment</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-bold">$1,500</span>
                        <span className="text-slate-500 text-sm">done-for-you setup</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm mb-4 max-w-md">
                    We build everything <span className="text-white font-medium">for you</span> — custom AI agents tailored to your business, your industry, your workflows. You don&apos;t touch the tech.
                  </p>

                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-400">
                      Monthly subscription starts <span className="font-semibold">after</span> your agents are live & producing
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 sm:pt-2">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-3 font-medium">What&apos;s included</p>
                  <ul className="space-y-2.5">
                    {setupFeatures.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PRICING TIERS */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.2} duration={0.5}>
          <div className="text-center mb-8">
            <p className="text-[11px] text-blue-400 tracking-[0.2em] uppercase mb-2 font-medium">Monthly Plans</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Pick the Speed You Want to Grow
            </h2>
            <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">Your tier was discussed on your discovery call. Billing starts next month — after your agents are live.</p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <button
                onClick={() => setBillingCycle('monthly')}
                aria-pressed={billingCycle === 'monthly'}
                aria-label="Monthly billing"
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isAnnual ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                aria-pressed={billingCycle === 'annual'}
                aria-label="Annual billing"
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isAnnual ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Annual
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isAnnual ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  2 MONTHS FREE
                </span>
              </button>
            </div>
          </div>
        </BlurFade>

        <div role="radiogroup" className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-6">
          {tiers.map((tier, i) => {
            const TierIcon = tier.icon
            return (
              <BlurFade key={tier.id} delay={0.25 + i * 0.08} duration={0.5}>
                <button
                  onClick={() => setSelectedTier(tier.id)}
                  aria-selected={selectedTier === tier.id}
                  className={`group relative w-full text-left rounded-2xl transition-all duration-300 flex flex-col h-full overflow-hidden ${
                    selectedTier === tier.id
                      ? 'bg-[#0a1628]/90 border-blue-500/30 border shadow-xl shadow-blue-950/40 scale-[1.01]'
                      : 'bg-[#080d19]/60 border border-white/[0.04] hover:border-white/[0.08] hover:bg-[#0a1020]/70'
                  } ${tier.highlight ? 'md:-mt-3 md:mb-[-12px]' : ''}`}
                >
                  {selectedTier === tier.id && (
                    <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={8} />
                  )}

                  {/* Tier gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  {tier.badge && (
                    <div className="absolute -top-0 left-0 right-0 flex justify-center" style={{ transform: 'translateY(-50%)' }}>
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg ${
                        tier.badge === 'Most Popular'
                          ? 'bg-blue-500 text-white shadow-blue-500/25'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20'
                      }`}>
                        {tier.badge === 'Most Popular' ? <Star className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  <div className="relative p-6 flex flex-col h-full">
                    {/* Icon + name */}
                    <div className="flex items-center gap-2.5 mb-3 mt-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tier.accentColor === 'blue' ? 'bg-blue-500/10 border border-blue-500/20' :
                        tier.accentColor === 'amber' ? 'bg-amber-500/10 border border-amber-500/20' :
                        'bg-slate-500/10 border border-slate-500/20'
                      }`}>
                        <TierIcon className={`w-4 h-4 ${
                          tier.accentColor === 'blue' ? 'text-blue-400' :
                          tier.accentColor === 'amber' ? 'text-amber-400' :
                          'text-slate-400'
                        }`} />
                      </div>
                      <p className={`text-sm tracking-wide uppercase font-semibold ${
                        tier.accentColor === 'blue' ? 'text-blue-400' :
                        tier.accentColor === 'amber' ? 'text-amber-400' :
                        'text-slate-400'
                      }`}>{tier.name}</p>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-3xl sm:text-4xl font-bold">
                        ${isAnnual ? tier.annualPrice.toLocaleString() : tier.monthlyPrice.toLocaleString()}
                      </span>
                      <span className="text-slate-500 text-sm">/mo</span>
                      {isAnnual && (
                        <span className="text-xs text-slate-600 line-through ml-1">${tier.monthlyPrice.toLocaleString()}</span>
                      )}
                    </div>

                    {isAnnual ? (
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-[11px] text-slate-600">
                          ${tier.annualTotal.toLocaleString()}/yr — {tier.daily.annual}/day
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                          Save ${tier.monthlySavings.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600 mb-3">That&apos;s just {tier.daily.monthly}/day</p>
                    )}

                    <p className="text-slate-400 text-[13px] leading-relaxed mb-5">{tier.subtitle}</p>

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1">
                      {tier.features.map(f => (
                        <li key={f.text} className={`flex items-start gap-2.5 text-[13px] ${f.included ? 'text-slate-300' : 'text-slate-600'}`}>
                          {f.included ? (
                            <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                              tier.accentColor === 'blue' ? 'text-blue-400' :
                              tier.accentColor === 'amber' ? 'text-amber-400' :
                              'text-slate-400'
                            }`} />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-700 mt-0.5 shrink-0" />
                          )}
                          {f.text}
                        </li>
                      ))}
                    </ul>

                    {/* Select button */}
                    <div className="mt-5 pt-4 border-t border-white/[0.04]">
                      <div className={`w-full h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                        selectedTier === tier.id
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white/[0.02] text-slate-500 border border-white/[0.06] group-hover:border-white/[0.1] group-hover:text-slate-400'
                      }`}>
                        {selectedTier === tier.id ? (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selected
                          </span>
                        ) : 'Select Plan'}
                      </div>
                    </div>
                  </div>
                </button>
              </BlurFade>
            )
          })}
        </div>

        <BlurFade delay={0.45} duration={0.5}>
          <p className="text-center text-xs text-slate-600 mb-16">
            Most businesses choose <span className="text-blue-400 font-medium">Overdrive</span> — it&apos;s our most popular plan for a reason
          </p>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BONUS STACK — $4,200+ in bonuses */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.45} duration={0.5}>
          <div className="max-w-4xl mx-auto mb-16">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/15 mb-3">
                <Gift className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-400 tracking-wide uppercase font-medium">Included Free With Every Plan</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                <span className="text-amber-400">${totalBonusValue.toLocaleString()}+</span> in Bonuses — Yours Free
              </h2>
              <p className="text-slate-500 text-sm mt-2">Because we want to eliminate every reason not to start</p>
            </div>

            <div className="relative bg-gradient-to-br from-amber-500/[0.03] to-[#080d19]/60 border border-amber-500/10 rounded-2xl p-5 sm:p-7 overflow-hidden">
              {/* Subtle amber glow */}
              <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.04)_0%,_transparent_70%)] pointer-events-none" />

              <div className="relative space-y-2.5">
                {bonuses.map(bonus => {
                  const BonusIcon = bonus.icon
                  return (
                    <div key={bonus.name} className="flex items-center justify-between bg-white/[0.015] hover:bg-white/[0.03] border border-white/[0.04] rounded-xl px-5 py-4 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/15 transition-colors">
                          <BonusIcon className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-sm text-white font-medium">{bonus.name}</span>
                      </div>
                      <span className="text-sm text-amber-400/80 font-semibold whitespace-nowrap">{bonus.value}</span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-amber-500/10 flex items-center justify-between">
                <span className="text-sm text-slate-400">Total bonus value</span>
                <span className="text-xl font-bold text-amber-400">${totalBonusValue.toLocaleString()}+</span>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* RISK REVERSAL — Dual Guarantee */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.5} duration={0.5}>
          <div className="max-w-3xl mx-auto mb-16">
            <div className="text-center mb-6">
              <p className="text-[11px] text-emerald-400 tracking-[0.2em] uppercase font-medium mb-1">Zero Risk</p>
              <h2 className="text-2xl font-bold">Double Guarantee</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl p-5 sm:p-6 overflow-hidden">
                <div className="absolute top-3 right-3 w-12 h-12 opacity-[0.06]">
                  <Shield className="w-full h-full text-emerald-400" />
                </div>
                <div className="flex items-center gap-2.5 mb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">30-Day Money-Back</p>
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  Your subscription doesn&apos;t start until agents are live. Not seeing results within 30 days? <span className="text-slate-300 font-medium">Full refund</span>. No questions, no hoops.
                </p>
              </div>

              <div className="relative bg-blue-500/[0.04] border border-blue-500/15 rounded-xl p-5 sm:p-6 overflow-hidden">
                <div className="absolute top-3 right-3 w-12 h-12 opacity-[0.06]">
                  <BadgeCheck className="w-full h-full text-blue-400" />
                </div>
                <div className="flex items-center gap-2.5 mb-3">
                  <BadgeCheck className="w-5 h-5 text-blue-400" />
                  <p className="text-sm font-semibold text-blue-400">3X ROI Guarantee</p>
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  Complete our onboarding checklist. If you don&apos;t see at least 3x ROI, we refund your month <span className="text-slate-300 font-medium">AND build you an extra agent free</span>.
                </p>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SOCIAL PROOF */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.55} duration={0.5}>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex -space-x-2.5">
                {[
                  'from-blue-400 to-blue-600',
                  'from-indigo-400 to-indigo-600',
                  'from-violet-400 to-violet-600',
                  'from-blue-500 to-indigo-500',
                  'from-cyan-400 to-blue-500',
                ].map((gradient, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} border-2 border-[#030712] flex items-center justify-center`}>
                    <Users className="w-3.5 h-3.5 text-white/80" />
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-sm text-white font-medium">50+ businesses</p>
                <p className="text-xs text-slate-500">already automating with Arvantis</p>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* VALUE STACK + CTA */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.55} duration={0.5}>
          <div ref={ctaRef} className="max-w-xl mx-auto mb-16">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Here&apos;s Everything You Get</h2>
            </div>

            <div className="bg-[#080d19]/80 border border-white/[0.04] rounded-2xl p-6 sm:p-7 mb-5">
              {/* Stack items */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Done-for-you AI agent build</span>
                  <span className="text-sm text-slate-500">$1,500</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{selectedPlan?.name} plan ({selectedPlan?.features[0].text})</span>
                  <span className="text-sm text-slate-500">${selectedPlan ? (isAnnual ? selectedPlan.annualPrice : selectedPlan.monthlyPrice).toLocaleString() : '1,000'}/mo</span>
                </div>
                {bonuses.map(b => (
                  <div key={b.name} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{b.name}</span>
                    <span className="text-sm text-slate-500">{b.value}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-white/[0.06] pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Total value</span>
                  <span className="text-lg text-slate-500 line-through">$19,700+</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-semibold text-white">You pay today</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">One-time setup — we build your agents</p>
                  </div>
                  <span className="text-3xl font-bold text-white">$1,500</span>
                </div>

                <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-blue-500/[0.04] border border-blue-500/15">
                  <div>
                    <span className="text-sm text-blue-300 font-medium">Starting next month</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">After agents are live & producing</p>
                  </div>
                  <div className="text-right">
                    {isAnnual && selectedPlan ? (
                      <>
                        <span className="text-lg font-bold text-blue-400">${selectedPlan.annualTotal.toLocaleString()}/yr</span>
                        <p className="text-[11px] text-emerald-400/70 font-medium">Save ${selectedPlan.monthlySavings.toLocaleString()}</p>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-blue-400">${selectedPlan?.monthlyPrice.toLocaleString()}/mo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {checkoutError && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/10 mb-4" role="alert">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400/90 text-[13px] leading-relaxed">{checkoutError}</p>
              </div>
            )}

            {/* CTA Button */}
            <ShimmerButton
              onClick={handleCheckout}
              disabled={!selectedTier || loading}
              shimmerColor="rgba(255,255,255,0.12)"
              shimmerSize="0.06em"
              shimmerDuration="2.5s"
              borderRadius="0.75rem"
              background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
              className="w-full h-14 text-base font-medium disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Pay Setup Fee — We Start Building Today
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </ShimmerButton>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-5 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="w-3 h-3" />
                256-bit SSL
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Shield className="w-3 h-3" />
                Powered by Stripe
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                Cancel anytime
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* COST OF INACTION — Urgency */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.6} duration={0.5}>
          <div className="max-w-2xl mx-auto mb-16">
            <div className="relative bg-red-500/[0.03] border border-red-500/10 rounded-xl p-6 sm:p-7 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.03)_0%,_transparent_70%)] pointer-events-none" />
              <AlertTriangle className="w-5 h-5 text-red-400/70 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-medium mb-1">Every month without AI agents costs you</p>
              <p className="text-3xl sm:text-4xl font-bold text-red-400 mb-2">$15,000+ in wasted labor</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">That&apos;s the cost of the human team you&apos;re paying for right now. Start today for $1,500, and your AI agents are working for you before the end of the week.</p>
            </div>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* FAQ — Objection handling */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.65} duration={0.5}>
          <div className="max-w-2xl mx-auto mb-16">
            <h3 className="text-xl font-bold text-center mb-8">Common Questions</h3>
            <div className="space-y-2.5">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-[#080d19]/60 border border-white/[0.04] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.01] transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-200 pr-4">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48 pb-4' : 'max-h-0'}`}>
                    <p className="px-5 text-[13px] text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* FINAL CTA — Columbo Close */}
        {/* ═══════════════════════════════════════════════════════ */}
        <BlurFade delay={0.7} duration={0.5}>
          <div className="max-w-xl mx-auto text-center mb-10">
            <p className="text-slate-500 text-sm mb-5">
              Oh, one more thing — start today and you lock in this price permanently. We raise prices as we add more capabilities.
            </p>
            <ShimmerButton
              onClick={handleCheckout}
              disabled={!selectedTier || loading}
              shimmerColor="rgba(255,255,255,0.12)"
              shimmerSize="0.06em"
              shimmerDuration="2.5s"
              borderRadius="0.75rem"
              background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
              className="h-13 px-10 text-base font-medium mx-auto disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                Lock In Your Price — Get Started Now
                <ArrowRight className="w-4 h-4" />
              </span>
            </ShimmerButton>
          </div>
        </BlurFade>

        {/* Funnel progress */}
        <BlurFade delay={0.75} duration={0.5}>
          <div className="flex items-center justify-center gap-2 mt-4 mb-4 flex-wrap">
            {['Book a Call', 'Discovery Call', 'Payment', 'Sign Up'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${i <= 2 ? 'bg-blue-500' : 'bg-white/10'}`} />
                <span className={`text-xs ${i <= 2 ? 'text-blue-400 font-medium' : 'text-slate-600'}`}>{label}</span>
                {i < 3 && <div className="w-6 h-[1px] bg-white/[0.06]" />}
              </div>
            ))}
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
