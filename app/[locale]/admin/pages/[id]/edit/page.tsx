import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import { StaticPageForm, type StaticPageFormInitial } from '@/components/admin/StaticPageForm'
import { routing } from '@/i18n/routing'
import type { EditorBlock } from '@/components/editor/RichTextEditor'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'

type AppLocale = (typeof routing.locales)[number]

export default async function AdminEditStaticPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireAdmin()
  const supabase = await createClient()

  const { data: page } = await (supabase as any)
    .from('static_pages')
    .select(
      `
      id,
      slug,
      status,
      show_in_footer,
      footer_sort_order,
      static_page_translations ( locale, title, body )
    `,
    )
    .eq('id', id)
    .single()

  if (!page) notFound()

  const translations = {} as StaticPageFormInitial['translations']
  for (const loc of routing.locales) {
    translations[loc] = { title: '', body: null }
  }

  for (const tr of page.static_page_translations ?? []) {
    const loc = tr.locale as string
    if (!routing.locales.includes(loc as AppLocale)) continue
    translations[loc as AppLocale] = {
      title: tr.title ?? '',
      body: Array.isArray(tr.body) ? (tr.body as EditorBlock[]) : null,
    }
  }

  const initial: StaticPageFormInitial = {
    slug: page.slug,
    status: page.status,
    showInFooter: page.show_in_footer,
    footerSortOrder: page.footer_sort_order ?? 0,
    translations,
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/pages"
        className="inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        ← Back to pages
      </Link>
      <AdminPageHeader
        title={`Edit /${page.slug}`}
        description="Update translations, footer visibility, or publishing status. Slug changes affect the public URL."
      />
      <AdminPanel title="Page details" bodyClassName="p-6 lg:p-8">
        <StaticPageForm pageId={page.id} initial={initial} />
      </AdminPanel>
    </div>
  )
}
