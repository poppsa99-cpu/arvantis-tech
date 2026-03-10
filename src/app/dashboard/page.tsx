'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { ShineBorder } from '@/components/ui/shine-border'
import { Card, CardContent } from '@/components/ui/card'
import {
  Bot, LogOut, Mail, Target, Headphones, Share2, Search,
  Receipt, FileText, Package, CheckCircle2, Clock, AlertTriangle,
  CreditCard, Calendar, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'

const iconMap: Record<string, typeof Bot> = {
  Mail, Target, Headphones, Share2, Search, Receipt, FileText, Package,
}

const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Active' },
  paused: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Paused' },
  error: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Error' },
}

const planLabels: Record<string, string> = {
  starter: 'Autopilot',
  growth: 'Overdrive',
  scale: 'Takeover',
}

const planPrices: Record<string, number> = {
  starter: 700,
  growth: 1000,
  scale: 1500,
}

const onboardingSteps = [
  { id: 'pending_call', label: 'Discovery Call' },
  { id: 'call_booked', label: 'Call Booked' },
  { id: 'building', label: 'Building' },
  { id: 'active', label: 'Live' },
]

interface DashboardData {
  user: { email: string; full_name: string; company_name: string }
  subscription: { plan: string | null; status: string | null; setup_fee_paid: boolean; current_period_end: string | null }
  onboarding_status: string
  agents: Array<{
    id: string
    status: string
    runs_count: number
    last_run_at: string | null
    created_at: string
    agent_template: { display_name: string; description: string | null; icon: string | null; category: string | null }
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingOpen, setBillingOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchDashboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const res = await fetch('/api/dashboard')
    if (res.ok) {
      setData(await res.json())
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div role="status" aria-label="Loading dashboard" className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Failed to load dashboard
      </div>
    )
  }

  const activeAgents = data.agents.filter((a) => a.status === 'active').length
  const currentStageIndex = onboardingSteps.findIndex((s) => s.id === data.onboarding_status)

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <DotPattern
        width={24}
        height={24}
        cr={0.8}
        className="text-slate-700/15 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
      />
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent z-50" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <BlurFade delay={0.1} duration={0.5}>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <Image src="/arvantis-logo.png" alt="Arvantis Tech" width={90} height={90} className="rounded-lg" />
              <span className="text-lg font-semibold">Arvantis Tech</span>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/')
                router.refresh()
              }}
              aria-label="Sign out"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </BlurFade>

        {/* Welcome */}
        <BlurFade delay={0.15} duration={0.5}>
          <h1 className="text-3xl font-bold mb-1">
            Welcome back{data.user.full_name ? `, ${data.user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground mb-8">
            {data.user.company_name || 'Your AI agent command center'}
          </p>
        </BlurFade>

        {/* Onboarding Progress (only show if not fully active) */}
        {data.onboarding_status !== 'active' && (
          <BlurFade delay={0.2} duration={0.5}>
            <Card className="relative bg-[var(--card-80)] border-[var(--card-border)] ring-0 mb-8">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Onboarding Progress</p>
                <div className="flex items-center gap-3">
                  {onboardingSteps.map((step, i) => {
                    const isCompleted = i < currentStageIndex
                    const isCurrent = i === currentStageIndex
                    return (
                      <div key={step.id} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-medium ${
                            isCompleted
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : isCurrent
                              ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                              : 'bg-[var(--background-50)] border-[var(--card-border)] text-[var(--muted-dim)]'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                          </div>
                          <span className={`text-[10px] font-medium ${isCompleted || isCurrent ? 'text-muted-foreground' : 'text-[var(--muted-dim)]'}`}>
                            {step.label}
                          </span>
                        </div>
                        {i < onboardingSteps.length - 1 && (
                          <div className={`flex-1 h-[2px] mx-2 mt-[-16px] ${isCompleted ? 'bg-blue-500' : 'bg-[var(--card-border)]'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        )}

        {/* Agents Section — THE HERO */}
        <BlurFade delay={0.25} duration={0.5}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground">Your AI Agents</h2>
            </div>
            <span className="text-xs text-muted-foreground">{activeAgents} active / {data.agents.length} total</span>
          </div>

          {data.agents.length === 0 ? (
            <Card className="relative bg-[var(--card-80)] border-[var(--card-border)] ring-0">
              <CardContent className="py-12 text-center">
                <Bot className="w-10 h-10 text-[var(--muted-dim)] mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No agents deployed yet</p>
                <p className="text-[var(--muted-dim)] text-xs mt-1">Your agents will appear here once your account is set up</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.agents.map((agent, i) => {
                const template = agent.agent_template
                const Icon = iconMap[template?.icon || ''] || Bot
                const status = statusConfig[agent.status] || statusConfig.active
                const isAccessible = agent.status === 'active'

                const cardContent = (
                  <Card className={`relative bg-[var(--card-80)] border-[var(--card-border)] ring-0 transition-all group ${isAccessible ? 'hover:border-[var(--foreground-30)] hover:bg-[var(--card-80)] cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                    {isAccessible && <ShineBorder shineColor={["#3b82f6", "#6366f1", "#3b82f6"]} borderWidth={1} duration={14} />}
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${status.bg} border ${status.border} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${status.color}`} />
                          </div>
                          <div>
                            <h3 className={`text-sm font-semibold transition-colors ${isAccessible ? 'text-foreground group-hover:text-blue-400' : 'text-muted-foreground'}`}>{template?.display_name || 'Agent'}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{template?.category || 'general'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.bg} ${status.color} ${status.border}`}>
                            {agent.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                            {agent.status === 'paused' && <Clock className="w-3 h-3" />}
                            {agent.status === 'error' && <AlertTriangle className="w-3 h-3" />}
                            {status.label}
                          </span>
                          {isAccessible && <ExternalLink className="w-3.5 h-3.5 text-[var(--muted-dim)] group-hover:text-blue-400 transition-colors" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{template?.description || ''}</p>
                      <div className="flex items-center justify-between text-xs text-[var(--muted-dim)]">
                        <div className="flex items-center gap-4">
                          <span>{agent.runs_count} runs</span>
                          {agent.last_run_at && (
                            <span>Last run: {new Date(agent.last_run_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        {isAccessible ? (
                          <span className="text-blue-500/60 text-[10px] font-medium group-hover:text-blue-400 transition-colors">
                            Open workspace →
                          </span>
                        ) : (
                          <span className="text-amber-500/60 text-[10px] font-medium">
                            Workflow paused by admin
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )

                return (
                  <BlurFade key={agent.id} delay={0.3 + i * 0.05} duration={0.4}>
                    {isAccessible ? (
                      <a href={`/dashboard/agents/${agent.id}`} className="w-full text-left block">
                        {cardContent}
                      </a>
                    ) : (
                      <div className="w-full text-left block">
                        {cardContent}
                      </div>
                    )}
                  </BlurFade>
                )
              })}
            </div>
          )}
        </BlurFade>

        {/* Billing & Subscription Section — Collapsible */}
        <BlurFade delay={0.45} duration={0.5}>
          <div className="mt-10">
            <button
              onClick={() => setBillingOpen(!billingOpen)}
              aria-expanded={billingOpen}
              className="flex items-center justify-between w-full mb-4 group"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Billing & Subscription</h2>
              </div>
              {billingOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {billingOpen && (
              <BlurFade delay={0.05} duration={0.3}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Plan Card */}
                  <Card className="relative bg-[var(--card-80)] border-[var(--card-border)] ring-0">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Your Plan</span>
                      </div>
                      {data.subscription.plan ? (
                        <>
                          <p className="text-xl font-bold text-foreground">
                            {planLabels[data.subscription.plan] || data.subscription.plan}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            ${planPrices[data.subscription.plan]?.toLocaleString() || 0}/mo
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No active plan</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status Card */}
                  <Card className="relative bg-[var(--card-80)] border-[var(--card-border)] ring-0">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
                      </div>
                      <p className="text-xl font-bold text-foreground capitalize">
                        {data.subscription.status || 'Inactive'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Setup fee: {data.subscription.setup_fee_paid ? 'Paid' : 'Pending'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Next Billing Card */}
                  <Card className="relative bg-[var(--card-80)] border-[var(--card-border)] ring-0">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-violet-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Next Billing</span>
                      </div>
                      {data.subscription.current_period_end ? (
                        <>
                          <p className="text-xl font-bold text-foreground">
                            {new Date(data.subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {(() => {
                              const days = Math.ceil((new Date(data.subscription.current_period_end).getTime() - Date.now()) / 86400000)
                              return days > 0 ? `${days} days away` : 'Due now'
                            })()}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">&mdash;</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </BlurFade>
            )}
          </div>
        </BlurFade>

        {/* Footer */}
        <BlurFade delay={0.5} duration={0.5}>
          <div className="mt-12 text-center">
            <p className="text-xs text-[var(--muted-dim)]">
              Need help? Contact your account manager or email support@arvantistech.com
            </p>
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
