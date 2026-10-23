import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format-date'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn, getEditPath } from '@/lib/utils'
import { publishContent, unpublishContent } from '@/lib/actions/content'
import { DeleteContentButton } from './DeleteContentButton'
import { ProfileNudge } from '@/components/profile/ProfileNudge'
import { ViewContentLink } from '@/components/content/ViewContentLink'
import { AuthorStarToggle } from './AuthorStarToggle'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { DASHBOARD_PAGE_SIZE, DASHBOARD_TYPES, dashboardCounts, filterDashboardItems, kindOf, parseDashboardQuery } from '@/lib/dashboard-filters'

const TYPE_KEY = {
  article: 'typeArticle',
  editorial: 'typeEditorial',
  video: 'typeVideo',
  podcast: 'typePodcast',
  pill: 'typePill',
  course: 'typeCourse',
} as const

function StatusBadge({ status, label }: { status: string; label: string }) {
  const isPublished = status === 'published'
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded-full"
      style={{
        background: isPublished ? '#dcfce7' : '#ffedd5',
        color: isPublished ? '#14532d' : '#7c2d12',
      }}
    >
      {label}
    </span>
  )
}

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#ffe4d6] text-[#8a2f0d]">
      {label}
    </span>
  )
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const query = parseDashboardQuery(await searchParams)
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const itemsPromise = (supabase as any)
    .from('content')
    .select(`
      id, type, slug, status, created_at, updated_at, is_curated, is_editorial, declaration_accepted_at, source_locale, is_author_featured,
      content_translations ( title, locale )
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  const [{ userId, ...navProps }, t, { data: items }, { data: myProfile }] = await Promise.all([
    getNavProps(),
    getTranslations('dashboard'),
    itemsPromise,
    (supabase as any)
      .from('profiles')
      .select('display_name, avatar_url, bio, website, social_bluesky, social_linkedin, social_instagram, social_medium, social_custom_url')
      .eq('id', user.id)
      .single(),
  ])

  const getTitle = (item: any) => {
    // Show the title in the language it was written in
    const tr = item.content_translations?.find((tr: any) => tr.locale === (item.source_locale ?? 'en'))
      ?? item.content_translations?.[0]
    return tr?.title ?? t('untitled')
  }

  const allItems: any[] = items ?? []
  const counts = dashboardCounts(allItems)
  const { shown, total } = filterDashboardItems(allItems, query, getTitle)
  // only the kinds of content this creator has, in a fixed order
  const typeChips = DASHBOARD_TYPES.filter((id) => counts.types[id]).map((id) => ({ id, count: counts.types[id] }))
  const moreHref = (() => {
    const params = new URLSearchParams()
    if (query.type) params.set('type', query.type)
    if (query.status) params.set('status', query.status)
    if (query.q) params.set('q', query.q)
    if (query.sort !== 'newest') params.set('sort', query.sort)
    params.set('limit', String(query.limit + DASHBOARD_PAGE_SIZE))
    return `/dashboard?${params.toString()}`
  })()

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-2">
          <h1>{t('myContent')}</h1>
          <div className="flex items-center gap-3">
            {isEditorRole(profile.role) && (
              <Link href="/admin" className={cn(buttonVariants({ variant: 'outline' }))}>
                {t('adminDashboard')}
              </Link>
            )}
            <Link href="/dashboard/profile" className={cn(buttonVariants({ variant: 'outline' }))}>
              {t('editProfile')}
            </Link>
            <Link href="/create" className={cn(buttonVariants(), 'gradient-rust text-white border-0')}>
              {t('newContent')}
            </Link>
          </div>
        </div>

        <p className="mb-8 text-sm text-[#6B5F58]">{t('myContentHint')}</p>

        <ProfileNudge profile={myProfile} loginEmail={user.email} />

        {allItems.length > 0 && (
          <DashboardFilters
            types={typeChips}
            counts={{ all: allItems.length, published: counts.published, draft: counts.draft }}
            labels={{
              searchPlaceholder: t('filterSearchPlaceholder'),
              searchLabel: t('filterSearchLabel'),
              typeLabel: t('filterTypeLabel'),
              all: t('filterAll'),
              statusLabel: t('filterStatusLabel'),
              published: t('filterPublished'),
              drafts: t('filterDrafts'),
              sortLabel: t('filterSortLabel'),
              sortNewest: t('sortNewest'),
              sortOldest: t('sortOldest'),
              sortEdited: t('sortEdited'),
              sortTitle: t('sortTitle'),
              clear: t('filterClear'),
              types: { article: t('typeArticles'), editorial: t('typeEditorials'), video: t('typeVideos'), podcast: t('typePodcasts'), pill: t('typePills'), course: t('typeCourses') },
            }}
          />
        )}

        {allItems.length === 0 ? (
          <p className="text-[#6B5F58]">{t('noContent')}</p>
        ) : total === 0 ? (
          <p className="text-[#6B5F58]">{t('filterNoMatch')}</p>
        ) : (
          <>
          {(total > DASHBOARD_PAGE_SIZE || shown.length < total) && (
            <p className="mb-3 text-xs font-mono text-[#6B5F58]">{t('filterShowing', { shown: shown.length, total })}</p>
          )}
          <ul className="space-y-3">
            {shown.map((item: any) => (
              <li
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-lg"
                style={{ border: '1px solid rgba(139,69,19,0.15)', background: 'rgba(245,241,232,0.5)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{getTitle(item)}</p>
                  <p className="text-xs text-[#6B5F58] font-mono mt-0.5">
                    {formatDate(item.created_at, locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <TypeBadge label={t(TYPE_KEY[kindOf(item) as keyof typeof TYPE_KEY])} />
                <StatusBadge status={item.status} label={item.status === 'published' ? t('published') : t('draft')} />
                {item.status === 'published' && !item.is_curated && !item.is_editorial && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(120,113,108,0.12)', color: '#44403c' }}
                    title={t('creatorPageOnly')}
                  >
                    {t('creatorPageOnly')}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {item.status === 'published' && (
                    <AuthorStarToggle contentId={item.id} initialStarred={!!item.is_author_featured} />
                  )}
                  {item.status === 'published' && item.slug && (
                    <ViewContentLink type={item.type} slug={item.slug} variant="ghost" />
                  )}
                  <Link
                    href={getEditPath(item.type, item.id)}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                    {t('editContent')}
                  </Link>

                  {item.status === 'draft' ? (
                    item.declaration_accepted_at ? (
                      <form action={publishContent.bind(null, item.id)}>
                        <Button type="submit" size="sm" variant="outline">{t('publish')}</Button>
                      </form>
                    ) : (
                      // Publishing needs the "I take responsibility" confirmation, which lives on the edit page
                      <Link href={getEditPath(item.type, item.id)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                        {t('publish')}
                      </Link>
                    )
                  ) : (
                    <form action={unpublishContent.bind(null, item.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('unpublish')}</Button>
                    </form>
                  )}

                  <DeleteContentButton id={item.id} />
                </div>
              </li>
            ))}
          </ul>
          {shown.length < total && (
            <div className="mt-6 text-center">
              <Link href={moreHref as any} scroll={false} className={cn(buttonVariants({ variant: 'outline' }))}>
                {t('filterShowMore')}
              </Link>
            </div>
          )}
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
