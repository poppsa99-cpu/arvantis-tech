'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { ShineBorder } from '@/components/ui/shine-border'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dot pattern background */}
      <DotPattern
        width={24}
        height={24}
        cr={0.8}
        className="text-slate-700/30 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
      />

      {/* Subtle radial ambient from top */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.05)_0%,_transparent_70%)] pointer-events-none z-0" />

      {/* Thin gold accent line at top */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[420px] px-6">

        {/* Brand mark */}
        <BlurFade delay={0.1} duration={0.5}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3.5 mb-3">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 opacity-20 blur-md" />
                <div className="relative h-full w-full rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">A</span>
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-2xl text-white font-semibold tracking-tight leading-none">
                  Arvantis Tech
                </h1>
              </div>
            </div>
            <p className="text-[13px] text-slate-500 tracking-[0.15em] uppercase mt-1">AI-Powered Business Automation</p>
          </div>
        </BlurFade>

        {/* Form card with shine border */}
        <BlurFade delay={0.25} duration={0.5}>
          <Card className="relative bg-[#080d19]/80 backdrop-blur-xl border-white/[0.04] ring-0 shadow-2xl shadow-blue-950/20">
            <ShineBorder
              shineColor={["#3b82f6", "#6366f1", "#3b82f6"]}
              borderWidth={1}
              duration={10}
            />
            <CardContent className="pt-2 pb-2">
              {/* Section title with thin rule */}
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-[15px] font-medium text-slate-300 whitespace-nowrap">Sign in to your account</h2>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-700/60 to-transparent" />
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[13px] text-slate-500 tracking-wide uppercase">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 px-4 text-[15px] bg-white/[0.03] border-white/[0.06] rounded-xl text-white placeholder:text-slate-600 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/10 focus-visible:bg-white/[0.05] transition-all duration-200"
                    placeholder="you@firm.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] text-slate-500 tracking-wide uppercase">Password</Label>
                    <button
                      type="button"
                      className="text-[12px] text-blue-500/70 hover:text-blue-400 transition-colors"
                      onClick={async () => {
                        if (!email) { setError('Enter your email first'); return }
                        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/login`,
                        })
                        if (resetError) setError(resetError.message)
                        else setError('Password reset link sent — check your email')
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 px-4 text-[15px] bg-white/[0.03] border-white/[0.06] rounded-xl text-white placeholder:text-slate-600 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/10 focus-visible:bg-white/[0.05] transition-all duration-200"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/10">
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
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In
                      <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  )}
                </ShimmerButton>

                <div className="text-center mt-4">
                  <p className="text-[13px] text-slate-500">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                      Sign up
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Powered by */}
        <BlurFade delay={0.45} duration={0.5}>
          <div className="mt-12 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-slate-700/50" />
              <p className="text-[11px] text-slate-600 tracking-[0.2em] uppercase">Powered by</p>
              <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-slate-700/50" />
            </div>
            <Image
              src="/arvantis-logo.png"
              alt="Arvantis Tech"
              width={120}
              height={120}
              className="rounded-xl opacity-70 hover:opacity-90 transition-opacity duration-300"
              priority
            />
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
