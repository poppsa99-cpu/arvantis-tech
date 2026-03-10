'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BlurFade } from '@/components/ui/blur-fade'
import { DataTable } from '@/components/admin/data-table'
import { Plus, X } from 'lucide-react'
import type { ClientListItem } from '@/lib/admin/types'

const planLabels: Record<string, string> = {
  starter: 'Autopilot',
  growth: 'Overdrive',
  scale: 'Takeover',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trialing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  past_due: 'bg-red-500/10 text-red-400 border-red-500/20',
  canceled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

const stageColors: Record<string, string> = {
  pending_call: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  call_booked: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  building: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const stageLabels: Record<string, string> = {
  pending_call: 'Pending Call',
  call_booked: 'Call Booked',
  building: 'Building',
  active: 'Active',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newClient, setNewClient] = useState({
    email: '', password: '', full_name: '', company_name: '', niche: '', phone: '',
    subscription_plan: '', setup_fee_paid: true,
  })
  const router = useRouter()

  useEffect(() => {
    fetchClients()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFilter, statusFilter])

  async function fetchClients() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (planFilter) params.set('plan', planFilter)
    if (statusFilter) params.set('status', statusFilter)

    const res = await fetch(`/api/admin/clients?${params}`)
    const data = await res.json()
    setClients(data.clients || [])
    setLoading(false)
  }

  async function createClient() {
    if (!newClient.email || !newClient.password) return
    setCreating(true)
    setCreateError('')

    const res = await fetch('/api/admin/clients/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient),
    })

    const data = await res.json()
    if (data.error) {
      setCreateError(data.error)
      setCreating(false)
      return
    }

    setShowAddForm(false)
    setNewClient({ email: '', password: '', full_name: '', company_name: '', niche: '', phone: '', subscription_plan: '', setup_fee_paid: true })
    setCreating(false)
    fetchClients()

    // Navigate to the new client's detail page
    if (data.userId) {
      router.push(`/admin/clients/${data.userId}`)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchClients(), 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const columns = [
    {
      key: 'company_name',
      label: 'Client',
      render: (c: ClientListItem) => (
        <div>
          <p className="text-[var(--admin-text)] font-medium">{c.company_name || c.full_name || 'Unnamed'}</p>
          <p className="text-xs text-[var(--admin-text-dim)]">{c.email}</p>
        </div>
      ),
    },
    {
      key: 'subscription_plan',
      label: 'Plan',
      render: (c: ClientListItem) => (
        <span className="text-[var(--admin-text-secondary)] text-sm">
          {c.subscription_plan ? planLabels[c.subscription_plan] || c.subscription_plan : '—'}
        </span>
      ),
    },
    {
      key: 'subscription_status',
      label: 'Status',
      render: (c: ClientListItem) => {
        const status = c.subscription_status || 'none'
        const colors = statusColors[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
            {status}
          </span>
        )
      },
    },
    {
      key: 'onboarding_status',
      label: 'Onboarding',
      render: (c: ClientListItem) => {
        const stage = c.onboarding_status || 'pending_call'
        const colors = stageColors[stage] || stageColors.pending_call
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
            {stageLabels[stage] || stage}
          </span>
        )
      },
    },
    {
      key: 'mrr',
      label: 'MRR',
      render: (c: ClientListItem) => (
        <span className="text-[var(--admin-text)]">{c.mrr ? `$${c.mrr.toLocaleString()}` : '—'}</span>
      ),
    },
    {
      key: 'agent_count',
      label: 'Agents',
      render: (c: ClientListItem) => (
        <span className="text-[var(--admin-text-secondary)]">{c.agent_count}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <BlurFade delay={0.05} duration={0.4}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--admin-text)]">Clients</h1>
            <p className="text-sm text-[var(--admin-text-dim)] mt-1">{clients.length} total clients</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'Add Client'}
          </button>
        </div>
      </BlurFade>

      {/* Add Client Form */}
      {showAddForm && (
        <BlurFade delay={0.08} duration={0.3}>
          <div className="rounded-xl border border-blue-500/20 bg-[var(--admin-card)] p-5 space-y-4">
            <h3 className="text-sm font-medium text-[var(--admin-text)]">Create New Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--admin-text-dim)] mb-1 block">Email *</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
                  placeholder="client@company.com"
                  className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--admin-text-dim)] mb-1 block">Temp Password *</label>
                <input
                  type="text"
                  value={newClient.password}
                  onChange={(e) => setNewClient((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Temporary password"
                  className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--admin-text-dim)] mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={newClient.full_name}
                  onChange={(e) => setNewClient((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="John Smith"
                  className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--admin-text-dim)] mb-1 block">Company Name</label>
                <input
                  type="text"
                  value={newClient.company_name}
                  onChange={(e) => setNewClient((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--admin-text-dim)] mb-1 block">Niche</label>
                <input
                  type="text"
                  value={newClient.niche}
                  onChange={(e) => setNewClient((p) => ({ ...p, niche: e.target.value }))}
                  placeholder="e.g. Real Estate, Legal, HVAC"
                  className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--admin-text-dim)] mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            {/* Optional: Activate subscription on creation */}
            <div className="border-t border-[var(--admin-border)] pt-4">
              <p className="text-xs text-[var(--admin-text-dim)] mb-3">Optionally activate a subscription now (or do it later from their profile)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--admin-text-dim)] mb-1 block">Plan</label>
                  <select
                    value={newClient.subscription_plan}
                    onChange={(e) => setNewClient((p) => ({ ...p, subscription_plan: e.target.value }))}
                    className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text-secondary)] focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">No plan yet</option>
                    <option value="starter">Autopilot — $700/mo</option>
                    <option value="growth">Overdrive — $1,000/mo</option>
                    <option value="scale">Takeover — $1,500/mo</option>
                  </select>
                </div>
                {newClient.subscription_plan && (
                  <label className="flex items-center gap-2 cursor-pointer self-end pb-2">
                    <input
                      type="checkbox"
                      checked={newClient.setup_fee_paid}
                      onChange={(e) => setNewClient((p) => ({ ...p, setup_fee_paid: e.target.checked }))}
                      className="rounded border-white/20"
                    />
                    <span className="text-xs text-[var(--admin-text-secondary)]">Setup fee ($1,500) paid</span>
                  </label>
                )}
              </div>
            </div>

            {createError && (
              <p className="text-xs text-red-400">{createError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={createClient}
                disabled={creating || !newClient.email || !newClient.password}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Client'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-[var(--admin-text-muted)] text-sm hover:text-[var(--admin-text)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </BlurFade>
      )}

      <BlurFade delay={0.1} duration={0.4}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={clients}
            onRowClick={(c) => router.push(`/admin/clients/${c.id}`)}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search clients..."
            emptyMessage="No clients found"
            filters={
              <div className="flex gap-2">
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text-secondary)] focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">All Plans</option>
                  <option value="starter">Autopilot</option>
                  <option value="growth">Overdrive</option>
                  <option value="scale">Takeover</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text-secondary)] focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
            }
          />
        )}
      </BlurFade>
    </div>
  )
}
