import { requireEditor } from '@/lib/require-editor'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminTabs } from '@/components/admin/AdminTabs'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireEditor()
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <AdminTabs role={profile.role} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
