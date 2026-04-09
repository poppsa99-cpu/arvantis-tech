'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { BlurFade } from '@/components/ui/blur-fade'
import { WorkflowTutorial } from '@/components/workflow-tutorial'
import { EmailFormatGuide } from '@/components/email-format-guide'

interface DefenseResult {
  defenseNumber: number
  ordinal: string
  rawText: string
  matched: boolean
  matchedCategory: string | null
  suggestedCategory: string
  confidence: number
  responseText: string | null
  flagged: boolean
}

interface ProcessResult {
  caseMetadata: {
    plaintiffName: string | null
    defendantName: string | null
    caseNumber: string | null
    court: string | null
  }
  summary: {
    totalDefenses: number
    matched: number
    flagged: number
  }
  results: DefenseResult[]
  reply: string
}

type DocStatus = 'extracting' | 'extracted' | 'processing' | 'done' | 'error'

interface DocEntry {
  id: string
  fileName: string
  text: string
  status: DocStatus
  error?: string
  result?: ProcessResult
}

function statusPercent(status: DocStatus): number {
  switch (status) {
    case 'extracting': return 33
    case 'extracted': return 50
    case 'processing': return 66
    case 'done': return 100
    case 'error': return 100
  }
}

function statusLabel(status: DocStatus): string {
  switch (status) {
    case 'extracting': return 'Extracting text...'
    case 'extracted': return 'Text extracted'
    case 'processing': return 'Processing defenses...'
    case 'done': return 'Complete'
    case 'error': return 'Failed'
  }
}

type DocType = 'motion-to-strike' | 'motion-to-compel'

interface SidebarItem {
  id: DocType
  label: string
  description: string
  icon: React.ReactNode
  active: boolean
}

interface MotionTarget {
  targetName: string
  targetTitle: string
  targetPronoun: 'he' | 'she' | 'they'
  crTestimony: string
  reasonForCompelling: string
}

interface MotionToCompelData {
  plaintiffNames: string[]
  defendantName: string
  caseNumber: string
  circuitNumber: string
  county: string
  corporateRepName: string
  corporateRepDepositionDate: string
  targets: MotionTarget[]
}

interface MotionToCompelEntry {
  id: string
  fileName: string
  status: DocStatus
  error?: string
  result?: MotionToCompelData
}

function MotionToCompelResults({
  data: initialData,
  onBack,
  onDownload,
}: {
  data: MotionToCompelData
  onBack: () => void
  onDownload: (data: MotionToCompelData, i: number, originalData?: MotionToCompelData) => void
}) {
  const [data, setData] = useState<MotionToCompelData>(initialData)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  function updateTarget(idx: number, field: keyof MotionTarget, value: string) {
    setData(prev => {
      const newTargets = [...prev.targets]
      newTargets[idx] = { ...newTargets[idx], [field]: value }
      return { ...prev, targets: newTargets }
    })
  }

  function updateCaseField<K extends keyof MotionToCompelData>(field: K, value: MotionToCompelData[K]) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function honorific(pronoun: 'he' | 'she' | 'they') {
    if (pronoun === 'he') return 'Mr.'
    if (pronoun === 'she') return 'Ms.'
    return ''
  }

  return (
    <BlurFade delay={0.05} duration={0.3}>
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted-dim)] hover:text-[var(--foreground)] transition-colors group"
        >
          <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Back to uploads
        </button>

        {/* Editable Case Summary */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card)] to-[var(--background)] shadow-lg dark:shadow-2xl">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-blue-600" />
          <div className="p-6 pl-7">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-4">Case Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Plaintiff', value: data.plaintiffNames.join(' and '), onChange: (v: string) => updateCaseField('plaintiffNames', v.split(/\s+and\s+/i)) },
                { label: 'Defendant', value: data.defendantName, onChange: (v: string) => updateCaseField('defendantName', v) },
                { label: 'Case No.', value: data.caseNumber, onChange: (v: string) => updateCaseField('caseNumber', v) },
                { label: 'Circuit', value: data.circuitNumber, onChange: (v: string) => updateCaseField('circuitNumber', v) },
                { label: 'County', value: data.county, onChange: (v: string) => updateCaseField('county', v) },
                { label: 'Corporate Rep', value: data.corporateRepName, onChange: (v: string) => updateCaseField('corporateRepName', v) },
                { label: 'Deposition Date', value: data.corporateRepDepositionDate, onChange: (v: string) => updateCaseField('corporateRepDepositionDate', v) },
              ].map(({ label, value, onChange }) => (
                <div key={label} className="space-y-1">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400 font-bold">{label}</span>
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full text-sm font-semibold text-[var(--foreground)] bg-transparent border-b border-transparent hover:border-[var(--card-border)] focus:border-blue-500 focus:outline-none py-0.5 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expandable Motion Cards */}
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
            {data.targets.length} Motion{data.targets.length !== 1 ? 's' : ''} Ready
          </h2>
          <div className="space-y-3">
            {data.targets.map((target, i) => {
              const isExpanded = expandedIdx === i
              const mr = honorific(target.targetPronoun)
              const mrLastName = mr ? `${mr} ${(target.targetName || '').split(' ').slice(-1)[0]}` : target.targetName

              return (
                <BlurFade key={i} delay={i * 0.04} duration={0.2}>
                  <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isExpanded
                      ? 'border-blue-500/40 bg-[var(--card)] shadow-lg shadow-blue-500/5'
                      : 'border-[var(--card-border)] bg-gradient-to-r from-blue-50/40 via-[var(--card)] to-[var(--card)] dark:from-blue-900/5 dark:via-[var(--card)] dark:to-[var(--card)] shadow-md'
                  }`}>
                    <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${isExpanded ? 'bg-blue-400' : 'bg-blue-500'}`} />

                    {/* Collapsed header — always visible */}
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className="w-full text-left p-5 pl-6 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-[var(--foreground)] truncate">{target.targetName || '[Name]'}</p>
                          {target.targetTitle && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded-full">{target.targetTitle}</span>
                          )}
                        </div>
                        {!isExpanded && (
                          <p className="text-sm text-[var(--muted-dim)] mt-1 leading-snug line-clamp-1">{target.crTestimony}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <svg className={`h-5 w-5 text-[var(--muted-dim)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded content — editable preview */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-0 space-y-5 border-t border-[var(--card-border)]">
                        {/* Editable target fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-dim)] font-bold">Target Name</label>
                            <input
                              type="text"
                              value={target.targetName}
                              onChange={(e) => updateTarget(i, 'targetName', e.target.value)}
                              className="w-full text-sm font-semibold text-[var(--foreground)] bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-dim)] font-bold">Title / Role</label>
                            <input
                              type="text"
                              value={target.targetTitle}
                              onChange={(e) => updateTarget(i, 'targetTitle', e.target.value)}
                              className="w-full text-sm text-[var(--foreground)] bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-dim)] font-bold">Pronoun</label>
                            <select
                              value={target.targetPronoun}
                              onChange={(e) => updateTarget(i, 'targetPronoun', e.target.value)}
                              className="w-full text-sm text-[var(--foreground)] bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors"
                            >
                              <option value="he">He (Mr.)</option>
                              <option value="she">She (Ms.)</option>
                              <option value="they">They</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-dim)] font-bold">Reason for Compelling</label>
                            <input
                              type="text"
                              value={target.reasonForCompelling}
                              onChange={(e) => updateTarget(i, 'reasonForCompelling', e.target.value)}
                              className="w-full text-sm text-[var(--foreground)] bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted-dim)] font-bold">CR Testimony About This Target</label>
                            <textarea
                              value={target.crTestimony}
                              onChange={(e) => updateTarget(i, 'crTestimony', e.target.value)}
                              rows={2}
                              className="w-full text-sm text-[var(--foreground)] bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-colors resize-none"
                            />
                          </div>
                        </div>

                        {/* Document preview */}
                        <div className="rounded-xl border border-[var(--card-border)] bg-white dark:bg-gray-950 overflow-hidden">
                          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border-b border-[var(--card-border)] flex items-center gap-2">
                            <svg className="h-3.5 w-3.5 text-[var(--muted-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <span className="text-[11px] font-semibold text-[var(--muted-dim)] uppercase tracking-wider">Document Preview</span>
                          </div>
                          <div className="p-6 text-gray-800 dark:text-gray-200 space-y-4" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '1.8' }}>
                            <p className="text-right text-xs">
                              IN THE CIRCUIT COURT OF THE {data.circuitNumber || '___'}<br />
                              JUDICIAL CIRCUIT IN AND FOR<br />
                              {data.county?.toUpperCase() || '___'} COUNTY, FLORIDA
                            </p>

                            <p>
                              <span className="font-bold">{data.plaintiffNames.join(' AND ')}</span>, Plaintiff{data.plaintiffNames.length > 1 ? 's' : ''}, v. <span className="font-bold">{data.defendantName}</span>, Defendant.
                            </p>
                            <p>Case No.: {data.caseNumber}</p>

                            <p className="text-center font-bold underline text-sm">
                              PLAINTIFF&apos;S MOTION TO COMPEL THE DEPOSITION OF {target.targetTitle ? `DEFENDANT'S ${target.targetTitle.toUpperCase()}, ` : ''}{(target.targetName || '').toUpperCase()}
                            </p>

                            <p style={{ textIndent: '2em' }}>
                              1. Plaintiff has filed this first party action due to damages at the insured property.
                            </p>
                            <p style={{ textIndent: '2em' }}>
                              2. On or about {data.corporateRepDepositionDate || '[DATE]'}, Plaintiff{data.plaintiffNames.length > 1 ? 's' : ''} took the deposition of Defendant&apos;s Corporate Representative, {data.corporateRepName || '[CR NAME]'}.
                            </p>
                            <p style={{ textIndent: '2em' }}>
                              3. During the deposition, {data.corporateRepName || '[CR NAME]'}, testified that {target.targetName || '[TARGET]'} {target.crTestimony || '[CR TESTIMONY]'}.
                            </p>
                            <p style={{ textIndent: '2em' }}>
                              4. Plaintiff is compelling the Deposition of {target.targetName || '[TARGET]'} as {target.reasonForCompelling || '[REASON]'}. {mrLastName} is a necessary fact witness.
                            </p>
                            <p style={{ textIndent: '2em' }}>
                              5. Plaintiff has been prejudiced by the Defendant&apos;s failure to comply with providing deposition dates for {target.targetName || '[TARGET]'}.
                            </p>
                            <p style={{ textIndent: '2em' }}>
                              6. The deposition of {target.targetName || '[TARGET]'} is necessary for the Plaintiff to prosecute their case in chief.
                            </p>
                            <p style={{ textIndent: '2em' }}>
                              7. Based on the foregoing, Plaintiffs&apos; requests that this Honorable Court enter an Order granting Plaintiff&apos;s Motion to Compel the Deposition of {target.targetName || '[TARGET]'}.
                            </p>

                            <p className="pt-2" style={{ textIndent: '2em' }}>
                              <span className="font-bold">WHEREFORE</span>, Plaintiff, {data.plaintiffNames.join(' AND ')}, respectfully request an order that {target.targetTitle ? `${target.targetTitle.replace(/^\w/, (c: string) => c.toUpperCase())}, ` : ''}{target.targetName || '[TARGET]'} sit for deposition within fourteen (14) days of the order; and any and all other relief this Honorable Court deems just and equitable.
                            </p>
                          </div>
                        </div>

                        {/* Download button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => onDownload(data, i, initialData)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-500/20"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                            Download This Motion
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </BlurFade>
              )
            })}
          </div>
        </div>
      </div>
    </BlurFade>
  )
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'motion-to-strike',
    label: 'Motion to Strike & Reply/Avoidance',
    description: 'Auto-generate reply documents with defense matching',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    active: true,
  },
  {
    id: 'motion-to-compel',
    label: 'Motion to Compel',
    description: 'Generate deposition motions from your follow-up email',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    active: true,
  },
]

let docIdCounter = 0

export default function AgentWorkspacePage() {
  const [docs, setDocs] = useState<DocEntry[]>([])
  const [activeView, setActiveView] = useState<'upload' | 'results'>('upload')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [selectedDocType, setSelectedDocType] = useState<DocType>('motion-to-strike')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dark, setDark] = useState(true)
  const [expandedDefenses, setExpandedDefenses] = useState<Set<number>>(new Set())
  const [agentPaused, setAgentPaused] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [reassigning, setReassigning] = useState<Record<number, boolean>>({})
  const [motionDocs, setMotionDocs] = useState<MotionToCompelEntry[]>([])
  const [selectedMotionId, setSelectedMotionId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  // Fetch user info and detect which agent was opened
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
      setIsAdmin(profile?.is_admin === true)

      // Auto-select doc type based on which agent card was clicked
      if (params.id) {
        const { data: agent } = await supabase
          .from('organization_agents')
          .select('agent_template:agent_templates(slug)')
          .eq('id', params.id)
          .maybeSingle()
        const tmpl = agent?.agent_template as unknown
        const slug = Array.isArray(tmpl) ? (tmpl[0] as { slug: string })?.slug : (tmpl as { slug: string } | null)?.slug
        if (slug === 'motion-to-compel') {
          setSelectedDocType('motion-to-compel')
        }
      }
    }
    fetchUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedDoc = docs.find(d => d.id === selectedDocId) || null

  // Check if the user's agent/workflow is paused by admin
  useEffect(() => {
    async function checkAgentAccess() {
      try {
        const res = await fetch('/api/agent-status')
        if (res.ok) {
          const { paused } = await res.json()
          if (paused) setAgentPaused(true)
        }
      } catch {
        // If we can't check, allow access
      } finally {
        setCheckingAccess(false)
      }
    }
    checkAgentAccess()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('sydney-theme')
    const isDark = saved ? saved === 'dark' : true
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    fetch('/api/agents/reassign').then(r => r.json()).then(data => {
      if (data.categories) setCategories(data.categories)
    }).catch(() => {})
  }, [])

  async function handleReassignCategory(docId: string, defenseIndex: number, categoryId: string, categoryName: string, def: DefenseResult) {
    setReassigning(prev => ({ ...prev, [def.defenseNumber]: true }))
    try {
      const res = await fetch('/api/agents/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          defenseText: def.rawText,
          defenseNumber: def.defenseNumber,
          ordinal: def.ordinal,
        }),
      })
      if (res.ok) {
        const { matchedCategory, responseText } = await res.json()
        setDocs(prev => prev.map(d => {
          if (d.id !== docId || !d.result) return d
          const newResults = [...d.result.results]
          newResults[defenseIndex] = {
            ...newResults[defenseIndex],
            matched: true,
            matchedCategory: matchedCategory,
            responseText: responseText,
            flagged: false,
          }
          const flaggedCount = newResults.filter(r => r.flagged).length
          const matchedCount = newResults.filter(r => r.matched).length
          // Rebuild the reply text so the on-screen document reflects the change
          const meta = d.result.caseMetadata
          const plaintiff = meta?.plaintiffName || 'Plaintiff'
          const defendant = meta?.defendantName || 'Defendant'
          let replyLines: string[] = []
          replyLines.push(`${meta?.court || 'IN THE CIRCUIT COURT'}\n`)
          replyLines.push(`${plaintiff}, Plaintiff,\nvs.\n${defendant}, Defendant.\n`)
          replyLines.push(`Case No.: ${meta?.caseNumber || ''}\n`)
          replyLines.push(`PLAINTIFF'S REPLY/AVOIDANCE OF DEFENDANT'S ANSWER AND AFFIRMATIVE DEFENSES AND MOTION TO STRIKE DEFENDANT'S AFFIRMATIVE DEFENSES\n`)
          replyLines.push(`Plaintiff, ${plaintiff}, by and through her undersigned attorneys, and pursuant to Florida Rule of Civil Procedure 1.100, hereby files this Reply/Avoidance of Defendant's Answer and Affirmative Defenses and Motion to Strike Defendant's Affirmative Defenses as follows:\n`)
          let paraNum = 1
          for (const r of newResults) {
            if (r.responseText) {
              replyLines.push(`${paraNum}.\tAs to Defendant's ${r.ordinal} Affirmative Defense (${r.matchedCategory || r.suggestedCategory}):`)
              replyLines.push(`${r.responseText}\n`)
              paraNum++
            }
          }
          replyLines.push(`${paraNum}.\tTo the extent required Plaintiff denies all Defendant's Affirmative Defenses.\n`)
          replyLines.push(`WHEREFORE, Plaintiff respectfully requests this Court accept Plaintiff's denial and avoidance and Motion to Strike of Defendant's Affirmative Defenses.`)
          const newReply = replyLines.join('\n')
          return {
            ...d,
            result: {
              ...d.result,
              results: newResults,
              reply: newReply,
              summary: {
                ...d.result.summary,
                matched: matchedCount,
                flagged: flaggedCount,
              }
            }
          }
        }))
      }
    } catch (err) {
      console.error('Reassign failed:', err)
    } finally {
      setReassigning(prev => ({ ...prev, [def.defenseNumber]: false }))
    }
  }

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('sydney-theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  function switchView(view: 'upload' | 'results') {
    setActiveView(view)
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function updateDoc(id: string, updates: Partial<DocEntry>) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => {
      const name = f.name.toLowerCase()
      return name.endsWith('.pdf') || name.endsWith('.docx')
    })

    if (validFiles.length === 0) return

    if (selectedDocType === 'motion-to-compel') {
      const newEntries: MotionToCompelEntry[] = validFiles.map(f => ({
        id: `motion-${++docIdCounter}`,
        fileName: f.name,
        status: 'extracting' as DocStatus,
      }))
      setMotionDocs(prev => [...prev, ...newEntries])
      for (let i = 0; i < validFiles.length; i++) {
        extractAndProcessMotionToCompel(validFiles[i], newEntries[i].id)
      }
      return
    }

    const newEntries: DocEntry[] = validFiles.map(f => ({
      id: `doc-${++docIdCounter}`,
      fileName: f.name,
      text: '',
      status: 'extracting' as DocStatus,
    }))

    setDocs(prev => [...prev, ...newEntries])

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const entry = newEntries[i]
      extractAndProcess(file, entry.id)
    }
  }, [selectedDocType])

  async function extractAndProcess(file: File, docId: string) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const extractRes = await fetch('/api/agents/extract', { method: 'POST', body: formData })
      if (!extractRes.ok) {
        const err = await extractRes.json()
        throw new Error(err.error || `Extract failed: HTTP ${extractRes.status}`)
      }

      const { text } = await extractRes.json()
      updateDoc(docId, { text, status: 'processing' })

      const processRes = await fetch('/api/agents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!processRes.ok) {
        const err = await processRes.json()
        throw new Error(err.error || `Process failed: HTTP ${processRes.status}`)
      }

      const result = await processRes.json()
      updateDoc(docId, { status: 'done', result })
    } catch (err) {
      updateDoc(docId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  function updateMotionDoc(id: string, updates: Partial<MotionToCompelEntry>) {
    setMotionDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }

  async function extractAndProcessMotionToCompel(file: File, docId: string) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const extractRes = await fetch('/api/agents/extract', { method: 'POST', body: formData })
      if (!extractRes.ok) {
        const err = await extractRes.json()
        throw new Error(err.error || `Extract failed: HTTP ${extractRes.status}`)
      }

      const { text } = await extractRes.json()
      updateMotionDoc(docId, { status: 'processing' })

      const processForm = new FormData()
      processForm.append('text', text)
      processForm.append('file', file)
      processForm.append('fileName', file.name)

      const processRes = await fetch('/api/agents/motion-to-compel/process', {
        method: 'POST',
        body: processForm,
      })

      if (!processRes.ok) {
        const err = await processRes.json()
        throw new Error(err.error || `Process failed: HTTP ${processRes.status}`)
      }

      const result: MotionToCompelData = await processRes.json()
      updateMotionDoc(docId, { status: 'done', result })

      setSelectedMotionId(docId)
      switchView('results')
    } catch (err) {
      updateMotionDoc(docId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  async function handleDownloadMotion(data: MotionToCompelData, targetIndex: number, originalData?: MotionToCompelData) {
    try {
      const res = await fetch('/api/agents/motion-to-compel/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, targetIndex, originalData }),
      })
      if (!res.ok) throw new Error('Failed to generate document')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const target = data.targets[targetIndex]
      const targetLast = target?.targetName?.split(' ').slice(-1)[0] || 'Motion'
      a.download = `Motion to Compel - ${targetLast}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }

  function handleRemoveDoc(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id))
    if (selectedDocId === id) setSelectedDocId(null)
  }

  function handleClearAll() {
    setDocs([])
    setSelectedDocId(null)
    setMotionDocs([])
    setSelectedMotionId(null)
    switchView('upload')
  }

  function handleViewResults(id: string) {
    setSelectedDocId(id)
    switchView('results')
  }

  async function handleDownloadReply(doc: DocEntry) {
    if (!doc.result) return
    try {
      const res = await fetch('/api/agents/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc.result),
      })
      if (!res.ok) throw new Error('Failed to generate document')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const caseName = doc.result.caseMetadata?.plaintiffName || 'Reply'
      a.download = `${caseName} - Reply to Affirmative Defenses.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      const blob = new Blob([doc.result.reply], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Reply to Affirmative Defenses.txt'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  function handleDownloadAll() {
    const doneDocs = docs.filter(d => d.status === 'done' && d.result)
    for (const doc of doneDocs) {
      handleDownloadReply(doc)
    }
  }

  function toggleDefenseExpand(defenseNumber: number) {
    setExpandedDefenses(prev => {
      const next = new Set(prev)
      if (next.has(defenseNumber)) next.delete(defenseNumber)
      else next.add(defenseNumber)
      return next
    })
  }

  const doneCount = docs.filter(d => d.status === 'done').length
  const errorCount = docs.filter(d => d.status === 'error').length
  const pendingCount = docs.filter(d => d.status === 'extracting' || d.status === 'processing').length

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (agentPaused) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Workflow Paused</h2>
          <p className="text-[var(--muted-dim)] text-sm mb-6">
            This workflow has been temporarily paused by your account administrator. Please contact support if you have questions.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex overflow-x-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always fixed overlay on all screen sizes */}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] z-50 border-r border-[var(--card-border)] flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'color-mix(in srgb, var(--card) 98%, var(--background))' }}
      >
        <div className="w-[280px] flex flex-col h-full">
        {/* Sidebar header */}
        <div className="h-16 border-b border-[var(--card-border)] flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-[var(--muted-dim)] hover:text-[var(--foreground)] hover:bg-[var(--background-50)] transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative h-9 w-9 shrink-0">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 opacity-20 blur-sm" />
              <div className="relative h-full w-full rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white text-base font-bold">S</span>
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-lg font-semibold truncate block leading-tight">Arvantis Tech</span>
              <span className="text-[11px] text-[var(--muted-dim)] uppercase tracking-wider">Document AI</span>
            </div>
          </div>
        </div>

        <Separator className="bg-[var(--card-border)]" />

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-dim)] mb-3">
            Document Types
          </p>

          <div className="space-y-1">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => item.active && setSelectedDocType(item.id)}
                className={`w-full text-left rounded-lg transition-all duration-200 px-3 py-2.5 ${
                  selectedDocType === item.id
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20'
                    : item.active
                    ? 'text-[var(--foreground)] hover:bg-[var(--background-60)]'
                    : 'text-[var(--muted-dim)] cursor-not-allowed opacity-50'
                }`}
                disabled={!item.active}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${selectedDocType === item.id ? 'text-blue-500' : 'text-[var(--muted-dim)]'}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{item.label}</p>
                    <p className="text-xs text-[var(--muted-dim)] mt-0.5 leading-snug">{item.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Separator className="bg-[var(--card-border)] my-3" />

          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-dim)] mb-3">
            Account
          </p>

          <div className="space-y-1">
            <a
              href="/dashboard"
              className="w-full text-left rounded-lg transition-all duration-200 px-3 py-2.5 text-[var(--foreground)] hover:bg-[var(--background-60)] flex items-start gap-3"
            >
              <div className="mt-0.5 shrink-0 text-[var(--muted-dim)]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Home</p>
                <p className="text-xs text-[var(--muted-dim)] mt-0.5 leading-snug">Back to main dashboard</p>
              </div>
            </a>

            <a
              href="/billing"
              className="w-full text-left rounded-lg transition-all duration-200 px-3 py-2.5 text-[var(--foreground)] hover:bg-[var(--background-60)] flex items-start gap-3"
            >
              <div className="mt-0.5 shrink-0 text-[var(--muted-dim)]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Billing</p>
                <p className="text-xs text-[var(--muted-dim)] mt-0.5 leading-snug">Manage your subscription</p>
              </div>
            </a>

            {isAdmin && (
              <a
                href="/admin"
                className="w-full text-left rounded-lg transition-all duration-200 px-3 py-2.5 text-[var(--foreground)] hover:bg-[var(--background-60)] flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0 text-[var(--muted-dim)]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">Admin Dashboard</p>
                  <p className="text-xs text-[var(--muted-dim)] mt-0.5 leading-snug">Manage clients & agents</p>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-[var(--card-border)] p-3">
          <div className="space-y-3">
            {/* User avatar + email */}
            <div className="flex items-center gap-2.5 px-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0 text-white text-xs font-bold uppercase">
                {userEmail.charAt(0)}
              </div>
              <p className="text-sm font-medium text-[var(--foreground)] truncate flex-1">{userEmail}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:text-blue-500 hover:bg-[var(--background-50)] transition-all duration-200"
              >
                {dark ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                {dark ? 'Light' : 'Dark'}
              </button>
              <Separator orientation="vertical" className="h-4 bg-[var(--card-border)]" />
              <button
                onClick={handleSignOut}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign out
              </button>
            </div>
            {/* Powered by */}
            <Separator className="bg-[var(--card-border)]" />
            <div className="flex flex-col items-center pt-1">
              <p className="text-[9px] text-[var(--muted-dim)] uppercase tracking-[0.2em] mb-1.5">Powered by</p>
              <div className="rounded-lg p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/arvantis-logo.png"
                  alt="Arvantis Tech"
                  width={160}
                  height={160}
                  className="rounded-md opacity-90 hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </aside>

      {/* Main content — always full width, sidebar overlays */}
      <div className="w-full flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="min-h-[56px] sm:h-16 border-b border-[var(--card-border)] bg-[var(--card-30)] backdrop-blur-sm flex flex-wrap items-center gap-2 px-3 sm:px-6 py-2 sm:py-0 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 rounded-lg text-[var(--foreground)] hover:bg-[var(--background-50)] transition-colors shrink-0"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-lg font-semibold truncate">
              {SIDEBAR_ITEMS.find(i => i.id === selectedDocType)?.label}
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5 hidden sm:inline-flex">
              Active
            </Badge>
            {selectedDocType === 'motion-to-strike' && (
              <WorkflowTutorial
                workflowId="motion-to-strike"
                loomUrl="https://www.loom.com/share/229c78b9ec364344a6e6eb8ace22a850"
                title="Motion to Strike & Reply/Avoidance"
                steps={[
                  {
                    icon: '📄',
                    title: 'Upload the Defendant\'s Answer',
                    description: 'Drag and drop or click to browse for the defendant\'s Answer and Affirmative Defenses document. We accept both PDF and DOCX files.',
                  },
                  {
                    icon: '🔍',
                    title: 'AI Extracts & Matches Defenses',
                    description: 'Our AI reads every affirmative defense, identifies the category, and matches it against our database of proven legal responses specific to Florida insurance law.',
                  },
                  {
                    icon: '⚖️',
                    title: 'Review the Matches',
                    description: 'Each defense shows as "Matched" (green) or "Needs Review" (amber). For unmatched defenses, use the dropdown to manually assign a response category.',
                  },
                  {
                    icon: '📝',
                    title: 'Download Your Reply Document',
                    description: 'Once satisfied with the matches, download the fully formatted Motion to Strike & Reply/Avoidance as a Word document — ready for your review and filing.',
                  },
                ]}
              />
            )}
            {selectedDocType === 'motion-to-compel' && (
              <EmailFormatGuide workflowId="motion-to-compel" />
            )}
          </div>

          {docs.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="font-medium">
                {docs.length} file{docs.length !== 1 ? 's' : ''}
              </Badge>
              {pendingCount > 0 && (
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                  {pendingCount} processing
                </Badge>
              )}
              {doneCount > 0 && (
                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                  {doneCount} done
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                  {errorCount} failed
                </Badge>
              )}
            </div>
          )}
        </header>

        {/* Content area */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* View toggle */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex gap-0.5 bg-[var(--card)] rounded-xl p-1 border border-[var(--card-border)] shadow-sm">
                {(['upload', 'results'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => switchView(tab)}
                    disabled={tab === 'results' && !selectedDoc?.result && !motionDocs.find(d => d.id === selectedMotionId)?.result}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      activeView === tab
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'text-[var(--foreground-60)] hover:text-[var(--foreground)] disabled:text-[var(--muted-dim)] disabled:cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {tab === 'upload' ? (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          Upload
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                          </svg>
                          Results
                        </>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload View */}
            {activeView === 'upload' && (
              <BlurFade delay={0.05} duration={0.3}>
                <div className="space-y-5">
                  {/* Drop Zone */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload defendant answer files. Drop files here or press Enter to browse."
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative w-full border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
                      dragOver
                        ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                        : 'border-[var(--card-border)] hover:border-blue-500/40 hover:bg-[var(--card-80)]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      multiple
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        dragOver
                          ? 'bg-blue-500/20 text-blue-500 scale-110'
                          : 'bg-[var(--card)] text-[var(--muted-dim)] group-hover:text-blue-500 group-hover:bg-blue-500/10'
                      }`}>
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-base text-[var(--foreground)] font-semibold">
                          {selectedDocType === 'motion-to-compel'
                            ? 'Drop your deposition request email here'
                            : 'Drop defendant answer files here'}
                        </p>
                        <p className="text-sm text-[var(--muted-dim)] mt-1">
                          or <span className="text-blue-500 font-medium">click to browse</span> &mdash; PDF or DOCX
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Empty state tip */}
                  {docs.length === 0 && motionDocs.length === 0 && (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <svg className="h-4 w-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <p className="text-sm text-[var(--muted-dim)]">
                          {selectedDocType === 'motion-to-compel'
                            ? 'Upload a deposition request follow-up email to generate motions to compel'
                            : 'Upload a defendant\u2019s answer with affirmative defenses to generate a reply document'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Motion to Compel upload list */}
                  {selectedDocType === 'motion-to-compel' && motionDocs.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[var(--foreground)]">Documents</h2>
                        <button
                          onClick={handleClearAll}
                          className="text-sm font-medium text-[var(--muted-dim)] hover:text-[var(--foreground)] transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {motionDocs.map((doc, i) => (
                          <BlurFade key={doc.id} delay={i * 0.05} duration={0.25}>
                            <Card className={`ring-0 shadow-sm transition-all duration-200 hover:shadow-md ${
                              doc.status === 'error' ? 'border border-red-500/20 shadow-red-500/5' : 'border border-[var(--card-border)]'
                            }`}>
                              <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                      doc.status === 'done' ? 'bg-green-500/10 text-green-500' :
                                      doc.status === 'error' ? 'bg-red-500/10 text-red-500' :
                                      'bg-blue-500/10 text-blue-500'
                                    }`}>
                                      {(doc.status === 'extracting' || doc.status === 'processing') && (
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                      )}
                                      {doc.status === 'done' && (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                      )}
                                      {doc.status === 'error' && (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold truncate">{doc.fileName}</p>
                                      <p className="text-xs text-[var(--muted-dim)] mt-0.5">
                                        {doc.status === 'done' && doc.result ? (
                                          <span className="text-green-600 dark:text-green-400">
                                            {doc.result.targets.length} motion{doc.result.targets.length !== 1 ? 's' : ''} ready
                                          </span>
                                        ) : doc.status === 'error' ? (
                                          <span className="text-red-500">{doc.error}</span>
                                        ) : doc.status === 'processing' ? (
                                          'Analyzing email...'
                                        ) : (
                                          statusLabel(doc.status)
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-4">
                                    {doc.status === 'done' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setSelectedMotionId(doc.id); switchView('results') }}
                                        className="text-xs"
                                      >
                                        View Motions
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </BlurFade>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File List */}
                  {selectedDocType === 'motion-to-strike' && docs.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[var(--foreground)]">Documents</h2>
                        <div className="flex gap-3">
                          {doneCount > 1 && (
                            <button
                              onClick={handleDownloadAll}
                              className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
                            >
                              Download all
                            </button>
                          )}
                          <button
                            onClick={handleClearAll}
                            className="text-sm font-medium text-[var(--muted-dim)] hover:text-[var(--foreground)] transition-colors"
                          >
                            Clear all
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {docs.map((doc, i) => (
                          <BlurFade key={doc.id} delay={i * 0.05} duration={0.25}>
                            <Card className={`ring-0 shadow-sm transition-all duration-200 hover:shadow-md ${
                              doc.status === 'error' ? 'border border-red-500/20 shadow-red-500/5' : 'border border-[var(--card-border)]'
                            }`}>
                              <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Status icon */}
                                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                      doc.status === 'done' ? 'bg-green-500/10 text-green-500' :
                                      doc.status === 'error' ? 'bg-red-500/10 text-red-500' :
                                      'bg-blue-500/10 text-blue-500'
                                    }`}>
                                      {(doc.status === 'extracting' || doc.status === 'processing') && (
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                      )}
                                      {doc.status === 'done' && (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                      )}
                                      {doc.status === 'error' && (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                        </svg>
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold truncate">{doc.fileName}</p>
                                      <p className="text-xs text-[var(--muted-dim)] mt-0.5">
                                        {doc.status === 'done' && doc.result ? (
                                          <>
                                            {doc.result.caseMetadata.plaintiffName || 'Unknown'} &mdash;{' '}
                                            {doc.result.summary.matched}/{doc.result.summary.totalDefenses} matched
                                            {doc.result.summary.flagged > 0 && (
                                              <span className="text-amber-500"> ({doc.result.summary.flagged} needs review)</span>
                                            )}
                                          </>
                                        ) : doc.status === 'error' ? (
                                          <span className="text-red-500">{doc.error}</span>
                                        ) : (
                                          statusLabel(doc.status)
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-4">
                                    {doc.status === 'done' && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleViewResults(doc.id)}
                                          className="text-xs"
                                        >
                                          View
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleDownloadReply(doc)}
                                          className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
                                        >
                                          Download
                                        </Button>
                                      </>
                                    )}
                                    {doc.status === 'error' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveDoc(doc.id)}
                                        className="text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
                                      >
                                        <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
                                        </svg>
                                        Remove & Retry
                                      </Button>
                                    )}
                                    <button
                                      onClick={() => handleRemoveDoc(doc.id)}
                                      className="text-[var(--muted-dim)] hover:text-[var(--foreground)] transition-colors p-1 rounded-md hover:bg-[var(--background)]"
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                {doc.status !== 'done' && doc.status !== 'error' && (
                                  <div className="mt-3">
                                    <div className="w-full h-1 bg-[var(--background)] rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700 ease-out animate-pulse"
                                        style={{ width: `${statusPercent(doc.status)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                                {doc.status === 'error' && (
                                  <div className="mt-3">
                                    <div className="w-full h-1 bg-[var(--background)] rounded-full overflow-hidden">
                                      <div className="h-full bg-red-500 rounded-full w-full" />
                                    </div>
                                  </div>
                                )}
                                {doc.status === 'done' && (
                                  <div className="mt-3">
                                    <div className="w-full h-1 bg-[var(--background)] rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full w-full" />
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </BlurFade>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </BlurFade>
            )}

            {/* Motion to Compel Results View */}
            {activeView === 'results' && selectedDocType === 'motion-to-compel' && motionDocs.find(d => d.id === selectedMotionId)?.result && (
              <MotionToCompelResults
                data={motionDocs.find(d => d.id === selectedMotionId)!.result!}
                onBack={() => switchView('upload')}
                onDownload={handleDownloadMotion}
              />
            )}

            {/* Results View */}
            {activeView === 'results' && selectedDocType === 'motion-to-strike' && selectedDoc?.result && (
              <BlurFade delay={0.05} duration={0.3}>
                <div className="space-y-6">
                  {/* Back button */}
                  <button
                    onClick={() => switchView('upload')}
                    className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted-dim)] hover:text-[var(--foreground)] transition-colors group"
                  >
                    <svg className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to uploads
                  </button>

                  {/* Doc selector if multiple done */}
                  {doneCount > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {docs.filter(d => d.status === 'done').map(doc => (
                        <Button
                          key={doc.id}
                          variant={selectedDocId === doc.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedDocId(doc.id)}
                          className={selectedDocId === doc.id ? 'bg-blue-600 hover:bg-blue-500' : ''}
                        >
                          {doc.result?.caseMetadata.plaintiffName || doc.fileName}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Case Info + Summary */}
                  <div className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--card)] to-[var(--background)] shadow-lg dark:shadow-2xl">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-blue-600" />
                    <div className="p-4 sm:p-6 pl-5 sm:pl-7">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--foreground)]">Case Information</h3>
                        <span className="text-xs text-[var(--foreground-50)] font-mono bg-[var(--background)] px-3 py-1 rounded-full border border-[var(--card-border)] w-fit truncate max-w-[200px] sm:max-w-none">{selectedDoc.fileName}</span>
                      </div>
                      {/* Case metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                          { label: 'Plaintiff', value: selectedDoc.result.caseMetadata.plaintiffName },
                          { label: 'Defendant', value: selectedDoc.result.caseMetadata.defendantName },
                          { label: 'Case No.', value: selectedDoc.result.caseMetadata.caseNumber },
                          { label: 'Court', value: selectedDoc.result.caseMetadata.court },
                        ].map(({ label, value }) => (
                          <div key={label} className="space-y-1">
                            <span className="text-[11px] uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400 font-bold">{label}</span>
                            <p className="text-base font-bold text-[var(--foreground)] leading-snug">{value || '—'}</p>
                          </div>
                        ))}
                      </div>
                      {/* Summary stats row */}
                      <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
                        <div className="grid grid-cols-3 gap-4">
                          {/* Total */}
                          <div className="text-center">
                            <div className="mx-auto mb-2 h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                              <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                              </svg>
                            </div>
                            <span style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, lineHeight: 1, display: 'block', color: 'var(--foreground)', fontFamily: '"Times New Roman", Times, Georgia, serif' }}>{selectedDoc.result.summary.totalDefenses}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, marginTop: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'color-mix(in srgb, var(--foreground) 50%, transparent)' }}>Total Defenses</span>
                          </div>
                          {/* Matched */}
                          <div className="text-center">
                            <div className="mx-auto mb-2 h-8 w-8 rounded-lg bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
                              <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </div>
                            <span className="text-green-700 dark:text-green-400" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, lineHeight: 1, display: 'block', fontFamily: '"Times New Roman", Times, Georgia, serif' }}>{selectedDoc.result.summary.matched}</span>
                            <span className="text-green-700/70 dark:text-green-400/80" style={{ fontSize: '11px', fontWeight: 700, marginTop: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Matched</span>
                          </div>
                          {/* Needs Review */}
                          <div className="text-center">
                            <div className={`mx-auto mb-2 h-8 w-8 rounded-lg flex items-center justify-center ${
                              selectedDoc.result.summary.flagged > 0 ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-gray-100 dark:bg-gray-500/15'
                            }`}>
                              <svg className={`h-4 w-4 ${selectedDoc.result.summary.flagged > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                              </svg>
                            </div>
                            <span className={selectedDoc.result.summary.flagged > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--foreground-30)]'} style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, lineHeight: 1, display: 'block', fontFamily: '"Times New Roman", Times, Georgia, serif' }}>{selectedDoc.result.summary.flagged}</span>
                            <span className={selectedDoc.result.summary.flagged > 0 ? 'text-amber-700/70 dark:text-amber-400/80' : 'text-[var(--foreground-30)]'} style={{ fontSize: '11px', fontWeight: 700, marginTop: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Needs Review</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Defense List */}
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">Defense Matches</h2>
                    {selectedDoc.result.results.map((def, i) => (
                      <BlurFade key={def.defenseNumber} delay={i * 0.03} duration={0.2}>
                        <div className={`relative overflow-hidden rounded-2xl border shadow-md transition-all duration-200 hover:shadow-lg ${
                          def.flagged
                            ? 'border-amber-200 dark:border-amber-800/40 bg-gradient-to-r from-amber-50/80 via-[var(--card)] to-[var(--card)] dark:from-amber-900/10 dark:via-[var(--card)] dark:to-[var(--card)]'
                            : 'border-[var(--card-border)] bg-gradient-to-r from-green-50/40 via-[var(--card)] to-[var(--card)] dark:from-green-900/5 dark:via-[var(--card)] dark:to-[var(--card)]'
                        }`}>
                          <div className={`absolute top-0 left-0 w-1 h-full ${
                            def.flagged ? 'bg-amber-500' : 'bg-green-500'
                          }`} />
                          <div className="p-4 sm:p-5 pl-5 sm:pl-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-0 mb-1">
                              <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                                Defense #{def.defenseNumber} — {def.matchedCategory || def.suggestedCategory}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase tracking-wider font-bold shrink-0 w-fit ${
                                  def.flagged
                                    ? 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-600/40 bg-amber-100 dark:bg-amber-500/10'
                                    : 'text-green-700 dark:text-green-400 border-green-300 dark:border-green-600/40 bg-green-100 dark:bg-green-500/10'
                                }`}
                              >
                                {def.flagged ? 'Needs Review' : 'Matched'}
                              </Badge>
                            </div>
                            <p className={`text-sm text-[var(--foreground-60)] leading-relaxed mt-2 ${expandedDefenses.has(def.defenseNumber) ? '' : 'line-clamp-2'}`}>{def.rawText}</p>
                            {def.rawText.length > 150 && (
                              <button
                                onClick={() => toggleDefenseExpand(def.defenseNumber)}
                                className="text-xs font-semibold text-blue-500 hover:text-blue-400 mt-1.5 transition-colors"
                              >
                                {expandedDefenses.has(def.defenseNumber) ? 'Show less' : 'Show more'}
                              </button>
                            )}
                            {def.flagged && (
                              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700/30 space-y-3">
                                <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                  </svg>
                                  No matching response found
                                </p>
                                <div className="flex items-center gap-2">
                                  <select
                                    className="flex-1 text-sm rounded-lg border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40 appearance-none cursor-pointer"
                                    defaultValue=""
                                    disabled={reassigning[def.defenseNumber]}
                                    onChange={(e) => {
                                      const opt = categories.find(c => c.id === e.target.value)
                                      if (opt && selectedDoc) {
                                        handleReassignCategory(selectedDoc.id, i, opt.id, opt.name, def)
                                      }
                                    }}
                                  >
                                    <option value="" disabled>Choose a response category...</option>
                                    {categories.map(cat => (
                                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                  </select>
                                  {reassigning[def.defenseNumber] && (
                                    <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full" />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </BlurFade>
                    ))}
                  </div>

                  {/* Reply Document */}
                  <Separator className="bg-[var(--card-border)]" />
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h2 className="text-xl font-bold text-[var(--foreground)]">Reply Document</h2>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectedDoc.result && navigator.clipboard.writeText(selectedDoc.result.reply)}
                          className="font-semibold"
                        >
                          <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownloadReply(selectedDoc)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                        >
                          <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Download .docx
                        </Button>
                      </div>
                    </div>
                    {/* Document page container */}
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)] shadow-lg overflow-hidden">
                      <div className="overflow-auto max-h-[70vh] p-4 sm:p-8" style={{ background: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}>
                        {/* Paper page */}
                        <div
                          className="mx-auto bg-white dark:bg-[#1a1f2e] shadow-xl dark:shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-700/50"
                          style={{
                            maxWidth: '8.5in',
                            minHeight: '11in',
                            padding: '1in 1.25in',
                            fontFamily: '"Times New Roman", Times, Georgia, serif',
                          }}
                        >
                          <div
                            className="text-[13px] sm:text-[14px] text-gray-900 dark:text-gray-100 whitespace-pre-line leading-[1.8]"
                            style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                          >
                            {selectedDoc.result.reply
                              .replace(/\[BLOCKQUOTE\]/g, '[BQ]').replace(/\[\/BLOCKQUOTE\]/g, '[/BQ]')
                              .split(/\[BQ\]|\[\/BQ\]/).map((segment: string, i: number) =>
                              i % 2 === 1 ? (
                                <div
                                  key={i}
                                  className="my-3 leading-[1.4]"
                                  style={{ marginLeft: '0.5in', marginRight: '0.5in' }}
                                >
                                  {segment.trim().split(/\[I\]|\[\/I\]/).map((part: string, j: number) =>
                                    j % 2 === 1 ? <em key={j}>{part}</em> : <span key={j}>{part}</span>
                                  )}
                                </div>
                              ) : (
                                <span key={i}>
                                  {segment.split(/\[I\]|\[\/I\]/).map((part: string, j: number) =>
                                    j % 2 === 1 ? <em key={j}>{part}</em> : <span key={j}>{part}</span>
                                  )}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
