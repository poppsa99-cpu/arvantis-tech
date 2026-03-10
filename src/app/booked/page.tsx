'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { ShineBorder } from '@/components/ui/shine-border'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import {
  CheckCircle2,
  Calendar,
  MessageSquare,
  FileText,
  Rocket,
  ArrowRight,
  Mail,
  Clock,
} from 'lucide-react'

const nextSteps = [
  {
    icon: Mail,
    title: 'Check your email',
    desc: 'You\'ll receive a calendar invite with call details and a prep questionnaire.',
    time: 'Now',
  },
  {
    icon: MessageSquare,
    title: 'Discovery call',
    desc: 'We\'ll discuss your business, map your workflows, and identify automation opportunities.',
    time: '30 min call',
  },
  {
    icon: FileText,
    title: 'Custom automation plan',
    desc: 'Within 24 hours, you\'ll receive a detailed plan with recommended AI agents for your business.',
    time: 'Within 24hrs',
  },
  {
    icon: Rocket,
    title: 'Build & launch',
    desc: 'Once approved, we build your custom AI agents and have them running in under a week.',
    time: '3-5 days',
  },
]

export default function BookedPage() {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden flex flex-col items-center justify-center relative">
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent z-50" />
      <DotPattern
        width={24}
        height={24}
        cr={0.8}
        className="text-slate-700/15 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.06)_0%,_transparent_70%)] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-2xl px-6 py-16">
        {/* Success header */}
        <BlurFade delay={0.1} duration={0.6}>
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              You&apos;re All Set!
            </h1>
            <p className="text-slate-400 text-lg max-w-md mx-auto">
              Your discovery call has been booked. Here&apos;s what happens next.
            </p>
          </div>
        </BlurFade>

        {/* Timeline of next steps */}
        <BlurFade delay={0.25} duration={0.5}>
          <div className="relative bg-[#080d19]/80 border border-white/[0.04] rounded-2xl overflow-hidden">
            <ShineBorder
              shineColor={["#10b981", "#3b82f6", "#10b981"]}
              borderWidth={1}
              duration={10}
            />
            <div className="p-6 sm:p-8">
              <div className="space-y-6">
                {nextSteps.map((step, i) => (
                  <div key={step.title} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        i === 0
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-white/[0.03] border border-white/[0.06]'
                      }`}>
                        <step.icon className={`w-4 h-4 ${i === 0 ? 'text-green-400' : 'text-slate-500'}`} />
                      </div>
                      {i < nextSteps.length - 1 && (
                        <div className="w-[1px] h-full bg-white/[0.06] mt-2" />
                      )}
                    </div>

                    <div className="pb-6">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-[15px] font-semibold text-white">{step.title}</h3>
                        <span className="text-[11px] text-slate-600 bg-white/[0.03] border border-white/[0.06] rounded-full px-2.5 py-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {step.time}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Prep tip */}
        <BlurFade delay={0.4} duration={0.5}>
          <div className="mt-6 bg-blue-500/[0.04] border border-blue-500/10 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Prepare for your call</p>
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  Think about the tasks your team spends the most time on — outreach, follow-ups,
                  document processing, social media, client support. These are your biggest automation opportunities.
                </p>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Funnel progress */}
        <BlurFade delay={0.5} duration={0.5}>
          <div className="flex items-center justify-center gap-2 mt-10">
            {['Book a Call', 'Discovery Call', 'Payment', 'Sign Up'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${i <= 1 ? 'bg-blue-500' : 'bg-white/10'}`} />
                <span className={`text-xs ${i <= 1 ? 'text-blue-400 font-medium' : 'text-slate-600'}`}>{label}</span>
                {i < 3 && <div className="w-6 h-[1px] bg-white/[0.06]" />}
              </div>
            ))}
          </div>
        </BlurFade>

        {/* Footer */}
        <BlurFade delay={0.55} duration={0.5}>
          <div className="text-center mt-8">
            <Link href="/" className="text-[13px] text-slate-600 hover:text-slate-400 transition-colors">
              Back to Arvantis Tech
            </Link>
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
