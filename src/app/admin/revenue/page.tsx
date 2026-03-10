'use client'

import { useState, useEffect } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { DollarSign, TrendingDown, AlertTriangle, CalendarClock } from 'lucide-react'

const planLabels: Record<string, string> = {
  starter: 'Autopilot',
  growth: 'Overdrive',
  scale: 'Takeover',
}

interface RevenueData {
  totalMrr: number
  byTier: { tier: string; label: string; count: number; mrr: number }[]
  setupFeesThisMonth: number
  setupFeesTotal: number
  churnRate: number
  paymentFailures: { id: string; payment_failures: number; dunning_stage: string; subscription_plan: string }[]
  upcomingRenewals: { id: string; subscription_plan: string; current_period_end: string }[]
  mrrTrend: { month: string; mrr: number }[]
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return <div className="text-center py-16 text-[var(--admin-text-dim)]">Failed to load revenue data</div>

  return (
    <div className="space-y-6">
      <BlurFade delay={0.05} duration={0.4}>
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">Revenue</h1>
          <p className="text-sm text-[var(--admin-text-dim)] mt-1">Financial overview and billing metrics</p>
        </div>
      </BlurFade>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total MRR', value: `$${data.totalMrr.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Setup Fees (Month)', value: `$${data.setupFeesThisMonth.toLocaleString()}`, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Churn Rate', value: `${data.churnRate}%`, icon: TrendingDown, color: data.churnRate > 5 ? 'text-red-400' : 'text-emerald-400', bg: data.churnRate > 5 ? 'bg-red-500/10' : 'bg-emerald-500/10', border: data.churnRate > 5 ? 'border-red-500/20' : 'border-emerald-500/20' },
          { label: 'Payment Failures', value: data.paymentFailures.length.toString(), icon: AlertTriangle, color: data.paymentFailures.length > 0 ? 'text-red-400' : 'text-[var(--admin-text-dim)]', bg: data.paymentFailures.length > 0 ? 'bg-red-500/10' : 'bg-[var(--admin-input-bg)]', border: data.paymentFailures.length > 0 ? 'border-red-500/20' : 'border-[var(--admin-border)]' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <BlurFade key={stat.label} delay={0.1 + i * 0.05} duration={0.4}>
              <div className={`rounded-xl border ${stat.border} ${stat.bg} p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">{stat.label}</p>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-[var(--admin-text)]">{stat.value}</p>
              </div>
            </BlurFade>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Trend */}
        <BlurFade delay={0.3} duration={0.4}>
          <div className="lg:col-span-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
            <h3 className="text-sm font-medium text-[var(--admin-text)] mb-4">MRR Trend (12 months)</h3>
            <RevenueChart data={data.mrrTrend} />
          </div>
        </BlurFade>

        {/* MRR by Tier */}
        <BlurFade delay={0.35} duration={0.4}>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
            <h3 className="text-sm font-medium text-[var(--admin-text)] mb-4">Revenue by Plan</h3>
            <div className="space-y-4">
              {data.byTier.map((tier) => (
                <div key={tier.tier}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[var(--admin-text-secondary)]">{tier.label}</span>
                    <span className="text-sm font-medium text-[var(--admin-text)]">${tier.mrr.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[var(--admin-input-bg)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: data.totalMrr > 0 ? `${(tier.mrr / data.totalMrr) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-[var(--admin-text-dim)]">{tier.count} clients</span>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-[var(--admin-border)]">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--admin-text-dim)]">Setup Fees (All Time)</span>
                  <span className="text-sm text-[var(--admin-text)]">${data.setupFeesTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </BlurFade>
      </div>

      {/* Upcoming Renewals */}
      {data.upcomingRenewals.length > 0 && (
        <BlurFade delay={0.4} duration={0.4}>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-[var(--admin-text)]">Upcoming Renewals (7 days)</h3>
            </div>
            <div className="space-y-2">
              {data.upcomingRenewals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-[var(--admin-border)] last:border-0">
                  <span className="text-sm text-[var(--admin-text-secondary)]">{r.id.substring(0, 8)}...</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--admin-text-dim)]">{planLabels[r.subscription_plan] || r.subscription_plan}</span>
                    <span className="text-xs text-[var(--admin-text-muted)]">{new Date(r.current_period_end).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>
      )}
    </div>
  )
}
