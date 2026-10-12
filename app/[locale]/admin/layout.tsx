import { requireEditor } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminTabs } from '@/components/admin/AdminTabs'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireEditor()
  const supabase = await createClient()
  let pendingQuery = (supabase as any)
    .from('content')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .not('feature_requested_at', 'is', null)
    .is('feature_request_resolved_at', null)
  // Editors only count the requests assigned to them
  if (profile.role !== 'admin') pendingQuery = pendingQuery.eq('feature_review_assigned_to', user.id)
  const { count: pendingRequests } = await pendingQuery
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <AdminTabs role={profile.role} pendingRequests={pendingRequests ?? 0} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
