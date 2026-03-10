'use client'

import { useState } from 'react'
import { Calendar, Phone, Wrench, Rocket, ChevronRight } from 'lucide-react'

const stages = [
  { id: 'pending_call', label: 'Pending Call', icon: Calendar, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  { id: 'call_booked', label: 'Call Booked', icon: Phone, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'building', label: 'Building', icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'active', label: 'Active', icon: Rocket, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
]

interface OnboardingSectionProps {
  organization: Record<string, unknown> | null
  userId: string
  onUpdate: () => void
}

export function OnboardingSection({ organization, userId, onUpdate }: OnboardingSectionProps) {
  const [updating, setUpdating] = useState(false)
  const currentStage = (organization?.onboarding_status as string) || 'pending_call'
  const currentIndex = stages.findIndex((s) => s.id === currentStage)
  const stageChangedAt = organization?.stage_changed_at as string
  const daysInStage = stageChangedAt
    ? Math.floor((Date.now() - new Date(stageChangedAt).getTime()) / 86400000)
    : 0

  async function advanceStage() {
    if (currentIndex >= stages.length - 1) return
    setUpdating(true)
    const nextStage = stages[currentIndex + 1].id
    await fetch(`/api/admin/clients/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_status: nextStage }),
    })
    onUpdate()
    setUpdating(false)
  }

  async function setStage(stageId: string) {
    setUpdating(true)
    await fetch(`/api/admin/clients/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_status: stageId }),
    })
    onUpdate()
    setUpdating(false)
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--admin-text)]">Onboarding</h3>
        {daysInStage > 0 && currentStage !== 'active' && (
          <span className="text-xs text-[var(--admin-text-dim)]">{daysInStage} days in current stage</span>
        )}
      </div>

      {/* Stage Progress */}
      <div className="flex items-center gap-2 mb-6">
        {stages.map((stage, i) => {
          const Icon = stage.icon
          const isCompleted = i < currentIndex
          const isCurrent = i === currentIndex

          return (
            <div key={stage.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => setStage(stage.id)}
                disabled={updating}
                className={`flex flex-col items-center gap-1.5 group ${updating ? 'opacity-50' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : isCurrent
                    ? `${stage.bg} border-blue-500 ${stage.color}`
                    : 'bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text-dim)] group-hover:border-[var(--admin-border-hover)]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className={`text-[10px] font-medium ${
                  isCompleted || isCurrent ? 'text-[var(--admin-text-secondary)]' : 'text-[var(--admin-text-dim)]'
                }`}>
                  {stage.label}
                </p>
              </button>
              {i < stages.length - 1 && (
                <div className={`flex-1 h-[2px] mx-2 mt-[-16px] ${
                  isCompleted ? 'bg-blue-500' : 'bg-[var(--admin-border)]'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Advance Button */}
      {currentStage !== 'active' && (
        <button
          onClick={advanceStage}
          disabled={updating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
        >
          Advance to {stages[currentIndex + 1]?.label}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
