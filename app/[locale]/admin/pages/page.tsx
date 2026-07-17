import { Link } from '@/i18n/navigation'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { adminPrimaryButton, adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

export default async function AdminStaticPagesPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: pages } = await (supabase as any)
    .from('static_pages')
    .select(
      `
      id,
      slug,
      status,
      show_in_footer,
      footer_sort_order,
      published_at,
      static_page_translations ( locale, title )
    `,
    )
    .order('updated_at', { ascending: false })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Static pages"
        description='Public URLs such as /about. Enable "Show in footer" when editing a page to surface it in the site footer.'
      >
        <Link href="/admin/pages/new" className={adminPrimaryButton}>
          + New page
        </Link>
      </AdminPageHeader>

      <AdminPanel title="All pages">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={adminTableHead}>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3">Title (en)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Footer</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(pages ?? []).map((p: any) => {
                const enTitle = p.static_page_translations?.find((t: any) => t.locale === 'en')?.title
                return (
                  <tr key={p.id} className={adminTableRow}>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">/{p.slug}</td>
                    <td className="max-w-xs truncate px-6 py-3 font-medium">{enTitle ?? '—'}</td>
                    <td className="px-6 py-3">
                      <span
                        className={
                          p.status === 'published'
                            ? 'rounded-md bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary'
                            : 'rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {p.show_in_footer ? `Yes (${p.footer_sort_order})` : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/pages/${p.id}/edit`}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!pages || pages.length === 0) && (
            <p className="py-10 text-center text-sm text-muted-foreground">No static pages yet.</p>
          )}
        </div>
      </AdminPanel>
    </div>
  )
}
