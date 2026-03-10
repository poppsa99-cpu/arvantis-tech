'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { BlurFade } from '@/components/ui/blur-fade'
import { ArrowLeft } from 'lucide-react'
import { ProfileSection } from '@/components/admin/client-detail/profile-section'
import { SubscriptionSection } from '@/components/admin/client-detail/subscription-section'
import { OnboardingSection } from '@/components/admin/client-detail/onboarding-section'
import { AgentsSection } from '@/components/admin/client-detail/agents-section'
import { BillingSection } from '@/components/admin/client-detail/billing-section'
import { NotesSection } from '@/components/admin/client-detail/notes-section'

interface ClientData {
  user: {
    id: string
    email: string
    full_name: string
    company_name: string
    niche: string
    phone: string
    created_at: string
  }
  profile: Record<string, unknown> | null
  organization: Record<string, unknown> | null
  agents: Array<Record<string, unknown>>
  billingEvents: Array<Record<string, unknown>>
  notes: Array<Record<string, unknown>>
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  useEffect(() => {
    fetchClient()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchClient() {
    setLoading(true)
    const res = await fetch(`/api/admin/clients/${id}`)
    if (res.ok) {
      setData(await res.json())
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-16 text-[var(--admin-text-dim)]">Client not found</div>
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'agents', label: `Agents (${data.agents.length})` },
    { id: 'billing', label: 'Billing' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <BlurFade delay={0.05} duration={0.4}>
        <button
          onClick={() => router.push('/admin/clients')}
          className="flex items-center gap-2 text-sm text-[var(--admin-text-dim)] hover:text-[var(--admin-text)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">
            {data.user.company_name || data.user.full_name || data.user.email}
          </h1>
          <p className="text-sm text-[var(--admin-text-dim)] mt-1">{data.user.email}</p>
        </div>
      </BlurFade>

      {/* Tabs */}
      <BlurFade delay={0.1} duration={0.4}>
        <div className="flex gap-1 border-b border-[var(--admin-border)] pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab.id
                  ? 'text-blue-400 border-blue-400'
                  : 'text-[var(--admin-text-dim)] border-transparent hover:text-[var(--admin-text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </BlurFade>

      {/* Tab Content */}
      <BlurFade delay={0.15} duration={0.4}>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfileSection user={data.user} />
            <SubscriptionSection profile={data.profile} userId={data.user.id} onUpdate={fetchClient} />
            <OnboardingSection
              organization={data.organization}
              userId={data.user.id}
              onUpdate={fetchClient}
            />
          </div>
        )}

        {activeTab === 'agents' && (
          <AgentsSection
            agents={data.agents}
            userId={data.user.id}
            organizationId={data.organization?.id as string | undefined}
            onUpdate={fetchClient}
          />
        )}

        {activeTab === 'billing' && (
          <BillingSection events={data.billingEvents} />
        )}

        {activeTab === 'notes' && (
          <NotesSection
            notes={data.notes}
            userId={data.user.id}
            onUpdate={fetchClient}
          />
        )}
      </BlurFade>
    </div>
  )
}
