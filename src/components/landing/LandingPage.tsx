'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { ShineBorder } from '@/components/ui/shine-border'
import {
  Bot,
  Users,
  Headphones,
  FileText,
  TrendingUp,
  DollarSign,
  Share2,
  ClipboardCheck,
  Scale,
  Shield,
  Building2,
  Heart,
  Landmark,
  HardHat,
  ShoppingCart,
  Briefcase,
  Sparkles,
  Phone,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Zap,
} from 'lucide-react'

const agents = [
  { icon: Users, name: 'Sales Setter Agent', desc: 'Automated cold outreach that books qualified calls on your calendar' },
  { icon: Phone, name: 'Closer Agent', desc: 'Follow-up sequences, proposals, and objection handling via email' },
  { icon: Headphones, name: 'Customer Support Agent', desc: 'Instant responses to client questions with smart escalation' },
  { icon: DollarSign, name: 'Billing Agent', desc: 'Invoice generation, payment reminders, and accounts receivable' },
  { icon: Share2, name: 'Social Media Agent', desc: 'Auto-generated posts, captions, and scheduling for your brand' },
  { icon: FileText, name: 'Document Automation Agent', desc: 'Parse, classify, and generate business documents instantly' },
  { icon: TrendingUp, name: 'Lead Gen Agent', desc: 'Find and enrich leads matching your ideal customer profile' },
  { icon: ClipboardCheck, name: 'Fulfillment Agent', desc: 'Track delivery, send status updates, and manage timelines' },
]

const industries = [
  { icon: Scale, name: 'Legal', color: 'from-blue-500/20 to-blue-600/10' },
  { icon: Shield, name: 'Insurance', color: 'from-emerald-500/20 to-emerald-600/10' },
  { icon: Building2, name: 'Real Estate', color: 'from-amber-500/20 to-amber-600/10' },
  { icon: Heart, name: 'Healthcare', color: 'from-rose-500/20 to-rose-600/10' },
  { icon: Landmark, name: 'Finance', color: 'from-violet-500/20 to-violet-600/10' },
  { icon: HardHat, name: 'Construction', color: 'from-orange-500/20 to-orange-600/10' },
  { icon: ShoppingCart, name: 'E-commerce', color: 'from-cyan-500/20 to-cyan-600/10' },
  { icon: Briefcase, name: 'Agencies', color: 'from-indigo-500/20 to-indigo-600/10' },
  { icon: Sparkles, name: 'Your Industry', color: 'from-pink-500/20 to-pink-600/10' },
]

const steps = [
  { num: '01', title: 'Book a Call', desc: 'Tell us about your business and the workflows you want to automate.' },
  { num: '02', title: 'We Build Your AI Agents', desc: 'Our team builds custom AI agents tailored to your industry in under a week.' },
  { num: '03', title: 'Launch & Scale', desc: 'Your agents go live. Watch your business run on autopilot while you grow.' },
]

const results = [
  { stat: '80%', label: 'Less manual work' },
  { stat: '24/7', label: 'Agent uptime' },
  { stat: '<1 week', label: 'Setup time' },
  { stat: '10x', label: 'Output increase' },
]

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const goToBook = () => router.push('/book')

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Thin gold accent line at top */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent z-50" />

      {/* ─── STICKY NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/arvantis-logo.png" alt="Arvantis Tech" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-semibold tracking-tight">Arvantis Tech</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
              Login
            </Link>
            <ShimmerButton
              onClick={goToBook}
              shimmerColor="rgba(255,255,255,0.12)"
              shimmerSize="0.06em"
              shimmerDuration="2.5s"
              borderRadius="0.5rem"
              background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
              className="h-9 px-5 text-sm font-medium"
            >
              Book a Call
            </ShimmerButton>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-6">
        <DotPattern
          width={24}
          height={24}
          cr={0.8}
          className="text-slate-700/20 [mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
        />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.06)_0%,_transparent_70%)] pointer-events-none z-0" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <BlurFade delay={0.1} duration={0.6}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
              <Bot className="w-4 h-4" />
              AI-Powered Business Automation
            </div>
          </BlurFade>

          <BlurFade delay={0.2} duration={0.6}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              We Build AI Agents That{' '}
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Automate Your Entire Business
              </span>
            </h1>
          </BlurFade>

          <BlurFade delay={0.35} duration={0.6}>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Custom AI workflows for any industry — from lead gen to fulfillment.
              Built for you in under a week.
            </p>
          </BlurFade>

          <BlurFade delay={0.5} duration={0.6}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <ShimmerButton
                onClick={goToBook}
                shimmerColor="rgba(255,255,255,0.12)"
                shimmerSize="0.06em"
                shimmerDuration="2.5s"
                borderRadius="0.75rem"
                background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
                className="h-13 px-8 text-base font-medium"
              >
                <span className="flex items-center gap-2">
                  Book Your Free Discovery Call
                  <ArrowRight className="w-4 h-4" />
                </span>
              </ShimmerButton>
              <button
                onClick={() => document.getElementById('what-we-automate')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 px-6 py-3"
              >
                See What We Automate
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </BlurFade>

          {/* Stats bar */}
          <BlurFade delay={0.65} duration={0.6}>
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {results.map(r => (
                <div key={r.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-blue-400">{r.stat}</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{r.label}</p>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ─── WHAT WE AUTOMATE ─── */}
      <section id="what-we-automate" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <BlurFade delay={0.1} duration={0.5}>
            <div className="text-center mb-16">
              <p className="text-sm text-blue-400 tracking-[0.2em] uppercase mb-3">What We Automate</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                An AI Agent for Every Role
              </h2>
              <p className="text-slate-400 mt-4 max-w-xl mx-auto">
                Replace entire teams with intelligent AI agents that work 24/7, never call in sick, and scale instantly.
              </p>
            </div>
          </BlurFade>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent, i) => (
              <BlurFade key={agent.name} delay={0.1 + i * 0.06} duration={0.5}>
                <div className="group relative bg-[#080d19]/80 border border-white/[0.04] rounded-2xl p-6 hover:border-blue-500/20 transition-all duration-300 hover:bg-[#0a1020]/80 h-full">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-4 group-hover:from-blue-500/30 group-hover:to-blue-600/20 transition-all">
                    <agent.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-white mb-2">{agent.name}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">{agent.desc}</p>
                </div>
              </BlurFade>
            ))}
          </div>

          {/* Mid-page CTA */}
          <BlurFade delay={0.6} duration={0.5}>
            <div className="text-center mt-12">
              <ShimmerButton
                onClick={goToBook}
                shimmerColor="rgba(255,255,255,0.12)"
                shimmerSize="0.06em"
                shimmerDuration="2.5s"
                borderRadius="0.75rem"
                background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
                className="h-12 px-8 text-[15px] font-medium mx-auto"
              >
                <span className="flex items-center gap-2">
                  Get Your AI Agents Built
                  <ArrowRight className="w-4 h-4" />
                </span>
              </ShimmerButton>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ─── INDUSTRIES WE SERVE ─── */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <BlurFade delay={0.1} duration={0.5}>
            <div className="text-center mb-16">
              <p className="text-sm text-blue-400 tracking-[0.2em] uppercase mb-3">Industries We Serve</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Built for Any Business
              </h2>
              <p className="text-slate-400 mt-4 max-w-xl mx-auto">
                We build custom AI agents for businesses in every industry. If you have workflows, we can automate them.
              </p>
            </div>
          </BlurFade>

          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {industries.map((ind, i) => (
              <BlurFade key={ind.name} delay={0.1 + i * 0.05} duration={0.5}>
                <div className="group relative bg-[#080d19]/60 border border-white/[0.04] rounded-2xl p-5 sm:p-6 text-center hover:border-white/[0.08] transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ind.color} flex items-center justify-center mx-auto mb-3`}>
                    <ind.icon className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-300">{ind.name}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <BlurFade delay={0.1} duration={0.5}>
            <div className="text-center mb-16">
              <p className="text-sm text-blue-400 tracking-[0.2em] uppercase mb-3">How It Works</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Three Steps to Full Automation
              </h2>
            </div>
          </BlurFade>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <BlurFade key={step.num} delay={0.15 + i * 0.12} duration={0.5}>
                <div className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%+0.5rem)] w-[calc(100%-1rem)] h-[1px] bg-gradient-to-r from-blue-500/30 to-transparent" />
                  )}
                  <div className="text-5xl font-bold text-blue-500/10 mb-4">{step.num}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed">{step.desc}</p>
                </div>
              </BlurFade>
            ))}
          </div>

          <BlurFade delay={0.55} duration={0.5}>
            <div className="text-center mt-12">
              <ShimmerButton
                onClick={goToBook}
                shimmerColor="rgba(255,255,255,0.12)"
                shimmerSize="0.06em"
                shimmerDuration="2.5s"
                borderRadius="0.75rem"
                background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
                className="h-12 px-8 text-[15px] font-medium mx-auto"
              >
                <span className="flex items-center gap-2">
                  Start With a Free Call
                  <ArrowRight className="w-4 h-4" />
                </span>
              </ShimmerButton>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <BlurFade delay={0.1} duration={0.5}>
            <div className="text-center mb-16">
              <p className="text-sm text-blue-400 tracking-[0.2em] uppercase mb-3">Pricing</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Simple, Transparent Pricing
              </h2>
              <p className="text-slate-400 mt-4 max-w-xl mx-auto">
                No per-seat fees. No hidden costs. One setup, one monthly subscription.
              </p>
            </div>
          </BlurFade>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <BlurFade delay={0.2} duration={0.5}>
              <div className="relative bg-[#080d19]/80 border border-white/[0.04] rounded-2xl p-8">
                <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={10} />
                <p className="text-sm text-blue-400 tracking-wide uppercase mb-2">Setup Fee</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">$1,500</span>
                  <span className="text-slate-500 text-sm">one-time</span>
                </div>
                <p className="text-slate-400 text-sm mb-6">Custom AI agent workflows built specifically for your business</p>
                <ul className="space-y-3">
                  {['Discovery call & workflow mapping', 'Custom AI agents built for your niche', 'Full portal access & dashboard', 'Delivered in under 1 week'].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </BlurFade>

            <BlurFade delay={0.3} duration={0.5}>
              <div className="relative bg-[#080d19]/80 border border-white/[0.04] rounded-2xl p-8">
                <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={10} />
                <p className="text-sm text-blue-400 tracking-wide uppercase mb-2">Monthly Access</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">$700</span>
                  <span className="text-slate-500 text-sm">– $1,500/mo</span>
                </div>
                <p className="text-slate-400 text-sm mb-6">Ongoing AI agent access, support, and optimization</p>
                <ul className="space-y-3">
                  {['24/7 AI agent operations', 'Performance monitoring & tuning', 'Priority support & updates', 'Scale agents as you grow'].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </BlurFade>
          </div>

          <BlurFade delay={0.4} duration={0.5}>
            <div className="text-center mt-10">
              <ShimmerButton
                onClick={goToBook}
                shimmerColor="rgba(255,255,255,0.12)"
                shimmerSize="0.06em"
                shimmerDuration="2.5s"
                borderRadius="0.75rem"
                background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
                className="h-12 px-8 text-[15px] font-medium mx-auto"
              >
                <span className="flex items-center gap-2">
                  Book Your Discovery Call
                  <ArrowRight className="w-4 h-4" />
                </span>
              </ShimmerButton>
              <p className="text-xs text-slate-600 mt-3">Free consultation — no commitment required</p>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <BlurFade delay={0.1} duration={0.5}>
            <div className="relative bg-gradient-to-br from-[#0a1628] to-[#080d19] border border-white/[0.06] rounded-3xl p-10 sm:p-14 text-center">
              <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={8} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_transparent_60%)] rounded-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-7 h-7 text-blue-400" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Stop Hiring. Start Automating.
                </h2>
                <p className="text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
                  Your competitors are already using AI. Every day you wait is revenue left on the table.
                  Book your call now and launch in under a week.
                </p>
                <ShimmerButton
                  onClick={goToBook}
                  shimmerColor="rgba(255,255,255,0.12)"
                  shimmerSize="0.06em"
                  shimmerDuration="2.5s"
                  borderRadius="0.75rem"
                  background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
                  className="h-13 px-8 text-base font-medium mx-auto"
                >
                  <span className="flex items-center gap-2">
                    Book Your Free Discovery Call
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </ShimmerButton>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.04] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/arvantis-logo.png" alt="Arvantis Tech" width={32} height={32} className="rounded-lg" />
            <span className="text-sm font-medium text-slate-400">Arvantis Tech</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/book" className="hover:text-white transition-colors">Book a Call</Link>
          </div>
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Arvantis Tech. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
