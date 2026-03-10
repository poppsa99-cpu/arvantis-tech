'use client'

import { useState } from 'react'
import { Zap, ArrowUpDown } from 'lucide-react'

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

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trialing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  past_due: 'bg-red-500/10 text-red-400 border-red-500/20',
  canceled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  incomplete: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  manual: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

interface SubscriptionSectionProps {
  profile: Record<string, unknown> | null
  userId?: string
  onUpdate?: () => void
}

export function SubscriptionSection({ profile, userId, onUpdate }: SubscriptionSectionProps) {
  const [showManual, setShowManual] = useState(false)
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [manualPlan, setManualPlan] = useState('starter')
  const [changePlan, setChangePlan] = useState('')
  const [manualSetupPaid, setManualSetupPaid] = useState(true)
  const [saving, setSaving] = useState(false)

  async function activateManually() {
    if (!userId) return
    setSaving(true)

    const nextBilling = new Date()
    nextBilling.setMonth(nextBilling.getMonth() + 1)

    await fetch(`/api/admin/clients/${userId}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_plan: manualPlan,
        subscription_status: 'active',
        setup_fee_paid: manualSetupPaid,
        current_period_end: nextBilling.toISOString(),
      }),
    })

    setSaving(false)
    setShowManual(false)
    onUpdate?.()
  }

  async function changeSubscriptionPlan() {
    if (!userId || !changePlan) return
    setSaving(true)

    // Keep the existing billing period — new price takes effect next cycle
    await fetch(`/api/admin/clients/${userId}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_plan: changePlan,
        subscription_status: 'active',
      }),
    })

    setSaving(false)
    setShowChangePlan(false)
    onUpdate?.()
  }

  async function deactivate() {
    if (!userId || !confirm('Deactivate this subscription?')) return
    setSaving(true)

    await fetch(`/api/admin/clients/${userId}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_status: 'canceled',
      }),
    })

    setSaving(false)
    onUpdate?.()
  }

  const plan = profile?.subscription_plan as string
  const status = profile?.subscription_status as string
  const setupPaid = profile?.setup_fee_paid as boolean
  const periodEnd = profile?.current_period_end as string
  const failures = (profile?.payment_failures as number) || 0
  const dunning = profile?.dunning_stage as string

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--admin-text)]">Subscription</h3>
        <div className="flex items-center gap-2">
          {userId && plan && status === 'active' && (
            <button
              onClick={() => { setShowChangePlan(!showChangePlan); setShowManual(false); setChangePlan(plan) }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" />
              Change Plan
            </button>
          )}
          {userId && (
            <button
              onClick={() => { setShowManual(!showManual); setShowChangePlan(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[11px] text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Manual Activate
            </button>
          )}
        </div>
      </div>

      {/* Manual Activation Form */}
      {showManual && (
        <div className="mb-4 p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-3">
          <p className="text-xs text-purple-300 font-medium">Activate subscription manually (Zelle, cash, etc.)</p>
          <div className="flex gap-2">
            <select
              value={manualPlan}
              onChange={(e) => setManualPlan(e.target.value)}
              className="flex-1 bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] focus:outline-none focus:border-purple-500/50"
            >
              <option value="starter">Autopilot — $700/mo</option>
              <option value="growth">Overdrive — $1,000/mo</option>
              <option value="scale">Takeover — $1,500/mo</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={manualSetupPaid}
              onChange={(e) => setManualSetupPaid(e.target.checked)}
              className="rounded border-white/20"
            />
            <span className="text-xs text-[var(--admin-text-secondary)]">Setup fee ($1,500) paid</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={activateManually}
              disabled={saving}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Activating...' : 'Activate Now'}
            </button>
            <button
              onClick={() => setShowManual(false)}
              className="px-4 py-2 text-[var(--admin-text-muted)] text-sm hover:text-[var(--admin-text)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Change Plan Form */}
      {showChangePlan && plan && (
        <div className="mb-4 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-3">
          <p className="text-xs text-blue-300 font-medium">Change subscription plan (takes effect next billing cycle)</p>
          <div className="flex gap-2">
            <select
              value={changePlan}
              onChange={(e) => setChangePlan(e.target.value)}
              className="flex-1 bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] focus:outline-none focus:border-blue-500/50"
            >
              <option value="starter">Autopilot — $700/mo</option>
              <option value="growth">Overdrive — $1,000/mo</option>
              <option value="scale">Takeover — $1,500/mo</option>
            </select>
          </div>
          {changePlan !== plan && (
            <p className="text-xs text-[var(--admin-text-muted)]">
              {planPrices[changePlan] > planPrices[plan]
                ? `Upgrading from ${planLabels[plan]} ($${planPrices[plan]}) → ${planLabels[changePlan]} ($${planPrices[changePlan]})`
                : `Downgrading from ${planLabels[plan]} ($${planPrices[plan]}) → ${planLabels[changePlan]} ($${planPrices[changePlan]})`
              }
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={changeSubscriptionPlan}
              disabled={saving || changePlan === plan}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Plan'}
            </button>
            <button
              onClick={() => setShowChangePlan(false)}
              className="px-4 py-2 text-[var(--admin-text-muted)] text-sm hover:text-[var(--admin-text)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current Subscription Info */}
      {!profile || !plan ? (
        <p className="text-sm text-[var(--admin-text-dim)]">No subscription yet</p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--admin-text-dim)]">Plan</span>
            <span className="text-sm text-[var(--admin-text)] font-medium">
              {planLabels[plan] || plan} — ${planPrices[plan] || 0}/mo
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--admin-text-dim)]">Status</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.canceled}`}>
              {status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--admin-text-dim)]">Setup Fee</span>
            <span className={`text-sm ${setupPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {setupPaid ? 'Paid' : 'Not Paid'}
            </span>
          </div>
          {periodEnd && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--admin-text-dim)]">Next Billing</span>
              <span className="text-sm text-[var(--admin-text)]">
                {new Date(periodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
          {failures > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--admin-text-dim)]">Payment Failures</span>
              <span className="text-sm text-red-400">{failures} {dunning && `(${dunning})`}</span>
            </div>
          )}
          {status === 'active' && userId && (
            <div className="pt-2 border-t border-[var(--admin-border)]">
              <button
                onClick={deactivate}
                disabled={saving}
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
              >
                Deactivate subscription
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
