'use client'

import { useState, useEffect, useCallback } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { useRouter } from 'next/navigation'
import { Wrench, FlaskConical, Rocket, Inbox, Plus, X } from 'lucide-react'
import type { ClientListItem } from '@/lib/admin/types'

const stages = [
  { id: 'pending_call', label: 'Requests', icon: Inbox, color: 'text-slate-400', border: 'border-slate-500/20', description: 'New workflow build requests' },
  { id: 'building', label: 'Building', icon: Wrench, color: 'text-amber-400', border: 'border-amber-500/20', description: 'Currently being built' },
  { id: 'call_booked', label: 'Testing', icon: FlaskConical, color: 'text-blue-400', border: 'border-blue-500/20', description: 'In QA & client review' },
  { id: 'active', label: 'Active', icon: Rocket, color: 'text-emerald-400', border: 'border-emerald-500/20', description: 'Live & deployed' },
]

const planLabels: Record<string, string> = {
  starter: 'Autopilot',
  growth: 'Overdrive',
  scale: 'Takeover',
}

export default function PipelinePage() {
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestNote, setRequestNote] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/admin/clients')
    const data = await res.json()
    setClients(data.clients || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination } = result
    if (!destination) return

    const newStage = destination.droppableId

    // Optimistic update
    setClients((prev) =>
      prev.map((c) => (c.id === draggableId ? { ...c, onboarding_status: newStage } : c))
    )

    await fetch(`/api/admin/clients/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_status: newStage }),
    })
  }

  async function submitRequest() {
    if (!selectedClient) return
    setSubmitting(true)

    // Move client to pending_call (Requests) stage
    await fetch(`/api/admin/clients/${selectedClient}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_status: 'pending_call' }),
    })

    // Add a note if provided
    if (requestNote.trim()) {
      const client = clients.find(c => c.id === selectedClient)
      if (client?.organization_id) {
        await fetch(`/api/admin/clients/${selectedClient}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `[Workflow Request] ${requestNote}` }),
        })
      }
    }

    setShowRequestForm(false)
    setRequestNote('')
    setSelectedClient('')
    setSubmitting(false)
    fetchClients()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Active clients not in pending_call for the request dropdown
  const eligibleForRequest = clients.filter(
    c => c.onboarding_status === 'active' && c.subscription_plan
  )

  return (
    <div className="space-y-6">
      <BlurFade delay={0.05} duration={0.4}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--admin-text)]">Workflow Pipeline</h1>
            <p className="text-sm text-[var(--admin-text-dim)] mt-1">Drag clients between stages to update their build status</p>
          </div>
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </BlurFade>

      {/* New Request Form */}
      {showRequestForm && (
        <BlurFade delay={0.05} duration={0.3}>
          <div className="rounded-xl border border-blue-500/20 bg-[var(--admin-card)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--admin-text)]">New Workflow Build Request</p>
              <button onClick={() => setShowRequestForm(false)} className="text-[var(--admin-text-dim)] hover:text-[var(--admin-text)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] focus:outline-none focus:border-blue-500/50"
            >
              <option value="">Select client...</option>
              {eligibleForRequest.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.full_name || c.email}
                </option>
              ))}
            </select>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Describe the workflow to build (optional)..."
              rows={3}
              className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={submitRequest}
                disabled={!selectedClient || submitting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                onClick={() => setShowRequestForm(false)}
                className="px-4 py-2 text-[var(--admin-text-muted)] text-sm hover:text-[var(--admin-text)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </BlurFade>
      )}

      <BlurFade delay={0.1} duration={0.4}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-4">
            {stages.map((stage) => {
              const Icon = stage.icon
              const stageClients = clients.filter(
                (c) => (c.onboarding_status || 'pending_call') === stage.id
              )

              return (
                <div key={stage.id}>
                  {/* Column Header */}
                  <div className="mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${stage.color}`} />
                      <span className="text-sm font-medium text-[var(--admin-text)]">{stage.label}</span>
                      <span className="ml-auto text-xs text-[var(--admin-text-dim)] bg-[var(--admin-input-bg)] px-2 py-0.5 rounded-full">
                        {stageClients.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--admin-text-dim)] mt-1 ml-6">{stage.description}</p>
                  </div>

                  {/* Droppable Column */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[300px] rounded-xl border p-2 space-y-2 transition-colors ${
                          snapshot.isDraggingOver
                            ? `${stage.border} bg-[var(--admin-hover)]`
                            : 'border-[var(--admin-border)] bg-[var(--admin-card)]'
                        }`}
                      >
                        {stageClients.map((client, i) => (
                          <Draggable key={client.id} draggableId={client.id} index={i}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => router.push(`/admin/clients/${client.id}`)}
                                className={`rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 cursor-pointer transition-all ${
                                  snapshot.isDragging ? 'shadow-lg shadow-blue-500/10 border-blue-500/30' : 'hover:border-[var(--admin-border-hover)]'
                                }`}
                              >
                                <p className="text-sm font-medium text-[var(--admin-text)] truncate">
                                  {client.company_name || client.full_name || 'Unnamed'}
                                </p>
                                <p className="text-xs text-[var(--admin-text-dim)] truncate mt-0.5">{client.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {client.subscription_plan && (
                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                                      {planLabels[client.subscription_plan] || client.subscription_plan}
                                    </span>
                                  )}
                                  {client.mrr > 0 && (
                                    <span className="text-[10px] text-[var(--admin-text-dim)]">${client.mrr}/mo</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </BlurFade>
    </div>
  )
}
