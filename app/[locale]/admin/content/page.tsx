import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'
import { PlacementButtons } from '@/components/admin/PlacementButtons'
import { CONTENT_TYPES, HERO_SLOTS, HOME_SLOTS, PAGE_FEATURED_SLOTS, TYPE_PLURAL } from '@/lib/featured-slots'
import { AdminUnpublishButton } from '@/components/admin/AdminUnpublishButton'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { ContentTypeFilter } from '@/components/admin/ContentTypeFilter'
import { ContentStatusFilter } from '@/components/admin/ContentStatusFilter'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

const editPath: Record<string, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}

const PAGE_SIZE = 50
const VALID_TYPES = ['article', 'video', 'podcast', 'pill', 'course']

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; status?: string }>
}

export default async function AdminContentPage({ searchParams }: PageProps) {
  const { page: pageStr, type, status } = await searchParams
  // Default stays 'published'; drafts (incl. ones created on behalf of others) are one click away
  const statusFilter = status === 'draft' || status === 'all' ? status : 'published'
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
      status,
      created_at,
      is_featured,
      is_home_featured,
      is_hero_featured,
      published_at,
      content_translations(title, locale),
      profiles!content_author_id_fkey(display_name)
    `)
    .order(statusFilter === 'published' ? 'published_at' : 'created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (statusFilter !== 'all') itemsQuery.eq('status', statusFilter)
  if (typeFilter) itemsQuery.eq('type', typeFilter)

  const countQuery = (supabase as any)
    .from('content')
    .select('id', { count: 'exact', head: true })
  if (statusFilter !== 'all') countQuery.eq('status', statusFilter)
  if (typeFilter) countQuery.eq('type', typeFilter)

  const [{ data: items }, { count }] = await Promise.all([itemsQuery, countQuery])

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // Who currently holds each placement slot (★ page / ⌂ home / ↑ hero)
  const { data: placedRows } = await (supabase as any)
    .from('content')
    .select('id, type, source_locale, is_featured, is_home_featured, is_hero_featured, content_translations(title, locale)')
    .eq('status', 'published')
    .or('is_featured.eq.true,is_home_featured.eq.true,is_hero_featured.eq.true')
  type Placed = { id: string; type: string; title: string }
  const placed = (placedRows ?? []).map((r: any) => ({
    id: r.id as string,
    type: r.type as string,
    page: !!r.is_featured,
    home: !!r.is_home_featured,
    hero: !!r.is_hero_featured,
    title: (r.content_translations?.find((t: any) => t.locale === (r.source_locale ?? 'en'))?.title ??
      r.content_translations?.[0]?.title ??
      r.id) as string,
  }))
  const heroItems: Placed[] = placed.filter((r: any) => r.hero)
  const slotsFor = (type: string, key: 'page' | 'home'): Placed[] => placed.filter((r: any) => r.type === type && r[key])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content"
        description="Content across all authors — published and drafts. Place published items (★ ⌂ ↑) or unpublish them, or open a draft to edit and publish it."
      />

      <div className="rounded-xl border border-primary/15 bg-card px-5 py-4 text-sm">
        <p className="font-semibold text-foreground">Placement slots</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Three buttons on each published item: <strong>★</strong> featured at the top of its own page (Podcasts, Videos…),{' '}
          <strong>⌂</strong> shown in its section on the homepage, <strong>↑</strong> the big hero banner on the homepage
          (any type). Each has a limited number of slots — remove one to free a slot.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-4 font-medium">Type</th>
                <th className="py-1 pr-4 font-medium">★ Its own page</th>
                <th className="py-1 font-medium">⌂ Homepage section</th>
              </tr>
            </thead>
            <tbody>
              {CONTENT_TYPES.map((t) => {
                const star = slotsFor(t, 'page')
                const home = slotsFor(t, 'home')
                const cell = (list: Placed[], cap: number) => (
                  <>
                    <span className={list.length > cap ? 'font-semibold text-[#991b1b]' : 'font-semibold'}>
                      {list.length} of {cap}
                    </span>
                    {list.length > cap && (
                      <span className="ml-1 text-[#991b1b]">(over the limit — only the newest {cap} are shown)</span>
                    )}
                    {list.map((i) => (
                      <div key={i.id} className="truncate text-muted-foreground" title={i.title}>{i.title}</div>
                    ))}
                  </>
                )
                return (
                  <tr key={t} className="border-t border-primary/10 align-top">
                    <td className="py-1.5 pr-4 font-mono capitalize">{TYPE_PLURAL[t]}</td>
                    <td className="max-w-[16rem] py-1.5 pr-4">{cell(star, PAGE_FEATURED_SLOTS)}</td>
                    <td className="max-w-[16rem] py-1.5">{cell(home, HOME_SLOTS[t])}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-semibold text-foreground">
          ↑ Homepage hero: {heroItems.length} of {HERO_SLOTS} slots used{heroItems.length >= HERO_SLOTS ? ' (full)' : ''}
        </p>
        {heroItems.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs text-foreground">
            {heroItems.map((h) => (
              <li key={h.id}>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{h.type}</span>{' '}
                {h.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ContentStatusFilter />
      <ContentTypeFilter />

      <AdminPanel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={adminTableHead}>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Author</th>
                <th className="px-6 py-3">Published</th>
                <th className="px-6 py-3" title="★ its own page · ⌂ homepage section · ↑ homepage hero">Placement</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item: any) => {
                const sourceLocale = item.source_locale ?? 'en'
                const sourceTitle = item.content_translations?.find((t: any) => t.locale === sourceLocale)?.title
                const anyTitle = item.content_translations?.find((t: any) => t.title)?.title
                const titleText = sourceTitle ?? anyTitle ?? item.id
                const isDraft = item.status === 'draft'
                // Drafts have no public page yet — the title opens the editor instead
                const publicPath =
                  !isDraft && item.slug && item.type
                    ? getPublicContentPath(item.type as ContentType, item.slug as string)
                    : null
                return (
                  <tr key={item.id} className={adminTableRow}>
                    <td className="max-w-xs truncate px-6 py-3 font-medium">
                      {isDraft && editPath[item.type] ? (
                        <Link
                          href={`/dashboard/${editPath[item.type]}/${item.id}/edit`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {titleText}
                        </Link>
                      ) : publicPath ? (
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
                      {item.status === 'draft' && (
                        <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-mono text-amber-800">
                          draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {item.profiles?.display_name ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString()
                        : item.created_at
                          ? `${new Date(item.created_at).toLocaleDateString()} (created)`
                          : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {isDraft ? <span className="text-xs text-muted-foreground">—</span> : (<>
                        <PlacementButtons
                          contentId={item.id}
                          isFeatured={item.is_featured ?? false}
                          isHomeFeatured={item.is_home_featured ?? false}
                          isHeroFeatured={item.is_hero_featured ?? false}
                        />
                        </>)}
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
                        {!isDraft && <AdminUnpublishButton contentId={item.id} />}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!items || items.length === 0) && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No {statusFilter === 'all' ? '' : `${statusFilter === 'draft' ? 'draft' : 'published'} `}content{typeFilter ? ` of type "${typeFilter}"` : ''}.
            </p>
          )}
        </div>
      </AdminPanel>

      <AdminPagination page={page} totalPages={totalPages} />
    </div>
  )
}
