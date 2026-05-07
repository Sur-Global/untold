import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { Link } from '@/i18n/navigation'
import { getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'
import { ContentByTypeChart } from '@/components/admin/ContentByTypeChart'
import { UsersByRoleChart } from '@/components/admin/UsersByRoleChart'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

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

  const { data: profiles } = await (supabase as any).from('profiles').select('role')

  const roleMap: Record<string, number> = {}
  for (const p of profiles ?? []) {
    roleMap[p.role] = (roleMap[p.role] ?? 0) + 1
  }
  const usersByRole = Object.entries(roleMap).map(([role, count]) => ({ role, count }))
  const usersTotal = profiles?.length ?? 0

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

  const { data: recentItems } = await (supabase as any)
    .from('content')
    .select(`
      id,
      type,
      slug,
      published_at,
      content_translations(title, locale),
      profiles!content_author_id_fkey(display_name)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Overview"
        description="High-level metrics and recent publishing activity across the platform."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Published content', value: publishedTotal },
          { label: 'Total users', value: usersTotal },
          { label: 'Pending translations', value: pendingCount },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-primary/15 bg-card px-6 py-5 shadow-[0px_4px_16px_0px_rgba(44,36,32,0.06)]"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 font-heading text-4xl tabular-nums text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Content by type">
          <div className="px-4 py-6 sm:px-6">
            <ContentByTypeChart data={contentByType} />
          </div>
        </AdminPanel>
        <AdminPanel title="Users by role">
          <div className="px-4 py-6 sm:px-6">
            <UsersByRoleChart data={usersByRole} />
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Recent activity">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={adminTableHead}>
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
                const titleText = enTitle ?? '—'
                const publicPath =
                  item.slug && item.type
                    ? getPublicContentPath(item.type as ContentType, item.slug as string)
                    : null
                return (
                  <tr key={item.id} className={adminTableRow}>
                    <td className="px-6 py-3 font-medium">
                      {publicPath ? (
                        <Link
                          href={publicPath}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {titleText}
                        </Link>
                      ) : (
                        titleText
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
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
            <p className="py-10 text-center text-sm text-muted-foreground">
              No published content yet.
            </p>
          )}
        </div>
      </AdminPanel>
    </div>
  )
}
