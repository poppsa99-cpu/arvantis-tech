import { requireAdmin } from '@/lib/admin/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'
import { SidebarProvider } from '@/components/admin/sidebar-context'
import { AdminMain } from '@/components/admin/admin-main'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAdmin } = await requireAdmin()

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[var(--admin-bg)]">
        <AdminSidebar />
        <AdminMain>{children}</AdminMain>
      </div>
    </SidebarProvider>
  )
}
