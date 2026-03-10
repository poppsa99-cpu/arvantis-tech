'use client'

import { useEffect, useState } from 'react'
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
  Gem,
  X,
  AlertTriangle,
} from 'lucide-react'

/* ── Tier data — Named with Hormozi M.A.G.I.C. ── */
/* Annual = 2 months free (billing brain §3.2 — frame as "2 months free" not "17% off") */
const tiers = [
  {
    id: 'starter',
    name: 'Autopilot',
    subtitle: 'For businesses ready to automate their first workflows',
    monthlyPrice: 700,
    annualPrice: 583, // $7,000/yr ÷ 12 = $583/mo (save $1,400)
    annualTotal: 7000,
    monthlySavings: 1400,
    daily: { monthly: '$23', annual: '$19' },
    badge: null,
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
    anchor: '$5,000',
    anchorLabel: 'Hiring 1 part-time VA',
  },
  {
    id: 'growth',
    name: 'Overdrive',
    subtitle: 'For growing teams that want AI working around the clock',
    monthlyPrice: 1000,
    annualPrice: 833, // $10,000/yr ÷ 12 = $833/mo (save $2,000)
    annualTotal: 10000,
    monthlySavings: 2000,
    daily: { monthly: '$33', annual: '$27' },
    badge: 'Most Popular',
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
    anchor: '$12,000',
    anchorLabel: 'Hiring 2 employees',
  },
  {
    id: 'scale',
    name: 'Takeover',
    subtitle: 'Full-service AI operations with white-glove everything',
    monthlyPrice: 1500,
    annualPrice: 1250, // $15,000/yr ÷ 12 = $1,250/mo (save $3,000)
    annualTotal: 15000,
    monthlySavings: 3000,
    daily: { monthly: '$50', annual: '$41' },
    badge: 'Maximum ROI',
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
    anchor: '$25,000',
    anchorLabel: 'Hiring a small team',
  },
]

const setupFeatures = [
  'Full discovery call & workflow mapping',
  'Custom AI agents built for YOUR niche',
  'Brand voice & tone calibration',
  'Full portal access & dashboard setup',
  'Delivered in under 1 week',
]

/* Bonuses — each kills a specific objection */
const bonuses = [
  { name: 'Complete Workflow Audit', value: '$500', reason: 'because we need to understand your business before we build' },
  { name: 'Custom Brand Voice Training', value: '$800', reason: 'because your AI agents should sound like you, not a robot' },
  { name: 'Priority Onboarding & Setup', value: '$400', reason: 'because we want you seeing results in days, not weeks' },
  { name: '30-Day Performance Guarantee', value: '$1,000', reason: 'because we only win when you win' },
  { name: 'Lifetime Agent Upgrades', value: '$1,500+', reason: 'because AI evolves fast and your agents should too' },
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
    a: 'Your monthly subscription doesn\'t even start until your agents are live and producing results. If within the first 30 days of your subscription you\'re not seeing value, you get a full refund — no questions asked. We also offer a conditional guarantee: complete our onboarding checklist, and if you don\'t see at least a 3x ROI, we\'ll refund AND build you an additional agent free.',
  },
  {
    q: 'I\'ve tried automation tools before and they didn\'t work.',
    a: 'That\'s exactly why we exist. Generic tools require YOU to set everything up, configure workflows, and troubleshoot. We\'re not a tool — we\'re a done-for-you service. We build custom AI agents specifically for your business, your industry, and your workflows. You don\'t touch the tech. That\'s the difference.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No long-term contracts. Your subscription can be canceled anytime through your billing dashboard. Your agents stay active through the end of your billing period. We don\'t lock you in because we don\'t need to — clients stay because the results speak for themselves.',
  },
]

/* Cost of inaction items */
const inactionCosts = [
  { item: 'Missed leads from slow follow-up', cost: '$2,100' },
  { item: 'Hours wasted on manual tasks', cost: '$1,800' },
  { item: 'Inconsistent customer support', cost: '$1,400' },
  { item: 'Social media going silent', cost: '$900' },
]

export default function PayPage() {
  const [selectedTier, setSelectedTier] = useState<string>('growth')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const isAnnual = billingCycle === 'annual'

  useEffect(() => {
    document.documentElement.classList.add('dark')
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
  const setupValue = 1500

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent z-50" />
      <DotPattern
        width={24}
        height={24}
        cr={0.8}
        className="text-slate-700/15 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.06)_0%,_transparent_70%)] pointer-events-none z-0" />

      <nav className="relative z-10 max-w-6xl mx-auto px-6 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">

        {/* ─── HEADER — Opportunity Switch Frame ─── */}
        <BlurFade delay={0.1} duration={0.5}>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Image src="/arvantis-logo.png" alt="Arvantis Tech" width={90} height={90} className="rounded-lg" />
              <span className="text-lg font-semibold">Arvantis Tech</span>
            </div>
            <p className="text-sm text-blue-400 tracking-[0.15em] uppercase mb-4">Step 3 of 4</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Stop Hiring. Start{' '}
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Automating.
              </span>
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Your custom AI plan was discussed on your discovery call. Select your tier below — every plan includes the full done-for-you build.
            </p>
          </div>
        </BlurFade>

        {/* ─── PRICE ANCHOR — Loss Frame (Kahneman) ─── */}
        <BlurFade delay={0.15} duration={0.5}>
          <div className="max-w-4xl mx-auto mb-14">
            <div className="relative bg-[#080d19]/60 border border-white/[0.04] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* The old way — loss frame */}
                <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <p className="text-xs text-red-400/80 tracking-[0.15em] uppercase font-medium">What You&apos;re Losing Every Month</p>
                  </div>
                  <div className="space-y-2 mb-4">
                    {inactionCosts.map(item => (
                      <div key={item.item} className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{item.item}</span>
                        <span className="text-red-400/70 font-medium">{item.cost}/mo</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-400">You&apos;re bleeding</span>
                    <span className="text-xl font-bold text-red-400">$6,200+/mo</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">That&apos;s $74,400/year in lost revenue and wasted labor</p>
                </div>

                {/* The Arvantis way */}
                <div className="p-6 sm:p-8 bg-blue-500/[0.02]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-xs text-emerald-400 tracking-[0.15em] uppercase font-medium">The Arvantis Solution</p>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">AI agents that replace the need for hiring:</p>
                  <div className="flex items-baseline gap-2 mb-1">
                    {isAnnual ? (
                      <>
                        <span className="text-4xl font-bold text-white">$583</span>
                        <span className="text-slate-500">– $1,250/mo</span>
                        <span className="text-xs text-emerald-400 font-medium ml-1">billed annually</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-white">$700</span>
                        <span className="text-slate-500">– $1,500/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-emerald-400 text-sm font-medium mb-4">
                    That&apos;s {selectedPlan ? (isAnnual ? selectedPlan.daily.annual : selectedPlan.daily.monthly) : '$33'}/day — less than your morning coffee run
                  </p>
                  <div className="space-y-1.5">
                    {['Works 24/7 (no breaks, no sick days)', 'Zero training or onboarding time', 'No benefits, no HR, no overhead', 'Scales instantly (no hiring process)'].map(item => (
                      <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
                        <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ─── SETUP FEE ─── */}
        <BlurFade delay={0.2} duration={0.5}>
          <div className="max-w-4xl mx-auto mb-14">
            <div className="relative bg-gradient-to-br from-[#0a1628]/80 to-[#080d19]/80 border border-blue-500/10 rounded-2xl p-6 sm:p-8">
              <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={12} />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-400 tracking-[0.15em] uppercase font-medium">Done-For-You Setup</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">$1,500</span>
                        <span className="text-slate-500 text-sm">one-time</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">
                    We build everything <span className="text-slate-300 font-medium">for you</span> — you don&apos;t touch the tech.
                  </p>
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-400">
                      Pay setup today — your monthly subscription starts <span className="font-semibold">next month</span> after your agents are live
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <ul className="space-y-2">
                    {setupFeatures.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-slate-300">
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

        {/* ─── BILLING TOGGLE + TIERS ─── */}
        <BlurFade delay={0.25} duration={0.5}>
          <div className="text-center mb-8">
            <p className="text-xs text-blue-400 tracking-[0.2em] uppercase mb-2">Choose Your Plan</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Pick the Speed You Want to Grow
            </h2>
            <p className="text-slate-500 text-sm mt-2">Discussed on your discovery call. Billing starts next month — after your agents are live and producing results.</p>

            {/* Monthly / Annual toggle */}
            <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isAnnual ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-6">
          {tiers.map((tier, i) => (
            <BlurFade key={tier.id} delay={0.3 + i * 0.08} duration={0.5}>
              <button
                onClick={() => setSelectedTier(tier.id)}
                className={`relative w-full text-left rounded-2xl p-6 transition-all duration-300 flex flex-col h-full ${
                  selectedTier === tier.id
                    ? 'bg-[#0a1628]/90 border-blue-500/30 border shadow-lg shadow-blue-950/30'
                    : 'bg-[#080d19]/60 border border-white/[0.04] hover:border-white/[0.08]'
                } ${tier.highlight ? 'md:-mt-4 md:mb-[-16px] md:pb-10' : ''}`}
              >
                {selectedTier === tier.id && (
                  <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={8} />
                )}

                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      tier.badge === 'Most Popular'
                        ? 'bg-blue-500 text-white'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {tier.badge === 'Most Popular' ? <Star className="w-3 h-3" /> : <Gem className="w-3 h-3" />}
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Per-tier anchor */}
                <div className="flex items-center gap-1.5 mb-3 mt-1">
                  <span className="text-xs text-slate-600 line-through">{tier.anchor}/mo</span>
                  <span className="text-[10px] text-slate-600">({tier.anchorLabel})</span>
                </div>

                <p className="text-sm text-blue-400 tracking-wide uppercase font-medium mb-0.5">{tier.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">
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

                <ul className="space-y-2 flex-1">
                  {tier.features.map(f => (
                    <li key={f.text} className={`flex items-start gap-2.5 text-[13px] ${f.included ? 'text-slate-300' : 'text-slate-600'}`}>
                      {f.included ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-700 mt-0.5 shrink-0" />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-white/[0.04]">
                  <div className={`w-full h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                    selectedTier === tier.id
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-white/[0.02] text-slate-500 border border-white/[0.06]'
                  }`}>
                    {selectedTier === tier.id ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected
                      </span>
                    ) : 'Select Plan'}
                  </div>
                </div>
              </button>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.5} duration={0.5}>
          <p className="text-center text-xs text-slate-600 mb-14">
            Most businesses choose <span className="text-blue-400 font-medium">Overdrive</span> — it&apos;s our most popular plan for a reason
          </p>
        </BlurFade>

        {/* ─── BONUS STACK (Hormozi: bonuses > core offer) ─── */}
        <BlurFade delay={0.5} duration={0.5}>
          <div className="max-w-4xl mx-auto mb-14">
            <div className="text-center mb-6">
              <p className="text-xs text-amber-400 tracking-[0.2em] uppercase mb-2">Included Free With Every Plan</p>
              <h2 className="text-2xl font-bold">
                ${totalBonusValue.toLocaleString()}+ in Bonuses — Yours Free
              </h2>
              <p className="text-slate-500 text-sm mt-1">Because we want to eliminate every reason not to start</p>
            </div>

            <div className="relative bg-gradient-to-br from-amber-500/[0.03] to-[#080d19]/60 border border-amber-500/10 rounded-2xl p-6 sm:p-8">
              <div className="space-y-3">
                {bonuses.map(bonus => (
                  <div key={bonus.name} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-5 py-4 gap-2">
                    <div className="flex items-start gap-3">
                      <Gift className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm text-white font-medium">{bonus.name}</span>
                        <p className="text-xs text-slate-500 mt-0.5">Included {bonus.reason}</p>
                      </div>
                    </div>
                    <span className="text-sm text-amber-400/80 font-medium whitespace-nowrap sm:text-right">{bonus.value} value</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-amber-500/10 flex items-center justify-between">
                <span className="text-sm text-slate-400">Total bonus value</span>
                <span className="text-lg font-bold text-amber-400">${totalBonusValue.toLocaleString()}+</span>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ─── VALUE STACK + CTA (Brunson Stack Slide) ─── */}
        <BlurFade delay={0.55} duration={0.5}>
          <div className="max-w-xl mx-auto mb-14">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Here&apos;s Everything You Get</h2>
            </div>

            <div className="bg-[#080d19]/80 border border-white/[0.04] rounded-2xl p-6 mb-6">
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Done-for-you AI agent build</span>
                  <span className="text-sm text-slate-400">$1,500 value</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{selectedPlan?.name} plan</span>
                  <span className="text-sm text-slate-400">{selectedPlan?.anchor} value</span>
                </div>
                {bonuses.map(b => (
                  <div key={b.name} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{b.name}</span>
                    <span className="text-sm text-slate-400">{b.value} value</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.06] pt-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">Total value</span>
                  <span className="text-lg text-slate-400 line-through">${(parseInt(selectedPlan?.anchor?.replace(/[^0-9]/g, '') || '0') + setupValue + totalBonusValue).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-semibold text-white">You pay today</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">$1,500</span>
                    <p className="text-[11px] text-slate-500">one-time setup — we build your agents</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/15">
                  <span className="text-sm text-blue-300">Starting next month</span>
                  <div className="text-right">
                    {isAnnual && selectedPlan ? (
                      <>
                        <span className="text-lg font-bold text-blue-400">${selectedPlan.annualTotal.toLocaleString()}/yr</span>
                        <p className="text-[11px] text-slate-500">${selectedPlan.annualPrice.toLocaleString()}/mo — save ${selectedPlan.monthlySavings.toLocaleString()}</p>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-blue-400">${selectedPlan?.monthlyPrice.toLocaleString()}/mo</span>
                        <p className="text-[11px] text-slate-500">after your agents are live & producing</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {checkoutError && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/10 mb-4" role="alert">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <p className="text-red-400/90 text-[13px] leading-relaxed">{checkoutError}</p>
              </div>
            )}

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

            <div className="flex items-center justify-center gap-5 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="w-3 h-3" />
                256-bit SSL
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Shield className="w-3 h-3" />
                Stripe
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                Cancel anytime
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ─── DUAL GUARANTEE (Hormozi: Unconditional + Conditional) ─── */}
        <BlurFade delay={0.6} duration={0.5}>
          <div className="max-w-3xl mx-auto mb-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">30-Day Money-Back Guarantee</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your subscription doesn&apos;t start until agents are live. Not seeing results within 30 days of launch? Full refund. No questions, no hoops.
                </p>
              </div>
              <div className="bg-blue-500/[0.04] border border-blue-500/15 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <BadgeCheck className="w-5 h-5 text-blue-400" />
                  <p className="text-sm font-semibold text-blue-400">3X ROI Performance Guarantee</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Complete our onboarding checklist within 30 days. If you don&apos;t see at least 3x ROI, we&apos;ll refund your month AND build you an extra agent free.
                </p>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ─── SOCIAL PROOF ─── */}
        <BlurFade delay={0.65} duration={0.5}>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.02] border border-white/[0.06]">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-[#030712] flex items-center justify-center">
                    <Users className="w-3 h-3 text-white" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400">
                <span className="text-white font-medium">50+ businesses</span> already automating with Arvantis
              </p>
            </div>
          </div>
        </BlurFade>

        {/* ─── COST OF INACTION — Loss Frame (repeated) ─── */}
        <BlurFade delay={0.65} duration={0.5}>
          <div className="max-w-2xl mx-auto mb-14">
            <div className="bg-red-500/[0.03] border border-red-500/10 rounded-xl p-6 text-center">
              <AlertTriangle className="w-5 h-5 text-red-400/70 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-medium mb-1">Every month without AI agents costs you</p>
              <p className="text-3xl font-bold text-red-400 mb-2">$6,200+ in lost revenue</p>
              <p className="text-xs text-slate-500">That&apos;s $74,400/year. Pay $1,500 today, we build your agents, and you don&apos;t pay monthly until they&apos;re already working for you.</p>
            </div>
          </div>
        </BlurFade>

        {/* ─── FAQ (Pre-handle objections — Fladlien) ─── */}
        <BlurFade delay={0.7} duration={0.5}>
          <div className="max-w-2xl mx-auto mb-14">
            <h3 className="text-xl font-bold text-center mb-8">Still Have Questions?</h3>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-[#080d19]/60 border border-white/[0.04] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
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

        {/* ─── FINAL CTA (Fladlien Columbo Close + Grandfathered Pricing) ─── */}
        <BlurFade delay={0.75} duration={0.5}>
          <div className="max-w-xl mx-auto text-center mb-10">
            <p className="text-slate-500 text-sm mb-4">
              Oh, one more thing — if you start today, you lock in this price permanently. We raise prices as we add more capabilities.
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
        <BlurFade delay={0.8} duration={0.5}>
          <div className="flex items-center justify-center gap-2 mt-4 mb-4">
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
