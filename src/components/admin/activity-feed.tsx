'use client'

import { BlurFade } from '@/components/ui/blur-fade'
import type { BillingEvent } from '@/lib/admin/types'
import { CreditCard, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

const eventConfig: Record<string, { icon: typeof CreditCard; color: string; label: string }> = {
  'checkout.session.completed': { icon: CheckCircle2, color: 'text-emerald-400', label: 'New subscription' },
  'invoice.payment_succeeded': { icon: CreditCard, color: 'text-blue-400', label: 'Payment received' },
  'invoice.payment_failed': { icon: AlertCircle, color: 'text-red-400', label: 'Payment failed' },
  'customer.subscription.updated': { icon: CreditCard, color: 'text-amber-400', label: 'Subscription updated' },
  'customer.subscription.deleted': { icon: XCircle, color: 'text-red-400', label: 'Subscription canceled' },
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function ActivityFeed({ events }: { events: BillingEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--admin-text-dim)] text-sm">
        No recent activity
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {events.map((event, i) => {
        const config = eventConfig[event.event_type] || {
          icon: CreditCard,
          color: 'text-[var(--admin-text-muted)]',
          label: event.event_type,
        }
        const Icon = config.icon
        const email = (event.data as Record<string, unknown>)?.customer_email as string || 'Unknown'

        return (
          <BlurFade key={event.id} delay={0.05 * i} duration={0.3}>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--admin-hover)] transition-colors">
              <div className={`w-8 h-8 rounded-full bg-[var(--admin-input-bg)] flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--admin-text)] truncate">{config.label}</p>
                <p className="text-xs text-[var(--admin-text-dim)] truncate">{email}</p>
              </div>
              <p className="text-xs text-[var(--admin-text-dim)] flex-shrink-0">{timeAgo(event.created_at)}</p>
            </div>
          </BlurFade>
        )
      })}
    </div>
  )
}
