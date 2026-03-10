'use client'

import { User, Mail, Building2, MapPin, Phone } from 'lucide-react'

interface ProfileSectionProps {
  user: {
    id: string
    email: string
    full_name: string
    company_name: string
    niche: string
    phone: string
    created_at: string
  }
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const fields = [
    { icon: User, label: 'Full Name', value: user.full_name },
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Building2, label: 'Company', value: user.company_name },
    { icon: MapPin, label: 'Niche', value: user.niche },
    { icon: Phone, label: 'Phone', value: user.phone },
  ]

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
      <h3 className="text-sm font-medium text-[var(--admin-text)] mb-4">Profile</h3>
      <div className="space-y-3">
        {fields.map((field) => {
          const Icon = field.icon
          return (
            <div key={field.label} className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-[var(--admin-text-dim)] flex-shrink-0" />
              <div>
                <p className="text-xs text-[var(--admin-text-dim)]">{field.label}</p>
                <p className="text-sm text-[var(--admin-text)]">{field.value || '—'}</p>
              </div>
            </div>
          )
        })}
        <div className="pt-2 border-t border-[var(--admin-border)]">
          <p className="text-xs text-[var(--admin-text-dim)]">
            Signed up {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
