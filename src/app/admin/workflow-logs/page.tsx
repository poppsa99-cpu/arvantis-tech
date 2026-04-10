'use client'

import { useState, useEffect, useCallback } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { Badge } from '@/components/ui/badge'
import {
  Activity, RefreshCw, ChevronDown, ChevronUp,
  RotateCcw, FileText, AlertTriangle, CheckCircle2, Clock,
  Copy, Check,
} from 'lucide-react'

interface HealthItem {
  slug: string
  name: string
  healthy: boolean
  configured: boolean
  reachable: boolean
}

interface LogEntry {
  id: string
  created_at: string
  user_email: string
  workflow: string
  file_name: string
  status: 'processing' | 'done' | 'error'
  raw_text?: string
  error_message?: string
  n8n_response?: unknown
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

const workflowLabels: Record<string, string> = {
  'motion-to-strike': 'Motion to Strike',
  'motion-to-compel': 'Motion to Compel',
}

export default function WorkflowLogsPage() {
  const [health, setHealth] = useState<HealthItem[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [healthLoading, setHealthLoading] = useState(true)
  const [workflowFilter, setWorkflowFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showFullText, setShowFullText] = useState<Set<string>>(new Set())
  const [retrying, setRetrying] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const LIMIT = 50

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/admin/workflow-health')
      const data = await res.json()
      setHealth(data.workflows || [])
    } catch {
      setHealth([])
    }
    setHealthLoading(false)
  }, [])

  const fetchLogs = useCallback(async (append = false) => {
    if (!append) setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT) })
      if (workflowFilter !== 'all') params.set('workflow', workflowFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (append) params.set('offset', String(offset + LIMIT))

      const res = await fetch(`/api/admin/workflow-logs?${params}`)
      const data = await res.json()
      const newLogs: LogEntry[] = data.logs || []

      if (append) {
        setLogs(prev => [...prev, ...newLogs])
        setOffset(prev => prev + LIMIT)
      } else {
        setLogs(newLogs)
        setOffset(0)
      }
      setHasMore(newLogs.length === LIMIT)
    } catch {
      if (!append) setLogs([])
    }
    setLoading(false)
  }, [workflowFilter, statusFilter, offset])

  useEffect(() => {
    fetchHealth()
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowFilter, statusFilter])

  function handleRefresh() {
    fetchHealth()
    fetchLogs()
  }

  async function handleRetry(logEntry: LogEntry) {
    setRetrying(logEntry.id)
    try {
      await fetch('/api/admin/workflow-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logEntry.id, workflow: logEntry.workflow }),
      })
      await fetchLogs()
    } catch {
      // silent
    }
    setRetrying(null)
  }

  function toggleShowFullText(id: string) {
    setShowFullText(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // silent
    }
  }

  // Stats
  const totalLogs = logs.length
  const errorCount = logs.filter(l => l.status === 'error').length
  const processingCount = logs.filter(l => l.status === 'processing').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <BlurFade delay={0.05} duration={0.4}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Workflow Logs</h1>
            <p className="text-sm text-[var(--admin-text-dim)] mt-1">
              Monitor submissions, errors, and debug failed workflows
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--admin-text-dim)]">
            <span>{totalLogs} logs</span>
            {errorCount > 0 && (
              <span className="text-red-400">{errorCount} errors</span>
            )}
            {processingCount > 0 && (
              <span className="text-amber-400">{processingCount} processing</span>
            )}
          </div>
        </div>
      </BlurFade>

      {/* Health Status Bar */}
      <BlurFade delay={0.1} duration={0.4}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {health.map((item) => (
            <div
              key={item.slug}
              className="bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Activity className="w-5 h-5 text-[var(--admin-text-dim)]" />
                  <span
                    className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--admin-card)] ${
                      healthLoading
                        ? 'bg-[var(--admin-text-dim)]'
                        : item.healthy
                        ? 'bg-emerald-400'
                        : 'bg-red-400'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-[var(--admin-text)] truncate">{item.name}</h3>
                  <p className="text-xs text-[var(--admin-text-dim)] mt-0.5">
                    {healthLoading
                      ? 'Checking...'
                      : `${item.configured ? 'Configured' : 'Not configured'} / ${item.reachable ? 'Reachable' : 'Unreachable'}`
                    }
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </BlurFade>

      {/* Filters Row */}
      <BlurFade delay={0.15} duration={0.4}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
            className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Workflows</option>
            <option value="motion-to-strike">Motion to Strike</option>
            <option value="motion-to-compel">Motion to Compel</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="done">Done</option>
            <option value="error">Error</option>
          </select>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </BlurFade>

      {/* Logs Table */}
      <BlurFade delay={0.2} duration={0.4}>
        <div className="bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-[var(--admin-text-dim)]">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No workflow logs found</p>
              <p className="text-xs mt-1 opacity-70">Logs will appear here when users submit documents</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[100px_1fr_140px_1fr_100px_80px] gap-4 px-5 py-3 border-b border-[var(--admin-border)] text-xs font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">
                <span>Time</span>
                <span>User</span>
                <span>Workflow</span>
                <span>File</span>
                <span>Status</span>
                <span>Details</span>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-[var(--admin-border)]">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id
                  const isFullText = showFullText.has(log.id)

                  return (
                    <div key={log.id}>
                      {/* Row */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className={`w-full text-left grid grid-cols-1 md:grid-cols-[100px_1fr_140px_1fr_100px_80px] gap-2 md:gap-4 px-5 py-3 hover:bg-[var(--admin-input-bg)] transition-colors items-center ${
                          log.status === 'error' ? 'border-l-2 border-l-red-500/50' : ''
                        }`}
                      >
                        <span className="text-xs text-[var(--admin-text-dim)]" title={formatDate(log.created_at)}>
                          {timeAgo(log.created_at)}
                        </span>
                        <span className="text-sm text-[var(--admin-text)] truncate">
                          {log.user_email || 'Unknown user'}
                        </span>
                        <span className="text-xs text-[var(--admin-text-secondary)]">
                          {workflowLabels[log.workflow] || log.workflow}
                        </span>
                        <span className="text-sm text-[var(--admin-text)] truncate">
                          {log.file_name || '—'}
                        </span>
                        <span>
                          <Badge
                            className={
                              log.status === 'done'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : log.status === 'error'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }
                            variant="outline"
                          >
                            {log.status === 'done' && <CheckCircle2 className="w-3 h-3" />}
                            {log.status === 'error' && <AlertTriangle className="w-3 h-3" />}
                            {log.status === 'processing' && <Clock className="w-3 h-3" />}
                            {log.status}
                          </Badge>
                        </span>
                        <span className="flex items-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[var(--admin-text-dim)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--admin-text-dim)]" />
                          )}
                        </span>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-5 pb-4 space-y-4 border-t border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                          {/* Metadata summary */}
                          <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-[10px] font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">Log ID</span>
                              <p className="text-xs text-[var(--admin-text-secondary)] font-mono mt-0.5 truncate">{log.id}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">Timestamp</span>
                              <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">{formatDate(log.created_at)}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">Workflow</span>
                              <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">{workflowLabels[log.workflow] || log.workflow}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">User</span>
                              <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5 truncate">{log.user_email || 'Unknown'}</p>
                            </div>
                          </div>

                          {/* Error Message */}
                          {log.status === 'error' && log.error_message && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider">
                                  Error Message
                                </h4>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(String(log.error_message), `err-${log.id}`) }}
                                  className="text-xs text-[var(--admin-text-dim)] hover:text-[var(--admin-text)] transition-colors"
                                >
                                  {copiedId === `err-${log.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="text-xs text-red-400 bg-red-500/5 rounded-lg p-3 border border-red-500/20 whitespace-pre-wrap break-words">
                                {String(log.error_message)}
                              </div>
                            </div>
                          )}

                          {/* Raw Text (the original document) */}
                          {log.raw_text && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">
                                  Original Document Text
                                </h4>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(log.raw_text!, `raw-${log.id}`) }}
                                  className="text-xs text-[var(--admin-text-dim)] hover:text-[var(--admin-text)] transition-colors"
                                >
                                  {copiedId === `raw-${log.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <pre className="text-xs text-[var(--admin-text-secondary)] whitespace-pre-wrap break-words bg-[var(--admin-card)] rounded-lg p-3 border border-[var(--admin-border)] max-h-64 overflow-y-auto">
                                {isFullText
                                  ? log.raw_text
                                  : log.raw_text.slice(0, 500)}
                                {!isFullText && log.raw_text.length > 500 && '...'}
                              </pre>
                              {log.raw_text.length > 500 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleShowFullText(log.id) }}
                                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
                                >
                                  {isFullText ? 'Show less' : `Show all (${(log.raw_text.length / 1000).toFixed(1)}k chars)`}
                                </button>
                              )}
                            </div>
                          )}

                          {/* n8n Response */}
                          {log.n8n_response && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-medium text-[var(--admin-text-dim)] uppercase tracking-wider">
                                  n8n Response
                                </h4>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(log.n8n_response, null, 2), `n8n-${log.id}`) }}
                                  className="text-xs text-[var(--admin-text-dim)] hover:text-[var(--admin-text)] transition-colors"
                                >
                                  {copiedId === `n8n-${log.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <pre className="text-xs text-[var(--admin-text-secondary)] whitespace-pre-wrap break-words bg-[var(--admin-card)] rounded-lg p-3 border border-[var(--admin-border)] max-h-48 overflow-y-auto">
                                {JSON.stringify(log.n8n_response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Retry Button for errors */}
                          {log.status === 'error' && (
                            <div className="pt-1 flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRetry(log) }}
                                disabled={retrying === log.id}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className={`w-3 h-3 ${retrying === log.id ? 'animate-spin' : ''}`} />
                                {retrying === log.id ? 'Retrying...' : 'Retry'}
                              </button>
                              {!log.raw_text && (
                                <span className="text-[10px] text-[var(--admin-text-dim)]">
                                  No raw text stored — retry unavailable for older submissions
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="px-5 py-4 border-t border-[var(--admin-border)] text-center">
                  <button
                    onClick={() => fetchLogs(true)}
                    className="px-4 py-2 text-sm rounded-lg bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] transition-colors"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </BlurFade>
    </div>
  )
}
