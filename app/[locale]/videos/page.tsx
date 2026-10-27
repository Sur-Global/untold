import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation, needsListingTranslation } from '@/lib/content'
import { triggerListingTranslations } from '@/lib/trigger-listing-translations'
import { triggerTagTranslations } from '@/lib/trigger-tag-translations'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import { TopicStrip } from '@/components/content/TopicStrip'
import { contentIdsForTag, loadTagCloud } from '@/lib/data/tag-cloud'
import { FeaturedSection } from '@/components/content/FeaturedSection'
import { PAGE_FEATURED_SLOTS } from '@/lib/featured-slots'
import { TranslationRefresher } from '@/components/TranslationRefresher'
import { tagDisplayName } from '@/lib/tag-name'
import { cardTopic } from '@/lib/topics'

const PAGE_SIZE = 12

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; tag?: string }>
}

export default async function VideosPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { page: pageStr, tag } = await searchParams
  const activeTag = tag?.trim() ?? ''
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const [cloud, tagIds] = await Promise.all([
    loadTagCloud(supabase, 'video', locale),
    activeTag ? contentIdsForTag(supabase, activeTag) : Promise.resolve(null),
  ])
  const tListings = await getTranslations('listings')
  const tNav = await getTranslations('nav')

  // ★ picks (admin/content) shown at the top of page 1; kept out of the main list below
  // the starred picks lead the page only when it is not filtered by topic
  const { data: featuredRows } = activeTag ? { data: [] as any[] } : await (supabase as any)
    .from('content')
    .select(`
      id, slug, type, source_locale, single_language, subtitle_locales, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
      profiles!author_id ( display_name, slug, role, avatar_url ),
      content_translations ( title, excerpt, locale ),
      content_tags ( tags ( names, slug, is_topic ) ),
      video_meta ( thumbnail_url, duration )
    `)
    .eq('type', 'video')
    .eq('status', 'published')
    .eq('is_curated', true)
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(PAGE_FEATURED_SLOTS)
  const featuredItems: any[] = featuredRows ?? []
  const featuredIds = featuredItems.map((i) => i.id)

  const baseQuery = (supabase as any)
    .from('content')
    .select(`
      id, slug, type, source_locale, single_language, subtitle_locales, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
      profiles!author_id ( display_name, slug, role, avatar_url ),
      content_translations ( title, excerpt, locale ),
      content_tags ( tags ( names, slug, is_topic ) ),
      video_meta ( thumbnail_url, duration )
    `, { count: 'exact' })
    .eq('type', 'video')
    .eq('status', 'published')
    .eq('is_curated', true)
    .not('id', 'in', `(${featuredIds.length ? featuredIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
  const query = tagIds ? baseQuery.in('id', tagIds) : baseQuery

  const [{ userId, ...navProps }, { data: items, count }] = await Promise.all([
    getNavProps(),
    query,
  ])

  const listed = [...featuredItems, ...(items ?? [])]
  const contentIds = listed.map((i: any) => i.id)
  const bookmarkedIds = new Set<string>()
  if (userId && contentIds.length > 0) {
    const { data: bookmarks } = await (supabase as any)
      .from('bookmarks')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', contentIds)
    bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  let pendingTranslations = false
  if (listed.length > 0) {
    const untranslatedIds = listed
      .filter((i: any) => needsListingTranslation(i, locale))
      .map((i: any) => i.id)
    if (untranslatedIds.length > 0) {
      pendingTranslations = true
      after(() => triggerListingTranslations(untranslatedIds, locale))
    }
    after(() => triggerTagTranslations(locale))
  }

  const pageHref = (n: number) => `?page=${n}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ''}`

  const renderCard = (item: any) => {
    const t = getTranslation(item.content_translations ?? [], locale)
    const author = item.profiles
    const firstTag = cardTopic(item.content_tags)
    const categoryTag = firstTag ? tagDisplayName(firstTag.names, locale, firstTag.slug) : null
    const categoryTagSlug = firstTag?.slug ?? null
    return (
      <ContentCard
        key={item.id}
        contentId={item.id}
        type="video"
        slug={item.slug}
        title={t?.title ?? 'Untitled'}
        excerpt={t?.excerpt}
        coverImageUrl={item.cover_image_url ?? item.video_meta?.thumbnail_url}
        publishedAt={item.published_at}
        likesCount={item.likes_count}
        authorName={author?.display_name}
        authorSlug={author?.slug}
        authorAvatarUrl={author?.avatar_url}
        categoryTag={categoryTag}
          categoryTagSlug={categoryTagSlug}
        duration={item.video_meta?.duration}
        isBookmarked={bookmarkedIds.has(item.id)}
        isLoggedIn={navProps.isLoggedIn}
        isFeatured={item.is_featured}
        singleLanguage={item.single_language}
        sourceLocale={item.source_locale}
        subtitleLocales={item.subtitle_locales}
      />
    )
  }

  return (
    <>
      <TranslationRefresher pending={pendingTranslations} />
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">{tNav('videos')}</h1>
          <p className="text-[#6B5F58]">{tListings('videosDesc')}</p>
          <TopicStrip tags={cloud} activeSlug={activeTag} basePath="/videos" label={tListings('tagCloudLabel')} exploreLabel={tListings('topicsExplore')} allLabel={tListings('tagCloudAll')} allTopicsLabel={tListings('allTopics')} />
        </div>

        {page === 1 && featuredItems.length > 0 && (
          <FeaturedSection label={tListings('filterFeatured')}>{featuredItems.map(renderCard)}</FeaturedSection>
        )}

        {items && items.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(renderCard)}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {page > 1 && (
                  <a href={pageHref(page - 1)} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    {tListings('previous')}
                  </a>
                )}
                <span className="px-4 py-2 font-mono text-sm text-[#6B5F58]">{tListings('pageOf', { page, total: totalPages })}</span>
                {page < totalPages && (
                  <a href={pageHref(page + 1)} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    {tListings('next')}
                  </a>
                )}
              </div>
            )}
          </>
        ) : featuredItems.length > 0 ? null : (
          <p className="text-center py-20 text-[#6B5F58]">{tListings('noVideos')}</p>
        )}
      </main>
      <Footer />
    </>
  )
}
