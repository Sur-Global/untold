import { requireAdmin } from '@/lib/require-admin'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  )
}
