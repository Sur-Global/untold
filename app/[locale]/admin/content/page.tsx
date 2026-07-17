import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'
import { FeatureButton } from '@/components/admin/FeatureButton'
import { HeroFeatureButton } from '@/components/admin/HeroFeatureButton'
import { AdminUnpublishButton } from '@/components/admin/AdminUnpublishButton'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

const editPath: Record<string, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}

export default async function AdminContentPage() {
  const supabase = await createClient()

  const { data: items } = await (supabase as any)
    .from('content')
    .select(`
      id,
      type,
      slug,
      is_featured,
      is_hero_featured,
      published_at,
      content_translations(title, locale),
      profiles!content_author_id_fkey(display_name)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content"
        description="Fifty most recently published items across all authors. Feature, or unpublish, from here."
      />

      <AdminPanel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={adminTableHead}>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Author</th>
                <th className="px-6 py-3">Published</th>
                <th className="px-6 py-3">Featured</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item: any) => {
                const enTitle = item.content_translations?.find((t: any) => t.locale === 'en')?.title
                const anyTitle = item.content_translations?.find((t: any) => t.title)?.title
                const titleText = enTitle ?? anyTitle ?? item.id
                const publicPath =
                  item.slug && item.type
                    ? getPublicContentPath(item.type as ContentType, item.slug as string)
                    : null
                return (
                  <tr key={item.id} className={adminTableRow}>
                    <td className="max-w-xs truncate px-6 py-3 font-medium">
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
                    <td className="px-6 py-3 text-muted-foreground">
                      {item.profiles?.display_name ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <FeatureButton contentId={item.id} isFeatured={item.is_featured} />
                        {item.type === 'article' && (
                          <HeroFeatureButton
                            contentId={item.id}
                            isFeatured={item.is_featured}
                            isHeroFeatured={item.is_hero_featured}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {editPath[item.type] && (
                          <Link
                            href={`/dashboard/${editPath[item.type]}/${item.id}/edit`}
                            className="text-xs font-['JetBrains_Mono',monospace] text-primary underline-offset-4 hover:underline"
                          >
                            Edit
                          </Link>
                        )}
                        <AdminUnpublishButton contentId={item.id} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!items || items.length === 0) && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No published content yet.
            </p>
          )}
        </div>
      </AdminPanel>
    </div>
  )
}
