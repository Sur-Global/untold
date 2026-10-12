import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { FeatureRequestActions } from '@/components/admin/FeatureRequestActions'
import { AssignReviewerControl } from '@/components/admin/AssignReviewerControl'
import { requireEditor } from '@/lib/require-editor'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

export default async function AdminRequestsPage() {
  const { user, profile } = await requireEditor()
  const isAdmin = profile.role === 'admin'
  const supabase = await createClient()

  let query = (supabase as any)
    .from('content')
    .select(`
      id, type, slug, source_locale, is_curated, feature_requested_at,
      feature_review_assigned_to, feature_review_assigned_at, feature_review_note,
      content_translations ( title, locale ),
      profiles!content_author_id_fkey ( display_name, slug, role )
    `)
    .eq('status', 'published')
    .not('feature_requested_at', 'is', null)
    .is('feature_request_resolved_at', null)
    .order('feature_requested_at', { ascending: true })
  // Editors only see the requests an admin assigned to them
  if (!isAdmin) query = query.eq('feature_review_assigned_to', user.id)
  const { data: rows } = await query
  const items = rows ?? []

  // People a request can be assigned to
  const { data: reviewerRows } = isAdmin
    ? await (supabase as any).from('profiles').select('id, display_name, role').in('role', ['editor', 'admin']).order('display_name')
    : { data: [] }
  const reviewers = (reviewerRows ?? []).map((r: any) => ({ id: r.id, name: r.display_name ?? r.id, role: r.role }))
  const nameById = new Map<string, string>(reviewers.map((r: any) => [r.id, r.name]))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feature requests"
        description={
          isAdmin
            ? "Creators who ticked “send my content to be featured”. Their content stays on their own creator page until it is decided: feature it, put it on the homepage, approve it for the general pages, or dismiss the request. Assign a request to an editor to have them review it."
            : "Feature requests an admin assigned to you. Decide what happens with each one: feature it, put it on the homepage, approve it for the general pages, or dismiss it."
        }
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
                  <th className="px-6 py-3">{isAdmin ? 'Assigned to' : 'Instructions'}</th>
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
                      <td className="max-w-[18rem] px-6 py-3">
                        {isAdmin ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {item.feature_review_assigned_to
                                ? `${nameById.get(item.feature_review_assigned_to) ?? 'Editor'} · ${new Date(item.feature_review_assigned_at).toLocaleDateString()}`
                                : 'Unassigned'}
                            </span>
                            <AssignReviewerControl
                              contentId={item.id}
                              reviewers={reviewers}
                              assignedTo={item.feature_review_assigned_to}
                            />
                          </div>
                        ) : null}
                        {item.feature_review_note && (
                          <p className="mt-1 whitespace-pre-line text-xs text-foreground">{item.feature_review_note}</p>
                        )}
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
