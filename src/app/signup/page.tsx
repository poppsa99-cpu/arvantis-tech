'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { ShineBorder } from '@/components/ui/shine-border'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import {
  Scale,
  Shield,
  Building2,
  Heart,
  Landmark,
  HardHat,
  ShoppingCart,
  Briefcase,
  Sparkles,
} from 'lucide-react'

const niches = [
  { id: 'legal', name: 'Legal', icon: Scale },
  { id: 'insurance', name: 'Insurance', icon: Shield },
  { id: 'real-estate', name: 'Real Estate', icon: Building2 },
  { id: 'healthcare', name: 'Healthcare', icon: Heart },
  { id: 'finance', name: 'Finance', icon: Landmark },
  { id: 'construction', name: 'Construction', icon: HardHat },
  { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart },
  { id: 'agency', name: 'Agency', icon: Briefcase },
  { id: 'other', name: 'Other', icon: Sparkles },
]

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedNiche, setSelectedNiche] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Capture Stripe session ID and plan from URL (after successful payment)
  const stripeSessionId = searchParams.get('session_id')
  const selectedPlan = searchParams.get('plan')

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNiche) {
      setError('Please select your industry')
      return
    }
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
          phone,
          niche: selectedNiche,
          stripe_session_id: stripeSessionId || undefined,
          subscription_plan: selectedPlan || undefined,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // If we have a Stripe session, link it to the user's profile
      if (stripeSessionId && data.user) {
        try {
          await fetch('/api/stripe/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: stripeSessionId,
              userId: data.user.id,
            }),
          })
        } catch {
          // Non-blocking — webhook will eventually sync this
        }
      }
      router.push('/onboarding')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden py-12">
      <DotPattern
        width={24}
        height={24}
        cr={0.8}
        className="text-slate-700/30 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.05)_0%,_transparent_70%)] pointer-events-none z-0" />
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent z-10" />

      <div className="relative z-10 w-full max-w-[480px] px-6">
        {/* Brand mark */}
        <BlurFade delay={0.1} duration={0.5}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3.5 mb-3">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 opacity-20 blur-md" />
                <div className="relative h-full w-full rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">A</span>
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-2xl text-foreground font-semibold tracking-tight leading-none">
                  Arvantis Tech
                </h1>
              </div>
            </div>
            <p className="text-sm text-blue-400 tracking-[0.15em] uppercase mb-1">Step 4 of 4</p>
            <p className="text-[13px] text-muted-foreground tracking-[0.15em] uppercase mt-1">Create Your Account</p>
          </div>
        </BlurFade>

        {/* Form card */}
        <BlurFade delay={0.25} duration={0.5}>
          <Card className="relative bg-card dark:bg-[#080d19]/80 backdrop-blur-xl border-border dark:border-white/[0.04] ring-0 shadow-2xl shadow-blue-950/20">
            <ShineBorder
              shineColor={["#3b82f6", "#6366f1", "#3b82f6"]}
              borderWidth={1}
              duration={10}
            />
            <CardContent className="pt-2 pb-2">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-[15px] font-medium text-foreground/80 whitespace-nowrap">Sign up</h2>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-border to-transparent" />
              </div>

              {stripeSessionId && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <p className="text-emerald-400/90 text-[13px] leading-relaxed">
                    Payment received! Create your account below to access your dashboard.
                  </p>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-[13px] text-muted-foreground tracking-wide uppercase">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 px-4 text-[14px] bg-input dark:bg-white/[0.03] border-border dark:border-white/[0.06] rounded-xl text-foreground placeholder:text-muted-foreground/60 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/10 transition-all duration-200"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-[13px] text-muted-foreground tracking-wide uppercase">Company</Label>
                    <Input
                      id="company"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-11 px-4 text-[14px] bg-input dark:bg-white/[0.03] border-border dark:border-white/[0.06] rounded-xl text-foreground placeholder:text-muted-foreground/60 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/10 transition-all duration-200"
                      placeholder="Acme Inc."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[13px] text-muted-foreground tracking-wide uppercase">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 px-4 text-[14px] bg-input dark:bg-white/[0.03] border-border dark:border-white/[0.06] rounded-xl text-foreground placeholder:text-muted-foreground/60 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/10 transition-all duration-200"
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[13px] text-muted-foreground tracking-wide uppercase">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 px-4 text-[14px] bg-input dark:bg-white/[0.03] border-border dark:border-white/[0.06] rounded-xl text-foreground placeholder:text-muted-foreground/60 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/10 transition-all duration-200"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[13px] text-muted-foreground tracking-wide uppercase">Phone <span className="text-muted-foreground/60">(optional)</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 px-4 text-[14px] bg-input dark:bg-white/[0.03] border-border dark:border-white/[0.06] rounded-xl text-foreground placeholder:text-muted-foreground/60 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/10 transition-all duration-200"
                      placeholder="(555) 123-4567"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Niche Picker */}
                <div className="space-y-3">
                  <Label className="text-[13px] text-muted-foreground tracking-wide uppercase">Select Your Industry</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                    {niches.map((niche) => {
                      const isSelected = selectedNiche === niche.id
                      return (
                        <button
                          key={niche.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedNiche(niche.id)}
                          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                              : 'bg-muted/50 dark:bg-white/[0.02] border-border dark:border-white/[0.06] text-muted-foreground hover:border-border hover:text-foreground/70 dark:hover:border-white/[0.1] dark:hover:text-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <ShineBorder
                              shineColor={["#3b82f6", "#6366f1", "#3b82f6"]}
                              borderWidth={1}
                              duration={8}
                            />
                          )}
                          <niche.icon className="w-5 h-5" aria-hidden="true" />
                          <span className="text-[11px] font-medium">{niche.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/10" role="alert">
                    <div className="w-1 h-1 rounded-full bg-red-400 mt-2 shrink-0" />
                    <p className="text-red-400/90 text-[13px] leading-relaxed">{error}</p>
                  </div>
                )}

                <ShimmerButton
                  type="submit"
                  disabled={loading}
                  shimmerColor="rgba(255,255,255,0.12)"
                  shimmerSize="0.06em"
                  shimmerDuration="2.5s"
                  borderRadius="0.75rem"
                  background="linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)"
                  className="w-full h-12 text-[15px] font-medium disabled:opacity-40 mt-1"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Account
                      <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  )}
                </ShimmerButton>

                <div className="text-center mt-3">
                  <p className="text-[13px] text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Funnel progress */}
        <BlurFade delay={0.45} duration={0.5}>
          <div className="flex items-center justify-center gap-2 mt-8">
            {['Book a Call', 'Discovery Call', 'Payment', 'Sign Up'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-blue-400 font-medium">{label}</span>
                {i < 3 && <div className="w-6 h-[1px] bg-blue-500/30" />}
              </div>
            ))}
          </div>
        </BlurFade>

        {/* Powered by */}
        <BlurFade delay={0.5} duration={0.5}>
          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-slate-700/50" />
              <p className="text-[11px] text-slate-600 tracking-[0.2em] uppercase">Powered by</p>
              <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-slate-700/50" />
            </div>
            <Image
              src="/arvantis-logo.png"
              alt="Arvantis Tech"
              width={196}
              height={196}
              className="rounded-xl opacity-70 hover:opacity-90 transition-opacity duration-300"
              priority
            />
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
