'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { ShineBorder } from '@/components/ui/shine-border'
import {
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  ArrowLeft,
} from 'lucide-react'

const trustPoints = [
  { icon: Clock, text: 'Free 30-minute call' },
  { icon: Shield, text: 'No commitment required' },
  { icon: Zap, text: 'Custom plan in 24 hours' },
]

export default function BookPage() {
  useEffect(() => {
    document.documentElement.classList.add('dark')

    // Load Calendly widget script
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      try { document.head.removeChild(script) } catch { /* already removed */ }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent z-50" />
      <DotPattern
        width={24}
        height={24}
        cr={0.8}
        className="text-slate-700/15 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
      />

      {/* Back nav */}
      <nav className="relative z-10 max-w-5xl mx-auto px-6 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Left column — context & trust */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <BlurFade delay={0.1} duration={0.5}>
              <div className="flex items-center gap-3 mb-6">
                <Image src="/arvantis-logo.png" alt="Arvantis Tech" width={40} height={40} className="rounded-lg" />
                <span className="text-lg font-semibold">Arvantis Tech</span>
              </div>
            </BlurFade>

            <BlurFade delay={0.2} duration={0.5}>
              <div className="mb-2">
                <p className="text-sm text-blue-400 tracking-[0.15em] uppercase mb-3">Step 1 of 4</p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4">
                  Book Your Free Discovery Call
                </h1>
                <p className="text-slate-400 leading-relaxed mb-8">
                  We&apos;ll map out your business workflows and show you exactly which AI agents can automate your operations.
                </p>
              </div>
            </BlurFade>

            <BlurFade delay={0.3} duration={0.5}>
              <div className="space-y-4 mb-8">
                {trustPoints.map(tp => (
                  <div key={tp.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <tp.icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-sm text-slate-300">{tp.text}</p>
                  </div>
                ))}
              </div>
            </BlurFade>

            <BlurFade delay={0.4} duration={0.5}>
              <div className="bg-[#080d19]/60 border border-white/[0.04] rounded-xl p-5">
                <p className="text-sm font-medium text-white mb-3">What happens on the call:</p>
                <ul className="space-y-2.5">
                  {[
                    'We learn about your business & current workflows',
                    'We identify which AI agents fit your needs',
                    'You get a custom automation plan within 24 hours',
                    'No pressure — only proceed if it makes sense',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </BlurFade>
          </div>

          {/* Right column — Calendly embed */}
          <div className="lg:col-span-3">
            <BlurFade delay={0.25} duration={0.5}>
              <div className="relative bg-[#080d19]/60 border border-white/[0.04] rounded-2xl overflow-hidden">
                <ShineBorder
                  shineColor={["#3b82f6", "#6366f1", "#3b82f6"]}
                  borderWidth={1}
                  duration={12}
                />
                <div
                  className="calendly-inline-widget"
                  data-url={process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/arvantistech/30min'}
                  style={{ minWidth: '320px', height: '700px' }}
                />
              </div>
            </BlurFade>
          </div>
        </div>

        {/* Funnel progress */}
        <BlurFade delay={0.5} duration={0.5}>
          <div className="flex items-center justify-center gap-2 mt-12">
            {['Book a Call', 'Discovery Call', 'Payment', 'Sign Up'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-white/10'}`} />
                <span className={`text-xs ${i === 0 ? 'text-blue-400 font-medium' : 'text-slate-600'}`}>{label}</span>
                {i < 3 && <div className="w-6 h-[1px] bg-white/[0.06]" />}
              </div>
            ))}
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
