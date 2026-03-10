'use client'

import { DollarSign, Users, Clock, AlertTriangle } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'

interface StatsCardsProps {
  totalMrr: number
  activeClients: number
  onboardingCount: number
  agentErrors: number
}

export function StatsCards({ totalMrr, activeClients, onboardingCount, agentErrors }: StatsCardsProps) {
  const stats = [
    {
      label: 'Monthly Revenue',
      value: `$${totalMrr.toLocaleString()}`,
      subtext: 'MRR',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Active Clients',
      value: activeClients.toString(),
      subtext: 'paying',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Onboarding',
      value: onboardingCount.toString(),
      subtext: 'in pipeline',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'Agent Errors',
      value: agentErrors.toString(),
      subtext: 'need attention',
      icon: AlertTriangle,
      color: agentErrors > 0 ? 'text-red-400' : 'text-[var(--admin-text-dim)]',
      bg: agentErrors > 0 ? 'bg-red-500/10' : 'bg-[var(--admin-input-bg)]',
      border: agentErrors > 0 ? 'border-red-500/20' : 'border-[var(--admin-border)]',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <BlurFade key={stat.label} delay={0.1 + i * 0.05} duration={0.4}>
            <div className={`rounded-xl border ${stat.border} ${stat.bg} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">{stat.label}</p>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-[var(--admin-text)]">{stat.value}</p>
              <p className="text-xs text-[var(--admin-text-dim)] mt-1">{stat.subtext}</p>
            </div>
          </BlurFade>
        )
      })}
    </div>
  )
}
