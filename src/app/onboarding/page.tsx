'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { ShineBorder } from '@/components/ui/shine-border'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import {
  Phone,
  Wrench,
  Rocket,
  CheckCircle2,
  Calendar,
  Loader2,
} from 'lucide-react'

function CalendlyWidget({ userName, userEmail, companyName }: { userName: string; userEmail: string; companyName: string }) {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const calendlyUrl = `${process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/arvantistech/30min'}?hide_gdpr_banner=1&name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&a1=${encodeURIComponent(companyName)}`

  return (
    <div
      className="calendly-inline-widget"
      data-url={calendlyUrl}
      style={{ minWidth: '320px', height: '650px' }}
    />
  )
}

type OnboardingStatus = 'pending_call' | 'call_booked' | 'building' | 'active'

const statusSteps = [
  { id: 'pending_call' as const, label: 'Book a Call', icon: Calendar },
  { id: 'call_booked' as const, label: 'Call Booked', icon: Phone },
  { id: 'building' as const, label: 'Building', icon: Wrench },
  { id: 'active' as const, label: 'Active', icon: Rocket },
]

export default function OnboardingPage() {
  const [status, setStatus] = useState<OnboardingStatus>('pending_call')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserEmail(user.email || '')
    setUserName(user.user_metadata?.full_name || '')
    setCompanyName(user.user_metadata?.company_name || '')

    // Fetch onboarding status from dashboard API
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const data = await res.json()
        if (data.onboarding_status) {
          setStatus(data.onboarding_status as OnboardingStatus)
        }
      }
    } catch {
      // Default to pending_call on error
    }
  }

  if (status === 'active') {
    router.push('/dashboard')
    return null
  }

  const currentStepIndex = statusSteps.findIndex(s => s.id === status)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center relative overflow-hidden py-12">
      <DotPattern
        width={24}
        height={24}
        cr={0.8}
        className="text-slate-700/30 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.05)_0%,_transparent_70%)] pointer-events-none z-0" />
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent z-10" />

      <div className="relative z-10 w-full max-w-3xl px-6">
        {/* Header */}
        <BlurFade delay={0.1} duration={0.5}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3.5 mb-3">
              <Image src="/arvantis-logo.png" alt="Arvantis Tech" width={90} height={90} className="rounded-lg" />
              <h1 className="text-2xl text-foreground font-semibold tracking-tight">
                Arvantis Tech
              </h1>
            </div>
            <p className="text-[13px] text-muted-foreground tracking-[0.15em] uppercase mt-1">Onboarding</p>
          </div>
        </BlurFade>

        {/* Progress Stepper */}
        <BlurFade delay={0.2} duration={0.5}>
          <div className="flex items-center justify-center gap-0 mb-12 max-w-lg mx-auto px-2">
            {statusSteps.map((step, i) => {
              const isCompleted = i < currentStepIndex
              const isCurrent = i === currentStepIndex
              const StepIcon = step.icon
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : isCurrent
                        ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                        : 'bg-muted/50 dark:bg-white/[0.02] border-border dark:border-white/[0.08] text-muted-foreground'
                    }`} aria-label={`Step ${i + 1}: ${step.label}`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </div>
                    <p className={`text-[10px] sm:text-[11px] mt-1.5 sm:mt-2 font-medium text-center ${
                      isCompleted || isCurrent ? 'text-foreground/80' : 'text-muted-foreground'
                    }`}>{step.label}</p>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`flex-1 h-[2px] mx-1 sm:mx-2 mt-[-18px] ${
                      isCompleted ? 'bg-blue-500' : 'bg-border dark:bg-white/[0.06]'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </BlurFade>

        {/* Content based on status */}
        {status === 'pending_call' && (
          <BlurFade delay={0.3} duration={0.5}>
            <Card className="relative bg-card dark:bg-[#080d19]/80 backdrop-blur-xl border-border dark:border-white/[0.04] ring-0 shadow-2xl shadow-blue-950/20">
              <ShineBorder
                shineColor={["#3b82f6", "#6366f1", "#3b82f6"]}
                borderWidth={1}
                duration={10}
              />
              <CardContent className="pt-6 pb-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    Let&apos;s Build Your AI Agents
                  </h2>
                  <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
                    Book a discovery call with our team. We&apos;ll map out your workflows and
                    start building your custom AI agents.
                  </p>
                </div>

                {/* Calendly Embed */}
                <div className="relative rounded-xl overflow-hidden border border-border dark:border-white/[0.04]">
                  <CalendlyWidget userName={userName} userEmail={userEmail} companyName={companyName} />
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        )}

        {status === 'call_booked' && (
          <BlurFade delay={0.3} duration={0.5}>
            <Card className="relative bg-card dark:bg-[#080d19]/80 backdrop-blur-xl border-border dark:border-white/[0.04] ring-0 shadow-2xl shadow-blue-950/20">
              <ShineBorder
                shineColor={["#3b82f6", "#6366f1", "#3b82f6"]}
                borderWidth={1}
                duration={10}
              />
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Call Booked!
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                  We&apos;re excited to talk with you. After our call, we&apos;ll start building your custom AI agent workflows. Expect delivery in under a week.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                  {[
                    { label: 'Discovery Call', desc: 'Map your workflows' },
                    { label: 'Custom Build', desc: '3-5 business days' },
                    { label: 'Go Live', desc: 'Agents activate' },
                  ].map(item => (
                    <div key={item.label} className="bg-muted/50 dark:bg-white/[0.02] border border-border dark:border-white/[0.06] rounded-xl p-4">
                      <p className="text-sm font-medium text-foreground mb-1">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        )}

        {status === 'building' && (
          <BlurFade delay={0.3} duration={0.5}>
            <Card className="relative bg-card dark:bg-[#080d19]/80 backdrop-blur-xl border-border dark:border-white/[0.04] ring-0 shadow-2xl shadow-blue-950/20">
              <ShineBorder
                shineColor={["#3b82f6", "#6366f1", "#3b82f6"]}
                borderWidth={1}
                duration={10}
              />
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  We&apos;re Building Your AI Agents
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                  Our team is building your custom AI agent workflows right now. You&apos;ll receive an email when everything is ready to go.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                  <Wrench className="w-4 h-4" aria-hidden="true" />
                  Estimated: 3-5 business days
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        )}

        {/* Sign out link */}
        <BlurFade delay={0.5} duration={0.5}>
          <div className="text-center mt-8">
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/')
                router.refresh()
              }}
              className="text-[13px] text-muted-foreground hover:text-foreground/70 transition-colors"
            >
              Sign out
            </button>
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
