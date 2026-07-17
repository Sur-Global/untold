import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'
import { TranslateButton } from '@/components/admin/TranslateButton'
import { TranslateAllButton } from '@/components/admin/TranslateAllButton'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { ContentTypeFilter } from '@/components/admin/ContentTypeFilter'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

const PAGE_SIZE = 50
const VALID_TYPES = ['article', 'video', 'podcast', 'pill', 'course']

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string }>
}

export default async function TranslationsPage({ searchParams }: PageProps) {
  const { page: pageStr, type } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const typeFilter = type && VALID_TYPES.includes(type) ? type : null

  const supabase = await createClient()

  const itemsQuery = (supabase as any)
    .from('content')
    .select(`
      id,
      type,
      slug,
      source_locale,
      published_at,
      content_translations (
        locale,
        is_auto_translated,
        title
      )
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const countQuery = (supabase as any)
    .from('content')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  if (typeFilter) {
    itemsQuery.eq('type', typeFilter)
    countQuery.eq('type', typeFilter)
  }

  const [{ data: items }, { count }] = await Promise.all([itemsQuery, countQuery])
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Translations"
        description={
          <>
            All published content.{' '}
            <span className="text-secondary">Green ✓</span> = auto-translated,{' '}
            <span className="text-blue-700 dark:text-blue-400">Blue ✓</span> = manual,{' '}
            <span className="text-destructive">✗</span> = missing.
          </>
        }
      />

      <ContentTypeFilter />

      <AdminPanel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className={adminTableHead}>
                <th className="py-3 pl-6 pr-4">Title</th>
                <th className="py-3 pr-4">Published</th>
                {SUPPORTED_LOCALES.map((locale) => (
                  <th key={locale} className="py-3 pr-2 text-center font-mono uppercase">
                    {locale}
                  </th>
                ))}
                <th className="py-3 pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item: any) => {
                const translations: Array<{
                  locale: string
                  is_auto_translated: boolean
                  title?: string
                }> = item.content_translations ?? []
                const translationMap = new Map(
                  translations.map((t) => [t.locale, t.is_auto_translated]),
                )
                const sourceLocale: string = item.source_locale ?? 'en'
                const sourceRow = translations.find((t) => t.locale === sourceLocale)
                const anyTitle = translations.find((t) => t.title)?.title
                const titleText = sourceRow?.title ?? anyTitle ?? item.id
                const publicPath =
                  item.slug && item.type
                    ? getPublicContentPath(item.type as ContentType, item.slug as string)
                    : null

                return (
                  <tr key={item.id} className={adminTableRow}>
                    <td className="max-w-xs truncate py-3 pl-6 pr-4 font-medium">
                      {publicPath ? (
                        <Link
                          href={publicPath}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {titleText}
                        </Link>
                      ) : (
                        titleText
                      )}{' '}
                      <span className="ml-1 rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString()
                        : '—'}
                    </td>
                    {SUPPORTED_LOCALES.map((locale) => {
                      const isAutoTranslated = translationMap.get(locale)
                      const exists = translationMap.has(locale)
                      return (
                        <td key={locale} className="py-3 pr-2 text-center">
                          {locale === sourceLocale ? (
                            <span className="text-muted-foreground font-mono text-xs">src</span>
                          ) : exists ? (
                            <span
                              className={
                                isAutoTranslated === false
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : 'text-secondary'
                              }
                            >
                              ✓
                            </span>
                          ) : (
                            <TranslateButton contentId={item.id} locale={locale} />
                          )}
                        </td>
                      )
                    })}
                    <td className="py-3 pr-6">
                      <TranslateAllButton contentId={item.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!items || items.length === 0) && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No published content{typeFilter ? ` of type "${typeFilter}"` : ''}.
            </p>
          )}
        </div>
      </AdminPanel>

      <AdminPagination page={page} totalPages={totalPages} />
    </div>
  )
}
