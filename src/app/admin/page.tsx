'use client'

import { useState, useEffect } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { StatsCards } from '@/components/admin/stats-cards'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { ActivityFeed } from '@/components/admin/activity-feed'
import type { BillingEvent } from '@/lib/admin/types'

interface Stats {
  totalMrr: number
  activeClients: number
  onboardingCounts: Record<string, number>
  onboardingTotal: number
  agentErrors: number
  recentActivity: BillingEvent[]
  mrrTrend: { month: string; mrr: number }[]
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-[var(--admin-text-dim)]">
        Failed to load dashboard data
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <BlurFade delay={0.05} duration={0.4}>
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">Dashboard</h1>
          <p className="text-sm text-[var(--admin-text-dim)] mt-1">Agency overview and key metrics</p>
        </div>
      </BlurFade>

      {/* Stats */}
      <StatsCards
        totalMrr={stats.totalMrr}
        activeClients={stats.activeClients}
        onboardingCount={stats.onboardingTotal}
        agentErrors={stats.agentErrors}
      />

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <BlurFade delay={0.3} duration={0.4}>
          <div className="lg:col-span-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
            <h3 className="text-sm font-medium text-[var(--admin-text)] mb-4">Revenue Trend</h3>
            <RevenueChart data={stats.mrrTrend} />
          </div>
        </BlurFade>

        {/* Activity Feed */}
        <BlurFade delay={0.35} duration={0.4}>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
            <h3 className="text-sm font-medium text-[var(--admin-text)] mb-4">Recent Activity</h3>
            <div className="max-h-[240px] overflow-y-auto">
              <ActivityFeed events={stats.recentActivity} />
            </div>
          </div>
        </BlurFade>
      </div>

      {/* Onboarding Pipeline Summary */}
      <BlurFade delay={0.4} duration={0.4}>
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
          <h3 className="text-sm font-medium text-[var(--admin-text)] mb-4">Onboarding Pipeline</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { stage: 'pending_call', label: 'Pending Call', color: 'text-[var(--admin-text-muted)]' },
              { stage: 'call_booked', label: 'Call Booked', color: 'text-blue-400' },
              { stage: 'building', label: 'Building', color: 'text-amber-400' },
              { stage: 'active', label: 'Active', color: 'text-emerald-400' },
            ].map((item) => (
              <div key={item.stage} className="text-center">
                <p className={`text-2xl font-bold ${item.color}`}>
                  {stats.onboardingCounts[item.stage] || 0}
                </p>
                <p className="text-xs text-[var(--admin-text-dim)] mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </BlurFade>
    </div>
  )
}
