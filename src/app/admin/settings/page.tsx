'use client'

import { useState, useEffect } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { Shield, UserPlus, Trash2, Sun, Moon, Monitor } from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  full_name: string
}

type ThemeMode = 'dark' | 'light' | 'system'

export default function SettingsPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<ThemeMode>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('admin-theme') || 'dark') as ThemeMode
    setTheme(saved)
    applyTheme(saved)
    fetchSettings()
  }, [])

  function applyTheme(mode: ThemeMode) {
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    } else {
      document.documentElement.classList.toggle('dark', mode === 'dark')
    }
  }

  function changeTheme(mode: ThemeMode) {
    setTheme(mode)
    localStorage.setItem('admin-theme', mode)
    applyTheme(mode)
  }

  async function fetchSettings() {
    const res = await fetch('/api/admin/settings')
    const data = await res.json()
    setAdminUsers(data.adminUsers || [])
    setLoading(false)
  }

  async function grantAdmin() {
    if (!newEmail.trim()) return
    setAdding(true)
    setError('')

    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'grant_admin', email: newEmail.trim() }),
    })

    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else {
      setNewEmail('')
      fetchSettings()
    }
    setAdding(false)
  }

  async function revokeAdmin(userId: string) {
    if (!confirm('Remove admin access for this user?')) return

    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke_admin', email: userId }),
    })
    fetchSettings()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <BlurFade delay={0.05} duration={0.4}>
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">Settings</h1>
          <p className="text-sm text-[var(--admin-text-dim)] mt-1">Manage admin access and preferences</p>
        </div>
      </BlurFade>

      {/* Admin Users */}
      <BlurFade delay={0.1} duration={0.4}>
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-[var(--admin-text)]">Admin Users</h3>
          </div>

          <div className="space-y-2 mb-4">
            {adminUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--admin-input-bg)] border border-[var(--admin-border)]"
              >
                <div>
                  <p className="text-sm text-[var(--admin-text)]">{user.full_name || user.email}</p>
                  <p className="text-xs text-[var(--admin-text-dim)]">{user.email}</p>
                </div>
                {adminUsers.length > 1 && (
                  <button
                    onClick={() => revokeAdmin(user.id)}
                    className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    title="Revoke admin"
                  >
                    <Trash2 className="w-4 h-4 text-[var(--admin-text-dim)] hover:text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Admin */}
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email address of existing user"
              className="flex-1 bg-[var(--admin-input-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-dim)] focus:outline-none focus:border-blue-500/50"
              onKeyDown={(e) => e.key === 'Enter' && grantAdmin()}
            />
            <button
              onClick={grantAdmin}
              disabled={adding || !newEmail.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-[var(--admin-text)] rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              Add
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      </BlurFade>

      {/* Theme */}
      <BlurFade delay={0.15} duration={0.4}>
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
          <div className="flex items-center gap-2 mb-4">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <h3 className="text-sm font-medium text-[var(--admin-text)]">Appearance</h3>
          </div>
          <div className="flex gap-2">
            {([
              { mode: 'light' as ThemeMode, label: 'Light', icon: Sun },
              { mode: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
              { mode: 'system' as ThemeMode, label: 'System', icon: Monitor },
            ]).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => changeTheme(mode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  theme === mode
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-border-hover)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </BlurFade>

      {/* Info */}
      <BlurFade delay={0.2} duration={0.4}>
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
          <h3 className="text-sm font-medium text-[var(--admin-text)] mb-3">Environment</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--admin-text-dim)]">Stripe Mode</span>
              <span className="text-amber-400">Test</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--admin-text-dim)]">Webhook</span>
              <span className="text-emerald-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--admin-text-dim)]">Supabase</span>
              <span className="text-emerald-400">Connected</span>
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  )
}
