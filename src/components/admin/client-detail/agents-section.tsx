'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Pause, Play, AlertTriangle } from 'lucide-react'
import type { AgentTemplate } from '@/lib/admin/types'
import { PLAN_AGENT_LIMITS } from '@/lib/admin/types'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
}

interface Agent {
  id: string
  status: string
  n8n_webhook_url: string | null
  runs_count: number
  error_message: string | null
  created_at: string
  agent_template: AgentTemplate
}

interface AgentsSectionProps {
  agents: Array<Record<string, unknown>>
  userId: string
  organizationId: string | undefined
  onUpdate: () => void
}

export function AgentsSection({ agents: rawAgents, userId, onUpdate }: AgentsSectionProps) {
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [adding, setAdding] = useState(false)

  const agents = rawAgents as unknown as Agent[]

  useEffect(() => {
    fetch('/api/admin/agents')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(console.error)
  }, [])

  async function addAgent() {
    if (!selectedTemplate) return
    setAdding(true)
    await fetch(`/api/admin/clients/${userId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_template_id: selectedTemplate,
        n8n_webhook_url: webhookUrl || null,
      }),
    })
    setShowAddForm(false)
    setSelectedTemplate('')
    setWebhookUrl('')
    setAdding(false)
    onUpdate()
  }

  async function toggleAgent(agentId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    await fetch(`/api/admin/clients/${userId}/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    onUpdate()
  }

  async function removeAgent(agentId: string) {
    if (!confirm('Remove this agent from the client?')) return
    await fetch(`/api/admin/clients/${userId}/agents/${agentId}`, {
      method: 'DELETE',
    })
    onUpdate()
  }

  // Get available templates (not already deployed)
  const deployedSlugs = agents.map((a) => a.agent_template?.slug).filter(Boolean)
  const availableTemplates = templates.filter((t) => !deployedSlugs.includes(t.slug))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--admin-text)]">Deployed Agents ({agents.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 hover:bg-blue-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Agent
        </button>
      </div>

      {/* Add Agent Form */}
      {showAddForm && (
        <div className="rounded-xl border border-blue-500/20 bg-[var(--admin-card)] p-4 space-y-3">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] focus:outline-none focus:border-blue-500/50"
          >
            <option value="">Select agent template...</option>
            {availableTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.display_name}</option>
            ))}
          </select>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="n8n Webhook URL (optional — add later)"
            className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
          />
          <div className="flex gap-2">
            <button
              onClick={addAgent}
              disabled={adding || !selectedTemplate}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {adding ? 'Deploying...' : 'Deploy Agent'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-[var(--admin-text-muted)] text-sm hover:text-[var(--admin-text)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Agent List */}
      {agents.length === 0 ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-8 text-center">
          <p className="text-sm text-[var(--admin-text-dim)]">No agents deployed yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--admin-text)]">
                    {agent.agent_template?.display_name || 'Unknown Agent'}
                  </p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[agent.status]}`}>
                    {agent.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--admin-text-dim)] mt-1">
                  {agent.runs_count} runs
                  {agent.n8n_webhook_url && ` · ${agent.n8n_webhook_url.substring(0, 40)}...`}
                </p>
                {agent.status === 'error' && agent.error_message && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <p className="text-xs text-red-400">{agent.error_message}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleAgent(agent.id, agent.status)}
                  className="p-2 rounded-lg hover:bg-[var(--admin-hover)] transition-colors"
                  title={agent.status === 'active' ? 'Pause' : 'Resume'}
                >
                  {agent.status === 'active' ? (
                    <Pause className="w-4 h-4 text-[var(--admin-text-muted)]" />
                  ) : (
                    <Play className="w-4 h-4 text-[var(--admin-text-muted)]" />
                  )}
                </button>
                <button
                  onClick={() => removeAgent(agent.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4 text-[var(--admin-text-muted)] hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
