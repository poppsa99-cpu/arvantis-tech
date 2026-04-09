'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  Kanban,
  DollarSign,
  Bot,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSidebar } from './sidebar-context'

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/agents', label: 'Agents', icon: Bot },
  { href: '/admin/workflow-logs', label: 'Workflow Logs', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { collapsed, toggle } = useSidebar()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)]"
        aria-label="Open sidebar"
        aria-expanded={mobileOpen}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (always full-width) ── */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-[var(--admin-border)] bg-[var(--admin-sidebar-bg)] flex flex-col md:hidden ${
          mobileOpen ? 'block' : 'hidden'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--admin-border)]">
          <Image src="/arvantis-logo.png" alt="Arvantis" width={40} height={40} className="rounded-lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--admin-text)]">Arvantis Tech</p>
            <p className="text-[11px] text-[var(--admin-text-dim)] tracking-wider uppercase">Admin</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-[var(--admin-border)]">
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] w-full transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen border-r border-[var(--admin-border)] bg-[var(--admin-sidebar-bg)] flex-col hidden md:flex transition-all duration-200 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-[var(--admin-border)] ${collapsed ? 'px-3 py-5 justify-center' : 'gap-3 px-5 py-5'}`}>
          <Image
            src="/arvantis-logo.png"
            alt="Arvantis"
            width={collapsed ? 36 : 40}
            height={collapsed ? 36 : 40}
            className="rounded-lg flex-shrink-0"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Arvantis Tech</p>
              <p className="text-[11px] text-[var(--admin-text-dim)] tracking-wider uppercase">Admin</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-lg text-sm font-medium transition-all ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  active
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] border border-transparent'
                }`}
              >
                <Icon className={`flex-shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle + Sign out */}
        <div className={`py-3 border-t border-[var(--admin-border)] ${collapsed ? 'px-2' : 'px-3'}`}>
          {!collapsed && (
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] w-full transition-all mb-1"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}

          <button
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center rounded-lg text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] w-full transition-all ${
              collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>

          {collapsed && (
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              title="Sign Out"
              className="flex items-center justify-center py-2.5 rounded-lg text-[var(--admin-text-dim)] hover:text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] w-full transition-all mt-1"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
