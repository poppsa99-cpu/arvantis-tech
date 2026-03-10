'use client'

import { CreditCard, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

const eventLabels: Record<string, { label: string; color: string; icon: typeof CreditCard }> = {
  'checkout.session.completed': { label: 'Checkout Complete', color: 'text-emerald-400', icon: CheckCircle2 },
  'invoice.payment_succeeded': { label: 'Payment Received', color: 'text-blue-400', icon: CreditCard },
  'invoice.payment_failed': { label: 'Payment Failed', color: 'text-red-400', icon: AlertCircle },
  'customer.subscription.updated': { label: 'Subscription Updated', color: 'text-amber-400', icon: CreditCard },
  'customer.subscription.deleted': { label: 'Subscription Canceled', color: 'text-red-400', icon: XCircle },
}

interface BillingSectionProps {
  events: Array<Record<string, unknown>>
}

export function BillingSection({ events }: BillingSectionProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-8 text-center">
        <p className="text-sm text-[var(--admin-text-dim)]">No billing events yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
            <th className="text-left px-4 py-3 text-xs font-medium text-[var(--admin-text-dim)] uppercase">Event</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[var(--admin-text-dim)] uppercase">Details</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[var(--admin-text-dim)] uppercase">Date</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, i) => {
            const eventType = event.event_type as string
            const config = eventLabels[eventType] || { label: eventType, color: 'text-slate-400', icon: CreditCard }
            const Icon = config.icon
            const data = event.data as Record<string, unknown>

            return (
              <tr key={event.id as string || i} className="border-b border-[var(--admin-border)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="text-sm text-[var(--admin-text)]">{config.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[var(--admin-text-dim)]">
                    {data?.plan_name as string || data?.plan_id as string || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[var(--admin-text-dim)]">
                    {new Date(event.created_at as string).toLocaleString()}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
