'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface EmailFormatGuideProps {
  workflowId: string
  autoShowOnFirstVisit?: boolean
}

export function EmailFormatGuide({
  workflowId,
  autoShowOnFirstVisit = true,
}: EmailFormatGuideProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const storageKey = `tutorial-seen-${workflowId}`

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (autoShowOnFirstVisit && mounted) {
      const seen = localStorage.getItem(storageKey)
      if (!seen) setOpen(true)
    }
  }, [autoShowOnFirstVisit, storageKey, mounted])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleClose = useCallback(() => {
    setOpen(false)
    localStorage.setItem(storageKey, 'true')
  }, [storageKey])

  const modal = open && mounted ? createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        style={{ animation: 'efgFadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-y-auto bg-gray-900 border border-gray-700/50"
        style={{ animation: 'efgSlideUp 0.3s ease-out' }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">Motion to Compel — Email Format Guide</h2>
          <p className="text-sm text-gray-400 mt-1">Follow this format when sending deposition request emails for best results</p>
        </div>

        {/* Email mockup */}
        <div className="p-6">
          <div className="rounded-xl border border-gray-700/50 bg-white overflow-hidden">
            {/* Email header fields */}
            <div className="border-b border-gray-200">
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 w-14 shrink-0">From:</span>
                <span className="text-sm text-gray-700">Jared Davis, Esq. &lt;jdavis@kpattorney.com&gt;</span>
              </div>
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 w-14 shrink-0">To:</span>
                <span className="text-sm text-gray-700">Opposing Counsel &lt;counsel@opposingfirm.com&gt;</span>
              </div>
              <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-50/80">
                <span className="text-xs font-semibold text-gray-400 w-14 shrink-0">Subject:</span>
                <span className="text-sm font-semibold text-blue-700">RE: John Smith v. ABC Insurance Company</span>
                <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">Required — Full Names</span>
              </div>
            </div>

            {/* Email body */}
            <div className="px-6 py-5 text-sm text-gray-800 leading-relaxed space-y-5">
              <p>Good morning,</p>

              {/* Case style block */}
              <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Case Style — Copy &amp; Paste at Top</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-600 border border-red-200">Required</span>
                </div>
                <div className="space-y-1.5 pl-1">
                  <div className="flex gap-3">
                    <span className="text-xs font-bold text-blue-700 w-20 shrink-0">Plaintiff:</span>
                    <span className="text-sm font-medium text-gray-900">JOHN SMITH AND JANE SMITH</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs font-bold text-blue-700 w-20 shrink-0">Defendant:</span>
                    <span className="text-sm font-medium text-gray-900">ABC INSURANCE COMPANY</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs font-bold text-blue-700 w-20 shrink-0">Case No.:</span>
                    <span className="text-sm font-medium text-gray-900">2024-CA-004395</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs font-bold text-blue-700 w-20 shrink-0">Circuit:</span>
                    <span className="text-sm font-medium text-gray-900">15th Circuit | Palm Beach County</span>
                  </div>
                </div>
              </div>

              {/* CR name + date */}
              <div>
                <span>Based on the deposition of </span>
                <span className="font-bold">John Whitton</span>
                <span> on </span>
                <span className="font-bold">January 20, 2025</span>
                <span>, we are requesting the following:</span>
                <span className="ml-2 inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">CR Name + Date Go Here</span>
              </div>

              {/* Target 1 */}
              <div className="pl-1 border-l-2 border-green-400 ml-1">
                <div className="pl-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="italic text-gray-600">The deposition of</span>
                    <span className="font-bold text-gray-900">Noavareous Grider</span>
                    <span className="text-gray-500">—</span>
                    <span className="italic text-gray-600">Desk Adjuster</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">Auto-Extracted</span>
                  </div>
                  <p className="text-gray-600 mt-1">He personally inspected the property, made the causation determination, and personally rendered the coverage decision for this claim.</p>
                </div>
              </div>

              {/* Target 2 */}
              <div className="pl-1 border-l-2 border-green-400 ml-1">
                <div className="pl-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="italic text-gray-600">The deposition of</span>
                    <span className="font-bold text-gray-900">Frank Barklay</span>
                    <span className="text-gray-500">—</span>
                    <span className="italic text-gray-600">Desk Adjuster</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">Auto-Extracted</span>
                  </div>
                  <p className="text-gray-600 mt-1">Mr. Barklay adjusted a brand-new claim and refused to reopen claim #59-39T3-38P.</p>
                </div>
              </div>

              {/* Target 3 */}
              <div className="pl-1 border-l-2 border-green-400 ml-1">
                <div className="pl-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="italic text-gray-600">The deposition of</span>
                    <span className="font-bold text-gray-900">Alisia Martin</span>
                    <span className="text-gray-500">—</span>
                    <span className="italic text-gray-600">Claims Reviewer</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">Auto-Extracted</span>
                  </div>
                  <p className="text-gray-600 mt-1">She reviewed the supplemental roof estimate provided on October 2, 2024 and decided to stand on the original coverage decision.</p>
                </div>
              </div>

              <p className="text-gray-600">Please provide dates for the requested depositions to occur within 60 days. Thank you.</p>
            </div>
          </div>

          {/* Key rules */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-800 border border-gray-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📋</span>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Case Style Block</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Include plaintiff, defendant, case number, and circuit/county at the top of every email.</p>
            </div>
            <div className="rounded-xl bg-gray-800 border border-gray-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">👤</span>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">CR Info</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">State the Corporate Rep&apos;s name and deposition date clearly in the opening sentence.</p>
            </div>
            <div className="rounded-xl bg-gray-800 border border-gray-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🎯</span>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Target Format</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Start each target with &quot;The deposition of [Name] — [Title]&quot; followed by what the CR testified about them.</p>
            </div>
            <div className="rounded-xl bg-gray-800 border border-gray-700/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">⚡</span>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Pronouns</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Use &quot;He&quot;, &quot;She&quot;, or &quot;They&quot; to start the testimony line — the AI uses this for proper formatting.</p>
            </div>
          </div>

          {/* Got it button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Got it, let&apos;s go
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes efgFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes efgSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg
          border border-blue-300 dark:border-blue-700/50
          bg-blue-50 dark:bg-blue-900/20
          text-blue-700 dark:text-blue-300
          hover:bg-blue-100 dark:hover:bg-blue-900/30
          transition-all duration-200 group"
      >
        <svg className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        Email format guide
      </button>
      {modal}
    </>
  )
}
