'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface TutorialStep {
  title: string
  description: string
  icon: string
}

interface WorkflowTutorialProps {
  workflowId: string
  loomUrl: string
  title?: string
  steps: TutorialStep[]
  autoShowOnFirstVisit?: boolean
}

export function WorkflowTutorial({
  workflowId,
  loomUrl,
  title = 'How This Works',
  steps,
  autoShowOnFirstVisit = true,
}: WorkflowTutorialProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<'video' | number>('video')
  const [videoWatched, setVideoWatched] = useState(false)
  const [mounted, setMounted] = useState(false)
  const storageKey = `tutorial-seen-${workflowId}`

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (autoShowOnFirstVisit && mounted) {
      const seen = localStorage.getItem(storageKey)
      if (!seen) setOpen(true)
    }
  }, [autoShowOnFirstVisit, storageKey, mounted])

  // Lock body scroll when modal is open
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
    setCurrentStep('video')
    localStorage.setItem(storageKey, 'true')
  }, [storageKey])

  const handleVideoEnd = () => {
    setVideoWatched(true)
  }

  const handleNext = () => {
    if (currentStep === 'video') {
      setCurrentStep(0)
    } else if (typeof currentStep === 'number' && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handleBack = () => {
    if (typeof currentStep === 'number' && currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      setCurrentStep('video')
    }
  }

  // Extract Loom embed ID from URL
  const loomEmbedUrl = loomUrl.includes('/embed/')
    ? loomUrl
    : loomUrl.replace('loom.com/share/', 'loom.com/embed/')

  const isLastStep = typeof currentStep === 'number' && currentStep === steps.length - 1

  const modal = open && mounted ? createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        style={{ animation: 'tutorialFadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden bg-gray-900 border border-gray-700/50"
        style={{ animation: 'tutorialSlideUp 0.3s ease-out' }}
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

        {/* Video view */}
        {currentStep === 'video' && (
          <div>
            {/* Video embed */}
            <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`${loomEmbedUrl}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; fullscreen"
                onLoad={handleVideoEnd}
              />
            </div>

            {/* Video info bar */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
              <p className="text-sm text-gray-400 mb-5">
                Watch the video above for a quick overview, then walk through the steps below.
              </p>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleClose}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Skip tutorial
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl
                    bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  {videoWatched ? 'Continue to walkthrough' : 'Continue to steps'}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step slides */}
        {typeof currentStep === 'number' && (
          <div className="p-8">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-8">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    idx <= currentStep
                      ? 'bg-blue-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="text-center mb-8">
              {/* Step icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                bg-blue-900/40 border border-blue-700/30 mb-5">
                <span className="text-3xl">{steps[currentStep].icon}</span>
              </div>

              {/* Step number */}
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">
                Step {currentStep + 1} of {steps.length}
              </p>

              {/* Step title */}
              <h3 className="text-2xl font-bold text-white mb-3">
                {steps[currentStep].title}
              </h3>

              {/* Step description */}
              <p className="text-sm text-gray-400 leading-relaxed max-w-lg mx-auto">
                {steps[currentStep].description}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm font-medium
                  text-gray-400 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                {currentStep === 0 ? 'Back to video' : 'Previous'}
              </button>

              <button
                onClick={handleNext}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  isLastStep
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isLastStep ? 'Get started' : 'Next step'}
                {isLastStep ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline keyframe styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tutorialFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tutorialSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>,
    document.body
  ) : null

  return (
    <>
      {/* "How this works" trigger button */}
      <button
        onClick={() => { setOpen(true); setCurrentStep('video') }}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg
          border border-blue-300 dark:border-blue-700/50
          bg-blue-50 dark:bg-blue-900/20
          text-blue-700 dark:text-blue-300
          hover:bg-blue-100 dark:hover:bg-blue-900/30
          transition-all duration-200 group"
      >
        <svg className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        How this works
      </button>

      {modal}
    </>
  )
}
