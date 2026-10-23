import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { requireEditor } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { issueLabel } from '@/lib/issues'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { adminPrimaryButton, adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

export default async function AdminIssuesPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireEditor()
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations({ locale, namespace: 'issues' })

  const { data: issues } = await (supabase as any)
    .from('issues')
    .select(`
      id, number, issue_date, status,
      editorial:content!issues_editorial_id_fkey (
        content_translations ( title, locale ),
        profiles!author_id ( display_name )
      )
    `)
    .order('issue_date', { ascending: false })
    .order('number', { ascending: false })

  // How many articles each issue has
  const { data: assigned } = await (supabase as any).from('content').select('issue_id').not('issue_id', 'is', null)
  const counts = new Map<string, number>()
  for (const r of assigned ?? []) counts.set(r.issue_id, (counts.get(r.issue_id) ?? 0) + 1)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Issues"
        description="The numbered issues of the magazine. Each one has its editorial and its articles, and it is kept as history at /issues. The newest published issue with an editorial is the one shown on the homepage."
      >
        <Link href="/admin/issues/new" className={adminPrimaryButton}>
          New issue
        </Link>
      </AdminPageHeader>

      <AdminPanel>
        {(issues ?? []).length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No issues yet. Create the first one with “New issue”.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className={adminTableHead}>
              <tr>
                <th className="px-6 py-3">Issue</th>
                <th className="px-6 py-3">Editorial</th>
                <th className="px-6 py-3">Articles</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {(issues ?? []).map((issue: any) => {
                const trans = getTranslation(issue.editorial?.content_translations ?? [], locale)
                return (
                  <tr key={issue.id} className={adminTableRow}>
                    <td className="px-6 py-3 font-medium text-foreground">{issueLabel(t('one'), issue.number, issue.issue_date, locale)}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {trans ? (
                        <>
                          {trans.title}
                          {issue.editorial?.profiles?.display_name && <span className="block text-xs">{issue.editorial.profiles.display_name}</span>}
                        </>
                      ) : (
                        <span className="text-xs">— no editorial yet</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{counts.get(issue.id) ?? 0}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-mono ${
                          issue.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/admin/issues/${issue.id}`} className="text-sm font-medium text-primary hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </AdminPanel>
    </div>
  )
}
