'use client'

import { useSidebar } from './sidebar-context'
import type { ReactNode } from 'react'

export function AdminMain({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <main
      className={`min-h-screen transition-all duration-200 ${
        collapsed ? 'ml-0 md:ml-[68px]' : 'ml-0 md:ml-64'
      }`}
    >
      <div className="p-4 md:p-8">
        {children}
      </div>
    </main>
  )
}
