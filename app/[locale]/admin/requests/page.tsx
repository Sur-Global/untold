import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { FeatureRequestActions } from '@/components/admin/FeatureRequestActions'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

export default async function AdminRequestsPage() {
  const supabase = await createClient()

  const { data: rows } = await (supabase as any)
    .from('content')
    .select(`
      id, type, slug, source_locale, is_curated, feature_requested_at,
      content_translations ( title, locale ),
      profiles!content_author_id_fkey ( display_name, slug, role )
    `)
    .eq('status', 'published')
    .not('feature_requested_at', 'is', null)
    .is('feature_request_resolved_at', null)
    .order('feature_requested_at', { ascending: true })

  const items = rows ?? []

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feature requests"
        description="Creators who ticked “send my content to be featured”. Their content stays on their own creator page until you decide: feature it, put it on the homepage, approve it for the general pages, or dismiss the request."
      />

      <AdminPanel>
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={adminTableHead}>
                  <th className="px-6 py-3">Content</th>
                  <th className="px-6 py-3">Creator</th>
                  <th className="px-6 py-3">Requested</th>
                  <th className="px-6 py-3">Decide</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const sourceLocale = item.source_locale ?? 'en'
                  const title =
                    item.content_translations?.find((t: any) => t.locale === sourceLocale)?.title ??
                    item.content_translations?.[0]?.title ??
                    item.id
                  const path = getPublicContentPath(item.type as ContentType, item.slug as string)
                  return (
                    <tr key={item.id} className={`${adminTableRow} align-top`}>
                      <td className="max-w-xs px-6 py-3 font-medium">
                        <Link href={path} className="text-primary underline-offset-4 hover:underline">
                          {title}
                        </Link>{' '}
                        <span className="ml-1 rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                          {item.type}
                        </span>
                        {!item.is_curated && (
                          <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-mono text-amber-800">
                            creator page only
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {item.profiles?.slug ? (
                          <Link href={`/author/${item.profiles.slug}`} className="underline-offset-4 hover:underline">
                            {item.profiles.display_name}
                          </Link>
                        ) : (
                          item.profiles?.display_name ?? '—'
                        )}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {new Date(item.feature_requested_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <FeatureRequestActions contentId={item.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
