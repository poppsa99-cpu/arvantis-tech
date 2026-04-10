'use client'

import { useState, useEffect } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import {
  Mail, Target, Headphones, Share2, Search, Receipt, FileText, Package,
  Bot, Plus, Users, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Workflow, Cpu, Building2, Pause, Play,
} from 'lucide-react'
import Link from 'next/link'
import type { AgentTemplate } from '@/lib/admin/types'

const iconMap: Record<string, typeof Bot> = {
  Mail, Target, Headphones, Share2, Search, Receipt, FileText, Package,
}

const categoryColors: Record<string, string> = {
  sales: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  operations: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  marketing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

// Workflow slugs — templates that are full document-processing workflows
const WORKFLOW_SLUGS = ['document', 'motion-to-compel']

interface Deployment {
  id: string
  status: string
  company_name: string
  organization_id: string
  user_id: string
}

interface TemplateWithDetails extends AgentTemplate {
  deployment_count: number
  deployments: Deployment[]
}

export default function AgentsPage() {
  const [templates, setTemplates] = useState<TemplateWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [togglingDeployment, setTogglingDeployment] = useState<string | null>(null)
  const [formData, setFormData] = useState({ slug: '', display_name: '', description: '', icon: 'Bot', category: 'operations' })

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    const res = await fetch('/api/admin/agents')
    const data = await res.json()
    setTemplates(data.templates || [])
    setLoading(false)
  }

  async function toggleAvailability(id: string, current: boolean) {
    await fetch('/api/admin/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_available: !current }),
    })
    fetchTemplates()
  }

  async function toggleDeploymentStatus(deploymentId: string, currentStatus: string) {
    setTogglingDeployment(deploymentId)
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    await fetch('/api/admin/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'deployment', deployment_id: deploymentId, status: newStatus }),
    })
    await fetchTemplates()
    setTogglingDeployment(null)
  }

  async function createTemplate() {
    if (!formData.slug || !formData.display_name) return
    await fetch('/api/admin/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    setShowForm(false)
    setFormData({ slug: '', display_name: '', description: '', icon: 'Bot', category: 'operations' })
    fetchTemplates()
  }

  function toggleExpanded(templateId: string) {
    setExpandedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) next.delete(templateId)
      else next.add(templateId)
      return next
    })
  }

  const workflows = templates.filter(t => WORKFLOW_SLUGS.includes(t.slug))
  const agents = templates.filter(t => !WORKFLOW_SLUGS.includes(t.slug))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function renderTemplateCard(template: TemplateWithDetails, index: number) {
    const Icon = iconMap[template.icon || ''] || Bot
    const catColor = categoryColors[template.category || ''] || categoryColors.operations
    const isExpanded = expandedTemplates.has(template.id)
    const isWorkflow = WORKFLOW_SLUGS.includes(template.slug)

    return (
      <BlurFade key={template.id} delay={0.1 + index * 0.03} duration={0.4}>
        <div className={`rounded-xl border bg-[var(--admin-card)] transition-all ${
          template.is_available ? 'border-[var(--admin-border)]' : 'border-[var(--admin-border)] opacity-60'
        }`}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isWorkflow ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-[var(--admin-input-bg)]'
                }`}>
                  <Icon className={`w-5 h-5 ${isWorkflow ? 'text-violet-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[var(--admin-text)]">{template.display_name}</h3>
                  <p className="text-xs text-[var(--admin-text-dim)] mt-0.5 line-clamp-1">{template.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleAvailability(template.id, template.is_available)}
                className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
                title={template.is_available ? 'Disable' : 'Enable'}
              >
                {template.is_available ? (
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-[var(--admin-text-dim)]" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${catColor}`}>
                {template.category}
              </span>
              <button
                onClick={() => template.deployment_count > 0 && toggleExpanded(template.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  template.deployment_count > 0
                    ? 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] cursor-pointer'
                    : 'text-[var(--admin-text-dim)] cursor-default'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>{template.deployment_count} deployed</span>
                {template.deployment_count > 0 && (
                  isExpanded
                    ? <ChevronUp className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Expanded deployments list */}
          {isExpanded && template.deployments.length > 0 && (
            <div className="border-t border-[var(--admin-border)] px-5 py-3 space-y-2">
              {template.deployments.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <Link
                    href={`/admin/clients/${dep.user_id}`}
                    className="flex items-center gap-2 hover:text-blue-400 transition-colors group/link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Building2 className="w-3.5 h-3.5 text-[var(--admin-text-dim)] group-hover/link:text-blue-400" />
                    <span className="text-xs text-[var(--admin-text-secondary)] group-hover/link:text-blue-400 underline-offset-2 group-hover/link:underline">{dep.company_name}</span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      dep.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : dep.status === 'paused'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {dep.status}
                    </span>
                    <button
                      onClick={() => toggleDeploymentStatus(dep.id, dep.status)}
                      disabled={togglingDeployment === dep.id}
                      className="p-1 rounded hover:bg-[var(--admin-hover)] transition-colors disabled:opacity-50"
                      title={dep.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {dep.status === 'active' ? (
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </BlurFade>
    )
  }

  return (
    <div className="space-y-8">
      <BlurFade delay={0.05} duration={0.4}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--admin-text)]">Agents & Workflows</h1>
            <p className="text-sm text-[var(--admin-text-dim)] mt-1">{agents.length} agents, {workflows.length} workflows</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </BlurFade>

      {/* Create Form */}
      {showForm && (
        <BlurFade delay={0.1} duration={0.3}>
          <div className="rounded-xl border border-blue-500/20 bg-[var(--admin-card)] p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                placeholder="Slug (e.g., appointment-scheduler)"
                className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="Display Name"
                className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description"
              className="w-full bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text-secondary)] focus:outline-none focus:border-blue-500/50"
              >
                <option value="sales">Sales</option>
                <option value="operations">Operations</option>
                <option value="marketing">Marketing</option>
              </select>
              <select
                value={formData.icon}
                onChange={(e) => setFormData((p) => ({ ...p, icon: e.target.value }))}
                className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text-secondary)] focus:outline-none focus:border-blue-500/50"
              >
                {Object.keys(iconMap).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="Bot">Bot</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={createTemplate} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                Create Template
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[var(--admin-text-muted)] text-sm hover:text-[var(--admin-text)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </BlurFade>
      )}

      {/* Workflows Section */}
      {workflows.length > 0 && (
        <div>
          <BlurFade delay={0.12} duration={0.4}>
            <div className="flex items-center gap-2 mb-4">
              <Workflow className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Workflows</h2>
              <span className="text-xs text-[var(--admin-text-dim)] ml-1">Full document-processing pipelines</span>
            </div>
          </BlurFade>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((t, i) => renderTemplateCard(t, i))}
          </div>
        </div>
      )}

      {/* Agents Section */}
      <div>
        <BlurFade delay={0.15} duration={0.4}>
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Agents</h2>
            <span className="text-xs text-[var(--admin-text-dim)] ml-1">Standalone AI automations</span>
          </div>
        </BlurFade>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((t, i) => renderTemplateCard(t, i))}
        </div>
      </div>
    </div>
  )
}
