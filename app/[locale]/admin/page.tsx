import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { ContentByTypeChart } from '@/components/admin/ContentByTypeChart'
import { UsersByRoleChart } from '@/components/admin/UsersByRoleChart'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Total published content + per-type breakdown
  const { data: publishedItems } = await (supabase as any)
    .from('content')
    .select('type')
    .eq('status', 'published')

  const typeMap: Record<string, number> = {}
  for (const item of publishedItems ?? []) {
    typeMap[item.type] = (typeMap[item.type] ?? 0) + 1
  }
  const contentByType = Object.entries(typeMap).map(([type, count]) => ({ type, count }))
  const publishedTotal = publishedItems?.length ?? 0

  // Users + per-role breakdown
  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('role')

  const roleMap: Record<string, number> = {}
  for (const p of profiles ?? []) {
    roleMap[p.role] = (roleMap[p.role] ?? 0) + 1
  }
  const usersByRole = Object.entries(roleMap).map(([role, count]) => ({ role, count }))
  const usersTotal = profiles?.length ?? 0

  // Pending translations: published items missing at least one SUPPORTED_LOCALE translation
  const { data: itemsWithTranslations } = await (supabase as any)
    .from('content')
    .select('id, content_translations(locale)')
    .eq('status', 'published')

  let pendingCount = 0
  for (const item of itemsWithTranslations ?? []) {
    const existingLocales = new Set(
      (item.content_translations ?? []).map((t: any) => t.locale),
    )
    if (SUPPORTED_LOCALES.some((l) => !existingLocales.has(l))) {
      pendingCount++
    }
  }

  // Recent activity: last 10 published items
  const { data: recentItems } = await (supabase as any)
    .from('content')
    .select(`
      id,
      type,
      published_at,
      content_translations(title, locale),
      profiles!content_author_id_fkey(display_name)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      <h1 className="font-mono text-2xl uppercase tracking-wide">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Published Content</p>
          <p className="mt-1 text-3xl font-bold">{publishedTotal}</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="mt-1 text-3xl font-bold">{usersTotal}</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Pending Translations</p>
          <p className="mt-1 text-3xl font-bold">{pendingCount}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Content by Type
          </h2>
          <ContentByTypeChart data={contentByType} />
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Users by Role
          </h2>
          <UsersByRoleChart data={usersByRole} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Activity
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left font-mono text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Author</th>
              <th className="px-6 py-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {(recentItems ?? []).map((item: any) => {
              const enTitle = item.content_translations?.find(
                (t: any) => t.locale === 'en',
              )?.title
              return (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{enTitle ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {item.profiles?.display_name ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!recentItems || recentItems.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">No published content yet.</p>
        )}
      </div>
    </div>
  )
}
